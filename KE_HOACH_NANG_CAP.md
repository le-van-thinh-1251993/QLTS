# Kế hoạch nâng cấp QLTB Local

## 1. Mục tiêu và phạm vi

Tài liệu này mô tả kế hoạch nâng cấp web quản lý tài sản local dựa trên các ưu điểm đã quan sát ở bản online `qltb.nguoitute.net`, đồng thời tận dụng những module và dữ liệu đã có trong repository hiện tại.

Mục tiêu của đợt nâng cấp:

- Làm dashboard dễ đọc và tập trung vào công việc cần xử lý.
- Tổ chức lại menu theo quy trình nghiệp vụ.
- Đưa các chức năng bảo trì, kiểm kê, cấp phát, kho và báo cáo thành các khu vực rõ ràng.
- Xây dựng module Hạ tầng & Mạng có cấu trúc tương tự bản online nhưng phù hợp với hệ thống local.
- Giữ kiến trúc static HTML/JavaScript hiện tại, tránh viết lại toàn bộ ứng dụng.
- Bảo đảm các tính năng hiện có như localStorage, import/export Excel, QR và sơ đồ vị trí không bị ảnh hưởng.

## 2. Phạm vi trong đợt này

### 2.1. Các phần sẽ thực hiện

1. Cải tổ dashboard.
2. Cải tổ sidebar và điều hướng nghiệp vụ.
3. Bộ lọc phạm vi dữ liệu theo công ty/đơn vị.
4. Tách rõ khu vực Bảo trì & Sửa chữa.
5. Tách rõ khu vực Kiểm kê.
6. Xây dựng Quản lý cấp phát tài sản.
7. Mở rộng Kho thiết bị & Vật tư.
8. Xây dựng trang Báo cáo tập trung.
9. Xây dựng module Hạ tầng & Mạng.
10. Chuẩn hóa import/export, tìm kiếm, lọc, phân trang và trạng thái cho các module mới.
11. Cập nhật tài liệu và kiểm thử hồi quy.

### 2.2. Các phần cố tình để giai đoạn sau

Các mục sau không thuộc đợt triển khai này:

- **Mục 6 trong danh sách trước: Helpdesk Ticket.**
- **Mục 14: hệ thống badge/thông báo mới theo kiểu online.** Các notification hiện có được giữ nguyên, chưa mở rộng thành trung tâm thông báo mới.
- **Branding.** Chưa đổi tên IT-AMS, logo, màu nhận diện hoặc giao diện thương hiệu.
- **Mục 15: phân quyền nâng cao.** Giữ cơ chế local user hiện tại để tiếp tục test; chưa triển khai RBAC mới.
- Chat nội bộ và trợ lý AI.
- Đồng bộ dữ liệu thời gian thực giữa nhiều máy.

Việc ghi rõ các mục hoãn giúp tránh mở rộng phạm vi trong khi các nghiệp vụ cốt lõi chưa ổn định.

## 3. Đánh giá hiện trạng local

### 3.1. Nền tảng đã có và sẽ tái sử dụng

- `index.html`: dashboard và nhiều thẻ thống kê.
- `assets.html`: danh sách tài sản, lọc, import/export Excel, QR/barcode, nhà cung cấp, khấu hao, bảo trì và kiểm kê dạng tích hợp.
- `users.html`: quản lý người dùng, phòng ban, import/export.
- `licenses.html`: license, lịch sử, bảo trì và kiểm kê dùng chung một số luồng xử lý.
- `settings.html`: cấu hình cảnh báo, profile, sao lưu/khôi phục và nhật ký hoạt động.
- `seating.html`: sơ đồ vị trí có chỉnh lưới, kéo thả, tô màu và import/export.
- `js/localDB.js`: lớp lưu dữ liệu localStorage và import workbook.
- `js/modules/page-data.js`: nạp dữ liệu dùng chung, migration trạng thái và một phần role UI.
- `js/modules/page-dashboard.js`: tính toán thống kê, cảnh báo, biểu đồ và drill-down.
- `js/modules/page-license.js`: event delegation cho thao tác tài sản, license, bảo trì và kiểm kê.
- `js/modules/page-settings.js`: cấu hình cảnh báo và nhật ký hoạt động.

