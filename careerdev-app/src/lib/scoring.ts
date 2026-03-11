import { Answer, PathwayScore } from "./types";
import { pathways, pathwayQuestionMap } from "@/data/pathways";
import { questions } from "@/data/questions";

function getNumericValue(answer: Answer): number {
  if (typeof answer.value === "number") return answer.value;
  if (typeof answer.value === "string") {
    const n = parseFloat(answer.value);
    if (!isNaN(n)) return n;
  }
  return 0;
}

function computeInterestFit(
  pathwayId: string,
  answers: Record<string, Answer>
): number {
  let score = 0;
  let count = 0;

  // Check Q106 (preferred career families)
  const q106 = answers["Q106"];
  if (q106 && Array.isArray(q106.value)) {
    const familyMap: Record<string, string[]> = {
      P1: ["Learning & Development"],
      P2: ["Learning & Development"],
      P3: ["Human Resources"],
      P4: ["Customer Experience"],
      P5: ["Operations"],
      P6: ["Safety/Compliance"],
      P7: ["Operations"],
      P8: ["Tech/UX/Data"],
    };
    const targetFamilies = familyMap[pathwayId] || [];
    const vals = q106.value as string[];
    const match = targetFamilies.some((f) => vals.includes(f));
    score += match ? 1 : 0;
    count++;
  }

  // Check Q004 (desired outcomes)
  const q004 = answers["Q004"];
  if (q004 && Array.isArray(q004.value)) {
    if (q004.value.includes("Career pathways")) {
      score += 0.5;
    }
    count += 0.5;
  }

  // Check Q102 (certification interests)
  const q102 = answers["Q102"];
  if (q102 && Array.isArray(q102.value)) {
    const certMap: Record<string, string[]> = {
      P1: ["Project management"],
      P2: ["Project management"],
      P3: ["HR (CIPD/SHRM)"],
      P6: ["Safety (NEBOSH)"],
      P7: ["Project management"],
      P8: ["UX Design", "Digital marketing"],
    };
    const targetCerts = certMap[pathwayId] || [];
    const certVals = q102.value as string[];
    const match = targetCerts.some((c) => certVals.includes(c));
    if (match) score += 1;
    count++;
  }

  return count > 0 ? score / count : 0.5;
}

function computeSkillFit(
  pathwayId: string,
  answers: Record<string, Answer>
): number {
  const relevantQuestions = pathwayQuestionMap[pathwayId] || [];
  const skillQuestions = relevantQuestions.filter((qId) => {
    const q = questions.find((q) => q.id === qId);
    return q && (q.type === "likert_1_5" || q.type === "slider_0_10");
  });

  if (skillQuestions.length === 0) return 0.5;

  let totalScore = 0;
  let count = 0;
  let hasEvidence = false;

  for (const qId of skillQuestions) {
    const answer = answers[qId];
    if (!answer) continue;
    const q = questions.find((q) => q.id === qId);
    if (!q) continue;

    const val = getNumericValue(answer);
    const maxVal = q.type === "likert_1_5" ? 5 : 10;
    totalScore += val / maxVal;
    count++;
  }

  // Evidence bonus: check text_long answers related to the pathway
  const evidenceQuestions = relevantQuestions.filter((qId) => {
    const q = questions.find((q) => q.id === qId);
    return q && q.type === "text_long";
  });
  for (const qId of evidenceQuestions) {
    const answer = answers[qId];
    if (answer && typeof answer.value === "string" && answer.value.length > 50) {
      hasEvidence = true;
      break;
    }
  }

  const baseScore = count > 0 ? totalScore / count : 0.5;
  return hasEvidence ? Math.min(1, baseScore * 1.15) : baseScore;
}

