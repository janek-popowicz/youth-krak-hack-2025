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
SUBJECTS_FILE = os.path.join(DATA_DIR, 'subjects.json')

def ensure_data_files():
    if not os.path.isdir(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    for path in (LEVELS_FILE, EVENTS_FILE, SUBJECTS_FILE):
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
# Subjects (Przedmioty)
# -----------------------
@app.route('/api/subjects', methods=['GET'])
def list_subjects():
    subjects = load_json(SUBJECTS_FILE)
    return jsonify(subjects)

@app.route('/api/subjects', methods=['POST'])
def create_subject():
    payload = request.get_json(force=True)
    if not payload or 'nazwa' not in payload:
        return jsonify({'error': 'Missing field: nazwa'}), 400
    subjects = load_json(SUBJECTS_FILE)
    level = payload.get('level', 0)
    przedmiot = klasy.Przedmiot(payload.get('nazwa'), level)
    new_id = uuid.uuid4().hex
    subj_dict = przedmiot.to_dict(id=new_id)
    subjects.append(subj_dict)
    save_json(SUBJECTS_FILE, subjects)
    return jsonify(subj_dict), 201


if __name__ == "__main__":
    ensure_data_files()
    app.run(debug=True)
