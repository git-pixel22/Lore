import { useState, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { X, AlertTriangle, MessageSquare, GitBranch, Users, CheckCircle } from 'lucide-react'

// ── Node type config ──────────────────────────────────────────────────────────

const NODE_STYLES = {
  incident: {
    bg: 'bg-red-50', border: 'border-red-200', title: 'text-red-700',
    badge: 'bg-red-100 text-red-600', icon: AlertTriangle, iconColor: 'text-red-500',
    handleColor: '#fca5a5',
  },
  slack: {
    bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-600', icon: MessageSquare, iconColor: 'text-emerald-500',
    handleColor: '#6ee7b7',
  },
  decision: {
    bg: 'bg-amber-50', border: 'border-amber-200', title: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-700', icon: CheckCircle, iconColor: 'text-amber-500',
    handleColor: '#fcd34d',
  },
  pr: {
    bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-800',
    badge: 'bg-orange-100 text-orange-600', icon: GitBranch, iconColor: 'text-orange-500',
    handleColor: '#fdba74',
  },
  meeting: {
    bg: 'bg-sky-50', border: 'border-sky-200', title: 'text-sky-800',
    badge: 'bg-sky-100 text-sky-600', icon: Users, iconColor: 'text-sky-500',
    handleColor: '#7dd3fc',
  },
}

// ── Custom node ───────────────────────────────────────────────────────────────

function LoreNode({ data }) {
  const s = NODE_STYLES[data.nodeType] || NODE_STYLES.slack
  const Icon = s.icon
  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: s.handleColor, width: 8, height: 8, border: 'none' }} />
      <div
        className={`${s.bg} ${s.border} border rounded-xl px-3.5 py-2.5 w-44 cursor-pointer shadow-sm hover:shadow-md transition-shadow`}
        onClick={data.onClick}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon size={11} className={s.iconColor} />
          <span className={`text-[9px] font-bold uppercase tracking-widest ${s.badge.split(' ')[1]}`}>
            {data.label}
          </span>
        </div>
        <div className={`text-xs font-semibold leading-tight ${s.title}`}>{data.title}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">{data.date}</div>
        {data.author && <div className="text-[10px] text-gray-400">{data.author}</div>}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: s.handleColor, width: 8, height: 8, border: 'none' }} />
    </>
  )
}

const nodeTypes = { loreNode: LoreNode }

// ── Graph data ────────────────────────────────────────────────────────────────

// Artifact full-text lookup for the detail panel
const ARTIFACT_DETAIL = {
  'inc-2021-1104':  { source: 'INC-2021-1104', date: '2021-11-05', author: 'Rahul Mehta', content: 'Black Friday payment service degradation. Postgres write lock contention at 12,847 TPS caused 100% checkout failure for 2.5 hours. Revenue impact: ~$180k. Third incident with this root cause in 2021. Action: Priya Nair to lead payment DB architecture review.' },
  'slack-nov-2021': { source: '#payments-eng', date: '2021-11-06', author: 'Rahul Mehta', content: '"The Postgres write lock issue is not a config problem — it is architectural. We have been patching this ceiling for 6 months. We need to seriously evaluate whether Postgres is the right database for the payment_ledger table."' },
  'adr-017':        { source: 'ADR-017 / #payments-eng', date: '2022-03-14 to 2022-03-15', author: 'Priya Nair + Arjun Singh', content: 'MongoDB chosen for payment_ledger after 4 months of evaluation. Postgres v14 rejected (ceiling at 8,200 TPS). CockroachDB rejected ($240k/yr licensing). MongoDB sustained 15,200 TPS. Constraint: app-level idempotency required for all writes via payment_id dedup table.' },
  'pr-247':         { source: 'payment-service PR #247', date: '2022-07-22', author: 'Dev Kapoor + Priya Nair', content: '"This is not inconsistency, it is intentional architecture." MongoDB chosen after Black Friday 2021. Do not propose migrating back to Postgres without load test evidence above 15k TPS and full team alignment.' },
  'meeting-2023':   { source: 'Q1 2023 Architecture Review', date: '2023-02-10', author: 'Arjun Singh', content: 'Reviewed MongoDB decision. Conclusion: stay on MongoDB. Postgres v15 not evaluated. No active incidents. Migration cost too high. Revisit criteria: Postgres v15 load tests > 15k TPS + zero-downtime migration path.' },
  'slack-jan-2022': { source: '#payments-eng', date: '2022-01-18', author: 'Kavya Reddy', content: 'Auth checks hitting DB on every request. 80ms average latency during peak hours. No caching layer for payment session tokens. Need a caching solution before Q2 mobile checkout launch.' },
  'adr-019':        { source: 'ADR-019 / #payments-eng', date: '2022-02-01', author: 'Kavya Reddy', content: 'Redis chosen for payment session cache. Memcached rejected: no persistence — restarts invalidate all active sessions. In-process LRU rejected: doesn\'t work across 4 auth_service replicas. Redis: AOF persistence + pub/sub for cross-replica invalidation + TTL support.' },
  'pr-312':         { source: 'auth-service PR #312', date: '2022-03-05', author: 'Dev Kapoor + Kavya Reddy', content: '"Memcached has no persistence. If auth_service restarts, every active payment session is invalidated mid-checkout." Redis pub/sub required for cross-replica session invalidation. See ADR-019.' },
  'meeting-q3-2022':{ source: 'Q3 2022 Infrastructure Review', date: '2022-09-15', author: 'Arjun Singh', content: 'Redis validated: 80ms → 3ms auth latency (96% reduction). Zero session-loss incidents since deployment. CRITICAL: Do NOT disable AOF persistence — this was the explicit reason Memcached was rejected.' },
}

