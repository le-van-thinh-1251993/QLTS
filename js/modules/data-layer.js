(function () {
    'use strict';

    const normalizeString = (value = '') => {
        if (value === null || value === undefined) return '';
        return String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    };

    const safeArrayParse = (raw) => {
        try {
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    };

    const isLikelyDemoDataSnapshot = (assetRows, userRows) => {
        if (!Array.isArray(assetRows) || !Array.isArray(userRows)) return false;
        if (assetRows.length === 0) return false;
        if (assetRows.length > 3 || userRows.length > 3) return false;

        const assetNames = assetRows.map((a) => normalizeString(a?.name));
        const userNames = userRows.map((u) => normalizeString(u?.name));

        return (
            assetNames.includes('laptop dell xps 13') ||
            assetNames.includes('monitor lg 27"')
        ) && (
            userNames.includes('nguyen van a') ||
            userNames.includes('tran thi b')
        );
    };

    const fetchAllData = async () => {
        const data = await Promise.all([
            LocalDB.from('departments').select('*'),
            LocalDB.from('categories').select('*'),
            LocalDB.from('users').select('*'),
            LocalDB.from('assets').select('*'),
            LocalDB.from('licenses').select('*'),
            LocalDB.from('asset_history').select('*'),
            LocalDB.from('license_types').select('*'),
            LocalDB.from('maintenance_tasks').select('*'),
            LocalDB.from('maintenance_events').select('*'),
            LocalDB.from('stock_checks').select('*'),
            LocalDB.from('stock_check_items').select('*'),
            LocalDB.from('alert_settings').select('*')
        ]);

        const [deptData, catData, userData, assetData, licenseData, historyData, licTypeData, maintenanceTaskData, maintenanceEventData, stockCheckData, stockCheckItemData, alertSettingData] = data;

        const needsBootstrap =
            (deptData?.data?.length || 0) === 0 &&
            (catData?.data?.length || 0) === 0 &&
            (userData?.data?.length || 0) === 0;

        if (needsBootstrap && !window.__HAS_BOOTSTRAPPED_LOCAL_DATA__) {
            window.__HAS_BOOTSTRAPPED_LOCAL_DATA__ = true;
            LocalDB.setDefaultData();
            return fetchAllData();
        }

        const departments = deptData.data || [];
        const categories = catData.data || [];
        const licenseTypes = licTypeData.data || [];
        const usersRaw = userData.data || [];

        const users = usersRaw.map((user) => {
            const department = departments.find((d) => d.id === user.department_id);
            return { ...user, department: department ? department.name : '-' };
        });

        const assets = (assetData.data || []).map((asset) => ({
            ...asset,
            category: asset.category || asset.category_name || ''
        }));

        const licenses = licenseData.data || [];
        const maintenanceTasks = maintenanceTaskData.data || [];
        const maintenanceEvents = maintenanceEventData.data || [];
        const stockChecks = stockCheckData.data || [];
        const stockCheckItems = stockCheckItemData.data || [];
        const alertSettings = alertSettingData.data || [];

        const assetHistory = (historyData.data || []).map((item) => {
            const asset = assets.find((a) => a.id === item.asset_id);
            return {
                ...item,
                assetName: asset ? asset.name : 'N/A',
                time: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : ''
            };
        });

        window.__QLTS_DATA__ = {
            departments,
            categories,
            users,
            assets,
            licenses,
            assetHistory,
            licenseTypes,
            maintenanceTasks,
            maintenanceEvents,
            stockChecks,
            stockCheckItems,
            alertSettings
        };

        return window.__QLTS_DATA__;
    };

    const autoRestoreFromSupabaseIfNeeded = async () => {
        if (window.__HAS_ATTEMPTED_AUTO_RESTORE__) return;
        window.__HAS_ATTEMPTED_AUTO_RESTORE__ = true;

        const localAssets = safeArrayParse(localStorage.getItem(LocalDB.KEYS.ASSETS));
        const localLicenses = safeArrayParse(localStorage.getItem(LocalDB.KEYS.LICENSES));
        const localUsers = safeArrayParse(localStorage.getItem(LocalDB.KEYS.USERS));

        const localEmpty = localAssets.length === 0 && localLicenses.length === 0;
        const localLooksDemo = isLikelyDemoDataSnapshot(localAssets, localUsers);

        if (!localEmpty && !localLooksDemo) return;

        const remote = window.__APP_CONFIG__ ? null : null;
        if (!window.supabase && !window.__APP_CONFIG__) return;

        try {
            const config = window.__APP_CONFIG__ || {};
            const client = window.supabase && config.SUPABASE_URL && config.SUPABASE_ANON_KEY
                ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
                : null;

            if (!client) return;

            const results = await Promise.all([
                client.from('departments').select('*'),
                client.from('categories').select('*'),
                client.from('users').select('*'),
                client.from('assets').select('*'),
                client.from('licenses').select('*'),
                client.from('asset_history').select('*'),
                client.from('license_types').select('*'),
                client.from('maintenance_tasks').select('*'),
                client.from('maintenance_events').select('*'),
                client.from('stock_checks').select('*'),
                client.from('stock_check_items').select('*'),
                client.from('alert_settings').select('*')
            ]);

            const safeData = (response) => Array.isArray(response?.data) ? response.data : [];
            const remoteData = {
                departments: safeData(results[0]),
                categories: safeData(results[1]),
                users: safeData(results[2]),
                assets: safeData(results[3]),
                licenses: safeData(results[4]),
                assetHistory: safeData(results[5]),
                licenseTypes: safeData(results[6]),
                maintenanceTasks: safeData(results[7]),
                maintenanceEvents: safeData(results[8]),
                stockChecks: safeData(results[9]),
                stockCheckItems: safeData(results[10]),
                alertSettings: safeData(results[11])
            };

            Object.entries(remoteData).forEach(([key, rows]) => {
                const storageKey = LocalDB.KEYS[key.toUpperCase()] || LocalDB.KEYS[key];
                if (storageKey) localStorage.setItem(storageKey, JSON.stringify(rows));
            });
        } catch (error) {
            console.warn('Auto-restore failed:', error);
        }
    };

    window.QLTSData = {
        fetchAllData,
        autoRestoreFromSupabaseIfNeeded,
        normalizeString,
        safeArrayParse,
        isLikelyDemoDataSnapshot
    };
})();
