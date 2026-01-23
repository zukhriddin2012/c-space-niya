'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Lock, CheckCircle, ChevronRight, Trash2 } from 'lucide-react';

interface DocumentData {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  document_type: string;
  position: string;
  branch: string;
  start_date: string;
  end_date: string;
  salary: string;
  work_hours: string;
  created_at: string;
  signed_at: string | null;
  signature_data: string | null;
}

type Step = 'password' | 'document' | 'signature' | 'success';

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

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    // Set drawing style
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Ознакомьтесь с документом</h1>
            <p className="text-gray-500 mt-2">Внимательно прочитайте условия перед подписанием</p>
          </div>

          <ProgressSteps />

          <div className="border border-gray-200 rounded-xl p-6 mb-6 max-h-[400px] overflow-y-auto bg-gray-50">
            <h2 className="text-xl font-bold text-center mb-4">УСЛОВИЯ ТРУДОУСТРОЙСТВА</h2>
            <p className="text-center text-gray-600 mb-6">C-Space Coworking</p>

            <div className="space-y-4 text-sm text-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500">ФИО кандидата:</p>
                  <p className="font-medium">{document?.candidate_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Должность:</p>
                  <p className="font-medium">{document?.position || 'Не указано'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Филиал:</p>
                  <p className="font-medium">{document?.branch || 'Не указано'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Дата начала:</p>
                  <p className="font-medium">{document?.start_date || 'Не указано'}</p>
                </div>
              </div>

              <hr className="my-4" />

              <div>
                <h3 className="font-semibold mb-2">1. Испытательный срок</h3>
                <p>Испытательный срок составляет 3 месяца с момента начала работы. В течение этого периода обе стороны могут расторгнуть соглашение с уведомлением за 3 рабочих дня.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. Рабочее время</h3>
                <p>{document?.work_hours || 'Рабочее время: с 9:00 до 18:00, понедельник-пятница. Обеденный перерыв: 1 час.'}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. Оплата труда</h3>
                <p>Заработная плата выплачивается два раза в месяц: аванс 15-го числа и основная часть в последний рабочий день месяца.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4. Конфиденциальность</h3>
                <p>Сотрудник обязуется не разглашать конфиденциальную информацию компании третьим лицам как во время работы, так и после увольнения.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5. Обязанности</h3>
                <p>Сотрудник обязуется добросовестно выполнять свои должностные обязанности, соблюдать внутренний распорядок и следовать корпоративной культуре компании.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
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
              ✍️ Нарисовать
            </button>
            <button
              onClick={() => setSignatureType('type')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                signatureType === 'type'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⌨️ Напечатать
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
