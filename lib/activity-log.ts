// apps/web/lib/activity-log.ts
import { prisma } from "@/lib/prisma";
import type { ActivityType } from "@/app/generated/prisma"; // đường dẫn đúng với PrismaClient của bạn

// Hàm tiện ích: Log lại các hoạt động chung của dự án (Project scope)
// Ví dụ: Tạo dự án, thêm thành viên, đổi tên dự án...
export async function logProjectActivity(opts: {
  projectId: string;
  actorId: string;                 // BẮT BUỘC: Người thực hiện hành động
  type: ActivityType;              // Loại hành động (Theo ENUM của DB)
  message?: string | null;         // Nội dung chi tiết hành động bằng chữ
  meta?: unknown;                  // (Tùy chọn) Lưu Data dưới dạng JSON để tra cứu nâng cao
}) {
  const { projectId, actorId, type, message, meta } = opts;

  return prisma.activityLog.create({
    data: {
      projectId,
      actorId,
      type,
      message: message ?? null,
      meta: meta ?? undefined,
    },
  });
}

// Hàm tiện ích: Log lại các hoạt động chỉnh sửa trong một Task cụ thể
// Ví dụ: Thay đổi Status, Đổi Assignee, Tạo Comment...
// Dữ liệu này vẫn lưu chung bảng ActivityLog nhưng được gắn kèm taskId
export async function logTaskActivity(opts: {
  projectId: string;
  taskId: string;
  actorId: string;                 // BẮT BUỘC: ID Người thục hiện
  type: ActivityType;              // Mức độ hành động
  message?: string | null;         // Nội dung lịch sử sửa đổi (VD: "Đã chuyển task sang IN_PROGRESS")
  meta?: unknown;
}) {
  const { projectId, taskId, actorId, type, message, meta } = opts;

  return prisma.activityLog.create({
    data: {
      projectId,
      taskId,
      actorId,
      type,
      message: message ?? null,
      meta: meta ?? undefined,
    },
  });
}
