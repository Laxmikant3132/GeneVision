import React, { createContext, useContext, useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

export interface SequenceData {
  id: string
  name: string
  sequence: string
  type: 'dna' | 'rna' | 'protein'
  uploadedAt: Date
  fileSize?: number
  fileName?: string
}

export interface AnalysisResult {
  id: string
  sequenceId: string
  type: 'gc-content' | 'codon-usage' | 'translation' | 'mutation-analysis' | 'orf-finder' | 'protein-analysis'
  result: any
  createdAt: Date
  processingTime: number
  aiInsights?: string[]
}

export interface AnalysisSession {
  id: string
  name: string
  sequences: SequenceData[]
  results: AnalysisResult[]
  createdAt: Date
  updatedAt: Date
  userId: string
  isPublic: boolean
  tags: string[]
}

interface AnalysisContextType {
  currentSession: AnalysisSession | null
  sessions: AnalysisSession[]
  loading: boolean
  createSession: (name: string) => Promise<void>
  loadSession: (sessionId: string) => void
  addSequence: (sequence: SequenceData) => Promise<void>
  removeSequence: (sequenceId: string) => void
  addResult: (result: AnalysisResult) => Promise<void>
  updateSession: (updates: Partial<AnalysisSession>) => void
  clearSession: () => void
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

export const useAnalysis = () => {
  const context = useContext(AnalysisContext)
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider')
  }
  return context
}

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<AnalysisSession | null>(null)
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [loading, setLoading] = useState(false)
  const { currentUser } = useAuth()

  // Load user sessions from Firebase with local storage backup
  useEffect(() => {
    const loadSessions = async () => {
      if (!currentUser) {
        // Load from local storage if not logged in
        const localSessions = localStorage.getItem('geneVision_sessions')
        if (localSessions) {
          try {
            const parsed = JSON.parse(localSessions)
            const hydrated = parsed.map((s: any) => ({
              ...s,
              createdAt: new Date(s.createdAt),
              updatedAt: new Date(s.updatedAt),
              sequences: (s.sequences || []).map((seq: any) => ({
                ...seq,
                uploadedAt: new Date(seq.uploadedAt),
              })),
              results: (s.results || []).map((r: any) => ({
                ...r,
                createdAt: new Date(r.createdAt),
              })),
            }))
            setSessions(hydrated)
          } catch (e) {
            console.error('Error parsing local sessions:', e)
          }
        }
        return
      }

      setLoading(true)
      try {
        // Try to load from local storage first for faster loading
        const localSessions = localStorage.getItem('geneVision_sessions')
        if (localSessions) {
          try {
            const parsed = JSON.parse(localSessions)
            const hydrated = parsed.map((s: any) => ({
              ...s,
              createdAt: new Date(s.createdAt),
              updatedAt: new Date(s.updatedAt),
              sequences: (s.sequences || []).map((seq: any) => ({
                ...seq,
                uploadedAt: new Date(seq.uploadedAt),
              })),
              results: (s.results || []).map((r: any) => ({
                ...r,
                createdAt: new Date(r.createdAt),
              })),
            }))
            setSessions(hydrated)
          } catch (e) {
            console.error('Error parsing local sessions:', e)
          }
        }

        // Then try to sync with Firebase in the background
        const q = query(
          collection(db, 'analysisSessions'),
          where('userId', '==', currentUser.uid),
          orderBy('updatedAt', 'desc')
        )
        const querySnapshot = await getDocs(q)
        const loadedSessions: AnalysisSession[] = []
        
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          loadedSessions.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as AnalysisSession)
        })
        
        setSessions(loadedSessions)
        
        // Save to local storage as backup
        localStorage.setItem('geneVision_sessions', JSON.stringify(loadedSessions))
        
      } catch (error) {
        console.error('Error loading sessions from Firebase:', error)
        // Continue with local storage data if Firebase fails
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [currentUser])

  const createSession = async (name: string) => {
    setLoading(true)
    try {
      const now = new Date()
      const newSession: AnalysisSession = {
        id: `local_${Date.now()}`,
        name,
        sequences: [],
        results: [],
        createdAt: now,
        updatedAt: now,
        userId: currentUser?.uid || 'anonymous',
        isPublic: false,
        tags: [],
      }

      // Add to local state immediately
      setCurrentSession(newSession)
      const updatedSessions = [newSession, ...sessions]
      setSessions(updatedSessions)
      
      // Save to local storage
      localStorage.setItem('geneVision_sessions', JSON.stringify(updatedSessions))

      try {
        // Try to save to Firebase if logged in
        if (currentUser) {
          const docRef = await addDoc(collection(db, 'analysisSessions'), {
            ...newSession,
            id: undefined // Remove local ID for Firebase
          })
          
          // Update with Firebase ID
          const firebaseSession = { ...newSession, id: docRef.id }
          setCurrentSession(firebaseSession)
          const finalSessions = [firebaseSession, ...sessions]
          setSessions(finalSessions)
          localStorage.setItem('geneVision_sessions', JSON.stringify(finalSessions))
        }
        
        toast.success('Analysis session created successfully')
      } catch (error) {
        console.error('Error syncing to Firebase:', error)
        toast.success('Session created (saved locally)')
      }
    } catch (error) {
      console.error('Error creating session:', error)
      toast.error('Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  const loadSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSession(session)
    }
  }

  const addSequence = async (sequence: SequenceData) => {
    if (!currentSession) return

    const now = new Date()
    const updatedSession = {
      ...currentSession,
      sequences: [...currentSession.sequences, sequence],
      updatedAt: now,
    }

    // Update local state immediately
    setCurrentSession(updatedSession)
    const updatedSessions = sessions.map(s => s.id === updatedSession.id ? updatedSession : s)
    setSessions(updatedSessions)
    
    // Save to local storage immediately
    localStorage.setItem('geneVision_sessions', JSON.stringify(updatedSessions))

    try {
      // Try to update in Firebase
      if (currentUser) {
        await updateDoc(doc(db, 'analysisSessions', currentSession.id), {
          sequences: updatedSession.sequences,
          updatedAt: updatedSession.updatedAt
        })
      }
      toast.success('Sequence added successfully')
    } catch (error) {
      console.error('Error syncing to Firebase:', error)
      toast.success('Sequence added (saved locally)')
    }
  }

  const removeSequence = (sequenceId: string) => {
    if (!currentSession) return

    const now = new Date()
    const updatedSession = {
      ...currentSession,
      sequences: currentSession.sequences.filter(s => s.id !== sequenceId),
      results: currentSession.results.filter(r => r.sequenceId !== sequenceId),
      updatedAt: now,
    }
    setCurrentSession(updatedSession)
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s))
  }

  const addResult = async (result: AnalysisResult) => {
    if (!currentSession) return

    const now = new Date()
    const updatedSession = {
      ...currentSession,
      results: [...currentSession.results, result],
      updatedAt: now,
    }

    // Update local state immediately
    setCurrentSession(updatedSession)
    const updatedSessions = sessions.map(s => s.id === updatedSession.id ? updatedSession : s)
    setSessions(updatedSessions)
    
    // Save to local storage immediately
    localStorage.setItem('geneVision_sessions', JSON.stringify(updatedSessions))

    try {
      // Try to update in Firebase
      if (currentUser && !currentSession.id.startsWith('local_')) {
        await updateDoc(doc(db, 'analysisSessions', currentSession.id), {
          results: updatedSession.results,
          updatedAt: updatedSession.updatedAt
        })
      }
    } catch (error) {
      console.error('Error syncing result to Firebase:', error)
      // Don't show error toast, result is already saved locally
    }
  }

  const updateSession = (updates: Partial<AnalysisSession>) => {
    if (!currentSession) return

    const now = new Date()
    const updatedSession = {
      ...currentSession,
      ...updates,
      updatedAt: now,
    }
    setCurrentSession(updatedSession)
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s))
  }

  const clearSession = () => {
    setCurrentSession(null)
  }

  const value: AnalysisContextType = {
    currentSession,
    sessions,
    loading,
    createSession,
    loadSession,
    addSequence,
    removeSequence,
    addResult,
    updateSession,
    clearSession,
  }

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  )
}