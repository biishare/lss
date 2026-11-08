import type { ReactNode } from "react";
import { SchoolAdminDemo } from "../components/school-admin-demo";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <><SchoolAdminDemo />{children}</>;
}
