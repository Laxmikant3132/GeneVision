import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Shield, AlertCircle, CheckCircle } from 'lucide-react'

const AuthDebugger: React.FC = () => {
  const { currentUser, userProfile } = useAuth()

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
        <Shield className="h-5 w-5 mr-2" />
        Authentication Status
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400" />
          )}
          <span className="text-white">
            Authentication: {currentUser ? 'Logged In' : 'Not Logged In'}
          </span>
        </div>

        {currentUser && (
          <>
            <div className="text-sm text-gray-300">
              <strong>User ID:</strong> {currentUser.uid}
            </div>
            <div className="text-sm text-gray-300">
              <strong>Email:</strong> {currentUser.email}
            </div>
            <div className="text-sm text-gray-300">
              <strong>Display Name:</strong> {currentUser.displayName || 'Not set'}
            </div>
            {userProfile && (
              <>
                <div className="text-sm text-gray-300">
                  <strong>Role:</strong> {userProfile.role || 'user'}
                </div>
                <div className="text-sm text-gray-300">
                  <strong>Status:</strong> {userProfile.status || 'active'}
                </div>
              </>
            )}
          </>
        )}

        {!currentUser && (
          <div className="text-sm text-yellow-300">
            Please log in to access the application features.
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthDebugger