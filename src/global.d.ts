import type { Turn } from './types.js';

/** Streaming text-generation function that the Claude artifact runtime can provide. */
export type Sampler = (
  turns: Turn[],
  options: { cache: boolean; onText: (chunk: { text: string }) => void },
) => Promise<{ text: string }>;

declare global {
  interface Window {
    /** Present only when the page is hosted where Claude's runtime is available. */
    claude?: { use?: (capability: 'sample') => Promise<Sampler> };
  }
}
