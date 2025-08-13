import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useAnalysis } from '../contexts/AnalysisContext'
import { 
  User, 
  Mail, 
  Calendar, 
  BarChart3, 
  Settings, 
  Shield,
  Download,
  Trash2,
  Edit3,
  Save,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

const Profile: React.FC = () => {
  const { currentUser, userProfile, updateUserProfile } = useAuth()
  const { sessions } = useAnalysis()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    email: userProfile?.email || ''
  })

  const handleSave = async () => {
    try {
      await updateUserProfile({
        displayName: formData.displayName
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const handleCancel = () => {
    setFormData({
      displayName: userProfile?.displayName || '',
      email: userProfile?.email || ''
    })
    setIsEditing(false)
  }

  const exportData = () => {
    const data = {
      profile: userProfile,
      sessions: sessions,
      exportDate: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `genevision_data_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Data exported successfully!')
  }

  const deleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion is not implemented in this demo')
    }
  }

  const stats = [
    {
      label: 'Total Analyses',
      value: userProfile?.analysisCount || 0,
      icon: BarChart3,
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: 'Sessions Created',
      value: sessions.length,
      icon: Settings,
      color: 'from-green-500 to-green-600'
    },
    {
      label: 'Account Type',
      value: userProfile?.subscription || 'Free',
      icon: Shield,
      color: 'from-purple-500 to-purple-600'
    },
    {
      label: 'Member Since',
      value: userProfile?.createdAt ? new Date(userProfile.createdAt).getFullYear().toString() : '2024',
      icon: Calendar,
      color: 'from-orange-500 to-orange-600'
    }
  ]

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-300 text-lg">Manage your account and preferences</p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 mb-8"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {userProfile?.displayName || 'User'}
                </h2>
                <p className="text-gray-300">{userProfile?.email}</p>
                <p className="text-gray-400 text-sm">
                  Member since {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-all duration-200"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          </div>

          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/20 pt-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="input-field"
                    placeholder="Enter your display name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="input-field opacity-50 cursor-not-allowed"
                    placeholder="Email cannot be changed"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4 mt-6">
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </motion.div>
          )}
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
              className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-3 bg-gradient-to-r ${stat.color} rounded-xl`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-gray-300 text-sm">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Data Management */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Data Management</h3>
            <div className="space-y-4">
              <button
                onClick={exportData}
                className="w-full flex items-center space-x-3 p-4 bg-blue-500/20 rounded-lg text-blue-300 hover:bg-blue-500/30 transition-all duration-200"
              >
                <Download className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Export Data</p>
                  <p className="text-sm text-blue-200">Download all your analysis data</p>
                </div>
              </button>
              
              <div className="p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-yellow-300 font-medium">Data Privacy</p>
                    <p className="text-yellow-200 text-sm">Your data is encrypted and secure</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Account Settings</h3>
            <div className="space-y-4">
              <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-green-300 font-medium">Account Status</p>
                    <p className="text-green-200 text-sm">Active • {userProfile?.subscription || 'Free'} Plan</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={deleteAccount}
                className="w-full flex items-center space-x-3 p-4 bg-red-500/20 rounded-lg text-red-300 hover:bg-red-500/30 transition-all duration-200"
              >
                <Trash2 className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-red-200">Permanently delete your account</p>
                </div>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{session.name}</p>
                      <p className="text-gray-400 text-sm">
                        {session.sequences.length} sequences • {session.results.length} results
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {session.updatedAt.toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No recent activity</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Profile