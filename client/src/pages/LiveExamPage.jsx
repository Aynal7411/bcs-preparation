import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

export default function LiveExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const bootstrapExam = async () => {
      try {
        await api.post(`/exams/start/${id}`);
        const [examRes, questionsRes] = await Promise.all([api.get(`/exams/${id}`), api.get(`/exams/${id}/questions`)]);
        setExam(examRes.data);
        setQuestions(questionsRes.data.questions || []);
        setTimeLeft((examRes.data.durationMinutes || 60) * 60);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to start exam');
      }
    };

    bootstrapExam();
  }, [id]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const payloadAnswers = useMemo(
    () =>
      Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({
        questionId,
        selectedOptionIndex
      })),
    [answers]
  );

  const submitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/exams/submit/${id}`, { answers: payloadAnswers });
      toast.success('Exam submitted');
      navigate(`/results/${data.result.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (timeLeft === 0 && questions.length > 0) {
      submitExam();
    }
  }, [timeLeft, questions.length]);

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">Live Exam System</h1>
          <p className="text-sm text-slate-600">{exam?.title || 'Loading exam...'}</p>
        </div>
        <p className="text-lg font-bold text-red-600">{minutes}:{seconds}</p>
      </div>

      <div className="space-y-4">
        {questions.map((question, idx) => (
          <article key={question.id} className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Q{idx + 1}. {question.questionText}</h2>
            <div className="mt-3 space-y-2">
              {(question.options || []).map((option, optionIdx) => (
                <label key={optionIdx} className="flex cursor-pointer items-center gap-2 rounded border px-3 py-2">
                  <input
                    type="radio"
                    name={question.id}
                    checked={Number(answers[question.id]) === optionIdx}
                    onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: optionIdx }))}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6">
        <button onClick={submitExam} disabled={submitting} className="rounded bg-brand-600 px-6 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-70">
          {submitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      </div>
    </main>
  );
}
