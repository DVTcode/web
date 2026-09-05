import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

type Ctx = { params: Promise<{ inviteId: string }> };

export async function POST(
  _req: Request,
  ctx: Ctx
) {
  const me = await requireUser();
  const { inviteId } = await ctx.params;
  const key = inviteId; // cho phép là id hoặc token

  const inv = await prisma.projectInvite.findFirst({
    where: { OR: [{ id: key }, { token: key }] },
  });
  if (!inv) return NextResponse.json({ error: "Không tìm thấy lời mời." }, { status: 404 });
  if (inv.recipientId !== me.id) return NextResponse.json({ error: "Bạn không phải người nhận." }, { status: 403 });
  if (inv.expiresAt && inv.expiresAt < new Date()) {
    await prisma.projectInvite.update({ where: { id: inv.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Lời mời đã hết hạn." }, { status: 410 });
  }
  if (inv.status !== "PENDING") return NextResponse.json({ error: "Lời mời không còn hiệu lực." }, { status: 409 });

  await prisma.$transaction([
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: inv.projectId, userId: me.id } },
      update: { role: inv.role },
      create: { projectId: inv.projectId, userId: me.id, role: inv.role },
    }),
    prisma.projectInvite.update({ where: { id: inv.id }, data: { status: "ACCEPTED" } }),
  ]);

  return NextResponse.json({ ok: true, projectId: inv.projectId });
}
