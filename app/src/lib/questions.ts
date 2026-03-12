export type QuestionType =
  | "single_select"
  | "multi_select"
  | "likert_1_5"
  | "slider_0_10"
  | "numeric"
  | "text_short"
  | "text_long";

export interface Question {
  id: string;
  module: string;
  prompt: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

export const modules: Module[] = [
  {
    id: "A",
    title: "Consent & Baseline",
    description: "Let us understand your starting point and preferences.",
    questions: [
      {
        id: "Q001",
        module: "A",
        prompt: "Are you currently based in the UAE?",
        type: "single_select",
        required: true,
        options: ["Yes", "No"],
      },
      {
        id: "Q003",
        module: "A",
        prompt: "Do you want UAE-tailored recommendations?",
        type: "single_select",
        required: true,
        options: ["Yes", "No"],
      },
      {
        id: "Q004",
        module: "A",
        prompt: "What outcomes do you want from this app?",
        type: "multi_select",
        required: true,
        options: [
          "Career pathways",
          "Salary clarity",
          "Study plan",
          "Relocation plan",
          "Entrepreneurship",
          "Advisor coaching",
        ],
      },
      {
        id: "Q008",
        module: "A",
        prompt: "Preferred communication style for your report",
        type: "single_select",
        required: true,
        options: ["Direct", "Detailed", "Motivational", "Minimal"],
      },
      {
        id: "Q009",
        module: "A",
        prompt: "How urgent is your career change? (0 = no urgency, 10 = must change now)",
        type: "slider_0_10",
        required: true,
        min: 0,
        max: 10,
      },
      {
        id: "Q010",
        module: "A",
        prompt:
          'What would make this experience a "win" for you in the next 30 days?',
        type: "text_short",
        required: false,
      },
    ],
  },
  {
    id: "B",
    title: "Aviation Profile & Satisfaction",
    description: "Tell us about your aviation career and what drives you.",
    questions: [
      {
        id: "Q011",
        module: "B",
        prompt: "Years as cabin crew (total)",
        type: "numeric",
        required: true,
        min: 0,
        max: 40,
      },
      {
        id: "Q012",
        module: "B",
        prompt: "Current employer type",
        type: "single_select",
        required: true,
        options: ["GCC legacy carrier", "Low-cost carrier", "Charter", "Other"],
      },
      {
        id: "Q014",
        module: "B",
        prompt: "Cabin roles you have held",
        type: "multi_select",
        required: true,
        options: [
          "Economy",
          "Business",
          "First class",
          "Senior crew",
          "Lead/Purser duties",
        ],
      },
      {
        id: "Q016",
        module: "B",
        prompt: "Enjoyment: safety/security responsibilities",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q017",
        module: "B",
        prompt: "Enjoyment: service/hospitality delivery",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q018",
        module: "B",
        prompt: "Enjoyment: conflict resolution/de-escalation",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q019",
        module: "B",
        prompt: "Enjoyment: teamwork/leading on board",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q020",
        module: "B",
        prompt: "Enjoyment: strict compliance/checklists",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q026",
        module: "B",
        prompt: "Burnout risk (0 = low, 10 = high)",
        type: "slider_0_10",
        required: true,
        min: 0,
        max: 10,
      },
    ],
  },
  {
    id: "C",
    title: "Transferable Skills",
    description:
      "Rate your skills — these map directly to career pathways.",
    questions: [
      {
        id: "Q027",
        module: "C",
        prompt: "Public-facing service orientation",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q028",
        module: "C",
        prompt: "Speaking & communication",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q030",
        module: "C",
        prompt: "Conflict resolution/negotiation",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q031",
        module: "C",
        prompt: "Compliance & standards evaluation",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q032",
        module: "C",
        prompt: "Crisis response under pressure",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q033",
        module: "C",
        prompt: "Team coordination and briefing",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q034",
        module: "C",
        prompt: "Training/instructing others",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q035",
        module: "C",
        prompt: "Documentation/report writing",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q036",
        module: "C",
        prompt: "Operational planning (timing, flow, prioritization)",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q037",
        module: "C",
        prompt: "Data handling (tracking, spreadsheets, checklists)",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q042",
        module: "C",
        prompt: "Comfort with computers",
        type: "single_select",
        required: true,
        options: ["Low", "Medium", "High"],
      },
      {
        id: "Q044",
        module: "C",
        prompt:
          'Confidence in "career change learning" capacity (0 = low, 10 = high)',
        type: "slider_0_10",
        required: true,
        min: 0,
        max: 10,
      },
    ],
  },
  {
    id: "D",
    title: "Work Preferences",
    description: "What kind of work environment suits you best?",
    questions: [
      {
        id: "Q047",
        module: "D",
        prompt: "Preferred work environment",
        type: "multi_select",
        required: true,
        options: [
          "Structured",
          "Fast-changing",
          "Creative",
          "Analytical",
          "Mission-driven",
          "Luxury/service",
        ],
      },
      {
        id: "Q048",
        module: "D",
        prompt: "Preferred work mode",
        type: "single_select",
        required: true,
        options: ["Onsite", "Hybrid", "Remote"],
      },
      {
        id: "Q050",
        module: "D",
        prompt: "Preference for teamwork vs independent work",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q051",
        module: "D",
        prompt: "Preference for public interaction vs back-office",
        type: "likert_1_5",
        required: true,
      },
      {
        id: "Q054",
        module: "D",
        prompt: "Leadership aspiration",
        type: "single_select",
        required: true,
        options: [
          "Individual contributor",
          "Manager",
          "Senior leader",
          "Unsure",
        ],
      },
      {
        id: "Q059",
        module: "D",
        prompt: "What do you value most?",
        type: "multi_select",
        required: true,
        options: [
          "Stability",
          "Income growth",
          "Mission",
          "Autonomy",
          "Prestige",
          "Learning",
          "Family time",
        ],
      },
      {
        id: "Q060",
        module: "D",
        prompt: "Risk tolerance (0 = very risk-averse, 10 = high risk-taker)",
        type: "slider_0_10",
        required: true,
        min: 0,
        max: 10,
      },
    ],
  },
  {
    id: "E",
    title: "UAE Feasibility",
    description:
      "Help us understand your visa, labor, and timeline constraints.",
    questions: [
      {
        id: "Q061",
        module: "E",
        prompt: "Current residency type",
        type: "single_select",
        required: true,
        options: [
          "Employer-sponsored",
          "Family-sponsored",
          "Self-sponsored",
          "Not sure",
        ],
      },
      {
        id: "Q062",
        module: "E",
        prompt: "Will you need employer sponsorship for your next role?",
        type: "single_select",
        required: true,
        options: ["Yes", "No", "Not sure"],
      },
      {
        id: "Q064",
        module: "E",
        prompt: "Notice period in current contract (days)",
        type: "numeric",
        required: true,
        min: 0,
        max: 365,
      },
      {
        id: "Q065",
        module: "E",
        prompt: "Savings runway (months)",
        type: "numeric",
        required: true,
        min: 0,
        max: 60,
      },
      {
        id: "Q066",
        module: "E",
        prompt: "Minimum monthly cash needed (AED)",
        type: "numeric",
        required: true,
        min: 0,
        max: 100000,
      },
      {
        id: "Q070",
        module: "E",
        prompt: "Willingness to pause income to study",
        type: "single_select",
        required: true,
        options: ["No", "Up to 1 month", "Up to 3 months", "6+ months"],
      },
      {
        id: "Q071",
        module: "E",
        prompt: "Willingness to start at entry level in a new field",
        type: "single_select",
        required: true,
        options: ["Yes", "No", "Maybe"],
      },
      {
        id: "Q075",
        module: "E",
        prompt:
          "Likelihood you will stay in UAE 2+ years (0 = unlikely, 10 = certain)",
        type: "slider_0_10",
        required: true,
        min: 0,
        max: 10,
      },
    ],
  },
  {
    id: "F",
    title: "Compensation & Learning",
    description: "Your financial targets and learning readiness.",
    questions: [
      {
        id: "Q089",
        module: "F",
        prompt: "Target monthly cash salary (AED)",
        type: "numeric",
        required: true,
        min: 0,
        max: 200000,
      },
      {
        id: "Q090",
        module: "F",
        prompt: "Preference: higher cash vs benefits",
        type: "single_select",
        required: true,
        options: ["Higher cash", "More benefits", "Balanced"],
      },
      {
        id: "Q097",
        module: "F",
        prompt: "Highest education level",
        type: "single_select",
        required: true,
        options: [
          "High school",
          "Diploma",
          "Bachelor's degree",
          "Master's degree",
          "Other",
        ],
      },
      {
        id: "Q100",
        module: "F",
        prompt: "Weekly hours available for study",
        type: "numeric",
        required: true,
        min: 0,
        max: 40,
      },
      {
        id: "Q101",
        module: "F",
        prompt: "Budget for training in next 6 months (AED)",
        type: "numeric",
        required: true,
        min: 0,
        max: 200000,
      },
      {
        id: "Q102",
        module: "F",
        prompt: "Interest in certifications",
        type: "multi_select",
        required: true,
        options: [
          "Project management",
          "HR (CIPD/SHRM)",
          "Safety (NEBOSH)",
          "UX design",
          "Digital marketing",
          "Teaching (CELTA)",
        ],
      },
      {
        id: "Q106",
        module: "F",
        prompt: "Preferred career families",
        type: "multi_select",
        required: true,
        options: [
          "Learning & Development",
          "HR",
          "Customer Experience",
          "Operations",
          "Safety & Compliance",
          "Tech",
          "Entrepreneurship",
        ],
      },
      {
        id: "Q107",
        module: "F",
        prompt: '"If I could not fail, I would..." (dream role)',
        type: "text_short",
        required: false,
      },
    ],
  },
];
