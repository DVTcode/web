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
  const key = inviteId;

  const inv = await prisma.projectInvite.findFirst({
    where: { OR: [{ id: key }, { token: key }] },
  });
  if (!inv) return NextResponse.json({ error: "Không tìm thấy lời mời." }, { status: 404 });
  if (inv.recipientId !== me.id) return NextResponse.json({ error: "Bạn không phải người nhận." }, { status: 403 });
  if (inv.status !== "PENDING") return NextResponse.json({ error: "Lời mời không còn hiệu lực." }, { status: 409 });

  await prisma.projectInvite.update({ where: { id: inv.id }, data: { status: "REVOKED" } });
  return NextResponse.json({ ok: true });
}
