export const NEON_TOKEN_KEY = "neon-auth-jwt-fallback";
const USER_KEY = "misapps-user-cache";

function isJwt(value) {
  return typeof value === "string" && value.split(".").length === 3 &&
    value.split(".").every(part => part.length > 0);
}

export function saveNeonAuthResult(result) {
  const payload = result?.data ?? result;
  const session = payload?.session || payload?.data?.session || result?.session;
  // Better Auth's session.token is an opaque cookie identifier, NOT a JWT.
  // The Data API requires session.access_token.
  const candidates = [
    session?.access_token,
    payload?.session?.access_token,
    payload?.data?.session?.access_token,
    result?.session?.access_token,
    payload?.access_token,
    result?.access_token
  ];
  const token = candidates.find(isJwt);
  const user = payload?.user || session?.user || payload?.data?.user || result?.user || result?.session?.user;
  if (!token || !user?.id) {
    throw new Error("Neon no ha devuelto un JWT válido para acceder a tus datos. No se ha modificado ni borrado ningún dato.");
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
