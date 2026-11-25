import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth, type Voter } from '@/context/auth-context'
import api, { getErrorMessage } from '@/lib/api'
import {
    BarChart3,
    CheckCircle2,
    Clock,
    CreditCard,
    Loader2,
    LogOut,
    MapPin,
    UserCircle2,
    Vote,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface BallotSummary {
    election_id: string
    election_round_id: string | null
    name: string
    position_label: string
    region_name: string | null
    round_number: number
    has_voted: boolean
}

export default function DashboardPage() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const voter = user?.data as Voter

    const [ballots, setBallots] = useState<BallotSummary[]>([])
    const [periodName, setPeriodName] = useState<string | null>(null)
    const [loadingBallots, setLoadingBallots] = useState(true)
    const [ballotError, setBallotError] = useState('')

    useEffect(() => {
        api.get('/vote/ballots')
            .then((res) => {
                setBallots(res.data.elections ?? [])
                setPeriodName(res.data.period?.name ?? null)
            })
            .catch((err) => setBallotError(getErrorMessage(err, 'Gagal memuat daftar pemilihan aktif.')))
            .finally(() => setLoadingBallots(false))
    }, [])

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const pendingCount = ballots.filter((b) => !b.has_voted).length
    const allDone = ballots.length > 0 && pendingCount === 0

    return (
        <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-300 selection:bg-blue-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
            <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[40rem] w-[40rem] rounded-full bg-blue-500/10 blur-[128px] dark:bg-blue-600/15" />
            <div className="pointer-events-none absolute right-[-10%] bottom-[-10%] h-[40rem] w-[40rem] rounded-full bg-indigo-500/10 blur-[128px] dark:bg-indigo-600/15" />

            <header className="z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-md">
                        <Vote className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-lg leading-none font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Dashboard Pemilih
                        </h1>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {periodName || 'Sistem E-Voting Wilayah Bali'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Link
                        to="/live-count"
                        className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Live Count</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Keluar</span>
                    </button>
                </div>
            </header>

            <main className="z-10 mx-auto w-full max-w-2xl flex-1 px-6 py-8">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
                        <div className="rounded-2xl bg-blue-500/10 p-3.5 text-blue-600 dark:text-blue-400">
                            <UserCircle2 className="h-8 w-8" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {voter.name}
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Pemilih terdaftar dalam DPT</p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
                            <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    NIK
                                </p>
                                <p className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">{voter.nik}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
                            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Domisili Wilayah
                                </p>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {[voter.banjar_name, voter.kelurahan_name, voter.kecamatan_name, voter.kabupaten_name]
                                        .filter(Boolean)
                                        .join(', ') || '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Briefing Daftar Pemilihan yang Akan Diikuti */}
                    <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                        <h3 className="text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                            Pemilihan yang Anda Ikuti Hari Ini
                        </h3>

                        {ballotError && (
                            <p className="mt-2 text-xs text-rose-500">{ballotError}</p>
                        )}

                        {loadingBallots ? (
                            <div className="flex items-center justify-center py-6 text-xs text-slate-400">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memeriksa pemilihan aktif...
                            </div>
                        ) : ballots.length === 0 ? (
                            <div className="mt-3 rounded-2xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500 dark:border-slate-800">
                                Belum ada pemilihan yang sedang dibuka untuk wilayah Anda saat ini.
                            </div>
                        ) : (
                            <div className="mt-3 space-y-2.5">
                                {ballots.map((b, idx) => (
                                    <div
                                        key={b.election_round_id ?? b.election_id}
                                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-xs font-bold text-blue-600 dark:text-blue-400">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">{b.name}</p>
                                                <p className="text-[11px] text-slate-500">
                                                    {b.position_label} • Putaran {b.round_number}
                                                    {b.region_name ? ` • ${b.region_name}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        {b.has_voted ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3 w-3" /> Sudah
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                                                <Clock className="h-3 w-3" /> Belum
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        {allDone ? (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
                                <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                                <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                    Terima kasih, semua suara Anda sudah tercatat
                                </p>
                                <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/70">
                                    Hak pilih pada seluruh pemilihan aktif telah digunakan.
                                </p>
                            </div>
                        ) : pendingCount > 0 ? (
                            <Link
                                to="/vote"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
                            >
                                <Vote className="h-4 w-4" />
                                <span>
                                    Masuk Bilik Suara ({pendingCount} Pemilihan)
                                </span>
                            </Link>
                        ) : null}
                    </div>
                </div>
            </main>

            <footer className="z-10 mx-auto w-full max-w-7xl px-6 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                &copy; {new Date().getFullYear()} Panitia Pemilihan Digital Wilayah Bali (E-Voting).
            </footer>
        </div>
    )
}
