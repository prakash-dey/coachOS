import { SettingsIcon } from "@/components/icons";
import { ComingSoon } from "@/components/ui/ComingSoon";

/** Placeholder — real workspace settings is Milestone 1+. */
export default function WorkspaceSettingsScreen() {
  return (
    <ComingSoon
      icon={<SettingsIcon size={24} />}
      eyebrow="Workspace"
      title="Workspace settings are coming soon"
      description="Business name and workspace-level preferences will be editable here, matching the web app's Settings page."
    />
  );
}
