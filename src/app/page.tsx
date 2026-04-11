export default function Home() {
  return (
    <div className="bp-home">
      <h1 className="bp-home-title">BPost e-MassPost MCP</h1>
      <p className="bp-home-lead">
        A secure, multi-tenant Model Context Protocol server for mail sorting and delivery batch
        announcements.
      </p>
      <div className="bp-home-cta">
        <a href="/dashboard" className="bp-btn bp-btn--primary">
          Go to Dashboard
        </a>
        <a href="/install" className="bp-btn bp-btn--secondary">
          How to connect
        </a>
        <a
          href="https://github.com/markminnoye/bpost-e-masspost-skills"
          target="_blank"
          rel="noopener noreferrer"
          className="bp-btn bp-btn--secondary"
        >
          Skills Documentation
        </a>
      </div>
    </div>
  )
}
