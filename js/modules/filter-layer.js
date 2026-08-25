(function () {
    'use strict';

    const getSingleChoiceValue = (choicesInstance, elementId) => {
        const normalizeChoiceValue = (value) => {
            if (value === null || value === undefined) return '';
            const raw = typeof value === 'string' ? value : String(value);
            const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            if (!normalized || normalized === 'tat ca nguoi dung' || normalized === 'all users') return '';
            return raw;
        };

        if (choicesInstance) {
            try {
                const selectedValue = choicesInstance.getValue(true);
                if (Array.isArray(selectedValue)) return normalizeChoiceValue(selectedValue[0] || '');
                return normalizeChoiceValue(selectedValue || '');
            } catch (error) {
                // fallback
            }
        }

        return normalizeChoiceValue(document.getElementById(elementId)?.value || '');
    };

    const pinSingleChoiceRemoveButton = (choicesInstance, elementId) => {
        if (!choicesInstance || !choicesInstance.passedElement) return;
        const target = choicesInstance.passedElement.element;
        if (!target) return;

        const wrapper = target.closest('.choices');
        if (!wrapper) return;

        const selectedValue = getSingleChoiceValue(choicesInstance, elementId);
        const removeButton = wrapper.querySelector('.choices__button');
        if (removeButton) {
            removeButton.style.display = selectedValue ? 'inline-flex' : 'none';
            removeButton.style.width = '18px';
            removeButton.style.height = '18px';
            removeButton.style.marginLeft = '8px';
            removeButton.style.flexShrink = '0';
        }
    };

    const initChoices = (elementId, instanceVar, data, selectedValue = null) => {
        const element = document.getElementById(elementId);
        if (!element) return null;

        const instance = new Choices(element, {
            removeItemButton: false,
            placeholder: true,
            placeholderValue: 'Tất cả',
            searchPlaceholderValue: 'Tìm kiếm...',
            shouldSort: false,
            searchEnabled: true,
            itemSelectText: '',
            position: 'bottom',
            duplicateItemsAllowed: false
        });

        if (Array.isArray(data) && data.length) {
            const choices = [{ value: '', label: 'Tất cả' }, ...data.map((item) => ({ value: item.value ?? item, label: item.label ?? item }))];
            instance.setChoices(choices, 'value', 'label', true);
        }

        if (selectedValue) instance.setChoiceByValue(selectedValue);
        else instance.setChoiceByValue('');

        window[instanceVar] = instance;
        pinSingleChoiceRemoveButton(instance, elementId);
        return instance;
    };

    const updateDropdowns = () => {
        const users = window.__QLTS_DATA__?.users || [];
        const userDropdown = document.getElementById('filterAssetUser');
        const licenseDropdown = document.getElementById('filterLicenseUser');

        if (userDropdown && !userDropdown.dataset.initialized) {
            userDropdown.dataset.initialized = 'true';
            const saved = userDropdown.value || '';
            userDropdown.innerHTML = '<option value="">Tất cả người dùng</option>' + users.map((u) => `<option value="${u.name}">${u.name}</option>`).join('');
            if (saved) userDropdown.value = saved;
        }

        if (licenseDropdown && !licenseDropdown.dataset.initialized) {
            licenseDropdown.dataset.initialized = 'true';
            const saved = licenseDropdown.value || '';
            licenseDropdown.innerHTML = '<option value="">Tất cả người dùng</option>' + users.map((u) => `<option value="${u.name}">${u.name}</option>`).join('');
            if (saved) licenseDropdown.value = saved;
        }
    };

    const applyAssetFilters = () => {
        const assets = window.__QLTS_DATA__?.assets || [];
        const term = (document.getElementById('searchInput')?.value || '').trim();
        const normalizedTerm = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const statusFilter = document.getElementById('filterAssetStatus')?.value || '';
        const locationFilter = document.getElementById('filterAssetLocation')?.value || '';
        const categoryFilter = document.getElementById('filterAssetCategory')?.value || '';
        const userFilter = getSingleChoiceValue(window.filterAssetUserChoicesInstance, 'filterAssetUser');

        const filtered = assets.filter((asset) => {
            const searchText = [asset.name, asset.config, asset.category, asset.location].join(' ');
            const matchesText = !normalizedTerm || searchText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalizedTerm);
            const matchesStatus = !statusFilter || String(asset.status || '') === String(statusFilter);
            const matchesLocation = !locationFilter || String(asset.location || '').trim() === String(locationFilter).trim();
            const matchesCategory = !categoryFilter || String(asset.category || '').trim() === String(categoryFilter).trim();
            const matchesUser = !userFilter || String(asset.user || '').trim() === String(userFilter).trim();
            return matchesText && matchesStatus && matchesLocation && matchesCategory && matchesUser;
        });

        window.currentFilteredAssets = filtered;
        if (typeof window.renderTableAssets === 'function') window.renderTableAssets(filtered);
    };

    const applyLicenseFilters = () => {
        const licenses = window.__QLTS_DATA__?.licenses || [];
        const term = (document.getElementById('searchInput')?.value || '').trim();
        const normalizedTerm = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const statusFilter = document.getElementById('filterLicenseStatus')?.value || '';
        const typeFilter = document.getElementById('filterLicenseType')?.value || '';
        const packageFilter = document.getElementById('filterPackageType')?.value || '';
        const userFilter = getSingleChoiceValue(window.filterLicenseUserChoicesInstance, 'filterLicenseUser');

        const filtered = licenses.filter((license) => {
            const searchText = [license.key_type, license.package_type, license.user, license.license_key].join(' ');
            const matchesText = !normalizedTerm || searchText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalizedTerm);
            const matchesStatus = !statusFilter || String(license.status || '') === String(statusFilter);
            const matchesType = !typeFilter || String(license.key_type || '') === String(typeFilter);
            const matchesPackage = !packageFilter || String(license.package_type || '') === String(packageFilter);
            const matchesUser = !userFilter || String(license.user || '').trim() === String(userFilter).trim();
            return matchesText && matchesStatus && matchesType && matchesPackage && matchesUser;
        });

        window.currentFilteredLicenses = filtered;
        if (typeof window.renderTableLicenses === 'function') window.renderTableLicenses(filtered);
    };

    const applyUserFilters = () => {
        const users = window.__QLTS_DATA__?.users || [];
        const term = (document.getElementById('searchUserInput')?.value || '').trim();
        const normalizedTerm = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const deptFilter = document.getElementById('filterDepartment')?.value || '';

        const filtered = users.filter((user) => {
            const searchText = [user.name, user.email, user.department].join(' ');
            const matchesText = !normalizedTerm || searchText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalizedTerm);
            const matchesDept = !deptFilter || String(user.department || '').trim() === String(deptFilter).trim();
            return matchesText && matchesDept;
        });

        window.currentFilteredUsers = filtered;
        if (typeof window.renderTableUsers === 'function') window.renderTableUsers(filtered);
    };

    const resetAssetFilters = () => {
        const fields = ['filterAssetStatus', 'filterAssetLocation', 'filterAssetCategory'];
        fields.forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
        if (window.filterAssetUserChoicesInstance) {
            try { window.filterAssetUserChoicesInstance.setChoiceByValue(''); } catch (error) {}
        }
        if (typeof window.renderTableAssets === 'function') window.renderTableAssets(window.__QLTS_DATA__?.assets || []);
    };

    const resetLicenseFilters = () => {
        const fields = ['filterLicenseType', 'filterPackageType', 'filterLicenseStatus'];
        fields.forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
        if (window.filterLicenseUserChoicesInstance) {
            try { window.filterLicenseUserChoicesInstance.setChoiceByValue(''); } catch (error) {}
        }
        if (typeof window.renderTableLicenses === 'function') window.renderTableLicenses(window.__QLTS_DATA__?.licenses || []);
    };

    const resetUserFilters = () => {
        const search = document.getElementById('searchUserInput');
        const dept = document.getElementById('filterDepartment');
        if (search) search.value = '';
        if (dept) dept.value = '';
        if (typeof window.renderTableUsers === 'function') window.renderTableUsers(window.__QLTS_DATA__?.users || []);
    };

    window.QLTSFilters = {
        getSingleChoiceValue,
        pinSingleChoiceRemoveButton,
        initChoices,
        updateDropdowns,
        applyAssetFilters,
        applyLicenseFilters,
        applyUserFilters,
        resetAssetFilters,
        resetLicenseFilters,
        resetUserFilters
    };
})();
