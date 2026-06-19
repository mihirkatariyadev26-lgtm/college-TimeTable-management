import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Icons ────────────────────────────────────────────────────
const UserPlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const FileIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// ─── Single User Registration Form ────────────────────────────
const SingleRegisterTab = () => {
  const { showToast } = useAuth();

  const [form, setForm] = useState({
    name: '', email: '', password: '', role: '',
    subjectsTaught: [''],
    semester: '', division: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError]       = useState('');
  const [success, setSuccess]           = useState(null);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addSubject = () => set('subjectsTaught', [...form.subjectsTaught, '']);
  const removeSubject = (idx) =>
    set('subjectsTaught', form.subjectsTaught.filter((_, i) => i !== idx));
  const updateSubject = (idx, val) =>
    set('subjectsTaught', form.subjectsTaught.map((s, i) => i === idx ? val : s));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };

      if (form.role === 'Teacher') {
        const subjects = form.subjectsTaught.map(s => s.trim()).filter(Boolean);
        if (subjects.length === 0) {
          setFormError('Please add at least one subject.');
          setIsSubmitting(false);
          return;
        }
        payload.subjectsTaught = subjects;
      }

      if (form.role === 'Student') {
        const sem = parseInt(form.semester, 10);
        if (!Number.isFinite(sem) || sem < 1) {
          setFormError('Semester must be a positive integer.');
          setIsSubmitting(false);
          return;
        }
        if (!form.division.trim()) {
          setFormError('Division is required for students.');
          setIsSubmitting(false);
          return;
        }
        payload.semester = sem;
        payload.division = form.division.trim();
      }

      const res = await api.post('/api/auth/register', payload);
      const created = res.data?.data ?? res.data;
      setSuccess(created);
      showToast(`User "${created.name}" registered successfully!`, 'success');

      // Reset form
      setForm({ name: '', email: '', password: '', role: '', subjectsTaught: [''], semester: '', division: '' });
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Registration failed. Please try again.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="reg-form" onSubmit={handleSubmit} noValidate>
      {/* Success card */}
      {success && (
        <div className="reg-result-banner reg-result-banner--success">
          <CheckCircleIcon />
          <span>
            <strong>{success.name}</strong> ({success.role}) registered with email{' '}
            <code>{success.email}</code>
          </span>
        </div>
      )}

      {/* Error */}
      {formError && (
        <div className="reg-result-banner reg-result-banner--error">
          <XCircleIcon />
          <span>{formError}</span>
        </div>
      )}

      {/* Row: Name + Email */}
      <div className="reg-row">
        <div className="field">
          <label className="field__label" htmlFor="reg-name">Full Name</label>
          <input
            id="reg-name" className="field__input field__input--plain"
            type="text" placeholder="Dr. Jane Smith" required
            value={form.name} onChange={e => set('name', e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="reg-email">Email Address</label>
          <input
            id="reg-email" className="field__input field__input--plain"
            type="email" placeholder="user@college.edu" required
            value={form.email} onChange={e => set('email', e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Row: Password + Role */}
      <div className="reg-row">
        <div className="field">
          <label className="field__label" htmlFor="reg-password">Password</label>
          <input
            id="reg-password" className="field__input field__input--plain"
            type="password" placeholder="Min 8 characters" required
            value={form.password} onChange={e => set('password', e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="reg-role">Role</label>
          <select
            id="reg-role" className="field__input field__input--plain field__select"
            required value={form.role}
            onChange={e => { set('role', e.target.value); setFormError(''); }}
            disabled={isSubmitting}
          >
            <option value="">— Select role —</option>
            <option value="Admin">Admin</option>
            <option value="Teacher">Teacher</option>
            <option value="Student">Student</option>
          </select>
        </div>
      </div>

      {/* ── Dynamic: Teacher fields ───────────────────────────── */}
      {form.role === 'Teacher' && (
        <div className="reg-dynamic-section" key="teacher-fields">
          <div className="reg-dynamic-header">
            <span className="field__label">Subjects Taught</span>
            <button type="button" className="btn-icon" onClick={addSubject}>
              <PlusIcon /> Add Subject
            </button>
          </div>
          <div className="reg-subjects-list">
            {form.subjectsTaught.map((s, idx) => (
              <div className="reg-subject-row" key={idx}>
                <input
                  className="field__input field__input--plain"
                  type="text"
                  placeholder={`Subject ${idx + 1}`}
                  value={s}
                  onChange={e => updateSubject(idx, e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                {form.subjectsTaught.length > 1 && (
                  <button
                    type="button"
                    className="btn-icon btn-icon--danger"
                    onClick={() => removeSubject(idx)}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dynamic: Student fields ───────────────────────────── */}
      {form.role === 'Student' && (
        <div className="reg-dynamic-section" key="student-fields">
          <div className="reg-row">
            <div className="field">
              <label className="field__label" htmlFor="reg-semester">Semester</label>
              <input
                id="reg-semester" className="field__input field__input--plain"
                type="number" min="1" max="8" placeholder="e.g. 4"
                required value={form.semester}
                onChange={e => set('semester', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="reg-division">Division</label>
              <input
                id="reg-division" className="field__input field__input--plain"
                type="text" placeholder="e.g. A"
                required value={form.division}
                onChange={e => set('division', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      <button
        id="reg-submit"
        type="submit"
        className="btn btn--primary"
        disabled={isSubmitting || !form.role}
        style={{ marginTop: 'var(--space-4)' }}
      >
        {isSubmitting ? <span className="spinner" /> : <UserPlusIcon />}
        {isSubmitting ? 'Registering…' : 'Register User'}
      </button>
    </form>
  );
};

// ─── CSV Bulk Upload Tab ──────────────────────────────────────
const BulkUploadTab = () => {
  const { showToast } = useAuth();

  const [isDragging, setIsDragging]   = useState(false);
  const [file, setFile]               = useState(null);
  const [parsedRows, setParsedRows]   = useState(null);
  const [parseError, setParseError]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult]           = useState(null);   // bulk response data

  const inputRef = useRef(null);

  // ── CSV parsing ───────────────────────────────────────────
  const processFile = useCallback((f) => {
    setParseError('');
    setResult(null);
    setParsedRows(null);

    if (!f || !f.name.endsWith('.csv')) {
      setParseError('Only .csv files are supported.');
      return;
    }

    setFile(f);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      transform: v => v.trim(),
      complete: ({ data, errors }) => {
        if (errors.length) {
          setParseError(`CSV parse error on row ${errors[0].row + 1}: ${errors[0].message}`);
          return;
        }
        if (data.length === 0) {
          setParseError('The CSV file contains no data rows.');
          return;
        }
        setParsedRows(data);
        showToast(`Parsed ${data.length} row${data.length !== 1 ? 's' : ''}. Review and submit.`, 'info');
      },
    });
  }, [showToast]);

  // ── Drag-and-drop handlers ────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = ()  => setIsDragging(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };
  const onFileChange = (e) => processFile(e.target.files[0]);

  // ── Submit to API ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!parsedRows || parsedRows.length === 0) return;
    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await api.post('/api/auth/register/bulk', { users: parsedRows });
      const data = res.data?.data ?? res.data;
      setResult(data);

      if (data.failedRows?.length === 0) {
        showToast(`All ${data.successCount} users registered successfully!`, 'success');
      } else {
        showToast(`${data.successCount} succeeded, ${data.failedRows?.length} failed. Review the table below.`, 'info');
      }
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Bulk registration failed. Please try again.';
      setParseError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedRows(null);
    setParseError('');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="bulk-tab">
      {/* ── Drop Zone ──────────────────────────────────────── */}
      <div
        className={`drop-zone ${isDragging ? 'drop-zone--active' : ''} ${file ? 'drop-zone--has-file' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="CSV drop zone"
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <div className="drop-zone__icon">
          <FileIcon />
        </div>
        {file ? (
          <>
            <p className="drop-zone__title">{file.name}</p>
            <p className="drop-zone__sub">
              {parsedRows
                ? `${parsedRows.length} rows parsed — ready to submit`
                : 'Parsing…'}
            </p>
          </>
        ) : (
          <>
            <p className="drop-zone__title">Drag &amp; drop a CSV file here</p>
            <p className="drop-zone__sub">or click to browse — only .csv files accepted</p>
          </>
        )}
      </div>

      {/* ── Parse Error ────────────────────────────────────── */}
      {parseError && (
        <div className="reg-result-banner reg-result-banner--error">
          <XCircleIcon /><span>{parseError}</span>
        </div>
      )}

      {/* ── CSV Format hint ────────────────────────────────── */}
      {!file && (
        <div className="csv-hint">
          <p className="csv-hint__title">Expected CSV columns:</p>
          <code className="csv-hint__code">
            name, email, password, role, subjectsTaught, semester, division
          </code>
          <p className="csv-hint__note">
            For Teachers: <code>subjectsTaught</code> values separated by <code>;</code> (e.g. <em>Maths;Physics</em>).<br />
            For Students: provide a numeric <code>semester</code> and a <code>division</code> string.
          </p>
        </div>
      )}

      {/* ── Parsed preview ─────────────────────────────────── */}
      {parsedRows && !result && (
        <div className="bulk-preview">
          <div className="bulk-preview__header">
            <span className="bulk-preview__count">{parsedRows.length} rows ready</span>
            <button className="btn-text" onClick={reset}>Clear</button>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 8).map((row, i) => (
                  <tr key={i}>
                    <td className="td-muted">{i + 1}</td>
                    <td>{row.name || <span className="td-missing">—</span>}</td>
                    <td className="td-mono">{row.email || <span className="td-missing">—</span>}</td>
                    <td>
                      <span className={`role-badge role-badge--${(row.role || '').toLowerCase()}`}>
                        {row.role || '—'}
                      </span>
                    </td>
                    <td className="td-mono td-muted">
                      {row.role === 'Teacher' && (row.subjectsTaught || '—')}
                      {row.role === 'Student' && `Sem ${row.semester}, Div ${row.division}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedRows.length > 8 && (
            <p className="bulk-preview__more">+{parsedRows.length - 8} more rows not shown</p>
          )}

          <div className="bulk-actions">
            <button className="btn btn--ghost" onClick={reset} disabled={isSubmitting}>
              Change File
            </button>
            <button
              id="bulk-submit"
              className="btn btn--primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              {isSubmitting ? <span className="spinner" /> : <UploadIcon />}
              {isSubmitting ? `Registering ${parsedRows.length} users…` : `Register ${parsedRows.length} Users`}
            </button>
          </div>
        </div>
      )}

      {/* ── Result Summary ─────────────────────────────────── */}
      {result && (
        <div className="bulk-result">
          {/* Stats row */}
          <div className="bulk-stats">
            <div className="bulk-stat bulk-stat--total">
              <span className="bulk-stat__value">{result.totalSubmitted}</span>
              <span className="bulk-stat__label">Submitted</span>
            </div>
            <div className="bulk-stat bulk-stat--success">
              <CheckCircleIcon />
              <span className="bulk-stat__value">{result.successCount}</span>
              <span className="bulk-stat__label">Succeeded</span>
            </div>
            <div className="bulk-stat bulk-stat--failed">
              <XCircleIcon />
              <span className="bulk-stat__value">{result.failedRows?.length ?? 0}</span>
              <span className="bulk-stat__label">Failed</span>
            </div>
          </div>

          {/* Failed rows table */}
          {result.failedRows?.length > 0 && (
            <>
              <h3 className="bulk-result__subtitle">Failed Rows — Fix &amp; Re-upload</h3>
              <div className="table-scroll">
                <table className="data-table data-table--failed">
                  <thead>
                    <tr>
                      <th>Row #</th>
                      <th>Email</th>
                      <th>Rejection Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.failedRows.map((fr, i) => (
                      <tr key={i}>
                        <td className="td-muted">{fr.row}</td>
                        <td className="td-mono">{fr.email}</td>
                        <td className="td-reason">{fr.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {result.failedRows?.length === 0 && (
            <div className="reg-result-banner reg-result-banner--success" style={{ marginTop: 'var(--space-4)' }}>
              <CheckCircleIcon />
              <span>All users registered successfully — no failures!</span>
            </div>
          )}

          <button className="btn btn--ghost" onClick={reset} style={{ marginTop: 'var(--space-6)' }}>
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Admin Registration Page ──────────────────────────────────
const AdminRegistration = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single');

  return (
    <div className="screen screen--admin" aria-label="Admin Registration Panel">
      {/* Ambient glows */}
      <div className="glow glow--indigo-tl" />
      <div className="glow glow--violet-br" />

      <div className="admin-panel">
        {/* ── Panel Header ─────────────────────────────────── */}
        <div className="admin-panel__header">
          <div className="admin-panel__nav">
            <button
              className="btn-back"
              onClick={() => navigate('/admin/dashboard')}
              aria-label="Back to dashboard"
            >
              <ArrowLeftIcon /> Dashboard
            </button>
            <div className="admin-panel__user">
              <span className="admin-panel__user-name">{user?.name}</span>
              <button className="btn-text btn-text--muted" onClick={logout}>Sign out</button>
            </div>
          </div>

          <div className="admin-panel__title-row">
            <div className="brand__icon" style={{ width: '2.75rem', height: '2.75rem' }}>
              <UserPlusIcon />
            </div>
            <div>
              <h1 className="admin-panel__title">Register Users</h1>
              <p className="admin-panel__subtitle">Add individuals or upload a batch via CSV</p>
            </div>
          </div>

          {/* ── Tabs ───────────────────────────────────────── */}
          <div className="tab-bar" role="tablist">
            <button
              id="tab-single"
              role="tab"
              aria-selected={activeTab === 'single'}
              className={`tab-bar__tab ${activeTab === 'single' ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setActiveTab('single')}
            >
              <UserPlusIcon /> Single User
            </button>
            <button
              id="tab-bulk"
              role="tab"
              aria-selected={activeTab === 'bulk'}
              className={`tab-bar__tab ${activeTab === 'bulk' ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setActiveTab('bulk')}
            >
              <UploadIcon /> Bulk CSV
            </button>
          </div>
        </div>

        {/* ── Tab Content ──────────────────────────────────── */}
        <div className="admin-panel__body" role="tabpanel">
          {activeTab === 'single' ? <SingleRegisterTab /> : <BulkUploadTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminRegistration;
