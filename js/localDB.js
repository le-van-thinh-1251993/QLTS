// LocalDB - localStorage wrapper thay thế Supabase
// Quản lý tất cả data local cho hệ thống QLTS

const LocalDB = {
    // Storage keys
    KEYS: {
        ASSETS: 'qlts_assets',
        LICENSES: 'qlts_licenses',
        USERS: 'qlts_users',
        DEPARTMENTS: 'qlts_departments',
        CATEGORIES: 'qlts_categories',
        LICENSE_TYPES: 'qlts_license_types',
        ASSET_HISTORY: 'qlts_asset_history',
        MAINTENANCE_TASKS: 'qlts_maintenance_tasks',
        MAINTENANCE_EVENTS: 'qlts_maintenance_events',
        STOCK_CHECKS: 'qlts_stock_checks',
        STOCK_CHECK_ITEMS: 'qlts_stock_check_items',
        SUPPLIERS: 'qlts_suppliers',
        SUPPLIES: 'qlts_supplies',
        SUPPLY_TRANSACTIONS: 'qlts_supply_transactions',
        ALERT_SETTINGS: 'qlts_alert_settings',
        WORKBOOK_DATA: 'qlts_workbook_data',
        COUNTER: 'qlts_id_counter'
    },

    buildUserAvatar(name) {
        const label = (name || 'User').toString().trim() || 'User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=random`;
    },

    normalizeUserRecord(user) {
        if (!user || typeof user !== 'object') return user;
        const normalized = { ...user };
        const fallbackName = normalized.full_name || normalized.name || normalized.email || 'User';
        if (!normalized.avatar || normalized.avatar === 'undefined') {
            normalized.avatar = this.buildUserAvatar(fallbackName);
        }
        return normalized;
    },

    LEGACY_KEYS: {
        ASSETS: 'it_assets_final',
        LICENSES: 'it_licenses_final',
        USERS: 'it_users_final',
        DEPARTMENTS: 'it_departments_final',
        CATEGORIES: 'it_categories_final'
    },

    // Initialize imported workbook data before the app reads any tables.
    async init() {
        console.log('LocalDB.init() called');
        console.log('Checking for existing data...', localStorage.getItem(this.KEYS.DEPARTMENTS));

        await this.importWorkbookDataIfNeeded();

        this.migrateLegacyDataIfNeeded();
        this.seedClipStudioPaintKeys();
        this.deduplicateUsers();

        // Check if data exists, if not create default data
        if (!localStorage.getItem(this.KEYS.DEPARTMENTS)) {
            console.log('No existing data found, creating default data...');
            this.setDefaultData();
        } else {
            console.log('Existing data found, skipping default data creation');
            this.ensureSeedData();
        }
        this.seedSuppliesIfNeeded();
    },

    async importWorkbookDataIfNeeded() {
        const importFlag = 'qlts_workbook_imported_v8';
        if (localStorage.getItem(importFlag) === '1') return;
        if (typeof XLSX === 'undefined') {
            console.warn('Workbook import skipped: XLSX library is not loaded');
            return;
        }

        try {
            const response = await fetch(encodeURI('TÀI SẢN_THIẾT BỊ MÁY MÓC.xlsx'));
            if (!response.ok) throw new Error(`Workbook request failed: ${response.status}`);
            const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array', cellDates: false, raw: false });
            const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
            const clean = (value) => String(value ?? '').replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n').trim();
            const getRows = (sheetName) => XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
            const findHeader = (rows, headerNames = ['ma ts', 'ma tai san']) => rows.findIndex(row => row.some(cell => headerNames.includes(normalize(cell))));
            const sourceSheetName = ['02. TS máy móc thiết bị', '04. TH THEO LOẠI TS', '03. Chi tiết TS các bộ phận'].find(name => workbook.SheetNames.includes(name));
            if (!sourceSheetName) throw new Error('Không tìm thấy sheet chi tiết tài sản');

            const workbookSheets = {};
            workbook.SheetNames.forEach(sheetName => {
                const rows = getRows(sheetName);
                workbookSheets[sheetName] = rows;
            });

            const sourceRows = getRows(sourceSheetName);
            const headerIndex = findHeader(sourceRows);
            if (headerIndex < 0) throw new Error(`Không tìm thấy dòng tiêu đề trong sheet ${sourceSheetName}`);
            const headers = sourceRows[headerIndex].map((header, index) => clean(header) || `Cột ${index + 1}`);
            const records = sourceRows.slice(headerIndex + 1).map(row => {
                const record = {};
                headers.forEach((header, index) => { record[header] = clean(row[index]); });
                return record;
            });
            const findField = (record, ...names) => {
                if (!record) return '';
                const entry = Object.entries(record).find(([key]) => names.includes(normalize(key)));
                return entry ? entry[1] : '';
            };
            const parseSheetRecords = (sheetName, headerNames) => {
                if (!workbook.SheetNames.includes(sheetName)) return [];
                const rows = getRows(sheetName);
                const index = findHeader(rows, headerNames);
                if (index < 0) return [];
                const sheetHeaders = rows[index].map((header, columnIndex) => clean(header) || `Cột ${columnIndex + 1}`);
                return rows.slice(index + 1).map(row => {
                    const record = {};
                    sheetHeaders.forEach((header, columnIndex) => { record[header] = clean(row[columnIndex]); });
                    return record;
                }).filter(record => Object.values(record).some(Boolean));
            };
            const detailRecords = parseSheetRecords('03. Chi tiết TS các bộ phận', ['ma ts', 'ma tai san']);
            const detailByCode = new Map(detailRecords.map(record => [normalize(findField(record, 'ma ts', 'ma tai san')), record]));
            const personnelSheetName = '6. data thông tin nhân sự';
            const personnelRows = workbook.SheetNames.includes(personnelSheetName) ? getRows(personnelSheetName) : [];
            const personnelHeaderIndex = findHeader(personnelRows, ['ma nhan vien', 'ho ten']);
            const personnelHeaders = personnelHeaderIndex >= 0 ? personnelRows[personnelHeaderIndex].map((header, index) => clean(header) || `Cột ${index + 1}`) : [];
            const personnelRecords = personnelHeaderIndex >= 0 ? personnelRows.slice(personnelHeaderIndex + 1).map(row => {
                const record = {};
                personnelHeaders.forEach((header, index) => { record[header] = clean(row[index]); });
                return record;
            }).filter(record => findField(record, 'ma nhan vien') || findField(record, 'ho ten')) : [];
            const assetRecords = records.filter(record => {
                const code = findField(record, 'ma ts', 'ma tai san');
                const name = findField(record, 'ten tai san');
                const normalizedCode = normalize(code);
                const isInternalComponent = /^(r|ram|vga|gpu|cpu|ng|psu|nguon|oc|hdd|ssd)\d*/.test(normalizedCode);
                return (code || name) && !isInternalComponent;
            });
            const now = new Date().toISOString();
            const getAssetType = (code, name) => {
                const value = normalize(code || name);
                if (/^mh/.test(value) || value.includes('man hinh')) return 'Màn hình';
                if (/^bp/.test(value) || value.includes('ban phim')) return 'Bàn phím';
                if (/^ch/.test(value) || value.includes('chuot')) return 'Chuột';
                if (/^(pc|r|ram|oc|hdd|ssd|vga|cpu|ng|psu|nguon)/.test(value)) return 'PC';
                if (/^(lt|laptop)/.test(value) || value.includes('laptop')) return 'Laptop';
                if (value.includes('dien thoai')) return 'Điện thoại';
                if (value.includes('may in')) return 'Máy in';
                return clean(name) || 'Khác';
            };
            const categoryNames = [...new Set(assetRecords.map(record => getAssetType(findField(record, 'ma ts', 'ma tai san'), findField(record, 'ten tai san'))))];
            const categories = categoryNames.map((name, index) => ({ id: index + 1, name, created_at: now }));
            const departmentNames = [...new Set(personnelRecords.map(record => findField(record, 'bo phan')).filter(Boolean))];
            const departments = departmentNames.map((name, index) => ({ id: index + 1, name, created_at: now }));
            const assetUserNames = assetRecords.map(record => findField(record, 'ho ten nhan vien dang sd', 'ho ten nhan vien sd gan nhat', 'nguoi su dung')).filter(Boolean);
            const personnelUserNames = personnelRecords.map(record => findField(record, 'ho ten')).filter(Boolean);
            const userNames = [...new Set([...assetUserNames, ...personnelUserNames])];
            const users = userNames.map((name, index) => {
                const record = personnelRecords.find(item => findField(item, 'ho ten') === name) || assetRecords.find(item => findField(item, 'ho ten nhan vien dang sd', 'ho ten nhan vien sd gan nhat', 'nguoi su dung') === name);
                const departmentName = findField(record, 'bo phan');
                return {
                    id: index + 1,
                    name,
                    employee_code: findField(record, 'ma nhan vien'),
                    email: findField(record, 'email cong ty'),
                    department_id: departments.find(department => normalize(department.name) === normalize(departmentName))?.id || null,
                    status: normalize(findField(record, 'trang thai')).includes('nghi') ? 'Đã nghỉ việc' : 'Đang hoạt động',
                    avatar: this.buildUserAvatar(name),
                    source_data: record,
                    created_at: now
                };
            });
            const userIdByName = new Map(users.map(user => [normalize(user.name), user.id]));
            const statusMap = { 'dang su dung': 'Active', 'su dung': 'Active', 'ton kho': 'Stock', 'trong kho': 'Stock', 'hong': 'Broken', 'hong/ thanh ly': 'Disposed', 'hong/thanh ly': 'Disposed', 'ban thanh ly': 'Disposed', 'da thanh ly': 'Disposed' };
            const getStandardConfig = (code, name) => {
                const value = normalize(code || name);
                if (/^pc/.test(value)) return '- Chip: \n- Ram: \n- Card màn hình: \n- Ổ cứng:';
                if (/^(mh|man hinh)/.test(value)) return 'Màn hình máy tính';
                if (/^(ch|chuot)/.test(value)) return 'Chuột';
                if (/^(bp|ban phim)/.test(value)) return 'Bàn phím';
                if (/^(r|ram)/.test(value)) return 'RAM';
                if (/^(oc|hdd|ssd)/.test(value)) return 'Ổ cứng';
                if (/^(lt|laptop)/.test(value) || value.includes('laptop')) return 'Laptop';
                return '';
            };
            const assets = assetRecords.map((record, index) => {
                const code = findField(record, 'ma ts', 'ma tai san');
                const detail = detailByCode.get(normalize(code));
                const isPc = /^pc\d+/.test(normalize(code));
                const name = isPc ? code : (findField(record, 'ten tai san') || `Tài sản ${index + 1}`);
                const userName = findField(record, 'ho ten nhan vien dang sd', 'ho ten nhan vien sd gan nhat', 'nguoi su dung') || findField(detail, 'ho ten nhan vien dang sd', 'ho ten nhan vien sd gan nhat');
                const rawStatus = findField(record, 'trang thai tai san') || findField(detail, 'trang thai tai san');
                const assetType = getAssetType(code, name);
                const detailConfig = findField(detail, 'thong so ki thuat', 'thong so ky thuat');
                return {
                    id: index + 1,
                    asset_code: code || `TS-${String(index + 1).padStart(3, '0')}`,
                    name,
                    config: detailConfig || findField(record, 'thong so ki thuat', 'thong so ky thuat') || getStandardConfig(code, name),
                    category_id: categories.find(category => normalize(category.name) === normalize(assetType))?.id || null,
                    location: findField(record, 'vi tri'),
                    purchase_date: findField(record, 'ngay cap', 'ngay mua'),
                    user_id: userIdByName.get(normalize(userName)) || null,
                    status: statusMap[normalize(rawStatus)] || 'Stock',
                    notes: findField(record, 'ghi chu'),
                    unit: findField(record, 'don vi tinh'),
                    quantity: findField(record, 'so luong'),
                    brand: findField(record, 'hang mua'),
                    warranty_code: findField(record, 'ma so bao hanh'),
                    handover_code: findField(record, 'ma bien ban ban giao'),
                    source_data: record,
                    created_at: now
                };
            });
            const suppliers = [...new Set(assetRecords.map(record => findField(record, 'don vi mua', 'don vi cung cap')).filter(Boolean))].map((name, index) => ({ id: index + 1, name, created_at: now }));
            const licenseTypes = [];
            const emptyTables = { licenses: [], asset_history: [], maintenance_tasks: [], maintenance_events: [], stock_checks: [], stock_check_items: [], alert_settings: [] };
            Object.entries({ departments, categories, users, assets, suppliers, license_types: licenseTypes, ...emptyTables }).forEach(([table, data]) => {
                localStorage.setItem(this.KEYS[table.toUpperCase()], JSON.stringify(data));
            });
            localStorage.setItem(this.KEYS.WORKBOOK_DATA, JSON.stringify({ sourceSheet: sourceSheetName, sheets: workbookSheets, importedAt: now }));
            localStorage.setItem(this.KEYS.COUNTER, JSON.stringify({ assets: assets.length + 1, users: users.length + 1, departments: departments.length + 1, categories: categories.length + 1, suppliers: suppliers.length + 1, licenses: 1, license_types: 1, asset_history: 1, maintenance_tasks: 1, maintenance_events: 1, stock_checks: 1, stock_check_items: 1, alert_settings: 1 }));
            localStorage.setItem('qlts_seed_v2', '1');
            localStorage.setItem('qlts_csp_keys_seeded_v1', '1');
            localStorage.setItem(importFlag, '1');
            console.log(`LocalDB: Imported ${assets.length} assets from ${sourceSheetName}; preserved ${workbook.SheetNames.length} workbook sheets`);
        } catch (error) {
            console.error('LocalDB workbook import failed:', error);
        }
    },

    migrateLegacyDataIfNeeded() {
        const migratedFlag = 'qlts_migrated_from_legacy_v1';
        if (localStorage.getItem(migratedFlag) === '1') return;

        const safeRead = (key) => {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return [];
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        };

        const qltsAssets = safeRead(this.KEYS.ASSETS);
        const qltsUsers = safeRead(this.KEYS.USERS);
        const qltsDepartments = safeRead(this.KEYS.DEPARTMENTS);
        if (qltsAssets.length > 0 || qltsUsers.length > 0 || qltsDepartments.length > 0) {
            localStorage.setItem(migratedFlag, '1');
            return;
        }

        const legacyAssets = safeRead(this.LEGACY_KEYS.ASSETS);
        const legacyLicenses = safeRead(this.LEGACY_KEYS.LICENSES);
        const legacyUsers = safeRead(this.LEGACY_KEYS.USERS);
        const legacyDepartments = safeRead(this.LEGACY_KEYS.DEPARTMENTS);
        const legacyCategories = safeRead(this.LEGACY_KEYS.CATEGORIES);

        if (
            legacyAssets.length === 0 &&
            legacyLicenses.length === 0 &&
            legacyUsers.length === 0 &&
            legacyDepartments.length === 0 &&
            legacyCategories.length === 0
        ) {
            return;
        }

        const normalize = (value) =>
            (value || '')
                .toString()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();

        const now = new Date().toISOString();

        const departmentMap = new Map();
        const pushDept = (name) => {
            const normalized = normalize(name);
            if (!normalized) return;
            if (!departmentMap.has(normalized)) {
                departmentMap.set(normalized, {
                    id: departmentMap.size + 1,
                    name: name.toString().trim(),
                    created_at: now
                });
            }
        };

        legacyDepartments.forEach((d) => pushDept(d?.name || d?.department || d));
        legacyUsers.forEach((u) => pushDept(u?.department));

        const categoryMap = new Map();
        const pushCategory = (name) => {
            const normalized = normalize(name);
            if (!normalized) return;
            if (!categoryMap.has(normalized)) {
                categoryMap.set(normalized, {
                    id: categoryMap.size + 1,
                    name: name.toString().trim(),
                    created_at: now
                });
            }
        };

        legacyCategories.forEach((c) => pushCategory(c?.name || c?.category || c));
        legacyAssets.forEach((a) => pushCategory(a?.category || a?.category_name));

        const departments = Array.from(departmentMap.values());
        const categories = Array.from(categoryMap.values());

        const users = legacyUsers.map((u, index) => {
            const departmentName = (u?.department || '').toString().trim();
            const department = departments.find((d) => normalize(d.name) === normalize(departmentName));
            return {
                id: Number(u?.id) || index + 1,
                name: u?.name || u?.full_name || `User ${index + 1}`,
                email: u?.email || '',
                department_id: department?.id || null,
                status: u?.status || 'Active',
                created_at: u?.created_at || now
            };
        });

        const resolveUserId = (userValue) => {
            const normalized = normalize(userValue);
            if (!normalized) return null;
            const user = users.find((u) => normalize(u.name) === normalized);
            return user?.id || null;
        };

        const assets = legacyAssets.map((a, index) => {
            const categoryName = (a?.category || a?.category_name || '').toString().trim();
            const category = categories.find((c) => normalize(c.name) === normalize(categoryName));
            return {
                id: Number(a?.id) || index + 1,
                name: a?.name || a?.asset_name || `Asset ${index + 1}`,
                config: a?.config || a?.configuration || '',
                category_id: category?.id || null,
                location: a?.location || '',
                purchase_date: a?.purchase_date || a?.purchaseDate || null,
                user_id: resolveUserId(a?.user || a?.user_name),
                status: a?.status || 'Stock',
                notes: a?.notes || '',
                created_at: a?.created_at || now
            };
        });

        const licenses = legacyLicenses.map((l, index) => ({
            id: Number(l?.id) || index + 1,
            key_type: l?.key_type || l?.type || 'License',
            license_key: l?.license_key || l?.key || '',
            package_type: l?.package_type || l?.package || '',
            expiration_date: l?.expiration_date || l?.expiry_date || null,
            user_id: resolveUserId(l?.user || l?.user_name),
            status: l?.status || 'Active',
            notes: l?.notes || '',
            created_at: l?.created_at || now
        }));

        const licenseTypeSet = new Set();
        licenses.forEach((l) => {
            if ((l.key_type || '').trim()) licenseTypeSet.add(l.key_type.trim());
        });
        const licenseTypes = Array.from(licenseTypeSet).map((name, index) => ({
            id: index + 1,
            name,
            created_at: now
        }));

        localStorage.setItem(this.KEYS.DEPARTMENTS, JSON.stringify(departments));
        localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(categories));
        localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
        localStorage.setItem(this.KEYS.ASSETS, JSON.stringify(assets));
        localStorage.setItem(this.KEYS.LICENSES, JSON.stringify(licenses));
        localStorage.setItem(this.KEYS.LICENSE_TYPES, JSON.stringify(licenseTypes));
        localStorage.setItem(this.KEYS.ASSET_HISTORY, JSON.stringify([]));
        localStorage.setItem(this.KEYS.MAINTENANCE_TASKS, JSON.stringify([]));
        localStorage.setItem(this.KEYS.MAINTENANCE_EVENTS, JSON.stringify([]));
        localStorage.setItem(this.KEYS.STOCK_CHECKS, JSON.stringify([]));
        localStorage.setItem(this.KEYS.STOCK_CHECK_ITEMS, JSON.stringify([]));
        localStorage.setItem(this.KEYS.ALERT_SETTINGS, JSON.stringify([]));

        localStorage.setItem(
            this.KEYS.COUNTER,
            JSON.stringify({
                assets: (Math.max(0, ...assets.map((x) => Number(x.id) || 0)) || 0) + 1,
                licenses: (Math.max(0, ...licenses.map((x) => Number(x.id) || 0)) || 0) + 1,
                users: (Math.max(0, ...users.map((x) => Number(x.id) || 0)) || 0) + 1,
                departments: (Math.max(0, ...departments.map((x) => Number(x.id) || 0)) || 0) + 1,
                categories: (Math.max(0, ...categories.map((x) => Number(x.id) || 0)) || 0) + 1,
                license_types: (Math.max(0, ...licenseTypes.map((x) => Number(x.id) || 0)) || 0) + 1,
                asset_history: 1,
                maintenance_tasks: 1,
                maintenance_events: 1,
                stock_checks: 1,
                stock_check_items: 1,
                alert_settings: 1
            })
        );

        localStorage.setItem(migratedFlag, '1');
        console.log('LocalDB: Migrated legacy localStorage data to qlts_* schema');
    },

    // Deduplicate users: merge duplicates by name, consolidate assets
    deduplicateUsers() {
        const safeRead = (key) => {
            try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
        };
        const users = safeRead(this.KEYS.USERS);
        if (users.length === 0) return;

        const nameMap = {};
        users.forEach(u => {
            const key = (u.name || '').trim().toLowerCase();
            if (!key) return;
            if (!nameMap[key]) nameMap[key] = [];
            nameMap[key].push(u);
        });

        const hasDupes = Object.values(nameMap).some(arr => arr.length > 1);
        if (!hasDupes) return;

        console.log('LocalDB: Found duplicate users, merging...');

        const assets = safeRead(this.KEYS.ASSETS);
        const history = safeRead(this.KEYS.ASSET_HISTORY);
        const licenses = safeRead(this.KEYS.LICENSES);
        const seatingRaw = localStorage.getItem('seating_data_v2');
        let seating = null;
        try { seating = seatingRaw ? JSON.parse(seatingRaw) : null; } catch (e) {}

        const removeIds = new Set();
        const idRemap = {}; // oldId -> keepId

        Object.values(nameMap).forEach(arr => {
            if (arr.length <= 1) return;
            // Keep the one with lowest id (oldest)
            arr.sort((a, b) => a.id - b.id);
            const keep = arr[0];
            for (let i = 1; i < arr.length; i++) {
                const dup = arr[i];
                removeIds.add(dup.id);
                idRemap[dup.id] = keep.id;
                console.log(`  Merging user id=${dup.id} "${dup.name}" -> keep id=${keep.id}`);
            }
        });

        // Reassign assets
        let assetsChanged = false;
        assets.forEach(a => {
            if (idRemap[a.user_id] !== undefined) {
                a.user_id = idRemap[a.user_id];
                // Also update user name field if present
                const keepUser = users.find(u => u.id === a.user_id);
                if (keepUser) a.user = keepUser.name;
                assetsChanged = true;
            }
        });

        // Reassign asset history
        let historyChanged = false;
        history.forEach(h => {
            if (idRemap[h.user_id] !== undefined) {
                h.user_id = idRemap[h.user_id];
                historyChanged = true;
            }
        });

        // Reassign licenses
        let licensesChanged = false;
        licenses.forEach(l => {
            if (idRemap[l.user_id] !== undefined) {
                l.user_id = idRemap[l.user_id];
                licensesChanged = true;
            }
        });

        // Update seating data
        if (seating && seating.cellData) {
            Object.values(seating.cellData).forEach(cell => {
                if (cell.userId && idRemap[cell.userId] !== undefined) {
                    cell.userId = idRemap[cell.userId];
                }
            });
            localStorage.setItem('seating_data_v2', JSON.stringify(seating));
        }

        // Remove duplicate users
        const cleanUsers = users.filter(u => !removeIds.has(u.id));
        localStorage.setItem(this.KEYS.USERS, JSON.stringify(cleanUsers));

        if (assetsChanged) localStorage.setItem(this.KEYS.ASSETS, JSON.stringify(assets));
        if (historyChanged) localStorage.setItem(this.KEYS.ASSET_HISTORY, JSON.stringify(history));
        if (licensesChanged) localStorage.setItem(this.KEYS.LICENSES, JSON.stringify(licenses));

        // Also update legacy keys if they exist
        if (localStorage.getItem(this.LEGACY_KEYS.USERS)) {
            localStorage.setItem(this.LEGACY_KEYS.USERS, JSON.stringify(cleanUsers));
        }
        if (assetsChanged && localStorage.getItem(this.LEGACY_KEYS.ASSETS)) {
            localStorage.setItem(this.LEGACY_KEYS.ASSETS, JSON.stringify(assets));
        }

        console.log(`LocalDB: Removed ${removeIds.size} duplicate user(s), reassigned their assets/licenses/history`);
    },

    // One-time migration: Clip Studio Paint keys
    seedClipStudioPaintKeys() {
        const flag = 'qlts_csp_keys_seeded_v1';
        if (localStorage.getItem(flag) === '1') return;

        const safeRead = (key) => {
            try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
        };

        const now = new Date().toISOString();
        let users = safeRead(this.KEYS.USERS);
        let licenses = safeRead(this.KEYS.LICENSES);
        let counters = JSON.parse(localStorage.getItem(this.KEYS.COUNTER) || '{}');

        const normalize = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

        // Helper: find or create user
        const findOrCreateUser = (name) => {
            if (!name || name === '—' || name === '-') return null;
            const existing = users.find(u => normalize(u.name) === normalize(name));
            if (existing) return existing;
            const newId = counters.users || (Math.max(0, ...users.map(u => Number(u.id) || 0)) + 1);
            const newUser = {
                id: newId,
                name: name.trim(),
                email: '',
                department_id: null,
                status: 'Active',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}`,
                created_at: now
            };
            users.push(newUser);
            counters.users = newId + 1;
            return newUser;
        };

        const cspData = [
            { name: '', team: 'BG', key: 'SP1DEE-D0SLSE-TER1N7-LCSDL7-FBH7C8', note: '' },
            { name: '', team: 'Anim', key: 'SP1DEP-D2CU79-S7NCUA-PBPAMK-EENMLB', note: '' },
            { name: '', team: 'BG', key: 'SP1DEE-D0SK2A-J29AKF-BFL9K7-RDACFE', note: '' },
            { name: 'Đỗ Thành Trung', team: 'Anim', key: 'SP1DEP-D2CU7B-BFA496-B4P7AC-FHBB86', note: '' },
            { name: 'Đoàn Anh Kiệt', team: 'Anim', key: 'SP1DEP-D2CU78-F5HDPA-TJU8U7-S4FDCA', note: '' },
            { name: 'Hà Huy Hoàng', team: 'Anim', key: 'SP1DEP-D2CU7A-DC9EM5-A97BF7-E9D567', note: '' },
            { name: '', team: 'BG', key: 'SP1DEE-D0W3M1-DLA88K-89KCHJ-8J6F76', note: '' },
            { name: 'Thanh Nguyễn', team: 'BG', key: 'SP1DEE-D0SLSF-S6S8DB-P7UEC7-HDS2KF', note: '' },
            { name: '', team: 'BG', key: 'SP1DEE-D0SLSH-L8MEP4-B5M7MC-MJEC8F', note: '' },
            { name: '', team: 'BG', key: 'SP1DEE-D0SLSJ-9HSBBB-D9RAA9-R6PL9F', note: '' },
            { name: 'Hoà Nguyễn', team: 'BG', key: 'SP1DEE-D0SLSK-KBECHH-J6S8BJ-F7T9AF', note: '' },
            { name: '', team: 'BG', key: 'SP1DEE-D0SLSL-HPU7PC-CESDNP-K7EFCK', note: 'cấp cho Lê 2D SG' },
            { name: 'Lộc Nguyễn', team: 'BG', key: 'SP1DEE-D0SLSM-SCJMD8-FRNMKH-FPEFKJ', note: '' },
            { name: 'Thảo Nguyễn', team: 'BG', key: 'SP1DEE-D0SK2B-M7E4AC-LHD2C3-F3F7F7', note: '' },
            { name: 'Đạt Dương', team: 'BG', key: 'SP1DEE-D0W3M5-NPSNBH-KRSMJE-PKCPBH', note: '' }
        ];

        // Check for duplicate keys already in licenses
        const existingKeys = new Set(licenses.map(l => l.license_key));

        let addedCount = 0;
        cspData.forEach(item => {
            if (existingKeys.has(item.key)) return; // skip if already exists

            const user = item.name ? findOrCreateUser(item.name) : null;
            const licId = counters.licenses || (Math.max(0, ...licenses.map(l => Number(l.id) || 0)) + 1);

            licenses.push({
                id: licId,
                key_type: 'Clip Studio Paint',
                license_key: item.key,
                package_type: 'permanent',
                expiration_date: null,
                user_id: user ? user.id : null,
                user: user ? user.name : '',
                status: user ? 'Active' : 'Stock',
                notes: item.note ? `[${item.team}] ${item.note}` : `[${item.team}]`,
                created_at: now
            });
            counters.licenses = licId + 1;
            addedCount++;
        });

        localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
        localStorage.setItem(this.KEYS.LICENSES, JSON.stringify(licenses));
        localStorage.setItem(this.KEYS.COUNTER, JSON.stringify(counters));
        localStorage.setItem(flag, '1');

        console.log(`LocalDB: Seeded ${addedCount} Clip Studio Paint keys, users updated`);
    },

    ensureSeedData() {
        const seedFlagKey = 'qlts_seed_v2';
        if (localStorage.getItem(seedFlagKey) === '1') return;

        const safeRead = (key) => {
            try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
        };

        const departments = safeRead(this.KEYS.DEPARTMENTS);
        const categories = safeRead(this.KEYS.CATEGORIES);
        const users = safeRead(this.KEYS.USERS);
        const assets = safeRead(this.KEYS.ASSETS);
        const licenses = safeRead(this.KEYS.LICENSES);

        const hasCoreData = departments.length > 0 && categories.length > 0 && users.length > 0;
        const needsSeed = assets.length === 0 && licenses.length === 0;

        if (hasCoreData && needsSeed) {
            const now = new Date().toISOString();
            const seededAssets = [
                { id: 1, name: 'Laptop Dell XPS 13', config: 'i7-1165G7, 16GB RAM, 512GB SSD', category_id: 1, location: 'Phòng IT', purchase_date: '2024-01-15', user_id: 1, status: 'Active', notes: 'Laptop mới', created_at: now },
                { id: 2, name: 'Monitor LG 27"', config: '4K IPS 27 inch', category_id: 3, location: 'Phòng IT', purchase_date: '2024-01-20', user_id: null, status: 'Stock', notes: '', created_at: now }
            ];
            const seededLicenses = [
                { id: 1, key_type: 'Windows', license_key: 'XXXXX-XXXXX-XXXXX-XXXXX', package_type: 'OEM', expiration_date: '2025-12-31', user_id: 1, status: 'Active', notes: '', created_at: now },
                { id: 2, key_type: 'Adobe', license_key: 'YYYYY-YYYYY-YYYYY-YYYYY', package_type: 'Business', expiration_date: '2025-06-30', user_id: 2, status: 'Active', notes: '', created_at: now }
            ];

            localStorage.setItem(this.KEYS.ASSETS, JSON.stringify(seededAssets));
            localStorage.setItem(this.KEYS.LICENSES, JSON.stringify(seededLicenses));

            const counters = JSON.parse(localStorage.getItem(this.KEYS.COUNTER) || '{}');
            counters.assets = Math.max(counters.assets || 1, 3);
            counters.licenses = Math.max(counters.licenses || 1, 3);
            localStorage.setItem(this.KEYS.COUNTER, JSON.stringify(counters));

            console.log('LocalDB: Seeded sample assets/licenses for legacy local data');
        }

        localStorage.setItem(seedFlagKey, '1');
    },

    seedSuppliesIfNeeded() {
        const suppliesKey = this.KEYS.SUPPLIES;
        const transKey = this.KEYS.SUPPLY_TRANSACTIONS;
        const existing = localStorage.getItem(suppliesKey);
        if (!existing || JSON.parse(existing || '[]').length === 0) {
            const now = new Date().toISOString();
            const defaultSupplies = [
                { id: 1, code: 'VT-RAM-001', name: 'RAM DDR4 8GB Kingston 3200MHz', category: 'Linh kiện phần cứng', unit: 'Thanh', quantity: 12, min_quantity: 5, location: 'Tủ kỹ thuật - Tầng 2', supplier_id: 1, unit_price: 520000, notes: 'Nâng cấp laptop và PC', created_at: now },
                { id: 2, code: 'VT-SSD-001', name: 'Ổ cứng SSD NVMe 512GB Kingston NV2', category: 'Linh kiện phần cứng', unit: 'Chiếc', quantity: 6, min_quantity: 3, location: 'Tủ kỹ thuật - Tầng 2', supplier_id: 1, unit_price: 950000, notes: 'Thay thế ổ cứng hỏng', created_at: now },
                { id: 3, code: 'VT-MOU-001', name: 'Chuột không dây Logitech B170', category: 'Thiết bị ngoại vi', unit: 'Chiếc', quantity: 24, min_quantity: 10, location: 'Kho IT - Tủ A1', supplier_id: 2, unit_price: 180000, notes: 'Cấp phát cho nhân sự mới', created_at: now },
                { id: 4, code: 'VT-KBD-001', name: 'Bàn phím văn phòng Dell KB216', category: 'Thiết bị ngoại vi', unit: 'Chiếc', quantity: 4, min_quantity: 5, location: 'Kho IT - Tủ A1', supplier_id: 2, unit_price: 220000, notes: 'Cảnh báo sắp hết hàng', created_at: now },
                { id: 5, code: 'VT-CAB-001', name: 'Cáp HDMI 2.0 Ugreen 1.5m (4K@60Hz)', category: 'Dây cáp & Chuyển đổi', unit: 'Sợi', quantity: 18, min_quantity: 6, location: 'Tủ cáp phụ kiện', supplier_id: 3, unit_price: 110000, notes: 'Dùng kết nối màn hình ngoài', created_at: now },
                { id: 6, code: 'VT-NET-001', name: 'Hạt mạng RJ45 Cat6 AMP Commscope', category: 'Mạng & Viễn thông', unit: 'Hộp', quantity: 3, min_quantity: 2, location: 'Kệ vật tư mạng', supplier_id: 3, unit_price: 350000, notes: 'Hộp 100 đầu bấm mạng', created_at: now },
                { id: 7, code: 'VT-INK-001', name: 'Hộp mực máy in Canon 2900 (Cartridge 303)', category: 'Vật tư in ấn', unit: 'Hộp', quantity: 2, min_quantity: 3, location: 'Kho thiết bị văn phòng', supplier_id: 1, unit_price: 320000, notes: 'Tồn kho thấp, cần đề xuất mua thêm', created_at: now },
                { id: 8, code: 'VT-HUB-001', name: 'Bộ chia Type-C to HDMI/USB 3.0 Ugreen 5-in-1', category: 'Dây cáp & Chuyển đổi', unit: 'Chiếc', quantity: 8, min_quantity: 4, location: 'Tủ kỹ thuật - Tầng 2', supplier_id: 3, unit_price: 490000, notes: 'Cấp cho nhân sự dùng Macbook/Laptop mỏng nhẹ', created_at: now }
            ];
            localStorage.setItem(suppliesKey, JSON.stringify(defaultSupplies));

            const defaultTrans = [
                { id: 1, code: 'NK-20260901-001', type: 'IN', supply_id: 1, supply_name: 'RAM DDR4 8GB Kingston 3200MHz', quantity: 15, unit: 'Thanh', unit_price: 520000, total_amount: 7800000, date: '2026-09-01', supplier_id: 1, supplier_name: 'Công ty Máy tính Phong Vũ', reason: 'Nhập bổ sung linh kiện quý 3', created_by: 'Admin Hệ Thống', created_at: now },
                { id: 2, code: 'XK-20260905-001', type: 'OUT', supply_id: 1, supply_name: 'RAM DDR4 8GB Kingston 3200MHz', quantity: 3, unit: 'Thanh', unit_price: 520000, total_amount: 1560000, date: '2026-09-05', receiver_user_id: 1, receiver_name: 'Nguyễn Văn A', receiver_department: 'IT', reason: 'Nâng cấp máy trạm đồ họa', created_by: 'Admin Hệ Thống', created_at: now },
                { id: 3, code: 'NK-20260902-002', type: 'IN', supply_id: 3, supply_name: 'Chuột không dây Logitech B170', quantity: 30, unit: 'Chiếc', unit_price: 180000, total_amount: 5400000, date: '2026-09-02', supplier_id: 2, supplier_name: 'Công ty Cổ phần Bách Khoa Computer', reason: 'Nhập kho phục vụ onboarding nhân viên mới', created_by: 'Admin Hệ Thống', created_at: now },
                { id: 4, code: 'XK-20260906-002', type: 'OUT', supply_id: 3, supply_name: 'Chuột không dây Logitech B170', quantity: 6, unit: 'Chiếc', unit_price: 180000, total_amount: 1080000, date: '2026-09-06', receiver_user_id: 2, receiver_name: 'Trần Thị B', receiver_department: 'Kế toán', reason: 'Cấp phát cho nhân sự mới', created_by: 'Admin Hệ Thống', created_at: now }
            ];
            localStorage.setItem(transKey, JSON.stringify(defaultTrans));

            const counters = JSON.parse(localStorage.getItem(this.KEYS.COUNTER) || '{}');
            counters.supplies = Math.max(counters.supplies || 1, 9);
            counters.supply_transactions = Math.max(counters.supply_transactions || 1, 5);
            localStorage.setItem(this.KEYS.COUNTER, JSON.stringify(counters));
            console.log('LocalDB: Seeded default supplies and transactions');
        }
    },

    // Set default data for new installation
    setDefaultData() {
        console.log('LocalDB.setDefaultData() called');
        const now = new Date().toISOString();
        const departments = [
            { id: 1, name: 'IT', created_at: now },
            { id: 2, name: 'Kế toán', created_at: now },
            { id: 3, name: 'Nhân sự', created_at: now },
            { id: 4, name: 'Kinh doanh', created_at: now },
            { id: 5, name: 'Marketing', created_at: now },
            { id: 6, name: 'Hành chính', created_at: now }
        ];

        const categories = [
            { id: 1, name: 'Laptop', created_at: now },
            { id: 2, name: 'Desktop', created_at: now },
            { id: 3, name: 'Monitor', created_at: now },
            { id: 4, name: 'Bàn phím', created_at: now },
            { id: 5, name: 'Chuột', created_at: now },
            { id: 6, name: 'Điện thoại', created_at: now },
            { id: 7, name: 'Máy tính bảng', created_at: now },
            { id: 8, name: 'Máy in', created_at: now }
        ];

        const licenseTypes = [
            { id: 1, name: 'Windows', created_at: now },
            { id: 2, name: 'Office', created_at: now },
            { id: 3, name: 'Adobe', created_at: now },
            { id: 4, name: 'Autodesk', created_at: now },
            { id: 5, name: 'Google Workspace', created_at: now }
        ];

        const userNames = [
            'Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E',
            'Vũ Thị F', 'Đặng Văn G', 'Ngô Thị H', 'Bùi Văn I', 'Mai Thị K',
            'Dương Văn L', 'Hà Thị M', 'Tô Văn N', 'Lý Thị O', 'Quách Văn P',
            'Hồ Thị Q', 'Trịnh Văn R', 'Kim Thị S', 'Mạch Văn T', 'Cao Thị U'
        ];

        const users = userNames.map((name, index) => ({
            id: index + 1,
            name,
            email: `${name.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(/\s+/g, '.')}@company.com`,
            department_id: (index % departments.length) + 1,
            status: index % 4 === 0 ? 'Nghỉ phép' : 'Đang hoạt động',
            avatar: this.buildUserAvatar(name),
            created_at: now
        }));

        const assetNames = [
            'Laptop Dell XPS 13', 'Laptop ThinkPad T14', 'Laptop MacBook Pro 14', 'Desktop Dell OptiPlex',
            'Desktop HP ProDesk', 'Monitor LG 27inch', 'Monitor Dell 24inch', 'Keyboard Logitech K380',
            'Mouse Logitech M185', 'Phone iPhone 15', 'Phone Samsung S24', 'Tablet iPad Air',
            'Printer Canon LBP', 'Printer HP LaserJet', 'Laptop ASUS VivoBook', 'Desktop Lenovo ThinkCentre',
            'Monitor AOC 32inch', 'Keyboard Keychron K2', 'Mouse Rapoo M500', 'Phone Xiaomi 14'
        ];

        const assetLocation = ['Phòng IT', 'Phòng Kế toán', 'Phòng Nhân sự', 'Phòng Kinh doanh', 'Phòng Marketing', 'Phòng Hành chính', 'Kho trung tâm'];
        const assetStatus = ['Active', 'Stock', 'Repair', 'Broken'];

        const assets = assetNames.map((name, index) => ({
            id: index + 1,
            name,
            config: `${['i7', 'i5', 'Ryzen 5', 'Ryzen 7'][index % 4]} ${['16GB', '32GB'][index % 2]} RAM ${['512GB SSD', '1TB SSD', '27 inch', '4K'][index % 4]}`,
            category_id: (index % categories.length) + 1,
            location: assetLocation[index % assetLocation.length],
            purchase_date: new Date(Date.now() - (index + 1) * 20 * 86400000).toISOString().slice(0, 10),
            cost: 9000000 + index * 450000,
            salvage_value: 500000 + index * 40000,
            useful_life_months: 24 + (index % 5) * 12,
            depreciation_method: index % 2 === 0 ? 'straight_line' : 'declining_balance',
            status: assetStatus[index % assetStatus.length],
            notes: index % 2 === 0 ? 'Thiết bị đang sử dụng' : 'Sẵn sàng cấp phát',
            user_id: index < 10 ? (index % users.length) + 1 : null,
            created_at: now
        }));

        const licenseKeys = [
            'WIN-2024-001', 'WIN-2024-002', 'OFF-2024-001', 'OFF-2024-002', 'ADBE-2024-001',
            'ADBE-2024-002', 'AUTO-2024-001', 'AUTO-2024-002', 'GWS-2024-001', 'GWS-2024-002',
            'WIN-2024-003', 'OFF-2024-003', 'ADBE-2024-003', 'AUTO-2024-003', 'GWS-2024-003',
            'WIN-2024-004', 'OFF-2024-004', 'ADBE-2024-004', 'AUTO-2024-004', 'GWS-2024-004'
        ];

        const licenses = licenseKeys.map((key, index) => {
            // Vài license đã hết hạn thật sự (ngày trong quá khứ) để demo trạng thái "Hết hạn",
            // số còn lại còn hạn dùng - status luôn khớp với expiration_date, không random độc lập.
            const isExpiredDemo = index % 5 === 0;
            const offsetDays = isExpiredDemo ? -(index + 10) * 20 : (index + 1) * 45;
            return {
                id: index + 1,
                key_type: licenseTypes[index % licenseTypes.length].name,
                license_key: key,
                package_type: ['OEM', 'Business', 'Enterprise', 'Education'][index % 4],
                expiration_date: new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10),
                user_id: (index % users.length) + 1,
                status: isExpiredDemo ? 'Expired' : 'Active',
                notes: index % 2 === 0 ? 'Thuê bao có phí' : 'Đã kích hoạt',
                created_at: now
            };
        });

        const maintenanceTasks = Array.from({ length: 8 }, (_, index) => ({
            id: index + 1,
            asset_id: (index % assets.length) + 1,
            title: `Bảo trì ${['Máy văn phòng', 'Màn hình', 'Máy in', 'Laptop', 'Thiết bị mạng'][index % 5]}`,
            due_date: new Date(Date.now() + (index + 2) * 10 * 86400000).toISOString().slice(0, 10),
            status: index % 3 === 0 ? 'Chưa xử lý' : 'Hoàn thành',
            note: ['Ưu tiên cao', 'Cần kiểm tra định kỳ', 'Bảo dưỡng thường kỳ'][index % 3],
            created_by: 1,
            created_at: now
        }));

        const maintenanceEvents = maintenanceTasks.map((task, index) => ({
            id: index + 1,
            maintenance_task_id: task.id,
            asset_id: task.asset_id,
            action: ['Checked', 'Updated', 'Resolved'][index % 3],
            details: `Ghi nhận ${task.title}`,
            created_at: now
        }));

        const stockChecks = Array.from({ length: 5 }, (_, index) => ({
            id: index + 1,
            name: `Đợt kiểm kê ${index + 1}`,
            started_at: new Date(Date.now() - index * 8 * 86400000).toISOString().slice(0, 10),
            status: index % 2 === 0 ? 'Đang mở' : 'Hoàn thành',
            note: ['Kiểm kê hàng quý', 'Kiểm kê theo phòng ban', 'Kiểm kê định kỳ'][index % 3],
            created_by: 1,
            created_at: now
        }));

        const stockCheckItems = stockChecks.flatMap((check, checkIndex) =>
            Array.from({ length: 3 }, (_, itemIndex) => ({
                id: checkIndex * 10 + itemIndex + 1,
                stock_check_id: check.id,
                asset_id: ((checkIndex + itemIndex) % assets.length) + 1,
                status: itemIndex % 2 === 0 ? 'matched' : 'missing',
                note: `Item ${itemIndex + 1}`,
                created_at: now
            }))
        );

        const alertSettings = [{
            id: 1,
            warranty_threshold_days: 30,
            license_threshold_days: 45,
            maintenance_threshold_days: 7,
            emails: ['it@example.com', 'ops@example.com'],
            created_at: now
        }];

        const suppliers = [
            { id: 1, name: 'FPT Trading', contact_person: 'Nguyễn Văn Hùng', phone: '0901234567', email: 'sales@fpttrading.example.com', address: 'Hà Nội', notes: 'Nhà cung cấp laptop/desktop chính', created_at: now },
            { id: 2, name: 'Synnex FPT', contact_person: 'Trần Thị Lan', phone: '0912345678', email: 'contact@synnexfpt.example.com', address: 'TP. Hồ Chí Minh', notes: 'Phân phối license bản quyền', created_at: now },
            { id: 3, name: 'Digiworld', contact_person: 'Lê Minh Tuấn', phone: '0923456789', email: 'info@digiworld.example.com', address: 'TP. Hồ Chí Minh', notes: 'Thiết bị văn phòng, phụ kiện', created_at: now }
        ];

        const defaultData = {
            departments,
            categories,
            license_types: licenseTypes,
            users,
            assets,
            licenses,
            asset_history: [],
            maintenance_tasks: maintenanceTasks,
            maintenance_events: maintenanceEvents,
            stock_checks: stockChecks,
            stock_check_items: stockCheckItems,
            suppliers,
            alert_settings: alertSettings
        };

        // Save all default data
        console.log('Saving default data to localStorage...');
        Object.keys(defaultData).forEach(key => {
            const storageKey = this.KEYS[key.toUpperCase()];
            console.log(`Saving ${key} (${defaultData[key].length} items) to ${storageKey}`);
            localStorage.setItem(storageKey, JSON.stringify(defaultData[key]));
        });

        // Initialize ID counter
        localStorage.setItem(this.KEYS.COUNTER, JSON.stringify({
            assets: assets.length + 1,
            licenses: licenses.length + 1,
            users: users.length + 1,
            departments: departments.length + 1,
            categories: categories.length + 1,
            license_types: licenseTypes.length + 1,
            asset_history: 1,
            maintenance_tasks: maintenanceTasks.length + 1,
            maintenance_events: maintenanceEvents.length + 1,
            stock_checks: stockChecks.length + 1,
            stock_check_items: stockCheckItems.length + 1,
            suppliers: suppliers.length + 1,
            alert_settings: alertSettings.length + 1
        }));

        console.log('LocalDB: Initialized with default data');
    },

    // Get next ID for a table
    getNextId(tableName) {
        const counters = JSON.parse(localStorage.getItem(this.KEYS.COUNTER) || '{}');
        const currentId = counters[tableName] || 1;
        counters[tableName] = currentId + 1;
        localStorage.setItem(this.KEYS.COUNTER, JSON.stringify(counters));
        return currentId;
    },

    // Generic SELECT operation
    from(tableName) {
        const storageKey = this.KEYS[tableName.toUpperCase()];
        const self = this; // Preserve context
        const isComparableNumber = (value) => {
            if (value === null || value === undefined) return false;
            if (typeof value === 'string' && value.trim() === '') return false;
            return !Number.isNaN(Number(value));
        };
        const isEqualValue = (left, right) => {
            if (left === right) return true;
            if (left === null || left === undefined || right === null || right === undefined) return false;
            if (isComparableNumber(left) && isComparableNumber(right)) {
                return Number(left) === Number(right);
            }
            return String(left) === String(right);
        };
        
        return {
            // SELECT all or with filters
            async select(columns = '*') {
                try {
                    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    const normalizedData = tableName.toLowerCase() === 'users' ? data.map(item => self.normalizeUserRecord(item)) : data;
                    if (tableName.toLowerCase() === 'users' && JSON.stringify(normalizedData) !== JSON.stringify(data)) {
                        localStorage.setItem(storageKey, JSON.stringify(normalizedData));
                    }
                    
                    // Handle join syntax (simplified)
                    if (columns.includes(':')) {
                        // For now, return data as-is and handle joins in fetchAllData
                        return { data: normalizedData, error: null };
                    }
                    
                    return { data: normalizedData, error: null };
                } catch (error) {
                    console.error(`LocalDB select error on ${tableName}:`, error);
                    return { data: null, error };
                }
            },

            // INSERT operation
            async insert(payload) {
                try {
                    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    const isArray = Array.isArray(payload);
                    const items = isArray ? payload : [payload];
                    
                    const newItems = items.map(item => {
                        const normalizedItem = tableName.toLowerCase() === 'users' ? self.normalizeUserRecord(item) : item;
                        return {
                            ...normalizedItem,
                            id: normalizedItem.id || self.getNextId(tableName),
                            created_at: normalizedItem.created_at || new Date().toISOString()
                        };
                    });
                    
                    data.push(...newItems);
                    localStorage.setItem(storageKey, JSON.stringify(data));
                    
                    // Return an object that works both as direct result AND allows .select() chaining
                    const result = {
                        data: newItems,
                        error: null,
                        
                        // Allow .select() chaining
                        select: async function() {
                            return { 
                                data: this.data, 
                                error: this.error 
                            };
                        }
                    };
                    
                    return result;
                } catch (error) {
                    console.error(`LocalDB insert error on ${tableName}:`, error);
                    return {
                        data: null,
                        error: error,
                        select: async function() {
                            return { data: null, error: this.error };
                        }
                    };
                }
            },

            // UPDATE operation  
            update(payload) {
                let _storageKey = storageKey;
                let _payload = payload;
                let _resultData = null;
                let _error = null;
                let _eqPromise = null;

                const builder = {
                    eq(column, value) {
                        _eqPromise = (async () => {
                            try {
                                const data = JSON.parse(localStorage.getItem(_storageKey) || '[]');
                                const index = data.findIndex(item => isEqualValue(item[column], value));
                                if (index !== -1) {
                                    const payload = tableName.toLowerCase() === 'users' ? self.normalizeUserRecord(_payload) : _payload;
                                    data[index] = { ...data[index], ...payload };
                                    localStorage.setItem(_storageKey, JSON.stringify(data));
                                    _resultData = [data[index]];
                                    _error = null;
                                } else {
                                    _error = new Error('Record not found');
                                    _resultData = null;
                                }
                            } catch (error) {
                                console.error(`LocalDB update error on ${tableName}:`, error);
                                _error = error;
                                _resultData = null;
                            }
                        })();
                        return builder;
                    },
                    async select() {
                        if (_eqPromise) await _eqPromise;
                        return { data: _resultData, error: _error };
                    },
                    async then(resolve, reject) {
                        if (_eqPromise) await _eqPromise;
                        const result = { data: _resultData, error: _error };
                        resolve(result);
                    }
                };
                return builder;
            },

            // DELETE operation
            delete() {
                return {
                    async eq(column, value) {
                        try {
                            const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
                            const filteredData = data.filter(item => !isEqualValue(item[column], value));
                            localStorage.setItem(storageKey, JSON.stringify(filteredData));
                            
                            return { error: null };
                        } catch (error) {
                            console.error(`LocalDB delete error on ${tableName}:`, error);
                            return { error };
                        }
                    }
                };
            },

            // ORDER BY
            order(column, options = {}) {
                return {
                    async select(columns = '*') {
                        try {
                            const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
                            const ascending = options.ascending !== false;
                            
                            data.sort((a, b) => {
                                if (a[column] < b[column]) return ascending ? -1 : 1;
                                if (a[column] > b[column]) return ascending ? 1 : -1;
                                return 0;
                            });
                            
                            return { data, error: null };
                        } catch (error) {
                            console.error(`LocalDB order error on ${tableName}:`, error);
                            return { data: null, error };
                        }
                    }
                };
            },
            
            // UPSERT operation (for alert_settings)
            async upsert(payload, options = {}) {
                try {
                    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    const onConflict = options.onConflict || 'id';
                    
                    const existingIndex = data.findIndex(item => item[onConflict] === payload[onConflict]);
                    
                    if (existingIndex !== -1) {
                        // Update existing
                        data[existingIndex] = { ...data[existingIndex], ...payload };
                    } else {
                        // Insert new
                        const newItem = {
                            ...payload,
                            id: payload.id || self.getNextId(tableName),
                            created_at: payload.created_at || new Date().toISOString()
                        };
                        data.push(newItem);
                    }
                    
                    localStorage.setItem(storageKey, JSON.stringify(data));
                    return { data: payload, error: null };
                } catch (error) {
                    console.error(`LocalDB upsert error on ${tableName}:`, error);
                    return { data: null, error };
                }
            }
        };
    },

    // Helper to get all data from a table
    async getAllFromTable(tableName) {
        const result = await this.from(tableName).select();
        return result.data || [];
    },

    // Clear all data (for testing/reset)
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        console.log('LocalDB: All data cleared');
    },

    // =========================================================
    // BACKUP & RESTORE
    // =========================================================

    // Export toàn bộ data thành 1 JSON object
    exportAllData() {
        const data = {};
        const safeRead = (key) => {
            try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
        };
        Object.entries(this.KEYS).forEach(([name, key]) => {
            if (name === 'COUNTER') {
                try { data.COUNTER = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { data.COUNTER = {}; }
            } else {
                data[name] = safeRead(key);
            }
        });
        data._exportedAt = new Date().toISOString();
        data._version = 'qlts_backup_v1';
        return data;
    },

    // Download backup as JSON file
    downloadBackup() {
        const data = this.exportAllData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `qlts_backup_${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log(`Backup downloaded: qlts_backup_${timestamp}.json`);
        return data;
    },

    // Restore data from JSON object
    restoreFromBackup(data) {
        if (!data || !data._version) {
            console.error('Invalid backup data');
            return false;
        }
        Object.entries(this.KEYS).forEach(([name, key]) => {
            if (name === 'COUNTER' && data.COUNTER) {
                localStorage.setItem(key, JSON.stringify(data.COUNTER));
            } else if (data[name]) {
                localStorage.setItem(key, JSON.stringify(data[name]));
            }
        });
        console.log('Data restored from backup:', data._exportedAt);
        return true;
    },

    // Restore from file (for use with file input)
    restoreFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const ok = this.restoreFromBackup(data);
                    if (ok) resolve(data);
                    else reject(new Error('Invalid backup format'));
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    },

    // =================================================================
    // STORAGE USAGE — Đo dung lượng localStorage đang sử dụng
    // Giúp giám sát và cảnh báo khi gần đầy (~5MB chuẩn trình duyệt).
    // =================================================================
    getStorageUsage() {
        const ESTIMATED_TOTAL = 5 * 1024 * 1024; // 5MB — giới hạn chuẩn của hầu hết trình duyệt
        const details = {};
        let totalUsed = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key) || '';
            // Mỗi ký tự JavaScript (UTF-16) chiếm 2 bytes trong localStorage
            const sizeBytes = (key.length + value.length) * 2;
            details[key] = sizeBytes;
            totalUsed += sizeBytes;
        }

        return {
            usedBytes: totalUsed,
            totalBytes: ESTIMATED_TOTAL,
            usedPercent: Math.round((totalUsed / ESTIMATED_TOTAL) * 10000) / 100,
            usedMB: Math.round(totalUsed / 1024 / 1024 * 100) / 100,
            totalMB: 5,
            details: details
        };
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.LocalDB = LocalDB;
    // Initialize after export
    console.log('LocalDB: Starting initialization...');
    window.localDBReady = LocalDB.init();
    console.log('LocalDB: Initialization complete');
}
