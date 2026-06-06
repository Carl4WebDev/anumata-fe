import { useState, useCallback, useMemo } from "react";
import { QuestionSetsContext } from "./QuestionSetsContext";

let nextId = 6;

const INITIAL_SETS = [
  {
    id: 1,
    name: "Family Concerns",
    description: "Questions focused on family dynamics, expectations, and household relationships.",
    questions: [
      "Can you describe your relationship with your family?",
      "Is there a specific family situation that has been causing you stress?",
      "How do you usually handle conflicts at home?",
      "Do you feel supported by your family?",
      "Is there anything about your family life you wish was different?",
      "How does your family situation affect your daily mood?",
    ],
  },
  {
    id: 2,
    name: "Romantic Relationship",
    description: "Questions about romantic partners, breakups, trust, and emotional connection.",
    questions: [
      "Are you currently in a romantic relationship?",
      "Can you tell me about a recent situation with your partner?",
      "How do you feel about the level of trust in your relationship?",
      "Is there a specific event that triggered how you feel right now?",
      "Do you feel emotionally supported by your partner?",
      "What would you change about your relationship if you could?",
    ],
  },
  {
    id: 3,
    name: "Academic Stress",
    description: "Questions about school pressure, performance anxiety, and academic expectations.",
    questions: [
      "How do you feel about your academic performance right now?",
      "Is there a specific subject or situation at school causing you stress?",
      "Do you feel pressure from your family or peers about your grades?",
      "How do you usually cope when school feels overwhelming?",
      "Have you lost motivation for things you used to enjoy at school?",
      "Do you feel like you have enough support with your studies?",
    ],
  },
  {
    id: 4,
    name: "Self Worth",
    description: "Questions about self-esteem, identity, confidence, and self-acceptance.",
    questions: [
      "How would you describe how you feel about yourself lately?",
      "Is there a specific experience that affected your self-confidence?",
      "Do you compare yourself to others often?",
      "What are some things you like about yourself?",
      "Have you been feeling like you are not good enough?",
      "How do you react when someone compliments or criticizes you?",
    ],
  },
  {
    id: 5,
    name: "Anxiety",
    description: "Questions about worry, nervousness, panic, and anxious thought patterns.",
    questions: [
      "How often do you feel nervous or anxious?",
      "Can you describe a situation that makes you feel particularly anxious?",
      "What physical sensations do you experience when you feel anxious?",
      "Do you have trouble sleeping because of worry?",
      "Are there things you avoid because they make you anxious?",
      "What do you usually do when you start feeling anxious?",
    ],
  },
];

export const QuestionSetsProvider = ({ children }: { children: React.ReactNode }) => {
  const [questionSets, setQuestionSets] = useState(INITIAL_SETS);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const clearError = useCallback(() => {}, []);

  const addQuestionSet = useCallback((data: { name: string; description: string; questions: string[] }) => {
    const newSet = {
      id: nextId++,
      name: data.name,
      description: data.description,
      questions: data.questions,
    };
    setQuestionSets((prev) => [...prev, newSet]);
    return { ok: true, data: newSet };
  }, []);

  const updateQuestionSet = useCallback((id: number, data: { name: string; description: string; questions: string[] }) => {
    setQuestionSets((prev) =>
      prev.map((qs) => (qs.id === id ? { ...qs, ...data } : qs))
    );
  }, []);

  const removeQuestionSet = useCallback((id: number) => {
    setQuestionSets((prev) => prev.filter((qs) => qs.id !== id));
  }, []);

  const value = useMemo(
    () => ({ questionSets, loading, error, clearError, addQuestionSet, updateQuestionSet, removeQuestionSet }),
    [questionSets, loading, error, clearError, addQuestionSet, updateQuestionSet, removeQuestionSet],
  );

  return <QuestionSetsContext.Provider value={value}>{children}</QuestionSetsContext.Provider>;
};
