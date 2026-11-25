import { CandidateModal, type Candidate } from '@/components/candidate-modal'
import { ConfirmModal } from '@/components/confirm-modal'
import api, { getErrorMessage, getValidationErrors } from '@/lib/api'
import {
    type ElectionItem,
    type ElectionPeriodItem,
    PERIOD_STATUS_LABELS,
    POSITION_LABELS,
    type PositionType,
    ROUND_STATUS_LABELS,
} from '@/lib/elections'
import { type RegionItem } from '@/lib/regions'
import {
    Award,
    BarChart3,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Download,
    Loader2,
    Pencil,
    Play,
    Plus,
    Square,
    Trash2,
    Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface ElectionManagerProps {
    regions: RegionItem[]
    onNotify: (msg: string) => void
    onError: (msg: string) => void
}

export function ElectionManager({ regions, onNotify, onError }: ElectionManagerProps) {
    const [periods, setPeriods] = useState<ElectionPeriodItem[]>([])
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
    const [elections, setElections] = useState<ElectionItem[]>([])
    const [selectedElection, setSelectedElection] = useState<ElectionItem | null>(null)
    const [electionCandidates, setElectionCandidates] = useState<Candidate[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingCandidates, setLoadingCandidates] = useState(false)

    // Period modal state
    const [periodModal, setPeriodModal] = useState<{ open: boolean; editing: ElectionPeriodItem | null }>({
        open: false,
        editing: null,
    })
    const [periodForm, setPeriodForm] = useState({
        name: '',
        year: new Date().getFullYear(),
        start_date: '',
        end_date: '',
        status: 'draft' as 'draft' | 'active' | 'archived',
    })
    const [periodErrors, setPeriodErrors] = useState<Record<string, string>>({})
    const [savingPeriod, setSavingPeriod] = useState(false)

    // Election modal state
    const [electionModalOpen, setElectionModalOpen] = useState(false)
    const [electionForm, setElectionForm] = useState({
        name: '',
        position_type: 'bupati' as PositionType,
        kabupaten_id: '',
        kecamatan_id: '',
        kelurahan_id: '',
        win_threshold_percent: '60',
        seat_count: '6',
        dapil_name: '',
        dapil_region_ids: [] as string[],
    })
    const [electionErrors, setElectionErrors] = useState<Record<string, string>>({})
    const [savingElection, setSavingElection] = useState(false)

    // Candidate modal for selected election
    const [candidateModal, setCandidateModal] = useState<{ open: boolean; candidate: Candidate | null }>({
        open: false,
        candidate: null,
    })

    // Evaluation & runoff modal state
    const [evalModal, setEvalModal] = useState<{
        open: boolean
        election: ElectionItem | null
        round: NonNullable<ElectionItem['rounds']>[number] | null
        loading: boolean
        data: any | null
        advancingIds: string[]
        creatingRunoff: boolean
    }>({
        open: false,
        election: null,
        round: null,
        loading: false,
        data: null,
        advancingIds: [],
        creatingRunoff: false,
    })

    // Confirm delete
    const [pendingDelete, setPendingDelete] = useState<
        | { type: 'period'; id: string; name: string }
        | { type: 'election'; id: string; name: string }
        | { type: 'candidate'; id: string; name: string }
        | null
    >(null)

    const kabupatenList = regions.filter((r) => r.level === 'kabupaten')
    const kecamatanList = regions.filter(
        (r) => r.level === 'kecamatan' && r.kabupaten_id === electionForm.kabupaten_id,
    )
    const kelurahanList = regions.filter(
        (r) => r.level === 'kelurahan' && r.kecamatan_id === electionForm.kecamatan_id,
    )

    const fetchPeriods = async (keepPeriodId?: string) => {
        try {
            const { data } = await api.get<{ periods: ElectionPeriodItem[] }>('/admin/periods')
            setPeriods(data.periods)

            const target =
                (keepPeriodId && data.periods.find((p) => p.id === keepPeriodId)?.id) ||
                data.periods.find((p) => p.status === 'active')?.id ||
                data.periods[0]?.id ||
                ''

            setSelectedPeriodId(target)
            if (target) {
                await fetchElections(target)
            } else {
                setElections([])
            }
        } catch (err) {
            onError(getErrorMessage(err, 'Gagal memuat periode pemilihan.'))
        } finally {
            setLoading(false)
        }
    }

    const fetchElections = async (periodId: string) => {
        if (!periodId) {
            setElections([])
            return
        }
        try {
            const { data } = await api.get<{ elections: ElectionItem[] }>(`/admin/elections?period_id=${periodId}`)
            setElections(data.elections)
            if (selectedElection) {
                const updated = data.elections.find((e) => e.id === selectedElection.id) ?? null
                setSelectedElection(updated)
            }
        } catch (err) {
            onError(getErrorMessage(err, 'Gagal memuat daftar pemilihan.'))
        }
    }

    const fetchElectionCandidates = async (electionId: string) => {
        setLoadingCandidates(true)
        try {
            const { data } = await api.get<{ candidates: Candidate[] }>(`/admin/candidates?election_id=${electionId}`)
            setElectionCandidates(data.candidates)
        } catch (err) {
            onError(getErrorMessage(err, 'Gagal memuat daftar paslon.'))
        } finally {
            setLoadingCandidates(false)
        }
    }

    useEffect(() => {
        fetchPeriods()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleSelectPeriod = async (periodId: string) => {
        setSelectedPeriodId(periodId)
        setSelectedElection(null)
        setElectionCandidates([])
        await fetchElections(periodId)
    }

    const openCreatePeriod = () => {
        setPeriodErrors({})
        setPeriodForm({
            name: `Pemilihan Serentak ${new Date().getFullYear()}`,
            year: new Date().getFullYear(),
            start_date: `${new Date().getFullYear()}-01-01`,
            end_date: `${new Date().getFullYear()}-12-31`,
            status: periods.length === 0 ? 'active' : 'draft',
        })
        setPeriodModal({ open: true, editing: null })
    }

    const openEditPeriod = (p: ElectionPeriodItem) => {
        setPeriodErrors({})
        setPeriodForm({
            name: p.name,
            year: p.year,
            start_date: p.start_date,
            end_date: p.end_date,
            status: p.status,
        })
        setPeriodModal({ open: true, editing: p })
    }

    const handleSavePeriod = async (e: React.FormEvent) => {
        e.preventDefault()
        setPeriodErrors({})
        setSavingPeriod(true)
        try {
            if (periodModal.editing) {
                await api.put(`/admin/periods/${periodModal.editing.id}`, periodForm)
                onNotify('Periode pemilihan berhasil diperbarui.')
            } else {
                const { data } = await api.post<{ period: ElectionPeriodItem }>('/admin/periods', periodForm)
                onNotify('Periode pemilihan berhasil dibuat.')
                setSelectedPeriodId(data.period.id)
            }
            setPeriodModal({ open: false, editing: null })
            await fetchPeriods(periodModal.editing?.id)
        } catch (err) {
            setPeriodErrors(getValidationErrors(err))
        } finally {
            setSavingPeriod(false)
        }
    }

    const handleActivatePeriod = async (id: string) => {
        try {
            await api.post(`/admin/periods/${id}/activate`)
            onNotify('Periode pemilihan berhasil diaktifkan.')
            await fetchPeriods(id)
        } catch (err) {
            onError(getErrorMessage(err, 'Gagal mengaktifkan periode.'))
        }
    }

    const openCreateElection = () => {
        setElectionErrors({})
        const defaultKab = kabupatenList[0]?.id ?? ''
        setElectionForm({
            name: '',
            position_type: 'bupati',
            kabupaten_id: defaultKab,
            kecamatan_id: '',
            kelurahan_id: '',
            win_threshold_percent: '60',
            seat_count: '6',
            dapil_name: '',
            dapil_region_ids: [],
        })
        setElectionModalOpen(true)
    }

    const handleSaveElection = async (e: React.FormEvent) => {
        e.preventDefault()
        setElectionErrors({})
        setSavingElection(true)

        const regionId =
            electionForm.position_type === 'perbekel' ? electionForm.kelurahan_id : electionForm.kabupaten_id

        try {
            await api.post('/admin/elections', {
                period_id: selectedPeriodId,
                name: electionForm.name,
                position_type: electionForm.position_type,
                region_id: regionId,
                win_threshold_percent:
                    electionForm.position_type !== 'dprd_kabkota' ? Number(electionForm.win_threshold_percent) : null,
                seat_count: electionForm.position_type === 'dprd_kabkota' ? Number(electionForm.seat_count) : null,
                dapil_name: electionForm.position_type === 'dprd_kabkota' ? electionForm.dapil_name : null,
                dapil_region_ids:
                    electionForm.position_type === 'dprd_kabkota' ? electionForm.dapil_region_ids : [],
            })
            onNotify('Pemilihan berhasil dibuat beserta Putaran 1.')
            setElectionModalOpen(false)
            await fetchPeriods(selectedPeriodId)
        } catch (err) {
            setElectionErrors(getValidationErrors(err))
        } finally {
            setSavingElection(false)
        }
    }

    const handleRoundAction = async (roundId: string, action: 'activate' | 'close') => {
        try {
            const { data } = await api.post(`/admin/rounds/${roundId}/${action}`)
            onNotify(data.message || (action === 'activate' ? 'Putaran berhasil diaktifkan.' : 'Putaran berhasil ditutup.'))
            await fetchElections(selectedPeriodId)
        } catch (err) {
            onError(getErrorMessage(err, `Gagal ${action === 'activate' ? 'mengaktifkan' : 'menutup'} putaran.`))
        }
    }

    const openEvaluationModal = async (election: ElectionItem, round: NonNullable<ElectionItem['rounds']>[number]) => {
        setEvalModal({
            open: true,
            election,
            round,
            loading: true,
            data: null,
            advancingIds: [],
            creatingRunoff: false,
        })
        try {
            const { data } = await api.get(`/admin/rounds/${round.id}/evaluation`)
            const cands = (data.evaluation?.candidates ?? []) as Array<{ id: string }>
            setEvalModal((prev) => ({
                ...prev,
                loading: false,
                data: data.evaluation,
                advancingIds: cands.slice(0, 2).map((c) => c.id),
            }))
        } catch (err) {
            onError(getErrorMessage(err, 'Gagal memuat evaluasi putaran.'))
            setEvalModal((prev) => ({ ...prev, open: false, loading: false }))
        }
    }

    const handleCreateNextRound = async () => {
        if (!evalModal.election || evalModal.advancingIds.length < 2) return
        setEvalModal((prev) => ({ ...prev, creatingRunoff: true }))
        try {
            await api.post(`/admin/elections/${evalModal.election.id}/rounds`, {
                advancing_candidate_ids: evalModal.advancingIds,
            })
            onNotify('Putaran berikutnya berhasil dibuat. Silakan aktifkan jika sudah siap dimulai.')
            setEvalModal((prev) => ({ ...prev, open: false, creatingRunoff: false }))
            await fetchElections(selectedPeriodId)
        } catch (err) {
            onError(getErrorMessage(err, 'Gagal membuat putaran berikutnya.'))
            setEvalModal((prev) => ({ ...prev, creatingRunoff: false }))
        }
    }

    const handleDownloadExport = async (election: ElectionItem, roundNumber: number, roundId: string, format: 'xlsx' | 'csv') => {
        try {
            const response = await api.get(
                `/admin/export/election/${election.id}?round_id=${roundId}&format=${format}`,
                { responseType: 'blob' },
            )
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `hasil-${election.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-putaran-${roundNumber}.${format}`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            onError(getErrorMessage(err, 'Gagal mengekspor laporan hasil pemilihan.'))
        }
    }

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return
        try {
            if (pendingDelete.type === 'period') {
                await api.delete(`/admin/periods/${pendingDelete.id}`)
                onNotify('Periode pemilihan dihapus.')
                await fetchPeriods()
            } else if (pendingDelete.type === 'election') {
                await api.delete(`/admin/elections/${pendingDelete.id}`)
                onNotify('Pemilihan dihapus.')
                if (selectedElection?.id === pendingDelete.id) {
                    setSelectedElection(null)
                    setElectionCandidates([])
                }
                await fetchPeriods(selectedPeriodId)
            } else if (pendingDelete.type === 'candidate') {
                await api.delete(`/admin/candidates/${pendingDelete.id}`)
                onNotify('Paslon dihapus.')
                if (selectedElection) {
                    await fetchElectionCandidates(selectedElection.id)
                    await fetchElections(selectedPeriodId)
                }
            }
        } catch (err) {
            onError(getErrorMessage(err, 'Gagal menghapus data.'))
        } finally {
            setPendingDelete(null)
        }
    }

    const toggleDapilKecamatan = (kecId: string) => {
        setElectionForm((prev) => ({
            ...prev,
            dapil_region_ids: prev.dapil_region_ids.includes(kecId)
                ? prev.dapil_region_ids.filter((id) => id !== kecId)
                : [...prev.dapil_region_ids, kecId],
        }))
    }

    const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) ?? null

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat periode &amp; pemilihan...
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Periode Pemilihan Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Periode Pemilihan</h2>
                            <p className="text-xs text-slate-500">
                                Atur periode tahunan agar riwayat pemilihan sebelumnya tetap tersimpan.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={openCreatePeriod}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500"
                    >
                        <Plus className="h-3.5 w-3.5" /> Tambah Periode
                    </button>
                </div>

                {periods.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                        Belum ada periode pemilihan. Klik <strong>Tambah Periode</strong> untuk memulai.
                    </div>
                ) : (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        {periods.map((p) => {
                            const isSelected = p.id === selectedPeriodId
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectPeriod(p.id)}
                                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-left text-xs transition ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                                    }`}
                                >
                                    <span className="font-bold">{p.year}</span>
                                    <span className="font-medium">{p.name}</span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            p.status === 'active'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                : p.status === 'archived'
                                                  ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                        }`}
                                    >
                                        {PERIOD_STATUS_LABELS[p.status]}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                )}

                {selectedPeriod && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                        <div className="text-slate-500">
                            Rentang:{' '}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {selectedPeriod.start_date} s/d {selectedPeriod.end_date}
                            </span>{' '}
                            • {elections.length} Pemilihan
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedPeriod.status !== 'active' && (
                                <button
                                    type="button"
                                    onClick={() => handleActivatePeriod(selectedPeriod.id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500"
                                >
                                    <CheckCircle2 className="h-3 w-3" /> Aktifkan Periode
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => openEditPeriod(selectedPeriod)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                <Pencil className="h-3 w-3" /> Edit
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setPendingDelete({
                                        type: 'period',
                                        id: selectedPeriod.id,
                                        name: selectedPeriod.name,
                                    })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                            >
                                <Trash2 className="h-3 w-3" /> Hapus
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Daftar Pemilihan dalam Periode */}
            {selectedPeriod && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="space-y-4 lg:col-span-7">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Daftar Pemilihan ({selectedPeriod.name})
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Bupati/Wali Kota, Anggota DPRD Kab/Kota (Sainte-Laguë), dan Perbekel.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openCreateElection}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                            >
                                <Plus className="h-3.5 w-3.5" /> Buat Pemilihan
                            </button>
                        </div>

                        {elections.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                                Belum ada pemilihan pada periode ini. Klik <strong>Buat Pemilihan</strong> untuk
                                menambahkan pemilihan Bupati, DPRD, atau Perbekel.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {elections.map((el) => {
                                    const latestRound = el.rounds?.[el.rounds.length - 1]
                                    const isSelected = selectedElection?.id === el.id
                                    return (
                                        <div
                                            key={el.id}
                                            className={`rounded-2xl border bg-white p-4 transition dark:bg-slate-900 ${
                                                isSelected
                                                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                                                    : 'border-slate-200 dark:border-slate-800'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                            {el.position_label}
                                                        </span>
                                                        <span className="text-[11px] font-medium text-slate-500">
                                                            {el.region_name ?? '-'}
                                                        </span>
                                                    </div>
                                                    <h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                                        {el.name}
                                                    </h4>
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                                                        {el.election_mode === 'single_winner' ? (
                                                            <span>
                                                                Ambang menang:{' '}
                                                                <strong className="text-slate-700 dark:text-slate-300">
                                                                    {el.win_threshold_percent ?? 50}%
                                                                </strong>
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                Kursi:{' '}
                                                                <strong className="text-slate-700 dark:text-slate-300">
                                                                    {el.seat_count}
                                                                </strong>{' '}
                                                                ({el.dapil_regions.map((r) => r.name).join(', ')})
                                                            </span>
                                                        )}
                                                        <span>• {el.candidates_count ?? 0} Paslon/Caleg</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedElection(el)
                                                            fetchElectionCandidates(el.id)
                                                        }}
                                                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                                                    >
                                                        <Users className="h-3.5 w-3.5" /> Paslon
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPendingDelete({
                                                                type: 'election',
                                                                id: el.id,
                                                                name: el.name,
                                                            })
                                                        }
                                                        className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                        title="Hapus Pemilihan"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {latestRound && (
                                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] dark:border-slate-800">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                            Putaran {latestRound.round_number}
                                                        </span>
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                                latestRound.status === 'active'
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                            }`}
                                                        >
                                                            {ROUND_STATUS_LABELS[latestRound.status]}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {latestRound.status === 'draft' && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRoundAction(latestRound.id, 'activate')
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500"
                                                            >
                                                                <Play className="h-3 w-3" /> Aktifkan Putaran
                                                            </button>
                                                        )}
                                                        {latestRound.status === 'active' && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRoundAction(latestRound.id, 'close')
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-500"
                                                            >
                                                                <Square className="h-3 w-3" /> Tutup Putaran
                                                            </button>
                                                        )}
                                                        {latestRound.status !== 'draft' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openEvaluationModal(el, latestRound)}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                                                            >
                                                                <BarChart3 className="h-3 w-3" /> Hasil &amp; Evaluasi
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Panel Paslon Pemilihan Terpilih */}
                    <div className="lg:col-span-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            {!selectedElection ? (
                                <div className="py-12 text-center text-xs text-slate-400">
                                    Pilih salah satu pemilihan di sebelah kiri untuk mengelola paslon/calegnya.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                                {selectedElection.position_label}
                                            </span>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                {selectedElection.name}
                                            </h4>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCandidateModal({ open: true, candidate: null })}
                                            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Tambah
                                        </button>
                                    </div>

                                    {loadingCandidates ? (
                                        <div className="flex items-center justify-center py-8 text-xs text-slate-400">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat paslon...
                                        </div>
                                    ) : electionCandidates.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                                            Belum ada paslon/caleg terdaftar.
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {electionCandidates.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                                                            {c.candidate_number}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                                {c.name}
                                                                {c.vice_name ? ` & ${c.vice_name}` : ''}
                                                            </p>
                                                            {c.party_name && (
                                                                <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                                                                    {c.party_name}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setCandidateModal({ open: true, candidate: c })
                                                            }
                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setPendingDelete({
                                                                    type: 'candidate',
                                                                    id: c.id,
                                                                    name: c.name,
                                                                })
                                                            }
                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Periode */}
            {periodModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
                            {periodModal.editing ? 'Edit Periode Pemilihan' : 'Tambah Periode Pemilihan'}
                        </h3>
                        <form onSubmit={handleSavePeriod} className="space-y-3.5">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Nama Periode
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={periodForm.name}
                                    onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                                />
                                {periodErrors.name && (
                                    <p className="mt-1 text-[10px] text-rose-500">{periodErrors.name}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Tahun
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={periodForm.year}
                                        onChange={(e) => setPeriodForm({ ...periodForm, year: Number(e.target.value) })}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Mulai
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={periodForm.start_date}
                                        onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Selesai
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={periodForm.end_date}
                                        onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setPeriodModal({ open: false, editing: null })}
                                    className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingPeriod}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white"
                                >
                                    {savingPeriod && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Buat Pemilihan */}
            {electionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
                    <div className="my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
                            Buat Pemilihan Baru
                        </h3>
                        <form onSubmit={handleSaveElection} className="space-y-3.5">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Jabatan yang Dipilih
                                </label>
                                <select
                                    value={electionForm.position_type}
                                    onChange={(e) =>
                                        setElectionForm({
                                            ...electionForm,
                                            position_type: e.target.value as PositionType,
                                            kecamatan_id: '',
                                            kelurahan_id: '',
                                            dapil_region_ids: [],
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                                >
                                    {(Object.keys(POSITION_LABELS) as PositionType[]).map((pos) => (
                                        <option key={pos} value={pos}>
                                            {POSITION_LABELS[pos]}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Nama Acara Pemilihan
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Pemilihan Bupati Badung 2026"
                                    value={electionForm.name}
                                    onChange={(e) => setElectionForm({ ...electionForm, name: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                                />
                                {electionErrors.name && (
                                    <p className="mt-1 text-[10px] text-rose-500">{electionErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Kabupaten / Kota
                                </label>
                                <select
                                    required
                                    value={electionForm.kabupaten_id}
                                    onChange={(e) =>
                                        setElectionForm({
                                            ...electionForm,
                                            kabupaten_id: e.target.value,
                                            kecamatan_id: '',
                                            kelurahan_id: '',
                                            dapil_region_ids: [],
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                                >
                                    <option value="">-- Pilih Kabupaten/Kota --</option>
                                    {kabupatenList.map((k) => (
                                        <option key={k.id} value={k.id}>
                                            {k.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {electionForm.position_type === 'perbekel' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            Kecamatan
                                        </label>
                                        <select
                                            required
                                            value={electionForm.kecamatan_id}
                                            onChange={(e) =>
                                                setElectionForm({
                                                    ...electionForm,
                                                    kecamatan_id: e.target.value,
                                                    kelurahan_id: '',
                                                })
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                                        >
                                            <option value="">-- Kecamatan --</option>
                                            {kecamatanList.map((k) => (
                                                <option key={k.id} value={k.id}>
                                                    {k.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            Desa / Kelurahan
                                        </label>
                                        <select
                                            required
                                            value={electionForm.kelurahan_id}
                                            onChange={(e) =>
                                                setElectionForm({ ...electionForm, kelurahan_id: e.target.value })
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                                        >
                                            <option value="">-- Desa/Kelurahan --</option>
                                            {kelurahanList.map((k) => (
                                                <option key={k.id} value={k.id}>
                                                    {k.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {electionForm.position_type === 'dprd_kabkota' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                Nama Dapil
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: Dapil Badung 1"
                                                value={electionForm.dapil_name}
                                                onChange={(e) =>
                                                    setElectionForm({ ...electionForm, dapil_name: e.target.value })
                                                }
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                Alokasi Kursi
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                required
                                                value={electionForm.seat_count}
                                                onChange={(e) =>
                                                    setElectionForm({ ...electionForm, seat_count: e.target.value })
                                                }
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            Kecamatan dalam Dapil
                                        </label>
                                        <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
                                            {kecamatanList.length === 0 ? (
                                                <p className="text-[11px] text-slate-400">
                                                    Tidak ada kecamatan di kabupaten ini.
                                                </p>
                                            ) : (
                                                kecamatanList.map((k) => (
                                                    <label
                                                        key={k.id}
                                                        className="flex cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={electionForm.dapil_region_ids.includes(k.id)}
                                                            onChange={() => toggleDapilKecamatan(k.id)}
                                                            className="rounded border-slate-300"
                                                        />
                                                        {k.name}
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                        {electionErrors.dapil_region_ids && (
                                            <p className="mt-1 text-[10px] text-rose-500">
                                                {electionErrors.dapil_region_ids}
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Ambang Batas Kemenangan (%)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        step="0.5"
                                        required
                                        value={electionForm.win_threshold_percent}
                                        onChange={(e) =>
                                            setElectionForm({
                                                ...electionForm,
                                                win_threshold_percent: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                                    />
                                    <p className="mt-1 text-[10px] text-slate-400">
                                        Jika tidak ada paslon mencapai persentase ini, pemilihan berlanjut ke putaran
                                        berikutnya.
                                    </p>
                                </div>
                            )}

                            {electionErrors.region_id && (
                                <p className="text-[10px] text-rose-500">{electionErrors.region_id}</p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setElectionModalOpen(false)}
                                    className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingElection}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white"
                                >
                                    {savingElection && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Simpan Pemilihan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Paslon per Pemilihan */}
            {candidateModal.open && selectedElection && (
                <CandidateModal
                    candidate={candidateModal.candidate}
                    electionId={selectedElection.id}
                    positionType={selectedElection.position_type}
                    onClose={() => setCandidateModal({ open: false, candidate: null })}
                    onSaved={() => {
                        onNotify('Data paslon berhasil disimpan.')
                        fetchElectionCandidates(selectedElection.id)
                        fetchElections(selectedPeriodId)
                    }}
                />
            )}

            {/* Modal Evaluasi Hasil & Putaran Lanjutan */}
            {evalModal.open && evalModal.election && evalModal.round && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
                    <div className="my-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                    {evalModal.election.position_label} • Putaran {evalModal.round.round_number}
                                </span>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {evalModal.election.name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEvalModal((prev) => ({ ...prev, open: false }))}
                                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                                Tutup
                            </button>
                        </div>

                        {evalModal.loading || !evalModal.data ? (
                            <div className="flex items-center justify-center py-12 text-xs text-slate-400">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghitung hasil...
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3.5 text-xs dark:bg-slate-950">
                                    <span>
                                        Total Suara Masuk: <strong>{evalModal.data.total_votes}</strong>
                                    </span>
                                    {evalModal.data.election_mode === 'single_winner' ? (
                                        <span>
                                            Ambang Batas: <strong>{evalModal.data.threshold_percent}%</strong>
                                        </span>
                                    ) : (
                                        <span>
                                            Alokasi Kursi Sainte-Laguë: <strong>{evalModal.data.seat_count} Kursi</strong>
                                        </span>
                                    )}
                                </div>

                                {evalModal.data.election_mode === 'single_winner' && (
                                    <>
                                        {evalModal.data.winner ? (
                                            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                <Award className="h-5 w-5 shrink-0" />
                                                <div>
                                                    <p className="font-bold">
                                                        Pemenang: No. {evalModal.data.winner.candidate_number}{' '}
                                                        {evalModal.data.winner.name}
                                                    </p>
                                                    <p>
                                                        Memperoleh {evalModal.data.winner.votes} suara (
                                                        {evalModal.data.winner.percentage}%) — memenuhi ambang batas.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                                                <p className="font-bold">
                                                    Belum ada paslon mencapai ambang batas {evalModal.data.threshold_percent}%.
                                                </p>
                                                <p className="mt-0.5">
                                                    Jika putaran sudah ditutup, pilih minimal 2 paslon di bawah untuk lanjut ke putaran berikutnya.
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {(evalModal.data.candidates as Array<any>).map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-xs dark:border-slate-800"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        {evalModal.round?.status === 'needs_runoff' && (
                                                            <input
                                                                type="checkbox"
                                                                checked={evalModal.advancingIds.includes(c.id)}
                                                                onChange={() =>
                                                                    setEvalModal((prev) => ({
                                                                        ...prev,
                                                                        advancingIds: prev.advancingIds.includes(c.id)
                                                                            ? prev.advancingIds.filter((x) => x !== c.id)
                                                                            : [...prev.advancingIds, c.id],
                                                                    }))
                                                                }
                                                            />
                                                        )}
                                                        <span className="font-bold">No. {c.candidate_number}</span>
                                                        <span>
                                                            {c.name}
                                                            {c.vice_name ? ` & ${c.vice_name}` : ''}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono font-semibold">
                                                        {c.votes} suara ({c.percentage}%)
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {evalModal.round.status === 'needs_runoff' && (
                                            <div className="flex justify-end pt-2">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        evalModal.creatingRunoff || evalModal.advancingIds.length < 2
                                                    }
                                                    onClick={handleCreateNextRound}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                                                >
                                                    {evalModal.creatingRunoff && (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    )}
                                                    Buat Putaran {evalModal.round.round_number + 1} (
                                                    {evalModal.advancingIds.length} Paslon Lolos)
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {evalModal.data.election_mode === 'multi_seat' && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            Perolehan Kursi Partai (Sainte-Laguë)
                                        </h4>
                                        {(evalModal.data.party_results as Array<any>).map((p) => (
                                            <div
                                                key={p.party_name}
                                                className="rounded-xl border border-slate-100 p-3 text-xs dark:border-slate-800"
                                            >
                                                <div className="flex items-center justify-between font-bold">
                                                    <span>{p.party_name}</span>
                                                    <span className="text-blue-600 dark:text-blue-400">
                                                        {p.seats_won} Kursi ({p.total_votes} suara)
                                                    </span>
                                                </div>
                                                {p.elected_candidates.length > 0 && (
                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                        Terpilih:{' '}
                                                        {p.elected_candidates
                                                            .map((ec: any) => `${ec.name} (${ec.votes})`)
                                                            .join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDownloadExport(
                                                evalModal.election!,
                                                evalModal.round!.round_number,
                                                evalModal.round!.id,
                                                'xlsx',
                                            )
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                                    >
                                        <Download className="h-3.5 w-3.5" /> Export Excel (.xlsx)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDownloadExport(
                                                evalModal.election!,
                                                evalModal.round!.round_number,
                                                evalModal.round!.id,
                                                'csv',
                                            )
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    >
                                        <Download className="h-3.5 w-3.5" /> Export CSV
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Confirm Delete */}
            {pendingDelete && (
                <ConfirmModal
                    title={`Hapus ${pendingDelete.type === 'period' ? 'Periode' : pendingDelete.type === 'election' ? 'Pemilihan' : 'Paslon'}?`}
                    message={`Yakin ingin menghapus "${pendingDelete.name}"?`}
                    tone="danger"
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={handleConfirmDelete}
                />
            )}
        </div>
    )
}
