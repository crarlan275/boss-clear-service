import { execSync } from 'child_process'

const BOSS_PAGES = {
  'Lotus':                'Lotus/Monster',
  'Damien':               'Damien/Monster',
  'Lucid':                'Lucid/Monster',
  'Will':                 'Will/Monster',
  'Guardian Angel Slime': 'Guardian_Angel_Slime',
  'Gloom':                'Giant_Monster_Gloom',
  'Darknell':             'Guard_Captain_Darknell/Monster',
  'Verus Hilla':          'Hilla/Monster_(Reborn)',
  'Black Mage':           'Black_Mage/Monster',
  'Chosen Seren':         'Seren/Monster',
  'Watcher Kalos':        'Kalos/Monster',
  'Kaling':               'Kaling/Monster',
  'Limbo':                'Limbo/Monster',
}

for (const [boss, page] of Object.entries(BOSS_PAGES)) {
  const url = `https://maplestorywiki.net/w/${page}`
  try {
    const html = execSync(
      `curl -s -L "${url}" -H "User-Agent: Mozilla/5.0"`,
      { maxBuffer: 5 * 1024 * 1024 }
    ).toString()

    // Try Boss_Entry_UI first, then Mobicon
    const entryMatch = html.match(/https:\/\/media\.maplestorywiki\.net\/yetidb\/Boss_Entry_UI_-_[^"'\s<>]+\.png/)
    const mobicon    = html.match(/https:\/\/media\.maplestorywiki\.net\/yetidb\/Mobicon_[^"'\s<>]+\.png/)

    const img = entryMatch?.[0] || mobicon?.[0] || 'null'
    console.log(`'${boss}': '${img}',`)
  } catch {
    console.log(`'${boss}': null,  // fetch error`)
  }
}
