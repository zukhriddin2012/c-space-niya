'use client';

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, User, CheckCircle, Briefcase, Target, Calendar, Users, Shield, Plus, Trash2 } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  address?: string;
}

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  applied_role: string;
  probation_start_date?: string;
  probation_end_date?: string;
}

export interface ProbationTermSheetData {
  document_type: 'probation_term_sheet';
  candidate_name: string;
  position: string;
  branch_id: string;
  branch_name: string;
  branch_address: string;
  reporting_to: string;

  // Selection results
  screening_passed: boolean;
  interview1_passed: boolean;

  // Probation terms
  probation_duration: string;
  probation_start_date: string;
  probation_end_date: string;
  working_hours: string;
  probation_salary: string;

  // Metrics
  probation_metrics: { metric: string; expected_result: string }[];

  // Final interview
  final_interview_date: string;
  final_interview_time: string;
  final_interview_interviewer: string;
  final_interview_purpose: string;

  // Onboarding weeks
  onboarding_weeks: {
    week: number;
    title: string;
    date_range: string;
    items: string[]
  }[];

  // Contacts
  contacts: { name: string; position: string; responsibility: string }[];

  // Escalation
  escalation_contact: string;
  escalation_contact_position: string;

  // Company representative
  representative_name: string;
  representative_position: string;

  // Password
  password: string;
}

interface Props {
  candidate: Candidate;
  branches: Branch[];
  onClose: () => void;
  onSubmit: (data: ProbationTermSheetData) => void;
}

const STEPS = [
  { id: 1, title: 'Кандидат', icon: User },
  { id: 2, title: 'Отбор', icon: CheckCircle },
  { id: 3, title: 'Условия', icon: Briefcase },
  { id: 4, title: 'Метрики', icon: Target },
  { id: 5, title: 'Интервью', icon: Calendar },
  { id: 6, title: 'Адаптация', icon: Calendar },
  { id: 7, title: 'Контакты', icon: Users },
  { id: 8, title: 'Проверка', icon: Shield },
];

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

const DEFAULT_ONBOARDING_WEEK1 = [
  'Ориентация и культура: История C-Space, ценности, дресс-код, график работы',
  'Работа с клиентами: Скрипты телефонных разговоров, ответы на частые вопросы, протоколы приветствия',
  'Экскурсии по филиалу: Освоение маршрута экскурсии по этажам',
  'C-Space App (Spacebring): Бронирование, регистрация клиентов, управление резервациями',
  'Правила и привилегии: Политики коворкинга, льготы резидентов, структура тарифов',
];

const DEFAULT_ONBOARDING_WEEK2 = [
  'Освоение систем: Google Диск, база данных CRM, реестр Sales, управление документами',
  'Обработка платежей: Наличные, карта (терминал), банковский перевод через C-Space App',
  'Документация по договорам: Аренда офисов, Open Space, договоры виртуального офиса',
  'Работа с оборудованием: Настройка принтера/сканера, устранение неполадок Wi-Fi, техническая поддержка',
  'Самостоятельная работа: Полное выполнение обязанностей на ресепшене с минимальным контролем',
];

