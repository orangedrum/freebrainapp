import { useTranslation } from "react-i18next";
import type { ModalConfig } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ModalProps {
  config: ModalConfig;
  onOpenChange: (open: boolean) => void;
}

/** Reusable modal dialog with icon, title, description, and CTA buttons. */
export const Modal = ({ config, onOpenChange }: ModalProps) => {
  const { t } = useTranslation();
  const Icon = config.icon;

  return (
    <Dialog open={config.isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-brand border-foreground/20 text-foreground">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-foreground/10 mb-4">
            {Icon && <Icon className="h-6 w-6 text-foreground" />}
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-foreground">
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-center text-foreground/80 pt-2 whitespace-pre-line">
            {config.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-6">
          <Button asChild className="w-full bg-primary text-brand hover:bg-primary/90 border-0">
            <a href={config.ctaLink} target="_blank" rel="noopener noreferrer">
              {config.ctaText}
            </a>
          </Button>
          <Button
            variant="outline"
            className="w-full border-foreground/20 text-foreground hover:bg-foreground/10 bg-transparent"
            onClick={() => onOpenChange(false)}
          >
            {t("modal.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
