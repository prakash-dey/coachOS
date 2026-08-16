import { DumbbellIcon } from "@/components/icons";
import { ComingSoon } from "@/components/ui/ComingSoon";

/** Placeholder — real workout/nutrition libraries (segmented control) are Milestone 1+. */
export default function PlansScreen() {
  return (
    <ComingSoon
      icon={<DumbbellIcon size={24} />}
      eyebrow="Plans"
      title="Your plan library is coming soon"
      description="Workout and nutrition plans will live here behind a segmented control, matching the web app's plan libraries."
    />
  );
}
