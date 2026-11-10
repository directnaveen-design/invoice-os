'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function AuthGate({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else if (!data.session) setMessage('Account created. Please log in.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    }
    setBusy(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading...
      </div>
    )
  }

  if (session) {
    return (
      <>
        {children}
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="fixed bottom-3 left-3 z-50 rounded-md border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
        >
          Log out
        </button>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl"
      >
        <div>
          <h1 className="text-xl font-bold text-white">Invoice-OS</h1>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' ? 'Log in to your account' : 'Create your account'}
          </p>
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 characters)"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
        />
        {message && <p className="text-xs text-amber-400">{message}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 text-sm transition"
        >
          {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setMessage('')
          }}
          className="w-full text-xs text-slate-400 hover:text-white"
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
        </button>
      </form>
    </div>
  )
          }
