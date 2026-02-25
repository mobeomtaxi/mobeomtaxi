export async function onRequest({ env }) {
  const result = await env.DB
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" }
  });
}
