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

export interface TeaserAnswers {
  years?: string;            // Q1
  priorities?: Priority[];   // Q2 (select all)
  archetype?: Archetype;     // Q3
  region?: string;           // Q4 (region key, see REGIONS)
  motivation?: Priority;     // Q5 (optional)
}

interface PathwayPreview {
  id: string;
  name: string;
  why: string;                 // one-line, worth-framed "why it fits"
  salaryBandAed: [number, number]; // representative monthly band in AED (from pathways.json)
  archetypeAffinity: Record<Archetype, number>; // 0–3
  priorityAffinity: Partial<Record<Priority, number>>; // 0–3
}

// The salary bands in pathways.json are UAE/Gulf market data (AED). Currency-
// converting them to other markets would NOT reflect real local salaries
// (US/UK markets differ from the UAE by far more than the exchange rate), so
// we only show a figure for the Gulf, where the data actually holds. The full
// post-signup analysis localizes salary properly for every market.
const SALARY_DATA_REGION = "gulf";
const SALARY_FALLBACK = "Ranges vary by market — your full analysis localizes this.";

// Representative previews. Salary bands mirror backend/app/data/pathways.json
// (monthly AED). Ordering/emphasis follows the brief's "lead with" list.
const PATHWAYS: PathwayPreview[] = [
  {
    id: "P2",
    name: "Corporate Learning & Development",
    why: "Coaching and briefing crew is training — companies pay well for people who can teach adults to do their jobs better.",
    salaryBandAed: [16000, 28000],
    archetypeAffinity: { calm: 1, connector: 2, organizer: 1, builder: 3 },
    priorityAffinity: { pay: 1, home: 2, grow: 3, stability: 1 },
  },
  {
    id: "P3",
    name: "HR & Talent",
    why: "Reading people, resolving conflict, and keeping things fair on a crew is the daily work of HR.",
    salaryBandAed: [16000, 33000],
    archetypeAffinity: { calm: 1, connector: 3, organizer: 2, builder: 1 },
    priorityAffinity: { pay: 2, home: 1, grow: 3, stability: 3 },
  },
  {
    id: "P4",
    name: "Customer Experience & Success",
    why: "Turning a tense passenger into a loyal one is exactly what CX teams are hired to design and lead.",
    salaryBandAed: [27000, 39000],
    archetypeAffinity: { calm: 2, connector: 3, organizer: 1, builder: 1 },
    priorityAffinity: { pay: 2, home: 2, grow: 2, stability: 2 },
  },
  {
    id: "P9",
    name: "Hospitality & Luxury Service",
    why: "Your service polish and presence translate straight into hotels, cruise, and VIP guest management.",
    salaryBandAed: [10000, 25000],
    archetypeAffinity: { calm: 1, connector: 3, organizer: 2, builder: 1 },
    priorityAffinity: { pay: 1, home: 0, grow: 2, stability: 2 },
  },
  {
    id: "P6",
    name: "Safety & Compliance",
    why: "Your safety-first instinct and checklist discipline are prized in HSE, quality, and audit roles everywhere.",
    salaryBandAed: [14000, 30000],
    archetypeAffinity: { calm: 3, connector: 0, organizer: 3, builder: 1 },
    priorityAffinity: { pay: 2, home: 1, grow: 2, stability: 3 },
  },
  {
    id: "P10",
    name: "Corporate & Private Aviation",
    why: "Stay close to aviation on the ground — VIP handling and charter operations value your direct experience most.",
    salaryBandAed: [12000, 28000],
    archetypeAffinity: { calm: 2, connector: 1, organizer: 3, builder: 1 },
    priorityAffinity: { pay: 2, home: 1, grow: 1, stability: 2 },
  },
  {
    id: "P5",
    name: "Operations Coordination",
    why: "Running an on-time turnaround across teams is operations work — coordination under pressure is your edge.",
    salaryBandAed: [18000, 35000],
    archetypeAffinity: { calm: 2, connector: 1, organizer: 3, builder: 2 },
    priorityAffinity: { pay: 2, home: 1, grow: 2, stability: 2 },
  },
  {
    id: "P7",
    name: "Project Management",
    why: "Planning, briefing stakeholders, and keeping a plan on track is the core of project management.",
    salaryBandAed: [15000, 40000],
    archetypeAffinity: { calm: 2, connector: 1, organizer: 3, builder: 2 },
    priorityAffinity: { pay: 3, home: 1, grow: 3, stability: 2 },
  },
  {
    id: "P12",
    name: "Sales & Business Development",
    why: "Building rapport fast and reading what people need is the heart of high-earning B2B sales.",
    salaryBandAed: [12000, 35000],
    archetypeAffinity: { calm: 1, connector: 3, organizer: 1, builder: 2 },
    priorityAffinity: { pay: 3, home: 1, grow: 2, stability: 1 },
  },
  {
    id: "P13",
    name: "Entrepreneurship & Freelancing",
    why: "Self-direction and grace under pressure are founder traits — many crew build training or service businesses.",
    salaryBandAed: [8000, 50000],
    archetypeAffinity: { calm: 1, connector: 2, organizer: 1, builder: 3 },
    priorityAffinity: { pay: 2, home: 3, grow: 3, stability: 0 },
  },
  {
    id: "P14",
    name: "Education & Coaching",
    why: "Mentoring newer crew is coaching — a natural fit for teaching, facilitation, and career coaching.",
    salaryBandAed: [12000, 28000],
    archetypeAffinity: { calm: 2, connector: 3, organizer: 1, builder: 2 },
    priorityAffinity: { pay: 1, home: 2, grow: 2, stability: 2 },
  },
];

// One underrated strength per archetype — a specific, transferable asset.
const STRENGTHS: Record<Archetype, { title: string; body: string }> = {
  calm: {
    title: "Crisis composure",
    body:
      "Staying clear-headed and decisive when something goes wrong mid-flight is textbook crisis management — a skill ground teams in safety, operations, and healthcare pay a real premium for.",
  },
  connector: {
    title: "Cross-cultural people-reading",
    body:
      "Defusing tension and building trust with strangers from every culture, in minutes, is high-level stakeholder and relationship management — the backbone of HR, CX, and sales roles.",
  },
  organizer: {
    title: "Turnaround coordination",
    body:
      "Turning a chaotic turnaround into an on-time departure across multiple teams is operations and project coordination — and most crew massively undervalue it on paper.",
  },
  builder: {
    title: "On-the-job leadership",
    body:
      "Coaching new crew and quietly improving how things get done is leadership and L&D in the making — exactly what training and people-development teams look for.",
  },
};

export interface RegionDef {
  key: string;
  label: string;
}

// Region is used to localize the teaser's framing (and, after signup, the full
// salary detail). We only carry a salary figure for the Gulf — see note above.
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
  salaryLabel: string;       // a figure ("AED 18,000–35,000") OR the fallback line
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
    // Archetype is the strongest signal.
    if (answers.archetype) {
      score += (p.archetypeAffinity[answers.archetype] || 0) * 2;
    }
    // Each matched priority adds its affinity.
    priorities.forEach((pr) => {
      score += p.priorityAffinity[pr] || 0;
    });
    return { p, score };
  });

  // Stable sort: higher score first, preserve declared order on ties (keeps
  // the brief's "lead with" emphasis when answers don't differentiate).
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
    salaryLabel = SALARY_FALLBACK;
  }

  const strength = answers.archetype ? STRENGTHS[answers.archetype] : STRENGTHS.organizer;

  return {
    top,
    salaryShown,
    salaryLabel,
    salaryRegionLabel: region.label,
    topPathwayName: topPathway.name,
    strength,
  };
}
