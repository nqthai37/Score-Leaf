# TOEIC Path — Kế hoạch bước tiếp theo

Cập nhật: 14/11/2026.

Trạng thái: kế hoạch triển khai, chưa phải báo cáo hoàn thành.

## 1. Mục tiêu và cơ sở

Hoàn thiện độ chính xác của dữ liệu học, nghiệm thu đồng bộ tài khoản và bổ sung AI giải thích câu sai.

Kế hoạch dựa trên lần kiểm tra nhánh main tại commit `328dfe20c86bfe912a227965ef05f19a81ed0fb3`. Trước khi thực hiện, đối chiếu HEAD hiện tại và các migration đã áp dụng để tránh sửa trùng.

Các phát hiện làm cơ sở:

- Thời lượng phiên đang được tính theo khoảng cách bắt đầu–nộp; thời gian bỏ dở có thể làm hết ngân sách học trong ngày.
- Import JSON vẫn tiếp nhận trường correct; dữ liệu lựa chọn sai nhưng correct=true có thể làm sai thống kê.
- Planner dùng kết quả lần đầu để xác định Part yếu, chưa có thước đo ghi nhớ sau ôn riêng.
- Đã có Supabase Auth, server grading, resume, planner theo ngày và CI/deploy thành công tại bản được kiểm tra.
- Chưa có AI coach. Chưa nghiệm thu độc lập đầy đủ luồng hai tài khoản/hai thiết bị trong lần review.

## 2. Phạm vi

### Bao gồm

1. Sửa thời gian học và cách tính ngân sách ngày.
2. Chuẩn hóa import và nguồn dữ liệu đánh giá năng lực.
3. Kiểm tra đồng bộ hai tài khoản/hai thiết bị.
4. Tách đánh giá câu mới và ghi nhớ sau ôn trong planner.
5. Thêm một tính năng AI: Giải thích thêm cho câu đã được phép xem đáp án.

### Chưa làm trong đợt này

- AI tự điều chỉnh lịch, chatbot tổng quát hoặc hội thoại giọng nói.
- React Native, viết lại frontend, offline đầy đủ.
- Sinh thêm audio, mở rộng lớn ngân hàng câu hỏi hoặc dashboard admin.

## 3. Thứ tự và ước lượng

| Thứ tự | Nhánh/PR đề xuất | Đầu ra |
| --- | --- | --- |
| 1 | fix/active-study-time | Thời gian hoạt động tách khỏi thời hạn timed test |
| 2 | fix/trusted-import | Import không làm sai thống kê năng lực |
| 3 | test/sync-verification | Báo cáo nghiệm thu nhiều tài khoản/thiết bị và các bản sửa cần thiết |
| 4 | feat/planner-review | Hai chỉ số câu mới và ôn tập, chính sách giãn lịch rõ ràng |
| 5 | feat/ai-explanation | Giải thích câu sai qua backend, có giới hạn và fallback |

Ước lượng phần nền tảng: 12–18 giờ tập trung, tương đương khoảng một tuần nếu đủ thời gian. AI: thêm 4–8 giờ. Đây là ước lượng sơ bộ; điều chỉnh sau khi chốt thiết kế lưu thời gian và kết quả nghiệm thu đồng bộ. Không dùng thời hạn làm lý do bỏ kiểm thử phân quyền hoặc lưu dữ liệu.

## 4. Việc 1 — Thời gian học thực tế

### Thiết kế

