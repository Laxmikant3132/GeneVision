import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { AnalysisProvider } from './contexts/AnalysisContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Analysis from './pages/Analysis'
import Results from './pages/Results'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import Specialist from './pages/Specialist'
import SimplifiedSpecialist from './pages/SimplifiedSpecialist'
// import EnhancedSpecialist from './pages/EnhancedSpecialist' // Temporarily disabled due to syntax errors
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import AdminPanel from './pages/AdminPanel'
import EnhancedAdminPanel from './pages/EnhancedAdminPanel'
import AdminRoute from './components/auth/AdminRoute'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AnalysisProvider>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Dashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/analysis" element={
                    <ProtectedRoute>
                      <SimplifiedSpecialist />
                    </ProtectedRoute>
                  } />
                  <Route path="/results/:id" element={
                    <ProtectedRoute>
                      <Results />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/specialist" element={
                    <ProtectedRoute>
                      <SimplifiedSpecialist />
                    </ProtectedRoute>
                  } />
                  <Route path="/specialist-basic" element={
                    <ProtectedRoute>
                      <Specialist />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <AdminRoute>
                      <EnhancedAdminPanel />
                    </AdminRoute>
                  } />
                  <Route path="/admin-basic" element={
                    <AdminRoute>
                      <AdminPanel />
                    </AdminRoute>
                  } />
                </Routes>
              </main>
              <Footer />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: '#1f2937',
                  },
                }}
              />
            </div>
          </Router>
        </AnalysisProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App