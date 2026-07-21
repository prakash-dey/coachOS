import ComingSoonPage from "@/app/(coach)/_components/ComingSoonPage";
import { BellIcon } from "@/app/components/ui/Icons";

export default function NotificationsPage() {
  return (
    <ComingSoonPage
      eyebrow="Notifications"
      title="Notifications are coming soon"
      description="This space will collect important coaching events so you can review client activity without hunting through every page."
      icon={<BellIcon className="h-6 w-6" />}
      points={[
        "New weekly check-ins",
        "Client onboarding submissions",
        "Plan assignment updates",
      ]}
    />
  );
}
