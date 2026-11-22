# Bài giảng Siêu âm — Vật lí 12

- **Trang trình chiếu chính:** [index.html](index.html) (`39` slide · `45` phút · mô phỏng vật lí tương tác & 15 câu hỏi củng cố).
- **Trang người thuyết trình (mobile / 2 màn hình):** [speaker.html](speaker.html) — hiển thị gọn ghi chú thuyết trình, công thức và đáp án câu hỏi; nhấn phím `S` trên bài chiếu chính để mở cửa sổ người nói đồng bộ hai chiều.
- **Deploy tĩnh:** Cloudflare Pages / Vercel phục vụ trực tiếp từ thư mục gốc `.` (đã cấu hình sẵn `Referrer-Policy: strict-origin-when-cross-origin` trong `<head>`, `_headers` và `vercel.json` để video YouTube nhúng hoạt động bình thường trên HTTPS).

## Mã nguồn (`sieu-am-src/`)

Thành viên trong nhóm có thể xem trực tiếp hoặc bấm **Code → Download ZIP** để tải toàn bộ dự án:

- `sieu-am-src/slides/` — Nội dung 39 slide chia theo 7 phần (`01-intro.html` → `07-summary-quiz.html`).
- `sieu-am-src/styles/` — Biến màu (`tokens.css`), bố cục slide (`layout.css`), giao diện mô phỏng (`labs.css`) và trang người thuyết trình (`speaker.css`).
- `sieu-am-src/scripts/` — Điều hướng & đồng bộ (`core.js`), mô phỏng tương tác (`labs-part1.js`, `labs-part2.js`), trắc nghiệm (`quiz.js`) và trang người nói (`speaker.js`).
- `sieu-am-src/assets/` — Ảnh và video minh hoạ nhúng vào bản build.
- `sieu-am-src/build.mjs` — Script gộp mã nguồn thành 2 file chạy độc lập `index.html` và `speaker.html`.

### Build lại sau khi chỉnh sửa

Yêu cầu Node.js (không cần cài thêm package ngoài):

```bash
node sieu-am-src/build.mjs
```
