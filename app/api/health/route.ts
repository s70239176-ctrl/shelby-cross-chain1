import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0,7) ?? "local",
    uptime: Math.floor(process.uptime()),
    config: {
      shelby_api_key:    Boolean(process.env.SHELBY_API_KEY),
      aptos_private_key: Boolean(process.env.APTOS_PRIVATE_KEY),
      module_address:    Boolean(process.env.HOTLINK_MODULE_ADDRESS),
      network:           process.env.SHELBY_NETWORK ?? "shelbynet",
    },
    ts: new Date().toISOString(),
  });
}
