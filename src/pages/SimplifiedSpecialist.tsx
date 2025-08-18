import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import BasicHistoryManager, { BasicHistoryItem } from '../components/history/BasicHistoryManager'
import { 
  Upload, 
  History,
  Sun,
  Moon,
  CheckCircle,
  FileText,
  MessageSquare,
  Loader2,
  Download,
  Microscope,
  Zap,
  AlertCircle,
  TrendingUp,
  Info
} from 'lucide-react'
import FirebaseTest from '../components/FirebaseTest'
import SimpleAnalysis from '../components/SimpleAnalysis'
import { 
  calculateGCContent, 
  translateDNA,
  findORFs,
  analyzeCodonUsage,
  calculateMolecularWeight,
  calculateIsoelectricPoint,
  compareMutations,
  validateSequence
} from '../utils/bioinformatics'
import { sampleSequences } from '../data/sampleSequences'
import { AIInsightsEngine, AIInsight } from '../components/ai/AIInsightsEngine'
import MolecularViewer3D from '../components/MolecularViewer3D'
import FileUpload from '../components/FileUpload'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'


const SimplifiedSpecialist: React.FC = () => {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [darkMode, setDarkMode] = useState(true)
  const [consultations, setConsultations] = useState<any[]>([])
  const [userSequences, setUserSequences] = useState<any[]>([])
  
  // Analysis state
  const [sequence, setSequence] = useState('')
  const [sequenceType, setSequenceType] = useState<'dna' | 'rna' | 'protein'>('dna')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null)
  const [currentAIInsights, setCurrentAIInsights] = useState<AIInsight[]>([])
  const [referenceSequence, setReferenceSequence] = useState('')
  const [showMutationAnalysis, setShowMutationAnalysis] = useState(false)
  const [show3DViewer, setShow3DViewer] = useState(false)
  const analysisRef = useRef<HTMLDivElement>(null)

  // Load consultation history and sequences
  useEffect(() => {
    if (currentUser) {
      loadConsultationHistory()
      loadUserSequences()
    }
  }, [currentUser])

  const loadConsultationHistory = async () => {
    // This will be handled by BasicHistoryManager
  }

  const loadUserSequences = async () => {
    // This will be handled by BasicHistoryManager
  }

  const performAnalysis = async () => {
    if (!sequence.trim() || !question.trim()) {
      toast.error('Please provide both sequence and question')
      return
    }

    if (!currentUser) {
      toast.error('Please log in to perform analysis')
      return
    }

    setLoading(true)
    try {
      // Clean sequence
      const cleanSequence = sequence.replace(/[^A-Za-z]/g, '').toUpperCase()
      
      // Validate sequence
      const validation = validateSequence(cleanSequence, sequenceType)
      if (!validation.isValid) {
        toast.error(`Invalid sequence: ${validation.errors.join(', ')}`)
        return
      }

      // Perform comprehensive bioinformatics analysis
      const analysis: any = {
        sequence: cleanSequence,
        type: sequenceType,
        length: cleanSequence.length,
        timestamp: new Date().toISOString(),
        validation
      }

      // DNA/RNA Analysis
      if (sequenceType === 'dna' || sequenceType === 'rna') {
        analysis.gcContent = calculateGCContent(cleanSequence)
        analysis.codonUsage = analyzeCodonUsage(cleanSequence)
        
        // Translate to protein
        if (sequenceType === 'dna') {
          analysis.translation = translateDNA(cleanSequence)
          analysis.orfs = findORFs(cleanSequence)
          
          // Calculate protein properties if translation exists
          if (analysis.translation && analysis.translation.sequence) {
            analysis.proteinProperties = {
              molecularWeight: calculateMolecularWeight(analysis.translation.sequence),
              isoelectricPoint: calculateIsoelectricPoint(analysis.translation.sequence),
              length: analysis.translation.sequence.length
            }
          }
        }
      }

      // Protein Analysis
      if (sequenceType === 'protein') {
        analysis.proteinProperties = {
          molecularWeight: calculateMolecularWeight(cleanSequence),
          isoelectricPoint: calculateIsoelectricPoint(cleanSequence),
          length: cleanSequence.length
        }
        
        // Amino acid composition
        const composition: any = {}
        const aminoAcids = 'ACDEFGHIKLMNPQRSTVWY'
        for (const aa of aminoAcids) {
          composition[aa] = (cleanSequence.match(new RegExp(aa, 'g')) || []).length
        }
        analysis.aminoAcidComposition = composition
      }

      // Mutation Analysis (if reference sequence provided)
      if (referenceSequence.trim()) {
        const cleanReference = referenceSequence.replace(/[^A-Za-z]/g, '').toUpperCase()
        analysis.mutations = compareMutations(cleanSequence, cleanReference)
      }

      // Generate AI insights
      const aiEngine = AIInsightsEngine.getInstance()
      const fullAnalysis = await aiEngine.analyzeSequence(
        cleanSequence,
        sequenceType,
        {
          question,
          analysisGoal: 'general'
        }
      )
      const aiInsights = fullAnalysis.insights

      // Save to Firebase
      await addDoc(collection(db, 'consultations'), {
        userId: currentUser.uid,
        sequence: cleanSequence,
        sequenceType,
        question,
        analysis,
        aiInsights,
        createdAt: serverTimestamp()
      })

      setCurrentAnalysis(analysis)
      setCurrentAIInsights(aiInsights)
      toast.success('Analysis completed successfully!')

    } catch (error) {
      console.error('Analysis error:', error)
      toast.error('Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = async () => {
    if (!analysisRef.current || !currentAnalysis) {
      toast.error('No analysis results to export')
      return
    }

    try {
      const canvas = await html2canvas(analysisRef.current)
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF()
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`genevision-analysis-${Date.now()}.pdf`)
      toast.success('PDF exported successfully!')
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Failed to export PDF')
    }
  }

  const loadSampleSequence = (sampleKey: string, category: 'dna' | 'rna' | 'protein') => {
    const samples = sampleSequences[category] as any
    const sample = samples[sampleKey]
    if (sample) {
      setSequence(sample.sequence)
      setSequenceType(sample.type)
      setQuestion(`Analyze this ${sample.name} sequence. ${sample.description}`)
      toast.success(`Loaded ${sample.name}`)
    }
  }

  const renderAnalysisResults = (analysis: any) => {
    if (!analysis) return null

    return (
      <div ref={analysisRef} className="space-y-6">
        {/* Export Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={exportToPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>

        {/* Comprehensive Analysis Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sequence Information */}
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <h4 className="text-blue-300 font-semibold mb-2 flex items-center">
              <Info className="h-4 w-4 mr-2" />
              Sequence Info
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Type:</span>
                <span className="text-white">{analysis.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Length:</span>
                <span className="text-white">{analysis.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Valid:</span>
                <span className={`${analysis.validation?.isValid ? 'text-green-400' : 'text-red-400'}`}>
                  {analysis.validation?.isValid ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* GC Content Analysis */}
          {analysis.gcContent && (
            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
              <h4 className="text-green-300 font-semibold mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Nucleotide Composition
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">GC Content:</span>
                  <span className="text-white">{analysis.gcContent.gcContent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">AT Content:</span>
                  <span className="text-white">{analysis.gcContent.atContent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">GC Skew:</span>
                  <span className="text-white">{analysis.gcContent.gcSkew?.toFixed(3) || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Protein Properties */}
          {analysis.proteinProperties && (
            <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
              <h4 className="text-purple-300 font-semibold mb-2 flex items-center">
                <Microscope className="h-4 w-4 mr-2" />
                Protein Properties
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Length:</span>
                  <span className="text-white">{analysis.proteinProperties.length} AA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Mol. Weight:</span>
                  <span className="text-white">{analysis.proteinProperties.molecularWeight.toFixed(1)} Da</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Isoelectric Point:</span>
                  <span className="text-white">{analysis.proteinProperties.isoelectricPoint.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Codon Usage */}
          {analysis.codonUsage && (
            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
              <h4 className="text-yellow-300 font-semibold mb-2">Codon Usage</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Codons:</span>
                  <span className="text-white">{analysis.codonUsage.totalCodons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Most Frequent:</span>
                  <span className="text-white">{analysis.codonUsage.mostFrequent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Least Frequent:</span>
                  <span className="text-white">{analysis.codonUsage.leastFrequent}</span>
                </div>
              </div>
            </div>
          )}

          {/* ORF Information */}
          {analysis.orfs && analysis.orfs.length > 0 && (
            <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20">
              <h4 className="text-indigo-300 font-semibold mb-2">Open Reading Frames</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total ORFs:</span>
                  <span className="text-white">{analysis.orfs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Longest ORF:</span>
                  <span className="text-white">
                    {Math.max(...analysis.orfs.map((orf: any) => orf.length))} bp
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mutation Analysis */}
          {analysis.mutations && (
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
              <h4 className="text-red-300 font-semibold mb-2">Mutation Analysis</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Mutations:</span>
                  <span className="text-white">{analysis.mutations.totalMutations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Similarity:</span>
                  <span className="text-white">{analysis.mutations.similarity.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Substitutions:</span>
                  <span className="text-white">{analysis.mutations.substitutions?.length || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sequence Display */}
        <div className="bg-black/20 rounded-xl p-4 border border-white/10">
          <h4 className="text-white font-semibold mb-3">Sequence</h4>
          <div className="font-mono text-sm text-gray-300 bg-black/30 p-3 rounded-lg break-all">
            {analysis.sequence}
          </div>
        </div>

        {/* Translation Display */}
        {analysis.translation && (
          <div className="bg-black/20 rounded-xl p-4 border border-white/10">
            <h4 className="text-white font-semibold mb-3">Protein Translation</h4>
            <div className="font-mono text-sm text-gray-300 bg-black/30 p-3 rounded-lg break-all">
              {analysis.translation.sequence}
            </div>
          </div>
        )}

        {/* Interactive Visualizations */}
        <div className="space-y-6">
          <h4 className="text-white font-semibold text-lg">📊 Interactive Visualizations</h4>
          
          {/* Nucleotide Composition Chart */}
          {analysis.gcContent && (
            <div className="bg-black/20 rounded-xl p-6 border border-white/10">
              <h5 className="text-white font-semibold mb-4">Nucleotide Composition</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'A', value: analysis.gcContent.composition?.A || 0, fill: '#3B82F6' },
                        { name: 'T/U', value: analysis.gcContent.composition?.T || analysis.gcContent.composition?.U || 0, fill: '#EF4444' },
                        { name: 'G', value: analysis.gcContent.composition?.G || 0, fill: '#10B981' },
                        { name: 'C', value: analysis.gcContent.composition?.C || 0, fill: '#F59E0B' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'A', value: analysis.gcContent.composition?.A || 0, fill: '#3B82F6' },
                        { name: 'T/U', value: analysis.gcContent.composition?.T || analysis.gcContent.composition?.U || 0, fill: '#EF4444' },
                        { name: 'G', value: analysis.gcContent.composition?.G || 0, fill: '#10B981' },
                        { name: 'C', value: analysis.gcContent.composition?.C || 0, fill: '#F59E0B' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Codon Usage Chart */}
          {analysis.codonUsage && (
            <div className="bg-black/20 rounded-xl p-6 border border-white/10">
              <h5 className="text-white font-semibold mb-4">Codon Usage Frequency</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(analysis.codonUsage.codons || {})
                      .map(([codon, count]) => ({ codon, count }))
                      .sort((a, b) => (b.count as number) - (a.count as number))
                      .slice(0, 20) // Show top 20 codons
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="codon" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Bar dataKey="count" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Amino Acid Composition Chart */}
          {analysis.aminoAcidComposition && (
            <div className="bg-black/20 rounded-xl p-6 border border-white/10">
              <h5 className="text-white font-semibold mb-4">Amino Acid Composition</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(analysis.aminoAcidComposition)
                      .map(([aa, count]) => ({ aminoAcid: aa, count }))
                      .sort((a, b) => (b.count as number) - (a.count as number))
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="aminoAcid" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Bar dataKey="count" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ORF Visualization */}
          {analysis.orfs && analysis.orfs.length > 0 && (
            <div className="bg-black/20 rounded-xl p-6 border border-white/10">
              <h5 className="text-white font-semibold mb-4">Open Reading Frames</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analysis.orfs.map((orf: any, index: number) => ({
                      orf: `ORF ${index + 1}`,
                      length: orf.length,
                      start: orf.start,
                      frame: orf.frame
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="orf" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Bar dataKey="length" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3D Molecular Viewer */}
          {show3DViewer && sequenceType === 'protein' && (
            <MolecularViewer3D
              sequence={analysis.sequence}
              sequenceType="protein"
              darkMode={darkMode}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-gray-50 to-blue-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header with Dark Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Enhanced Specialist Consultation
              </h1>
              <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Advanced AI-powered bioinformatics analysis
              </p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-3 rounded-xl transition-all duration-200 ${
                darkMode 
                  ? 'bg-white/10 text-yellow-400 hover:bg-white/20' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </motion.div>



        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-8"
        >
          <div className={`flex space-x-1 p-1 rounded-xl ${darkMode ? 'bg-white/10 backdrop-blur-sm' : 'bg-white shadow-lg'}`}>
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'new'
                  ? darkMode 
                    ? 'bg-white/20 text-white shadow-lg' 
                    : 'bg-blue-500 text-white shadow-lg'
                  : darkMode
                    ? 'text-gray-300 hover:text-white hover:bg-white/10'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>New Analysis</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'history'
                  ? darkMode 
                    ? 'bg-white/20 text-white shadow-lg' 
                    : 'bg-blue-500 text-white shadow-lg'
                  : darkMode
                    ? 'text-gray-300 hover:text-white hover:bg-white/10'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <History className="h-4 w-4" />
              <span>History & Sequences ({consultations.length + userSequences.length})</span>
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
              {/* Quick Analysis Form */}
              <div className={`rounded-2xl border p-6 ${
                darkMode 
                  ? 'bg-white/10 backdrop-blur-sm border-white/20' 
                  : 'bg-white shadow-xl border-gray-200'
              }`}>
                <h2 className={`text-xl font-semibold mb-6 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <FileText className="h-5 w-5 mr-2" />
                  Quick Sequence Analysis
                </h2>
                
                <div className="space-y-6">
                  {/* Sequence Type Selection */}
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Sequence Type
                    </label>
                    <div className="flex space-x-6">
                      {(['dna', 'rna', 'protein'] as const).map((type) => (
                        <label key={type} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="sequenceType"
                            value={type}
                            checked={sequenceType === type}
                            onChange={(e) => setSequenceType(e.target.value as any)}
                            className="mr-3 w-4 h-4 text-blue-600"
                          />
                          <span className={`capitalize font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                            {type}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      📁 Upload Sequence Files
                    </label>
                    <FileUpload
                      onSequenceLoad={(seq, filename, type) => {
                        setSequence(seq)
                        if (type) setSequenceType(type)
                        setQuestion(`Analyze the uploaded sequence from ${filename}`)
                      }}
                      darkMode={darkMode}
                    />
                  </div>

                  {/* Sample Sequences */}
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      🧬 Load Sample Sequences
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(sampleSequences[sequenceType]).map(([key, sample]) => (
                        <button
                          key={key}
                          onClick={() => loadSampleSequence(key, sequenceType)}
                          className={`p-3 rounded-lg border text-left transition-all duration-200 hover:scale-105 ${
                            darkMode 
                              ? 'bg-white/5 border-white/20 hover:bg-white/10 text-white' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="font-medium text-sm mb-1">{sample.name}</div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {sample.description}
                          </div>
                          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Length: {sample.sequence.length} {sample.type === 'protein' ? 'amino acids' : 'nucleotides'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sequence Input */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {sequenceType === 'protein' ? 'Protein Sequence' : `${sequenceType.toUpperCase()} Sequence`}
                    </label>
                    <textarea
                      value={sequence}
                      onChange={(e) => setSequence(e.target.value)}
                      placeholder={`Enter your ${sequenceType} sequence here...${sequenceType === 'dna' ? '\nExample: ATGCGTAAGCTTGCATGCCTGCAGGTCGACTCTAGAGGATCCCCGGGTACCGAGCTCGAATTC' : sequenceType === 'rna' ? '\nExample: AUGCGUAAGCUUGCAUGCCUGCAGGUCGACUCUAGAGGAUCCCCGGGUACCGAGCUCGAAUUC' : '\nExample: MRKLACLQVDLRGSPGTELNF'}`}
                      className={`w-full h-40 px-4 py-3 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        darkMode 
                          ? 'bg-white/10 border border-white/20 text-white placeholder-gray-400' 
                          : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Current length: {sequence.replace(/[^A-Za-z]/g, '').length} characters
                    </p>
                  </div>

                  {/* Question Input */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Research Question
                    </label>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="What would you like to know about this sequence? Examples:&#10;• Analyze the GC content and composition&#10;• Translate to protein and analyze properties&#10;• Find open reading frames&#10;• Predict protein structure and function"
                      className={`w-full h-32 px-4 py-3 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        darkMode 
                          ? 'bg-white/10 border border-white/20 text-white placeholder-gray-400' 
                          : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  {/* Advanced Options */}
                  <div className="space-y-4">
                    <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Advanced Analysis Options
                    </h3>
                    
                    {/* Mutation Analysis Toggle */}
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="mutationAnalysis"
                        checked={showMutationAnalysis}
                        onChange={(e) => setShowMutationAnalysis(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="mutationAnalysis" className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Enable Mutation Analysis (compare with reference sequence)
                      </label>
                    </div>

                    {/* Reference Sequence Input */}
                    {showMutationAnalysis && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Reference Sequence (for mutation comparison)
                        </label>
                        <textarea
                          value={referenceSequence}
                          onChange={(e) => setReferenceSequence(e.target.value)}
                          placeholder="Enter reference sequence to compare mutations..."
                          className={`w-full h-24 px-4 py-3 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            darkMode 
                              ? 'bg-white/10 border border-white/20 text-white placeholder-gray-400' 
                              : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </div>
                    )}

                    {/* 3D Viewer Toggle */}
                    {sequenceType === 'protein' && (
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="show3DViewer"
                          checked={show3DViewer}
                          onChange={(e) => setShow3DViewer(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="show3DViewer" className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Enable 3D Molecular Visualization (for proteins)
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={performAnalysis}
                    disabled={loading || !sequence.trim() || !question.trim()}
                    className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Analyzing Sequence...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-5 w-5" />
                        <span>Analyze Sequence</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI Insights Section */}
              {currentAIInsights && currentAIInsights.length > 0 && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-yellow-400" />
                    AI-Powered Insights
                  </h3>
                  <div className="space-y-4">
                    {currentAIInsights.map((insight, index) => (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border-l-4 ${
                          insight.type === 'critical' ? 'bg-red-500/10 border-red-500 border-l-red-500' :
                          insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500 border-l-yellow-500' :
                          insight.type === 'suggestion' ? 'bg-blue-500/10 border-blue-500 border-l-blue-500' :
                          'bg-green-500/10 border-green-500 border-l-green-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {insight.type === 'critical' && <AlertCircle className="h-4 w-4 text-red-400" />}
                              {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-400" />}
                              {insight.type === 'suggestion' && <TrendingUp className="h-4 w-4 text-blue-400" />}
                              {insight.type === 'info' && <Info className="h-4 w-4 text-green-400" />}
                              <h4 className="text-sm font-semibold text-white">{insight.title}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                insight.category === 'quality' ? 'bg-purple-500/20 text-purple-300' :
                                insight.category === 'functional' ? 'bg-green-500/20 text-green-300' :
                                insight.category === 'structural' ? 'bg-blue-500/20 text-blue-300' :
                                insight.category === 'optimization' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>
                                {insight.category}
                              </span>
                            </div>
                            <p className="text-gray-200 text-sm leading-relaxed mb-2">{insight.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">
                                Confidence: {Math.round(insight.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Results */}
              {currentAnalysis && (
                <div className={`rounded-2xl border p-6 ${
                  darkMode 
                    ? 'bg-white/10 backdrop-blur-sm border-white/20' 
                    : 'bg-white shadow-xl border-gray-200'
                }`}>
                  <h2 className={`text-xl font-semibold mb-6 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                    Analysis Results
                  </h2>
                  {renderAnalysisResults(currentAnalysis)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Enhanced Analysis History */}
              <div className={`rounded-2xl border p-6 ${
                darkMode 
                  ? 'bg-white/10 backdrop-blur-sm border-white/20' 
                  : 'bg-white shadow-xl border-gray-200'
              }`}>
                <BasicHistoryManager
                  onItemSelect={(item: BasicHistoryItem) => {
                    // Switch to new tab to show the analysis
                    setActiveTab('new')
                    // You can add logic here to load the selected item
                  }}
                  maxItems={50}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default SimplifiedSpecialist