interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/** Reusable centered section heading with optional subtitle. */
export const SectionHeading = ({ title, subtitle, className = "" }: SectionHeadingProps) => (
  <div className={`text-center mb-16 md:mb-24 ${className}`}>
    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
        {subtitle}
      </p>
    )}
  </div>
);
