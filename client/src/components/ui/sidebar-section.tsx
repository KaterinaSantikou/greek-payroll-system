import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {title && (
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
        </div>
      )}
      {children}
    </div>
  );
}

interface SidebarDividerProps {
  className?: string;
}

export function SidebarDivider({ className }: SidebarDividerProps) {
  return (
    <div className={cn("my-3 border-t border-border", className)} />
  );
}