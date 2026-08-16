import { LeafIcon } from "@/components/icons";
import { ComingSoon } from "@/components/ui/ComingSoon";

/** Placeholder — real meal/macro viewer is Milestone 1+. */
export default function ClientNutritionScreen() {
  return (
    <ComingSoon
      icon={<LeafIcon size={24} />}
      eyebrow="Nutrition"
      title="Your nutrition plan is coming soon"
      description="Macro targets, meals, and food alternatives will live here, matching the web app's Nutrition page."
    />
  );
}