### 3.2. Khoảng trống cần xử lý

- Chưa có trang Hạ tầng & Mạng.
- Bảo trì và kiểm kê đang nằm trong `assets.html`, chưa có khu vực điều hướng riêng.
- Chưa có luồng cấp phát độc lập với lịch sử bàn giao/thu hồi.
- Chưa có kho vật tư với nhập, xuất và tồn.
- Chưa có báo cáo tập trung.
- Chưa có trường phạm vi công ty/đơn vị trên mô hình dữ liệu hiện tại.
- Các trang HTML lặp lại sidebar, nên việc thêm menu phải thực hiện đồng bộ ở nhiều file.
- Dashboard có nhiều biểu đồ nhưng chưa phân nhóm theo mức độ ưu tiên vận hành.

## 4. Những điểm học từ bản online

Bản online có các ưu điểm nên áp dụng về mặt nghiệp vụ, không sao chép nguyên giao diện:

- Có bộ lọc công ty dùng làm phạm vi dữ liệu chung.
- Dashboard có các chỉ số gắn với việc cần xử lý: hỏng chờ sửa, cần bảo trì, quá hạn bảo trì, mới nhập, phiếu đang xử lý.
- Sidebar chia theo quy trình: thiết bị, người dùng, kho, cấp phát, bảo trì, kiểm kê, bản quyền, hạ tầng, báo cáo.
- Hạ tầng & Mạng là một module độc lập, có các tab nhỏ theo loại thông tin.
- Các bảng module có chung mẫu: nút tải mẫu, import Excel, export PDF/Excel, quản lý loại, thêm mới, thẻ thống kê, tìm kiếm, bộ lọc, bảng và xóa nhiều dòng.
- Module mạng có trạng thái, chi nhánh, thiết bị liên quan và vị trí; không chỉ lưu tên thiết bị.

Các phần không nên sao chép ở giai đoạn này:

- Quảng cáo demo.
- Chat và AI.
- Cơ chế SPA hoặc backend của bản online.
- Cách lưu mật khẩu mạng/VPN dạng hiển thị trực tiếp. Local phải có quy tắc che dữ liệu nhạy cảm.

# 5. Phương án triển khai Hạ tầng & Mạng

## 5.1. Phân tích module online

Module online có bốn phân hệ:

1. **Giám sát Ping & Port**
   - Danh sách mục tiêu là máy in, server, router, website hoặc domain.
   - Ping từ máy người dùng hoặc máy chủ.
   - Ping tất cả.
   - Ping từng mục tiêu.
   - Quét dải IP.
   - Theo dõi Online/Offline.
   - Độ trễ từ client và server.
   - Bật/tắt giám sát tự động.
   - Có IP/domain, port và thời điểm kiểm tra cuối.

2. **Wi-Fi**
   - SSID.
   - Mật khẩu.
   - Chuẩn bảo mật/băng tần.
   - Chi nhánh/phòng ban.
   - Thiết bị phát sóng.
   - Vị trí/VLAN.
   - Loại mạng: nội bộ, Guest, Camera/IoT, Server/Hạ tầng, khác.
   - Trạng thái hoạt động.
   - Import/export và quản lý loại mạng.

3. **NAT / Port Forwarding**
   - Tên quy tắc.
   - Cổng WAN và giao thức.
   - Đích LAN dạng IP:cổng.
   - Chi nhánh/phòng ban.
   - Thiết bị đích.
   - Vị trí lắp đặt.
   - Loại quy tắc: Camera/NVR, RDP, Web Server, VoIP, server nội bộ, khác.
   - Trạng thái hoạt động.

4. **VPN & Remote**
   - Tên kết nối.
   - Địa chỉ/giao thức.
   - Tài khoản/mật khẩu.
   - Chi nhánh/phòng ban.
   - Thiết bị liên quan.
   - Loại kết nối: Site-to-Site, Client-to-Site, TeamViewer/AnyDesk, SSH/Telnet, khác.
   - Trạng thái hoạt động.

## 5.2. Phương án phù hợp cho local

