from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return "Welcome to MSIS3033.Q21.CTTT Backend"

if __name__ == '__main__':
    app.run(debug=True)
