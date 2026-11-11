import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import './App.css'

const messages = {
  signUp: 'Registracija nepavyko. Patikrinkite duomenis ir bandykite dar kartą.',
  signIn: 'Prisijungti nepavyko. Patikrinkite el. paštą ir slaptažodį.',
  signOut: 'Atsijungti nepavyko. Bandykite dar kartą.',
}

function App() {
  const [session, setSession] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [mode, setMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')

  useEffect(() => {
    let isMounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
        setIsInitializing(false)
      }
    })

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!isMounted) return
        if (error) {
          setMessage('Nepavyko patikrinti prisijungimo būsenos. Atnaujinkite puslapį.')
        } else {
          setSession(data.session)
        }
        setIsInitializing(false)
      })
      .catch(() => {
        if (isMounted) {
          setMessage('Nepavyko patikrinti prisijungimo būsenos. Atnaujinkite puslapį.')
          setIsInitializing(false)
        }
      })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  function validateForm() {
    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password || (mode === 'signUp' && !passwordRepeat)) {
      return 'Užpildykite visus privalomus laukus.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return 'Įveskite tinkamą el. pašto adresą.'
    }
    if (password.length < 8) {
      return 'Slaptažodį turi sudaryti bent 8 simboliai.'
    }
    if (mode === 'signUp' && password !== passwordRepeat) {
      return 'Slaptažodžiai nesutampa.'
    }
    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    const validationError = validateForm()
    if (validationError) {
      setMessageType('error')
      setMessage(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      const result = mode === 'signUp'
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password })

      if (result.error) {
        setMessageType('error')
        setMessage(messages[mode])
      } else if (mode === 'signUp' && !result.data.session) {
        setMessageType('success')
        setMessage('Registracija sėkminga. Dabar galite prisijungti.')
        setMode('signIn')
        setPassword('')
        setPasswordRepeat('')
      }
    } catch {
      setMessageType('error')
      setMessage(messages[mode])
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSignOut() {
    setMessage('')
    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setMessageType('error')
        setMessage(messages.signOut)
      }
    } catch {
      setMessageType('error')
      setMessage(messages.signOut)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isInitializing) {
    return <main className="page-shell"><p className="loading" role="status">Tikrinama prisijungimo būsena…</p></main>
  }

  if (session) {
    return (
      <main className="page-shell">
        <header className="topbar"><a className="brand" href="/" aria-label="Smart Requests pradžia"><span className="brand-mark">S</span> Smart Requests</a></header>
        <section className="welcome-card" aria-labelledby="welcome-title">
          <div className="welcome-icon" aria-hidden="true">✓</div>
          <p className="eyebrow">SMART REQUESTS</p>
          <h1 id="welcome-title">Sveiki sugrįžę</h1>
          <p className="welcome-copy">Esate prisijungę kaip</p>
          <p className="user-email">{session.user.email}</p>
          {message && <p className="form-message error" role="alert">{message}</p>}
          <button className="button button-secondary signout-button" type="button" onClick={handleSignOut} disabled={isSubmitting}>
            {isSubmitting ? 'Atsijungiama…' : 'Atsijungti'}
          </button>
        </section>
        <footer className="footer">Paprastas būdas valdyti savo užklausas.</footer>
      </main>
    )
  }

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
          <button className={mode === 'signIn' ? 'tab active' : 'tab'} id="signin-tab" type="button" role="tab" aria-selected={mode === 'signIn'} onClick={() => { setMode('signIn'); setMessage('') }}>Prisijungti</button>
          <button className={mode === 'signUp' ? 'tab active' : 'tab'} id="signup-tab" type="button" role="tab" aria-selected={mode === 'signUp'} onClick={() => { setMode('signUp'); setMessage('') }}>Registruotis</button>
        </div>

        <form onSubmit={handleSubmit} noValidate aria-labelledby={mode === 'signIn' ? 'signin-tab' : 'signup-tab'}>
          <label className="field-label" htmlFor="email">El. pašto adresas</label>
          <input id="email" className="text-input" type="email" autoComplete="email" placeholder="vardas@pastas.lt" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} />

          <label className="field-label" htmlFor="password">Slaptažodis</label>
          <input id="password" className="text-input" type="password" autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} placeholder="Bent 8 simboliai" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} />

          {mode === 'signUp' && <>
            <label className="field-label" htmlFor="password-repeat">Pakartokite slaptažodį</label>
            <input id="password-repeat" className="text-input" type="password" autoComplete="new-password" placeholder="Įveskite slaptažodį dar kartą" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} disabled={isSubmitting} />
          </>}

          {message && <p className={`form-message ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</p>}

          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (mode === 'signIn' ? 'Jungiamasi…' : 'Registruojama…') : (mode === 'signIn' ? 'Prisijungti' : 'Sukurti paskyrą')}
          </button>
        </form>

        <p className="switch-prompt">
          {mode === 'signIn' ? 'Neturite paskyros?' : 'Jau turite paskyrą?'}{' '}
          <button type="button" className="text-button" onClick={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setMessage('') }}>
            {mode === 'signIn' ? 'Registruokitės' : 'Prisijunkite'}
          </button>
        </p>
      </section>
      <footer className="footer">Paprastas būdas valdyti savo užklausas.</footer>
    </main>
  )
}

export default App
