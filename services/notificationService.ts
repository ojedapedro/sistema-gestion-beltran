
import { AppNotification, NotificationCategory, NotificationRecipient } from '../types';

const STORAGE_KEY = 'bpf_notifications';

export const notificationService = {
  getNotifications: (): AppNotification[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  sendNotification: (params: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const notifications = notificationService.getNotifications();
    const newNotification: AppNotification = {
      ...params,
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    };

    notifications.unshift(newNotification);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50))); // Keep last 50

    // Trigger Browser Push Notification if allowed
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(newNotification.title, {
        body: newNotification.message,
        icon: '/favicon.ico' // Assuming a favicon exists or use a generic one
      });
    }

    // Custom Event for UI update
    window.dispatchEvent(new CustomEvent('new_notification', { detail: newNotification }));
    
    return newNotification;
  },

  markAsRead: (id: string) => {
    const notifications = notificationService.getNotifications();
    const idx = notifications.findIndex(n => n.id === id);
    if (idx > -1) {
      notifications[idx].read = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    }
  },

  markAllAsRead: () => {
    const notifications = notificationService.getNotifications();
    notifications.forEach(n => n.read = true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  },

  requestPermission: async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
};
