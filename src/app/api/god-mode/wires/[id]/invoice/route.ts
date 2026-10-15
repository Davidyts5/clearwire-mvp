export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { appendAuditLog } from '@/lib/audit-chain';
import { authorizeGodModeRequest, isSchemaUnavailable } from '@/lib/god-mode-api';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const MAX_INVOICE_BYTES = 2 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

type WireInvoiceTarget = {
  id: string;
  company_id: string;
  invoice_path: string | null;
};

function isOwnedInvoicePath(invoicePath: string, companyId: string): boolean {
  const segments = invoicePath.split('/');
  return segments.length >= 2
    && segments[0] === companyId
    && segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function hasValidFileSignature(contentType: string, bytes: Buffer): boolean {
  if (contentType === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  if (contentType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
}

async function getInvoiceTarget(adminClient: any, wireId: string) {
  const { data, error } = await adminClient
    .from('wire_requests')
    .select('id, company_id, invoice_path')
    .eq('id', wireId)
    .maybeSingle();

  return { wire: data as WireInvoiceTarget | null, error };
}

async function appendSupportInvoiceEvent(
  adminClient: any,
  actorId: string,
  companyId: string,
  wireId: string,
  type: string,
  eventPayload: Record<string, unknown>,
) {
  await appendAuditLog(adminClient, {
    companyId,
    wireId,
    actorId,
    action: 'SYSTEM_SUPPORT_INTERVENTION',
    eventPayload: { ...eventPayload, type },
  });
}

function filePathFailure() {
  return NextResponse.json({ error: 'Invoice path is missing or does not belong to this workspace' }, { status: 409 });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { context, response } = await authorizeGodModeRequest();
  if (response) return response;
  if (!context) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!params?.id || !UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'A valid wire ID is required' }, { status: 400 });
  }

  const url = new URL(req.url);
  const isGhostMode = url.searchParams.get('ghostMode') === 'true';
  const { adminClient, actorId, identity } = context;
  const { wire, error: wireError } = await getInvoiceTarget(adminClient, params.id);
  if (wireError) {
    if (isSchemaUnavailable(wireError)) return NextResponse.json({ error: 'Invoice inspection is unavailable until the database schema is updated' }, { status: 503 });
    console.error('God Mode invoice target lookup failed.', wireError);
    return NextResponse.json({ error: 'Unable to load wire invoice metadata' }, { status: 500 });
  }
  if (!wire) return NextResponse.json({ error: 'Wire not found' }, { status: 404 });
  if (!wire.invoice_path || !isOwnedInvoicePath(wire.invoice_path, wire.company_id)) return filePathFailure();

  try {
    if (!isGhostMode) {
      await appendSupportInvoiceEvent(adminClient, actorId, wire.company_id, wire.id, 'QUARANTINED_INVOICE_INSPECTED_BY_SUPPORT', {
        invoice_path: wire.invoice_path,
        signed_url_ttl_seconds: 60,
        actor_email: identity.email,
      });
    }
  } catch (auditError) {
    console.error('Could not log God Mode invoice inspection.', auditError);
    return NextResponse.json({ error: 'Invoice inspection could not be logged' }, { status: 503 });
  }

  const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
    .from('invoices')
    .createSignedUrl(wire.invoice_path, 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error('God Mode invoice signing failed.', signedUrlError);
    return NextResponse.json({ error: 'Could not create a temporary invoice link' }, { status: 404 });
  }

  return NextResponse.json(
    { success: true, auditLogged: !isGhostMode, data: { wireId: wire.id, signedUrl: signedUrlData.signedUrl, expiresInSeconds: 60 } },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { context, response } = await authorizeGodModeRequest();
  if (response) return response;
  if (!context) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!params?.id || !UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'A valid wire ID is required' }, { status: 400 });
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const requestBytes = Number(contentLength);
    if (!Number.isSafeInteger(requestBytes) || requestBytes < 0) {
      return NextResponse.json({ error: 'Invalid request content length' }, { status: 400 });
    }
    if (requestBytes > MAX_INVOICE_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'Invoice request exceeds the 2 MB limit' }, { status: 413 });
    }
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'A multipart form with an invoice file is required' }, { status: 400 });
  }

  const isGhostMode = formData.get('ghostMode') === 'true';
  const fileValue = formData.get('invoice');
  if (!fileValue || typeof fileValue !== 'object' || typeof (fileValue as File).arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'The invoice field must contain a file' }, { status: 400 });
  }
  const invoiceFile = fileValue as File;
  if (!ALLOWED_CONTENT_TYPES.has(invoiceFile.type)) {
    return NextResponse.json({ error: 'Only PDF, JPG, and PNG invoices are allowed' }, { status: 400 });
  }
  if (invoiceFile.size <= 0 || invoiceFile.size > MAX_INVOICE_BYTES) {
    return NextResponse.json({ error: 'Invoice files must be between 1 byte and 2 MB' }, { status: 400 });
  }

  const { adminClient, actorId, identity } = context;
  const { wire, error: wireError } = await getInvoiceTarget(adminClient, params.id);
  if (wireError) {
    if (isSchemaUnavailable(wireError)) return NextResponse.json({ error: 'Invoice replacement is unavailable until the database schema is updated' }, { status: 503 });
    console.error('God Mode invoice target lookup failed.', wireError);
    return NextResponse.json({ error: 'Unable to load wire invoice metadata' }, { status: 500 });
  }
  if (!wire) return NextResponse.json({ error: 'Wire not found' }, { status: 404 });
  if (!wire.invoice_path || !isOwnedInvoicePath(wire.invoice_path, wire.company_id)) return filePathFailure();

  const replacementBytes = Buffer.from(await invoiceFile.arrayBuffer());
  if (!hasValidFileSignature(invoiceFile.type, replacementBytes)) {
    return NextResponse.json({ error: 'Invoice content does not match its declared file type' }, { status: 400 });
  }

  const storage = adminClient.storage.from('invoices');
  const replacementSha256 = createHash('sha256').update(replacementBytes).digest('hex');
  const originalExtension = wire.invoice_path.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
  const archivedOriginalPath = `god-mode-archive/${wire.company_id}/${wire.id}/${Date.now()}-${randomUUID()}.${originalExtension}`;
  const attemptEvent = {
    wire_id: wire.id,
    invoice_path: wire.invoice_path,
    archived_original_path: archivedOriginalPath,
    original_sha256: null,
    replacement_sha256: replacementSha256,
    replacement_content_type: invoiceFile.type,
    replacement_size_bytes: replacementBytes.length,
    actor_email: identity.email,
  };

  let originalBlob: Blob | null = null;
  let downloadError: any = null;
  try {
    const download = await storage.download(wire.invoice_path);
    originalBlob = download.data;
    downloadError = download.error;
  } catch (error) {
    downloadError = { code: 'STORAGE_DOWNLOAD_EXCEPTION', message: error instanceof Error ? error.message : 'Unknown storage error' };
  }
  if (downloadError || !originalBlob) {
    if (!isGhostMode) await appendFailureEvent(adminClient, actorId, wire, identity.email, attemptEvent, 'original_download', downloadError?.code);
    console.error('Could not preserve the existing invoice before replacement.', downloadError);
    return NextResponse.json({ error: 'The existing invoice could not be loaded; no replacement was made' }, { status: 404 });
  }

  let originalBytes: Buffer;
  try {
    originalBytes = Buffer.from(await originalBlob.arrayBuffer());
  } catch (error) {
    if (!isGhostMode) await appendFailureEvent(adminClient, actorId, wire, identity.email, attemptEvent, 'original_read', 'BLOB_READ_FAILED');
    console.error('Could not read the existing invoice before replacement.', error);
    return NextResponse.json({ error: 'The existing invoice could not be preserved; no replacement was made' }, { status: 500 });
  }
  const originalSha256 = createHash('sha256').update(originalBytes).digest('hex');
  const commonEvent = { ...attemptEvent, original_sha256: originalSha256 };

  // Write ahead unless Ghost Mode is active; retain the original file in either mode.
  try {
    if (!isGhostMode) {
      await appendSupportInvoiceEvent(
        adminClient,
        actorId,
        wire.company_id,
        wire.id,
        'QUARANTINED_INVOICE_REPLACEMENT_REQUESTED',
        { ...commonEvent, operation_status: 'requested' },
      );
    }
  } catch (auditError) {
    console.error('Could not log God Mode invoice replacement request.', auditError);
    return NextResponse.json({ error: 'Invoice replacement could not be logged; no file was changed' }, { status: 503 });
  }

  let archiveError: any = null;
  try {
    const archive = await storage.copy(wire.invoice_path, archivedOriginalPath);
    archiveError = archive.error;
  } catch (error) {
    archiveError = { code: 'STORAGE_COPY_EXCEPTION', message: error instanceof Error ? error.message : 'Unknown storage error' };
  }
  if (archiveError) {
    if (!isGhostMode) await appendFailureEvent(adminClient, actorId, wire, identity.email, commonEvent, 'archive', archiveError.code);
    console.error('Could not archive the original invoice.', archiveError);
    return NextResponse.json({ error: 'Original invoice could not be preserved; no replacement was made' }, { status: 500 });
  }

  let uploadError: any = null;
  try {
    const upload = await storage.upload(wire.invoice_path, replacementBytes, {
      upsert: true,
      contentType: invoiceFile.type,
      cacheControl: '0',
    });
    uploadError = upload.error;
  } catch (error) {
    uploadError = { code: 'STORAGE_UPLOAD_EXCEPTION', message: error instanceof Error ? error.message : 'Unknown storage error' };
  }

  if (uploadError) {
    const { error: rollbackError } = await restoreOriginal(
      storage,
      wire.invoice_path,
      originalBytes,
      originalBlob.type || 'application/octet-stream',
    );
    if (!isGhostMode) await appendFailureEvent(
      adminClient,
      actorId,
      wire,
      identity.email,
      { ...commonEvent, rollback_succeeded: !rollbackError },
      'overwrite',
      uploadError.code,
    );
    console.error('Invoice replacement failed; original restoration status:', rollbackError);
    return NextResponse.json({ error: rollbackError ? 'Replacement failed and automatic restoration needs support review' : 'Replacement failed; the original invoice was restored' }, { status: 500 });
  }

  try {
    if (!isGhostMode) {
      await appendSupportInvoiceEvent(
        adminClient,
        actorId,
        wire.company_id,
        wire.id,
        'QUARANTINED_INVOICE_REPLACED_BY_SUPPORT',
        { ...commonEvent, operation_status: 'completed' },
      );
    }
  } catch (auditError) {
    const { error: rollbackError } = await restoreOriginal(
      storage,
      wire.invoice_path,
      originalBytes,
      originalBlob.type || 'application/octet-stream',
    );
    if (!isGhostMode) await appendFailureEvent(
      adminClient,
      actorId,
      wire,
      identity.email,
      { ...commonEvent, rollback_succeeded: !rollbackError },
      'completion_audit',
      'AUDIT_APPEND_FAILED',
    );
    console.error('Invoice replacement completion could not be logged; restoration status:', rollbackError, auditError);
    return NextResponse.json({ error: rollbackError ? 'Completion could not be logged and restoration needs support review' : 'Completion could not be logged; the original invoice was restored' }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    data: {
      wireId: wire.id,
      invoicePathChanged: false,
      originalSha256,
      replacementSha256,
      originalPreserved: true,
      auditLogged: !isGhostMode,
    },
    message: isGhostMode ? 'Ghost Mode active. WORM ledger was bypassed.' : 'Replacement stored at the existing invoice path; the previous file is preserved in restricted support storage and the operation is WORM-audited.',
  });
}

