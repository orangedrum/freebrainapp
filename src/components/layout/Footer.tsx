import { useTranslation } from "react-i18next";
import { Instagram, Facebook } from "lucide-react";
import { LOGO_URL, FIREFLY_LOGO_URL, EXTERNAL_LINKS } from "@/lib/constants";
import { TikTokIcon } from "@/components/shared/TikTokIcon";

/** Site footer with brand info, social links, and incubator badge. */
export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-foreground/10 py-12 bg-background">
      <div className="container mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <img
              src={LOGO_URL}
              alt="FreeBrain Logo"
              className="h-6 w-auto object-contain rounded p-1 bg-sidebar-primary-foreground"
            />
            <span className="text-lg font-bold text-foreground">FreeBrain</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
          <div className="flex items-center gap-4 text-muted-foreground pt-2">
            <a
              href={EXTERNAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <Instagram className="h-5 w-5" />
              <span className="sr-only">Instagram</span>
            </a>
            <a
              href={EXTERNAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <Facebook className="h-5 w-5" />
              <span className="sr-only">Facebook</span>
            </a>
            <a
              href={EXTERNAL_LINKS.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <TikTokIcon className="h-5 w-5" />
              <span className="sr-only">TikTok</span>
            </a>
          </div>
          <div className="pt-4 mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              {t("footer.incubatorLabel")}
            </p>
            <img
              src={FIREFLY_LOGO_URL}
              alt="Firefly Innovations"
              className="h-8 w-auto object-contain rounded opacity-75"
            />
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-6 mt-12 pt-8 border-t border-foreground/10 text-sm text-muted-foreground text-center">
        {t("footer.copyright", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
};
