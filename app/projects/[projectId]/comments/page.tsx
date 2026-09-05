// app/projects/[projectId]/comments/page.tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import CommentsClient from "./CommentsClient";

export default async function ProjectCommentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>; // Next.js 15 style
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      key: true,
      members: {
        select: {
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!project) {
    return (
      <div className="min-h-screen grid place-items-center text-gray-700">
        Không tìm thấy dự án
      </div>
    );
  }

  // Fetch tasks for dropdown
  const me = await requireUser();
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: me.id } },
    select: { role: true },
  });

  const isLead = membership?.role === 'LEAD' || membership?.role === 'MANAGER';

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      ...(isLead ? {} : { assignees: { some: { userId: me.id } } })
    },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <CommentsClient
      projectId={project.id}
      projectName={project.name}
      projectKey={project.key}
      tasks={tasks}
      members={project.members.map((m) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
      }))}
      currentUserRole={membership?.role}
    />
  );
}
