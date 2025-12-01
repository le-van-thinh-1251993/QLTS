const SUPABASE_URL = 'https://gamfrcokkpygwjcwnxuf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbWZyY29ra3B5Z3dqY3dueHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMzkzMjMsImV4cCI6MjA3OTcxNTMyM30.5hWKHgnY8xmcWCAgfwzJpOPz17-xojYGXB_KnW90R9Y';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}

/**
 * Kiểm tra phiên đăng nhập của người dùng
 * Nếu chưa đăng nhập, chuyển hướng về trang login.
 */
async function checkSession() {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (!session) {
        // Nếu không ở trang login thì mới chuyển hướng
        if (!window.location.pathname.endsWith('login.html')) {
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