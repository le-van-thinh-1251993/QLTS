// auth.js phải được load trước script.js trong file HTML
// auth.js sẽ xử lý việc kiểm tra session và chuyển hướng nếu chưa đăng nhập.
document.addEventListener('DOMContentLoaded', async () => {
    // Gọi checkSession từ auth.js để đảm bảo người dùng đã đăng nhập.
    // Nếu chưa, họ sẽ bị chuyển hướng sang login.html.
    // currentUserProfile sẽ được gán giá trị trong hàm checkSession()
    await checkSession();
    if (!currentUserProfile) return; // Dừng thực thi nếu không có session (đang chuyển hướng)
    // =================================================================
    // LOGIC FOR MOBILE SIDEBAR TOGGLE
    // =================================================================
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

    // =================================================================
    // 1. CẤU HÌNH & BIẾN TOÀN CỤC
    // =================================================================
    // --- HELPER FUNCTIONS (ĐẶT Ở ĐẦU ĐỂ TRÁNH LỖI SCOPE) ---

    function showInfoModal(message, title = "Thông báo") {
        const titleEl = document.getElementById('infoModalTitle');
        const msgEl = document.getElementById('infoModalMessage');
        if (titleEl && msgEl) {
            titleEl.textContent = title;
            msgEl.innerHTML = message;
            openModal('infoModal');
        } else {
            alert(`${title}: ${message}`);
        }
    }

    function handleSupabaseError(error, context) {
        console.error(`Lỗi ${context}:`, error);
        // Kiểm tra kỹ biến error để tránh lỗi 'message of undefined'
        const msg = (error && error.message) ? error.message : JSON.stringify(error);
        showInfoModal(`Chi tiết: ${msg}`, `Lỗi khi ${context}`);
    }

    // --- Data Stores ---
    let assets = [], licenses = [], assetHistory = [], categories = [], users = [], departments = [], licenseTypes = [];
    let tempImportedUsers = [], tempImportedAssets = [];

    // --- State & Config ---
    let tempId = null;
    let confirmCallback = null;
    let assetCurrentPage = 1, userCurrentPage = 1, licenseCurrentPage = 1;
    const ITEMS_PER_PAGE = 10;

    // --- Filtered Data Buffers ---
    let currentFilteredAssets = [], currentFilteredUsers = [], currentFilteredLicenses = [];

    // --- Sort Config ---
    let assetSort = { column: 'name', direction: 'asc' };
    let userSort = { column: 'name', direction: 'asc' };
    let licenseSort = { column: 'key_type', direction: 'asc' };

    // --- Chart Instances ---
    let chartAssetHealth = null;
    let chartCategory = null;
    let chartLocation = null;
    let chartLicenseStatus = null;
    let chartDepartment = null;
    let chartUserAsset = null;
    let chartUserLicense = null;
    let chartActivity = null;
    let chartLicenseExpiration = null;
 
    // --- UI Instances ---
    let assignUserChoicesInstance = null, userChoicesInstance = null;
    let licenseUserChoicesInstance = null, licenseAssignUserChoicesInstance = null;
    let transferUserChoicesInstance = null;

    const STATUS_MAP = {
        Active: { text: 'Đang dùng', classes: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700' },
        Stock: { text: 'Trong kho', classes: 'bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-700' },
        Repair: { text: 'Sửa chữa', classes: 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700' },
        Broken: { text: 'Hỏng', classes: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700' },
        Expired: { text: 'Hết hạn', classes: 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' }
    };

    // =================================================================
    // 2. DATA FETCHING & LOGIC
    // =================================================================

    async function fetchAllData() {
        const [deptRes, catRes, userRes, assetRes, licenseRes, historyRes, licTypeRes] = await Promise.all([
            supabaseClient.from('departments').select('*'),
            supabaseClient.from('categories').select('*'),
            supabaseClient.from('users').select('*, department:departments(name)'),
            supabaseClient.from('assets').select('*, category:categories(name), user:users(name)'),
            supabaseClient.from('licenses').select('*, user:users(name)'),
            // SỬA LỖI: Sắp xếp theo 'id' để đảm bảo thứ tự đúng ngay cả khi created_at bị null
            supabaseClient.from('asset_history').select('*, asset:assets(name)').order('id', { ascending: false }),
            supabaseClient.from('license_types').select('*')
        ]);

        if (deptRes.data) departments = deptRes.data;
        if (catRes.data) categories = catRes.data;
        if (licTypeRes.data) licenseTypes = licTypeRes.data;
        if (userRes.data) users = userRes.data.map(u => ({ ...u, department: u.department?.name || '-' }));
        if (assetRes.data) assets = assetRes.data.map(a => ({ ...a, category: a.category?.name || '-', user: a.user?.name || null, warranty_expiration_date: a.warranty_expiration_date || null }));
        if (licenseRes.data) licenses = licenseRes.data.map(l => ({ ...l, user: l.user?.name || null }));
        if (historyRes.data) assetHistory = historyRes.data.map(l => ({
            id: l.id, 
            created_at: l.created_at, 
            // SỬA LỖI: Nếu created_at là null (dữ liệu cũ), hiển thị một chuỗi khác thân thiện hơn
            time: l.created_at ? new Date(l.created_at).toLocaleString('vi-VN') : 'Lịch sử cũ',
            // CẢI TIẾN: Nếu created_at là null (dữ liệu cũ), hiển thị chuỗi rỗng thay vì "Lịch sử cũ"
            time: l.created_at ? new Date(l.created_at).toLocaleString('vi-VN') : '',
            assetId: l.asset_id, assetName: l.asset?.name || 'N/A',
            action: l.action, desc: l.description
        }));
    }

    async function addLog(targetId, type, action, desc) {
        try {
            if (type === 'ASSET') {
                // SỬA LỖI: Thêm created_at ở phía client để đảm bảo luôn có ngày giờ
                const { error } = await supabaseClient.from('asset_history').insert({
                    asset_id: targetId,
                    action: action,
                    description: desc,
                    created_at: new Date().toISOString()
                });
                if (error) throw error;
            } else if (type === 'LICENSE') {
                // SỬA LỖI: Thêm created_at ở phía client
                const { error } = await supabaseClient.from('asset_history').insert({
                    asset_id: targetId, // Tạm dùng asset_id
                    action: action,
                    description: `[LICENSE] ${desc}`,
                    created_at: new Date().toISOString()
                });
                if (error) throw error;
            }
        } catch (err) {
            console.error('Lỗi ghi log:', err);
        }
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

    // 2. Hàm xử lý ngày tháng
    function parseDateToISO(dateStr) {
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

    // 3. Hàm hiển thị (ĐÃ CẬP NHẬT TỰ TÌM TÊN CỘT & HIỂN THỊ)
    function renderLicenseImportPreview(data) {
        const tbody = document.getElementById('licenseImportPreviewTableBody');
        tbody.innerHTML = '';
        tempImportedLicenses = [];

        if (data.length === 0) return;

        data.forEach(row => {
            // --- MAPPING CỘT THÔNG MINH ---
            const keyType = row['Loại key'] || row['Key Type'] || row['Type'] || '';
            const licenseKey = row['Mã key'] || row['License Key'] || row['Key'] || row['Serial'] || '';
            const packageType = row['Loại gói gia hạn'] || row['Package'] || row['Plan'] || '';
            const rawDate = row['Ngày hết hạn'] || row['Expiration Date'] || row['Date'] || '';

            // SỬA LỖI TÊN: Bổ sung thêm "Họ và tên", "Nhân viên"... để bắt được cột trong Excel
            const userName = row['Người sử dụng'] || row['Người dùng'] || row['User'] || row['Account'] || row['Name'] || row['Họ tên'] || row['Họ và tên'] || row['Nhân viên'] || '';

            const notes = row['Notes'] || row['Ghi chú'] || '';

            // Xử lý dữ liệu ngày tháng
            const cleanDate = parseDateToISO(rawDate);
            const dateDisplay = cleanDate || '<span class="text-red-500 text-xs italic">Sai/Thiếu ngày</span>';

            // Tìm user trong hệ thống
            const foundUser = users.find(u => normalizeString(u.name) === normalizeString(userName));
            const status = foundUser ? 'Active' : 'Stock';

            let userDisplayHTML = '';
            let userClass = '';

            if (foundUser) {
                userDisplayHTML = foundUser.name;
                userClass = 'text-green-600 font-bold';
            } else if (userName) {
                userDisplayHTML = `${userName} (Không khớp)`;
                userClass = 'text-red-400 italic';
            } else {
                // Nếu không có tên trong Excel, hiện chữ "Chưa phân bổ" thay vì dấu gạch ngang
                userDisplayHTML = '<span class="text-slate-300 italic">Chưa phân bổ</span>';
                userClass = 'text-slate-400';
            }

            const statusClass = status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-sky-100 text-sky-700';

            tempImportedLicenses.push({
                key_type: keyType,
                license_key: licenseKey,
                package_type: packageType,
                expiration_date: cleanDate,
                user_id: foundUser ? foundUser.id : null,
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
                <td class="px-4 py-3"><span class="px-2 py-1 rounded text-xs ${statusClass}">${status}</span></td>
            `;
            tbody.appendChild(tr);
        });

        if (tempImportedLicenses.length > 0) {
            btnSaveImportedLicenses.disabled = false;
            btnSaveImportedLicenses.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    // 4. Sự kiện nút Lưu
    if (btnSaveImportedLicenses) {
        btnSaveImportedLicenses.addEventListener('click', async () => {
            if (tempImportedLicenses.length === 0) return;

            btnSaveImportedLicenses.textContent = "Đang lưu...";
            btnSaveImportedLicenses.disabled = true;

            try {
                const { error } = await supabaseClient.from('licenses').insert(tempImportedLicenses);
                if (error) throw error;

                showInfoModal(`Đã import thành công ${tempImportedLicenses.length} license!`, "Thành công");
                safeCloseModal('importLicenseModal');

                await fetchAllData();
                renderTableLicenses(licenses);
                updateDashboard();

            } catch (err) {
                handleSupabaseError(err, "Import License");
            } finally {
                btnSaveImportedLicenses.textContent = "Lưu vào Database";
                btnSaveImportedLicenses.disabled = false;
            }
        });
    }
    // =================================================================
    // 3. UI HELPERS & RENDERING
    // =================================================================

    // Helper: Chuẩn hóa chuỗi để so sánh (Fix lỗi thiếu hàm này khi import)
    function normalizeString(str) {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
    }

    function openModal(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('hidden');
            el.classList.add('flex');
        }
    }

    function attemptCloseModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        safeCloseModal(modalId); // Tạm thời đóng trực tiếp, không kiểm tra dirty form theo yêu cầu
    }

    function safeCloseModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal || modal.classList.contains('hidden')) return;
        modal.classList.add('hidden'); modal.classList.remove('flex');

        ['assetForm', 'userForm', 'licenseForm', 'categoryForm', 'departmentForm', 'licenseTypeForm'].forEach(id => { const f = document.getElementById(id); if (f) f.reset(); });

        if (document.getElementById('categoryOldName')) document.getElementById('categoryOldName').value = '';
        if (document.getElementById('licenseTypeId')) document.getElementById('licenseTypeId').value = '';
        if (document.getElementById('transferNotes')) document.getElementById('transferNotes').value = '';

        document.getElementById('btnCancelCategoryEdit')?.classList.add('hidden');
        document.getElementById('cancelDeptEdit')?.classList.add('hidden');
        document.getElementById('btnCancelLicenseTypeEdit')?.classList.add('hidden');

        const userImportBody = document.getElementById('userImportPreviewTableBody'); if (userImportBody) userImportBody.innerHTML = '';
        const assetImportBody = document.getElementById('importPreviewTableBody'); if (assetImportBody) assetImportBody.innerHTML = '';

        tempImportedUsers = []; tempImportedAssets = [];
        const userFile = document.getElementById('userExcelFileInput'); if (userFile) userFile.value = '';
        const assetFile = document.getElementById('excelFileInput'); if (assetFile) assetFile.value = '';
    }

    function showInfoModal(message, title = "Thông báo") {
        const titleEl = document.getElementById('infoModalTitle');
        const msgEl = document.getElementById('infoModalMessage');
        if (titleEl && msgEl) { titleEl.textContent = title; msgEl.innerHTML = message; openModal('infoModal'); } else alert(`${title}: ${message.replace(/<[^>]*>?/gm, '')}`);
    }

    function showConfirmationModal(message, onConfirm) {
        const msgEl = document.getElementById('confirmationModalMessage');
        if (msgEl) { msgEl.textContent = message; confirmCallback = onConfirm; openModal('confirmationModal'); } else { if (confirm(message)) onConfirm(); }
    }

    function handleSupabaseError(error, context) { console.error(`Lỗi ${context}:`, error); showInfoModal(`Chi tiết: ${error.message}`, `Lỗi khi ${context}`); }

    function exportToExcel(data, fileName) {
        if (!data || !data.length) return showInfoModal("Không có dữ liệu để xuất!", "Cảnh báo");
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, fileName);
    }

    // =================================================================
    // 4. DASHBOARD & DRILL-DOWN LOGIC
    // =================================================================

    function showDrillDown(title, items, type = 'asset') {
        const modalTitle = document.getElementById('drillDownModalTitle');
        const tbody = document.getElementById('drillDownModalTableBody');
        if (!modalTitle || !tbody) return;

        modalTitle.textContent = title;

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Không có dữ liệu chi tiết.</td></tr>';
        } else {
            tbody.innerHTML = items.map(item => {
                if (type === 'asset') {
                    const statusInfo = STATUS_MAP[item.status] || { text: item.status, classes: 'bg-gray-100' };
                    return `<tr class="border-b hover:bg-slate-50"><td class="p-3 font-medium text-slate-700">${item.name}</td><td class="p-3 text-xs text-slate-500 font-mono">${item.config || '-'}</td><td class="p-3 text-sm text-blue-600 font-semibold">${item.user || '-'}</td><td class="p-3"><span class="px-2 py-1 rounded-full text-xs font-bold ${statusInfo.classes}">${statusInfo.text}</span></td></tr>`;
                } else {
                    const statusInfo = STATUS_MAP[item.status] || { text: item.status, classes: 'bg-gray-100' };
                    return `<tr class="border-b hover:bg-slate-50"><td class="p-3 font-medium text-slate-700">${item.key_type}</td><td class="p-3 text-xs text-slate-500 font-mono">${item.license_key || '-'}</td><td class="p-3 text-sm">${item.expiration_date || 'Vĩnh viễn'}</td><td class="p-3 text-sm text-blue-600 font-semibold">${item.user || '-'}</td><td class="p-3"><span class="px-2 py-1 rounded-full text-xs font-bold ${statusInfo.classes}">${statusInfo.text}</span></td></tr>`;
                }
            }).join('');
        }
        openModal('drillDownModal');
    }

    function updateDashboard() {
        if (!document.getElementById('dashboardContent')) return;

        if (document.getElementById('totalAssets')) document.getElementById('totalAssets').textContent = assets.length;
        if (document.getElementById('assetsInUse')) document.getElementById('assetsInUse').textContent = assets.filter(a => a.status === 'Active').length;
        if (document.getElementById('assetsInStock')) document.getElementById('assetsInStock').textContent = assets.filter(a => a.status === 'Stock').length;
        if (document.getElementById('assetsInRepair')) document.getElementById('assetsInRepair').textContent = assets.filter(a => ['Repair', 'Broken'].includes(a.status)).length;

        const drawChart = (id, instance, type, labels, data, colors, label = 'Dữ liệu', onClickCallback = null) => {
            const ctx = document.getElementById(id);
            if (!ctx || typeof Chart === 'undefined') return null;
            if (instance) instance.destroy();
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

        // --- [MỚI] Biểu đồ Hạn sử dụng License trên Dashboard chính ---
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

        const last7Days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse();
        const actData = last7Days.map(date => assetHistory.filter(h => (h.created_at || '').startsWith(date)).length);
        const ctxTrend = document.getElementById('activityTrendChart');
        if (ctxTrend && typeof Chart !== 'undefined') {
            if (chartActivity) chartActivity.destroy();
            chartActivity = new Chart(ctxTrend, { type: 'line', data: { labels: last7Days, datasets: [{ label: 'Số hoạt động', data: actData, borderColor: '#0ea5e9', tension: 0.3, fill: true, backgroundColor: 'rgba(14, 165, 233, 0.1)' }] }, options: { responsive: true, maintainAspectRatio: false } });
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
        if (tableType === 'assets') colCount = 9;
        if (tableType === 'licenses') colCount = 8;
        if (tableType === 'users') colCount = 5;

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
        const prevClass = prevDisabled ? 'pointer-events-none opacity-50 bg-gray-100 text-gray-400' : 'text-slate-500 bg-white hover:bg-slate-100 hover:text-slate-700';
        html += `<li><a href="javascript:void(0)" data-page="${currentPage - 1}" data-table="${tableType}" class="flex items-center justify-center px-3 h-8 ml-0 leading-tight border border-slate-300 rounded-l-lg ${prevClass}">Trước</a></li>`;

        // Các nút số trang (Dùng danh sách rút gọn)
        rangeWithDots.forEach(page => {
            if (page === '...') {
                html += `<li><span class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-slate-300">...</span></li>`;
            } else {
                const active = (page === currentPage) ? 'z-10 text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700' : 'text-slate-500 bg-white hover:bg-slate-100 hover:text-slate-700';
                html += `<li><a href="javascript:void(0)" data-page="${page}" data-table="${tableType}" class="flex items-center justify-center px-3 h-8 leading-tight border border-slate-300 ${active}">${page}</a></li>`;
            }
        });

        // Nút Sau
        const nextDisabled = currentPage === totalPages;
        const nextClass = nextDisabled ? 'pointer-events-none opacity-50 bg-gray-100 text-gray-400' : 'text-slate-500 bg-white hover:bg-slate-100 hover:text-slate-700';
        html += `<li><a href="javascript:void(0)" data-page="${currentPage + 1}" data-table="${tableType}" class="flex items-center justify-center px-3 h-8 leading-tight border border-slate-300 rounded-r-lg ${nextClass}">Sau</a></li></ul>`;

        container.innerHTML = html;
    }

    function renderTableAssets(data) {
        const tbody = document.getElementById('assetTableBody'); if (!tbody) return;
        document.getElementById('assetTotalCount').textContent = data.length;
        document.getElementById('assetTotalCount').classList.remove('hidden');
        const start = (assetCurrentPage - 1) * ITEMS_PER_PAGE;
        const pageData = data.slice(start, start + ITEMS_PER_PAGE);
        if (pageData.length === 0) { tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400">Không có dữ liệu.</td></tr>`; renderPagination('assetPagination', 1, 0, ITEMS_PER_PAGE, 'assets'); return; }
        tbody.innerHTML = pageData.map(item => {
            const status = STATUS_MAP[item.status] || { text: item.status, classes: 'bg-gray-100' };
            const isAdmin = currentUserProfile.role === 'admin';
            let btns = '';
            const btnClasses = "w-8 h-8 flex items-center justify-center rounded-md transition-all";

            if (isAdmin) {
                if (item.status === 'Stock') {
                    btns = `<div class="tooltip"><button data-action="checkout-asset" data-id="${item.id}" class="${btnClasses} bg-blue-600 text-white hover:bg-blue-700"><i class="fa-solid fa-hand-holding-hand"></i></button><span class="tooltiptext">Cấp phát</span></div>`;
                } else if (item.status === 'Active') {
                    btns = `<div class="tooltip"><button data-action="checkin-asset" data-id="${item.id}" class="${btnClasses} bg-yellow-500 text-white hover:bg-yellow-600"><i class="fa-solid fa-rotate-left"></i></button><span class="tooltiptext">Thu hồi</span></div>
                            <div class="tooltip"><button data-action="transfer" data-id="${item.id}" class="${btnClasses} text-blue-600 bg-blue-100 hover:bg-blue-200"><i class="fa-solid fa-right-left"></i></button><span class="tooltiptext">Chuyển đổi</span></div>`;
                }
            }

            return `<tr class="border-b hover:bg-slate-50 group asset-row" data-id="${item.id}">
                <td class="p-4 font-semibold text-slate-700">${item.name}</td>
                <td class="p-4 text-xs text-slate-500 font-mono whitespace-pre-wrap">${item.config || ''}</td>
                <td class="p-4">${item.category}</td><td class="p-4 text-sm">${item.location || '-'}</td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-xs font-bold ${status.classes}">${status.text}</span></td>
                <td class="p-4 text-sm font-medium text-blue-600">${item.user || '-'}</td>
                <td class="p-4 text-sm italic text-slate-400">-</td>
                <td class="p-4 text-xs text-slate-500 max-w-xs truncate">${item.notes || ''}</td>
                <td class="p-4 flex gap-2 items-center">
                    ${btns}
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
            const status = STATUS_MAP[item.status] || { text: item.status, classes: 'bg-gray-100' };
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
                    btns += `<div class="tooltip"><button data-action="transfer-license" data-id="${item.id}" class="${btnClasses} bg-indigo-100 text-indigo-600 hover:bg-indigo-200"><i class="fa-solid fa-right-left"></i></button><span class="tooltiptext">Chuyển đổi</span></div>`;
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
                <td class="p-4 font-semibold text-slate-700">${item.key_type}</td>
                <td class="p-4 font-mono text-xs text-slate-500">${isAdmin ? (item.license_key || '') : '******'}</td>
                <td class="p-4 text-sm">${item.package_type || '-'}</td>
                <td class="p-4 text-sm">${item.expiration_date || 'Vĩnh viễn'}</td>
                <td class="p-4 text-sm font-medium text-blue-600">${item.user || '-'}</td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-xs font-bold ${status.classes}">${status.text}</span></td>
                <td class="p-4 text-xs text-slate-500 max-w-xs truncate">${item.notes || ''}</td>
                <td class="p-4 flex items-center gap-2">
                    ${btns}
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
                <td class="p-4 flex items-center gap-3"><img src="${u.avatar}" class="w-9 h-9 rounded-full"><div><p class="font-bold text-slate-700">${u.name}</p><p class="text-xs text-slate-500">${u.email}</p></div></td>
                <td class="p-4 text-slate-600">${u.department}</td>
                <td class="p-4 text-sm text-slate-500"><span class="bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold">${holdingInfo}</span></td>
                <td class="p-4 font-bold text-sm ${u.status === 'Đang hoạt động' ? 'text-green-600' : 'text-slate-400'}">${u.status}</td>
                <td class="p-4 flex gap-2">
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
        tbody.innerHTML = tempImportedAssets.map((a, idx) => `<tr class="border-b hover:bg-slate-50"><td class="p-3 text-center"><input type="checkbox" class="import-check-asset" data-idx="${idx}"></td><td class="p-3 font-medium">${a.name}</td><td class="p-3 text-sm truncate max-w-[150px]">${a.config || '-'}</td><td class="p-3 text-sm">${a.category || '-'}</td><td class="p-3 text-sm">${a.location || '-'}</td><td class="p-3 text-sm">${a.status || '-'}</td><td class="p-3 text-sm font-bold text-blue-600">${a.user || '-'}</td><td class="p-3 text-xs truncate max-w-[100px]">${a.notes || ''}</td></tr>`).join('');
    }

    async function processUserImport() {
        if (tempImportedUsers.length === 0) return;
        const btn = document.getElementById('btnConfirmUserImport'); btn.textContent = 'Đang xử lý...'; btn.disabled = true;
        let successCount = 0;
        for (const u of tempImportedUsers) {
            const deptObj = departments.find(d => normalizeString(d.name) === normalizeString(u.department));
            const payload = { name: u.name, email: u.email, department_id: deptObj?.id || null, status: u.status, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}` };
            const { error } = await supabaseClient.from('users').insert(payload); if (!error) successCount++;
        }
        btn.textContent = 'Xác nhận Import'; btn.disabled = false;
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
            const payload = { name: a.name, config: a.config, location: a.location, status: status, notes: a.notes, category_id: catObj?.id || null, user_id: userId };
            const { error } = await supabaseClient.from('assets').insert(payload); if (!error) successCount++;
        }
        btn.textContent = 'Xác nhận Import'; btn.disabled = false;
        showInfoModal(`Đã import ${successCount} tài sản.`, "Hoàn tất"); safeCloseModal('importPreviewModal'); await refreshApp();
    }

    function initChoices(elementId, instanceVar, data, selectedValue = null) {
        const el = document.getElementById(elementId); if (!el) return null;
        if (instanceVar) { try { instanceVar.destroy(); } catch (e) { } }
        const newInstance = new Choices(el, { removeItemButton: true, placeholder: true, placeholderValue: 'Chọn...', searchPlaceholderValue: 'Tìm kiếm...', shouldSort: false });
        const choices = data.map(u => ({ value: u.name, label: u.name }));
        newInstance.setChoices(choices, 'value', 'label', true);
        if (selectedValue) newInstance.setChoiceByValue(selectedValue);
        return newInstance;
    }

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
    }

    function applyAssetFilters() {
        const term = document.getElementById('searchInput')?.value.toLowerCase() || '';
        currentFilteredAssets = assets.filter(a => a.name.toLowerCase().includes(term) || (a.user || '').toLowerCase().includes(term))
            .sort((a, b) => (a[assetSort.column] || '').localeCompare(b[assetSort.column] || '') * (assetSort.direction === 'asc' ? 1 : -1));
        renderTableAssets(currentFilteredAssets);
    }

    function applyLicenseFilters() {
        const term = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('filterLicenseType')?.value || '';
        const packageFilter = document.getElementById('filterPackageType')?.value || ''; // [MỚI] Lấy giá trị từ bộ lọc gói
        currentFilteredLicenses = licenses.filter(l => 
            (l.key_type.toLowerCase().includes(term) || (l.user || '').toLowerCase().includes(term)) && 
            (typeFilter === '' || l.key_type === typeFilter) &&
            (packageFilter === '' || l.package_type === packageFilter) // [MỚI] Thêm điều kiện lọc gói
        )
            .sort((a, b) => (a[licenseSort.column] || '').localeCompare(b[licenseSort.column] || '') * (licenseSort.direction === 'asc' ? 1 : -1));
        
        renderTableLicenses(currentFilteredLicenses);
    }

    function applyUserFilters() {
        const term = document.getElementById('searchUserInput')?.value.toLowerCase() || '';
        const deptId = document.getElementById('filterDepartment')?.value || '';
        currentFilteredUsers = users.filter(u => u.name.toLowerCase().includes(term) && (deptId === '' || u.department_id == deptId))
            .sort((a, b) => (a[userSort.column] || '').localeCompare(b[userSort.column] || '') * (userSort.direction === 'asc' ? 1 : -1));
        renderTableUsers(currentFilteredUsers);
    }

    async function handleFormSubmit(e, table, payloadBuilder, modalId, postAction) {
        if (e.target.tagName !== 'FORM') return;
        e.preventDefault();
        const payload = payloadBuilder();
        const id = payload.id; delete payload.id;
        let error;
        if (id) { const res = await supabaseClient.from(table).update(payload).eq('id', id); error = res.error; }
        else { const res = await supabaseClient.from(table).insert(payload).select(); error = res.error; if (!error && postAction) postAction(res.data[0]); }
        if (error) showInfoModal("Lỗi: " + error.message); else { await refreshApp(); showInfoModal("Lưu thành công!", "Thông báo"); }
    }

    // =================================================================
    // 7. LISTENERS & EVENTS
    // =================================================================
    
    // Gắn sự kiện cho các bộ lọc và tìm kiếm một cách rõ ràng hơn
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (document.getElementById('licenseTableBody')) {
                applyLicenseFilters();
            } else if (document.getElementById('assetTableBody')) {
                applyAssetFilters();
            }
        });
    }
    document.getElementById('searchUserInput')?.addEventListener('input', applyUserFilters);
    document.getElementById('filterDepartment')?.addEventListener('change', applyUserFilters);
    document.getElementById('filterLicenseType')?.addEventListener('change', applyLicenseFilters);
    document.getElementById('filterPackageType')?.addEventListener('change', applyLicenseFilters); // [MỚI] Thêm event listener
    document.getElementById('userExcelFileInput')?.addEventListener('change', handleUserFileSelect);
    document.getElementById('excelFileInput')?.addEventListener('change', handleAssetFileSelect);

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

                let content = `<div class="text-left space-y-4">
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Phòng ban:</strong> ${user.department}</p>
                    <p><strong>Trạng thái:</strong> <span class="font-bold ${user.status === 'Đang hoạt động' ? 'text-green-600' : 'text-slate-400'}">${user.status}</span></p>
                    
                    <div><h4 class="font-bold text-blue-600 mb-1 border-t pt-3">Tài sản đang giữ (${uAssets.length}):</h4>`;
                if (uAssets.length > 0) { content += '<ul class="list-disc pl-5 text-sm text-slate-700">'; uAssets.forEach(a => content += `<li><b>${a.name}</b></li>`); content += '</ul>'; } 
                else { content += '<p class="text-sm text-gray-400 italic">Không có tài sản</p>'; }
                
                content += `</div><div><h4 class="font-bold text-green-600 mb-1 border-t pt-3">License đang giữ (${uLicenses.length}):</h4>`;
                if (uLicenses.length > 0) { content += '<ul class="list-disc pl-5 text-sm text-slate-700">'; uLicenses.forEach(l => content += `<li><b>${l.key_type}</b> <span class="text-gray-500 font-mono text-xs">(${l.package_type || 'N/A'})</span></li>`); content += '</ul>'; } 
                else { content += '<p class="text-sm text-gray-400 italic">Không có license</p>'; }
                
                content += '</div></div>';
                showInfoModal(content, `Chi tiết: ${user.name}`);
            }
            return;
        }

        // =================================================================
        // CÁC LOGIC KHÁC (Button, Close, Page...)
        // =================================================================
        if (t.closest('.close-modal') || t.closest('#btnCancelClose') || t.closest('#cancelDeleteBtn') || t.closest('#closeInfoModalBtn') || t.closest('#closeDeptModal')) { const modal = t.closest('.fixed.flex'); if (modal) attemptCloseModal(modal.id); return; }

        const pageBtn = t.closest('a[data-page]');
        if (pageBtn) { e.preventDefault(); const p = parseInt(pageBtn.dataset.page), tbl = pageBtn.dataset.table; if (tbl === 'assets') { assetCurrentPage = p; renderTableAssets(currentFilteredAssets); } else if (tbl === 'users') { userCurrentPage = p; renderTableUsers(currentFilteredUsers); } else if (tbl === 'licenses') { licenseCurrentPage = p; renderTableLicenses(currentFilteredLicenses); } return; }

        const sortHeader = t.closest('.sortable-header');
        if (sortHeader) { const col = sortHeader.dataset.sort, tbl = sortHeader.closest('table').id; let sObj = tbl === 'assetTable' ? assetSort : (tbl === 'userTable' ? userSort : licenseSort); if (sObj.column === col) sObj.direction = sObj.direction === 'asc' ? 'desc' : 'asc'; else { sObj.column = col; sObj.direction = 'asc'; } if (tbl === 'assetTable') applyAssetFilters(); else if (tbl === 'userTable') applyUserFilters(); else applyLicenseFilters(); return; }

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
        if (t.closest('#addLicenseBtn')) { document.getElementById('licenseForm').reset(); document.getElementById('modal_licenseId').value = ''; document.getElementById('licenseModalTitle').textContent = 'Thêm License mới'; initAllUserDropdowns(); openModal('licenseModal'); return; }
        if (t.closest('#addUserBtn')) { safeCloseModal('addUserModal'); updateDropdowns(); openModal('addUserModal'); return; }

        if (t.closest('#exportExcelBtn')) { const data = currentFilteredAssets.map(a => ({ "Tên": a.name, "Cấu hình": a.config, "Loại": a.category, "Vị trí": a.location, "Người dùng": a.user, "Trạng thái": a.status, "Ghi chú": a.notes })); exportToExcel(data, 'Assets.xlsx'); return; }
        if (t.closest('#exportLicenseBtn')) { const data = currentFilteredLicenses.map(l => ({ "Loại Key": l.key_type, "Mã Key": l.license_key, "Gói": l.package_type, "Hạn SD": l.expiration_date, "Người dùng": l.user, "Trạng thái": l.status, "Ghi chú": l.notes })); exportToExcel(data, 'Licenses.xlsx'); return; }
        if (t.closest('#exportUsersBtn')) { const data = currentFilteredUsers.map(u => ({ "Tên": u.name, "Email": u.email, "Phòng ban": u.department, "Trạng thái": u.status })); exportToExcel(data, 'Users.xlsx'); return; }

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

            if (action === 'delete-asset') showConfirmationModal("Xóa tài sản này?", async () => { const { error } = await supabaseClient.from('assets').delete().eq('id', id); if (error) handleSupabaseError(error, 'xóa'); else { await refreshApp(); } });
            else if (action === 'edit-asset') { const item = assets.find(a => a.id === id); if (item) { document.getElementById('modal_assetId').value = item.id;['modal_assetName', 'modal_assetConfig', 'modal_assetLocation', 'modal_assetStatus', 'modal_assetNotes'].forEach(k => document.getElementById(k).value = item[k.replace('modal_asset', '').toLowerCase()] || ''); updateDropdowns(); document.getElementById('modal_assetCategory').value = categories.find(c => c.name === item.category)?.id || ''; document.getElementById('modalTitle').textContent = 'Sửa tài sản'; initAllUserDropdowns(item.user); openModal('assetModal'); } }
            else if (action === 'checkout-asset') { tempId = id; document.getElementById('assignAssetName').textContent = assets.find(a => a.id === id)?.name; initAllUserDropdowns(); openModal('checkOutModal'); }
            else if (action === 'checkin-asset') {
                const assetToCheckIn = assets.find(a => a.id === id);
                const fromUser = assetToCheckIn?.user || 'Không rõ';
                showConfirmationModal(`Thu hồi tài sản từ ${fromUser}?`, async () => {
                    await supabaseClient.from('assets').update({ status: 'Stock', user_id: null }).eq('id', id);
                    // SỬA LỖI: Thêm tên người dùng vào log để lịch sử chi tiết hơn
                    await addLog(id, 'ASSET', 'Thu hồi', `Từ người dùng: ${fromUser}`);
                    await refreshApp();
                });
            }
            else if (action === 'transfer') { tempId = id; document.getElementById('transferAssetName').textContent = assets.find(a => a.id === id)?.name; document.getElementById('transferCurrentUser').value = assets.find(a => a.id === id)?.user || 'Chưa có'; initAllUserDropdowns(); openModal('transferModal'); }
            else if (action === 'history-asset') {
                const item = assets.find(a => a.id === id);
                document.getElementById('historyModalTitle').textContent = `Lịch sử tài sản: ${item?.name}`;
                const logs = assetHistory.filter(l => l.assetId === id);
                document.getElementById('historyTableBody').innerHTML = logs.length
                    ? logs.map(l => `<tr class="border-b hover:bg-slate-50"><td class="p-3">${l.time}</td><td class="p-3">${l.assetName}</td><td class="p-3 font-bold">${l.action}</td><td class="p-3">${l.desc}</td></tr>`).join('')
                    : '<tr><td colspan="4" class="p-4 text-center">Không có lịch sử</td></tr>';
                openModal('historyModal');
            }
            else if (action === 'delete-license') showConfirmationModal("Xóa License?", async () => { const { error } = await supabaseClient.from('licenses').delete().eq('id', id); if (error) handleSupabaseError(error, 'xóa'); else { await refreshApp(); } });
            else if (action === 'edit-license') { const item = licenses.find(l => l.id === id); if (item) { document.getElementById('modal_licenseId').value = item.id;['modal_licenseKey', 'modal_packageType', 'modal_expirationDate', 'modal_licenseStatus', 'modal_licenseNotes'].forEach(k => { let val = item[k.replace('modal_', '').replace('expirationDate', 'expiration_date').replace('licenseKey', 'license_key').replace('packageType', 'package_type').replace('licenseStatus', 'status').replace('licenseNotes', 'notes')]; document.getElementById(k).value = val || ''; }); updateDropdowns(); document.getElementById('modal_licenseType').value = item.key_type; document.getElementById('licenseModalTitle').textContent = 'Sửa License'; initAllUserDropdowns(item.user); openModal('licenseModal'); } }
            else if (action === 'checkout-license') { tempId = id; document.getElementById('assignLicenseName').textContent = licenses.find(l => l.id === id)?.key_type; initAllUserDropdowns(); openModal('checkOutLicenseModal'); }
            else if (action === 'checkin-license') {
                const licenseToCheckIn = licenses.find(l => l.id === id);
                const fromUser = licenseToCheckIn?.user || 'Không rõ';
                showConfirmationModal(`Thu hồi license từ ${fromUser}?`, async () => {
                    await supabaseClient.from('licenses').update({ status: 'Stock', user_id: null }).eq('id', id);
                    await addLog(id, 'LICENSE', 'Thu hồi', `Từ người dùng: ${fromUser}`);
                    await refreshApp();
                });
            }

            else if (action === 'delete-user') { if (assets.some(a => a.user_id === id) || licenses.some(l => l.user_id === id)) return showInfoModal("Không thể xóa user đang giữ tài sản/license!"); showConfirmationModal("Xóa nhân viên?", async () => { await supabaseClient.from('users').delete().eq('id', id); await refreshApp(); }); }
            else if (action === 'edit-user') { const u = users.find(x => x.id === id); if (u) { document.getElementById('userId').value = u.id; document.getElementById('name').value = u.name; document.getElementById('email').value = u.email; document.getElementById('status').value = u.status; updateDropdowns(); document.getElementById('department').value = departments.find(d => d.name === u.department)?.id || ''; openModal('addUserModal'); } }

            else if (action === 'delete-cat') showConfirmationModal("Xóa danh mục?", async () => { await supabaseClient.from('categories').delete().eq('id', id); await refreshApp(); renderLists(); });
            else if (action === 'edit-cat') { document.getElementById('categoryName').value = actionBtn.dataset.name; document.getElementById('categoryOldName').value = id; document.getElementById('btnCancelCategoryEdit').classList.remove('hidden'); document.getElementById('categoryName').focus(); }
            else if (action === 'delete-dept') showConfirmationModal("Xóa phòng ban?", async () => { await supabaseClient.from('departments').delete().eq('id', id); await refreshApp(); renderLists(); });
            else if (action === 'edit-dept') { document.getElementById('deptName').value = actionBtn.dataset.name; document.getElementById('deptId').value = id; document.getElementById('cancelDeptEdit').classList.remove('hidden'); }
            else if (action === 'delete-lic-type') showConfirmationModal("Xóa loại key?", async () => { await supabaseClient.from('license_types').delete().eq('id', id); await refreshApp(); renderLists(); });
            else if (action === 'edit-lic-type') { document.getElementById('licenseTypeName').value = actionBtn.dataset.name; document.getElementById('licenseTypeId').value = id; document.getElementById('btnCancelLicenseTypeEdit').classList.remove('hidden'); }
        }
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
                showInfoModal("Chuyển đổi thành công!");
                safeCloseModal('transferLicenseModal');
                await refreshApp();

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
            } else {
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
    // Form Submits
    // =================================================================
    // 8. SETTINGS PAGE LOGIC
    // =================================================================
    function renderSettingsPage() {
        if (!document.getElementById('settingsContent') || !currentUserProfile) return;

        // 1. Populate Profile Card
        document.getElementById('profile-name').textContent = currentUserProfile.full_name || 'Chưa có tên';
        document.getElementById('profile-email').textContent = currentUserProfile.email;
        document.getElementById('profile-role').textContent = currentUserProfile.role;
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
    }

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

        const { error } = await supabaseClient
            .from('profiles')
            .update({ full_name: newName, avatar_url: newAvatar })
            .eq('id', currentUserProfile.id);

        if (error) {
            handleSupabaseError(error, 'cập nhật profile');
        } else {
            showInfoModal('Cập nhật profile thành công!');
            safeCloseModal('editProfileModal');
            await refreshApp(); // Refresh để cập nhật lại thông tin
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

        const { error } = await supabase_auth_client.auth.updateUser({ password: newPassword });

        if (error) {
            handleSupabaseError(error, 'cập nhật mật khẩu');
        } else {
            showInfoModal('Cập nhật mật khẩu thành công!');
            e.target.reset();
        }
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

    document.getElementById('assetForm')?.addEventListener('submit', (e) => handleFormSubmit(e, 'assets', () => ({
        id: document.getElementById('modal_assetId').value, name: document.getElementById('modal_assetName').value, config: document.getElementById('modal_assetConfig').value, location: document.getElementById('modal_assetLocation').value, status: document.getElementById('modal_assetStatus').value, notes: document.getElementById('modal_assetNotes').value, category_id: parseInt(document.getElementById('modal_assetCategory').value), user_id: users.find(u => u.name === userChoicesInstance?.getValue(true))?.id || null
    }), 'assetModal', (data) => addLog(data.id, 'ASSET', 'Thêm mới', 'Nhập kho')));

    document.getElementById('licenseForm')?.addEventListener('submit', (e) => handleFormSubmit(e, 'licenses', () => ({
        id: document.getElementById('modal_licenseId').value, key_type: document.getElementById('modal_licenseType').value, license_key: document.getElementById('modal_licenseKey').value, package_type: document.getElementById('modal_packageType').value, expiration_date: document.getElementById('modal_expirationDate').value || null, status: document.getElementById('modal_licenseStatus').value, notes: document.getElementById('modal_licenseNotes').value, user_id: users.find(u => u.name === licenseUserChoicesInstance?.getValue(true))?.id || null
    }), 'licenseModal', (data) => addLog(data.id, 'LICENSE', 'Thêm mới', 'Nhập kho')));

    document.getElementById('userForm')?.addEventListener('submit', (e) => handleFormSubmit(e, 'users', () => ({
        id: document.getElementById('userId').value, name: document.getElementById('name').value, email: document.getElementById('email').value, department_id: document.getElementById('department').value || null, status: document.getElementById('status').value, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('name').value)}`
    }), 'addUserModal'));

    document.getElementById('categoryForm')?.addEventListener('submit', (e) => handleFormSubmit(e, 'categories', () => ({ id: document.getElementById('categoryOldName').value, name: document.getElementById('categoryName').value }), 'categoryModal', renderLists));
    document.getElementById('departmentForm')?.addEventListener('submit', (e) => handleFormSubmit(e, 'departments', () => ({ id: document.getElementById('deptId').value, name: document.getElementById('deptName').value }), 'departmentManagementModal', renderLists));
    document.getElementById('licenseTypeForm')?.addEventListener('submit', (e) => handleFormSubmit(e, 'license_types', () => ({ id: document.getElementById('licenseTypeId').value, name: document.getElementById('licenseTypeName').value }), 'licenseTypeModal', renderLists));

    document.getElementById('btnConfirmAssign')?.addEventListener('click', async () => { const u = users.find(u => u.name === assignUserChoicesInstance.getValue(true)); if (!u) return showInfoModal("Chọn người nhận"); await supabaseClient.from('assets').update({ user_id: u.id, status: 'Active' }).eq('id', tempId); addLog(tempId, 'ASSET', 'Cấp phát', u.name); safeCloseModal('checkOutModal'); await refreshApp(); });
    document.getElementById('btnConfirmAssignLicense')?.addEventListener('click', async () => { const u = users.find(u => u.name === licenseAssignUserChoicesInstance.getValue(true)); if (!u) return showInfoModal("Chọn người nhận"); await supabaseClient.from('licenses').update({ user_id: u.id, status: 'Active' }).eq('id', tempId); addLog(tempId, 'LICENSE', 'Cấp phát', u.name); safeCloseModal('checkOutLicenseModal'); await refreshApp(); });
    document.getElementById('btnConfirmTransfer')?.addEventListener('click', async () => { const u = users.find(u => u.name === (transferUserChoicesInstance ? transferUserChoicesInstance.getValue(true) : document.getElementById('transferNewUserSelect').value)); if (!u) return showInfoModal("Chọn người nhận"); const { error } = await supabaseClient.from('assets').update({ user_id: u.id, status: 'Active' }).eq('id', tempId); if (error) handleSupabaseError(error); else { addLog(tempId, 'ASSET', 'Điều chuyển', u.name); safeCloseModal('transferModal'); await refreshApp(); } });

    async function refreshApp() {
        await fetchAllData();
        updateDropdowns();
        if (document.getElementById('assetTableBody')) applyAssetFilters();
        if (document.getElementById('licenseTableBody')) applyLicenseFilters();
        if (document.getElementById('userTableBody')) applyUserFilters();
        applyRoleBasedUI(); // [PHÂN QUYỀN] Áp dụng các thay đổi giao diện dựa trên vai trò
        updateHeaderUserInfo(); // Cập nhật thông tin user trên header
        if (document.getElementById('settingsContent')) renderSettingsPage(); // [SỬA LỖI] Gọi hàm render cho trang Cài đặt ở cuối để đảm bảo có đủ dữ liệu
        checkAndDisplayNotifications(); // [KHÔI PHỤC] Kiểm tra và hiển thị thông báo
        updateDashboard();
    }

    refreshApp();
});