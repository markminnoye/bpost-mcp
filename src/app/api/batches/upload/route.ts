import { NextRequest, NextResponse } from "next/server"
import { saveBatchState } from "@/lib/kv/client"
import { resolveRequestAuth, type AuthPolicy } from "@/lib/auth/resolve-request-auth"
import { ingestCsv } from "@/lib/batch/ingest-csv"

const uploadAuthPolicy: AuthPolicy = {
  allowBearer: true,
  allowSession: true,
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await resolveRequestAuth(req, uploadAuthPolicy)
    if (!authResult.success) {
      const status = authResult.error.status
      const messages: Record<typeof authResult.error.reason, string> = {
        missing_auth: 'No authentication provided. Supply a valid Bearer token or sign in first.',
        invalid_bearer: 'The provided Bearer token is invalid or expired.',
        invalid_session: 'Your session has expired. Please sign in again.',
        missing_tenant: 'Your account is not linked to a BPost tenant. Please configure your credentials first.',
      }
      const message = messages[authResult.error.reason] ?? 'Authentication failed.'
      return NextResponse.json({ error: message }, { status })
    }
    const tenantId = authResult.context.tenantId

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No 'file' field found in form data" }, { status: 400 })
    }

    const fileText = await file.text()
    const result = ingestCsv(fileText, file.name, tenantId)

    if (!result.ok) {
      const statusMap: Record<string, number> = {
        unsupported_format: 400,
        parse_error: 400,
        empty_file: 400,
        too_many_rows: 413,
      }
      const httpStatus = statusMap[result.error.kind] ?? 400
      return NextResponse.json({ error: result.error.message }, { status: httpStatus })
    }

    await saveBatchState(result.state)

    return NextResponse.json({
      success: true,
      message: "Batch successfully uploaded and parsed into memory.",
      batchId: result.state.batchId,
      status: result.state.status,
      totalRows: result.state.rows.length,
      nextStep: "Use the get_raw_headers MCP tool to retrieve the columns, and apply_mapping_rules to transform the payload to BPost schemas.",
    }, { status: 201 })

  } catch (error: unknown) {
    console.error("[UPLOAD_BATCH]", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
