import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { 
  calculateGCContent, 
  analyzeCodonUsage, 
  compareMutations,
  validateSequence,
  normalizeInputSequence,
  translateDNA,
  findORFs
} from '../utils/bioinformatics'
import { 
  Upload, 
  Dna, 
  MessageSquare, 
  BarChart3, 
  History,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Microscope
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Consultation {
  id: string
  sequence: string
  sequenceType: 'dna' | 'rna' | 'protein'
  question: string
  analysis: {
    gcContent?: any
    codonUsage?: any
    translation?: any
    orfs?: any
    mutations?: any
  }
  aiInsights: string[]
  createdAt: Date
}

interface ProteinStructure {
  pdbId: string
  title: string
  resolution?: number
}

const Specialist: React.FC = () => {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [sequence, setSequence] = useState('')
  const [sequenceType, setSequenceType] = useState<'dna' | 'rna' | 'protein'>('dna')
  const [question, setQuestion] = useState('')
  const [referenceSequence, setReferenceSequence] = useState('')
  const [loading, setLoading] = useState(false)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null)
  const [proteinStructure, setProteinStructure] = useState<ProteinStructure | null>(null)

  // Load user's consultation history
  useEffect(() => {
    if (currentUser) {
      loadConsultationHistory()
    }
  }, [currentUser])

  const loadConsultationHistory = async () => {
    if (!currentUser) return

    try {
      const q = query(
        collection(db, 'consultations'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const history: Consultation[] = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        history.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as Consultation)
      })
      
      setConsultations(history)
    } catch (error) {
      console.error('Error loading consultation history:', error)
    }
  }

  const generateAIInsights = (analysisType: string, result: any, question: string): string[] => {
    const insights: string[] = []
    
    // Basic insights based on analysis type
    if (analysisType === 'gc-content' && result.gcContent !== undefined) {
      if (result.gcContent > 60) {
        insights.push('High GC content (>60%) suggests thermostable properties and potential for strong secondary structures.')
      } else if (result.gcContent < 40) {
        insights.push('Low GC content (<40%) may indicate AT-rich regions, common in regulatory sequences.')
      } else {
        insights.push('Moderate GC content suggests balanced nucleotide composition.')
      }
      
      if (Math.abs(result.gcSkew) > 0.1) {
        insights.push('Significant GC skew detected, which may indicate replication origin or transcriptional bias.')
      }
    }

    if (analysisType === 'codon-usage' && result.totalCodons > 0) {
      insights.push(`Analysis of ${result.totalCodons} codons reveals codon usage patterns.`)
      if (result.mostFrequent.length > 0) {
        insights.push(`Most frequent codons: ${result.mostFrequent.slice(0, 3).join(', ')}`)
      }
      if (result.codonBias > 0.02) {
        insights.push('Significant codon bias detected, suggesting possible optimization for specific expression systems.')
      }
    }

    if (analysisType === 'translation' && result.protein) {
      if (result.hydropathy > 1) {
        insights.push('Hydrophobic protein detected - likely membrane-associated or structural protein.')
      } else if (result.hydropathy < -1) {
        insights.push('Hydrophilic protein detected - likely soluble or extracellular protein.')
      }
      
      if (result.molecularWeight > 50000) {
        insights.push('Large protein (>50kDa) - may have multiple domains or complex structure.')
      }
    }

    if (analysisType === 'mutations' && result.totalMutations > 0) {
      insights.push(`${result.totalMutations} mutations detected with ${result.mutationRate.toFixed(2)}% mutation rate.`)
      const missense = result.mutations.filter((m: any) => m.effect === 'missense').length
      const synonymous = result.mutations.filter((m: any) => m.effect === 'synonymous').length
      if (missense > synonymous) {
        insights.push('More missense than synonymous mutations - may indicate functional impact.')
      }
    }

    // Question-specific insights
    if (question.toLowerCase().includes('disease') || question.toLowerCase().includes('pathogen')) {
      insights.push('For disease-related analysis, consider comparing with known pathogenic variants.')
    }
    
    if (question.toLowerCase().includes('expression') || question.toLowerCase().includes('protein')) {
      insights.push('For expression analysis, consider codon optimization and secondary structure predictions.')
    }

    if (question.toLowerCase().includes('evolution') || question.toLowerCase().includes('phylogen')) {
      insights.push('For evolutionary analysis, consider comparing with homologous sequences from different species.')
    }

    return insights.length > 0 ? insights : ['Analysis completed. Consider the numerical results in context of your research question.']
  }

  const searchProteinStructure = async (sequence: string): Promise<ProteinStructure | null> => {
    // This is a simplified mock - in reality, you'd use PDB API or BLAST
    // For demo purposes, we'll return a mock structure for certain sequences
    if (sequence.length > 50 && sequenceType === 'protein') {
      return {
        pdbId: '1ABC',
        title: 'Example Protein Structure',
        resolution: 2.1
      }
    }
    return null
  }

  const performAnalysis = async () => {
    if (!sequence.trim()) {
      toast.error('Please enter a sequence')
      return
    }

    if (!question.trim()) {
      toast.error('Please enter your question')
      return
    }

    setLoading(true)
    try {
      const normalizedSequence = normalizeInputSequence(sequence, sequenceType)
      
      if (!validateSequence(normalizedSequence, sequenceType)) {
        toast.error(`Invalid ${sequenceType.toUpperCase()} sequence`)
        return
      }

      const analysis: any = {}
      const allInsights: string[] = []

      // Perform different analyses based on sequence type
      if (sequenceType === 'dna' || sequenceType === 'rna') {
        // GC Content Analysis
        analysis.gcContent = calculateGCContent(normalizedSequence, sequenceType)
        allInsights.push(...generateAIInsights('gc-content', analysis.gcContent, question))

        // Codon Usage Analysis
        analysis.codonUsage = analyzeCodonUsage(normalizedSequence, sequenceType)
        allInsights.push(...generateAIInsights('codon-usage', analysis.codonUsage, question))

        // Translation Analysis
        analysis.translation = translateDNA(normalizedSequence, 0, sequenceType)
        allInsights.push(...generateAIInsights('translation', analysis.translation, question))

        // ORF Analysis
        analysis.orfs = findORFs(normalizedSequence, sequenceType)
        if (analysis.orfs.length > 0) {
          allInsights.push(`Found ${analysis.orfs.length} open reading frames.`)
        }

        // Mutation Analysis (if reference sequence provided)
        if (referenceSequence.trim()) {
          const normalizedRef = normalizeInputSequence(referenceSequence, sequenceType)
          if (validateSequence(normalizedRef, sequenceType)) {
            analysis.mutations = compareMutations(normalizedRef, normalizedSequence)
            allInsights.push(...generateAIInsights('mutations', analysis.mutations, question))
          }
        }
      } else if (sequenceType === 'protein') {
        // For protein sequences, we can still do some analysis
        analysis.composition = {}
        for (const aa of normalizedSequence) {
          analysis.composition[aa] = (analysis.composition[aa] || 0) + 1
        }
        allInsights.push(`Protein sequence of ${normalizedSequence.length} amino acids analyzed.`)
        
        // Search for protein structure
        const structure = await searchProteinStructure(normalizedSequence)
        if (structure) {
          setProteinStructure(structure)
          allInsights.push(`Potential protein structure found: ${structure.title}`)
        }
      }

      setCurrentAnalysis(analysis)

      // Save consultation to Firebase
      const consultation = {
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        sequence: normalizedSequence,
        sequenceType,
        question,
        referenceSequence: referenceSequence.trim(),
        analysis,
        aiInsights: allInsights,
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'consultations'), consultation)
      
      // Reload consultation history
      await loadConsultationHistory()
      
      toast.success('Analysis completed successfully!')
      
    } catch (error) {
      console.error('Analysis error:', error)
      toast.error('Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderAnalysisResults = (analysis: any) => {
    if (!analysis) return null

    return (
      <div className="space-y-6">
        {analysis.gcContent && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              GC Content Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{analysis.gcContent.gcContent}%</div>
                <div className="text-sm text-gray-300">GC Content</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{analysis.gcContent.atContent}%</div>
                <div className="text-sm text-gray-300">AT Content</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{analysis.gcContent.gcSkew}</div>
                <div className="text-sm text-gray-300">GC Skew</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{analysis.gcContent.length}</div>
                <div className="text-sm text-gray-300">Length</div>
              </div>
            </div>
          </div>
        )}

        {analysis.codonUsage && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Dna className="h-5 w-5 mr-2" />
              Codon Usage Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Most Frequent Codons</h4>
                <div className="space-y-1">
                  {analysis.codonUsage.mostFrequent.slice(0, 5).map((codon: string, index: number) => (
                    <div key={index} className="text-sm text-white bg-white/5 px-2 py-1 rounded">
                      {codon}: {analysis.codonUsage.codons[codon]} times
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Statistics</h4>
                <div className="space-y-2">
                  <div className="text-sm text-white">Total Codons: {analysis.codonUsage.totalCodons}</div>
                  <div className="text-sm text-white">Codon Bias: {analysis.codonUsage.codonBias}</div>
                  <div className="text-sm text-white">Unique Codons: {Object.keys(analysis.codonUsage.codons).length}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {analysis.translation && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Microscope className="h-5 w-5 mr-2" />
              Translation Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{analysis.translation.length}</div>
                <div className="text-sm text-gray-300">AA Length</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{analysis.translation.molecularWeight}</div>
                <div className="text-sm text-gray-300">MW (Da)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{analysis.translation.isoelectricPoint}</div>
                <div className="text-sm text-gray-300">pI</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{analysis.translation.hydropathy}</div>
                <div className="text-sm text-gray-300">Hydropathy</div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Protein Sequence</h4>
              <div className="bg-black/20 p-3 rounded-lg font-mono text-sm text-white break-all">
                {analysis.translation.protein}
              </div>
            </div>
          </div>
        )}

        {analysis.mutations && analysis.mutations.totalMutations > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Mutation Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{analysis.mutations.totalMutations}</div>
                <div className="text-sm text-gray-300">Total Mutations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">{analysis.mutations.mutationRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-300">Mutation Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {analysis.mutations.mutations.filter((m: any) => m.effect === 'missense').length}
                </div>
                <div className="text-sm text-gray-300">Missense</div>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Mutations Found</h4>
              {analysis.mutations.mutations.slice(0, 10).map((mutation: any, index: number) => (
                <div key={index} className="text-sm text-white bg-white/5 px-2 py-1 rounded mb-1">
                  Position {mutation.position + 1}: {mutation.original} → {mutation.mutated} ({mutation.effect})
                </div>
              ))}
              {analysis.mutations.mutations.length > 10 && (
                <div className="text-sm text-gray-400 mt-2">
                  ... and {analysis.mutations.mutations.length - 10} more mutations
                </div>
              )}
            </div>
          </div>
        )}

        {proteinStructure && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Microscope className="h-5 w-5 mr-2" />
              Protein Structure
            </h3>
            <div className="text-white">
              <p><strong>PDB ID:</strong> {proteinStructure.pdbId}</p>
              <p><strong>Title:</strong> {proteinStructure.title}</p>
              {proteinStructure.resolution && (
                <p><strong>Resolution:</strong> {proteinStructure.resolution} Å</p>
              )}
              <div className="mt-4 p-4 bg-black/20 rounded-lg">
                <div className="text-center text-gray-300">
                  3D Structure Viewer would be rendered here using 3Dmol.js
                  <br />
                  <small>(Integration with PDB database required)</small>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Specialist Consultation
          </h1>
          <p className="text-gray-300 text-lg">
            Upload sequences, ask questions, and get AI-powered bioinformatics analysis
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-xl p-1">
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'new'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>New Consultation</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Consultation History</span>
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {activeTab === 'new' && (
            <div className="space-y-6">
              {/* Input Form */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Sequence Input & Question
                </h2>
                
                <div className="space-y-4">
                  {/* Sequence Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sequence Type
                    </label>
                    <div className="flex space-x-4">
                      {(['dna', 'rna', 'protein'] as const).map((type) => (
                        <label key={type} className="flex items-center">
                          <input
                            type="radio"
                            name="sequenceType"
                            value={type}
                            checked={sequenceType === type}
                            onChange={(e) => setSequenceType(e.target.value as any)}
                            className="mr-2"
                          />
                          <span className="text-white capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Main Sequence Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sequence (FASTA format accepted)
                    </label>
                    <textarea
                      value={sequence}
                      onChange={(e) => setSequence(e.target.value)}
                      placeholder={`Enter your ${sequenceType.toUpperCase()} sequence here...`}
                      className="w-full h-32 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>

                  {/* Reference Sequence (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reference Sequence (Optional - for mutation analysis)
                    </label>
                    <textarea
                      value={referenceSequence}
                      onChange={(e) => setReferenceSequence(e.target.value)}
                      placeholder="Enter reference sequence for comparison..."
                      className="w-full h-24 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>

                  {/* Question Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Your Question
                    </label>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="What would you like to know about this sequence? (e.g., 'Is this sequence suitable for protein expression?', 'What mutations are present compared to the reference?')"
                      className="w-full h-24 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={performAnalysis}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-5 w-5" />
                        <span>Get AI Analysis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Analysis Results */}
              {currentAnalysis && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                    Analysis Results
                  </h2>
                  {renderAnalysisResults(currentAnalysis)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <History className="h-5 w-5 mr-2" />
                Consultation History
              </h2>
              
              {consultations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300">No consultations yet</p>
                  <p className="text-gray-400 text-sm">Start your first analysis to see results here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.map((consultation) => (
                    <div key={consultation.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                            {consultation.sequenceType.toUpperCase()}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {consultation.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-white font-medium mb-1">Question:</p>
                        <p className="text-gray-300 text-sm">{consultation.question}</p>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-white font-medium mb-1">Sequence:</p>
                        <p className="text-gray-300 text-xs font-mono bg-black/20 p-2 rounded truncate">
                          {consultation.sequence}
                        </p>
                      </div>
                      
                      {consultation.aiInsights.length > 0 && (
                        <div>
                          <p className="text-white font-medium mb-1">AI Insights:</p>
                          <ul className="text-gray-300 text-sm space-y-1">
                            {consultation.aiInsights.slice(0, 3).map((insight, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-blue-400 mr-2">•</span>
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Specialist