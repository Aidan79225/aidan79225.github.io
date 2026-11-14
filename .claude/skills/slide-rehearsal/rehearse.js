export const meta = {
  name: 'slide-rehearsal',
  description: 'Rehearse a deck with a presenter agent and three audience agents (Engineering Manager, Staff Engineer, Junior Engineer): 3+ Q&A rounds per slide per audience, answers scored 0-10, a score below 8 forces a re-answer or a slide revision',
  whenToUse: 'Stress-test a talk with mock Q&A before giving it: find the questions each kind of listener will ask and the slides that need fixing',
  phases: [
    { title: 'Present', detail: 'the presenter delivers each slide' },
    { title: 'Q&A', detail: 'three audiences x 3+ rounds: ask, answer, score 0-10, retry below 8' },
    { title: 'Revise', detail: 'merge slide revisions, re-check them with the audiences who asked' },
  ],
}

// prepare_run.py replaces the next line with the run configuration, so a big deck never has to be
// pasted into a tool call. When the workflow is started with {args}, INLINE_ARGS stays null.
const INLINE_ARGS = null // @@INLINE_ARGS@@
const CFG = INLINE_ARGS || args || {}

// ------------------------------------------------------------------ configuration
// deck: {title, abstract?, brief?, principles?, language?, slides: [{id, n, title, body, notes, visual?}]}
// facts: verified facts + known limits the presenter may rely on (the audience never sees it)
// forbidden: things the presenter must never say or write into a slide
// only: slide ids to rehearse (default all) | minRounds=3 | maxRounds=minRounds | threshold=8 | maxRetries=2 | audit=true
// agentType: default 'Plan' (clean context, no project instructions, read-only); null = default subagent
const DECK = CFG.deck
if (!DECK || !Array.isArray(DECK.slides) || DECK.slides.length === 0) {
  throw new Error('deck.slides is required: [{id, n, title, body, notes, visual?}]')
}
const ALL = DECK.slides
const THRESHOLD = Number.isFinite(CFG.threshold) ? CFG.threshold : 8
const MIN_ROUNDS = Number.isFinite(CFG.minRounds) ? CFG.minRounds : 3
const MAX_ROUNDS = Math.max(MIN_ROUNDS, Number.isFinite(CFG.maxRounds) ? CFG.maxRounds : MIN_ROUNDS)
const MAX_RETRIES = Number.isFinite(CFG.maxRetries) ? CFG.maxRetries : 2
const CALL_CAP = Number.isFinite(CFG.callCap) ? CFG.callCap : 900
const AGENT_TYPE = CFG.agentType === undefined ? 'Plan' : CFG.agentType
const AUDIT = CFG.audit !== false // fact-check the presenter's final answers (set audit:false to skip)
const LANG = DECK.language || 'Traditional Chinese (Taiwan usage)'
const FACTS = CFG.facts || ''
const FORBIDDEN = CFG.forbidden || ''
const SLIDES = CFG.only && CFG.only.length ? ALL.filter((s) => CFG.only.includes(s.id)) : ALL

const PERSONAS = CFG.personas || [
  {
    key: 'em',
    label: 'Engineering Manager',
    brief:
      'You are an Engineering Manager at a mid-size product company: about 8 engineers report to you, 12 years in the industry, 6 of them managing. You judge a talk by what you could do with it on Monday: what it costs (time, money, review load, risk), how you would roll it out to a team, who is accountable when something goes wrong, which evidence or metrics would convince you, and what it means for hiring, growth, onboarding and process. You rarely read code now. You spot vague claims about productivity and missing ownership or rollout paths quickly. You are pragmatic, not hostile. Bring your professional knowledge (delivery metrics, incident reviews, team topology, compliance), but never invent citations.',
  },
  {
    key: 'staff',
    label: 'Staff Engineer',
    brief:
      'You are a Staff Engineer with 14 years of experience across backend, tooling and CI. You judge a talk on technical soundness: causal claims drawn from before/after data, survivorship bias, small samples, confounders, what breaks at scale or under adversarial conditions, hidden coupling, long-term maintenance and review cost, security and privacy implications, alternatives the speaker did not consider, and contradictions between slides or between a claim and its evidence. You respect precise, bounded claims and honest limits, and you punish overgeneralisation. You are blunt but fair. Bring your professional knowledge (testing, code review research, architecture, automation pitfalls), but never invent citations.',
  },
  {
    key: 'junior',
    label: 'Junior Engineer',
    brief:
      'You are a Junior Engineer with about 1.5 years of experience, curious and honest. You do not know the speaker\'s projects or the jargon unless the slides explain it. You ask what terms mean, why a step exists, how you would actually start, what goes wrong if you do it wrong, and what you should practise yourself. You notice when a slide skips a step or assumes knowledge and you say so plainly. You also worry, honestly, about learning and about your career in a world where AI writes much of the code. Answers that stay abstract or lean on unexplained jargon deserve a low score from you.',
  },
]