- `active_seconds`: ước lượng thời gian hoạt động, dùng cho thống kê và ngân sách học.
- `expires_at`: hạn nộp do server quản lý; tiếp tục chạy dù tab ẩn hoặc người học nghỉ.
- Chỉ đếm active time khi màn hình làm bài hiện và người học còn hoạt động.
- Dừng đếm khi rời màn hình, tab ẩn hoặc không tương tác quá ngưỡng đề xuất 120 giây.
- Khi audio đang phát trên màn hình học đang hiển thị, tính thời gian nghe; không tính audio bị pause hoặc lỗi.
- Dùng đồng hồ monotonic cho các khoảng hoạt động trong phiên; không cộng trực tiếp thời gian qua reload hoặc đóng máy.
- Lưu các đoạn thời gian với ID ổn định để retry không ghi trùng; gắn với attempt và chủ sở hữu.
- Server kiểm tra quyền, số giây không âm, giới hạn hợp lý và trạng thái phiên. Số liệu tương tác từ client là ước lượng, không phải bằng chứng chống gian lận tuyệt đối.
- Hai tab/thiết bị không được cộng trùng cùng khoảng hoạt động. MVP có thể giới hạn một nguồn ghi hoạt động cho một attempt.
- Phân bổ thời gian theo ngày và múi giờ người học, tránh dồn toàn bộ phiên qua đêm vào ngày nộp.
- Planner đọc active time đã ghi nhận, kể cả phần đã lưu của phiên chưa nộp, và không cộng lại khi nộp.

### Dữ liệu cũ

- Không suy ngược active time từ started_at/submitted_at.
- Giữ thời lượng cũ với nhãn ước tính; không dùng nó để khóa ngân sách học hôm nay.
- Migration bổ sung trường/bảng, không xóa lịch sử cũ. Chốt schema cụ thể trước khi viết migration.

### Nghiệm thu

- [ ] Học 2 phút → nghỉ 30 phút → học 3 phút: ghi khoảng 5 phút hoạt động.
- [ ] Tab ẩn không làm tăng active time; timed test vẫn hết hạn đúng.
- [ ] Nghe audio trên màn hình hiện được tính dù không bấm liên tục.
- [ ] Reload/resume không cộng khoảng thời gian vắng mặt.
- [ ] Gửi lại cùng đoạn thời gian không tăng tổng lần thứ hai.
- [ ] Phiên qua nửa đêm phân bổ đúng ngày.
- [ ] Hai tab không nhân đôi thời gian.
- [ ] Lịch sử cũ có thời lượng nhiều giờ không chặn bài học hôm nay.

## 5. Việc 2 — Import và độ tin cậy

### Quy tắc

| Nguồn | Xử lý | Dùng đánh giá năng lực |
| --- | --- | --- |
| Attempt server | Lấy lại dữ liệu theo tài khoản và attempt ID, không tin nội dung file | Có, theo tiêu chí thống kê |
| Backup xác định đúng content_version | Tính lại đúng/sai từ lựa chọn và đáp án phiên bản đó | Theo chính sách dữ liệu import; không tự gắn server-verified |
| Backup thiếu hoặc không khớp phiên bản | Giữ lịch sử, đánh dấu chưa kiểm chứng | Không dùng để kết luận kỹ năng hoặc ưu tiên phần yếu |

- Không nhận server_graded, user_id hoặc mức độ tin cậy do file tự khai.
- Tính lại trên client không biến kết quả thành lịch sử đã xác minh bởi server.
- Không áp đáp án mới cho nội dung cũ nếu không chứng minh được tương thích.
- Kiểm tra schema, kích thước, ngày giờ, ID câu và chỉ số option.
- Dedupe theo khóa ổn định; import lặp không nhân đôi.
- Xem trước số bản ghi nhập/trùng/không xác minh; không tự ghi đè tiến độ hiện có.
- Dữ liệu sai đúng có thể ảnh hưởng cả sổ lỗi; cần tính lại hoặc tách sổ lỗi chưa kiểm chứng tương ứng.

### Nghiệm thu

- [ ] Chọn sai nhưng correct=true không tạo độ chính xác giả trong bằng chứng năng lực.
- [ ] Chọn đúng nhưng correct=false được tính lại khi có phiên bản hợp lệ.
- [ ] Cờ server_graded=true giả bị bỏ qua.
- [ ] Attempt của tài khoản khác không được nhập như kết quả đã xác minh.
- [ ] Import cùng file hai lần không nhân đôi.
- [ ] ID không tồn tại hoặc option vượt phạm vi được xử lý rõ ràng.
- [ ] Backup cũ thiếu version vẫn có thể giữ lịch sử mà không làm lệch planner.

## 6. Việc 3 — Nghiệm thu đồng bộ

