"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Archive,
  ArrowUpDown,
  CalendarCheck2,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  FileSpreadsheet,
  Filter,
  FlaskConical,
  FolderOpen,
  Gauge,
  Grid2X2,
  Inbox,
  LayoutList,
  Menu,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Upload,
  X,
  Zap,
} from "lucide-react"

const mailings = [
  { id: "CP-2026-08", title: "Voorjaarsbrochure 2026", status: "Aangemaakt", group: "lopend", quality: 93.4, recipients: "789 adressen", mode: "Prod", format: "C5", date: "15 okt", priority: true },
  { id: "ML-140642", title: "Ledenblad Nr. 4", status: "Aangemaakt", group: "lopend", quality: 97.2, recipients: "1.246 adressen", mode: "Prod", format: "C4", date: "28 sep", priority: false },
  { id: "CP-2026-07", title: "Concertuitnodigingen", status: "Verzonden", group: "lopend", quality: 99.8, recipients: "342 adressen", mode: "Test", format: "C5", date: "22 sep", priority: true },
  { id: "CP-2026-05", title: "Zomerprogramma 2026", status: "Voorbij", group: "verlopen", quality: 99.6, recipients: "2.104 adressen", mode: "Prod", format: "C4", date: "08 sep", priority: false },
  { id: "ML-139891", title: "Nieuwsbrief juni", status: "Voorbij", group: "verlopen", quality: 98.9, recipients: "654 adressen", mode: "Prod", format: "C5", date: "30 aug", priority: false },
  { id: "CP-2026-03", title: "Donateursmailing voorjaar", status: "Voorbij", group: "verlopen", quality: 95.8, recipients: "516 adressen", mode: "Prod", format: "C5", date: "14 aug", priority: true },
  { id: "ML-139440", title: "Uitnodiging algemene vergadering", status: "Voorbij", group: "verlopen", quality: 99.2, recipients: "188 adressen", mode: "Test", format: "C5", date: "01 aug", priority: false },
]

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return <button aria-label={label} onClick={onClick} className="icon-button">{children}</button>
}

function PriorityIcon({ active }: { active: boolean }) {
  return <span className={`priority-bars ${active ? "is-priority" : ""}`} aria-label={active ? "Prioriteit" : "Geen prioriteit"}><i /><i /><i /></span>
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Verzonden") return <span className="status-icon status-sent"><Check /></span>
  if (status === "Voorbij") return <span className="status-icon status-past"><CalendarCheck2 /></span>
  return <span className="status-icon status-created"><span /></span>
}

function Quality({ value }: { value: number }) {
  const tone = value < 96 ? "quality-bad" : value < 98 ? "quality-warn" : "quality-good"
  return <span className={`quality ${tone}`}>{value.toFixed(1)}%</span>
}

function MailingRow({ mailing }: { mailing: typeof mailings[number] }) {
  return <div className="mailing-row">
    <div className="row-main"><PriorityIcon active={mailing.priority} /><span className="mailing-id">{mailing.id}</span><StatusIcon status={mailing.status} /><span className="mailing-title">{mailing.title}</span></div>
    <div className="row-meta"><span className="pill pill-client"><Sparkles /> Contrapunt</span><span className="pill">{mailing.recipients}</span><span className="pill pill-mode"><span className={mailing.mode === "Prod" ? "mode-dot prod" : "mode-dot test"} />{mailing.mode}</span><span className="pill">{mailing.format}</span><Quality value={mailing.quality} /><span className="mailing-date">{mailing.date}</span><IconButton label={`Opties voor ${mailing.title}`}><MoreHorizontal /></IconButton></div>
  </div>
}

function Group({ title, count, rows, collapsed, onToggle }: { title: string; count: number; rows: typeof mailings; collapsed: boolean; onToggle: () => void }) {
  return <section className="mailing-group"><div className="group-header"><button className="group-toggle" onClick={onToggle}><ChevronDown className={collapsed ? "rotate-[-90deg]" : ""} /><span>{title}</span><span className="count-badge">{count}</span></button><button className="add-button" aria-label={`Mailing toevoegen aan ${title}`}><Plus /></button></div>{!collapsed && <div className="group-rows">{rows.map((mailing) => <MailingRow key={mailing.id} mailing={mailing} />)}</div>}</section>
}

function NewMailingModal({ onClose }: { onClose: () => void }) {
  const [created, setCreated] = useState(false)
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="new-mailing-modal" role="dialog" aria-modal="true" aria-labelledby="new-mailing-title">
    <header className="modal-header"><div className="breadcrumb"><span className="brand-mark small"><Zap /></span><span>Contrapunt</span><ChevronDown /><span className="breadcrumb-muted">Nieuwe mailing</span></div><div className="modal-actions"><IconButton label="Uitklappen"><Grid2X2 /></IconButton><IconButton label="Sluiten" onClick={onClose}><X /></IconButton></div></header>
    <div className="modal-content"><input autoFocus className="title-input" id="new-mailing-title" placeholder="Titel van de mailing..." /><div className="upload-zone"><div className="upload-icon"><Upload /></div><strong>Sleep een adressenlijst hierheen</strong><span>of <button>selecteer een Excel-bestand</button> (.xlsx)</span><small><FileSpreadsheet /> Maximaal 10.000 adressen per mailing</small></div></div>
    <div className="property-bar"><Property icon={<ArrowUpDown />} label="NP" /><Property icon={<PackageCheck />} label="C5" /><Property icon={<span className="language-icon">NL</span>} label="Nederlands" /><Property icon={<Sparkles />} label="Contrapunt" /><Property icon={<CalendarCheck2 />} label="Verzenddatum" /><Property icon={<FlaskConical />} label="Productie" /><Property icon={<Tag />} label="MID 7-cijfers" /><Property icon={<ArrowUpDown />} label="PSC aan" /></div>
    <footer className="modal-footer"><label className="switch-label"><button className="switch" aria-pressed="true"><span /></button>Direct OptiAddress-validatie starten</label><button className="primary-button" onClick={() => setCreated(true)}>{created ? <><Check /> Mailing aangemaakt</> : "Mailing aanmaken"}</button></footer>
  </section></div>
}

