'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { FileText, Lock, CheckCircle, ChevronRight, Trash2, Check, X } from 'lucide-react';

// Brand color: #64177C (C-Space Purple)

interface DocumentData {
  id: string;
  candidate_id: string;
  document_type: string;

  // Candidate info
  candidate_name: string;
  position: string;
  branch_name: string;
  branch_address: string;
  reporting_to: string;

  // Selection results
  screening_passed: boolean;
  interview1_passed: boolean;
  interview2_passed: boolean;

  // Employment terms (full contract)
  contract_type: string;
  contract_duration: string;
  start_date: string;
  salary: string;
  salary_review: string;

  // Probation-specific fields
  probation_duration: string;
  probation_start_date: string;
  probation_end_date: string;
  working_hours: string;
  probation_salary: string;

  // Probation metrics
  probation_metrics: { metric: string; expected_result: string }[];

  // Final interview
  final_interview_date: string;
  final_interview_time: string;
  final_interview_interviewer: string;
  final_interview_purpose: string;

  // Onboarding
  onboarding_weeks: {
    week: number;
    title: string;
    date_range: string;
    items: string[];
  }[];

  // Contacts
  contacts: { name: string; position: string; responsibility: string }[];

  // Escalation
  escalation_contact: string;
  escalation_contact_position: string;

  // Representative
  representative_name: string;
  representative_position: string;

  // Signing
  signed_at: string | null;
  signature_data: string | null;
  created_at: string;
}

type Step = 'password' | 'document' | 'signature' | 'success';

