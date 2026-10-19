#!/bin/bash
cd "$(dirname "$0")"

echo "============================================================"
echo "  🚀 ModulerCraft Pro Başlatılıyor..."
echo "  Adres: http://localhost:8080"
echo "  Durdurmak için bu pencereyi kapatabilir veya Ctrl+C yapabilirsiniz."
echo "============================================================"

# Tarayıcıda otomatik aç
sleep 1 && open "http://localhost:8080" &

# Sunucuyu çalıştır
python3 server.py