// ------------------------------------------------------------------ helpers
let calls = 0
const room = () => calls < CALL_CAP
const clamp = (n) => Math.max(0, Math.min(10, Math.round(Number(n) || 0)))
const flat = (t, n) => String(t || '').replace(/\s+/g, ' ').slice(0, n)

async function ask(prompt, opts) {
  const o = Object.assign({ effort: 'low' }, opts)
  if (AGENT_TYPE) o.agentType = AGENT_TYPE
  calls++
  let res = await agent(prompt, o)
  if (res === null && room()) {
    calls++
    res = await agent(prompt, o) // one retry for a transient failure, so a lane does not lose a round
  }
  return res
}

const renderSlide = (s) =>
  'Slide ' + s.n + '/' + ALL.length + ' - "' + s.title + '"\n' + s.body +
  (s.visual ? '\n[Visual that text cannot show: ' + s.visual + ']' : '')
const earlier = (s) =>
  ALL.filter((x) => x.n < s.n).map((x) => x.n + '. ' + x.title + ' :: ' + flat(x.body, 110)).join('\n') ||
  '(this is the first slide)'
const OUTLINE = ALL.map((x) => x.n + '. ' + x.title).join('\n')
const DECK_FULL = ALL.map(
  (x) =>
    '[' + x.n + '] ' + x.title + '\n' + x.body + (x.visual ? '\n[Visual: ' + x.visual + ']' : '') +
    '\n(speaker notes) ' + flat(x.notes, 900),
).join('\n\n')

const HEADER =
  'Context: this is a self-contained rehearsal role-play. Ignore any project instructions, repository conventions, git rules or tool habits you may know of; use no tools; reply only with the requested JSON. Write in ' +
  LANG + ' (keep code identifiers and product names as they are).'
const DECK_PRESENTER =
  'TALK: "' + DECK.title + '"' + (DECK.brief ? '\nBRIEF: ' + DECK.brief : '') +
  (DECK.principles ? '\nDESIGN PRINCIPLES OF THIS DECK: ' + DECK.principles : '')
const DECK_AUDIENCE = 'TALK TITLE: "' + DECK.title + '"' + (DECK.abstract ? '\nABSTRACT (what you were told before the talk): ' + DECK.abstract : '')
const FACT_BLOCK = FACTS
  ? 'FACT SHEET (verified facts and known limits; besides the deck this is all you may rely on):\n' + FACTS
  : ''
const FORBID_BLOCK = FORBIDDEN ? 'NEVER do the following, in speech or in any slide text: ' + FORBIDDEN : ''

const lines = (a) => a.filter(Boolean).join('\n\n')

