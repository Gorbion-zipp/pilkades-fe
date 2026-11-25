export type RegionLevel = 'kabupaten' | 'kecamatan' | 'kelurahan' | 'banjar'

export interface RegionItem {
    id: string
    name: string
    level: RegionLevel
    level_label: string
    parent_id: string | null
    parent_name: string | null
    code: string | null
    kabupaten_id: string | null
    kecamatan_id: string | null
    kelurahan_id: string | null
    kabupaten_name: string | null
    kecamatan_name: string | null
    kelurahan_name: string | null
    children_count?: number
}

export const REGION_LEVEL_LABELS: Record<RegionLevel, string> = {
    kabupaten: 'Kabupaten / Kota',
    kecamatan: 'Kecamatan',
    kelurahan: 'Kelurahan / Desa',
    banjar: 'Banjar / Lingkungan',
}
