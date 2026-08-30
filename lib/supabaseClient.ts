import { createBrowserClient } from "@supabase/ssr";

export const AUTH_PERSISTENCE_KEY =
  "pugpep_auth_persistence";

export const AUTH_BROWSER_SESSION_KEY =
  "pugpep_auth_browser_session";

export type AuthPersistenceMode =
  | "remember"
  | "session";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function setAuthPersistenceMode(
  rememberMe: boolean
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (rememberMe) {
      localStorage.setItem(
        AUTH_PERSISTENCE_KEY,
        "remember"
      );

      sessionStorage.removeItem(
        AUTH_BROWSER_SESSION_KEY
      );

      return;
    }

    localStorage.setItem(
      AUTH_PERSISTENCE_KEY,
      "session"
    );

    sessionStorage.setItem(
      AUTH_BROWSER_SESSION_KEY,
      "active"
    );
  } catch {
    // Storage preferences are a convenience only.
  }
}

export async function enforceAuthPersistencePolicy(
  supabase: ReturnType<typeof createClient>
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const mode =
      localStorage.getItem(
        AUTH_PERSISTENCE_KEY
      ) as AuthPersistenceMode | null;

    if (mode !== "session") {
      return;
    }

    const browserSessionActive =
      sessionStorage.getItem(
        AUTH_BROWSER_SESSION_KEY
      ) === "active";

    if (browserSessionActive) {
      return;
    }

    /*
     * A session-only login existed during a previous browser session.
     * @supabase/ssr persists its auth cookies, so explicitly sign out
     * before allowing protected content to load in this new session.
     */
    await supabase.auth.signOut();

    sessionStorage.setItem(
      AUTH_BROWSER_SESSION_KEY,
      "active"
    );
  } catch (error) {
    console.warn(
      "Unable to enforce auth persistence policy:",
      error
    );
  }
}

export function clearAuthPersistenceMode() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(
      AUTH_PERSISTENCE_KEY
    );

    sessionStorage.removeItem(
      AUTH_BROWSER_SESSION_KEY
    );
  } catch {
    // Storage cleanup is best-effort.
  }
}
