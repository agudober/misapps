export const NEON_TOKEN_KEY = "neon-auth-jwt-fallback";
const USER_KEY = "misapps-user-cache";

function isJwt(value) {
  return typeof value === "string" && value.split(".").length === 3 &&
    value.split(".").every(part => part.length > 0);
}

export function captureNeonJwt(ctx) {
  // NeonAuthAdapterCore lee "set-auth-jwt" y lo inyecta en
  // ctx.data.session.token antes de ejecutar el onSuccess del usuario.
  const token = ctx?.data?.session?.token;
  if (isJwt(token)) localStorage.setItem(NEON_TOKEN_KEY, token);
}

export function saveNeonAuthResult(result) {
  const payload = result?.data ?? result;
  const user = payload?.user || payload?.data?.user || result?.user;
  const token = localStorage.getItem(NEON_TOKEN_KEY);
  if (!isJwt(token) || !user?.id) {
    throw new Error("Neon no ha entregado el JWT en la cabecera de autenticación. No se ha modificado ni borrado ningún dato.");
  }
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

// La autenticación PWA obtiene el JWT de la cabecera set-auth-jwt del SDK de Neon.
