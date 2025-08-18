import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'

const SimpleAnalysis: React.FC = () => {
  const { currentUser } = useAuth()
  const [sequence, setSequence] = useState('')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const performSimpleAnalysis = async () => {
    if (!currentUser) {
      toast.error('Please log in first')
      return
    }

    if (!sequence.trim()) {
      toast.error('Please enter a sequence')
      return
    }

    if (!question.trim()) {
      toast.error('Please enter a question')
      return
    }

    setLoading(true)
    console.log('Starting simple analysis...')

    try {
      // Simple analysis - just count nucleotides/amino acids
      const cleanSequence = sequence.toUpperCase().replace(/[^ATCGRYSWKMBDHVN]/g, '')
      
      const analysis = {
        length: cleanSequence.length,
        composition: {},
        timestamp: new Date().toISOString()
      }

      // Count each character
      for (const char of cleanSequence) {
        analysis.composition[char] = (analysis.composition[char] || 0) + 1
      }

      // Simple AI insights
      const insights = [
        `Sequence length: ${analysis.length} characters`,
        `Most common nucleotide: ${Object.entries(analysis.composition).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'N/A'}`,
        'Analysis completed successfully',
        'This is a basic sequence analysis'
      ]

      console.log('Analysis result:', analysis)
      console.log('Insights:', insights)

      // Try to save to Firebase
      const consultation = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        sequence: cleanSequence,
        sequenceType: 'dna',
        question: question,
        analysis: analysis,
        aiInsights: insights,
        createdAt: serverTimestamp()
      }

      console.log('Saving to Firebase:', consultation)
      const docRef = await addDoc(collection(db, 'consultations'), consultation)
      console.log('Saved with ID:', docRef.id)

      setResult({ analysis, insights })
      toast.success('Analysis completed and saved!')

    } catch (error) {
      console.error('Analysis failed:', error)
      toast.error('Analysis failed: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Simple Analysis Test</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Sequence:</label>
          <textarea
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            placeholder="Enter DNA sequence (e.g., ATCGATCG)"
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Question:</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What do you want to know about this sequence?"
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          onClick={performSimpleAnalysis}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Run Simple Analysis'}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-green-50 rounded">
            <h4 className="font-semibold">Analysis Result:</h4>
            <p>Length: {result.analysis.length}</p>
            <p>Composition: {JSON.stringify(result.analysis.composition)}</p>
            
            <h4 className="font-semibold mt-2">AI Insights:</h4>
            <ul className="list-disc list-inside">
              {result.insights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default SimpleAnalysis