import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getLegalRequests,
  getLegalRequestStats,
} from '@/lib/db/legal-requests';
import type {
  LegalRequestFilters,
  LegalRequestType,
  LegalRequestStatus,
} from '@/modules/legal/types';
import type { User } from '@/types';

// ============================================
// GET /api/legal/requests
// Legal team dashboard: list all legal requests across all branches
// ============================================
export const GET = withAuth(async (
  request: NextRequest,
  context: { user: User }
) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '20')));

    // Parse filters (no branch restriction for legal team)
    const statusParam = searchParams.get('status');
    const status = statusParam
      ? (statusParam.split(',').filter(Boolean) as LegalRequestStatus[])
      : undefined;

    const requestTypeParam = searchParams.get('requestType');
    const requestType = requestTypeParam
      ? (requestTypeParam.split(',').filter(Boolean) as LegalRequestType[])
      : undefined;

    const assignedTo = searchParams.get('assignedTo') || undefined;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // Build filters
    const filters: LegalRequestFilters & { page: number; pageSize: number } = {
      status,
      requestType,
      assignedTo,
      search,
      dateFrom,
      dateTo,
      page,
      pageSize,
    };

    // Get legal requests
    const listResult = await getLegalRequests(filters);

    // Get statistics
    const stats = await getLegalRequestStats();

    return NextResponse.json({
      data: listResult.data,
      pagination: listResult.pagination,
      stats,
    });
  } catch (error) {
    console.error('Error in GET /api/legal/requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { permission: PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL });
