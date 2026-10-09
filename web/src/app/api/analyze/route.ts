import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { analyzeScam } from "@/lib/server/ai";
import { createAnalysis } from "@/lib/server/repo";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const { text, url, image, attachment } = body as {
      text?: string;
      url?: string;
      image?: { mimeType: string; base64Data: string };
      attachment?: { name: string; size: number; mimeType: string; base64Data?: string };
    };

    if (!text && !url && !image && !attachment) {
      return NextResponse.json(
        { error: "Please provide a message text, a suspicious link, a screenshot, or an email attachment to scan" },
        { status: 400 }
      );
    }

    const result = await analyzeScam({
      text: text?.trim(),
      url: url?.trim(),
      image,
      attachment,
    });

    const preview = attachment
      ? `Attachment: ${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)`
      : text || url || (image ? "Uploaded screenshot" : "Threat analysis input");

    const record = await createAnalysis({
      ownerId: user.id,
      inputType: attachment ? "attachment" : image ? "image" : url ? "url" : "text",
      inputPreview: preview,
      hasImage: !!image,
      result,
    });


    return NextResponse.json({
      analysis: record,
      result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
