"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { CheckIcon, Icon, PlusIcon } from "@/app/components/ui/Icons";
import { selectWorkspace } from "@/app/workspaces/actions";
import type { WorkspaceOption } from "@/lib/workspace-context";

type WorkspaceSwitcherProps = Readonly<{
  workspaces: WorkspaceOption[];
  selectedId: string;
  canCreate?: boolean;
  inverse?: boolean;
}>;

function WorkspaceMark({ name }: Readonly<{ name: string }>) {
  return <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-strong text-sm font-bold uppercase text-white shadow-sm">{name.trim().charAt(0) || "W"}</span>;
}

export function WorkspaceSwitcher({ workspaces, selectedId, canCreate = false, inverse = false }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = workspaces.find((workspace) => workspace.id === selectedId) ?? workspaces[0];

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!selected) return null;

  return <div ref={rootRef} className={`relative min-w-0 ${inverse ? "w-full" : "w-56"}`}>
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls={menuId} aria-haspopup="menu" className={`group flex min-h-12 w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition ${inverse ? "border-white/10 bg-white/[0.07] text-white hover:border-white/20 hover:bg-white/[0.12]" : "border-border bg-surface text-foreground shadow-sm hover:border-brand/30 hover:bg-surface-muted"}`}>
      <WorkspaceMark name={selected.name} />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{selected.name}</span><span className={`block text-[11px] font-medium ${inverse ? "text-white/45" : "text-muted"}`}>{selected.role === "coach" ? "Coach workspace" : "Mentee workspace"}</span></span>
      <Icon className={`size-4 shrink-0 transition-transform ${inverse ? "text-white/45" : "text-muted"} ${open ? "rotate-180" : ""}`}><path d="m7 10 5 5 5-5" /></Icon>
    </button>

    {open && <div id={menuId} role="menu" aria-label="Choose a workspace" className="absolute left-0 z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-surface p-2 text-foreground shadow-[0_20px_60px_rgba(30,22,60,0.22)]">
      <div className="px-2 pb-2 pt-1"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Your workspaces</p></div>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {workspaces.map((workspace) => {
          const active = workspace.id === selected.id;
          return <form key={workspace.id} action={selectWorkspace}>
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <button type="submit" role="menuitem" disabled={active} className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${active ? "bg-brand-soft" : "hover:bg-surface-muted"}`}>
              <WorkspaceMark name={workspace.name} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{workspace.name}</span><span className="block text-xs text-muted">{workspace.role === "coach" ? "Coach" : "Mentee"}</span></span>
              {active && <CheckIcon className="size-4 shrink-0 text-brand" />}
            </button>
          </form>;
        })}
      </div>
      {canCreate && <div className="mt-2 border-t border-border pt-2"><Link href="/workspaces/new" role="menuitem" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-foreground transition hover:bg-surface-muted"><span className="grid size-9 place-items-center rounded-lg border border-dashed border-brand/40 bg-brand-soft text-brand"><PlusIcon className="size-4" /></span><span>Create another workspace</span></Link></div>}
    </div>}
  </div>;
}
