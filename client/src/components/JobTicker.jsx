import { useMemo } from 'react';
import { format } from 'date-fns';

export default function JobTicker({ jobs = [] }) {
  const items = useMemo(
    () =>
      jobs.length
        ? jobs.map((job) => `${job.organization}: ${job.title} (Deadline: ${format(new Date(job.deadline), 'dd MMM yyyy')})`)
        : [
            'Ministry of Education: Assistant Teacher (Deadline: 28 Feb 2026)',
            'Bangladesh Bank: Officer General (Deadline: 05 Mar 2026)'
          ],
    [jobs]
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 py-3">
      <div className="ticker whitespace-nowrap px-4 text-sm font-medium text-amber-900">
        {items.map((job, idx) => (
          <span className="mr-10" key={idx}>• {job}</span>
        ))}
      </div>
    </section>
  );
}