Không nên đưa thẳng sơ đồ Mermaid vào database hoặc phụ thuộc vào draw.io để module hoạt động. Phương án đề xuất là:

- Dữ liệu thiết bị mạng được lưu dạng bản ghi có cấu trúc.
- Sơ đồ mạng là một lớp hiển thị riêng, có thể gắn file draw.io/ảnh sơ đồ vào một bản ghi tài liệu.
- Mỗi modem, router, switch, access point, camera, server và đường truyền có mã riêng.
- Các bản ghi được liên kết bằng `related_asset_id` hoặc bảng liên kết mạng.
- Mọi module đều dùng chung `company_id`, `branch`, `location`, `status`, `notes`, `created_at`, `updated_at`.
- Mật khẩu Wi-Fi/VPN không hiển thị mặc định; chỉ hiển thị nút xem khi người dùng có quyền phù hợp trong giai đoạn phân quyền sau.

## 5.3. Các màn hình đề xuất

### Trang `network.html`

Trang này là shell chung cho module Hạ tầng & Mạng, gồm:

- Tiêu đề module.
- Bộ lọc công ty/chi nhánh.
- Tab nội bộ:
  - Giám sát Ping & Port.
  - Wi-Fi.
  - NAT / Port Forwarding.
  - VPN & Remote.
  - Sơ đồ mạng.
- Tìm kiếm theo tên, IP, SSID, VLAN, vị trí hoặc mã.
- Export/import dùng chung.
- Khu vực thống kê theo tab.

### Tab Giám sát Ping & Port

Giai đoạn đầu chỉ triển khai **kiểm tra thủ công từ trình duyệt** hoặc kiểm tra thông qua server local nếu server có API phù hợp.

Các nút:

- Thêm mục tiêu.
- Sửa.
- Xóa.
- Ping ngay.
- Ping tất cả.
- Lọc Online/Offline/Chưa kiểm tra.
- Quét dải IP nếu môi trường chạy có quyền và có backend hỗ trợ.
- Import mẫu Excel.
- Export CSV/Excel.

Lưu ý kỹ thuật quan trọng:

- Trình duyệt không thể ping ICMP trực tiếp do giới hạn bảo mật.
- `fetch()` tới IP/port chỉ phù hợp với dịch vụ cho phép CORS và giao thức HTTP/HTTPS.
- Ping thật từ máy chủ cần một endpoint backend như `/api/network/check` hoặc service Node riêng.
- Vì project hiện là static/localStorage, giai đoạn đầu nên lưu mục tiêu và cho phép cập nhật trạng thái thủ công hoặc dùng HTTP health check có kiểm soát.
- Không mô phỏng trạng thái Online nếu không có kết quả kiểm tra thật; phải phân biệt `Chưa kiểm tra` với `Online`.

### Tab Wi-Fi

Bảng chính:

- Mã.
- SSID.
- Loại mạng.
- Bảo mật/băng tần.
- Công ty/chi nhánh.
- Access Point.
- Vị trí.
- VLAN.
- Trạng thái.
- Ngày cập nhật.
- Thao tác.

Form thêm/sửa:

- Tên SSID.
- Mật khẩu, mặc định che bằng password input.
- Loại mạng.
- Chuẩn bảo mật.
- Băng tần.
- VLAN.
- Thiết bị phát sóng liên quan.
- Chi nhánh/phòng ban.
- Vị trí.
- Ghi chú.

### Tab NAT / Port Forwarding

Bảng chính:

- Mã quy tắc.
- Tên quy tắc.
- Modem/router.
- WAN port.
- Protocol.
- LAN IP.
- LAN port.
- Thiết bị đích.
- Mục đích.
- Chi nhánh/vị trí.
- Trạng thái.
- Ngày cập nhật.

Kiểm tra dữ liệu form:

- Port phải nằm trong khoảng 1-65535.
- Protocol chỉ nhận TCP, UDP hoặc TCP/UDP.
- IP nội bộ phải có định dạng hợp lệ.
- Không cho phép trùng cùng WAN port/protocol/router nếu chưa xác nhận.
- Có cảnh báo nếu mở RDP/SSH trực tiếp ra Internet.

