import { useContext } from "react";
import { InterviewLinksContext } from "./InterviewLinksContext";

export const useInterviewLinks = () => {
  const ctx = useContext(InterviewLinksContext);
  if (!ctx) {
    throw new Error("useInterviewLinks must be used inside InterviewLinksProvider");
  }
  return ctx;
};
