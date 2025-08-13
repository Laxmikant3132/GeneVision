import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useAnalysis } from '../contexts/AnalysisContext'
import { 
  Plus, 
  FlaskConical, 
  BarChart3, 
  Clock, 
  TrendingUp,
  Dna,
  Eye,
  Calendar,
  Activity
} from 'lucide-react'

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth()
  const { sessions } = useAnalysis()

  // Add error handling for missing data
  if (!sessions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    )
  }

  // Simple fallback if there are issues with the full dashboard
  const stats = [
    {
      label: 'Total Analyses',
      value: userProfile?.analysisCount || 0,
      icon: FlaskConical,
      color: 'from-blue-500 to-blue-600',
      change: '+12%'
    },
    {
      label: 'Active Sessions',
      value: sessions.length,
      icon: Activity,
      color: 'from-green-500 to-green-600',
      change: '+5%'
    },
    {
      label: 'Sequences Processed',
      value: sessions.reduce((total, session) => total + session.sequences.length, 0),
      icon: Dna,
      color: 'from-purple-500 to-purple-600',
      change: '+23%'
    },
    {
      label: 'Time Saved',
      value: '24h',
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
      change: '+8%'
    }
  ]

  const recentSessions = sessions.slice(0, 5)

  const formatDate = (value: any) => {
    try {
      if (value instanceof Date) return value.toLocaleDateString()
      // Firestore Timestamp
      if (value && typeof value === 'object' && 'seconds' in value) {
        return new Date((value as any).seconds * 1000).toLocaleDateString()
      }
      // ISO string or number
      const d = new Date(value)
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString()
    } catch {
      return ''
    }
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome back, {userProfile?.displayName || 'Researcher'}!
          </h1>
          <p className="text-gray-300 text-lg">
            Ready to analyze some sequences today?
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Link
            to="/analysis"
            className="group p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-200">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">New Analysis</h3>
                <p className="text-blue-100">Start analyzing sequences</p>
              </div>
            </div>
          </Link>

          <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <BarChart3 className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">View Results</h3>
                <p className="text-gray-300">Browse past analyses</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Insights</h3>
                <p className="text-gray-300">AI-powered recommendations</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-gradient-to-r ${stat.color} rounded-xl`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-green-400 text-sm font-medium">{stat.change}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-gray-300 text-sm">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Recent Sessions</h2>
              <Link
                to="/analysis"
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
              >
                View All
              </Link>
            </div>

            {recentSessions.length > 0 ? (
              <div className="space-y-4">
                {recentSessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <FlaskConical className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{session.name}</p>
                        <p className="text-gray-400 text-sm">
                          {session.sequences.length} sequences • {session.results.length} results
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(session.updatedAt)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No analysis sessions yet</p>
                <Link
                  to="/analysis"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  <span>Start Your First Analysis</span>
                </Link>
              </div>
            )}
          </motion.div>

          {/* Quick Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6">Quick Tips</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <h3 className="text-blue-300 font-medium mb-2">💡 Pro Tip</h3>
                <p className="text-blue-100 text-sm">
                  Use FASTA format for better sequence recognition and analysis accuracy.
                </p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <h3 className="text-green-300 font-medium mb-2">🚀 New Feature</h3>
                <p className="text-green-100 text-sm">
                  Try our new 3D protein structure viewer for interactive molecular visualization.
                </p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <h3 className="text-purple-300 font-medium mb-2">📊 Analysis Tip</h3>
                <p className="text-purple-100 text-sm">
                  Compare multiple sequences to identify conserved regions and mutations.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard