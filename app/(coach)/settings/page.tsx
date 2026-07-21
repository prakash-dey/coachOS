import ComingSoonPage from "@/app/(coach)/_components/ComingSoonPage";
import { SettingsIcon } from "@/app/components/ui/Icons";

export default function SettingsPage() {
  return (
    <ComingSoonPage
      eyebrow="Settings"
      title="Workspace settings are coming soon"
      description="This page will become the control room for your workspace preferences, profile, notification rules, and account configuration."
      icon={<SettingsIcon className="h-6 w-6" />}
      points={[
        "Workspace profile",
        "Notification preferences",
        "Security and access controls",
      ]}
    />
  );
}
