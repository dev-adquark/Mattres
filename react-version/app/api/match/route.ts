import { NextResponse } from 'next/server';
import { matchProfile, DEFAULT_SCORE_VERSION } from '@/lib/matchLogic';
import { checkRateLimit } from '@/lib/rateLimit';
import { clientIpFrom, proxyHeadersTrusted } from '@/lib/requestIp';
import { isNoFirmnessPreference, validateProfile } from '@/lib/profileValidation';
import { withoutTrace, type WireMatchResponse } from '@/lib/matchPayload';
import type { MatchProfileInput } from '@/lib/matchLogic';
import type { MatchResponse } from '@/lib/types';

interface ErrorBody {
  error: string;
}

/** A Sleep Profile is a few hundred bytes; anything far larger is refused unparsed. */
const MAX_BODY_BYTES = 8 * 1024;
/** Per-instance ceiling for requests whose IP key is not platform-verified (see lib/requestIp.ts). */
const UNTRUSTED_GLOBAL_LIMIT = 300;

/** Reads at most `limit` bytes of the body; null when it is larger. */
async function readCappedText(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * POST /api/match — validated wrapper around the shared scoring engine.
 *
 * Body: a Sleep Profile (see lib/profileValidation.ts). Optional fields:
 * painFocus ('shoulders'|'hips'|'lower-back'|'whole-body'|'none', or a
 * legacy array), edgeImportance ('low'|'medium'|'high'), scoreVersion
 * ('0.1'|'0.2', default '0.2'), preferredFirmnessLabel (omitted, null or
 * 'none' = no firmness preference, as for the published reference sleeper).
 *
 * The per-result engine `trace` is left out of the response unless the URL
 * has ?trace=1 (see lib/matchPayload.ts).
 */
export async function POST(request: Request): Promise<NextResponse<MatchResponse | WireMatchResponse | ErrorBody>> {
  const clientIp = clientIpFrom(request.headers);
  const rateLimit = await checkRateLimit(clientIp, { limit: 30, windowMs: 60_000 });
  const globalLimit = proxyHeadersTrusted() ? null : await checkRateLimit('match:untrusted-global', { limit: UNTRUSTED_GLOBAL_LIMIT, windowMs: 60_000 });
  if (rateLimit.limited || globalLimit?.limited) {
    return NextResponse.json<ErrorBody>({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const text = await readCappedText(request, MAX_BODY_BYTES);
  if (text === null) return NextResponse.json<ErrorBody>({ error: 'Request body is too large.' }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json<ErrorBody>({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validationError = validateProfile(body);
  if (validationError) return NextResponse.json<ErrorBody>({ error: validationError }, { status: 400 });
  // validateProfile() accepted it, so it is a well-formed Sleep Profile.
  const profile = body as MatchProfileInput;
  // "No preference" reaches the engine as an absent label, exactly like the
  // reference sleeper (components/product/referenceScores.ts).
  if (isNoFirmnessPreference(profile.preferredFirmnessLabel)) delete profile.preferredFirmnessLabel;
  const includeTrace = new URL(request.url).searchParams.get('trace') === '1';

  try {
    const { scoreVersion = DEFAULT_SCORE_VERSION, ...scoringProfile } = profile;
    const payload = await matchProfile(scoringProfile, { scoreVersion });
    return NextResponse.json(includeTrace ? payload : withoutTrace(payload));
  } catch {
    // Avoid returning internal exception details or implementation paths to clients.
    return NextResponse.json<ErrorBody>({ error: 'Scoring is temporarily unavailable. Please try again.' }, { status: 500 });
  }
}
