'use client'

import { Fragment, useMemo, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconSparkles } from '@tabler/icons-react'
import { isBelgianCountry, joinColumns } from '@/core/masspost/mapping'
import { missingTargets } from '@/core/masspost/format-check'
import {
  ADDRESS_FIELDS,
  ADDRESS_KINDS,
  FIELD_LABELS,
  ROLE_OPTIONS,
  addressKinds,
  columnExamples,
  columnFillCounts,
  columnProfile,
  formatCount,
  rolesToMapping,
  shortColumnName,
  type AddressKind,
  type ColumnRole,
  type LoadedList,
} from './columns'
import { modelLabel, type AiSuggestionResult } from './ai-suggestion'
import { IconRows3, Spinner } from './StatusIcons'
import styles from './poc.module.css'

interface Props {
  list: LoadedList
  docsUrl?: string
  roles: Record<string, ColumnRole>
  columnOrder: string[]
  checking: boolean
  onRoleChange: (header: string, role: ColumnRole) => void
  onMove: (column: string, direction: -1 | 1) => void
  onNext: () => void
  /** The AI proposal switch (AI plan, decision 13). Absent when no model is set up or offline. */
  ai?: {
    /** Gateway model id, shown readable in the tooltip. */
    model: string
    on: boolean
    busy: boolean
    /** The role the AI chose per column, once a proposal is known for this file (also when off). */
    roles?: Record<string, ColumnRole>
    error?: Exclude<AiSuggestionResult, { ok: true }>['reason']
    onToggle: (on: boolean) => void
  }
}

/** Why the AI proposal did not come, in plain words. */
const AI_ERRORS: Record<NonNullable<NonNullable<Props['ai']>['error']>, string> = {
  login: 'Je kan de AI-functies enkel gebruiken als je aangemeld bent.',
  not_linked: 'Je account is nog niet volledig ingesteld, dus de AI-functies werken nog niet.',
  not_configured: 'De AI-functies zijn hier niet beschikbaar.',
  failed: 'Het AI-voorstel lukte niet. Probeer het straks opnieuw, of koppel de kolommen zelf.',
}

function joinLabels(labels: string[]): string {
  return labels.length <= 1 ? labels.join('') : `${labels.slice(0, -1).join(', ')} en ${labels[labels.length - 1]}`
}

/** Step 2: a role per column with examples, a template envelope with the mapped columns, and one
 *  example envelope per kind of address (decision 46 for the pills). */
