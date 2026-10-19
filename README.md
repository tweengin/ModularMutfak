# ModulerCraft Pro
## Özel Mobilya Tasarım & CNC Entegrasyon Sistemi (Pegasus Cad-Cam & Honda Benk Uyumlu)

ModulerCraft Pro; son kullanıcılar, profesyonel iç mimarlar ve mobilya imalat atölyeleri (yöneticiler) arasındaki tüm süreci uçtan uca dijitalleştiren full-stack bir mobilya CAD/CAM ve ERP entegrasyon platformudur.

---

### 🌟 Temel İş Mantığı ve Roller

#### 1. Müşteri & Genel Kullanıcı Portalı (Customer Portal)
* **Kullanıcı Kayıt & Giriş:** E-posta ve telefon ile hızlı üyelik.
* **Profesyonel Kullanıcılar için Jeton Sistemi:** İç mimar ve müteahhitler için ön ödemeli tasarım ve teknik proje çıktısı jeton paketleri (10, 25, 50 jeton).
* **4 Ana Kategori Seçimi:**
  1. **Mutfak (Kitchen):** Alt dolaplar, çekmeceli modüller, eviye dolabı, ankastre fırın/ocak/bulaşık makinesi, aspiratör modülü, kiler boy dolapları.
  2. **Portmanto & Antre:** Minderli oturma bench'i, çekmeceli ayakkabılık, boy aynalı gizli dolaplar, ceket askılık alanları.
  3. **Yatak Odası (Bedroom):** 3 kapaklı & sürgülü gardıroplar, şifonyer, makyaj masası, komodinler.
  4. **Çocuk & Genç Odası:** Ergonomik çalışma masası, radiuslu güvenli gardırop, modüler kitaplık, komodin.
* **Son Kullanıcılar İçin 5 Adımlı Sihirbaz (Layout Wizard):**
  - **Oda Şekli:** Düz Tek Duvar, L-Mutfak Sağ Köşe, L-Mutfak Sol Köşe.
  - **Ölçüler:** Genişlik, derinlik ve tavan yüksekliği (milimetre bazında).
  - **Mimari Açıklıklar & Kapı Tarama Yayı (Swing Arc):** Kapı kanadı açılış çemberi ve pencere parapeti.
  - **Zemin & Sponsor Entegrasyonu:** AGT Parke, Bien Seramik vb. sponsor zemin kaplamaları.
  - **Dahili Cihazlar:** Buzdolabı, ankastre fırın, ocak, davlumbaz, bulaşık makinesi, mikrodalga.
* **Düşük Derinlik Algısı Desteği:**
  - Perspektif distorsiyonunu sıfırlayan **Paralel Aksonometrik İzometrik 3D Projeksiyon** (30° baseline, boyutlar asla küçülmez).
  - Yüksek kontrastlı 2D Mimari Plan ve 2D Ön Cephe Görünüşü (Elevation).
  - **Akıllı Kapı Çarpma Uyarısı:** Dolap kapının açılış yayına taşarsa sistem kırmızı uyarı verir.
* **Gizlilik Kuralı:** Müşteriler fiyat veya teknik kesim detaylarını **göremez**.
* **Referans Kodu & Randevu:** Tasarım tamamlandığında benzersiz bir takip kodu (`TR-xxxx`) üretilir ve yöneticiye iletilir.

---

#### 2. Yönetici Paneli (Manager / Eşinizin Paneli)
* **Güvenli Yönetici Erişimi:** Atölye yetkilisi oturumu (`admin@modulercraft.com`).
* **Dinamik Fiyat Matrisi (Dynamic Pricing Matrix):**
  - **Gövde & Kapak:** 18mm Standart MDFlam (m²), High-Gloss Akrilik, İpek Mat Lake.
  - **Arkalık:** 4mm MDFlam (Standart), 5mm ve 8mm opsiyonları.
  - **Tezgah (Tül / Metre):** Çimstone, Granit, Porselen, Masif Meşe, Laminat.
  - **Hırdavat:** Frenli menteşeler (Samet/Blum), tandem raylar, alüminyum süpürgelik baza, minifix, baza ayakları (modül sayısına ve kapak ebadına göre **otomatik hesaplanır**).
  - **Beyaz Eşya:** Bosch, Siemens, Franke güncel birim fiyatları.
