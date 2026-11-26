export const NEON_TOKEN_KEY = "neon-auth-jwt-fallback";
const USER_KEY = "misapps-user-cache";
let pwaFallbackInstalled = false;

// iOS standalone PWAs may not persist Neon Auth's cross-origin session cookie.
// Mirror Neon SDK PR #225: keep the Better Auth session token and send it only
// to this project's Neon Auth origin as a Bearer token on later auth requests.
export function installPwaAuthFallback(authUrl) {
  if (pwaFallbackInstalled || typeof window === "undefined") return;
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true;
  if (!isStandalone) return;

  const authOrigin = new URL(authUrl).origin;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const requestUrl = typeof input === "string" || input instanceof URL
      ? String(input)
      : input?.url || "";
    let requestInit = init;

    if (requestUrl.startsWith(authOrigin + "/")) {
      try {
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));
        const sessionToken = localStorage.getItem(NEON_TOKEN_KEY);
        if (sessionToken && !headers.has("Authorization")) {
          headers.set("Authorization", "Bearer " + sessionToken);
        }
        requestInit = { ...init, headers };
      } catch (error) {
        console.warn("No se pudo aplicar la recuperación de sesión PWA", error);
      }
    }

    const response = await originalFetch(input, requestInit);
    if (requestUrl.startsWith(authOrigin + "/") && response.ok) {
      response.clone().json().then(body => {
        const token = body?.data?.session?.token || body?.session?.token;
        if (typeof token === "string" && token.length > 10) {
          try { localStorage.setItem(NEON_TOKEN_KEY, token); } catch {}
        }
      }).catch(() => {});
    }
    return response;
  };
  pwaFallbackInstalled = true;
}

export function captureNeonJwt(ctx) {
  const sessionToken = ctx?.data?.session?.token;
  if (typeof sessionToken === "string" && sessionToken.length > 10) {
    localStorage.setItem(NEON_TOKEN_KEY, sessionToken);
  }
}

export async function saveNeonAuthResult(result) {
  const payload = result?.data ?? result;
  const user = payload?.user || payload?.data?.user || result?.user;
  const sessionToken = payload?.session?.token || payload?.token || result?.session?.token;
  if (!user?.id) {
    throw new Error("Neon no ha devuelto los datos del usuario después del acceso.");
  }
  if (typeof sessionToken === "string" && sessionToken.length > 10) {
    try { localStorage.setItem(NEON_TOKEN_KEY, sessionToken); } catch {}
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function readNeonUser() {
  try {
    const rawUser = localStorage.getItem(USER_KEY);
    if (!rawUser) return null;
    const user = JSON.parse(rawUser);
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

export function clearNeonAuth() {
  localStorage.removeItem(NEON_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function getNeonToken() {
  return null;
}
