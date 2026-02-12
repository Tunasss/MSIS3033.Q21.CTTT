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
@ app.route('/api/limits', methods = ['POST'])
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
    
if __name__ == '__main__':
    init_db()
    app.run(debug=False, host='0.0.0.0', port=5000)
