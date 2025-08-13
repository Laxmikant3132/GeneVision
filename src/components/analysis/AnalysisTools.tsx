import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAnalysis, AnalysisResult } from '../../contexts/AnalysisContext'
import { 
  calculateGCContent, 
  analyzeCodonUsage, 
  translateDNA, 
  findORFs,
  compareMutations,
  generateAIInsights
} from '../../utils/bioinformatics'
import { 
  BarChart3, 
  Dna, 
  Zap, 
  Search, 
  GitCompare,
  Brain,
  Play,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

const AnalysisTools: React.FC = () => {
  const { currentSession, addResult } = useAnalysis()
  const [selectedSequences, setSelectedSequences] = useState<string[]>([])
  const [runningAnalyses, setRunningAnalyses] = useState<Set<string>>(new Set())

  const analysisTools = [
    {
      id: 'gc-content',
      name: 'GC Content Analysis',
      description: 'Calculate GC content, AT content, and nucleotide composition',
      icon: BarChart3,
      color: 'from-blue-500 to-blue-600',
      supportedTypes: ['dna', 'rna'],
      requiresCount: 1
    },
    {
      id: 'codon-usage',
      name: 'Codon Usage Analysis',
      description: 'Analyze codon frequency and bias patterns',
      icon: Dna,
      color: 'from-green-500 to-green-600',
      supportedTypes: ['dna', 'rna'],
      requiresCount: 1
    },
    {
      id: 'translation',
      name: 'Amino Acid Translation',
      description: 'Translate DNA/RNA to protein sequence',
      icon: Zap,
      color: 'from-purple-500 to-purple-600',
      supportedTypes: ['dna', 'rna'],
      requiresCount: 1
    },
    {
      id: 'orf-finder',
      name: 'ORF Identification',
      description: 'Find open reading frames in all reading frames',
      icon: Search,
      color: 'from-orange-500 to-orange-600',
      supportedTypes: ['dna', 'rna'],
      requiresCount: 1
    },
    {
      id: 'mutation-analysis',
      name: 'Mutation Comparison',
      description: 'Compare sequences to identify mutations and variations',
      icon: GitCompare,
      color: 'from-red-500 to-red-600',
      supportedTypes: ['dna', 'rna', 'protein'],
      requiresCount: 2
    },
    {
      id: 'protein-analysis',
      name: 'Protein Analysis',
      description: 'Analyze protein properties and 3D structure visualization',
      icon: Eye,
      color: 'from-pink-500 to-pink-600',
      supportedTypes: ['protein'],
      requiresCount: 1
    }
  ]

  const handleSequenceSelection = (sequenceId: string) => {
    setSelectedSequences(prev => {
      if (prev.includes(sequenceId)) {
        return prev.filter(id => id !== sequenceId)
      } else {
        return [...prev, sequenceId]
      }
    })
  }

  const runAnalysis = async (analysisType: string) => {
    if (!currentSession || selectedSequences.length === 0) {
      toast.error('Please select at least one sequence')
      return
    }

    const tool = analysisTools.find(t => t.id === analysisType)
    if (!tool) return

    if (selectedSequences.length < tool.requiresCount) {
      toast.error(`This analysis requires at least ${tool.requiresCount} sequence(s)`)
      return
    }

    const sequences = currentSession.sequences.filter(seq => 
      selectedSequences.includes(seq.id)
    )

    // Check if sequences are compatible with the analysis
    const incompatibleSequences = sequences.filter(seq => 
      !tool.supportedTypes.includes(seq.type)
    )

    if (incompatibleSequences.length > 0) {
      toast.error(`This analysis doesn't support ${incompatibleSequences[0].type.toUpperCase()} sequences. Supported types: ${tool.supportedTypes.join(', ').toUpperCase()}`)
      return
    }

    if (sequences.length === 0) {
      toast.error('No compatible sequences selected. Please check sequence selection.')
      return
    }

    setRunningAnalyses(prev => new Set([...prev, analysisType]))

    try {
      const startTime = Date.now()
      let result: any = null
      let aiInsights: string[] = []

      switch (analysisType) {
        case 'gc-content':
          result = calculateGCContent(sequences[0].sequence, sequences[0].type as 'dna' | 'rna')
          aiInsights = generateAIInsights('gc-content', result)
          break

        case 'codon-usage':
          result = analyzeCodonUsage(sequences[0].sequence, sequences[0].type as 'dna' | 'rna')
          aiInsights = generateAIInsights('codon-usage', result)
          break

        case 'translation':
          result = {
            frames: [0, 1, 2].map(frame => ({
              frame: frame + 1,
              ...translateDNA(sequences[0].sequence, frame, sequences[0].type as 'dna' | 'rna')
            }))
          }
          aiInsights = generateAIInsights('translation', result.frames[0])
          break

        case 'orf-finder':
          const orfs = findORFs(sequences[0].sequence, sequences[0].type as 'dna' | 'rna')
          result = {
            orfs: orfs,
            totalORFs: orfs.length,
            sequenceLength: sequences[0].sequence.length
          }
          
          aiInsights = [`Found ${result.totalORFs} potential open reading frames`]
          if (result.totalORFs > 0) {
            aiInsights.push(`Longest ORF: ${result.orfs[0].protein.length} amino acids (${result.orfs[0].protein})`)
            aiInsights.push(`ORF coverage: ${((result.orfs.reduce((sum, orf) => sum + (orf.end - orf.start), 0) / result.sequenceLength) * 100).toFixed(1)}% of sequence`)
            
            // Frame distribution
            const frameDistribution = result.orfs.reduce((acc, orf) => {
              acc[orf.frame] = (acc[orf.frame] || 0) + 1
              return acc
            }, {})
            aiInsights.push(`Frame distribution: ${Object.entries(frameDistribution).map(([frame, count]) => `Frame ${frame}: ${count}`).join(', ')}`)
          } else {
            aiInsights.push('No ORFs found - sequence may be too short or lack proper start/stop codons')
            aiInsights.push('Try using a longer sequence or check for ATG start codons')
          }
          break

        case 'mutation-analysis':
          result = compareMutations(sequences[0].sequence, sequences[1].sequence)
          aiInsights = [
            `Detected ${result.totalMutations} mutations`,
            `Mutation rate: ${result.mutationRate.toFixed(2)}%`
          ]
          break

        case 'protein-analysis':
          // Calculate basic protein properties
          const proteinSeq = sequences[0].sequence
          const length = proteinSeq.length
          
          // Simple molecular weight calculation (average amino acid weight ~110 Da)
          const avgAAWeight = 110
          const molecularWeight = length * avgAAWeight
          
          result = {
            sequence: proteinSeq,
            length: length,
            name: sequences[0].name,
            properties: {
              molecularWeight: molecularWeight,
              isoelectricPoint: 7.0, // Default neutral
              hydropathy: 0.0 // Default neutral
            }
          }
          aiInsights = [
            `Protein sequence contains ${result.length} amino acids`,
            `Estimated molecular weight: ${molecularWeight.toFixed(1)} Da`,
            'Interactive 3D structure visualization available',
            'Use mouse to rotate, zoom, and explore the structure'
          ]
          break

        default:
          throw new Error('Unknown analysis type')
      }

      const processingTime = Date.now() - startTime

      const analysisResult: AnalysisResult = {
        id: `result_${Date.now()}`,
        sequenceId: sequences[0].id,
        type: analysisType as any,
        result,
        createdAt: new Date(),
        processingTime,
        aiInsights
      }

      await addResult(analysisResult)
      toast.success(`${tool.name} completed successfully!`)

    } catch (error) {
      console.error('Analysis error:', error)
      toast.error('Analysis failed. Please try again.')
    } finally {
      setRunningAnalyses(prev => {
        const newSet = new Set(prev)
        newSet.delete(analysisType)
        return newSet
      })
    }
  }

  if (!currentSession || currentSession.sequences.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
            <Dna className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">No Sequences Available</h2>
            <p className="text-gray-300 mb-6">
              Add some sequences first to start analyzing them
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Sequence Selection */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Select Sequences for Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentSession.sequences.map((sequence) => (
            <motion.div
              key={sequence.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedSequences.includes(sequence.id)
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/20 bg-white/5 hover:border-white/40'
              }`}
              onClick={() => handleSequenceSelection(sequence.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedSequences.includes(sequence.id)
                    ? 'bg-blue-500'
                    : 'bg-gray-500'
                }`}>
                  <Dna className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">{sequence.name}</h4>
                  <p className="text-gray-400 text-sm">
                    {sequence.type.toUpperCase()} • {sequence.sequence.length} {sequence.type === 'protein' ? 'aa' : 'nt'}
                  </p>
                </div>
                {selectedSequences.includes(sequence.id) && (
                  <CheckCircle className="h-5 w-5 text-blue-400" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
        
        {selectedSequences.length > 0 && (
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-blue-300 text-sm">
              {selectedSequences.length} sequence(s) selected for analysis
            </p>
          </div>
        )}
      </div>

      {/* Analysis Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analysisTools.map((tool, index) => {
          const isRunning = runningAnalyses.has(tool.id)
          const canRun = selectedSequences.length >= tool.requiresCount
          const hasCompatibleSequences = currentSession.sequences
            .filter(seq => selectedSequences.includes(seq.id))
            .some(seq => tool.supportedTypes.includes(seq.type))

          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-3 bg-gradient-to-r ${tool.color} rounded-xl`}>
                  <tool.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{tool.name}</h3>
                  <p className="text-gray-300 text-sm">{tool.description}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-400">Supports:</span>
                  <div className="flex space-x-1">
                    {tool.supportedTypes.map(type => (
                      <span key={type} className="px-2 py-1 bg-white/10 rounded text-gray-300">
                        {type.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-400">Requires:</span>
                  <span className="text-gray-300">{tool.requiresCount} sequence(s)</span>
                </div>
              </div>

              <button
                onClick={() => runAnalysis(tool.id)}
                disabled={isRunning || !canRun || !hasCompatibleSequences}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isRunning
                    ? 'bg-gray-500 cursor-not-allowed'
                    : canRun && hasCompatibleSequences
                    ? `bg-gradient-to-r ${tool.color} hover:scale-105 text-white`
                    : 'bg-gray-600 cursor-not-allowed text-gray-400'
                }`}
              >
                {isRunning ? (
                  <>
                    <div className="spinner"></div>
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Run Analysis</span>
                  </>
                )}
              </button>

              {!canRun && (
                <div className="mt-2 flex items-center space-x-2 text-yellow-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Select {tool.requiresCount} sequence(s)</span>
                </div>
              )}

              {!hasCompatibleSequences && canRun && (
                <div className="mt-2 flex items-center space-x-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>No compatible sequences selected</span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* AI Insights Panel */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">AI-Powered Analysis</h3>
            <p className="text-gray-300">Get intelligent insights and recommendations</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="text-purple-300 font-medium mb-2">Smart Recommendations</h4>
            <p className="text-gray-300 text-sm">
              AI suggests the best analysis tools based on your sequence types and research goals.
            </p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="text-blue-300 font-medium mb-2">Biological Insights</h4>
            <p className="text-gray-300 text-sm">
              Get contextual explanations and biological significance of your analysis results.
            </p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="text-green-300 font-medium mb-2">Pattern Recognition</h4>
            <p className="text-gray-300 text-sm">
              Automatically detect interesting patterns and anomalies in your sequence data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalysisTools