# 26: Captcha adapter with reCAPTCHA

**What to build:** Sites can add a captcha to the contact form through a captcha adapter. The Core implements reCAPTCHA, which loads only after the Visitor accepts its cookie category. Without consent, the honeypot and minimum fill time still protect the form. A Site can swap in an accessible, privacy-friendly captcha (e.g. ALTCHA for Capodimonte, as a Site-level adapter).

See `spec.md` (Contact form).

**Blocked by:** 25 (Contact form), 14 (Consent adapter)

**Status:** ready-for-agent

- [ ] The captcha adapter interface has a browser widget part and a server verification part. It is selected in Site config.
- [ ] reCAPTCHA implementation. Its script is declared with a consent category and loads only after consent.
- [ ] The server verifies the captcha only when the widget was available (consent given). Otherwise the baseline alone applies.
- [ ] A fake implementation exists. One shared contract suite covers both.
- [ ] Playwright checks there is no reCAPTCHA request before consent, and that the form still submits.
