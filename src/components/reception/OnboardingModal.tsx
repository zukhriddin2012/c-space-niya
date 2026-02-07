'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle, Check, Lightbulb } from 'lucide-react';
import { useReceptionMode, getOperatorHeaders } from '@/contexts/ReceptionModeContext';

// ============================================
// TYPES
// ============================================
interface OnboardingStep {
  id: string;
  stepNumber: number;
  titleEn: string;
  titleRu: string;
  titleUz: string;
  bodyEn: string;
  bodyRu: string;
  bodyUz: string;
  tipEn?: string;
  tipRu?: string;
  tipUz?: string;
  featuresEn: FeatureItem[];
  featuresRu: FeatureItem[];
  featuresUz: FeatureItem[];
  animationKey: string;
}

interface FeatureItem {
  icon: string;
  text: string;
  color?: string;
}

interface OnboardingGuide {
  id: string;
  moduleKey: string;
  titleEn: string;
  titleRu: string;
  titleUz: string;
  subtitleEn: string;
  subtitleRu: string;
  subtitleUz: string;
  autoShow: boolean;
}

type Lang = 'en' | 'ru' | 'uz';

// ============================================
// LANGUAGE HELPERS
// ============================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLocalized(obj: any, field: string, lang: Lang): string {
  const key = `${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
  return obj[key] || obj[`${field}En`] || '';
}

function getLocalizedFeatures(step: OnboardingStep, lang: Lang): FeatureItem[] {
  if (lang === 'uz') return step.featuresUz || step.featuresEn || [];
  if (lang === 'ru') return step.featuresRu || step.featuresEn || [];
  return step.featuresEn || [];
}

const langLabels: Record<Lang, Record<string, string>> = {
  en: { skip: 'Skip guide', back: 'Back', next: 'Next', finish: 'Start Working!', stepOf: 'of' },
  ru: { skip: 'Пропустить', back: 'Назад', next: 'Далее', finish: 'Начать работу!', stepOf: 'из' },
  uz: { skip: 'O\'tkazib yuborish', back: 'Orqaga', next: 'Keyingi', finish: 'Ishni boshlash!', stepOf: 'dan' },
};

// ============================================
// SVG ANIMATIONS
// ============================================
function OnboardingAnimation({ animationKey }: { animationKey: string }) {
  const baseClass = 'w-full h-full';

  switch (animationKey) {
    case 'hub-overview':
      return (
        <svg viewBox="0 0 220 220" className={baseClass} fill="none">
          <rect x="40" y="30" width="140" height="160" rx="18" fill="#F5F3FF" stroke="#7C3AED" strokeWidth="2">
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-6;0,0" dur="3s" repeatCount="indefinite" />
          </rect>
          <g opacity="0"><rect x="55" y="55" width="110" height="30" rx="8" fill="#EDE9FE"/><circle cx="72" cy="70" r="8" fill="#7C3AED" opacity=".5"/><rect x="86" y="64" width="60" height="5" rx="2" fill="#A78BFA"/>
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="0.2s" fill="freeze"/>
          </g>
          <g opacity="0"><rect x="55" y="95" width="110" height="30" rx="8" fill="#DBEAFE"/><circle cx="72" cy="110" r="8" fill="#3B82F6" opacity=".5"/><rect x="86" y="104" width="60" height="5" rx="2" fill="#93C5FD"/>
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="0.5s" fill="freeze"/>
          </g>
          <g opacity="0"><rect x="55" y="135" width="110" height="30" rx="8" fill="#FEF3C7"/><circle cx="72" cy="150" r="8" fill="#F59E0B" opacity=".5"/><rect x="86" y="144" width="60" height="5" rx="2" fill="#FCD34D"/>
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="0.8s" fill="freeze"/>
          </g>
        </svg>
      );

    case 'accounting-flow':
      return (
        <svg viewBox="0 0 220 220" className={baseClass} fill="none">
          <rect x="45" y="25" width="130" height="170" rx="14" fill="#EDE9FE" stroke="#7C3AED" strokeWidth="2"/>
          <rect x="55" y="35" width="110" height="24" rx="6" fill="#7C3AED"/>
          <text x="110" y="52" textAnchor="middle" fontSize="11" fill="white" fontWeight="700">ACCOUNTING</text>
          {[0,1,2].map(i => (
            <g key={i} opacity="0">
              <rect x="55" y={68 + i*28} width="110" height="22" rx="6" fill="white"/>
              <circle cx="68" cy={79 + i*28} r="5" fill={['#F59E0B','#3B82F6','#EF4444'][i]}/>
              <rect x="78" y={75 + i*28} width={50 - i*5} height="4" rx="2" fill="#D1D5DB"/>
              <rect x="138" y={75 + i*28} width="20" height="4" rx="2" fill={['#10B981','#F59E0B','#7C3AED'][i]}/>
              <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin={`${0.3 + i*0.2}s`} fill="freeze"/>
            </g>
          ))}
          <g opacity="0">
            <circle cx="110" cy="168" r="14" fill="#7C3AED"/>
            <line x1="104" y1="168" x2="116" y2="168" stroke="white" strokeWidth="2.5"/>
            <line x1="110" y1="162" x2="110" y2="174" stroke="white" strokeWidth="2.5"/>
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1s" fill="freeze"/>
          </g>
        </svg>
      );

    case 'legal-flow':
      return (
        <svg viewBox="0 0 220 220" className={baseClass} fill="none">
          <rect x="55" y="20" width="110" height="140" rx="8" fill="white" stroke="#6366F1" strokeWidth="2">
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-5;0,0" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x="68" y="35" width="70" height="5" rx="2" fill="#6366F1" opacity=".8"/>
          {[0,1,2].map(i => (
            <rect key={i} x="68" y={48 + i*8} width={84 - i*12} height="3" rx="1.5" fill="#D1D5DB"/>
          ))}
          <line x1="68" y1="76" x2="152" y2="76" stroke="#E5E7EB"/>
          <path d="M75 120 Q85 108 95 118 Q105 128 115 112 Q120 106 130 110" stroke="#6366F1" strokeWidth="2" fill="none" strokeLinecap="round"
            strokeDasharray="80" strokeDashoffset="80">
            <animate attributeName="stroke-dashoffset" from="80" to="0" dur="2s" begin="0.5s" fill="freeze"/>
          </path>
          <g opacity="0">
            <circle cx="145" cy="130" r="18" fill="none" stroke="#10B981" strokeWidth="2"/>
            <text x="145" y="134" textAnchor="middle" fontSize="8" fill="#10B981" fontWeight="700">OK</text>
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="2s" fill="freeze"/>
          </g>
          <g opacity="0">
            <rect x="30" y="170" width="50" height="10" rx="3" fill="#6366F1"/>
            <rect x="48" y="155" width="14" height="20" rx="3" fill="#8B5CF6"/>
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1.5s" fill="freeze"/>
          </g>
        </svg>
      );

    case 'maintenance-flow':
      return (
        <svg viewBox="0 0 220 220" className={baseClass} fill="none">
          <rect x="40" y="50" width="140" height="120" rx="6" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2"/>
          {/* Windows */}
          {[[55,65],[90,65],[125,65],[55,105],[90,105]].map(([x,y], i) => (
            <rect key={i} x={x} y={y} width="25" height="25" rx="3" fill="white" stroke="#FBBF24" strokeWidth="1.5"/>
          ))}
          <rect x="125" y="105" width="40" height="50" rx="3" fill="#92400E" opacity=".3"/>
          {/* Alert badges */}
          <g opacity="0">
            <circle cx="80" cy="65" r="9" fill="#EF4444"/>
            <text x="80" y="69" textAnchor="middle" fontSize="10" fill="white" fontWeight="700">!</text>
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="0.5s" fill="freeze"/>
          </g>
          <g opacity="0">
            <circle cx="155" cy="65" r="9" fill="#F59E0B"/>
            <text x="155" y="69" textAnchor="middle" fontSize="10" fill="white" fontWeight="700">⚡</text>
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="0.8s" fill="freeze"/>
          </g>
          {/* Wrench */}
          <g opacity="0" transform="translate(35, 20) rotate(-30)">
            <path d="M10 15 L25 30 L28 27 L13 12 Z" fill="#6B7280"/>
            <circle cx="8" cy="13" r="7" fill="none" stroke="#6B7280" strokeWidth="2"/>
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1.1s" fill="freeze"/>
          </g>
        </svg>
      );

    case 'celebration':
      return (
        <svg viewBox="0 0 220 220" className={baseClass} fill="none">
          <circle cx="110" cy="100" r="50" fill="#D1FAE5" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="0.2s" fill="freeze"/>
          </circle>
          <circle cx="110" cy="100" r="60" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0">
            <animate attributeName="opacity" values="0;0.4;0" dur="2s" begin="0.5s" repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="scale" values="1;1.3;1" dur="2s" begin="0.5s" repeatCount="indefinite" additive="sum"/>
          </circle>
          <path d="M88 100 L104 116 L134 84" stroke="#10B981" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="60" strokeDashoffset="60">
            <animate attributeName="stroke-dashoffset" from="60" to="0" dur="0.8s" begin="0.5s" fill="freeze"/>
          </path>
          {/* Confetti */}
          {[[50,50,'#7C3AED',4,0.8],[170,55,'#F59E0B',3,1],[60,160,'#3B82F6',5,1.2],[160,150,'#EF4444',4,1.4]].map(([cx,cy,fill,r,delay], i) => (
            <circle key={i} cx={cx as number} cy={cy as number} r={r as number} fill={fill as string} opacity="0">
              <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin={`${delay}s`} fill="freeze"/>
            </circle>
          ))}
          <text x="40" y="140" fontSize="16" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="1.5s" fill="freeze"/>⭐
          </text>
          <text x="170" y="85" fontSize="12" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="1.7s" fill="freeze"/>✨
          </text>
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 220 220" className={baseClass} fill="none">
          <circle cx="110" cy="110" r="60" fill="#F5F3FF" stroke="#7C3AED" strokeWidth="2"/>
          <text x="110" y="118" textAnchor="middle" fontSize="36" fill="#7C3AED">?</text>
        </svg>
      );
  }
}

// ============================================
// FEATURE COLOR MAP
// ============================================
const colorMap: Record<string, string> = {
  purple: 'bg-purple-100',
  blue: 'bg-blue-100',
  green: 'bg-green-100',
  orange: 'bg-amber-100',
  red: 'bg-red-100',
};

// ============================================
// MAIN COMPONENT
// ============================================
interface OnboardingModalProps {
  moduleKey: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ moduleKey, isOpen, onClose }: OnboardingModalProps) {
  const { currentOperator } = useReceptionMode();
  const [guide, setGuide] = useState<OnboardingGuide | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [lang, setLang] = useState<Lang>('en');
  const [loading, setLoading] = useState(true);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Detect language from browser or stored preference
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('onboarding-lang') : null;
    if (stored && ['en', 'ru', 'uz'].includes(stored)) {
      setLang(stored as Lang);
    }
  }, []);

  // Fetch guide data
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const opHeaders = getOperatorHeaders(currentOperator, 'self');
    Object.entries(opHeaders).forEach(([k, v]) => { if (v) headers[k] = v; });

    fetch(`/api/reception/onboarding?moduleKey=${moduleKey}`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.guide) {
          setGuide(data.guide);
          setSteps(data.steps || []);
          if (data.progress?.lastStep && !data.progress.completed) {
            setCurrentStep(Math.min(data.progress.lastStep - 1, (data.steps?.length || 1) - 1));
          } else {
            setCurrentStep(0);
          }
        }
      })
      .catch(err => console.error('Failed to load onboarding:', err))
      .finally(() => setLoading(false));
  }, [isOpen, moduleKey, currentOperator]);

  // Save progress
  const saveProgress = useCallback((step: number, completed: boolean) => {
    if (!guide) return;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const opHeaders = getOperatorHeaders(currentOperator, 'self');
    Object.entries(opHeaders).forEach(([k, v]) => { if (v) headers[k] = v; });

    fetch('/api/reception/onboarding/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify({ guideId: guide.id, lastStep: step + 1, completed }),
    }).catch(() => { /* silent fail */ });
  }, [guide, currentOperator]);

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('onboarding-lang', newLang);
  };

  const goToStep = (n: number) => {
    setSlideDirection(n > currentStep ? 'right' : 'left');
    setCurrentStep(n);
    saveProgress(n, false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      saveProgress(currentStep, true);
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextStep();
      else if (e.key === 'ArrowLeft') prevStep();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!isOpen) return null;

  const labels = langLabels[lang];
  const step = steps[currentStep];
  const progressPercent = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[700px] mx-4 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
        style={{ maxHeight: '90vh' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : !guide || steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <HelpCircle className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500">Guide not available yet</p>
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 pt-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-purple-700">
                  {getLocalized(guide, 'title', lang)}
                </h3>
                <p className="text-xs text-gray-500">
                  {getLocalized(guide, 'subtitle', lang)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Language toggle */}
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {(['en', 'ru', 'uz'] as Lang[]).map(l => (
                    <button
                      key={l}
                      onClick={() => changeLang(l)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                        lang === l ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-red-500 hover:text-white text-gray-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-6 pt-4">
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-teal-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Slide content */}
            {step && (
              <div className="flex-1 overflow-hidden px-6 py-6">
                <div
                  key={`${currentStep}-${slideDirection}`}
                  className="flex gap-6 items-start animate-in slide-in-from-right duration-400"
                  style={{
                    animation: `slideIn${slideDirection === 'right' ? 'Right' : 'Left'} 0.4s ease-out`,
                  }}
                >
                  {/* Visual */}
                  <div className="w-48 h-48 flex-shrink-0 hidden md:flex items-center justify-center">
                    <OnboardingAnimation animationKey={step.animationKey} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                      {lang === 'en' && `Step ${step.stepNumber} ${labels.stepOf} ${steps.length}`}
                      {lang === 'ru' && `Шаг ${step.stepNumber} ${labels.stepOf} ${steps.length}`}
                      {lang === 'uz' && `${step.stepNumber}-qadam (${steps.length} ${labels.stepOf})`}
                    </div>
                    <h4 className="text-xl font-extrabold text-gray-900 mb-3 leading-tight">
                      {getLocalized(step, 'title', lang)}
                    </h4>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">
                      {getLocalized(step, 'body', lang)}
                    </p>

                    {/* Features */}
                    {getLocalizedFeatures(step, lang).length > 0 && (
                      <div className="flex flex-col gap-1.5 mb-4">
                        {getLocalizedFeatures(step, lang).map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-700 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                            <span className={`w-5 h-5 flex items-center justify-center rounded text-xs flex-shrink-0 ${colorMap[f.color || 'gray'] || 'bg-gray-100'}`}>
                              {f.icon}
                            </span>
                            <span>{f.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tip */}
                    {getLocalized(step, 'tip', lang) && (
                      <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                        <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>{getLocalized(step, 'tip', lang)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => { saveProgress(currentStep, true); onClose(); }}
                className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
              >
                {labels.skip}
              </button>

              {/* Dots */}
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToStep(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentStep ? 'w-6 bg-purple-500' :
                      i < currentStep ? 'w-2 bg-green-400' : 'w-2 bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {/* Nav buttons */}
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {labels.back}
                  </button>
                )}
                <button
                  onClick={nextStep}
                  className={`flex items-center gap-1 px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg ${
                    isLastStep
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                      : 'bg-gradient-to-r from-purple-500 to-purple-700 text-white'
                  }`}
                >
                  {isLastStep ? labels.finish : labels.next}
                  {isLastStep ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
