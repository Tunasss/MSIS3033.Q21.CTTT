import os
import pandas as pd

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'expenses.csv')

COLUMNS = [
    "id",          # uuid
    "date",        # datetime
    "description", # str
    "amount",      # float
    "category"     # str
]

def init_db():
    if not os.path.exists(DATA_PATH):
        df = pd.DataFrame(columns=COLUMNS)
        df.to_csv(DATA_PATH, index=False)
        print("expenses.csv created with headers")
    else:
        print("expenses.csv already exists")

if __name__ == "__main__":
    init_db()
