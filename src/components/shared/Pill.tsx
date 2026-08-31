interface PillProps {
  children: React.ReactNode;
}

/** Section badge/pill with brand accent border. */
export const Pill = ({ children }: PillProps) => (
  <div className="inline-flex items-center rounded-full border border-brand-accent bg-foreground/10 px-3 py-1 text-sm font-medium text-foreground">
    {children}
  </div>
);
