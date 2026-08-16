import { ClipboardCheckIcon } from "@/components/icons";
import { ComingSoon } from "@/components/ui/ComingSoon";

/** Placeholder — real check-ins review queue is Milestone 1+. */
export default function CheckInsInboxScreen() {
  return (
    <ComingSoon
      icon={<ClipboardCheckIcon size={24} />}
      eyebrow="Check-ins"
      title="Your review queue is coming soon"
      description="Pending and reviewed weekly check-ins will live here, matching the web app's Check-ins page."
    />
  );
}
