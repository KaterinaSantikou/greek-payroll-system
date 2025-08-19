import Sidebar from "./Sidebar";
import { PropertyProvider } from "@/contexts/PropertyContext";
import { PropertySwitcher } from "@/components/PropertySwitcher";
import { useProperty } from "@/contexts/PropertyContext";

interface LayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { selectedPropertyId, setSelectedPropertyId, toggleGroupView, isGroupView } = useProperty();

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Top Bar with Property Switcher */}
        <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-gray-900">
                {isGroupView ? "Group Dashboard" : "Property Dashboard"}
              </h1>
            </div>
            <PropertySwitcher />
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  return <LayoutContent>{children}</LayoutContent>;
}