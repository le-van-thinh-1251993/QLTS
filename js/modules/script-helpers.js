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

    const exportToCSV = (rows, filename) => {
        if (!Array.isArray(rows) || rows.length === 0) {
            window.alert('Không có dữ liệu để xuất!');
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
            window.alert('Có lỗi khi xuất CSV');
        }
    };

    const resolveExportData = (filteredRows, fullRows, activeFilter) => {
        if (filteredRows && filteredRows.length) return filteredRows;
        if (!activeFilter || !activeFilter.trim()) return fullRows || [];
        return fullRows || [];
    };

    window.QLTSHelpers = {
        normalizeString,
        parseDateToISO,
        formatDateDisplay,
        getCreatedDate,
        safeDate,
        exportToCSV,
        resolveExportData
    };
})();
