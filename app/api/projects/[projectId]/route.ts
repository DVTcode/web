// apps/web/app/api/projects/[projectId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireProjectRole, requireUser } from '@/lib/authz';
import { isSysAdmin } from '@/lib/rbac';
import { z } from 'zod';
import { logProjectActivity } from "@/lib/activity-log";

const UpdateProject = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['active', 'archived']).optional(),
  leadId: z.string().cuid().nullable().optional(),
});

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;                // ✅ Next 15: await
    const user = await requireUser();
    const admin = isSysAdmin((user as any).globalRole);

    if (!admin) await requireProjectRole(projectId, 'VIEWER');

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { include: { user: true } },
        columns: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    await requireProjectRole(projectId, "MANAGER");

    const user = await requireUser();

    const data = UpdateProject.parse(await req.json());

    // --- Lấy giá trị cũ để ghi log diff ---
    const before = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        name: true,
        description: true,
        status: true,
        leadId: true,
      },
    });

    // Kiểm tra leadId có phải là thành viên không
    if (data.leadId != null) {
      const exists = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: data.leadId } },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "leadId phải là thành viên của dự án" },
          { status: 400 },
        );
      }
    }

    // --- Update Project ---
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: data.name,
        description: data.description ?? undefined,
        status: data.status,
        leadId: data.leadId ?? undefined,
      },
    });

    // --- Ghi Log Hoạt Động ---
    await logProjectActivity({
      projectId,
      actorId: user.id,
      type: "PROJECT_UPDATED",
      message: "Cập nhật thông tin dự án",
      meta: {
        before,
        after: {
          name: project.name,
          description: project.description,
          status: project.status,
          leadId: project.leadId,
        },
      },
    });

    return NextResponse.json(project);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;                // ✅ Next 15: await
    await requireProjectRole(projectId, 'MANAGER');

    // (khuyến nghị) cân nhắc soft-delete thay vì xoá cứng
    await prisma.project.delete({ where: { id: projectId } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
