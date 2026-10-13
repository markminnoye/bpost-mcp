'use client'

import { useActionState, type ReactNode } from 'react'
import { IconBrandGoogleDrive } from '@tabler/icons-react'
import { saveBpost, saveDefaults, saveOrganisation, type SettingsResult } from '@/app/(app)/instellingen/actions'
import { PageHeader } from '@/components/app-shell/AppShell'
import { FieldError, FieldLabel } from '@/components/app-shell/FieldLabel'
import { Placeholder } from '@/components/app-shell/Placeholder'
import { FIELD_TIPS } from '@/components/mailing-flow/field-tips'
import type { TenantSettings } from '@/lib/tenant/settings'
import styles from '@/components/app-shell/app.module.css'

/** What each setting means, in plain words (bpost names from the e-MassPost portal). */
const TIPS = {
  name: 'De naam van je organisatie, zoals ze links bovenaan staat.',
  customerNumber: 'Je klantnummer bij bpost (PRS), 1 tot 8 cijfers. Het staat in elk bestand dat naar bpost gaat.',
  accountId: 'Het Account Id van je contract op het e-MassPost-portaal, 1 tot 8 cijfers. Niet hetzelfde als het Barcode Id.',
  barcodeCustomerId:
    'Het Barcode Id van het e-MassPost-portaal: 5 cijfers, met nullen vooraan (210 wordt 00210). Het staat in elke Mail ID-barcode.',
  username: 'Je gebruikersnaam voor het e-MassPost-portaal van bpost.',
  password: 'Je wachtwoord voor het e-MassPost-portaal. We bewaren het versleuteld.',
  codePrefix: 'Het begin van de code van elke nieuwe mailing, bv. CP in CP-2026-15. Letters en cijfers, maximaal 8.',
} as const

/** A default for a new mailing: the meaning of the field in step 1, and that it is only a default. */
const asDefault = (tip: string) => `${tip} Dit is de standaard voor een nieuwe mailing.`

function Outcome({ result }: { result: SettingsResult }) {
  if (!result) return null
  return (
    <span role="status" className={result.ok ? styles.ok : styles.err}>
      {result.ok ? result.message : result.error}
    </span>
  )
}

function Card({
  title,
  lead,
  action,
  children,
}: {
  title: ReactNode
  lead: ReactNode
  action: (formData: FormData) => void
  children: ReactNode
}) {
  // noValidate: what is wrong shows under the field, in our words, not in the browser's bubble.
  return (
    <form action={action} className={styles.card} noValidate>
      <h2>{title}</h2>
      <p className={styles.lead}>{lead}</p>
      {children}
    </form>
  )
}

function Foot({ pending, result }: { pending: boolean; result: SettingsResult }) {
  return (
    <div className={styles.formFoot}>
      <Outcome result={result} />
      <button type="submit" className={styles.btn} disabled={pending}>
        {pending ? 'Bewaren…' : 'Bewaren'}
      </button>
    </div>
  )
}

/** The field message and the typed value after a failed save. */
function useField(result: SettingsResult) {
  const fields = result && !result.ok ? result.fields : undefined
  const values = result && !result.ok ? result.values : undefined
  return {
    error: (name: string) => fields?.[name],
    value: (name: string, stored: string) => values?.[name] ?? stored,
    describedBy: (name: string, hint?: string) =>
      [fields?.[name] ? `${name}-err` : null, hint ?? null].filter(Boolean).join(' ') || undefined,
  }
}

const REQUIRED_NOTE = (
  <>
    Verplichte velden zijn aangeduid met een sterretje (<span className={styles.req}>*</span>).
  </>
)

/**
 * Instellingen (replaces the dashboard): organisation, bpost, defaults, and Google Drive as a
 * placeholder (SR-112 §3, v1 spec §2). Like step 1: a tip per field and messages under the field.
 * @param props The settings of the tenant.
 */
