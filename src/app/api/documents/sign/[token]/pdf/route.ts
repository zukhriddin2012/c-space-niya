import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

interface DocumentData {
  id: string;
  candidate_id: string;
  document_type: string;
  candidate_name: string;
  position: string;
  branch_name: string;
  branch_address: string;
  reporting_to: string;
  screening_passed: boolean;
  interview1_passed: boolean;
  interview2_passed: boolean;
  contract_type: string;
  contract_duration: string;
  start_date: string;
  salary: string;
  salary_review: string;
  probation_duration: string;
  probation_start_date: string;
  probation_end_date: string;
  working_hours: string;
  probation_salary: string;
  probation_metrics: { metric: string; expected_result: string }[];
  final_interview_date: string;
  final_interview_time: string;
  final_interview_interviewer: string;
  final_interview_purpose: string;
  onboarding_weeks: { week: number; title: string; date_range: string; items: string[] }[];
  contacts: { name: string; position: string; responsibility: string }[];
  escalation_contact: string;
  escalation_contact_position: string;
  representative_name: string;
  representative_position: string;
  // Recruiter signature
  recruiter_signed_at: string;
  recruiter_signed_by: string;
  recruiter_signed_by_position: string;
  recruiter_signature_data: string;
  recruiter_signature_type: string;
  // Candidate signature
  signed_at: string;
  signature_data: string;
  signature_type: string;
  created_at: string;
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Не указано';
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// GET - Generate PDF for signed document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Fetch document with all fields
    const { data: doc, error } = await supabaseAdmin!
      .from('candidate_documents')
      .select('*')
      .eq('signing_token', token)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document is signed
    if (!doc.signed_at) {
      return NextResponse.json({ error: 'Document has not been signed yet' }, { status: 400 });
    }

    const document: DocumentData = {
      id: doc.id,
      candidate_id: doc.candidate_id,
      document_type: doc.document_type || 'Условия трудоустройства',
      candidate_name: doc.candidate_name || 'Unknown',
      position: doc.position || '',
      branch_name: doc.branch_name || '',
      branch_address: doc.branch_address || '',
      reporting_to: doc.reporting_to || '',
      screening_passed: doc.screening_passed ?? true,
      interview1_passed: doc.interview1_passed ?? true,
      interview2_passed: doc.interview2_passed ?? false,
      contract_type: doc.contract_type || '',
      contract_duration: doc.contract_duration || '',
      start_date: doc.start_date || '',
      salary: doc.salary || '',
      salary_review: doc.salary_review || '',
      probation_duration: doc.probation_duration || '',
      probation_start_date: doc.probation_start_date || '',
      probation_end_date: doc.probation_end_date || '',
      working_hours: doc.working_hours || '',
      probation_salary: doc.probation_salary || '',
      probation_metrics: doc.probation_metrics || [],
      final_interview_date: doc.final_interview_date || '',
      final_interview_time: doc.final_interview_time || '',
      final_interview_interviewer: doc.final_interview_interviewer || '',
      final_interview_purpose: doc.final_interview_purpose || '',
      onboarding_weeks: doc.onboarding_weeks || [],
      contacts: doc.contacts || [],
      escalation_contact: doc.escalation_contact || '',
      escalation_contact_position: doc.escalation_contact_position || '',
      representative_name: doc.representative_name || '',
      representative_position: doc.representative_position || '',
      // Recruiter signature
      recruiter_signed_at: doc.recruiter_signed_at || '',
      recruiter_signed_by: doc.recruiter_signed_by || '',
      recruiter_signed_by_position: doc.recruiter_signed_by_position || '',
      recruiter_signature_data: doc.recruiter_signature_data || '',
      recruiter_signature_type: doc.recruiter_signature_type || 'typed',
      // Candidate signature
      signed_at: doc.signed_at,
      signature_data: doc.signature_data || '',
      signature_type: doc.signature_type || 'typed',
      created_at: doc.created_at,
    };

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Fetch and embed a font that supports Cyrillic
    // Using Google Fonts Roboto which supports Cyrillic
    const fontUrl = 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf';
    const fontBoldUrl = 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf';

    let font;
    let fontBold;

