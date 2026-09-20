import { makeAutoObservable, runInAction } from "mobx"
import type RootStore from "./rootStore"
import type { Notification } from "@/types/notification.type"
import { mockNotifications } from "@/lib/mocks/notifications.mock" // Import mock data

class NotificationStore {
  rootStore: RootStore
  notifications: Notification[] = []
  isLoading = false

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore
    makeAutoObservable(this)
  }

  get unreadCount() {
    return this.notifications.filter((n) => !n.isRead).length
  }

  async init() {
    await this.loadNotifications()
  }

  async loadNotifications() {
    this.isLoading = true
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      runInAction(() => {
        // Use the imported mock data
        this.notifications = [...mockNotifications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        this.isLoading = false
      })
    } catch (error) {
      runInAction(() => {
        this.isLoading = false
      })
      console.error("Failed to load notifications:", error)
    }
  }

  markAsRead(id: string) {
    runInAction(() => {
      const notification = this.notifications.find((n) => n.id === id)
      if (notification) {
        notification.isRead = true
      }
    })
    // In a real app, you would send an API call to mark as read on the backend
  }

  markAllAsRead() {
    runInAction(() => {
      this.notifications.forEach((n) => (n.isRead = true))
    })
    // In a real app, you would send an API call to mark all as read on the backend
  }
}

export default NotificationStore
