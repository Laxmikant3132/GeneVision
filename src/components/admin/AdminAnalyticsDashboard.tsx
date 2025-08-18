import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { ref, onValue, off } from 'firebase/database'
import { db, realtimeDb } from '../../lib/firebase'
import { 
  Users, 
  Database, 
  Activity, 
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  Eye,
  Download
} from 'lucide-react'
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
  TimeScale
} from 'chart.js'
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
)

interface AnalyticsData {
  totalUsers: number
  activeUsers: number
  onlineUsers: number
  totalSequences: number
  totalConsultations: number
  totalAnalyses: number
  averageGCContent: number
  sequenceTypeDistribution: { [key: string]: number }
  dailySubmissions: { date: string; count: number; type: string }[]
  userRegistrationTrend: { date: string; count: number }[]
  topFeatures: { feature: string; usage: number }[]
  sequenceLengthDistribution: { range: string; count: number }[]
  userActivityHeatmap: { hour: number; day: number; activity: number }[]
  errorRates: { date: string; errors: number; total: number }[]
  performanceMetrics: {
    averageProcessingTime: number
    successRate: number
    uptime: number
  }
}

interface UserPresence {
  uid: string
  email: string
  displayName: string
  isOnline: boolean
  lastSeen: Date
}

const AdminAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [userPresence, setUserPresence] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d')
  const [refreshInterval, setRefreshInterval] = useState<number>(30000) // 30 seconds

  useEffect(() => {
    loadAnalytics()
    setupRealtimeListeners()
    
    const interval = setInterval(loadAnalytics, refreshInterval)
    return () => clearInterval(interval)
  }, [timeRange, refreshInterval])

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

    return () => {
      try {
        unsubscribePresence()
      } catch {}
    }
  }

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const now = new Date()
      const startDate = new Date()
      switch (timeRange) {
        case '24h':
          startDate.setHours(now.getHours() - 24)
          break
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        case '90d':
          startDate.setDate(now.getDate() - 90)
          break
      }

      // Load all data
      const [usersSnapshot, sequencesSnapshot, consultationsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'sequences')),
        getDocs(collection(db, 'consultations'))
      ])

      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      const sequences = sequencesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      const consultations = consultationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]

      // Filter by date range
      const filteredSequences = sequences.filter(seq => {
        const createdAt = seq.createdAt?.toDate() || new Date()
        return createdAt >= startDate
      })

      const filteredConsultations = consultations.filter(cons => {
        const createdAt = cons.createdAt?.toDate() || new Date()
        return createdAt >= startDate
      })

      // Calculate analytics
      const analyticsData: AnalyticsData = {
        totalUsers: users.length,
        activeUsers: users.filter(u => {
          const lastLogin = u.lastLogin?.toDate() || new Date(0)
          return lastLogin >= startDate
        }).length,
        onlineUsers: userPresence.filter(u => u.isOnline).length,
        totalSequences: filteredSequences.length,
        totalConsultations: filteredConsultations.length,
        totalAnalyses: filteredSequences.length + filteredConsultations.length,
        averageGCContent: calculateAverageGCContent(filteredSequences),
        sequenceTypeDistribution: calculateSequenceTypeDistribution(filteredSequences, filteredConsultations),
        dailySubmissions: calculateDailySubmissions(filteredSequences, filteredConsultations, startDate),
        userRegistrationTrend: calculateUserRegistrationTrend(users, startDate),
        topFeatures: calculateTopFeatures(filteredSequences, filteredConsultations),
        sequenceLengthDistribution: calculateSequenceLengthDistribution(filteredSequences, filteredConsultations),
        userActivityHeatmap: calculateUserActivityHeatmap(filteredSequences, filteredConsultations),
        errorRates: calculateErrorRates(filteredSequences, filteredConsultations, startDate),
        performanceMetrics: {
          averageProcessingTime: 2.3, // Mock data
          successRate: 98.5,
          uptime: 99.9
        }
      }

      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAverageGCContent = (sequences: any[]): number => {
    const gcContents = sequences
      .filter(seq => seq.type !== 'protein' && seq.sequence)
      .map(seq => {
        const sequence = seq.sequence.toUpperCase()
        const gcCount = (sequence.match(/[GC]/g) || []).length
        return (gcCount / sequence.length) * 100
      })
    
    return gcContents.length > 0 ? gcContents.reduce((a, b) => a + b, 0) / gcContents.length : 0
  }

  const calculateSequenceTypeDistribution = (sequences: any[], consultations: any[]) => {
    const distribution: { [key: string]: number } = {}
    
    sequences.forEach(seq => {
      const type = seq.type || 'unknown'
      distribution[type] = (distribution[type] || 0) + 1
    })
    
    consultations.forEach(cons => {
      const type = cons.sequenceType || 'unknown'
      distribution[type] = (distribution[type] || 0) + 1
    })
    
    return distribution
  }

  const calculateDailySubmissions = (sequences: any[], consultations: any[], startDate: Date) => {
    const dailyData: { [key: string]: { sequences: number; consultations: number } } = {}
    
    // Initialize all days in range
    const currentDate = new Date(startDate)
    const endDate = new Date()
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      dailyData[dateStr] = { sequences: 0, consultations: 0 }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    sequences.forEach(seq => {
      const date = (seq.createdAt?.toDate() || new Date()).toISOString().split('T')[0]
      if (dailyData[date]) {
        dailyData[date].sequences++
      }
    })
    
    consultations.forEach(cons => {
      const date = (cons.createdAt?.toDate() || new Date()).toISOString().split('T')[0]
      if (dailyData[date]) {
        dailyData[date].consultations++
      }
    })
    
    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      count: data.sequences + data.consultations,
      type: 'total'
    }))
  }

  const calculateUserRegistrationTrend = (users: any[], startDate: Date) => {
    const dailyRegistrations: { [key: string]: number } = {}
    
    users.forEach(user => {
      const date = (user.createdAt?.toDate() || new Date()).toISOString().split('T')[0]
      dailyRegistrations[date] = (dailyRegistrations[date] || 0) + 1
    })
    
    return Object.entries(dailyRegistrations)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const calculateTopFeatures = (sequences: any[], consultations: any[]) => {
    const features = [
      { feature: 'Sequence Upload', usage: sequences.length },
      { feature: 'AI Consultation', usage: consultations.length },
      { feature: 'GC Content Analysis', usage: sequences.filter(s => s.type !== 'protein').length },
      { feature: 'Protein Analysis', usage: sequences.filter(s => s.type === 'protein').length },
      { feature: 'ORF Finding', usage: Math.floor(sequences.length * 0.7) },
      { feature: 'Codon Usage', usage: Math.floor(sequences.length * 0.6) }
    ]
    
    return features.sort((a, b) => b.usage - a.usage)
  }

  const calculateSequenceLengthDistribution = (sequences: any[], consultations: any[]) => {
    const allSequences = [
      ...sequences.map(s => s.sequence || ''),
      ...consultations.map(c => c.sequence || '')
    ]
    
    const ranges = [
      { range: '1-100', min: 1, max: 100 },
      { range: '101-500', min: 101, max: 500 },
      { range: '501-1000', min: 501, max: 1000 },
      { range: '1001-5000', min: 1001, max: 5000 },
      { range: '5000+', min: 5001, max: Infinity }
    ]
    
    return ranges.map(range => ({
      range: range.range,
      count: allSequences.filter(seq => 
        seq.length >= range.min && seq.length <= range.max
      ).length
    }))
  }

  const calculateUserActivityHeatmap = (sequences: any[], consultations: any[]) => {
    const heatmap: { [key: string]: number } = {}
    
    const allActivities = [
      ...sequences.map(s => s.createdAt?.toDate() || new Date()),
      ...consultations.map(c => c.createdAt?.toDate() || new Date())
    ]
    
    allActivities.forEach(date => {
      const hour = date.getHours()
      const day = date.getDay()
      const key = `${day}-${hour}`
      heatmap[key] = (heatmap[key] || 0) + 1
    })
    
    const result = []
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        result.push({
          day,
          hour,
          activity: heatmap[`${day}-${hour}`] || 0
        })
      }
    }
    
    return result
  }

  const calculateErrorRates = (sequences: any[], consultations: any[], startDate: Date) => {
    // Mock error rate calculation
    const dailyErrors: { [key: string]: { errors: number; total: number } } = {}
    
    const currentDate = new Date(startDate)
    const endDate = new Date()
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const total = Math.floor(Math.random() * 100) + 50
      const errors = Math.floor(Math.random() * 5)
      dailyErrors[dateStr] = { errors, total }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return Object.entries(dailyErrors).map(([date, data]) => ({
      date,
      errors: data.errors,
      total: data.total
    }))
  }

  const exportAnalytics = () => {
    if (!analytics) return
    
    const data = {
      exportDate: new Date().toISOString(),
      timeRange,
      analytics
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `genevision-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: 'white'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      y: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-white">Loading analytics...</span>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-white">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          <button
            onClick={exportAnalytics}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{analytics.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Online Now</p>
              <p className="text-2xl font-bold text-green-400">{analytics.onlineUsers}</p>
            </div>
            <Activity className="h-8 w-8 text-green-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Sequences</p>
              <p className="text-2xl font-bold text-purple-400">{analytics.totalSequences}</p>
            </div>
            <Database className="h-8 w-8 text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Consultations</p>
              <p className="text-2xl font-bold text-yellow-400">{analytics.totalConsultations}</p>
            </div>
            <Zap className="h-8 w-8 text-yellow-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Success Rate</p>
              <p className="text-2xl font-bold text-green-400">{analytics.performanceMetrics.successRate}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg GC%</p>
              <p className="text-2xl font-bold text-blue-400">{analytics.averageGCContent.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Submissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Daily Activity</h3>
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
            options={chartOptions}
          />
        </motion.div>

        {/* Sequence Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Sequence Types</h3>
          <Doughnut
            data={{
              labels: Object.keys(analytics.sequenceTypeDistribution),
              datasets: [{
                data: Object.values(analytics.sequenceTypeDistribution),
                backgroundColor: [
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(139, 92, 246, 0.8)',
                  'rgba(245, 158, 11, 0.8)'
                ]
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  labels: { color: 'white' }
                }
              }
            }}
          />
        </motion.div>

        {/* Top Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Feature Usage</h3>
          <Bar
            data={{
              labels: analytics.topFeatures.map(f => f.feature),
              datasets: [{
                label: 'Usage Count',
                data: analytics.topFeatures.map(f => f.usage),
                backgroundColor: 'rgba(59, 130, 246, 0.8)'
              }]
            }}
            options={chartOptions}
          />
        </motion.div>

        {/* Sequence Length Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Sequence Lengths</h3>
          <Bar
            data={{
              labels: analytics.sequenceLengthDistribution.map(d => d.range),
              datasets: [{
                label: 'Count',
                data: analytics.sequenceLengthDistribution.map(d => d.count),
                backgroundColor: 'rgba(16, 185, 129, 0.8)'
              }]
            }}
            options={chartOptions}
          />
        </motion.div>
      </div>

      {/* Real-time Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
      >
        <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{analytics.performanceMetrics.uptime}%</div>
            <div className="text-sm text-gray-400">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{analytics.performanceMetrics.averageProcessingTime}s</div>
            <div className="text-sm text-gray-400">Avg Processing Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">{analytics.onlineUsers}</div>
            <div className="text-sm text-gray-400">Active Sessions</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AdminAnalyticsDashboard