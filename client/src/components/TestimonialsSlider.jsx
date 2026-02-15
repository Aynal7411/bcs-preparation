import { useEffect, useMemo, useState } from 'react';

export default function TestimonialsSlider({ testimonials = [] }) {
  const stories = useMemo(
    () =>
      testimonials.length
        ? testimonials.map((item) => ({
            name: item.studentName,
            exam: item.examName,
            text: item.message
          }))
        : [
            { name: 'Rahim Uddin', exam: '43rd BCS', text: 'Structured practice and analytics made my prep consistent.' },
            { name: 'Nusrat Jahan', exam: 'Primary Teacher', text: 'Daily smart tests improved my speed and confidence.' }
          ],
    [testimonials]
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % stories.length), 3000);
    return () => clearInterval(timer);
  }, [stories]);

  const story = stories[index];

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Success Stories</h2>
      <blockquote className="mt-4 rounded-xl border-l-4 border-brand-600 bg-slate-50 p-4">
        <p className="text-slate-700">"{story.text}"</p>
        <footer className="mt-2 text-sm font-semibold text-brand-700">{story.name} - {story.exam}</footer>
      </blockquote>
    </section>
  );
}
