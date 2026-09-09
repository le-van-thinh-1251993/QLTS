// =================================================================
// sidebar.js — Sidebar Component dùng chung cho tất cả các trang
// Render sidebar menu từ cấu hình JS, tự detect trang hiện tại.
// Tránh copy-paste HTML sidebar trên nhiều file.
// =================================================================

(function () {
    'use strict';

    // Danh sách menu items — thứ tự hiển thị trên sidebar
    // Khi thêm module mới, chỉ cần thêm 1 dòng vào đây.
    const MENU_ITEMS = [
        { href: 'index.html',    icon: 'fa-solid fa-chart-simple',   label: 'Dashboard' },
        { href: 'assets.html',   icon: 'fa-solid fa-boxes-stacked',  label: 'Kho tài sản' },
        { href: 'licenses.html', icon: 'fa-solid fa-key',            label: 'Quản lý License' },
        { href: 'users.html',    icon: 'fa-solid fa-users',          label: 'Người dùng' },
        { href: 'seating.html',  icon: 'fa-solid fa-chair',          label: 'Sơ đồ vị trí' },
        { href: 'settings.html', icon: 'fa-solid fa-gear',           label: 'Cài đặt' }
    ];

    /**
     * Detect trang hiện tại dựa trên pathname.
     * Trả về tên file (vd: 'assets.html', 'index.html').
     */
    function getCurrentPage() {
        try {
            const path = decodeURIComponent(window.location.pathname || '');
            // Tách bằng cả / và \ để hỗ trợ cả web server và file:/// trên Windows
            const filename = path.split(/[\\/]/).pop() || '';
            if (!filename || filename === '/' || filename === '') {
                return 'index.html';
            }
            return filename.toLowerCase();
        } catch (e) {
            return 'index.html';
        }
    }

    /**
     * Render nội dung sidebar vào thẻ <aside id="sidebar">.
     * Giữ nguyên cấu trúc HTML và class CSS đang có.
     */
    function renderSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            console.warn('sidebar.js: Không tìm thấy #sidebar element');
            return;
        }

        const currentPage = getCurrentPage();

        // --- Logo header ---
        const logoDiv = document.createElement('div');
        logoDiv.className = 'h-16 flex items-center justify-center border-b border-slate-700';
        logoDiv.innerHTML = '<i class="fa-solid fa-cubes-stacked mr-3 text-2xl text-blue-400"></i>' +
                            '<h1 class="text-xl font-bold">IT-AMS</h1>';

        // --- Nav links ---
        const nav = document.createElement('nav');
        nav.className = 'flex-1 px-2 space-y-2';

        MENU_ITEMS.forEach(function (item) {
            const a = document.createElement('a');
            a.href = item.href;

            // Detect active: so sánh href với trang hiện tại
            const isActive = (currentPage === item.href.toLowerCase());

            a.className = 'nav-link flex items-center px-4 py-2.5 rounded-lg ' +
                (isActive
                    ? 'text-slate-100 bg-slate-700'
                    : 'text-slate-300 hover:bg-slate-700');

            // Icon
            const icon = document.createElement('i');
            icon.className = item.icon + ' sidebar-icon';

            // Label
            const span = document.createElement('span');
            span.className = 'ml-4';
            span.textContent = item.label;

            a.appendChild(icon);
            a.appendChild(span);
            nav.appendChild(a);
        });

        // Clear và inject
        sidebar.innerHTML = '';
        sidebar.appendChild(logoDiv);
        sidebar.appendChild(nav);
    }

    /**
     * Gắn event toggle sidebar cho mobile (hamburger button + backdrop).
     * Logic lấy từ page-common.js hiện tại.
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

        if (hamburgerButton) {
            hamburgerButton.addEventListener('click', toggleSidebar);
        }

        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener('click', toggleSidebar);
        }
    }

    /**
     * Khởi tạo sidebar: render + gắn events.
     * Gọi ngay khi script load (sync), không cần DOMContentLoaded
     * vì script này đặt ở cuối body, sau thẻ <aside>.
     */
    function init() {
        // Nếu DOM chưa sẵn sàng (ít xảy ra vì script ở cuối body),
        // đợi DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                renderSidebar();
                initSidebarToggle();
            });
        } else {
            renderSidebar();
            initSidebarToggle();
        }
    }

    // Export cho các module khác có thể gọi lại nếu cần
    window.QLTSSidebar = {
        MENU_ITEMS: MENU_ITEMS,
        renderSidebar: renderSidebar,
        initSidebarToggle: initSidebarToggle,
        init: init
    };

    // Auto-init khi script load
    init();
})();
