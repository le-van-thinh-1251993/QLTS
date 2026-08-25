// Load Supabase config from external `config.js` if provided (window.__APP_CONFIG__)
// If not provided, fall back to embedded values (old behavior).
const _cfg = window.__APP_CONFIG__ || {};
// REMOVED HARDCODED KEYS FOR SECURITY
const SUPABASE_URL = _cfg.SUPABASE_URL;
const SUPABASE_ANON_KEY = _cfg.SUPABASE_ANON_KEY;

// Kiểm tra xem supabase library đã được load chưa
if (typeof supabase === 'undefined') {
    console.error('CRITICAL: Supabase library chưa được load. Vui lòng đảm bảo @supabase/supabase-js được load trước auth.js');
}

// Khởi tạo Supabase client chỉ khi có config hợp lệ và supabase library đã sẵn sàng
let supabaseClient = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof supabase !== 'undefined') {
    try {
        // Supabase client với cấu hình session riêng để tránh đụng các app khác cùng domain
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                storageKey: 'qlts-auth-v1',
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    } catch (error) {
        console.error('Lỗi khi khởi tạo Supabase client:', error);
        supabaseClient = null;
    }
} else {
    // Chỉ hiển thị lỗi trên console, không alert để tránh làm gián đoạn
    // (trang seating.html không cần Supabase)
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('CRITICAL: Supabase config missing. Please create config.js based on config.example.js');
        console.error('   SUPABASE_URL:', SUPABASE_URL);
        console.error('   SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '***' : 'missing');
    }
    if (typeof supabase === 'undefined') {
        console.error('CRITICAL: Supabase library chưa được load');
    }
    // Chỉ hiển thị nếu đang ở trang cần Supabase (không phải seating.html)
    if (!window.location.pathname.includes('seating.html')) {
        // Delay để tránh hiển thị lỗi khi trang đang load
        setTimeout(() => {
            if (document.visibilityState === 'visible') {
                let errorMsg = 'Lỗi cấu hình: ';
                if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
                    errorMsg += 'Thiếu thông tin kết nối Supabase. Vui lòng kiểm tra file config.js';
                } else if (typeof supabase === 'undefined') {
                    errorMsg += 'Supabase library chưa được load';
                }
                showAuthError(errorMsg);
            }
        }, 500);
    }
}

let currentUserProfile = null; // Biến toàn cục để lưu thông tin user và role

/**
 * Hiển thị thông báo lỗi trên form
 * @param {string} message - Nội dung lỗi
 */
function showAuthError(message) {
    const errorDiv = document.getElementById('auth-error');
    const errorMessage = document.getElementById('auth-error-message');
    if (errorDiv && errorMessage) {
        errorMessage.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

/**
 * Xử lý đăng nhập
 * @param {string} email 
 * @param {string} password 
 */
async function handleLogin(email, password) {
    const loginButton = document.getElementById('login-button');
    loginButton.disabled = true;
    loginButton.textContent = 'Đang xử lý...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        // Đăng nhập thành công, chuyển hướng về trang chính
        window.location.href = 'index.html';

    } catch (error) {
        showAuthError(error.message || 'Email hoặc mật khẩu không đúng.');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Đăng nhập';
    }
}

/**
 * Xử lý đăng xuất
 */
async function handleLogout() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    window.location.href = 'login.html';
}

/**
 * Kiểm tra phiên đăng nhập của người dùng
 * Nếu chưa đăng nhập, chuyển hướng về trang login.
 */
async function checkSession() {
    // Nếu không có Supabase client (ví dụ: trang seating.html), bỏ qua check session
    if (!supabaseClient) {
        // Trang seating.html không cần auth, các trang khác sẽ redirect
        if (!window.location.pathname.includes('seating.html') && !window.location.pathname.endsWith('login.html')) {
            console.warn('Supabase client không khả dụng, chuyển hướng về login');
            window.location.href = 'login.html';
        }
        return null;
    }

    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError) {
            console.error('Lỗi khi kiểm tra session:', sessionError);
        }

        if (!session) {
            // Nếu không ở trang login thì mới chuyển hướng
            if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.includes('seating.html')) {
                window.location.href = 'login.html';
            }
            return null;
        }

        // Nếu đã có session, lấy thông tin profile (bao gồm cả role)
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('id', session.user.id)
            .single();

        if (profileError && !profile) {
            console.error("Không thể lấy thông tin profile:", profileError);
            // Có thể đăng xuất người dùng nếu không có profile
            // await handleLogout();
            return null;
        }

        currentUserProfile = { ...session.user, ...profile };
        return currentUserProfile;
    } catch (error) {
        console.error('Lỗi trong checkSession:', error);
        // Nếu lỗi kết nối, chỉ redirect nếu không phải trang login hoặc seating
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.includes('seating.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }
}

// Gắn sự kiện cho form đăng nhập
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            handleLogin(email, password);
        });
    }
});