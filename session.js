export const NEON_TOKEN_KEY = "neon-auth-jwt-fallback";

// Solo aceptamos un JWT compacto real: header.payload.signature.
// Evita enviar a Neon valores como "Bearer ...", JSON o cabeceras mal interpretadas.
function normalizeJwt(value) {
  if (typeof value !== "string") return null;
  let token = value.trim();
  if (/^Bearer\s+/i.test(token)) token = token.replace(/^Bearer\s+/i, "").trim();
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1).trim();
  }
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  return token;
}
const USER_KEY = "misapps-user-cache";
let pwaFallbackInstalled = false;

// Neon Auth puede perder su cookie de sesión en instalaciones iOS.
// Guardamos el JWT que Better Auth entrega en onSuccess y lo reenviamos
// en TODAS las peticiones al endpoint Auth, sin depender de detectar standalone.
export function installPwaAuthFallback(authUrl) {
  if (pwaFallbackInstalled || typeof globalThis === "undefined" || typeof globalThis.fetch !== "function") return;

  const authBase = new URL(authUrl);
  const authPath = authBase.pathname.replace(/\/$/, "");
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init = {}) => {
    let requestUrl;
    try {
      const rawUrl = input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.href
          : String(input);
      requestUrl = new URL(rawUrl, authBase);
    } catch {
      return originalFetch(input, init);
    }

    const isAuthRequest =
      requestUrl.origin === authBase.origin &&
      (requestUrl.pathname === authPath || requestUrl.pathname.startsWith(authPath + "/"));

    if (!isAuthRequest) return originalFetch(input, init);

    try {
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));

      // La copia local del JWT es la fuente de recuperación para iOS PWA.
      const token = globalThis.localStorage?.getItem(NEON_TOKEN_KEY);
      if (token) headers.set("Authorization", "Bearer " + token);

      const response = await originalFetch(input, { ...init, headers });

      // Captura el JWT directamente de la respuesta HTTP de Neon.
      // No dependemos de que Better Auth exponga la sesión en result.data.
      const responseJwt = normalizeJwt(response.headers.get("set-auth-jwt"));
      if (responseJwt) {
        try { globalThis.localStorage?.setItem(NEON_TOKEN_KEY, responseJwt); } catch {}
      }

      return response;
    } catch (error) {
      console.warn("No se pudo aplicar el JWT de recuperación de Neon", error);
      return originalFetch(input, init);
    }
  };

  pwaFallbackInstalled = true;
}

// El adapter de Neon inserta set-auth-jwt en ctx.data.session.token
// antes de ejecutar este callback.
export function captureNeonJwt(ctx) {
  const token =
    normalizeJwt(ctx?.data?.session?.token) ||
    normalizeJwt(ctx?.response?.headers?.get?.("set-auth-jwt"));
  if (token) {
    try { globalThis.localStorage?.setItem(NEON_TOKEN_KEY, token); } catch {}
  }
}

export async function saveNeonAuthResult(result) {
  const payload = result?.data ?? result;
  const user = payload?.user || payload?.data?.user || result?.user;
  const sessionToken =
    normalizeJwt(payload?.session?.token) ||
    normalizeJwt(payload?.token) ||
    normalizeJwt(result?.session?.token) ||
    normalizeJwt(result?.response?.headers?.get?.("set-auth-jwt"));
  if (!user?.id) {
    throw new Error("Neon no ha devuelto los datos del usuario después del acceso.");
  }
  if (sessionToken) {
    try { globalThis.localStorage?.setItem(NEON_TOKEN_KEY, sessionToken); } catch {}
  }
  globalThis.localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function readNeonUser() {
  try {
    const rawUser = globalThis.localStorage.getItem(USER_KEY);
    if (!rawUser) return null;
    const user = JSON.parse(rawUser);
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

export function clearNeonAuth() {
  try {
    globalThis.localStorage.removeItem(NEON_TOKEN_KEY);
    globalThis.localStorage.removeItem(USER_KEY);
  } catch {}
}

// Envuelve el adapter de Neon para que Data API pueda usar el JWT persistido
// cuando getSession() no logra reconstruir la cookie en una PWA de iOS.
export function createPwaCompatibleAdapter(adapterFactory, options = {}) {
  const buildAdapter = adapterFactory(options);
  return (url, fetchOptions) => {
    const adapter = buildAdapter(url, fetchOptions);
    const getSessionToken = adapter.getJWTToken.bind(adapter);
    adapter.getJWTToken = async (allowAnonymous) => {
      const sessionToken = normalizeJwt(await getSessionToken(allowAnonymous));
      if (sessionToken) return sessionToken;
      return getNeonToken();
    };
    return adapter;
  };
}

export async function getNeonToken() {
  try {
    const token = normalizeJwt(globalThis.localStorage.getItem(NEON_TOKEN_KEY));
    if (!token) globalThis.localStorage.removeItem(NEON_TOKEN_KEY);
    return token;
  } catch { return null; }
}
