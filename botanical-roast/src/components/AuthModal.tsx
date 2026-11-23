import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface AuthModalProps {
  open: boolean;
  supabaseConfigured: boolean;
  initialMode?: 'login' | 'register';
  contextMessage?: string | null;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (fullName: string, email: string, password: string) => Promise<void>;
}

export function AuthModal({
  open,
  supabaseConfigured,
  initialMode = 'login',
  contextMessage,
  onClose,
  onLogin,
  onRegister,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (mode === 'register' && fullName.trim().length < 2) {
      setError('Nama lengkap minimal 2 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onLogin(email.trim(), password);
      } else {
        await onRegister(fullName.trim(), email.trim(), password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autentikasi gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1c18]/45 p-4 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-md rounded-[1.5rem] border border-[#e2ddd2] bg-[#fcf9f2] p-6 shadow-ambient sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#7a582f]">
              {supabaseConfigured ? 'Supabase Authentication' : 'Akun Anggota Green Cafe'}
            </p>
            <h2 id="auth-modal-title" className="mt-1 font-serif text-2xl font-semibold text-[#1c1c18]">
              {mode === 'login' ? 'Masuk ke Akun Anda' : 'Daftar Anggota Baru'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela masuk"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2ddd2] bg-[#faf8f5] text-[#1c1c18] hover:bg-[#ece7dd]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {contextMessage && (
          <p className="mt-4 rounded-xl border border-[#c49a6c]/40 bg-[#f6f3ec] px-3.5 py-2.5 text-xs leading-relaxed text-[#5f401a]">
            {contextMessage}
          </p>
        )}

        {/* Mode Switch */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-[#ece7dd] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`rounded-full py-2 text-xs font-semibold transition-colors ${
              mode === 'login' ? 'bg-[#2d3b2d] text-white' : 'text-[#5c6659] hover:text-[#1c1c18]'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`rounded-full py-2 text-xs font-semibold transition-colors ${
              mode === 'register'
                ? 'bg-[#2d3b2d] text-white'
                : 'text-[#5c6659] hover:text-[#1c1c18]'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-fullname" className="block text-xs font-semibold text-[#1c1c18]">
                Nama Lengkap
              </label>
              <input
                id="auth-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Arum Sari"
                className="mt-1 w-full rounded-lg border border-[#d7d1c4] bg-white px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-[#1c1c18]">
              Alamat Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="mt-1 w-full rounded-lg border border-[#d7d1c4] bg-white px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold text-[#1c1c18]">
              Kata Sandi
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="mt-1 w-full rounded-lg border border-[#d7d1c4] bg-white px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-[#ffdad6] px-3 py-2 text-xs font-medium text-[#93000a]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#2d3b2d] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#182519] disabled:opacity-60"
          >
            {submitting
              ? 'Memproses...'
              : mode === 'login'
                ? 'Masuk Sekarang'
                : 'Buat Akun Anggota'}
          </button>
        </form>
      </div>
    </div>
  );
}
