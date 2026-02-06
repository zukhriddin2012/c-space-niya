import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getMaintenanceIssues, createMaintenanceIssue } from '@/lib/db/maintenance-issues';
import type { MaintenanceIssueFilters } from '@/modules/maintenance/types';
import { validateBranchAccess, validateOperatorSession, parsePagination, escapeIlike, MAX_LENGTH, validateRequiredEnum } from '@/lib/security';
import type { User } from '@/types';

// ============================================
// GET /api/reception/maintenance-issues
// List maintenance issues with filters and pagination
// ============================================
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // M-02: Safe pagination
    const { page, pageSize } = parsePagination(
      searchParams.get('page'),
      searchParams.get('pageSize')
    );

    // H-02: Validate branch access
    const branchAccess = validateBranchAccess(
      user,
      searchParams.get('branchId'),
      PERMISSIONS.MAINTENANCE_VIEW_ALL
    );
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }

    // C-05 + H-04: Escape search
    const rawSearch = searchParams.get('search');
    const search = rawSearch ? escapeIlike(rawSearch.slice(0, MAX_LENGTH.SEARCH_QUERY)) : undefined;

    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Parse comma-separated filter arrays
    const statusParam = searchParams.get('status');
    const status = statusParam ? statusParam.split(',').filter(Boolean) : undefined;

    const categoryParam = searchParams.get('category');
    const category = categoryParam ? categoryParam.split(',').filter(Boolean) : undefined;

    const urgencyParam = searchParams.get('urgency');
    const urgency = urgencyParam ? urgencyParam.split(',').filter(Boolean) : undefined;

    // Build filters object
    const filters: MaintenanceIssueFilters = {
      status: (status as any) || undefined,
      category: (category as any) || undefined,
      urgency: (urgency as any) || undefined,
      branchId: branchAccess.branchId || undefined,
      search: search || undefined,
    };

    // Get maintenance issues
    const result = await getMaintenanceIssues(filters, page, pageSize);

    return NextResponse.json({
      data: result.data,
      pagination: {
        total: result.pagination.total,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalPages: result.pagination.pageCount,
      },
      urgencyCounts: result.urgencyCounts,
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_MAINTENANCE_VIEW });

// ============================================
// POST /api/reception/maintenance-issues
// Report a new maintenance issue
// ============================================
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();

    // H-03: Validate enums
    const VALID_CATEGORIES = ['hvac', 'plumbing', 'electrical', 'furniture', 'cleaning', 'building', 'it_network', 'safety', 'other'] as const;
    const VALID_URGENCIES = ['critical', 'high', 'medium', 'low'] as const;

    const categoryCheck = validateRequiredEnum(body.category, VALID_CATEGORIES, 'category');
    if (categoryCheck.error) {
      return NextResponse.json({ error: categoryCheck.error }, { status: 400 });
    }

    const urgencyCheck = validateRequiredEnum(body.urgency, VALID_URGENCIES, 'urgency');
    if (urgencyCheck.error) {
      return NextResponse.json({ error: urgencyCheck.error }, { status: 400 });
    }

    // H-04: Validate string lengths
    const errors: string[] = [];
    if (!body.locationDescription?.trim()) errors.push('Location description is required');
    else if (body.locationDescription.length > MAX_LENGTH.LOCATION) errors.push(`Location description exceeds ${MAX_LENGTH.LOCATION} characters`);
    if (!body.description?.trim()) errors.push('Description is required');
    else if (body.description.length > MAX_LENGTH.DESCRIPTION) errors.push(`Description exceeds ${MAX_LENGTH.DESCRIPTION} characters`);

    // H-02: Validate branch access
    const branchAccess = validateBranchAccess(user, body.branchId?.trim());
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    if (!branchAccess.branchId) {
      return NextResponse.json(
        { error: 'Branch ID is required for reporting maintenance issues' },
        { status: 400 }
      );
    }
    const validatedBranchId = branchAccess.branchId;

    // C-01: Validate operator session before trusting X-Operator-Id
    const rawOperatorId = request.headers.get('X-Operator-Id') || undefined;
    const operatorValidation = await validateOperatorSession(
      rawOperatorId,
      user.id,
      validatedBranchId
    );
    if (!operatorValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid operator session' },
        { status: 403 }
      );
    }

    // Create the maintenance issue
    const result = await createMaintenanceIssue(
      {
        category: body.category.trim(),
        urgency: body.urgency.trim(),
        branchId: validatedBranchId,
        locationDescription: body.locationDescription.trim(),
        description: body.description.trim(),
      },
      user.id,
      operatorValidation.operatorId || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create maintenance issue' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_MAINTENANCE_REPORT });
