---
target: Foodie A/B card preview; equal main-variant heuristic score from independent Assessment A; B2 separately documented
total_score: 17
max_score: 24
na_heuristics: 3,5,9,10
p0_count: 0
p1_count: 0
target_identity: "file:C:\\xampp\\htdocs\\DatMonAnOnline\\FE\\previews\\restaurant-cards\\RestaurantCard.tsx"
target_fingerprint: "sha256:982cb4a0ef1a840c6b2185296ff851a0cca0df57d6212bf8d54104ef70a4292e"
target_path: "C:\\xampp\\htdocs\\DatMonAnOnline\\FE\\previews\\restaurant-cards\\RestaurantCard.tsx"
timestamp: 2026-11-02T18-00-59Z
slug: fe-previews-restaurant-cards-restaurantcard-tsx
---
# Foodie — Restaurant card design exploration

Ngày 03/11/2026. **Chỉ preview; chưa áp dụng phương án nào vào production.**

Critique dùng **hai agent độc lập**, đã được chủ dự án cho phép: Assessment A đánh giá thiết kế; Assessment B đo browser và detector. A không đọc B/detector. B chỉ kiểm sự tồn tại marker A hoàn tất rồi mới chạy detector, không đọc kết luận A. Cả hai xem cùng snapshot, viewport và bối cảnh Home; không trao đổi kết luận trước khi hoàn tất. Tổng hợp dưới đây không chọn phương án thắng.

## 1. Mở preview

- **A — Refined horizontal:** http://127.0.0.1:19185/?variant=a
- **B — Visual marketplace, mobile 1 cột:** http://127.0.0.1:19185/?variant=b
- **B — thử mobile 2 cột:** http://127.0.0.1:19185/?variant=b&columns=2

Server preview riêng đang chạy ở loopback 19185. Cách build/chạy lại: [README](FE/previews/restaurant-cards/README.md). Không dùng default `npm run dev` để đánh giá preview: bản này cần config/build riêng để bật transform card.

Preview reuse **App, routes, Header, Home, hero, search/chips, filters và Footer hiện tại**. Plugin Vite chỉ thay template Link card khi build preview, không ghi lại Home.tsx. Nếu không tìm đúng template, build dừng thay vì tự thay nhầm. Không thêm route hoặc mục navigation vào ứng dụng production.

Build riêng xuất vào `.build-check/card-exploration/dist`, không phải `FE/dist`. Entry/CSS/component/data/config/server mới chỉ nằm trong `FE/previews/restaurant-cards/`. Default production build không import chúng.

## 2. Dữ liệu và điều kiện so sánh

Nguồn là snapshot thực từ GET công khai `http://127.0.0.1:5038/api/nha-hang?pageNumber=1&pageSize=8&sort=rating`, HTTP 200. Thời điểm lấy: `2026-11-02T17:27:46.126Z` = **00:27:46 ngày 03/11 giờ Việt Nam**. Đây là dữ liệu hiện hữu của API local, **không gọi nó là API/MySQL test cô lập**. Chỉ GET để lấy snapshot; không khởi tạo/seed/reset/migrate hoặc ghi database.

- Cùng 8 ID theo thứ tự: **7, 4, 10, 1, 5, 2, 8, 6**.
- Cùng tên/mô tả/ảnh/rating/trạng thái/phí. Snapshot có rating 4,5 / 4,5 / 4,5 / 4,5 / 4,0 / 4,0 / 4,0 / 3,5; cả 8 quán đang mở tại thời điểm snapshot. Không tạo số lượt đánh giá, ETA, ưu đãi hoặc đánh giá giả.
- Snapshot được cố định cho request Home ở cả A/B, kể cả refresh định kỳ của Home, tránh thay dữ liệu/trạng thái giữa các lần chụp. Dữ liệu không phải trạng thái live hiện tại của các quán.
- Ảnh gốc được phục vụ từ public uploads hiện hữu. Không chỉnh, thay hoặc ghi đè ảnh; cùng `object-fit: cover`, `object-position: 50% 50%`.
- `snapshot.json` chỉ giữ các trường công khai cần cho Home; `provenance.json` lưu URL/thời điểm/hash response gốc trước lọc trường. Bản raw và parity đo từ DOM nằm trong `.build-check/card-exploration/`.
- Server preview chặn mọi phương thức ghi bằng 405. Các GET public khác được proxy đọc để kiểm điều hướng tới trang chi tiết thật. Không dùng preview để đăng nhập/đặt hàng/thanh toán hoặc kiểm nghiệp vụ ghi dữ liệu.

