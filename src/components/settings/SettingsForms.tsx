'use client'

import { useActionState, type ReactNode } from 'react'
import { IconBrandGoogleDrive } from '@tabler/icons-react'
import { saveBpost, saveDefaults, saveOrganisation, type SettingsResult } from '@/app/(app)/instellingen/actions'
import { PageHeader } from '@/components/app-shell/AppShell'
import { Placeholder } from '@/components/app-shell/Placeholder'
import type { TenantSettings } from '@/lib/tenant/settings'
import styles from '@/components/app-shell/app.module.css'

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
  lead: string
  action: (formData: FormData) => void
  children: ReactNode
}) {
  return (
    <form action={action} className={styles.card}>
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

/**
 * Instellingen (replaces the dashboard): organisation, bpost, defaults, and Google Drive as a
 * placeholder (SR-112 §3, v1 spec §2).
 * @param props The settings of the tenant.
 */
export function SettingsForms({ settings }: { settings: TenantSettings }) {
  const [orgResult, orgAction, orgPending] = useActionState(saveOrganisation, null)
  const [bpostResult, bpostAction, bpostPending] = useActionState(saveBpost, null)
  const [defaultsResult, defaultsAction, defaultsPending] = useActionState(saveDefaults, null)
  const d = settings.defaults
  const b = settings.bpost

  return (
    <div className={styles.pageNarrow}>
      <PageHeader title="Instellingen" />

      <Card title="Organisatie" lead="Deze gegevens gelden voor iedereen van je organisatie." action={orgAction}>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="s-name">Naam</label>
            <input id="s-name" name="name" defaultValue={settings.name} required maxLength={100} />
          </div>
          <div className={styles.field}>
            <span className={styles.flabel}>Domein</span>
            <Placeholder tip="Komt met de koppeling aan Google Workspace">Het domein van je organisatie</Placeholder>
          </div>
        </div>
        <Foot pending={orgPending} result={orgResult} />
      </Card>

      <Card title="bpost" lead="De gegevens van je contract bij bpost. Het wachtwoord bewaren we versleuteld." action={bpostAction}>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="s-prs">Klantnummer (PRS)</label>
            <input id="s-prs" name="customerNumber" defaultValue={b?.customerNumber ?? ''} inputMode="numeric" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="s-acc">Account-ID</label>
            <input id="s-acc" name="accountId" defaultValue={b?.accountId ?? ''} inputMode="numeric" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="s-bc">Barcode-klant-ID</label>
            <input id="s-bc" name="barcodeCustomerId" defaultValue={b?.barcodeCustomerId ?? ''} inputMode="numeric" aria-describedby="s-bc-hint" />
            <span className={styles.hint} id="s-bc-hint">
              5 cijfers
            </span>
          </div>
          <div className={styles.field}>
            <label htmlFor="s-user">Gebruikersnaam</label>
            <input id="s-user" name="username" defaultValue={b?.username ?? ''} autoComplete="off" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="s-pw">Wachtwoord</label>
            <input
              id="s-pw"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={b?.hasPassword ? 'Laat leeg om het huidige te houden' : ''}
              required={!b?.hasPassword}
            />
          </div>
        </div>
        <Foot pending={bpostPending} result={bpostResult} />
      </Card>

      <Card title="Standaardwaarden" lead="Wat een nieuwe mailing al ingevuld krijgt. Je kan het per mailing aanpassen." action={defaultsAction}>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="s-format">Formaat</label>
            <select id="s-format" name="format" defaultValue={d.format}>
              <option value="Small">Klein formaat</option>
              <option value="Large">Groot formaat</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="s-prio">Prioriteit</label>
            <select id="s-prio" name="priority" defaultValue={d.priority}>
              <option value="NP">Non-prior</option>
              <option value="P">Prior</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="s-barcode">Barcode</label>
            <select id="s-barcode" name="genMID" defaultValue={d.genMID}>
              <option value="N">Geen</option>
              <option value="7">bpost, 7 cijfers</option>
              <option value="9">bpost, 9 cijfers</option>
              <option value="11">bpost, 11 cijfers</option>
              <option disabled>Contrapunt, 11 cijfers (binnenkort)</option>
            </select>
          </div>
          <div className={styles.field}>
            <span className={styles.flabel}>Presortering</span>
            <label className={styles.check}>
              <input type="checkbox" name="genPSC" value="Y" defaultChecked={d.genPSC === 'Y'} /> bpost maakt de presorteercodes
            </label>
          </div>
          <div className={styles.field}>
            <label htmlFor="s-prefix">Voorvoegsel voor codes</label>
            <input
              id="s-prefix"
              name="codePrefix"
              defaultValue={settings.storedCodePrefix}
              placeholder={d.codePrefix}
              maxLength={8}
              aria-describedby="s-prefix-hint"
            />
            <span className={styles.hint} id="s-prefix-hint">
              Bv. {d.codePrefix} geeft {d.codePrefix}-{new Date().getFullYear()}-15.
            </span>
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
