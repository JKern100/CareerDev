export interface Pathway {
  id: string;
  name: string;
  description: string;
  typicalRoles: string[];
  salaryRange: { min: number; max: number };
  salarySource: string;
  credentials: { name: string; duration: string; cost?: string }[];
  skillSignals: string[];
}

export const pathways: Pathway[] = [
  {
    id: "P1",
    name: "Aviation Training & L&D",
    description:
      "Cabin crew instructor, training operations — leverages your direct aviation and instructing experience.",
    typicalRoles: ["Cabin Crew Instructor", "Training Operations Specialist"],
    salaryRange: { min: 16000, max: 36000 },
    salarySource: "Cooper Fitch UAE Salary Guide 2024",
    credentials: [
      { name: "IATA CRM for Instructors", duration: "4 days / 32 hours" },
      {
        name: "IATA Instructional Techniques",
        duration: "3 days / 24 hours",
      },
    ],
    skillSignals: [
      "Instructing",
      "Briefing",
      "Coaching",
      "Adult learning",
      "SOP delivery",
    ],
  },
  {
    id: "P2",
    name: "Corporate Learning & Development",
    description:
      "L&D specialist to L&D manager — applies training skills to broader corporate contexts.",
    typicalRoles: ["L&D Specialist", "Training Manager", "L&D Manager"],
    salaryRange: { min: 16000, max: 39000 },
    salarySource: "Cooper Fitch UAE Salary Guide 2024",
    credentials: [
      { name: "IATA Instructional Techniques", duration: "3 days / 24 hours" },
      {
        name: "CIPD Level 5 Associate Diploma",
        duration: "12-16 months",
      },
    ],
    skillSignals: [
      "Instructing",
      "Communication",
      "Coaching",
      "Presentation",
      "Assessment",
    ],
  },
  {
    id: "P3",
    name: "HR & People Operations",
    description:
      "HR generalist, talent acquisition, HRBP — uses interpersonal and compliance skills.",
    typicalRoles: ["HR Generalist", "TA Specialist", "HRBP"],
    salaryRange: { min: 16000, max: 54000 },
    salarySource: "Cooper Fitch UAE Salary Guide 2024",
    credentials: [
      {
        name: "CIPD Level 5 Associate Diploma",
        duration: "12-16 months",
      },
      { name: "SHRM Certification", duration: "Varies" },
    ],
    skillSignals: [
      "Stakeholder management",
      "Conflict handling",
      "Documentation",
      "Discretion",
    ],
  },
  {
    id: "P4",
    name: "Customer Experience",
    description:
      "Customer success manager, service excellence — applies hospitality and de-escalation skills.",
    typicalRoles: [
      "Customer Success Manager",
      "Service Excellence Lead",
      "Complaints Manager",
    ],
    salaryRange: { min: 27000, max: 39000 },
    salarySource: "Cooper Fitch UAE Salary Guide 2024",
    credentials: [],
    skillSignals: [
      "Service orientation",
      "De-escalation",
      "Customer journeys",
      "Communication",
    ],
  },
  {
    id: "P5",
    name: "Operations Coordination",
    description:
      "Ops manager, scheduling/coordination — leverages flow management and cross-team skills.",
    typicalRoles: [
      "Operations Manager",
      "Scheduling Coordinator",
      "Service Delivery Manager",
    ],
    salaryRange: { min: 21000, max: 39000 },
    salarySource: "Cooper Fitch UAE Salary Guide 2024",
    credentials: [
      { name: "CAPM (PMI)", duration: "23 hours PM education" },
    ],
    skillSignals: [
      "Flow management",
      "Time prioritization",
      "Cross-team coordination",
    ],
  },
  {
    id: "P6",
    name: "Safety & Compliance",
    description:
      "HSE engineer/manager, quality roles — applies compliance mindset and incident response.",
    typicalRoles: ["HSE Engineer", "HSE Manager", "Quality Specialist"],
    salaryRange: { min: 14000, max: 36000 },
    salarySource: "Cooper Fitch UAE Salary Guide 2024",
    credentials: [
      {
        name: "NEBOSH International General Certificate",
        duration: "63 taught hrs + 40 private study",
      },
      { name: "ISO 45001 Lead Auditor (CQI/IRCA)", duration: "5 days" },
    ],
    skillSignals: [
      "Compliance mindset",
      "Incident response",
      "Documentation",
      "Standards evaluation",
    ],
  },
  {
    id: "P7",
    name: "Project Management",
    description:
      "IT project manager, program roles — uses planning and stakeholder management skills.",
    typicalRoles: [
      "Project Coordinator",
      "IT Project Manager",
      "Program Manager",
    ],
    salaryRange: { min: 39000, max: 55000 },
    salarySource: "Cooper Fitch UAE Salary Guide 2024",
    credentials: [
      { name: "CAPM (PMI)", duration: "23 hours PM education" },
      { name: "PMP (PMI)", duration: "35 hours PM education + experience" },
    ],
    skillSignals: [
      "Planning",
      "Prioritization",
      "Stakeholder updates",
      "Documentation",
    ],
  },
  {
    id: "P8",
    name: "Tech-Adjacent Pivot",
    description:
      "UX/UI designer, business analyst — requires strong interest and study commitment.",
    typicalRoles: ["UX/UI Designer (Junior-Mid)", "Business Analyst"],
    salaryRange: { min: 11000, max: 34000 },
    salarySource: "Cooper Fitch UAE Salary Guide 2024",
    credentials: [
      {
        name: "Google UX Professional Certificate",
        duration: "~6 months @ 10 hrs/week",
      },
      {
        name: "Google Digital Marketing & E-commerce",
        duration: "~6 months @ 10 hrs/week",
      },
    ],
    skillSignals: [
      "Structured thinking",
      "Portfolio projects",
      "Study readiness",
    ],
  },
];

