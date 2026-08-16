import { UsersIcon } from "@/components/icons";
import { ComingSoon } from "@/components/ui/ComingSoon";

/** Placeholder — real client detail (Overview/Check-ins/Plans/Photos) is Milestone 1+. */
export default function ClientDetailScreen() {
  return (
    <ComingSoon
      icon={<UsersIcon size={24} />}
      eyebrow="Client"
      title="Client detail is coming soon"
      description="Overview, check-in history, active plans, and photos will live here, matching the web app's client page."
    />
  );
}
