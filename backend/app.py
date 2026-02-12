from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import uuid
from datetime import datetime
import json 
from db_init import init_db
app = Flask(__name__)
CORS(app)

# Path to data file
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
EXPENSE_PATH = os.path.join(DATA_DIR, 'expenses.csv')
LIMIT_PATH = os.path.join(DATA_DIR, 'limits.json')

# Helpers for /api/summary
DEFAULT_CATEGORIES = [
    "Food & Drinks",
    "Transportation",
    "House",
    "Study",
    "Shopping",
    "Others"
]

def normalize_category(raw: str) -> str:
    """Normalize raw category from CVS/limits.json into frontend labels."""
    if raw is None:
        return "Others"
    c = str(raw).strip()
    if c == "":
        return "Others"
    low = c.lower()

    alias = {
        # Food & Drinks
        "food": "Food & Drinks",
        "foods": "Food & Drinks",
        "drink": "Food & Drinks",
        "drinks": "Food & Drinks",
        "food & drink": "Food & Drinks",
        "food and drink": "Food & Drinks",
        "food & drinks": "Food & Drinks",
        "food and drinks": "Food & Drinks",
        "f&d": "Food & Drinks",

        # Transportation
        "transportation": "Transportation",
        "transport": "Transportation",
        "travel": "Transportation",
        "taxi": "Transportation",
        "bus": "Transportation",

        # House
        "house": "House",
        "home": "House",
        "rent": "House",
        "ultilities": "House",

        # Study
        "study": "Study",
        "education": "Study",
        "edu": "Study",
        "school": "Study",
        "course": "Study",

        # Shopping
        "shopping": "Shopping",
        "shop": "Shopping",

        # Others
        "other": "Others",
        "others": "Others",
        "misc": "Others",
    }

    return alias.get(low,c)

def compute_status(spent: int, limit):
    """Return spending status: over/under/equal/no_limit."""
    if limit is None:
        return "no_limit"
    if spent > limit:
        return "over"
    if spent < limit:
        return "under"
    return "equal"

def load_limits_normalized():
    """
    Load limits.json and normalize its keys.
    Expected limits.json format: {"Food": 200.0, "Health": 100.0} (dict)
    We normalize keys to match DEFAULT_CATEGORIES when possible
    """
    if not os.path.exists(LIMIT_PATH):
        return {}
    
    with open(LIMIT_PATH, "r") as f:
        raw = json.load(f)

    if not isinstance(raw, dict):
        return {}
    out = {}
    for k,v in raw.items():
        cat = normalize_category(k)
        # allow null-like values
        if v is None:
            out[cat] = None
            continue
        try:
            out[cat] = float(v)
        except:
            # ignore invalid limit values
            out[cat] = None
    return out


@app.route('/')
def home():
    return jsonify({"message": "Expense Tracker API", "status": "running"})

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    """Get all expenses"""
    try:
        if os.path.exists(EXPENSE_PATH):
            df = pd.read_csv(EXPENSE_PATH)
            return jsonify(df.to_dict(orient='records'))
        return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    """Add a new expense"""
    try:
        data = request.json
        # validate input
        if not data:
            return jsonify({"error": "No data provided"}), 400
        description = data.get("description","").strip()
        amount = data.get("amount")
        if description == "":
            return jsonify({"error": "Description cannot be empty"}), 400
        try:
            amount = float(amount)
            if amount <= 0:
                return jsonify({"error": "Amount must be greater than 0"}), 400
        except:
            return jsonify({"error": "Amount must be a number"}), 400
        # generate UUID
        expense_id = str(uuid.uuid4())
        # generate timestamp
        current_time = datetime.now().isoformat()
        # default catgegory (temporary)
        category = "other"
        # create expense object
        new_expense = {
            "id": expense_id,
            "date": current_time,
            "description": description,
            "amount": amount,
            "category": category
        }
        # save to CSV
        df = pd.DataFrame([new_expense])
        if os.path.exists(EXPENSE_PATH):
            existing_df = pd.read_csv(EXPENSE_PATH)
            df = pd.concat([existing_df, df], ignore_index = True)
        df.to_csv(EXPENSE_PATH, index = False)
        #return created expense
        return jsonify(new_expense), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/api/limits', methods = ['POST'])
