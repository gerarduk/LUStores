import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface GitHubNotificationData {
  event?: 'push' | 'pull_request' | 'workflow_run';
  repository?: string;
  sender?: string;
}

interface WatchtowerNotificationData {
  containerName?: string;
  imageTag?: string;
  status?: string;
}

interface DeploymentNotification {
  id: string;
  type: 'watchtower' | 'github';
  message: string;
  timestamp: string;
  data: GitHubNotificationData | WatchtowerNotificationData;
}

export default function DeploymentNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch deployment notifications with proper authentication
  const { data: notifications = [] } = useQuery<DeploymentNotification[]>({
    queryKey: ["/api/notifications/deployments"],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/notifications/deployments');
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.warn('Failed to fetch deployment notifications:', error);
        return []; // Return empty array on error to prevent UI issues
      }
    },
    refetchInterval: 10000, // Check every 10 seconds
    retry: false, // Don't retry on auth failures
  });

  // Mutation to remove notifications with proper authentication
  const removeNotification = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/notifications/deployments/${id}`);
      if (!response.ok) {
        throw new Error('Failed to remove notification');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/deployments"] });
    },
  });

  const getNotificationIcon = (type: string, data?: GitHubNotificationData | WatchtowerNotificationData) => {
    switch (type) {
      case 'watchtower': {
        return 'fas fa-sync-alt';
      }
      case 'github': {
        const githubData = data as GitHubNotificationData;
        if (githubData?.event === 'push') return 'fas fa-code-branch';
        if (githubData?.event === 'pull_request') return 'fas fa-code-merge';
        if (githubData?.event === 'workflow_run') return 'fas fa-cog';
        return 'fab fa-github';
      }
      default:
        return 'fas fa-bell';
    }
  };

  const getNotificationColor = (type: string, data?: GitHubNotificationData | WatchtowerNotificationData) => {
    switch (type) {
      case 'watchtower':
        return 'text-blue-500';
      case 'github': {
        const githubData = data as GitHubNotificationData;
        if (githubData?.event === 'push') return 'text-green-500';
        if (githubData?.event === 'pull_request') return 'text-orange-500';
        if (githubData?.event === 'workflow_run') return 'text-purple-500';
        return 'text-gray-700';
      }
      default:
        return 'text-gray-500';
    }
  };

  const getNotificationBadge = (type: string, data?: GitHubNotificationData | WatchtowerNotificationData) => {
    switch (type) {
      case 'watchtower':
        return { text: 'UPDATE', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' };
      case 'github': {
        const githubData = data as GitHubNotificationData;
        if (githubData?.event === 'push') return { text: 'PUSH', color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' };
        if (githubData?.event === 'pull_request') return { text: 'PR', color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300' };
        if (githubData?.event === 'workflow_run') return { text: 'CI/CD', color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300' };
        return { text: 'GIT', color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300' };
      }
      default:
        return { text: 'INFO', color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300' };
    }
  };

  const handleRemoveNotification = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeNotification.mutate(id);
  };

  const unreadCount = notifications.length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative" 
          title={unreadCount > 0 ? `${unreadCount} deployment notification${unreadCount !== 1 ? 's' : ''}` : "No deployment notifications"}
        >
          <i className="fas fa-rocket text-lg text-medium-gray"></i>
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center p-0 animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="px-3 py-2 text-sm font-semibold border-b">
          <div className="flex items-center justify-between">
            <span>Deployment Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        
        {notifications.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            <i className="fas fa-check-circle text-green-500 text-lg mb-2 block"></i>
            No recent deployment activity
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="px-3 py-3 cursor-pointer hover:bg-accent flex items-start space-x-3"
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex-shrink-0 mt-1">
                <i className={`${getNotificationIcon(notification.type, notification.data)} ${getNotificationColor(notification.type, notification.data)}`}></i>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {notification.message}
                  </div>
                  <Badge className={`text-xs px-2 py-0.5 ${getNotificationBadge(notification.type, notification.data).color}`}>
                    {getNotificationBadge(notification.type, notification.data).text}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                </div>
                {notification.type === 'github' && (notification.data as GitHubNotificationData)?.repository && (
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <i className="fab fa-github text-xs"></i>
                    <span>{(notification.data as GitHubNotificationData).repository}</span>
                    {(notification.data as GitHubNotificationData).sender && (
                      <>
                        <span>•</span>
                        <span>@{(notification.data as GitHubNotificationData).sender}</span>
                      </>
                    )}
                  </div>
                )}
                {notification.type === 'watchtower' && (
                  <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <i className="fas fa-docker text-xs"></i>
                    <span>Container Update</span>
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-gray-200"
                onClick={(e) => handleRemoveNotification(notification.id, e)}
                title="Dismiss notification"
              >
                <i className="fas fa-times text-xs text-gray-400"></i>
              </Button>
            </DropdownMenuItem>
          ))
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  notifications.forEach(n => removeNotification.mutate(n.id));
                  setIsOpen(false);
                }}
              >
                Clear all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
