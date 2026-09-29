# Ejder Lead Yönetimi

Basit bir Next.js lead yönetimi uygulaması.

## Özellikler

- 24 personel için lead görüntüleme
- Personel bazında lead filtreleme
- Lead durumunu `New`, `Called`, `No Answer`, `Waiting` olarak güncelleme
- Lead için not ekleme
- Excel dosyası yükleyerek leadleri içe aktarma
- Yerel depolamada (localStorage) kayıtlı leadler
- TurTakip'ten güncel tur ve kesin rezervasyon verilerini alma
- Telefon numarasıyla lead-satın alma eşleştirmesi
- Lead için ilgilenilen tur seçimi ve ödeme durumu gösterimi
- Yönetici şifresiyle korunan müşteri ekranı

## TurTakip Entegrasyonu

İki Vercel projesinde aynı `INTEGRATION_API_KEY` kullanılmalıdır. Ejder Lead için gereken değişkenler:

```bash
INTEGRATION_API_KEY="shared-long-random-string"
TUR_TRACKER_API_URL="https://turtakipv2.vercel.app"
NEXT_PUBLIC_TUR_TRACKER_URL="https://turtakipv2.vercel.app"
ADMIN_COOKIE_SECRET="replace-with-a-long-random-string"
ADMIN_PASSWORD="change-me"
```

`ADMIN_PASSWORD` tanımlı değilse mevcut `UPLOAD_PASSWORD` yönetici girişinde kullanılır. TurTakip, kesin rezervasyonları ve ödeme özetlerini korumalı API üzerinden sağlar; Ejder Lead bu API'yi yalnızca kendi sunucusundan çağırır.

## Kurulum

1. `npm install`
2. `npm run dev`
3. Tarayıcıda `http://localhost:3000` adresini açın

## Vercel'e dağıtım

1. Vercel hesabınıza giriş yapın
2. Bu depo klasörünü Vercel'e bağlayın
3. Build komutu: `npm run build`
4. Output klasörü: `.next`

## Excel Yükleme

Excel dosyanızdaki sütun başlıkları aşağıdakilerden biri olabilir:

- `Ad`, `Name`, `İsim`
- `Şirket`, `Company`, `Firma`
- `Telefon`, `Phone`, `Cep`
- `Personel`, `SalesPerson`, `Assigned To`, `Atanan`
- `Durum`, `Status`
- `Not`, `Notes`, `Açıklama`

Desteklenmeyen bir format varsa, lütfen dosyanızdaki başlıkları yukarıdaki isimlerle eşleştirin.