function computeEnvironmentFit(
  pathwayId: string,
  answers: Record<string, Answer>
): number {
  let score = 0;
  let count = 0;

  // Work mode preference
  const q048 = answers["Q048"];
  if (q048) {
    const requiresOnsite: Record<string, boolean> = {
      P1: true,
      P2: false,
      P3: false,
      P4: false,
      P5: true,
      P6: true,
      P7: false,
      P8: false,
    };
    if (requiresOnsite[pathwayId] && q048.value === "Remote") {
      score += 0.2;
    } else {
      score += 1;
    }
    count++;
  }

  // Schedule preference
  const q049 = answers["Q049"];
  if (q049) {
    const shiftBased = ["P1", "P5"];
    if (shiftBased.includes(pathwayId) && q049.value === "Shift-based") {
      score += 1;
    } else if (!shiftBased.includes(pathwayId) && q049.value === "Monday–Friday") {
      score += 1;
    } else {
      score += 0.6;
    }
    count++;
  }

  // Public interaction preference
  const q051 = answers["Q051"];
  if (q051) {
    const highPublic = ["P1", "P2", "P3", "P4"];
    const val = getNumericValue(q051) / 5;
    if (highPublic.includes(pathwayId)) {
      score += val;
    } else {
      score += 1 - val * 0.5;
    }
    count++;
  }

  return count > 0 ? score / count : 0.5;
}

function computeFeasibility(
  pathwayId: string,
  answers: Record<string, Answer>
): number {
  let score = 1;
  let penalties = 0;

  // Study willingness & time
  const q070 = answers["Q070"];
  const q100 = answers["Q100"];
  const highStudy = ["P3", "P7", "P8"]; // Need significant study

  if (highStudy.includes(pathwayId)) {
    if (q070 && q070.value === "No") {
      penalties += 0.3;
    }
    if (q100) {
      const hours = getNumericValue(q100);
      if (hours < 5) penalties += 0.2;
    }
  }

  // Entry level willingness
  const q071 = answers["Q071"];
  if (q071 && q071.value === "No") {
    const entryLevel = ["P3", "P8"];
    if (entryLevel.includes(pathwayId)) {
      penalties += 0.25;
    }
  }

  // Budget for training
  const q101 = answers["Q101"];
  if (q101) {
    const budget = getNumericValue(q101);
    if (budget < 5000 && ["P3", "P6", "P7", "P8"].includes(pathwayId)) {
      penalties += 0.15;
    }
  }

  // Sponsorship constraints
  const q062 = answers["Q062"];
  const q063 = answers["Q063"];
  if (q062 && q062.value === "Yes" && q063 && q063.value === "No") {
    // Needs sponsorship but won't change employer - restrict to internal
    penalties += 0.3;
  }

  // Savings runway
  const q065 = answers["Q065"];
  if (q065 && getNumericValue(q065) < 2) {
    penalties += 0.1;
  }

  return Math.max(0, score - penalties);
}

function computeCompensationFit(
  pathwayId: string,
  answers: Record<string, Answer>
): number {
  const q089 = answers["Q089"];
  const q066 = answers["Q066"];

  if (!q089 && !q066) return 0.5;

  const pathway = pathways.find((p) => p.id === pathwayId);
  if (!pathway || pathway.salaryBands.length === 0) return 0.5;

  const targetSalary = q089 ? getNumericValue(q089) : getNumericValue(q066!);
  if (targetSalary === 0) return 0.7;

  // Check if any salary band covers the target
  const maxSalary = Math.max(...pathway.salaryBands.map((b) => b.maxAED));
  const minSalary = Math.min(...pathway.salaryBands.map((b) => b.minAED));

  if (targetSalary <= minSalary) return 1;
  if (targetSalary <= maxSalary) return 0.8;
  if (targetSalary <= maxSalary * 1.2) return 0.5;
  return 0.2;
}

function computeRiskFit(
  pathwayId: string,
  answers: Record<string, Answer>
): number {
  const q060 = answers["Q060"];
  if (!q060) return 0.5;

  const riskTolerance = getNumericValue(q060) / 10;
  const pathway = pathways.find((p) => p.id === pathwayId);
  if (!pathway) return 0.5;

  // Higher tolerance = better fit for volatile pathways
  // Lower tolerance = better fit for stable pathways
  const diff = Math.abs(riskTolerance - pathway.volatility);
  return 1 - diff;
}

function getTopSignals(
  pathwayId: string,
  answers: Record<string, Answer>
): string[] {
  const signals: string[] = [];
  const relevantQuestions = pathwayQuestionMap[pathwayId] || [];

  for (const qId of relevantQuestions) {
    const answer = answers[qId];
    const question = questions.find((q) => q.id === qId);
    if (!answer || !question) continue;

    if (question.type === "likert_1_5" && getNumericValue(answer) >= 4) {
      signals.push(`Strong ${question.prompt.toLowerCase()}`);
    }
    if (question.type === "slider_0_10" && getNumericValue(answer) >= 7) {
      signals.push(`High ${question.prompt.toLowerCase()}`);
    }
    if (question.type === "text_long" && typeof answer.value === "string" && answer.value.length > 50) {
      signals.push(`Provided evidence: ${question.prompt.substring(0, 50)}`);
    }
  }

  return signals.slice(0, 5);
}

