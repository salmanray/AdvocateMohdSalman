import { getDatabase, json, validOrigin, readJson, getCurrentUser } from "../../_auth.js";

export async function onRequestGet(context) {
  try {
    const sql = getDatabase(context);
    const user = await getCurrentUser(context.request, sql);
    if (!user) return json({ error: "Please log in." }, 401);
    const id = context.params.id;
    const owned = user.role === "admin"
      ? await sql`SELECT id FROM enquiries WHERE id=${id} LIMIT 1`
      : await sql`SELECT id FROM enquiries WHERE id=${id} AND user_id=${user.id} LIMIT 1`;
    if (!owned.length) return json({ error: "Enquiry not found." }, 404);
    const messages = await sql`
      SELECT m.id, m.sender_type, m.message, m.created_at, u.full_name AS sender_name
      FROM enquiry_messages m LEFT JOIN users u ON u.id=m.sender_user_id
      WHERE m.enquiry_id=${id} ORDER BY m.created_at ASC
    `;
    return json({ status: "ok", messages });
  } catch {
    console.error("Message retrieval failed.");
    return json({ error: "Unable to load messages." }, 500);
  }
}

export async function onRequestPost(context) {
  if (!validOrigin(context.request)) return json({ error: "Invalid request origin." }, 403);
  const body = await readJson(context.request);
  const message = String(body?.message || "").trim();
  if (message.length < 1 || message.length > 10000) return json({ error: "Message must be 1–10,000 characters." }, 400);
  try {
    const sql = getDatabase(context);
    const user = await getCurrentUser(context.request, sql);
    if (!user) return json({ error: "Please log in." }, 401);
    const id = context.params.id;
    const owned = user.role === "admin"
      ? await sql`SELECT id FROM enquiries WHERE id=${id} LIMIT 1`
      : await sql`SELECT id FROM enquiries WHERE id=${id} AND user_id=${user.id} LIMIT 1`;
    if (!owned.length) return json({ error: "Enquiry not found." }, 404);
    const senderType = user.role === "admin" ? "admin" : "user";
    const rows = await sql`
      INSERT INTO enquiry_messages (enquiry_id, sender_user_id, sender_type, message)
      VALUES (${id}, ${user.id}, ${senderType}, ${message})
      RETURNING id, sender_type, message, created_at
    `;
    if (user.role === "admin") {
      await sql`UPDATE enquiries SET status='answered' WHERE id=${id}`;
    } else {
      await sql`UPDATE enquiries SET status='in_progress' WHERE id=${id} AND status='pending'`;
    }
    return json({ status: "ok", message: rows[0] }, 201);
  } catch {
    console.error("Message send failed.");
    return json({ error: "Unable to send message." }, 500);
  }
}
