import { cn } from "./cn";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-green-200 bg-green-50 text-green-800",
  info: "border-border bg-surface text-muted",
};

export function Alert({ children, tone = "info", className }: Readonly<{ children: React.ReactNode; tone?: Tone; className?: string }>) {
  return <p role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border p-3 text-sm", tones[tone], className)}>{children}</p>;
}

export function EmptyState({ title, description, action, className }: Readonly<{ title: string; description: string; action?: React.ReactNode; className?: string }>) {
  return (
    <div className={cn("rounded-[2rem] border border-dashed border-brand/30 bg-surface p-10 text-center", className)}>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
