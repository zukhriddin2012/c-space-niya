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
} from 'lucide-react';
import Link from 'next/link';
import type { Candidate, CandidateStage, ChecklistItem } from '@/lib/db';

const STAGES: { id: CandidateStage; label: string; color: string; bgColor: string }[] = [
  { id: 'screening', label: 'Screening', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  { id: 'interview_1', label: 'Interview 1', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  { id: 'interview_2', label: 'Interview 2', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  { id: 'under_review', label: 'Under Review', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  { id: 'probation', label: 'Probation', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
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

  const openEditMode = (candidate: Candidate) => {
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

      // Handle null values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Compare
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
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="text-purple-600" size={28} />
            Candidates Database
          </h1>
          <p className="text-gray-600 mt-1">
            View and manage all candidates in a table format
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/recruitment/board"
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Switch to Board
          </Link>
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as CandidateStage | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Stages</option>
              {STAGES.map(stage => (
                <option key={stage.id} value={stage.id}>{stage.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
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
          <div className="overflow-x-auto">
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
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-1">
                      Email
                      <SortIcon field="email" />
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
                      onClick={() => setSelectedCandidate(candidate)}
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
        )}

        {/* Table footer with count */}
        {!loading && filteredCandidates.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Showing {filteredCandidates.length} of {candidates.length} candidates
          </div>
        )}
      </div>

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
                    id="resume-upload-table"
                  />
                  <label htmlFor="resume-upload-table" className="cursor-pointer">
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

      {/* Edit/View Candidate Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {isEditMode ? (
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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

                  {/* Current file */}
                  {selectedCandidate?.resume_file_name && !resumeFile && (
                    <div className="flex items-center justify-between mb-3 p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-red-500" />
                        <span className="text-sm text-gray-700">{selectedCandidate.resume_file_name}</span>
                        {selectedCandidate.resume_file_size && (
                          <span className="text-xs text-gray-400">({formatFileSize(selectedCandidate.resume_file_size)})</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* New file selected */}
                  {resumeFile && (
                    <div className="flex items-center justify-between mb-3 p-2 bg-purple-50 rounded border border-purple-200">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-purple-500" />
                        <span className="text-sm text-purple-700">{resumeFile.name}</span>
                        <span className="text-xs text-purple-500">(new)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResumeFile(null)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Upload button */}
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
                    <p className="text-xs text-gray-400 mt-2">PDF, DOC, DOCX up to 10MB</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.about}
                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Internal notes about this candidate..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => { setIsEditMode(false); setResumeFile(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" disabled={processing} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                    {processing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-700 font-bold text-xl">
                      {selectedCandidate.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{selectedCandidate.full_name}</h3>
                    <p className="text-gray-600">{selectedCandidate.applied_role}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <a href={`mailto:${selectedCandidate.email}`} className="flex items-center gap-1 hover:text-purple-600">
                        <Mail size={14} />
                        {selectedCandidate.email}
                      </a>
                      {selectedCandidate.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={14} />
                          {selectedCandidate.phone}
                        </span>
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
                      <div>
                        <p className="text-sm font-medium">{selectedCandidate.resume_file_name}</p>
                        {selectedCandidate.resume_file_size && (
                          <p className="text-xs text-gray-500">{formatFileSize(selectedCandidate.resume_file_size)}</p>
                        )}
                      </div>
                      <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg">
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
