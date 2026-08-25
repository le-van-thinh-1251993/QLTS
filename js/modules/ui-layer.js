(function () {
    'use strict';

    const safeCloseModal = (id) => {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.setAttribute('aria-hidden', 'true');
        modal.style.pointerEvents = 'none';
    };

    const attemptCloseModal = (id) => safeCloseModal(id);

    const showConfirmationModal = (message, callback, title = 'Xác nhận') => {
        const titleEl = document.getElementById('confirmationModalTitle');
        const msgEl = document.getElementById('confirmationModalMessage');
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        window.confirmCallback = callback || null;
        if (typeof window.openModal === 'function') {
            window.openModal('confirmationModal');
        }
    };

    const checkAndDisplayNotifications = () => {
        const notificationList = document.getElementById('notification-list');
        const notificationCount = document.getElementById('notification-count');
        if (!notificationList || !notificationCount) return;

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');

        const assets = window.__QLTS_DATA__?.assets || [];
        const licenses = window.__QLTS_DATA__?.licenses || [];

        let pageType = '';
        let notificationsToShow = [];

        if (document.getElementById('assetTableBody')) {
            pageType = 'asset';
            notificationsToShow = assets.filter((asset) => {
                if (!asset.warranty_expiration_date) return false;
                const expiryDate = new Date(asset.warranty_expiration_date);
                return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
            }).filter((asset) => !readNotifications.includes(`asset_${asset.id}`));
        } else if (document.getElementById('licenseTableBody')) {
            pageType = 'license';
            notificationsToShow = licenses.filter((license) => {
                if (!license.expiration_date) return false;
                const expiryDate = new Date(license.expiration_date);
                return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
            }).filter((license) => !readNotifications.includes(`license_${license.id}`));
        }

        if (notificationsToShow.length === 0) {
            notificationCount.classList.add('hidden');
            notificationList.innerHTML = '<li class="p-4 text-center text-sm text-slate-400 dark:text-gray-500">Không có thông báo mới.</li>';
            return;
        }

        notificationCount.textContent = notificationsToShow.length;
        notificationCount.classList.remove('hidden');
        notificationList.innerHTML = notificationsToShow.map((item) => {
            const expiryDate = new Date(pageType === 'asset' ? item.warranty_expiration_date : item.expiration_date);
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            const titleText = pageType === 'license' ? `${item.key_type} - ${item.user || 'Chưa cấp'}` : (item.name || item.key_type);
            const notificationId = `${pageType}_${item.id}`;
            const iconClass = pageType === 'asset' ? 'fa-box-archive' : 'fa-key';
            const message = pageType === 'asset' ? 'Sắp hết hạn bảo hành' : 'Sắp hết hạn bản quyền';

            return `
                <li class="border-b dark:border-slate-700 last:border-b-0 group flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <a href="${pageType}s.html" class="flex-grow">
                        <p class="font-semibold text-sm text-slate-800 dark:text-gray-200 flex items-center"><i class="fa-solid ${iconClass} mr-2 text-slate-400"></i> ${item.name || item.key_type}</p>
                        <p class="font-semibold text-sm text-slate-800 dark:text-gray-200 flex items-center"><i class="fa-solid ${iconClass} mr-2 text-slate-400"></i> ${titleText}</p>
                        <p class="text-xs text-red-500 pl-5">${message} (còn ${daysLeft > 1 ? `${daysLeft} ngày` : 'hôm nay'})</p>
                    </a>
                    <button data-action="mark-notif-read" data-notif-id="${notificationId}" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-opacity" title="Đánh dấu đã đọc">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </li>
            `;
        }).join('');
    };

    const applyRoleBasedUI = () => {
        const isAdmin = currentUserProfile.role === 'admin';
        const adminOnlyButtons = [
            '#addAssetBtn', '#importExcelBtn', '#manageCategoriesBtn',
            '#addLicenseBtn', '#importLicenseBtn', '#manageLicenseTypesBtn', '#exportLicenseBtn',
            '#addUserBtn', '#importUsersBtn', '#manageDeptsBtn', '#exportUsersBtn'
        ];

        if (!isAdmin) {
            adminOnlyButtons.forEach((selector) => {
                const element = document.querySelector(selector);
                if (element) element.style.display = 'none';
            });

            const userLink = document.querySelector('a[href="users.html"]');
            if (userLink) userLink.style.display = 'none';
        }
    };

    const updateHeaderUserInfo = () => {
        if (!currentUserProfile) return;

        document.querySelectorAll('#header-user-name').forEach((element) => {
            element.textContent = currentUserProfile.full_name || currentUserProfile.name || 'Admin';
        });

        document.querySelectorAll('#header-user-email').forEach((element) => {
            element.textContent = currentUserProfile.email || 'admin@local';
        });

        document.querySelectorAll('img[alt="User Avatar"]').forEach((img) => {
            const avatar = currentUserProfile.avatar || 'https://i.pravatar.cc/40?u=admin';
            img.src = avatar;
        });
    };

    const renderMaintenanceList = () => {
        const tbody = document.getElementById('maintenanceTableBody');
        if (!tbody) return;

        const tasks = (window.__QLTS_DATA__?.maintenanceTasks || []).slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        tbody.innerHTML = tasks.length
            ? tasks.map((task) => {
                const assetName = (window.__QLTS_DATA__?.assets || []).find((a) => a.id === task.asset_id)?.name || 'N/A';
                const statusClass = {
                    open: 'bg-amber-100 text-amber-700',
                    in_progress: 'bg-sky-100 text-sky-700',
                    done: 'bg-green-100 text-green-700',
                    overdue: 'bg-red-100 text-red-700'
                }[task.status] || 'bg-slate-100 text-slate-600';
                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td class="p-3 font-semibold text-slate-800 dark:text-slate-100">${task.title || '-'}</td>
                        <td class="p-3 text-slate-700 dark:text-slate-200">${assetName}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">${task.due_date || '-'}</td>
                        <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${statusClass}">${task.status || '-'}</span></td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">${task.note || '-'}</td>
                        <td class="p-3 text-right"><button class="text-red-600 hover:text-red-700 text-sm" data-action="delete-maint" data-id="${task.id}">Xóa</button></td>
                    </tr>
                `;
            }).join('')
            : '<tr><td colspan="5" class="p-4 text-center text-slate-500">Chưa có lịch bảo trì</td></tr>';
    };

    const renderStockCheckList = () => {
        const tbody = document.getElementById('stockCheckTableBody');
        if (!tbody) return;

        const checks = (window.__QLTS_DATA__?.stockChecks || []).slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        tbody.innerHTML = checks.length
            ? checks.map((item) => {
                const statusClass = {
                    open: 'bg-cyan-100 text-cyan-700',
                    closed: 'bg-green-100 text-green-700'
                }[item.status] || 'bg-slate-100 text-slate-600';
                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td class="p-3 font-semibold text-slate-800 dark:text-slate-100">${item.note || '-'}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">${item.started_at || '-'}</td>
                        <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${statusClass}">${item.status || '-'}</span></td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">${item.note ? item.note : '-'}</td>
                        <td class="p-3 text-right"><button class="text-red-600 hover:text-red-700 text-sm" data-action="delete-stock" data-id="${item.id}">Xóa</button></td>
                    </tr>
                `;
            }).join('')
            : '<tr><td colspan="4" class="p-4 text-center text-slate-500">Chưa có đợt kiểm kê</td></tr>';
    };

    window.QLTSUI = {
        safeCloseModal,
        attemptCloseModal,
        showConfirmationModal,
        checkAndDisplayNotifications,
        applyRoleBasedUI,
        updateHeaderUserInfo,
        renderMaintenanceList,
        renderStockCheckList
    };
})();
