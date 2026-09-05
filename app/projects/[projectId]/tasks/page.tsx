// app/projects/[projectId]/tasks/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import TaskDoneChecklistModal from '@/app/components/TaskDoneChecklistModal';
import AssignTaskModal from '@/app/components/AssignTaskModal';
import CreateTaskModal from '@/app/components/CreateTaskModal';
import EditTaskModal from '@/app/components/EditTaskModal';
import TaskDetailModal from '@/app/components/TaskDetailModal';
import { ActivityDrawer } from '@/app/components/ActivityDrawer';
import { useSession } from 'next-auth/react';

type UserLite = { id: string; name: string | null; email: string };
type TaskAssignee = { user: UserLite };

type Task = {
  id: string;
  title: string;
  status: string;
  order: number | null;
  column?: { id: string; name: string } | null;
  assignees?: TaskAssignee[];
  follower?: UserLite | null;
  owner?: UserLite | null;
  hasPendingReport?: boolean;
};

type ProjectMember = {
  userId: string;
  user: UserLite;
  role: string;
};

type ColumnLite = { id: string; name: string };

type ActivityItem = {
  id: string;
  type: string;
  message?: string | null;
  createdAt: string;
  actor?: { id: string; name: string | null; email: string } | null;
  meta?: any;
};

export default function ProjectTasksPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const projectId = params?.projectId as string;

  const [items, setItems] = useState<Task[]>([]);
  const [columns, setColumns] = useState<ColumnLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // create modal
  const [openCreate, setOpenCreate] = useState(false);

  // members
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // RBAC State
  const [myRole, setMyRole] = useState<string | null>(null);

  // filters (Header)
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [columnFilter, setColumnFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [q, setQ] = useState('');

  // Done checklist
  const [doneOpen, setDoneOpen] = useState(false);
  const [doneTaskId, setDoneTaskId] = useState<string | null>(null);

  // Assign modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTask, setAssignTask] = useState<{ id: string; projectId: string } | null>(null);
  const [assignMode, setAssignMode] = useState<'follower' | 'assignees' | 'both'>('assignees');

  // Kebab menu
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);

  // History modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [historyErr, setHistoryErr] = useState<string | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const [tasksRes, colsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/tasks`, { cache: 'no-store' }),
        fetch(`/api/projects/${projectId}/columns`, { cache: 'no-store' }),
      ]);

      if (!tasksRes.ok) throw new Error(`Tasks HTTP ${tasksRes.status}`);
      if (!colsRes.ok) throw new Error(`Columns HTTP ${colsRes.status}`);

      const tasksData = await tasksRes.json();
      const colsData = await colsRes.json();

      setItems(tasksData.items || tasksData || []);
      setColumns(colsData.items || colsData || []);
    } catch (e: any) {
      setErr(e.message || 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    try {
      setMembersLoading(true);
      const res = await fetch(`/api/projects/${projectId}/members`, { cache: 'no-store' });
      const data = await res.json();
      setMembers(data.items || data || []);
    } catch {
      /* ignore */
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    if (!projectId) return;
    load();
    loadMembers();
  }, [projectId]);

  // Determine Role
  useEffect(() => {
    if (session?.user?.id && members.length > 0) {
      const me = members.find(m => m.userId === session.user.id);
      setMyRole(me?.role || 'VIEWER');
    }
  }, [session, members]);

  const canEdit = myRole === 'MANAGER' || myRole === 'LEAD';

  const taskIdQuery = searchParams.get('taskId');
  useEffect(() => {
    if (taskIdQuery) {
      setDetailTaskId(taskIdQuery);
      setDetailOpen(true);
    }
  }, [taskIdQuery]);

  const statusOptions = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE', 'CANCELLED'];
  const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  const statusMap: Record<string, string> = {
    TODO: 'Cần làm',
    IN_PROGRESS: 'Đang làm',
    REVIEW: 'Đang duyệt',
    BLOCKED: 'Bị chặn',
    DONE: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
  };

  const priorityMap: Record<string, string> = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    CRITICAL: 'Khẩn cấp',
  };

  const filteredItems = useMemo(() => {
    return items.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL') {
        // filter by priority if available
      }
      if (columnFilter !== 'ALL') {
        const colId = t.column?.id ?? '__backlog__';
        if (columnFilter === '__backlog__') {
          if (t.column?.id) return false;
        } else if (colId !== columnFilter) return false;
      }
      if (assigneeFilter !== 'ALL') {
        const ids = (t.assignees || []).map((a) => a.user.id);
        if (!ids.includes(assigneeFilter)) return false;
      }
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        if (!t.title.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [items, statusFilter, priorityFilter, columnFilter, assigneeFilter, q]);

  const getStatusStyle = (status: string) => {
    const normalized = status.replace('-', '_').toUpperCase();
    switch (normalized) {
      case 'TODO': return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'REVIEW': return 'bg-purple-100 text-purple-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      case 'DONE': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-zinc-100 text-zinc-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  async function openHistory(taskId: string) {
    try {
      setHistoryOpen(true);
      setHistoryTaskId(taskId);
      setHistoryLoading(true);
      setHistoryErr(null);
      const res = await fetch(`/api/tasks/${taskId}/activity?limit=50`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistory(data.items || data || []);
    } catch (e: any) {
      setHistoryErr(e.message || 'Không tải được lịch sử');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa task này? Hành động không thể hoàn tác.')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa thất bại');
      await load();
    } catch (e: any) {
      alert(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                <p className="text-gray-600 text-sm mt-1">Quản lý danh sách công việc dự án</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/projects/${projectId}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại dự án
              </Link>
              <Link
                href={`/projects/${projectId}/kanban`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5m4-12a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 002 2h2" />
                </svg>
                Mở Kanban
              </Link>

              {canEdit && (
                <button
                  onClick={() => setOpenCreate(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                  disabled={!projectId}
                  title="Thêm task mới"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Thêm Task
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-gray-600">Trạng thái</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{statusMap[s] || s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600">Độ ưu tiên</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="ALL">Tất cả</option>
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>{priorityMap[p] || p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600">Cột</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={columnFilter}
                onChange={(e) => setColumnFilter(e.target.value)}
              >
                <option value="ALL">Tất cả</option>
                <option value="__backlog__">Backlog</option>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs text-gray-600">Người (assignee)</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="ALL">Tất cả</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.user.name || m.user.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600">Tìm tiêu đề</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Nhập từ khóa…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* States */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
              <span className="text-gray-600">Đang tải danh sách tasks...</span>
            </div>
          </div>
        )}

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 font-medium">{err}</span>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {openCreate && (
          <CreateTaskModal
            projectId={projectId}
            members={members.map((m) => ({ id: m.userId, name: m.user.name, email: m.user.email }))}
            open={openCreate}
            onClose={() => setOpenCreate(false)}
            onCreated={async () => {
              setOpenCreate(false);
              await load();
            }}
          />
        )}

        {/* Table */}
        {!loading && !err && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tiêu đề</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tình trạng</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Người theo dõi</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Đảm nhận</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((t) => {
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => { setDetailTaskId(t.id); setDetailOpen(true); }}
                            className="font-medium text-blue-900 hover:text-blue-700 hover:underline text-left"
                          >
                            {t.title}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(t.status)}`}>
                            {statusMap[t.status] || t.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-gray-900 text-sm">
                            {t.follower ? (t.follower.name || t.follower.email) : (
                              canEdit ? (
                                <button
                                  className="text-blue-600 hover:underline text-sm"
                                  onClick={() => { setAssignTask({ id: t.id, projectId }); setAssignMode('follower'); setAssignOpen(true); }}
                                >
                                  Giao người theo dõi
                                </button>
                              ) : <span className="text-gray-400 italic">Chưa có</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900 text-sm">
                            {(t.assignees && t.assignees.length > 0) ? (
                              t.assignees.map((a) => a.user.name || a.user.email).join(', ')
                            ) : (
                              canEdit ? (
                                <button
                                  className="text-blue-600 hover:underline text-sm"
                                  onClick={() => { setAssignTask({ id: t.id, projectId }); setAssignMode('assignees'); setAssignOpen(true); }}
                                >
                                  Giao việc
                                </button>
                              ) : <span className="text-gray-400 italic">Chưa giao</span>
                            )}
                          </div>
                        </td>

                        {/* actions */}
                        <td className="px-3 py-4 text-right relative">
                          <div className="flex items-center gap-3 justify-end">
                            {/* Completion Button Logic */}
                            {(() => {
                              // 1. Check Status: Must be REVIEW ("Đang duyệt")
                              if (t.status !== 'REVIEW') return null;

                              // 2. Check Permission: Manager OR Assignee OR Follower
                              const isManager = myRole === 'MANAGER' || myRole === 'LEAD';
                              const isAssignee = t.assignees?.some(a => a.user.id === session?.user?.id);
                              const isFollower = t.follower?.id === session?.user?.id;

                              if (!isManager && !isAssignee && !isFollower) return null;

                              // 3. Check Pending State
                              if (t.hasPendingReport) {
                                return (
                                  <button
                                    className="text-gray-500 font-medium text-sm cursor-not-allowed bg-gray-100 px-3 py-1.5 rounded-lg"
                                    disabled
                                  >
                                    Chờ xác nhận
                                  </button>
                                );
                              }

                              // 4. Show "Hoàn tất"
                              return (
                                <button
                                  className="text-white bg-indigo-600 hover:bg-indigo-700 font-medium text-sm px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                                  onClick={() => { setDoneTaskId(t.id); setDoneOpen(true); }}
                                  title="Gửi báo cáo hoàn tất"
                                >
                                  Hoàn tất
                                </button>
                              );
                            })()}

                            {/* Kebab */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setMenuTaskId((prev) => (prev === t.id ? null : t.id))}
                                className="p-2 rounded-md hover:bg-gray-100"
                                aria-label="Actions"
                              >
                                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                                </svg>
                              </button>

                              {menuTaskId === t.id && (
                                <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-md z-10 p-2">
                                  <button
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-indigo-600 font-medium rounded-md"
                                    onClick={() => {
                                      setMenuTaskId(null);
                                      setDetailTaskId(t.id);
                                      setDetailOpen(true);
                                    }}
                                  >
                                    Chi tiết
                                  </button>
                                  <button
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-md"
                                    onClick={() => {
                                      setMenuTaskId(null);
                                      openHistory(t.id);
                                    }}
                                  >
                                    Lịch sử
                                  </button>
                                  {canEdit && (
                                    <>
                                      <button
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-blue-600 rounded-md"
                                        onClick={() => {
                                          setMenuTaskId(null);
                                          setEditTaskId(t.id);
                                          setEditOpen(true);
                                        }}
                                      >
                                        Chỉnh sửa
                                      </button>
                                      <button
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600 rounded-md"
                                        onClick={() => {
                                          setMenuTaskId(null);
                                          handleDelete(t.id);
                                        }}
                                      >
                                        Xóa
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td className="px-6 py-12 text-center" colSpan={5}>
                        <div className="flex flex-col items-center gap-3">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2" />
                          </svg>
                          <div>
                            <p className="text-gray-500 font-medium">Không có task theo bộ lọc</p>
                            <p className="text-gray-400 text-sm">Thử đổi điều kiện lọc hoặc tạo task mới</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Done checklist modal */}
        {doneTaskId && (
          <TaskDoneChecklistModal
            taskId={doneTaskId}
            open={doneOpen}
            onClose={() => setDoneOpen(false)}
            onCompleted={() => {
              setDoneOpen(false);
              load();
            }}
          />
        )}

        {/* Assign modal */}
        {assignTask && (() => {
          const t = items.find(x => x.id === assignTask.id);
          return (
            <AssignTaskModal
              taskId={assignTask.id}
              projectId={assignTask.projectId}
              mode={assignMode}
              open={assignOpen}
              defaultAssignees={t?.assignees?.map(a => a.user.id) ?? []}
              defaultFollowerId={t?.follower?.id || t?.owner?.id || null}
              onClose={() => { setAssignOpen(false); setAssignTask(null); }}
              onAssigned={() => { setAssignOpen(false); setAssignTask(null); load(); }}
            />
          );
        })()}

        {/* History modal -> ActivityDrawer */}
        <ActivityDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          items={history as any} // Cast to any to avoid strict type mismatch issues for now, or ensure types match
          title="Lịch sử hoạt động Task"
          subtitle={historyErr ? `Lỗi: ${historyErr}` : historyLoading ? "Đang tải..." : `Lịch sử thay đổi của task`}
        />

        {/* Edit Modal */}
        {editTaskId && (
          <EditTaskModal
            projectId={projectId}
            taskId={editTaskId}
            members={members.map((m) => ({ id: m.userId, name: m.user.name, email: m.user.email }))}
            open={editOpen}
            onClose={() => { setEditOpen(false); setEditTaskId(null); }}
            onUpdated={async () => {
              await load();
            }}
          />
        )}

        {/* Detail Modal */}
        {detailTaskId && (
          <TaskDetailModal
            projectId={projectId}
            taskId={detailTaskId}
            open={detailOpen}
            onClose={() => { setDetailOpen(false); setDetailTaskId(null); }}
          />
        )}
      </div>
    </div>
  );
}
