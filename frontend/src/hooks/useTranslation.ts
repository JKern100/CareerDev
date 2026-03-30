"use client";

import { useState, useEffect, useCallback } from "react";

// Import all translation packs statically
import en from "@/translations/en.json";
import uk from "@/translations/uk.json";
import es from "@/translations/es.json";
import arEG from "@/translations/ar-EG.json";

export type LangCode = "en" | "uk" | "es" | "ar";

interface TranslationMeta {
  language: string;
  label: string;
  dir?: "ltr" | "rtl";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationPack = { _meta: TranslationMeta; [key: string]: any };

const PACKS: Record<LangCode, TranslationPack> = {
  en: en as TranslationPack,
  uk: uk as TranslationPack,
  es: es as TranslationPack,
  ar: arEG as TranslationPack,
};

export const LANGUAGES: { code: LangCode; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "EN" },
  { code: "uk", label: "Українська", flag: "UA" },
  { code: "es", label: "Español", flag: "ES" },
  { code: "ar", label: "العربية", flag: "AR" },
];

const STORAGE_KEY = "app_lang";

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function useTranslation() {
  const [lang, setLangState] = useState<LangCode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
      if (stored && PACKS[stored]) return stored;
    }
    return "en";
  });

  const pack = PACKS[lang] || PACKS.en;
  const dir = pack._meta?.dir || "ltr";

  // Apply dir attribute to html element
  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [dir, lang]);

  const setLang = useCallback((newLang: LangCode) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    // Also keep the old key in sync for questionnaire backward compat
    localStorage.setItem("questionnaire_lang", newLang);
  }, []);

  /**
   * Translate a key like "ui.next" or "pages.dashboard.greeting".
   * Falls back to English, then to the key itself.
   * Supports simple interpolation: t("ui.step_of", { n: "3", total: "8" })
   */
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(pack as Record<string, unknown>, key);
      if (value === undefined) {
        // Fallback to English
        value = getNestedValue(PACKS.en as Record<string, unknown>, key);
      }
      if (value === undefined) return key;

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return value;
    },
    [pack]
  );

  /**
   * Get question translation (prompt, options, help_text).
   * Returns undefined if no translation exists for this question.
   */
  const getQuestionTranslation = useCallback(
    (questionId: string) => {
      const questions = pack.questions as Record<string, {
        prompt?: string;
        options?: Record<string, string>;
        help_text?: string;
      }> | undefined;
      return questions?.[questionId];
    },
    [pack]
  );

  return { lang, setLang, t, dir, pack, getQuestionTranslation };
}
