/**
 * CommunityHeader — Header for the Community Wall page.
 * Contains title, subtitle, filter tabs, and "Share Update" button.
 * Fully i18n via `community` namespace.
 */
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, LayoutPanelTop } from "lucide-react";

interface CommunityHeaderProps {
  onNewPost: () => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

export function CommunityHeader({ onNewPost, activeFilter, setActiveFilter }: CommunityHeaderProps) {
  const { t } = useTranslation();

  const filters = [
    { id: "all", label: t("community.filterAll") },
    { id: "sos", label: t("community.filterSos") },
    { id: "recommendations", label: t("community.filterRecommendations") },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
          <LayoutPanelTop className="h-7 w-7 text-primary" />
          {t("community.wallTitle")}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t("community.wallSubtitle")}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="bg-card/50 p-1 rounded-lg border border-white/10 flex gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors ${
                activeFilter === f.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Button onClick={onNewPost} className="gap-2 font-semibold shadow-md">
          <MessageSquarePlus className="h-4 w-4" />
          {t("community.shareUpdate")}
        </Button>
      </div>
    </div>
  );
}
