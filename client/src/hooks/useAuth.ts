import { useEffect, useState, useRef } from "react";

type AuthState = "loading" | "authenticated" | "unauthenticated";
export interface User { id: string; email?: string; name?: string; [k: string]: any; }

export function useAuth() {
  const [state, setState] = useState<AuthState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const tried = useRef(false);

  useEffect(() => {
    // Call the server; do NOT look at document.cookie
    // Always include credentials (cookies)
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/auth/user", { credentials: "include", signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          setUser(data?.user ?? null);
          setState("authenticated");
        } else if (res.status === 401) {
          setUser(null);
          setState("unauthenticated");
        } else {
          // Non-401 errors: treat as unauth but don't loop
          setUser(null);
          setState("unauthenticated");
          // optionally console.warn('[auth] unexpected', res.status);
        }
      } catch {
        setState("unauthenticated");
      } finally {
        tried.current = true;
      }
    })();
    return () => ctrl.abort();
  }, []);

  return {
    isLoading: state === "loading",
    isAuthenticated: state === "authenticated",
    user,
  };
}