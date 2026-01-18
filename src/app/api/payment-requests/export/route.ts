import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getPaymentRequests, getPaymentRequestById } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';

interface ExportRow {
  [key: string]: string | number;
}

export const GET = withAuth(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
  const requestId = searchParams.get('requestId');

  try {
    let data: ExportRow[] = [];
    let filename = '';

    if (requestId) {
      // Export single request with all items
      const paymentRequest = await getPaymentRequestById(requestId);
      if (!paymentRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      filename = `payment_request_${paymentRequest.request_type}_${year}_${month}.xlsx`;

      data = (paymentRequest.items || []).map((item) => ({
        'Employee Name': item.employees?.full_name || 'Unknown',
        'Employee ID': item.employees?.employee_id || '',
        'Position': item.employees?.position || '',
        'Legal Entity': item.legal_entities?.name || '',
        'Net Salary': item.net_salary || 0,
        'Amount': item.amount || 0,
        'Type': paymentRequest.request_type === 'advance' ? 'Advance' : 'Wage',
        'Status': paymentRequest.status,
        'Created At': new Date(paymentRequest.created_at).toLocaleDateString(),
      }));
    } else {
      // Export all requests for the month
      const requests = await getPaymentRequests(year, month);
      filename = `payment_requests_${year}_${month}.xlsx`;

      // Create summary rows
      data = requests.map(req => ({
        'Request ID': req.id,
        'Type': req.request_type === 'advance' ? 'Advance' : 'Wage',
        'Employee Count': req.employee_count,
        'Total Amount': req.total_amount,
        'Status': req.status,
        'Created At': new Date(req.created_at).toLocaleDateString(),
        'Submitted At': req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : '',
        'Approved At': req.approved_at ? new Date(req.approved_at).toLocaleDateString() : '',
        'Paid At': req.paid_at ? new Date(req.paid_at).toLocaleDateString() : '',
      }));
    }

    // Create workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payment Requests');

    // Add headers
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Style header row
      worksheet.getRow(1).font = { bold: true };

      // Add data rows
      data.forEach(row => {
        worksheet.addRow(Object.values(row));
      });

      // Auto-size columns
      worksheet.columns.forEach((column, index) => {
        column.width = Math.max(headers[index]?.length || 10, 15);
      });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return as file download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_VIEW_ALL });
