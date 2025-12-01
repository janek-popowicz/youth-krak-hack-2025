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
    except (FileNotFoundError, json.JSONDecodeError):
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


@app.route('/icons/<path:filename>')
def icons(filename):
    """Serve icons from static/icons for relative paths like /icons/.. used in templates."""
    return send_from_directory(os.path.join('static', 'icons'), filename)



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

    nazwa = payload.get('nazwa', '').strip()
    if not nazwa:
        return jsonify({'error': 'Pole "nazwa" jest wymagane'}), 400

    # przyjmujemy explicite czas_skupienia (minuty) od klienta
    raw_czas = payload.get('czas_skupienia', None)
    try:
        if raw_czas is None:
            czas = 25
        else:
            czas = int(raw_czas)
            if czas < 1:
                czas = 25
    except Exception:
        czas = 25

    subjects = load_json(SUBJECTS_FILE)
    przedmiot = klasy.Przedmiot(nazwa, czas, sessions_done=0)
    new_id = uuid.uuid4().hex
    subj_dict = przedmiot.to_dict(id=new_id)
    subjects.append(subj_dict)
    save_json(SUBJECTS_FILE, subjects)
    return jsonify(subj_dict), 201


# nowy endpoint: zgłoszenie ukończenia jednej sesji nauki dla przedmiotu
@app.route('/api/subjects/<id>/session_complete', methods=['POST'])
def subject_session_complete(id):
    subjects = load_json(SUBJECTS_FILE)
    subj = find_by_id(subjects, id)
    if subj is None:
        return jsonify({'error': 'Nie znaleziono przedmiotu'}), 404

    # bezpieczne parsowanie
    sessions = int(subj.get('sessions_done', 0)) + 1
    subj['sessions_done'] = sessions

    # po 3 sesjach zwiększamy czas_skupienia o 5 i resetujemy licznik
    if sessions >= 3:
        subj['czas_skupienia'] = int(subj.get('czas_skupienia', 25)) + 5
        subj['sessions_done'] = 0

    save_json(SUBJECTS_FILE, subjects)
    return jsonify(subj), 200


if __name__ == "__main__":
    ensure_data_files()
    app.run(debug=True)
