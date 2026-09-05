// app/projects/[projectId]/settings/types.ts
// Tách các type/const/schema ra file riêng để tránh Next.js phàn nàn về exports không hợp lệ từ page.tsx
import { z } from "zod";

/** ===== Status config (slug lưu DB, label hiển thị) ===== */
export type ProjectStatus = "planning" | "in_progress" | "review" | "done";

export const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: "planning", label: "Đang lên kế hoạch" },
  { value: "in_progress", label: "Đang triển khai" },
  { value: "review", label: "Đang đánh giá / nghiệm thu" },
  { value: "done", label: "Hoàn thành" },
];

export const DEFAULT_PROJECT_STATUS: ProjectStatus = "planning";

/** ===== Zod schema ===== */
export const UpdateSchema = z.object({
  name: z.string().min(1, "Tên dự án không được để trống"),
  description: z.string().optional().nullable(),
  status: z.enum(["planning", "in_progress", "review", "done"]),
  leadId: z.string().cuid().nullable().optional(),
});