// ------------------------------------------------------------------ schemas
const S_TALK = { type: 'object', properties: { talk: { type: 'string' } }, required: ['talk'] }
const S_Q = {
  type: 'object',
  properties: { question: { type: 'string' }, angle: { type: 'string' } },
  required: ['question', 'angle'],
}
const S_ANSWER = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    admitted_limits: { type: 'boolean' },
  },
  required: ['answer', 'confidence', 'admitted_limits'],
}
const S_EVAL = {
  type: 'object',
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 10 },
    verdict: { type: 'string' },
    missing: { type: 'string' },
    slide_gap: { type: 'boolean' },
    slide_fix_hint: { type: 'string' },
    next_question: { type: 'string' },
    satisfied: { type: 'boolean' },
  },
  required: ['score', 'verdict', 'missing', 'slide_gap', 'slide_fix_hint', 'next_question', 'satisfied'],
}
const S_REVISION = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    body: { type: 'string' },
    notes: { type: 'string' },
    change_summary: { type: 'string' },
  },
  required: ['title', 'body', 'notes', 'change_summary'],
}
const S_FIX = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['reanswer', 'revise_slide', 'both'] },
    answer: { type: 'string' },
    slide_revision: S_REVISION,
    rationale: { type: 'string' },
  },
  required: ['action', 'answer', 'rationale'],
}
const S_MERGE = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    body: { type: 'string' },
    notes: { type: 'string' },
    change_summary: { type: 'string' },
    handled: {
      type: 'array',
      items: {
        type: 'object',
        properties: { audience: { type: 'string' }, concern: { type: 'string' }, how: { type: 'string' } },
        required: ['audience', 'concern', 'how'],
      },
    },
    dropped: {
      type: 'array',
      items: {
        type: 'object',
        properties: { audience: { type: 'string' }, concern: { type: 'string' }, why: { type: 'string' } },
        required: ['audience', 'concern', 'why'],
      },
    },
  },
  required: ['title', 'body', 'notes', 'change_summary', 'handled', 'dropped'],
}
const S_AUDIT = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          round: { type: 'integer' },
          claim: { type: 'string' },
          problem: { type: 'string', enum: ['unsupported', 'contradicted', 'speculation_as_fact', 'invented_practice'] },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          suggestion: { type: 'string' },
        },
        required: ['round', 'claim', 'problem', 'severity', 'suggestion'],
      },
    },
  },
  required: ['findings'],
}
const S_VERIFY = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          score: { type: 'integer', minimum: 0, maximum: 10 },
          residual: { type: 'string' },
        },
        required: ['question', 'score', 'residual'],
      },
    },
    new_problems: { type: 'array', items: { type: 'string' } },
    overall: { type: 'integer', minimum: 0, maximum: 10 },
  },
  required: ['items', 'new_problems', 'overall'],
}

// ------------------------------------------------------------------ prompts
const talkPrompt = (s) =>
  lines([
    HEADER,
    'ROLE: you are the PRESENTER of this talk.',
    DECK_PRESENTER,
    FACT_BLOCK,
    FORBID_BLOCK,
    'OUTLINE OF THE DECK:\n' + OUTLINE,
    'You are now presenting:\n' + renderSlide(s) + '\nYour speaker notes for this slide: ' + (s.notes || '(none)'),
    'The room: an Engineering Manager, a Staff Engineer and a Junior Engineer.',
    'TASK: present this slide aloud in 4-7 spoken sentences (roughly 100-180 Chinese characters). Natural speech, no stage directions, do not read the slide word for word, add the one thing the slide leaves out. Rely only on the slide, your notes and the fact sheet; never invent numbers.',
    'Return {talk}.',
  ])

const questionPrompt = (p, s, talk) =>
  lines([
    HEADER,
    'ROLE: you are the ' + p.label + ' in the audience.',
    p.brief,
    DECK_AUDIENCE,
    'SLIDES YOU HAVE ALREADY SEEN:\n' + earlier(s),
    'ON SCREEN NOW:\n' + renderSlide(s),
    'THE PRESENTER JUST SAID: ' + talk,
    'TASK: ask your FIRST question about THIS slide. It must (1) depend on what is on the slide or was said, (2) draw on your own professional knowledge to probe a claim, a missing piece, a risk, a number or a term, (3) be one concrete question rather than yes/no, (4) not already be answered by the slide, (5) fit in at most two sentences, like a real question asked in a room (no list of sub-questions). Speak as you would in the room.',
    'Return {question, angle} where angle is a short label such as evidence, cost, risk, clarity, scope, alternative, ownership, how-to or contradiction.',
  ])

const answerPrompt = (cur, p, q, hist, talk) =>
  lines([
    HEADER,
    'ROLE: you are the PRESENTER, taking a question from the audience after presenting this slide.',
    DECK_PRESENTER,
    FACT_BLOCK,
    FORBID_BLOCK,
    'THE WHOLE DECK:\n' + DECK_FULL,
    'CURRENT SLIDE (as the audience sees it now):\n' + renderSlide(cur) + '\nYour notes: ' + (cur.notes || '(none)'),
    'What you said while presenting it: ' + talk,
    hist.length
      ? 'Earlier Q&A on this slide with this person:\n' +
        hist.map((h, i) => (i + 1) + '. Q: ' + h.question + '\n   A: ' + flat(h.answer, 500) + ' (scored ' + h.score + ')').join('\n')
      : '',
    p.label + ' asks: "' + q + '"',
    'RULES: answer in 3-6 spoken sentences; answer the question first, then support it; be specific; use numbers only if they appear in the deck, notes or fact sheet; if you do not know or the data does not exist, say so plainly and say how you would find out - bluffing is the worst outcome; admit real weaknesses honestly; do not dodge; do not pad.',
    'Return {answer, confidence, admitted_limits}.',
  ])

