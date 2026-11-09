import type { ReactNode } from "react";
import { WorkspaceEntry } from "../components/workspace-entry";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <><WorkspaceEntry />{children}</>;
}
