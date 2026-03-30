#!/bin/bash

# Path to the service account key file
KEY_FILE="./firebase-key.json"

if [ ! -f "$KEY_FILE" ]; then
    echo "Error: $KEY_FILE not found!"
    echo "Please download your Service Account Key from Firebase Console:"
    echo "1. Go to Project Settings -> Service accounts"
    echo "2. Click 'Generate new private key'"
    echo "3. Save the file as 'firebase-key.json' in this folder."
    echo "4. Run this script again."
    exit 1
fi

echo "Deploying with Service Account Key..."
export GOOGLE_APPLICATION_CREDENTIALS="$KEY_FILE"

# Run the standalone binary
./firebase_bin deploy --project possystem-7a66f
