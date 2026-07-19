import { startDemo } from "@/app/demo/actions";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { BrandLink } from "@/app/components/ui/Brand";

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <BrandLink />

        <nav aria-label="Main navigation" className="flex items-center gap-3">
          <div className="hidden sm:block"><form action={startDemo}>
            <Button type="submit" variant="ghost" size="sm">Explore demo</Button>
          </form></div>
          <span className="hidden sm:inline-flex"><ButtonLink href="/login" variant="ghost" size="sm" className="text-foreground">Sign in</ButtonLink></span>

          <ButtonLink href="/login" size="sm" title="Start coaching"><span className="sm:hidden">Get started</span><span className="hidden sm:inline">Start coaching</span></ButtonLink>
        </nav>
      </div>
    </header>
  );
}
