'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2 } from 'lucide-react';

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  applied_role: string;
  probation_start_date?: string;
  probation_end_date?: string;
}

interface Branch {
  id: string;
  name: string;
  address?: string;
}

interface TermSheetFormModalProps {
  candidate: Candidate;
  branches: Branch[];
  onClose: () => void;
  onSubmit: (data: TermSheetData) => Promise<void>;
}

export interface TermSheetData {
  // Candidate Info
  candidate_name: string;
  position: string;
  branch_id: string;
  branch_name: string;
  branch_address: string;
  reporting_to: string;

  // Selection Results
  screening_passed: boolean;
  interview1_passed: boolean;
  interview2_passed: boolean;

  // Employment Terms
  contract_type: string;
  contract_duration: string;
  start_date: string;
  salary: string;
  salary_review: string;

  // Probation Metrics
  probation_metrics: {
    metric: string;
    expected_result: string;
  }[];

  // Final Interview
  final_interview_date: string;
  final_interview_time: string;
  final_interview_interviewer: string;
  final_interview_purpose: string;

  // Onboarding (optional)
  onboarding_weeks: {
    week_number: number;
    title: string;
    start_date: string;
    end_date: string;
    items: string[];
  }[];

  // Contacts
  contacts: {
    name: string;
    position: string;
    responsibility: string;
  }[];

  // Escalation
  escalation_contact: string;
  escalation_contact_position: string;

  // Company Representative
  representative_name: string;
  representative_position: string;

  // Password for access
  password: string;
}

const DEFAULT_METRICS = [
  { metric: 'Пунктуальность (приход в 8:50)', expected_result: '100% вовремя (0 опозданий)' },
  { metric: 'Ежедневные вопросы по адаптации', expected_result: '12/12 отвечены' },
  { metric: 'Проведённые экскурсии', expected_result: 'Минимум 5 самостоятельных' },
  { metric: 'Ответы на звонки', expected_result: '100% входящих' },
  { metric: 'Самоподготовка (скрипты, системы)', expected_result: 'Ежедневно' },
  { metric: 'Знание FAQ клиентов', expected_result: 'Топ-10 вопросов без подсказок' },
];

const DEFAULT_CONTACTS = [
  { name: 'Рухшона', position: 'Менеджер по найму', responsibility: 'Вопросы о рабочей среде' },
  { name: 'Махмуд', position: 'Ассистент по операциям', responsibility: 'Вопросы по операциям филиала' },
  { name: 'Сайёра', position: 'Специалист по бухгалтерии', responsibility: 'Вопросы по бухгалтерии' },
  { name: 'Нигина', position: 'Менеджер по кадрам и праву', responsibility: 'Вопросы по праву и кадровой политике' },
];

