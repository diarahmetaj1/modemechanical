// Shared types for the website assistant (server side). The browser imports only the
// `ServiceRequest` shape and the stream event union from here (type-only, no runtime code).

/** What the assistant knows: facts and page copy extracted from the built site. */
export interface KnowledgePack {
  business: {
    name: string;
    url: string;
    phone: string;
    email: string;
    baseLocation: string;
    hours: string;
    areaServed: string[];
    profiles: string[];
  };
  pages: { url: string; title: string; description: string; content: string }[];
}

export type Role = 'user' | 'assistant';
export interface ChatMessage { role: Role; content: string }

/** Body of POST /api/assistant/. History lives in the visitor's browser, never on the server. */
export interface AssistantRequest {
  messages: ChatMessage[];
  /** Path of the page the visitor is on; used only when it is a known page of the site. */
  page?: string;
}

export const SERVICE_TYPES = ['repair', 'installation', 'maintenance', 'emergency', 'not_sure'] as const;
export const EQUIPMENT_TYPES = [
  'central_air', 'ductless_mini_split', 'heat_pump', 'furnace', 'boiler', 'rooftop_unit',
  'ductwork_ventilation', 'commercial_refrigeration', 'thermostat', 'other', 'not_sure',
] as const;
export const AREAS = [
  'brooklyn', 'queens', 'manhattan', 'bronx', 'staten_island', 'long_island', 'westchester', 'other', 'not_sure',
] as const;
export const URGENCY = ['emergency', 'this_week', 'flexible', 'not_sure'] as const;
export const PROPERTY_TYPES = ['home', 'business', 'not_sure'] as const;

/**
 * A service request the assistant prepared from the conversation. It is shown to the visitor,
 * who decides whether to call, email or use the contact form; the server never sends it anywhere.
 * It holds no contact details on purpose.
 */
export interface ServiceRequest {
  service: (typeof SERVICE_TYPES)[number];
  equipment: (typeof EQUIPMENT_TYPES)[number];
  area: (typeof AREAS)[number];
  urgency: (typeof URGENCY)[number];
  property: (typeof PROPERTY_TYPES)[number];
  summary: string;
}

/** Error codes the browser can show a message for. */
export type AssistantErrorCode =
  | 'bad_request' | 'forbidden' | 'too_large' | 'rate_limited' | 'busy'
  | 'unavailable' | 'not_configured' | 'refused' | 'timeout' | 'truncated';

/** Server-sent events on the response stream, one JSON object per `data:` line. */
export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'service_request'; request: ServiceRequest }
  | { type: 'done' }
  | { type: 'error'; code: AssistantErrorCode };

/* ---- Provider abstraction: everything model-specific stays behind this interface. ---- */

export interface ToolSpec { name: string; description: string; inputSchema: Record<string, unknown> }

export interface ProviderRequest {
  /** Stable instructions and knowledge: identical on every request, so it can be cached. */
  system: string;
  /** Per-request context (date, current page). Kept after the cached part. */
  context: string;
  messages: ChatMessage[];
  tools: ToolSpec[];
  maxTokens: number;
  signal: AbortSignal;
}

export interface Usage { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }

export type ProviderEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; input: unknown }
  | { type: 'end'; stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'refusal' | 'other'; usage: Usage };

/** Failure classes a provider maps its own errors onto. */
export type ProviderErrorKind = 'rate_limited' | 'overloaded' | 'unavailable' | 'auth' | 'bad_request' | 'timeout';
export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  constructor(kind: ProviderErrorKind, message: string) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
  }
}

export interface AssistantProvider {
  readonly name: string;
  readonly model: string;
  stream(request: ProviderRequest): AsyncIterable<ProviderEvent>;
}
