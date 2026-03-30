//apps\web\app\components\ProjectCreateModal.tsx
"use client";
import React, { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (project: { id: string }) => void;
};

export default function ProjectCreateModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // auto gợi ý KEY từ name (lấy chữ cái đầu, viết HOA)
  useEffect(() => {
    if (!name) return;
    const words = name.trim().split(/\s+/);
    const suggestion =
      (words.length === 1
        ? words[0].slice(0, 4)
        : words.map(w => w[0]).join("")
      )
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, "");
    if (!key) setKey(suggestion);
  }, [name]); // chỉ gợi ý khi key đang rỗng

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedKey = key.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!name.trim()) return setError("Vui lòng nhập tên dự án");
    if (!trimmedKey || trimmedKey.length < 2) return setError("KEY tối thiểu 2 ký tự (A–Z, 0–9, -)");

    try {
      setLoading(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), key: trimmedKey, description }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Tạo dự án thất bại (${res.status})`);
      }
      const project = await res.json();
      onCreated(project); // chuyển hướng ở nơi gọi
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl bg-white shadow-xl border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Tạo dự án mới</h3>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Tên dự án</label>
              <input
                className="text-gray-900 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ví dụ: Website Bán Hàng"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-gray-900 block text-sm font-medium mb-1">KEY (mã dự án)</label>
              <input
                className="text-gray-900 w-full rounded-lg border px-3 py-2 uppercase tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VD: SHOP, CRM, ITPM"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-gray-500 mt-1">
                Chỉ dùng A–Z, 0–9, dấu gạch ngang. Dùng để đánh số task: <b>{key || "KEY"}-101</b>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Mô tả (tuỳ chọn)</label>
              <textarea
                rows={3}
                className="text-gray-900 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mục tiêu, phạm vi, stakeholder..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-900 px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Tạo dự án
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
