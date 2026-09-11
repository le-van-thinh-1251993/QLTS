// =================================================================
// page-contracts.js — Module quản lý Hợp đồng CNTT & SLA
// CRUD hợp đồng, bộ lọc, tìm kiếm, phân trang, export Excel.
// =================================================================

window.QLTSPageContracts = window.QLTSPageContracts || {};

window.QLTSPageContracts.init = function () {
    'use strict';

    const ITEMS_PER_PAGE = 15;
    let currentPage = 1;
    let filteredContracts = [];
    let pendingDeleteId = null;

    // Loại hợp đồng
    const CONTRACT_TYPES = {
        internet: { text: 'Đường truyền Internet', icon: 'fa-solid fa-globe', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' },
        maintenance: { text: 'Bảo trì định kỳ', icon: 'fa-solid fa-wrench', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
        license: { text: 'Bản quyền phần mềm', icon: 'fa-solid fa-key', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
        warranty: { text: 'Bảo hành mở rộng', icon: 'fa-solid fa-shield-halved', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' },
        service: { text: 'Dịch vụ Cloud/SaaS', icon: 'fa-solid fa-cloud', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
        other: { text: 'Khác', icon: 'fa-solid fa-file-lines', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' }
    };

    const PAYMENT_CYCLES = {
        monthly: 'Hàng tháng',
        quarterly: 'Hàng quý',
        yearly: 'Hàng năm',
        one_time: 'Một lần'
    };

    const escapeHtml = (str) => {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const formatVN = (val) => {
        if (!val) return '—';
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('vi-VN');
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '—';
        return Number(amount).toLocaleString('vi-VN') + ' ₫';
    };

    const formatDateSafe = (value) => {
        if (!value) return '—';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '—' : formatVN(value);
    };

    // Compute contract status from dates
    function computeStatus(contract) {
        if (contract.status === 'cancelled') return 'cancelled';
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const endDate = new Date(contract.end_date);
        endDate.setHours(0, 0, 0, 0);
        const startDate = new Date(contract.start_date);
        startDate.setHours(0, 0, 0, 0);

        if (endDate < now) return 'expired';
        const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 90) return 'expiring';
        if (startDate > now) return 'pending';
        return 'active';
    }

    function getStatusBadge(status) {
        const map = {
            active: { text: 'Đang hiệu lực', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
            expiring: { text: 'Sắp hết hạn', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
            expired: { text: 'Đã hết hạn', classes: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' },
            cancelled: { text: 'Đã hủy', classes: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
            pending: { text: 'Chưa hiệu lực', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' }
        };
        return map[status] || map.active;
    }

    function getDaysRemaining(endDate) {
        if (!endDate) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    }

    // ==========================================
    // DATA ACCESS
    // ==========================================
    function loadContracts() {
        try {
            const raw = localStorage.getItem(LocalDB.KEYS.CONTRACTS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveContracts(contracts) {
        try {
            localStorage.setItem(LocalDB.KEYS.CONTRACTS, JSON.stringify(contracts));
            return true;
        } catch (e) {
            console.error('Error saving contracts to localStorage:', e);
            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal('Lỗi lưu dữ liệu: Bộ nhớ trình duyệt đã đầy hoặc bị từ chối.', 'Lỗi lưu trữ');
            } else {
                alert('Lỗi lưu dữ liệu: Bộ nhớ trình duyệt đã đầy!');
            }
            return false;
        }
    }

    function getNextId(contracts) {
        if (!contracts.length) return 1;
        return Math.max(...contracts.map(c => c.id || 0)) + 1;
    }

    function getNextCode(contracts) {
        const maxNum = contracts.reduce((max, c) => {
            const match = (c.code || '').match(/HD-(\d+)/);
            return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        return `HD-${String(maxNum + 1).padStart(3, '0')}`;
    }

    // ==========================================
    // RENDER TABLE
    // ==========================================
    function applyFilters() {
        const contracts = loadContracts();
        const typeFilter = document.getElementById('filterContractType')?.value || '';
        const statusFilter = document.getElementById('filterContractStatus')?.value || '';
        const providerFilter = document.getElementById('filterContractProvider')?.value || '';
        const search = (document.getElementById('contractSearchInput')?.value || '').toLowerCase().trim();

        filteredContracts = contracts.filter(c => {
            const status = computeStatus(c);
            if (typeFilter && c.contract_type !== typeFilter) return false;
            if (statusFilter === 'active' && !['active', 'expiring'].includes(status)) return false;
            if (statusFilter && statusFilter !== 'active' && status !== statusFilter) return false;
            if (providerFilter && c.provider !== providerFilter) return false;
            if (search) {
                const haystack = [c.name, c.code, c.provider, c.contract_number, c.notes].join(' ').toLowerCase();
                if (!haystack.includes(search)) return false;
            }
            return true;
        });

        // Sort: expiring first, then by end_date ascending
        filteredContracts.sort((a, b) => {
            const sa = computeStatus(a);
            const sb = computeStatus(b);
            const priority = { expiring: 0, expired: 1, active: 2, pending: 3, cancelled: 4 };
            const diff = (priority[sa] ?? 5) - (priority[sb] ?? 5);
            if (diff !== 0) return diff;
            return new Date(a.end_date) - new Date(b.end_date);
        });

        currentPage = 1;
        renderTable();
        updateStats();
    }

    function clearFilters() {
        ['filterContractType', 'filterContractStatus', 'filterContractProvider'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const search = document.getElementById('contractSearchInput');
        if (search) search.value = '';
        applyFilters();
    }

    function renderTable() {
        const tbody = document.getElementById('contractTableBody');
        if (!tbody) return;

        const totalPages = Math.max(1, Math.ceil(filteredContracts.length / ITEMS_PER_PAGE));
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = filteredContracts.slice(start, start + ITEMS_PER_PAGE);

        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-slate-400 dark:text-slate-500"><i class="fa-solid fa-file-circle-question text-3xl mb-2 block opacity-40"></i>Không có hợp đồng nào phù hợp bộ lọc.</td></tr>';
        } else {
            tbody.innerHTML = pageItems.map(c => {
                const status = computeStatus(c);
                const badge = getStatusBadge(status);
                const typeInfo = CONTRACT_TYPES[c.contract_type] || CONTRACT_TYPES.other;
                const daysLeft = getDaysRemaining(c.end_date);
                let daysText = '';
                if (daysLeft !== null) {
                    if (daysLeft < 0) daysText = `<span class="text-rose-500 font-bold">Quá hạn ${Math.abs(daysLeft)} ngày</span>`;
                    else if (daysLeft === 0) daysText = '<span class="text-rose-500 font-bold">Hết hạn hôm nay!</span>';
                    else if (daysLeft <= 30) daysText = `<span class="text-rose-500 font-bold">Còn ${daysLeft} ngày</span>`;
                    else if (daysLeft <= 90) daysText = `<span class="text-amber-500 font-semibold">Còn ${daysLeft} ngày</span>`;
                    else daysText = `<span class="text-slate-400">Còn ${daysLeft} ngày</span>`;
                }

                return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer" data-contract-id="${c.id}">
                    <td class="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">${escapeHtml(c.code)}</td>
                    <td class="p-3">
                        <div class="font-semibold text-slate-800 dark:text-slate-100 leading-tight">${escapeHtml(c.name)}</div>
                        ${daysText ? `<div class="text-[11px] mt-0.5">${daysText}</div>` : ''}
                    </td>
                    <td class="p-3 whitespace-nowrap"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${typeInfo.color}"><i class="${typeInfo.icon} text-[9px]"></i>${typeInfo.text}</span></td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">${escapeHtml(c.provider)}</td>
                    <td class="p-3 whitespace-nowrap">${formatVN(c.start_date)}</td>
                    <td class="p-3 whitespace-nowrap font-semibold">${formatVN(c.end_date)}</td>
                    <td class="p-3 text-right font-mono font-semibold whitespace-nowrap">${formatCurrency(c.cost)}${c.cost_period === 'monthly' ? '/th' : c.cost_period === 'yearly' ? '/năm' : ''}</td>
                    <td class="p-3 text-center"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.classes}">${badge.text}</span></td>
                    <td class="p-3 text-right whitespace-nowrap">
                        <button onclick="event.stopPropagation(); QLTSPageContracts.editContract(${c.id})" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors" title="Chỉnh sửa"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="event.stopPropagation(); QLTSPageContracts.deleteContract(${c.id})" class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors ml-0.5" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            }).join('');
        }

        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        const el = document.getElementById('contractPagination');
        if (!el) return;

        if (filteredContracts.length === 0) {
            el.innerHTML = '';
            return;
        }

        const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
        const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredContracts.length);

        el.innerHTML = `
            <span>Hiển thị ${start}-${end} / ${filteredContracts.length} hợp đồng</span>
            <div class="flex items-center gap-1">
                <button ${currentPage <= 1 ? 'disabled' : ''} onclick="QLTSPageContracts.goToPage(${currentPage - 1})" class="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
                <span class="px-3 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold">${currentPage} / ${totalPages}</span>
                <button ${currentPage >= totalPages ? 'disabled' : ''} onclick="QLTSPageContracts.goToPage(${currentPage + 1})" class="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
            </div>
        `;
    }

    // ==========================================
    // STATS
    // ==========================================
    function updateStats() {
        const all = loadContracts();
        let active = 0, expiring = 0, expired = 0;
        all.forEach(c => {
            const s = computeStatus(c);
            if (s === 'active') active++;
            else if (s === 'expiring') { expiring++; active++; } // expiring is still active
            else if (s === 'expired') expired++;
        });

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('statTotalContracts', all.length);
        set('statActiveContracts', active);
        set('statExpiringContracts', expiring);
        set('statExpiredContracts', expired);
    }

    function populateProviderFilter() {
        const select = document.getElementById('filterContractProvider');
        if (!select) return;
        const current = select.value;
        const providers = [...new Set(loadContracts().map(c => (c.provider || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        select.innerHTML = '<option value="">Tất cả nhà cung cấp</option>' + providers.map(provider => `<option value="${escapeHtml(provider)}">${escapeHtml(provider)}</option>`).join('');
        if (providers.includes(current)) select.value = current;
    }

    // ==========================================
    // MODAL UTILS
    // ==========================================
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.setAttribute('aria-hidden', 'false');
        try { modal.style.pointerEvents = 'auto'; } catch (e) {}
        document.body.classList.add('overflow-hidden');
        const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.setAttribute('aria-hidden', 'true');
        try { modal.style.pointerEvents = 'none'; } catch (e) {}
        if (modalId === 'confirmationModal' || modalId === 'confirmModal') {
            pendingDeleteId = null;
            window.confirmCallback = null;
        }
        const anyModalOpen = Array.from(document.querySelectorAll(
            '#contractFormModal:not(.hidden), #contractDetailModal:not(.hidden), #confirmationModal:not(.hidden), #infoModal:not(.hidden), #globalSearchModal:not(.hidden)'
        )).some(m => window.getComputedStyle(m).display !== 'none');
        if (!anyModalOpen) {
            document.body.classList.remove('overflow-hidden');
        }
    }

    // ==========================================
    // FORM — ADD / EDIT
    // ==========================================
    function openFormModal(contract) {
        const modal = document.getElementById('contractFormModal');
        const title = document.getElementById('contractFormTitle');
        if (!modal) return;

        const toDateInputValue = (val) => {
            if (!val) return '';
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
            const d = new Date(val);
            return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
        };

        if (contract) {
            title.innerHTML = '<i class="fa-solid fa-file-contract text-indigo-500"></i> <span>Chỉnh sửa hợp đồng</span>';
            document.getElementById('contractId').value = contract.id;
            document.getElementById('contractCode').value = contract.code || '';
            document.getElementById('contractType').value = contract.contract_type || '';
            document.getElementById('contractName').value = contract.name || '';
            document.getElementById('contractProvider').value = contract.provider || '';
            document.getElementById('contractNumber').value = contract.contract_number || '';
            document.getElementById('contractProviderContact').value = contract.provider_contact || '';
            document.getElementById('contractProviderEmail').value = contract.provider_email || '';
            document.getElementById('contractSignDate').value = toDateInputValue(contract.sign_date);
            document.getElementById('contractStartDate').value = toDateInputValue(contract.start_date);
            document.getElementById('contractEndDate').value = toDateInputValue(contract.end_date);
            document.getElementById('contractCost').value = contract.cost || '';
            document.getElementById('contractPaymentCycle').value = contract.payment_cycle || 'monthly';
            document.getElementById('contractCostPeriod').value = contract.cost_period || 'monthly';
            document.getElementById('contractAutoRenew').checked = !!contract.auto_renew;
            document.getElementById('contractNotes').value = contract.notes || '';
            const attachmentList = document.getElementById('contractAttachmentList');
            if (attachmentList) attachmentList.textContent = contract.attachments?.length ? `Đã có: ${contract.attachments.map(a => a.name).join(', ')}` : 'Chưa có tệp đính kèm';
        } else {
            title.innerHTML = '<i class="fa-solid fa-file-contract text-indigo-500"></i> <span>Thêm hợp đồng mới</span>';
            document.getElementById('contractForm').reset();
            document.getElementById('contractId').value = '';
            const contracts = loadContracts();
            document.getElementById('contractCode').value = getNextCode(contracts);
            const attachmentList = document.getElementById('contractAttachmentList');
            if (attachmentList) attachmentList.textContent = '';
        }

        openModal('contractFormModal');
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const contracts = loadContracts();
        const id = document.getElementById('contractId').value;
        const now = new Date().toISOString();

        const data = {
            code: document.getElementById('contractCode').value.trim(),
            name: document.getElementById('contractName').value.trim(),
            contract_type: document.getElementById('contractType').value,
            provider: document.getElementById('contractProvider').value.trim(),
            contract_number: document.getElementById('contractNumber').value.trim(),
            provider_contact: document.getElementById('contractProviderContact').value.trim(),
            provider_email: document.getElementById('contractProviderEmail').value.trim(),
            sign_date: document.getElementById('contractSignDate').value,
            start_date: document.getElementById('contractStartDate').value,
            end_date: document.getElementById('contractEndDate').value,
            cost: parseFloat(document.getElementById('contractCost').value) || 0,
            payment_cycle: document.getElementById('contractPaymentCycle').value,
            cost_period: document.getElementById('contractCostPeriod').value,
            auto_renew: document.getElementById('contractAutoRenew').checked,
            notes: document.getElementById('contractNotes').value.trim(),
            updated_at: now
        };

        if (!data.code || !data.name || !data.contract_type || !data.provider || !data.start_date || !data.end_date) {
            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal('Vui lòng điền đầy đủ các trường bắt buộc (*)', 'Thiếu thông tin');
            } else {
                alert('Vui lòng điền đầy đủ các trường bắt buộc (*)');
            }
            return;
        }

        const attachmentInput = document.getElementById('contractAttachment');
        const selectedFile = attachmentInput?.files?.[0];
        if (selectedFile) {
            if (selectedFile.size > 2.5 * 1024 * 1024) {
                if (typeof window.showInfoModal === 'function') {
                    window.showInfoModal('Tệp đính kèm không được vượt quá 2.5MB để tránh tràn bộ nhớ trình duyệt.', 'Tệp quá lớn');
                } else {
                    alert('Tệp đính kèm không được vượt quá 2.5MB');
                }
                return;
            }
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(selectedFile);
            });
            data.attachments = [{ name: selectedFile.name, data_url: dataUrl, uploaded_at: now }];
        }

        if (id) {
            // Edit
            const idx = contracts.findIndex(c => c.id === parseInt(id));
            if (idx >= 0) {
                contracts[idx] = { ...contracts[idx], ...data, attachments: data.attachments || contracts[idx].attachments || [] };
                contracts[idx].status = computeStatus(contracts[idx]);
            }
        } else {
            // Add
            const newContract = {
                id: getNextId(contracts),
                ...data,
                related_asset_ids: [],
                alert_days: [30, 60, 90],
                attachments: data.attachments || [],
                created_at: now,
                status: 'active'
            };
            newContract.status = computeStatus(newContract);
            contracts.push(newContract);
        }

        const saved = saveContracts(contracts);
        if (saved) {
            closeModal('contractFormModal');
            populateProviderFilter();
            applyFilters();

            // Log activity
            if (typeof window.logActivity === 'function') {
                window.logActivity(id ? 'Cập nhật hợp đồng' : 'Thêm hợp đồng mới', data.name);
            }
            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal(id ? 'Đã cập nhật hợp đồng thành công.' : 'Đã thêm hợp đồng mới thành công.', 'Thành công');
            }
        }
    }

    // ==========================================
    // DETAIL VIEW
    // ==========================================
    function openDetailModal(contractId) {
        const contracts = loadContracts();
        const c = contracts.find(x => x.id === contractId);
        if (!c) return;

        const modal = document.getElementById('contractDetailModal');
        const content = document.getElementById('contractDetailContent');
        if (!modal || !content) return;

        const status = computeStatus(c);
        const badge = getStatusBadge(status);
        const typeInfo = CONTRACT_TYPES[c.contract_type] || CONTRACT_TYPES.other;
        const daysLeft = getDaysRemaining(c.end_date);

        let daysHtml = '';
        if (daysLeft !== null) {
            if (daysLeft < 0) daysHtml = `<span class="text-rose-600 font-bold">Quá hạn ${Math.abs(daysLeft)} ngày</span>`;
            else if (daysLeft === 0) daysHtml = '<span class="text-rose-600 font-bold">Hết hạn hôm nay!</span>';
            else if (daysLeft <= 30) daysHtml = `<span class="text-rose-600 font-bold">⚠ Còn ${daysLeft} ngày</span>`;
            else if (daysLeft <= 90) daysHtml = `<span class="text-amber-600 font-semibold">Còn ${daysLeft} ngày</span>`;
            else daysHtml = `<span class="text-emerald-600">Còn ${daysLeft} ngày</span>`;
        }

        // Progress bar for contract duration
        const startTimestamp = new Date(c.start_date).getTime();
        const endTimestamp = new Date(c.end_date).getTime();
        const hasValidDates = Number.isFinite(startTimestamp) && Number.isFinite(endTimestamp) && endTimestamp >= startTimestamp;
        const totalDuration = hasValidDates ? Math.max(1, Math.ceil((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24))) : 1;
        const elapsed = hasValidDates ? Math.max(0, Math.ceil((Date.now() - startTimestamp) / (1000 * 60 * 60 * 24))) : 0;
        const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
        const progressColor = progress >= 90 ? 'bg-rose-500' : progress >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

        content.innerHTML = `
            <div class="flex min-w-0 items-start justify-between gap-3 mb-4">
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${typeInfo.color}"><i class="${typeInfo.icon}"></i>${typeInfo.text}</span>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.classes}">${badge.text}</span>
                </div>
                <span class="shrink-0 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">${escapeHtml(c.code)}</span>
            </div>

            <h4 class="min-w-0 break-words text-lg font-bold text-slate-800 dark:text-white mb-1">${escapeHtml(c.name)}</h4>
            ${c.contract_number ? `<p class="text-xs text-slate-500 mb-4">Số HĐ gốc: <span class="font-mono font-semibold">${escapeHtml(c.contract_number)}</span></p>` : ''}

            <!-- Timeline Progress -->
            <div class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-700">
                <div class="flex items-center justify-between text-xs mb-2">
                    <span class="text-slate-500 dark:text-slate-400">Tiến độ hợp đồng</span>
                    <span class="font-bold ${progress >= 90 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}">${progress}%${daysHtml ? ` • ${daysHtml}` : ''}</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div class="${progressColor} h-2.5 rounded-full transition-all" style="width: ${progress}%"></div>
                </div>
                <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>${formatDateSafe(c.start_date)}</span>
                    <span>${formatDateSafe(c.end_date)}</span>
                </div>
            </div>

            <!-- Info Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div class="min-w-0 space-y-3">
                    <div class="min-w-0"><span class="block text-slate-400 mb-0.5 font-medium">Nhà cung cấp</span><span class="block min-w-0 break-words font-semibold text-slate-800 dark:text-white">${escapeHtml(c.provider)}</span></div>
                    <div class="min-w-0"><span class="block text-slate-400 mb-0.5 font-medium">Liên hệ</span><span class="block min-w-0 break-words text-slate-700 dark:text-slate-200">${escapeHtml(c.provider_contact || '—')}</span></div>
                    <div class="min-w-0"><span class="block text-slate-400 mb-0.5 font-medium">Email</span><span class="block min-w-0 break-all text-indigo-600 dark:text-indigo-400">${c.provider_email ? `<a href="mailto:${escapeHtml(c.provider_email)}" class="hover:underline">${escapeHtml(c.provider_email)}</a>` : '—'}</span></div>
                </div>
                <div class="min-w-0 space-y-3">
                    <div><span class="block text-slate-400 mb-0.5 font-medium">Chi phí</span><span class="font-bold text-emerald-600 dark:text-emerald-400">${formatCurrency(c.cost)}${c.cost_period === 'monthly' ? ' / tháng' : c.cost_period === 'yearly' ? ' / năm' : ''}</span></div>
                    <div class="min-w-0"><span class="block text-slate-400 mb-0.5 font-medium">Kỳ thanh toán</span><span class="block min-w-0 break-words text-slate-700 dark:text-slate-200">${PAYMENT_CYCLES[c.payment_cycle] || c.payment_cycle || '—'}</span></div>
                    <div><span class="block text-slate-400 mb-0.5 font-medium">Tự động gia hạn</span><span class="${c.auto_renew ? 'text-emerald-600 font-semibold' : 'text-slate-400'}">${c.auto_renew ? '✓ Có' : '✗ Không'}</span></div>
                </div>
            </div>

            ${c.notes ? `<div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"><span class="block text-xs text-slate-400 font-medium mb-1">Ghi chú</span><p class="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">${escapeHtml(c.notes)}</p></div>` : ''}
            ${c.attachments?.length ? `<div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"><span class="block text-xs text-slate-400 font-medium mb-1">Tệp đính kèm</span><div class="space-y-1">${c.attachments.map(a => `<a href="${a.data_url}" download="${escapeHtml(a.name)}" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5"><i class="fa-solid fa-paperclip"></i>${escapeHtml(a.name)}</a>`).join('')}</div></div>` : ''}

            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                <button type="button" class="close-modal px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-semibold transition-colors" onclick="QLTSPageContracts.closeModal('contractDetailModal')">Đóng</button>
                <button type="button" onclick="QLTSPageContracts.closeModal('contractDetailModal'); QLTSPageContracts.editContract(${c.id});" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"><i class="fa-solid fa-pen-to-square"></i> Chỉnh sửa</button>
            </div>
        `;

        openModal('contractDetailModal');
    }

    // ==========================================
    // DELETE
    // ==========================================
    function deleteContract(contractId) {
        const contracts = loadContracts();
        const c = contracts.find(x => x.id === contractId);
        if (!c) return;

        pendingDeleteId = contractId;
        const msg = `Bạn có chắc chắn muốn xóa hợp đồng "${c.name}" (${c.code})? Hành động này không thể hoàn tác.`;

        if (typeof window.showConfirmationModal === 'function') {
            window.showConfirmationModal(msg, () => {
                confirmDelete(contractId);
            }, 'Xóa hợp đồng');
        } else {
            const titleEl = document.getElementById('confirmationModalTitle');
            const msgEl = document.getElementById('confirmationModalMessage');
            if (titleEl) titleEl.textContent = 'Xóa hợp đồng';
            if (msgEl) msgEl.textContent = msg;
            openModal('confirmationModal');
        }
    }

    function confirmDelete(contractId) {
        const targetId = contractId || pendingDeleteId;
        if (!targetId) return;
        pendingDeleteId = null;

        let contracts = loadContracts();
        const c = contracts.find(x => x.id === targetId);
        contracts = contracts.filter(x => x.id !== targetId);
        const saved = saveContracts(contracts);
        if (saved) {
            closeModal('confirmationModal');
            populateProviderFilter();
            applyFilters();

            if (c && typeof window.logActivity === 'function') {
                window.logActivity('Xóa hợp đồng', c.name);
            }
            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal(`Đã xóa hợp đồng "${c ? c.name : ''}" thành công.`, 'Đã xóa');
            }
        }
    }

    // ==========================================
    // EXPORT EXCEL
    // ==========================================
    function exportExcel() {
        const contracts = loadContracts();
        if (!contracts.length) {
            alert('Chưa có hợp đồng nào để xuất.');
            return;
        }

        const rows = contracts.map(c => ({
            'Mã HĐ': c.code,
            'Tên hợp đồng': c.name,
            'Loại': (CONTRACT_TYPES[c.contract_type] || {}).text || c.contract_type,
            'Nhà cung cấp': c.provider,
            'Số HĐ gốc': c.contract_number,
            'Liên hệ': c.provider_contact,
            'Email NCC': c.provider_email,
            'Ngày ký': c.sign_date,
            'Ngày hiệu lực': c.start_date,
            'Ngày hết hạn': c.end_date,
            'Chi phí (VND)': c.cost,
            'Kỳ thanh toán': PAYMENT_CYCLES[c.payment_cycle] || c.payment_cycle,
            'Tự động gia hạn': c.auto_renew ? 'Có' : 'Không',
            'Trạng thái': getStatusBadge(computeStatus(c)).text,
            'Ghi chú': c.notes
        }));

        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Hợp đồng');
            const date = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `Hop_dong_CNTT_${date}.xlsx`);
        } else {
            alert('Thư viện XLSX chưa được tải. Không thể xuất Excel.');
        }
    }

    // ==========================================
    // EVENT BINDING
    // ==========================================
    function bindEvents() {
        // Add button
        const btnAdd = document.getElementById('btnAddContract');
        if (btnAdd) btnAdd.addEventListener('click', () => openFormModal(null));

        // Form submit
        const form = document.getElementById('contractForm');
        if (form) form.addEventListener('submit', handleFormSubmit);

        // Filters
        ['filterContractType', 'filterContractStatus', 'filterContractProvider'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', applyFilters);
        });

        const searchInput = document.getElementById('contractSearchInput');
        if (searchInput) {
            let timer;
            searchInput.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(applyFilters, 250);
            });
        }

        // Export
        const btnExport = document.getElementById('btnExportContracts');
        if (btnExport) btnExport.addEventListener('click', exportExcel);

        // Stat card click: filter expiring
        const cardExpiring = document.getElementById('cardExpiringContractsPage');
        if (cardExpiring) cardExpiring.addEventListener('click', () => {
            const filterEl = document.getElementById('filterContractStatus');
            if (filterEl) { filterEl.value = 'expiring'; applyFilters(); }
        });

        const cardExpired = document.getElementById('cardExpiredContractsPage');
        if (cardExpired) cardExpired.addEventListener('click', () => {
            const filterEl = document.getElementById('filterContractStatus');
            if (filterEl) { filterEl.value = 'expired'; applyFilters(); }
        });

        const cardTotal = document.getElementById('cardTotalContractsPage');
        if (cardTotal) cardTotal.addEventListener('click', clearFilters);

        const cardActive = document.getElementById('cardActiveContractsPage');
        if (cardActive) cardActive.addEventListener('click', () => {
            const filterEl = document.getElementById('filterContractStatus');
            if (filterEl) { filterEl.value = 'active'; applyFilters(); }
        });

        const clearButton = document.getElementById('btnClearContractFilters');
        if (clearButton) clearButton.addEventListener('click', clearFilters);

        // Table row click -> detail
        const tbody = document.getElementById('contractTableBody');
        if (tbody) tbody.addEventListener('click', (e) => {
            const row = e.target.closest('tr[data-contract-id]');
            if (!row) return;
            // Don't open detail if clicking action buttons or inputs
            if (e.target.closest('button, a, input, select')) return;
            const id = parseInt(row.dataset.contractId);
            if (id) openDetailModal(id);
        });

        // Close modals on close button click
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = btn.closest('#contractFormModal, #contractDetailModal, #confirmationModal, #infoModal, #globalSearchModal, [id$="Modal"]');
                if (modal) {
                    closeModal(modal.id);
                }
            });
        });

        // Backdrop click to close (with mousedown tracking)
        ['contractFormModal', 'contractDetailModal', 'confirmationModal', 'infoModal', 'globalSearchModal'].forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.addEventListener('mousedown', (e) => {
                    modal._mouseDownTarget = e.target;
                });
                modal.addEventListener('click', (e) => {
                    if (e.target === modal && modal._mouseDownTarget === modal) {
                        closeModal(id);
                    }
                });
            }
        });

        // Confirm delete fallback button
        const btnConfirm = document.getElementById('btnConfirmAction');
        if (btnConfirm) {
            btnConfirm.addEventListener('click', () => {
                if (pendingDeleteId) {
                    confirmDelete(pendingDeleteId);
                }
            });
        }

        // Escape key handler on this page
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modalOrder = ['infoModal', 'confirmationModal', 'globalSearchModal', 'contractDetailModal', 'contractFormModal'];
                for (const id of modalOrder) {
                    const modal = document.getElementById(id);
                    if (modal && !modal.classList.contains('hidden') && window.getComputedStyle(modal).display !== 'none') {
                        e.preventDefault();
                        closeModal(id);
                        return;
                    }
                }
            }
        });
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    window.QLTSPageContracts.editContract = function (id) {
        const contracts = loadContracts();
        const c = contracts.find(x => x.id === id);
        if (c) openFormModal(c);
    };

    window.QLTSPageContracts.deleteContract = deleteContract;
    window.QLTSPageContracts.closeModal = closeModal;

    window.QLTSPageContracts.goToPage = function (page) {
        currentPage = page;
        renderTable();
    };

    // ==========================================
    // INIT
    // ==========================================
    bindEvents();
    populateProviderFilter();
    applyFilters();
    console.log('QLTSPageContracts: initialized');
};

// Auto-init when on contracts page
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const page = (window.location.pathname.split('/').pop() || '').toLowerCase();
        if (page === 'contracts.html' || page === 'contracts') {
            if (window.QLTSPageContracts && window.QLTSPageContracts.init) {
                // Wait for LocalDB
                const waitForDB = setInterval(() => {
                    if (typeof LocalDB !== 'undefined') {
                        clearInterval(waitForDB);
                        window.QLTSPageContracts.init();
                    }
                }, 50);
                setTimeout(() => clearInterval(waitForDB), 5000);
            }
        }
    });
}
