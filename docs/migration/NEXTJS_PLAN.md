**Mình đề xuất chuyển sang Next.js App Router + TypeScript, giữ Supabase và toàn bộ nội dung/audio.** Chuyển từng luồng trên bản preview, đạt đủ chức năng rồi mới thay website hiện tại.

Mình vừa kiểm tra cây thư mục `main`: đã có module activity, migration thời gian học và import provenance, cùng tests tương ứng. Vì vậy, kế hoạch migration cần **kế thừa các thay đổi mới này**, không quay lại bản code đã review trước đó. Mình chưa kiểm chứng lại hành vi của các bản sửa trong lượt này.

**1. Chốt cách deploy trước**

| Hướng | Phù hợp khi nào | Giới hạn |
|---|---|---|
| **Next.js trên hosting có Node.js — đề xuất** | Muốn dùng server rendering, auth phía server và endpoint AI trong Next.js | Cần chuyển frontend khỏi GitHub Pages |
| Next.js static export trên GitHub Pages | Muốn giữ hosting hiện tại | Không có runtime Next.js để xử lý Server Actions hoặc API động; backend tiếp tục ở Supabase |

Next.js hỗ trợ static export, nhưng các tính năng cần server không hoạt động trong chế độ đó. [Next.js](https://nextjs.org/docs/app/guides/static-exports?utm_source=chatgpt.com)

**Hướng chính của kế hoạch:** deploy bản Next.js lên môi trường hỗ trợ Node.js, giữ Pages cũ để đối chiếu và quay lại khi cần. Chưa chuyển domain ngay.

**2. Phần giữ lại và phần cần viết lại**

| Phần hiện tại | Cách chuyển |
|---|---|
| `src/domain/*` | Chuyển dần sang TypeScript, giữ hành vi và tests |
| Supabase migrations, RPC, RLS | Giữ nguyên; chỉ bổ sung nếu migration có nhu cầu cụ thể |
| Ngân hàng câu hỏi, ID, phiên bản | Giữ nguyên để bảo toàn lịch sử |
| Audio và manifest | Tái sử dụng; chuẩn hóa đường dẫn và ID |
| `app.js`, HTML string, event listener toàn trang | Chuyển thành React components, hooks và reducer |
| `cloud.js`, repository | Tách truy cập dữ liệu khỏi trạng thái UI |
| Checkpoint và hàng đợi đáp án | Giữ quy tắc, chuyển thành adapter/hook có cleanup |
| CSS | Tái sử dụng giao diện trước; chỉnh thiết kế sau |

**Không đồng thời viết lại backend, đổi giao diện và thêm AI trong lúc chuyển framework.** Mốc đầu tiên là ứng dụng Next.js chạy tương đương bản hiện tại.

**3. Kiến trúc Next.js đề xuất**

| Lớp | Trách nhiệm |
|---|---|
| App Router | Layout, trang, điều hướng, loading và error states |
| Server Components | Nội dung ít tương tác và dữ liệu phù hợp lấy phía server |
| Client Components | Quiz, audio, timer, activity tracking, biểu mẫu và checkpoint |
| Domain | Chọn nhóm câu, planner, thống kê, validation |
| Data access | Supabase client/server adapters và RPC |
| Route Handler cho AI — giai đoạn sau | Xác thực, giới hạn sử dụng, gọi model và kiểm tra đầu ra |

Không đưa toàn bộ ứng dụng vào một component có `"use client"`. Nhưng cũng không cố đưa player hoặc timer sang server.

Các route chính:

| Route | Nội dung |
|---|---|
| `/dashboard` | Tổng quan và bài hôm nay |
| `/plan` | Kế hoạch học |
| `/practice` | Chọn phần hoặc bộ câu |
| `/practice/session` | Phiên học guest, checkpoint local |
| `/practice/[attemptId]` | Phiên học đăng nhập |
| `/tests` | Thư viện đề |
| `/review` | Sổ lỗi |
| `/vocabulary` | Từ vựng |
| `/progress` | Lịch sử và thống kê |
| `/settings` | Mục tiêu, tài khoản, import/export |
| `/auth/callback` | Hoàn tất đăng nhập |

**4. Lộ trình triển khai**

| Mốc | Công việc | Tiêu chí nghiệm thu |
|---|---|---|
| **N0 — Chốt baseline** | Chạy tests/build bản hiện tại; ghi lại các luồng và dữ liệu mẫu | Có danh sách hành vi phải giữ và bản ổn định để rollback |
| **N1 — Khung Next.js** | Khởi tạo App Router, TypeScript, layout, navigation, CSS và preview deployment | Các trang mở được trực tiếp và refresh không lỗi |
| **N2 — Domain và nội dung** | Chuyển module thuần, kiểu dữ liệu, content/audio adapters | Kết quả chọn câu, chấm điểm, planner khớp baseline |
| **N3 — Guest quiz và audio** | React quiz reducer, player, timer, activity, checkpoint | Guest học → nộp → xem kết quả → reload/resume đúng |
| **N4 — Auth và server practice** | Supabase auth, RPC, save queue, conflict và resume | Người đăng nhập học được; tài khoản tách biệt; timed deadline đúng |
| **N5 — Các màn hình còn lại** | Plan, review, vocabulary, progress, settings, import/export | Đủ chức năng đang có, dữ liệu không mất hoặc nhân đôi |
| **N6 — Chuyển production** | E2E, kiểm tra mobile, chuyển URL, hướng dẫn chuyển dữ liệu | Demo public ổn định, có rollback và tài liệu |
| **N7 — AI** | Thêm “Giải thích thêm” sau migration | Không ảnh hưởng chấm bài hoặc lộ đáp án timed chưa nộp |

Ước lượng migration **35–55 giờ**, khoảng **3–5 tuần nếu dành 10–15 giờ/tuần**. Điều chỉnh sau N3; chưa gồm AI hoặc thiết kế lại giao diện.

**5. Những điểm dễ gây lỗi khi chuyển**

- **React render lại làm audio chạy lại:** player cần vòng đời ổn định; chọn đáp án không tạo player mới.
- **Effect đăng ký trùng:** timer, listener và tác vụ lưu phải có cleanup; kiểm tra cả trường hợp mount/unmount lại.
- **Hai nguồn trạng thái:** quiz reducer quản lý phiên hiện tại; server là nguồn chuẩn cho đáp án đã lưu và kết quả đã chấm.
- **Dữ liệu trình duyệt chạy lúc render server:** chỉ truy cập `window`, `localStorage`, `Audio` trong phần chạy phía client thích hợp.
- **Auth chỉ chặn bằng UI:** mọi thao tác server/RPC vẫn phải kiểm tra quyền; ẩn nút không thay thế phân quyền.
- **Cache lẫn dữ liệu tài khoản:** không dùng cache dùng chung cho lịch sử, đáp án hoặc kế hoạch cá nhân.
- **Đổi hosting làm mất quyền truy cập localStorage cũ:** origin mới không đọc được dữ liệu trình duyệt của Pages. Cần export/import cho guest; dữ liệu đã đồng bộ lấy lại sau đăng nhập.
- **Đáp án trong bundle:** nếu giữ guest chấm local thì đáp án guest vẫn công khai. Không tuyên bố migration đã bảo mật toàn bộ ngân hàng chỉ vì có server grading.

**6. Checklist trước khi thay bản cũ**

- [ ] Guest và người đăng nhập hoàn thành được bài nghe/đọc.
- [ ] Chọn/check đáp án không làm nhảy trang hoặc phát lại audio.
- [ ] Stop, đổi câu và rời trang dừng đúng player.
- [ ] Active time không cộng thời gian nghỉ; timed deadline không bị đặt lại.
- [ ] Reload/resume giữ đúng trạng thái.
- [ ] Submit lặp không tạo kết quả trùng.
- [ ] Hai tài khoản không nhìn thấy dữ liệu của nhau.
- [ ] Import giữ đúng provenance và không tin điểm tự khai.
- [ ] Refresh đường dẫn con, đăng nhập callback và đăng xuất hoạt động.
- [ ] Có kiểm tra chuyển dữ liệu từ Pages sang origin mới.
- [ ] CI và bản production build vượt qua kiểm tra; có bản rollback.

**Việc bắt đầu ngay nên là N0–N1:** tạo nhánh `migration/nextjs-foundation`, dựng ứng dụng Next.js riêng trong repo và deploy preview. Giữ site cũ chạy cho đến khi luồng **guest quiz + audio + resume** trên Next.js đạt nghiệm thu.