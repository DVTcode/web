# Quy Trình Cài Đặt & Viết Test Cypress (E2E)

Tài liệu này mô tả lại toàn bộ quá trình từ lúc bắt đầu setup Cypress cho đến khi hoàn thành test case cho trang Đăng nhập (`/sign-in`).

## 1. Cài đặt & Cấu hình (Setup)

### Bước 1: Cài đặt Cypress
(Nếu dự án chưa có)
Chạy lệnh: `npm install -D cypress`

### Bước 2: Cấu hình Cypress
Chỉnh sửa file `cypress.config.ts`.
Quan trọng nhất là thêm `baseUrl` để không phải gõ lại `http://localhost:3000` trong từng file test.

```typescript
// cypress.config.ts
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000", // <-- Quan trọng
    setupNodeEvents(on, config) {},
  },
});
```

### Bước 3: Thêm Scripts chạy nhanh
Thêm vào `package.json` để tiện gọi lệnh:

```json
"scripts": {
  "test:e2e": "cypress open",     // Mở giao diện trực quan
  "test:e2e:headless": "cypress run" // Chạy ngầm (cho CI/CD)
}
```

## 2. Viết Test Case (Implementation)

### Bước 4: Phân tích & Lên kịch bản
Mở file giao diện (`page.tsx`) để xem:
- URL là gì? (`/sign-in`)
- Cần test những gì? (Heading, Input, Button, Link, Error Message).

### Bước 5: Viết file Test (`login.cy.ts`)
Tạo/Sửa file `cypress/e2e/login.cy.ts`:

1.  **BeforeEach**: `cy.visit("/sign-in")` để luôn bắt đầu từ trang login.
2.  **UI Test**: Dùng `cy.get()` và `cy.contains()` để kiểm tra các phần tử có hiển thị không.
3.  **Interaction Test**: Dùng `.type()`, `.click()` để giả lập người dùng nhập liệu.
4.  **Assertion (Kiểm tra kết quả)**:
    -   Kiểm tra lỗi: `cy.contains("Email không hợp lệ").should("be.visible")`
    -   Kiểm tra chuyển trang: `cy.url().should("include", "/sign-up")`

## 3. Chạy & Kiểm thử (Execution)

### Bước 6: Khởi chạy Server
**Bắt buộc**: Ứng dụng phải đang chạy thì Cypress mới test được.
`npm run dev`

### Bước 7: Chạy Test
Mở terminal khác và chạy:
`npm run test:e2e` (để xem tận mắt)
hoặc
`npm run test:e2e:headless` (để chạy nhanh)

---
**Mẹo nhỏ**: Khi viết test, hãy dùng `data-testid` (ví dụ: `<button data-testid="submit-btn">`) trong code React để chọn phần tử dễ hơn và ít bị lỗi khi đổi CSS/Text.