## 3. Hai phương án

### A — Refined horizontal

Desktop hai cột card ngang; ảnh vuông **192×192px**, tăng 20% mỗi chiều so với khung 160px hiện có (diện tích tăng khoảng 44%). Tên 20px, mô tả một dòng, rating/trạng thái/phí nhóm gọn cạnh ảnh. Bỏ separator và CTA “Xem quán” lặp; toàn card vẫn là một Link.

Tablet 768px dùng một cột ngang để giữ mô tả dễ đọc. Mobile một cột: ảnh 128px ở 375/390, 104px ở 320 để chừa chỗ cho chữ; tên 17px. Card mobile khoảng 167px tại 375. Ở 320, ảnh không bị ép lớn hơn bằng mọi giá vì sẽ làm cột chữ quá chật.

**Ưu:** so sánh tên/phí/trạng thái gần nhau; nhìn nhiều bản tóm tắt hoàn chỉnh; ảnh lớn hơn bản hiện tại nhưng không lấn toàn bộ thông tin.

**Nhược:** mobile mô tả bị cắt sớm; crop vuông mất nhiều bối cảnh ảnh; tablet một cột có vùng chữ rộng nhưng không tận dụng mật độ hai cột. Cấu trúc có thể mang cảm giác directory hơn marketplace nếu ảnh chỉ là thumbnail nội thất.

### B — Visual marketplace

Ảnh nằm trên, khung **16:10**; desktop ba cột, tablet hai cột, mobile mặc định một cột. Tên và metadata nằm ngoài ảnh, cùng dữ liệu và thứ tự như A. Tên có chỗ tối đa hai dòng để các hàng ổn định; khoảng trống ở tên desktop ngắn là trade-off giữa alignment và mật độ.

Tại 1366 ảnh khoảng **421×263px**; mobile một cột 375 ảnh **343×214px**. Card cao khoảng 446px desktop / 361px mobile.

**Ưu:** ảnh rõ, dễ nhận diện bối cảnh và món khi ảnh thực sự có món; nhịp khám phá giàu hình ảnh; mô tả có chiều rộng tốt hơn A mobile.

**Nhược:** tên/phí xuống thấp hơn, cần cuộn nhiều hơn để so sánh quán tiếp theo; nội thất chiếm ưu thế nếu upload ít món. Không thể dùng kích thước ảnh để tự khắc phục chất lượng/chủ thể ảnh.

### B — mobile hai cột, chỉ là thử nghiệm

375px: mỗi card rộng 165,5px, ảnh cao khoảng 103px, card khoảng 262px. 320px: card chỉ 138px, vùng chữ bên trong khoảng 114px. Cùng font, metadata và vùng bấm cả card; không giấu phí/trạng thái để nhét cột.

**Ưu:** nhiều lựa chọn ảnh xuất hiện đồng thời. **Nhược:** tên/mô tả hẹp, metadata phải xuống hàng, ảnh khó cho thấy món nhỏ. Không mặc định hai cột mobile là phương án nên áp dụng.

Sau hai đánh giá ban đầu, sửa riêng một lỗi nhỏ trong preview: dùng khoảng trắng không ngắt giữa số tiền và ₫. Đã retest 15 tổ hợp: số tiền + đơn vị luôn cùng một dòng; tiền vẫn có thể xuống dòng dưới nhãn “Phí giao” khi khung hẹp. Không thay số tiền hoặc source snapshot. Ảnh/review độc lập của agents là bằng chứng trước hotfix nhỏ này; 12 ảnh chính đã chụp lại sau sửa.

