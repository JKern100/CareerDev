// Lightweight, ungated "60-second teaser" logic for the /start hook.
//
// IMPORTANT: This is a deliberately simple, directional preview that maps the
// 4–5 quick hook answers to a few plausible pathways + a localized salary
// range + one underrated strength. It is intentionally SEPARATE from the real
// scoring engine (backend/app/services/scoring.py), which needs the full ~21+
// answer assessment and an account. Nothing here calls or modifies that engine.
// The full, accurately scored 14-pathway result is unlocked after signup.

export type Archetype = "calm" | "connector" | "organizer" | "builder";
export type Priority = "pay" | "home" | "grow" | "stability" | "curious";
export type ResponsibilityLevel = "entry" | "section" | "cabin" | "emergency" | "trainer";

export interface TeaserAnswers {
  responsibility?: ResponsibilityLevel; // Q1 — replaces years (which was captured but never used)
  priorities?: Priority[];              // Q2 (select all)
  archetype?: Archetype;                // Q3
  region?: string;                      // Q4 (region key, see REGIONS)
  motivation?: Priority;                // Q5 (optional)
}

interface PathwayPreview {
  id: string;
  name: string;
  why: string;                              // one-line, worth-framed "why it fits"
  salaryBandAed: [number, number];          // representative monthly band in AED (from pathways.json)
  globalNote: string;                       // qualitative salary context for non-Gulf markets
  archetypeAffinity: Record<Archetype, number>;         // 0–3
  priorityAffinity: Partial<Record<Priority, number>>;  // 0–3
}

// The salary bands in pathways.json are UAE/Gulf market data (AED). Currency-
// converting them to other markets would NOT reflect real local salaries
// (US/UK markets differ from the UAE by far more than the exchange rate), so
// we only show a figure for the Gulf, where the data actually holds. For all
// other regions we show a qualitative note derived from the pathway's global
// salary commentary. The full post-signup analysis localizes salary properly.
const SALARY_DATA_REGION = "gulf";

