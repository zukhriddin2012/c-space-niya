import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  getLegalRequests,
  createLegalRequest,
} from '@/lib/db/legal-requests';
import { validateBranchAccess, validateOperatorSession, parsePagination, escapeIlike, MAX_LENGTH } from '@/lib/security';
import { validateLegalMetadata } from '@/modules/legal/validators';
import type {
  LegalRequestFilters,
  LegalRequestType,
  CreateLegalRequestInput,
  LegalRequestStatus,
} from '@/modules/legal/types';
import type { User } from '@/types';

// ============================================
// GET /api/reception/legal-requests
// List legal requests for a branch (reception view)
// ============================================
export const GET = withAuth(async (
  request: NextRequest,
  context: { user: User }
) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // H-02: Validate branch access — non-admin users can only see their own branch
    const branchAccess = validateBranchAccess(
      context.user,
      searchParams.get('branchId') || request.headers.get('X-Branch-Id'),
      PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL
    );
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }

    // M-02: Safe pagination parsing
    const { page, pageSize } = parsePagination(
      searchParams.get('page'),
      searchParams.get('pageSize')
    );

    // Parse filters
    const statusParam = searchParams.get('status');
    const status = statusParam
      ? (statusParam.split(',').filter(Boolean) as LegalRequestStatus[])
      : undefined;

    const requestTypeParam = searchParams.get('requestType');
    const requestType = requestTypeParam
      ? (requestTypeParam.split(',').filter(Boolean) as LegalRequestType[])
      : undefined;

    // C-05 + H-04: Escape and validate search
    const rawSearch = searchParams.get('search') || undefined;
    const search = rawSearch
      ? escapeIlike(rawSearch.slice(0, MAX_LENGTH.SEARCH_QUERY))
      : undefined;

    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // Build filters
    const filters: LegalRequestFilters & { page: number; pageSize: number } = {
      branchId: branchAccess.branchId || undefined,
      status,
      requestType,
      search,
      dateFrom,
      dateTo,
      page,
      pageSize,
    };

    // Call database function
    const result = await getLegalRequests(filters);

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error in GET /api/reception/legal-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { permission: PERMISSIONS.RECEPTION_LEGAL_VIEW });

// ============================================
// POST /api/reception/legal-requests
// Submit a new legal request
// ============================================
export const POST = withAuth(async (
  request: NextRequest,
  context: { user: User }
) => {
  try {
    const body = await request.json();
    const {
      requestType,
      branchId,
      metadata,
    } = body as {
      requestType?: unknown;
      branchId?: unknown;
      metadata?: unknown;
    };

    // Validation: requestType
    const VALID_REQUEST_TYPES: LegalRequestType[] = [
      'contract_preparation',
      'supplementary_agreement',
      'contract_termination',
      'website_registration',
      'guarantee_letter',
    ];

    if (!requestType || !VALID_REQUEST_TYPES.includes(requestType as LegalRequestType)) {
      return NextResponse.json(
        {
          error: 'Invalid or missing requestType',
          validTypes: VALID_REQUEST_TYPES,
        },
        { status: 400 }
      );
    }

    // H-02: Validate branch access
    const branchAccess = validateBranchAccess(context.user, branchId as string);
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }
    if (!branchAccess.branchId) {
      return NextResponse.json(
        { error: 'Branch ID is required for creating legal requests' },
        { status: 400 }
      );
    }
    const validatedBranchId = branchAccess.branchId;

    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json(
        { error: 'metadata is required and must be an object' },
        { status: 400 }
      );
    }

    // C-04: Strict metadata validation via Zod schemas
    const metadataValidation = validateLegalMetadata(
      requestType as LegalRequestType,
      metadata
    );

    if (!metadataValidation.success) {
      return NextResponse.json(
        { error: 'Invalid metadata', details: metadataValidation.errors },
        { status: 400 }
      );
    }

    // C-01: Validate operator session before trusting X-Operator-Id
    const rawOperatorId = request.headers.get('X-Operator-Id') || undefined;
    const operatorValidation = await validateOperatorSession(
      rawOperatorId,
      context.user.id,
      validatedBranchId
    );
    if (!operatorValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid operator session' },
        { status: 403 }
      );
    }

    // Create the request
    const input: CreateLegalRequestInput = {
      requestType: requestType as LegalRequestType,
      branchId: validatedBranchId,
      metadata: metadataValidation.data as any,
    };

    const result = await createLegalRequest(input, context.user.id, operatorValidation.operatorId || undefined);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create legal request' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { data: result.data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/reception/legal-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { permission: PERMISSIONS.RECEPTION_LEGAL_SUBMIT });
