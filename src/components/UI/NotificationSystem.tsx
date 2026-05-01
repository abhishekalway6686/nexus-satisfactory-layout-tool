import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  XCircle, 
  X,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { notificationAnimation } from './animations';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
  progress?: number;
}

interface NotificationStore {
  notifications: Notification[];
  add: (notification: Omit<Notification, 'id'>) => string;
  remove: (id: string) => void;
  update: (id: string, updates: Partial<Notification>) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  
  add: (notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      id,
      duration: 5000,
      ...notification
    };
    
    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));
    
    // Auto-remove non-persistent notifications
    if (!notification.persistent && notification.type !== 'loading') {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id)
        }));
      }, notification.duration || 5000);
    }
    
    return id;
  },
  
  remove: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  },
  
  update: (id, updates) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      )
    }));
  },
  
  clear: () => {
    set({ notifications: [] });
  }
}));

// Notification component
const NotificationItem: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    loading: <Loader2 className="w-5 h-5 animate-spin" />
  };
  
  const colors = {
    success: 'border-green-500/30 bg-green-500/10 text-green-400',
    error: 'border-red-500/30 bg-red-500/10 text-red-400',
    warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    loading: 'border-orange-500/30 bg-orange-500/10 text-orange-400'
  };
  
  return (
    <motion.div
      variants={notificationAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`
        relative overflow-hidden rounded-lg border backdrop-blur-md
        ${colors[notification.type]}
        min-w-[320px] max-w-[420px]
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {icons[notification.type]}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-100">
              {notification.title}
            </h4>
            {notification.message && (
              <p className="mt-1 text-xs text-gray-400">
                {notification.message}
              </p>
            )}
            
            {notification.action && (
              <button
                className="mt-2 text-xs font-medium hover:underline"
                onClick={notification.action.onClick}
              >
                {notification.action.label}
              </button>
            )}
          </div>
          
          {!notification.persistent && notification.type !== 'loading' && (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {notification.progress !== undefined && (
          <div className="mt-3">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-current rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${notification.progress}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Auto-dismiss progress bar */}
      {!notification.persistent && notification.type !== 'loading' && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ 
            duration: (notification.duration || 5000) / 1000,
            ease: 'linear'
          }}
        />
      )}
    </motion.div>
  );
};

// Notification container component
export const NotificationContainer: React.FC = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  const remove = useNotificationStore((state) => state.remove);
  
  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <AnimatePresence mode="sync">
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <div key={notification.id} className="pointer-events-auto">
              <NotificationItem
                notification={notification}
                onClose={() => remove(notification.id)}
              />
            </div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
};

// Hook for showing notifications
export const useNotification = () => {
  const { add, remove, update } = useNotificationStore();
  
  return {
    success: (title: string, message?: string, options?: Partial<Notification>) => 
      add({ type: 'success', title, message, ...options }),
      
    error: (title: string, message?: string, options?: Partial<Notification>) => 
      add({ type: 'error', title, message, duration: 10000, ...options }),
      
    warning: (title: string, message?: string, options?: Partial<Notification>) => 
      add({ type: 'warning', title, message, ...options }),
      
    info: (title: string, message?: string, options?: Partial<Notification>) => 
      add({ type: 'info', title, message, ...options }),
      
    loading: (title: string, message?: string) => {
      return add({ type: 'loading', title, message, persistent: true });
    },
    
    update,
    dismiss: remove
  };
};

// Success notification helper
export const showSuccessNotification = (operation: string) => {
  const messages: Record<string, { title: string; message: string }> = {
    save: { 
      title: 'Layout Saved', 
      message: 'Your factory layout has been saved successfully.' 
    },
    copy: { 
      title: 'Copied to Clipboard', 
      message: 'The content has been copied to your clipboard.' 
    },
    delete: { 
      title: 'Item Deleted', 
      message: 'The selected item has been removed from your layout.' 
    },
    undo: { 
      title: 'Action Undone', 
      message: 'Your last action has been reversed.' 
    },
    redo: { 
      title: 'Action Redone', 
      message: 'Your action has been reapplied.' 
    },
    export: { 
      title: 'Export Complete', 
      message: 'Your layout has been exported successfully.' 
    },
    import: { 
      title: 'Import Complete', 
      message: 'Your layout has been imported successfully.' 
    },
    connect: { 
      title: 'Connection Established', 
      message: 'Items have been connected successfully.' 
    },
    disconnect: { 
      title: 'Connection Removed', 
      message: 'The connection has been removed.' 
    }
  };
  
  const notification = messages[operation] || {
    title: 'Success',
    message: 'Operation completed successfully.'
  };
  
  const { add } = useNotificationStore.getState();
  add({
    type: 'success',
    title: notification.title,
    message: notification.message
  });
};

// Error notification helper
export const showErrorNotification = (error: Error | string) => {
  const { add } = useNotificationStore.getState();
  
  const message = error instanceof Error ? error.message : error;
  const title = 'An error occurred';
  
  add({
    type: 'error',
    title,
    message,
    duration: 10000,
    action: {
      label: 'Dismiss',
      onClick: () => {}
    }
  });
};

// Progress notification helper
export const showProgressNotification = (
  id: string,
  progress: number,
  title: string,
  message?: string
) => {
  const { update } = useNotificationStore.getState();
  
  update(id, {
    progress,
    title,
    message
  });
  
  if (progress >= 100) {
    setTimeout(() => {
      update(id, {
        type: 'success',
        title: 'Complete!',
        message: message || 'Operation completed successfully.',
        persistent: false
      });
    }, 500);
  }
};