// Representative previews. Salary bands mirror backend/app/data/pathways.json
// (monthly AED). Global notes derived from salary_global_note in pathways.json.
// Ordering/emphasis follows the brief's "lead with" list.
const PATHWAYS: PathwayPreview[] = [
  {
    id: "P2",
    name: "Corporate Learning & Development",
    why: "Coaching and briefing crew is training — companies pay well for people who can teach adults to do their jobs better.",
    salaryBandAed: [16000, 28000],
    globalNote: "L&D specialist roles are mid-range in most markets; manager-level roles are well above average in the US, UK, and Australia.",
    archetypeAffinity: { calm: 1, connector: 2, organizer: 1, builder: 3 },
    priorityAffinity: { pay: 1, home: 2, grow: 3, stability: 1 },
  },
  {
    id: "P3",
    name: "HR & Talent",
    why: "Reading people, resolving conflict, and keeping things fair on a crew is the daily work of HR.",
    salaryBandAed: [16000, 33000],
    globalNote: "HR generalist entry is mid-range; HR business partner is a senior strategic role with upper-range compensation in most markets.",
    archetypeAffinity: { calm: 1, connector: 3, organizer: 2, builder: 1 },
    priorityAffinity: { pay: 2, home: 1, grow: 3, stability: 3 },
  },
  {
    id: "P4",
    name: "Customer Experience & Success",
    why: "Turning a tense passenger into a loyal one is exactly what CX teams are hired to design and lead.",
    salaryBandAed: [27000, 39000],
    globalNote: "Customer success manager roles are mid-to-upper range in most markets, with strong demand and good pay in tech and SaaS sectors.",
    archetypeAffinity: { calm: 2, connector: 3, organizer: 1, builder: 1 },
    priorityAffinity: { pay: 2, home: 2, grow: 2, stability: 2 },
  },
  {
    id: "P9",
    name: "Hospitality & Luxury Service",
    why: "Your service polish and presence translate straight into hotels, cruise, and VIP guest management.",
    salaryBandAed: [10000, 25000],
    globalNote: "Entry is mid-range; senior luxury hospitality management in the US, UK, and Europe pays a meaningful premium.",
    archetypeAffinity: { calm: 1, connector: 3, organizer: 2, builder: 1 },
    priorityAffinity: { pay: 1, home: 0, grow: 2, stability: 2 },
  },
  {
    id: "P6",
    name: "Safety & Compliance",
    why: "Your safety-first instinct and checklist discipline are prized in HSE, quality, and audit roles everywhere.",
    salaryBandAed: [14000, 30000],
    globalNote: "HSE roles are in high demand globally — manager-level salaries are upper-mid, particularly in regulated industries and the UK.",
    archetypeAffinity: { calm: 3, connector: 0, organizer: 3, builder: 1 },
    priorityAffinity: { pay: 2, home: 1, grow: 2, stability: 3 },
  },
  {
    id: "P10",
    name: "Corporate & Private Aviation",
    why: "Stay close to aviation on the ground — VIP handling and charter operations value your direct experience most.",
    salaryBandAed: [12000, 28000],
    globalNote: "VIP and private aviation operations roles pay a premium over commercial ground roles across all markets.",
    archetypeAffinity: { calm: 2, connector: 1, organizer: 3, builder: 1 },
    priorityAffinity: { pay: 2, home: 1, grow: 1, stability: 2 },
  },
  {
    id: "P5",
    name: "Operations Coordination",
    why: "Running an on-time turnaround across teams is operations work — coordination under pressure is your edge.",
    salaryBandAed: [18000, 35000],
    globalNote: "Operations coordinator entry is mid-range; manager-level roles reach upper-mid in most markets, with a meaningful aviation sector premium.",
    archetypeAffinity: { calm: 2, connector: 1, organizer: 3, builder: 2 },
    priorityAffinity: { pay: 2, home: 1, grow: 2, stability: 2 },
  },
  {
    id: "P7",
    name: "Project Management",
    why: "Planning, briefing stakeholders, and keeping a plan on track is the core of project management.",
    salaryBandAed: [15000, 40000],
    globalNote: "Senior project and program manager roles are among the higher-paid non-executive positions across the US, UK, Australia, and Canada.",
    archetypeAffinity: { calm: 2, connector: 1, organizer: 3, builder: 2 },
    priorityAffinity: { pay: 3, home: 1, grow: 3, stability: 2 },
  },
  {
    id: "P12",
    name: "Sales & Business Development",
    why: "Building rapport fast and reading what people need is the heart of high-earning B2B sales.",
    salaryBandAed: [12000, 35000],
    globalNote: "Base is mid-range; with commission, high-performing sales roles are among the best-paid professional tracks across all markets.",
    archetypeAffinity: { calm: 1, connector: 3, organizer: 1, builder: 2 },
    priorityAffinity: { pay: 3, home: 1, grow: 2, stability: 1 },
  },
  {
    id: "P13",
    name: "Entrepreneurship & Freelancing",
    why: "Self-direction and grace under pressure are founder traits — many crew build training or service businesses.",
    salaryBandAed: [8000, 50000],
    globalNote: "Income varies widely, but the upside is uncapped — many crew who make the move double their effective hourly rate within two years.",
    archetypeAffinity: { calm: 1, connector: 2, organizer: 1, builder: 3 },
    priorityAffinity: { pay: 2, home: 3, grow: 3, stability: 0 },
  },
  {
    id: "P14",
    name: "Education & Coaching",
    why: "Mentoring newer crew is coaching — a natural fit for teaching, facilitation, and career coaching.",
    salaryBandAed: [12000, 28000],
    globalNote: "Specialist corporate trainers and career coaches in the UK, US, and Australia earn well above the teaching average.",
    archetypeAffinity: { calm: 2, connector: 3, organizer: 1, builder: 2 },
    priorityAffinity: { pay: 1, home: 2, grow: 2, stability: 2 },
  },
];

// ---- Strength card: archetype × responsibility × top priority ----
//
// Three parts assembled into one paragraph:
//   core      — what the skill is and why it transfers (archetype)
//   modifier  — what level they've held it at (responsibility)
//   closer    — why it pays off for what they want (top priority)

