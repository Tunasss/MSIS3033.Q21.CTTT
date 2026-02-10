from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os

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
        df = pd.DataFrame([data])
        
        if os.path.exists(DATA_PATH):
            existing_df = pd.read_csv(DATA_PATH)
            df = pd.concat([existing_df, df], ignore_index=True)
        
        df.to_csv(DATA_PATH, index=False)
        return jsonify({"message": "Expense added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
