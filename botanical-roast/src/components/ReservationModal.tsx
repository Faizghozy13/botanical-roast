import { Calendar, CheckCircle2, Clock, Users, UtensilsCrossed, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { ReservationRecord, UserProfile } from '../shared/types';

interface ReservationModalProps {
  open: boolean;
  user: UserProfile | null;
  submitting: boolean;
  onClose: () => void;
  onSubmitReservation: (payload: {
    customerName: string;
    customerEmail: string;
    phone: string;
    guests: number;
    tableNumber: string;
    reservationDate: string;
    reservationTime: string;
    notes?: string;
  }) => Promise<ReservationRecord>;
  onProceedToMenu: (tableLabel: string) => void;
}

const TABLE_OPTIONS = [
  'Meja 01 · Area Barista',
  'Meja 02 · Dekat Jendela',
  'Meja 04 · Teras Taman',
  'Meja 07 · Indoor Tenang',
  'Meja 09 · Ruang Komunal',
];

export function ReservationModal({
  open,
  user,
  submitting,
  onClose,
  onSubmitReservation,
  onProceedToMenu,
}: ReservationModalProps) {
  const [customerName, setCustomerName] = useState(user?.fullName ?? '');
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('0812-3456-7890');
  const [guests, setGuests] = useState(2);
  const [tableNumber, setTableNumber] = useState(TABLE_OPTIONS[2]);
  const [reservationDate, setReservationDate] = useState(new Date().toISOString().slice(0, 10));
  const [reservationTime, setReservationTime] = useState('15:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ReservationRecord | null>(null);

  if (!open) return null;

  const effectiveName = customerName || user?.fullName || '';
  const effectiveEmail = customerEmail || user?.email || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (effectiveName.trim().length < 2) {
      setError('Nama lengkap wajib diisi minimal 2 karakter.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail.trim())) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    try {
      const record = await onSubmitReservation({
        customerName: effectiveName.trim(),
        customerEmail: effectiveEmail.trim(),
        phone: phone.trim(),
        guests,
        tableNumber,
        reservationDate,
        reservationTime,
        notes: notes.trim() || undefined,
      });
      setConfirmed(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat reservasi meja.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#182519]/45 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#e5e2db] bg-[#fcf9f2] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e2db] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f1eee7] text-[#182519]">
              <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#7a582f]">
                Green Cafe Dine-In
              </p>
              <h2
                id="reservation-modal-title"
                className="font-serif text-2xl font-semibold text-[#182519]"
              >
                Reservasi Meja
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmed(null);
              onClose();
            }}
            aria-label="Tutup reservasi"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1eee7] text-[#444842] hover:bg-[#e5e2db]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {confirmed ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl bg-[#d7e7d3]/60 p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[#182519]" aria-hidden="true" />
              <p className="mt-2 font-mono text-xs font-bold tracking-wider text-[#2d3b2d]">
                KODE RESERVASI: {confirmed.reservationCode}
              </p>
              <h3 className="mt-1 font-serif text-xl font-semibold text-[#182519]">
                Meja Anda Telah Terjadwal
              </h3>
              <p className="mt-1 text-sm text-[#444842]">
                {confirmed.tableNumber} • {confirmed.guests} Tamu • {confirmed.reservationDate} pukul{' '}
                {confirmed.reservationTime} WIB
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  const tbl = confirmed.tableNumber;
                  setConfirmed(null);
                  onProceedToMenu(tbl);
                }}
                className="flex-1 rounded-full bg-[#182519] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2d3b2d]"
              >
                Lanjut Pesan Menu (Dine-In)
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmed(null);
                  onClose();
                }}
                className="rounded-full border border-[#c4c8c0] px-5 py-3 text-sm font-semibold text-[#182519] hover:bg-[#f1eee7]"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="res-name" className="block text-xs font-semibold text-[#182519]">
                  Nama Lengkap
                </label>
                <input
                  id="res-name"
                  type="text"
                  required
                  value={effectiveName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pemesan"
                  className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-white px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="res-email" className="block text-xs font-semibold text-[#182519]">
                  Email Konfirmasi
                </label>
                <input
                  id="res-email"
                  type="email"
                  required
                  value={effectiveEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-white px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="res-phone" className="block text-xs font-semibold text-[#182519]">
                  No. WhatsApp / Telepon
                </label>
                <input
                  id="res-phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-white px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="res-guests" className="block text-xs font-semibold text-[#182519]">
                  Jumlah Tamu
                </label>
                <div className="relative mt-1">
                  <Users
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#747872]"
                    aria-hidden="true"
                  />
                  <input
                    id="res-guests"
                    type="number"
                    min={1}
                    max={20}
                    value={guests}
                    onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-[#c4c8c0] bg-white py-2.5 pr-3.5 pl-9 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="res-table" className="block text-xs font-semibold text-[#182519]">
                Pilih Area &amp; Nomor Meja
              </label>
              <select
                id="res-table"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-white px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
              >
                {TABLE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="res-date" className="block text-xs font-semibold text-[#182519]">
                  Tanggal Kedatangan
                </label>
                <div className="relative mt-1">
                  <Calendar
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#747872]"
                    aria-hidden="true"
                  />
                  <input
                    id="res-date"
                    type="date"
                    required
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                    className="w-full rounded-xl border border-[#c4c8c0] bg-white py-2.5 pr-3 pl-9 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="res-time" className="block text-xs font-semibold text-[#182519]">
                  Jam Kedatangan (WIB)
                </label>
                <div className="relative mt-1">
                  <Clock
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#747872]"
                    aria-hidden="true"
                  />
                  <input
                    id="res-time"
                    type="time"
                    required
                    value={reservationTime}
                    onChange={(e) => setReservationTime(e.target.value)}
                    className="w-full rounded-xl border border-[#c4c8c0] bg-white py-2.5 pr-3 pl-9 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="res-notes" className="block text-xs font-semibold text-[#182519]">
                Catatan Meja (Opsional)
              </label>
              <input
                id="res-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: dekat colokan listrik atau area teduh"
                className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-white px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-[#ffdad6] px-3.5 py-2 text-xs font-medium text-[#93000a]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#182519] py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2d3b2d] disabled:opacity-60"
            >
              {submitting ? 'Menyimpan Reservasi...' : 'Konfirmasi Reservasi Meja'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
