// app/projects/[projectId]/settings/actions.ts
// Server Action độc lập — tách riêng để tránh Next.js lỗi khi page.tsx có export không hợp lệ
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logProjectActivity } from "@/lib/activity-log";
import {
  UpdateSchema,
  DEFAULT_PROJECT_STATUS,
  type ProjectStatus,
} from "./types";

/**
 * Server Action: Cập nhật thông tin dự án
 * Bound với form qua projectId
 */
export async function updateProjectAction(projectId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const parsed = UpdateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: (formData.get("description") as string) ?? null,
    status: (formData.get("status") as ProjectStatus) ?? DEFAULT_PROJECT_STATUS,
    leadId: (() => {
      const v = formData.get("leadId");
      if (!v || v === "none") return null;
      return String(v);
    })(),
  });

  if (!parsed.success) {
    console.error("updateProject invalid:", parsed.error.flatten().fieldErrors);
    redirect(`/projects/${projectId}/settings?error=invalid`);
  }

  const { name, description, status, leadId } = parsed.data;

  // Đảm bảo leadId là thành viên dự án
  if (leadId) {
    const exists = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: leadId } },
      select: { userId: true },
    });
    if (!exists) redirect(`/projects/${projectId}/settings?error=lead_not_member`);
  }

  const before = await prisma.project.findUnique({ where: { id: projectId } });

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name, description: description ?? null, status, leadId },
  });

  // Ghi lịch sử hệ thống
  await logProjectActivity({
    projectId,
    actorId: session.user.id,
    type: "PROJECT_UPDATED",
    message: "Cập nhật thông tin dự án",
    meta: { before, after: updated },
  });

  revalidatePath(`/projects/${projectId}`, "page");
  revalidatePath(`/projects/${projectId}/settings`, "page");
  redirect(`/projects/${projectId}/settings?saved=1`);
}
