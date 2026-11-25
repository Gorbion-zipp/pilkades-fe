import { ConfirmModal } from '@/components/confirm-modal'
import api, { getErrorMessage } from '@/lib/api'
import { REGION_LEVEL_LABELS, type RegionItem, type RegionLevel } from '@/lib/regions'
import { Building2, ChevronRight, Home, Landmark, Loader2, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'

interface RegionManagerProps {
    regions: RegionItem[]
    onChanged: () => Promise<void>
    onNotice: (message: string) => void
}

interface RegionFormState {
    mode: 'create' | 'edit'
    level: RegionLevel
    parentId: string | null
    parentLabel: string | null
    region?: RegionItem
}

export function RegionManager({ regions, onChanged, onNotice }: RegionManagerProps) {
    const [selectedKabId, setSelectedKabId] = useState<string>('')
    const [selectedKecId, setSelectedKecId] = useState<string>('')
    const [selectedKelId, setSelectedKelId] = useState<string>('')

    const [formModal, setFormModal] = useState<RegionFormState | null>(null)
    const [formName, setFormName] = useState('')
    const [formCode, setFormCode] = useState('')
    const [formError, setFormError] = useState('')
    const [saving, setSaving] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<RegionItem | null>(null)
    const [deleteError, setDeleteError] = useState('')

    const kabupatens = regions.filter((r) => r.level === 'kabupaten')
    const kecamatans = selectedKabId ? regions.filter((r) => r.level === 'kecamatan' && r.parent_id === selectedKabId) : []
    const kelurahans = selectedKecId ? regions.filter((r) => r.level === 'kelurahan' && r.parent_id === selectedKecId) : []
    const banjars = selectedKelId ? regions.filter((r) => r.level === 'banjar' && r.parent_id === selectedKelId) : []

    const selectedKab = kabupatens.find((r) => r.id === selectedKabId) ?? null
    const selectedKec = kecamatans.find((r) => r.id === selectedKecId) ?? null
    const selectedKel = kelurahans.find((r) => r.id === selectedKelId) ?? null

    const openCreate = (level: RegionLevel, parentId: string | null, parentLabel: string | null) => {
        setFormModal({ mode: 'create', level, parentId, parentLabel })
        setFormName('')
        setFormCode('')
        setFormError('')
    }

    const openEdit = (region: RegionItem) => {
        setFormModal({
            mode: 'edit',
            level: region.level,
            parentId: region.parent_id,
            parentLabel: region.parent_name,
            region,
        })
        setFormName(region.name)
        setFormCode(region.code ?? '')
        setFormError('')
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formModal) return

        setFormError('')
        setSaving(true)

        try {
            if (formModal.mode === 'create') {
                const res = await api.post('/admin/regions', {
                    name: formName,
                    level: formModal.level,
                    parent_id: formModal.parentId,
                    code: formCode || null,
                })
                onNotice(res.data.message)
            } else if (formModal.region) {
                const res = await api.put(`/admin/regions/${formModal.region.id}`, {
                    name: formName,
                    code: formCode || null,
                })
                onNotice(res.data.message)
            }

            setFormModal(null)
            await onChanged()
        } catch (err) {
            setFormError(getErrorMessage(err, 'Gagal menyimpan data wilayah.'))
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const target = deleteTarget
        setDeleteTarget(null)
        setDeleteError('')

        try {
            const res = await api.delete(`/admin/regions/${target.id}`)
            if (target.id === selectedKabId) {
                setSelectedKabId('')
                setSelectedKecId('')
                setSelectedKelId('')
            } else if (target.id === selectedKecId) {
                setSelectedKecId('')
                setSelectedKelId('')
            } else if (target.id === selectedKelId) {
                setSelectedKelId('')
            }
            onNotice(res.data.message)
            await onChanged()
        } catch (err) {
            setDeleteError(getErrorMessage(err, 'Gagal menghapus wilayah.'))
        }
    }

    const renderColumn = (params: {
        title: string
        subtitle: string
        level: RegionLevel
        items: RegionItem[]
        selectedId: string
        onSelect?: (id: string) => void
        canAdd: boolean
        parentId: string | null
        parentLabel: string | null
        emptyHint: string
        icon: React.ReactNode
    }) => (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">{params.icon}</div>
                    <div className="min-w-0">
                        <h3 className="truncate text-xs font-bold text-slate-900 dark:text-white">{params.title}</h3>
                        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{params.subtitle}</p>
                    </div>
                </div>

                {params.canAdd && (
                    <button
                        type="button"
                        onClick={() => openCreate(params.level, params.parentId, params.parentLabel)}
                        title={`Tambah ${REGION_LEVEL_LABELS[params.level]}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-500"
                    >
                        <Plus className="h-3 w-3" />
                        <span>Tambah</span>
                    </button>
                )}
            </div>

            <div className="max-h-[26rem] flex-1 space-y-1.5 overflow-y-auto p-3">
                {params.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {params.emptyHint}
                    </div>
                ) : (
                    params.items.map((item) => {
                        const isSelected = params.selectedId === item.id
                        return (
                            <div
                                key={item.id}
                                className={`group flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-50/80 text-blue-900 dark:border-blue-500/60 dark:bg-blue-950/40 dark:text-blue-100'
                                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => params.onSelect?.(item.id)}
                                    className={`flex min-w-0 flex-1 items-center justify-between gap-2 text-left ${
                                        params.onSelect ? 'cursor-pointer' : 'cursor-default'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold">{item.name}</p>
                                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                            {item.code ? `Kode: ${item.code}` : ''}
                                            {item.level !== 'banjar' && (
                                                <span>
                                                    {item.code ? ' • ' : ''}
                                                    {item.children_count ?? 0} sub-wilayah
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {params.onSelect && (
                                        <ChevronRight
                                            className={`h-4 w-4 shrink-0 ${
                                                isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'
                                            }`}
                                        />
                                    )}
                                </button>

                                <div className="flex shrink-0 items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => openEdit(item)}
                                        title="Edit Wilayah"
                                        className="rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDeleteError('')
                                            setDeleteTarget(item)
                                        }}
                                        title="Hapus Wilayah"
                                        className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Data Master Wilayah Bali</h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Kelola hierarki Kabupaten/Kota &rarr; Kecamatan &rarr; Kelurahan/Desa &rarr; Banjar/Lingkungan
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                        {kabupatens.length} Kab/Kota
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                        {regions.filter((r) => r.level === 'kecamatan').length} Kecamatan
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                        {regions.filter((r) => r.level === 'kelurahan').length} Kelurahan/Desa
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                        {regions.filter((r) => r.level === 'banjar').length} Banjar
                    </span>
                </div>
            </div>

            {deleteError && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                    {deleteError}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {renderColumn({
                    title: '1. Kabupaten / Kota',
                    subtitle: 'Provinsi Bali',
                    level: 'kabupaten',
                    items: kabupatens,
                    selectedId: selectedKabId,
                    onSelect: (id) => {
                        setSelectedKabId(id)
                        setSelectedKecId('')
                        setSelectedKelId('')
                    },
                    canAdd: true,
                    parentId: null,
                    parentLabel: null,
                    emptyHint: 'Belum ada data Kabupaten/Kota.',
                    icon: <Landmark className="h-4 w-4" />,
                })}

                {renderColumn({
                    title: '2. Kecamatan',
                    subtitle: selectedKab ? selectedKab.name : 'Pilih Kab/Kota dahulu',
                    level: 'kecamatan',
                    items: kecamatans,
                    selectedId: selectedKecId,
                    onSelect: (id) => {
                        setSelectedKecId(id)
                        setSelectedKelId('')
                    },
                    canAdd: Boolean(selectedKab),
                    parentId: selectedKab?.id ?? null,
                    parentLabel: selectedKab?.name ?? null,
                    emptyHint: selectedKab ? 'Belum ada Kecamatan di wilayah ini.' : 'Klik salah satu Kabupaten/Kota di kolom 1.',
                    icon: <Building2 className="h-4 w-4" />,
                })}

                {renderColumn({
                    title: '3. Kelurahan / Desa',
                    subtitle: selectedKec ? selectedKec.name : 'Pilih Kecamatan dahulu',
                    level: 'kelurahan',
                    items: kelurahans,
                    selectedId: selectedKelId,
                    onSelect: (id) => setSelectedKelId(id),
                    canAdd: Boolean(selectedKec),
                    parentId: selectedKec?.id ?? null,
                    parentLabel: selectedKec?.name ?? null,
                    emptyHint: selectedKec ? 'Belum ada Kelurahan/Desa di kecamatan ini.' : 'Klik salah satu Kecamatan di kolom 2.',
                    icon: <MapPin className="h-4 w-4" />,
                })}

                {renderColumn({
                    title: '4. Banjar / Lingkungan',
                    subtitle: selectedKel ? selectedKel.name : 'Pilih Kelurahan/Desa dahulu',
                    level: 'banjar',
                    items: banjars,
                    selectedId: '',
                    canAdd: Boolean(selectedKel),
                    parentId: selectedKel?.id ?? null,
                    parentLabel: selectedKel?.name ?? null,
                    emptyHint: selectedKel ? 'Belum ada Banjar di desa/kelurahan ini.' : 'Klik salah satu Kelurahan/Desa di kolom 3.',
                    icon: <Home className="h-4 w-4" />,
                })}
            </div>

            {formModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {formModal.mode === 'create' ? 'Tambah' : 'Edit'} {REGION_LEVEL_LABELS[formModal.level]}
                                </h3>
                                {formModal.parentLabel && (
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Induk: {formModal.parentLabel}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormModal(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {formError && (
                            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Nama {REGION_LEVEL_LABELS[formModal.level]}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder={
                                        formModal.level === 'kabupaten'
                                            ? 'Contoh: Kabupaten Badung'
                                            : formModal.level === 'kecamatan'
                                              ? 'Contoh: Kecamatan Kuta Utara'
                                              : formModal.level === 'kelurahan'
                                                ? 'Contoh: Desa Canggu'
                                                : 'Contoh: Banjar Pipitan'
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Kode Wilayah (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={formCode}
                                    onChange={(e) => setFormCode(e.target.value)}
                                    placeholder="Contoh: 5103"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setFormModal(null)}
                                    className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-50"
                                >
                                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <ConfirmModal
                    title={`Hapus ${REGION_LEVEL_LABELS[deleteTarget.level]}`}
                    message={`Apakah Anda yakin ingin menghapus "${deleteTarget.name}"? Wilayah tidak dapat dihapus jika masih memiliki sub-wilayah atau DPT terdaftar.`}
                    tone="danger"
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    )
}
