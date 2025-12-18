// Script để tạo file config.js từ environment variables khi build trên Vercel
// File này sẽ được chạy trong quá trình build

const fs = require('fs');
const path = require('path');

// Lấy environment variables từ Vercel
// Vercel tự động expose tất cả env vars qua process.env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Xử lý trường hợp thiếu Environment Variables
// Luôn tạo file config.js để tránh lỗi 404
// Nếu không có env vars, tạo placeholder; nếu có, tạo với giá trị thật
const configPath = path.join(__dirname, 'config.js');
let configContent = '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('');
  console.warn('⚠️  ============================================');
  console.warn('⚠️  CẢNH BÁO: Thiếu Environment Variables trên Vercel');
  console.warn('⚠️  ============================================');
  console.warn('');
  console.warn('📋 Vui lòng thêm các biến sau vào Vercel:');
  console.warn('');
  console.warn('   1. Vào: https://vercel.com/dashboard');
  console.warn('   2. Chọn project của bạn');
  console.warn('   3. Vào: Settings → Environment Variables');
  console.warn('   4. Thêm 2 biến:');
  console.warn('');
  console.warn('      SUPABASE_URL = https://gamfrcokkpygwjcwnxuf.supabase.co');
  console.warn('      SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.warn('');
  console.warn('   5. Chọn môi trường: Production, Preview, Development');
  console.warn('   6. Click Save và Redeploy');
  console.warn('');
  console.warn('⚠️  Build sẽ tiếp tục nhưng app sẽ không hoạt động đúng');
  console.warn('⚠️  cho đến khi bạn thêm Environment Variables.');
  console.warn('⚠️  ============================================');
  console.warn('');
  
  // Tạo config.js với giá trị placeholder để build pass
  // App sẽ detect và hiển thị lỗi phù hợp
  configContent = `// File cấu hình Supabase - Tự động tạo từ environment variables
// ⚠️ CẢNH BÁO: Environment Variables chưa được cấu hình trên Vercel
// Vui lòng thêm SUPABASE_URL và SUPABASE_ANON_KEY vào Vercel Settings

window.__APP_CONFIG__ = {
  SUPABASE_URL: null,
  SUPABASE_ANON_KEY: null
};
`;
} else {
  // Tạo config.js với giá trị thật từ environment variables
  configContent = `// File cấu hình Supabase - Tự động tạo từ environment variables
// File này được tạo tự động trong quá trình build trên Vercel
// DO NOT COMMIT THIS FILE - Nó được tạo tự động từ env vars

window.__APP_CONFIG__ = {
  SUPABASE_URL: '${SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}'
};
`;
}

// Ghi file config.js (luôn tạo file để tránh lỗi 404)
try {
    fs.writeFileSync(configPath, configContent, 'utf8');
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        console.log('✅ config.js đã được tạo thành công từ environment variables');
        console.log(`   SUPABASE_URL: ${SUPABASE_URL.substring(0, 30)}...`);
    } else {
        console.warn('⚠️  Đã tạo config.js với giá trị placeholder');
        console.warn('⚠️  App sẽ hiển thị lỗi khi chạy nếu thiếu config');
    }
    console.log(`   File location: ${configPath}`);
} catch (error) {
    console.error('❌ Lỗi khi ghi file config.js:', error.message);
    // Chỉ exit nếu có env vars nhưng không ghi được file (lỗi thật sự)
    // Nếu không có env vars, không exit để build vẫn pass
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        process.exit(1);
    }
}

