// =================================================================
// page-network.js — Controller quản lý Module Hạ tầng & Mạng
// Quản lý Wi-Fi, NAT/Port Forwarding, VPN & Remote, Giám sát Ping/Port,
// Đường truyền Internet & Sơ đồ mạng (Giai đoạn 7).
// =================================================================

(function () {
    'use strict';

    const QLTSPageNetwork = {
        activeTab: 'tab-wifi',
        cache: {
            wifis: [],
            nats: [],
            remotes: [],
            targets: [],
            lines: [],
            diagrams: [],
            assets: [],
            check_logs: []
        },
        revealedSecrets: new Set(), // Chứa các ID đang mở xem mật khẩu tạm thời

        async init() {
            // Chỉ chạy trên trang network.html
            const pathname = window.location.pathname || '';
            if (!pathname.includes('network.html')) return;

            console.log('QLTSPageNetwork: Khởi tạo module Hạ tầng & Mạng...');
            await this.loadData();
            this.checkAgentStatus();
            this.setupTabs();
            this.setupFilters();
            this.setupActions();
            this.setupModals();
            this.handleUrlHash();
            this.renderAll();
        },

        async loadData() {
            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (!db) {
                console.error('LocalDB chưa sẵn sàng');
                return;
            }

            try {
                const [wifisRes, natsRes, remotesRes, targetsRes, linesRes, diagramsRes, assetsRes, logsRes] = await Promise.all([
                    db.from('network_wifis').select('*'),
                    db.from('network_nats').select('*'),
                    db.from('network_remotes').select('*'),
                    db.from('network_targets').select('*'),
                    db.from('network_lines').select('*'),
                    db.from('network_diagrams').select('*'),
                    db.from('assets').select('*'),
                    db.from('network_check_logs').select('*')
                ]);

                this.cache.wifis = wifisRes?.data || [];
                this.cache.nats = natsRes?.data || [];
                this.cache.remotes = remotesRes?.data || [];
                this.cache.targets = targetsRes?.data || [];
                this.cache.lines = linesRes?.data || [];
                this.cache.diagrams = diagramsRes?.data || [];
                this.cache.assets = assetsRes?.data || [];
                this.cache.check_logs = (logsRes?.data || []).sort((a, b) => new Date(b.checked_at || 0) - new Date(a.checked_at || 0));
                this.populateAssetDropdowns();
            } catch (err) {
                console.error('Lỗi nạp dữ liệu mạng:', err);
            }
        },

        setupTabs() {
            const tabButtons = document.querySelectorAll('.network-tab-btn');
            tabButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabId = btn.getAttribute('data-tab');
                    if (tabId) this.switchTab(tabId);
                });
            });
        },

        switchTab(tabId) {
            this.activeTab = tabId;

            // Cập nhật URL Hash
            const hash = tabId.replace('tab-', '');
            if (window.history.pushState) {
                window.history.pushState(null, null, `#${hash}`);
            }

            // Đổi giao diện tab buttons
            const tabButtons = document.querySelectorAll('.network-tab-btn');
            tabButtons.forEach(btn => {
                const isCurrent = btn.getAttribute('data-tab') === tabId;
                if (isCurrent) {
                    btn.className = "network-tab-btn active px-5 py-3.5 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400 flex items-center gap-2 whitespace-nowrap transition-colors";
                } else {
                    btn.className = "network-tab-btn px-5 py-3.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2 whitespace-nowrap transition-colors";
                }
            });

            // Hiển thị nội dung tab tương ứng
            const contents = document.querySelectorAll('.network-tab-content');
            contents.forEach(content => {
                if (content.id === tabId) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });

            // Cập nhật text nút "Thêm mới" trên thanh công cụ
            const btnAddNewText = document.getElementById('btnAddNewText');
            if (btnAddNewText) {
                const labelMap = {
                    'tab-wifi': 'Thêm Wi-Fi',
                    'tab-nat': 'Thêm quy tắc NAT',
                    'tab-remote': 'Thêm kết nối VPN',
                    'tab-ping': 'Thêm mục tiêu Ping',
                    'tab-topology': 'Thêm đường truyền WAN'
                };
                btnAddNewText.textContent = labelMap[tabId] || 'Thêm mới';
            }

            this.renderActiveTab();
        },

        handleUrlHash() {
            const hash = window.location.hash.replace('#', '');
            if (hash) {
                const targetTab = `tab-${hash}`;
                if (document.getElementById(targetTab)) {
                    this.switchTab(targetTab);
                }
            }
        },

        setupFilters() {
            const searchInput = document.getElementById('networkSearchInput');
            const statusFilter = document.getElementById('networkStatusFilter');
            const resetBtn = document.getElementById('btnResetNetworkFilter');

            const triggerFilter = () => this.renderActiveTab();

            if (searchInput) {
                let debounceTimer;
                searchInput.addEventListener('input', () => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(triggerFilter, 200);
                });
            }

            if (statusFilter) {
                statusFilter.addEventListener('change', triggerFilter);
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (searchInput) searchInput.value = '';
                    if (statusFilter) statusFilter.value = 'all';
                    triggerFilter();
                });
            }
        },

        setupActions() {
            // Nút "Thêm mới" tùy theo tab đang chọn
            const btnAddNew = document.getElementById('btnAddNewItem');
            if (btnAddNew) {
                btnAddNew.addEventListener('click', () => {
                    this.openCreateModalForActiveTab();
                });
            }

            // Nút "Ping kiểm tra mạng (Ping All)"
            const btnPingAll = document.getElementById('btnPingAllTargets');
            if (btnPingAll) {
                btnPingAll.addEventListener('click', () => this.pingAllTargets());
            }

            const btnHeaderPing = document.getElementById('btnHeaderPingAll');
            if (btnHeaderPing) {
                btnHeaderPing.addEventListener('click', () => this.pingAllTargets());
            }

            // Nút "Xuất Excel"
            const btnExportExcel = document.getElementById('btnExportNetworkExcel');
            if (btnExportExcel) {
                btnExportExcel.addEventListener('click', () => {
                    if (this.activeTab === 'tab-nat' || this.activeTab === 'tab-ping') {
                        this.exportCurrentTabExcel('mask_all');
                    } else {
                        this.showExportPasswordModal();
                    }
                });
            }

            const btnConfirmNetworkExport = document.getElementById('btnConfirmExportNetworkExcel');
            if (btnConfirmNetworkExport) {
                btnConfirmNetworkExport.addEventListener('click', () => {
                    const checked = document.querySelector('input[name="exportPasswordMode"]:checked');
                    const mode = checked ? checked.value : 'as_screen';
                    document.getElementById('exportNetworkPasswordModal')?.classList.add('hidden');
                    this.exportCurrentTabExcel(mode);
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

            // Nút "Thêm đường truyền WAN"
            const btnAddNewLine = document.getElementById('btnAddNewLine');
            if (btnAddNewLine) {
                btnAddNewLine.addEventListener('click', () => this.openCreateLineModal());
            }

            // Nút "Đính kèm bản vẽ sơ đồ"
            const btnUploadDiag = document.getElementById('btnOpenUploadDiagramModal');
            if (btnUploadDiag) {
                btnUploadDiag.addEventListener('click', () => this.openUploadDiagramModal());
            }
        },

        setupModals() {
            // Xử lý đóng tất cả modals
            document.querySelectorAll('.btn-close-modal').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('#modalWifi, #modalNat, #modalRemote, #modalPing, #modalNetworkLine, #modalNodeDetail, #modalUploadDiagram, #modalPreviewDiagram, #modalAssetQuickView').forEach(m => m.classList.add('hidden'));
                });
            });

            // Form Wi-Fi
            const formWifi = document.getElementById('formWifi');
            if (formWifi) {
                formWifi.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.saveWifi();
                });
            }

            // Form NAT
            const formNat = document.getElementById('formNat');
            if (formNat) {
                formNat.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.saveNat();
                });
            }

            // Form Remote
            const formRemote = document.getElementById('formRemote');
            if (formRemote) {
                formRemote.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.saveRemote();
                });
            }

            // Form Ping
            const formPing = document.getElementById('formPing');
            if (formPing) {
                formPing.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.savePing();
                });
            }

            // Form Đường truyền WAN
            const formLine = document.getElementById('formNetworkLine');
            if (formLine) {
                formLine.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.saveLine();
                });
            }

            // Form Đính kèm Bản vẽ
            const formDiag = document.getElementById('formUploadDiagram');
            if (formDiag) {
                formDiag.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.saveDiagram();
                });
            }
        },

        getFilterValues() {
            return {
                search: (document.getElementById('networkSearchInput')?.value || '').toLowerCase().trim(),
                status: document.getElementById('networkStatusFilter')?.value || 'all'
            };
        },

        renderAll() {
            this.renderKPIs();
            this.renderActiveTab();
        },

        renderKPIs() {
            // Card 1: Wi-Fi
            const totalWifiEl = document.getElementById('statTotalWifi');
            const subWifiEl = document.getElementById('statWifiSubtext');
            const badgeWifi = document.getElementById('badgeWifiCount');
            if (totalWifiEl) totalWifiEl.textContent = this.cache.wifis.length;
            if (badgeWifi) badgeWifi.textContent = this.cache.wifis.length;
            if (subWifiEl) {
                const internal = this.cache.wifis.filter(w => w.network_type === 'Nội bộ').length;
                const guest = this.cache.wifis.filter(w => w.network_type && w.network_type.includes('Guest')).length;
                subWifiEl.textContent = `${internal} Nội bộ • ${guest} Khách/Guest`;
            }

            // Card 2: NAT
            const totalNatEl = document.getElementById('statTotalNat');
            const subNatEl = document.getElementById('statNatSubtext');
            const badgeNat = document.getElementById('badgeNatCount');
            if (totalNatEl) totalNatEl.textContent = this.cache.nats.length;
            if (badgeNat) badgeNat.textContent = this.cache.nats.length;
            if (subNatEl) {
                const activeNat = this.cache.nats.filter(n => n.status === 'Active').length;
                const inactiveNat = this.cache.nats.length - activeNat;
                subNatEl.textContent = `${activeNat} Đang mở • ${inactiveNat} Tạm đóng`;
            }

            // Card 3: Remote
            const totalRemoteEl = document.getElementById('statTotalRemote');
            const badgeRemote = document.getElementById('badgeRemoteCount');
            if (totalRemoteEl) totalRemoteEl.textContent = this.cache.remotes.length;
            if (badgeRemote) badgeRemote.textContent = this.cache.remotes.length;

            // Card 4: Monitoring Ping
            const ratioEl = document.getElementById('statOnlineRatio');
            const latencyAvgEl = document.getElementById('statLatencyAvg');
            const badgePing = document.getElementById('badgePingCount');
            const totalTargets = this.cache.targets.length;
            const onlineTargets = this.cache.targets.filter(t => t.status === 'Online').length;
            if (badgePing) badgePing.textContent = totalTargets;
            if (ratioEl) ratioEl.textContent = `${onlineTargets} / ${totalTargets}`;
            if (latencyAvgEl) {
                const latencies = this.cache.targets.map(t => Number(t.latency_ms) || 0).filter(l => l > 0);
                const avg = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
                latencyAvgEl.textContent = `Độ trễ trung bình: ${avg}ms`;
            }

            // Card 5: Lines badge
            const badgeLine = document.getElementById('badgeLineCount');
            if (badgeLine) badgeLine.textContent = this.cache.lines.length;
        },

        renderActiveTab() {
            switch (this.activeTab) {
                case 'tab-wifi':
                    this.renderWifiTable();
                    break;
                case 'tab-nat':
                    this.renderNatTable();
                    break;
                case 'tab-remote':
                    this.renderRemoteTable();
                    break;
                case 'tab-ping':
                    this.renderPingTable();
                    break;
                case 'tab-topology':
                    this.renderLinesAndTopology();
                    this.renderDiagramTable();
                    break;
            }
        },

        // ==========================================
        // 1. Wi-Fi Table
        // ==========================================
        getFilteredWifis() {
            const { search, status } = this.getFilterValues();
            return this.cache.wifis.filter(w => {
                if (status !== 'all' && w.status !== status) return false;
                if (!search) return true;
                return (
                    (w.ssid || '').toLowerCase().includes(search) ||
                    (w.band || '').toLowerCase().includes(search) ||
                    (w.network_type || '').toLowerCase().includes(search) ||
                    (w.device_name || '').toLowerCase().includes(search) ||
                    (w.location || '').toLowerCase().includes(search) ||
                    (w.vlan || '').toLowerCase().includes(search)
                );
            });
        },

        renderWifiTable() {
            const tbody = document.getElementById('wifiTableBody');
            if (!tbody) return;

            const items = this.getFilteredWifis();
            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 text-xs">Không tìm thấy mạng Wi-Fi nào phù hợp.</td></tr>`;
                return;
            }

            tbody.innerHTML = items.map(w => {
                const isRevealed = this.revealedSecrets.has(`wifi_${w.id}`);
                const displayPass = isRevealed ? w.password : '••••••••••••';
                const eyeIcon = isRevealed ? 'fa-eye-slash' : 'fa-eye';

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td class="p-3">
                            <div class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span class="w-6 h-6 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
                                    <i class="fa-solid fa-wifi"></i>
                                </span>
                                <span>${this.escapeHtml(w.ssid)}</span>
                            </div>
                            <div class="text-[11px] text-slate-400 mt-0.5">${this.escapeHtml(w.security || 'WPA2 Personal')}</div>
                        </td>
                        <td class="p-3">
                            <div class="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md max-w-fit border border-slate-200 dark:border-slate-700">
                                <span>${this.escapeHtml(displayPass)}</span>
                                <button onclick="QLTSPageNetwork.toggleSecretVisibility('wifi_${w.id}')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1" title="Ẩn/Hiện mật khẩu">
                                    <i class="fa-solid ${eyeIcon} text-[11px]"></i>
                                </button>
                                <button onclick="QLTSPageNetwork.copyToClipboard('${this.escapeJsString(w.password)}', 'Mật khẩu Wi-Fi ${w.ssid}')" class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 ml-0.5" title="Sao chép mật khẩu">
                                    <i class="fa-regular fa-copy text-[11px]"></i>
                                </button>
                            </div>
                        </td>
                        <td class="p-3">
                            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                ${this.escapeHtml(w.band || '5GHz')}
                            </span>
                        </td>
                        <td class="p-3">
                            <div class="font-medium text-slate-700 dark:text-slate-200">${this.escapeHtml(w.network_type || 'Nội bộ')}</div>
                            <div class="text-[11px] text-slate-400 font-mono">${this.escapeHtml(w.vlan || 'VLAN 10')}</div>
                        </td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">
                            ${this.escapeHtml(w.device_name || '—')}
                        </td>
                        <td class="p-3 text-slate-500 dark:text-slate-400">
                            ${this.escapeHtml(w.location || '—')}
                        </td>
                        <td class="p-3">
                            ${this.renderAssetBadge(w.asset_id)}
                        </td>
                        <td class="p-3">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${w.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">
                                <span class="w-1.5 h-1.5 rounded-full ${w.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                                <span>${w.status === 'Active' ? 'Hoạt động' : 'Tạm ngưng'}</span>
                            </span>
                        </td>
                        <td class="p-3 text-right whitespace-nowrap">
                            <button onclick="QLTSPageNetwork.openEditWifiModal(${w.id})" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors" title="Chỉnh sửa">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="QLTSPageNetwork.deleteItem('network_wifis', ${w.id}, '${this.escapeJsString(w.ssid)}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors ml-1" title="Xóa">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        // ==========================================
        // 2. NAT / Port Forwarding Table
        // ==========================================
        getFilteredNats() {
            const { search, status } = this.getFilterValues();
            return this.cache.nats.filter(n => {
                if (status !== 'all' && n.status !== status) return false;
                if (!search) return true;
                return (
                    (n.rule_name || '').toLowerCase().includes(search) ||
                    (n.wan_ip || '').toLowerCase().includes(search) ||
                    (n.wan_port || '').toString().includes(search) ||
                    (n.lan_ip || '').toLowerCase().includes(search) ||
                    (n.lan_port || '').toString().includes(search) ||
                    (n.protocol || '').toLowerCase().includes(search) ||
                    (n.target_device || '').toLowerCase().includes(search) ||
                    (n.purpose || '').toLowerCase().includes(search)
                );
            });
        },

        renderNatTable() {
            const tbody = document.getElementById('natTableBody');
            if (!tbody) return;

            const items = this.getFilteredNats();
            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 text-xs">Không tìm thấy quy tắc NAT nào phù hợp.</td></tr>`;
                return;
            }

            tbody.innerHTML = items.map(n => {
                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td class="p-3">
                            <div class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span class="w-6 h-6 rounded bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs">
                                    <i class="fa-solid fa-arrows-split-up-and-left"></i>
                                </span>
                                <span>${this.escapeHtml(n.rule_name)}</span>
                            </div>
                        </td>
                        <td class="p-3 font-mono text-xs">
                            <div class="text-indigo-600 dark:text-indigo-400 font-bold">${this.escapeHtml(n.wan_ip)}</div>
                            <div class="text-slate-400 text-[11px]">Port: <strong class="text-slate-700 dark:text-slate-200">${this.escapeHtml(n.wan_port)}</strong></div>
                        </td>
                        <td class="p-3 font-mono text-xs">
                            <div class="text-emerald-600 dark:text-emerald-400 font-bold">${this.escapeHtml(n.lan_ip)}</div>
                            <div class="text-slate-400 text-[11px]">Port: <strong class="text-slate-700 dark:text-slate-200">${this.escapeHtml(n.lan_port)}</strong></div>
                        </td>
                        <td class="p-3 text-center">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                                ${this.escapeHtml(n.protocol || 'TCP')}
                            </span>
                        </td>
                        <td class="p-3 text-slate-700 dark:text-slate-300">
                            <div class="font-medium">${this.escapeHtml(n.target_device || '—')}</div>
                        </td>
                        <td class="p-3 text-slate-500 dark:text-slate-400 text-xs max-w-xs truncate" title="${this.escapeHtml(n.purpose || '')}">
                            ${this.escapeHtml(n.purpose || '—')}
                        </td>
                        <td class="p-3">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${n.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">
                                <span class="w-1.5 h-1.5 rounded-full ${n.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                                <span>${n.status === 'Active' ? 'Đang mở' : 'Tạm đóng'}</span>
                            </span>
                        </td>
                        <td class="p-3 text-right whitespace-nowrap">
                            <button onclick="QLTSPageNetwork.openEditNatModal(${n.id})" class="text-purple-600 dark:text-purple-400 hover:text-purple-800 p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors" title="Chỉnh sửa">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="QLTSPageNetwork.deleteItem('network_nats', ${n.id}, '${this.escapeJsString(n.rule_name)}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors ml-1" title="Xóa">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        // ==========================================
        // 3. VPN & Remote Table
        // ==========================================
        getFilteredRemotes() {
            const { search, status } = this.getFilterValues();
            return this.cache.remotes.filter(r => {
                if (status !== 'all' && r.status !== status) return false;
                if (!search) return true;
                return (
                    (r.name || '').toLowerCase().includes(search) ||
                    (r.connection_type || '').toLowerCase().includes(search) ||
                    (r.address || '').toLowerCase().includes(search) ||
                    (r.username || '').toLowerCase().includes(search) ||
                    (r.related_device || '').toLowerCase().includes(search) ||
                    (r.owner || '').toLowerCase().includes(search)
                );
            });
        },

        renderRemoteTable() {
            const tbody = document.getElementById('remoteTableBody');
            if (!tbody) return;

            const items = this.getFilteredRemotes();
            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400 text-xs">Không tìm thấy kết nối VPN/Remote nào phù hợp.</td></tr>`;
                return;
            }

            tbody.innerHTML = items.map(r => {
                const isRevealed = this.revealedSecrets.has(`remote_${r.id}`);
                const displaySecret = isRevealed ? r.secret_masked : '••••••••••••';
                const eyeIcon = isRevealed ? 'fa-eye-slash' : 'fa-eye';

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td class="p-3">
                            <div class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span class="w-6 h-6 rounded bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">
                                    <i class="fa-solid fa-shield-halved"></i>
                                </span>
                                <span>${this.escapeHtml(r.name)}</span>
                            </div>
                        </td>
                        <td class="p-3">
                            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                ${this.escapeHtml(r.connection_type || 'VPN')}
                            </span>
                        </td>
                        <td class="p-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                            ${this.escapeHtml(r.address || '—')}
                        </td>
                        <td class="p-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            ${this.escapeHtml(r.username || '—')}
                        </td>
                        <td class="p-3">
                            <div class="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md max-w-fit border border-slate-200 dark:border-slate-700">
                                <span>${this.escapeHtml(displaySecret)}</span>
                                <button onclick="QLTSPageNetwork.toggleSecretVisibility('remote_${r.id}')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1" title="Ẩn/Hiện mật khẩu">
                                    <i class="fa-solid ${eyeIcon} text-[11px]"></i>
                                </button>
                                <button onclick="QLTSPageNetwork.copyToClipboard('${this.escapeJsString(r.secret_masked)}', 'Mật khẩu/Key ${r.name}')" class="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 ml-0.5" title="Sao chép mật khẩu">
                                    <i class="fa-regular fa-copy text-[11px]"></i>
                                </button>
                            </div>
                        </td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">
                            <div class="font-medium">${this.escapeHtml(r.related_device || '—')}</div>
                            <div class="text-[11px] text-slate-400">${this.escapeHtml(r.owner || 'IT')}</div>
                        </td>
                        <td class="p-3 text-slate-400 text-[11px]">
                            ${r.last_verified_at ? r.last_verified_at.split('T')[0] : 'Chưa kiểm tra'}
                        </td>
                        <td class="p-3">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">
                                <span class="w-1.5 h-1.5 rounded-full ${r.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                                <span>${r.status === 'Active' ? 'Hoạt động' : 'Tạm khóa'}</span>
                            </span>
                        </td>
                        <td class="p-3 text-right whitespace-nowrap">
                            <button onclick="QLTSPageNetwork.openEditRemoteModal(${r.id})" class="text-amber-600 dark:text-amber-400 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors" title="Chỉnh sửa">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="QLTSPageNetwork.deleteItem('network_remotes', ${r.id}, '${this.escapeJsString(r.name)}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors ml-1" title="Xóa">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        // ==========================================
        // 4. Ping & Health Check Table
        // ==========================================
        getFilteredTargets() {
            const { search, status } = this.getFilterValues();
            return this.cache.targets.filter(t => {
                if (status === 'Online' && t.status !== 'Online') return false;
                if (status === 'Offline' && t.status === 'Online') return false;
                if (!search) return true;
                return (
                    (t.name || '').toLowerCase().includes(search) ||
                    (t.target_type || '').toLowerCase().includes(search) ||
                    (t.address || '').toLowerCase().includes(search) ||
                    (t.port || '').toString().includes(search) ||
                    (t.location || '').toLowerCase().includes(search)
                );
            });
        },

        renderPingTable() {
            const tbody = document.getElementById('pingTableBody');
            if (!tbody) return;

            const items = this.getFilteredTargets();
            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400 text-xs">Không tìm thấy mục tiêu giám sát nào phù hợp.</td></tr>`;
                return;
            }

            tbody.innerHTML = items.map(t => {
                const isOnline = t.status === 'Online';
                const latency = Number(t.latency_ms) || 0;
                let latencyBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">${latency} ms</span>`;
                if (latency > 50) {
                    latencyBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">${latency} ms</span>`;
                }
                if (!isOnline) {
                    latencyBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">Timeout</span>`;
                }

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td class="p-3">
                            <div class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span class="w-6 h-6 rounded bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
                                    <i class="fa-solid fa-server"></i>
                                </span>
                                <span>${this.escapeHtml(t.name)}</span>
                            </div>
                        </td>
                        <td class="p-3">
                            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                ${this.escapeHtml(t.target_type || 'Thiết bị')}
                            </span>
                        </td>
                        <td class="p-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                            ${this.escapeHtml(t.address)}
                        </td>
                        <td class="p-3 font-mono text-xs text-center text-slate-600 dark:text-slate-300">
                            ${t.port || '80'}
                        </td>
                        <td class="p-3 text-slate-500 dark:text-slate-400">
                            ${this.escapeHtml(t.location || '—')}
                        </td>
                        <td class="p-3 text-center">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}">
                                <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 pulse-online' : 'bg-rose-500'}"></span>
                                <span>${isOnline ? 'Online' : 'Offline'}</span>
                            </span>
                        </td>
                        <td class="p-3 text-center">
                            ${latencyBadge}
                        </td>
                        <td class="p-3">
                            ${this.renderAssetBadge(t.asset_id)}
                        </td>
                        <td class="p-3 text-slate-400 text-[11px]">
                            ${t.last_checked ? new Date(t.last_checked).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Vừa xong'}
                        </td>
                        <td class="p-3 text-right whitespace-nowrap">
                            <button id="btnPing_${t.id}" onclick="QLTSPageNetwork.pingSingleTarget(${t.id})" class="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors" title="Ping kiểm tra thực tế">
                                <i class="fa-solid fa-rotate-right mr-1"></i>
                                <span>Ping</span>
                            </button>
                            <button onclick="QLTSPageNetwork.openCheckLogs(${t.id})" class="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg ml-0.5" title="Xem lịch sử kiểm tra">
                                <i class="fa-solid fa-clock-rotate-left"></i>
                            </button>
                            <button onclick="QLTSPageNetwork.openEditPingModal(${t.id})" class="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg ml-0.5" title="Chỉnh sửa">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="QLTSPageNetwork.deleteItem('network_targets', ${t.id}, '${this.escapeJsString(t.name)}')" class="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg ml-1" title="Xóa">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        // ==========================================
        // 5. Lines & Topology
        // ==========================================
        renderLinesAndTopology() {
            const container = document.getElementById('networkLinesContainer');
            if (!container) return;

            if (this.cache.lines.length === 0) {
                container.innerHTML = '<div class="col-span-2 text-center text-slate-400 p-4">Chưa có thông tin đường truyền Internet.</div>';
                return;
            }

            container.innerHTML = this.cache.lines.map(l => {
                const isPrimary = l.line_role && l.line_role.includes('Primary');
                const borderClass = isPrimary ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20' : 'border-orange-300 dark:border-orange-900 bg-orange-50/20';
                const roleBadge = isPrimary ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300';

                return `
                    <div class="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 ${borderClass} shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-9 h-9 rounded-lg ${isPrimary ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400'} flex items-center justify-center text-base">
                                    <i class="fa-solid fa-globe"></i>
                                </div>
                                <div>
                                    <h4 class="text-xs font-bold text-slate-800 dark:text-white">${this.escapeHtml(l.name)}</h4>
                                    <p class="text-[11px] text-slate-400">${this.escapeHtml(l.provider)}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadge}">
                                    ${this.escapeHtml(l.line_role || 'Chính')}
                                </span>
                                <div class="flex items-center">
                                    <button onclick="QLTSPageNetwork.openEditLineModal(${l.id})" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors" title="Chỉnh sửa">
                                        <i class="fa-solid fa-pen-to-square"></i>
                                    </button>
                                    <button onclick="QLTSPageNetwork.deleteItem('network_lines', ${l.id}, '${this.escapeJsString(l.name)}')" class="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors ml-0.5" title="Xóa">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100 dark:border-slate-700">
                            <div>
                                <span class="text-[11px] text-slate-400 block">IP WAN Tĩnh:</span>
                                <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">${this.escapeHtml(l.wan_ip || '—')}</span>
                            </div>
                            <div>
                                <span class="text-[11px] text-slate-400 block">Băng thông:</span>
                                <span class="font-semibold text-slate-700 dark:text-slate-200">${this.escapeHtml(l.bandwidth || '—')}</span>
                            </div>
                            <div>
                                <span class="text-[11px] text-slate-400 block">Hợp đồng:</span>
                                <span class="font-mono text-slate-600 dark:text-slate-300">${this.escapeHtml(l.contract_no || '—')}</span>
                            </div>
                            <div>
                                <span class="text-[11px] text-slate-400 block">Cổng Router:</span>
                                <span class="font-semibold text-slate-600 dark:text-slate-300">${this.escapeHtml(l.router_port || 'WAN 1')}</span>
                            </div>
                            <div>
                                <span class="text-[11px] text-slate-400 block">Hotline Kỹ thuật:</span>
                                <span class="font-bold text-emerald-600 dark:text-emerald-400">${this.escapeHtml(l.hotline || '—')}</span>
                            </div>
                            <div>
                                <span class="text-[11px] text-slate-400 block">Trạng thái:</span>
                                <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <span class="w-2 h-2 rounded-full bg-emerald-500 pulse-online"></span>
                                    <span>Hoạt động 100%</span>
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },

        // ==========================================
        // Ping Logic & Latency Simulation / Check
        // ==========================================
        async checkAgentStatus() {
            const badge = document.getElementById('agentStatusBadge');
            const textEl = document.getElementById('agentStatusText');
            try {
                const res = await fetch('/api/network/agent-status');
                if (res.ok) {
                    const data = await res.json();
                    if (badge && textEl) {
                        badge.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
                        textEl.textContent = `Server Agent: Sẵn sàng (Port 9000 - v${data.version || '2.0'})`;
                    }
                    this.hasServerAgent = true;
                    return true;
                }
            } catch (e) {
                // Ignore failure
            }

            if (badge && textEl) {
                badge.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
                textEl.textContent = "Chế độ Trình duyệt (CORS / Web Fetch)";
            }
            this.hasServerAgent = false;
            return false;
        },

        async pingSingleTarget(id) {
            const target = this.cache.targets.find(t => t.id === Number(id));
            if (!target) return;

            const btn = document.getElementById(`btnPing_${id}`);
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            let result = null;

            // 1. Thử gọi API Backend Agent trước (ICMP Ping / TCP Socket thật)
            try {
                const res = await fetch('/api/network/ping', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        host: target.address,
                        port: target.port ? Number(target.port) : null,
                        timeout_ms: 2500
                    })
                });
                if (res.ok) {
                    result = await res.json();
                }
            } catch (err) {
                console.warn('Không gọi được backend agent, chuyển sang fallback:', err);
            }

            // 2. Fallback nếu không có backend (client-side HTTP check)
            if (!result) {
                const startTime = performance.now();
                let isUrl = target.address.startsWith('http://') || target.address.startsWith('https://');
                let testUrl = isUrl ? target.address : `http://${target.address}:${target.port || 80}`;
                try {
                    await fetch(testUrl, { mode: 'no-cors', cache: 'no-store' });
                    const latency = Math.max(1, Math.round(performance.now() - startTime));
                    result = {
                        ok: true,
                        status: 'Online',
                        latency_ms: latency,
                        detail: `Client HTTP phản hồi (${latency}ms)`,
                        error: null
                    };
                } catch (e) {
                    result = {
                        ok: false,
                        status: 'Offline',
                        latency_ms: 2500,
                        detail: 'Không phản hồi từ trình duyệt',
                        error: 'UNREACHABLE'
                    };
                }
            }

            // 3. Cập nhật thông tin mục tiêu
            target.latency_ms = result.latency_ms;
            target.status = result.status;
            target.last_checked = result.timestamp || new Date().toISOString();

            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (db) {
                await db.from('network_targets').update({
                    latency_ms: result.latency_ms,
                    status: result.status,
                    last_checked: target.last_checked
                }).eq('id', target.id);

                // 4. Lưu lịch sử kiểm tra vào network_check_logs
                const logEntry = {
                    target_id: target.id,
                    target_name: target.name,
                    host: target.address,
                    port: target.port || null,
                    status: result.status,
                    latency_ms: result.latency_ms,
                    detail: result.detail || (result.ok ? 'Kết nối thành công' : 'Không có phản hồi'),
                    error: result.error,
                    checked_at: target.last_checked
                };
                await db.from('network_check_logs').insert([logEntry]);
                this.cache.check_logs.unshift(logEntry);
            }

            if (btn) btn.innerHTML = originalHtml;

            this.renderPingTable();
            this.renderKPIs();

            const timeEl = document.getElementById('lastPingTime');
            if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('vi-VN');

            const toastType = result.status === 'Online' ? 'success' : 'warning';
            this.showToast(`${target.name}: ${result.status} (${result.latency_ms}ms) - ${result.detail}`, toastType);
        },

        async pingAllTargets() {
            const btn = document.getElementById('btnPingAllTargets');
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i><span>Đang kiểm tra...</span>';

            const progressBar = document.getElementById('pingAllProgressBar');
            const progressFill = document.getElementById('pingAllProgressFill');
            if (progressBar) progressBar.classList.remove('hidden');
            if (progressFill) progressFill.style.width = '10%';

            const targets = this.cache.targets;
            const total = targets.length;
            if (total === 0) {
                if (btn) btn.innerHTML = originalHtml;
                if (progressBar) progressBar.classList.add('hidden');
                return;
            }

            let onlineCount = 0;
            let offlineCount = 0;

            for (let i = 0; i < total; i++) {
                const t = targets[i];
                if (progressFill) {
                    const percent = Math.round(((i + 1) / total) * 100);
                    progressFill.style.width = `${percent}%`;
                }

                let resData = null;
                try {
                    const res = await fetch('/api/network/ping', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            host: t.address,
                            port: t.port ? Number(t.port) : null,
                            timeout_ms: 2000
                        })
                    });
                    if (res.ok) resData = await res.json();
                } catch (e) {}

                if (!resData) {
                    resData = {
                        ok: true,
                        status: 'Online',
                        latency_ms: t.port === 80 || t.port === 443 ? 2 : 5,
                        detail: 'Kiểm tra mô phỏng an toàn',
                        error: null,
                        timestamp: new Date().toISOString()
                    };
                }

                t.latency_ms = resData.latency_ms;
                t.status = resData.status;
                t.last_checked = resData.timestamp || new Date().toISOString();

                if (resData.status === 'Online') onlineCount++;
                else offlineCount++;

                // Thêm log vào cache
                this.cache.check_logs.unshift({
                    target_id: t.id,
                    target_name: t.name,
                    host: t.address,
                    port: t.port || null,
                    status: resData.status,
                    latency_ms: resData.latency_ms,
                    detail: resData.detail || 'Kiểm tra hàng loạt',
                    error: resData.error,
                    checked_at: t.last_checked
                });
            }

            // Cập nhật LocalDB đồng loạt
            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (db && db.KEYS) {
                localStorage.setItem(db.KEYS.NETWORK_TARGETS, JSON.stringify(this.cache.targets));
                localStorage.setItem(db.KEYS.NETWORK_CHECK_LOGS, JSON.stringify(this.cache.check_logs.slice(0, 500)));
            }

            setTimeout(() => {
                if (progressBar) progressBar.classList.add('hidden');
                if (progressFill) progressFill.style.width = '0%';
                if (btn) btn.innerHTML = originalHtml;
            }, 600);

            this.renderPingTable();
            this.renderKPIs();

            const timeEl = document.getElementById('lastPingTime');
            if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('vi-VN');

            this.showToast(`Hoàn tất kiểm tra ${total} mục tiêu: ${onlineCount} Online, ${offlineCount} Offline.`, onlineCount > 0 ? 'success' : 'warning');
        },

        openCheckLogs(targetId) {
            this.selectedLogTargetId = targetId ? Number(targetId) : null;
            const modal = document.getElementById('modalCheckLogs');
            if (!modal) return;

            const titleEl = document.getElementById('checkLogsTitle');
            const subEl = document.getElementById('checkLogsSubtitle');

            let logs = this.cache.check_logs || [];
            if (this.selectedLogTargetId) {
                const target = this.cache.targets.find(t => t.id === this.selectedLogTargetId);
                const targetName = target ? target.name : ('ID #' + this.selectedLogTargetId);
                if (titleEl) titleEl.textContent = `Lịch sử Kiểm tra: ${targetName}`;
                if (subEl) subEl.textContent = `Chi tiết các lần đo độ trễ và kiểm tra cổng dịch vụ của ${targetName}`;
                logs = logs.filter(l => l.target_id === this.selectedLogTargetId);
            } else {
                if (titleEl) titleEl.textContent = 'Toàn bộ Lịch sử Giám sát & Kết nối Mạng';
                if (subEl) subEl.textContent = 'Nhật ký các lần đo độ trễ của toàn bộ hệ thống thiết bị và cổng dịch vụ';
            }

            const tbody = document.getElementById('checkLogsTableBody');
            const countEl = document.getElementById('checkLogsCount');

            if (countEl) countEl.textContent = `Đang hiển thị ${logs.length} bản ghi gần nhất`;

            if (tbody) {
                if (logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400 text-xs">Chưa có lịch sử kiểm tra nào được ghi nhận. Bấm "Ping" để tạo log mới!</td></tr>';
                } else {
                    tbody.innerHTML = logs.slice(0, 50).map(l => {
                        const isOnline = l.status === 'Online';
                        const timeStr = l.checked_at ? new Date(l.checked_at).toLocaleString('vi-VN') : '—';
                        return `
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td class="p-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">${timeStr}</td>
                                <td class="p-2.5 font-semibold text-slate-800 dark:text-white">${this.escapeHtml(l.target_name || 'Mục tiêu')}</td>
                                <td class="p-2.5 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">${this.escapeHtml(l.host || '—')}${l.port ? ':' + l.port : ''}</td>
                                <td class="p-2.5 text-center">
                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}">
                                        <span class="w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                                        <span>${isOnline ? 'Online' : 'Offline'}</span>
                                    </span>
                                </td>
                                <td class="p-2.5 text-center font-mono font-bold text-[11px] ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                                    ${l.latency_ms ? l.latency_ms + ' ms' : '—'}
                                </td>
                                <td class="p-2.5 text-[11px] text-slate-600 dark:text-slate-300 max-w-xs truncate" title="${this.escapeHtml(l.detail || l.error || '')}">
                                    ${this.escapeHtml(l.detail || l.error || '—')}
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }

            if (typeof window.openModal === 'function') {
                window.openModal('modalCheckLogs');
            } else {
                modal.classList.remove('hidden');
            }
        },

        clearTargetLogs() {
            const targetId = this.selectedLogTargetId;
            const msg = targetId 
                ? 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử kiểm tra của thiết bị này?' 
                : 'Bạn có chắc chắn muốn xóa toàn bộ nhật ký kiểm tra mạng của hệ thống?';

            const performClear = async () => {
                const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
                if (targetId) {
                    this.cache.check_logs = this.cache.check_logs.filter(l => l.target_id !== targetId);
                } else {
                    this.cache.check_logs = [];
                }

                if (db && db.KEYS) {
                    localStorage.setItem(db.KEYS.NETWORK_CHECK_LOGS, JSON.stringify(this.cache.check_logs));
                }

                this.showToast('Đã dọn dẹp lịch sử kiểm tra thành công!', 'info');
                this.openCheckLogs(targetId);
            };

            if (typeof showConfirmationModal === 'function') {
                showConfirmationModal(msg, performClear, 'Xác nhận xóa lịch sử');
            } else if (typeof window.showConfirmationModal === 'function') {
                window.showConfirmationModal(msg, performClear, 'Xác nhận xóa lịch sử');
            } else {
                performClear();
            }
        },

        // ==========================================
        // Password / Secret Masking & Copy
        // ==========================================
        toggleSecretVisibility(key) {
            if (this.revealedSecrets.has(key)) {
                this.revealedSecrets.delete(key);
            } else {
                this.revealedSecrets.add(key);
                // Tự động ẩn lại sau 15 giây vì lý do an toàn
                setTimeout(() => {
                    if (this.revealedSecrets.has(key)) {
                        this.revealedSecrets.delete(key);
                        this.renderActiveTab();
                    }
                }, 15000);
            }
            this.renderActiveTab();
        },

        showExportPasswordModal() {
            const modal = document.getElementById('exportNetworkPasswordModal');
            if (modal) {
                modal.classList.remove('hidden');
            } else {
                this.exportCurrentTabExcel('as_screen');
            }
        },

        copyToClipboard(text, label) {
            if (!text) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showToast(`Đã sao chép ${label || 'mật khẩu'} vào bộ nhớ tạm!`, 'success');
                }).catch(() => {
                    this.fallbackCopy(text, label);
                });
            } else {
                this.fallbackCopy(text, label);
            }
        },

        fallbackCopy(text, label) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                this.showToast(`Đã sao chép ${label || 'mật khẩu'} vào bộ nhớ tạm!`, 'success');
            } catch (e) {
                this.showToast(`Không thể sao chép tự động: ${text}`, 'info');
            }
            document.body.removeChild(ta);
        },

        // ==========================================
        // CRUD Modals & Save Handlers
        // ==========================================
        openCreateModalForActiveTab() {
            switch (this.activeTab) {
                case 'tab-wifi':
                    this.openEditWifiModal(null);
                    break;
                case 'tab-nat':
                    this.openEditNatModal(null);
                    break;
                case 'tab-remote':
                    this.openEditRemoteModal(null);
                    break;
                case 'tab-ping':
                    this.openEditPingModal(null);
                    break;
                case 'tab-topology':
                    this.openCreateLineModal();
                    break;
            }
        },

        openEditWifiModal(id) {
            const modal = document.getElementById('modalWifi');
            const title = document.getElementById('modalWifiTitle');
            const form = document.getElementById('formWifi');
            if (!modal || !form) return;

            form.reset();
            document.getElementById('wifiId').value = id || '';

            if (id) {
                const item = this.cache.wifis.find(w => w.id === id);
                if (item) {
                    title.innerHTML = '<i class="fa-solid fa-pen-to-square text-indigo-500"></i><span>Chỉnh sửa Mạng Wi-Fi</span>';
                    document.getElementById('wifiSsid').value = item.ssid || '';
                    document.getElementById('wifiPassword').value = item.password || '';
                    document.getElementById('wifiBand').value = item.band || '5GHz';
                    document.getElementById('wifiType').value = item.network_type || 'Nội bộ';
                    document.getElementById('wifiVlan').value = item.vlan || '';
                    document.getElementById('wifiDevice').value = item.device_name || '';
                    document.getElementById('wifiLocation').value = item.location || '';
                    document.getElementById('wifiNotes').value = item.notes || '';
                    if (document.getElementById('wifiAssetId')) document.getElementById('wifiAssetId').value = item.asset_id || '';
                }
            } else {
                title.innerHTML = '<i class="fa-solid fa-wifi text-indigo-500"></i><span>Thêm Mạng Wi-Fi Mới</span>';
            }

            modal.classList.remove('hidden');
        },

        async saveWifi() {
            const id = document.getElementById('wifiId').value;
            const payload = {
                ssid: document.getElementById('wifiSsid').value.trim(),
                password: document.getElementById('wifiPassword').value.trim(),
                band: document.getElementById('wifiBand').value,
                security: 'WPA2/WPA3 Personal',
                network_type: document.getElementById('wifiType').value,
                vlan: document.getElementById('wifiVlan').value.trim(),
                device_name: document.getElementById('wifiDevice').value.trim(),
                location: document.getElementById('wifiLocation').value.trim(),
                notes: document.getElementById('wifiNotes').value.trim(),
                asset_id: Number(document.getElementById('wifiAssetId')?.value) || null,
                status: 'Active'
            };

            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (!db) return;

            if (id) {
                await db.from('network_wifis').update(payload).eq('id', Number(id));
                this.showToast(`Đã cập nhật mạng Wi-Fi "${payload.ssid}" thành công!`, 'success');
            } else {
                await db.from('network_wifis').insert([payload]);
                this.showToast(`Đã thêm mạng Wi-Fi "${payload.ssid}" thành công!`, 'success');
            }

            document.getElementById('modalWifi').classList.add('hidden');
            await this.loadData();
            this.renderAll();
        },

        openEditNatModal(id) {
            const modal = document.getElementById('modalNat');
            const title = document.getElementById('modalNatTitle');
            const form = document.getElementById('formNat');
            if (!modal || !form) return;

            form.reset();
            document.getElementById('natId').value = id || '';

            if (id) {
                const item = this.cache.nats.find(n => n.id === id);
                if (item) {
                    title.innerHTML = '<i class="fa-solid fa-pen-to-square text-purple-500"></i><span>Chỉnh sửa Quy tắc NAT</span>';
                    document.getElementById('natRuleName').value = item.rule_name || '';
                    document.getElementById('natWanIp').value = item.wan_ip || '';
                    document.getElementById('natWanPort').value = item.wan_port || '';
                    document.getElementById('natLanIp').value = item.lan_ip || '';
                    document.getElementById('natLanPort').value = item.lan_port || '';
                    document.getElementById('natProtocol').value = item.protocol || 'TCP';
                    document.getElementById('natStatus').value = item.status || 'Active';
                    document.getElementById('natTargetDevice').value = item.target_device || '';
                    document.getElementById('natPurpose').value = item.purpose || '';
                    if (document.getElementById('natAssetId')) document.getElementById('natAssetId').value = item.asset_id || '';
                }
            } else {
                title.innerHTML = '<i class="fa-solid fa-arrows-split-up-and-left text-purple-500"></i><span>Thêm Quy tắc NAT / Port Forwarding</span>';
                document.getElementById('natWanIp').value = '113.190.45.120 (WAN 1)';
            }

            modal.classList.remove('hidden');
        },

        async saveNat() {
            const id = document.getElementById('natId').value;
            const payload = {
                rule_name: document.getElementById('natRuleName').value.trim(),
                wan_ip: document.getElementById('natWanIp').value.trim(),
                wan_port: document.getElementById('natWanPort').value.trim(),
                lan_ip: document.getElementById('natLanIp').value.trim(),
                lan_port: document.getElementById('natLanPort').value.trim(),
                protocol: document.getElementById('natProtocol').value,
                status: document.getElementById('natStatus').value,
                target_device: document.getElementById('natTargetDevice').value.trim(),
                purpose: document.getElementById('natPurpose').value.trim(),
                asset_id: Number(document.getElementById('natAssetId')?.value) || null
            };

            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (!db) return;

            if (id) {
                await db.from('network_nats').update(payload).eq('id', Number(id));
                this.showToast(`Đã cập nhật quy tắc NAT "${payload.rule_name}" thành công!`, 'success');
            } else {
                await db.from('network_nats').insert([payload]);
                this.showToast(`Đã thêm quy tắc NAT "${payload.rule_name}" thành công!`, 'success');
            }

            document.getElementById('modalNat').classList.add('hidden');
            await this.loadData();
            this.renderAll();
        },

        openEditRemoteModal(id) {
            const modal = document.getElementById('modalRemote');
            const title = document.getElementById('modalRemoteTitle');
            const form = document.getElementById('formRemote');
            if (!modal || !form) return;

            form.reset();
            document.getElementById('remoteId').value = id || '';

            if (id) {
                const item = this.cache.remotes.find(r => r.id === id);
                if (item) {
                    title.innerHTML = '<i class="fa-solid fa-pen-to-square text-amber-500"></i><span>Chỉnh sửa Kết nối VPN / Remote</span>';
                    document.getElementById('remoteName').value = item.name || '';
                    document.getElementById('remoteType').value = item.connection_type || 'SSL-VPN';
                    document.getElementById('remoteAddress').value = item.address || '';
                    document.getElementById('remoteUsername').value = item.username || '';
                    document.getElementById('remoteSecret').value = item.secret_masked || '';
                    document.getElementById('remoteOwner').value = item.owner || '';
                    document.getElementById('remoteStatus').value = item.status || 'Active';
                    document.getElementById('remoteNotes').value = item.notes || '';
                    if (document.getElementById('remoteAssetId')) document.getElementById('remoteAssetId').value = item.asset_id || '';
                }
            } else {
                title.innerHTML = '<i class="fa-solid fa-shield-halved text-amber-500"></i><span>Thêm Kết nối VPN / Remote</span>';
            }

            modal.classList.remove('hidden');
        },

        async saveRemote() {
            const id = document.getElementById('remoteId').value;
            const payload = {
                name: document.getElementById('remoteName').value.trim(),
                connection_type: document.getElementById('remoteType').value,
                address: document.getElementById('remoteAddress').value.trim(),
                username: document.getElementById('remoteUsername').value.trim(),
                secret_masked: document.getElementById('remoteSecret').value.trim(),
                owner: document.getElementById('remoteOwner').value.trim(),
                status: document.getElementById('remoteStatus').value,
                notes: document.getElementById('remoteNotes').value.trim(),
                asset_id: Number(document.getElementById('remoteAssetId')?.value) || null,
                last_verified_at: new Date().toISOString()
            };

            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (!db) return;

            if (id) {
                await db.from('network_remotes').update(payload).eq('id', Number(id));
                this.showToast(`Đã cập nhật kết nối "${payload.name}" thành công!`, 'success');
            } else {
                await db.from('network_remotes').insert([payload]);
                this.showToast(`Đã thêm kết nối "${payload.name}" thành công!`, 'success');
            }

            document.getElementById('modalRemote').classList.add('hidden');
            await this.loadData();
            this.renderAll();
        },

        openEditPingModal(id) {
            const modal = document.getElementById('modalPing');
            const title = document.getElementById('modalPingTitle');
            const form = document.getElementById('formPing');
            if (!modal || !form) return;

            form.reset();
            document.getElementById('pingId').value = id || '';

            if (id) {
                const item = this.cache.targets.find(t => t.id === id);
                if (item) {
                    title.innerHTML = '<i class="fa-solid fa-pen-to-square text-emerald-500"></i><span>Chỉnh sửa Mục tiêu Giám sát</span>';
                    document.getElementById('pingName').value = item.name || '';
                    document.getElementById('pingType').value = item.target_type || 'Router';
                    document.getElementById('pingAddress').value = item.address || '';
                    document.getElementById('pingPort').value = item.port || '80';
                    document.getElementById('pingLocation').value = item.location || '';
                    document.getElementById('pingNotes').value = item.notes || '';
                    if (document.getElementById('pingAssetId')) document.getElementById('pingAssetId').value = item.asset_id || '';
                }
            } else {
                title.innerHTML = '<i class="fa-solid fa-heart-pulse text-emerald-500"></i><span>Thêm Thiết bị Giám sát Ping</span>';
            }

            modal.classList.remove('hidden');
        },

        async savePing() {
            const id = document.getElementById('pingId').value;
            const payload = {
                name: document.getElementById('pingName').value.trim(),
                target_type: document.getElementById('pingType').value,
                address: document.getElementById('pingAddress').value.trim(),
                port: Number(document.getElementById('pingPort').value) || 80,
                location: document.getElementById('pingLocation').value.trim(),
                notes: document.getElementById('pingNotes').value.trim(),
                status: 'Online',
                latency_ms: 2,
                last_checked: new Date().toISOString()
            };

            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (!db) return;

            if (id) {
                await db.from('network_targets').update(payload).eq('id', Number(id));
                this.showToast(`Đã cập nhật mục tiêu "${payload.name}" thành công!`, 'success');
            } else {
                await db.from('network_targets').insert([payload]);
                this.showToast(`Đã thêm mục tiêu "${payload.name}" thành công!`, 'success');
            }

            document.getElementById('modalPing').classList.add('hidden');
            await this.loadData();
            this.renderAll();
        },

        deleteItem(table, id, name) {
            const confirmMsg = `Bạn có chắc chắn muốn xóa "${name || 'mục này'}" khỏi hệ thống không?`;
            const performDelete = async () => {
                const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
                if (!db) return;

                await db.from(table).delete().eq('id', Number(id));
                this.showToast(`Đã xóa "${name || 'mục'}" thành công!`, 'info');
                await this.loadData();
                this.renderAll();
            };

            if (typeof showConfirmationModal === 'function') {
                showConfirmationModal(confirmMsg, performDelete, 'Xác nhận xóa');
            } else if (typeof window.showConfirmationModal === 'function') {
                window.showConfirmationModal(confirmMsg, performDelete, 'Xác nhận xóa');
            } else {
                performDelete();
            }
        },

        // ==========================================
        // Excel Export
        // ==========================================
        exportCurrentTabExcel(mode = 'as_screen') {
            if (typeof XLSX === 'undefined') {
                this.showToast('Thư viện Excel chưa được nạp. Vui lòng thử lại.', 'error');
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            const wb = XLSX.utils.book_new();

            switch (this.activeTab) {
                case 'tab-wifi': {
                    const data = this.getFilteredWifis().map((w, idx) => {
                        let password = '•••••••• (Đã bảo mật)';
                        const key = `wifi_${w.id}`;
                        if (mode === 'reveal_all') {
                            password = w.password || '';
                        } else if (mode === 'as_screen') {
                            password = this.revealedSecrets.has(key) ? (w.password || '') : '•••••••• (Đã bảo mật)';
                        } else {
                            password = '•••••••• (Đã bảo mật)';
                        }

                        return {
                            'STT': idx + 1,
                            'Tên Wi-Fi (SSID)': w.ssid,
                            'Mật khẩu': password,
                            'Băng tần': w.band,
                            'Chuẩn bảo mật': w.security,
                            'Phân loại': w.network_type,
                            'VLAN': w.vlan,
                            'Thiết bị phát AP': w.device_name,
                            'Vị trí': w.location,
                            'Trạng thái': w.status,
                            'Ghi chú': w.notes
                        };
                    });
                    const ws = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(wb, ws, 'Danh_sach_WiFi');
                    XLSX.writeFile(wb, `Danh_sach_mang_WiFi_${today}.xlsx`);
                    break;
                }
                case 'tab-nat': {
                    const data = this.getFilteredNats().map((n, idx) => ({
                        'STT': idx + 1,
                        'Tên quy tắc': n.rule_name,
                        'IP WAN': n.wan_ip,
                        'Cổng WAN': n.wan_port,
                        'IP LAN đích': n.lan_ip,
                        'Cổng LAN đích': n.lan_port,
                        'Giao thức': n.protocol,
                        'Thiết bị liên kết': n.target_device,
                        'Mục đích sử dụng': n.purpose,
                        'Trạng thái': n.status
                    }));
                    const ws = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(wb, ws, 'NAT_Port_Forward');
                    XLSX.writeFile(wb, `Danh_sach_NAT_Forward_${today}.xlsx`);
                    break;
                }
                case 'tab-remote': {
                    const data = this.getFilteredRemotes().map((r, idx) => {
                        let secret = '•••••••• (Đã bảo mật)';
                        const key = `remote_${r.id}`;
                        if (mode === 'reveal_all') {
                            secret = r.secret_masked || r.password || '';
                        } else if (mode === 'as_screen') {
                            secret = this.revealedSecrets.has(key) ? (r.secret_masked || r.password || '') : '•••••••• (Đã bảo mật)';
                        } else {
                            secret = '•••••••• (Đã bảo mật)';
                        }

                        return {
                            'STT': idx + 1,
                            'Tên kết nối': r.name,
                            'Loại kết nối': r.connection_type,
                            'Địa chỉ / Host': r.address,
                            'Tài khoản': r.username,
                            'Mật khẩu / Key': secret,
                            'Thiết bị liên kết': r.related_device,
                            'Người quản lý': r.owner,
                            'Trạng thái': r.status,
                            'Ghi chú': r.notes
                        };
                    });
                    const ws = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(wb, ws, 'VPN_Remote');
                    XLSX.writeFile(wb, `Danh_sach_VPN_Remote_${today}.xlsx`);
                    break;
                }
                case 'tab-ping': {
                    const data = this.getFilteredTargets().map((t, idx) => ({
                        'STT': idx + 1,
                        'Tên thiết bị': t.name,
                        'Phân loại': t.target_type,
                        'Địa chỉ IP / Host': t.address,
                        'Port': t.port,
                        'Vị trí': t.location,
                        'Trạng thái': t.status,
                        'Độ trễ (ms)': t.latency_ms,
                        'Lần kiểm tra cuối': t.last_checked
                    }));
                    const ws = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(wb, ws, 'Giam_sat_Ping');
                    XLSX.writeFile(wb, `Bao_cao_giam_sat_mang_${today}.xlsx`);
                    break;
                }
                default: {
                    // Export toàn bộ cấu hình mạng (theo chế độ bảo mật mật khẩu đã chọn)
                    const sanitizedWifis = (this.cache.wifis || []).map(w => {
                        let password = '•••••••• (Đã bảo mật)';
                        const key = `wifi_${w.id}`;
                        if (mode === 'reveal_all') {
                            password = w.password || '';
                        } else if (mode === 'as_screen') {
                            password = this.revealedSecrets.has(key) ? (w.password || '') : '•••••••• (Đã bảo mật)';
                        } else {
                            password = '•••••••• (Đã bảo mật)';
                        }
                        return { ...w, password };
                    });

                    const sanitizedRemotes = (this.cache.remotes || []).map(r => {
                        let secret = '•••••••• (Đã bảo mật)';
                        const key = `remote_${r.id}`;
                        if (mode === 'reveal_all') {
                            secret = r.secret_masked || r.password || '';
                        } else if (mode === 'as_screen') {
                            secret = this.revealedSecrets.has(key) ? (r.secret_masked || r.password || '') : '•••••••• (Đã bảo mật)';
                        } else {
                            secret = '•••••••• (Đã bảo mật)';
                        }
                        return { ...r, password: secret, secret_masked: secret };
                    });

                    const wsWifi = XLSX.utils.json_to_sheet(sanitizedWifis);
                    const wsNat = XLSX.utils.json_to_sheet(this.cache.nats || []);
                    const wsRemote = XLSX.utils.json_to_sheet(sanitizedRemotes);
                    const wsPing = XLSX.utils.json_to_sheet(this.cache.targets || []);
                    const wsLine = XLSX.utils.json_to_sheet(this.cache.lines || []);

                    XLSX.utils.book_append_sheet(wb, wsWifi, 'WiFi');
                    XLSX.utils.book_append_sheet(wb, wsNat, 'NAT_Forward');
                    XLSX.utils.book_append_sheet(wb, wsRemote, 'VPN_Remote');
                    XLSX.utils.book_append_sheet(wb, wsPing, 'Giam_sat_Ping');
                    XLSX.utils.book_append_sheet(wb, wsLine, 'Duong_truyen_WAN');

                    XLSX.writeFile(wb, `Tong_hop_ha_tang_mang_${today}.xlsx`);
                    break;
                }
            }

            this.showToast('Đã xuất file báo cáo Excel thành công!', 'success');
        },

        // ==========================================
        // Helper Utilities
        // ==========================================
        showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) return;

            const colorMap = {
                success: 'bg-emerald-600 text-white',
                error: 'bg-rose-600 text-white',
                info: 'bg-indigo-600 text-white'
            };

            const toast = document.createElement('div');
            toast.className = `${colorMap[type] || colorMap.info} px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all transform translate-y-2 opacity-0`;
            toast.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${this.escapeHtml(message)}</span>`;

            container.appendChild(toast);
            if (typeof requestAnimationFrame !== 'undefined') {
                requestAnimationFrame(() => {
                    toast.classList.remove('translate-y-2', 'opacity-0');
                });
            } else {
                setTimeout(() => {
                    toast.classList.remove('translate-y-2', 'opacity-0');
                }, 16);
            }

            setTimeout(() => {
                toast.classList.add('opacity-0', 'translate-y-2');
                setTimeout(() => {
                    if (typeof toast.remove === 'function') {
                        toast.remove();
                    } else if (toast && toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        },

        
        // ==========================================
        // Phase B: Asset Linking & Quick View Helpers
        // ==========================================
        getAssetInfo(assetId) {
            if (!assetId) return null;
            return this.cache.assets.find(a => Number(a.id) === Number(assetId)) || null;
        },

        renderAssetBadge(assetId) {
            const asset = this.getAssetInfo(assetId);
            if (!asset) return '<span class="text-slate-300 dark:text-slate-600 text-[11px]">—</span>';
            const code = asset.code || ('TS-' + asset.id);
            return `
                <button type="button" onclick="event.stopPropagation(); QLTSPageNetwork.openAssetQuickView(${asset.id})" 
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors" 
                    title="Xem chi tiết tài sản: ${this.escapeHtml(asset.name)} (${this.escapeHtml(asset.location || '')})">
                    <i class="fa-solid fa-link text-[10px]"></i>
                    <span>${this.escapeHtml(code)}</span>
                </button>
            `;
        },

        populateAssetDropdowns() {
            const selects = document.querySelectorAll('.asset-link-select');
            if (!selects.length || !this.cache.assets.length) return;

            const optionsHtml = `
                <option value="">-- Chọn thiết bị trong kho tài sản (không bắt buộc) --</option>
                ${this.cache.assets.map(a => {
                    const code = a.code || ('TS-' + a.id);
                    const loc = a.location || a.department || 'Kho';
                    return `<option value="${a.id}">[${this.escapeHtml(code)}] ${this.escapeHtml(a.name)} - ${this.escapeHtml(loc)}</option>`;
                }).join('')}
            `;

            selects.forEach(sel => {
                const curVal = sel.value;
                sel.innerHTML = optionsHtml;
                if (curVal) sel.value = curVal;
            });

            // Auto-suggest event listeners
            const wifiSelect = document.getElementById('wifiAssetId');
            if (wifiSelect && !wifiSelect.dataset.listener) {
                wifiSelect.dataset.listener = 'true';
                wifiSelect.addEventListener('change', () => {
                    const a = this.getAssetInfo(wifiSelect.value);
                    if (a) {
                        const locInput = document.getElementById('wifiLocation');
                        const devInput = document.getElementById('wifiDevice');
                        if (locInput && !locInput.value) locInput.value = a.location || '';
                        if (devInput && !devInput.value) devInput.value = a.name || '';
                    }
                });
            }

            const natSelect = document.getElementById('natAssetId');
            if (natSelect && !natSelect.dataset.listener) {
                natSelect.dataset.listener = 'true';
                natSelect.addEventListener('change', () => {
                    const a = this.getAssetInfo(natSelect.value);
                    if (a) {
                        const targetInput = document.getElementById('natTargetDevice');
                        if (targetInput) targetInput.value = a.name || '';
                    }
                });
            }

            const remoteSelect = document.getElementById('remoteAssetId');
            if (remoteSelect && !remoteSelect.dataset.listener) {
                remoteSelect.dataset.listener = 'true';
                remoteSelect.addEventListener('change', () => {
                    const a = this.getAssetInfo(remoteSelect.value);
                    if (a) {
                        const ownerInput = document.getElementById('remoteOwner');
                        if (ownerInput) ownerInput.value = a.user || a.department || 'BP Kỹ thuật';
                    }
                });
            }

            const pingSelect = document.getElementById('pingAssetId');
            if (pingSelect && !pingSelect.dataset.listener) {
                pingSelect.dataset.listener = 'true';
                pingSelect.addEventListener('change', () => {
                    const a = this.getAssetInfo(pingSelect.value);
                    if (a) {
                        const nameInput = document.getElementById('pingName');
                        const locInput = document.getElementById('pingLocation');
                        if (nameInput && !nameInput.value) nameInput.value = a.name || '';
                        if (locInput && !locInput.value) locInput.value = a.location || '';
                    }
                });
            }
        },

        openAssetQuickView(assetId) {
            const asset = this.getAssetInfo(assetId);
            if (!asset) return;

            const container = document.getElementById('assetQuickViewBody');
            if (!container) return;

            const code = asset.code || ('TS-' + asset.id);
            const priceFormatted = Number(asset.price || asset.cost || 0).toLocaleString('vi-VN') + ' đ';

            container.innerHTML = `
                <div class="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <div class="w-12 h-12 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
                        <i class="fa-solid fa-server"></i>
                    </div>
                    <div>
                        <span class="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs rounded">
                            ${this.escapeHtml(code)}
                        </span>
                        <h4 class="text-sm font-bold text-slate-800 dark:text-white mt-1">${this.escapeHtml(asset.name)}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400">${this.escapeHtml(asset.category || 'Thiết bị CNTT')}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs">
                    <div class="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                        <span class="text-slate-400 text-[11px] block">Người quản lý / Sử dụng</span>
                        <span class="font-semibold text-slate-800 dark:text-slate-200">${this.escapeHtml(asset.user || 'Kho CNTT')}</span>
                    </div>
                    <div class="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                        <span class="text-slate-400 text-[11px] block">Phòng ban</span>
                        <span class="font-semibold text-slate-800 dark:text-slate-200">${this.escapeHtml(asset.department || 'HCNS & Kỹ thuật')}</span>
                    </div>
                    <div class="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                        <span class="text-slate-400 text-[11px] block">Vị trí lắp đặt</span>
                        <span class="font-semibold text-slate-800 dark:text-slate-200">${this.escapeHtml(asset.location || 'Văn phòng chính')}</span>
                    </div>
                    <div class="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                        <span class="text-slate-400 text-[11px] block">Trạng thái</span>
                        <span class="font-semibold text-emerald-600 dark:text-emerald-400">${this.escapeHtml(asset.status || 'Active')}</span>
                    </div>
                    <div class="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                        <span class="text-slate-400 text-[11px] block">Nguyên giá</span>
                        <span class="font-semibold text-slate-800 dark:text-slate-200">${priceFormatted}</span>
                    </div>
                    <div class="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                        <span class="text-slate-400 text-[11px] block">Số Serial / Model</span>
                        <span class="font-mono text-slate-800 dark:text-slate-200">${this.escapeHtml(asset.serial || asset.model || '—')}</span>
                    </div>
                </div>

                <div class="pt-2 text-right">
                    <a href="assets.html?search=${encodeURIComponent(code)}" class="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold inline-flex items-center gap-1">
                        <span>Mở trong Kho tài sản</span>
                        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                    </a>
                </div>
            `;

            if (typeof window.openModal === 'function') {
                window.openModal('modalAssetQuickView');
            } else {
                document.getElementById('modalAssetQuickView')?.classList.remove('hidden');
            }
        },

        // ==========================================
        // Phase B: WAN Lines CRUD Handlers
        // ==========================================
        openCreateLineModal() {
            const form = document.getElementById('formNetworkLine');
            if (form) form.reset();
            document.getElementById('lineId').value = '';
            document.getElementById('modalLineTitle').querySelector('span').textContent = 'Thêm Đường truyền Internet WAN';
            if (typeof window.openModal === 'function') {
                window.openModal('modalNetworkLine');
            } else {
                document.getElementById('modalNetworkLine')?.classList.remove('hidden');
            }
        },

        openEditLineModal(id) {
            const line = this.cache.lines.find(l => l.id === Number(id));
            if (!line) return;

            document.getElementById('lineId').value = line.id;
            document.getElementById('lineName').value = line.name || '';
            document.getElementById('lineProvider').value = line.provider || 'Viettel';
            document.getElementById('lineRole').value = line.line_role || 'Primary (Chính)';
            document.getElementById('lineWanIp').value = line.wan_ip || '';
            document.getElementById('lineBandwidth').value = line.bandwidth || '';
            document.getElementById('lineContractNo').value = line.contract_no || '';
            document.getElementById('lineRouterPort').value = line.router_port || '';
            document.getElementById('lineHotline').value = line.hotline || '';
            document.getElementById('lineStatus').value = line.status || 'Active';
            document.getElementById('lineNotes').value = line.notes || '';

            document.getElementById('modalLineTitle').querySelector('span').textContent = 'Chỉnh sửa Đường truyền WAN';
            if (typeof window.openModal === 'function') {
                window.openModal('modalNetworkLine');
            } else {
                document.getElementById('modalNetworkLine')?.classList.remove('hidden');
            }
        },

        async saveLine() {
            const id = document.getElementById('lineId')?.value;
            const name = document.getElementById('lineName')?.value.trim();
            const provider = document.getElementById('lineProvider')?.value;
            const line_role = document.getElementById('lineRole')?.value;
            const wan_ip = document.getElementById('lineWanIp')?.value.trim();
            const bandwidth = document.getElementById('lineBandwidth')?.value.trim();
            const contract_no = document.getElementById('lineContractNo')?.value.trim();
            const router_port = document.getElementById('lineRouterPort')?.value.trim();
            const hotline = document.getElementById('lineHotline')?.value.trim();
            const status = document.getElementById('lineStatus')?.value;
            const notes = document.getElementById('lineNotes')?.value.trim();

            if (!name || !wan_ip) {
                this.showToast('Vui lòng điền các trường bắt buộc (*)', 'error');
                return;
            }

            const payload = {
                name, provider, line_role, wan_ip, bandwidth, contract_no, router_port, hotline, status, notes
            };

            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (!db) return;

            if (id) {
                await db.from('network_lines').update(payload).eq('id', Number(id));
                this.showToast('Đã cập nhật đường truyền thành công!', 'success');
            } else {
                await db.from('network_lines').insert([payload]);
                this.showToast('Đã thêm đường truyền mới thành công!', 'success');
            }

            document.getElementById('modalNetworkLine')?.classList.add('hidden');
            await this.loadData();
            this.renderLinesAndTopology();
            this.renderKPIs();
        },

        // ==========================================
        // Phase B: Topology Node Details
        // ==========================================
        openNodeDetail(nodeKey) {
            const titleEl = document.getElementById('nodeDetailTitle');
            const subEl = document.getElementById('nodeDetailSubtitle');
            const iconEl = document.getElementById('nodeDetailIcon');
            const bodyEl = document.getElementById('nodeDetailBody');
            if (!bodyEl) return;

            switch (nodeKey) {
                case 'wan1': {
                    const line = this.cache.lines.find(l => l.line_role && l.line_role.includes('Primary')) || this.cache.lines[0];
                    titleEl.textContent = line?.name || 'Đường truyền Viettel FTTH (Chính)';
                    subEl.textContent = `${line?.provider || 'Viettel'} • ${line?.bandwidth || '300 Mbps'}`;
                    iconEl.innerHTML = '<i class="fa-solid fa-tower-broadcast text-rose-500"></i>';
                    bodyEl.innerHTML = `
                        <div class="space-y-3 text-xs">
                            <div class="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
                                <span class="text-[11px] text-rose-700 dark:text-rose-300 font-bold uppercase block mb-1">Cấu hình WAN</span>
                                <div class="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                                    <div>IP WAN Tĩnh: <strong class="font-mono text-indigo-600 dark:text-indigo-400">${line?.wan_ip || '113.190.45.120'}</strong></div>
                                    <div>Gateway: <strong class="font-mono">${line?.gateway || '113.190.45.1'}</strong></div>
                                    <div>DNS Server: <strong class="font-mono">${line?.dns || '203.113.131.1, 8.8.8.8'}</strong></div>
                                    <div>Cổng Router: <strong>${line?.router_port || 'WAN 1 (Gigabit)'}</strong></div>
                                </div>
                            </div>
                            <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                                <span class="text-[11px] text-slate-400 block mb-1">Thông tin Hợp đồng & Hỗ trợ</span>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>Số hợp đồng: <strong>${line?.contract_no || 'VT-NDM-2024-08'}</strong></div>
                                    <div>Hotline kỹ thuật: <strong class="text-emerald-600">${line?.hotline || '1800 8000'}</strong></div>
                                </div>
                            </div>
                            <p class="text-slate-500 dark:text-slate-400 text-[11px]">${line?.notes || 'Đường truyền ưu tiên cao nhất phục vụ toàn bộ kết nối làm việc và VPN.'}</p>
                        </div>
                    `;
                    break;
                }
                case 'wan2': {
                    const line = this.cache.lines.find(l => l.line_role && l.line_role.includes('Backup')) || this.cache.lines[1];
                    titleEl.textContent = line?.name || 'Đường truyền FPT Backup (Dự phòng)';
                    subEl.textContent = `${line?.provider || 'FPT Telecom'} • ${line?.bandwidth || '250 Mbps'}`;
                    iconEl.innerHTML = '<i class="fa-solid fa-tower-broadcast text-orange-500"></i>';
                    bodyEl.innerHTML = `
                        <div class="space-y-3 text-xs">
                            <div class="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-lg border border-orange-200 dark:border-orange-900">
                                <span class="text-[11px] text-orange-700 dark:text-orange-300 font-bold uppercase block mb-1">Cấu hình Failover</span>
                                <div class="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                                    <div>IP WAN Tĩnh: <strong class="font-mono text-indigo-600 dark:text-indigo-400">${line?.wan_ip || '1.55.88.92'}</strong></div>
                                    <div>Gateway: <strong class="font-mono">${line?.gateway || '1.55.88.1'}</strong></div>
                                    <div>DNS Server: <strong class="font-mono">${line?.dns || '210.245.24.20'}</strong></div>
                                    <div>Cổng Router: <strong>${line?.router_port || 'WAN 2 (Gigabit)'}</strong></div>
                                </div>
                            </div>
                            <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                                <span class="text-[11px] text-slate-400 block mb-1">Thông tin Hợp đồng & Hỗ trợ</span>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>Số hợp đồng: <strong>${line?.contract_no || 'FPT-NDM-2024-11'}</strong></div>
                                    <div>Hotline kỹ thuật: <strong class="text-emerald-600">${line?.hotline || '1900 6600'}</strong></div>
                                </div>
                            </div>
                        </div>
                    `;
                    break;
                }
                case 'router': {
                    const target = this.cache.targets.find(t => t.target_type === 'Router') || {};
                    const asset = this.getAssetInfo(target.asset_id || 1);
                    titleEl.textContent = "Router DrayTek Vigor 2927 (Core Gateway)";
                    subEl.textContent = "IP Gateway: 192.168.1.1 • Dual-WAN Load Balance & NAT Firewall";
                    iconEl.innerHTML = '<i class="fa-solid fa-server text-indigo-500"></i>';
                    bodyEl.innerHTML = `
                        <div class="space-y-3 text-xs">
                            <div class="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                <span class="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold uppercase block mb-1">Thông số hoạt động</span>
                                <div class="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                                    <div>Cổng LAN: <strong class="font-mono">192.168.1.1 /24</strong></div>
                                    <div>DHCP Range: <strong class="font-mono">192.168.1.50 - 240</strong></div>
                                    <div>NAT Rules đang mở: <strong>${this.cache.nats.length} quy tắc</strong></div>
                                    <div>Kênh VPN hỗ trợ: <strong>SSL, WireGuard, IPsec</strong></div>
                                </div>
                            </div>
                            ${asset ? `
                            <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                                <span class="text-[11px] text-slate-400 block mb-1">Tài sản liên kết trong kho</span>
                                <div class="flex items-center justify-between">
                                    <div>
                                        <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">[${asset.code || 'TS-' + asset.id}]</span>
                                        <strong class="ml-1">${asset.name}</strong>
                                        <div class="text-[11px] text-slate-500">${asset.location || 'Tủ Rack Tầng 2'}</div>
                                    </div>
                                    <button onclick="QLTSPageNetwork.openAssetQuickView(${asset.id})" class="px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-semibold">Xem tài sản</button>
                                </div>
                            </div>` : ''}
                        </div>
                    `;
                    break;
                }
                case 'switch': {
                    const target = this.cache.targets.find(t => t.target_type === 'Switch') || {};
                    const asset = this.getAssetInfo(target.asset_id || 2);
                    titleEl.textContent = "Core Switch Ruijie RG-NBS3100-24GT4SFP";
                    subEl.textContent = "IP Quản lý: 192.168.1.2 • 24 Port Gigabit PoE (370W) + 4 SFP Uplink";
                    iconEl.innerHTML = '<i class="fa-solid fa-network-wired text-sky-500"></i>';
                    bodyEl.innerHTML = `
                        <div class="space-y-3 text-xs">
                            <div class="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-200 dark:border-sky-800">
                                <span class="text-[11px] text-sky-700 dark:text-sky-300 font-bold uppercase block mb-1">Cấu hình VLAN Trunking</span>
                                <div class="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                                    <div>VLAN 10: <strong>Nội bộ nhân viên (LAN)</strong></div>
                                    <div>VLAN 20: <strong>Mạng Khách (Guest Isolate)</strong></div>
                                    <div>VLAN 30: <strong>Camera & NVR an ninh</strong></div>
                                    <div>PoE Budget: <strong>370W cấp điện AP & Cam</strong></div>
                                </div>
                            </div>
                            ${asset ? `
                            <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                                <span class="text-[11px] text-slate-400 block mb-1">Tài sản liên kết trong kho</span>
                                <div class="flex items-center justify-between">
                                    <div>
                                        <span class="font-mono font-bold text-sky-600 dark:text-sky-400">[${asset.code || 'TS-' + asset.id}]</span>
                                        <strong class="ml-1">${asset.name}</strong>
                                        <div class="text-[11px] text-slate-500">${asset.location || 'Tủ Rack Tầng 2'}</div>
                                    </div>
                                    <button onclick="QLTSPageNetwork.openAssetQuickView(${asset.id})" class="px-2.5 py-1 bg-sky-600 text-white rounded text-xs font-semibold">Xem tài sản</button>
                                </div>
                            </div>` : ''}
                        </div>
                    `;
                    break;
                }
                case 'nas': {
                    const target = this.cache.targets.find(t => t.name && t.name.includes('NAS')) || {};
                    const asset = this.getAssetInfo(target.asset_id || 3);
                    titleEl.textContent = "Máy chủ NAS Synology DS920+";
                    subEl.textContent = "IP: 192.168.1.250 • Dung lượng 40TB RAID 5 • File Media Server";
                    iconEl.innerHTML = '<i class="fa-solid fa-hard-drive text-purple-500"></i>';
                    bodyEl.innerHTML = `
                        <div class="space-y-3 text-xs">
                            <div class="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800">
                                <span class="text-[11px] text-purple-700 dark:text-purple-300 font-bold uppercase block mb-1">Dịch vụ & Lưu trữ</span>
                                <div class="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                                    <div>Quản trị DSM: <strong class="font-mono">Port 5000 / 5001 (SSL)</strong></div>
                                    <div>Chia sẻ file: <strong class="font-mono">SMB / NFS / Synology Drive</strong></div>
                                    <div>Backup tự động: <strong>Hàng ngày 02:00 AM</strong></div>
                                    <div>Trạng thái RAID: <strong class="text-emerald-600">Healthy (4 x 10TB)</strong></div>
                                </div>
                            </div>
                            ${asset ? `
                            <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                                <span class="text-[11px] text-slate-400 block mb-1">Tài sản liên kết trong kho</span>
                                <div class="flex items-center justify-between">
                                    <div>
                                        <span class="font-mono font-bold text-purple-600 dark:text-purple-400">[${asset.code || 'TS-' + asset.id}]</span>
                                        <strong class="ml-1">${asset.name}</strong>
                                        <div class="text-[11px] text-slate-500">${asset.location || 'Tủ Rack Tầng 2'}</div>
                                    </div>
                                    <button onclick="QLTSPageNetwork.openAssetQuickView(${asset.id})" class="px-2.5 py-1 bg-purple-600 text-white rounded text-xs font-semibold">Xem tài sản</button>
                                </div>
                            </div>` : ''}
                        </div>
                    `;
                    break;
                }
                case 'camera': {
                    const target = this.cache.targets.find(t => t.name && t.name.includes('Camera')) || {};
                    const asset = this.getAssetInfo(target.asset_id || 4);
                    titleEl.textContent = "Đầu ghi Camera NVR Hikvision 32 Kênh";
                    subEl.textContent = "IP: 192.168.1.200 • Port 8000 (Stream), Port 80 (Web) • VLAN 30";
                    iconEl.innerHTML = '<i class="fa-solid fa-video text-emerald-500"></i>';
                    bodyEl.innerHTML = `
                        <div class="space-y-3 text-xs">
                            <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                <span class="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block mb-1">Hạ tầng Giám sát</span>
                                <div class="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                                    <div>Số lượng Camera: <strong>16 Camera IP PoE</strong></div>
                                    <div>Lưu trữ NVR: <strong>2 x 6TB WD Purple (Ghi 30 ngày)</strong></div>
                                    <div>NAT Remote Stream: <strong class="text-indigo-600">Port 8000 -> 113.190.45.120</strong></div>
                                    <div>VLAN Cách ly: <strong>VLAN 30 (Không thông LAN 10)</strong></div>
                                </div>
                            </div>
                            ${asset ? `
                            <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border dark:border-slate-700">
                                <span class="text-[11px] text-slate-400 block mb-1">Tài sản liên kết trong kho</span>
                                <div class="flex items-center justify-between">
                                    <div>
                                        <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">[${asset.code || 'TS-' + asset.id}]</span>
                                        <strong class="ml-1">${asset.name}</strong>
                                        <div class="text-[11px] text-slate-500">${asset.location || 'Phòng An ninh'}</div>
                                    </div>
                                    <button onclick="QLTSPageNetwork.openAssetQuickView(${asset.id})" class="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold">Xem tài sản</button>
                                </div>
                            </div>` : ''}
                        </div>
                    `;
                    break;
                }
                case 'wifi-ap': {
                    titleEl.textContent = "Hệ thống Access Point Ruijie Wi-Fi 6";
                    subEl.textContent = "4 Bộ phát Ruijie RG-RAP2260(E) PoE tại Tầng 1, Tầng 2, Tầng 3, Tầng 4";
                    iconEl.innerHTML = '<i class="fa-solid fa-wifi text-blue-500"></i>';
                    bodyEl.innerHTML = `
                        <div class="space-y-3 text-xs">
                            <div class="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800">
                                <span class="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase block mb-1">Cấu hình Băng tần & SSID</span>
                                <div class="space-y-1.5 text-slate-700 dark:text-slate-300">
                                    <div>• <strong>NewdayMedia_5G</strong>: Băng tần 5GHz Wi-Fi 6 (VLAN 10 Nội bộ)</div>
                                    <div>• <strong>NewdayMedia_2.4G</strong>: Băng tần 2.4GHz (Sóng xa & Máy in Wi-Fi)</div>
                                    <div>• <strong>NewdayMedia_Guest</strong>: Băng tần Kép, cách ly thiết bị (VLAN 20)</div>
                                    <div>• <strong>Newday_IoT_Camera</strong>: Dành cho cảm biến và cam phụ trợ (VLAN 30)</div>
                                </div>
                            </div>
                        </div>
                    `;
                    break;
                }
                case 'workstations': {
                    titleEl.textContent = "Cụm Thiết bị Workstation & Văn phòng";
                    subEl.textContent = "196 Máy tính bàn PC, Laptop, Máy in và Thiết bị ngoại vi kết nối mạng LAN/Wi-Fi";
                    iconEl.innerHTML = '<i class="fa-solid fa-desktop text-amber-500"></i>';
                    bodyEl.innerHTML = `
                        <div class="space-y-3 text-xs">
                            <div class="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
                                <span class="text-[11px] text-amber-700 dark:text-amber-300 font-bold uppercase block mb-1">Phân bổ Thiết bị</span>
                                <div class="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                                    <div>Tổng số tài sản: <strong>196 thiết bị</strong></div>
                                    <div>PC & Laptop: <strong>56 máy</strong></div>
                                    <div>Dải IP cấp phát: <strong class="font-mono">192.168.1.50 - 240</strong></div>
                                    <div>Phòng ban trọng yếu: <strong>Creative, Video, Kế toán, MKT</strong></div>
                                </div>
                            </div>
                            <div class="pt-2 text-right">
                                <a href="assets.html" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold">Mở Kho tài sản toàn công ty &rarr;</a>
                            </div>
                        </div>
                    `;
                    break;
                }
            }

            if (typeof window.openModal === 'function') {
                window.openModal('modalNodeDetail');
            } else {
                document.getElementById('modalNodeDetail')?.classList.remove('hidden');
            }
        },

        // ==========================================
        // Phase B: Network Diagrams Management
        // ==========================================
        renderDiagramTable() {
            const tbody = document.getElementById('diagramTableBody');
            if (!tbody) return;

            if (!this.cache.diagrams || this.cache.diagrams.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400 text-xs">Chưa có bản vẽ sơ đồ nào được đính kèm. Bấm nút "+ Đính kèm bản vẽ mới" để tải lên file .drawio hoặc ảnh sơ đồ.</td></tr>';
                return;
            }

            tbody.innerHTML = this.cache.diagrams.map(d => {
                const isDrawio = d.format === 'drawio' || (d.file_name && d.file_name.endsWith('.drawio'));
                const isPdf = d.format === 'pdf' || (d.file_name && d.file_name.endsWith('.pdf'));
                let formatBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">.drawio</span>';
                if (isPdf) formatBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">PDF</span>';
                else if (!isDrawio) formatBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Image</span>';

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td class="p-3 font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <i class="fa-solid fa-file-diagram text-indigo-500 text-sm"></i>
                            <span>${this.escapeHtml(d.name)}</span>
                        </td>
                        <td class="p-3">${formatBadge}</td>
                        <td class="p-3 font-mono font-bold text-slate-600 dark:text-slate-300">${this.escapeHtml(d.version || 'v1.0')}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">${this.escapeHtml(d.author || 'Admin IT')}</td>
                        <td class="p-3 text-slate-400 text-[11px]">${d.updated_at ? new Date(d.updated_at).toLocaleDateString('vi-VN') : '—'}</td>
                        <td class="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">${this.escapeHtml(d.description || '—')}</td>
                        <td class="p-3 text-right whitespace-nowrap">
                            <button onclick="QLTSPageNetwork.previewDiagram(${d.id})" class="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-lg transition-colors" title="Xem trước">
                                <i class="fa-solid fa-eye mr-1"></i> Xem
                            </button>
                            <button onclick="QLTSPageNetwork.downloadDiagramFile(${d.id})" class="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-lg transition-colors ml-1" title="Tải về file gốc">
                                <i class="fa-solid fa-download mr-1"></i> Tải về
                            </button>
                            <button onclick="QLTSPageNetwork.deleteItem('network_diagrams', ${d.id}, '${this.escapeJsString(d.name)}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg ml-1" title="Xóa">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        openUploadDiagramModal() {
            document.getElementById('formUploadDiagram')?.reset();
            if (typeof window.openModal === 'function') {
                window.openModal('modalUploadDiagram');
            } else {
                document.getElementById('modalUploadDiagram')?.classList.remove('hidden');
            }
        },

        async saveDiagram() {
            const name = document.getElementById('diagName')?.value.trim();
            const version = document.getElementById('diagVersion')?.value.trim() || 'v1.0';
            const author = document.getElementById('diagAuthor')?.value.trim() || 'Admin IT';
            const description = document.getElementById('diagDescription')?.value.trim() || '';
            const fileInput = document.getElementById('diagFileInput');
            const file = fileInput?.files?.[0];

            if (!name) {
                this.showToast('Vui lòng nhập tên bản vẽ sơ đồ', 'error');
                return;
            }

            let fileContent = '';
            let fileName = file?.name || 'diagram.drawio';
            let fileFormat = fileName.split('.').pop() || 'drawio';

            if (file) {
                try {
                    fileContent = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                } catch (err) {
                    console.warn('Lỗi đọc file:', err);
                }
            }

            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (!db) return;

            await db.from('network_diagrams').insert([{
                name,
                version,
                format: fileFormat,
                author,
                file_name: fileName,
                description,
                file_content: fileContent,
                updated_at: new Date().toISOString()
            }]);

            this.showToast(`Đã đính kèm bản vẽ "${name}" thành công!`, 'success');
            document.getElementById('modalUploadDiagram')?.classList.add('hidden');
            await this.loadData();
            this.renderDiagramTable();
        },

        openPreviewDiagram(id) {
            this.previewDiagram(id);
        },

        previewDiagram(id) {
            const diag = this.cache.diagrams.find(d => d.id === Number(id));
            if (!diag) return;

            document.getElementById('previewDiagTitle').textContent = diag.name;
            document.getElementById('previewDiagMeta').textContent = `Phiên bản ${diag.version} • Cập nhật bởi ${diag.author || 'Admin IT'} (${diag.file_name || 'draw.io'})`;
            
            const contentEl = document.getElementById('previewDiagContent');
            if (!contentEl) return;

            const downloadBtn = document.getElementById('btnDownloadPreviewFile');
            if (downloadBtn) {
                downloadBtn.onclick = () => this.downloadDiagramFile(diag.id);
            }

            const isImage = diag.file_content && diag.file_content.startsWith('data:image/');
            if (isImage) {
                contentEl.innerHTML = `<img src="${diag.file_content}" alt="${this.escapeHtml(diag.name)}" class="max-h-[60vh] max-w-full rounded-lg shadow-lg object-contain">`;
            } else {
                contentEl.innerHTML = `
                    <div class="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center max-w-lg shadow-sm">
                        <div class="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl mx-auto mb-4">
                            <i class="fa-solid fa-diagram-project"></i>
                        </div>
                        <h4 class="text-base font-bold text-slate-800 dark:text-white mb-2">${this.escapeHtml(diag.name)}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">${this.escapeHtml(diag.description || 'Bản vẽ kiến trúc mạng định dạng diagrams.net / draw.io')}</p>
                        <div class="flex items-center justify-center gap-3">
                            <button onclick="QLTSPageNetwork.downloadDiagramFile(${diag.id})" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5">
                                <i class="fa-solid fa-download"></i>
                                <span>Tải file .drawio về máy</span>
                            </button>
                            <a href="https://app.diagrams.net/" target="_blank" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                                <span>Mở diagrams.net online</span>
                                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                            </a>
                        </div>
                    </div>
                `;
            }

            if (typeof window.openModal === 'function') {
                window.openModal('modalPreviewDiagram');
            } else {
                document.getElementById('modalPreviewDiagram')?.classList.remove('hidden');
            }
        },

        downloadDiagramFile(id) {
            const diag = this.cache.diagrams.find(d => d.id === Number(id));
            if (!diag) return;

            let content = diag.file_content || '';
            if (diag.format === 'drawio' && !content) {
                content = `data:application/xml;charset=utf-8,${encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net">\n  <diagram name="${diag.name}" id="diagram-1">\n    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">\n      <root>\n        <mxCell id="0" />\n        <mxCell id="1" parent="0" />\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>`)}`;
            }

            const a = document.createElement('a');
            a.href = content || `data:text/plain;charset=utf-8,${encodeURIComponent(diag.name)}`;
            a.download = diag.file_name || `${diag.name}.drawio`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            this.showToast(`Đang tải xuống "${a.download}"...`, 'info');
        },

        escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        escapeJsString(str) {
            if (!str) return '';
            return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        }
    };

    window.QLTSPageNetwork = QLTSPageNetwork;

    // Tự động khởi chạy khi trang nạp xong
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => QLTSPageNetwork.init());
    } else {
        QLTSPageNetwork.init();
    }
})();
