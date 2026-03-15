"""
Kotoba-Lab Exporter
Exports a deck from Anki to your running Kotoba-Lab server via its REST API.

Install: copy this folder into your Anki add-ons directory
  (Tools > Add-ons > View Files)
then restart Anki.

Usage: Tools > Export deck to Kotoba-Lab…
"""

from __future__ import annotations

import html
import json
import re
import urllib.error
import urllib.request
from typing import Optional

from aqt import gui_hooks, mw
from aqt.qt import (
    QAction,
    QComboBox,
    QDialog,
    QDialogButtonBox,
    QLabel,
    QLineEdit,
    QVBoxLayout,
    QWidget,
)
from aqt.utils import showInfo, showWarning, tooltip


# ── helpers ──────────────────────────────────────────────────────────────────


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode entities (Anki stores fields as HTML)."""
    text = re.sub(r'<[^>]+>', '', text)
    return html.unescape(text).strip()


def _post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


# ── dialog ────────────────────────────────────────────────────────────────────


class ExportDialog(QDialog):
    def __init__(self, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Export to Kotoba-Lab")
        self.setMinimumWidth(420)

        layout = QVBoxLayout(self)

        layout.addWidget(QLabel("Server URL:"))
        self.url_input = QLineEdit()
        cfg = mw.addonManager.getConfig(__name__) or {}
        self.url_input.setText(cfg.get("server_url", "http://localhost:3000"))
        layout.addWidget(self.url_input)

        layout.addWidget(QLabel("Deck to export:"))
        self.deck_combo = QComboBox()
        for name in sorted(mw.col.decks.all_names()):
            self.deck_combo.addItem(name)
        layout.addWidget(self.deck_combo)

        btns = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        btns.accepted.connect(self.accept)
        btns.rejected.connect(self.reject)
        layout.addWidget(btns)

    def values(self) -> tuple[str, str]:
        return self.url_input.text().rstrip("/"), self.deck_combo.currentText()


# ── main action ───────────────────────────────────────────────────────────────


def export_deck() -> None:
    dlg = ExportDialog(mw)
    if dlg.exec() != QDialog.DialogCode.Accepted:
        return

    server_url, deck_name = dlg.values()

    # Persist server URL for next time
    cfg = mw.addonManager.getConfig(__name__) or {}
    cfg["server_url"] = server_url
    mw.addonManager.writeConfig(__name__, cfg)

    # Collect note data on the main thread (safe, fast)
    note_ids = mw.col.find_notes(f'deck:"{deck_name}"')
    if not note_ids:
        showWarning(f"No notes found in deck '{deck_name}'.")
        return

    NotePayload = dict  # {front, back, noteType, tags, extraFields}
    payloads: list[NotePayload] = []

    for nid in note_ids:
        note = mw.col.get_note(nid)
        note_type = note.note_type()
        field_names = [f["name"] for f in note_type["flds"]]
        extra_fields = {field_names[i]: note.fields[i] for i in range(len(note.fields))}

        # front/back are stripped-text versions of the first two fields
        front = _strip_html(note.fields[0]) if len(note.fields) > 0 else ""
        back = _strip_html(note.fields[1]) if len(note.fields) > 1 else ""
        if not front:
            continue

        payloads.append({
            "front": front,
            "back": back,
            "noteType": note_type["name"],
            "tags": list(note.tags),
            "extraFields": extra_fields,
        })

    if not payloads:
        showWarning("No valid notes found in that deck.")
        return

    tooltip(f"Exporting {len(payloads)} cards…")

    # HTTP work runs in background so the UI stays responsive
    def do_export() -> tuple[int, int]:
        deck_resp = _post_json(f"{server_url}/api/v1/decks", {"name": deck_name})
        deck_id = deck_resp["id"]

        imported = skipped = 0
        for payload in payloads:
            try:
                _post_json(f"{server_url}/api/v1/decks/{deck_id}/cards", payload)
                imported += 1
            except Exception:
                skipped += 1

        return imported, skipped

    def on_done(fut) -> None:  # type: ignore[type-arg]
        exc = fut.exception()
        if exc:
            showWarning(f"Export failed:\n{exc}")
            return
        imported, skipped = fut.result()
        showInfo(
            f"<b>Export complete!</b><br><br>"
            f"Deck: <b>{deck_name}</b><br>"
            f"Cards imported: <b>{imported}</b><br>"
            f"Cards skipped: <b>{skipped}</b>"
        )

    mw.taskman.run_in_background(do_export, on_done=on_done)


# ── register menu item ────────────────────────────────────────────────────────


def _add_menu_item() -> None:
    action = QAction("Export deck to Kotoba-Lab\u2026", mw)
    action.triggered.connect(export_deck)
    mw.form.menuTools.addAction(action)


gui_hooks.main_window_did_init.append(_add_menu_item)
