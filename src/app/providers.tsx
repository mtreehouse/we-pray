"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { APP_DARK_MODE_CHANGE_EVENT, APP_DARK_MODE_STORAGE_KEY } from "@/lib/ui-settings";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    function applyAppDarkMode() {
      try {
        const enabled = window.localStorage.getItem(APP_DARK_MODE_STORAGE_KEY) === "true";
        document.documentElement.classList.toggle("dark", enabled);
      } catch {
        document.documentElement.classList.remove("dark");
      }
    }

    applyAppDarkMode();
    window.addEventListener("storage", applyAppDarkMode);
    window.addEventListener(APP_DARK_MODE_CHANGE_EVENT, applyAppDarkMode);

    return () => {
      window.removeEventListener("storage", applyAppDarkMode);
      window.removeEventListener(APP_DARK_MODE_CHANGE_EVENT, applyAppDarkMode);
    };
  }, []);

  return <SessionProvider>{children}<PwaInstallPrompt /></SessionProvider>;
}
