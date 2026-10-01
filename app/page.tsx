"use client"

import { useState } from "react"
import { Ban, Check, ChevronDown, Search } from "lucide-react"

const initialRows = [
  { id: 1, recipient: "Liesbeth Vermeulen", excel: "Dorpsstraat 14, 9000 Gent", problem: "Busnummer ontbreekt", suggestion: "Dorpsstraat 14 bus 2, 9000 Gent (99% match)", type: "warning" },
  { id: 2, recipient: "Jan De Smet", excel: "Kerkstrat 8, 2000 Antwerpen", problem: "Spelfout straatnaam", suggestion: "Kerkstraat 8, 2000 Antwerpen (98% match)", type: "warning" },
  { id: 3, recipient: "Marie Peeters", excel: "Rue de l'Eglise 21, 1000 Brussel", problem: "Adres niet gevonden", suggestion: "Rue de l'Église 21, 1000 Bruxelles (92% match)", type: "error" },
  { id: 4, recipient: "Tom Van Acker", excel: "Mechelsesteenweg 112, 2018 Antwerpen", problem: "Busnummer ontbreekt", suggestion: "Mechelsesteenweg 112 bus 4, 2018 Antwerpen (97% match)", type: "warning" },
  { id: 5, recipient: "Sofie Willems", excel: "Leuvensesteenweg 44, 1930 Zaventem", problem: "Adres niet gevonden", suggestion: "Leuvensesteenweg 44, 1930 Zaventem (89% match)", type: "error" },
  { id: 6, recipient: "Koen Jacobs", excel: "Stationsplein 3, 9000 Gent", problem: "Spelfout straatnaam", suggestion: "Stationsplein 3, 9000 Gent (99% match)", type: "warning" },
  { id: 7, recipient: "Nathalie Maes", excel: "Veldstraat 76, 8000 Brugge", problem: "Busnummer ontbreekt", suggestion: "Veldstraat 76 bus 1, 8000 Brugge (96% match)", type: "warning" },
]

export default function Page() {
  const [rows, setRows] = useState(initialRows)
  const [approved, setApproved] = useState(false)
  const [excluded, setExcluded] = useState<number[]>([])

  function exclude(id: number) { setExcluded((current) => [...current, id]) }
  const visibleRows = rows.filter((row) => !excluded.includes(row.id))

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <header className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Mailing</p><h1 className="mt-1 text-base font-semibold tracking-tight">Nieuwsbrief Najaar 2026</h1></div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block" />
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Klant</p><p className="mt-1 text-sm font-medium text-slate-700">Cultuurcentrum De Kern <span className="ml-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">Solve360</span></p></div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block" />
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Afgifte</p><p className="mt-1 text-sm font-medium text-slate-700">15/10/2026</p></div>
            </div>
            <div className="flex items-center gap-4 border-t border-slate-100 pt-4 lg:border-0 lg:pt-0"><span className="text-sm font-medium text-slate-500">789 adressen</span><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{approved ? "99.4% Goedgekeurd" : "94.2% Gevalideerd"}</span></div>
          </div>
        </header>

        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead><tr className="border-b border-slate-200 bg-slate-50/80"><th className="w-[21%] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">Ontvanger</th><th className="w-[23%] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">Adres in Excel</th><th className="w-[16%] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">Probleem</th><th className="w-[28%] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">bpost Oplossing</th><th className="w-[12%] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">Acties</th></tr></thead>
              <tbody>{visibleRows.map((row) => <tr key={row.id} className={`border-b border-slate-100 last:border-0 ${row.type === "error" ? "bg-red-50/60" : "bg-amber-50/60"}`}><td className="px-6 py-5 text-sm font-semibold text-slate-800">{row.recipient}</td><td className="px-6 py-5 text-sm text-slate-600">{row.excel}</td><td className="px-6 py-5"><span className={`text-sm font-medium ${row.type === "error" ? "text-red-700" : "text-amber-800"}`}>{row.problem}</span></td><td className="px-6 py-5"><div className="relative"><select aria-label={`bpost oplossing voor ${row.recipient}`} defaultValue={row.suggestion} className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"><option>{row.suggestion}</option><option>Adres handmatig aanpassen</option><option>Geen oplossing selecteren</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-slate-400" /></div></td><td className="px-6 py-5"><div className="flex items-center gap-1"><button onClick={() => alert(`Adres opzoeken: ${row.recipient}`)} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900" aria-label={`Adres opzoeken voor ${row.recipient}`}><Search className="size-3.5" />Opzoeken</button><button onClick={() => exclude(row.id)} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-red-700" aria-label={`Uitsluiten van ${row.recipient}`}><Ban className="size-3.5" />Uitsluiten</button></div></td></tr>)}</tbody>
            </table>
          </div>
          <footer className="flex flex-col gap-4 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-medium text-slate-600">{visibleRows.length} adressen vereisen aandacht</p><button onClick={() => setApproved(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#e30613] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c80511] focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2">{approved && <Check className="size-4" />}Correcties toepassen &amp; Herberekenen</button></footer>
        </section>
      </div>
    </main>
  )
}
