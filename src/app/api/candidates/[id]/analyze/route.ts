import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { User } from '@/types';

const STORAGE_BUCKET = 'employee-documents';

interface AIAnalysisResult {
  summary: string;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  experience: {
    total_years: number;
    companies: {
      name: string;
      role: string;
      duration: string;
      highlights: string[];
    }[];
  };
  education: {
    degree: string;
    institution: string;
    year: string;
    field: string;
  }[];
  role_fit: {
    score: number; // 0-100
    strengths: string[];
    gaps: string[];
    recommendation: string;
  };
  red_flags: string[];
  interview_questions: {
    question: string;
    purpose: string;
  }[];
  company_research: {
    company: string;
    industry: string;
    insights: string;
  }[];
  analyzed_at: string;
}

// Extract text from PDF using pdf-parse
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Import PDFParse class from pdf-parse
    const { PDFParse } = await import('pdf-parse');
    // Create parser with buffer data
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
}

// Analyze resume with Claude API
async function analyzeWithClaude(
  resumeText: string,
  candidateInfo: {
    full_name: string;
    applied_role: string;
    email: string;
    about?: string;
  }
): Promise<AIAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
    throw new Error('Anthropic API key not configured');
  }

  const systemPrompt = `You are an expert HR analyst and recruiter with deep knowledge of various industries.
Your task is to analyze resumes and provide comprehensive insights to help HR teams make informed hiring decisions.

You will:
1. Extract key information (skills, experience, education)
2. Research the companies mentioned to understand the candidate's background
3. Evaluate fit for the applied role
4. Identify any red flags or concerns
5. Generate targeted interview questions

Always be objective, thorough, and provide actionable insights.
Respond ONLY with valid JSON matching the required structure.`;

  const userPrompt = `Analyze this resume for a candidate applying for the "${candidateInfo.applied_role}" position.

CANDIDATE INFO:
- Name: ${candidateInfo.full_name}
- Email: ${candidateInfo.email}
- Applied Role: ${candidateInfo.applied_role}
${candidateInfo.about ? `- About: ${candidateInfo.about}` : ''}

RESUME TEXT:
${resumeText}

Provide a comprehensive analysis in the following JSON structure:
{
  "summary": "2-3 sentence overview of the candidate",
  "skills": {
    "technical": ["skill1", "skill2", ...],
    "soft": ["skill1", "skill2", ...],
    "languages": ["language1 (proficiency)", ...]
  },
  "experience": {
    "total_years": number,
    "companies": [
      {
        "name": "Company Name",
        "role": "Job Title",
        "duration": "e.g., 2 years 3 months",
        "highlights": ["achievement1", "achievement2"]
      }
    ]
  },
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University/School",
      "year": "Graduation year or expected",
      "field": "Field of study"
    }
  ],
  "role_fit": {
    "score": 0-100,
    "strengths": ["strength1", "strength2", ...],
    "gaps": ["gap1", "gap2", ...],
    "recommendation": "Your hiring recommendation"
  },
  "red_flags": ["Any concerns or inconsistencies"],
  "interview_questions": [
    {
      "question": "Interview question",
      "purpose": "What this question helps assess"
    }
  ],
  "company_research": [
    {
      "company": "Company name from resume",
      "industry": "Industry sector",
      "insights": "Brief insight about this company and what working there might indicate about the candidate"
    }
  ]
}

Be thorough but concise. Focus on actionable insights for HR.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.content[0]?.text;

  if (!content) {
    throw new Error('No response from Claude API');
  }

  // Parse the JSON response
  try {
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]) as Omit<AIAnalysisResult, 'analyzed_at'>;
    return {
      ...analysis,
      analyzed_at: new Date().toISOString(),
    };
  } catch (parseError) {
    console.error('Failed to parse Claude response:', content);
    throw new Error('Failed to parse AI analysis response');
  }
}

// POST /api/candidates/[id]/analyze - Analyze resume with AI
export const POST = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    // Get candidate details
    const { data: candidate, error: fetchError } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (!candidate.resume_file_path) {
      return NextResponse.json({ error: 'No resume file uploaded for this candidate' }, { status: 400 });
    }

    // Download the resume file
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(candidate.resume_file_path);

    if (downloadError || !fileData) {
      console.error('Error downloading resume:', downloadError);
      return NextResponse.json({ error: 'Failed to download resume file' }, { status: 500 });
    }

    // Convert to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Extract text based on file type
    let resumeText: string;
    const fileName = candidate.resume_file_name?.toLowerCase() || '';

    if (fileName.endsWith('.pdf')) {
      resumeText = await extractTextFromPdf(buffer);
    } else if (fileName.endsWith('.txt')) {
      resumeText = buffer.toString('utf-8');
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      // For DOCX, we'd need mammoth or similar - for now, return error
      return NextResponse.json({
        error: 'DOCX files are not yet supported. Please upload a PDF version.'
      }, { status: 400 });
    } else {
      return NextResponse.json({
        error: 'Unsupported file format. Please upload a PDF or TXT file.'
      }, { status: 400 });
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({
        error: 'Could not extract sufficient text from the resume. The file may be image-based or corrupted.'
      }, { status: 400 });
    }

    // Analyze with Claude
    const analysis = await analyzeWithClaude(resumeText, {
      full_name: candidate.full_name,
      applied_role: candidate.applied_role,
      email: candidate.email,
      about: candidate.about || undefined,
    });

    // Store the analysis in the database
    const { error: updateError } = await supabaseAdmin
      .from('candidates')
      .update({
        ai_analysis: analysis,
        ai_analyzed_at: analysis.analyzed_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error storing analysis:', updateError);
      // Still return the analysis even if storage fails
    }

    return NextResponse.json({
      success: true,
      analysis,
    });

  } catch (error) {
    console.error('Error analyzing resume:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze resume';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECRUITMENT_MANAGE });

// GET /api/candidates/[id]/analyze - Get existing analysis
export const GET = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    const { data: candidate, error: fetchError } = await supabaseAdmin
      .from('candidates')
      .select('ai_analysis, ai_analyzed_at')
      .eq('id', id)
      .single();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (!candidate.ai_analysis) {
      return NextResponse.json({
        analyzed: false,
        message: 'No AI analysis available for this candidate'
      });
    }

    return NextResponse.json({
      analyzed: true,
      analysis: candidate.ai_analysis,
      analyzed_at: candidate.ai_analyzed_at,
    });

  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECRUITMENT_VIEW });
