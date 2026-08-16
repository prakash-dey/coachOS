import { BellIcon } from "@/components/icons";
import { ComingSoon } from "@/components/ui/ComingSoon";

/**
 * Placeholder — matches `app/(coach)/notifications/page.tsx` on web, which
 * is itself a static "coming soon" placeholder today. The full in-app
 * center + per-channel (push/email/WhatsApp) settings already exist as a
 * design spec; building them needs new backend tables first (Milestone 1+).
 */
export default function NotificationSettingsScreen() {
  return (
    <ComingSoon
      icon={<BellIcon size={24} />}
      eyebrow="Notifications"
      title="Notifications are coming soon"
      description="This will collect check-ins, client activity, and plan updates, with push, email, and WhatsApp delivery options."
    />
  );
}
