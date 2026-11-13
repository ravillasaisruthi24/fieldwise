
from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
import pandas as pd
import os

# ==========================================
# FIELDWISE - INDIAN CROP DISEASE DETECTION
# FLASK BACKEND
# ==========================================

app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(
    BASE_DIR,
    "indian_crop_disease_dataset_classes.xlsx"
)

# ==========================================
# LOAD EXCEL DATASET
# ==========================================

try:
    disease_df = pd.read_excel(
        DATASET_PATH,
        sheet_name="Disease Classes"
    )

    crop_df = pd.read_excel(
        DATASET_PATH,
        sheet_name="Crop Summary"
    )

    disease_df.columns = disease_df.columns.str.strip()
    crop_df.columns = crop_df.columns.str.strip()

    required_disease_columns = {
        "crop",
        "disease",
        "class_label",
        "status",
        "target_images"
    }

    required_crop_columns = {
        "crop",
        "number_of_classes",
        "target_images"
    }

    if not required_disease_columns.issubset(disease_df.columns):
        raise ValueError("Invalid Disease Classes sheet columns")

    if not required_crop_columns.issubset(crop_df.columns):
        raise ValueError("Invalid Crop Summary sheet columns")

    disease_df = disease_df.dropna(subset=[
        "crop", "disease", "class_label", "status"
    ])

    crop_df = crop_df.dropna(subset=["crop"])

    disease_df["target_images"] = pd.to_numeric(
        disease_df["target_images"],
        errors="coerce"
    ).fillna(0)

    crop_df["target_images"] = pd.to_numeric(
        crop_df["target_images"],
        errors="coerce"
    ).fillna(0)

    print("Dataset loaded successfully!")
    print("Total crop categories:", len(crop_df))
    print("Total disease classes:", len(disease_df))

except Exception as error:
    print("Dataset loading error:", error)
    raise RuntimeError(
        "Unable to load the Excel dataset. "
        "Check that the Excel file is in the project folder."
    )


# ==========================================
# HELPER FUNCTION
# ==========================================

def get_clean_records(dataframe):
    return dataframe.fillna("").to_dict(orient="records")


# ==========================================
# HOME PAGE
# ==========================================

@app.route("/")
def home():
    return send_file(
        os.path.join(BASE_DIR, "index.html")
    )


# ==========================================
# CSS FILE
# ==========================================

@app.route("/style.css")
def stylesheet():
    return send_file(
        os.path.join(BASE_DIR, "style.css"),
        mimetype="text/css"
    )


# ==========================================
# JAVASCRIPT FILE
# ==========================================

@app.route("/app.js")
def javascript():
    return send_file(
        os.path.join(BASE_DIR, "app.js"),
        mimetype="application/javascript"
    )


# ==========================================
# DASHBOARD SUMMARY API
# ==========================================

@app.route("/api/summary")
def dashboard_summary():

    total_crops = int(crop_df["crop"].nunique())

    total_classes = int(len(disease_df))

    total_images = int(
        disease_df["target_images"].sum()
    )

    healthy_classes = int(
        (
            disease_df["status"].astype(str).str.strip().str.lower()
            == "healthy"
        ).sum()
    )

    diseased_classes = int(
        (
            disease_df["status"].astype(str).str.strip().str.lower()
            == "diseased"
        ).sum()
    )

    return jsonify({
        "total_crops": total_crops,
        "total_classes": total_classes,
        "total_images": total_images,
        "healthy_classes": healthy_classes,
        "diseased_classes": diseased_classes
    })


# ==========================================
# GET ALL CROPS API
# ==========================================

@app.route("/api/crops")
def get_crops():

    crops = get_clean_records(
        crop_df.sort_values("crop")
    )

    return jsonify(crops)


# ==========================================
# GET ALL DISEASE CLASSES API
# ==========================================

