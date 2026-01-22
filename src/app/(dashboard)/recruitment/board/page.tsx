'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Plus,
  X,
  Search,
  Filter,
  GripVertical,
  FileText,
  Mail,
  Phone,
  Brain,
  User,
  Calendar,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  Folder,
  Star,
  ArrowRight,
  Table,
  MessageSquare,
} from 'lucide-react';
import type { Candidate, CandidateStage, ChecklistItem } from '@/lib/db';
import CandidateDetailModal from '@/components/CandidateDetailModal';

const STAGES: { id: CandidateStage; label: string; color: string; bgColor: string }[] = [
  { id: 'screening', label: 'Screening', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  { id: 'interview_1', label: 'Interview 1', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  { id: 'under_review', label: 'Under Review', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  { id: 'probation', label: 'Probation', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' },
  { id: 'interview_2', label: 'Interview 2', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  { id: 'hired', label: 'Hired', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
];

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

const ROLE_OPTIONS = [
  'Community Manager',
  'Software Developer',
  'Marketing Manager',
  'Sales Representative',
  'Customer Support',
  'HR Manager',
  'Designer',
  'Project Manager',
  'Other',
];

const SOURCE_OPTIONS = [
  'LinkedIn',
  'Referral',
  'Job Board',
  'Company Website',
  'Social Media',
  'Other',
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatEventDate(dateString: string): { text: string; isOverdue: boolean; isToday: boolean; isTomorrow: boolean } {
  const eventDate = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

  const isOverdue = eventDate < now;
  const isTomorrow = eventDay.getTime() === tomorrow.getTime();
  const isToday = eventDay.getTime() === today.getTime();

  if (isToday) {
    return {
      text: 'Today',
      isOverdue: false,
      isToday: true,
      isTomorrow: false,
    };
  }

  if (isTomorrow) {
    return {
      text: 'Tomorrow',
      isOverdue: false,
      isToday: false,
      isTomorrow: true,
    };
  }

  const text = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return { text, isOverdue, isToday: false, isTomorrow: false };
}

function getDaysInStage(createdAt: string, stageChangedAt?: string | null): number {
  const startDate = stageChangedAt ? new Date(stageChangedAt) : new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

const SOURCE_COLORS: Record<string, string> = {
  'LinkedIn': 'bg-purple-100 text-purple-600',
  'Referral': 'bg-green-100 text-green-600',
  'Job Board': 'bg-blue-100 text-blue-600',
  'Company Website': 'bg-gray-100 text-gray-600',
  'Telegram': 'bg-sky-100 text-sky-600',
  'Social Media': 'bg-pink-100 text-pink-600',
  'Other': 'bg-gray-100 text-gray-600',
};

export default function RecruitmentBoardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [draggedCandidate, setDraggedCandidate] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    byStage: Record<CandidateStage, number>;
    thisMonth: number;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    iq_score: '',
    mbti_type: '',
    applied_role: '',
    about: '',
    source: '',
    notes: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProcessing, setImportProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    total: number;
    errors?: string[];
  } | null>(null);

  useEffect(() => {
    fetchCandidates();
    fetchStats();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/candidates');
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/candidates/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) submitData.append(key, value);
      });
      if (resumeFile) {
        submitData.append('resume', resumeFile);
      }

      const res = await fetch('/api/candidates', {
        method: 'POST',
        body: submitData,
      });

      if (res.ok) {
        resetForm();
        setIsAddModalOpen(false);
        fetchCandidates();
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add candidate');
      }
    } catch (error) {
      console.error('Error adding candidate:', error);
      alert('Failed to add candidate');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    setProcessing(true);
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });
      if (resumeFile) {
        submitData.append('resume', resumeFile);
      }

      const res = await fetch(`/api/candidates/${selectedCandidate.id}`, {
        method: 'PUT',
        body: submitData,
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedCandidate(data.candidate);
        setIsEditMode(false);
        fetchCandidates();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update candidate');
      }
    } catch (error) {
      console.error('Error updating candidate:', error);
      alert('Failed to update candidate');
    } finally {
      setProcessing(false);
    }
  };

  const handleStageChange = async (candidateId: string, newStage: CandidateStage) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      if (res.ok) {
        const data = await res.json();
        if (selectedCandidate?.id === candidateId) {
          setSelectedCandidate(data.candidate);
        }
        fetchCandidates();
        fetchStats();
      }
    } catch (error) {
      console.error('Error changing stage:', error);
    }
  };

  const handleChecklistUpdate = async (candidateId: string, checklist: ChecklistItem[]) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist }),
      });

      if (res.ok) {
        const data = await res.json();
        if (selectedCandidate?.id === candidateId) {
          setSelectedCandidate(data.candidate);
        }
        fetchCandidates();
      }
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const handleHire = async (candidateId: string) => {
    if (!confirm('Are you sure you want to hire this candidate? An employee account will be created.')) {
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employment_type: 'full-time' }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Candidate hired successfully!');
        setSelectedCandidate(null);
        fetchCandidates();
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to hire candidate');
      }
    } catch (error) {
      console.error('Error hiring candidate:', error);
      alert('Failed to hire candidate');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (candidateId: string) => {
    if (!confirm('Are you sure you want to reject this candidate?')) {
      return;
    }
    await handleStageChange(candidateId, 'rejected');
    setSelectedCandidate(null);
  };

  const handleDelete = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSelectedCandidate(null);
        fetchCandidates();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting candidate:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      iq_score: '',
      mbti_type: '',
      applied_role: '',
      about: '',
      source: '',
      notes: '',
    });
    setResumeFile(null);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImportProcessing(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/candidates/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setImportResult({
          imported: data.imported,
          skipped: data.skipped,
          total: data.total,
          errors: data.errors,
        });
        fetchCandidates();
        fetchStats();
      } else {
        setImportResult({
          imported: 0,
          skipped: 0,
          total: 0,
          errors: [data.error || 'Failed to import'],
        });
      }
    } catch (error) {
      console.error('Error importing candidates:', error);
      setImportResult({
        imported: 0,
        skipped: 0,
        total: 0,
        errors: ['Network error - please try again'],
      });
    } finally {
      setImportProcessing(false);
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportResult(null);
  };

  const openEditMode = () => {
    if (!selectedCandidate) return;
    setFormData({
      full_name: selectedCandidate.full_name,
      email: selectedCandidate.email,
      phone: selectedCandidate.phone || '',
      iq_score: selectedCandidate.iq_score?.toString() || '',
      mbti_type: selectedCandidate.mbti_type || '',
      applied_role: selectedCandidate.applied_role,
      about: selectedCandidate.about || '',
      source: selectedCandidate.source || '',
      notes: selectedCandidate.notes || '',
    });
    setIsEditMode(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    setDraggedCandidate(candidateId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStage: CandidateStage) => {
    e.preventDefault();
    if (draggedCandidate) {
      await handleStageChange(draggedCandidate, targetStage);
      setDraggedCandidate(null);
    }
  };

  const filteredCandidates = candidates.filter(c =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.applied_role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCandidatesByStage = (stage: CandidateStage) => {
    const stageCandidates = filteredCandidates.filter(c => c.stage === stage);

    // For rejected and hired, only show the last 5 (most recent by stage_changed_at or created_at)
    if (stage === 'rejected' || stage === 'hired') {
      return stageCandidates
        .sort((a, b) => {
          const dateA = new Date(a.stage_changed_at || a.created_at).getTime();
          const dateB = new Date(b.stage_changed_at || b.created_at).getTime();
          return dateB - dateA; // Most recent first
        })
        .slice(0, 5);
    }

    return stageCandidates;
  };

  const getChecklistProgress = (checklist: ChecklistItem[]) => {
    if (!checklist || checklist.length === 0) return null;
    const completed = checklist.filter(item => item.completed).length;
    return { completed, total: checklist.length };
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="text-purple-600" size={28} />
            Recruitment Pipeline
          </h1>
          <p className="text-gray-600 mt-1">
            Track and manage candidates through the hiring process
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/recruitment/table"
            className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Table size={18} />
            Switch to Table
          </Link>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload size={18} />
            Import CSV
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={18} />
            Add Candidate
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Candidates</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.byStage.screening + stats.byStage.interview_1 + stats.byStage.interview_2 + stats.byStage.under_review}
                </p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <AlertCircle size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.byStage.probation}</p>
                <p className="text-sm text-gray-500">In Probation</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.byStage.hired}</p>
                <p className="text-sm text-gray-500">Hired</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4">
            {STAGES.map((stage) => {
              const stageCandidates = getCandidatesByStage(stage.id);
              return (
                <div
                  key={stage.id}
                  className="w-[300px] shrink-0 flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  {/* Column Header */}
                  <div className={`px-4 py-3 rounded-t-xl border-2 ${stage.bgColor}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold ${stage.color}`}>{stage.label}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${stage.bgColor} ${stage.color}`}>
                        {stageCandidates.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Body - Fixed Height, Scrollable */}
                  <div className="bg-gray-100 rounded-b-xl p-3 h-[600px] overflow-y-auto space-y-3">
                    {stageCandidates.map((candidate) => {
                      const checklistProgress = getChecklistProgress(candidate.checklist);
                      const daysInStage = getDaysInStage(candidate.created_at, candidate.stage_changed_at);
                      return (
                        <div
                          key={candidate.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, candidate.id)}
                          onClick={() => setSelectedCandidate(candidate)}
                          className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow ${
                            draggedCandidate === candidate.id ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-purple-700 font-semibold">
                                {candidate.full_name.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{candidate.full_name}</p>
                              <p className="text-sm text-gray-500">{candidate.applied_role}</p>

                              {/* Labels Row */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {/* Source Label */}
                                {candidate.source && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLORS[candidate.source] || SOURCE_COLORS['Other']}`}>
                                    {candidate.source}
                                  </span>
                                )}

                                {/* Days in Stage */}
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                                  {daysInStage}d
                                </span>

                                {/* Event Badge */}
                                {candidate.next_event_at && (
                                  (() => {
                                    const eventInfo = formatEventDate(candidate.next_event_at);
                                    return (
                                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                        eventInfo.isOverdue
                                          ? 'bg-red-100 text-red-600'
                                          : eventInfo.isToday || eventInfo.isTomorrow
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-orange-100 text-orange-600'
                                      }`}>
                                        <Calendar size={10} />
                                        {eventInfo.isOverdue ? 'Overdue' : eventInfo.text}
                                      </span>
                                    );
                                  })()
                                )}

                                {/* Comment Count */}
                                {(candidate.comment_count ?? 0) > 0 && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                                    <MessageSquare size={10} />
                                    {candidate.comment_count}
                                  </span>
                                )}

                                {/* IQ Score */}
                                {candidate.iq_score && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">
                                    IQ: {candidate.iq_score}
                                  </span>
                                )}

                                {/* MBTI Type */}
                                {candidate.mbti_type && (
                                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                                    {candidate.mbti_type}
                                  </span>
                                )}
                              </div>

                              {/* Checklist Progress (Probation) */}
                              {checklistProgress && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Checklist</span>
                                    <span>{checklistProgress.completed}/{checklistProgress.total}</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-green-500 rounded-full transition-all"
                                      style={{ width: `${(checklistProgress.completed / checklistProgress.total) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {stageCandidates.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No candidates
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add New Candidate</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCandidate} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Applied Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.applied_role}
                    onChange={(e) => setFormData({ ...formData, applied_role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select role...</option>
                    {ROLE_OPTIONS.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IQ Score</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={formData.iq_score}
                    onChange={(e) => setFormData({ ...formData, iq_score: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MBTI Type</label>
                  <select
                    value={formData.mbti_type}
                    onChange={(e) => setFormData({ ...formData, mbti_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select MBTI...</option>
                    {MBTI_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select source...</option>
                  {SOURCE_OPTIONS.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resume</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-2 text-purple-600">
                        <FileText size={20} />
                        <span>{resumeFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        <Upload size={24} className="mx-auto mb-2" />
                        <p className="text-sm">Click to upload resume (PDF, DOC, DOCX)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
                <textarea
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Notes about the candidate..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {processing ? 'Adding...' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Upload size={20} className="text-purple-600" />
                Import Candidates from CSV
              </h2>
              <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {!importResult ? (
                <>
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      {importFile ? (
                        <div className="flex items-center justify-center gap-2 text-purple-600">
                          <FileText size={24} />
                          <div>
                            <p className="font-medium">{importFile.name}</p>
                            <p className="text-sm text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <Upload size={32} className="mx-auto mb-2" />
                          <p className="font-medium">Click to upload CSV file</p>
                          <p className="text-sm mt-1">or drag and drop</p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Expected Format */}
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-gray-700 mb-1">Expected columns:</p>
                    <p className="text-gray-500 text-xs">
                      Candidate name, IQ, MBTi, Role, Stage, About, Candidate Email
                    </p>
                  </div>

                  {/* Import Button */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={closeImportModal}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={!importFile || importProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          Import
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Import Results */}
                  <div className="text-center py-4">
                    {importResult.imported > 0 ? (
                      <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
                    ) : (
                      <AlertCircle size={48} className="mx-auto text-yellow-500 mb-3" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete</h3>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total rows processed:</span>
                      <span className="font-medium">{importResult.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Successfully imported:</span>
                      <span className="font-medium text-green-600">{importResult.imported}</span>
                    </div>
                    {importResult.skipped > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-600">Skipped (duplicates):</span>
                        <span className="font-medium text-yellow-600">{importResult.skipped}</span>
                      </div>
                    )}
                  </div>

                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                      <p className="text-sm font-medium text-red-700 mb-1">Errors:</p>
                      <ul className="text-xs text-red-600 space-y-1">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={closeImportModal}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && !isEditMode && (
        <CandidateDetailModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onStageChange={handleStageChange}
          onChecklistUpdate={handleChecklistUpdate}
          onHire={handleHire}
          onReject={handleReject}
          onDelete={handleDelete}
          onEdit={openEditMode}
          onRefresh={() => {
            fetchCandidates();
            fetchStats();
          }}
          processing={processing}
        />
      )}

      {/* Edit Candidate Modal */}
      {selectedCandidate && isEditMode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Candidate</h2>
              <button onClick={() => setIsEditMode(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCandidate} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applied Role</label>
                  <select
                    required
                    value={formData.applied_role}
                    onChange={(e) => setFormData({ ...formData, applied_role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select role...</option>
                    {ROLE_OPTIONS.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IQ Score</label>
                  <input
                    type="number"
                    value={formData.iq_score}
                    onChange={(e) => setFormData({ ...formData, iq_score: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MBTI Type</label>
                  <select
                    value={formData.mbti_type}
                    onChange={(e) => setFormData({ ...formData, mbti_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select MBTI...</option>
                    {MBTI_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
                <textarea
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsEditMode(false)} className="px-4 py-2 text-gray-600">
                  Cancel
                </button>
                <button type="submit" disabled={processing} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {processing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
