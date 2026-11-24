export const NEON_TOKEN_KEY = "neon-auth-jwt-fallback";
const USER_KEY = "misapps-user-cache";

export function saveNeonAuthResult(result) {
  const payload = result?.data ?? result;
  const token = payload?.token || payload?.session?.token || payload?.session?.access_token || payload?.data?.token;
  const user = payload?.user || payload?.session?.user || payload?.data?.user;
  if (!token || !user?.id) {
    throw new Error("Neon ha validado el acceso, pero no ha entregado el token de sesión necesario para mantenerlo en este iPhone.");
  }
  localStorage.setItem(NEON_TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function readNeonUser() {
  try {
    const token = localStorage.getItem(NEON_TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser) return null;
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
  return localStorage.getItem(NEON_TOKEN_KEY);
}
