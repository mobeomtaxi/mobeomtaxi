// functions/api/check-username.js
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const username = (url.searchParams.get("username") || "").trim();

  if (!username || username.length < 3) {
    return json({ ok: false, available: false, msg: "아이디는 3자 이상" }, 400);
  }

  const exists = await env.DB.prepare(`SELECT 1 FROM users WHERE username = ?`)
    .bind(username)
    .first();

  return json({ ok: true, available: !exists });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
