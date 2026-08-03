import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {};
  results.cwd = process.cwd();

  // Check if /var/task is writable
  try { await fs.writeFile("/var/task/test.txt", "x"); results.varTaskWrite = "ok"; }
  catch(e) { results.varTaskWrite = String(e); }

  // Check if /tmp is writable
  try { await fs.writeFile("/tmp/test.txt", "x"); results.tmpWrite = "ok"; }
  catch(e) { results.tmpWrite = String(e); }

  // Find clay-codes dist dir
  const clayDist = "/var/task/node_modules/@shelby-protocol/clay-codes/dist";
  try { results.clayDist = await fs.readdir(clayDist); }
  catch(e) { results.clayDistErr = String(e); }

  // Check public/clay.wasm
  const publicWasm = path.join(process.cwd(), "public/clay.wasm");
  try { const s = await fs.stat(publicWasm); results.publicWasm = s.size; }
  catch(e) { results.publicWasmErr = String(e); }

  // Try copying from /tmp (write wasm there first)
  try {
    const wasmSrc = path.join(process.cwd(), "public/clay.wasm");
    const wasmBytes = await fs.readFile(wasmSrc);
    await fs.writeFile("/tmp/clay.wasm", wasmBytes);
    results.tmpWasmWrite = "ok";
  } catch(e) { results.tmpWasmWriteErr = String(e); }

  return NextResponse.json(results);
}
