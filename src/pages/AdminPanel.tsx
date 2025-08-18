import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { calculateGCContent } from '../utils/bioinformatics'
import { 
  Download, 
  Trash2, 
  ArrowUpDown, 
  ArrowLeft,
  BarChart3,
  Users,
  Database,
  Settings,
  Shield,
  Activity
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ADMIN_EMAIL } from '../config/appConfig'
import SimpleAdminAnalytics from '../components/admin/SimpleAdminAnalytics'
import SimpleUserManagement from '../components/admin/SimpleUserManagement'

interface SequenceRecord {
  id: string
  uid: string
  email: string
  sequence: string
  type: 'dna' | 'rna' | 'protein'
  gcContent?: number
  createdAt: Date
}

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

const AdminPanel: React.FC = () => {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'sequences' | 'settings'>('analytics')
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<SequenceRecord[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'email' | 'type' | 'gc' | 'date'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Shield className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/15">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
          {[
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'sequences', label: 'Sequence Data', icon: Database },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'analytics' && <SimpleAdminAnalytics />}
          
          {activeTab === 'users' && <SimpleUserManagement />}
          
          {activeTab === 'sequences' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Sequence Database Management
                </h2>
                <button
                  onClick={() => exportToCSV(filtered.map(r => ({
                    email: r.email,
                    sequence: r.sequence,
                    type: r.type,
                    gcContent: r.gcContent ?? '',
                    createdAt: r.createdAt.toISOString(),
                  })))}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700"
                  disabled={!filtered.length}
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by email, sequence, or type..."
                  className="input-field w-full md:w-80"
                />
                <div className="flex gap-2">
                  <button onClick={() => toggleSort('date')} className="btn-secondary inline-flex items-center gap-1">
                    <ArrowUpDown className="h-4 w-4" /> Date
                  </button>
                  <button onClick={() => toggleSort('email')} className="btn-secondary inline-flex items-center gap-1">
                    <ArrowUpDown className="h-4 w-4" /> Email
                  </button>
                  <button onClick={() => toggleSort('type')} className="btn-secondary inline-flex items-center gap-1">
                    <ArrowUpDown className="h-4 w-4" /> Type
                  </button>
                  <button onClick={() => toggleSort('gc')} className="btn-secondary inline-flex items-center gap-1">
                    <ArrowUpDown className="h-4 w-4" /> GC%
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-gray-300 text-center py-8">
                  <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading sequences...
                </div>
              ) : !filtered.length ? (
                <div className="text-gray-300 text-center py-8">No sequences found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-gray-300">
                        <th className="px-4 py-2 text-left">User Email</th>
                        <th className="px-4 py-2 text-left">Sequence</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-right">GC Content</th>
                        <th className="px-4 py-2 text-left">Submission Date</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id} className="border-t border-white/10 text-white hover:bg-white/5">
                          <td className="px-4 py-2 whitespace-nowrap">{r.email}</td>
                          <td className="px-4 py-2 max-w-xl">
                            <div className="truncate" title={r.sequence}>{r.sequence}</div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              r.type === 'dna' ? 'bg-blue-500/20 text-blue-300' :
                              r.type === 'rna' ? 'bg-green-500/20 text-green-300' :
                              'bg-purple-500/20 text-purple-300'
                            }`}>
                              {r.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">{r.gcContent?.toFixed(2) ?? '-'}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{r.createdAt.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white flex items-center mb-6">
                <Settings className="h-5 w-5 mr-2" />
                System Settings
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">System Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">99.9%</div>
                      <div className="text-sm text-gray-400">Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{records.length}</div>
                      <div className="text-sm text-gray-400">Total Sequences</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">2.3s</div>
                      <div className="text-sm text-gray-400">Avg Response</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">Active</div>
                      <div className="text-sm text-gray-400">AI Engine</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Configuration</h3>
                  <p className="text-gray-300 text-sm">
                    System configuration and advanced settings will be available in future updates.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel