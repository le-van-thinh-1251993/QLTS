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
                { href: 'maintenance.html', icon: 'fa-solid fa-wrench', label: 'Lịch bảo trì' },
                { href: 'stock-checks.html', icon: 'fa-solid fa-clipboard-check', label: 'Đợt kiểm kê' }
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
            const secDiv = document.createElement('div');
            secDiv.className = 'space-y-1';

            if (section.title) {
                const titleEl = document.createElement('div');
                titleEl.className = 'px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none';
                titleEl.textContent = section.title;
                secDiv.appendChild(titleEl);
            }

            section.items.forEach(function (item) {
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
            });
        } else {
            renderSidebar();
            initSidebarToggle();
        }

        // Lắng nghe hashchange để cập nhật active indicator khi click giữa các mục anchor
        window.addEventListener('hashchange', function () {
            renderSidebar();
        });
    }

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