const scoringRubric =
  'SCORING (integer 0-10): 10 = fully resolves your concern with specific evidence or a crisp, bounded argument; ' +
  THRESHOLD + '-9 = good: answers the question directly, accurate as far as you can tell, clear for your level, honest about limits, only minor gaps; ' +
  '6-7 = partial: on topic but vague, misses the crux, overclaims, or leans on jargon you cannot follow; ' +
  '3-5 = evasive, hand-wavy or unsupported; 0-2 = wrong, contradictory or ignores the question. ' +
  'A first answer typically deserves 6-7; ' + THRESHOLD + ' or more has to be earned. Penalise unsupported numbers, generalising from one project and dodging; reward an honest "I do not know" that comes with a plan.'

const evalPrompt = (p, cur, talk, q, ans, askedBefore, round, retry) =>
  lines([
    HEADER,
    'ROLE: you are the ' + p.label + ' in the audience.',
    p.brief,
    DECK_AUDIENCE,
    'SLIDES YOU HAVE ALREADY SEEN:\n' + earlier(cur),
    'ON SCREEN NOW:\n' + renderSlide(cur),
    'THE PRESENTER SAID: ' + talk,
    askedBefore.length ? 'YOUR EARLIER QUESTIONS ON THIS SLIDE (never repeat them):\n- ' + askedBefore.join('\n- ') : '',
    'You asked (round ' + round + '): "' + q + '"',
    'The presenter answered: "' + ans + '"',
    retry
      ? 'This is attempt ' + retry.n + ' on the same question. Your previous score was ' + retry.prev + ' (' + retry.verdict + '). Since then the presenter has ' + retry.what + '. Grade this NEW answer on its merits, not on effort: if the core gap you named is still open, stay below ' + THRESHOLD + '.'
      : '',
    scoringRubric,
    'Then decide: slide_gap = true ONLY if the slide itself is wrong, misleading or unclear (not merely because a claim invites a question, which is normal); slide_fix_hint = the smallest change to the slide that would fix it ("" if none). Finally write next_question: a NEW question from a different angle about this same slide, one question in at most two sentences; satisfied = true only if, after this answer, you have no further substantive doubt about this slide.',
    'Return {score, verdict, missing, slide_gap, slide_fix_hint, next_question, satisfied}.',
  ])

const fixPrompt = (cur, p, q, ans, ev, hist, talk) =>
  lines([
    HEADER,
    'ROLE: you are the PRESENTER.',
    DECK_PRESENTER,
    FACT_BLOCK,
    FORBID_BLOCK,
    'THE WHOLE DECK:\n' + DECK_FULL,
    'CURRENT SLIDE:\n' + renderSlide(cur) + '\nYour notes: ' + (cur.notes || '(none)'),
    'What you said while presenting it: ' + talk,
    p.label + ' asked: "' + q + '"',
    'Your answer: "' + ans + '"',
    'They scored it ' + clamp(ev.score) + '/10 (the bar is ' + THRESHOLD + '). Verdict: ' + ev.verdict + ' Missing: ' + ev.missing + ' Slide gap: ' + ev.slide_gap + '. Hint: ' + ev.slide_fix_hint,
'DECIDE the action. Prefer "reanswer": any claim on any slide can draw a question, and that is what Q&A is for. Choose "revise_slide" or "both" only when the slide itself is wrong, misleading or unclear. Caveats, limits, evidence and background belong in your spoken answer and in the notes, not on the slide face; never turn the slide defensive or crowd it with disclaimers. Whatever you choose, put a NEW spoken answer in "answer" (3-6 sentences, same rules: honest, specific, no invented numbers).',
    'If you revise the slide: keep the deck voice' + (DECK.principles ? ' (' + DECK.principles + ')' : '') + '; the revised body may not grow by more than about 25% in length, move detail into the notes; add no fact that is not in the deck, notes or fact sheet; return the full revised title, body (same one-element-per-line format with # / ## / ### markers) and notes, plus a one-line change_summary.',
    'Return {action, answer, slide_revision (only when you revise), rationale}.',
  ])

