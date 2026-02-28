/* =========================
   페이지 전환
========================= */
function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));

  const el = document.getElementById(id);
  if (!el) {
    console.warn("[showPage] 섹션 없음:", id);
    document.getElementById("home")?.classList.add("active");
    location.hash = "home";
    return;
  }

  el.classList.add("active");
  location.hash = id;
}

/* data-page="xxx" 링크 지원 */
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-page]");
  if (!a) return;
  e.preventDefault();
  showPage(a.dataset.page);
});

/* =========================
   회원가입 모달
========================= */
function openSignup() {
  const modal = document.getElementById("signupModal");
  const frame = document.getElementById("signupFrame");
  if (frame) frame.src = "signup.html";
  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSignup() {
  const modal = document.getElementById("signupModal");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* =========================
   로그인/로그아웃 + UI 토글
   ✅ 네 HTML(id) 기준:
   - loginForm, loginUsername, loginPassword, loginMsg
   - userPanel, userNick, userIdText, userLevel, userPoint
========================= */
const API = "/api";
const $id = (id) => document.getElementById(id);

function getLoginEls() {
  return {
    loginForm: $id("loginForm"),
    userPanel: $id("userPanel"),
    username: $id("loginUsername"),
    password: $id("loginPassword"),
    msg: $id("loginMsg"),
    // 유저패널
    userNick: $id("userNick"),
    userIdText: $id("userIdText"),
    userLevel: $id("userLevel"),
    userPoint: $id("userPoint"),
  };
}

function setLoginMsg(text = "", type = "") {
  const { msg } = getLoginEls();
  if (!msg) return;
  msg.textContent = text;
  msg.className = "login-msg" + (type ? " " + type : "");
}

/** 로그아웃 UI */
function showLoggedOutPanel() {
  const {
    loginForm,
    userPanel,
    username,
    password,
    userNick,
    userIdText,
    userLevel,
    userPoint,
  } = getLoginEls();

  if (loginForm) loginForm.style.display = "block";
  if (userPanel) userPanel.style.display = "none";

  if (userNick) userNick.textContent = "-";
  if (userIdText) userIdText.textContent = "-";
  if (userLevel) userLevel.textContent = "일반회원";
  if (userPoint) userPoint.textContent = "0";

  if (username) username.value = "";
  if (password) password.value = "";

  setLoginMsg("", "");
}

/** 로그인 UI */
function showLoggedInPanel(user) {
  const {
    loginForm,
    userPanel,
    username,
    password,
    userNick,
    userIdText,
    userLevel,
    userPoint,
  } = getLoginEls();

  if (loginForm) loginForm.style.display = "none";
  if (userPanel) userPanel.style.display = "block";

  const nickname = user?.nickname || user?.username || "회원";
  const uname = user?.username || "-";

  if (userNick) userNick.textContent = nickname; // ✅ "님"은 CSS/HTML에서 원하면 붙이기
  if (userIdText) userIdText.textContent = uname;

  // 지금은 DB에 레벨/포인트가 없으니 기본값
  if (userLevel) userLevel.textContent = "일반회원";
  if (userPoint) userPoint.textContent = "0";

  // 로그인 입력 초기화
  if (username) username.value = "";
  if (password) password.value = "";

  setLoginMsg("", "");
}

/** 엔터로 로그인 */
function bindLoginEvents() {
  const { username, password } = getLoginEls();

  [username, password].forEach((el) => {
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
  const { username, password } = getLoginEls();
  const u = (username?.value || "").trim();
  const p = password?.value || "";

  if (!u) return setLoginMsg("아이디를 입력하세요.", "bad");
  if (!p) return setLoginMsg("비밀번호를 입력하세요.", "bad");

  setLoginMsg("로그인 중...", "");

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: u, password: p }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setLoginMsg(data?.msg || "로그인 실패", "bad");
      return;
    }

    // ✅ 즉시 UI 반영
    showLoggedInPanel(data.user);

    // ✅ 세션 정상인지 /me로 재확인
    await refreshLoginUI(false);
  } catch (e) {
    setLoginMsg("서버 응답 오류", "bad");
  }
}

/** 세션 확인 */
async function refreshLoginUI(alertOn401 = false) {
  try {
    const res = await fetch(`${API}/me`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
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
  } catch (e) {
    console.warn("refreshLoginUI error:", e);
    showLoggedOutPanel();
  }
}

/** 로그아웃 */
async function doLogout() {
  try {
    await fetch(`${API}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {}

  // ✅ 새로고침 없이도 완전 초기화(닉네임 남는 문제 해결)
  showLoggedOutPanel();
  showPage("home");
}

/* =========================
   최초 실행
========================= */
window.addEventListener("load", async () => {
  const page = (location.hash || "#home").replace("#", "").trim();
  showPage(page || "home");

  bindLoginEvents();
  await refreshLoginUI(false);
});
