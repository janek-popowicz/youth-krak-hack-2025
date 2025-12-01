from flask import Flask, render_template, send_from_directory, request, jsonify, abort
import klasy
import os
import json
import uuid
from datetime import datetime

app = Flask(__name__)

DATA_DIR = 'data'
LEVELS_FILE = os.path.join(DATA_DIR, 'levels.json')
EVENTS_FILE = os.path.join(DATA_DIR, 'events.json')

def ensure_data_files():
    if not os.path.isdir(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    for path in (LEVELS_FILE, EVENTS_FILE):
        if not os.path.exists(path):
            with open(path, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=2)

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def find_by_id(items, id_):
    for it in items:
        if it.get('id') == id_:
            return it
    return None

ensure_data_files()


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/calendar")
def calendar():
    return render_template("calendar.html")

@app.route("/session")
def session():
    return render_template("session.html")

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js')


# -----------------------
# Levels (fake persistent storage in JSON)
# -----------------------
@app.route('/api/levels', methods=['GET'])
def get_levels():
    levels = load_json(LEVELS_FILE)
    return jsonify(levels)

@app.route('/api/levels', methods=['POST'])
def create_level():
    payload = request.get_json(force=True)
    if not payload or 'name' not in payload:
        return jsonify({'error': 'Missing field: name'}), 400
    levels = load_json(LEVELS_FILE)
    new = {
        'id': uuid.uuid4().hex,
        'name': payload.get('name'),
        'xp': payload.get('xp', 0),
        'meta': payload.get('meta', {})
    }
    levels.append(new)
    save_json(LEVELS_FILE, levels)
    return jsonify(new), 201

@app.route('/api/levels/<level_id>', methods=['PUT'])
def update_level(level_id):
    payload = request.get_json(force=True)
    levels = load_json(LEVELS_FILE)
    item = find_by_id(levels, level_id)
    if not item:
        return jsonify({'error': 'Not found'}), 404
    # update allowed fields
    for k in ('name', 'xp', 'meta'):
        if k in payload:
            item[k] = payload[k]
    save_json(LEVELS_FILE, levels)
    return jsonify(item)

@app.route('/api/levels/<level_id>', methods=['DELETE'])
def delete_level(level_id):
    levels = load_json(LEVELS_FILE)
    item = find_by_id(levels, level_id)
    if not item:
        return jsonify({'error': 'Not found'}), 404
    levels = [l for l in levels if l.get('id') != level_id]
    save_json(LEVELS_FILE, levels)
    return '', 204


# -----------------------
# Calendar events
# -----------------------
@app.route('/api/events', methods=['GET'])
def list_events():
    events = load_json(EVENTS_FILE)
    # optional from/to filtering via query params (ISO date strings)
    from_q = request.args.get('from')
    to_q = request.args.get('to')
    if from_q or to_q:
        filtered = []
        for e in events:
            try:
                dt = datetime.fromisoformat(e.get('data'))
            except Exception:
                filtered.append(e)
                continue
            ok = True
            if from_q:
                try:
                    ok = ok and dt >= datetime.fromisoformat(from_q)
                except Exception:
                    pass
            if to_q:
                try:
                    ok = ok and dt <= datetime.fromisoformat(to_q)
                except Exception:
                    pass
            if ok:
                filtered.append(e)
        return jsonify(filtered)
    return jsonify(events)

@app.route('/api/events', methods=['POST'])
def add_event():
    payload = request.get_json(force=True)
    if not payload or 'nazwa' not in payload or 'data' not in payload:
        return jsonify({'error': 'Missing required fields: nazwa, data'}), 400
    # validate minimal date format
    try:
        _ = datetime.fromisoformat(payload['data'])
    except Exception:
        return jsonify({'error': 'data must be ISO format, e.g. 2025-12-01T15:00:00'}), 400
    events = load_json(EVENTS_FILE)
    new_id = uuid.uuid4().hex
    wydarzenie = klasy.WydarzenieKalendarzowe(payload.get('nazwa'), payload.get('data'), payload.get('lokalizacja', ''))
    events.append(wydarzenie.to_dict(id=new_id))
    save_json(EVENTS_FILE, events)
    return jsonify({'id': new_id, **wydarzenie.to_dict()}), 201

@app.route('/api/events/<event_id>', methods=['GET'])
def get_event(event_id):
    events = load_json(EVENTS_FILE)
    item = find_by_id(events, event_id)
    if not item:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(item)

@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    events = load_json(EVENTS_FILE)
    item = find_by_id(events, event_id)
    if not item:
        return jsonify({'error': 'Not found'}), 404
    events = [e for e in events if e.get('id') != event_id]
    save_json(EVENTS_FILE, events)
    return '', 204


if __name__ == "__main__":
    ensure_data_files()
    app.run(debug=True)
