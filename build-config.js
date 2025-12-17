// Script để tạo file config.js từ environment variables khi build trên Vercel
// File này sẽ được chạy trong quá trình build

const fs = require('fs');
const path = require('path');

// Lấy environment variables từ Vercel (hoặc từ process.env)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set as environment variables');
  process.exit(1);
}

// Nội dung file config.js
const configContent = `// File cấu hình Supabase - Tự động tạo từ environment variables
// File này được tạo tự động trong quá trình build trên Vercel

window.__APP_CONFIG__ = {
  SUPABASE_URL: '${SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}'
};
`;

// Ghi file config.js
const configPath = path.join(__dirname, 'config.js');
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('✅ config.js đã được tạo thành công từ environment variables');
