import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAnalysis } from '../contexts/AnalysisContext'
import SequenceInput from '../components/analysis/SequenceInput'
import AnalysisTools from '../components/analysis/AnalysisTools'
import ResultsViewer from '../components/analysis/ResultsViewer'
import { 
  FlaskConical, 
  Upload, 
  Play, 
  Save,
  Settings,
  Info,
  Plus
} from 'lucide-react'

const Analysis: React.FC = () => {
  const { currentSession, createSession } = useAnalysis()
  const [activeTab, setActiveTab] = useState<'input' | 'tools' | 'results'>('input')

  const handleCreateSession = async () => {
    const sessionName = `Analysis Session ${new Date().toLocaleString()}`
    await createSession(sessionName)
  }

  const tabs = [
    { id: 'input', label: 'Sequence Input', icon: Upload },
    { id: 'tools', label: 'Analysis Tools', icon: FlaskConical },
    { id: 'results', label: 'Results', icon: Play }
  ]

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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Sequence Analysis
              </h1>
              <p className="text-gray-300 text-lg">
                Analyze DNA, RNA, and protein sequences with AI-powered insights
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              {!currentSession && (
                <button
                  onClick={handleCreateSession}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Session</span>
                </button>
              )}
              {currentSession && (
                <div className="flex items-center space-x-2">
                  <button className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-all duration-200">
                    <Save className="h-4 w-4" />
                  </button>
                  <button className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-all duration-200">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {currentSession ? (
          <>
            {/* Session Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="mb-6 p-4 bg-blue-500/10 backdrop-blur-sm rounded-xl border border-blue-500/20"
            >
              <div className="flex items-center space-x-3">
                <Info className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-blue-300 font-medium">Current Session: {currentSession.name}</p>
                  <p className="text-blue-200 text-sm">
                    {currentSession.sequences.length} sequences • {currentSession.results.length} results
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Navigation Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-8"
            >
              <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-xl p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {activeTab === 'input' && <SequenceInput />}
              {activeTab === 'tools' && <AnalysisTools />}
              {activeTab === 'results' && <ResultsViewer />}
            </motion.div>
          </>
        ) : (
          /* No Session State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-center py-16"
          >
            <div className="max-w-md mx-auto">
              <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <FlaskConical className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-4">Start New Analysis</h2>
                <p className="text-gray-300 mb-6">
                  Create a new analysis session to begin working with your sequences
                </p>
                <button
                  onClick={handleCreateSession}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 font-medium"
                >
                  <FlaskConical className="h-5 w-5" />
                  <span>Create Analysis Session</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Analysis