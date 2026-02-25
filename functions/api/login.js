// functions/api/login.js
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const username = (body.username || "").trim();
    const password = body.password || "";

    const user = await env.DB.prepare(`
      SELECT id, username, password_hash, nickname
      FROM users
      WHERE username = ?
    `).bind(username).first();

    if (!user) return json({ ok: false, msg: "아이디/비밀번호 확인" }, 401);

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return json({ ok: false, msg: "아이디/비밀번호 확인" }, 401);

    // 세션 생성(7일)
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiresIso = expiresAt.toISOString();

    await env.DB.prepare(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(sessionId, user.id, expiresIso).run();

    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    headers.append("Set-Cookie", cookie("session_id", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      expires: expiresAt,
    }));

    return new Response(JSON.stringify({
      ok: true,
      user: { id: user.id, username: user.username, nickname: user.nickname }
    }), { status: 200, headers });

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

function cookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join("; ");
}

async function verifyPassword(password, stored) {
  // stored: pbkdf2$120000$$salt$hash
  const parts = stored.split("$");
  if (parts.length < 5 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  const saltB64 = parts[3];
  const hashB64 = parts[4];

  const salt = fromB64(saltB64);
  const expected = fromB64(hashB64);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    expected.length * 8
  );

  const actual = new Uint8Array(bits);
  return timingSafeEqual(actual, expected);
}

function fromB64(str) {
  const bin = atob(str);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= (a[i] ^ b[i]);
  return out === 0;
}