export default function ProbationTermSheetFormModal({ candidate, branches, onClose, onSubmit }: Props) {
  const [currentStep, setCurrentStep] = useState(1);

  // Calculate dates
  const today = new Date();
  const startDate = candidate.probation_start_date || today.toISOString().split('T')[0];
  const endDateCalc = new Date(startDate);
  endDateCalc.setDate(endDateCalc.getDate() + 14);
  const endDate = candidate.probation_end_date || endDateCalc.toISOString().split('T')[0];

  // Week date ranges
  const week1Start = new Date(startDate);
  const week1End = new Date(startDate);
  week1End.setDate(week1End.getDate() + 4);
  const week2Start = new Date(startDate);
  week2Start.setDate(week2Start.getDate() + 4);
  const week2End = new Date(endDate);

  const formatDateRange = (start: Date, end: Date) => {
    return `${start.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
  };

  const [formData, setFormData] = useState<ProbationTermSheetData>({
    document_type: 'probation_term_sheet',
    candidate_name: candidate.full_name,
    position: candidate.applied_role || 'Community Manager',
    branch_id: '',
    branch_name: '',
    branch_address: '',
    reporting_to: 'Бренч-менеджер / COO',

    screening_passed: true,
    interview1_passed: true,

    probation_duration: '2 недели',
    probation_start_date: startDate,
    probation_end_date: endDate,
    working_hours: '9:00 - 18:00',
    probation_salary: '2 000 000 сум (на руки)',

    probation_metrics: DEFAULT_METRICS,

    final_interview_date: endDate,
    final_interview_time: '16:00',
    final_interview_interviewer: 'Зухриддин Абдурахмонов (COO)',
    final_interview_purpose: 'Утверждение на постоянную должность и назначение филиала',

    onboarding_weeks: [
      {
        week: 1,
        title: 'Неделя 1: Основы',
        date_range: formatDateRange(week1Start, week1End),
        items: DEFAULT_ONBOARDING_WEEK1
      },
      {
        week: 2,
        title: 'Неделя 2: Продвинутые операции',
        date_range: formatDateRange(week2Start, week2End),
        items: DEFAULT_ONBOARDING_WEEK2
      },
    ],

    contacts: DEFAULT_CONTACTS,

    escalation_contact: 'Зухриддин Абдурахмонов',
    escalation_contact_position: 'COO',

    representative_name: 'Абдурахмонов Зухриддин',
    representative_position: 'COO',

    password: Math.random().toString(36).substring(2, 8).toUpperCase(),
  });

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    setFormData(prev => ({
      ...prev,
      branch_id: branchId,
      branch_name: branch?.name || '',
      branch_address: branch?.address || '',
    }));
  };

  const updateMetric = (index: number, field: 'metric' | 'expected_result', value: string) => {
    const updated = [...formData.probation_metrics];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, probation_metrics: updated }));
  };

  const addMetric = () => {
    setFormData(prev => ({
      ...prev,
      probation_metrics: [...prev.probation_metrics, { metric: '', expected_result: '' }]
    }));
  };

  const removeMetric = (index: number) => {
    setFormData(prev => ({
      ...prev,
      probation_metrics: prev.probation_metrics.filter((_, i) => i !== index)
    }));
  };

  const updateContact = (index: number, field: 'name' | 'position' | 'responsibility', value: string) => {
    const updated = [...formData.contacts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, contacts: updated }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', position: '', responsibility: '' }]
    }));
  };

  const removeContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const updateOnboardingItem = (weekIndex: number, itemIndex: number, value: string) => {
    const updated = [...formData.onboarding_weeks];
    updated[weekIndex].items[itemIndex] = value;
    setFormData(prev => ({ ...prev, onboarding_weeks: updated }));
  };

  const addOnboardingItem = (weekIndex: number) => {
    const updated = [...formData.onboarding_weeks];
    updated[weekIndex].items.push('');
    setFormData(prev => ({ ...prev, onboarding_weeks: updated }));
  };

  const removeOnboardingItem = (weekIndex: number, itemIndex: number) => {
    const updated = [...formData.onboarding_weeks];
    updated[weekIndex].items = updated[weekIndex].items.filter((_, i) => i !== itemIndex);
    setFormData(prev => ({ ...prev, onboarding_weeks: updated }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.candidate_name && formData.position && formData.branch_id;
      case 2:
        return true;
      case 3:
        return formData.probation_duration && formData.probation_start_date && formData.probation_salary;
      case 4:
        return formData.probation_metrics.length > 0;
      case 5:
        return formData.final_interview_date && formData.final_interview_interviewer;
      case 6:
        return formData.onboarding_weeks.length > 0;
      case 7:
        return formData.contacts.length > 0 && formData.escalation_contact;
      case 8:
        return formData.password.length >= 4 && formData.representative_name;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">1. Информация о кандидате</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ФИО кандидата *</label>
              <input
                type="text"
                value={formData.candidate_name}
                onChange={(e) => setFormData(prev => ({ ...prev, candidate_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Должность *</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Филиал *</label>
              <select
                value={formData.branch_id}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Выберите филиал</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Адрес филиала</label>
              <input
                type="text"
                value={formData.branch_address}
                onChange={(e) => setFormData(prev => ({ ...prev, branch_address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="ул. Ахмад Дониш, 20А, Ташкент"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Подчинение</label>
              <input
                type="text"
                value={formData.reporting_to}
                onChange={(e) => setFormData(prev => ({ ...prev, reporting_to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">2. Результаты отбора</h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.screening_passed}
                  onChange={(e) => setFormData(prev => ({ ...prev, screening_passed: e.target.checked }))}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <div>
                  <span className="font-medium">Скрининг</span>
                  <span className={`ml-2 text-sm ${formData.screening_passed ? 'text-green-600' : 'text-gray-400'}`}>
                    {formData.screening_passed ? '✓ ПРОЙДЕН' : 'Не пройден'}
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.interview1_passed}
                  onChange={(e) => setFormData(prev => ({ ...prev, interview1_passed: e.target.checked }))}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <div>
                  <span className="font-medium">Интервью 1</span>
                  <span className={`ml-2 text-sm ${formData.interview1_passed ? 'text-green-600' : 'text-gray-400'}`}>
                    {formData.interview1_passed ? '✓ ПРОЙДЕН' : 'Не пройден'}
                  </span>
                </div>
              </label>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">3. Условия испытательного срока</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Продолжительность *</label>
                <select
                  value={formData.probation_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, probation_duration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="1 неделя">1 неделя</option>
                  <option value="2 недели">2 недели</option>
                  <option value="3 недели">3 недели</option>
                  <option value="1 месяц">1 месяц</option>
                  <option value="2 месяца">2 месяца</option>
                  <option value="3 месяца">3 месяца</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Рабочие часы</label>
                <input
                  type="text"
                  value={formData.working_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, working_hours: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="9:00 - 18:00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата начала *</label>
                <input
                  type="date"
                  value={formData.probation_start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, probation_start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата окончания</label>
                <input
                  type="date"
                  value={formData.probation_end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, probation_end_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Зарплата (испыт. срок) *</label>
              <input
                type="text"
                value={formData.probation_salary}
                onChange={(e) => setFormData(prev => ({ ...prev, probation_salary: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="2 000 000 сум (на руки)"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">4. Критерии оценки</h3>
              <button
                onClick={addMetric}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
              >
                <Plus size={16} /> Добавить
              </button>
            </div>

            <p className="text-sm text-gray-500">
              Метрики для оценки кандидата в течение испытательного срока
            </p>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {formData.probation_metrics.map((metric, index) => (
                <div key={index} className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={metric.metric}
                      onChange={(e) => updateMetric(index, 'metric', e.target.value)}
                      placeholder="Метрика"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      value={metric.expected_result}
                      onChange={(e) => updateMetric(index, 'expected_result', e.target.value)}
                      placeholder="Ожидаемый результат"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <button
                    onClick={() => removeMetric(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">5. Финальное интервью</h3>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-3">ДЕТАЛИ ФИНАЛЬНОГО ИНТЕРВЬЮ</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата *</label>
                  <input
                    type="date"
                    value={formData.final_interview_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, final_interview_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                  <input
                    type="time"
                    value={formData.final_interview_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, final_interview_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Интервьюер *</label>
                <input
                  type="text"
                  value={formData.final_interview_interviewer}
                  onChange={(e) => setFormData(prev => ({ ...prev, final_interview_interviewer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Цель</label>
                <textarea
                  value={formData.final_interview_purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, final_interview_purpose: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">6. Программа адаптации</h3>

            <div className="space-y-6 max-h-[450px] overflow-y-auto">
              {formData.onboarding_weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{week.title}</h4>
                      <p className="text-sm text-gray-500">{week.date_range}</p>
                    </div>
                    <button
                      onClick={() => addOnboardingItem(weekIndex)}
                      className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                    >
                      <Plus size={16} /> Добавить
                    </button>
                  </div>

                  <div className="space-y-2">
                    {week.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex gap-2">
                        <span className="text-gray-400 mt-2">{itemIndex + 1}.</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateOnboardingItem(weekIndex, itemIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          onClick={() => removeOnboardingItem(weekIndex, itemIndex)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">7. Контактные лица</h3>
              <button
                onClick={addContact}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
              >
                <Plus size={16} /> Добавить
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {formData.contacts.map((contact, index) => (
                <div key={index} className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-2">
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
                    onClick={() => removeContact(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-3">Эскалация вопросов</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Контактное лицо *</label>
                  <input
                    type="text"
                    value={formData.escalation_contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, escalation_contact: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
                  <input
                    type="text"
                    value={formData.escalation_contact_position}
                    onChange={(e) => setFormData(prev => ({ ...prev, escalation_contact_position: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Обращайтесь по любому вопросу, который не был решён в течение более 3 дней
              </p>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">8. Проверка и подпись</h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Кандидат:</span>
                <span className="font-medium">{formData.candidate_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Должность:</span>
                <span className="font-medium">{formData.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Филиал:</span>
                <span className="font-medium">{formData.branch_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Испыт. срок:</span>
                <span className="font-medium">{formData.probation_duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Зарплата:</span>
                <span className="font-medium">{formData.probation_salary}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Метрик:</span>
                <span className="font-medium">{formData.probation_metrics.length}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Представитель C-Space</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                  <input
                    type="text"
                    value={formData.representative_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, representative_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
                  <input
                    type="text"
                    value={formData.representative_position}
                    onChange={(e) => setFormData(prev => ({ ...prev, representative_position: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль для доступа *</label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-mono tracking-wider"
              />
              <p className="text-xs text-gray-500 mt-1">Минимум 4 символа</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Условия испытательного срока</h2>
            <p className="text-purple-200 text-sm">для {candidate.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-gray-50 px-4 py-3 border-b overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : isCompleted
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={16} />
                  <span>{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-between">
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <ChevronLeft size={20} />
            Назад
          </button>

          {currentStep < STEPS.length ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Далее
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle size={20} />
              Создать документ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
