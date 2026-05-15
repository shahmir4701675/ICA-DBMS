# ICA DBMS — Intelligent Controls & Automation

A full-stack Database Management System built for a 4th-semester Computer Systems Engineering university project. It manages industrial inventory, corporate clients, engineering service orders, and preventive maintenance schedules.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v3 |
| Backend | Python Flask + flask-cors |
| Database | Supabase (PostgreSQL), hosted |
| HTTP Client | Axios |
| Icons | lucide-react |

---

## Project Structure

```
dbms_cep/
├── app.py                 ← Flask REST API (6 endpoints)
├── requirements.txt       ← Python dependencies
├── .flaskenv              ← Backend secrets (NOT committed)
├── .env.example           ← Template — copy to .flaskenv
├── .gitignore
├── credentials.txt        ← Login credentials for all 4 roles
├── DATA/                  ← Source CSV files (100 inventory items, etc.)
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx            ← Root + auth gate
        ├── index.css          ← Design system
        ├── services/api.js    ← All Axios calls
        └── components/
            ├── Login.jsx      ← Multi-role authentication
            ├── Sidebar.jsx    ← Role-filtered navigation
            ├── Dashboard.jsx  ← Role-aware KPI view
            ├── Inventory.jsx  ← Parts management + NSN search
            ├── Clients.jsx    ← Corporate clients directory
            ├── Orders.jsx     ← Service orders + invoice generator
            └── Maintenance.jsx← Maintenance schedules
```

---

## Setup & Run

### Prerequisites
- Python 3.9+ with `pip`
- Node.js 18+ with `npm`

### Step 1 — Configure Backend Secrets

Copy the env template and fill in your Supabase credentials:

```bash
copy .env.example .flaskenv
```

Then open `.flaskenv` and set `SUPABASE_URL` and `SUPABASE_KEY`.

### Step 2 — Start the Flask Backend

```powershell
cd C:\Users\DELL\OneDrive\Desktop\dbms_cep
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe app.py
```

Flask starts on **http://127.0.0.1:5000**

### Step 3 — Start the React Frontend

```powershell
cd frontend
npm install
npm run dev
```

React starts on **http://localhost:3000**

---

## Login Credentials

See **`credentials.txt`** in the project root for all 4 user roles and their passwords.

| Role | Email | Default Page |
|---|---|---|
| Administrator | admin@ica.com | Dashboard |
| Field Technician | technician@ica.com | Maintenance |
| Inventory Manager | inventory@ica.com | Inventory |
| Operations Manager | manager@ica.com | Dashboard |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/inventory` | All parts, optional `?category=` |
| GET | `/api/inventory/search` | Search by name or NSN (`?q=`) |
| GET | `/api/clients` | All corporate clients |
| GET | `/api/orders` | Service orders (`?status=`) |
| GET | `/api/maintenance` | Maintenance schedules |
| POST | `/api/generate-invoice` | `{"order_id": N}` → invoice JSON |

---

## Security Notes

- Supabase credentials are stored in `.flaskenv` (gitignored — never committed)
- The `.env.example` file is safe to commit and shows the required variable names
- Role-based access is enforced on the frontend via `user.role` — each role sees only its permitted pages
- Login credentials are hardcoded for demo purposes only (see `credentials.txt`)

---

*© 2026 ICA. All rights reserved. Systems by SHAK Systems.*
