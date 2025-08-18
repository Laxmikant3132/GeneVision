import React, { useCallback, useState } from 'react'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'

interface FileUploadProps {
  onSequenceLoad: (sequence: string, filename: string, type?: 'dna' | 'rna' | 'protein') => void
  darkMode?: boolean
}

const FileUpload: React.FC<FileUploadProps> = ({ onSequenceLoad, darkMode = true }) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    name: string
    size: number
    status: 'success' | 'error'
    message: string
  }>>([])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      processFile(file)
    })
  }

  const processFile = (file: File) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const { sequence, type } = parseSequenceFile(content, file.name)
        
        if (sequence) {
          onSequenceLoad(sequence, file.name, type)
          setUploadedFiles(prev => [...prev, {
            name: file.name,
            size: file.size,
            status: 'success',
            message: `Loaded ${sequence.length} characters`
          }])
        } else {
          throw new Error('No valid sequence found')
        }
      } catch (error) {
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          size: file.size,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to parse file'
        }])
      }
    }
    
    reader.onerror = () => {
      setUploadedFiles(prev => [...prev, {
        name: file.name,
        size: file.size,
        status: 'error',
        message: 'Failed to read file'
      }])
    }
    
    reader.readAsText(file)
  }

  const parseSequenceFile = (content: string, filename: string): { 
    sequence: string, 
    type?: 'dna' | 'rna' | 'protein' 
  } => {
    let sequence = ''
    let type: 'dna' | 'rna' | 'protein' | undefined

    // Handle FASTA format
    if (content.startsWith('>')) {
      const lines = content.split('\n')
      sequence = lines.slice(1).join('').replace(/[^A-Za-z]/g, '').toUpperCase()
    } else {
      // Handle plain text
      sequence = content.replace(/[^A-Za-z]/g, '').toUpperCase()
    }

    // Auto-detect sequence type
    if (sequence) {
      const dnaChars = sequence.match(/[ATGC]/g)?.length || 0
      const rnaChars = sequence.match(/[AUGC]/g)?.length || 0
      const proteinChars = sequence.match(/[ACDEFGHIKLMNPQRSTVWY]/g)?.length || 0

      const dnaRatio = dnaChars / sequence.length
      const rnaRatio = rnaChars / sequence.length
      const proteinRatio = proteinChars / sequence.length

      if (dnaRatio > 0.8 && !sequence.includes('U')) {
        type = 'dna'
      } else if (rnaRatio > 0.8 && sequence.includes('U')) {
        type = 'rna'
      } else if (proteinRatio > 0.8) {
        type = 'protein'
      }
    }

    return { sequence, type }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-400 bg-blue-500/10'
            : darkMode
              ? 'border-white/20 hover:border-white/40 bg-white/5'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".fasta,.fa,.fas,.seq,.txt"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <Upload className={`mx-auto h-12 w-12 mb-4 ${
          dragActive ? 'text-blue-400' : darkMode ? 'text-gray-400' : 'text-gray-500'
        }`} />
        
        <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Upload Sequence Files
        </h3>
        
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Drag and drop files here, or click to browse
        </p>
        
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          <p>Supported formats: FASTA (.fasta, .fa, .fas), SEQ (.seq), TXT (.txt)</p>
          <p>Maximum file size: 10MB</p>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Uploaded Files
          </h4>
          
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                file.status === 'success'
                  ? darkMode
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-green-50 border-green-200'
                  : darkMode
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {file.status === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
                
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {file.name}
                  </p>
                  <p className={`text-xs ${
                    file.status === 'success'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {file.message} • {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => removeFile(index)}
                className={`p-1 rounded-full hover:bg-white/10 transition-colors ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileUpload