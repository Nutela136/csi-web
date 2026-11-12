/* ==========================================================
   APP CSI — chỉ frontend.
   3 màn hình, đổi qua địa chỉ (hash) trên thanh URL:
     #/                 -> Trang chủ: danh sách phòng
     #/room/<id>        -> Chi tiết phòng: danh sách ESP + nút Train
     #/room/<id>/train  -> Trạng thái train
   ========================================================== */
 
const STORAGE_KEY = "csi-web-rooms";
 
// Lấy dữ liệu: ưu tiên bản đã lưu trong trình duyệt, không có thì dùng MOCK_ROOMS (data.js)
let rooms = load();
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(MOCK_ROOMS); }
  catch { return structuredClone(MOCK_ROOMS); }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms)); } catch {}
}
 
const $app = document.getElementById("app");
const $title = document.getElementById("title");
const $back = document.getElementById("back");
 
// Chống chèn mã HTML khi hiển thị tên do người dùng nhập
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// Tạo id từ tên, vd "Phòng khách" -> "phong-khach-x1y2"
const makeId = (name) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).slice(2, 6);
 
/* ---------- Bộ định tuyến: đọc hash rồi vẽ màn hình tương ứng ---------- */
function router() {
  const [, page, id, sub] = location.hash.split("/");
  const room = rooms.find((r) => r.id === id);
  if (page === "room" && room) sub === "train" ? renderTrain(room) : renderRoom(room);
  else renderHome();
}
window.addEventListener("hashchange", router);
$back.onclick = () => history.length > 1 ? history.back() : (location.hash = "#/");
 
/* ---------- Màn hình 1: Trang chủ ---------- */
function renderHome() {
  $title.textContent = "CSI";
  $back.hidden = true;
  $app.innerHTML = `
    <p class="section-label">Các phòng đang dùng CSI</p>
    ${rooms.length ? "" : `<p class="empty">Chưa có phòng nào</p>`}
    ${rooms.map((r) => `
      <button class="card" onclick="location.hash='#/room/${r.id}'">
        <div class="info">
          <div class="name">${esc(r.name)}</div>
          <div class="meta">${r.esps.length} ESP · ${r.esps.filter((e) => e.online).length} đang hoạt động</div>
        </div>
        <span class="badge ${r.occupied ? "on" : ""}">${r.occupied ? "Có người" : "Không có người"}</span>
      </button>`).join("")}
    <button class="btn-add" id="add-room">+ Thêm phòng</button>
  `;
  document.getElementById("add-room").onclick = () =>
    ask("Thêm phòng", "Tên phòng, vd: Phòng bếp", (name) => {
      rooms.push({ id: makeId(name), name, occupied: false, training: false, esps: [] });
      save(); renderHome();
    });
}
 
/* ---------- Màn hình 2: Chi tiết phòng ---------- */
function renderRoom(room) {
  $title.textContent = room.name;
  $back.hidden = false;
  $app.innerHTML = `
    <button class="btn-add" id="add-esp">+ Thêm ESP</button>
    <p class="section-label">Thiết bị ESP (${room.esps.length})</p>
    ${room.esps.length ? "" : `<p class="empty">Phòng này chưa có ESP nào.<br>Bấm "+ Thêm ESP" để thêm.</p>`}
    ${room.esps.map((e) => `
      <div class="card">
        <div class="info">
          <div class="name">${esc(e.name)}</div>
          ${e.online ? "" : `<div class="meta">${e.reason === "battery" ? "🔋 Hết pin, cần sạc/thay pin" : "📡 Mất kết nối"}</div>`}
          ${!e.online && e.reason !== "battery" ? `<button class="btn-reconnect" data-id="${e.id}">↻ Kết nối lại</button>` : ""}
        </div>
        <span class="badge ${e.online ? "on" : ""}">${e.online ? "Đang hoạt động" : "Không hoạt động"}</span>
        <button class="del" data-id="${e.id}" aria-label="Xoá ${esc(e.name)}">✕</button>
      </div>`).join("")}
    <button class="primary btn-train" onclick="location.hash='#/room/${room.id}/train'">Train</button>
  `;
  document.getElementById("add-esp").onclick = () =>
    ask("Thêm ESP", `ESP${room.esps.length + 1}`, (name) => {
      // shortcut: ESP mới cho "đang hoạt động" luôn; khi có backend thì lấy trạng thái thật
      room.esps.push({ id: makeId(name), name, online: true });
      save(); renderRoom(room);
    }, `ESP${room.esps.length + 1}`);
  // Nút "Kết nối lại" cho ESP bị mất kết nối
  $app.querySelectorAll(".btn-reconnect").forEach((b) => b.onclick = () => {
    b.disabled = true;
    b.textContent = "Đang kết nối...";
    // shortcut: giả lập luôn kết nối thành công sau 1.5s; có backend thì gọi API reconnect thật ở đây
    setTimeout(() => {
      const esp = room.esps.find((e) => e.id === b.dataset.id);
      if (esp) { esp.online = true; delete esp.reason; save(); }
      if (location.hash === `#/room/${room.id}`) renderRoom(room);
    }, 1500);
  });
  $app.querySelectorAll(".del").forEach((b) => b.onclick = () => {
    room.esps = room.esps.filter((e) => e.id !== b.dataset.id);
    save(); renderRoom(room);
  });
}
 
/* ---------- Màn hình 3: Train ---------- */
let trainTimer = null; // giả lập tiến độ train
function renderTrain(room) {
  $title.textContent = `Train · ${room.name}`;
  $back.hidden = false;
  const on = room.training;
  const progress = room.progress || 0;
  $app.innerHTML = `
    <div class="card train-status">
      ${on ? `<div class="spinner"></div>` : ""}
      <div class="big">${on ? "Đang train" : "Không train"}</div>
      <span class="badge ${on ? "on" : ""}">${on ? "Đang train" : "Không train"}</span>
      ${on ? `<div class="progress"><div style="width:${progress}%"></div></div>
              <div class="meta">${progress}% · ${room.esps.filter((e) => e.online).length} ESP đang lấy dữ liệu</div>`
           : `<div class="meta">${room.esps.length ? "Bấm Bắt đầu để các ESP lấy dữ liệu và train" : "Phòng chưa có ESP, thêm ESP trước nha"}</div>`}
    </div>
    <button class="primary btn-train" id="toggle" ${room.esps.length ? "" : "disabled"}>
      ${on ? "Dừng train" : "Bắt đầu train"}
    </button>
  `;
  document.getElementById("toggle").onclick = () => {
    room.training = !room.training;
    room.progress = 0;
    save(); renderTrain(room);
  };
 
  // Giả lập: mỗi giây tăng 5%, đủ 100% thì tự dừng. Sau này thay bằng gọi API thật.
  clearInterval(trainTimer);
  if (on) trainTimer = setInterval(() => {
    room.progress = Math.min(100, (room.progress || 0) + 5);
    if (room.progress >= 100) room.training = false;
    save();
    if (location.hash.endsWith(`${room.id}/train`)) renderTrain(room);
    else if (!room.training) clearInterval(trainTimer);
  }, 1000);
}
 
/* ---------- Hộp thoại nhập tên ---------- */
function ask(title, placeholder, onOk, value = "") {
  const dlg = document.getElementById("dlg");
  const input = document.getElementById("dlg-input");
  document.getElementById("dlg-title").textContent = title;
  input.placeholder = placeholder;
  input.value = value;
  dlg.onclose = () => { if (dlg.returnValue === "ok" && input.value.trim()) onOk(input.value.trim()); };
  dlg.showModal();
  input.select();
}
 
router();
 