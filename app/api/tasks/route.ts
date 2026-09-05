// app/api/tasks/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { z } from "zod";

const Query = z.object({
  q: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE", "CANCELLED"]).optional(),
  projectId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  filter: z.enum(["all", "me"]).optional(),
});

export async function GET(req: Request) {
  const me = await requireUser();

  const { searchParams } = new URL(req.url);
  const parsed = Query.parse({
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    filter: searchParams.get("filter") ?? undefined,
  });

  // project mà user đang tham gia
  const myProjectIds = await prisma.projectMember.findMany({
    where: { userId: me.id },
    select: { projectId: true },
  }).then((r) => r.map(x => x.projectId));

  // nếu có projectId filter, chỉ cho phép trong danh sách của tôi
  const projectFilter = parsed.projectId && myProjectIds.includes(parsed.projectId)
    ? parsed.projectId
    : undefined;

  const q = parsed.q?.toLowerCase(); // Lowercase để tận dụng MySQL collation
  const where: any = {
    projectId: projectFilter ? projectFilter : { in: myProjectIds },
    ...(parsed.status ? { status: parsed.status } : {}),
    ...(q
      ? {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      }
      : {}),
  };

  // Filter "me": Assignee OR Follower
  if (parsed.filter === 'me') {
    where.AND = [
      {
        OR: [
          { assignees: { some: { userId: me.id } } },
          { followerId: me.id },
        ]
      }
    ];
  }

  const skip = (parsed.page - 1) * parsed.pageSize;
  const [items, total, projects] = await Promise.all([
    prisma.task.findMany({
      where,
      take: parsed.pageSize,
      skip,
      orderBy: [
        { dueDate: "asc" },          // gần tới hạn trước
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        order: true,
        projectId: true,
        column: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, key: true } },
        assignees: {
          take: 3,
          select: { user: { select: { id: true, name: true, email: true } } },
        },
        follower: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.task.count({ where }),
    prisma.project.findMany({
      where: { id: { in: myProjectIds } },
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
    projects,
  });
}
