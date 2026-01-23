'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Plus,
  X,
  Search,
  Download,
  Upload,
  Trash2,
  Edit,
  Eye,
  FileText,
  Mail,
  Phone,
  Brain,
  ChevronUp,
  ChevronDown,
  Filter,
  MoreVertical,
  LayoutGrid,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import type { Candidate, CandidateStage, ChecklistItem } from '@/lib/db';

const STAGES: { id: CandidateStage; label: string; color: string; bgColor: string }[] = [
  { id: 'screening', label: 'Screening', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  { id: 'interview_1', label: 'Interview 1', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  { id: 'under_review', label: 'Under Review', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  { id: 'probation', label: 'Probation', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  { id: 'interview_2', label: 'Interview 2', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  { id: 'hired', label: 'Hired', color: 'text-green-700', bgColor: 'bg-green-50' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50' },
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

function getStageConfig(stage: CandidateStage) {
  return STAGES.find(s => s.id === stage) || STAGES[0];
}

type SortField = 'full_name' | 'email' | 'applied_role' | 'stage' | 'iq_score' | 'mbti_type' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function RecruitmentTablePage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<CandidateStage | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    fetchCandidates();
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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
      }
    } catch (error) {
      console.error('Error changing stage:', error);
    }
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

  const handleViewResume = async (candidateId: string) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resume`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, '_blank');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to get resume');
      }
    } catch (error) {
      console.error('Error viewing resume:', error);
      alert('Failed to view resume');
    }
  };

  const openEditMode = (candidate: Candidate) => {
    setResumeFile(null);
    setSelectedCandidate(candidate);
    setFormData({
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone || '',
      iq_score: candidate.iq_score?.toString() || '',
      mbti_type: candidate.mbti_type || '',
      applied_role: candidate.applied_role,
      about: candidate.about || '',
      source: candidate.source || '',
      notes: candidate.notes || '',
    });
    setIsEditMode(true);
  };

  // Filter and sort candidates
  const filteredCandidates = candidates
    .filter(c => {
      const matchesSearch =
        c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.applied_role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === 'all' || c.stage === stageFilter;
      return matchesSearch && matchesStage;
    })
    .sort((a, b) => {
      let aVal: string | number | null = a[sortField];
      let bVal: string | number | null = b[sortField];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={14} className="text-gray-300" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-purple-600" />
      : <ChevronDown size={14} className="text-purple-600" />;
  };

  return (
    <div className="p-3 sm:p-6 min-h-screen bg-gray-50">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <Users className="text-purple-600" size={24} />
            Candidates
          </h1>
          <p className="text-gray-600 text-sm mt-1 hidden sm:block">
            View and manage all candidates in a table format
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/recruitment/board"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Board</span>
          </Link>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} />
            <span className="hidden xs:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Search and Filters - Mobile Optimized */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600"
          >
            <Filter size={16} />
            Filter
            {stageFilter !== 'all' && (
              <span className="w-2 h-2 bg-purple-600 rounded-full" />
            )}
          </button>

          {/* Desktop Filter */}
          <div className="hidden sm:flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as CandidateStage | 'all')}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Stages</option>
              {STAGES.map(stage => (
                <option key={stage.id} value={stage.id}>{stage.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile Filter Dropdown */}
        {showFilters && (
          <div className="sm:hidden mt-3 pt-3 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-2">Filter by Stage</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setStageFilter('all'); setShowFilters(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  stageFilter === 'all'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                All
              </button>
              {STAGES.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => { setStageFilter(stage.id); setShowFilters(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    stageFilter === stage.id
                      ? `${stage.bgColor} ${stage.color}`
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table - Desktop / Cards - Mobile */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-lg">No candidates found</p>
            <p className="text-sm mt-1">
              {searchQuery || stageFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first candidate to get started'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('full_name')}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        <SortIcon field="full_name" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('applied_role')}
                    >
                      <div className="flex items-center gap-1">
                        Role
                        <SortIcon field="applied_role" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('stage')}
                    >
                      <div className="flex items-center gap-1">
                        Stage
                        <SortIcon field="stage" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('iq_score')}
                    >
                      <div className="flex items-center gap-1">
                        Assessment
                        <SortIcon field="iq_score" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Resume
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCandidates.map((candidate) => {
                    const stageConfig = getStageConfig(candidate.stage);
                    return (
                      <tr
                        key={candidate.id}
                        onClick={() => openEditMode(candidate)}
                        className="hover:bg-purple-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-purple-700 font-semibold text-sm">
                                {candidate.full_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{candidate.full_name}</p>
                              <p className="text-sm text-gray-500">{candidate.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {candidate.applied_role}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${stageConfig.bgColor} ${stageConfig.color}`}>
                            {stageConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.iq_score && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                                IQ: {candidate.iq_score}
                              </span>
                            )}
                            {candidate.mbti_type && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                                {candidate.mbti_type}
                              </span>
                            )}
                            {!candidate.iq_score && !candidate.mbti_type && (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {candidate.source ? (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {candidate.source}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {candidate.resume_file_name ? (
                            <span className="text-green-600 text-sm flex items-center gap-1">
                              <FileText size={14} />
                              <span className="truncate max-w-[100px]">{candidate.resume_file_name}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredCandidates.map((candidate) => {
                const stageConfig = getStageConfig(candidate.stage);
                return (
                  <div
                    key={candidate.id}
                    onClick={() => openEditMode(candidate)}
                    className="p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-700 font-semibold">
                          {candidate.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{candidate.full_name}</p>
                            <p className="text-sm text-gray-500 truncate">{candidate.applied_role}</p>
                          </div>
                          <ChevronRight size={18} className="text-gray-400 flex-shrink-0 mt-1" />
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${stageConfig.bgColor} ${stageConfig.color}`}>
                            {stageConfig.label}
                          </span>
                          {candidate.iq_score && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                              IQ: {candidate.iq_score}
                            </span>
                          )}
                          {candidate.mbti_type && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                              {candidate.mbti_type}
                            </span>
                          )}
                          {candidate.source && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {candidate.source}
                            </span>
                          )}
                          {candidate.resume_file_name && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full flex items-center gap-1">
                              <FileText size={10} />
                              CV
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Table footer with count */}
        {!loading && filteredCandidates.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Showing {filteredCandidates.length} of {candidates.length} candidates
          </div>
        )}
      </div>

      {/* Add Candidate Modal - Mobile Optimized */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">Add New Candidate</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 -mr-2">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCandidate} className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MBTI Type</label>
                  <select
                    value={formData.mbti_type}
                    onChange={(e) => setFormData({ ...formData, mbti_type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
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
                    id="resume-upload-table"
                  />
                  <label htmlFor="resume-upload-table" className="cursor-pointer">
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-2 text-purple-600">
                        <FileText size={20} />
                        <span className="truncate max-w-[200px]">{resumeFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        <Upload size={24} className="mx-auto mb-2" />
                        <p className="text-sm">Tap to upload resume</p>
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-base"
                  placeholder="Notes about the candidate..."
                />
              </div>

              {/* Sticky Footer for Mobile */}
              <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-4 bg-white border-t mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-3 text-gray-600 border border-gray-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {processing ? 'Adding...' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/View Candidate Modal - Mobile Optimized */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">{isEditMode ? 'Edit Candidate' : 'Candidate Details'}</h2>
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <button
                    onClick={() => openEditMode(selectedCandidate)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Edit size={18} />
                  </button>
                )}
                <button
                  onClick={() => { setSelectedCandidate(null); setIsEditMode(false); }}
                  className="p-2 text-gray-400 hover:text-gray-600 -mr-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {isEditMode ? (
              <form onSubmit={handleUpdateCandidate} className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Applied Role</label>
                    <select
                      required
                      value={formData.applied_role}
                      onChange={(e) => setFormData({ ...formData, applied_role: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
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
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MBTI Type</label>
                    <select
                      value={formData.mbti_type}
                      onChange={(e) => setFormData({ ...formData, mbti_type: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                    >
                      <option value="">Select MBTI...</option>
                      {MBTI_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                    >
                      <option value="">Select source...</option>
                      {SOURCE_OPTIONS.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                    <select
                      value={selectedCandidate?.stage || 'screening'}
                      onChange={(e) => handleStageChange(selectedCandidate!.id, e.target.value as CandidateStage)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                    >
                      {STAGES.map(stage => (
                        <option key={stage.id} value={stage.id}>{stage.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Resume Upload */}
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resume / CV</label>

                  {selectedCandidate?.resume_file_name && !resumeFile && (
                    <div className="flex items-center justify-between mb-3 p-2 bg-white rounded border">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={18} className="text-red-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{selectedCandidate.resume_file_name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewResume(selectedCandidate.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-lg flex-shrink-0"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </div>
                  )}

                  {resumeFile && (
                    <div className="flex items-center justify-between mb-3 p-2 bg-purple-50 rounded border border-purple-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={18} className="text-purple-500 flex-shrink-0" />
                        <span className="text-sm text-purple-700 truncate">{resumeFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResumeFile(null)}
                        className="text-red-500 hover:text-red-700 text-sm flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="text-center">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="resume-upload-edit"
                    />
                    <label
                      htmlFor="resume-upload-edit"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                      <Upload size={16} />
                      {selectedCandidate?.resume_file_name ? 'Replace Resume' : 'Upload Resume'}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.about}
                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none text-base"
                    placeholder="Internal notes about this candidate..."
                  />
                </div>

                {/* Sticky Footer */}
                <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-4 bg-white border-t mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsEditMode(false); setResumeFile(null); }}
                    className="flex-1 px-4 py-3 text-gray-600 border border-gray-300 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {processing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-700 font-bold text-xl">
                      {selectedCandidate.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900">{selectedCandidate.full_name}</h3>
                    <p className="text-gray-600">{selectedCandidate.applied_role}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-sm text-gray-500">
                      <a href={`mailto:${selectedCandidate.email}`} className="flex items-center gap-1 hover:text-purple-600 truncate">
                        <Mail size={14} className="flex-shrink-0" />
                        <span className="truncate">{selectedCandidate.email}</span>
                      </a>
                      {selectedCandidate.phone && (
                        <a href={`tel:${selectedCandidate.phone}`} className="flex items-center gap-1 hover:text-purple-600">
                          <Phone size={14} />
                          {selectedCandidate.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-500">IQ Score</p>
                    <p className="font-medium">{selectedCandidate.iq_score || 'Not tested'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">MBTI Type</p>
                    <p className="font-medium">{selectedCandidate.mbti_type || 'Not assessed'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stage</p>
                    <span className={`inline-flex px-2 py-0.5 rounded text-sm font-medium ${getStageConfig(selectedCandidate.stage).bgColor} ${getStageConfig(selectedCandidate.stage).color}`}>
                      {getStageConfig(selectedCandidate.stage).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Source</p>
                    <p className="font-medium">{selectedCandidate.source || 'Unknown'}</p>
                  </div>
                </div>

                {/* About */}
                {selectedCandidate.about && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">About</h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedCandidate.about}</p>
                  </div>
                )}

                {/* Resume */}
                {selectedCandidate.resume_file_name && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <FileText size={16} />
                      Resume
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{selectedCandidate.resume_file_name}</p>
                        {selectedCandidate.resume_file_size && (
                          <p className="text-xs text-gray-500">{formatFileSize(selectedCandidate.resume_file_size)}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleViewResume(selectedCandidate.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg flex-shrink-0"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-gray-400 pt-2 border-t">
                  <p>Added: {formatDate(selectedCandidate.created_at)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