export function MappingStep({
  list,
  docsUrl,
  roles,
  columnOrder,
  checking,
  onRoleChange,
  onMove,
  onNext,
  ai,
}: Props) {
  const examples = useMemo(() => columnExamples(list), [list])
  const { mapping } = useMemo(() => rolesToMapping(columnOrder, roles), [columnOrder, roles])
  const kinds = useMemo(() => addressKinds(list, mapping), [list, mapping])
  const filled = useMemo(() => columnFillCounts(list), [list])
  const toAddress = (header: string) => (ADDRESS_FIELDS as readonly string[]).includes(roles[header])
  // Columns without any value add noise: they go to the bottom, in their own group. Those coupled to
  // the address come first there, in the order they had when the step opened: a row does not jump
  // away while you change its choice.
  const withValues = list.headers.filter((header) => filled[header] > 0)
  const [empty] = useState(() => {
    const all = list.headers.filter((header) => filled[header] === 0)
    return [...all.filter(toAddress), ...all.filter((header) => !toAddress(header))]
  })
  const emptyCoupled = empty.filter(toAddress).length
  const [opened, setOpened] = useState<string | null>(null)
  const [position, setPosition] = useState<Partial<Record<AddressKind, number>>>({})
  const missing = missingTargets(mapping)

  function renderColumn(header: string) {
    const i = list.headers.indexOf(header)
    const count = filled[header]
    const isOpen = opened === header
    const profile = isOpen ? columnProfile(list, header) : null
    // An empty column coupled to the address stands out; an unused empty one fades.
    const emptyCoupledHere = count === 0 && toAddress(header)
    // The AI's choice for this column, and whether it is the current one (told to screen readers).
    const aiRole = ai?.roles?.[header]
    const aiChosen = aiRole !== undefined && aiRole === roles[header]
    return (
      <Fragment key={header}>
        <div className={`${styles.mapRow} ${count === 0 && !emptyCoupledHere ? styles.mapRowDim : ''}`} role="row">
          <span className={styles.colName} role="cell">
            {count > 0 ? (
              <button
                type="button"
                className={styles.colToggle}
                aria-expanded={isOpen}
                aria-controls={`profile-${i}`}
                id={`col-${i}`}
                onClick={() => setOpened(isOpen ? null : header)}
              >
                <IconChevronRight className={styles.chev} size={14} aria-hidden="true" />
                {header}
              </button>
            ) : (
              <span className={styles.colPlain} id={`col-${i}`}>
                {header}
              </span>
            )}
          </span>
          <span className={styles.examples} role="cell">
            <span
              className={`${styles.pill} ${styles.pillSmall} ${count === 0 ? styles.pillMuted : ''}`}
              data-tip={
                count === 0
                  ? `Leeg in alle ${formatCount(list.rows.length)} rijen`
                  : `Gevuld in ${formatCount(count)} van ${formatCount(list.rows.length)} rijen`
              }
            >
              <span className={styles.pillBody} aria-hidden="true">
                <IconRows3 size={13} />
                {formatCount(count)}/{formatCount(list.rows.length)}
              </span>
              <span className={styles.srOnly}>
                Gevuld in {formatCount(count)} van {formatCount(list.rows.length)} rijen
              </span>
            </span>
            {examples[header].map((value) => (
              <span className={styles.example} key={value} title={value}>
                {value}
              </span>
            ))}
            {emptyCoupledHere && <span className={styles.emptyNote}>Gekoppeld, maar leeg: er komt niets in dit vak.</span>}
          </span>
          <span role="cell">
            <select
              className={styles.select}
              value={roles[header]}
              aria-labelledby={`col-${i}`}
              aria-describedby={aiChosen ? `ai-${i}` : undefined}
              onChange={(e) => onRoleChange(header, e.target.value as ColumnRole)}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {/* ✦ in front: the same text shows in the closed list and in the open list. */}
                  {aiRole === option.value && '✦ '}
                  {option.label}
                </option>
              ))}
            </select>
            {aiChosen && (
              <span className={styles.srOnly} id={`ai-${i}`}>
                Voorstel van AI
              </span>
            )}
          </span>
        </div>
        {profile && (
          <div className={styles.profile} id={`profile-${i}`} role="row">
            <p className={styles.m} role="cell">
              {formatCount(profile.distinct)} verschillende waarden
              {profile.longest && ` · langste waarde ${profile.longest.length} tekens`}
            </p>
            <div className={styles.examples} role="cell">
              {profile.values.map((value) => (
                <span className={styles.example} key={value} title={value}>
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}
      </Fragment>
    )
  }

  // Optional blocks appear on the envelope only when a column is mapped to them.
  const blocks = ADDRESS_FIELDS.filter(
    (field) => (field !== 'companyDepartment' && field !== 'country') || (mapping[field]?.length ?? 0) > 0,
  )

  return (
    <section aria-labelledby="mapping-title">
      <div className={styles.hd}>
        <div>
          <h1 className={styles.t} id="mapping-title">
            Kolommen koppelen
          </h1>
          <p className={styles.m}>
            Kies per kolom waarvoor we ze gebruiken. Kolommen met hetzelfde doel (bv. straat, huisnummer en bus) voegen
            we samen; de volgorde kies je op de eerste envelop.
          </p>
          {missing.length > 0 && (
            <p className={styles.missing} role="status">
              Kies nog een kolom voor: {joinLabels(missing.map((field) => FIELD_LABELS[field].title))}.
            </p>
          )}
        </div>
        <div className={styles.tg}>
          {checking ? (
            <span className={styles.busy} role="status">
              <Spinner />
              We kijken je lijst na…
            </span>
          ) : (
            <button
              type="button"
              className={`${styles.b} ${styles.primary}`}
              disabled={missing.length > 0}
              onClick={onNext}
            >
              Verder naar formaatvalidatie
            </button>
          )}
        </div>
      </div>

      <div className={styles.mapLayout}>
        <div>
          {ai?.error && (
            <p className={`${styles.alert} ${styles.aiAlert}`} role="alert">
              {AI_ERRORS[ai.error]}
              {ai.error === 'login' && (
                <>
                  {' '}
                  <a className={styles.link} href="/api/auth/signin?callbackUrl=/masspost/poc" target="_blank" rel="noopener noreferrer">
                    Aanmelden
                  </a>
                </>
              )}
            </p>
          )}
          <div className={styles.mapList} role="table" aria-label="Kolommen in je bestand">
            <div className={styles.mapHead} role="row">
              <span role="columnheader">Kolom in je bestand</span>
              <span role="columnheader">Voorbeelden</span>
              <span role="columnheader" className={styles.roleHead}>
                Gebruiken als
                {ai && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ai.on}
                    aria-busy={ai.busy}
                    disabled={ai.busy}
                    className={`${styles.aiSwitch} ${styles.tipBelow}`}
                    data-tip={`Koppel de kolommen volgens het voorstel van AI (${modelLabel(ai.model)})`}
                    onClick={() => ai.onToggle(!ai.on)}
                  >
                    <span className={styles.switchTrack} aria-hidden="true" />
                    {ai.busy ? (
                      <Spinner size={14} />
                    ) : (
                      <IconSparkles className={styles.aiIcon} size={14} stroke={1.75} aria-hidden="true" />
                    )}
                    AI-voorstel
                  </button>
                )}
              </span>
            </div>
            {withValues.map(renderColumn)}
            {empty.length > 0 && (
              <div className={styles.mapGroup} role="row">
                <span role="cell">
                  Kolommen zonder waarden ({formatCount(empty.length)}
                  {emptyCoupled > 0 && `, waarvan ${formatCount(emptyCoupled)} gekoppeld`})
                </span>
              </div>
            )}
            {empty.map(renderColumn)}
          </div>
          <p className={styles.help}>
            Klik op een kolom voor meer voorbeelden. <strong>Tonen bij het verbeteren:</strong> de kolom gaat niet naar
            bpost en komt niet op de envelop, maar je ziet ze naast een adres dat je moet verbeteren (bv. een lidnummer).{' '}
            <strong>Niet gebruiken:</strong> we doen er niets mee.
            {ai?.roles && ' ✦ staat bij de keuze die AI voorstelt.'}
            {docsUrl && (
              <>
                {' '}
                <a
                  className={styles.link}
                  href={`${docsUrl}/documentatie/webapp/adreslijst-nakijken#stap-2-kolommen-koppelen`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Meer uitleg over koppelen
                </a>
              </>
            )}
          </p>
        </div>

        <aside className={styles.envelopes} aria-label="Voorbeelden van enveloppen">
          <p className={styles.envTitle}>Zo komt het adres op de envelop, zoals in je lijst</p>
          <div className={styles.envCard}>
            <div className={styles.envHead}>
              <span title="De gekoppelde kolommen per regel. Wijzig de volgorde met de pijltjes.">Koppeling</span>
            </div>
            <div className={styles.envelope}>
            <div className={`${styles.envWindow} ${styles.envTemplate}`}>
              {blocks.map((field) => {
                const columns = mapping[field] ?? []
                return (
                  <div key={field} className={styles.envChips} aria-label={FIELD_LABELS[field].title}>
                    {columns.length === 0 ? (
                      <span className={styles.envEmpty}>({FIELD_LABELS[field].short}: kies een kolom)</span>
                    ) : (
                      columns.map((column, i) => (
                        <span key={column} className={styles.chip} title={`${FIELD_LABELS[field].title}: ${column}`}>
                          {i > 0 && (
                            <button type="button" aria-label={`${column} naar voren`} onClick={() => onMove(column, -1)}>
                              <IconChevronLeft size={12} aria-hidden="true" />
                            </button>
                          )}
                          <span className={styles.chipText}>{shortColumnName(column)}</span>
                          {i < columns.length - 1 && (
                            <button type="button" aria-label={`${column} naar achteren`} onClick={() => onMove(column, 1)}>
                              <IconChevronRight size={12} aria-hidden="true" />
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                )
              })}
            </div>
            </div>
          </div>

          {ADDRESS_KINDS.filter((kind) => kinds[kind.id].length > 0).map((kind) => {
            const rows = kinds[kind.id]
            const at = Math.min(position[kind.id] ?? 0, rows.length - 1)
            const index = rows[at]
            const row = list.rows[index]
            const lines = blocks
              .map((field) => ({ field, value: joinColumns(row, mapping[field] ?? []) }))
              .filter(({ field, value }) => {
                if (field === 'country') return value !== '' && !isBelgianCountry(value)
                if (field === 'companyDepartment') return value !== ''
                return true
              })
            const go = (delta: number) =>
              setPosition((p) => ({ ...p, [kind.id]: (at + delta + rows.length) % rows.length }))
            return (
              <div key={kind.id} className={styles.envCard}>
                <div className={styles.envHead}>
                  <span title={kind.tip}>{kind.label}</span>
                  <span className={styles.envNav}>
                    <button
                      type="button"
                      aria-label={`Vorig adres: ${kind.label}`}
                      onClick={() => go(-1)}
                      disabled={rows.length < 2}
                    >
                      <IconChevronLeft size={14} aria-hidden="true" />
                    </button>
                    <span>
                      {formatCount(at + 1)} / {formatCount(rows.length)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Volgend adres: ${kind.label}`}
                      onClick={() => go(1)}
                      disabled={rows.length < 2}
                    >
                      <IconChevronRight size={14} aria-hidden="true" />
                    </button>
                  </span>
                </div>
                <div className={styles.envelope}>
                <span className={styles.envRow}>Rij {list.rowNumbers[index]}</span>
                <div className={styles.envWindow}>
                  {lines.map(({ field, value }) => (
                    <div
                      key={field}
                      className={`${styles.envLine} ${value ? '' : styles.envEmpty}`}
                      title={`${FIELD_LABELS[field].title}: ${value || '(leeg)'}`}
                    >
                      {value || `(${FIELD_LABELS[field].short} leeg)`}
                    </div>
                  ))}
                </div>
                </div>
              </div>
            )
          })}
          {list.rows.length > 20_000 && <p className={styles.envTitle}>Soorten adressen: uit de eerste 20.000 rijen.</p>}
        </aside>
      </div>

    </section>
  )
}
