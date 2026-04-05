import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

let driverInstance = null

export function startTour({ onEnterDemo, onSwitchToAskTab, onSwitchToFileTab }) {
  if (driverInstance) {
    driverInstance.destroy()
  }

  const steps = [
    // ── Homepage ───────────────────────────────────────────────────────
    {
      element: '#tour-hero',
      popover: {
        title: 'Welcome to Lore',
        description:
          "Lore turns your team's raw Slack threads, incident reports, and PR reviews into a queryable knowledge graph. When engineers leave, their decisions stay.",
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-how-it-works',
      popover: {
        title: 'Three steps, zero schema',
        description:
          "HydraDB's <code>infer: true</code> extracts structured decisions from raw messy text — no templates needed. Then <code>graph_context: true</code> builds causal edges between those decisions, not just a flat index.",
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-problem',
      popover: {
        title: 'The problem it solves',
        description:
          "Every engineering team bleeds knowledge. The real reasons behind architectural decisions live in Slack threads, not ADRs. Lore captures that before it walks out the door.",
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-enter-btn',
      popover: {
        title: "Let's see it live",
        description:
          "Click next to enter the live demo. We'll walk through every panel step by step — from ingesting raw data to querying the causal graph.",
        side: 'top',
        align: 'center',
      },
      onNextClick: () => {
        onEnterDemo()
        setTimeout(() => driverInstance.moveNext(), 350)
      },
    },

    // ── App ────────────────────────────────────────────────────────────
    {
      element: '#tour-kb-panel',
      popover: {
        title: 'Knowledge Base — raw inputs',
        description:
          "These are 6 real-world artifacts — exactly as a team would produce them. Messy Slack messages, a Black Friday incident report, a PR comment thread, meeting notes. No schema, no cleanup required.",
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#tour-seed-btn',
      popover: {
        title: 'Always in sync',
        description:
          "In production, Lore ingests continuously from connected pipelines — Slack webhooks, GitHub PR merges, Meet recordings. Here, the knowledge base syncs automatically when the app loads. No manual step needed.",
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '#tour-ask-tab',
      popover: {
        title: 'Ask Lore',
        description:
          "Ask any question about WHY your codebase is the way it is, in plain English. Lore uses <code>graph_context: true</code> to traverse the causal chain — not just find similar text.",
        side: 'bottom',
        align: 'start',
      },
      onNextClick: () => {
        onSwitchToAskTab()
        setTimeout(() => driverInstance.moveNext(), 150)
      },
    },
    {
      element: '#tour-suggested-questions',
      popover: {
        title: 'Try a real question',
        description:
          "These are questions a new engineer would actually ask. Click one — Lore returns the full decision chain: who decided, when, what was rejected, and the key insight you must know before touching this code.",
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-file-tab',
      popover: {
        title: 'File Context — the proactive angle',
        description:
          "This is where Lore becomes truly different. Instead of waiting to be asked, Lore proactively surfaces critical context the moment an engineer opens a file — before they make any changes.",
        side: 'bottom',
        align: 'start',
      },
      onNextClick: () => {
        onSwitchToFileTab()
        setTimeout(() => driverInstance.moveNext(), 200)
      },
    },
    {
      element: '#tour-file-list',
      popover: {
        title: 'Each file, a different warning',
        description:
          "<b>payment_service.py</b> → MongoDB architectural decision<br><b>payment_ledger_model.py</b> → idempotency constraint on writes<br><b>checkout_handler.py</b> → write safety and retry requirements<br><br>Each surfaces a different slice of the knowledge graph.",
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-kb-footer',
      popover: {
        title: 'Why HydraDB, not Pinecone or Postgres',
        description:
          "A vector store finds <i>similar text</i>. HydraDB's <code>graph_context: true</code> traverses <i>causal chains</i>. The payment service uses MongoDB because of a 2021 incident — that's a graph edge, not a similarity score. That's the difference.",
        side: 'top',
        align: 'center',
      },
    },
  ]

  driverInstance = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.4,
    stagePadding: 8,
    stageRadius: 12,
    allowClose: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    popoverClass: 'lore-tour-popover',
    steps,
  })

  driverInstance.drive()
}

export function destroyTour() {
  if (driverInstance) {
    driverInstance.destroy()
    driverInstance = null
  }
}
