import os
import pandas as pd
import json

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
EXPENSE_PATH = os.path.join(DATA_DIR,'expenses.csv')
LIMIT_PATH = os.path.join(DATA_DIR, 'limits.json')

COLUMNS = [
    "id",          # uuid
    "date",        # datetime
    "description", # str
    "amount",      # float
    "category"     # str
]

def init_db():
    # create data folder if not exists
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print("data folder created")
    # create expenses.csv
    if not os.path.exists(EXPENSE_PATH):
        df = pd.DataFrame(columns=COLUMNS)
        df.to_csv(EXPENSE_PATH, index=False)
        print("expenses.csv created with headers")
    else:
        print("expenses.csv already exists")
    # create limits.json
    if not os.path.exists(LIMIT_PATH):
        with open(LIMIT_PATH,'w') as f:
            json.dump({},f)
            print("limits.json created")
    else:
        print("limits.json already exists")


if __name__ == "__main__":
    init_db()
