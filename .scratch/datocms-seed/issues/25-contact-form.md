# 25: Contact form

**What to build:** Visitors write to the organisation through a contact form Block with these fields: name, email, subject, message, and a mandatory privacy consent linking to the privacy notice. The form works without JavaScript and shows accessible errors.

Spam protection: an always-on honeypot and a minimum fill time.

Delivery: the message is sent by SMTP through an email delivery adapter.
- The recipient comes from Site settings.
- The Visitor's address goes in Reply-To.
- No copy goes to the Visitor and nothing is stored.
- A failure shows a clear error and is logged.

See `spec.md` (Contact form).

**Blocked by:** 10 (Block renderer and Structured Text), 03 (Logging adapter and Labels)

**Status:** ready-for-agent

- [ ] A migration adds the contact form Block, plus the recipient and privacy notice link in Site settings.
- [ ] Submission runs as a Server Action. Without JS it posts and re-renders with field errors linked to their inputs.
- [ ] Validation order: honeypot, minimum fill time, (captcha hook, no-op until ticket 26), fields. Spam is rejected silently.
- [ ] Email delivery adapter interface. The SMTP implementation takes credentials from environment variables. A fake exists, and one shared contract suite runs against the fake and a local SMTP test server.
- [ ] The Visitor's email is in Reply-To, never the sender. No copy goes to the Visitor and nothing is persisted.
- [ ] A delivery failure shows a clear error from Labels and is logged.
- [ ] Playwright with axe covers success, field errors and failure, with JS disabled.
- [ ] `block-coverage.md` is updated.
