// lib/api-client.ts (Frontend)
// Lấy đường dẫn gốc của API server (Backend ASP.NET Core) từ file .env
// Ví dụ: http://localhost:5000
const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Hàm trung tâm (Wrapper) để gọi API sang Backend.
 * Hàm này có thể được import và sử dụng ở khắp mọi nơi trong React Component.
 * @param endpoint Đường dẫn API con (Ví dụ: "/api/projects")
 * @param options Tùy chọn fetch phụ trợ thêm (method, headers, body...)
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    // Tự động ghép Base URL và Endpoint lại với nhau (Ví dụ: http://localhost:5000/api/projects)
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options, // Trải toàn bộ các cấu hình mà người dùng truyền vào (ví dụ: method POST, body...)
        headers: {
            // Mặc định luôn gửi request dưới dạng chuỗi JSON
            'Content-Type': 'application/json',
            // Ghi đè hoặc thêm bất kỳ Header nào khác (VD: Authorization: Bearer ...) do người dùng truyền
            ...options.headers,
        },
    });

    // Nếu mã HTTP Backend trả về không nằm trong cụm thành công (200-299)
    // Ví dụ như 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error)
    if (!response.ok) {
        // Cố gắng parse nội dung lỗi (Data lỗi) bắn về từ phía ASP.NET
        // Thường ASP.NET Core sẽ trả về một cấu trúc ProblemDetails hoặc JSON cơ bản có chứa field báo lỗi
        const errorData = await response.json().catch(() => ({}));

        // Chủ động NGẮT QUÃNG luồng chạy bằng cách "ném" (throw) một Lỗi (Exception).
        // Lỗi này sẽ được cấu hình bắn thẳng lên UI để tiện try-catch báo toast đỏ.
        throw new Error(errorData.error || errorData.message || errorData.detail || 'Đã có lỗi xảy ra từ máy chủ');
    }

    // Nếu mọi chuyện suôn sẻ, tự động bóc vỏ JSON ra và trả thẳng Data Object về cho Code gọi hàm.
    return response.json();
}