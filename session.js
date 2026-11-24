export const NEON_TOKEN_KEY = "neon-auth-jwt-fallback";
const USER_KEY = "misapps-user-cache";

function isJwt(value) {
  if (typeof value !== "string") return false;
  const parts = value.trim().split(".");
  return parts.length === 3 && parts.every(part => /^[A-Za-z0-9_-]+$/.test(part));
}

export function captureNeonJwt(ctx) {
  // Only the set-auth-jwt response header contains the Data API JWT.
  // ctx.data.session.token may otherwise be Better Auth's opaque session token.
  const headerToken = ctx?.response?.headers?.get("set-auth-jwt");
  const normalizedToken = ctx?.data?.session?.token;
  const token = isJwt(headerToken) ? headerToken : (isJwt(normalizedToken) ? normalizedToken : null);
  if (token) localStorage.setItem(NEON_TOKEN_KEY, token);
}

export function saveNeonAuthResult(result) {
  const payload = result?.data ?? result;
  const user = payload?.user || payload?.data?.user || result?.user;
  const storedToken = localStorage.getItem(NEON_TOKEN_KEY);
  const responseToken =
    payload?.session?.token ||
    payload?.token ||
    payload?.session?.access_token ||
    payload?.access_token;
  const token = isJwt(storedToken) ? storedToken : (isJwt(responseToken) ? responseToken : null);
  if (!token || !user?.id) {
    // Discard only an invalid cached credential, never application records.
    clearNeonAuth();
    throw new Error("Neon ha validado el acceso, pero no ha entregado un JWT válido para la base de datos. No se ha modificado ni borrado ningún dato.");
  }
  localStorage.setItem(NEON_TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function readNeonUser() {
  try {
    const token = localStorage.getItem(NEON_TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!isJwt(token) || !rawUser) return null;
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
  return isJwt(token) ? token : null;
}
