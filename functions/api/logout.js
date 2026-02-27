// functions/api/login.js
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!username || !password) {
      return json({ ok: false, msg: "아이디/비밀번호를 입력하세요." }, 400);
    }

    // 유저 조회
    const user = await env.DB.prepare(
      `SELECT id, username, nickname, password_hash FROM users WHERE username = ?`
    )
      .bind(username)
      .first();

    if (!user) {
      return json({ ok: false, msg: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
    }

    // ✅ PBKDF2 검증
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return json({ ok: false, msg: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
    }

    // 기존 세션 있으면 정리(선택)
    const oldSessionId = getCookie(request, "session_id");
    if (oldSessionId) {
      await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(oldSessionId).run();
    }

    // 새 세션 생성
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일
    const expiresIso = expiresAt.toISOString();

    await env.DB.prepare(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
    )
      .bind(sessionId, user.id, expiresIso)
      .run();

    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });

    // ✅ Pages(https)에서는 Secure OK
    // ✅ 같은 도메인에서 fetch(credentials: "include")면 SameSite=Lax로도 쿠키 전송됨
    headers.append(
      "Set-Cookie",
      [
        `session_id=${encodeURIComponent(sessionId)}`,
        "Path=/",
        `Expires=${expiresAt.toUTCString()}`,
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
      ].join("; ")
    );

    // 프론트 편의용 응답
    return new Response(
      JSON.stringify({
        ok: true,
        user: { id: user.id, username: user.username, nickname: user.nickname },
      }),
      { status: 200, headers }
    );
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

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * stored format:
 *  pbkdf2$100000$<saltB64>$<hashB64>
 *  (너 signup.js에서 iterations를 100000 이하로 바꿔서 저장하고 있으니 그 값 그대로 맞춰짐)
 */
async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;

  const parts = stored.split("$");
  if (parts.length !== 4) return false;

  const [algo, iterStr, saltB64, hashB64] = parts;
  if (algo !== "pbkdf2") return false;

  const iterations = parseInt(iterStr, 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;

  const salt = b64ToU8(saltB64);

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
    256
  );

  const computedB64 = u8ToB64(new Uint8Array(bits));

  // 타이밍 공격 방지용 상수시간 비교(간단 버전)
  return timingSafeEqual(computedB64, hashB64);
}

function u8ToB64(u8) {
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToU8(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    const ca = a.charCodeAt(i) || 0;
    const cb = b.charCodeAt(i) || 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}
