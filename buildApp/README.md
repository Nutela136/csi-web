# CSI web (frontend)

Mở `index.html` bằng trình duyệt là chạy, không cần cài gì.

| File | Sửa gì |
|---|---|
| `data.js` | Dữ liệu mẫu: phòng, ESP, có người hay không |
| `style.css` | Màu sắc (đầu file, phần `:root`), bo góc, font |
| `app.js` | 3 màn hình: `renderHome`, `renderRoom`, `renderTrain` |
| `index.html` | Khung trang (thanh tiêu đề, hộp thoại) |

Lưu ý: phòng/ESP thêm vào được lưu trong trình duyệt (localStorage).
Sửa `data.js` mà không thấy đổi thì mở DevTools (F12) > Console gõ
`localStorage.clear()` rồi tải lại trang.

Train hiện chỉ là giả lập (mỗi giây +5%). Khi có backend, thay phần
`setInterval` trong `renderTrain` bằng gọi API thật.
