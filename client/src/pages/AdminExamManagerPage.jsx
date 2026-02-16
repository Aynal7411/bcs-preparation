import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { SkeletonBlock, SkeletonRows } from '../components/ui/Skeleton';
import { api } from '../services/api';

const categories = ['BCS', 'Primary', 'NTRCA', 'Bank', 'Others'];
const tabs = ['Overview', 'Users', 'Exams', 'Reports'];

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatBytes(value) {
  if (!value || value <= 0) return '0 B';
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function toPercentWidth(value, max) {
  if (!max || max <= 0) return '0%';
  return `${Math.max(6, Math.round((value / max) * 100))}%`;
}

function createInitialErrors() {
  return {
    overview: '',
    reports: '',
    exams: '',
    users: '',
    uploadHistory: ''
  };
}

export default function AdminExamManagerPage() {
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('Overview');
  const [overview, setOverview] = useState(null);
  const [reports, setReports] = useState(null);
  const [exams, setExams] = useState([]);
  const [usersData, setUsersData] = useState({ users: [], total: 0, page: 1, totalPages: 1 });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [errors, setErrors] = useState(createInitialErrors());

  const [userFilters, setUserFilters] = useState({ search: '', role: '', page: 1, limit: 10 });
  const [userDraftFilters, setUserDraftFilters] = useState({ search: '', role: '' });
  const [roleDrafts, setRoleDrafts] = useState({});
  const [savingRoleUserId, setSavingRoleUserId] = useState('');

  const [form, setForm] = useState({
    title: '',
    category: 'BCS',
    examDate: '',
    durationMinutes: 60,
    totalMarks: 100
  });

  const [bulkForm, setBulkForm] = useState({ examId: '', mode: 'append', json: '[]' });
  const [fileForm, setFileForm] = useState({ examId: '', mode: 'append', file: null });
  const [uploadPreview, setUploadPreview] = useState(null);
  const [duplicateHandling, setDuplicateHandling] = useState('skip');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isCommittingPreview, setIsCommittingPreview] = useState(false);
  const [uploadHistory, setUploadHistory] = useState({ history: [], total: 0, page: 1, totalPages: 1 });
  const [loadingUploadHistory, setLoadingUploadHistory] = useState(false);
  const [expandedExamId, setExpandedExamId] = useState('');
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    tone: 'danger',
    onConfirm: null,
    isProcessing: false
  });

  const summaryCards = useMemo(() => {
    if (!overview?.totals) return [];
    return [
      { label: 'Total Users', value: overview.totals.users, tone: 'from-sky-500 to-cyan-400' },
      { label: 'Total Exams', value: overview.totals.exams, tone: 'from-indigo-500 to-blue-500' },
      { label: 'Question Bank', value: overview.totals.questions, tone: 'from-emerald-500 to-teal-400' },
      { label: 'Active Jobs', value: overview.totals.activeJobs, tone: 'from-amber-500 to-orange-400' },
      { label: 'Submissions', value: overview.totals.submissions, tone: 'from-fuchsia-500 to-pink-400' },
      { label: 'Average Score', value: overview.performance?.averageScore || 0, tone: 'from-violet-500 to-purple-400' }
    ];
  }, [overview]);

  const topSubmissionDays = useMemo(() => {
    const list = reports?.submissionsByDay || [];
    const max = list.reduce((acc, item) => Math.max(acc, item.submissions || 0), 0);
    return { list: list.slice(-10), max };
  }, [reports]);

  const roleBreakdown = useMemo(() => {
    const list = reports?.userRoleBreakdown || [];
    const max = list.reduce((acc, item) => Math.max(acc, item.count || 0), 0);
    return { list, max };
  }, [reports]);

  const hasAnyDataError = useMemo(
    () => Object.values(errors).some((value) => Boolean(value)),
    [errors]
  );

  const setSectionError = (section, message = '') => {
    setErrors((prev) => ({ ...prev, [section]: message }));
  };

  const openConfirm = ({ title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm }) => {
    setConfirmState({
      open: true,
      title,
      message,
      confirmLabel,
      tone,
      onConfirm,
      isProcessing: false
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, open: false, isProcessing: false, onConfirm: null }));
  };

  const executeConfirm = async () => {
    if (!confirmState.onConfirm || confirmState.isProcessing) return;
    setConfirmState((prev) => ({ ...prev, isProcessing: true }));
    try {
      await confirmState.onConfirm();
      closeConfirm();
    } catch {
      setConfirmState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const fetchExams = async (showErrorToast = true) => {
    setLoadingExams(true);
    try {
      const { data } = await api.get('/exams');
      setExams(data);
      setSectionError('exams', '');
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load exams';
      setSectionError('exams', message);
      setExams([]);
      if (showErrorToast) toast.error(error.response?.data?.message || 'Failed to load exams');
      throw error;
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchOverview = async (showErrorToast = true) => {
    setLoadingOverview(true);
    try {
      const { data } = await api.get('/admin/dashboard');
      setOverview(data);
      setSectionError('overview', '');
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load admin dashboard';
      setSectionError('overview', message);
      setOverview(null);
      if (showErrorToast) toast.error(message);
      throw error;
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchReports = async (showErrorToast = true) => {
    setLoadingReports(true);
    try {
      const { data } = await api.get('/admin/reports');
      setReports(data);
      setSectionError('reports', '');
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load reports';
      setSectionError('reports', message);
      setReports(null);
      if (showErrorToast) toast.error(message);
      throw error;
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchUsers = async (filters, showErrorToast = true) => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get('/admin/users', { params: filters });
      setUsersData(data);
      setSectionError('users', '');
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load users';
      setSectionError('users', message);
      setUsersData({ users: [], total: 0, page: 1, totalPages: 1 });
      if (showErrorToast) toast.error(message);
      throw error;
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUploadHistory = async (showErrorToast = true) => {
    setLoadingUploadHistory(true);
    try {
      const { data } = await api.get('/admin/question/upload-history', { params: { page: 1, limit: 12 } });
      setUploadHistory(data);
      setSectionError('uploadHistory', '');
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load upload history';
      setSectionError('uploadHistory', message);
      setUploadHistory({ history: [], total: 0, page: 1, totalPages: 1 });
      if (showErrorToast) toast.error(message);
      throw error;
    } finally {
      setLoadingUploadHistory(false);
    }
  };

  const refreshDashboard = async (showToast = true) => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchExams(showToast),
        fetchOverview(showToast),
        fetchReports(showToast),
        fetchUsers(userFilters, showToast),
        fetchUploadHistory(showToast)
      ]);
      setLastSyncedAt(new Date().toISOString());
      if (showToast) toast.success('Dashboard refreshed');
    } catch {
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshDashboard(false);
  }, []);

  useEffect(() => {
    fetchUsers(userFilters, false).catch(() => {});
  }, [userFilters]);

  useEffect(() => {
    const next = {};
    (usersData.users || []).forEach((user) => {
      next[user._id] = user.role;
    });
    setRoleDrafts(next);
  }, [usersData.users]);

  const createExam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/exam', form);
      toast.success('Exam created');
      setForm({ title: '', category: 'BCS', examDate: '', durationMinutes: 60, totalMarks: 100 });
      refreshDashboard(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create exam');
    }
  };

  const removeExam = async (id) => {
    openConfirm({
      title: 'Delete Exam?',
      message: 'This will permanently delete the exam and all related results.',
      confirmLabel: 'Delete Exam',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/exam/${id}`);
          toast.success('Exam deleted');
          if (expandedExamId === id) setExpandedExamId('');
          refreshDashboard(false);
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete exam');
          throw error;
        }
      }
    });
  };

  const toggleFeatured = async (exam) => {
    try {
      await api.put(`/admin/exam/${exam._id}`, { isFeatured: !exam.isFeatured });
      toast.success('Exam updated');
      fetchExams(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update exam');
    }
  };

  const submitBulkUpload = async () => {
    const questions = JSON.parse(bulkForm.json);
    await api.post('/admin/question/bulk', { examId: bulkForm.examId, mode: bulkForm.mode, questions });
    toast.success('Questions uploaded');
    setBulkForm((prev) => ({ ...prev, json: '[]' }));
    refreshDashboard(false);
  };

  const bulkUpload = async (e) => {
    e.preventDefault();
    try {
      if (bulkForm.mode === 'replace') {
        openConfirm({
          title: 'Replace Existing Questions?',
          message: 'This will replace all existing questions for the selected exam.',
          confirmLabel: 'Replace Questions',
          tone: 'danger',
          onConfirm: async () => {
            try {
              await submitBulkUpload();
            } catch (error) {
              toast.error(error.response?.data?.message || 'Bulk upload failed');
              throw error;
            }
          }
        });
        return;
      }

      await submitBulkUpload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk upload failed');
    }
  };

  const updateUserRole = async (userId, role) => {
    setSavingRoleUserId(userId);
    try {
      await api.put(`/admin/users/${userId}`, { role });
      toast.success('User role updated');
      fetchUsers(userFilters, false);
      fetchOverview(false);
      fetchReports(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingRoleUserId('');
    }
  };

  const applyUserFilters = () => {
    setUserFilters((prev) => ({ ...prev, search: userDraftFilters.search.trim(), role: userDraftFilters.role, page: 1 }));
  };

  const previewQuestionFileUpload = async (e) => {
    e.preventDefault();
    if (!fileForm.examId) return toast.error('Select an exam first');
    if (!fileForm.file) return toast.error('Choose a JSON or CSV file');

    setIsGeneratingPreview(true);
    try {
      const payload = new FormData();
      payload.append('examId', fileForm.examId);
      payload.append('mode', fileForm.mode);
      payload.append('file', fileForm.file);
      const { data } = await api.post('/admin/question/upload-preview', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadPreview(data.preview || null);
      setDuplicateHandling('skip');
      toast.success(data.message || 'Preview generated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Preview generation failed');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const commitQuestionFileUpload = async () => {
    if (!uploadPreview?.previewId) return toast.error('Generate a preview before importing');
    const commitAction = async () => {
      setIsCommittingPreview(true);
      try {
        const { data } = await api.post('/admin/question/upload-commit', {
          previewId: uploadPreview.previewId,
          duplicateHandling
        });
        toast.success(data.message || 'Questions imported');
        setUploadPreview(null);
        setFileForm((prev) => ({ ...prev, file: null }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        refreshDashboard(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Import commit failed');
        throw error;
      } finally {
        setIsCommittingPreview(false);
      }
    };

    if (uploadPreview.mode === 'replace') {
      openConfirm({
        title: 'Replace Exam Question Bank?',
        message: 'Import mode is replace. Existing questions in this exam will be overwritten.',
        confirmLabel: 'Confirm Replace',
        tone: 'danger',
        onConfirm: commitAction
      });
      return;
    }

    commitAction();
  };

  const downloadTemplate = (type) => {
    let content = '';
    let fileName = '';
    let mimeType = '';

    if (type === 'json') {
      content = JSON.stringify([
        {
          questionText: 'Which article of Bangladesh Constitution defines fundamental rights?',
          options: ['Article 1-7', 'Article 26-47A', 'Article 70', 'Article 102'],
          correctOptionIndex: 1,
          explanation: 'Fundamental rights are covered under Articles 26-47A.'
        }
      ], null, 2);
      fileName = 'question-template.json';
      mimeType = 'application/json';
    } else {
      content = 'questionText,options,correctOptionIndex,explanation\n' +
        '"Which teaching method emphasizes participation?","Lecture|Discussion|Dictation|Translation",1,"Discussion method involves active participation."';
      fileName = 'question-template.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-sky-500 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-cyan-200/30 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Control Center</h1>
            <p className="mt-2 text-sm text-white/90">Manage exams, users, uploads, and reports from one interactive dashboard.</p>
            <p className="mt-2 text-xs text-white/80">Last synced: {formatDateTime(lastSyncedAt)}</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <button type="button" onClick={() => setActiveTab('Exams')} className="w-full rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30 sm:w-auto">Manage Uploads</button>
            <button type="button" onClick={() => refreshDashboard(true)} disabled={isRefreshing} className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-slate-100 disabled:opacity-60 sm:w-auto">{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</button>
          </div>
        </div>
      </section>

      {hasAnyDataError && (
        <section className="mt-4">
          <ErrorState
            title="Some dashboard sections failed to load"
            message="You can continue working with available data or retry refresh."
            onRetry={() => refreshDashboard(true)}
          />
        </section>
      )}

      <section className="mt-6 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => (
            <button key={tab} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? 'bg-brand-600 text-white shadow-md' : 'bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-sm'}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
      </section>
      {activeTab === 'Overview' && (
        errors.overview ? (
          <section className="mt-6">
            <ErrorState title="Dashboard overview unavailable" message={errors.overview} onRetry={() => fetchOverview(true)} />
          </section>
        ) : loadingOverview && !overview ? (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="rounded-2xl border bg-white p-5">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="mt-3 h-8 w-20" />
                </div>
              ))}
            </section>
            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <SkeletonBlock className="h-5 w-36" />
                <div className="mt-3"><SkeletonRows rows={4} /></div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <SkeletonBlock className="h-5 w-40" />
                <div className="mt-3"><SkeletonRows rows={4} /></div>
              </div>
            </section>
          </>
        ) : !overview ? (
          <section className="mt-6">
            <EmptyState title="No overview data yet" message="Refresh once users and exams start generating activity." onAction={() => refreshDashboard(true)} actionLabel="Refresh Data" />
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {summaryCards.map((item) => (
                <div key={item.label} className={`rounded-2xl bg-gradient-to-br ${item.tone} p-[1px] shadow-md transition hover:-translate-y-0.5`}>
                  <div className="rounded-2xl bg-white/95 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-1 text-3xl font-black text-slate-800">{item.value}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800">Recent Users</h2>
                {(overview?.recentUsers || []).length === 0 ? (
                  <div className="mt-3">
                    <EmptyState title="No recent users" message="New signups will appear here." />
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 text-sm">
                    {(overview?.recentUsers || []).map((user) => (
                      <div key={user._id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                        <span className="font-medium text-slate-700">{user.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{user.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800">Recent Submissions</h2>
                {(overview?.recentSubmissions || []).length === 0 ? (
                  <div className="mt-3">
                    <EmptyState title="No submissions yet" message="Submitted exam attempts will appear here." />
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 text-sm">
                    {(overview?.recentSubmissions || []).map((item) => (
                      <div key={item.id} className="rounded-xl border px-3 py-2">
                        <p className="font-semibold text-slate-800">{item.user?.name || 'Unknown'} - {item.exam?.title || 'Exam'}</p>
                        <p className="text-slate-600">Score: {item.score} ({item.percentage}%)</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )
      )}

      {activeTab === 'Users' && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800">User Management</h2>
            <p className="text-xs text-slate-500">Choose role then click Save.</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input className="rounded-xl border px-3 py-2 md:col-span-2" placeholder="Search by name, email, phone" value={userDraftFilters.search} onChange={(e) => setUserDraftFilters((prev) => ({ ...prev, search: e.target.value }))} />
            <select className="rounded-xl border px-3 py-2" value={userDraftFilters.role} onChange={(e) => setUserDraftFilters((prev) => ({ ...prev, role: e.target.value }))}>
              <option value="">All roles</option>
              <option value="student">student</option>
              <option value="admin">admin</option>
              <option value="instructor">instructor</option>
            </select>
            <button className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700" onClick={applyUserFilters}>Apply Filters</button>
          </div>

          {errors.users ? (
            <div className="mt-4">
              <ErrorState title="Failed to load users" message={errors.users} onRetry={() => fetchUsers(userFilters, true)} />
            </div>
          ) : loadingUsers ? (
            <div className="mt-4">
              <SkeletonRows rows={6} />
            </div>
          ) : (usersData.users || []).length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No users found" message="Try broadening your filters." actionLabel="Reset Filters" onAction={() => {
                setUserDraftFilters({ search: '', role: '' });
                setUserFilters((prev) => ({ ...prev, search: '', role: '', page: 1 }));
              }} />
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-3 md:hidden">
                {(usersData.users || []).map((user) => {
                  const draftRole = roleDrafts[user._id] || user.role;
                  const changed = draftRole !== user.role;
                  return (
                    <div key={user._id} className="rounded-xl border p-3">
                      <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                      <p className="mt-1 text-xs text-slate-600">{user.email}</p>
                      <p className="mt-1 text-xs text-slate-600">Phone: {user.phone || '-'}</p>
                      <p className="mt-1 text-xs text-slate-500">Created: {formatDate(user.createdAt)}</p>
                      <div className="mt-3 flex gap-2">
                        <select className="flex-1 rounded-lg border px-2 py-1 text-sm" value={draftRole} onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [user._id]: e.target.value }))}>
                          <option value="student">student</option>
                          <option value="admin">admin</option>
                          <option value="instructor">instructor</option>
                        </select>
                        <button type="button" disabled={!changed || savingRoleUserId === user._id} onClick={() => updateUserRole(user._id, draftRole)} className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{savingRoleUserId === user._id ? 'Saving...' : 'Save'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Phone</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Action</th>
                      <th className="py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(usersData.users || []).map((user) => {
                      const draftRole = roleDrafts[user._id] || user.role;
                      const changed = draftRole !== user.role;
                      return (
                        <tr key={user._id} className="border-b transition hover:bg-slate-50">
                          <td className="py-2 font-medium text-slate-700">{user.name}</td>
                          <td className="py-2">{user.email}</td>
                          <td className="py-2">{user.phone || '-'}</td>
                          <td className="py-2">
                            <select className="rounded-lg border px-2 py-1" value={draftRole} onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [user._id]: e.target.value }))}>
                              <option value="student">student</option>
                              <option value="admin">admin</option>
                              <option value="instructor">instructor</option>
                            </select>
                          </td>
                          <td className="py-2">
                            <button type="button" disabled={!changed || savingRoleUserId === user._id} onClick={() => updateUserRole(user._id, draftRole)} className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{savingRoleUserId === user._id ? 'Saving...' : 'Save'}</button>
                          </td>
                          <td className="py-2">{formatDate(user.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-slate-600">{loadingUsers ? 'Loading users...' : `Total ${usersData.total || 0} users`}</p>
            <div className="flex items-center gap-2">
              <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={(usersData.page || 1) <= 1} onClick={() => setUserFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}>Prev</button>
              <span>Page {usersData.page || 1} / {usersData.totalPages || 1}</span>
              <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={(usersData.page || 1) >= (usersData.totalPages || 1)} onClick={() => setUserFilters((prev) => ({ ...prev, page: prev.page + 1 }))}>Next</button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'Exams' && (
        <>
          {errors.exams && (
            <section className="mt-6">
              <ErrorState title="Exam data unavailable" message={errors.exams} onRetry={() => fetchExams(true)} />
            </section>
          )}

          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Create Exam</h2>
            <form onSubmit={createExam} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className="rounded-xl border px-3 py-2" placeholder="Exam title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
              <select className="rounded-xl border px-3 py-2" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
                {categories.map((category) => (<option key={category} value={category}>{category}</option>))}
              </select>
              <input type="date" className="rounded-xl border px-3 py-2" value={form.examDate} onChange={(e) => setForm((prev) => ({ ...prev, examDate: e.target.value }))} required />
              <input type="number" className="rounded-xl border px-3 py-2" value={form.durationMinutes} onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))} min={1} />
              <input type="number" className="rounded-xl border px-3 py-2" value={form.totalMarks} onChange={(e) => setForm((prev) => ({ ...prev, totalMarks: Number(e.target.value) }))} min={1} />
              <button className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Create</button>
            </form>
          </section>

          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Question Bank Upload (Manual JSON)</h2>
            <form onSubmit={bulkUpload} className="mt-4 space-y-3">
              <select className="w-full rounded-xl border px-3 py-2" value={bulkForm.examId} onChange={(e) => setBulkForm((prev) => ({ ...prev, examId: e.target.value }))} required>
                <option value="">Select exam</option>
                {exams.map((exam) => (<option key={exam._id} value={exam._id}>{exam.title}</option>))}
              </select>
              <select className="w-full rounded-xl border px-3 py-2" value={bulkForm.mode} onChange={(e) => setBulkForm((prev) => ({ ...prev, mode: e.target.value }))}>
                <option value="append">Append</option>
                <option value="replace">Replace</option>
              </select>
              <textarea rows={8} className="w-full rounded-xl border px-3 py-2 font-mono text-sm" value={bulkForm.json} onChange={(e) => setBulkForm((prev) => ({ ...prev, json: e.target.value }))} placeholder='[{"questionText":"...","options":["A","B"],"correctOptionIndex":0}]' />
              <button className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Upload Questions</button>
            </form>
          </section>
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-800">File Upload Manager (JSON / CSV)</h2>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50" onClick={() => downloadTemplate('json')}>JSON Template</button>
                <button type="button" className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50" onClick={() => downloadTemplate('csv')}>CSV Template</button>
              </div>
            </div>

            <form onSubmit={previewQuestionFileUpload} className="mt-4 space-y-3">
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={fileForm.examId}
                onChange={(e) => {
                  setFileForm((prev) => ({ ...prev, examId: e.target.value }));
                  setUploadPreview(null);
                }}
                required
              >
                <option value="">Select exam</option>
                {exams.map((exam) => (<option key={exam._id} value={exam._id}>{exam.title}</option>))}
              </select>

              <select
                className="w-full rounded-xl border px-3 py-2"
                value={fileForm.mode}
                onChange={(e) => {
                  setFileForm((prev) => ({ ...prev, mode: e.target.value }));
                  setUploadPreview(null);
                }}
              >
                <option value="append">Append</option>
                <option value="replace">Replace</option>
              </select>

              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-4 transition hover:border-brand-600">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="w-full rounded border px-3 py-2"
                  accept=".json,.csv,application/json,text/csv"
                  onChange={(e) => {
                    setFileForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }));
                    setUploadPreview(null);
                  }}
                />
                <p className="mt-2 text-xs text-slate-500">CSV headers: questionText, options, correctOptionIndex, explanation. Use `|` to split options.</p>
                {fileForm.file && <p className="mt-1 text-xs font-semibold text-slate-700">Selected: {fileForm.file.name}</p>}
              </div>

              <button className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={isGeneratingPreview}>{isGeneratingPreview ? 'Generating Preview...' : 'Generate Preview'}</button>
            </form>

            {uploadPreview && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-bold text-slate-800">Import Preview</h3>
                <p className="mt-1 text-xs text-slate-600">
                  File: <span className="font-semibold">{uploadPreview.fileName}</span> | Expires: {formatDateTime(uploadPreview.expiresAt)}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg bg-white px-3 py-2">Total rows: {uploadPreview.counts?.totalRows || 0}</div>
                  <div className="rounded-lg bg-white px-3 py-2">Importable: {uploadPreview.counts?.importableCount || 0}</div>
                  <div className="rounded-lg bg-white px-3 py-2">Duplicate rows: {uploadPreview.counts?.duplicateRows || 0}</div>
                  <div className="rounded-lg bg-white px-3 py-2">Within-file duplicates: {uploadPreview.counts?.duplicateWithinFileCount || 0}</div>
                  <div className="rounded-lg bg-white px-3 py-2">Existing-exam duplicates: {uploadPreview.counts?.duplicateExistingCount || 0}</div>
                  <div className="rounded-lg bg-white px-3 py-2">File limit: {formatBytes(uploadPreview.limits?.maxFileSizeBytes || 0)} / {uploadPreview.limits?.maxRows || 0} rows</div>
                </div>

                {(uploadPreview.duplicateRows || []).length > 0 && (
                  <div className="mt-3 rounded-xl border bg-white p-3">
                    <p className="text-xs font-semibold text-slate-700">Duplicate rows (showing up to 50)</p>
                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1 text-xs text-slate-600">
                      {uploadPreview.duplicateRows.map((row) => (
                        <div key={row.rowNumber} className="rounded-lg border px-2 py-1">
                          <p>Row {row.rowNumber}: {row.questionText}</p>
                          <p className="text-slate-500">Reasons: {(row.reasons || []).join(', ')}{row.firstRowNumber ? ` (first seen at row ${row.firstRowNumber})` : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select className="rounded-lg border px-3 py-2 text-sm" value={duplicateHandling} onChange={(e) => setDuplicateHandling(e.target.value)}>
                    <option value="skip">Skip duplicates (recommended)</option>
                    <option value="allow">Allow duplicates</option>
                  </select>
                  <button type="button" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" onClick={commitQuestionFileUpload} disabled={isCommittingPreview}>{isCommittingPreview ? 'Importing...' : 'Confirm Import'}</button>
                  <button
                    type="button"
                    className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setUploadPreview(null);
                      setDuplicateHandling('skip');
                    }}
                  >
                    Clear Preview
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Upload History</h2>
            <p className="mt-1 text-xs text-slate-500">Tracks uploader, timestamp, mode, and imported question counts.</p>
            {errors.uploadHistory ? (
              <div className="mt-4">
                <ErrorState title="Failed to load upload history" message={errors.uploadHistory} onRetry={() => fetchUploadHistory(true)} />
              </div>
            ) : loadingUploadHistory ? (
              <div className="mt-4">
                <SkeletonRows rows={5} />
              </div>
            ) : (uploadHistory.history || []).length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No upload history yet" message="Upload events will appear here after imports." />
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-3 md:hidden">
                  {(uploadHistory.history || []).map((item) => (
                    <div key={item.id} className="rounded-xl border p-3 text-xs text-slate-700">
                      <p className="font-semibold text-slate-800">{item.exam?.title || '-'}</p>
                      <p className="mt-1">Uploaded: {formatDateTime(item.uploadedAt)}</p>
                      <p className="mt-1">Uploader: {item.uploader?.name || item.uploader?.email || '-'}</p>
                      <p className="mt-1">Mode: {item.mode}</p>
                      <p className="mt-1">Rows: {item.totalRows} | Imported: {item.importedCount} | Skipped: {item.skippedDuplicateCount}</p>
                      <p className="mt-1 truncate">File: {item.fileName}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 hidden overflow-x-auto md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-slate-500">
                        <th className="py-2">When</th>
                        <th className="py-2">Exam</th>
                        <th className="py-2">Uploader</th>
                        <th className="py-2">Mode</th>
                        <th className="py-2">Rows</th>
                        <th className="py-2">Imported</th>
                        <th className="py-2">Skipped</th>
                        <th className="py-2">File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(uploadHistory.history || []).map((item) => (
                        <tr key={item.id} className="border-b transition hover:bg-slate-50">
                          <td className="py-2">{formatDateTime(item.uploadedAt)}</td>
                          <td className="py-2">{item.exam?.title || '-'}</td>
                          <td className="py-2">{item.uploader?.name || item.uploader?.email || '-'}</td>
                          <td className="py-2">{item.mode}</td>
                          <td className="py-2">{item.totalRows}</td>
                          <td className="py-2">{item.importedCount}</td>
                          <td className="py-2">{item.skippedDuplicateCount}</td>
                          <td className="py-2">{item.fileName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <p className="mt-3 text-xs text-slate-500">
              {loadingUploadHistory ? 'Loading upload history...' : `Total upload events: ${uploadHistory.total || 0}`}
            </p>
          </section>

          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Exam Manager</h2>
            {loadingExams ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="rounded-2xl border bg-slate-50 p-4">
                    <SkeletonBlock className="h-5 w-1/2" />
                    <SkeletonBlock className="mt-2 h-3 w-2/3" />
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <SkeletonBlock className="h-6 w-full" />
                      <SkeletonBlock className="h-6 w-full" />
                      <SkeletonBlock className="h-6 w-full" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <SkeletonBlock className="h-7 w-24" />
                      <SkeletonBlock className="h-7 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : exams.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No exams created yet" message="Create your first exam using the form above." />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {exams.map((exam) => (
                  <div key={exam._id} className="rounded-2xl border bg-slate-50 p-4 transition hover:shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">{exam.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">ID: {exam._id}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">{exam.category}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-3">
                      <div className="rounded bg-white px-2 py-1">Date: {formatDate(exam.examDate)}</div>
                      <div className="rounded bg-white px-2 py-1">Questions: {exam.questions?.length || 0}</div>
                      <div className="rounded bg-white px-2 py-1">Enrolled: {exam.enrolledStudents || 0}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button onClick={() => toggleFeatured(exam)} className={`rounded px-3 py-1 text-xs font-semibold ${exam.isFeatured ? 'bg-green-100 text-green-700' : 'bg-white text-slate-700'}`}>{exam.isFeatured ? 'Featured' : 'Set Featured'}</button>
                      <button onClick={() => setExpandedExamId((prev) => (prev === exam._id ? '' : exam._id))} className="rounded bg-white px-3 py-1 text-xs font-semibold text-slate-700">{expandedExamId === exam._id ? 'Hide Details' : 'Show Details'}</button>
                      <button onClick={() => removeExam(exam._id)} className="rounded bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Delete</button>
                    </div>

                    {expandedExamId === exam._id && (
                      <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600">
                        <p>Total Marks: {exam.totalMarks}</p>
                        <p>Duration: {exam.durationMinutes} minutes</p>
                        <p>Created: {formatDateTime(exam.createdAt)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'Reports' && (
        errors.reports ? (
          <section className="mt-6">
            <ErrorState title="Report data unavailable" message={errors.reports} onRetry={() => fetchReports(true)} />
          </section>
        ) : loadingReports && !reports ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="rounded-2xl bg-white p-5 shadow-sm">
                <SkeletonBlock className="h-5 w-40" />
                <div className="mt-4"><SkeletonRows rows={5} /></div>
              </div>
            ))}
          </section>
        ) : !reports ? (
          <section className="mt-6">
            <EmptyState title="No reports yet" message="Reports will appear after exam activity starts." onAction={() => fetchReports(true)} actionLabel="Load Reports" />
          </section>
        ) : (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Daily Submissions (Last 10)</h2>
              {topSubmissionDays.list.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No submission trend yet" message="Submission graph appears once students submit exams." />
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {topSubmissionDays.list.map((entry) => (
                    <div key={entry._id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{entry._id}</span>
                        <span className="text-slate-500">{entry.submissions}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-sky-500" style={{ width: toPercentWidth(entry.submissions || 0, topSubmissionDays.max) }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">User Role Breakdown</h2>
              {roleBreakdown.list.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No role data yet" message="Role breakdown appears when user records are available." />
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {roleBreakdown.list.map((entry) => (
                    <div key={entry._id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{entry._id}</span>
                        <span className="text-slate-500">{entry.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: toPercentWidth(entry.count || 0, roleBreakdown.max) }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Top Exam Performance</h2>
              {(reports?.examPerformance || []).length === 0 ? (
                <div className="mt-3">
                  <EmptyState title="No exam performance yet" message="Performance appears once submissions are graded." />
                </div>
              ) : (
                <div className="mt-3 space-y-2 text-sm">
                  {(reports?.examPerformance || []).map((item) => (
                    <div key={item.examId} className="rounded-xl border px-3 py-2">
                      <p className="font-semibold text-slate-800">{item.examTitle}</p>
                      <p className="text-slate-600">Submissions: {item.submissions} | Avg: {item.avgPercentage}% | Max: {item.maxScore}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Top Active Users</h2>
              {(reports?.topUsers || []).length === 0 ? (
                <div className="mt-3">
                  <EmptyState title="No active users yet" message="Active users will appear after submissions." />
                </div>
              ) : (
                <div className="mt-3 space-y-2 text-sm">
                  {(reports?.topUsers || []).map((item) => (
                    <div key={item.userId} className="rounded-xl border px-3 py-2">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-slate-600">{item.totalSubmissions} submissions | Avg: {item.avgPercentage}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )
      )}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        tone={confirmState.tone}
        isProcessing={confirmState.isProcessing}
        onCancel={closeConfirm}
        onConfirm={executeConfirm}
      />
    </main>
  );
}
