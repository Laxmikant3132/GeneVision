import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Microscope, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Settings,
  Eye,
  EyeOff,
  Palette
} from 'lucide-react'

interface Enhanced3DProteinViewerProps {
  pdbId?: string
  sequence?: string
  title?: string
  onClose?: () => void
}

interface ViewerSettings {
  style: 'cartoon' | 'stick' | 'sphere' | 'surface'
  colorScheme: 'spectrum' | 'chain' | 'residue' | 'hydrophobicity'
  showWater: boolean
  showHydrogens: boolean
  backgroundColor: string
}

const Enhanced3DProteinViewer: React.FC<Enhanced3DProteinViewerProps> = ({
  pdbId = '1ABC',
  sequence,
  title = 'Protein Structure',
  onClose
}) => {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<ViewerSettings>({
    style: 'cartoon',
    colorScheme: 'spectrum',
    showWater: false,
    showHydrogens: false,
    backgroundColor: '#000000'
  })

  useEffect(() => {
    initializeViewer()
  }, [pdbId, sequence])

  useEffect(() => {
    if (!loading) {
      updateVisualization()
    }
  }, [settings, loading])

  const initializeViewer = async () => {
    if (!viewerRef.current) return

    setLoading(true)
    setError(null)

    try {
      // In a real implementation, you would:
      // 1. Load 3Dmol.js library
      // 2. Initialize the viewer
      // 3. Fetch PDB data from RCSB PDB or use provided sequence
      // 4. Render the structure

      // Mock implementation for demonstration
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create mock 3D viewer
      const mockViewer = document.createElement('div')
      mockViewer.className = 'mock-3d-viewer'
      mockViewer.style.cssText = `
        width: 100%;
        height: 400px;
        background: linear-gradient(45deg, #1a1a2e, #16213e);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      `

      // Add animated protein representation
      const proteinShape = document.createElement('div')
      proteinShape.style.cssText = `
        width: 200px;
        height: 200px;
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
        border-radius: 50%;
        animation: rotate 10s linear infinite;
        position: relative;
        box-shadow: 0 0 50px rgba(78, 205, 196, 0.3);
      `

      // Add CSS animation
      const style = document.createElement('style')
      style.textContent = `
        @keyframes rotate {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(90deg) scale(1.1); }
          50% { transform: rotate(180deg) scale(1); }
          75% { transform: rotate(270deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        .mock-3d-viewer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }
      `
      document.head.appendChild(style)

      // Add structure info overlay
      const infoOverlay = document.createElement('div')
      infoOverlay.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-family: monospace;
      `
      infoOverlay.innerHTML = `
        <div>PDB ID: ${pdbId}</div>
        <div>Style: ${settings.style}</div>
        <div>Color: ${settings.colorScheme}</div>
      `

      // Add controls overlay
      const controlsOverlay = document.createElement('div')
      controlsOverlay.style.cssText = `
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px;
        border-radius: 6px;
        font-size: 10px;
        text-align: center;
      `
      controlsOverlay.innerHTML = `
        <div>🖱️ Drag to rotate</div>
        <div>🔍 Scroll to zoom</div>
        <div>⌨️ Right-click to pan</div>
      `

      mockViewer.appendChild(proteinShape)
      mockViewer.appendChild(infoOverlay)
      mockViewer.appendChild(controlsOverlay)

      // Clear and add to viewer
      viewerRef.current.innerHTML = ''
      viewerRef.current.appendChild(mockViewer)

      setLoading(false)
    } catch (err) {
      setError('Failed to load protein structure')
      setLoading(false)
    }
  }

  const updateVisualization = () => {
    if (!viewerRef.current) return

    // Update the mock viewer based on settings
    const infoOverlay = viewerRef.current.querySelector('div > div') as HTMLElement
    if (infoOverlay) {
      infoOverlay.innerHTML = `
        <div>PDB ID: ${pdbId}</div>
        <div>Style: ${settings.style}</div>
        <div>Color: ${settings.colorScheme}</div>
      `
    }

    // Update background color
    const mockViewer = viewerRef.current.querySelector('.mock-3d-viewer') as HTMLElement
    if (mockViewer) {
      mockViewer.style.background = `linear-gradient(45deg, ${settings.backgroundColor}, #16213e)`
    }
  }

  const resetView = () => {
    // Reset camera position and zoom
    initializeViewer()
  }

  const downloadImage = () => {
    // In a real implementation, this would capture the 3D viewer canvas
    // For now, we'll create a mock download
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, 800, 600)
      gradient.addColorStop(0, '#1a1a2e')
      gradient.addColorStop(1, '#16213e')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 800, 600)
      
      // Add some mock protein representation
      ctx.fillStyle = '#4ecdc4'
      ctx.beginPath()
      ctx.arc(400, 300, 100, 0, 2 * Math.PI)
      ctx.fill()
      
      // Add text
      ctx.fillStyle = 'white'
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${title} (${pdbId})`, 400, 50)
    }
    
    // Download the image
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `protein-structure-${pdbId}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    })
  }

  const renderSettings = () => (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="absolute top-0 right-0 w-80 h-full bg-black/90 backdrop-blur-sm border-l border-white/20 p-6 overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Visualization Settings</h3>
        <button
          onClick={() => setShowSettings(false)}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Style Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Representation Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['cartoon', 'stick', 'sphere', 'surface'] as const).map((style) => (
              <button
                key={style}
                onClick={() => setSettings(prev => ({ ...prev, style }))}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  settings.style === style
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Color Scheme */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Color Scheme
          </label>
          <div className="space-y-2">
            {([
              { key: 'spectrum', label: 'Spectrum' },
              { key: 'chain', label: 'By Chain' },
              { key: 'residue', label: 'By Residue' },
              { key: 'hydrophobicity', label: 'Hydrophobicity' }
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSettings(prev => ({ ...prev, colorScheme: key }))}
                className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                  settings.colorScheme === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Display Options */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Display Options
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showWater}
                onChange={(e) => setSettings(prev => ({ ...prev, showWater: e.target.checked }))}
                className="mr-3 rounded"
              />
              <span className="text-gray-300 text-sm">Show Water Molecules</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showHydrogens}
                onChange={(e) => setSettings(prev => ({ ...prev, showHydrogens: e.target.checked }))}
                className="mr-3 rounded"
              />
              <span className="text-gray-300 text-sm">Show Hydrogens</span>
            </label>
          </div>
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Background Color
          </label>
          <div className="flex space-x-2">
            {['#000000', '#ffffff', '#1a1a2e', '#2c3e50'].map((color) => (
              <button
                key={color}
                onClick={() => setSettings(prev => ({ ...prev, backgroundColor: color }))}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  settings.backgroundColor === color
                    ? 'border-blue-400 scale-110'
                    : 'border-gray-600 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Structure Information */}
        <div className="pt-6 border-t border-white/20">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Structure Information</h4>
          <div className="space-y-2 text-sm text-gray-400">
            <div>PDB ID: {pdbId}</div>
            <div>Title: {title}</div>
            {sequence && (
              <div>Sequence Length: {sequence.length} residues</div>
            )}
            <div>Resolution: 2.1 Å</div>
            <div>Method: X-ray Crystallography</div>
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm border-b border-white/20">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-400">PDB ID: {pdbId}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetView}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={downloadImage}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Download Image"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Viewer Container */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading protein structure...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <Microscope className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-2">Failed to load structure</p>
              <p className="text-gray-400 text-sm">{error}</p>
              <button
                onClick={initializeViewer}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={viewerRef} className="w-full h-full" />

        {/* Settings Panel */}
        {showSettings && renderSettings()}
      </div>

      {/* Footer with Controls Info */}
      {!loading && !error && (
        <div className="p-3 bg-black/50 backdrop-blur-sm border-t border-white/20">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span>🖱️ Left drag: Rotate</span>
              <span>🔍 Scroll: Zoom</span>
              <span>⌨️ Right drag: Pan</span>
            </div>
            <div className="flex items-center space-x-2">
              <Palette className="h-3 w-3" />
              <span>Style: {settings.style}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Enhanced3DProteinViewer