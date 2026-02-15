import { Link } from 'react-router-dom';

export default function CTASection() {
  return (
    <section className="rounded-2xl bg-slate-900 p-8 text-center text-white">
      <h2 className="text-2xl font-extrabold">Start Preparation Now</h2>
      <p className="mt-2 text-slate-300">Join thousands of aspirants preparing for government jobs in Bangladesh.</p>
      <Link to="/login" className="mt-5 inline-block rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
        Start Preparation Now
      </Link>
    </section>
  );
}
