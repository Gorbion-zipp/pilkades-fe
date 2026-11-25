export type PositionType = 'bupati' | 'dprd_kabkota' | 'perbekel'
export type ElectionMode = 'single_winner' | 'multi_seat'
export type PeriodStatus = 'draft' | 'active' | 'archived'
export type RoundStatus = 'draft' | 'active' | 'closed' | 'needs_runoff' | 'completed'

export interface ElectionPeriodItem {
    id: string
    name: string
    year: number
    start_date: string
    end_date: string
    status: PeriodStatus
    elections_count?: number
}

export interface ElectionRoundItem {
    id: string
    election_id: string
    round_number: number
    status: RoundStatus
    start_datetime: string | null
    end_datetime: string | null
    advancing_candidate_ids: string[]
    total_votes?: number
}

export interface ElectionItem {
    id: string
    period_id: string
    name: string
    position_type: PositionType
    position_label: string
    level: 'kabupaten' | 'kelurahan'
    region_id: string
    region_name: string | null
    election_mode: ElectionMode
    win_threshold_percent: number | null
    seat_count: number | null
    dapil_name: string | null
    dapil_region_ids: string[]
    dapil_regions: Array<{ id: string; name: string }>
    status: 'draft' | 'active' | 'completed'
    rounds?: ElectionRoundItem[]
    candidates_count?: number
}

export const POSITION_LABELS: Record<PositionType, string> = {
    bupati: 'Bupati / Wali Kota & Wakil',
    dprd_kabkota: 'Anggota DPRD Kab/Kota (Dapil + Sainte-Laguë)',
    perbekel: 'Perbekel / Kepala Desa',
}

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
    draft: 'Draft',
    active: 'Aktif',
    archived: 'Diarsipkan',
}

export const ROUND_STATUS_LABELS: Record<RoundStatus, string> = {
    draft: 'Draft',
    active: 'Berlangsung',
    closed: 'Ditutup',
    needs_runoff: 'Perlu Putaran Berikutnya',
    completed: 'Selesai',
}
