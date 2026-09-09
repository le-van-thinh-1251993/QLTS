window.QLTSPageData = window.QLTSPageData || {};
window.QLTSPageData.init = async function () {
    // =================================================================

    // Trạng thái "Hết hạn" phải luôn khớp với ngày hết hạn thực tế, không phụ thuộc vào
    // giá trị status đã lưu (dữ liệu cũ/nhập tay có thể bị lệch so với ngày thực tế).
    // - Còn hạn (hoặc không có ngày hết hạn = vĩnh viễn) mà lỡ lưu "Expired" -> khôi phục về Active/Stock.
    // - Đã quá hạn -> luôn hiển thị "Expired" dù status lưu là gì.
    function computeEffectiveLicenseStatus(license, assignedUser) {
        if (!license.expiration_date) {
            return license.status === 'Expired' ? (assignedUser ? 'Active' : 'Stock') : license.status;
        }
        const expDate = new Date(license.expiration_date);
        if (isNaN(expDate.getTime())) return license.status;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastDue = expDate < today;
        if (isPastDue) return 'Expired';
        return license.status === 'Expired' ? (assignedUser ? 'Active' : 'Stock') : license.status;
    }

    async function fetchAllData() {
        console.log('fetchAllData() called');
        // Fetch all data from LocalDB
        const [deptData, catData, userData, assetData, licenseData, historyData, licTypeData, maintenanceTaskData, maintenanceEventData, stockCheckData, stockCheckItemData, supplierData, alertSettingData] = await Promise.all([
            LocalDB.from('departments').select('*'),
            LocalDB.from('categories').select('*'),
            LocalDB.from('users').select('*'),
            LocalDB.from('assets').select('*'),
            LocalDB.from('licenses').select('*'),
            LocalDB.from('asset_history').select('*'),
            LocalDB.from('license_types').select('*'),
            LocalDB.from('maintenance_tasks').select('*'),
            LocalDB.from('maintenance_events').select('*'),
            LocalDB.from('stock_checks').select('*'),
            LocalDB.from('stock_check_items').select('*'),
            LocalDB.from('suppliers').select('*'),
            LocalDB.from('alert_settings').select('*')
        ]);

        console.log('Raw data from LocalDB:', {
            departments: deptData?.data?.length,
            categories: catData?.data?.length,
            users: userData?.data?.length,
            assets: assetData?.data?.length,
            licenses: licenseData?.data?.length
        });

        const needsBootstrap =
            (deptData?.data?.length || 0) === 0 &&
            (catData?.data?.length || 0) === 0 &&
            (userData?.data?.length || 0) === 0;

        if (needsBootstrap && !hasBootstrappedLocalData) {
            console.warn('Core LocalDB tables are empty. Bootstrapping default data...');
            hasBootstrappedLocalData = true;
            LocalDB.setDefaultData();
            return fetchAllData();
        }

        // Process departments
        departments = deptData.data || [];
        
        // Process categories
        categories = catData.data || [];
        
        // Process license types
        licenseTypes = licTypeData.data || [];

        // Process suppliers
        suppliers = supplierData.data || [];

        // Process users with department name join
        const usersRaw = userData.data || [];
        users = usersRaw.map(u => {
            const dept = departments.find(d => String(d.id) === String(u.department_id));
            return {
                ...u,
                department: dept ? dept.name : '-'
            };
        });
        
        console.log('Processed users:', users.length, users);
        
        // Process assets with category and user name joins
        const assetsRaw = assetData.data || [];
        assets = assetsRaw.map(a => {
            const cat = categories.find(c => String(c.id) === String(a.category_id));
            const usr = users.find(u => String(u.id) === String(a.user_id));
            const supplier = suppliers.find(s => String(s.id) === String(a.supplier_id));
            return {
                ...a,
                category: cat ? cat.name : '-',
                user: usr ? usr.name : null,
                supplier: supplier ? supplier.name : null,
                warranty_expiration_date: a.warranty_expiration_date || null,
                purchase_date: a.purchase_date || null,
                cost: a.cost || null,
                salvage_value: a.salvage_value || null,
                useful_life_months: a.useful_life_months || null,
                depreciation_method: a.depreciation_method || 'straight_line'
            };
        });
        
        console.log('Processed assets:', assets.length, assets);
        
        // Process licenses with user name join
        const licensesRaw = licenseData.data || [];
        licenses = licensesRaw.map(l => {
            const usr = users.find(u => String(u.id) === String(l.user_id));
            return {
                ...l,
                status: computeEffectiveLicenseStatus(l, usr),
                user: usr ? usr.name : null
            };
        });
        
        console.log('Processed licenses:', licenses.length, licenses);

        await backfillEntityCodes();

        // Process asset history with asset name join
        const historyRaw = historyData.data || [];
        assetHistory = historyRaw.map(h => {
            const asset = assets.find(a => String(a.id) === String(h.asset_id));
            return {
                id: h.id,
                created_at: h.created_at,
                time: h.created_at ? new Date(h.created_at).toLocaleString('vi-VN') : '',
                assetId: h.asset_id,
                assetName: asset ? asset.name : 'N/A',
                action: h.action,
                desc: h.description,
                createdBy: h.created_by_name || 'Admin'
            };
        });
        
        // Process other tables
        maintenanceTasks = maintenanceTaskData.data || [];
        maintenanceEvents = maintenanceEventData.data || [];
        stockChecks = stockCheckData.data || [];
        stockCheckItems = stockCheckItemData.data || [];
        alertSettings = alertSettingData.data || [];

        await migrateLegacyStatuses();

        console.log('fetchAllData() complete - Final counts:', {
            departments: departments.length,
            categories: categories.length,
            users: users.length,
            assets: assets.length,
            licenses: licenses.length
        });
    }

    // Chuyển các giá trị trạng thái tiếng Anh còn sót lại từ dữ liệu cũ (trước khi
    // hệ thống thống nhất trạng thái tiếng Việt) sang giá trị mới, và lưu lại luôn.
    const LEGACY_MAINT_STATUS_MAP = { open: 'Chưa xử lý', in_progress: 'Đang xử lý', done: 'Hoàn thành', overdue: 'Quá hạn' };
    const LEGACY_STOCK_STATUS_MAP = { open: 'Đang mở', closed: 'Hoàn thành' };
    const LEGACY_ASSET_STATUS_MAP = { Inactive: 'Stock', Assigned: 'Active' };

    async function migrateLegacyStatuses() {
        for (const task of maintenanceTasks) {
            const mapped = LEGACY_MAINT_STATUS_MAP[task.status];
            if (!mapped) continue;
            task.status = mapped;
            try { await LocalDB.from('maintenance_tasks').update({ status: mapped }).eq('id', task.id); }
            catch (e) { console.warn('Migrate maintenance status failed', task.id, e); }
        }
        for (const check of stockChecks) {
            const mapped = LEGACY_STOCK_STATUS_MAP[check.status];
            if (!mapped) continue;
            check.status = mapped;
            try { await LocalDB.from('stock_checks').update({ status: mapped }).eq('id', check.id); }
            catch (e) { console.warn('Migrate stock check status failed', check.id, e); }
        }
        for (const asset of assets) {
            const mapped = LEGACY_ASSET_STATUS_MAP[asset.status];
            if (!mapped) continue;
            asset.status = mapped;
            try { await LocalDB.from('assets').update({ status: mapped }).eq('id', asset.id); }
            catch (e) { console.warn('Migrate asset status failed', asset.id, e); }
        }
    }

    // Sinh & lưu asset_code/license_code cho các bản ghi cũ chưa có mã tem
    // (mã mới luôn được sinh sẵn lúc thêm mới trong page-settings.js).
    async function backfillEntityCodes() {
        const helpers = window.QLTSHelpers;
        if (!helpers) return;

        const assetCodes = assets.map(a => a.asset_code).filter(Boolean);
        for (const a of assets) {
            if (a.asset_code) continue;
            const usr = users.find(u => String(u.id) === String(a.user_id));
            const deptName = (usr && usr.department && usr.department !== '-') ? usr.department : null;
            const code = helpers.buildAssetCode(a.category, deptName, assetCodes);
            a.asset_code = code;
            assetCodes.push(code);
            try { await LocalDB.from('assets').update({ asset_code: code }).eq('id', a.id); }
            catch (e) { console.warn('Backfill asset_code failed for asset', a.id, e); }
        }

        const licenseCodes = licenses.map(l => l.license_code).filter(Boolean);
        for (const l of licenses) {
            if (l.license_code) continue;
            const usr = users.find(u => String(u.id) === String(l.user_id));
            const deptName = (usr && usr.department && usr.department !== '-') ? usr.department : null;
            const code = helpers.buildLicenseCode(l.key_type, deptName, licenseCodes);
            l.license_code = code;
            licenseCodes.push(code);
            try { await LocalDB.from('licenses').update({ license_code: code }).eq('id', l.id); }
            catch (e) { console.warn('Backfill license_code failed for license', l.id, e); }
        }
    }

    function safeCloseModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.setAttribute('aria-hidden', 'true');
        try { modal.style.pointerEvents = 'none'; } catch (e) {}
    }

    function attemptCloseModal(id) {
        // Placeholder for dirty-checks; currently just closes safely
        safeCloseModal(id);
    }

    function showConfirmationModal(message, callback, title = 'Xác nhận') {
        const titleEl = document.getElementById('confirmationModalTitle');
        const msgEl = document.getElementById('confirmationModalMessage');
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        confirmCallback = callback || null;
        openModal('confirmationModal');
    }

    // =================================================================
    // [MỚI] LOGIC THÔNG BÁO HẾT HẠN
    // =================================================================
    function checkAndDisplayNotifications() {
        const notificationList = document.getElementById('notification-list');
        const notificationCount = document.getElementById('notification-count');
        if (!notificationList || !notificationCount) return;

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');

        let notificationsToShow = [];
        let pageType = '';

        if (document.getElementById('assetTableBody')) {
            pageType = 'asset';
            notificationsToShow = assets.filter(asset => {
                if (!asset.warranty_expiration_date) return false;
                const expiryDate = new Date(asset.warranty_expiration_date);
                return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
            })
            .filter(asset => !readNotifications.includes(`asset_${asset.id}`))
            .sort((a, b) => new Date(a.warranty_expiration_date) - new Date(b.warranty_expiration_date));

        } else if (document.getElementById('licenseTableBody')) {
            pageType = 'license';
            notificationsToShow = licenses.filter(license => {
                if (!license.expiration_date) return false;
                const expiryDate = new Date(license.expiration_date);
                return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
            })
            .filter(license => !readNotifications.includes(`license_${license.id}`))
            .sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date));
        }

        if (notificationsToShow.length > 0) {
            notificationCount.textContent = notificationsToShow.length;
            notificationCount.classList.remove('hidden');

            notificationList.innerHTML = notificationsToShow.map(item => {
                const expiryDate = new Date(pageType === 'asset' ? item.warranty_expiration_date : item.expiration_date);
                const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                const dayText = daysLeft > 1 ? `${daysLeft} ngày` : 'hôm nay';
                const notificationId = `${pageType}_${item.id}`;
                const iconClass = pageType === 'asset' ? 'fa-box-archive' : 'fa-key';
                const message = pageType === 'asset' ? 'Sắp hết hạn bảo hành' : 'Sắp hết hạn bản quyền';
                // [MỚI] Tạo chuỗi hiển thị cho thông báo license
                const titleText = pageType === 'license' ? `${item.key_type} - ${item.user || 'Chưa cấp'}` : (item.name || item.key_type);

                return `
                    <li class="border-b dark:border-slate-700 last:border-b-0 group flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <a href="${pageType}s.html" class="flex-grow">
                            <p class="font-semibold text-sm text-slate-800 dark:text-gray-200 flex items-center"><i class="fa-solid ${iconClass} mr-2 text-slate-400"></i> ${item.name || item.key_type}</p>
                            <p class="font-semibold text-sm text-slate-800 dark:text-gray-200 flex items-center"><i class="fa-solid ${iconClass} mr-2 text-slate-400"></i> ${titleText}</p>
                            <p class="text-xs text-red-500 pl-5">${message} (còn ${dayText})</p>
                        </a>
                        <button data-action="mark-notif-read" data-notif-id="${notificationId}" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-opacity" title="Đánh dấu đã đọc">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    </li>
                `;
            }).join('');
        } else {
            notificationCount.classList.add('hidden');
            notificationList.innerHTML = `<li class="p-4 text-center text-sm text-slate-400 dark:text-gray-500">Không có thông báo mới.</li>`;
        }
    }

    // =================================================================
    // [MỚI] LOGIC PHÂN QUYỀN (RBAC)
    // =================================================================
    function applyRoleBasedUI() {
        const isAdmin = currentUserProfile.role === 'admin';

        // Ẩn tất cả các nút nguy hiểm nếu không phải admin
        const adminOnlyButtons = [
            '#addAssetBtn', '#importExcelBtn', '#manageCategoriesBtn',
            '#addLicenseBtn', '#importLicenseBtn', '#manageLicenseTypesBtn', '#exportLicenseBtn',
            '#addUserBtn', '#importUsersBtn', '#manageDeptsBtn', '#exportUsersBtn'
        ];

        if (!isAdmin) {
            adminOnlyButtons.forEach(selector => {
                const btn = document.querySelector(selector);
                if (btn) btn.style.display = 'none';
            });

            // SỬA LẠI ĐOẠN NÀY:
            // Tìm phần tử link Users
            const userLink = document.querySelector('a[href="users.html"]');
            if (userLink) {
                userLink.style.display = 'none';
            }
        }
    }

    // =================================================================
    // [MỚI] CẬP NHẬT THÔNG TIN USER TRÊN HEADER
    // =================================================================
    function updateHeaderUserInfo() {
        if (!currentUserProfile) return;

        const userNameElements = document.querySelectorAll('#header-user-name');
        const userEmailElements = document.querySelectorAll('#header-user-email');
        // Tìm tất cả avatar trong header
        const userAvatarElements = document.querySelectorAll('header .group img');

        userNameElements.forEach(el => el.textContent = currentUserProfile.full_name || 'Chưa có tên');
        userEmailElements.forEach(el => el.textContent = currentUserProfile.email);
        
        userAvatarElements.forEach(el => {
            el.src = currentUserProfile.avatar_url 
                     ? currentUserProfile.avatar_url 
                     : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserProfile.full_name || currentUserProfile.email)}&background=random`;
        });
    }
    // =================================================================
    // LOGIC IMPORT LICENSE (THÊM MỚI)
    // =================================================================
    let tempImportedLicenses = [];

    const importLicenseBtn = document.getElementById('importLicenseBtn');
    const licenseExcelFileInput = document.getElementById('licenseExcelFileInput');
    const btnSaveImportedLicenses = document.getElementById('btnSaveImportedLicenses');

    if (importLicenseBtn) {
        importLicenseBtn.addEventListener('click', () => {
            openModal('importLicenseModal');
        });
    }

    // =================================================================
    // LOGIC IMPORT LICENSE (ĐÃ SỬA LỖI & TỐI ƯU)
    // =================================================================

    // =================================================================
    // LOGIC IMPORT LICENSE (FULL - ĐÃ SỬA LỖI TÊN CỘT)
    // =================================================================

    // 1. Lắng nghe sự kiện chọn file (Đoạn này giữ nguyên)
    if (licenseExcelFileInput) {
        licenseExcelFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

                renderLicenseImportPreview(jsonData);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    function normalizeString(str) {
        if (window.QLTSHelpers && typeof window.QLTSHelpers.normalizeString === 'function') {
            return window.QLTSHelpers.normalizeString(str);
        }
        return str ? str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';
    }

    // 2. Hàm xử lý ngày tháng
    function parseDateToISO(dateStr) {
        if (window.QLTSHelpers && typeof window.QLTSHelpers.parseDateToISO === 'function') {
            return window.QLTSHelpers.parseDateToISO(dateStr);
        }
        if (!dateStr) return null;
        if (typeof dateStr === 'number') {
            const date = new Date(Math.ceil((dateStr - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0];
        }
        const str = dateStr.toString().trim();
        if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const parts = str.split('/');
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        const date = new Date(str);
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        return null;
    }

    // Hiển thị ngày ở định dạng dd/mm/yyyy
    function formatDateDisplay(isoDate) {
        if (window.QLTSHelpers && typeof window.QLTSHelpers.formatDateDisplay === 'function') {
            const formatted = window.QLTSHelpers.formatDateDisplay(isoDate);
            return formatted === '<span class="text-slate-400 italic">Vĩnh viễn</span>' ? '-' : formatted;
        }
        if (!isoDate) return '-';
        const d = new Date(isoDate);
        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('vi-VN');
    }

    const MAINT_STOCK_PAGE_SIZE = 5;
    const DONE_STATUS = 'Hoàn thành';

    function renderMaintenanceList() {
        const tbody = document.getElementById('maintenanceTableBody');
        if (!tbody) return;
        const isAdmin = currentUserProfile.role === 'admin';

        const allTasks = (maintenanceTasks || []).slice();

        // Cập nhật thẻ thống kê
        const totalEl = document.getElementById('maintTotalCount');
        const pendingEl = document.getElementById('maintPendingCount');
        const processingEl = document.getElementById('maintProcessingCount');
        const doneEl = document.getElementById('maintDoneCount');
        const overdueEl = document.getElementById('maintOverdueCount');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (totalEl) totalEl.textContent = allTasks.length;
        if (pendingEl) pendingEl.textContent = allTasks.filter(t => t.status === 'Chưa xử lý').length;
        if (processingEl) processingEl.textContent = allTasks.filter(t => t.status === 'Đang xử lý').length;
        if (doneEl) doneEl.textContent = allTasks.filter(t => t.status === 'Hoàn thành').length;
        if (overdueEl) overdueEl.textContent = allTasks.filter(t => {
            if (t.status === 'Quá hạn') return true;
            if (t.status !== 'Hoàn thành' && t.due_date) {
                const d = new Date(t.due_date);
                return !isNaN(d.getTime()) && d < today;
            }
            return false;
        }).length;

        // Bộ lọc & tìm kiếm
        const searchInput = document.getElementById('filterMaintenanceSearch') || (document.getElementById('assetTableBody') ? null : document.getElementById('searchInput'));
        const statusSelect = document.getElementById('filterMaintenanceStatus');

        let filtered = allTasks;
        if (statusSelect && statusSelect.value) {
            const val = statusSelect.value;
            if (val === 'Quá hạn') {
                filtered = filtered.filter(t => {
                    if (t.status === 'Quá hạn') return true;
                    if (t.status !== 'Hoàn thành' && t.due_date) {
                        const d = new Date(t.due_date);
                        return !isNaN(d.getTime()) && d < today;
                    }
                    return false;
                });
            } else {
                filtered = filtered.filter(t => t.status === val);
            }
        }
        if (searchInput && searchInput.value.trim()) {
            const q = normalizeString(searchInput.value.trim());
            filtered = filtered.filter(t => {
                const asset = assets.find(a => String(a.id) === String(t.asset_id));
                const assetName = asset ? `${asset.name} ${asset.asset_code || ''}` : '';
                const searchStr = normalizeString(`${t.title || ''} ${t.note || ''} ${assetName}`);
                return searchStr.includes(q);
            });
        }

        const sorted = filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        const pageSize = 10;
        const totalPages = Math.ceil(sorted.length / pageSize) || 1;
        if (maintenanceCurrentPage > totalPages) maintenanceCurrentPage = totalPages;
        if (maintenanceCurrentPage < 1) maintenanceCurrentPage = 1;
        const start = (maintenanceCurrentPage - 1) * pageSize;
        const pageItems = sorted.slice(start, start + pageSize);

        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Chưa có lịch bảo trì phù hợp</td></tr>';
            if (window.renderPagination) window.renderPagination('maintenancePagination', 1, 0, pageSize, 'maintenance');
            return;
        }

        const rows = pageItems.map(task => {
            const asset = assets.find(a => String(a.id) === String(task.asset_id));
            const assetName = asset ? `${asset.name}${asset.asset_code ? ` (${asset.asset_code})` : ''}` : 'Chưa gắn thiết bị';
            const isDone = task.status === DONE_STATUS;
            const statusClass = {
                'Chưa xử lý': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
                'Đang xử lý': 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
                'Hoàn thành': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
                'Quá hạn': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
            }[task.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
            // [RÀNG BUỘC] Lịch bảo trì đã "Hoàn thành" thì khóa Sửa/Xóa với người không phải admin
            const isLocked = isDone && !isAdmin;
            const btnClasses = "w-8 h-8 flex items-center justify-center rounded-md transition-all";
            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40 maintenance-row cursor-pointer" data-id="${task.id}">
                    <td class="p-3 font-semibold text-slate-800 dark:text-slate-100">${task.title || '-'}</td>
                    <td class="p-3 text-slate-700 dark:text-slate-200">${assetName}</td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">${formatDateDisplay(task.due_date)}</td>
                    <td class="p-3 text-center"><span class="px-2.5 py-1 text-xs font-semibold rounded-full ${statusClass}">${task.status || '-'}</span></td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">${task.note || '-'}</td>
                    <td class="p-3 text-right whitespace-nowrap">
                        <div class="flex gap-2 justify-end">
                            ${!isDone ? `<div class="tooltip"><button data-action="complete-maint" data-id="${task.id}" class="${btnClasses} text-green-600 hover:bg-green-100"><i class="fa-solid fa-check"></i></button><span class="tooltiptext">Hoàn thành</span></div>` : (isAdmin ? `<div class="tooltip"><button data-action="reopen-maint" data-id="${task.id}" class="${btnClasses} text-amber-600 hover:bg-amber-100"><i class="fa-solid fa-rotate-left"></i></button><span class="tooltiptext">Mở lại</span></div>` : '')}
                            ${!isLocked ? `<div class="tooltip"><button data-action="edit-maint" data-id="${task.id}" class="${btnClasses} text-blue-600 hover:bg-blue-100"><i class="fa-solid fa-pen"></i></button><span class="tooltiptext">Sửa</span></div><div class="tooltip"><button data-action="delete-maint" data-id="${task.id}" class="${btnClasses} text-red-600 hover:bg-red-100"><i class="fa-solid fa-trash"></i></button><span class="tooltiptext">Xóa</span></div>` : '<span class="text-xs text-slate-400 italic self-center">Đã khóa</span>'}
                        </div>
                    </td>
                </tr>`;
        });
        tbody.innerHTML = rows.join('');
        if (window.renderPagination) window.renderPagination('maintenancePagination', maintenanceCurrentPage, sorted.length, pageSize, 'maintenance');
    }

    function renderStockCheckList() {
        const tbody = document.getElementById('stockCheckTableBody');
        if (!tbody) return;
        const isAdmin = currentUserProfile.role === 'admin';

        const allChecks = (stockChecks || []).slice();

        // Cập nhật thẻ thống kê
        const totalEl = document.getElementById('stockTotalCount');
        const openEl = document.getElementById('stockOpenCount');
        const doneEl = document.getElementById('stockDoneCount');
        const itemsEl = document.getElementById('stockTotalItemsCount');

        if (totalEl) totalEl.textContent = allChecks.length;
        if (openEl) openEl.textContent = allChecks.filter(s => s.status === 'Đang mở').length;
        if (doneEl) doneEl.textContent = allChecks.filter(s => s.status === 'Hoàn thành').length;
        if (itemsEl) itemsEl.textContent = (stockCheckItems || []).length;

        const searchInput = document.getElementById('filterStockCheckSearch') || (document.getElementById('assetTableBody') ? null : document.getElementById('searchInput'));
        const statusSelect = document.getElementById('filterStockCheckStatus');

        let filtered = allChecks;
        if (statusSelect && statusSelect.value) {
            filtered = filtered.filter(s => s.status === statusSelect.value);
        }
        if (searchInput && searchInput.value.trim()) {
            const q = normalizeString(searchInput.value.trim());
            filtered = filtered.filter(s => {
                const searchStr = normalizeString(`${s.name || ''} ${s.note || ''}`);
                return searchStr.includes(q);
            });
        }

        const sorted = filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        const pageSize = 10;
        const totalPages = Math.ceil(sorted.length / pageSize) || 1;
        if (stockCheckCurrentPage > totalPages) stockCheckCurrentPage = totalPages;
        if (stockCheckCurrentPage < 1) stockCheckCurrentPage = 1;
        const start = (stockCheckCurrentPage - 1) * pageSize;
        const pageItems = sorted.slice(start, start + pageSize);

        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500">Chưa có đợt kiểm kê phù hợp</td></tr>';
            if (window.renderPagination) window.renderPagination('stockCheckPagination', 1, 0, pageSize, 'stock');
            return;
        }

        const rows = pageItems.map(item => {
            const isDone = item.status === DONE_STATUS;
            const statusClass = {
                'Đang mở': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
                'Hoàn thành': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
            }[item.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
            // [RÀNG BUỘC] Đợt kiểm kê đã "Hoàn thành" (đóng) thì khóa Sửa/Xóa + toàn bộ checklist
            const isLocked = isDone && !isAdmin;
            const btnClasses = "w-8 h-8 flex items-center justify-center rounded-md transition-all";
            const itemCount = (stockCheckItems || []).filter(ci => ci.stock_check_id === item.id).length;
            const detailText = [item.note, itemCount > 0 ? `(${itemCount} tài sản)` : ''].filter(Boolean).join(' • ') || 'Kiểm kê định kỳ';
            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40 stock-row cursor-pointer" data-id="${item.id}">
                    <td class="p-3 font-semibold text-slate-800 dark:text-slate-100">${item.name || item.note || ('Đợt kiểm kê #' + item.id)}</td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">${formatDateDisplay(item.started_at)}</td>
                    <td class="p-3 text-center"><span class="px-2.5 py-1 text-xs font-semibold rounded-full ${statusClass}">${item.status || '-'}</span></td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">${detailText}</td>
                    <td class="p-3 text-right whitespace-nowrap">
                        <div class="flex gap-2 justify-end">
                            ${!isDone ? `<div class="tooltip"><button data-action="complete-stock" data-id="${item.id}" class="${btnClasses} text-green-600 hover:bg-green-100"><i class="fa-solid fa-check"></i></button><span class="tooltiptext">Hoàn thành</span></div>` : (isAdmin ? `<div class="tooltip"><button data-action="reopen-stock" data-id="${item.id}" class="${btnClasses} text-amber-600 hover:bg-amber-100"><i class="fa-solid fa-rotate-left"></i></button><span class="tooltiptext">Mở lại</span></div>` : '')}
                            ${!isLocked ? `<div class="tooltip"><button data-action="edit-stock" data-id="${item.id}" class="${btnClasses} text-blue-600 hover:bg-blue-100"><i class="fa-solid fa-pen"></i></button><span class="tooltiptext">Sửa</span></div><div class="tooltip"><button data-action="delete-stock" data-id="${item.id}" class="${btnClasses} text-red-600 hover:bg-red-100"><i class="fa-solid fa-trash"></i></button><span class="tooltiptext">Xóa</span></div>` : '<span class="text-xs text-slate-400 italic self-center">Đã khóa</span>'}
                        </div>
                    </td>
                </tr>`;
        });
        tbody.innerHTML = rows.join('');
        if (window.renderPagination) window.renderPagination('stockCheckPagination', stockCheckCurrentPage, sorted.length, pageSize, 'stock');
    }

    function renderAssignmentList() {
        const container = document.getElementById('assignmentContent');
        if (!container) return;

        const activeTableBody = document.getElementById('activeAssignmentsTableBody');
        const historyTableBody = document.getElementById('assignmentHistoryTableBody');

        // 1. Thống kê (Stat cards)
        const allAssets = (assets || []).slice();
        const activeAssigned = allAssets.filter(a => a.status === 'Active');
        const stockAssets = allAssets.filter(a => a.status === 'Stock');
        const allHist = (assetHistory || []).slice();
        const checkouts = allHist.filter(h => (h.action || '').includes('Cấp phát'));
        const checkins = allHist.filter(h => (h.action || '').includes('Thu hồi'));
        const allAssignTransactions = allHist.filter(h => {
            const act = h.action || '';
            return act.includes('Cấp phát') || act.includes('Thu hồi') || act.includes('Điều chuyển');
        });

        const activeCountEl = document.getElementById('assignActiveCount');
        const stockCountEl = document.getElementById('assignStockCount');
        const checkoutsEl = document.getElementById('assignTotalCheckouts');
        const checkinsEl = document.getElementById('assignTotalCheckins');
        const badgeActiveEl = document.getElementById('badgeActiveCount');
        const badgeHistoryEl = document.getElementById('badgeHistoryCount');

        if (activeCountEl) activeCountEl.textContent = activeAssigned.length;
        if (stockCountEl) stockCountEl.textContent = stockAssets.length;
        if (checkoutsEl) checkoutsEl.textContent = checkouts.length;
        if (checkinsEl) checkinsEl.textContent = checkins.length;
        if (badgeActiveEl) badgeActiveEl.textContent = activeAssigned.length;
        if (badgeHistoryEl) badgeHistoryEl.textContent = allAssignTransactions.length;

        if (typeof window.initAssignmentDropdowns === 'function') {
            window.initAssignmentDropdowns();
        }

        // 2. Quản lý Tab hiển thị
        const isHistoryTab = window.assignCurrentTab === 'history';
        const viewActive = document.getElementById('viewActiveAssignments');
        const viewHistory = document.getElementById('viewHistoryAssignments');
        const tabBtnActive = document.getElementById('tabBtnActive');
        const tabBtnHistory = document.getElementById('tabBtnHistory');
        const historyFilterControls = document.getElementById('historyFilterControls');

        if (isHistoryTab) {
            if (viewActive) viewActive.classList.add('hidden');
            if (viewHistory) viewHistory.classList.remove('hidden');
            if (historyFilterControls) historyFilterControls.classList.remove('hidden');

            if (tabBtnHistory) {
                tabBtnHistory.className = "pb-3 text-sm font-bold text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400 flex items-center gap-2";
            }
            if (tabBtnActive) {
                tabBtnActive.className = "pb-3 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2";
            }
        } else {
            if (viewActive) viewActive.classList.remove('hidden');
            if (viewHistory) viewHistory.classList.add('hidden');
            if (historyFilterControls) historyFilterControls.classList.add('hidden');

            if (tabBtnActive) {
                tabBtnActive.className = "pb-3 text-sm font-bold text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400 flex items-center gap-2";
            }
            if (tabBtnHistory) {
                tabBtnHistory.className = "pb-3 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2";
            }
        }

        // Tìm kiếm chung
        const searchInput = document.getElementById('filterAssignSearch') || (document.getElementById('assetTableBody') ? null : document.getElementById('searchInput'));
        const searchVal = searchInput ? normalizeString(searchInput.value.trim()) : '';

        // 3. Render View 1: Thiết bị đang cấp phát
        if (activeTableBody) {
            let filteredActive = activeAssigned;
            if (searchVal) {
                filteredActive = filteredActive.filter(a => {
                    const u = (users || []).find(u => String(u.id) === String(a.user_id)) || {};
                    const uName = u.name || a.user || '';
                    const uDept = u.department || '';
                    const searchStr = normalizeString(`${a.name || ''} ${a.asset_code || ''} ${a.category || ''} ${a.location || ''} ${uName} ${uDept}`);
                    return searchStr.includes(searchVal);
                });
            }

            const sortedActive = filteredActive.sort((a, b) => new Date(b.assigned_date || b.created_at || 0) - new Date(a.assigned_date || a.created_at || 0));
            const pageSize = 10;
            const totalPages = Math.ceil(sortedActive.length / pageSize) || 1;
            if (window.assignActiveCurrentPage > totalPages) window.assignActiveCurrentPage = totalPages;
            if (window.assignActiveCurrentPage < 1) window.assignActiveCurrentPage = 1;
            const start = (window.assignActiveCurrentPage - 1) * pageSize;
            const pageItems = sortedActive.slice(start, start + pageSize);

            if (pageItems.length === 0) {
                activeTableBody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 dark:text-slate-400">Không có thiết bị đang cấp phát nào phù hợp</td></tr>';
                if (window.renderPagination) window.renderPagination('activeAssignmentsPagination', 1, 0, pageSize, 'assign-active');
            } else {
                activeTableBody.innerHTML = pageItems.map(asset => {
                    const u = (users || []).find(user => String(user.id) === String(asset.user_id)) || {};
                    const userName = u.name || asset.user || 'Chưa rõ';
                    const userEmail = u.email || '';
                    const userDept = u.department || 'Chưa phân bổ';
                    const location = asset.location || 'Văn phòng chính';
                    const code = asset.asset_code || asset.id;
                    const dateStr = asset.assigned_date ? formatDateDisplay(asset.assigned_date) : 'Chưa ghi nhận';

                    return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td class="p-4">
                            <div class="font-semibold text-slate-800 dark:text-slate-100">${asset.name || '-'}</div>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${code}</span>
                                <span class="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">${asset.category || 'Thiết bị'}</span>
                            </div>
                        </td>
                        <td class="p-4">
                            <div class="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <i class="fa-solid fa-user text-xs text-slate-400"></i>
                                <span>${userName}</span>
                            </div>
                            ${userEmail ? `<div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${userEmail}</div>` : ''}
                        </td>
                        <td class="p-4 text-slate-600 dark:text-slate-300">
                            <div>${userDept}</div>
                            <div class="text-xs text-slate-400 mt-0.5"><i class="fa-solid fa-location-dot text-[10px] mr-1"></i>${location}</div>
                        </td>
                        <td class="p-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                            ${dateStr}
                        </td>
                        <td class="p-4">
                            <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                Đang sử dụng
                            </span>
                        </td>
                        <td class="p-4 text-right whitespace-nowrap">
                            <div class="flex gap-2 justify-end">
                                <div class="tooltip">
                                    <button data-action="open-return-asset" data-id="${asset.id}" class="w-8 h-8 flex items-center justify-center rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 transition-all">
                                        <i class="fa-solid fa-rotate-left"></i>
                                    </button>
                                    <span class="tooltiptext">Thu hồi về kho</span>
                                </div>
                                <div class="tooltip">
                                    <button data-action="open-transfer-asset" data-id="${asset.id}" class="w-8 h-8 flex items-center justify-center rounded-md bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 transition-all">
                                        <i class="fa-solid fa-shuffle"></i>
                                    </button>
                                    <span class="tooltiptext">Điều chuyển</span>
                                </div>
                                <div class="tooltip">
                                    <button data-action="view-receipt" data-id="${asset.id}" class="w-8 h-8 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition-all">
                                        <i class="fa-solid fa-file-invoice"></i>
                                    </button>
                                    <span class="tooltiptext">In biên bản</span>
                                </div>
                            </div>
                        </td>
                    </tr>`;
                }).join('');
                if (window.renderPagination) window.renderPagination('activeAssignmentsPagination', window.assignActiveCurrentPage, sortedActive.length, pageSize, 'assign-active');
            }
        }

        // 4. Render View 2: Lịch sử bàn giao / thu hồi
        if (historyTableBody) {
            let filteredHistory = allAssignTransactions;
            const typeFilter = document.getElementById('filterAssignType')?.value;
            if (typeFilter) {
                filteredHistory = filteredHistory.filter(h => (h.action || '').includes(typeFilter));
            }
            if (searchVal) {
                filteredHistory = filteredHistory.filter(h => {
                    const asset = (assets || []).find(a => String(a.id) === String(h.assetId));
                    const code = asset?.asset_code || '';
                    const searchStr = normalizeString(`${h.assetName || ''} ${code} ${h.action || ''} ${h.desc || ''} ${h.createdBy || ''}`);
                    return searchStr.includes(searchVal);
                });
            }

            const sortedHistory = filteredHistory.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            const pageSize = 10;
            const totalPages = Math.ceil(sortedHistory.length / pageSize) || 1;
            if (window.assignHistoryCurrentPage > totalPages) window.assignHistoryCurrentPage = totalPages;
            if (window.assignHistoryCurrentPage < 1) window.assignHistoryCurrentPage = 1;
            const start = (window.assignHistoryCurrentPage - 1) * pageSize;
            const pageItems = sortedHistory.slice(start, start + pageSize);

            if (pageItems.length === 0) {
                historyTableBody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 dark:text-slate-400">Không có lịch sử giao dịch phù hợp</td></tr>';
                if (window.renderPagination) window.renderPagination('assignmentPagination', 1, 0, pageSize, 'assign-history');
            } else {
                historyTableBody.innerHTML = pageItems.map(h => {
                    const asset = (assets || []).find(a => String(a.id) === String(h.assetId));
                    const code = asset?.asset_code || '';
                    const act = h.action || '';
                    let badgeClass = "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
                    let actionText = act.replace(/^\[.*?\]\s*/, '');
                    if (act.includes('Cấp phát')) badgeClass = "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
                    else if (act.includes('Thu hồi')) badgeClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
                    else if (act.includes('Điều chuyển')) badgeClass = "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300";

                    return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td class="p-4 text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            ${h.time || (h.created_at ? new Date(h.created_at).toLocaleString('vi-VN') : '-')}
                        </td>
                        <td class="p-4">
                            <div class="font-semibold text-slate-800 dark:text-slate-100">${h.assetName || '-'}</div>
                            ${code ? `<span class="text-xs font-mono text-slate-500 dark:text-slate-400">${code}</span>` : ''}
                        </td>
                        <td class="p-4 text-center whitespace-nowrap">
                            <span class="px-2.5 py-1 text-xs font-semibold rounded-full ${badgeClass}">
                                ${actionText}
                            </span>
                        </td>
                        <td class="p-4 text-slate-700 dark:text-slate-200 text-xs">
                            ${h.desc || '-'}
                        </td>
                        <td class="p-4 text-xs text-slate-600 dark:text-slate-300">
                            <span class="font-medium">${h.createdBy || 'Admin'}</span>
                        </td>
                        <td class="p-4 text-right whitespace-nowrap">
                            <div class="tooltip">
                                <button data-action="view-receipt-history" data-id="${h.assetId}" data-log-id="${h.id}" class="w-8 h-8 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition-all">
                                    <i class="fa-solid fa-file-invoice"></i>
                                </button>
                                <span class="tooltiptext">Xem biên bản</span>
                            </div>
                        </td>
                    </tr>`;
                }).join('');
                if (window.renderPagination) window.renderPagination('assignmentPagination', window.assignHistoryCurrentPage, sortedHistory.length, pageSize, 'assign-history');
            }
        }
    }

    // Ghi log hoạt động; ưu tiên Supabase, nếu lỗi thì chỉ log console để không chặn flow
    async function addLog(entityId, entityType, action, desc) {
        try {
            const payload = {
                asset_id: entityId,
                action: `[${entityType}] ${action}`,
                description: desc || '',
                created_by: currentUserProfile?.id || null,
                created_by_name: currentUserProfile?.full_name || currentUserProfile?.email || 'Admin',
                created_at: new Date().toISOString()
            };
            await supabaseClient.from('asset_history').insert(payload);
        } catch (err) {
            console.warn('addLog failed', err, { entityId, entityType, action });
        }
    }

    // Xuất CSV nhanh (không phụ thuộc XLSX)
    function exportToCSV(rows, filename) {
        if (window.QLTSHelpers && typeof window.QLTSHelpers.exportToCSV === 'function') {
            return window.QLTSHelpers.exportToCSV(rows, filename);
        }
        if (!rows || rows.length === 0) return showInfoModal('Không có dữ liệu để xuất');
        const headers = Object.keys(rows[0]);
        const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => {
            const val = r[h] == null ? '' : r[h].toString().replace(/"/g, '""');
            return `"${val}"`;
        }).join(','))).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename || 'export.csv'; a.click();
        URL.revokeObjectURL(url);
    }

    // 3. Hàm hiển thị (ĐÃ CẬP NHẬT TỰ TÌM TÊN CỘT & HIỂN THỊ)
    // Map trạng thái tiếng Việt → English key
    const STATUS_REVERSE_MAP = {};
    Object.entries(STATUS_MAP).forEach(([key, val]) => {
        STATUS_REVERSE_MAP[normalizeString(val.text)] = key;
    });

    function renderLicenseImportPreview(data) {
        const tbody = document.getElementById('licenseImportPreviewTableBody');
        tbody.innerHTML = '';
        tempImportedLicenses = [];

        if (data.length === 0) return;

        data.forEach(row => {
            // --- MAPPING CỘT: khớp với tên cột export ---
            const keyType = row['Loại Key'] || row['Loại key'] || row['Key Type'] || row['Type'] || '';
            const licenseKey = row['Mã Key'] || row['Mã key'] || row['License Key'] || row['Key'] || row['Serial'] || '';
            const packageType = row['Gói'] || row['Loại gói gia hạn'] || row['Package'] || row['Plan'] || '';
            const rawDate = row['Hạn SD'] || row['Ngày hết hạn'] || row['Expiration Date'] || row['Date'] || '';
            const userName = row['Người dùng'] || row['Người sử dụng'] || row['User'] || row['Account'] || row['Name'] || row['Họ tên'] || row['Họ và tên'] || row['Nhân viên'] || '';
            const rawStatus = row['Trạng thái'] || row['Status'] || '';
            const notes = row['Ghi chú'] || row['Notes'] || '';

            // Xử lý ngày: "Vĩnh viễn" → null, "Hạn dd/mm/yyyy" → strip prefix
            let cleanDate = null;
            const dateStr = rawDate.toString().trim();
            if (!dateStr || normalizeString(dateStr) === 'vinh vien' || dateStr.toLowerCase() === 'permanent') {
                cleanDate = null; // Vĩnh viễn / permanent → no expiration
            } else {
                // Strip "Hạn " prefix if present
                const stripped = dateStr.replace(/^Hạn\s*/i, '').trim();
                cleanDate = parseDateToISO(stripped);
            }

            const dateDisplay = cleanDate
                ? formatDateDisplay(cleanDate)
                : (dateStr && normalizeString(dateStr) !== 'vinh vien' && dateStr.toLowerCase() !== 'permanent'
                    ? '<span class="text-red-500 text-xs italic">Sai/Thiếu ngày</span>'
                    : '<span class="text-slate-400 italic">Vĩnh viễn</span>');

            // Tìm user trong hệ thống
            const foundUser = users.find(u => normalizeString(u.name) === normalizeString(userName));

            // Xác định status: ưu tiên cột Trạng thái từ Excel, fallback theo user
            let status = 'Stock';
            if (rawStatus) {
                const mapped = STATUS_REVERSE_MAP[normalizeString(rawStatus)];
                status = mapped || rawStatus; // Nếu đã là English key thì giữ nguyên
                // Fallback: nếu vẫn là tiếng Việt, thử exact match
                if (!STATUS_MAP[status]) {
                    status = foundUser ? 'Active' : 'Stock';
                }
            } else {
                status = foundUser ? 'Active' : 'Stock';
            }

            let userDisplayHTML = '';
            let userClass = '';

            if (foundUser) {
                userDisplayHTML = foundUser.name;
                userClass = 'text-green-600 font-bold';
            } else if (userName) {
                userDisplayHTML = `${userName} <span class="text-xs">(Sẽ tạo mới)</span>`;
                userClass = 'text-amber-600 font-semibold';
            } else {
                userDisplayHTML = '<span class="text-slate-300 italic">Chưa phân bổ</span>';
                userClass = 'text-slate-400';
            }

            const statusText = STATUS_MAP[status]?.text || status;
            const statusClass = status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : status === 'Stock' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' : status === 'Expired' ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

            tempImportedLicenses.push({
                key_type: keyType,
                license_key: licenseKey,
                package_type: packageType,
                expiration_date: cleanDate,
                user_id: foundUser ? foundUser.id : null,
                user: foundUser ? foundUser.name : (userName || ''),
                status: status,
                notes: notes
            });

            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-slate-50";
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-slate-700">${keyType}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-500">${licenseKey}</td>
                <td class="px-4 py-3 text-slate-600">${packageType}</td>
                <td class="px-4 py-3 text-slate-600">${dateDisplay}</td>
                <td class="px-4 py-3 ${userClass}">${userDisplayHTML}</td>
                <td class="px-4 py-3"><span class="px-2 py-1 rounded text-xs ${statusClass}">${statusText}</span></td>
            `;
            tbody.appendChild(tr);
        });

        if (tempImportedLicenses.length > 0) {
            btnSaveImportedLicenses.disabled = false;
            btnSaveImportedLicenses.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    // 4. Sự kiện nút Lưu - Tự động tạo user mới nếu chưa có
    if (btnSaveImportedLicenses) {
        btnSaveImportedLicenses.addEventListener('click', async () => {
            if (tempImportedLicenses.length === 0) return;

            btnSaveImportedLicenses.textContent = "Đang lưu...";
            btnSaveImportedLicenses.disabled = true;

            try {
                // Bước 1: Tìm các user chưa có trong hệ thống và tạo mới
                const missingUserNames = [...new Set(
                    tempImportedLicenses
                        .filter(l => l.user && !l.user_id)
                        .map(l => l.user)
                )];

                let newUsersCreated = 0;
                for (const name of missingUserNames) {
                    const payload = {
                        name: name,
                        email: '',
                        department_id: null,
                        status: 'Active',
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
                    };
                    const { error } = await supabaseClient.from('users').insert(payload);
                    if (!error) newUsersCreated++;
                }

                // Bước 2: Reload users để lấy ID của user vừa tạo
                if (newUsersCreated > 0) {
                    const { data: freshUsers } = await supabaseClient.from('users').select();
                    if (freshUsers) users = freshUsers;
                }

                // Bước 3: Gắn lại user_id và status cho các license có user mới tạo
                tempImportedLicenses.forEach(lic => {
                    if (lic.user && !lic.user_id) {
                        const found = users.find(u => normalizeString(u.name) === normalizeString(lic.user));
                        if (found) {
                            lic.user_id = found.id;
                            lic.user = found.name;
                            if (lic.status === 'Stock') lic.status = 'Active';
                        }
                    }
                });

                // Bước 4: Insert licenses
                const { error } = await supabaseClient.from('licenses').insert(tempImportedLicenses);
                if (error) throw error;

                const msg = newUsersCreated > 0
                    ? `Đã import ${tempImportedLicenses.length} license và tạo mới ${newUsersCreated} user!`
                    : `Đã import thành công ${tempImportedLicenses.length} license!`;
                showInfoModal(msg, "Thành công");
                safeCloseModal('importLicenseModal');

                await fetchAllData();
                renderTableLicenses(licenses);
                updateDashboard();

            } catch (err) {
                handleSupabaseError(err, "nhập License");
            } finally {
                btnSaveImportedLicenses.textContent = "Lưu vào cơ sở dữ liệu";
                btnSaveImportedLicenses.disabled = false;
            }
        });
    }
    // =================================================================
    // [MỚI] TÌM KIẾM TOÀN CỤC (Tài sản + License + Nhân viên)
    // =================================================================
    function performGlobalSearch(term) {
        const q = normalizeString(term);
        if (!q) return { assetsRes: [], licensesRes: [], usersRes: [] };
        const assetsRes = assets.filter(a => normalizeString([a.name, a.asset_code, a.config, a.category, a.user, a.location].filter(Boolean).join(' ')).includes(q)).slice(0, 8);
        const licensesRes = licenses.filter(l => normalizeString([l.key_type, l.license_key, l.license_code, l.user, l.package_type].filter(Boolean).join(' ')).includes(q)).slice(0, 8);
        const usersRes = users.filter(u => normalizeString([u.name, u.email, u.department, u.phone].filter(Boolean).join(' ')).includes(q)).slice(0, 8);
        return { assetsRes, licensesRes, usersRes };
    }

    function renderGlobalSearchResults(term) {
        const container = document.getElementById('globalSearchResults');
        if (!container) return;
        const q = (term || '').trim();
        if (!q) { container.innerHTML = '<p class="text-sm text-slate-400 text-center p-4">Nhập từ khóa để tìm kiếm...</p>'; return; }
        const { assetsRes, licensesRes, usersRes } = performGlobalSearch(q);
        if (!assetsRes.length && !licensesRes.length && !usersRes.length) {
            container.innerHTML = '<p class="text-sm text-slate-400 text-center p-4">Không tìm thấy kết quả nào.</p>';
            return;
        }
        const escapedQ = encodeURIComponent(q);
        const row = (icon, color, title, subtitle, href) => `
            <a href="${href}" class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <i class="fa-solid ${icon} ${color} w-5 text-center"></i>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-700 dark:text-gray-200 truncate">${title}</p>
                    <p class="text-xs text-slate-400 truncate">${subtitle}</p>
                </div>
            </a>`;
        const section = (title, items) => items.length ? `<div class="mb-2"><p class="text-xs font-bold text-slate-400 uppercase px-2 py-1">${title} (${items.length})</p>${items.join('')}</div>` : '';

        container.innerHTML = [
            section('Tài sản', assetsRes.map(a => row('fa-box', 'text-blue-500', a.name, [a.asset_code, a.user ? `Người dùng: ${a.user}` : null].filter(Boolean).join(' • ') || a.category || '', `assets.html?q=${escapedQ}`))),
            section('License', licensesRes.map(l => row('fa-key', 'text-green-500', l.key_type, [l.license_key, l.user ? `Người dùng: ${l.user}` : null].filter(Boolean).join(' • '), `licenses.html?q=${escapedQ}`))),
            section('Nhân viên', usersRes.map(u => row('fa-user', 'text-indigo-500', u.name, [u.email, u.department].filter(Boolean).join(' • '), `users.html?q=${escapedQ}`)))
        ].join('');
    }

    // Nếu được điều hướng tới từ modal tìm kiếm toàn cục (?q=...), tự áp dụng từ khóa
    // vào ô tìm kiếm sẵn có của trang này ngay khi tải xong dữ liệu lần đầu.
    function applyGlobalSearchParamIfAny() {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        if (!q) return;
        const assetInput = document.getElementById('searchInput');
        if (assetInput && document.getElementById('assetTableBody')) { assetInput.value = q; window.applyAssetFilters(); return; }
        if (assetInput && document.getElementById('licenseTableBody')) { assetInput.value = q; window.applyLicenseFilters(); return; }
        if (assetInput && document.getElementById('maintenanceTableBody')) {
            assetInput.value = q;
            const sub = document.getElementById('filterMaintenanceSearch');
            if (sub) sub.value = q;
            maintenanceCurrentPage = 1;
            renderMaintenanceList();
            return;
        }
        if (assetInput && document.getElementById('stockCheckTableBody')) {
            assetInput.value = q;
            const sub = document.getElementById('filterStockCheckSearch');
            if (sub) sub.value = q;
            stockCheckCurrentPage = 1;
            renderStockCheckList();
            return;
        }
        if (assetInput && document.getElementById('assignmentContent')) {
            assetInput.value = q;
            const sub = document.getElementById('filterAssignSearch');
            if (sub) sub.value = q;
            window.assignActiveCurrentPage = 1;
            window.assignHistoryCurrentPage = 1;
            renderAssignmentList();
            return;
        }
        const userInput = document.getElementById('searchUserInput');
        if (userInput) { userInput.value = q; window.applyUserFilters(); }
    }

    // Lắng nghe sự kiện tìm kiếm & lọc trên trang maintenance.html, stock-checks.html, assignments.html
    const maintSearch = document.getElementById('filterMaintenanceSearch');
    const maintStatus = document.getElementById('filterMaintenanceStatus');
    if (maintSearch) maintSearch.addEventListener('input', () => { maintenanceCurrentPage = 1; renderMaintenanceList(); });
    if (maintStatus) maintStatus.addEventListener('change', () => { maintenanceCurrentPage = 1; renderMaintenanceList(); });

    const stockSearch = document.getElementById('filterStockCheckSearch');
    const stockStatus = document.getElementById('filterStockCheckStatus');
    if (stockSearch) stockSearch.addEventListener('input', () => { stockCheckCurrentPage = 1; renderStockCheckList(); });
    if (stockStatus) stockStatus.addEventListener('change', () => { stockCheckCurrentPage = 1; renderStockCheckList(); });

    const assignSearch = document.getElementById('filterAssignSearch');
    const assignType = document.getElementById('filterAssignType');
    if (assignSearch) assignSearch.addEventListener('input', () => {
        window.assignActiveCurrentPage = 1;
        window.assignHistoryCurrentPage = 1;
        renderAssignmentList();
    });
    if (assignType) assignType.addEventListener('change', () => {
        window.assignHistoryCurrentPage = 1;
        renderAssignmentList();
    });

    // Top search input trên maintenance, stock-checks, assignments
    const topSearch = document.getElementById('searchInput');
    if (topSearch && !document.getElementById('assetTableBody') && !document.getElementById('licenseTableBody')) {
        topSearch.addEventListener('input', () => {
            if (document.getElementById('maintenanceTableBody')) {
                const sub = document.getElementById('filterMaintenanceSearch');
                if (sub) sub.value = topSearch.value;
                maintenanceCurrentPage = 1;
                renderMaintenanceList();
            } else if (document.getElementById('stockCheckTableBody')) {
                const sub = document.getElementById('filterStockCheckSearch');
                if (sub) sub.value = topSearch.value;
                stockCheckCurrentPage = 1;
                renderStockCheckList();
            } else if (document.getElementById('assignmentContent')) {
                const sub = document.getElementById('filterAssignSearch');
                if (sub) sub.value = topSearch.value;
                window.assignActiveCurrentPage = 1;
                window.assignHistoryCurrentPage = 1;
                renderAssignmentList();
            }
        });
    }

    window.performGlobalSearch = performGlobalSearch;
    window.renderGlobalSearchResults = renderGlobalSearchResults;
    window.applyGlobalSearchParamIfAny = applyGlobalSearchParamIfAny;
    window.fetchAllData = fetchAllData;
    window.safeCloseModal = safeCloseModal;
    window.attemptCloseModal = attemptCloseModal;
    window.showConfirmationModal = showConfirmationModal;
    window.checkAndDisplayNotifications = checkAndDisplayNotifications;
    window.applyRoleBasedUI = applyRoleBasedUI;
    window.updateHeaderUserInfo = updateHeaderUserInfo;
    window.parseDateToISO = parseDateToISO;
    window.formatDateDisplay = formatDateDisplay;
    window.renderMaintenanceList = renderMaintenanceList;
    window.renderStockCheckList = renderStockCheckList;
    window.renderAssignmentList = renderAssignmentList;
    window.addLog = addLog;
    window.exportToCSV = exportToCSV;
    window.renderLicenseImportPreview = renderLicenseImportPreview;
};

