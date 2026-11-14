import { httpClient } from "./httpClient";
import type { QuestionLanguage } from "./translateApi";

/** "reviewed": checked by a person · "draft": prepared, not yet reviewed · "machine": made by the AI during an interview. */
export type TranslationSource = "reviewed" | "draft" | "machine";

export interface SavedTranslation {
  text: string;
  source: TranslationSource;
  /** The therapist's own version (otherwise shared by everyone). */
  own: boolean;
}

export interface QuestionTranslations {
  source_text: string;
  kind: "question" | "follow_up";
  tl: SavedTranslation | null;
  ceb: SavedTranslation | null;
}

export const translationsApi = {
  forQuestionSet(setId: number) {
    return httpClient.get<QuestionTranslations[]>(`/api/translations/question-sets/${setId}`);
  },

  /** Save the therapist's translation; an empty text removes their own version. */
  save(setId: number, sourceText: string, lang: QuestionLanguage, translatedText: string) {
    return httpClient.put<QuestionTranslations[]>(`/api/translations/question-sets/${setId}`, {
      source_text: sourceText,
      lang,
      translated_text: translatedText,
    });
  },
};