### Tab VPN & Remote

Bảng chính:

- Mã kết nối.
- Tên kết nối.
- Loại kết nối.
- Địa chỉ hoặc hostname.
- Protocol.
- Thiết bị liên quan.
- Chi nhánh/phòng ban.
- Người phụ trách.
- Trạng thái.
- Ngày cập nhật.

Form:

- Không lưu secret dưới dạng hiển thị rõ trong bảng.
- Tách `username` và `secret`.
- Secret hiển thị `••••••` sau khi lưu.
- Ghi rõ mục đích và phạm vi truy cập.
- Có trường ngày kiểm tra gần nhất.
- Có trường ghi chú khi kết nối ngừng hoạt động.

### Tab Sơ đồ mạng

Tab này phục vụ sơ đồ mạng Viettel 1/Viettel 2 và các tầng đã thiết kế.

Phương án:

- Lưu metadata sơ đồ: tên, phiên bản, ngày cập nhật, người cập nhật, ghi chú.
- Cho phép đính kèm file `.drawio`, `.png` hoặc `.pdf`.
- Hiển thị ảnh preview trong web.
- Có nút tải file gốc.
- Có thể thêm danh sách node/đường truyền bên cạnh sơ đồ để tìm kiếm.
- Không dùng ảnh sơ đồ làm nguồn dữ liệu duy nhất.
- Các node quan trọng như Modem Viettel 1, Modem Viettel 2, cân bằng tải, switch, camera và access point nên tồn tại trong bảng thiết bị mạng.

## 5.4. Mô hình dữ liệu đề xuất

Có thể bắt đầu bằng các key localStorage mới trong `js/localDB.js`:

```text
NETWORK_TARGETS
NETWORK_WIFI
NETWORK_NAT_RULES
NETWORK_REMOTE_CONNECTIONS
NETWORK_DEVICES
NETWORK_LINKS
NETWORK_DIAGRAMS
NETWORK_CHECK_LOGS
NETWORK_TYPES
```

### `network_devices`

```text
id
code
name
device_type
vendor
model
ip_address
mac_address
serial_number
company_id
branch
location
vlan
status
asset_id
notes
created_at
updated_at
```

`device_type` có thể gồm:

```text
modem
router
firewall
switch
access_point
server
printer
camera
nvr
other
```

### `network_targets`

```text
id
name
target_type
host
port
protocol
company_id
branch
location
device_id
auto_monitoring
status
last_checked_at
client_latency_ms
server_latency_ms
last_error
notes
created_at
updated_at
```

### `network_wifi`

```text
id
ssid
password
security_type
band
network_type
company_id
branch
department
access_point_ids
location
vlan
status
notes
created_at
updated_at
```

### `network_nat_rules`

```text
id
name
router_id
rule_type
wan_port
protocol
lan_ip
lan_port
target_device_id
company_id
branch
location
status
notes
created_at
updated_at
```

### `network_remote_connections`

```text
id
name
connection_type
address
protocol
username
secret_masked
related_device_ids
company_id
branch
owner_user_id
status
last_verified_at
notes
created_at
updated_at
```

### `network_links`

```text
id
from_device_id
to_device_id
link_type
network_line
cable_type
port_from
port_to
status
notes
created_at
updated_at
```

`network_line` dùng các giá trị như:

```text
Viettel 1
Viettel 2
LAN
Management
CCTV
Wi-Fi
```

### `network_diagrams`

```text
id
name
version
file_name
file_type
file_data_or_path
preview_data
company_id
branch
updated_by
notes
created_at
updated_at
```

### `network_check_logs`

```text
id
target_id
checked_from
status
latency_ms
port_status
error_message
checked_at
```

## 5.5. Cách triển khai theo giai đoạn

### Hạ tầng & Mạng - Phase A: khung và dữ liệu cơ bản

- Tạo `network.html`.
- Tạo module JavaScript riêng, không nhồi thêm vào `page-license.js`.
- Thêm các key localDB và hàm CRUD.
- Tạo tab Wi-Fi, NAT, VPN/Remote và Ping.
- Tạo form thêm/sửa/xóa.
- Tạo tìm kiếm, lọc, phân trang.
- Thêm import/export Excel.

