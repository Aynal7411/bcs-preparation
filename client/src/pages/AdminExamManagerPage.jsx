import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
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

function toPercentWidth(value, max) {
  if (!max || max <= 0) return '0%';
  return `${Math.max(6, Math.round((value / max) * 100))}%`;
}

export default function AdminExamManagerPage() {
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('Overview');
  const [overview, setOverview] = useState(null);
  const [reports, setReports] = useState(null);
  const [exams, setExams] = useState([]);
  const [usersData, setUsersData] = useState({ users: [], total: 0, page: 1, totalPages: 1 });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

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
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [expandedExamId, setExpandedExamId] = useState('');

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

  const fetchExams = async (showErrorToast = true) => {
    try {
      const { data } = await api.get('/exams');
      setExams(data);
      return data;
    } catch (error) {
      if (showErrorToast) toast.error(error.response?.data?.message || 'Failed to load exams');
      throw error;
    }
  };

  const fetchOverview = async (showErrorToast = true) => {
    try {
      const { data } = await api.get('/admin/dashboard');
      setOverview(data);
      return data;
    } catch (error) {
      if (showErrorToast) toast.error(error.response?.data?.message || 'Failed to load admin dashboard');
      throw error;
    }
  };

  const fetchReports = async (showErrorToast = true) => {
    try {
      const { data } = await api.get('/admin/reports');
      setReports(data);
      return data;
    } catch (error) {
      if (showErrorToast) toast.error(error.response?.data?.message || 'Failed to load reports');
      throw error;
    }
  };

  const fetchUsers = async (filters, showErrorToast = true) => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get('/admin/users', { params: filters });
      setUsersData(data);
      return data;
    } catch (error) {
      if (showErrorToast) toast.error(error.response?.data?.message || 'Failed to load users');
      throw error;
    } finally {
      setLoadingUsers(false);
    }
  };

  const refreshDashboard = async (showToast = true) => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchExams(showToast), fetchOverview(showToast), fetchReports(showToast), fetchUsers(userFilters, showToast)]);
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
    if (!window.confirm('Delete this exam and its results? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/exam/${id}`);
      toast.success('Exam deleted');
      if (expandedExamId === id) setExpandedExamId('');
      refreshDashboard(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete exam');
    }
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

  const bulkUpload = async (e) => {
    e.preventDefault();
    try {
      const questions = JSON.parse(bulkForm.json);
      await api.post('/admin/question/bulk', { examId: bulkForm.examId, mode: bulkForm.mode, questions });
      toast.success('Questions uploaded');
      setBulkForm((prev) => ({ ...prev, json: '[]' }));
      refreshDashboard(false);
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

  const uploadQuestionFile = async (e) => {
    e.preventDefault();
    if (!fileForm.examId) return toast.error('Select an exam first');
    if (!fileForm.file) return toast.error('Choose a JSON or CSV file');

    setIsUploadingFile(true);
    try {
      const payload = new FormData();
      payload.append('examId', fileForm.examId);
      payload.append('mode', fileForm.mode);
      payload.append('file', fileForm.file);
      const { data } = await api.post('/admin/question/upload-file', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(data.message || 'File uploaded successfully');
      setFileForm((prev) => ({ ...prev, file: null }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshDashboard(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'File upload failed');
    } finally {
      setIsUploadingFile(false);
    }
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
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-sky-500 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-cyan-200/30 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Control Center</h1>
            <p className="mt-2 text-sm text-white/90">Manage exams, users, uploads, and reports from one interactive dashboard.</p>
            <p className="mt-2 text-xs text-white/80">Last synced: {formatDateTime(lastSyncedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setActiveTab('Exams')} className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30">Manage Uploads</button>
            <button type="button" onClick={() => refreshDashboard(true)} disabled={isRefreshing} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-slate-100 disabled:opacity-60">{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</button>
          </div>
        </div>
      </section>

      <section className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? 'bg-brand-600 text-white shadow-md' : 'bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-sm'}`} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </section>
      {activeTab === 'Overview' && (
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
              <div className="mt-3 space-y-2 text-sm">
                {(overview?.recentUsers || []).map((user) => (
                  <div key={user._id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <span className="font-medium text-slate-700">{user.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{user.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Recent Submissions</h2>
              <div className="mt-3 space-y-2 text-sm">
                {(overview?.recentSubmissions || []).map((item) => (
                  <div key={item.id} className="rounded-xl border px-3 py-2">
                    <p className="font-semibold text-slate-800">{item.user?.name || 'Unknown'} - {item.exam?.title || 'Exam'}</p>
                    <p className="text-slate-600">Score: {item.score} ({item.percentage}%)</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
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

          <div className="mt-4 overflow-x-auto">
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

            <form onSubmit={uploadQuestionFile} className="mt-4 space-y-3">
              <select className="w-full rounded-xl border px-3 py-2" value={fileForm.examId} onChange={(e) => setFileForm((prev) => ({ ...prev, examId: e.target.value }))} required>
                <option value="">Select exam</option>
                {exams.map((exam) => (<option key={exam._id} value={exam._id}>{exam.title}</option>))}
              </select>

              <select className="w-full rounded-xl border px-3 py-2" value={fileForm.mode} onChange={(e) => setFileForm((prev) => ({ ...prev, mode: e.target.value }))}>
                <option value="append">Append</option>
                <option value="replace">Replace</option>
              </select>

              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-4 transition hover:border-brand-600">
                <input ref={fileInputRef} type="file" className="w-full rounded border px-3 py-2" accept=".json,.csv,application/json,text/csv" onChange={(e) => setFileForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} />
                <p className="mt-2 text-xs text-slate-500">CSV headers: questionText, options, correctOptionIndex, explanation. Use `|` to split options.</p>
                {fileForm.file && <p className="mt-1 text-xs font-semibold text-slate-700">Selected: {fileForm.file.name}</p>}
              </div>

              <button className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={isUploadingFile}>{isUploadingFile ? 'Uploading...' : 'Upload File'}</button>
            </form>
          </section>

          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Exam Manager</h2>
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

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
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
          </section>
        </>
      )}

      {activeTab === 'Reports' && (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Daily Submissions (Last 10)</h2>
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
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">User Role Breakdown</h2>
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
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Top Exam Performance</h2>
            <div className="mt-3 space-y-2 text-sm">
              {(reports?.examPerformance || []).map((item) => (
                <div key={item.examId} className="rounded-xl border px-3 py-2">
                  <p className="font-semibold text-slate-800">{item.examTitle}</p>
                  <p className="text-slate-600">Submissions: {item.submissions} | Avg: {item.avgPercentage}% | Max: {item.maxScore}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Top Active Users</h2>
            <div className="mt-3 space-y-2 text-sm">
              {(reports?.topUsers || []).map((item) => (
                <div key={item.userId} className="rounded-xl border px-3 py-2">
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p className="text-slate-600">{item.totalSubmissions} submissions | Avg: {item.avgPercentage}%</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
