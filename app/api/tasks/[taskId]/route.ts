// apps/web/app/api/tasks/[taskId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";        // chỉnh path cho đúng dự án bạn
import { prisma } from "@/lib/prisma"; // hoặc "@/lib/prisma" nếu bạn dùng file khác

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ taskId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await ctx.params;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  // TODO: check quyền của user trên task/project nếu bạn đã có RBAC
  const items = await prisma.taskActivity.findMany({
    where: { taskId },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: isNaN(limit) ? 50 : limit,
  });

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      type: a.type,                          // "TASK_CREATED" ... ActivityType (FE dùng luôn)
      message: a.message,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor,
      meta: a.meta,
    })),
  });
}

// Optional: POST để log thủ công (giúp bạn test nhanh)
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ taskId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await ctx.params;
  const body = await req.json();

  const { type, message, meta } = body as {
    type: string;
    message?: string;
    meta?: unknown;
  };

  if (!type) {
    return NextResponse.json({ error: "Missing type" }, { status: 400 });
  }

  const activity = await prisma.taskActivity.create({
    data: {
      taskId,
      type: type as any,           // ActivityType
      message,
      meta: meta as any,
      actorId: session.user.id as string,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt.toISOString(),
      actor: activity.actor,
      meta: activity.meta,
    },
    { status: 201 },
  );
}
