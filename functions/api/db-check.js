import { neon } from "@neondatabase/serverless";

export async function onRequestGet(context) {
  const databaseUrl = context.env.DATABASE_URL;

  if (!databaseUrl) {
    return Response.json(
      { status: "error", message: "Database configuration missing." },
      { status: 500 }
    );
  }

  try {
    const sql = neon(databaseUrl);
    const result = await sql`SELECT 1 AS connected`;

    return Response.json({
      status: "ok",
      message: "Neon database connected successfully.",
      database_test: result[0].connected
    });
  } catch (error) {
    console.error("Database connection test failed.");

    return Response.json(
      { status: "error", message: "Database connection failed." },
      { status: 503 }
    );
  }
}