const STRENGTH_CORE: Record<Archetype, { title: string; core: string }> = {
  calm: {
    title: "Crisis composure",
    core: "Staying functional and decisive when things go wrong is textbook crisis management. Ground teams in safety, operations, and healthcare pay a real premium for it.",
  },
  connector: {
    title: "Cross-cultural people-reading",
    core: "Building trust with strangers from every culture, in minutes, is high-level stakeholder management — the backbone of HR, CX, and sales roles.",
  },
  organizer: {
    title: "Turnaround coordination",
    core: "Running an on-time departure across multiple teams under pressure is operations and project coordination. Most crew massively undervalue it on paper.",
  },
  builder: {
    title: "On-the-job leadership",
    core: "Improving how things work and bringing others along while doing your own job is L&D and leadership in action — exactly what people-development teams look for.",
  },
};

const STRENGTH_MODIFIER: Record<Archetype, Record<ResponsibilityLevel, string>> = {
  calm: {
    entry:     "You're already building it every sector — the gap for most crew is articulation, not capability.",
    section:   "Managing your section means you've handled it under real time pressure, not just in training.",
    cabin:     "Running the full cabin puts you in a command role by any other name — that's what hiring managers mean by 'leadership under pressure.'",
    emergency: "You've led others through actual emergencies. That's a specific, rare credential — not everyone in safety or operations has done it for real.",
    trainer:   "You've also built it in others — which is what safety training and L&D roles specifically look for.",
  },
  connector: {
    entry:     "You're developing it on every sector, in ways most ground-side professionals never get the chance to.",
    section:   "Running your section means you've done it under time pressure and with real accountability.",
    cabin:     "Managing a full cabin means you've done it at scale — across different personalities and situations simultaneously.",
    emergency: "Staying connected to people while managing a safety situation is an advanced form of this skill that most trainers never test in the real world.",
    trainer:   "You've also transferred it to others — exactly what people-development and coaching roles want to see.",
  },
  organizer: {
    entry:     "Even early in your flying, you're contributing to a complex multi-team operation every single sector.",
    section:   "Running your section reliably means you're already the kind of person operations teams build around.",
    cabin:     "Managing the full cabin turnaround puts you in a de facto operations management role — the title just doesn't reflect the actual complexity.",
    emergency: "Coordinating under emergency conditions is the highest form of operations work. Few people at ground level have done it.",
    trainer:   "You've also taught others how to do it — which is exactly what operations training and process improvement roles look for.",
  },
  builder: {
    entry:     "The instinct shows early — the question is finding a role where you can run with it.",
    section:   "Running your section the way you want it run is already a form of this: you're not waiting to be given permission to lead.",
    cabin:     "Managing the full cabin means you've led, not just coordinated — other people's performance was your responsibility.",
    emergency: "Leading in an emergency requires exactly this instinct: the ability to make things better under the worst conditions.",
    trainer:   "You've already done the core of L&D work: making other people better at their jobs. That's the role, not a qualification for it.",
  },
};

const STRENGTH_CLOSER: Record<Archetype, Partial<Record<Priority, string>>> = {
  calm: {
    pay:       "It's also among the better-paid transitions — roles that need crisis composure don't underpay for it.",
    home:      "And the roles that value it most — safety and operations management — tend to offer predictable schedules once you're off the line.",
    grow:      "It has a clear trajectory: coordinator, then manager, then head of safety or operations. The ceiling is high.",
    stability: "It's one of the most in-demand skills in the market — safety and operations roles aren't going away.",
    curious:   "Knowing you have it makes the options a lot less abstract to explore.",
  },
  connector: {
    pay:       "HR business partner, customer success, and senior sales roles are all upper-mid compensation with this as the entry credential.",
    home:      "CX and HR roles that use this skill tend to have the most flexible remote and hybrid options of any pathway.",
    grow:      "The ceiling is high: CX director, HR business partner, VP of People — all built on exactly this.",
    stability: "HR and CX roles with this profile are consistently among the most stable professional positions.",
    curious:   "It opens more doors than almost any other skill that comes directly from cabin crew experience.",
  },
  organizer: {
    pay:       "Operations manager and project manager roles are mid-to-upper pay, and the aviation operations premium is real.",
    home:      "Operations coordination roles in corporate environments typically move to much more predictable schedules once you're off the line.",
    grow:      "The track runs from coordinator to operations manager to COO — and crew who make this move often accelerate through it.",
    stability: "Operations roles are among the most stable in any organisation — that level of complexity doesn't get outsourced.",
    curious:   "It's the skill that maps most directly onto the widest range of ground roles, which makes it the easiest to start exploring.",
  },
  builder: {
    pay:       "L&D manager and training lead roles are well-compensated — and demand for people who can actually do this (not just teach theory) is high.",
    home:      "L&D and training roles often have the most flexibility — a lot of the work travels, but the schedule is largely yours.",
    grow:      "The ceiling is high: L&D director, Chief People Officer, or your own training consultancy.",
    stability: "L&D is one of the fastest-growing functions in most organisations — skills training demand keeps rising.",
    curious:   "If you're not sure what direction yet, building and developing tends to make the answer clearer faster than anything else.",
  },
};

