
from flask import Flask, jsonify, request
from datetime import datetime, timedelta, timezone
import sqlite3
from pathlib import Path

app = Flask(__name__)

DB_PATH = Path(__file__).with_name("standby.db")


def get_db():
    """Open a connection to our SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/api/offers")
def get_offers():
    conn = get_db()

    try:
        now = datetime.now(timezone.utc).isoformat()

        # Mark offers as expired once their deadline passes.
        conn.execute("""
            UPDATE slot_offers
            SET status = 'expired'
            WHERE status = 'available'
              AND expires_at <= ?
        """, (now,))

        conn.commit()

        offers = conn.execute("""
            SELECT id, booking_id, status, created_at,
                   expires_at, claimed_by
            FROM slot_offers
            WHERE status = 'available'
            ORDER BY created_at ASC
        """).fetchall()

        return jsonify([dict(offer) for offer in offers])

    finally:
        conn.close()

def init_db():
    """Create the bookings table if it doesn't exist."""
    conn = get_db()

    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_name TEXT NOT NULL,
                slot_name TEXT NOT NULL,
                start_time TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'confirmed',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS slot_offers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'available',
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                claimed_by TEXT,
                FOREIGN KEY (booking_id) REFERENCES bookings(id)
            )
        """)
        conn.commit()
    finally:
        conn.close()


@app.get("/")
def home():
    return jsonify({
        "app": "Standby",
        "message": "Backend is running!"
    })


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/bookings")
def list_bookings():
    """Return all bookings."""
    conn = get_db()

    try:
        rows = conn.execute("""
            SELECT id, user_name, slot_name, start_time,
                   status, created_at
            FROM bookings
            ORDER BY id DESC
        """).fetchall()

        return jsonify([dict(row) for row in rows])
    finally:
        conn.close()


@app.post("/api/bookings")
def create_booking():
    """Create a booking only if the slot is available."""
    data = request.get_json(silent=True) or {}

    user_name = data.get("user_name")
    slot_name = data.get("slot_name")
    start_time = data.get("start_time")

    if not all(
        isinstance(value, str) and value.strip()
        for value in (user_name, slot_name, start_time)
    ):
        return jsonify({
            "error": "user_name, slot_name and start_time are required."
        }), 400

    user_name = user_name.strip()
    slot_name = slot_name.strip()
    start_time = start_time.strip()

    conn = get_db()

    try:
        # Lock writes while checking and creating the booking.
        conn.execute("BEGIN IMMEDIATE")

        conflict = conn.execute("""
            SELECT id
            FROM bookings
            WHERE slot_name = ?
              AND start_time = ?
              AND status = 'confirmed'
            LIMIT 1
        """, (slot_name, start_time)).fetchone()

        if conflict is not None:
            conn.rollback()
            return jsonify({
                "error": "This slot is already booked.",
                "existing_booking_id": conflict["id"]
            }), 409

        cursor = conn.execute("""
            INSERT INTO bookings
                (user_name, slot_name, start_time, status)
            VALUES (?, ?, ?, 'confirmed')
        """, (user_name, slot_name, start_time))

        booking = conn.execute("""
            SELECT id, user_name, slot_name, start_time,
                   status, created_at
            FROM bookings
            WHERE id = ?
        """, (cursor.lastrowid,)).fetchone()

        conn.commit()
        return jsonify(dict(booking)), 201

    finally:
        conn.close()

@app.post("/api/bookings/<int:booking_id>/cancel")
def cancel_booking(booking_id):
    """Cancel a booking and create a 10-minute slot offer."""
    conn = get_db()

    try:
        booking = conn.execute("""
            SELECT id, status
            FROM bookings
            WHERE id = ?
        """, (booking_id,)).fetchone()

        if booking is None:
            return jsonify({"error": "Booking not found."}), 404

        if booking["status"] != "confirmed":
            return jsonify({
                "error": "This booking is not active."
            }), 409

        now = datetime.now(timezone.utc)
        expires = now + timedelta(minutes=10)

        conn.execute("""
            UPDATE bookings
            SET status = 'cancelled'
            WHERE id = ? AND status = 'confirmed'
        """, (booking_id,))

        conn.execute("""
            INSERT INTO slot_offers
                (booking_id, status, created_at, expires_at)
            VALUES (?, 'available', ?, ?)
        """, (
            booking_id,
            now.isoformat(),
            expires.isoformat()
        ))

        conn.commit()

        return jsonify({
            "message": "Booking cancelled; slot offer created.",
            "booking_id": booking_id,
            "status": "cancelled",
            "offer_expires_at": expires.isoformat()
        }), 200

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()



@app.post("/api/offers/<int:offer_id>/claim")
def claim_offer(offer_id):
    """Claim an available slot offer."""
    data = request.get_json(silent=True) or {}
    claimed_by = data.get("user_name")

    if not isinstance(claimed_by, str) or not claimed_by.strip():
        return jsonify({"error": "user_name is required."}), 400

    claimed_by = claimed_by.strip()
    conn = get_db()

    try:
        # Lock the database for this write transaction.
        conn.execute("BEGIN IMMEDIATE")

        offer = conn.execute("""
            SELECT id, booking_id, status, expires_at
            FROM slot_offers
            WHERE id = ?
        """, (offer_id,)).fetchone()

        if offer is None:
            conn.rollback()
            return jsonify({"error": "Offer not found."}), 404

        now = datetime.now(timezone.utc)
        expires_at = datetime.fromisoformat(offer["expires_at"])

        if expires_at <= now:
            conn.execute("""
                UPDATE slot_offers
                SET status = 'expired'
                WHERE id = ? AND status = 'available'
            """, (offer_id,))
            conn.commit()
            return jsonify({"error": "Offer has expired."}), 410

        if offer["status"] != "available":
            conn.rollback()
            return jsonify({
                "error": "Offer is no longer available."
            }), 409

        booking = conn.execute("""
            SELECT id, slot_name, start_time, status
            FROM bookings
            WHERE id = ?
        """, (offer["booking_id"],)).fetchone()

        if booking is None or booking["status"] != "cancelled":
            conn.rollback()
            return jsonify({
                "error": "The original booking is not available to claim."
            }), 409

        # Prevent another active booking for this exact slot and start time.
        conflict = conn.execute("""
            SELECT id
            FROM bookings
            WHERE slot_name = ?
            AND start_time = ?
            AND status = 'confirmed'
            LIMIT 1
        """, (booking["slot_name"], booking["start_time"])).fetchone()

        if conflict is not None:
            conn.rollback()
            return jsonify({
                "error": "This slot has already been booked."
            }), 409

        # Claim the offer and create the new confirmed booking.
        conn.execute("""
            UPDATE slot_offers
            SET status = 'claimed', claimed_by = ?
            WHERE id = ? AND status = 'available'
        """, (claimed_by, offer_id))

        cursor = conn.execute("""
            INSERT INTO bookings (user_name, slot_name, start_time, status)
            VALUES (?, ?, ?, 'confirmed')
        """, (claimed_by, booking["slot_name"], booking["start_time"]))

        conn.commit()

        return jsonify({
            "message": "Slot claimed successfully.",
            "offer_id": offer_id,
            "booking_id": cursor.lastrowid,
            "user_name": claimed_by,
            "slot_name": booking["slot_name"],
            "start_time": booking["start_time"],
            "status": "confirmed"
        }), 200

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

init_db()


if __name__ == "__main__":
    app.run(debug=True)
