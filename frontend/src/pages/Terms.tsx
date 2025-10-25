export default function TermsPage() {
  const lastUpdated = new Date().toISOString().slice(0, 10)
  return (
    <section className='card'>
      <h1>Terms of Service</h1>
      <p style={{ color: 'var(--muted)' }}>Last updated: {lastUpdated}</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using this service, you agree to be bound by these Terms.</p>

      <h2>2. Use of Service</h2>
      <p>You agree to use the service in compliance with applicable laws and not to misuse or interfere with the service.</p>

      <h2>3. Accounts</h2>
      <p>You are responsible for maintaining the confidentiality of your account and for all activities under your account.</p>

      <h2>4. Termination</h2>
      <p>We may suspend or terminate access if you violate these Terms or if required by law.</p>

      <h2>5. Changes</h2>
      <p>We may modify these Terms. Material changes will be communicated, and continued use constitutes acceptance.</p>

      <h2>6. Contact</h2>
      <p>Questions about these Terms? Contact us at support@example.com.</p>
    </section>
  )
}

