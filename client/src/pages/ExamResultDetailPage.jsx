import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

export default function ExamResultDetailPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadResult = async () => {
      try {
        const { data } = await api.get(`/exams/result/${id}`);
        setResult(data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load result details');
      }
    };

    loadResult();
  }, [id]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Result Details</h1>
      {!result ? (
        <p className="mt-4 text-sm text-slate-500">Loading result...</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{result.exam?.title}</p>
            <p className="mt-1 text-lg font-semibold">Score: {result.score} ({result.percentage}%)</p>
            <p className="text-sm">Correct: {result.correctAnswers}/{result.totalQuestions}</p>
          </div>

          <div className="mt-6 space-y-3">
            {(result.answers || []).map((ans, idx) => (
              <article key={`${ans.questionId}-${idx}`} className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="font-semibold">Q{idx + 1}. {ans.questionText}</h2>
                <p className="mt-2 text-sm">Your Answer: {ans.options?.[ans.selectedOptionIndex] || '-'}</p>
                <p className="text-sm">Correct Answer: {ans.options?.[ans.correctOptionIndex] || '-'}</p>
                <p className={`mt-1 text-sm font-semibold ${ans.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {ans.isCorrect ? 'Correct' : 'Wrong'}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
