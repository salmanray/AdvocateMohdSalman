import { neon } from "@neondatabase/serverless";

const ITERATIONS = 310000;
const SESSION_DAYS = 7;

export function getDatabase(context) {
  if (!context.env.DATABASE_URL) {
    throw new Error("Database configuration missing");
  }
  return neon(context.env.DATABASE_URL);
}

export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export function validOrigin(request) {
  const origin = request.headers.get("Origin");

  if (!origin) return true;

  return origin === new URL(request.url).origin;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);

  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return base64url(new Uint8Array(digest));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    key,
    256
  );

  return `pbkdf2$${ITERATIONS}$${base64url(salt)}$${base64url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, storedHash) {
  try {
    const [algorithm, iterations, saltValue, hashValue] =
      storedHash.split("$");

    if (
      algorithm !== "pbkdf2" ||
      Number(iterations) !== ITERATIONS ||
      !saltValue ||
      !hashValue
    ) return false;

    const salt = decodeBase64url(saltValue);

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: ITERATIONS,
        hash: "SHA-256"
      },
      key,
      256
    );

    return base64url(new Uint8Array(bits)) === hashValue;
  } catch {
    return false;
  }
}

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";

  for (const item of cookies.split(";")) {
    const [key, ...value] = item.trim().split("=");

    if (key === name) return value.join("=");
  }

  return null;
}

export function sessionCookie(token) {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`;
}

export function clearSessionCookie() {
  return "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

export async function createSession(sql, userId) {
  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);

  await sql`
    INSERT INTO user_sessions (user_id, token_hash, expires_at)
    VALUES (
      ${userId},
      ${tokenHash},
      NOW() + INTERVAL '7 days'
    )
  `;

  return token;
}

export async function getCurrentUser(request, sql) {
  const token = getCookie(request, "session");

  if (!token) return null;

  const tokenHash = await sha256(token);

  const rows = await sql`
    SELECT u.id, u.full_name, u.email, u.role
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
      AND u.is_active = TRUE
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function deleteSession(request, sql) {
  const token = getCookie(request, "session");

  if (!token) return;

  const tokenHash = await sha256(token);

  await sql`
    DELETE FROM user_sessions
    WHERE token_hash = ${tokenHash}
  `;
}
