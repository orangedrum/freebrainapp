import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LOGO_URL, EXTERNAL_LINKS } from "@/lib/constants";
import { scrollToSection, openExternalLink } from "@/lib/navigation";

/** Sticky site navigation header with logo, community link, and CTA. */
export const Header = () => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <img
            src={LOGO_URL}
            alt="FreeBrain Logo"
            className="h-8 w-auto rounded p-1 object-cover bg-sidebar-primary-foreground"
          />
          <span className="text-xl font-bold text-foreground">FreeBrain</span>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="hidden md:inline-flex text-foreground hover:bg-foreground/10 hover:text-foreground"
            onClick={() => openExternalLink(EXTERNAL_LINKS.whatsapp)}
          >
            {t("header.joinCommunity")}
          </Button>
          <Button
            className="bg-primary text-brand hover:bg-primary/90 transition-opacity border-0"
            onClick={() => scrollToSection("get-involved")}
          >
            {t("header.getInvolved")}
          </Button>
        </div>
      </div>
    </header>
  );
};
