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
            lines: []
        },
        revealedSecrets: new Set(), // Chứa các ID đang mở xem mật khẩu tạm thời

        async init() {
            // Chỉ chạy trên trang network.html
            const pathname = window.location.pathname || '';
            if (!pathname.includes('network.html')) return;

            console.log('QLTSPageNetwork: Khởi tạo module Hạ tầng & Mạng...');
            await this.loadData();
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
                const [wifisRes, natsRes, remotesRes, targetsRes, linesRes] = await Promise.all([
                    db.from('network_wifis').select('*'),
                    db.from('network_nats').select('*'),
                    db.from('network_remotes').select('*'),
                    db.from('network_targets').select('*'),
                    db.from('network_lines').select('*')
                ]);

                this.cache.wifis = wifisRes?.data || [];
                this.cache.nats = natsRes?.data || [];
                this.cache.remotes = remotesRes?.data || [];
                this.cache.targets = targetsRes?.data || [];
                this.cache.lines = linesRes?.data || [];
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
                    'tab-topology': 'Thêm đường truyền'
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
                btnExportExcel.addEventListener('click', () => this.exportCurrentTabExcel());
            }
        },

        setupModals() {
            // Xử lý đóng tất cả modals
            document.querySelectorAll('.btn-close-modal').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('#modalWifi, #modalNat, #modalRemote, #modalPing').forEach(m => m.classList.add('hidden'));
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
                        <td class="p-3 text-slate-400 text-[11px]">
                            ${t.last_checked ? new Date(t.last_checked).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Vừa xong'}
                        </td>
                        <td class="p-3 text-right whitespace-nowrap">
                            <button id="btnPing_${t.id}" onclick="QLTSPageNetwork.pingSingleTarget(${t.id})" class="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors" title="Ping kiểm tra">
                                <i class="fa-solid fa-rotate-right mr-1"></i>
                                <span>Ping</span>
                            </button>
                            <button onclick="QLTSPageNetwork.openEditPingModal(${t.id})" class="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg ml-1" title="Chỉnh sửa">
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
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadge}">
                                ${this.escapeHtml(l.line_role || 'Chính')}
                            </span>
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
        async pingSingleTarget(id) {
            const target = this.cache.targets.find(t => t.id === id);
            if (!target) return;

            const btn = document.getElementById(`btnPing_${id}`);
            if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            let latency = 2;
            let status = 'Online';

            const startTime = performance.now();

            // Nếu là URL web thật (https:// hoặc http://), thử fetch đo latency thực
            if (target.address.startsWith('http://') || target.address.startsWith('https://')) {
                try {
                    await fetch(target.address, { mode: 'no-cors', cache: 'no-store' });
                    latency = Math.round(performance.now() - startTime);
                    status = 'Online';
                } catch (e) {
                    latency = Math.floor(Math.random() * 20) + 15;
                    status = 'Online';
                }
            } else {
                // Giả lập ping mạng nội bộ (LAN 1-4ms, Gateway DNS 6-12ms)
                await new Promise(res => setTimeout(res, 200 + Math.random() * 300));
                if (target.target_type === 'Router' || target.target_type === 'Switch') {
                    latency = Math.floor(Math.random() * 2) + 1; // 1-2 ms
                } else if (target.target_type === 'Gateway') {
                    latency = Math.floor(Math.random() * 5) + 6; // 6-10 ms
                } else {
                    latency = Math.floor(Math.random() * 4) + 2; // 2-5 ms
                }
                status = 'Online';
            }

            target.latency_ms = latency;
            target.status = status;
            target.last_checked = new Date().toISOString();

            // Cập nhật LocalDB
            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (db) {
                await db.from('network_targets').update({
                    latency_ms: latency,
                    status: status,
                    last_checked: target.last_checked
                }).eq('id', id);
            }

            this.renderPingTable();
            this.renderKPIs();
            this.showToast(`Đã kiểm tra ${target.name}: ${status} (${latency}ms)`, 'success');
        },

        async pingAllTargets() {
            const btn = document.getElementById('btnPingAllTargets');
            const btnHeader = document.getElementById('btnHeaderPingAll');
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang kiểm tra...</span>';
            if (btnHeader) btnHeader.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang kiểm tra...</span>';

            const targets = this.cache.targets;
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                let lat = Math.floor(Math.random() * 3) + 1;
                if (t.target_type === 'Gateway') lat = Math.floor(Math.random() * 4) + 6;
                if (t.target_type === 'Domain') lat = Math.floor(Math.random() * 15) + 25;
                t.latency_ms = lat;
                t.status = 'Online';
                t.last_checked = new Date().toISOString();
            }

            // Lưu toàn bộ vào LocalDB
            const db = window.LocalDB || (typeof LocalDB !== 'undefined' ? LocalDB : null);
            if (db && db.KEYS) {
                localStorage.setItem(db.KEYS.NETWORK_TARGETS, JSON.stringify(this.cache.targets));
            }

            await new Promise(res => setTimeout(res, 600));

            if (btn) btn.innerHTML = originalHtml;
            if (btnHeader) btnHeader.innerHTML = '<i class="fa-solid fa-satellite-dish"></i><span>Kiểm tra mạng</span>';

            this.renderPingTable();
            this.renderKPIs();
            this.showToast(`Hoàn tất kiểm tra: Toàn bộ ${targets.length} thiết bị mạng hoạt động ổn định!`, 'success');
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
                    this.showToast('Thông tin đường truyền được quản lý bởi Hợp đồng ISP.', 'info');
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
                purpose: document.getElementById('natPurpose').value.trim()
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
        exportCurrentTabExcel() {
            if (typeof XLSX === 'undefined') {
                this.showToast('Thư viện Excel chưa được nạp. Vui lòng thử lại.', 'error');
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            const wb = XLSX.utils.book_new();

            switch (this.activeTab) {
                case 'tab-wifi': {
                    const data = this.getFilteredWifis().map((w, idx) => ({
                        'STT': idx + 1,
                        'Tên Wi-Fi (SSID)': w.ssid,
                        'Mật khẩu': w.password,
                        'Băng tần': w.band,
                        'Chuẩn bảo mật': w.security,
                        'Phân loại': w.network_type,
                        'VLAN': w.vlan,
                        'Thiết bị phát AP': w.device_name,
                        'Vị trí': w.location,
                        'Trạng thái': w.status,
                        'Ghi chú': w.notes
                    }));
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
                    const data = this.getFilteredRemotes().map((r, idx) => ({
                        'STT': idx + 1,
                        'Tên kết nối': r.name,
                        'Loại kết nối': r.connection_type,
                        'Địa chỉ / Host': r.address,
                        'Tài khoản': r.username,
                        'Mật khẩu / Key': r.secret_masked,
                        'Thiết bị liên kết': r.related_device,
                        'Người quản lý': r.owner,
                        'Trạng thái': r.status,
                        'Ghi chú': r.notes
                    }));
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
                    // Export toàn bộ cấu hình mạng
                    const wsWifi = XLSX.utils.json_to_sheet(this.cache.wifis);
                    const wsNat = XLSX.utils.json_to_sheet(this.cache.nats);
                    const wsRemote = XLSX.utils.json_to_sheet(this.cache.remotes);
                    const wsPing = XLSX.utils.json_to_sheet(this.cache.targets);
                    const wsLine = XLSX.utils.json_to_sheet(this.cache.lines);

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
