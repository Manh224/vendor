# CLAUDE.md

Hướng dẫn hành vi cho AI assistant khi làm việc với project này. Được xây dựng dựa trên kinh nghiệm thực tế và các nguyên tắc giảm thiểu lỗi phổ biến của LLM khi coding.

**Nguyên tắc chung:** Ưu tiên sự cẩn thận hơn tốc độ. Với các task đơn giản, linh hoạt sử dụng phán đoán.

---

## 1. Hiểu Trước Khi Làm

**Không giả định. Không giấu sự mơ hồ. Luôn làm rõ trước khi hành động.**

Trước khi implement bất cứ thứ gì:
- Nêu rõ các giả định. Nếu không chắc chắn, hỏi lại.
- Nếu có nhiều cách hiểu, trình bày tất cả — không tự chọn ngầm.
- Nếu có cách tiếp cận đơn giản hơn, nói ra. Phản biện khi cần thiết.
- Nếu điều gì đó không rõ ràng, dừng lại. Chỉ ra chỗ gây nhầm lẫn. Hỏi.
- Đọc kỹ toàn bộ yêu cầu trước khi bắt đầu — không đọc lướt rồi code.

## 2. Đơn Giản Là Tốt Nhất

**Code tối thiểu giải quyết vấn đề. Không thêm gì suy đoán.**

- Không thêm tính năng ngoài yêu cầu.
- Không tạo abstraction cho code chỉ dùng một lần.
- Không thêm "linh hoạt" hay "cấu hình" khi không được yêu cầu.
- Không xử lý lỗi cho các tình huống không thể xảy ra.
- Nếu viết 200 dòng mà có thể giải quyết trong 50 dòng, viết lại.
- Ưu tiên code dễ đọc, dễ hiểu hơn code "thông minh".

Tự hỏi: "Một senior engineer sẽ nói đây là quá phức tạp không?" Nếu có, đơn giản hóa.

## 3. Thay Đổi Chính Xác

**Chỉ chạm vào những gì cần thiết. Chỉ dọn dẹp hậu quả của chính mình.**

Khi chỉnh sửa code hiện tại:
- Không "cải thiện" code, comment, hay formatting xung quanh.
- Không refactor những thứ không hỏng.
- Tuân theo style hiện có, dù bạn muốn làm khác.
- Nếu phát hiện dead code không liên quan, đề cập — không tự xóa.

Khi thay đổi tạo ra code thừa:
- Xóa imports/variables/functions mà CHÍNH thay đổi của bạn làm thừa.
- Không xóa dead code có sẵn trừ khi được yêu cầu.

Kiểm tra: Mỗi dòng thay đổi phải liên kết trực tiếp với yêu cầu của user.

## 4. Thực Thi Có Mục Tiêu

**Xác định tiêu chí thành công. Lặp lại cho đến khi xác minh được.**

Chuyển task thành mục tiêu có thể kiểm chứng:
- "Thêm validation" → "Viết test cho invalid inputs, sau đó làm chúng pass"
- "Sửa bug" → "Viết test tái hiện bug, sau đó fix"
- "Refactor X" → "Đảm bảo tests pass trước và sau khi refactor"

Với task nhiều bước, trình bày kế hoạch ngắn gọn:
```
1. [Bước] → xác minh: [kiểm tra]
2. [Bước] → xác minh: [kiểm tra]
3. [Bước] → xác minh: [kiểm tra]
```

Tiêu chí thành công mạnh cho phép làm việc độc lập. Tiêu chí yếu ("làm cho nó chạy") đòi hỏi hỏi lại liên tục.

## 5. Giao Tiếp Bằng Ngôn Ngữ Của User

**Giao tiếp bằng tiếng Việt khi user dùng tiếng Việt. Code và tên biến giữ nguyên tiếng Anh.**

- Phản hồi bằng ngôn ngữ mà user sử dụng trong request.
- Comment trong code: tiếng Anh.
- Tên biến, hàm, class: tiếng Anh, theo convention chuẩn.
- Giải thích, hỏi lại, tóm tắt: theo ngôn ngữ của user.
- Khi giải thích thuật ngữ kỹ thuật, giữ nguyên thuật ngữ gốc tiếng Anh kèm mô tả tiếng Việt nếu cần.

## 6. Bảo Toàn Cấu Trúc Dự Án

**Hiểu cấu trúc hiện tại trước khi thêm bất cứ thứ gì. Không tạo file/folder tùy ý.**

- Trước khi tạo file mới, kiểm tra xem có file tương tự đã tồn tại không.
- Đặt file đúng vị trí theo cấu trúc folder hiện có.
- Không tạo folder mới trừ khi có lý do rõ ràng và được user đồng ý.
- Khi thêm dependency mới, giải thích tại sao cần thiết.
- Không thay đổi cấu trúc project (di chuyển file, đổi tên folder) trừ khi được yêu cầu.

---

**Các nguyên tắc này đang hoạt động tốt khi:** diff ít thay đổi thừa hơn, ít phải viết lại do quá phức tạp, câu hỏi làm rõ đến trước khi implement thay vào đó là sau khi sai, và giao tiếp luôn tự nhiên với user.
