window.QLTSPageLicense = window.QLTSPageLicense || {};

if (typeof window.handleAssetFileSelect !== 'function') window.handleAssetFileSelect = function () {};
if (typeof window.handleUserFileSelect !== 'function') window.handleUserFileSelect = function () {};
if (typeof window.applyAssetFilters !== 'function') window.applyAssetFilters = function () {};
if (typeof window.applyLicenseFilters !== 'function') window.applyLicenseFilters = function () {};
if (typeof window.applyUserFilters !== 'function') window.applyUserFilters = function () {};

window.QLTSPageLicense.init = async function () {
    // =================================================================

    // Ngày hôm nay dạng YYYY-MM-DD theo giờ local (dùng để ghi "ngày cấp phát"),
    // tránh lệch ngày do new Date().toISOString() quy về UTC.
    function todayDateStrLocal() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
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

    // [MỚI] Tìm kiếm toàn cục: render kết quả khi gõ
    document.getElementById('globalSearchInput')?.addEventListener('input', (e) => {
        if (typeof renderGlobalSearchResults === 'function') renderGlobalSearchResults(e.target.value);
    });

    // --- MAIN CLICK HANDLER ---
    document.body.addEventListener('click', async (e) => {
        const t = e.target;

        // --- CÁC HÀNH ĐỘNG CHUNG (Header đã được chuẩn hóa quản lý bởi QLTSHeader trong sidebar.js) ---

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
                // [MỚI] Ngày cấp phát: chỉ có ý nghĩa khi thiết bị đang được sử dụng
                const assignedDateHtml = (item.status === 'Active' && item.assigned_date)
                    ? `<p><strong>Ngày cấp phát:</strong> ${formatDateDisplay(item.assigned_date)}</p>`
                    : '';
                const disposedHtml = (item.status === 'Disposed')
                    ? `<p><strong>Ngày thanh lý:</strong> ${formatDateDisplay(item.disposed_date)}</p><p><strong>Lý do thanh lý:</strong> ${item.disposed_reason || 'Không có'}</p>`
                    : '';
                const supplierHtml = (item.supplier || item.invoice_number)
                    ? `<p><strong>Nhà cung cấp:</strong> ${item.supplier || 'N/A'}${item.invoice_number ? ` <span class="text-slate-400">(HĐ: ${item.invoice_number})</span>` : ''}</p>`
                    : '';
                const detailsHtml = `
                    <div class="text-left space-y-2 text-sm">
                        <p><strong>Tên thiết bị:</strong> ${item.name}</p>
                        <p><strong>Loại:</strong> ${item.category || 'N/A'}</p>
                        <p><strong>Trạng thái:</strong> <span class="px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo.classes}">${statusInfo.text}</span></p>
                        <p><strong>Người dùng:</strong> <span class="font-semibold text-blue-600">${item.user || 'Chưa cấp phát'}</span></p>
                        ${assignedDateHtml}
                        ${disposedHtml}
                        <p><strong>Vị trí:</strong> ${item.location || 'N/A'}</p>
                        ${supplierHtml}
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

                            ${(item.status === 'Active' && item.assigned_date) ? `
                            <strong class="col-span-1 text-slate-500">Ngày cấp phát:</strong>
                            <span class="col-span-2">${formatDateDisplay(item.assigned_date)}</span>
                            ` : ''}

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
        // [MỚI] LOGIC CLICK VÀO HÀNG (ROW) LỊCH BẢO TRÌ / KIỂM KÊ ĐỂ XEM CHI TIẾT
        // =================================================================
        const maintRow = t.closest('.maintenance-row');
        if (maintRow && !t.closest('button') && !t.closest('input') && !t.closest('a')) {
            const id = parseInt(maintRow.dataset.id);
            const task = maintenanceTasks.find(m => m.id === id);
            if (task) {
                const asset = assets.find(a => a.id === task.asset_id);
                const assetName = asset ? `${asset.name}${asset.asset_code ? ` (${asset.asset_code})` : ''}` : 'Chưa gắn thiết bị';
                const creator = users.find(u => u.id === task.created_by)?.name || (task.created_by === 'local-admin' ? (window.currentUserProfile?.full_name || 'Admin') : 'Admin');
                const detailsHtml = `
                    <div class="text-left space-y-2 text-sm">
                        <p><strong>Tiêu đề:</strong> ${task.title || '-'}</p>
                        <p><strong>Thiết bị:</strong> ${assetName}</p>
                        <p><strong>Ngày dự kiến:</strong> ${formatDateDisplay(task.due_date)}</p>
                        <p><strong>Trạng thái:</strong> ${task.status || '-'}</p>
                        <p><strong>Ghi chú / Nội dung:</strong> ${task.note || 'Không có'}</p>
                        <p><strong>Người tạo:</strong> ${creator}</p>
                    </div>
                `;
                showInfoModal(detailsHtml, `Chi tiết lịch bảo trì`);
            }
            return;
        }

        const stockRow = t.closest('.stock-row');
        if (stockRow && !t.closest('button') && !t.closest('input') && !t.closest('a')) {
            const id = parseInt(stockRow.dataset.id);
            await openStockCheckDetail(id);
            return;
        }

        // =================================================================
        // CÁC LOGIC KHÁC (Button, Close, Page...)
        // =================================================================
        if (t.closest('.close-modal') || t.closest('#btnCancelClose') || t.closest('#btnConfirmClose') || t.closest('#cancelAddUser') || t.closest('#cancelDeleteBtn') || t.closest('#closeInfoModalBtn') || t.closest('#closeDeptModal')) { const modal = t.closest('.fixed.flex') || t.closest('.fixed'); if (modal) attemptCloseModal(modal.id); return; }

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
            } else if (tbl === 'assign-active') {
                window.assignActiveCurrentPage = p;
                if (typeof renderAssignmentList === 'function') renderAssignmentList();
            } else if (tbl === 'assign-history') {
                window.assignHistoryCurrentPage = p;
                if (typeof renderAssignmentList === 'function') renderAssignmentList();
            } else if (tbl === 'inventory-stock') {
                window.inventoryCurrentPage = p;
                if (typeof renderInventoryList === 'function') renderInventoryList();
            } else if (tbl === 'inventory-history') {
                window.supplyTransCurrentPage = p;
                if (typeof renderInventoryList === 'function') renderInventoryList();
            }
            return;
        }

        if (t.closest('#tabBtnActive')) {
            window.assignCurrentTab = 'active';
            window.assignActiveCurrentPage = 1;
            if (typeof renderAssignmentList === 'function') renderAssignmentList();
            return;
        }
        if (t.closest('#tabBtnHistory')) {
            window.assignCurrentTab = 'history';
            window.assignHistoryCurrentPage = 1;
            if (typeof renderAssignmentList === 'function') renderAssignmentList();
            return;
        }
        if (t.closest('#tabBtnCurrentStock')) {
            window.inventoryCurrentTab = 'stock';
            window.inventoryCurrentPage = 1;
            if (typeof renderInventoryList === 'function') renderInventoryList();
            return;
        }
        if (t.closest('#tabBtnStockHistory')) {
            window.inventoryCurrentTab = 'history';
            window.supplyTransCurrentPage = 1;
            if (typeof renderInventoryList === 'function') renderInventoryList();
            return;
        }
        if (t.closest('#btnOpenAddSupplyModal')) {
            document.getElementById('supplyForm')?.reset();
            const supplyIdEl = document.getElementById('supply_id');
            if (supplyIdEl) supplyIdEl.value = '';
            const titleEl = document.getElementById('supplyModalTitle');
            if (titleEl) titleEl.textContent = 'Thêm mặt hàng vật tư mới';
            const initQtyCont = document.getElementById('initialQtyContainer');
            if (initQtyCont) initQtyCont.classList.remove('hidden');
            if (typeof window.initInventoryDropdowns === 'function') window.initInventoryDropdowns();
            openModal('supplyModal');
            return;
        }
        if (t.closest('#btnOpenStockInModal')) {
            document.getElementById('stockInForm')?.reset();
            if (typeof window.initInventoryDropdowns === 'function') window.initInventoryDropdowns();
            const dateInput = document.getElementById('stockin_date');
            if (dateInput) dateInput.value = typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0];
            openModal('stockInModal');
            return;
        }
        if (t.closest('#btnOpenStockOutModal')) {
            document.getElementById('stockOutForm')?.reset();
            if (typeof window.initInventoryDropdowns === 'function') window.initInventoryDropdowns();
            const dateInput = document.getElementById('stockout_date');
            if (dateInput) dateInput.value = typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0];
            const qtyDisplay = document.getElementById('stockout_current_qty_display');
            if (qtyDisplay) qtyDisplay.textContent = '0';
            openModal('stockOutModal');
            return;
        }
        if (t.closest('#exportInventoryBtn')) {
            const isHist = window.inventoryCurrentTab === 'history';
            if (isHist) {
                const transData = (window.supplyTransactions || []).map(tx => {
                    const supply = (window.supplies || []).find(s => String(s.id) === String(tx.supply_id));
                    let typeText = 'Nhập kho';
                    if (tx.type === 'OUT') typeText = 'Xuất kho';
                    else if (tx.type === 'ADJUST') typeText = 'Điều chỉnh';
                    return {
                        'Thời gian': tx.date || (tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : ''),
                        'Mã phiếu': tx.code || '',
                        'Loại phiếu': typeText,
                        'Mặt hàng': supply ? supply.name : 'N/A',
                        'Mã vật tư': supply ? (supply.code || supply.sku || '') : '',
                        'Số lượng': tx.quantity,
                        'Đơn vị': supply ? supply.unit : '',
                        'Đơn giá (VNĐ)': tx.unit_price || 0,
                        'Thành tiền (VNĐ)': (tx.quantity || 0) * (tx.unit_price || 0),
                        'Đối tượng': tx.recipient || tx.supplier || '',
                        'Ghi chú / Lý do': tx.notes || '',
                        'Người lập phiếu': tx.user_name || 'Admin'
                    };
                });
                exportToExcel(transData, 'So_kho_xuat_nhap_ton.xlsx');
            } else {
                const stockData = (window.supplies || []).map(s => {
                    let statusText = 'Đủ hàng';
                    if (s.quantity === 0) statusText = 'Hết hàng';
                    else if (s.quantity <= (s.min_quantity || 0)) statusText = 'Sắp hết';
                    return {
                        'Mã vật tư': s.code || s.sku || ('VT-' + s.id),
                        'Tên mặt hàng': s.name || '',
                        'Danh mục': s.category || '',
                        'Tồn kho': s.quantity || 0,
                        'Đơn vị': s.unit || '',
                        'Mức tối thiểu': s.min_quantity || 0,
                        'Trạng thái': statusText,
                        'Vị trí lưu kho': s.location || '',
                        'Đơn giá tham chiếu': s.unit_price || 0,
                        'Giá trị tồn kho (VNĐ)': (s.quantity || 0) * (s.unit_price || 0),
                        'Nhà cung cấp': s.supplier || '',
                        'Ghi chú': s.notes || ''
                    };
                });
                exportToExcel(stockData, 'Bao_cao_ton_kho_vat_tu.xlsx');
            }
            return;
        }
        if (t.closest('#openNewAssignModalBtn')) {
            if (typeof window.initAssignmentDropdowns === 'function') window.initAssignmentDropdowns();
            openModal('newAssignModal');
            return;
        }
        if (t.closest('#exportAssignmentBtn')) {
            const isHist = window.assignCurrentTab === 'history';
            if (isHist) {
                const hist = (assetHistory || []).filter(h => {
                    const act = h.action || '';
                    return act.includes('Cấp phát') || act.includes('Thu hồi') || act.includes('Điều chuyển');
                }).map(h => {
                    const asset = (assets || []).find(a => String(a.id) === String(h.assetId));
                    return {
                        'Thời gian': h.time || (h.created_at ? new Date(h.created_at).toLocaleString('vi-VN') : ''),
                        'Mã tài sản': asset?.asset_code || '',
                        'Tên thiết bị': h.assetName || '',
                        'Giao dịch': (h.action || '').replace(/^\[.*?\]\s*/, ''),
                        'Chi tiết': h.desc || '',
                        'Người thực hiện': h.createdBy || 'Admin'
                    };
                });
                exportToCSV(hist, 'Lich_su_ban_giao_thu_hoi.csv');
            } else {
                const active = (assets || []).filter(a => a.status === 'Active').map(a => {
                    const u = (users || []).find(u => String(u.id) === String(a.user_id)) || {};
                    return {
                        'Mã tài sản': a.asset_code || a.id,
                        'Tên thiết bị': a.name || '',
                        'Danh mục': a.category || '',
                        'Người sử dụng': u.name || a.user || '',
                        'Email': u.email || '',
                        'Phòng ban': u.department || '',
                        'Vị trí': a.location || '',
                        'Ngày cấp phát': a.assigned_date ? formatDateDisplay(a.assigned_date) : ''
                    };
                });
                exportToCSV(active, 'Danh_sach_thiet_bi_dang_cap_phat.csv');
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
        if (t.closest('#manageSuppliersBtn')) { renderLists(); document.getElementById('supplierForm').reset(); document.getElementById('supplierId').value = ''; document.getElementById('btnCancelSupplierEdit').classList.add('hidden'); openModal('supplierModal'); return; }
        if (t.closest('#openDepreciationReportBtn')) { if (typeof renderDepreciationReport === 'function') renderDepreciationReport(); openModal('depreciationReportModal'); return; }
        if (t.closest('#exportDepreciationBtn')) {
            const rows = assets.filter(a => a.status !== 'Disposed').map(a => {
                const dep = computeDepreciation(a);
                return {
                    'Tên tài sản': a.name,
                    'Ngày mua': formatDateDisplay(a.purchase_date),
                    'Nguyên giá': a.cost || 0,
                    'Giá trị thu hồi': a.salvage_value || 0,
                    'Phương pháp': a.depreciation_method === 'declining_balance' ? 'Số dư giảm dần' : 'Đường thẳng',
                    'Số tháng đã dùng': dep.monthsElapsed,
                    'Khấu hao lũy kế': Math.round(dep.accumulated),
                    'Giá trị còn lại': Math.round(dep.bookValue)
                };
            });
            exportToExcel(rows, 'BaoCaoKhauHao.xlsx');
            return;
        }

        if (t.closest('#openQrScannerBtn')) { activeStockCheckIdForScan = null; openModal('qrScannerModal'); startQrScanner(); return; }

        if (t.closest('#btnStockCheckScan')) {
            const scId = parseInt(t.closest('#btnStockCheckScan').dataset.stockCheckId, 10);
            const checkForScan = stockChecks.find(s => s.id === scId);
            if (checkForScan && checkForScan.status === 'Hoàn thành') {
                return showInfoModal('Đợt kiểm kê này đã đóng (Hoàn thành). Vui lòng "Mở lại" đợt kiểm kê trước khi quét.', 'Không thể quét');
            }
            activeStockCheckIdForScan = scId || null;
            openModal('qrScannerModal');
            startQrScanner();
            return;
        }

        if (t.closest('#btnStockCheckExport')) {
            const scId = parseInt(document.getElementById('btnStockCheckScan')?.dataset.stockCheckId, 10);
            const items = stockCheckItems.filter(i => i.stock_check_id === scId);
            const data = items.map(i => {
                const a = assets.find(x => x.id === i.asset_id);
                return { 'Tài sản': a?.name || `#${i.asset_id}`, 'Vị trí': a?.location || '', 'Trạng thái': i.status === 'matched' ? 'Đã kiểm' : 'Còn thiếu' };
            });
            if (!data.length) return showInfoModal('Chưa có dữ liệu kiểm kê để xuất.');
            exportToExcel(data, `KiemKe_${scId}.xlsx`);
            return;
        }

        if (t.closest('#qrActionMarkChecked')) {
            if (lastQrScanResult?.item && activeStockCheckIdForScan) {
                const parentCheckForMark = stockChecks.find(s => s.id === activeStockCheckIdForScan);
                if (parentCheckForMark && parentCheckForMark.status === 'Hoàn thành') {
                    safeCloseModal('qrScanResultModal');
                    return showInfoModal('Đợt kiểm kê này đã đóng (Hoàn thành). Vui lòng "Mở lại" đợt kiểm kê trước khi đánh dấu.', 'Không thể thao tác');
                }
                const stockItem = stockCheckItems.find(i => i.stock_check_id === activeStockCheckIdForScan && i.asset_id === lastQrScanResult.item.id);
                if (stockItem) {
                    await supabaseClient.from('stock_check_items').update({ status: 'matched', checked_at: new Date().toISOString() }).eq('id', stockItem.id);
                    stockItem.status = 'matched';
                    showInfoModal(`Đã đánh dấu "${lastQrScanResult.item.name}" là đã kiểm kê. Tiếp tục quét mã tiếp theo...`, 'Đã kiểm kê');
                } else {
                    showInfoModal('Tài sản này không có trong danh sách kiểm kê của đợt hiện tại.', 'Không thuộc đợt kiểm kê');
                }
                safeCloseModal('qrScanResultModal');
                renderStockCheckDetail(activeStockCheckIdForScan);
            }
            return;
        }
        if (t.closest('#qrActionCheckout')) {
            const item = lastQrScanResult?.item;
            if (item) {
                safeCloseModal('qrScanResultModal');
                if (!document.getElementById('checkOutModal')) { showInfoModal('Vui lòng mở trang "Kho tài sản" để cấp phát tài sản này.', 'Sai trang'); return; }
                tempId = item.id; document.getElementById('assignAssetName').textContent = item.name; initAllUserDropdowns(); openModal('checkOutModal');
            }
            return;
        }
        if (t.closest('#qrActionCheckin')) {
            const item = lastQrScanResult?.item;
            if (item) {
                safeCloseModal('qrScanResultModal');
                showConfirmationModal(`Thu hồi tài sản từ ${item.user || 'Không rõ'}?`, async () => {
                    await supabaseClient.from('assets').update({ status: 'Stock', user_id: null, assigned_date: null }).eq('id', item.id);
                    await addLog(item.id, 'ASSET', 'Thu hồi', `Từ người dùng: ${item.user || 'Không rõ'}`);
                    await refreshApp();
                    showInfoModal(`Đã thu hồi "${item.name}"!`, 'Thu hồi thành công');
                });
            }
            return;
        }
        if (t.closest('#qrActionCheckoutLicense')) {
            const item = lastQrScanResult?.item;
            if (item) {
                safeCloseModal('qrScanResultModal');
                if (!document.getElementById('checkOutLicenseModal')) { showInfoModal('Vui lòng mở trang "Quản lý License" để cấp phát license này.', 'Sai trang'); return; }
                tempId = item.id; document.getElementById('assignLicenseName').textContent = item.key_type; initAllUserDropdowns(); openModal('checkOutLicenseModal');
            }
            return;
        }
        if (t.closest('#qrActionCheckinLicense')) {
            const item = lastQrScanResult?.item;
            if (item) {
                safeCloseModal('qrScanResultModal');
                showConfirmationModal(`Thu hồi license từ ${item.user || 'Không rõ'}?`, async () => {
                    await supabaseClient.from('licenses').update({ status: 'Stock', user_id: null, assigned_date: null }).eq('id', item.id);
                    await addLog(item.id, 'LICENSE', 'Thu hồi', `Từ người dùng: ${item.user || 'Không rõ'}`);
                    await refreshApp();
                    showInfoModal(`Đã thu hồi "${item.key_type}"!`, 'Thu hồi thành công');
                });
            }
            return;
        }

        if (t.closest('#addAssetBtn')) { document.getElementById('assetForm').reset(); document.getElementById('modal_assetId').value = ''; document.getElementById('assetDisposedFields').classList.add('hidden'); document.getElementById('modalTitle').textContent = 'Thêm tài sản mới'; updateDropdowns(); initAllUserDropdowns(); openModal('assetModal'); return; }
        if (t.closest('#openMaintenanceModalBtn')) { document.getElementById('maintenanceForm')?.reset(); document.getElementById('maintenance_id').value = ''; document.getElementById('maintenanceModalTitle').textContent = 'Thêm lịch bảo trì'; updateDropdowns(); openModal('maintenanceModal'); return; }
        if (t.closest('#openStockCheckModalBtn')) { document.getElementById('stockCheckForm')?.reset(); document.getElementById('stockcheck_id').value = ''; document.getElementById('stockCheckModalTitle').textContent = 'Tạo đợt kiểm kê'; openModal('stockCheckModal'); return; }
        if (t.closest('#addLicenseBtn')) { document.getElementById('licenseForm').reset(); document.getElementById('modal_licenseId').value = ''; document.getElementById('modal_expirationDate').dataset.originalValue = ''; document.getElementById('licenseModalTitle').textContent = 'Thêm License mới'; initAllUserDropdowns(); openModal('licenseModal'); return; }
        if (t.closest('#addUserBtn')) { safeCloseModal('addUserModal'); updateDropdowns(); openModal('addUserModal'); return; }

        if (t.closest('#exportExcelBtn')) {
            window.applyAssetFilters();
            const activeFilter = isAssetFilterOrSearchActive();
            const sourceRows = resolveExportData(currentFilteredAssets, assets, activeFilter);
            const data = sourceRows.map(a => ({ "Mã tài sản": a.asset_code || '', "Tên": a.name, "Cấu hình": a.config, "Loại": a.category, "Vị trí": a.location, "Ngày nhập": formatDateDisplay(a.purchase_date), "Người dùng": a.user, "Trạng thái": (STATUS_MAP[a.status] && STATUS_MAP[a.status].text) || a.status || '', "Ghi chú": a.notes }));
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

        if (t.closest('#exportMaintenanceBtn')) {
            const data = maintenanceTasks.map(task => ({
                'Tiêu đề': task.title || '',
                'Thiết bị': assets.find(a => a.id === task.asset_id)?.name || 'N/A',
                'Ngày dự kiến': formatDateDisplay(task.due_date),
                'Trạng thái': task.status || '',
                'Ghi chú': task.note || ''
            }));
            exportToExcel(data, 'LichBaoTri.xlsx');
            return;
        }
        if (t.closest('#exportStockCheckBtn')) {
            const data = stockChecks.map(item => ({
                'Tên/Ghi chú': item.note || '',
                'Ngày bắt đầu': formatDateDisplay(item.started_at),
                'Trạng thái': item.status || ''
            }));
            exportToExcel(data, 'DotKiemKe.xlsx');
            return;
        }

        if (t.closest('#btnConfirmAction') || t.closest('#confirmDeleteBtn')) {
            const cb = window.confirmCallback || (typeof confirmCallback !== 'undefined' ? confirmCallback : null);
            window.confirmCallback = null;
            if (typeof confirmCallback !== 'undefined') confirmCallback = null;
            if (typeof cb === 'function') await cb();
            safeCloseModal('confirmationModal');
            safeCloseModal('confirmModal');
            return;
        }

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


            if (action === 'delete-asset') {
                const assetToDelete = assets.find(a => String(a.id) === String(id));
                if (assetToDelete && assetToDelete.status !== 'Stock') {
                    return showInfoModal('Tài sản đang sử dụng hoặc hỏng hóc. Vui lòng thu hồi về kho trước khi xóa.', 'Không thể xóa');
                }
                const assetName = assetToDelete?.name || 'tài sản';
                showConfirmationModal("Xóa tài sản này?", async () => { const { error } = await supabaseClient.from('assets').delete().eq('id', id); if (error) handleSupabaseError(error, 'xóa'); else { await addLog(id, 'ASSET', 'Xóa', `Xóa tài sản: ${assetName}`); await refreshApp(); showInfoModal(`Đã xóa "${assetName}"!`, 'Xóa thành công'); } });
            }
            else if (action === 'edit-asset') { const item = assets.find(a => String(a.id) === String(id)); if (item) { document.getElementById('modal_assetId').value = item.id;['modal_assetName', 'modal_assetConfig', 'modal_assetLocation', 'modal_assetStatus', 'modal_assetNotes'].forEach(k => document.getElementById(k).value = item[k.replace('modal_asset', '').toLowerCase()] || ''); document.getElementById('modal_assetPurchaseDate').value = item.purchase_date ? item.purchase_date.toString().substring(0, 10) : ''; document.getElementById('modal_assetCost').value = item.cost || 0; document.getElementById('modal_assetSalvage').value = item.salvage_value || 0; document.getElementById('modal_assetLife').value = item.useful_life_months || ''; document.getElementById('modal_assetDepMethod').value = item.depreciation_method || 'straight_line'; document.getElementById('modal_assetInvoiceNumber').value = item.invoice_number || ''; document.getElementById('modal_assetDisposedDate').value = item.disposed_date ? item.disposed_date.toString().substring(0, 10) : ''; document.getElementById('modal_assetDisposedReason').value = item.disposed_reason || ''; document.getElementById('assetDisposedFields').classList.toggle('hidden', item.status !== 'Disposed'); updateDropdowns(); document.getElementById('modal_assetCategory').value = categories.find(c => c.name === item.category)?.id || ''; document.getElementById('modal_assetSupplier').value = item.supplier_id || ''; document.getElementById('modalTitle').textContent = 'Sửa tài sản'; initAllUserDropdowns(item.user); openModal('assetModal'); } }
            else if (action === 'checkout-asset') {
                const assetToAssign = assets.find(a => String(a.id) === String(id));
                if (assetToAssign && ['Repair', 'Broken'].includes(assetToAssign.status)) {
                    return showInfoModal('Thiết bị đang ở trạng thái "Sửa chữa"/"Hỏng" nên không thể cấp phát. Vui lòng cập nhật lại trạng thái trước.', 'Không thể cấp phát');
                }
                tempId = id; document.getElementById('assignAssetName').textContent = assetToAssign?.name; initAllUserDropdowns(); openModal('checkOutModal');
            }
            else if (action === 'checkin-asset') {
                const assetToCheckIn = assets.find(a => String(a.id) === String(id));
                const fromUser = assetToCheckIn?.user || 'Không rõ';
                const assetName = assetToCheckIn?.name || 'tài sản';
                showConfirmationModal(`Thu hồi tài sản từ ${fromUser}?`, async () => {
                    await supabaseClient.from('assets').update({ status: 'Stock', user_id: null, user: null, assigned_date: null }).eq('id', id);
                    // SỬA LỖI: Thêm tên người dùng vào log để lịch sử chi tiết hơn
                    await addLog(id, 'ASSET', 'Thu hồi', `Từ người dùng: ${fromUser}`);
                    await refreshApp();
                    showInfoModal(`Đã thu hồi "${assetName}" từ ${fromUser}!`, 'Thu hồi thành công');
                });
            }
            else if (action === 'transfer') { tempId = id; document.getElementById('transferAssetName').textContent = assets.find(a => String(a.id) === String(id))?.name; document.getElementById('transferCurrentUser').value = assets.find(a => String(a.id) === String(id))?.user || 'Chưa có'; initAllUserDropdowns(); openModal('transferModal'); }
            else if (action === 'history-asset') {
                const item = assets.find(a => String(a.id) === String(id));
                document.getElementById('historyModalTitle').textContent = `Lịch sử tài sản: ${item?.name}`;
                const logs = assetHistory.filter(l => String(l.assetId) === String(id));
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
            else if (action === 'edit-license') { const item = licenses.find(l => l.id === id); if (item) { document.getElementById('modal_licenseId').value = item.id;['modal_licenseKey', 'modal_packageType', 'modal_expirationDate', 'modal_licenseStatus', 'modal_licenseNotes'].forEach(k => { let val = item[k.replace('modal_', '').replace('expirationDate', 'expiration_date').replace('licenseKey', 'license_key').replace('packageType', 'package_type').replace('licenseStatus', 'status').replace('licenseNotes', 'notes')]; document.getElementById(k).value = val || ''; }); document.getElementById('modal_expirationDate').dataset.originalValue = item.expiration_date || ''; updateDropdowns(); document.getElementById('modal_licenseType').value = item.key_type; document.getElementById('licenseModalTitle').textContent = 'Sửa License'; initAllUserDropdowns(item.user); openModal('licenseModal'); } }
            else if (action === 'checkout-license') {
                const licenseToAssign = licenses.find(l => l.id === id);
                if (licenseToAssign && licenseToAssign.status === 'Expired') {
                    return showInfoModal('License đã hết hạn nên không thể cấp phát. Vui lòng gia hạn trước.', 'Không thể cấp phát');
                }
                tempId = id; document.getElementById('assignLicenseName').textContent = licenseToAssign?.key_type; initAllUserDropdowns(); openModal('checkOutLicenseModal');
            }
            else if (action === 'checkin-license') {
                const licenseToCheckIn = licenses.find(l => l.id === id);
                const fromUser = licenseToCheckIn?.user || 'Không rõ';
                const licenseName = licenseToCheckIn?.key_type || 'license';
                showConfirmationModal(`Thu hồi license từ ${fromUser}?`, async () => {
                    await supabaseClient.from('licenses').update({ status: 'Stock', user_id: null, assigned_date: null }).eq('id', id);
                    await addLog(id, 'LICENSE', 'Thu hồi', `Từ người dùng: ${fromUser}`);
                    await refreshApp();
                    showInfoModal(`Đã thu hồi "${licenseName}" từ ${fromUser}!`, 'Thu hồi thành công');
                });
            }

            else if (action === 'delete-user') { const userToDelete = users.find(user => user.id === id); const userName = userToDelete?.name || 'nhân viên'; if (assets.some(a => a.user_id === id) || licenses.some(l => l.user_id === id)) return showInfoModal("Không thể xóa user đang giữ tài sản/license!"); showConfirmationModal(`Xóa nhân viên "${userName}"?`, async () => { await supabaseClient.from('users').delete().eq('id', id); await addLog(id, 'USER', 'Xóa', `Tên: ${userName}; Email: ${userToDelete?.email || 'trống'}; Phòng ban: ${userToDelete?.department || 'trống'}`); await refreshApp(); }); }
            else if (action === 'edit-user') { const u = users.find(x => x.id === id); if (u) { document.getElementById('userId').value = u.id; document.getElementById('name').value = u.name; document.getElementById('email').value = u.email; document.getElementById('phone').value = u.phone || ''; document.getElementById('status').value = u.status; updateDropdowns(); document.getElementById('department').value = departments.find(d => d.name === u.department)?.id || ''; openModal('addUserModal'); } }
            else if (action === 'scan-user') {
                const u = users.find(x => x.id === id);
                if (!u) return;
                const uAssets = assets.filter(a => a.user_id === id);
                const uLicenses = licenses.filter(l => l.user_id === id);
                const assetsText = uAssets.length ? uAssets.map(a => a.name).join(', ') : 'Không có';
                const licensesText = uLicenses.length ? uLicenses.map(l => `${l.key_type}${l.package_type ? ` (${l.package_type})` : ''}`).join(', ') : 'Không có';
                const qrInfo = [
                    `Tên: ${u.name || ''}`,
                    `Email: ${u.email || ''}`,
                    `SĐT: ${u.phone || ''}`,
                    `Phòng ban: ${u.department || ''}`,
                    `Tài sản đang giữ: ${assetsText}`,
                    `License đang giữ: ${licensesText}`
                ].join('\n');

                const qrContainer = document.getElementById('userQrCode');
                if (qrContainer) {
                    qrContainer.innerHTML = '';
                    try {
                        if (typeof window.qrcode === 'function') {
                            if (window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs['UTF-8']) {
                                window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
                            }
                            const qr = window.qrcode(0, 'M');
                            qr.addData(qrInfo);
                            qr.make();
                            qrContainer.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
                        }
                    } catch (err) { console.warn('QRCode render failed', err); }
                }
                const infoEl = document.getElementById('userQrInfo');
                if (infoEl) {
                    infoEl.innerHTML = `
                        <p><strong>Tên:</strong> ${u.name || ''}</p>
                        <p><strong>Email:</strong> ${u.email || ''}</p>
                        <p><strong>SĐT:</strong> ${u.phone || 'Chưa có'}</p>
                        <p><strong>Phòng ban:</strong> ${u.department || ''}</p>
                        <p><strong>Tài sản đang giữ:</strong> ${assetsText}</p>
                        <p><strong>License đang giữ:</strong> ${licensesText}</p>
                    `;
                }
                openModal('userQrModal');
            }

            else if (action === 'delete-cat') {
                const catName = categories.find(c => c.id === id)?.name || '';
                if (assets.some(a => a.category_id === id)) {
                    return showInfoModal(`Không thể xóa danh mục "${catName}" vì vẫn còn tài sản đang sử dụng danh mục này.`, 'Không thể xóa');
                }
                showConfirmationModal("Xóa danh mục?", async () => { await supabaseClient.from('categories').delete().eq('id', id); await addLog(id, 'CATEGORY', 'Xóa', catName); await refreshApp(); renderLists(); });
            }
            else if (action === 'edit-cat') { document.getElementById('categoryName').value = actionBtn.dataset.name; document.getElementById('categoryOldName').value = id; document.getElementById('btnCancelCategoryEdit').classList.remove('hidden'); document.getElementById('categoryName').focus(); }
            else if (action === 'delete-dept') {
                const deptName = departments.find(d => d.id === id)?.name || '';
                if (users.some(u => u.department_id === id)) {
                    return showInfoModal(`Không thể xóa phòng ban "${deptName}" vì vẫn còn nhân viên thuộc phòng ban này.`, 'Không thể xóa');
                }
                showConfirmationModal("Xóa phòng ban?", async () => { await supabaseClient.from('departments').delete().eq('id', id); await addLog(id, 'DEPARTMENT', 'Xóa', deptName); await refreshApp(); renderLists(); });
            }
            else if (action === 'edit-dept') { document.getElementById('deptName').value = actionBtn.dataset.name; document.getElementById('deptId').value = id; document.getElementById('cancelDeptEdit').classList.remove('hidden'); }
            else if (action === 'delete-lic-type') { const typeName = licenseTypes.find(t => t.id === id)?.name || ''; showConfirmationModal("Xóa loại key?", async () => { await supabaseClient.from('license_types').delete().eq('id', id); await addLog(id, 'LICENSE_TYPE', 'Xóa', typeName); await refreshApp(); renderLists(); }); }
            else if (action === 'edit-lic-type') { document.getElementById('licenseTypeName').value = actionBtn.dataset.name; document.getElementById('licenseTypeId').value = id; document.getElementById('btnCancelLicenseTypeEdit').classList.remove('hidden'); }
            else if (action === 'delete-supplier') {
                const supplierName = suppliers.find(s => s.id === id)?.name || '';
                if (assets.some(a => a.supplier_id === id)) {
                    return showInfoModal(`Không thể xóa nhà cung cấp "${supplierName}" vì vẫn còn tài sản liên kết.`, 'Không thể xóa');
                }
                showConfirmationModal("Xóa nhà cung cấp?", async () => { await supabaseClient.from('suppliers').delete().eq('id', id); await addLog(id, 'SUPPLIER', 'Xóa', supplierName); await refreshApp(); renderLists(); updateDropdowns(); });
            }
            else if (action === 'edit-supplier') {
                const s = suppliers.find(x => x.id === id);
                if (s) {
                    document.getElementById('supplierId').value = s.id;
                    document.getElementById('supplierName').value = s.name || '';
                    document.getElementById('supplierContact').value = s.contact_person || '';
                    document.getElementById('supplierPhone').value = s.phone || '';
                    document.getElementById('supplierEmail').value = s.email || '';
                    document.getElementById('supplierAddress').value = s.address || '';
                    document.getElementById('supplierNotes').value = s.notes || '';
                    document.getElementById('btnCancelSupplierEdit').classList.remove('hidden');
                }
            }
            else if (action === 'edit-maint') {
                const task = maintenanceTasks.find(m => m.id === id);
                if (task && task.status === 'Hoàn thành' && currentUserProfile.role !== 'admin') {
                    return showInfoModal('Lịch bảo trì đã hoàn thành, chỉ admin mới được sửa. Vui lòng "Mở lại" trước nếu cần chỉnh sửa.', 'Không thể sửa');
                }
                if (task) {
                    document.getElementById('maintenance_id').value = task.id;
                    document.getElementById('maintenance_asset').value = task.asset_id || '';
                    document.getElementById('maintenance_title').value = task.title || '';
                    document.getElementById('maintenance_due').value = task.due_date ? task.due_date.toString().substring(0, 10) : '';
                    const noteRaw = task.note || '';
                    const priorityMatch = /^Ưu tiên:\s*(\w+)\s*\|?\s*/.exec(noteRaw);
                    document.getElementById('maintenance_priority').value = priorityMatch ? priorityMatch[1] : 'normal';
                    document.getElementById('maintenance_desc').value = priorityMatch ? noteRaw.slice(priorityMatch[0].length) : noteRaw;
                    updateDropdowns();
                    document.getElementById('maintenanceModalTitle').textContent = 'Sửa lịch bảo trì';
                    openModal('maintenanceModal');
                }
            }
            else if (action === 'edit-stock') {
                const item = stockChecks.find(s => s.id === id);
                if (item && item.status === 'Hoàn thành' && currentUserProfile.role !== 'admin') {
                    return showInfoModal('Đợt kiểm kê đã hoàn thành, chỉ admin mới được sửa. Vui lòng "Mở lại" trước nếu cần chỉnh sửa.', 'Không thể sửa');
                }
                if (item) {
                    document.getElementById('stockcheck_id').value = item.id;
                    document.getElementById('stockcheck_date').value = item.started_at ? item.started_at.toString().substring(0, 10) : '';
                    const noteRaw = item.note || '';
                    const nameMatch = /^Tên đợt:\s*([^|]*?)\s*(\||$)/.exec(noteRaw);
                    document.getElementById('stockcheck_name').value = nameMatch ? nameMatch[1] : '';
                    document.getElementById('stockcheck_notes').value = nameMatch ? noteRaw.slice(nameMatch[0].length).trim() : noteRaw;
                    document.getElementById('stockCheckModalTitle').textContent = 'Sửa đợt kiểm kê';
                    openModal('stockCheckModal');
                }
            }
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
            else if (action === 'reopen-maint') {
                if (currentUserProfile.role !== 'admin') return showInfoModal('Chỉ admin mới được mở lại lịch bảo trì đã hoàn thành.', 'Không có quyền');
                const task = maintenanceTasks.find(t => t.id === id);
                showConfirmationModal("Mở lại lịch bảo trì này (chuyển về Chưa xử lý)?", async () => {
                    const { error } = await supabaseClient.from('maintenance_tasks').update({ status: 'Chưa xử lý' }).eq('id', id);
                    if (error) return handleSupabaseError(error, 'mở lại lịch bảo trì');
                    if (task?.asset_id) await addLog(task.asset_id, 'MAINT', 'Mở lại', `Mở lại lịch bảo trì: ${task.title || ''}`);
                    await refreshApp();
                    showInfoModal('Đã mở lại lịch bảo trì!', 'Cập nhật thành công');
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
                    // Dọn luôn checklist con để không để lại dữ liệu mồ côi trỏ tới đợt kiểm kê đã xóa
                    await supabaseClient.from('stock_check_items').delete().eq('stock_check_id', id);
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
            else if (action === 'reopen-stock') {
                if (currentUserProfile.role !== 'admin') return showInfoModal('Chỉ admin mới được mở lại đợt kiểm kê đã hoàn thành.', 'Không có quyền');
                const stockCheck = stockChecks.find(s => s.id === id);
                showConfirmationModal("Mở lại đợt kiểm kê này (chuyển về Đang mở)?", async () => {
                    const { error } = await supabaseClient.from('stock_checks').update({ status: 'Đang mở' }).eq('id', id);
                    if (error) return handleSupabaseError(error, 'mở lại đợt kiểm kê');
                    await addLog(id, 'STOCK_CHECK', 'Mở lại', stockCheck?.note || '');
                    await refreshApp();
                    showInfoModal('Đã mở lại đợt kiểm kê!', 'Cập nhật thành công');
                });
            }
            else if (action === 'print-asset-label') openPrintLabelModal('asset', [id]);
            else if (action === 'print-license-label') openPrintLabelModal('license', [id]);
            else if (action === 'toggle-stockcheck-item') {
                const itemId = parseInt(actionBtn.dataset.itemId, 10);
                const item = stockCheckItems.find(i => i.id === itemId);
                if (item) {
                    // [RÀNG BUỘC] Đợt kiểm kê đã "Hoàn thành" (đóng) thì không được tick/sửa checklist nữa -
                    // phải "Mở lại" đợt kiểm kê (chỉ admin) trước khi thao tác tiếp.
                    const parentCheck = stockChecks.find(s => s.id === item.stock_check_id);
                    if (parentCheck && parentCheck.status === 'Hoàn thành') {
                        return showInfoModal('Đợt kiểm kê này đã đóng (Hoàn thành). Vui lòng "Mở lại" đợt kiểm kê trước khi thao tác.', 'Không thể thao tác');
                    }
                    const newStatus = item.status === 'matched' ? 'missing' : 'matched';
                    await supabaseClient.from('stock_check_items').update({ status: newStatus, checked_at: new Date().toISOString() }).eq('id', itemId);
                    item.status = newStatus;
                    renderStockCheckDetail(item.stock_check_id);
                }
            }
            else if (action === 'open-return-asset') {
                const asset = (assets || []).find(a => String(a.id) === String(id));
                if (!asset) return;
                const u = (users || []).find(user => String(user.id) === String(asset.user_id));
                const retId = document.getElementById('return_asset_id');
                const retName = document.getElementById('return_asset_name');
                const retUser = document.getElementById('return_asset_current_user');
                const retDate = document.getElementById('return_date');
                if (retId) retId.value = asset.id;
                if (retName) retName.textContent = `${asset.name} (${asset.asset_code || asset.id})`;
                if (retUser) retUser.textContent = `Từ người dùng: ${u ? `${u.name}${u.department ? ` (${u.department})` : ''}` : (asset.user || 'Chưa rõ')}`;
                if (retDate) retDate.value = typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0];
                openModal('returnAssetModal');
            }
            else if (action === 'open-transfer-asset') {
                const asset = (assets || []).find(a => String(a.id) === String(id));
                if (!asset) return;
                const u = (users || []).find(user => String(user.id) === String(asset.user_id));
                const transId = document.getElementById('transfer_asset_id');
                const transName = document.getElementById('transfer_asset_name');
                const transFrom = document.getElementById('transfer_from_user');
                const transToSelect = document.getElementById('transfer_to_user_select');
                if (transId) transId.value = asset.id;
                if (transName) transName.textContent = `${asset.name} (${asset.asset_code || asset.id})`;
                if (transFrom) transFrom.textContent = `Đang sử dụng bởi: ${u ? `${u.name}${u.department ? ` (${u.department})` : ''}` : (asset.user || 'Chưa rõ')}`;
                if (transToSelect) {
                    const others = (users || []).filter(user => String(user.id) !== String(asset.user_id));
                    transToSelect.innerHTML = '<option value="">-- Chọn nhân sự tiếp nhận --</option>' + others.map(user => {
                        return `<option value="${user.id}">${user.name}${user.department ? ` (${user.department})` : ''}</option>`;
                    }).join('');
                }
                openModal('transferAssetModal');
            }
            else if (action === 'view-receipt' || action === 'view-receipt-history') {
                const asset = (assets || []).find(a => String(a.id) === String(id)) || {};
                let receiverUser = null;
                let receiptDate = new Date();
                let conditionText = 'Hoạt động tốt';

                if (action === 'view-receipt-history') {
                    const logId = actionBtn.dataset.logId;
                    const log = (assetHistory || []).find(l => String(l.id) === String(logId));
                    if (log && log.created_at) receiptDate = new Date(log.created_at);
                    if (log && log.desc) {
                        const matchUser = (users || []).find(u => log.desc.includes(u.name));
                        if (matchUser) receiverUser = matchUser;
                        if (log.desc.includes('Tình trạng:')) {
                            const m = log.desc.match(/Tình trạng:\s*([^|]+)/);
                            if (m) conditionText = m[1].trim();
                        }
                    }
                }
                if (!receiverUser && asset.user_id) {
                    receiverUser = (users || []).find(u => String(u.id) === String(asset.user_id));
                }

                const d = receiptDate.getDate();
                const m = receiptDate.getMonth() + 1;
                const y = receiptDate.getFullYear();
                const dateStr = `Hà Nội, ngày ${d < 10 ? '0' + d : d} tháng ${m < 10 ? '0' + m : m} năm ${y}`;

                const rDate = document.getElementById('receiptDateStr');
                const rGiver = document.getElementById('receiptGiverName');
                const rRecName = document.getElementById('receiptReceiverName');
                const rRecDept = document.getElementById('receiptReceiverDept');
                const rRecEmail = document.getElementById('receiptReceiverEmail');
                const rAssetName = document.getElementById('receiptAssetName');
                const rAssetCode = document.getElementById('receiptAssetCode');
                const rAssetConfig = document.getElementById('receiptAssetConfig');
                const rAssetCond = document.getElementById('receiptAssetCondition');
                const rSignGiver = document.getElementById('receiptSignGiver');
                const rSignRec = document.getElementById('receiptSignReceiver');

                const giverName = currentUserProfile?.full_name || currentUserProfile?.email || 'Admin Hệ Thống';
                const recName = receiverUser?.name || asset.user || 'Nhân viên tiếp nhận';

                if (rDate) rDate.textContent = dateStr;
                if (rGiver) rGiver.textContent = `- Họ và tên: ${giverName}`;
                if (rRecName) rRecName.textContent = `- Họ và tên: ${recName}`;
                if (rRecDept) rRecDept.textContent = `- Phòng ban / Bộ phận: ${receiverUser?.department || asset.location || 'Chưa cập nhật'}`;
                if (rRecEmail) rRecEmail.textContent = `- Email: ${receiverUser?.email || 'Chưa cập nhật'}`;
                if (rAssetName) rAssetName.textContent = asset.name || '-';
                if (rAssetCode) rAssetCode.textContent = asset.asset_code || asset.id || '-';
                if (rAssetConfig) rAssetConfig.textContent = asset.config || asset.specs || asset.category || '-';
                if (rAssetCond) rAssetCond.textContent = conditionText;
                if (rSignGiver) rSignGiver.textContent = giverName;
                if (rSignRec) rSignRec.textContent = recName;

                openModal('handoverReceiptModal');
            }
            else if (action === 'open-stock-in') {
                if (typeof window.initInventoryDropdowns === 'function') window.initInventoryDropdowns();
                const supplySelect = document.getElementById('stockin_supply_select');
                if (supplySelect) supplySelect.value = id;
                const inDate = document.getElementById('stockin_date');
                if (inDate) inDate.value = typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0];
                openModal('stockInModal');
            }
            else if (action === 'open-stock-out') {
                if (typeof window.initInventoryDropdowns === 'function') window.initInventoryDropdowns();
                const supplySelect = document.getElementById('stockout_supply_select');
                if (supplySelect) {
                    supplySelect.value = id;
                    const supply = (window.supplies || []).find(s => String(s.id) === String(id));
                    const qtyDisplay = document.getElementById('stockout_current_qty_display');
                    const qtyInput = document.getElementById('stockout_quantity');
                    if (supply) {
                        if (qtyDisplay) qtyDisplay.textContent = `${supply.quantity} ${supply.unit || ''}`;
                        if (qtyInput) {
                            qtyInput.max = supply.quantity;
                            qtyInput.value = supply.quantity > 0 ? 1 : 0;
                        }
                    }
                }
                const outDate = document.getElementById('stockout_date');
                if (outDate) outDate.value = typeof getTodayDateStr === 'function' ? getTodayDateStr() : new Date().toISOString().split('T')[0];
                openModal('stockOutModal');
            }
            else if (action === 'open-edit-supply') {
                const supply = (window.supplies || []).find(s => String(s.id) === String(id));
                if (!supply) return;
                if (typeof window.initInventoryDropdowns === 'function') window.initInventoryDropdowns();
                document.getElementById('supply_id').value = supply.id;
                document.getElementById('supply_code').value = supply.code || supply.sku || '';
                document.getElementById('supply_name').value = supply.name || '';
                document.getElementById('supply_category').value = supply.category || 'Linh kiện phần cứng';
                document.getElementById('supply_unit').value = supply.unit || 'Cái';
                document.getElementById('supply_min_quantity').value = supply.min_quantity != null ? supply.min_quantity : 5;
                document.getElementById('supply_location').value = supply.location || '';
                document.getElementById('supply_unit_price').value = supply.unit_price || 0;
                document.getElementById('supply_supplier').value = supply.supplier || supply.supplier_name || '';
                document.getElementById('supply_notes').value = supply.notes || '';
                const initQtyCont = document.getElementById('initialQtyContainer');
                if (initQtyCont) initQtyCont.classList.add('hidden');
                document.getElementById('supplyModalTitle').textContent = 'Chỉnh sửa mặt hàng';
                openModal('supplyModal');
            }
            else if (action === 'open-adjust-supply') {
                const supply = (window.supplies || []).find(s => String(s.id) === String(id));
                if (!supply) return;
                document.getElementById('adjust_supply_id').value = supply.id;
                document.getElementById('adjust_supply_name').textContent = `[${supply.code || supply.sku || 'VT-' + supply.id}] ${supply.name}`;
                document.getElementById('adjust_current_qty').textContent = `${supply.quantity} ${supply.unit || ''}`;
                document.getElementById('adjust_actual_qty').value = supply.quantity;
                document.getElementById('adjust_reason').value = '';
                openModal('stockAdjustModal');
            }
            else if (action === 'delete-supply') {
                const supply = (window.supplies || []).find(s => String(s.id) === String(id));
                if (!supply) return;
                showConfirmationModal(`Bạn có chắc chắn muốn xóa mặt hàng "${supply.name}" khỏi danh mục kho?`, async () => {
                    const { error } = await supabaseClient.from('supplies').delete().eq('id', supply.id);
                    if (error) {
                        handleSupabaseError(error, 'xóa mặt hàng');
                    } else {
                        await addLog(supply.id, 'SUPPLY', 'Xóa mặt hàng', `Xóa mặt hàng: ${supply.name} (${supply.code || supply.sku || ''})`);
                        await refreshApp();
                        showInfoModal(`Đã xóa mặt hàng "${supply.name}" thành công!`, 'Xóa thành công');
                    }
                }, 'Xác nhận xóa');
            }
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
    // [MỚI] QUÉT MÃ QR BẰNG CAMERA - cấp phát/thu hồi nhanh & kiểm kê
    // =================================================================
    let html5QrCodeInstance = null;
    let activeStockCheckIdForScan = null; // != null khi đang quét trong phiên kiểm kê
    let lastQrScanResult = null; // { type: 'asset'|'license', item }

    async function stopQrScanner() {
        if (html5QrCodeInstance) {
            try { await html5QrCodeInstance.stop(); html5QrCodeInstance.clear(); } catch (e) { /* đã dừng sẵn */ }
            html5QrCodeInstance = null;
        }
    }

    function parseQrContent(text) {
        const assetMatch = /Mã tài sản:\s*([^\n\r]+)/.exec(text || '');
        if (assetMatch) return { type: 'asset', code: assetMatch[1].trim() };
        const licenseMatch = /Mã license:\s*([^\n\r]+)/.exec(text || '');
        if (licenseMatch) return { type: 'license', code: licenseMatch[1].trim() };
        return null;
    }

    async function handleQrDecoded(text) {
        const parsed = parseQrContent(text);
        await stopQrScanner();
        safeCloseModal('qrScannerModal');
        if (!parsed) {
            showInfoModal('Không nhận dạng được nội dung mã QR (không phải mã tài sản/license do hệ thống tạo). Có thể dùng ô dán nội dung để tra cứu thủ công.', 'Không nhận dạng được');
            return;
        }
        showQrScanResult(parsed);
    }

    async function startQrScanner() {
        const statusEl = document.getElementById('qrScannerStatus');
        if (typeof Html5Qrcode === 'undefined') {
            if (statusEl) statusEl.textContent = 'Không tải được thư viện quét QR (cần kết nối internet). Dùng ô dán nội dung bên dưới.';
            return;
        }
        await stopQrScanner();
        try {
            html5QrCodeInstance = new Html5Qrcode('qrReaderContainer');
            await html5QrCodeInstance.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: 220 },
                (decodedText) => { handleQrDecoded(decodedText); },
                () => { /* bỏ qua lỗi decode từng khung hình */ }
            );
            if (statusEl) statusEl.textContent = 'Đưa mã QR vào khung hình để quét...';
        } catch (err) {
            console.warn('Không thể khởi động camera:', err);
            if (statusEl) statusEl.textContent = 'Không truy cập được camera. Vui lòng dùng ô dán nội dung bên dưới.';
        }
    }

    function showQrScanResult(parsed) {
        const item = parsed.type === 'asset' ? assets.find(a => a.asset_code === parsed.code) : licenses.find(l => l.license_code === parsed.code);
        if (!item) {
            showInfoModal(`Không tìm thấy ${parsed.type === 'asset' ? 'tài sản' : 'license'} với mã "${parsed.code}" trong hệ thống.`, 'Không tìm thấy');
            return;
        }
        lastQrScanResult = { type: parsed.type, item };
        const titleEl = document.getElementById('qrScanResultTitle');
        const statusEl = document.getElementById('qrScanResultStatus');
        const userEl = document.getElementById('qrScanResultUser');
        const actionsEl = document.getElementById('qrScanResultActions');
        const statusInfo = STATUS_MAP[item.status] || { text: item.status, classes: '' };
        if (titleEl) titleEl.textContent = parsed.type === 'asset' ? item.name : item.key_type;
        if (statusEl) statusEl.innerHTML = `Mã: <b>${parsed.code}</b> &middot; <span class="px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo.classes}">${statusInfo.text}</span>`;
        if (userEl) userEl.textContent = item.user ? `Đang giữ bởi: ${item.user}` : '';

        const btnClass = "w-full px-4 py-2.5 rounded-lg font-semibold text-white transition-all";
        let actionsHtml = '';

        if (activeStockCheckIdForScan && parsed.type === 'asset') {
            actionsHtml = `<button id="qrActionMarkChecked" class="${btnClass} bg-green-600 hover:bg-green-700"><i class="fa-solid fa-check mr-1"></i>Đánh dấu đã kiểm kê</button>`;
        } else if (parsed.type === 'asset') {
            if (item.status === 'Stock') {
                actionsHtml = `<button id="qrActionCheckout" class="${btnClass} bg-blue-600 hover:bg-blue-700"><i class="fa-solid fa-hand-holding-hand mr-1"></i>Cấp phát</button>`;
            } else if (item.status === 'Active') {
                actionsHtml = `<button id="qrActionCheckin" class="${btnClass} bg-yellow-500 hover:bg-yellow-600"><i class="fa-solid fa-rotate-left mr-1"></i>Thu hồi</button>`;
            } else if (['Repair', 'Broken', 'Disposed'].includes(item.status)) {
                actionsHtml = `<p class="text-xs text-red-500">Thiết bị đang ở trạng thái "${statusInfo.text}", không thể cấp phát.</p>`;
            }
        } else if (parsed.type === 'license') {
            if (item.status === 'Stock') {
                actionsHtml = `<button id="qrActionCheckoutLicense" class="${btnClass} bg-blue-600 hover:bg-blue-700"><i class="fa-solid fa-hand-holding-hand mr-1"></i>Cấp phát</button>`;
            } else if (item.status === 'Active') {
                actionsHtml = `<button id="qrActionCheckinLicense" class="${btnClass} bg-yellow-500 hover:bg-yellow-600"><i class="fa-solid fa-rotate-left mr-1"></i>Thu hồi</button>`;
            } else if (item.status === 'Expired') {
                actionsHtml = `<p class="text-xs text-red-500">License đã hết hạn, không thể cấp phát.</p>`;
            }
        }
        if (actionsEl) actionsEl.innerHTML = actionsHtml || '<p class="text-xs text-slate-400">Không có hành động khả dụng.</p>';
        openModal('qrScanResultModal');
    }

    document.getElementById('btnQrManualLookup')?.addEventListener('click', () => {
        const text = document.getElementById('qrManualInput')?.value || '';
        if (!text.trim()) return showInfoModal('Vui lòng dán nội dung mã QR trước.', 'Thiếu dữ liệu');
        handleQrDecoded(text);
        const manualInput = document.getElementById('qrManualInput');
        if (manualInput) manualInput.value = '';
    });

    // Dừng camera khi đóng modal quét QR (đóng qua nút X / click nền / phím Escape)
    document.getElementById('qrScannerModal')?.addEventListener('click', (e) => {
        if (e.target.closest('.close-modal') || e.target === document.getElementById('qrScannerModal')) stopQrScanner();
    });

    // =================================================================
    // [MỚI] KIỂM KÊ CHI TIẾT (checklist tài sản + quét QR)
    // =================================================================
    async function ensureStockCheckItemsGenerated(stockCheckId) {
        const existing = stockCheckItems.filter(i => i.stock_check_id === stockCheckId);
        if (existing.length > 0) return;
        const eligibleAssets = assets.filter(a => a.status !== 'Disposed');
        if (!eligibleAssets.length) return;
        const now = new Date().toISOString();
        const inserts = eligibleAssets.map(a => ({ stock_check_id: stockCheckId, asset_id: a.id, status: 'pending', created_at: now }));
        await supabaseClient.from('stock_check_items').insert(inserts);
        const res = await supabaseClient.from('stock_check_items').select('*');
        stockCheckItems = res.data || [];
    }

    function renderStockCheckDetail(stockCheckId) {
        const check = stockChecks.find(s => s.id === stockCheckId);
        if (!check) return;
        // [RÀNG BUỘC] Đợt kiểm kê "Hoàn thành" (đóng) thì khóa toàn bộ checklist (không tick/quét được
        // nữa) - phải "Mở lại" (chỉ admin) trước khi thao tác tiếp.
        const isClosed = check.status === 'Hoàn thành';
        const titleEl = document.getElementById('stockCheckDetailTitle');
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-clipboard-check mr-2"></i>${check.name || check.note || 'Đợt kiểm kê'}${isClosed ? ' <span class="ml-2 align-middle px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"><i class="fa-solid fa-lock mr-1"></i>Đã đóng</span>' : ''}`;
        const scanBtn = document.getElementById('btnStockCheckScan');
        if (scanBtn) {
            scanBtn.dataset.stockCheckId = stockCheckId;
            scanBtn.classList.toggle('hidden', isClosed);
        }

        const items = stockCheckItems.filter(i => i.stock_check_id === stockCheckId);
        const matchedCount = items.filter(i => i.status === 'matched').length;
        const missingCount = items.length - matchedCount;
        const summaryEl = document.getElementById('stockCheckDetailSummary');
        if (summaryEl) summaryEl.innerHTML = `
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-700"><p class="text-2xl font-bold text-slate-700 dark:text-gray-200">${items.length}</p><p class="text-xs text-slate-400">Tổng số</p></div>
            <div class="p-3 rounded-lg bg-green-50 dark:bg-green-900/30"><p class="text-2xl font-bold text-green-600 dark:text-green-400">${matchedCount}</p><p class="text-xs text-slate-400">Đã kiểm</p></div>
            <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/30"><p class="text-2xl font-bold text-red-600 dark:text-red-400">${missingCount}</p><p class="text-xs text-slate-400">Còn thiếu</p></div>
        `;

        const tbody = document.getElementById('stockCheckItemsTableBody');
        if (!tbody) return;
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">Không có tài sản nào để kiểm kê.</td></tr>';
            return;
        }
        tbody.innerHTML = items.map(i => {
            const asset = assets.find(a => a.id === i.asset_id);
            const isMatched = i.status === 'matched';
            const actionCell = isClosed
                ? '<span class="text-xs text-slate-400 italic">Đã khóa</span>'
                : `<button data-action="toggle-stockcheck-item" data-item-id="${i.id}" class="text-xs px-2 py-1 rounded border dark:border-slate-600 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700">${isMatched ? 'Đánh dấu thiếu' : 'Đánh dấu đã kiểm'}</button>`;
            return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <td class="p-3 font-medium text-slate-700 dark:text-slate-100">${asset ? asset.name : `#${i.asset_id} (đã xóa)`}</td>
                <td class="p-3 text-slate-500 dark:text-slate-300">${asset?.location || '-'}</td>
                <td class="p-3"><span class="px-2 py-1 rounded-full text-xs font-bold ${isMatched ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}">${isMatched ? 'Đã kiểm' : 'Còn thiếu'}</span></td>
                <td class="p-3 text-right">${actionCell}</td>
            </tr>`;
        }).join('');
    }

    async function openStockCheckDetail(stockCheckId) {
        await ensureStockCheckItemsGenerated(stockCheckId);
        renderStockCheckDetail(stockCheckId);
        openModal('stockCheckDetailModal');
    }
    window.openStockCheckDetail = openStockCheckDetail;

    document.getElementById('stockCheckDetailModal')?.addEventListener('click', (e) => {
        if (e.target.closest('.close-modal') || e.target === document.getElementById('stockCheckDetailModal')) activeStockCheckIdForScan = null;
    });

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
                        assigned_date: todayDateStrLocal(),
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

