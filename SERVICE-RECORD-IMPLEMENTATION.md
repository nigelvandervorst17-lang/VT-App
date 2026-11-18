# Service Record PDF, PR #24
The uploaded example is a **filled** 2026 Service Record rev.26-7. It must not be committed to public GitHub or reused unredacted.
The template is a non-fillable landscape A4 PDF (841.68 × 595.2 points), with grid text coordinates measured from the source.

## Fields matched to the exact columns
- Header: ND, Office, Report no., Client, Service location, Week, Purchase Order No.
- Service work line: Date, Name inspector, Day, Start, End, Description, Overnight/Offshore, Code, STD, OVT L, OVT H, Break, Films/Weld Rates & Specials, #, Inspected Items, PO no. / remarks.
- Travel: Date, Name inspector, Day, before Start/End, after Start/End, Remarks, Travel hours, KM.
- Footer: Service record prepared by, Date, Signature for approval client, Date, General remarks and totals.

The app uses the exact **blank original** as the PDF background; it does not replace its columns with a redesigned grid. The browser renders field values and the on-screen customer signature on top. A blank template must first be selected; a filled work-row PDF is refused.

Source-of-truth: workbon supplies client, order number, date and work start/end. Saved `planning_opnames` supply the **number of recorded shots**, **not the number of consumed films**. Film format/count, inspector, overtime classifications, breaks, kilometres, inspected items, report number, office and manual corrections must be explicitly entered. The local travel log supplies outbound departure/confirmed arrival only; after travel remains an explicit field.

## Production work still needed
- Store the approved blank PDF securely in private, RLS-restricted company storage; do not publish the uploaded template.
- Persist travel and customer signature with owner/assigned researcher access, audit and retention; current travel is scoped to browser session.
- Send PDFs from an authenticated server function using a verified recipient / server-held mail provider keys; never from browser secrets. Add idempotency, error handling and delivery status.
- Confirm matching PDF coordinates via print comparison and have a service administrator approve columns/formulas; do not treat research calculations as RT release.
