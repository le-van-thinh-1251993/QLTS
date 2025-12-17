// Script để tạo file config.js từ environment variables khi build trên Vercel
// File này sẽ được chạy trong quá trình build

const fs = require('fs');
const path = require('path');

// Lấy environment variables từ Vercel
// Vercel tự động expose tất cả env vars qua process.env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('');
  console.error('❌ ============================================');
  console.error('❌ LỖI: Thiếu Environment Variables trên Vercel');
  console.error('❌ ============================================');
  console.error('');
  console.error('📋 Vui lòng thêm các biến sau vào Vercel:');
  console.error('');
  console.error('   1. Vào: https://vercel.com/dashboard');
  console.error('   2. Chọn project của bạn');
  console.error('   3. Vào: Settings → Environment Variables');
  console.error('   4. Thêm 2 biến:');
  console.error('');
  console.error('      SUPABASE_URL = https://gamfrcokkpygwjcwnxuf.supabase.co');
  console.error('      SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.error('');
  console.error('   5. Chọn môi trường: Production, Preview, Development');
  console.error('   6. Click Save và Redeploy');
  console.error('');
  console.error('❌ ============================================');
  process.exit(1);
}

// Nội dung file config.js
const configContent = `// File cấu hình Supabase - Tự động tạo từ environment variables
// File này được tạo tự động trong quá trình build trên Vercel
// DO NOT COMMIT THIS FILE - Nó được tạo tự động từ env vars

window.__APP_CONFIG__ = {
  SUPABASE_URL: '${SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}'
};
`;

// Ghi file config.js
const configPath = path.join(__dirname, 'config.js');
try {
    fs.writeFileSync(configPath, configContent, 'utf8');
    console.log('✅ config.js đã được tạo thành công từ environment variables');
    console.log(`   SUPABASE_URL: ${SUPABASE_URL.substring(0, 30)}...`);
    console.log(`   File location: ${configPath}`);
} catch (error) {
    console.error('❌ Lỗi khi ghi file config.js:', error.message);
    process.exit(1);
}
