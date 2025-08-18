import React, { useEffect, useRef, useState } from 'react'
import { RotateCcw, Download, Palette, Eye, Settings } from 'lucide-react'

interface MolecularViewer3DProps {
  sequence: string
  sequenceType: 'protein' | 'dna' | 'rna'
  darkMode?: boolean
}

const MolecularViewer3D: React.FC<MolecularViewer3DProps> = ({ 
  sequence, 
  sequenceType, 
  darkMode = true 
}) => {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<any>(null)
  const [style, setStyle] = useState('cartoon')
  const [colorScheme, setColorScheme] = useState('spectrum')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && viewerRef.current) {
      // Load 3Dmol.js dynamically
      const script = document.createElement('script')
      script.src = 'https://3Dmol.csb.pitt.edu/build/3Dmol-min.js'
      script.onload = () => {
        initializeViewer()
      }
      document.head.appendChild(script)

      return () => {
        document.head.removeChild(script)
      }
    }
  }, [])

  const initializeViewer = () => {
    if (window.$3Dmol && viewerRef.current) {
      const config = { backgroundColor: darkMode ? 'black' : 'white' }
      const newViewer = window.$3Dmol.createViewer(viewerRef.current, config)
      
      // Generate a simple PDB structure for demonstration
      const pdbData = generatePDBFromSequence(sequence, sequenceType)
      
      newViewer.addModel(pdbData, 'pdb')
      newViewer.setStyle({}, { [style]: { colorscheme: colorScheme } })
      newViewer.zoomTo()
      newViewer.render()
      
      setViewer(newViewer)
      setLoading(false)
    }
  }

  const generatePDBFromSequence = (seq: string, type: string) => {
    // Simple PDB generation for demonstration
    // In a real app, you'd fetch from PDB database or use structure prediction
    let pdbContent = `HEADER    GENERATED STRUCTURE\n`
    pdbContent += `TITLE     ${type.toUpperCase()} SEQUENCE VISUALIZATION\n`
    
    for (let i = 0; i < Math.min(seq.length, 50); i++) {
      const x = Math.cos(i * 0.1) * 10
      const y = Math.sin(i * 0.1) * 10
      const z = i * 1.5
      
      pdbContent += `ATOM  ${(i + 1).toString().padStart(5)} CA   ${seq[i] || 'A'} A${(i + 1).toString().padStart(4)}    ${x.toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           C\n`
    }
    
    pdbContent += `END\n`
    return pdbContent
  }

  const updateStyle = (newStyle: string) => {
    if (viewer) {
      setStyle(newStyle)
      viewer.setStyle({}, { [newStyle]: { colorscheme: colorScheme } })
      viewer.render()
    }
  }

  const updateColorScheme = (newScheme: string) => {
    if (viewer) {
      setColorScheme(newScheme)
      viewer.setStyle({}, { [style]: { colorscheme: newScheme } })
      viewer.render()
    }
  }

  const resetView = () => {
    if (viewer) {
      viewer.zoomTo()
      viewer.render()
    }
  }

  const exportImage = () => {
    if (viewer) {
      viewer.pngURI((uri: string) => {
        const link = document.createElement('a')
        link.download = `molecular-structure-${Date.now()}.png`
        link.href = uri
        link.click()
      })
    }
  }

  return (
    <div className={`rounded-xl border p-6 ${
      darkMode 
        ? 'bg-white/10 backdrop-blur-sm border-white/20' 
        : 'bg-white shadow-xl border-gray-200'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-semibold flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Eye className="h-5 w-5 mr-2" />
          🔬 3D Molecular Visualization
        </h3>
        
        <div className="flex space-x-2">
          <button
            onClick={resetView}
            className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={exportImage}
            className="p-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
            title="Export Image"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Visualization Style
          </label>
          <select
            value={style}
            onChange={(e) => updateStyle(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode 
                ? 'bg-white/10 border border-white/20 text-white' 
                : 'bg-gray-50 border border-gray-300 text-gray-900'
            }`}
          >
            <option value="cartoon">Cartoon</option>
            <option value="stick">Stick</option>
            <option value="sphere">Sphere</option>
            <option value="line">Line</option>
            <option value="cross">Cross</option>
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Color Scheme
          </label>
          <select
            value={colorScheme}
            onChange={(e) => updateColorScheme(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode 
                ? 'bg-white/10 border border-white/20 text-white' 
                : 'bg-gray-50 border border-gray-300 text-gray-900'
            }`}
          >
            <option value="spectrum">Spectrum</option>
            <option value="chain">Chain</option>
            <option value="residue">Residue</option>
            <option value="secondary">Secondary Structure</option>
            <option value="atom">Atom Type</option>
          </select>
        </div>
      </div>

      {/* 3D Viewer */}
      <div className="relative">
        <div
          ref={viewerRef}
          className="w-full h-96 rounded-lg border border-white/20 bg-black/20"
          style={{ minHeight: '400px' }}
        />
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Loading 3D Structure...</p>
            </div>
          </div>
        )}
      </div>

      <div className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <p>• Use mouse to rotate, zoom, and pan the structure</p>
        <p>• This is a simplified visualization for demonstration</p>
        <p>• In production, structures would be fetched from PDB database</p>
      </div>
    </div>
  )
}

export default MolecularViewer3D