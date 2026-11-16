"use client";

import { authenticateDemoSession } from "../features/demo/demo-auth";
import { EntryForm } from "./entry-form";

export function DemoEntry({ onEnter, schoolName, logoText }: {
  onEnter(accountId: string): void;
  schoolName?: string;
  logoText?: string;
}) {
  return <EntryForm schoolName={schoolName} logoText={logoText} enter={async (username, password) => {
    const session = await authenticateDemoSession(username, password);
    if (!session) return "Utilizador ou palavra-passe incorrectos.";
    onEnter(session.account.id);
  }} />;
}
