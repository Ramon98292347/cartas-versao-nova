import { createClient } from "@supabase/supabase-js";
import { getRlsToken } from "@/lib/api";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && key
  ? createClient(url, key, {
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(init?.headers || {});
          const rlsToken = getRlsToken();
          if (rlsToken) headers.set("Authorization", `Bearer ${rlsToken}`);
          return fetch(input, { ...(init || {}), headers });
        },
      },
    })
  : undefined;
