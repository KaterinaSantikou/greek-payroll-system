import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export function NotificationBell() {
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Check for new notifications every 30 seconds
  });

  const notificationArray = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notificationArray.filter((n: any) => n.status === 'pending').length;
  const urgentCount = notificationArray.filter((n: any) => 
    n.status === 'pending' && (n.priority === 'urgent' || n.priority === 'high')
  ).length;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
      >
        <Bell className={`h-5 w-5 ${urgentCount > 0 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`} />
        {unreadCount > 0 && (
          <Badge 
            className={`absolute -top-1 -right-1 px-1 py-0 text-xs min-w-5 h-5 flex items-center justify-center ${
              urgentCount > 0 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}