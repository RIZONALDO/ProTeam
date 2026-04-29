import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface AppSettings {
  company_name: string;
  system_name: string;
  app_logo: string;
  logo_principal: string;
  logo_icone: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
}

interface SettingsContextValue {
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
}

const DEFAULT: AppSettings = {
  company_name: "ProTeam",
  system_name: "ProTeam",
  app_logo: "",
  logo_principal: "",
  logo_icone: "",
  favicon_url: "",
  primary_color: "#f59e0b",
  secondary_color: "#1e293b",
  footer_text: "",
};

function hexToHsl(hex: string): string | null {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyColors(primary: string, secondary: string) {
  const root = document.documentElement;
  const p = hexToHsl(primary);
  const s = hexToHsl(secondary);
  if (p) {
    root.style.setProperty("--primary", p);
    root.style.setProperty("--sidebar-primary", p);
    root.style.setProperty("--ring", p);
  }
  if (s) {
    root.style.setProperty("--secondary", s);
    root.style.setProperty("--sidebar", s);
  }
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT,
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (!res.ok) return;
      const data: Record<string, string> = await res.json();
      const next: AppSettings = {
        company_name: data["company_name"] || DEFAULT.company_name,
        system_name: data["system_name"] || DEFAULT.system_name,
        app_logo: data["app_logo"] || "",
        logo_principal: data["logo_principal"] || "",
        logo_icone: data["logo_icone"] || data["app_logo"] || "",
        favicon_url: data["favicon_url"] || "",
        primary_color: data["primary_color"] || DEFAULT.primary_color,
        secondary_color: data["secondary_color"] || DEFAULT.secondary_color,
        footer_text: data["footer_text"] || "",
      };
      setSettings(next);
      applyColors(next.primary_color, next.secondary_color);
      const faviconHref = next.favicon_url || next.app_logo;
      if (faviconHref) {
        const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (link) link.href = faviconHref;
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