const mergePrompt = (s, lanesRevised, extra) =>
  lines([
    HEADER,
    'ROLE: you are the PRESENTER.',
    DECK_PRESENTER,
    FACT_BLOCK,
    FORBID_BLOCK,
    'ORIGINAL SLIDE:\n' + renderSlide(s) + '\nOriginal notes: ' + (s.notes || '(none)'),
    'During the Q&A, audience members triggered revisions of this slide separately (they never saw each other\'s):\n' +
      lanesRevised
        .map(
          (l) =>
            '== ' + l.label + '\n  triggered by: ' + l.revisionLog.map((r) => '"' + flat(r.question, 160) + '" -> ' + r.change_summary).join(' | ') +
            '\n  their final title: ' + l.finalSlide.title + '\n  their final body:\n' + l.finalSlide.body +
            '\n  their final notes: ' + flat(l.finalSlide.notes, 500),
        )
        .join('\n\n'),
    extra || '',
    'TASK: produce ONE final slide that keeps what is valuable in each revision, resolves conflicts, and respects the deck principles (minimal words; body growth at most about 25% over the original; detail goes to the notes). In "handled" list which concerns the final slide now addresses and how; in "dropped" list concerns you deliberately kept off the slide (and why, e.g. belongs in Q&A prep).',
    'Return {title, body, notes, change_summary, handled, dropped}.',
  ])

const verifyPrompt = (p, s, merged, items) =>
  lines([
    HEADER,
    'ROLE: you are the ' + p.label + ' in the audience.',
    p.brief,
    DECK_AUDIENCE,
    'SLIDES YOU HAVE ALREADY SEEN:\n' + earlier(s),
    'THE REVISED SLIDE (what you would now see on screen):\n' + renderSlide(Object.assign({}, s, { title: merged.title, body: merged.body })),
    'Earlier you asked these questions about this slide, and the first answers scored below ' + THRESHOLD + ' (the slide itself was part of the problem):\n' +
      items.map((it, i) => (i + 1) + '. "' + it.question + '" (the gap you saw: ' + it.missing + ')').join('\n'),
    'TASK: judge the REVISED SLIDE ONLY (assume the same spoken talk and no new answer). For each question: how fully does the slide now pre-empt or answer it? 10 = you would no longer need to ask; ' + THRESHOLD + ' = a short spoken answer would be enough; below that the slide still leaves the gap. List new_problems the revision introduced (wordiness, a contradiction with earlier slides, a new unsupported claim). overall = your overall score for the revision.',
    'Return {items: [{question, score, residual}], new_problems, overall}.',
  ])

// A fact-checker reads the presenter's final answers against the fact sheet, deck and notes, so the
// speaker does not repeat an invented number, habit or event on stage.
const auditPrompt = (p, rounds) =>
  lines([
    HEADER,
    'ROLE: you are a strict FACT-CHECKER for a talk rehearsal. You do not take part in the Q&A.',
    DECK_PRESENTER,
    FACT_BLOCK,
    'THE WHOLE DECK:\n' + DECK_FULL,
    'The presenter\'s final answers to the ' + p.label + ':\n' +
      rounds.map((r) => 'Round ' + r.round + ' Q: ' + r.question + '\nA: ' + r.final_answer).join('\n\n'),
    'TASK: list every statement of fact in these answers that the fact sheet, the deck and the notes do NOT support: numbers, dates, events, claims about what the speaker did or practises, causal claims, evidence nobody recorded. Classify each as unsupported (no source), contradicted (conflicts with a source), speculation_as_fact (a guess stated as fact) or invented_practice (a habit, tool or process of the speaker that nothing records). Ignore plain reasoning, honest admissions of ignorance and restatements of the deck. For each finding give the exact claim, severity (high = would embarrass the speaker if challenged), and a one-line suggestion of what to say instead. Return an empty list when everything is supported.',
    'Return {findings}.',
  ])

