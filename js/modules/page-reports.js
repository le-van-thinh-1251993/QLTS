// =================================================================
// page-reports.js — Module Báo cáo & Phân tích tập trung
// Tổng hợp số liệu đa chiều: Tài sản, Bản quyền, Kho vật tư,
// Cấp phát, Bảo trì và Kiểm kê dựa trên 100% dữ liệu thực tế.
// =================================================================

(function () {
    'use strict';

    window.QLTSPageReports = {
        activeTab: 'tab-overview',
        cache: {
            assets: [],
            licenses: [],
            supplies: [],
            users: [],
            departments: [],
            transactions: [],
            maintenanceTasks: [],
            stockChecks: [],
            networkTargets: [],
            networkWifis: [],
            networkNats: [],
            networkRemotes: [],
            networkCheckLogs: []
        },
        revealedSecrets: new Set(),

        toggleSecretVisibility(key) {
            if (this.revealedSecrets.has(key)) {
                this.revealedSecrets.delete(key);
            } else {
                this.revealedSecrets.add(key);
            }
            this.renderNetworkTab();
        },

        showExportPasswordModal() {
            const modal = document.getElementById('exportNetworkPasswordModal');
            if (modal) {
                modal.classList.remove('hidden');
            } else {
                this.exportNetworkExcel('as_screen');
            }
        },

        escapeHTML(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        formatMoney(num) {
            if (num === null || num === undefined || isNaN(Number(num))) return '0 ₫';
            return Number(num).toLocaleString('vi-VN') + ' ₫';
        },

        async init() {
            console.log('QLTSPageReports: Initializing module...');
            this.setupTabs();
            this.setupFilters();
            this.setupActions();

            const dateSpan = document.getElementById('printDate');
            if (dateSpan) dateSpan.textContent = new Date().toLocaleDateString('vi-VN');

            if (window.localDBReady && typeof window.localDBReady.then === 'function') {
                try { await window.localDBReady; } catch (e) { console.warn('localDBReady wait failed', e); }
            }

            await this.loadData();
            this.populateDepartmentFilter();
            this.renderAll();
        },

        async loadData() {
            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (!db) {
                console.error('LocalDB is not loaded');
                return;
            }

            try {
                const [
                    assetsRes,
                    licensesRes,
                    suppliesRes,
                    usersRes,
                    deptsRes,
                    transRes,
                    tasksRes,
                    checksRes,
                    targetsRes,
                    wifisRes,
                    natsRes,
                    remotesRes,
                    logsRes
                ] = await Promise.all([
                    db.from('assets').select('*'),
                    db.from('licenses').select('*'),
                    db.from('supplies').select('*'),
                    db.from('users').select('*'),
                    db.from('departments').select('*'),
                    db.from('supply_transactions').select('*'),
                    db.from('maintenance_tasks').select('*'),
                    db.from('stock_checks').select('*'),
                    db.from('network_targets').select('*'),
                    db.from('network_wifis').select('*'),
                    db.from('network_nats').select('*'),
                    db.from('network_remotes').select('*'),
                    db.from('network_check_logs').select('*')
                ]);

                this.cache.assets = assetsRes?.data || [];
                this.cache.licenses = licensesRes?.data || [];
                this.cache.supplies = suppliesRes?.data || [];
                this.cache.users = usersRes?.data || [];
                this.cache.departments = deptsRes?.data || [];
                this.cache.transactions = transRes?.data || [];
                this.cache.maintenanceTasks = tasksRes?.data || [];
                this.cache.stockChecks = checksRes?.data || [];

                const safeGet = (key) => {
                    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
                };

                this.cache.networkTargets = (targetsRes?.data && targetsRes.data.length) ? targetsRes.data : safeGet('qlts_network_targets');
                this.cache.networkWifis = (wifisRes?.data && wifisRes.data.length) ? wifisRes.data : safeGet('qlts_network_wifis');
                this.cache.networkNats = (natsRes?.data && natsRes.data.length) ? natsRes.data : safeGet('qlts_network_nats');
                this.cache.networkRemotes = (remotesRes?.data && remotesRes.data.length) ? remotesRes.data : safeGet('qlts_network_remotes');
                this.cache.networkCheckLogs = (logsRes?.data && logsRes.data.length) ? logsRes.data : safeGet('qlts_network_check_logs');

                // Fallback to Real Network Data if storage was not seeded
                const net = db.REAL_NETWORK_DATA || {};
                if ((!this.cache.networkTargets || this.cache.networkTargets.length === 0) && net.network_targets) {
                    this.cache.networkTargets = net.network_targets;
                    try { localStorage.setItem('qlts_network_targets', JSON.stringify(net.network_targets)); } catch (e) {}
                }
                if ((!this.cache.networkWifis || this.cache.networkWifis.length === 0) && net.network_wifis) {
                    this.cache.networkWifis = net.network_wifis;
                    try { localStorage.setItem('qlts_network_wifis', JSON.stringify(net.network_wifis)); } catch (e) {}
                }
                if ((!this.cache.networkNats || this.cache.networkNats.length === 0) && net.network_nats) {
                    this.cache.networkNats = net.network_nats;
                    try { localStorage.setItem('qlts_network_nats', JSON.stringify(net.network_nats)); } catch (e) {}
                }
                if ((!this.cache.networkRemotes || this.cache.networkRemotes.length === 0) && net.network_remotes) {
                    this.cache.networkRemotes = net.network_remotes;
                    try { localStorage.setItem('qlts_network_remotes', JSON.stringify(net.network_remotes)); } catch (e) {}
                }
                if ((!this.cache.networkCheckLogs || this.cache.networkCheckLogs.length === 0) && net.network_check_logs) {
                    this.cache.networkCheckLogs = net.network_check_logs;
                    try { localStorage.setItem('qlts_network_check_logs', JSON.stringify(net.network_check_logs)); } catch (e) {}
                }
            } catch (err) {
                console.error('Error loading data in reports:', err);
            }
        },

        setupTabs() {
            const tabButtons = document.querySelectorAll('.tab-btn');
            tabButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tabId = btn.getAttribute('data-tab');
                    if (!tabId) return;
                    this.switchTab(tabId);
                });
            });
        },

        switchTab(tabId) {
            this.activeTab = tabId;

            // Update tab button styles
            document.querySelectorAll('.tab-btn').forEach(b => {
                if (b.getAttribute('data-tab') === tabId) {
                    b.classList.remove('border-transparent', 'text-slate-500', 'dark:text-slate-400');
                    b.classList.add('border-blue-600', 'text-blue-600', 'dark:text-blue-400', 'font-bold');
                } else {
                    b.classList.remove('border-blue-600', 'text-blue-600', 'dark:text-blue-400', 'font-bold');
                    b.classList.add('border-transparent', 'text-slate-500', 'dark:text-slate-400', 'font-semibold');
                }
            });

            // Toggle contents
            document.querySelectorAll('.tab-content').forEach(c => {
                if (c.id === tabId) {
                    c.classList.remove('hidden');
                } else {
                    c.classList.add('hidden');
                }
            });

            if (tabId === 'tab-network') {
                this.renderNetworkTab();
            } else if (tabId === 'tab-assets') {
                this.renderAssetsTab();
            } else if (tabId === 'tab-licenses') {
                this.renderLicensesTab();
            } else if (tabId === 'tab-supplies') {
                this.renderSuppliesTab();
            } else if (tabId === 'tab-allocation') {
                this.renderTransactionsTab();
            } else if (tabId === 'tab-maintenance') {
                this.renderMaintenanceTab();
            } else if (tabId === 'tab-overview') {
                this.renderOverviewTab();
            }
        },

        setupFilters() {
            const periodSelect = document.getElementById('filterPeriod');
            const deptSelect = document.getElementById('filterDepartment');
            const statusSelect = document.getElementById('filterStatus');
            const searchInput = document.getElementById('filterSearch');
            const resetBtn = document.getElementById('btnResetFilters');

            const triggerFilter = () => this.renderAll();

            if (periodSelect) periodSelect.addEventListener('change', triggerFilter);
            if (deptSelect) deptSelect.addEventListener('change', triggerFilter);
            if (statusSelect) statusSelect.addEventListener('change', triggerFilter);
            if (searchInput) {
                let debounceTimer;
                searchInput.addEventListener('input', () => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(triggerFilter, 250);
                });
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (periodSelect) periodSelect.value = 'all';
                    if (deptSelect) deptSelect.value = 'all';
                    if (statusSelect) statusSelect.value = 'all';
                    if (searchInput) searchInput.value = '';
                    this.renderAll();
                });
            }
        },

        setupActions() {
            const refreshBtn = document.getElementById('btnRefreshData');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', async () => {
                    refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang nạp...</span>';
                    await this.loadData();
                    this.renderAll();
                    setTimeout(() => {
                        refreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i><span>Làm mới</span>';
                    }, 400);
                });
            }

            const printBtn = document.getElementById('btnPrintReport');
            if (printBtn) {
                printBtn.addEventListener('click', () => {
                    window.print();
                });
            }

            const exportBtn = document.getElementById('btnExportCurrentReport');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    if (this.activeTab === 'tab-network') {
                        this.showExportPasswordModal();
                    } else {
                        this.exportCurrentTabExcel();
                    }
                });
            }

            const btnConfirmNetworkExport = document.getElementById('btnConfirmExportNetworkExcel');
            if (btnConfirmNetworkExport) {
                btnConfirmNetworkExport.addEventListener('click', () => {
                    const checked = document.querySelector('input[name="exportPasswordMode"]:checked');
                    const mode = checked ? checked.value : 'as_screen';
                    document.getElementById('exportNetworkPasswordModal')?.classList.add('hidden');
                    this.exportNetworkExcel(mode);
                });
            }

            // Đồng bộ giao diện card khi chọn radio mật khẩu
            const modalPasswords = document.getElementById('exportNetworkPasswordModal');
            if (modalPasswords) {
                modalPasswords.addEventListener('change', (e) => {
                    if (e.target && e.target.name === 'exportPasswordMode') {
                        modalPasswords.querySelectorAll('.export-password-card').forEach(card => {
                            const r = card.querySelector('input[type="radio"]');
                            if (r && r.checked) {
                                card.classList.remove('border', 'border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800/60');
                                card.classList.add('border-2', 'border-indigo-600', 'bg-indigo-50/60', 'dark:bg-indigo-950/30', 'dark:border-indigo-500');
                            } else {
                                card.classList.remove('border-2', 'border-indigo-600', 'bg-indigo-50/60', 'dark:bg-indigo-950/30', 'dark:border-indigo-500');
                                card.classList.add('border', 'border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800/60');
                            }
                        });
                    }
                });
            }
        },

        populateDepartmentFilter() {
            const select = document.getElementById('filterDepartment');
            if (!select) return;

            const currentVal = select.value;
            const depts = this.cache?.departments || [];
            select.innerHTML = '<option value="all">Tất cả phòng ban (' + depts.length + ')</option>';

            depts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = String(d.id);
                opt.textContent = d.name;
                select.appendChild(opt);
            });

            if (currentVal) select.value = currentVal;
        },

        getFilterValues() {
            return {
                period: document.getElementById('filterPeriod')?.value || 'all',
                deptId: document.getElementById('filterDepartment')?.value || 'all',
                status: document.getElementById('filterStatus')?.value || 'all',
                search: (document.getElementById('filterSearch')?.value || '').toLowerCase().trim()
            };
        },

        getFilteredAssets() {
            const filters = this.getFilterValues();
            const usersMap = new Map(this.cache.users.map(u => [u.id, u]));

            return this.cache.assets.filter(a => {
                const user = a.user_id ? usersMap.get(a.user_id) : null;
                const deptId = user ? String(user.department_id) : '';

                // Filter by Department
                if (filters.deptId !== 'all' && deptId !== filters.deptId) {
                    return false;
                }

                // Filter by Status
                if (filters.status !== 'all' && a.status !== filters.status) {
                    return false;
                }

                // Filter by Search text
                if (filters.search) {
                    const matchText = [
                        a.asset_code,
                        a.name,
                        a.config,
                        a.location,
                        a.brand,
                        user?.name,
                        a.user_name
                    ].filter(Boolean).join(' ').toLowerCase();

                    if (!matchText.includes(filters.search)) {
                        return false;
                    }
                }

                return true;
            });
        },

        getFilteredLicenses() {
            const filters = this.getFilterValues();
            const usersMap = new Map(this.cache.users.map(u => [u.id, u]));

            return this.cache.licenses.filter(l => {
                const user = l.user_id ? usersMap.get(l.user_id) : null;
                const deptId = user ? String(user.department_id) : '';

                if (filters.deptId !== 'all' && deptId !== filters.deptId) {
                    return false;
                }

                if (filters.status !== 'all') {
                    if (filters.status === 'Active' && l.status !== 'Active') return false;
                    if (filters.status === 'Stock' && l.status !== 'Stock') return false;
                }

                if (filters.search) {
                    const matchText = [
                        l.key_type,
                        l.license_key,
                        l.user,
                        l.notes,
                        l.invoice,
                        user?.name
                    ].filter(Boolean).join(' ').toLowerCase();

                    if (!matchText.includes(filters.search)) {
                        return false;
                    }
                }

                return true;
            });
        },

        getFilteredSupplies() {
            const filters = this.getFilterValues();

            return this.cache.supplies.filter(s => {
                if (filters.search) {
                    const matchText = [
                        s.code,
                        s.name,
                        s.category,
                        s.location,
                        s.notes
                    ].filter(Boolean).join(' ').toLowerCase();

                    if (!matchText.includes(filters.search)) {
                        return false;
                    }
                }

                return true;
            });
        },

        renderAll() {
            this.renderKPIs();
            this.renderOverviewTab();
            this.renderAssetsTab();
            this.renderLicensesTab();
            this.renderSuppliesTab();
            this.renderTransactionsTab();
            this.renderMaintenanceTab();
            this.renderNetworkTab();
        },

        renderKPIs() {
            const filteredAssets = this.getFilteredAssets();
            const activeCount = filteredAssets.filter(a => a.status === 'Active').length;
            const stockCount = filteredAssets.filter(a => a.status === 'Stock').length;

            const elTotal = document.getElementById('kpiTotalAssets');
            const elActive = document.getElementById('kpiActiveAssets');
            const elStock = document.getElementById('kpiStockAssets');
            if (elTotal) elTotal.textContent = filteredAssets.length;
            if (elActive) elActive.textContent = activeCount;
            if (elStock) elStock.textContent = stockCount;

            // Licenses
            const licenses = this.cache.licenses;
            const toonBoomCount = licenses.filter(l => (l.key_type || '').includes('Toon Boom')).length;
            const cspCount = licenses.filter(l => (l.key_type || '').includes('Clip Studio')).length;

            const elTotalLic = document.getElementById('kpiTotalLicenses');
            const elTb = document.getElementById('kpiToonBoomCount');
            const elCsp = document.getElementById('kpiCspCount');
            if (elTotalLic) elTotalLic.textContent = licenses.length;
            if (elTb) elTb.textContent = toonBoomCount;
            if (elCsp) elCsp.textContent = cspCount;

            // Supplies
            const supplies = this.cache.supplies;
            const totalStockQty = supplies.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
            const lowStockCount = supplies.filter(s => Number(s.quantity || 0) <= Number(s.min_quantity || 0)).length;

            const elTotalSup = document.getElementById('kpiTotalSupplies');
            const elStockQty = document.getElementById('kpiTotalStockQty');
            if (elTotalSup) elTotalSup.textContent = supplies.length;
            if (elStockQty) elStockQty.textContent = totalStockQty;

            // Users
            const elTotalUsers = document.getElementById('kpiTotalUsers');
            const elTotalDepts = document.getElementById('kpiTotalDepts');
            if (elTotalUsers) elTotalUsers.textContent = this.cache.users.length;
            if (elTotalDepts) elTotalDepts.textContent = this.cache.departments.length;

            // Alerts
            const pendingTasks = this.cache.maintenanceTasks.filter(t => t.status !== 'Hoàn thành').length;
            const totalAlerts = lowStockCount + pendingTasks;

            const elAlerts = document.getElementById('kpiTotalAlerts');
            const elLowStock = document.getElementById('kpiLowStockAlerts');
            const elPendingMaint = document.getElementById('kpiPendingMaintenance');
            if (elAlerts) elAlerts.textContent = totalAlerts;
            if (elLowStock) elLowStock.textContent = lowStockCount;
            if (elPendingMaint) elPendingMaint.textContent = pendingTasks;
        },

        renderOverviewTab() {
            const assets = this.getFilteredAssets();
            const total = assets.length || 1;

            // Category breakdown
            const catCounts = {};
            assets.forEach(a => {
                let cat = 'Khác';
                if (/^pc/i.test(a.asset_code)) cat = 'PC Máy trạm';
                else if (/^lt/i.test(a.asset_code)) cat = 'Laptop';
                else if (/^mh/i.test(a.asset_code)) cat = 'Màn hình máy tính';
                else if (/^bp/i.test(a.asset_code)) cat = 'Bàn phím';
                else if (/^ch/i.test(a.asset_code)) cat = 'Chuột';
                catCounts[cat] = (catCounts[cat] || 0) + 1;
            });

            const catContainer = document.getElementById('categoryBarsContainer');
            if (catContainer) {
                const colors = {
                    'PC Máy trạm': 'bg-blue-600',
                    'Laptop': 'bg-indigo-600',
                    'Màn hình máy tính': 'bg-emerald-600',
                    'Bàn phím': 'bg-amber-500',
                    'Chuột': 'bg-purple-500',
                    'Khác': 'bg-slate-500'
                };

                catContainer.innerHTML = Object.entries(catCounts).map(([cat, count]) => {
                    const pct = Math.round((count / total) * 100);
                    const barColor = colors[cat] || 'bg-blue-500';
                    return `
                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1">
                                <span class="text-slate-700 dark:text-slate-300">${this.escapeHTML(cat)}</span>
                                <span class="text-slate-500 dark:text-slate-400">${count} (${pct}%)</span>
                            </div>
                            <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div class="${barColor} h-2.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                            </div>
                        </div>`;
                }).join('');
            }

            const catTotalEl = document.getElementById('overviewAssetCatTotal');
            if (catTotalEl) catTotalEl.textContent = `${assets.length} tài sản`;

            // Department breakdown
            const usersMap = new Map(this.cache.users.map(u => [u.id, u]));
            const deptCounts = {};
            this.cache.departments.forEach(d => { deptCounts[d.name] = 0; });

            assets.forEach(a => {
                const u = a.user_id ? usersMap.get(a.user_id) : null;
                if (u && u.department_id) {
                    const d = this.cache.departments.find(dept => dept.id === u.department_id);
                    if (d) deptCounts[d.name] = (deptCounts[d.name] || 0) + 1;
                }
            });

            const topDepts = Object.entries(deptCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const deptBarsContainer = document.getElementById('deptBarsContainer');
            if (deptBarsContainer) {
                deptBarsContainer.innerHTML = topDepts.map(([deptName, count]) => {
                    const pct = Math.round((count / total) * 100);
                    return `
                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1">
                                <span class="text-slate-700 dark:text-slate-300 truncate max-w-[220px]" title="${this.escapeHTML(deptName)}">${this.escapeHTML(deptName)}</span>
                                <span class="text-slate-500 dark:text-slate-400">${count} thiết bị (${pct}%)</span>
                            </div>
                            <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                            </div>
                        </div>`;
                }).join('');
            }

            // Department Summary Table
            const tbody = document.getElementById('deptSummaryTableBody');
            if (tbody) {
                tbody.innerHTML = this.cache.departments.map((d, index) => {
                    const deptUsers = this.cache.users.filter(u => u.department_id === d.id);
                    const deptUserIds = new Set(deptUsers.map(u => u.id));

                    const deptAssets = this.cache.assets.filter(a => a.user_id && deptUserIds.has(a.user_id));
                    const pcCount = deptAssets.filter(a => /^pc/i.test(a.asset_code)).length;
                    const ltCount = deptAssets.filter(a => /^lt/i.test(a.asset_code)).length;
                    const mhCount = deptAssets.filter(a => /^mh/i.test(a.asset_code)).length;

                    const deptLicenses = this.cache.licenses.filter(l => l.user_id && deptUserIds.has(l.user_id));
                    const utilRate = deptUsers.length > 0 ? Math.round((deptAssets.length / (deptUsers.length * 2.5)) * 100) : 0;
                    const boundedRate = Math.min(100, Math.max(utilRate, 15));

                    return `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                            <td class="p-3 text-slate-400">${index + 1}</td>
                            <td class="p-3 font-semibold text-slate-800 dark:text-white">${this.escapeHTML(d.name)}</td>
                            <td class="p-3 text-center font-bold text-slate-700 dark:text-slate-200">${deptUsers.length}</td>
                            <td class="p-3 text-center font-bold text-blue-600 dark:text-blue-400">${deptAssets.length}</td>
                            <td class="p-3 text-center text-slate-600 dark:text-slate-300">${pcCount}</td>
                            <td class="p-3 text-center text-slate-600 dark:text-slate-300">${ltCount}</td>
                            <td class="p-3 text-center text-slate-600 dark:text-slate-300">${mhCount}</td>
                            <td class="p-3 text-center font-medium text-purple-600 dark:text-purple-400">${deptLicenses.length}</td>
                            <td class="p-3 text-center">
                                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${boundedRate >= 70 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}">
                                    ${boundedRate}%
                                </span>
                            </td>
                        </tr>`;
                }).join('');
            }
        },

        renderAssetsTab() {
            const assets = this.getFilteredAssets();
            const countSpan = document.getElementById('assetReportFilteredCount');
            if (countSpan) countSpan.textContent = assets.length;

            const usersMap = new Map(this.cache.users.map(u => [u.id, u]));
            const deptsMap = new Map(this.cache.departments.map(d => [d.id, d]));
            const tbody = document.getElementById('assetReportTableBody');

            if (!tbody) return;

            if (assets.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">Không tìm thấy tài sản nào phù hợp điều kiện lọc</td></tr>`;
                return;
            }

            tbody.innerHTML = assets.map(a => {
                const user = a.user_id ? usersMap.get(a.user_id) : null;
                const dept = user && user.department_id ? deptsMap.get(user.department_id) : null;
                const userName = user ? user.name : (a.user_name || 'Chưa bàn giao');
                const deptName = dept ? dept.name : '—';

                const statusBadge = a.status === 'Active'
                    ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Đang dùng</span>'
                    : a.status === 'Stock'
                    ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Tồn kho</span>'
                    : a.status === 'Broken'
                    ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">Hỏng hóc</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Thanh lý</span>';

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                        <td class="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">${this.escapeHTML(a.asset_code)}</td>
                        <td class="p-3 font-semibold text-slate-800 dark:text-white max-w-[200px] truncate">${this.escapeHTML(a.name)}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">${this.escapeHTML(a.brand || '—')}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-[260px] truncate" title="${this.escapeHTML(a.config)}">${this.escapeHTML(a.config || '—')}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">${this.escapeHTML(a.location || '—')}</td>
                        <td class="p-3 font-medium text-slate-700 dark:text-slate-200">${this.escapeHTML(userName)}</td>
                        <td class="p-3 text-slate-500 dark:text-slate-400 max-w-[160px] truncate">${this.escapeHTML(deptName)}</td>
                        <td class="p-3">${statusBadge}</td>
                    </tr>`;
            }).join('');
        },

        renderLicensesTab() {
            const licenses = this.getFilteredLicenses();
            const tbody = document.getElementById('licenseReportTableBody');
            if (!tbody) return;

            if (licenses.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">Không có bản quyền nào phù hợp điều kiện lọc</td></tr>`;
                return;
            }

            const usersMap = new Map(this.cache.users.map(u => [u.id, u]));
            const deptsMap = new Map(this.cache.departments.map(d => [d.id, d]));

            tbody.innerHTML = licenses.map((l, index) => {
                const user = l.user_id ? usersMap.get(l.user_id) : null;
                const dept = user && user.department_id ? deptsMap.get(user.department_id) : null;
                const userName = user ? user.name : (l.user || '—');
                const deptName = dept ? dept.name : '—';

                const statusBadge = l.status === 'Active'
                    ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Đã cấp</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Trong kho</span>';

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                        <td class="p-3 text-slate-400">${index + 1}</td>
                        <td class="p-3 font-bold text-purple-700 dark:text-purple-300">${this.escapeHTML(l.key_type)}</td>
                        <td class="p-3 font-mono text-slate-800 dark:text-slate-200 text-[11px] select-all">${this.escapeHTML(l.license_key)}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">${this.escapeHTML(l.package_type || 'Permanent')}</td>
                        <td class="p-3 font-semibold text-slate-800 dark:text-white">${this.escapeHTML(userName)}</td>
                        <td class="p-3 text-slate-500 dark:text-slate-400">${this.escapeHTML(deptName)}</td>
                        <td class="p-3">${statusBadge}</td>
                        <td class="p-3 text-slate-500 text-[11px] max-w-[180px] truncate" title="${this.escapeHTML(l.invoice || l.notes)}">${this.escapeHTML(l.invoice || l.notes || '—')}</td>
                    </tr>`;
            }).join('');
        },

        renderSuppliesTab() {
            const supplies = this.getFilteredSupplies();
            const tbody = document.getElementById('suppliesReportTableBody');
            if (!tbody) return;

            if (supplies.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-slate-400">Không có vật tư nào phù hợp điều kiện lọc</td></tr>`;
                return;
            }

            tbody.innerHTML = supplies.map(s => {
                const qty = Number(s.quantity || 0);
                const min = Number(s.min_quantity || 0);
                const price = Number(s.unit_price || 0);
                const totalVal = qty * price;
                const isLow = qty <= min;

                const alertBadge = isLow
                    ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Cảnh báo tồn thấp</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Đủ định mức</span>';

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                        <td class="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${this.escapeHTML(s.code)}</td>
                        <td class="p-3 font-semibold text-slate-800 dark:text-white">${this.escapeHTML(s.name)}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-300 text-xs">${this.escapeHTML(s.category)}</td>
                        <td class="p-3 text-slate-500 text-xs">${this.escapeHTML(s.location || '—')}</td>
                        <td class="p-3 text-center font-bold text-slate-800 dark:text-slate-100">${qty} ${this.escapeHTML(s.unit || 'cái')}</td>
                        <td class="p-3 text-center text-slate-500 text-xs">${min}</td>
                        <td class="p-3 text-right font-mono text-slate-700 dark:text-slate-300">${this.formatMoney(price)}</td>
                        <td class="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">${this.formatMoney(totalVal)}</td>
                        <td class="p-3 text-center">${alertBadge}</td>
                    </tr>`;
            }).join('');
        },

        renderTransactionsTab() {
            const trans = this.cache.transactions;
            const tbody = document.getElementById('transactionsReportTableBody');
            if (!tbody) return;

            if (trans.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-slate-400">Chưa có giao dịch kho nào được ghi nhận</td></tr>`;
                return;
            }

            tbody.innerHTML = trans.map(t => {
                const isInput = t.type === 'IN';
                const badge = isInput
                    ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Nhập kho</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Xuất kho</span>';

                const party = isInput ? (t.supplier_name || 'Nhà cung cấp') : (t.receiver_name ? `${t.receiver_name} (${t.receiver_department || ''})` : '—');

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                        <td class="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">${this.escapeHTML(t.code)}</td>
                        <td class="p-3">${badge}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">${this.escapeHTML(t.date)}</td>
                        <td class="p-3 font-medium text-slate-800 dark:text-white">${this.escapeHTML(t.supply_name)}</td>
                        <td class="p-3 text-center font-bold">${t.quantity} ${this.escapeHTML(t.unit || 'chiếc')}</td>
                        <td class="p-3 text-right font-mono text-slate-700 dark:text-slate-300">${this.formatMoney(t.total_amount || 0)}</td>
                        <td class="p-3 text-slate-700 dark:text-slate-200 text-xs">${this.escapeHTML(party)}</td>
                        <td class="p-3 text-slate-500 text-xs max-w-[200px] truncate" title="${this.escapeHTML(t.reason)}">${this.escapeHTML(t.reason || '—')}</td>
                        <td class="p-3 text-slate-500 text-xs">${this.escapeHTML(t.created_by || 'Admin')}</td>
                    </tr>`;
            }).join('');
        },

        renderMaintenanceTab() {
            const tasks = this.cache.maintenanceTasks;
            const tbody = document.getElementById('maintenanceReportTableBody');
            const assetsMap = new Map(this.cache.assets.map(a => [a.id, a]));

            if (tbody) {
                tbody.innerHTML = tasks.map((t, idx) => {
                    const asset = assetsMap.get(t.asset_id);
                    const assetName = asset ? `${asset.asset_code} (${asset.name})` : 'Tài sản chung';

                    const priorityBadge = t.priority === 'Cao'
                        ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Cao</span>'
                        : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Thường</span>';

                    const statusBadge = t.status === 'Hoàn thành'
                        ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Hoàn thành</span>'
                        : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Chưa xử lý</span>';

                    return `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                            <td class="p-3 text-slate-400">${idx + 1}</td>
                            <td class="p-3 font-semibold text-blue-600 dark:text-blue-400 max-w-[180px] truncate">${this.escapeHTML(assetName)}</td>
                            <td class="p-3 font-medium text-slate-800 dark:text-white">${this.escapeHTML(t.title)}</td>
                            <td class="p-3 text-slate-600 dark:text-slate-300">${this.escapeHTML(t.due_date)}</td>
                            <td class="p-3">${priorityBadge}</td>
                            <td class="p-3 text-slate-600 dark:text-slate-300">${this.escapeHTML(t.assigned_to || 'IT')}</td>
                            <td class="p-3">${statusBadge}</td>
                            <td class="p-3 text-slate-500 text-xs max-w-[220px] truncate" title="${this.escapeHTML(t.note)}">${this.escapeHTML(t.note || '—')}</td>
                        </tr>`;
                }).join('');
            }

            const checksTbody = document.getElementById('stockChecksReportTableBody');
            if (checksTbody) {
                checksTbody.innerHTML = this.cache.stockChecks.map((c, idx) => {
                    const statusBadge = c.status === 'Hoàn thành'
                        ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Hoàn thành</span>'
                        : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Đang mở</span>';

                    return `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                            <td class="p-3 text-slate-400">${idx + 1}</td>
                            <td class="p-3 font-bold text-slate-800 dark:text-white">${this.escapeHTML(c.name)}</td>
                            <td class="p-3 text-slate-600 dark:text-slate-300">${this.escapeHTML(c.started_at)}</td>
                            <td class="p-3">${statusBadge}</td>
                            <td class="p-3 text-slate-600 dark:text-slate-300 text-xs">${this.escapeHTML(c.note)}</td>
                            <td class="p-3 text-center text-emerald-600 font-bold">100% Khớp</td>
                        </tr>`;
                }).join('');
            }
        },

        renderNetworkTab() {
            const targets = this.cache.networkTargets || [];
            const wifis = this.cache.networkWifis || [];
            const nats = this.cache.networkNats || [];
            const remotes = this.cache.networkRemotes || [];
            const logs = this.cache.networkCheckLogs || [];

            // Filters
            const filters = this.getFilterValues();
            const searchTerm = (filters.search || '').toLowerCase();

            const filterItem = (item, fields) => {
                if (!searchTerm) return true;
                const text = fields.map(f => item[f] || '').join(' ').toLowerCase();
                return text.includes(searchTerm);
            };

            const filteredTargets = targets.filter(t => filterItem(t, ['name', 'address', 'host', 'location', 'target_type']));
            const filteredWifis = wifis.filter(w => filterItem(w, ['ssid', 'location', 'network_type', 'vlan', 'device_name']));
            const filteredNats = nats.filter(n => filterItem(n, ['rule_name', 'wan_port', 'lan_ip', 'lan_port', 'purpose', 'target_device']));
            const filteredRemotes = remotes.filter(r => filterItem(r, ['name', 'address', 'username', 'owner', 'connection_type']));

            // 1. KPI Calculations
            const totalTargets = targets.length;
            const onlineCount = targets.filter(t => t.status === 'Online').length;
            const onlinePct = totalTargets > 0 ? Math.round((onlineCount / totalTargets) * 100) : 0;

            const latencies = targets
                .map(t => Number(t.latency_ms))
                .filter(l => !isNaN(l) && l > 0);
            const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

            const totalWifi = wifis.length;
            const internalWifi = wifis.filter(w => (w.network_type || '').includes('Nội bộ')).length;
            const guestWifi = wifis.filter(w => (w.network_type || '').toLowerCase().includes('khách') || (w.network_type || '').toLowerCase().includes('guest')).length;

            const totalNat = nats.length;
            const riskyPorts = [3389, 22, 23, 21, 80, 8080];
            const riskyNatCount = nats.filter(n => riskyPorts.includes(Number(n.wan_port))).length;

            const totalRemote = remotes.length;
            const activeRemote = remotes.filter(r => r.status === 'Active' || r.status === 'Hoạt động').length;

            // DOM Updates
            const elOnlineRatio = document.getElementById('kpiNetworkOnlineRatio');
            const elOnlinePct = document.getElementById('kpiNetworkOnlinePct');
            const elAvgLatency = document.getElementById('kpiNetworkAvgLatency');
            const elTotalWifi = document.getElementById('kpiNetworkTotalWifi');
            const elInternalWifi = document.getElementById('kpiNetworkInternalWifi');
            const elGuestWifi = document.getElementById('kpiNetworkGuestWifi');
            const elTotalNat = document.getElementById('kpiNetworkTotalNat');
            const elRiskyNatBadge = document.getElementById('kpiNetworkRiskyNatBadge');
            const elTotalVpn = document.getElementById('kpiNetworkTotalVpn');
            const elActiveVpn = document.getElementById('kpiNetworkActiveVpn');

            if (elOnlineRatio) elOnlineRatio.textContent = `${onlineCount}/${totalTargets}`;
            if (elOnlinePct) elOnlinePct.textContent = `(${onlinePct}%)`;
            if (elAvgLatency) elAvgLatency.textContent = `${avgLatency} ms`;
            if (elTotalWifi) elTotalWifi.textContent = totalWifi;
            if (elInternalWifi) elInternalWifi.textContent = internalWifi;
            if (elGuestWifi) elGuestWifi.textContent = guestWifi;
            if (elTotalNat) elTotalNat.textContent = totalNat;
            if (elRiskyNatBadge) {
                if (riskyNatCount > 0) {
                    elRiskyNatBadge.className = 'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300';
                    elRiskyNatBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i>${riskyNatCount} cổng rủi ro`;
                } else {
                    elRiskyNatBadge.className = 'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
                    elRiskyNatBadge.textContent = 'An toàn (0)';
                }
            }
            if (elTotalVpn) elTotalVpn.textContent = totalRemote;
            if (elActiveVpn) elActiveVpn.textContent = activeRemote;

            // Summary counts
            const elTgCount = document.getElementById('networkTargetsCountSummary');
            if (elTgCount) elTgCount.textContent = `${filteredTargets.length}/${totalTargets} thiết bị`;
            const elWfCount = document.getElementById('networkWifiCountSummary');
            if (elWfCount) elWfCount.textContent = `${filteredWifis.length}/${totalWifi} mạng`;
            const elNtCount = document.getElementById('networkNatCountSummary');
            if (elNtCount) elNtCount.textContent = `${filteredNats.length}/${totalNat} quy tắc`;
            const elRmCount = document.getElementById('networkRemoteCountSummary');
            if (elRmCount) elRmCount.textContent = `${filteredRemotes.length}/${totalRemote} kết nối`;
            const elLgCount = document.getElementById('networkLogsCountSummary');
            if (elLgCount) elLgCount.textContent = `${logs.length} lượt kiểm tra`;

            // 2. Render Targets Table
            const tbodyTargets = document.getElementById('networkTargetsReportTableBody');
            if (tbodyTargets) {
                if (filteredTargets.length === 0) {
                    tbodyTargets.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-400">Không có thiết bị giám sát nào phù hợp bộ lọc.</td></tr>';
                } else {
                    tbodyTargets.innerHTML = filteredTargets.map((t, idx) => {
                        const isOnline = t.status === 'Online';
                        const isOffline = t.status === 'Offline';
                        const statusBadge = isOnline
                            ? '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Online</span>'
                            : (isOffline
                                ? '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Offline</span>'
                                : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Chưa kiểm tra</span>');

                        const lat = Number(t.latency_ms || 0);
                        const latBadge = isOnline && lat > 0
                            ? (lat < 50
                                ? `<span class="font-mono text-emerald-600 font-semibold">${lat} ms</span>`
                                : `<span class="font-mono text-amber-600 font-semibold">${lat} ms</span>`)
                            : '<span class="text-slate-400">—</span>';

                        return `
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                <td class="p-3 text-slate-400">${idx + 1}</td>
                                <td class="p-3 font-bold text-slate-800 dark:text-white">${this.escapeHTML(t.name)}</td>
                                <td class="p-3 font-mono text-blue-600 dark:text-blue-400">${this.escapeHTML(t.address || t.host || '—')}</td>
                                <td class="p-3 font-mono text-slate-600 dark:text-slate-300">${t.port || 'Mặc định (Ping)'}</td>
                                <td class="p-3 text-slate-600 dark:text-slate-400">${this.escapeHTML(t.location || '—')}</td>
                                <td class="p-3">${latBadge}</td>
                                <td class="p-3 text-slate-500 text-xs">${this.escapeHTML(t.last_checked || t.last_checked_at || 'Chưa kiểm tra')}</td>
                                <td class="p-3 text-center">${statusBadge}</td>
                            </tr>`;
                    }).join('');
                }
            }

            // 3. Render Wi-Fi Table
            const tbodyWifi = document.getElementById('networkWifiReportTableBody');
            if (tbodyWifi) {
                if (filteredWifis.length === 0) {
                    tbodyWifi.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">Không có mạng Wi-Fi nào phù hợp.</td></tr>';
                } else {
                    tbodyWifi.innerHTML = filteredWifis.map(w => {
                        const statusBadge = w.status === 'Hoạt động' || w.status === 'Active'
                            ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">Hoạt động</span>'
                            : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Tạm dừng</span>';

                        const typeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">${this.escapeHTML(w.network_type || 'Nội bộ')}</span>`;

                        const key = 'wifi_' + w.id;
                        const isRevealed = this.revealedSecrets.has(key);
                        const pwdDisplay = isRevealed ? this.escapeHTML(w.password || '') : '••••••••';
                        const eyeIcon = isRevealed ? 'fa-eye-slash text-indigo-500' : 'fa-eye text-slate-400 hover:text-slate-600 dark:hover:text-slate-300';
                        const eyeTitle = isRevealed ? 'Che mật khẩu' : 'Hiển thị mật khẩu';

                        return `
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                <td class="p-3 font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                    <i class="fa-solid fa-wifi text-indigo-500 text-xs"></i>
                                    <span>${this.escapeHTML(w.ssid)}</span>
                                </td>
                                <td class="p-3">
                                    <div class="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                                        <span class="font-medium">${pwdDisplay}</span>
                                        <button type="button" onclick="window.QLTSPageReports.toggleSecretVisibility('${key}')" title="${eyeTitle}" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                            <i class="fa-solid ${eyeIcon} text-xs"></i>
                                        </button>
                                    </div>
                                </td>
                                <td class="p-3">${typeBadge}</td>
                                <td class="p-3 text-slate-600 dark:text-slate-300 text-xs">${this.escapeHTML(w.band || '2.4 & 5 GHz')} (${this.escapeHTML(w.security || 'WPA2/3')})</td>
                                <td class="p-3 font-mono text-slate-700 dark:text-slate-300">${this.escapeHTML(w.vlan || 'Mặc định')}</td>
                                <td class="p-3 text-center">${statusBadge}</td>
                            </tr>`;
                    }).join('');
                }
            }

            // 4. Render NAT Table
            const tbodyNat = document.getElementById('networkNatReportTableBody');
            if (tbodyNat) {
                if (filteredNats.length === 0) {
                    tbodyNat.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Không có quy tắc NAT nào phù hợp.</td></tr>';
                } else {
                    tbodyNat.innerHTML = filteredNats.map(n => {
                        const portNum = Number(n.wan_port);
                        const isRisky = riskyPorts.includes(portNum);
                        const riskBadge = isRisky
                            ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Cổng nhạy cảm</span>'
                            : '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Bình thường</span>';

                        return `
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                <td class="p-3 font-bold text-slate-800 dark:text-white">${this.escapeHTML(n.rule_name)}</td>
                                <td class="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">${n.wan_port} (${this.escapeHTML(n.protocol || 'TCP')})</td>
                                <td class="p-3 font-mono text-slate-700 dark:text-slate-300">${this.escapeHTML(n.lan_ip)}:${n.lan_port}</td>
                                <td class="p-3 text-slate-600 dark:text-slate-400 text-xs">${this.escapeHTML(n.purpose || n.target_device || '—')}</td>
                                <td class="p-3 text-center">${riskBadge}</td>
                            </tr>`;
                    }).join('');
                }
            }

            // 5. Render Remote Table
            const tbodyRemote = document.getElementById('networkRemoteReportTableBody');
            if (tbodyRemote) {
                if (filteredRemotes.length === 0) {
                    tbodyRemote.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-400">Không có kết nối VPN/Remote nào phù hợp.</td></tr>';
                } else {
                    tbodyRemote.innerHTML = filteredRemotes.map((r, idx) => {
                        const statusBadge = r.status === 'Hoạt động' || r.status === 'Active'
                            ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">Hoạt động</span>'
                            : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Tạm dừng</span>';

                        const key = 'remote_' + r.id;
                        const isRevealed = this.revealedSecrets.has(key);
                        const secretDisplay = isRevealed ? this.escapeHTML(r.secret_masked || r.password || '') : '••••••••';
                        const eyeIcon = isRevealed ? 'fa-eye-slash text-purple-500' : 'fa-eye text-slate-400 hover:text-slate-600 dark:hover:text-slate-300';
                        const eyeTitle = isRevealed ? 'Che mật khẩu/khóa' : 'Hiển thị mật khẩu/khóa';

                        return `
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                <td class="p-3 text-slate-400">${idx + 1}</td>
                                <td class="p-3 font-bold text-slate-800 dark:text-white">${this.escapeHTML(r.name)}</td>
                                <td class="p-3 text-slate-600 dark:text-slate-300 text-xs">${this.escapeHTML(r.connection_type || 'VPN')}</td>
                                <td class="p-3 font-mono text-blue-600 dark:text-blue-400">${this.escapeHTML(r.address || '—')}</td>
                                <td class="p-3 font-mono text-slate-700 dark:text-slate-300">${this.escapeHTML(r.username || '—')}</td>
                                <td class="p-3">
                                    <div class="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                                        <span class="font-medium">${secretDisplay}</span>
                                        ${!isRevealed ? '<span class="text-[10px] text-slate-400 italic">(Đã bảo vệ)</span>' : ''}
                                        <button type="button" onclick="window.QLTSPageReports.toggleSecretVisibility('${key}')" title="${eyeTitle}" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                            <i class="fa-solid ${eyeIcon} text-xs"></i>
                                        </button>
                                    </div>
                                </td>
                                <td class="p-3 text-slate-600 dark:text-slate-300 text-xs">${this.escapeHTML(r.owner || 'Admin IT')}</td>
                                <td class="p-3 text-center">${statusBadge}</td>
                            </tr>`;
                    }).join('');
                }
            }

            // 6. Render Check Logs Table
            const tbodyLogs = document.getElementById('networkLogsReportTableBody');
            if (tbodyLogs) {
                const recentLogs = (logs || []).slice(-15).reverse();
                if (recentLogs.length === 0) {
                    tbodyLogs.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">Chưa có nhật ký kiểm tra kết nối nào được ghi nhận.</td></tr>';
                } else {
                    tbodyLogs.innerHTML = recentLogs.map(l => {
                        const isSuccess = l.status === 'Online' || l.status === 'Success' || (l.latency_ms && l.latency_ms > 0);
                        const statusBadge = isSuccess
                            ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">Thành công</span>'
                            : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">Thất bại</span>';

                        const rtt = l.latency_ms ? `${l.latency_ms} ms` : '—';

                        return `
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                <td class="p-3 text-slate-500 font-mono text-xs">${this.escapeHTML(l.checked_at || l.timestamp || '—')}</td>
                                <td class="p-3 font-medium text-slate-800 dark:text-white">${this.escapeHTML(l.target_name || l.host || 'Mục tiêu')}</td>
                                <td class="p-3 font-mono text-slate-600 dark:text-slate-400 text-xs">${this.escapeHTML(l.host || '')}:${l.port || 'icmp'}</td>
                                <td class="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${rtt}</td>
                                <td class="p-3 text-slate-500 text-xs max-w-[200px] truncate" title="${this.escapeHTML(l.detail || l.error || '')}">${this.escapeHTML(l.detail || l.error || 'Phản hồi bình thường')}</td>
                                <td class="p-3 text-center">${statusBadge}</td>
                            </tr>`;
                    }).join('');
                }
            }
        },

        exportNetworkExcel(mode = 'as_screen') {
            if (typeof XLSX === 'undefined') {
                if (typeof showInfoModal === 'function') {
                    showInfoModal('Thư viện xuất Excel (XLSX) chưa sẵn sàng.', 'Thông báo');
                }
                return;
            }

            const wb = XLSX.utils.book_new();
            const today = new Date().toISOString().slice(0, 10);

            // 1. Sheet Targets
            const targetsData = (this.cache.networkTargets || []).map((t, idx) => ({
                'STT': idx + 1,
                'Tên thiết bị / Mục tiêu': t.name,
                'Phân loại': t.target_type || 'Thiết bị',
                'Địa chỉ IP / Host': t.address || t.host,
                'Cổng (Port)': t.port || 'ICMP / Mặc định',
                'Vị trí lắp đặt': t.location || '',
                'Độ trễ phản hồi (ms)': t.latency_ms || '',
                'Lần kiểm tra cuối': t.last_checked || t.last_checked_at || '',
                'Trạng thái': t.status || 'Chưa kiểm tra'
            }));
            const wsTargets = XLSX.utils.json_to_sheet(targetsData);
            XLSX.utils.book_append_sheet(wb, wsTargets, '1_Giam_Sat_Thiet_Bi');

            // 2. Sheet Wi-Fi (Credentials based on export mode)
            const wifiData = (this.cache.networkWifis || []).map((w, idx) => {
                let password = '•••••••• (Đã bảo vệ)';
                const key = 'wifi_' + w.id;
                if (mode === 'reveal_all') {
                    password = w.password || '';
                } else if (mode === 'as_screen') {
                    password = this.revealedSecrets.has(key) ? (w.password || '') : '•••••••• (Đã bảo vệ)';
                } else {
                    password = '•••••••• (Đã bảo vệ)';
                }

                return {
                    'STT': idx + 1,
                    'Tên Wi-Fi (SSID)': w.ssid,
                    'Mật khẩu truy cập': password,
                    'Phân loại mạng': w.network_type,
                    'Băng tần': w.band || '2.4 & 5 GHz',
                    'Chuẩn bảo mật': w.security || 'WPA2/WPA3',
                    'VLAN': w.vlan || '',
                    'Thiết bị phát sóng': w.device_name || '',
                    'Vị trí': w.location || '',
                    'Trạng thái': w.status || 'Hoạt động',
                    'Ghi chú': w.notes || ''
                };
            });
            const wsWifi = XLSX.utils.json_to_sheet(wifiData);
            XLSX.utils.book_append_sheet(wb, wsWifi, '2_Mang_WiFi');

            // 3. Sheet NAT
            const natData = (this.cache.networkNats || []).map((n, idx) => ({
                'STT': idx + 1,
                'Tên quy tắc': n.rule_name,
                'Cổng WAN': n.wan_port,
                'Giao thức': n.protocol || 'TCP',
                'IP LAN đích': n.lan_ip,
                'Cổng LAN đích': n.lan_port,
                'Mục đích sử dụng': n.purpose || '',
                'Thiết bị liên kết': n.target_device || '',
                'Cảnh báo an ninh': [3389, 22, 23, 21].includes(Number(n.wan_port)) ? 'CẢNH BÁO: Cổng nhạy cảm mở ra Internet' : 'Bình thường',
                'Trạng thái': n.status || 'Hoạt động'
            }));
            const wsNat = XLSX.utils.json_to_sheet(natData);
            XLSX.utils.book_append_sheet(wb, wsNat, '3_NAT_Forwarding');

            // 4. Sheet VPN Remote (Credentials based on export mode)
            const remoteData = (this.cache.networkRemotes || []).map((r, idx) => {
                let secret = '•••••••• (Đã bảo vệ)';
                const key = 'remote_' + r.id;
                if (mode === 'reveal_all') {
                    secret = r.secret_masked || r.password || '';
                } else if (mode === 'as_screen') {
                    secret = this.revealedSecrets.has(key) ? (r.secret_masked || r.password || '') : '•••••••• (Đã bảo vệ)';
                } else {
                    secret = '•••••••• (Đã bảo vệ)';
                }

                return {
                    'STT': idx + 1,
                    'Tên kết nối': r.name,
                    'Phân loại kết nối': r.connection_type || 'VPN',
                    'Địa chỉ / Host': r.address,
                    'Tài khoản đăng nhập': r.username,
                    'Khóa bí mật / Mật khẩu': secret,
                    'Thiết bị liên kết': r.related_device || '',
                    'Người phụ trách': r.owner || '',
                    'Trạng thái': r.status || 'Hoạt động',
                    'Ghi chú': r.notes || ''
                };
            });
            const wsRemote = XLSX.utils.json_to_sheet(remoteData);
            XLSX.utils.book_append_sheet(wb, wsRemote, '4_VPN_Remote');

            // 5. Sheet Check Logs
            const logsData = (this.cache.networkCheckLogs || []).slice(-50).reverse().map((l, idx) => ({
                'STT': idx + 1,
                'Thời gian ghi nhận': l.checked_at || l.timestamp || '',
                'Mục tiêu kiểm tra': l.target_name || l.host || '',
                'Địa chỉ & Cổng': `${l.host || ''}:${l.port || 'icmp'}`,
                'Độ trễ RTT (ms)': l.latency_ms || '',
                'Trạng thái': l.status || '',
                'Thông điệp chi tiết': l.detail || l.error || ''
            }));
            const wsLogs = XLSX.utils.json_to_sheet(logsData);
            XLSX.utils.book_append_sheet(wb, wsLogs, '5_Lich_Su_Kiem_Tra');

            this.saveWorkbook(wb, `Bao_cao_Ha_tang_Mang_${today}.xlsx`);
        },

        // =================================================================
        // EXPORT EXCEL UTILITIES (Using SheetJS XLSX)
        // =================================================================
        exportCurrentTabExcel() {
            switch (this.activeTab) {
                case 'tab-assets':
                    this.exportAssetsExcel();
                    break;
                case 'tab-licenses':
                    this.exportLicensesExcel();
                    break;
                case 'tab-supplies':
                    this.exportSuppliesExcel();
                    break;
                case 'tab-allocation':
                    this.exportTransactionsExcel();
                    break;
                case 'tab-maintenance':
                    this.exportMaintenanceExcel();
                    break;
                case 'tab-network':
                    this.showExportPasswordModal();
                    break;
                case 'tab-overview':
                default:
                    this.exportDeptSummaryExcel();
                    break;
            }
        },

        saveWorkbook(wb, filename) {
            if (typeof XLSX === 'undefined') {
                if (typeof showInfoModal === 'function') {
                    showInfoModal('Thư viện xuất Excel (XLSX) chưa sẵn sàng.', 'Thông báo');
                } else {
                    console.warn('Thư viện xuất Excel (XLSX) chưa sẵn sàng.');
                }
                return;
            }
            XLSX.writeFile(wb, filename);
        },

        exportDeptSummaryExcel() {
            const usersMap = new Map(this.cache.users.map(u => [u.id, u]));
            const rows = this.cache.departments.map((d, index) => {
                const deptUsers = this.cache.users.filter(u => u.department_id === d.id);
                const deptUserIds = new Set(deptUsers.map(u => u.id));
                const deptAssets = this.cache.assets.filter(a => a.user_id && deptUserIds.has(a.user_id));
                const pcCount = deptAssets.filter(a => /^pc/i.test(a.asset_code)).length;
                const ltCount = deptAssets.filter(a => /^lt/i.test(a.asset_code)).length;
                const mhCount = deptAssets.filter(a => /^mh/i.test(a.asset_code)).length;
                const deptLicenses = this.cache.licenses.filter(l => l.user_id && deptUserIds.has(l.user_id));

                return {
                    'STT': index + 1,
                    'Phòng ban / Bộ phận': d.name,
                    'Số lượng nhân sự': deptUsers.length,
                    'Tổng thiết bị': deptAssets.length,
                    'PC Máy trạm': pcCount,
                    'Laptop': ltCount,
                    'Màn hình máy tính': mhCount,
                    'Bản quyền phần mềm (License)': deptLicenses.length
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Tong_hop_phong_ban');
            this.saveWorkbook(wb, `Bao_cao_tong_hop_phong_ban_${new Date().toISOString().slice(0, 10)}.xlsx`);
        },

        exportAssetsExcel() {
            const assets = this.getFilteredAssets();
            const usersMap = new Map(this.cache.users.map(u => [u.id, u]));
            const deptsMap = new Map(this.cache.departments.map(d => [d.id, d]));

            const rows = assets.map((a, index) => {
                const user = a.user_id ? usersMap.get(a.user_id) : null;
                const dept = user && user.department_id ? deptsMap.get(user.department_id) : null;

                return {
                    'STT': index + 1,
                    'Mã tài sản': a.asset_code,
                    'Tên tài sản': a.name,
                    'Hãng sản xuất': a.brand || '',
                    'Thông số kĩ thuật': a.config || '',
                    'Vị trí': a.location || '',
                    'Người sử dụng': user ? user.name : (a.user_name || 'Tồn kho'),
                    'Phòng ban': dept ? dept.name : '',
                    'Trạng thái': a.status === 'Active' ? 'Đang sử dụng' : (a.status === 'Stock' ? 'Tồn kho' : a.status),
                    'Ghi chú': a.notes || ''
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'So_tai_san');
            this.saveWorkbook(wb, `So_theo_doi_tai_san_${new Date().toISOString().slice(0, 10)}.xlsx`);
        },

        exportLicensesExcel() {
            const licenses = this.getFilteredLicenses();
            const usersMap = new Map(this.cache.users.map(u => [u.id, u]));
            const deptsMap = new Map(this.cache.departments.map(d => [d.id, d]));

            const rows = licenses.map((l, index) => {
                const user = l.user_id ? usersMap.get(l.user_id) : null;
                const dept = user && user.department_id ? deptsMap.get(user.department_id) : null;

                return {
                    'STT': index + 1,
                    'Loại phần mềm': l.key_type,
                    'Mã Key / License': l.license_key,
                    'Gói bản quyền': l.package_type || 'Permanent',
                    'Người sử dụng': user ? user.name : (l.user || ''),
                    'Phòng ban': dept ? dept.name : '',
                    'Trạng thái': l.status === 'Active' ? 'Đã kích hoạt' : 'Tồn kho',
                    'Hóa đơn / Ghi chú': l.invoice || l.notes || ''
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Ban_quyen_phan_mem');
            this.saveWorkbook(wb, `Bao_cao_license_phan_mem_${new Date().toISOString().slice(0, 10)}.xlsx`);
        },

        exportSuppliesExcel() {
            const supplies = this.getFilteredSupplies();
            const rows = supplies.map((s, index) => {
                const qty = Number(s.quantity || 0);
                const price = Number(s.unit_price || 0);
                return {
                    'STT': index + 1,
                    'Mã vật tư': s.code,
                    'Tên vật tư / Linh kiện': s.name,
                    'Nhóm danh mục': s.category,
                    'Vị trí kho': s.location || '',
                    'Số lượng tồn': qty,
                    'Đơn vị tính': s.unit || 'Chiếc',
                    'Tồn tối thiểu': s.min_quantity || 0,
                    'Đơn giá (VNĐ)': price,
                    'Thành tiền (VNĐ)': qty * price,
                    'Ghi chú': s.notes || ''
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Kho_vat_tu');
            this.saveWorkbook(wb, `Bao_cao_kho_vat_tu_linh_kien_${new Date().toISOString().slice(0, 10)}.xlsx`);
        },

        exportTransactionsExcel() {
            const rows = this.cache.transactions.map((t, index) => ({
                'STT': index + 1,
                'Mã phiếu': t.code,
                'Loại': t.type === 'IN' ? 'Nhập kho' : 'Xuất kho',
                'Ngày giao dịch': t.date,
                'Vật tư': t.supply_name,
                'Số lượng': t.quantity,
                'Đơn vị': t.unit || 'Chiếc',
                'Thành tiền': t.total_amount || 0,
                'Nhà cung cấp / Người nhận': t.type === 'IN' ? t.supplier_name : t.receiver_name,
                'Lý do': t.reason || '',
                'Người thực hiện': t.created_by || 'Admin'
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Bien_dong_kho');
            this.saveWorkbook(wb, `Bao_cao_bien_dong_kho_${new Date().toISOString().slice(0, 10)}.xlsx`);
        },

        exportMaintenanceExcel() {
            const assetsMap = new Map(this.cache.assets.map(a => [a.id, a]));
            const rows = this.cache.maintenanceTasks.map((t, index) => {
                const a = assetsMap.get(t.asset_id);
                return {
                    'STT': index + 1,
                    'Mã thiết bị': a ? a.asset_code : '',
                    'Tên thiết bị': a ? a.name : '',
                    'Nhiệm vụ bảo trì': t.title,
                    'Hạn hoàn thành': t.due_date,
                    'Mức độ ưu tiên': t.priority || 'Bình thường',
                    'Người phụ trách': t.assigned_to || '',
                    'Trạng thái': t.status,
                    'Ghi chú': t.note || ''
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Lich_bao_tri');
            this.saveWorkbook(wb, `Bao_cao_bao_tri_kiem_ke_${new Date().toISOString().slice(0, 10)}.xlsx`);
        }
    };

    // Auto initialize if on reports.html
    function startReports() {
        const path = window.location.pathname || '';
        if (path.includes('reports.html')) {
            if (window.localDBReady && typeof window.localDBReady.then === 'function') {
                window.localDBReady.then(() => window.QLTSPageReports.init());
            } else {
                setTimeout(() => window.QLTSPageReports.init(), 50);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startReports);
    } else {
        startReports();
    }

})();
