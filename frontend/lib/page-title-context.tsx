"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react";
import { LucideIcon } from "lucide-react";

interface PageTitleContextType {
  title: string;
  icon?: LucideIcon;
  setPageTitle: (title: string, icon?: LucideIcon) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(
  undefined
);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ title: string; icon?: LucideIcon }>({
    title: "",
  });

  const setPageTitle = useCallback((title: string, icon?: LucideIcon) => {
    setState({ title, icon });
  }, []);

  return (
    <PageTitleContext.Provider
      value={{
        title: state.title,
        icon: state.icon,
        setPageTitle,
      }}
    >
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  const context = useContext(PageTitleContext);
  if (context === undefined) {
    throw new Error("usePageTitle must be used within a PageTitleProvider");
  }
  return context;
}
