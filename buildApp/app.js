/* ==========================================================
   APP CSI — chỉ frontend (dữ liệu giả lập, lưu trong trình duyệt).
   Các màn hình (đổi qua hash trên thanh địa chỉ):
     #/                    Trang chủ
     #/events              Tất cả sự kiện
     #/room/<id>           Chi tiết phòng: thiết bị + Train
     #/room/<id>/train     Train
     #/add  hoặc #/add/<roomId>   Thêm thiết bị (QR / nhập tay -> thông tin -> WiFi -> kết nối)
   ========================================================== */

const STORAGE_KEY = "csi-web-rooms";
const EVENTS_KEY = "csi-web-events";

// Lấy dữ liệu: ưu tiên bản đã lưu, không có thì dùng dữ liệu mẫu trong data.js
let rooms = load(STORAGE_KEY, MOCK_ROOMS);
let events = load(EVENTS_KEY, MOCK_EVENTS);
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || structuredClone(fallback); }
  catch { return structuredClone(fallback); }
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {}
}
// Ghi 1 sự kiện mới lên đầu danh sách (giữ tối đa 50)
function logEvent(roomId, text) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  events.unshift({ time, room: roomId, text });
  events = events.slice(0, 50);
  save();
}

const $app = document.getElementById("app");
const $top = document.getElementById("topbar");

// Chống chèn mã HTML khi hiển thị chữ người dùng nhập
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const makeId = (name) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).slice(2, 6);
const onlineCount = (r) => r.esps.filter((e) => e.online).length;
const roomName = (id) => rooms.find((r) => r.id === id)?.name || "Phòng đã xoá";
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