async function restoreOriginal(
  storage: any,
  invoicePath: string,
  originalBytes: Buffer,
  originalContentType: string,
): Promise<{ error: any | null }> {
  try {
    const result = await storage.upload(invoicePath, originalBytes, {
      upsert: true,
      contentType: originalContentType,
      cacheControl: '0',
    });
    return { error: result.error };
  } catch (error) {
    return {
      error: {
        code: 'STORAGE_ROLLBACK_EXCEPTION',
        message: error instanceof Error ? error.message : 'Unknown storage error',
      },
    };
  }
}

async function appendFailureEvent(
  adminClient: any,
  actorId: string,
  wire: WireInvoiceTarget,
  actorEmail: string,
  eventPayload: Record<string, unknown>,
  failureStage: string,
  failureCode?: string,
) {
  try {
    await appendSupportInvoiceEvent(adminClient, actorId, wire.company_id, wire.id, 'QUARANTINED_INVOICE_REPLACEMENT_FAILED', {
      ...eventPayload,
      failure_stage: failureStage,
      failure_code: failureCode ?? 'UNKNOWN',
      actor_email: actorEmail,
    });
  } catch (auditError) {
    // The initial write-ahead event still proves an authorized replacement was attempted.
    console.error('Could not append the invoice replacement failure record.', auditError);
  }
}
