import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Calculator, 
  BarChart, 
  Shield, 
  Settings, 
  LogOut,
  Home,
  Clock,
  Gift
} from "lucide-react";

const navigationItems = [
  { name: "Πίνακας Ελέγχου", href: "/", icon: Home },
  { name: "Εργαζόμενοι", href: "/employees", icon: Users },
  { name: "Μισθοδοσία", href: "/payroll", icon: Calculator },
  { name: "Ωράρια", href: "/schedules", icon: Clock },
  { name: "Επιδόματα", href: "/allowances", icon: Gift },
  { name: "Υπερωρίες", href: "/overtime", icon: Clock },
  { name: "Αναφορές", href: "/reports", icon: BarChart },
  { name: "Συμμόρφωση", href: "/compliance", icon: Shield },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "ΧΡ";
    return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase();
  };

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-neutral-200 fixed h-full z-10">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center">
          <div className="bg-primary text-white w-10 h-10 rounded-lg flex items-center justify-center mr-3">
            <Users size={20} />
          </div>
          <h1 className="text-xl font-bold text-neutral-900">PayrollSync</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6">
        <div className="px-6">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            ΚΥΡΙΟ ΜΕΝΟΥ
          </p>
        </div>

        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center px-6 py-3 text-neutral-700 hover:bg-neutral-100 hover:text-primary-600 transition-colors group",
                isActive && "bg-primary-50 text-primary-600 border-r-3 border-primary-500"
              )}>
                <Icon className={cn(
                  "mr-3 h-5 w-5 text-neutral-500 group-hover:text-primary-600",
                  isActive && "text-primary-600"
                )} />
                <span className={cn(
                  "font-medium",
                  isActive && "text-primary-600"
                )}>
                  {item.name}
                </span>
              </a>
            </Link>
          );
        })}

        <div className="mt-8 px-6">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            ΡΥΘΜΙΣΕΙΣ
          </p>
        </div>

        <Link href="/settings">
          <a className="flex items-center px-6 py-3 text-neutral-700 hover:bg-neutral-100 hover:text-primary-600 transition-colors group">
            <Settings className="mr-3 h-5 w-5 text-neutral-500 group-hover:text-primary-600" />
            <span className="font-medium">Ρυθμίσεις</span>
          </a>
        </Link>
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-neutral-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-semibold">
                  {getInitials(user?.firstName, user?.lastName)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "Χρήστης"
                  }
                </p>
                <p className="text-xs text-neutral-500">HR Manager</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = "/api/logout"}
              className="p-1 text-neutral-500 hover:text-primary-600 transition-colors"
              title="Αποσύνδεση"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
