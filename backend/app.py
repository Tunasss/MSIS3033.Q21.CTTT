from flask import Flask, jsonify, request, render_template  
from flask_cors import CORS
import pandas as pd
import os
import uuid
from datetime import datetime
import json
import joblib
import sys
from pathlib import Path
from db_init import init_db

AI_MODULE_DIR = Path(__file__).resolve().parent.parent / "ai_module"
sys.path.insert(0, str(AI_MODULE_DIR))
from AI_service import predict_category, ENCODER_PATH
app = Flask(__name__)
CORS(app)

# Path to data file
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
EXPENSE_PATH = os.path.join(DATA_DIR, 'expenses.csv')
LIMIT_PATH = os.path.join(DATA_DIR, 'limits.json')

# Helpers for /api/summary
def compute_status(spent: int, limit):
    """Return spending status: over/under/equal/no_limit."""
    if limit is None:
        return "no_limit"
    if spent > limit:
        return "over"
    if spent < limit:
        return "under"
    return "equal"

def load_limits():
    """Load limits.json as dict: {category: limit}. Return {} if missing/invalid."""
    if not os.path.exists(LIMIT_PATH):
        return {}
    try:
        with open(LIMIT_PATH, "r") as f:
            raw = json.load(f)
        if not isinstance(raw, dict):
            return {}
        out = {}
        for k, v in raw.items():
            # allow null
            if v is None:
                out[str(k)] = None
                continue
            try:
                out[str(k)] = float(v)
            except:
                out[str(k)] = None
        return out
    except:
        return {}

def init_limits_if_missing():
    """Initialize limits.json with 0 for all known categories if missing/empty."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(LIMIT_PATH):
        try:
            with open(LIMIT_PATH, "r") as f:
                raw = json.load(f)
            if isinstance(raw, dict) and len(raw) > 0:
                return
        except:
            pass

    categories = ["Food", "Transport", "Study", "Shopping", "Others"]
    limits = {cat: 0 for cat in categories}
    with open(LIMIT_PATH, "w") as f:
        json.dump(limits, f, indent=4)

def order_categories(categories):
    """Return categories ordered by preferred display order, Others last."""
    preferred = ["Food", "Transport", "Study", "Shopping", "Others"]
    preferred_lower = [c.lower() for c in preferred]

    def sort_key(cat):
        cat_str = str(cat)
        cat_lower = cat_str.lower()
        if cat_lower in preferred_lower:
            return (0, preferred_lower.index(cat_lower), cat_str)
        return (1, 0, cat_str)

    return sorted(categories, key=sort_key)

@app.route('/')
def home():
    return render_template("index.html")

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
        # Predict category via AI service
        category = predict_category(description)
        if category.startswith("Error:"):
            category = "Others"
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
        df.to_csv(EXPENSE_PATH, index =  False)
        # save category limits.json
        if os.path.exists(LIMIT_PATH):
            with open(LIMIT_PATH,"r") as f:
                limits = json.load(f)
        else:
            limits = {}
        # set default limit only for new categories
        if category not in limits:
            limits[category] = 0
        # save back to limits.json
        with open(LIMIT_PATH, "w") as f:
            json.dump(limits, f, indent = 4)
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
            ordered_keys = order_categories(limits.keys())
            ordered_limits = [
                {"category": k, "limit": limits[k]} for k in ordered_keys
            ]
            return jsonify(ordered_limits), 200
        else:
            return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/api/summary', methods=['GET'])
def get_summary():
    """
    Dynamic summary based on expenses.csv (AI writes category there).
    Output:
    {
      "total_spending": <int>,
      "categories": [
        {"category": <str>, "spent": <int>, "limit": <float|null>, "status": <str>},
        ...
      ]
    }
    """
    try:
        os.makedirs(DATA_DIR, exist_ok=True)

        limits = load_limits()

        # No expenses file => return categories from limits (if any), else empty list
        if not os.path.exists(EXPENSE_PATH):
            categories_out = []
            for cat, lim in limits.items():
                categories_out.append({
                    "category": cat,
                    "spent": 0,
                    "limit": lim,
                    "status": compute_status(0, lim)
                })
            return jsonify({"total_spending": 0, "categories": categories_out}), 200

        df = pd.read_csv(EXPENSE_PATH)

        if df.empty:
            categories_out = []
            for cat, lim in limits.items():
                categories_out.append({
                    "category": cat,
                    "spent": 0,
                    "limit": lim,
                    "status": compute_status(0, lim)
                })
            return jsonify({"total_spending": 0, "categories": categories_out}), 200

        # validate columns
        if "amount" not in df.columns or "category" not in df.columns:
            return jsonify({"error": "CSV missing required columns: amount/category"}), 500

        df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)
        df["amount"] = df["amount"].round(0).astype(int)
        df["category"] = df["category"].fillna("").astype(str).str.strip()

        total_spending = int(df["amount"].sum())

        spent_map = df.groupby("category")["amount"].sum().to_dict()

        # union categories from expenses + limits (so limits-only categories still show)
        all_cats = set(spent_map.keys()) | set(limits.keys())
        all_cats = [c for c in all_cats if str(c).strip() != ""]
        all_cats = order_categories(all_cats)

        categories_out = []
        for cat in all_cats:
            spent = int(spent_map.get(cat, 0))
            lim = limits.get(cat, None)
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
    init_limits_if_missing()
    app.run(debug=False, host='0.0.0.0', port=5000)