## 4. Screenshot trong bối cảnh Home

Thư mục: [docs/ux-audit/card-exploration](docs/ux-audit/card-exploration/). **12 ảnh chính bắt buộc**; còn ảnh độc lập/focus của agents và một ảnh retest phí để truy vết.

| Bối cảnh / viewport | A | B 1 cột mobile | B 2 cột mobile |
|---|---|---|---|
| First viewport 1366×768, có Header + hero | [A đầu trang](docs/ux-audit/card-exploration/a-1366x768-first.png) | [B đầu trang](docs/ux-audit/card-exploration/b-1366x768-first.png) | Desktop giống B |
| Vùng card 1366×768 | [A danh sách](docs/ux-audit/card-exploration/a-1366x768-cards.png) | [B danh sách](docs/ux-audit/card-exploration/b-1366x768-cards.png) | Desktop giống B |
| First viewport 375×812 | [A mobile](docs/ux-audit/card-exploration/a-375x812-first.png) | [B mobile 1 cột](docs/ux-audit/card-exploration/b-375x812-first.png) | [B mobile 2 cột](docs/ux-audit/card-exploration/b-two-375x812-first.png) |
| Vùng card 375×812 | [A mobile cards](docs/ux-audit/card-exploration/a-375x812-cards.png) | [B 1 cột cards](docs/ux-audit/card-exploration/b-375x812-cards.png) | [B 2 cột cards](docs/ux-audit/card-exploration/b-two-375x812-cards.png) |
| Vùng card 768×1024 | [A tablet](docs/ux-audit/card-exploration/a-768x1024-cards.png) | [B tablet](docs/ux-audit/card-exploration/b-768x1024-cards.png) | Tablet giống B |

[Retest phí Sushi ở hai cột mobile](docs/ux-audit/card-exploration/b-two-375x812-fee-retest.png).

Không dùng crop card standalone làm bằng chứng duy nhất. Ảnh vùng card giữ Header, section title và filters; ảnh first viewport giữ nguyên Home/hero/search/chips. Không sửa chiều cao hero để ưu ái một phương án.

## 5. Mật độ và viewport

Đếm từ cùng mốc cuộn section: tiêu đề “Nhà hàng nổi bật” nằm 16px dưới Header, filters vẫn hiển thị. “Có phần thấy” bao gồm cả card hoàn chỉnh. Số đo mô tả ảnh chụp, không phải conversion hoặc preference test.

| Viewport / mốc cuộn vùng danh sách | A hoàn chỉnh / có phần thấy | B một cột mobile | B hai cột mobile |
|---|---:|---:|---:|
| 1366×768 | 4 / 6 | 3 / 6 | Desktop giống B |
| 768×1024 | 3 / 4 | 2 / 4 | Tablet giống B |
| 375×812 | 2 / 3 | 1 / 2 | 2 / 4 |

Nếu cuộn bỏ cả heading/filter và căn card đầu 16px dưới Header, phép đo độc lập B tại 375px thấy A 3 card hoàn chỉnh, B một cột 1, B hai cột 4. Đây là **mốc cuộn khác**, không thay số của bảng trên. Một bộ density extra desktop của B có lỗi đo hidden bottom-nav top=0; đã loại bộ dòng đó khỏi kết luận, không âm thầm coi là PASS.

Ở first viewport mobile 375×812 **chưa có card nào**, với cả A/B: card bắt đầu khoảng y=873. Đây là chi phí chung của hero/chips/section/filter hiện tại, không phải lỗi riêng một variant. Tại desktop card bắt đầu khoảng y=558: A lộ tên/phí của hai quán; B lộ ba ảnh, tên/phí thấp hơn. Không card frame nào nằm trọn first viewport desktop: A frame cuối vượt khoảng 6px, ảnh và metadata chính vẫn thấy; B cần cuộn thêm để đọc phần thông tin.

