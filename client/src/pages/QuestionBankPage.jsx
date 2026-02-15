import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({ category: '', q: '' });

  const loadQuestions = async () => {
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.q) params.q = filters.q;
      const { data } = await api.get('/questions', { params });
      setQuestions(data.questions || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load questions');
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadRandom = async () => {
    try {
      const { data } = await api.get('/questions/random', { params: { count: 10, category: filters.category || undefined } });
      setQuestions(data.questions || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load random questions');
    }
  };

  const bookmark = async (questionId, examId) => {
    try {
      await api.post(`/questions/bookmark/${questionId}`, { examId });
      toast.success('Bookmarked');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bookmark failed');
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Question Bank Management</h1>
      <p className="mt-1 text-sm text-slate-600">Filter, practice, and bookmark important questions.</p>

      <div className="mt-6 grid gap-3 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-4">
        <input
          className="rounded border px-3 py-2"
          placeholder="Search question text"
          value={filters.q}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
        />
        <select
          className="rounded border px-3 py-2"
          value={filters.category}
          onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
        >
          <option value="">All categories</option>
          <option value="BCS">BCS</option>
          <option value="Primary">Primary</option>
          <option value="NTRCA">NTRCA</option>
          <option value="Bank">Bank</option>
          <option value="Others">Others</option>
        </select>
        <button onClick={loadQuestions} className="rounded bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Apply</button>
        <button onClick={loadRandom} className="rounded border px-4 py-2 font-semibold">Random 10</button>
      </div>

      <div className="mt-6 space-y-3">
        {questions.map((question) => (
          <article key={question.id} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-500">{question.category} - {question.examTitle}</p>
            <h3 className="mt-1 font-semibold">{question.questionText}</h3>
            <ol className="mt-2 list-inside list-decimal text-sm text-slate-700">
              {(question.options || []).map((option, index) => (
                <li key={index}>{option}</li>
              ))}
            </ol>
            <div className="mt-3 flex gap-3">
              <button onClick={() => bookmark(question.id, question.examId)} className="rounded border px-3 py-1 text-sm">Bookmark</button>
              <Link to={`/live-exam/${question.examId}`} className="rounded bg-brand-600 px-3 py-1 text-sm font-semibold text-white">Take Live Exam</Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
