import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from 'wouter';

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    deleteNotification
  } = useNotifications();
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };
  
  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  // Group notifications by date
  const groupedNotifications = React.useMemo(() => {
    const groups: Record<string, any[]> = {
      'Today': [],
      'This Week': [],
      'Earlier': []
    };
    
    notifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const isThisWeek = date > new Date(now.setDate(now.getDate() - 7));
      
      if (isToday) {
        groups['Today'].push(notification);
      } else if (isThisWeek) {
        groups['This Week'].push(notification);
      } else {
        groups['Earlier'].push(notification);
      }
    });
    
    return groups;
  }, [notifications]);
  
  // Define colors based on notification type and priority
  const getColorByTypeAndPriority = (type: string, priority: string, isRead: boolean) => {
    if (isRead) return 'bg-muted/50 hover:bg-muted';
    
    const baseClasses = 'hover:bg-muted';
    
    switch (type) {
      case 'billing':
        return priority === 'high' 
          ? cn(baseClasses, 'bg-red-100/50 dark:bg-red-900/20') 
          : cn(baseClasses, 'bg-orange-100/50 dark:bg-orange-900/20');
      case 'manufacturing':
        return priority === 'high' 
          ? cn(baseClasses, 'bg-blue-100/50 dark:bg-blue-900/20') 
          : cn(baseClasses, 'bg-sky-100/50 dark:bg-sky-900/20');
      case 'project':
        return priority === 'high' 
          ? cn(baseClasses, 'bg-green-100/50 dark:bg-green-900/20') 
          : cn(baseClasses, 'bg-emerald-100/50 dark:bg-emerald-900/20');
      case 'system':
        return priority === 'high' 
          ? cn(baseClasses, 'bg-purple-100/50 dark:bg-purple-900/20') 
          : cn(baseClasses, 'bg-violet-100/50 dark:bg-violet-900/20');
      default:
        return baseClasses;
    }
  };
  
  // Get badge color for notification type
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'billing': return 'destructive';
      case 'manufacturing': return 'blue';
      case 'project': return 'green';
      case 'system': return 'purple';
      default: return 'secondary';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h4 className="font-medium">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto text-xs" 
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div>
              {Object.entries(groupedNotifications).map(([group, groupNotifications]) => 
                groupNotifications.length > 0 && (
                  <div key={group}>
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {group}
                    </div>
                    {groupNotifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={cn(
                          "p-4 cursor-pointer", 
                          getColorByTypeAndPriority(notification.type, notification.priority, notification.isRead)
                        )}
                        onClick={() => handleClick(notification)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getBadgeVariant(notification.type)} className="capitalize">
                              {notification.type}
                            </Badge>
                            {!notification.isRead && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => handleDelete(e, notification.id)}
                            >
                              <span className="sr-only">Delete</span>
                              ×
                            </Button>
                          </div>
                        </div>
                        <h5 className={cn("text-sm font-medium", !notification.isRead && "font-semibold")}>
                          {notification.title}
                        </h5>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}