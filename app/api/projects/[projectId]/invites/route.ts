// app/api/projects/[projectId]/invites/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectRole } from "@/lib/authz";
import { randomBytes } from "crypto";
import { z } from "zod";

// Next 15: params phải await
type Ctx = { params: Promise<{ projectId: string }> };

const Body = z.object({
  userId: z.string().cuid(),                               // ✅ cuid
  role: z.enum(["VIEWER","MEMBER","LEAD","MANAGER"]).default("MEMBER"),
});

export async function POST(req: Request, ctx: Ctx) {
  const { projectId } = await ctx.params;                  // ✅ await
  const me = await requireProjectRole(projectId, "MANAGER");
  const { userId, role } = Body.parse(await req.json());

  // Đã là member?
  const already = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (already) {
    return NextResponse.json({ error: "Người này đã là thành viên" }, { status: 409 });
  }

  // Đã có invite PENDING cho user này?
  const dup = await prisma.projectInvite.findFirst({
    where: { projectId, recipientId: userId, status: "PENDING" },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json({ error: "Đã tồn tại lời mời đang chờ" }, { status: 409 });
  }

  const token = randomBytes(16).toString("hex"); // khóa ngắn
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invite = await prisma.projectInvite.create({
    data: {
      projectId: project.id,
      recipientId: userId,
      role: role as any,
      token,
      status: "PENDING",                                   // ✅ set rõ ràng
      expiresAt,
      invitedById: (me as any).user?.id ?? (me as any).id,
    },
    select: {
      id: true, token: true, role: true, status: true, expiresAt: true,
      recipientId: true, invitedById: true, projectId: true, createdAt: true,
    },
  });

  // Notification (nếu model data là JSON)
  await prisma.notification.create({
    data: {
      recipientId: userId,
      type: "PROJECT_INVITE",
      data: { inviteId: invite.id, projectId: project.id, projectName: project.name, role },
    },
  });

  return NextResponse.json(invite, { status: 201 });
}

export async function GET(_req: Request, ctx: Ctx) {
  const { projectId } = await ctx.params;                  // ✅ await
  await requireProjectRole(projectId, "MANAGER");
  const items = await prisma.projectInvite.findMany({
    where: { projectId, status: "PENDING" },
    include: { recipient: true, invitedBy: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}