    try {
      const fontResponse = await fetch(fontUrl);
      const fontBoldResponse = await fetch(fontBoldUrl);

      if (fontResponse.ok && fontBoldResponse.ok) {
        const fontBytes = await fontResponse.arrayBuffer();
        const fontBoldBytes = await fontBoldResponse.arrayBuffer();
        font = await pdfDoc.embedFont(fontBytes);
        fontBold = await pdfDoc.embedFont(fontBoldBytes);
      } else {
        throw new Error('Failed to fetch fonts');
      }
    } catch (e) {
      // Fallback to standard font (won't support Cyrillic properly)
      console.error('Failed to load Cyrillic font, using fallback:', e);
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // Brand color
    const brandColor = rgb(100 / 255, 23 / 255, 124 / 255); // #64177C
    const grayColor = rgb(100 / 255, 100 / 255, 100 / 255);
    const greenColor = rgb(34 / 255, 197 / 255, 94 / 255);
    const redColor = rgb(239 / 255, 68 / 255, 68 / 255);
    const lightGray = rgb(245 / 255, 245 / 255, 245 / 255);

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Helper function to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (y - requiredHeight < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    };

    // Helper to draw text with word wrapping
    const drawText = (text: string, x: number, yPos: number, options: { font?: typeof font; size?: number; color?: typeof brandColor; maxWidth?: number } = {}) => {
      const usedFont = options.font || font;
      const size = options.size || 10;
      const color = options.color || rgb(0, 0, 0);
      const maxWidth = options.maxWidth || contentWidth;

      // Simple word wrapping
      const words = text.split(' ');
      let line = '';
      let currentY = yPos;

      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const testWidth = usedFont.widthOfTextAtSize(testLine, size);

        if (testWidth > maxWidth && line) {
          checkPageBreak(size + 4);
          page.drawText(line, { x, y: currentY, size, font: usedFont, color });
          currentY -= size + 4;
          line = word;
        } else {
          line = testLine;
        }
      }

      if (line) {
        checkPageBreak(size + 4);
        page.drawText(line, { x, y: currentY, size, font: usedFont, color });
        currentY -= size + 4;
      }

      return currentY;
    };

    // === HEADER ===
    page.drawRectangle({
      x: 0,
      y: pageHeight - 100,
      width: pageWidth,
      height: 100,
      color: brandColor,
    });

