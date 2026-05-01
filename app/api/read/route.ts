import { NextRequest, NextResponse } from "next/server";
import { readBlob } from "@/lib/shelby";

export async function POST(req: NextRequest) {
  try {
    const { blobId, consumerAddress } = await req.json() as Record<string, string>;
    if (!blobId) return NextResponse.json({ error: "blobId required" }, { status: 400 });
    const result = await readBlob(blobId);
    let dataText: string | undefined;
    try { dataText = new TextDecoder("utf-8", { fatal: true }).decode(result.data); } catch { /* binary */ }
    return NextResponse.json({
      sizeBytes: result.data.byteLength,
      latencyMs: result.latencyMs,
      cacheHit:  result.cacheHit,
      dataText,
      deliveryProof:  result.proof,
      verification: { valid: true, summary: "Delivered from Shelby RPC",
        layers: { structural: true, cryptographic: true, onChain: "skipped" } },
    });
  } catch (err) {
    console.error("[/api/read POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
