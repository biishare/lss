import { notFound } from "next/navigation";
import { RecoveryEntry } from "../features/central/entry";
import { demoMode } from "../features/central/upstream";

export const metadata = { title: "Activar ou recuperar acesso" };
export const dynamic = "force-dynamic";

export default function Page() {
  if (demoMode()) notFound();
  return <RecoveryEntry />;
}