export interface Answers {
  [questionId: string]: string | string[] | number;
}

interface ScoreComponents {
  interestFit: number;
  skillFit: number;
  environmentFit: number;
  feasibility: number;
  compensationFit: number;
  riskFit: number;
}

export interface PathwayScore {
  pathway: Pathway;
  rawScore: number;
  adjustedScore: number;
  components: ScoreComponents;
  topSignals: string[];
  risks: string[];
}

function num(val: string | string[] | number | undefined, fallback: number): number {
  if (val === undefined) return fallback;
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || fallback;
  return fallback;
}

function likert(val: string | string[] | number | undefined): number {
  return num(val, 3);
}

function includes(val: string | string[] | number | undefined, target: string): boolean {
  if (Array.isArray(val)) return val.includes(target);
  if (typeof val === "string") return val === target;
  return false;
}

export function computeScores(answers: Answers): PathwayScore[] {
  const results: PathwayScore[] = [];

  for (const pathway of pathways) {
    const components = scorePathway(pathway, answers);
    const rawScore =
      components.interestFit * 0.25 +
      components.skillFit * 0.25 +
      components.environmentFit * 0.1 +
      components.feasibility * 0.2 +
      components.compensationFit * 0.15 +
      components.riskFit * 0.05;

    const confidence = num(answers.Q044, 5) / 10;
    const adjustedScore = rawScore * (0.7 + 0.3 * confidence);

    const topSignals: string[] = [];
    const risks: string[] = [];

    if (components.skillFit > 70) topSignals.push("Strong skill match");
    if (components.interestFit > 70) topSignals.push("High interest alignment");
    if (components.compensationFit > 70) topSignals.push("Meets salary expectations");
    if (components.feasibility > 70) topSignals.push("Feasible within constraints");

    if (components.feasibility < 40) risks.push("Feasibility constraints identified");
    if (components.compensationFit < 40) risks.push("May not meet minimum salary needs");
    if (components.skillFit < 40) risks.push("Skills gap may require significant upskilling");

    results.push({
      pathway,
      rawScore: Math.round(rawScore),
      adjustedScore: Math.round(adjustedScore),
      components,
      topSignals,
      risks,
    });
  }

  return results.sort((a, b) => b.adjustedScore - a.adjustedScore);
}

