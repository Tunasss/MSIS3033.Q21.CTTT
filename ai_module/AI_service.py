import joblib
import re
import os

# ==========================================
# 1. SETUP FILE PATHS
# ==========================================
# Find .pkl files in the same folder as this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'expense_classifier_model.pkl')
ENCODER_PATH = os.path.join(BASE_DIR, 'label_encoder.pkl')

# Global variables to store the AI Model
model = None
encoder = None

# ==========================================
# 2. HELPER FUNCTIONS
# ==========================================
def load_model():
    """ Load the model and encoder from .pkl files """
    global model, encoder
    try:
        # Check if files exist
        if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODER_PATH):
            print("Error: Cannot find .pkl files!")
            return False
        
        # Load only if not loaded yet (to save memory)
        if model is None or encoder is None:
            model = joblib.load(MODEL_PATH)
            encoder = joblib.load(ENCODER_PATH)
        return True
    except Exception as e:
        print(f"System Error: {e}")
        return False

def clean_text(text):
    """ Clean user input before prediction """
    if not isinstance(text, str):
        return ""
    
    # Make text lowercase
    text = text.lower()
    
    # Keep only English letters (a-z) and spaces
    text = re.sub(r'[^a-z\s]', '', text)
    
    return text.strip()

# ==========================================
# 3. MAIN PREDICT FUNCTION (FOR BACKEND)
# ==========================================
def predict_category(raw_text):
    """ 
    Predict category using Keywords first, then AI model. 
    Input: "buy shoes" -> Output: "Shopping"
    """
    clean_input = clean_text(raw_text)
    
    # Return "Others" if input is empty (e.g., user types "!!!")
    if not clean_input: 
        return "Others"

# --- LAYER 1: SMART KEYWORDS (Chỉ tập trung 4 mục cốt lõi) ---
    keywords = {
        'shopping': ['shoes', 'clothes', 'shirt', 'mall', 'iphone', 'store', 'supermarket'], 
        'food': ['kfc', 'starbucks', 'pizza', 'dinner', 'lunch', 'cafe', 'bread', 'apple', 'fruit', 'market', 'grocery', 'meat'], 
        'transport': ['grab', 'taxi', 'bus', 'parking', 'gas', 'fuel', 'uber', 'flight'],
        'study': ['book', 'course', 'tutor', 'pen', 'library', 'tuition', 'notebook', 'school']
    }

    # 1. Kiểm tra 4 nhóm chính trước
    for category, words in keywords.items():
        if any(word in clean_input for word in words):
            return category.capitalize() 

    # --- LAYER 2: AI MODEL (Có kiểm duyệt Xác suất) ---
    try:
        is_ready = load_model()
        if is_ready:
            # Lấy xác suất % của tất cả các nhóm thay vì lấy kết quả mù quáng
            probabilities = model.predict_proba([clean_input])[0]
            max_prob = max(probabilities) # Tìm % tự tin cao nhất
            
            # Ngưỡng tự tin: Chỉ tin AI nếu nó chắc chắn > 60%
            if max_prob >= 0.60:
                best_match_index = probabilities.argmax()
                category_name = encoder.inverse_transform([best_match_index])[0]
                return category_name
    except Exception:
        pass 
    
    # --- LAYER 3: THE ULTIMATE FALLBACK ---
    # Nếu AI đoán mò (tự tin < 60%) hoặc từ quá lạ -> Cho hết vào Others!
    return "Others"

    # Check if input contains any keywords
    for category, words in keywords.items():
        if any(word in clean_input for word in words):
            return category.capitalize() 

    # --- LAYER 2: AI MODEL (For complex sentences) ---
    try:
        is_ready = load_model()
        if is_ready:
            prediction = model.predict([clean_input])
            category_name = encoder.inverse_transform(prediction)[0]
            return category_name
    except Exception:
        pass # If AI fails, ignore error and move to Layer 3
    
    # --- LAYER 3: DEFAULT FALLBACK ---
    return "Others"