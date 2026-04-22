import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  CalendarRange,
  CalendarDays,
  Users,
  User,
  UserCircle,
  BarChart3,
  Menu,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendário", icon: CalendarIcon },
  { href: "/escala-semanal", label: "Escala Semanal", icon: CalendarDays },
  { href: "/escala-mensal", label: "Escala Mensal", icon: CalendarRange },
  { href: "/duplas", label: "Duplas", icon: Users },
  { href: "/membros", label: "Membros", icon: User },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

const SETTINGS_ITEM = { href: "/configuracoes", label: "Configurações", icon: Settings };

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [appLogo, setAppLogo] = useState<string | null>(null);

  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetch("/api/settings", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: Record<string, string> | null) => {
        if (data?.["company_name"]) setCompanyName(data["company_name"]);
        if (data?.["app_logo"]) {
          setAppLogo(data["app_logo"]);
          const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
          if (link) link.href = data["app_logo"];
        }
      })
      .catch(() => {});
  }, []);

  const visibleNavItems = NAV_ITEMS.filter((item) => hasPermission(item.href));
  const showSettings = user?.role === "admin";
  const allItems = showSettings ? [...visibleNavItems, SETTINGS_ITEM] : visibleNavItems;

  const displayName = companyName ?? "ProTeam";

  async function handleLogout() {
    try {
      await logout();
    } catch {
      toast.error("Erro ao sair");
    }
  }

  function NavLink({ item, onClick }: { item: (typeof allItems)[number]; onClick?: () => void }) {
    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
    const Icon = item.icon;
    return (
      <Link href={item.href}>
        <div
          title={collapsed ? item.label : undefined}
          className={`flex items-center py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-colors ${
            collapsed ? "justify-center px-2" : "px-3"
          } ${
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
          onClick={onClick}
        >
          <Icon className={`h-5 w-5 flex-shrink-0 ${collapsed ? "" : "mr-3"} ${isActive ? "text-primary-foreground" : "text-sidebar-foreground"}`} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </div>
      </Link>
    );
  }

  const MobileNavLinks = () => (
    <>
      <div className="px-4 py-6 flex items-center gap-3">
        {appLogo ? (
          <img src={appLogo} alt={displayName} className="h-9 w-9 object-contain rounded-lg flex-shrink-0" />
        ) : (
          <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-black text-primary select-none">{displayName.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        <div>
          <h2 className="text-base font-bold tracking-tight text-primary leading-tight">{displayName}</h2>
          <p className="text-xs text-muted-foreground font-mono leading-tight">Control Room v1.0</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-2 overflow-y-auto">
        {allItems.map((item) => (
          <NavLink key={item.href} item={item} onClick={() => setMobileMenuOpen(false)} />
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border mt-auto space-y-3">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <UserCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-sidebar-foreground">{user?.displayName ?? "Usuário"}</p>
              <p className="text-xs text-muted-foreground font-mono">@{user?.username}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border flex flex-col">
          <MobileNavLinks />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col bg-sidebar border-r border-sidebar-border shadow-2xl z-10 transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className={`py-5 overflow-hidden flex items-center ${collapsed ? "px-2 justify-center" : "px-4 gap-3"}`}>
          {appLogo ? (
            <img src={appLogo} alt={displayName} className={`object-contain rounded-lg flex-shrink-0 ${collapsed ? "h-8 w-8" : "h-9 w-9"}`} />
          ) : (
            <div className={`rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 ${collapsed ? "h-8 w-8" : "h-9 w-9"}`}>
              <span className="text-xs font-black text-primary select-none">{displayName.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          {!collapsed && (
            <div className="overflow-hidden">
              <h2 className="text-base font-bold tracking-tight text-primary whitespace-nowrap truncate leading-tight">{displayName}</h2>
              <p className="text-xs text-muted-foreground font-mono leading-tight">Control Room v1.0</p>
            </div>
          )}
        </div>

        {/* Nav items + Collapse button */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          <nav className="space-y-1 px-2">
            {allItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          {/* Theme toggle + Collapse button */}
          <div className="px-2 pt-1 space-y-0.5">
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              className={`w-full flex items-center py-2.5 rounded-xl text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${
                collapsed ? "justify-center px-2" : "px-3 gap-2"
              }`}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>Modo claro</span>}
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>Modo escuro</span>}
                </>
              )}
            </button>
            <button
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
              className={`w-full flex items-center py-2.5 rounded-xl text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${
                collapsed ? "justify-center px-2" : "px-3 gap-2"
              }`}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Recolher menu</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* User info at the bottom */}
        <div className="border-t border-sidebar-border">
          {!collapsed ? (
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.displayName ?? "Usuário"}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">@{user?.username}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground flex-shrink-0"
                onClick={handleLogout}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-3 gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
              <button
                onClick={handleLogout}
                title="Sair"
                className="text-muted-foreground hover:text-sidebar-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-0 overflow-hidden relative">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-card-border shadow-sm z-10">
          <h1 className="text-lg font-bold text-foreground">{displayName}</h1>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
