#!/usr/bin/env python3
# ABOUTME: renders a professional invoice PDF (and optional .docx) from a JSON spec.
# ABOUTME: does all money math itself so totals always reconcile. Usage: generate_invoice.py spec.json [--docx]
"""
Generate a professional invoice from a JSON spec.

Usage:
    python3 generate_invoice.py <spec.json> [--out DIR] [--docx]

The spec computes its own totals — do NOT pre-compute subtotal/tax/total in the JSON;
provide line items, optional discount/tax/fees/amount_paid, and this script calculates
subtotal, discount, tax, total, and balance due.

Minimal spec:
{
  "invoice_number": "INV-2026-0001",
  "issue_date": "2026-06-02",
  "due_date": "2026-06-16",
  "payment_terms": "Net 14",
  "currency": "USD",
  "seller": {"name": "...", "address": "...", "contact": "...", "tax_id": "", "logo": ""},
  "client": {"name": "...", "address": "...", "contact": "", "po_number": ""},
  "title_note": "",                      // e.g. "Partial invoice — Milestone 1 of 3"
  "line_items": [
    {"description": "...", "qty": 1, "rate": 1500.00}
  ],
  "discount": {"label": "Early-pay discount", "type": "flat|percent", "value": 0},
  "tax": {"label": "Sales tax", "rate_pct": 0, "inclusive": false},
  "fees": [{"label": "Shipping", "amount": 0}],
  "amount_paid": 0,                      // deposit already paid
  "payment_instructions": "Bank: ...\\nAccount: ...\\nRouting: ...",
  "notes": "Please pay by {due_date}. Thank you for your business.",
  "late_fee": ""
}
"""
import json, sys, subprocess, html
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def money(x, cur):
    return f"{cur} {x:,.2f}"


def compute(spec):
    """All money math lives here so the rendered numbers always reconcile."""
    items = []
    subtotal = 0.0
    for li in spec.get("line_items", []):
        qty = float(li.get("qty", 1))
        rate = float(li.get("rate", 0))
        amount = round(qty * rate, 2)
        subtotal += amount
        items.append({**li, "qty": qty, "rate": rate, "amount": amount})
    subtotal = round(subtotal, 2)

    disc = spec.get("discount") or {}
    disc_val = float(disc.get("value", 0) or 0)
    if disc.get("type") == "percent":
        discount_amount = round(subtotal * disc_val / 100.0, 2)
    else:
        discount_amount = round(disc_val, 2)
    discounted = round(subtotal - discount_amount, 2)

    tax = spec.get("tax") or {}
    rate_pct = float(tax.get("rate_pct", 0) or 0)
    if tax.get("inclusive"):
        # tax already inside line prices; back it out for display
        tax_amount = round(discounted - discounted / (1 + rate_pct / 100.0), 2) if rate_pct else 0.0
        taxed = discounted
    else:
        tax_amount = round(discounted * rate_pct / 100.0, 2)
        taxed = round(discounted + tax_amount, 2)

    fees = [{"label": f.get("label", "Fee"), "amount": round(float(f.get("amount", 0)), 2)}
            for f in (spec.get("fees") or [])]
    fees_total = round(sum(f["amount"] for f in fees), 2)

    total = round(taxed + fees_total, 2)
    amount_paid = round(float(spec.get("amount_paid", 0) or 0), 2)
    balance_due = round(total - amount_paid, 2)

    return {
        "items": items, "subtotal": subtotal,
        "discount_amount": discount_amount, "discounted": discounted,
        "tax_amount": tax_amount, "rate_pct": rate_pct, "tax_inclusive": bool(tax.get("inclusive")),
        "fees": fees, "fees_total": fees_total,
        "total": total, "amount_paid": amount_paid, "balance_due": balance_due,
    }


def esc(s):
    return html.escape(str(s if s is not None else ""))


