// functions/api/check-nickname.js
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const nickname = (url.searchParams.get("nickname") || "").trim();

  if (!nickname || nickname.length < 2) {
    return json({ ok: false, available: false, msg: "닉네임은 2자 이상" }, 400);
  }

  // (원하면 규칙 바꿔도 됨) 한글/영문/숫자만
  if (!/^[A-Za-z0-9가-힣]+$/.test(nickname)) {
    return json({ ok: false, available: false, msg: "한글/영문/숫자만 가능" }, 400);
  }

  const row = await env.DB.prepare(`SELECT id FROM users WHERE nickname = ?`)
    .bind(nickname)
    .first();

  if (row) return json({ ok: true, available: false, msg: "이미 사용 중인 닉네임입니다." });
  return json({ ok: true, available: true, msg: "사용 가능한 닉네임입니다." });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
