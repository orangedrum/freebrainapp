interface GridBackgroundProps {
  /** Opacity of the grid lines (default: 0.12 → 12%). */
  lineOpacity?: number;
  /** Blur glow opacity (default: 0.20 → 20%). */
  glowOpacity?: number;
  className?: string;
}

/** Reusable decorative grid background with a centered glow, used by hero and section banners. */
export const GridBackground = ({
  lineOpacity = 0.12,
  glowOpacity = 0.2,
  className = "",
}: GridBackgroundProps) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className={`absolute inset-0 ${className}`}
      style={{
        backgroundImage: `linear-gradient(to right, hsl(var(--foreground) / ${lineOpacity}) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / ${lineOpacity}) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    />
    <div
      className="absolute left-0 right-0 top-0 m-auto h-[310px] w-[310px] rounded-full bg-foreground blur-[100px]"
      style={{ opacity: glowOpacity }}
    />
  </div>
);
