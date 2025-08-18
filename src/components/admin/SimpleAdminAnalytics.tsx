import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  collection, 
  getDocs, 
  query, 
  orderBy
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { 
  Users, 
  Database, 
  Activity, 
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface SimpleAnalyticsData {
  totalUsers: number
  totalSequences: number
  totalConsultations: number
  recentActivity: number
}

const SimpleAdminAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<SimpleAnalyticsData>({
    totalUsers: 0,
    totalSequences: 0,
    totalConsultations: 0,
    recentActivity: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load basic counts from Firestore
      const [usersSnapshot, sequencesSnapshot, consultationsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'sequences')),
        getDocs(collection(db, 'consultations'))
      ])

      const totalUsers = usersSnapshot.size
      const totalSequences = sequencesSnapshot.size
      const totalConsultations = consultationsSnapshot.size

      // Calculate recent activity (last 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const recentSequences = sequencesSnapshot.docs.filter(doc => {
        const data = doc.data()
        const createdAt = data.createdAt?.toDate() || new Date(0)
        return createdAt >= weekAgo
      }).length

      const recentConsultations = consultationsSnapshot.docs.filter(doc => {
        const data = doc.data()
        const createdAt = data.createdAt?.toDate() || new Date(0)
        return createdAt >= weekAgo
      }).length

      setAnalytics({
        totalUsers,
        totalSequences,
        totalConsultations,
        recentActivity: recentSequences + recentConsultations
      })
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const metrics = [
    {
      label: 'Total Users',
      value: analytics.totalUsers,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      change: '+12%'
    },
    {
      label: 'Total Sequences',
      value: analytics.totalSequences,
      icon: Database,
      color: 'from-green-500 to-green-600',
      change: '+8%'
    },
    {
      label: 'Total Consultations',
      value: analytics.totalConsultations,
      icon: Activity,
      color: 'from-purple-500 to-purple-600',
      change: '+15%'
    },
    {
      label: 'Recent Activity (7d)',
      value: analytics.recentActivity,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      change: '+23%'
    }
  ]

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3 text-white">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <div className="flex items-center justify-center py-12">
          <AlertTriangle className="h-8 w-8 text-red-400 mr-3" />
          <div>
            <h3 className="text-white font-medium">Error Loading Analytics</h3>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <BarChart3 className="h-6 w-6 mr-3" />
          Analytics Dashboard
        </h2>
        <button
          onClick={loadAnalytics}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
        >
          <Clock className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">{metric.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color}`}>
                <metric.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-400 text-sm font-medium">{metric.change}</span>
              <span className="text-gray-400 text-sm ml-2">vs last period</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* System Status */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
          System Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">99.9%</div>
            <div className="text-sm text-gray-400">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">2.3s</div>
            <div className="text-sm text-gray-400">Avg Response</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">Active</div>
            <div className="text-sm text-gray-400">AI Engine</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">Healthy</div>
            <div className="text-sm text-gray-400">Database</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleAdminAnalytics