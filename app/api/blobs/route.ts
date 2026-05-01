import { NextRequest, NextResponse } from "next/server";
import { getAptosAccount, getShelbyClient, getBlobMeta } from "@/lib/shelby";

export async function GET(req: NextRequest) {
  const blobId = req.nextUrl.searchParams.get("blobId");
  try {
    if (blobId) return NextResponse.json({ blob: await getBlobMeta(blobId) });
    return NextResponse.json({ blobs: [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = getAptosAccount();
    const client  = getShelbyClient();
    const form    = await req.formData();
    const file    = form.get("file") as File | null;
    const blobName   = (form.get("blobName") as string) || "";
    const ttlSeconds = Number(form.get("ttlSeconds") ?? 604800);
    if (!file)     return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!blobName) return NextResponse.json({ error: "No blobName" }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const expirationMicros = Date.now() * 1000 + ttlSeconds * 1_000_000;
    const result = await client.upload({ blobData: bytes, signer: account, blobName, expirationMicros });
    const net    = process.env.SHELBY_NETWORK ?? "shelbynet";
    return NextResponse.json({ ...result, sizeBytes: bytes.byteLength, explorerUrl: `https://explorer.shelby.xyz/${net}/blob/${result.blobId}` });
  } catch (err) {
    console.error("[/api/blobs]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
