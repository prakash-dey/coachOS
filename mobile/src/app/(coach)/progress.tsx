import { TrendingUpIcon } from "@/components/icons";
import { ComingSoon } from "@/components/ui/ComingSoon";

/** Placeholder — real progress map (per-client sparkline cards) is Milestone 1+. */
export default function ProgressScreen() {
  return (
    <ComingSoon
      icon={<TrendingUpIcon size={24} />}
      eyebrow="Progress map"
      title="Every journey, at a glance — coming soon"
      description="Each client's energy trend and weight journey will render here, matching the web app's Progress page."
    />
  );
}
