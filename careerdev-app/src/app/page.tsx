"use client";

import { useAppState } from "@/lib/store";
import LandingPage from "@/components/LandingPage";
import ConsentPage from "@/components/ConsentPage";
import QuestionnairePage from "@/components/QuestionnairePage";
import ResultsPage from "@/components/ResultsPage";
import AdvisorPage from "@/components/AdvisorPage";

export default function Home() {
  const { state } = useAppState();

  switch (state.step) {
    case "landing":
      return <LandingPage />;
    case "consent":
      return <ConsentPage />;
    case "questionnaire":
      return <QuestionnairePage />;
    case "results":
      return <ResultsPage />;
    case "advisor":
      return <AdvisorPage />;
    default:
      return <LandingPage />;
  }
}
