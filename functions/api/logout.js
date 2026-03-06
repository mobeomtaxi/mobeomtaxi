// functions/api/logout.js

export async function onRequestPost(ctx) {
  return handleLogout(ctx);
}

// ✅ 혹시 GET으로 들어와도 로그아웃 되게 안전장치
export async function onRequestGet(ctx) {
  return handleLogout(ctx);
}

async function handleLogout({ request, env }) {
  try {
    const sessionId = getCookie(request, "session_id");

    // 세션이 있으면 DB에서도 삭제
    if (sessionId) {
      await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
    }

    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });

    // ✅ 쿠키 삭제는 "Max-Age=0" + "Expires 과거" + "로그인 때와 동일 옵션"이 제일 확실함
    headers.append(
      "Set-Cookie",
      [
        "session_id=",
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Max-Age=0",
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      ].join("; ")
    );

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    // 에러여도 쿠키는 지우도록 응답
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    headers.append(
      "Set-Cookie",
      [
        "session_id=",
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Max-Age=0",
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      ].join("; ")
    );

    return new Response(JSON.stringify({ ok: false, msg: "서버 오류", error: String(e) }), {
      status: 500,
      headers,
    });
  }
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
