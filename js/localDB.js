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
        ALERT_SETTINGS: 'qlts_alert_settings',
        COUNTER: 'qlts_id_counter'
    },

    LEGACY_KEYS: {
        ASSETS: 'it_assets_final',
        LICENSES: 'it_licenses_final',
        USERS: 'it_users_final',
        DEPARTMENTS: 'it_departments_final',
        CATEGORIES: 'it_categories_final'
    },

    // Initialize default data
    init() {
        console.log('LocalDB.init() called');
        console.log('Checking for existing data...', localStorage.getItem(this.KEYS.DEPARTMENTS));

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

    // Set default data for new installation
    setDefaultData() {
        console.log('LocalDB.setDefaultData() called');
        const now = new Date().toISOString();
        const defaultData = {
            departments: [
                { id: 1, name: 'IT', created_at: now },
                { id: 2, name: 'Kế toán', created_at: now },
                { id: 3, name: 'Nhân sự', created_at: now },
                { id: 4, name: 'Kinh doanh', created_at: now }
            ],
            categories: [
                { id: 1, name: 'Laptop', created_at: now },
                { id: 2, name: 'Desktop', created_at: now },
                { id: 3, name: 'Monitor', created_at: now },
                { id: 4, name: 'Keyboard', created_at: now },
                { id: 5, name: 'Mouse', created_at: now }
            ],
            license_types: [
                { id: 1, name: 'Windows', created_at: now },
                { id: 2, name: 'Office', created_at: now },
                { id: 3, name: 'Adobe', created_at: now }
            ],
            users: [
                { id: 1, name: 'Nguyễn Văn A', email: 'a@company.com', department_id: 1, status: 'Đang hoạt động', created_at: now },
                { id: 2, name: 'Trần Thị B', email: 'b@company.com', department_id: 2, status: 'Đang hoạt động', created_at: now }
            ],
            assets: [],
            licenses: [
                { id: 1, key_type: 'Windows', license_key: 'XXXXX-XXXXX-XXXXX-XXXXX', package_type: 'OEM', expiration_date: '2025-12-31', user_id: 1, status: 'Active', notes: '', created_at: now },
                { id: 2, key_type: 'Office', license_key: 'YYYYY-YYYYY-YYYYY-YYYYY', package_type: 'Business', expiration_date: '2025-06-30', user_id: 2, status: 'Active', notes: '', created_at: now }
            ],
            asset_history: [],
            maintenance_tasks: [],
            maintenance_events: [],
            stock_checks: [],
            stock_check_items: [],
            alert_settings: []
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
            assets: 1,
            licenses: 3,
            users: 3,
            departments: 5,
            categories: 6,
            license_types: 4,
            asset_history: 1,
            maintenance_tasks: 1,
            maintenance_events: 1,
            stock_checks: 1,
            stock_check_items: 1,
            alert_settings: 1
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
                    
                    // Handle join syntax (simplified)
                    if (columns.includes(':')) {
                        // For now, return data as-is and handle joins in fetchAllData
                        return { data, error: null };
                    }
                    
                    return { data, error: null };
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
                    
                    const newItems = items.map(item => ({
                        ...item,
                        id: item.id || self.getNextId(tableName),
                        created_at: item.created_at || new Date().toISOString()
                    }));
                    
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
                                    data[index] = { ...data[index], ..._payload };
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
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.LocalDB = LocalDB;
    // Initialize after export
    console.log('LocalDB: Starting initialization...');
    LocalDB.init();
    console.log('LocalDB: Initialization complete');
}