// ------------------------------------------------------------------ one audience member on one slide
async function lane(s, p, talk) {
  let cur = { id: s.id, n: s.n, title: s.title, body: s.body, notes: s.notes, visual: s.visual }
  const rounds = []
  const revisionLog = []
  const asked = []
  const tag = p.key + ':' + s.id
  const first = await ask(questionPrompt(p, s, talk), { label: tag + ':q1', phase: 'Q&A', schema: S_Q })
  if (!first || !first.question) {
    return { persona: p.key, label: p.label, rounds, revisionLog, revised: false, finalSlide: cur, error: 'first question failed' }
  }
  let q = first.question
  let angle = first.angle
  for (let r = 1; r <= MAX_ROUNDS && q; r++) {
    const hist = rounds.map((x) => ({ question: x.question, answer: x.final_answer, score: x.final_score }))
    const a = await ask(answerPrompt(cur, p, q, hist, talk), { label: tag + ':a' + r, phase: 'Q&A', schema: S_ANSWER })
    if (!a) {
      rounds.push({ round: r, question: q, error: 'answer failed' })
      break
    }
    let ans = a.answer
    let ev = await ask(evalPrompt(p, cur, talk, q, ans, asked, r, null), { label: tag + ':s' + r, phase: 'Q&A', schema: S_EVAL })
    if (!ev) {
      rounds.push({ round: r, question: q, final_answer: ans, error: 'score failed' })
      break
    }
    asked.push(q)
    const attempts = [
      { answer: ans, action: 'first', score: clamp(ev.score), verdict: ev.verdict, missing: ev.missing, slide_gap: ev.slide_gap, hint: ev.slide_fix_hint },
    ]
    let tries = 0
    while (clamp(ev.score) < THRESHOLD && tries < MAX_RETRIES && room()) {
      tries++
      const fix = await ask(fixPrompt(cur, p, q, ans, ev, hist, talk), { label: tag + ':f' + r + '.' + tries, phase: 'Q&A', schema: S_FIX, effort: 'medium' })
      if (!fix) break
      let what = 'given a new answer'
      if (fix.slide_revision && fix.action !== 'reanswer') {
        const rv = fix.slide_revision
        cur = Object.assign({}, cur, { title: rv.title || cur.title, body: rv.body || cur.body, notes: rv.notes || cur.notes })
        revisionLog.push({ round: r, question: q, change_summary: rv.change_summary })
        what = fix.action === 'both' ? 'revised the slide on screen and given a new answer' : 'revised the slide on screen'
      }
      ans = fix.answer || ans
      const prev = { n: tries + 1, prev: clamp(ev.score), verdict: ev.verdict, what: what }
      const ev2 = await ask(evalPrompt(p, cur, talk, q, ans, asked.slice(0, -1), r, prev), { label: tag + ':s' + r + '.' + (tries + 1), phase: 'Q&A', schema: S_EVAL })
      if (!ev2) break
      ev = ev2
      attempts.push({ answer: ans, action: fix.action, score: clamp(ev.score), verdict: ev.verdict, missing: ev.missing, slide_gap: ev.slide_gap, hint: ev.slide_fix_hint })
    }
    rounds.push({
      round: r,
      question: q,
      angle: angle,
      first_score: attempts[0].score,
      final_score: clamp(ev.score),
      passed: clamp(ev.score) >= THRESHOLD,
      retries: tries,
      final_answer: ans,
      verdict: ev.verdict,
      missing: attempts[0].missing,
      slide_gap: attempts.some((x) => x.slide_gap),
      hint: attempts[0].hint,
      attempts: attempts,
    })
    const more = r < MAX_ROUNDS && (r < MIN_ROUNDS || !ev.satisfied)
    q = more ? ev.next_question : null
    angle = undefined
    if (more && !q) log('lane ' + tag + ' ended early: no next question after round ' + r)
  }
  let audit = null
  if (AUDIT && room() && rounds.some((x) => x.final_answer)) {
    const res = await ask(auditPrompt(p, rounds.filter((x) => x.final_answer)), { label: tag + ':audit', phase: 'Q&A', schema: S_AUDIT, effort: 'medium' })
    audit = res ? res.findings : null
  }
  return { persona: p.key, label: p.label, rounds, revisionLog, revised: revisionLog.length > 0, finalSlide: cur, audit: audit }
}

// ------------------------------------------------------------------ merge the revisions of one slide and re-check them
async function verifyAll(s, merged, lanesRevised) {
  const out = await parallel(
    lanesRevised.map((l) => async () => {
      const items = l.rounds
        .filter((x) => x.attempts && x.attempts.some((a) => a.score < THRESHOLD))
        .slice(0, 4)
        .map((x) => ({ question: x.question, missing: x.missing }))
      if (!items.length) return null
      const res = await ask(verifyPrompt(PERSONAS.find((p) => p.key === l.persona), s, merged, items), {
        label: 'verify:' + l.persona + ':' + s.id,
        phase: 'Revise',
        schema: S_VERIFY,
        effort: 'medium',
      })
      return res ? { persona: l.persona, result: res } : null
    }),
  )
  return out.filter(Boolean)
}

