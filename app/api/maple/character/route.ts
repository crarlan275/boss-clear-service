import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/maple/character?name={ign}
 * Busca un personaje de MapleStory GMS usando el endpoint público de ranking de Nexon.
 * No requiere API key.
 */

const RANKING_URL = 'https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na'

// Mapa de worldID → nombre de mundo (GMS)
const WORLD_NAMES: Record<number, string> = {
  0: 'Scania', 1: 'Bera', 2: 'Broa', 3: 'Windia', 4: 'Khaini',
  5: 'Bellocan', 6: 'Mardia', 7: 'Kradia', 8: 'Yellonde',
  17: 'Chaos', 18: 'Nova', 45: 'Reboot', 46: 'Reboot 2',
}

interface RankEntry {
  characterName: string
  level: number
  worldID: number
  characterImgURL: string
  jobName: string
}

interface RankResponse {
  totalCount: number
  ranks: RankEntry[]
}

async function searchCharacter(name: string, rebootIndex: number): Promise<RankEntry | null> {
  const params = new URLSearchParams({
    type: 'overall',
    id: 'weekly',
    reboot_index: String(rebootIndex),
    page_index: '1',
    character_name: name,
  })
  const res = await fetch(`${RANKING_URL}?${params}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json() as RankResponse
  if (!data.ranks || data.ranks.length === 0 || data.totalCount === 0) return null
  return data.ranks[0]
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Nombre de personaje requerido' }, { status: 400 })
  }

  try {
    // Probar regular (reboot_index=0) y Reboot (reboot_index=1)
    let entry = await searchCharacter(name, 0)
    if (!entry) {
      entry = await searchCharacter(name, 1)
    }

    if (!entry) {
      return NextResponse.json({ error: 'Personaje no encontrado. Verifica que el nombre sea exacto y que esté en los rankings.' }, { status: 404 })
    }

    const worldName = WORLD_NAMES[entry.worldID] ?? `World ${entry.worldID}`

    return NextResponse.json({
      name: entry.characterName,
      world: worldName,
      class: entry.jobName,
      level: entry.level,
      imageUrl: entry.characterImgURL,
    })
  } catch (err) {
    console.error('Maple character lookup error:', err)
    return NextResponse.json({ error: 'Error de conexión con la API' }, { status: 500 })
  }
}