## 6. Hai đánh giá độc lập: đồng thuận và khác biệt

Bản đầy đủ: [Assessment A](docs/ux-audit/card-exploration/assessment-a.md), [Assessment B](docs/ux-audit/card-exploration/assessment-b.md).

**Đồng thuận:** cả A/B thuộc Chợ ngon; A thuận tiện quét/so sánh, B tạo điểm nhấn ảnh; mô tả một dòng có thể mất thông tin phân biệt; ảnh nội thất hạn chế cảm giác món ăn; hai cột mobile chật tại 320; phần nội dung chung phía trên làm mobile chưa thấy card ngay đầu trang. Không agent nào chọn phương án thắng.

**Khác biệt về trọng tâm, không có bất đồng trực tiếp lớn:**

- A nhấn mạnh crop vuông làm mất cảnh và cảm giác đọc yên tĩnh ở tablet; B thận trọng hơn, không coi một ratio/crop nào luôn giữ chủ thể tốt hơn cho cả bộ ảnh.
- A đánh giá B hai cột mobile dè dặt hơn vì nhịp đọc/phí; B nhấn mạnh đây là breakpoint nội dung và vẫn có lợi thế nhiều lựa chọn đồng thời. Đếm card không tự chứng minh quyết định chọn quán dễ hơn.
- A dùng heuristic qualitative và chỉ xác nhận semantics từ DOM; B kiểm thực focus/hover/reduced. Root bổ sung Enter navigation và retest tiền–₫ sau hotfix. Không dùng phạm vi kỹ thuật rộng hơn để áp điểm thẩm mỹ của B cao hơn A.

Assessment A chấm 10 heuristic Nielsen trên phạm vi card đã tải: 6 mục áp dụng, 4 mục n/a. Điểm **A 17/24, B một cột 17/24, B hai cột 15/24**; đây không phải thử nghiệm người dùng hoặc xếp hạng để chọn layout.

| Heuristic (0–4) | A | B 1 cột mobile | B 2 cột mobile |
|---|---:|---:|---:|
| Visibility of status | 3 | 3 | 3 |
| Match real world | 3 | 3 | 3 |
| User control/freedom | n/a | n/a | n/a |
| Consistency | 3 | 3 | 3 |
| Error prevention | n/a | n/a | n/a |
| Recognition vs recall | 3 | 3 | 2 |
| Flexibility/efficiency | 2 | 2 | 2 |
| Aesthetic/minimalism | 3 | 3 | 2 |
| Error recognition/recovery | n/a | n/a | n/a |
| Help/documentation | n/a | n/a | n/a |

Các mục n/a không có đủ tác vụ/trạng thái tương ứng trong card đã tải; không suy rằng toàn Foodie không cần kiểm các mục đó. Cognitive load: 6 gợi ý nhanh, 4 filters và 8 quán được nhóm rõ nhưng tăng khoảng cuộn trước lựa chọn; A giảm nhớ lại phí khi so sánh, B tạo điểm nhấn ảnh rồi yêu cầu cuộn thêm. Với người mới, ảnh/mô tả bị cắt có thể bắt mở quán chỉ để hiểu món; với người dùng điện thoại phân tâm, B hai cột tăng số lựa chọn nhưng không chắc giảm nỗ lực đọc. Cảm xúc chung ấm và quen thuộc; A thực dụng, B giàu ảnh, cả hai cần kiểm giá trị thực của ảnh trước khi hứa cải thiện đặt món.

## 7. Ảnh thực và crop

Bộ ảnh quan sát có kích thước nguồn 1280×720. Gà/phở có món rõ hơn; sushi/trà sữa/cà phê thiên nhiều về quầy, bàn ghế và nội thất. Phóng ảnh lớn làm không gian hấp dẫn hơn, nhưng không tự khiến khách nhận ra món nhanh hơn.

