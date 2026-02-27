// functions/api/login.js
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!username || !password) {
      return json({ ok:false, msg:"아이디/비밀번호를 입력하세요" }, 400);
    }

    const user = await env.DB.prepare(`
      SELECT id, username, password_hash, nickname
      FROM users
      WHERE username = ?
    `).bind(username).first();

    if (!user) return json({ ok:false, msg:"아이디 또는 비밀번호가 올바르지 않습니다" }, 401);

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return json({ ok:false, msg:"아이디 또는 비밀번호가 올바르지 않습니다" }, 401);

    // 세션 생성(간단)
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7일

    await env.DB.prepare(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(sessionId, user.id, expiresAt).run();

    const headers = new Headers({ "Content-Type":"application/json; charset=utf-8" });
    headers.append(
      "Set-Cookie",
      `session_id=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60*60*24*7}`
    );

    return new Response(JSON.stringify({ ok:true, user:{ id:user.id, username:user.username, nickname:user.nickname } }), {
      status: 200,
      headers
    });
  } catch (e) {
    return json({ ok:false, msg:"서버 오류", error:String(e) }, 500);
  }
}

function json(data, status=200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type":"application/json; charset=utf-8" }
  });
}

async function verifyPassword(password, stored){
  // stored: pbkdf2$100000$saltB64$hashB64
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iter = parseInt(parts[1], 10);
  const saltB64 = parts[2];
  const hashB64 = parts[3];
  if (!iter || !saltB64 || !hashB64) return false;

  const salt = fromB64(saltB64);
  const expected = fromB64(hashB64);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name:"PBKDF2" },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name:"PBKDF2", hash:"SHA-256", salt, iterations: iter },
    key,
    expected.length * 8
  );

  const got = new Uint8Array(bits);
  return timingSafeEqual(got, expected);
}

function fromB64(b64){
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function timingSafeEqual(a,b){
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i=0;i<a.length;i++) out |= (a[i] ^ b[i]);
  return out === 0;
}
