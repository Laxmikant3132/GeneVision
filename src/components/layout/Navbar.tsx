import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Dna, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Home, 
  BarChart3, 
  FlaskConical,
  Settings
} from 'lucide-react'
import { ADMIN_EMAIL } from '../../config/appConfig'

const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const isActive = (path: string) => location.pathname === path

  const isAdmin = currentUser?.email === ADMIN_EMAIL

  const navLinks = [
    { path: '/', label: 'Home', icon: Home },
    ...(currentUser ? [
      { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
      { path: '/analysis', label: 'Analysis', icon: FlaskConical },
      ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: Settings }] : []),
    ] : [])
  ]

  return (
    <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform duration-200">
              <Dna className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">GeneVision</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive(path)
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  <User className="h-4 w-4" />
                  <span>{currentUser.displayName || 'Profile'}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-white/80 hover:text-white transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20">
            <div className="flex flex-col space-y-2">
              {navLinks.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive(path)
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              ))}
              
              {currentUser ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2 border-t border-white/20">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="px-3 py-2 text-white/80 hover:text-white transition-colors duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-center"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar