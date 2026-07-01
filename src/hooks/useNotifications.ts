/**
 * Hook for using notification manager
 */

import { useState, useEffect } from 'react'
import type { Notification, NotificationType } from '@services/NotificationManager'
import { getNotificationManager } from '@services/NotificationManager'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const manager = getNotificationManager()

  useEffect(() => {
    setNotifications(manager.getNotifications())

    const unsubscribe = manager.onNotification(() => {
      setNotifications(manager.getNotifications())
    })

    return () => {
      unsubscribe()
    }
  }, [manager])

  return {
    notifications,
    notify: (type: NotificationType, title: string, message: string, options?: any) =>
      manager.notify(type, title, message, options),
    info: (title: string, message: string, options?: any) => manager.info(title, message, options),
    success: (title: string, message: string, options?: any) => manager.success(title, message, options),
    warning: (title: string, message: string, options?: any) => manager.warning(title, message, options),
    error: (title: string, message: string, options?: any) => manager.error(title, message, options),
    removeNotification: (id: string) => manager.removeNotification(id),
    unreadCount: notifications.filter((n) => !n.read).length,
  }
}

export default useNotifications
