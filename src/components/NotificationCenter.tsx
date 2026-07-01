/**
 * Notification Center Component
 * Displays notifications to the user
 */

import React from 'react'
import useNotifications from '@hooks/useNotifications'
import type { Notification } from '@services/NotificationManager'

const getBorderColor = (type: Notification['type']): string => {
  switch (type) {
    case 'success':
      return 'border-l-accent'
    case 'error':
      return 'border-l-danger'
    case 'warning':
      return 'border-l-warn'
    case 'info':
    default:
      return 'border-l-info'
  }
}

const getTextColor = (type: Notification['type']): string => {
  switch (type) {
    case 'success':
      return 'text-accent'
    case 'error':
      return 'text-danger'
    case 'warning':
      return 'text-warn'
    case 'info':
    default:
      return 'text-info'
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
        border border-border border-l-4 rounded-[10px] p-4 mb-2 shadow-panel
        bg-panel-2 text-white
        ${getBorderColor(notification.type)}
        animate-slide-in
        z-50
      `}
    >
      <div className="flex items-start gap-3">
        <span className={`text-lg font-bold flex-shrink-0 ${getTextColor(notification.type)}`}>
          {getIcon(notification.type)}
        </span>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm mb-1">{notification.title}</h4>
          <p className="text-sm text-muted break-words">{notification.message}</p>

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
