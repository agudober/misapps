export const NEON_TOKEN_KEY = "neon-auth-jwt-fallback";
const USER_KEY = "misapps-user-cache";
let pwaFallbackInstalled = false;

// iOS standalone PWAs can lose Neon Auth's cross-origin session cookie.
// Preserve the JWT emitted by Neon and send it as Bearer on later Auth calls.
export function installPwaAuthFallback(authUrl) {
  if (pwaFallbackInstalled || typeof window === "undefined") return;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true;
  if (!standalone) return;

  const authOrigin = new URL(authUrl).origin;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const requestUrl = input instanceof Request
      ? input.url
      : String(input instanceof URL ? input.href : input || "");
    const isAuthRequest = requestUrl.startsWith(authOrigin + "/");
    let requestInit = init;

    if (isAuthRequest) {
      try {
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));
        const token = localStorage.getItem(NEON_TOKEN_KEY);
        if (token && !headers.has("Authorization")) {
          headers.set("Authorization", "Bearer " + token);
        }
        requestInit = { ...init, headers };
      } catch (error) {
        console.warn("No se pudo aplicar la recuperación de sesión PWA", error);
      }
    }

    const response = await originalFetch(input, requestInit);

    if (isAuthRequest && response.ok) {
      // Neon Auth may return the JWT in this response header rather than JSON.
      const headerToken = response.headers.get("set-auth-jwt");
      if (headerToken && headerToken.length > 10) {
        try { localStorage.setItem(NEON_TOKEN_KEY, headerToken); } catch {}
      }

      // Also support responses that include the session token in their JSON body.
      response.clone().json().then(body => {
        const bodyToken = body?.data?.session?.token || body?.session?.token;
        if (typeof bodyToken === "string" && bodyToken.length > 10) {
          try { localStorage.setItem(NEON_TOKEN_KEY, bodyToken); } catch {}
        }
      }).catch(() => {});
    }
    return response;
  };

  pwaFallbackInstalled = true;
}

export function captureNeonJwt(ctx) {
  const token =
    ctx?.data?.session?.token ||
    ctx?.response?.headers?.get?.("set-auth-jwt");
  if (typeof token === "string" && token.length > 10) {
    try { localStorage.setItem(NEON_TOKEN_KEY, token); } catch {}
  }
}

export async function saveNeonAuthResult(result) {
  const payload = result?.data ?? result;
  const user = payload?.user || payload?.data?.user || result?.user;
  const sessionToken =
    payload?.session?.token ||
    payload?.token ||
    result?.session?.token ||
    result?.response?.headers?.get?.("set-auth-jwt");
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
  try {
    localStorage.removeItem(NEON_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export async function getNeonToken() {
  try { return localStorage.getItem(NEON_TOKEN_KEY); }
  catch { return null; }
}
