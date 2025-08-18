import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { ref, onValue, off } from 'firebase/database'
import { db, realtimeDb } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { calculateGCContent } from '../utils/bioinformatics'
import { 
  Download, 
  Trash2, 
  ArrowUpDown, 
  ArrowLeft, 
  Users, 
  Database, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Mail,
  Shield,
  UserCheck,
  UserX,
  Eye,
  Calendar,
  Clock,
  MessageSquare
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ADMIN_EMAIL } from '../config/appConfig'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

interface SequenceRecord {
  id: string
  uid: string
  email: string
  sequence: string
  type: 'dna' | 'rna' | 'protein'
  gcContent?: number
  createdAt: Date
  status: 'approved' | 'pending' | 'flagged' | 'rejected'
  flagReason?: string
}

interface UserRecord {
  uid: string
  email: string
  displayName: string
  createdAt: Date
  lastLogin: Date
  analysisCount: number
  subscription: 'free' | 'pro' | 'enterprise'
  status: 'active' | 'suspended'
  role: 'user' | 'moderator' | 'admin'
}

interface UserPresence {
  uid: string
  email: string
  displayName: string
  isOnline: boolean
  lastSeen: Date
}

interface ConsultationRecord {
  id: string
  userId: string
  userEmail: string
  sequence: string
  sequenceType: 'dna' | 'rna' | 'protein'
  question: string
  createdAt: Date
  status: 'completed' | 'flagged'
}

interface AnalyticsData {
  totalUsers: number
  activeUsers: number
  totalSequences: number
  totalConsultations: number
  averageGCContent: number
  sequenceTypeDistribution: { [key: string]: number }
  dailySubmissions: { date: string; count: number }[]
  codonUsageFrequency: { [key: string]: number }
  sequenceLengthDistribution: { range: string; count: number }[]
  userRegistrationTrend: { date: string; count: number }[]
}

