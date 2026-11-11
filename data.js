/* ==========================================================
   DỮ LIỆU MẪU (mock data)
   Sửa thoải mái ở đây: thêm/xoá phòng, đổi tên, đổi ESP.
   - occupied: true = có người, false = không có người
   - online:   true = ESP đang hoạt động, false = không hoạt động
   - training: true = phòng đang train
   Sau này có backend thì thay phần này bằng dữ liệu lấy từ API.
   ========================================================== */
const MOCK_ROOMS = [
  {
    id: "phong-khach",
    name: "Phòng khách",
    occupied: false,
    training: false,
    esps: [] // chưa có ESP nào, giống bản phác thảo
  },
  {
    id: "phong-ngu",
    name: "Phòng ngủ",
    occupied: true,
    training: false,
    esps: [
      { id: "esp1", name: "ESP1", online: true },
      { id: "esp2", name: "ESP2", online: false }
    ]
  }
];
 