"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { Answer, PathwayScore, UserProfile } from "./types";

interface AppState {
  step: "landing" | "consent" | "questionnaire" | "results" | "advisor";
  currentModule: string;
  currentQuestionIndex: number;
  answers: Record<string, Answer>;
  consentGiven: boolean;
  anonymizedDataConsent: boolean;
  language: string;
  communicationStyle: string;
  pathwayScores: PathwayScore[];
  advisorReview: boolean;
}

type Action =
  | { type: "SET_STEP"; step: AppState["step"] }
  | { type: "SET_MODULE"; module: string }
  | { type: "SET_QUESTION_INDEX"; index: number }
  | { type: "SET_ANSWER"; questionId: string; answer: Answer }
  | { type: "SET_CONSENT"; given: boolean }
  | { type: "SET_ANONYMIZED_CONSENT"; given: boolean }
  | { type: "SET_LANGUAGE"; language: string }
  | { type: "SET_COMMUNICATION_STYLE"; style: string }
  | { type: "SET_PATHWAY_SCORES"; scores: PathwayScore[] }
  | { type: "SET_ADVISOR_REVIEW"; review: boolean }
  | { type: "RESET" };

const initialState: AppState = {
  step: "landing",
  currentModule: "A",
  currentQuestionIndex: 0,
  answers: {},
  consentGiven: false,
  anonymizedDataConsent: false,
  language: "English",
  communicationStyle: "Direct",
  pathwayScores: [],
  advisorReview: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_MODULE":
      return { ...state, currentModule: action.module };
    case "SET_QUESTION_INDEX":
      return { ...state, currentQuestionIndex: action.index };
    case "SET_ANSWER":
      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: action.answer },
      };
    case "SET_CONSENT":
      return { ...state, consentGiven: action.given };
    case "SET_ANONYMIZED_CONSENT":
      return { ...state, anonymizedDataConsent: action.given };
    case "SET_LANGUAGE":
      return { ...state, language: action.language };
    case "SET_COMMUNICATION_STYLE":
      return { ...state, communicationStyle: action.style };
    case "SET_PATHWAY_SCORES":
      return { ...state, pathwayScores: action.scores };
    case "SET_ADVISOR_REVIEW":
      return { ...state, advisorReview: action.review };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}

export function getUserProfile(state: AppState): UserProfile {
  return {
    answers: state.answers,
    consentGiven: state.consentGiven,
    anonymizedDataConsent: state.anonymizedDataConsent,
    language: state.language,
    communicationStyle: state.communicationStyle,
  };
}