def render_html(spec, c):
    cur = spec.get("currency", "USD")
    s = spec.get("seller", {})
    cl = spec.get("client", {})
    due = spec.get("due_date", "")
    notes = (spec.get("notes") or "").replace("{due_date}", due)

    logo = ""
    if s.get("logo") and Path(s["logo"]).exists():
        import base64
        b = base64.b64encode(Path(s["logo"]).read_bytes()).decode()
        logo = f'<img class="logo" src="data:image/png;base64,{b}">'

    rows = ""
    for it in c["items"]:
        rows += (f"<tr><td>{esc(it['description'])}</td>"
                 f"<td class='n'>{it['qty']:g}</td>"
                 f"<td class='n'>{money(it['rate'], cur)}</td>"
                 f"<td class='n'>{money(it['amount'], cur)}</td></tr>")

    # Totals as a separate right-aligned block below the table (not table rows).
    def srow(label, val, cls=""):
        return (f"<div class='srow {cls}'><span class='sl'>{esc(label)}</span>"
                f"<span class='sv'>{val}</span></div>")

    summary = srow("Subtotal", money(c["subtotal"], cur))
    if c["discount_amount"]:
        lbl = (spec.get("discount") or {}).get("label", "Discount")
        summary += srow(lbl, "− " + money(c["discount_amount"], cur))
    if c["rate_pct"]:
        tl = (spec.get("tax") or {}).get("label", "Tax")
        suffix = " (incl.)" if c["tax_inclusive"] else ""
        summary += srow(f"{tl} ({c['rate_pct']:g}%){suffix}", money(c["tax_amount"], cur))
    for f in c["fees"]:
        if f["amount"]:
            summary += srow(f["label"], money(f["amount"], cur))
    summary += srow("Total", money(c["total"], cur), cls="total")
    if c["amount_paid"]:
        summary += srow("Amount paid / deposit", "− " + money(c["amount_paid"], cur))
    summary += srow("Balance due", money(c["balance_due"], cur), cls="due")

    title_note = f"<div class='titlenote'>{esc(spec.get('title_note'))}</div>" if spec.get("title_note") else ""
    po = f"<div><span class='k'>PO / Ref</span> {esc(cl.get('po_number'))}</div>" if cl.get("po_number") else ""
    taxid = f"<div>{esc(s.get('tax_id'))}</div>" if s.get("tax_id") else ""
    # Suppress empty fields so blocks don't show blank lines.
    s_addr = f"<div class='pre'>{esc(s.get('address'))}</div>" if s.get("address") else ""
    s_contact = f"<div>{esc(s.get('contact'))}</div>" if s.get("contact") else ""
    cl_addr = f"<div class='pre'>{esc(cl.get('address'))}</div>" if cl.get("address") else ""
    cl_contact = f"<div>{esc(cl.get('contact'))}</div>" if cl.get("contact") else ""
    pay = (f"<hr><div class='sec'><h3>Payment</h3><div class='pre'>{esc(spec.get('payment_instructions'))}</div></div>"
           if spec.get("payment_instructions") else "")
    latefee = f"<div class='muted'>Late fee: {esc(spec.get('late_fee'))}</div>" if spec.get("late_fee") else ""
    notes_html = f"<div class='notes'>{esc(notes)}</div>" if notes else ""

    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
  @page {{ size: A4; margin: 18mm 18mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif; color:#1a1a1a; font-size:12px; line-height:1.55; margin:0; }}
  .top {{ display:flex; justify-content:space-between; align-items:flex-start; }}
  .logo {{ max-height:56px; margin-bottom:10px; }}
  h1 {{ font-size:24px; font-weight:700; letter-spacing:1px; margin:0; color:#1a1a1a; text-transform:uppercase; }}
  .titlenote {{ color:#555; margin-top:5px; font-size:12px; }}
  .meta {{ text-align:right; font-size:11px; color:#1a1a1a; }}
  .meta b {{ color:#555; font-weight:600; }}
  .parties {{ display:flex; gap:48px; margin:30px 0 26px; }}
  .parties .blk {{ flex:1; font-size:12px; }}
  .parties h3, .sec h3 {{ font-size:10.5px; text-transform:uppercase; letter-spacing:.6px; color:#888; margin:0 0 5px; }}
  .k {{ color:#888; }}
  table {{ width:100%; border-collapse:collapse; }}
  th {{ background:#14506e; color:#fff; text-align:left; padding:9px 11px; font-size:11px; font-weight:600; }}
  th.n, td.n {{ text-align:right; }}
  td {{ padding:9px 11px; border-bottom:1px solid #ececec; }}
  /* totals summary block — right aligned, separated from the table */
  .summary {{ width:48%; margin:14px 0 0 auto; }}
  .srow {{ display:flex; justify-content:space-between; padding:5px 0; color:#555; }}
  .srow .sv {{ font-variant-numeric:tabular-nums; }}
  .srow.total {{ color:#1a1a1a; font-weight:700; border-top:1px solid #ccc; padding-top:8px; margin-top:2px; }}
  .srow.due {{ color:#1a1a1a; font-weight:700; font-size:14px; border-top:2px solid #1a1a1a; padding-top:9px; margin-top:2px; }}
  hr {{ border:none; border-top:1px solid #ececec; margin:28px 0 0; }}
  .sec {{ margin-top:20px; }}
  .pre {{ white-space:pre-wrap; }}
  .notes {{ margin-top:24px; font-size:11px; color:#444; }}
  .muted {{ color:#888; font-size:10px; margin-top:14px; }}
</style></head><body>
  <div class="top">
    <div>{logo}<h1>Invoice</h1>{title_note}</div>
    <div class="meta">
      <div><b>Invoice #</b> {esc(spec.get('invoice_number'))}</div>
      <div><b>Issue date</b> {esc(spec.get('issue_date'))}</div>
      <div><b>Due date</b> {esc(spec.get('due_date'))}</div>
      <div><b>Terms</b> {esc(spec.get('payment_terms'))}</div>
      {po}
    </div>
  </div>

  <div class="parties">
    <div class="blk"><h3>From</h3><b>{esc(s.get('name'))}</b>{s_addr}{s_contact}{taxid}</div>
    <div class="blk"><h3>Bill to</h3><b>{esc(cl.get('name'))}</b>{cl_addr}{cl_contact}</div>
  </div>

  <table>
    <thead><tr><th>Description</th><th class="n">Qty / Hrs</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>

  <div class="summary">{summary}</div>

  {pay}
  {notes_html}
  {latefee}
</body></html>"""


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__); return
    spec_path = Path(args[0])
    out_dir = Path(".")
    want_docx = "--docx" in args
    if "--out" in args:
        out_dir = Path(args[args.index("--out") + 1])
    out_dir.mkdir(parents=True, exist_ok=True)

    spec = json.loads(spec_path.read_text())
    c = compute(spec)
    html_doc = render_html(spec, c)

    num = spec.get("invoice_number", "invoice").replace("/", "-")
    html_path = out_dir / f"{num}.html"
    pdf_path = out_dir / f"{num}.pdf"
    html_path.write_text(html_doc)

    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={pdf_path}", f"file://{html_path.resolve()}"],
                   check=False, capture_output=True)
    print(f"PDF: {pdf_path}")
    print(f"Totals — subtotal {c['subtotal']:.2f}, tax {c['tax_amount']:.2f}, "
          f"total {c['total']:.2f}, balance due {c['balance_due']:.2f} {spec.get('currency','USD')}")

    if want_docx:
        try:
            from docx import Document
            from docx.shared import Pt
            d = Document()
            d.add_heading(f"Invoice {spec.get('invoice_number','')}", 0)
            if spec.get("title_note"):
                d.add_paragraph(spec["title_note"])
            d.add_paragraph(f"Issue date: {spec.get('issue_date')}   Due: {spec.get('due_date')}   Terms: {spec.get('payment_terms')}")
            s, cl = spec.get("seller", {}), spec.get("client", {})
            d.add_paragraph(f"From: {s.get('name')} — {s.get('address')} — {s.get('contact')}")
            d.add_paragraph(f"Bill to: {cl.get('name')} — {cl.get('address')}")
            t = d.add_table(rows=1, cols=4); t.style = "Light Grid Accent 1"
            hdr = t.rows[0].cells
            hdr[0].text, hdr[1].text, hdr[2].text, hdr[3].text = "Description", "Qty/Hrs", "Rate", "Amount"
            cur = spec.get("currency", "USD")
            for it in c["items"]:
                r = t.add_row().cells
                r[0].text = str(it["description"]); r[1].text = f"{it['qty']:g}"
                r[2].text = money(it["rate"], cur); r[3].text = money(it["amount"], cur)
            d.add_paragraph(f"Subtotal: {money(c['subtotal'], cur)}")
            if c["discount_amount"]: d.add_paragraph(f"Discount: -{money(c['discount_amount'], cur)}")
            if c["rate_pct"]: d.add_paragraph(f"Tax ({c['rate_pct']:g}%): {money(c['tax_amount'], cur)}")
            d.add_paragraph(f"Total: {money(c['total'], cur)}")
            if c["amount_paid"]: d.add_paragraph(f"Amount paid: -{money(c['amount_paid'], cur)}")
            p = d.add_paragraph(); run = p.add_run(f"Balance due: {money(c['balance_due'], cur)}"); run.bold = True; run.font.size = Pt(13)
            if spec.get("payment_instructions"): d.add_paragraph("Payment:\n" + spec["payment_instructions"])
            notes = (spec.get("notes") or "").replace("{due_date}", spec.get("due_date", ""))
            if notes: d.add_paragraph(notes)
            docx_path = out_dir / f"{num}.docx"
            d.save(str(docx_path)); print(f"DOCX: {docx_path}")
        except ImportError:
            print("(.docx skipped — python-docx not installed)")


if __name__ == "__main__":
    main()
