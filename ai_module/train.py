import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import os

def train_expense_model():
    """
    Train a machine learning model to predict expense categories
    """
    # Path to data
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'expenses.csv')
    
    # Check if data exists
    if not os.path.exists(data_path):
        print("No data file found. Creating sample data...")
        create_sample_data(data_path)
    
    # Load data
    df = pd.read_csv(data_path)
    
    # Prepare features and target
    # This is a placeholder - adjust based on your actual data structure
    if 'category' in df.columns and 'amount' in df.columns:
        X = df[['amount']].values
        y = df['category'].values
        
        # Encode categories
        le = LabelEncoder()
        y_encoded = le.fit_transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42
        )
        
        # Train model
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # Evaluate
        accuracy = model.score(X_test, y_test)
        print(f"Model accuracy: {accuracy:.2f}")
        
        # Save model
        model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
        joblib.dump({'model': model, 'label_encoder': le}, model_path)
        print(f"Model saved to {model_path}")
    else:
        print("Data does not have required columns (category, amount)")

def create_sample_data(data_path):
    """Create sample expense data"""
    sample_data = {
        'date': ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
        'category': ['Food', 'Transport', 'Entertainment', 'Food', 'Shopping'],
        'amount': [50.00, 20.00, 100.00, 35.50, 150.00],
        'description': ['Groceries', 'Bus fare', 'Movie tickets', 'Lunch', 'Clothes']
    }
    df = pd.DataFrame(sample_data)
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    df.to_csv(data_path, index=False)
    print(f"Sample data created at {data_path}")

if __name__ == '__main__':
    train_expense_model()
