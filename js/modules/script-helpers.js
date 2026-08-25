(function () {
    'use strict';

    const normalizeString = (str = '') => {
        if (str === null || str === undefined) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    };

    const parseDateToISO = (dateStr) => {
        if (!dateStr) return null;
        const value = String(dateStr).trim();
        if (!value || normalizeString(value) === 'vinh vien' || normalizeString(value) === 'permanent') return null;

        const direct = new Date(value);
        if (!Number.isNaN(direct.getTime())) return direct.toISOString();

        const cleaned = value
            .replace(/^Hạn\s*/i, '')
            .replace(/\s+/g, ' ')
            .trim();

        const parsed = new Date(cleaned);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

        const match = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (match) {
            const [, d, m, y] = match;
            const iso = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00`);
            if (!Number.isNaN(iso.getTime())) return iso.toISOString();
        }

        return null;
    };

    const formatDateDisplay = (isoDate) => {
        if (!isoDate) return '<span class="text-slate-400 italic">Vĩnh viễn</span>';
        const date = new Date(isoDate);
        if (Number.isNaN(date.getTime())) return '<span class="text-red-500 text-xs italic">Sai/Thiếu ngày</span>';
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getCreatedDate = (record) => {
        if (!record) return '';
        const raw = record.created_at || record.createdAt || record.date_created || record.created;
        if (!raw) return '';
        const iso = parseDateToISO(raw);
        return iso ? new Date(iso).toLocaleDateString('vi-VN') : String(raw);
    };

    const safeDate = (val) => {
        if (!val) return null;
        const date = new Date(val);
        return Number.isNaN(date.getTime()) ? null : date;
    };

    const notify = (message, title) => {
        if (typeof window.showInfoModal === 'function') window.showInfoModal(message, title);
        else console.warn(message);
    };

    const exportToCSV = (rows, filename) => {
        if (!Array.isArray(rows) || rows.length === 0) {
            notify('Không có dữ liệu để xuất!');
            return;
        }

        try {
            const csv = [Object.keys(rows[0]).join(',')]
                .concat(rows.map(row => Object.values(row).map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')))
                .join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', filename || 'export.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Lỗi khi export CSV:', error);
            notify('Có lỗi khi xuất CSV', 'Lỗi');
        }
    };

    const resolveExportData = (filteredRows, fullRows, activeFilter) => {
        if (filteredRows && filteredRows.length) return filteredRows;
        if (!activeFilter || !activeFilter.trim()) return fullRows || [];
        return fullRows || [];
    };

    // =================================================================
    // TEM / BARCODE / QR CODE HELPERS
    // Mã tem theo quy ước: MÃ ĐƠN VỊ - MÃ LOẠI - MÃ BỘ PHẬN - SỐ THỨ TỰ
    // =================================================================
    const UNIT_CODE_KEY = 'qlts_unit_code';
    const CODE_MAP_KEY = 'qlts_code_map'; // { category: {name: code}, department: {name: code}, type: {name: code} }

    const getUnitCode = () => (localStorage.getItem(UNIT_CODE_KEY) || 'CTY').trim().toUpperCase() || 'CTY';
    const setUnitCode = (code) => {
        localStorage.setItem(UNIT_CODE_KEY, (code || '').trim().toUpperCase() || 'CTY');
    };

    const loadCodeMap = () => {
        try {
            const raw = JSON.parse(localStorage.getItem(CODE_MAP_KEY) || '{}');
            return {
                category: raw.category || {},
                department: raw.department || {},
                type: raw.type || {}
            };
        } catch (e) {
            return { category: {}, department: {}, type: {} };
        }
    };

    const saveCodeMap = (map) => {
        localStorage.setItem(CODE_MAP_KEY, JSON.stringify(map));
    };

    // Sinh mã ngắn (3-4 ký tự, không dấu, viết hoa) từ tên, đảm bảo không trùng
    // với các mã đã cấp trong cùng nhóm (kind).
    const deriveShortCode = (name, existingCodes) => {
        const clean = normalizeString(name).toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();
        const words = clean.split(/\s+/).filter(Boolean);
        let base;
        if (words.length > 1) {
            base = words.map(w => w[0]).join('').slice(0, 4);
        } else {
            base = (words[0] || 'NA').slice(0, 3);
        }
        base = base || 'NA';

        const used = new Set(existingCodes || []);
        if (!used.has(base)) return base;
        let suffix = 2;
        while (used.has(`${base}${suffix}`)) suffix++;
        return `${base}${suffix}`;
    };

    // Trả về mã ổn định cho 1 tên trong 1 nhóm (category/department/type),
    // tự sinh và lưu lại lần đầu tiên gặp tên đó.
    const getOrCreateCode = (kind, name) => {
        const key = (name || '').trim();
        if (!key) return 'NA';
        const map = loadCodeMap();
        const group = map[kind] || (map[kind] = {});
        if (group[key]) return group[key];
        const code = deriveShortCode(key, Object.values(group));
        group[key] = code;
        saveCodeMap(map);
        return code;
    };

    // Tìm số thứ tự tiếp theo cho 1 tiền tố "DONVI-LOAI-BOPHAN-" bằng cách
    // quét các mã đã có (không dùng bộ đếm riêng để tránh lệch khi dữ liệu bị sửa/xóa).
    const nextSequenceForPrefix = (existingCodes, prefix) => {
        let max = 0;
        (existingCodes || []).forEach(code => {
            if (!code || !code.startsWith(prefix)) return;
            const tail = code.slice(prefix.length);
            const n = parseInt(tail, 10);
            if (!Number.isNaN(n) && n > max) max = n;
        });
        return max + 1;
    };

    // deptName: tên phòng ban của user được gán (hoặc null nếu đang trong kho)
    const buildEntityCode = (kind, name, deptName, existingCodesOfSameEntity) => {
        const unit = getUnitCode();
        const typeCode = getOrCreateCode(kind, name || 'Khac');
        const deptCode = deptName ? getOrCreateCode('department', deptName) : 'KHO';
        const prefix = `${unit}-${typeCode}-${deptCode}-`;
        const seq = nextSequenceForPrefix(existingCodesOfSameEntity, prefix);
        return `${prefix}${String(seq).padStart(3, '0')}`;
    };

    const buildAssetCode = (categoryName, deptName, existingAssetCodes) =>
        buildEntityCode('category', categoryName, deptName, existingAssetCodes);

    const buildLicenseCode = (typeName, deptName, existingLicenseCodes) =>
        buildEntityCode('type', typeName, deptName, existingLicenseCodes);

    window.QLTSHelpers = {
        normalizeString,
        parseDateToISO,
        formatDateDisplay,
        getCreatedDate,
        safeDate,
        exportToCSV,
        resolveExportData,
        getUnitCode,
        setUnitCode,
        deriveShortCode,
        getOrCreateCode,
        nextSequenceForPrefix,
        buildAssetCode,
        buildLicenseCode
    };
})();
