import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from 'firebase/firestore'
import { ref, onValue, off } from 'firebase/database'
import { db, realtimeDb } from '../../lib/firebase'
import { 
  Users, 
  Search, 
  Filter,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Calendar,
  Clock,
  Activity,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Crown,
  User
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UserRecord {
  uid: string
  email: string
  displayName: string
  createdAt: Date
  lastLogin: Date
  analysisCount: number
  subscription: 'free' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'pending'
  role: 'user' | 'moderator' | 'admin'
  isOnline?: boolean
  lastSeen?: Date
  totalSequences?: number
  totalConsultations?: number
  flaggedContent?: number
}

interface UserPresence {
  uid: string
  email: string
  displayName: string
  isOnline: boolean
  lastSeen: Date
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [userPresence, setUserPresence] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'online'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'moderator' | 'admin'>('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'free' | 'pro' | 'enterprise'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'date' | 'login' | 'activity'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showUserModal, setShowUserModal] = useState<UserRecord | null>(null)

  useEffect(() => {
    loadUsers()
    setupRealtimeListeners()
  }, [])

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

  const loadUsers = async () => {
    setLoading(true)
    try {
      // Load users from Firestore
      const usersQuery = query(collection(db, 'users'))
      const usersSnapshot = await getDocs(usersQuery)
      const userList: UserRecord[] = []

      // Also load activity data
      const [sequencesSnapshot, consultationsSnapshot] = await Promise.all([
        getDocs(collection(db, 'sequences')),
        getDocs(collection(db, 'consultations'))
      ])

      const sequencesByUser = new Map<string, number>()
      const consultationsByUser = new Map<string, number>()

      sequencesSnapshot.forEach(doc => {
        const data = doc.data()
        const uid = data.uid
        if (uid) {
          sequencesByUser.set(uid, (sequencesByUser.get(uid) || 0) + 1)
        }
      })

      consultationsSnapshot.forEach(doc => {
        const data = doc.data()
        const uid = data.userId
        if (uid) {
          consultationsByUser.set(uid, (consultationsByUser.get(uid) || 0) + 1)
        }
      })

      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        userList.push({
          uid: doc.id,
          email: data.email || '',
          displayName: data.displayName || 'Unknown User',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLogin: data.lastLogin?.toDate() || new Date(),
          analysisCount: data.analysisCount || 0,
          subscription: data.subscription || 'free',
          status: data.status || 'active',
          role: data.role || 'user',
          totalSequences: sequencesByUser.get(doc.id) || 0,
          totalConsultations: consultationsByUser.get(doc.id) || 0,
          flaggedContent: data.flaggedContent || 0
        })
      })

      setUsers(userList)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.map(user => {
      const presence = userPresence.find(p => p.uid === user.uid)
      return {
        ...user,
        isOnline: presence?.isOnline || false,
        lastSeen: presence?.lastSeen || user.lastLogin
      }
    })

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(term) ||
        user.displayName.toLowerCase().includes(term) ||
        user.uid.toLowerCase().includes(term)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'online') {
        filtered = filtered.filter(user => user.isOnline)
      } else {
        filtered = filtered.filter(user => user.status === statusFilter)
      }
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Apply subscription filter
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(user => user.subscription === subscriptionFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName)
          break
        case 'email':
          comparison = a.email.localeCompare(b.email)
          break
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case 'login':
          comparison = a.lastLogin.getTime() - b.lastLogin.getTime()
          break
        case 'activity':
          comparison = (a.totalSequences! + a.totalConsultations!) - (b.totalSequences! + b.totalConsultations!)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [users, userPresence, searchTerm, statusFilter, roleFilter, subscriptionFilter, sortBy, sortOrder])

  const updateUserStatus = async (userId: string, status: 'active' | 'suspended') => {
    try {
      await updateDoc(doc(db, 'users', userId), { status })
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, status } : user
      ))
      toast.success(`User ${status === 'active' ? 'activated' : 'suspended'} successfully`)
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const updateUserRole = async (userId: string, role: 'user' | 'moderator' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', userId), { role })
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, role } : user
      ))
      toast.success(`User role updated to ${role}`)
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('Failed to update user role')
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      await deleteDoc(doc(db, 'users', userId))
      setUsers(prev => prev.filter(user => user.uid !== userId))
      toast.success('User deleted successfully')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  const exportUsers = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Status', 'Subscription', 'Created', 'Last Login', 'Sequences', 'Consultations', 'Online'].join(','),
      ...filteredAndSortedUsers.map(user => [
        user.displayName,
        user.email,
        user.role,
        user.status,
        user.subscription,
        user.createdAt.toLocaleDateString(),
        user.lastLogin.toLocaleDateString(),
        user.totalSequences,
        user.totalConsultations,
        user.isOnline ? 'Yes' : 'No'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `genevision-users-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const bulkUpdateStatus = async (status: 'active' | 'suspended') => {
    if (selectedUsers.size === 0) return

    try {
      const promises = Array.from(selectedUsers).map(userId => 
        updateDoc(doc(db, 'users', userId), { status })
      )
      await Promise.all(promises)
      
      setUsers(prev => prev.map(user => 
        selectedUsers.has(user.uid) ? { ...user, status } : user
      ))
      setSelectedUsers(new Set())
      toast.success(`${selectedUsers.size} users ${status === 'active' ? 'activated' : 'suspended'}`)
    } catch (error) {
      console.error('Error bulk updating users:', error)
      toast.error('Failed to update users')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-400" />
      case 'moderator': return <Shield className="h-4 w-4 text-blue-400" />
      default: return <User className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400'
      case 'suspended': return 'text-red-400'
      case 'pending': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getSubscriptionColor = (subscription: string) => {
    switch (subscription) {
      case 'enterprise': return 'bg-purple-500/20 text-purple-300'
      case 'pro': return 'bg-blue-500/20 text-blue-300'
      default: return 'bg-gray-500/20 text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-white">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
            {filteredAndSortedUsers.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedUsers.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">{selectedUsers.size} selected</span>
              <button
                onClick={() => bulkUpdateStatus('active')}
                className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors duration-200"
              >
                Activate
              </button>
              <button
                onClick={() => bulkUpdateStatus('suspended')}
                className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors duration-200"
              >
                Suspend
              </button>
            </div>
          )}
          
          <button
            onClick={exportUsers}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="online">Online Now</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="moderator">Moderators</option>
          <option value="admin">Admins</option>
        </select>

        <select
          value={subscriptionFilter}
          onChange={(e) => setSubscriptionFilter(e.target.value as any)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [newSortBy, newSortOrder] = e.target.value.split('-')
            setSortBy(newSortBy as any)
            setSortOrder(newSortOrder as any)
          }}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="login-desc">Recent Login</option>
          <option value="activity-desc">Most Active</option>
        </select>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="selectAll"
            checked={selectedUsers.size === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedUsers(new Set(filteredAndSortedUsers.map(u => u.uid)))
              } else {
                setSelectedUsers(new Set())
              }
            }}
            className="mr-2"
          />
          <label htmlFor="selectAll" className="text-sm text-gray-400">Select All</label>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(new Set(filteredAndSortedUsers.map(u => u.uid)))
                      } else {
                        setSelectedUsers(new Set())
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Activity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Seen</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <AnimatePresence>
                {filteredAndSortedUsers.map((user) => (
                  <motion.tr
                    key={user.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-white/5 transition-colors duration-200"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.uid)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedUsers)
                          if (e.target.checked) {
                            newSelected.add(user.uid)
                          } else {
                            newSelected.delete(user.uid)
                          }
                          setSelectedUsers(newSelected)
                        }}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${user.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                        <div>
                          <div className="text-sm font-medium text-white">{user.displayName}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(user.role)}
                        <span className="text-sm text-white capitalize">{user.role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm font-medium ${getStatusColor(user.status)} capitalize`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubscriptionColor(user.subscription)} capitalize`}>
                        {user.subscription}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-white">
                        <div>{user.totalSequences} sequences</div>
                        <div className="text-gray-400">{user.totalConsultations} consultations</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-400">
                        {user.isOnline ? (
                          <span className="text-green-400">Online now</span>
                        ) : (
                          user.lastSeen?.toLocaleDateString()
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowUserModal(user)}
                          className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-white/10 transition-colors duration-200"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {user.status === 'active' ? (
                          <button
                            onClick={() => updateUserStatus(user.uid, 'suspended')}
                            className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors duration-200"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUserStatus(user.uid, 'active')}
                            className="p-1 rounded text-gray-400 hover:text-green-400 hover:bg-white/10 transition-colors duration-200"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteUser(user.uid)}
                          className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {showUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowUserModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">User Details</h3>
                <button
                  onClick={() => setShowUserModal(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                    <p className="text-white">{showUserModal.displayName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <p className="text-white">{showUserModal.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
                    <select
                      value={showUserModal.role}
                      onChange={(e) => updateUserRole(showUserModal.uid, e.target.value as any)}
                      className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                    <select
                      value={showUserModal.status}
                      onChange={(e) => updateUserStatus(showUserModal.uid, e.target.value as any)}
                      className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{showUserModal.totalSequences}</div>
                    <div className="text-sm text-gray-400">Sequences</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{showUserModal.totalConsultations}</div>
                    <div className="text-sm text-gray-400">Consultations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{showUserModal.flaggedContent}</div>
                    <div className="text-sm text-gray-400">Flagged</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Created</label>
                    <p className="text-white">{showUserModal.createdAt.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Last Login</label>
                    <p className="text-white">{showUserModal.lastLogin.toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserManagement