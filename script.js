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

/* data-page="xxx" 링크 지원 */
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
   로그인/로그아웃 + UI 토글
========================= */
const API = "/api";

/** DOM */
function $id(id){ return document.getElementById(id); }

function getLoginInputs(){
  return {
    idInput: $id("loginId"),
    pwInput: $id("loginPw"),
    loginBtn: document.querySelector("#loginBox .login-btn"),
    msg: $id("loginMsg"),
  };
}

/** 메시지 */
function setLoginMsg(text, type){
  const { msg } = getLoginInputs();
  if (!msg) return;
  msg.textContent = text || "";
  msg.className = "login-msg" + (type ? " " + type : "");
}

/** 로그인 UI <-> 유저패널 UI 전환 */
function showLoggedInPanel(user){
  const loginBox = $id("loginBox");
  const userPanel = $id("userPanel");
  if (loginBox) loginBox.style.display = "none";
  if (userPanel) userPanel.style.display = "block";

  // 유저 정보 바인딩
  const nickname = user?.nickname || user?.username || "회원";
  const level = "일반회원"; // 지금은 고정(나중에 DB에서 꺼내면 됨)
  const point = 0;         // 지금은 고정(나중에 points 테이블 만들면 됨)

  const nickEl = $id("userNick");
  const levelEl = $id("userLevel");
  const pointEl = $id("userPoint");

  if (nickEl) nickEl.textContent = `${nickname}님`;
  if (levelEl) levelEl.textContent = level;
  if (pointEl) pointEl.textContent = point;

  // 로그인 입력값/메시지 정리
  const { idInput, pwInput } = getLoginInputs();
  if (idInput) idInput.value = "";
  if (pwInput) pwInput.value = "";
  setLoginMsg("", "");
}

function showLoggedOutPanel(){
  const loginBox = $id("loginBox");
  const userPanel = $id("userPanel");
  if (loginBox) loginBox.style.display = "block";
  if (userPanel) userPanel.style.display = "none";

  // 유저패널 값 초기화
  const nickEl = $id("userNick");
  const levelEl = $id("userLevel");
  const pointEl = $id("userPoint");
  if (nickEl) nickEl.textContent = "-";
  if (levelEl) levelEl.textContent = "일반회원";
  if (pointEl) pointEl.textContent = "0";

  // 로그인 메시지/입력 초기화
  const { idInput, pwInput } = getLoginInputs();
  if (idInput) idInput.value = "";
  if (pwInput) pwInput.value = "";
  setLoginMsg("", "");
}

/** 로그인 버튼/엔터 연결 */
function bindLoginEvents(){
  const { idInput, pwInput, loginBtn } = getLoginInputs();

  if (loginBtn) {
    loginBtn.type = "button";
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      doLogin();
    });
  }

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

/** 로그인 */
async function doLogin() {
  const { idInput, pwInput } = getLoginInputs();
  const username = (idInput?.value || "").trim();
  const password = pwInput?.value || "";

  if (!username) return setLoginMsg("아이디를 입력하세요.", "bad");
  if (!password) return setLoginMsg("비밀번호를 입력하세요.", "bad");

  setLoginMsg("로그인 중...", "");

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password })
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    setLoginMsg(data?.msg || "로그인 실패", "bad");
    return;
  }

  // ✅ 바로 UI 전환 (login 응답에 user가 있으니)
  showLoggedInPanel(data.user);

  // 그래도 한 번 더 /me 확인해서 세션 정상인지 체크
  await refreshLoginUI(false);
}

/** 세션 확인 */
async function refreshLoginUI(alertOn401 = false) {
  try{
    const res = await fetch(`${API}/me`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "include"
    });

    if (res.status === 401) {
      if (alertOn401) alert("세션이 없습니다(401). 쿠키/Set-Cookie 확인 필요");
      showLoggedOutPanel();
      return;
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || !data?.loggedIn) {
      showLoggedOutPanel();
      return;
    }

    showLoggedInPanel(data.user);
  }catch(e){
    console.warn("refreshLoginUI error:", e);
    showLoggedOutPanel();
  }
}

/** 로그아웃 */
async function doLogout() {
  await fetch(`${API}/logout`, {
    method: "POST",
    credentials: "include"
  }).catch(()=>{});

  // ✅ UI 즉시 초기화 (새로고침 없이도 깔끔)
  showLoggedOutPanel();

  // 원하면 홈으로 이동
  showPage("home");
}

/* =========================
   최초 실행
========================= */
window.addEventListener("load", async () => {
  const page = (location.hash || '#home').replace('#', '').trim();
  showPage(page || 'home');

  bindLoginEvents();
  await refreshLoginUI(false);
});
