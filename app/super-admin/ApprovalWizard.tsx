"use client";

import { useState } from "react";

import { Button } from "@/app/components/ui/Button";
import { CheckIcon } from "@/app/components/ui/Icons";
import { approveCoach } from "./actions";
import { PackagePicker, packageLimits, type PackageName } from "./PackagePicker";

export function ApprovalWizard({ coachId, coachName, requestedAt }: Readonly<{ coachId: string; coachName: string; requestedAt: string }>) {
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState<PackageName>("basic");
  const approve = approveCoach.bind(null, coachId);

  return <form action={approve} className="overflow-hidden rounded-2xl border border-border bg-surface">
    <div className="flex items-center border-b border-border bg-surface-muted px-5 py-4">
      {["Review", "Package", "Confirm"].map((label, index) => {
        const number = index + 1; const complete = number < step; const active = number === step;
        return <div key={label} className="flex flex-1 items-center last:flex-none"><span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${complete || active ? "bg-brand text-white" : "bg-surface text-muted"}`}>{complete ? <CheckIcon className="size-3.5" /> : number}</span><span className={`ml-2 hidden text-xs font-bold sm:block ${active ? "text-foreground" : "text-muted"}`}>{label}</span>{index < 2 && <span className="mx-3 h-px flex-1 bg-border" />}</div>;
      })}
    </div>
    <div className="p-5 sm:p-6">
      {step === 1 && <div><p className="text-xs font-bold uppercase tracking-[.16em] text-warm">Step 1 · Application</p><h3 className="mt-2 text-2xl font-bold">Review coach details</h3><div className="mt-5 grid gap-3 rounded-2xl bg-surface-muted p-5 sm:grid-cols-2"><div><p className="text-xs text-muted">Coach</p><p className="mt-1 font-bold">{coachName}</p></div><div><p className="text-xs text-muted">Requested</p><p className="mt-1 font-bold">{new Date(requestedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p></div><div className="sm:col-span-2"><p className="text-xs text-muted">Account ID</p><p className="mt-1 break-all font-mono text-xs">{coachId}</p></div></div><div className="mt-6 flex justify-end"><Button type="button" onClick={() => setStep(2)}>Choose package →</Button></div></div>}
      {(step === 2 || step === 3) && <div className={step === 3 ? "hidden" : undefined}><p className="text-xs font-bold uppercase tracking-[.16em] text-warm">Step 2 · Package</p><h3 className="mt-2 text-2xl font-bold">Choose the right plan</h3><p className="mt-2 text-sm text-muted">Basic and Pro allowances are fixed. Select Custom only when this coach needs tailored capacity.</p><div className="mt-6"><PackagePicker value={selectedPackage} onChange={setSelectedPackage} /></div><div className="mt-6 flex justify-between gap-3"><Button type="button" variant="secondary" onClick={() => setStep(1)}>← Back</Button><Button type="button" onClick={() => setStep(3)}>Review approval →</Button></div></div>}
      {step === 3 && <div><p className="text-xs font-bold uppercase tracking-[.16em] text-warm">Step 3 · Confirmation</p><h3 className="mt-2 text-2xl font-bold">Ready to activate {coachName}?</h3><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Approval gives this coach immediate access to create workspaces and use the limits from the selected package. You can pause access or change the package later.</p><div className="mt-6 rounded-2xl border border-brand/20 bg-brand-soft p-5 text-brand-soft-text"><p className="text-xs font-bold uppercase tracking-[.14em] opacity-70">Selected package</p><p className="mt-1 text-xl font-bold capitalize">{selectedPackage}</p>{selectedPackage !== "custom" && <p className="mt-2 text-sm">{packageLimits[selectedPackage].workspaces} workspaces · {packageLimits[selectedPackage].activeUsers} active users per workspace · {packageLimits[selectedPackage].photoDays} days photo retention</p>}</div><div className="mt-6 flex justify-between gap-3"><Button type="button" variant="secondary" onClick={() => setStep(2)}>← Back</Button><Button type="submit" pendingLabel="Approving…">Approve coach</Button></div></div>}
    </div>
  </form>;
}
