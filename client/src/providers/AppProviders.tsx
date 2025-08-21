import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LocaleProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <LocaleProvider>
          <Router>
            {children}
            <Toaster />
          </Router>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}