    page.drawText('Условия трудоустройства', {
      x: margin,
      y: pageHeight - 30,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    page.drawText('УСЛОВИЯ ТРУДОУСТРОЙСТВА', {
      x: margin,
      y: pageHeight - 50,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`Должность: ${document.position}`, {
      x: margin,
      y: pageHeight - 70,
      size: 12,
      font,
      color: rgb(1, 1, 1),
    });

    if (document.branch_name) {
      page.drawText(`Филиал ${document.branch_name}`, {
        x: margin,
        y: pageHeight - 85,
        size: 10,
        font,
        color: rgb(1, 1, 1),
      });
    }

    y = pageHeight - 120;

    // === SECTION 1: Candidate Info ===
    page.drawText('1. Информация о кандидате', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: brandColor,
    });
    y -= 20;

    const candidateInfo = [
      ['ФИО:', document.candidate_name],
      ['Должность:', document.position],
      ['Филиал:', document.branch_name],
      ['Подчинение:', document.reporting_to],
    ];

    for (const [label, value] of candidateInfo) {
      page.drawText(label, { x: margin, y, size: 10, font: fontBold, color: grayColor });
      page.drawText(value || '-', { x: margin + 100, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= 16;
    }
    y -= 10;

    // === SECTION 2: Selection Results ===
    checkPageBreak(80);
    page.drawText('2. Результаты отбора', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: brandColor,
    });
    y -= 20;

    const selectionResults = [
      ['Скрининг', document.screening_passed],
      ['Интервью 1', document.interview1_passed],
    ];

    if (document.interview2_passed) {
      selectionResults.push(['Интервью 2', true]);
    }

    for (const [stage, passed] of selectionResults) {
      page.drawText(stage as string, { x: margin, y, size: 10, font, color: rgb(0, 0, 0) });
      page.drawText(passed ? 'ПРОЙДЕН' : 'НЕ ПРОЙДЕН', {
        x: margin + 120,
        y,
        size: 10,
        font: fontBold,
        color: passed ? greenColor : redColor,
      });
      y -= 16;
    }
    y -= 10;

    // === SECTION 3: Employment Terms ===
    checkPageBreak(100);
    page.drawText('3. Условия трудоустройства', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: brandColor,
    });
    y -= 16;

    const isProbation = document.document_type === 'probation_term_sheet';
    page.drawText(isProbation ? 'Испытательный срок' : 'Полная занятость (при успешном прохождении)', {
      x: margin,
      y,
      size: 10,
      font,
      color: grayColor,
    });
    y -= 20;

    let employmentTerms: [string, string][];
    if (isProbation) {
      employmentTerms = [
        ['Продолжительность:', document.probation_duration],
        ['Дата начала:', formatDate(document.probation_start_date)],
        ['Дата окончания:', formatDate(document.probation_end_date)],
        ['Рабочие часы:', document.working_hours],
        ['Зарплата (испыт. срок):', document.probation_salary],
      ];
    } else {
      employmentTerms = [
        ['Тип договора:', document.contract_type],
        ['Дата вступления в силу:', formatDate(document.start_date)],
        ['Ежемесячная зарплата:', `${document.salary} сум (на руки)`],
        ['Пересмотр зарплаты:', document.salary_review],
      ];
    }

    for (const [label, value] of employmentTerms) {
      page.drawText(label, { x: margin, y, size: 10, font: fontBold, color: grayColor });
      const isHighlight = label.includes('Зарплата') || label.includes('зарплата');
      page.drawText(value || '-', {
        x: margin + 140,
        y,
        size: 10,
        font: isHighlight ? fontBold : font,
        color: isHighlight ? brandColor : rgb(0, 0, 0),
      });
      y -= 16;
    }
    y -= 10;

    // === SECTION 4: Probation Metrics ===
    if (document.probation_metrics && document.probation_metrics.length > 0) {
      checkPageBreak(60 + document.probation_metrics.length * 20);
      page.drawText('4. Критерии оценки испытательного срока', {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: brandColor,
      });
      y -= 20;

      // Table header
      page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 20, color: lightGray });
      page.drawText('Метрика', { x: margin + 5, y: y + 2, size: 10, font: fontBold, color: brandColor });
      page.drawText('Ожидаемый результат', { x: margin + 250, y: y + 2, size: 10, font: fontBold, color: brandColor });
      y -= 25;

      for (const metric of document.probation_metrics) {
        checkPageBreak(20);
        y = drawText(metric.metric, margin + 5, y, { size: 9, maxWidth: 230 });
        const metricY = y + 14; // Align with first line
        drawText(metric.expected_result, margin + 250, metricY, { size: 9, maxWidth: 230 });
        y -= 5;
      }
      y -= 10;
    }

