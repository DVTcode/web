// app/api/projects/[projectId]/tasks/[taskId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireProjectRole } from '@/lib/authz';
import { z } from 'zod';
import { logTaskActivity } from '@/lib/activity-log';

const UpdateTask = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assigneeIds: z.array(z.string()).optional(),
  startDate: z.preprocess(v => (v === '' ? null : v), z.coerce.date().nullable().optional()),
  dueDate: z.preprocess(v => (v === '' ? null : v), z.coerce.date().nullable().optional()),
  estimateHours: z.preprocess(v => (v === '' ? null : v), z.coerce.number().nullable().optional()),
  followerId: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  attachmentIds: z.array(z.string()).optional(),
  sprintId: z.string().nullable().optional(),
});

// Helper: lấy userId từ requireProjectRole (trả về { user, membershipRole, globalRole })
function getUserId(me: { user: any; membershipRole: string; globalRole: string }): string {
  return (me as any).user?.id ?? (me as any).id;
}
function getUserName(me: { user: any; membershipRole: string; globalRole: string }): string {
  return (me as any).user?.name ?? (me as any).user?.email ?? '';
}

// GET
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; taskId: string }> }
) {
  try {
    const { taskId } = await ctx.params;
    const t = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        follower: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: true } },
        attachments: { include: { resource: true } },
      },
    });
    if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await requireProjectRole(t.projectId, 'VIEWER');
    return NextResponse.json(t);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