/* ---------- Biểu tượng (SVG vẽ tay) ---------- */
const svg = (d, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  chev: svg('<path d="M9 5l7 7-7 7"/>', 20),
  bell: svg('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  home: svg('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>', 18),
  wifi: svg('<path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/>', 16),
  sensor: svg('<rect x="6" y="3" width="12" height="18" rx="3"/><path d="M9 8a4 4 0 0 1 6 0M10.5 10.5a1.8 1.8 0 0 1 3 0"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/>', 24),
  devices: svg('<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="16" rx="2"/>'),
  train: svg('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/>'),
  qr: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M20 18v3"/>', 28),
  keyboard: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>', 28),
};

/* Đường sóng CSI: có người = sóng gợn chạy, không người = đường phẳng */
function wave(on, w = 72, h = 28, step = 20) {
  const mid = h / 2, amp = on ? h * 0.36 : 0;
  let d = `M0 ${mid}`;
  for (let x = 0; x < w + 2 * step; x += step) d += ` Q${x + step / 4} ${mid - amp} ${x + step / 2} ${mid} T${x + step} ${mid}`;
  return `<svg class="wave ${on ? "on" : ""}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
}

/* Thanh trên cùng: kiểu "trang chủ" (logo + chuông + nút +) hoặc kiểu "trang con" (nút quay lại + tiêu đề) */
function topHome() {
  $top.innerHTML = `
    <span class="home-badge">${I.home}</span>
    <h1>Nhà của tôi</h1>
    <button class="icon-btn" id="t-bell" aria-label="Sự kiện">${I.bell}${events.length ? '<span class="pip"></span>' : ""}</button>
    <button class="icon-btn" id="t-plus" aria-label="Thêm thiết bị hoặc phòng">${I.plus}</button>`;
  document.getElementById("t-bell").onclick = () => go("#/events");
  document.getElementById("t-plus").onclick = openMenu;
}
function topSub(title, backTo = "#/") {
  $top.innerHTML = `<button class="icon-btn" id="t-back" aria-label="Quay lại">${I.back}</button><h1>${esc(title)}</h1>`;
  document.getElementById("t-back").onclick = () => go(backTo);
}
const go = (hash) => { location.hash = hash; };

/* ---------- Bộ định tuyến ---------- */
function router() {
  stopCamera();
  const [, page, id, sub] = location.hash.split("/");
  const room = rooms.find((r) => r.id === id);
  if (page === "room" && room) sub === "train" ? renderTrain(room) : renderRoom(room);
  else if (page === "events") renderEvents();
  else if (page === "add") renderAdd(id);
  else renderHome();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", router);

/* ---------- Trang chủ ---------- */
function renderHome() {
  topHome();
  const busy = rooms.filter((r) => r.occupied).length;
  const total = rooms.reduce((n, r) => n + r.esps.length, 0);
  const on = rooms.reduce((n, r) => n + onlineCount(r), 0);
  $app.innerHTML = `
    <section class="summary" aria-label="Tóm tắt">
      <div class="hot"><b>${busy}</b><span>phòng có người</span></div>
      <div><b>${rooms.length}</b><span>phòng</span></div>
      <div class="ok"><b>${on}/${total}</b><span>thiết bị hoạt động</span></div>
    </section>

    <section class="panel">
      <button class="panel-head" id="ev-all"><span>Sự kiện gần đây</span>${I.chev}</button>
      ${eventList(events.slice(0, 3))}
    </section>

    ${rooms.map(roomCard).join("")}
    ${rooms.length ? `<p class="end">Hết danh sách</p>` : ""}
    <button class="add" id="add-room">${I.plus} Thêm phòng</button>
  `;
  document.getElementById("ev-all").onclick = () => go("#/events");
  document.getElementById("add-room").onclick = addRoom;
  $app.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => go(b.dataset.go));
}

function eventList(list) {
  if (!list.length) return `<p class="step-sub" style="padding:0 20px 16px">Chưa có sự kiện nào.</p>`;
  return `<ul class="events">${list.map((e) => `
    <li><time>${esc(e.time)}</time>
      <span class="ev-text"><span class="${/có người/i.test(e.text) ? "hot" : ""}">${esc(e.text)}</span><br><span class="ev-room">${esc(roomName(e.room))}</span></span></li>`).join("")}</ul>`;
}

// Thẻ phòng lớn: "màn hình sóng" + 3 nút thao tác bên dưới
function roomCard(r) {
  const last = events.find((e) => e.room === r.id);
  return `
  <article class="room-card">
    <button class="screen ${r.occupied ? "on" : ""}" data-go="#/room/${r.id}" aria-label="Mở ${esc(r.name)}">
      ${wave(r.occupied, 320, 70, 40)}
      <span class="s-name">${esc(r.name)}</span>
      <span class="s-icons">
        <span class="chip">${I.wifi} ${onlineCount(r)}/${r.esps.length}</span>
        ${r.training ? `<span class="chip">Đang train</span>` : ""}
      </span>
      <span class="s-event">${r.occupied ? "Có người" : "Không có người"}${last ? ` · ${esc(last.time)} ${esc(last.text)}` : ""}</span>
    </button>
    <div class="actions">
      <button data-go="#/room/${r.id}">${I.devices}Thiết bị</button>
      <button data-go="#/add/${r.id}">${I.plus}Thêm thiết bị</button>
      <button data-go="#/room/${r.id}/train">${I.train}Train</button>
    </div>
  </article>`;
}

/* ---------- Tất cả sự kiện ---------- */
function renderEvents() {
  topSub("Sự kiện");
  $app.innerHTML = `<section class="panel"><div style="padding-top:8px">${eventList(events)}</div></section>`;
}

/* ---------- Chi tiết phòng ---------- */
function renderRoom(room) {
  topSub(room.name);
  $app.innerHTML = `
    <article class="room-card">
      <div class="screen ${room.occupied ? "on" : ""}">
        ${wave(room.occupied, 320, 70, 40)}
        <span class="s-icons"><span class="chip">${I.wifi} ${onlineCount(room)}/${room.esps.length}</span></span>
      </div>
    </article>
    <div class="state-line">
      <p class="state ${room.occupied ? "on" : ""}">${room.occupied ? "Có người" : "Không có người"}</p>
      <small>${room.esps.length ? `${onlineCount(room)}/${room.esps.length} thiết bị đang đo` : "Chưa có thiết bị"}</small>
    </div>

    <h2 class="group-title">Thiết bị trong phòng</h2>
    ${room.esps.length ? `<ul class="list">${room.esps.map((e) => `
      <li class="dev">
        <span class="dev-icon ${e.online ? "on" : ""}">${I.sensor}<span class="dot"></span></span>
        <div class="info">
          <div class="name">${esc(e.name)}</div>
          <div class="status ${e.online ? "on" : e.reason === "battery" ? "bad" : ""}">${e.online ? "Đang hoạt động" : e.reason === "battery" ? "Hết pin, cần sạc hoặc thay pin" : "Mất kết nối"}</div>
          ${e.sn ? `<div class="meta">SN ${esc(e.sn)}${e.wifi ? `, WiFi ${esc(e.wifi)}` : ""}</div>` : ""}
          ${!e.online && e.reason !== "battery" ? `<button class="btn-reconnect" data-id="${e.id}">Kết nối lại</button>` : ""}
        </div>
        <button class="del" data-id="${e.id}" aria-label="Xoá ${esc(e.name)}">${I.x}</button>
      </li>`).join("")}</ul>`
      : `<div class="empty-note">Phòng này chưa có thiết bị. Thêm thiết bị để bắt đầu theo dõi.</div>`}
    <button class="add" id="add-dev">${I.plus} Thêm thiết bị</button>

    <div class="dock"><button class="solid" id="go-train">${room.training ? "Xem tiến độ train" : "Train"}</button></div>
  `;
  document.getElementById("go-train").onclick = () => go(`#/room/${room.id}/train`);
  document.getElementById("add-dev").onclick = () => go(`#/add/${room.id}`);
  $app.querySelectorAll(".btn-reconnect").forEach((b) => b.onclick = () => {
    b.disabled = true;
    b.textContent = "Đang kết nối...";
    // shortcut: giả lập luôn kết nối thành công sau 1.5s; có backend thì gọi API reconnect thật ở đây
    setTimeout(() => {
      const dev = room.esps.find((e) => e.id === b.dataset.id);
      if (dev) { dev.online = true; delete dev.reason; logEvent(room.id, `${dev.name} đã kết nối lại`); }
      if (location.hash === `#/room/${room.id}`) renderRoom(room);
    }, 1500);
  });
  $app.querySelectorAll(".del").forEach((b) => b.onclick = () => {
    const dev = room.esps.find((e) => e.id === b.dataset.id);
    if (!dev || !confirm(`Xoá "${dev.name}" khỏi ${room.name}?`)) return;
    room.esps = room.esps.filter((e) => e !== dev);
    logEvent(room.id, `Đã gỡ ${dev.name}`);
    renderRoom(room);
  });
}

/* ==========================================================
   THÊM THIẾT BỊ — 4 bước:
   1. Chọn cách: quét QR trên thiết bị / nhập mã thủ công
   2. Thông tin thiết bị: model, số seri, đặt tên, chọn phòng
   3. WiFi: thiết bị phải vào CHUNG mạng với bộ trung tâm (Raspberry Pi)
   4. Kết nối: gửi WiFi -> thiết bị lên mạng -> tìm bộ trung tâm -> thử gửi/nhận dữ liệu
   ========================================================== */
let draft = null;      // thiết bị đang thêm dở
let camStream = null;  // camera đang mở để quét QR

function renderAdd(roomId) {
  draft = { roomId: rooms.some((r) => r.id === roomId) ? roomId : rooms[0]?.id, wifi: HUB.wifi };
  if (!rooms.length) { topSub("Thêm thiết bị"); $app.innerHTML = `<div class="empty-note">Tạo một phòng trước rồi mới thêm thiết bị nha.</div><button class="add" id="ar">${I.plus} Thêm phòng</button>`; document.getElementById("ar").onclick = addRoom; return; }
  stepMethod();
}
const stepBar = (n) => `<div class="steps" aria-label="Bước ${n}/4">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? "done" : ""}"></i>`).join("")}</div>`;
const backTo = () => draft.roomId ? `#/room/${draft.roomId}` : "#/";

