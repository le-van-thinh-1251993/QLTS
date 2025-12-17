document.addEventListener('DOMContentLoaded', async () => {
    // Trang sắp xếp chỗ ngồi không cần Supabase/auth

    let rows = 5;
    let cols = 6;
    let seatingData = {}; // Lưu dữ liệu: { "row-col": { name, department, notes } }
    let currentEditingCell = null;
    let sortableInstance = null;

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

    // Initialize grid
    function initGrid() {
        const grid = document.getElementById('seatingGrid');
        if (!grid) return;

        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${cols}, minmax(120px, 1fr))`;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                const key = `${r}-${c}`;
                cell.className = 'seat-cell min-h-[100px] border-2 border-slate-300 dark:border-slate-600 rounded-lg p-3 cursor-move bg-white dark:bg-slate-700 hover:border-blue-500 hover:shadow-md transition-all';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.dataset.key = key;
                cell.draggable = true;

                if (seatingData[key]) {
                    const person = seatingData[key];
                    cell.innerHTML = `
                        <div class="text-center">
                            <div class="font-semibold text-sm dark:text-gray-200">${person.name || ''}</div>
                            ${person.department ? `<div class="text-xs text-slate-500 dark:text-gray-400 mt-1">${person.department}</div>` : ''}
                            <button class="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400" onclick="editPerson('${key}')">
                                <i class="fa-solid fa-edit"></i>
                            </button>
                            <button class="mt-2 ml-2 text-xs text-red-600 hover:text-red-800 dark:text-red-400" onclick="removePerson('${key}')">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    `;
                    cell.classList.add('has-person');
                } else {
                    cell.innerHTML = `
                        <div class="text-center text-slate-400 dark:text-slate-500 h-full flex items-center justify-center">
                            <button onclick="addPerson('${key}')" class="text-xs">
                                <i class="fa-solid fa-plus"></i> Thêm
                            </button>
                        </div>
                    `;
                }

                // Drag and drop handlers
                cell.addEventListener('dragstart', handleDragStart);
                cell.addEventListener('dragover', handleDragOver);
                cell.addEventListener('drop', handleDrop);
                cell.addEventListener('dragend', handleDragEnd);

                grid.appendChild(cell);
            }
        }

        // Initialize SortableJS for better drag & drop
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        sortableInstance = new Sortable(grid, {
            animation: 150,
            handle: '.has-person',
            filter: '.seat-cell:not(.has-person)',
            draggable: '.has-person',
            onEnd: function(evt) {
                if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
                    const oldKey = evt.item.dataset.key;
                    const newCell = evt.item;
                    const newKey = `${newCell.dataset.row}-${newCell.dataset.col}`;
                    
                    if (seatingData[oldKey]) {
                        // Move person data
                        seatingData[newKey] = seatingData[oldKey];
                        delete seatingData[oldKey];
                        newCell.dataset.key = newKey;
                        renderCell(newCell, newKey);
                    }
                }
            }
        });
    }

    function renderCell(cell, key) {
        if (seatingData[key]) {
            const person = seatingData[key];
            cell.innerHTML = `
                <div class="text-center">
                    <div class="font-semibold text-sm dark:text-gray-200">${person.name || ''}</div>
                    ${person.department ? `<div class="text-xs text-slate-500 dark:text-gray-400 mt-1">${person.department}</div>` : ''}
                    <button class="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400" onclick="editPerson('${key}')">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="mt-2 ml-2 text-xs text-red-600 hover:text-red-800 dark:text-red-400" onclick="removePerson('${key}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            cell.classList.add('has-person');
        } else {
            cell.innerHTML = `
                <div class="text-center text-slate-400 dark:text-slate-500 h-full flex items-center justify-center">
                    <button onclick="addPerson('${key}')" class="text-xs">
                        <i class="fa-solid fa-plus"></i> Thêm
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
        if (!e.target.classList.contains('has-person')) {
            e.preventDefault();
            return;
        }
        draggedElement = e.target;
        const key = e.target.dataset.key;
        draggedData = seatingData[key] ? { ...seatingData[key] } : null;
        e.target.style.opacity = '0.5';
    }

    function handleDragOver(e) {
        e.preventDefault();
        if (draggedElement && e.target.classList.contains('seat-cell')) {
            e.target.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        if (!draggedElement || !draggedData) return;

        const targetCell = e.target.closest('.seat-cell');
        if (!targetCell || !targetCell.classList.contains('seat-cell')) return;

        const oldKey = draggedElement.dataset.key;
        const newKey = targetCell.dataset.key;

        // Remove from old position
        delete seatingData[oldKey];
        renderCell(draggedElement, oldKey);

        // Add to new position
        seatingData[newKey] = draggedData;
        renderCell(targetCell, newKey);

        // Reset styles
        targetCell.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
    }

    function handleDragEnd(e) {
        e.target.style.opacity = '1';
        draggedElement = null;
        draggedData = null;
    }

    // Global functions for inline onclick handlers
    window.addPerson = function(key) {
        currentEditingCell = key;
        document.getElementById('personName').value = '';
        document.getElementById('personDepartment').value = '';
        document.getElementById('personNotes').value = '';
        document.getElementById('personModalTitle').textContent = 'Thêm người';
        document.getElementById('personModal').classList.remove('hidden');
    };

    window.editPerson = function(key) {
        currentEditingCell = key;
        const person = seatingData[key] || {};
        document.getElementById('personName').value = person.name || '';
        document.getElementById('personDepartment').value = person.department || '';
        document.getElementById('personNotes').value = person.notes || '';
        document.getElementById('personModalTitle').textContent = 'Chỉnh sửa người';
        document.getElementById('personModal').classList.remove('hidden');
    };

    window.removePerson = function(key) {
        if (confirm('Bạn có chắc chắn muốn xóa người này?')) {
            delete seatingData[key];
            const cell = document.querySelector(`[data-key="${key}"]`);
            if (cell) renderCell(cell, key);
        }
    };

    // Person form submit
    document.getElementById('personForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentEditingCell) return;

        const name = document.getElementById('personName').value.trim();
        if (!name) {
            alert('Vui lòng nhập tên');
            return;
        }

        seatingData[currentEditingCell] = {
            name: name,
            department: document.getElementById('personDepartment').value.trim(),
            notes: document.getElementById('personNotes').value.trim()
        };

        const cell = document.querySelector(`[data-key="${currentEditingCell}"]`);
        if (cell) renderCell(cell, currentEditingCell);

        document.getElementById('personModal').classList.add('hidden');
        currentEditingCell = null;
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
    });

    document.getElementById('addRowBtn')?.addEventListener('click', () => {
        rows++;
        document.getElementById('rowsInput').value = rows;
        initGrid();
    });

    document.getElementById('addColBtn')?.addEventListener('click', () => {
        cols++;
        document.getElementById('colsInput').value = cols;
        initGrid();
    });

    // Import Excel
    document.getElementById('importExcelInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

            // Parse Excel data
            seatingData = {};
            let maxRow = 0;
            let maxCol = 0;

            jsonData.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell && typeof cell === 'string' && cell.trim()) {
                        const key = `${r}-${c}`;
                        // Try to parse cell as "Name | Department | Notes"
                        const parts = cell.split('|').map(s => s.trim());
                        seatingData[key] = {
                            name: parts[0] || '',
                            department: parts[1] || '',
                            notes: parts[2] || ''
                        };
                        maxRow = Math.max(maxRow, r + 1);
                        maxCol = Math.max(maxCol, c + 1);
                    }
                });
            });

            // Update grid size if needed
            if (maxRow > 0 || maxCol > 0) {
                rows = Math.max(rows, maxRow);
                cols = Math.max(cols, maxCol);
                document.getElementById('rowsInput').value = rows;
                document.getElementById('colsInput').value = cols;
            }

            initGrid();
            alert('Import thành công!');
        } catch (error) {
            console.error('Import error:', error);
            alert('Lỗi khi import file Excel: ' + error.message);
        }

        e.target.value = '';
    });

    document.getElementById('importExcelBtn')?.addEventListener('click', () => {
        document.getElementById('importExcelInput').click();
    });

    // Export Excel
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
        try {
            // Create 2D array for Excel
            const excelData = [];
            for (let r = 0; r < rows; r++) {
                const row = [];
                for (let c = 0; c < cols; c++) {
                    const key = `${r}-${c}`;
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

            // Set column widths
            const colWidths = [];
            for (let c = 0; c < cols; c++) {
                colWidths.push({ wch: 20 });
            }
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, 'Sơ đồ chỗ ngồi');

            // Export
            const fileName = `So_do_cho_ngoi_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            alert('Export thành công!');
        } catch (error) {
            console.error('Export error:', error);
            alert('Lỗi khi export file Excel: ' + error.message);
        }
    });

    // Initialize on load
    initGrid();
});

