"use client";

import { useId, useState } from "react";

import { Field, Input } from "@/app/components/ui/FormControls";
import { CheckIcon } from "@/app/components/ui/Icons";

export type PackageName = "basic" | "pro" | "custom";
export type PackageLimits = { workspaces: number; activeUsers: number; workoutTemplates: number; dietTemplates: number; photoDays: number };

export const packageLimits: Record<PackageName, PackageLimits> = {
  basic: { workspaces: 3, activeUsers: 50, workoutTemplates: 100, dietTemplates: 100, photoDays: 200 },
  pro: { workspaces: 10, activeUsers: 100, workoutTemplates: 200, dietTemplates: 200, photoDays: 360 },
  custom: { workspaces: 10, activeUsers: 100, workoutTemplates: 200, dietTemplates: 200, photoDays: 360 },
} as const;

const plans = [
  { id: "basic" as const, name: "Basic", description: "A focused start for independent coaches.", accent: "bg-surface-muted text-foreground", popular: false },
  { id: "pro" as const, name: "Pro", description: "More capacity for a growing coaching business.", accent: "bg-brand-strong text-white", popular: true },
  { id: "custom" as const, name: "Custom", description: "Tailored limits for established teams.", accent: "bg-violet-100 text-violet-900", popular: false },
];

export function PackagePicker({ initialPackage = "basic", initialLimits, value, onChange }: Readonly<{ initialPackage?: PackageName; initialLimits?: PackageLimits; value?: PackageName; onChange?: (packageName: PackageName) => void }>) {
  const [internalSelection, setInternalSelection] = useState<PackageName>(initialPackage);
  const selected = value ?? internalSelection;
  const fieldPrefix = useId();
  const defaults = initialLimits ?? packageLimits.custom;
  const choosePackage = (packageName: PackageName) => {
    setInternalSelection(packageName);
    onChange?.(packageName);
  };

  return <div>
    <input type="hidden" name="package" value={selected} />
    <div className="grid gap-3 md:grid-cols-3">
      {plans.map((plan) => {
        const active = selected === plan.id;
        const limits = packageLimits[plan.id];
        return <button key={plan.id} type="button" onClick={() => choosePackage(plan.id)} aria-pressed={active} className={`relative overflow-hidden rounded-2xl border p-5 text-left transition duration-200 ${active ? "border-brand ring-4 ring-brand/10 shadow-lg" : "border-border bg-surface hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-card"}`}>
          {plan.popular && <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-brand-strong">Popular</span>}
          <span className={`grid size-10 place-items-center rounded-xl text-sm font-black ${plan.accent}`}>{plan.name.charAt(0)}</span>
          <span className="mt-4 flex items-center gap-2 text-lg font-bold">{plan.name}{active && <CheckIcon className="size-4 text-brand" />}</span>
          <span className="mt-1 block min-h-10 text-xs leading-5 text-muted">{plan.description}</span>
          {plan.id !== "custom" && <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs text-muted"><li><strong className="text-foreground">{limits.workspaces}</strong> workspaces</li><li><strong className="text-foreground">{limits.activeUsers}</strong> active users / workspace</li><li><strong className="text-foreground">{limits.workoutTemplates}</strong> workout templates</li><li><strong className="text-foreground">{limits.dietTemplates}</strong> diet templates</li><li><strong className="text-foreground">{limits.photoDays} days</strong> photo retention</li></ul>}
          {plan.id === "custom" && <p className="mt-4 border-t border-border pt-4 text-xs font-semibold text-violet-800">Configure each allowance manually.</p>}
        </button>;
      })}
    </div>
    {selected === "custom" && <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/60 p-5"><p className="text-sm font-bold text-violet-900">Custom allowances</p><p className="mt-1 text-xs text-violet-700">These values apply immediately after approval or upgrade.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><LimitInput prefix={fieldPrefix} name="workspaceLimit" label="Workspaces" value={defaults.workspaces} max={100} /><LimitInput prefix={fieldPrefix} name="activeUserLimit" label="Active users / workspace" value={defaults.activeUsers} max={10000} /><LimitInput prefix={fieldPrefix} name="workoutTemplateLimit" label="Workout templates" value={defaults.workoutTemplates} max={10000} /><LimitInput prefix={fieldPrefix} name="dietTemplateLimit" label="Diet templates" value={defaults.dietTemplates} max={10000} /><LimitInput prefix={fieldPrefix} name="photoRetentionDays" label="Photo retention days" value={defaults.photoDays} max={3650} /></div></div>}
  </div>;
}

function LimitInput({ prefix, name, label, value, max }: Readonly<{ prefix: string; name: string; label: string; value: number; max: number }>) {
  const id = `${prefix}-${name}`;
  return <Field label={label} htmlFor={id}><Input id={id} name={name} type="number" min={1} max={max} required defaultValue={value} /></Field>;
}
