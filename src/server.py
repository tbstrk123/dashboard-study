from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import csv
import os
from datetime import datetime

OUTPUT_DIR = "study_results"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def flatten_row(meta, row):
    return {
        "participantId": meta.get("participantId", ""),
        "order": meta.get("order", ""),
        "submittedAt": meta.get("submittedAt", ""),
        **row,
    }

class Handler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_POST(self):
        if self.path != "/save":
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            data = json.loads(body.decode("utf-8"))
            rows = data.get("rows", [])
            participant_id = data.get("participantId", "unknown")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            filename = f"{participant_id}_{timestamp}.csv"
            filepath = os.path.join(OUTPUT_DIR, filename)

            flat_rows = [flatten_row(data, row) for row in rows]

            fieldnames = []
            for row in flat_rows:
                for key in row.keys():
                    if key not in fieldnames:
                        fieldnames.append(key)

            with open(filepath, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(flat_rows)

            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "ok", "file": filepath}).encode())

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())

if __name__ == "__main__":
    server = HTTPServer(("localhost", 5000), Handler)
    print("Server läuft auf http://localhost:5000")
    print("CSV-Dateien werden im Ordner study_results gespeichert.")
    server.serve_forever()