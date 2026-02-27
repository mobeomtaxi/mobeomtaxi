/* =========================
   페이지 전환
========================= */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const el = document.getElementById(id);

  if (!el) {
    console.warn('[showPage] 섹션 없음:', id);
    document.getElementById('home')?.classList.add('active');
    location.hash = 'home';
    return;
  }

  el.classList.add('active');
  location.hash = id;
}

window.addEventListener('load', () => {
  const page = (location.hash || '#home').replace('#', '').trim();
  showPage(page || 'home');
});

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-page]');
  if (!a) return;
  e.preventDefault();
  showPage(a.dataset.page);
});


/* =========================
   회원가입 모달
========================= */
function openSignup(){
  const modal = document.getElementById("signupModal");
  const frame = document.getElementById("signupFrame");

  if (frame) frame.src = "signup.html";
  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSignup(){
  const modal = document.getElementById("signupModal");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}


/* =========================
   로그인/로그아웃
========================= */
const API = "/api";

async function doLogin() {
  const username = document.querySelector(".login-input[type='text']")?.value.trim() || "";
  const password = document.querySelector(".login-input[type='password']")?.value || "";

  if (!username) return alert("아이디를 입력하세요.");
  if (!password) return alert("비밀번호를 입력하세요.");

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include", // ✅ 세션 쿠키 포함
    body: JSON.stringify({ username, password })
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) return alert(data?.msg || "로그인 실패");

  alert(`${data.user?.nickname || data.user?.username || "회원"}님 로그인 성공`);
  await refreshLoginUI();
}

async function refreshLoginUI() {
  try{
    const res = await fetch(`${API}/me`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "include" // ✅ 세션 쿠키 포함
    });

    const data = await res.json().catch(() => null);

    // ✅ me.js 스펙: { ok, loggedIn, user }
    if (!res.ok || !data?.ok || !data?.loggedIn) {
      // 로그아웃 상태: 기존 안내/버튼 제거
      const info = document.getElementById("loginInfo");
      if (info) info.remove();
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) logoutBtn.remove();
      return;
    }

    const nickname = data.user?.nickname || data.user?.username || "회원";

    const box = document.querySelector(".login-box");
    if (!box) return;

    let info = document.getElementById("loginInfo");
    if (!info) {
      info = document.createElement("div");
      info.id = "loginInfo";
      info.style.marginTop = "10px";
      info.style.fontWeight = "800";
      box.appendChild(info);
    }
    info.textContent = `환영합니다, ${nickname}님`;

    let btn = document.getElementById("logoutBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "logoutBtn";
      btn.textContent = "로그아웃";
      btn.style.marginTop = "8px";
      btn.className = "login-btn";
      btn.type = "button";
      btn.onclick = doLogout;
      box.appendChild(btn);
    }
  }catch(e){
    console.warn("refreshLoginUI error:", e);
  }
}

async function doLogout() {
  await fetch(`${API}/logout`, {
    method: "POST",
    credentials: "include"
  }).catch(()=>{});
  location.reload();
}

window.addEventListener("load", () => {
  refreshLoginUI();
});
