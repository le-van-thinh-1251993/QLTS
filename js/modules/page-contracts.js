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
    let selectedMonth = null; // 1..12 or null (all)
    let selectedYear = new Date().getFullYear();

    // Danh mục hợp đồng (phân loại & giao diện)
    const COLOR_CLASSES = {
        rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
        amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
        indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
        sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
        emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
        slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    };

    function resolveColorClasses(color) {
        if (!color) return COLOR_CLASSES.slate;
        if (COLOR_CLASSES[color]) return COLOR_CLASSES[color];
        if (typeof color === 'string' && color.includes('bg-')) return color;
        return COLOR_CLASSES.slate;
    }

    const DEFAULT_CONTRACT_CATEGORIES = [
        { key: 'internet', text: 'Đường truyền Internet', icon: 'fa-solid fa-globe', color: 'rose', provider: 'VNPT', desc: 'Hạ tầng mạng, cáp quang, leased line' },
        { key: 'maintenance', text: 'Bảo trì định kỳ', icon: 'fa-solid fa-wrench', color: 'amber', provider: '', desc: 'Bảo trì định kỳ phần cứng, thiết bị CNTT' },
        { key: 'license', text: 'Bản quyền phần mềm', icon: 'fa-solid fa-key', color: 'indigo', provider: 'Microsoft', desc: 'Bản quyền Windows, Microsoft 365, diệt virus' },
        { key: 'warranty', text: 'Bảo hành mở rộng', icon: 'fa-solid fa-shield-halved', color: 'sky', provider: '', desc: 'Gói bảo hành mở rộng máy chủ, thiết bị mạng' },
        { key: 'service', text: 'Dịch vụ Cloud/SaaS', icon: 'fa-solid fa-cloud', color: 'purple', provider: 'Viettel Cloud', desc: 'Lưu trữ đám mây, máy chủ ảo Cloud VPS' },
        { key: 'other', text: 'Khác', icon: 'fa-solid fa-file-lines', color: 'slate', provider: '', desc: 'Các hợp đồng dịch vụ công nghệ thông tin khác' }
    ];

    function loadCategories() {
        try {
            const raw = localStorage.getItem(LocalDB.KEYS.CONTRACT_CATEGORIES);
            if (!raw) {
                localStorage.setItem(LocalDB.KEYS.CONTRACT_CATEGORIES, JSON.stringify(DEFAULT_CONTRACT_CATEGORIES));
                return DEFAULT_CONTRACT_CATEGORIES.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                localStorage.setItem(LocalDB.KEYS.CONTRACT_CATEGORIES, JSON.stringify(DEFAULT_CONTRACT_CATEGORIES));
                return DEFAULT_CONTRACT_CATEGORIES.slice();
            }
            return parsed;
        } catch (e) {
            console.error('Error loading contract categories:', e);
            return DEFAULT_CONTRACT_CATEGORIES.slice();
        }
    }

    function saveCategories(categories) {
        try {
            localStorage.setItem(LocalDB.KEYS.CONTRACT_CATEGORIES, JSON.stringify(categories));
            return true;
        } catch (e) {
            console.error('Error saving contract categories:', e);
            return false;
        }
    }

    function getCategoryInfo(key) {
        const categories = loadCategories();
        const found = categories.find(c => c.key === key);
        if (found) {
            return {
                key: found.key,
                text: found.text || found.name || found.key,
                icon: found.icon || 'fa-solid fa-file-lines',
                color: resolveColorClasses(found.color),
                colorKey: found.color || 'slate',
                provider: found.provider || '',
                desc: found.desc || ''
            };
        }
        return {
            key: key || 'other',
            text: key || 'Khác',
            icon: 'fa-solid fa-file-lines',
            color: COLOR_CLASSES.slate,
            colorKey: 'slate',
            provider: '',
            desc: ''
        };
    }

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

    function dataUrlToBlob(dataUrl) {
        try {
            const arr = dataUrl.split(',');
            const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
        } catch (e) {
            console.error('Error converting dataUrl to Blob:', e);
            return null;
        }
    }

    function downloadAttachment(contractId, attachmentIndex = 0) {
        const contracts = loadContracts();
        const c = contracts.find(x => x.id === contractId);
        if (!c || !c.attachments || !c.attachments[attachmentIndex]) return;
        const att = c.attachments[attachmentIndex];
        const a = document.createElement('a');
        a.href = att.data_url;
        a.download = att.name || 'hop-dong';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function getContractDocSources(c) {
        if (!c) return [];
        const sources = [];
        if (Array.isArray(c.attachments)) {
            c.attachments.forEach((att, idx) => {
                if (att && (att.data_url || att.url)) {
                    sources.push({
                        type: 'attachment',
                        index: idx,
                        name: att.name || `Tệp đính kèm ${idx + 1}`,
                        data_url: att.data_url || att.url,
                        file_type: att.type || '',
                        size: att.size || null
                    });
                }
            });
        }
        const onlineLink = (c.link || c.contract_link || c.url || '').trim();
        if (onlineLink) {
            sources.push({
                type: 'link',
                name: 'Liên kết hợp đồng online',
                url: onlineLink
            });
        }
        return sources;
    }

    function hasContractDoc(c) {
        return getContractDocSources(c).length > 0;
    }

    function getContractDocUrl(c) {
        const sources = getContractDocSources(c);
        if (sources.length === 0) return null;
        return sources[0].data_url || sources[0].url;
    }

    async function renderPdfWithPdfJs(dataUrl, containerEl, fileName, contract, currentSource) {
        containerEl.innerHTML = `
            <div class="w-full h-full flex flex-col min-h-0 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <!-- PDF Control Bar -->
                <div class="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                    <div class="flex items-center gap-2">
                        <span id="pdfPageInfo" class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <i class="fa-solid fa-file-pdf text-rose-500"></i>
                            <span id="pdfPageStatusText">Đang dựng trang tài liệu PDF...</span>
                        </span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button type="button" id="btnPdfZoomOut" class="w-7 h-7 flex items-center justify-center text-xs bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg font-bold transition-colors" title="Thu nhỏ (-)">
                            <i class="fa-solid fa-magnifying-glass-minus text-[11px]"></i>
                        </button>
                        <span id="pdfZoomLabel" class="text-xs font-mono px-2 font-bold text-slate-700 dark:text-slate-200 min-w-[50px] text-center">100%</span>
                        <button type="button" id="btnPdfZoomIn" class="w-7 h-7 flex items-center justify-center text-xs bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg font-bold transition-colors" title="Phóng to (+)">
                            <i class="fa-solid fa-magnifying-glass-plus text-[11px]"></i>
                        </button>
                        <button type="button" id="btnPdfFitWidth" class="px-2.5 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold transition-colors ml-1" title="Tự động vừa chiều rộng">
                            <i class="fa-solid fa-arrows-left-right text-[10px] mr-1"></i>Vừa trang
                        </button>
                    </div>
                </div>

                <!-- PDF Canvas Pages Container -->
                <div id="pdfPagesScrollArea" class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 dark:bg-slate-950 flex flex-col items-center gap-5">
                    <div id="pdfLoadingIndicator" class="flex flex-col items-center justify-center gap-3 my-16">
                        <i class="fa-solid fa-circle-notch fa-spin text-3xl text-emerald-600"></i>
                        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Đang hiển thị trực tiếp tài liệu...</span>
                    </div>
                </div>
            </div>
        `;

        try {
            // Wait for pdfjsLib if not ready immediately
            if (typeof window.pdfjsLib === 'undefined') {
                await new Promise((resolve) => {
                    let tries = 0;
                    const check = setInterval(() => {
                        tries++;
                        if (typeof window.pdfjsLib !== 'undefined' || tries > 20) {
                            clearInterval(check);
                            resolve();
                        }
                    }, 50);
                });
            }

            if (typeof window.pdfjsLib === 'undefined') {
                throw new Error('Thư viện PDF.js chưa sẵn sàng.');
            }

            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';

            let loadingTask;
            if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                let base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
                base64 = base64.replace(/\s/g, '');
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                loadingTask = window.pdfjsLib.getDocument({ data: bytes });
            } else {
                loadingTask = window.pdfjsLib.getDocument(dataUrl);
            }

            const pdf = await loadingTask.promise;
            const numPages = pdf.numPages;

            const scrollArea = document.getElementById('pdfPagesScrollArea');
            if (!scrollArea) return;

            const statusText = document.getElementById('pdfPageStatusText');
            if (statusText) statusText.textContent = `${escapeHtml(fileName || 'Hợp đồng')} • ${numPages} trang`;

            // Calculate optimal initial scale to fit an A4 page width nicely (~880px)
            let currentScale = 1.35;
            try {
                const firstPage = await pdf.getPage(1);
                const unscaledVp = firstPage.getViewport({ scale: 1.0 });
                const availableW = Math.max(300, (scrollArea.clientWidth || 960) - 48);
                if (unscaledVp.width > 0) {
                    const targetW = Math.min(availableW, 900);
                    currentScale = Math.max(0.6, Math.min(2.0, +(targetW / unscaledVp.width).toFixed(2)));
                }
            } catch (e) {
                currentScale = 1.35;
            }

            let isRendering = false;
            let pendingScale = null;

            async function renderPages(scale) {
                if (!scrollArea) return;
                if (isRendering) {
                    pendingScale = scale;
                    return;
                }
                isRendering = true;

                try {
                    scrollArea.innerHTML = '';

                    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const viewport = page.getViewport({ scale });

                        const pageCard = document.createElement('div');
                        pageCard.className = 'flex flex-col items-center gap-2 max-w-full my-2';

                        const canvas = document.createElement('canvas');
                        canvas.className = 'shadow-2xl rounded-sm bg-white border border-slate-300 dark:border-slate-700';
                        canvas.style.maxWidth = '100%';
                        canvas.style.height = 'auto';
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        const ctx = canvas.getContext('2d');
                        const renderContext = {
                            canvasContext: ctx,
                            viewport: viewport
                        };

                        const pageBadge = document.createElement('span');
                        pageBadge.className = 'text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-0.5 rounded-full border border-slate-300 dark:border-slate-700';
                        pageBadge.textContent = `Trang ${pageNum} / ${numPages}`;

                        pageCard.appendChild(canvas);
                        pageCard.appendChild(pageBadge);
                        scrollArea.appendChild(pageCard);

                        await page.render(renderContext).promise;
                    }

                    const zoomLabel = document.getElementById('pdfZoomLabel');
                    if (zoomLabel) {
                        zoomLabel.textContent = `${Math.round(scale * 100)}%`;
                    }
                } finally {
                    isRendering = false;
                    if (pendingScale !== null) {
                        const next = pendingScale;
                        pendingScale = null;
                        renderPages(next);
                    }
                }
            }

            await renderPages(currentScale);

            // Zoom controls
            const btnZoomIn = document.getElementById('btnPdfZoomIn');
            const btnZoomOut = document.getElementById('btnPdfZoomOut');
            const btnFit = document.getElementById('btnPdfFitWidth');

            if (btnZoomIn) {
                btnZoomIn.onclick = () => {
                    if (currentScale < 3.0) {
                        currentScale = Math.min(3.0, +(currentScale + 0.2).toFixed(2));
                        renderPages(currentScale);
                    }
                };
            }
            if (btnZoomOut) {
                btnZoomOut.onclick = () => {
                    if (currentScale > 0.4) {
                        currentScale = Math.max(0.4, +(currentScale - 0.2).toFixed(2));
                        renderPages(currentScale);
                    }
                };
            }
            if (btnFit) {
                btnFit.onclick = async () => {
                    try {
                        const p1 = await pdf.getPage(1);
                        const baseVp = p1.getViewport({ scale: 1.0 });
                        const containerWidth = scrollArea.clientWidth - 48;
                        if (containerWidth > 0 && baseVp.width > 0) {
                            const targetWidth = Math.min(containerWidth, 900);
                            currentScale = Math.max(0.4, Math.min(3.0, +(targetWidth / baseVp.width).toFixed(2)));
                            renderPages(currentScale);
                        }
                    } catch (e) {}
                };
            }

        } catch (err) {
            console.error('Lỗi khi render PDF trực tiếp:', err);
            const blob = dataUrlToBlob(dataUrl);
            const blobUrl = blob ? URL.createObjectURL(blob) : dataUrl;
            containerEl.innerHTML = `
                <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center max-w-md shadow-2xl mx-auto">
                    <div class="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-3xl mx-auto mb-4">
                        <i class="fa-solid fa-file-pdf"></i>
                    </div>
                    <h4 class="text-base font-bold text-slate-800 dark:text-white mb-1.5 break-words">${escapeHtml(fileName)}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">Trình duyệt không thể giải mã tài liệu này vào Canvas. Bạn có thể mở xem trực tiếp trong tab mới hoặc tải về máy.</p>
                    <div class="flex flex-col gap-2">
                        <a href="${blobUrl}" target="_blank" rel="noopener noreferrer" class="w-full px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            <span>Mở xem trong tab mới</span>
                        </a>
                        <button type="button" onclick="QLTSPageContracts.downloadAttachment(${contract.id}, ${currentSource.index})" class="w-full px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                            <i class="fa-solid fa-download"></i>
                            <span>Tải tệp về máy</span>
                        </button>
                    </div>
                </div>
            `;
        }
    }

    async function renderDocxDirect(dataUrl, containerEl, fileName, contract, currentSource) {
        containerEl.innerHTML = `
            <div class="w-full h-full flex flex-col min-h-0 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <!-- Word Document Toolbar -->
                <div class="px-4 py-2 bg-blue-50 dark:bg-slate-800 border-b border-blue-100 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="w-6 h-6 rounded bg-[#2b579a] text-white flex items-center justify-center font-bold text-xs shrink-0"><i class="fa-solid fa-file-word"></i></span>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-xs sm:max-w-md">${escapeHtml(fileName)}</span>
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold shrink-0">WORD DOCX</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button type="button" id="btnDocxZoomOut" class="w-7 h-7 flex items-center justify-center text-xs bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg font-bold transition-colors" title="Thu nhỏ (-)">
                            <i class="fa-solid fa-magnifying-glass-minus text-[11px]"></i>
                        </button>
                        <span id="docxZoomLabel" class="text-xs font-mono px-2 font-bold text-slate-700 dark:text-slate-200 min-w-[45px] text-center">100%</span>
                        <button type="button" id="btnDocxZoomIn" class="w-7 h-7 flex items-center justify-center text-xs bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg font-bold transition-colors" title="Phóng to (+)">
                            <i class="fa-solid fa-magnifying-glass-plus text-[11px]"></i>
                        </button>
                        <button type="button" id="btnDocxPrint" class="px-2.5 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold flex items-center gap-1 transition-colors ml-1" title="In hoặc xuất PDF">
                            <i class="fa-solid fa-print text-[10px]"></i> In
                        </button>
                    </div>
                </div>

                <!-- Word Document Scroll Area -->
                <div id="docxScrollArea" class="flex-1 min-h-0 overflow-y-auto p-3 sm:p-8 bg-slate-200/80 dark:bg-slate-950 flex flex-col items-center">
                    <div id="docxLoadingIndicator" class="flex flex-col items-center justify-center gap-3 my-16">
                        <i class="fa-solid fa-circle-notch fa-spin text-3xl text-blue-600"></i>
                        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Đang giải mã và dựng nội dung tài liệu Word...</span>
                    </div>
                    <div id="docxPageWrapper" class="w-full max-w-[900px] transition-transform origin-top flex flex-col items-center">
                        <div id="docxRenderTarget" class="w-full flex flex-col items-center"></div>
                    </div>
                </div>
            </div>
        `;

        try {
            // Wait up to 1 second for mammoth/docx libraries if scripts are loading
            if (typeof window.mammoth === 'undefined' && typeof window.docx === 'undefined') {
                await new Promise((resolve) => {
                    let tries = 0;
                    const interval = setInterval(() => {
                        tries++;
                        if (typeof window.mammoth !== 'undefined' || typeof window.docx !== 'undefined' || tries > 20) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 50);
                });
            }

            let bytes;
            if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                let b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
                b64 = b64.replace(/\s/g, '');
                const binStr = atob(b64);
                bytes = new Uint8Array(binStr.length);
                for (let i = 0; i < binStr.length; i++) {
                    bytes[i] = binStr.charCodeAt(i);
                }
            } else {
                const res = await fetch(dataUrl);
                const buf = await res.arrayBuffer();
                bytes = new Uint8Array(buf);
            }

            const loadingIndicator = document.getElementById('docxLoadingIndicator');
            const target = document.getElementById('docxRenderTarget');
            if (!target) return;

            let renderedOk = false;

            // 1. Try docx-preview first for authentic page-layout formatting
            if (window.docx && typeof window.docx.renderAsync === 'function') {
                try {
                    await window.docx.renderAsync(bytes.buffer, target, null, {
                        inWrapper: false,
                        ignoreWidth: false,
                        ignoreHeight: false,
                        className: 'docx-rendered'
                    });
                    renderedOk = true;
                } catch (docxErr) {
                    console.warn('docx-preview warning, trying mammoth fallback:', docxErr);
                }
            }

            // 2. If docx-preview was not available or encountered an issue, use mammoth.js
            if (!renderedOk && window.mammoth && typeof window.mammoth.convertToHtml === 'function') {
                const result = await window.mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
                target.innerHTML = `<div class="word-content-body">${result.value || '<p class="text-slate-400 italic">Tài liệu không có nội dung văn bản.</p>'}</div>`;
                renderedOk = true;
            }

            if (loadingIndicator) loadingIndicator.remove();

            if (!renderedOk) {
                throw new Error('Không thể khởi tạo bộ đọc Word (docx-preview / mammoth).');
            }

            // Zoom controls
            let docxScale = 1.0;
            const wrapper = document.getElementById('docxPageWrapper');
            const zoomLabel = document.getElementById('docxZoomLabel');
            const btnIn = document.getElementById('btnDocxZoomIn');
            const btnOut = document.getElementById('btnDocxZoomOut');
            const btnPrint = document.getElementById('btnDocxPrint');

            if (btnIn && wrapper && zoomLabel) {
                btnIn.onclick = () => {
                    if (docxScale < 2.0) {
                        docxScale = Math.min(2.0, +(docxScale + 0.15).toFixed(2));
                        wrapper.style.transform = `scale(${docxScale})`;
                        zoomLabel.textContent = `${Math.round(docxScale * 100)}%`;
                    }
                };
            }
            if (btnOut && wrapper && zoomLabel) {
                btnOut.onclick = () => {
                    if (docxScale > 0.5) {
                        docxScale = Math.max(0.5, +(docxScale - 0.15).toFixed(2));
                        wrapper.style.transform = `scale(${docxScale})`;
                        zoomLabel.textContent = `${Math.round(docxScale * 100)}%`;
                    }
                };
            }
            if (btnPrint && target) {
                btnPrint.onclick = () => {
                    const printWin = window.open('', '_blank');
                    if (printWin) {
                        printWin.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>${escapeHtml(fileName)}</title>
                                <style>
                                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                                    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
                                    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                                    th { background: #f1f5f9; }
                                    h1, h2, h3 { color: #0f172a; }
                                </style>
                            </head>
                            <body>${target.innerHTML}</body>
                            </html>
                        `);
                        printWin.document.close();
                        printWin.focus();
                        setTimeout(() => printWin.print(), 300);
                    }
                };
            }

        } catch (err) {
            console.error('Lỗi khi hiển thị tài liệu Word:', err);
            containerEl.innerHTML = `
                <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center max-w-md shadow-2xl mx-auto">
                    <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl mx-auto mb-4">
                        <i class="fa-solid fa-file-word"></i>
                    </div>
                    <h4 class="text-base font-bold text-slate-800 dark:text-white mb-1.5 break-words">${escapeHtml(fileName)}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">Trình duyệt không thể giải mã nội dung tệp Word này. Bạn có thể tải tệp về máy để mở bằng Microsoft Word.</p>
                    <button type="button" onclick="QLTSPageContracts.downloadAttachment(${contract.id}, ${currentSource.index})" class="w-full px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 transition-all">
                        <i class="fa-solid fa-download text-sm"></i>
                        <span>Tải tệp DOCX về máy</span>
                    </button>
                </div>
            `;
        }
    }

    async function renderExcelDirect(dataUrl, containerEl, fileName, contract, currentSource) {
        containerEl.innerHTML = `
            <div class="w-full h-full flex flex-col min-h-0 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <!-- Excel Toolbar -->
                <div class="px-4 py-2 bg-emerald-50 dark:bg-slate-800 border-b border-emerald-100 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="w-6 h-6 rounded bg-[#107c41] text-white flex items-center justify-center font-bold text-xs shrink-0"><i class="fa-solid fa-file-excel"></i></span>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-xs sm:max-w-md">${escapeHtml(fileName)}</span>
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold shrink-0">BẢNG TÍNH EXCEL</span>
                    </div>
                    <!-- Sheet Tabs -->
                    <div class="flex items-center gap-1.5 overflow-x-auto max-w-md" id="excelSheetTabs"></div>
                </div>

                <!-- Table Scroll Area -->
                <div class="flex-1 min-h-0 overflow-auto p-4 bg-white dark:bg-slate-900" id="excelTableArea">
                    <div id="excelLoadingIndicator" class="flex flex-col items-center justify-center gap-3 my-16">
                        <i class="fa-solid fa-circle-notch fa-spin text-3xl text-emerald-600"></i>
                        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Đang đọc dữ liệu bảng tính...</span>
                    </div>
                </div>
            </div>
        `;

        try {
            let bytes;
            if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                let b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
                b64 = b64.replace(/\s/g, '');
                const binStr = atob(b64);
                bytes = new Uint8Array(binStr.length);
                for (let i = 0; i < binStr.length; i++) {
                    bytes[i] = binStr.charCodeAt(i);
                }
            } else {
                const res = await fetch(dataUrl);
                const buf = await res.arrayBuffer();
                bytes = new Uint8Array(buf);
            }

            if (typeof XLSX === 'undefined') {
                throw new Error('Thư viện SheetJS chưa sẵn sàng.');
            }

            const workbook = XLSX.read(bytes, { type: 'array' });
            const sheetNames = workbook.SheetNames || [];
            if (!sheetNames.length) throw new Error('File bảng tính không có trang tính nào.');

            const tabsContainer = document.getElementById('excelSheetTabs');
            const tableArea = document.getElementById('excelTableArea');

            function displaySheet(sheetIndex) {
                const name = sheetNames[sheetIndex];
                const sheet = workbook.Sheets[name];
                if (!tableArea) return;

                // Render tabs
                if (tabsContainer) {
                    tabsContainer.innerHTML = sheetNames.map((sName, sIdx) => {
                        const isActive = sIdx === sheetIndex;
                        return `
                            <button type="button" class="excel-tab-btn px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${isActive ? 'bg-[#107c41] text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'}" data-sidx="${sIdx}">
                                <i class="fa-solid fa-table-cells text-[10px] mr-1"></i>${escapeHtml(sName)}
                            </button>
                        `;
                    }).join('');

                    tabsContainer.querySelectorAll('.excel-tab-btn').forEach(btn => {
                        btn.onclick = () => {
                            const idx = parseInt(btn.dataset.sidx, 10);
                            displaySheet(idx);
                        };
                    });
                }

                const rawHtml = XLSX.utils.sheet_to_html(sheet, { id: 'renderedExcelSheet', editable: false });
                tableArea.innerHTML = `
                    <div class="excel-table-wrapper max-w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        ${rawHtml}
                    </div>
                `;
            }

            displaySheet(0);

        } catch (err) {
            console.error('Lỗi khi hiển thị bảng tính Excel:', err);
            containerEl.innerHTML = `
                <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center max-w-md shadow-2xl mx-auto">
                    <div class="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4">
                        <i class="fa-solid fa-file-excel"></i>
                    </div>
                    <h4 class="text-base font-bold text-slate-800 dark:text-white mb-1.5 break-words">${escapeHtml(fileName)}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">Không thể giải mã bảng tính này trực tiếp. Bạn có thể tải tệp về máy để xem.</p>
                    <button type="button" onclick="QLTSPageContracts.downloadAttachment(${contract.id}, ${currentSource.index})" class="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 transition-all">
                        <i class="fa-solid fa-download text-sm"></i>
                        <span>Tải tệp Excel về máy</span>
                    </button>
                </div>
            `;
        }
    }

    function viewContractDoc(id, sourceIndex = 0) {
        const contracts = loadContracts();
        const c = contracts.find(x => x.id === id);
        if (!c) return;

        const sources = getContractDocSources(c);
        if (sources.length === 0) {
            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal('Hợp đồng này chưa có tài liệu hoặc link đính kèm.', 'Thông báo');
            } else {
                alert('Hợp đồng này chưa có tài liệu hoặc link đính kèm.');
            }
            return;
        }

        const validIndex = (sourceIndex >= 0 && sourceIndex < sources.length) ? sourceIndex : 0;
        const cur = sources[validIndex];

        // Populate modal
        const titleEl = document.getElementById('contractPreviewTitle');
        const badgeEl = document.getElementById('contractPreviewCodeBadge');
        const sourceBar = document.getElementById('contractPreviewSourceBar');
        const btnExt = document.getElementById('btnContractPreviewExternal');
        const btnDl = document.getElementById('btnContractPreviewDownload');
        const body = document.getElementById('contractPreviewBody');

        if (titleEl) titleEl.textContent = c.name;
        if (badgeEl) badgeEl.textContent = c.code || 'HĐ';

        // Source switcher bar
        if (sourceBar) {
            if (sources.length > 1) {
                sourceBar.innerHTML = `
                    <span class="text-[11px] text-slate-400 font-medium mr-1 shrink-0">Tài liệu:</span>
                    <div class="flex items-center gap-1.5 flex-wrap">
                        ${sources.map((s, idx) => {
                            const isActive = idx === validIndex;
                            const icon = s.type === 'attachment' ? 'fa-paperclip' : 'fa-link';
                            return `<button type="button" onclick="QLTSPageContracts.viewContractDoc(${c.id}, ${idx})" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}">
                                <i class="fa-solid ${icon} text-[10px] mr-1"></i>${escapeHtml(s.name)}
                            </button>`;
                        }).join('')}
                    </div>
                `;
            } else {
                sourceBar.innerHTML = `<span class="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300"><i class="fa-solid ${cur.type === 'attachment' ? 'fa-paperclip' : 'fa-link'} text-emerald-500"></i> ${escapeHtml(cur.name)}</span>`;
            }
        }

        // Configure Download Button & External Link Button
        if (cur.type === 'attachment') {
            if (btnDl) {
                btnDl.classList.remove('hidden');
                btnDl.onclick = () => downloadAttachment(c.id, cur.index);
            }
            if (btnExt) {
                const isPdfOrImg = cur.data_url.startsWith('data:application/pdf') || cur.data_url.startsWith('data:image/') || /\.(pdf|png|jpe?g|webp|gif)$/i.test(cur.name);
                if (isPdfOrImg) {
                    const blob = dataUrlToBlob(cur.data_url);
                    btnExt.href = blob ? URL.createObjectURL(blob) : cur.data_url;
                    btnExt.classList.remove('hidden');
                } else {
                    btnExt.classList.add('hidden');
                }
            }
        } else {
            // Link
            if (btnDl) btnDl.classList.add('hidden');
            if (btnExt) {
                btnExt.href = cur.url;
                btnExt.classList.remove('hidden');
            }
        }

        // Render Body
        if (body) {
            body.innerHTML = '';
            if (cur.type === 'attachment') {
                const dataUrl = cur.data_url || '';
                const fileName = cur.name || '';
                const ext = fileName.split('.').pop().toLowerCase();
                const isPdf = dataUrl.startsWith('data:application/pdf') || ext === 'pdf';
                const isDocx = ext === 'docx';
                const isDoc = ext === 'doc';
                const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
                const isImage = dataUrl.startsWith('data:image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext);
                const isText = dataUrl.startsWith('data:text/') || ['txt', 'log', 'json', 'md'].includes(ext);
                const isPpt = ['ppt', 'pptx'].includes(ext);

                if (isPdf) {
                    renderPdfWithPdfJs(dataUrl, body, fileName, c, cur);
                } else if (isDocx || isDoc) {
                    renderDocxDirect(dataUrl, body, fileName, c, cur);
                } else if (isExcel) {
                    renderExcelDirect(dataUrl, body, fileName, c, cur);
                } else if (isImage) {
                    body.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center p-2 overflow-auto">
                            <img src="${dataUrl}" alt="${escapeHtml(fileName)}" class="max-h-full max-w-full rounded-xl object-contain shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        </div>
                    `;
                } else if (isText) {
                    let text = '';
                    try {
                        const b64 = dataUrl.split(',')[1];
                        text = decodeURIComponent(escape(atob(b64)));
                    } catch (e) {
                        text = 'Không thể giải mã văn bản.';
                    }
                    body.innerHTML = `
                        <div class="w-full h-full p-2 flex flex-col min-h-0">
                            <pre class="w-full h-full p-5 font-mono text-xs overflow-auto bg-slate-900 text-slate-100 rounded-xl leading-relaxed whitespace-pre-wrap">${escapeHtml(text)}</pre>
                        </div>
                    `;
                } else if (isPpt) {
                    body.innerHTML = `
                        <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center max-w-md shadow-2xl mx-auto">
                            <div class="w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">
                                <i class="fa-solid fa-file-powerpoint"></i>
                            </div>
                            <h4 class="text-base font-bold text-slate-800 dark:text-white mb-1.5 break-words">${escapeHtml(fileName)}</h4>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">Tệp trình chiếu (${ext.toUpperCase()}) được đính kèm vào hợp đồng</p>
                            <button type="button" onclick="QLTSPageContracts.downloadAttachment(${c.id}, ${cur.index})" class="w-full px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all">
                                <i class="fa-solid fa-download text-sm"></i>
                                <span>Tải tệp ${ext.toUpperCase()} về máy</span>
                            </button>
                        </div>
                    `;
                } else {
                    body.innerHTML = `
                        <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center max-w-md shadow-2xl mx-auto">
                            <div class="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-4xl mx-auto mb-4">
                                <i class="fa-solid fa-file"></i>
                            </div>
                            <h4 class="text-base font-bold text-slate-800 dark:text-white mb-1.5 break-words">${escapeHtml(fileName)}</h4>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">Tệp đính kèm hợp đồng</p>
                            <button type="button" onclick="QLTSPageContracts.downloadAttachment(${c.id}, ${cur.index})" class="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all">
                                <i class="fa-solid fa-download text-sm"></i>
                                <span>Tải tệp về máy</span>
                            </button>
                        </div>
                    `;
                }
            } else {
                // Link
                let embedUrl = cur.url;
                const driveMatch = cur.url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (driveMatch) {
                    embedUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
                }

                body.innerHTML = `
                    <div class="w-full h-full flex flex-col min-h-0">
                        <iframe src="${embedUrl}" class="w-full h-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white shadow-sm" allow="autoplay" title="Xem tài liệu online"></iframe>
                    </div>
                `;
            }
        }

        openModal('contractPreviewModal');
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
            if (selectedMonth !== null) {
                if (!c.end_date) return false;
                const d = new Date(c.end_date);
                if (isNaN(d.getTime())) return false;
                if (d.getFullYear() !== selectedYear || (d.getMonth() + 1) !== selectedMonth) {
                    return false;
                }
            }
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
        selectedMonth = null;
        renderMonthFilterBar();
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
                const typeInfo = getCategoryInfo(c.contract_type);
                const daysLeft = getDaysRemaining(c.end_date);
                let daysText = '';
                if (daysLeft !== null) {
                    if (daysLeft < 0) daysText = `<span class="text-rose-500 font-bold">Quá hạn ${Math.abs(daysLeft)} ngày</span>`;
                    else if (daysLeft === 0) daysText = '<span class="text-rose-500 font-bold">Hết hạn hôm nay!</span>';
                    else if (daysLeft <= 30) daysText = `<span class="text-rose-500 font-bold">Còn ${daysLeft} ngày</span>`;
                    else if (daysLeft <= 90) daysText = `<span class="text-amber-500 font-semibold">Còn ${daysLeft} ngày</span>`;
                    else daysText = `<span class="text-slate-400">Còn ${daysLeft} ngày</span>`;
                }

                const hasDoc = hasContractDoc(c);

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
                        ${hasDoc ? `<button type="button" onclick="event.stopPropagation(); QLTSPageContracts.viewContractDoc(${c.id})" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors mr-0.5" title="Xem trực tiếp hợp đồng"><i class="fa-solid fa-eye"></i></button>` : ''}
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
        renderMonthFilterBar();
    }

    function getAllProviders() {
        const contracts = loadContracts();
        const categories = loadCategories();
        const suppliers = loadSuppliers();
        const set = new Set();

        suppliers.forEach(s => {
            if (s.name && s.name.trim()) set.add(s.name.trim());
        });
        contracts.forEach(c => {
            if (c.provider && c.provider.trim()) set.add(c.provider.trim());
        });
        categories.forEach(cat => {
            if (cat.provider && cat.provider.trim()) set.add(cat.provider.trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
    }

    function populateCategoryDropdowns() {
        const categories = loadCategories();

        // 1. Table filter dropdown (#filterContractType)
        const filterEl = document.getElementById('filterContractType');
        if (filterEl) {
            const current = filterEl.value;
            let html = '<option value="">Tất cả loại HĐ</option>';
            categories.forEach(cat => {
                html += `<option value="${escapeHtml(cat.key)}">${escapeHtml(cat.text)}</option>`;
            });
            filterEl.innerHTML = html;
            if (categories.some(c => c.key === current)) {
                filterEl.value = current;
            }
        }

        // 2. Contract edit modal dropdown (#contractType)
        const formSelect = document.getElementById('contractType');
        if (formSelect) {
            const current = formSelect.value;
            let html = '<option value="">-- Chọn loại --</option>';
            categories.forEach(cat => {
                html += `<option value="${escapeHtml(cat.key)}">${escapeHtml(cat.text)}</option>`;
            });
            formSelect.innerHTML = html;
            if (categories.some(c => c.key === current)) {
                formSelect.value = current;
            }
        }
    }

    function populateProviderFilters() {
        const providers = getAllProviders();

        // 1. Table filter
        const selectMain = document.getElementById('filterContractProvider');
        if (selectMain) {
            const cur = selectMain.value;
            selectMain.innerHTML = '<option value="">Tất cả nhà cung cấp</option>' + 
                providers.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
            if (providers.includes(cur)) selectMain.value = cur;
        }

        // 2. Modal category filter
        const selectModal = document.getElementById('modalFilterCategoryProvider');
        if (selectModal) {
            const cur = selectModal.value;
            selectModal.innerHTML = '<option value="">Tất cả nhà cung cấp</option>' + 
                providers.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
            if (providers.includes(cur)) selectModal.value = cur;
        }

        // 3. Datalists for inputs
        ['providerDatalist', 'contractSupplierDatalist'].forEach(dlId => {
            const dl = document.getElementById(dlId);
            if (dl) {
                dl.innerHTML = providers.map(p => `<option value="${escapeHtml(p)}"></option>`).join('');
            }
        });
    }

    const populateProviderFilter = populateProviderFilters;

    // ==========================================
    // 12-MONTH FILTER BAR
    // ==========================================
    function renderMonthFilterBar() {
        const grid = document.getElementById('monthButtonsGrid');
        if (!grid) return;

        const contracts = loadContracts();
        const monthCounts = {};
        for (let i = 1; i <= 12; i++) monthCounts[i] = 0;

        contracts.forEach(c => {
            if (!c.end_date) return;
            const d = new Date(c.end_date);
            if (!isNaN(d.getTime()) && d.getFullYear() === selectedYear) {
                const m = d.getMonth() + 1;
                monthCounts[m] = (monthCounts[m] || 0) + 1;
            }
        });

        const yearSelect = document.getElementById('contractFilterYear');
        if (yearSelect && yearSelect.value !== String(selectedYear)) {
            yearSelect.value = String(selectedYear);
        }

        const statusText = document.getElementById('monthFilterStatusText');
        if (statusText) {
            statusText.textContent = selectedMonth
                ? `(Đang lọc: Tháng ${selectedMonth}/${selectedYear})`
                : `(Đang xem: Tất cả các tháng năm ${selectedYear})`;
        }

        const allBtn = document.getElementById('btnMonthFilterAll');
        if (allBtn) {
            if (selectedMonth === null) {
                allBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-indigo-600 text-white shadow-sm flex items-center gap-1';
            } else {
                allBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-1';
            }
        }

        let html = '';
        for (let m = 1; m <= 12; m++) {
            const cnt = monthCounts[m] || 0;
            const isActive = selectedMonth === m;
            const activeCls = isActive
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/50 border-indigo-600 scale-[1.03]'
                : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50/60 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200';
            const badgeCls = isActive
                ? 'bg-white/20 text-white'
                : (cnt > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-bold' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400');

            html += `
                <button type="button" onclick="QLTSPageContracts.selectMonth(${m})" class="month-filter-btn flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${activeCls}" title="Xem hợp đồng hết hạn vào Tháng ${m}/${selectedYear}">
                    <span class="font-bold text-[11px]">Thg ${m}</span>
                    <span class="mt-1 px-1.5 py-0.5 rounded-full text-[10px] ${badgeCls}">${cnt} HĐ</span>
                </button>
            `;
        }
        grid.innerHTML = html;
    }

    function selectMonth(month) {
        if (month === null) {
            selectedMonth = null;
        } else if (selectedMonth === month) {
            selectedMonth = null; // toggle off
        } else {
            selectedMonth = month;
        }
        renderMonthFilterBar();
        applyFilters();
    }

    function changeFilterYear(year) {
        selectedYear = parseInt(year, 10) || new Date().getFullYear();
        renderMonthFilterBar();
        applyFilters();
    }

    // ==========================================
    // SUPPLIERS (NHÀ CUNG CẤP) MANAGEMENT
    // ==========================================
    function loadSuppliers() {
        try {
            const raw = localStorage.getItem(LocalDB.KEYS.SUPPLIERS);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.error('Error loading suppliers:', e);
        }
        return window.suppliers || [];
    }

    function saveSuppliers(suppliers) {
        try {
            localStorage.setItem(LocalDB.KEYS.SUPPLIERS, JSON.stringify(suppliers));
            window.suppliers = suppliers;
            return true;
        } catch (e) {
            console.error('Error saving suppliers:', e);
            return false;
        }
    }

    function openSupplierModal() {
        resetSupplierForm();
        renderSupplierList();
        openModal('supplierModal');
    }

    function resetSupplierForm() {
        const form = document.getElementById('supplierForm');
        if (form) form.reset();
        const idInput = document.getElementById('supplierId');
        if (idInput) idInput.value = '';
        const title = document.getElementById('supplierFormTitle');
        if (title) title.innerHTML = '<i class="fa-solid fa-plus"></i> Thêm nhà cung cấp mới';
        const saveText = document.getElementById('btnSaveSupplierText');
        if (saveText) saveText.textContent = 'Lưu nhà cung cấp';
        const cancelBtn = document.getElementById('btnCancelSupplierEdit');
        if (cancelBtn) cancelBtn.classList.add('hidden');
    }

    function editSupplier(id) {
        const suppliers = loadSuppliers();
        const s = suppliers.find(x => String(x.id) === String(id));
        if (!s) return;

        document.getElementById('supplierId').value = s.id;
        document.getElementById('supplierName').value = s.name || '';
        document.getElementById('supplierContact').value = s.contact_person || s.contact || '';
        document.getElementById('supplierPhone').value = s.phone || '';
        document.getElementById('supplierEmail').value = s.email || '';
        document.getElementById('supplierAddress').value = s.address || '';
        document.getElementById('supplierNotes').value = s.notes || '';

        const title = document.getElementById('supplierFormTitle');
        if (title) title.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Sửa nhà cung cấp: <span class="text-slate-800 dark:text-slate-200">${escapeHtml(s.name)}</span>`;
        const saveText = document.getElementById('btnSaveSupplierText');
        if (saveText) saveText.textContent = 'Cập nhật NCC';
        const cancelBtn = document.getElementById('btnCancelSupplierEdit');
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        document.getElementById('supplierName').focus();
    }

    function deleteSupplier(id) {
        const suppliers = loadSuppliers();
        const s = suppliers.find(x => String(x.id) === String(id));
        if (!s) return;

        const contracts = loadContracts();
        const inUseCount = contracts.filter(c => (c.provider || '').trim().toLowerCase() === (s.name || '').trim().toLowerCase()).length;

        let msg = '';
        if (inUseCount > 0) {
            msg = `Nhà cung cấp "${s.name}" đang có ${inUseCount} hợp đồng liên kết.\n\nBạn có chắc chắn muốn xóa nhà cung cấp này khỏi danh mục không?`;
        } else {
            msg = `Bạn có chắc chắn muốn xóa nhà cung cấp "${s.name}" không?`;
        }

        const doDelete = () => {
            const updated = suppliers.filter(x => String(x.id) !== String(id));
            saveSuppliers(updated);
            resetSupplierForm();
            populateProviderFilters();
            renderSupplierList();
            applyFilters();

            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal(`Đã xóa nhà cung cấp "${s.name}" thành công.`, 'Đã xóa');
            }
        };

        if (typeof window.showConfirmationModal === 'function') {
            window.showConfirmationModal(msg, doDelete, 'Xóa nhà cung cấp');
        } else if (confirm(msg)) {
            doDelete();
        }
    }

    function handleSupplierSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('supplierId').value;
        const name = document.getElementById('supplierName').value.trim();
        const contact = document.getElementById('supplierContact').value.trim();
        const phone = document.getElementById('supplierPhone').value.trim();
        const email = document.getElementById('supplierEmail').value.trim();
        const address = document.getElementById('supplierAddress').value.trim();
        const notes = document.getElementById('supplierNotes').value.trim();

        if (!name) {
            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal('Vui lòng nhập tên nhà cung cấp.', 'Thiếu thông tin');
            } else {
                alert('Vui lòng nhập tên nhà cung cấp.');
            }
            return;
        }

        const suppliers = loadSuppliers();

        if (id) {
            // Edit
            const idx = suppliers.findIndex(x => String(x.id) === String(id));
            if (idx >= 0) {
                const oldName = suppliers[idx].name;
                suppliers[idx] = {
                    ...suppliers[idx],
                    name,
                    contact_person: contact,
                    phone,
                    email,
                    address,
                    notes,
                    updated_at: new Date().toISOString()
                };

                if (oldName && oldName !== name) {
                    const contracts = loadContracts();
                    let updatedContractsCount = 0;
                    contracts.forEach(c => {
                        if (c.provider === oldName) {
                            c.provider = name;
                            updatedContractsCount++;
                        }
                    });
                    if (updatedContractsCount > 0) {
                        saveContracts(contracts);
                    }
                }
            }
        } else {
            // Add new
            const newId = Math.max(0, ...suppliers.map(x => parseInt(x.id, 10) || 0)) + 1;
            suppliers.push({
                id: newId,
                name,
                contact_person: contact,
                phone,
                email,
                address,
                notes,
                created_at: new Date().toISOString()
            });
        }

        saveSuppliers(suppliers);
        resetSupplierForm();
        populateProviderFilters();
        renderSupplierList();
        applyFilters();

        if (typeof window.showInfoModal === 'function') {
            window.showInfoModal(id ? 'Đã cập nhật nhà cung cấp thành công.' : 'Đã thêm nhà cung cấp mới thành công.', 'Thành công');
        }
    }

    function renderSupplierList() {
        const container = document.getElementById('supplierListContainer');
        if (!container) return;

        const suppliers = loadSuppliers();
        const contracts = loadContracts();
        const searchTerm = (document.getElementById('modalSupplierSearch')?.value || '').toLowerCase().trim();

        const filtered = suppliers.filter(s => {
            if (!searchTerm) return true;
            const haystack = [s.name, s.contact_person, s.contact, s.phone, s.email, s.address, s.notes].join(' ').toLowerCase();
            return haystack.includes(searchTerm);
        });

        const badge = document.getElementById('supplierCountBadge');
        if (badge) {
            badge.textContent = `${filtered.length} / ${suppliers.length} nhà cung cấp`;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <i class="fa-solid fa-truck-field text-2xl mb-1 block opacity-40"></i>
                    Không có nhà cung cấp nào phù hợp tìm kiếm.
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(s => {
            const contactPerson = s.contact_person || s.contact || '';
            const count = contracts.filter(c => (c.provider || '').trim().toLowerCase() === (s.name || '').trim().toLowerCase()).length;

            return `
                <div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center justify-between gap-3 transition-colors">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 font-bold">
                            <i class="fa-solid fa-building text-sm"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-semibold text-xs text-slate-800 dark:text-slate-100">${escapeHtml(s.name)}</span>
                                <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold">${count} HĐ</span>
                            </div>
                            <div class="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                ${contactPerson ? `<span><i class="fa-solid fa-user text-[10px] text-slate-400 mr-1"></i>${escapeHtml(contactPerson)}</span>` : ''}
                                ${s.phone ? `<span><i class="fa-solid fa-phone text-[10px] text-slate-400 mr-1"></i>${escapeHtml(s.phone)}</span>` : ''}
                                ${s.email ? `<span class="text-indigo-600 dark:text-indigo-400"><i class="fa-solid fa-envelope text-[10px] mr-1"></i>${escapeHtml(s.email)}</span>` : ''}
                                ${s.address ? `<span class="truncate max-w-xs text-slate-400"><i class="fa-solid fa-location-dot text-[10px] mr-1"></i>${escapeHtml(s.address)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button type="button" onclick="QLTSPageContracts.filterBySupplier('${escapeHtml(s.name)}')" class="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:hover:bg-blue-800 dark:text-blue-200 text-[11px] font-medium transition-colors" title="Xem danh sách hợp đồng của nhà cung cấp này">
                            <i class="fa-solid fa-file-contract text-[10px] mr-1"></i>Xem HĐ
                        </button>
                        <button type="button" onclick="QLTSPageContracts.editSupplier(${s.id})" class="p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors" title="Chỉnh sửa">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button type="button" onclick="QLTSPageContracts.deleteSupplier(${s.id})" class="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors" title="Xóa nhà cung cấp">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function filterBySupplier(supplierName) {
        closeModal('supplierModal');
        const select = document.getElementById('filterContractProvider');
        if (select) select.value = supplierName;
        applyFilters();
    }

    // ==========================================
    // CATEGORY MANAGEMENT
    // ==========================================
    function openCategoryModal() {
        resetCategoryForm();
        populateProviderFilters();
        renderCategoryList();
        openModal('contractCategoryModal');
    }

    function resetCategoryForm() {
        const form = document.getElementById('contractCategoryForm');
        if (form) form.reset();
        const editKey = document.getElementById('categoryEditKey');
        if (editKey) editKey.value = '';
        const title = document.getElementById('categoryFormTitle');
        if (title) title.innerHTML = '<i class="fa-solid fa-plus"></i> Thêm danh mục mới';
        const saveText = document.getElementById('btnSaveCategoryText');
        if (saveText) saveText.textContent = 'Lưu danh mục';
        const cancelBtn = document.getElementById('btnCancelCategoryEdit');
        if (cancelBtn) cancelBtn.classList.add('hidden');
        const keyInput = document.getElementById('categoryKeyInput');
        if (keyInput) keyInput.readOnly = false;
    }

    function editCategory(key) {
        const categories = loadCategories();
        const cat = categories.find(c => c.key === key);
        if (!cat) return;

        document.getElementById('categoryEditKey').value = cat.key;
        document.getElementById('categoryNameInput').value = cat.text || '';
        const keyInput = document.getElementById('categoryKeyInput');
        keyInput.value = cat.key;
        keyInput.readOnly = true;

        document.getElementById('categoryProviderInput').value = cat.provider || '';
        document.getElementById('categoryIconInput').value = cat.icon || 'fa-solid fa-file-lines';
        document.getElementById('categoryColorInput').value = cat.color || 'indigo';
        document.getElementById('categoryDescInput').value = cat.desc || '';

        const title = document.getElementById('categoryFormTitle');
        if (title) title.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Sửa danh mục: <span class="font-mono text-slate-800 dark:text-slate-200">${escapeHtml(cat.key)}</span>`;
        const saveText = document.getElementById('btnSaveCategoryText');
        if (saveText) saveText.textContent = 'Cập nhật danh mục';
        const cancelBtn = document.getElementById('btnCancelCategoryEdit');
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        document.getElementById('categoryNameInput').focus();
    }

    function deleteCategory(key) {
        const categories = loadCategories();
        const cat = categories.find(c => c.key === key);
        if (!cat) return;

        const contracts = loadContracts();
        const inUseCount = contracts.filter(c => c.contract_type === key).length;

        let confirmMsg = '';
        if (inUseCount > 0) {
            confirmMsg = `Danh mục "${cat.text}" (${cat.key}) đang được gán cho ${inUseCount} hợp đồng.\n\nNếu xóa, các hợp đồng này sẽ được tự động chuyển sang loại "Khác" (other).\n\nBạn có chắc chắn muốn xóa không?`;
        } else {
            confirmMsg = `Bạn có chắc chắn muốn xóa danh mục "${cat.text}" (${cat.key}) không?`;
        }

        const doDelete = () => {
            if (inUseCount > 0) {
                contracts.forEach(c => {
                    if (c.contract_type === key) {
                        c.contract_type = 'other';
                    }
                });
                saveContracts(contracts);
            }

            const updatedCategories = categories.filter(c => c.key !== key);
            saveCategories(updatedCategories);

            resetCategoryForm();
            populateCategoryDropdowns();
            populateProviderFilters();
            renderCategoryList();
            applyFilters();

            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal(`Đã xóa danh mục "${cat.text}" thành công.`, 'Đã xóa danh mục');
            }
        };

        if (typeof window.showConfirmationModal === 'function') {
            window.showConfirmationModal(confirmMsg, doDelete, 'Xóa danh mục');
        } else if (confirm(confirmMsg)) {
            doDelete();
        }
    }

    function handleCategoryFormSubmit(e) {
        e.preventDefault();
        const editKey = document.getElementById('categoryEditKey').value.trim();
        const name = document.getElementById('categoryNameInput').value.trim();
        let key = document.getElementById('categoryKeyInput').value.trim().toLowerCase();
        const provider = document.getElementById('categoryProviderInput').value.trim();
        const icon = document.getElementById('categoryIconInput').value;
        const color = document.getElementById('categoryColorInput').value;
        const desc = document.getElementById('categoryDescInput').value.trim();

        if (!name || (!editKey && !key)) {
            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal('Vui lòng nhập tên danh mục và mã loại.', 'Thiếu thông tin');
            } else {
                alert('Vui lòng nhập tên danh mục và mã loại.');
            }
            return;
        }

        key = key.replace(/[^a-z0-9_]/g, '_');

        const categories = loadCategories();

        if (editKey) {
            const idx = categories.findIndex(c => c.key === editKey);
            if (idx >= 0) {
                categories[idx] = {
                    ...categories[idx],
                    text: name,
                    provider: provider,
                    icon: icon,
                    color: color,
                    desc: desc
                };
            }
        } else {
            if (categories.some(c => c.key === key)) {
                if (typeof window.showInfoModal === 'function') {
                    window.showInfoModal(`Mã loại danh mục "${key}" đã tồn tại. Vui lòng chọn mã khác.`, 'Trùng mã loại');
                } else {
                    alert(`Mã loại danh mục "${key}" đã tồn tại.`);
                }
                return;
            }

            categories.push({
                key: key,
                text: name,
                provider: provider,
                icon: icon,
                color: color,
                desc: desc
            });
        }

        saveCategories(categories);
        resetCategoryForm();
        populateCategoryDropdowns();
        populateProviderFilters();
        renderCategoryList();
        applyFilters();

        if (typeof window.showInfoModal === 'function') {
            window.showInfoModal(editKey ? 'Đã cập nhật danh mục thành công.' : 'Đã thêm danh mục mới thành công.', 'Thành công');
        }
    }

    function renderCategoryList() {
        const container = document.getElementById('categoryListContainer');
        if (!container) return;

        const categories = loadCategories();
        const contracts = loadContracts();

        const providerFilter = (document.getElementById('modalFilterCategoryProvider')?.value || '').trim().toLowerCase();
        const searchTerm = (document.getElementById('modalCategorySearch')?.value || '').toLowerCase().trim();

        const counts = {};
        contracts.forEach(c => {
            const t = c.contract_type || 'other';
            counts[t] = (counts[t] || 0) + 1;
        });

        const filtered = categories.filter(cat => {
            if (providerFilter) {
                const catProv = (cat.provider || '').toLowerCase();
                const hasMatchingContract = contracts.some(c => (c.contract_type === cat.key) && (c.provider || '').trim().toLowerCase() === providerFilter);
                if (catProv !== providerFilter && !hasMatchingContract) {
                    return false;
                }
            }

            if (searchTerm) {
                const haystack = [cat.key, cat.text, cat.provider, cat.desc].join(' ').toLowerCase();
                if (!haystack.includes(searchTerm)) return false;
            }

            return true;
        });

        const badge = document.getElementById('categoryCountBadge');
        if (badge) {
            badge.textContent = `${filtered.length} / ${categories.length} danh mục`;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <i class="fa-solid fa-folder-open text-2xl mb-1 block opacity-40"></i>
                    Không có danh mục nào phù hợp bộ lọc.
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(cat => {
            const count = counts[cat.key] || 0;
            const colorCls = resolveColorClasses(cat.color);
            const iconCls = cat.icon || 'fa-solid fa-file-lines';

            return `
                <div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center justify-between gap-3 transition-colors">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorCls}">
                            <i class="${iconCls} text-sm"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-semibold text-xs text-slate-800 dark:text-slate-100">${escapeHtml(cat.text)}</span>
                                <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">${escapeHtml(cat.key)}</span>
                                <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold">${count} HĐ</span>
                            </div>
                            <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                ${cat.provider ? `<span class="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium"><i class="fa-solid fa-building text-[10px] text-indigo-500"></i>${escapeHtml(cat.provider)}</span>` : '<span class="italic text-slate-400">Chưa gắn NCC</span>'}
                                ${cat.desc ? `<span class="text-slate-400 truncate max-w-xs">• ${escapeHtml(cat.desc)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button type="button" onclick="QLTSPageContracts.quickFilterCategory('${escapeHtml(cat.key)}', '${escapeHtml(cat.provider || '')}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 dark:bg-slate-700 dark:hover:bg-indigo-900/50 dark:text-slate-300 dark:hover:text-indigo-300 text-[11px] font-medium transition-colors" title="Lọc danh sách theo danh mục này">
                            <i class="fa-solid fa-filter text-[10px] mr-1"></i>Xem HĐ
                        </button>
                        <button type="button" onclick="QLTSPageContracts.editCategory('${escapeHtml(cat.key)}')" class="p-1.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors" title="Chỉnh sửa">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button type="button" onclick="QLTSPageContracts.deleteCategory('${escapeHtml(cat.key)}')" class="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors" title="Xóa danh mục">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function quickFilterCategory(key, provider) {
        closeModal('contractCategoryModal');
        const typeSelect = document.getElementById('filterContractType');
        if (typeSelect) typeSelect.value = key;
        const modalProv = document.getElementById('modalFilterCategoryProvider')?.value;
        if (modalProv) {
            const provSelect = document.getElementById('filterContractProvider');
            if (provSelect) provSelect.value = modalProv;
        }
        applyFilters();
    }

    // ==========================================
    // MODAL UTILS & FULLSCREEN
    // ==========================================
    function togglePreviewFullscreen() {
        const dialog = document.getElementById('contractPreviewDialog');
        const modal = document.getElementById('contractPreviewModal');
        const btn = document.getElementById('btnContractPreviewFullscreen');
        if (!dialog) return;

        const isFull = dialog.classList.contains('preview-fullscreen-mode');
        if (isFull) {
            dialog.classList.remove('preview-fullscreen-mode');
            if (modal) {
                modal.classList.remove('p-0');
                modal.classList.add('p-2', 'sm:p-3');
            }
            if (btn) btn.innerHTML = '<i class="fa-solid fa-expand text-[11px]"></i><span class="hidden md:inline">Toàn màn hình</span>';
        } else {
            dialog.classList.add('preview-fullscreen-mode');
            if (modal) {
                modal.classList.remove('p-2', 'sm:p-3');
                modal.classList.add('p-0');
            }
            if (btn) btn.innerHTML = '<i class="fa-solid fa-compress text-[11px]"></i><span class="hidden md:inline">Thu nhỏ</span>';
        }

        window.dispatchEvent(new Event('resize'));
    }

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
        if (modalId === 'contractPreviewModal') {
            const dialog = document.getElementById('contractPreviewDialog');
            if (dialog && dialog.classList.contains('preview-fullscreen-mode')) {
                togglePreviewFullscreen();
            }
        }
        if (modalId === 'confirmationModal' || modalId === 'confirmModal') {
            pendingDeleteId = null;
            window.confirmCallback = null;
        }
        const anyModalOpen = Array.from(document.querySelectorAll(
            '#contractPreviewModal:not(.hidden), #contractFormModal:not(.hidden), #contractDetailModal:not(.hidden), #contractCategoryModal:not(.hidden), #supplierModal:not(.hidden), #confirmationModal:not(.hidden), #infoModal:not(.hidden), #globalSearchModal:not(.hidden)'
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
        populateCategoryDropdowns();

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
            const linkInput = document.getElementById('contractLink');
            if (linkInput) linkInput.value = contract.link || contract.contract_link || contract.url || '';
            document.getElementById('contractNotes').value = contract.notes || '';
            const attachmentList = document.getElementById('contractAttachmentList');
            if (attachmentList) attachmentList.textContent = contract.attachments?.length ? `Đã có: ${contract.attachments.map(a => a.name).join(', ')}` : 'Chưa có tệp đính kèm';
        } else {
            title.innerHTML = '<i class="fa-solid fa-file-contract text-indigo-500"></i> <span>Thêm hợp đồng mới</span>';
            document.getElementById('contractForm').reset();
            document.getElementById('contractId').value = '';
            const contracts = loadContracts();
            document.getElementById('contractCode').value = getNextCode(contracts);
            const linkInput = document.getElementById('contractLink');
            if (linkInput) linkInput.value = '';
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

        const linkVal = (document.getElementById('contractLink')?.value || '').trim();
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
            link: linkVal,
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

        if (data.cost < 0) {
            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal('Chi phí hợp đồng không được là số âm.', 'Dữ liệu không hợp lệ');
            } else {
                alert('Chi phí hợp đồng không được là số âm.');
            }
            return;
        }

        if (data.start_date && data.end_date && data.end_date < data.start_date) {
            const msg = `Ngày hết hạn hợp đồng (${formatDateSafe(data.end_date)}) không được nhỏ hơn ngày hiệu lực (${formatDateSafe(data.start_date)}).`;
            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal(msg, 'Ngày không hợp lệ');
            } else {
                alert(msg);
            }
            return;
        }

        if (data.provider_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.provider_email)) {
            if (typeof window.showInfoModal === 'function') {
                window.showInfoModal('Địa chỉ email nhà cung cấp không đúng định dạng.', 'Email không hợp lệ');
            } else {
                alert('Địa chỉ email nhà cung cấp không đúng định dạng.');
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
                contracts[idx] = { 
                    ...contracts[idx], 
                    ...data, 
                    link: linkVal,
                    attachments: data.attachments || contracts[idx].attachments || [] 
                };
                contracts[idx].status = computeStatus(contracts[idx]);
            }
        } else {
            // Add
            const newContract = {
                id: getNextId(contracts),
                ...data,
                link: linkVal,
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
        const typeInfo = getCategoryInfo(c.contract_type);
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

            ${c.link ? `
                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 min-w-0">
                    <span class="block text-slate-400 mb-1 font-medium text-xs">Link hợp đồng online</span>
                    <a href="${escapeHtml(c.link)}" target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-1.5 break-all">
                        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        <span>${escapeHtml(c.link)}</span>
                    </a>
                </div>
            ` : ''}

            ${c.notes ? `<div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"><span class="block text-xs text-slate-400 font-medium mb-1">Ghi chú</span><p class="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">${escapeHtml(c.notes)}</p></div>` : ''}
            ${c.attachments?.length ? `
                <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <span class="block text-xs text-slate-400 font-medium mb-1.5">Tệp đính kèm (${c.attachments.length})</span>
                    <div class="space-y-1.5">
                        ${c.attachments.map((a, aIdx) => `
                            <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs">
                                <span class="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 truncate">
                                    <i class="fa-solid fa-paperclip text-indigo-500 shrink-0"></i>
                                    <span class="truncate">${escapeHtml(a.name)}</span>
                                </span>
                                <div class="flex items-center gap-1 shrink-0">
                                    <button type="button" onclick="QLTSPageContracts.viewContractDoc(${c.id}, ${aIdx})" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                                        <i class="fa-solid fa-eye text-[10px]"></i> Xem trực tiếp
                                    </button>
                                    <button type="button" onclick="QLTSPageContracts.downloadAttachment(${c.id}, ${aIdx})" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                                        <i class="fa-solid fa-download text-[10px]"></i> Tải
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                <button type="button" class="close-modal px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-semibold transition-colors" onclick="QLTSPageContracts.closeModal('contractDetailModal')">Đóng</button>
                ${hasContractDoc(c) ? `<button type="button" onclick="QLTSPageContracts.viewContractDoc(${c.id})" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"><i class="fa-solid fa-eye"></i> Xem trực tiếp</button>` : ''}
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
            'Loại': getCategoryInfo(c.contract_type).text,
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

        // Category management modal triggers & events
        const btnManageCategories = document.getElementById('btnManageCategories');
        if (btnManageCategories) btnManageCategories.addEventListener('click', openCategoryModal);

        const formCat = document.getElementById('contractCategoryForm');
        if (formCat) formCat.addEventListener('submit', handleCategoryFormSubmit);

        const btnCancelCat = document.getElementById('btnCancelCategoryEdit');
        if (btnCancelCat) btnCancelCat.addEventListener('click', resetCategoryForm);

        const filterCatProv = document.getElementById('modalFilterCategoryProvider');
        if (filterCatProv) filterCatProv.addEventListener('change', renderCategoryList);

        const searchCatInput = document.getElementById('modalCategorySearch');
        if (searchCatInput) {
            let catSearchTimer;
            searchCatInput.addEventListener('input', () => {
                clearTimeout(catSearchTimer);
                catSearchTimer = setTimeout(renderCategoryList, 150);
            });
        }

        // Supplier (Nhà cung cấp) modal triggers & events
        const btnManageSuppliers = document.getElementById('btnManageSuppliers');
        if (btnManageSuppliers) btnManageSuppliers.addEventListener('click', openSupplierModal);

        const formSupplier = document.getElementById('supplierForm');
        if (formSupplier) formSupplier.addEventListener('submit', handleSupplierSubmit);

        const btnCancelSupplier = document.getElementById('btnCancelSupplierEdit');
        if (btnCancelSupplier) btnCancelSupplier.addEventListener('click', resetSupplierForm);

        const searchSupplierInput = document.getElementById('modalSupplierSearch');
        if (searchSupplierInput) {
            let supplierSearchTimer;
            searchSupplierInput.addEventListener('input', () => {
                clearTimeout(supplierSearchTimer);
                supplierSearchTimer = setTimeout(renderSupplierList, 150);
            });
        }

        // Auto-fill provider contact and email in contract form
        const inputContractProvider = document.getElementById('contractProvider');
        if (inputContractProvider) {
            inputContractProvider.addEventListener('input', () => {
                const val = inputContractProvider.value.trim().toLowerCase();
                if (!val) return;
                const suppliers = loadSuppliers();
                const match = suppliers.find(s => (s.name || '').trim().toLowerCase() === val);
                if (match) {
                    const contactEl = document.getElementById('contractProviderContact');
                    const emailEl = document.getElementById('contractProviderEmail');
                    if (contactEl && !contactEl.value.trim()) {
                        contactEl.value = match.contact_person || match.contact || match.phone || '';
                    }
                    if (emailEl && !emailEl.value.trim() && match.email) {
                        emailEl.value = match.email;
                    }
                }
            });
        }

        // File attachment selection feedback
        const attachmentInput = document.getElementById('contractAttachment');
        if (attachmentInput) {
            attachmentInput.addEventListener('change', () => {
                const file = attachmentInput.files?.[0];
                const list = document.getElementById('contractAttachmentList');
                if (list) {
                    if (file) {
                        const sizeKb = (file.size / 1024).toFixed(1);
                        list.innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 font-semibold"><i class="fa-solid fa-file-arrow-up"></i> Đã chọn: ${escapeHtml(file.name)} (${sizeKb} KB)</span>`;
                    }
                }
            });
        }

        // Close modals on close button click
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = btn.closest('#contractPreviewModal, #contractFormModal, #contractDetailModal, #contractCategoryModal, #supplierModal, #confirmationModal, #infoModal, #globalSearchModal, [id$="Modal"]');
                if (modal) {
                    closeModal(modal.id);
                }
            });
        });

        // Backdrop click to close (with mousedown tracking)
        ['contractPreviewModal', 'contractFormModal', 'contractDetailModal', 'contractCategoryModal', 'supplierModal', 'confirmationModal', 'infoModal', 'globalSearchModal'].forEach(id => {
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

        // Fullscreen toggle for preview modal
        const btnFullscreen = document.getElementById('btnContractPreviewFullscreen');
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', togglePreviewFullscreen);
        }

        // Escape key handler on this page
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modalOrder = ['infoModal', 'confirmationModal', 'globalSearchModal', 'contractPreviewModal', 'supplierModal', 'contractCategoryModal', 'contractDetailModal', 'contractFormModal'];
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

    window.QLTSPageContracts.viewContractDoc = viewContractDoc;
    window.QLTSPageContracts.togglePreviewFullscreen = togglePreviewFullscreen;
    window.QLTSPageContracts.downloadAttachment = downloadAttachment;
    window.QLTSPageContracts.hasContractDoc = hasContractDoc;
    window.QLTSPageContracts.getContractDocSources = getContractDocSources;
    window.QLTSPageContracts.getContractDocUrl = getContractDocUrl;
    window.QLTSPageContracts.deleteContract = deleteContract;
    window.QLTSPageContracts.closeModal = closeModal;
    window.QLTSPageContracts.openCategoryModal = openCategoryModal;
    window.QLTSPageContracts.editCategory = editCategory;
    window.QLTSPageContracts.deleteCategory = deleteCategory;
    window.QLTSPageContracts.quickFilterCategory = quickFilterCategory;
    window.QLTSPageContracts.renderCategoryList = renderCategoryList;

    window.QLTSPageContracts.openSupplierModal = openSupplierModal;
    window.QLTSPageContracts.editSupplier = editSupplier;
    window.QLTSPageContracts.deleteSupplier = deleteSupplier;
    window.QLTSPageContracts.filterBySupplier = filterBySupplier;
    window.QLTSPageContracts.renderSupplierList = renderSupplierList;

    window.QLTSPageContracts.selectMonth = selectMonth;
    window.QLTSPageContracts.changeFilterYear = changeFilterYear;
    window.QLTSPageContracts.renderMonthFilterBar = renderMonthFilterBar;

    window.QLTSPageContracts.goToPage = function (page) {
        currentPage = page;
        renderTable();
    };

    // ==========================================
    // INIT
    // ==========================================
    try {
        const existingContracts = loadContracts();
        const hd1 = existingContracts.find(c => c.code === 'HD-001') || existingContracts[0];
        if (hd1 && (!hd1.attachments || hd1.attachments.length === 0)) {
            const samplePdf = 'JVBERi0xLjMKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNSAwIFIKPj4KPj4KPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA4NQo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGROCihIT1AgRE9ORyBESUNIIFZVIENOVFQgLSBIREdELTIwMjUpIFRqCjAgLTMwIFRkCjE0IFRmCihEbyB0YWM6IFZpZXR0ZWwgVGVsZWNvbSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQ0IDAwMDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0NzYKJSVFT0YK';
            hd1.attachments = [{
                name: 'Hop_dong_Internet_Viettel_2025.pdf',
                data_url: 'data:application/pdf;base64,' + samplePdf,
                type: 'application/pdf',
                size: 654,
                uploaded_at: new Date().toISOString()
            }];
            saveContracts(existingContracts);
        }
    } catch (e) {}

    bindEvents();
    populateCategoryDropdowns();
    populateProviderFilters();
    renderMonthFilterBar();
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
