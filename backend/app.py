from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Path to data file
DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'expenses.csv')

@app.route('/')
def home():
    return jsonify({"message": "Expense Tracker API", "status": "running"})

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    """Get all expenses"""
    try:
        if os.path.exists(DATA_PATH):
            df = pd.read_csv(DATA_PATH)
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
        if os.path.exists(DATA_PATH):
            existing_df = pd.read_csv(DATA_PATH)
            df = pd.concat([existing_df, df], ignore_index = True)
        df.to_csv(DATA_PATH, index = False)
        #return created expense
        return jsonify(new_expense), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
