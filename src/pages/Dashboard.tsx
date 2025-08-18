import React, { useEffect, useMemo, useState } from 'react'
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
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { calculateGCContent } from '../utils/bioinformatics'


interface UserSequence {
  id: string
  sequence: string
  type: 'dna' | 'rna' | 'protein'
  createdAt: Date
  gc?: number
}

const Dashboard: React.FC = () => {
  const { userProfile, currentUser } = useAuth()
  const { sessions } = useAnalysis()
  const [consultations, setConsultations] = useState<any[]>([])

  const [userSequences, setUserSequences] = useState<UserSequence[]>([])
  const [seqLoading, setSeqLoading] = useState(false)

  // Fetch this user's previously submitted sequences (persistent)
  useEffect(() => {
    const load = async () => {
      if (!currentUser) return
      setSeqLoading(true)
      try {
        const q = query(
          collection(db, 'sequences'),
          where('uid', '==', currentUser.uid)
        )
        const snap = await getDocs(q)
        const rows: UserSequence[] = []
        snap.forEach((d) => {
          const data = d.data() as any
          const created = data.createdAt?.toDate?.() || new Date()
          const gc = data.type !== 'protein' ? calculateGCContent(data.sequence, data.type).gcContent : undefined
          rows.push({ id: d.id, sequence: data.sequence, type: data.type, createdAt: created, gc })
        })
        // Sort client-side by createdAt desc
        rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        setUserSequences(rows)

        // Also load consultations directly
        const consultQuery = query(
          collection(db, 'consultations'),
          where('userId', '==', currentUser.uid)
        )
        const consultSnap = await getDocs(consultQuery)
        const consultRows: any[] = []
        consultSnap.forEach((d) => {
          const data = d.data()
          consultRows.push({
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date()
          })
        })
        consultRows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        setConsultations(consultRows)
        console.log('Dashboard loaded consultations:', consultRows)

      } catch (e) {
        console.error('Dashboard loading error:', e)
      } finally {
        setSeqLoading(false)
      }
    }
    load()
  }, [currentUser])

  // Add error handling for missing data
  if (!sessions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    )
  }

  // Stats
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

  // Use consultations if available, otherwise fall back to sessions
  const recentSessions = consultations.length > 0 
    ? consultations.slice(0, 5).map(c => ({
        id: c.id,
        name: `${c.sequenceType?.toUpperCase() || 'DNA'} Analysis`,
        sequences: [{ type: c.sequenceType || 'dna' }],
        results: [{ type: 'analysis' }],
        createdAt: c.createdAt,
        updatedAt: c.createdAt
      }))
    : sessions.slice(0, 5)

  const formatDate = (value: any) => {
    try {
      if (value instanceof Date) return value.toLocaleDateString()
      if (value && typeof value === 'object' && 'seconds' in value) {
        return new Date((value as any).seconds * 1000).toLocaleDateString()
      }
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

          {/* My Sequences (Persistent) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">My Sequences</h2>
              <Link
                to="/analysis"
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
              >
                Add New
              </Link>
            </div>

            {seqLoading ? (
              <div className="text-gray-300">Loading sequences...</div>
            ) : !userSequences.length ? (
              <div className="text-gray-300">No sequences yet. Add one from Analysis.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-gray-300">
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Sequence</th>
                      <th className="px-4 py-2 text-right">GC%</th>
                      <th className="px-4 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userSequences.slice(0, 8).map((r) => (
                      <tr key={r.id} className="border-t border-white/10 text-white">
                        <td className="px-4 py-2 whitespace-nowrap">{r.type.toUpperCase()}</td>
                        <td className="px-4 py-2 max-w-md">
                          <div className="truncate" title={r.sequence}>{r.sequence}</div>
                        </td>
                        <td className="px-4 py-2 text-right">{r.gc?.toFixed(2) ?? '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{r.createdAt.toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard