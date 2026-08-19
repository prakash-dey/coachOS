"use client";

import { useRef } from "react";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/FormControls";
import { createWorkspace, selectWorkspace } from "@/app/workspaces/actions";
import type { WorkspaceOption } from "@/lib/workspace-context";

export function WorkspaceSwitcher({ workspaces, selectedId, canCreate = false, inverse = false }: { workspaces: WorkspaceOption[]; selectedId: string; canCreate?: boolean; inverse?: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  return <div className="space-y-2">
    <form ref={formRef} action={selectWorkspace}>
      <label htmlFor={`workspace-${inverse ? "side" : "top"}`} className={inverse ? "text-[0.65rem] font-bold uppercase tracking-[.2em] text-white/45" : "sr-only"}>Workspace</label>
      <select id={`workspace-${inverse ? "side" : "top"}`} name="workspaceId" value={selectedId} onChange={() => formRef.current?.requestSubmit()} className={inverse ? "mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm font-bold text-white" : "min-h-10 max-w-52 rounded-lg border border-border bg-surface px-3 text-sm font-bold"}>
        {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id} className="text-foreground">{workspace.name} · {workspace.role === "coach" ? "Coach" : "Mentee"}</option>)}
      </select>
    </form>
    {canCreate && <details className={inverse ? "text-white/75" : "text-foreground"}><summary className="cursor-pointer text-xs font-bold">+ Create workspace</summary><form action={createWorkspace} className="mt-2 space-y-2"><Input name="workspaceName" required maxLength={120} placeholder="Workspace name" className={inverse ? "border-white/15 bg-white/10 text-white placeholder:text-white/40" : ""} /><Button type="submit" size="sm" className="w-full">Create</Button></form></details>}
  </div>;
}
