import { SchoolEntry } from "./components/school-entry";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ sessao?: string }> }) {
  return <SchoolEntry expired={(await searchParams).sessao === "expirada"} />;
}
