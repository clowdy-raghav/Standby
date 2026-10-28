
from flask import Flask, jsonify

app = Flask(__name__)


@app.get("/")
def home():
    return jsonify({
        "app": "Standby",
        "message": "Backend is running!"
    })


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True)