@app.route("/api/diseases")
def get_diseases():

    crop = request.args.get("crop", "").strip()
    status = request.args.get("status", "").strip()
    search = request.args.get("search", "").strip().lower()

    filtered_df = disease_df.copy()

    # Filter by crop
    if crop:
        filtered_df = filtered_df[
            filtered_df["crop"].astype(str).str.lower()
            == crop.lower()
        ]

    # Filter by health status
    if status:
        filtered_df = filtered_df[
            filtered_df["status"].astype(str).str.lower()
            == status.lower()
        ]

    # Search disease names and class labels
    if search:
        mask = (
            filtered_df["crop"].astype(str).str.lower().str.contains(
                search, na=False
            )
            |
            filtered_df["disease"].astype(str).str.lower().str.contains(
                search, na=False
            )
            |
            filtered_df["class_label"].astype(str).str.lower().str.contains(
                search, na=False
            )
        )

        filtered_df = filtered_df[mask]

    filtered_df = filtered_df.sort_values(
        ["crop", "disease"]
    )

    return jsonify(get_clean_records(filtered_df))


# ==========================================
# GET DETAILS OF ONE CROP
# ==========================================

@app.route("/api/crop/<crop_name>")
def crop_details(crop_name):

    crop_data = crop_df[
        crop_df["crop"].astype(str).str.lower()
        == crop_name.lower()
    ]

    if crop_data.empty:
        return jsonify({
            "error": "Crop not found"
        }), 404

    disease_data = disease_df[
        disease_df["crop"].astype(str).str.lower()
        == crop_name.lower()
    ]

    return jsonify({
        "crop": get_clean_records(crop_data)[0],
        "diseases": get_clean_records(disease_data)
    })


# ==========================================
# CROP-WISE CHART DATA API
# ==========================================

@app.route("/api/chart-data")
def chart_data():

    crop_labels = crop_df["crop"].astype(str).tolist()

    class_counts = []
    image_counts = []
    healthy_counts = []
    diseased_counts = []

    for crop in crop_labels:

        crop_diseases = disease_df[
            disease_df["crop"].astype(str) == crop
        ]

        class_counts.append(int(len(crop_diseases)))

        image_counts.append(
            int(crop_diseases["target_images"].sum())
        )

        healthy_counts.append(
            int(
                (
                    crop_diseases["status"].astype(str).str.lower()
                    == "healthy"
                ).sum()
            )
        )

        diseased_counts.append(
            int(
                (
                    crop_diseases["status"].astype(str).str.lower()
                    == "diseased"
                ).sum()
            )
        )

    return jsonify({
        "labels": crop_labels,
        "class_counts": class_counts,
        "image_counts": image_counts,
        "healthy_counts": healthy_counts,
        "diseased_counts": diseased_counts
    })


# ==========================================
# DATASET INFORMATION API
# ==========================================

@app.route("/api/dataset-info")
def dataset_info():

    return jsonify({
        "dataset_name": "Indian Crop Disease Dataset",
        "file_name": os.path.basename(DATASET_PATH),
        "sheets": [
            "Disease Classes",
            "Crop Summary"
        ],
        "total_crops": int(crop_df["crop"].nunique()),
        "total_classes": int(len(disease_df)),
        "total_images": int(
            disease_df["target_images"].sum()
        ),
        "description": (
            "Dataset containing Indian crop categories, "
            "disease class labels, health status and "
            "target image counts."
        )
    })


# ==========================================
# API HEALTH CHECK
# ==========================================

@app.route("/api/health")
def health_check():

    return jsonify({
        "status": "success",
        "message": "Fieldwise backend is running!",
        "dataset_loaded": True
    })


# ==========================================
# ERROR HANDLERS
# ==========================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({
        "error": "Requested resource not found"
    }), 404


@app.errorhandler(413)
def file_too_large(error):

    return jsonify({
        "error": "Request exceeds the 10 MB limit"
    }), 413


# ==========================================
# RUN FLASK APPLICATION
# ==========================================

if __name__ == "__main__":

    print("\n===================================")
    print(" FIELDWISE CROP DISEASE DETECTION")
    print("===================================")
    print("Server starting...")
    print("Open: http://127.0.0.1:5000")
    print("===================================\n")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
