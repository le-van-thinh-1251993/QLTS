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
window.supplies = window.supplies || [];
window.supplyTransactions = window.supplyTransactions || [];
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
window.inventoryCurrentPage = window.inventoryCurrentPage || 1;
window.supplyTransCurrentPage = window.supplyTransCurrentPage || 1;
window.inventoryCurrentTab = window.inventoryCurrentTab || 'stock';
window.currentFilteredSupplies = window.currentFilteredSupplies || [];
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

function ensureInfoModalDOM() {
    let modal = document.getElementById('infoModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'infoModal';
    modal.className = 'hidden fixed inset-0 bg-slate-900 bg-opacity-60 z-[99] flex justify-center items-center backdrop-blur-sm';
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm text-center border dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 mx-4">
            <div class="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400 text-2xl shadow-inner">
                <i class="fa-solid fa-circle-info"></i>
            </div>
            <h3 id="infoModalTitle" class="text-base font-bold text-slate-800 dark:text-gray-100 mb-2">Thông báo</h3>
            <p id="infoModalMessage" class="text-slate-600 dark:text-slate-300 mb-6 text-sm whitespace-pre-line"></p>
            <button type="button" class="close-modal px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold w-full transition-colors shadow-sm">Đã hiểu</button>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.close-modal')?.addEventListener('click', () => {
        if (typeof window.safeCloseModal === 'function') {
            window.safeCloseModal('infoModal');
        } else {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            if (typeof window.safeCloseModal === 'function') {
                window.safeCloseModal('infoModal');
            } else {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }
    });

    return modal;
}

function ensureConfirmationModalDOM() {
    let modal = document.getElementById('confirmationModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'confirmationModal';
    modal.className = 'hidden fixed inset-0 bg-slate-900 bg-opacity-60 z-[99] flex justify-center items-center backdrop-blur-sm';
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm text-center border dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 mx-4">
            <div class="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 id="confirmationModalTitle" class="text-base font-bold text-slate-800 dark:text-gray-100 mb-2">Xác nhận</h3>
            <p id="confirmationModalMessage" class="text-slate-600 dark:text-slate-300 mb-6 text-sm whitespace-pre-line">Bạn có chắc chắn muốn thực hiện hành động này?</p>
            <div class="flex justify-center gap-3">
                <button type="button" class="close-modal px-4 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-gray-200 w-1/2 transition-colors">Hủy</button>
                <button type="button" id="btnConfirmAction" class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold w-1/2 shadow-sm transition-colors">Xác nhận</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.close-modal')?.addEventListener('click', () => {
        if (typeof window.safeCloseModal === 'function') {
            window.safeCloseModal('confirmationModal');
        } else {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            if (typeof window.safeCloseModal === 'function') {
                window.safeCloseModal('confirmationModal');
            } else {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }
    });

    const confirmBtn = modal.querySelector('#btnConfirmAction');
    confirmBtn?.addEventListener('click', async () => {
        if (typeof window.confirmCallback === 'function') {
            const cb = window.confirmCallback;
            window.confirmCallback = null;
            await cb();
        }
        if (typeof window.safeCloseModal === 'function') {
            window.safeCloseModal('confirmationModal');
        } else {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });

    return modal;
}

function showInfoModal(message, title = 'Thông báo') {
    ensureInfoModalDOM();
    const titleEl = document.getElementById('infoModalTitle');
    const msgEl = document.getElementById('infoModalMessage');
    if (titleEl && msgEl) {
        titleEl.textContent = title;
        if (typeof message === 'string' && /<[^>]+>/.test(message)) {
            msgEl.innerHTML = message;
        } else {
            msgEl.textContent = String(message ?? '');
        }
        if (typeof window.openModal === 'function') {
            window.openModal('infoModal');
        } else {
            const modal = document.getElementById('infoModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        }
    } else {
        console.warn(`showInfoModal: ${title}: ${String(message).replace(/<[^>]*>?/gm, '')}`);
    }
}

function showConfirmationModal(message, callback, title = 'Xác nhận') {
    ensureConfirmationModalDOM();
    const titleEl = document.getElementById('confirmationModalTitle');
    const msgEl = document.getElementById('confirmationModalMessage');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = String(message ?? '');
    window.confirmCallback = callback || null;

    if (typeof window.openModal === 'function') {
        window.openModal('confirmationModal');
    } else {
        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
}

// Override native window.alert to always open the beautiful modal
if (typeof window !== 'undefined') {
    window.showInfoModal = showInfoModal;
    window.showConfirmationModal = showConfirmationModal;
    window.alert = function (message) {
        showInfoModal(String(message ?? ''), 'Thông báo');
    };
}

// Global delegated handlers for Confirmation and Info modals across all pages
if (typeof document !== 'undefined') {
    document.addEventListener('click', async (e) => {
        // 1. Confirm button in confirmationModal / confirmModal
        const confirmBtn = e.target.closest('#btnConfirmAction') || e.target.closest('#confirmDeleteBtn');
        if (confirmBtn) {
            e.preventDefault();
            const cb = window.confirmCallback;
            window.confirmCallback = null;
            if (typeof cb === 'function') {
                try {
                    await cb();
                } catch (err) {
                    console.error('Error executing confirmCallback:', err);
                }
            }
            if (typeof window.safeCloseModal === 'function') {
                window.safeCloseModal('confirmationModal');
                window.safeCloseModal('confirmModal');
            } else {
                ['confirmationModal', 'confirmModal'].forEach(id => {
                    const m = document.getElementById(id);
                    if (m) {
                        m.classList.add('hidden');
                        m.classList.remove('flex');
                    }
                });
            }
            return;
        }

        // 2. Close modal buttons (.close-modal, .btn-close-modal) for confirmationModal & infoModal
        const closeBtn = e.target.closest('.close-modal') || e.target.closest('.btn-close-modal');
        if (closeBtn) {
            const confModal = closeBtn.closest('#confirmationModal') || closeBtn.closest('#confirmModal');
            if (confModal) {
                window.confirmCallback = null;
                if (typeof window.safeCloseModal === 'function') {
                    window.safeCloseModal(confModal.id);
                } else {
                    confModal.classList.add('hidden');
                    confModal.classList.remove('flex');
                }
                return;
            }

            const infModal = closeBtn.closest('#infoModal');
            if (infModal) {
                if (typeof window.safeCloseModal === 'function') {
                    window.safeCloseModal(infModal.id);
                } else {
                    infModal.classList.add('hidden');
                    infModal.classList.remove('flex');
                }
                return;
            }
        }

        // 3. Backdrop click to close confirmationModal / infoModal
        if (e.target.id === 'confirmationModal' || e.target.id === 'confirmModal') {
            window.confirmCallback = null;
            if (typeof window.safeCloseModal === 'function') {
                window.safeCloseModal(e.target.id);
            } else {
                e.target.classList.add('hidden');
                e.target.classList.remove('flex');
            }
        } else if (e.target.id === 'infoModal') {
            if (typeof window.safeCloseModal === 'function') {
                window.safeCloseModal('infoModal');
            } else {
                e.target.classList.add('hidden');
                e.target.classList.remove('flex');
            }
        }
    });
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
