export const NEON_TOKEN_KEY = "neon-auth-jwt-fallback";
const USER_KEY = "misapps-user-cache";

function validToken(value) {
  // Neon session token is opaque to the app; do not assume JWT dot format.
  return typeof value === "string" && value.trim().length > 20;
}

export function captureNeonJwt(ctx) {
  // Adapter core injects set-auth-jwt into ctx.data.session.token before
  // calling this callback. Keep alternate response shapes for SDK variants.
  const token =
    ctx?.data?.session?.token ||
    ctx?.response?.headers?.get("set-auth-jwt") ||
    ctx?.data?.token ||
    ctx?.data?.access_token ||
    ctx?.data?.session?.access_token;
  if (validToken(token)) localStorage.setItem(NEON_TOKEN_KEY, token);
}

export function saveNeonAuthResult(result) {
  const payload = result?.data ?? result;
  const user = payload?.user || payload?.data?.user || result?.user;
  const token =
    localStorage.getItem(NEON_TOKEN_KEY) ||
    payload?.session?.token ||
    payload?.token ||
    payload?.session?.access_token ||
    payload?.access_token;
  if (!validToken(token) || !user?.id) {
    throw new Error("Neon ha aceptado la solicitud, pero no ha devuelto un token de sesión utilizable. No se ha modificado ni borrado ningún dato.");
  }
  localStorage.setItem(NEON_TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function readNeonUser() {
  try {
    const token = localStorage.getItem(NEON_TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!validToken(token) || !rawUser) return null;
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
  const token = localStorage.getItem(NEON_TOKEN_KEY);
  return validToken(token) ? token : null;
}

// La autenticación PWA obtiene el JWT de la cabecera set-auth-jwt del SDK de Neon.
