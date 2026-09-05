// app/projects/[projectId]/settings/page.tsx
import Link from "next/link";
import { Settings, Save, Hash, FileText, ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import ProjectMembersSettings from "./ProjectMembersSettings";
import {
  PROJECT_STATUS_OPTIONS,
  DEFAULT_PROJECT_STATUS,
  type ProjectStatus,
  UpdateSchema,
} from "./types";
import { updateProjectAction } from "./actions";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // Fetch current user role for client component
  const me = await requireUser();
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: me.id } },
    select: { role: true },
  });
  const currentUserRole = membership?.role || "VIEWER";

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: { select: { members: true } },
      members: { include: { user: true } },
      columns: { orderBy: { order: "asc" } },
    },
  });

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto text-center">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Không tìm thấy dự án
          </h1>
          <p className="text-gray-500">
            Dự án bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ChevronLeft className="w-4 h-4" /> Về Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Chuẩn hóa defaultValue cho select status
  const ALLOWED: ProjectStatus[] = ["planning", "in_progress", "review", "done"];
  const safeStatus: ProjectStatus = ALLOWED.includes(
    project.status as ProjectStatus
  )
    ? (project.status as ProjectStatus)
    : DEFAULT_PROJECT_STATUS;

  // Bind projectId vào server action
  const boundAction = updateProjectAction.bind(null, project.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center order-last ml-auto">
                <ChevronLeft className="w-8 h-8 text-white" />
              </Link>
              <Settings className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-3xl font-bold text-white">Cài đặt dự án</h1>
                <div className="flex items-center gap-2 text-indigo-100 mt-1">
                  <span className="font-medium">{project.name}</span>
                  <span className="opacity-60">•</span>
                  <div className="flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    <span>{project.key}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quản lý thành viên */}
        <ProjectMembersSettings
          projectId={project.id}
          initialMembers={project.members.map((m) => ({
            userId: m.userId,
            role: m.role,
            user: {
              id: m.user.id,
              name: m.user.name,
              email: m.user.email,
              image: m.user.image,
            },
          }))}
          currentUserRole={currentUserRole}
        />

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">
              Thông tin dự án
            </h2>
            <p className="text-gray-500 mt-1">
              Chỉnh sửa và lưu lại các thông tin cơ bản.
            </p>
          </div>

          <form action={boundAction} className="p-8 space-y-6">
            <input type="hidden" name="_method" value="PATCH" />

            {/* Tên dự án */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Hash className="w-4 h-4" />
                Tên dự án
              </label>
              <input
                name="name"
                defaultValue={project.name}
                className="text-gray-900 w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors duration-200 bg-gray-50 focus:bg-white"
                placeholder="Nhập tên dự án..."
              />
            </div>

            {/* Mô tả */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText className="w-4 h-4" />
                Mô tả dự án
              </label>
              <textarea
                name="description"
                defaultValue={project.description ?? ""}
                className="text-gray-900 w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors duration-200 bg-gray-50 focus:bg-white resize-none"
                rows={5}
                placeholder="Mô tả chi tiết về dự án của bạn..."
              />
            </div>

            {/* Trạng thái */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Trạng thái
              </label>
              <select
                name="status"
                defaultValue={safeStatus}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-blue-500"
              >
                {PROJECT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Trưởng dự án (lead) */}
            {/* Thêm input leadId nếu cần */}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </button>

              <Link
                href={`/projects/${project.id}`}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors duration-200"
              >
                Hủy
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