function getRisks(
  pathwayId: string,
  answers: Record<string, Answer>
): string[] {
  const risks: string[] = [];

  const q065 = answers["Q065"];
  if (q065 && getNumericValue(q065) < 3) {
    risks.push("Limited savings runway may constrain transition timeline");
  }

  const q062 = answers["Q062"];
  if (q062 && q062.value === "Yes") {
    risks.push("Requires employer sponsorship for visa continuity");
  }

  const q100 = answers["Q100"];
  if (q100 && getNumericValue(q100) < 5) {
    risks.push("Limited study time available for required credentials");
  }

  const pathway = pathways.find((p) => p.id === pathwayId);
  if (pathway && pathway.volatility > 0.3) {
    risks.push("Higher career path uncertainty; plan for contingencies");
  }

  return risks.slice(0, 4);
}

function getGateFlags(
  pathwayId: string,
  answers: Record<string, Answer>
): string[] {
  const flags: string[] = [];

  const q048 = answers["Q048"];
  if (q048 && q048.value === "Remote" && ["P1", "P5", "P6"].includes(pathwayId)) {
    flags.push("GATE: Requires onsite/hybrid; user prefers remote");
  }

  const q062 = answers["Q062"];
  const q063 = answers["Q063"];
  if (q062?.value === "Yes" && q063?.value === "No") {
    flags.push("GATE: Needs sponsorship but won't change employer");
  }

  const q071 = answers["Q071"];
  if (q071?.value === "No" && ["P3", "P8"].includes(pathwayId)) {
    flags.push("GATE: Unwilling to start at entry level");
  }

  return flags;
}

export function computePathwayScores(
  answers: Record<string, Answer>
): PathwayScore[] {
  const scores: PathwayScore[] = [];

  for (const pathway of pathways) {
    const interestFit = computeInterestFit(pathway.id, answers);
    const skillFit = computeSkillFit(pathway.id, answers);
    const environmentFit = computeEnvironmentFit(pathway.id, answers);
    const feasibility = computeFeasibility(pathway.id, answers);
    const compensationFit = computeCompensationFit(pathway.id, answers);
    const riskFit = computeRiskFit(pathway.id, answers);

    // Weighted raw score (per PRD: Interest 25%, Skill 25%, Env 10%, Feasibility 20%, Comp 15%, Risk 5%)
    const rawScore =
      interestFit * 0.25 +
      skillFit * 0.25 +
      environmentFit * 0.1 +
      feasibility * 0.2 +
      compensationFit * 0.15 +
      riskFit * 0.05;

    // Confidence adjustment
    const relevantQuestions = pathwayQuestionMap[pathway.id] || [];
    let confidenceSum = 0;
    let confidenceCount = 0;
    for (const qId of relevantQuestions) {
      const answer = answers[qId];
      if (answer) {
        confidenceSum += answer.confidence;
        confidenceCount++;
      }
    }
    const confidenceFactor =
      confidenceCount > 0 ? confidenceSum / (confidenceCount * 100) : 0.5;

    // Final score = raw_score * (0.7 + 0.3 * confidence_factor)
    const adjustedScore = rawScore * (0.7 + 0.3 * confidenceFactor);

    scores.push({
      pathwayId: pathway.id,
      rawScore: Math.round(rawScore * 100),
      adjustedScore: Math.round(adjustedScore * 100),
      interestFit: Math.round(interestFit * 100),
      skillFit: Math.round(skillFit * 100),
      environmentFit: Math.round(environmentFit * 100),
      feasibility: Math.round(feasibility * 100),
      compensationFit: Math.round(compensationFit * 100),
      riskFit: Math.round(riskFit * 100),
      confidenceFactor: Math.round(confidenceFactor * 100),
      topSignals: getTopSignals(pathway.id, answers),
      risks: getRisks(pathway.id, answers),
      gateFlags: getGateFlags(pathway.id, answers),
    });
  }

  // Sort by adjusted score descending
  scores.sort((a, b) => b.adjustedScore - a.adjustedScore);
  return scores;
}
