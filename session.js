export const NEON_TOKEN_KEY = "neon-auth-jwt-fallback";
const USER_KEY = "misapps-user-cache";

export function captureNeonJwt(ctx) {
  // Neon SDK injects the Data API JWT into the response session.
  const token = ctx?.response?.headers?.get("set-auth-jwt") ||
    ctx?.data?.session?.token;
  if (typeof token === "string" && token.split(".").length === 3) {
    localStorage.setItem(NEON_TOKEN_KEY, token);
  }
}

export async function saveNeonAuthResult(result) {
  const payload = result?.data ?? result;
  const user = payload?.user || payload?.data?.user || result?.user;
  if (!user?.id) {
    throw new Error("Neon no ha devuelto los datos del usuario después del acceso.");
  }
  // Cache only the user identity for navigation between same-origin app sections.
  // Data API credentials are refreshed and injected by the official Neon client.
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

// Kept for older pages during deployment; new database clients use Neon Auth directly.
export async function getNeonToken() {
  return null;
}
