/**
 * Global Event Bus for application-wide communication
 */

import type { AppEvent } from '@types/index'
import { getLogger } from '@services/Logger'

const logger = getLogger('EventBus')

type EventListener<T extends AppEvent = AppEvent> = (event: T) => void | Promise<void>

interface EventListeners {
  [K in AppEvent['type']]?: EventListener<AppEvent & { type: K }>[]
}

class EventBus {
  private listeners: EventListeners = {}
  private eventHistory: AppEvent[] = []
  private maxHistorySize = 1000

  /**
   * Subscribe to events of a specific type
   */
  on<T extends AppEvent['type']>(
    eventType: T,
    listener: EventListener<AppEvent & { type: T }>
  ): () => void {
    if (!this.listeners[eventType]) {
      this.listeners[eventType as any] = []
    }

    ;(this.listeners[eventType as any] as any[]).push(listener)

    // Return unsubscribe function
    return () => {
      this.off(eventType, listener)
    }
  }

  /**
   * Subscribe to one event and auto-unsubscribe
   */
  once<T extends AppEvent['type']>(
    eventType: T,
    listener: EventListener<AppEvent & { type: T }>
  ): void {
    const wrappedListener: EventListener = async (event: any) => {
      await listener(event)
      this.off(eventType, listener)
    }

    this.on(eventType, wrappedListener as any)
  }

  /**
   * Unsubscribe from events
   */
  off<T extends AppEvent['type']>(
    eventType: T,
    listener: EventListener<AppEvent & { type: T }>
  ): void {
    const listeners = (this.listeners[eventType] as any[]) || []
    const index = listeners.indexOf(listener)
    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }

  /**
   * Emit an event
   */
  async emit<T extends AppEvent>(event: T): Promise<void> {
    logger.debug(`Event emitted: ${event.type}`, event)

    // Add to history
    this.eventHistory.push(event)
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }

    // Notify listeners
    const listeners = (this.listeners[event.type] as any[]) || []
    for (const listener of listeners) {
      try {
        await listener(event)
      } catch (error) {
        logger.error(`Error in event listener for ${event.type}`, error)
      }
    }
  }

  /**
   * Get event history
   */
  getHistory(eventType?: AppEvent['type']): AppEvent[] {
    if (!eventType) {
      return [...this.eventHistory]
    }
    return this.eventHistory.filter((e) => e.type === eventType)
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = []
  }

  /**
   * Get listener count for an event type
   */
  getListenerCount(eventType: AppEvent['type']): number {
    return (this.listeners[eventType as any] as any[])?.length || 0
  }

  /**
   * Clear all listeners and history
   */
  destroy(): void {
    this.listeners = {}
    this.eventHistory = []
    logger.info('EventBus destroyed')
  }
}

// Global event bus instance
let eventBusInstance: EventBus | null = null

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus()
  }
  return eventBusInstance
}

export default EventBus