Với nguồn 16:9 và center-cover: A vuông giữ khoảng 56% chiều rộng nguồn; B 16:10 giữ khoảng 90%. Đây là hình học crop, không phải đánh giá chất lượng ảnh. A có thể làm món ở giữa lớn hơn nhưng cắt món/chủ thể lệch; B giữ nhiều không gian, có thể khiến ảnh quán lấn món. Không đổi ảnh, chỉnh nội dung ảnh hoặc giả ảnh món thay ảnh upload.

Nếu áp dụng sau này, kiểm focal point từng ảnh thực hoặc cho chủ quán chọn cover phù hợp trong chức năng hiện hữu/được duyệt; không tự thêm công cụ upload/crop hoặc bịa phân loại ẩm thực trong lượt preview này.

## 8. Skeleton cần làm nếu áp dụng

**Chưa sửa HomeSkeleton/RestaurantCardSkeleton production.** Khi có lựa chọn:

- A: skeleton card phải theo đúng grid ngang, ảnh 192px desktop/tablet, 128px mobile và 104px ở 320; padding/gap/title/description/metadata cùng chiều cao card thật. Desktop 2 cột, tablet/mobile 1 cột như preview nếu được chọn giữ nguyên.
- B: skeleton phải chuyển ảnh lên trên 16:10, desktop 3 cột / tablet 2 / mobile 1; nếu chọn mobile 2 cột, thêm breakpoint theo nội dung và placeholder cao đúng khung 138–173px rộng. Reserve cả khối chữ và metadata, không chỉ ảnh.
- Cần đối chiếu cả loading list trong Home (`count=8`) lẫn HomeSkeleton kiểm session (đang dùng 3 card placeholder). Không thêm một min-height trang quá lớn để che shift; chỉ giữ chỗ cho các vùng/first rows cần thiết.
- Preview đã đo ổn định trong phiên guest và snapshot nhanh, nhưng không chứng minh loading/session/network production đã phù hợp với card mới. Phải đo lại cold load, authenticated checking và tải chậm sau khi sửa skeleton được duyệt.

## 9. Kiểm chứng và giới hạn

| Kiểm tra | Kết quả |
|---|---|
| Production FE `npm run build`, `npm run lint` | PASS |
| Preview `npx tsc -p previews/restaurant-cards/tsconfig.json`, Vite build config riêng | PASS |
| Browser root bản cuối | 72/72 PASS; 15 tổ hợp A/B/B2 × 320/375/390/768/1366; ảnh/metadata/order parity, semantics, reserve ảnh, số tiền–₫ |
| Keyboard / motion | Tab tới card đầu; Enter tới route nhà hàng thật; hover dùng Motion 2.0 hiện hữu (-5px); focus 2px offset 3px; reduced-motion vô hiệu transition/animation theo thiết lập người dùng |
| Browser độc lập agents | A: 5 tổ hợp bổ sung; B: 15 tổ hợp + focus/reduced/density; không uncaught exception trong các lượt thành công |
| Overflow | Không overflow toàn trang ở các tổ hợp đã chạy; B2 vẫn có vấn đề đọc chật, không đánh đồng với overflow FAIL |
| Git diff whitespace | PASS |
| Production separation | Không có `cx-card`/`card-exploration`/plugin preview trong assets production; không có import preview trong source production |

CLS guest lab đo bằng PerformanceObserver cài trước app, cache disable/clear, chờ font và thêm 1,5 giây sau loaded; dùng session window 1s gap / 5s tối đa, bỏ `hadRecentInput` đúng chuẩn. Header/hero/data cùng trạng thái giữa variants; không tắt PageLoader/motion hoặc giấu phần tử gây shift.

| Variant / viewport | Normal CLS | Reduced CLS |
|---|---:|---:|
| A 375×812 | 0 | 0 |
| A 1366×768 | 0,001208 | 0,000658 |
| B 375×812 | 0 | 0 |
| B 1366×768 | 0,001037 | 0,001096 |
| B2 375×812 | 0 | Không đo cold reduced riêng B2 |

