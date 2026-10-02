# Must a MiC state museum website use Bootstrap Italia / the Designers Italia UI kit?

Research date: 2026-09-29. Scope: the new website of **Museo e Real Bosco di Capodimonte**, a Ministero della Cultura (MiC) institute with special autonomy. Question: may the frontend be built with Next.js + React + Tailwind CSS instead of Bootstrap Italia, while meeting every obligation?

Primary sources only: the AgID guidelines PDFs, Normattiva (CAD, L. 4/2004), Designers Italia and Docs Italia pages and their GitHub sources (cloned at the commits listed in [Sources](#sources)), the npm registry, MiC and ICDP documents.

Conventions:
- **[LG-DES]** = *Linee guida di design per i siti internet e i servizi digitali della PA*, AgID, July 2022 (Determinazione 224/2022).
- **[MUSEI]** = Designers Italia "Modello Musei civici" documentation.
- ⚠️ marks something uncertain or open to interpretation.
- This is technical research, not a legal opinion. The ⚠️ points should be confirmed by the client's legal office / RTD (Responsabile per la transizione al digitale).

---

## Executive answer

**Yes, you can build it with Next.js + React + Tailwind.** No law, and no AgID guideline, names Bootstrap Italia or any framework as mandatory for a MiC museum. Bootstrap Italia is mandatory only in two places:

1. the PNRR 1.4.1 compliance criteria for **Comuni** and **Scuole**, which do not apply here;
2. the adherence criteria of Designers Italia's design **models**.

The one real risk is item 2. The design guidelines say PAs **"SI DEVONO utilizzare, ove disponibili, modelli di design realizzati per specifiche tipologie di siti"** ([LG-DES] §5.5). Designers Italia now publishes a **"Musei civici"** model, and its first adherence criterion is **"Il sito utilizza la libreria Bootstrap Italia in una versione uguale o superiore alla 2.8"** ([MUSEI] C1).

⚠️ It is unclear whether that model counts as "available" for a *state* museum. It is titled and researched for *civic* (municipal) museums. No PNRR program, validator or asseveration process covers it. No MiC act adopts it.

Conditions for choosing Tailwind safely:

1. **Get the client's written acceptance** of the interpretation that the Musei civici model does not bind a MiC state museum, or that the site follows the model in substance without the C1 library criterion. Ideally this goes in the contract / capitolato. The contract must in any case contain the clause required by [LG-DES] §5.8.
2. **Meet every [LG-DES] "DEVE" requirement.** None of them depends on a framework. They cover accessibility, privacy/cookies, user research and usability testing, analytics with published stats, a feedback mechanism, an open content licence, responsive UI, and a consistent UI "privileging" Designers Italia tools.
3. **Meet L. 4/2004 accessibility obligations** (WCAG 2.1 AA via UNI CEI EN 301549), plus the yearly accessibility declaration and accessibility objectives. Bootstrap Italia would not give you these for free either.
4. **Follow the Musei civici model in substance** (information architecture, menus, content types, page layouts), and use the design system's foundations: the **design-tokens-italia** tokens and the Titillium Web / Lora / Roboto Mono fonts. These are framework-agnostic (CSS custom properties / JSON) and slot into Tailwind v4's `@theme`. This covers the "privileging designers.italia.it" requirement and most of the model's intent.

---

## 1. Who the museum is, legally

- Capodimonte is an office of MiC with special autonomy: "Istituto dotato di autonomia speciale, di rilevante interesse nazionale", with scientific, financial, organisational and accounting autonomy under art. 14 c.2 DL 83/2014 ([cultura.gov.it ente page](https://cultura.gov.it/ente/museo-e-real-bosco-di-capodimonte)). ⚠️ That page calls it "ufficio di livello dirigenziale non generale". The earlier DPCM 169/2019 art. 33 listed it as "livello dirigenziale generale" ([GU, DPCM 169/2019 art. 33](https://www.gazzettaufficiale.it/atto/serie_generale/caricaArticolo?art.versione=1&art.idGruppo=7&art.flagTipoArticolo=0&art.codiceRedazionale=20G00006&art.idArticolo=33&art.idSottoArticolo=1&art.idSottoArticolo1=10&art.dataPubblicazioneGazzetta=2020-01-21&art.progressivo=0)). The ministry has since been reorganised by DPCM 15 marzo 2024 n. 57 ([GU](https://www.gazzettaufficiale.it/eli/id/2024/05/03/24G00076/sg)). The level does not change the conclusions.
- As part of a Ministry, it is a PA under art. 1 c.2 D.Lgs. 165/2001. So the CAD applies to it (art. 2 c.2 lett. a CAD, [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-03-07;82~art2)), and so does L. 4/2004 (art. 3 c.1, [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2004-01-09;4~art3)).
- Context only, observed 2026-09-29: the current site `capodimonte.cultura.gov.it` runs WordPress with the commercial "Total" theme (`<meta name="generator" content="Total WordPress Theme v5.3.1">`), not Bootstrap Italia. So the museum does not use Bootstrap Italia today.

## 2. Legal obligations (apply regardless of funding)

### 2.1 CAD art. 53 and art. 71: the basis of the design guidelines

- Art. 53 c.1 sets principles only. Sites must respect "accessibilità, nonché di elevata usabilità e reperibilità, anche da parte delle persone disabili, completezza di informazione, chiarezza di linguaggio, affidabilità, semplicità di consultazione, qualità, omogeneità ed interoperabilità". Art. 53 c.1-ter delegates the details: "Con le Linee guida sono definite le modalità per la realizzazione e la modifica dei siti delle amministrazioni" ([Normattiva art. 53](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-03-07;82~art53)). **The CAD names no technology.**
- Art. 71 c.1: AgID adopts "Linee guida contenenti le regole tecniche e di indirizzo". They become effective once published on the AgID site, with notice in the Gazzetta Ufficiale ([Normattiva art. 71](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-03-07;82~art71)). The design guidelines are therefore binding secondary rules, to the extent that their own wording says "DEVE".
- Enforcement: art. 18-bis gives AgID powers of "vigilanza, verifica, controllo e monitoraggio", with pecuniary sanctions of €10,000–100,000 for failing to comply ([Normattiva art. 18-bis](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-03-07;82~art18bis)).

### 2.2 AgID "Linee guida di design per i siti internet e i servizi digitali della PA"

Version: "Luglio 2022", adopted with **Determinazione AgID n. 224/2022** ([AgID news 27/07/2022](https://www.agid.gov.it/it/agenzia/stampa-e-comunicazione/notizie/2022/07/27/pubblicate-linee-guida-design-i-siti-internet-i-servizi-digitali-pa)). The AgID landing page shows publication 02/09/2022 ([AgID](https://www.agid.gov.it/it/design-servizi/linee-guida-design-servizi-digitali-pa)). The official PDF ([2022 PDF](https://www.agid.gov.it/sites/default/files/repository_files/design-linee-guida-docs.pdf)) and the re-laid-out 2024 PDF ([2024-07 PDF](https://www.agid.gov.it/sites/agid/files/2024-07/Linee_Guida_design_per_siti_internet_e_servizi_digitali_della_PA.pdf)) have the same requirements text. I diffed them and found no newer revision. The older 2020 Docs Italia guidelines are marked "Queste linee guida sono superate" ([Docs Italia 2020.1](https://docs.italia.it/italia/designers-italia/design-linee-guida-docs/it/stabile/index.html)).

**Keyword semantics ("Note di lettura", ISO/IEC Directives Part 3)** ([PDF](https://www.agid.gov.it/sites/default/files/repository_files/design-linee-guida-docs.pdf)):
- "DEVE o DEVONO, indicano un requisito obbligatorio";
- "DOVREBBE … indicano che le implicazioni devono essere comprese e attentamente pesate prima di scegliere approcci alternativi";
- "PUÒ … OPZIONALE" = free choice.

**What the text says about kits and models** (same PDF):

| Where | Text | Force |
|---|---|---|
| §2.1 Scopo | The guidelines "contengono un elenco di regole tecniche, per la cui implementazione di dettaglio **DOVREBBERO** essere utilizzate le indicazioni, gli strumenti, i modelli e i kit resi disponibili sul sito https://designers.italia.it" | Recommendation (strong). Deviating is allowed if you weigh the implications and can justify the choice. |
| §5.5 Interfaccia utente | "SI **DEVONO** utilizzare, **ove disponibili**, modelli di design realizzati per specifiche tipologie di siti internet e servizi digitali" | **Mandatory, but conditional on a model being "available"** for your type of site. ⚠️ See §3.2. |
| §5.5 | "SI **DEVONO** realizzare … interfacce coerenti nello stile e nell'esperienza d'uso, **privilegiando** le indicazioni e gli strumenti previsti su https://designers.italia.it" | Consistency is mandatory. Designers Italia tools are to be *privileged* (preferred), not required. |
| §5.5 | "SI DEVONO realizzare interfacce che si adattino al dispositivo dell'utente" | Mandatory (responsive design). |
| §5.8 Attuazione | Public contracts **DEVONO** contain: «Il fornitore incaricato deve rispettare le indicazioni riportate nelle Linee guida di design per i siti internet e i servizi digitali della PA» | Mandatory contract clause. It binds the supplier to the guidelines, not to Bootstrap Italia. |

**Bootstrap Italia is not named anywhere in [LG-DES].** The `DOVREBBERO` in §2.1 is the only general hook to the kits.

Other framework-independent "DEVE" requirements you must plan for ([PDF](https://www.agid.gov.it/sites/default/files/repository_files/design-linee-guida-docs.pdf)):
- **§5.1 Accessibility:** comply with L. 4/2004 and the AgID accessibility guidelines.
- **§5.2 Privacy and security:** GDPR art. 25 by design, privacy notice, cookie guidelines of the Garante (10/06/2021). The site must stay fully usable even without consent. RPD contacts must be reachable from the homepage. There must be a legal basis for third-party embeds such as fonts, video players and social plug-ins (§5.6). This is relevant to Google Fonts, YouTube and similar.
- **§5.3 User-centred design:** user research, usability tests, PA controlled vocabularies, internal and external findability. "SI DOVREBBE" show the last-update date on every page.
- **§5.4 Monitoring:** collect analytics and **publish** aggregated statistics. Provide a user feedback / satisfaction mechanism. WAI (Web Analytics Italia) is recommended with "DOVREBBE".
- **§5.7 Licences:** an open licence on the content, with a link to it.

### 2.3 Accessibility: L. 4/2004 and the AgID accessibility guidelines

- The AgID "Linee guida sull'accessibilità degli strumenti informatici" were adopted with Det. 437/2019, rectified by Det. 396/2020 and again on 21/12/2022 (Det. 354/2022) ([AgID page](https://www.agid.gov.it/it/design-servizi/accessibilita/linee-guida-accessibilita-pa), [PDF rev. 21-12-2022](https://www.agid.gov.it/sites/default/files/repository_files/linee_guida_accessibilita_versione_rettifica_del_21_dic_2022_rev_rscc.pdf), [trasparenza AgID](https://trasparenza.agid.gov.it/page/9/details/2731/determinazione-n3542022-del-22-dicembre-2022-linee-guida-sullaccessibilita-degli-strumenti-informatici-adottate-con-determinazione-n-4372019-del-20-dicembre-2019-e-rettificate-con-determinazione-n-3962020-del-10-settembre-2020-rettifica-per-adeguamento-a-norma-tecnica-europea-armonizzata-sopravvenuta.html)).
- The technical reference is EN 301 549 v3.2.1 (UNI CEI EN 301549:2021), which means **WCAG 2.1 level AA** for the web ([PDF](https://www.agid.gov.it/sites/default/files/repository_files/linee_guida_accessibilita_versione_rettifica_del_21_dic_2022_rev_rscc.pdf)). ⚠️ A move to WCAG 2.2 is expected once the harmonised standard is updated. Building to 2.2 AA now is cheap insurance.
- Yearly duties: publish the **dichiarazione di accessibilità** via form.agid.gov.it by **23 September**, and the **obiettivi di accessibilità** by **31 March** ([AgID accessibilità](https://www.agid.gov.it/it/design-servizi/accessibilita)).
- These rules are outcome-based (conformance), not tool-based. A Tailwind site is compliant if it meets WCAG 2.1 AA. A Bootstrap Italia site is not compliant just because it uses Bootstrap Italia.

### 2.4 MiC sector rules: DM 113/2018 (Livelli uniformi di qualità per i musei)

- Area III "Comunicazione e rapporti con il territorio", §1.2 "Strumenti informativi", minimum standard: "Sito web specifico o sezione all'interno dell'ente di appartenenza con informazioni essenziali e aggiornate sul museo, sui documenti istituzionali, sul patrimonio, sui servizi e sulle attività". Improvement goal: online information "in più lingue, almeno in inglese" ([DM 113/2018, scanned PDF, p. 21](https://musei.cultura.gov.it/wp-content/uploads/2021/11/D.M.-21-FEBBRAIO-2018-REP.-113.pdf)).
- §1.5 "Relazioni con il pubblico" lists, among its standards and goals, main contacts on the website and a complaints procedure (same PDF, p. 23).
- **These are content requirements. The decree says nothing about technology or UI kits.**
- ⚠️ I found **no MiC / Direzione generale Musei "linee guida per i siti web dei musei"**, and no circular imposing a platform, theme or UI kit on autonomous museums. Searched: [DG Musei risorse](https://musei.cultura.gov.it/risorse), [MiC circolari](https://cultura.gov.it/comunicati/circolari). The site's hosting on the `cultura.gov.it` subdomain may bring internal ministry IT/communication rules that are not public. See the open questions.

### 2.5 ICDP – Piano nazionale di digitalizzazione (PND)

- The PND (v1.0 June 2022, v1.1 2023) is MiC's digital-transformation strategy for 2022–2026. It is addressed to state museums, archives and libraries, and linked to PNRR M1C3 investment 1.1 ([PND docs](https://docs.italia.it/italia/icdp/icdp-pnd-docs/it/v1.0-giugno-2022/index.html), [PND v1.1 PDF](https://digitallibrary.cultura.gov.it/wp-content/uploads/2023/10/PND_V1_1_2023-1.pdf)).
- For web services, the PND only refers back to AgID: "Per la progettazione di servizi web si rimanda alle *Linee Guida di design per i servizi web delle PA*" (footnote 21, `visione/opportunita.rst` in [italia/ICDP-PND-docs@63d2813](https://github.com/italia/ICDP-PND-docs)).
- I grepped the companion guidelines (digitalizzazione, servizi, maturità) for "Designers", "Bootstrap" and "siti web". There is **no UI-kit requirement**.
- The PND guidelines matter for how collection data, images and licences are published (e.g. reuse of reproductions), not for the frontend framework.

## 3. Obligations tied to specific programs or models

### 3.1 PNRR Misura 1.4.1 "Esperienza del cittadino nei servizi pubblici": does not apply

- Beneficiaries of 1.4.1 on PA digitale 2026: **"Comuni, Scuole"** ([padigitale2026.gov.it/misure](https://padigitale2026.gov.it/misure)). Central administrations and museums are not beneficiaries of 1.4.1.
- **This is where the Bootstrap Italia obligation lives.** Criterion C.SI.1.2 of the Comuni model, used for 1.4.1 asseveration, reads: "In tutte le pagine del sito viene utilizzata la libreria Bootstrap Italia … si usano solo componenti messi a disposizione da Bootstrap Italia, laddove presenti … la versione in uso è uguale o superiore alla 2.0" ([Comuni conformità](https://docs.italia.it/italia/designers-italia/design-comuni-docs/it/versione-corrente/conformita/conformita-modello-sito.html)).
- How it is verified: the official validator (App di valutazione) reads `window.BOOTSTRAP_ITALIA_VERSION` or the CSS custom property `--bootstrap-italia-version`, and looks for unique Bootstrap Italia CSS classes (`src/audits/municipality/bootstrapItaliaDoubleCheckAudit.ts` in [italia/pa-website-validator@71d44b3](https://github.com/italia/pa-website-validator)).
- The validator supports only `municipality` and `school` (`src/index.ts` choices in [italia/pa-website-validator-ng@6af6185](https://github.com/italia/pa-website-validator-ng)). There is **no museum validator**.
- **PNRR cultural measures:** M1C3 inv. 1.1 funds the national digital-heritage infrastructure / Digital Library under the PND (see §2.5). I found no PNRR measure that funds, or sets UI requirements for, a museum's institutional website. ⚠️ Ask the client whether *this* project is financed by PNRR or other funds whose grant terms cite a model or kit.

### 3.2 Designers Italia "Modello Musei civici": the key ambiguity

- **What it is.** "Il modello per il sito dei musei civici", with resources "per i visitatori dei musei civici". It contains an information architecture document, a component library and 30 page layouts, all in **Figma/Sketch only**. No HTML or CMS implementation is published. Page last updated 2025-10-08 ([designers.italia.it/modelli/musei-civici](https://designers.italia.it/modelli/musei-civici/)). Model list: Comuni, Scuole, ASL, Musei civici. There is none for ministries or state museums ([designers.italia.it/modelli](https://designers.italia.it/modelli/)). UI kit repo: [italia/design-musei-ui-kit](https://github.com/italia/design-musei-ui-kit) (Figma + Sketch).
- **Audience.** The research behind it interviewed ANCI, ICOM Italia, and "responsabili IT e di comunicazione di Comuni e musei civici" (`ricerca-e-progettazione/interviste-stakeholder.rst`). Yet the introduction speaks generically of the "complessità organizzativa degli enti museali" (`introduzione.rst`). Both files are in [italia/design-musei-docs@8492dfa](https://github.com/italia/design-musei-docs), rendered at [Docs Italia](https://docs.italia.it/italia/designers-italia/design-musei-docs/it/versione-corrente/index.html).
- **Adherence criteria** (`adesione-modello.rst`, same repo):
  - **C1** "Il sito utilizza la libreria Bootstrap Italia in una versione uguale o superiore alla 2.8";
  - **C2** at least 3 of the first-level menu items "Organizza la visita", "Esplora il museo/i musei", "Mostre ed eventi", "Educazione e ricerca";
  - **C3** at least 50% of the listed second-level pages, with the required titles;
  - **C4** content types Oggetto, Personaggio, Mostra o evento;
  - **C5** minimum attributes per content type, each including "Ultimo aggiornamento dei contenuti".
  - Recommendations R1–R5: R5 is the fonts Titillium, Lora, Roboto Mono.
  - Mandatory norms N1–N5: accessibility declaration, https, privacy notice, cookies, open licence.
- **Why it matters.** [LG-DES] §5.5 says models "SI DEVONO utilizzare, ove disponibili". If the Musei civici model counts as available for Capodimonte, adhering to it arguably includes C1, which means Bootstrap Italia ≥ 2.8.
- **Arguments that it does not bind a MiC state museum** ⚠️:
  - it is explicitly scoped to *civic* museums;
  - no act of AgID or MiC extends it to state museums;
  - no funding program, asseveration or validator is attached to it;
  - the model page uses encouraging language, not mandatory language;
  - [LG-DES] requires use of the *model*, and the library criterion is a model-adherence check rather than a guideline requirement.
- **Arguments that it does bind** ⚠️: it is the only available model for "museum websites", and §5.5 does not qualify "specifiche tipologie" by owning entity.
- **Practical reading:** adopt the model's IA, content types and layouts (C2–C5, R1–R5, N1–N5). These are framework-independent and bring most of the user benefit. Document a reasoned deviation on C1 only, which is the "weigh the implications" route allowed for DOVREBBE items. Get the client to sign off.

## 4. Recommendations vs. obligations: summary table

| Item | Source | Applies to Capodimonte? | Force |
|---|---|---|---|
| CAD art. 53 principles (accessible, usable, findable, consistent…) | CAD | Yes | Law |
| [LG-DES] "DEVE" items (§5.1–5.8) | AgID Det. 224/2022 | Yes | Binding guideline (CAD art. 71) |
| Use Designers Italia kits (incl. Bootstrap Italia) | [LG-DES] §2.1 "DOVREBBERO" | Yes | Strong recommendation; deviation must be justified |
| Use the "type-specific" design model | [LG-DES] §5.5 "DEVONO, ove disponibili" | ⚠️ Unclear: only a *civic* museums model exists | Mandatory if applicable |
| Bootstrap Italia ≥ 2.8 | [MUSEI] C1 | ⚠️ Only if the Musei civici model applies | Model-adherence criterion |
| Bootstrap Italia ≥ 2.0 on all pages | Comuni C.SI.1.2 / PNRR 1.4.1 | No (Comuni/Scuole only) | Funding condition |
| WCAG 2.1 AA + yearly declaration/objectives | L. 4/2004 + AgID LG accessibilità | Yes | Law |
| Website with essential, updated info; English recommended | DM 113/2018 LUQ III.1.2 | Yes | MiC quality standard (content) |
| Designers Italia fonts Titillium/Lora/Roboto Mono | [MUSEI] R5 | If following the model | Recommendation |
| Open-source release of commissioned code | CAD art. 69, LG riuso | Yes (listed in [MUSEI] "Norme obbligatorie") | Law; relevant to the seed's licence |

## 5. What Designers Italia offers that works with Tailwind / React

Checked on npm and GitHub on 2026-09-29.

| Asset | Version / status | Framework coupling | Use with Next + Tailwind |
|---|---|---|---|
| **design-tokens-italia** | npm `1.3.3` (2026-02-17), BSD-3-Clause | None. JSON tokens (global/semantic/specific), built with Style Dictionary to `dist/css/variables.css` (≈300 `--it-*` custom properties: colours, fonts, spacing, borders, shadows) and SCSS ([README](https://github.com/italia/design-tokens-italia), commit `b59fe73`; [design tokens doc](https://designers.italia.it/design-system/fondamenti/design-tokens/)) | **Best fit.** Import the CSS variables and map them in Tailwind v4 `@theme` (e.g. `--color-primary: var(--it-color-blue-40)`-style aliases), or generate a Tailwind theme from the JSON. |
| **UI Kit Italia (Figma)** + **Musei civici UI kit (Figma/Sketch)** | Figma community files | None (design files) | The designers' source of truth for components and layouts. Rebuild the components in React + Tailwind. |
| **Bootstrap Italia** | stable `2.18.3` (2026-08-04); `3.0.0-beta.7` (2026-09-22) ([npm](https://www.npmjs.com/package/bootstrap-italia)). Designers Italia calls v2 "the official resource" and v3 "in beta", with CSS custom properties and modular Sass ([per sviluppatori](https://designers.italia.it/design-system/come-iniziare/per-sviluppatori/)) | Bootstrap 5 CSS + vanilla JS | Clashes with Tailwind (global resets, class names). Only needed if the client insists on [MUSEI] C1. |
| **Design React Kit** | `5.10.0` (2026-03-17) ([npm](https://www.npmjs.com/package/design-react-kit)) | React, but ships Bootstrap Italia CSS | Satisfies C1 through Bootstrap Italia, but brings the same Tailwind conflict. |
| **Dev Kit Italia** (Lit web components) | `@italia/dev-kit-italia` `1.0.0-beta.5` (2026-09-28). README: "in lavorazione … **non sono consigliati per l'utilizzo in ambienti di produzione**". Depends on `bootstrap-italia 3.0.0-beta.7` and `design-tokens-italia ^1.3.3`. Ships a Next.js 16 App Router example (`examples/next-app`) with SSR-safe patterns ([italia/dev-kit-italia@6686eeb](https://github.com/italia/dev-kit-italia)) | Framework-agnostic in principle (web components), but styles come from Bootstrap Italia 3 | Not production-ready today. Worth tracking: once stable, it may become the official framework-neutral route, and its components could sit inside a Tailwind layout. |

## 6. Recommendation for the seed

1. **Build with Tailwind; make design-tokens-italia the token layer.** Add `design-tokens-italia` as a dependency. Import `dist/css/variables.css` and alias the semantic tokens into Tailwind v4 `@theme` (colours, spacing, font families, radii, shadows). Per-Site brand colours then override the primary/secondary tokens, which is what the Musei model's "Personalizzazione dell'interfaccia" allows ([MUSEI] `interfaccia/ui-kit-modello-musei-civici.rst`). This is the concrete way to meet [LG-DES] §5.5 "privilegiando … designers.italia.it" without Bootstrap.
2. **Self-host the fonts** Titillium Web, Lora and Roboto Mono (SIL OFL) via `next/font/local`, not the Google Fonts CDN. This satisfies [MUSEI] R5 and avoids the third-party-embed legal-basis issue in [LG-DES] §5.6.
3. **Model the DatoCMS schema on the Musei civici model.**
   - Build the first-level Page tree "Organizza la visita / Esplora il museo / Mostre ed eventi / Educazione e ricerca".
   - Create the Oggetto, Personaggio and Mostra/Evento routable models with the C5 attributes.
   - Give every record an "ultimo aggiornamento" field shown on the page.
   - This fits the seed's Page / Routable model concepts ([CONTEXT.md](../../CONTEXT.md)). Keep it as a Capodimonte Site configuration rather than hard-coding it into the Seed.
4. **Mirror the Figma components** (header variants, hero, "card relaunch", footer, breadcrumbs, the page-clarity rating widget from [MUSEI] R4) as React + Tailwind components. Carry over the accessibility annotations from the Figma kit ([MUSEI] `interfaccia/annotazioni-accessibilita.rst`).
5. **Treat compliance as tested features, not framework side-effects:**
   - axe / Playwright accessibility checks targeting WCAG 2.1 AA (aim for 2.2);
   - a footer with an accessibility-declaration link, privacy, cookies, RPD contacts and content licence;
   - a cookie-less or consent-gated analytics option (WAI / Matomo) with published stats;
   - a per-page feedback widget;
   - a last-update date on every page.
6. **Keep a seam for Dev Kit Italia.** Isolate primitives (Button, Accordion, Tabs, Modal) behind the seed's own component API, so they can later be swapped for Dev Kit Italia web components once they reach a stable release.
7. **Do not "fake" Bootstrap Italia** (e.g. setting `window.BOOTSTRAP_ITALIA_VERSION`) to pass a validator. No museum validator exists, and doing this would misrepresent compliance.

## 7. Open questions for the client

1. Is the project financed by **PNRR** (which measure?) or by other grants whose terms require a Designers Italia model, kit or asseveration?
2. Does the tender / capitolato / contract contain the [LG-DES] §5.8 clause? Does it add requirements beyond it, such as "conformità al modello Musei civici" or "utilizzo di Bootstrap Italia"?
3. Does the museum's RTD or legal office consider the **Musei civici model** applicable to a MiC state museum under [LG-DES] §5.5? Will they accept, in writing, a Tailwind implementation that follows the model's IA, content types and layouts but not criterion C1?
4. Are there **internal MiC rules** (Direzione generale Musei, the ministry's IT/communication office, or rules for `*.cultura.gov.it` hosting) on the platform, theme, analytics (WAI), cookie banner or hosting for institute websites?
5. Who publishes the yearly **accessibility declaration**: the museum itself, or MiC centrally? Will the supplier deliver the conformance evaluation?
6. Content licence (CC BY 4.0?) and the PND reuse policy for collection images. These affect the licence notice and the image components.
7. Must the site source code be released as open source on Developers Italia (CAD art. 69 / LG riuso)? That affects the seed's licence and repository hygiene.

---

## Sources

Law and AgID
- CAD art. 2, 18-bis, 53, 71 on Normattiva: [art. 2](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-03-07;82~art2), [art. 18-bis](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-03-07;82~art18bis), [art. 53](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-03-07;82~art53), [art. 71](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-03-07;82~art71)
- L. 4/2004 art. 3: https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2004-01-09;4~art3
- Linee guida di design (July 2022): https://www.agid.gov.it/sites/default/files/repository_files/design-linee-guida-docs.pdf and https://www.agid.gov.it/sites/agid/files/2024-07/Linee_Guida_design_per_siti_internet_e_servizi_digitali_della_PA.pdf; landing page https://www.agid.gov.it/it/design-servizi/linee-guida-design-servizi-digitali-pa; news https://www.agid.gov.it/it/agenzia/stampa-e-comunicazione/notizie/2022/07/27/pubblicate-linee-guida-design-i-siti-internet-i-servizi-digitali-pa; HTML "guida pratica" https://docs.italia.it/italia/design/lg-design-servizi-web/it/versione-corrente/requisiti.html
- Superseded 2020 guidelines: https://docs.italia.it/italia/designers-italia/design-linee-guida-docs/it/stabile/index.html
- AgID accessibility: https://www.agid.gov.it/it/design-servizi/accessibilita, https://www.agid.gov.it/it/design-servizi/accessibilita/linee-guida-accessibilita-pa, https://www.agid.gov.it/sites/default/files/repository_files/linee_guida_accessibilita_versione_rettifica_del_21_dic_2022_rev_rscc.pdf

PNRR and validators
- PA digitale 2026 measures: https://padigitale2026.gov.it/misure
- Comuni conformity criteria: https://docs.italia.it/italia/designers-italia/design-comuni-docs/it/versione-corrente/conformita/conformita-modello-sito.html
- Validator: https://github.com/italia/pa-website-validator (commit `71d44b3`), https://github.com/italia/pa-website-validator-ng (commit `6af6185`)

Designers Italia
- Models: https://designers.italia.it/modelli/ and https://designers.italia.it/modelli/musei-civici/
- Musei civici docs: https://docs.italia.it/italia/designers-italia/design-musei-docs/it/versione-corrente/index.html; source https://github.com/italia/design-musei-docs (commit `8492dfa`, 2025-01-20); UI kit https://github.com/italia/design-musei-ui-kit, https://www.figma.com/community/file/1362341553612665419/musei-civici-modello-sito
- Design system: https://designers.italia.it/design-system/, https://designers.italia.it/design-system/come-iniziare/per-sviluppatori/, https://designers.italia.it/design-system/fondamenti/design-tokens/
- Manuale operativo, "Sviluppare con il design system .italia": https://docs.italia.it/italia/designers-italia/manuale-operativo-design-docs/it/versione-corrente/doc/sviluppo-dell-interfaccia/sviluppare-con-il-design-system-italia.html
- Code: https://github.com/italia/design-tokens-italia (commit `b59fe73`), https://github.com/italia/dev-kit-italia (commit `6686eeb`), https://github.com/italia/bootstrap-italia
- npm registry (versions/dates): https://registry.npmjs.org/bootstrap-italia, https://registry.npmjs.org/design-tokens-italia, https://registry.npmjs.org/design-react-kit, https://registry.npmjs.org/@italia/dev-kit-italia

MiC / ICDP
- Capodimonte status: https://cultura.gov.it/ente/museo-e-real-bosco-di-capodimonte; DPCM 169/2019 art. 33 (GU link in §1); DPCM 57/2024: https://www.gazzettaufficiale.it/eli/id/2024/05/03/24G00076/sg
- DM 113/2018 (LUQ musei): https://musei.cultura.gov.it/wp-content/uploads/2021/11/D.M.-21-FEBBRAIO-2018-REP.-113.pdf
- DG Musei resources: https://musei.cultura.gov.it/risorse; MiC circolari: https://cultura.gov.it/comunicati/circolari
- PND: https://docs.italia.it/italia/icdp/icdp-pnd-docs/it/v1.0-giugno-2022/index.html, https://digitallibrary.cultura.gov.it/wp-content/uploads/2023/10/PND_V1_1_2023-1.pdf; sources https://github.com/italia/ICDP-PND-docs (commit `63d2813`), https://github.com/italia/ICDP-PND-servizi-docs, https://github.com/italia/ICDP-PND-digitalizzazione-docs, https://github.com/italia/ICDP-PND-maturita-docs
