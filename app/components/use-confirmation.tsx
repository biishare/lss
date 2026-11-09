"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Confirmation } from "./task-surface";

type Question = { title: string; message: string; confirmLabel: string };

export function useConfirmation() {
  const [question, setQuestion] = useState<Question | null>(null);
  const resolve = useRef<((answer: boolean) => void) | null>(null);
  useEffect(() => () => { resolve.current?.(false); resolve.current = null; }, []);
  const requestConfirmation = useCallback((next: Question) => new Promise<boolean>((done) => {
    if (resolve.current) { done(false); return; }
    resolve.current = done;
    setQuestion(next);
  }), []);
  function answer(value: boolean) {
    const done = resolve.current;
    resolve.current = null;
    setQuestion(null);
    done?.(value);
  }
  return {
    requestConfirmation,
    confirmation: question && <Confirmation title={question.title} confirmLabel={question.confirmLabel}
      onClose={() => answer(false)} onConfirm={() => answer(true)}><p className="text-sm leading-6">{question.message}</p></Confirmation>,
  };
}
