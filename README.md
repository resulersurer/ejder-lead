# Ejder Lead Yönetimi

Basit bir Next.js lead yönetimi uygulaması.

## Özellikler

- 24 personel için lead görüntüleme
- Personel bazında lead filtreleme
- Lead durumunu `New`, `Called`, `No Answer`, `Waiting` olarak güncelleme
- Lead için not ekleme
- Excel dosyası yükleyerek leadleri içe aktarma
- Yerel depolamada (localStorage) kayıtlı leadler

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
