#!/usr/bin/env python3
"""Serve Endo and Atto locally with the macOS Save As dialog."""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit
import webbrowser

ROOT = Path(__file__).resolve().parent
COLLECTION = Path.home() / 'Documents' / 'Basement Collection'
PORT = 9340
TOKEN = secrets.token_urlsafe(32)
ORIGINS = {'null', f'http://127.0.0.1:{PORT}', f'http://localhost:{PORT}'}
SAVE_LOCK = threading.Lock()


def choose_destination(name):
    script = '''on run argv
        tell application "System Events"
            activate
            try
                set destination to choose file name with prompt "Guardar exportación" default name (item 1 of argv)
                return POSIX path of destination
            on error number -128
                return ""
            end try
        end tell
    end run'''
    with SAVE_LOCK:
        result = subprocess.run(['/usr/bin/osascript', '-e', script, name],
                                capture_output=True, text=True, check=True)
    return Path(result.stdout.rstrip('\n')) if result.stdout.strip() else None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def origin_allowed(self):
        return self.headers.get('Origin') in ORIGINS or not self.headers.get('Origin')

    def end_headers(self):
        origin = self.headers.get('Origin')
        if origin in ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Private-Network', 'true')
        super().end_headers()

    def json_response(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if not self.origin_allowed():
            return self.json_response(403, {'error': 'Origin not allowed'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Basement-Token, X-Export-Name')
        self.end_headers()

    def do_GET(self):
        if urlsplit(self.path).path == '/api/collection':
            if not self.origin_allowed():
                return self.json_response(403, {'error': 'Origin not allowed'})
            return self.json_response(200, {'folder': str(COLLECTION), 'token': TOKEN})
        path = (ROOT / unquote(urlsplit(self.path).path).lstrip('/')).resolve()
        if path == ROOT:
            self.path = '/index.html'
            path = ROOT / 'index.html'
        if (ROOT not in path.parents or any(part.startswith('.') for part in path.relative_to(ROOT).parts)
                or path.suffix.lower() not in {'.html', '.css', '.js', '.otf', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico'}):
            return self.send_error(404)
        super().do_GET()

    def list_directory(self, path):
        self.send_error(404)

    def do_POST(self):
        if urlsplit(self.path).path != '/api/export':
            return self.json_response(404, {'error': 'Not found'})
        if not self.origin_allowed() or self.headers.get('X-Basement-Token') != TOKEN:
            return self.json_response(403, {'error': 'Export not authorized'})
        name = unquote(self.headers.get('X-Export-Name', ''))
        if (not name or len(name) > 220 or name.startswith('.') or '/' in name or '\\' in name
                or any(ord(c) < 32 for c in name) or Path(name).suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp', '.svg', '.zip', '.endo', '.json'}):
            return self.json_response(400, {'error': 'Nombre de exportación inválido.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if not 0 < length <= 512 * 1024 * 1024:
            return self.json_response(413, {'error': 'La exportación está vacía o excede 512 MB.'})
        temporary = None
        try:
            # Receive the rendered file before opening the native dialog.
            with tempfile.TemporaryFile() as payload:
                remaining = length
                while remaining:
                    chunk = self.rfile.read(min(remaining, 1024 * 1024))
                    if not chunk:
                        raise OSError('Incomplete export')
                    payload.write(chunk)
                    remaining -= len(chunk)
                candidate = choose_destination(name)
                if candidate is None:
                    return self.json_response(200, {'cancelled': True})
                with tempfile.NamedTemporaryFile(dir=candidate.parent, prefix='.export-', suffix='.part', delete=False) as output:
                    temporary = Path(output.name)
                    payload.seek(0)
                    while chunk := payload.read(1024 * 1024):
                        output.write(chunk)
                os.replace(temporary, candidate)
            self.json_response(201, {'name': candidate.name, 'folder': str(candidate.parent)})
        except (OSError, subprocess.CalledProcessError):
            self.json_response(500, {'error': 'No se pudo guardar la exportación. Revisá la ubicación y los permisos del diálogo del sistema.'})
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)

    def log_message(self, format, *args):
        print(format % args, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--open', action='store_true')
    args = parser.parse_args()
    try:
        server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    except OSError as error:
        print(f'Basement local server: {error}')
        raise SystemExit(1)
    if args.open:
        webbrowser.open(f'http://127.0.0.1:{PORT}/index.html')
    print(f'ENDO: http://127.0.0.1:{PORT}/index.html\nExports: macOS Save As dialog', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
