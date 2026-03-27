document.addEventListener('DOMContentLoaded', async () => {
    // Trang sắp xếp chỗ ngồi - có thể dùng Supabase nếu có, nhưng vẫn hoạt động offline

    let rows = 5;
    let cols = 6;
    let seatingData = {}; // Lưu dữ liệu: { "row-col": { name, department, notes, user_id?, pinned?, color? } }
    let pinnedPositions = new Set(); // Lưu các vị trí đã pin: Set(["row-col"])
    let mergedCells = {}; // Lưu thông tin merge: { "row-col": { rowspan, colspan, master: "row-col" } }
    let selectedCells = new Set(); // Các cell đã chọn để merge
    let isSelectingCells = false; // Đang kéo để chọn cells
    let selectionStartCell = null; // Cell bắt đầu selection
    let colorMap = {}; // Map màu với phòng ban: { "IT": "#3b82f6", "PMO": "#fbbf24", ... }
    let currentEditingCell = null;
    let sortableInstance = null;
    let supabaseAvailable = false;
    let usersList = []; // Danh sách users từ Supabase để suggest
    let departmentsList = []; // Danh sách phòng ban
    
    // Màu mặc định cho các phòng ban
    const defaultColors = {
        'IT': '#3b82f6',      // Blue
        'PMO': '#fbbf24',      // Yellow
        'HR': '#10b981',       // Green
        'Finance': '#8b5cf6',  // Purple
        'Sales': '#ef4444',    // Red
        'Marketing': '#ec4899', // Pink
        'Operations': '#06b6d4' // Cyan
    };

    // Kiểm tra xem có Supabase client không (từ auth.js)
    if (typeof supabaseClient !== 'undefined' && supabaseClient !== null) {
        supabaseAvailable = true;
        await loadUsersFromSupabase();
        await loadSeatingFromSupabase();
    } else {
        // Fallback: Load từ localStorage
        loadSeatingFromLocalStorage();
    }

    // Sidebar mobile toggle
    const hamburgerButton = document.getElementById('hamburger-button');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    if (hamburgerButton) {
        hamburgerButton.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            sidebarBackdrop.classList.toggle('hidden');
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            sidebarBackdrop.classList.add('hidden');
        });
    }

    // Close modal handlers
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('personModal').classList.add('hidden');
        });
    });

    document.querySelectorAll('.close-color-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('colorManageModal').classList.add('hidden');
        });
    });

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('personModal').classList.add('hidden');
            document.getElementById('colorManageModal').classList.add('hidden');
            document.getElementById('confirmModal').classList.add('hidden');
            document.getElementById('alertModal').classList.add('hidden');
        }
    });

    // Click outside modal to close
    window.handleModalBackdropClick = function(e) {
        if (e.target.id === 'personModal' || e.target.id === 'colorManageModal') {
            e.target.classList.add('hidden');
        }
    };

    // Initialize grid
    function initGrid() {
        const grid = document.getElementById('seatingGrid');
        if (!grid) return;

        grid.innerHTML = '';
        
        // Sử dụng 1fr cho grid-template-columns để CSS Grid tự tính width
        // Đảm bảo các cột luôn đều nhau và lấp đầy container
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        
        // Giữ nguyên height cố định cho hàng (55px)
        grid.style.gridAutoRows = '55px';
        grid.style.gridAutoFlow = 'row';
        grid.style.width = '100%';
        grid.style.boxSizing = 'border-box';
        grid.style.overflow = 'hidden';
        grid.className = 'grid gap-0.5 p-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg min-h-[400px] bg-slate-50 dark:bg-slate-800/50';
        
        // KHÔNG cần gọi updateMergedCellsWidth - CSS Grid tự tính width cho merged cells

        // Tạo map để track merged cells - QUAN TRỌNG: Phải build đúng để skip slave cells
        const mergedCellMap = {};
        Object.keys(mergedCells).forEach(key => {
            const mergeInfo = mergedCells[key];
            // Nếu là slave cell (có master và master khác key)
            if (mergeInfo && mergeInfo.master && mergeInfo.master !== key) {
                mergedCellMap[key] = mergeInfo.master;
            }
        });
        console.log('MergedCellMap built:', Object.keys(mergedCellMap).length, 'slave cells');

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const key = `${r}-${c}`;
                
                // Skip nếu cell này bị merge vào cell khác
                if (mergedCellMap[key]) {
                    continue;
                }

                const cell = document.createElement('div');
                const isPinned = pinnedPositions.has(key);
                const mergeInfo = mergedCells[key];
                
                let cellClass = `seat-cell relative border rounded px-0.5 py-0.5 cursor-move bg-white dark:bg-slate-700 hover:border-blue-400 hover:shadow-sm transition-all duration-200 ${isPinned ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-300 dark:border-slate-600'}`;
                
                // Apply merge styling TRƯỚC - để không set width cho merged cells
                // Chỉ apply cho master cells (master === key và có rowspan/colspan > 0)
                if (mergeInfo && mergeInfo.master === key && mergeInfo.rowspan && mergeInfo.colspan) {
                    // Set grid spans - QUAN TRỌNG: Phải dùng setProperty với !important
                    // Vì CSS Grid có thể không nhận gridColumn từ inline style thông thường
                    cell.style.setProperty('grid-column', `span ${mergeInfo.colspan}`, 'important');
                    cell.style.setProperty('grid-row', `span ${mergeInfo.rowspan}`, 'important');
                    
                    // Set CSS variables để CSS có thể dùng (nếu cần)
                    cell.style.setProperty('--colspan', mergeInfo.colspan);
                    cell.style.setProperty('--rowspan', mergeInfo.rowspan);
                    
                    // Tính height chính xác dựa trên số hàng merge + gap (giữ nguyên logic cố định)
                    const gapSize = 2; // gap-0.5 = 2px
                    const cellHeight = 55; // Height mỗi cell
                    const calculatedHeight = (cellHeight * mergeInfo.rowspan) + (gapSize * (mergeInfo.rowspan - 1));
                    
                    // Set height để lấp đầy đúng không gian
                    cell.style.height = `${calculatedHeight}px`;
                    cell.style.minHeight = `${calculatedHeight}px`;
                    cell.style.maxHeight = `${calculatedHeight}px`;
                    
                    // QUAN TRỌNG: Để CSS Grid tự tính width từ grid-column: span X
                    // KHÔNG set width - để CSS Grid tự tính hoàn toàn
                    cell.style.width = '';
                    cell.style.minWidth = '0';
                    cell.style.maxWidth = 'none';
                    cell.style.boxSizing = 'border-box';
                    
                    // Đảm bảo cell lấp đầy toàn bộ grid area được cấp
                    cell.style.display = 'flex';
                    cell.style.flexDirection = 'column';
                    cell.style.alignItems = 'stretch';
                    cell.style.justifyContent = 'flex-start';
                    cell.style.overflow = 'hidden';
                    cell.style.wordWrap = 'break-word';
                    cell.style.overflowWrap = 'break-word';
                    cell.style.whiteSpace = 'normal';
                    cellClass += ' merged-cell';
                } else {
                    // Chỉ set width cho non-merged cells
                    cell.style.width = '100%';
                    cell.style.height = '55px';
                    cell.style.minHeight = '55px';
                    cell.style.maxHeight = '55px';
                    cell.style.minWidth = '0'; // Quan trọng: không cho giãn ra
                    cell.style.maxWidth = '100%'; // Không vượt quá 100%
                    cell.style.boxSizing = 'border-box';
                    cell.style.overflow = 'hidden'; // Ẩn nội dung tràn
                    cell.style.wordWrap = 'break-word'; // Xuống dòng khi chữ dài
                    cell.style.overflowWrap = 'break-word'; // Xuống dòng khi chữ dài
                    cell.style.whiteSpace = 'normal'; // Cho phép xuống dòng
                }
                
                cell.className = cellClass;
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.dataset.key = key;
                // Chỉ cho phép drag nếu không bị pin và không phải merged cell
                const cellIsMerged = mergeInfo && mergeInfo.rowspan && mergeInfo.colspan;
                // QUAN TRỌNG: Cell có người thì cho phép drag (cho SortableJS hoặc native drag)
                const cellHasPersonData = !!seatingData[key];
                cell.draggable = cellHasPersonData && !isPinned && !cellIsMerged;
                
                // Double click to edit
                cell.addEventListener('dblclick', (e) => {
                    if (!isPinned && seatingData[key]) {
                        window.editPerson(key);
                    }
                }); // Không cho drag nếu đã pin

                // Render cell content sẽ được gọi sau khi tạo cell
                renderCell(cell, key);

                // Drag and drop handlers
                // - dragstart và dragend: chỉ cho cells có người, không bị pin và không merged
                if (cellHasPersonData && !isPinned && !cellIsMerged) {
                    cell.addEventListener('dragstart', handleDragStart);
                    cell.addEventListener('dragend', handleDragEnd);
                }
                
                // Tất cả cells đều có thể nhận drop (cần cho dragover và drop)
                // Trừ merged slave cells
                const isMergedSlave = mergeInfo && mergeInfo.master && mergeInfo.master !== key;
                if (!isMergedSlave) {
                    cell.addEventListener('dragover', handleDragOver);
                    cell.addEventListener('drop', handleDrop);
                }

                // Mouse events for cell selection
                // Cho phép select merged cells để unmerge, nhưng vẫn cho phép drag cells có người
                cell.addEventListener('mousedown', (e) => {
                    if (e.button === 0) { // Left click only
                        // Nếu click vào button bên trong cell, không xử lý selection
                        const clickedButton = e.target.closest('button');
                        if (clickedButton && clickedButton !== cell) {
                            // Cho phép button hoạt động bình thường (mở modal, etc.)
                            return;
                        }

                        // Kiểm tra nếu là merged cell - cho phép select để unmerge
                        const cellMergeInfo = mergedCells[key];
                        const isCellMerged = cellMergeInfo && cellMergeInfo.master === key && cellMergeInfo.rowspan && cellMergeInfo.colspan;
                        
                        // Nếu là merged cell (có nội dung hoặc không), luôn cho phép select
                        if (isCellMerged) {
                            // Cho phép select merged cell để unmerge - không return, tiếp tục xử lý
                        } else if (!isCellMerged && seatingData[key] && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
                            // Cell có người nhưng không phải merged và không giữ Ctrl/Shift → cho phép drag
                            return;
                        }
                        
                        // Ctrl/Cmd click để thêm vào selection (bao gồm cả cells có người để merge)
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (selectedCells.has(key)) {
                                selectedCells.delete(key);
                            } else {
                                selectedCells.add(key);
                            }
                            updateCellSelection();
                            return;
                        }
                        
                        // Shift click để chọn range (cho phép cả cells có người để merge)
                        if (e.shiftKey && selectedCells.size > 0) {
                            e.preventDefault();
                            e.stopPropagation();
                            const firstSelected = Array.from(selectedCells)[0];
                            const [startR, startC] = firstSelected.split('-').map(Number);
                            const [currentR, currentC] = key.split('-').map(Number);
                            
                            const minR = Math.min(startR, currentR);
                            const maxR = Math.max(startR, currentR);
                            const minC = Math.min(startC, currentC);
                            const maxC = Math.max(startC, currentC);
                            
                            for (let r = minR; r <= maxR; r++) {
                                for (let c = minC; c <= maxC; c++) {
                                    const cellKey = `${r}-${c}`;
                                    // Cho phép select cả cells có người khi Shift+click
                                    const cellMergeInfo = mergedCells[cellKey];
                                    if (!pinnedPositions.has(cellKey) && (!cellMergeInfo || cellMergeInfo.master === cellKey)) {
                                        selectedCells.add(cellKey);
                                    }
                                }
                            }
                            updateCellSelection();
                            return;
                        }
                        
                        // Normal click - start drag selection
                        // Cho phép select merged cells (có nội dung hoặc không) để unmerge
                        if (!seatingData[key] || isCellMerged) {
                            isSelectingCells = true;
                            selectionStartCell = key;
                            selectedCells.clear();
                            selectedCells.add(key);
                            updateCellSelection();
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                });

                cell.addEventListener('mouseenter', (e) => {
                    if (isSelectingCells && selectionStartCell) {
                        updateSelectionFromStartToCurrent(key);
                    }
                });
                
                cell.addEventListener('mousemove', (e) => {
                    if (isSelectingCells && selectionStartCell) {
                        updateSelectionFromStartToCurrent(key);
                    }
                });

                // Click handler - cho phép select merged cells để unmerge
                cell.addEventListener('click', (e) => {
                    // Nếu click vào button bên trong cell, không xử lý selection
                    const clickedButton = e.target.closest('button');
                    if (clickedButton && clickedButton !== cell) {
                        // Cho phép button hoạt động bình thường (mở modal, etc.)
                        return;
                    }
                    
                    // Don't interfere if we just finished dragging
                    if (isSelectingCells) {
                        return;
                    }
                    
                    // Kiểm tra nếu là merged cell - cho phép select để unmerge
                    const clickMergeInfo = mergedCells[key];
                    const isClickMerged = clickMergeInfo && clickMergeInfo.master === key && clickMergeInfo.rowspan && clickMergeInfo.colspan;
                    
                    // Nếu là merged cell, luôn cho phép select
                    // Nếu không phải merged cell và có người, chỉ cho phép drag (không select)
                    if (!isClickMerged && seatingData[key] && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
                        return;
                    }
                    
                    // Ctrl/Cmd click to toggle selection
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (selectedCells.has(key)) {
                            selectedCells.delete(key);
                        } else {
                            selectedCells.add(key);
                        }
                        updateCellSelection();
                    } else if (!e.shiftKey) {
                        // Normal click - select cell này (cho phép select merged cells)
                        if ((!seatingData[key] || isClickMerged) && (!clickedButton || clickedButton === cell)) {
                            e.preventDefault();
                            e.stopPropagation();
                            selectedCells.clear();
                            selectedCells.add(key);
                            updateCellSelection();
                        }
                    }
                });

                grid.appendChild(cell);
            }
        }

        // Tắt SortableJS - chỉ dùng native drag and drop để kiểm soát tốt hơn
        // SortableJS gây conflict với merged cells và tính toán vị trí không chính xác
        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
        }
    }

    function renderCell(cell, key) {
        const isPinned = pinnedPositions.has(key);
        const selectedColor = document.getElementById('colorFilter')?.value || '';
        
        if (seatingData[key]) {
            const person = seatingData[key];
            const cellColor = person.color || colorMap[person.department] || '#94a3b8';
            const isFiltered = selectedColor && cellColor !== selectedColor;
            
            // Apply color as background with opacity
            const bgColor = isFiltered ? 'bg-slate-200 dark:bg-slate-700 opacity-50' : '';
            const borderColor = isPinned ? 'border-amber-400' : 'border-slate-300 dark:border-slate-600';
            
            cell.className = `seat-cell relative border rounded px-0.5 py-0.5 cursor-move hover:border-blue-400 hover:shadow-sm transition-all duration-200 ${borderColor} ${bgColor}`;
            cell.style.width = '100%';
            cell.style.height = '55px';
            cell.style.minHeight = '55px';
            cell.style.maxHeight = '55px';
            cell.style.minWidth = '0'; // Không cho giãn ra
            cell.style.maxWidth = '100%'; // Không vượt quá 100%
            cell.style.boxSizing = 'border-box';
            cell.style.overflow = 'hidden'; // Ẩn nội dung tràn
            cell.style.wordWrap = 'break-word'; // Xuống dòng khi chữ dài
            cell.style.overflowWrap = 'break-word'; // Xuống dòng khi chữ dài
            cell.style.whiteSpace = 'normal'; // Cho phép xuống dòng
            cell.style.backgroundColor = isFiltered ? '' : (cellColor + '20'); // 20 = opacity
            cell.style.borderLeftColor = cellColor;
            cell.style.borderLeftWidth = '3px';
            cell.draggable = !isPinned;
            cell.dataset.color = cellColor;
            
            cell.innerHTML = `
                <div class="absolute top-0 right-0">
                    <button class="pin-btn text-[8px] p-0 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors ${isPinned ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}" onclick="event.stopPropagation(); togglePin('${key}')" title="${isPinned ? 'Bỏ ghim' : 'Ghim vị trí'}">
                        <i class="fa-solid fa-thumbtack"></i>
                    </button>
                </div>
                <div class="text-center h-full flex flex-col justify-center px-0.5" style="overflow: hidden;">
                    <div class="font-semibold text-[9px] dark:text-gray-200 leading-tight" style="word-wrap: break-word; overflow-wrap: break-word; line-height: 1.1; max-width: 100%;" title="${person.name || ''}">${person.name || ''}</div>
                    ${person.department ? `<div class="text-[8px] text-slate-500 dark:text-gray-400 leading-tight" style="word-wrap: break-word; overflow-wrap: break-word; line-height: 1.1; max-width: 100%;" title="${person.department}">${person.department}</div>` : ''}
                    <div class="flex justify-center gap-0.5 mt-0.5">
                        <button class="text-[8px] px-0.5 py-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" onclick="event.stopPropagation(); editPerson('${key}')" title="Chỉnh sửa">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="text-[8px] px-0.5 py-0 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" onclick="event.stopPropagation(); removePerson('${key}')" title="Xóa">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            cell.classList.add('has-person');
        } else {
            cell.className = `seat-cell relative border rounded px-0.5 py-0.5 cursor-move bg-white dark:bg-slate-700 hover:border-blue-400 hover:shadow-sm transition-all duration-200 border-slate-300 dark:border-slate-600`;
            cell.style.width = '100%';
            cell.style.height = '55px';
            cell.style.minHeight = '55px';
            cell.style.maxHeight = '55px';
            cell.style.minWidth = '0'; // Không cho giãn ra
            cell.style.maxWidth = '100%'; // Không vượt quá 100%
            cell.style.boxSizing = 'border-box';
            cell.style.overflow = 'hidden'; // Ẩn nội dung tràn
            cell.style.wordWrap = 'break-word'; // Xuống dòng khi chữ dài
            cell.style.overflowWrap = 'break-word'; // Xuống dòng khi chữ dài
            cell.style.whiteSpace = 'normal'; // Cho phép xuống dòng
            cell.style.backgroundColor = '';
            cell.style.borderLeftWidth = '';
            cell.style.borderLeftColor = '';
            cell.draggable = true;
            cell.dataset.color = '';
            cell.innerHTML = `
                <div class="text-center text-slate-400 dark:text-slate-500 h-full flex items-center justify-center">
                    <button onclick="event.stopPropagation(); event.preventDefault(); addPerson('${key}')" class="text-[8px] px-0.5 py-0 border border-dashed border-slate-300 dark:border-slate-600 rounded hover:border-blue-400 hover:text-blue-500 transition-colors z-10 relative">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            `;
            cell.classList.remove('has-person');
        }
    }

    // Drag and drop handlers
    let draggedElement = null;
    let draggedData = null;

    function handleDragStart(e) {
        // Cho phép drag từ cell có người hoặc từ phần tử con có class has-person
        const cell = e.target.closest('.seat-cell');
        if (!cell) {
            e.preventDefault();
            return;
        }
        
        const key = cell.dataset.key;
        // Chỉ cho phép drag nếu cell có người
        if (!seatingData[key]) {
            e.preventDefault();
            return;
        }
        
        draggedElement = cell;
        draggedData = seatingData[key] ? { ...seatingData[key] } : null;
        cell.style.opacity = '0.5';
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedElement) return;
        
        // Tìm cell target - có thể là e.target hoặc parent
        let targetCell = e.target.closest('.seat-cell');
        if (!targetCell || !targetCell.classList.contains('seat-cell')) {
            // Thử tìm từ tọa độ chuột
            const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
            targetCell = elementBelow?.closest('.seat-cell');
        }
        
        if (!targetCell || !targetCell.classList.contains('seat-cell')) return;
        
        // Lấy grid từ targetCell
        const grid = targetCell.closest('#seatingGrid');
        if (grid) {
            // Xóa highlight cũ
            grid.querySelectorAll('.seat-cell').forEach(cell => {
                cell.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900', 'border-red-400', 'bg-red-50', 'dark:bg-red-900/20');
            });
        }
        
        const targetKey = targetCell.dataset.key;
        const targetRow = targetCell.dataset.row;
        const targetCol = targetCell.dataset.col;
        
        // Kiểm tra xem có phải merged cell slave không
        const mergeInfo = mergedCells[targetKey];
        const isMergedSlave = mergeInfo && mergeInfo.master && mergeInfo.master !== targetKey;
        
        // Chỉ highlight nếu không bị pin, không có người, và không phải merged slave
        if (!pinnedPositions.has(targetKey) && !seatingData[targetKey] && !isMergedSlave && targetRow !== undefined && targetCol !== undefined) {
            targetCell.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
        } else {
            targetCell.classList.add('border-red-400', 'bg-red-50', 'dark:bg-red-900/20');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedElement || !draggedData) {
            // Nếu không có draggedElement, không làm gì
            return;
        }

        // Tìm target cell - có thể là e.target hoặc element tại vị trí drop
        let targetCell = e.target.closest('.seat-cell');
        
        // Nếu không tìm thấy từ e.target, thử tìm từ tọa độ chuột
        if (!targetCell || !targetCell.classList.contains('seat-cell')) {
            const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
            if (elementBelow) {
                targetCell = elementBelow.closest('.seat-cell');
            }
        }
        
        // Nếu vẫn không tìm thấy, thử tìm từ currentTarget
        if (!targetCell || !targetCell.classList.contains('seat-cell')) {
            if (e.currentTarget && e.currentTarget.classList.contains('seat-cell')) {
                targetCell = e.currentTarget;
            }
        }
        
        if (!targetCell || !targetCell.classList.contains('seat-cell')) {
            // Không tìm thấy target, revert
            initGrid();
            return;
        }

        const oldKey = draggedElement.dataset.key;
        if (!oldKey) {
            initGrid();
            return;
        }
        
        // Lấy key từ data-row và data-col để chính xác hơn
        const newRow = targetCell.dataset.row;
        const newCol = targetCell.dataset.col;
        if (newRow === undefined || newCol === undefined) {
            initGrid();
            return;
        }
        const newKey = `${newRow}-${newCol}`;

        // Kiểm tra xem có phải merged cell slave không
        const mergeInfo = mergedCells[newKey];
        const isMergedSlave = mergeInfo && mergeInfo.master && mergeInfo.master !== newKey;

        // Không cho drop vào vị trí đã pin, đã có người, cùng vị trí, hoặc merged slave
        if (pinnedPositions.has(newKey) || seatingData[newKey] || newKey === oldKey || isMergedSlave) {
            // Xóa highlight
            const grid = document.getElementById('seatingGrid');
            if (grid) {
                grid.querySelectorAll('.seat-cell').forEach(cell => {
                    cell.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900', 'border-red-400', 'bg-red-50', 'dark:bg-red-900/20');
                });
            }
            initGrid();
            return;
        }

        // Remove from old position
        delete seatingData[oldKey];
        // Di chuyển pin nếu có
        if (pinnedPositions.has(oldKey)) {
            pinnedPositions.delete(oldKey);
            pinnedPositions.add(newKey);
        }

        // Add to new position
        seatingData[newKey] = draggedData;

        // Reinitialize grid để đảm bảo tất cả vị trí được cập nhật đúng
        initGrid();

        // Reset styles
        const grid = document.getElementById('seatingGrid');
        if (grid) {
            grid.querySelectorAll('.seat-cell').forEach(cell => {
                cell.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900', 'border-red-400', 'bg-red-50', 'dark:bg-red-900/20');
            });
        }
        
        // Auto-save after drag & drop
        scheduleAutoSave();
    }

    function handleDragEnd(e) {
        // Restore opacity
        if (e.target) {
            e.target.style.opacity = '1';
        }
        
        // Xóa tất cả highlight
        const grid = document.getElementById('seatingGrid');
        if (grid) {
            grid.querySelectorAll('.seat-cell').forEach(cell => {
                cell.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900', 'border-red-400', 'bg-red-50', 'dark:bg-red-900/20');
            });
        }
        
        draggedElement = null;
        draggedData = null;
    }

    // Global functions for inline onclick handlers
    window.addPerson = function(key) {
        currentEditingCell = key;
        resetPersonForm();
        document.getElementById('personModalTitle').textContent = 'Thêm người';
        document.getElementById('personModal').classList.remove('hidden');
        setupDropdowns();
    };

    window.editPerson = function(key) {
        currentEditingCell = key;
        const person = seatingData[key] || {};
        document.getElementById('personName').value = person.name || '';
        document.getElementById('personDepartment').value = person.department || '';
        document.getElementById('personNotes').value = person.notes || '';
        document.getElementById('personColor').value = person.color || '#94a3b8';
        updateClearButtons();
        document.getElementById('personModalTitle').textContent = 'Chỉnh sửa người';
        document.getElementById('personModal').classList.remove('hidden');
        setupDropdowns();
    };

    function resetPersonForm() {
        document.getElementById('personName').value = '';
        document.getElementById('personDepartment').value = '';
        document.getElementById('personNotes').value = '';
        document.getElementById('personColor').value = '#94a3b8';
        updateClearButtons();
        hideDropdown('nameDropdown');
        hideDropdown('deptDropdown');
    }

    function updateClearButtons() {
        const nameInput = document.getElementById('personName');
        const deptInput = document.getElementById('personDepartment');
        const clearNameBtn = document.getElementById('clearNameBtn');
        const clearDeptBtn = document.getElementById('clearDeptBtn');
        
        if (clearNameBtn) {
            clearNameBtn.classList.toggle('hidden', !nameInput.value);
        }
        if (clearDeptBtn) {
            clearDeptBtn.classList.toggle('hidden', !deptInput.value);
        }
    }

    window.removePerson = function(key) {
        showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa người này?', () => {
            delete seatingData[key];
            pinnedPositions.delete(key);
            const cell = document.querySelector(`[data-key="${key}"]`);
            if (cell) renderCell(cell, key);
            scheduleAutoSave();
        });
    };

    window.togglePin = function(key) {
        if (pinnedPositions.has(key)) {
            pinnedPositions.delete(key);
        } else {
            pinnedPositions.add(key);
        }
        const cell = document.querySelector(`[data-key="${key}"]`);
        if (cell) renderCell(cell, key);
        scheduleAutoSave();
    };

    // Person form submit - với auto-save và user suggestion
    document.getElementById('personForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentEditingCell) return;

        const name = document.getElementById('personName').value.trim();
        if (!name) {
            alert('Vui lòng nhập tên');
            return;
        }

        // Tìm user từ Supabase nếu có
        const matchedUser = findUserByName(name);
        const department = document.getElementById('personDepartment').value.trim() || 
                          (matchedUser && matchedUser.department ? matchedUser.department.name : '');

        const color = document.getElementById('personColor').value;
        const selectedDept = document.getElementById('personDepartment').value.trim();
        
        // Cập nhật colorMap nếu có phòng ban mới
        if (selectedDept && !colorMap[selectedDept]) {
            colorMap[selectedDept] = color;
        }

        seatingData[currentEditingCell] = {
            name: name,
            department: department,
            notes: document.getElementById('personNotes').value.trim(),
            color: color,
            user_id: matchedUser ? matchedUser.id : null
        };

        const cell = document.querySelector(`[data-key="${currentEditingCell}"]`);
        if (cell) renderCell(cell, currentEditingCell);

        document.getElementById('personModal').classList.add('hidden');
        currentEditingCell = null;

        // Auto-save
        scheduleAutoSave();
    });

    // Setup dropdowns cho Tên và Phòng ban
    function setupDropdowns() {
        const nameInput = document.getElementById('personName');
        const deptInput = document.getElementById('personDepartment');
        const nameDropdown = document.getElementById('nameDropdown');
        const deptDropdown = document.getElementById('deptDropdown');
        const clearNameBtn = document.getElementById('clearNameBtn');
        const clearDeptBtn = document.getElementById('clearDeptBtn');

        // Clear name button
        if (clearNameBtn) {
            clearNameBtn.onclick = () => {
                nameInput.value = '';
                updateClearButtons();
                hideDropdown('nameDropdown');
            };
        }

        // Clear dept button
        if (clearDeptBtn) {
            clearDeptBtn.onclick = () => {
                deptInput.value = '';
                updateClearButtons();
                hideDropdown('deptDropdown');
            };
        }

        // Name input with autocomplete
        if (nameInput) {
            nameInput.oninput = () => {
                updateClearButtons();
                const query = nameInput.value.toLowerCase().trim();
                if (query.length > 0 && usersList.length > 0) {
                    const filtered = usersList.filter(u => 
                        u.name && u.name.toLowerCase().includes(query)
                    ).slice(0, 10);
                    showNameDropdown(filtered);
                } else if (query.length === 0 && usersList.length > 0) {
                    // Show all users when input is empty
                    showNameDropdown(usersList.slice(0, 20));
                } else {
                    hideDropdown('nameDropdown');
                }
            };

            nameInput.onfocus = () => {
                const query = nameInput.value.toLowerCase().trim();
                if (query.length > 0 && usersList.length > 0) {
                    const filtered = usersList.filter(u => 
                        u.name && u.name.toLowerCase().includes(query)
                    ).slice(0, 10);
                    showNameDropdown(filtered);
                } else if (usersList.length > 0) {
                    // Show all users when focused and empty
                    showNameDropdown(usersList.slice(0, 20));
                }
            };
        }

        // Department input with autocomplete
        if (deptInput) {
            deptInput.oninput = () => {
                updateClearButtons();
                const query = deptInput.value.toLowerCase().trim();
                const allDepts = [...new Set([
                    ...departmentsList,
                    ...usersList.map(u => u.department?.name).filter(Boolean)
                ])];
                
                if (query.length > 0) {
                    const filtered = allDepts.filter(d => 
                        d && d.toLowerCase().includes(query)
                    ).slice(0, 10);
                    showDeptDropdown(filtered);
                } else if (query.length === 0) {
                    // Show all departments when input is empty
                    showDeptDropdown(allDepts.slice(0, 20));
                } else {
                    hideDropdown('deptDropdown');
                }
            };

            deptInput.onfocus = () => {
                const query = deptInput.value.toLowerCase().trim();
                const allDepts = [...new Set([
                    ...departmentsList,
                    ...usersList.map(u => u.department?.name).filter(Boolean)
                ])];
                
                if (query.length > 0) {
                    const filtered = allDepts.filter(d => 
                        d && d.toLowerCase().includes(query)
                    ).slice(0, 10);
                    showDeptDropdown(filtered);
                } else {
                    // Show all departments when focused and empty
                    showDeptDropdown(allDepts.slice(0, 20));
                }
            };
        }

        // Setup color preset dropdown
        setupColorPreset();
    }

    function showNameDropdown(items) {
        const dropdown = document.getElementById('nameDropdown');
        if (!dropdown) return;
        
        if (items.length === 0) {
            hideDropdown('nameDropdown');
            return;
        }

        dropdown.innerHTML = items.map(user => {
            const dept = user.department?.name || '';
            return `
                <div class="px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-600 cursor-pointer border-b border-slate-200 dark:border-slate-600 last:border-b-0" onclick="selectUserName('${user.name.replace(/'/g, "\\'")}', '${dept.replace(/'/g, "\\'")}')">
                    <div class="font-medium text-slate-700 dark:text-gray-200">${user.name}</div>
                    ${dept ? `<div class="text-xs text-slate-500 dark:text-gray-400">${dept}</div>` : ''}
                </div>
            `;
        }).join('');
        dropdown.classList.remove('hidden');
    }

    function showDeptDropdown(items) {
        const dropdown = document.getElementById('deptDropdown');
        if (!dropdown) return;
        
        if (items.length === 0) {
            hideDropdown('deptDropdown');
            return;
        }

        dropdown.innerHTML = items.map(dept => {
            const color = colorMap[dept] || '#94a3b8';
            return `
                <div class="px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-600 cursor-pointer border-b border-slate-200 dark:border-slate-600 last:border-b-0 flex items-center gap-2" onclick="selectDepartment('${dept.replace(/'/g, "\\'")}')">
                    <div class="w-4 h-4 rounded" style="background-color: ${color}"></div>
                    <div class="font-medium text-slate-700 dark:text-gray-200">${dept}</div>
                </div>
            `;
        }).join('');
        dropdown.classList.remove('hidden');
    }

    function hideDropdown(id) {
        const dropdown = document.getElementById(id);
        if (dropdown) dropdown.classList.add('hidden');
    }

    window.selectUserName = function(name, dept) {
        document.getElementById('personName').value = name;
        if (dept) {
            document.getElementById('personDepartment').value = dept;
            const color = colorMap[dept] || defaultColors[dept] || '#94a3b8';
            document.getElementById('personColor').value = color;
        }
        updateClearButtons();
        hideDropdown('nameDropdown');
    };

    window.selectDepartment = function(dept) {
        document.getElementById('personDepartment').value = dept;
        const color = colorMap[dept] || defaultColors[dept] || '#94a3b8';
        document.getElementById('personColor').value = color;
        updateClearButtons();
        hideDropdown('deptDropdown');
    };

    function setupColorPreset() {
        const preset = document.getElementById('colorPreset');
        if (!preset) return;
        
        preset.innerHTML = '<option value="">Chọn màu mặc định...</option>';
        Object.entries(defaultColors).forEach(([dept, color]) => {
            const option = document.createElement('option');
            option.value = color;
            option.textContent = `${dept} (${color})`;
            preset.appendChild(option);
        });

        preset.onchange = () => {
            if (preset.value) {
                document.getElementById('personColor').value = preset.value;
            }
        };
    }

    // Click outside to close dropdowns
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#personName') && !e.target.closest('#nameDropdown')) {
            hideDropdown('nameDropdown');
        }
        if (!e.target.closest('#personDepartment') && !e.target.closest('#deptDropdown')) {
            hideDropdown('deptDropdown');
        }
    });

    // Grid controls
    document.getElementById('applyGridBtn')?.addEventListener('click', () => {
        const newRows = parseInt(document.getElementById('rowsInput').value) || 5;
        const newCols = parseInt(document.getElementById('colsInput').value) || 6;
        
        // Preserve existing data that fits in new grid
        const newData = {};
        for (let r = 0; r < Math.min(rows, newRows); r++) {
            for (let c = 0; c < Math.min(cols, newCols); c++) {
                const key = `${r}-${c}`;
                if (seatingData[key]) {
                    newData[key] = seatingData[key];
                }
            }
        }
        seatingData = newData;
        rows = newRows;
        cols = newCols;
        initGrid();
        scheduleAutoSave();
    });

    document.getElementById('addRowBtn')?.addEventListener('click', () => {
        rows++;
        document.getElementById('rowsInput').value = rows;
        initGrid();
        scheduleAutoSave();
    });

    document.getElementById('addColBtn')?.addEventListener('click', () => {
        cols++;
        document.getElementById('colsInput').value = cols;
        initGrid();
        scheduleAutoSave();
    });

    // Merge cells functionality - click và kéo để chọn
    document.getElementById('mergeCellsBtn')?.addEventListener('click', () => {
        if (selectedCells.size >= 2) {
            mergeSelectedCells();
        } else {
            showAlert('Thông báo', 'Vui lòng chọn ít nhất 2 ô liền kề để merge (click và kéo để chọn)');
        }
    });

    document.getElementById('unmergeCellsBtn')?.addEventListener('click', () => {
        if (selectedCells.size > 0) {
            unmergeSelectedCells();
        } else {
            showAlert('Thông báo', 'Vui lòng chọn các ô đã merge để unmerge (click và kéo để chọn)');
        }
    });

    function mergeSelectedCells() {
        if (selectedCells.size < 2) {
            showAlert('Lỗi', 'Cần chọn ít nhất 2 ô để merge');
            return;
        }

        const cells = Array.from(selectedCells).map(key => {
            const [r, c] = key.split('-').map(Number);
            return { key, row: r, col: c };
        });

        // Tìm top-left cell (master cell)
        cells.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.col - b.col;
        });

        const master = cells[0];
        const minRow = Math.min(...cells.map(c => c.row));
        const maxRow = Math.max(...cells.map(c => c.row));
        const minCol = Math.min(...cells.map(c => c.col));
        const maxCol = Math.max(...cells.map(c => c.col));

        const rowspan = maxRow - minRow + 1;
        const colspan = maxCol - minCol + 1;

        // Kiểm tra xem các cells có liền kề không
        const expectedCells = [];
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                expectedCells.push(`${r}-${c}`);
            }
        }

        if (expectedCells.length !== selectedCells.size) {
            showAlert('Lỗi', 'Các ô phải liền kề nhau để merge');
            selectedCells.clear();
            updateCellSelection();
            return;
        }
        
        // Kiểm tra xem có cell nào đã được merge chưa (là master hoặc slave)
        const alreadyMerged = expectedCells.some(key => {
            const mergeInfo = mergedCells[key];
            if (!mergeInfo) return false;
            // Nếu là master của một merge khác
            if (mergeInfo.master === key && mergeInfo.rowspan && mergeInfo.colspan) {
                return true;
            }
            // Nếu là slave của một merge khác
            if (mergeInfo.master && mergeInfo.master !== key) {
                return true;
            }
            return false;
        });
        if (alreadyMerged) {
            showAlert('Lỗi', 'Không thể merge các ô đã được merge. Vui lòng unmerge trước.');
            selectedCells.clear();
            updateCellSelection();
            return;
        }

        // Lưu thông tin merge
        mergedCells[master.key] = { rowspan, colspan, master: master.key };
        expectedCells.forEach(key => {
            if (key !== master.key) {
                mergedCells[key] = { master: master.key, rowspan: 0, colspan: 0 };
            }
        });

        // Di chuyển dữ liệu về master cell nếu có
        expectedCells.forEach(key => {
            if (key !== master.key && seatingData[key]) {
                if (!seatingData[master.key]) {
                    seatingData[master.key] = seatingData[key];
                }
                delete seatingData[key];
            }
        });

        selectedCells.clear();
        initGrid();
        // CSS Grid tự động tính width cho merged cells, không cần gọi updateMergedCellsWidth
        scheduleAutoSave();
        showAlert('Thành công', `Đã merge ${rowspan} hàng x ${colspan} cột`);
    }

    function unmergeSelectedCells() {
        const cellsToUnmerge = Array.from(selectedCells);
        const mastersToUnmerge = new Set();
        
        // Tìm tất cả master cells cần unmerge
        cellsToUnmerge.forEach(key => {
            if (mergedCells[key]) {
                const master = mergedCells[key].master || key;
                mastersToUnmerge.add(master);
            }
        });
        
        // Xóa tất cả merge liên quan đến các master cells
        mastersToUnmerge.forEach(master => {
            Object.keys(mergedCells).forEach(k => {
                if (mergedCells[k].master === master) {
                    delete mergedCells[k];
                }
            });
        });
        
        if (mastersToUnmerge.size === 0) {
            showAlert('Thông báo', 'Không có merged cells nào được chọn để unmerge');
            return;
        }
        
        selectedCells.clear();
        initGrid();
        scheduleAutoSave();
        showAlert('Thành công', `Đã unmerge ${mastersToUnmerge.size} merged cell(s)`);
    }

    // Helper function để update selection từ start đến current
    function updateSelectionFromStartToCurrent(currentKey) {
        if (!selectionStartCell) return;
        
        const [startR, startC] = selectionStartCell.split('-').map(Number);
        const [currentR, currentC] = currentKey.split('-').map(Number);
        
        // Select all cells in rectangle
        selectedCells.clear();
        const minR = Math.min(startR, currentR);
        const maxR = Math.max(startR, currentR);
        const minC = Math.min(startC, currentC);
        const maxC = Math.max(startC, currentC);
        
        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const cellKey = `${r}-${c}`;
                // Only select cells that are not pinned and not already merged (as slave)
                const mergeInfo = mergedCells[cellKey];
                // Cho phép select cả cells có người khi drag selection (để merge)
                if (!pinnedPositions.has(cellKey) && (!mergeInfo || mergeInfo.master === cellKey)) {
                    selectedCells.add(cellKey);
                }
            }
        }
        updateCellSelection();
    }

    // Hàm updateMergedCellsWidth - KHÔNG CẦN THIẾT nữa
    // CSS Grid với gridTemplateColumns: repeat(${cols}, 1fr) và grid-column: span X
    // sẽ tự động tính width chính xác cho merged cells
    // Function này được giữ lại để tương thích nhưng không làm gì
    function updateMergedCellsWidth() {
        // CSS Grid tự động tính width cho merged cells thông qua grid-column: span X
        // Không cần can thiệp bằng JS - để CSS Grid tự xử lý hoàn toàn
    }

    function updateCellSelection() {
        const grid = document.getElementById('seatingGrid');
        if (!grid) return;
        
        grid.querySelectorAll('.seat-cell').forEach(cell => {
            const key = cell.dataset.key;
            // Skip cells that are merged slaves (not master)
            const mergeInfo = mergedCells[key];
            if (mergeInfo && mergeInfo.master && mergeInfo.master !== key) {
                // This is a merged slave cell, don't show selection on it
                return;
            }
            
            if (selectedCells.has(key)) {
                cell.classList.add('ring-2', 'ring-orange-500', 'ring-offset-1', 'z-10', 'relative');
                cell.style.backgroundColor = 'rgba(251, 191, 36, 0.3)'; // Orange highlight
                cell.style.borderColor = '#f59e0b'; // Orange border
            } else {
                cell.classList.remove('ring-2', 'ring-orange-500', 'ring-offset-1', 'z-10');
                // Restore original color
                const person = seatingData[key];
                const isPinned = pinnedPositions.has(key);
                if (person) {
                    const cellColor = person.color || colorMap[person.department] || '#94a3b8';
                    cell.style.backgroundColor = cellColor + '20';
                    cell.style.borderColor = isPinned ? '#fbbf24' : '#cbd5e1';
                } else {
                    cell.style.backgroundColor = '';
                    cell.style.borderColor = isPinned ? '#fbbf24' : '#cbd5e1';
                }
            }
        });
    }

    // Mouse up to end selection
    document.addEventListener('mouseup', (e) => {
        if (isSelectingCells) {
            isSelectingCells = false;
            selectionStartCell = null;
            // Giữ selection sau khi kéo xong
        }
    });
    
    // Prevent text selection khi đang kéo
    document.addEventListener('selectstart', (e) => {
        if (isSelectingCells) {
            e.preventDefault();
        }
    });

    // Import Excel - Cải thiện để đọc nhiều định dạng
    document.getElementById('importExcelInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Kiểm tra file extension
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
            alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
            e.target.value = '';
            return;
        }

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('File Excel không có sheet nào');
            }
            
            // Tìm sheet có tên chứa "sơ đồ" hoặc "vị trí" hoặc dùng sheet đầu tiên
            let targetSheet = workbook.SheetNames[0];
            for (const sheetName of workbook.SheetNames) {
                const lowerName = sheetName.toLowerCase();
                if (lowerName.includes('sơ đồ') || lowerName.includes('vị trí') || 
                    lowerName.includes('so do') || lowerName.includes('vi tri') ||
                    lowerName.includes('seating') || lowerName.includes('layout')) {
                    targetSheet = sheetName;
                    break;
                }
            }
            
            const sheet = workbook.Sheets[targetSheet];
            if (!sheet) {
                throw new Error(`Không tìm thấy sheet "${targetSheet}"`);
            }
            
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

            if (!jsonData || jsonData.length === 0) {
                throw new Error('Sheet trống hoặc không có dữ liệu');
            }

            // Parse merged cells từ Excel - QUAN TRỌNG: Phải đọc trước khi parse data
            mergedCells = {};
            if (sheet['!merges'] && Array.isArray(sheet['!merges']) && sheet['!merges'].length > 0) {
                console.log('Found merged cells in Excel:', sheet['!merges'].length);
                sheet['!merges'].forEach(merge => {
                    // Excel merge format: { s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } }
                    const startRow = merge.s.r;
                    const startCol = merge.s.c;
                    const endRow = merge.e.r;
                    const endCol = merge.e.c;
                    
                    const rowspan = endRow - startRow + 1;
                    const colspan = endCol - startCol + 1;
                    
                    // Chỉ xử lý nếu merge nhiều hơn 1 cell
                    if (rowspan > 1 || colspan > 1) {
                        const masterKey = `${startRow}-${startCol}`;
                        
                        // Set master cell
                        mergedCells[masterKey] = {
                            rowspan: rowspan,
                            colspan: colspan,
                            master: masterKey
                        };
                        
                        // Set slave cells
                        for (let r = startRow; r <= endRow; r++) {
                            for (let c = startCol; c <= endCol; c++) {
                                const key = `${r}-${c}`;
                                if (key !== masterKey) {
                                    mergedCells[key] = {
                                        master: masterKey,
                                        rowspan: 0,
                                        colspan: 0
                                    };
                                }
                            }
                        }
                        
                        console.log(`Merged cell: ${masterKey} -> ${rowspan} rows x ${colspan} cols`);
                    }
                });
                console.log('Total merged cells imported:', Object.keys(mergedCells).length);
            } else {
                console.log('No merged cells found in Excel file');
            }

            // Parse Excel data - Hỗ trợ nhiều định dạng
            seatingData = {};
            pinnedPositions.clear();
            let maxRow = 0;
            let maxCol = 0;
            let importedCount = 0;

            jsonData.forEach((row, r) => {
                if (!row || row.length === 0) return;
                
                row.forEach((cell, c) => {
                    // Bỏ qua nếu cell này là slave của merged cell
                    const key = `${r}-${c}`;
                    const mergeInfo = mergedCells[key];
                    if (mergeInfo && mergeInfo.master && mergeInfo.master !== key) {
                        return; // Skip slave cells
                    }
                    
                    if (cell === null || cell === undefined) return;
                    
                    const cellValue = String(cell).trim();
                    if (cellValue) {
                        // Thử nhiều cách parse:
                        // 1. Format: "Name | Department | Notes"
                        // 2. Format: "Name - Department"
                        // 3. Format: Chỉ có tên
                        let name = '';
                        let department = '';
                        let notes = '';
                        
                        if (cellValue.includes('|')) {
                            const parts = cellValue.split('|').map(s => s.trim());
                            name = parts[0] || '';
                            department = parts[1] || '';
                            notes = parts.slice(2).join(' | ') || '';
                        } else if (cellValue.includes('-')) {
                            const parts = cellValue.split('-').map(s => s.trim());
                            name = parts[0] || '';
                            department = parts.slice(1).join(' - ') || '';
                        } else {
                            name = cellValue;
                        }
                        
                        if (name) {
                            seatingData[key] = {
                                name: name,
                                department: department,
                                notes: notes
                            };
                            maxRow = Math.max(maxRow, r + 1);
                            maxCol = Math.max(maxCol, c + 1);
                            importedCount++;
                        }
                    }
                });
            });

            if (importedCount === 0 && Object.keys(mergedCells).length === 0) {
                throw new Error('Không tìm thấy dữ liệu hợp lệ trong file Excel');
            }

            // Update grid size if needed
            if (maxRow > 0 || maxCol > 0) {
                rows = Math.max(rows, maxRow);
                cols = Math.max(cols, maxCol);
                document.getElementById('rowsInput').value = rows;
                document.getElementById('colsInput').value = cols;
            }

            // Đảm bảo merged cells được apply
            console.log('Merged cells before initGrid:', Object.keys(mergedCells).length);
            console.log('Sample merged cells:', Object.keys(mergedCells).slice(0, 5).map(k => `${k}: ${JSON.stringify(mergedCells[k])}`));
            
            initGrid();
            scheduleAutoSave();
            
            const mergeCount = Object.keys(mergedCells).filter(k => {
                const m = mergedCells[k];
                return m && m.master === k && (m.rowspan > 1 || m.colspan > 1);
            }).length;
            
            showAlert('Import thành công', `Đã import ${importedCount} vị trí từ sheet "${targetSheet}"\nGrid: ${rows} hàng x ${cols} cột\nMerged cells: ${mergeCount}`);
        } catch (error) {
            console.error('Import error:', error);
            showAlert('Lỗi import', 'Lỗi khi import file Excel:\n' + (error.message || error) + '\n\nVui lòng kiểm tra:\n- File có đúng định dạng Excel (.xlsx, .xls)\n- File không bị hỏng\n- Sheet có dữ liệu');
        }

        e.target.value = '';
    });

    document.getElementById('importExcelBtn')?.addEventListener('click', () => {
        document.getElementById('importExcelInput').click();
    });

    // Export Excel
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
        exportExcelData();
    });

    function exportExcelData() {
        try {
            // Kiểm tra xem có dữ liệu không
            const dataCount = Object.keys(seatingData).length;
            if (dataCount === 0) {
                showConfirm('Xác nhận export', 'Chưa có dữ liệu nào để export. Bạn có muốn export grid trống không?', () => {
                    // Continue export
                    doExport();
                });
                return;
            }
            
            doExport();
        } catch (error) {
            console.error('Export error:', error);
            showAlert('Lỗi export', 'Lỗi khi export file Excel:\n' + (error.message || error));
        }
    }

    function doExport() {
        try {

            // Create 2D array for Excel
            const excelData = [];
            for (let r = 0; r < rows; r++) {
                const row = [];
                for (let c = 0; c < cols; c++) {
                    const key = `${r}-${c}`;
                    const mergeInfo = mergedCells[key];
                    
                    // Skip slave cells của merged cells
                    if (mergeInfo && mergeInfo.master && mergeInfo.master !== key) {
                        row.push(null); // null để Excel biết đây là phần của merged cell
                        continue;
                    }
                    
                    const person = seatingData[key];
                    if (person) {
                        const parts = [person.name, person.department, person.notes].filter(Boolean);
                        row.push(parts.join(' | '));
                    } else {
                        row.push('');
                    }
                }
                excelData.push(row);
            }

            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Apply merged cells từ mergedCells object
            const merges = [];
            Object.keys(mergedCells).forEach(key => {
                const mergeInfo = mergedCells[key];
                // Chỉ xử lý master cells
                if (mergeInfo && mergeInfo.master === key && (mergeInfo.rowspan > 1 || mergeInfo.colspan > 1)) {
                    const [r, c] = key.split('-').map(Number);
                    const endRow = r + mergeInfo.rowspan - 1;
                    const endCol = c + mergeInfo.colspan - 1;
                    
                    // Excel merge format: { s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } }
                    merges.push({
                        s: { r: r, c: c },
                        e: { r: endRow, c: endCol }
                    });
                }
            });
            
            if (merges.length > 0) {
                ws['!merges'] = merges;
            }

            // Set column widths
            const colWidths = [];
            for (let c = 0; c < cols; c++) {
                colWidths.push({ wch: 20 });
            }
            ws['!cols'] = colWidths;

            // Set sheet name
            const sheetName = 'Sơ đồ chỗ ngồi';
            XLSX.utils.book_append_sheet(wb, ws, sheetName);

            // Export
            const fileName = `So_do_cho_ngoi_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            const dataCount = Object.keys(seatingData).length;
            const mergeCount = merges.length;
            showAlert('Export thành công', `File: ${fileName}\nGrid: ${rows} hàng x ${cols} cột\nDữ liệu: ${dataCount} vị trí\nMerged cells: ${mergeCount}`);
        } catch (error) {
            console.error('Export error:', error);
            showAlert('Lỗi export', 'Lỗi khi export file Excel:\n' + (error.message || error));
        }
    }

    // =================================================================
    // SUPABASE INTEGRATION (Optional - works without it)
    // =================================================================

    /**
     * Load danh sách users từ Supabase để suggest khi thêm người
     */
    async function loadUsersFromSupabase() {
        if (!supabaseAvailable) return;

        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('id, name, department:departments(name)')
                .order('name');

            if (error) throw error;
            usersList = data || [];
            console.log('✅ Đã tải danh sách users từ Supabase:', usersList.length);
            
            // Load departments
            const { data: deptData, error: deptError } = await supabaseClient
                .from('departments')
                .select('name')
                .order('name');
            
            if (!deptError && deptData) {
                departmentsList = deptData.map(d => d.name);
                // Khởi tạo colorMap với màu mặc định
                departmentsList.forEach(dept => {
                    if (!colorMap[dept]) {
                        colorMap[dept] = defaultColors[dept] || '#94a3b8'; // Default gray
                    }
                });
            }
        } catch (error) {
            console.warn('Không thể tải users từ Supabase:', error);
            usersList = [];
        }
    }

    /**
     * Load seating data từ Supabase
     */
    async function loadSeatingFromSupabase() {
        if (!supabaseAvailable) {
            loadSeatingFromLocalStorage();
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('seating_arrangements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // PGRST116 = no rows returned (bình thường, không phải lỗi)
            // 42P01 = relation does not exist (bảng chưa tồn tại)
            if (error) {
                if (error.code === 'PGRST116') {
                    // Không có data, load từ localStorage
                    loadSeatingFromLocalStorage();
                    return;
                } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    // Bảng chưa tồn tại, tắt Supabase cho seating và dùng localStorage
                    console.info('ℹ️ Bảng seating_arrangements chưa tồn tại trong Supabase. Sử dụng localStorage.');
                    supabaseAvailable = false;
                    loadSeatingFromLocalStorage();
                    return;
                } else {
                    // Lỗi khác, chỉ log warning
                    console.warn('⚠️ Không thể tải seating từ Supabase:', error.message || error);
                    loadSeatingFromLocalStorage();
                    return;
                }
            }

            if (data && data.layout_data) {
                const layout = JSON.parse(data.layout_data);
                seatingData = layout.seatingData || {};
                rows = layout.rows || 5;
                cols = layout.cols || 6;
                pinnedPositions = new Set(layout.pinnedPositions || []);
                mergedCells = layout.mergedCells || {};
                colorMap = layout.colorMap || {};
                
                document.getElementById('rowsInput').value = rows;
                document.getElementById('colsInput').value = cols;
                
                initGrid();
                setupColorFilter();
                console.log('✅ Đã tải seating từ Supabase');
            } else {
                // Không có data trên Supabase, thử load từ localStorage
                loadSeatingFromLocalStorage();
            }
        } catch (error) {
            // Xử lý lỗi không mong đợi
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                console.info('ℹ️ Bảng seating_arrangements chưa tồn tại. Sử dụng localStorage.');
                supabaseAvailable = false;
            } else {
                console.warn('⚠️ Không thể tải seating từ Supabase:', error.message || error);
            }
            loadSeatingFromLocalStorage();
        }
    }

    /**
     * Load seating data từ localStorage (fallback)
     */
    function loadSeatingFromLocalStorage() {
        try {
            // Thử các key có thể có
            let saved = localStorage.getItem('seating_data');
            if (!saved) {
                saved = localStorage.getItem('seatingData'); // Key cũ có thể
            }
            if (!saved) {
                saved = localStorage.getItem('seatingLayout'); // Hoặc key layout
            }
            
            if (saved) {
                const data = JSON.parse(saved);
                seatingData = data.seatingData || data.data || {};
                rows = data.rows || 5;
                cols = data.cols || 6;
                pinnedPositions = new Set(data.pinnedPositions || data.pinned || []);
                mergedCells = data.mergedCells || data.merged || {};
                colorMap = data.colorMap || data.colors || {};
                
                document.getElementById('rowsInput').value = rows;
                document.getElementById('colsInput').value = cols;
                
                initGrid();
                setupColorFilter();
                console.log('✅ Đã tải seating từ localStorage:', Object.keys(seatingData).length, 'người');
            } else {
                console.log('ℹ️ Không có data trong localStorage, khởi tạo grid mới');
                initGrid();
            }
        } catch (error) {
            console.error('Lỗi khi load từ localStorage:', error);
            initGrid();
        }
    }

    /**
     * Lưu seating data vào Supabase và localStorage
     */
    async function saveSeatingData() {
        const layoutData = {
            rows,
            cols,
            seatingData,
            pinnedPositions: Array.from(pinnedPositions),
            mergedCells,
            colorMap,
            updated_at: new Date().toISOString()
        };

        // Luôn lưu vào localStorage để backup
        try {
            localStorage.setItem('seating_data', JSON.stringify(layoutData));
        } catch (error) {
            console.warn('Không thể lưu vào localStorage:', error);
        }

        // Lưu vào Supabase nếu có
        if (supabaseAvailable) {
            try {
                const { data, error } = await supabaseClient
                    .from('seating_arrangements')
                    .upsert({
                        layout_data: JSON.stringify(layoutData),
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'id'
                    })
                    .select()
                    .single();

                if (error) {
                    // Nếu bảng chưa tồn tại, tắt Supabase cho seating
                    if (error.code === '42P01' || error.message?.includes('does not exist')) {
                        console.info('ℹ️ Bảng seating_arrangements chưa tồn tại. Tắt Supabase cho seating.');
                        supabaseAvailable = false;
                        showSaveNotification('Đã lưu vào localStorage', true);
                    } else {
                        throw error;
                    }
                } else {
                    console.log('✅ Đã lưu seating vào Supabase');
                    showSaveNotification('Đã lưu vào Supabase', true);
                }
            } catch (error) {
                // Xử lý lỗi khác
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    console.info('ℹ️ Bảng seating_arrangements chưa tồn tại. Sử dụng localStorage.');
                    supabaseAvailable = false;
                    showSaveNotification('Đã lưu vào localStorage', true);
                } else {
                    console.warn('⚠️ Lỗi khi lưu vào Supabase:', error.message || error);
                    showSaveNotification('Đã lưu vào localStorage', true);
                }
            }
        } else {
            showSaveNotification('Đã lưu vào localStorage', true);
        }
    }

    /**
     * Hiển thị thông báo lưu
     */
    function showSaveNotification(message, isSuccess) {
        // Tạo hoặc cập nhật notification
        let notif = document.getElementById('saveNotification');
        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'saveNotification';
            notif.className = 'fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
            document.body.appendChild(notif);
        }
        
        notif.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${isSuccess ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`;
        notif.innerHTML = `
            <i class="fa-solid ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            <span>${message}</span>
        `;
        
        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transition = 'opacity 0.3s';
            setTimeout(() => notif.remove(), 300);
        }, 2000);
    }

    /**
     * Tìm user từ danh sách users để suggest
     */
    function findUserByName(name) {
        if (!name || usersList.length === 0) return null;
        const lowerName = name.toLowerCase().trim();
        return usersList.find(u => 
            u.name && u.name.toLowerCase().includes(lowerName) ||
            lowerName.includes(u.name ? u.name.toLowerCase() : '')
        );
    }

    // Auto-save khi có thay đổi (debounce)
    let saveTimeout = null;
    function scheduleAutoSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveSeatingData();
        }, 2000); // Auto-save sau 2 giây không có thay đổi
    }

    // Thêm nút Save vào header
    function addSaveButton() {
        const header = document.querySelector('header .flex.items-center.gap-3');
        if (header && !document.getElementById('saveSeatingBtn')) {
            const saveBtn = document.createElement('button');
            saveBtn.id = 'saveSeatingBtn';
            saveBtn.className = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2';
            saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i><span class="hidden md:inline">Lưu</span>';
            saveBtn.addEventListener('click', () => {
                saveSeatingData();
            });
            header.insertBefore(saveBtn, header.firstChild);
        }
    }

    // Note: Các hàm addPerson, editPerson, removePerson, form submit, và grid controls
    // đã được cập nhật ở trên để gọi scheduleAutoSave()

    // Setup color filter
    function setupColorFilter() {
        const filter = document.getElementById('colorFilter');
        if (!filter) return;

        // Update filter options based on colorMap
        filter.innerHTML = '<option value="">Tất cả màu</option>';
        Object.entries(colorMap).forEach(([dept, color]) => {
            const option = document.createElement('option');
            option.value = color;
            option.textContent = `${dept} (${color})`;
            option.style.backgroundColor = color;
            filter.appendChild(option);
        });

        filter.onchange = () => {
            // Re-render all cells to apply filter
            const grid = document.getElementById('seatingGrid');
            if (grid) {
                grid.querySelectorAll('.seat-cell').forEach(cell => {
                    const key = cell.dataset.key;
                    if (key) renderCell(cell, key);
                });
            }
        };
    }

    // Quản lý màu
    document.getElementById('manageColorsBtn')?.addEventListener('click', () => {
        showColorManageModal();
    });

    function showColorManageModal() {
        const modal = document.getElementById('colorManageModal');
        const list = document.getElementById('colorManageList');
        if (!modal || !list) return;

        // Lấy tất cả departments
        const allDepts = [...new Set([
            ...departmentsList,
            ...Object.values(seatingData).map(p => p.department).filter(Boolean),
            ...Object.keys(colorMap)
        ])];

        list.innerHTML = allDepts.map(dept => {
            const currentColor = colorMap[dept] || defaultColors[dept] || '#94a3b8';
            return `
                <div class="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div class="flex-1">
                        <div class="font-medium text-slate-700 dark:text-gray-200">${dept}</div>
                    </div>
                    <input type="color" value="${currentColor}" data-dept="${dept}" class="w-12 h-8 rounded border-2 border-slate-300 dark:border-slate-600 cursor-pointer color-picker">
                    <button onclick="clearColor('${dept}')" class="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600">
                        <i class="fa-solid fa-times"></i> Xóa
                    </button>
                </div>
            `;
        }).join('');

        // Add event listeners for color pickers
        list.querySelectorAll('.color-picker').forEach(picker => {
            picker.addEventListener('change', (e) => {
                const dept = e.target.dataset.dept;
                const color = e.target.value;
                colorMap[dept] = color;
                setupColorFilter();
                // Re-render grid
                const grid = document.getElementById('seatingGrid');
                if (grid) {
                    grid.querySelectorAll('.seat-cell').forEach(cell => {
                        const key = cell.dataset.key;
                        if (key) renderCell(cell, key);
                    });
                }
                scheduleAutoSave();
            });
        });

        modal.classList.remove('hidden');
    }

    window.clearColor = function(dept) {
        delete colorMap[dept];
        setupColorFilter();
        showColorManageModal(); // Refresh modal
        // Re-render grid
        const grid = document.getElementById('seatingGrid');
        if (grid) {
            grid.querySelectorAll('.seat-cell').forEach(cell => {
                const key = cell.dataset.key;
                if (key) renderCell(cell, key);
            });
        }
        scheduleAutoSave();
    };

    // Modal functions - thay thế alert/confirm
    function showAlert(title, message) {
        const modal = document.getElementById('alertModal');
        const titleEl = document.getElementById('alertModalTitle');
        const messageEl = document.getElementById('alertModalMessage');
        const okBtn = document.getElementById('alertModalOk');
        
        if (modal && titleEl && messageEl && okBtn) {
            titleEl.textContent = title;
            messageEl.textContent = message;
            modal.classList.remove('hidden');
            
            okBtn.onclick = () => {
                modal.classList.add('hidden');
            };
        }
    }

    function showConfirm(title, message, onConfirm, onCancel) {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmModalTitle');
        const messageEl = document.getElementById('confirmModalMessage');
        const okBtn = document.getElementById('confirmModalOk');
        const cancelBtn = document.getElementById('confirmModalCancel');
        
        if (modal && titleEl && messageEl && okBtn && cancelBtn) {
            titleEl.textContent = title;
            messageEl.textContent = message;
            modal.classList.remove('hidden');
            
            // Remove old listeners
            const newOkBtn = okBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            newOkBtn.onclick = () => {
                modal.classList.add('hidden');
                if (onConfirm) onConfirm();
            };
            
            newCancelBtn.onclick = () => {
                modal.classList.add('hidden');
                if (onCancel) onCancel();
            };
        }
    }

    // Handle window resize - CSS Grid với 1fr sẽ tự động điều chỉnh, không cần tính lại
    // Không cần resize handler vì gridTemplateColumns: repeat(${cols}, 1fr) tự động responsive

    // Initialize
    addSaveButton();
    setupColorFilter();
    // initGrid() sẽ được gọi trong loadSeatingFromSupabase hoặc loadSeatingFromLocalStorage
});

