window.supabaseClient = window.supabaseClient || null;

// [LOCAL-ONLY] Không có đăng nhập cloud thật (mục Auth đang tạm ẩn), nên hồ sơ
// người dùng hiện tại được lưu trực tiếp trong localStorage thay vì lấy từ Supabase
// Auth. `id` cố định để "Chỉnh sửa Profile" có nơi để cập nhật/lưu lại.
(function initLocalProfile() {
    if (window.currentUserProfile && window.currentUserProfile.id) return;
    const KEY = 'qlts_current_user_profile';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }
    window.currentUserProfile = {
        id: 'local-admin',
        role: 'admin',
        full_name: 'Admin',
        email: '',
        avatar_url: '',
        ...saved
    };
})();
window.remoteSupabaseClient = window.remoteSupabaseClient || null;
window.hasAttemptedAutoRestore = !!window.hasAttemptedAutoRestore;

// Shared in-memory data state used across all page-*.js modules (each module
// runs in its own function scope, so these must live on window to be shared).
window.departments = window.departments || [];
window.categories = window.categories || [];
window.users = window.users || [];
window.assets = window.assets || [];
window.licenses = window.licenses || [];
window.assetHistory = window.assetHistory || [];
window.licenseTypes = window.licenseTypes || [];
window.maintenanceTasks = window.maintenanceTasks || [];
window.maintenanceEvents = window.maintenanceEvents || [];
window.stockChecks = window.stockChecks || [];
window.stockCheckItems = window.stockCheckItems || [];
window.suppliers = window.suppliers || [];
window.alertSettings = window.alertSettings || [];
window.historyExportBuffer = window.historyExportBuffer || [];
window.tempImportedUsers = window.tempImportedUsers || [];
window.tempImportedAssets = window.tempImportedAssets || [];
window.tempId = window.tempId ?? null;
window.confirmCallback = window.confirmCallback || null;
window.assetCurrentPage = window.assetCurrentPage || 1;
window.userCurrentPage = window.userCurrentPage || 1;
window.licenseCurrentPage = window.licenseCurrentPage || 1;
window.maintenanceCurrentPage = window.maintenanceCurrentPage || 1;
window.stockCheckCurrentPage = window.stockCheckCurrentPage || 1;
window.activityLogCurrentPage = window.activityLogCurrentPage || 1;
window.assignActiveCurrentPage = window.assignActiveCurrentPage || 1;
window.assignHistoryCurrentPage = window.assignHistoryCurrentPage || 1;
window.assignCurrentTab = window.assignCurrentTab || 'active';
window.hasBootstrappedLocalData = window.hasBootstrappedLocalData || false;
window.currentFilteredAssets = window.currentFilteredAssets || [];
window.currentFilteredUsers = window.currentFilteredUsers || [];
window.currentFilteredLicenses = window.currentFilteredLicenses || [];
window.assetSort = window.assetSort || { column: 'name', direction: 'asc' };
window.userSort = window.userSort || { column: 'name', direction: 'asc' };
window.licenseSort = window.licenseSort || { column: 'key_type', direction: 'asc' };
window.chartAssetHealth = window.chartAssetHealth || null;
window.chartCategory = window.chartCategory || null;
window.chartLocation = window.chartLocation || null;
window.chartLicenseStatus = window.chartLicenseStatus || null;
window.chartDepartment = window.chartDepartment || null;
window.chartUserAsset = window.chartUserAsset || null;
window.chartUserLicense = window.chartUserLicense || null;
window.chartActivity = window.chartActivity || null;
window.chartLicenseExpiration = window.chartLicenseExpiration || null;
window.assignUserChoicesInstance = window.assignUserChoicesInstance || null;
window.userChoicesInstance = window.userChoicesInstance || null;
window.licenseUserChoicesInstance = window.licenseUserChoicesInstance || null;
window.licenseAssignUserChoicesInstance = window.licenseAssignUserChoicesInstance || null;
window.transferUserChoicesInstance = window.transferUserChoicesInstance || null;
window.maintenanceAssetChoices = window.maintenanceAssetChoices || null;
window.filterAssetUserChoicesInstance = window.filterAssetUserChoicesInstance || null;
window.filterLicenseUserChoicesInstance = window.filterLicenseUserChoicesInstance || null;
window.selectedAssetIds = window.selectedAssetIds || new Set();
window.selectedLicenseIds = window.selectedLicenseIds || new Set();

const core = window.QLTSCore || {};

window.STATUS_MAP = window.STATUS_MAP || {
    Active: { text: 'Đang dùng', classes: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700' },
    Stock: { text: 'Trong kho', classes: 'bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-700' },
    Repair: { text: 'Sửa chữa', classes: 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700' },
    Broken: { text: 'Hỏng', classes: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700' },
    Disposed: { text: 'Đã thanh lý', classes: 'bg-slate-200 text-slate-600 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600' },
    Expired: { text: 'Hết hạn', classes: 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' }
};

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
    } else {
        console.warn(`showInfoModal: không tìm thấy #infoModal trên trang. ${title}: ${String(message).replace(/<[^>]*>?/gm, '')}`);
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
    if (window.localDBReady) await window.localDBReady;
    window.supabaseClient = window.LocalDB;

    if (!supabaseClient) {
        console.error('LocalDB not loaded!');
        const modal = document.getElementById('infoModal');
        const titleEl = document.getElementById('infoModalTitle');
        const msgEl = document.getElementById('infoModalMessage');
        if (modal && titleEl && msgEl) {
            titleEl.textContent = 'Lỗi';
            msgEl.textContent = 'LocalDB chưa được load. Vui lòng tải lại trang.';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
        return;
    }

    console.log('LocalDB initialized:', supabaseClient);

    window.exportToExcel = function(data, filename) {
        if (!data || data.length === 0) {
            showInfoModal('Không có dữ liệu để xuất!');
            return;
        }
        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            XLSX.writeFile(wb, filename);
        } catch (error) {
            console.error('Lỗi khi xuất Excel:', error);
            showInfoModal('Có lỗi khi xuất file Excel: ' + error.message, 'Lỗi');
        }
    };

    // Sidebar toggle (hamburger + backdrop) đã chuyển sang sidebar.js
    // để quản lý tập trung cùng với việc render menu.
};