export default function TermSheetFormModal({
  candidate,
  branches,
  onClose,
  onSubmit,
}: TermSheetFormModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Generate random 4-digit password
  const generatePassword = () => Math.floor(1000 + Math.random() * 9000).toString();

  const [formData, setFormData] = useState<TermSheetData>({
    candidate_name: candidate.full_name,
    position: candidate.applied_role || '',
    branch_id: '',
    branch_name: '',
    branch_address: '',
    reporting_to: 'Бренч-менеджер / COO',

    screening_passed: true,
    interview1_passed: true,
    interview2_passed: false,

    contract_type: 'Трудовой договор на 1 год',
    contract_duration: '1 год',
    start_date: candidate.probation_end_date || '',
    salary: '3 000 000',
    salary_review: 'Возможен в течение срока договора',

    probation_metrics: [...DEFAULT_METRICS],

    final_interview_date: candidate.probation_end_date || '',
    final_interview_time: '16:00',
    final_interview_interviewer: 'Зухриддин Абдурахмонов (COO)',
    final_interview_purpose: 'Утверждение на постоянную должность и назначение филиала',

    onboarding_weeks: [],

    contacts: [...DEFAULT_CONTACTS],

    escalation_contact: 'Зухриддин Абдурахмонов',
    escalation_contact_position: 'COO',

    representative_name: 'Абдурахмонов Зухриддин',
    representative_position: 'COO',

    password: generatePassword(),
  });

  // Update branch info when branch is selected
  useEffect(() => {
    if (formData.branch_id) {
      const branch = branches.find(b => b.id === formData.branch_id);
      if (branch) {
        setFormData(prev => ({
          ...prev,
          branch_name: branch.name,
          branch_address: branch.address || '',
        }));
      }
    }
  }, [formData.branch_id, branches]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof TermSheetData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addMetric = () => {
    setFormData(prev => ({
      ...prev,
      probation_metrics: [...prev.probation_metrics, { metric: '', expected_result: '' }],
    }));
  };

  const removeMetric = (index: number) => {
    setFormData(prev => ({
      ...prev,
      probation_metrics: prev.probation_metrics.filter((_, i) => i !== index),
    }));
  };

  const updateMetric = (index: number, field: 'metric' | 'expected_result', value: string) => {
    setFormData(prev => ({
      ...prev,
      probation_metrics: prev.probation_metrics.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', position: '', responsibility: '' }],
    }));
  };

  const removeContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index),
    }));
  };

  const updateContact = (index: number, field: 'name' | 'position' | 'responsibility', value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Создание Term Sheet</h2>
              <p className="text-sm text-gray-500">для {candidate.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {['Основное', 'Условия', 'Метрики', 'Интервью', 'Контакты'].map((label, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer ${
                    step === i + 1
                      ? 'bg-purple-600 text-white'
                      : step > i + 1
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  onClick={() => setStep(i + 1)}
                >
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`ml-2 text-sm hidden sm:block ${step === i + 1 ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                  {label}
                </span>
                {i < 4 && <div className="w-8 h-0.5 bg-gray-200 mx-2 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">1. Информация о кандидате</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ФИО кандидата</label>
                  <input
                    type="text"
                    value={formData.candidate_name}
                    onChange={(e) => updateField('candidate_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => updateField('position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Филиал</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => updateField('branch_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Выберите филиал</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Подчинение</label>
                  <input
                    type="text"
                    value={formData.reporting_to}
                    onChange={(e) => updateField('reporting_to', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-900 mt-6 mb-4">2. Результаты отбора</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.screening_passed}
                    onChange={(e) => updateField('screening_passed', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded border-gray-300"
                  />
                  <span className="text-gray-700">Скрининг пройден</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.interview1_passed}
                    onChange={(e) => updateField('interview1_passed', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded border-gray-300"
                  />
                  <span className="text-gray-700">Интервью 1 пройдено</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.interview2_passed}
                    onChange={(e) => updateField('interview2_passed', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded border-gray-300"
                  />
                  <span className="text-gray-700">Интервью 2 пройдено</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Employment Terms */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">3. Условия трудоустройства</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тип договора</label>
                  <select
                    value={formData.contract_type}
                    onChange={(e) => updateField('contract_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="Трудовой договор на 1 год">Трудовой договор на 1 год</option>
                    <option value="Трудовой договор на 6 месяцев">Трудовой договор на 6 месяцев</option>
                    <option value="Бессрочный трудовой договор">Бессрочный трудовой договор</option>
                    <option value="Договор ГПХ">Договор ГПХ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата вступления в силу</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => updateField('start_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ежемесячная зарплата (сум)</label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => updateField('salary', e.target.value)}
                    placeholder="3 000 000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Пересмотр зарплаты</label>
                  <input
                    type="text"
                    value={formData.salary_review}
                    onChange={(e) => updateField('salary_review', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-purple-800 mb-2">Пароль для доступа кандидата</h4>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="flex-1 px-3 py-2 border border-purple-300 rounded-lg text-lg font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => updateField('password', generatePassword())}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Новый
                  </button>
                </div>
                <p className="text-xs text-purple-600 mt-1">Этот пароль нужно будет сообщить кандидату</p>
              </div>
            </div>
          )}

          {/* Step 3: Probation Metrics */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">4. Критерии оценки испытательного срока</h3>
                <button
                  type="button"
                  onClick={addMetric}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                >
                  <Plus size={16} />
                  Добавить
                </button>
              </div>

              <div className="space-y-3">
                {formData.probation_metrics.map((metric, index) => (
                  <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={metric.metric}
                        onChange={(e) => updateMetric(index, 'metric', e.target.value)}
                        placeholder="Метрика"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={metric.expected_result}
                        onChange={(e) => updateMetric(index, 'expected_result', e.target.value)}
                        placeholder="Ожидаемый результат"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMetric(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Final Interview */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">5. Финальное интервью и утверждение</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                  <input
                    type="date"
                    value={formData.final_interview_date}
                    onChange={(e) => updateField('final_interview_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                  <input
                    type="time"
                    value={formData.final_interview_time}
                    onChange={(e) => updateField('final_interview_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Интервьюер</label>
                <input
                  type="text"
                  value={formData.final_interview_interviewer}
                  onChange={(e) => updateField('final_interview_interviewer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Цель интервью</label>
                <textarea
                  value={formData.final_interview_purpose}
                  onChange={(e) => updateField('final_interview_purpose', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <h3 className="text-lg font-medium text-gray-900 mt-6 mb-4">Представитель C-Space</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ФИО</label>
                  <input
                    type="text"
                    value={formData.representative_name}
                    onChange={(e) => updateField('representative_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
                  <input
                    type="text"
                    value={formData.representative_position}
                    onChange={(e) => updateField('representative_position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Contacts */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">7. Контактные лица</h3>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                >
                  <Plus size={16} />
                  Добавить
                </button>
              </div>

              <div className="space-y-3">
                {formData.contacts.map((contact, index) => (
                  <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => updateContact(index, 'name', e.target.value)}
                        placeholder="Имя"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={contact.position}
                        onChange={(e) => updateContact(index, 'position', e.target.value)}
                        placeholder="Должность"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={contact.responsibility}
                        onChange={(e) => updateContact(index, 'responsibility', e.target.value)}
                        placeholder="Зона ответственности"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-medium text-gray-900 mt-6 mb-4">Эскалация вопросов</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Контактное лицо</label>
                  <input
                    type="text"
                    value={formData.escalation_contact}
                    onChange={(e) => updateField('escalation_contact', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
                  <input
                    type="text"
                    value={formData.escalation_contact_position}
                    onChange={(e) => updateField('escalation_contact_position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {step > 1 ? 'Назад' : 'Отмена'}
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Далее
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Создание...' : 'Создать Term Sheet'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