// Bước 1: chọn cách thêm
function stepMethod() {
  topSub("Thêm thiết bị", backTo());
  $app.innerHTML = `
    ${stepBar(1)}
    <h2 class="step-title">Bạn muốn thêm bằng cách nào?</h2>
    <p class="step-sub">Mã QR và số seri (SN) in trên nhãn dưới đáy thiết bị.</p>
    <button class="method" id="m-qr"><span class="m-icon">${I.qr}</span><span><b>Quét mã QR</b><small>Dùng camera điện thoại quét mã trên thiết bị</small></span></button>
    <button class="method" id="m-manual"><span class="m-icon">${I.keyboard}</span><span><b>Nhập mã thủ công</b><small>Gõ số seri in trên nhãn thiết bị</small></span></button>
  `;
  document.getElementById("m-qr").onclick = stepScan;
  document.getElementById("m-manual").onclick = () => stepManual();
}

// Bước 1a: quét QR bằng camera (BarcodeDetector có trên Chrome Android; iPhone chưa hỗ trợ -> nhập tay)
async function stepScan() {
  topSub("Quét mã QR", backTo());
  $app.innerHTML = `
    ${stepBar(1)}
    <h2 class="step-title">Đưa mã QR vào khung</h2>
    <div class="scanner"><video id="cam" playsinline muted></video><div class="frame"></div><div class="laser"></div><div class="msg" id="cam-msg" hidden></div></div>
    <button class="linkish" id="to-manual">Không quét được? Nhập mã thủ công</button>
  `;
  document.getElementById("to-manual").onclick = () => { stopCamera(); stepManual(); };
  const msg = (t) => { const m = document.getElementById("cam-msg"); if (m) { m.hidden = false; m.textContent = t; } };
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
    return msg("Trình duyệt này chưa hỗ trợ quét QR. Bấm \"Nhập mã thủ công\" bên dưới nha.");
  }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = document.getElementById("cam");
    if (!video) return stopCamera();
    video.srcObject = camStream; await video.play();
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    while (camStream) {
      const codes = await detector.detect(video).catch(() => []);
      if (codes.length) {
        const info = parseCode(codes[0].rawValue);
        stopCamera();
        if (info) return stepInfo(info);
        return stepManual("Mã QR này không phải của thiết bị CSI.");
      }
      await sleep(300);
    }
  } catch {
    msg("Không mở được camera. Hãy cho phép camera trong trình duyệt, hoặc nhập mã thủ công.");
  }
}
function stopCamera() { camStream?.getTracks().forEach((t) => t.stop()); camStream = null; }

