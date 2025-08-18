import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { PresenceManager } from '../utils/presence'
import { activityTracker } from '../utils/activityTracker'
import toast from 'react-hot-toast'

interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  createdAt: Date
  lastLogin: Date
  analysisCount: number
  subscription: 'free' | 'pro' | 'enterprise'
  status: 'active' | 'suspended'
  role: 'user' | 'moderator' | 'admin'
}

interface AuthContextType {
  currentUser: User | null
  userProfile: UserProfile | null
  loading: boolean
  signup: (email: string, password: string, displayName: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [presenceManager, setPresenceManager] = useState<PresenceManager | null>(null)

  const signup = async (email: string, password: string, displayName: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName })

      // Create user profile in Firestore
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName,
        createdAt: new Date(),
        lastLogin: new Date(),
        analysisCount: 0,
        subscription: 'free',
        status: 'active',
        role: 'user',
      }

      await setDoc(doc(db, 'users', user.uid), profile)
      setUserProfile(profile)
      toast.success('Account created successfully!')
    } catch (error: any) {
      // Provide more user-friendly error messages
      let errorMessage = 'Account creation failed'
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists'
          break
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address'
          break
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use at least 6 characters'
          break
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled'
          break
        default:
          errorMessage = error.message
      }
      
      toast.error(errorMessage)
      throw error
    }
  }

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast.success('Logged in successfully!')
    } catch (error: any) {
      // Provide more user-friendly error messages
      let errorMessage = 'Login failed'
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address'
          break
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password'
          break
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address'
          break
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled'
          break
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later'
          break
        default:
          errorMessage = error.message
      }
      
      toast.error(errorMessage)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Clean up presence tracking
      if (presenceManager) {
        presenceManager.cleanup()
        setPresenceManager(null)
      }
      
      await signOut(auth)
      setUserProfile(null)
      toast.success('Logged out successfully!')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) return

    try {
      const updatedProfile = { ...userProfile, ...updates }
      await setDoc(doc(db, 'users', currentUser.uid), updatedProfile, { merge: true })
      setUserProfile(updatedProfile)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }

  const fetchUserProfile = async (user: User) => {
    try {
      const docRef = doc(db, 'users', user.uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        // Ensure required fields exist for security rules
        const mergedData: UserProfile = {
          uid: data.uid || user.uid,
          email: data.email || user.email || '',
          displayName: data.displayName || user.displayName || 'User',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLogin: new Date(),
          analysisCount: data.analysisCount || 0,
          subscription: data.subscription || 'free',
          status: data.status || 'active',
          role: data.role || 'user'
        }
        setUserProfile(mergedData)

        // Persist any missing defaults and update last login
        await setDoc(docRef, { ...mergedData }, { merge: true })
      } else {
        // Create a default profile if none exists
        const defaultProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          createdAt: new Date(),
          lastLogin: new Date(),
          analysisCount: 0,
          subscription: 'free',
          status: 'active',
          role: 'user'
        }
        await setDoc(docRef, defaultProfile)
        setUserProfile(defaultProfile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Create a minimal profile to prevent crashes
      setUserProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        createdAt: new Date(),
        lastLogin: new Date(),
        analysisCount: 0,
        subscription: 'free',
        status: 'active',
        role: 'user'
      })
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        await fetchUserProfile(user)
        // Initialize presence tracking
        const manager = new PresenceManager(user)
        setPresenceManager(manager)
        
        // Initialize activity tracking
        activityTracker.setUser(user)
        activityTracker.trackAction('user_login')
      } else {
        // Clean up presence tracking
        if (presenceManager) {
          presenceManager.cleanup()
          setPresenceManager(null)
        }
        setUserProfile(null)
        
        // Clean up activity tracking
        activityTracker.setUser(null)
      }
      setLoading(false)
    })

    return () => {
      unsubscribe()
      // Clean up presence tracking on unmount
      if (presenceManager) {
        presenceManager.cleanup()
      }
    }
  }, [])

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading GeneVision...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}