/* ==========================================================
   DỮ LIỆU MẪU (mock data) — sửa thoải mái ở đây.
   Sau này có backend (Raspberry Pi) thì thay bằng dữ liệu lấy từ API.
   ========================================================== */

/* Bộ trung tâm (Raspberry Pi). Thiết bị cảm biến phải vào CHUNG mạng WiFi
   này thì mới gửi/nhận dữ liệu với Pi được. */
const HUB = {
  name: "Bộ trung tâm CSI",
  wifi: "CSI-Home",          // tên WiFi mà Pi đang dùng (gợi ý sẵn khi thêm thiết bị)
  ip: "192.168.1.10"
};

/* Mã QR dán trên mỗi thiết bị có dạng:
     CSI|SN=CS1A2B3C|MODEL=Cảm biến CSI S1
   Hoặc chỉ là số seri, vd: CS1A2B3C
   Số seri (SN) = "CS" + ít nhất 4 chữ/số. */

/* Phòng:
   - occupied: true = có người, false = không có người
   - esps: danh sách thiết bị cảm biến (giữ tên "esps" cho khớp dữ liệu cũ đã lưu)
       online: true = đang hoạt động
       reason: "disconnect" = mất kết nối (có nút Kết nối lại), "battery" = hết pin
   - training: true = đang train */
const MOCK_ROOMS = [
  {
    id: "phong-khach",
    name: "Phòng khách",
    occupied: false,
    training: false,
    esps: []
  },
  {
    id: "phong-ngu",
    name: "Phòng ngủ",
    occupied: true,
    training: false,
    esps: [
      { id: "d1", name: "Cảm biến cửa sổ", sn: "CS7F21A0", model: "Cảm biến CSI S1", wifi: "CSI-Home", online: true },
      { id: "d2", name: "Cảm biến đầu giường", sn: "CS7F21A1", model: "Cảm biến CSI S1", wifi: "CSI-Home", online: false, reason: "disconnect" },
      { id: "d3", name: "Cảm biến góc tủ", sn: "CS7F21A2", model: "Cảm biến CSI S1", wifi: "CSI-Home", online: false, reason: "battery" }
    ]
  }
];

/* Sự kiện mẫu hiện ở mục "Sự kiện gần đây" (time = giờ:phút) */
const MOCK_EVENTS = [
  { time: "07:39", room: "phong-ngu", text: "Phát hiện có người" },
  { time: "06:12", room: "phong-khach", text: "Phòng trống" },
  { time: "22:05", room: "phong-ngu", text: "Cảm biến góc tủ hết pin" }
];
