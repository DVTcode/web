// app/components/InviteMemberModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Role = 'MANAGER' | 'LEAD' | 'MEMBER' | 'REVIEWER' | 'VIEWER';
type ProjectOption = { id: string; name: string; key?: string };
type UserItem = { id: string; name: string | null; email: string; image?: string | null };

export default function InviteMemberModal({
  open,
  onClose,
  onInvited,
  projectOptions = [],
  defaultProjectId,
  existingMemberIds = [],
}: {
  open: boolean;
  onClose: () => void;
  onInvited?: () => void;
  projectOptions?: ProjectOption[];
  defaultProjectId?: string;
  existingMemberIds?: string[]; // danh sách userId đã là thành viên
}) {
  // ---- state chính
  const [role, setRole] = useState<Role>('MEMBER');
  const [projectId, setProjectId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ---- state autocomplete
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserItem[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // mở modal -> reset
  useEffect(() => {
    if (open) {
      setRole('MEMBER');
      setErr(null);
      setProjectId(defaultProjectId || projectOptions[0]?.id || '');
      setQuery('');
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      setHighlight(-1);
      setSelectedUser(null);
    }
  }, [open, defaultProjectId, projectOptions]);

  // nhãn hiển thị dự án
  const projectLabel = (p: ProjectOption) => [p.key, p.name].filter(Boolean).join(' — ');

  // debounce tìm ứng viên
  useEffect(() => {
    const q = query.trim();
    if (!open || !projectId || q.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      setHighlight(-1);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSuggestLoading(true);
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const data = await res.json();
        const filtered = (data.items ?? []).filter(
          (u: UserItem) => !existingMemberIds.includes(u.id)
        );
        setSuggestions(filtered);
        setSuggestOpen(true);
        setHighlight(-1);
      } catch {
        setSuggestions([]);
        setSuggestOpen(false);
      } finally {
        setSuggestLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, projectId, open]);

  function pickSuggestion(u: UserItem) {
    setSelectedUser(u);
    setQuery(u.email);      // hiển thị email
    setSuggestOpen(false);
    setHighlight(-1);
  }

  async function handleInvite() {
    if (!projectId || !selectedUser) return;
    try {
      setSubmitting(true);
      setErr(null);
      const res = await fetch(`/api/projects/${projectId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, role }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      toast.success('Đã gửi lời mời thành công');
      onInvited?.();
      onClose();
    } catch (e: any) {
      const errorMsg = e.message || 'Mời thất bại';
      setErr(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="text-gray-900 fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl">
        {/* header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <span className="text-lg font-semibold">Mời thành viên</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* body */}
        <div className="p-5 space-y-4">
          {/* Dự án (ẩn nếu chỉ có 1 lựa chọn) */}
          {projectOptions.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dự án</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {projectOptions.length === 0 && <option value="">(Không có dự án)</option>}
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>{projectLabel(p)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Email / tìm người dùng */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">UserName</label>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedUser(null); }}
              onFocus={() => { if (suggestions.length) setSuggestOpen(true); }}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              onKeyDown={(e) => {
                if (!suggestOpen || !suggestions.length) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
                if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); pickSuggestion(suggestions[highlight]); }
              }}
              placeholder="Tìm theo tên hoặc email"
              className="w-full border rounded-lg px-3 py-2"
              type="email"
            />

            {/* dropdown gợi ý */}
            {suggestOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                {suggestLoading && (
                  <div className="px-3 py-2 text-sm text-gray-500">Đang tìm…</div>
                )}
                {!suggestLoading && suggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">Không thấy người phù hợp</div>
                )}
                {suggestions.map((u, idx) => (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(u)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 ${idx === highlight ? 'bg-gray-50' : ''}`}
                  >
                    <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                      {(u.name?.[0] || u.email[0]).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">{u.name || u.email}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vai trò */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="MANAGER">Manager</option>
              <option value="LEAD">Lead</option>
              <option value="MEMBER">Member</option>
              <option value="REVIEWER">Reviewer</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>

          {err && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">Hủy</button>
          <button
            onClick={handleInvite}
            disabled={!projectId || !selectedUser || submitting}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60"
          >
            {submitting ? 'Đang gửi…' : 'Gửi lời mời'}
          </button>
        </div>
      </div>
    </div>
  );
}
