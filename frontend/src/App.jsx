import { useState, useRef, useEffect } from 'react'
import {
  GitBranch, MessageSquare, FileText, Users, ArrowRight,
  Database, Layers, Search, Zap, ChevronRight,
  AlertTriangle, BookOpen, Network, Clock, Shield, Play, GitMerge
} from 'lucide-react'
import { startTour } from './tour'
import GraphView from './GraphView'

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_STYLES = {
  'Incident Report': { badge: 'bg-red-100 text-red-700 border border-red-200', icon: AlertTriangle, iconColor: 'text-red-500' },
  'Slack':           { badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: MessageSquare, iconColor: 'text-emerald-500' },
  'PR Comment':      { badge: 'bg-orange-100 text-orange-700 border border-orange-200', icon: GitBranch, iconColor: 'text-orange-500' },
  'Meeting Notes':   { badge: 'bg-amber-100 text-amber-700 border border-amber-200', icon: Users, iconColor: 'text-amber-600' },
}

const SUGGESTED_QUESTIONS = [
  'Why does the payment service use MongoDB instead of Postgres?',
  'What caused the Black Friday 2021 incident?',
  'Who made the final decision to switch to MongoDB, and when?',
  'What alternatives to MongoDB were considered and rejected?',
]

const DEMO_FILES = [
  { name: 'payment_service.py',      hint: 'Core payment processing service — MongoDB architecture' },
  { name: 'payment_ledger_model.py', hint: 'Ledger data model — idempotency constraints' },
  { name: 'checkout_handler.py',     hint: 'Checkout flow — write safety requirements' },
  { name: 'auth_service.py',         hint: 'Auth layer — Redis session cache decision' },
  { name: 'payment_session_store.py', hint: 'Session store — Redis AOF persistence constraint' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAnswer(text) {
  if (!text) return null
  const headers = ['ANSWER', 'DECISION CHAIN', 'WHAT WAS REJECTED', 'KEY INSIGHT']
  const sections = {}
  for (const header of headers) {
    const marker = header + ':'
    const start = text.indexOf(marker)
    if (start === -1) continue
    const contentStart = start + marker.length
    let contentEnd = text.length
    for (const other of headers) {
      if (other === header) continue
      const idx = text.indexOf(other + ':', contentStart)
      if (idx !== -1 && idx < contentEnd) contentEnd = idx
    }
    sections[header] = text.slice(contentStart, contentEnd).trim()
  }
  if (Object.keys(sections).length === 0) sections['ANSWER'] = text.trim()
  return sections
}

function Spinner({ className = '' }) {
  return <div className={`w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`} />
}

function TypingDots({ label }) {
  return (
    <div className="flex items-center gap-2.5 text-gray-400 mt-6 px-1">
      <div className="flex gap-1">
        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  )
}

// ── Homepage ──────────────────────────────────────────────────────────────────

function HomePage({ onEnter, onStartTour }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
            <Network size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">Lore</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onStartTour}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Play size={13} className="text-emerald-500" />
            Guided Tour
          </button>
          <button
            onClick={onEnter}
            className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Open Demo <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div id="tour-hero" className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
          <Zap size={11} />
          Built for HydraDB Hack Day · April 2026
        </div>

        <h1 className="text-5xl font-bold text-gray-900 leading-tight tracking-tight max-w-3xl mb-6">
          Your team made decisions.
          <br />
          <span className="text-emerald-600">Lore remembers them.</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-xl leading-relaxed mb-10">
          Turn Slack threads, incident reports, and PR reviews into a queryable knowledge graph.
          Ask why your codebase looks the way it does — get the full causal chain.
        </p>

        <div className="flex items-center gap-4">
          <button
            id="tour-enter-btn"
            onClick={onEnter}
            className="flex items-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm"
          >
            Open Demo <ArrowRight size={15} />
          </button>
          <button
            onClick={onStartTour}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 font-medium px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            <Play size={13} className="text-emerald-500" />
            Take a guided tour
          </button>
        </div>
      </div>

      {/* How it works */}
      <div id="tour-how-it-works" className="border-t border-gray-100 bg-gray-50/60 px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How Lore works</h2>
            <p className="text-gray-500 text-sm">Three steps from raw artifacts to institutional knowledge</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { step: '01', icon: Database, title: 'Ingest raw artifacts', desc: 'Paste in any team artifact — Slack threads, incident reports, PR comments, meeting notes. No schema. No formatting required.', tag: 'infer: true', tagColor: 'bg-orange-100 text-orange-700' },
              { step: '02', icon: Layers, title: 'Extract & connect', desc: "HydraDB's inference engine extracts decisions, actors, and reasons from raw text. Then builds a causal graph — not just an index.", tag: 'graph_context: true', tagColor: 'bg-emerald-100 text-emerald-700' },
              { step: '03', icon: Search, title: 'Query the chain', desc: 'Ask why in plain English. Lore traverses the causal chain and returns: what was decided, by whom, when, and what was rejected.', tag: 'full_recall', tagColor: 'bg-amber-100 text-amber-700' },
            ].map(({ step, icon: Icon, title, desc, tag, tagColor }) => (
              <div key={step} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Icon size={18} className="text-gray-600" />
                  </div>
                  <span className="text-3xl font-black text-gray-100">{step}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{desc}</p>
                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-md ${tagColor}`}>{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The problem */}
      <div id="tour-problem" className="border-t border-gray-100 px-8 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">The problem Lore solves</h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { icon: Users,          title: 'Engineers leave',         desc: '6 months of architectural decisions walk out the door with every engineer who resigns.' },
              { icon: MessageSquare,  title: 'Decisions live in Slack', desc: 'The real reasons are buried in threads, not ADRs. ADRs are written after the fact, if at all.' },
              { icon: Clock,          title: 'History repeats',         desc: 'Without institutional memory, teams re-debate solved problems and re-make the same mistakes.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={15} className="text-red-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm mb-1">{title}</div>
                  <div className="text-sm text-gray-500 leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-8 py-5 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-emerald-600 rounded-md flex items-center justify-center">
            <Network size={10} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Lore</span>
        </div>
        <span className="text-xs text-gray-400">Institutional memory, not just institutional knowledge.</span>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

function LoreApp({ onBack, tab, setTab, onStartTour }) {
  const [seedStatus, setSeedStatus] = useState('idle') // idle | syncing | ready | error

  const [messages, setMessages] = useState([])  // {role: 'user'|'assistant', content: str, parsed?: obj}
  const [question, setQuestion] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const textareaRef = useRef(null)
  const chatBottomRef = useRef(null)

  const [activeFile, setActiveFile] = useState(null)
  const [fileContext, setFileContext] = useState(null)
  const [fileLoading, setFileLoading] = useState(false)

  const [artifacts, setArtifacts] = useState([])
  const [artifactsLoaded, setArtifactsLoaded] = useState(false)

  useEffect(() => {
    if (artifactsLoaded) return
    // Load artifact cards and auto-seed HydraDB in parallel on mount
    fetch('/api/artifacts')
      .then(r => r.json())
      .then(d => { setArtifacts(d); setArtifactsLoaded(true) })
      .catch(() => {})

    setSeedStatus('syncing')
    fetch('/api/setup', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        setSeedStatus(d.success ? 'ready' : 'error')
      })
      .catch(() => setSeedStatus('error'))
  }, [])

  async function handleAsk() {
    const q = question.trim()
    if (!q || askLoading) return

    const userMsg = { role: 'user', content: q }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setQuestion('')
    setAskLoading(true)

    // Build history for API: only role+content, no parsed field
    const history = messages.map(({ role, content }) => ({ role, content }))

    try {
      const resp = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      })
      const data = await resp.json()
      const parsed = parseAnswer(data.answer)
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, parsed }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Check the backend logs.', parsed: { ANSWER: 'Something went wrong. Check the backend logs.' } }])
    } finally {
      setAskLoading(false)
    }
  }

  async function handleFileContext(file) {
    setActiveFile(file)
    setFileLoading(true)
    setFileContext(null)
    try {
      const resp = await fetch(`/api/proactive/${encodeURIComponent(file)}`)
      const data = await resp.json()
      setFileContext(data.context)
    } catch {
      setFileContext('Could not load context. Check backend logs.')
    } finally { setFileLoading(false) }
  }

  function pickQuestion(q) {
    setQuestion(q)
    setTab('ask')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, askLoading])

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
              <Network size={13} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">Lore</span>
          </button>
          <span className="text-gray-300 select-none">|</span>
          <span className="text-gray-400 text-sm">Institutional Knowledge Graph</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartTour}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Play size={11} className="text-emerald-500" /> Guided Tour
          </button>
        </div>
        <div id="tour-seed-btn" className="flex items-center gap-2">
          {seedStatus === 'syncing' && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Spinner className="w-3 h-3 text-emerald-400" /> Syncing knowledge base...
            </span>
          )}
          {seedStatus === 'ready' && (
            <span className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Knowledge base ready
            </span>
          )}
          {seedStatus === 'error' && (
            <span className="text-xs text-red-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
              Sync failed
            </span>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Knowledge Base */}
        <div id="tour-kb-panel" className="w-72 bg-gray-50 flex flex-col flex-shrink-0 overflow-hidden border-r border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2 mb-0.5">
              <BookOpen size={12} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Knowledge Base</span>
            </div>
            <div className="text-xs text-gray-400">{artifacts.length} source artifacts</div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2.5 space-y-2">
            {artifacts.map(art => {
              const s = TYPE_STYLES[art.type] || TYPE_STYLES['Meeting Notes']
              const Icon = s.icon
              return (
                <div key={art.id} className="bg-white rounded-xl p-3 border border-gray-200 hover:border-emerald-200 hover:shadow-sm transition-all group">
                  <div className="flex items-start gap-2 mb-1.5">
                    <Icon size={11} className={`mt-0.5 flex-shrink-0 ${s.iconColor}`} />
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${s.badge}`}>{art.type}</span>
                  </div>
                  <div className="text-xs text-gray-800 font-medium truncate">{art.source}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{art.date} · {art.author}</div>
                  <div className="text-[10px] text-gray-400 mt-1.5 leading-relaxed line-clamp-2 group-hover:text-gray-600 transition-colors">
                    {art.content}
                  </div>
                </div>
              )
            })}
          </div>

          <div id="tour-kb-footer" className="px-4 py-3 border-t border-gray-200 bg-white">
            <div className="text-[10px] text-gray-400 leading-relaxed font-mono">
              HydraDB: <span className="text-emerald-600">infer: true</span> + <span className="text-emerald-600">graph_context: true</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 px-5 gap-1 flex-shrink-0">
            <button
              id="tour-ask-tab"
              onClick={() => setTab('ask')}
              className={`flex items-center gap-1.5 px-3 py-3.5 text-sm font-medium border-b-2 transition-colors ${tab === 'ask' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <Search size={13} /> Ask Lore
            </button>
            <button
              id="tour-file-tab"
              onClick={() => setTab('file')}
              className={`flex items-center gap-1.5 px-3 py-3.5 text-sm font-medium border-b-2 transition-colors ${tab === 'file' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <FileText size={13} /> File Context
            </button>
            <button
              id="tour-graph-tab"
              onClick={() => setTab('graph')}
              className={`flex items-center gap-1.5 px-3 py-3.5 text-sm font-medium border-b-2 transition-colors ${tab === 'graph' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <GitMerge size={13} /> Knowledge Graph
            </button>
          </div>

          {/* Ask tab */}
          {tab === 'ask' && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Message thread */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-2xl mx-auto space-y-5">

                  {/* Empty state — suggested questions */}
                  {messages.length === 0 && !askLoading && (
                    <div id="tour-suggested-questions">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Try asking</div>
                      <div className="flex flex-col gap-1.5">
                        {SUGGESTED_QUESTIONS.map(q => (
                          <button
                            key={q}
                            onClick={() => pickQuestion(q)}
                            className="flex items-center gap-2.5 text-left text-sm text-gray-600 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:text-emerald-800 hover:bg-emerald-50/50 transition-colors group"
                          >
                            <ChevronRight size={13} className="text-gray-300 group-hover:text-emerald-400 flex-shrink-0 transition-colors" />
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chat messages */}
                  {messages.map((msg, i) => {
                    if (msg.role === 'user') {
                      return (
                        <div key={i} className="flex justify-end">
                          <div className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm max-w-md leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      )
                    }
                    const p = msg.parsed || {}
                    return (
                      <div key={i} className="space-y-2 animate-fade-in">
                        {p['ANSWER'] && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Answer</div>
                            <div className="text-sm text-gray-800 leading-relaxed">{p['ANSWER']}</div>
                          </div>
                        )}
                        {p['DECISION CHAIN'] && (
                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Decision Chain</div>
                            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{p['DECISION CHAIN']}</div>
                          </div>
                        )}
                        {p['WHAT WAS REJECTED'] && (
                          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                            <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1.5">What Was Rejected</div>
                            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{p['WHAT WAS REJECTED']}</div>
                          </div>
                        )}
                        {p['KEY INSIGHT'] && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Shield size={11} className="text-amber-600" />
                              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Key Insight</div>
                            </div>
                            <div className="text-sm text-gray-800 font-medium leading-relaxed">{p['KEY INSIGHT']}</div>
                          </div>
                        )}
                        {/* Fallback for short conversational replies */}
                        {!p['ANSWER'] && !p['DECISION CHAIN'] && (
                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {askLoading && <TypingDots label="Traversing knowledge graph..." />}

                  <div ref={chatBottomRef} />
                </div>
              </div>

              {/* Persistent input */}
              <div className="border-t border-gray-200 px-6 py-4 bg-white flex-shrink-0">
                <div className="max-w-2xl mx-auto relative">
                  <textarea
                    ref={textareaRef}
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
                    placeholder={messages.length > 0 ? 'Ask a follow-up question...' : 'Ask anything about your codebase history...'}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 placeholder-gray-300 pr-20"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    {messages.length > 0 && (
                      <button
                        onClick={() => setMessages([])}
                        className="text-[10px] text-gray-300 hover:text-gray-500 transition-colors"
                        title="Clear conversation"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={handleAsk}
                      disabled={!question.trim() || askLoading}
                      className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Ask
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-gray-300 mt-1 max-w-2xl mx-auto text-right">
                  Enter to ask, Shift+Enter for newline
                </div>
              </div>
            </div>
          )}

          {/* File Context tab */}
          {tab === 'file' && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-6 py-6">
                <div className="mb-5">
                  <div className="text-sm font-bold text-gray-900 mb-1.5">Proactive File Context</div>
                  <div className="text-sm text-gray-500 leading-relaxed">
                    Select a file to see what Lore surfaces before you touch it.
                    Each file reveals a different layer of institutional knowledge.
                  </div>
                </div>

                <div id="tour-file-list" className="flex flex-col gap-2 mb-6">
                  {DEMO_FILES.map(({ name, hint }) => (
                    <button
                      key={name}
                      onClick={() => handleFileContext(name)}
                      className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-colors ${
                        activeFile === name
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold font-mono ${activeFile === name ? 'text-emerald-800' : 'text-gray-700'}`}>
                          {name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{hint}</div>
                      </div>
                      {activeFile === name && fileLoading
                        ? <Spinner className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                        : <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                      }
                    </button>
                  ))}
                </div>

                {fileLoading && <TypingDots label="Lore is checking history..." />}

                {fileContext && !fileLoading && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in">
                    <div className="flex items-start gap-2.5 mb-3">
                      <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle size={12} className="text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-800 uppercase tracking-widest">Lore Notice</div>
                        <div className="text-[11px] text-amber-600 font-mono mt-0.5">{activeFile}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{fileContext}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Graph tab */}
          {tab === 'graph' && <GraphView />}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2 border-t border-gray-100 flex items-center justify-between bg-gray-50/60 flex-shrink-0">
        <span className="text-xs text-gray-400 font-mono">Built for HydraDB Hack Day · April 2026</span>
        <span className="text-xs text-gray-400 italic">Institutional memory, not just institutional knowledge.</span>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState('home')
  const [tab, setTab] = useState('ask')

  function handleStartTour() {
    startTour({
      onEnterDemo: () => setPage('app'),
      onSwitchToAskTab: () => setTab('ask'),
      onSwitchToFileTab: () => setTab('file'),
    })
  }

  return page === 'home'
    ? <HomePage onEnter={() => setPage('app')} onStartTour={handleStartTour} />
    : <LoreApp onBack={() => setPage('home')} tab={tab} setTab={setTab} onStartTour={handleStartTour} />
}
