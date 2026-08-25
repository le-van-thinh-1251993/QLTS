(function () {
    'use strict';

    const AppCore = {
        safeArrayParse(raw) {
            try {
                const parsed = JSON.parse(raw || '[]');
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                return [];
            }
        },

        normalizeText(value) {
            return String(value ?? '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();
        },

        parseNumber(value, fallback = 0) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        },

        debounce(fn, delay = 150) {
            let timerId = null;
            return (...args) => {
                if (timerId) clearTimeout(timerId);
                timerId = setTimeout(() => fn(...args), delay);
            };
        },

        showInfoModal(message, title = 'Thông báo') {
            const titleEl = document.getElementById('infoModalTitle');
            const msgEl = document.getElementById('infoModalMessage');

            if (titleEl && msgEl) {
                titleEl.textContent = title;
                if (typeof message === 'string' && /<[^>]+>/.test(message)) {
                    msgEl.innerHTML = message;
                } else {
                    msgEl.textContent = message;
                }

                if (typeof window.openModal === 'function') {
                    window.openModal('infoModal');
                    return;
                }
            }

            if (document.visibilityState === 'visible') {
                alert(`${title}: ${String(message).replace(/<[^>]*>?/gm, '')}`);
            }
        },

        handleSupabaseError(error, context) {
            console.error(`Lỗi ${context}:`, error);
            const message = (error && error.message) ? error.message : JSON.stringify(error);

            if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Aborted')) {
                console.warn('Supressed network error (likely due to navigation):', message);
                return;
            }

            AppCore.showInfoModal(`Chi tiết: ${message}`, `Lỗi khi ${context}`);
        },

        isMobileViewport() {
            return window.innerWidth < 768;
        },

        escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    };

    window.QLTSCore = AppCore;
})();
