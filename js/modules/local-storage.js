(function () {
    'use strict';

    const LocalStorageModule = {
        readJSON(key, fallback = []) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return fallback;
                const parsed = JSON.parse(raw);
                return parsed ?? fallback;
            } catch (error) {
                console.warn(`Không đọc được localStorage key=${key}:`, error);
                return fallback;
            }
        },

        writeJSON(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        },

        updateJSON(key, updater, fallback = []) {
            const current = this.readJSON(key, fallback);
            const next = updater(current);
            this.writeJSON(key, next);
            return next;
        },

        remove(key) {
            localStorage.removeItem(key);
        }
    };

    window.QLTSStorage = LocalStorageModule;
})();
