import MarketingHeader from "./_components/MarketingHeader";
import HeroSection from "./_components/HeroSection";
import BenefitsSection from "./_components/BenefitsSection";
export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main className="flex-1">
        <HeroSection />
        <BenefitsSection/>
      </main>
    </>
  );
}
