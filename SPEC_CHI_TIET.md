# ĐẶC TẢ CHI TIẾT DỰ ÁN SMART PAY (HỆ THỐNG GIẢI NGÂN AI TRỰC TUYẾN)

Dự án này là một ứng dụng quản lý tài chính và thanh toán dành cho các doanh nghiệp phối hợp với đại lý, tích hợp công nghệ AI để bóc tách hóa đơn và tự động hóa quy trình chi tiền qua mã QR.

## 1. Kiến trúc Hệ thống (Tech Stack)
- **Frontend**: React 18, TypeScript, Vite.
- **Styling**: Tailwind CSS 4.0.
- **Animation**: Motion (motion/react) cho các hiệu ứng chuyển cảnh và UI mượt mà.
- **AI Engine**: Google Gemini 1.5 Flash (Xử lý OCR bóc tách hóa đơn chuyển tiền).
- **Tiện ích**: 
  - `ExcelJS`: Xuất báo cáo kế toán chuyên nghiệp với định dạng phức tạp.
  - `VietQR API`: Tạo mã QR thanh toán động theo tiêu chuẩn Napas.
  - `Lucide React`: Hệ thống icon đồng nhất.

## 2. Các Tính năng Chính & Logic Xử lý

### 2.1. Xử lý Hóa đơn bằng AI (OCR) & Quản lý File
- Hệ thống hỗ trợ upload ảnh hóa đơn chuyển tiền hàng loạt.
- **Tên File (STT)**: Tự động ghi lại tên file ảnh khi upload để làm căn cứ sắp xếp (Numeric Sort).
- AI sẽ tự động phân tích:
  - **Ngân hàng**: Khớp với danh sách các ngân hàng Việt Nam.
  - **Số tài khoản**: Nhận diện số tài khoản người nhận.
  - **Số tiền**: Trích xuất số tiền cần thanh toán.
  - **Người nhận**: Trích xuất tên chủ tài khoản.
- **Logic Cảnh báo**: Phát hiện hóa đơn trùng lặp dựa trên STK và Số tiền để tránh rủi ro.

### 2.2. Số phiếu (Voucher No) & Sắp xếp
- **Số phiếu**: Trường thông tin bổ sung để quản lý chứng từ gốc, được làm nổi bật với màu Amber (Vàng hổ phách).
- **Thứ tự ưu tiên**: Danh sách chờ xử lý và lịch sử thanh toán được sắp xếp theo:
  1. Tên File (Nếu có).
  2. Số phiếu (Nếu có).
  3. Thời gian tạo.
- Giúp kế toán dễ dàng đối chiếu với tập tin ảnh gốc theo đúng thứ tự upload.

### 2.3. Thanh toán & Xác nhận (VietQR)
- Tự động tạo mã QR Napas 24/7 sau khi bóc tách thông tin.
- **Xác nhận đã quét (Confirm Scanned)**:
  - Nút xác nhận chỉ hoạt động khi điền đầy đủ: Tài khoản nguồn, STK/Ngân hàng/Tên người nhận và Số tiền (>0).
  - **Nội dung chuyển khoản**: Nếu để trống, hệ thống tự động lấy "Tên gợi nhớ" của tài khoản nguồn làm nội dung mặc định.
- Sau khi xác nhận, hệ thống trừ tiền từ quỹ tài chính tương ứng và ghi vào sổ cái.

### 2.4. Quản lý Quỹ & Dòng tiền
- **Danh sách Tài khoản**: Quản lý đa tài khoản, theo dõi số dư thực tế.
- **Tạo Tài khoản**: Yêu cầu bắt buộc điền Tên gợi nhớ, Số tài khoản và Ngân hàng.
- **Nạp tiền (Funding)**: Cho phép bổ sung vốn vào quỹ, yêu cầu chọn tài khoản và số tiền hợp lệ (>0).
- **Ghi nợ (Payment Out)**: Tự động ghi nhận khi thanh toán hóa đơn.

### 2.5. Báo cáo Kế toán (Excel Export)
- Xuất dữ liệu chi tiết theo từng Đại lý (TUYET, LINA, TRUM...).
- Bao gồm thông tin: Tên File/Số phiếu, Tên người nhận, Giờ giao dịch, Số tiền, Ngân hàng.
- Định dạng báo cáo chuyên nghiệp, có màu sắc phân biệt và tổng kết số dư (Đầu ngày, Nạp, Chi, Tồn).

## 3. Cấu trúc Dữ liệu (Dấu ấn Kỹ thuật)

### 3.1. /src/types.ts (Interface chính)
```typescript
export interface PaymentRequest {
  id: string;
  imagePath: string;
  fileName?: string; // Tên file gốc để sắp xếp
  voucherNo?: string; // Số phiếu kế toán
  uploadSource: 'MANUAL' | 'WHATSAPP';
  recvBankId?: string;
  recvAccountNo?: string;
  recvAccountName?: string;
  amount?: number;
  description?: string;
  status: PaymentStatus;
  isDuplicateWarning: boolean;
  senderAccountId?: string; // ID tài khoản quỹ chi tiền
  dealerGroupId: string;
  completedAt?: string;
  createdAt: string;
}
```

### 3.2. Logic Sắp xếp (Sorting Algorithm)
Sử dụng `localeCompare` với option `{ numeric: true }` để đảm bảo file "10.jpg" đứng sau "2.jpg":
```typescript
.sort((a, b) => {
  const nameA = a.fileName || a.voucherNo || '';
  const nameB = b.fileName || b.voucherNo || '';
  return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
})
```

---
*Tài liệu này được cập nhật vào 18/05/2026 để phản ánh các thay đổi về Số phiếu, Tên file và logic Validation mới.*