// Đọc nội dung mã QR / mã nhập tay -> { sn, model } hoặc null nếu sai
function parseCode(raw) {
  const text = String(raw).trim();
  const sn = (text.match(/SN=([A-Za-z0-9]+)/)?.[1] || text).toUpperCase().replace(/[\s-]/g, "");
  if (!/^CS[A-Z0-9]{4,}$/.test(sn)) return null;
  const model = text.match(/MODEL=([^|]+)/)?.[1]?.trim() || "Cảm biến CSI S1";
  return { sn, model };
}

// Bước 1b: nhập số seri
function stepManual(error = "") {
  topSub("Nhập mã thủ công", backTo());
  $app.innerHTML = `
    ${stepBar(1)}
    <h2 class="step-title">Nhập số seri thiết bị</h2>
    <form class="form" id="f-sn" novalidate>
      <div class="field">
        <label for="sn">Số seri (SN)</label>
        <input id="sn" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next" placeholder="Ví dụ: CS7F21B9">
        <span class="hint">Bắt đầu bằng CS, in trên nhãn dưới đáy thiết bị.</span>
        <span class="err" id="sn-err" role="alert">${esc(error)}</span>
      </div>
      <button class="solid">Tiếp tục</button>
    </form>
  `;
  const input = document.getElementById("sn");
  input.focus();
  document.getElementById("f-sn").onsubmit = (ev) => {
    ev.preventDefault();
    const info = parseCode(input.value);
    if (!info) { document.getElementById("sn-err").textContent = "Số seri không đúng. Kiểm tra lại mã trên nhãn (bắt đầu bằng CS)."; return; }
    stepInfo(info);
  };
}

