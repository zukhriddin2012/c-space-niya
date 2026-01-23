'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Phone,
  Brain,
  FileText,
  Download,
  CheckSquare,
  Square,
  CheckCircle,
  Trash2,
  Edit,
  Clock,
  MessageSquare,
  Calendar,
  Plus,
  Send,
  FileSignature,
  UserPlus,
  Play,
  Link,
  Copy,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { Candidate, CandidateStage, ChecklistItem, CandidateComment, CandidateEvent } from '@/lib/db';
import AddEmployeeModal from './AddEmployeeModal';
import TermSheetFormModal, { TermSheetData } from './TermSheetFormModal';
import ProbationTermSheetFormModal, { ProbationTermSheetData } from './ProbationTermSheetFormModal';

const STAGES: { id: CandidateStage; label: string; color: string; bgColor: string }[] = [
  { id: 'screening', label: 'Screening', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  { id: 'interview_1', label: 'Interview 1', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  { id: 'under_review', label: 'Under Review', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  { id: 'probation', label: 'Probation', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' },
  { id: 'interview_2', label: 'Interview 2', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
  { id: 'hired', label: 'Hired', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
];

const STAGE_TAG_COLORS: Record<string, string> = {
  screening: 'bg-blue-100 text-blue-600',
  interview_1: 'bg-purple-100 text-purple-600',
  interview_2: 'bg-indigo-100 text-indigo-600',
  under_review: 'bg-orange-100 text-orange-600',
  probation: 'bg-yellow-100 text-yellow-600',
  general: 'bg-gray-100 text-gray-600',
};

interface CandidateDetailModalProps {
  candidate: Candidate;
  onClose: () => void;
  onStageChange: (candidateId: string, stage: CandidateStage) => Promise<void>;
  onChecklistUpdate: (candidateId: string, checklist: ChecklistItem[]) => Promise<void>;
  onHire: (candidateId: string) => Promise<void>;
  onDelete: (candidateId: string) => Promise<void>;
  currentUser?: { name: string; role?: string } | null;
  onEdit: () => void;
  onRefresh: () => void;
  processing: boolean;
}

type TabType = 'overview' | 'comments' | 'checklist' | 'schedule';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateString);
}

export default function CandidateDetailModal({
  candidate,
  onClose,
  onStageChange,
  onChecklistUpdate,
  onHire,
  onDelete,
  onEdit,
  onRefresh,
  processing,
  currentUser,
}: CandidateDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [comments, setComments] = useState<CandidateComment[]>([]);
  const [events, setEvents] = useState<CandidateEvent[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentStageTag, setCommentStageTag] = useState<string>(candidate.stage);
  const [postingComment, setPostingComment] = useState(false);

  // New event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'interview' as CandidateEvent['event_type'],
    scheduled_at: '',
  });
  const [addingEvent, setAddingEvent] = useState(false);

  // New checklist item
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Probation workflow
  const [probationLoading, setProbationLoading] = useState(false);
  const [editingProbationDates, setEditingProbationDates] = useState(false);
  const [probationDates, setProbationDates] = useState({
    start: candidate.probation_start_date || '',
    end: candidate.probation_end_date || '',
  });
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  // Document signing
  const [documents, setDocuments] = useState<{
    id: string;
    document_type: string;
    candidate_name: string;
    probation_start_date: string | null;
    signing_token: string;
    access_password: string;
    status: string;
    signed_at: string | null;
    recruiter_signed_at: string | null;
    recruiter_signed_by: string | null;
    created_at: string;
  }[]>([]);

  // Helper function to format document display name
  const getDocumentDisplayName = (doc: { candidate_name: string; document_type: string; probation_start_date: string | null }) => {
    const name = doc.candidate_name || candidate.full_name;
    const docType = doc.document_type === 'probation_term_sheet' ? 'Probation Term Sheet' : doc.document_type;
    const date = doc.probation_start_date ? formatDate(doc.probation_start_date) : '';
    return date ? `${name}_${docType}_${date}` : `${name}_${docType}`;
  };
  const [showRecruiterSignModal, setShowRecruiterSignModal] = useState(false);
  const [selectedDocForSigning, setSelectedDocForSigning] = useState<string | null>(null);
  const [recruiterSignature, setRecruiterSignature] = useState({
    name: currentUser?.name || '',
    position: currentUser?.role || '',
    type: 'draw' as 'draw' | 'type',
    data: '',
  });
  const [signingDocument, setSigningDocument] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update signature info when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setRecruiterSignature(prev => ({
        ...prev,
        name: currentUser.name || prev.name,
        position: currentUser.role || prev.position,
      }));
    }
  }, [currentUser]);

  // Canvas drawing functions - get coordinates adjusted for canvas scaling
  const getCanvasCoordinates = (canvas: HTMLCanvasElement, e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(canvas, e);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(canvas, e);

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1f2937';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const data = canvas.toDataURL('image/png');
      setRecruiterSignature(prev => ({ ...prev, data }));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setRecruiterSignature(prev => ({ ...prev, data: '' }));
  };
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [creatingDocument, setCreatingDocument] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentPassword, setDocumentPassword] = useState('');
  const [showTermSheetForm, setShowTermSheetForm] = useState(false);
  const [showProbationTermSheetForm, setShowProbationTermSheetForm] = useState(false);
  const [showDocumentTypeSelection, setShowDocumentTypeSelection] = useState(false);

  // Sync probation dates when candidate data changes (after refresh)
  useEffect(() => {
    setProbationDates({
      start: candidate.probation_start_date || '',
      end: candidate.probation_end_date || '',
    });
  }, [candidate.probation_start_date, candidate.probation_end_date]);

  // Fetch documents for all candidates (Documents section is always visible)
  useEffect(() => {
    fetchDocuments();
  }, [candidate.id]);

  const fetchDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleCreateSigningLink = async () => {
    // Fetch branches first
    try {
      const res = await fetch('/api/branches');
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
    // Show document type selection modal
    setShowDocumentTypeSelection(true);
  };

  const handleSelectDocumentType = (type: 'full_term_sheet' | 'probation_term_sheet') => {
    setShowDocumentTypeSelection(false);
    if (type === 'full_term_sheet') {
      setShowTermSheetForm(true);
    } else {
      setShowProbationTermSheetForm(true);
    }
  };

  const handleSubmitTermSheet = async (data: TermSheetData) => {
    setCreatingDocument(true);
    setShowTermSheetForm(false);
    setDocumentPassword(data.password);

    try {
      const res = await fetch(`/api/candidates/${candidate.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        setSigningUrl(result.signing_url);
        setShowDocumentModal(true);
        fetchDocuments();
      } else {
        const result = await res.json();
        alert(result.error || 'Failed to create Term Sheet');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create Term Sheet');
    } finally {
      setCreatingDocument(false);
    }
  };

  const handleSubmitProbationTermSheet = async (data: ProbationTermSheetData) => {
    setCreatingDocument(true);
    setShowProbationTermSheetForm(false);
    setDocumentPassword(data.password);

    try {
      const res = await fetch(`/api/candidates/${candidate.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        setSigningUrl(result.signing_url);
        setShowDocumentModal(true);
        fetchDocuments();
      } else {
        const result = await res.json();
        alert(result.error || 'Failed to create Probation Term Sheet');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create Probation Term Sheet');
    } finally {
      setCreatingDocument(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  const handleOpenRecruiterSign = (docId: string) => {
    setSelectedDocForSigning(docId);
    setRecruiterSignature({
      name: currentUser?.name || '',
      position: currentUser?.role || '',
      type: 'draw',
      data: '',
    });
    setShowRecruiterSignModal(true);
  };

  const handleRecruiterSign = async () => {
    if (!selectedDocForSigning) return;
    if (!recruiterSignature.name.trim()) {
      alert('Пожалуйста, введите ваше имя');
      return;
    }

    setSigningDocument(true);
    try {
      // Create signature data
      const signatureData = recruiterSignature.type === 'type'
        ? JSON.stringify({ type: 'typed', name: recruiterSignature.name, style: 1 })
        : recruiterSignature.data;

      const res = await fetch(`/api/candidates/${candidate.id}/documents/${selectedDocForSigning}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_type: recruiterSignature.type,
          signature_data: signatureData,
          signer_name: recruiterSignature.name,
          signer_position: recruiterSignature.position,
        }),
      });

      if (res.ok) {
        setShowRecruiterSignModal(false);
        setSelectedDocForSigning(null);
        fetchDocuments();
        alert('Документ подписан! Теперь вы можете отправить ссылку кандидату.');
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка подписания документа');
      }
    } catch (error) {
      console.error('Error signing document:', error);
      alert('Ошибка подписания документа');
    } finally {
      setSigningDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Удалить эту ссылку для подписания?')) return;

    try {
      const res = await fetch(`/api/candidates/${candidate.id}/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchDocuments();
      } else {
        alert('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const handleProbationAction = async (action: string, extraData?: Record<string, string>) => {
    setProbationLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/probation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      });
      if (res.ok) {
        onRefresh();
        setEditingProbationDates(false);
      } else {
        const data = await res.json();
        console.error('Probation action failed:', data.error);
      }
    } catch (error) {
      console.error('Error performing probation action:', error);
    } finally {
      setProbationLoading(false);
    }
  };

  const handleSaveProbationDates = async () => {
    await handleProbationAction('set_dates', {
      probation_start_date: probationDates.start,
      probation_end_date: probationDates.end,
    });
  };

  // Fetch comments when tab changes
  useEffect(() => {
    if (activeTab === 'comments' && comments.length === 0) {
      fetchComments();
    }
    if (activeTab === 'schedule' && events.length === 0) {
      fetchEvents();
    }
  }, [activeTab]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/events`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          stage_tag: commentStageTag,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments([data.comment, ...comments]);
        setNewComment('');
        onRefresh();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setPostingComment(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.scheduled_at) return;
    setAddingEvent(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });
      if (res.ok) {
        const data = await res.json();
        setEvents([...events, data.event].sort((a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ));
        setNewEvent({ title: '', event_type: 'interview', scheduled_at: '' });
        setShowEventForm(false);
        onRefresh();
      }
    } catch (error) {
      console.error('Error adding event:', error);
    } finally {
      setAddingEvent(false);
    }
  };

  const handleCompleteEvent = async (eventId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/events`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          completed_at: completed ? new Date().toISOString() : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(events.map(e => e.id === eventId ? data.event : e));
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      text: newChecklistItem.trim(),
      completed: false,
      required: false,
    };
    const updatedChecklist = [...(candidate.checklist || []), newItem];
    onChecklistUpdate(candidate.id, updatedChecklist);
    setNewChecklistItem('');
  };

  const currentStage = STAGES.find(s => s.id === candidate.stage);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-700 font-bold text-lg">
                {candidate.full_name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{candidate.full_name}</h3>
              <p className="text-sm text-gray-500">{candidate.applied_role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentStage && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentStage.bgColor} ${currentStage.color}`}>
                {currentStage.label}
              </span>
            )}
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Edit size={18} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b shrink-0">
          <div className="flex">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'comments', label: `Comments (${candidate.comment_count || 0})` },
              { id: 'checklist', label: 'Checklist' },
              { id: 'schedule', label: 'Schedule' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-600 border-purple-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Mail size={14} />
                  {candidate.email}
                </span>
                {candidate.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={14} />
                    {candidate.phone}
                  </span>
                )}
              </div>

              {/* Assessment Data */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Brain size={16} />
                  Assessment
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">IQ Score</p>
                    <p className="font-medium">{candidate.iq_score || 'Not tested'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">MBTI Type</p>
                    <p className="font-medium">{candidate.mbti_type || 'Not assessed'}</p>
                  </div>
                </div>
              </div>

              {/* About */}
              {candidate.about && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">About</h4>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{candidate.about}</p>
                </div>
              )}

              {/* Resume */}
              {candidate.resume_file_name && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <FileText size={16} />
                    Resume
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{candidate.resume_file_name}</p>
                      {candidate.resume_file_size && (
                        <p className="text-xs text-gray-500">{formatFileSize(candidate.resume_file_size)}</p>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/candidates/${candidate.id}/resume`);
                          if (res.ok) {
                            const data = await res.json();
                            // Open in new tab to download
                            window.open(data.url, '_blank');
                          } else {
                            console.error('Failed to get resume URL');
                            alert('Failed to download resume');
                          }
                        } catch (error) {
                          console.error('Error downloading resume:', error);
                          alert('Failed to download resume');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                </div>
              )}

              {/* Documents Section - Always visible */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <FileSignature size={16} />
                    Documents
                  </h4>
                  <button
                    onClick={handleCreateSigningLink}
                    disabled={creatingDocument}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Link size={14} />
                    {creatingDocument ? 'Creating...' : 'Create Signing Link'}
                  </button>
                </div>

                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            doc.signed_at ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                          }`}>
                            <FileText size={14} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{getDocumentDisplayName(doc)}</p>
                            <p className="text-xs text-gray-500">
                              Created {formatDate(doc.created_at)}
                              {doc.signed_at && ` • Signed ${formatDate(doc.signed_at)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status badge based on workflow */}
                          {doc.signed_at ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">
                              ✓ Fully Signed
                            </span>
                          ) : doc.recruiter_signed_at ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600">
                              Awaiting Candidate
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-600">
                              Needs Your Signature
                            </span>
                          )}

                          {/* Sign button - only if recruiter hasn't signed */}
                          {!doc.recruiter_signed_at && (
                            <button
                              onClick={() => handleOpenRecruiterSign(doc.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white hover:bg-purple-700 rounded"
                              title="Sign & Approve"
                            >
                              <FileSignature size={12} />
                              Sign & Approve
                            </button>
                          )}

                          {/* Share button - only after recruiter signed, and before candidate signed */}
                          {doc.recruiter_signed_at && !doc.signed_at && (
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/sign/${doc.signing_token}`;
                                setSigningUrl(url);
                                setDocumentPassword(doc.access_password || '');
                                setShowDocumentModal(true);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded"
                              title="Copy & share link"
                            >
                              <Copy size={12} />
                              Share
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                            title="Delete document"
                          >
                            <Trash2 size={12} />
                          </button>
                          <a
                            href={`/sign/${doc.signing_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                            title="Preview signing page"
                          >
                            <ExternalLink size={12} />
                            View
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No documents created yet. Click "Create Signing Link" to generate a Term Sheet for the candidate to sign.</p>
                )}
              </div>

              {/* Start Probation Button (for under_review stage) */}
              {candidate.stage === 'under_review' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-purple-800">Ready for Probation?</h4>
                      <p className="text-sm text-purple-600 mt-1">
                        {candidate.applied_role?.toLowerCase().includes('community manager') ||
                         candidate.applied_role?.toLowerCase().includes('cm')
                          ? '2-week probation period for Community Managers'
                          : '3-month standard probation period'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleProbationAction('start_probation')}
                      disabled={probationLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      <Play size={16} />
                      Start Probation
                    </button>
                  </div>
                </div>
              )}

              {/* Probation Info */}
              {candidate.stage === 'probation' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-yellow-800">Probation Period</h4>
                    {!editingProbationDates && (
                      <button
                        onClick={() => {
                          setProbationDates({
                            start: candidate.probation_start_date || '',
                            end: candidate.probation_end_date || '',
                          });
                          setEditingProbationDates(true);
                        }}
                        className="text-xs text-yellow-700 hover:text-yellow-900 flex items-center gap-1"
                      >
                        <Edit size={12} />
                        Edit Dates
                      </button>
                    )}
                  </div>

                  {/* Dates */}
                  {editingProbationDates ? (
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <label className="text-gray-500 block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={probationDates.start}
                          onChange={(e) => setProbationDates({ ...probationDates, start: e.target.value })}
                          className="w-full px-2 py-1 border border-yellow-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 block mb-1">End Date</label>
                        <input
                          type="date"
                          value={probationDates.end}
                          onChange={(e) => setProbationDates({ ...probationDates, end: e.target.value })}
                          className="w-full px-2 py-1 border border-yellow-300 rounded text-sm"
                        />
                      </div>
                      <div className="col-span-2 flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => setEditingProbationDates(false)}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProbationDates}
                          disabled={probationLoading}
                          className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
                        >
                          {probationLoading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Start Date</p>
                        <p className="font-medium">{candidate.probation_start_date ? formatDate(candidate.probation_start_date) : 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">End Date</p>
                        <p className="font-medium">{candidate.probation_end_date ? formatDate(candidate.probation_end_date) : 'Not set'}</p>
                      </div>
                    </div>
                  )}

                  {/* Workflow Steps */}
                  <div className="space-y-3 pt-3 border-t border-yellow-200">
                    {/* Step 1: Term Sheet */}
                    {(() => {
                      // Derive signed status from documents array (more accurate than candidate.term_sheet_signed)
                      const hasSignedDocument = documents.some(doc => doc.signed_at);
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              hasSignedDocument ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                              <FileSignature size={16} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Term Sheet Signing</p>
                              <p className="text-xs text-gray-500">
                                {hasSignedDocument ? 'Signed by candidate' : 'Send signing link to candidate'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!hasSignedDocument && (
                              <button
                                onClick={handleCreateSigningLink}
                                disabled={creatingDocument}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                              >
                                <Link size={14} />
                                {creatingDocument ? 'Creating...' : 'Create Link'}
                              </button>
                            )}
                            {hasSignedDocument ? (
                              <span className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg">
                                ✓ Signed
                              </span>
                            ) : (
                              <button
                                onClick={() => handleProbationAction('sign_term_sheet')}
                                disabled={probationLoading}
                                className="px-3 py-1.5 text-sm bg-yellow-200 text-yellow-800 rounded-lg hover:bg-yellow-300"
                              >
                                Mark Signed
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Documents list */}
                    {documents.length > 0 && (
                      <div className="ml-11 space-y-2">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between bg-white rounded-lg p-2 text-sm">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-gray-400" />
                              <span className="text-gray-600">{getDocumentDisplayName(doc)}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                doc.signed_at ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                              }`}>
                                {doc.signed_at ? 'Signed' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {!doc.signed_at && (
                                <button
                                  onClick={() => copyToClipboard(`${window.location.origin}/sign/${doc.signing_token}`)}
                                  className="p-1 text-gray-400 hover:text-purple-600"
                                  title="Copy signing link"
                                >
                                  <Copy size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Delete document"
                              >
                                <Trash2 size={14} />
                              </button>
                              <a
                                href={`/sign/${doc.signing_token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-purple-600"
                                title="Open signing page"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Step 2: Create Account */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          candidate.probation_account_created ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <UserPlus size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Temporary Account</p>
                          <p className="text-xs text-gray-500">
                            {candidate.probation_account_created ? 'Account active' : 'Create probation account in system'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (candidate.probation_account_created) {
                            // Just toggle the flag off
                            handleProbationAction('remove_account');
                          } else {
                            // Fetch branches and show the add employee modal
                            try {
                              const res = await fetch('/api/branches');
                              if (res.ok) {
                                const data = await res.json();
                                setBranches(data.branches || []);
                              }
                            } catch (error) {
                              console.error('Error fetching branches:', error);
                            }
                            setShowAddEmployeeModal(true);
                          }
                        }}
                        disabled={probationLoading}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          candidate.probation_account_created
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                        }`}
                      >
                        {candidate.probation_account_created ? '✓ Created' : 'Create Account'}
                      </button>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  {candidate.term_sheet_signed && candidate.probation_account_created && (
                    <div className="mt-4 pt-3 border-t border-yellow-200">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle size={16} />
                        All probation steps completed. Ready to hire when probation ends.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Stage Control */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Stage</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {STAGES.filter(s => s.id !== 'hired' && s.id !== 'rejected').map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => onStageChange(candidate.id, stage.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        candidate.stage === stage.id
                          ? `${stage.bgColor} ${stage.color} border-current`
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-400 pt-2 border-t">
                <p>Source: {candidate.source || 'Unknown'}</p>
                <p>Added: {formatDate(candidate.created_at)}</p>
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Add Comment */}
              <div className="border border-gray-200 rounded-lg p-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add your feedback about this candidate..."
                  className="w-full border-0 resize-none text-sm focus:ring-0 p-0"
                  rows={2}
                />
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <select
                    value={commentStageTag}
                    onChange={(e) => setCommentStageTag(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="general">General</option>
                    {STAGES.filter(s => s.id !== 'hired' && s.id !== 'rejected').map((stage) => (
                      <option key={stage.id} value={stage.id}>{stage.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || postingComment}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Send size={14} />
                    {postingComment ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare size={32} className="mx-auto mb-2" />
                  <p>No comments yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-700 shrink-0">
                        {comment.user?.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{comment.user?.full_name || 'Unknown'}</span>
                          <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                          {comment.stage_tag && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${STAGE_TAG_COLORS[comment.stage_tag] || STAGE_TAG_COLORS.general}`}>
                              {STAGES.find(s => s.id === comment.stage_tag)?.label || comment.stage_tag}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              {/* Checklist Items */}
              {(candidate.checklist && candidate.checklist.length > 0) ? (
                <div className="space-y-2">
                  {candidate.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => {
                        const updatedChecklist = candidate.checklist.map(i =>
                          i.id === item.id ? { ...i, completed: !i.completed } : i
                        );
                        onChecklistUpdate(candidate.id, updatedChecklist);
                      }}
                    >
                      {item.completed ? (
                        <CheckSquare size={20} className="text-green-600 shrink-0" />
                      ) : (
                        <Square size={20} className="text-gray-400 shrink-0" />
                      )}
                      <span className={`text-sm flex-1 ${item.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                        {item.text}
                        {item.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <CheckSquare size={32} className="mx-auto mb-2" />
                  <p>No checklist items</p>
                </div>
              )}

              {/* Add Checklist Item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add new checklist item..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                />
                <button
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistItem.trim()}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              {/* Add Event Button */}
              {!showEventForm ? (
                <button
                  onClick={() => setShowEventForm(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 text-sm hover:border-purple-400 hover:text-purple-600"
                >
                  + Add Interview / Meeting / Deadline
                </button>
              ) : (
                <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newEvent.event_type}
                      onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value as CandidateEvent['event_type'] })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="interview">Interview</option>
                      <option value="meeting">Meeting</option>
                      <option value="review">Review</option>
                      <option value="signing">Signing</option>
                      <option value="deadline">Deadline</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="datetime-local"
                      value={newEvent.scheduled_at}
                      onChange={(e) => setNewEvent({ ...newEvent, scheduled_at: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowEventForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddEvent}
                      disabled={!newEvent.title.trim() || !newEvent.scheduled_at || addingEvent}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {addingEvent ? 'Adding...' : 'Add Event'}
                    </button>
                  </div>
                </div>
              )}

              {/* Events Timeline */}
              {loadingEvents ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar size={32} className="mx-auto mb-2" />
                  <p>No events scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => {
                    const isCompleted = !!event.completed_at;
                    const isPast = new Date(event.scheduled_at) < new Date();
                    const isOverdue = isPast && !isCompleted;

                    return (
                      <div key={event.id} className="flex gap-3 items-start">
                        <button
                          onClick={() => handleCompleteEvent(event.id, !isCompleted)}
                          className={`w-3 h-3 mt-1.5 rounded-full shrink-0 ${
                            isCompleted
                              ? 'bg-green-500'
                              : isOverdue
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium text-sm ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                              {event.title}
                            </p>
                            <span className={`text-xs ${
                              isCompleted ? 'text-green-600' : isOverdue ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {isCompleted ? '✓ Completed' : isOverdue ? 'Overdue' : 'Upcoming'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(event.scheduled_at)}
                            {event.with_user && ` • with ${event.with_user.full_name}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between p-4 border-t shrink-0 bg-gray-50">
          <div className="flex items-center gap-2">
            {candidate.stage === 'probation' && (
              <button
                onClick={() => onHire(candidate.id)}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle size={16} />
                Hire
              </button>
            )}
            {candidate.stage !== 'hired' && candidate.stage !== 'rejected' && candidate.stage !== 'probation' && (
              <button
                onClick={() => {
                  // Get next stage in the pipeline
                  const stageOrder: CandidateStage[] = ['screening', 'interview_1', 'under_review', 'probation', 'interview_2', 'hired'];
                  const currentIndex = stageOrder.indexOf(candidate.stage);
                  if (currentIndex < stageOrder.length - 1) {
                    const nextStage = stageOrder[currentIndex + 1];
                    onStageChange(candidate.id, nextStage);
                  }
                }}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Next Stage
                <ChevronRight size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => onDelete(candidate.id)}
            className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      {/* Add Employee Modal for Probation Account */}
      {showAddEmployeeModal && (
        <AddEmployeeModal
          branches={branches}
          onClose={() => setShowAddEmployeeModal(false)}
          onAdd={() => {
            setShowAddEmployeeModal(false);
            onRefresh();
          }}
          initialData={{
            full_name: candidate.full_name,
            position: candidate.applied_role,
            phone: candidate.phone || '',
            email: candidate.email,
            status: 'probation',
            employment_type: 'probation',
            hire_date: candidate.probation_start_date || new Date().toISOString().split('T')[0],
            candidate_id: candidate.id,
          }}
        />
      )}

      {/* Signing Link Modal */}
      {showDocumentModal && signingUrl && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Ссылка создана!</h3>
              <p className="text-gray-500 mt-2">
                Отправьте ссылку и пароль кандидату {candidate.full_name}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500 mb-2">Ссылка:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={signingUrl}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={() => copyToClipboard(signingUrl)}
                  className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  title="Copy to clipboard"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 mb-2 font-medium">🔐 Пароль для доступа:</p>
              <div className="flex items-center gap-2">
                <span className="flex-1 px-3 py-2 bg-white border border-yellow-300 rounded-lg text-lg font-mono tracking-wider">
                  {documentPassword}
                </span>
                <button
                  onClick={() => copyToClipboard(documentPassword)}
                  className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  title="Copy password"
                >
                  <Copy size={18} />
                </button>
              </div>
              <p className="text-xs text-yellow-700 mt-2">Обязательно сообщите пароль кандидату!</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Отправить через:</h4>
              <div className="flex gap-3">
                <a
                  href={`mailto:${candidate.email}?subject=Условия трудоустройства - C-Space&body=Здравствуйте, ${candidate.full_name}!%0A%0AПожалуйста, перейдите по ссылке для подписания документа:%0A${encodeURIComponent(signingUrl)}%0A%0AПароль для доступа: ${documentPassword}%0A%0AС уважением,%0AC-Space HR`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Mail size={16} />
                  Email
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(signingUrl)}&text=Пожалуйста, подпишите документ "Условия трудоустройства"%0AПароль: ${documentPassword}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
                >
                  <Send size={16} />
                  Telegram
                </a>
              </div>
            </div>

            <button
              onClick={() => {
                setShowDocumentModal(false);
                setSigningUrl(null);
                setDocumentPassword('');
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Document Type Selection Modal */}
      {showDocumentTypeSelection && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSignature size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Выберите тип документа</h3>
              <p className="text-gray-500 mt-2">
                Какой документ вы хотите создать для {candidate.full_name}?
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSelectDocumentType('probation_term_sheet')}
                className="w-full p-4 border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock size={20} className="text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-purple-700">
                      Условия испытательного срока
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Для кандидатов на испытательный срок. Включает метрики оценки, программу адаптации и условия пробного периода.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSelectDocumentType('full_term_sheet')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-purple-700">
                      Полные условия трудоустройства
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Для найма на постоянную работу. Включает полные условия контракта, зарплату и дату начала работы.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowDocumentTypeSelection(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Term Sheet Form Modal */}
      {showTermSheetForm && (
        <TermSheetFormModal
          candidate={{
            id: candidate.id,
            full_name: candidate.full_name,
            email: candidate.email || '',
            applied_role: candidate.applied_role,
            probation_start_date: candidate.probation_start_date || undefined,
            probation_end_date: candidate.probation_end_date || undefined,
          }}
          branches={branches}
          onClose={() => setShowTermSheetForm(false)}
          onSubmit={handleSubmitTermSheet}
        />
      )}

      {/* Probation Term Sheet Form Modal */}
      {showProbationTermSheetForm && (
        <ProbationTermSheetFormModal
          candidate={{
            id: candidate.id,
            full_name: candidate.full_name,
            email: candidate.email || '',
            applied_role: candidate.applied_role,
            probation_start_date: candidate.probation_start_date || undefined,
            probation_end_date: candidate.probation_end_date || undefined,
          }}
          branches={branches}
          onClose={() => setShowProbationTermSheetForm(false)}
          onSubmit={handleSubmitProbationTermSheet}
        />
      )}

      {/* Recruiter Signature Modal */}
      {showRecruiterSignModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileSignature size={24} className="text-purple-600 sm:hidden" />
                <FileSignature size={32} className="text-purple-600 hidden sm:block" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Подпишите документ</h3>
              <p className="text-sm text-gray-500 mt-1">
                Ваша подпись утвердит условия для отправки кандидату.
              </p>
            </div>

            <div className="space-y-3">
              {/* User info display */}
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-medium">
                    {(recruiterSignature.name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{recruiterSignature.name || 'Не указано'}</p>
                  {recruiterSignature.position && (
                    <p className="text-xs text-gray-500 truncate">{recruiterSignature.position}</p>
                  )}
                </div>
              </div>

              {/* Signature drawing area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Подпись *
                  </label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-xs text-purple-600 hover:text-purple-700 px-2 py-1"
                  >
                    Очистить
                  </button>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={120}
                    className="w-full h-[100px] sm:h-[120px] cursor-crosshair touch-none"
                    style={{ touchAction: 'none' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="recruiter-agree"
                  className="w-4 h-4 mt-0.5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <span className="text-xs sm:text-sm text-gray-600">
                  Подтверждаю условия документа для отправки кандидату.
                </span>
              </label>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRecruiterSignModal(false);
                  setSelectedDocForSigning(null);
                  clearCanvas();
                }}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleRecruiterSign}
                disabled={!recruiterSignature.name.trim() || !recruiterSignature.data || signingDocument}
                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {signingDocument ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Подписание...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Подписать и утвердить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