// PATCH
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; taskId: string }> }
) {
  try {
    const { taskId } = await ctx.params;

    const t0 = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!t0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const me = await requireProjectRole(t0.projectId, 'LEAD');
    const meId = getUserId(me);
    const meName = getUserName(me);

    // lấy snapshot "before"
    const before = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { select: { userId: true } },
        createdBy: { select: { id: true } },
      },
    });

    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = UpdateTask.parse(await req.json());

    // Xử lý logic tự động chuyển status sang IN_PROGRESS
    let autoStatus: string | undefined = undefined;
    if (data.status === undefined && before.status === 'TODO') {
      const nextFollower = data.followerId !== undefined ? data.followerId : before.followerId;
      const nextAssigneeCount = data.assigneeIds !== undefined ? data.assigneeIds.length : before.assignees.length;
      if (nextFollower && nextAssigneeCount > 0) {
        autoStatus = 'IN_PROGRESS';
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.task.update({
        where: { id: taskId },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          description: data.description ?? undefined,
          status: (data.status as any) ?? (autoStatus as any) ?? undefined,
          priority: (data.priority as any) ?? undefined,
          startDate: data.startDate ?? undefined,
          dueDate: data.dueDate ?? undefined,
          estimateHours: data.estimateHours ?? undefined,
          followerId: data.followerId === undefined ? undefined : data.followerId,
          sprintId: data.sprintId === undefined ? undefined : data.sprintId,
        },
        // Thêm status vào select để check thay đổi bên dưới
        select: {
          id: true,
          status: true,
          projectId: true,
          title: true,
          project: { select: { key: true, name: true } },
        },
      });

      if (data.assigneeIds) {
        await tx.taskAssignee.deleteMany({ where: { taskId } });
        if (data.assigneeIds.length) {
          await tx.taskAssignee.createMany({
            data: data.assigneeIds.map((uid) => ({ taskId, userId: uid })),
          });

          // Notification: TASK_ASSIGNED for NEW assignees
          const oldIds = before?.assignees.map(a => a.userId) || [];
          const newIds = data.assigneeIds;
          const addedIds = newIds.filter(id => !oldIds.includes(id) && id !== meId);

          if (addedIds.length > 0) {
            await tx.notification.createMany({
              data: addedIds.map(uid => ({
                recipientId: uid,
                type: 'TASK_ASSIGNED',
                projectId: t0.projectId,
                taskId,
                data: {
                  taskTitle: u.title,
                  projectKey: u.project.key,
                  projectName: u.project.name,
                  assignerName: meName,
                },
              })),
            });
          }
        }
      }

      // Sync Labels
      if (data.labels) {
        await tx.taskTag.deleteMany({ where: { taskId } });
        for (const labelName of data.labels) {
          const slug = labelName.toLowerCase().replace(/\s+/g, '-');
          let tag = await tx.tag.findUnique({
            where: { projectId_slug: { projectId: t0.projectId, slug } },
          });
          if (!tag) {
            tag = await tx.tag.create({
              data: { projectId: t0.projectId, name: labelName, slug },
            });
          }
          await tx.taskTag.create({
            data: { taskId, tagId: tag.id },
          }).catch(() => null);
        }
      }

      // Sync Attachments
      if (data.attachmentIds) {
        const currentAttachments = await tx.taskAttachment.findMany({
          where: { taskId },
          select: { resourceId: true },
        });
        const currentResIds = currentAttachments.map(x => x.resourceId);

        const toDelete = currentResIds.filter(id => !data.attachmentIds!.includes(id));
        if (toDelete.length > 0) {
          await tx.taskAttachment.deleteMany({
            where: { taskId, resourceId: { in: toDelete } },
          });
        }

        const toAdd = data.attachmentIds.filter(id => !currentResIds.includes(id));
        if (toAdd.length > 0) {
          await tx.taskAttachment.createMany({
            data: toAdd.map(resId => ({
              taskId,
              resourceId: resId,
              addedById: meId,
            })),
          });
        }
      }

      return u;
    });

    // --- Notification: Status Changed ---
    if (updated.status && before.status && updated.status !== before.status) {
      const recipients = new Set<string>();
      before.assignees.forEach(a => recipients.add(a.userId));
      if (before.followerId) recipients.add(before.followerId);
      if (before.createdBy?.id) recipients.add(before.createdBy.id);
      recipients.delete(meId);

      if (recipients.size > 0) {
        await prisma.notification.createMany({
          data: Array.from(recipients).map(uid => ({
            recipientId: uid,
            type: 'TASK_STATUS_CHANGED',
            projectId: updated.projectId,
            taskId,
            data: {
              taskTitle: updated.title,
              projectKey: updated.project.key,
              projectName: updated.project.name,
              actorName: meName,
              oldStatus: before.status,
              newStatus: updated.status,
            },
          })),
        });
      }
    }

    try {
      await logTaskActivity({
        projectId: updated.projectId,
        taskId,
        actorId: meId,
        type: 'TASK_UPDATED',
        message: 'Cập nhật nội dung task',
        meta: { before, after: updated },
      });
    } catch (err) {
      console.error('logTaskActivity failed', err);
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: e?.status ?? 500 });
  }
}

// DELETE
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; taskId: string }> }
) {
  try {
    const { taskId } = await ctx.params;
    const t = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
    if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await requireProjectRole(t.projectId, 'MEMBER');
    await prisma.task.delete({ where: { id: taskId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

// POST form override (_method)
export async function POST(
  req: Request,
  ctx: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('application/x-www-form-urlencoded') && !ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const fd = await req.formData();
  const method = String(fd.get('_method') || '').toUpperCase();

  if (method === 'PATCH') {
    const body = {
      title: (fd.get('title') as string) || undefined,
      description: (fd.get('description') as string) ?? undefined,
      status: (fd.get('status') as string) || undefined,
      priority: (fd.get('priority') as string) || undefined,
      dueDate: (fd.get('dueDate') as string) || undefined,
      assigneeIds: fd.getAll('assigneeIds').map(String) as string[],
      followerId: (fd.get('followerId') as string) ?? undefined,
    };
    (req as any).json = async () => body;
    return PATCH(req, ctx);
  }

  if (method === 'DELETE') {
    return DELETE(req, ctx);
  }

  return NextResponse.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
