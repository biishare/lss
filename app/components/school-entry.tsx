import { CentralEntry } from "../features/central/entry";
import { readSchoolSession } from "../features/central/session";
import { demoMode } from "../features/central/upstream";

export async function SchoolEntry({ expired = false }: { expired?: boolean }) {
  if (demoMode()) {
    const { WorkspaceEntry } = await import("./workspace-entry");
    return <WorkspaceEntry />;
  }

  const session = await readSchoolSession();
  const notice = session.kind === "refused" ? "Use uma conta da Secretaria ou do Director."
    : session.kind === "unavailable" ? "A sessão não pôde ser verificada. Tente novamente."
    : expired || session.kind === "expired" ? "A sessão expirou. Entre novamente." : undefined;
  if (session.kind === "school") return <CentralEntry actor={session.actor} />;
  return <CentralEntry notice={notice} />;
}
