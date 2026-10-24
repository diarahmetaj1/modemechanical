// Vercel Function for the website assistant: POST /api/assistant/ (see src/server/assistant/handler.ts).
// Vercel deploys every file in /api as a function next to the static site; nothing else is needed.
// Settings come from the project's environment variables (Settings -> Environment Variables).
import { createAssistantHandler } from '../src/server/assistant/handler.js';

// One handler per warm instance, so the in-memory rate limits and prompt are reused between requests.
const handle = createAssistantHandler(process.env);

export function GET(request: Request): Promise<Response> {
  return handle(request);
}

export function POST(request: Request): Promise<Response> {
  return handle(request);
}
