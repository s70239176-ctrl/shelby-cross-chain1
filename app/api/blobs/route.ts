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
  let key = raw.trim();
  key = key.replace(/^ed25519-priv-/i, "");
  key = key.replace(/^0x/i, "");
  key = key.replace(/\s+/g, "");
  if (key.length === 63) key = "0" + key;
  return "0x" + key;
}

async function ensureClayWasm() {
  // The clay-codes SDK locates clay.wasm relative to its own dist/ directory
  // using fileURLToPath(import.meta.url). On Vercel, the function bundle
  // strips .wasm files. We ship clay.wasm in public/ and copy it to the
  // expected node_modules path at runtime before the SDK loads.
  const { readFile, writeFile, mkdir } = await import("fs/promises");
  const { resolve, dirname } = await import("path");
  const { createRequire } = await import("module");

  try {
    // Find where clay-codes is installed
    const req      = createRequire(import.meta.url);
    const clayPkg  = req.resolve("@shelby-protocol/clay-codes/dist/index-node.js");
    const clayDist = dirname(clayPkg);
    const wasmDest = resolve(clayDist, "clay.wasm");

    // Check if it already exists
    try {
      await readFile(wasmDest);
      return; // already there
    } catch { /* not found — copy it */ }

    // Read from public/ (always included by Vercel)
    const wasmSrc = resolve(process.cwd(), "public", "clay.wasm");
    const wasmBytes = await readFile(wasmSrc);
    await mkdir(clayDist, { recursive: true });
    await writeFile(wasmDest, wasmBytes);
    console.log(`[clay-wasm] Copied to ${wasmDest}`);
  } catch (e) {
    console.error("[clay-wasm] Could not copy clay.wasm:", e);
    throw new Error(`clay.wasm setup failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.SHELBY_API_KEY;
    const rawKey = process.env.APTOS_PRIVATE_KEY;
    if (!apiKey) return NextResponse.json({ error: "SHELBY_API_KEY not set in Vercel Environment Variables" }, { status: 500 });
    if (!rawKey) return NextResponse.json({ error: "APTOS_PRIVATE_KEY not set in Vercel Environment Variables" }, { status: 500 });

    const privKey = cleanPrivateKey(rawKey);
    const keyHex  = privKey.replace(/^0x/i, "");
    if (keyHex.length !== 64) {
      return NextResponse.json({
        error: `APTOS_PRIVATE_KEY wrong length: got ${keyHex.length} chars, need 64. Starts with: "${rawKey.slice(0,20)}…"`,
      }, { status: 500 });
    }

    const form       = await req.formData();
    const file       = form.get("file") as File | null;
    const blobName   = (form.get("blobName") as string) || "";
    const ttlSeconds = Number(form.get("ttlSeconds") ?? 604800);
    if (!file)     return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!blobName) return NextResponse.json({ error: "blobName is required" }, { status: 400 });

    // Ensure clay.wasm is in place before SDK loads
    await ensureClayWasm();

    const bytes            = new Uint8Array(await file.arrayBuffer());
    const expirationMicros = Date.now() * 1000 + ttlSeconds * 1_000_000;
    const net              = process.env.SHELBY_NETWORK ?? "shelbynet";

    const { ShelbyNodeClient }                       = await import("@shelby-protocol/sdk/node");
    const { Account, Ed25519PrivateKey, Network }    = await import("@aptos-labs/ts-sdk");

    const client = new ShelbyNodeClient({ network: Network.SHELBYNET, apiKey });
    const account = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(privKey) });

    await client.upload({ blobData: bytes, signer: account, blobName, expirationMicros });

    const ownerAddress = account.accountAddress.toString();
    return NextResponse.json({
      blobId:       `${ownerAddress}/${blobName}`,
      ownerAddress,
      blobName,
      sizeBytes:    String(bytes.byteLength),
      explorerUrl:  `https://explorer.shelby.xyz/${net}/account/${ownerAddress}`,
    });

  } catch (err) {
    console.error("[/api/blobs POST]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
