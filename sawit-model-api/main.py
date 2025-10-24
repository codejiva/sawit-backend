import pandas as pd
import joblib
import gdown
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

# --- 1. Setup Aplikasi FastAPI ---
app = FastAPI(
    title="Saw-it Model API",
    description="API untuk melayani model prediksi produktivitas sawit XGBoost.",
    version="1.0.0"
)

# --- 2. Tentukan Struktur Input (Pydantic Model) ---
# Ini adalah "cetakan" JSON yang akan kita terima dari Express.js
# Tipe datanya HARUS sama dengan yang dipakai saat training
class LahanInput(BaseModel):
    NDVI: float
    pupuk_kg_per_ha: float
    umur_tanaman_tahun: float
    curah_hujan_mm: float
    suhu_rata2_c: float
    NDVI_lag1: float
    pupuk_lag1: float
    prod_lag1: float
    NDVI_roll3: float
    pupuk_roll3: float
    # Fitur kategorikal (teks)
    penanggung_jawab: str
    jenis_tanah: str
    sistem_irigasi: str
    lahan_kabupaten: str

# Ini untuk menerima list dari data lahan
class PredictPayload(BaseModel):
    instances: List[LahanInput]


# --- 3. Fungsi Helper (Untuk Load Model & Preprocessor) ---
def load_model_and_mappers():
    """
    Fungsi ini akan dipanggil sekali saat startup untuk me-load model
    dan membuat 'mapper' untuk categorical features.
    """
    # 3.1. Load Model
    model_path = "xgb_model_palm.joblib"
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file '{model_path}' not found. "
                                f"Please copy it to the 'sawit-model-api' directory.")
    
    model = joblib.load(model_path)

    # 3.2. Download & Load Dataset (HANYA untuk 'merekam' categorical mapping)
    file_id = "1fYM8EKlAy7xVQE5SyCkYko0oT_uMAcpI"
    csv_path = "palm_productivity_timeseries.csv"
    
    if not os.path.exists(csv_path):
        print("Downloading dataset from Google Drive for preprocessing...")
        gdown.download(f"https://drive.google.com/uc?id={file_id}", csv_path, quiet=False)
    
    df = pd.read_csv(csv_path)
    
    # 3.3. Buat 'Mappers'
    # Kita 'factorize' kolom kategorikal untuk mendapatkan mapping Teks -> Angka
    # (Contoh: 'Alluvial' -> 0, 'Latosol' -> 1)
    mappers = {}
    categorical = ['penanggung_jawab','jenis_tanah','sistem_irigasi','lahan_kabupaten']
    for col in categorical:
        # Jika kolom tidak ada di CSV (sesuai script asli), kita buat default
        if col not in df.columns:
            if col == 'jenis_tanah': df[col] = 'Alluvial'
            elif col == 'sistem_irigasi': df[col] = 'Tanpa Irigasi'
            elif col == 'lahan_kabupaten': df[col] = 'Unknown'
            elif col == 'penanggung_jawab': df[col] = 'Tim A'
            else: df[col] = 'Unknown'

        # Buat mapping: {'Tim A': 0, 'Tim B': 1}
        codes, uniques = pd.factorize(df[col])
        mappers[col] = {name: code for code, name in enumerate(uniques)}
        
    print("✅ Model and Preprocessing Mappers loaded successfully.")
    
    return model, mappers

# --- 4. Load Model (Saat Startup) ---
# Objek 'model' dan 'mappers' ini akan disimpan di memori
try:
    model, mappers = load_model_and_mappers()
    # Daftar fitur HARUS SAMA URUTANNYA dengan saat training
    feature_cols = [
        'NDVI','pupuk_kg_per_ha','umur_tanaman_tahun','curah_hujan_mm','suhu_rata2_c',
        'NDVI_lag1','pupuk_lag1','prod_lag1','NDVI_roll3','pupuk_roll3',
        'penanggung_jawab_enc','jenis_tanah_enc','sistem_irigasi_enc','lahan_kabupaten_enc'
    ]
except Exception as e:
    print(f"FATAL ERROR: Could not load model or mappers. {e}")
    model, mappers, feature_cols = None, None, None


# --- 5. Definisikan Endpoint API ---

@app.get("/")
def read_root():
    return {"message": "Welcome to the Saw-it Model Prediction API!"}


@app.post("/predict")
def predict_productivity(payload: PredictPayload):
    """
    Endpoint utama untuk melakukan prediksi.
    Menerima list berisi data lahan, mengembalikan list berisi prediksi.
    """
    if not model:
        raise HTTPException(status_code=500, detail="Model is not loaded. Check server logs.")

    try:
        # 1. Ubah data input (Pydantic) menjadi DataFrame Pandas
        input_data = [instance.dict() for instance in payload.instances]
        df_input = pd.DataFrame(input_data)
        
        # 2. Preprocessing (Ubah Teks jadi Angka)
        df_processed = df_input.copy()
        for col in mappers.keys():
            # 'mapper[col]' adalah dict, misal: {'Alluvial': 0, 'Latosol': 1}
            # .map() akan mengubah 'Alluvial' -> 0
            # .fillna(0) untuk menangani jika ada kategori baru (default ke 0)
            df_processed[col+'_enc'] = df_processed[col].map(mappers[col]).fillna(0).astype(int)

        # 3. Pastikan urutan kolom benar
        # (Ini penting! XGBoost sangat sensitif dengan urutan fitur)
        X_pred = df_processed[feature_cols]

        # 4. Lakukan Prediksi
        predictions = model.predict(X_pred)
        
        # 5. Format hasil
        # (Kita bulatkan jadi 3 angka di belakang koma)
        result = [round(float(pred), 3) for pred in predictions]

        return {"predictions": result}

    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=400, detail=f"Error during prediction: {e}")