function scorePathway(pathway: Pathway, a: Answers): ScoreComponents {
  switch (pathway.id) {
    case "P1": // Aviation Training
      return {
        interestFit: scoreInterest(a, ["Learning & Development"], ["Training/instructing others"]),
        skillFit: clamp(
          (likert(a.Q034) * 20 + likert(a.Q033) * 15 + likert(a.Q028) * 10 + likert(a.Q020) * 5) / 2.5
        ),
        environmentFit: scoreEnvironment(a),
        feasibility: scoreFeasibility(a),
        compensationFit: scoreCompensation(a, pathway.salaryRange),
        riskFit: scoreRisk(a),
      };
    case "P2": // Corporate L&D
      return {
        interestFit: scoreInterest(a, ["Learning & Development"], ["Training/instructing others", "Speaking & communication"]),
        skillFit: clamp(
          (likert(a.Q034) * 18 + likert(a.Q028) * 15 + likert(a.Q033) * 12 + likert(a.Q027) * 5) / 2.5
        ),
        environmentFit: scoreEnvironment(a),
        feasibility: scoreFeasibility(a),
        compensationFit: scoreCompensation(a, pathway.salaryRange),
        riskFit: scoreRisk(a),
      };
    case "P3": // HR
      return {
        interestFit: scoreInterest(a, ["HR"], ["Conflict resolution/negotiation", "Documentation/report writing"]),
        skillFit: clamp(
          (likert(a.Q030) * 18 + likert(a.Q028) * 15 + likert(a.Q035) * 12 + likert(a.Q033) * 5) / 2.5
        ),
        environmentFit: scoreEnvironment(a),
        feasibility: scoreFeasibility(a),
        compensationFit: scoreCompensation(a, pathway.salaryRange),
        riskFit: scoreRisk(a),
      };
    case "P4": // CX
      return {
        interestFit: scoreInterest(a, ["Customer Experience"], ["Public-facing service orientation"]),
        skillFit: clamp(
          (likert(a.Q027) * 20 + likert(a.Q030) * 15 + likert(a.Q028) * 10 + likert(a.Q017) * 5) / 2.5
        ),
        environmentFit: scoreEnvironment(a),
        feasibility: scoreFeasibility(a),
        compensationFit: scoreCompensation(a, pathway.salaryRange),
        riskFit: scoreRisk(a),
      };
    case "P5": // Operations
      return {
        interestFit: scoreInterest(a, ["Operations"], ["Operational planning (timing, flow, prioritization)"]),
        skillFit: clamp(
          (likert(a.Q036) * 20 + likert(a.Q033) * 15 + likert(a.Q037) * 10 + likert(a.Q035) * 5) / 2.5
        ),
        environmentFit: scoreEnvironment(a),
        feasibility: scoreFeasibility(a),
        compensationFit: scoreCompensation(a, pathway.salaryRange),
        riskFit: scoreRisk(a),
      };
    case "P6": // Safety
      return {
        interestFit: scoreInterest(a, ["Safety & Compliance"], ["Compliance & standards evaluation"]),
        skillFit: clamp(
          (likert(a.Q031) * 20 + likert(a.Q032) * 15 + likert(a.Q035) * 10 + likert(a.Q020) * 5) / 2.5
        ),
        environmentFit: scoreEnvironment(a),
        feasibility: scoreFeasibility(a),
        compensationFit: scoreCompensation(a, pathway.salaryRange),
        riskFit: scoreRisk(a),
      };
    case "P7": // PM
      return {
        interestFit: scoreInterest(a, ["Operations"], ["Operational planning (timing, flow, prioritization)", "Documentation/report writing"]),
        skillFit: clamp(
          (likert(a.Q036) * 18 + likert(a.Q035) * 15 + likert(a.Q033) * 12 + likert(a.Q037) * 5) / 2.5
        ),
        environmentFit: scoreEnvironment(a),
        feasibility: scoreFeasibility(a),
        compensationFit: scoreCompensation(a, pathway.salaryRange),
        riskFit: scoreRisk(a),
      };
    case "P8": // Tech pivot
      return {
        interestFit: scoreInterest(a, ["Tech"], []),
        skillFit: clamp(
          (likert(a.Q037) * 15 + likert(a.Q036) * 10 + (a.Q042 === "High" ? 50 : a.Q042 === "Medium" ? 30 : 10)) / 1.5
        ),
        environmentFit: scoreEnvironment(a),
        feasibility: scoreFeasibilityTech(a),
        compensationFit: scoreCompensation(a, pathway.salaryRange),
        riskFit: scoreRisk(a),
      };
    default:
      return {
        interestFit: 50,
        skillFit: 50,
        environmentFit: 50,
        feasibility: 50,
        compensationFit: 50,
        riskFit: 50,
      };
  }
}

function scoreInterest(a: Answers, families: string[], _skills: string[]): number {
  const selected = Array.isArray(a.Q106) ? a.Q106 : [];
  const match = families.some((f) => selected.includes(f));
  return match ? 85 : 40;
}

function scoreEnvironment(a: Answers): number {
  let score = 50;
  if (includes(a.Q047, "Structured")) score += 10;
  if (includes(a.Q047, "Mission-driven")) score += 5;
  score += (likert(a.Q050) - 3) * 5;
  return clamp(score);
}

function scoreFeasibility(a: Answers): number {
  let score = 70;
  const savings = num(a.Q065, 6);
  if (savings < 3) score -= 20;
  else if (savings < 6) score -= 5;

  const entryLevel = a.Q071;
  if (entryLevel === "No") score -= 15;
  else if (entryLevel === "Maybe") score -= 5;

  const studyPause = a.Q070;
  if (studyPause === "No") score -= 10;

  return clamp(score);
}

function scoreFeasibilityTech(a: Answers): number {
  let score = scoreFeasibility(a);
  const studyHours = num(a.Q100, 5);
  if (studyHours < 10) score -= 20;
  const budget = num(a.Q101, 5000);
  if (budget < 3000) score -= 15;
  return clamp(score);
}

function scoreCompensation(a: Answers, range: { min: number; max: number }): number {
  const target = num(a.Q089, 20000);
  if (target <= range.min) return 90;
  if (target <= range.max) return 70;
  if (target <= range.max * 1.2) return 45;
  return 25;
}

function scoreRisk(a: Answers): number {
  const risk = num(a.Q060, 5);
  return clamp(risk * 10);
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}
