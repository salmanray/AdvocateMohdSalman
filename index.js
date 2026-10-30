import { getDatabase, json, validOrigin, readJson, getCurrentUser } from "../_auth.js";

export async function onRequestGet(context) {
  try {
    const sql = getDatabase(context);
    const user = await getCurrentUser(context.request, sql);
    if (!user) return json({ error: "Please log in." }, 401);
    const rows = user.role === "admin"
      ? await sql`SELECT e.id, e.subject, e.category, e.description, e.status, e.created_at, u.full_name AS user_name, u.email AS user_email FROM enquiries e JOIN users u ON u.id=e.user_id ORDER BY e.created_at DESC LIMIT 100`
      : await sql`SELECT id, subject, category, description, status, created_at FROM enquiries WHERE user_id=${user.id} ORDER BY created_at DESC`;
    return json({ status: "ok", enquiries: rows });
  } catch {
    console.error("Enquiry list failed.");
    return json({ error: "Unable to load enquiries." }, 500);
  }
}

export async function onRequestPost(context) {
  const request = context.request;
  if (!validOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  const body = await readJson(request);
  if (!body) return json({ error: "Invalid request data." }, 400);
  const subject = String(body.subject || "").trim();
  const category = String(body.category || "").trim();
  const description = String(body.description || "").trim();
  if (subject.length < 3 || subject.length > 180) return json({ error: "Subject must be 3–180 characters." }, 400);
  if (category.length > 80) return json({ error: "Category is too long." }, 400);
  if (description.length < 20 || description.length > 10000) return json({ error: "Description must be 20–10,000 characters." }, 400);
  try {
    const sql = getDatabase(context);
    const user = await getCurrentUser(request, sql);
    if (!user) return json({ error: "Please log in." }, 401);
    const rows = await sql`
      INSERT INTO enquiries (user_id, subject, category, description)
      VALUES (${user.id}, ${subject}, ${category || null}, ${description})
      RETURNING id, subject, category, description, status, created_at
    `;
    return json({ status: "ok", enquiry: rows[0] }, 201);
  } catch {
    console.error("Enquiry submission failed.");
    return json({ error: "Unable to submit enquiry." }, 500);
  }
}
