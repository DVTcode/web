import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectRole } from "@/lib/authz";
import { z } from "zod";

const Q = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() });

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { projectId } = await ctx.params;
  await requireProjectRole(projectId, "VIEWER");
  const { searchParams } = new URL(req.url);
  const parsed = Q.parse({ from: searchParams.get("from") ?? undefined, to: searchParams.get("to") ?? undefined });

  const sprints = await prisma.sprint.findMany({
    where: {
      projectId,
      ...(parsed.from || parsed.to
        ? { AND: [ parsed.from ? { endDate: { gte: parsed.from } } : {},
                   parsed.to   ? { startDate: { lte: parsed.to } } : {} ] }
        : {}),
    },
    orderBy: { startDate: "asc" },
  });

  const milestones = await prisma.milestone.findMany({
    where: {
      projectId,
      ...(parsed.from || parsed.to
        ? { dueDate: { gte: parsed.from ?? new Date(0), lte: parsed.to ?? new Date("2999-12-31") } }
        : {}),
    },
    orderBy: { dueDate: "asc" },
  });

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      dueDate: parsed.from || parsed.to
        ? { gte: parsed.from ?? new Date(0), lte: parsed.to ?? new Date("2999-12-31") }
        : undefined,
    },
    select: { id: true, title: true, dueDate: true, status: true },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ sprints, milestones, tasks });
}
