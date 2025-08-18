import { addDoc, collection, serverTimestamp, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore'
import { ref, push, serverTimestamp as realtimeTimestamp } from 'firebase/database'
import { db, realtimeDb } from '../lib/firebase'
import toast from 'react-hot-toast'

export interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  userId?: string
  adminOnly: boolean
  read: boolean
  createdAt: Date
  data?: any
}

export interface AdminAlert {
  type: 'flagged_sequence' | 'suspicious_activity' | 'system_error' | 'user_report'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  data: any
  userId?: string
}

class NotificationSystem {
  private listeners: Map<string, () => void> = new Map()

  // Send notification to specific user
  async sendUserNotification(
    userId: string, 
    type: Notification['type'], 
    title: string, 
    message: string, 
    data?: any
  ) {
    try {
      const notification = {
        type,
        title,
        message,
        userId,
        adminOnly: false,
        read: false,
        createdAt: serverTimestamp(),
        data: data || {}
      }

      // Store in Firestore for persistence
      await addDoc(collection(db, 'notifications'), notification)

      // Send real-time notification
      const realtimeRef = ref(realtimeDb, `notifications/${userId}`)
      await push(realtimeRef, {
        ...notification,
        createdAt: realtimeTimestamp()
      })

      return true
    } catch (error) {
      console.error('Error sending user notification:', error)
      return false
    }
  }

  // Send admin alert
  async sendAdminAlert(alert: AdminAlert) {
    try {
      const notification = {
        type: 'warning' as const,
        title: alert.title,
        message: alert.message,
        adminOnly: true,
        read: false,
        createdAt: serverTimestamp(),
        data: {
          alertType: alert.type,
          severity: alert.severity,
          ...alert.data
        }
      }

      // Store in Firestore
      await addDoc(collection(db, 'adminAlerts'), notification)

      // Send real-time alert to admin
      const adminRef = ref(realtimeDb, 'adminAlerts')
      await push(adminRef, {
        ...notification,
        createdAt: realtimeTimestamp()
      })

      // Show toast for critical alerts
      if (alert.severity === 'critical') {
        toast.error(`Critical Alert: ${alert.title}`)
      }

      return true
    } catch (error) {
      console.error('Error sending admin alert:', error)
      return false
    }
  }

  // Listen to user notifications
  listenToUserNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications: Notification[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        notifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as Notification)
      })
      callback(notifications)
    })

    this.listeners.set(`user_${userId}`, unsubscribe)
    return unsubscribe
  }

  // Listen to admin alerts
  listenToAdminAlerts(callback: (alerts: Notification[]) => void) {
    const q = query(
      collection(db, 'adminAlerts'),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts: Notification[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        alerts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as Notification)
      })
      callback(alerts)
    })

    this.listeners.set('admin_alerts', unsubscribe)
    return unsubscribe
  }

  // Mark notification as read
  async markAsRead(notificationId: string, isAdminAlert: boolean = false) {
    try {
      const collectionName = isAdminAlert ? 'adminAlerts' : 'notifications'
      const docRef = collection(db, collectionName)
      // In a real implementation, you would update the specific document
      // For now, we'll just log it
      console.log(`Marking ${collectionName}/${notificationId} as read`)
      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  // Auto-generate alerts based on system events
  async checkAndSendAlerts() {
    try {
      // Check for flagged sequences
      const flaggedQuery = query(
        collection(db, 'sequences'),
        where('status', '==', 'flagged'),
        where('createdAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      )

      // In a real implementation, you would execute this query and send alerts
      console.log('Checking for flagged sequences...')

      // Check for suspicious activity patterns
      // This would involve analyzing user activity logs
      console.log('Checking for suspicious activity...')

      // Check system health
      // This would involve monitoring error rates, response times, etc.
      console.log('Checking system health...')

    } catch (error) {
      console.error('Error in automated alert checking:', error)
    }
  }

  // Cleanup listeners
  cleanup() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe()
    })
    this.listeners.clear()
  }
}

// Create singleton instance
export const notificationSystem = new NotificationSystem()

// Helper functions for common alert scenarios
export const alertFlaggedSequence = async (sequenceId: string, userId: string, reason: string) => {
  await notificationSystem.sendAdminAlert({
    type: 'flagged_sequence',
    severity: 'medium',
    title: 'Sequence Flagged for Review',
    message: `A sequence has been flagged: ${reason}`,
    data: {
      sequenceId,
      userId,
      reason,
      timestamp: new Date().toISOString()
    }
  })
}

export const alertSuspiciousActivity = async (userId: string, activity: string, details: any) => {
  await notificationSystem.sendAdminAlert({
    type: 'suspicious_activity',
    severity: 'high',
    title: 'Suspicious User Activity Detected',
    message: `User ${userId} performed suspicious activity: ${activity}`,
    data: {
      userId,
      activity,
      details,
      timestamp: new Date().toISOString()
    }
  })
}

export const alertSystemError = async (error: Error, context: string) => {
  await notificationSystem.sendAdminAlert({
    type: 'system_error',
    severity: 'critical',
    title: 'System Error Occurred',
    message: `Error in ${context}: ${error.message}`,
    data: {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString()
    }
  })
}

export const alertUserReport = async (reporterId: string, reportedUserId: string, reason: string) => {
  await notificationSystem.sendAdminAlert({
    type: 'user_report',
    severity: 'medium',
    title: 'User Report Submitted',
    message: `User ${reporterId} reported user ${reportedUserId} for: ${reason}`,
    data: {
      reporterId,
      reportedUserId,
      reason,
      timestamp: new Date().toISOString()
    }
  })
}