import { useEffect, useMemo, useState } from 'react';

export default function HeroStats({ hero }) {
  const targets = useMemo(
    () => ({
      totalStudents: hero?.totalStudents ?? 125000,
      totalExams: hero?.totalExams ?? 850,
      passingRate: hero?.passingRate ?? 78
    }),
    [hero]
  );

  const [count, setCount] = useState({ totalStudents: 0, totalExams: 0, passingRate: 0 });

  useEffect(() => {
    setCount({ totalStudents: 0, totalExams: 0, passingRate: 0 });
    const interval = setInterval(() => {
      setCount((prev) => {
        const next = {
          totalStudents: Math.min(prev.totalStudents + Math.ceil(targets.totalStudents / 50), targets.totalStudents),
          totalExams: Math.min(prev.totalExams + Math.max(1, Math.ceil(targets.totalExams / 50)), targets.totalExams),
          passingRate: Math.min(prev.passingRate + 2, targets.passingRate)
        };
        if (
          next.totalStudents === targets.totalStudents &&
          next.totalExams === targets.totalExams &&
          next.passingRate === targets.passingRate
        ) {
          clearInterval(interval);
        }
        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [targets]);

  return (
    <section className="rounded-2xl bg-gradient-to-r from-brand-700 to-cyan-600 p-8 text-white">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Bangladesh Government Job Preparation Platform</h1>
      <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
        BCS, Primary Teacher, NTRCA, Bank and all competitive exam preparation in one place.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Students" value={count.totalStudents.toLocaleString()} />
        <StatCard label="Total Exams" value={count.totalExams.toLocaleString()} />
        <StatCard label="Passing Rate" value={`${count.passingRate}%`} />
      </div>
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-xs uppercase text-cyan-100">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