Nguồn `metrics.json`, `cls.json`, `parity.json`, `browser-main.json` ở `.build-check/card-exploration/`. Không coi đây là field Core Web Vitals, percentile, slow-network/CPU, authenticated HomeSkeleton hoặc mọi dataset.

Detector độc lập B xác minh `detect --help` của bản cài, đợi A hoàn tất, rồi scan đủ ba URL ở 375×812 và 1366×768. **Hai lệnh cuối exit 0, 0 primary; mỗi viewport 3 advisory**, cùng một straggler footer lặp qua ba URL, không phải sáu lỗi card. Exact command và JSON/stderr/exit có hậu tố `-retry` trong artifact B. Dùng batch wrapper quote URL chứa `&columns=2`; lần đầu PowerShell-to-cmd bị tách `&` trả exit 1 là lỗi harness, không coi là PASS. Không dùng detector thay đánh giá thẩm mỹ. Scan diễn ra trước hotfix NBSP; browser 72 checks sau hotfix đã kiểm lại tất cả variants.

Không kiểm screen reader, zoom/thiết bị thật/Safari/Firefox, preference/conversion hoặc trạng thái đóng/tạm ngưng/thiếu rating/ảnh lỗi bằng dữ liệu thay thế. Snapshot thật hiện có đều mở và ảnh đều tải được; không giả dữ liệu khác để làm demo đẹp. Runtime exception ở lần đầu server harness chưa đúng path và lần sandbox CDP timeout được giữ trong log; đã sửa/chạy lại, không sửa app production để né test.

## 10. Đề xuất theo mục tiêu — chưa chọn phương án

- Nếu ưu tiên nhận diện quán quen và so sánh phí/trạng thái: cân nhắc A, đặc biệt danh sách dài và mobile; vẫn cần duyệt crop/mô tả mobile.
- Nếu ưu tiên khám phá bằng ảnh: cân nhắc B ba cột desktop, hai cột tablet, một cột mobile; phải chấp nhận nhiều cuộn hơn và kiểm chất lượng/chủ thể ảnh thật.
- B hai cột mobile chỉ nên xem là lựa chọn có điều kiện, nhất là 320px. Technical PASS không giải quyết được câu hỏi đọc nhanh và nhận diện món; không ép chọn chỉ vì thấy nhiều card hơn.

Không tự sửa hero, card production hoặc skeleton để đẩy một phương án thành người thắng. **Chờ chủ dự án chọn A/B và cấu hình mobile trước mọi áp dụng.**

## 11. Phạm vi file và Git

File mới: `FE/previews/restaurant-cards/{index.html,main.tsx,RestaurantCard.tsx,preview.css,vite.config.ts,tsconfig.json,server.mjs,snapshot.json,provenance.json,README.md}`, báo cáo này, ảnh và hai bản đánh giá độc lập trong `docs/ux-audit/card-exploration/`. Harness/log/build chỉ ở `.build-check/card-exploration/` được Git ignore; snapshot critique của skill được ghi riêng nếu helper hỗ trợ.

Baseline Git/status/stat/hash trước tác vụ và đối chiếu cuối nằm trong `.build-check/card-exploration/`. Không reset/stash/checkout/commit; bảo toàn diff cũ. Home/Restaurants/HomeSkeleton/Header/App/production CSS, backend/API/database và Motion source không có thay đổi mới trong lượt này. Không ghi database. Preview chưa được áp dụng vào website thật.

**PASS:** tạo preview/capture/kiểm chứng các ca nêu trên. **Cần quyết định:** layout và mật độ được ưa thích. **NOT TESTED:** các phạm vi accessibility/performance/nghiệp vụ ngoài preview đã nêu; không tuyên bố toàn Foodie E2E PASS hoặc production-ready.