Chuẩn bị hai tài khoản thử nghiệm A/B và hai trình duyệt hoặc thiết bị. Dữ liệu kiểm thử phải được phân biệt với lịch sử học thật.

| Kịch bản | Kết quả mong đợi |
| --- | --- |
| A làm dở trên thiết bị 1, mở thiết bị 2 | Khôi phục đúng đáp án đã được server xác nhận |
| Nộp trên thiết bị 2, quay lại thiết bị 1 | Một kết quả duy nhất, không tiếp tục sửa attempt đã nộp |
| Mất mạng khi lưu rồi kết nối lại | Không báo đã lưu sớm; retry thành công hoặc báo lỗi có thể xử lý |
| Đăng xuất A, đăng nhập B | Không lộ lịch sử, checkpoint hoặc thời gian học của A |
| Hai thiết bị sửa cùng attempt | Báo conflict, không âm thầm ghi đè |
| Tải bản cloud khi còn dữ liệu local | Có backup và thông báo rõ thay đổi |
| Phiên đăng nhập hết hạn | Yêu cầu đăng nhập lại, không ghi vào sai tài khoản |

Đầu ra: checklist ghi môi trường, bước thực hiện, expected/actual, pass/fail và commit kiểm tra. Test tự động được bổ sung cho lỗi tái hiện được. Không đánh dấu hoàn thành chỉ vì CI xanh.

## 7. Việc 4 — Planner và ôn tập

### Hai chỉ số độc lập

- Năng lực trên câu mới: dùng lần đầu trả lời và dữ liệu đủ tin cậy; không nâng chỉ số này chỉ vì làm lại đúng.
- Mức độ ghi nhớ sau ôn: dùng các lần ôn cách quãng để quyết định lịch ôn tiếp theo.

### Thực hiện

- Giữ baseline first-answer hiện có; bổ sung trạng thái review và due date.
- Chỉ giãn lịch khi đúng ở các lần ôn có khoảng cách; việc bấm lại ngay không tương đương ghi nhớ dài hạn.
- Lịch khởi đầu có thể là 1 → 3 → 7 ngày; đây là quy tắc thử nghiệm, chưa tuyên bố tối ưu.
- Khi sai, đưa về lịch ôn sớm; không xóa bằng chứng cũ.
- Dùng các skill tag đã được rà soát trước; phần chưa đủ nhãn vẫn gợi ý theo Part.
- Chọn nguyên nhóm nghe/đọc, tính chi phí đoạn chung một lần và dùng ngân sách active time đã sửa.
- Hiển thị lý do và mức độ chắc chắn: thiếu dữ liệu thì tiếp tục khảo sát.

### Nghiệm thu

- [ ] Người ôn đúng nhiều lần cách quãng được giãn lịch.
- [ ] Không tự tuyên bố thành thạo khi chỉ làm lại câu cũ.
- [ ] Lỗi mới được đưa vào lịch ôn phù hợp.
- [ ] Cùng dữ liệu/ngày cho kết quả ổn định; hồ sơ khác nhau có gợi ý phù hợp.
- [ ] Không dùng lịch sử import chưa kiểm chứng để kết luận phần yếu.
- [ ] Không cắt rời nhóm câu hoặc vượt ngân sách theo quy tắc đã chốt.

## 8. Việc 5 — AI giải thích câu sai

Chỉ bắt đầu sau khi các lỗi nền tảng và phân quyền nghiêm trọng đã được xử lý.

### Trải nghiệm

Nút “Giải thích thêm” xuất hiện sau khi check trong learning mode hoặc sau khi nộp timed test. Hiển thị trạng thái đang xử lý, lỗi/thử lại và lời giải chuẩn hiện có.

AI trả ba phần:

1. Vì sao đáp án đúng.
2. Vì sao lựa chọn người học sai, hoặc xác nhận lập luận nếu chọn đúng.
3. Một ví dụ ngắn tương tự.

### Backend

