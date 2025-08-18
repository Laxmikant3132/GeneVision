import { useState, useEffect } from 'react'
import { ref, onValue, off } from 'firebase/database'
import { realtimeDb } from '../lib/firebase'

export interface UserPresence {
  uid: string
  email: string
  displayName: string
  isOnline: boolean
  lastSeen: Date
}

export const useUserPresence = () => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const presenceRef = ref(realtimeDb, 'presence')
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const presenceData = snapshot.val()
      const users: UserPresence[] = []
      
      if (presenceData) {
        Object.values(presenceData).forEach((userData: any) => {
          users.push({
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            isOnline: userData.isOnline,
            lastSeen: userData.lastSeen ? new Date(userData.lastSeen) : new Date()
          })
        })
      }
      
      setOnlineUsers(users)
      setLoading(false)
    })

    return () => {
      off(presenceRef, 'value', unsubscribe)
    }
  }, [])

  const getOnlineCount = () => onlineUsers.filter(user => user.isOnline).length
  const getTotalUsers = () => onlineUsers.length
  const getRecentUsers = (minutes: number = 30) => {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return onlineUsers.filter(user => user.lastSeen > cutoff)
  }

  return {
    onlineUsers,
    loading,
    getOnlineCount,
    getTotalUsers,
    getRecentUsers
  }
}