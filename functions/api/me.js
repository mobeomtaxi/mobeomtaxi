// functions/api/me.js
export async function onRequestGet({ request, env }) {
  const sessionId = getCookie(request, "session_id");
  if (!sessionId) return json({ ok: false, loggedIn: false }, 401);

  // 만료 안 된 세션 + 유저 조인
  const row = await env.DB.prepare(`
    SELECT u.id, u.username, u.nickname, u.email, u.phone
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
      AND datetime(s.expires_at) > datetime('now')
  `).bind(sessionId).first();

  if (!row) return json({ ok: false, loggedIn: false }, 401);

  return json({ ok: true, loggedIn: true, user: row });
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
