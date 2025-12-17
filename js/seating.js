document.addEventListener('DOMContentLoaded', async () => {
    // Trang sắp xếp chỗ ngồi - có thể dùng Supabase nếu có, nhưng vẫn hoạt động offline

    let rows = 5;
    let cols = 6;
    let seatingData = {}; // Lưu dữ liệu: { "row-col": { name, department, notes, user_id? } }
    let currentEditingCell = null;
    let sortableInstance = null;
    let supabaseAvailable = false;
    let usersList = []; // Danh sách users từ Supabase để suggest

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
        
        // Auto-save after drag & drop
        scheduleAutoSave();
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
            scheduleAutoSave();
        }
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

        seatingData[currentEditingCell] = {
            name: name,
            department: department,
            notes: document.getElementById('personNotes').value.trim(),
            user_id: matchedUser ? matchedUser.id : null
        };

        const cell = document.querySelector(`[data-key="${currentEditingCell}"]`);
        if (cell) renderCell(cell, currentEditingCell);

        document.getElementById('personModal').classList.add('hidden');
        currentEditingCell = null;

        // Auto-save
        scheduleAutoSave();
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
            scheduleAutoSave();
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

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }

            if (data && data.layout_data) {
                const layout = JSON.parse(data.layout_data);
                seatingData = layout.seatingData || {};
                rows = layout.rows || 5;
                cols = layout.cols || 6;
                
                document.getElementById('rowsInput').value = rows;
                document.getElementById('colsInput').value = cols;
                
                initGrid();
                console.log('✅ Đã tải seating từ Supabase');
            } else {
                // Không có data trên Supabase, thử load từ localStorage
                loadSeatingFromLocalStorage();
            }
        } catch (error) {
            console.warn('Không thể tải seating từ Supabase:', error);
            loadSeatingFromLocalStorage();
        }
    }

    /**
     * Load seating data từ localStorage (fallback)
     */
    function loadSeatingFromLocalStorage() {
        try {
            const saved = localStorage.getItem('seating_data');
            if (saved) {
                const data = JSON.parse(saved);
                seatingData = data.seatingData || {};
                rows = data.rows || 5;
                cols = data.cols || 6;
                
                document.getElementById('rowsInput').value = rows;
                document.getElementById('colsInput').value = cols;
                
                initGrid();
                console.log('✅ Đã tải seating từ localStorage');
            } else {
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

                if (error) throw error;
                console.log('✅ Đã lưu seating vào Supabase');
                showSaveNotification('Đã lưu vào Supabase', true);
            } catch (error) {
                console.error('Lỗi khi lưu vào Supabase:', error);
                showSaveNotification('Đã lưu vào localStorage (Supabase lỗi)', false);
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

    // Initialize
    addSaveButton();
    // initGrid() sẽ được gọi trong loadSeatingFromSupabase hoặc loadSeatingFromLocalStorage
});

