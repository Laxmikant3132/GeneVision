import { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  where,
  Timestamp 
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface RealtimeAnalytics {
  totalSequences: number
  totalConsultations: number
  totalUsers: number
  recentSubmissions: any[]
  flaggedContent: any[]
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical'
    lastUpdate: Date
    errorRate: number
  }
}

export const useRealtimeAnalytics = () => {
  const [analytics, setAnalytics] = useState<RealtimeAnalytics>({
    totalSequences: 0,
    totalConsultations: 0,
    totalUsers: 0,
    recentSubmissions: [],
    flaggedContent: [],
    systemHealth: {
      status: 'healthy',
      lastUpdate: new Date(),
      errorRate: 0
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribers: (() => void)[] = []

    // Monitor sequences
    const sequencesQuery = query(
      collection(db, 'sequences'),
      orderBy('createdAt', 'desc'),
      limit(100)
    )
    
    const unsubSequences = onSnapshot(sequencesQuery, (snapshot) => {
      const sequences = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }))
      
      setAnalytics(prev => ({
        ...prev,
        totalSequences: snapshot.size,
        recentSubmissions: sequences.slice(0, 10)
      }))
    })
    unsubscribers.push(unsubSequences)

    // Monitor consultations
    const consultationsQuery = query(
      collection(db, 'consultations'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    
    const unsubConsultations = onSnapshot(consultationsQuery, (snapshot) => {
      setAnalytics(prev => ({
        ...prev,
        totalConsultations: snapshot.size
      }))
    })
    unsubscribers.push(unsubConsultations)

    // Monitor users
    const usersQuery = query(collection(db, 'users'))
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setAnalytics(prev => ({
        ...prev,
        totalUsers: snapshot.size
      }))
    })
    unsubscribers.push(unsubUsers)

    // Monitor flagged content
    const flaggedQuery = query(
      collection(db, 'sequences'),
      where('status', '==', 'flagged')
    )
    
    const unsubFlagged = onSnapshot(flaggedQuery, (snapshot) => {
      const flagged = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }))
      // Sort client-side by createdAt desc
      flagged.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
      
      setAnalytics(prev => ({
        ...prev,
        flaggedContent: flagged,
        systemHealth: {
          ...prev.systemHealth,
          status: flagged.length > 20 ? 'critical' : flagged.length > 10 ? 'warning' : 'healthy',
          lastUpdate: new Date()
        }
      }))
    })
    unsubscribers.push(unsubFlagged)

    setLoading(false)

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [])

  return { analytics, loading }
}