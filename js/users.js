document.addEventListener('DOMContentLoaded', () => {
    console.log("Users JS đã chạy!"); // Kiểm tra trong Console

    // =================================================================
    // CONFIG & STATE (Sử dụng chung với script.js)
    // =================================================================
    const STORAGE_KEY_ASSETS = 'it_assets_final';
    const STORAGE_KEY_USERS = 'it_users_final'; // Thêm key cho users
    const STORAGE_KEY_DEPARTMENTS = 'it_departments_final';

    // 1. KIỂM TRA ID TRANG
    const usersContent = document.getElementById('usersContent');
    if (!usersContent) return;

    // 2. KHAI BÁO CÁC ELEMENT
    const userTableBody = document.getElementById('userTableBody');
    const searchInput = document.getElementById('searchUserInput'); // Sửa ID cho đúng với users.html
    const filterDept = document.getElementById('filterDepartment');
    const addUserBtn = document.getElementById('addUserBtn');


    // Modals
    const addUserModal = document.getElementById('addUserModal');
    const userForm = document.getElementById('userForm');
    const modalTitle = document.getElementById('modalTitle');
    const assetDetailsModal = document.getElementById('assetDetailsModal');
    const assetTableBody = document.getElementById('userDetail_AssetTableBody');

    // Department Management Elements
    const manageDeptsBtn = document.getElementById('manageDeptsBtn');
    const departmentManagementModal = document.getElementById('departmentManagementModal');
    const closeDeptModal = document.getElementById('closeDeptModal');
    const departmentForm = document.getElementById('departmentForm');
    const deptModalTitle = document.getElementById('deptModalTitle');
    const departmentListContainer = document.getElementById('departmentListContainer');
    const cancelDeptEdit = document.getElementById('cancelDeptEdit');

    // Generic Modals
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const infoModal = document.getElementById('infoModal');

    // --- Dirty Form Check ---
    let isUserFormDirty = false;
    let isDeptFormDirty = false;
    let modalToClose = null; // Biến tạm để lưu modal cần đóng

    // 3. DỮ LIỆU MẪU (MOCK DATA)
    // Lưu ý: Avatar dùng dịch vụ online, nếu mất mạng sẽ hiện ô vuông
    const defaultUsers = [
        {
            id: 1,
            avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=random',
            name: 'Nguyễn Văn An',
            email: 'an.nguyen@company.com',
            department: 'IT',
            status: 'Đang hoạt động',
        },
        {
            id: 2,
            avatar: 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=random',
            name: 'Trần Thị Bích',
            email: 'bich.tran@company.com',
            department: 'Sales',
            status: 'Đang hoạt động'
        },
        {
            id: 3,
            avatar: 'https://ui-avatars.com/api/?name=Le+Minh+C&background=random',
            name: 'Lê Minh Cường',
            email: 'cuong.le@company.com',
            department: 'Marketing',
            status: 'Tạm nghỉ'
        }
    ];

    const defaultDepartments = [
        { id: 1, name: 'IT' },
        { id: 2, name: 'Sales' },
        { id: 3, name: 'Marketing' },
        { id: 4, name: 'Human Resources' }
    ];

    // --- Tải dữ liệu từ Local Storage hoặc dùng dữ liệu mẫu ---
    const loadData = (key, defaultValue) => {
        const storedData = localStorage.getItem(key);
        try {
            const parsed = JSON.parse(storedData);
            return (Array.isArray(parsed) && parsed.length > 0) ? parsed : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    };

    let users = loadData(STORAGE_KEY_USERS, defaultUsers);
    let departments = loadData(STORAGE_KEY_DEPARTMENTS, defaultDepartments);
    let assets = loadData(STORAGE_KEY_ASSETS, []);
    
    // --- Lưu dữ liệu vào Local Storage ---
    const saveUsers = () => localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    const saveDepartments = () => localStorage.setItem(STORAGE_KEY_DEPARTMENTS, JSON.stringify(departments));
    const saveAssets = () => localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(assets));

    // Cập nhật lại dữ liệu tài sản khi cần
    const reloadAssets = () => {
        assets = loadData(STORAGE_KEY_ASSETS, []);
    }

    // 4. HÀM RENDER (VẼ BẢNG)
    const renderUserTable = (data = users) => {
        if (!userTableBody) return;
        userTableBody.innerHTML = '';

        reloadAssets(); // Tải lại dữ liệu tài sản một lần duy nhất
        
        if (data.length === 0) {
            userTableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500">Không tìm thấy dữ liệu.</td></tr>`;
            return;
        }

        data.forEach(user => {
            // Đếm số thiết bị mà người dùng này đang sở hữu từ danh sách tài sản
            const deviceCount = assets.filter(asset => asset.user === user.name && asset.status === 'Active').length;

            const statusClass = user.status === 'Đang hoạt động' ? 'bg-green-100 text-green-800' : 
                                (user.status === 'Tạm nghỉ' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800');
            
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors';
            row.dataset.id = user.id; // Thêm data-id vào thẻ <tr> để dễ dàng lấy thông tin
            
            // Render nội dung hàng
            row.insertAdjacentHTML('beforeend', `
                <td class="p-4">
                    <div class="flex items-center">
                        <img src="${user.avatar}" alt="${user.name}" class="h-10 w-10 rounded-full border border-slate-200 object-cover">
                        <div class="ml-3">
                            <p class="font-semibold text-slate-800">${user.name}</p>
                            <p class="text-sm text-slate-500">${user.email}</p>
                        </div>
                    </div>
                </td>
                <td class="p-4 text-slate-600">${user.department}</td>
                <td class="p-4">
                    <span class="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-bold">
                        ${deviceCount} Thiết bị
                    </span>
                </td>
                <td class="p-4">
                    <span class="px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${user.status}
                    </span>
                </td>
                <td class="p-4 flex gap-2">
                    <button data-action="edit" data-id="${user.id}" title="Sửa thông tin nhân viên" class="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                        Sửa
                    </button>
                    <button data-action="view" data-id="${user.id}" title="Xem danh sách thiết bị đang giữ" class="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-medium text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Chi tiết
                    </button>
                    <button data-action="delete" data-id="${user.id}" title="Xóa nhân viên này" class="flex items-center gap-1 text-red-600 hover:text-red-800 font-medium text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Xóa
                    </button>
                </td>`);
            userTableBody.appendChild(row);
        });
    };

    // 4.1 HÀM RENDER PHÒNG BAN
    const updateDepartmentDropdowns = () => {
        const dropdowns = [filterDept, document.getElementById('department')];
        dropdowns.forEach(dropdown => {
            if (!dropdown) return;
            const currentValue = dropdown.value;
            dropdown.innerHTML = dropdown.id === 'filterDepartment' ? '<option value="">Tất cả phòng ban</option>' : '';
            departments.forEach(dept => {
                dropdown.innerHTML += `<option value="${dept.name}">${dept.name}</option>`;
            });
            dropdown.value = currentValue;
        });
    };

    const renderDepartmentList = () => {
        if (!departmentListContainer) return;
        departmentListContainer.innerHTML = '';
        if (departments.length === 0) {
            departmentListContainer.innerHTML = `<div class="p-4 text-center text-slate-500">Chưa có phòng ban nào.</div>`;
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'divide-y divide-slate-200';
        departments.forEach(dept => {
            const li = document.createElement('li');
            li.className = 'p-3 flex justify-between items-center';
            li.innerHTML = `
                <span class="text-slate-700">${dept.name}</span>
                <div class="flex gap-3">
                    <button data-action="edit-dept" data-id="${dept.id}" class="text-blue-600 hover:text-blue-800 text-sm">Sửa</button>
                    <button data-action="delete-dept" data-id="${dept.id}" class="text-red-600 hover:text-red-800 text-sm">Xóa</button>
                </div>
            `;
            ul.appendChild(li);
        });
        departmentListContainer.appendChild(ul);
    };

    const resetDeptForm = () => {
        departmentForm.reset();
        document.getElementById('deptId').value = '';
        deptModalTitle.textContent = 'Quản lý phòng ban';
        document.getElementById('deptName').placeholder = 'Tên phòng ban mới';
        cancelDeptEdit.classList.add('hidden');
    };

    // 5. CÁC HÀM XỬ LÝ KHÁC
    const filterUsers = () => {
        const term = searchInput ? searchInput.value.toLowerCase() : '';
        const dept = filterDept ? filterDept.value : '';
        const filtered = users.filter(u => 
            (u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)) &&
            (dept === '' || u.department.toLowerCase() === dept.toLowerCase())
        );
        renderUserTable(filtered);
    };

    const toggleModal = (modal, show) => {
        if (!modal) return;
        if(show) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
        else { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    };

    // --- Logic đóng Modal an toàn (Dirty Check) ---
    const attemptCloseModal = (modal) => {
        if (!modal || modal.classList.contains('hidden')) return;

        let isDirty = false;
        if (modal.id === 'addUserModal' && isUserFormDirty) {
            isDirty = true;
        } else if (modal.id === 'departmentManagementModal' && isDeptFormDirty) {
            isDirty = true;
        }

        if (isDirty) {
            modalToClose = modal;
            const dirtyModal = document.getElementById('dirtyCheckConfirmModal');
            if (dirtyModal) toggleModal(dirtyModal, true);
            return; // Dừng lại, chờ xác nhận
        }

        // Nếu không dirty, đóng và reset bình thường
        toggleModal(modal, false);
        if (modal.id === 'addUserModal') { userForm.reset(); isUserFormDirty = false; }
        if (modal.id === 'departmentManagementModal') { departmentForm.reset(); isDeptFormDirty = false; }
    };

    // --- Hàm xử lý Modal xác nhận và thông báo ---
    let confirmCallback = null;

    const showConfirmationModal = (message, onConfirm) => {
        document.getElementById('confirmationModalMessage').textContent = message;
        toggleModal(confirmationModal, true);
        confirmCallback = onConfirm;
    };

    const showInfoModal = (message, title = "Thông báo") => {
        document.getElementById('infoModalTitle').textContent = title;
        document.getElementById('infoModalMessage').textContent = message;
        toggleModal(infoModal, true);
    };

    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback();
        }
        toggleModal(confirmationModal, false);
        confirmCallback = null;
    });

    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => {
        toggleModal(confirmationModal, false);
        confirmCallback = null;
    });
    
    if(document.getElementById('closeInfoModalBtn')) document.getElementById('closeInfoModalBtn').addEventListener('click', () => toggleModal(infoModal, false));

    // --- Lắng nghe sự kiện thay đổi trên các form ---
    if (userForm) userForm.addEventListener('input', () => { isUserFormDirty = true; });
    if (departmentForm) departmentForm.addEventListener('input', () => { isDeptFormDirty = true; });

    // --- Xử lý modal xác nhận "Dirty Check" ---
    const btnConfirmClose = document.getElementById('btnConfirmClose');
    const btnCancelClose = document.getElementById('btnCancelClose');
    const dirtyCheckModal = document.getElementById('dirtyCheckConfirmModal');

    if (btnConfirmClose) btnConfirmClose.onclick = () => {
        if (modalToClose) {
            isUserFormDirty = false; // Reset cờ để cho phép đóng
            isDeptFormDirty = false;
            attemptCloseModal(modalToClose); // Gọi lại hàm đóng
        }
        toggleModal(dirtyCheckModal, false);
        modalToClose = null;
    };
    if (btnCancelClose) btnCancelClose.onclick = () => {
        toggleModal(dirtyCheckModal, false);
        modalToClose = null;
    };

    // --- Xử lý modal xác nhận "Dirty Check" ---
    const btnConfirmClose = document.getElementById('btnConfirmClose');
    const btnCancelClose = document.getElementById('btnCancelClose');
    const dirtyCheckModal = document.getElementById('dirtyCheckConfirmModal');
    // 6. SỰ KIỆN (EVENTS)
    if(searchInput) searchInput.addEventListener('input', filterUsers);
    if(filterDept) filterDept.addEventListener('change', filterUsers);

    if(addUserBtn) addUserBtn.addEventListener('click', () => {
        userForm.reset();
        isUserFormDirty = false; // Reset cờ khi mở form mới
        document.getElementById('userId').value = '';
        modalTitle.textContent = 'Thêm nhân viên mới';
        toggleModal(addUserModal, true);
    });

    // Đóng Modal
    const closeAdd = document.getElementById('closeAddUserModal');
    const cancelAdd = document.getElementById('cancelAddUser');
    const closeAsset = document.getElementById('closeAssetModal');
    
    if(assetDetailsModal) {
        assetDetailsModal.addEventListener('click', (e) => {
            handleAssetModalActions(e); // Xử lý nút thu hồi
            if (e.target === assetDetailsModal) attemptCloseModal(assetDetailsModal);
        });
    }
    if(closeAdd) closeAdd.onclick = () => attemptCloseModal(addUserModal);
    if(cancelAdd) cancelAdd.onclick = () => attemptCloseModal(addUserModal);
    if(closeAsset) closeAsset.onclick = () => attemptCloseModal(assetDetailsModal);

    // Mở/Đóng Modal Phòng ban
    if(manageDeptsBtn) manageDeptsBtn.addEventListener('click', () => {
        renderDepartmentList();
        resetDeptForm();
        isDeptFormDirty = false; // Reset cờ khi mở
        toggleModal(departmentManagementModal, true);
    });
    if(closeDeptModal) closeDeptModal.onclick = () => attemptCloseModal(departmentManagementModal);
    if(departmentManagementModal) {
        departmentManagementModal.addEventListener('click', (e) => {
            if (e.target === departmentManagementModal) {
                attemptCloseModal(departmentManagementModal);
            }
        });
    }

    // Submit Form
    if(userForm) {
        userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(userForm);
            const id = formData.get('userId') ? parseInt(formData.get('userId')) : null;
            const newData = {
                name: formData.get('name'),
                email: formData.get('email'),
                department: formData.get('department'),
                status: formData.get('status')
            };

            if(id) {
                const userIndex = users.findIndex(u => u.id === id);
                if(userIndex !== -1) {
                    const oldName = users[userIndex].name;
                    const newName = newData.name;

                    // Cập nhật thông tin người dùng
                    users[userIndex] = {...users[userIndex], ...newData};

                    // Nếu tên người dùng thay đổi, cập nhật tất cả tài sản liên quan
                    if (oldName !== newName) {
                        reloadAssets(); // Tải dữ liệu tài sản mới nhất
                        assets.forEach(asset => {
                            if (asset.user === oldName) asset.user = newName;
                        });
                        saveAssets(); // Lưu lại dữ liệu tài sản đã cập nhật
                    }
                }
            } else {
                const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
                users.push({ 
                    id: newId, 
                    avatar: `https://ui-avatars.com/api/?name=${newData.name}&background=random`, 
                    ...newData 
                });
            }
            isUserFormDirty = false; // Đã lưu thành công
            saveUsers();
            renderUserTable();
            toggleModal(addUserModal, false);
            if(searchInput) searchInput.value = '';
        });
    }

    // Click Table Actions
    if(userTableBody) {
        userTableBody.addEventListener('click', (e) => {
            const actionButton = e.target.closest('button[data-action]');
            const targetRow = e.target.closest('tr');

            if (!targetRow) return; // Bỏ qua nếu click không nằm trong hàng nào

            const userId = parseInt(targetRow.dataset.id);
            const user = users.find(u => u.id === userId);
            if (!user) return;

            // Ưu tiên xử lý nếu click vào nút hành động
            if (actionButton) {
                const action = actionButton.dataset.action;

                if (action === 'edit') {
                    document.getElementById('userId').value = user.id;
                    document.getElementById('name').value = user.name;
                    document.getElementById('email').value = user.email;
                    document.getElementById('department').value = user.department;
                    document.getElementById('status').value = user.status;
                    isUserFormDirty = false; // Reset cờ khi mở form sửa
                    modalTitle.textContent = 'Sửa thông tin';
                    toggleModal(addUserModal, true);
                    return; // Dừng lại sau khi xử lý
                }

                if (action === 'delete') {
                    reloadAssets();
                    const userAssetsCount = assets.filter(asset => asset.user === user.name && asset.status === 'Active').length;

                    if (userAssetsCount > 0) {
                        showInfoModal(`Không thể xóa người dùng "${user.name}" vì họ đang giữ ${userAssetsCount} tài sản.`);
                        return;
                    }

                    showConfirmationModal(`Bạn có chắc chắn muốn xóa người dùng "${user.name}"?`, () => {
                        users = users.filter(u => u.id !== userId);
                        saveUsers();
                        renderUserTable();
                    });
                    return; // Dừng lại sau khi xử lý
                }
                
                // Nếu là nút 'view' hoặc nút khác, vẫn cho phép hành động click hàng mặc định chạy
            }

            // Hành động mặc định khi click vào hàng (hoặc nút 'view'): Mở modal chi tiết
            document.getElementById('assetModalUserName').textContent = user.name;
            reloadAssets();
            const userAssets = assets.filter(asset => asset.user === user.name && asset.status === 'Active');
            assetTableBody.innerHTML = '';
            if (userAssets.length) {
                userAssets.forEach(d => {
                    assetTableBody.innerHTML += `
                        <tr class="border-b">
                            <td class="p-3">${d.name}</td>
                            <td class="p-3 font-mono text-sm">${d.serial}</td>
                            <td class="p-3">${d.category}</td>
                            <td class="p-3">${d.assignedDate || 'N/A'}</td>
                            <td class="p-3"><button data-action="recall-asset" data-serial="${d.serial}" data-user-id="${user.id}" class="px-3 py-1 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600">Thu hồi</button></td>
                        </tr>
                    `;
                });
            } else {
                assetTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">Người dùng này chưa được cấp tài sản.</td></tr>`;
            }
            toggleModal(assetDetailsModal, true);
        });
    }

    // Function to handle actions inside the Asset Details Modal
    function handleAssetModalActions(e) {
        const btn = e.target.closest('button[data-action="recall-asset"]');
        // Chỉ xử lý khi click vào nút thu hồi, không làm gì khi click vào các phần tử khác
        if (!btn) return;

        const serial = btn.dataset.serial;
        const userId = parseInt(btn.dataset.userId);

        showConfirmationModal(`Bạn có chắc chắn muốn thu hồi tài sản có số serial "${serial}"?`, () => {
            reloadAssets();
            const assetIndex = assets.findIndex(a => a.serial === serial);
            if (assetIndex !== -1) {
                assets[assetIndex].status = 'In-stock';
                assets[assetIndex].user = null;
                saveAssets();

                // Re-render the asset detail modal
                const user = users.find(u => u.id === userId);
                const userAssets = assets.filter(asset => asset.user === user.name && asset.status === 'Active');
                assetTableBody.innerHTML = ''; // Clear current list
                if (userAssets.length > 0) {
                     userAssets.forEach(d => {
                        assetTableBody.innerHTML += `
                            <tr class="border-b">
                                <td class="p-3">${d.name}</td>
                                <td class="p-3 font-mono text-sm">${d.serial}</td>
                                <td class="p-3">${d.category}</td>
                                <td class="p-3">${d.assignedDate || 'N/A'}</td>
                                <td class="p-3"><button data-action="recall-asset" data-serial="${d.serial}" data-user-id="${user.id}" class="px-3 py-1 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600">Thu hồi</button></td>
                            </tr>`;
                    });
                } else {
                    assetTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">Người dùng này chưa được cấp tài sản.</td></tr>`;
                }
                renderUserTable(); // Re-render the main user table to update device count
            }
        });
    }

    // Department Management Events
    if (departmentForm) {
        departmentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const deptNameInput = document.getElementById('deptName');
            const deptIdInput = document.getElementById('deptId');
            const name = deptNameInput.value.trim();
            const id = deptIdInput.value ? parseInt(deptIdInput.value) : null;

            if (!name) return;

            if (id) { // Editing
                const oldDept = departments.find(d => d.id === id);
                if (oldDept && oldDept.name !== name) {
                    const oldName = oldDept.name;
                    // Cập nhật tên trong mảng departments
                    oldDept.name = name;

                    // Cập nhật tên phòng ban cho tất cả user liên quan
                    users.forEach(user => {
                        if (user.department === oldName) {
                            user.department = name;
                        }
                    });
                    saveUsers(); // Lưu lại thay đổi của users
                    renderUserTable(); // Vẽ lại bảng user
                }
            } else { // Adding
                const newId = departments.length > 0 ? Math.max(...departments.map(d => d.id)) + 1 : 1;
                departments.push({ id: newId, name: name });
            }

            isDeptFormDirty = false; // Đã lưu thành công
            saveDepartments(); // Lưu danh sách phòng ban mới
            renderDepartmentList();
            updateDepartmentDropdowns();
            resetDeptForm();
        });
    }

    if (departmentListContainer) {
        departmentListContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const id = parseInt(btn.dataset.id);
            const action = btn.dataset.action;

            if (action === 'edit-dept') {
                const dept = departments.find(d => d.id === id);
                if (dept) {
                    document.getElementById('deptId').value = dept.id;
                    document.getElementById('deptName').value = dept.name;
                    deptModalTitle.textContent = 'Sửa phòng ban';
                    isDeptFormDirty = false; // Reset cờ khi mở form sửa
                    cancelDeptEdit.classList.remove('hidden');
                    document.getElementById('deptName').focus();
                }
            }

            if (action === 'delete-dept') {
                const deptToDelete = departments.find(d => d.id === id);
                const isDeptInUse = users.some(u => u.department === deptToDelete.name);

                if (isDeptInUse) {
                    showInfoModal(`Không thể xóa phòng ban "${deptToDelete.name}" vì đang có nhân viên thuộc phòng ban này.`);
                } else {
                    showConfirmationModal(`Bạn có chắc chắn muốn xóa phòng ban "${deptToDelete.name}"?`, () => {
                    departments = departments.filter(d => d.id !== id);
                    renderDepartmentList();
                    saveDepartments();
                    updateDepartmentDropdowns();
                    });
                }
            }
        });
    }

    if (cancelDeptEdit) cancelDeptEdit.addEventListener('click', resetDeptForm);

    // CHẠY LẦN ĐẦU
    renderUserTable();
    updateDepartmentDropdowns();
});