* **Kar Marjı & İşçilik:**
  - Fabrika net kar marjı yüzdesi (%) ve modül başına işçilik maliyeti ayarı.
* **Otomatik Maliyet & Reçete (BOM):**
  - Müşterinin referans kodu girildiğinde tüm dolaplar parçalarına (yanlar, alt tabla, kuşaklar, raflar, kapaklar, arkalık) ayrıştırılır ve anında toplam hammadde, işçilik ve satış fiyatı hesaplanır.
* **2D Nesting & CNC Çıktısı (Pegasus Cad-Cam & Honda Benk):**
  - **"Üretime Gönder"** tıklandığında Python Guillotine 2D Nesting algoritması çalışır.
  - Standart 2800x2100mm veya 2440x1220mm MDFlam plakalarına parçaları yerleştirir, testere payını (kerf 4mm) düşer, fire oranını (%) hesaplar ve kalan kullanışlı parçaları gösterir.
  - **Tek Tıkla DXF İndir:** Pegasus Cad-Cam ve Honda Benk CNC router makinelerine uyumlu, takım yolu katmanlarına ayrılmış (Dış Kesim, 35mm Menteşe Deliği, 5mm Raf Pimi, 15mm Minifix, 4mm Arkalık Kanalı) DXF dosyası üretir.
  - **Tek Tıkla CSV İndir:** OptiCut, Ardis ve ebatlama testerelerine uyumlu CSV kesim listesi.

---

### 📂 Proje Dizin Yapısı

```
modulercraft-pro/
├── server.py                # Python çok iş parçacıklı HTTP & REST API Sunucusu
├── database.py              # SQLite WAL veritabanı, şemalar ve tohum veriler
├── cost_calculator.py       # Dolap modüllerini panellere ayıran BOM & Maliyet motoru
├── nesting_engine.py        # 2D Guillotine Bin Packing & Fire Minimizasyon motoru
├── dxf_engine.py            # Pegasus & Honda Benk CNC DXF ve OptiCut CSV motoru
├── test_suite.py            # Otomatik entegrasyon test paketi
├── static/
│   ├── index.html           # SPA web arayüzü (Kategoriler, Sihirbaz, Stüdyo, Yönetici)
│   ├── style.css            # Lüks endüstriyel koyu tema, yüksek kontrast erişilebilirlik
│   ├── app.js               # Ana uygulama kontrolcüsü, oturumlar ve modül katalogları
│   ├── canvas2d.js          # 2D Mimari Plan, Ön Görünüş ve Kapı Çarpma Çakışma Kontrolü
│   ├── canvas3d.js          # Paralel Aksonometrik İzometrik 3D Çizim Motoru
│   └── admin.js             # Fiyat matrisi editörü, BOM hesaplayıcı, Nesting Canvas
└── README.md
```

---

### 🚀 Çalıştırma Talimatı

Sistem standart Python 3.9+ kütüphaneleriyle sıfır dış bağımlılık prensibiyle inşa edilmiştir.

```bash
cd /Users/engincelik/.gemini/antigravity/scratch/modulercraft-pro
python3 server.py
```

Tarayıcınızda açın:
👉 `http://localhost:8080`

#### Varsayılan Giriş Bilgileri:
* **Yönetici Paneli (Eşinizin Paneli):**
  - E-Posta: `admin@modulercraft.com`
  - Şifre: `admin123`
* **Profesyonel İç Mimar Hesabı:**
  - E-Posta: `mimar@tasarim.com`
  - Şifre: `mimar123` (25 Jeton Yüklü)
* **Örnek Müşteri Projeleri:**
  - `TR-8421` (Ahmet Yılmaz - Kadıköy Mutfak Projesi)
  - `TR-5932` (Selin Korkmaz - Karşıyaka Portmanto Projesi)
