window.QLTSPageDashboard = window.QLTSPageDashboard || {};
window.QLTSPageDashboard.init = async function () {
    // =================================================================
    const ITEMS_PER_PAGE = 10;

    // Dữ liệu phục vụ drill-down từ các thẻ thống kê Dashboard
    const currentDashboardData = {
        repairAssets: [],
        backlogMaintenance: [],
        openStockChecks: [],
        alertsList: [],
        totalAssets: [],
        assetsInUse: [],
        assetsInStock: [],
        depreciationAssets: [],
        nextMaintenanceTasks: []
    };

    // Helper: Định dạng ngày hiển thị dd/mm/yyyy
    // Helper: Định dạng ngày hiển thị dd/mm/yyyy
    const formatVN = (val) => {
        if (!val) return '-';
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('vi-VN');
    };

    // Helper: Tìm tên người dùng theo ID hoặc tên có sẵn
    const getUserName = (userId, fallback = '') => {
        if (fallback) return fallback;
        if (!userId) return '';
        if (userId === 'local-admin' || (window.currentUserProfile && String(userId) === String(window.currentUserProfile.id))) {
            return window.currentUserProfile?.full_name || 'Admin';
        }
        const userList = (window.users && Array.isArray(window.users) && window.users.length) ? window.users : ((typeof users !== 'undefined' && Array.isArray(users)) ? users : []);
        const u = userList.find(user => user.id === userId || String(user.id) === String(userId));
        if (u && (u.name || u.full_name)) return u.name || u.full_name;
        return '';
    };

    // Helper: Tìm tài sản theo ID
    const getAssetName = (assetId) => {
        if (!assetId) return null;
        const assetList = (window.assets && Array.isArray(window.assets) && window.assets.length) ? window.assets : ((typeof assets !== 'undefined' && Array.isArray(assets)) ? assets : []);
        return assetList.find(a => a.id === assetId || String(a.id) === String(assetId)) || null;
    };

    function showDrillDown(title, items, type = 'asset') {
        const modalTitle = document.getElementById('drillDownModalTitle');
        const thead = document.getElementById('drillDownModalTableHead');
        const tbody = document.getElementById('drillDownModalTableBody');
        const countEl = document.getElementById('drillDownModalCount');
        if (!modalTitle || !tbody) return;

        modalTitle.textContent = title;
        const totalItems = (items && Array.isArray(items)) ? items.length : 0;
        if (countEl) countEl.textContent = `Tổng số: ${totalItems} mục`;

        if (thead) {
            if (type === 'asset') {
                thead.innerHTML = '<tr><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Tên tài sản</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Mã tài sản</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Cấu hình / Vị trí</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Người dùng</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Trạng thái</th></tr>';
            } else if (type === 'license') {
                thead.innerHTML = '<tr><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Loại Key / Tên</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Mã Key</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Gói / Phiên bản</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Hạn sử dụng</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Người dùng / Trạng thái</th></tr>';
            } else if (type === 'maintenance') {
                thead.innerHTML = '<tr><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Tiêu đề / Thiết bị</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Nội dung bảo trì</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Ngày đến hạn</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Người phụ trách</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Trạng thái</th></tr>';
            } else if (type === 'stock_check') {
                thead.innerHTML = '<tr><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Đợt kiểm kê</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Ghi chú / Mục đích</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Ngày bắt đầu</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Người thực hiện</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Trạng thái</th></tr>';
            } else if (type === 'depreciation') {
                thead.innerHTML = '<tr><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Tên tài sản</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Mã tài sản</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200 text-right">Nguyên giá</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200 text-center">Thời gian SD</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200 text-right">Khấu hao / tháng</th></tr>';
            } else if (type === 'alert') {
                thead.innerHTML = '<tr><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Loại cảnh báo</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Đối tượng</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Thời hạn</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Còn lại</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Mức độ</th></tr>';
            } else if (type === 'activity') {
                thead.innerHTML = '<tr><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Thời gian</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Hành động</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Tài sản liên quan</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Người thực hiện</th><th class="p-3 text-sm font-semibold text-slate-600 dark:text-gray-200">Chi tiết</th></tr>';
            }
        }

        if (totalItems === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400 dark:text-slate-500"><i class="fa-solid fa-circle-info text-2xl mb-2 block opacity-40"></i>Không có dữ liệu chi tiết trong mục này.</td></tr>';
        } else {
            tbody.innerHTML = items.map(item => {
                if (type === 'asset') {
                    const statusInfo = STATUS_MAP[item.status] || { text: item.status, classes: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300' };
                    const userName = item.user || getUserName(item.user_id);
                    const code = item.asset_code || (item.id ? `TS-${String(item.id).padStart(3, '0')}` : '-');
                    const subParts = [];
                    if (item.config) subParts.push(item.config);
                    if (item.location) subParts.push(item.location);
                    const subInfo = subParts.join(' • ') || (item.category || '-');
                    return `<tr class="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td class="p-3 font-medium text-slate-800 dark:text-slate-100">${item.name || '-'}</td>
                        <td class="p-3 text-xs text-slate-500 dark:text-slate-400 font-mono">${code}</td>
                        <td class="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line">${subInfo}</td>
                        <td class="p-3 text-sm text-blue-600 dark:text-blue-400 font-medium">${userName ? `<i class="fa-solid fa-user mr-1 text-xs"></i>${userName}` : '<span class="text-slate-400 italic">Chưa phân bổ</span>'}</td>
                        <td class="p-3"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.classes}">${statusInfo.text}</span></td>
                    </tr>`;
                } else if (type === 'license') {
                    const statusInfo = STATUS_MAP[item.status] || { text: item.status, classes: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300' };
                    const userName = item.user || getUserName(item.user_id);
                    const expiration = item.expiration_date ? formatVN(item.expiration_date) : 'Vĩnh viễn';
                    const swName = item.software_name || item.key_type || 'License';
                    const licCode = item.license_code || (item.id ? `LIC-${String(item.id).padStart(3, '0')}` : '');
                    const pkg = item.package_type || 'Tiêu chuẩn';
                    return `<tr class="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td class="p-3">
                            <div class="font-medium text-slate-800 dark:text-slate-100">${swName}</div>
                            ${licCode ? `<div class="text-xs text-slate-400 font-mono">${licCode}</div>` : ''}
                        </td>
                        <td class="p-3 text-xs text-slate-500 dark:text-slate-400 font-mono">${item.license_key || '-'}</td>
                        <td class="p-3 text-sm text-slate-600 dark:text-slate-300">${pkg}</td>
                        <td class="p-3 text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">${expiration}</td>
                        <td class="p-3">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo.classes}">${statusInfo.text}</span>
                                ${userName ? `<span class="text-xs text-blue-600 dark:text-blue-400 font-medium">${userName}</span>` : ''}
                            </div>
                        </td>
                    </tr>`;
                } else if (type === 'maintenance') {
                    const titleText = item.title || item.task_name || item.name || 'Bảo trì thiết bị';
                    const relatedAsset = getAssetName(item.asset_id) || (item.device_name ? { name: item.device_name } : null);
                    const assetCodeStr = relatedAsset && relatedAsset.asset_code ? ` (${relatedAsset.asset_code})` : (relatedAsset && relatedAsset.id ? ` (TS-${String(relatedAsset.id).padStart(3, '0')})` : '');
                    const assetInfo = relatedAsset
                        ? `<div class="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 font-medium"><i class="fa-solid fa-cube text-[10px]"></i><span>${relatedAsset.name}${assetCodeStr}</span></div>`
                        : `<div class="text-xs text-slate-400 dark:text-slate-500 mt-1 italic"><i class="fa-solid fa-circle-question text-[10px] mr-1"></i>Chưa gắn thiết bị</div>`;
                    let contentText = item.note || item.description || item.details || item.maintenance_type;
                    if (!contentText || contentText === '-') contentText = 'Bảo dưỡng định kỳ theo lịch';
                    const rawDate = item.due_date || item.next_due_date || item.scheduled_for;
                    const dueDate = formatVN(rawDate);
                    const pic = item.assigned_to || item.technician || getUserName(item.created_by) || 'IT Phụ trách';
                    const st = item.status || 'Chưa xử lý';
                    const isDone = st.toLowerCase() === 'hoàn thành';
                    const isOverdue = st.toLowerCase() === 'quá hạn';
                    const isInProgress = st.toLowerCase() === 'đang xử lý';
                    let stClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
                    if (isDone) stClass = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
                    else if (isOverdue) stClass = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
                    else if (isInProgress) stClass = 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';

                    const dObj = safeDate(rawDate);
                    let dueBadge = '';
                    if (dObj && !isDone) {
                        const days = Math.ceil((dObj - new Date()) / 86400000);
                        if (days < 0) {
                            dueBadge = `<div class="text-[11px] text-red-500 font-semibold mt-0.5"><i class="fa-solid fa-circle-exclamation mr-0.5"></i>Quá hạn ${Math.abs(days)} ngày</div>`;
                        } else if (days <= 7) {
                            dueBadge = `<div class="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5"><i class="fa-solid fa-clock mr-0.5"></i>Còn ${days} ngày</div>`;
                        }
                    }

                    return `<tr class="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td class="p-3">
                            <div class="font-semibold text-slate-800 dark:text-slate-100">${titleText}</div>
                            ${assetInfo}
                        </td>
                        <td class="p-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs">${contentText}</td>
                        <td class="p-3 text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            <div>${dueDate}</div>
                            ${dueBadge}
                        </td>
                        <td class="p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            <i class="fa-solid fa-user-gear text-slate-400 dark:text-slate-500 mr-1.5 text-xs"></i>${pic}
                        </td>
                        <td class="p-3"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${stClass}">${st}</span></td>
                    </tr>`;
                } else if (type === 'stock_check') {
                    let nameText = item.name;
                    if (!nameText && item.note && item.note.includes('Tên đợt:')) {
                        const m = item.note.match(/Tên đợt:\s*([^|]+)/);
                        if (m) nameText = m[1].trim();
                    }
                    if (!nameText) nameText = item.id ? `Đợt kiểm kê #${item.id}` : 'Đợt kiểm kê';

                    const stockItems = (window.stockCheckItems && Array.isArray(window.stockCheckItems)) ? window.stockCheckItems.filter(ci => ci.stock_check_id === item.id) : [];
                    const itemCountStr = stockItems.length > 0
                        ? `<div class="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium"><i class="fa-solid fa-clipboard-check text-[10px] mr-1"></i>${stockItems.length} tài sản kiểm kê</div>`
                        : '';

                    let noteText = item.note ? item.note.replace(/Tên đợt:\s*[^|]+\s*\|?\s*/, '').trim() : '';
                    if (!noteText) noteText = 'Kiểm kê tài sản định kỳ';

                    const rawDate = item.started_at || item.check_date || item.created_at;
                    const startDate = formatVN(rawDate);
                    const pic = item.assignee || getUserName(item.created_by) || 'IT Admin';
                    const st = item.status || 'Đang mở';
                    const isDone = st.toLowerCase() === 'hoàn thành';
                    const stClass = isDone
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300';

                    return `<tr class="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td class="p-3 font-semibold text-slate-800 dark:text-slate-100">
                            <div>${nameText}</div>
                            ${itemCountStr}
                        </td>
                        <td class="p-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs">${noteText}</td>
                        <td class="p-3 text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">${startDate}</td>
                        <td class="p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            <i class="fa-solid fa-user-check text-slate-400 dark:text-slate-500 mr-1.5 text-xs"></i>${pic}
                        </td>
                        <td class="p-3"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${stClass}">${st}</span></td>
                    </tr>`;
                } else if (type === 'depreciation') {
                    const cost = Number(item.cost) || 0;
                    const salvage = Number(item.salvage_value) || 0;
                    const life = Number(item.useful_life_months) || 0;
                    const monthly = (cost > 0 && life > 0) ? Math.max(0, cost - salvage) / life : 0;
                    const code = item.asset_code || (item.id ? `TS-${String(item.id).padStart(3, '0')}` : '-');
                    return `<tr class="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td class="p-3 font-medium text-slate-800 dark:text-slate-100">
                            <div>${item.name || '-'}</div>
                            <div class="text-xs text-slate-400 mt-0.5">${item.category || ''}</div>
                        </td>
                        <td class="p-3 text-xs text-slate-500 dark:text-slate-400 font-mono">${code}</td>
                        <td class="p-3 text-sm text-right font-medium text-slate-700 dark:text-slate-200">${currencyVN(cost)}</td>
                        <td class="p-3 text-sm text-center text-slate-600 dark:text-slate-300">${life > 0 ? `${life} tháng` : '-'}</td>
                        <td class="p-3 text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">${currencyVN(monthly)}</td>
                    </tr>`;
                } else if (type === 'alert') {
                    const daysText = item.daysLeft === 0
                        ? '<span class="text-red-600 font-bold">Hôm nay</span>'
                        : (item.daysLeft < 0 ? `<span class="text-red-600 font-bold">Quá hạn ${Math.abs(item.daysLeft)} ngày</span>` : `${item.daysLeft} ngày`);

                    return `<tr class="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td class="p-3"><span class="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">${item.category}</span></td>
                        <td class="p-3 text-sm font-medium text-slate-800 dark:text-slate-100">${item.title}</td>
                        <td class="p-3 text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">${item.dueDate}</td>
                        <td class="p-3 text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">${daysText}</td>
                        <td class="p-3"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${item.levelClass}">${item.level}</span></td>
                    </tr>`;
                } else if (type === 'activity') {
                    const timeStr = item.time || formatVN(item.created_at);
                    const actName = item.action || 'Thao tác';
                    const targetName = item.assetName || (getAssetName(item.asset_id)?.name) || 'Hệ thống';
                    const userStr = item.createdBy || getUserName(item.created_by) || 'Admin';
                    const descStr = item.desc || item.description || '-';
                    return `<tr class="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td class="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">${timeStr}</td>
                        <td class="p-3 text-sm font-semibold text-slate-800 dark:text-slate-100">${actName}</td>
                        <td class="p-3 text-sm text-blue-600 dark:text-blue-400 font-medium">${targetName}</td>
                        <td class="p-3 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap"><i class="fa-solid fa-user text-xs text-slate-400 mr-1"></i>${userStr}</td>
                        <td class="p-3 text-sm text-slate-600 dark:text-slate-300">${descStr}</td>
                    </tr>`;
                }
                return '';
            }).join('');
        }
        openModal('drillDownModal');
    }

    const currencyVN = (val) => {
        if (val === null || val === undefined || isNaN(val)) return '-';
        return Number(val).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
    };

    const safeDate = (val) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    };

    let dashboardCardsBound = false;
    function initDashboardCardClicks() {
        if (dashboardCardsBound) return;
        dashboardCardsBound = true;

        const bind = (id, getter) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', () => {
                    const p = getter();
                    if (p) showDrillDown(p.title, p.items, p.type);
                });
            }
        };

        bind('cardAssetsInRepair', () => ({
            title: `Danh sách thiết bị Hỏng / Chờ sửa chữa (${currentDashboardData.repairAssets.length})`,
            items: currentDashboardData.repairAssets,
            type: 'asset'
        }));
        bind('cardMaintenanceBacklog', () => ({
            title: `Danh sách Bảo trì tồn đọng (${currentDashboardData.backlogMaintenance.length})`,
            items: currentDashboardData.backlogMaintenance,
            type: 'maintenance'
        }));
        bind('cardOpenStockChecks', () => ({
            title: `Các đợt kiểm kê đang mở (${currentDashboardData.openStockChecks.length})`,
            items: currentDashboardData.openStockChecks,
            type: 'stock_check'
        }));
        bind('cardAlertCount', () => ({
            title: `Tổng hợp cảnh báo hạn dùng & Bảo trì (${currentDashboardData.alertsList.length})`,
            items: currentDashboardData.alertsList,
            type: 'alert'
        }));
        bind('cardTotalAssets', () => ({
            title: `Tất cả tài sản hệ thống (${currentDashboardData.totalAssets.length})`,
            items: currentDashboardData.totalAssets,
            type: 'asset'
        }));
        bind('cardAssetsInUse', () => ({
            title: `Tài sản đang sử dụng (${currentDashboardData.assetsInUse.length})`,
            items: currentDashboardData.assetsInUse,
            type: 'asset'
        }));
        bind('cardAssetsInStock', () => ({
            title: `Tài sản sẵn sàng trong kho (${currentDashboardData.assetsInStock.length})`,
            items: currentDashboardData.assetsInStock,
            type: 'asset'
        }));
        bind('cardMonthlyDep', () => ({
            title: `Bảng khấu hao tài sản hàng tháng (${currentDashboardData.depreciationAssets.length})`,
            items: currentDashboardData.depreciationAssets,
            type: 'depreciation'
        }));
        bind('cardNextMaintenance', () => ({
            title: `Lịch bảo trì sắp tới (${currentDashboardData.nextMaintenanceTasks.length})`,
            items: currentDashboardData.nextMaintenanceTasks,
            type: 'maintenance'
        }));
    }

    let dashboardToolbarBound = false;
    function initDashboardToolbar() {
        if (dashboardToolbarBound) return;
        dashboardToolbarBound = true;

        const btnRefresh = document.getElementById('btnRefreshDashboard');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', async () => {
                const icon = document.getElementById('refreshIcon');
                if (icon) icon.classList.add('fa-spin');
                btnRefresh.disabled = true;
                try {
                    if (typeof window.fetchAllData === 'function') {
                        await window.fetchAllData();
                    } else if (typeof updateDashboard === 'function') {
                        updateDashboard();
                    }
                } catch (err) {
                    console.error('Lỗi làm mới dashboard:', err);
                } finally {
                    setTimeout(() => {
                        if (icon) icon.classList.remove('fa-spin');
                        btnRefresh.disabled = false;
                    }, 500);
                }
            });
        }

        const toggleBtn = document.getElementById('toggleAdvancedCharts');
        const advContainer = document.getElementById('advancedChartsContainer');
        const toggleText = document.getElementById('toggleAdvancedText');
        const toggleIcon = document.getElementById('toggleAdvancedIcon');
        if (toggleBtn && advContainer) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = advContainer.classList.contains('hidden');
                if (isHidden) {
                    advContainer.classList.remove('hidden');
                    if (toggleText) toggleText.textContent = 'Thu gọn';
                    if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-up text-[10px]';
                } else {
                    advContainer.classList.add('hidden');
                    if (toggleText) toggleText.textContent = 'Mở rộng';
                    if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-down text-[10px]';
                }
            });
        }
    }

    function updateDashboard() {
        if (!document.getElementById('dashboardContent')) return;

        // Cập nhật timestamp Dashboard
        const lastUpdatedEl = document.getElementById('dashboardLastUpdated');
        if (lastUpdatedEl) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = now.toLocaleDateString('vi-VN');
            lastUpdatedEl.textContent = `${timeStr} (${dateStr})`;
        }

        if (document.getElementById('totalAssets')) document.getElementById('totalAssets').textContent = assets.length;
        if (document.getElementById('assetsInUse')) document.getElementById('assetsInUse').textContent = assets.filter(a => a.status === 'Active').length;
        if (document.getElementById('assetsInStock')) document.getElementById('assetsInStock').textContent = assets.filter(a => a.status === 'Stock').length;
        if (document.getElementById('assetsInRepair')) document.getElementById('assetsInRepair').textContent = assets.filter(a => ['Repair', 'Broken'].includes(a.status)).length;

        const backlogTasks = maintenanceTasks.filter(t => (t.status || '').toLowerCase() !== 'hoàn thành');
        const nextDue = backlogTasks
            .map(t => safeDate(t.next_due_date || t.due_date || t.scheduled_for))
            .filter(Boolean)
            .sort((a, b) => a - b)[0];
        const monthlyDep = assets.reduce((sum, a) => {
            const cost = Number(a.cost) || 0;
            const salvage = Number(a.salvage_value) || 0;
            const life = Number(a.useful_life_months) || 0;
            if (cost > 0 && life > 0) {
                return sum + Math.max(0, cost - salvage) / life;
            }
            return sum;
        }, 0);
        const openStock = stockChecks.filter(c => (c.status || '').toLowerCase() !== 'hoàn thành').length;

        const alertCfg = alertSettings[0] || {};
        const warrantyThreshold = alertCfg.warranty_threshold_days || 30;
        const licenseThreshold = alertCfg.license_threshold_days || 30;
        const maintenanceThreshold = alertCfg.maintenance_threshold_days || 7;
        const nowAlerts = new Date();
        const calcDaysLeft = (d) => Math.ceil((d - nowAlerts) / (1000 * 60 * 60 * 24));

        // Tổng hợp danh sách cảnh báo chi tiết
        const alertsList = [];
        assets.forEach(a => {
            const d = safeDate(a.warranty_expiration_date);
            if (!d) return;
            const daysLeft = calcDaysLeft(d);
            if (daysLeft >= 0 && daysLeft <= warrantyThreshold) {
                alertsList.push({
                    category: 'Bảo hành tài sản',
                    title: a.name + (a.asset_code ? ` [${a.asset_code}]` : ''),
                    dueDate: d.toLocaleDateString('vi-VN'),
                    daysLeft: daysLeft,
                    level: daysLeft <= 7 ? 'Khẩn cấp' : 'Sắp tới',
                    levelClass: daysLeft <= 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                });
            }
        });
        licenses.forEach(l => {
            const d = safeDate(l.expiration_date);
            if (!d) return;
            const daysLeft = calcDaysLeft(d);
            if (daysLeft >= 0 && daysLeft <= licenseThreshold) {
                alertsList.push({
                    category: 'Hạn dùng License',
                    title: (l.key_type || 'License') + (l.license_key ? ` [${l.license_key}]` : ''),
                    dueDate: d.toLocaleDateString('vi-VN'),
                    daysLeft: daysLeft,
                    level: daysLeft <= 7 ? 'Khẩn cấp' : 'Sắp tới',
                    levelClass: daysLeft <= 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                });
            }
        });
        backlogTasks.forEach(t => {
            const d = safeDate(t.next_due_date || t.due_date || t.scheduled_for);
            if (!d) return;
            const daysLeft = calcDaysLeft(d);
            if (daysLeft >= 0 && daysLeft <= maintenanceThreshold) {
                const relatedAsset = getAssetName(t.asset_id);
                const assetStr = relatedAsset ? ` [${relatedAsset.name}]` : '';
                alertsList.push({
                    category: 'Lịch bảo trì',
                    title: (t.title || 'Bảo trì định kỳ') + assetStr,
                    dueDate: d.toLocaleDateString('vi-VN'),
                    daysLeft: daysLeft,
                    level: daysLeft <= 2 ? 'Khẩn cấp' : 'Sắp tới',
                    levelClass: daysLeft <= 2 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                });
            }
        });

        // Cập nhật bộ nhớ dữ liệu phục vụ click drill-down
        currentDashboardData.repairAssets = assets.filter(a => ['Repair', 'Broken'].includes(a.status));
        currentDashboardData.backlogMaintenance = backlogTasks;
        currentDashboardData.openStockChecks = stockChecks.filter(c => (c.status || '').toLowerCase() !== 'hoàn thành');
        currentDashboardData.alertsList = alertsList;
        currentDashboardData.totalAssets = assets;
        currentDashboardData.assetsInUse = assets.filter(a => a.status === 'Active');
        currentDashboardData.assetsInStock = assets.filter(a => a.status === 'Stock');
        currentDashboardData.depreciationAssets = assets.filter(a => Number(a.cost) > 0);
        currentDashboardData.nextMaintenanceTasks = backlogTasks.slice().sort((a, b) => (safeDate(a.next_due_date || a.due_date || a.scheduled_for) || 0) - (safeDate(b.next_due_date || b.due_date || b.scheduled_for) || 0));

        // Khởi tạo sự kiện click card và toolbar
        initDashboardCardClicks();
        initDashboardToolbar();

        const nextMaintenanceEl = document.getElementById('nextMaintenance');
        if (nextMaintenanceEl) nextMaintenanceEl.textContent = nextDue ? nextDue.toLocaleDateString('vi-VN') : 'Không lịch';

        const maintenanceBacklogEl = document.getElementById('maintenanceBacklog');
        if (maintenanceBacklogEl) maintenanceBacklogEl.textContent = backlogTasks.length;

        const stockCheckEl = document.getElementById('openStockChecks');
        if (stockCheckEl) stockCheckEl.textContent = openStock;

        const monthlyDepEl = document.getElementById('monthlyDep');
        if (monthlyDepEl) monthlyDepEl.textContent = currencyVN(monthlyDep || 0);

        const alertCountEl = document.getElementById('alertCount');
        if (alertCountEl) alertCountEl.textContent = alertsList.length;

        // Helper vẽ biểu đồ kèm Empty State handling
        const drawChart = (id, instance, type, labels, data, colors, label = 'Dữ liệu', onClickCallback = null) => {
            const ctx = document.getElementById(id);
            if (!ctx || typeof Chart === 'undefined') return null;
            if (instance) instance.destroy();

            const parent = ctx.parentElement;
            const hasData = Array.isArray(data) && data.length > 0 && data.some(v => Number(v) > 0);

            if (!hasData) {
                ctx.style.display = 'none';
                let emptyEl = parent ? parent.querySelector('.chart-empty-state') : null;
                if (!emptyEl && parent) {
                    emptyEl = document.createElement('div');
                    emptyEl.className = 'chart-empty-state flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 py-10';
                    emptyEl.innerHTML = '<i class="fa-solid fa-chart-pie text-3xl mb-2 opacity-30"></i><span class="text-xs">Chưa có dữ liệu thống kê</span>';
                    parent.appendChild(emptyEl);
                }
                return null;
            } else {
                ctx.style.display = '';
                if (parent) {
                    const emptyEl = parent.querySelector('.chart-empty-state');
                    if (emptyEl) emptyEl.remove();
                }
            }

            return new Chart(ctx, {
                type: type,
                data: { labels: labels, datasets: [{ label: label, data: data, backgroundColor: colors || ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'], borderWidth: 1 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    onClick: (evt, elements) => { if (elements.length > 0 && onClickCallback) { const index = elements[0].index; onClickCallback(labels[index], index); } },
                    plugins: { legend: { display: type !== 'bar' } }
                }
            });
        };

        const sRaw = assets.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
        const sKeys = Object.keys(sRaw);
        const sLabels = sKeys.map(k => STATUS_MAP[k]?.text || k);
        chartAssetHealth = drawChart('assetHealthChart', chartAssetHealth, 'doughnut', sLabels, Object.values(sRaw), ['#22c55e', '#0ea5e9', '#eab308', '#ef4444', '#6b7280'], 'Số lượng', (clickedLabel, index) => {
            showDrillDown(`Chi tiết: ${clickedLabel}`, assets.filter(a => a.status === sKeys[index]), 'asset');
        });

        const cData = assets.reduce((acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {});
        chartCategory = drawChart('categoryChart', chartCategory, 'bar', Object.keys(cData), Object.values(cData), '#3b82f6', 'Số lượng', (clickedLabel) => {
            showDrillDown(`Danh mục: ${clickedLabel}`, assets.filter(a => a.category === clickedLabel), 'asset');
        });

        const lData = assets.reduce((acc, a) => { const loc = a.location || 'Chưa xác định'; acc[loc] = (acc[loc] || 0) + 1; return acc; }, {});
        chartLocation = drawChart('locationAssetChart', chartLocation, 'pie', Object.keys(lData), Object.values(lData), null, 'Số lượng', (clickedLabel) => {
            showDrillDown(`Vị trí: ${clickedLabel}`, assets.filter(a => (a.location || 'Chưa xác định') === clickedLabel), 'asset');
        });

        const licData = licenses.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});
        const licKeys = Object.keys(licData);
        const licLabels = licKeys.map(k => STATUS_MAP[k]?.text || k);
        chartLicenseStatus = drawChart('licenseStatusChart', chartLicenseStatus, 'pie', licLabels, Object.values(licData), null, 'License', (clickedLabel, index) => {
            showDrillDown(`License trạng thái: ${clickedLabel}`, licenses.filter(l => l.status === licKeys[index]), 'license');
        });

        // --- Biểu đồ Hạn sử dụng License trên Dashboard chính ---
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expirationStatus = { 'Hết hạn': 0, 'Sắp hết hạn (30 ngày)': 0, 'Còn hạn': 0, 'Vĩnh viễn': 0 };
        licenses.forEach(lic => {
            if (!lic.expiration_date) {
                expirationStatus['Vĩnh viễn']++;
            } else {
                const expDate = new Date(lic.expiration_date);
                if (expDate < now) {
                    expirationStatus['Hết hạn']++;
                } else if (expDate <= thirtyDaysFromNow) {
                    expirationStatus['Sắp hết hạn (30 ngày)']++;
                } else {
                    expirationStatus['Còn hạn']++;
                }
            }
        });
        const expLabels = Object.keys(expirationStatus);
        chartLicenseExpiration = drawChart('licenseExpirationChartDashboard', chartLicenseExpiration, 'doughnut', expLabels, Object.values(expirationStatus), ['#ef4444', '#f59e0b', '#22c55e', '#6b7280'], 'License', (clickedLabel, index) => {
            const filteredLicenses = licenses.filter(lic => {
                if (clickedLabel === 'Vĩnh viễn') return !lic.expiration_date;
                if (!lic.expiration_date) return false;
                const expDate = new Date(lic.expiration_date);
                if (clickedLabel === 'Hết hạn') return expDate < now;
                if (clickedLabel === 'Sắp hết hạn (30 ngày)') return expDate >= now && expDate <= thirtyDaysFromNow;
                if (clickedLabel === 'Còn hạn') return expDate > thirtyDaysFromNow;
                return false;
            });
            showDrillDown(`License: ${clickedLabel}`, filteredLicenses, 'license');
        });

        const deptData = {};
        assets.forEach(a => {
            let dName = 'Kho';
            if (a.user_id) { const u = users.find(user => user.id === a.user_id); dName = u ? u.department : 'Chưa phân bổ'; }
            deptData[dName] = (deptData[dName] || 0) + 1;
        });
        chartDepartment = drawChart('departmentAssetChart', chartDepartment, 'bar', Object.keys(deptData), Object.values(deptData), '#8b5cf6', 'Thiết bị', (clickedLabel) => {
            let filtered = clickedLabel === 'Kho' ? assets.filter(a => !a.user_id) : assets.filter(a => { const u = users.find(user => user.id === a.user_id); return u && u.department === clickedLabel; });
            showDrillDown(`Phòng ban: ${clickedLabel}`, filtered, 'asset');
        });

        const uAssetCounts = users.map(u => ({ name: u.name, count: assets.filter(a => a.user_id === u.id).length })).filter(u => u.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);
        chartUserAsset = drawChart('userAssetChart', chartUserAsset, 'bar', uAssetCounts.map(u => u.name), uAssetCounts.map(u => u.count), '#f59e0b', 'Thiết bị', (clickedLabel) => {
            const u = users.find(user => user.name === clickedLabel);
            if (u) showDrillDown(`Tài sản của: ${u.name}`, assets.filter(a => a.user_id === u.id), 'asset');
        });

        // Biểu đồ xu hướng hoạt động với Empty State
        const last7Days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse();
        const actData = last7Days.map(date => assetHistory.filter(h => (h.created_at || '').startsWith(date)).length);
        const ctxTrend = document.getElementById('activityTrendChart');
        if (ctxTrend && typeof Chart !== 'undefined') {
            if (chartActivity) chartActivity.destroy();
            const parentTrend = ctxTrend.parentElement;
            const hasTrendData = Array.isArray(actData) && actData.length > 0 && actData.some(v => Number(v) > 0);

            if (!hasTrendData) {
                ctxTrend.style.display = 'none';
                let emptyEl = parentTrend ? parentTrend.querySelector('.chart-empty-state') : null;
                if (!emptyEl && parentTrend) {
                    emptyEl = document.createElement('div');
                    emptyEl.className = 'chart-empty-state flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 py-10';
                    emptyEl.innerHTML = '<i class="fa-solid fa-chart-line text-3xl mb-2 opacity-30"></i><span class="text-xs">Chưa có dữ liệu hoạt động trong 7 ngày qua</span>';
                    parentTrend.appendChild(emptyEl);
                }
            } else {
                ctxTrend.style.display = '';
                if (parentTrend) {
                    const emptyEl = parentTrend.querySelector('.chart-empty-state');
                    if (emptyEl) emptyEl.remove();
                }
                chartActivity = new Chart(ctxTrend, {
                    type: 'line',
                    data: {
                        labels: last7Days,
                        datasets: [{
                            label: 'Số hoạt động',
                            data: actData,
                            borderColor: '#0ea5e9',
                            tension: 0.3,
                            fill: true,
                            backgroundColor: 'rgba(14, 165, 233, 0.1)'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        onClick: (evt, elements) => {
                            if (elements.length > 0) {
                                const index = elements[0].index;
                                const dateStr = last7Days[index];
                                const acts = (assetHistory || []).filter(h => (h.created_at || '').startsWith(dateStr));
                                showDrillDown(`Hoạt động ngày ${formatVN(dateStr)} (${acts.length})`, acts, 'activity');
                            }
                        }
                    }
                });
            }
        }

        const uLicCounts = users.map(u => ({ name: u.name, count: licenses.filter(l => l.user_id === u.id).length })).filter(u => u.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);
        chartUserLicense = drawChart('userLicenseChart', chartUserLicense, 'bar', uLicCounts.map(u => u.name), uLicCounts.map(u => u.count), '#ec4899', 'License', (clickedLabel) => {
            const u = users.find(user => user.name === clickedLabel);
            if (u) showDrillDown(`License của: ${u.name}`, licenses.filter(l => l.user_id === u.id), 'license');
        });
    }

    // =================================================================
    // 5. CÁC HÀM TABLE & PAGINATION (ĐÃ SỬA LỖI UI)
    // =================================================================

    function normalizeAssetStatus(val) {
        if (!val) return 'Stock';
        const v = val.toString().toLowerCase().trim();
        if (v.includes('dùng') || v.includes('hoạt động') || v === 'active') return 'Active';
        if (v.includes('sửa') || v === 'repair') return 'Repair';
        if (v.includes('hỏng') || v.includes('lỗi') || v === 'broken') return 'Broken';
        return 'Stock';
    }

    function renderPagination(containerId, currentPage, totalItems, itemsPerPage, tableType) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // --- 1. TÍNH COLSPAN (Để ô phân trang trải dài hết bảng) ---
        let colCount = 10;
        if (tableType === 'assets') colCount = 11;
        if (tableType === 'licenses') colCount = 9;
        if (tableType === 'users') colCount = 5;
        if (tableType === 'maintenance') colCount = 6;
        if (tableType === 'stock') colCount = 5;
        if (tableType === 'activity') colCount = 5;

        // Tìm thẻ TD cha và set colSpan
        const parentTd = container.closest('td') || (container.tagName === 'TD' ? container : null);
        if (parentTd) { parentTd.colSpan = colCount; }

        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        // --- 2. THUẬT TOÁN "SMART PAGINATION" (Hiện 1 ... 4 5 6 ... 58) ---
        // Logic: Chỉ hiện trang đầu, trang cuối, và +/- 1 trang xung quanh trang hiện tại
        let range = [];
        const delta = 1;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        let rangeWithDots = [];
        let l;
        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1); // Nếu cách nhau 1 trang thì hiện nốt
                } else if (i - l !== 1) {
                    rangeWithDots.push('...'); // Nếu cách xa thì hiện dấu ...
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        // --- 3. RENDER HTML ---
        let html = '<ul class="flex items-center justify-end -space-x-px h-8 text-sm">';

        // Nút Trước
        const prevDisabled = currentPage === 1;
        const prevClass = prevDisabled ? 'pointer-events-none opacity-50 bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500' : 'text-slate-500 bg-white hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white';
        html += `<li><a href="javascript:void(0)" data-page="${currentPage - 1}" data-table="${tableType}" class="flex items-center justify-center px-3 h-8 ml-0 leading-tight border border-slate-300 dark:border-slate-600 rounded-l-lg ${prevClass}">Trước</a></li>`;

        // Các nút số trang (Dùng danh sách rút gọn)
        rangeWithDots.forEach(page => {
            if (page === '...') {
                html += `<li><span class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600">...</span></li>`;
            } else {
                const active = (page === currentPage) ? 'z-10 text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-800' : 'text-slate-500 bg-white hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white';
                html += `<li><a href="javascript:void(0)" data-page="${page}" data-table="${tableType}" class="flex items-center justify-center px-3 h-8 leading-tight border border-slate-300 dark:border-slate-600 ${active}">${page}</a></li>`;
            }
        });

        // Nút Sau
        const nextDisabled = currentPage === totalPages;
        const nextClass = nextDisabled ? 'pointer-events-none opacity-50 bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500' : 'text-slate-500 bg-white hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white';
        html += `<li><a href="javascript:void(0)" data-page="${currentPage + 1}" data-table="${tableType}" class="flex items-center justify-center px-3 h-8 leading-tight border border-slate-300 dark:border-slate-600 rounded-r-lg ${nextClass}">Sau</a></li></ul>`;

        container.innerHTML = html;
    }

    function renderTableAssets(data) {
        const tbody = document.getElementById('assetTableBody'); if (!tbody) return;
        document.getElementById('assetTotalCount').textContent = data.length;
        document.getElementById('assetTotalCount').classList.remove('hidden');
        const start = (assetCurrentPage - 1) * ITEMS_PER_PAGE;
        const pageData = data.slice(start, start + ITEMS_PER_PAGE);
        if (pageData.length === 0) { tbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-slate-400">Không có dữ liệu.</td></tr>`; renderPagination('assetPagination', 1, 0, ITEMS_PER_PAGE, 'assets'); return; }
        tbody.innerHTML = pageData.map(item => {
            const status = STATUS_MAP[item.status] || { text: item.status, classes: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300' };
            const isAdmin = currentUserProfile.role === 'admin';
            let btns = '';
            const btnClasses = "w-8 h-8 flex items-center justify-center rounded-md transition-all";

            if (isAdmin) {
                if (item.status === 'Stock') {
                    btns = `<div class="tooltip"><button data-action="checkout-asset" data-id="${item.id}" class="${btnClasses} bg-blue-600 text-white hover:bg-blue-700"><i class="fa-solid fa-hand-holding-hand"></i></button><span class="tooltiptext">Cấp phát</span></div>`;
                } else if (item.status === 'Active') {
                    btns = `<div class="tooltip"><button data-action="checkin-asset" data-id="${item.id}" class="${btnClasses} bg-yellow-500 text-white hover:bg-yellow-600"><i class="fa-solid fa-rotate-left"></i></button><span class="tooltiptext">Thu hồi</span></div>
                            <div class="tooltip"><button data-action="transfer" data-id="${item.id}" class="${btnClasses} text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800"><i class="fa-solid fa-right-left"></i></button><span class="tooltiptext">Chuyển đổi</span></div>`;
                }
            }

            return `<tr class="border-b hover:bg-slate-50 group asset-row" data-id="${item.id}">
                <td class="p-4 text-center"><input type="checkbox" class="asset-select-checkbox" data-id="${item.id}" ${selectedAssetIds.has(item.id) ? 'checked' : ''}></td>
                <td class="p-4 font-semibold text-slate-700">${item.name}<div class="text-xs font-mono font-normal text-slate-400">${item.asset_code || ''}</div></td>
                <td class="p-4 text-xs text-slate-500 font-mono whitespace-pre-wrap">${item.config || ''}</td>
                <td class="p-4">${item.category}</td><td class="p-4 text-sm">${item.location || '-'}</td>
                <td class="p-4 text-sm">${formatDateDisplay(item.purchase_date)}</td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-xs font-bold ${status.classes}">${status.text}</span></td>
                <td class="p-4 text-sm font-medium text-blue-600">${item.user || '-'}</td>
                <td class="p-4 text-sm italic text-slate-400">-</td>
                <td class="p-4 text-xs text-slate-500 max-w-xs truncate">${item.notes || ''}</td>
                <td class="p-4 flex gap-2 items-center">
                    ${btns}
                    <div class="tooltip"><button data-action="print-asset-label" data-id="${item.id}" class="${btnClasses} text-indigo-500 hover:bg-indigo-100"><i class="fa-solid fa-tag"></i></button><span class="tooltiptext">In tem</span></div>
                    <div class="tooltip"><button data-action="history-asset" data-id="${item.id}" class="${btnClasses} text-slate-400 hover:bg-slate-200 hover:text-blue-600"><i class="fa-solid fa-clock-rotate-left"></i></button><span class="tooltiptext">Xem lịch sử</span></div>
                    ${isAdmin ? `
                        <div class="tooltip"><button data-action="edit-asset" data-id="${item.id}" class="${btnClasses} text-green-600 hover:bg-green-100"><i class="fa-solid fa-pen"></i></button><span class="tooltiptext">Sửa</span></div>
                        <div class="tooltip"><button data-action="delete-asset" data-id="${item.id}" class="${btnClasses} text-red-600 hover:bg-red-100"><i class="fa-solid fa-trash"></i></button><span class="tooltiptext">Xóa</span></div>
                    ` : ''}
                </td>
            </tr>`;
        }).join('');
        renderPagination('assetPagination', assetCurrentPage, data.length, ITEMS_PER_PAGE, 'assets');
    }

    function renderTableLicenses(data) {
        const tbody = document.getElementById('licenseTableBody');
        if (!tbody) return;
        document.getElementById('licenseTotalCount').textContent = data.length;
        document.getElementById('licenseTotalCount').classList.remove('hidden');

        const start = (licenseCurrentPage - 1) * ITEMS_PER_PAGE;
        const pageData = data.slice(start, start + ITEMS_PER_PAGE);

        tbody.innerHTML = pageData.map(item => {
            const status = STATUS_MAP[item.status] || { text: item.status, classes: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300' };
            const isAdmin = currentUserProfile.role === 'admin';

            // --- CẬP NHẬT PHẦN NÚT BẤM (ACTIONS) ---
            let btns = '';
            const btnClasses = "w-8 h-8 flex items-center justify-center rounded-md transition-all";

            if (isAdmin) {
                if (item.status === 'Stock') {
                    // Nút Cấp phát (Checkout)
                    btns += `<div class="tooltip"><button data-action="checkout-license" data-id="${item.id}" class="${btnClasses} bg-blue-600 text-white hover:bg-blue-700"><i class="fa-solid fa-hand-holding-hand"></i></button><span class="tooltiptext">Cấp phát</span></div>`;
                } else if (item.status === 'Active') {
                    // Nút Thu hồi (Checkin)
                    btns += `<div class="tooltip"><button data-action="checkin-license" data-id="${item.id}" class="${btnClasses} bg-yellow-500 text-white hover:bg-yellow-600"><i class="fa-solid fa-rotate-left"></i></button><span class="tooltiptext">Thu hồi</span></div>`;
                    // Nút Chuyển đổi (Transfer) - Mới thêm
                    btns += `<div class="tooltip"><button data-action="transfer-license" data-id="${item.id}" class="${btnClasses} bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-800"><i class="fa-solid fa-right-left"></i></button><span class="tooltiptext">Chuyển đổi</span></div>`;
                }
            }

            // Nút Lịch sử (History) - Luôn hiện - Mới thêm
            const historyBtn = `<button data-action="history-license" data-id="${item.id}" class="${btnClasses} text-slate-400 hover:bg-slate-200 hover:text-blue-600"><i class="fa-solid fa-clock-rotate-left"></i></button>`;

            let adminActions = '';
            if (isAdmin) {
                adminActions = `
                    <div class="tooltip"><button data-action="edit-license" data-id="${item.id}" class="${btnClasses} text-green-600 hover:bg-green-100"><i class="fa-solid fa-pen"></i></button><span class="tooltiptext">Sửa license</span></div>
                    <div class="tooltip"><button data-action="delete-license" data-id="${item.id}" class="${btnClasses} text-red-600 hover:bg-red-100"><i class="fa-solid fa-trash"></i></button><span class="tooltiptext">Xóa license</span></div>
                `;
            }

            return `<tr class="border-b hover:bg-slate-50 license-row cursor-pointer" data-id="${item.id}">
                <td class="p-4 text-center"><input type="checkbox" class="license-select-checkbox" data-id="${item.id}" ${selectedLicenseIds.has(item.id) ? 'checked' : ''}></td>
                <td class="p-4 font-semibold text-slate-700">${item.key_type}<div class="text-xs font-mono font-normal text-slate-400">${item.license_code || ''}</div></td>
                <td class="p-4 font-mono text-xs text-slate-500">${isAdmin ? (item.license_key || '') : '******'}</td>
                <td class="p-4 text-sm">${item.package_type || '-'}</td>
                <td class="p-4 text-sm">${item.expiration_date || 'Vĩnh viễn'}</td>
                <td class="p-4 text-sm font-medium text-blue-600">${item.user || '-'}</td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-xs font-bold ${status.classes}">${status.text}</span></td>
                <td class="p-4 text-xs text-slate-500 max-w-xs truncate">${item.notes || ''}</td>
                <td class="p-4 flex items-center gap-2 justify-end">
                    ${btns}
                    <div class="tooltip"><button data-action="print-license-label" data-id="${item.id}" class="${btnClasses} text-indigo-500 hover:bg-indigo-100"><i class="fa-solid fa-tag"></i></button><span class="tooltiptext">In tem</span></div>
                    <div class="tooltip">${historyBtn}<span class="tooltiptext">Xem lịch sử</span></div>
                    ${adminActions}
                </td>
            </tr>`;
        }).join('');
        renderPagination('licensePagination', licenseCurrentPage, data.length, ITEMS_PER_PAGE, 'licenses');
    }

    function renderTableUsers(data) {
        const tbody = document.getElementById('userTableBody'); if (!tbody) return;
        document.getElementById('userTotalCount').textContent = data.length;
        document.getElementById('userTotalCount').classList.remove('hidden'); 
        const start = (userCurrentPage - 1) * ITEMS_PER_PAGE;
        const pageData = data.slice(start, start + ITEMS_PER_PAGE);
        if (pageData.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">Không có dữ liệu.</td></tr>`; renderPagination('userPagination', 1, 0, ITEMS_PER_PAGE, 'users'); return; }
        tbody.innerHTML = pageData.map(u => {
            const uAssets = assets.filter(a => a.user_id === u.id).length;
            const uLicenses = licenses.filter(l => l.user_id === u.id).length;
            const holdingInfo = [uAssets > 0 ? `${uAssets} Thiết bị` : '', uLicenses > 0 ? `${uLicenses} License` : ''].filter(Boolean).join(', ') || 'Trống';
            const btnClasses = "w-8 h-8 flex items-center justify-center rounded-md transition-all";
            const isAdmin = currentUserProfile.role === 'admin';
            let adminActions = '';
            if (isAdmin) {
                adminActions = `
                    <div class="tooltip"><button data-action="edit-user" data-id="${u.id}" class="${btnClasses} text-green-600 hover:bg-green-100"><i class="fa-solid fa-pen"></i></button><span class="tooltiptext">Sửa</span></div>
                    <div class="tooltip"><button data-action="delete-user" data-id="${u.id}" class="${btnClasses} text-red-600 hover:bg-red-100"><i class="fa-solid fa-trash"></i></button><span class="tooltiptext">Xóa</span></div>
                `;
            }
            return `<tr class="border-b hover:bg-slate-50 user-row cursor-pointer" data-id="${u.id}">
                <td class="p-4 flex items-center gap-3"><img src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email || 'User')}&background=random`}" class="w-9 h-9 rounded-full"><div><p class="font-bold text-slate-700">${u.name}</p><p class="text-xs text-slate-500">${u.email}</p></div></td>
                <td class="p-4 text-slate-600">${u.department}</td>
                <td class="p-4 text-sm text-slate-500"><span class="bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold">${holdingInfo}</span></td>
                <td class="p-4 font-bold text-sm ${u.status === 'Đang hoạt động' ? 'text-green-600' : 'text-slate-400'}">${u.status}</td>
                <td class="p-4 flex gap-2">
                    <div class="tooltip"><button data-action="scan-user" data-id="${u.id}" class="${btnClasses} text-indigo-600 hover:bg-indigo-100"><i class="fa-solid fa-qrcode"></i></button><span class="tooltiptext">Scan (QR)</span></div>
                    ${adminActions}
                </td>
            </tr>`;
        }).join('');
        renderPagination('userPagination', userCurrentPage, data.length, ITEMS_PER_PAGE, 'users');
    }

    function renderLists() {
        const btnClasses = "w-8 h-8 flex items-center justify-center rounded-md transition-all";
        const cl = document.getElementById('categoryListContainer'); if (cl) cl.innerHTML = '<ul class="divide-y divide-slate-100 dark:divide-slate-700">' + categories.map(c => `<li class="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700"><span class="font-medium text-slate-700 dark:text-gray-200">${c.name}</span><div class="flex gap-2"><div class="tooltip"><button data-action="edit-cat" data-id="${c.id}" data-name="${c.name}" class="${btnClasses} text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-600"><i class="fa-solid fa-pen"></i></button><span class="tooltiptext">Sửa</span></div><div class="tooltip"><button data-action="delete-cat" data-id="${c.id}" class="${btnClasses} text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-slate-600"><i class="fa-solid fa-trash"></i></button><span class="tooltiptext">Xóa</span></div></div></li>`).join('') + '</ul>';
        const dl = document.getElementById('departmentListContainer'); if (dl) dl.innerHTML = '<ul class="divide-y divide-slate-100 dark:divide-slate-700">' + departments.map(d => `<li class="p-3 border-b flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700"><span class="dark:text-gray-200">${d.name}</span><div class="flex gap-2"><div class="tooltip"><button data-action="edit-dept" data-id="${d.id}" data-name="${d.name}" class="${btnClasses} text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-600"><i class="fa-solid fa-pen"></i></button><span class="tooltiptext">Sửa</span></div><div class="tooltip"><button data-action="delete-dept" data-id="${d.id}" class="${btnClasses} text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-slate-600"><i class="fa-solid fa-trash"></i></button><span class="tooltiptext">Xóa</span></div></div></li>`).join('') + '</ul>';
        const ltl = document.getElementById('licenseTypeListContainer'); if (ltl) ltl.innerHTML = '<ul class="divide-y divide-slate-100 dark:divide-slate-700">' + licenseTypes.map(t => `<li class="p-3 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-700"><span class="font-medium text-slate-700 dark:text-gray-200">${t.name}</span><div class="flex gap-2"><div class="tooltip"><button data-action="edit-lic-type" data-id="${t.id}" data-name="${t.name}" class="${btnClasses} text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-600"><i class="fa-solid fa-pen"></i></button><span class="tooltiptext">Sửa</span></div><div class="tooltip"><button data-action="delete-lic-type" data-id="${t.id}" class="${btnClasses} text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-slate-600"><i class="fa-solid fa-trash"></i></button><span class="tooltiptext">Xóa</span></div></div></li>`).join('') + '</ul>';

        const sl = document.getElementById('supplierListContainer');
        if (sl) {
            sl.innerHTML = suppliers.length ? ('<ul class="divide-y divide-slate-100 dark:divide-slate-700">' + suppliers.map(s => `
                <li class="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700">
                    <div>
                        <p class="font-medium text-slate-700 dark:text-gray-200">${s.name}</p>
                        <p class="text-xs text-slate-400 dark:text-slate-400">${[s.contact_person, s.phone, s.email].filter(Boolean).join(' • ') || 'Chưa có thông tin liên hệ'}</p>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <div class="tooltip"><button data-action="edit-supplier" data-id="${s.id}" class="${btnClasses} text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-600"><i class="fa-solid fa-pen"></i></button><span class="tooltiptext">Sửa</span></div>
                        <div class="tooltip"><button data-action="delete-supplier" data-id="${s.id}" class="${btnClasses} text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-slate-600"><i class="fa-solid fa-trash"></i></button><span class="tooltiptext">Xóa</span></div>
                    </div>
                </li>`).join('') + '</ul>')
                : '<p class="p-4 text-center text-sm text-slate-400 italic">Chưa có nhà cung cấp nào.</p>';
        }
    }

    function handleUserFileSelect(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
            tempImportedUsers = jsonData.map(row => ({
                name: (row['Nhân viên'] || row['Họ tên'] || row['Tên'] || '').trim(),
                email: (row['Email'] || '').trim(),
                department: (row['Phòng ban'] || 'Khác').trim(),
                status: (row['Trạng thái'] || 'Đang hoạt động').trim()
            })).filter(u => u.name);
            renderUserImportPreview(); openModal('userImportPreviewModal');
        };
        reader.readAsArrayBuffer(file);
    }

    function handleAssetFileSelect(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
            tempImportedAssets = jsonData.map(row => ({
                name: row['Tên'] || row['Tên thiết bị'] || '',
                config: row['Cấu hình'] || '',
                category: row['Loại'] || 'Khác',
                location: row['Vị trí'] || '',
                purchase_date: parseDateToISO(row['Ngày nhập'] || row['Ngày nhập kho'] || row['Purchase Date'] || row['Import Date'] || ''),
                status: normalizeAssetStatus(row['Trạng thái'] || row['Status']),
                user: row['Người dùng'] || '',
                notes: row['Ghi chú'] || ''
            })).filter(a => a.name);
            renderAssetImportPreview(); openModal('importPreviewModal');
        };
        reader.readAsArrayBuffer(file);
    }

    function renderUserImportPreview() {
        const tbody = document.getElementById('userImportPreviewTableBody'); if (!tbody) return;
        if (tempImportedUsers.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Không có dữ liệu hợp lệ.</td></tr>'; return; }
        tbody.innerHTML = tempImportedUsers.map((u, idx) => `<tr class="border-b hover:bg-slate-50"><td class="p-3 text-center"><input type="checkbox" class="import-check" data-idx="${idx}"></td><td class="p-3 font-medium">${u.name}</td><td class="p-3 text-sm">${u.email || '-'}</td><td class="p-3 text-sm">${u.department || '-'}</td><td class="p-3 text-sm">${u.status}</td></tr>`).join('');
    }

    function renderAssetImportPreview() {
        const tbody = document.getElementById('importPreviewTableBody'); if (!tbody) return;
        if (tempImportedAssets.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-400">Không có dữ liệu hợp lệ.</td></tr>'; return; }
        tbody.innerHTML = tempImportedAssets.map((a, idx) => `<tr class="border-b hover:bg-slate-50"><td class="p-3 text-center"><input type="checkbox" class="import-check-asset" data-idx="${idx}"></td><td class="p-3 font-medium">${a.name}</td><td class="p-3 text-sm truncate max-w-[150px]">${a.config || '-'}</td><td class="p-3 text-sm">${a.category || '-'}</td><td class="p-3 text-sm">${a.location || '-'}</td><td class="p-3 text-sm">${formatDateDisplay(a.purchase_date)}</td><td class="p-3 text-sm">${a.status || '-'}</td><td class="p-3 text-sm font-bold text-blue-600">${a.user || '-'}</td><td class="p-3 text-xs truncate max-w-[100px]">${a.notes || ''}</td></tr>`).join('');
    }

    async function processUserImport() {
        if (tempImportedUsers.length === 0) return;
        const btn = document.getElementById('btnConfirmUserImport'); btn.textContent = 'Đang xử lý...'; btn.disabled = true;
        let successCount = 0;
        for (const u of tempImportedUsers) {
            const deptObj = departments.find(d => normalizeString(d.name) === normalizeString(u.department));
            const payload = { name: u.name, email: u.email, department_id: deptObj?.id || null, status: u.status, avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email || 'User')}&background=random` };
            const { error } = await supabaseClient.from('users').insert(payload); if (!error) successCount++;
        }
        btn.textContent = 'Xác nhận nhập'; btn.disabled = false;
        showInfoModal(`Đã import ${successCount} nhân viên.`, "Hoàn tất"); safeCloseModal('userImportPreviewModal'); await refreshApp();
    }

    async function processAssetImport() {
        if (tempImportedAssets.length === 0) return;
        const btn = document.getElementById('btnConfirmImport'); btn.textContent = 'Đang xử lý...'; btn.disabled = true;
        let successCount = 0;
        for (const a of tempImportedAssets) {
            const catObj = categories.find(c => normalizeString(c.name) === normalizeString(a.category));
            const userObj = users.find(u => normalizeString(u.name) === normalizeString(a.user));
            const userId = userObj?.id || null;
            const status = userId ? 'Active' : a.status;
            const payload = { name: a.name, config: a.config, location: a.location, purchase_date: a.purchase_date || null, status: status, notes: a.notes, category_id: catObj?.id || null, user_id: userId };
            const { error } = await supabaseClient.from('assets').insert(payload); if (!error) successCount++;
        }
        btn.textContent = 'Xác nhận nhập'; btn.disabled = false;
        showInfoModal(`Đã import ${successCount} tài sản.`, "Hoàn tất"); safeCloseModal('importPreviewModal'); await refreshApp();
    }

    const ADD_NEW_USER_VALUE = '__add_new_user__';

    function initChoices(elementId, instanceVar, data, selectedValue = null) {
        const el = document.getElementById(elementId); if (!el) return null;
        if (instanceVar) { try { instanceVar.destroy(); } catch (e) { } }
        const newInstance = new Choices(el, {
            removeItemButton: false,
            placeholder: true,
            placeholderValue: 'Chọn...',
            searchPlaceholderValue: 'Tìm kiếm...',
            shouldSort: false,
            searchEnabled: true,
            itemSelectText: '',
            position: 'bottom',
            duplicateItemsAllowed: false
        });
        const isUserDropdown = data === users;
        // Không cho gán tài sản/license mới cho nhân viên "Đã nghỉ việc" - vẫn giữ hiển thị nếu
        // đây là người đang được gán sẵn (đã chọn từ trước), chỉ ẩn khỏi danh sách để chọn mới.
        const filteredData = isUserDropdown
            ? data.filter(u => u.status !== 'Đã nghỉ việc' || u.name === selectedValue)
            : data;
        const choices = filteredData.map(u => ({ value: u.name, label: u.name }));
        if (isUserDropdown) choices.push({ value: ADD_NEW_USER_VALUE, label: '+ Thêm người dùng mới' });
        newInstance.setChoices(choices, 'value', 'label', true);
        if (selectedValue) newInstance.setChoiceByValue(selectedValue);
        if (isUserDropdown) {
            newInstance.passedElement.element.addEventListener('change', (e) => {
                if (e.detail.value === ADD_NEW_USER_VALUE) {
                    try {
                        newInstance.removeActiveItems();
                        if (selectedValue) newInstance.setChoiceByValue(selectedValue);
                    } catch (err) {}
                    openQuickAddUserModal(elementId);
                }
            });
        }
        return newInstance;
    }

    // Sau khi tạo 1 người dùng mới từ dropdown (không rebuild toàn bộ 5 dropdown
    // để tránh làm mất lựa chọn hiện tại ở các dropdown khác đang mở).
    function refreshSingleUserDropdown(elementId, selectedName) {
        if (elementId === 'modal_assetUser') userChoicesInstance = initChoices('modal_assetUser', userChoicesInstance, users, selectedName);
        else if (elementId === 'assignUserSelect') assignUserChoicesInstance = initChoices('assignUserSelect', assignUserChoicesInstance, users, selectedName);
        else if (elementId === 'transferNewUserSelect') transferUserChoicesInstance = initChoices('transferNewUserSelect', transferUserChoicesInstance, users, selectedName);
        else if (elementId === 'modal_licenseUser') licenseUserChoicesInstance = initChoices('modal_licenseUser', licenseUserChoicesInstance, users, selectedName);
        else if (elementId === 'assignLicenseUserSelect') licenseAssignUserChoicesInstance = initChoices('assignLicenseUserSelect', licenseAssignUserChoicesInstance, users, selectedName);
    }

    let pendingUserDropdownElementId = null;

    function openQuickAddUserModal(elementId) {
        pendingUserDropdownElementId = elementId;
        const input = document.getElementById('quickAddUserNameInput');
        const err = document.getElementById('quickAddUserError');
        if (input) input.value = '';
        if (err) err.classList.add('hidden');
        openModal('quickAddUserModal');
        setTimeout(() => input?.focus(), 50);
    }

    document.getElementById('btnConfirmQuickAddUser')?.addEventListener('click', async () => {
        const input = document.getElementById('quickAddUserNameInput');
        const err = document.getElementById('quickAddUserError');
        const name = (input?.value || '').trim();
        const showError = (msg) => { if (err) { err.textContent = msg; err.classList.remove('hidden'); } };

        if (!name) return showError('Vui lòng nhập tên người dùng.');
        const normalize = (window.QLTSHelpers && window.QLTSHelpers.normalizeString) || (s => (s || '').toLowerCase().trim());
        const isDuplicate = users.some(u => normalize(u.name) === normalize(name));
        if (isDuplicate) return showError(`Tên "${name}" đã tồn tại. Vui lòng đổi sang tên khác.`);

        const payload = {
            name,
            email: '',
            department_id: null,
            status: 'Active',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        };
        const { data, error } = await supabaseClient.from('users').insert(payload);
        if (error) return handleSupabaseError(error, 'thêm người dùng');
        await addLog(data?.[0]?.id, 'USER', 'Thêm mới', name);
        await refreshApp();

        const elementId = pendingUserDropdownElementId;
        pendingUserDropdownElementId = null;
        if (elementId) refreshSingleUserDropdown(elementId, name);

        safeCloseModal('quickAddUserModal');
        showInfoModal(`Đã thêm người dùng mới: "${name}"!`, 'Thành công');
    });

    function initAllUserDropdowns(selectedUser = null) {
        userChoicesInstance = initChoices('modal_assetUser', userChoicesInstance, users, selectedUser);
        assignUserChoicesInstance = initChoices('assignUserSelect', assignUserChoicesInstance, users, null);
        transferUserChoicesInstance = initChoices('transferNewUserSelect', transferUserChoicesInstance, users, null);
        licenseUserChoicesInstance = initChoices('modal_licenseUser', licenseUserChoicesInstance, users, selectedUser);
        licenseAssignUserChoicesInstance = initChoices('assignLicenseUserSelect', licenseAssignUserChoicesInstance, users, null);
    }

    function updateDropdowns() {
        const catDropdown = document.getElementById('modal_assetCategory');
        if (catDropdown) { const cur = catDropdown.value; catDropdown.innerHTML = '<option value="">-- Chọn loại --</option>' + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); catDropdown.value = cur; }
        const supplierDropdown = document.getElementById('modal_assetSupplier');
        if (supplierDropdown) { const cur = supplierDropdown.value; supplierDropdown.innerHTML = '<option value="">-- Không có --</option>' + suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join(''); supplierDropdown.value = cur; }
        const licTypeDropdown = document.getElementById('modal_licenseType');
        if (licTypeDropdown) { const cur = licTypeDropdown.value; licTypeDropdown.innerHTML = '<option value="">-- Chọn loại Key --</option>' + licenseTypes.map(t => `<option value="${t.name}">${t.name}</option>`).join(''); licTypeDropdown.value = cur; }
        const filterLicType = document.getElementById('filterLicenseType');
        if (filterLicType) { const cur = filterLicType.value; filterLicType.innerHTML = '<option value="">Tất cả loại Key</option>' + licenseTypes.map(t => `<option value="${t.name}">${t.name}</option>`).join(''); filterLicType.value = cur; }
        ['department', 'filterDepartment'].forEach(id => { const el = document.getElementById(id); if (el) { const cur = el.value; el.innerHTML = (id === 'filterDepartment' ? '<option value="">Tất cả phòng ban</option>' : '<option value="">-- Chọn phòng ban --</option>') + departments.map(d => `<option value="${d.id}">${d.name}</option>`).join(''); el.value = cur; } });

        // [MỚI] Populate dropdown cho "Loại gói"
        const filterPackageType = document.getElementById('filterPackageType');
        if (filterPackageType) {
            const uniquePackages = [...new Set(licenses.map(l => l.package_type ? l.package_type.trim() : '').filter(Boolean))];
            const cur = filterPackageType.value;
            filterPackageType.innerHTML = '<option value="">Tất cả loại gói</option>' + uniquePackages.map(p => `<option value="${p}">${p}</option>`).join('');
            filterPackageType.value = cur;
        }

        // Populate asset filters: status, location, category, user
        const filterAssetStatus = document.getElementById('filterAssetStatus');
        if (filterAssetStatus) {
            const statuses = [...new Set(assets.map(a => a.status || '').filter(Boolean))];
            const cur = filterAssetStatus.value;
            // Preserve current value even if it's not in the new list
            const statusSet = new Set(statuses);
            if (cur && !statusSet.has(cur)) {
                statuses.push(cur);
            }
            filterAssetStatus.innerHTML = '<option value="">Tất cả trạng thái</option>' + statuses.map(s => `<option value="${s}">${(STATUS_MAP[s] && STATUS_MAP[s].text) || s}</option>`).join('');
            if (cur) filterAssetStatus.value = cur;
        }
        const filterAssetLocation = document.getElementById('filterAssetLocation');
        if (filterAssetLocation) {
            const locs = [...new Set(assets.map(a => (a.location || '').toString().trim()).filter(Boolean))];
            const cur = filterAssetLocation.value;
            // Preserve current value even if it's not in the new list
            const locSet = new Set(locs);
            if (cur && !locSet.has(cur)) {
                locs.push(cur);
            }
            filterAssetLocation.innerHTML = '<option value="">Tất cả vị trí</option>' + locs.map(l => `<option value="${l}">${l}</option>`).join('');
            if (cur) filterAssetLocation.value = cur;
        }
        const filterAssetCategory = document.getElementById('filterAssetCategory');
        if (filterAssetCategory) {
            const cur = filterAssetCategory.value;
            const categoryNames = categories.map(c => c.name);
            // Preserve current value even if it's not in the new list
            const catSet = new Set(categoryNames);
            if (cur && !catSet.has(cur)) {
                categoryNames.push(cur);
            }
            filterAssetCategory.innerHTML = '<option value="">Tất cả loại</option>' + categoryNames.map(c => `<option value="${c}">${c}</option>`).join('');
            if (cur) filterAssetCategory.value = cur;
        }
        const filterAssetUser = document.getElementById('filterAssetUser');
        if (filterAssetUser) {
            try {
                const currentSelectedValue = getSingleChoiceValue(filterAssetUserChoicesInstance, 'filterAssetUser');
                if (filterAssetUserChoicesInstance) { try { filterAssetUserChoicesInstance.destroy(); } catch (e) { } }
                filterAssetUserChoicesInstance = new Choices(filterAssetUser, {
                    removeItemButton: false,
                    placeholder: true,
                    placeholderValue: 'Tất cả người dùng',
                    searchPlaceholderValue: 'Tìm người dùng...',
                    shouldSort: false,
                    searchEnabled: true,
                    itemSelectText: '',
                    position: 'bottom',
                    duplicateItemsAllowed: false
                });
                const choices = [{ value: '', label: 'Tất cả người dùng' }, ...users.map(u => ({ value: u.name, label: u.name }))];
                filterAssetUserChoicesInstance.setChoices(choices, 'value', 'label', true);
                if (currentSelectedValue) {
                    filterAssetUserChoicesInstance.setChoiceByValue(currentSelectedValue);
                } else {
                    filterAssetUserChoicesInstance.setChoiceByValue('');
                }
                pinSingleChoiceRemoveButton(filterAssetUserChoicesInstance, 'filterAssetUser');
                filterAssetUserChoicesInstance.passedElement.element.addEventListener('change', () => {
                    pinSingleChoiceRemoveButton(filterAssetUserChoicesInstance, 'filterAssetUser');
                    applyAssetFilters();
                });
                filterAssetUserChoicesInstance.passedElement.element.addEventListener('removeItem', () => {
                    pinSingleChoiceRemoveButton(filterAssetUserChoicesInstance, 'filterAssetUser');
                    applyAssetFilters();
                });
                filterAssetUserChoicesInstance.passedElement.element.addEventListener('addItem', function() {
                    window.setTimeout(() => {
                        pinSingleChoiceRemoveButton(filterAssetUserChoicesInstance, 'filterAssetUser');
                        applyAssetFilters();
                    }, 100);
                });
            } catch (e) {
                const usersList = users.length > 0 ? users.map(u => u.name) : [...new Set(assets.map(a => a.user || '').filter(Boolean))];
                const cur = filterAssetUser.value;
                filterAssetUser.innerHTML = '<option value="">Tất cả người dùng</option>' + usersList.map(u => `<option value="${u}">${u}</option>`).join('');
                filterAssetUser.value = cur;
            }
        }

        const maintenanceAssetSelect = document.getElementById('maintenance_asset');
        if (maintenanceAssetSelect) {
            const cur = maintenanceAssetSelect.value;
            maintenanceAssetSelect.innerHTML = '<option value="">-- Chọn thiết bị --</option>' + assets.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
            maintenanceAssetSelect.value = cur;
            try {
                maintenanceAssetChoices?.destroy();
            } catch (e) {}
            try {
                maintenanceAssetChoices = new Choices(maintenanceAssetSelect, { 
                    searchPlaceholderValue: 'Tìm thiết bị...', 
                    shouldSort: false, 
                    removeItemButton: false, 
                    allowHTML: true,
                    itemSelectText: '',
                    position: 'bottom'
                });
            } catch (e) {}
        }

        // Populate license filters: user and status
        const filterLicenseUser = document.getElementById('filterLicenseUser');
        if (filterLicenseUser) {
            try {
                // Preserve the current selected value before reinitializing
                const currentSelectedValue = getSingleChoiceValue(filterLicenseUserChoicesInstance, 'filterLicenseUser');
                const el = filterLicenseUser;
                if (filterLicenseUserChoicesInstance) { try { filterLicenseUserChoicesInstance.destroy(); } catch (e) { } }
                filterLicenseUserChoicesInstance = new Choices(el, {
                    removeItemButton: false,
                    placeholder: true,
                    placeholderValue: 'Tất cả người dùng',
                    searchPlaceholderValue: 'Tìm người dùng...',
                    shouldSort: false,
                    searchEnabled: true,
                    itemSelectText: '',
                    position: 'bottom',
                    duplicateItemsAllowed: false
                });
                const choices = [{ value: '', label: 'Tất cả người dùng' }, ...users.map(u => ({ value: u.name, label: u.name }))];
                filterLicenseUserChoicesInstance.setChoices(choices, 'value', 'label', true);
                if (currentSelectedValue) {
                    filterLicenseUserChoicesInstance.setChoiceByValue(currentSelectedValue);
                } else {
                    filterLicenseUserChoicesInstance.setChoiceByValue('');
                }
                pinSingleChoiceRemoveButton(filterLicenseUserChoicesInstance, 'filterLicenseUser');
                
                // Thêm event listener để trigger filter khi thay đổi
                filterLicenseUserChoicesInstance.passedElement.element.addEventListener('change', () => {
                    pinSingleChoiceRemoveButton(filterLicenseUserChoicesInstance, 'filterLicenseUser');
                    applyLicenseFilters();
                });
                filterLicenseUserChoicesInstance.passedElement.element.addEventListener('removeItem', () => {
                    pinSingleChoiceRemoveButton(filterLicenseUserChoicesInstance, 'filterLicenseUser');
                    applyLicenseFilters();
                });
                
                // Thêm callback cho Choices.js để trigger filter khi chọn item
                filterLicenseUserChoicesInstance.passedElement.element.addEventListener('addItem', function(event) {
                    setTimeout(() => {
                        pinSingleChoiceRemoveButton(filterLicenseUserChoicesInstance, 'filterLicenseUser');
                        applyLicenseFilters();
                    }, 100); // Delay nhỏ để đảm bảo value đã được set
                });
                
            } catch (e) {
                const usersList = users.length > 0 ? users.map(u => u.name) : [...new Set(licenses.map(l => l.user || '').filter(Boolean))];
                const cur = filterLicenseUser.value;
                filterLicenseUser.innerHTML = '<option value="">Tất cả người dùng</option>' + usersList.map(u => `<option value="${u}">${u}</option>`).join('');
                filterLicenseUser.value = cur;
            }
        }
        const filterLicenseStatus = document.getElementById('filterLicenseStatus');
        if (filterLicenseStatus) {
            const statuses = [...new Set(licenses.map(l => l.status || '').filter(Boolean))];
            const cur = filterLicenseStatus.value;
            filterLicenseStatus.innerHTML = '<option value="">Tất cả trạng thái</option>' + statuses.map(s => `<option value="${s}">${(STATUS_MAP[s] && STATUS_MAP[s].text) || s}</option>`).join('');
            filterLicenseStatus.value = cur;
        }
    }

    function applyAssetFilters() {
        const term = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const normalizedTerm = normalizeString(term);
        const statusFilter = document.getElementById('filterAssetStatus')?.value || '';
        const locationFilter = document.getElementById('filterAssetLocation')?.value || '';
        const categoryFilter = document.getElementById('filterAssetCategory')?.value || '';
        const userInput = getSingleChoiceValue(filterAssetUserChoicesInstance, 'filterAssetUser');
        const normalizedUserFilter = normalizeString(userInput);

        console.debug('applyAssetFilters: term=', term, 'status=', statusFilter, 'location=', locationFilter, 'category=', categoryFilter, 'user=', userInput, 'assetsCount=', assets.length);

        currentFilteredAssets = assets
            .filter(a => {
                if (!normalizedTerm) return true;
                const searchPool = [a.name, a.config, a.category, a.location, a.asset_code, a.user].map(v => normalizeString(v)).join(' ');
                return searchPool.includes(normalizedTerm);
            })
            .filter(a => {
                if (statusFilter && String(a.status || '') !== String(statusFilter)) return false;
                if (locationFilter && String((a.location || '').trim()) !== String(locationFilter)) return false;
                if (categoryFilter && String((a.category || a.category_name || '')).trim() !== String(categoryFilter).trim()) return false;
                if (normalizedUserFilter) {
                    if (normalizeString(a.user || '') !== normalizedUserFilter) return false;
                }
                return true;
            })
            .sort((a, b) => {
                if (assetSort.column === 'purchase_date') {
                    const da = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
                    const db = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
                    return (da - db) * (assetSort.direction === 'asc' ? 1 : -1);
                }
                return ('' + (a[assetSort.column] || '')).localeCompare('' + (b[assetSort.column] || '')) * (assetSort.direction === 'asc' ? 1 : -1);
            });

        console.debug('applyAssetFilters: filteredCount=', currentFilteredAssets.length);
        renderTableAssets(currentFilteredAssets);
    }

    function applyLicenseFilters() {
        const term = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const normalizedTerm = normalizeString(term);
        const typeFilter = document.getElementById('filterLicenseType')?.value || '';
        const packageFilter = document.getElementById('filterPackageType')?.value || '';
        const statusFilter = document.getElementById('filterLicenseStatus')?.value || '';
        const userInput = getSingleChoiceValue(filterLicenseUserChoicesInstance, 'filterLicenseUser');
        const normalizedUserFilter = normalizeString(userInput);

        console.debug('applyLicenseFilters: term=', term, 'type=', typeFilter, 'package=', packageFilter, 'status=', statusFilter, 'user=', userInput, 'licensesCount=', licenses.length);

        currentFilteredLicenses = licenses
            .filter(l => {
                if (!normalizedTerm) return true;
                const searchPool = [l.key_type, l.package_type, l.license_key, l.notes, l.license_code, l.user].map(v => normalizeString(v)).join(' ');
                return searchPool.includes(normalizedTerm);
            })
            .filter(l => (typeFilter === '' || l.key_type === typeFilter) && (packageFilter === '' || l.package_type === packageFilter))
            .filter(l => {
                if (statusFilter && String((l.status || '')).trim() !== String(statusFilter).trim()) return false;
                if (normalizedUserFilter) {
                    if (normalizeString(l.user || '') !== normalizedUserFilter) return false;
                }
                return true;
            })
            .sort((a, b) => ('' + (a[licenseSort.column] || '')).localeCompare('' + (b[licenseSort.column] || '')) * (licenseSort.direction === 'asc' ? 1 : -1));

        renderTableLicenses(currentFilteredLicenses);
    }

    function applyUserFilters() {
        const term = document.getElementById('searchUserInput')?.value.toLowerCase() || '';
        const deptId = document.getElementById('filterDepartment')?.value || '';
        currentFilteredUsers = users.filter(u => [u.name, u.email, u.department, u.phone].filter(Boolean).some(v => v.toLowerCase().includes(term)) && (deptId === '' || u.department_id == deptId))
            .sort((a, b) => (a[userSort.column] || '').localeCompare(b[userSort.column] || '') * (userSort.direction === 'asc' ? 1 : -1));
        renderTableUsers(currentFilteredUsers);
    }

    function resetAssetFilters() {
        ['searchInput', 'filterAssetStatus', 'filterAssetLocation', 'filterAssetCategory'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const fau = document.getElementById('filterAssetUser');
        if (filterAssetUserChoicesInstance) {
            try {
                const selectedValue = filterAssetUserChoicesInstance.getValue(true);
                if (selectedValue) {
                    filterAssetUserChoicesInstance.setChoiceByValue('');
                }
                filterAssetUserChoicesInstance.clearInput();
            } catch (err) {}
        }
        if (fau) fau.value = '';
    }

    function resetLicenseFilters() {
        ['searchInput', 'filterLicenseType', 'filterPackageType', 'filterLicenseStatus'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const flu = document.getElementById('filterLicenseUser');
        if (filterLicenseUserChoicesInstance) {
            try {
                const selectedValue = filterLicenseUserChoicesInstance.getValue(true);
                if (selectedValue) {
                    filterLicenseUserChoicesInstance.setChoiceByValue('');
                }
                filterLicenseUserChoicesInstance.clearInput();
            } catch (err) {}
        }
        if (flu) flu.value = '';
    }

    function resetUserFilters() {
        const su = document.getElementById('searchUserInput');
        const fd = document.getElementById('filterDepartment');
        if (su) su.value = '';
        if (fd) fd.value = '';
    }

    function isAssetFilterOrSearchActive() {
        const term = (document.getElementById('searchInput')?.value || '').trim();
        const status = document.getElementById('filterAssetStatus')?.value || '';
        const location = document.getElementById('filterAssetLocation')?.value || '';
        const category = document.getElementById('filterAssetCategory')?.value || '';
        const user = (getSingleChoiceValue(filterAssetUserChoicesInstance, 'filterAssetUser') || '').trim();
        return !!(term || status || location || category || user);
    }

    function isLicenseFilterOrSearchActive() {
        const term = (document.getElementById('searchInput')?.value || '').trim();
        const type = document.getElementById('filterLicenseType')?.value || '';
        const packageType = document.getElementById('filterPackageType')?.value || '';
        const status = document.getElementById('filterLicenseStatus')?.value || '';
        const user = (getSingleChoiceValue(filterLicenseUserChoicesInstance, 'filterLicenseUser') || '').trim();
        return !!(term || type || packageType || status || user);
    }

    function isUserFilterOrSearchActive() {
        const term = (document.getElementById('searchUserInput')?.value || '').trim();
        const deptId = document.getElementById('filterDepartment')?.value || '';
        return !!(term || deptId);
    }

    function resolveExportData(filteredRows, fullRows, activeFilter) {
        if (!activeFilter && (!filteredRows || filteredRows.length === 0) && (fullRows || []).length > 0) {
            return fullRows;
        }
        return filteredRows || [];
    }

    function getActivityRows(table) {
        const rowsByTable = {
            assets,
            licenses,
            users,
            categories,
            departments,
            license_types: licenseTypes,
            suppliers,
            maintenance_tasks: maintenanceTasks,
            stock_checks: stockChecks
        };
        return rowsByTable[table] || [];
    }

    function describeActivityChanges(table, previous, next, isUpdate) {
        const labels = {
            name: 'Tên', email: 'Email', phone: 'Số điện thoại', department_id: 'Phòng ban',
            category_id: 'Danh mục', supplier_id: 'Nhà cung cấp', config: 'Cấu hình',
            location: 'Vị trí', purchase_date: 'Ngày nhập', cost: 'Nguyên giá',
            status: 'Trạng thái', user_id: 'Người sử dụng', assigned_date: 'Ngày cấp phát',
            notes: 'Ghi chú', title: 'Tiêu đề', due_date: 'Ngày dự kiến', note: 'Ghi chú',
            key_type: 'Loại key', license_key: 'Mã key', package_type: 'Gói',
            expiration_date: 'Ngày hết hạn', contact_person: 'Người liên hệ',
            address: 'Địa chỉ', priority: 'Mức ưu tiên', started_at: 'Ngày kiểm kê'
        };
        const displayValue = (field, value) => {
            if (value === null || value === undefined || value === '') return 'trống';
            if (field === 'status' && window.STATUS_MAP?.[value]) return window.STATUS_MAP[value].text;
            if (field === 'user_id') return users.find(user => user.id === value)?.name || 'Không có';
            if (field === 'department_id') return departments.find(department => department.id === value)?.name || 'Không có';
            if (field === 'category_id') return categories.find(category => category.id === value)?.name || 'Không có';
            if (field === 'supplier_id') return suppliers.find(supplier => supplier.id === value)?.name || 'Không có';
            if (field.endsWith('_date') || field === 'started_at') return String(value).substring(0, 10);
            return String(value);
        };
        const fields = Object.keys(next).filter(field => field !== 'id' && field !== 'created_at');
        const changes = fields.filter(field => !isUpdate || String(previous?.[field] ?? '') !== String(next[field] ?? ''));
        return changes.map(field => {
            const label = labels[field] || field;
            if (!isUpdate) return `${label}: ${displayValue(field, next[field])}`;
            return `${label}: ${displayValue(field, previous?.[field])} -> ${displayValue(field, next[field])}`;
        }).join('; ');
    }

    async function handleFormSubmit(e, table, payloadBuilder, modalId, postAction) {
        e.preventDefault();
        const payload = payloadBuilder();
        const id = payload.id; delete payload.id;
        const isUpdate = !!id;
        const previous = isUpdate ? getActivityRows(table).find(row => String(row.id) === String(id)) : null;
        const activityDetails = describeActivityChanges(table, previous, payload, isUpdate);
        let error;
        let resData = null;
        if (isUpdate) {
            const res = await supabaseClient.from(table).update(payload).eq('id', id);
            error = res.error; resData = res.data?.[0] || { id, ...payload };
        } else {
            const res = await supabaseClient.from(table).insert(payload);
            error = res.error; resData = res.data?.[0];
        }
        if (error) { 
            showInfoModal("Lỗi: " + error.message); 
            return; 
        }
        // Post-action (e.g. add log)
        if (postAction) postAction(resData, isUpdate, activityDetails);
        // 1. Đóng form edit trước
        if (modalId) safeCloseModal(modalId);
        // 2. Hiển thị modal thành công (thông báo cụ thể theo loại dữ liệu)
        const TABLE_LABELS = { assets: 'tài sản', licenses: 'license', users: 'nhân viên', categories: 'danh mục', departments: 'phòng ban', license_types: 'loại key', maintenance_tasks: 'lịch bảo trì', stock_checks: 'đợt kiểm kê' };
        const entityLabel = TABLE_LABELS[table] || 'dữ liệu';
        const entityName = payload.name || payload.key_type || payload.email || payload.title || '';
        const actionWord = isUpdate ? 'Đã cập nhật' : 'Đã thêm mới';
        showInfoModal(`${actionWord} ${entityLabel}${entityName ? ` "${entityName}"` : ''} thành công!`, "Thông báo");
        // 3. Tải lại dữ liệu ngầm, giữ nguyên filter/search
        await fetchAllData();
        // 4. Chỉ render lại bảng hiện tại, KHÔNG reload filter/dropdown
        if (document.getElementById('assetTableBody')) applyAssetFilters();
        if (document.getElementById('licenseTableBody')) applyLicenseFilters();
        if (document.getElementById('userTableBody')) applyUserFilters();
        if (document.getElementById('maintenanceTableBody') && typeof renderMaintenanceList === 'function') renderMaintenanceList();
        if (document.getElementById('stockCheckTableBody') && typeof renderStockCheckList === 'function') renderStockCheckList();
        if (document.getElementById('supplierListContainer')) renderLists();
    }

    if (document.getElementById('dashboardContent')) {
        updateDashboard();
    }

    if (document.getElementById('filterAssetUser') || document.getElementById('filterLicenseUser') || document.getElementById('assetTableBody') || document.getElementById('licenseTableBody')) {
        updateDropdowns();
        if (document.getElementById('assetTableBody')) applyAssetFilters();
        if (document.getElementById('licenseTableBody')) applyLicenseFilters();
    }

    // =================================================================
    // [MỚI] BÁO CÁO KHẤU HAO CHI TIẾT
    // =================================================================
    function computeDepreciation(asset) {
        const cost = Number(asset.cost) || 0;
        const salvage = Number(asset.salvage_value) || 0;
        const lifeMonths = Number(asset.useful_life_months) || 0;
        const depreciableBase = Math.max(0, cost - salvage);
        if (!asset.purchase_date || cost <= 0 || lifeMonths <= 0) {
            return { monthsElapsed: 0, accumulated: 0, bookValue: cost };
        }
        const purchaseDate = new Date(asset.purchase_date);
        if (isNaN(purchaseDate.getTime())) return { monthsElapsed: 0, accumulated: 0, bookValue: cost };
        const now = new Date();
        let monthsElapsed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
        if (now.getDate() < purchaseDate.getDate()) monthsElapsed -= 1;
        monthsElapsed = Math.max(0, Math.min(monthsElapsed, lifeMonths));

        let accumulated;
        if (asset.depreciation_method === 'declining_balance') {
            // Số dư giảm dần (double declining balance), không vượt quá phần được phép khấu hao
            const rate = Math.min(1, (2 / lifeMonths));
            let bookValue = cost;
            for (let m = 0; m < monthsElapsed; m++) {
                const monthlyDep = Math.min(bookValue - salvage, bookValue * rate);
                if (monthlyDep <= 0) break;
                bookValue -= monthlyDep;
            }
            accumulated = Math.min(depreciableBase, cost - bookValue);
        } else {
            // Đường thẳng (straight-line)
            const monthlyDep = depreciableBase / lifeMonths;
            accumulated = Math.min(depreciableBase, monthlyDep * monthsElapsed);
        }
        const bookValue = Math.max(salvage, cost - accumulated);
        return { monthsElapsed, accumulated, bookValue };
    }

    function renderDepreciationReport() {
        const tbody = document.getElementById('depreciationReportTableBody');
        const tfoot = document.getElementById('depreciationReportFooter');
        if (!tbody) return;
        const DEP_METHOD_LABEL = { straight_line: 'Đường thẳng', declining_balance: 'Số dư giảm dần' };
        const rows = assets.filter(a => a.status !== 'Disposed').map(a => {
            const { monthsElapsed, accumulated, bookValue } = computeDepreciation(a);
            return { asset: a, monthsElapsed, accumulated, bookValue };
        });
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-400">Không có tài sản để tính khấu hao.</td></tr>';
            if (tfoot) tfoot.innerHTML = '';
            return;
        }
        tbody.innerHTML = rows.map(r => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <td class="p-3 font-medium text-slate-700 dark:text-slate-100">${r.asset.name}</td>
                <td class="p-3 text-slate-600 dark:text-slate-300">${formatDateDisplay(r.asset.purchase_date)}</td>
                <td class="p-3 text-right text-slate-600 dark:text-slate-300">${currencyVN(r.asset.cost)}</td>
                <td class="p-3 text-right text-slate-600 dark:text-slate-300">${currencyVN(r.asset.salvage_value)}</td>
                <td class="p-3 text-slate-600 dark:text-slate-300">${DEP_METHOD_LABEL[r.asset.depreciation_method] || r.asset.depreciation_method || '-'}</td>
                <td class="p-3 text-right text-slate-600 dark:text-slate-300">${r.monthsElapsed}</td>
                <td class="p-3 text-right text-amber-600 dark:text-amber-400">${currencyVN(r.accumulated)}</td>
                <td class="p-3 text-right font-semibold text-green-600 dark:text-green-400">${currencyVN(r.bookValue)}</td>
            </tr>
        `).join('');
        if (tfoot) {
            const totalCost = rows.reduce((s, r) => s + (Number(r.asset.cost) || 0), 0);
            const totalAccumulated = rows.reduce((s, r) => s + r.accumulated, 0);
            const totalBookValue = rows.reduce((s, r) => s + r.bookValue, 0);
            tfoot.innerHTML = `<tr>
                <td class="p-3" colspan="2">Tổng cộng (${rows.length} tài sản)</td>
                <td class="p-3 text-right">${currencyVN(totalCost)}</td>
                <td class="p-3" colspan="3"></td>
                <td class="p-3 text-right text-amber-700 dark:text-amber-400">${currencyVN(totalAccumulated)}</td>
                <td class="p-3 text-right text-green-700 dark:text-green-400">${currencyVN(totalBookValue)}</td>
            </tr>`;
        }
    }

    // Ẩn/hiện field "Ngày thanh lý"/"Lý do thanh lý" theo trạng thái đang chọn
    const assetStatusSelect = document.getElementById('modal_assetStatus');
    const disposedFieldsWrapper = document.getElementById('assetDisposedFields');
    if (assetStatusSelect && disposedFieldsWrapper) {
        assetStatusSelect.addEventListener('change', () => {
            disposedFieldsWrapper.classList.toggle('hidden', assetStatusSelect.value !== 'Disposed');
        });
    }

    window.computeDepreciation = computeDepreciation;
    window.renderDepreciationReport = renderDepreciationReport;
    window.handleAssetFileSelect = handleAssetFileSelect;
    window.handleUserFileSelect = handleUserFileSelect;
    window.renderTableAssets = renderTableAssets;
    window.renderTableLicenses = renderTableLicenses;
    window.renderTableUsers = renderTableUsers;
    window.applyAssetFilters = applyAssetFilters;
    window.applyLicenseFilters = applyLicenseFilters;
    window.applyUserFilters = applyUserFilters;
    window.resetAssetFilters = resetAssetFilters;
    window.resetLicenseFilters = resetLicenseFilters;
    window.resetUserFilters = resetUserFilters;
    window.fetchAllData = fetchAllData;
    window.isAssetFilterOrSearchActive = isAssetFilterOrSearchActive;
    window.isLicenseFilterOrSearchActive = isLicenseFilterOrSearchActive;
    window.isUserFilterOrSearchActive = isUserFilterOrSearchActive;
    window.renderLists = renderLists;
    window.initAllUserDropdowns = initAllUserDropdowns;
    window.updateDropdowns = updateDropdowns;
    window.updateDashboard = updateDashboard;
    window.processUserImport = processUserImport;
    window.processAssetImport = processAssetImport;
    window.resolveExportData = resolveExportData;
    window.handleFormSubmit = handleFormSubmit;
    window.renderUserImportPreview = renderUserImportPreview;
    window.renderAssetImportPreview = renderAssetImportPreview;
    window.renderPagination = renderPagination;

    return;
};

