import { ClipboardCheckIcon } from "@/components/icons";
import { ComingSoon } from "@/components/ui/ComingSoon";

/** Placeholder — real check-in submission form (incl. photo upload) is Milestone 1+. */
export default function ClientCheckInsScreen() {
  return (
    <ComingSoon
      icon={<ClipboardCheckIcon size={24} />}
      eyebrow="Check-ins"
      title="Weekly check-ins are coming soon"
      description="Energy, mood, weight, and progress photos will be submitted here, matching the web app's check-in form."
    />
  );
}
