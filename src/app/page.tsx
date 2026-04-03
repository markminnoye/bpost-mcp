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
      gap: '1rem'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: '800',
        background: 'linear-gradient(to right, #e30613, #a1040d)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        BPost e-MassPost MCP
      </h1>
      <p style={{
        fontSize: '1.25rem',
        maxWidth: '600px',
        color: '#666',
        lineHeight: '1.6'
      }}>
        A secure, multi-tenant Model Context Protocol server for mail sorting and delivery batch announcements.
      </p>
      <div style={{
        marginTop: '2rem',
        display: 'flex',
        gap: '1rem'
      }}>
        <a 
          href="/dashboard" 
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#e30613',
            color: 'white',
            borderRadius: '8px',
            fontWeight: '600',
            transition: 'opacity 0.2s'
          }}
        >
          Go to Dashboard
        </a>
        <a 
          href="https://github.com/markminnoye/bpost-e-masspost-skills" 
          target="_blank"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f4f4f4',
            color: '#171717',
            borderRadius: '8px',
            fontWeight: '600',
            transition: 'background-color 0.2s'
          }}
        >
          Skills Documentation
        </a>
      </div>
    </div>
  );
}