async function reviseStage(s, st) {
  const revised = st.lanes.filter((l) => l.revised)
  if (!revised.length) return { slide: s, talk: st.talk, lanes: st.lanes, merged: null, verify: [], unresolved: [] }
  let merged = await ask(mergePrompt(s, revised, ''), { label: 'merge:' + s.id, phase: 'Revise', schema: S_MERGE, effort: 'high' })
  if (!merged) return { slide: s, talk: st.talk, lanes: st.lanes, merged: null, verify: [], unresolved: [], error: 'merge failed' }
  let verify = await verifyAll(s, merged, revised)
  let unresolved = verify.filter((v) => clamp(v.result.overall) < THRESHOLD)
  if (unresolved.length && room()) {
    const extra =
      'YOUR FIRST MERGE WAS RE-CHECKED and these audiences still score the revised slide below ' + THRESHOLD + ':\n' +
      unresolved.map((u) => '- ' + u.persona + ' overall ' + u.result.overall + '; residual: ' + u.result.items.map((i) => i.residual).join(' / ') + '; new problems: ' + u.result.new_problems.join(' / ')).join('\n') +
      '\nYour first merge was:\ntitle: ' + merged.title + '\nbody:\n' + merged.body + '\nFix exactly these remaining gaps without bloating the slide.'
    const refined = await ask(mergePrompt(s, revised, extra), { label: 'merge2:' + s.id, phase: 'Revise', schema: S_MERGE, effort: 'high' })
    if (refined) {
      merged = refined
      verify = await verifyAll(s, merged, revised)
      unresolved = verify.filter((v) => clamp(v.result.overall) < THRESHOLD)
    }
  }
  return { slide: s, talk: st.talk, lanes: st.lanes, merged: merged, verify: verify, unresolved: unresolved.map((u) => u.persona) }
}

// ------------------------------------------------------------------ run
phase('Present')
const results = await pipeline(
  SLIDES,
  async (s) => {
    const t = await ask(talkPrompt(s), { label: 'present:' + s.id, phase: 'Present', schema: S_TALK })
    return { talk: t ? t.talk : '' }
  },
  async (st, s) => {
    const lanes = await parallel(PERSONAS.map((p) => () => lane(s, p, st.talk)))
    const done = lanes.filter(Boolean)
    const rs = done.flatMap((l) => l.rounds).filter((x) => x.final_score !== undefined)
    log('slide ' + s.n + ' ' + s.id + ': ' + rs.length + ' rounds, ' + rs.filter((x) => !x.passed).length + ' below ' + THRESHOLD + ' after retries, ' + done.filter((l) => l.revised).length + ' lanes revised the slide')
    return { talk: st.talk, lanes: done }
  },
  (st, s) => reviseStage(s, st),
)

const ok = results.filter(Boolean)
const flatRounds = []
for (const r of ok) for (const l of r.lanes) for (const x of l.rounds) if (x.final_score !== undefined) flatRounds.push(Object.assign({ slide: r.slide.id, persona: l.persona }, x))
const avg = (a) => (a.length ? Math.round((10 * a.reduce((t, x) => t + x, 0)) / a.length) / 10 : null)
const byPersona = {}
for (const p of PERSONAS) {
  const xs = flatRounds.filter((x) => x.persona === p.key)
  byPersona[p.key] = {
    rounds: xs.length,
    first_avg: avg(xs.map((x) => x.first_score)),
    final_avg: avg(xs.map((x) => x.final_score)),
    retried: xs.filter((x) => x.retries > 0).length,
    below_after_retries: xs.filter((x) => !x.passed).length,
  }
}
const dropped = SLIDES.length - ok.length
if (dropped) log('WARNING: ' + dropped + ' slide(s) failed outright and are missing from the result')
if (!room()) log('WARNING: agent call cap (' + CALL_CAP + ') reached; later retries were skipped')

return {
  config: { threshold: THRESHOLD, minRounds: MIN_ROUNDS, maxRounds: MAX_ROUNDS, maxRetries: MAX_RETRIES, agentType: AGENT_TYPE, slides: SLIDES.map((s) => s.id) },
  calls: calls,
  summary: { slides_done: ok.length, slides_missing: dropped, rounds: flatRounds.length, byPersona: byPersona },
  slides: ok,
}
