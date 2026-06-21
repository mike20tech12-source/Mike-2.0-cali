/// <reference types="vite/client" />

type RegisterSWOptions = import('vite-plugin-pwa/types').RegisterSWOptions;

declare module 'virtual:pwa-register' {
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