Kết quả cần đạt: người dùng quản lý được danh sách mạng, quy tắc NAT, kết nối VPN và mục tiêu giám sát mà chưa cần ping tự động.

### Hạ tầng & Mạng - Phase B: liên kết với tài sản

- Cho phép chọn thiết bị từ danh sách tài sản hiện có.
- Gắn modem/router/switch/AP/camera/server với tài sản.
- Hiển thị lịch sử thay đổi.
- Tạo liên kết giữa các thiết bị.
- Hiển thị đường mạng Viettel 1/Viettel 2.
- Thêm tab sơ đồ mạng và đính kèm draw.io/ảnh.

Kết quả cần đạt: sơ đồ và danh sách thiết bị không tách rời kho tài sản.

### Hạ tầng & Mạng - Phase C: kiểm tra kết nối

- Bắt đầu bằng health check HTTP/HTTPS an toàn.
- Lưu lần kiểm tra cuối và lịch sử.
- Hiển thị Online/Offline/Chưa kiểm tra.
- Cho phép Ping ngay nếu môi trường có backend.
- Thêm kiểm tra port TCP phía server.
- Thêm giám sát tự động bằng service Node nếu cần.

Kết quả cần đạt: trạng thái kết nối phản ánh kết quả thật, có timestamp và lỗi cụ thể.

### Hạ tầng & Mạng - Phase D: báo cáo và an toàn dữ liệu

- Báo cáo danh sách IP/domain.
- Báo cáo Wi-Fi theo chi nhánh/VLAN.
- Báo cáo NAT đang mở.
- Báo cáo VPN/Remote đang hoạt động.
- Báo cáo mục tiêu Offline.
- Che secret trong bảng và file export mặc định.
- Ghi nhật ký thay đổi các cấu hình nhạy cảm.

## 6. Kế hoạch nâng cấp các phần còn lại

## 6.1. Giai đoạn 0 - Chuẩn bị và khóa baseline

Thời lượng dự kiến: 1-2 ngày.

Công việc:

- Chạy và kiểm tra toàn bộ trang hiện có.
- Ghi lại dữ liệu local hiện tại.
- Xác nhận các key localStorage đang được sử dụng.
- Tạo bản sao dữ liệu qua chức năng backup hiện có.
- Lập danh sách các event listener quan trọng.
- Chốt quy ước ID, ngày tháng, trạng thái và tên trường.
- Tạo checklist hồi quy cho assets, users, licenses, settings, seating.

Điều kiện hoàn thành:

- Có backup dữ liệu.
- Có thể mở và thao tác các trang hiện tại.
- Không có lỗi JavaScript nghiêm trọng trong console.
- Có baseline để so sánh trước/sau.

## 6.2. Giai đoạn 1 - Cải tổ dashboard

Thời lượng dự kiến: 3-4 ngày.

Công việc:

- Gom thẻ thành nhóm Tổng quan và Cần xử lý.
- Ưu tiên số liệu bảo trì, kiểm kê, license sắp hết hạn và tài sản hỏng.
- Thêm nút làm mới dữ liệu.
- Thêm thời điểm cập nhật gần nhất.
- Làm cho thẻ có thể bấm để drill-down.
- Giảm cảm giác quá dày bằng cách chuyển biểu đồ ít dùng sang khu vực phân tích.
- Giữ biểu đồ hiện có nhưng chuẩn hóa tiêu đề, màu và trạng thái rỗng.

Điều kiện hoàn thành:

- Dashboard đọc được trong một màn hình desktop thông thường.
- Mỗi cảnh báo dẫn tới danh sách chi tiết tương ứng.
- Dữ liệu rỗng không tạo biểu đồ lỗi hoặc màn hình trống khó hiểu.

## 6.3. Giai đoạn 2 - Tổ chức lại điều hướng

Thời lượng dự kiến: 2-3 ngày.

Công việc:

