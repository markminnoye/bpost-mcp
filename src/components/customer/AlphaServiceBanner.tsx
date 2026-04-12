/**
 * User-facing notice: pre-release service; prefer BPost test environment.
 * @see https://github.com/markminnoye/bpost-mcp/issues/7
 */
export function AlphaServiceBanner() {
  return (
    <div className="bp-alert" role="status">
      <p className="bp-prose" style={{ margin: 0 }}>
        <strong>⚠️ Alfaversie!</strong> Deze dienst is nog in ontwikkeling: fouten en wijzigingen zijn mogelijk.
        Gebruik bij voorkeur de <strong>testomgeving van bpost</strong> (de standaard hier) totdat je echt live
        gaat en geen risico wilt lopen met echte mailingdata.
      </p>
    </div>
  )
}
