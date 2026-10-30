
import {
  getDatabase,
  json,
  getCurrentUser
} from "../_auth.js";

export async function onRequestGet(context) {
  try {
    const sql = getDatabase(context);

    const user = await getCurrentUser(
      context.request,
      sql
    );

    if (!user) {
      return json({
        status: "unauthenticated",
        user: null
      }, 401);
    }

    return json({
      status: "ok",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Current user check failed.");

    return json({
      error: "Unable to verify login session."
    }, 500);
  }
}
