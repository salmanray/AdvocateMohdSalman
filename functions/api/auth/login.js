
import {
  getDatabase,
  json,
  validOrigin,
  readJson,
  verifyPassword,
  createSession,
  sessionCookie
} from "../_auth.js";

export async function onRequestPost(context) {
  const request = context.request;

  if (!validOrigin(request)) {
    return json({ error: "Invalid request origin." }, 403);
  }

  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return json({ error: "JSON request required." }, 415);
  }

  const body = await readJson(request);

  if (!body || typeof body !== "object") {
    return json({ error: "Invalid request data." }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = body.password;

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== "string" ||
    password.length > 128
  ) {
    return json({ error: "Invalid email or password." }, 400);
  }

  try {
    const sql = getDatabase(context);

    const rows = await sql`
      SELECT id, full_name, email, password_hash, role
      FROM users
      WHERE LOWER(email) = ${email}
        AND is_active = TRUE
      LIMIT 1
    `;

    if (rows.length === 0) {
      return json({ error: "Invalid email or password." }, 401);
    }

    const user = rows[0];

    const validPassword = await verifyPassword(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return json({ error: "Invalid email or password." }, 401);
    }

    const token = await createSession(sql, user.id);

    return json(
      {
        status: "ok",
        message: "Login successful.",
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role
        }
      },
      200,
      {
        "Set-Cookie": sessionCookie(token)
      }
    );
  } catch (error) {
    console.error("Login failed.");

    return json({
      error: "Login could not be completed. Please try again."
    }, 500);
  }
}
