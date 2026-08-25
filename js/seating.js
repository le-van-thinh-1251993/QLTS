/**
 * Seating Module - Sơ đồ vị trí nhân sự (Excel-like)
 * Features: paint cells, drag-drop users, merge/unmerge, cell types, import/export
 */
document.addEventListener('DOMContentLoaded', () => {
    // =========== STATE ===========
    const STORAGE_KEY = 'seating_data_v2';
    // Primary keys (localDB.js / script.js)
    const USERS_KEY = 'qlts_users';
    const DEPTS_KEY = 'qlts_departments';
    // Legacy keys (users.js fallback)
    const USERS_KEY_LEGACY = 'it_users_final';
    const DEPTS_KEY_LEGACY = 'it_departments_final';

    let rows = 10;
    let cols = 12;
    // cellData[key] = { name?, department?, notes?, color?, cellType?, cellLabel? }
    let cellData = {};
    let mergedCells = {};       // { "r-c": { rowspan, colspan, master:"r-c" } }
    let selectedCells = new Set();
    let isSelecting = false;
    let selStart = null;
    let paintColor = null;      // null = not painting, string = hex color
    let eraserMode = false;
    let draggedUserData = null;  // { name, department }
    let dragSourceCell = null;   // key of cell being dragged (internal move)
    let cachedUsers = null;      // cached user list from Users module

    // Color palette
    const PALETTE = [
        { color: '#3b82f6', label: 'Xanh dương' },
        { color: '#10b981', label: 'Xanh lá' },
        { color: '#f59e0b', label: 'Vàng' },
        { color: '#ef4444', label: 'Đỏ' },
        { color: '#8b5cf6', label: 'Tím' },
        { color: '#ec4899', label: 'Hồng' },
        { color: '#06b6d4', label: 'Xanh ngọc' },
        { color: '#f97316', label: 'Cam' },
        { color: '#84cc16', label: 'Xanh chanh' },
        { color: '#64748b', label: 'Xám' },
        { color: '#a3a3a3', label: 'Bạc' },
        { color: '#1e293b', label: 'Đen' },
    ];

    const CELL_TYPE_ICONS = {
        pillar: '🔲',
        room: '🚪',
        entrance: '🚶',
        pathway: '➡️',
        label: '🏷️',
        wall: '🧱',
        empty: '⬜'
    };

    const CELL_TYPE_NAMES = {
        pillar: 'Cột trụ',
        room: 'Phòng',
        entrance: 'Lối vào',
        pathway: 'Lối đi',
        label: 'Nhãn',
        wall: 'Tường',
        empty: 'Trống'
    };

    // =========== INIT ===========
    loadData();
    initSidebar();
    initColorPalette();
    buildGrid();
    loadUserSidebar();
    updateLegend();
    bindEvents();

    // =========== GRID BUILD ===========
    function buildGrid() {
        const grid = document.getElementById('seatingGrid');
        if (!grid) return;
        grid.innerHTML = '';
        // +1 for header row/col
        grid.style.gridTemplateColumns = `28px repeat(${cols}, minmax(64px, 1fr))`;
        grid.style.gridTemplateRows = `20px repeat(${rows}, minmax(34px, auto))`;

        // Corner cell
        const corner = document.createElement('div');
        corner.className = 'grid-header';
        corner.style.cssText = 'grid-column:1;grid-row:1;min-height:20px;background:#e2e8f0;';
        corner.classList.add('dark:!bg-slate-900');
        grid.appendChild(corner);

        // Column headers (A, B, C, ...)
        for (let c = 0; c < cols; c++) {
            const h = document.createElement('div');
            h.className = 'grid-header';
            h.style.gridColumn = c + 2;
            h.style.gridRow = 1;
            h.textContent = colLabel(c);
            grid.appendChild(h);
        }

        // Row headers (1, 2, 3, ...)
        for (let r = 0; r < rows; r++) {
            const h = document.createElement('div');
            h.className = 'grid-header';
            h.style.gridColumn = 1;
            h.style.gridRow = r + 2;
            h.textContent = r + 1;
            grid.appendChild(h);
        }

        // Build slave map for merged cells
        const slaveMap = {};
        Object.keys(mergedCells).forEach(key => {
            const m = mergedCells[key];
            if (m.master && m.master !== key) slaveMap[key] = m.master;
        });

        // Cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const key = `${r}-${c}`;
                if (slaveMap[key]) continue; // skip slave cells

                const cell = document.createElement('div');
                cell.className = 'seat-cell';
                cell.dataset.key = key;
                cell.dataset.row = r;
                cell.dataset.col = c;

                // Grid position (offset by +2 because of header row/col)
                const merge = mergedCells[key];
                if (merge && merge.master === key && (merge.rowspan > 1 || merge.colspan > 1)) {
                    cell.style.gridColumn = `${c + 2} / span ${merge.colspan}`;
                    cell.style.gridRow = `${r + 2} / span ${merge.rowspan}`;
                } else {
                    cell.style.gridColumn = c + 2;
                    cell.style.gridRow = r + 2;
                }

                renderCellContent(cell, key);
                attachCellEvents(cell, key);
                grid.appendChild(cell);
            }
        }
        updateSelectionVisuals();
    }

    function renderCellContent(cell, key) {
        const d = cellData[key];
        // Apply background color
        if (d && d.color) {
            cell.style.backgroundColor = d.color + '30'; // 30 = ~19% opacity
            cell.style.borderLeft = `3px solid ${d.color}`;
        } else {
            cell.style.backgroundColor = '';
            cell.style.borderLeft = '';
        }

        // Build inner HTML
        let html = '';

        // Actions
        html += `<div class="cell-actions">`;
        if (d && d.name) {
            html += `<button class="act-edit" title="Sửa" data-act="edit"><i class="fa-solid fa-pen"></i></button>`;
            html += `<button class="act-del" title="Xóa người" data-act="remove"><i class="fa-solid fa-user-minus"></i></button>`;
        }
        html += `</div>`;

        if (d && d.cellType) {
            // Cell with type (pillar, room, entrance, wall, label)
            const icon = CELL_TYPE_ICONS[d.cellType] || '';
            const label = d.cellLabel || CELL_TYPE_NAMES[d.cellType] || d.cellType;
            if (d.cellType === 'wall') {
                cell.style.backgroundColor = '#94a3b8';
                cell.style.borderLeft = '';
                html += `<span class="cell-type-icon">${icon}</span>`;
            } else {
                html += `<span class="cell-type-icon">${icon}</span>`;
                html += `<span class="cell-label-text">${escHtml(label)}</span>`;
            }
            if (d.name) {
                html += `<span class="cell-name" style="font-size:8px;margin-top:1px;">${escHtml(d.name)}</span>`;
            }
        } else if (d && d.name) {
            // Person cell
            html += `<span class="cell-name">${escHtml(d.name)}</span>`;
            if (d.department) html += `<span class="cell-dept">${escHtml(d.department)}</span>`;
        } else if (d && d.color) {
            // Just colored (no person, no type) - show empty colored
        } else {
            // Empty cell - subtle indicator
            html += `<span style="color:#cbd5e1;font-size:13px;opacity:.3;">+</span>`;
        }
        cell.innerHTML = html;
    }

    function colLabel(c) {
        // A, B, C, ... Z, AA, AB...
        let s = '';
        let n = c;
        while (n >= 0) {
            s = String.fromCharCode(65 + (n % 26)) + s;
            n = Math.floor(n / 26) - 1;
        }
        return s;
    }

    // =========== CELL EVENTS ===========
    function attachCellEvents(cell, key) {
        // ---- Mouse selection ----
        cell.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            const btn = e.target.closest('[data-act]');
            if (btn) {
                e.stopPropagation();
                handleAction(btn.dataset.act, key);
                return;
            }

            // Paint mode
            if (paintColor || eraserMode) {
                e.preventDefault();
                applyPaint(key);
                isSelecting = true;
                selStart = key;
                return;
            }

            // Selection
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleSelect(key);
                return;
            }
            if (e.shiftKey && selectedCells.size > 0) {
                e.preventDefault();
                extendSelection(key);
                return;
            }

            isSelecting = true;
            selStart = key;
            selectedCells.clear();
            selectedCells.add(key);
            updateSelectionVisuals();
        });

        cell.addEventListener('mouseenter', () => {
            if (!isSelecting || !selStart) return;
            if (paintColor || eraserMode) {
                applyPaint(key);
                return;
            }
            rangeSelect(selStart, key);
        });

        // ---- Drag & drop ----
        // Make cells with person data draggable
        const d = cellData[key];
        if (d && d.name) {
            cell.draggable = true;
            cell.style.cursor = 'grab';
            cell.addEventListener('dragstart', e => {
                dragSourceCell = key;
                draggedUserData = null;
                e.dataTransfer.setData('text/plain', key);
                e.dataTransfer.effectAllowed = 'move';
                cell.classList.add('dragging');
                setTimeout(() => cell.style.opacity = '0.4', 0);
            });
            cell.addEventListener('dragend', () => {
                cell.classList.remove('dragging');
                cell.style.opacity = '';
                dragSourceCell = null;
            });
        }

        // All cells accept drops
        cell.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = dragSourceCell ? 'move' : 'copy';
            cell.classList.add('drag-over');
        });
        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over');
        });
        cell.addEventListener('drop', e => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            handleDrop(key, e);
        });

        // Double-click to edit
        cell.addEventListener('dblclick', e => {
            if (e.target.closest('[data-act]')) return;
            openEditModal(key);
        });
    }

    // =========== PAINT ===========
    function applyPaint(key) {
        if (eraserMode) {
            if (cellData[key]) {
                delete cellData[key].color;
                if (!cellData[key].name && !cellData[key].cellType && !cellData[key].cellLabel) {
                    delete cellData[key];
                }
            }
        } else if (paintColor) {
            if (!cellData[key]) cellData[key] = {};
            cellData[key].color = paintColor;
        }
        const cellEl = document.querySelector(`[data-key="${key}"]`);
        if (cellEl) renderCellContent(cellEl, key);
        scheduleAutoSave();
        updateLegend();
    }

    // =========== SELECTION ===========
    function toggleSelect(key) {
        if (selectedCells.has(key)) selectedCells.delete(key);
        else selectedCells.add(key);
        updateSelectionVisuals();
    }

    function extendSelection(key) {
        const first = Array.from(selectedCells)[0];
        if (!first) return;
        rangeSelect(first, key);
    }

    function rangeSelect(start, end) {
        const [sr, sc] = start.split('-').map(Number);
        const [er, ec] = end.split('-').map(Number);
        const r1 = Math.min(sr, er), r2 = Math.max(sr, er);
        const c1 = Math.min(sc, ec), c2 = Math.max(sc, ec);
        selectedCells.clear();
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const k = `${r}-${c}`;
                const m = mergedCells[k];
                if (m && m.master && m.master !== k) continue; // skip slaves
                selectedCells.add(k);
            }
        }
        updateSelectionVisuals();
    }

    function updateSelectionVisuals() {
        document.querySelectorAll('.seat-cell').forEach(el => {
            el.classList.toggle('selected', selectedCells.has(el.dataset.key));
        });
    }

    // =========== ACTIONS ===========
    function handleAction(act, key) {
        if (act === 'edit') openEditModal(key);
        else if (act === 'remove') {
            if (cellData[key]) {
                const keepColor = cellData[key].color;
                const keepType = cellData[key].cellType;
                const keepLabel = cellData[key].cellLabel;
                delete cellData[key].name;
                delete cellData[key].department;
                delete cellData[key].notes;
                if (!keepColor && !keepType && !keepLabel) delete cellData[key];
                const cellEl = document.querySelector(`[data-key="${key}"]`);
                if (cellEl) {
                    renderCellContent(cellEl, key);
                    cellEl.draggable = false;
                    cellEl.style.cursor = '';
                }
                scheduleAutoSave();
                refreshUserChips();
                updateLegend();
            }
        }
    }

    // =========== EDIT MODAL ===========
    let editingKey = null;
    function openEditModal(key) {
        editingKey = key;
        const d = cellData[key] || {};
        document.getElementById('editName').value = d.name || '';
        document.getElementById('editDept').value = d.department || '';
        document.getElementById('editNotes').value = d.notes || '';
        document.getElementById('editModalTitle').textContent = d.name ? 'Chỉnh sửa' : 'Thêm nhân sự';
        document.getElementById('editModal').classList.remove('hidden');
        document.getElementById('editName').focus();
    }

    document.getElementById('editForm')?.addEventListener('submit', e => {
        e.preventDefault();
        if (!editingKey) return;
        const name = document.getElementById('editName').value.trim();
        if (!name) { toast('Vui lòng nhập tên', 'err'); return; }
        if (!cellData[editingKey]) cellData[editingKey] = {};
        cellData[editingKey].name = name;
        cellData[editingKey].department = document.getElementById('editDept').value.trim();
        cellData[editingKey].notes = document.getElementById('editNotes').value.trim();
        closeEditModal();
        buildGrid();
        scheduleAutoSave();
        refreshUserChips();
        updateLegend();
    });

    function closeEditModal() {
        document.getElementById('editModal').classList.add('hidden');
        editingKey = null;
    }
    document.getElementById('closeEditModal')?.addEventListener('click', closeEditModal);
    document.getElementById('editCancelBtn')?.addEventListener('click', closeEditModal);
    document.getElementById('editModal')?.addEventListener('click', e => {
        if (e.target.id === 'editModal') closeEditModal();
    });

    // =========== DRAG & DROP ===========
    function handleDrop(targetKey, e) {
        // Check if target is a slave
        const tm = mergedCells[targetKey];
        if (tm && tm.master && tm.master !== targetKey) return;

        // Internal move (cell -> cell)
        if (dragSourceCell) {
            if (dragSourceCell === targetKey) return;
            const srcData = cellData[dragSourceCell];
            if (!srcData || !srcData.name) return;
            // Can only drop into empty cells (or cells without person)
            if (cellData[targetKey] && cellData[targetKey].name) {
                // Swap
                const tmp = { name: cellData[targetKey].name, department: cellData[targetKey].department, notes: cellData[targetKey].notes };
                cellData[targetKey].name = srcData.name;
                cellData[targetKey].department = srcData.department;
                cellData[targetKey].notes = srcData.notes;
                srcData.name = tmp.name;
                srcData.department = tmp.department;
                srcData.notes = tmp.notes;
            } else {
                // Move person data (keep target's color/type)
                if (!cellData[targetKey]) cellData[targetKey] = {};
                cellData[targetKey].name = srcData.name;
                cellData[targetKey].department = srcData.department;
                cellData[targetKey].notes = srcData.notes;
                // Clear source person data (keep color/type)
                delete srcData.name;
                delete srcData.department;
                delete srcData.notes;
                if (!srcData.color && !srcData.cellType && !srcData.cellLabel) delete cellData[dragSourceCell];
            }
            dragSourceCell = null;
            buildGrid();
            scheduleAutoSave();
            refreshUserChips();
            updateLegend();
            return;
        }

        // External drop from user sidebar
        let userData = draggedUserData;
        if (!userData) {
            // Fallback: read from dataTransfer
            try {
                const dt = e.dataTransfer.getData('text/plain');
                if (dt) userData = JSON.parse(dt);
            } catch (_) { /* not JSON, ignore */ }
        }
        if (userData && userData.name) {
            if (cellData[targetKey] && cellData[targetKey].name) {
                toast('Ô đã có người. Kéo vào ô trống hoặc xóa trước.', 'info');
                return;
            }
            if (!cellData[targetKey]) cellData[targetKey] = {};
            cellData[targetKey].name = userData.name;
            cellData[targetKey].department = userData.department || '';
            draggedUserData = null;
            buildGrid();
            scheduleAutoSave();
            refreshUserChips();
            updateLegend();
        }
    }

    // =========== USER SIDEBAR ===========
    function loadUserSidebar() {
        const listEl = document.getElementById('userList');
        if (!listEl) return;
        const users = getUsers();
        cachedUsers = users;
        const placedNames = getPlacedNames();

        // Update department filter
        populateDeptFilter(users);

        // Update user count
        const countEl = document.getElementById('userCount');
        if (countEl) {
            const available = users.filter(u => !placedNames.has(u.name.toLowerCase().trim())).length;
            countEl.textContent = `(${available}/${users.length})`;
        }

        listEl.innerHTML = '';
        const searchVal = (document.getElementById('userSearch')?.value || '').toLowerCase();
        const deptFilter = document.getElementById('userDeptFilter')?.value || '';

        // Group by department
        const grouped = {};
        users.forEach(u => {
            // Apply search filter
            if (searchVal && !u.name.toLowerCase().includes(searchVal) && !(u.department || '').toLowerCase().includes(searchVal)) return;
            // Apply department filter
            if (deptFilter && (u.department || '') !== deptFilter) return;

            const dept = u.department || 'Chưa phân bộ phận';
            if (!grouped[dept]) grouped[dept] = [];
            grouped[dept].push(u);
        });

        const deptKeys = Object.keys(grouped).sort();
        if (deptKeys.length === 0) {
            listEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-[11px]">
                <i class="fa-solid fa-user-slash text-2xl mb-2 block"></i>
                ${searchVal || deptFilter ? 'Không tìm thấy nhân sự phù hợp' : 'Chưa có dữ liệu nhân sự.<br><a href="users.html" class="text-blue-500 hover:underline mt-1 inline-block">Mở module Người dùng →</a>'}
            </div>`;
            return;
        }

        deptKeys.forEach(dept => {
            // Department header
            const header = document.createElement('div');
            header.className = 'text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5 mb-0.5 px-1 flex items-center gap-1';
            header.innerHTML = `<i class="fa-solid fa-building text-[8px]"></i>${escHtml(dept)} <span class="font-normal">(${grouped[dept].length})</span>`;
            listEl.appendChild(header);

            grouped[dept].forEach(u => {
                const chip = document.createElement('div');
                chip.className = 'user-chip';
                const isPlaced = placedNames.has(u.name.toLowerCase().trim());
                if (isPlaced) chip.classList.add('placed');

                const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                const statusDot = u.status === 'Đang hoạt động' ? '<span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block;margin-left:3px;" title="Đang hoạt động"></span>' :
                    u.status === 'Tạm nghỉ' ? '<span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;display:inline-block;margin-left:3px;" title="Tạm nghỉ"></span>' : '';

                chip.innerHTML = `
                    <span class="u-avatar">${initials}</span>
                    <div class="flex-1 min-w-0">
                        <div class="truncate font-medium" style="font-size:11px;">${escHtml(u.name)}${isPlaced ? ' <i class="fa-solid fa-check-circle text-green-500" style="font-size:8px;" title="Đã xếp chỗ"></i>' : ''}${statusDot}</div>
                        ${u.department ? `<div class="truncate" style="font-size:9px;opacity:.6;">${escHtml(u.department)}</div>` : ''}
                    </div>
                `;

                if (!isPlaced) {
                    chip.draggable = true;
                    chip.addEventListener('dragstart', e => {
                        draggedUserData = { name: u.name, department: u.department || '' };
                        dragSourceCell = null;
                        e.dataTransfer.setData('text/plain', JSON.stringify({ name: u.name, department: u.department || '' }));
                        e.dataTransfer.effectAllowed = 'copyMove';
                        chip.classList.add('dragging');
                    });
                    chip.addEventListener('dragend', () => {
                        chip.classList.remove('dragging');
                        // Don't null draggedUserData here — drop handler needs it
                        // It will be cleared in handleDrop after use
                        setTimeout(() => { draggedUserData = null; }, 100);
                    });
                }
                listEl.appendChild(chip);
            });
        });
    }

    function populateDeptFilter(users) {
        const filterEl = document.getElementById('userDeptFilter');
        if (!filterEl) return;
        const currentVal = filterEl.value;
        const depts = [...new Set(users.map(u => u.department || '').filter(Boolean))].sort();
        filterEl.innerHTML = '<option value="">-- Tất cả phòng ban --</option>';
        depts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            filterEl.appendChild(opt);
        });
        filterEl.value = currentVal; // Preserve selection
    }

    function refreshUserChips() {
        loadUserSidebar();
    }

    function readJSON(key) {
        if (window.SeatingHelpers && typeof window.SeatingHelpers.readJSON === 'function') {
            return window.SeatingHelpers.readJSON(key, []);
        }
        try {
            const raw = localStorage.getItem(key);
            if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
        } catch (e) { /* ignore */ }
        return null;
    }

    function getDepartments() {
        if (window.SeatingHelpers && typeof window.SeatingHelpers.getDepartments === 'function') {
            return window.SeatingHelpers.getDepartments();
        }
        return readJSON(DEPTS_KEY) || readJSON(DEPTS_KEY_LEGACY) || [];
    }

    function getUsers() {
        if (window.SeatingHelpers && typeof window.SeatingHelpers.getUsers === 'function') {
            return window.SeatingHelpers.getUsers();
        }
        const depts = getDepartments();
        const deptMap = {};
        depts.forEach(d => { deptMap[d.id] = d.name; });

        // Try primary key first (qlts_users), then legacy (it_users_final)
        let users = readJSON(USERS_KEY) || readJSON(USERS_KEY_LEGACY) || [];

        // Normalize: resolve department_id -> department name
        return users.map(u => {
            const dept = u.department || deptMap[u.department_id] || '';
            return { ...u, department: dept };
        });
    }

    function getPlacedNames() {
        if (window.SeatingHelpers && typeof window.SeatingHelpers.getPlacedNames === 'function') {
            return new Set(window.SeatingHelpers.getPlacedNames(cellData));
        }
        const names = new Set();
        Object.values(cellData).forEach(d => {
            if (d && d.name) names.add(d.name.toLowerCase().trim());
        });
        return names;
    }

    // Sidebar filters
    document.getElementById('userSearch')?.addEventListener('input', loadUserSidebar);
    document.getElementById('userDeptFilter')?.addEventListener('change', loadUserSidebar);
    document.getElementById('refreshUsersBtn')?.addEventListener('click', () => {
        cachedUsers = null;
        loadUserSidebar();
        toast('Đã tải lại danh sách nhân sự', 'ok');
    });

    // Auto-sync when other tabs update localStorage
    const watchKeys = [USERS_KEY, DEPTS_KEY, USERS_KEY_LEGACY, DEPTS_KEY_LEGACY];
    window.addEventListener('storage', (e) => {
        if (watchKeys.includes(e.key)) {
            cachedUsers = null;
            loadUserSidebar();
        }
    });

    // =========== MERGE / UNMERGE ===========
    document.getElementById('mergeCellsBtn')?.addEventListener('click', () => {
        if (selectedCells.size < 2) { toast('Chọn ít nhất 2 ô liền kề (Ctrl/Shift+click hoặc kéo)', 'info'); return; }
        const cells = Array.from(selectedCells).map(k => { const [r, c] = k.split('-').map(Number); return { key: k, r, c }; });
        const r1 = Math.min(...cells.map(c => c.r)), r2 = Math.max(...cells.map(c => c.r));
        const c1 = Math.min(...cells.map(c => c.c)), c2 = Math.max(...cells.map(c => c.c));
        const rspan = r2 - r1 + 1, cspan = c2 - c1 + 1;
        // Validate rectangle
        const expected = new Set();
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) expected.add(`${r}-${c}`);
        if (expected.size !== selectedCells.size) { toast('Các ô phải tạo thành hình chữ nhật liền kề', 'err'); return; }
        // Check already merged
        for (const k of expected) {
            const m = mergedCells[k];
            if (m && ((m.master === k && (m.rowspan > 1 || m.colspan > 1)) || (m.master && m.master !== k))) {
                toast('Vui lòng unmerge trước khi merge lại', 'err'); return;
            }
        }
        const masterKey = `${r1}-${c1}`;
        mergedCells[masterKey] = { rowspan: rspan, colspan: cspan, master: masterKey };
        for (const k of expected) {
            if (k !== masterKey) mergedCells[k] = { master: masterKey, rowspan: 0, colspan: 0 };
        }
        // Move data to master
        for (const k of expected) {
            if (k !== masterKey && cellData[k]) {
                if (!cellData[masterKey]) cellData[masterKey] = {};
                if (!cellData[masterKey].name && cellData[k].name) {
                    cellData[masterKey].name = cellData[k].name;
                    cellData[masterKey].department = cellData[k].department;
                    cellData[masterKey].notes = cellData[k].notes;
                }
                if (!cellData[masterKey].color && cellData[k].color) cellData[masterKey].color = cellData[k].color;
                delete cellData[k];
            }
        }
        selectedCells.clear();
        buildGrid();
        scheduleAutoSave();
        toast(`Đã merge ${rspan}×${cspan}`, 'ok');
    });

    document.getElementById('unmergeCellsBtn')?.addEventListener('click', () => {
        if (selectedCells.size === 0) { toast('Chọn ô đã merge để unmerge', 'info'); return; }
        let count = 0;
        const masters = new Set();
        selectedCells.forEach(k => {
            const m = mergedCells[k];
            if (m) masters.add(m.master || k);
        });
        masters.forEach(master => {
            Object.keys(mergedCells).forEach(k => {
                if (mergedCells[k].master === master) { delete mergedCells[k]; count++; }
            });
        });
        if (count === 0) { toast('Không có cell nào để unmerge', 'info'); return; }
        selectedCells.clear();
        buildGrid();
        scheduleAutoSave();
        toast('Đã unmerge', 'ok');
    });

    // =========== GRID CONTROLS ===========
    el('applyGridBtn')?.addEventListener('click', () => {
        const r = Math.max(1, Math.min(50, parseInt(el('rowsInput').value) || 10));
        const c = Math.max(1, Math.min(50, parseInt(el('colsInput').value) || 12));
        rows = r; cols = c;
        // Clean out-of-range data
        cleanOutOfRange();
        buildGrid();
        scheduleAutoSave();
    });
    el('addRowBtn')?.addEventListener('click', () => { rows++; el('rowsInput').value = rows; buildGrid(); scheduleAutoSave(); });
    el('addColBtn')?.addEventListener('click', () => { cols++; el('colsInput').value = cols; buildGrid(); scheduleAutoSave(); });
    el('delRowBtn')?.addEventListener('click', () => { if (rows > 1) { rows--; el('rowsInput').value = rows; cleanOutOfRange(); buildGrid(); scheduleAutoSave(); } });
    el('delColBtn')?.addEventListener('click', () => { if (cols > 1) { cols--; el('colsInput').value = cols; cleanOutOfRange(); buildGrid(); scheduleAutoSave(); } });

    // =========== INSERT ROW / COL ===========
    el('insertRowBtn')?.addEventListener('click', () => {
        // Determine insert position from selection
        let insertAt = 0;
        if (selectedCells.size > 0) {
            insertAt = Math.min(...[...selectedCells].map(k => parseInt(k.split('-')[0])));
        } else {
            toast('Chọn 1 ô để chèn hàng phía trên', 'info');
            return;
        }
        shiftRowsDown(insertAt);
        rows++;
        el('rowsInput').value = rows;
        selectedCells.clear();
        buildGrid();
        scheduleAutoSave();
        toast(`Đã chèn hàng tại vị trí ${insertAt + 1}`, 'ok');
    });

    el('insertColBtn')?.addEventListener('click', () => {
        let insertAt = 0;
        if (selectedCells.size > 0) {
            insertAt = Math.min(...[...selectedCells].map(k => parseInt(k.split('-')[1])));
        } else {
            toast('Chọn 1 ô để chèn cột bên trái', 'info');
            return;
        }
        shiftColsRight(insertAt);
        cols++;
        el('colsInput').value = cols;
        selectedCells.clear();
        buildGrid();
        scheduleAutoSave();
        toast(`Đã chèn cột tại vị trí ${colLabel(insertAt)}`, 'ok');
    });

    function shiftRowsDown(fromRow) {
        // Shift cellData and mergedCells: all rows >= fromRow move down by 1
        const newCellData = {};
        const newMerged = {};
        Object.keys(cellData).forEach(k => {
            const [r, c] = k.split('-').map(Number);
            if (r >= fromRow) {
                newCellData[`${r + 1}-${c}`] = cellData[k];
            } else {
                newCellData[k] = cellData[k];
            }
        });
        Object.keys(mergedCells).forEach(k => {
            const [r, c] = k.split('-').map(Number);
            const m = mergedCells[k];
            if (r >= fromRow) {
                const newKey = `${r + 1}-${c}`;
                const entry = { ...m };
                if (entry.master) {
                    const [mr, mc] = entry.master.split('-').map(Number);
                    entry.master = mr >= fromRow ? `${mr + 1}-${mc}` : entry.master;
                }
                newMerged[newKey] = entry;
            } else {
                newMerged[k] = { ...m };
                // If master is below fromRow, update reference
                if (m.master) {
                    const [mr, mc] = m.master.split('-').map(Number);
                    if (mr >= fromRow) newMerged[k].master = `${mr + 1}-${mc}`;
                }
            }
        });
        cellData = newCellData;
        mergedCells = newMerged;
    }

    function shiftColsRight(fromCol) {
        const newCellData = {};
        const newMerged = {};
        Object.keys(cellData).forEach(k => {
            const [r, c] = k.split('-').map(Number);
            if (c >= fromCol) {
                newCellData[`${r}-${c + 1}`] = cellData[k];
            } else {
                newCellData[k] = cellData[k];
            }
        });
        Object.keys(mergedCells).forEach(k => {
            const [r, c] = k.split('-').map(Number);
            const m = mergedCells[k];
            if (c >= fromCol) {
                const newKey = `${r}-${c + 1}`;
                const entry = { ...m };
                if (entry.master) {
                    const [mr, mc] = entry.master.split('-').map(Number);
                    entry.master = mc >= fromCol ? `${mr}-${mc + 1}` : entry.master;
                }
                newMerged[newKey] = entry;
            } else {
                newMerged[k] = { ...m };
                if (m.master) {
                    const [mr, mc] = m.master.split('-').map(Number);
                    if (mc >= fromCol) newMerged[k].master = `${mr}-${mc + 1}`;
                }
            }
        });
        cellData = newCellData;
        mergedCells = newMerged;
    }

    function cleanOutOfRange() {
        Object.keys(cellData).forEach(k => {
            const [r, c] = k.split('-').map(Number);
            if (r >= rows || c >= cols) delete cellData[k];
        });
        Object.keys(mergedCells).forEach(k => {
            const [r, c] = k.split('-').map(Number);
            if (r >= rows || c >= cols) delete mergedCells[k];
        });
    }

    // Clear all
    el('clearAllBtn')?.addEventListener('click', () => {
        showConfirm('Xóa tất cả dữ liệu sơ đồ?', () => {
            cellData = {};
            mergedCells = {};
            selectedCells.clear();
            buildGrid();
            scheduleAutoSave();
            refreshUserChips();
            updateLegend();
            toast('Đã xóa tất cả', 'ok');
        });
    });

    // =========== COLOR PALETTE ===========
    function initColorPalette() {
        const pal = el('colorPalette');
        if (!pal) return;
        pal.innerHTML = '';
        PALETTE.forEach(p => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = p.color;
            swatch.title = p.label;
            swatch.dataset.color = p.color;
            swatch.addEventListener('click', () => {
                if (paintColor === p.color) {
                    // Deactivate
                    paintColor = null;
                    eraserMode = false;
                    updatePaintUI();
                } else {
                    paintColor = p.color;
                    eraserMode = false;
                    updatePaintUI();
                }
            });
            pal.appendChild(swatch);
        });
    }

    el('customColor')?.addEventListener('input', e => {
        paintColor = e.target.value;
        eraserMode = false;
        updatePaintUI();
    });

    el('eraserBtn')?.addEventListener('click', () => {
        eraserMode = !eraserMode;
        paintColor = null;
        updatePaintUI();
    });

    function updatePaintUI() {
        const grid = el('seatingGrid');
        if (grid) {
            grid.classList.toggle('paint-mode', !!(paintColor || eraserMode));
        }
        document.querySelectorAll('.color-swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.color === paintColor);
        });
        el('eraserBtn')?.classList.toggle('eraser-active', eraserMode);
        el('eraserBtn')?.classList.toggle('active', eraserMode);
    }

    // =========== CELL TYPE / LABEL ===========
    el('applyLabelBtn')?.addEventListener('click', () => {
        if (selectedCells.size === 0) { toast('Chọn ô trước', 'info'); return; }
        const type = el('cellTypeSelect')?.value || '';
        const label = el('cellLabelInput')?.value.trim() || '';
        selectedCells.forEach(k => {
            if (!cellData[k]) cellData[k] = {};
            cellData[k].cellType = type;
            cellData[k].cellLabel = label;
        });
        buildGrid();
        scheduleAutoSave();
        updateLegend();
        toast('Đã gán nhãn', 'ok');
    });

    el('clearLabelBtn')?.addEventListener('click', () => {
        if (selectedCells.size === 0) { toast('Chọn ô trước', 'info'); return; }
        selectedCells.forEach(k => {
            if (cellData[k]) {
                delete cellData[k].cellType;
                delete cellData[k].cellLabel;
                if (!cellData[k].name && !cellData[k].color) delete cellData[k];
            }
        });
        buildGrid();
        scheduleAutoSave();
        updateLegend();
        toast('Đã xóa nhãn', 'ok');
    });

    // =========== LEGEND ===========
    function updateLegend() {
        const container = el('legendItems');
        if (!container) return;

        // Count how many cells of each color exist, grouped by usage
        // For colors: track which department has the MOST cells with that color
        const colorCounts = {}; // { color: { dept: count } }
        const typeLabels = {};

        Object.values(cellData).forEach(d => {
            if (d.color) {
                if (!colorCounts[d.color]) colorCounts[d.color] = {};
                const dept = d.department || '';
                colorCounts[d.color][dept] = (colorCounts[d.color][dept] || 0) + 1;
            }
            if (d.cellType) {
                const icon = CELL_TYPE_ICONS[d.cellType] || '';
                typeLabels[d.cellType] = icon + ' ' + (CELL_TYPE_NAMES[d.cellType] || d.cellType);
            }
        });

        let html = '';
        Object.entries(colorCounts).forEach(([color, depts]) => {
            // Pick the department with most cells for this color
            const entries = Object.entries(depts).filter(([k]) => k !== '');
            if (entries.length === 0) {
                html += `<span class="inline-flex items-center gap-1"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${color}"></span>Tùy chỉnh</span>`;
            } else {
                // Sort by count desc, take top entry
                entries.sort((a, b) => b[1] - a[1]);
                const topDept = entries[0][0];
                html += `<span class="inline-flex items-center gap-1"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${color}"></span>${escHtml(topDept)}</span>`;
            }
        });
        Object.values(typeLabels).forEach(label => {
            html += `<span>${label}</span>`;
        });
        if (!html) html = '<span class="text-slate-400">Chưa có dữ liệu</span>';
        container.innerHTML = html;
    }

    // =========== IMPORT / EXPORT EXCEL ===========
    el('importExcelBtn')?.addEventListener('click', () => el('importExcelInput')?.click());
    el('importExcelInput')?.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array', cellStyles: true, cellDates: true });
            if (!wb.SheetNames.length) throw new Error('Không có sheet');

            // Find best sheet
            let sheetName = wb.SheetNames[0];
            for (const sn of wb.SheetNames) {
                const ln = sn.toLowerCase();
                if (ln.includes('sơ đồ') || ln.includes('so do') || ln.includes('vị trí') || ln.includes('vi tri') || ln.includes('seating') || ln.includes('nhân sự')) {
                    sheetName = sn; break;
                }
            }
            const ws = wb.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

            // Reset
            cellData = {};
            mergedCells = {};
            selectedCells.clear();

            // Parse merged cells
            if (ws['!merges'] && ws['!merges'].length > 0) {
                ws['!merges'].forEach(m => {
                    const rspan = m.e.r - m.s.r + 1;
                    const cspan = m.e.c - m.s.c + 1;
                    if (rspan > 1 || cspan > 1) {
                        const masterKey = `${m.s.r}-${m.s.c}`;
                        mergedCells[masterKey] = { rowspan: rspan, colspan: cspan, master: masterKey };
                        for (let r = m.s.r; r <= m.e.r; r++) {
                            for (let c = m.s.c; c <= m.e.c; c++) {
                                const k = `${r}-${c}`;
                                if (k !== masterKey) mergedCells[k] = { master: masterKey, rowspan: 0, colspan: 0 };
                            }
                        }
                    }
                });
            }

            // Parse cell data with colors
            let maxR = 0, maxC = 0, count = 0;
            jsonData.forEach((row, r) => {
                if (!row) return;
                row.forEach((val, c) => {
                    const key = `${r}-${c}`;
                    // Skip slave cells
                    const mc = mergedCells[key];
                    if (mc && mc.master && mc.master !== key) return;

                    const cellStr = val != null ? String(val).trim() : '';

                    // Try to read cell color
                    let cellColor = null;
                    const cellRef = XLSX.utils.encode_cell({ r, c });
                    const wsCell = ws[cellRef];
                    if (wsCell && wsCell.s) {
                        const fg = wsCell.s.fgColor || (wsCell.s.fill && wsCell.s.fill.fgColor);
                        if (fg) {
                            if (fg.rgb && fg.rgb !== '000000' && fg.rgb !== 'FFFFFF' && fg.rgb.length >= 6) {
                                cellColor = '#' + fg.rgb.slice(-6);
                            } else if (fg.theme != null) {
                                // theme color fallback
                                cellColor = null;
                            }
                        }
                    }

                    if (cellStr || cellColor) {
                        if (!cellData[key]) cellData[key] = {};
                        if (cellStr) {
                            // Parse name - handle formats like "Name\n(Title)" or "Name - Dept"
                            let name = cellStr;
                            let dept = '';
                            // Remove \n and content in () as notes
                            const nlIdx = name.indexOf('\n');
                            if (nlIdx > 0) {
                                const rest = name.slice(nlIdx + 1).trim();
                                name = name.slice(0, nlIdx).trim();
                                // Check if rest is in parentheses
                                if (rest.startsWith('(') && rest.endsWith(')')) {
                                    // Title/year - store as notes
                                    cellData[key].notes = rest;
                                } else {
                                    dept = rest;
                                }
                            }
                            // Check for "Name - Dept" pattern
                            if (!dept && name.includes(' - ')) {
                                const parts = name.split(' - ');
                                name = parts[0].trim();
                                dept = parts.slice(1).join(' - ').trim();
                            }
                            cellData[key].name = name;
                            if (dept) cellData[key].department = dept;

                            // Detect special cells
                            const lower = cellStr.toLowerCase();
                            if (lower === 'cột' || lower === 'trụ' || lower === 'pillar') {
                                cellData[key].cellType = 'pillar';
                                cellData[key].cellLabel = cellStr;
                            } else if (lower.includes('lối vào') || lower.includes('entrance') || lower.includes('cửa')) {
                                cellData[key].cellType = 'entrance';
                                cellData[key].cellLabel = cellStr;
                                delete cellData[key].name;
                            } else if (lower.includes('phòng họp') || lower.includes('phòng manager') || lower.includes('phòng ') || lower === 'room') {
                                cellData[key].cellType = 'room';
                                cellData[key].cellLabel = cellStr;
                                delete cellData[key].name;
                            } else if (lower === 'trống' || lower === 'empty') {
                                delete cellData[key].name;
                            }
                        }
                        if (cellColor) cellData[key].color = cellColor;

                        maxR = Math.max(maxR, r + 1);
                        maxC = Math.max(maxC, c + 1);
                        count++;
                    }
                });
            });

            rows = Math.max(rows, maxR);
            cols = Math.max(cols, maxC);
            el('rowsInput').value = rows;
            el('colsInput').value = cols;
            buildGrid();
            scheduleAutoSave();
            refreshUserChips();
            updateLegend();
            toast(`Đã nhập: ${count} ô từ "${sheetName}" (${rows}×${cols})`, 'ok');
        } catch (err) {
            console.error('Import error:', err);
            toast('Lỗi khi nhập file: ' + err.message, 'err');
        }
        e.target.value = '';
    });

    // Export
    // =========== COPY COLUMN ===========
    let copiedColData = null; // { colIndex, cells: [{row, data}] }

    el('copyColBtn')?.addEventListener('click', () => {
        // Determine which column is selected
        if (selectedCells.size === 0) {
            toast('Chọn ít nhất 1 ô trong cột cần copy', 'info');
            return;
        }
        const colSet = new Set();
        selectedCells.forEach(k => { const [, c] = k.split('-').map(Number); colSet.add(c); });
        if (colSet.size > 1) {
            toast('Chỉ chọn ô trong 1 cột để copy', 'info');
            return;
        }
        const srcCol = [...colSet][0];

        // Collect column data — SKIP cells with user names
        const copied = [];
        for (let r = 0; r < rows; r++) {
            const key = `${r}-${srcCol}`;
            const d = cellData[key];
            if (d && d.name) {
                // Has a person → skip, don't copy
                copied.push({ row: r, data: null });
            } else if (d) {
                // Has color, label, cellType etc. → copy
                copied.push({ row: r, data: { ...d } });
            } else {
                copied.push({ row: r, data: null });
            }
        }
        // Also copy merge info for this column
        const colMerges = [];
        Object.keys(mergedCells).forEach(k => {
            const m = mergedCells[k];
            if (m.master === k) {
                const [mr, mc] = k.split('-').map(Number);
                // Only same-column vertical merges (colspan=1)
                if (mc === srcCol && m.colspan === 1 && m.rowspan > 1) {
                    // Check no person in merged area
                    let hasPerson = false;
                    for (let rr = mr; rr < mr + m.rowspan; rr++) {
                        const cd = cellData[`${rr}-${srcCol}`];
                        if (cd && cd.name) { hasPerson = true; break; }
                    }
                    if (!hasPerson) colMerges.push({ startRow: mr, rowspan: m.rowspan });
                }
            }
        });
        copiedColData = { srcCol, cells: copied, merges: colMerges };
        toast(`Đã copy cột ${colLabel(srcCol)} (bỏ qua ô có người)`, 'ok');
    });

    // Paste column with Ctrl+V
    document.addEventListener('paste', e => {
        if (!copiedColData) return;
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        if (selectedCells.size === 0) { toast('Chọn 1 ô đích để paste cột', 'info'); return; }

        const targetCols = new Set();
        selectedCells.forEach(k => { const [, c] = k.split('-').map(Number); targetCols.add(c); });
        if (targetCols.size > 1) { toast('Chọn ô trong 1 cột đích để paste', 'info'); return; }
        const destCol = [...targetCols][0];
        if (destCol === copiedColData.srcCol) { toast('Cột đích trùng cột nguồn', 'info'); return; }

        e.preventDefault();
        // Apply copied cell data
        copiedColData.cells.forEach(({ row, data }) => {
            const destKey = `${row}-${destCol}`;
            const existing = cellData[destKey];
            if (existing && existing.name) return; // Don't overwrite person cells
            if (data) {
                cellData[destKey] = { ...data };
            }
        });
        // Apply merges
        copiedColData.merges.forEach(({ startRow, rowspan }) => {
            const masterKey = `${startRow}-${destCol}`;
            // Check dest cells don't have people
            let ok = true;
            for (let rr = startRow; rr < startRow + rowspan; rr++) {
                const cd = cellData[`${rr}-${destCol}`];
                if (cd && cd.name) { ok = false; break; }
            }
            if (!ok) return;
            mergedCells[masterKey] = { master: masterKey, rowspan, colspan: 1 };
            for (let rr = startRow + 1; rr < startRow + rowspan; rr++) {
                mergedCells[`${rr}-${destCol}`] = { master: masterKey };
            }
        });

        buildGrid();
        scheduleAutoSave();
        toast(`Đã paste cột vào ${colLabel(destCol)}`, 'ok');
    });

    // =========== EXPORT EXCEL (with merge + color + content) ===========
    el('exportExcelBtn')?.addEventListener('click', () => {
        try {
            // 1. Build header row (A, B, C, ...)
            const headerRow = [];
            for (let c = 0; c < cols; c++) headerRow.push(colLabel(c));
            
            // 2. Build data rows — NAME ONLY (no department, no notes)
            const aoa = [headerRow];
            for (let r = 0; r < rows; r++) {
                const row = [];
                for (let c = 0; c < cols; c++) {
                    const key = `${r}-${c}`;
                    const mc = mergedCells[key];
                    if (mc && mc.master && mc.master !== key) { row.push(''); continue; }
                    const d = cellData[key];
                    if (d) {
                        let val = '';
                        if (d.name) val = d.name;
                        else if (d.cellType === 'wall') val = '';
                        else if (d.cellType && d.cellLabel) val = d.cellLabel;
                        else if (d.cellType) val = CELL_TYPE_NAMES[d.cellType] || '';
                        row.push(val);
                    } else {
                        row.push('');
                    }
                }
                aoa.push(row);
            }

            // 3. Add empty row + legend
            aoa.push([]); // blank separator
            const legendRow = ['Chú thích:'];
            const colorCounts = {};
            Object.values(cellData).forEach(d => {
                if (d.color) {
                    if (!colorCounts[d.color]) colorCounts[d.color] = {};
                    const dept = d.department || '';
                    colorCounts[d.color][dept] = (colorCounts[d.color][dept] || 0) + 1;
                }
            });
            const legendEntries = []; // [{color, label}]
            Object.entries(colorCounts).forEach(([color, depts]) => {
                const entries = Object.entries(depts).filter(([k]) => k !== '');
                if (entries.length > 0) {
                    entries.sort((a, b) => b[1] - a[1]);
                    legendEntries.push({ color, label: entries[0][0] });
                }
            });
            // Cell type labels
            const usedTypes = new Set();
            Object.values(cellData).forEach(d => { if (d.cellType) usedTypes.add(d.cellType); });
            const typeEntries = [];
            usedTypes.forEach(t => {
                typeEntries.push({ label: (CELL_TYPE_ICONS[t] || '') + ' ' + (CELL_TYPE_NAMES[t] || t) });
            });

            // Fill legend row
            legendEntries.forEach(e => legendRow.push(e.label));
            typeEntries.forEach(e => legendRow.push(e.label));
            aoa.push(legendRow);

            const legendRowIndex = aoa.length - 1;

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(aoa);

            // 4. Merged cells (offset +1 for header row)
            const mergeList = [];
            Object.keys(mergedCells).forEach(k => {
                const m = mergedCells[k];
                if (m.master === k && (m.rowspan > 1 || m.colspan > 1)) {
                    const [r, c] = k.split('-').map(Number);
                    mergeList.push({ s: { r: r + 1, c }, e: { r: r + 1 + m.rowspan - 1, c: c + m.colspan - 1 } });
                }
            });
            if (mergeList.length) ws['!merges'] = mergeList;

            // 5. Column widths + Row heights
            ws['!cols'] = Array.from({ length: cols }, () => ({ wch: 18 }));
            ws['!rows'] = [{ hpx: 20 }];
            for (let r = 0; r < rows; r++) ws['!rows'].push({ hpx: 36 });

            // 6. Style header row
            for (let c = 0; c < cols; c++) {
                const ref = XLSX.utils.encode_cell({ r: 0, c });
                if (!ws[ref]) ws[ref] = { v: colLabel(c), t: 's' };
                ws[ref].s = {
                    font: { bold: true, sz: 10, color: { rgb: '334155' } },
                    fill: { fgColor: { rgb: 'E2E8F0' } },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: {
                        top: { style: 'thin', color: { rgb: '94A3B8' } },
                        bottom: { style: 'thin', color: { rgb: '94A3B8' } },
                        left: { style: 'thin', color: { rgb: '94A3B8' } },
                        right: { style: 'thin', color: { rgb: '94A3B8' } }
                    }
                };
            }

            // 7. Style data cells — color + name bold
            const thinBorder = {
                top: { style: 'thin', color: { rgb: 'CBD5E1' } },
                bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
                left: { style: 'thin', color: { rgb: 'CBD5E1' } },
                right: { style: 'thin', color: { rgb: 'CBD5E1' } }
            };
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const key = `${r}-${c}`;
                    const excelR = r + 1;
                    const ref = XLSX.utils.encode_cell({ r: excelR, c });
                    const d = cellData[key];

                    if (!ws[ref]) ws[ref] = { v: '', t: 's' };

                    const style = {
                        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                        font: { sz: 10 },
                        border: thinBorder
                    };

                    if (d && d.color) {
                        style.fill = { fgColor: { rgb: d.color.replace('#', '') } };
                        const hex = d.color.replace('#', '');
                        const bright = (parseInt(hex.substr(0,2),16)*299 + parseInt(hex.substr(2,2),16)*587 + parseInt(hex.substr(4,2),16)*114) / 1000;
                        if (bright < 160) style.font.color = { rgb: 'FFFFFF' };
                    }
                    if (d && d.cellType === 'wall') {
                        style.fill = { fgColor: { rgb: '94A3B8' } };
                    }
                    if (d && d.name) {
                        style.font.bold = true;
                    }

                    ws[ref].s = style;
                }
            }

            // 8. Style legend row — color swatches
            const legendRef0 = XLSX.utils.encode_cell({ r: legendRowIndex, c: 0 });
            if (ws[legendRef0]) {
                ws[legendRef0].s = { font: { bold: true, sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' } };
            }
            legendEntries.forEach((entry, i) => {
                const ref = XLSX.utils.encode_cell({ r: legendRowIndex, c: i + 1 });
                if (!ws[ref]) ws[ref] = { v: entry.label, t: 's' };
                ws[ref].s = {
                    fill: { fgColor: { rgb: entry.color.replace('#', '') } },
                    font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: thinBorder
                };
                // Light colors need dark text
                const hex = entry.color.replace('#', '');
                const bright = (parseInt(hex.substr(0,2),16)*299 + parseInt(hex.substr(2,2),16)*587 + parseInt(hex.substr(4,2),16)*114) / 1000;
                if (bright >= 160) ws[ref].s.font.color = { rgb: '000000' };
            });

            XLSX.utils.book_append_sheet(wb, ws, 'Sơ đồ vị trí');
            XLSX.writeFile(wb, `So_do_vi_tri_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast('Đã xuất Excel', 'ok');
        } catch (err) {
            console.error('Export error:', err);
            toast('Lỗi khi xuất file: ' + err.message, 'err');
        }
    });

    // =========== SAVE / LOAD ===========
    function saveData() {
        const payload = { rows, cols, cellData, mergedCells, version: 2, updated_at: new Date().toISOString() };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) { console.warn('Save error:', e); }
        // Also try old key for compat
        try {
            const oldPayload = {
                rows, cols,
                seatingData: cellData,
                pinnedPositions: [],
                mergedCells,
                colorMap: {},
                updated_at: new Date().toISOString()
            };
            localStorage.setItem('seating_data', JSON.stringify(oldPayload));
        } catch (e) { /* ignore */ }
    }

    function loadData() {
        try {
            // Try v2 first
            let raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d.version === 2) {
                    rows = d.rows || 10;
                    cols = d.cols || 12;
                    cellData = d.cellData || {};
                    mergedCells = d.mergedCells || {};
                    el('rowsInput').value = rows;
                    el('colsInput').value = cols;
                    return;
                }
            }
            // Fallback to v1 (old format)
            raw = localStorage.getItem('seating_data');
            if (raw) {
                const d = JSON.parse(raw);
                rows = d.rows || 10;
                cols = d.cols || 12;
                mergedCells = d.mergedCells || d.merged || {};
                const oldData = d.seatingData || d.data || {};
                // Convert old format
                cellData = {};
                Object.keys(oldData).forEach(key => {
                    const o = oldData[key];
                    cellData[key] = {
                        name: o.name,
                        department: o.department,
                        notes: o.notes,
                        color: o.color
                    };
                });
                el('rowsInput').value = rows;
                el('colsInput').value = cols;
            }
        } catch (e) {
            console.warn('Load error:', e);
        }
    }

    let saveTimer = null;
    function scheduleAutoSave() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => saveData(), 1500);
    }

    // Save button
    el('saveBtn')?.addEventListener('click', () => {
        saveData();
        toast('Đã lưu', 'ok');
    });

    // Ctrl+S
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveData();
            toast('Đã lưu', 'ok');
        }
        if (e.key === 'Escape') {
            closeEditModal();
            el('alertModal')?.classList.add('hidden');
            paintColor = null;
            eraserMode = false;
            updatePaintUI();
            selectedCells.clear();
            updateSelectionVisuals();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedCells.size > 0 && !editingKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                selectedCells.forEach(k => {
                    if (cellData[k]) {
                        delete cellData[k].name;
                        delete cellData[k].department;
                        delete cellData[k].notes;
                        if (!cellData[k].color && !cellData[k].cellType && !cellData[k].cellLabel) delete cellData[k];
                    }
                });
                buildGrid();
                scheduleAutoSave();
                refreshUserChips();
                updateLegend();
            }
        }
    });

    // =========== GLOBAL EVENTS ===========
    function bindEvents() {
        // Mouse up globally to end selection
        document.addEventListener('mouseup', () => {
            isSelecting = false;
            selStart = null;
        });

        // Prevent text selection during drag
        document.addEventListener('selectstart', e => {
            if (isSelecting) e.preventDefault();
        });

        // Click outside grid to deselect
        document.addEventListener('click', e => {
            if (!e.target.closest('.seating-grid') && !e.target.closest('.tb') && !e.target.closest('.color-swatch') && !e.target.closest('#customColor')) {
                selectedCells.clear();
                updateSelectionVisuals();
            }
        });
    }

    // =========== SIDEBAR TOGGLE ===========
    function initSidebar() {
        // Mobile nav sidebar
        const hb = el('hamburger-button');
        const sb = el('sidebar');
        const bd = el('sidebar-backdrop');
        if (hb && sb) {
            hb.addEventListener('click', () => { sb.classList.toggle('-translate-x-full'); bd?.classList.toggle('hidden'); });
        }
        if (bd && sb) {
            bd.addEventListener('click', () => { sb.classList.add('-translate-x-full'); bd.classList.add('hidden'); });
        }

        // User sidebar toggle (mobile)
        const tgl = el('toggleUserSidebar');
        const us = el('userSidebar');
        const cls = el('closeSidebarBtn');
        if (tgl && us) {
            tgl.addEventListener('click', () => {
                us.classList.toggle('open');
            });
        }
        if (cls && us) {
            cls.addEventListener('click', () => {
                us.classList.remove('open');
            });
        }

        // Auto-refresh user sidebar when page gets focus (user may have edited Users module)
        window.addEventListener('focus', () => {
            loadUserSidebar();
        });
    }

    // =========== UTILITIES ===========
    function el(id) {
        if (window.SeatingHelpers && typeof window.SeatingHelpers.el === 'function') {
            return window.SeatingHelpers.el(id);
        }
        return document.getElementById(id);
    }
    function escHtml(s) {
        if (window.SeatingHelpers && typeof window.SeatingHelpers.escHtml === 'function') {
            return window.SeatingHelpers.escHtml(s);
        }
        const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
    }

    function toast(msg, type = 'info') {
        if (window.SeatingHelpers && typeof window.SeatingHelpers.toast === 'function') {
            return window.SeatingHelpers.toast(msg, type);
        }
        const t = document.createElement('div');
        t.className = `toast-msg ${type}`;
        t.innerHTML = `<i class="fa-solid ${type === 'ok' ? 'fa-check-circle' : type === 'err' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>${escHtml(msg)}`;
        document.body.appendChild(t);
        requestAnimationFrame(() => { t.classList.add('show'); });
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
    }

    function showConfirm(msg, onOk) {
        const modal = el('alertModal');
        el('alertTitle').textContent = 'Xác nhận';
        el('alertMessage').textContent = msg;
        const cancelBtn = el('alertCancel');
        cancelBtn.classList.remove('hidden');
        modal.classList.remove('hidden');
        const okBtn = el('alertOk');
        const newOk = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        const newCancel = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        newOk.addEventListener('click', () => { modal.classList.add('hidden'); newCancel.classList.add('hidden'); onOk(); });
        newCancel.addEventListener('click', () => { modal.classList.add('hidden'); newCancel.classList.add('hidden'); });
    }

    el('alertOk')?.addEventListener('click', () => el('alertModal')?.classList.add('hidden'));
    el('alertModal')?.addEventListener('click', e => { if (e.target.id === 'alertModal') el('alertModal')?.classList.add('hidden'); });
});
