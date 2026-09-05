'use client';
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageSquare, ChevronLeft, LayoutList, ListTodo } from "lucide-react";

import ResourceSidebar from "./ResourceSidebar";

type UserLite = { id: string; name: string | null; email: string };
type Attachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
};
type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: UserLite;
  _count: { replies: number };
  attachments?: Attachment[];
};

type Member = { id: string; name: string | null; email: string };
type TaskLite = { id: string; title: string };

export default function CommentsClient({
  projectId,
  projectName,
  projectKey,
  members,
  tasks,
  currentUserRole
}: {
  projectId: string;
  projectName: string;
  projectKey?: string;
  members: Member[];
  tasks?: TaskLite[];
  currentUserRole?: string;
}) {
  const { data: session } = useSession();
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Context State
  const [context, setContext] = useState<'PROJECT' | 'TASK'>('PROJECT');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [resourceReloadTrigger, setResourceReloadTrigger] = useState(0);

  // Derived API Base URL
  const apiBaseUrl = context === 'PROJECT'
    ? `/api/projects/${projectId}/comments`
    : `/api/projects/${projectId}/tasks/${selectedTaskId}/comments`;

  async function load() {
    if (context === 'TASK' && !selectedTaskId) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`${apiBaseUrl}?page=1&pageSize=20`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setItems(j.items ?? []);
    } catch (e: any) {
      setErr(e.message || "Không tải được bình luận");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // handle delete callback
  function onDeleted(id: string) {
    setItems(items.filter(i => i.id !== id));
    setResourceReloadTrigger(n => n + 1);
  }

  // handle update callback
  function onUpdated(updated: Comment) {
    setItems(items.map(i => i.id === updated.id ? updated : i));
  }

  useEffect(() => {
    load();
  }, [projectId, context, selectedTaskId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start">
      <ResourceSidebar
        projectId={projectId}
        apiBaseUrl={apiBaseUrl}
        reloadTrigger={resourceReloadTrigger}
      />

      <div className="flex-1 min-w-0 max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow border p-5">
          <div className="flex items-center gap-3">
            <Link href={`/projects/${projectId}`} className="ml-auto order-last hover:bg-gray-100 p-2 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-500" />
            </Link>
            <MessageSquare className="w-7 h-7 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bình luận dự án</h1>
              <div className="text-gray-600 text-sm">
                <span className="font-medium">{projectName}</span>
                {projectKey ? <> • <span className="font-mono">{projectKey}</span></> : null}
              </div>
            </div>
          </div>
        </div>

        {/* Context Switcher */}
        <div className="bg-white rounded-xl shadow border p-1 flex gap-1">
          <button
            onClick={() => { setContext('PROJECT'); setSelectedTaskId(''); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                ${context === 'PROJECT' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutList className="w-4 h-4" />
            Toàn dự án
          </button>
          <button
            onClick={() => setContext('TASK')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                ${context === 'TASK' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <ListTodo className="w-4 h-4" />
            Theo công việc
          </button>
        </div>

        {context === 'TASK' && (
          <div className="bg-white p-4 rounded-xl shadow border">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn công việc:</label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Chọn công việc để xem bình luận --</option>
              {tasks?.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Main Content */}
        {(context === 'TASK' && !selectedTaskId) ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
            Vui lòng chọn một công việc để xem bình luận
          </div>
        ) : (
          <div className="space-y-6">
            <CommentForm
              projectId={projectId}
              apiBaseUrl={apiBaseUrl}
              members={members}
              onCreated={() => { load(); setResourceReloadTrigger(n => n + 1); }}
            />

            {loading && (
              <div className="text-center py-4 text-gray-500">Đang tải bình luận...</div>
            )}

            {err && (
              <div className="text-center py-4 text-red-500">{err}</div>
            )}

            <div className="space-y-4">
              {items.map(c => (
                <CommentItem
                  key={c.id}
                  projectId={projectId}
                  apiBaseUrl={apiBaseUrl}
                  c={c}
                  members={members}
                  currentUserRole={currentUserRole}
                  currentUserId={session?.user?.id}
                  onDeleted={() => onDeleted(c.id)}
                  onUpdated={(newC) => onUpdated(newC)}
                />
              ))}
              {!loading && items.length === 0 && (
                <div className="text-center py-8 text-gray-400 italic">Chưa có bình luận nào</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div >
  );
}

function CommentItem({
  projectId,
  apiBaseUrl,
  c,
  members,
  currentUserRole,
  currentUserId,
  onDeleted,
  onUpdated,
}: {
  projectId: string;
  apiBaseUrl: string;
  c: Comment;
  members: Member[];
  currentUserRole?: string;
  currentUserId?: string;
  onDeleted?: () => void;
  onUpdated?: (c: Comment) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(c.content);
  const [updating, setUpdating] = useState(false);

  async function loadReplies() {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}?parentId=${c.id}&page=1&pageSize=50`, { cache: "no-store" });
      const j = await res.json();
      setReplies(j.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;
    try {
      const res = await fetch(`${apiBaseUrl}/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Xóa thất bại");
      onDeleted?.();
    } catch (e) {
      alert("Không thể xóa bình luận");
    }
  }

  async function handleUpdate() {
    if (!editContent.trim()) return;
    try {
      setUpdating(true);
      const res = await fetch(`${apiBaseUrl}/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error("Sửa thất bại");
      const updated = await res.json();
      onUpdated?.(updated);
      setIsEditing(false);
    } catch (e) {
      alert("Không thể sửa bình luận");
    } finally {
      setUpdating(false);
    }
  }

  const isOwner = currentUserId === c.author.id;
  const canManage = currentUserRole === 'LEAD' || currentUserRole === 'MANAGER';
  const canEdit = isOwner;
  const canDelete = isOwner || canManage;

  const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500'];
  const colorIndex = c.author.id.charCodeAt(0) % avatarColors.length;

  return (
    <div className="group hover:bg-gray-50/50 rounded-xl p-4 transition-all duration-200">
      <div className="flex items-start gap-4">
        <div className={`h-10 w-10 rounded-full ${avatarColors[colorIndex]} flex items-center justify-center text-white font-bold shadow-md flex-shrink-0 ring-2 ring-white`}>
          {(c.author.name || c.author.email)[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-gray-900">{c.author.name || c.author.email}</span>
            <span className="text-gray-400">•</span>
            <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
          </div>

          {isEditing ? (
            <div className="space-y-3 bg-white p-3 rounded-lg border border-blue-200">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setIsEditing(false); setEditContent(c.content); }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                  disabled={updating}
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updating || !editContent.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {updating ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
              dangerouslySetInnerHTML={{ __html: c.content }}
            />
          )}

          {/* Attachments */}
          {c.attachments && c.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {c.attachments.map(att => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {att.name}
                </a>
              ))}
            </div>
          )}

          {/* actions */}
          <div className="mt-3 flex items-center gap-4">
            <ReplyForm
              projectId={projectId}
              apiBaseUrl={apiBaseUrl}
              parentId={c.id}
              members={members}
              onCreated={() => { if (!showReplies) setShowReplies(true); loadReplies(); }}
            />
            {c._count.replies > 0 && (
              <button
                onClick={() => {
                  const next = !showReplies;
                  setShowReplies(next);
                  if (next && replies.length === 0) loadReplies();
                }}
                className="flex items-center gap-1.5 text-blue-600 text-xs font-medium hover:text-blue-700 hover:underline transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showReplies ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                </svg>
                {showReplies ? "Ẩn trả lời" : `Xem ${c._count.replies} trả lời`}
              </button>
            )}

            {/* Edit/Delete Actions */}
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="Sửa bình luận"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {canDelete && !isEditing && (
              <button
                onClick={handleDelete}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Xóa bình luận"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          {/* replies */}
          {showReplies && (
            <div className="mt-4 pl-6 border-l-2 border-blue-200 space-y-3">
              {loading && (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span>Đang tải trả lời...</span>
                </div>
              )}
              {replies.map(r => {
                const replyColorIndex = r.author.id.charCodeAt(0) % avatarColors.length;
                return (
                  <div key={r.id} className="flex items-start gap-3 py-2">
                    <div className={`h-8 w-8 rounded-full ${avatarColors[replyColorIndex]} flex items-center justify-center text-white text-sm font-semibold shadow-sm flex-shrink-0`}>
                      {(r.author.name || r.author.email)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{r.author.name || r.author.email}</span>
                        <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                      <div
                        className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-2 border border-gray-100"
                        dangerouslySetInnerHTML={{ __html: r.content }}
                      />
                      {r.attachments && r.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {r.attachments.map(att => (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              {att.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!loading && replies.length === 0) && (
                <div className="text-gray-400 text-sm py-2 italic">Chưa có trả lời</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function CommentForm({
  projectId,
  apiBaseUrl,
  members,
  onCreated
}: {
  projectId: string;
  apiBaseUrl: string;
  members: Member[];
  onCreated: () => void
}) {
  const [content, setContent] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setErr(null);

      const newAttachments: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

        const data = await res.json();
        newAttachments.push(data);
      }

      setAttachments(prev => [...prev, ...newAttachments]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      setErr(e.message || "Tải file thất bại");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.replace(/<[^>]*>/g, '').trim() && attachments.length === 0) return;

    try {
      setSubmitting(true);
      setErr(null);
      const res = await fetch(apiBaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mentions, attachments }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setContent("");
      setAttachments([]);
      onCreated();
    } catch (e: any) {
      setErr(e.message || "Gửi bình luận thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <MentionInput
        members={members}
        placeholder="Chia sẻ suy nghĩ của bạn..."
        value={content}
        onChange={(val, ids) => { setContent(val); setMentions(ids); }}
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all bg-white min-h-[100px]"
      />

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div key={att.id} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 text-sm border border-gray-200">
              <span className="text-gray-600 truncate max-w-[150px]">{att.name}</span>
              <button
                type="button"
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {err && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-700 text-sm">{err}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleUpload}
          />
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Đính kèm file"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
        </div>

        <button
          disabled={(!content.replace(/<[^>]*>/g, '').trim() && attachments.length === 0) || submitting || uploading}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Đang gửi...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Đăng bình luận</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ReplyForm({
  projectId,
  apiBaseUrl,
  parentId,
  members,
  onCreated,
}: { projectId: string; apiBaseUrl: string; parentId: string; members: Member[]; onCreated: () => void }) {
  const [content, setContent] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const newAttachments: Attachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          newAttachments.push(data);
        }
      }
      setAttachments(prev => [...prev, ...newAttachments]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    if (!content.replace(/<[^>]*>/g, '').trim() && attachments.length === 0) return;
    setSending(true);
    await fetch(apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId, mentions, attachments }),
    });
    setSending(false);
    setContent("");
    setAttachments([]);
    setIsOpen(false);
    onCreated();
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-gray-600 text-xs font-medium hover:text-blue-600 transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        Trả lời
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 mt-2 w-full">
      <MentionInput
        members={members}
        placeholder="Viết trả lời của bạn..."
        value={content}
        onChange={(val, ids) => { setContent(val); setMentions(ids); }}
        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 outline-none transition-all bg-white min-h-[40px]"
        autoFocus
        onEnter={send}
        onEscape={() => { setIsOpen(false); setContent(""); }}
      />

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 w-full">
          {attachments.map((att, idx) => (
            <div key={att.id} className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1 text-xs border border-gray-200">
              <span className="text-gray-600 truncate max-w-[120px]">{att.name}</span>
              <button
                type="button"
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex w-full items-center justify-between">
        <label className="cursor-pointer text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors">
          <input type="file" className="hidden" multiple onChange={handleUpload} ref={fileInputRef} />
          {uploading ? (
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </label>

        <div className="flex gap-2">
          <button
            onClick={() => { setIsOpen(false); setContent(""); setAttachments([]); }}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
            type="button"
          >
            Hủy
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow flex items-center gap-1.5"
            disabled={(!content.replace(/<[^>]*>/g, '').trim() && attachments.length === 0) || sending || uploading}
            onClick={send}
            type="button"
          >
            {sending ? "Đang gửi..." : "Gửi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Mention Input Component -------------------------------
function MentionInput({
  members,
  placeholder,
  value,
  onChange,
  className,
  autoFocus,
  onEnter,
  onEscape,
}: {
  members: Member[];
  placeholder?: string;
  value: string;
  onChange: (val: string, mentions: string[]) => void;
  className?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  onEscape?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showList, setShowList] = useState(false);
  const [query, setQuery] = useState("");
  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
    }
  }, [autoFocus]);

  // Sync value prop to innerHTML only when empty (reset) or initial
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      if (!value) ref.current.innerHTML = "";
    }
  }, [value]);

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const html = el.innerHTML; // contain raw HTML

    // Scan for mentions (data-id)
    const container = document.createElement("div");
    container.innerHTML = html;
    const ids: string[] = [];
    container.querySelectorAll('span[data-id]').forEach(span => {
      const id = span.getAttribute('data-id');
      if (id) ids.push(id);
    });

    onChange(html, ids);

    // Mention trigger logic
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const text = range.startContainer.textContent || "";
      const beforeCursor = text.slice(0, range.startOffset);

      const match = beforeCursor.match(/@(\w*)$/);
      if (match) {
        setQuery(match[1]);
        setShowList(true);
        const rect = range.getBoundingClientRect();
        // Calculate relative position to viewport, then simple absolute positioning could be handled by "fixed"
        setCursorPos({ top: rect.bottom, left: rect.left });
      } else {
        setShowList(false);
      }
    }
  }

  function insertMention(m: Member) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    // Delete the @query part
    const textNode = range.startContainer;
    const offset = range.startOffset;
    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || "";
      const match = text.slice(0, offset).match(/@(\w*)$/);
      if (match) {
        // Remove @query
        const start = offset - match[0].length;
        range.setStart(textNode, start);
        range.setEnd(textNode, offset);
        range.deleteContents();
      }
    }

    // Insert Span
    const span = document.createElement("span");
    span.className = "text-blue-600 font-bold";
    span.setAttribute("data-id", m.id);
    span.textContent = (m.name || m.email || "User").toUpperCase();
    span.contentEditable = "false";

    const space = document.createTextNode("\u00A0"); // nbsp

    range.insertNode(space);
    range.insertNode(span);

    // Move cursor after space
    range.setStartAfter(space);
    range.setEndAfter(space);
    sel.removeAllRanges();
    sel.addRange(range);

    setShowList(false);

    // Trigger input to update state
    if (ref.current) {
      handleInput({ currentTarget: ref.current } as any);
    }
  }

  const filtered = members.filter(m =>
    (m.name || "").toLowerCase().includes(query.toLowerCase()) ||
    (m.email || "").toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="relative w-full">
      <div
        ref={ref}
        contentEditable
        onInput={handleInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (showList && filtered.length > 0) {
              insertMention(filtered[0]);
            } else {
              onEnter?.();
            }
          }
          if (e.key === 'Escape') {
            if (showList) setShowList(false);
            else onEscape?.();
          }
        }}
        className={`${className} overflow-y-auto whitespace-pre-wrap outline-none`}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        role="textbox"
        style={{ minHeight: '60px' }}
      />
      {!value && (
        <div className="absolute top-3 left-4 text-gray-400 pointer-events-none select-none text-sm">
          {placeholder}
        </div>
      )}

      {showList && filtered.length > 0 && (
        <div
          className="fixed bg-white border border-gray-200 shadow-xl rounded-lg z-50 overflow-hidden min-w-[200px]"
          style={{ top: cursorPos.top + 5, left: cursorPos.left }}
        >
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => insertMention(m)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                {(m.name || m.email || "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 truncate">
                <div className="font-medium text-gray-900">{m.name || m.email}</div>
                <div className="text-xs text-gray-500">{m.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}