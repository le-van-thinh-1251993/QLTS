/**
 * QLTS - Hệ thống Phân Quyền Nâng Cao (Role-Based Access Control - RBAC)
 * Thiết kế phân cấp quyền hạn chi tiết cho các vai trò trong hệ thống quản lý tài sản CNTT.
 * Mặc định: enabled = false (môi trường local chạy không giới hạn), sẵn sàng kích hoạt khi release.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.QLTSRBAC = factory();
        root.RBAC = root.QLTSRBAC;
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // 1. ĐỊNH NGHĨA CÁC VAI TRÒ TRONG HỆ THỐNG
    const ROLES = {
        ADMIN: 'admin',                         // Quản trị viên tối cao
        IT_TECH: 'it_tech',                     // Kỹ thuật viên CNTT
        INVENTORY_MANAGER: 'inventory_manager', // Quản lý kho & Vật tư linh kiện
        STAFF: 'staff'                          // Nhân viên thông thường (End User)
    };

    const ROLE_LABELS = {
        [ROLES.ADMIN]: { title: 'Quản trị viên Hệ thống', badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
        [ROLES.IT_TECH]: { title: 'Kỹ thuật viên CNTT', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
        [ROLES.INVENTORY_MANAGER]: { title: 'Quản lý Kho & Vật tư', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
        [ROLES.STAFF]: { title: 'Nhân viên sử dụng', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
    };

    // 2. MA TRẬN QUYỀN HẠN CHI TIẾT (PERMISSION MATRIX)
    const PERMISSIONS = {
        // Tài sản & Thiết bị
        'assets:view': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER, ROLES.STAFF],
        'assets:create': [ROLES.ADMIN, ROLES.IT_TECH],
        'assets:edit': [ROLES.ADMIN, ROLES.IT_TECH],
        'assets:delete': [ROLES.ADMIN],
        'assets:export': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'assets:import': [ROLES.ADMIN],

        // Bản quyền License
        'licenses:view': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.STAFF],
        'licenses:create': [ROLES.ADMIN, ROLES.IT_TECH],
        'licenses:edit': [ROLES.ADMIN, ROLES.IT_TECH],
        'licenses:delete': [ROLES.ADMIN],
        'licenses:export': [ROLES.ADMIN, ROLES.IT_TECH],

        // Kho vật tư & Linh kiện
        'inventory:view': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'inventory:stock_in': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.IT_TECH],
        'inventory:stock_out': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.IT_TECH],
        'inventory:adjust': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
        'inventory:create': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
        'inventory:edit': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
        'inventory:delete': [ROLES.ADMIN],
        'inventory:print_label': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.IT_TECH],
        'inventory:export': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER],

        // Bàn giao & Cấp phát
        'assignments:view': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER, ROLES.STAFF],
        'assignments:create': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'assignments:revoke': [ROLES.ADMIN, ROLES.IT_TECH],
        'assignments:print_receipt': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER, ROLES.STAFF],

        // Bảo trì & Sửa chữa
        'maintenance:view': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.STAFF],
        'maintenance:create': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.STAFF],
        'maintenance:update': [ROLES.ADMIN, ROLES.IT_TECH],
        'maintenance:reopen': [ROLES.ADMIN],

        // Kiểm kê tài sản
        'stock_checks:view': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'stock_checks:create': [ROLES.ADMIN, ROLES.IT_TECH],
        'stock_checks:audit': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'stock_checks:reopen': [ROLES.ADMIN],

        // Hạ tầng Mạng
        'network:view': [ROLES.ADMIN, ROLES.IT_TECH],
        'network:edit': [ROLES.ADMIN, ROLES.IT_TECH],
        'network:secret_view': [ROLES.ADMIN],
        'network:export': [ROLES.ADMIN, ROLES.IT_TECH],

        // Báo cáo
        'reports:view': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'reports:export_excel': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'reports:print_official': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],

        // Sơ đồ chỗ ngồi
        'seating:view': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER, ROLES.STAFF],
        'seating:edit': [ROLES.ADMIN, ROLES.IT_TECH],

        // Người dùng & Phòng ban
        'users:view': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'users:manage': [ROLES.ADMIN],

        // Cài đặt hệ thống & Sao lưu
        'settings:view': [ROLES.ADMIN, ROLES.IT_TECH],
        'settings:manage': [ROLES.ADMIN],
        'settings:backup_restore': [ROLES.ADMIN]
    };

    // QUYỀN TRUY CẬP TRANG / MENU THEO MODULE
    const MODULE_ACCESS = {
        'index.html': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER, ROLES.STAFF],
        'assets.html': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER, ROLES.STAFF],
        'licenses.html': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.STAFF],
        'inventory.html': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'assignments.html': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER, ROLES.STAFF],
        'maintenance.html': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.STAFF],
        'stock-checks.html': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'network.html': [ROLES.ADMIN, ROLES.IT_TECH],
        'reports.html': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER],
        'seating.html': [ROLES.ADMIN, ROLES.IT_TECH, ROLES.INVENTORY_MANAGER, ROLES.STAFF],
        'users.html': [ROLES.ADMIN],
        'settings.html': [ROLES.ADMIN, ROLES.IT_TECH]
    };

    // 3. CẤU HÌNH & TRẠNG THÁI (FEATURE FLAG)
    // Mặc định enabled = false để khi dùng local không bị hạn chế bất kỳ tính năng nào.
    let config = {
        enabled: false,
        activeRole: ROLES.ADMIN,
        defaultRole: ROLES.ADMIN
    };

    // Khởi tạo từ localStorage nếu có
    try {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('qlts_rbac_config');
            if (saved) {
                config = Object.assign(config, JSON.parse(saved));
            }
        }
    } catch (e) {
        console.warn('RBAC: Không thể đọc cấu hình từ localStorage', e);
    }

    function saveConfig() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('qlts_rbac_config', JSON.stringify(config));
            }
        } catch (e) {}
    }

    // 4. API DỊCH VỤ PHÂN QUYỀN
    return {
        ROLES,
        ROLE_LABELS,
        PERMISSIONS,
        MODULE_ACCESS,

        isEnabled() {
            return !!config.enabled;
        },

        enable() {
            config.enabled = true;
            saveConfig();
            this.applyRoleUI();
            console.log('RBAC: Đã BẬT hệ thống kiểm soát phân quyền (Active role:', config.activeRole, ')');
            return true;
        },

        disable() {
            config.enabled = false;
            saveConfig();
            this.applyRoleUI();
            console.log('RBAC: Đã TẮT phân quyền (Môi trường phát triển Local cho phép toàn quyền)');
            return true;
        },

        toggle() {
            return config.enabled ? this.disable() : this.enable();
        },

        getCurrentRole() {
            if (typeof window !== 'undefined' && window.currentUserProfile && window.currentUserProfile.role) {
                return window.currentUserProfile.role;
            }
            return config.activeRole || ROLES.ADMIN;
        },

        setCurrentRole(role) {
            if (!Object.values(ROLES).includes(role)) {
                console.warn('RBAC: Vai trò không hợp lệ:', role);
                return false;
            }
            config.activeRole = role;
            if (typeof window !== 'undefined' && window.currentUserProfile) {
                window.currentUserProfile.role = role;
            }
            saveConfig();
            this.applyRoleUI(role);
            return true;
        },

        getRoleLabel(role) {
            const r = role || this.getCurrentRole();
            return (ROLE_LABELS[r] || {}).title || r;
        },

        getRoleBadge(role) {
            const r = role || this.getCurrentRole();
            const info = ROLE_LABELS[r] || { title: r, badgeClass: 'bg-slate-100 text-slate-700' };
            return `<span class="px-2 py-0.5 rounded text-xs font-semibold ${info.badgeClass}">${info.title}</span>`;
        },

        /**
         * Kiểm tra người dùng có quyền cụ thể hay không.
         * Khi enabled = false, luôn trả về true.
         */
        hasPermission(permission, role) {
            if (!config.enabled) return true; // Khi chưa bật, cấp quyền toàn bộ
            const r = role || this.getCurrentRole();
            if (r === ROLES.ADMIN) return true;

            const allowed = PERMISSIONS[permission];
            if (!allowed) return false;
            return allowed.includes(r);
        },

        /**
         * Kiểm tra vai trò có quyền truy cập vào module/trang HTML không
         */
        canAccessModule(moduleName, role) {
            if (!config.enabled) return true;
            const r = role || this.getCurrentRole();
            if (r === ROLES.ADMIN) return true;

            const cleanName = moduleName.replace(/^[/\\]+/, '').split('?')[0].split('#')[0];
            const allowed = MODULE_ACCESS[cleanName];
            if (!allowed) return true; // Không có quy định ngặt nghèo thì cho phép
            return allowed.includes(r);
        },

        /**
         * Tự động áp dụng phân quyền lên giao diện:
         * - Ẩn/hiển thị phần tử có [data-rbac-permission]
         * - Ẩn/hiển thị phần tử có [data-rbac-role]
         */
        applyRoleUI(role) {
            if (typeof document === 'undefined') return;
            const currentRole = role || this.getCurrentRole();

            // Nếu RBAC tắt: hiện lại tất cả các nút/menu bị ẩn
            if (!config.enabled) {
                document.querySelectorAll('[data-rbac-hidden="true"]').forEach(el => {
                    el.style.display = '';
                    el.removeAttribute('data-rbac-hidden');
                });
                return;
            }

            // Quét theo data-rbac-permission
            document.querySelectorAll('[data-rbac-permission]').forEach(el => {
                const perm = el.getAttribute('data-rbac-permission');
                if (!this.hasPermission(perm, currentRole)) {
                    el.style.display = 'none';
                    el.setAttribute('data-rbac-hidden', 'true');
                } else if (el.getAttribute('data-rbac-hidden') === 'true') {
                    el.style.display = '';
                    el.removeAttribute('data-rbac-hidden');
                }
            });

            // Quét theo data-rbac-role
            document.querySelectorAll('[data-rbac-role]').forEach(el => {
                const requiredRoles = el.getAttribute('data-rbac-role').split(',').map(s => s.trim());
                if (!requiredRoles.includes(currentRole) && currentRole !== ROLES.ADMIN) {
                    el.style.display = 'none';
                    el.setAttribute('data-rbac-hidden', 'true');
                } else if (el.getAttribute('data-rbac-hidden') === 'true') {
                    el.style.display = '';
                    el.removeAttribute('data-rbac-hidden');
                }
            });
        }
    };
}));