- Chỉnh sidebar trên tất cả HTML hiện có để tránh lệch menu.
- Nhóm menu theo Tài sản, Vận hành, Dịch vụ, Hạ tầng, Báo cáo.
- Thêm link tới trang bảo trì, kiểm kê, cấp phát, kho và network khi các trang đã sẵn sàng.
- Không đổi branding trong giai đoạn này.
- Giữ `seating.html` nhưng đổi nhãn thành `Sơ đồ vị trí` cho đúng chức năng nếu không ảnh hưởng người dùng hiện tại.

Điều kiện hoàn thành:

- Từ mọi trang có thể tới các module chính.
- Active state của sidebar đúng với trang hiện tại.
- Mobile menu vẫn hoạt động.

## 6.4. Giai đoạn 3 - Bảo trì và Kiểm kê

Thời lượng dự kiến: 4-6 ngày.

Công việc:

- Tách bảng bảo trì thành `maintenance.html`.
- Tách bảng kiểm kê thành `stock-checks.html` nếu cần giảm tải `assets.html`.
- Dùng lại các bảng và hàm hiện có trước khi viết mới.
- Thêm filter theo trạng thái, ngày đến hạn, người phụ trách và tài sản.
- Có trang chi tiết một phiếu.
- Giữ QR scan cho kiểm kê.
- Thêm export kết quả.
- Liên kết phiếu với lịch sử tài sản.

Điều kiện hoàn thành:

- Tạo, sửa, hoàn thành và hủy phiếu hoạt động đúng.
- Phiếu quá hạn được phân biệt rõ.
- Kiểm kê có trạng thái từng tài sản.
- Không làm hỏng các thao tác đang có trong `assets.html`.

## 6.5. Giai đoạn 4 - Quản lý cấp phát

Thời lượng dự kiến: 4-5 ngày.

Công việc:

- Tạo `assignments.html`.
- Tạo bảng lịch sử cấp phát.
- Tạo form nhận thiết bị, thu hồi và chuyển người dùng.
- Lưu tình trạng tài sản tại thời điểm bàn giao.
- Cho phép in hoặc export biên bản ở giai đoạn sau của phase này.
- Khi cấp phát, cập nhật `asset.user_id`, `assigned_date` và trạng thái.
- Khi thu hồi, đưa tài sản về `Stock` và lưu lịch sử.

Điều kiện hoàn thành:

- Một tài sản có thể tra toàn bộ lịch sử người sử dụng.
- Không thể cấp cùng một tài sản cho hai người trong cùng thời điểm.
- Dữ liệu user và asset vẫn đồng bộ sau reload.

## 6.6. Giai đoạn 5 - Kho thiết bị và vật tư

Thời lượng dự kiến: 4-6 ngày.

Công việc:

- Tách logic tồn kho khỏi trạng thái tài sản nếu cần.
- Tạo danh mục vật tư tiêu hao.
- Tạo phiếu nhập kho, xuất kho và điều chỉnh.
- Liên kết nhà cung cấp hiện có.
- Thêm số lượng tối thiểu và cảnh báo tồn thấp ở mức dữ liệu, chưa mở rộng notification mới.
- Cho phép export sổ kho.

Điều kiện hoàn thành:

- Tồn kho được tính từ lịch sử nhập/xuất, không chỉ nhập tay.
- Có thể truy ngược một biến động kho.
- Không nhầm tài sản cố định với vật tư tiêu hao.

## 6.7. Giai đoạn 6 - Báo cáo

Thời lượng dự kiến: 3-5 ngày.

Công việc:

- Tạo `reports.html`.
- Tái sử dụng các hàm tính của dashboard.
- Thêm bộ lọc thời gian, công ty/đơn vị, phòng ban, trạng thái và loại.
- Bổ sung export Excel/CSV trước.
- PDF chỉ làm sau khi dữ liệu và layout ổn định.
- Thêm báo cáo tài sản, license, bảo trì, kiểm kê, cấp phát, kho và network.

Điều kiện hoàn thành:

- Cùng một bộ lọc cho xem màn hình và export.
- Tổng số trong báo cáo khớp với danh sách chi tiết.
- Ngày tháng và tiền tệ dùng cùng định dạng trong toàn hệ thống.

## 6.8. Giai đoạn 7 - Hạ tầng & Mạng

