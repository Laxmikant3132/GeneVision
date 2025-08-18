import React, { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const FirebaseTest: React.FC = () => {
  const { currentUser } = useAuth()
  const [testData, setTestData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const testWrite = async () => {
    if (!currentUser) {
      toast.error('Please log in first')
      return
    }

    setLoading(true)
    try {
      console.log('Testing Firebase write...')
      const testDoc = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        testMessage: 'Hello Firebase!',
        timestamp: serverTimestamp(),
        createdAt: new Date()
      }

      console.log('Writing test document:', testDoc)
      const docRef = await addDoc(collection(db, 'test'), testDoc)
      console.log('Test document written with ID:', docRef.id)
      toast.success('Test write successful!')
      
      // Immediately try to read it back
      await testRead()
    } catch (error) {
      console.error('Test write failed:', error)
      toast.error('Test write failed: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const testRead = async () => {
    try {
      console.log('Testing Firebase read...')
      // Read only current user's test docs to satisfy rules
      const q = currentUser 
        ? (await import('firebase/firestore')).query(
            collection(db, 'test'),
            (await import('firebase/firestore')).where('userId', '==', currentUser.uid)
          )
        : null
      const snapshot = q ? await (await import('firebase/firestore')).getDocs(q) : await getDocs(collection(db, 'test'))
      const data: any[] = []
      
      console.log('Found', snapshot.size, 'test documents')
      snapshot.forEach((doc) => {
        const docData = doc.data()
        console.log('Test document:', docData)
        data.push({ id: doc.id, ...docData })
      })
      
      setTestData(data)
      toast.success(`Read ${data.length} test documents`)
    } catch (error) {
      console.error('Test read failed:', error)
      toast.error('Test read failed: ' + (error as Error).message)
    }
  }

  const testConsultations = async () => {
    try {
      console.log('Testing consultations read...')
      // Restrict to current user's docs to comply with rules
      const { query, where, getDocs } = await import('firebase/firestore')
      const q = currentUser 
        ? query(collection(db, 'consultations'), where('userId', '==', currentUser.uid))
        : query(collection(db, 'consultations'), where('userId', '==', '__none__'))
      const snapshot = await getDocs(q)
      console.log('Found', snapshot.size, 'consultations')
      
      if (snapshot.size === 0) {
        console.log('No consultations found - this might be normal if none exist yet')
      }
      
      snapshot.forEach((doc) => {
        console.log('Consultation:', doc.id, doc.data())
      })
      
      toast.success(`Found ${snapshot.size} consultations`)
    } catch (error) {
      console.error('Consultations read failed:', error)
      console.error('Error details:', error)
      toast.error('Consultations read failed: ' + (error as Error).message)
    }
  }

  const testUsers = async () => {
    try {
      console.log('Testing users read...')
      // Only allow own profile unless moderator
      const { getDoc, doc } = await import('firebase/firestore')
      if (!currentUser) {
        toast.error('Login first')
        return
      }
      const myDoc = await getDoc(doc(db, 'users', currentUser.uid))
      console.log('My user profile:', myDoc.exists() ? myDoc.data() : null)
      toast.success('Read current user profile')
    } catch (error) {
      console.error('Users read failed:', error)
      toast.error('Users read failed: ' + (error as Error).message)
    }
  }

  useEffect(() => {
    if (currentUser) {
      testRead()
    }
  }, [currentUser])

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Firebase Connection Test</h2>
      
      <div className="space-y-4">
        <div>
          <p><strong>Current User:</strong> {currentUser ? currentUser.email : 'Not logged in'}</p>
          <p><strong>User ID:</strong> {currentUser ? currentUser.uid : 'N/A'}</p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={testWrite}
            disabled={loading || !currentUser}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Write'}
          </button>
          
          <button
            onClick={testRead}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Read
          </button>

          <button
            onClick={testConsultations}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Check Consultations
          </button>

          <button
            onClick={testUsers}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Check Users
          </button>
        </div>

        <div>
          <h3 className="font-semibold">Test Data ({testData.length} items):</h3>
          <div className="max-h-40 overflow-y-auto bg-gray-100 p-2 rounded">
            {testData.map((item, index) => (
              <div key={index} className="text-sm mb-1">
                <strong>{item.id}:</strong> {item.testMessage} - {item.userEmail}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FirebaseTest