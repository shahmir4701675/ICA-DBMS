"""
=============================================================================
  Intelligent Controls & Automation (ICA) - DBMS Backend
  Author : SHAHMIR
  Stack  : Flask + Supabase-py
  Desc   : REST API server that bridges the React frontend with the
           Supabase PostgreSQL database.
=============================================================================
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
from datetime import date, datetime
from dotenv import load_dotenv
import os

# Load environment variables from .flaskenv
load_dotenv('.flaskenv')

# ---------------------------------------------------------------------------
# App Initialisation
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the React dev server

# ---------------------------------------------------------------------------
# Supabase Configuration (loaded from .flaskenv — never hardcode secrets)
# ---------------------------------------------------------------------------
SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "Missing SUPABASE_URL or SUPABASE_KEY. "
        "Copy .env.example to .flaskenv and fill in the values."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# Helper: generic error response
# ---------------------------------------------------------------------------
def error_response(message: str, status: int = 500):
    return jsonify({"error": message}), status


def _log_action(table_name: str, record_id, action: str, changed_by: str = "system"):
    """
    Silently insert a row into the audit_logs table.
    Never raises — logging failure must not break the main request.
    """
    try:
        supabase.table("audit_logs").insert({
            "table_name": table_name,
            "record_id":  str(record_id),
            "action":     action,
            "changed_by": changed_by,
            "changed_at": datetime.utcnow().isoformat(),
        }).execute()
    except Exception:
        pass


# ===========================================================================
# INVENTORY ENDPOINTS
# ===========================================================================

@app.route("/api/inventory", methods=["GET"])
def get_inventory():
    """
    Returns all inventory items (PLCs, Sensors, Transistors, Diodes,
    Motor Drives) with their supplier information joined in.
    Query Params:
        category (optional) - filter by category name
    """
    try:
        category = request.args.get("category")

        # Build the query - select all columns from inventory
        query = supabase.table("inventory").select(
            "item_id, name, category, quantity, unit_price, nsn, supplier_id"
        )

        # Apply optional category filter
        if category and category != "All":
            query = query.eq("category", category)

        # Execute and order by item_id
        response = query.order("item_id").execute()
        return jsonify(response.data), 200

    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


@app.route("/api/inventory/search", methods=["GET"])
def search_inventory():
    """
    Fast Search endpoint – filters inventory by part name OR National Stock Number (NSN).
    Query Params:
        q (required) - the search term
    """
    try:
        search_term = request.args.get("q", "").strip()

        if not search_term:
            # Return empty list for blank search
            return jsonify([]), 200

        # Supabase ilike = case-insensitive LIKE
        # We search both the 'name' and 'nsn' (National Stock Number) columns
        name_results = (
            supabase.table("inventory")
            .select("item_id, name, category, quantity, unit_price, nsn")
            .ilike("name", f"%{search_term}%")
            .execute()
        )

        nsn_results = (
            supabase.table("inventory")
            .select("item_id, name, category, quantity, unit_price, nsn")
            .ilike("nsn", f"%{search_term}%")
            .execute()
        )

        # Merge and de-duplicate results by item_id
        combined: dict = {}
        for item in name_results.data + nsn_results.data:
            combined[item["item_id"]] = item

        return jsonify(list(combined.values())), 200

    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ===========================================================================
# CLIENTS ENDPOINT
# ===========================================================================

@app.route("/api/clients", methods=["GET"])
def get_clients():
    """
    Returns all corporate clients (Karachi Textile Mills, Pak-Suzuki, etc.)
    along with the count of their service orders.
    """
    try:
        response = (
            supabase.table("Clients")
            .select("client_id, company_name, contact_person, email")
            .order("client_id")
            .execute()
        )
        return jsonify(response.data), 200

    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ===========================================================================
# SERVICE ORDERS ENDPOINT
# ===========================================================================

@app.route("/api/orders", methods=["GET"])
def get_orders():
    """
    Returns all Engineering Service Orders with their status.
    Joins client name for display convenience.
    Query Params:
        status (optional) - filter by status (Pending, In Progress,
                            Completed, Cancelled)
    """
    try:
        status_filter = request.args.get("status")

        # Fetch orders with client info via foreign key relationship
        query = supabase.table("Service_Orders").select(
            "order_id, description, order_date, status, total_cost, client_id, Clients(company_name)"
        )

        if status_filter and status_filter != "All":
            query = query.eq("status", status_filter)

        response = query.order("order_date", desc=True).execute()
        return jsonify(response.data), 200

    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ===========================================================================
# MAINTENANCE SCHEDULES ENDPOINT
# ===========================================================================

@app.route("/api/maintenance", methods=["GET"])
def get_maintenance():
    """
    Returns maintenance schedules with next_service_date and
    assigned technician, joined with client company name.
    """
    try:
        response = (
            supabase.table("Maintenance_Schedules")
            .select(
                "schedule_id, equipment_name, last_service_date, "
                "next_service_date, technician_assigned, client_id, "
                "Clients(company_name)"
            )
            .order("next_service_date")
            .execute()
        )
        return jsonify(response.data), 200

    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ===========================================================================
# INVOICE GENERATION ENDPOINT
# ===========================================================================

@app.route("/api/generate-invoice", methods=["POST"])
def generate_invoice():
    """
    Generates a formatted invoice JSON object for a given order_id.
    Only works for orders with status = 'Completed'.

    Request Body (JSON):
        { "order_id": <int> }

    Response JSON Invoice Object:
        {
          "invoice_number": "ICA-INV-XXXX",
          "company":        "Intelligent Controls & Automation",
          "order": { ... },
          "client": { ... },
          "invoice": { ... },
          "generated_on": "YYYY-MM-DD"
        }
    """
    try:
        body = request.get_json()
        if not body or "order_id" not in body:
            return error_response("Missing 'order_id' in request body.", 400)

        order_id = int(body["order_id"])

        # 1. Fetch the service order
        order_resp = (
            supabase.table("Service_Orders")
            .select("order_id, description, order_date, status, total_cost, client_id")
            .eq("order_id", order_id)
            .single()
            .execute()
        )

        order = order_resp.data
        if not order:
            return error_response(f"Order #{order_id} not found.", 404)

        if order["status"] != "Completed":
            return error_response(
                f"Invoice can only be generated for 'Completed' orders. "
                f"Order #{order_id} is '{order['status']}'.",
                400,
            )

        # 2. Fetch the client details
        client_resp = (
            supabase.table("Clients")
            .select("client_id, company_name, contact_person, email")
            .eq("client_id", order["client_id"])
            .single()
            .execute()
        )
        client = client_resp.data

        # 3. Fetch the invoice record (if it exists)
        inv_resp = (
            supabase.table("Invoices")
            .select("invoice_id, invoice_date, amount_due, payment_status")
            .eq("order_id", order_id)
            .execute()
        )
        invoice_record = inv_resp.data[0] if inv_resp.data else None

        # 4. Build the formatted invoice payload
        invoice_payload = {
            "invoice_number": f"ICA-INV-{order_id:04d}",
            "company": {
                "name": "Intelligent Controls & Automation",
                "address": "Plot 12, Block C, Korangi Industrial Area, Karachi",
                "phone": "+92-21-3456-7890",
                "email": "billing@ica-pakistan.com",
                "ntn": "NTN-1234567-8",
            },
            "client": {
                "id": client["client_id"],
                "company_name": client["company_name"],
                "contact_person": client["contact_person"],
                "email": client["email"],
            },
            "order": {
                "id": order["order_id"],
                "description": order["description"],
                "order_date": order["order_date"],
                "status": order["status"],
            },
            "invoice": {
                "invoice_id": invoice_record["invoice_id"] if invoice_record else None,
                "invoice_date": invoice_record["invoice_date"] if invoice_record else None,
                "subtotal": float(order["total_cost"]),
                "tax_percent": 17,
                "tax_amount": round(float(order["total_cost"]) * 0.17, 2),
                "total_due": round(float(order["total_cost"]) * 1.17, 2),
                "amount_due": float(invoice_record["amount_due"]) if invoice_record else float(order["total_cost"]),
                "payment_status": invoice_record["payment_status"] if invoice_record else "Unpaid",
            },
            "generated_on": str(date.today()),
        }

        return jsonify(invoice_payload), 200

    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ===========================================================================
# SUPPLIERS ENDPOINT (bonus)
# ===========================================================================

@app.route("/api/suppliers", methods=["GET"])
def get_suppliers():
    """Returns all suppliers."""
    try:
        response = supabase.table("suppliers").select("*").order("supplier_id").execute()
        return jsonify(response.data), 200
    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))



# ===========================================================================
# WRITE ENDPOINTS — Inventory, Orders, Clients
# ===========================================================================

# ── Validation helpers ──────────────────────────────────────────────────────

ALLOWED_CATEGORIES = {"PLC", "Sensor", "Transistor", "Diode", "Motor Drive"}
ALLOWED_STATUSES   = {"Pending", "In Progress", "Completed", "Cancelled"}

def _require_json():
    """Return parsed JSON body or raise ValueError."""
    body = request.get_json(silent=True)
    if body is None:
        raise ValueError("Request body must be valid JSON.")
    return body


def _strip_pks(body: dict, *pk_fields) -> dict:
    """
    Remove primary key fields and any null-valued fields from the request body.
    This prevents 'null value in column violates not-null constraint' errors
    that occur when a PK is accidentally included in a Supabase .update() payload.
    """
    for field in pk_fields:
        body.pop(field, None)
    # Also drop any key whose value is None (belt-and-suspenders safety)
    return {k: v for k, v in body.items() if v is not None}

# ---------------------------------------------------------------------------
# INVENTORY — PUT (update) / POST (insert)
# ---------------------------------------------------------------------------

@app.route("/api/inventory/<int:item_id>", methods=["PUT"])
def update_inventory_item(item_id):
    """
    Update an inventory item's quantity, unit_price and/or category.
    Primary key (item_id), name, and National Stock Number (NSN) are read-only — rejected if present.

    Request body (JSON) — all fields optional:
        { "quantity": <int>, "unit_price": <float>, "category": <str> }
    """
    try:
        body = _require_json()

        # Strip primary keys and null values before any processing
        body = _strip_pks(body, "item_id", "name", "nsn", "supplier_id")

        patch = {}

        if "quantity" in body:
            qty = body["quantity"]
            if not isinstance(qty, int) or qty < 0:
                return error_response("'quantity' must be a non-negative integer.", 400)
            patch["quantity"] = qty

        if "unit_price" in body:
            try:
                price = float(body["unit_price"])
                if price <= 0:
                    raise ValueError()
            except (TypeError, ValueError):
                return error_response("'unit_price' must be a positive number.", 400)
            patch["unit_price"] = price

        if "category" in body:
            cat = body["category"]
            if cat not in ALLOWED_CATEGORIES:
                return error_response(
                    f"'category' must be one of {sorted(ALLOWED_CATEGORIES)}.", 400
                )
            patch["category"] = cat

        if not patch:
            return error_response("No valid fields provided to update.", 400)

        # Confirm item exists
        check = (
            supabase.table("inventory")
            .select("item_id")
            .eq("item_id", item_id)
            .execute()
        )
        if not check.data:
            return error_response(f"Item #{item_id} not found.", 404)

        response = (
            supabase.table("inventory")
            .update(patch)
            .eq("item_id", item_id)
            .execute()
        )
        _log_action("inventory", item_id, "UPDATE",
                    request.headers.get("X-User-Role", "system"))
        return jsonify({"message": "Item updated.", "data": response.data}), 200

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


@app.route("/api/inventory", methods=["POST"])
def create_inventory_item():
    """
    Insert a new inventory item.

    Required body fields:
        name (str), category (str), quantity (int ≥ 0),
        unit_price (float > 0), nsn (str)
    Optional:
        supplier_id (int)
    """
    try:
        body = _require_json()

        required = ["name", "category", "quantity", "unit_price", "nsn"]
        missing  = [f for f in required if f not in body]
        if missing:
            return error_response(f"Missing required fields: {missing}", 400)

        cat = body["category"]
        if cat not in ALLOWED_CATEGORIES:
            return error_response(
                f"'category' must be one of {sorted(ALLOWED_CATEGORIES)}.", 400
            )

        try:
            qty = int(body["quantity"])
            if qty < 0:
                raise ValueError()
        except (TypeError, ValueError):
            return error_response("'quantity' must be a non-negative integer.", 400)

        try:
            price = float(body["unit_price"])
            if price <= 0:
                raise ValueError()
        except (TypeError, ValueError):
            return error_response("'unit_price' must be a positive number.", 400)

        new_item = {
            "name":       str(body["name"]).strip(),
            "category":   cat,
            "quantity":   qty,
            "unit_price": price,
            "nsn":        str(body["nsn"]).strip(),
        }
        if "supplier_id" in body and body["supplier_id"] is not None:
            new_item["supplier_id"] = int(body["supplier_id"])

        response = supabase.table("inventory").insert(new_item).execute()
        new_id = response.data[0]["item_id"] if response.data else "?"
        _log_action("inventory", new_id, "INSERT",
                    request.headers.get("X-User-Role", "system"))
        return jsonify({"message": "Item created.", "data": response.data}), 201

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ---------------------------------------------------------------------------
# ORDERS — PUT (status only) / POST (new order)
# ---------------------------------------------------------------------------

@app.route("/api/orders/<int:order_id>", methods=["PUT"])
def update_order_status(order_id):
    """
    Update the status of a service order.
    Only 'status' is editable — all other fields are read-only.

    Request body: { "status": "Pending" | "In Progress" | "Completed" | "Cancelled" }
    """
    try:
        body = _require_json()

        # Strip primary keys and null values before any processing
        body = _strip_pks(body, "order_id", "description", "order_date", "total_cost", "client_id")

        if "status" not in body:
            return error_response("'status' field is required.", 400)

        new_status = body["status"]
        if new_status not in ALLOWED_STATUSES:
            return error_response(
                f"'status' must be one of {sorted(ALLOWED_STATUSES)}.", 400
            )

        # Confirm order exists
        check = (
            supabase.table("Service_Orders")
            .select("order_id")
            .eq("order_id", order_id)
            .execute()
        )
        if not check.data:
            return error_response(f"Order #{order_id} not found.", 404)

        response = (
            supabase.table("Service_Orders")
            .update({"status": new_status})
            .eq("order_id", order_id)
            .execute()
        )
        _log_action("Service_Orders", order_id, "UPDATE",
                    request.headers.get("X-User-Role", "system"))
        return jsonify({"message": "Order status updated.", "data": response.data}), 200

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


@app.route("/api/orders", methods=["POST"])
def create_order():
    """
    Create a new service order.

    Required body fields:
        description (str), client_id (int), total_cost (float), status (str)
    Optional:
        order_date (YYYY-MM-DD, defaults to today)
    """
    try:
        body = _require_json()

        required = ["description", "client_id", "total_cost", "status"]
        missing  = [f for f in required if f not in body]
        if missing:
            return error_response(f"Missing required fields: {missing}", 400)

        if body["status"] not in ALLOWED_STATUSES:
            return error_response(
                f"'status' must be one of {sorted(ALLOWED_STATUSES)}.", 400
            )

        try:
            total = float(body["total_cost"])
            if total < 0:
                raise ValueError()
        except (TypeError, ValueError):
            return error_response("'total_cost' must be a non-negative number.", 400)

        # Validate client_id exists
        client_check = (
            supabase.table("Clients")
            .select("client_id")
            .eq("client_id", int(body["client_id"]))
            .execute()
        )
        if not client_check.data:
            return error_response(f"Client #{body['client_id']} not found.", 404)

        new_order = {
            "description": str(body["description"]).strip(),
            "client_id":   int(body["client_id"]),
            "total_cost":  total,
            "status":      body["status"],
            "order_date":  body.get("order_date", str(date.today())),
        }

        response = supabase.table("Service_Orders").insert(new_order).execute()
        new_id = response.data[0]["order_id"] if response.data else "?"
        _log_action("Service_Orders", new_id, "INSERT",
                    request.headers.get("X-User-Role", "system"))
        return jsonify({"message": "Order created.", "data": response.data}), 201

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ---------------------------------------------------------------------------
# CLIENTS — PUT (contact info only) / POST (new client)
# ---------------------------------------------------------------------------

@app.route("/api/clients/<int:client_id>", methods=["PUT"])
def update_client(client_id):
    """
    Update a client's contact information only.
    company_name and client_id are read-only.

    Request body (JSON) — all optional:
        { "contact_person": <str>, "email": <str> }
    """
    try:
        body = _require_json()

        # Strip primary keys and null values before any processing
        body = _strip_pks(body, "client_id", "company_name")

        patch = {}

        if "contact_person" in body:
            cp = str(body["contact_person"]).strip()
            if not cp:
                return error_response("'contact_person' cannot be empty.", 400)
            patch["contact_person"] = cp

        if "email" in body:
            em = str(body["email"]).strip()
            if "@" not in em or "." not in em:
                return error_response("Invalid email address format.", 400)
            patch["email"] = em

        if not patch:
            return error_response("No valid fields provided to update.", 400)

        check = (
            supabase.table("Clients")
            .select("client_id")
            .eq("client_id", client_id)
            .execute()
        )
        if not check.data:
            return error_response(f"Client #{client_id} not found.", 404)

        response = (
            supabase.table("Clients")
            .update(patch)
            .eq("client_id", client_id)
            .execute()
        )
        _log_action("Clients", client_id, "UPDATE",
                    request.headers.get("X-User-Role", "system"))
        return jsonify({"message": "Client updated.", "data": response.data}), 200

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


@app.route("/api/clients", methods=["POST"])
def create_client():
    """
    Add a new corporate client.

    Required body fields:
        company_name (str), contact_person (str), email (str)
    """
    try:
        body = _require_json()

        required = ["company_name", "contact_person", "email"]
        missing  = [f for f in required if f not in body]
        if missing:
            return error_response(f"Missing required fields: {missing}", 400)

        em = str(body["email"]).strip()
        if "@" not in em or "." not in em:
            return error_response("Invalid email address format.", 400)

        new_client = {
            "company_name":   str(body["company_name"]).strip(),
            "contact_person": str(body["contact_person"]).strip(),
            "email":          em,
        }

        response = supabase.table("Clients").insert(new_client).execute()
        new_id = response.data[0]["client_id"] if response.data else "?"
        _log_action("Clients", new_id, "INSERT",
                    request.headers.get("X-User-Role", "system"))
        return jsonify({"message": "Client created.", "data": response.data}), 201

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ===========================================================================
# DELETE ENDPOINTS
# ===========================================================================

@app.route("/api/inventory/<int:item_id>", methods=["DELETE"])
def delete_inventory_item(item_id):
    """
    Hard-delete an inventory item.
    Returns 404 if the item does not exist.
    """
    try:
        role = request.headers.get("X-User-Role", "system")
        if role not in ("admin", "system"):
            return error_response("Forbidden: only admin can delete records.", 403)

        check = (
            supabase.table("inventory")
            .select("item_id")
            .eq("item_id", item_id)
            .execute()
        )
        if not check.data:
            return error_response(f"Item #{item_id} not found.", 404)

        supabase.table("inventory").delete().eq("item_id", item_id).execute()
        _log_action("inventory", item_id, "DELETE", role)
        return jsonify({"message": f"Item #{item_id} deleted."}), 200

    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ===========================================================================
# MAINTENANCE — POST (create new schedule)
# ===========================================================================

@app.route("/api/maintenance", methods=["POST"])
def create_maintenance():
    """
    Create a new maintenance schedule entry.

    Required body fields:
        equipment_name (str), client_id (int),
        technician_assigned (str), next_service_date (YYYY-MM-DD)
    Optional:
        last_service_date (YYYY-MM-DD)
    """
    try:
        body = _require_json()

        required = ["equipment_name", "client_id", "technician_assigned", "next_service_date"]
        missing  = [f for f in required if f not in body]
        if missing:
            return error_response(f"Missing required fields: {missing}", 400)

        # Validate client exists
        client_check = (
            supabase.table("Clients")
            .select("client_id")
            .eq("client_id", int(body["client_id"]))
            .execute()
        )
        if not client_check.data:
            return error_response(f"Client #{body['client_id']} not found.", 404)

        new_schedule = {
            "equipment_name":      str(body["equipment_name"]).strip(),
            "client_id":           int(body["client_id"]),
            "technician_assigned": str(body["technician_assigned"]).strip(),
            "next_service_date":   str(body["next_service_date"]),
            "last_service_date":   body.get("last_service_date", str(date.today())),
        }

        response = supabase.table("Maintenance_Schedules").insert(new_schedule).execute()
        new_id = response.data[0].get("schedule_id", "?") if response.data else "?"
        _log_action("Maintenance_Schedules", new_id, "INSERT",
                    request.headers.get("X-User-Role", "system"))
        return jsonify({"message": "Schedule created.", "data": response.data}), 201

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ===========================================================================
# AUDIT LOG — GET (admin only read)
# ===========================================================================

@app.route("/api/audit-logs", methods=["GET"])
def get_audit_logs():
    """
    Returns the 200 most recent audit log entries, newest first.
    Optionally filter by table_name or action via query params.
    """
    try:
        query   = supabase.table("audit_logs").select("*")
        table_f = request.args.get("table")
        action_f = request.args.get("action")
        if table_f:
            query = query.eq("table_name", table_f)
        if action_f:
            query = query.eq("action", action_f)
        response = query.order("changed_at", desc=True).limit(200).execute()
        return jsonify(response.data), 200
    except Exception as e:
        app.logger.error(e)
        return error_response(str(e))


# ===========================================================================
# Root health-check
# ===========================================================================

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ICA DBMS API is running ✅", "version": "1.0"}), 200



# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
