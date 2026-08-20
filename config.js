window.AI_STUDIO_CONFIG = {
  version: 'foundation-1.0',
  persistenceEndpoint: '',
  program: {
    title: 'INF 386 AI Native Studio',
    subtitle: 'Discovery → Design → Prototype → Build → Test & Govern → Deploy → Knowledge Transfer → Showcase',
    students: 6,
    weeklyPaidWork: '8 hrs / student'
  },
  projects: {
    cmc: {
      id: 'cmc',
      name: 'Cincinnati Museum Center',
      shortName: 'CMC',
      phase: 'Discovery',
      team: ['Mark Greene', 'Elaina Hall', 'Nora Ernst'],
      nextGate: 'Gate 1 — Discovery Approved',
      legacyDiscoveryUrl: 'discovery.html',
      starter: {
        problem: 'Create an AI-enabled museum experience that can connect an identified object to trusted collections content and support useful follow-up questions.',
        primaryUsers: 'Museum visitors and CMC staff supporting collections and interpretation.',
        objective: 'Validate a semester-sized prototype combining object recognition, collections lookup, and grounded AI Q&A.',
        expectedMvp: 'Working proof of concept using an approved subset of objects, images, metadata, and museum content.',
        successMeasures: 'Reliable recognition on the approved sample set; grounded responses; usable visitor flow; documented limitations.',
        constraints: 'Approved content only; accessibility; onsite connectivity; privacy; project must fit the semester.',
        initialScope: 'Object recognition + collections match + grounded Q&A for a limited approved content set.'
      }
    },
    fidelity: {
      id: 'fidelity',
      name: 'Fidelity Investments',
      shortName: 'Fidelity',
      phase: 'Discovery',
      team: ['Aaron Kloss', 'Ashok Gaire', 'Aaron Milner'],
      nextGate: 'Gate 1 — Discovery Approved',
      starter: {
        problem: 'Improve a research workflow through a controlled multi-agent AI prototype while keeping evaluation and data boundaries explicit.',
        primaryUsers: 'Research or investment professionals participating in the pilot workflow.',
        objective: 'Define and validate a semester-sized research and paper-trading workflow that demonstrates measurable value without requiring production access.',
        expectedMvp: 'Multi-agent research prototype with an evaluation framework and paper-trading simulation using approved or synthetic inputs.',
        successMeasures: 'Demonstrated workflow improvement; traceable sources; repeatable evaluation; clear governance and limitations.',
        constraints: 'No production trading; approved tools/data only; security and compliance boundaries; synthetic data fallback.',
        initialScope: 'Research workflow orchestration + evidence capture + paper-trading simulation + evaluation.'
      }
    }
  },
  lifecycle: [
    ['Discovery','Weeks 1–3'],['Design','Week 4'],['Prototype','Weeks 5–6'],['Build','Weeks 7–10'],
    ['Test & Govern','Weeks 11–12'],['Deploy','Week 13'],['Knowledge Transfer','Weeks 14–15'],['Showcase','Finals']
  ]
};
