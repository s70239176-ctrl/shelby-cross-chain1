import { NextRequest, NextResponse } from "next/server";
import { getBlobMeta } from "@/lib/shelby";

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
    // Validate env vars upfront with clear messages
    const apiKey    = process.env.SHELBY_API_KEY;
    const privKey   = process.env.APTOS_PRIVATE_KEY;
    const fullnode  = process.env.APTOS_FULLNODE_URL ?? "https://api.shelbynet.shelby.xyz/v1";

    if (!apiKey)  return NextResponse.json({ error: "SHELBY_API_KEY not set in Railway Variables" }, { status: 500 });
    if (!privKey) return NextResponse.json({ error: "APTOS_PRIVATE_KEY not set in Railway Variables" }, { status: 500 });

    const form       = await req.formData();
    const file       = form.get("file") as File | null;
    const blobName   = (form.get("blobName") as string) || "";
    const ttlSeconds = Number(form.get("ttlSeconds") ?? 604800);

    if (!file)     return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!blobName) return NextResponse.json({ error: "blobName is required" }, { status: 400 });

    const bytes            = new Uint8Array(await file.arrayBuffer());
    const expirationMicros = Date.now() * 1000 + ttlSeconds * 1_000_000;
    const net              = process.env.SHELBY_NETWORK ?? "shelbynet";

    // Dynamically import the Shelby SDK — avoids bundling issues at build time
    // The SDK handles: session creation, Clay erasure coding, Aptos tx signing
    const { ShelbyNodeClient } = await import("@shelby-protocol/sdk/node");
    const { Account, Ed25519PrivateKey, Network } = await import("@aptos-labs/ts-sdk");

    const client = new ShelbyNodeClient({
      network:     Network.CUSTOM,
      apiKey,
      fullnodeUrl: fullnode,
      shelbyUrl:   process.env.SHELBY_RPC_URL ?? "https://api.shelbynet.shelby.xyz/shelby",
    });

    const account = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(privKey),
    });

    const result = await client.upload({
      blobData:         bytes,
      signer:           account,
      blobName,
      expirationMicros,
    });

    const blobId = result.blobId ?? result.blob_id ?? "";
    return NextResponse.json({
      blobId,
      transactionHash: result.transactionHash ?? result.transaction_hash ?? "",
      commitmentHash:  result.commitmentHash  ?? result.commitment_hash  ?? blobId,
      sizeBytes:       bytes.byteLength,
      explorerUrl:     `https://explorer.shelby.xyz/${net}/blob/${blobId}`,
    });

  } catch (err) {
    console.error("[/api/blobs POST]", err);
    // Surface the real error message — don't swallow it
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
