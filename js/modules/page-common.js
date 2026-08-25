window.supabaseClient = window.supabaseClient || null;
window.currentUserProfile = window.currentUserProfile || { role: 'admin', full_name: 'Admin' };
window.remoteSupabaseClient = window.remoteSupabaseClient || null;
window.hasAttemptedAutoRestore = !!window.hasAttemptedAutoRestore;

const core = window.QLTSCore || {};

function showInfoModal(message, title = 'Thông báo') {
    const titleEl = document.getElementById('infoModalTitle');
    const msgEl = document.getElementById('infoModalMessage');
    if (titleEl && msgEl) {
        titleEl.textContent = title;
        if (typeof message === 'string' && /<[^>]+>/.test(message)) {
            msgEl.innerHTML = message;
        } else {
            msgEl.textContent = message;
        }
        if (typeof window.openModal === 'function') {
            window.openModal('infoModal');
        }
    } else if (document.visibilityState === 'visible') {
        alert(`${title}: ${String(message).replace(/<[^>]*>?/gm, '')}`);
    }
}

function handleSupabaseError(error, context) {
    console.error(`Lỗi ${context}:`, error);
    const msg = (error && error.message) ? error.message : JSON.stringify(error);

    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Aborted')) {
        console.warn('Supressed network error (likely due to navigation):', msg);
        return;
    }

    showInfoModal(`Chi tiết: ${msg}`, `Lỗi khi ${context}`);
}

function getRemoteSupabaseClient() {
    if (window.remoteSupabaseClient) return window.remoteSupabaseClient;
    const cfg = window.__APP_CONFIG__ || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || typeof supabase === 'undefined') {
        return null;
    }

    try {
        remoteSupabaseClient = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
        return window.remoteSupabaseClient;
    } catch (e) {
        console.warn('Cannot initialize remote Supabase client for auto-restore:', e);
        return null;
    }
}

function safeArrayParse(raw) {
    try {
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function isLikelyDemoDataSnapshot(assetRows, userRows) {
    if (!Array.isArray(assetRows) || !Array.isArray(userRows)) return false;
    if (assetRows.length === 0) return false;
    if (assetRows.length > 3 || userRows.length > 3) return false;

    const normalized = (v) => (v || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const assetNames = assetRows.map((a) => normalized(a?.name));
    const userNames = userRows.map((u) => normalized(u?.name));

    const hasDemoAssets = assetNames.includes('laptop dell xps 13') || assetNames.includes('monitor lg 27"');
    const hasDemoUsers = userNames.includes('nguyen van a') || userNames.includes('tran thi b');

    return hasDemoAssets && hasDemoUsers;
}

async function autoRestoreFromSupabaseIfNeeded() {
    if (window.hasAttemptedAutoRestore) return;
    hasAttemptedAutoRestore = true;

    const localAssets = safeArrayParse(localStorage.getItem(LocalDB.KEYS.ASSETS));
    const localLicenses = safeArrayParse(localStorage.getItem(LocalDB.KEYS.LICENSES));
    const localUsers = safeArrayParse(localStorage.getItem(LocalDB.KEYS.USERS));

    const localEmpty = localAssets.length === 0 && localLicenses.length === 0;
    const localLooksDemo = isLikelyDemoDataSnapshot(localAssets, localUsers);

    if (!localEmpty && !localLooksDemo) {
        return;
    }

    const remote = getRemoteSupabaseClient();
    if (!remote) {
        console.warn('Auto-restore skipped: Supabase config/sdk not available');
        return;
    }

    try {
        const [
            deptRes, catRes, userRes, assetRes, licenseRes, historyRes,
            licenseTypeRes, maintenanceTaskRes, maintenanceEventRes, stockCheckRes,
            stockCheckItemRes, alertSettingRes
        ] = await Promise.all([
            remote.from('departments').select('*'),
            remote.from('categories').select('*'),
            remote.from('users').select('*'),
            remote.from('assets').select('*'),
            remote.from('licenses').select('*'),
            remote.from('asset_history').select('*'),
            remote.from('license_types').select('*'),
            remote.from('maintenance_tasks').select('*'),
            remote.from('maintenance_events').select('*'),
            remote.from('stock_checks').select('*'),
            remote.from('stock_check_items').select('*'),
            remote.from('alert_settings').select('*')
        ]);

        const hasRemoteError = [deptRes, catRes, userRes, assetRes, licenseRes].some((x) => x?.error);
        if (hasRemoteError) {
            console.warn('Auto-restore failed due to Supabase error:', {
                departments: deptRes?.error,
                categories: catRes?.error,
                users: userRes?.error,
                assets: assetRes?.error,
                licenses: licenseRes?.error
            });
            return;
        }

        const backupPayload = {
            ASSETS: assetRes.data || [],
            LICENSES: licenseRes.data || [],
            USERS: userRes.data || [],
            CATEGORIES: catRes.data || [],
            DEPARTMENTS: deptRes.data || [],
            LICENSE_TYPES: licenseTypeRes.data || [],
            ASSET_HISTORY: historyRes.data || [],
            ALERT_SETTINGS: alertSettingRes.data || [],
            MAINTENANCE_TASKS: maintenanceTaskRes.data || [],
            MAINTENANCE_EVENTS: maintenanceEventRes.data || [],
            STOCK_CHECKS: stockCheckRes.data || [],
            STOCK_CHECK_ITEMS: stockCheckItemRes.data || []
        };

        if (typeof LocalDB.restoreFromRemoteSnapshot === 'function') {
            LocalDB.restoreFromRemoteSnapshot(backupPayload);
        }
        showInfoModal('Đã tự khôi phục dữ liệu từ Supabase.', 'Khôi phục dữ liệu');
    } catch (error) {
        console.error('Auto restore failed:', error);
    }
}

window.QLTSPageCommon = window.QLTSPageCommon || {};
window.QLTSPageCommon.init = async function () {
    window.supabaseClient = window.LocalDB;

    if (!supabaseClient) {
        console.error('LocalDB not loaded!');
        alert('Lỗi: LocalDB chưa được load. Vui lòng refresh trang.');
        return;
    }

    console.log('LocalDB initialized:', supabaseClient);

    window.exportToExcel = function(data, filename) {
        if (!data || data.length === 0) {
            alert('Không có dữ liệu để xuất!');
            return;
        }
        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            XLSX.writeFile(wb, filename);
        } catch (error) {
            console.error('Lỗi khi xuất Excel:', error);
            alert('Có lỗi khi xuất file Excel: ' + error.message);
        }
    };

    const hamburgerButton = document.getElementById('hamburger-button');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    const toggleSidebar = () => {
        if (sidebar && sidebarBackdrop) {
            sidebar.classList.toggle('-translate-x-full');
            sidebarBackdrop.classList.toggle('hidden');
        }
    };

    if (hamburgerButton) {
        hamburgerButton.addEventListener('click', toggleSidebar);
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', toggleSidebar);
    }
};