Thời lượng dự kiến: 8-12 ngày cho Phase A/B; 5-8 ngày bổ sung cho Phase C/D nếu có backend kiểm tra.

Thứ tự:

1. CRUD và localDB.
2. Wi-Fi.
3. NAT.
4. VPN/Remote.
5. Thiết bị mạng và liên kết tài sản.
6. Sơ đồ mạng.
7. Health check.
8. Báo cáo và bảo vệ dữ liệu nhạy cảm.

Không nên làm ping tự động trước CRUD vì khi đó chưa có dữ liệu, bộ lọc và lịch sử để kiểm chứng.

## 7. Kiến trúc mã nguồn đề xuất

### 7.1. File mới

```text
network.html
maintenance.html
stock-checks.html
assignments.html
reports.html
js/modules/page-network.js
js/modules/page-maintenance.js
js/modules/page-stock-checks.js
js/modules/page-assignments.js
js/modules/page-reports.js
```

Có thể gộp `maintenance.html` và `stock-checks.html` ở phiên bản đầu nếu muốn giảm số file, nhưng logic JavaScript vẫn nên tách module.

### 7.2. Quy tắc module

- Không thêm logic network vào `page-license.js`.
- Không sao chép toàn bộ CRUD giữa các trang; dùng helper dùng chung khi có thể.
- Mọi module phải đọc/ghi qua `LocalDB` thay vì gọi localStorage trực tiếp.
- Dùng một cách duy nhất cho ID, timestamp và trạng thái.
- Form phải có trạng thái loading, lỗi và thành công.
- Xóa nhiều dòng phải có xác nhận.
- Các field nhạy cảm phải có masking.
- Event delegation chỉ đặt trong module sở hữu giao diện đó.

### 7.3. Tương thích dữ liệu

Trước khi thêm key mới:

- Tăng version migration trong `localDB.js`.
- Nếu chưa có dữ liệu thì khởi tạo mảng rỗng.
- Không xóa key cũ.
- Backup/restore phải bao gồm các bảng mới.
- Import workbook cũ không được lỗi vì thiếu sheet network.

## 8. Tiến độ tổng thể dự kiến

| Giai đoạn | Nội dung | Thời lượng |
|---|---|---:|
| 0 | Baseline, backup, quy ước dữ liệu | 1-2 ngày |
| 1 | Dashboard | 3-4 ngày |
| 2 | Sidebar và điều hướng | 2-3 ngày |
| 3 | Bảo trì và kiểm kê | 4-6 ngày |
| 4 | Cấp phát | 4-5 ngày |
| 5 | Kho và vật tư | 4-6 ngày |
| 6 | Báo cáo | 3-5 ngày |
| 7A | Network CRUD | 8-12 ngày |
| 7B | Network liên kết tài sản và sơ đồ | 4-6 ngày |
| 7C | Health check nếu có backend | 5-8 ngày |
| 8 | Hồi quy, sửa lỗi, tài liệu | 3-5 ngày |

Tổng thời lượng thực tế phụ thuộc việc làm tuần tự hay song song và việc có thêm backend kiểm tra mạng hay không.

## 9. Chiến lược kiểm thử

### 9.1. Kiểm thử dữ liệu

- Tạo mới, sửa, xóa và reload trang.
- Backup rồi restore.
- Import file hợp lệ.
- Import file thiếu cột.
- Import dữ liệu trùng mã.
- Dữ liệu tiếng Việt.
- Ngày tháng không hợp lệ.
- Giá trị rỗng.
- Nhiều bản ghi.

### 9.2. Kiểm thử nghiệp vụ

- Cấp phát và thu hồi tài sản.
- Tạo phiếu bảo trì và đánh dấu hoàn thành.
- Tạo đợt kiểm kê và scan QR.
- Lọc dữ liệu theo nhiều điều kiện.
- Export dữ liệu sau khi lọc.
- Liên kết thiết bị mạng với tài sản.
- Ẩn secret Wi-Fi/VPN.
- Ping mục tiêu chưa kiểm tra.

### 9.3. Kiểm thử giao diện

- Desktop 1366px trở lên.
- Tablet.
- Mobile.
- Dark mode hiện tại.
- Sidebar mobile.
- Modal dài và bảng rộng.
- Empty state.
- Loading/error state.

