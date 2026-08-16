import { UsersIcon } from "@/components/icons";
import { ComingSoon } from "@/components/ui/ComingSoon";

/** Placeholder — real roster (search, filters, status dots) is Milestone 1+. */
export default function ClientsListScreen() {
  return (
    <ComingSoon
      icon={<UsersIcon size={24} />}
      eyebrow="Clients"
      title="Your client roster is coming soon"
      description="This will list every active, paused, and archived client with search and status filters, matching the web app's Clients page."
    />
  );
}
