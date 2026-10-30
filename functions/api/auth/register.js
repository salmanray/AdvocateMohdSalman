
import {
  getDatabase,
  json,
  validOrigin,
  readJson,
  hashPassword,
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

  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const password = body.password;

  if (fullName.length < 2 || fullName.length > 120) {
    return json({ error: "Name must be between 2 and 120 characters." }, 400);
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  if (phone.length > 20) {
    return json({ error: "Phone number is too long." }, 400);
  }

  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  ) {
    return json({
      error: "Password must be between 12 and 128 characters."
    }, 400);
  }

  try {
    const sql = getDatabase(context);

    const existing = await sql`
      SELECT id FROM users
      WHERE LOWER(email) = ${email}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return json({
        error: "An account with this email may already exist."
      }, 409);
    }

    const passwordHash = await hashPassword(password);

    const inserted = await sql`
      INSERT INTO users (
        full_name,
        email,
        phone,
        password_hash,
        role
      )
      VALUES (
        ${fullName},
        ${email},
        ${phone || null},
        ${passwordHash},
        'user'
      )
      RETURNING id, full_name, email, role
    `;

    const user = inserted[0];
    const token = await createSession(sql, user.id);

    return json(
      {
        status: "ok",
        message: "Registration successful.",
        user
      },
      201,
      {
        "Set-Cookie": sessionCookie(token)
      }
    );
  } catch (error) {
    console.error("Registration failed.");

    return json({
      error: "Registration could not be completed. Please try again."
    }, 500);
  }
}
