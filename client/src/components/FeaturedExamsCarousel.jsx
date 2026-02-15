import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function FeaturedExamsCarousel({ exams = [] }) {
  const normalized = useMemo(
    () =>
      exams.length
        ? exams
        : [
            { _id: 'fallback-1', title: 'BCS Preliminary Mega Test', examDate: '2026-02-18', enrolledStudents: 12450 },
            { _id: 'fallback-2', title: 'Primary Teacher Full Model Test', examDate: '2026-02-20', enrolledStudents: 9340 }
          ],
    [exams]
  );

  const [index, setIndex] = useState(0);
  const item = normalized[index];

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Featured Exams</h2>
        <div className="flex gap-2">
          <button onClick={() => setIndex((index - 1 + normalized.length) % normalized.length)} className="rounded-md border px-3 py-1 text-sm">Prev</button>
          <button onClick={() => setIndex((index + 1) % normalized.length)} className="rounded-md border px-3 py-1 text-sm">Next</button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-lg font-semibold">{item.title}</h3>
        <p className="mt-2 text-sm text-slate-600">Exam Date: {format(new Date(item.examDate), 'dd MMM yyyy')}</p>
        <p className="text-sm text-slate-600">Participants: {(item.enrolledStudents || 0).toLocaleString()}</p>
        {item._id && !String(item._id).startsWith('fallback') ? (
          <Link to={`/live-exam/${item._id}`} className="mt-4 inline-block rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Start Live Exam
          </Link>
        ) : null}
      </div>
    </section>
  );
}
