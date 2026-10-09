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
      attachment?: {
        name: string;
        size?: number;
        mimeType?: string;
        base64Data?: string;
        url?: string;
      };
    };


    if (!text && !url && !image && !attachment) {
      return NextResponse.json(
        { error: "Please provide a message text, a suspicious link, a screenshot, or an email attachment to scan" },
        { status: 400 }
      );
    }

    let finalAttachment = attachment;

    if (attachment?.url && !attachment.base64Data) {
      try {
        const { fetchRemoteAttachment } = await import("@/lib/server/ai");
        const fetched = await fetchRemoteAttachment(attachment.url);
        finalAttachment = {
          name: attachment.name || fetched.name,
          size: fetched.size,
          mimeType: fetched.mimeType,
          base64Data: fetched.base64Data,
          url: attachment.url,
        };
      } catch (fetchErr) {
        console.warn("[api:analyze] Remote attachment fetch error, proceeding with metadata and Gemma 4:", fetchErr);
        finalAttachment = {
          name: attachment.name || "remote_attachment.bin",
          size: 0,
          mimeType: "application/octet-stream",
          url: attachment.url,
        };
      }
    }

    const result = await analyzeScam({
      text: text?.trim(),
      url: url?.trim() || finalAttachment?.url,
      image,
      attachment: finalAttachment,
    });

    const preview = finalAttachment
      ? `Attachment: ${finalAttachment.name}${finalAttachment.size ? ` (${(finalAttachment.size / 1024).toFixed(1)} KB)` : " (No-Download Cloud Scan)"}`
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
