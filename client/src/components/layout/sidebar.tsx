import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  Clock,
  BarChart3,
  Settings,
  Building2,
  LogOut,
  Wallet,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Attendance", href: "/attendance", icon: Clock },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Payments", href: "/payments", icon: Wallet },
  { name: "Contact & Support", href: "/contact", icon: Settings },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border shadow-lg bg-gradient-to-b from-indigo-50 to-slate-50 dark:from-slate-900 dark:to-slate-950">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 p-6 border-b border-border">
          <BrandLogo size={50} />
          <div>
            <h2 className="font-semibold text-foreground">AttendanceHub</h2>
            <p className="text-sm text-muted-foreground">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            // Per-item icon palette
            const palette: Record<string, string> = {
              Dashboard: "text-indigo-600",
              Employees: "text-emerald-600",
              Attendance: "text-sky-600",
              Reports: "text-violet-600",
              Payments: "text-amber-600",
              "Contact & Support": "text-rose-600",
              Settings: "text-slate-600",
            };
            const iconColor = isActive ? "text-white" : (palette[item.name] || "text-indigo-600");

            return (
              <Link key={item.name} href={item.href}>
                <div
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  <Icon className={`w-5 h-5 opacity-90 ${iconColor} transition-transform group-hover:scale-105`} />
                  <span className="font-medium">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-indigo-50/60 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700">
            <BrandLogo size={45} />
            <div className="flex items-center flex-col justfy-center">
              <div className="min-w-0">
                {/* <p className="text-sm font-medium text-foreground truncate">
                {user?.full_name || "Admin"}
              </p> */}

                <p className="text-sm text-muted-foreground">Administrator</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                data-testid="button-logout"
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
              >
                Logout <LogOut className="h-4 w-4" />
              </Button>
              <p className="mt-2 text-[11px] text-muted-foreground">© 2025 WiCon Ltd</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
