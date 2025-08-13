import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Settings,
  Palette,
  Eye,
  Maximize
} from 'lucide-react'
import toast from 'react-hot-toast'

// 3Dmol.js types
declare global {
  interface Window {
    $3Dmol: any
  }
}

interface ProteinViewer3DProps {
  pdbData?: string
  pdbId?: string
  sequence?: string
  title?: string
  width?: string
  height?: string
}

const ProteinViewer3D: React.FC<ProteinViewer3DProps> = ({ 
  pdbData, 
  pdbId, 
  sequence, 
  title = "Protein Structure",
  width = "100%",
  height = "400px"
}) => {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewStyle, setViewStyle] = useState('cartoon')
  const [colorScheme, setColorScheme] = useState('spectrum')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const viewStyles = [
    { id: 'cartoon', name: 'Cartoon', description: 'Secondary structure representation' },
    { id: 'stick', name: 'Stick', description: 'Bond representation' },
    { id: 'sphere', name: 'Sphere', description: 'Space-filling model' },
    { id: 'line', name: 'Line', description: 'Wireframe model' },
    { id: 'cross', name: 'Cross', description: 'Cross representation' }
  ]

  const colorSchemes = [
    { id: 'spectrum', name: 'Spectrum', description: 'Rainbow coloring by chain' },
    { id: 'chain', name: 'Chain', description: 'Color by chain' },
    { id: 'residue', name: 'Residue', description: 'Color by residue type' },
    { id: 'secondary', name: 'Secondary', description: 'Color by secondary structure' },
    { id: 'hydrophobicity', name: 'Hydrophobicity', description: 'Color by hydrophobicity' }
  ]

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const maxAttempts = 100 // 5 seconds max

    const waitAndInit = () => {
      if (cancelled || attempts >= maxAttempts) return
      
      attempts++
      const libReady = !!window.$3Dmol
      const refReady = !!viewerRef.current

      console.log(`Attempt ${attempts}: libReady=${libReady}, refReady=${refReady}`)

      if (libReady && refReady) {
        initializeViewer()
        return
      }
      
      setTimeout(waitAndInit, 50)
    }

    // Start checking after a small delay to ensure DOM is ready
    setTimeout(waitAndInit, 100)

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (viewer && (pdbData || pdbId || sequence)) {
      loadStructure()
    }
  }, [viewer, pdbData, pdbId, sequence])

  useEffect(() => {
    if (viewer) {
      updateVisualization()
    }
  }, [viewer, viewStyle, colorScheme])

  const initializeViewer = () => {
    if (viewer) {
      // Already initialized
      return
    }

    console.log('Initializing 3D viewer...')
    console.log('viewerRef.current:', viewerRef.current)
    console.log('window.$3Dmol:', window.$3Dmol)
    
    if (!viewerRef.current) {
      console.error('Viewer container not found')
      setError('Viewer container not found')
      setLoading(false)
      return
    }

    if (!window.$3Dmol) {
      console.error('3Dmol.js library not loaded')
      setError('3Dmol.js library not loaded')
      setLoading(false)
      return
    }

    try {
      const config = { 
        backgroundColor: 'black',
        antialias: true,
        alpha: true
      }
      
      console.log('Creating viewer with config:', config)
      const newViewer = window.$3Dmol.createViewer(viewerRef.current, config)
      console.log('Viewer created successfully:', newViewer)
      
      setViewer(newViewer)
      setLoading(false)
      toast.success('3D viewer initialized successfully!')
    } catch (err) {
      console.error('Error creating viewer:', err)
      setError(`Failed to create 3D viewer: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setLoading(false)
    }
  }

  const loadStructure = async () => {
    if (!viewer) return

    setLoading(true)
    setError(null)

    try {
      viewer.clear()

      if (pdbData) {
        // Load from provided PDB data
        viewer.addModel(pdbData, 'pdb')
      } else if (pdbId) {
        // Load from PDB database
        const response = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`)
        if (!response.ok) {
          throw new Error('Failed to fetch PDB structure')
        }
        const data = await response.text()
        viewer.addModel(data, 'pdb')
      } else if (sequence) {
        // Generate a simple structure representation for sequence
        generateSequenceStructure()
        // Apply styles and render the generated model
        updateVisualization()
        viewer.zoomTo()
        viewer.render()
        setLoading(false)
        toast.success('Structure generated successfully!')
        return
      } else {
        throw new Error('No structure data provided')
      }

      updateVisualization()
      viewer.zoomTo()
      viewer.render()
      setLoading(false)
      toast.success('Structure loaded successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load structure')
      setLoading(false)
      toast.error('Failed to load protein structure')
    }
  }

  const generateSequenceStructure = () => {
    if (!sequence || !viewer) return

    // Create a simple linear representation of the sequence
    // This is a placeholder - in a real application, you'd use structure prediction
    const atoms: any[] = []
    const bonds: any[] = []

    for (let i = 0; i < Math.min(sequence.length, 100); i++) {
      const x = (i % 10) * 2
      const y = Math.floor(i / 10) * 2
      const z = Math.sin(i * 0.1) * 2

      atoms.push({
        elem: 'C',
        x: x,
        y: y,
        z: z,
        serial: i + 1,
        atom: 'CA',
        resn: sequence[i] || 'X',
        resi: i + 1,
        chain: 'A'
      })

      if (i > 0) {
        bonds.push({
          atom1: i,
          atom2: i + 1,
          order: 1
        })
      }
    }

    const model = {
      atoms: atoms,
      bonds: bonds
    }

    viewer.addModel(model, 'json')
  }

  const updateVisualization = () => {
    if (!viewer) return

    viewer.setStyle({}, {})

    const style: any = {}
    style[viewStyle] = {
      colorscheme: colorScheme
    }

    viewer.setStyle({}, style)
    viewer.render()
  }

  const resetView = () => {
    if (viewer) {
      viewer.zoomTo()
      viewer.render()
    }
  }

  const zoomIn = () => {
    if (viewer) {
      viewer.zoom(1.2)
      viewer.render()
    }
  }

  const zoomOut = () => {
    if (viewer) {
      viewer.zoom(0.8)
      viewer.render()
    }
  }

  const downloadImage = () => {
    if (viewer) {
      const canvas = viewer.pngURI()
      const link = document.createElement('a')
      link.download = `${title.replace(/\s+/g, '_')}_structure.png`
      link.href = canvas
      link.click()
      toast.success('Structure image downloaded!')
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Keep the container mounted even while loading so the ref exists for 3Dmol

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="p-4 bg-red-500/20 rounded-full mb-4 w-fit mx-auto">
              <Eye className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Failed to Load Structure</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={loadStructure}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className={`bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetView}
            className="p-2 bg-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-200"
            title="Reset view"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={zoomIn}
            className="p-2 bg-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-200"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 bg-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-200"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={downloadImage}
            className="p-2 bg-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-200"
            title="Download image"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-200"
            title="Toggle fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Controls Panel */}
        <div className="w-64 p-4 border-r border-white/20 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              <Palette className="h-4 w-4 inline mr-1" />
              View Style
            </label>
            <select
              value={viewStyle}
              onChange={(e) => setViewStyle(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {viewStyles.map(style => (
                <option key={style.id} value={style.id} className="bg-gray-800">
                  {style.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {viewStyles.find(s => s.id === viewStyle)?.description}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              <Settings className="h-4 w-4 inline mr-1" />
              Color Scheme
            </label>
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {colorSchemes.map(scheme => (
                <option key={scheme.id} value={scheme.id} className="bg-gray-800">
                  {scheme.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {colorSchemes.find(s => s.id === colorScheme)?.description}
            </p>
          </div>

          {/* Structure Info */}
          <div className="pt-4 border-t border-white/20">
            <h4 className="text-sm font-medium text-gray-200 mb-2">Structure Info</h4>
            <div className="space-y-2 text-xs text-gray-400">
              {pdbId && (
                <div className="flex justify-between">
                  <span>PDB ID:</span>
                  <span className="text-white">{pdbId}</span>
                </div>
              )}
              {sequence && (
                <div className="flex justify-between">
                  <span>Length:</span>
                  <span className="text-white">{sequence.length} AA</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="text-white">PDB</span>
              </div>
            </div>
          </div>

          {/* Controls Help */}
          <div className="pt-4 border-t border-white/20">
            <h4 className="text-sm font-medium text-gray-200 mb-2">Controls</h4>
            <div className="space-y-1 text-xs text-gray-400">
              <div>• Left click + drag: Rotate</div>
              <div>• Right click + drag: Zoom</div>
              <div>• Middle click + drag: Pan</div>
              <div>• Scroll: Zoom in/out</div>
            </div>
          </div>
        </div>

        {/* 3D Viewer */}
        <div className="flex-1 relative">
          <div
            ref={viewerRef}
            className={`viewer-3d ${isFullscreen ? 'h-full' : 'h-96'}`}
            style={{ 
              width: width, 
              height: isFullscreen ? '100%' : height,
              position: 'relative'
            }}
          />
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <div className="spinner mx-auto mb-2"></div>
                <p className="text-white text-sm">Loading structure...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/20 text-center">
        <p className="text-gray-400 text-sm">
          Powered by 3Dmol.js • Interactive molecular visualization
        </p>
      </div>
    </motion.div>
  )
}

export default ProteinViewer3D