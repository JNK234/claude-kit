---
name: raising-invoices
description: Use when the user wants to create, raise, generate, or send an invoice or bill to a client/customer (including partial, deposit, milestone, or progress invoices) — gathers the required details, fills sensible defaults, computes totals, and produces a professional PDF (and optional editable copy).
---

# Raising Invoices

## Overview

Generate a professional, correct invoice document. An invoice has a known required-field
set and a few region-specific conditionals; the failure modes are missing fields, wrong
math, and asking the user 30 questions they don't need. This skill front-loads sensible
defaults, asks only for what's missing, computes every total, and renders a clean PDF.

**Core principle:** ask the few things only the user knows, default everything else, never
let the math be wrong, and surface (don't enforce) tax/region rules.

## When to Use

- "Raise an invoice", "create an invoice", "bill the client", "send an invoice"
- Partial / deposit / milestone / progress invoices for a larger project
- Re-invoicing a repeat client (reuse their saved profile)

Not for: organizing/filing *received* invoices, or accounting-system bookkeeping.

## Workflow

1. **Load saved profile.** Check `~/.claude/invoices/profile.json` (the user's sender
   details + defaults) and `~/.claude/invoices/clients.json`. If present, pre-fill and
   only confirm. If absent, gather sender details once and offer to save them.
2. **Determine invoice number.** Read `~/.claude/invoices/counter.json` for the last
   number and propose the next in sequence (default scheme `INV-{YYYY}-{NNNN}`, zero-padded,
   never reused). Let the user override.
3. **Ask only what's missing** (see Questions). Group the asks; don't drip one at a time.
   Apply the Defaults table so the user answers the minimum.
4. **Compute totals** in the generator script — never by hand. Subtotal = Σ line amounts;
   apply discount to pre-tax subtotal; tax on the discounted subtotal; total = discounted
   subtotal + tax + fees − amount already paid (deposit). Balance due is what's left.
5. **Confirm the summary** (who, what, totals, due date) before rendering.
6. **Render** with `generate_invoice.py` → PDF (+ optional `.docx` for editing). Save into
   the folder the user names (default `./invoices/`). Print the saved path(s).
7. **Persist:** bump the counter, save/refresh the sender profile and client record.

## Required Fields (MUST unless noted)

The word "Invoice" + unique invoice number · issue date · explicit calendar due date ·
seller name + address + contact (tax ID only if VAT/GST-registered or US EIN wanted) ·
client bill-to name + address (+ AP contact) · itemized line items (description, qty/hours,
rate, amount) · subtotal · tax line *with rate* when applicable · total amount due ·
currency · payment terms · payment method / remit details (SHOULD) · PO reference (SHOULD
for B2B). Optional: logo, discount line, late-fee policy, notes/thank-you.

## Defaults (so you ask less)

| Field | Default |
|-------|---------|
| Issue date | today |
| Currency | USD (ISO code) |
| Payment terms | Net 14 (freelancer); offer Net 30 for large corporate clients, "Due on receipt" for one-offs |
| Due date | computed = issue date + net term, **always rendered as an explicit calendar date** |
| Invoice number | next in sequence from counter.json (`INV-{YYYY}-{NNNN}`) |
| Tax | none (0) unless the user gives a rate; tax shown as a separate labeled line |
| Tax mode | exclusive (added on top) unless told inclusive |
| Quantity | 1 per line if not given |
| Notes | "Please pay by {due_date}. Thank you for your business." (editable) |

Hide optional sections (shipping, discount, PO, deposit, late fee) unless relevant.

## Questions to Ask (only the unknowns, grouped)

**Your (sender) details** — business/legal name; address; contact (email/phone); logo?;
tax/VAT/GST number or EIN to display? *(Skip all if profile saved.)*

**Client (bill-to)** — client business/legal name; billing address; AP/billing contact
email; PO or reference number if they require one.

**The work / line items** — for each: description; quantity or hours; unit price/rate.
Ask whether billing is hourly (date/hours/rate), fixed-fee, or milestone.

**Money & tax** — currency; apply sales tax/VAT/GST and at what rate + label?; tax
inclusive or exclusive?; any discount (% or flat)?; deposit/amount already paid to subtract?

**Payment terms & method** — terms (Net 7/14/30 / due on receipt); how to pay + remit
details (bank + account + routing for ACH/wire; IBAN/SWIFT for international; pay link for
card; mailing address for check); late fee or early-pay discount? *(optional)*

**Invoice meta** — invoice number (default next in sequence); issue date (default today);
due date (default computed); project/SOW/milestone reference if any.

**Notes** — any thank-you / terms / payment instructions.

## Partial / Milestone / Deposit Invoices

- State clearly that it's a **deposit / progress / milestone / final** invoice.
- Tie each line to a specific reviewable deliverable + its **% of the total contract value**
  (e.g. "Milestone 2: journey map delivered — 30% of project fee = $4,500"), not vague labels.
- Show **amount already paid** (deposit) and the resulting **balance due**; ideally note the
  **remaining balance / upcoming milestones** so the client sees it in full context.
- Use **shorter terms** (Net 7–14) for milestone invoices since the work was already accepted.
- Note any **retainage/holdback** (e.g. "10% retainage until final sign-off").

## Region / Tax Notes (surface, don't enforce — not tax advice)

- **US:** no federal invoice format; show sales tax as a separate line with rate; EIN optional.
- **UK/EU VAT:** when VAT-registered, the VAT number, sequential invoice number, supply date,
  and VAT rate + VAT amount per rate are legally required.
- **Australia:** label it "Tax invoice" and show the ABN.
- Always tell the user to confirm state/jurisdiction rules and late-fee usury caps with an
  accountant rather than relying on this skill.

## Implementation

Use `generate_invoice.py` (in this skill folder) — it takes a JSON invoice spec, does all
the math, and renders a PDF via Chrome headless (and optional `.docx`). Build the JSON from
the gathered answers, then run it. See `generate_invoice.py --help` and `invoice.schema.json`
for the exact fields. Never compute totals yourself; let the script do it so the printed
numbers always reconcile.

## Common Mistakes

- Computing totals by hand → use the script; it sums lines, applies discount-then-tax, and
  subtracts deposits.
- Showing only "Net 30" with no calendar date → always render the explicit due date.
- Reusing or guessing an invoice number → read/bump the counter.
- Asking the user everything → load the saved profile and apply defaults first.
- Vague line items ("consulting — $X") → specific, outcome-based descriptions.
- Hardcoding tax assumptions → ask; default to none; flag region rules.
