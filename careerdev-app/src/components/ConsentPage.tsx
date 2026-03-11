"use client";

import { useState } from "react";
import { useAppState } from "@/lib/store";

export default function ConsentPage() {
  const { dispatch } = useAppState();
  const [dataConsent, setDataConsent] = useState(false);
  const [anonymizedConsent, setAnonymizedConsent] = useState(false);
  const [disclaimerRead, setDisclaimerRead] = useState(false);

  const canProceed = dataConsent && disclaimerRead;

  function handleProceed() {
    if (!canProceed) return;
    dispatch({ type: "SET_CONSENT", given: true });
    dispatch({ type: "SET_ANONYMIZED_CONSENT", given: anonymizedConsent });
    dispatch({ type: "SET_STEP", step: "questionnaire" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <button
          onClick={() => dispatch({ type: "SET_STEP", step: "landing" })}
          className="text-slate-400 hover:text-white mb-8 text-sm flex items-center gap-2 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </button>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Before we begin</h1>
          <p className="text-slate-400 mb-8">
            We take your privacy seriously. Please review the information below
            and provide your consent to proceed.
          </p>

          {/* Disclaimer */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-amber-300 mb-2">Important disclaimers</h3>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>
                This app provides <strong>informational guidance only</strong> and does not constitute
                legal, financial, or immigration advice.
              </li>
              <li>
                Salary figures are <strong>market estimates</strong> from the Cooper Fitch UAE
                Salary Guide 2024 and should not be treated as offers.
              </li>
              <li>
                Visa and labor law information is sourced from official UAE government portals
                but <strong>may change</strong>. Always verify with official sources.
              </li>
              <li>
                The UAE does not levy personal income tax on individuals (source: UAE official
                portal). Home-country tax obligations are your responsibility.
              </li>
              <li>
                You may request <strong>human review</strong> of any automated recommendation
                via our advisor workflow, as supported by UAE PDPL protections.
              </li>
            </ul>
          </div>

          {/* Data Processing Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
            <h3 className="font-semibold mb-2">How we use your data</h3>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>Your answers are processed to generate personalized career pathway recommendations.</li>
              <li>Data is encrypted at rest and in transit.</li>
              <li>You can export or delete your data at any time (PDPL rights).</li>
              <li>Advisor access requires your explicit additional consent.</li>
              <li>No data is shared with third parties without consent.</li>
            </ul>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4 mb-8">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={disclaimerRead}
                onChange={(e) => setDisclaimerRead(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition">
                I have read and understand the disclaimers above. I understand that
                recommendations are informational only. <span className="text-red-400">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={dataConsent}
                onChange={(e) => setDataConsent(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition">
                I consent to processing my career data to generate personalized recommendations. <span className="text-red-400">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={anonymizedConsent}
                onChange={(e) => setAnonymizedConsent(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition">
                I consent to anonymized data being used to improve the product (optional).
              </span>
            </label>
          </div>

          <button
            onClick={handleProceed}
            disabled={!canProceed}
            className={`w-full py-4 rounded-xl text-lg font-semibold transition ${
              canProceed
                ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            }`}
          >
            Continue to questionnaire
          </button>

          <p className="text-xs text-slate-500 mt-4 text-center">
            You can withdraw consent and delete your data at any time from your privacy settings.
          </p>
        </div>
      </div>
    </div>
  );
}
