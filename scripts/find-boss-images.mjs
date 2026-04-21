/**
 * Busca IDs y URLs de imágenes de bosses en maplestory.io
 */

const BOSSES = [
  'Lotus', 'Damien', 'Lucid', 'Will', 'Guardian Angel Slime',
  'Gloom', 'Darknell', 'Verus Hilla', 'Black Mage',
  'Chosen Seren', 'Watcher Kalos', 'Kaling', 'Limbo',
]

const SEARCH_TERMS = {
  'Lotus': 'Lotus',
  'Damien': 'Damien',
  'Lucid': 'Lucid',
  'Will': 'Will',
  'Guardian Angel Slime': 'Guardian Angel Slime',
  'Gloom': 'Gloom',
  'Darknell': 'Darknell',
  'Verus Hilla': 'Verus Hilla',
  'Black Mage': 'Black Mage',
  'Chosen Seren': 'Seren',
  'Watcher Kalos': 'Kalos',
  'Kaling': 'Kaling',
  'Limbo': 'Limbo',
}

async function searchBoss(name, term) {
  try {
    const res = await fetch(
      `https://maplestory.io/api/GMS/latest/mob?searchFor=${encodeURIComponent(term)}`,
      { headers: { 'Accept': 'application/json' } }
    )
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text[0] !== '[') return null
    const data = JSON.parse(text)
    if (!data.length) return null
    // Prefer entries that look like bosses (often have higher IDs or specific name matches)
    const best = data.find(m => m.name?.toLowerCase().includes(term.toLowerCase())) || data[0]
    return { id: best.id, name: best.name, iconUrl: `https://maplestory.io/api/GMS/latest/mob/${best.id}/icon` }
  } catch {
    return null
  }
}

for (const boss of BOSSES) {
  const result = await searchBoss(boss, SEARCH_TERMS[boss])
  if (result) {
    console.log(`"${boss}": "${result.iconUrl}",  // id=${result.id} name="${result.name}"`)
  } else {
    console.log(`"${boss}": null,  // not found`)
  }
}
