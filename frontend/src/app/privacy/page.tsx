export default function PrivacyPage() {
  return (
    <div style={{ flex: 1 }}>
      <div className="container" style={{ maxWidth: "720px", padding: "3rem 1rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Privacy Policy</h1>
        <p className="text-sm text-muted" style={{ marginBottom: "2rem" }}>Last updated: April 2026</p>

        <div style={{ lineHeight: 1.8, color: "var(--fg)" }}>
          <h2>1. Introduction</h2>
          <p>
            CrewTransition (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates CrewTransition.com. This Privacy Policy explains
            how we collect, use, store, and protect your personal information when you use our Service.
            We are committed to protecting your privacy and handling your data responsibly.
          </p>

          <h2>2. Information We Collect</h2>

          <h3>2.1 Account Information</h3>
          <p>
            When you create an account, we collect your email address, name (optional), and password
            (hashed — we never store plaintext passwords). If you sign in with Google, we receive your
            Google profile name and email address.
          </p>

          <h3>2.2 Questionnaire Responses</h3>
          <p>
            The core of our Service involves collecting your answers to career-related questions. This
            may include information about your work experience, skills, preferences, financial situation,
            visa status, and career goals. You provide this information voluntarily, and it is used
            solely to generate your personalised career analysis.
          </p>

          <h3>2.3 AI-Generated Reports</h3>
          <p>
            We store the career analysis reports, profile summaries, and action plans generated for
            you so you can access them later.
          </p>

          <h3>2.4 Usage Data</h3>
          <p>
            We collect basic usage information including login timestamps, pages visited, and feature
            usage to improve the Service. We do not use third-party tracking or advertising cookies.
          </p>

          <h3>2.5 Payment Information</h3>
          <p>
            Payment processing is handled by our third-party payment provider. We do not store your
            credit card numbers or payment details on our servers. We receive confirmation of your
            subscription status and transaction identifiers.
          </p>

          <h2>3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>Generate personalised career analysis reports and recommendations</li>
            <li>Provide AI career coaching based on your profile</li>
            <li>Send account-related emails (verification, password reset)</li>
            <li>Improve the accuracy and quality of our AI models and scoring frameworks</li>
            <li>Maintain and improve the Service</li>
          </ul>

          <h2>4. AI Processing</h2>
          <p>
            Your questionnaire responses are sent to a third-party AI provider (currently Google Gemini)
            to generate your career analysis. The data sent includes your answers and relevant context
            but does not include your email address or password. AI providers may process your data
            according to their own privacy policies. We do not use your data to train AI models.
          </p>

          <h2>5. Data Sharing</h2>
          <p>We do not sell, rent, or trade your personal information. We may share data with:</p>
          <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
            <li><strong>AI providers</strong> — to generate your career analysis (questionnaire answers only)</li>
            <li><strong>Email service providers</strong> — to send transactional emails (email address only)</li>
            <li><strong>Payment processors</strong> — to process payments (handled entirely by the processor)</li>
            <li><strong>Legal authorities</strong> — if required by law or to protect our rights</li>
          </ul>

          <h2>6. Data Storage and Security</h2>
          <p>
            Your data is stored on secure, cloud-hosted servers. We use industry-standard security
            measures including encrypted connections (HTTPS), hashed passwords, and access controls.
            However, no system is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2>7. Data Retention</h2>
          <p>
            We retain your account data and questionnaire responses for as long as your account is
            active. If you delete your account, your personal data will be removed from our active
            databases. We may retain anonymised, aggregated data for analytical purposes.
          </p>

          <h2>8. Your Rights</h2>
          <p>You have the right to:</p>
          <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
            <li><strong>Access</strong> — Request a copy of your personal data</li>
            <li><strong>Correction</strong> — Update or correct inaccurate information</li>
            <li><strong>Deletion</strong> — Request deletion of your account and personal data</li>
            <li><strong>Data portability</strong> — Request your data in a machine-readable format</li>
            <li><strong>Withdraw consent</strong> — Withdraw consent for data processing at any time</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:support@crewtransition.com" style={{ color: "var(--primary)" }}>
              support@crewtransition.com
            </a>.
          </p>

          <h2>9. Cookies</h2>
          <p>
            We use essential cookies only (authentication tokens stored in your browser&apos;s local
            storage). We do not use advertising cookies, analytics cookies, or third-party tracking
            cookies.
          </p>

          <h2>10. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for individuals under the age of 18. We do not knowingly
            collect personal information from children.
          </p>

          <h2>11. International Users</h2>
          <p>
            The Service is available globally. By using the Service, you consent to your data being
            transferred to and processed in the country where our servers are located. We take
            reasonable steps to ensure your data is treated securely regardless of location.
          </p>

          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be communicated
            via email or in-app notification. Continued use of the Service after changes constitutes
            acceptance of the updated policy.
          </p>

          <h2>13. Contact</h2>
          <p>
            For questions about this Privacy Policy or to exercise your data rights, contact us at{" "}
            <a href="mailto:support@crewtransition.com" style={{ color: "var(--primary)" }}>
              support@crewtransition.com
            </a>.
          </p>
        </div>

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <a href="/" className="btn btn-outline">Back to Home</a>
        </div>
      </div>
    </div>
  );
}
