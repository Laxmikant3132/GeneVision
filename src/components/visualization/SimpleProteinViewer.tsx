import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Settings,
  Palette,
  Eye,
  Maximize,
  Play
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SimpleProteinViewerProps {
  sequence: string
  title?: string
  width?: string
  height?: string
}

const SimpleProteinViewer: React.FC<SimpleProteinViewerProps> = ({ 
  sequence, 
  title = "Protein Structure",
  width = "100%",
  height = "400px"
}) => {
  const [viewStyle, setViewStyle] = useState('cartoon')
  const [colorScheme, setColorScheme] = useState('spectrum')
  const [isRotating, setIsRotating] = useState(false)

  const viewStyles = [
    { id: 'cartoon', name: 'Cartoon', description: 'Secondary structure representation' },
    { id: 'stick', name: 'Stick', description: 'Bond representation' },
    { id: 'sphere', name: 'Sphere', description: 'Space-filling model' }
  ]

  const colorSchemes = [
    { id: 'spectrum', name: 'Spectrum', description: 'Rainbow coloring' },
    { id: 'hydrophobicity', name: 'Hydrophobicity', description: 'Color by hydrophobicity' },
    { id: 'secondary', name: 'Secondary', description: 'Color by secondary structure' }
  ]

  const visualization = useMemo(() => {
    if (!sequence) return []

    const aminoAcids = sequence.split('')
    const result = []

    for (let i = 0; i < Math.min(aminoAcids.length, 50); i++) {
      const aa = aminoAcids[i]
      const angle = (i / Math.min(aminoAcids.length, 50)) * 360 * 2 // Multiple turns for longer sequences
      const radius = 80 + Math.sin(i * 0.3) * 20
      
      const x = Math.cos(angle * Math.PI / 180) * radius + 150
      const y = Math.sin(angle * Math.PI / 180) * radius + 150
      
      // Color based on amino acid properties
      let color = '#3B82F6' // default blue
      if (colorScheme === 'hydrophobicity') {
        const hydrophobic = ['A', 'V', 'I', 'L', 'M', 'F', 'Y', 'W']
        const polar = ['S', 'T', 'N', 'Q']
        const charged = ['K', 'R', 'H', 'D', 'E']
        
        if (hydrophobic.includes(aa)) color = '#F59E0B' // orange
        else if (polar.includes(aa)) color = '#10B981' // green
        else if (charged.includes(aa)) color = '#EF4444' // red
      } else if (colorScheme === 'spectrum') {
        const hue = (i / Math.min(aminoAcids.length, 50)) * 360
        color = `hsl(${hue}, 70%, 60%)`
      }

      result.push({
        id: i,
        aa,
        x,
        y,
        color,
        size: viewStyle === 'sphere' ? 8 : viewStyle === 'stick' ? 4 : 6
      })
    }

    return result
  }, [sequence, colorScheme, viewStyle])

  const exportImage = () => {
    const svg = document.querySelector('.protein-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg as Element)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = 300
    canvas.height = 300

    img.onload = () => {
      ctx?.drawImage(img, 0, 0)
      const link = document.createElement('a')
      link.download = `${title.replace(/\s+/g, '_')}_structure.png`
      link.href = canvas.toDataURL()
      link.click()
      toast.success('Structure exported successfully!')
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }



  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              isRotating ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
            title="Toggle rotation"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={exportImage}
            className="p-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors duration-200"
            title="Export image"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Palette className="h-4 w-4 inline mr-1" />
            Visualization Style
          </label>
          <select
            value={viewStyle}
            onChange={(e) => setViewStyle(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {viewStyles.map(style => (
              <option key={style.id} value={style.id} className="bg-gray-800">
                {style.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Eye className="h-4 w-4 inline mr-1" />
            Color Scheme
          </label>
          <select
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {colorSchemes.map(scheme => (
              <option key={scheme.id} value={scheme.id} className="bg-gray-800">
                {scheme.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visualization */}
      <div 
        className="bg-black rounded-lg flex items-center justify-center relative overflow-hidden"
        style={{ width, height }}
      >
        <svg
          className="protein-svg"
          width="300"
          height="300"
          viewBox="0 0 300 300"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <g className={isRotating ? 'animate-spin' : ''} style={{ transformOrigin: '150px 150px' }}>
            {visualization.map((point, index) => (
              <g key={point.id}>
                {/* Connection lines for cartoon/stick view */}
                {(viewStyle === 'cartoon' || viewStyle === 'stick') && index > 0 && (
                  <line
                    x1={visualization[index - 1].x}
                    y1={visualization[index - 1].y}
                    x2={point.x}
                    y2={point.y}
                    stroke={point.color}
                    strokeWidth={viewStyle === 'stick' ? 2 : 1}
                    opacity={0.7}
                  />
                )}
                
                {/* Amino acid points */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={point.size}
                  fill={point.color}
                  filter="url(#glow)"
                  opacity={0.8}
                >
                  <title>{`${point.aa} (${index + 1})`}</title>
                </circle>
                
                {/* Amino acid labels for smaller sequences */}
                {sequence.length <= 20 && (
                  <text
                    x={point.x}
                    y={point.y + 1}
                    textAnchor="middle"
                    fontSize="8"
                    fill="white"
                    fontWeight="bold"
                  >
                    {point.aa}
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>

        {/* Info overlay */}
        <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-1 text-xs text-white">
          {sequence.length} amino acids
          {sequence.length > 50 && ` (showing first 50)`}
        </div>
      </div>

      {/* Sequence info */}
      <div className="mt-4 p-3 bg-white/5 rounded-lg">
        <div className="text-sm text-gray-300 mb-2">Sequence Preview:</div>
        <div className="font-mono text-xs text-white break-all">
          {sequence.length > 100 ? `${sequence.substring(0, 100)}...` : sequence}
        </div>
      </div>
    </div>
  )
}

export default SimpleProteinViewer