## Design Context

### Users
- **CEO**: Executive getting a morning compliance read. Needs to know status at a glance, not dig for it.
- **CTO**: Technical lead tracking changes, releases, and traceability for audit purposes.
- **QA / Compliance**: Day-to-day operator — approves controls, manages evidence uploads, ensures process is followed.
- **Auditor**: External reviewer. Comes in to verify documentation and traceability. Credibility of the tool matters.

All users are professionals working in a Norwegian IT services company (SIMTEQ AS). Context: office environment, desktop, used daily by internal staff and periodically by external auditors.

### Brand Personality
**Serious, institutional, precise.** Like a professional audit firm — Bloomberg terminal meets KPMG internal tool. Not a startup SaaS. Not a project management tool. A compliance system that carries the weight of the work it supports.

Three words: **disciplined · traceable · trustworthy**

### Aesthetic Direction
- **Theme**: Light — this is a professional office tool used during business hours
- **Tone**: Dense and precise, not airy. Information should be dense but readable, not padded.
- **References**: Bloomberg terminal, KPMG audit tools, institutional financial software. Structured, hierarchy-driven, no decorative noise.
- **Anti-references**: Notion, Linear, any "startup SaaS dashboard" template. Explicitly NOT the `border-l-[3px]` accent stripe card pattern.
- **Typography**: Institutional authority. Consider condensed sans for headings (efficient, serious), readable serif or neutral sans for body. Avoid Inter, DM Sans, Plus Jakarta Sans and all reflex_fonts.
- **Color**: Restrained. One strong brand hue (navy or deep slate), neutral surfaces, color used only for semantic meaning (status, severity). Not decorative. OKLCH-based palette.
- **Layout**: Strong vertical rhythm. Hierarchy over equality — the compliance score should dominate the CEO view, not share equal weight with all other metrics.

### Design Principles
1. **Hierarchy is meaning** — Not every metric is equally important. Layout should reflect what the user needs to see first.
2. **No decorative noise** — Every visual element must earn its place. If it doesn't communicate something, remove it.
3. **Institutional precision** — Typography, spacing, and color should signal trustworthiness and professionalism — the aesthetic of a document that could be handed to an auditor.
4. **Role clarity** — CEO, CTO, and QA views should feel distinctly different. Same information architecture, different personalities.
5. **Data density over spaciousness** — Users with compliance jobs want to see more, not less. Don't pad everything into airy cards.
