// Deno runtime type declarations for Supabase Edge Functions
// This file provides type definitions so VS Code doesn't show errors

declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }
  const env: Env;

  interface ServeOptions {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onListen?: (params: { hostname: string; port: number }) => void;
    onError?: (error: unknown) => Response | Promise<Response>;
  }

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: ServeOptions
  ): void;
}

// Module declarations for Deno URL imports
declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(url: string, key: string, options?: any): any;
  export type SupabaseClient = any;
}

declare module 'https://esm.sh/*' {
  const module: any;
  export default module;
  export = module;
}
