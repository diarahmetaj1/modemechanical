// Google Gemini through Google's official SDK (@google/genai). Gemini's free tier makes AI mode
// cost nothing; its limits are low and change over time, so when Google refuses a request (quota,
// outage) the visitor's browser falls back to the free site-search answers instead.
//
// Free-tier note: Google may use free-tier prompts and responses to improve its products. The
// panel tells visitors their messages go to Google. See ASSISTANT.md.
import { ApiError, GoogleGenAI, type Content, type FunctionCall } from '@google/genai';
import { ProviderError, type AssistantProvider, type ProviderEvent, type ProviderRequest } from './types.js';

interface Options {
  apiKey: string; model: string; timeoutMs: number; maxRetries: number;
  /** HTTP implementation; tests pass a fake. */
  fetch?: typeof fetch;
}

// Finish reasons meaning Google withheld the answer (safety filters and similar).
const BLOCKED = new Set(['SAFETY', 'RECITATION', 'LANGUAGE', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY']);

export function createGeminiProvider({ apiKey, model, timeoutMs, maxRetries, fetch }: Options): AssistantProvider {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: timeoutMs, retryOptions: { attempts: maxRetries + 1 }, ...(fetch ? { fetch } : {}) },
  });

  return {
    name: 'gemini',
    model,
    async *stream(req: ProviderRequest): AsyncIterable<ProviderEvent> {
      try {
        const contents: Content[] = req.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            // Stable instructions and knowledge first (Gemini caches a repeated prefix), then the date and page.
            systemInstruction: `${req.system}\n\n${req.context}`,
            maxOutputTokens: req.maxTokens,
            tools: [{ functionDeclarations: req.tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.inputSchema })) }],
            abortSignal: req.signal,
          },
        });

        let finish = '';
        let blocked = false;
        const calls: FunctionCall[] = [];
        let usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
        for await (const chunk of stream) {
          if (chunk.promptFeedback?.blockReason) blocked = true;
          const candidate = chunk.candidates?.[0];
          for (const part of candidate?.content?.parts ?? []) {
            if (part.text && !part.thought) yield { type: 'text', text: part.text };
            if (part.functionCall?.name) calls.push(part.functionCall);
          }
          if (candidate?.finishReason) finish = candidate.finishReason;
          const u = chunk.usageMetadata;
          if (u) {
            usage = {
              inputTokens: (u.promptTokenCount ?? 0) - (u.cachedContentTokenCount ?? 0),
              outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
              cacheReadTokens: u.cachedContentTokenCount ?? 0,
              cacheWriteTokens: 0,
            };
          }
        }

        const stopReason = blocked || BLOCKED.has(finish) ? 'refusal'
          : finish === 'MAX_TOKENS' ? 'max_tokens'
          : calls.length ? 'tool_use'
          : finish === 'STOP' ? 'end_turn' : 'other';
        // A blocked or cut-off reply may hold a half-written call: run no tool then.
        if (stopReason === 'tool_use') {
          for (const c of calls) yield { type: 'tool', name: c.name ?? '', input: c.args ?? {} };
        }
        yield { type: 'end', stopReason, usage };
      } catch (err) {
        throw toProviderError(err, req.signal);
      }
    },
  };
}

export function toProviderError(err: unknown, signal?: AbortSignal): unknown {
  if (err instanceof ProviderError || signal?.aborted) return err; // the visitor left or the deadline passed
  if (err instanceof ApiError) {
    if (err.status === 429) return new ProviderError('rate_limited', err.message); // includes the free tier's daily quota
    if (err.status === 401 || err.status === 403) return new ProviderError('auth', err.message);
    if (err.status === 400 || err.status === 404) return new ProviderError('bad_request', err.message);
    if (err.status >= 500) return new ProviderError('overloaded', err.message);
    return new ProviderError('unavailable', err.message);
  }
  return new ProviderError('unavailable', err instanceof Error ? err.message : String(err));
}
