/**
 * BrainLoverEmptyStateContext — proper React context to communicate
 * from BrainLoverDashboard to DashboardLayout that the empty state
 * is active (no FreeBrainers connected). DashboardLayout hides the
 * bottom nav when this is true.
 */
import { createContext, useContext, useState, type ReactNode } from "react";

interface EmptyStateContextValue {
  isEmpty: boolean;
  setEmpty: (v: boolean) => void;
}

const Ctx = createContext<EmptyStateContextValue>({
  isEmpty: false,
  setEmpty: () => {},
});

export function BrainLoverEmptyStateProvider({ children }: { children: ReactNode }) {
  const [isEmpty, setIsEmpty] = useState(false);
  return (
    <Ctx.Provider value={{ isEmpty, setEmpty: setIsEmpty }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBrainLoverEmptyState() {
  return useContext(Ctx);
}
