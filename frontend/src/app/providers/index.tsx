import type { ReactNode } from "react";

import QueryProvider from "./QueryProvider";
import ToastProvider from "./ToastProvider";

interface AppProviderProps {
  children: ReactNode;
}

function AppProvider({ children }: AppProviderProps) {
  return (
    <QueryProvider>
      {children}
      <ToastProvider />
    </QueryProvider>
  );
}

export default AppProvider;