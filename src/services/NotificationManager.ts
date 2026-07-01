/**
 * Notification Manager Service
 * Handles application notifications and alerts
 */

import { getLogger } from '@services/Logger'

export type NotificationType = 'info' | 'warning' | 'error' | 'success'
export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number // milliseconds, 0 = persistent
  position: NotificationPosition
  timestamp: number
  read: boolean
  action?: {
    label: string
    callback: () => void
  }
}

const logger = getLogger('NotificationManager')

class NotificationManager {
  private notifications: Map<string, Notification> = new Map()
  private listeners: Set<(notification: Notification) => void> = new Set()
  private notificationId = 0

  /**
   * Create and show a notification
   */
  notify(
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      duration?: number
      position?: NotificationPosition
      action?: {
        label: string
        callback: () => void
      }
    }
  ): string {
    const id = `notification-${++this.notificationId}`

    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration: options?.duration ?? 5000,
      position: options?.position ?? 'top-right',
      timestamp: Date.now(),
      read: false,
      action: options?.action,
    }

    this.notifications.set(id, notification)
    logger.info(`Notification created: ${title}`, { type, message })

    // Notify listeners
    this.listeners.forEach((listener) => listener(notification))

    // Auto-remove after duration (if specified)
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id)
      }, notification.duration)
    }

    return id
  }

  /**
   * Convenience methods
   */
  info(title: string, message: string, options?: Omit<Parameters<typeof this.notify>[3], 'duration'> & { duration?: number }): string {
    return this.notify('info', title, message, options)
  }

  success(title: string, message: string, options?: Omit<Parameters<typeof this.notify>[3], 'duration'> & { duration?: number }): string {
    return this.notify('success', title, message, options)
  }

  warning(title: string, message: string, options?: Omit<Parameters<typeof this.notify>[3], 'duration'> & { duration?: number }): string {
    return this.notify('warning', title, message, options)
  }

  error(title: string, message: string, options?: Omit<Parameters<typeof this.notify>[3], 'duration'> & { duration?: number }): string {
    return this.notify('error', title, message, options)
  }

  /**
   * Remove a notification
   */
  removeNotification(id: string): void {
    this.notifications.delete(id)
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): void {
    const notification = this.notifications.get(id)
    if (notification) {
      notification.read = true
    }
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return Array.from(this.notifications.values())
  }

  /**
   * Get unread notifications count
   */
  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter((n) => !n.read).length
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications.clear()
  }

  /**
   * Subscribe to notification changes
   */
  onNotification(listener: (notification: Notification) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Batch notifications for a single event
   */
  notifyEvent(event: {
    type: NotificationType
    title: string
    messages: string[]
    duration?: number
  }): string[] {
    return event.messages.map((message) =>
      this.notify(event.type, event.title, message, { duration: event.duration })
    )
  }

  destroy(): void {
    this.notifications.clear()
    this.listeners.clear()
    logger.info('NotificationManager destroyed')
  }
}

// Global notification manager instance
let notificationManagerInstance: NotificationManager | null = null

export function getNotificationManager(): NotificationManager {
  if (!notificationManagerInstance) {
    notificationManagerInstance = new NotificationManager()
  }
  return notificationManagerInstance
}

export default NotificationManager
