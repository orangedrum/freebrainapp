/** Smoothly scrolls to a section by its element ID. */
export const scrollToSection = (sectionId: string): void => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
};

/** Opens a URL in the current tab (preserves PWA session under Screen Time). */
export const openExternalLink = (url: string): void => {
  window.location.href = url;
};
