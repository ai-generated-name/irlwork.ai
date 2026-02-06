  const uploadFile = async (file) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('filename', file.name)
      const res = await fetch(`${API_URL}/upload/proof`, {
        method: 'POST',
        headers: { Authorization: localStorage.getItem('token') || '' },
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        setUploadedUrls(prev => [...prev, data.url])
        return data.url
      }
    } catch (e) {
      console.error('Upload error:', e)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!proofText.trim() && uploadedUrls.length === 0) {
      alert('Please provide proof text or upload images')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ proofText, proofUrls: uploadedUrls })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Submit Proof</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">{Icons.x}</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Describe your work</label>
            <textarea
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Describe what you did to complete this task..."
              rows={4}
              className={`${styles.input} resize-none`}
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-2">Upload Proof (max 3 files)</label>
            <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-orange-500 transition-colors" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              <div className="text-3xl mb-2">{Icons.upload}</div>
              <p className="text-gray-400 text-sm">Click to upload images</p>
            </div>
            
            {files.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {files.map((file, i) => (
                  <div key={i} className="relative bg-white/10 rounded-lg p-2 flex items-center gap-2">
                    <span className="text-sm text-white">{file.name.slice(0, 15)}...</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-400">{Icons.x}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {uploadedUrls.length > 0 && (
            <div className="text-green-400 text-sm flex items-center gap-2">
              <span>{Icons.check}</span> {uploadedUrls.length} files uploaded
            </div>
          )}
        </div>
        
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting || uploading}>
            {submitting ? 'Submitting...' : 'Submit Proof'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// === Proof Submission Modal (Human) ===
function ProofSubmitModal({ task, onClose, onSubmit }) {
  const [proofText, setProofText] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length + files.length > 3) {
      alert('Maximum 3 files allowed')
      return
    }
    setFiles(prev => [...prev, ...selected].slice(0, 3))
  }

  const uploadFile = async (file) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('filename', file.name)
      const res = await fetch(`${API_URL}/upload/proof`, {
        method: 'POST',
        headers: { Authorization: localStorage.getItem('token') || '' },
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        setUploadedUrls(prev => [...prev, data.url])
        return data.url
      }
    } catch (e) {
      console.error('Upload error:', e)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!proofText.trim() && uploadedUrls.length === 0) {
      alert('Please provide proof text or upload images')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ proofText, proofUrls: uploadedUrls })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Submit Proof</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">{Icons.x}</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Describe your work</label>
            <textarea
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Describe what you did to complete this task..."
              rows={4}
              className={`${styles.input} resize-none`}
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-2">Upload Proof (max 3 files)</label>
            <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-orange-500 transition-colors" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              <div className="text-3xl mb-2">{Icons.upload}</div>
              <p className="text-gray-400 text-sm">Click to upload images</p>
            </div>
            
            {files.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {files.map((file, i) => (
                  <div key={i} className="relative bg-white/10 rounded-lg p-2 flex items-center gap-2">
                    <span className="text-sm text-white">{file.name.slice(0, 15)}...</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-400">{Icons.x}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {uploadedUrls.length > 0 && (
            <div className="text-green-400 text-sm flex items-center gap-2">
              <span>{Icons.check}</span> {uploadedUrls.length} files uploaded
            </div>
          )}
        </div>
        
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting || uploading}>
            {submitting ? 'Submitting...' : 'Submit Proof'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// === Proof Review Modal (Agent) ===
function ProofReviewModal({ task, onClose, onApprove, onReject }) {
  const [feedback, setFeedback] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [hours, setHours] = useState(24)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Review Proof</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">{Icons.x}</button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-2">{task.title}</h3>
            <p className="text-gray-400 text-sm">{task.description}</p>
          </div>
          
          {task.proof_description && (
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-gray-400 text-sm mb-2">Human's Proof:</h4>
              <p className="text-white">{task.proof_description}</p>
            </div>
          )}
          
          {task.proof_urls?.length > 0 && (
            <div>
              <h4 className="text-gray-400 text-sm mb-2">Proof Images:</h4>
              <div className="flex gap-2 flex-wrap">
                {task.proof_urls.map((url, i) => (
                  <img key={i} src={url} alt={`Proof ${i + 1}`} className="w-24 h-24 object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Feedback (optional for approve, required for reject)</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback..."
              rows={3}
              className={`${styles.input} resize-none`}
            />
          </div>
          
          {rejecting && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">Extend deadline by (hours)</label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                min={1}
                max={168}
                className={styles.input}
              />
            </div>
          )}
        </div>
        
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button variant="secondary" className="flex-1" onClick={() => setRejecting(!rejecting)}>
            {rejecting ? 'Cancel Reject' : 'Reject & Request Changes'}
          </Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => onApprove()}>
            Approve & Pay
          </Button>
        </div>
        
        {rejecting && (
          <Button className="w-full mt-3 bg-red-600 hover:bg-red-700" onClick={() => onReject({ feedback, extendHours: hours })} disabled={!feedback.trim()}>
            Confirm Rejection
          </Button>
        )}
      </div>
    </div>
  )
}

// === Dashboard Component ===
function Dashboard({ user, onLogout, needsOnboarding, onCompleteOnboarding }) {
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [humans, setHumans] = useState([])
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showProofSubmit, setShowProofSubmit] = useState(null)
  const [showProofReview, setShowProofReview] = useState(null)
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] })

  useEffect(() => {
    if (user?.type === 'agent') {
      fetchPostedTasks()
      fetchNotifications()
    } else {
      fetchTasks()
      fetchHumans()
      fetchWallet()
    }
  }, [user])

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/my-tasks`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setTasks(data || [])
      }
    } catch (e) {
      console.log('Could not fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchPostedTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/agent/tasks`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setTasks(data || [])
      }
    } catch (e) {
      console.log('Could not fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchHumans = async () => {
    try {
      const res = await fetch(`${API_URL}/humans`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setHumans(data || [])
      }
    } catch (e) {
      console.log('Could not fetch humans')
    }
  }

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/status`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setWallet(data || { balance: 0, transactions: [] })
      }
    } catch (e) {
      console.log('Could not fetch wallet')
    }
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data || [])
      }
    } catch (e) {
      console.log('Could not fetch notifications')
    }
  }

  const acceptTask = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/accept`, { 
        method: 'POST',
        headers: { Authorization: user.id }
      })
      fetchTasks()
    } catch (e) {
      console.log('Could not accept task')
    }
  }

  const startTask = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/start`, { 
        method: 'POST',
        headers: { Authorization: user.id }
      })
      fetchTasks()
    } catch (e) {
      console.log('Could not start task')
    }
  }

  const submitProof = async ({ proofText, proofUrls }) => {
    try {
      await fetch(`${API_URL}/tasks/${showProofSubmit}/submit-proof`, {
        method: 'POST',
        headers: { 
          Authorization: user.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ proof_text: proofText, proof_urls: proofUrls })
      })
      setShowProofSubmit(null)
      fetchTasks()
    } catch (e) {
      console.log('Could not submit proof')
    }
  }

  const approveTask = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/approve`, { 
        method: 'POST',
        headers: { Authorization: user.id }
      })
      setShowProofReview(null)
      fetchPostedTasks()
    } catch (e) {
      console.log('Could not approve task')
    }
  }

  const rejectTask = async ({ feedback, extendHours }) => {
    try {
      await fetch(`${API_URL}/tasks/${showProofReview}/reject`, {
        method: 'POST',
        headers: { 
          Authorization: user.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedback, extend_deadline_hours: extendHours })
      })
      setShowProofReview(null)
      fetchPostedTasks()
    } catch (e) {
      console.log('Could not reject task')
    }
  }

  const getTaskStatus = (status) => {
    const colors = {
      open: 'bg-blue-500/20 text-blue-400',
      assigned: 'bg-purple-500/20 text-purple-400',
      in_progress: 'bg-yellow-500/20 text-yellow-400',
      pending_review: 'bg-orange-500/20 text-orange-400',
      completed: 'bg-green-500/20 text-green-400',
      paid: 'bg-gray-500/20 text-gray-400',
      disputed: 'bg-red-500/20 text-red-400'
    }
    return colors[status] || 'bg-gray-500/20 text-gray-400'
  }

  const humanNav = [
    { id: 'tasks', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Browse', icon: Icons.humans },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
    { id: 'profile', label: 'Profile', icon: Icons.profile },
  ]

  const agentNav = [
    { id: 'tasks', label: 'Posted Tasks', icon: Icons.task },
    { id: 'create', label: 'Create Task', icon: Icons.create },
    { id: 'humans', label: 'Hired', icon: Icons.humans },
    { id: 'profile', label: 'Profile', icon: Icons.profile },
  ]

  const navItems = user?.type === 'agent' ? agentNav : humanNav

  const unreadCount = notifications.filter(n => !n.read_at).length

  return (
    <div className={`min-h-screen ${styles.gradient} flex`}>
      {/* Sidebar */}
      <aside className="w-64 bg-white/5 border-r border-white/5 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => window.location.href = '/'}>
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl">👤</span>
          </div>
          <span className="text-xl font-bold text-white">irlwork.ai</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {user?.type === 'agent' && (
          <div className="relative mb-4">
            <button onClick={() => setShowNotifications(!showNotifications)} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all">
              <span>{Icons.bell}</span>
              <span>Notifications</span>
              {unreadCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
            </button>
            
            {showNotifications && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-gray-800 border border-white/10 rounded-xl p-4 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-gray-400 text-sm">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="text-sm text-white mb-3 pb-3 border-b border-white/10 last:border-0">
                      <p className="font-medium">{n.title}</p>
                      <p className="text-gray-400 text-xs">{n.message}</p>
                      <p className="text-gray-500 text-xs mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-white/5 pt-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user?.name || 'User'}</p>
              <p className="text-gray-500 text-xs capitalize">{user?.type || 'human'}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all">
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        {user?.type === 'agent' ? (
          // Agent Dashboard
          <>
            {activeTab === 'tasks' && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-8">Posted Tasks</h1>
                {loading ? <p className="text-gray-400">Loading...</p> : tasks.length === 0 ? (
                  <div className={`${styles.card} text-center py-12`}>
                    <p className="text-gray-400">No tasks posted yet</p>
                    <p className="text-sm text-gray-500 mt-2">Create a task to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map(task => (
                      <div key={task.id} className={`${styles.card}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-xs px-2 py-1 rounded ${getTaskStatus(task.status)}`}>{(task.status || 'open').toUpperCase()}</span>
                            <h3 className="text-lg font-semibold text-white mt-2">{task.title}</h3>
                            <p className="text-gray-400 text-sm">{task.category} • {task.city || 'Remote'} • Budget: ${task.budget}</p>
                            {task.human && <p className="text-gray-400 text-sm mt-1">Assigned to: {task.human.name}</p>}
                          </div>
                          <p className="text-green-400 font-bold">${task.budget || 0}</p>
                        </div>
                        {task.status === 'pending_review' && (
                          <div className="flex gap-3 mt-4">
                            <Button onClick={() => setShowProofReview(task.id)}>Review Proof</Button>
                          </div>
                        )}
                        {(task.status === 'paid' || task.status === 'completed') && (
                          <p className="text-green-400 text-sm mt-2">✓ Completed</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'create' && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-8">Create Task</h1>
                <form className={`${styles.card} max-w-2xl space-y-4`}>
                  <input type="text" placeholder="Task title" className={styles.input} />
                  <textarea placeholder="Description" rows={4} className={styles.input} />
                  <div className="grid grid-cols-2 gap-4">
                    <select className={styles.input}>
                      <option value="">Category</option>
                      {['delivery', 'pickup', 'errands', 'cleaning', 'moving', 'general'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" placeholder="Budget ($)" className={styles.input} />
                  </div>
                  <input type="text" placeholder="City" className={styles.input} />
                  <Button className="w-full">Create Task</Button>
                </form>
              </div>
            )}
            
            {activeTab === 'humans' && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-8">Hired Humans</h1>
                <div className={`${styles.card} text-center py-12`}>
                  <p className="text-gray-400">No humans hired yet</p>
                  <p className="text-sm text-gray-500 mt-2">Hire someone for a task</p>
                </div>
              </div>
            )}
          </>
        ) : (
          // Human Dashboard
          <>
            {activeTab === 'tasks' && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-8">My Tasks</h1>
                {loading ? <p className="text-gray-400">Loading...</p> : tasks.length === 0 ? (
                  <div className={`${styles.card} text-center py-12`}>
                    <p className="text-gray-400">No tasks yet</p>
                    <p className="text-sm text-gray-500 mt-2">Apply for tasks to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map(task => (
                      <div key={task.id} className={`${styles.card}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-xs px-2 py-1 rounded ${getTaskStatus(task.status)}`}>{(task.status || 'open').toUpperCase()}</span>
                            <h3 className="text-lg font-semibold text-white mt-2">{task.title}</h3>
                            <p className="text-gray-400 text-sm">{task.category} • {task.city || 'Remote'}</p>
                            {task.deadline && <p className="text-orange-400 text-sm mt-1">Due: {new Date(task.deadline).toLocaleDateString()}</p>}
                          </div>
                          <p className="text-green-400 font-bold">${task.budget || 0}</p>
                        </div>
                        <div className="flex gap-3 mt-4">
                          {task.status === 'open' && <Button onClick={() => acceptTask(task.id)}>Accept Task</Button>}
                          {task.status === 'assigned' && <Button onClick={() => startTask(task.id)}>Start Work</Button>}
                          {task.status === 'in_progress' && <Button onClick={() => setShowProofSubmit(task.id)}>Submit Proof</Button>}
                          {task.status === 'pending_review' && <Button variant="secondary">Waiting for Approval...</Button>}
                          {(task.status === 'paid' || task.status === 'completed') && <span className="text-green-400 flex items-center gap-2">✓ Paid!</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'browse' && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-8">Browse Tasks</h1>
                <div className="grid md:grid-cols-2 gap-4">
                  {humans.map(human => (
                    <div key={human.id} className={`${styles.card}`}>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">{human.name?.charAt(0) || '?'}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{human.name}</h3>
                          <p className="text-gray-400 text-sm">{Icons.location} {human.city || 'Remote'}</p>
                          <p className="text-green-400 font-semibold mt-1">${human.hourly_rate || 25}/hr</p>
                          {human.skills && <div className="flex flex-wrap gap-1 mt-2">{human.skills.slice(0, 3).map((s, i) => <span key={i} className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded">{s}</span>)}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'payments' && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-8">Payments</h1>
                <div className={`${styles.card} mb-6`}>
                  <p className="text-gray-400 text-sm">Available Balance</p>
                  <p className="text-4xl font-bold text-white mt-1">${wallet.balance.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">USDC</p>
                  <Button className="mt-6 w-full">Withdraw Funds</Button>
                </div>
                <h2 className="text-xl font-bold text-white mb-4">Recent Transactions</h2>
                {wallet.transactions?.length > 0 ? (
                  <div className="space-y-3">
                    {wallet.transactions.map(tx => (
                      <div key={tx.id} className={`${styles.card} flex justify-between items-center`}>
                        <div><p className="text-white">{tx.description || 'Task Payment'}</p><p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</p></div>
                        <p className={`font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{tx.amount > 0 ? '+' : ''}${tx.amount}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${styles.card} text-center py-12`}><p className="text-gray-400">No transactions yet</p></div>
                )}
              </div>
            )}
          </>
        )}
        
        {activeTab === 'profile' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Profile</h1>
            <div className={`${styles.card} max-w-xl`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-xl">{user?.name?.charAt(0) || '?'}</div>
                <div><h2 className="text-xl font-semibold text-white">{user?.name}</h2><p className="text-gray-400">{user?.email}</p></div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-white/10"><span className="text-gray-400">Location</span><span className="text-white">{user?.city || 'Not set'}</span></div>
                <div className="flex justify-between py-3 border-b border-white/10"><span className="text-gray-400">Hourly Rate</span><span className="text-white">${user?.hourly_rate || 25}/hr</span></div>
                <div className="flex justify-between py-3 border-b border-white/10"><span className="text-gray-400">Jobs Completed</span><span className="text-white">{user?.jobs_completed || 0}</span></div>
                <div className="flex justify-between py-3"><span className="text-gray-400">Skills</span><span className="text-white">{user?.skills?.join(', ') || 'None'}</span></div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {showProofSubmit && <ProofSubmitModal task={tasks.find(t => t.id === showProofSubmit)} onClose={() => setShowProofSubmit(null)} onSubmit={submitProof} />}
      {showProofReview && <ProofReviewModal task={tasks.find(t => t.id === showProofReview)} onClose={() => setShowProofReview(null)} onApprove={() => approveTask(showProofReview)} onReject={rejectTask} />}
    </div>
  )
}

function MCPPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">👤</span>
            </div>
            <span className="text-xl font-bold">irlwork.ai</span>
          </a>
          <a href="/" className="text-gray-400 hover:text-white">Home</a>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">MCP API</h1>
        <p className="text-xl text-gray-400 mb-12">Programmatic access for AI agents to manage tasks</p>
        
        <div className="space-y-6">
          <div className={`${styles.card}`}>
            <h2 className="text-xl font-bold mb-4">Authentication</h2>
            <p className="text-gray-400 mb-4">Use your API key in the Authorization header:</p>
            <pre className="bg-gray-800 rounded-xl p-4 text-sm overflow-x-auto"><code>Authorization: Bearer irl_your_api_key</code></pre>
          </div>
          
          <div className={`${styles.card}`}>
            <h2 className="text-xl font-bold mb-4">Methods</h2>
            <div className="space-y-4">
              <div><code className="text-orange-400">post_task</code><p className="text-gray-400 text-sm">Create a new task</p></div>
              <div><code className="text-orange-400">list_humans</code><p className="text-gray-400 text-sm">Find available humans</p></div>
              <div><code className="text-orange-400">hire_human</code><p className="text-gray-400 text-sm">Assign human to task</p></div>
              <div><code className="text-orange-400">approve_task</code><p className="text-gray-400 text-sm">Approve and release payment</p></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        try {
          const res = await fetch(`${API_URL}/auth/verify`, { headers: { Authorization: session.user.id } })
          if (res.ok) { const data = await res.json(); setUser(data.user) }
        } catch (e) { setUser({ id: session.user.id, email: session.user.email, name: session.user.user_metadata?.full_name || 'User', type: 'human', needs_onboarding: true }) }
      } else { setUser(null) }
      setLoading(false)
    }
    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const res = await fetch(`${API_URL}/auth/verify`, { headers: { Authorization: session.user.id } })
          if (res.ok) { const data = await res.json(); setUser(data.user) }
        } catch (e) { setUser({ id: session.user.id, email: session.user.email, name: session.user.user_metadata?.full_name || 'User', type: 'human', needs_onboarding: true }) }
      } else { setUser(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => { await supabase.auth.signOut(); setUser(null); window.location.href = '/' }

  const handleOnboardingComplete = async (profile) => {
    try {
      const res = await fetch(`${API_URL}/humans/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: user.id }, body: JSON.stringify(profile) })
      if (res.ok) { const data = await res.json(); setUser(data.user); window.location.href = '/dashboard' }
    } catch (e) { console.error(e) }
  }

  if (loading) return <Loading />
  if (path === '/auth') return <AuthPage onLogin={(u) => setUser(u)} />
  if (path === '/dashboard' && !user) { window.location.href = '/auth'; return <Loading /> }
  if (path === '/dashboard' && user) return user.needs_onboarding ? <Onboarding onComplete={handleOnboardingComplete} /> : <Dashboard user={user} onLogout={logout} />
  if (path === '/mcp') return <MCPPage />
  return <LandingPage onNavigate={(p) => { setPath(p); window.history.pushState({}, '', p) }} />
}

export default App
