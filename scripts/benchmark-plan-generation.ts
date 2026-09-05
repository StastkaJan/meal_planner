// Run: npx tsx scripts/benchmark-plan-generation.ts [baseline-module-path]
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as current from '../src/lib/domain/plan-generation'

const generation: typeof current = process.argv[2]
  ? await import(pathToFileURL(resolve(process.argv[2])).href)
  : current
const types = ['breakfast', 'lunch', 'dinner', 'snack']
const targets = { calories: 2100, proteinG: 130, carbsG: 240, fatG: 65 }

function measure(size: number) {
  const candidates = Array.from({ length: size }, (_, i) => ({
    id: i + 1,
    calories: 200 + ((i * 37) % 700),
    proteinG: 10 + ((i * 13) % 60),
    carbsG: 20 + ((i * 17) % 90),
    fatG: 5 + ((i * 7) % 40),
    allowedSlots: [types[i % 4]],
    tags: [],
  }))
  const run = () => {
    const usage = new Map<number, number>()
    const rows = []
    const start = performance.now()
    for (let day = 0; day < 7; day++) {
      const date = `2026-09-${String(7 + day).padStart(2, '0')}`
      rows.push(
        ...generation.fillDaySlots(
          1,
          date,
          types,
          candidates,
          targets,
          { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
          usage,
        ),
      )
    }
    const filled = performance.now()
    generation.optimizeWeekSlots(
      rows.map((row) => ({ ...row, group: `${row.date}|${row.mealType}` })),
      candidates,
      candidates,
      targets,
      [],
    )
    const finished = performance.now()
    return {
      fillMs: filled - start,
      optimizeMs: finished - filled,
      totalMs: finished - start,
    }
  }
  run()
  const samples = Array.from({ length: 7 }, run).sort(
    (a, b) => a.totalMs - b.totalMs,
  )
  return {
    recipes: size,
    ...Object.fromEntries(
      Object.entries(samples[3]).map(([key, value]) => [
        key,
        Number(value.toFixed(2)),
      ]),
    ),
  }
}
console.log(
  `Node ${process.version}; 28 slots; one warmup; median of seven runs; excludes database and network`,
)
console.table([100, 1000, 5000, 10000].map(measure))