function buildGraph(onNodeClick) {
  // ── MongoDB chain (top row) ──────────────────────────────────────────
  const mongoNodes = [
    { id: 'inc-2021-1104',  position: { x: 0,    y: 0   }, data: { nodeType: 'incident', label: 'Incident',  title: 'INC-2021-1104\nBlack Friday',       date: 'Nov 2021', author: 'Rahul Mehta',  onClick: () => onNodeClick('inc-2021-1104')  } },
    { id: 'slack-nov-2021', position: { x: 220,  y: 0   }, data: { nodeType: 'slack',    label: 'Slack',     title: '#payments-eng\nPost-mortem',         date: 'Nov 2021', author: 'Rahul Mehta',  onClick: () => onNodeClick('slack-nov-2021') } },
    { id: 'adr-017',        position: { x: 440,  y: 0   }, data: { nodeType: 'decision', label: 'Decision',  title: 'ADR-017\nMongoDB for payment_ledger', date: 'Mar 2022', author: 'Priya + Arjun', onClick: () => onNodeClick('adr-017')        } },
    { id: 'pr-247',         position: { x: 660,  y: -80 }, data: { nodeType: 'pr',       label: 'PR #247',   title: 'Decision\nValidated',                date: 'Jul 2022', author: 'Dev + Priya',  onClick: () => onNodeClick('pr-247')         } },
    { id: 'meeting-2023',   position: { x: 660,  y: 100 }, data: { nodeType: 'meeting',  label: 'Meeting',   title: 'Q1 2023 Review\nStay on MongoDB',    date: 'Feb 2023', author: 'Arjun Singh',  onClick: () => onNodeClick('meeting-2023')   } },
  ]

  // ── Redis chain (bottom row) ─────────────────────────────────────────
  const redisNodes = [
    { id: 'slack-jan-2022', position: { x: 0,    y: 300 }, data: { nodeType: 'slack',    label: 'Slack',     title: '#payments-eng\n80ms Auth Latency',   date: 'Jan 2022', author: 'Kavya Reddy',  onClick: () => onNodeClick('slack-jan-2022') } },
    { id: 'adr-019',        position: { x: 220,  y: 300 }, data: { nodeType: 'decision', label: 'Decision',  title: 'ADR-019\nRedis for Session Cache',   date: 'Feb 2022', author: 'Kavya Reddy',  onClick: () => onNodeClick('adr-019')        } },
    { id: 'pr-312',         position: { x: 440,  y: 300 }, data: { nodeType: 'pr',       label: 'PR #312',   title: 'Decision\nValidated',                date: 'Mar 2022', author: 'Dev + Kavya',  onClick: () => onNodeClick('pr-312')         } },
    { id: 'meeting-q3-2022',position: { x: 660,  y: 300 }, data: { nodeType: 'meeting',  label: 'Meeting',   title: 'Q3 2022 Review\nRedis Validated',    date: 'Sep 2022', author: 'Arjun Singh',  onClick: () => onNodeClick('meeting-q3-2022')} },
  ]

  const nodes = [...mongoNodes, ...redisNodes].map(n => ({ ...n, type: 'loreNode' }))

  const edgeStyle = { stroke: '#94a3b8', strokeWidth: 1.5 }
  const edges = [
    // MongoDB chain
    { id: 'e1', source: 'inc-2021-1104',  target: 'slack-nov-2021', label: 'triggered',     style: edgeStyle, labelStyle: { fontSize: 10, fill: '#94a3b8' }, labelBgStyle: { fill: 'white' } },
    { id: 'e2', source: 'slack-nov-2021', target: 'adr-017',        label: 'led to',         style: edgeStyle, labelStyle: { fontSize: 10, fill: '#94a3b8' }, labelBgStyle: { fill: 'white' } },
    { id: 'e3', source: 'adr-017',        target: 'pr-247',         label: 'referenced in',  style: edgeStyle, labelStyle: { fontSize: 10, fill: '#94a3b8' }, labelBgStyle: { fill: 'white' } },
    { id: 'e4', source: 'adr-017',        target: 'meeting-2023',   label: 'reviewed in',    style: edgeStyle, labelStyle: { fontSize: 10, fill: '#94a3b8' }, labelBgStyle: { fill: 'white' } },
    // Redis chain
    { id: 'e5', source: 'slack-jan-2022', target: 'adr-019',        label: 'triggered',      style: edgeStyle, labelStyle: { fontSize: 10, fill: '#94a3b8' }, labelBgStyle: { fill: 'white' } },
    { id: 'e6', source: 'adr-019',        target: 'pr-312',         label: 'referenced in',  style: edgeStyle, labelStyle: { fontSize: 10, fill: '#94a3b8' }, labelBgStyle: { fill: 'white' } },
    { id: 'e7', source: 'pr-312',         target: 'meeting-q3-2022',label: 'validated by',   style: edgeStyle, labelStyle: { fontSize: 10, fill: '#94a3b8' }, labelBgStyle: { fill: 'white' } },
  ]

  return { nodes, edges }
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { type: 'incident', label: 'Incident' },
    { type: 'slack',    label: 'Slack' },
    { type: 'decision', label: 'Decision / ADR' },
    { type: 'pr',       label: 'PR Review' },
    { type: 'meeting',  label: 'Meeting' },
  ]
  return (
    <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm z-10 flex items-center gap-3">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mr-1">Legend</span>
      {items.map(({ type, label }) => {
        const s = NODE_STYLES[type]
        const Icon = s.icon
        return (
          <div key={type} className="flex items-center gap-1">
            <Icon size={11} className={s.iconColor} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Story labels ──────────────────────────────────────────────────────────────

function StoryLabels() {
  return (
    <>
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Decision Thread 1</div>
          <div className="text-xs text-amber-800 font-semibold">MongoDB — payment_ledger</div>
        </div>
        <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-1.5 mt-[200px]">
          <div className="text-[10px] font-bold text-sky-700 uppercase tracking-widest">Decision Thread 2</div>
          <div className="text-xs text-sky-800 font-semibold">Redis — session cache</div>
        </div>
      </div>
    </>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ nodeId, onClose }) {
  const detail = ARTIFACT_DETAIL[nodeId]
  if (!detail) return null
  return (
    <div className="absolute top-4 right-4 w-72 bg-white border border-gray-200 rounded-2xl shadow-lg z-20 p-4 animate-fade-in">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs font-bold text-gray-800">{detail.source}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{detail.date} · {detail.author}</div>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors ml-2 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{detail.content}</p>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function GraphView() {
  const [selectedNode, setSelectedNode] = useState(null)

  const { nodes: initialNodes, edges: initialEdges } = buildGraph(setSelectedNode)
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-50/40">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.4}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls showInteractive={false} className="!shadow-sm !border-gray-200 !rounded-xl" />
      </ReactFlow>

      <StoryLabels />
      <Legend />
      {selectedNode && (
        <DetailPanel nodeId={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm z-10">
        <span className="text-xs text-gray-500">Click any node to see the full artifact</span>
      </div>
    </div>
  )
}
