import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAnalysis } from '../../contexts/AnalysisContext'
import SimpleProteinViewer from '../visualization/SimpleProteinViewer'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Share2, 
  Eye,
  Brain,
  Clock,
  Lightbulb
} from 'lucide-react'
import toast from 'react-hot-toast'

const ResultsViewer: React.FC = () => {
  const { currentSession } = useAnalysis()
  const [selectedResult, setSelectedResult] = useState<string | null>(null)

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

  const formatChartData = (result: any, type: string) => {
    switch (type) {
      case 'gc-content':
        // Check if this is RNA by looking at composition
        const isRNA = result.composition && result.composition.U !== undefined
        return [
          { name: 'GC Content', value: result.gcContent, color: '#3B82F6' },
          { name: isRNA ? 'AU Content' : 'AT Content', value: result.atContent, color: '#10B981' }
        ]

      case 'codon-usage':
        return Object.entries(result.codons)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([codon, count], index) => ({
            name: codon,
            value: count,
            color: COLORS[index % COLORS.length]
          }))

      case 'translation':
        return result.frames.map((frame: any, index: number) => ({
          name: `Frame ${frame.frame}`,
          length: frame.length,
          molecularWeight: frame.molecularWeight,
          color: COLORS[index % COLORS.length]
        }))

      case 'orf-finder':
        if (!result.orfs || !Array.isArray(result.orfs)) {
          return []
        }
        return result.orfs.map((orf: any, index: number) => ({
          name: `ORF ${index + 1}`,
          start: orf.start,
          end: orf.end,
          length: orf.end - orf.start,
          frame: orf.frame,
          color: COLORS[index % COLORS.length]
        }))

      case 'mutation-analysis':
        const mutationTypes = ['substitution', 'insertion', 'deletion']
        return mutationTypes.map((type, index) => ({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          value: result.mutations.filter((m: any) => m.type === type).length,
          color: COLORS[index % COLORS.length]
        }))

      case 'protein-analysis':
        return [] // No chart data needed for 3D visualization

      default:
        return []
    }
  }

  const renderChart = (result: any, type: string) => {
    const data = formatChartData(result, type)

    switch (type) {
      case 'gc-content':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="chart-container">
              <h4 className="text-lg font-semibold mb-4">Nucleotide Composition</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-container">
              <h4 className="text-lg font-semibold mb-4">
                {result.composition && result.composition.U !== undefined ? 'RNA Base Composition' : 'DNA Base Composition'}
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(result.composition).map(([base, count]) => ({
                  name: base,
                  value: count
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#D1D5DB' }} />
                  <YAxis tick={{ fill: '#D1D5DB' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )

      case 'codon-usage':
        return (
          <div className="chart-container">
            <h4 className="text-lg font-semibold mb-4">Top 10 Most Frequent Codons</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#D1D5DB' }} />
                <YAxis tick={{ fill: '#D1D5DB' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }} 
                />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )

      case 'translation':
        return (
          <div className="space-y-6">
            <div className="chart-container">
              <h4 className="text-lg font-semibold mb-4">Reading Frame Comparison</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#D1D5DB' }} />
                  <YAxis tick={{ fill: '#D1D5DB' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Bar dataKey="length" fill="#8B5CF6" name="Protein Length (AA)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.frames.map((frame: any) => (
                <div key={frame.frame} className="p-4 bg-white/5 rounded-lg">
                  <h5 className="font-medium text-white mb-2">Reading Frame {frame.frame}</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Length:</span>
                      <span className="text-white">{frame.length} AA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mol. Weight:</span>
                      <span className="text-white">{frame.molecularWeight.toFixed(1)} Da</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">pI:</span>
                      <span className="text-white">{frame.isoelectricPoint.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 3D Protein Visualization */}
            <div className="chart-container">
              <h4 className="text-lg font-semibold mb-4">3D Protein Structure Visualization</h4>
              <div className="bg-white/5 rounded-lg p-4">
                <SimpleProteinViewer 
                  sequence={result.frames[0].protein}
                  title="Translated Protein Structure"
                  width="100%"
                  height="400px"
                />
              </div>
            </div>
          </div>
        )

      case 'orf-finder':
        if (!result.orfs || result.orfs.length === 0) {
          return (
            <div className="space-y-6">
              <div className="chart-container">
                <h4 className="text-lg font-semibold mb-4">ORF Analysis Results</h4>
                <div className="text-center py-8">
                  <div className="p-6 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <h5 className="text-yellow-300 font-medium mb-2">No ORFs Found</h5>
                    <p className="text-yellow-200 text-sm">
                      No open reading frames were detected in the sequence. This could mean:
                    </p>
                    <ul className="text-yellow-100 text-sm mt-2 space-y-1">
                      <li>• The sequence is too short</li>
                      <li>• No start codons (ATG) were found</li>
                      <li>• ORFs are shorter than the minimum length (5 amino acids)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )
        }
        
        return (
          <div className="space-y-6">
            <div className="chart-container">
              <h4 className="text-lg font-semibold mb-4">ORF Length Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#D1D5DB' }} />
                  <YAxis tick={{ fill: '#D1D5DB' }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'length' ? `${value} bp` : value,
                      name === 'length' ? 'Length' : name
                    ]}
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Bar dataKey="length" fill="#F59E0B" name="ORF Length (bp)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-container">
              <h4 className="text-lg font-semibold mb-4">ORF Details</h4>
              <div className="space-y-3">
                {result.orfs.slice(0, 10).map((orf: any, index: number) => (
                  <div key={index} className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-white">ORF {index + 1}</span>
                      </div>
                      <div className="flex space-x-6 text-sm">
                        <div>
                          <span className="text-gray-400">Start:</span>
                          <span className="text-white ml-1">{orf.start}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">End:</span>
                          <span className="text-white ml-1">{orf.end}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Frame:</span>
                          <span className="text-white ml-1">{orf.frame > 0 ? '+' : ''}{orf.frame}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Length:</span>
                          <span className="text-white ml-1">{orf.end - orf.start} bp</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-gray-400 text-sm mb-1">Protein sequence:</div>
                      <div className="text-white font-mono text-sm bg-black/20 p-2 rounded break-all">
                        {orf.protein}
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        {orf.protein.length} amino acids
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.orfs.length > 10 && (
              <div className="text-center text-gray-400 text-sm">
                Showing top 10 ORFs out of {result.orfs.length} total
              </div>
            )}
          </div>
        )

      case 'mutation-analysis':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="chart-container">
                <h4 className="text-lg font-semibold mb-4">Mutation Types</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h4 className="text-lg font-semibold mb-4">Mutation Statistics</h4>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Mutations:</span>
                      <span className="text-2xl font-bold text-white">{result.totalMutations}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Mutation Rate:</span>
                      <span className="text-2xl font-bold text-white">{(result.mutationRate * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-container">
              <h4 className="text-lg font-semibold mb-4">Mutation Details</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.mutations.slice(0, 20).map((mutation: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="text-white font-mono">Position {mutation.position}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-white font-mono">{mutation.original} → {mutation.mutated}</span>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        mutation.type === 'substitution' ? 'bg-blue-500/20 text-blue-300' :
                        mutation.type === 'insertion' ? 'bg-green-500/20 text-green-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {mutation.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        mutation.effect === 'synonymous' ? 'bg-gray-500/20 text-gray-300' :
                        mutation.effect === 'missense' ? 'bg-yellow-500/20 text-yellow-300' :
                        mutation.effect === 'nonsense' ? 'bg-red-500/20 text-red-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {mutation.effect}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {result.mutations.length > 20 && (
                <div className="text-center text-gray-400 text-sm mt-4">
                  Showing first 20 mutations out of {result.mutations.length} total
                </div>
              )}
            </div>
          </div>
        )

      case 'protein-analysis':
        return (
          <div className="space-y-6">
            <div className="chart-container">
              <h4 className="text-lg font-semibold mb-4">3D Protein Structure Visualization</h4>
              <div className="bg-white/5 rounded-lg p-4">
                {result.sequence ? (
                  <SimpleProteinViewer 
                    sequence={result.sequence}
                    title={result.name || "Protein Structure"}
                    width="100%"
                    height="500px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg">
                    <div className="text-center">
                      <div className="text-gray-400 mb-2">3D Visualization</div>
                      <div className="text-white text-sm">No sequence data available</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <h5 className="font-medium text-white mb-2">Sequence Info</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Length:</span>
                    <span className="text-white">{result.length} AA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white">Protein</span>
                  </div>
                  {result.properties && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Mol. Weight:</span>
                        <span className="text-white">{result.properties.molecularWeight.toFixed(1)} Da</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">pI:</span>
                        <span className="text-white">{result.properties.isoelectricPoint.toFixed(1)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg">
                <h5 className="font-medium text-white mb-2">Visualization</h5>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-400">Interactive 3D viewer with:</div>
                  <ul className="text-white text-xs space-y-1">
                    <li>• Cartoon representation</li>
                    <li>• Stick model</li>
                    <li>• Sphere model</li>
                    <li>• Color schemes</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h5 className="font-medium text-white mb-2">Controls</h5>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-400">Mouse controls:</div>
                  <ul className="text-white text-xs space-y-1">
                    <li>• Left click: Rotate</li>
                    <li>• Scroll: Zoom</li>
                    <li>• Right click: Pan</li>
                    <li>• Reset button available</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return <div className="text-gray-400">Chart not available for this analysis type</div>
    }
  }

  const exportResults = (format: 'json' | 'csv') => {
    if (!currentSession) return

    const data = currentSession.results
    let content = ''
    let filename = ''

    if (format === 'json') {
      content = JSON.stringify(data, null, 2)
      filename = `analysis_results_${Date.now()}.json`
    } else {
      // Simple CSV export
      content = 'ID,Type,Created,Processing Time\n'
      data.forEach(result => {
        content += `${result.id},${result.type},${result.createdAt.toISOString()},${result.processingTime}ms\n`
      })
      filename = `analysis_results_${Date.now()}.csv`
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success(`Results exported as ${format.toUpperCase()}`)
  }

  if (!currentSession || currentSession.results.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">No Results Yet</h2>
            <p className="text-gray-300 mb-6">
              Run some analyses to see your results here
            </p>
          </div>
        </div>
      </div>
    )
  }

  const selectedResultData = selectedResult 
    ? currentSession.results.find(r => r.id === selectedResult)
    : currentSession.results[0]

  return (
    <div className="space-y-8">
      {/* Results Overview */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Analysis Results</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportResults('json')}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
            >
              <Download className="h-4 w-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => exportResults('csv')}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-500/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <span className="text-blue-300 font-medium">Total Results</span>
            </div>
            <p className="text-2xl font-bold text-white">{currentSession.results.length}</p>
          </div>
          
          <div className="p-4 bg-green-500/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-5 w-5 text-green-400" />
              <span className="text-green-300 font-medium">Avg. Time</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {Math.round(currentSession.results.reduce((sum, r) => sum + r.processingTime, 0) / currentSession.results.length)}ms
            </p>
          </div>
          
          <div className="p-4 bg-purple-500/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-purple-300 font-medium">AI Insights</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {currentSession.results.reduce((sum, r) => sum + (r.aiInsights?.length || 0), 0)}
            </p>
          </div>
          
          <div className="p-4 bg-orange-500/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-5 w-5 text-orange-400" />
              <span className="text-orange-300 font-medium">Success Rate</span>
            </div>
            <p className="text-2xl font-bold text-white">100%</p>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-3">
          {currentSession.results.map((result, index) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                selectedResult === result.id || (!selectedResult && index === 0)
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/20 bg-white/5 hover:border-white/40'
              }`}
              onClick={() => setSelectedResult(result.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium capitalize">
                      {result.type.replace('-', ' ')} Analysis
                    </h4>
                    <p className="text-gray-400 text-sm">
                      {result.createdAt.toLocaleString()} • {result.processingTime}ms
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {result.aiInsights && result.aiInsights.length > 0 && (
                    <div className="flex items-center space-x-1 text-purple-400">
                      <Brain className="h-4 w-4" />
                      <span className="text-sm">{result.aiInsights.length}</span>
                    </div>
                  )}
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Selected Result Details */}
      {selectedResultData && (
        <motion.div
          key={selectedResultData.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white capitalize">
              {selectedResultData.type.replace('-', ' ')} Results
            </h3>
            <div className="flex items-center space-x-2">
              <button className="p-2 bg-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-200">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Charts */}
          <div className="mb-8">
            {renderChart(selectedResultData.result, selectedResultData.type)}
          </div>

          {/* AI Insights */}
          {selectedResultData.aiInsights && selectedResultData.aiInsights.length > 0 && (
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white">AI Insights</h4>
              </div>
              <div className="space-y-3">
                {selectedResultData.aiInsights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg"
                  >
                    <div className="p-1 bg-purple-500/20 rounded-full mt-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    </div>
                    <p className="text-gray-200 flex-1">{insight}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Data */}
          <div className="mt-6">
            <details className="bg-white/5 rounded-lg">
              <summary className="p-4 cursor-pointer text-white font-medium hover:bg-white/10 transition-colors duration-200">
                View Raw Data
              </summary>
              <div className="p-4 border-t border-white/10">
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  {JSON.stringify(selectedResultData.result, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default ResultsViewer