function Property({ icon, label }: { icon: React.ReactNode; label: string }) { return <button className="property-pill">{icon}<span>{label}</span><ChevronDown /></button> }

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("")
  const results = mailings.filter((mailing) => `${mailing.id} ${mailing.title}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="search-modal" role="dialog" aria-modal="true" aria-labelledby="search-title"><div className="search-input-wrap"><Search /><input autoFocus id="search-title" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek in mailings, referenties of klant..." /><kbd>ESC</kbd></div><div className="search-tabs"><span className="tab active">Alles</span><span className="tab">Lopend</span><span className="tab">Verzonden</span><span className="tab">Verlopen</span></div><div className="search-results">{results.map((mailing) => <button key={mailing.id} className="search-result"><StatusIcon status={mailing.status} /><span><strong>{mailing.title}</strong><small>{mailing.id} · {mailing.recipients}</small></span><span className="result-date">{mailing.date}</span></button>)}{!results.length && <div className="empty-search">Geen mailings gevonden</div>}</div></section></div>
}

export default function Page() {
  const [newOpen, setNewOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState("Alles")
  const [settings, setSettings] = useState(false)
  const currentMailings = activeTab === "Alles" ? mailings : mailings.filter((mailing) => activeTab === "Lopend" ? mailing.group === "lopend" : activeTab === "Verlopen" ? mailing.group === "verlopen" : mailing.status === activeTab)
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true) } if (event.key.toLowerCase() === "c" && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) setNewOpen(true); if (event.key === "Escape") { setNewOpen(false); setSearchOpen(false) } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey) }, [])
  const groups = useMemo(() => ({ lopend: currentMailings.filter((mailing) => mailing.group === "lopend"), verlopen: currentMailings.filter((mailing) => mailing.group === "verlopen") }), [currentMailings])
  return <main className="linear-app"><aside className="sidebar"><div className="sidebar-head"><div className="brand-mark"><Zap /></div><span className="workspace-name">Contrapunt</span><div className="head-actions"><IconButton label="Zoeken" onClick={() => setSearchOpen(true)}><Search /></IconButton><IconButton label="Nieuwe mailing" onClick={() => setNewOpen(true)}><FileSpreadsheet /></IconButton></div></div><nav className="nav-list" aria-label="Hoofdnavigatie"><button className={!settings ? "nav-item active" : "nav-item"} onClick={() => setSettings(false)}><Inbox />Mijn mailings</button><button className={settings ? "nav-item active" : "nav-item"} onClick={() => setSettings(true)}><Settings />Instellingen</button></nav><div className="sidebar-bottom"><button className="help-button"><CircleHelp />Hulp nodig?</button><span className="version">Contrapunt · v1.0</span></div></aside><section className="main-panel"><header className="topbar"><div><div className="eyebrow">Mailings</div><h1>{settings ? "Instellingen" : "Mijn mailings"}</h1></div><div className="top-actions"><button className="shortcut-button" onClick={() => setSearchOpen(true)}><Search />Zoeken <kbd>⌘ K</kbd></button><IconButton label="Filter"><Filter /></IconButton><IconButton label="Weergave"><SlidersHorizontal /></IconButton></div></header>{settings ? <div className="settings-panel"><div className="settings-card"><Gauge /><div><h2>OptiAddress-validatie</h2><p>Adresvalidatie wordt automatisch uitgevoerd voor nieuwe mailings.</p></div><span className="setting-status">Actief</span></div><div className="settings-card"><LayoutList /><div><h2>Standaardinstellingen</h2><p>Beheer formaat, taal en verzendopties voor Contrapunt.</p></div><button className="secondary-button">Aanpassen</button></div></div> : <><div className="content-toolbar"><div className="tabs">{["Alles", "Lopend", "Verzonden", "Verlopen"].map((tab) => <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div><span className="result-count">{currentMailings.length} mailings</span></div><div className="mailings-container"><Group title="Lopende mailings" count={groups.lopend.length} rows={groups.lopend} collapsed={!!collapsed.lopend} onToggle={() => setCollapsed((value) => ({ ...value, lopend: !value.lopend }))} /><Group title="Verlopen mailings" count={groups.verlopen.length} rows={groups.verlopen} collapsed={!!collapsed.verlopen} onToggle={() => setCollapsed((value) => ({ ...value, verlopen: !value.verlopen }))} /></div></>}</section>{newOpen && <NewMailingModal onClose={() => setNewOpen(false)} />}{searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}</main>
}