// Bước 2: thông tin thiết bị + đặt tên + chọn phòng
async function stepInfo(info) {
  const owner = rooms.find((r) => r.esps.some((e) => e.sn === info.sn));
  if (owner) return stepManual(`Thiết bị ${info.sn} đã có trong ${owner.name}.`);
  Object.assign(draft, info);
  topSub("Thông tin thiết bị", backTo());
  $app.innerHTML = `
    ${stepBar(2)}
    <h2 class="step-title">Đã tìm thấy thiết bị</h2>
    <div class="found">
      <span class="dev-icon">${I.sensor}</span>
      <dl><dt>Loại</dt><dd>${esc(info.model)}</dd><dt>Số seri</dt><dd>${esc(info.sn)}</dd></dl>
    </div>
    <form class="form" id="f-info" novalidate>
      <div class="field">
        <label for="dname">Tên thiết bị</label>
        <input id="dname" autocomplete="off" enterkeyhint="next" value="Cảm biến ${(rooms.find((r) => r.id === draft.roomId)?.esps.length || 0) + 1}">
        <span class="hint">Đặt theo vị trí cho dễ nhớ, vd: Cảm biến cửa sổ.</span>
        <span class="err" id="name-err" role="alert"></span>
      </div>
      <div class="field">
        <label for="droom">Đặt ở phòng</label>
        <select id="droom">${rooms.map((r) => `<option value="${r.id}" ${r.id === draft.roomId ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>
      </div>
      <button class="solid">Tiếp tục</button>
    </form>
  `;
  document.getElementById("f-info").onsubmit = (ev) => {
    ev.preventDefault();
    const name = document.getElementById("dname").value.trim();
    if (!name) { document.getElementById("name-err").textContent = "Đặt tên cho thiết bị nha."; return; }
    draft.name = name;
    draft.roomId = document.getElementById("droom").value;
    stepWifi();
  };
}

// Bước 3: WiFi chung với bộ trung tâm
function stepWifi(error = "") {
  topSub("Kết nối WiFi", backTo());
  $app.innerHTML = `
    ${stepBar(3)}
    <h2 class="step-title">Cho thiết bị vào WiFi</h2>
    <p class="step-sub">Thiết bị cần dùng <b>chung mạng WiFi</b> với ${esc(HUB.name)} (Raspberry Pi) để gửi và nhận dữ liệu. Chỉ hỗ trợ WiFi 2.4 GHz.</p>
    <form class="form" id="f-wifi" novalidate>
      <div class="field">
        <label for="ssid">Tên WiFi</label>
        <input id="ssid" autocomplete="off" enterkeyhint="next" value="${esc(draft.wifi)}">
        <span class="hint">Bộ trung tâm đang dùng mạng "${esc(HUB.wifi)}".</span>
      </div>
      <div class="field">
        <label for="pass">Mật khẩu WiFi</label>
        <div class="pass-wrap"><input id="pass" type="password" autocomplete="off" enterkeyhint="go"><button type="button" id="peek">Hiện</button></div>
        <span class="err" id="wifi-err" role="alert">${esc(error)}</span>
      </div>
      <button class="solid">Kết nối</button>
    </form>
  `;
  const pass = document.getElementById("pass");
  document.getElementById("peek").onclick = (ev) => {
    pass.type = pass.type === "password" ? "text" : "password";
    ev.target.textContent = pass.type === "password" ? "Hiện" : "Ẩn";
  };
  document.getElementById("f-wifi").onsubmit = (ev) => {
    ev.preventDefault();
    const ssid = document.getElementById("ssid").value.trim();
    const err = document.getElementById("wifi-err");
    if (!ssid) return err.textContent = "Nhập tên WiFi.";
    if (pass.value.length < 8) return err.textContent = "Mật khẩu WiFi phải có ít nhất 8 ký tự.";
    draft.wifi = ssid;
    stepConnect(pass.value);
  };
}

// Bước 4: tiến trình kết nối (giả lập từng bước; có backend thì thay mỗi sleep bằng lệnh gọi thật)
async function stepConnect(password) {
  topSub("Đang kết nối", backTo());
  const steps = [
    "Gửi thông tin WiFi tới thiết bị",
    `Thiết bị vào mạng "${draft.wifi}"`,
    `Tìm ${HUB.name} (${HUB.ip})`,
    "Thử gửi và nhận dữ liệu",
  ];
  $app.innerHTML = `
    ${stepBar(4)}
    <h2 class="step-title">Đang kết nối thiết bị</h2>
    <p class="step-sub">Để thiết bị gần bộ phát WiFi và đừng tắt trang này.</p>
    <ol class="progress-list">${steps.map((s, i) => `<li id="ps${i}"><span class="mark">${i + 1}</span>${esc(s)}</li>`).join("")}</ol>
    <div id="cx-result"></div>
  `;
  const here = location.hash;
  for (let i = 0; i < steps.length; i++) {
    const li = document.getElementById(`ps${i}`);
    if (!li) return; // người dùng đã rời trang
    li.className = "doing";
    await sleep(1100);
    if (location.hash !== here) return;
    // shortcut: giả lập; khác mạng Pi thì bước tìm bộ trung tâm báo lỗi
    if (i === 2 && draft.wifi !== HUB.wifi) {
      li.className = "fail"; li.querySelector(".mark").textContent = "!";
      document.getElementById("cx-result").innerHTML = `
        <div class="result"><p><b style="color:var(--danger)">Không tìm thấy bộ trung tâm.</b><br>Thiết bị đang ở mạng "${esc(draft.wifi)}" còn bộ trung tâm ở mạng "${esc(HUB.wifi)}". Chọn đúng mạng rồi thử lại.</p>
        <button class="solid wide" id="retry">Đổi WiFi</button></div>`;
      document.getElementById("retry").onclick = () => stepWifi();
      return;
    }
    li.className = "done"; li.querySelector(".mark").textContent = "✓";
  }
  const room = rooms.find((r) => r.id === draft.roomId);
  room.esps.push({ id: makeId(draft.name), name: draft.name, sn: draft.sn, model: draft.model, wifi: draft.wifi, online: true });
  logEvent(room.id, `Đã thêm ${draft.name}`);
  document.getElementById("cx-result").innerHTML = `
    <div class="result"><span class="big-check">✓</span><h2 class="step-title">Thêm thành công</h2>
    <p>${esc(draft.name)} đã ở ${esc(room.name)} và đang gửi dữ liệu về bộ trung tâm.</p>
    <button class="solid wide" id="done">Xem phòng</button></div>`;
  document.getElementById("done").onclick = () => go(`#/room/${room.id}`);
}

/* ---------- Train ---------- */
let trainTimer = null;
function renderTrain(room) {
  topSub(`Train ${room.name}`, `#/room/${room.id}`);
  const on = room.training, progress = room.progress || 0;
  const C = 2 * Math.PI * 80;
  $app.innerHTML = `
    <section class="train">
      <div class="ring ${on ? "" : "idle"}">
        <svg viewBox="0 0 180 180" aria-hidden="true"><circle class="track" cx="90" cy="90" r="80"/><circle class="bar" cx="90" cy="90" r="80" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - progress / 100)}"/></svg>
        <div class="pct">${on ? `${progress}%` : "Chưa chạy"}</div>
      </div>
      <p class="big ${on ? "on" : ""}">${on ? "Đang train" : "Không train"}</p>
      <p class="sub">${on ? `${onlineCount(room)} thiết bị đang lấy dữ liệu sóng trong phòng`
        : room.esps.length ? "Bấm Bắt đầu train để các thiết bị lấy dữ liệu và train" : "Phòng chưa có thiết bị, thêm thiết bị trước nha"}</p>
    </section>
    <div class="dock"><button class="solid" id="toggle" ${room.esps.length ? "" : "disabled"}>${on ? "Dừng train" : "Bắt đầu train"}</button></div>
  `;
  document.getElementById("toggle").onclick = () => {
    room.training = !room.training; room.progress = 0;
    logEvent(room.id, room.training ? "Bắt đầu train" : "Dừng train");
    renderTrain(room);
  };
  // Giả lập: mỗi giây +5%, đủ 100% thì tự dừng. Sau này thay bằng gọi API thật.
  clearInterval(trainTimer);
  if (on) trainTimer = setInterval(() => {
    room.progress = Math.min(100, (room.progress || 0) + 5);
    if (room.progress >= 100) { room.training = false; logEvent(room.id, "Train xong"); clearInterval(trainTimer); }
    save();
    if (location.hash.endsWith(`${room.id}/train`)) renderTrain(room);
  }, 1000);
}

/* ---------- Thêm phòng, menu nút + ---------- */
function addRoom() {
  ask("Thêm phòng", "Tên phòng, vd: Phòng bếp", (name) => {
    const r = { id: makeId(name), name, occupied: false, training: false, esps: [] };
    rooms.push(r);
    logEvent(r.id, "Đã tạo phòng");
    router();
  });
}
function openMenu() {
  const m = document.getElementById("menu");
  m.onclose = () => { if (m.returnValue === "device") go("#/add"); if (m.returnValue === "room") addRoom(); };
  m.returnValue = ""; m.showModal();
}
function ask(title, placeholder, onOk, value = "") {
  const dlg = document.getElementById("dlg"), input = document.getElementById("dlg-input");
  document.getElementById("dlg-title").textContent = title;
  input.placeholder = placeholder; input.value = value;
  dlg.onclose = () => { if (dlg.returnValue === "ok" && input.value.trim()) onOk(input.value.trim()); };
  dlg.showModal(); input.select();
}

/* Tự kiểm tra nhỏ cho bộ đọc mã (xem trong Console F12 nếu sai) */
console.assert(parseCode("CSI|SN=cs7f21b9|MODEL=Cảm biến CSI S1")?.sn === "CS7F21B9", "parseCode QR");
console.assert(parseCode("abc") === null, "parseCode sai mã");

router();
