/**
 * Notification Center Component
 * Displays notifications to the user
 */

import React from 'react'
import useNotifications from '@hooks/useNotifications'
import type { Notification } from '@services/NotificationManager'

const getBackgroundColor = (type: Notification['type']): string => {
  switch (type) {
    case 'success':
      return 'bg-green-900 border-green-700'
    case 'error':
      return 'bg-red-900 border-red-700'
    case 'warning':
      return 'bg-yellow-900 border-yellow-700'
    case 'info':
    default:
      return 'bg-blue-900 border-blue-700'
  }
}

const getTextColor = (type: Notification['type']): string => {
  switch (type) {
    case 'success':
      return 'text-green-100'
    case 'error':
      return 'text-red-100'
    case 'warning':
      return 'text-yellow-100'
    case 'info':
    default:
      return 'text-blue-100'
  }
}

const getIcon = (type: Notification['type']): string => {
  switch (type) {
    case 'success':
      return '✓'
    case 'error':
      return '✕'
    case 'warning':
      return '⚠'
    case 'info':
    default:
      return 'ℹ'
  }
}

const getPositionClass = (position: Notification['position']): string => {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4'
    case 'top-right':
      return 'top-4 right-4'
    case 'bottom-left':
      return 'bottom-4 left-4'
    case 'bottom-right':
      return 'bottom-4 right-4'
  }
}

const NotificationItem: React.FC<{
  notification: Notification
  onClose: (id: string) => void
}> = ({ notification, onClose }) => {
  return (
    <div
      className={`
        fixed ${getPositionClass(notification.position)}
        max-w-sm w-full
        border rounded-lg p-4 mb-2 shadow-lg
        ${getBackgroundColor(notification.type)} ${getTextColor(notification.type)}
        animate-slide-in
        z-50
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg font-bold flex-shrink-0">{getIcon(notification.type)}</span>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm mb-1">{notification.title}</h4>
          <p className="text-sm opacity-90 break-words">{notification.message}</p>

          {notification.action && (
            <button
              onClick={() => {
                notification.action!.callback()
                onClose(notification.id)
              }}
              className="mt-2 text-xs font-bold underline hover:no-underline transition"
            >
              {notification.action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => onClose(notification.id)}
          className="flex-shrink-0 text-lg font-bold opacity-70 hover:opacity-100 transition"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export const NotificationCenter: React.FC = () => {
  const { notifications, removeNotification } = useNotifications()

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem notification={notification} onClose={removeNotification} />
        </div>
      ))}
    </div>
  )
}

export default NotificationCenter