function formatDate(dateString: string): string {
  if (!dateString) return 'Не указано';
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function DocumentSigningPage() {
  const params = useParams();
  const token = params.token as string;

  const [step, setStep] = useState<Step>('password');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<DocumentData | null>(null);

  // Password verification
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Signature
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Fetch document info
  useEffect(() => {
    fetchDocument();
  }, [token]);

  const fetchDocument = async () => {
    try {
      const res = await fetch(`/api/documents/sign/${token}`);
      if (res.ok) {
        const data = await res.json();
        setDocument(data.document);
        setTypedName(data.document.candidate_name);

        // If already signed, show success
        if (data.document.signed_at) {
          setStep('success');
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Document not found');
      }
    } catch (err) {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  // Verify password
  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setPasswordError('Введите пароль');
      return;
    }

    setVerifying(true);
    setPasswordError('');
    try {
      const res = await fetch(`/api/documents/sign/${token}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setStep('document');
      } else {
        const data = await res.json();
        setPasswordError(data.error || 'Неверный пароль');
      }
    } catch (err) {
      setPasswordError('Ошибка проверки');
    } finally {
      setVerifying(false);
    }
  };

  // Canvas drawing
  useEffect(() => {
    if (step === 'signature' && signatureType === 'draw') {
      initCanvas();
    }
  }, [step, signatureType]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Touch support for canvas
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setIsDrawing(true);
    setHasDrawn(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Submit signature
  const handleSubmit = async () => {
    if (!agreed) return;

    let signatureData = '';

    if (signatureType === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        setError('Пожалуйста, нарисуйте подпись');
        return;
      }
      signatureData = canvas.toDataURL('image/png');
    } else {
      if (!typedName.trim()) {
        setError('Пожалуйста, введите имя');
        return;
      }
      signatureData = JSON.stringify({
        type: 'typed',
        name: typedName,
        style: selectedStyle,
      });
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/sign/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_type: signatureType,
          signature_data: signatureData,
        }),
      });

      if (res.ok) {
        setStep('success');
      } else {
        const data = await res.json();
        setError(data.error || 'Ошибка отправки подписи');
      }
    } catch (err) {
      setError('Ошибка отправки подписи');
    } finally {
      setSubmitting(false);
    }
  };

  // Progress indicator
  const getStepNumber = () => {
    switch (step) {
      case 'password': return 1;
      case 'document': return 2;
      case 'signature': return 3;
      case 'success': return 4;
      default: return 1;
    }
  };

  const ProgressSteps = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((num) => (
        <div key={num} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            num < getStepNumber()
              ? 'bg-green-500 text-white'
              : num === getStepNumber()
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
              : 'bg-gray-200 text-gray-500'
          }`}>
            {num < getStepNumber() ? '✓' : num}
          </div>
          {num < 3 && (
            <div className={`w-8 md:w-12 h-1 rounded ${
              num < getStepNumber() ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  // Term Sheet Component
  const TermSheetDocument = () => (
    <div className="bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      {/* Header - C-Space Brand Color #64177C */}
      <div className="text-white p-6 rounded-t-xl" style={{ backgroundColor: '#64177C' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm mb-1">Условия трудоустройства</p>
            <h1 className="text-2xl font-bold">УСЛОВИЯ ТРУДОУСТРОЙСТВА</h1>
          </div>
          <div className="text-right">
            <div className="bg-white rounded-xl p-2">
              <Image
                src="/logo-icon.svg"
                alt="C-Space"
                width={48}
                height={48}
                className="w-12 h-12"
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-lg">Должность: <span className="font-semibold">{document?.position}</span></p>
          <p className="text-white/70">Филиал {document?.branch_name}</p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Section 1: Candidate Info */}
        <section>
          <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">1</span>
            Информация о кандидате
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2 text-gray-600 font-medium w-1/3">ФИО</td>
                  <td className="py-2">{document?.candidate_name}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Должность</td>
                  <td className="py-2">{document?.position}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Филиал</td>
                  <td className="py-2">{document?.branch_name}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Подчинение</td>
                  <td className="py-2">{document?.reporting_to}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Selection Results */}
        <section>
          <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">2</span>
            Результаты отбора
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr className="text-purple-700">
                  <th className="text-left py-2 font-medium">Этап оценки</th>
                  <th className="text-left py-2 font-medium">Результат</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2">Скрининг</td>
                  <td className="py-2">
                    {document?.screening_passed ? (
                      <span className="text-green-600 flex items-center gap-1"><Check size={16} /> ПРОЙДЕН</span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1"><X size={16} /> НЕ ПРОЙДЕН</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2">Интервью 1</td>
                  <td className="py-2">
                    {document?.interview1_passed ? (
                      <span className="text-green-600 flex items-center gap-1"><Check size={16} /> ПРОЙДЕН</span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1"><X size={16} /> НЕ ПРОЙДЕН</span>
                    )}
                  </td>
                </tr>
                {document?.interview2_passed && (
                  <tr>
                    <td className="py-2">Интервью 2</td>
                    <td className="py-2">
                      <span className="text-green-600 flex items-center gap-1"><Check size={16} /> ПРОЙДЕН</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Employment Terms */}
        <section>
          <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">3</span>
            Условия трудоустройства
          </h2>
          <p className="text-gray-600 mb-3 font-medium">Полная занятость (при успешном прохождении)</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2 text-gray-600 font-medium w-1/3">Тип договора</td>
                  <td className="py-2">{document?.contract_type}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Дата вступления в силу</td>
                  <td className="py-2">{formatDate(document?.start_date || '')}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Ежемесячная зарплата</td>
                  <td className="py-2 font-semibold text-purple-700">{document?.salary} сум (на руки)</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Пересмотр зарплаты</td>
                  <td className="py-2">{document?.salary_review}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Назначение филиала</td>
                  <td className="py-2">Будет подтверждено на финальном интервью</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Probation Metrics */}
        {document?.probation_metrics && document.probation_metrics.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">4</span>
              Критерии оценки испытательного срока
            </h2>
            <p className="text-gray-600 mb-3">
              Следующие метрики будут отслеживаться в течение испытательного срока для принятия решения о найме:
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <table className="w-full">
                <thead>
                  <tr className="text-purple-700">
                    <th className="text-left py-2 font-medium">Метрика</th>
                    <th className="text-left py-2 font-medium">Ожидаемый результат</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {document.probation_metrics.map((metric, idx) => (
                    <tr key={idx}>
                      <td className="py-2">{metric.metric}</td>
                      <td className="py-2">{metric.expected_result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 5: Final Interview */}
        {document?.final_interview_date && (
          <section>
            <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">5</span>
              Финальное интервью и утверждение
            </h2>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-purple-800 mb-2">ДЕТАЛИ ФИНАЛЬНОГО ИНТЕРВЬЮ</h3>
              <p><strong>Дата:</strong> {formatDate(document.final_interview_date)}</p>
              <p><strong>Время:</strong> {document.final_interview_time}</p>
              <p><strong>Интервьюер:</strong> {document.final_interview_interviewer}</p>
              <p><strong>Цель:</strong> {document.final_interview_purpose}</p>
            </div>
            <p className="text-gray-600 text-sm">
              Интервьюер оценит результаты работы кандидата в течение испытательного срока и примет окончательное решение.
            </p>
          </section>
        )}

        {/* Section 7: Contacts */}
        {document?.contacts && document.contacts.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">7</span>
              Контактные лица
            </h2>
            <p className="text-gray-600 mb-3">По любым вопросам обращайтесь к соответствующим специалистам:</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <table className="w-full">
                <thead>
                  <tr className="text-purple-700">
                    <th className="text-left py-2 font-medium">Имя</th>
                    <th className="text-left py-2 font-medium">Должность</th>
                    <th className="text-left py-2 font-medium">Зона ответственности</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {document.contacts.map((contact, idx) => (
                    <tr key={idx}>
                      <td className="py-2">{contact.name}</td>
                      <td className="py-2 text-purple-600 italic">{contact.position}</td>
                      <td className="py-2">{contact.responsibility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {document.escalation_contact && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-bold text-yellow-800">ЭСКАЛАЦИЯ ВОПРОСОВ</h4>
                <p className="text-yellow-700">
                  <strong>{document.escalation_contact} ({document.escalation_contact_position})</strong> - обращайтесь по любому вопросу, который не был решён в течение более 3 дней
                </p>
              </div>
            )}
          </section>
        )}

        {/* Section 8: Signatures */}
        <section>
          <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">8</span>
            Подтверждение и подписи
          </h2>
          <p className="text-gray-600 mb-4">
            Подписывая ниже, обе стороны подтверждают и соглашаются с условиями, изложенными в данном документе.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-purple-700 mb-3">КАНДИДАТ</h4>
              <p className="text-sm text-gray-600">ФИО: {document?.candidate_name}</p>
              <p className="text-sm text-gray-600 mt-2">Подпись: _______________________</p>
              <p className="text-sm text-gray-600 mt-2">Дата: _______________________</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-purple-700 mb-3">ПРЕДСТАВИТЕЛЬ C-SPACE</h4>
              <p className="text-sm text-gray-600">ФИО: {document?.representative_name}</p>
              <p className="text-sm text-gray-600 mt-2">Подпись: _______________________</p>
              <p className="text-sm text-gray-600 mt-2">Дата: _______________________</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-gray-200">
          <div className="inline-block">
            <Image
              src="/logo-icon.svg"
              alt="C-Space Coworking"
              width={48}
              height={48}
              className="mx-auto mb-2"
            />
            <p className="text-sm text-gray-500 italic">Right People. Right Place.</p>
          </div>
          {document?.branch_address && (
            <p className="text-xs text-gray-400 mt-2">{document.branch_name} | {document.branch_address}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">Конфиденциально | C-Space Coworking</p>
        </div>
      </div>
    </div>
  );

  // Probation Term Sheet Component
  const ProbationTermSheetDocument = () => (
    <div className="bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      {/* Header - C-Space Brand Color #64177C */}
      <div className="text-white p-6 rounded-t-xl" style={{ backgroundColor: '#64177C' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm mb-1">Условия трудоустройства</p>
            <h1 className="text-2xl font-bold">УСЛОВИЯ ТРУДОУСТРОЙСТВА</h1>
          </div>
          <div className="text-right">
            <div className="bg-white rounded-xl p-2">
              <Image
                src="/logo-icon.svg"
                alt="C-Space"
                width={48}
                height={48}
                className="w-12 h-12"
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-lg">Должность: <span className="font-semibold">{document?.position}</span></p>
          <p className="text-white/70">Филиал {document?.branch_name}</p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Section 1: Candidate Info */}
        <section>
          <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">1</span>
            Информация о кандидате
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2 text-gray-600 font-medium w-1/3">ФИО</td>
                  <td className="py-2">{document?.candidate_name}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Должность</td>
                  <td className="py-2">{document?.position}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Филиал</td>
                  <td className="py-2">{document?.branch_name}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Подчинение</td>
                  <td className="py-2">{document?.reporting_to}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Selection Results */}
        <section>
          <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">2</span>
            Результаты отбора
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr className="text-purple-700">
                  <th className="text-left py-2 font-medium">Этап оценки</th>
                  <th className="text-left py-2 font-medium">Результат</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2">Скрининг</td>
                  <td className="py-2">
                    {document?.screening_passed ? (
                      <span className="text-green-600 flex items-center gap-1"><Check size={16} /> ПРОЙДЕН</span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1"><X size={16} /> НЕ ПРОЙДЕН</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2">Интервью 1</td>
                  <td className="py-2">
                    {document?.interview1_passed ? (
                      <span className="text-green-600 flex items-center gap-1"><Check size={16} /> ПРОЙДЕН</span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1"><X size={16} /> НЕ ПРОЙДЕН</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Probation Terms */}
        <section>
          <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">3</span>
            Условия трудоустройства
          </h2>
          <p className="text-gray-600 mb-3 font-medium">Испытательный срок</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2 text-gray-600 font-medium w-1/3">Продолжительность</td>
                  <td className="py-2">{document?.probation_duration}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Дата начала</td>
                  <td className="py-2">{formatDate(document?.probation_start_date || '')}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Дата окончания</td>
                  <td className="py-2">{formatDate(document?.probation_end_date || '')}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Рабочие часы</td>
                  <td className="py-2">{document?.working_hours}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Зарплата (испыт. срок)</td>
                  <td className="py-2 font-semibold text-purple-700">{document?.probation_salary}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Probation Metrics */}
        {document?.probation_metrics && document.probation_metrics.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">4</span>
              Критерии оценки испытательного срока
            </h2>
            <p className="text-gray-600 mb-3">
              Следующие метрики будут отслеживаться в течение испытательного срока для принятия решения о найме:
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <table className="w-full">
                <thead>
                  <tr className="text-purple-700">
                    <th className="text-left py-2 font-medium">Метрика</th>
                    <th className="text-left py-2 font-medium">Ожидаемый результат</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {document.probation_metrics.map((metric, idx) => (
                    <tr key={idx}>
                      <td className="py-2">{metric.metric}</td>
                      <td className="py-2">{metric.expected_result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 5: Final Interview */}
        {document?.final_interview_date && (
          <section>
            <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">5</span>
              Финальное интервью и утверждение
            </h2>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-purple-800 mb-2">ДЕТАЛИ ФИНАЛЬНОГО ИНТЕРВЬЮ</h3>
              <p><strong>Дата:</strong> {formatDate(document.final_interview_date)}</p>
              <p><strong>Время:</strong> {document.final_interview_time}</p>
              <p><strong>Интервьюер:</strong> {document.final_interview_interviewer}</p>
              <p><strong>Цель:</strong> {document.final_interview_purpose}</p>
            </div>
            <p className="text-gray-600 text-sm">
              COO оценит результаты работы кандидата в течение испытательного срока и примет окончательное решение по следующим вопросам:
            </p>
            <ul className="list-disc list-inside text-gray-600 text-sm mt-2 space-y-1">
              <li>Утверждение на постоянную работу в качестве {document.position} сроком на 1 год</li>
              <li>Назначение конкретного филиала (с учётом потребностей компании и предпочтений кандидата)</li>
            </ul>
          </section>
        )}

        {/* Section 6: Onboarding */}
        {document?.onboarding_weeks && document.onboarding_weeks.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">6</span>
              Обзор адаптации (филиал {document.branch_name})
            </h2>
            <p className="text-gray-600 mb-4 italic">
              Программа адаптации разработана для подготовки кандидата к успешной работе в качестве {document.position} в {document.branch_name}.
            </p>

            {document.onboarding_weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">{week.title} ({week.date_range})</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  {week.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="pl-2">{item}</li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        )}

        {/* Section 7: Contacts */}
        {document?.contacts && document.contacts.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">7</span>
              Контактные лица
            </h2>
            <p className="text-gray-600 mb-3">По любым вопросам обращайтесь к соответствующим специалистам:</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <table className="w-full">
                <thead>
                  <tr className="text-purple-700">
                    <th className="text-left py-2 font-medium">Имя</th>
                    <th className="text-left py-2 font-medium">Должность</th>
                    <th className="text-left py-2 font-medium">Зона ответственности</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {document.contacts.map((contact, idx) => (
                    <tr key={idx}>
                      <td className="py-2">{contact.name}</td>
                      <td className="py-2 text-purple-600 italic">{contact.position}</td>
                      <td className="py-2">{contact.responsibility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {document.escalation_contact && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-bold text-yellow-800">ЭСКАЛАЦИЯ ВОПРОСОВ</h4>
                <p className="text-yellow-700">
                  <strong>{document.escalation_contact} ({document.escalation_contact_position})</strong> - обращайтесь по любому вопросу, который не был решён в течение более 3 дней
                </p>
              </div>
            )}
          </section>
        )}

        {/* Section 8: Signatures */}
        <section>
          <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">8</span>
            Подтверждение и подписи
          </h2>
          <p className="text-gray-600 mb-4">
            Подписывая ниже, обе стороны подтверждают и соглашаются с условиями, изложенными в данном документе.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-purple-700 mb-3">КАНДИДАТ</h4>
              <p className="text-sm text-gray-600">ФИО: {document?.candidate_name}</p>
              <p className="text-sm text-gray-600 mt-2">Подпись: _______________________</p>
              <p className="text-sm text-gray-600 mt-2">Дата: _______________________</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-purple-700 mb-3">ПРЕДСТАВИТЕЛЬ C-SPACE</h4>
              <p className="text-sm text-gray-600">ФИО: {document?.representative_name}</p>
              <p className="text-sm text-gray-600 mt-2">Подпись: _______________________</p>
              <p className="text-sm text-gray-600 mt-2">Дата: _______________________</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-gray-200">
          <div className="inline-block">
            <Image
              src="/logo-icon.svg"
              alt="C-Space Coworking"
              width={48}
              height={48}
              className="mx-auto mb-2"
            />
            <p className="text-sm text-gray-500 italic">Right People. Right Place.</p>
          </div>
          {document?.branch_address && (
            <p className="text-xs text-gray-400 mt-2">Филиал {document.branch_name} | {document.branch_address}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">Конфиденциально | C-Space Coworking</p>
        </div>
      </div>
    </div>
  );

  // Determine which document component to render
  const DocumentComponent = () => {
    if (document?.document_type === 'probation_term_sheet') {
      return <ProbationTermSheetDocument />;
    }
    return <TermSheetDocument />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Документ не найден</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Step 1: Password Verification
  if (step === 'password') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Подписание документа</h1>
            <p className="text-gray-500 mt-2">C-Space Coworking</p>
          </div>

          <ProgressSteps />

          <div className="bg-purple-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-purple-800">
              <strong>Кандидат:</strong> {document?.candidate_name}
            </p>
            <p className="text-sm text-purple-700 mt-1">
              <strong>Документ:</strong> {document?.document_type}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="inline w-4 h-4 mr-1" />
              Пароль для доступа
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerifyPassword();
              }}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${
                passwordError ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Введите пароль"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-500 text-sm mt-2">{passwordError}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">Пароль предоставлен вам HR-менеджером</p>
          </div>

          <button
            onClick={handleVerifyPassword}
            disabled={!password || verifying}
            className="w-full mt-6 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                Продолжить
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Document Review
  if (step === 'document') {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Ознакомьтесь с документом</h1>
            <p className="text-gray-500 mt-2">Внимательно прочитайте условия перед подписанием</p>
          </div>

          <ProgressSteps />

          <DocumentComponent />

          <div className="flex gap-4 mt-6 max-w-4xl mx-auto">
            <button
              onClick={() => setStep('password')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Назад
            </button>
            <button
              onClick={() => setStep('signature')}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              Согласен, продолжить
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Signature
  if (step === 'signature') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Подпишите документ</h1>
            <p className="text-gray-500 mt-2">Выберите способ подписи</p>
          </div>

          <ProgressSteps />

          {/* Signature Type Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setSignatureType('draw')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                signatureType === 'draw'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Нарисовать
            </button>
            <button
              onClick={() => setSignatureType('type')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                signatureType === 'type'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Напечатать
            </button>
          </div>

          {/* Draw Signature */}
          {signatureType === 'draw' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-600">Нарисуйте подпись мышкой или пальцем</p>
                <button
                  onClick={clearCanvas}
                  className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Очистить
                </button>
              </div>
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={stopDrawing}
                className="w-full h-[200px] border-2 border-dashed border-gray-300 rounded-xl cursor-crosshair bg-white touch-none"
              />
            </div>
          )}

          {/* Type Signature */}
          {signatureType === 'type' && (
            <div className="mb-6">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                placeholder="Введите ваше полное имя"
              />
              <p className="text-sm text-gray-600 mb-3">Выберите стиль подписи:</p>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      selectedStyle === style
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-lg ${
                      style === 1 ? 'font-serif italic' :
                      style === 2 ? 'font-mono' :
                      'font-sans font-bold'
                    }`}>
                      {typedName || 'Имя'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 mt-0.5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-600">
              Я подтверждаю, что ознакомился с условиями документа и согласен с ними. Моя электронная подпись имеет юридическую силу.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep('document')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Назад
            </button>
            <button
              onClick={handleSubmit}
              disabled={!agreed || submitting || (signatureType === 'draw' && !hasDrawn) || (signatureType === 'type' && !typedName.trim())}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Подписание...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Подписать документ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Success
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Документ подписан!</h1>
          <p className="text-gray-500 mb-6">
            Спасибо, {document?.candidate_name}! Ваша подпись успешно сохранена.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left">
            <p className="text-sm text-gray-600"><strong>Документ:</strong> {document?.document_type}</p>
            <p className="text-sm text-gray-600 mt-1"><strong>Дата подписания:</strong> {new Date().toLocaleDateString('ru-RU')}</p>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Вы можете закрыть эту страницу. HR-менеджер получит уведомление о подписании.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
