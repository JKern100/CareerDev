import { Pathway } from "@/lib/types";

export const pathways: Pathway[] = [
  {
    id: "P1",
    name: "Aviation Training / Cabin Crew Instructor",
    description:
      "Leverage your onboard experience to transition into aviation training roles. Cabin crew instructors train new and existing crew on safety procedures, service standards, and CRM. This path stays close to aviation and builds on your existing knowledge.",
    typicalRoles: [
      "Cabin Crew Instructor",
      "Training Operations Coordinator",
      "Aviation Safety Trainer",
    ],
    salaryBands: [
      {
        role: "L&D Specialist",
        minAED: 16000,
        maxAED: 23000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
      {
        role: "Training Manager",
        minAED: 22400,
        maxAED: 36000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
    ],
    prerequisites: [
      "3+ years cabin crew experience",
      "Strong safety and service knowledge",
      "Evidence of training or mentoring activities",
    ],
    recommendedCredentials: [
      "IATA CRM for Instructors (4 days / 32 hours)",
      "IATA Instructional Techniques (3 days / 24 hours)",
    ],
    skillSignals: [
      "Instructing",
      "Briefing",
      "Coaching",
      "Adult learning",
      "SOP delivery",
    ],
    volatility: 0.2,
  },
  {
    id: "P2",
    name: "Corporate Learning & Development",
    description:
      "Move into corporate L&D roles where you design and deliver training programs. Your experience briefing crews, mentoring new joiners, and delivering safety training translates directly to corporate learning environments.",
    typicalRoles: [
      "L&D Specialist",
      "L&D Manager",
      "Training Coordinator",
    ],
    salaryBands: [
      {
        role: "L&D Specialist",
        minAED: 16000,
        maxAED: 23000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
      {
        role: "L&D Manager",
        minAED: 27700,
        maxAED: 39000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
    ],
    prerequisites: [
      "Experience in training or mentoring",
      "Strong communication skills",
      "Interest in adult education methodology",
    ],
    recommendedCredentials: [
      "IATA Instructional Techniques (3 days / 24 hours)",
      "CIPD Level 5 Associate Diploma in People Management (12-16 months)",
    ],
    skillSignals: [
      "Instructing",
      "Coaching",
      "Content development",
      "Facilitation",
      "Assessment design",
    ],
    volatility: 0.25,
  },
  {
    id: "P3",
    name: "Human Resources",
    description:
      "Your people skills, conflict resolution ability, and experience managing diverse teams make HR a natural fit. Start as HR Generalist or Talent Acquisition and grow into HRBP roles.",
    typicalRoles: [
      "HR Generalist",
      "Talent Acquisition Specialist",
      "HRBP (with experience)",
    ],
    salaryBands: [
      {
        role: "HR Generalist",
        minAED: 16000,
        maxAED: 20000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
      {
        role: "TA Specialist",
        minAED: 16000,
        maxAED: 21000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
      {
        role: "HRBP",
        minAED: 33000,
        maxAED: 54000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
    ],
    prerequisites: [
      "Strong interpersonal skills",
      "Interest in people processes and policies",
      "Willingness to study HR frameworks",
    ],
    recommendedCredentials: [
      "CIPD Level 5 Associate Diploma in People Management (12-16 months)",
      "SHRM Certification",
    ],
    skillSignals: [
      "Stakeholder management",
      "Conflict handling",
      "Documentation",
      "Discretion",
      "Empathy",
    ],
    volatility: 0.2,
  },
  {
    id: "P4",
    name: "Customer Experience / Customer Success",
    description:
      "Your service orientation and de-escalation skills are highly valued in customer experience roles. These positions focus on ensuring customer satisfaction, managing complaints, and improving service standards.",
    typicalRoles: [
      "Customer Success Manager",
      "Service Excellence Lead",
      "Complaints Escalation Manager",
    ],
    salaryBands: [
      {
        role: "Customer Success Manager / TAM",
        minAED: 27000,
        maxAED: 39000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
    ],
    prerequisites: [
      "Strong service orientation",
      "Experience handling complaints and de-escalation",
      "Understanding of customer journeys",
    ],
    recommendedCredentials: [
      "Google Digital Marketing & E-commerce (6 months)",
    ],
    skillSignals: [
      "Service orientation",
      "De-escalation",
      "Customer journeys",
      "Communication",
      "Empathy",
    ],
    volatility: 0.3,
  },
  {
    id: "P5",
    name: "Operations Coordination",
    description:
      "Flight operations demand precise timing, resource coordination, and cross-team communication. These skills translate directly into operations management roles in aviation, logistics, and other industries.",
    typicalRoles: [
      "Operations Manager",
      "Scheduling Coordinator",
      "Service Delivery Manager",
    ],
    salaryBands: [
      {
        role: "Operations Manager",
        minAED: 21000,
        maxAED: 39000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
    ],
    prerequisites: [
      "Experience in operational planning",
      "Strong organizational skills",
      "Ability to manage competing priorities",
    ],
    recommendedCredentials: [
      "CAPM - PMI (requires 23 hours PM education)",
    ],
    skillSignals: [
      "Flow management",
      "Time prioritization",
      "Cross-team coordination",
      "Planning",
      "Documentation",
    ],
    volatility: 0.25,
  },
  {
    id: "P6",
    name: "Safety / HSE / Quality",
    description:
      "Your compliance mindset and incident response experience make safety and HSE roles a strong match. These roles exist across all industries, not just aviation, offering broad career options.",
    typicalRoles: [
      "HSE Engineer",
      "HSE Manager",
      "Quality Assurance Specialist",
    ],
    salaryBands: [
      {
        role: "HSE Engineer",
        minAED: 14000,
        maxAED: 20000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
      {
        role: "HSE Manager",
        minAED: 24000,
        maxAED: 36000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
    ],
    prerequisites: [
      "Strong compliance mindset",
      "Attention to detail",
      "Interest in safety systems and standards",
    ],
    recommendedCredentials: [
      "NEBOSH International General Certificate (63+ taught hrs)",
      "ISO 45001 Lead Auditor - CQI/IRCA (5 days)",
    ],
    skillSignals: [
      "Compliance mindset",
      "Incident response",
      "Documentation",
      "Standards evaluation",
      "Risk assessment",
    ],
    volatility: 0.15,
  },
  {
    id: "P7",
    name: "Project Coordination / Project Management",
    description:
      "Your planning, prioritization, and documentation skills are core PM competencies. Start as a coordinator and grow into full project management with the right certification.",
    typicalRoles: [
      "Project Coordinator",
      "IT Project Manager (with upskilling)",
      "Program Support",
    ],
    salaryBands: [
      {
        role: "IT Project Manager",
        minAED: 39000,
        maxAED: 55000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
    ],
    prerequisites: [
      "Strong organizational and documentation skills",
      "Comfort with planning tools",
      "Willingness to pursue PM certification",
    ],
    recommendedCredentials: [
      "CAPM - PMI (requires 23 hours PM education)",
      "PMP (with experience, post-CAPM)",
    ],
    skillSignals: [
      "Planning",
      "Prioritization",
      "Stakeholder updates",
      "Documentation",
      "Coordination",
    ],
    volatility: 0.3,
  },
  {
    id: "P8",
    name: "Tech-Adjacent Pivot (UX / Business Analysis)",
    description:
      "If you have strong analytical thinking, interest in technology, and willingness to invest in study, a pivot into UX design or business analysis is possible. This requires the most investment but offers high growth potential.",
    typicalRoles: [
      "UX/UI Designer (junior-mid)",
      "Business Analyst",
    ],
    salaryBands: [
      {
        role: "UX/UI Designer",
        minAED: 22000,
        maxAED: 34000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
      {
        role: "Business Analyst",
        minAED: 11000,
        maxAED: 16000,
        source: "Cooper Fitch UAE Salary Guide 2024",
      },
    ],
    prerequisites: [
      "Strong interest in technology",
      "Analytical mindset",
      "Significant study time and budget available",
      "High learning confidence",
    ],
    recommendedCredentials: [
      "Google UX Professional Certificate - Coursera (6 months @ 10 hrs/week)",
      "Google Digital Marketing & E-commerce - Coursera (6 months @ 10 hrs/week)",
    ],
    skillSignals: [
      "Structured thinking",
      "Portfolio projects",
      "Study readiness",
      "Data handling",
      "User empathy",
    ],
    volatility: 0.5,
  },
];

// Mapping of which questions are relevant to each pathway for scoring
export const pathwayQuestionMap: Record<string, string[]> = {
  P1: [
    "Q015", "Q016", "Q019", "Q020", "Q027", "Q028", "Q031", "Q033",
    "Q034", "Q039", "Q044", "Q050", "Q102", "Q106",
  ],
  P2: [
    "Q015", "Q027", "Q028", "Q029", "Q033", "Q034", "Q035", "Q039",
    "Q042", "Q044", "Q050", "Q102", "Q106",
  ],
  P3: [
    "Q018", "Q027", "Q029", "Q030", "Q035", "Q042", "Q050", "Q051",
    "Q054", "Q059", "Q097", "Q102", "Q106",
  ],
  P4: [
    "Q017", "Q018", "Q027", "Q028", "Q029", "Q030", "Q051", "Q052",
    "Q059", "Q106",
  ],
  P5: [
    "Q019", "Q020", "Q031", "Q033", "Q035", "Q036", "Q037", "Q042",
    "Q050", "Q056", "Q106",
  ],
  P6: [
    "Q016", "Q020", "Q031", "Q032", "Q035", "Q038", "Q052", "Q053",
    "Q102", "Q106",
  ],
  P7: [
    "Q031", "Q033", "Q035", "Q036", "Q037", "Q040", "Q042", "Q053",
    "Q056", "Q102", "Q106",
  ],
  P8: [
    "Q037", "Q042", "Q043", "Q044", "Q053", "Q060", "Q097", "Q100",
    "Q101", "Q102", "Q106",
  ],
};
