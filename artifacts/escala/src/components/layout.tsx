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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendário", icon: CalendarIcon },
  { href: "/escala-semanal", label: "Escala Semanal", icon: CalendarDays },
  { href: "/escala-mensal", label: "Escala Mensal", icon: CalendarRange },
  { href: "/duplas", label: "Duplas", icon: Users },
  { href: "/membros", label: "Membros", icon: User },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const MobileNavLinks = () => (
    <>
      <div className="px-4 py-6">
        <h2 className="text-xl font-bold tracking-tight text-primary">Plataforma de Escala</h2>
        <p className="text-sm text-muted-foreground mt-1 font-mono">Control Room v1.0</p>
      </div>
      <nav className="flex-1 space-y-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-primary-foreground" : "text-sidebar-foreground"}`} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-sidebar-foreground">Admin User</p>
            <p className="text-xs text-muted-foreground font-mono">admin@escala</p>
          </div>
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
        <div className={`px-4 py-6 overflow-hidden ${collapsed ? "px-2 flex justify-center" : ""}`}>
          {collapsed ? (
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold tracking-tight text-primary whitespace-nowrap">Plataforma de Escala</h2>
              <p className="text-sm text-muted-foreground mt-1 font-mono">Control Room v1.0</p>
            </>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-2 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-colors ${
                    collapsed ? "justify-center px-2" : "px-3"
                  } ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${collapsed ? "" : "mr-3"} ${isActive ? "text-primary-foreground" : "text-sidebar-foreground"}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User + Collapse button */}
        <div className="mt-auto">
          {/* User info */}
          {!collapsed && (
            <div className="px-4 py-3 flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-sidebar-foreground truncate">Admin User</p>
                <p className="text-xs text-muted-foreground font-mono truncate">admin@escala</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center py-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
            </div>
          )}

          {/* Divider + Collapse button */}
          <div className="border-t border-sidebar-border">
            <button
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
              className={`w-full flex items-center py-3 text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${
                collapsed ? "justify-center px-2" : "px-4 gap-2"
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-0 overflow-hidden relative">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-card-border shadow-sm z-10">
          <h1 className="text-lg font-bold text-foreground">Plataforma de Escala</h1>
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
