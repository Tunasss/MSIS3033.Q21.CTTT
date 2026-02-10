import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
import pickle

# Sample training script for AI module
def train_model():
    # Load data
    # This is a placeholder - actual implementation would load data from ../data/expenses.csv
    print("Training AI model...")
    
    # Create and train a simple model
    model = LinearRegression()
    
    # Save the model
    with open('model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    print("Model saved as model.pkl")

if __name__ == '__main__':
    train_model()
