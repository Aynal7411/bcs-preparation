import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const examTargetOptions = ['BCS', 'Primary', 'NTRCA', 'Bank', 'Govt Bank', 'Railway', 'Police SI', 'Private Bank', 'Other'];

function toInputDate(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString();
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    bio: '',
    examTargets: []
  });
  const [isSaving, setIsSaving] = useState(false);

  const completion = useMemo(() => {
    if (!stats) return 0;
    return stats.profileCompletion || 0;
  }, [stats]);

  const loadProfile = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([api.get('/user/profile'), api.get('/user/stats')]);
      setProfile(profileRes.data);
      setStats(statsRes.data);
      setForm({
        name: profileRes.data.name || '',
        phone: profileRes.data.phone || '',
        bio: profileRes.data.bio || '',
        examTargets: profileRes.data.examTargets || []
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load profile');
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const toggleTarget = (target) => {
    setForm((prev) => ({
      ...prev,
      examTargets: prev.examTargets.includes(target)
        ? prev.examTargets.filter((item) => item !== target)
        : [...prev.examTargets, target]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/user/profile', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        examTargets: form.examTargets
      });
      toast.success('Profile updated');
      loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">{profile?.name || 'User'} Profile</h1>
      <p className="mt-1 text-sm text-slate-600">Manage your account as a general user, examinee, or job seeker.</p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Profile Completion</p>
          <p className="mt-1 text-3xl font-bold">{completion}%</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Joined</p>
          <p className="mt-1 text-xl font-semibold">{toInputDate(profile?.createdAt)}</p>
        </div>
      </section>

      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Profile Information</h2>
        {!profile ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleSave}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input className="mt-1 w-full rounded border bg-slate-50 px-3 py-2" value={profile.email || ''} readOnly />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <input className="mt-1 w-full rounded border bg-slate-50 px-3 py-2 capitalize" value={profile.role || ''} readOnly />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Bio</label>
              <textarea
                rows={4}
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              />
            </div>

            <div>
              <p className="text-sm font-medium">Exam / Career Targets</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {examTargetOptions.map((target) => (
                  <label key={target} className="flex items-center gap-2 rounded border px-2 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.examTargets.includes(target)}
                      onChange={() => toggleTarget(target)}
                    />
                    <span>{target}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              disabled={isSaving}
              className="rounded bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
