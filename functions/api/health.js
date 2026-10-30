export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      status: "ok",
      message: "Advocate Mohd Salman website API is running.",
      timestamp: new Date().toISOString()
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

