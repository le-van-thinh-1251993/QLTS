window.QLTSPageSettings = window.QLTSPageSettings || {};
window.QLTSPageSettings.init = async function () {
    // =================================================================

    // Không cho phép chọn/nhập ngày trong quá khứ ở các ô ngày mang tính "dự kiến/còn hiệu lực"
    // (hạn dùng license, ngày dự kiến bảo trì, ngày dự kiến kiểm kê). So sánh dạng chuỗi YYYY-MM-DD
    // để tránh lệch múi giờ khi dùng đối tượng Date.
    function getTodayDateStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function isPastDateStr(dateStr) {
        return !!dateStr && dateStr < getTodayDateStr();
    }
    // Lưu ý: không set thuộc tính "min" cho modal_expirationDate - form Sửa License dùng lại
    // đúng input này, và trình duyệt sẽ tự chặn submit (không bắn cả sự kiện 'submit') nếu value
    // hiện tại < min, kể cả khi giá trị đó vốn đã có sẵn từ trước (license cũ đã hết hạn thật).
    // Validate hoàn toàn bằng JS (xem isPastDateStr ở dưới) để có thể phân biệt "giữ nguyên ngày cũ"
    // và "chọn ngày quá khứ mới".
    ['maintenance_due', 'stockcheck_date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.min = getTodayDateStr();
    });

    function renderSettingsPage() {
        if (!document.getElementById('settingsContent') || !currentUserProfile) return;

        // 1. Populate Profile Card
        document.getElementById('profile-name').textContent = currentUserProfile.full_name || 'Chưa có tên';
        document.getElementById('profile-email').textContent = currentUserProfile.email;
        const ROLE_MAP = { admin: 'Quản trị viên', editor: 'Biên tập viên', viewer: 'Người xem' };
        document.getElementById('profile-role').textContent = ROLE_MAP[currentUserProfile.role] || currentUserProfile.role;
        const avatarImg = document.getElementById('profile-avatar');
        if (currentUserProfile.avatar_url) {
            avatarImg.src = currentUserProfile.avatar_url;
        } else {
            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserProfile.full_name || currentUserProfile.email)}&background=random`;
        }

        // 2. Populate My Assets & Licenses
        const myAssets = assets.filter(a => a.user_id === currentUserProfile.id);
        const myLicenses = licenses.filter(l => l.user_id === currentUserProfile.id);

        const assetsTbody = document.getElementById('my-assets-table');
        if (myAssets.length > 0) {
            assetsTbody.innerHTML = myAssets.map(a => {
                const statusInfo = STATUS_MAP[a.status] || { text: a.status, classes: 'bg-gray-100' };
                return `<tr><td class="p-3">${a.name}</td><td class="p-3">${a.category}</td><td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo.classes}">${statusInfo.text}</span></td></tr>`;
            }).join('');
        } else {
            assetsTbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400 italic">Bạn chưa giữ thiết bị nào.</td></tr>';
        }

        const licensesTbody = document.getElementById('my-licenses-table');
        if (myLicenses.length > 0) {
            licensesTbody.innerHTML = myLicenses.map(l => `<tr><td class="p-3">${l.key_type}</td><td class="p-3">${l.package_type || 'N/A'}</td><td class="p-3">${l.expiration_date || 'Vĩnh viễn'}</td></tr>`).join('');
        } else {
            licensesTbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400 italic">Bạn chưa giữ license nào.</td></tr>';
        }

        const cfg = alertSettings[0] || {};
        const warrantyInput = document.getElementById('alert-warranty-days');
        const licenseInput = document.getElementById('alert-license-days');
        const maintenanceInput = document.getElementById('alert-maintenance-days');
        const emailsInput = document.getElementById('alert-emails');
        if (warrantyInput) warrantyInput.value = cfg.warranty_threshold_days || 30;
        if (licenseInput) licenseInput.value = cfg.license_threshold_days || 30;
        if (maintenanceInput) maintenanceInput.value = cfg.maintenance_threshold_days || 7;
        if (emailsInput) emailsInput.value = (cfg.emails || []).join(', ');

        const unitCodeInput = document.getElementById('unit-code-input');
        if (unitCodeInput && window.QLTSHelpers) unitCodeInput.value = window.QLTSHelpers.getUnitCode();

        renderActivityLog();
    }

    // Nhật ký hoạt động - chỉ hiển thị với admin. Nguồn dữ liệu: assetHistory
    // (bảng asset_history dùng chung cho mọi loại thao tác, xem addLog() trong page-data.js).
    const ACTIVITY_LOG_PAGE_SIZE = 15;
    const ACTIVITY_TYPE_LABELS = {
        ASSET: 'Tài sản', LICENSE: 'License', USER: 'Người dùng',
        CATEGORY: 'Danh mục', DEPARTMENT: 'Phòng ban', LICENSE_TYPE: 'Loại Key',
        MAINT: 'Bảo trì', STOCK_CHECK: 'Kiểm kê', SUPPLY: 'Vật tư/Linh kiện'
    };

    function getActivitySubjectName(log, typeKey, rows) {
        const subject = (rows[typeKey] || []).find(row => String(row.id) === String(log.assetId));
        if (subject?.name || subject?.key_type || subject?.title) return subject.name || subject.key_type || subject.title;
        const detailName = /(?:^|; )Tên(?: tài sản| đợt| vật tư)?\s*:\s*([^;]+)/i.exec(log.desc || '')?.[1];
        if (detailName) return detailName.trim();
        const actionName = /(?:Xóa tài sản|Xóa license|Xóa lịch bảo trì|Xóa mặt hàng):\s*([^;]+)/i.exec(log.desc || '')?.[1];
        if (actionName) return actionName.trim();
        const deletedLabels = { ASSET: 'Tài sản đã xóa', LICENSE: 'License đã xóa', USER: 'Nhân viên đã xóa', CATEGORY: 'Danh mục đã xóa', DEPARTMENT: 'Phòng ban đã xóa', LICENSE_TYPE: 'Loại key đã xóa', SUPPLIER: 'Nhà cung cấp đã xóa', MAINT: 'Lịch bảo trì đã xóa', STOCK_CHECK: 'Đợt kiểm kê đã xóa', SUPPLY: 'Vật tư đã xóa' };
        return deletedLabels[typeKey] || 'Bản ghi đã xóa';
    }

    function renderActivityLog() {
        const tabBtn = document.getElementById('activityLogTabBtn');
        const isAdmin = currentUserProfile && currentUserProfile.role === 'admin';
        if (tabBtn) tabBtn.classList.toggle('hidden', !isAdmin);

        const tbody = document.getElementById('activityLogTableBody');
        if (!tbody || !isAdmin) return;

        const sorted = (assetHistory || []).slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        const countEl = document.getElementById('activityLogCount');
        if (countEl) countEl.textContent = `${sorted.length} hoạt động`;

        const start = (activityLogCurrentPage - 1) * ACTIVITY_LOG_PAGE_SIZE;
        const pageItems = sorted.slice(start, start + ACTIVITY_LOG_PAGE_SIZE);

        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-500">Chưa có hoạt động nào.</td></tr>';
            if (window.renderPagination) window.renderPagination('activityLogPagination', 1, 0, ACTIVITY_LOG_PAGE_SIZE, 'activity');
            return;
        }

        tbody.innerHTML = pageItems.map(h => {
            const match = /^\[(\w+)\]\s*(.*)$/.exec(h.action || '');
            const typeKey = match ? match[1] : '';
            const actionText = match ? match[2] : (h.action || '');
            const typeLabel = ACTIVITY_TYPE_LABELS[typeKey] || typeKey || '-';
            const subjectRows = { ASSET: assets, LICENSE: licenses, USER: users, CATEGORY: categories, DEPARTMENT: departments, LICENSE_TYPE: licenseTypes, SUPPLIER: suppliers, MAINT: assets, STOCK_CHECK: stockChecks, SUPPLY: window.supplies || [] };
            const subjectName = getActivitySubjectName(h, typeKey, subjectRows);
            return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <td class="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">${h.time || ''}</td>
                <td class="p-3 text-slate-700 dark:text-slate-200">${typeLabel}</td>
                <td class="p-3 font-semibold text-blue-600 dark:text-blue-400">${actionText}</td>
                <td class="p-3 text-slate-600 dark:text-slate-300 max-w-sm truncate" title="${subjectName}">${subjectName}</td>
                <td class="p-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">${h.createdBy || 'Admin'}</td>
                <td class="p-3 text-right"><button type="button" class="activity-log-detail-btn text-blue-600 hover:text-blue-800 dark:text-blue-400" data-log-id="${h.id}" title="Xem chi tiết"><i class="fa-solid fa-eye"></i></button></td>
            </tr>`;
        }).join('');
        if (window.renderPagination) window.renderPagination('activityLogPagination', activityLogCurrentPage, sorted.length, ACTIVITY_LOG_PAGE_SIZE, 'activity');
    }
    window.renderActivityLog = renderActivityLog;

    document.getElementById('activityLogTableBody')?.addEventListener('click', (event) => {
        const button = event.target.closest('.activity-log-detail-btn');
        if (!button) return;
        const log = (assetHistory || []).find(item => String(item.id) === String(button.dataset.logId));
        if (!log) return;
        const match = /^(\[\w+\])\s*(.*)$/.exec(log.action || '');
        const typeKey = match ? match[1].slice(1, -1) : '';
        const subjectRows = { ASSET: assets, LICENSE: licenses, USER: users, CATEGORY: categories, DEPARTMENT: departments, LICENSE_TYPE: licenseTypes, SUPPLIER: suppliers, MAINT: assets, STOCK_CHECK: stockChecks, SUPPLY: window.supplies || [] };
        const subjectName = getActivitySubjectName(log, typeKey, subjectRows);
        const details = (log.desc || 'Không có thông tin chi tiết.').split(';').map(item => item.trim()).filter(Boolean);
        document.getElementById('activityLogDetailContent').innerHTML = `
            <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 mb-4">
                <strong>Thời gian</strong><span>${log.time || '-'}</span>
                <strong>Loại</strong><span>${ACTIVITY_TYPE_LABELS[typeKey] || typeKey || '-'}</span>
                <strong>Hành động</strong><span class="font-semibold text-blue-600">${match ? match[2] : log.action || '-'}</span>
                <strong>Đối tượng</strong><span>${subjectName}</span>
                <strong>Người thực hiện</strong><span>${log.createdBy || 'Admin'}</span>
            </div>
            <div class="border-t pt-3 dark:border-slate-700">
                <h4 class="font-semibold mb-2">Nội dung chi tiết</h4>
                <ul class="list-disc pl-5 space-y-1">${details.map(detail => `<li>${detail}</li>`).join('')}</ul>
            </div>`;
        openModal('activityLogDetailModal');
    });

    // Chuyển tab trong trang Cài đặt (wiring 1 lần, panel tương ứng bật/tắt qua class 'hidden')
    document.querySelectorAll('.settings-tab-btn').forEach((btn, idx) => {
        if (idx === 0) btn.classList.add('active');
        btn.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.querySelectorAll('.settings-tab-panel').forEach(panel => {
                panel.classList.toggle('hidden', panel.dataset.tabPanel !== tab);
            });
            if (tab === 'activity-log') renderActivityLog();
        });
    });

    document.getElementById('unit-code-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!window.QLTSHelpers) return;
        window.QLTSHelpers.setUnitCode(document.getElementById('unit-code-input').value);
        document.getElementById('unit-code-input').value = window.QLTSHelpers.getUnitCode();
        showInfoModal('Đã lưu mã đơn vị!');
    });

    // Edit Profile Logic
    document.getElementById('editProfileBtn')?.addEventListener('click', () => {
        document.getElementById('profile-update-name').value = currentUserProfile.full_name || '';
        document.getElementById('profile-update-avatar').value = currentUserProfile.avatar_url || '';
        openModal('editProfileModal');
    });

    document.getElementById('profile-update-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('profile-update-name').value;
        const newAvatar = document.getElementById('profile-update-avatar').value;

        if (!currentUserProfile) {
            showInfoModal('Không tìm thấy thông tin người dùng. Vui lòng tải lại trang.', 'Lỗi');
            return;
        }

        // [LOCAL-ONLY] Chưa có đăng nhập cloud (mục Auth đang tạm ẩn) nên profile
        // được lưu thẳng vào localStorage, không đi qua bảng 'profiles' của Supabase.
        try {
            const storedKey = 'qlts_current_user_profile';
            let stored = {};
            try { stored = JSON.parse(localStorage.getItem(storedKey) || '{}'); } catch (e) { stored = {}; }
            const merged = { ...stored, ...currentUserProfile, full_name: newName, avatar_url: newAvatar };
            localStorage.setItem(storedKey, JSON.stringify(merged));
            currentUserProfile.full_name = newName;
            currentUserProfile.avatar_url = newAvatar;
            showInfoModal('Cập nhật profile thành công!');
            safeCloseModal('editProfileModal');
            await refreshApp();
        } catch (err) {
            handleSupabaseError(err, 'lưu profile');
        }
    });

    // Change Password Logic
    document.getElementById('password-update-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword.length < 6) {
            return showInfoModal('Mật khẩu phải có ít nhất 6 ký tự.', 'Lỗi');
        }
        if (newPassword !== confirmPassword) {
            return showInfoModal('Mật khẩu xác nhận không khớp.', 'Lỗi');
        }

        // If Supabase auth client exists, use it
        if (typeof supabase_auth_client !== 'undefined' && supabase_auth_client && supabase_auth_client.auth && typeof supabase_auth_client.auth.updateUser === 'function') {
            const { error } = await supabase_auth_client.auth.updateUser({ password: newPassword });
            if (error) {
                handleSupabaseError(error, 'cập nhật mật khẩu');
            } else {
                showInfoModal('Cập nhật mật khẩu thành công!');
                e.target.reset();
            }
            return;
        }

        // Local-only mode: not supported
        showInfoModal('Đổi mật khẩu không được hỗ trợ ở chế độ local-only.', 'Lưu ý');
        e.target.reset();
    });

    // Dark Mode Logic
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const applyDarkMode = (isDark) => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            if(darkModeToggle) darkModeToggle.checked = true;
        } else {
            document.documentElement.classList.remove('dark');
            if(darkModeToggle) darkModeToggle.checked = false;
        }
    };

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            localStorage.setItem('darkMode', e.target.checked);
            applyDarkMode(e.target.checked);
        });
    }
    // Apply initial dark mode on load
    applyDarkMode(localStorage.getItem('darkMode') === 'true');

    document.getElementById('alert-settings-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            id: alertSettings[0]?.id,
            warranty_threshold_days: parseInt(document.getElementById('alert-warranty-days').value, 10) || 30,
            license_threshold_days: parseInt(document.getElementById('alert-license-days').value, 10) || 30,
            maintenance_threshold_days: parseInt(document.getElementById('alert-maintenance-days').value, 10) || 7,
            emails: (document.getElementById('alert-emails').value || '')
                .split(',')
                .map(e => e.trim())
                .filter(Boolean)
        };
        const { error } = await supabaseClient.from('alert_settings').upsert(payload, { onConflict: 'id' });
        if (error) return handleSupabaseError(error, 'lưu cấu hình cảnh báo');
        showInfoModal('Đã lưu cấu hình cảnh báo.');
        await refreshApp();
    });

    // Backup & Restore handlers
    document.getElementById('btnBackupData')?.addEventListener('click', () => {
        const data = LocalDB.downloadBackup();
        const statusEl = document.getElementById('backupStatus');
        if (statusEl) {
            const counts = `${data.ASSETS?.length || 0} tài sản, ${data.LICENSES?.length || 0} license, ${data.USERS?.length || 0} người dùng`;
            statusEl.textContent = `✓ Đã xuất lúc ${new Date().toLocaleString('vi-VN')} — ${counts}`;
            statusEl.classList.remove('hidden');
        }
    });

    document.getElementById('restoreFileInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const statusEl = document.getElementById('backupStatus');
        try {
            const data = await LocalDB.restoreFromFile(file);
            const counts = `${data.ASSETS?.length || 0} tài sản, ${data.LICENSES?.length || 0} license, ${data.USERS?.length || 0} người dùng`;
            if (statusEl) {
                statusEl.textContent = `✓ Đã khôi phục từ backup ${data._exportedAt || ''} — ${counts}`;
                statusEl.classList.remove('hidden');
            }
            showInfoModal(`Đã khôi phục dữ liệu thành công!\n${counts}`, 'Khôi phục thành công');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            if (statusEl) {
                statusEl.textContent = `✗ Lỗi: ${err.message}`;
                statusEl.classList.remove('hidden');
            }
            showInfoModal('File backup không hợp lệ.', 'Lỗi');
        }
        e.target.value = '';
    });

    document.getElementById('assetForm')?.addEventListener('submit', (e) => {
        const categoryValRaw = document.getElementById('modal_assetCategory').value;
        if (!categoryValRaw) {
            e.preventDefault();
            return showInfoModal('Vui lòng chọn loại tài sản.', 'Thiếu thông tin');
        }
        const costVal = parseFloat(document.getElementById('modal_assetCost').value) || 0;
        const salvageVal = parseFloat(document.getElementById('modal_assetSalvage').value) || 0;
        if (salvageVal > costVal) {
            e.preventDefault();
            return showInfoModal('Giá trị thu hồi không được lớn hơn giá trị mua.', 'Dữ liệu không hợp lệ');
        }
        // [RÀNG BUỘC] Thiết bị đang "Hỏng"/"Sửa chữa"/"Đã thanh lý" thì không được cấp phát cho ai.
        // Admin phải chuyển trạng thái về Trong kho/Đang dùng trước khi gán người dùng.
        const assetStatusVal = document.getElementById('modal_assetStatus').value;
        const hasAssetUserSelected = !!(userChoicesInstance?.getValue(true));
        if (['Repair', 'Broken', 'Disposed'].includes(assetStatusVal) && hasAssetUserSelected) {
            e.preventDefault();
            return showInfoModal('Thiết bị đang ở trạng thái "Sửa chữa"/"Hỏng"/"Đã thanh lý" nên không thể cấp phát cho người dùng. Vui lòng bỏ chọn người dùng hoặc cập nhật lại trạng thái trước khi lưu.', 'Không thể cấp phát');
        }
        if (assetStatusVal === 'Disposed' && !document.getElementById('modal_assetDisposedDate').value) {
            e.preventDefault();
            return showInfoModal('Vui lòng nhập ngày thanh lý.', 'Thiếu thông tin');
        }
        return handleFormSubmit(e, 'assets', () => {
        const isNew = !document.getElementById('modal_assetId').value;
        const categoryId = parseInt(document.getElementById('modal_assetCategory').value);
        const assignedUser = users.find(u => u.name === userChoicesInstance?.getValue(true));
        const supplierIdVal = document.getElementById('modal_assetSupplier').value;
        const isDisposed = assetStatusVal === 'Disposed';
        const payload = {
            id: document.getElementById('modal_assetId').value,
            name: document.getElementById('modal_assetName').value,
            config: document.getElementById('modal_assetConfig').value,
            location: document.getElementById('modal_assetLocation').value,
            purchase_date: document.getElementById('modal_assetPurchaseDate').value || null,
            supplier_id: supplierIdVal ? parseInt(supplierIdVal, 10) : null,
            invoice_number: document.getElementById('modal_assetInvoiceNumber').value || null,
            cost: parseFloat(document.getElementById('modal_assetCost').value) || 0,
            salvage_value: parseFloat(document.getElementById('modal_assetSalvage').value) || 0,
            useful_life_months: parseInt(document.getElementById('modal_assetLife').value, 10) || null,
            depreciation_method: document.getElementById('modal_assetDepMethod').value || 'straight_line',
            status: document.getElementById('modal_assetStatus').value,
            disposed_date: isDisposed ? (document.getElementById('modal_assetDisposedDate').value || null) : null,
            disposed_reason: isDisposed ? (document.getElementById('modal_assetDisposedReason').value || null) : null,
            notes: document.getElementById('modal_assetNotes').value,
            category_id: categoryId,
            user_id: assignedUser?.id || null
        };
        if (isNew && window.QLTSHelpers) {
            const categoryName = categories.find(c => c.id === categoryId)?.name || '';
            const deptName = (assignedUser && assignedUser.department && assignedUser.department !== '-') ? assignedUser.department : null;
            payload.asset_code = window.QLTSHelpers.buildAssetCode(categoryName, deptName, assets.map(a => a.asset_code).filter(Boolean));
        }
        return payload;
        }, 'assetModal', (data, isUpdate, details) => addLog(data.id, 'ASSET', isUpdate ? 'Cập nhật' : 'Thêm mới', details));
    });

    document.getElementById('licenseForm')?.addEventListener('submit', (e) => {
        const licenseIdVal = document.getElementById('modal_licenseId').value;
        const licenseKeyVal = document.getElementById('modal_licenseKey').value.trim();
        if (!licenseKeyVal) {
            e.preventDefault();
            return showInfoModal('Vui lòng nhập mã Key.', 'Thiếu thông tin');
        }
        const duplicateKey = licenses.some(l => l.license_key === licenseKeyVal && String(l.id) !== licenseIdVal);
        if (duplicateKey) {
            e.preventDefault();
            return showInfoModal(`Mã Key "${licenseKeyVal}" đã tồn tại trên 1 license khác.`, 'Trùng mã Key');
        }
        const expDateInput = document.getElementById('modal_expirationDate');
        const expDateVal = expDateInput.value;
        // Chỉ chặn khi NGƯỜI DÙNG chọn 1 ngày quá khứ mới (không chặn license cũ vốn đã hết hạn
        // sẵn từ trước khi mở form sửa - nếu không sẽ không sửa được các trường khác của nó).
        if (expDateVal !== (expDateInput.dataset.originalValue || '') && isPastDateStr(expDateVal)) {
            e.preventDefault();
            return showInfoModal('Ngày hết hạn không được nhỏ hơn ngày hiện tại.', 'Ngày không hợp lệ');
        }
        // [RÀNG BUỘC] License đã hết hạn (kể cả hết hạn từ trước, đang giữ nguyên ngày cũ)
        // thì không được cấp phát cho ai. Phải gia hạn (đổi ngày hết hạn) trước khi gán.
        const hasLicenseUserSelected = !!(licenseUserChoicesInstance?.getValue(true));
        if (isPastDateStr(expDateVal) && hasLicenseUserSelected) {
            e.preventDefault();
            return showInfoModal('License đã hết hạn nên không thể cấp phát cho người dùng. Vui lòng gia hạn (cập nhật ngày hết hạn) trước khi gán.', 'Không thể cấp phát');
        }
        return handleFormSubmit(e, 'licenses', () => {
        const isNew = !document.getElementById('modal_licenseId').value;
        const keyType = document.getElementById('modal_licenseType').value;
        const assignedUser = users.find(u => u.name === licenseUserChoicesInstance?.getValue(true));
        const payload = {
            id: document.getElementById('modal_licenseId').value,
            key_type: keyType,
            license_key: document.getElementById('modal_licenseKey').value,
            package_type: document.getElementById('modal_packageType').value,
            expiration_date: document.getElementById('modal_expirationDate').value || null,
            status: document.getElementById('modal_licenseStatus').value,
            notes: document.getElementById('modal_licenseNotes').value,
            user_id: assignedUser?.id || null
        };
        if (isNew && window.QLTSHelpers) {
            const deptName = (assignedUser && assignedUser.department && assignedUser.department !== '-') ? assignedUser.department : null;
            payload.license_code = window.QLTSHelpers.buildLicenseCode(keyType, deptName, licenses.map(l => l.license_code).filter(Boolean));
        }
        return payload;
        }, 'licenseModal', (data, isUpdate, details) => addLog(data.id, 'LICENSE', isUpdate ? 'Cập nhật' : 'Thêm mới', details));
    });

    document.getElementById('userForm')?.addEventListener('submit', (e) => {
        const userIdVal = document.getElementById('userId').value;
        const emailVal = document.getElementById('email').value.trim();
        const duplicateEmail = users.some(u => (u.email || '').toLowerCase() === emailVal.toLowerCase() && String(u.id) !== userIdVal);
        if (duplicateEmail) {
            e.preventDefault();
            return showInfoModal(`Email "${emailVal}" đã được dùng bởi 1 nhân viên khác.`, 'Trùng email');
        }
        const newStatus = document.getElementById('status').value;
        if (userIdVal && newStatus === 'Đã nghỉ việc') {
            const id = parseInt(userIdVal, 10);
            const stillHolding = assets.some(a => a.user_id === id) || licenses.some(l => l.user_id === id);
            if (stillHolding) {
                e.preventDefault();
                return showInfoModal('Nhân viên này đang giữ tài sản/license. Vui lòng thu hồi trước khi chuyển sang trạng thái "Đã nghỉ việc".', 'Không thể cập nhật');
            }
        }
        return handleFormSubmit(e, 'users', () => ({
            id: userIdVal, name: document.getElementById('name').value, email: emailVal, phone: document.getElementById('phone').value || '', department_id: document.getElementById('department').value || null, status: newStatus, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('name').value)}`
        }), 'addUserModal', (data, isUpdate, details) => addLog(data.id, 'USER', isUpdate ? 'Cập nhật' : 'Thêm mới', details));
    });

    document.getElementById('categoryForm')?.addEventListener('submit', (e) => handleFormSubmit(e, 'categories', () => ({ id: document.getElementById('categoryOldName').value, name: document.getElementById('categoryName').value }), 'categoryModal', (data, isUpdate, details) => { addLog(data.id, 'CATEGORY', isUpdate ? 'Cập nhật' : 'Thêm mới', details); renderLists(); }));
    document.getElementById('departmentForm')?.addEventListener('submit', (e) => handleFormSubmit(e, 'departments', () => ({ id: document.getElementById('deptId').value, name: document.getElementById('deptName').value }), 'departmentManagementModal', (data, isUpdate, details) => { addLog(data.id, 'DEPARTMENT', isUpdate ? 'Cập nhật' : 'Thêm mới', details); renderLists(); }));
    document.getElementById('licenseTypeForm')?.addEventListener('submit', (e) => handleFormSubmit(e, 'license_types', () => ({ id: document.getElementById('licenseTypeId').value, name: document.getElementById('licenseTypeName').value }), 'licenseTypeModal', (data, isUpdate, details) => { addLog(data.id, 'LICENSE_TYPE', isUpdate ? 'Cập nhật' : 'Thêm mới', details); renderLists(); }));

    document.getElementById('supplierForm')?.addEventListener('submit', (e) => {
        const nameVal = document.getElementById('supplierName').value.trim();
        if (!nameVal) {
            e.preventDefault();
            return showInfoModal('Vui lòng nhập tên nhà cung cấp.', 'Thiếu thông tin');
        }
        return handleFormSubmit(e, 'suppliers', () => ({
            id: document.getElementById('supplierId').value,
            name: nameVal,
            contact_person: document.getElementById('supplierContact').value || null,
            phone: document.getElementById('supplierPhone').value || null,
            email: document.getElementById('supplierEmail').value || null,
            address: document.getElementById('supplierAddress').value || null,
            notes: document.getElementById('supplierNotes').value || null
        }), null, (data, isUpdate, details) => {
            addLog(data.id, 'SUPPLIER', isUpdate ? 'Cập nhật' : 'Thêm mới', details);
            document.getElementById('supplierForm').reset();
            document.getElementById('supplierId').value = '';
            document.getElementById('btnCancelSupplierEdit').classList.add('hidden');
            updateDropdowns();
        });
    });
    document.getElementById('btnCancelSupplierEdit')?.addEventListener('click', () => {
        document.getElementById('supplierForm').reset();
        document.getElementById('supplierId').value = '';
        document.getElementById('btnCancelSupplierEdit').classList.add('hidden');
    });

    document.getElementById('maintenanceForm')?.addEventListener('submit', (e) => {
        const titleVal = document.getElementById('maintenance_title').value;
        if (!titleVal) { e.preventDefault(); return showInfoModal('Nhập tiêu đề lịch bảo trì'); }
        const dueDateVal = document.getElementById('maintenance_due').value;
        if (isPastDateStr(dueDateVal)) { e.preventDefault(); return showInfoModal('Ngày dự kiến không được nhỏ hơn ngày hiện tại.', 'Ngày không hợp lệ'); }
        return handleFormSubmit(e, 'maintenance_tasks', () => {
            const idVal = document.getElementById('maintenance_id').value;
            const payload = {
                id: idVal,
                asset_id: parseInt(document.getElementById('maintenance_asset').value, 10) || null,
                title: titleVal,
                due_date: dueDateVal || null
            };
            // Chỉ đặt trạng thái mặc định khi TẠO MỚI - khi sửa, giữ nguyên trạng thái hiện tại
            // (Chưa xử lý/Đang xử lý/Hoàn thành...), tránh reset ngược 1 task đã xử lý.
            if (!idVal) { payload.status = 'Chưa xử lý'; payload.created_by = currentUserProfile?.id || null; }
            const priorityVal = document.getElementById('maintenance_priority').value || 'normal';
            const descVal = document.getElementById('maintenance_desc').value;
            const parts = [priorityVal && `Ưu tiên: ${priorityVal}`, descVal];
            const noteText = parts.filter(Boolean).join(' | ');
            payload.note = noteText || null;
            return payload;
        }, 'maintenanceModal', (data, isUpdate, details) => {
            if (data?.asset_id) addLog(data.asset_id, 'MAINT', isUpdate ? 'Cập nhật' : 'Tạo lịch', details);
        });
    });

    document.getElementById('stockCheckForm')?.addEventListener('submit', (e) => {
        const dateVal = document.getElementById('stockcheck_date').value;
        if (isPastDateStr(dateVal)) { e.preventDefault(); return showInfoModal('Ngày dự kiến không được nhỏ hơn ngày hiện tại.', 'Ngày không hợp lệ'); }
        return handleFormSubmit(e, 'stock_checks', () => {
            const idVal = document.getElementById('stockcheck_id').value;
            const nameVal = document.getElementById('stockcheck_name').value;
            const extraNote = document.getElementById('stockcheck_notes').value;
            const payload = { id: idVal };
            if (dateVal) payload.started_at = dateVal;
            const mergedNote = [nameVal && `Tên đợt: ${nameVal}`, extraNote].filter(Boolean).join(' | ');
            payload.note = mergedNote || null;
            // Chỉ đặt trạng thái mặc định khi TẠO MỚI - khi sửa, giữ nguyên trạng thái hiện tại.
            if (!idVal) { payload.status = 'Đang mở'; payload.created_by = currentUserProfile?.id || null; }
            return payload;
        }, 'stockCheckModal', (data, isUpdate, details) => {
            addLog(data?.id, 'STOCK_CHECK', isUpdate ? 'Cập nhật' : 'Thêm mới', details);
        });
    });

    document.getElementById('btnConfirmAssign')?.addEventListener('click', async () => { const u = users.find(u => u.name === assignUserChoicesInstance.getValue(true)); if (!u) return showInfoModal("Chọn người nhận"); const asset = assets.find(a => String(a.id) === String(tempId)); const assetName = asset?.name || 'tài sản'; if (asset && ['Repair', 'Broken'].includes(asset.status)) return showInfoModal('Thiết bị đang ở trạng thái "Sửa chữa"/"Hỏng" nên không thể cấp phát. Vui lòng cập nhật lại trạng thái trước.', 'Không thể cấp phát'); await supabaseClient.from('assets').update({ user_id: u.id, user: u.name, status: 'Active', assigned_date: getTodayDateStr() }).eq('id', tempId); addLog(tempId, 'ASSET', 'Cấp phát', u.name); safeCloseModal('checkOutModal'); await refreshApp(); showInfoModal(`Đã cấp phát "${assetName}" cho ${u.name}!`, 'Cấp phát thành công'); });
    document.getElementById('btnConfirmAssignLicense')?.addEventListener('click', async () => { const u = users.find(u => u.name === licenseAssignUserChoicesInstance.getValue(true)); if (!u) return showInfoModal("Chọn người nhận"); const license = licenses.find(l => String(l.id) === String(tempId)); const licenseName = license?.key_type || 'license'; if (license && license.status === 'Expired') return showInfoModal('License đã hết hạn nên không thể cấp phát. Vui lòng gia hạn trước.', 'Không thể cấp phát'); await supabaseClient.from('licenses').update({ user_id: u.id, user: u.name, status: 'Active', assigned_date: getTodayDateStr() }).eq('id', tempId); addLog(tempId, 'LICENSE', 'Cấp phát', u.name); safeCloseModal('checkOutLicenseModal'); await refreshApp(); showInfoModal(`Đã cấp phát "${licenseName}" cho ${u.name}!`, 'Cấp phát thành công'); });
    document.getElementById('btnConfirmTransfer')?.addEventListener('click', async () => { const u = users.find(u => u.name === (transferUserChoicesInstance ? transferUserChoicesInstance.getValue(true) : document.getElementById('transferNewUserSelect').value)); if (!u) return showInfoModal("Chọn người nhận"); const assetName = assets.find(a => String(a.id) === String(tempId))?.name || 'tài sản'; const { error } = await supabaseClient.from('assets').update({ user_id: u.id, user: u.name, status: 'Active', assigned_date: getTodayDateStr() }).eq('id', tempId); if (error) handleSupabaseError(error); else { addLog(tempId, 'ASSET', 'Điều chuyển', u.name); safeCloseModal('transferModal'); await refreshApp(); showInfoModal(`Đã chuyển "${assetName}" sang ${u.name}!`, 'Chuyển đổi thành công'); } });

    function initAssignmentDropdowns() {
        const assetSelect = document.getElementById('assign_asset_select');
        const userSelect = document.getElementById('assign_user_select');
        const dateInput = document.getElementById('assign_date');

        if (dateInput && !dateInput.value) {
            dateInput.value = typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0];
        }

        if (assetSelect) {
            const stockAssets = (assets || []).filter(a => a.status === 'Stock');
            if (stockAssets.length === 0) {
                assetSelect.innerHTML = '<option value="">-- Không có thiết bị sẵn sàng trong kho --</option>';
            } else {
                assetSelect.innerHTML = '<option value="">-- Chọn thiết bị trong kho --</option>' + stockAssets.map(a => {
                    const code = a.asset_code ? `[${a.asset_code}] ` : '';
                    const cat = a.category ? ` (${a.category})` : '';
                    return `<option value="${a.id}">${code}${a.name}${cat}</option>`;
                }).join('');
            }
        }

        if (userSelect) {
            const allUsers = (users || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            userSelect.innerHTML = '<option value="">-- Chọn nhân sự nhận thiết bị --</option>' + allUsers.map(u => {
                const dept = u.department ? ` - ${u.department}` : '';
                return `<option value="${u.id}">${u.name}${dept}</option>`;
            }).join('');
        }
    }
    window.initAssignmentDropdowns = initAssignmentDropdowns;

    document.getElementById('newAssignForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const assetId = document.getElementById('assign_asset_select')?.value;
        const userId = document.getElementById('assign_user_select')?.value;
        const assignDate = document.getElementById('assign_date')?.value || (typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0]);
        const condition = document.getElementById('assign_condition')?.value || 'Hoạt động tốt';
        const accessories = document.getElementById('assign_accessories')?.value?.trim();
        const notes = document.getElementById('assign_notes')?.value?.trim();

        if (!assetId) return showInfoModal('Vui lòng chọn thiết bị cần cấp phát.', 'Thiếu thông tin');
        if (!userId) return showInfoModal('Vui lòng chọn nhân sự nhận thiết bị.', 'Thiếu thông tin');

        const asset = (assets || []).find(a => String(a.id) === String(assetId));
        const user = (users || []).find(u => String(u.id) === String(userId));
        if (!asset) return showInfoModal('Không tìm thấy thiết bị đã chọn.', 'Lỗi');
        if (!user) return showInfoModal('Không tìm thấy nhân sự đã chọn.', 'Lỗi');

        if (['Repair', 'Broken', 'Disposed'].includes(asset.status)) {
            return showInfoModal('Thiết bị đang ở trạng thái "' + asset.status + '" nên không thể cấp phát.', 'Không thể cấp phát');
        }

        const updatePayload = {
            user_id: user.id,
            user: user.name,
            status: 'Active',
            assigned_date: assignDate
        };

        const { error } = await supabaseClient.from('assets').update(updatePayload).eq('id', asset.id);
        if (error) {
            handleSupabaseError(error, 'cấp phát');
            return;
        }

        const logDesc = `Bàn giao cho: ${user.name}${user.department ? ` (${user.department})` : ''} | Tình trạng: ${condition}${accessories ? ` | Phụ kiện: ${accessories}` : ''}${notes ? ` | Ghi chú: ${notes}` : ''}`;
        await addLog(asset.id, 'ASSET', 'Cấp phát', logDesc);

        safeCloseModal('newAssignModal');
        document.getElementById('newAssignForm').reset();
        await refreshApp();

        showInfoModal(`Đã cấp phát thành công "${asset.name}" cho ${user.name}! Bạn có thể xem và in biên bản bàn giao.`, 'Cấp phát thành công');
    });

    document.getElementById('returnAssetForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const assetId = document.getElementById('return_asset_id')?.value;
        const returnDate = document.getElementById('return_date')?.value || (typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0]);
        const conditionChoice = document.getElementById('return_condition')?.value || 'Bình thường (Nhập kho)';
        const notes = document.getElementById('return_notes')?.value?.trim();

        const asset = (assets || []).find(a => String(a.id) === String(assetId));
        if (!asset) return showInfoModal('Không tìm thấy thiết bị cần thu hồi.', 'Lỗi');

        const prevUser = (users || []).find(u => String(u.id) === String(asset.user_id));
        const prevUserName = prevUser?.name || asset.user || 'Người dùng';

        let newStatus = 'Stock';
        if (conditionChoice.includes('Hỏng nhẹ')) newStatus = 'Repair';
        else if (conditionChoice.includes('Hỏng nặng')) newStatus = 'Broken';

        const updatePayload = {
            user_id: null,
            user: null,
            status: newStatus,
            assigned_date: null
        };

        const { error } = await supabaseClient.from('assets').update(updatePayload).eq('id', asset.id);
        if (error) {
            handleSupabaseError(error, 'thu hồi');
            return;
        }

        const logDesc = `Thu hồi từ: ${prevUserName} | Tình trạng sau thu hồi: ${conditionChoice}${notes ? ` | Ghi chú: ${notes}` : ''} | Ngày thu hồi: ${formatDateDisplay(returnDate)}`;
        await addLog(asset.id, 'ASSET', 'Thu hồi', logDesc);

        safeCloseModal('returnAssetModal');
        document.getElementById('returnAssetForm').reset();
        await refreshApp();

        showInfoModal(`Đã thu hồi thành công thiết bị "${asset.name}" về kho (Trạng thái: ${newStatus})!`, 'Thu hồi thành công');
    });

    document.getElementById('transferAssetForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const assetId = document.getElementById('transfer_asset_id')?.value;
        const toUserId = document.getElementById('transfer_to_user_select')?.value;
        const notes = document.getElementById('transfer_notes')?.value?.trim();

        if (!toUserId) return showInfoModal('Vui lòng chọn nhân sự tiếp nhận.', 'Thiếu thông tin');

        const asset = (assets || []).find(a => String(a.id) === String(assetId));
        if (!asset) return showInfoModal('Không tìm thấy thiết bị.', 'Lỗi');

        const fromUser = (users || []).find(u => String(u.id) === String(asset.user_id));
        const fromUserName = fromUser?.name || asset.user || 'Người dùng cũ';
        const toUser = (users || []).find(u => String(u.id) === String(toUserId));
        if (!toUser) return showInfoModal('Không tìm thấy nhân sự tiếp nhận.', 'Lỗi');

        const todayStr = typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0];
        const updatePayload = {
            user_id: toUser.id,
            user: toUser.name,
            status: 'Active',
            assigned_date: todayStr
        };

        const { error } = await supabaseClient.from('assets').update(updatePayload).eq('id', asset.id);
        if (error) {
            handleSupabaseError(error, 'điều chuyển');
            return;
        }

        const logDesc = `Điều chuyển từ [${fromUserName}] sang [${toUser.name}${toUser.department ? ` - ${toUser.department}` : ''}]${notes ? ` | Lý do: ${notes}` : ''}`;
        await addLog(asset.id, 'ASSET', 'Điều chuyển', logDesc);

        safeCloseModal('transferAssetModal');
        document.getElementById('transferAssetForm').reset();
        await refreshApp();

        showInfoModal(`Đã điều chuyển "${asset.name}" sang ${toUser.name}!`, 'Điều chuyển thành công');
    });

    // =================================================================
    // QUẢN LÝ KHO VẬT TƯ & LINH KIỆN (inventory.html)
    // =================================================================
    function initInventoryDropdowns() {
        const escapeHTML = (s) => (s === null || s === undefined ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'));
        const suppliesList = window.supplies || [];
        const suppliersList = window.suppliers || [];
        const usersList = window.users || [];

        // 1. Supplier dropdown in supply modal
        const supplySupplier = document.getElementById('supply_supplier');
        if (supplySupplier) {
            const curVal = supplySupplier.value;
            supplySupplier.innerHTML = '<option value="">-- Không chỉ định --</option>' +
                suppliersList.map(s => `<option value="${escapeHTML(s.name)}">${escapeHTML(s.name)}</option>`).join('');
            if (curVal) supplySupplier.value = curVal;
        }

        // 2. Stock-in supply select
        const stockinSupply = document.getElementById('stockin_supply_select');
        if (stockinSupply) {
            const curVal = stockinSupply.value;
            stockinSupply.innerHTML = '<option value="">-- Chọn mặt hàng nhập kho --</option>' +
                suppliesList.map(s => `<option value="${s.id}">[${escapeHTML(s.code || s.sku || 'VT-' + s.id)}] ${escapeHTML(s.name)} (Hiện tồn: ${s.quantity} ${escapeHTML(s.unit || '')})</option>`).join('');
            if (curVal) stockinSupply.value = curVal;
        }

        // 3. Stock-in supplier select
        const stockinSupplier = document.getElementById('stockin_supplier');
        if (stockinSupplier) {
            const curVal = stockinSupplier.value;
            stockinSupplier.innerHTML = '<option value="">-- Chọn nhà cung cấp --</option>' +
                suppliersList.map(s => `<option value="${escapeHTML(s.name)}">${escapeHTML(s.name)}</option>`).join('');
            if (curVal) stockinSupplier.value = curVal;
        }

        // 4. Stock-out supply select
        const stockoutSupply = document.getElementById('stockout_supply_select');
        if (stockoutSupply) {
            const curVal = stockoutSupply.value;
            stockoutSupply.innerHTML = '<option value="">-- Chọn mặt hàng xuất kho --</option>' +
                suppliesList.map(s => `<option value="${s.id}">[${escapeHTML(s.code || s.sku || 'VT-' + s.id)}] ${escapeHTML(s.name)} (Tồn: ${s.quantity} ${escapeHTML(s.unit || '')})</option>`).join('');
            if (curVal) stockoutSupply.value = curVal;
        }

        // 5. Stock-out user select
        const stockoutUser = document.getElementById('stockout_user_select');
        if (stockoutUser) {
            const curVal = stockoutUser.value;
            stockoutUser.innerHTML = '<option value="">-- Chọn người nhận / bộ phận --</option>' +
                usersList.map(u => {
                    const dept = u.department ? ` - ${u.department}` : '';
                    return `<option value="${escapeHTML(u.name)}">${escapeHTML(u.name)}${escapeHTML(dept)}</option>`;
                }).join('');
            if (curVal) stockoutUser.value = curVal;
        }
    }
    window.initInventoryDropdowns = initInventoryDropdowns;

    // Lắng nghe chọn mặt hàng khi xuất kho để hiển thị tồn kho và giới hạn max
    document.getElementById('stockout_supply_select')?.addEventListener('change', (e) => {
        const sId = e.target.value;
        const supply = (window.supplies || []).find(s => String(s.id) === String(sId));
        const qtyDisplay = document.getElementById('stockout_current_qty_display');
        const qtyInput = document.getElementById('stockout_quantity');
        if (supply) {
            if (qtyDisplay) qtyDisplay.textContent = `${supply.quantity} ${supply.unit || ''}`;
            if (qtyInput) {
                qtyInput.max = supply.quantity;
                if (parseInt(qtyInput.value) > supply.quantity) {
                    qtyInput.value = supply.quantity > 0 ? 1 : 0;
                }
            }
        } else {
            if (qtyDisplay) qtyDisplay.textContent = '0';
        }
    });

    // Form thêm / sửa mặt hàng vật tư
    document.getElementById('supplyForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('supply_id')?.value;
        const code = document.getElementById('supply_code')?.value.trim();
        const name = document.getElementById('supply_name')?.value.trim();
        const category = document.getElementById('supply_category')?.value;
        const unit = document.getElementById('supply_unit')?.value.trim() || 'Cái';
        const initialQty = parseInt(document.getElementById('supply_quantity')?.value) || 0;
        const minQty = parseInt(document.getElementById('supply_min_quantity')?.value) || 0;
        const location = document.getElementById('supply_location')?.value.trim() || '';
        const unitPrice = parseFloat(document.getElementById('supply_unit_price')?.value) || 0;
        const supplier = document.getElementById('supply_supplier')?.value || '';
        const notes = document.getElementById('supply_notes')?.value.trim() || '';

        if (!name) return showInfoModal('Vui lòng nhập tên mặt hàng vật tư.', 'Thiếu thông tin');

        const isEdit = Boolean(id);
        const autoCode = code || ('VT-' + String(Math.floor(1000 + Math.random() * 9000)));

        if (isEdit) {
            const { error } = await supabaseClient.from('supplies').update({
                code: autoCode,
                name: name,
                category: category,
                unit: unit,
                min_quantity: minQty,
                location: location,
                unit_price: unitPrice,
                supplier: supplier,
                notes: notes,
                updated_at: new Date().toISOString()
            }).eq('id', id);

            if (error) {
                handleSupabaseError(error, 'cập nhật vật tư');
                return;
            }
            await addLog(id, 'SUPPLY', 'Cập nhật', `Cập nhật thông tin vật tư: ${name} (${autoCode})`);
            showInfoModal(`Cập nhật mặt hàng "${name}" thành công!`, 'Thành công');
        } else {
            const newSupply = {
                code: autoCode,
                name: name,
                category: category,
                unit: unit,
                quantity: initialQty,
                min_quantity: minQty,
                location: location,
                unit_price: unitPrice,
                supplier: supplier,
                notes: notes,
                created_at: new Date().toISOString()
            };
            const { data, error } = await supabaseClient.from('supplies').insert([newSupply]);
            if (error) {
                handleSupabaseError(error, 'thêm mới vật tư');
                return;
            }
            const createdId = (data && data[0] && data[0].id) || 'new';
            await addLog(createdId, 'SUPPLY', 'Thêm mới', `Thêm mới mặt hàng: ${name} (${autoCode}) với tồn đầu kỳ ${initialQty} ${unit}`);

            if (initialQty > 0) {
                await supabaseClient.from('supply_transactions').insert([{
                    code: 'PNK-' + Date.now().toString().slice(-6),
                    supply_id: createdId,
                    supply_name: name,
                    type: 'IN',
                    quantity: initialQty,
                    unit: unit,
                    unit_price: unitPrice,
                    supplier: supplier || 'Tồn đầu kỳ',
                    supplier_name: supplier || 'Tồn đầu kỳ',
                    user_name: currentUserProfile?.full_name || 'Admin',
                    created_by: currentUserProfile?.full_name || 'Admin',
                    date: typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0],
                    notes: 'Nhập số dư ban đầu khi tạo mặt hàng',
                    reason: 'Nhập số dư ban đầu khi tạo mặt hàng',
                    created_at: new Date().toISOString()
                }]);
            }
            showInfoModal(`Thêm mặt hàng "${name}" thành công!`, 'Thành công');
        }

        safeCloseModal('supplyModal');
        document.getElementById('supplyForm').reset();
        await refreshApp();
    });

    // Form nhập kho
    document.getElementById('stockInForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const supplyId = document.getElementById('stockin_supply_select')?.value;
        const qty = parseInt(document.getElementById('stockin_quantity')?.value) || 0;
        const unitPrice = parseFloat(document.getElementById('stockin_unit_price')?.value) || 0;
        const supplier = document.getElementById('stockin_supplier')?.value || '';
        const inDate = document.getElementById('stockin_date')?.value || (typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0]);
        const reason = document.getElementById('stockin_reason')?.value.trim() || 'Nhập kho';

        if (!supplyId) return showInfoModal('Vui lòng chọn mặt hàng nhập kho.', 'Thiếu thông tin');
        if (qty <= 0) return showInfoModal('Số lượng nhập phải lớn hơn 0.', 'Số lượng không hợp lệ');

        const supply = (window.supplies || []).find(s => String(s.id) === String(supplyId));
        if (!supply) return showInfoModal('Không tìm thấy thông tin mặt hàng.', 'Lỗi');

        const newQty = (parseInt(supply.quantity) || 0) + qty;
        const { error: updateErr } = await supabaseClient.from('supplies').update({
            quantity: newQty,
            unit_price: unitPrice > 0 ? unitPrice : (supply.unit_price || 0),
            updated_at: new Date().toISOString()
        }).eq('id', supply.id);

        if (updateErr) {
            handleSupabaseError(updateErr, 'nhập kho');
            return;
        }

        const txCode = 'PNK-' + Date.now().toString().slice(-6);
        const { error: txErr } = await supabaseClient.from('supply_transactions').insert([{
            code: txCode,
            supply_id: supply.id,
            supply_name: supply.name,
            type: 'IN',
            quantity: qty,
            unit: supply.unit || 'Cái',
            unit_price: unitPrice,
            supplier: supplier,
            supplier_name: supplier,
            user_name: currentUserProfile?.full_name || 'Admin',
            created_by: currentUserProfile?.full_name || 'Admin',
            date: inDate,
            notes: reason,
            reason: reason,
            created_at: new Date().toISOString()
        }]);

        if (txErr) console.warn('Lỗi ghi sổ kho nhập:', txErr);

        await addLog(supply.id, 'SUPPLY', 'Nhập kho', `Nhập ${qty} ${supply.unit} [${supply.name}] từ ${supplier || 'NCC'} (Phiếu: ${txCode}). Tồn mới: ${newQty}`);

        safeCloseModal('stockInModal');
        document.getElementById('stockInForm').reset();
        await refreshApp();
        showInfoModal(`Đã nhập thành công ${qty} ${supply.unit} cho mặt hàng "${supply.name}". Tồn kho mới: ${newQty} ${supply.unit}.`, 'Nhập kho thành công');
    });

    // Form xuất kho cấp phát
    document.getElementById('stockOutForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const supplyId = document.getElementById('stockout_supply_select')?.value;
        const qty = parseInt(document.getElementById('stockout_quantity')?.value) || 0;
        const outDate = document.getElementById('stockout_date')?.value || (typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0]);
        const recipient = document.getElementById('stockout_user_select')?.value || '';
        const reason = document.getElementById('stockout_reason')?.value.trim() || 'Cấp phát nội bộ';

        if (!supplyId) return showInfoModal('Vui lòng chọn mặt hàng xuất kho.', 'Thiếu thông tin');
        if (qty <= 0) return showInfoModal('Số lượng xuất phải lớn hơn 0.', 'Số lượng không hợp lệ');
        if (!recipient) return showInfoModal('Vui lòng chọn hoặc nhập người nhận.', 'Thiếu thông tin');

        const supply = (window.supplies || []).find(s => String(s.id) === String(supplyId));
        if (!supply) return showInfoModal('Không tìm thấy thông tin mặt hàng.', 'Lỗi');

        const currentQty = parseInt(supply.quantity) || 0;
        if (qty > currentQty) {
            return showInfoModal(`Số lượng xuất (${qty}) vượt quá số lượng tồn kho hiện có (${currentQty} ${supply.unit}). Vui lòng kiểm tra lại.`, 'Không đủ tồn kho');
        }

        const newQty = currentQty - qty;
        const { error: updateErr } = await supabaseClient.from('supplies').update({
            quantity: newQty,
            updated_at: new Date().toISOString()
        }).eq('id', supply.id);

        if (updateErr) {
            handleSupabaseError(updateErr, 'xuất kho');
            return;
        }

        const txCode = 'PXK-' + Date.now().toString().slice(-6);
        const { error: txErr } = await supabaseClient.from('supply_transactions').insert([{
            code: txCode,
            supply_id: supply.id,
            supply_name: supply.name,
            type: 'OUT',
            quantity: qty,
            unit: supply.unit || 'Cái',
            recipient: recipient,
            receiver_name: recipient,
            user_name: currentUserProfile?.full_name || 'Admin',
            created_by: currentUserProfile?.full_name || 'Admin',
            date: outDate,
            notes: reason,
            reason: reason,
            created_at: new Date().toISOString()
        }]);

        if (txErr) console.warn('Lỗi ghi sổ kho xuất:', txErr);

        await addLog(supply.id, 'SUPPLY', 'Xuất kho', `Xuất ${qty} ${supply.unit} [${supply.name}] cho ${recipient} (Phiếu: ${txCode}). Tồn còn: ${newQty}`);

        safeCloseModal('stockOutModal');
        document.getElementById('stockOutForm').reset();
        await refreshApp();
        showInfoModal(`Đã xuất kho thành công ${qty} ${supply.unit} "${supply.name}" cho ${recipient}. Tồn kho còn lại: ${newQty} ${supply.unit}.`, 'Xuất kho thành công');
    });

    // Form điều chỉnh kiểm kê tồn kho
    document.getElementById('stockAdjustForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const supplyId = document.getElementById('adjust_supply_id')?.value;
        const actualQty = parseInt(document.getElementById('adjust_actual_qty')?.value);
        const reason = document.getElementById('adjust_reason')?.value.trim();

        if (!supplyId) return showInfoModal('Thiếu thông tin mặt hàng điều chỉnh.', 'Lỗi');
        if (isNaN(actualQty) || actualQty < 0) return showInfoModal('Số lượng thực tế phải là số không âm.', 'Số lượng không hợp lệ');
        if (!reason) return showInfoModal('Vui lòng nêu lý do hoặc căn cứ điều chỉnh kiểm kê.', 'Thiếu thông tin');

        const supply = (window.supplies || []).find(s => String(s.id) === String(supplyId));
        if (!supply) return showInfoModal('Không tìm thấy thông tin mặt hàng.', 'Lỗi');

        const oldQty = parseInt(supply.quantity) || 0;
        const diff = actualQty - oldQty;

        const { error: updateErr } = await supabaseClient.from('supplies').update({
            quantity: actualQty,
            updated_at: new Date().toISOString()
        }).eq('id', supply.id);

        if (updateErr) {
            handleSupabaseError(updateErr, 'điều chỉnh tồn kho');
            return;
        }

        const txCode = 'PDC-' + Date.now().toString().slice(-6);
        const todayStr = typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0];
        const diffText = diff > 0 ? `+${diff}` : `${diff}`;
        const adjustNotes = `Điều chỉnh kiểm kê: ${oldQty} -> ${actualQty} (Chênh lệch: ${diffText}). Lý do: ${reason}`;
        await supabaseClient.from('supply_transactions').insert([{
            code: txCode,
            supply_id: supply.id,
            supply_name: supply.name,
            type: 'ADJUST',
            quantity: actualQty,
            unit: supply.unit || 'Cái',
            user_name: currentUserProfile?.full_name || 'Admin',
            created_by: currentUserProfile?.full_name || 'Admin',
            date: todayStr,
            notes: adjustNotes,
            reason: adjustNotes,
            created_at: new Date().toISOString()
        }]);

        await addLog(supply.id, 'SUPPLY', 'Điều chỉnh tồn', `Điều chỉnh tồn kho [${supply.name}]: từ ${oldQty} thành ${actualQty} ${supply.unit} (${diffText}). Lý do: ${reason}`);

        safeCloseModal('stockAdjustModal');
        document.getElementById('stockAdjustForm').reset();
        await refreshApp();
        showInfoModal(`Đã điều chỉnh tồn kho mặt hàng "${supply.name}" thành công (${actualQty} ${supply.unit})!`, 'Điều chỉnh thành công');
    });

    async function refreshApp(resetFilters = false) {
        await autoRestoreFromSupabaseIfNeeded();

        // Preserve current filter state before refresh (only for assets page)
        let preservedFilters = null;
        if (document.getElementById('assetTableBody') && !resetFilters) {
            preservedFilters = {
                search: document.getElementById('searchInput')?.value || '',
                status: document.getElementById('filterAssetStatus')?.value || '',
                location: document.getElementById('filterAssetLocation')?.value || '',
                category: document.getElementById('filterAssetCategory')?.value || '',
                user: null
            };
            // Get user filter from Choices instance if available
            if (filterAssetUserChoicesInstance) {
                try {
                    const selectedValue = filterAssetUserChoicesInstance.getValue(true);
                    const normalizedSelectedValue = Array.isArray(selectedValue)
                        ? (selectedValue[0] || '')
                        : (selectedValue || '');
                    if (normalizedSelectedValue) {
                        preservedFilters.user = normalizedSelectedValue;
                    }
                } catch (e) {}
            } else {
                preservedFilters.user = document.getElementById('filterAssetUser')?.value || '';
            }
        }
        
        await fetchAllData();
        updateDropdowns();
        
        if (document.getElementById('assetTableBody')) { 
            if (resetFilters) {
                resetAssetFilters(); 
            } else if (preservedFilters) {
                // Restore preserved filter values
                if (preservedFilters.search) document.getElementById('searchInput').value = preservedFilters.search;
                if (preservedFilters.status) document.getElementById('filterAssetStatus').value = preservedFilters.status;
                if (preservedFilters.location) document.getElementById('filterAssetLocation').value = preservedFilters.location;
                if (preservedFilters.category) document.getElementById('filterAssetCategory').value = preservedFilters.category;
                if (preservedFilters.user && filterAssetUserChoicesInstance) {
                    try {
                        filterAssetUserChoicesInstance.setChoiceByValue(preservedFilters.user);
                    } catch (e) {
                        // Fallback to element value if Choices fails
                        const fau = document.getElementById('filterAssetUser');
                        if (fau) fau.value = preservedFilters.user;
                    }
                } else if (preservedFilters.user) {
                    const fau = document.getElementById('filterAssetUser');
                    if (fau) fau.value = preservedFilters.user;
                }
            }
            applyAssetFilters(); 
        }
        if (document.getElementById('maintenanceTableBody')) {
            if (typeof renderMaintenanceList === 'function') renderMaintenanceList();
        }
        if (document.getElementById('stockCheckTableBody')) {
            if (typeof renderStockCheckList === 'function') renderStockCheckList();
        }
        if (document.getElementById('assignmentContent')) {
            if (typeof renderAssignmentList === 'function') renderAssignmentList();
        }
        if (document.getElementById('inventoryContent')) {
            if (typeof renderInventoryList === 'function') renderInventoryList();
        }
        if (document.getElementById('licenseTableBody')) { 
            if (resetFilters) resetLicenseFilters(); 
            applyLicenseFilters(); 
        }
        if (document.getElementById('userTableBody')) { 
            if (resetFilters) resetUserFilters(); 
            applyUserFilters(); 
        }
        applyRoleBasedUI(); // [PHÂN QUYỀN] Áp dụng các thay đổi giao diện dựa trên vai trò
        updateHeaderUserInfo(); // Cập nhật thông tin user trên header
        if (document.getElementById('settingsContent')) renderSettingsPage(); // [SỬA LỖI] Gọi hàm render cho trang Cài đặt ở cuối để đảm bảo có đủ dữ liệu
        checkAndDisplayNotifications(); // [KHÔI PHỤC] Kiểm tra và hiển thị thông báo
        updateDashboard();
    }
    window.refreshApp = refreshApp;

    // Đóng tất cả dropdown Choices khi click bên ngoài
    document.addEventListener('click', (e) => {
        // Kiểm tra nếu click không phải vào Choices element
        if (!e.target.closest('.choices')) {
            // Đóng tất cả dropdown đang mở
            [filterAssetUserChoicesInstance, filterLicenseUserChoicesInstance].forEach(instance => {
                if (instance && instance.dropdown && instance.dropdown.isActive) {
                    try {
                        instance.hideDropdown();
                    } catch (err) {}
                }
            });
        }
    });

    // Auto-hide any accidentally-visible full-screen modals or overlays that block clicks
    try {
        // 1) Hide any explicit modal elements with both classes 'fixed' and 'inset-0' that are visible
        const openModals = Array.from(document.querySelectorAll('.fixed.inset-0')).filter(m => !m.classList.contains('hidden'));
        if (openModals.length) {
            console.warn('Auto-hiding visible modals that may block interaction:', openModals.map(m => m.id || m.className));
            openModals.forEach(m => { m.classList.add('hidden'); m.classList.remove('flex'); m.setAttribute('aria-hidden', 'true'); });
        }

        // 2) Broad detection: find any element that covers the viewport and is visible/fixed and likely to intercept clicks
        const candidates = Array.from(document.querySelectorAll('body *')).filter(el => {
            try {
                const cs = window.getComputedStyle(el);
                if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false;
                const rect = el.getBoundingClientRect();
                // Consider elements that cover most of viewport and are fixed/absolute
                const covers = rect.width >= window.innerWidth - 2 && rect.height >= window.innerHeight - 2 && (cs.position === 'fixed' || cs.position === 'absolute');
                const highZ = parseInt(cs.zIndex) >= 50 || (cs.zIndex !== 'auto' && cs.zIndex !== '' && !isNaN(parseInt(cs.zIndex)));
                return covers && highZ;
            } catch (e) { return false; }
        });

        if (candidates.length) {
            console.warn('Found blocking overlay candidates; hiding them:', candidates.map(c => ({ id: c.id, classes: c.className }))); 
            candidates.forEach(c => {
                // disable pointer events and hide visually but avoid removing from layout drastically
                try { c.dataset._prePointer = c.style.pointerEvents || ''; c.style.pointerEvents = 'none'; } catch (e) {}
                try { c.dataset._preVisibility = c.style.visibility || ''; c.style.visibility = 'hidden'; } catch (e) {}
            });
        }

        // 3) Ensure mobile sidebar backdrop is hidden
        const sb = document.getElementById('sidebar-backdrop'); if (sb) sb.classList.add('hidden');
    } catch (err) { console.error('Error during startup modal/overlay cleanup', err); }

    // Load trang lần đầu - reset filter để đảm bảo trạng thái sạch
    refreshApp(true).then(() => {
        // [MỚI] Nếu điều hướng tới từ modal Tìm kiếm toàn cục (?q=...), áp dụng từ khóa
        if (typeof applyGlobalSearchParamIfAny === 'function') applyGlobalSearchParamIfAny();
    });

    window.addTaiSan = () => {
    const location = [
      "Hà Nội","TP. Hồ Chí Minh","Hải Phòng","Đà Nẵng","Cần Thơ",
      "An Giang","Bà Rịa - Vũng Tàu","Bắc Giang","Bắc Kạn","Bạc Liêu",
      "Bắc Ninh","Bến Tre","Bình Định","Bình Dương","Bình Phước",
      "Bình Thuận","Cà Mau","Cao Bằng","Đắk Lắk","Đắk Nông",
      "Điện Biên","Đồng Nai","Đồng Tháp","Gia Lai","Hà Giang",
      "Hà Nam","Hà Tĩnh","Hải Dương","Hậu Giang","Hòa Bình",
      "Hưng Yên","Khánh Hòa","Kiên Giang","Kon Tum","Lai Châu",
      "Lâm Đồng","Lạng Sơn","Lào Cai","Long An","Nam Định",
      "Nghệ An","Ninh Bình","Ninh Thuận","Phú Thọ","Phú Yên",
      "Quảng Bình","Quảng Nam","Quảng Ngãi","Quảng Ninh","Quảng Trị",
      "Sóc Trăng","Sơn La","Tây Ninh","Thái Bình","Thái Nguyên",
      "Thanh Hóa","Thừa Thiên Huế","Tiền Giang","Trà Vinh","Tuyên Quang",
      "Vĩnh Long","Vĩnh Phúc","Yên Bái"
    ];

    const locationElement = document.getElementById('modal_assetLocation');
    const defaultLocation = `<option value="">-- Chọn vị trí --</option>`;
    locationElement.innerHTML = defaultLocation + location
        .map(p => `<option value="${p}">${p}</option>`)
        .join("");
    };
};

