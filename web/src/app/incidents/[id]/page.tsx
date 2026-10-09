import React from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { IncidentSpectator } from "@/components/incident-spectator";

export default async function IncidentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="flex-1 w-full max-w-[1600px] mx-auto">
        <IncidentSpectator incidentId={id} />
      </main>
      <Footer />
    </div>
  );
}
