import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/oauth/verify-token"
import { saveBatchState, BatchState, BatchRow } from "@/lib/kv/client"
import Papa from "papaparse"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 })
    }

    const authInfo = await verifyToken(req, token)
    if (!authInfo?.extra?.tenantId) {
      return NextResponse.json({ error: "Unauthorized or invalid API token" }, { status: 401 })
    }
    const tenantId = authInfo.extra.tenantId as string

    // 2. Parse FormData
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No 'file' field found in form data" }, { status: 400 })
    }

    // Currently only supporting CSV for MVP simplicity
    // A future upgrade would parse XLSX using xlsx or exceljs
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Currently only .csv files are supported for initial upload." }, { status: 400 })
    }

    // 3. Read and Parse CSV Data
    const fileText = await file.text()
    
    // PapaParse handles CSV string extraction safely
    const parsed = Papa.parse<Record<string, any>>(fileText, {
      header: true,
      skipEmptyLines: true, // Prevents trailing empty lines from breaking indexation
      dynamicTyping: false  // We want everything raw as strings to prevent premature casting errors
    })

    if (parsed.errors.length > 0) {
       return NextResponse.json({ 
         error: "Failed to parse CSV file", 
         details: parsed.errors 
       }, { status: 400 })
    }

    const rawRows = parsed.data
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "The provided CSV file contains no data rows." }, { status: 400 })
    }

    // Hard cap at 1,000 rows to stay within Upstash's 1MB per-key value limit.
    // The full BatchState (raw + mapped data for every row) is serialized into a single Redis key.
    // At ~800 bytes/row average, 1,000 rows approaches the limit safely.
    // Resolution tracked in: https://github.com/markminnoye/bpost-mcp/issues/4
    if (rawRows.length > 1000) {
      return NextResponse.json({ error: "Files exceeding 1,000 rows are not supported in this tier. Please split your file and upload in batches." }, { status: 413 })
    }

    // 4. Extract standard headers from the first parsed row
    const headers = Object.keys(rawRows[0] || {})

    // 5. Construct Initial Batch State
    const batchId = randomUUID()
    
    const rows: BatchRow[] = rawRows.map((rawRow, index) => ({
      index, // Absolute index is critical for deterministic row patching
      raw: rawRow
    }))

    const batchState: BatchState = {
      batchId,
      tenantId,
      status: 'UNMAPPED',
      headers,
      rows,
      createdAt: new Date().toISOString()
    }

    // 6. Save State Securely mapped to Tenant
    await saveBatchState(batchState)

    // 7. Return Instructions to the Agent
    return NextResponse.json({
      success: true,
      message: "Batch successfully uploaded and parsed into memory.",
      batchId: batchId,
      status: batchState.status,
      totalRows: rows.length,
      nextStep: "Use the get_raw_headers MCP tool to retrieve the columns, and apply_mapping_rules to transform the payload to BPost schemas."
    }, { status: 201 })

  } catch (error: any) {
    console.error("[UPLOAD_BATCH]", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
