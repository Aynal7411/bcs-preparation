import { Suspense, lazy, useEffect, useState } from 'react';
import HeroStats from '../components/HeroStats';
import { api } from '../services/api';

const JobTicker = lazy(() => import('../components/JobTicker'));
const FeaturedExamsCarousel = lazy(() => import('../components/FeaturedExamsCarousel'));
const TestimonialsSlider = lazy(() => import('../components/TestimonialsSlider'));
const QuickStatsDashboard = lazy(() => import('../components/QuickStatsDashboard'));
const CTASection = lazy(() => import('../components/CTASection'));

export default function HomePage() {
  const [home, setHome] = useState({
    hero: null,
    featuredExams: [],
    jobs: [],
    testimonials: []
  });
  const [showSecondary, setShowSecondary] = useState(false);

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const { data } = await api.get('/home/summary');
        setHome(data);
      } catch {
        // Keep fallback data; avoid early toast work on first paint path.
      }
    };

    fetchHome();
  }, []);

  useEffect(() => {
    let timeoutId;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => setShowSecondary(true), { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    timeoutId = window.setTimeout(() => setShowSecondary(true), 300);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <HeroStats hero={home.hero} />

      {showSecondary ? (
        <Suspense fallback={null}>
          <JobTicker jobs={home.jobs} />
          <div className="grid gap-6 lg:grid-cols-2">
            <FeaturedExamsCarousel exams={home.featuredExams} />
            <TestimonialsSlider testimonials={home.testimonials} />
          </div>
          <QuickStatsDashboard />
          <CTASection />
        </Suspense>
      ) : null}
    </main>
  );
}
