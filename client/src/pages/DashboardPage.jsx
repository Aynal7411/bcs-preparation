import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export default function DashboardPage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState(null);
  const [achievements, setAchievements] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [profileRes, statsRes, progressRes, achievementsRes] = await Promise.all([
          api.get('/user/profile'),
          api.get('/user/stats'),
          api.get('/user/progress'),
          api.get('/user/achievements')
        ]);

        setProfile(profileRes.data);
        setStats(statsRes.data);
        setProgress(progressRes.data);
        setAchievements(achievementsRes.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load dashboard');
      }
    };

    loadDashboard();
  }, []);

  const summaryCards = useMemo(() => {
    if (!stats) {
      return [];
    }

    return [
      { label: 'Profile Completion', value: `${stats.profileCompletion || 0}%` },
      { label: 'Exam Targets', value: stats.examsTargeted || 0 },
      { label: 'Available Exams', value: stats.availableExams || 0 },
      { label: 'Active Jobs', value: stats.activeJobCirculars || 0 },
      { label: 'Member For', value: `${stats.joinedDaysAgo || 0} days` }
    ];
  }, [stats]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">User Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">Track your profile, learning progress, and achievements.</p>

      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Profile</h2>
        {!profile ? (
          <p className="mt-3 text-sm text-slate-500">Loading profile...</p>
        ) : (
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <p><span className="font-semibold">Name:</span> {profile.name}</p>
            <p><span className="font-semibold">Email:</span> {profile.email}</p>
            <p><span className="font-semibold">Phone:</span> {profile.phone || '-'}</p>
            <p><span className="font-semibold">Role:</span> {profile.role}</p>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((item) => (
          <div key={item.label} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Learning Progress</h2>
          {!progress ? (
            <p className="mt-3 text-sm text-slate-500">Loading progress...</p>
          ) : (
            <>
              <p className="mt-3 text-sm">Overall Progress: <span className="font-semibold">{progress.overallProgress}%</span></p>
              <p className="text-sm">Streak: <span className="font-semibold">{progress.streakDays} days</span></p>
              <div className="mt-4 space-y-3">
                {(progress.progressByTarget || []).map((item) => (
                  <div key={item.target}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>{item.target}</span>
                      <span>{item.progressPercent}%</span>
                    </div>
                    <div className="h-2 rounded bg-slate-200">
                      <div className="h-2 rounded bg-brand-600" style={{ width: `${item.progressPercent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Achievements</h2>
          {!achievements ? (
            <p className="mt-3 text-sm text-slate-500">Loading achievements...</p>
          ) : (
            <>
              <p className="mt-3 text-sm">Unlocked: <span className="font-semibold">{achievements.totalUnlocked}</span></p>
              <div className="mt-3 space-y-2">
                {(achievements.achievements || []).map((item) => (
                  <div key={item.key} className={`rounded border px-3 py-2 text-sm ${item.unlocked ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
