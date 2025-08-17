import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { calculateGCContent } from '../utils/bioinformatics'
import { Download, Trash2, ArrowUpDown, ArrowLeft, Users, Database, TrendingUp, Activity, BarChart3, PieChart } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ADMIN_EMAIL } from '../config/appConfig'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Legend, Pie } from 'recharts'
import { motion } from 'framer-motion'

interface SequenceRecord {
  id: string
  uid: string
  email: string
  sequence: string
  type: 'dna' | 'rna' | 'protein'
  gcContent?: number
  createdAt: Date
}

// Colors for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

// Utility: export an array of objects to CSV
const exportToCSV = (rows: any[], filename = 'sequences.csv') => {
  const headers = Object.keys(rows[0] || {})
  const csvRows = [headers.join(',')]
  for (const r of rows) {
    const line = headers
      .map((h) => {
        const v = (r as any)[h]
        const s = typeof v === 'string' ? v : v instanceof Date ? v.toISOString() : v?.toString?.() ?? ''
        // Escape commas/quotes/newlines
        const escaped = '"' + s.replace(/"/g, '""').replace(/\n/g, ' ') + '"'
        return escaped
      })
      .join(',')
    csvRows.push(line)
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Generate sample data for testing when no real data exists
const generateSampleData = (): SequenceRecord[] => {
  const sampleEmails = [
    'user1@example.com',
    'user2@example.com', 
    'user3@example.com',
    'researcher@lab.edu',
    'scientist@bio.org'
  ]
  const sampleTypes: ('dna' | 'rna' | 'protein')[] = ['dna', 'rna', 'protein']
  const sampleSequences = [
    'ATCGATCGATCG',
    'GCTAGCTAGCTA', 
    'TTAACCGGTTAA',
    'AUGCAUGCAUGC',
    'MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVVHSLAKWKRQTLGQHDFSAGEGLYTHMKALRPDEDRLSPLHSVYVDQWDWERVMGDGERQFSTLKSTVEAIWAGIKATEAAVSEEFGLAPFLPDQIHFVHSQELLSRYPDLDAKGRERAIAKDLGAVFLVGIGGKLSDGHRHDVRAPDYDDWUQTPGVPPEEAGAAVAAESSTGTWTTVWTDGLTSLDRYKGRCYHIEPVPG'
  ]

  return Array.from({ length: 15 }, (_, i) => ({
    id: `sample-${i}`,
    uid: `uid-${i}`,
    email: sampleEmails[i % sampleEmails.length],
    sequence: sampleSequences[i % sampleSequences.length],
    type: sampleTypes[i % sampleTypes.length],
    gcContent: sampleTypes[i % sampleTypes.length] !== 'protein' ? Math.random() * 100 : undefined,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
  }))
}

// Analytics helper functions
const getAnalytics = (records: SequenceRecord[]) => {
  // Use sample data if no real data exists
  const dataToAnalyze = records.length > 0 ? records : generateSampleData()
  
  const totalSequences = dataToAnalyze.length
  const uniqueUsers = new Set(dataToAnalyze.map(r => r.email)).size
  const avgGCContent = dataToAnalyze
    .filter(r => r.gcContent !== undefined)
    .reduce((sum, r) => sum + (r.gcContent || 0), 0) / dataToAnalyze.filter(r => r.gcContent !== undefined).length

  // Sequence type distribution
  const typeDistribution = dataToAnalyze.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(typeDistribution).map(([type, count]) => ({
    name: type.toUpperCase(),
    value: count,
    percentage: ((count / totalSequences) * 100).toFixed(1)
  }))

  // Submissions over time (last 30 days) — use local dates to avoid UTC shift
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recentRecords = dataToAnalyze.filter(r => r.createdAt >= thirtyDaysAgo)

  const localDateKey = (dt: Date) => {
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const dailySubmissions = recentRecords.reduce((acc, r) => {
    const key = localDateKey(r.createdAt)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Build continuous 30-day series with zeros for missing days
  const lineData: { date: string; submissions: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    d.setDate(d.getDate() - i)
    const key = localDateKey(d)
    lineData.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      submissions: dailySubmissions[key] || 0,
    })
  }

  // GC content distribution
  const gcRanges = { '0-20%': 0, '21-40%': 0, '41-60%': 0, '61-80%': 0, '81-100%': 0 }
  dataToAnalyze.forEach(r => {
    if (r.gcContent !== undefined) {
      const gc = r.gcContent
      if (gc <= 20) gcRanges['0-20%']++
      else if (gc <= 40) gcRanges['21-40%']++
      else if (gc <= 60) gcRanges['41-60%']++
      else if (gc <= 80) gcRanges['61-80%']++
      else gcRanges['81-100%']++
    }
  })

  const gcData = Object.entries(gcRanges).map(([range, count]) => ({
    range,
    count
  }))

  // User activity (top 8 users)
  const userActivity = dataToAnalyze.reduce((acc, r) => {
    acc[r.email] = (acc[r.email] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topUsers = Object.entries(userActivity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8) // Reduced to 8 for better visibility
    .map(([email, count], index) => ({
      user: `User ${index + 1}`, // Simplified user labels
      email: email,
      submissions: count,
      displayEmail: email.length > 25 ? email.substring(0, 22) + '...' : email
    }))

  return {
    totalSequences,
    uniqueUsers,
    avgGCContent: isNaN(avgGCContent) ? 0 : avgGCContent,
    pieData,
    lineData,
    gcData,
    topUsers
  }
}

const AdminPanel: React.FC = () => {
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<SequenceRecord[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'email' | 'type' | 'gc' | 'date'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showAnalytics, setShowAnalytics] = useState(true)

  const isAdmin = currentUser?.email === ADMIN_EMAIL

  const loadAll = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'sequences'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      const out: SequenceRecord[] = []
      snap.forEach((d) => {
        const data = d.data() as any
        const created = data.createdAt?.toDate?.() || new Date()
        const gc = data.type !== 'protein' ? calculateGCContent(data.sequence, data.type).gcContent : undefined
        out.push({
          id: d.id,
          uid: data.uid,
          email: data.email || 'unknown',
          sequence: data.sequence,
          type: data.type,
          gcContent: gc,
          createdAt: created,
        })
      })
      setRecords(out)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load sequences')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) loadAll()
  }, [isAdmin])

  const analytics = useMemo(() => getAnalytics(records), [records])
  const isUsingSampleData = records.length === 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let items = records
    if (q) {
      items = items.filter((r) =>
        r.email.toLowerCase().includes(q) ||
        r.sequence.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      )
    }
    const sorted = [...items].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortKey) {
        case 'email':
          return a.email.localeCompare(b.email) * dir
        case 'type':
          return a.type.localeCompare(b.type) * dir
        case 'gc':
          return ((a.gcContent ?? -1) - (b.gcContent ?? -1)) * dir
        default:
          return (a.createdAt.getTime() - b.createdAt.getTime()) * dir
      }
    })
    return sorted
  }, [records, search, sortKey, sortDir])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sequences', id))
      setRecords((r) => r.filter((x) => x.id !== id))
      toast.success('Sequence deleted')
    } catch (e) {
      console.error(e)
      toast.error('Delete failed')
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">You don't have permission to access this page.</p>
          <Link to="/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-300">Manage sequences and monitor system analytics</p>
            {isUsingSampleData && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-300 text-sm">
                <Activity className="h-4 w-4" />
                Showing sample data for demonstration
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/15 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            </button>
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/15 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <button
              onClick={() => exportToCSV(filtered.map(r => ({
                email: r.email,
                sequence: r.sequence,
                type: r.type,
                gcContent: r.gcContent ?? '',
                createdAt: r.createdAt.toISOString(),
              })))}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
              disabled={!filtered.length}
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </motion.div>

        {/* Analytics Dashboard */}
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl border border-blue-500/30 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm font-medium">Total Sequences</p>
                    <p className="text-3xl font-bold text-white">{analytics.totalSequences.toLocaleString()}</p>
                  </div>
                  <Database className="h-8 w-8 text-blue-400" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-2xl border border-green-500/30 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm font-medium">Active Users</p>
                    <p className="text-3xl font-bold text-white">{analytics.uniqueUsers.toLocaleString()}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-400" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-sm font-medium">Avg GC Content</p>
                    <p className="text-3xl font-bold text-white">{analytics.avgGCContent.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-400" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-sm rounded-2xl border border-orange-500/30 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-200 text-sm font-medium">Recent Activity</p>
                    <p className="text-3xl font-bold text-white">{analytics.lineData.reduce((sum, d) => sum + d.submissions, 0)}</p>
                    <p className="text-orange-200 text-xs">Last 30 days</p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-400" />
                </div>
              </motion.div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Submissions Over Time */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Submissions Over Time (Last 30 Days)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="submissions" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Sequence Type Distribution */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Sequence Type Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analytics.pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                      >
                        {analytics.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }} 
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* GC Content Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  GC Content Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.gcData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="range" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }} 
                      />
                      <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Top Users */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Most Active Users
                </h3>
                {analytics.topUsers.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.topUsers} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="user" 
                          stroke="#9CA3AF" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                        />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                          }}
                          formatter={(value, name, props) => [
                            `${value} submissions`,
                            `${props.payload.displayEmail}`
                          ]}
                          labelFormatter={(label) => `${label}`}
                        />
                        <Bar 
                          dataKey="submissions" 
                          fill="#F59E0B" 
                          radius={[4, 4, 0, 0]}
                          name="Submissions"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-300">No user data available</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: showAnalytics ? 0.9 : 0.1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6"
        >
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Sequence Records</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, sequence, or type..."
                className="input-field w-full sm:w-80"
              />
              <div className="flex gap-2">
                <button onClick={() => toggleSort('date')} className="btn-secondary inline-flex items-center gap-1 text-sm">
                  <ArrowUpDown className="h-4 w-4" /> Date
                </button>
                <button onClick={() => toggleSort('email')} className="btn-secondary inline-flex items-center gap-1 text-sm">
                  <ArrowUpDown className="h-4 w-4" /> Email
                </button>
                <button onClick={() => toggleSort('type')} className="btn-secondary inline-flex items-center gap-1 text-sm">
                  <ArrowUpDown className="h-4 w-4" /> Type
                </button>
                <button onClick={() => toggleSort('gc')} className="btn-secondary inline-flex items-center gap-1 text-sm">
                  <ArrowUpDown className="h-4 w-4" /> GC%
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3 text-gray-300">Loading sequences...</span>
            </div>
          ) : !filtered.length ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 text-lg">No sequences found.</p>
              {search && (
                <p className="text-gray-400 text-sm mt-2">Try adjusting your search criteria.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-gray-300 border-b border-white/10">
                    <th className="px-4 py-3 text-left font-semibold">User Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Sequence</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-right font-semibold">GC Content</th>
                    <th className="px-4 py-3 text-left font-semibold">Submission Date</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, index) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-t border-white/10 text-white hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{r.email}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="truncate font-mono text-xs bg-gray-800/50 px-2 py-1 rounded" title={r.sequence}>
                          {r.sequence}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          r.type === 'dna' ? 'bg-blue-500/20 text-blue-300' :
                          r.type === 'rna' ? 'bg-green-500/20 text-green-300' :
                          'bg-purple-500/20 text-purple-300'
                        }`}>
                          {r.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {r.gcContent ? `${r.gcContent.toFixed(2)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                        {r.createdAt.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default AdminPanel