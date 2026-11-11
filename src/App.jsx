import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase.js'
import './App.css'

const authMessages = {
  signUp: 'Registracija nepavyko. Patikrinkite duomenis ir bandykite dar kartą.',
  signIn: 'Prisijungti nepavyko. Patikrinkite el. paštą ir slaptažodį.',
  signOut: 'Atsijungti nepavyko. Bandykite dar kartą.',
}

function formatRequestCount(count) {
  if (count === null || count === undefined) return 'Skaičius nepasiekiamas'
  const lastTwoDigits = count % 100
  const lastDigit = count % 10
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return `${count} užklausų`
  if (lastDigit === 1) return `${count} užklausa`
  if (lastDigit >= 2 && lastDigit <= 9) return `${count} užklausos`
  return `${count} užklausų`
}

function App() {
  const [session, setSession] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [openProjectMenuId, setOpenProjectMenuId] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const userMenuRef = useRef(null)
  const userMenuButtonRef = useRef(null)
  const userMenuItemRef = useRef(null)
  const projectMenuRootRef = useRef(null)
  const projectMenuButtonRefs = useRef(new Map())
  const projectMenuItemRef = useRef(null)
  const sessionUserIdRef = useRef(null)
  const authEventVersionRef = useRef(0)
  const projectLoadIdRef = useRef(0)
  const requestLoadIdRef = useRef(0)
  const selectedProjectIdRef = useRef('')
  const refreshInFlightRef = useRef(false)
  const savingRef = useRef(false)
  const [mode, setMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authMessageType, setAuthMessageType] = useState('error')

  const [screen, setScreen] = useState('list')
  const [projects, setProjects] = useState([])
  const [requestCounts, setRequestCounts] = useState({})
  const [projectCountError, setProjectCountError] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [requests, setRequests] = useState([])
  const [requestsForProjectId, setRequestsForProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [requestTitle, setRequestTitle] = useState('')
  const [urgency, setUrgency] = useState('normal')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false)
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [hasLoadedRequests, setHasLoadedRequests] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dataError, setDataError] = useState('')
  const [projectError, setProjectError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [editingProjectId, setEditingProjectId] = useState('')
  const [editingProjectName, setEditingProjectName] = useState('')
  const [editingRequestId, setEditingRequestId] = useState('')
  const [editingRequestTitle, setEditingRequestTitle] = useState('')
  const [editingRequestUrgency, setEditingRequestUrgency] = useState('normal')
  const [activeRecordAction, setActiveRecordAction] = useState('')
  const recordActionRef = useRef('')

  useEffect(() => {
    let isMounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        authEventVersionRef.current += 1
        const nextUserId = nextSession?.user?.id ?? null
        const userChanged = sessionUserIdRef.current !== nextUserId
        sessionUserIdRef.current = nextUserId
        setSession(nextSession)
        setIsInitializing(false)
        if (userChanged) {
          projectLoadIdRef.current += 1
          requestLoadIdRef.current += 1
          setProjects([])
          setRequestCounts({})
          setProjectCountError('')
          setRequests([])
          setRequestsForProjectId('')
          setSelectedProjectId('')
          selectedProjectIdRef.current = ''
          setHasLoadedProjects(false)
          setHasLoadedRequests(false)
          setIsLoadingProjects(false)
          setIsLoadingRequests(false)
          setProjectError('')
          setRequestError('')
          setDataError('')
          setSuccessMessage('')
        }
      }
    })

    const authEventVersion = authEventVersionRef.current
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!isMounted) return
        if (error) setAuthMessage('Nepavyko patikrinti prisijungimo būsenos. Atnaujinkite puslapį.')
        else if (authEventVersionRef.current === authEventVersion) {
          sessionUserIdRef.current = data.session?.user?.id ?? null
          setSession(data.session)
        }
        setIsInitializing(false)
      })
      .catch(() => {
        if (isMounted) {
          setAuthMessage('Nepavyko patikrinti prisijungimo būsenos. Atnaujinkite puslapį.')
          setIsInitializing(false)
        }
      })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!isUserMenuOpen) return undefined
    userMenuItemRef.current?.focus()

    function handleOutsidePointer(event) {
      if (!userMenuRef.current?.contains(event.target)) setIsUserMenuOpen(false)
    }
    function handleMenuKeyDown(event) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
        userMenuButtonRef.current?.focus()
      } else if (event.key === 'Tab') {
        setIsUserMenuOpen(false)
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const items = [...(userMenuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') ?? [])]
        if (items.length) {
          event.preventDefault()
          const currentIndex = items.indexOf(document.activeElement)
          const direction = event.key === 'ArrowDown' ? 1 : -1
          items[(currentIndex + direction + items.length) % items.length]?.focus()
        }
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    document.addEventListener('keydown', handleMenuKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer)
      document.removeEventListener('keydown', handleMenuKeyDown)
    }
  }, [isUserMenuOpen])

  useEffect(() => {
    if (!openProjectMenuId) return undefined
    projectMenuItemRef.current?.focus()

    function handleOutsidePointer(event) {
      if (!projectMenuRootRef.current?.contains(event.target)) setOpenProjectMenuId('')
    }
    function handleMenuKeyDown(event) {
      if (event.key === 'Escape') {
        const menuId = openProjectMenuId
        setOpenProjectMenuId('')
        projectMenuButtonRefs.current.get(menuId)?.focus()
      } else if (event.key === 'Tab') {
        setOpenProjectMenuId('')
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const items = [...(projectMenuRootRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') ?? [])]
        if (items.length) {
          event.preventDefault()
          const currentIndex = items.indexOf(document.activeElement)
          const direction = event.key === 'ArrowDown' ? 1 : -1
          items[(currentIndex + direction + items.length) % items.length]?.focus()
        }
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    document.addEventListener('keydown', handleMenuKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer)
      document.removeEventListener('keydown', handleMenuKeyDown)
    }
  }, [openProjectMenuId])

  const loadProjects = useCallback(async (userId, preferredProjectId) => {
    if (!userId) return
    const loadId = ++projectLoadIdRef.current
    setIsLoadingProjects(true)
    setProjectError('')
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      if (loadId !== projectLoadIdRef.current || sessionUserIdRef.current !== userId) return
      setProjects(data ?? [])
      let nextRequestCounts = Object.fromEntries((data ?? []).map((project) => [project.id, null]))
      let requestCountMessage = ''
      try {
        const { data: requestRows, error: countError } = await supabase
          .from('requests')
          .select('project_id')
          .eq('user_id', userId)
        if (countError) throw countError
        nextRequestCounts = Object.fromEntries((data ?? []).map((project) => [project.id, 0]))
        for (const request of requestRows ?? []) {
          nextRequestCounts[request.project_id] = (nextRequestCounts[request.project_id] ?? 0) + 1
        }
      } catch {
        requestCountMessage = 'Užklausų skaičių įkelti nepavyko.'
      }
      if (loadId !== projectLoadIdRef.current || sessionUserIdRef.current !== userId) return
      setRequestCounts(nextRequestCounts)
      setProjectCountError(requestCountMessage)
      const currentProjectId = selectedProjectIdRef.current
      const nextProjectId = data?.some((project) => project.id === preferredProjectId)
        ? preferredProjectId
        : data?.some((project) => project.id === currentProjectId)
          ? currentProjectId
          : (data?.[0]?.id ?? '')
      selectedProjectIdRef.current = nextProjectId
      setSelectedProjectId(nextProjectId)
      setHasLoadedProjects(true)
    } catch {
      if (loadId === projectLoadIdRef.current && sessionUserIdRef.current === userId) {
        setProjectError('Projektų įkelti nepavyko. Patikrinkite ryšį ir bandykite dar kartą.')
      }
    } finally {
      if (loadId === projectLoadIdRef.current) setIsLoadingProjects(false)
    }
  }, [])

  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId
  }, [selectedProjectId])

  useEffect(() => {
    const userId = session?.user?.id
    if (userId) Promise.resolve().then(() => loadProjects(userId))
  }, [session?.user?.id, loadProjects])

  const loadRequests = useCallback(async (projectId, userId) => {
    const loadId = ++requestLoadIdRef.current
    if (!userId || !projectId) {
      setRequests([])
      setHasLoadedRequests(true)
      setIsLoadingRequests(false)
      return
    }
    setIsLoadingRequests(true)
    setRequestError('')
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('id, project_id, title, urgency, created_at')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      if (loadId !== requestLoadIdRef.current
        || sessionUserIdRef.current !== userId
        || selectedProjectIdRef.current !== projectId) return
      setRequests(data ?? [])
      setRequestsForProjectId(projectId)
      setRequestCounts((current) => ({
        ...current,
        [projectId]: (data ?? []).length,
      }))
      setHasLoadedRequests(true)
    } catch {
      if (loadId === requestLoadIdRef.current && sessionUserIdRef.current === userId
        && selectedProjectIdRef.current === projectId) {
        setRequestError('Užklausų įkelti nepavyko. Patikrinkite ryšį ir bandykite dar kartą.')
      }
    } finally {
      if (loadId === requestLoadIdRef.current) setIsLoadingRequests(false)
    }
  }, [])

  useEffect(() => {
    const userId = session?.user?.id
    const projectId = selectedProjectId
    if (userId && projectId) {
      Promise.resolve().then(() => loadRequests(projectId, userId))
    }
  }, [session?.user?.id, selectedProjectId, loadRequests])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return undefined

    async function refreshVisibleData() {
      if (document.visibilityState !== 'visible' || refreshInFlightRef.current) return
      refreshInFlightRef.current = true
      try {
        await loadProjects(userId)
        const projectId = selectedProjectIdRef.current
        if (projectId) await loadRequests(projectId, userId)
      } finally {
        refreshInFlightRef.current = false
      }
    }

    document.addEventListener('visibilitychange', refreshVisibleData)
    window.addEventListener('focus', refreshVisibleData)
    return () => {
      document.removeEventListener('visibilitychange', refreshVisibleData)
      window.removeEventListener('focus', refreshVisibleData)
    }
  }, [session?.user?.id, loadProjects, loadRequests])

  function validateAuthForm() {
    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password || (mode === 'signUp' && !passwordRepeat)) return 'Užpildykite visus privalomus laukus.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return 'Įveskite tinkamą el. pašto adresą.'
    if (password.length < 8) return 'Slaptažodį turi sudaryti bent 8 simboliai.'
    if (mode === 'signUp' && password !== passwordRepeat) return 'Slaptažodžiai nesutampa.'
    return ''
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthMessage('')
    const validationError = validateAuthForm()
    if (validationError) {
      setAuthMessageType('error')
      setAuthMessage(validationError)
      return
    }
    setIsSubmitting(true)
    try {
      const result = mode === 'signUp'
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (result.error) {
        setAuthMessageType('error')
        setAuthMessage(authMessages[mode])
      } else if (mode === 'signUp' && !result.data.session) {
        setAuthMessageType('success')
        setAuthMessage('Registracija sėkminga. Dabar galite prisijungti.')
        setMode('signIn')
        setPassword('')
        setPasswordRepeat('')
      }
    } catch {
      setAuthMessageType('error')
      setAuthMessage(authMessages[mode])
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setAuthMessageType('error')
        setAuthMessage(authMessages.signOut)
      }
    } catch {
      setAuthMessageType('error')
      setAuthMessage(authMessages.signOut)
    } finally {
      setIsSubmitting(false)
    }
  }

  function openScreen(nextScreen) {
    setOpenProjectMenuId('')
    setDataError('')
    setSuccessMessage('')
    setScreen(nextScreen)
  }

  function selectProject(projectId) {
    if (projectId === selectedProjectIdRef.current) {
      if (projectId) loadRequests(projectId, session?.user?.id)
      return
    }
    selectedProjectIdRef.current = projectId
    setSelectedProjectId(projectId)
    setHasLoadedRequests(false)
    setRequestError('')
  }

  function beginProjectEdit(project) {
    setOpenProjectMenuId('')
    setEditingProjectId(project.id)
    setEditingProjectName(project.name)
    setDataError('')
  }

  function toggleProjectMenu(projectId, button) {
    projectMenuButtonRefs.current.set(projectId, button)
    setOpenProjectMenuId((current) => current === projectId ? '' : projectId)
  }

  async function handleUpdateProject(event, projectId) {
    event.preventDefault()
    if (recordActionRef.current || savingRef.current) return
    const name = editingProjectName.trim()
    if (!name) {
      setDataError('Projekto pavadinimas negali būti tuščias.')
      return
    }
    const userId = session?.user?.id
    if (!userId) return

    const actionKey = `project:${projectId}`
    recordActionRef.current = actionKey
    setActiveRecordAction(actionKey)
    setDataError('')
    setSuccessMessage('')
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ name })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select('id, name, created_at')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Project was not updated.')
      projectLoadIdRef.current += 1
      setIsLoadingProjects(false)
      setProjects((current) => current.map((project) => project.id === projectId ? data : project))
      setEditingProjectId('')
      setSuccessMessage('Projekto pavadinimas atnaujintas.')
    } catch {
      setDataError('Projekto išsaugoti nepavyko. Patikrinkite ryšį ir bandykite dar kartą.')
    } finally {
      recordActionRef.current = ''
      setActiveRecordAction('')
    }
  }

  async function handleDeleteProject(project) {
    if (recordActionRef.current || savingRef.current) return
    const userId = session?.user?.id
    if (!userId) return

    const actionKey = `project:${project.id}`
    recordActionRef.current = actionKey
    setActiveRecordAction(actionKey)
    setDataError('')
    setSuccessMessage('')
    try {
      const { count, error: countError } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('user_id', userId)
      if (countError) throw countError
      if (count === null) throw new Error('Unable to verify linked request count.')

      const confirmation = count > 0
        ? `Projekte „${project.name}“ turi ${count} užklausų. Ištrynus projektą dėl ON DELETE CASCADE bus ištrintos ir visos su juo susietos užklausos. Ar tikrai norite tęsti?`
        : `Ar tikrai norite ištrinti projektą „${project.name}“?`
      if (!window.confirm(confirmation)) return

      const { data, error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Project was not deleted.')

      projectLoadIdRef.current += 1
      requestLoadIdRef.current += 1
      setIsLoadingProjects(false)
      setIsLoadingRequests(false)
      const nextProjects = projects.filter((item) => item.id !== project.id)
      setProjects(nextProjects)
      setRequestCounts((current) => {
        const nextCounts = { ...current }
        delete nextCounts[project.id]
        return nextCounts
      })
      if (selectedProjectId === project.id) {
        const nextProjectId = nextProjects[0]?.id ?? ''
        selectedProjectIdRef.current = nextProjectId
        setSelectedProjectId(nextProjectId)
        setRequests([])
        setRequestsForProjectId('')
        setHasLoadedRequests(false)
      }
      if (editingProjectId === project.id) setEditingProjectId('')
      setSuccessMessage(count > 0
        ? `Projektas ir ${count} susietų užklausų ištrinti.`
        : 'Projektas ištrintas.')
    } catch {
      setDataError('Projekto ištrinti nepavyko. Jis gali būti jau pašalintas arba neturite prieigos.')
    } finally {
      recordActionRef.current = ''
      setActiveRecordAction('')
    }
  }

  function beginRequestEdit(request) {
    setEditingRequestId(request.id)
    setEditingRequestTitle(request.title)
    setEditingRequestUrgency(request.urgency)
    setDataError('')
  }

  async function handleUpdateRequest(event, requestId) {
    event.preventDefault()
    if (recordActionRef.current || savingRef.current) return
    const title = editingRequestTitle.trim()
    if (!title) {
      setDataError('Užklausos pavadinimas negali būti tuščias.')
      return
    }
    if (!['normal', 'high'].includes(editingRequestUrgency)) {
      setDataError('Pasirinkite leistiną užklausos prioritetą.')
      return
    }
    const userId = session?.user?.id
    if (!userId) return

    const actionKey = `request:${requestId}`
    recordActionRef.current = actionKey
    setActiveRecordAction(actionKey)
    setDataError('')
    setSuccessMessage('')
    try {
      const { data, error } = await supabase
        .from('requests')
        .update({ title, urgency: editingRequestUrgency })
        .eq('id', requestId)
        .eq('user_id', userId)
        .select('id, project_id, title, urgency, created_at')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Request was not updated.')
      requestLoadIdRef.current += 1
      setIsLoadingRequests(false)
      setRequests((current) => current.map((request) => request.id === requestId ? data : request))
      setEditingRequestId('')
      setSuccessMessage('Užklausa atnaujinta.')
    } catch {
      setDataError('Užklausos išsaugoti nepavyko. Patikrinkite ryšį ir bandykite dar kartą.')
    } finally {
      recordActionRef.current = ''
      setActiveRecordAction('')
    }
  }

  async function handleDeleteRequest(request) {
    if (recordActionRef.current || savingRef.current) return
    if (!window.confirm(`Ar tikrai norite ištrinti užklausą „${request.title}“?`)) return
    const userId = session?.user?.id
    if (!userId) return

    const actionKey = `request:${request.id}`
    recordActionRef.current = actionKey
    setActiveRecordAction(actionKey)
    setDataError('')
    setSuccessMessage('')
    try {
      const { data, error } = await supabase
        .from('requests')
        .delete()
        .eq('id', request.id)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Request was not deleted.')
      requestLoadIdRef.current += 1
      setIsLoadingRequests(false)
      setRequests((current) => current.filter((item) => item.id !== request.id))
      setRequestCounts((current) => ({
        ...current,
        [request.project_id]: Math.max(0, (current[request.project_id] ?? 0) - 1),
      }))
      if (editingRequestId === request.id) setEditingRequestId('')
      setSuccessMessage('Užklausa ištrinta.')
    } catch {
      setDataError('Užklausos ištrinti nepavyko. Ji gali būti jau pašalinta arba neturite prieigos.')
    } finally {
      recordActionRef.current = ''
      setActiveRecordAction('')
    }
  }

  async function handleCreateProject(event) {
    event.preventDefault()
    if (savingRef.current || recordActionRef.current) return
    if (!session?.user?.id) return
    const name = projectName.trim()
    if (!name) {
      setDataError('Įveskite projekto pavadinimą.')
      return
    }
    savingRef.current = true
    setIsSaving(true)
    setDataError('')
    setSuccessMessage('')
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ name })
        .select('id, name, created_at')
        .single()
      if (error) throw error
      setProjects((current) => [data, ...current])
      setRequestCounts((current) => ({ ...current, [data.id]: 0 }))
      selectedProjectIdRef.current = data.id
      setSelectedProjectId(data.id)
      setProjectName('')
      setSuccessMessage('Projektas sėkmingai sukurtas.')
      setScreen('list')
    } catch {
      setDataError('Projekto išsaugoti nepavyko. Patikrinkite ryšį ir bandykite dar kartą.')
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  async function handleCreateRequest(event) {
    event.preventDefault()
    if (savingRef.current || recordActionRef.current) return
    if (!session?.user?.id) return
    const title = requestTitle.trim()
    if (!title) {
      setDataError('Įveskite užklausos pavadinimą.')
      return
    }
    if (!selectedProjectId || !projects.some((project) => project.id === selectedProjectId)) {
      setDataError('Pasirinkite vieną iš savo projektų.')
      return
    }
    if (!['normal', 'high'].includes(urgency)) {
      setDataError('Pasirinkite leistiną užklausos prioritetą.')
      return
    }
    savingRef.current = true
    setIsSaving(true)
    setDataError('')
    setSuccessMessage('')
    try {
      const { data, error } = await supabase
        .from('requests')
        .insert({ project_id: selectedProjectId, title, urgency })
        .select('id, project_id, title, urgency, created_at')
        .single()
      if (error) throw error
      setRequests((current) => [data, ...current])
      setRequestsForProjectId(data.project_id)
      setRequestCounts((current) => ({
        ...current,
        [data.project_id]: (current[data.project_id] ?? 0) + 1,
      }))
      setHasLoadedRequests(true)
      setRequestTitle('')
      setUrgency('normal')
      setSuccessMessage('Užklausa sėkmingai sukurta.')
      setScreen('list')
    } catch {
      setDataError('Užklausos išsaugoti nepavyko. Patikrinkite ryšį ir bandykite dar kartą.')
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const projectNames = Object.fromEntries(projects.map((project) => [project.id, project.name]))
  const filteredProjects = projects.filter((project) => project.name.toLocaleLowerCase('lt-LT').includes(projectSearch.trim().toLocaleLowerCase('lt-LT')))

  if (isInitializing) {
    return <main className="page-shell"><p className="loading" role="status">Tikrinama prisijungimo būsena…</p></main>
  }

  if (!session) {
    return (
      <main className="page-shell">
        <header className="topbar"><a className="brand" href="/" aria-label="Smart Requests pradžia"><span className="brand-mark">S</span> Smart Requests</a></header>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="card-heading">
            <p className="eyebrow">SVEIKI ATVYKĘ</p>
            <h1 id="auth-title">{mode === 'signIn' ? 'Prisijunkite' : 'Sukurkite paskyrą'}</h1>
            <p className="subtitle">{mode === 'signIn' ? 'Prisijunkite prie savo Smart Requests paskyros.' : 'Užsiregistruokite ir pradėkite naudotis Smart Requests.'}</p>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="Autentifikavimo būdas">
            <button className={mode === 'signIn' ? 'tab active' : 'tab'} id="signin-tab" type="button" role="tab" aria-selected={mode === 'signIn'} onClick={() => { setMode('signIn'); setAuthMessage('') }}>Prisijungti</button>
            <button className={mode === 'signUp' ? 'tab active' : 'tab'} id="signup-tab" type="button" role="tab" aria-selected={mode === 'signUp'} onClick={() => { setMode('signUp'); setAuthMessage('') }}>Registruotis</button>
          </div>
          <form onSubmit={handleAuthSubmit} noValidate aria-labelledby={mode === 'signIn' ? 'signin-tab' : 'signup-tab'}>
            <label className="field-label" htmlFor="email">El. pašto adresas</label>
            <input id="email" className="text-input" type="email" autoComplete="email" placeholder="vardas@pastas.lt" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} />
            <label className="field-label" htmlFor="password">Slaptažodis</label>
            <input id="password" className="text-input" type="password" autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} placeholder="Bent 8 simboliai" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} />
            {mode === 'signUp' && <>
              <label className="field-label" htmlFor="password-repeat">Pakartokite slaptažodį</label>
              <input id="password-repeat" className="text-input" type="password" autoComplete="new-password" placeholder="Įveskite slaptažodį dar kartą" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} disabled={isSubmitting} />
            </>}
            {authMessage && <p className={`form-message ${authMessageType}`} role={authMessageType === 'error' ? 'alert' : 'status'}>{authMessage}</p>}
            <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? (mode === 'signIn' ? 'Jungiamasi…' : 'Registruojama…') : (mode === 'signIn' ? 'Prisijungti' : 'Sukurti paskyrą')}</button>
          </form>
          <p className="switch-prompt">{mode === 'signIn' ? 'Neturite paskyros?' : 'Jau turite paskyrą?'}{' '}
            <button type="button" className="text-button" onClick={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setAuthMessage('') }}>{mode === 'signIn' ? 'Registruokitės' : 'Prisijunkite'}</button>
          </p>
        </section>
        <footer className="footer">Paprastas būdas valdyti savo užklausas.</footer>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Smart Requests pradžia"><span className="brand-mark">S</span> Smart Requests</a>
        <div className="account-tools">
          <div className="user-menu" ref={userMenuRef}>
            <button className="user-menu-trigger" type="button" ref={userMenuButtonRef} aria-haspopup="menu" aria-expanded={isUserMenuOpen} aria-controls="user-menu-popup" onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}>
              <svg className="user-menu-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="6.5" r="3" /><path d="M3.5 17a6.5 6.5 0 0 1 13 0" /></svg>
              <span>Vartotojas</span>
              <svg className="user-menu-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 4.5 3.5 3 3.5-3" /></svg>
            </button>
            {isUserMenuOpen && <div className="user-menu-popup" id="user-menu-popup" role="menu" aria-label="Vartotojo meniu">
              <span className="user-menu-email" role="none">{session.user.email}</span>
              <button className="user-menu-signout" type="button" role="menuitem" ref={userMenuItemRef} onClick={() => { setIsUserMenuOpen(false); handleSignOut() }} disabled={isSubmitting || Boolean(activeRecordAction)}>{isSubmitting ? 'Atsijungiama…' : 'Atsijungti'}</button>
            </div>}
          </div>
        </div>
      </header>

      <section className="workspace">
        <div className="workspace-heading">
          <div><p className="eyebrow">JŪSŲ DARBO ERDVĖ</p><h1>Projektai ir užklausos</h1><p className="subtitle">Tvarkykite projektus ir stebėkite jų užklausas vienoje vietoje.</p></div>
          <div className="heading-actions"><button className="button button-secondary compact-button" type="button" onClick={() => openScreen('createProject')} disabled={Boolean(activeRecordAction)}>+ Naujas projektas</button><button className="button button-primary compact-button" type="button" onClick={() => openScreen('createRequest')} disabled={!projects.length || Boolean(activeRecordAction)}>+ Nauja užklausa</button></div>
        </div>

        <nav className="workspace-nav" aria-label="Pagrindinė navigacija">
          <button type="button" className={screen === 'list' ? 'nav-item active' : 'nav-item'} onClick={() => openScreen('list')} disabled={Boolean(activeRecordAction)}>Projektai ir užklausos</button>
          <button type="button" className={screen === 'createProject' ? 'nav-item active' : 'nav-item'} onClick={() => openScreen('createProject')} disabled={Boolean(activeRecordAction)}>Sukurti projektą</button>
          <button type="button" className={screen === 'createRequest' ? 'nav-item active' : 'nav-item'} onClick={() => openScreen('createRequest')} disabled={!projects.length || Boolean(activeRecordAction)}>Sukurti užklausą</button>
        </nav>

        <section className="content-card" aria-live="polite">
          {dataError && <div className="notice notice-error" role="alert"><span>{dataError}</span><button className="retry-button" type="button" onClick={() => setDataError('')}>Uždaryti</button></div>}
          {screen === 'list' && projectError && <div className="notice notice-error" role="alert"><span>{projectError}</span><button className="retry-button" type="button" onClick={() => loadProjects(session.user.id)}>Bandyti dar kartą</button></div>}
          {screen === 'list' && requestError && <div className="notice notice-error" role="alert"><span>{requestError}</span><button className="retry-button" type="button" onClick={() => loadRequests(selectedProjectId, session.user.id)}>Bandyti dar kartą</button></div>}
          {screen === 'createRequest' && projectError && <div className="notice notice-error" role="alert"><span>{projectError}</span><button className="retry-button" type="button" onClick={() => loadProjects(session.user.id)}>Bandyti dar kartą</button></div>}
          {successMessage && <p className="notice notice-success" role="status">{successMessage}</p>}

          {screen === 'createProject' && <div className="form-panel">
            <div className="panel-heading"><span className="panel-icon">01</span><div><h2>Naujas projektas</h2><p>Pridėkite projektą, kuriam kursite užklausas.</p></div></div>
            <form onSubmit={handleCreateProject}>
              <label className="field-label" htmlFor="project-name">Projekto pavadinimas</label>
              <input id="project-name" className="text-input" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Pvz., Svetainės atnaujinimas" maxLength={120} disabled={isSaving || Boolean(activeRecordAction)} />
              <div className="form-actions"><button className="button button-secondary compact-button" type="button" onClick={() => openScreen('list')} disabled={isSaving || Boolean(activeRecordAction)}>Atšaukti</button><button className="button button-primary compact-button" type="submit" disabled={isSaving || Boolean(activeRecordAction)}>{isSaving ? 'Kuriama…' : 'Sukurti projektą'}</button></div>
            </form>
          </div>}

          {screen === 'createRequest' && <div className="form-panel">
            <div className="panel-heading"><span className="panel-icon">02</span><div><h2>Nauja užklausa</h2><p>Pasirinkite projektą ir aprašykite, ko reikia.</p></div></div>
            {isLoadingProjects ? <p className="inline-loading" role="status">Kraunami projektai…</p> : projectError && projects.length === 0 ? null : projects.length === 0 && hasLoadedProjects ? <div className="empty-state compact-empty"><h3>Pirmiausia sukurkite projektą</h3><p>Užklausa turi priklausyti vienam iš jūsų projektų.</p><button className="button button-primary compact-button" type="button" onClick={() => openScreen('createProject')}>Sukurti projektą</button></div> : projects.length > 0 ? <form onSubmit={handleCreateRequest}>
              <label className="field-label" htmlFor="request-project">Projektas</label>
              <select id="request-project" className="text-input" value={selectedProjectId} onChange={(event) => selectProject(event.target.value)} disabled={isSaving}><option value="">Pasirinkite projektą</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
              <label className="field-label" htmlFor="request-title">Užklausos pavadinimas</label>
              <input id="request-title" className="text-input" value={requestTitle} onChange={(event) => setRequestTitle(event.target.value)} placeholder="Pvz., Paruošti pagrindinio puslapio dizainą" maxLength={200} disabled={isSaving} />
              <label className="field-label" htmlFor="request-urgency">Prioritetas</label>
              <select id="request-urgency" className="text-input" value={urgency} onChange={(event) => setUrgency(event.target.value)} disabled={isSaving}><option value="normal">Įprasta</option><option value="high">Skubi</option></select>
              <div className="form-actions"><button className="button button-secondary compact-button" type="button" onClick={() => openScreen('list')} disabled={isSaving || Boolean(activeRecordAction)}>Atšaukti</button><button className="button button-primary compact-button" type="submit" disabled={isSaving || Boolean(activeRecordAction)}>{isSaving ? 'Saugoma…' : 'Sukurti užklausą'}</button></div>
            </form> : null}
          </div>}

          {screen === 'list' && <>
            {isLoadingProjects && <p className="inline-loading" role="status">Kraunami projektai…</p>}
            {!isLoadingProjects && hasLoadedProjects && projects.length === 0 && !projectError && !dataError && <div className="empty-state"><div className="empty-illustration" aria-hidden="true">＋</div><h2>Pradėkite nuo pirmo projekto</h2><p>Projektai padeda tvarkingai grupuoti susijusias užklausas.</p><button className="button button-primary compact-button" type="button" onClick={() => openScreen('createProject')}>Sukurti pirmą projektą</button></div>}
            {projects.length > 0 && <>
              <div className="list-toolbar"><div><h2>Projektai</h2><p>Pasirinkite projektą, kad peržiūrėtumėte jo užklausas.</p></div><label className="project-search"><span className="sr-only">Ieškoti projekto</span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" placeholder="Ieškoti projekto..." value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} /></label></div>
              {projectCountError && <p className="count-warning" role="status">{projectCountError} Kortelėse vietoje skaičiaus rodoma brūkšnys.</p>}
              {filteredProjects.length > 0 ? <div className="project-grid">{filteredProjects.map((project) => <article className={project.id === selectedProjectId ? 'project-card selected' : 'project-card'} key={project.id}>
                {editingProjectId === project.id ? <form className="project-edit-form" onSubmit={(event) => handleUpdateProject(event, project.id)}>
                  <label className="field-label" htmlFor={`project-edit-${project.id}`}>Projekto pavadinimas</label>
                  <input id={`project-edit-${project.id}`} className="inline-edit-input" value={editingProjectName} onChange={(event) => setEditingProjectName(event.target.value)} maxLength={120} disabled={Boolean(activeRecordAction)} autoFocus />
                  <div className="project-edit-actions"><button className="inline-action save" type="submit" disabled={Boolean(activeRecordAction)}>{activeRecordAction === `project:${project.id}` ? 'Saugoma…' : 'Išsaugoti'}</button><button className="inline-action" type="button" onClick={() => setEditingProjectId('')} disabled={Boolean(activeRecordAction)}>Atšaukti</button></div>
                </form> : <button type="button" className="project-card-select" onClick={() => selectProject(project.id)} aria-pressed={project.id === selectedProjectId} disabled={Boolean(activeRecordAction)}>
                  <span className="project-card-indicator" aria-hidden="true" />
                  <strong title={project.name}>{project.name}</strong>
                  <span className="project-card-count">{formatRequestCount(requestCounts[project.id])}</span>
                </button>}
                <div className="project-menu-wrap" ref={openProjectMenuId === project.id ? projectMenuRootRef : null}>
                  <button className="project-menu-trigger" type="button" aria-label={`Veiksmai projektui ${project.name}`} aria-haspopup="menu" aria-expanded={openProjectMenuId === project.id} aria-controls={`project-menu-${project.id}`} ref={(element) => { if (element) projectMenuButtonRefs.current.set(project.id, element); else projectMenuButtonRefs.current.delete(project.id) }} onClick={(event) => toggleProjectMenu(project.id, event.currentTarget)} disabled={Boolean(activeRecordAction) || Boolean(editingProjectId) || Boolean(editingRequestId) || isSaving}>•••</button>
                  {openProjectMenuId === project.id && <div className="project-menu-popup" id={`project-menu-${project.id}`} role="menu" aria-label={`Projekto ${project.name} veiksmai`}>
                    <button type="button" role="menuitem" ref={projectMenuItemRef} onClick={() => beginProjectEdit(project)}>Redaguoti</button>
                    <button className="danger" type="button" role="menuitem" onClick={() => { setOpenProjectMenuId(''); handleDeleteProject(project) }}>Ištrinti</button>
                  </div>}
                </div>
              </article>)}</div> : <div className="project-search-empty" role="status">Projektų pagal „{projectSearch.trim()}“ nerasta.</div>}
              <div className="request-section-heading"><h2>Užklausos</h2>{selectedProject && <span>Projektas: {selectedProject.name}</span>}</div>
              {isLoadingRequests && <p className="inline-loading" role="status">Kraunamos užklausos…</p>}
              {!isLoadingRequests && hasLoadedRequests && requestsForProjectId === selectedProjectId && requests.length === 0 && !requestError && !dataError && <div className="empty-requests"><span className="empty-requests-icon">☰</span><div><h3>Šiame projekte užklausų dar nėra</h3><p>Sukurkite pirmą užklausą projektui „{selectedProject?.name}“.</p></div><button className="button button-primary compact-button" type="button" onClick={() => openScreen('createRequest')}>Sukurti užklausą</button></div>}
              {!isLoadingRequests && requestsForProjectId === selectedProjectId && requests.length > 0 && <div className="request-list"><div className="request-list-header"><span>Užklausa</span><span>Projektas</span><span>Prioritetas</span><span>Sukurta</span><span>Veiksmai</span></div>{requests.filter((request) => request.project_id === selectedProjectId).map((request) => <article className="request-row" key={request.id}>
                {editingRequestId === request.id ? <form className="request-edit-form" onSubmit={(event) => handleUpdateRequest(event, request.id)}>
                  <input className="inline-edit-input" aria-label="Užklausos pavadinimas" value={editingRequestTitle} onChange={(event) => setEditingRequestTitle(event.target.value)} maxLength={200} disabled={Boolean(activeRecordAction)} autoFocus />
                  <span className="request-project">{projectNames[request.project_id] ?? 'Projektas'}</span>
                  <select className="inline-edit-select" aria-label="Užklausos prioritetas" value={editingRequestUrgency} onChange={(event) => setEditingRequestUrgency(event.target.value)} disabled={Boolean(activeRecordAction)}><option value="normal">Įprasta</option><option value="high">Skubi</option></select>
                  <time className="request-date" dateTime={request.created_at}>{new Intl.DateTimeFormat('lt-LT', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(request.created_at))}</time>
                  <div className="record-actions"><button className="inline-action save" type="submit" disabled={Boolean(activeRecordAction)}>{activeRecordAction === `request:${request.id}` ? 'Saugoma…' : 'Išsaugoti'}</button><button className="inline-action" type="button" onClick={() => setEditingRequestId('')} disabled={Boolean(activeRecordAction)}>Atšaukti</button></div>
                </form> : <>
                  <div className="request-title"><span className="request-dot" aria-hidden="true" /><strong>{request.title}</strong></div>
                  <span className="request-project">{projectNames[request.project_id] ?? 'Projektas'}</span>
                  <span><span className={request.urgency === 'high' ? 'priority-badge high' : 'priority-badge'}><span className="priority-dot" />{request.urgency === 'high' ? 'Skubi' : 'Įprasta'}</span></span>
                  <time className="request-date" dateTime={request.created_at}>{new Intl.DateTimeFormat('lt-LT', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(request.created_at))}</time>
                  <div className="record-actions"><button className="inline-action" type="button" onClick={() => beginRequestEdit(request)} disabled={Boolean(activeRecordAction) || isSaving}>Redaguoti</button><button className="inline-action danger" type="button" onClick={() => handleDeleteRequest(request)} disabled={Boolean(activeRecordAction) || isSaving}>{activeRecordAction === `request:${request.id}` ? 'Trinama…' : 'Ištrinti'}</button></div>
                </>}
              </article>)}</div>}
            </>}
          </>}
        </section>
        <footer className="workspace-footer">Smart Requests <span>·</span> Jūsų projektai, aiškiai ir paprastai</footer>
      </section>
    </main>
  )
}

export default App
