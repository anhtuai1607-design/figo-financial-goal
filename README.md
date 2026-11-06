# FiGo — Finance & Goal

Ứng dụng web/PWA quản lý tài chính cá nhân dành cho người Việt Nam.

## Chạy trên máy tính

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000` hoặc địa chỉ được hiển thị trong cửa sổ lệnh.

## Kiểm tra bản triển khai

```bash
npm run build
npm run preview
```

TanStack Start tự tạo tài liệu HTML hoàn chỉnh ở bước build; không cần duy trì một tệp HTML thủ công dễ làm hỏng SSR.

## Đưa lên GitHub và Vercel

1. Tạo repository mới trên GitHub và đẩy toàn bộ mã nguồn này lên nhánh `main`.
2. Trong Vercel, chọn **Add New → Project**, nhập repository vừa tạo.
3. Giữ nguyên thiết lập mặc định (Framework Preset: Other hoặc tự nhận diện). Tệp `vercel.json` đã cấu hình sẵn lệnh build; không cần đặt Output Directory. Bản build tự tạo trang HTML và máy chủ cho Vercel.
4. Sau khi triển khai thành công, mở **Project Settings → Domains**.
5. Nhập tên miền riêng và thêm các bản ghi DNS mà Vercel hiển thị tại nơi bạn mua tên miền.
6. Chờ trạng thái chuyển sang **Valid Configuration**, rồi đặt tên miền riêng làm miền chính.

## Lưu ý dữ liệu

Dữ liệu đang được lưu cục bộ trong trình duyệt. Mỗi trình duyệt hoặc thiết bị có bộ dữ liệu riêng; hãy xuất Excel/CSV định kỳ để sao lưu.

## Công nghệ

- TanStack Start, React, TypeScript
- Tailwind CSS, Motion, Recharts
- Zustand, SheetJS
