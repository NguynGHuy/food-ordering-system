# Ảnh demo Foodie

10 ảnh bìa quán và 124 ảnh món được tạo riêng bằng công cụ AI imagegen cho bộ seed hiện tại. Đây là ảnh minh họa, không phải ảnh chụp cơ sở thật. Không tải ảnh của bên thứ ba; không phụ thuộc dịch vụ ảnh trực tuyến khi chạy demo.

- `manifest.json`: tên quán/món, đường dẫn tương đối, nguồn tạo, prompt, kích thước, số byte và SHA256 từng ảnh.
- `DatMonAnOnline.API/wwwroot/uploads/restaurants/demo-v1-*.webp`: 10 bìa, 1280×720.
- `DatMonAnOnline.API/wwwroot/uploads/foods/demo-v1-*.webp`: 124 món, 800×600.
- Tổng dung lượng: 10.272.840 byte (~9,80 MiB). Tất cả ảnh đã được kiểm tra theo tên/mô tả trong seed bằng bảng ảnh có nhãn.
- Ảnh thiếu hoặc chưa xác minh nội dung: không có trong 134 mục của manifest.

## Sử dụng

`SeedDemo.sql` dùng các URL `/uploads/...` tương đối với máy chủ API. `MediaImage` giải quyết URL qua cấu hình API hiện có và dùng SVG dự phòng local khi URL lỗi. Khi deploy, cần mang theo `wwwroot/uploads/` và `FE/public/images/` (được chép vào bản build FE).

**Sửa seed không tự đổi dữ liệu của database đang chạy.** Không chạy lại bộ cài schema để cập nhật ảnh cho database có dữ liệu. Theo yêu cầu tiếp theo của chủ dự án, ngày 26/10/2026 đã gắn đủ 10/124 ảnh vào database local bằng công cụ bên dưới; không thay cột khác hoặc schema.

### Gắn ảnh vào dữ liệu demo đã có

```powershell
# Chỉ đọc và xem trước, lấy kết nối Development từ cấu hình/user-secrets hiện có:
dotnet run --project scripts/demo-images/AttachToDatabase/AttachToDatabase.csproj -c Release
# Chỉ chạy khi được phép cập nhật database demo LOCAL:
dotnet run --project scripts/demo-images/AttachToDatabase/AttachToDatabase.csproj -c Release -- --apply
```

Công cụ chỉ chấp nhận localhost và database DatMonAnOnline. Ghép theo tên quán và tên món trong đúng quán, dừng nếu thiếu/trùng tên; kiểm tra đủ checksum 134 file. Chỉ thay ảnh trống hoặc ba URL bìa mẫu gốc đã xác minh. Các ảnh riêng khác được giữ lại và báo rõ. Cập nhật hai cột ảnh trong một transaction có khóa và so sánh giá trị cũ; chạy lại không tạo cập nhật trùng. Backup đường dẫn cũ/mới và ID thực nằm trong `.build-check/demo-image-attachments/`, không chứa secret. Giữ backup nếu cần khôi phục; không có thao tác xóa file ảnh.

Ở **Quán → Thông tin quán**, chọn JPEG/PNG/WebP không quá 5 MB, xem trước rồi bấm **Lưu thay đổi**. API xác định chủ quán từ JWT, giải mã và chuẩn hóa ảnh thành WebP. File mới có tiền tố `owner-*`; không ghi đè hoặc xóa ảnh cũ. Upload xong nhưng chưa lưu hồ sơ sẽ chưa đổi ảnh đang hiển thị. File upload chưa được dùng vẫn được giữ; không có tác vụ dọn ảnh tự động trong phạm vi này.

Hồ sơ pháp lý vẫn ở `App_Data` riêng tư. Không thay đổi cấu trúc database hoặc luồng thêm/sửa món.

## Kiểm tra

Chạy từ thư mục gốc repository:

```powershell
node scripts/demo-images/verify.mjs
dotnet test scripts/demo-images/Verification/Verification.csproj -c Release
```

Build FE bằng `npm run build` trong `FE/`, sau đó chạy:

```powershell
node scripts/demo-images/browser-test.mjs
```

- `verify.mjs` kiểm tra số lượng, file WebP, SHA256, giới hạn dung lượng, đường dẫn seed và đúng hai file SQL. Tùy chọn `--update-seed` chỉ sửa hai trường ảnh trong file seed, không kết nối DB.
- Test .NET chạy Kestrel độc lập, controller thực và EF InMemory: kiểm tra upload, quyền, file sai định dạng, đồng thời/retry, CORS, 404, file riêng tư, API danh sách/chi tiết và tải/giải mã 134 ảnh. Không phải kiểm thử MySQL hoặc xác thực JWT production.
- Browser test chạy Edge headless với bản build FE, API giả lập và ảnh thực; chặn request ra mạng ngoài. Kiểm tra danh sách, chi tiết, mobile, fallback, giỏ, checkout và upload. Có thể đặt `FOODIE_TEST_BROWSER` nếu Edge cài ở vị trí khác.
- Bằng chứng trình duyệt và bảng ảnh chỉ nằm trong `.build-check/`, được Git ignore.

`prepare.py` là công cụ chuyển PNG nguồn sang WebP (cần Pillow). Bản đồ đường dẫn PNG nguồn riêng tư không được commit; các WebP đã chuẩn bị sẵn nên không cần tạo ảnh lại khi cài dự án. Công cụ từ chối ghi đè file có checksum khác manifest.
