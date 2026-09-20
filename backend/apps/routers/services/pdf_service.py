import logging
from typing import Any, Dict
from apps.routers.models import Router

logger = logging.getLogger(__name__)


def generate_sales_report_pdf(router: Router, report_data: Dict[str, Any]) -> bytes:
    """Génère un rapport financier PDF vectoriel haute fidélité via Chromium (Playwright)."""
    import datetime

    today_str = datetime.date.today().strftime("%d/%m/%Y")
    now_time = datetime.datetime.now().strftime("%H:%M:%S")

    today_rev = report_data.get("today_revenue", 0)
    month_rev = report_data.get("month_revenue", 0)
    today_count = report_data.get("today_count", 0)
    active_sessions = report_data.get("active_sessions", 0)
    total_users = report_data.get("total_users", 0)
    sales = report_data.get("sales_history", [])

    rows_html = ""
    for idx, s in enumerate(sales[:60], 1):
        code = s.get("code", "-")
        prof = s.get("profile", "default")
        price = s.get("price", 100)
        batch = s.get("batch_id", "Direct")
        date_val = s.get("date", today_str)
        consumed = "Consommé" if s.get("consumed") else "Non actif"
        status_color = "#059669" if s.get("consumed") else "#64748b"

        rows_html += f"""
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 10px; font-size: 11px; color: #64748b;">{idx}</td>
            <td style="padding: 6px 10px; font-family: monospace; font-weight: bold; font-size: 12px; color: #0f172a;">{code}</td>
            <td style="padding: 6px 10px; font-size: 11px; color: #334155;">{prof}</td>
            <td style="padding: 6px 10px; font-size: 11px; color: #64748b;">{batch}</td>
            <td style="padding: 6px 10px; font-size: 11px; color: #64748b;">{date_val}</td>
            <td style="padding: 6px 10px; font-size: 11px; font-weight: bold; color: {status_color};">{consumed}</td>
            <td style="padding: 6px 10px; text-align: right; font-weight: bold; font-size: 12px; color: #2563eb;">{price:,} F</td>
        </tr>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport Financier - {router.name}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 24px; background: #ffffff; }}
  .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }}
  .brand {{ font-size: 20px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }}
  .subtitle {{ font-size: 11px; color: #64748b; margin-top: 2px; }}
  .meta {{ text-align: right; font-size: 11px; color: #64748b; }}
  .kpi-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }}
  .kpi-card {{ border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; }}
  .kpi-title {{ font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b; }}
  .kpi-value {{ font-size: 18px; font-weight: 900; margin-top: 4px; }}
  .table-title {{ font-size: 13px; font-weight: 800; margin-bottom: 10px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }}
  table {{ width: 100%; border-collapse: collapse; text-align: left; }}
  th {{ background: #f1f5f9; padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }}
  .footer {{ margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }}
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">⚡ TikZone Hotspot — Bilan Financier</div>
      <div class="subtitle">Espace : <strong>{router.name}</strong> • Hotspot : <strong>{router.hotspot_name or router.name}</strong></div>
    </div>
    <div class="meta">
      <div>Généré le : <strong>{today_str} à {now_time}</strong></div>
      <div>Tunnel WireGuard : <strong>{router.vpn.assigned_ip if hasattr(router, 'vpn') and router.vpn else 'Connecté'}</strong></div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">Recettes Aujourd'hui</div>
      <div class="kpi-value" style="color: #059669;">{today_rev:,} FCFA</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">{today_count} ticket(s) actif(s)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Recettes du Mois</div>
      <div class="kpi-value" style="color: #2563eb;">{month_rev:,} FCFA</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Ventes cumulées</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Sessions Actives</div>
      <div class="kpi-value" style="color: #d97706;">{active_sessions}</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">En direct sur MikroTik</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Parc Total Tickets</div>
      <div class="kpi-value" style="color: #475569;">{total_users:,}</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Utilisateurs créés</div>
    </div>
  </div>

  <div class="table-title">Journal Récent des Ventes & Encaissements</div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Code Ticket</th>
        <th>Forfait</th>
        <th>Lot / Réf</th>
        <th>Date</th>
        <th>Statut</th>
        <th style="text-align: right;">Montant</th>
      </tr>
    </thead>
    <tbody>
      {rows_html}
    </tbody>
  </table>

  <div class="footer">
    Document certifié par TikZone Engine v2.0 • Serveur Hotspot MikroTik RouterOS 7 • Tous droits réservés
  </div>
</body>
</html>
"""

    # Rendu PDF vectoriel avec Chromium via Playwright
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"])
            page = browser.new_page()
            page.set_content(html_content, wait_until="load")
            pdf_bytes = page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "8mm", "bottom": "8mm", "left": "8mm", "right": "8mm"},
            )
            browser.close()
            return pdf_bytes
    except Exception as e:
        logger.warning(f"Chromium Playwright non disponible ou erreur ({e}). Fallback HTML vers bytes.")
        # Fallback de sécurité : renvoie le contenu HTML encodé
        return html_content.encode("utf-8")
