import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAnalysis } from '../contexts/AnalysisContext'
import ResultsViewer from '../components/analysis/ResultsViewer'
import ProteinViewer3D from '../components/visualization/ProteinViewer3D'
import { 
  ArrowLeft, 
  Share2, 
  Download, 
  Eye,
  BarChart3,
  Dna,
  Calendar,
  Clock
} from 'lucide-react'

const Results: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { sessions, loadSession } = useAnalysis()
  const [session, setSession] = useState<any>(null)
  const [activeView, setActiveView] = useState<'results' | '3d'>('results')

  useEffect(() => {
    if (id) {
      const foundSession = sessions.find(s => s.id === id)
      if (foundSession) {
        setSession(foundSession)
        loadSession(id)
      }
    }
  }, [id, sessions, loadSession])

  if (!session) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-4">Session Not Found</h2>
                <p className="text-gray-300 mb-6">
                  The analysis session you're looking for doesn't exist or has been deleted.
                </p>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const proteinResults = session.results.filter((r: any) => 
    r.type === 'translation' || r.type === 'orf-finder'
  )

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
          <div className="flex items-center space-x-4 mb-4">
            <Link
              to="/dashboard"
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {session.name}
              </h1>
              <div className="flex items-center space-x-6 text-gray-300">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{session.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Dna className="h-4 w-4" />
                  <span>{session.sequences.length} sequences</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>{session.results.length} results</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-all duration-200">
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Session Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Dna className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-blue-300 font-medium">Sequences</span>
            </div>
            <p className="text-2xl font-bold text-white">{session.sequences.length}</p>
            <p className="text-gray-400 text-sm">
              Total length: {session.sequences.reduce((sum: number, seq: any) => sum + seq.sequence.length, 0)} bp
            </p>
          </div>

          <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <BarChart3 className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-green-300 font-medium">Analyses</span>
            </div>
            <p className="text-2xl font-bold text-white">{session.results.length}</p>
            <p className="text-gray-400 text-sm">
              {new Set(session.results.map((r: any) => r.type)).size} different types
            </p>
          </div>

          <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-purple-300 font-medium">Processing Time</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {session.results.reduce((sum: number, r: any) => sum + r.processingTime, 0)}ms
            </p>
            <p className="text-gray-400 text-sm">
              Avg: {Math.round(session.results.reduce((sum: number, r: any) => sum + r.processingTime, 0) / session.results.length)}ms
            </p>
          </div>

          <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Eye className="h-5 w-5 text-orange-400" />
              </div>
              <span className="text-orange-300 font-medium">Last Updated</span>
            </div>
            <p className="text-lg font-bold text-white">
              {session.updatedAt.toLocaleDateString()}
            </p>
            <p className="text-gray-400 text-sm">
              {session.updatedAt.toLocaleTimeString()}
            </p>
          </div>
        </motion.div>

        {/* View Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveView('results')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeView === 'results'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analysis Results</span>
            </button>
            {proteinResults.length > 0 && (
              <button
                onClick={() => setActiveView('3d')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeView === '3d'
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>3D Structure</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {activeView === 'results' ? (
            <ResultsViewer />
          ) : (
            <div className="space-y-8">
              {proteinResults.map((result: any) => (
                <ProteinViewer3D
                  key={result.id}
                  sequence={result.type === 'translation' ? result.result.frames[0].protein : result.result.orfs[0]?.protein}
                  title={`${result.type === 'translation' ? 'Translated' : 'ORF'} Protein Structure`}
                />
              ))}
              
              {proteinResults.length === 0 && (
                <div className="text-center py-16">
                  <div className="max-w-md mx-auto">
                    <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                      <Eye className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                      <h2 className="text-2xl font-bold text-white mb-4">No Protein Structures</h2>
                      <p className="text-gray-300 mb-6">
                        Run translation or ORF analysis to view 3D protein structures
                      </p>
                      <Link
                        to="/analysis"
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 font-medium"
                      >
                        <Dna className="h-4 w-4" />
                        <span>Run Analysis</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Results