// Claude through the official Anthropic SDK. This file is the only one that knows about the
// provider: to switch providers or models, implement `AssistantProvider` elsewhere and pick it in
// handler.ts; to switch Claude models, set ASSISTANT_MODEL.
import Anthropic from '@anthropic-ai/sdk';
import { ProviderError, type AssistantProvider, type ProviderEvent, type ProviderRequest } from './types.js';

interface Options {
  apiKey: string; model: string; effort: 'low' | 'medium' | 'high'; timeoutMs: number; maxRetries: number;
  /** HTTP implementation; tests pass a fake. */
  fetch?: typeof fetch;
}

export function createAnthropicProvider({ apiKey, model, effort, timeoutMs, maxRetries, fetch }: Options): AssistantProvider {
  const client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries, ...(fetch ? { fetch } : {}) });

  return {
    name: 'anthropic',
    model,
    async *stream(req: ProviderRequest): AsyncIterable<ProviderEvent> {
      let stream;
      try {
        stream = client.messages.stream({
          model,
          max_tokens: req.maxTokens,
          // Thinking stays adaptive (the model's default); effort keeps it short for chat.
          output_config: { effort },
          system: [
            // The instructions and site knowledge are identical on every request: cache them.
            { type: 'text', text: req.system, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: req.context },
          ],
          messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
          tools: req.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
            // Inputs are small; the handler validates every tool input itself either way.
            eager_input_streaming: true,
          })),
          tool_choice: { type: 'auto', disable_parallel_tool_use: true },
        }, { signal: req.signal });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield { type: 'text', text: event.delta.text };
          }
        }
        const final = await stream.finalMessage();
        const stop = final.stop_reason;
        // A refusal can cut a tool call off mid-input, and so can max_tokens: run no tool then.
        if (stop !== 'refusal' && stop !== 'max_tokens') {
          for (const block of final.content) {
            if (block.type === 'tool_use') yield { type: 'tool', name: block.name, input: block.input };
          }
        }
        yield {
          type: 'end',
          stopReason: stop === 'end_turn' || stop === 'tool_use' || stop === 'max_tokens' || stop === 'refusal' ? stop : 'other',
          usage: {
            inputTokens: final.usage.input_tokens,
            outputTokens: final.usage.output_tokens,
            cacheReadTokens: final.usage.cache_read_input_tokens ?? 0,
            cacheWriteTokens: final.usage.cache_creation_input_tokens ?? 0,
          },
        };
      } catch (err) {
        throw toProviderError(err);
      }
    },
  };
}

/** Maps SDK errors (most specific first) onto the provider-neutral failure classes. */
export function toProviderError(err: unknown): unknown {
  if (err instanceof ProviderError) return err;
  if (err instanceof Anthropic.APIUserAbortError) return err; // the visitor left or the deadline passed
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new ProviderError('timeout', err.message);
  if (err instanceof Anthropic.APIConnectionError) return new ProviderError('unavailable', err.message);
  if (err instanceof Anthropic.RateLimitError) return new ProviderError('rate_limited', err.message);
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return new ProviderError('auth', err.message);
  if (err instanceof Anthropic.BadRequestError || err instanceof Anthropic.NotFoundError || err instanceof Anthropic.UnprocessableEntityError) {
    return new ProviderError('bad_request', err.message);
  }
  // 529 (overloaded) and other 5xx responses.
  if (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500) return new ProviderError('overloaded', err.message);
  if (err instanceof Anthropic.APIError) return new ProviderError('unavailable', err.message);
  return err;
}