    // === SECTION 5: Final Interview ===
    if (document.final_interview_date) {
      checkPageBreak(80);
      page.drawText('5. Финальное интервью и утверждение', {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: brandColor,
      });
      y -= 20;

      page.drawRectangle({ x: margin, y: y - 55, width: contentWidth, height: 70, color: rgb(245 / 255, 240 / 255, 250 / 255) });

      page.drawText('ДЕТАЛИ ФИНАЛЬНОГО ИНТЕРВЬЮ', { x: margin + 10, y: y - 5, size: 11, font: fontBold, color: brandColor });
      y -= 20;

      page.drawText(`Дата: ${formatDate(document.final_interview_date)}`, { x: margin + 10, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= 14;
      page.drawText(`Время: ${document.final_interview_time}`, { x: margin + 10, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= 14;
      page.drawText(`Интервьюер: ${document.final_interview_interviewer}`, { x: margin + 10, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= 14;
      page.drawText(`Цель: ${document.final_interview_purpose}`, { x: margin + 10, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= 25;
    }

    // === SECTION 6: Onboarding ===
    if (document.onboarding_weeks && document.onboarding_weeks.length > 0) {
      checkPageBreak(40);
      page.drawText(`6. Обзор адаптации (филиал ${document.branch_name})`, {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: brandColor,
      });
      y -= 20;

      for (const week of document.onboarding_weeks) {
        checkPageBreak(30 + week.items.length * 14);
        page.drawText(`${week.title} (${week.date_range})`, { x: margin, y, size: 11, font: fontBold, color: rgb(0, 0, 0) });
        y -= 16;

        for (let i = 0; i < week.items.length; i++) {
          checkPageBreak(14);
          y = drawText(`${i + 1}. ${week.items[i]}`, margin + 10, y, { size: 9, maxWidth: contentWidth - 20 });
        }
        y -= 10;
      }
    }

    // === SECTION 7: Contacts ===
    if (document.contacts && document.contacts.length > 0) {
      checkPageBreak(60 + document.contacts.length * 18);
      page.drawText('7. Контактные лица', {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: brandColor,
      });
      y -= 20;

      // Table header
      page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 20, color: lightGray });
      page.drawText('Имя', { x: margin + 5, y: y + 2, size: 10, font: fontBold, color: brandColor });
      page.drawText('Должность', { x: margin + 140, y: y + 2, size: 10, font: fontBold, color: brandColor });
      page.drawText('Зона ответственности', { x: margin + 300, y: y + 2, size: 10, font: fontBold, color: brandColor });
      y -= 25;

      for (const contact of document.contacts) {
        checkPageBreak(16);
        page.drawText(contact.name, { x: margin + 5, y, size: 9, font, color: rgb(0, 0, 0) });
        page.drawText(contact.position, { x: margin + 140, y, size: 9, font, color: brandColor });
        page.drawText(contact.responsibility, { x: margin + 300, y, size: 9, font, color: rgb(0, 0, 0) });
        y -= 16;
      }

      // Escalation contact
      if (document.escalation_contact) {
        y -= 5;
        checkPageBreak(30);
        page.drawRectangle({ x: margin, y: y - 15, width: contentWidth, height: 30, color: rgb(254 / 255, 249 / 255, 195 / 255) });
        page.drawText('ЭСКАЛАЦИЯ ВОПРОСОВ', { x: margin + 5, y: y - 2, size: 10, font: fontBold, color: rgb(161 / 255, 98 / 255, 7 / 255) });
        page.drawText(`${document.escalation_contact} (${document.escalation_contact_position})`, { x: margin + 5, y: y - 14, size: 9, font, color: rgb(161 / 255, 98 / 255, 7 / 255) });
        y -= 30;
      }
      y -= 10;
    }

    // === SECTION 8: Signatures ===
    checkPageBreak(120);
    page.drawText('8. Подтверждение и подписи', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: brandColor,
    });
    y -= 16;

    page.drawText('Подписывая ниже, обе стороны подтверждают и соглашаются с условиями, изложенными в данном документе.', {
      x: margin,
      y,
      size: 9,
      font,
      color: grayColor,
    });
    y -= 25;

    // Signature boxes
    const boxWidth = (contentWidth - 20) / 2;
    const boxHeight = 80;

    // Candidate signature box
    page.drawRectangle({ x: margin, y: y - boxHeight, width: boxWidth, height: boxHeight, color: lightGray, borderColor: rgb(200 / 255, 200 / 255, 200 / 255), borderWidth: 1 });

    page.drawText('КАНДИДАТ', { x: margin + 10, y: y - 15, size: 11, font: fontBold, color: brandColor });
    page.drawText(`ФИО: ${document.candidate_name}`, { x: margin + 10, y: y - 30, size: 9, font, color: rgb(0, 0, 0) });
    page.drawText('Подпись:', { x: margin + 10, y: y - 45, size: 9, font, color: rgb(0, 0, 0) });

    // Add signature
    if (document.signature_type === 'draw' && document.signature_data && document.signature_data.startsWith('data:image')) {
      try {
        const base64Data = document.signature_data.split(',')[1];
        const signatureImage = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
        const signatureDims = signatureImage.scale(0.3);
        page.drawImage(signatureImage, {
          x: margin + 60,
          y: y - 65,
          width: Math.min(signatureDims.width, 80),
          height: Math.min(signatureDims.height, 30),
        });
      } catch (e) {
        console.error('Error embedding signature image:', e);
        page.drawText('[Подпись]', { x: margin + 60, y: y - 50, size: 10, font, color: rgb(0, 0, 0) });
      }
    } else if (document.signature_type === 'typed' && document.signature_data) {
      try {
        const sigData = JSON.parse(document.signature_data);
        page.drawText(sigData.name, { x: margin + 60, y: y - 50, size: 12, font: fontBold, color: rgb(0, 0, 0) });
      } catch (e) {
        page.drawText('[Подпись]', { x: margin + 60, y: y - 50, size: 10, font, color: rgb(0, 0, 0) });
      }
    }

    page.drawText(`Дата: ${formatDate(document.signed_at)}`, { x: margin + 10, y: y - 72, size: 9, font, color: rgb(0, 0, 0) });

    // Representative signature box (with recruiter signature)
    const repBoxX = margin + boxWidth + 20;
    page.drawRectangle({ x: repBoxX, y: y - boxHeight, width: boxWidth, height: boxHeight, color: lightGray, borderColor: rgb(200 / 255, 200 / 255, 200 / 255), borderWidth: 1 });

    page.drawText('ПРЕДСТАВИТЕЛЬ C-SPACE', { x: repBoxX + 10, y: y - 15, size: 11, font: fontBold, color: brandColor });
    page.drawText(`ФИО: ${document.recruiter_signed_by || document.representative_name || '_________________'}`, { x: repBoxX + 10, y: y - 30, size: 9, font, color: rgb(0, 0, 0) });

    // Add recruiter signature
    page.drawText('Подпись:', { x: repBoxX + 10, y: y - 45, size: 9, font, color: rgb(0, 0, 0) });

    if (document.recruiter_signature_type === 'draw' && document.recruiter_signature_data && document.recruiter_signature_data.startsWith('data:image')) {
      try {
        const base64Data = document.recruiter_signature_data.split(',')[1];
        const signatureImage = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
        const signatureDims = signatureImage.scale(0.3);
        page.drawImage(signatureImage, {
          x: repBoxX + 50,
          y: y - 65,
          width: Math.min(signatureDims.width, 80),
          height: Math.min(signatureDims.height, 30),
        });
      } catch (e) {
        console.error('Error embedding recruiter signature image:', e);
        page.drawText('[Подпись]', { x: repBoxX + 50, y: y - 50, size: 10, font, color: rgb(0, 0, 0) });
      }
    } else if (document.recruiter_signature_type === 'typed' && document.recruiter_signature_data) {
      try {
        const sigData = JSON.parse(document.recruiter_signature_data);
        page.drawText(sigData.name, { x: repBoxX + 50, y: y - 50, size: 12, font: fontBold, color: rgb(0, 0, 0) });
      } catch (e) {
        page.drawText(document.recruiter_signed_by || '[Подпись]', { x: repBoxX + 50, y: y - 50, size: 10, font, color: rgb(0, 0, 0) });
      }
    } else if (document.recruiter_signed_by) {
      page.drawText(document.recruiter_signed_by, { x: repBoxX + 50, y: y - 50, size: 10, font, color: rgb(0, 0, 0) });
    }

    page.drawText(`Дата: ${document.recruiter_signed_at ? formatDate(document.recruiter_signed_at) : '_________________'}`, { x: repBoxX + 10, y: y - 72, size: 9, font, color: rgb(0, 0, 0) });

    y -= boxHeight + 20;

    // === FOOTER ===
    checkPageBreak(40);
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(200 / 255, 200 / 255, 200 / 255) });
    y -= 15;

    page.drawText('Right People. Right Place.', { x: pageWidth / 2 - 50, y, size: 10, font, color: grayColor });
    y -= 12;

    if (document.branch_address) {
      page.drawText(`${document.branch_name} | ${document.branch_address}`, { x: pageWidth / 2 - 100, y, size: 8, font, color: grayColor });
      y -= 10;
    }

    page.drawText('Конфиденциально | C-Space Coworking', { x: pageWidth / 2 - 70, y, size: 8, font, color: grayColor });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF response
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="term-sheet-${document.candidate_name.replace(/\s+/g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
