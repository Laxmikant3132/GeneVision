import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useUserPresence } from '../../hooks/useUserPresence'
import { useRealtimeAnalytics } from '../../hooks/useRealtimeAnalytics'
import { notificationSystem } from '../../utils/notificationSystem'
import { activityTracker, trackFeatureUsage } from '../../utils/activityTracker'
import { 
  Dna, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Bell, 
  Activity,
  TrendingUp,
  Clock,
  Shield,
  Database,
  Zap,
  Eye,
  Download,
  Settings
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalAnalyses: number
  recentAnalyses: number
  favoriteSequenceType: string
  avgAnalysisTime: number
}

const EnhancedDashboard: React.FC = () => {
  const { currentUser, userProfile } = useAuth()
  const { onlineUsers, getOnlineCount, getTotalUsers } = useUserPresence()
  const { analytics, loading: analyticsLoading } = useRealtimeAnalytics()
  
  const [userStats, setUserStats] = useState<DashboardStats>({
    totalAnalyses: 0,
    recentAnalyses: 0,
    favoriteSequenceType: 'DNA',
    avgAnalysisTime: 0
  })
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    if (currentUser) {
      // Track dashboard view
      activityTracker.trackPageView('/dashboard')
      trackFeatureUsage('dashboard', 'view')
      
      // Load user notifications
      const unsubscribe = notificationSystem.listenToUserNotifications(
        currentUser.uid,
        setNotifications
      )

      // Load user statistics (mock data for now)
      loadUserStatistics()
      
      return () => {
        unsubscribe()
      }
    }
  }, [currentUser])

  const loadUserStatistics = async () => {
    // In a real implementation, this would fetch from Firestore
    // For now, we'll use mock data
    setUserStats({
      totalAnalyses: userProfile?.analysisCount || 0,
      recentAnalyses: Math.floor(Math.random() * 10),
      favoriteSequenceType: 'DNA',
      avgAnalysisTime: 2.3
    })

    // Mock recent activity
    setRecentActivity([
      {
        id: '1',
        action: 'Sequence Analysis',
        type: 'DNA',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: '2',
        action: 'Specialist Consultation',
        type: 'Protein',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: '3',
        action: 'Data Export',
        type: 'CSV',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'completed'
      }
    ])
  }

  const quickActions = [
    {
      title: 'New Analysis',
      description: 'Analyze DNA, RNA, or protein sequences',
      icon: Dna,
      link: '/analysis',
      color: 'from-blue-500 to-blue-600',
      action: () => trackFeatureUsage('quick_action', 'new_analysis')
    },
    {
      title: 'Specialist Consultation',
      description: 'Get AI-powered bioinformatics insights',
      icon: MessageSquare,
      link: '/specialist',
      color: 'from-purple-500 to-purple-600',
      action: () => trackFeatureUsage('quick_action', 'specialist_consultation')
    },
    {
      title: 'View Results',
      description: 'Browse your analysis history',
      icon: BarChart3,
      link: '/results',
      color: 'from-green-500 to-green-600',
      action: () => trackFeatureUsage('quick_action', 'view_results')
    },
    {
      title: 'Profile Settings',
      description: 'Manage your account and preferences',
      icon: Settings,
      link: '/profile',
      color: 'from-orange-500 to-orange-600',
      action: () => trackFeatureUsage('quick_action', 'profile_settings')
    }
  ]

  const renderSystemStatus = () => (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Activity className="h-5 w-5 mr-2" />
        System Status
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Database</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-green-400 text-sm">Operational</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Analysis Engine</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-green-400 text-sm">Operational</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">AI Services</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-yellow-400 text-sm">Maintenance</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Users Online</span>
          <span className="text-white font-medium">{getOnlineCount()}</span>
        </div>
      </div>
    </div>
  )

  const renderRecentActivity = () => (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Clock className="h-5 w-5 mr-2" />
        Recent Activity
      </h3>
      <div className="space-y-3">
        {recentActivity.length === 0 ? (
          <p className="text-gray-400 text-sm">No recent activity</p>
        ) : (
          recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'completed' ? 'bg-green-400' : 
                  activity.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                <div>
                  <p className="text-white text-sm font-medium">{activity.action}</p>
                  <p className="text-gray-400 text-xs">{activity.type}</p>
                </div>
              </div>
              <span className="text-gray-400 text-xs">
                {activity.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const renderNotifications = () => (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {showNotifications && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 top-12 w-80 bg-gray-900 border border-white/20 rounded-xl shadow-xl z-50"
        >
          <div className="p-4 border-b border-white/20">
            <h3 className="text-white font-semibold">Notifications</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="p-4 border-b border-white/10 hover:bg-white/5">
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notification.type === 'error' ? 'bg-red-400' :
                      notification.type === 'warning' ? 'bg-yellow-400' :
                      notification.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{notification.title}</p>
                      <p className="text-gray-400 text-xs">{notification.message}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {notification.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  )

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
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {userProfile?.displayName || 'User'}!
            </h1>
            <p className="text-gray-300">
              Here's what's happening with your bioinformatics analyses
            </p>
          </div>
          {renderNotifications()}
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-medium">Total Analyses</p>
                <p className="text-white text-2xl font-bold">{userStats.totalAnalyses}</p>
              </div>
              <Dna className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm font-medium">This Week</p>
                <p className="text-white text-2xl font-bold">{userStats.recentAnalyses}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm font-medium">Favorite Type</p>
                <p className="text-white text-2xl font-bold">{userStats.favoriteSequenceType}</p>
              </div>
              <Database className="h-8 w-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-300 text-sm font-medium">Avg Time</p>
                <p className="text-white text-2xl font-bold">{userStats.avgAnalysisTime}s</p>
              </div>
              <Zap className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                onClick={action.action}
                className="group"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`bg-gradient-to-r ${action.color} p-6 rounded-xl text-white hover:shadow-lg transition-all duration-200`}
                >
                  <action.icon className="h-8 w-8 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            {renderRecentActivity()}
          </motion.div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {renderSystemStatus()}
          </motion.div>
        </div>

        {/* Admin Panel Link (if admin) */}
        {currentUser?.email === 'laxmikanttalli303@gmail.com' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Link
              to="/admin"
              onClick={() => trackFeatureUsage('admin_access', 'dashboard_link')}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105"
            >
              <Shield className="h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default EnhancedDashboard