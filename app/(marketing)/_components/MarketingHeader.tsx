import { startDemo } from "@/app/demo/actions";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { BrandLogo } from "@/app/components/ui/BrandLogo";

export default function MarketingHeader() {
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <BrandLogo />

        <nav aria-label="Main navigation" className="flex items-center gap-3">
          <form action={startDemo}>
            <Button type="submit" variant="ghost" size="sm" className="hidden rounded-lg sm:inline-flex">Explore demo</Button>
          </form>
          <ButtonLink href="/login" variant="ghost" size="sm" className="hidden rounded-lg text-foreground sm:inline-flex">Sign in</ButtonLink>

          <ButtonLink href="/login" size="sm" className="rounded-lg">Start coaching</ButtonLink>
        </nav>
      </div>
    </header>
  );
}
