// app/api/projects/[projectId]/tasks/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireProjectRole } from '@/lib/authz';
import { z } from 'zod';

/** Chấp nhận 'YYYY-MM-DD', ISO string, hoặc Date; trả về Date|null */
const DateLike = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
    z.string().datetime(), // ISO
    z.date(),
  ])
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return new Date(`${v}T00:00:00Z`);
    }
    return new Date(v as string);
  });

const CreateTask = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  acceptance: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  dueDate: DateLike,
  assigneeIds: z.array(z.string().cuid2()).optional().default([]),
  estimateH: z.number().optional().nullable(),
  labels: z.array(z.string()).optional().default([]),
  watcherIds: z.array(z.string().cuid2()).optional().default([]),
  checklist: z.array(z.object({ title: z.string() })).optional().default([]),
  attachmentIds: z.array(z.string()).optional().default([]),
});

// =================== GET ===================
type Ctx = { params: Promise<{ projectId: string }> };
export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // ✅ Chỉ cần 'VIEWER' là đủ; requireProjectRole của bạn đã hỗ trợ “ngưỡng”:
    // MANAGER/LEAD/MEMBER/REVIEWER đều pass qua.
    await requireProjectRole(projectId, ['VIEWER']);

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view');
    const status = searchParams.get('status') as string | null;

    if (view === 'board') {
      const [columns, tasks] = await Promise.all([
        prisma.boardColumn.findMany({
          where: { projectId },
          orderBy: { order: 'asc' },
        }),
        prisma.task.findMany({
          where: { projectId, ...(status ? { status: status as any } : {}) },
          orderBy: [{ columnId: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            title: true,
            description: true,
            columnId: true,
            order: true,
            priority: true,
            status: true,
            assignees: {
              select: { user: { select: { id: true, name: true, email: true } } },
            },
            dueDate: true,
          },
        }),
      ]);
      return NextResponse.json({ columns, tasks });
    }

    const items = await prisma.task.findMany({
      where: { projectId },
      orderBy: [{ columnId: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
      include: {
        column: { select: { id: true, name: true } },
        assignees: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
        follower: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Check for "Complete Requests"
    const taskIds = items.map(t => t.id);
    const reports = await prisma.activityLog.findMany({
      where: {
        projectId,
        taskId: { in: taskIds },
        message: 'Báo cáo hoàn tất task',
      },
      select: { taskId: true, createdAt: true },
    });

    // Map of TaskID -> Latest Report Time
    const latestReportMap = new Map<string, Date>();
    for (const r of reports) {
      if (!r.taskId) continue;
      const existing = latestReportMap.get(r.taskId);
      if (!existing || new Date(r.createdAt) > existing) {
        latestReportMap.set(r.taskId, new Date(r.createdAt));
      }
    }

    const itemsWithFlag = items.map(t => {
      const reportTime = latestReportMap.get(t.id);
      let isPending = false;

      if (reportTime && t.status === 'REVIEW') {
        const taskTime = t.updatedAt.getTime();
        const repTime = reportTime.getTime();

        // If report is older than task update by more than 5 seconds, it's considered "rejected/handled"
        // since meaningful task updates (like Reject or manual status change) happen AFTER the report.
        if (repTime >= taskTime - 5000) {
          isPending = true;
        }
      }

      return {
        ...t,
        owner: t.createdBy, // Map createdBy to owner for frontend compatibility
        hasPendingReport: isPending
      };
    });

    return NextResponse.json({ items: itemsWithFlag });
  } catch (e: any) {
    console.error('[GET /api/projects/[id]/tasks]', e);
    return NextResponse.json(
      { error: e?.message ?? 'Internal Server Error' },
      { status: e?.status ?? 500 },
    );
  }
}

// =================== POST ===================
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const guard = await requireProjectRole(projectId, ['LEAD', 'MANAGER']);
    const data = CreateTask.parse(await req.json());

    const defaultCol = await prisma.boardColumn.findFirst({
      where: { projectId },
      orderBy: [{ isDefault: 'desc' }, { order: 'asc' }],
      select: { id: true },
    });

    // 1. Xử lý Description + Acceptance + Checklist
    let finalDescription = data.description || '';

    if (data.acceptance) {
      finalDescription += `\n\n### Acceptance Criteria\n${data.acceptance}`;
    }

    if (data.checklist && data.checklist.length > 0) {
      finalDescription += `\n\n### Checklist\n`;
      data.checklist.forEach((item) => {
        finalDescription += `- [ ] ${item.title}\n`;
      });
    }

    // 2. Xử lý Assignees
    let validAssigneeIds: string[] = [];
    if (data.assigneeIds?.length) {
      const members = await prisma.projectMember.findMany({
        where: { projectId, userId: { in: data.assigneeIds } },
        select: { userId: true },
      });
      validAssigneeIds = members.map((m) => m.userId);
    }

    // 3. Xử lý Follower (chỉ lấy người đầu tiên vì schema chỉ có 1 followerId)
    let followerId: string | null = null;
    if (data.watcherIds?.length) {
      // Kiểm tra xem user có trong project không
      const follower = await prisma.projectMember.findFirst({
        where: { projectId, userId: data.watcherIds[0] },
        select: { userId: true },
      });
      if (follower) followerId = follower.userId;
    }

    const orderValue = Math.floor(Date.now() / 1000);

    // Xử lý status tự động: Nếu có người theo dõi VÀ người thực hiện -> IN_PROGRESS
    const initialStatus = (followerId && validAssigneeIds.length > 0) ? 'IN_PROGRESS' : 'TODO';

    // 4. Tạo Task
    const created = await prisma.task.create({
      data: {
        projectId,
        columnId: defaultCol?.id ?? null,
        title: data.title,
        description: finalDescription,
        priority: data.priority,
        status: initialStatus,
        dueDate: data.dueDate,
        estimateHours: data.estimateH ? data.estimateH : null,
        createdById: guard.user.id,
        order: orderValue,
        followerId,
        assignees: {
          create: validAssigneeIds.map((uid) => ({ userId: uid })),
        },
        attachments: {
          create: data.attachmentIds.map((resId) => ({
            resourceId: resId,
            addedById: guard.user.id,
          })),
        },
      },
      include: {
        column: { select: { id: true, name: true } },
        assignees: { select: { user: { select: { id: true, name: true, email: true } } } },
        follower: { select: { id: true, name: true, email: true } },
        project: true,
      },
    });

    // 5. Xử lý Labels (Tags)
    if (data.labels && data.labels.length > 0) {
      for (const labelName of data.labels) {
        const slug = labelName.toLowerCase().replace(/\s+/g, '-');
        // Tìm hoặc tạo Tag
        let tag = await prisma.tag.findUnique({
          where: { projectId_slug: { projectId, slug } },
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: { projectId, name: labelName, slug },
          });
        }
        // Link Task -> Tag
        await prisma.taskTag.create({
          data: { taskId: created.id, tagId: tag.id },
        }).catch(() => null); // bỏ qua nếu đã tồn tại (dù logic trên đã lọc)
      }
    }

    // --- NOTIFICATIONS ---
    // 1. New Task in Project (notify all members except creator)
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });
    const recipients = members.filter(m => m.userId !== guard.user.id);

    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map(m => ({
          recipientId: m.userId,
          type: 'TASK_CREATED',
          projectId,
          taskId: created.id,
          data: {
            taskTitle: created.title,
            projectKey: created.project.key,
            projectName: created.project.name,
          },
        })),
      });
    }

    // 2. Assigned (notify assignees except creator)
    const assignedToNotify = validAssigneeIds.filter(uid => uid !== guard.user.id);
    if (assignedToNotify.length > 0) {
      await prisma.notification.createMany({
        data: assignedToNotify.map(uid => ({
          recipientId: uid,
          type: 'TASK_ASSIGNED',
          projectId,
          taskId: created.id,
          data: {
            taskTitle: created.title,
            projectKey: created.project.key,
            projectName: created.project.name,
            assignerName: guard.user.name || guard.user.email
          }
        }))
      });
    }

    return NextResponse.json(created);
  } catch (e: any) {
    console.error('[POST /api/projects/[id]/tasks]', e);
    return NextResponse.json(
      { error: e?.message ?? 'Internal Server Error' },
      { status: e?.status ?? 500 },
    );
  }
}
