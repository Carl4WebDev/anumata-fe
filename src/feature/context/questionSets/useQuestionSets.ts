import { useContext } from "react";
import { QuestionSetsContext } from "./QuestionSetsContext";

export const useQuestionSets = () => {
  const ctx = useContext(QuestionSetsContext);
  if (!ctx) {
    throw new Error("useQuestionSets must be used inside QuestionSetsProvider");
  }
  return ctx;
};
