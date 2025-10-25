export default function PrivacyPage() {
  const lastUpdated = new Date().toISOString().slice(0, 10)
  return (
    <section className='card'>
      <h1>Privacy Policy</h1>
      <p style={{ color: 'var(--muted)' }}>Last updated: {lastUpdated}</p>

      <h2>1. Information We Collect</h2>
      <p>We collect basic profile information provided by your identity provider (e.g., Google), such as email, name, and profile image.</p>

      <h2>2. How We Use Information</h2>
      <p>We use your information to authenticate you, operate the service, and improve user experience.</p>

      <h2>3. Data Storage</h2>
      <p>Data may be stored in third-party services (e.g., Xata). Access is restricted and secured.</p>

      <h2>4. Cookies</h2>
      <p>We may set cookies for authentication state (e.g., oauth_state) and session management.</p>

      <h2>5. Sharing</h2>
      <p>We do not sell your personal information. We may share data with providers solely to operate the service.</p>

      <h2>6. Your Choices</h2>
      <p>You can request access, correction, or deletion of your data by contacting support@example.com.</p>

      <h2>7. Contact</h2>
      <p>Questions about this policy? Contact us at support@example.com.</p>
    </section>
  )
}

