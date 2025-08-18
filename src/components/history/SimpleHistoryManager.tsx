import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { 
  History, 
  Search, 
  Calendar,
  Dna,
  Microscope,
  Trash2,
  Eye,
  Clock,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export interface SimpleHistoryItem {
  id: string
  type: 'consultation' | 'analysis' | 'sequence'
  title: string
  sequence: string
  sequenceType: 'dna' | 'rna' | 'protein'
  question?: string
  createdAt: Date
  results?: any
  aiInsights?: any[]
}

interface SimpleHistoryManagerProps {
  onItemSelect?: (item: SimpleHistoryItem) => void
  onItemDelete?: (itemId: string) => void
  maxItems?: number
}

const SimpleHistoryManager: React.FC<SimpleHistoryManagerProps> = ({
  onItemSelect,
  onItemDelete,
  maxItems = 50
}) => {
  const { currentUser } = useAuth()
  const [items, setItems] = useState<SimpleHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'consultation' | 'analysis' | 'sequence'>('all')

  useEffect(() => {
    if (currentUser) {
      loadHistory()
    }
  }, [currentUser])

  const loadHistory = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      // Load consultations (simplified query to avoid index requirement)
      const consultationsQuery = query(
        collection(db, 'consultations'),
        where('userId', '==', currentUser.uid)
      )
      const consultationsSnapshot = await getDocs(consultationsQuery)
      
      const consultations = consultationsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          type: 'consultation' as const,
          title: `${data.sequenceType?.toUpperCase() || 'DNA'} Analysis`,
          sequence: data.sequence || '',
          sequenceType: data.sequenceType || 'dna',
          question: data.question || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          results: data.analysis,
          aiInsights: data.aiInsights || []
        }
      })

      // Load sequences (simplified query to avoid index requirement)
      const sequencesQuery = query(
        collection(db, 'sequences'),
        where('uid', '==', currentUser.uid)
      )
      const sequencesSnapshot = await getDocs(sequencesQuery)
      
      const sequences = sequencesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          type: 'sequence' as const,
          title: `${data.type?.toUpperCase() || 'DNA'} Sequence`,
          sequence: data.sequence || '',
          sequenceType: data.type || 'dna',
          createdAt: data.createdAt?.toDate() || new Date(),
          results: null,
          aiInsights: []
        }
      })

      // Combine and sort by date
      const allItems = [...consultations, ...sequences]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, maxItems)

      setItems(allItems)
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (itemId: string, itemType: string) => {
    try {
      const collectionName = itemType === 'consultation' ? 'consultations' : 'sequences'
      await deleteDoc(doc(db, collectionName, itemId))
      
      setItems(items.filter(item => item.id !== itemId))
      toast.success('Item deleted successfully')
      
      if (onItemDelete) {
        onItemDelete(itemId)
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sequence.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.question && item.question.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3 text-white">Loading history...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center">
          <History className="h-5 w-5 mr-2" />
          Analysis History
        </h2>
        <div className="text-sm text-gray-400">
          {filteredItems.length} of {items.length} items
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
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
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="consultation">Consultations</option>
          <option value="sequence">Sequences</option>
        </select>
      </div>

      {/* History Items */}
      <div className="space-y-4">
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {item.type === 'consultation' ? (
                    <Microscope className="h-5 w-5 text-blue-400" />
                  ) : (
                    <Dna className="h-5 w-5 text-green-400" />
                  )}
                  <h3 className="text-white font-medium">{item.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.sequenceType === 'dna' ? 'bg-blue-500/20 text-blue-300' :
                    item.sequenceType === 'rna' ? 'bg-green-500/20 text-green-300' :
                    'bg-purple-500/20 text-purple-300'
                  }`}>
                    {item.sequenceType.toUpperCase()}
                  </span>
                </div>
                
                <div className="text-gray-300 text-sm mb-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {item.createdAt.toLocaleDateString()}
                    </div>
                    <div>
                      Length: {item.sequence.length} {item.sequenceType === 'protein' ? 'amino acids' : 'nucleotides'}
                    </div>
                  </div>
                </div>

                {item.question && (
                  <p className="text-gray-400 text-sm mb-2">
                    Question: {item.question}
                  </p>
                )}

                <div className="text-gray-400 text-xs font-mono bg-black/20 p-2 rounded">
                  {item.sequence.length > 100 
                    ? `${item.sequence.substring(0, 100)}...` 
                    : item.sequence}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {onItemSelect && item.results && (
                  <button
                    onClick={() => onItemSelect(item)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors duration-200"
                    title="Load analysis"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(item.id, item.type)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                  title="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No history found</h3>
          <p className="text-gray-400">
            {items.length === 0 
              ? "You haven't performed any analyses yet." 
              : "Try adjusting your search or filter criteria."}
          </p>
        </div>
      )}
    </div>
  )
}

export default SimpleHistoryManager