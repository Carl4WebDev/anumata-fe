import { useState, useCallback, useEffect, useRef } from "react";

const STORAGE_PREFIX = "anumata:notes";

function getStorageKey(sessionId: string | number, index: number): string {
  return `${STORAGE_PREFIX}:${sessionId}:q${index}`;
}

export function usePerQuestionNotes(sessionId: string | number | undefined) {
  const [notes, setNotes] = useState<Map<number, string>>(new Map());
  const debounceRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Load all notes for this session on mount
  useEffect(() => {
    if (!sessionId) return;

    const loaded = new Map<number, string>();
    for (let i = 0; i < 50; i++) {
      const key = getStorageKey(sessionId, i);
      const value = localStorage.getItem(key);
      if (value !== null) {
        loaded.set(i, value);
      }
    }
    setNotes(loaded);
  }, [sessionId]);

  const updateNote = useCallback(
    (index: number, text: string) => {
      if (!sessionId) return;

      setNotes((prev) => {
        const next = new Map(prev);
        next.set(index, text);
        return next;
      });

      // Debounce localStorage write
      const existing = debounceRef.current.get(index);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        const key = getStorageKey(sessionId, index);
        if (text.trim()) {
          localStorage.setItem(key, text);
        } else {
          localStorage.removeItem(key);
        }
        debounceRef.current.delete(index);
      }, 300);

      debounceRef.current.set(index, timer);
    },
    [sessionId],
  );

  const getNote = useCallback(
    (index: number): string => notes.get(index) ?? "",
    [notes],
  );

  return { notes, updateNote, getNote };
}
