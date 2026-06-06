import { useState, useCallback, useMemo } from "react";
import { SessionsContext } from "./SessionsContext";

const HARDCODED_SESSIONS = [
  {
    id: 1,
    patientId: 1,
    patientName: "John Doe",
    templateName: "Family Concerns",
    date: "Apr 26, 2026",
    duration: "08:34",
    riskLevel: "Moderate",
    indicators: ["Sadness", "Mild anxiety"],
    emotions: { sad: 45, happy: 25, angry: 18, neutral: 12 },
    spikes: [
      { questionIndex: 1, label: "Emotional spike detected", emotion: "sad", intensity: 78 },
      { questionIndex: 3, label: "Elevated stress indicators", emotion: "angry", intensity: 62 },
    ],
    responses: [
      { question: "Can you describe your relationship with your family?", answer: "It's been really hard lately. My parents expect a lot from me and I feel like I can never meet their expectations. I just feel tired all the time.", emotion: "sad", emotionPct: 72 },
      { question: "Is there a specific family situation that has been causing you stress?", answer: "My dad lost his job a few months ago and things have been tense at home. Everyone is on edge and I try not to add more stress but it's hard.", emotion: "sad", emotionPct: 78 },
      { question: "How do you usually handle conflicts at home?", answer: "I usually just stay quiet and keep to myself. I don't want to make things worse. Sometimes I go out just to get away from it all.", emotion: "neutral", emotionPct: 45 },
      { question: "Do you feel supported by your family?", answer: "Sometimes. My mom tries but she has her own problems. I feel like I'm dealing with everything alone most of the time.", emotion: "sad", emotionPct: 68 },
      { question: "Is there anything about your family life you wish was different?", answer: "I wish we could talk openly about how we feel without it turning into an argument. I wish my dad would stop blaming himself.", emotion: "angry", emotionPct: 55 },
      { question: "How does your family situation affect your daily mood?", answer: "It makes me feel heavy. Like there's always something weighing on my mind. I find it hard to focus at school and I've been sleeping a lot more than usual.", emotion: "sad", emotionPct: 70 },
    ],
    notes: "",
  },
  {
    id: 2,
    patientId: 1,
    patientName: "John Doe",
    templateName: "Self Worth",
    date: "Apr 18, 2026",
    duration: "07:12",
    riskLevel: "High",
    indicators: ["Sadness", "Low self-esteem", "Anxiety"],
    emotions: { sad: 52, happy: 15, angry: 20, neutral: 13 },
    spikes: [
      { questionIndex: 0, label: "Strong negative response", emotion: "sad", intensity: 82 },
      { questionIndex: 4, label: "Emotional spike — self-criticism", emotion: "sad", intensity: 85 },
    ],
    responses: [
      { question: "How would you describe how you feel about yourself lately?", answer: "Honestly? I don't feel good about myself at all. I feel like I'm not doing enough, not good enough for anyone.", emotion: "sad", emotionPct: 82 },
      { question: "Is there a specific experience that affected your self-confidence?", answer: "I failed an exam last month and my dad said he was disappointed. That really stuck with me. I keep hearing it in my head.", emotion: "sad", emotionPct: 75 },
      { question: "Do you compare yourself to others often?", answer: "All the time. My classmates seem to have everything figured out and I'm just... struggling to keep up.", emotion: "neutral", emotionPct: 40 },
      { question: "What are some things you like about yourself?", answer: "I... I don't know. I used to be good at drawing but I haven't done it in a while. I guess I'm good at helping others when they need it.", emotion: "neutral", emotionPct: 35 },
      { question: "Have you been feeling like you are not good enough?", answer: "Yeah, almost every day. It's like no matter what I do, it's never enough. I feel like I'm letting everyone down.", emotion: "sad", emotionPct: 85 },
      { question: "How do you react when someone compliments or criticizes you?", answer: "Compliments feel fake to me. Like they're just being nice. But criticism... criticism feels like confirmation that I really am not good enough.", emotion: "sad", emotionPct: 70 },
    ],
    notes: "Follow up on self-esteem issues. Consider referral to school counselor. Check on family dynamics during next session.",
  },
  {
    id: 3,
    patientId: 1,
    patientName: "John Doe",
    templateName: "Academic Stress",
    date: "Apr 11, 2026",
    duration: "06:48",
    riskLevel: "Moderate",
    indicators: ["Anxiety", "Academic pressure"],
    emotions: { sad: 35, happy: 30, angry: 15, neutral: 20 },
    spikes: [
      { questionIndex: 2, label: "Pressure-related spike", emotion: "angry", intensity: 65 },
    ],
    responses: [
      { question: "How do you feel about your academic performance right now?", answer: "It's okay. I used to be really good but this semester has been tough. I'm barely passing some subjects.", emotion: "sad", emotionPct: 58 },
      { question: "Is there a specific subject or situation at school causing you stress?", answer: "Math. I used to love it but now I just dread it. The teacher goes too fast and I'm afraid to ask questions.", emotion: "neutral", emotionPct: 42 },
      { question: "Do you feel pressure from your family or peers about your grades?", answer: "Yes, definitely. My parents always compare me to my cousins. 'Look at your cousin, she's always on the honor roll.' It makes me feel terrible.", emotion: "angry", emotionPct: 65 },
      { question: "How do you usually cope when school feels overwhelming?", answer: "I listen to music or watch videos. Sometimes I just sleep. I know it's not the best way but it helps me forget for a while.", emotion: "neutral", emotionPct: 38 },
      { question: "Have you lost motivation for things you used to enjoy at school?", answer: "A little. I used to join art competitions but I stopped this year. I just don't feel like doing anything anymore.", emotion: "sad", emotionPct: 55 },
      { question: "Do you feel like you have enough support with your studies?", answer: "Not really. My parents can't help me with my schoolwork and my friends are busy with their own problems.", emotion: "sad", emotionPct: 50 },
    ],
    notes: "",
  },
];

export const SessionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState(HARDCODED_SESSIONS);

  const getSessionById = useCallback((id: number) => {
    return sessions.find((s) => s.id === id) ?? null;
  }, [sessions]);

  const updateNotes = useCallback((sessionId: number, notes: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, notes } : s))
    );
  }, []);

  const value = useMemo(
    () => ({ sessions, getSessionById, updateNotes }),
    [sessions, getSessionById, updateNotes],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
};
