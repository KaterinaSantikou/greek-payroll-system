import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Users, Settings, LogOut } from 'lucide-react';
import ThreeLevelNavigation from './ThreeLevelNavigation';

export default function Sidebar() {
  const { user } = useAuth();

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'ΧΡ';
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  };

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-neutral-200 fixed h-full z-10 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-200 flex-shrink-0">
        <div className="flex items-center">
          <div className="bg-primary text-white w-10 h-10 rounded-lg flex items-center justify-center mr-3">
            <Users size={20} />
          </div>
          <h1 className="text-xl font-bold text-neutral-900">PayrollSync</h1>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-hidden">
        <nav className="h-full px-4 py-6 overflow-y-auto">
          <div className="px-2 mb-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              ΚΥΡΙΟ ΜΕΝΟΥ
            </p>
          </div>

          <ThreeLevelNavigation />

          <div className="mt-8 px-2">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              ΡΥΘΜΙΣΕΙΣ
            </p>
          </div>

          <button className="w-full flex items-center px-3 py-2 rounded-lg text-neutral-700 hover:bg-neutral-100 hover:text-primary-600 transition-colors group">
            <Settings className="mr-3 h-4 w-4 text-neutral-500 group-hover:text-primary-600" />
            <span className="font-medium">Ρυθμίσεις</span>
          </button>
        </nav>
      </div>

      {/* User Profile */}
      <div className="p-6 border-t border-neutral-200 flex-shrink-0">
        <div className="bg-neutral-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-semibold">
                  {getInitials(
                    user?.firstName || undefined,
                    user?.lastName || undefined
                  )}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || 'Χρήστης'}
                </p>
                <p className="text-xs text-neutral-500">HR Manager</p>
              </div>
            </div>
            <button
              onClick={() => (window.location.href = '/api/logout')}
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
