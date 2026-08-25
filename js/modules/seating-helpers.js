(function () {
    'use strict';

    const readJSON = (key, fallback = []) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return parsed ?? fallback;
        } catch (error) {
            console.warn(`Không đọc được dữ liệu Seating key=${key}:`, error);
            return fallback;
        }
    };

    const el = (id) => document.getElementById(id);

    const escHtml = (s) => {
        const div = document.createElement('div');
        div.textContent = s ?? '';
        return div.innerHTML;
    };

    const colLabel = (c) => {
        let s = '';
        let n = c;
        while (n >= 0) {
            s = String.fromCharCode(65 + (n % 26)) + s;
            n = Math.floor(n / 26) - 1;
        }
        return s;
    };

    const getDepartments = () => {
        const rows = readJSON('qlts_departments', []);
        return Array.isArray(rows) ? rows : [];
    };

    const getUsers = () => {
        const rows = readJSON('qlts_users', []);
        return Array.isArray(rows) ? rows : [];
    };

    const getPlacedNames = (cellData = {}) => {
        return Object.values(cellData)
            .map((cell) => cell?.name)
            .filter(Boolean)
            .map(String);
    };

    const toast = (msg, type = 'info') => {
        const container = document.getElementById('seatingToast');
        if (!container) return;
        const colorMap = {
            success: 'bg-emerald-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-sky-500'
        };
        container.className = `fixed right-4 bottom-4 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${colorMap[type] || colorMap.info}`;
        container.textContent = msg;
        container.classList.remove('hidden');
        clearTimeout(window.__SEATING_TOAST_TIMER__);
        window.__SEATING_TOAST_TIMER__ = setTimeout(() => container.classList.add('hidden'), 2200);
    };

    // Không dùng window.confirm() (native dialog) - ưu tiên modal #alertModal của trang seating.
    const showConfirm = (message, onOk) => {
        const modal = document.getElementById('alertModal');
        const titleEl = document.getElementById('alertTitle');
        const msgEl = document.getElementById('alertMessage');
        const okBtn = document.getElementById('alertOk');
        const cancelBtn = document.getElementById('alertCancel');
        if (!modal || !msgEl || !okBtn) {
            if (typeof onOk === 'function') onOk();
            return;
        }
        if (titleEl) titleEl.textContent = 'Xác nhận';
        msgEl.textContent = message;
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        modal.classList.remove('hidden');
        const newOk = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        newOk.addEventListener('click', () => {
            modal.classList.add('hidden');
            if (cancelBtn) cancelBtn.classList.add('hidden');
            if (typeof onOk === 'function') onOk();
        });
        if (cancelBtn) {
            const newCancel = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
            newCancel.addEventListener('click', () => {
                modal.classList.add('hidden');
                newCancel.classList.add('hidden');
            });
        }
    };

    window.SeatingHelpers = {
        readJSON,
        el,
        escHtml,
        colLabel,
        getDepartments,
        getUsers,
        getPlacedNames,
        toast,
        showConfirm
    };
})();
