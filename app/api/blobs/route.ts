import { NextRequest, NextResponse } from "next/server";
import { getBlobMeta } from "../../../lib/shelby";

export async function GET(req: NextRequest) {
  const blobId = req.nextUrl.searchParams.get("blobId");
  try {
    if (blobId) return NextResponse.json({ blob: await getBlobMeta(blobId) });
    return NextResponse.json({ blobs: [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function cleanPrivateKey(raw: string): string {
  // Strip any known prefixes and whitespace
  let key = raw.trim();
  key = key.replace(/^ed25519-priv-/i, "");
  key = key.replace(/^0x/i, "");
  key = key.replace(/\s+/g, "");  // remove any spaces/newlines
  // Pad to 64 chars if needed (some tools output 63 chars missing a leading zero)
  if (key.length === 63) key = "0" + key;
  return "0x" + key;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey  = process.env.SHELBY_API_KEY;
    const rawKey  = process.env.APTOS_PRIVATE_KEY;

    if (!apiKey)  return NextResponse.json({ error: "SHELBY_API_KEY not set in Vercel Environment Variables" }, { status: 500 });
    if (!rawKey)  return NextResponse.json({ error: "APTOS_PRIVATE_KEY not set in Vercel Environment Variables" }, { status: 500 });

    const privKey = cleanPrivateKey(rawKey);
    const keyHex  = privKey.replace(/^0x/i, "");

    if (keyHex.length !== 64) {
      return NextResponse.json({
        error: `APTOS_PRIVATE_KEY has wrong length: got ${keyHex.length} hex chars, need 64. Raw value starts with: "${rawKey.slice(0, 20)}…"`,
      }, { status: 500 });
    }
    if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
      return NextResponse.json({
        error: `APTOS_PRIVATE_KEY contains invalid characters. Must be hex only (0-9, a-f). Raw value starts with: "${rawKey.slice(0, 20)}…"`,
      }, { status: 500 });
    }

    const form       = await req.formData();
    const file       = form.get("file") as File | null;
    const blobName   = (form.get("blobName") as string) || "";
    const ttlSeconds = Number(form.get("ttlSeconds") ?? 604800);
    if (!file)     return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!blobName) return NextResponse.json({ error: "blobName is required" }, { status: 400 });

    const bytes            = new Uint8Array(await file.arrayBuffer());
    const expirationMicros = Date.now() * 1000 + ttlSeconds * 1_000_000;
    const net              = process.env.SHELBY_NETWORK ?? "shelbynet";

    const { ShelbyNodeClient } = await import("@shelby-protocol/sdk/node");
    const { Account, Ed25519PrivateKey, Network } = await import("@aptos-labs/ts-sdk");

    const client = new ShelbyNodeClient({
      network: Network.SHELBYNET,
      apiKey,
    });

    const account = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(privKey),
    });

    await client.upload({
      blobData:         bytes,
      signer:           account,
      blobName,
      expirationMicros,
    });

    const ownerAddress = account.accountAddress.toString();
    return NextResponse.json({
      blobId:          `${ownerAddress}/${blobName}`,
      ownerAddress,
      blobName,
      sizeBytes:       String(bytes.byteLength),
      explorerUrl:     `https://explorer.shelby.xyz/${net}/account/${ownerAddress}`,
    });

  } catch (err) {
    console.error("[/api/blobs POST]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
