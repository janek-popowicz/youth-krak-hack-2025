from flask import Flask, render_template, send_from_directory

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/calendar")
def calendar():
    return render_template("calendar.html")

@app.route("/session")
def session():
    return render_template("session.html")

# Manifest i service worker muszą być serwowane z root lub /static
@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js')


if __name__ == "__main__":
    app.run(debug=True)
