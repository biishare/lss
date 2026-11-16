import type { ReactNode } from "react";
import { SchoolEntry } from "../components/school-entry";

export const dynamic = "force-dynamic";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <><SchoolEntry />{children}</>;
}
