import React, { useState, useEffect } from 'react';
import { RepositoryMemoryItem, DeveloperFeedbackRecord } from '../types';
import {
  fetchRepositoryMemory,
  addRepositoryMemory,
  deleteRepositoryMemory,
  fetchDeveloperFeedback,
} from '../services/api';
import { Plus, Trash2, X } from 'lucide-react';

export const RepositoryMemory: React.FC = () => {
  const [items, setItems] = useState<RepositoryMemoryItem[]>([]);
  const [feedback, setFeedback] = useState<DeveloperFeedbackRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pattern, setPattern] = useState('');
  const [filePattern, setFilePattern] = useState('');
  const [reason, setReason] = useState('');
  const [itemType, setItemType] = useState<RepositoryMemoryItem['type']>('KNOWN_FALSE_POSITIVE');

  const loadData = async () => {
    try {
      const [memData, fbData] = await Promise.all([
        fetchRepositoryMemory(),
        fetchDeveloperFeedback(),
      ]);
      setItems(memData);
      setFeedback(fbData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim() || !reason.trim()) return;

    try {
      const created = await addRepositoryMemory('default', {
        type: itemType,
        pattern: pattern.trim(),
        file_pattern: filePattern.trim() || undefined,
        reason: reason.trim(),
        created_by: 'developer',
      });
      setItems([...items, created]);
      setPattern('');
      setFilePattern('');
      setReason('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRepositoryMemory('default', id);
      setItems(items.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const typeLabels: Record<string, string> = {
    KNOWN_FALSE_POSITIVE: 'Known false positive',
    CONVENTION: 'Convention',
    ACCEPTED_PATTERN: 'Accepted exception',
    IGNORED_FILE: 'Ignored file',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-7 py-2 text-[#F0F6FC]">
      {/* 1. Header & Add Action */}
      <div className="flex items-baseline justify-between border-b border-[#1F2D3D] pb-4 select-none">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-[#F0F6FC]">
            Repository rules
          </h1>
          <p className="text-xs text-[#8B949E]">
            {items.length} active rule{items.length === 1 ? '' : 's'} configured for this repository
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111923] hover:bg-[#17212B] text-xs text-[#8B949E] hover:text-[#F0F6FC] font-medium transition-colors border border-[#1F2D3D] cursor-pointer"
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showAddForm ? 'Cancel' : 'Add rule'}</span>
        </button>
      </div>

      {/* Add Rule Form */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="p-4 rounded border border-[#1F2D3D] bg-[#111923] space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[#8B949E] mb-1">Rule type</label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded bg-[#0B1117] border border-[#1F2D3D] text-[#F0F6FC] focus:outline-none"
              >
                <option value="KNOWN_FALSE_POSITIVE">Known false positive</option>
                <option value="CONVENTION">Convention</option>
                <option value="ACCEPTED_PATTERN">Accepted exception</option>
                <option value="IGNORED_FILE">Ignored file</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8B949E] mb-1">Pattern</label>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="e.g. legacy/payment_mock.py"
                className="w-full px-2.5 py-1.5 rounded bg-[#0B1117] border border-[#1F2D3D] text-[#F0F6FC] font-mono focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[#8B949E] mb-1">File match (optional)</label>
              <input
                type="text"
                value={filePattern}
                onChange={(e) => setFilePattern(e.target.value)}
                placeholder="e.g. tests/**"
                className="w-full px-2.5 py-1.5 rounded bg-[#0B1117] border border-[#1F2D3D] text-[#F0F6FC] font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#8B949E] mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this rule exists..."
              className="w-full px-2.5 py-1.5 rounded bg-[#0B1117] border border-[#1F2D3D] text-[#F0F6FC] focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="px-3.5 py-1.5 rounded bg-[#B8F34A] hover:bg-[#C6F764] text-[#0B1117] font-semibold text-xs cursor-pointer"
          >
            Save rule
          </button>
        </form>
      )}

      {/* 2. Active Rules List (Compact Rows) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#F0F6FC]">
          Active repository rules
        </h2>

        <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D] text-xs">
          {items.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-start justify-between gap-3 hover:bg-[#111923] px-2 -mx-2 rounded transition-colors group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded border border-[#1F2D3D] bg-[#111923] text-[#8B949E]">
                    {typeLabels[item.type] || item.type}
                  </span>
                  <span className="font-mono text-xs text-[#F0F6FC] font-medium truncate">
                    {item.pattern}
                  </span>
                </div>
                <p className="text-xs text-[#8B949E]">{item.reason}</p>
              </div>

              <button
                onClick={() => handleDelete(item.id)}
                className="text-[#586069] hover:text-[#FF5C5C] p-1 rounded opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                title="Delete rule"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Developer Feedback History */}
      {feedback.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold text-[#F0F6FC]">
            Developer decisions
          </h2>

          <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D] text-xs">
            {feedback.map((fb) => (
              <div
                key={fb.id}
                className="py-2.5 flex items-center justify-between hover:bg-[#111923] px-2 -mx-2 rounded transition-colors"
              >
                <div className="space-y-0.5 truncate">
                  <div className="text-xs text-[#F0F6FC] truncate">{fb.finding_title}</div>
                  <div className="font-mono text-[11px] text-[#586069]">{fb.file}</div>
                </div>

                <span
                  className={`text-[11px] font-mono px-1.5 py-0.5 rounded border ${
                    fb.status === 'FIXED'
                      ? 'text-[#B8F34A] border-[#B8F34A]/30 bg-[#B8F34A]/10'
                      : fb.status === 'FALSE_POSITIVE'
                      ? 'text-[#8B949E] border-[#1F2D3D] bg-[#111923]'
                      : 'text-[#FFB547] border-[#FFB547]/30 bg-[#FFB547]/10'
                  }`}
                >
                  {fb.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
