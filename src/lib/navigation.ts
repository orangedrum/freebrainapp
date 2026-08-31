/** Smoothly scrolls to a section by its element ID. */
export const scrollToSection = (sectionId: string): void => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
};

/** Opens a URL in a new tab with security best practices. */
export const openExternalLink = (url: string): void => {
  window.open(url, "_blank", "noopener,noreferrer");
};
