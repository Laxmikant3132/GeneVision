import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { 
  History, 
  Search, 
  Filter, 
  Calendar,
  Dna,
  Microscope,
  BarChart3,
  Trash2,
  Eye,
  Star,
  StarOff,
  Download,
  Share2,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'

export interface HistoryItem {
  id: string
  type: 'consultation' | 'analysis' | 'sequence'
  title: string
  description: string
  sequenceType: 'dna' | 'rna' | 'protein'
  sequence: string
  question?: string
  results?: any
  aiInsights?: any[]
  createdAt: Date
  updatedAt: Date
  isFavorite: boolean
  tags: string[]
  status: 'completed' | 'flagged' | 'processing'
}

interface AnalysisHistoryManagerProps {
  onItemSelect?: (item: HistoryItem) => void
  onItemDelete?: (itemId: string) => void
  maxItems?: number
  showFilters?: boolean
  showSearch?: boolean
  compactView?: boolean
}

const AnalysisHistoryManager: React.FC<AnalysisHistoryManagerProps> = ({
  onItemSelect,
  onItemDelete,
  maxItems = 50,
  showFilters = true,
  showSearch = true,
  compactView = false
}) => {
  const { currentUser } = useAuth()
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'consultation' | 'analysis' | 'sequence'>('all')
  const [selectedSequenceType, setSelectedSequenceType] = useState<'all' | 'dna' | 'rna' | 'protein'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  useEffect(() => {
    if (currentUser) {
      loadHistoryItems()
    }
  }, [currentUser])

  const loadHistoryItems = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      const items: HistoryItem[] = []

      // Load consultations
      const consultationsQuery = query(
        collection(db, 'consultations'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      )
      const consultationsSnapshot = await getDocs(consultationsQuery)
      
      consultationsSnapshot.forEach((doc) => {
        const data = doc.data()
        items.push({
          id: doc.id,
          type: 'consultation',
          title: `${data.sequenceType?.toUpperCase() || 'DNA'} Consultation`,
          description: data.question || 'AI-powered sequence analysis',
          sequenceType: data.sequenceType || 'dna',
          sequence: data.sequence || '',
          question: data.question,
          results: data.analysis,
          aiInsights: data.aiInsights || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.createdAt?.toDate() || new Date(),
          isFavorite: data.isFavorite || false,
          tags: data.tags || [data.sequenceType || 'dna'],
          status: data.status || 'completed'
        })
      })

      // Load sequences
      const sequencesQuery = query(
        collection(db, 'sequences'),
        where('uid', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      )
      const sequencesSnapshot = await getDocs(sequencesQuery)
      
      sequencesSnapshot.forEach((doc) => {
        const data = doc.data()
        items.push({
          id: doc.id,
          type: 'sequence',
          title: data.name || `${data.type?.toUpperCase() || 'DNA'} Sequence`,
          description: data.description || `${data.sequence?.length || 0} bp/aa sequence`,
          sequenceType: data.type || 'dna',
          sequence: data.sequence || '',
          results: null,
          aiInsights: [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
          isFavorite: data.isFavorite || false,
          tags: data.tags || [data.type || 'dna'],
          status: data.status || 'completed'
        })
      })

      // Sort by date (most recent first) and limit
      const sortedItems = items
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, maxItems)

      setHistoryItems(sortedItems)
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Failed to load analysis history')
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedItems = useMemo(() => {
    let filtered = historyItems

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.question?.toLowerCase().includes(term) ||
        item.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType)
    }

    // Apply sequence type filter
    if (selectedSequenceType !== 'all') {
      filtered = filtered.filter(item => item.sequenceType === selectedSequenceType)
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1)
          break
      }
      
      filtered = filtered.filter(item => item.createdAt >= filterDate)
    }

    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(item => item.isFavorite)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [historyItems, searchTerm, selectedType, selectedSequenceType, dateFilter, sortBy, sortOrder, showFavoritesOnly])

  const toggleFavorite = async (itemId: string) => {
    try {
      const item = historyItems.find(i => i.id === itemId)
      if (!item) return

      const newFavoriteStatus = !item.isFavorite
      
      // Update in Firestore
      const collectionName = item.type === 'consultation' ? 'consultations' : 'sequences'
      await updateDoc(doc(db, collectionName, itemId), {
        isFavorite: newFavoriteStatus
      })

      // Update local state
      setHistoryItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, isFavorite: newFavoriteStatus } : i
      ))

      toast.success(newFavoriteStatus ? 'Added to favorites' : 'Removed from favorites')
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite status')
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      const item = historyItems.find(i => i.id === itemId)
      if (!item) return

      const collectionName = item.type === 'consultation' ? 'consultations' : 'sequences'
      await deleteDoc(doc(db, collectionName, itemId))

      setHistoryItems(prev => prev.filter(i => i.id !== itemId))
      onItemDelete?.(itemId)
      toast.success('Item deleted successfully')
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation': return <Microscope className="h-4 w-4" />
      case 'analysis': return <BarChart3 className="h-4 w-4" />
      case 'sequence': return <Dna className="h-4 w-4" />
      default: return <History className="h-4 w-4" />
    }
  }

  const getSequenceTypeColor = (type: string) => {
    switch (type) {
      case 'dna': return 'bg-blue-500/20 text-blue-300'
      case 'rna': return 'bg-green-500/20 text-green-300'
      case 'protein': return 'bg-purple-500/20 text-purple-300'
      default: return 'bg-gray-500/20 text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'flagged': return <AlertCircle className="h-4 w-4 text-yellow-400" />
      case 'processing': return <Clock className="h-4 w-4 text-blue-400" />
      default: return <Info className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-white">Loading history...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <History className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Analysis History</h2>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
            {filteredAndSortedItems.length}
          </span>
        </div>
        
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
            showFavoritesOnly 
              ? 'bg-yellow-500/20 text-yellow-300' 
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          {showFavoritesOnly ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
          <span>Favorites</span>
        </button>
      </div>

      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="space-y-4">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="consultation">Consultations</option>
                <option value="analysis">Analyses</option>
                <option value="sequence">Sequences</option>
              </select>

              <select
                value={selectedSequenceType}
                onChange={(e) => setSelectedSequenceType(e.target.value as any)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sequences</option>
                <option value="dna">DNA</option>
                <option value="rna">RNA</option>
                <option value="protein">Protein</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-')
                  setSortBy(newSortBy as any)
                  setSortOrder(newSortOrder as any)
                }}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="type-asc">Type A-Z</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* History Items */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredAndSortedItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchTerm || selectedType !== 'all' || dateFilter !== 'all' 
                  ? 'No items match your filters' 
                  : 'No analysis history yet'
                }
              </p>
            </motion.div>
          ) : (
            filteredAndSortedItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 ${
                  compactView ? 'p-3' : 'p-4'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      {getTypeIcon(item.type)}
                      <h3 className="text-white font-medium truncate">{item.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSequenceTypeColor(item.sequenceType)}`}>
                        {item.sequenceType.toUpperCase()}
                      </span>
                      {getStatusIcon(item.status)}
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">{item.description}</p>
                    
                    {item.aiInsights && item.aiInsights.length > 0 && (
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="h-3 w-3 text-yellow-400" />
                        <span className="text-xs text-yellow-400">
                          {item.aiInsights.length} AI insights
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{item.createdAt.toLocaleDateString()}</span>
                      </span>
                      <span>{item.sequence.length} bp/aa</span>
                      {item.tags.length > 0 && (
                        <div className="flex space-x-1">
                          {item.tags.slice(0, 2).map((tag, index) => (
                            <span key={index} className="px-1 py-0.5 bg-white/10 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 2 && (
                            <span className="text-gray-400">+{item.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        item.isFavorite 
                          ? 'text-yellow-400 hover:bg-yellow-500/20' 
                          : 'text-gray-400 hover:text-yellow-400 hover:bg-white/10'
                      }`}
                    >
                      {item.isFavorite ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                    </button>
                    
                    {onItemSelect && (
                      <button
                        onClick={() => onItemSelect(item)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-white/10 transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AnalysisHistoryManager