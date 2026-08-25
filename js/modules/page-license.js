window.QLTSPageLicense = window.QLTSPageLicense || {};

if (typeof window.handleAssetFileSelect !== 'function') window.handleAssetFileSelect = function () {};
if (typeof window.handleUserFileSelect !== 'function') window.handleUserFileSelect = function () {};
if (typeof window.applyAssetFilters !== 'function') window.applyAssetFilters = function () {};
if (typeof window.applyLicenseFilters !== 'function') window.applyLicenseFilters = function () {};
if (typeof window.applyUserFilters !== 'function') window.applyUserFilters = function () {};

window.QLTSPageLicense.init = async function () {
    // =================================================================
    // filterAssetUser / filterLicenseUser Choices.js instances are already
    // created and kept up to date by page-dashboard.js's updateDropdowns().
    // Re-initializing them here caused "multiple instances of Choices" errors.

    // Gắn sự kiện cho các bộ lọc và tìm kiếm một cách rõ ràng hơn
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (document.getElementById('licenseTableBody')) {
                window.applyLicenseFilters();
            } else if (document.getElementById('assetTableBody')) {
                window.applyAssetFilters();
            }
        });
    }
    document.getElementById('searchUserInput')?.addEventListener('input', window.applyUserFilters);
    document.getElementById('filterDepartment')?.addEventListener('change', window.applyUserFilters);
    document.getElementById('filterLicenseType')?.addEventListener('change', window.applyLicenseFilters);
    document.getElementById('filterPackageType')?.addEventListener('change', window.applyLicenseFilters); // [MỚI] Thêm event listener
    document.getElementById('userExcelFileInput')?.addEventListener('change', window.handleUserFileSelect);
    document.getElementById('excelFileInput')?.addEventListener('change', window.handleAssetFileSelect);
    // Date filter listeners (assets)
    // Asset filter listeners
    document.getElementById('filterAssetStatus')?.addEventListener('change', window.applyAssetFilters);
    document.getElementById('filterAssetLocation')?.addEventListener('change', window.applyAssetFilters);
    document.getElementById('filterAssetCategory')?.addEventListener('change', window.applyAssetFilters);
    // trigger filtering when user types in the datalist-input or when they change the value
    document.getElementById('filterAssetUser')?.addEventListener('input', window.applyAssetFilters);
    document.getElementById('filterAssetUser')?.addEventListener('change', window.applyAssetFilters);
    
    // Thêm event listener cho Choices.js instance để trigger filter khi thay đổi
    // Sẽ được gọi sau khi Choices instance được tạo trong updateDropdowns()
    // NOTE: Clear button removed — rely on Choices' removeItemButton / input clear behavior
    document.getElementById('clearAssetFilters')?.addEventListener('click', () => {
        if (document.getElementById('filterAssetStatus')) document.getElementById('filterAssetStatus').value = '';
        if (document.getElementById('filterAssetLocation')) document.getElementById('filterAssetLocation').value = '';
        if (document.getElementById('filterAssetCategory')) document.getElementById('filterAssetCategory').value = '';
        if (filterAssetUserChoicesInstance) {
            try {
                const selectedValue = filterAssetUserChoicesInstance.getValue(true);
                if (selectedValue) {
                    filterAssetUserChoicesInstance.setChoiceByValue('');
                }
                filterAssetUserChoicesInstance.clearInput();
            } catch (err) {
                console.warn('Error clearing filterAssetUserChoicesInstance:', err);
            }
        }
        if (document.getElementById('filterAssetUser')) document.getElementById('filterAssetUser').value = '';
        window.applyAssetFilters();
    });
    // Date filter listeners (licenses)
    // License filter listeners
    document.getElementById('filterLicenseStatus')?.addEventListener('change', window.applyLicenseFilters);
    document.getElementById('filterLicenseUser')?.addEventListener('input', window.applyLicenseFilters);
    document.getElementById('filterLicenseUser')?.addEventListener('change', window.applyLicenseFilters);
    document.getElementById('clearLicenseFilters')?.addEventListener('click', () => {
        if (document.getElementById('filterLicenseType')) document.getElementById('filterLicenseType').value = '';
        if (document.getElementById('filterPackageType')) document.getElementById('filterPackageType').value = '';
        if (document.getElementById('filterLicenseStatus')) document.getElementById('filterLicenseStatus').value = '';
        if (filterLicenseUserChoicesInstance) {
            try {
                const selectedValue = filterLicenseUserChoicesInstance.getValue(true);
                if (selectedValue) {
                    filterLicenseUserChoicesInstance.setChoiceByValue('');
                }
                filterLicenseUserChoicesInstance.clearInput();
            } catch (err) {
                console.warn('Error clearing filterLicenseUserChoicesInstance:', err);
            }
        }
        if (document.getElementById('filterLicenseUser')) document.getElementById('filterLicenseUser').value = '';
        window.applyLicenseFilters();
    });

    // Export lịch sử (asset / license)
    document.getElementById('historyExportBtn')?.addEventListener('click', () => {
        if (!historyExportBuffer || historyExportBuffer.length === 0) return showInfoModal('Không có dữ liệu lịch sử để xuất');
        const rows = historyExportBuffer.map(l => ({
            'Thời gian': l.time || l.created_at || '',
            'Tên': l.assetName || l.asset || '',
            'Hành động': l.action || '',
            'Chi tiết': l.desc || l.description || ''
        }));
        exportToCSV(rows, 'history.csv');
    });

    document.getElementById('historyLicenseExportBtn')?.addEventListener('click', () => {
        if (!historyExportBuffer || historyExportBuffer.length === 0) return showInfoModal('Không có dữ liệu lịch sử để xuất');
        const rows = historyExportBuffer.map(l => ({
            'Thời gian': l.time || l.created_at || '',
            'Hành động': l.action || '',
            'Chi tiết': l.desc || l.description || ''
        }));
        exportToCSV(rows, 'history_license.csv');
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const m = Array.from(document.querySelectorAll('.fixed.flex:not(.hidden)')); if (m.length > 0) safeCloseModal(m[m.length - 1].id); } });

    // --- MAIN CLICK HANDLER ---
    document.body.addEventListener('click', async (e) => {
        const t = e.target;

        // --- CÁC HÀNH ĐỘNG CHUNG ---
        // Logout Button
        if (t.closest('#logout-button')) {
            e.preventDefault();
            handleLogout();
        }

        // [KHÔI PHỤC] Xử lý click vào nút chuông thông báo
        if (t.closest('#notification-button')) {
            document.getElementById('notification-dropdown')?.classList.toggle('hidden');
        } else if (!t.closest('#notification-dropdown')) {
            document.getElementById('notification-dropdown')?.classList.add('hidden');
        }

        // [KHÔI PHỤC] Đóng modal khi click ra vùng nền bên ngoài
        if (t.matches('.fixed.flex')) {
            // Kiểm tra xem có modal con nào đang mở bên trên không
            const openModals = document.querySelectorAll('.fixed.flex:not(.hidden)');
            if (openModals.length > 0 && openModals[openModals.length - 1].id === t.id) {
                 attemptCloseModal(t.id);
            }
        }

        // =================================================================
        // LOGIC CLICK VÀO HÀNG (ROW) ĐỂ XEM CHI TIẾT
        // =================================================================
        const assetRow = t.closest('.asset-row');
        if (assetRow && !t.closest('button') && !t.closest('input') && !t.closest('a')) {
            const id = parseInt(assetRow.dataset.id);
            const item = assets.find(a => a.id === id);

            if (item) {
                // Thay vì mở modal sửa, chúng ta sẽ format thông tin và hiển thị bằng infoModal
                const statusInfo = STATUS_MAP[item.status] || { text: item.status, classes: 'bg-gray-100' };
                const detailsHtml = `
                    <div class="text-left space-y-2 text-sm">
                        <p><strong>Tên thiết bị:</strong> ${item.name}</p>
                        <p><strong>Loại:</strong> ${item.category || 'N/A'}</p>
                        <p><strong>Trạng thái:</strong> <span class="px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo.classes}">${statusInfo.text}</span></p>
                        <p><strong>Người dùng:</strong> <span class="font-semibold text-blue-600">${item.user || 'Chưa cấp phát'}</span></p>
                        <p><strong>Vị trí:</strong> ${item.location || 'N/A'}</p>
                        <p><strong>Ghi chú:</strong> ${item.notes || 'Không có'}</p>
                        <div class="mt-2 pt-2 border-t"><strong>Cấu hình:</strong><pre class="text-xs bg-slate-50 p-2 rounded-md mt-1 font-mono whitespace-pre-wrap">${item.config || 'Không có thông tin'}</pre></div>
                    </div>
                `;
                showInfoModal(detailsHtml, `Chi tiết: ${item.name}`);
            }
            return;
        }

        // =================================================================
        // [MỚI] LOGIC CLICK VÀO HÀNG (ROW) LICENSE ĐỂ XEM CHI TIẾT
        // =================================================================
        const licenseRow = t.closest('.license-row');
        if (licenseRow && !t.closest('button') && !t.closest('input') && !t.closest('a')) {
            const id = parseInt(licenseRow.dataset.id);
            const item = licenses.find(l => l.id === id);

            if (item) {
                const statusInfo = STATUS_MAP[item.status] || { text: item.status, classes: 'bg-gray-100' };
                const isAdmin = currentUserProfile.role === 'admin';
                
                const keyDisplayHtml = isAdmin 
                    ? `<div class="col-span-2 flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-md w-fit">
                           <span class="font-mono text-sm text-slate-700">${item.license_key || 'N/A'}</span>
                           <button data-action="copy-key" data-key="${item.license_key}" class="copy-key-btn text-slate-400 hover:text-blue-600 transition-colors" title="Copy mã key">
                               <i class="fa-regular fa-copy"></i>
                           </button>
                       </div>`
                    : `<div class="col-span-2 flex items-center">
                           <span class="font-mono text-sm text-slate-500">******</span>
                       </div>`;

                const detailsHtml = `
                    <div class="text-left space-y-4 text-base">
                        <div class="grid grid-cols-3 gap-x-4 gap-y-3">
                            <strong class="col-span-1 text-slate-500">Loại Key:</strong>
                            <span class="col-span-2 font-semibold text-slate-800">${item.key_type}</span>

                            <strong class="col-span-1 text-slate-500">Mã Key:</strong>
                            ${keyDisplayHtml}

                            <strong class="col-span-1 text-slate-500">Gói:</strong>
                            <span class="col-span-2">${item.package_type || 'N/A'}</span>

                            <strong class="col-span-1 text-slate-500">Hạn sử dụng:</strong>
                            <span class="col-span-2">${item.expiration_date || 'Vĩnh viễn'}</span>

                            <strong class="col-span-1 text-slate-500">Trạng thái:</strong>
                            <span class="col-span-2"><span class="px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo.classes}">${statusInfo.text}</span></span>

                            <strong class="col-span-1 text-slate-500">Người dùng:</strong>
                            <span class="col-span-2 font-semibold text-blue-600">${item.user || 'Chưa cấp phát'}</span>

                            <strong class="col-span-1 text-slate-500">Ghi chú:</strong>
                            <span class="col-span-2">${item.notes || 'Không có'}</span>
                        </div>
                    </div>
                `;
                showInfoModal(detailsHtml, `Chi tiết License: ${item.key_type}`);
            }
            return;
        }

        // =================================================================
        // [MỚI] LOGIC CLICK VÀO HÀNG (ROW) USER ĐỂ XEM CHI TIẾT
        // =================================================================
        const userRow = t.closest('.user-row');
        if (userRow && !t.closest('button') && !t.closest('input') && !t.closest('a')) {
            const id = parseInt(userRow.dataset.id);
            const user = users.find(u => u.id === id);

            if (user) {
                const uAssets = assets.filter(a => a.user_id === id);
                const uLicenses = licenses.filter(l => l.user_id === id);
                
                // Lấy tên phòng ban từ department object hoặc string
                const deptName = typeof user.department === 'object' ? (user.department?.name || 'N/A') : (user.department || 'N/A');

                let content = `<div class="text-left space-y-4">
                    <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                    <p><strong>Phòng ban:</strong> ${deptName}</p>
                    <p><strong>Trạng thái:</strong> <span class="font-bold ${user.status === 'Đang hoạt động' ? 'text-green-600' : 'text-slate-400'}">${user.status || 'N/A'}</span></p>
                    
                    <div><h4 class="font-bold text-blue-600 mb-1 border-t pt-3">Tài sản đang giữ (${uAssets.length}):</h4>`;
                if (uAssets.length > 0) { 
                    content += '<ul class="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300">'; 
                    uAssets.forEach(a => content += `<li><b>${a.name || 'N/A'}</b></li>`); 
                    content += '</ul>'; 
                } 
                else { content += '<p class="text-sm text-gray-400 italic">Không có tài sản</p>'; }
                
                content += `</div><div><h4 class="font-bold text-green-600 mb-1 border-t pt-3">License đang giữ (${uLicenses.length}):</h4>`;
                if (uLicenses.length > 0) { 
                    content += '<ul class="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300">'; 
                    uLicenses.forEach(l => content += `<li><b>${l.key_type || 'N/A'}</b> <span class="text-gray-500 font-mono text-xs">(${l.package_type || 'N/A'})</span></li>`); 
                    content += '</ul>'; 
                } 
                else { content += '<p class="text-sm text-gray-400 italic">Không có license</p>'; }
                
                content += '</div></div>';
                showInfoModal(content, `Chi tiết: ${user.name}`);
            }
            return;
        }

        // =================================================================
        // CÁC LOGIC KHÁC (Button, Close, Page...)
        // =================================================================
        if (t.closest('.close-modal') || t.closest('#btnCancelClose') || t.closest('#btnConfirmClose') || t.closest('#cancelAddUser') || t.closest('#cancelDeleteBtn') || t.closest('#closeInfoModalBtn') || t.closest('#closeDeptModal')) { const modal = t.closest('.fixed.flex'); if (modal) attemptCloseModal(modal.id); return; }

        const pageBtn = t.closest('a[data-page]');
        if (pageBtn) {
            e.preventDefault();
            const p = parseInt(pageBtn.dataset.page), tbl = pageBtn.dataset.table;

            // Khi chuyển trang, GIỮ NGUYÊN filter, chỉ thay đổi trang hiện tại
            if (tbl === 'assets') {
                assetCurrentPage = p;
                window.applyAssetFilters();
            } else if (tbl === 'licenses') {
                licenseCurrentPage = p;
                window.applyLicenseFilters();
            } else if (tbl === 'users') {
                userCurrentPage = p;
                window.applyUserFilters();
            } else if (tbl === 'maintenance') {
                maintenanceCurrentPage = p;
                renderMaintenanceList();
            } else if (tbl === 'stock') {
                stockCheckCurrentPage = p;
                renderStockCheckList();
            } else if (tbl === 'activity') {
                activityLogCurrentPage = p;
                if (typeof window.renderActivityLog === 'function') window.renderActivityLog();
            }
            return;
        }

        const sortHeader = t.closest('.sortable-header');
        if (sortHeader) { const col = sortHeader.dataset.sort, tbl = sortHeader.closest('table').id; let sObj = tbl === 'assetTable' ? assetSort : (tbl === 'userTable' ? userSort : licenseSort); if (sObj.column === col) sObj.direction = sObj.direction === 'asc' ? 'desc' : 'asc'; else { sObj.column = col; sObj.direction = 'asc'; } if (tbl === 'assetTable') window.applyAssetFilters(); else if (tbl === 'userTable') window.applyUserFilters(); else window.applyLicenseFilters(); return; }

        if (t.closest('#importUsersBtn')) { document.getElementById('userExcelFileInput').click(); return; }
        if (t.closest('#importExcelBtn')) { document.getElementById('excelFileInput').click(); return; }
        if (t.closest('#btnConfirmUserImport')) { await processUserImport(); return; }
        if (t.closest('#btnConfirmImport')) { await processAssetImport(); return; }

        if (t.closest('#btnDeleteSelectedUserImportRows')) { const checkboxes = document.querySelectorAll('.import-check:checked'); Array.from(checkboxes).map(c => parseInt(c.dataset.idx)).sort((a, b) => b - a).forEach(idx => tempImportedUsers.splice(idx, 1)); renderUserImportPreview(); return; }
        if (t.closest('#btnDeleteSelectedImportRows')) { const checkboxes = document.querySelectorAll('.import-check-asset:checked'); Array.from(checkboxes).map(c => parseInt(c.dataset.idx)).sort((a, b) => b - a).forEach(idx => tempImportedAssets.splice(idx, 1)); renderAssetImportPreview(); return; }

        if (t.closest('#manageCategoriesBtn')) { renderLists(); document.getElementById('categoryForm').reset(); document.getElementById('categoryOldName').value = ''; document.getElementById('btnCancelCategoryEdit').classList.add('hidden'); openModal('categoryModal'); return; }
        if (t.closest('#btnCancelCategoryEdit')) { document.getElementById('categoryForm').reset(); document.getElementById('categoryOldName').value = ''; t.closest('#btnCancelCategoryEdit').classList.add('hidden'); return; }
        if (t.closest('#manageDeptsBtn')) { renderLists(); document.getElementById('departmentForm').reset(); openModal('departmentManagementModal'); return; }
        if (t.closest('#manageLicenseTypesBtn')) { renderLists(); document.getElementById('licenseTypeForm').reset(); document.getElementById('btnCancelLicenseTypeEdit').classList.add('hidden'); openModal('licenseTypeModal'); return; }
        if (t.closest('#btnCancelLicenseTypeEdit')) { document.getElementById('licenseTypeForm').reset(); document.getElementById('licenseTypeId').value = ''; t.closest('#btnCancelLicenseTypeEdit').classList.add('hidden'); return; }

        if (t.closest('#clear-read-notifications-btn')) { showConfirmationModal("Bạn có muốn xem lại tất cả thông báo đã đọc không?", () => { localStorage.removeItem('readNotifications'); checkAndDisplayNotifications(); }); return; }

        if (t.closest('#addAssetBtn')) { document.getElementById('assetForm').reset(); document.getElementById('modal_assetId').value = ''; document.getElementById('modalTitle').textContent = 'Thêm tài sản mới'; initAllUserDropdowns(); openModal('assetModal'); return; }
        if (t.closest('#openMaintenanceModalBtn')) { document.getElementById('maintenanceForm')?.reset(); updateDropdowns(); openModal('maintenanceModal'); return; }
        if (t.closest('#openStockCheckModalBtn')) { document.getElementById('stockCheckForm')?.reset(); openModal('stockCheckModal'); return; }
        if (t.closest('#addLicenseBtn')) { document.getElementById('licenseForm').reset(); document.getElementById('modal_licenseId').value = ''; document.getElementById('licenseModalTitle').textContent = 'Thêm License mới'; initAllUserDropdowns(); openModal('licenseModal'); return; }
        if (t.closest('#addUserBtn')) { safeCloseModal('addUserModal'); updateDropdowns(); openModal('addUserModal'); return; }

        if (t.closest('#exportExcelBtn')) {
            window.applyAssetFilters();
            const activeFilter = isAssetFilterOrSearchActive();
            const sourceRows = resolveExportData(currentFilteredAssets, assets, activeFilter);
            const data = sourceRows.map(a => ({ "Mã tài sản": a.asset_code || '', "Tên": a.name, "Cấu hình": a.config, "Loại": a.category, "Vị trí": a.location, "Ngày nhập": formatDateDisplay(a.purchase_date), "Người dùng": a.user, "Trạng thái": a.status, "Ghi chú": a.notes }));
            exportToExcel(data, 'Assets.xlsx');
            return;
        }
        if (t.closest('#exportLicenseBtn')) {
            window.applyLicenseFilters();
            const activeFilter = isLicenseFilterOrSearchActive();
            const sourceRows = resolveExportData(currentFilteredLicenses, licenses, activeFilter);
            const data = sourceRows.map(l => ({
                "Mã license": l.license_code || '',
                "Loại Key": l.key_type || '',
                "Mã Key": l.license_key || '',
                "Gói": l.package_type || '',
                "Hạn SD": l.expiration_date ? formatDateDisplay(l.expiration_date) : 'Vĩnh viễn',
                "Người dùng": l.user || '',
                "Trạng thái": (STATUS_MAP[l.status] && STATUS_MAP[l.status].text) || l.status || '',
                "Ghi chú": l.notes || ''
            }));
            exportToExcel(data, 'Licenses.xlsx');
            return;
        }
        if (t.closest('#exportUsersBtn')) {
            applyUserFilters();
            const activeFilter = isUserFilterOrSearchActive();
            const sourceRows = resolveExportData(currentFilteredUsers, users, activeFilter);
            const data = sourceRows.map(u => ({ "Tên": u.name, "Email": u.email, "Phòng ban": u.department, "Trạng thái": u.status }));
            exportToExcel(data, 'Users.xlsx');
            return;
        }

        if (t.closest('#btnConfirmAction') || t.closest('#confirmDeleteBtn')) { if (confirmCallback) await confirmCallback(); safeCloseModal('confirmationModal'); safeCloseModal('confirmModal'); return; }

        const actionBtn = t.closest('button[data-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.action, id = parseInt(actionBtn.dataset.id);
            const isAdmin = currentUserProfile.role === 'admin';

            // [PHÂN QUYỀN] Chỉ admin mới được thực hiện các hành động nguy hiểm
            if (['delete-asset', 'edit-asset', 'checkout-asset', 'checkin-asset', 'transfer', 
                 'delete-license', 'edit-license', 'checkout-license', 'checkin-license',
                 'delete-user', 'edit-user',
                 'delete-cat', 'edit-cat', 'delete-dept', 'edit-dept', 'delete-lic-type', 'edit-lic-type'
                ].includes(action) && !isAdmin) {
                return showInfoModal("Bạn không có quyền thực hiện hành động này.", "Truy cập bị từ chối");
            }

            if (action === 'copy-key') {
                const keyValue = actionBtn.dataset.key || '';
                const icon = actionBtn.querySelector('i');
                const restoreIcon = () => { if (icon) { icon.classList.remove('fa-check', 'text-green-600'); icon.classList.add('fa-regular', 'fa-copy'); } };
                const markCopied = () => {
                    if (icon) { icon.classList.remove('fa-regular', 'fa-copy'); icon.classList.add('fa-solid', 'fa-check', 'text-green-600'); }
                    setTimeout(restoreIcon, 1500);
                };
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(keyValue);
                    } else {
                        const textarea = document.createElement('textarea');
                        textarea.value = keyValue;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                    }
                    markCopied();
                } catch (err) {
                    console.warn('Copy mã key thất bại', err);
                    showInfoModal('Không thể copy mã key. Vui lòng copy thủ công.', 'Lỗi');
                }
                return;
            }

            // [KHÔI PHỤC] Xử lý đánh dấu đã đọc thông báo
            if (action === 'mark-notif-read') {
                const notifId = actionBtn.dataset.notifId;
                if (notifId) {
                    let readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
                    if (!readNotifications.includes(notifId)) {
                        readNotifications.push(notifId);
                        localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
                        checkAndDisplayNotifications(); // Cập nhật lại UI thông báo
                    }
                }
                e.stopPropagation(); // Ngăn không cho dropdown bị đóng lại
                return;
            }

            if (action === 'delete-asset') {
                const assetToDelete = assets.find(a => a.id === id);
                if (assetToDelete && assetToDelete.status !== 'Stock') {
                    return showInfoModal('Tài sản đang sử dụng hoặc hỏng hóc. Vui lòng thu hồi về kho trước khi xóa.', 'Không thể xóa');
                }
                const assetName = assetToDelete?.name || 'tài sản';
                showConfirmationModal("Xóa tài sản này?", async () => { const { error } = await supabaseClient.from('assets').delete().eq('id', id); if (error) handleSupabaseError(error, 'xóa'); else { await addLog(id, 'ASSET', 'Xóa', `Xóa tài sản: ${assetName}`); await refreshApp(); showInfoModal(`Đã xóa "${assetName}"!`, 'Xóa thành công'); } });
            }
            else if (action === 'edit-asset') { const item = assets.find(a => a.id === id); if (item) { document.getElementById('modal_assetId').value = item.id;['modal_assetName', 'modal_assetConfig', 'modal_assetLocation', 'modal_assetStatus', 'modal_assetNotes'].forEach(k => document.getElementById(k).value = item[k.replace('modal_asset', '').toLowerCase()] || ''); document.getElementById('modal_assetPurchaseDate').value = item.purchase_date ? item.purchase_date.toString().substring(0, 10) : ''; document.getElementById('modal_assetCost').value = item.cost || 0; document.getElementById('modal_assetSalvage').value = item.salvage_value || 0; document.getElementById('modal_assetLife').value = item.useful_life_months || ''; document.getElementById('modal_assetDepMethod').value = item.depreciation_method || 'straight_line'; updateDropdowns(); document.getElementById('modal_assetCategory').value = categories.find(c => c.name === item.category)?.id || ''; document.getElementById('modalTitle').textContent = 'Sửa tài sản'; initAllUserDropdowns(item.user); openModal('assetModal'); } }
            else if (action === 'checkout-asset') { tempId = id; document.getElementById('assignAssetName').textContent = assets.find(a => a.id === id)?.name; initAllUserDropdowns(); openModal('checkOutModal'); }
            else if (action === 'checkin-asset') {
                const assetToCheckIn = assets.find(a => a.id === id);
                const fromUser = assetToCheckIn?.user || 'Không rõ';
                const assetName = assetToCheckIn?.name || 'tài sản';
                showConfirmationModal(`Thu hồi tài sản từ ${fromUser}?`, async () => {
                    await supabaseClient.from('assets').update({ status: 'Stock', user_id: null }).eq('id', id);
                    // SỬA LỖI: Thêm tên người dùng vào log để lịch sử chi tiết hơn
                    await addLog(id, 'ASSET', 'Thu hồi', `Từ người dùng: ${fromUser}`);
                    await refreshApp();
                    showInfoModal(`Đã thu hồi "${assetName}" từ ${fromUser}!`, 'Thu hồi thành công');
                });
            }
            else if (action === 'transfer') { tempId = id; document.getElementById('transferAssetName').textContent = assets.find(a => a.id === id)?.name; document.getElementById('transferCurrentUser').value = assets.find(a => a.id === id)?.user || 'Chưa có'; initAllUserDropdowns(); openModal('transferModal'); }
            else if (action === 'history-asset') {
                const item = assets.find(a => a.id === id);
                document.getElementById('historyModalTitle').textContent = `Lịch sử tài sản: ${item?.name}`;
                const logs = assetHistory.filter(l => l.assetId === id);
                historyExportBuffer = logs;
                document.getElementById('historyTableBody').innerHTML = logs.length
                    ? logs.map(l => `<tr class="border-b hover:bg-slate-50"><td class="p-3">${l.time}</td><td class="p-3">${l.assetName}</td><td class="p-3 font-bold">${l.action}</td><td class="p-3">${l.desc}</td></tr>`).join('')
                    : '<tr><td colspan="4" class="p-4 text-center">Không có lịch sử</td></tr>';
                openModal('historyModal');
            }
            else if (action === 'delete-license') {
                const licenseToDelete = licenses.find(l => l.id === id);
                if (licenseToDelete && licenseToDelete.status !== 'Stock') {
                    return showInfoModal('License đang sử dụng hoặc hỏng hóc. Vui lòng thu hồi về kho trước khi xóa.', 'Không thể xóa');
                }
                const licenseName = licenseToDelete?.key_type || 'license';
                showConfirmationModal("Xóa License?", async () => { const { error } = await supabaseClient.from('licenses').delete().eq('id', id); if (error) handleSupabaseError(error, 'xóa'); else { await addLog(id, 'LICENSE', 'Xóa', `Xóa license: ${licenseName}`); await refreshApp(); showInfoModal(`Đã xóa "${licenseName}"!`, 'Xóa thành công'); } });
            }
            else if (action === 'edit-license') { const item = licenses.find(l => l.id === id); if (item) { document.getElementById('modal_licenseId').value = item.id;['modal_licenseKey', 'modal_packageType', 'modal_expirationDate', 'modal_licenseStatus', 'modal_licenseNotes'].forEach(k => { let val = item[k.replace('modal_', '').replace('expirationDate', 'expiration_date').replace('licenseKey', 'license_key').replace('packageType', 'package_type').replace('licenseStatus', 'status').replace('licenseNotes', 'notes')]; document.getElementById(k).value = val || ''; }); updateDropdowns(); document.getElementById('modal_licenseType').value = item.key_type; document.getElementById('licenseModalTitle').textContent = 'Sửa License'; initAllUserDropdowns(item.user); openModal('licenseModal'); } }
            else if (action === 'checkout-license') { tempId = id; document.getElementById('assignLicenseName').textContent = licenses.find(l => l.id === id)?.key_type; initAllUserDropdowns(); openModal('checkOutLicenseModal'); }
            else if (action === 'checkin-license') {
                const licenseToCheckIn = licenses.find(l => l.id === id);
                const fromUser = licenseToCheckIn?.user || 'Không rõ';
                const licenseName = licenseToCheckIn?.key_type || 'license';
                showConfirmationModal(`Thu hồi license từ ${fromUser}?`, async () => {
                    await supabaseClient.from('licenses').update({ status: 'Stock', user_id: null }).eq('id', id);
                    await addLog(id, 'LICENSE', 'Thu hồi', `Từ người dùng: ${fromUser}`);
                    await refreshApp();
                    showInfoModal(`Đã thu hồi "${licenseName}" từ ${fromUser}!`, 'Thu hồi thành công');
                });
            }

            else if (action === 'delete-user') { if (assets.some(a => a.user_id === id) || licenses.some(l => l.user_id === id)) return showInfoModal("Không thể xóa user đang giữ tài sản/license!"); showConfirmationModal("Xóa nhân viên?", async () => { await supabaseClient.from('users').delete().eq('id', id); await addLog(id, 'USER', 'Xóa', 'Xóa nhân viên'); await refreshApp(); }); }
            else if (action === 'edit-user') { const u = users.find(x => x.id === id); if (u) { document.getElementById('userId').value = u.id; document.getElementById('name').value = u.name; document.getElementById('email').value = u.email; document.getElementById('status').value = u.status; updateDropdowns(); document.getElementById('department').value = departments.find(d => d.name === u.department)?.id || ''; openModal('addUserModal'); } }

            else if (action === 'delete-cat') { const catName = categories.find(c => c.id === id)?.name || ''; showConfirmationModal("Xóa danh mục?", async () => { await supabaseClient.from('categories').delete().eq('id', id); await addLog(id, 'CATEGORY', 'Xóa', catName); await refreshApp(); renderLists(); }); }
            else if (action === 'edit-cat') { document.getElementById('categoryName').value = actionBtn.dataset.name; document.getElementById('categoryOldName').value = id; document.getElementById('btnCancelCategoryEdit').classList.remove('hidden'); document.getElementById('categoryName').focus(); }
            else if (action === 'delete-dept') { const deptName = departments.find(d => d.id === id)?.name || ''; showConfirmationModal("Xóa phòng ban?", async () => { await supabaseClient.from('departments').delete().eq('id', id); await addLog(id, 'DEPARTMENT', 'Xóa', deptName); await refreshApp(); renderLists(); }); }
            else if (action === 'edit-dept') { document.getElementById('deptName').value = actionBtn.dataset.name; document.getElementById('deptId').value = id; document.getElementById('cancelDeptEdit').classList.remove('hidden'); }
            else if (action === 'delete-lic-type') { const typeName = licenseTypes.find(t => t.id === id)?.name || ''; showConfirmationModal("Xóa loại key?", async () => { await supabaseClient.from('license_types').delete().eq('id', id); await addLog(id, 'LICENSE_TYPE', 'Xóa', typeName); await refreshApp(); renderLists(); }); }
            else if (action === 'edit-lic-type') { document.getElementById('licenseTypeName').value = actionBtn.dataset.name; document.getElementById('licenseTypeId').value = id; document.getElementById('btnCancelLicenseTypeEdit').classList.remove('hidden'); }
            else if (action === 'delete-maint') {
                const task = maintenanceTasks.find(t => t.id === id);
                if (task && task.status === 'Hoàn thành' && currentUserProfile.role !== 'admin') {
                    return showInfoModal('Lịch bảo trì đã hoàn thành, chỉ admin mới được xóa.', 'Không thể xóa');
                }
                showConfirmationModal("Xóa lịch bảo trì này?", async () => {
                    const { error } = await supabaseClient.from('maintenance_tasks').delete().eq('id', id);
                    if (error) return handleSupabaseError(error, 'xóa lịch bảo trì');
                    if (task?.asset_id) await addLog(task.asset_id, 'MAINT', 'Xóa', `Xóa lịch bảo trì: ${task.title || ''}`);
                    await refreshApp();
                    showInfoModal('Đã xóa lịch bảo trì!', 'Xóa thành công');
                });
            }
            else if (action === 'complete-maint') {
                const task = maintenanceTasks.find(t => t.id === id);
                showConfirmationModal("Đánh dấu lịch bảo trì này đã hoàn thành?", async () => {
                    const { error } = await supabaseClient.from('maintenance_tasks').update({ status: 'Hoàn thành' }).eq('id', id);
                    if (error) return handleSupabaseError(error, 'cập nhật lịch bảo trì');
                    if (task?.asset_id) await addLog(task.asset_id, 'MAINT', 'Hoàn thành', `Hoàn thành lịch bảo trì: ${task.title || ''}`);
                    await refreshApp();
                    showInfoModal(`Đã đánh dấu "${task?.title || 'lịch bảo trì'}" hoàn thành!`, 'Cập nhật thành công');
                });
            }
            else if (action === 'delete-stock') {
                const stockCheck = stockChecks.find(s => s.id === id);
                if (stockCheck && stockCheck.status === 'Hoàn thành' && currentUserProfile.role !== 'admin') {
                    return showInfoModal('Đợt kiểm kê đã hoàn thành, chỉ admin mới được xóa.', 'Không thể xóa');
                }
                showConfirmationModal("Xóa đợt kiểm kê này?", async () => {
                    const { error } = await supabaseClient.from('stock_checks').delete().eq('id', id);
                    if (error) return handleSupabaseError(error, 'xóa đợt kiểm kê');
                    await addLog(id, 'STOCK_CHECK', 'Xóa', stockCheck?.note || '');
                    await refreshApp();
                    showInfoModal('Đã xóa đợt kiểm kê!', 'Xóa thành công');
                });
            }
            else if (action === 'complete-stock') {
                const stockCheck = stockChecks.find(s => s.id === id);
                showConfirmationModal("Đánh dấu đợt kiểm kê này đã hoàn thành?", async () => {
                    const { error } = await supabaseClient.from('stock_checks').update({ status: 'Hoàn thành' }).eq('id', id);
                    if (error) return handleSupabaseError(error, 'cập nhật đợt kiểm kê');
                    await addLog(id, 'STOCK_CHECK', 'Hoàn thành', stockCheck?.note || '');
                    await refreshApp();
                    showInfoModal('Đã đánh dấu đợt kiểm kê hoàn thành!', 'Cập nhật thành công');
                });
            }
            else if (action === 'print-asset-label') openPrintLabelModal('asset', [id]);
            else if (action === 'print-license-label') openPrintLabelModal('license', [id]);
        }
    });

    // =================================================================
    // IN TEM BARCODE/QR (Assets & Licenses)
    // =================================================================
    document.body.addEventListener('change', (e) => {
        const t = e.target;
        if (t.matches('.asset-select-checkbox')) {
            const id = parseInt(t.dataset.id, 10);
            if (t.checked) selectedAssetIds.add(id); else selectedAssetIds.delete(id);
        } else if (t.matches('.license-select-checkbox')) {
            const id = parseInt(t.dataset.id, 10);
            if (t.checked) selectedLicenseIds.add(id); else selectedLicenseIds.delete(id);
        } else if (t.id === 'selectAllAssets') {
            document.querySelectorAll('.asset-select-checkbox').forEach(cb => {
                cb.checked = t.checked;
                const id = parseInt(cb.dataset.id, 10);
                if (t.checked) selectedAssetIds.add(id); else selectedAssetIds.delete(id);
            });
        } else if (t.id === 'selectAllLicenses') {
            document.querySelectorAll('.license-select-checkbox').forEach(cb => {
                cb.checked = t.checked;
                const id = parseInt(cb.dataset.id, 10);
                if (t.checked) selectedLicenseIds.add(id); else selectedLicenseIds.delete(id);
            });
        } else if (t.name === 'labelType' && document.getElementById('printLabelModal') && !document.getElementById('printLabelModal').classList.contains('hidden')) {
            renderPrintLabelPreview();
        }
    });

    document.getElementById('printAssetLabelsBtn')?.addEventListener('click', () => {
        const ids = selectedAssetIds.size ? Array.from(selectedAssetIds) : (isAssetFilterOrSearchActive() ? currentFilteredAssets.map(a => a.id) : assets.map(a => a.id));
        if (!ids.length) return showInfoModal('Không có tài sản nào để in tem.');
        openPrintLabelModal('asset', ids);
    });

    document.getElementById('printLicenseLabelsBtn')?.addEventListener('click', () => {
        const ids = selectedLicenseIds.size ? Array.from(selectedLicenseIds) : (isLicenseFilterOrSearchActive() ? currentFilteredLicenses.map(l => l.id) : licenses.map(l => l.id));
        if (!ids.length) return showInfoModal('Không có license nào để in tem.');
        openPrintLabelModal('license', ids);
    });

    let printLabelState = { kind: 'asset', ids: [] };

    function openPrintLabelModal(kind, ids) {
        printLabelState = { kind, ids };
        const countEl = document.getElementById('printLabelCount');
        if (countEl) countEl.textContent = `${ids.length} tem sẽ được in`;
        openModal('printLabelModal');
        renderPrintLabelPreview();
    }

    function renderPrintLabelPreview() {
        const container = document.getElementById('printLabelPreview');
        if (!container) return;
        const type = document.querySelector('input[name="labelType"]:checked')?.value || 'barcode';
        const { kind, ids } = printLabelState;

        const items = kind === 'asset'
            ? ids.map(id => assets.find(a => a.id === id)).filter(Boolean)
            : ids.map(id => licenses.find(l => l.id === id)).filter(Boolean);

        if (!items.length) { container.innerHTML = '<p class="text-center text-slate-400 p-8">Không có dữ liệu để in.</p>'; return; }

        container.innerHTML = items.map(item => {
            const code = kind === 'asset' ? (item.asset_code || '') : (item.license_code || '');
            const title = kind === 'asset' ? item.name : item.key_type;
            const elId = `label-${kind}-${item.id}`;
            return `
                <div class="label-card">
                    <div class="label-card-title">${title || ''}</div>
                    ${type === 'barcode'
                        ? `<svg class="label-barcode" id="${elId}"></svg>`
                        : `<div class="label-qr" id="${elId}"></div>`}
                    <div class="label-card-code">${code}</div>
                </div>
            `;
        }).join('');

        items.forEach(item => {
            const code = kind === 'asset' ? (item.asset_code || '') : (item.license_code || '');
            const elId = `label-${kind}-${item.id}`;
            const el = document.getElementById(elId);
            if (!el) return;
            if (type === 'barcode') {
                try {
                    if (typeof JsBarcode === 'function') JsBarcode(el, code || '-', { format: 'CODE128', width: 2, height: 50, fontSize: 14, margin: 4 });
                } catch (e) { console.warn('JsBarcode render failed', e); }
            } else {
                const info = kind === 'asset'
                    ? `Mã tài sản: ${code}\nTên: ${item.name || ''}\nLoại: ${item.category || ''}\nVị trí: ${item.location || ''}\nNgười dùng: ${item.user || 'Chưa cấp phát'}\nTrạng thái: ${(STATUS_MAP[item.status] || {}).text || item.status || ''}`
                    : `Mã license: ${code}\nLoại key: ${item.key_type || ''}\nGói: ${item.package_type || ''}\nHạn SD: ${item.expiration_date || 'Vĩnh viễn'}\nNgười dùng: ${item.user || 'Chưa cấp phát'}\nTrạng thái: ${(STATUS_MAP[item.status] || {}).text || item.status || ''}`;
                try {
                    if (typeof window.qrcode === 'function') {
                        // Mặc định thư viện dùng bảng mã 'default' (cắt mỗi ký tự về 1 byte thấp),
                        // làm hỏng tiếng Việt có dấu khi quét. Chuyển sang bộ mã hoá UTF-8 có sẵn.
                        if (window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs['UTF-8']) {
                            window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
                        }
                        const qr = window.qrcode(0, 'M');
                        qr.addData(info);
                        qr.make();
                        el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2 });
                    }
                } catch (e) { console.warn('QRCode render failed', e); }
            }
        });
    }

    document.getElementById('btnDoPrintLabels')?.addEventListener('click', () => window.print());
    // =================================================================
    // LOGIC CHUYỂN ĐỔI LICENSE (TRANSFER) & LỊCH SỬ (HISTORY)
    // =================================================================

    // 1. Biến tạm
    let tempTransferLicenseId = null;

    // 2. Lắng nghe sự kiện click trong bảng (Thêm vào event listener hiện có hoặc tạo mới)
    const licenseTableBody = document.getElementById('licenseTableBody');
    if (licenseTableBody) {
        licenseTableBody.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'transfer-license') {
                openTransferLicenseModal(id);
            } else if (action === 'history-license') {
                openLicenseHistoryModal(id);
            }
            // ... (các action cũ edit/delete giữ nguyên) ...
        });
    }

    // 3. Hàm mở Modal Chuyển đổi-
    function openTransferLicenseModal(id) {
        // 1. Tìm License theo ID
        const license = licenses.find(l => l.id == id);
        if (!license) return;

        // 2. Lưu ID vào biến tạm để tí nữa bấm nút Lưu còn biết ID nào
        tempTransferLicenseId = id;

        // 3. Điền thông tin Text (Người cũ, Tên License...)
        document.getElementById('transferLicenseName').textContent = `${license.key_type} - ${license.license_key}`;
        document.getElementById('transferLicenseCurrentUser').value = license.user || 'Chưa phân bổ';
        document.getElementById('transferLicenseNotes').value = '';

        // 4. Xử lý Dropdown Chọn Người Mới 
        const selectEl = document.getElementById('transferLicenseNewUserSelect');

        // [Bước 1] Kiểm tra xem có instance cũ không -> Hủy nó đi!
        // (Đây là bước quan trọng nhất để tránh lỗi giao diện)
        if (selectEl.choicesInstance) {
            selectEl.choicesInstance.destroy();
        }
        // [Bước 2] Lọc danh sách User (Trừ người đang dùng hiện tại ra)
        const availableUsers = users.filter(u => u.name !== license.user);

        // [Bước 3] Nạp lại HTML <option> mới vào thẻ select
        selectEl.innerHTML = availableUsers.map(u =>
            `<option value="${u.id}">${u.name} - ${u.department}</option>`
        ).join('');

        // [Bước 4] Khởi tạo Choices.js mới tinh
        const newChoices = new Choices(selectEl, {
            searchEnabled: true,
            itemSelectText: '',
            placeholderValue: 'Chọn người nhận...',
            shouldSort: false,
        });

        // [Bước 5] Gắn ngược instance vào thẻ để lần sau mở lại còn hủy được
        selectEl.choicesInstance = newChoices; // Gán instance vào một thuộc tính tự định nghĩa

        // 5. Mở Modal lên
        openModal('transferLicenseModal');
    }

    // --- Xử lý nút Xác nhận chuyển License  ---
    // --- NÚT XÁC NHẬN CHUYỂN ĐỔI ---
    const btnTransferLic = document.getElementById('btnConfirmTransferLicense');
    if (btnTransferLic) {
        btnTransferLic.addEventListener('click', async () => {
            const selectEl = document.getElementById('transferLicenseNewUserSelect');
            const newUserId = selectEl.value; // Lấy value trực tiếp (ID user)
            const note = document.getElementById('transferLicenseNotes').value;

            if (!newUserId) return showInfoModal("Vui lòng chọn người nhận mới!");

            btnTransferLic.textContent = "Đang xử lý...";
            btnTransferLic.disabled = true;

            try {
                // 1. Cập nhật Database
                const { error } = await supabaseClient
                    .from('licenses')
                    .update({
                        user_id: newUserId,
                        status: 'Active', // Chuyển xong thì auto Active
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', tempTransferLicenseId);

                if (error) throw error;

                // 2. Ghi Log
                const newUser = users.find(u => u.id == newUserId);
                const license = licenses.find(l => l.id == tempTransferLicenseId);

                await addLog(tempTransferLicenseId, 'LICENSE', 'Điều chuyển',
                    `Từ: ${license?.user || 'Kho'} -> Sang: ${newUser?.name}. Ghi chú: ${note}`
                );

                // 3. Thông báo & Refresh
                safeCloseModal('transferLicenseModal');
                await refreshApp();
                showInfoModal(`Đã chuyển "${license?.key_type || 'license'}" sang ${newUser?.name}!`, 'Chuyển đổi thành công');

            } catch (err) {
                handleSupabaseError(err, "Chuyển đổi License");
            } finally {
                btnTransferLic.textContent = "Xác nhận chuyển";
                btnTransferLic.disabled = false;
            }
        });
    }

    // 5. Hàm xem Lịch sử License
    async function openLicenseHistoryModal(id) {
        const license = licenses.find(l => l.id == id);
        if (!license) return;

        document.getElementById('historyLicenseTitle').textContent = `${license.key_type} - ${license.license_key}`;
        const tbody = document.getElementById('licenseHistoryTableBody');
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400">Đang tải...</td></tr>';
        openModal('licenseHistoryModal');

        try {
            // Query theo ID (asset_id) và lọc description có chứa "[LICENSE]"
            // Thay vì tìm kiếm text license key (dễ bị sai hoặc không tìm thấy)
            const { data, error } = await supabaseClient
                .from('asset_history')
                .select('*')
                .eq('asset_id', id)                   // Tìm đúng ID này trong lịch sử
                .ilike('description', '%[LICENSE]%')  // Lọc chỉ lấy các dòng log của License
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400">Chưa có lịch sử.</td></tr>';
                historyExportBuffer = [];
            } else {
                historyExportBuffer = data.map(log => ({
                    time: new Date(log.created_at).toLocaleString('vi-VN'),
                    assetName: license.key_type,
                    action: log.action,
                    desc: log.description
                }));
                tbody.innerHTML = data.map(log => `
                <tr class="hover:bg-slate-50">
                    <td class="p-3 text-slate-500 text-xs">${new Date(log.created_at).toLocaleString('vi-VN')}</td>
                    <td class="p-3 font-semibold text-blue-600 text-xs">${log.action}</td>
                    <td class="p-3 text-slate-600 text-sm">${log.description}</td>
                </tr>
            `).join('');
            }

        } catch (err) {
            console.error('Lỗi tải lịch sử license:', err);
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-red-400">Lỗi tải lịch sử.</td></tr>';
        }
    }

    return;
};

