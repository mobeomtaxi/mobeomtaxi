/* =========================
   페이지 전환
========================= */
function showPage(id) {
  // 모든 page 숨김
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // 대상 page 표시
  const el = document.getElementById(id);

  // 없으면 홈으로
  if (!el) {
    console.warn('[showPage] 섹션 없음:', id);
    document.getElementById('home')?.classList.add('active');
    location.hash = 'home';
    return;
  }

  el.classList.add('active');

  // 현재 페이지 해시 저장(새로고침 유지)
  location.hash = id;
}

/* ✅ 새로고침/첫 진입 시 현재 페이지 유지 */
window.addEventListener('load', () => {
  const page = (location.hash || '#home').replace('#', '').trim();
  showPage(page || 'home');
});

/* ✅ 메뉴 클릭이 꼬일 때 대비 (권장)
   a태그에 data-page="analysis" 같은 방식으로 바꾸면 가장 안정적.
   지금은 onclick도 쓰고 있으니, 아래는 "있어도 안전"한 보조장치야.
*/
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

  if (frame) frame.src = "signup.html"; // 항상 새로 로드
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

// 로그인 실행
async function doLogin() {
  const username = document.querySelector(".login-input[type='text']").value.trim();
  const password = document.querySelector(".login-input[type='password']").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (!data.ok) return alert(data.msg || "로그인 실패");

  alert(`${data.user.nickname}님 로그인 성공`);
  await refreshLoginUI();
}

// 로그인 상태 불러오기
async function refreshLoginUI() {
  const res = await fetch("/api/me");
  if (!res.ok) return;

  const data = await res.json();
  if (!data.loggedIn) return;

  // 예시: 로그인 박스 아래에 표시
  let box = document.querySelector(".login-box");
  let info = document.getElementById("loginInfo");
  if (!info) {
    info = document.createElement("div");
    info.id = "loginInfo";
    info.style.marginTop = "10px";
    info.style.fontWeight = "800";
    box.appendChild(info);

    const btn = document.createElement("button");
    btn.textContent = "로그아웃";
    btn.style.marginTop = "8px";
    btn.className = "login-btn";
    btn.onclick = doLogout;
    box.appendChild(btn);
  }
  info.textContent = `환영합니다, ${data.user.nickname}님`;
}

async function doLogout() {
  await fetch("/api/logout", { method: "POST" });
  location.reload();
}

window.addEventListener("load", () => {
  refreshLoginUI();
});