function buildStrength(
  archetype: Archetype | undefined,
  responsibility: ResponsibilityLevel | undefined,
  topPriority: Priority | undefined,
): { title: string; body: string } {
  const arch = archetype ?? "organizer";
  const resp = responsibility ?? "cabin";
  const priority = topPriority;

  const { title, core } = STRENGTH_CORE[arch];
  const modifier = STRENGTH_MODIFIER[arch][resp];
  const closer = priority ? STRENGTH_CLOSER[arch][priority] : undefined;

  const body = closer ? `${core} ${modifier} ${closer}` : `${core} ${modifier}`;
  return { title, body };
}

export interface RegionDef {
  key: string;
  label: string;
}

// Region is used to localize the teaser's framing (and, after signup, the full
// salary detail). We only carry an AED figure for the Gulf — see note above.
export const REGIONS: RegionDef[] = [
  { key: "gulf", label: "UAE / Gulf (GCC)" },
  { key: "uk", label: "United Kingdom" },
  { key: "usa", label: "United States" },
  { key: "canada", label: "Canada" },
  { key: "australia", label: "Australia" },
  { key: "europe", label: "Europe" },
  { key: "india", label: "India" },
  { key: "sea", label: "Southeast Asia" },
  { key: "other", label: "Somewhere else / global" },
];

export interface TeaserResult {
  top: { id: string; name: string; why: string }[];
  salaryShown: boolean;      // true only where the AED data is valid (Gulf)
  salaryLabel: string;       // a figure (Gulf) OR a qualitative note (everywhere else)
  salaryRegionLabel: string; // e.g. "UAE / Gulf (GCC)"
  topPathwayName: string;
  strength: { title: string; body: string };
}

function getRegion(key?: string): RegionDef {
  return REGIONS.find((r) => r.key === key) || REGIONS[0];
}

export function computeTeaser(answers: TeaserAnswers): TeaserResult {
  const priorities = new Set<Priority>(answers.priorities || []);
  if (answers.motivation) priorities.add(answers.motivation);

  const scored = PATHWAYS.map((p) => {
    let score = 0;
    if (answers.archetype) {
      score += (p.archetypeAffinity[answers.archetype] || 0) * 2;
    }
    priorities.forEach((pr) => {
      score += p.priorityAffinity[pr] || 0;
    });
    return { p, score };
  });

  // Stable sort: higher score first, preserve declared order on ties.
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3).map(({ p }) => ({ id: p.id, name: p.name, why: p.why }));

  const region = getRegion(answers.region);
  const topPathway = scored[0].p;

  const salaryShown = region.key === SALARY_DATA_REGION;
  let salaryLabel: string;
  if (salaryShown) {
    const [minAed, maxAed] = topPathway.salaryBandAed;
    salaryLabel = `AED ${minAed.toLocaleString("en-US")}–${maxAed.toLocaleString("en-US")}`;
  } else {
    salaryLabel = topPathway.globalNote;
  }

  // Top priority for the strength closer: use the first explicit priority, or motivation.
  const topPriority: Priority | undefined =
    (answers.priorities && answers.priorities[0]) ?? answers.motivation;

  const strength = buildStrength(answers.archetype, answers.responsibility, topPriority);

  return {
    top,
    salaryShown,
    salaryLabel,
    salaryRegionLabel: region.label,
    topPathwayName: topPathway.name,
    strength,
  };
}
