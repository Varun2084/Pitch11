import type { Config, Context } from "@netlify/functions"

// Live matches from CricketData.org. The key stays on the server. Responses are shared through the
// CDN so all visitors together use one API hit per cache window (free plan: 100 hits a day).
const BASE = "https://api.cricapi.com/v1"
const seconds = () => Math.max(60, Number(Netlify.env.get("LIVE_CACHE_SECONDS")) || 1200)

const reply = (body: unknown, ttl: number) =>
  Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=30",
      "Netlify-CDN-Cache-Control": `public, s-maxage=${ttl}, durable`,
    },
  })

function match(m: any) {
  return {
    id: String(m.id ?? ""),
    name: String(m.name ?? ""),
    type: String(m.matchType ?? "").toUpperCase(),
    status: String(m.status ?? ""),
    venue: String(m.venue ?? ""),
    at: String(m.dateTimeGMT ?? m.date ?? ""),
    teams: Array.isArray(m.teams) ? m.teams.map(String) : [],
    score: (Array.isArray(m.score) ? m.score : []).map((s: any) => ({ inn: String(s.inning ?? ""), r: s.r, w: s.w, o: s.o })),
    started: !!m.matchStarted,
    ended: !!m.matchEnded,
  }
}

export default async (req: Request, context: Context) => {
  const key = Netlify.env.get("LIVE_API_KEY")
  if (!key) return reply({ enabled: false }, 300)
  const ttl = seconds()
  const id = context.params?.id
  if (id && !/^[\w-]{8,64}$/.test(id)) return reply({ enabled: true, ok: false, error: "Unknown match" }, 60)
  const url = id
    ? `${BASE}/match_scorecard?apikey=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}`
    : `${BASE}/currentMatches?apikey=${encodeURIComponent(key)}&offset=0`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) })
    const j: any = await res.json()
    if (!res.ok || j.status !== "success") return reply({ enabled: true, ok: false, error: "Live feed is unavailable" }, 120)
    const at = new Date().toISOString()
    if (!id) return reply({ enabled: true, ok: true, at, ttl, matches: (j.data ?? []).map(match).filter((m: any) => m.id) }, ttl)
    const d = j.data ?? {}
    const innings = (d.scorecard ?? []).map((c: any) => ({
      inn: String(c.inning ?? ""),
      bat: (c.batting ?? []).map((b: any) => ({ n: b.batsman?.name ?? "", how: b["dismissal-text"] ?? "", r: b.r, b: b.b, f: b["4s"], s: b["6s"], sr: b.sr })),
      bowl: (c.bowling ?? []).map((b: any) => ({ n: b.bowler?.name ?? "", o: b.o, m: b.m, r: b.r, w: b.w, nb: b.nb, wd: b.wd, eco: b.eco })),
    }))
    return reply({ enabled: true, ok: true, at, ttl, match: match(d), innings }, ttl)
  } catch {
    return reply({ enabled: true, ok: false, error: "Live feed is unavailable" }, 120)
  }
}

export const config: Config = { path: ["/api/live", "/api/live/:id"] }
