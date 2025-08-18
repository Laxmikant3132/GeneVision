import React, { useState } from 'react'
import { aiInsightsEngine } from './ai/AIInsightsEngine'
import { Play, Loader2 } from 'lucide-react'

const TestAIEngine: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testSequence = 'ATGCGTAAGCTTGCATGCCTGCAGGTCGACTCTAGAGGATCCCCGGGTACCGAGCTCGAATTC'

  const runTest = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Testing AI Engine...')
      const analysis = await aiInsightsEngine.analyzeSequence(
        testSequence,
        'dna',
        {
          question: 'Test analysis of this DNA sequence',
          targetOrganism: 'E. coli',
          analysisGoal: 'expression'
        }
      )
      
      console.log('AI Engine test result:', analysis)
      setResult(analysis)
    } catch (err) {
      console.error('AI Engine test error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">AI Engine Test</h3>
      
      <div className="mb-4">
        <p className="text-gray-300 text-sm mb-2">Test Sequence:</p>
        <code className="text-xs text-blue-300 bg-black/20 p-2 rounded block">
          {testSequence}
        </code>
      </div>

      <button
        onClick={runTest}
        disabled={loading}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Testing...</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            <span>Run AI Engine Test</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-300 text-sm">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
            <p className="text-green-300 text-sm font-medium">✅ AI Engine Test Successful!</p>
          </div>
          
          <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <h4 className="text-blue-300 font-medium mb-2">Quality Score: {result.quality.score}/100</h4>
            <p className="text-gray-300 text-sm">Generated {result.insights.length} insights</p>
          </div>

          <div className="p-3 bg-purple-500/20 border border-purple-500/50 rounded-lg">
            <h4 className="text-purple-300 font-medium mb-2">Sample Insights:</h4>
            <div className="space-y-1">
              {result.insights.slice(0, 3).map((insight: any, index: number) => (
                <div key={index} className="text-gray-300 text-xs">
                  • {insight.title}: {insight.description}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestAIEngine