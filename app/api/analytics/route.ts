import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    stats: { totalBlobs: 0, totalReads: 0, totalEarnedApt: "0.0000", cacheHitRate: 0, activeBlobs: 0, networks: ["aptos","solana","near","base"] },
    blobs: [], timeSeries: [],
  });
}
