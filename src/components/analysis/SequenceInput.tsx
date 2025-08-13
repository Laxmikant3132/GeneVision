import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { useAnalysis, SequenceData } from '../../contexts/AnalysisContext'
import { validateSequence, cleanSequence, normalizeInputSequence } from '../../utils/bioinformatics'
import { sampleSequences } from '../../data/sampleSequences'
import { 
  Upload, 
  FileText, 
  Dna, 
  AlertCircle, 
  CheckCircle, 
  X,
  Copy,
  Download
} from 'lucide-react'
import toast from 'react-hot-toast'

const SequenceInput: React.FC = () => {
  const { currentSession, addSequence, removeSequence } = useAnalysis()
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste')
  const [sequenceText, setSequenceText] = useState('')
  const [sequenceName, setSequenceName] = useState('')
  const [sequenceType, setSequenceType] = useState<'dna' | 'rna' | 'protein'>('dna')
  const [isValidating, setIsValidating] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const content = reader.result as string
        setSequenceText(content)
        setSequenceName(file.name.replace(/\.[^/.]+$/, ''))
      }
      reader.readAsText(file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt', '.fasta', '.fa', '.seq'],
      'application/octet-stream': ['.fasta', '.fa']
    },
    multiple: false
  })

  const handleAddSequence = async () => {
    if (!sequenceText.trim() || !sequenceName.trim()) {
      toast.error('Please provide both sequence name and sequence data')
      return
    }

    setIsValidating(true)
    
    try {
      // Normalize input: strip FASTA headers, keep letters, harmonize U/T based on type
      const cleanedSequence = normalizeInputSequence(sequenceText, sequenceType)
      console.log('Adding sequence:', { type: sequenceType, original: sequenceText.substring(0, 50), cleaned: cleanedSequence.substring(0, 50) })
      
      const isValid = validateSequence(cleanedSequence, sequenceType)
      console.log('Sequence validation result:', isValid, 'for type:', sequenceType)
      
      if (!isValid) {
        toast.error(`Invalid ${sequenceType.toUpperCase()} sequence format`)
        setIsValidating(false)
        return
      }

      const newSequence: SequenceData = {
        id: `seq_${Date.now()}`,
        name: sequenceName,
        sequence: cleanedSequence,
        type: sequenceType,
        uploadedAt: new Date(),
        fileSize: cleanedSequence.length,
        fileName: sequenceName
      }

      await addSequence(newSequence)
      
      // Clear form
      setSequenceText('')
      setSequenceName('')
    } catch (error) {
      toast.error('Error processing sequence')
    } finally {
      setIsValidating(false)
    }
  }

  const handleRemoveSequence = (sequenceId: string) => {
    removeSequence(sequenceId)
    toast.success('Sequence removed')
  }

  const copySequence = (sequence: string) => {
    navigator.clipboard.writeText(sequence)
    toast.success('Sequence copied to clipboard')
  }

  const formatSequence = (sequence: string) => {
    // Format sequence with line breaks every 60 characters
    return sequence.match(/.{1,60}/g)?.join('\n') || sequence
  }

  const loadSampleSequence = (sampleKey: string, category: 'dna' | 'rna' | 'protein') => {
    const categoryData = sampleSequences[category] as any
    const sample = categoryData[sampleKey]
    console.log('Loading sample:', { sampleKey, category, sample })
    if (sample) {
      setSequenceText(sample.sequence)
      setSequenceName(sample.name)
      setSequenceType(sample.type)
      console.log('Sample loaded:', { name: sample.name, type: sample.type, sequenceLength: sample.sequence.length })
      toast.success(`Loaded sample: ${sample.name}`)
    } else {
      console.error('Sample not found:', { sampleKey, category })
      toast.error('Sample sequence not found')
    }
  }

  const getSequenceStats = (sequence: string) => {
    const length = sequence.length
    const composition: { [key: string]: number } = {}
    
    for (const char of sequence) {
      composition[char] = (composition[char] || 0) + 1
    }
    
    return { length, composition }
  }

  return (
    <div className="space-y-8">
      {/* Input Method Selection */}
      <div className="flex space-x-4">
        <button
          onClick={() => setInputMethod('paste')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            inputMethod === 'paste'
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Paste Sequence</span>
        </button>
        <button
          onClick={() => setInputMethod('upload')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            inputMethod === 'upload'
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
          }`}
        >
          <Upload className="h-4 w-4" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Sample Sequences */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Load Sample Sequences</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-lg font-medium text-blue-300 mb-3">DNA Sequences</h4>
            <div className="space-y-2">
              <button
                onClick={() => loadSampleSequence('humanBetaGlobin', 'dna')}
                className="w-full text-left p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                <div className="text-white font-medium">Human Beta-Globin Gene</div>
                <div className="text-gray-400 text-sm">444 bp coding sequence</div>
              </button>
              <button
                onClick={() => loadSampleSequence('syntheticORF', 'dna')}
                className="w-full text-left p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                <div className="text-white font-medium">Synthetic ORF Test</div>
                <div className="text-gray-400 text-sm">99 bp with multiple ORFs</div>
              </button>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium text-green-300 mb-3">RNA Sequences</h4>
            <div className="space-y-2">
              <button
                onClick={() => loadSampleSequence('humanInsulinMRNA', 'rna')}
                className="w-full text-left p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                <div className="text-white font-medium">Human Insulin mRNA</div>
                <div className="text-gray-400 text-sm">Full-length mRNA sequence</div>
              </button>
              <button
                onClick={() => loadSampleSequence('shortRNA', 'rna')}
                className="w-full text-left p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                <div className="text-white font-medium">Short RNA Sample</div>
                <div className="text-gray-400 text-sm">50 bp RNA for quick testing</div>
              </button>
              <button
                onClick={() => loadSampleSequence('syntheticRNA', 'rna')}
                className="w-full text-left p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                <div className="text-white font-medium">Synthetic RNA Test</div>
                <div className="text-gray-400 text-sm">RNA with multiple ORFs</div>
              </button>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium text-purple-300 mb-3">Protein Sequences</h4>
            <div className="space-y-2">
              <button
                onClick={() => loadSampleSequence('humanInsulin', 'protein')}
                className="w-full text-left p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                <div className="text-white font-medium">Human Insulin</div>
                <div className="text-gray-400 text-sm">Protein sequence</div>
              </button>
              <button
                onClick={() => loadSampleSequence('lysozyme', 'protein')}
                className="w-full text-left p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                <div className="text-white font-medium">Lysozyme</div>
                <div className="text-gray-400 text-sm">Enzyme protein</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Add New Sequence</h3>
            
            {/* Sequence Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Sequence Name
              </label>
              <input
                type="text"
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                className="input-field"
                placeholder="Enter sequence name or identifier"
              />
            </div>

            {/* Sequence Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Sequence Type
              </label>
              <select
                value={sequenceType}
                onChange={(e) => setSequenceType(e.target.value as 'dna' | 'rna' | 'protein')}
                className="input-field"
              >
                <option value="dna" className="bg-gray-800 text-white">DNA</option>
                <option value="rna" className="bg-gray-800 text-white">RNA</option>
                <option value="protein" className="bg-gray-800 text-white">Protein</option>
              </select>
            </div>

            {/* Input Method */}
            {inputMethod === 'paste' ? (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Sequence Data
                </label>
                <textarea
                  value={sequenceText}
                  onChange={(e) => setSequenceText(e.target.value)}
                  className="textarea-field h-40"
                  placeholder={`Paste your ${sequenceType.toUpperCase()} sequence here...`}
                />
                <p className="text-gray-400 text-sm mt-2">
                  Supports FASTA format and plain sequences. Non-alphabetic characters will be removed.
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Upload File
                </label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragActive
                      ? 'border-blue-400 bg-blue-500/10'
                      : 'border-gray-400 hover:border-blue-400 hover:bg-blue-500/5'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-blue-300">Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-300 mb-2">
                        Drag & drop a sequence file here, or click to select
                      </p>
                      <p className="text-gray-400 text-sm">
                        Supports .txt, .fasta, .fa, .seq files
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Add Button */}
            <button
              onClick={handleAddSequence}
              disabled={isValidating || !sequenceText.trim() || !sequenceName.trim()}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {isValidating ? (
                <>
                  <div className="spinner"></div>
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Add Sequence</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          {sequenceText && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Preview</h3>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-gray-300 text-sm">Length</p>
                  <p className="text-white font-semibold">{cleanSequence(sequenceText).length}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-gray-300 text-sm">Type</p>
                  <p className="text-white font-semibold">{sequenceType.toUpperCase()}</p>
                </div>
              </div>

              {/* Sequence Preview */}
              <div className="bg-black/20 rounded-lg p-4 max-h-40 overflow-y-auto">
                <pre className="sequence-display text-sm text-gray-300">
                  {formatSequence(cleanSequence(sequenceText).substring(0, 300))}
                  {cleanSequence(sequenceText).length > 300 && '\n...'}
                </pre>
              </div>

              {/* Validation Status */}
              <div className="mt-4">
                {validateSequence(cleanSequence(sequenceText), sequenceType) ? (
                  <div className="flex items-center space-x-2 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Valid {sequenceType.toUpperCase()} sequence</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Invalid {sequenceType.toUpperCase()} sequence format</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Sequences */}
      {currentSession && currentSession.sequences.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Current Sequences ({currentSession.sequences.length})
          </h3>
          
          <div className="space-y-4">
            {currentSession.sequences.map((sequence, index) => {
              const stats = getSequenceStats(sequence.sequence)
              return (
                <motion.div
                  key={sequence.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Dna className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{sequence.name}</h4>
                        <p className="text-gray-400 text-sm">
                          {sequence.type.toUpperCase()} • {stats.length} bases/residues
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copySequence(sequence.sequence)}
                        className="p-2 bg-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-200"
                        title="Copy sequence"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveSequence(sequence.id)}
                        className="p-2 bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/30 transition-all duration-200"
                        title="Remove sequence"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Composition */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {Object.entries(stats.composition).slice(0, 4).map(([base, count]) => (
                      <div key={base} className="text-center p-2 bg-white/5 rounded">
                        <p className="text-gray-300 text-xs">{base}</p>
                        <p className="text-white text-sm font-medium">{count}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Sequence Preview */}
                  <div className="bg-black/20 rounded p-3 max-h-20 overflow-hidden">
                    <pre className="sequence-display text-xs text-gray-400">
                      {formatSequence(sequence.sequence.substring(0, 120))}
                      {sequence.sequence.length > 120 && '\n...'}
                    </pre>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SequenceInput