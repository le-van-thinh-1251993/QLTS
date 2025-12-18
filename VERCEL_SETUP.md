# Hướng dẫn cấu hình Vercel cho Supabase

## ⚠️ QUAN TRỌNG: Cần thêm Environment Variables trên Vercel

File `config.js` không được commit lên Git (đã có trong `.gitignore`) vì chứa thông tin nhạy cảm. 
Thay vào đó, Vercel sẽ tự động tạo file này từ Environment Variables trong quá trình build.

## 📋 Các bước cấu hình:

### 1. Thêm Environment Variables trên Vercel

1. **Đăng nhập Vercel:**
   - Vào: https://vercel.com/dashboard
   - Đăng nhập vào tài khoản của bạn

2. **Chọn Project:**
   - Tìm và click vào project `QLTS` (hoặc tên project của bạn)

3. **Vào Settings:**
   - Click tab **Settings** ở trên cùng
   - Click **Environment Variables** ở menu bên trái

4. **Thêm 2 biến mới:**

   **Biến 1:**
   - **Name:** `SUPABASE_URL`
   - **Value:** `https://gamfrcokkpygwjcwnxuf.supabase.co`
   - **Environment:** Chọn tất cả (Production, Preview, Development)

   **Biến 2:**
   - **Name:** `SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbWZyY29ra3B5Z3dqY3dueHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMzkzMjMsImV4cCI6MjA3OTcxNTMyM30.5hWKHgnY8xmcWCAgfwzJpOPz17-xojYGXB_KnW90R9Y`
   - **Environment:** Chọn tất cả (Production, Preview, Development)

5. **Save:**
   - Click nút **Save** để lưu các biến

### 2. Redeploy Project

Sau khi thêm Environment Variables:

1. Vào tab **Deployments**
2. Tìm deployment mới nhất (có thể đang failed)
3. Click vào 3 chấm (⋯) bên cạnh deployment
4. Chọn **Redeploy**
5. Hoặc đơn giản hơn: Push một commit mới lên Git, Vercel sẽ tự động deploy lại

### 3. Kiểm tra Build Logs

Sau khi redeploy, kiểm tra build logs:
- Nếu thấy: `✅ config.js đã được tạo thành công` → Thành công!
- Nếu vẫn lỗi: Kiểm tra lại xem đã thêm đúng tên biến chưa (phải viết hoa đúng: `SUPABASE_URL` và `SUPABASE_ANON_KEY`)

## 🔍 Troubleshooting

### Lỗi: "SUPABASE_URL and SUPABASE_ANON_KEY must be set"
- **Nguyên nhân:** Chưa thêm Environment Variables trên Vercel
- **Giải pháp:** Làm theo bước 1 ở trên

### Lỗi: "config.js not found" khi chạy app
- **Nguyên nhân:** Build script không chạy hoặc fail
- **Giải pháp:** Kiểm tra build logs trên Vercel, đảm bảo script `build-config.js` chạy thành công

### App chạy nhưng không kết nối được Supabase
- **Nguyên nhân:** Giá trị Environment Variables sai
- **Giải pháp:** Kiểm tra lại giá trị trong Vercel Settings → Environment Variables

## 📝 Lưu ý

- Environment Variables chỉ có sẵn trong quá trình **build**, không có trong runtime
- File `config.js` được tạo **trong quá trình build** và được deploy cùng với code
- Không commit file `config.js` lên Git (đã có trong `.gitignore`)
- Mỗi khi thay đổi Environment Variables, cần **Redeploy** để áp dụng thay đổi

