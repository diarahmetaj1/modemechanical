// Entry point loaded on demand by Assistant.astro when the visitor first opens the assistant.
// The panel's CSS travels inside this chunk and is added here, so pages carry none of it until then.
import { createRoot } from 'react-dom/client';
import css from './AssistantPanel.css?inline';
import AssistantPanel from './AssistantPanel';
import type { AssistantConfig } from '../../../lib/assistant';

export function mount(root: HTMLElement, launcher: HTMLButtonElement, config: AssistantConfig, open: boolean) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  createRoot(root).render(<AssistantPanel config={config} launcher={launcher} initiallyOpen={open} />);
}
