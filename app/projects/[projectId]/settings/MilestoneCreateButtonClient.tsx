"use client";

import { useState } from "react";
import MilestoneCreateModal from "@/app/components/MilestoneCreateModal";

export default function MilestoneCreateButtonClient({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 p-3 bg-yellow-50 hover:bg-yellow-100 rounded-xl transition"
        type="button"
      >
        + Milestone
      </button>

      <MilestoneCreateModal
        projectId={projectId}
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          // router.refresh() nếu cần trong tương lai (nếu dùng next/navigation)
        }}
      />
    </>
  );
}