def set_limit():
    """Update limit for specified category"""
    try:
        # read JSON file from front-end
        data = request.json
        # return error if JSON is empty
        if not data:
            return jsonify({"error": "No data provided"}), 400
        # read category and limit from JSON
        category = data.get("category")
        limit = data.get("limit")
        # validate category
        if not category:
            return jsonify({"error": "Category is required"}), 400
        # validate limit
        try:
            limit = float(limit)
            if limit < 0:
                return jsonify({"error": "Limit must be positive"}), 400
        except:
            return jsonify({"error": "Limit must be a number"}), 400
        # Load existing limits
        if os.path.exists(LIMIT_PATH):
            with open(LIMIT_PATH,"r") as f:
                limits = json.load(f)
        else:
            limits = {}
        # update the limit of specified category
        limits[category] = limit
        # save back to limits.json
        with open(LIMIT_PATH, "w") as f:
            json.dump(limits, f, indent = 4)
        return jsonify({
            "message" : "Limit updated successfully",
            "category" : category,
            "limit" : limit
        }),200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/api/limits', methods=['GET'])
def get_limits():
    """Get all category limits"""
    try:
        if os.path.exists(LIMIT_PATH):
            with open(LIMIT_PATH, "r") as f:
                limits = json.load(f)
            return jsonify(limits), 200
        else:
            return jsonify({}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/api/summary', methods=['GET'])
def get_summary():
    """
    Returns summary for frontend in required format:
    {
      "total_spending": <int>,
      "categories": [
        {"category":"Food & Drinks","spent":<int>,"limit":<float|null>,"status":"over|under|equal|no_limit"},
        ...
      ]
    }
    """
    try:
        os.makedirs(DATA_DIR, exist_ok=True)

        limits = load_limits_normalized()

        # If no expenses CSV yet => totals 0, still return default categories
        if not os.path.exists(EXPENSE_PATH):
            categories_out = []
            for cat in DEFAULT_CATEGORIES:
                lim = limits.get(cat, None)
                categories_out.append({
                    "category": cat,
                    "spent": 0,
                    "limit": lim,
                    "status": compute_status(0, lim)
                })
            return jsonify({"total_spending": 0, "categories": categories_out}), 200

        df = pd.read_csv(EXPENSE_PATH)

        # Empty CSV
        if df.empty:
            categories_out = []
            for cat in DEFAULT_CATEGORIES:
                lim = limits.get(cat, None)
                categories_out.append({
                    "category": cat,
                    "spent": 0,
                    "limit": lim,
                    "status": compute_status(0, lim)
                })
            return jsonify({"total_spending": 0, "categories": categories_out}), 200

        # Validate required columns
        if "amount" not in df.columns or "category" not in df.columns:
            return jsonify({"error": "CSV missing required columns: amount/category"}), 500

        # amounts numeric
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)

        # normalize categories for grouping
        df["category"] = df["category"].apply(normalize_category)

        total_spending = int(round(float(df["amount"].sum())))

        spent_map = df.groupby("category")["amount"].sum().to_dict()

        # Output exactly default categories (frontend expects fixed list)
        categories_out = []
        for cat in DEFAULT_CATEGORIES:
            spent = int(round(float(spent_map.get(cat, 0))))
            lim = limits.get(cat, None)  # missing => null
            categories_out.append({
                "category": cat,
                "spent": spent,
                "limit": lim,
                "status": compute_status(spent, lim)
            })

        return jsonify({"total_spending": total_spending, "categories": categories_out}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=False, host='0.0.0.0', port=5000)
