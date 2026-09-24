import React, { useState, useMemo } from 'react';
import * as Diff from 'diff';
import { FileCode2, Copy, Check, Columns, AlignJustify } from 'lucide-react';

interface MonacoDiffViewerProps {
  originalCode: string;
  modifiedCode: string;
  filename: string;
  highlightLine?: number;
  height?: string;
}

// Simple fast syntax token highlighter for common code tokens
function highlightSyntax(line: string, ext: string): React.ReactNode {
  if (!line) return <span>&nbsp;</span>;

  // Single line comments
  if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
    return <span className="text-[#8B949E] italic">{line}</span>;
  }

  // Regex token matcher for keywords, strings, and standard operators
  const tokenRegex =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`|\b(?:def|class|return|if|else|elif|import|from|as|async|await|try|except|finally|const|let|var|function|type|interface|export|default|true|false|None|null|undefined|in|is|not|and|or|for|while|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN)\b|\b\d+\b)/g;

  const parts = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} className="text-[#F0F6FC]">
          {line.slice(lastIndex, match.index)}
        </span>
      );
    }
    const token = match[0];
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      parts.push(
        <span key={match.index} className="text-[#7EE787]">
          {token}
        </span>
      );
    } else if (/^\d+$/.test(token)) {
      parts.push(
        <span key={match.index} className="text-[#FFB547]">
          {token}
        </span>
      );
    } else {
      parts.push(
        <span key={match.index} className="text-[#58A6FF] font-medium">
          {token}
        </span>
      );
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(
      <span key={lastIndex} className="text-[#F0F6FC]">
        {line.slice(lastIndex)}
      </span>
    );
  }

  return parts;
}

export const MonacoDiffViewer: React.FC<MonacoDiffViewerProps> = ({
  originalCode,
  modifiedCode,
  filename,
  highlightLine,
  height = '360px',
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified' | 'fixed' | 'original'>('split');
  const [copied, setCopied] = useState(false);

  const ext = filename.split('.').pop() || '';

  // Safe clipboard handler with fallback
  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Compute unified diff lines
  const unifiedDiffLines = useMemo(() => {
    const diff = Diff.diffLines(originalCode, modifiedCode);
    const lines: Array<{
      type: 'add' | 'remove' | 'context';
      text: string;
      oldLine?: number;
      newLine?: number;
    }> = [];

    let oldLineNum = 1;
    let newLineNum = 1;

    diff.forEach((part) => {
      const partLines = part.value.replace(/\n$/, '').split('\n');
      partLines.forEach((text) => {
        if (part.added) {
          lines.push({
            type: 'add',
            text,
            newLine: newLineNum++,
          });
        } else if (part.removed) {
          lines.push({
            type: 'remove',
            text,
            oldLine: oldLineNum++,
          });
        } else {
          lines.push({
            type: 'context',
            text,
            oldLine: oldLineNum++,
            newLine: newLineNum++,
          });
        }
      });
    });

    return lines;
  }, [originalCode, modifiedCode]);

  // Compute split side-by-side rows
  const splitRows = useMemo(() => {
    const diff = Diff.diffLines(originalCode, modifiedCode);
    const rows: Array<{
      left?: { lineNum: number; text: string; removed: boolean };
      right?: { lineNum: number; text: string; added: boolean };
    }> = [];

    let oldLine = 1;
    let newLine = 1;

    for (let i = 0; i < diff.length; i++) {
      const part = diff[i];
      const partLines = part.value.replace(/\n$/, '').split('\n');

      if (part.removed && diff[i + 1] && diff[i + 1].added) {
        const nextPart = diff[i + 1];
        const nextLines = nextPart.value.replace(/\n$/, '').split('\n');
        const maxLen = Math.max(partLines.length, nextLines.length);

        for (let j = 0; j < maxLen; j++) {
          rows.push({
            left:
              j < partLines.length
                ? { lineNum: oldLine++, text: partLines[j], removed: true }
                : undefined,
            right:
              j < nextLines.length
                ? { lineNum: newLine++, text: nextLines[j], added: true }
                : undefined,
          });
        }
        i++; // skip next added part
      } else if (part.removed) {
        partLines.forEach((text) => {
          rows.push({
            left: { lineNum: oldLine++, text, removed: true },
          });
        });
      } else if (part.added) {
        partLines.forEach((text) => {
          rows.push({
            right: { lineNum: newLine++, text, added: true },
          });
        });
      } else {
        partLines.forEach((text) => {
          rows.push({
            left: { lineNum: oldLine++, text, removed: false },
            right: { lineNum: newLine++, text, added: false },
          });
        });
      }
    }

    return rows;
  }, [originalCode, modifiedCode]);

  return (
    <div className="h-full w-full rounded border border-[#1F2D3D] bg-[#0B1117] overflow-hidden flex flex-col font-mono text-xs">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111923] border-b border-[#1F2D3D] text-xs text-[#8B949E] shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="w-3.5 h-3.5 text-[#58A6FF] shrink-0" />
          <span className="font-mono font-medium text-[#F0F6FC] truncate">{filename}</span>
          {highlightLine && (
            <span className="px-1.5 py-0.5 rounded bg-[#FFB547]/15 text-[#FFB547] border border-[#FFB547]/30 text-[10px] font-mono shrink-0">
              Line {highlightLine}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded bg-[#0B1117] border border-[#1F2D3D] p-0.5">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-[#17212B] text-[#F0F6FC] font-medium'
                  : 'text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              <Columns className="w-3 h-3" /> Split
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-[#17212B] text-[#F0F6FC] font-medium'
                  : 'text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              <AlignJustify className="w-3 h-3" /> Unified
            </button>
            <button
              onClick={() => setViewMode('fixed')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === 'fixed'
                  ? 'bg-[#17212B] text-[#B8F34A] font-medium'
                  : 'text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              After fix
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === 'original'
                  ? 'bg-[#17212B] text-[#F0F6FC] font-medium'
                  : 'text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              Before
            </button>
          </div>

          <button
            onClick={() => handleCopy(viewMode === 'fixed' ? modifiedCode : originalCode)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#111923] hover:bg-[#17212B] border border-[#1F2D3D] text-[#8B949E] hover:text-[#F0F6FC] transition-colors text-[11px] cursor-pointer"
            title="Copy code"
          >
            {copied ? <Check className="w-3 h-3 text-[#B8F34A]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code / Diff Body */}
      <div className="flex-1 overflow-auto bg-[#0B1117] p-1 text-[11px] leading-5 min-h-[220px]">
        {/* 1. SIDE BY SIDE (SPLIT) VIEW */}
        {viewMode === 'split' && (
          <div className="min-w-full divide-y divide-[#1F2D3D]/50">
            {/* Header labels */}
            <div className="grid grid-cols-2 bg-[#111923]/60 text-[10px] font-mono uppercase tracking-wider text-[#8B949E] px-2 py-1 border-b border-[#1F2D3D] sticky top-0 z-10 select-none">
              <div className="flex items-center gap-2">
                <span className="text-[#FF5C5C] font-semibold">− Original</span>
              </div>
              <div className="flex items-center gap-2 border-l border-[#1F2D3D] pl-2">
                <span className="text-[#3FB950] font-semibold">+ Patched</span>
              </div>
            </div>

            {splitRows.map((row, idx) => {
              const isHighlightLeft =
                row.left && highlightLine && row.left.lineNum === highlightLine;
              const isHighlightRight =
                row.right && highlightLine && row.right.lineNum === highlightLine;

              return (
                <div
                  key={idx}
                  className={`grid grid-cols-2 transition-colors ${
                    isHighlightLeft || isHighlightRight
                      ? 'bg-[#FFB547]/10 border-l-2 border-[#FFB547]'
                      : 'hover:bg-[#111923]/40'
                  }`}
                >
                  {/* Left (Original) */}
                  <div
                    className={`flex items-start px-2 py-0.5 border-r border-[#1F2D3D] overflow-x-auto ${
                      row.left?.removed ? 'bg-[#FF5C5C]/10 text-[#FF7B72]' : ''
                    }`}
                  >
                    <span className="w-8 shrink-0 text-right pr-3 select-none text-[#586069] text-[10px]">
                      {row.left ? row.left.lineNum : ''}
                    </span>
                    <span className="w-4 shrink-0 text-center select-none text-[#FF5C5C] font-mono">
                      {row.left?.removed ? '−' : ''}
                    </span>
                    <span className="flex-1 whitespace-pre font-mono">
                      {row.left ? highlightSyntax(row.left.text, ext) : ''}
                    </span>
                  </div>

                  {/* Right (Modified) */}
                  <div
                    className={`flex items-start px-2 py-0.5 overflow-x-auto ${
                      row.right?.added ? 'bg-[#3FB950]/10 text-[#7EE787]' : ''
                    }`}
                  >
                    <span className="w-8 shrink-0 text-right pr-3 select-none text-[#586069] text-[10px]">
                      {row.right ? row.right.lineNum : ''}
                    </span>
                    <span className="w-4 shrink-0 text-center select-none text-[#3FB950] font-mono">
                      {row.right?.added ? '+' : ''}
                    </span>
                    <span className="flex-1 whitespace-pre font-mono">
                      {row.right ? highlightSyntax(row.right.text, ext) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. UNIFIED DIFF VIEW */}
        {viewMode === 'unified' && (
          <div className="min-w-full font-mono">
            {unifiedDiffLines.map((line, idx) => {
              const isHighlight =
                highlightLine && (line.oldLine === highlightLine || line.newLine === highlightLine);

              return (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 transition-colors ${
                    line.type === 'add'
                      ? 'bg-[#3FB950]/10 text-[#7EE787]'
                      : line.type === 'remove'
                      ? 'bg-[#FF5C5C]/10 text-[#FF7B72]'
                      : isHighlight
                      ? 'bg-[#FFB547]/10 border-l-2 border-[#FFB547]'
                      : 'hover:bg-[#111923]/40'
                  }`}
                >
                  <span className="w-8 shrink-0 text-right pr-2 select-none text-[#586069] text-[10px]">
                    {line.oldLine || ''}
                  </span>
                  <span className="w-8 shrink-0 text-right pr-3 select-none text-[#586069] text-[10px]">
                    {line.newLine || ''}
                  </span>
                  <span className="w-4 shrink-0 text-center select-none font-bold">
                    {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                  </span>
                  <span className="flex-1 whitespace-pre font-mono overflow-x-auto">
                    {highlightSyntax(line.text, ext)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. AFTER FIX VIEW */}
        {viewMode === 'fixed' && (
          <div className="min-w-full font-mono">
            {modifiedCode.split('\n').map((line, idx) => {
              const lineNum = idx + 1;
              const isHighlight = lineNum === highlightLine;

              return (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 transition-colors ${
                    isHighlight ? 'bg-[#FFB547]/10 border-l-2 border-[#FFB547]' : 'hover:bg-[#111923]/40'
                  }`}
                >
                  <span className="w-10 shrink-0 text-right pr-3 select-none text-[#586069] text-[10px]">
                    {lineNum}
                  </span>
                  <span className="flex-1 whitespace-pre font-mono overflow-x-auto">
                    {highlightSyntax(line, ext)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. ORIGINAL BEFORE VIEW */}
        {viewMode === 'original' && (
          <div className="min-w-full font-mono">
            {originalCode.split('\n').map((line, idx) => {
              const lineNum = idx + 1;
              const isHighlight = lineNum === highlightLine;

              return (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 transition-colors ${
                    isHighlight ? 'bg-[#FFB547]/10 border-l-2 border-[#FFB547]' : 'hover:bg-[#111923]/40'
                  }`}
                >
                  <span className="w-10 shrink-0 text-right pr-3 select-none text-[#586069] text-[10px]">
                    {lineNum}
                  </span>
                  <span className="flex-1 whitespace-pre font-mono overflow-x-auto">
                    {highlightSyntax(line, ext)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
