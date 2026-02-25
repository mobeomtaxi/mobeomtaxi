// functions/api/signup.js
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const username = (body.username || "").trim();
    const password = body.password || "";
    const nickname = (body.nickname || "").trim();
    const email = (body.email || "").trim() || null;
    const phone = (body.phone || "").trim() || null;
    const intro = (body.intro || "").trim() || null;
    const recommender = (body.recommender || "").trim() || null;

    if (!username || username.length < 3) {
      return json({ ok: false, msg: "아이디는 3자 이상" }, 400);
    }
    if (!password || password.length < 10) {
      return json({ ok: false, msg: "비밀번호는 10자 이상" }, 400);
    }
    if (!nickname) {
      return json({ ok: false, msg: "닉네임을 입력하세요" }, 400);
    }

    const password_hash = await hashPassword(password);

    // 중복 체크
    const exists = await env.DB.prepare(`SELECT id FROM users WHERE username = ?`)
      .bind(username)
      .first();

    if (exists) {
      return json({ ok: false, msg: "이미 사용 중인 아이디입니다" }, 409);
    }

    const res = await env.DB.prepare(`
      INSERT INTO users (username, password_hash, nickname, email, phone, intro, recommender)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(username, password_hash, nickname, email, phone, intro, recommender).run();

    return json({ ok: true, user_id: res.meta.last_row_id });
  } catch (e) {
    return json({ ok: false, msg: "서버 오류", error: String(e) }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// PBKDF2 해시(서버에 평문 저장 X)
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 120000 },
    key,
    256
  );

  const saltB64 = b64(salt);
  const hashB64 = b64(new Uint8Array(bits));
  return `pbkdf2$120000$${saltB64}$${hashB64}`;
}

function b64(u8) {
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
}
