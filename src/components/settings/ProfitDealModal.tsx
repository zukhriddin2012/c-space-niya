'use client';

import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface Branch {
  id: string;
  name: string;
}

interface ProfitDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    branchId: string;
    investorName: string;
    cspacePercentage: number;
    investorPercentage: number;
    effectiveFrom: string;
    notes?: string;
  }) => Promise<void>;
  branches: Branch[];
}

export default function ProfitDealModal({ isOpen, onClose, onSubmit, branches }: ProfitDealModalProps) {
  const [branchId, setBranchId] = useState('');
  const [investorName, setInvestorName] = useState('');
  const [cspacePct, setCspacePct] = useState<string>('');
  const [investorPct, setInvestorPct] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setBranchId('');
      setInvestorName('');
      setCspacePct('');
      setInvestorPct('');
      setEffectiveFrom(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  // Auto-complement: changing C-Space % sets investor %
  function handleCspaceChange(val: string) {
    setCspacePct(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setInvestorPct(String(100 - num));
    }
  }

  function handleInvestorChange(val: string) {
    setInvestorPct(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setCspacePct(String(100 - num));
    }
  }

  const cNum = parseFloat(cspacePct) || 0;
  const iNum = parseFloat(investorPct) || 0;
  const sum = cNum + iNum;
  const sumValid = sum === 100;

  async function handleSubmit() {
    setError('');
    if (!branchId) { setError('Please select a branch'); return; }
    if (!investorName.trim()) { setError('Investor name is required'); return; }
    if (!sumValid) { setError('Percentages must sum to 100%'); return; }
    if (!effectiveFrom) { setError('Effective date is required'); return; }

    setSaving(true);
    try {
      await onSubmit({
        branchId,
        investorName: investorName.trim(),
        cspacePercentage: cNum,
        investorPercentage: iNum,
        effectiveFrom,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Profit-Sharing Deal"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={saving}>Create Deal</Button>
        </>
      }
    >
      {/* Info callout */}
      <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 mb-4">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <span>Creating a new deal for a branch that already has an active deal will automatically close the existing deal on the day before the new deal&apos;s effective date.</span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">{error}</div>
      )}

      <div className="space-y-4">
        <Select
          label="Branch"
          required
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          placeholder="Select a branch..."
          options={branches.map(b => ({ value: b.id, label: b.name }))}
        />

        <Input
          label="Investor Name"
          required
          value={investorName}
          onChange={(e) => setInvestorName(e.target.value)}
          placeholder="e.g., Akbar Tursunov"
        />

        {/* Auto-complement percentage fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profit Split <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={cspacePct}
                onChange={(e) => handleCspaceChange(e.target.value)}
                placeholder="C-Space %"
                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 text-sm"
              />
              <p className="mt-1 text-xs text-purple-600">C-Space share</p>
            </div>
            <span className="text-gray-400 font-medium text-sm">+</span>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={investorPct}
                onChange={(e) => handleInvestorChange(e.target.value)}
                placeholder="Investor %"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 text-sm"
              />
              <p className="mt-1 text-xs text-blue-600">Investor share</p>
            </div>
            <span className="text-gray-400 font-medium text-sm">=</span>
            <span className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
              sumValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {sum}%{sumValid ? ' \u2713' : ''}
            </span>
          </div>
        </div>

        <Input
          label="Effective From"
          required
          type="date"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          helperText="The date from which this deal takes effect"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contract reference, deal terms, etc."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 text-sm"
          />
        </div>
      </div>
    </Modal>
  );
}
