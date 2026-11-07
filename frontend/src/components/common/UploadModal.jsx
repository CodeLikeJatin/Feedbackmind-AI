import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  X, 
  Download, 
  RotateCcw, 
  ArrowRight, 
  Database, 
  Layers 
} from 'lucide-react';
import Modal from './Modal';
import { uploadFeedbackCsv } from '../../services/api';

export default function UploadModal({ isOpen, onClose, onUploadSuccess, companyId = 'demo-company' }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [importSummary, setImportSummary] = useState(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setUploadError(null);
    setImportSummary(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv')) {
        setUploadError('Only CSV files (.csv) are supported.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv')) {
        setUploadError('Only CSV files (.csv) are supported.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await uploadFeedbackCsv(selectedFile, companyId);
      setImportSummary(result);
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err) {
      console.error('CSV upload error:', err);
      setUploadError(err.message || 'Failed to parse and upload CSV.');
      if (err.details) {
        setImportSummary(err.details);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent = 
`feedback_id,customer_id,date,source,feedback,rating
FB-5001,CUST-StripeUser,2026-11-01,Zendesk,"The query latency takes over 10 seconds during peak hours.",2.0
FB-5002,CUST-DevRel,2026-11-02,Intercom,"Loving the new Hindsight memory recall features! Highly recommend.",5.0
FB-5003,CUST-FinTech,2026-11-03,Survey,"Would love native Slack alerts when negative sentiment spikes.",4.0
FB-5004,CUST-HealthTech,2026-11-04,G2 Review,"Occasional session timeout on Firefox after entering 2FA.",3.0
FB-5005,CUST-EduTech,2026-11-05,Email,"Export to CSV completed in 1.2s. Huge improvement over last month.",5.0`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'feedbackmind_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Customer Feedback CSV" maxWidth="max-w-2xl">
      <div className="space-y-4 text-xs">
        {/* Step 1: Pre-Upload Screen */}
        {!importSummary && (
          <>
            <p className="text-slate-600 dark:text-slate-300">
              Upload customer feedback from support tickets, surveys, or reviews. Files are validated row-by-row and persisted into your dedicated workspace database.
            </p>

            {/* Expected Schema Specification */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface/80 border border-slate-200 dark:border-surface-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold uppercase flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-brand-primary" /> Required Columns
                </span>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="text-[11px] text-brand-primary hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors focus:outline-none focus:underline"
                >
                  <Download className="w-3 h-3" /> Download Sample CSV
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {['feedback_id', 'customer_id', 'date', 'source', 'feedback', 'rating'].map(col => (
                  <span key={col} className="px-2 py-0.5 rounded bg-white dark:bg-surface border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-200">
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                • <code>date</code> format: <strong>YYYY-MM-DD</strong> &nbsp;|&nbsp; • <code>rating</code>: <strong>1.0 to 5.0</strong>
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative ${
                dragActive
                  ? 'border-brand-primary bg-indigo-50/70 dark:bg-indigo-500/10'
                  : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/10'
                    : 'border-slate-300 dark:border-surface-border hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-surface/40'
              }`}
              onClick={() => document.getElementById('csvFileInput')?.click()}
            >
              <input
                id="csvFileInput"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 transition-colors ${
                selectedFile 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                  : 'bg-indigo-500/10 text-brand-primary border border-indigo-500/20'
              }`}>
                {selectedFile ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>

              <span className="font-semibold text-slate-900 dark:text-white block text-sm">
                {selectedFile ? selectedFile.name : 'Click to browse or drag & drop CSV'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                {selectedFile 
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for validation & import` 
                  : 'Supports standard CSV files up to 10MB'}
              </span>
            </div>

            {/* Error banner if upload rejected */}
            {uploadError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold text-slate-900 dark:text-white block">Import Error</span>
                  <p className="mt-0.5">{uploadError}</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-between">
              {selectedFile ? (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Clear Selection
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface border border-slate-300 dark:border-surface-border text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFile || isUploading}
                  onClick={handleUpload}
                  className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  {isUploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Parsing & Ingesting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Ingest Feedback
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Post-Upload Import Summary Report */}
        {importSummary && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">CSV Ingestion Complete</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Validated against database schema and normalized</p>
                </div>
              </div>

              {/* Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface/70 border border-slate-200 dark:border-surface-border text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase block">Total Rows</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{importSummary.totalRows}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-center">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono uppercase block">Imported</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{importSummary.imported}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-center">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono uppercase block">Duplicates</span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{importSummary.duplicates}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center">
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-mono uppercase block">Errors</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
                    {importSummary.errors ? importSummary.errors.length : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Duplicate Details (if any) */}
            {importSummary.duplicates > 0 && importSummary.duplicateDetails && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs">
                <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Duplicate Records Skipped ({importSummary.duplicates})
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px] text-amber-800 dark:text-amber-200/90">
                  {importSummary.duplicateDetails.map((dup, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>Row {dup.row}: <strong>{dup.feedback_id}</strong></span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-300/70">{dup.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Details (if any) */}
            {importSummary.errors && importSummary.errors.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs">
                <span className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Row Validation Errors ({importSummary.errors.length})
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[11px] text-rose-800 dark:text-rose-200/90">
                  {importSummary.errors.map((err, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>Row {err.row}{err.feedback_id ? ` (${err.feedback_id})` : ''}:</span>
                      <span className="text-rose-700 dark:text-rose-300/80">{err.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={resetState}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface border border-slate-300 dark:border-surface-border text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Import Another CSV
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <span>Done & View in Inbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
