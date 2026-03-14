import type { ImeHandle } from '../lib/imeGlue';

declare global {
  interface Window {
    IME?: ImeHandle;
  }
}

export {};
