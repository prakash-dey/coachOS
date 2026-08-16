import { DumbbellIcon } from "@/components/icons";
import { ComingSoon } from "@/components/ui/ComingSoon";

/** Placeholder — real day/exercise viewer is Milestone 1+. */
export default function ClientWorkoutScreen() {
  return (
    <ComingSoon
      icon={<DumbbellIcon size={24} />}
      eyebrow="Training"
      title="Your workout is coming soon"
      description="Day-by-day exercises with sets, reps, and complete-tracking will live here, matching the web app's Workout page."
    />
  );
}
