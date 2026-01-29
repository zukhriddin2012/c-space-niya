import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/permissions';
import {
  createTransactionsBatch,
  createImportBatch,
  getServiceMappings,
  getExpenseMappings,
  findOrCreateCustomer,
} from '@/lib/db';
import ExcelJS from 'exceljs';

// Payment method normalization
const PAYMENT_METHOD_MAP: Record<string, string> = {
  'cash': 'cash',
  'Cash': 'cash',
  'CASH': 'cash',
  'naqd': 'cash',
  'Naqd': 'cash',
  'bank': 'bank',
  'Bank': 'bank',
  'BANK': 'bank',
  'payme': 'payme',
  'Payme': 'payme',
  'PAYME': 'payme',
  'click': 'click',
  'Click': 'click',
  'CLICK': 'click',
  'uzum': 'uzum',
  'Uzum': 'uzum',
  'UZUM': 'uzum',
  'terminal': 'terminal',
  'Terminal': 'terminal',
  'TERMINAL': 'terminal',
  'Card': 'terminal',
  'card': 'terminal',
};

// Parse date from various formats
function parseDate(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'string') {
    // Try ISO format first
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // Try DD.MM.YYYY format
    const dotMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (dotMatch) {
      return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
    }

    // Try to parse as date
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }

  if (typeof value === 'number') {
    // Excel date serial number
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  return null;
}

// Parse amount
function parseAmount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

// Normalize service type
function normalizeServiceType(value: unknown, mappings: { service_name: string; service_name_variants?: string[] }[]): string {
  if (!value) return 'Other';
  const str = String(value).trim();

  for (const mapping of mappings) {
    if (mapping.service_name.toLowerCase() === str.toLowerCase()) {
      return mapping.service_name;
    }
    if (mapping.service_name_variants) {
      for (const variant of mapping.service_name_variants) {
        if (variant.toLowerCase() === str.toLowerCase()) {
          return mapping.service_name;
        }
      }
    }
  }

  return str;
}

