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

/* data-page="xxx" 링크 지원(선택) */
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

/** 로그인 버튼/엔터 자동 연결 */
function bindLoginEvents(){
  const idInput = document.querySelector(".login-input[type='text']");
  const pwInput = document.querySelector(".login-input[type='password']");
  const loginBtn = document.querySelector(".login-box .login-btn"); // 첫번째 버튼

  if (loginBtn) {
    // 혹시 기존 onclick이 없어도 무조건 연결
    loginBtn.type = "button";
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      doLogin();
    });
  }

  // 엔터로 로그인
  [idInput, pwInput].forEach((el) => {
    if (!el) return;
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doLogin();
      }
    });
  });
}

async function doLogin() {
  const username = document.querySelector(".login-input[type='text']")?.value.trim() || "";
  const password = document.querySelector(".login-input[type='password']")?.value || "";

  if (!username) return alert("아이디를 입력하세요.");
  if (!password) return alert("비밀번호를 입력하세요.");

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include", // ✅ 쿠키 세션 포함 (중요)
    body: JSON.stringify({ username, password })
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    return alert(data?.msg || "로그인 실패");
  }

  alert(`${data.user?.nickname || data.user?.username || "회원"}님 로그인 성공`);

  // ✅ 로그인 직후 /api/me 재확인해서 UI 반영
  await refreshLoginUI(true);
}

async function refreshLoginUI(showAlertOn401 = false) {
  try{
    const res = await fetch(`${API}/me`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "include" // ✅ 쿠키 세션 포함 (중요)
    });

    // 401이면 쿠키가 없거나 세션이 없다는 뜻
    if (res.status === 401) {
      if (showAlertOn401) {
        alert("로그인은 됐는데 세션 쿠키가 저장되지 않았습니다. (Set-Cookie 확인 필요)");
      }
      setLoggedOutUI();
      return;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok || !data?.loggedIn) {
      setLoggedOutUI();
      return;
    }

    setLoggedInUI(data.user);

  }catch(e){
    console.warn("refreshLoginUI error:", e);
    setLoggedOutUI();
  }
}

function setLoggedInUI(user){
  const nickname = user?.nickname || user?.username || "회원";

  const box = document.querySelector(".login-box");
  if (!box) return;

  // ✅ 기존 안내/로그아웃 버튼 만들기
  let info = document.getElementById("loginInfo");
  if (!info) {
    info = document.createElement("div");
    info.id = "loginInfo";
    info.style.marginTop = "10px";
    info.style.fontWeight = "900";
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
    btn.addEventListener("click", doLogout);
    box.appendChild(btn);
  }
}

function setLoggedOutUI(){
  // 로그인 안내/로그아웃 버튼 제거
  const info = document.getElementById("loginInfo");
  if (info) info.remove();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.remove();
}

async function doLogout() {
  await fetch(`${API}/logout`, {
    method: "POST",
    credentials: "include"
  }).catch(()=>{});
  location.reload();
}


/* =========================
   최초 실행
========================= */
window.addEventListener("load", async () => {
  // 새로고침/첫 진입 시 현재 페이지 유지
  const page = (location.hash || '#home').replace('#', '').trim();
  showPage(page || 'home');

  // 로그인 이벤트 연결 + 로그인 상태 갱신
  bindLoginEvents();
  await refreshLoginUI(false);
});
