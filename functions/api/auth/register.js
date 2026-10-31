
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

  // Step 1: Validate request origin
  if (!validOrigin(request)) {
    return json({ error: "Invalid request origin." }, 403);
  }

  // Step 2: Validate content type
  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return json({ error: "JSON request required." }, 415);
  }

  // Step 3: Read request body
  const body = await readJson(request);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Invalid request data." }, 400);
  }

  // Step 4: Extract input values
  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const password = body.password;

  // Step 5: Validate name
  if (fullName.length < 2 || fullName.length > 120) {
    return json({
      error: "Name must be between 2 and 120 characters."
    }, 400);
  }

  // Step 6: Validate email
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return json({
      error: "Enter a valid email address."
    }, 400);
  }

  // Step 7: Validate phone
  if (phone.length > 20) {
    return json({
      error: "Phone number is too long."
    }, 400);
  }

  // Step 8: Validate password
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  ) {
    return json({
      error: "Password must be between 12 and 128 characters."
    }, 400);
  }

  // Tracks the stage where registration fails
  let stage = "database initialization";

  try {
    // Step 9: Connect to Neon database
    const sql = getDatabase(context);

    // Step 10: Check whether email already exists
    stage = "email lookup";

    const existing = await sql`
      SELECT id
      FROM users
      WHERE LOWER(email) = ${email}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return json({
        error: "An account with this email may already exist."
      }, 409);
    }

    // Step 11: Hash password
    stage = "password hashing";

    const passwordHash = await hashPassword(password);

    // Step 12: Insert user into database
    stage = "user insertion";

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

    if (!user) {
      throw new Error("User insertion returned no record.");
    }

    // Step 13: Create login session
    stage = "session creation";

    const token = await createSession(sql, user.id);

    // Step 14: Return success and set secure cookie
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

    // Safe diagnostic logging:
    // Never log passwords, password hashes or database credentials.
    console.error("Registration failed", {
      stage,
      errorName: error instanceof Error
        ? error.name
        : "UnknownError",
      errorMessage: error instanceof Error
        ? error.message
        : "Unknown error"
    });

    // Keep internal error details hidden from website visitors
    return json({
      error: "Registration could not be completed. Please try again."
    }, 500);
  }
}
