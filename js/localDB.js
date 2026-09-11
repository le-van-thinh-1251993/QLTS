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
        NETWORK_WIFIS: 'qlts_network_wifis',
        NETWORK_NATS: 'qlts_network_nats',
        NETWORK_REMOTES: 'qlts_network_remotes',
        NETWORK_TARGETS: 'qlts_network_targets',
        NETWORK_LINES: 'qlts_network_lines',
        NETWORK_DIAGRAMS: 'qlts_network_diagrams',
        NETWORK_CHECK_LOGS: 'qlts_network_check_logs',
        CONTRACTS: 'qlts_contracts',
        ALERT_SETTINGS: 'qlts_alert_settings',
        WORKBOOK_DATA: 'qlts_workbook_data',
        SEATING_DATA: 'seating_data_v2',
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

    // Initialize data with 100% real dataset
REAL_DATA: {
  "departments": [
    {
      "id": 1,
      "name": "Ban giám đốc - BOD",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "name": "Kinh doanh - Account",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "name": "Thiết kế - Design",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "name": "Sự kiện - Event",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 5,
      "name": "Sáng tạo - Creative",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 6,
      "name": "Truyền thông - Marketing",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 7,
      "name": "Sản xuất Video - Video Prodution",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 8,
      "name": "Tài chính & Kế toán - Finance & Accounting",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 9,
      "name": "Hành chính nhân sự - HR & Admin",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 10,
      "name": "Dự án - Project",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 11,
      "name": "Xưởng - Production",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 12,
      "name": "Khác",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "categories": [
    {
      "id": 1,
      "name": "Laptop",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "name": "PC",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "name": "Màn hình",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "name": "Bàn phím",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 5,
      "name": "Chuột",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "users": [
    {
      "id": 1,
      "name": "Lê Hải Yến",
      "employee_code": "10001",
      "email": "haiyen.le@newdaymedia.com.vn",
      "department_id": 1,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20H%E1%BA%A3i%20Y%E1%BA%BFn&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "name": "Larkin Thu Hà",
      "employee_code": "10002",
      "email": "thuha@newdaymedia.com.vn",
      "department_id": 1,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Larkin%20Thu%20H%C3%A0&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "name": "Phạm Khánh Băng",
      "employee_code": "10003",
      "email": "khanhbang@newdaymedia.com.vn",
      "department_id": 1,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20Kh%C3%A1nh%20B%C4%83ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "name": "Nguyễn Thị Thu Lan",
      "employee_code": "16001",
      "email": "thulan@newdaymedia.com.vn",
      "department_id": 2,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20Thu%20Lan&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 5,
      "name": "Thái Bảo Ngọc",
      "employee_code": "23006",
      "email": "ngoctb@newdaymedia.com.vn",
      "department_id": 2,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Th%C3%A1i%20B%E1%BA%A3o%20Ng%E1%BB%8Dc&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 6,
      "name": "Đặng Thế Quang",
      "employee_code": "23007",
      "email": "quangdt@newdaymedia.com.vn",
      "department_id": 2,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%E1%BA%B7ng%20Th%E1%BA%BF%20Quang&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 7,
      "name": "Hoàng Quốc Nghị",
      "employee_code": "20001",
      "email": "quocnghi@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ho%C3%A0ng%20Qu%E1%BB%91c%20Ngh%E1%BB%8B&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 8,
      "name": "Nguyễn Việt Thắng",
      "employee_code": "21001",
      "email": "vietthang@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Vi%E1%BB%87t%20Th%E1%BA%AFng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 9,
      "name": "Nguyễn Phương Mai",
      "employee_code": "21002",
      "email": "mainp@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Ph%C6%B0%C6%A1ng%20Mai&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 10,
      "name": "Thái Thị Thanh Thảo",
      "employee_code": "23001",
      "email": "thaottt@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Th%C3%A1i%20Th%E1%BB%8B%20Thanh%20Th%E1%BA%A3o&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 11,
      "name": "Vũ Thị Mai Linh",
      "employee_code": "23002",
      "email": "linhvtm@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=V%C5%A9%20Th%E1%BB%8B%20Mai%20Linh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 12,
      "name": "Nguyễn Thị Thuỷ Tiên",
      "employee_code": "24006",
      "email": "tiennt@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20Thu%E1%BB%B7%20Ti%C3%AAn&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 13,
      "name": "Bùi Trịnh Tuệ Khanh",
      "employee_code": "24009",
      "email": "khanhbtt@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=B%C3%B9i%20Tr%E1%BB%8Bnh%20Tu%E1%BB%87%20Khanh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 14,
      "name": "Vũ Đăng Duy",
      "employee_code": "26003",
      "email": "Duyvd@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=V%C5%A9%20%C4%90%C4%83ng%20Duy&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 15,
      "name": "Trần Duy Nam",
      "employee_code": "26027",
      "email": "Namtd@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Tr%E1%BA%A7n%20Duy%20Nam&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 16,
      "name": "Bùi Xuân Dân",
      "employee_code": "22001",
      "email": "danbx@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=B%C3%B9i%20Xu%C3%A2n%20D%C3%A2n&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 17,
      "name": "Hoàng Hà Giang",
      "employee_code": "23008",
      "email": "gianghh@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ho%C3%A0ng%20H%C3%A0%20Giang&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 18,
      "name": "Dương Nguyên Bảo",
      "employee_code": "25012",
      "email": "baodn@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=D%C6%B0%C6%A1ng%20Nguy%C3%AAn%20B%E1%BA%A3o&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 19,
      "name": "Nguyễn Phương Anh",
      "employee_code": "25028",
      "email": "anhnp1@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Ph%C6%B0%C6%A1ng%20Anh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 20,
      "name": "Hoàng Tuấn Anh",
      "employee_code": "25030",
      "email": "Anhht@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ho%C3%A0ng%20Tu%E1%BA%A5n%20Anh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 21,
      "name": "Lê Thị Hồng Vân",
      "employee_code": "26006",
      "email": "Vanlth@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20Th%E1%BB%8B%20H%E1%BB%93ng%20V%C3%A2n&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 22,
      "name": "Nguyễn Sĩ Thạch",
      "employee_code": "26013",
      "email": "nguyen.si.thach@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20S%C4%A9%20Th%E1%BA%A1ch&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 23,
      "name": "Nguyễn Mạnh Hoàng",
      "employee_code": "20003",
      "email": "hoangnh@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20M%E1%BA%A1nh%20Ho%C3%A0ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 24,
      "name": "Đặng Đức Hoàng",
      "employee_code": "21003",
      "email": "duchoang@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%E1%BA%B7ng%20%C4%90%E1%BB%A9c%20Ho%C3%A0ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 25,
      "name": "Nguyễn Thị Hà Giang",
      "employee_code": "24003",
      "email": "giangnth@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20H%C3%A0%20Giang&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 26,
      "name": "Nguyễn Hà Quỳnh Anh",
      "employee_code": "24005",
      "email": "anhnhq@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20H%C3%A0%20Qu%E1%BB%B3nh%20Anh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 27,
      "name": "Nguyễn Thị Thu Giang",
      "employee_code": "25042",
      "email": "Giangnt@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20Thu%20Giang&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 28,
      "name": "Tô Hồng Đức",
      "employee_code": "26001",
      "email": "Ducth@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=T%C3%B4%20H%E1%BB%93ng%20%C4%90%E1%BB%A9c&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 29,
      "name": "Trần Thị Thanh Thùy",
      "employee_code": "26005",
      "email": "Thuyttt@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Tr%E1%BA%A7n%20Th%E1%BB%8B%20Thanh%20Th%C3%B9y&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 30,
      "name": "Lê Đức Minh",
      "employee_code": "26023",
      "email": "Minhld@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20%C4%90%E1%BB%A9c%20Minh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 31,
      "name": "Đào Thị Thùy",
      "employee_code": "20002",
      "email": "daothuy@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%C3%A0o%20Th%E1%BB%8B%20Th%C3%B9y&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 32,
      "name": "Ngô Khánh Vi",
      "employee_code": "22002",
      "email": "vink@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ng%C3%B4%20Kh%C3%A1nh%20Vi&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 33,
      "name": "Nguyễn Thảo Vy",
      "employee_code": "25003",
      "email": "vynt@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BA%A3o%20Vy&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 34,
      "name": "Vũ Thị Bích Ngọc",
      "employee_code": "26019",
      "email": "Ngocvtb@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=V%C5%A9%20Th%E1%BB%8B%20B%C3%ADch%20Ng%E1%BB%8Dc&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 35,
      "name": "Đào Gia Linh",
      "employee_code": "26021",
      "email": "Linhdg@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%C3%A0o%20Gia%20Linh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 36,
      "name": "Nguyễn Thị Huyền",
      "employee_code": "26026",
      "email": "Huyennt1@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20Huy%E1%BB%81n&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 37,
      "name": "Đào Thu Hà",
      "employee_code": "22004",
      "email": "hadt@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%C3%A0o%20Thu%20H%C3%A0&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 38,
      "name": "Vũ Anh Duy",
      "employee_code": "24004",
      "email": "duyva@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=V%C5%A9%20Anh%20Duy&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 39,
      "name": "Lê Công Hoàng",
      "employee_code": "25011",
      "email": "hoanglc@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20C%C3%B4ng%20Ho%C3%A0ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 40,
      "name": "Vũ Hoàng Duy",
      "employee_code": "25026",
      "email": "duyvh@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=V%C5%A9%20Ho%C3%A0ng%20Duy&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 41,
      "name": "Nguyễn Ngọc Thắng",
      "employee_code": "25032",
      "email": "Thangnn@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Ng%E1%BB%8Dc%20Th%E1%BA%AFng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 42,
      "name": "Nguyễn Anh Tuấn",
      "employee_code": "25045",
      "email": "Tuanna@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Anh%20Tu%E1%BA%A5n&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 43,
      "name": "Phùng Vân Anh",
      "employee_code": "25046",
      "email": "Anhpv@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ph%C3%B9ng%20V%C3%A2n%20Anh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 44,
      "name": "Nguyễn Thị Hồng",
      "employee_code": "17001",
      "email": "nguyenhong@newdaymedia.com.vn",
      "department_id": 8,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20H%E1%BB%93ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 45,
      "name": "Nguyễn Phương Anh",
      "employee_code": "10004",
      "email": "anhnp@newdaymedia.com.vn",
      "department_id": 8,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Ph%C6%B0%C6%A1ng%20Anh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 46,
      "name": "Lê Thương Huyền",
      "employee_code": "24007",
      "email": "huyenlt@newdaymedia.com.vn",
      "department_id": 8,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20Th%C6%B0%C6%A1ng%20Huy%E1%BB%81n&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 47,
      "name": "Nguyễn Thu Hà",
      "employee_code": "25017",
      "email": "hant@newdaymedia.com.vn",
      "department_id": 8,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Thu%20H%C3%A0&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 48,
      "name": "Nguyễn Thị Thu Hoài",
      "employee_code": "25039",
      "email": "Hoaintt@newdaymedia.com.vn",
      "department_id": 8,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20Thu%20Ho%C3%A0i&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 49,
      "name": "Bùi Hữu Đức",
      "employee_code": "25041",
      "email": "Ducbh@newdaymedia.com.vn",
      "department_id": 8,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=B%C3%B9i%20H%E1%BB%AFu%20%C4%90%E1%BB%A9c&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 50,
      "name": "Bạch Thị Lệ Hằng",
      "employee_code": "25015",
      "email": "hangbtl@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=B%E1%BA%A1ch%20Th%E1%BB%8B%20L%E1%BB%87%20H%E1%BA%B1ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 51,
      "name": "Ngô Thị Hồng Hải",
      "employee_code": "25021",
      "email": "Hainth@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ng%C3%B4%20Th%E1%BB%8B%20H%E1%BB%93ng%20H%E1%BA%A3i&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 52,
      "name": "Hoàng Thị Thu Trang",
      "employee_code": "26028",
      "email": "Tranghtt@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ho%C3%A0ng%20Th%E1%BB%8B%20Thu%20Trang&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 53,
      "name": "Lê Văn Thịnh",
      "employee_code": "26031",
      "email": "Thinhlv@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20V%C4%83n%20Th%E1%BB%8Bnh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 54,
      "name": "Phạm Thị Xuyến",
      "employee_code": "26018",
      "email": "Không có",
      "department_id": 9,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20Th%E1%BB%8B%20Xuy%E1%BA%BFn&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 55,
      "name": "Hoàng Thị Thoa",
      "employee_code": "26007",
      "email": "Thoaht1@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ho%C3%A0ng%20Th%E1%BB%8B%20Thoa&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 56,
      "name": "Đỗ Mỹ Linh",
      "employee_code": "25043",
      "email": "Linhdm@newdaymedia.com.vn",
      "department_id": 10,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%E1%BB%97%20M%E1%BB%B9%20Linh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 57,
      "name": "Văn Thị Hoàng Ngân",
      "employee_code": "26024",
      "email": "Nganvth@newdaymedia.com.vn",
      "department_id": 10,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=V%C4%83n%20Th%E1%BB%8B%20Ho%C3%A0ng%20Ng%C3%A2n&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 58,
      "name": "Kiều Như Quỳnh",
      "employee_code": "26030",
      "email": "Quynhkn@newdaymedia.com.vn",
      "department_id": 10,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ki%E1%BB%81u%20Nh%C6%B0%20Qu%E1%BB%B3nh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 59,
      "name": "Lê Quốc Quỳnh",
      "employee_code": "19001",
      "email": "quocquynh@newdaymedia.com.vn",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20Qu%E1%BB%91c%20Qu%E1%BB%B3nh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 60,
      "name": "Đới Sĩ Thanh",
      "employee_code": "16003",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%E1%BB%9Bi%20S%C4%A9%20Thanh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 61,
      "name": "Trần Thế Anh",
      "employee_code": "16002",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Tr%E1%BA%A7n%20Th%E1%BA%BF%20Anh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 62,
      "name": "Phạm Văn Vui",
      "employee_code": "25005",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20V%C4%83n%20Vui&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 63,
      "name": "Nguyễn Hữu Thanh",
      "employee_code": "25007",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20H%E1%BB%AFu%20Thanh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 64,
      "name": "Ngô Văn Luyến",
      "employee_code": "25008",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ng%C3%B4%20V%C4%83n%20Luy%E1%BA%BFn&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 65,
      "name": "Lương Sỹ Thanh",
      "employee_code": "25033",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=L%C6%B0%C6%A1ng%20S%E1%BB%B9%20Thanh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 66,
      "name": "Phạm Văn Hùng",
      "employee_code": "25034",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20V%C4%83n%20H%C3%B9ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 67,
      "name": "Phạm Văn Điệp",
      "employee_code": "26010",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20V%C4%83n%20%C4%90i%E1%BB%87p&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 68,
      "name": "Phạm Văn Tươi",
      "employee_code": "26011",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20V%C4%83n%20T%C6%B0%C6%A1i&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 69,
      "name": "Lê Trọng Vương",
      "employee_code": "26029",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20Tr%E1%BB%8Dng%20V%C6%B0%C6%A1ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 70,
      "name": "Trịnh Thị Ngoan",
      "employee_code": "10005",
      "email": "Không có",
      "department_id": 12,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Tr%E1%BB%8Bnh%20Th%E1%BB%8B%20Ngoan&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 71,
      "name": "Phạm Văn Hòa",
      "employee_code": "10006",
      "email": "Không có",
      "department_id": 12,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20V%C4%83n%20H%C3%B2a&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 72,
      "name": "Phạm Văn Trang",
      "employee_code": "ko có mã",
      "email": "Không có",
      "department_id": 12,
      "position": "",
      "status": "Đang hoạt động",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20V%C4%83n%20Trang&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 73,
      "name": "Nguyễn Hoài Yến Nhi",
      "employee_code": "NV-073",
      "email": "nguyen.hoai.yen.nhi@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Ho%C3%A0i%20Y%E1%BA%BFn%20Nhi&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 74,
      "name": "Đặng Thị Nga",
      "employee_code": "NV-074",
      "email": "dang.thi.nga@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%E1%BA%B7ng%20Th%E1%BB%8B%20Nga&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 75,
      "name": "Vũ Tùng Lâm",
      "employee_code": "25004",
      "email": "Lamvt@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=V%C5%A9%20T%C3%B9ng%20L%C3%A2m&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 76,
      "name": "Nguyễn Gia Phong",
      "employee_code": "25010",
      "email": "phongng@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Gia%20Phong&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 77,
      "name": "Nguyễn Ngọc Minh Uyên",
      "employee_code": "22005",
      "email": "uyennnm@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Ng%E1%BB%8Dc%20Minh%20Uy%C3%AAn&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 78,
      "name": "Nguyễn Thị Vân Dung",
      "employee_code": "25016",
      "email": "dungntv@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20V%C3%A2n%20Dung&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 79,
      "name": "Phạm Thanh Long",
      "employee_code": "25019",
      "email": "Longpt@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20Thanh%20Long&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 80,
      "name": "Phạm Thị Ánh Tuệ",
      "employee_code": "24002",
      "email": "tuepa@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20Th%E1%BB%8B%20%C3%81nh%20Tu%E1%BB%87&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 81,
      "name": "Nguyễn Phó Đại",
      "employee_code": "25006",
      "email": "Không có",
      "department_id": 11,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Ph%C3%B3%20%C4%90%E1%BA%A1i&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 82,
      "name": "Bùi Thị Quý Thương",
      "employee_code": "25013",
      "email": "thuongbtq@newdaymedia.com.vn",
      "department_id": 8,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=B%C3%B9i%20Th%E1%BB%8B%20Qu%C3%BD%20Th%C6%B0%C6%A1ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 83,
      "name": "Nguyễn Phương Ngọc",
      "employee_code": "25023",
      "email": "Ngocnp@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Ph%C6%B0%C6%A1ng%20Ng%E1%BB%8Dc&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 84,
      "name": "Phan Minh Anh",
      "employee_code": "25024",
      "email": "Anhpm@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Phan%20Minh%20Anh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 85,
      "name": "Nguyễn Thị Quỳnh Nga",
      "employee_code": "25031",
      "email": "Ngantq@newdaymedia.com.vn",
      "department_id": 8,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20Qu%E1%BB%B3nh%20Nga&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 86,
      "name": "Đinh Ngọc Thành",
      "employee_code": "25029",
      "email": "Thanhdn@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90inh%20Ng%E1%BB%8Dc%20Th%C3%A0nh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 87,
      "name": "Nguyễn Thị Thùy Linh",
      "employee_code": "25036",
      "email": "Linhntt@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20Th%C3%B9y%20Linh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 88,
      "name": "Trần Ánh Diệp",
      "employee_code": "25035",
      "email": "diepta@newdaymedia.com.vn",
      "department_id": 8,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Tr%E1%BA%A7n%20%C3%81nh%20Di%E1%BB%87p&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 89,
      "name": "Nguyễn Tuấn Minh",
      "employee_code": "25014",
      "email": "minhnt@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Tu%E1%BA%A5n%20Minh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 90,
      "name": "Lê Văn Kha",
      "employee_code": "15001",
      "email": "vankha@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20V%C4%83n%20Kha&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 91,
      "name": "Nguyễn Gia Linh",
      "employee_code": "25040",
      "email": "Linhng@newdaymedia.com.vn",
      "department_id": 2,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Gia%20Linh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 92,
      "name": "Tạ Thanh Tùng",
      "employee_code": "26002",
      "email": "Tungtt@newdaymedia.com.vn",
      "department_id": 10,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=T%E1%BA%A1%20Thanh%20T%C3%B9ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 93,
      "name": "Đặng Nguyễn Trà My",
      "employee_code": "23003",
      "email": "mydnt@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%E1%BA%B7ng%20Nguy%E1%BB%85n%20Tr%C3%A0%20My&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 94,
      "name": "Trần Thị Huyền",
      "employee_code": "25037",
      "email": "huyentt@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Tr%E1%BA%A7n%20Th%E1%BB%8B%20Huy%E1%BB%81n&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 95,
      "name": "Lê Trang Nhung",
      "employee_code": "25027",
      "email": "nhunglt@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20Trang%20Nhung&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 96,
      "name": "Lương Văn Tuấn",
      "employee_code": "23004",
      "email": "tuanlv@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=L%C6%B0%C6%A1ng%20V%C4%83n%20Tu%E1%BA%A5n&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 97,
      "name": "Nguyễn Thu Phương",
      "employee_code": "k co mã",
      "email": "nguyen.thu.phuong@newdaymedia.com.vn",
      "department_id": 10,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Thu%20Ph%C6%B0%C6%A1ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 98,
      "name": "Phạm Thị Kim Huệ",
      "employee_code": "25044",
      "email": "Hueptk@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20Th%E1%BB%8B%20Kim%20Hu%E1%BB%87&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 99,
      "name": "Trần Thành Mai Hương",
      "employee_code": "24008",
      "email": "huongttm@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Tr%E1%BA%A7n%20Th%C3%A0nh%20Mai%20H%C6%B0%C6%A1ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 100,
      "name": "Nguỵ Thị Vân Anh",
      "employee_code": "25018",
      "email": "anhnv@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Ngu%E1%BB%B5%20Th%E1%BB%8B%20V%C3%A2n%20Anh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 101,
      "name": "Phạm Phương Nhung",
      "employee_code": "25001",
      "email": "nhungpp@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20Ph%C6%B0%C6%A1ng%20Nhung&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 102,
      "name": "Nguyễn Cát Tường Anh",
      "employee_code": "26009",
      "email": "Anhnct@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20C%C3%A1t%20T%C6%B0%E1%BB%9Dng%20Anh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 103,
      "name": "Nguyễn Quang Thành",
      "employee_code": "26008",
      "email": "Thanhnq@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Quang%20Th%C3%A0nh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 104,
      "name": "Phan Lê Minh Khôi",
      "employee_code": "23005",
      "email": "khoiplm@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Phan%20L%C3%AA%20Minh%20Kh%C3%B4i&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 105,
      "name": "Quách Phương Thảo",
      "employee_code": "25009",
      "email": "thaoqp@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Qu%C3%A1ch%20Ph%C6%B0%C6%A1ng%20Th%E1%BA%A3o&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 106,
      "name": "Phạm Ngọc Anh",
      "employee_code": "25002",
      "email": "anhpn@newdaymedia.com.vn",
      "department_id": 6,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Ph%E1%BA%A1m%20Ng%E1%BB%8Dc%20Anh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 107,
      "name": "Nguyễn Diệu Hằng",
      "employee_code": "26015",
      "email": "Hangnd@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Di%E1%BB%87u%20H%E1%BA%B1ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 108,
      "name": "Đỗ Thị Chúc",
      "employee_code": "25020",
      "email": "Không có",
      "department_id": 12,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%E1%BB%97%20Th%E1%BB%8B%20Ch%C3%BAc&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 109,
      "name": "Nguyễn Mai Hương",
      "employee_code": "26004",
      "email": "huongnm@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Mai%20H%C6%B0%C6%A1ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 110,
      "name": "Nguyễn Hồng Nhung",
      "employee_code": "25022",
      "email": "nhungnh@newdaymedia.com.vn",
      "department_id": 8,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20H%E1%BB%93ng%20Nhung&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 111,
      "name": "Nguyễn Tài Đại",
      "employee_code": "26012",
      "email": "Daint@newdaymedia.com.vn",
      "department_id": 11,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20T%C3%A0i%20%C4%90%E1%BA%A1i&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 112,
      "name": "Nguyễn Thành Long",
      "employee_code": "22003",
      "email": "longnt@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%C3%A0nh%20Long&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 113,
      "name": "Nguyễn Duy Hưng",
      "employee_code": "26017",
      "email": "Hungnd@newdaymedia.com.vn",
      "department_id": 3,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Duy%20H%C6%B0ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 114,
      "name": "Nguyễn Chí Hiếu",
      "employee_code": "25025",
      "email": "Hieunc@newdaymedia.com.vn",
      "department_id": 5,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Ch%C3%AD%20Hi%E1%BA%BFu&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 115,
      "name": "Nguyễn Ngọc Huyền",
      "employee_code": "26016",
      "email": "Huyennn@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Ng%E1%BB%8Dc%20Huy%E1%BB%81n&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 116,
      "name": "Vũ Ngọc Khanh",
      "employee_code": "26022",
      "email": "Khanhvn@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=V%C5%A9%20Ng%E1%BB%8Dc%20Khanh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 117,
      "name": "Lê Lâm Cường",
      "employee_code": "24001",
      "email": "cuongll@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=L%C3%AA%20L%C3%A2m%20C%C6%B0%E1%BB%9Dng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 118,
      "name": "Nguyễn Thị Thùy Linh",
      "employee_code": "26014",
      "email": "Linhntt@newdaymedia.com.vn",
      "department_id": 7,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%E1%BB%8B%20Th%C3%B9y%20Linh&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 119,
      "name": "Đào Duy Tùng",
      "employee_code": "26020",
      "email": "Tungdd@newdaymedia.com.vn",
      "department_id": 9,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=%C4%90%C3%A0o%20Duy%20T%C3%B9ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 120,
      "name": "Tô Thị Thoa",
      "employee_code": "25038",
      "email": "Thoatt@newdaymedia.com.vn",
      "department_id": 10,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=T%C3%B4%20Th%E1%BB%8B%20Thoa&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 121,
      "name": "Nguyễn Thành Công",
      "employee_code": "26025",
      "email": "congnt@newdaymedia.com.vn",
      "department_id": 4,
      "position": "",
      "status": "Đã nghỉ việc",
      "avatar": "https://ui-avatars.com/api/?name=Nguy%E1%BB%85n%20Th%C3%A0nh%20C%C3%B4ng&background=random",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "assets": [
    {
      "id": 1,
      "asset_code": "LT001",
      "name": "LT001 (Laptop)",
      "config": "- Chip: 12th Gen Intel(R) Core(TM) i5-1235U\n- Ram: 16 GB\n- Card màn hình: 128 MB\n- Ổ cứng: 477 GB",
      "category_id": 1,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 110,
      "user_name": "Nguyễn Hồng Nhung",
      "status": "Active",
      "brand": "Lenovo",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "asset_code": "LT002",
      "name": "LT002 (Laptop)",
      "config": "- Chip: Intel(R) Core(TM) i7-1065G7 CPU @ 1.30GHZ\n- Ram: 16 GB\n- Card màn hình: 128 MB\n- Ổ cứng: 954 GB\n- Màu: bạc",
      "category_id": 1,
      "location": "Phòng Creative",
      "purchase_date": "01/12/2025",
      "user_id": 27,
      "user_name": "Nguyễn Thị Thu Giang",
      "status": "Active",
      "brand": "Máy tính Surface pro 7",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "asset_code": "LT003",
      "name": "LT003 (Laptop)",
      "config": "- Chip: Intel(R) Core(TM) i7-1065G7 CPU @ 1.30GHz\n- Ram: 32 GB\n- Card màn hình: 128 MB\n- Ổ cứng: 954 GB\n- Màu sắc: bạc",
      "category_id": 1,
      "location": "Phòng Creative",
      "purchase_date": "30/09/2020",
      "user_id": 23,
      "user_name": "Nguyễn Mạnh Hoàng",
      "status": "Active",
      "brand": "Máy tính Surface book 3",
      "notes": "Hoàng quản lý và máy dùng cho 2 bạn concept artist dùng khi đi công tác",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "asset_code": "LT004",
      "name": "LT004 (Laptop)",
      "config": "- Chip: Snapdragon(R) X 12- Core X1E80100 @ 3.40 GHz\n- Ram: 32 GB\n- Card màn hình: 128 MB\n- Ổ cứng: 954 GB\n- Màu sắc: bạc",
      "category_id": 1,
      "location": "Phòng Creative",
      "purchase_date": "46183",
      "user_id": 23,
      "user_name": "Nguyễn Mạnh Hoàng",
      "status": "Active",
      "brand": "Máy tính surface 11 pro",
      "notes": "Mua mới ngày 10/06/2026 cấp cho Mạnh Hoàng",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 5,
      "asset_code": "LT005",
      "name": "LT005 (Laptop)",
      "config": "- Ram\n- Card màn hình\n- Màu sắc:",
      "category_id": 1,
      "location": "Khu vực BP Event",
      "purchase_date": "01/04/2024",
      "user_id": 117,
      "user_name": "Lê Lâm Cường",
      "status": "Active",
      "brand": "Máy tính Dell",
      "notes": "Cường quản lý và máy dùng chung cho phòng Event đi công tác",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 6,
      "asset_code": "LT006",
      "name": "LT006 (Laptop)",
      "config": "- Ram\n- Card màn hình\n- Màu sắc: hồng",
      "category_id": 1,
      "location": "Kho",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "Máy tính Surface laptop",
      "notes": "22/06/2026 Giang có báo hỏng không bật lên nguồn, tuy nhiên sau đó lại mở dùng đc",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 7,
      "asset_code": "PC001",
      "name": "PC001 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Khu vực lễ tân",
      "purchase_date": "45877",
      "user_id": 51,
      "user_name": "Ngô Thị Hồng Hải",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 8,
      "asset_code": "PC002",
      "name": "PC002 (Máy tính bàn PC)",
      "config": "- Chip: Intel(R) Core(TM) i3-6100 CPU @ 3.70GHz\n- Ram: 16 GB\n- Card màn hình:\n- Ổ cứng:",
      "category_id": 2,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 82,
      "user_name": "Bùi Thị Quý Thương",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 9,
      "asset_code": "PC003",
      "name": "PC003 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 46,
      "user_name": "Lê Thương Huyền",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 10,
      "asset_code": "PC004",
      "name": "PC004 (Máy tính bàn PC)",
      "config": "- Chip: 12th Gen Intel(R) Core(TM) i5-12400\n- Ram: 32 GB\n- Card màn hình: 128 MB\n- Ổ cứng: 1.38 TB",
      "category_id": 2,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 47,
      "user_name": "Nguyễn Thu Hà",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 11,
      "asset_code": "PC005",
      "name": "PC005 (Máy tính bàn PC)",
      "config": "- Chip: Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz\n- Ram: 16 GB\n- Card màn hình: 128 MB\n- Ổ cứng: 1.14TB",
      "category_id": 2,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 45,
      "user_name": "Nguyễn Phương Anh",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 12,
      "asset_code": "PC006",
      "name": "PC006 (Máy tính bàn PC)",
      "config": "- Chip: 13th Gen Intel(R) Core(TM) i5-13500\n- Ram: 32 GB\n- Card màn hình: 128 MB\n- Ổ cứng: 2.27 TB",
      "category_id": 2,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 44,
      "user_name": "Nguyễn Thị Hồng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 13,
      "asset_code": "PC007",
      "name": "PC007 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 105,
      "user_name": "Quách Phương Thảo",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 14,
      "asset_code": "PC008",
      "name": "PC008 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 112,
      "user_name": "Nguyễn Thành Long",
      "status": "Active",
      "brand": "",
      "notes": "5T dung lượng ổ cứng, 30T ổ cứng cắm vào,3 ổ cứng di động ( 2T/cái)",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 15,
      "asset_code": "PC009",
      "name": "PC009 (Máy tính bàn PC)",
      "config": "- Chip: 12th Gen Intel(R) Core(TM) i9-12900K\n- Ram: 64 GB\n- Card màn hình: 12 GB\n- Ổ cứng: 20,92 TB",
      "category_id": 2,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 39,
      "user_name": "Lê Công Hoàng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 16,
      "asset_code": "PC010",
      "name": "PC010 (Máy tính bàn PC)",
      "config": "- Chip: AMD Ryzen 9 9900X 12-Core Processor\n- Ram: 128 GB\n- Card màn hình: 18 GB\n- Ổ cứng: 5.46 TB",
      "category_id": 2,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 38,
      "user_name": "Vũ Anh Duy",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 17,
      "asset_code": "PC011",
      "name": "PC011 (Máy tính bàn PC)",
      "config": "- Chip: 12th Gen Intel(R) Core(TM) i9-12900K\n- Ram: 32 GB\n- Card màn hình: 12 GB\n- Ổ cứng: 15,01 TB",
      "category_id": 2,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 40,
      "user_name": "Vũ Hoàng Duy",
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 18,
      "asset_code": "PC012",
      "name": "PC012 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Khu vực BP MKT",
      "purchase_date": "45877",
      "user_id": 31,
      "user_name": "Đào Thị Thùy",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 19,
      "asset_code": "PC013",
      "name": "PC013 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Khu vực BP MKT",
      "purchase_date": "45877",
      "user_id": 32,
      "user_name": "Ngô Khánh Vi",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 20,
      "asset_code": "PC014",
      "name": "PC014 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Khu vực BP MKT",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "Chỗ ngồi Phương Ngọc MKT",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 21,
      "asset_code": "PC015",
      "name": "PC015 (Máy tính bàn PC)",
      "config": "- Chip: Intel(R) Core(TM) i5-10400 CPU @ 2.90GHz\n- Ram: 16 GB\n- Card màn hình: 128 MB\n- Ổ cứng: 1.13 TB",
      "category_id": 2,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 24,
      "user_name": "Đặng Đức Hoàng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 22,
      "asset_code": "PC016",
      "name": "PC016 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 114,
      "user_name": "Nguyễn Chí Hiếu",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 23,
      "asset_code": "PC017",
      "name": "PC017 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Khu vực BP MKT",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "Chỗ ngồi Nguỵ Vân Anh MKT",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 24,
      "asset_code": "PC018",
      "name": "PC018 (Máy tính bàn PC)",
      "config": "- Chip: AMD Ryzen 5 2600X\n- Ram: 24GB\n- Card màn hình: 985MB\n- Ổ cứng: 1.02 TB",
      "category_id": 2,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 16,
      "user_name": "Bùi Xuân Dân",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 25,
      "asset_code": "PC019",
      "name": "PC019 (Máy tính bàn PC)",
      "config": "- Chip: 13th Gen Intel(R) Core(TM) i5-13400F\n- Ram: 16 GB\n- Card màn hình: 8 GB\n- 466 GB",
      "category_id": 2,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 17,
      "user_name": "Hoàng Hà Giang",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 26,
      "asset_code": "PC020",
      "name": "PC020 (Máy tính bàn PC)",
      "config": "-Chip: Intel(R) Core(TM) i3-10105F CPU @ 3.70GHz\n- Ram: 16 GB\n- Card màn hình: 4 GB\n- Ổ cứng: 1.48 TB",
      "category_id": 2,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 80,
      "user_name": "Phạm Thị Ánh Tuệ",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 27,
      "asset_code": "PC021",
      "name": "PC021 (Máy tính bàn PC)",
      "config": "- Chip: Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz\n- Ram: 16 GB\n- Card màn hình: 3 GB\n- Ổ cứng: 1.14 TB",
      "category_id": 2,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 117,
      "user_name": "Lê Lâm Cường",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 28,
      "asset_code": "PC022",
      "name": "PC022 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 90,
      "user_name": "Lê Văn Kha",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 29,
      "asset_code": "PC023",
      "name": "PC023 (Máy tính bàn PC)",
      "config": "- Chip: AMD Ryzen 9 5900X 12-Core Processor\n- Ram: 64 GB\n- Card màn hình: 16 GB\n- Ổ cứng: 3.66 TB",
      "category_id": 2,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "25/05/2020",
      "user_id": 7,
      "user_name": "Hoàng Quốc Nghị",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 30,
      "asset_code": "PC024",
      "name": "PC024 (Máy tính bàn PC)",
      "config": "- Chip: AMD Ryzen 9 5900X 12-Core Processor\n- Ram: 64 GB\n- Card màn hình: 16 GB\n- Ổ cứng: 2.75 TB",
      "category_id": 2,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "06/09/2021",
      "user_id": 8,
      "user_name": "Nguyễn Việt Thắng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 31,
      "asset_code": "PC025",
      "name": "PC025 (Máy tính bàn PC)",
      "config": "- Chip: 12th Gen Intel(R) Core(TM) i5-12400\n- Ram: 32 GB\n- Card màn hình: 4 GB\n- Ổ cứng: 3.87 TB",
      "category_id": 2,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "13/09/2021",
      "user_id": 9,
      "user_name": "Nguyễn Phương Mai",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 32,
      "asset_code": "PC026",
      "name": "PC026 (Máy tính bàn PC)",
      "config": "- Chip: Intel(R) Core(TM) i9-9900K CPU @ 3.60GHz\n- Ram: 32 GB\n- Card màn hình: 6 GB\n- Ổ cứng: 4.09 TB",
      "category_id": 2,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "20/02/2023",
      "user_id": 10,
      "user_name": "Thái Thị Thanh Thảo",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 33,
      "asset_code": "PC027",
      "name": "PC027 (Máy tính bàn PC)",
      "config": "- Chip: AMD Ryzen 9 5900X 12-Core Processor\n- Ram: 32 GB\n- Card màn hình: 6 GB\n- Ổ cứng: 2.27 TB",
      "category_id": 2,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "02/03/2026",
      "user_id": 96,
      "user_name": "Lương Văn Tuấn",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 34,
      "asset_code": "PC028",
      "name": "PC028 (Máy tính bàn PC)",
      "config": "- Chip: AMD Ryzen 9 5900X 12-Core Processor\n- Ram: 32 GB\n- Card màn hình: 12 GB\n- Ổ cứng: 4.09 TB",
      "category_id": 2,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "28/02/2023",
      "user_id": 11,
      "user_name": "Vũ Thị Mai Linh",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 35,
      "asset_code": "PC029",
      "name": "PC029 (Máy tính bàn PC)",
      "config": "- Chip: Intel(R) Core(TM) i7-10700 CPU @ 2.90GHz\n- Ram: 32 GB\n- Card màn hình: 6 GB\n- Ổ cứng: 2.05 TB",
      "category_id": 2,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "15/08/2024",
      "user_id": 12,
      "user_name": "Nguyễn Thị Thuỷ Tiên",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 36,
      "asset_code": "PC030",
      "name": "PC030 (Máy tính bàn PC)",
      "config": "- Chip: Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz\n- Ram: 16 GB\n- Card màn hình: 6 GB\n- Ổ cứng: 1.14 TB",
      "category_id": 2,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "26/12/2024",
      "user_id": 13,
      "user_name": "Bùi Trịnh Tuệ Khanh",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 37,
      "asset_code": "PC031",
      "name": "PC031 (Máy tính bàn PC)",
      "config": "- Chip: AMD Ryzen 9 5900X\n- Ram : 32G\n- Card màn hình: 12GB\n- Ổ cứng: 2,73TB",
      "category_id": 2,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "08/12/2025",
      "user_id": 86,
      "user_name": "Đinh Ngọc Thành",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 38,
      "asset_code": "PC032",
      "name": "PC032 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "2024-01-01",
      "user_id": 101,
      "user_name": "Phạm Phương Nhung",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 39,
      "asset_code": "PC033",
      "name": "PC033 (Máy tính bàn PC)",
      "config": "- Chip: Intel(R) Core(TM) i7-10700 CPU @ 2.90GHz\n- Ram: 16 GB\n- Card màn hình: 128 MB\n- Ổ cứng: 2.26 TB",
      "category_id": 2,
      "location": "Khu vực BP Creative",
      "purchase_date": "05/01/2026",
      "user_id": 23,
      "user_name": "Nguyễn Mạnh Hoàng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 40,
      "asset_code": "PC034",
      "name": "PC034 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 41,
      "asset_code": "PC035",
      "name": "PC035 (Máy tính bàn PC)",
      "config": "- Chip: 13th Gen Intel(R) Core(TM) i5-13400F\n- Ram: 16 GB\n- Card màn hình: 12 GB\n- Ổ cứng: 466 GB",
      "category_id": 2,
      "location": "Khu vực BP Event",
      "purchase_date": "03/09/2025",
      "user_id": 20,
      "user_name": "Hoàng Tuấn Anh",
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 42,
      "asset_code": "PC036",
      "name": "PC036 (Máy tính bàn PC)",
      "config": "- Chip: Intel(R) Core(TM) i7-10700 CPU@ 2.90GHz\n- Ram: 16 GB\n- Card màn hình: 128 MB\n- Ổ cứng: 1.14 TB",
      "category_id": 2,
      "location": "Khu vực BP Creative",
      "purchase_date": "03/08/2026",
      "user_id": 30,
      "user_name": "Lê Đức Minh",
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 43,
      "asset_code": "PC037",
      "name": "PC037 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 44,
      "asset_code": "PC038",
      "name": "PC038 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 45,
      "asset_code": "PC039",
      "name": "PC039 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 46,
      "asset_code": "PC040",
      "name": "PC040 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 47,
      "asset_code": "PC041",
      "name": "PC041 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 48,
      "asset_code": "PC042",
      "name": "PC042 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 49,
      "asset_code": "PC043",
      "name": "PC043 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 50,
      "asset_code": "PC044",
      "name": "PC044 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 51,
      "asset_code": "PC045",
      "name": "PC045 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 52,
      "asset_code": "PC046",
      "name": "PC046 (Máy tính bàn PC)",
      "config": "- Chip: AMD Ryzen 5 3500X 6-Core Processor\n- Ram: 16 GB\n- Card màn hình: 984 MB\n- Ổ cứng: 1.14 TB",
      "category_id": 2,
      "location": "Khu vực BP Event",
      "purchase_date": "09/06/2025",
      "user_id": 18,
      "user_name": "Dương Nguyên Bảo",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 53,
      "asset_code": "PC047",
      "name": "PC047 (Máy tính bàn PC)",
      "config": "- AMD Ryzen 9 9950X 16-Core Processor\n- Ram: 128 GB\n- Card màn hình: 16 GB\n- Ổ cứng: 7,28 TB",
      "category_id": 2,
      "location": "Khu vực BP Video",
      "purchase_date": "45917",
      "user_id": 39,
      "user_name": "Lê Công Hoàng",
      "status": "Active",
      "brand": "",
      "notes": "PC047 - mới mua ngày. 17/09/2025",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 54,
      "asset_code": "PC048",
      "name": "PC048 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 55,
      "asset_code": "PC049",
      "name": "PC049 (Máy tính bàn PC)",
      "config": "",
      "category_id": 2,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 56,
      "asset_code": "PC050",
      "name": "PC050 (Máy tính bàn PC)",
      "config": "- Chip: Intel(R) Core(TM) i5-14600KF\n- Ram: 32 GB\n- Card màn hình: 12 GB\n- Ổ cứng: 954 GB",
      "category_id": 2,
      "location": "Khu vực BP Event",
      "purchase_date": "45931",
      "user_id": 16,
      "user_name": "Bùi Xuân Dân",
      "status": "Active",
      "brand": "",
      "notes": "PC050 - mới mua ngày 1/10/2025",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 57,
      "asset_code": "MH001",
      "name": "MH001 (Màn hình máy tính)",
      "config": "Dell 21.45inch",
      "category_id": 3,
      "location": "Khu vực lễ tân",
      "purchase_date": "45877",
      "user_id": 51,
      "user_name": "Ngô Thị Hồng Hải",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 58,
      "asset_code": "MH002",
      "name": "MH002 (Màn hình máy tính)",
      "config": "Dell 21.45inch",
      "category_id": 3,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 82,
      "user_name": "Bùi Thị Quý Thương",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 59,
      "asset_code": "MH003",
      "name": "MH003 (Màn hình máy tính)",
      "config": "Dell 24inch",
      "category_id": 3,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 46,
      "user_name": "Lê Thương Huyền",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 60,
      "asset_code": "MH004",
      "name": "MH004 (Màn hình máy tính)",
      "config": "Dell 24 inch",
      "category_id": 3,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 47,
      "user_name": "Nguyễn Thu Hà",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 61,
      "asset_code": "MH005",
      "name": "MH005 (Màn hình máy tính)",
      "config": "Dell 22 inch",
      "category_id": 3,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 45,
      "user_name": "Nguyễn Phương Anh",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 62,
      "asset_code": "MH006",
      "name": "MH006 (Màn hình máy tính)",
      "config": "Dell 23.6 inch",
      "category_id": 3,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 44,
      "user_name": "Nguyễn Thị Hồng",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 63,
      "asset_code": "MH007",
      "name": "MH007 (Màn hình máy tính)",
      "config": "Dell 24 inch",
      "category_id": 3,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 105,
      "user_name": "Quách Phương Thảo",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 64,
      "asset_code": "MH008",
      "name": "MH008 (Màn hình máy tính)",
      "config": "Dell 24 inch",
      "category_id": 3,
      "location": "Khu vực BP Video",
      "purchase_date": "08/085/2025",
      "user_id": 112,
      "user_name": "Nguyễn Thành Long",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 65,
      "asset_code": "MH009",
      "name": "MH009 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 39,
      "user_name": "Lê Công Hoàng",
      "status": "Active",
      "brand": "Asus pro",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 66,
      "asset_code": "MH010",
      "name": "MH010 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 38,
      "user_name": "Vũ Anh Duy",
      "status": "Active",
      "brand": "Asus Pro",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 67,
      "asset_code": "MH011",
      "name": "MH011 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 40,
      "user_name": "Vũ Hoàng Duy",
      "status": "Active",
      "brand": "Asus pro",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 68,
      "asset_code": "MH012",
      "name": "MH012 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP MKT",
      "purchase_date": "45877",
      "user_id": 31,
      "user_name": "Đào Thị Thùy",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 69,
      "asset_code": "MH013",
      "name": "MH013 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP MKT",
      "purchase_date": "45877",
      "user_id": 32,
      "user_name": "Ngô Khánh Vi",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 70,
      "asset_code": "MH014",
      "name": "MH014 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực lễ tân",
      "purchase_date": "45877",
      "user_id": 50,
      "user_name": "Bạch Thị Lệ Hằng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 71,
      "asset_code": "MH015",
      "name": "MH015 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 24,
      "user_name": "Đặng Đức Hoàng",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 72,
      "asset_code": "MH016",
      "name": "MH016 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 114,
      "user_name": "Nguyễn Chí Hiếu",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 73,
      "asset_code": "MH017",
      "name": "MH017 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 23,
      "user_name": "Nguyễn Mạnh Hoàng",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 74,
      "asset_code": "MH018",
      "name": "MH018 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 16,
      "user_name": "Bùi Xuân Dân",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 75,
      "asset_code": "MH019",
      "name": "MH019 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 17,
      "user_name": "Hoàng Hà Giang",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 76,
      "asset_code": "MH020",
      "name": "MH020 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 80,
      "user_name": "Phạm Thị Ánh Tuệ",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 77,
      "asset_code": "MH021",
      "name": "MH021 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 117,
      "user_name": "Lê Lâm Cường",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 78,
      "asset_code": "MH022",
      "name": "MH022 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 90,
      "user_name": "Lê Văn Kha",
      "status": "Active",
      "brand": "MAC",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 79,
      "asset_code": "MH023",
      "name": "MH023 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "2024-01-01",
      "user_id": 7,
      "user_name": "Hoàng Quốc Nghị",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 80,
      "asset_code": "MH024",
      "name": "MH024 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "06/09/2021",
      "user_id": 8,
      "user_name": "Nguyễn Việt Thắng",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 81,
      "asset_code": "MH025",
      "name": "MH025 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "13/09/2021",
      "user_id": 9,
      "user_name": "Nguyễn Phương Mai",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 82,
      "asset_code": "MH026",
      "name": "MH026 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "20/02/2023",
      "user_id": 10,
      "user_name": "Thái Thị Thanh Thảo",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 83,
      "asset_code": "MH027",
      "name": "MH027 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "02/03/2026",
      "user_id": 96,
      "user_name": "Lương Văn Tuấn",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 84,
      "asset_code": "MH028",
      "name": "MH028 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "28/02/2023",
      "user_id": 11,
      "user_name": "Vũ Thị Mai Linh",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 85,
      "asset_code": "MH029",
      "name": "MH029 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "15/08/2024",
      "user_id": 12,
      "user_name": "Nguyễn Thị Thuỷ Tiên",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 86,
      "asset_code": "MH030",
      "name": "MH030 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "26/12/2024",
      "user_id": 13,
      "user_name": "Bùi Trịnh Tuệ Khanh",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 87,
      "asset_code": "MH031",
      "name": "MH031 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "08/12/2025",
      "user_id": 86,
      "user_name": "Đinh Ngọc Thành",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 88,
      "asset_code": "MH032",
      "name": "MH032 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "2024-01-01",
      "user_id": 101,
      "user_name": "Phạm Phương Nhung",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 89,
      "asset_code": "MH033",
      "name": "MH033 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Video",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "Chỗ ngồi Phương Ngọc MKT",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 90,
      "asset_code": "MH034",
      "name": "MH034 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Video",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "Dell",
      "notes": "Chỗ ngồi Nguỵ Vân Anh MKT",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 91,
      "asset_code": "MH035",
      "name": "MH035 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Video",
      "purchase_date": "03/09/2025",
      "user_id": 20,
      "user_name": "Hoàng Tuấn Anh",
      "status": "Stock",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 92,
      "asset_code": "MH036",
      "name": "MH036 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Creative",
      "purchase_date": "03/08/2026",
      "user_id": 30,
      "user_name": "Lê Đức Minh",
      "status": "Stock",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 93,
      "asset_code": "MH037",
      "name": "MH037 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Event",
      "purchase_date": "46134",
      "user_id": 6,
      "user_name": "Đặng Thế Quang",
      "status": "Stock",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 94,
      "asset_code": "MH038",
      "name": "MH038 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "25/05/2020",
      "user_id": 7,
      "user_name": "Hoàng Quốc Nghị",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 95,
      "asset_code": "MH039",
      "name": "MH039 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 23,
      "user_name": "Nguyễn Mạnh Hoàng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 96,
      "asset_code": "MH040",
      "name": "MH040 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 38,
      "user_name": "Vũ Anh Duy",
      "status": "Active",
      "brand": "Asus Pro",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 97,
      "asset_code": "MH041",
      "name": "MH041 (Màn hình máy tính)",
      "config": "",
      "category_id": 3,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 37,
      "user_name": "Đào Thu Hà",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 98,
      "asset_code": "BP001",
      "name": "BP001 (Bàn phím)",
      "config": "L411",
      "category_id": 4,
      "location": "Khu vực lễ tân",
      "purchase_date": "45877",
      "user_id": 51,
      "user_name": "Ngô Thị Hồng Hải",
      "status": "Active",
      "brand": "Fuhlen",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 99,
      "asset_code": "BP002",
      "name": "BP002 (Bàn phím)",
      "config": "L411",
      "category_id": 4,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 82,
      "user_name": "Bùi Thị Quý Thương",
      "status": "Active",
      "brand": "Fuhlen",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 100,
      "asset_code": "BP003",
      "name": "BP003 (Bàn phím)",
      "config": "L411",
      "category_id": 4,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 46,
      "user_name": "Lê Thương Huyền",
      "status": "Active",
      "brand": "Fuhlen",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 101,
      "asset_code": "BP004",
      "name": "BP004 (Bàn phím)",
      "config": "L411",
      "category_id": 4,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 47,
      "user_name": "Nguyễn Thu Hà",
      "status": "Active",
      "brand": "Fuhlen",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 102,
      "asset_code": "BP005",
      "name": "BP005 (Bàn phím)",
      "config": "Shiba21K000725",
      "category_id": 4,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 45,
      "user_name": "Nguyễn Phương Anh",
      "status": "Active",
      "brand": "Shiba",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 103,
      "asset_code": "BP006",
      "name": "BP006 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 44,
      "user_name": "Nguyễn Thị Hồng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 104,
      "asset_code": "BP007",
      "name": "BP007 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Video",
      "purchase_date": "2024-01-01",
      "user_id": 105,
      "user_name": "Quách Phương Thảo",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 105,
      "asset_code": "BP008",
      "name": "BP008 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Video",
      "purchase_date": "08/085/2025",
      "user_id": 112,
      "user_name": "Nguyễn Thành Long",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 106,
      "asset_code": "BP009",
      "name": "BP009 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 39,
      "user_name": "Lê Công Hoàng",
      "status": "Active",
      "brand": "Asus pro",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 107,
      "asset_code": "BP010",
      "name": "BP010 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 38,
      "user_name": "Vũ Anh Duy",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 108,
      "asset_code": "BP011",
      "name": "BP011 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Video",
      "purchase_date": "45877",
      "user_id": 40,
      "user_name": "Vũ Hoàng Duy",
      "status": "Stock",
      "brand": "Asus LCD",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 109,
      "asset_code": "BP012",
      "name": "BP012 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP MKT",
      "purchase_date": "45877",
      "user_id": 31,
      "user_name": "Đào Thị Thùy",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 110,
      "asset_code": "BP013",
      "name": "BP013 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP MKT",
      "purchase_date": "45877",
      "user_id": 32,
      "user_name": "Ngô Khánh Vi",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 111,
      "asset_code": "BP014",
      "name": "BP014 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 112,
      "asset_code": "BP015",
      "name": "BP015 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 24,
      "user_name": "Đặng Đức Hoàng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 113,
      "asset_code": "BP016",
      "name": "BP016 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 114,
      "user_name": "Nguyễn Chí Hiếu",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 114,
      "asset_code": "BP017",
      "name": "BP017 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 115,
      "asset_code": "BP018",
      "name": "BP018 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 16,
      "user_name": "Bùi Xuân Dân",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 116,
      "asset_code": "BP019",
      "name": "BP019 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 17,
      "user_name": "Hoàng Hà Giang",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 117,
      "asset_code": "BP020",
      "name": "BP020 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 80,
      "user_name": "Phạm Thị Ánh Tuệ",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 118,
      "asset_code": "BP021",
      "name": "BP021 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 117,
      "user_name": "Lê Lâm Cường",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 119,
      "asset_code": "BP022",
      "name": "BP022 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 90,
      "user_name": "Lê Văn Kha",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 120,
      "asset_code": "BP023",
      "name": "BP023 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "2024-01-01",
      "user_id": 7,
      "user_name": "Hoàng Quốc Nghị",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 121,
      "asset_code": "BP024",
      "name": "BP024 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "2024-01-01",
      "user_id": 8,
      "user_name": "Nguyễn Việt Thắng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 122,
      "asset_code": "BP025",
      "name": "BP025 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "2024-01-01",
      "user_id": 9,
      "user_name": "Nguyễn Phương Mai",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 123,
      "asset_code": "BP026",
      "name": "BP026 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "2024-01-01",
      "user_id": 10,
      "user_name": "Thái Thị Thanh Thảo",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 124,
      "asset_code": "BP027",
      "name": "BP027 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "2024-01-01",
      "user_id": 96,
      "user_name": "Lương Văn Tuấn",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 125,
      "asset_code": "BP028",
      "name": "BP028 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "2024-01-01",
      "user_id": 11,
      "user_name": "Vũ Thị Mai Linh",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 126,
      "asset_code": "BP029",
      "name": "BP029 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "2024-01-01",
      "user_id": 12,
      "user_name": "Nguyễn Thị Thuỷ Tiên",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 127,
      "asset_code": "BP030",
      "name": "BP030 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "26/12/2024",
      "user_id": 13,
      "user_name": "Bùi Trịnh Tuệ Khanh",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 128,
      "asset_code": "BP031",
      "name": "BP031 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "2024-01-01",
      "user_id": 86,
      "user_name": "Đinh Ngọc Thành",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 129,
      "asset_code": "BP032",
      "name": "BP032 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "2024-01-01",
      "user_id": 101,
      "user_name": "Phạm Phương Nhung",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 130,
      "asset_code": "BP033",
      "name": "BP033 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Video",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "Chỗ ngồi Phương Ngọc MKT",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 131,
      "asset_code": "BP034",
      "name": "BP034 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Video",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "Chỗ ngồi Nguỵ Vân Anh MKT",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 132,
      "asset_code": "BP035",
      "name": "BP035 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Creative",
      "purchase_date": "03/09/2025",
      "user_id": 23,
      "user_name": "Nguyễn Mạnh Hoàng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 133,
      "asset_code": "BP036",
      "name": "BP036 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Creative",
      "purchase_date": "30/09/2020",
      "user_id": 23,
      "user_name": "Nguyễn Mạnh Hoàng",
      "status": "Stock",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 134,
      "asset_code": "BP037",
      "name": "BP037 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Event",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 135,
      "asset_code": "BP038",
      "name": "BP038 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 136,
      "asset_code": "BP039",
      "name": "BP039 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 137,
      "asset_code": "BP040",
      "name": "BP040 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 138,
      "asset_code": "BP041",
      "name": "BP041 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 139,
      "asset_code": "BP042",
      "name": "BP042 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 140,
      "asset_code": "BP043",
      "name": "BP043 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 141,
      "asset_code": "BP044",
      "name": "BP044 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 142,
      "asset_code": "BP045",
      "name": "BP045 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 143,
      "asset_code": "BP046",
      "name": "BP046 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Event",
      "purchase_date": "09/06/2025",
      "user_id": 18,
      "user_name": "Dương Nguyên Bảo",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 144,
      "asset_code": "BP047",
      "name": "BP047 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "Khu vực BP Video",
      "purchase_date": "25/09/2025",
      "user_id": 41,
      "user_name": "Nguyễn Ngọc Thắng",
      "status": "Active",
      "brand": "Dell",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 145,
      "asset_code": "BP048",
      "name": "BP048 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 146,
      "asset_code": "BP049",
      "name": "BP049 (Bàn phím)",
      "config": "",
      "category_id": 4,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 147,
      "asset_code": "CH001",
      "name": "CH001 (Chuột)",
      "config": "Không hiển thị",
      "category_id": 5,
      "location": "Khu vực lễ tân",
      "purchase_date": "45877",
      "user_id": 51,
      "user_name": "Ngô Thị Hồng Hải",
      "status": "Active",
      "brand": "Không hiển thị",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 148,
      "asset_code": "CH002",
      "name": "CH002 (Chuột)",
      "config": "Không hiển thị",
      "category_id": 5,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 82,
      "user_name": "Bùi Thị Quý Thương",
      "status": "Active",
      "brand": "Không hiển thị",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 149,
      "asset_code": "CH003",
      "name": "CH003 (Chuột)",
      "config": "G102",
      "category_id": 5,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 46,
      "user_name": "Lê Thương Huyền",
      "status": "Active",
      "brand": "Logitech",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 150,
      "asset_code": "CH004",
      "name": "CH004 (Chuột)",
      "config": "A09B",
      "category_id": 5,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 47,
      "user_name": "Nguyễn Thu Hà",
      "status": "Active",
      "brand": "Fuhlen",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 151,
      "asset_code": "CH005",
      "name": "CH005 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 45,
      "user_name": "Nguyễn Phương Anh",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 152,
      "asset_code": "CH006",
      "name": "CH006 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 44,
      "user_name": "Nguyễn Thị Hồng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 153,
      "asset_code": "CH007",
      "name": "CH007 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Phòng kế toán",
      "purchase_date": "45877",
      "user_id": 110,
      "user_name": "Nguyễn Hồng Nhung",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 154,
      "asset_code": "CH008",
      "name": "CH008 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 23,
      "user_name": "Nguyễn Mạnh Hoàng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 155,
      "asset_code": "CH009",
      "name": "CH009 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 156,
      "asset_code": "CH010",
      "name": "CH010 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Video",
      "purchase_date": "04/04/2024",
      "user_id": 38,
      "user_name": "Vũ Anh Duy",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 157,
      "asset_code": "CH011",
      "name": "CH011 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 158,
      "asset_code": "CH012",
      "name": "CH012 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP MKT",
      "purchase_date": "45877",
      "user_id": 31,
      "user_name": "Đào Thị Thùy",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 159,
      "asset_code": "CH013",
      "name": "CH013 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP MKT",
      "purchase_date": "45877",
      "user_id": 32,
      "user_name": "Ngô Khánh Vi",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 160,
      "asset_code": "CH014",
      "name": "CH014 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Event",
      "purchase_date": "03/09/2025",
      "user_id": 20,
      "user_name": "Hoàng Tuấn Anh",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 161,
      "asset_code": "CH015",
      "name": "CH015 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 24,
      "user_name": "Đặng Đức Hoàng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 162,
      "asset_code": "CH016",
      "name": "CH016 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Creative",
      "purchase_date": "45877",
      "user_id": 114,
      "user_name": "Nguyễn Chí Hiếu",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 163,
      "asset_code": "CH017",
      "name": "CH017 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 164,
      "asset_code": "CH018",
      "name": "CH018 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 16,
      "user_name": "Bùi Xuân Dân",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 165,
      "asset_code": "CH019",
      "name": "CH019 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 17,
      "user_name": "Hoàng Hà Giang",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 166,
      "asset_code": "CH020",
      "name": "CH020 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 80,
      "user_name": "Phạm Thị Ánh Tuệ",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 167,
      "asset_code": "CH021",
      "name": "CH021 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 117,
      "user_name": "Lê Lâm Cường",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 168,
      "asset_code": "CH022",
      "name": "CH022 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Event",
      "purchase_date": "45877",
      "user_id": 90,
      "user_name": "Lê Văn Kha",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 169,
      "asset_code": "CH023",
      "name": "CH023 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "2024-01-01",
      "user_id": 7,
      "user_name": "Hoàng Quốc Nghị",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 170,
      "asset_code": "CH024",
      "name": "CH024 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "2024-01-01",
      "user_id": 8,
      "user_name": "Nguyễn Việt Thắng",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 171,
      "asset_code": "CH025",
      "name": "CH025 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "13/09/2021",
      "user_id": 9,
      "user_name": "Nguyễn Phương Mai",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 172,
      "asset_code": "CH026",
      "name": "CH026 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "20/02/2023",
      "user_id": 10,
      "user_name": "Thái Thị Thanh Thảo",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 173,
      "asset_code": "CH027",
      "name": "CH027 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "02/03/2026",
      "user_id": 96,
      "user_name": "Lương Văn Tuấn",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 174,
      "asset_code": "CH028",
      "name": "CH028 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "28/02/2023",
      "user_id": 11,
      "user_name": "Vũ Thị Mai Linh",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 175,
      "asset_code": "CH029",
      "name": "CH029 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Thiết kế",
      "purchase_date": "15/08/2024",
      "user_id": 12,
      "user_name": "Nguyễn Thị Thuỷ Tiên",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 176,
      "asset_code": "CH030",
      "name": "CH030 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "26/12/2024",
      "user_id": 13,
      "user_name": "Bùi Trịnh Tuệ Khanh",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 177,
      "asset_code": "CH031",
      "name": "CH031 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "08/12/2025",
      "user_id": 86,
      "user_name": "Đinh Ngọc Thành",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 178,
      "asset_code": "CH032",
      "name": "CH032 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Kinh doanh",
      "purchase_date": "2024-01-01",
      "user_id": 101,
      "user_name": "Phạm Phương Nhung",
      "status": "Stock",
      "brand": "",
      "notes": "Chuột hỏng con lăn",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 179,
      "asset_code": "CH033",
      "name": "CH033 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Video",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 180,
      "asset_code": "CH034",
      "name": "CH034 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Video",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 181,
      "asset_code": "CH035",
      "name": "CH035 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Video",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 182,
      "asset_code": "CH036",
      "name": "CH036 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Creative",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 183,
      "asset_code": "CH037",
      "name": "CH037 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Event",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 184,
      "asset_code": "CH038",
      "name": "CH038 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 185,
      "asset_code": "CH039",
      "name": "CH039 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 186,
      "asset_code": "CH040",
      "name": "CH040 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 187,
      "asset_code": "CH041",
      "name": "CH041 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 188,
      "asset_code": "CH042",
      "name": "CH042 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 189,
      "asset_code": "CH043",
      "name": "CH043 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 190,
      "asset_code": "CH044",
      "name": "CH044 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 191,
      "asset_code": "CH045",
      "name": "CH045 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 192,
      "asset_code": "CH046",
      "name": "CH046 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Event",
      "purchase_date": "09/06/2025",
      "user_id": 18,
      "user_name": "Dương Nguyên Bảo",
      "status": "Active",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 193,
      "asset_code": "CH047",
      "name": "CH047 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "Khu vực BP Creative",
      "purchase_date": "2024-01-01",
      "user_id": 28,
      "user_name": "Tô Hồng Đức",
      "status": "Stock",
      "brand": "",
      "notes": "hỏng con lăn",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 194,
      "asset_code": "CH048",
      "name": "CH048 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 195,
      "asset_code": "CH049",
      "name": "CH049 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 196,
      "asset_code": "CH050",
      "name": "CH050 (Chuột)",
      "config": "",
      "category_id": 5,
      "location": "",
      "purchase_date": "2024-01-01",
      "user_id": null,
      "user_name": null,
      "status": "Stock",
      "brand": "",
      "notes": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "license_types": [
    {
      "id": 1,
      "name": "Toon Boom Harmony Premium 22",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "name": "Toon Boom Storyboard Pro",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "name": "Toon Boom Harmony Advanced 22",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "name": "Toon Boom Harmony Premium 22 Monthly",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 5,
      "name": "Clip Studio Paint",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "licenses": [
    {
      "id": 1,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "ebe1-e03a-d15b-4d96-86ad",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Hoàng Hà",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "d3dc-8308-ca77-4743-bcf0",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "My Nguyễn",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "6e02-aa34-dd8a-417f-a747",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Lê Trịnh",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "4ff5-2019-e949-4456-b67c",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Kiệt Đoàn",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 5,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "b221-6347-6727-4ffa-94b5",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Trung Đỗ",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 6,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "f4cb-7f1b-4edd-42eb-bcfc",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Minh Lê",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 7,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Khôi Cao",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 8,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Hiếu Hoàng",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 9,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Yến Nguyễn",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 10,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Quỳnh Trương",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 11,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Nhung Trần",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 12,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Hưng Nguyễn",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 13,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Quốc Anh",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 14,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Trần Thủy",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 15,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Phan Phan",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 16,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Ngọc Nguyễn",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 17,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Thông Phan",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 18,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Permanent",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Kiên Đoàn",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 19,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Yearly/Annual",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Mai Hà",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 20,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Yearly/Annual",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Thi Hoàng",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 21,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Yearly/Annual",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Huy Đỗ",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 22,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Yearly/Annual",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Linh Hoàng",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 23,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Yearly/Annual",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Phúc Nguyễn",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 24,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Yearly/Annual",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Bảo Anh",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 25,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Yearly/Annual",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Hòa Trần",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 26,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0e67-8fc0-3cbc-48da-a454",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Bình Lường",
      "status": "Active",
      "notes": "Bình dùng key: e8c8... vì lỗi 7174 nên Andria gửi lại code mới",
      "invoice": "TB_Harmony_Ha_n_00046145_8_permanent__15_annual.png",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 27,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Diệp Ngọc",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 28,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Thi Hoàng",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 29,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "Trước là Vũ Lương nhưng nay đã nghỉ nên để trống",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 30,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Hằng Nguyễn",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 31,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "Trước là Tuấn Nguyễn nhưng nay đã nghỉ nên để trống",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 32,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Hưng Nguyễn",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 33,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Linh Nguyễn",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 34,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Khanh Nguyễn",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 35,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Vân Trần",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 36,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Quốc Anh",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 37,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Minh Ngô",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 38,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Vy Đinh",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 39,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "Còn trống",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 40,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "Phúc Nguyễn",
      "status": "Active",
      "notes": "HĐ: Last_payment_for_15_license...",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 41,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "e8c8-68d2-e0d8-4ef2-9c4a",
      "package_type": "Yearly/Annual",
      "expiration_date": 45808,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "Còn trống",
      "invoice": "Last_payment_for_15_license...",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 42,
      "key_type": "Toon Boom Storyboard Pro",
      "license_type_id": 2,
      "license_key": "d1af-de0b-fd91-4358-9fdd",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Kiệt Đoàn",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 43,
      "key_type": "Toon Boom Storyboard Pro",
      "license_type_id": 2,
      "license_key": "c102-8bb1-a337-42ad-a661",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Hoàng Hà",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 44,
      "key_type": "Toon Boom Harmony Advanced 22",
      "license_type_id": 3,
      "license_key": "(chưa gen mã key - còn 24 license)",
      "package_type": "Monthly",
      "expiration_date": null,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "Cty mua 40 license, đã dùng 16 license, còn 24 license",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 45,
      "key_type": "Toon Boom Harmony Premium 22",
      "license_type_id": 1,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Yearly/Annual",
      "expiration_date": 46022,
      "user_id": null,
      "user": "Ngoan Lê",
      "status": "Active",
      "notes": "Lần thanh toán tiếp theo đến 30/12/25, 28/06/26, 30/12/26",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 46,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "b319-68fd-368b-4cfa-8a77",
      "package_type": "Monthly",
      "expiration_date": 45870,
      "user_id": null,
      "user": "Bình Lường",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 47,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "7af4-0cd1-3ad6-4c1c-96d3",
      "package_type": "Monthly",
      "expiration_date": 45870,
      "user_id": null,
      "user": "Phúc Nguyễn",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 48,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "a571-ec2e-2b90-428d-971e",
      "package_type": "Monthly",
      "expiration_date": 45870,
      "user_id": null,
      "user": "Minh Ngô",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 49,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "5b3a-8ddf-af22-40cf-9c2a",
      "package_type": "Monthly",
      "expiration_date": 45870,
      "user_id": null,
      "user": "Quốc Anh",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 50,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "9a88-9a56-1a51-4619-a304",
      "package_type": "Monthly",
      "expiration_date": 45870,
      "user_id": null,
      "user": "Vân Trần",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 51,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "7d06-177f-d9f2-4166-b9f3",
      "package_type": "Monthly",
      "expiration_date": 45870,
      "user_id": null,
      "user": "Khanh Nguyễn",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 52,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "b59b-3ca1-ba16-4816-ad91",
      "package_type": "Monthly",
      "expiration_date": 45870,
      "user_id": null,
      "user": "Linh Nguyễn",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 53,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "9c9c-25ab-d5ba-4118-b6d8",
      "package_type": "Monthly",
      "expiration_date": 45870,
      "user_id": null,
      "user": "Thi Hoàng",
      "status": "Active",
      "notes": "",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 54,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Monthly",
      "expiration_date": 46021,
      "user_id": null,
      "user": "Thi Hoàng",
      "status": "Active",
      "notes": "Done",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 55,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "873b-5267-9845-4213-8580",
      "package_type": "Monthly",
      "expiration_date": 46021,
      "user_id": null,
      "user": "Linh Nguyễn",
      "status": "Active",
      "notes": "4 key mới, đã add 1 còn 3 key",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 56,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Monthly",
      "expiration_date": 46021,
      "user_id": null,
      "user": "Khanh Nguyễn",
      "status": "Active",
      "notes": "Done",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 57,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Monthly",
      "expiration_date": 46021,
      "user_id": null,
      "user": "Vân Trần",
      "status": "Active",
      "notes": "Done",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 58,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Monthly",
      "expiration_date": 46021,
      "user_id": null,
      "user": "Quốc Anh",
      "status": "Active",
      "notes": "Done. Dùng máy của Trang Đặng",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 59,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Monthly",
      "expiration_date": 46021,
      "user_id": null,
      "user": "Minh Ngô",
      "status": "Active",
      "notes": "Done",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 60,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Monthly",
      "expiration_date": 46021,
      "user_id": null,
      "user": "Phúc Nguyễn",
      "status": "Active",
      "notes": "Done",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 61,
      "key_type": "Toon Boom Harmony Premium 22 Monthly",
      "license_type_id": 4,
      "license_key": "0118-646e-9847-4490-96fd",
      "package_type": "Monthly",
      "expiration_date": 46021,
      "user_id": null,
      "user": "Bình Lường",
      "status": "Active",
      "notes": "Done",
      "invoice": "",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 62,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0SLSE-TER1N7-LCSDL7-FBH7C8",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "[BG]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 63,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEP-D2CU79-S7NCUA-PBPAMK-EENMLB",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "[Anim]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 64,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0SK2A-J29AKF-BFL9K7-RDACFE",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "[BG]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 65,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEP-D2CU7B-BFA496-B4P7AC-FHBB86",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Đỗ Thành Trung",
      "status": "Active",
      "notes": "[Anim]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 66,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEP-D2CU78-F5HDPA-TJU8U7-S4FDCA",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Đoàn Anh Kiệt",
      "status": "Active",
      "notes": "[Anim]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 67,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEP-D2CU7A-DC9EM5-A97BF7-E9D567",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Hà Huy Hoàng",
      "status": "Active",
      "notes": "[Anim]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 68,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0W3M1-DLA88K-89KCHJ-8J6F76",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "[BG]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 69,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0SLSF-S6S8DB-P7UEC7-HDS2KF",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Thanh Nguyễn",
      "status": "Active",
      "notes": "[BG]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 70,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0SLSH-L8MEP4-B5M7MC-MJEC8F",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "[BG]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 71,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0SLSJ-9HSBBB-D9RAA9-R6PL9F",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "[BG]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 72,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0SLSK-KBECHH-J6S8BJ-F7T9AF",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Hoà Nguyễn",
      "status": "Active",
      "notes": "[BG]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 73,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0SLSL-HPU7PC-CESDNP-K7EFCK",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "",
      "status": "Stock",
      "notes": "[BG] cấp cho Lê 2D SG",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 74,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0SLSM-SCJMD8-FRNMKH-FPEFKJ",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Lộc Nguyễn",
      "status": "Active",
      "notes": "[BG]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 75,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0SK2B-M7E4AC-LHD2C3-F3F7F7",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Thảo Nguyễn",
      "status": "Active",
      "notes": "[BG]",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 76,
      "key_type": "Clip Studio Paint",
      "license_type_id": 5,
      "license_key": "SP1DEE-D0W3M5-NPSNBH-KRSMJE-PKCPBH",
      "package_type": "Permanent",
      "expiration_date": null,
      "user_id": null,
      "user": "Đạt Dương",
      "status": "Active",
      "notes": "[BG]",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "supplies": [
    {
      "id": 1,
      "code": "OC-001",
      "name": "Ổ cứng rời HDD/SSD 2TB WD/Seagate",
      "category": "Ổ cứng rời & Lưu trữ",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Khu vực BP Video",
      "unit_price": 1850000,
      "notes": "Phục vụ lưu trữ dự án Video",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "code": "OC-003",
      "name": "Ổ cứng rời HDD 2TB Seagate Backup Plus",
      "category": "Ổ cứng rời & Lưu trữ",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Khu vực BP Video",
      "unit_price": 1850000,
      "notes": "Lưu trữ source video dự án",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "code": "OC-004",
      "name": "Ổ cứng rời HDD 1TB WD Elements",
      "category": "Ổ cứng rời & Lưu trữ",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Phòng HCNS",
      "unit_price": 1250000,
      "notes": "Ổ cứng lưu trữ HCNS",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "code": "OC-005",
      "name": "Ổ cứng rời HDD 1TB Transcend StoreJet",
      "category": "Ổ cứng rời & Lưu trữ",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Phòng HCNS",
      "unit_price": 1250000,
      "notes": "Lưu trữ hồ sơ HCNS",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 5,
      "code": "OC-006",
      "name": "Ổ cứng rời HDD 1TB WD My Passport",
      "category": "Ổ cứng rời & Lưu trữ",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Phòng HCNS",
      "unit_price": 1250000,
      "notes": "Lưu trữ dữ liệu phòng HCNS",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 6,
      "code": "OC-007",
      "name": "Ổ cứng gắn máy 1TB Seagate Barracuda",
      "category": "Ổ cứng & SSD",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Khu vực BP Creative",
      "unit_price": 1100000,
      "notes": "Gắn máy dự phòng cho Creative",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 7,
      "code": "OC-008",
      "name": "Ổ cứng rời 2TB WD My Passport Ultra",
      "category": "Ổ cứng rời & Lưu trữ",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Khu vực BP MKT",
      "unit_price": 1950000,
      "notes": "Phòng Marketing lưu trữ tư liệu",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 8,
      "code": "OC-009",
      "name": "Ổ cứng rời SSD 1TB Kingston XS2000",
      "category": "Ổ cứng & SSD",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Khu vực BP Creative",
      "unit_price": 2450000,
      "notes": "SSD tốc độ cao cho Creative",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 9,
      "code": "OC-010",
      "name": "Ổ cứng gắn máy SSD 1TB Kingston NV2",
      "category": "Ổ cứng & SSD",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Phòng Kế toán",
      "unit_price": 1550000,
      "notes": "SSD nâng cấp máy kế toán",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 10,
      "code": "OC-011",
      "name": "Ổ cứng gắn PC SSD 2TB Kingston KC3000",
      "category": "Ổ cứng & SSD",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Khu vực BP Video",
      "unit_price": 3200000,
      "notes": "SSD 2TB máy trạm Video",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 11,
      "code": "OC-012",
      "name": "Ổ cứng gắn PC SSD 2TB Samsung 980 Pro",
      "category": "Ổ cứng & SSD",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Khu vực BP Video",
      "unit_price": 3600000,
      "notes": "SSD dựng phim 4K",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 12,
      "code": "LK-RAM-01",
      "name": "RAM DDR4 16GB Corsair Vengeance 3200MHz",
      "category": "Linh kiện phần cứng",
      "unit": "Thanh",
      "quantity": 6,
      "min_quantity": 2,
      "location": "Tủ kỹ thuật - Khu Video",
      "unit_price": 950000,
      "notes": "RAM nâng cấp máy trạm thiết kế / render",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 13,
      "code": "LK-RAM-02",
      "name": "RAM DDR4 32GB Kingston Fury Beast 3200MHz",
      "category": "Linh kiện phần cứng",
      "unit": "Thanh",
      "quantity": 4,
      "min_quantity": 2,
      "location": "Tủ kỹ thuật - Khu Video",
      "unit_price": 1850000,
      "notes": "RAM máy trạm đồ họa AMD Ryzen 9",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 14,
      "code": "LK-RAM-03",
      "name": "RAM DDR5 32GB Corsair Dominator 5600MHz",
      "category": "Linh kiện phần cứng",
      "unit": "Thanh",
      "quantity": 2,
      "min_quantity": 1,
      "location": "Tủ kỹ thuật IT",
      "unit_price": 2600000,
      "notes": "Dự phòng cho máy trạm thế hệ mới PC047",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 15,
      "code": "LK-VGA-01",
      "name": "Card đồ họa VGA RTX 2060 Inno3D 6GB",
      "category": "Linh kiện phần cứng",
      "unit": "Chiếc",
      "quantity": 2,
      "min_quantity": 1,
      "location": "Tủ kỹ thuật thiết kế",
      "unit_price": 4500000,
      "notes": "Linh kiện thay thế máy thiết kế (TK-BMT02)",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 16,
      "code": "LK-VGA-02",
      "name": "Card đồ họa VGA GTX 1650 ASUS 4GB",
      "category": "Linh kiện phần cứng",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Tủ kỹ thuật thiết kế",
      "unit_price": 3200000,
      "notes": "Thay thế máy đồ họa nhẹ",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 17,
      "code": "LK-PSU-01",
      "name": "Nguồn máy tính Corsair CV750 750W 80 Plus Bronze",
      "category": "Linh kiện phần cứng",
      "unit": "Chiếc",
      "quantity": 2,
      "min_quantity": 1,
      "location": "Tủ kỹ thuật IT",
      "unit_price": 1450000,
      "notes": "Thay thế nguồn PC đồ họa",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 18,
      "code": "LK-FAN-01",
      "name": "Tản nhiệt CPU Thermalright Assassin X 120 R SE",
      "category": "Linh kiện phần cứng",
      "unit": "Bộ",
      "quantity": 3,
      "min_quantity": 1,
      "location": "Tủ kỹ thuật IT",
      "unit_price": 450000,
      "notes": "Tản nhiệt chống nóng PC đồ họa",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 19,
      "code": "LK-CASE-01",
      "name": "Vỏ case máy tính Xigmatek Venom kính cường lực",
      "category": "Linh kiện phần cứng",
      "unit": "Chiếc",
      "quantity": 1,
      "min_quantity": 1,
      "location": "Kho kỹ thuật",
      "unit_price": 850000,
      "notes": "Case lắp ráp máy thay thế",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 20,
      "code": "SAC-SF-01",
      "name": "Sạc Surface Pro 65W chính hãng Microsoft",
      "category": "Dây cáp & Củ sạc",
      "unit": "Chiếc",
      "quantity": 2,
      "min_quantity": 1,
      "location": "Khu vực BP Creative",
      "unit_price": 1150000,
      "notes": "Sạc thay thế cho Surface Pro 7 / Book 3",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 21,
      "code": "VT-CAB-DP",
      "name": "Cáp DisplayPort to DisplayPort 1.4 Ugreen 2m (8K@60Hz)",
      "category": "Dây cáp & Chuyển đổi",
      "unit": "Sợi",
      "quantity": 8,
      "min_quantity": 3,
      "location": "Tủ cáp màn hình",
      "unit_price": 220000,
      "notes": "Kết nối màn hình đồ họa Dell UltraSharp",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 22,
      "code": "VT-CAB-HDMI",
      "name": "Cáp HDMI 2.0 Ugreen bện dù 2m (4K@60Hz)",
      "category": "Dây cáp & Chuyển đổi",
      "unit": "Sợi",
      "quantity": 12,
      "min_quantity": 5,
      "location": "Tủ cáp màn hình",
      "unit_price": 140000,
      "notes": "Kết nối máy chiếu và màn hình ngoài",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 23,
      "code": "VT-NET-CAT6",
      "name": "Dây mạng đúc sẵn Cat6 UTP Commscope 3m/5m",
      "category": "Mạng & Viễn thông",
      "unit": "Sợi",
      "quantity": 15,
      "min_quantity": 5,
      "location": "Tủ vật tư mạng",
      "unit_price": 65000,
      "notes": "Thay thế dây mạng đứt/chập chờn tại các bàn làm việc",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 24,
      "code": "VT-MOU-DP",
      "name": "Chuột quang Fuhlen G90 / Logitech B100 dự phòng",
      "category": "Thiết bị ngoại vi",
      "unit": "Chiếc",
      "quantity": 6,
      "min_quantity": 4,
      "location": "Tủ kỹ thuật IT",
      "unit_price": 160000,
      "notes": "Đổi trả ngay khi nhân sự hỏng chuột",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 25,
      "code": "VT-KBD-DP",
      "name": "Bàn phím Fuhlen L411 văn phòng chống nước dự phòng",
      "category": "Thiết bị ngoại vi",
      "unit": "Chiếc",
      "quantity": 5,
      "min_quantity": 3,
      "location": "Tủ kỹ thuật IT",
      "unit_price": 210000,
      "notes": "Dự phòng cấp phát khi hỏng phím",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "supply_transactions": [
    {
      "id": 1,
      "code": "PNK-2026-001",
      "type": "IN",
      "supply_id": 1,
      "supply_name": "Ổ cứng rời HDD/SSD 2TB WD/Seagate",
      "quantity": 5,
      "unit": "Chiếc",
      "unit_price": 1850000,
      "total_amount": 9250000,
      "date": "2026-06-10",
      "supplier_name": "Công ty Cổ phần Máy tính Hà Nội (Hacom)",
      "reason": "Nhập bổ sung ổ cứng lưu trữ tư liệu dự án",
      "created_by": "HCNS",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "code": "PXK-2026-001",
      "type": "OUT",
      "supply_id": 1,
      "supply_name": "Ổ cứng rời HDD/SSD 2TB WD/Seagate",
      "quantity": 2,
      "unit": "Chiếc",
      "unit_price": 1850000,
      "total_amount": 3700000,
      "date": "2026-06-15",
      "receiver_name": "Vũ Anh Duy",
      "receiver_department": "Sản xuất Video - Video Prodution",
      "reason": "Cấp ổ cứng lưu trữ source dựng phim dự án",
      "created_by": "HCNS",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "code": "PNK-2026-002",
      "type": "IN",
      "supply_id": 12,
      "supply_name": "RAM DDR4 16GB Corsair Vengeance 3200MHz",
      "quantity": 8,
      "unit": "Thanh",
      "unit_price": 950000,
      "total_amount": 7600000,
      "date": "2026-07-01",
      "supplier_name": "Công ty TNHH Tin học Mai Hoàng",
      "reason": "Nhập linh kiện nâng cấp máy trạm dựng phim đợt 1",
      "created_by": "IT Quản trị",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "code": "PXK-2026-002",
      "type": "OUT",
      "supply_id": 12,
      "supply_name": "RAM DDR4 16GB Corsair Vengeance 3200MHz",
      "quantity": 2,
      "unit": "Thanh",
      "unit_price": 950000,
      "total_amount": 1900000,
      "date": "2026-07-05",
      "receiver_name": "Nguyễn Thủy Tiên",
      "receiver_department": "Thiết kế - Design",
      "reason": "Nâng cấp máy thiết kế (TK-BMT01)",
      "created_by": "IT Quản trị",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "suppliers": [
    {
      "id": 1,
      "name": "Công ty TNHH Tin học Mai Hoàng",
      "contact_person": "Phòng Bán hàng",
      "phone": "024 3537 7109",
      "email": "sales@maihoang.com.vn",
      "address": "Hà Nội",
      "notes": "Nhà cung cấp linh kiện máy tính, mainboard, RAM",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "name": "Công ty Cổ phần Máy tính Hà Nội (Hacom)",
      "contact_person": "Bộ phận Dự án",
      "phone": "1900 1903",
      "email": "kinhdoanh@hacom.vn",
      "address": "Hà Nội",
      "notes": "Nhà cung cấp máy tính, màn hình, ổ cứng",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "name": "Công ty Máy tính An Phát",
      "contact_person": "Kinh doanh B2B",
      "phone": "1900 0323",
      "email": "b2b@anphatpc.com.vn",
      "address": "Hà Nội",
      "notes": "Linh kiện, màn hình đồ họa Asus, Dell",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "name": "Công ty Cổ phần Đầu tư Công nghệ Phúc Anh",
      "contact_person": "Phòng Doanh nghiệp",
      "phone": "024 3573 7383",
      "email": "b2b@phucanh.com.vn",
      "address": "Hà Nội",
      "notes": "Thiết bị văn phòng, mạng, mực in",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 5,
      "name": "Công ty Cổ phần Thương mại Dịch vụ Phong Vũ",
      "contact_person": "Bộ phận Khách hàng DN",
      "phone": "1800 6867",
      "email": "doanhnghiep@phongvu.vn",
      "address": "Toàn quốc",
      "notes": "Máy in, laptop, thiết bị ngoại vi",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 6,
      "name": "Dell Technologies Vietnam",
      "contact_person": "Support Dell",
      "phone": "1800 545455",
      "email": "support@dell.com",
      "address": "Việt Nam",
      "notes": "Bảo hành và cung cấp chính hãng Dell",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 7,
      "name": "ASUS Vietnam",
      "contact_person": "Trung tâm Dịch vụ ASUS",
      "phone": "1800 6588",
      "email": "service@asus.com",
      "address": "Việt Nam",
      "notes": "Màn hình và card đồ họa Asus",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 8,
      "name": "Apple Authorized Reseller (ShopDunk / FPT)",
      "contact_person": "Đại lý Ủy quyền",
      "phone": "1900 6626",
      "email": "enterprise@shopdunk.com",
      "address": "Hà Nội",
      "notes": "Macbook Air, iMac, iPad",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "maintenance_tasks": [
    {
      "id": 1,
      "asset_id": 16,
      "title": "Bảo dưỡng định kỳ máy trạm AMD Ryzen 9 9900X (PC010)",
      "due_date": "2026-09-15",
      "status": "Chưa xử lý",
      "priority": "Cao",
      "assigned_to": "IT Quản trị",
      "note": "Vệ sinh tản nhiệt, tra lại keo tản nhiệt và kiểm tra tốc độ quạt",
      "created_by": "Admin",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "asset_id": 17,
      "title": "Kiểm tra nhiệt độ & nâng cấp ổ cứng dựng phim (PC011)",
      "due_date": "2026-09-20",
      "status": "Chưa xử lý",
      "priority": "Trung bình",
      "assigned_to": "IT Quản trị",
      "note": "Kiểm tra dàn ổ cứng 15TB và cập nhật driver card màn hình RTX",
      "created_by": "Admin",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "asset_id": 6,
      "title": "Kiểm tra nguồn Surface Laptop (LT006)",
      "due_date": "2026-08-10",
      "status": "Hoàn thành",
      "priority": "Cao",
      "assigned_to": "IT Quản trị",
      "note": "Đã xử lý: kiểm tra nguồn và pin, hiện máy hoạt động bình thường lưu kho",
      "created_by": "Admin",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "asset_id": 53,
      "title": "Kiểm tra định kỳ máy trạm đồ họa Ryzen 9 9950X (PC047)",
      "due_date": "2026-10-01",
      "status": "Chưa xử lý",
      "priority": "Thấp",
      "assigned_to": "IT Quản trị",
      "note": "Máy trạm mới mua tháng 09/2025, theo dõi độ ổn định khi render video 4K",
      "created_by": "Admin",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "maintenance_events": [
    {
      "id": 1,
      "maintenance_task_id": 1,
      "asset_id": 16,
      "action": "Created",
      "details": "Phiếu bảo trì: Bảo dưỡng định kỳ máy trạm AMD Ryzen 9 9900X (PC010). Ghi chú: Vệ sinh tản nhiệt, tra lại keo tản nhiệt và kiểm tra tốc độ quạt",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "maintenance_task_id": 2,
      "asset_id": 17,
      "action": "Created",
      "details": "Phiếu bảo trì: Kiểm tra nhiệt độ & nâng cấp ổ cứng dựng phim (PC011). Ghi chú: Kiểm tra dàn ổ cứng 15TB và cập nhật driver card màn hình RTX",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "maintenance_task_id": 3,
      "asset_id": 6,
      "action": "Resolved",
      "details": "Phiếu bảo trì: Kiểm tra nguồn Surface Laptop (LT006). Ghi chú: Đã xử lý: kiểm tra nguồn và pin, hiện máy hoạt động bình thường lưu kho",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "maintenance_task_id": 4,
      "asset_id": 53,
      "action": "Created",
      "details": "Phiếu bảo trì: Kiểm tra định kỳ máy trạm đồ họa Ryzen 9 9950X (PC047). Ghi chú: Máy trạm mới mua tháng 09/2025, theo dõi độ ổn định khi render video 4K",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "stock_checks": [
    {
      "id": 1,
      "name": "Đợt kiểm kê tài sản máy móc thiết bị 2026",
      "started_at": "2026-06-11",
      "status": "Hoàn thành",
      "note": "Kiểm kê tổng thể máy móc thiết bị khối Văn phòng và khối Sản xuất",
      "created_by": 1,
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "name": "Kiểm kê định kỳ Quý 3/2026 - Khối Video & Thiết kế",
      "started_at": "2026-09-01",
      "status": "Đang mở",
      "note": "Kiểm tra hiện trạng máy trạm PC đồ họa, màn hình và linh kiện nâng cấp",
      "created_by": 1,
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "stock_check_items": [
    {
      "id": 1,
      "stock_check_id": 2,
      "asset_id": 16,
      "status": "matched",
      "note": "Máy đang sử dụng tốt tại BP Video",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 2,
      "stock_check_id": 2,
      "asset_id": 17,
      "status": "matched",
      "note": "Đang hoạt động tốt",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 3,
      "stock_check_id": 2,
      "asset_id": 6,
      "status": "matched",
      "note": "Tồn kho, đã test bật nguồn ok",
      "created_at": "2026-09-10T01:57:57.703Z"
    },
    {
      "id": 4,
      "stock_check_id": 2,
      "asset_id": 4,
      "status": "matched",
      "note": "Dell UltraSharp đúng vị trí",
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ],
  "alert_settings": [
    {
      "id": 1,
      "warranty_threshold_days": 30,
      "license_threshold_days": 45,
      "maintenance_threshold_days": 7,
      "emails": [
        "it@newdaymedia.com.vn",
        "hcns@newdaymedia.com.vn"
      ],
      "created_at": "2026-09-10T01:57:57.703Z"
    }
  ]
},

    
    REAL_NETWORK_DATA: {
        network_wifis: [
            {
                id: 1,
                ssid: "NewdayMedia_5G",
                asset_id: 5,
                password: "NDM@Office#2026",
                band: "5GHz",
                security: "WPA2/WPA3 Personal",
                network_type: "Nội bộ",
                vlan: "VLAN 10",
                device_name: "Ruijie RG-RAP2260(E) - Tầng 2 & 3",
                location: "Văn phòng Tầng 2 & 3",
                status: "Active",
                notes: "Mạng Wi-Fi tốc độ cao dành cho cán bộ nhân viên làm việc, thiết kế đồ họa & video.",
                created_at: "2026-09-10T08:00:00.000Z"
            },
            {
                id: 2,
                ssid: "NewdayMedia_2.4G",
                asset_id: 5,
                password: "NDM@Office#2026",
                band: "2.4GHz",
                security: "WPA2 Personal",
                network_type: "Nội bộ",
                vlan: "VLAN 10",
                device_name: "Ruijie RG-RAP2260(E)",
                location: "Toàn văn phòng",
                status: "Active",
                notes: "Dành cho máy in Wi-Fi, thiết bị văn phòng thế hệ cũ và khu vực xa AP.",
                created_at: "2026-09-10T08:00:00.000Z"
            },
            {
                id: 3,
                ssid: "NewdayMedia_Guest",
                password: "Newday@Welcome2026",
                band: "2.4GHz / 5GHz",
                security: "WPA2 Personal",
                network_type: "Khách (Guest)",
                vlan: "VLAN 20 (Cách ly)",
                device_name: "DrayTek Vigor 2927 + Ruijie AP",
                location: "Sảnh lễ tân & Phòng họp",
                status: "Active",
                notes: "Mạng khách có cô lập thiết bị nội bộ, giới hạn băng thông 30 Mbps/client.",
                created_at: "2026-09-10T08:00:00.000Z"
            },
            {
                id: 4,
                ssid: "Newday_IoT_Camera",
                password: "Cam@NDM#Secure99",
                band: "2.4GHz",
                security: "WPA2 Enterprise",
                network_type: "Camera / IoT",
                vlan: "VLAN 30",
                device_name: "Ruijie RG-RAP2260(E) PoE",
                location: "Hành lang, Cửa ra vào, Phòng Server",
                status: "Active",
                notes: "Dành riêng cho hệ thống camera giám sát IP và cảm biến thông minh.",
                created_at: "2026-09-10T08:00:00.000Z"
            }
        ],
        network_nats: [
            {
                id: 1,
                rule_name: "Camera NVR Web & Stream",
                asset_id: 4,
                wan_ip: "113.190.45.120 (WAN 1)",
                wan_port: "8000",
                lan_ip: "192.168.1.200",
                lan_port: "8000",
                protocol: "TCP",
                target_device: "Đầu ghi Camera Hikvision 32 kênh",
                status: "Active",
                purpose: "Giám sát camera an ninh từ xa qua Hik-Connect & Web App",
                created_at: "2026-09-10T08:00:00.000Z"
            },
            {
                id: 2,
                rule_name: "Synology NAS DSM & Drive",
                asset_id: 3,
                wan_ip: "113.190.45.120 (WAN 1)",
                wan_port: "5001",
                lan_ip: "192.168.1.250",
                lan_port: "5001",
                protocol: "TCP/HTTPS",
                target_device: "NAS Synology DS920+ Media Storage",
                status: "Active",
                purpose: "Truy cập lưu trữ dự án, đồng bộ dữ liệu khối Video/Thiết kế từ xa qua SSL",
                created_at: "2026-09-10T08:00:00.000Z"
            },
            {
                id: 3,
                rule_name: "OpenVPN Gateway Inbound",
                asset_id: 1,
                wan_ip: "113.190.45.120 (WAN 1)",
                wan_port: "1194",
                lan_ip: "192.168.1.1",
                lan_port: "1194",
                protocol: "UDP",
                target_device: "Router DrayTek Vigor 2927",
                status: "Active",
                purpose: "Cổng tiếp nhận kết nối VPN mã hóa cho nhân sự làm việc từ xa",
                created_at: "2026-09-10T08:00:00.000Z"
            },
            {
                id: 4,
                rule_name: "Web Staging Portal Test",
                wan_ip: "113.190.45.120 (WAN 1)",
                wan_port: "8080",
                lan_ip: "192.168.1.180",
                lan_port: "80",
                protocol: "TCP",
                target_device: "Server Render / Web Staging",
                status: "Inactive",
                purpose: "Thử nghiệm cổng thông tin nội bộ trước khi release chính thức",
                created_at: "2026-09-10T08:00:00.000Z"
            }
        ],
        network_remotes: [
            {
                id: 1,
                name: "VPN SSL Văn phòng chính",
                asset_id: 1,
                connection_type: "SSL-VPN",
                address: "vpn.newdaymedia.com.vn:443",
                protocol: "SSL/TLS",
                username: "ndm-vpn-admin",
                secret_masked: "NdmVpn#Master2026!",
                related_device: "Router DrayTek Vigor 2927",
                owner: "BP Kỹ thuật & IT",
                status: "Active",
                last_verified_at: "2026-09-10T08:30:00.000Z",
                notes: "Kênh VPN chính cho Ban giám đốc & Quản trị hệ thống truy cập mạng nội bộ",
                created_at: "2026-09-10T08:00:00.000Z"
            },
            {
                id: 2,
                name: "WireGuard Điểm-Điểm (Remote Work)",
                connection_type: "WireGuard",
                address: "113.190.45.120:51820",
                protocol: "UDP",
                username: "wg-client-design",
                secret_masked: "wg_priv_a8F92jK...==",
                related_device: "Server Linux Gateway",
                owner: "Khối Thiết kế & Video",
                status: "Active",
                last_verified_at: "2026-09-10T08:00:00.000Z",
                notes: "Kết nối tốc độ cao cho nhân viên đồ họa render và truy cập source video",
                created_at: "2026-09-10T08:00:00.000Z"
            },
            {
                id: 3,
                name: "UltraViewer Quản trị Server Render",
                asset_id: 13,
                connection_type: "UltraViewer",
                address: "ID: 28 491 802",
                protocol: "UltraViewer Desktop",
                username: "Administrator",
                secret_masked: "Uv@9981#Render",
                related_device: "PC Render 01 (Core i9)",
                owner: "Khối Kỹ thuật & IT",
                status: "Active",
                last_verified_at: "2026-09-09T17:00:00.000Z",
                notes: "Hỗ trợ điều khiển xử lý lỗi render farm ngoài giờ hành chính",
                created_at: "2026-09-10T08:00:00.000Z"
            },
            {
                id: 4,
                name: "RDP Máy chủ File Synology DSM",
                asset_id: 3,
                connection_type: "RDP / Web Management",
                address: "192.168.1.250:5001",
                protocol: "HTTPS",
                username: "syno-itadmin",
                secret_masked: "Syno#Media2026$",
                related_device: "NAS Synology DS920+",
                owner: "BP Kỹ thuật & IT",
                status: "Active",
                last_verified_at: "2026-09-10T07:45:00.000Z",
                notes: "Trang quản trị cấu hình ổ đĩa RAID, phân quyền thư mục phòng ban",
                created_at: "2026-09-10T08:00:00.000Z"
            }
        ],
        network_targets: [
            {
                id: 1,
                name: "Router DrayTek Vigor 2927 (Gateway)",
                asset_id: 1,
                target_type: "Router",
                address: "192.168.1.1",
                port: 80,
                location: "Tủ Rack Tầng 2",
                status: "Online",
                latency_ms: 2,
                auto_monitor: true,
                last_checked: "2026-09-10T08:45:00.000Z",
                notes: "Bộ định tuyến kiêm cân bằng tải 2 đường truyền Internet"
            },
            {
                id: 2,
                name: "Core Switch Ruijie RG-NBS3100-24GT4SFP",
                asset_id: 2,
                target_type: "Switch",
                address: "192.168.1.2",
                port: 80,
                location: "Tủ Rack Tầng 2",
                status: "Online",
                latency_ms: 1,
                auto_monitor: true,
                last_checked: "2026-09-10T08:45:00.000Z",
                notes: "Switch trung tâm Gigabit quản lý VLAN và cấp nguồn PoE cho AP"
            },
            {
                id: 3,
                name: "Máy chủ NAS Synology DS920+",
                asset_id: 3,
                target_type: "Server",
                address: "192.168.1.250",
                port: 5000,
                location: "Tủ Rack Tầng 2",
                status: "Online",
                latency_ms: 2,
                auto_monitor: true,
                last_checked: "2026-09-10T08:45:00.000Z",
                notes: "Lưu trữ dữ liệu tập trung 40TB RAID 5"
            },
            {
                id: 4,
                name: "Đầu ghi Camera NVR Hikvision",
                asset_id: 4,
                target_type: "Camera",
                address: "192.168.1.200",
                port: 8000,
                location: "Phòng An ninh / Tủ Rack",
                status: "Online",
                latency_ms: 3,
                auto_monitor: true,
                last_checked: "2026-09-10T08:45:00.000Z",
                notes: "Hệ thống giám sát 24/7 gồm 16 camera IP"
            },
            {
                id: 5,
                name: "Máy in Canon LBP 226dw Phòng Kế toán",
                target_type: "Printer",
                address: "192.168.1.150",
                port: 9100,
                location: "Phòng Kế toán - Tầng 2",
                status: "Online",
                latency_ms: 4,
                auto_monitor: true,
                last_checked: "2026-09-10T08:45:00.000Z",
                notes: "Máy in mạng laser đa năng Canon"
            },
            {
                id: 6,
                name: "Cổng Viettel DNS Gateway (203.113.131.1)",
                target_type: "Gateway",
                address: "203.113.131.1",
                port: 53,
                location: "Viettel Telecom",
                status: "Online",
                latency_ms: 7,
                auto_monitor: true,
                last_checked: "2026-09-10T08:45:00.000Z",
                notes: "DNS Gateway đường truyền Internet chính Viettel"
            },
            {
                id: 7,
                name: "Cổng FPT DNS Gateway (210.245.24.20)",
                target_type: "Gateway",
                address: "210.245.24.20",
                port: 53,
                location: "FPT Telecom",
                status: "Online",
                latency_ms: 8,
                auto_monitor: true,
                last_checked: "2026-09-10T08:45:00.000Z",
                notes: "DNS Gateway đường truyền Internet dự phòng FPT"
            },
            {
                id: 8,
                name: "Website Công ty (newdaymedia.com.vn)",
                target_type: "Domain",
                address: "https://newdaymedia.com.vn",
                port: 443,
                location: "Cloud Web Hosting",
                status: "Online",
                latency_ms: 32,
                auto_monitor: true,
                last_checked: "2026-09-10T08:45:00.000Z",
                notes: "Cổng thông tin thương hiệu Newday Media"
            }
        ],
        
        
        network_check_logs: [
            {
                id: 1,
                target_id: 8,
                target_name: "Website Công ty (newdaymedia.com.vn)",
                host: "newdaymedia.com.vn",
                port: 443,
                status: "Online",
                latency_ms: 83,
                detail: "Cổng 443 mở (TCP Connect OK)",
                error: null,
                checked_at: new Date(Date.now() - 300000).toISOString()
            },
            {
                id: 2,
                target_id: 1,
                target_name: "Router DrayTek Vigor 2927 (Gateway)",
                host: "192.168.1.1",
                port: 80,
                status: "Online",
                latency_ms: 2,
                detail: "Cổng 80 mở (TCP Connect OK)",
                error: null,
                checked_at: new Date(Date.now() - 600000).toISOString()
            }
        ],
        network_diagrams: [
            {
                id: 1,
                name: "Sơ đồ Cấu trúc Mạng Tổng thể Văn phòng (Topology v2.0)",
                version: "2.0",
                format: "drawio",
                author: "Admin IT",
                updated_at: "2026-09-10T08:00:00.000Z",
                file_name: "So_do_ha_tang_mang_NewdayMedia_v2.drawio",
                description: "Kiến trúc Dual-WAN Load Balancing (Viettel + FPT), Core Switch Ruijie, VLAN phân tách và các tầng Access Point.",
                file_content: "data:application/xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48bXhmaWxlPjxkaWFncmFtIG5hbWU9Ik5ldHdvcmtUb3BvbG9neSIgaWQ9Im5ldHdvcmstdG9wb2xvZ3kiPjwvbXhmaWxlPg=="
            },
            {
                id: 2,
                name: "Sơ đồ Bố trí Tủ Rack & Cổng Mạng Tầng 2",
                version: "1.2",
                format: "png",
                author: "Admin IT",
                updated_at: "2026-09-08T14:30:00.000Z",
                file_name: "So_do_tu_rack_tang_2.png",
                description: "Vị trí lắp đặt Router DrayTek, Switch Ruijie, Patch Panel 24 port, NVR Camera và NAS Synology.",
                file_content: ""
            }
        ],
        network_lines: [
            {
                id: 1,
                name: "Đường truyền Viettel FTTH Doanh nghiệp (Chính)",
                line_role: "Primary (Chính)",
                provider: "Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel)",
                contract_no: "VT-NDM-2024-08",
                package_name: "Fast Business 300+",
                bandwidth: "300 Mbps Quốc tế / 1000 Mbps Trong nước",
                wan_ip: "113.190.45.120 (IP Tĩnh)",
                gateway: "113.190.45.1",
                dns: "203.113.131.1, 8.8.8.8",
                router_port: "DrayTek WAN 1 (Gigabit)",
                hotline: "1800 8000 (Nhánh 1)",
                status: "Active",
                cost_monthly: 1850000,
                notes: "Đường truyền ưu tiên cao nhất, phục vụ toàn bộ kết nối làm việc và VPN."
            },
            {
                id: 2,
                name: "Đường truyền FPT FTTH Doanh nghiệp (Dự phòng)",
                line_role: "Backup (Dự phòng)",
                provider: "Công ty Cổ phần Viễn thông FPT (FPT Telecom)",
                contract_no: "FPT-NDM-2024-11",
                package_name: "Super250 Business",
                bandwidth: "250 Mbps Trong nước & Quốc tế",
                wan_ip: "1.55.88.92 (IP Tĩnh)",
                gateway: "1.55.88.1",
                dns: "210.245.24.20, 1.1.1.1",
                router_port: "DrayTek WAN 2 (Gigabit)",
                hotline: "1900 6600",
                status: "Active",
                cost_monthly: 1200000,
                notes: "Tự động kích hoạt cân bằng tải / chuyển mạch dự phòng (Failover) khi đường chính gặp sự cố."
            }
        ]
    },

    seedNetworkDataIfNeeded() {
        if (typeof localStorage === 'undefined') return;
        try {
            const net = this.REAL_NETWORK_DATA || {};
            const ensureTable = (key, defaultData) => {
                const raw = localStorage.getItem(key);
                if (!raw || raw === '[]' || raw === 'null') {
                    localStorage.setItem(key, JSON.stringify(defaultData || []));
                }
            };
            ensureTable(this.KEYS.NETWORK_WIFIS, net.network_wifis);
            ensureTable(this.KEYS.NETWORK_NATS, net.network_nats);
            ensureTable(this.KEYS.NETWORK_REMOTES, net.network_remotes);
            ensureTable(this.KEYS.NETWORK_TARGETS, net.network_targets);
            ensureTable(this.KEYS.NETWORK_LINES, net.network_lines);
            ensureTable(this.KEYS.NETWORK_DIAGRAMS, net.network_diagrams);
            ensureTable(this.KEYS.NETWORK_CHECK_LOGS, net.network_check_logs);
        } catch (e) {
            console.error('LocalDB: Error seeding network data:', e);
        }
    },

    // =========================================================
    // CONTRACTS SEED DATA
    // =========================================================
    seedContractsIfNeeded() {
        if (typeof localStorage === 'undefined') return;
        try {
            const raw = localStorage.getItem(this.KEYS.CONTRACTS);
            if (raw && raw !== '[]' && raw !== 'null') return;

            const now = new Date().toISOString();
            // Tạo ngày hết hạn thực tế: 1 hợp đồng sắp hết (45 ngày), 1 đã hết, 2 còn dài
            const d = (offsetDays) => {
                const dt = new Date();
                dt.setDate(dt.getDate() + offsetDays);
                return dt.toISOString().slice(0, 10);
            };

            const contracts = [
                {
                    id: 1, code: 'HD-001',
                    name: 'Hợp đồng đường truyền Internet Viettel FTTH 300Mbps',
                    contract_type: 'internet',
                    provider: 'Viettel Telecom',
                    provider_contact: '18008098 (Hotline kỹ thuật)',
                    provider_email: 'cskh@viettel.com.vn',
                    contract_number: 'VTT-FTTH-2025-0456',
                    sign_date: '2025-01-15',
                    start_date: '2025-02-01',
                    end_date: d(45),
                    payment_cycle: 'monthly',
                    cost: 1500000,
                    cost_period: 'monthly',
                    related_asset_ids: [],
                    alert_days: [30, 60, 90],
                    auto_renew: true,
                    status: 'active',
                    notes: 'Đường truyền chính, IP tĩnh 113.190.45.120, bandwidth cam kết 300Mbps/1Gbps. Liên hệ anh Tuấn kỹ thuật: 0912.xxx.xxx',
                    attachments: [],
                    created_at: now, updated_at: now
                },
                {
                    id: 2, code: 'HD-002',
                    name: 'Hợp đồng bảo trì máy in HP LaserJet định kỳ',
                    contract_type: 'maintenance',
                    provider: 'Công ty TNHH Dịch vụ IT ProCare',
                    provider_contact: 'Nguyễn Văn Hùng - 0903.456.789',
                    provider_email: 'support@procare.vn',
                    contract_number: 'PC-MT-2025-012',
                    sign_date: '2025-03-01',
                    start_date: '2025-03-15',
                    end_date: d(280),
                    payment_cycle: 'yearly',
                    cost: 12000000,
                    cost_period: 'yearly',
                    related_asset_ids: [],
                    alert_days: [30, 60, 90],
                    auto_renew: false,
                    status: 'active',
                    notes: 'Bảo trì 4 lần/năm cho 6 máy in HP LaserJet. Bao gồm thay mực, drum, roller. Không bao gồm linh kiện mainboard.',
                    attachments: [],
                    created_at: now, updated_at: now
                },
                {
                    id: 3, code: 'HD-003',
                    name: 'Bản quyền Microsoft 365 Business Basic (50 users)',
                    contract_type: 'license',
                    provider: 'Microsoft Vietnam / Đại lý FPT Smart Cloud',
                    provider_contact: 'Hotline: 1900.636.399',
                    provider_email: 'license@fptcloud.com',
                    contract_number: 'MS365-BIZ-2025-089',
                    sign_date: '2025-06-01',
                    start_date: '2025-06-01',
                    end_date: d(-15),
                    payment_cycle: 'yearly',
                    cost: 75000000,
                    cost_period: 'yearly',
                    related_asset_ids: [],
                    alert_days: [30, 60, 90],
                    auto_renew: true,
                    status: 'active',
                    notes: 'Gói Business Basic: Email Exchange Online, Teams, OneDrive 1TB/user, SharePoint. 50 tài khoản.',
                    attachments: [],
                    created_at: now, updated_at: now
                },
                {
                    id: 4, code: 'HD-004',
                    name: 'Dell ProSupport Plus - Bảo hành mở rộng Server PowerEdge',
                    contract_type: 'warranty',
                    provider: 'Dell Technologies Vietnam',
                    provider_contact: '1800.599.927 (Dell ProSupport)',
                    provider_email: 'prosupport_vn@dell.com',
                    contract_number: 'DELL-PSP-2024-VN-0078',
                    sign_date: '2024-08-15',
                    start_date: '2024-09-01',
                    end_date: d(540),
                    payment_cycle: 'one_time',
                    cost: 45000000,
                    cost_period: 'total',
                    related_asset_ids: [],
                    alert_days: [30, 60, 90],
                    auto_renew: false,
                    status: 'active',
                    notes: 'Gói ProSupport Plus 3 năm: Next Business Day On-site, 24/7 phone support, Predictive Failure Analysis. Service Tag: ABC1234.',
                    attachments: [],
                    created_at: now, updated_at: now
                }
            ];

            localStorage.setItem(this.KEYS.CONTRACTS, JSON.stringify(contracts));
            console.log('LocalDB: Seeded 4 sample contracts');
        } catch (e) {
            console.error('LocalDB: Error seeding contracts:', e);
        }
    },

    migrateToRealDataIfNeeded() {
        if (typeof localStorage === 'undefined') return;
        const realDataFlag = 'qlts_real_data_v2';
        const isMigrated = localStorage.getItem(realDataFlag) === '1';

        const hasMockSignatures = () => {
            try {
                const assetsRaw = localStorage.getItem(this.KEYS.ASSETS) || '';
                const licensesRaw = localStorage.getItem(this.KEYS.LICENSES) || '';
                const usersRaw = localStorage.getItem(this.KEYS.USERS) || '';
                const suppliesRaw = localStorage.getItem(this.KEYS.SUPPLIES) || '';
                const transRaw = localStorage.getItem(this.KEYS.SUPPLY_TRANSACTIONS) || '';

                if (assetsRaw.includes('Dell XPS 13') || assetsRaw.includes('Monitor LG 27')) return true;
                if (licensesRaw.includes('XXXXX-XXXXX') || licensesRaw.includes('WIN-2024-001')) return true;
                if (usersRaw.includes('nguyen.van.a@company.com')) return true;
                if (suppliesRaw.includes('VT-RAM-001') || suppliesRaw.includes('VT-SSD-001')) return true;
                if (transRaw.includes('NK-20260901-001') || transRaw.includes('Phong Vũ')) return true;
                return false;
            } catch (e) {
                return false;
            }
        };

        if (!isMigrated || hasMockSignatures()) {
            console.log('LocalDB: Detected mock data or pending migration. Overwriting with 100% REAL DATA from site...');
            this.setDefaultData();
            localStorage.setItem(realDataFlag, '1');
            localStorage.setItem('qlts_seed_v2', '1');
            localStorage.setItem('qlts_workbook_imported_v8', '1');
            localStorage.setItem('qlts_csp_keys_seeded_v1', '1');
            console.log('LocalDB: Real data migration complete.');
        }
    },

    async init() {
        console.log('LocalDB.init() called');

        // Migrate to real data, clearing mock data if present
        this.migrateToRealDataIfNeeded();

        await this.importWorkbookDataIfNeeded();

        this.migrateLegacyDataIfNeeded();
        this.seedClipStudioPaintKeys();
        this.deduplicateUsers();

        // Check if data exists, if not create real default data
        if (!localStorage.getItem(this.KEYS.DEPARTMENTS)) {
            console.log('No existing data found, creating real default data...');
            this.setDefaultData();
        } else {
            this.ensureSeedData();
        }
        this.seedSuppliesIfNeeded();
        this.seedNetworkDataIfNeeded();
        this.seedContractsIfNeeded();
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

        const assets = safeRead(this.KEYS.ASSETS);
        const licenses = safeRead(this.KEYS.LICENSES);

        if (assets.length === 0 && this.REAL_DATA?.assets) {
            localStorage.setItem(this.KEYS.ASSETS, JSON.stringify(this.REAL_DATA.assets));
        }
        if (licenses.length === 0 && this.REAL_DATA?.licenses) {
            localStorage.setItem(this.KEYS.LICENSES, JSON.stringify(this.REAL_DATA.licenses));
        }

        localStorage.setItem(seedFlagKey, '1');
    },

    seedSuppliesIfNeeded() {
        const suppliesKey = this.KEYS.SUPPLIES;
        const transKey = this.KEYS.SUPPLY_TRANSACTIONS;
        const existing = localStorage.getItem(suppliesKey);
        if (!existing || JSON.parse(existing || '[]').length === 0) {
            const defaultSupplies = this.REAL_DATA?.supplies || [];
            const defaultTrans = this.REAL_DATA?.supply_transactions || [];
            localStorage.setItem(suppliesKey, JSON.stringify(defaultSupplies));
            localStorage.setItem(transKey, JSON.stringify(defaultTrans));
            console.log(`LocalDB: Seeded ${defaultSupplies.length} real supplies and ${defaultTrans.length} real transactions`);
        }
    },

    // Set real data for new installation
    setDefaultData() {
        console.log('LocalDB.setDefaultData() called - initializing with 100% REAL DATA');
        const realData = this.REAL_DATA;
        if (!realData) {
            console.error('LocalDB.REAL_DATA not defined');
            return;
        }

        const tableMapping = {
            departments: this.KEYS.DEPARTMENTS,
            categories: this.KEYS.CATEGORIES,
            users: this.KEYS.USERS,
            assets: this.KEYS.ASSETS,
            license_types: this.KEYS.LICENSE_TYPES,
            licenses: this.KEYS.LICENSES,
            supplies: this.KEYS.SUPPLIES,
            supply_transactions: this.KEYS.SUPPLY_TRANSACTIONS,
            suppliers: this.KEYS.SUPPLIERS,
            maintenance_tasks: this.KEYS.MAINTENANCE_TASKS,
            maintenance_events: this.KEYS.MAINTENANCE_EVENTS,
            stock_checks: this.KEYS.STOCK_CHECKS,
            stock_check_items: this.KEYS.STOCK_CHECK_ITEMS,
            alert_settings: this.KEYS.ALERT_SETTINGS,
            network_wifis: this.KEYS.NETWORK_WIFIS,
            network_nats: this.KEYS.NETWORK_NATS,
            network_remotes: this.KEYS.NETWORK_REMOTES,
            network_targets: this.KEYS.NETWORK_TARGETS,
            network_lines: this.KEYS.NETWORK_LINES,
            network_diagrams: this.KEYS.NETWORK_DIAGRAMS
        };

        const netData = this.REAL_NETWORK_DATA || {};
        Object.entries(tableMapping).forEach(([key, storageKey]) => {
            const data = realData[key] || netData[key] || [];
            localStorage.setItem(storageKey, JSON.stringify(data));
        });

        localStorage.setItem(this.KEYS.ASSET_HISTORY, JSON.stringify([]));

        const counters = {
            assets: (realData.assets || []).length + 1,
            users: (realData.users || []).length + 1,
            departments: (realData.departments || []).length + 1,
            categories: (realData.categories || []).length + 1,
            suppliers: (realData.suppliers || []).length + 1,
            licenses: (realData.licenses || []).length + 1,
            license_types: (realData.license_types || []).length + 1,
            supplies: (realData.supplies || []).length + 1,
            supply_transactions: (realData.supply_transactions || []).length + 1,
            maintenance_tasks: (realData.maintenance_tasks || []).length + 1,
            maintenance_events: (realData.maintenance_events || []).length + 1,
            stock_checks: (realData.stock_checks || []).length + 1,
            stock_check_items: (realData.stock_check_items || []).length + 1,
            network_wifis: (netData.network_wifis || []).length + 1,
            network_nats: (netData.network_nats || []).length + 1,
            network_remotes: (netData.network_remotes || []).length + 1,
            network_targets: (netData.network_targets || []).length + 1,
            network_lines: (netData.network_lines || []).length + 1,
            network_diagrams: (netData.network_diagrams || []).length + 1,
            alert_settings: 2
        };
        localStorage.setItem(this.KEYS.COUNTER, JSON.stringify(counters));
        localStorage.setItem('qlts_real_data_v2', '1');
        console.log('LocalDB: Real data saved to localStorage successfully.');
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
            } else if (name === 'SEATING_DATA') {
                try { data.SEATING_DATA = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { data.SEATING_DATA = {}; }
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
            } else if (name === 'SEATING_DATA' && data.SEATING_DATA) {
                localStorage.setItem(key, JSON.stringify(data.SEATING_DATA));
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
    if (typeof localStorage !== 'undefined') {
        console.log('LocalDB: Starting initialization...');
        window.localDBReady = LocalDB.init();
        console.log('LocalDB: Initialization complete');
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalDB;
}
