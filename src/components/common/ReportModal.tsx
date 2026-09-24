import React from 'react';
import { AnalysisRun } from '../../types';
import { X, Printer, Download } from 'lucide-react';

interface ReportModalProps {
  run: AnalysisRun;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ run, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHTML = () => {
    const reportHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Release Risk Report - ${run.pr.repository} PR #${run.pr.pr_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #18181b; padding: 40px; max-width: 900px; margin: 0 auto; }
    h1, h2, h3 { color: #09090b; }
    .header { border-bottom: 1px solid #e4e4e7; padding-bottom: 20px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-high { background: #ffedd5; color: #9a3412; }
    .badge-medium { background: #f4f4f5; color: #27272a; }
    .risk-box { background: #f4f4f5; border-radius: 6px; padding: 16px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #e4e4e7; padding: 8px 10px; text-align: left; font-size: 13px; }
    th { background: #f8fafc; font-weight: 600; }
    .evidence { background: #18181b; color: #f4f4f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 11px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Release Risk Audit Report</h1>
    <p><strong>Repository:</strong> ${run.pr.repository} | <strong>PR:</strong> #${run.pr.pr_number} - ${run.pr.title}</p>
    <p><strong>Author:</strong> ${run.pr.author} | <strong>Generated:</strong> ${new Date(run.created_at).toLocaleString()}</p>
  </div>

  <div class="risk-box">
    <h2>Release Risk: ${run.risk.overall_score} / 100 (${run.risk.risk_level})</h2>
    <p>${run.risk.explanation}</p>
  </div>

  <h2>Must-fix issues</h2>
  ${run.top_3_must_fix.map((f, i) => `
    <div style="border: 1px solid #e4e4e7; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
      <h3>#${i + 1} ${f.title} <span class="badge badge-${f.severity.toLowerCase()}">${f.severity}</span></h3>
      <p><strong>Location:</strong> ${f.file}:${f.line_start}</p>
      <p>${f.why_prioritized || f.explanation}</p>
      <div class="evidence">${f.evidence}</div>
      <p><strong>Suggested fix:</strong> ${f.suggested_fix}</p>
    </div>
  `).join('')}

  <h2>Actionable findings (${run.actionable_findings_count})</h2>
  <table>
    <tr><th>Issue</th><th>Severity</th><th>Location</th><th>Risk contribution</th></tr>
    ${run.findings.filter(f => f.status !== 'FALSE_POSITIVE').map(f => `
      <tr>
        <td>${f.title}</td>
        <td><span class="badge badge-${f.severity.toLowerCase()}">${f.severity}</span></td>
        <td>${f.file}:${f.line_start}</td>
        <td>+${f.risk_contribution}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>`;

    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${run.pr.repository.replace('/', '-')}-pr${run.pr.pr_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="bg-[#0B1117] border border-[#1F2D3D] rounded-lg max-w-2xl w-full p-5 shadow-2xl flex flex-col max-h-[90vh] text-xs text-[#F0F6FC]">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F2D3D] select-none">
          <div>
            <h2 className="text-sm font-semibold text-[#F0F6FC]">
              Release risk audit report
            </h2>
            <p className="text-[#8B949E] font-mono text-[11px]">
              {run.pr.repository} • PR #{run.pr.pr_number}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111923] hover:bg-[#17212B] text-[#8B949E] hover:text-[#F0F6FC] transition-colors border border-[#1F2D3D] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadHTML}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#B8F34A] hover:bg-[#C6F764] text-[#0B1117] font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export HTML</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#111923] text-[#8B949E] hover:text-[#F0F6FC] cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 font-sans">
          <div className="p-3 rounded bg-[#111923] border border-[#1F2D3D] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Release risk</span>
              <span className="font-mono font-bold text-sm text-[#FFB547]">
                {run.risk.overall_score} / 100 ({run.risk.risk_level})
              </span>
            </div>
            <p className="text-xs text-[#8B949E]">{run.risk.explanation}</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-xs text-[#F0F6FC]">Must-fix issues before release</h3>
            <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D]">
              {run.top_3_must_fix.map((f, i) => (
                <div key={f.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-medium text-[#F0F6FC]">
                      #{i + 1} {f.title}
                    </span>
                    <span className="text-[#FF5C5C] font-semibold">{f.severity}</span>
                  </div>
                  <div className="text-[#8B949E] text-[11px] font-mono">
                    {f.file}:{f.line_start} (+{f.risk_contribution} risk)
                  </div>
                  <p className="text-xs text-[#8B949E]">{f.why_prioritized || f.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