const EnhancedAdminPanel: React.FC = () => {
  const { currentUser, userProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sequences' | 'consultations' | 'analytics'>('overview')
  
  // Data states
  const [sequences, setSequences] = useState<SequenceRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([])
  const [userPresence, setUserPresence] = useState<UserPresence[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  
  // Filter and search states
  const [sequenceSearch, setSequenceSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [consultationSearch, setConsultationSearch] = useState('')
  const [sequenceFilter, setSequenceFilter] = useState<'all' | 'approved' | 'pending' | 'flagged' | 'rejected'>('all')
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'suspended' | 'online'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  
  // Sort states
  const [sequenceSortKey, setSequenceSortKey] = useState<'email' | 'type' | 'gc' | 'date' | 'status'>('date')
  const [sequenceSortDir, setSequenceSortDir] = useState<'asc' | 'desc'>('desc')
  const [userSortKey, setUserSortKey] = useState<'email' | 'name' | 'date' | 'login' | 'count'>('date')
  const [userSortDir, setUserSortDir] = useState<'asc' | 'desc'>('desc')

  const isAdmin = currentUser?.email === ADMIN_EMAIL || userProfile?.role === 'admin' || userProfile?.role === 'moderator'

  // Load all data
  useEffect(() => {
    if (isAdmin) {
      loadAllData()
      const cleanup = setupRealtimeListeners()
      return cleanup
    }
  }, [isAdmin])

  const loadAllData = async () => {
    console.log('Loading admin data...')
    setLoading(true)
    try {
      // Load data first
      console.log('Loading sequences, users, and consultations...')
      await Promise.all([
        loadSequences(),
        loadUsers(),
        loadConsultations()
      ])
      console.log('Data loaded, calculating analytics...')
      // Then calculate analytics based on loaded data
      await loadAnalytics()
      console.log('Admin data loading complete')
    } catch (error) {
      console.error('Error loading admin data:', error)
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeListeners = () => {
    // Listen to user presence
    const presenceRef = ref(realtimeDb, 'presence')
    const unsubscribePresence = onValue(presenceRef, (snapshot) => {
      const presenceData = snapshot.val()
      const presenceList: UserPresence[] = []
      
      if (presenceData) {
        Object.values(presenceData).forEach((userData: any) => {
          presenceList.push({
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            isOnline: userData.isOnline,
            lastSeen: userData.lastSeen ? new Date(userData.lastSeen) : new Date()
          })
        })
      }
      
      setUserPresence(presenceList)
    })

    // Return cleanup function
    return () => {
      try {
        unsubscribePresence()
      } catch {}
    }
  }

  const loadSequences = async () => {
    try {
      const q = query(collection(db, 'sequences'))
      const snapshot = await getDocs(q)
      const sequenceList: SequenceRecord[] = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        const createdAt = data.createdAt?.toDate() || new Date()
        const gcContent = data.type !== 'protein' ? calculateGCContent(data.sequence, data.type).gcContent : undefined
        
        sequenceList.push({
          id: doc.id,
          uid: data.uid,
          email: data.email || 'unknown',
          sequence: data.sequence,
          type: data.type,
          gcContent,
          createdAt,
          status: data.status || 'pending',
          flagReason: data.flagReason
        })
      })
      
      setSequences(sequenceList)
    } catch (error) {
      console.error('Error loading sequences:', error)
    }
  }

  const loadUsers = async () => {
    const deriveFromActivity = async (): Promise<UserRecord[]> => {
      const [consultationsSnapshot, sequencesSnapshot] = await Promise.all([
        getDocs(collection(db, 'consultations')),
        getDocs(collection(db, 'sequences'))
      ])

      const uniqueUsers = new Map<string, UserRecord>()

      // From consultations
      consultationsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.userId && data.userEmail && !uniqueUsers.has(data.userId)) {
          uniqueUsers.set(data.userId, {
            uid: data.userId,
            email: data.userEmail,
            displayName: data.userEmail.split('@')[0],
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLogin: data.createdAt?.toDate() || new Date(),
            analysisCount: 1,
            subscription: 'free',
            status: 'active',
            role: 'user'
          })
        } else if (uniqueUsers.has(data.userId)) {
          const user = uniqueUsers.get(data.userId)!
          user.analysisCount += 1
        }
      })

      // From sequences
      sequencesSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.uid && data.email && !uniqueUsers.has(data.uid)) {
          uniqueUsers.set(data.uid, {
            uid: data.uid,
            email: data.email,
            displayName: data.email.split('@')[0],
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLogin: data.createdAt?.toDate() || new Date(),
            analysisCount: 1,
            subscription: 'free',
            status: 'active',
            role: 'user'
          })
        }
      })

      return Array.from(uniqueUsers.values())
    }

    try {
      // Try to load from users collection
      const usersQuery = query(collection(db, 'users'))
      const usersSnapshot = await getDocs(usersQuery)
      const userList: UserRecord[] = []

      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        userList.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLogin: data.lastLogin?.toDate() || new Date(),
          analysisCount: data.analysisCount || 0,
          subscription: data.subscription || 'free',
          status: data.status || 'active',
          role: data.role || 'user'
        })
      })

      // Fallback if empty
      if (userList.length === 0) {
        const fallback = await deriveFromActivity()
        setUsers(fallback)
        return
      }

      setUsers(userList)
    } catch (error) {
      console.error('Error loading users (will fallback):', error)
      // Permission or other error: fallback
      try {
        const fallback = await deriveFromActivity()
        setUsers(fallback)
      } catch (e) {
        console.error('User fallback also failed:', e)
      }
    }
  }

  const loadConsultations = async () => {
    console.log('Loading consultations for admin...')
    try {
      // Try without orderBy first to avoid index issues
      const q = query(collection(db, 'consultations'))
      const snapshot = await getDocs(q)
      const consultationList: ConsultationRecord[] = []
      
      console.log('Found', snapshot.size, 'consultations in admin')
      snapshot.forEach((doc) => {
        const data = doc.data()
        console.log('Admin consultation data:', data)
        consultationList.push({
          id: doc.id,
          userId: data.userId,
          userEmail: data.userEmail,
          sequence: data.sequence,
          sequenceType: data.sequenceType,
          question: data.question,
          createdAt: data.createdAt?.toDate() || new Date(),
          status: data.status || 'completed'
        })
      })
      
      console.log('Setting admin consultations:', consultationList)
      setConsultations(consultationList)
    } catch (error) {
      console.error('Error loading consultations:', error)
    }
  }

  const loadAnalytics = async () => {
    try {
      // Get fresh data for analytics calculation
      const [sequencesSnapshot, usersSnapshot, consultationsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'sequences'))),
        getDocs(query(collection(db, 'users'))),
        getDocs(query(collection(db, 'consultations')))
      ])

      const sequenceData = sequencesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      const userData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      const consultationData = consultationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]

      const totalUsers = userData.length
      const activeUsers = userPresence.filter(u => u.isOnline).length
      const totalSequences = sequenceData.length
      const totalConsultations = consultationData.length
      
      // Calculate average GC content from fresh data
      const gcContents = sequenceData
        .filter(s => s.type !== 'protein' && s.sequence)
        .map(s => calculateGCContent(s.sequence, s.type).gcContent)
      const averageGCContent = gcContents.length > 0 ? gcContents.reduce((a, b) => a + b, 0) / gcContents.length : 0
      
      // Sequence type distribution
      const sequenceTypeDistribution = sequenceData.reduce((acc, seq) => {
        acc[seq.type] = (acc[seq.type] || 0) + 1
        return acc
      }, {} as { [key: string]: number })
      
      // Daily submissions (last 7 days)
      const dailySubmissions = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const count = sequenceData.filter(s => {
          const seqDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt)
          return seqDate.toISOString().split('T')[0] === dateStr
        }).length
        dailySubmissions.push({ date: dateStr, count })
      }
      
      // Sequence length distribution
      const sequenceLengthDistribution = [
        { range: '1-100', count: sequenceData.filter(s => s.sequence && s.sequence.length <= 100).length },
        { range: '101-500', count: sequenceData.filter(s => s.sequence && s.sequence.length > 100 && s.sequence.length <= 500).length },
        { range: '501-1000', count: sequenceData.filter(s => s.sequence && s.sequence.length > 500 && s.sequence.length <= 1000).length },
        { range: '1000+', count: sequenceData.filter(s => s.sequence && s.sequence.length > 1000).length }
      ]

      // User registration trend (last 7 days)
      const userRegistrationTrend = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const count = userData.filter(u => {
          const userDate = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt)
          return userDate.toISOString().split('T')[0] === dateStr
        }).length
        userRegistrationTrend.push({ date: dateStr, count })
      }
      
      setAnalytics({
        totalUsers,
        activeUsers,
        totalSequences,
        totalConsultations,
        averageGCContent,
        sequenceTypeDistribution,
        dailySubmissions,
        codonUsageFrequency: {}, // Would be calculated from actual codon analysis
        sequenceLengthDistribution,
        userRegistrationTrend
      })
    } catch (error) {
      console.error('Error calculating analytics:', error)
    }
  }

  // Filter functions
  const filteredSequences = useMemo(() => {
    let filtered = sequences
    
    // Search filter
    if (sequenceSearch) {
      const search = sequenceSearch.toLowerCase()
      filtered = filtered.filter(s => 
        s.email.toLowerCase().includes(search) ||
        s.sequence.toLowerCase().includes(search) ||
        s.type.toLowerCase().includes(search)
      )
    }
    
    // Status filter
    if (sequenceFilter !== 'all') {
      filtered = filtered.filter(s => s.status === sequenceFilter)
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
      }
      
      filtered = filtered.filter(s => s.createdAt >= filterDate)
    }
    
    // Sort
    return filtered.sort((a, b) => {
      const dir = sequenceSortDir === 'asc' ? 1 : -1
      switch (sequenceSortKey) {
        case 'email':
          return a.email.localeCompare(b.email) * dir
        case 'type':
          return a.type.localeCompare(b.type) * dir
        case 'gc':
          return ((a.gcContent ?? -1) - (b.gcContent ?? -1)) * dir
        case 'status':
          return a.status.localeCompare(b.status) * dir
        default:
          return (a.createdAt.getTime() - b.createdAt.getTime()) * dir
      }
    })
  }, [sequences, sequenceSearch, sequenceFilter, dateFilter, sequenceSortKey, sequenceSortDir])

  const filteredUsers = useMemo(() => {
    let filtered = users
    
    // Search filter
    if (userSearch) {
      const search = userSearch.toLowerCase()
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(search) ||
        u.displayName.toLowerCase().includes(search)
      )
    }
    
    // Status filter
    if (userFilter === 'online') {
      const onlineUserIds = userPresence.filter(p => p.isOnline).map(p => p.uid)
      filtered = filtered.filter(u => onlineUserIds.includes(u.uid))
    } else if (userFilter !== 'all') {
      filtered = filtered.filter(u => u.status === userFilter)
    }
    
    // Sort
    return filtered.sort((a, b) => {
      const dir = userSortDir === 'asc' ? 1 : -1
      switch (userSortKey) {
        case 'email':
          return a.email.localeCompare(b.email) * dir
        case 'name':
          return a.displayName.localeCompare(b.displayName) * dir
        case 'login':
          return (a.lastLogin.getTime() - b.lastLogin.getTime()) * dir
        case 'count':
          return (a.analysisCount - b.analysisCount) * dir
        default:
          return (a.createdAt.getTime() - b.createdAt.getTime()) * dir
      }
    })
  }, [users, userPresence, userSearch, userFilter, userSortKey, userSortDir])

  // Action functions
  const updateSequenceStatus = async (id: string, status: SequenceRecord['status'], flagReason?: string) => {
    try {
      await updateDoc(doc(db, 'sequences', id), { 
        status, 
        flagReason: flagReason || null,
        updatedAt: new Date()
      })
      
      setSequences(prev => prev.map(s => 
        s.id === id ? { ...s, status, flagReason } : s
      ))
      
      toast.success(`Sequence ${status}`)
    } catch (error) {
      console.error('Error updating sequence status:', error)
      toast.error('Failed to update sequence status')
    }
  }

  const updateUserStatus = async (uid: string, status: UserRecord['status']) => {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        status,
        updatedAt: new Date()
      })
      
      setUsers(prev => prev.map(u => 
        u.uid === uid ? { ...u, status } : u
      ))
      
      toast.success(`User ${status}`)
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const deleteSequence = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sequence?')) return
    
    try {
      await deleteDoc(doc(db, 'sequences', id))
      setSequences(prev => prev.filter(s => s.id !== id))
      toast.success('Sequence deleted')
    } catch (error) {
      console.error('Error deleting sequence:', error)
      toast.error('Failed to delete sequence')
    }
  }

  const exportData = (data: any[], filename: string) => {
    if (!data.length) {
      toast.error('No data to export')
      return
    }
    
    const headers = Object.keys(data[0])
    const csvRows = [headers.join(',')]
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header]
        const stringValue = typeof value === 'string' ? value : 
                           value instanceof Date ? value.toISOString() : 
                           value?.toString() ?? ''
        return `"${stringValue.replace(/"/g, '""')}"`
      })
      csvRows.push(values.join(','))
    }
    
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Data exported successfully')
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm font-medium">Total Users</p>
              <p className="text-white text-2xl font-bold">{analytics?.totalUsers || 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-400">
              {userPresence.filter(u => u.isOnline).length} online
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-500/10 to-green-600/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm font-medium">Total Sequences</p>
              <p className="text-white text-2xl font-bold">{analytics?.totalSequences || 0}</p>
            </div>
            <Database className="h-8 w-8 text-green-400" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-yellow-400">
              {sequences.filter(s => s.status === 'pending').length} pending
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm font-medium">Consultations</p>
              <p className="text-white text-2xl font-bold">{analytics?.totalConsultations || 0}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-purple-400" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-red-400">
              {consultations.filter(c => c.status === 'flagged').length} flagged
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-300 text-sm font-medium">Avg GC Content</p>
              <p className="text-white text-2xl font-bold">
                {analytics?.averageGCContent ? `${analytics.averageGCContent.toFixed(1)}%` : 'N/A'}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-400" />
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Submissions Chart */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Submissions (Last 7 Days)</h3>
          {analytics?.dailySubmissions && (
            <Line
              data={{
                labels: analytics.dailySubmissions.map(d => new Date(d.date).toLocaleDateString()),
                datasets: [{
                  label: 'Submissions',
                  data: analytics.dailySubmissions.map(d => d.count),
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }}
            />
          )}
        </div>

        {/* Sequence Type Distribution */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Sequence Type Distribution</h3>
          {analytics?.sequenceTypeDistribution && (
            <Pie
              data={{
                labels: Object.keys(analytics.sequenceTypeDistribution).map(k => k.toUpperCase()),
                datasets: [{
                  data: Object.values(analytics.sequenceTypeDistribution),
                  backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 101, 101, 0.8)'
                  ]
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom' }
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {sequences.slice(0, 5).map((seq) => (
            <div key={seq.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  seq.status === 'approved' ? 'bg-green-400' :
                  seq.status === 'pending' ? 'bg-yellow-400' :
                  seq.status === 'flagged' ? 'bg-red-400' : 'bg-gray-400'
                }`} />
                <span className="text-white text-sm">{seq.email}</span>
                <span className="text-gray-400 text-xs">submitted {seq.type.toUpperCase()} sequence</span>
              </div>
              <span className="text-gray-400 text-xs">{seq.createdAt.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderUsers = () => (
    <div className="space-y-6">
      {/* User Controls */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value as any)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="online">Currently Online</option>
          </select>
        </div>
        <button
          onClick={() => exportData(filteredUsers.map(u => ({
            email: u.email,
            displayName: u.displayName,
            status: u.status,
            role: u.role,
            subscription: u.subscription,
            analysisCount: u.analysisCount,
            createdAt: u.createdAt.toISOString(),
            lastLogin: u.lastLogin.toISOString()
          })), 'users.csv')}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export Users</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Analyses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredUsers.map((user) => {
                const presence = userPresence.find(p => p.uid === user.uid)
                return (
                  <tr key={user.uid} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${presence?.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white">{user.displayName}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.analysisCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.lastLogin.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {user.status === 'active' ? (
                          <button
                            onClick={() => updateUserStatus(user.uid, 'suspended')}
                            className="text-red-400 hover:text-red-300"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUserStatus(user.uid, 'active')}
                            className="text-green-400 hover:text-green-300"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderSequences = () => (
    <div className="space-y-6">
      {/* Sequence Controls */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={sequenceSearch}
              onChange={(e) => setSequenceSearch(e.target.value)}
              placeholder="Search sequences..."
              className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={sequenceFilter}
            onChange={(e) => setSequenceFilter(e.target.value as any)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Sequences</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <button
          onClick={() => exportData(filteredSequences.map(s => ({
            email: s.email,
            sequence: s.sequence,
            type: s.type,
            status: s.status,
            gcContent: s.gcContent || '',
            createdAt: s.createdAt.toISOString()
          })), 'sequences.csv')}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export Sequences</span>
        </button>
      </div>

      {/* Sequences Table */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Sequence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  GC%
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredSequences.map((sequence) => (
                <tr key={sequence.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {sequence.email}
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="text-sm text-gray-300 truncate font-mono">
                      {sequence.sequence.substring(0, 50)}...
                    </div>
                    <div className="text-xs text-gray-400">
                      Length: {sequence.sequence.length}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {sequence.type.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sequence.status === 'approved' ? 'bg-green-100 text-green-800' :
                      sequence.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      sequence.status === 'flagged' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sequence.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {sequence.gcContent?.toFixed(1) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {sequence.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {sequence.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateSequenceStatus(sequence.id, 'approved')}
                            className="text-green-400 hover:text-green-300"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for flagging:')
                              if (reason) updateSequenceStatus(sequence.id, 'flagged', reason)
                            }}
                            className="text-red-400 hover:text-red-300"
                            title="Flag"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteSequence(sequence.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sequence Length Distribution */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Sequence Length Distribution</h3>
          {analytics?.sequenceLengthDistribution && (
            <Bar
              data={{
                labels: analytics.sequenceLengthDistribution.map(d => d.range),
                datasets: [{
                  label: 'Count',
                  data: analytics.sequenceLengthDistribution.map(d => d.count),
                  backgroundColor: 'rgba(59, 130, 246, 0.8)'
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false }
                }
              }}
            />
          )}
        </div>

        {/* User Registration Trend */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">User Registration Trend</h3>
          {analytics?.userRegistrationTrend && (
            <Line
              data={{
                labels: analytics.userRegistrationTrend.map(d => new Date(d.date).toLocaleDateString()),
                datasets: [{
                  label: 'New Users',
                  data: analytics.userRegistrationTrend.map(d => d.count),
                  borderColor: 'rgb(34, 197, 94)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }}
            />
          )}
          {(!analytics?.userRegistrationTrend || analytics.userRegistrationTrend.every(d => d.count === 0)) && (
            <div className="text-center text-gray-400 py-8">
              <TrendingUp className="h-12 w-12 mx-auto mb-2" />
              <p>No user registrations in the last 7 days</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h4 className="text-lg font-semibold text-white mb-4">Sequence Statistics</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Total Sequences:</span>
              <span className="text-white font-medium">{sequences.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">DNA Sequences:</span>
              <span className="text-white font-medium">{sequences.filter(s => s.type === 'dna').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">RNA Sequences:</span>
              <span className="text-white font-medium">{sequences.filter(s => s.type === 'rna').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Protein Sequences:</span>
              <span className="text-white font-medium">{sequences.filter(s => s.type === 'protein').length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h4 className="text-lg font-semibold text-white mb-4">User Statistics</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Total Users:</span>
              <span className="text-white font-medium">{users.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Active Users:</span>
              <span className="text-white font-medium">{users.filter(u => u.status === 'active').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Online Now:</span>
              <span className="text-white font-medium">{userPresence.filter(u => u.isOnline).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Pro Users:</span>
              <span className="text-white font-medium">{users.filter(u => u.subscription === 'pro').length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h4 className="text-lg font-semibold text-white mb-4">System Health</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Pending Reviews:</span>
              <span className="text-yellow-400 font-medium">{sequences.filter(s => s.status === 'pending').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Flagged Items:</span>
              <span className="text-red-400 font-medium">{sequences.filter(s => s.status === 'flagged').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">System Status:</span>
              <span className="text-green-400 font-medium">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Enhanced Admin Panel</h1>
            <p className="text-gray-300">Comprehensive system management and analytics</p>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/15 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-xl p-1">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'users', label: 'Users', icon: Users },
              { key: 'sequences', label: 'Sequences', icon: Database },
              { key: 'consultations', label: 'Consultations', icon: MessageSquare },
              { key: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === key
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'users' && renderUsers()}
              {activeTab === 'sequences' && renderSequences()}
              {activeTab === 'consultations' && (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300">Consultation management coming soon</p>
                </div>
              )}
              {activeTab === 'analytics' && renderAnalytics()}
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default EnhancedAdminPanel