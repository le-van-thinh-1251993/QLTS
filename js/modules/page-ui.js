window.QLTSPageUI = window.QLTSPageUI || {};
window.QLTSPageUI.init = async function () {
    // =================================================================

    // Helper: Chuẩn hóa chuỗi để so sánh (Fix lỗi thiếu hàm này khi import)
    function normalizeString(str) {
        if (window.QLTSHelpers && typeof window.QLTSHelpers.normalizeString === 'function') {
            return window.QLTSHelpers.normalizeString(str);
        }
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
    }

    function getSingleChoiceValue(choicesInstance, elementId) {
        const normalizeChoiceValue = (value) => {
            if (value === null || value === undefined) return '';
            const raw = typeof value === 'string' ? value : String(value);
            const normalized = normalizeString(raw);
            if (!normalized || normalized === 'tat ca nguoi dung' || normalized === 'all users') return '';
            return raw;
        };

        if (choicesInstance) {
            try {
                const selectedValue = choicesInstance.getValue(true);
                if (Array.isArray(selectedValue)) {
                    return normalizeChoiceValue(selectedValue[0] || '');
                }
                return normalizeChoiceValue(selectedValue || '');
            } catch (e) {}
        }
        return normalizeChoiceValue(document.getElementById(elementId)?.value || '');
    }

    function pinSingleChoiceRemoveButton(choicesInstance, elementId) {
        if (!choicesInstance) return;
        try {
            const sourceElement = document.getElementById(elementId);
            const choicesContainer = sourceElement?.closest('.choices') || sourceElement?.parentElement;
            if (!choicesContainer) return;

            const applyPosition = () => {
                const selectedItem = choicesContainer.querySelector('.choices__list--single .choices__item');
                const removeButton = choicesContainer.querySelector('.choices__list--single .choices__item .choices__button');
                const inner = choicesContainer.querySelector('.choices__inner');

                if (inner) {
                    inner.style.display = 'flex';
                    inner.style.alignItems = 'center';
                    inner.style.justifyContent = 'flex-start';
                    inner.style.minHeight = '2.75rem';
                    inner.style.paddingRight = '2.5rem';
                    inner.style.lineHeight = '1.2';
                }

                if (selectedItem) {
                    selectedItem.style.position = 'relative';
                    selectedItem.style.width = '100%';
                    selectedItem.style.display = 'flex';
                    selectedItem.style.alignItems = 'center';
                    selectedItem.style.paddingRight = '2.2rem';
                    selectedItem.style.overflow = 'visible';
                    selectedItem.style.minHeight = '1.5rem';
                    selectedItem.style.lineHeight = '1.2';
                }

                if (removeButton) {
                    removeButton.style.setProperty('position', 'absolute', 'important');
                    removeButton.style.setProperty('top', '50%', 'important');
                    removeButton.style.setProperty('right', '-0.25rem', 'important');
                    removeButton.style.setProperty('left', 'auto', 'important');
                    removeButton.style.setProperty('margin-left', '0', 'important');
                    removeButton.style.setProperty('transform', 'translateY(-50%)', 'important');
                    removeButton.style.setProperty('z-index', '3', 'important');
                    removeButton.style.setProperty('width', '1.1rem', 'important');
                    removeButton.style.setProperty('height', '1.1rem', 'important');
                    removeButton.style.setProperty('min-width', '1.1rem', 'important');
                    removeButton.style.setProperty('min-height', '1.1rem', 'important');
                    removeButton.style.setProperty('padding', '0', 'important');
                    removeButton.style.setProperty('border-radius', '9999px', 'important');
                    removeButton.style.setProperty('display', 'inline-flex', 'important');
                    removeButton.style.setProperty('align-items', 'center', 'important');
                    removeButton.style.setProperty('justify-content', 'center', 'important');
                    removeButton.style.setProperty('font-size', '0', 'important');
                    removeButton.style.setProperty('line-height', '1', 'important');
                    removeButton.style.setProperty('background', '#f1f5f9', 'important');
                    removeButton.style.setProperty('border', '1px solid #cbd5e1', 'important');
                    removeButton.style.setProperty('color', '#64748b', 'important');
                }
            };

            applyPosition();
            requestAnimationFrame(applyPosition);
            setTimeout(applyPosition, 0);
        } catch (e) {}
    }

    // Helper: try common fields to find a created/added date on a record
    function getCreatedDate(record) {
        if (!record) return null;
        const candidates = ['created_at','createdAt','added_at','addedAt','imported_at','importedAt','assignedDate','assigned_date','date_added'];
        for (const key of candidates) {
            if (record[key]) {
                const d = new Date(record[key]);
                if (!isNaN(d.getTime())) return d;
            }
        }
        return null;
    }

    function openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.setAttribute('aria-hidden', 'false');
        try { modal.style.pointerEvents = 'auto'; } catch (e) {}
        const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
    }

    window.openModal = openModal;
    window.getSingleChoiceValue = getSingleChoiceValue;
    window.pinSingleChoiceRemoveButton = pinSingleChoiceRemoveButton;
    window.getCreatedDate = getCreatedDate;
    window.normalizeString = window.normalizeString || normalizeString;
};

