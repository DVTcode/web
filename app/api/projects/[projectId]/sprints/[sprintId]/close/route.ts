import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireProjectRole } from '@/lib/authz';

type Ctx = { params: Promise<{ projectId: string; sprintId: string }> };

export async function PUT(_req: Request, ctx: Ctx) {
  const { projectId, sprintId } = await ctx.params;
  await requireProjectRole(projectId, 'MANAGER');
  const s = await prisma.sprint.update({
    where: { id: sprintId },
    data: { status: 'CLOSED' as const },
  });
  return NextResponse.json(s);
}
