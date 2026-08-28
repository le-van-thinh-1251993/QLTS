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
window.supabaseClient = window.supabaseClient || null; var supabaseClient = window.supabaseClient;
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

window.currentUserProfile = window.currentUserProfile || null; var currentUserProfile = window.currentUserProfile; // Biến toàn cục để lưu thông tin user và role

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
        // If a Supabase auth client exists, use it
        if (supabaseClient && supabaseClient.auth && typeof supabaseClient.auth.signInWithPassword === 'function') {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            // Redirect on success
            window.location.href = 'index.html';
            return;
        }

        // Local-only mode: use LocalDB to find the user by email
        if (typeof LocalDB !== 'undefined' && LocalDB) {
            const res = await LocalDB.from('users').select('*');
            const users = (res && res.data) || [];
            const user = users.find(u => u.email && u.email.toLowerCase() === (email || '').toLowerCase());
            if (!user) {
                showAuthError('Không tìm thấy user với email này.');
                return;
            }

            // Create a simple local session and set currentUserProfile
            const session = { userId: user.id, created_at: new Date().toISOString() };
            try { localStorage.setItem('qlts_session', JSON.stringify(session)); } catch (e) { /* ignore */ }
            window.currentUserProfile = { ...user, id: user.id, full_name: user.name || user.full_name, avatar_url: user.avatar || user.avatar_url, role: user.role || 'admin' };

            // Redirect to main app
            window.location.href = 'index.html';
            return;
        }

        // Fallback: no auth mechanism available
        showAuthError('Hệ thống chưa được cấu hình để xác thực.');
    } catch (error) {
        showAuthError((error && error.message) || 'Email hoặc mật khẩu không đúng.');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Đăng nhập';
    }
}

/**
 * Xử lý đăng xuất
 */
async function handleLogout() {
    // If Supabase auth available, use it. Otherwise clear local session.
    try {
        if (supabaseClient && supabaseClient.auth && typeof supabaseClient.auth.signOut === 'function') {
            await supabaseClient.auth.signOut();
        } else {
            localStorage.removeItem('qlts_session');
        }
    } catch (e) {
        console.warn('Logout error:', e);
    }
    window.location.href = 'login.html';
}

/**
 * Kiểm tra phiên đăng nhập của người dùng
 * Nếu chưa đăng nhập, chuyển hướng về trang login.
 */
async function checkSession() {
    // If Supabase auth is available, use it
    if (supabaseClient && supabaseClient.auth && typeof supabaseClient.auth.getSession === 'function') {
        try {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) console.error('Lỗi khi kiểm tra session:', sessionError);
            if (!session) {
                if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.includes('seating.html')) {
                    window.location.href = 'login.html';
                }
                return null;
            }
            // If session exists, get profile from profiles table
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('id, full_name, avatar_url, role')
                .eq('id', session.user.id)
                .single();
            if (profileError && !profile) {
                console.error("Không thể lấy thông tin profile:", profileError);
                return null;
            }
            currentUserProfile = { ...session.user, ...profile };
            return currentUserProfile;
        } catch (error) {
            console.error('Lỗi trong checkSession:', error);
            if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.includes('seating.html')) {
                window.location.href = 'login.html';
            }
            return null;
        }
    }

    // Local-only mode: attempt to restore session from localStorage or auto-login a default user
    try {
        const raw = localStorage.getItem('qlts_session');
        if (raw) {
            const sess = JSON.parse(raw || '{}');
            const userId = sess.userId;
            if (userId && typeof LocalDB !== 'undefined' && LocalDB) {
                const res = await LocalDB.from('users').select('*');
                const users = (res && res.data) || [];
                const user = users.find(u => u.id === userId);
                if (user) {
                    currentUserProfile = { ...user, full_name: user.name || user.full_name, avatar_url: user.avatar || user.avatar_url, role: user.role || 'admin' };
                    return currentUserProfile;
                }
            }
        }

        // No saved session: if not on login page, auto-use the first user from LocalDB so app works offline
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.includes('seating.html')) {
            if (typeof LocalDB !== 'undefined' && LocalDB) {
                const res = await LocalDB.from('users').select('*');
                const users = (res && res.data) || [];
                const user = users[0];
                if (user) {
                    currentUserProfile = { ...user, full_name: user.name || user.full_name, avatar_url: user.avatar || user.avatar_url, role: user.role || 'admin' };
                    return currentUserProfile;
                }
            }
            // If still no user, redirect to login
            window.location.href = 'login.html';
            return null;
        }

        return null;
    } catch (error) {
        console.error('Lỗi trong checkSession (local):', error);
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