// Normalize payment method
function normalizePaymentMethod(value: unknown): string {
  if (!value || value === 0) return 'cash';
  const str = String(value).trim();
  return PAYMENT_METHOD_MAP[str] || 'cash';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission (accountant, hr, ceo, super_admin)
    if (!hasPermission(user.role, 'branches:edit')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const branchId = formData.get('branchId') as string;
    const importType = formData.get('importType') as string || 'revenue'; // 'revenue' or 'expense'

    if (!file || !branchId) {
      return NextResponse.json(
        { error: 'File and branchId are required' },
        { status: 400 }
      );
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Get first sheet (or Sales sheet if exists)
    let worksheet = workbook.getWorksheet('Sales') || workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json(
        { error: 'No worksheet found in file' },
        { status: 400 }
      );
    }

    // Get mappings
    const serviceMappings = await getServiceMappings();
    const expenseMappings = await getExpenseMappings();

    // Detect column mapping from first row
    const headerRow = worksheet.getRow(1);
    const columnMap: Record<string, number> = {};

    headerRow.eachCell((cell, colNumber) => {
      const value = String(cell.value || '').toLowerCase().trim();

      // Date column
      if (value.includes('date') || value === 'sana' || value === 'дата') {
        columnMap.date = colNumber;
      }
      // Customer/Name column
      if (value.includes('name') || value === 'ism' || value === 'имя' || value === 'company') {
        columnMap.customer = colNumber;
      }
      // Service type column
      if (value.includes('servis') || value.includes('service') || value.includes('type') || value === 'услуга') {
        columnMap.serviceType = colNumber;
      }
      // Amount column
      if (value.includes('to\'lov') || value.includes('amount') || value.includes('payment') ||
          value.includes('summa') || value.includes('сумма') || value === 'rent' || value === 'paid') {
        columnMap.amount = colNumber;
      }
      // Payment method column
      if (value.includes('payment method') || value.includes('usul') || value.includes('метод')) {
        columnMap.paymentMethod = colNumber;
      }
      // Agent column
      if (value.includes('agent') || value.includes('сотрудник')) {
        columnMap.agent = colNumber;
      }
      // Category (for expenses)
      if (value.includes('category') || value.includes('type') || value === 'тип') {
        columnMap.category = colNumber;
      }
      // Subject/Description (for expenses)
      if (value.includes('subject') || value.includes('description') || value === 'описание') {
        columnMap.subject = colNumber;
      }
    });

    // Validate required columns
    if (!columnMap.amount) {
      return NextResponse.json(
        { error: 'Could not find amount column in the file' },
        { status: 400 }
      );
    }

    // Process rows
    const transactions: Parameters<typeof createTransactionsBatch>[0] = [];
    const errors: { row: number; message: string }[] = [];
    const seenKeys = new Set<string>(); // For duplicate detection

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      try {
        const dateValue = columnMap.date ? row.getCell(columnMap.date).value : null;
        const date = parseDate(dateValue);

        const amount = parseAmount(
          columnMap.amount ? row.getCell(columnMap.amount).value : 0
        );

        // Skip rows with no amount or zero amount
        if (amount <= 0) return;

        const customerName = columnMap.customer
          ? String(row.getCell(columnMap.customer).value || '').trim()
          : '';

        const serviceType = columnMap.serviceType
          ? normalizeServiceType(row.getCell(columnMap.serviceType).value, serviceMappings)
          : (importType === 'revenue' ? 'Other' : undefined);

        const paymentMethod = columnMap.paymentMethod
          ? normalizePaymentMethod(row.getCell(columnMap.paymentMethod).value)
          : 'cash';

        const expenseCategory = columnMap.category
          ? normalizeServiceType(row.getCell(columnMap.category).value, expenseMappings)
          : (columnMap.subject
              ? normalizeServiceType(row.getCell(columnMap.subject).value, expenseMappings)
              : undefined);

        // Create unique key for duplicate detection
        const uniqueKey = `${date}-${amount}-${customerName}-${serviceType}-${paymentMethod}`;
        if (seenKeys.has(uniqueKey)) {
          return; // Skip duplicate
        }
        seenKeys.add(uniqueKey);

        const transaction = {
          branch_id: branchId,
          transaction_type: importType as 'revenue' | 'expense',
          transaction_date: date || new Date().toISOString().split('T')[0],
          amount,
          service_type: importType === 'revenue' ? serviceType : undefined,
          customer_name: customerName || undefined,
          expense_category: importType === 'expense' ? expenseCategory : undefined,
          vendor_name: importType === 'expense' ? customerName : undefined,
          payment_method: paymentMethod as 'cash' | 'bank' | 'payme' | 'click' | 'uzum' | 'terminal',
          processed_by: user.id,
          imported_from: 'excel',
          approval_status: 'approved' as const,
        };

        transactions.push(transaction);
      } catch (err) {
        errors.push({
          row: rowNumber,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    });

    if (transactions.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid transactions found in file',
          details: errors.slice(0, 10),
        },
        { status: 400 }
      );
    }

    // Insert transactions
    const result = await createTransactionsBatch(transactions);

    // Create import batch record
    await createImportBatch({
      branch_id: branchId,
      file_name: file.name,
      file_type: importType,
      row_count: transactions.length + errors.length,
      success_count: result.count,
      error_count: errors.length + (transactions.length - result.count),
      errors: errors.length > 0 ? errors : undefined,
      imported_by: user.id,
    });

    return NextResponse.json({
      success: true,
      imported: result.count,
      skipped: transactions.length - result.count,
      errors: errors.length,
      errorDetails: errors.slice(0, 10),
      columnMapping: columnMap,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}

// GET - Check import status / get import history
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    if (!branchId) {
      return NextResponse.json(
        { error: 'branchId is required' },
        { status: 400 }
      );
    }

    const { getImportBatches } = await import('@/lib/db');
    const batches = await getImportBatches(branchId);

    return NextResponse.json({ batches });
  } catch (error) {
    console.error('Error fetching import history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import history' },
      { status: 500 }
    );
  }
}
