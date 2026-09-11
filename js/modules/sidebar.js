// =================================================================
// sidebar.js — Sidebar Component dùng chung cho tất cả các trang
// Render sidebar menu phân nhóm nghiệp vụ từ cấu hình JS, tự detect
// trang hiện tại & hash điều hướng. Đồng bộ toàn bộ ứng dụng.
// =================================================================

(function () {
    'use strict';

    // Cấu trúc phân nhóm menu theo quy trình nghiệp vụ (Giai đoạn 2)
    const MENU_SECTIONS = [
        {
            title: 'Tổng quan',
            items: [
                { href: 'index.html', icon: 'fa-solid fa-chart-pie', label: 'Dashboard' }
            ]
        },
        {
            title: 'Quản lý tài sản',
            items: [
                { href: 'assets.html', icon: 'fa-solid fa-boxes-stacked', label: 'Kho tài sản' },
                { href: 'licenses.html', icon: 'fa-solid fa-key', label: 'Quản lý License' },
                { href: 'users.html', icon: 'fa-solid fa-users', label: 'Nhân sự & Người dùng' },
                { href: 'seating.html', icon: 'fa-solid fa-map-location-dot', label: 'Sơ đồ vị trí' }
            ]
        },
        {
            title: 'Vận hành',
            items: [
                { href: 'assignments.html', icon: 'fa-solid fa-hand-holding-hand', label: 'Cấp phát tài sản' },
                { href: 'inventory.html', icon: 'fa-solid fa-boxes-packing', label: 'Kho vật tư & Linh kiện' },
                { href: 'maintenance.html', icon: 'fa-solid fa-wrench', label: 'Lịch bảo trì' },
                { href: 'stock-checks.html', icon: 'fa-solid fa-clipboard-check', label: 'Đợt kiểm kê' },
                { href: 'contracts.html', icon: 'fa-solid fa-file-contract', label: 'Hợp đồng & SLA' }
            ]
        },
        {
            title: 'Hạ tầng & Kết nối',
            items: [
                { href: 'network.html', icon: 'fa-solid fa-network-wired', label: 'Hạ tầng & Mạng' }
            ]
        },
        {
            title: 'Báo cáo & Phân tích',
            items: [
                { href: 'reports.html', icon: 'fa-solid fa-chart-line', label: 'Báo cáo tập trung' }
            ]
        },
        {
            title: 'Hệ thống',
            items: [
                { href: 'settings.html', icon: 'fa-solid fa-gear', label: 'Cài đặt & Nhật ký' }
            ]
        }
    ];

    // Mảng phẳng phục vụ tương thích ngược nếu có module khác đọc MENU_ITEMS
    const MENU_ITEMS = MENU_SECTIONS.flatMap(sec => sec.items);

    /**
     * Detect thông tin trang hiện tại dựa trên pathname và hash.
     * Trả về { page: 'maintenance.html', hash: '' }.
     */
    function getCurrentPageInfo() {
        try {
            const path = decodeURIComponent(window.location.pathname || '');
            const filename = (path.split(/[\\/]/).pop() || '').toLowerCase();
            const page = (!filename || filename === '/') ? 'index.html' : filename;
            const hash = (window.location.hash || '').toLowerCase();
            return { page: page, hash: hash };
        } catch (e) {
            return { page: 'index.html', hash: '' };
        }
    }

    /**
     * Kiểm tra một mục menu có đang được chọn (Active) hay không.
     */
    function isItemActive(item, current) {
        const itemHref = (item.href || '').toLowerCase();
        const itemFile = itemHref.split('#')[0];

        // Khớp trang trực tiếp
        if (current.page === itemFile) {
            return true;
        }

        // Tương thích ngược nếu người dùng mở URL cũ assets.html#maintenance / #stock-check
        if (current.page === 'assets.html') {
            if (itemFile === 'maintenance.html' && current.hash === '#maintenance') return true;
            if (itemFile === 'stock-checks.html' && (current.hash === '#stock-check' || current.hash === '#stock')) return true;
        }

        return false;
    }

    /**
     * Render nội dung sidebar vào thẻ <aside id="sidebar">.
     */
    function renderSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            console.warn('sidebar.js: Không tìm thấy #sidebar element');
            return;
        }

        const current = getCurrentPageInfo();

        // --- Logo header ---
        const logoDiv = document.createElement('div');
        logoDiv.className = 'h-16 flex items-center px-5 border-b border-slate-700 select-none';
        logoDiv.innerHTML = `
            <a href="index.html" class="flex items-center gap-3 group">
                <div class="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/30 transition-all">
                    <i class="fa-solid fa-cubes-stacked text-lg"></i>
                </div>
                <div>
                    <h1 class="text-base font-bold text-white tracking-wide leading-none">IT-AMS</h1>
                    <span class="text-[10px] text-slate-400 leading-none">Asset Management</span>
                </div>
            </a>
        `;

        // --- Nav sections ---
        const nav = document.createElement('nav');
        nav.className = 'flex-1 px-3 py-3 space-y-4 overflow-y-auto max-h-[calc(100vh-4.5rem)] pb-8';

        MENU_SECTIONS.forEach(function (section) {
            // Lọc các mục menu được phép truy cập theo RBAC (nếu RBAC bật)
            const allowedItems = section.items.filter(item => {
                if (window.RBAC && typeof window.RBAC.canAccessModule === 'function') {
                    return window.RBAC.canAccessModule(item.href);
                }
                return true;
            });

            if (allowedItems.length === 0) return;

            const secDiv = document.createElement('div');
            secDiv.className = 'space-y-1';

            if (section.title) {
                const titleEl = document.createElement('div');
                titleEl.className = 'px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none';
                titleEl.textContent = section.title;
                secDiv.appendChild(titleEl);
            }

            allowedItems.forEach(function (item) {
                const a = document.createElement('a');
                a.href = item.href;

                const isActive = isItemActive(item, current);

                a.className = 'nav-link flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-150 group ' +
                    (isActive
                        ? 'text-white bg-slate-700 font-semibold border-l-4 border-blue-400 pl-2 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-700/60 hover:text-white');

                // Icon cố định chiều rộng w-5 để căn lề thẳng hàng
                const icon = document.createElement('i');
                icon.className = item.icon + ' w-5 text-center text-sm transition-colors ' +
                    (isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200');

                // Label
                const span = document.createElement('span');
                span.className = 'ml-3 font-medium flex-1 truncate';
                span.textContent = item.label;

                a.appendChild(icon);
                a.appendChild(span);

                // Tự động đóng sidebar trên mobile khi người dùng click vào link
                a.addEventListener('click', function () {
                    const sb = document.getElementById('sidebar');
                    const backdrop = document.getElementById('sidebar-backdrop');
                    if (sb && !sb.classList.contains('-translate-x-full') && window.innerWidth < 1024) {
                        sb.classList.add('-translate-x-full');
                        if (backdrop) backdrop.classList.add('hidden');
                    }
                });

                secDiv.appendChild(a);
            });

            nav.appendChild(secDiv);
        });

        // Clear và inject
        sidebar.innerHTML = '';
        sidebar.appendChild(logoDiv);
        sidebar.appendChild(nav);
    }

    /**
     * Gắn event toggle sidebar cho mobile (hamburger button + backdrop).
     */
    function initSidebarToggle() {
        const hamburgerButton = document.getElementById('hamburger-button');
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebar-backdrop');

        var toggleSidebar = function () {
            if (sidebar && sidebarBackdrop) {
                sidebar.classList.toggle('-translate-x-full');
                sidebarBackdrop.classList.toggle('hidden');
            }
        };

        if (hamburgerButton && !hamburgerButton._hasSidebarToggle) {
            hamburgerButton._hasSidebarToggle = true;
            hamburgerButton.addEventListener('click', toggleSidebar);
        }

        if (sidebarBackdrop && !sidebarBackdrop._hasSidebarToggle) {
            sidebarBackdrop._hasSidebarToggle = true;
            sidebarBackdrop.addEventListener('click', toggleSidebar);
        }
    }

    /**
     * Khởi tạo sidebar: render + gắn events.
     */
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                renderSidebar();
                initSidebarToggle();
                updateHeaderUserInfo();
                updateHeaderNotifications();
                initHeaderEvents();
            });
        } else {
            renderSidebar();
            initSidebarToggle();
            updateHeaderUserInfo();
            updateHeaderNotifications();
            initHeaderEvents();
        }

        // Lắng nghe hashchange để cập nhật active indicator khi click giữa các mục anchor
        window.addEventListener('hashchange', function () {
            renderSidebar();
        });
    }

    
    // =================================================================
    // UNIFIED HEADER CONTROLLER & NOTIFICATIONS
    // Quản lý đồng bộ Tìm kiếm, Dark mode, Thông báo và User profile
    // trên thanh menu ngang ở tất cả các trang.
    // =================================================================

    function getStorageJson(key, fallback = []) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    /**
     * Cập nhật thông tin User trên Header
     */
    function updateHeaderUserInfo() {
        const savedProfile = getStorageJson('qlts_current_user_profile', null);
        const profile = window.currentUserProfile || savedProfile || {
            full_name: 'Quản trị viên IT',
            email: 'admin@newdaymedia.com',
            role: 'admin'
        };

        const name = profile.full_name || 'Quản trị viên';
        const email = profile.email || 'admin@newdaymedia.com';
        const role = (window.RBAC && typeof window.RBAC.getRoleLabel === 'function')
            ? window.RBAC.getRoleLabel(profile.role)
            : (profile.role === 'admin' ? 'Admin IT' : (profile.role || 'Nhân viên'));
        const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff`;

        // Update elements
        document.querySelectorAll('#header-user-name, #header-dropdown-name').forEach(el => el.textContent = name);
        document.querySelectorAll('#header-user-email').forEach(el => el.textContent = email);
        document.querySelectorAll('#header-user-role').forEach(el => el.textContent = role);
        document.querySelectorAll('#userProfileBtn img, header .group img').forEach(img => {
            if (img.src !== avatar) img.src = avatar;
        });
    }

    /**
     * Thu thập và hiển thị thông báo toàn hệ thống
     */
    function updateHeaderNotifications() {
        const notiList = document.getElementById('notification-list');
        const notiCount = document.getElementById('notification-count');
        const notiBadge = document.getElementById('notification-badge');
        if (!notiList || !notiCount) return;

        const readNotifications = new Set(getStorageJson('readNotifications', []));
        const now = new Date();

        // Đọc cấu hình cảnh báo từ LocalDB (Settings)
        const alertSettingsList = getStorageJson('qlts_alert_settings', []);
        const alertCfg = (Array.isArray(alertSettingsList) ? alertSettingsList[0] : alertSettingsList) || {};
        const warrantyDays = Number(alertCfg.warranty_threshold_days) || 30;
        const licenseDays = Number(alertCfg.license_threshold_days) || 30;
        const globalMinStock = alertCfg.min_stock_threshold !== undefined ? Number(alertCfg.min_stock_threshold) : 5;
        const stockAlertEnabled = alertCfg.stock_alert_enabled !== false;

        const warrantyThresholdDate = new Date(now.getTime() + warrantyDays * 24 * 60 * 60 * 1000);
        const licenseThresholdDate = new Date(now.getTime() + licenseDays * 24 * 60 * 60 * 1000);

        const notifications = [];

        // 1. Tài sản sắp hết hạn bảo hành
        const assets = getStorageJson('qlts_assets', []);
        assets.forEach(a => {
            if (!a.warranty_expiration_date) return;
            const exp = new Date(a.warranty_expiration_date);
            if (exp >= now && exp <= warrantyThresholdDate) {
                const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                notifications.push({
                    id: `asset_${a.id}`,
                    type: 'asset',
                    icon: 'fa-box-archive text-amber-500 bg-amber-50 dark:bg-amber-950/40',
                    title: a.name || 'Tài sản',
                    code: a.code || ('TS-' + a.id),
                    detail: `Hết hạn bảo hành sau ${days > 0 ? days + ' ngày' : 'hôm nay'}`,
                    href: 'assets.html'
                });
            }
        });

        // 2. License phần mềm sắp hết hạn
        const licenses = getStorageJson('qlts_licenses', []);
        licenses.forEach(l => {
            if (!l.expiration_date) return;
            const exp = new Date(l.expiration_date);
            if (exp >= now && exp <= licenseThresholdDate) {
                const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                notifications.push({
                    id: `license_${l.id}`,
                    type: 'license',
                    icon: 'fa-key text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
                    title: l.key_type || l.name || 'License',
                    code: l.user || 'Chưa cấp phát',
                    detail: `Bản quyền hết hạn sau ${days > 0 ? days + ' ngày' : 'hôm nay'}`,
                    href: 'licenses.html'
                });
            }
        });

        // 3. Vật tư & Linh kiện dưới tồn kho an toàn
        if (stockAlertEnabled) {
            const supplies = getStorageJson('qlts_supplies', []);
            supplies.forEach(s => {
                const qty = Number(s.quantity || 0);
                const itemMin = s.min_quantity !== undefined && s.min_quantity !== null && s.min_quantity !== '' ? Number(s.min_quantity) : null;
                const minQty = itemMin !== null && !isNaN(itemMin) ? itemMin : globalMinStock;
                if (qty <= minQty) {
                    notifications.push({
                        id: `supply_${s.id}`,
                        type: 'supply',
                        icon: 'fa-boxes-packing text-rose-500 bg-rose-50 dark:bg-rose-950/40',
                        title: s.name || 'Vật tư',
                        code: s.code || ('VT-' + s.id),
                        detail: qty === 0 ? `Đã hết hàng (0/${minQty} ${s.unit || 'cái'})` : `Tồn kho thấp: ${qty}/${minQty} ${s.unit || 'cái'}`,
                        href: 'inventory.html?filter=low_stock'
                    });
                }
            });
        }

        // 4. Thiết bị mạng offline
        const targets = getStorageJson('qlts_network_targets', []);
        targets.forEach(t => {
            if (t.status === 'Offline') {
                notifications.push({
                    id: `target_${t.id}`,
                    type: 'network',
                    icon: 'fa-network-wired text-red-500 bg-red-50 dark:bg-red-950/40',
                    title: t.name || 'Thiết bị mạng',
                    code: t.address || 'Offline',
                    detail: 'Mất kết nối mạng / Không phản hồi ping',
                    href: 'network.html#tab-ping'
                });
            }
        });

        // Lọc thông báo chưa đọc
        const unreadList = notifications.filter(n => !readNotifications.has(n.id));

        if (unreadList.length > 0) {
            notiCount.textContent = unreadList.length > 99 ? '99+' : unreadList.length;
            notiCount.classList.remove('hidden');
            if (notiBadge) notiBadge.textContent = `${unreadList.length} mới`;

            notiList.innerHTML = unreadList.slice(0, 30).map(n => `
                <li class="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-start gap-2.5 group">
                    <div class="w-7 h-7 rounded-lg ${n.icon} flex items-center justify-center text-xs shrink-0 mt-0.5">
                        <i class="fa-solid ${n.icon.split(' ')[0]}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <a href="${n.href}" class="block">
                            <div class="font-bold text-slate-800 dark:text-white truncate text-xs">${n.title}</div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">${n.detail}</div>
                        </a>
                    </div>
                    <button type="button" data-action="mark-notif-read" data-notif-id="${n.id}" onclick="event.stopPropagation(); window.QLTSHeader.markSingleRead('${n.id}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-1 rounded text-xs transition-opacity" title="Đánh dấu đã đọc">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </li>
            `).join('');
        } else {
            notiCount.classList.add('hidden');
            if (notiBadge) notiBadge.textContent = '0 mới';
            notiList.innerHTML = '<li class="p-6 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5"><i class="fa-regular fa-bell-slash text-base text-slate-300 dark:text-slate-600"></i><span>Không có cảnh báo hoặc thông báo mới.</span></li>';
        }
    }

    /**
     * Khởi tạo các sự kiện Header
     */
    function initHeaderEvents() {
        // 1. Click delegation
        document.addEventListener('click', function (e) {
            // Dark mode toggle
            const themeBtn = e.target.closest('#header-theme-toggle') || e.target.closest('#theme-toggle') || e.target.closest('#themeToggleBtn');
            if (themeBtn) {
                const isDark = document.documentElement.classList.toggle('dark');
                localStorage.setItem('darkMode', isDark ? 'true' : 'false');
                return;
            }

            // Notification dropdown toggle
            const notiBtn = e.target.closest('#notification-button');
            if (notiBtn) {
                const dropdown = document.getElementById('notification-dropdown');
                if (dropdown) dropdown.classList.toggle('hidden');
                return;
            }

            // Click inside notification dropdown on a link -> close dropdown
            if (e.target.closest('#notification-dropdown a')) {
                const dropdown = document.getElementById('notification-dropdown');
                if (dropdown) dropdown.classList.add('hidden');
            }

            // Click outside notification dropdown
            if (!e.target.closest('#notification-dropdown')) {
                const dropdown = document.getElementById('notification-dropdown');
                if (dropdown) dropdown.classList.add('hidden');
            }

            // User profile dropdown toggle
            const userBtn = e.target.closest('#userProfileBtn');
            if (userBtn) {
                const userDropdown = userBtn.closest('.group')?.querySelector('.absolute');
                if (userDropdown) {
                    const isShown = userDropdown.classList.contains('!opacity-100');
                    document.querySelectorAll('header .group .absolute').forEach(d => d.classList.remove('!opacity-100', '!visible', '!pointer-events-auto'));
                    if (!isShown) {
                        userDropdown.classList.add('!opacity-100', '!visible', '!pointer-events-auto');
                    }
                }
                return;
            }

            // Click outside user profile dropdown
            if (!e.target.closest('.group')) {
                document.querySelectorAll('header .group .absolute').forEach(d => {
                    d.classList.remove('!opacity-100', '!visible', '!pointer-events-auto');
                });
            }

            // Mark single notification read (delegated)
            const markBtn = e.target.closest('#notification-list [data-action="mark-notif-read"]') || e.target.closest('#notification-list button[onclick*="markSingleRead"]');
            if (markBtn) {
                e.preventDefault();
                e.stopPropagation();
                const notifId = markBtn.dataset.notifId || (markBtn.getAttribute('onclick') || '').match(/markSingleRead\(['"]([^'"]+)['"]\)/)?.[1];
                if (notifId && window.QLTSHeader) {
                    window.QLTSHeader.markSingleRead(notifId);
                }
                return;
            }

            // Clear all notifications
            const clearNotiBtn = e.target.closest('#clear-read-notifications-btn');
            if (clearNotiBtn) {
                e.preventDefault();
                const notiItems = document.querySelectorAll('#notification-list [data-action="mark-notif-read"], #notification-list button[onclick*="markSingleRead"]');
                const readNotifications = getStorageJson('readNotifications', []);
                // Mark all notifications read
                const assets = getStorageJson('qlts_assets', []);
                const licenses = getStorageJson('qlts_licenses', []);
                const supplies = getStorageJson('qlts_supplies', []);
                const targets = getStorageJson('qlts_network_targets', []);
                const allIds = [
                    ...assets.map(a => 'asset_' + a.id),
                    ...licenses.map(l => 'license_' + l.id),
                    ...supplies.map(s => 'supply_' + s.id),
                    ...targets.map(t => 'target_' + t.id)
                ];
                const updated = Array.from(new Set([...readNotifications, ...allIds]));
                localStorage.setItem('readNotifications', JSON.stringify(updated));
                updateHeaderNotifications();
                return;
            }

            // Global search modal open
            const gsBtn = e.target.closest('#globalSearchBtn') || e.target.closest('#search-button');
            if (gsBtn) {
                const modal = document.getElementById('globalSearchModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                    const inp = document.getElementById('globalSearchInput');
                    if (inp) {
                        inp.value = '';
                        setTimeout(() => inp.focus(), 50);
                    }
                    if (typeof window.renderGlobalSearchResults === 'function') {
                        window.renderGlobalSearchResults('');
                    }
                }
                return;
            }

            // Logout button
            const logoutBtn = e.target.closest('#logout-button');
            if (logoutBtn) {
                e.preventDefault();
                const performLogout = () => {
                    localStorage.removeItem('qlts_current_user_profile');
                    localStorage.removeItem('supabase.auth.token');
                    window.location.href = 'login.html';
                };
                if (typeof window.showConfirmationModal === 'function') {
                    window.showConfirmationModal('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?', performLogout, 'Xác nhận Đăng xuất');
                } else {
                    performLogout();
                }
                return;
            }
        });

        // 2. Global search input live typing inside modal
        const globalSearchInput = document.getElementById('globalSearchInput');
        if (globalSearchInput && !globalSearchInput._hasLiveSearch) {
            globalSearchInput._hasLiveSearch = true;
            globalSearchInput.addEventListener('input', function (e) {
                if (typeof window.renderGlobalSearchResults === 'function') {
                    window.renderGlobalSearchResults(e.target.value.trim());
                }
            });
        }

        // 3. Quick search input in header (#searchInput) - Pressing Enter or typing
        const headerSearchInput = document.getElementById('searchInput');
        if (headerSearchInput && !headerSearchInput._hasHeaderSearch) {
            headerSearchInput._hasHeaderSearch = true;
            headerSearchInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    const val = headerSearchInput.value.trim();
                    if (!val) return;
                    // If current page doesn't have local search handler, open global search modal
                    const modal = document.getElementById('globalSearchModal');
                    if (modal) {
                        modal.classList.remove('hidden');
                        modal.classList.add('flex');
                        const inp = document.getElementById('globalSearchInput');
                        if (inp) {
                            inp.value = val;
                            setTimeout(() => inp.focus(), 50);
                        }
                        if (typeof window.renderGlobalSearchResults === 'function') {
                            window.renderGlobalSearchResults(val);
                        }
                    }
                }
            });
        }

        // 4. Global keyboard shortcuts (/ for quick search, Ctrl+K for global search, Esc to close)
        document.addEventListener('keydown', function (e) {
            // Ctrl+K -> Global Search Modal
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const modal = document.getElementById('globalSearchModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                    const inp = document.getElementById('globalSearchInput');
                    if (inp) {
                        inp.value = '';
                        setTimeout(() => inp.focus(), 50);
                    }
                }
            }
            // "/" -> Focus #searchInput if not already editing a field
            if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                const searchInp = document.getElementById('searchInput');
                if (searchInp) {
                    e.preventDefault();
                    searchInp.focus();
                }
            }
            // Escape -> Close dropdowns and active modal
            if (e.key === 'Escape') {
                const dd = document.getElementById('notification-dropdown');
                if (dd && !dd.classList.contains('hidden')) {
                    dd.classList.add('hidden');
                    return;
                }
                const openModals = getUniversalOpenModals();
                if (openModals.length > 0) {
                    e.preventDefault();
                    closeUniversalModal(openModals[openModals.length - 1]);
                }
            }
        });

        // Universal safe backdrop click handler (mousedown + mouseup matching on backdrop)
        let universalBackdropMouseDownTarget = null;
        document.addEventListener('mousedown', (e) => {
            universalBackdropMouseDownTarget = e.target;
        });
        document.addEventListener('mouseup', (e) => {
            if (!universalBackdropMouseDownTarget) return;
            const target = universalBackdropMouseDownTarget;
            universalBackdropMouseDownTarget = null;
            if (target === e.target) {
                const openModals = getUniversalOpenModals();
                const clickedModal = openModals.find(m => m === target);
                if (clickedModal) {
                    if (['confirmationModal', 'confirmModal', 'dirtyCheckConfirmModal'].includes(clickedModal.id)) {
                        return; // Confirmation modals require explicit action
                    }
                    closeUniversalModal(clickedModal);
                }
            }
        });
    }

    function getUniversalOpenModals() {
        const candidates = Array.from(document.querySelectorAll(
            '.fixed.inset-0:not(.hidden), [role="dialog"]:not(.hidden), [id$="Modal"]:not(.hidden), [id^="modal"]:not(.hidden)'
        )).filter(el => {
            if (el.id === 'sidebar-backdrop' || el.id === 'notification-dropdown') return false;
            try {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            } catch (err) {
                return false;
            }
        });
        candidates.sort((a, b) => {
            const za = parseInt(window.getComputedStyle(a).zIndex, 10) || 0;
            const zb = parseInt(window.getComputedStyle(b).zIndex, 10) || 0;
            if (za !== zb) return za - zb;
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        return candidates;
    }

    function closeUniversalModal(modal) {
        if (!modal) return;
        if (window.QLTSPageContracts && typeof window.QLTSPageContracts.closeModal === 'function' && modal.id.startsWith('contract')) {
            window.QLTSPageContracts.closeModal(modal.id);
            return;
        }
        if (typeof window.safeCloseModal === 'function' && modal.id) {
            window.safeCloseModal(modal.id);
        } else {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            modal.setAttribute('aria-hidden', 'true');
            try { modal.style.pointerEvents = 'none'; } catch (e) {}
        }
        const closeBtn = modal.querySelector('.close-modal, .btn-close-modal, #closeEditModal, .btn-cancel');
        if (closeBtn && !modal.classList.contains('hidden')) {
            closeBtn.click();
        }
        const remaining = getUniversalOpenModals();
        if (remaining.length === 0) {
            document.body.classList.remove('overflow-hidden');
        }
    }

    // Export header controller
    window.QLTSHeader = {
        updateHeaderUserInfo: updateHeaderUserInfo,
        updateHeaderNotifications: updateHeaderNotifications,
        initHeaderEvents: initHeaderEvents,
        markSingleRead: function(id) {
            const readNotifications = getStorageJson('readNotifications', []);
            readNotifications.push(id);
            localStorage.setItem('readNotifications', JSON.stringify(Array.from(new Set(readNotifications))));
            updateHeaderNotifications();
        }
    };

    // Export cho các module khác có thể gọi lại nếu cần
    window.QLTSSidebar = {
        MENU_SECTIONS: MENU_SECTIONS,
        MENU_ITEMS: MENU_ITEMS,
        renderSidebar: renderSidebar,
        initSidebarToggle: initSidebarToggle,
        init: init
    };

    // Auto-init khi script load
    init();
})();
