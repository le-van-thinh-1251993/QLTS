# QLTS Web

QLTS Web là ứng dụng quản lý tài sản nội bộ chạy dạng static web, phục vụ các chức năng cơ bản như quản lý người dùng, tài sản, giấy phép và sơ đồ vị trí.

## Yêu cầu môi trường

- Node.js 14 trở lên
- npm (đi kèm Node.js)

## Chạy dự án ở máy local

1. Cài dependencies (nếu có):
   - `npm install`
2. Chạy server local:
   - `npm start`
3. Mở trình duyệt tại:
   - `http://localhost:9000`

Ghi chú:
- Port mặc định là `9000`.
- Có thể đổi port bằng biến môi trường `PORT`.

## Scripts chính

- `npm start`: chạy server local qua `serve.js`
- `npm run serve`: tương tự `npm start`
- `npm run build`: chạy script build cấu hình (`build-config.js`)

## Cấu trúc thư mục chính

- `index.html`: trang chính
- `users.html`: quản lý người dùng
- `assets.html`: quản lý tài sản
- `licenses.html`: quản lý giấy phép
- `settings.html`: cài đặt hệ thống
- `seating.html`: sơ đồ vị trí
- `js/`: mã JavaScript client
- `css/`: stylesheet
- `serve.js`: web server local đơn giản

## Triển khai nhanh trên Vercel

Project đã có sẵn file cấu hình:
- `vercel.json`
- `VERCEL_SETUP.md`

Các bước cơ bản:
1. Push source code lên GitHub.
2. Import repository vào Vercel.
3. Deploy theo cấu hình mặc định.

## Lưu ý

- Không commit thông tin nhạy cảm (file `config.js` chứa key Supabase đã được `.gitignore`).
