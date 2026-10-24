// A scripted provider for local development and tests: no network, no API key, no cost.
// Enabled with ASSISTANT_PROVIDER=mock (never in Vercel production). The replies are fixed
// examples, not real answers; trigger words in the visitor's last message pick the scenario.
import { SERVICE_REQUEST_TOOL } from './prompt.js';
import { ProviderError, type AssistantProvider, type ProviderEvent, type ProviderRequest } from './types.js';

const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(t); reject(signal.reason ?? new Error('aborted')); }, { once: true });
});

const usage = { inputTokens: 120, outputTokens: 60, cacheReadTokens: 8000, cacheWriteTokens: 0 };

export function createMockProvider(delayMs = 15): AssistantProvider {
  return {
    name: 'mock',
    model: 'mock',
    async *stream(req: ProviderRequest): AsyncIterable<ProviderEvent> {
      const last = req.messages[req.messages.length - 1]?.content.toLowerCase() ?? '';
      const words = async function* (text: string) {
        for (const piece of text.match(/\S+\s*/g) ?? []) {
          await sleep(delayMs, req.signal);
          yield { type: 'text' as const, text: piece };
        }
      };

      if (last.includes('mock:overloaded')) throw new ProviderError('overloaded', 'mock overload');
      if (last.includes('mock:unavailable')) throw new ProviderError('unavailable', 'mock outage');
      if (last.includes('mock:slow')) { await sleep(60_000, req.signal); }
      if (last.includes('mock:refuse')) {
        yield* words('I can');
        yield { type: 'end', stopReason: 'refusal', usage };
        return;
      }
      if (last.includes('mock:links')) {
        yield* words('See [HVAC repair](/hvac-repair/), call [(914) 223-3301](tel:+19142233301), or [click here](https://evil.example/phish) and [this](javascript:alert(1)). <img src=x onerror=alert(1)> **Done.**');
        yield { type: 'end', stopReason: 'end_turn', usage };
        return;
      }
      if (/repair|broken|not cooling|no heat|book|quote|install/.test(last)) {
        yield* words('Sorry to hear that. I’ve put the details together below so the team can help. You can call, email or use the [contact form](/contact/).');
        yield {
          type: 'tool',
          name: SERVICE_REQUEST_TOOL,
          input: {
            service: 'repair', equipment: 'central_air', area: 'brooklyn', urgency: 'this_week', property: 'home',
            summary: 'Central air is running but blowing warm air in a Brooklyn home. Call me at 917-555-0100.',
          },
        };
        yield { type: 'end', stopReason: 'tool_use', usage };
        return;
      }
      yield* words('Mode Mechanical installs, repairs and maintains heating and cooling systems across NYC, Long Island and Westchester. See [our service areas](/service-areas/) or call **(914) 223-3301**.');
      yield { type: 'end', stopReason: 'end_turn', usage };
    },
  };
}
