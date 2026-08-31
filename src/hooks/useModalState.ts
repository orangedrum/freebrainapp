import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ModalConfig, IconType } from "@/types";
import { EXTERNAL_LINKS } from "@/lib/constants";

/** Manages modal open/close state and content configuration. */
export const useModalState = () => {
  const { t } = useTranslation();

  const defaultModal: ModalConfig = {
    isOpen: false,
    title: "",
    description: "",
    icon: null,
    ctaText: t("modal.advisors.cta"),
    ctaLink: EXTERNAL_LINKS.calendly,
  };

  const [modalConfig, setModalConfig] = useState<ModalConfig>(defaultModal);

  const openModal = (
    title: string,
    description: string,
    icon: IconType,
    ctaText: string = t("modal.advisors.cta"),
    ctaLink: string = EXTERNAL_LINKS.calendly,
  ): void => {
    setModalConfig({
      isOpen: true,
      title,
      description,
      icon,
      ctaText,
      ctaLink,
    });
  };

  const closeModal = (): void => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  return { modalConfig, openModal, closeModal };
};
