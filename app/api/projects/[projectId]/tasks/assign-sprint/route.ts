// app/api/projects/[projectId]/tasks/assign-sprint/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireProjectRole } from '@/lib/authz';
import { z } from 'zod';

const Schema = z.object({
  taskId: z.string(),
  sprintId: z.string().nullable(), // null = trả task về Backlog
});

type Ctx = { params: Promise<{ projectId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { projectId } = await ctx.params;
  await requireProjectRole(projectId, 'MEMBER');
  const { taskId, sprintId } = Schema.parse(await req.json());

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { sprintId: sprintId ?? null },
  });

  return NextResponse.json(task);
}