export function SettingsForms({ settings }: { settings: TenantSettings }) {
  const [orgResult, orgAction, orgPending] = useActionState(saveOrganisation, null)
  const [bpostResult, bpostAction, bpostPending] = useActionState(saveBpost, null)
  const [defaultsResult, defaultsAction, defaultsPending] = useActionState(saveDefaults, null)
  const org = useField(orgResult)
  const bp = useField(bpostResult)
  const df = useField(defaultsResult)
  const d = settings.defaults
  const b = settings.bpost

  return (
    <div className={styles.page}>
      <PageHeader title="Instellingen" />

      <Card title="Organisatie" lead="Deze gegevens gelden voor iedereen van je organisatie." action={orgAction}>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <FieldLabel htmlFor="s-name" label="Naam" required tip={TIPS.name} />
            <input
              id="s-name"
              name="name"
              defaultValue={org.value('name', settings.name)}
              maxLength={100}
              aria-invalid={!!org.error('name')}
              aria-describedby={org.describedBy('name')}
            />
            <FieldError id="name-err" message={org.error('name')} />
          </div>
          <div className={styles.field}>
            <span className={styles.flabel}>Domein</span>
            <Placeholder tip="Komt met de koppeling aan Google Workspace">Het domein van je organisatie</Placeholder>
          </div>
        </div>
        <Foot pending={orgPending} result={orgResult} />
      </Card>

      <Card
        title="bpost"
        lead={<>De gegevens van je contract bij bpost. Het wachtwoord bewaren we versleuteld. {REQUIRED_NOTE}</>}
        action={bpostAction}
      >
        <div className={styles.grid2}>
          <div className={styles.field}>
            <FieldLabel htmlFor="s-prs" label="Klantnummer (PRS)" required tip={TIPS.customerNumber} />
            <input
              id="s-prs"
              name="customerNumber"
              defaultValue={bp.value('customerNumber', b?.customerNumber ?? '')}
              inputMode="numeric"
              aria-invalid={!!bp.error('customerNumber')}
              aria-describedby={bp.describedBy('customerNumber')}
            />
            <FieldError id="customerNumber-err" message={bp.error('customerNumber')} />
          </div>
          <div className={styles.field}>
            <FieldLabel htmlFor="s-acc" label="Account-ID" required tip={TIPS.accountId} />
            <input
              id="s-acc"
              name="accountId"
              defaultValue={bp.value('accountId', b?.accountId ?? '')}
              inputMode="numeric"
              aria-invalid={!!bp.error('accountId')}
              aria-describedby={bp.describedBy('accountId')}
            />
            <FieldError id="accountId-err" message={bp.error('accountId')} />
          </div>
          <div className={styles.field}>
            <FieldLabel htmlFor="s-bc" label="Barcode-klant-ID" tip={TIPS.barcodeCustomerId} />
            <input
              id="s-bc"
              name="barcodeCustomerId"
              defaultValue={bp.value('barcodeCustomerId', b?.barcodeCustomerId ?? '')}
              inputMode="numeric"
              aria-invalid={!!bp.error('barcodeCustomerId')}
              aria-describedby={bp.describedBy('barcodeCustomerId', 's-bc-hint')}
            />
            {bp.error('barcodeCustomerId') ? (
              <FieldError id="barcodeCustomerId-err" message={bp.error('barcodeCustomerId')} />
            ) : (
              <span className={styles.hint} id="s-bc-hint">
                5 cijfers
              </span>
            )}
          </div>
          <div className={styles.field}>
            <FieldLabel htmlFor="s-user" label="Gebruikersnaam" required tip={TIPS.username} />
            <input
              id="s-user"
              name="username"
              defaultValue={bp.value('username', b?.username ?? '')}
              autoComplete="off"
              aria-invalid={!!bp.error('username')}
              aria-describedby={bp.describedBy('username')}
            />
            <FieldError id="username-err" message={bp.error('username')} />
          </div>
          <div className={styles.field}>
            <FieldLabel htmlFor="s-pw" label="Wachtwoord" required={!b?.hasPassword} tip={TIPS.password} />
            <input
              id="s-pw"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={b?.hasPassword ? 'Laat leeg om het huidige te houden' : ''}
              aria-invalid={!!bp.error('password')}
              aria-describedby={bp.describedBy('password')}
            />
            <FieldError id="password-err" message={bp.error('password')} />
          </div>
        </div>
        <Foot pending={bpostPending} result={bpostResult} />
      </Card>

      <Card
        title="Standaardwaarden"
        lead="Wat een nieuwe mailing al ingevuld krijgt. Je kan het per mailing aanpassen."
        action={defaultsAction}
      >
        <div className={styles.grid2}>
          <div className={styles.field}>
            <FieldLabel htmlFor="s-format" label="Formaat" tip={asDefault(FIELD_TIPS.format)} />
            <select id="s-format" name="format" defaultValue={df.value('format', d.format)}>
              <option value="Small">Klein formaat</option>
              <option value="Large">Groot formaat</option>
            </select>
          </div>
          <div className={styles.field}>
            <FieldLabel htmlFor="s-prio" label="Prioriteit" tip={asDefault(FIELD_TIPS.priority)} />
            <select id="s-prio" name="priority" defaultValue={df.value('priority', d.priority)}>
              <option value="NP">Non-prior</option>
              <option value="P">Prior</option>
            </select>
          </div>
          <div className={styles.field}>
            <FieldLabel htmlFor="s-barcode" label="Barcode" tip={asDefault(FIELD_TIPS.barcode)} />
            <select id="s-barcode" name="genMID" defaultValue={df.value('genMID', d.genMID)}>
              <option value="N">Geen</option>
              <option value="7">bpost, 7 cijfers</option>
              <option value="9">bpost, 9 cijfers</option>
              <option value="11">bpost, 11 cijfers</option>
              <option disabled>Contrapunt, 11 cijfers (binnenkort)</option>
            </select>
          </div>
          <div className={styles.field}>
            <FieldLabel label="Presortering" tip={asDefault(FIELD_TIPS.presort)} />
            <label className={styles.check}>
              <input type="checkbox" name="genPSC" value="Y" defaultChecked={d.genPSC === 'Y'} /> bpost maakt de presorteercodes
            </label>
          </div>
          <div className={styles.field}>
            <FieldLabel htmlFor="s-prefix" label="Voorvoegsel voor codes" tip={TIPS.codePrefix} />
            <input
              id="s-prefix"
              name="codePrefix"
              defaultValue={df.value('codePrefix', settings.storedCodePrefix)}
              placeholder={d.codePrefix}
              maxLength={8}
              aria-invalid={!!df.error('codePrefix')}
              aria-describedby={df.describedBy('codePrefix', 's-prefix-hint')}
            />
            {df.error('codePrefix') ? (
              <FieldError id="codePrefix-err" message={df.error('codePrefix')} />
            ) : (
              <span className={styles.hint} id="s-prefix-hint">
                Bv. {d.codePrefix} geeft {d.codePrefix}-{new Date().getFullYear()}-15.
              </span>
            )}
          </div>
        </div>
        <Foot pending={defaultsPending} result={defaultsResult} />
      </Card>

      <section className={styles.card} aria-labelledby="s-drive-title">
        <h2 id="s-drive-title">
          <IconBrandGoogleDrive size={18} stroke={1.75} aria-hidden="true" />
          Google Drive
        </h2>
        <p className={styles.lead}>
          Straks staan je mailings en hun bestanden in een map op een gedeelde drive van je organisatie. Wie toegang heeft tot die
          map, ziet de mailings.
        </p>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <span className={styles.flabel}>Gedeelde drive</span>
            <Placeholder>Kies een gedeelde drive</Placeholder>
          </div>
          <div className={styles.field}>
            <span className={styles.flabel}>Map</span>
            <Placeholder>bpost-e-masspost</Placeholder>
          </div>
        </div>
      </section>
    </div>
  )
}
