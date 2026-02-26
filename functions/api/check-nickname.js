// functions/api/check-nickname.js
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const nickname = (url.searchParams.get("nickname") || "").trim();

  if (!nickname) {
    return json({ ok: false, available: false, msg: "닉네임을 입력하세요" }, 400);
  }

  const exists = await env.DB.prepare(`SELECT id FROM users WHERE nickname = ?`)
    .bind(nickname)
    .first();

  if (exists) {
    return json({ ok: true, available: false, msg: "사용중인 닉네임 입니다." });
  }
  return json({ ok: true, available: true, msg: "사용가능한 닉네임 입니다." });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