- Client gửi attempt_id và question_id; backend xác thực tài khoản và quyền sở hữu.
- Backend lấy snapshot câu, lựa chọn, đáp án và lời giải chuẩn; không tin đáp án do client gửi.
- Learning mode chỉ cho giải thích câu đã check; timed mode chỉ sau khi nộp.
- Không gửi email hoặc toàn bộ hồ sơ nếu không cần.
- Kiểm tra đầu ra có cấu trúc, giới hạn độ dài và hiển thị an toàn; không render HTML tùy ý từ model.
- Khóa AI nằm ở server; có rate limit theo tài khoản, timeout và giới hạn ngân sách.
- Không retry vô hạn; cân nhắc cache theo phiên bản nội dung, lựa chọn, ngôn ngữ và phiên bản prompt, tránh rò nội dung cá nhân giữa tài khoản.
- AI không tự ghi điểm, sửa đáp án chuẩn hoặc thay đổi kế hoạch.
- Khi ngữ cảnh không đủ hoặc lời giải chuẩn mâu thuẫn, thông báo hạn chế thay vì khẳng định đáp án mới.

### Nghiệm thu

- [ ] Câu giải thích đúng attempt/question và đúng lựa chọn người học.
- [ ] User B không lấy được giải thích từ attempt của A.
- [ ] Timed attempt chưa nộp không nhận được đáp án qua endpoint AI.
- [ ] Timeout, quota hoặc đầu ra lỗi không làm mất bài làm.
- [ ] Lời giải chuẩn vẫn hoạt động khi AI tắt.
- [ ] Rà soát thủ công một tập câu mẫu trước khi bật rộng rãi; không coi kiểm tra schema là kiểm tra đúng kiến thức.

## 9. Quy trình triển khai

1. Đối chiếu code mới nhất và kiểm tra các lỗi còn tồn tại.
2. Chốt schema cho active time, provenance import và review state.
3. Viết regression test tái hiện lỗi trước khi sửa hành vi liên quan.
4. Triển khai từng PR nhỏ theo thứ tự trong mục 3.
5. Chạy test liên quan; khi chuẩn bị merge chạy bộ kiểm tra dự án và build theo package.json hiện tại.
6. Áp dụng migration theo quy trình triển khai, kiểm tra tương thích frontend cũ/mới.
7. Nghiệm thu trên URL public sau deploy; cập nhật IMPLEMENTATION_STATUS.md bằng kết quả thực tế.

Không ghi đè migration đã chạy. Dùng migration bổ sung và giữ lịch sử; chuẩn bị rollback frontend và cách vô hiệu hóa tính năng mới nếu cần. Chức năng AI có thể tắt độc lập mà không ảnh hưởng học và chấm bài.

## 10. Điều kiện hoàn thành đợt

- [ ] Thời gian nghỉ không tính thành thời gian học.
- [ ] Timed deadline vẫn do server kiểm soát.
- [ ] Import không làm sai bằng chứng đánh giá năng lực.
- [ ] Đồng bộ hai tài khoản/hai thiết bị có kết quả nghiệm thu.
- [ ] Planner phân biệt câu mới với ôn tập.
- [ ] AI giải thích một câu hoạt động có kiểm soát và fallback.
- [ ] CI/build/deploy thành công; không mất tương thích dữ liệu cũ.
- [ ] README và trạng thái triển khai phản ánh đúng chức năng đã có.

## 11. Tệp liên quan tại bản đã kiểm tra

- `src/domain/core.js`: validation/import và thống kê.
- `src/domain/daily-plan.js`: ngân sách và chọn bài theo ngày.
- `src/js/app.js`: kết quả, thời lượng và tích hợp UI.
- `src/js/session.js`: checkpoint/resume.
- `src/js/server-practice.js`: luồng practice phía client.
- `src/js/cloud.js`, `src/js/cloud-repository.js`: đồng bộ và tài khoản.
- `supabase/migrations/202611130004_practice_flow.sql`: lịch sử và RPC practice hiện tại; thay đổi bằng migration mới.
- `tests/`: regression, database, planner, cloud và practice.

Repository: https://github.com/nqthai37/toeic-path

Bản kế hoạch này bổ sung công việc gần nhất cho lộ trình hợp nhất, không thay thế mục tiêu web trước/mobile sau và không xác nhận các công việc trên đã được triển khai.
