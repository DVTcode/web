/**
 * e2e-prepare.js
 *
 * Script chuẩn bị dữ liệu (seed) cho E2E test.
 * Chạy TRƯỚC khi thực thi Cypress/Playwright để đảm bảo
 * DB có sẵn: user, org, project, và project member với role MANAGER.
 *
 * Cách dùng:
 *   node prisma/e2e-prepare.js
 *
 * Output (stdout): E2E_READY_PROJECT_ID=<id>
 * → Dùng ID này làm URL khi test: /projects/<id>/tasks
 */

// Nạp biến môi trường từ file .env.test (tách biệt với .env production)
// Ưu tiên: E2E_EMAIL, E2E_PASSWORD từ .env.test; fallback về giá trị mặc định
require("dotenv").config({ path: ".env.test" });

// bcryptjs: dùng để hash password trước khi lưu vào DB (giống logic đăng ký thật)
const bcrypt = require("bcryptjs");

// PrismaClient được generate từ schema.prisma vào app/generated/prisma
const { PrismaClient } = require("../app/generated/prisma");
const prisma = new PrismaClient();

/**
 * Chuyển chuỗi thành slug hợp lệ cho URL / DB unique constraint.
 * Ví dụ: "E2E Org 1700000000000" → "e2e-org-1700000000000"
 */
function slugify(s) {
    return s
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")          // khoảng trắng → dấu gạch ngang
        .replace(/[^a-z0-9\-]/g, ""); // xóa ký tự đặc biệt
}

async function main() {
    // --- 1. Đọc thông tin user test từ biến môi trường ---
    // .env.test nên định nghĩa E2E_EMAIL và E2E_PASSWORD
    const email = process.env.E2E_EMAIL || "manager@test.com";
    const password = process.env.E2E_PASSWORD || "Test@123456";

    // Hash password với salt = 10 (tương đương logic trong auth.ts)
    const hash = await bcrypt.hash(password, 10);

    // --- 2. Tạo hoặc cập nhật user test (upsert) ---
    // upsert = INSERT ... ON DUPLICATE UPDATE:
    //   - Nếu user đã tồn tại → cập nhật lại hash và status ACTIVE
    //   - Nếu chưa tồn tại → tạo mới
    // Mục đích: an toàn khi chạy script nhiều lần, không bị lỗi duplicate
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name: "E2E Manager",
            status: "ACTIVE",
            passwordHash: hash,
            globalRole: "STANDARD",
        },
        create: {
            email,
            name: "E2E Manager",
            status: "ACTIVE",
            passwordHash: hash,
            globalRole: "STANDARD",
        },
        select: { id: true, email: true },
    });

    // --- 3. Tạo Organization mới mỗi lần chạy ---
    // Dùng timestamp (ts) để đảm bảo tên và slug luôn unique,
    // tránh xung đột khi chạy script nhiều lần liên tiếp
    const ts = Date.now();
    const org = await prisma.organization.create({
        data: {
            name: `E2E Org ${ts}`,
            slug: slugify(`e2e-org-${ts}`),
        },
        select: { id: true },
    });

    // --- 4. Tạo Project thuộc Organization vừa tạo ---
    // key phải unique trong toàn hệ thống → dùng "E2E-{timestamp}"
    // createdById: gắn với user test, thường là người tạo project
    const project = await prisma.project.create({
        data: {
            organizationId: org.id,
            key: `E2E-${ts}`,            // VD: "E2E-1700000000000"
            name: `E2E Project ${ts}`,
            createdById: user.id,
        },
        select: { id: true },
    });

    // --- 5. Thêm user vào project với role MANAGER ---
    // Role MANAGER cho phép:
    //   - Thấy nút "Thêm Task" (canEdit = true)
    //   - Gọi POST /api/projects/{id}/tasks thành công (requireProjectRole check LEAD | MANAGER)
    await prisma.projectMember.create({
        data: {
            projectId: project.id,
            userId: user.id,
            role: "MANAGER",
        },
    });

    // --- 6. In ra project ID để test script có thể đọc ---
    // Cypress/test runner có thể parse stdout này để lấy projectId:
    //   const projectId = stdout.match(/E2E_READY_PROJECT_ID=(.+)/)[1];
    console.log("E2E_READY_PROJECT_ID=" + project.id);
}

// Chạy main(), xử lý lỗi và đảm bảo đóng kết nối DB dù thành công hay thất bại
main()
    .catch((e) => {
        console.error("❌ e2e-prepare thất bại:", e);
        process.exit(1);
    })
    .finally(async () => prisma.$disconnect());