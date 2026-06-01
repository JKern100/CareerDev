export default function RefundPage() {
  return (
    <div style={{ flex: 1 }}>
      <div className="container" style={{ maxWidth: "720px", padding: "3rem 1rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Refund Policy</h1>
        <p className="text-sm text-muted" style={{ marginBottom: "2rem" }}>Last updated: April 2026</p>

        <div style={{ lineHeight: 1.8, color: "var(--fg)" }}>
          <h2>1. Overview</h2>
          <p>
            CrewTransition (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) wants you to be satisfied with your purchase.
            This Refund Policy explains when and how you can request a refund for payments made
            through our Service.
          </p>

          <h2>2. Digital Products</h2>
          <p>
            CrewTransition provides digital services including AI-generated career analysis reports,
            personalised action plans, and AI career coaching. Because these are digital products
            that are delivered immediately upon purchase, refund eligibility depends on whether the
            service has been consumed.
          </p>

          <h2>3. Refund Eligibility</h2>

          <h3>3.1 Eligible for Refund</h3>
          <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>
              <strong>Unused purchases</strong> — If you purchased a plan but have not yet generated
              a career analysis report, you may request a full refund within 14 days of purchase.
            </li>
            <li>
              <strong>Technical issues</strong> — If a technical error on our end prevented you from
              receiving or accessing the service you paid for, you are eligible for a full refund
              regardless of timeframe.
            </li>
            <li>
              <strong>Duplicate charges</strong> — If you were charged more than once for the same
              service, we will refund the duplicate charge immediately.
            </li>
          </ul>

          <h3>3.2 Not Eligible for Refund</h3>
          <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>
              <strong>Consumed services</strong> — Once your AI career analysis report has been
              generated and delivered, the service is considered consumed and is generally not
              eligible for a refund.
            </li>
            <li>
              <strong>Dissatisfaction with AI output</strong> — Because AI-generated content varies
              and is produced on demand, we cannot offer refunds based on subjective dissatisfaction
              with the analysis results. However, if you believe the output is significantly below
              reasonable quality, please contact us and we will review your case.
            </li>
          </ul>

          <h2>4. Subscription Cancellation</h2>
          <p>
            If you are on a recurring subscription plan, you may cancel at any time. Upon
            cancellation, you will retain access to paid features until the end of your current
            billing period. We do not provide prorated refunds for partial billing periods.
          </p>

          <h2>5. How to Request a Refund</h2>
          <p>
            To request a refund, contact us at{" "}
            <a href="mailto:crewtransition.app@gmail.com" style={{ color: "var(--primary)" }}>
              crewtransition.app@gmail.com
            </a>{" "}
            with:
          </p>
          <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>Your account email address</li>
            <li>The date of purchase</li>
            <li>The reason for your refund request</li>
          </ul>
          <p>
            We aim to respond to all refund requests within 3 business days.
          </p>

          <h2>6. Processing</h2>
          <p>
            Approved refunds are processed through our payment provider, Paddle. Refunds are
            typically returned to your original payment method within 5–10 business days, depending
            on your bank or card issuer.
          </p>

          <h2>7. Chargebacks</h2>
          <p>
            We encourage you to contact us before initiating a chargeback with your bank. We are
            committed to resolving disputes fairly and promptly. Filing a chargeback without first
            contacting us may result in suspension of your account.
          </p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Refund Policy from time to time. Changes will be posted on this
            page with an updated date. Continued use of the Service after changes constitutes
            acceptance of the updated policy.
          </p>

          <h2>9. Contact</h2>
          <p>
            For refund requests or questions about this policy, contact us at{" "}
            <a href="mailto:crewtransition.app@gmail.com" style={{ color: "var(--primary)" }}>
              crewtransition.app@gmail.com
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
