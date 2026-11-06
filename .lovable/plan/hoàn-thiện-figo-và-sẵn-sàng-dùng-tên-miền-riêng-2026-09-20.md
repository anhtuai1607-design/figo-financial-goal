# Hoàn thiện FiGo và sẵn sàng dùng tên miền riêng

## Mục tiêu

Hoàn thiện ứng dụng quản lý tài chính cá nhân FiGo bằng tiếng Việt, chạy ổn định trên điện thoại và máy tính, không hiển thị bất kỳ nội dung thương hiệu nền tảng nào.

## Phạm vi thực hiện

- Hoàn thiện 6 màn hình: Tổng quan, Giao dịch, Ngân sách, Hoá đơn, Mục tiêu và Cài đặt.
- Hoàn thiện biểu đồ thu–chi, cơ cấu chi tiêu, tìm kiếm/lọc giao dịch và lời khuyên tài chính tự động.
- Hoàn thiện thêm/sửa/xoá giao dịch, ảnh hoá đơn, cảnh báo hạn mức, lịch thanh toán, mục tiêu tiết kiệm và xuất Excel/CSV.
- Bổ sung biểu mẫu quản lý tài khoản, ngân sách, hoá đơn và mục tiêu; mọi thao tác đều có thông báo rõ ràng.
- Hoàn thiện PWA: biểu tượng ứng dụng, cấu hình cài đặt và thông tin chia sẻ riêng của FiGo.
- Loại bỏ nội dung mẫu và mọi chữ/ảnh liên quan đến nền tảng khỏi giao diện, metadata và tài liệu bàn giao.
- Kiểm tra các luồng chính ở kích thước điện thoại và máy tính; sửa lỗi hiển thị, nút bấm và chuyển trang.

## Sẵn sàng đưa lên tên miền riêng

- Giữ cấu trúc dự án đầy đủ để đồng bộ GitHub và triển khai qua Vercel. CÓ KÈM HTML thì mới có thể tạo vercel được. Ngoài html còn những code khác để chạy được vercel
- Bổ sung hướng dẫn ngắn, rõ ràng về cài đặt, chạy, build và gắn tên miền riêng.
- Không thay đổi tên miền hoặc xuất bản thay người dùng trong bước này.

## Chi tiết kỹ thuật

- Dữ liệu tiếp tục được lưu cục bộ trên thiết bị bằng Zustand; tiền VNĐ lưu dưới dạng số nguyên.
- Dùng TanStack Start, Tailwind CSS v4, Motion, Recharts, SheetJS và các thành phần giao diện hiện có.
- Mỗi màn hình có tiêu đề và mô tả chia sẻ riêng; không dùng tài nguyên ảnh bên ngoài cho nội dung ứng dụng.