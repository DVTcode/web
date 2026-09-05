import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectRole, requireUser } from "@/lib/authz";
import { z } from "zod";
import { Prisma, $Enums } from "@/app/generated/prisma";

const Query = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(20),
    parentId: z.string().optional(),
});

const Body = z.object({
    content: z.string().max(5000).default(""),
    parentId: z.string().optional(),
    mentions: z.array(z.string()).optional(),
    attachments: z.array(z.any()).optional(),
});

type Ctx = { params: Promise<{ projectId: string; taskId: string }> };

/* --------------------------- GET: list comments --------------------------- */
export async function GET(req: Request, ctx: Ctx) {
    const { projectId, taskId } = await ctx.params;

    // Use requireUser to identify current user
    const me = await requireUser();
    await requireProjectRole(projectId, "VIEWER");

    // Check permissions: Must be LEAD/OWNER or Assigned to Task
    const [membership, taskAssignee] = await Promise.all([
        prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: me.id } },
            select: { role: true },
        }),
        prisma.taskAssignee.findUnique({
            where: { taskId_userId: { taskId, userId: me.id } }
        })
    ]);

    const isLead = membership?.role === 'LEAD' || membership?.role === 'MANAGER';
    const isAssigned = !!taskAssignee;

    if (!isLead && !isAssigned) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = Query.parse({
        page: searchParams.get("page") ?? undefined,
        pageSize: searchParams.get("pageSize") ?? undefined,
        parentId: searchParams.get("parentId") ?? undefined,
    });

    const where = {
        taskId,
        parentId: parsed.parentId ?? null,
    };
    const skip = (parsed.page - 1) * parsed.pageSize;

    const [items, total] = await Promise.all([
        prisma.taskComment.findMany({
            where,
            take: parsed.pageSize,
            skip,
            orderBy: { createdAt: "desc" },
            include: {
                author: { select: { id: true, name: true, email: true } },
                attachments: { include: { resource: true } },
                _count: { select: { replies: true } },
            },
        }),
        prisma.taskComment.count({ where }),
    ]);

    // Transform items to flatten attachments structure if needed matches existing frontend expectations
    const formattedItems = items.map(item => ({
        ...item,
        attachments: item.attachments.map(a => a.resource),
    }));

    return NextResponse.json({
        items: formattedItems,
        total,
        page: parsed.page,
        pageSize: parsed.pageSize,
    });
}

/* -------------------------- POST: create comment -------------------------- */
export async function POST(req: Request, ctx: Ctx) {
    const { projectId, taskId } = await ctx.params;

    const me = await requireUser();
    await requireProjectRole(projectId, "MEMBER");

    // Check permissions: Must be LEAD/OWNER or Assigned to Task
    const [membership, taskAssignee] = await Promise.all([
        prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: me.id } },
            select: { role: true },
        }),
        prisma.taskAssignee.findUnique({
            where: { taskId_userId: { taskId, userId: me.id } }
        })
    ]);

    const isLead = membership?.role === 'LEAD' || membership?.role === 'MANAGER';
    const isAssigned = !!taskAssignee;

    if (!isLead && !isAssigned) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { content, parentId, mentions = [], attachments = [] } = Body.parse(await req.json());

    // Input validation: Must have content OR attachments
    if (!content && (!attachments || attachments.length === 0)) {
        return NextResponse.json({ error: "Content or attachments required" }, { status: 400 });
    }

    // validate parentId
    if (parentId) {
        const parent = await prisma.taskComment.findUnique({
            where: { id: parentId },
        });
        if (!parent || parent.taskId !== taskId) {
            return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
        }
    }

    const created = await prisma.$transaction(async (tx) => {
        // 1. Create Comment
        const c = await tx.taskComment.create({
            data: {
                taskId,
                authorId: me.id,
                content,
                parentId: parentId ?? null,
                attachments: {
                    create: attachments.map((res: any) => ({
                        resourceId: res.id,
                        addedById: me.id,
                        taskId, // TaskAttachment also requires taskId
                    })),
                }
            },
            include: {
                author: { select: { id: true, name: true, email: true } },
                attachments: { include: { resource: true } },
                _count: { select: { replies: true } },
            }
        });

        // 2. Mentions (@user)
        const uniq = Array.from(new Set(mentions.filter((u) => u !== me.id)));

        if (uniq.length) {
            const task = await tx.task.findUnique({
                where: { id: taskId },
                select: { title: true },
            });

            // Send notifications
            await tx.notification.createMany({
                data: uniq.map((uid) => ({
                    recipientId: uid,
                    type: $Enums.NotificationType.MENTION, // General MENTION type
                    projectId,
                    taskId,
                    data: {
                        projectId,
                        taskId,
                        commentId: c.id,
                        actorName: me.name || me.email,
                        taskTitle: task?.title || "Công việc",
                        projectName: "Dự án", // Should fetch project name if needed
                    } as Prisma.InputJsonValue,
                })),
            });
        }

        return c;
    });

    // Format response
    const formatted = {
        ...created,
        attachments: created.attachments.map(a => a.resource),
    };

    return NextResponse.json(formatted, { status: 201 });
}
