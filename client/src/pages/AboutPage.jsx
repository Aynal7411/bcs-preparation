import { Link } from 'react-router-dom';

const highlights = [
  { label: 'Learners Supported', value: '10,000+' },
  { label: 'Exam Tracks', value: 'BCS, Primary, NTRCA, Bank' },
  { label: 'Focused Platform', value: 'Bangladesh Govt Jobs' }
];

const pillars = [
  {
    title: 'Mission',
    description:
      'Help BCS, primary, and government job candidates prepare with clear study tools, quality exams, and practical progress tracking.'
  },
  {
    title: 'Vision',
    description:
      'Build the most trusted digital preparation company for Bangladesh public service and teaching career aspirants.'
  },
  {
    title: 'Approach',
    description:
      'We combine topic-wise question banks, live exam practice, and performance feedback so candidates can improve with confidence.'
  }
];

const services = [
  'BCS and primary exam preparation dashboards',
  'Live exam simulation and result analytics',
  'Question bank upload and management tools',
  'Career-focused learning flow for job seekers'
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-sky-500 p-6 text-white shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">About The Company</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Govt Job Live</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/90 sm:text-base">
          Govt Job Live is a Bangladesh-focused BCS preparation and job exam technology company. We build a practical
          learning platform for general users, BCS primary examinees, and job seekers who want structured preparation.
        </p>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.label} className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-black text-slate-800">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {pillars.map((item) => (
          <article key={item.title} className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">What We Build</h2>
        <p className="mt-2 text-sm text-slate-600">
          Our platform is designed for serious exam preparation with smooth user management, admin control, and
          measurable learning outcomes.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {services.map((item) => (
            <li key={item} className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Start Preparation Today</h2>
          <p className="mt-1 text-sm text-slate-600">Create your account and begin your BCS and job exam journey.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/register" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Create Account
          </Link>
          <Link to="/login" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
