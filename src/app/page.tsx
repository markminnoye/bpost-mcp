const buttonStyles = {
  base: {
    padding: '0.85rem 1.75rem',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '1rem',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-block',
    border: 'none',
  } as const,
  primary: {
    backgroundColor: '#e30613',
    color: 'white',
    boxShadow: '0 2px 8px rgba(227, 6, 19, 0.3)',
  } as const,
  secondary: {
    backgroundColor: '#f5f5f5',
    color: '#171717',
    border: '1px solid #e0e0e0',
  } as const,
}

export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      gap: '1.25rem'
    }}>
      <h1 style={{
        fontSize: '2.75rem',
        fontWeight: '800',
        background: 'linear-gradient(to right, #e30613, #a1040d)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.02em',
      }}>
        BPost e-MassPost MCP
      </h1>
      <p style={{
        fontSize: '1.2rem',
        maxWidth: '600px',
        color: '#555',
        lineHeight: '1.7'
      }}>
        A secure, multi-tenant Model Context Protocol server for mail sorting and delivery batch announcements.
      </p>
      <div style={{
        marginTop: '2.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <a
          href="/dashboard"
          style={{
            ...buttonStyles.base,
            ...buttonStyles.primary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c30511'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(227, 6, 19, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#e30613'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(227, 6, 19, 0.3)'
          }}
        >
          Go to Dashboard
        </a>
        <a
          href="/install"
          style={{
            ...buttonStyles.base,
            ...buttonStyles.secondary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e8e8e8'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.borderColor = '#ccc'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.borderColor = '#e0e0e0'
          }}
        >
          How to connect
        </a>
        <a
          href="https://github.com/markminnoye/bpost-e-masspost-skills"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...buttonStyles.base,
            ...buttonStyles.secondary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e8e8e8'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.borderColor = '#ccc'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.borderColor = '#e0e0e0'
          }}
        >
          Skills Documentation
        </a>
      </div>
    </div>
  );
}
