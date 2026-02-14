# MSIS3033.Q21.CTTT

Expense Tracker Project - A web application for tracking and analyzing expenses with AI-powered categorization.

## Project Structure

```
.
├── frontend/                          # Frontend application
│   ├── index.html                     # Main HTML page
│   ├── style.css                      # Stylesheet
│   └── script.js                      # JavaScript logic
├── backend/                           # Backend API
│   ├── app.py                         # Flask REST API
│   ├── db_init.py                     # Database initialization
│   └── requirements.txt               # Python dependencies
├── ai_module/                         # Machine Learning module
│   ├── AI_service.py                  # Model training script
│   ├── expense_classifier_model.pkl   # Trained ML model
│   ├── expense_data.csv               # Dataset for training
│   └── label_encoder.pkl              # Trained ML encoder
├── data/                              # Data storage
│   ├── expensve.csv                   # Expense records
│   └── limits.json                    # Limits records
└── .gitignore                         # Git ignore rules
```

## Setup Instructions

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Train AI Model
```bash
cd ai_module
python train.py
```

### Frontend
Open `frontend/index.html` in a web browser or serve with a local server.

## Features

- **Frontend**: Simple and responsive expense tracking interface
- **Backend**: RESTful API for expense management
- **AI Module**: Machine learning model for expense categorization
- **Data**: CSV-based storage for expenses

## API Endpoints

- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add new expense
- `GET /api/limits` - Get all limits
- `POST /api/limits` - Add new limit
- `GET /api/sumary` - Get summary & history

## Requirements

- Python 3.8+
- Flask
- pandas
- scikit-learn
- Modern web browser