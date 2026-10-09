import React from "react";
import { notFound } from "next/navigation";
import { getTrapBySlug } from "@/lib/server/repo";
import { DecoyClient } from "@/components/decoy-client";

export default async function PublicTrapPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const trap = await getTrapBySlug(slug);

  if (!trap) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F2] text-[#1A1A1A] antialiased">
      <DecoyClient
        slug={slug}
        trapName={trap.name}
        template={trap.template}
        personaName={trap.config.personaName}
        status={trap.status}
        portalBrand={trap.config.portalBrand}
        decoyUsername={trap.config.decoyUsername}
        decoyPassword={trap.config.decoyPassword}
        decoyBalance={trap.config.decoyBalance}
        securityQuestion={trap.config.securityQuestion}
        lureHeadline={trap.config.lureHeadline}
      />
    </div>
  );
}
