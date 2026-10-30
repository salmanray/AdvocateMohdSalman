
import {
  getDatabase,
  json,
  validOrigin,
  deleteSession,
  clearSessionCookie
} from "../_auth.js";

export async function onRequestPost(context) {
  if (!validOrigin(context.request)) {
    return json({ error: "Invalid request origin." }, 403);
  }

  try {
    const sql = getDatabase(context);

    await deleteSession(context.request, sql);

    return json(
      {
        status: "ok",
        message: "Logout successful."
      },
      200,
      {
        "Set-Cookie": clearSessionCookie()
      }
    );
  } catch (error) {
    console.error("Logout failed.");

    return json({
      error: "Logout could not be completed."
    }, 500);
  }
}
