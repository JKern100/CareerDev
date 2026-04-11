export default function TermsPage() {
  return (
    <div style={{ flex: 1 }}>
      <div className="container" style={{ maxWidth: "720px", padding: "3rem 1rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Terms of Service</h1>
        <p className="text-sm text-muted" style={{ marginBottom: "2rem" }}>Last updated: April 2026</p>

        <div style={{ lineHeight: 1.8, color: "var(--fg)" }}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using CrewTransition.com (&quot;the Service&quot;), operated by CrewTransition (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;),
            you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            CrewTransition is an AI-powered career transition platform designed for aviation professionals.
            The Service includes a multi-stage questionnaire, AI-generated career analysis reports,
            personalised action plans, and an AI career coach. The Service is provided for informational
            and guidance purposes only and does not constitute professional career counselling, legal,
            financial, or immigration advice.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You must create an account to use the Service. You are responsible for maintaining the
            confidentiality of your login credentials and for all activities under your account.
            You must provide accurate, current information during registration. We reserve the right
            to suspend or terminate accounts that violate these terms.
          </p>

          <h2>4. Paid Plans and Payments</h2>
          <p>
            Certain features require a paid subscription or one-time purchase. Prices are displayed
            on the pricing page and may change with notice. Payments are processed by our third-party
            payment provider. Refund policies are described at the point of purchase. Promotional codes
            may be offered at our discretion and may be revoked at any time.
          </p>

          <h2>5. AI-Generated Content</h2>
          <p>
            The Service uses artificial intelligence to generate career analysis reports, profile
            summaries, action plans, and coaching responses. While we strive for accuracy, AI-generated
            content may contain errors, outdated information, or recommendations that do not suit your
            specific circumstances. You should independently verify any information before making
            career, financial, or legal decisions. We are not liable for decisions made based on
            AI-generated content.
          </p>

          <h2>6. Salary and Market Data</h2>
          <p>
            Salary figures, job market data, and credential information provided by the Service are
            indicative estimates sourced from publicly available market references. Actual compensation
            varies by employer, location, experience, and market conditions. We do not guarantee the
            accuracy of salary data.
          </p>

          <h2>7. User Content and Data</h2>
          <p>
            You retain ownership of the answers and information you provide through the questionnaire.
            By using the Service, you grant us a limited licence to process your data for the purpose
            of generating your career analysis and providing the Service. We will not sell your personal
            data to third parties. See our <a href="/privacy" style={{ color: "var(--primary)" }}>Privacy Policy</a> for
            full details on data handling.
          </p>

          <h2>8. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to reverse-engineer, scrape, or extract the AI models or proprietary content</li>
            <li>Share your account credentials with others</li>
            <li>Submit false or misleading information</li>
            <li>Interfere with or disrupt the Service</li>
          </ul>

          <h2>9. Intellectual Property</h2>
          <p>
            All content, branding, code, AI models, resource documents, and scoring frameworks are
            the intellectual property of CrewTransition. You may not copy, distribute, or create
            derivative works from our proprietary content. Your personalised reports are generated
            for your personal use only.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. To the maximum extent
            permitted by law, we shall not be liable for any indirect, incidental, special, or
            consequential damages arising from your use of the Service, including but not limited to
            career decisions, financial losses, or missed opportunities.
          </p>

          <h2>11. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at any time for violation of these
            terms. You may delete your account at any time. Upon termination, your right to use the
            Service ceases immediately. We may retain anonymised data for analytical purposes.
          </p>

          <h2>12. Changes to Terms</h2>
          <p>
            We may update these Terms of Service from time to time. Continued use of the Service after
            changes constitutes acceptance of the updated terms. Material changes will be communicated
            via email or in-app notification.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with applicable law. Any
            disputes arising from these terms or the Service shall be resolved through good-faith
            negotiation before pursuing formal proceedings.
          </p>

          <h2>14. Contact</h2>
          <p>
            For questions about these Terms of Service, contact us at{" "}
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
