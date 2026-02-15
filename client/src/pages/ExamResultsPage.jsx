import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function ExamResultsPage() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/exams/results');
        setResults(data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load results');
      }
    };

    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Result Calculation</h1>
      <p className="mt-1 text-sm text-slate-600">Your submitted exams and performance summary.</p>

      <div className="mt-6 overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-2">Exam</th>
              <th className="py-2">Score</th>
              <th className="py-2">Correct</th>
              <th className="py-2">Percentage</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.exam?.title}</td>
                <td className="py-2">{item.score}</td>
                <td className="py-2">{item.correctAnswers}/{item.totalQuestions}</td>
                <td className="py-2">{item.percentage}%</td>
                <td className="py-2">
                  <Link className="rounded border px-3 py-1" to={`/results/${item.id}`}>Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
