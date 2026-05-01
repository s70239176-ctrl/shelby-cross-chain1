// lib/shelby.ts — pure fetch(), zero npm dependencies
// Node.js 20 has fetch built-in; no SDK needed.

const SHELBY_RPC  = process.env.SHELBY_RPC_URL        ?? "https://api.shelbynet.shelby.xyz/shelby";
const FULLNODE    = process.env.APTOS_FULLNODE_URL     ?? "https://api.shelbynet.shelby.xyz/v1";
const SHELBY_KEY  = process.env.SHELBY_API_KEY         ?? "";
const MODULE_ADDR = process.env.HOTLINK_MODULE_ADDRESS ?? "";

export interface BlobMeta {
  blobId: string; blobName: string; owner: string; sizeBytes: number;
  expirationMicros: string; pricePerReadOctas: string;
  accessMode: string; totalReads: number; commitmentHash: string;
}
export interface UploadResult {
  blobId: string; transactionHash: string; commitmentHash: string;
  sizeBytes: number; explorerUrl: string;
}
export interface ReadResult {
  data: Uint8Array; latencyMs: number; cacheHit: boolean;
  proof: { blobId: string; rpcNodePublicKey: string; signature: string; timestampMicros: string };
}

function shelbyHeaders(): Record<string, string> {
  return {
    "Authorization": `Bearer ${SHELBY_KEY}`,
    "X-API-Key":     SHELBY_KEY,
  };
}

export async function uploadBlob(
  blobData: Uint8Array,
  blobName: string,
  expirationMicros: number,
): Promise<UploadResult> {
  if (!SHELBY_KEY) throw new Error("SHELBY_API_KEY not configured");
  const res = await fetch(`${SHELBY_RPC}/v1/blobs`, {
    method: "POST",
    headers: {
      ...shelbyHeaders(),
      "Content-Type":        "application/octet-stream",
      "X-Blob-Name":         blobName,
      "X-Expiration-Micros": String(expirationMicros),
    },
    body: blobData,
  });
  if (!res.ok) throw new Error(`Shelby upload ${res.status}: ${await res.text().catch(() => "")}`);
  const j = await res.json() as Record<string, unknown>;
  const blobId = String(j.blob_id ?? j.blobId ?? "");
  const net = process.env.SHELBY_NETWORK ?? "shelbynet";
  return {
    blobId,
    transactionHash: String(j.transaction_hash ?? j.transactionHash ?? ""),
    commitmentHash:  String(j.commitment_hash  ?? blobId),
    sizeBytes:       blobData.byteLength,
    explorerUrl:     `https://explorer.shelby.xyz/${net}/blob/${blobId}`,
  };
}

export async function readBlob(blobId: string): Promise<ReadResult> {
  if (!SHELBY_KEY) throw new Error("SHELBY_API_KEY not configured");
  const t0  = Date.now();
  const res = await fetch(`${SHELBY_RPC}/v1/blobs/${encodeURIComponent(blobId)}`, {
    headers: shelbyHeaders(),
  });
  if (!res.ok) throw new Error(`Shelby read ${res.status}: ${await res.text().catch(() => "")}`);
  return {
    data:      new Uint8Array(await res.arrayBuffer()),
    latencyMs: Date.now() - t0,
    cacheHit:  res.headers.get("x-shelby-cache") === "HIT",
    proof: {
      blobId,
      rpcNodePublicKey: res.headers.get("x-shelby-node-key")  ?? "",
      signature:        res.headers.get("x-shelby-signature") ?? "",
      timestampMicros:  String(Date.now() * 1000),
    },
  };
}

export async function getBlobMeta(blobId: string): Promise<BlobMeta> {
  if (!MODULE_ADDR) throw new Error("HOTLINK_MODULE_ADDRESS not configured");
  const res = await fetch(`${FULLNODE}/view`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      function:       `${MODULE_ADDR}::hotlink_metadata::get_blob_metadata`,
      type_arguments: [],
      arguments:      [blobId],
    }),
  });
  if (!res.ok) throw new Error(`Aptos view ${res.status}: ${await res.text().catch(() => "")}`);
  const [d] = (await res.json()) as [Record<string, unknown>];
  return {
    blobId:            String(d.blob_id            ?? blobId),
    blobName:          String(d.blob_name          ?? ""),
    owner:             String(d.owner              ?? ""),
    sizeBytes:         Number(d.size_bytes         ?? 0),
    expirationMicros:  String(d.expiration_micros  ?? "0"),
    pricePerReadOctas: String(d.price_per_read_octas ?? "0"),
    accessMode:        String(d.access_mode        ?? "public"),
    totalReads:        Number(d.total_reads        ?? 0),
    commitmentHash:    String(d.commitment_hash    ?? ""),
  };
}
