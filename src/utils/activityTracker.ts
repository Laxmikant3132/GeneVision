import { ref, push, serverTimestamp, set } from 'firebase/database'
import { addDoc, collection, serverTimestamp as firestoreTimestamp } from 'firebase/firestore'
import { realtimeDb, db } from '../lib/firebase'
import { User } from 'firebase/auth'

export interface UserActivity {
  userId: string
  action: string
  details?: any
  timestamp: Date
  sessionId?: string
  userAgent?: string
  ipAddress?: string
  page?: string
}

export interface UserSession {
  userId: string
  sessionId: string
  startTime: Date
  endTime?: Date
  userAgent: string
  ipAddress?: string
  pageViews: number
  actions: number
}

class ActivityTracker {
  private currentUser: User | null = null
  private sessionId: string = ''
  private sessionStartTime: Date = new Date()
  private pageViews: number = 0
  private actions: number = 0

  constructor() {
    this.sessionId = this.generateSessionId()
    this.sessionStartTime = new Date()
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    
    // Track page unload
    window.addEventListener('beforeunload', this.handlePageUnload.bind(this))
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  public setUser(user: User | null) {
    if (this.currentUser && user?.uid !== this.currentUser.uid) {
      // User changed, end previous session
      this.endSession()
    }
    
    this.currentUser = user
    
    if (user) {
      this.startSession()
    }
  }

  private async startSession() {
    if (!this.currentUser) return

    try {
      const sessionData = {
        userId: this.currentUser.uid,
        sessionId: this.sessionId,
        startTime: serverTimestamp(),
        userAgent: navigator.userAgent,
        pageViews: 0,
        actions: 0
      }

      // Store in Realtime Database for real-time tracking
      const sessionRef = ref(realtimeDb, `userActivity/${this.currentUser.uid}/sessions/${this.sessionId}`)
      await set(sessionRef, sessionData)

      // Also store in Firestore for persistent analytics
      await addDoc(collection(db, 'userActivity'), {
        ...sessionData,
        startTime: firestoreTimestamp(),
        type: 'session_start'
      })
    } catch (error) {
      console.error('Error starting session:', error)
    }
  }

  private async endSession() {
    if (!this.currentUser) return

    try {
      const sessionData = {
        endTime: serverTimestamp(),
        pageViews: this.pageViews,
        actions: this.actions,
        duration: Date.now() - this.sessionStartTime.getTime()
      }

      // Update Realtime Database
      const sessionRef = ref(realtimeDb, `userActivity/${this.currentUser.uid}/sessions/${this.sessionId}`)
      await set(sessionRef, sessionData)

      // Store in Firestore
      await addDoc(collection(db, 'userActivity'), {
        userId: this.currentUser.uid,
        sessionId: this.sessionId,
        type: 'session_end',
        timestamp: firestoreTimestamp(),
        ...sessionData
      })
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  public async trackPageView(page: string) {
    if (!this.currentUser) return

    this.pageViews++

    try {
      const pageViewData = {
        userId: this.currentUser.uid,
        sessionId: this.sessionId,
        page,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent
      }

      // Store in Realtime Database
      const pageViewRef = ref(realtimeDb, `userActivity/${this.currentUser.uid}/pageViews`)
      await push(pageViewRef, pageViewData)

      // Store in Firestore
      await addDoc(collection(db, 'userActivity'), {
        ...pageViewData,
        timestamp: firestoreTimestamp(),
        type: 'page_view'
      })
    } catch (error) {
      console.error('Error tracking page view:', error)
    }
  }

  public async trackAction(action: string, details?: any) {
    if (!this.currentUser) return

    this.actions++

    try {
      const actionData = {
        userId: this.currentUser.uid,
        sessionId: this.sessionId,
        action,
        details: details || {},
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent
      }

      // Store in Realtime Database for real-time monitoring
      const actionRef = ref(realtimeDb, `userActivity/${this.currentUser.uid}/actions`)
      await push(actionRef, actionData)

      // Store in Firestore for analytics
      await addDoc(collection(db, 'userActivity'), {
        ...actionData,
        timestamp: firestoreTimestamp(),
        type: 'user_action'
      })
    } catch (error) {
      console.error('Error tracking action:', error)
    }
  }

  public async trackError(error: Error, context?: string) {
    if (!this.currentUser) return

    try {
      const errorData = {
        userId: this.currentUser.uid,
        sessionId: this.sessionId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        context: context || 'unknown',
        timestamp: firestoreTimestamp(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }

      // Store in Firestore for error tracking
      await addDoc(collection(db, 'errorLogs'), errorData)
    } catch (err) {
      console.error('Error tracking error:', err)
    }
  }

  public async trackPerformance(metric: string, value: number, details?: any) {
    if (!this.currentUser) return

    try {
      const performanceData = {
        userId: this.currentUser.uid,
        sessionId: this.sessionId,
        metric,
        value,
        details: details || {},
        timestamp: firestoreTimestamp(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }

      // Store in Firestore for performance analytics
      await addDoc(collection(db, 'performanceMetrics'), performanceData)
    } catch (error) {
      console.error('Error tracking performance:', error)
    }
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.trackAction('page_hidden')
    } else {
      this.trackAction('page_visible')
    }
  }

  private handlePageUnload() {
    this.endSession()
  }

  public cleanup() {
    this.endSession()
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    window.removeEventListener('beforeunload', this.handlePageUnload.bind(this))
  }
}

// Create singleton instance
export const activityTracker = new ActivityTracker()

// Helper functions for common tracking scenarios
export const trackSequenceAnalysis = (sequenceType: string, sequenceLength: number) => {
  activityTracker.trackAction('sequence_analysis', {
    sequenceType,
    sequenceLength,
    feature: 'bioinformatics_analysis'
  })
}

export const trackConsultationSubmission = (sequenceType: string, questionLength: number) => {
  activityTracker.trackAction('consultation_submission', {
    sequenceType,
    questionLength,
    feature: 'specialist_consultation'
  })
}

export const trackExportAction = (exportType: 'pdf' | 'csv', dataType: string) => {
  activityTracker.trackAction('data_export', {
    exportType,
    dataType,
    feature: 'data_export'
  })
}

export const trackAdminAction = (action: string, targetType: string, targetId?: string) => {
  activityTracker.trackAction('admin_action', {
    adminAction: action,
    targetType,
    targetId,
    feature: 'admin_panel'
  })
}

export const trackProteinVisualization = (pdbId: string, viewerType: '3d' | '2d') => {
  activityTracker.trackAction('protein_visualization', {
    pdbId,
    viewerType,
    feature: 'protein_structure'
  })
}

export const trackSearchQuery = (query: string, resultCount: number, searchType: string) => {
  activityTracker.trackAction('search_query', {
    query: query.substring(0, 100), // Limit query length for privacy
    resultCount,
    searchType,
    feature: 'search'
  })
}

export const trackFeatureUsage = (feature: string, subFeature?: string, metadata?: any) => {
  activityTracker.trackAction('feature_usage', {
    feature,
    subFeature,
    metadata,
    timestamp: new Date().toISOString()
  })
}