import { ref, onDisconnect, set, serverTimestamp, onValue, off } from 'firebase/database'
import { realtimeDb } from '../lib/firebase'
import { User } from 'firebase/auth'

export interface UserPresence {
  uid: string
  email: string
  displayName: string
  isOnline: boolean
  lastSeen: Date
}

export class PresenceManager {
  private user: User | null = null
  private presenceRef: any = null
  private connectedRef: any = null

  constructor(user: User | null) {
    this.user = user
    if (user) {
      this.initializePresence()
    }
  }

  private initializePresence() {
    if (!this.user) return

    // Create references
    this.presenceRef = ref(realtimeDb, `presence/${this.user.uid}`)
    this.connectedRef = ref(realtimeDb, '.info/connected')

    // Set up presence tracking
    onValue(this.connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        // User is online
        const userPresence = {
          uid: this.user!.uid,
          email: this.user!.email,
          displayName: this.user!.displayName || 'User',
          isOnline: true,
          lastSeen: serverTimestamp()
        }

        // Set user as online
        set(this.presenceRef, userPresence)

        // Set up disconnect handler
        onDisconnect(this.presenceRef).set({
          ...userPresence,
          isOnline: false,
          lastSeen: serverTimestamp()
        })
      }
    })
  }

  public cleanup() {
    if (this.connectedRef) {
      off(this.connectedRef)
    }
    if (this.presenceRef) {
      // Set user as offline when cleaning up
      if (this.user) {
        set(this.presenceRef, {
          uid: this.user.uid,
          email: this.user.email,
          displayName: this.user.displayName || 'User',
          isOnline: false,
          lastSeen: serverTimestamp()
        })
      }
    }
  }

  public static subscribeToAllPresence(callback: (users: UserPresence[]) => void) {
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
      
      callback(users)
    })

    return unsubscribe
  }

  public static isUserActiveWithinMinutes(lastSeen: Date, minutes: number = 5): boolean {
    const now = new Date()
    const diffInMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
    return diffInMinutes <= minutes
  }
}