### 9.4. Kiểm thử hồi quy bắt buộc

Sau mỗi phase phải kiểm tra:

- Dashboard mở được.
- Assets mở được.
- Users mở được.
- Licenses mở được.
- Settings mở được.
- Seating mở được.
- Đăng nhập local không bị thay đổi ngoài phạm vi.
- Backup/restore vẫn hoạt động.

## 10. Tiêu chí nghiệm thu cuối đợt

- Người dùng có thể nhìn dashboard và biết ngay tài sản nào cần xử lý.
- Bảo trì và kiểm kê có luồng riêng, không phụ thuộc việc mở đúng modal trong danh sách tài sản.
- Cấp phát có lịch sử và không cho cấp trùng tài sản đang được sử dụng.
- Kho có thể theo dõi nhập, xuất và tồn.
- Báo cáo dùng cùng bộ lọc với danh sách.
- Hạ tầng & Mạng có đủ bốn tab Ping/Port, Wi-Fi, NAT và VPN/Remote.
- Có thể lưu thông tin modem Viettel 1, modem Viettel 2, switch, Wi-Fi, camera, NAT và VPN theo cấu trúc dữ liệu.
- Sơ đồ mạng có thể đính kèm và tra cứu cùng danh sách thiết bị.
- Không lưu hoặc export mật khẩu nhạy cảm ở dạng hiển thị mặc định.
- Không làm hỏng dữ liệu local hiện tại.
- Các mục đã hoãn không được kéo vào phạm vi triển khai này.

## 11. Rủi ro và cách xử lý

### Rủi ro trình duyệt không ping được thiết bị

Xử lý bằng health check HTTP hoặc thêm Node service/API riêng. Không gọi đó là ICMP ping nếu thực tế chỉ kiểm tra HTTP.

### Rủi ro dữ liệu localStorage lớn

Tách dữ liệu theo key, thêm export backup và giới hạn preview bảng. Nếu dữ liệu tăng cao, chuyển dần sang IndexedDB hoặc backend.

### Rủi ro lộ mật khẩu Wi-Fi/VPN

Mask mặc định, không export secret, thêm nhật ký xem secret ở giai đoạn có phân quyền.

### Rủi ro lặp sidebar ở nhiều HTML

Tạm thời cập nhật đồng bộ bằng checklist. Về sau có thể tạo template build hoặc component dùng chung, nhưng không cần đổi kiến trúc ngay trong đợt này.

### Rủi ro sửa module cũ làm hỏng dữ liệu

Luôn backup trước migration, dùng key mới, không đổi nghĩa các field cũ nếu chưa có migration rõ ràng.

## 12. Thứ tự ưu tiên thực tế

Nếu cần rút ngắn tiến độ, làm theo thứ tự:

1. Dashboard cần xử lý.
2. Sidebar và điều hướng.
3. Bảo trì.
4. Kiểm kê.
5. Cấp phát.
6. Hạ tầng & Mạng: Wi-Fi, NAT, VPN/Remote.
7. Liên kết thiết bị mạng với tài sản.
8. Báo cáo.
9. Ping/Port tự động.
10. Kho vật tư nâng cao.

Lý do: các bước đầu tận dụng được dữ liệu và logic hiện có; ping tự động và kho vật tư có nhiều vấn đề kiến trúc hơn nên không nên làm trước.

## 13. Kết luận

Local không cần viết lại theo bản online. Hướng phù hợp là giữ nền tảng static/localStorage hiện tại, sau đó nâng cấp theo ba trục:

- Đưa nghiệp vụ đang có ra thành các module rõ ràng.
- Làm dashboard tập trung vào việc cần xử lý.
- Xây dựng Hạ tầng & Mạng như một module dữ liệu độc lập, có liên kết với tài sản và sơ đồ mạng.

Trong đợt này, Helpdesk Ticket, badge thông báo mới, Branding và phân quyền nâng cao được để sau đúng yêu cầu. Việc triển khai nên bắt đầu từ baseline và dashboard, sau đó mới tách module vận hành và xây dựng network.
