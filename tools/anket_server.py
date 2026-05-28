#!/usr/bin/env python3
"""Yerel anket güncelleme sunucusu — statik site + /api/research."""

from __future__ import annotations

import json
import mimetypes
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "tools") not in sys.path:
    sys.path.insert(0, str(ROOT / "tools"))

from anket_research import run_research  # noqa: E402

PORT = 8765
_scan_lock = threading.Lock()


class AnketHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/api/health"):
            payload = json.dumps({"ok": True, "port": PORT}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        return super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/research":
            self.send_error(404, "Not found")
            return

        params = parse_qs(parsed.query)
        days = int((params.get("days") or ["30"])[0])

        if not _scan_lock.acquire(blocking=False):
            self._json(409, {"error": "Tarama zaten çalışıyor"})
            return

        try:
            result = run_research(days_back=days)
            self._json(200, result)
        except Exception as exc:  # noqa: BLE001
            self._json(500, {"error": str(exc)})
        finally:
            _scan_lock.release()

    def _json(self, status: int, data: dict) -> None:
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt: str, *args) -> None:
        if args and isinstance(args[0], str) and args[0].startswith("GET /api/"):
            return
        super().log_message(fmt, *args)


def main() -> None:
    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("text/css", ".css")
    mimetypes.add_type("application/json", ".json")
    server = ThreadingHTTPServer(("127.0.0.1", PORT), AnketHandler)
    print(f"Anket sunucusu: http://127.0.0.1:{PORT}/")
    print(f"Modül:          http://127.0.0.1:{PORT}/#/anket")
    print("Güncelleme API: POST /api/research?days=30")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDurduruldu.")


if __name__ == "__main__":
    main()
