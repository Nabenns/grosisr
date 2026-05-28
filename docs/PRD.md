# PRD — Sistem Manajemen Grosir

**Status:** Draft v1
**Tanggal:** 2026-05-28
**Stack:** Next.js 15 + Postgres + Prisma + Tailwind + shadcn/ui

## 1. Vision

Aplikasi web internal untuk operasional grosir sembako, rokok, dan cemilan. Menggantikan pencatatan manual/spreadsheet dengan sistem terintegrasi yang mencakup pendataan master, transaksi pembelian-penjualan, manajemen stok multi-gudang, retur, hutang/piutang, dan laporan.

## 2. Target Pengguna

- **Owner**: kontrol penuh, lihat semua laporan, kelola user
- **Admin**: operasional harian, kelola master data dan transaksi
- **Kasir**: input penjualan, lihat stok, kelola customer
- **Gudang**: terima pembelian, mutasi antar gudang, stok opname
- **Viewer**: hanya lihat laporan (akuntan/pengawas)

## 3. Tujuan Bisnis

- Kurangi error pencatatan stok dan transaksi
- Visibilitas real-time stok per gudang
- Tracking hutang ke supplier dan piutang dari customer
- Audit trail untuk semua perubahan data dan transaksi
- Laporan otomatis (stok, penjualan, pembelian, hutang/piutang)

## 4. Ruang Lingkup MVP

### In Scope
- CRUD master: Produk (multi-satuan, barcode, HET rokok), Kategori, Brand, Supplier, Customer, Gudang, User, Role
- Inventaris: saldo stok per gudang, penyesuaian, mutasi antar gudang
- Pembelian: PO, faktur pembelian, retur pembelian
- Penjualan: POS/kasir, faktur penjualan, retur penjualan
- Keuangan: hutang ke supplier, piutang dari customer, pembayaran
- Laporan: stok, penjualan, pembelian, hutang/piutang
- RBAC dengan permission granular
- Audit log otomatis

### Out of Scope (eksplisit)
- Mobile native app
- Multi-tenant
- Integrasi marketplace
- Print thermal printer hardware
- Kasir offline-first / PWA
- Promo/loyalty engine kompleks
- Akuntansi penuh (jurnal, neraca)
- Notifikasi WhatsApp/Telegram
- Harga grosir bertingkat (price tier) tidak di M1, mungkin di M2/M3

## 5. Milestone

### M1 — Pendataan & Foundation (target ~3-4 minggu)
- Setup project + auth + RBAC
- CRUD semua master data
- Saldo stok read-only (belum ada movement)
- Audit log foundation
- Dashboard skeleton

**Deliverable:** sistem bisa dipakai input data master, user bisa login dengan role berbeda.

### M2 — Transaksi & Stock Movement (target ~4-5 minggu)
- Stock adjustment + mutasi antar gudang
- Pembelian (PO + invoice) dengan stock movement IN
- Penjualan (POS) dengan stock movement OUT
- Document numbering otomatis
- Stock opname workflow

**Deliverable:** sistem bisa dipakai operasional harian: terima barang, jualan, opname.

### M3 — Retur, Keuangan, Laporan (target ~3-4 minggu)
- Retur pembelian + retur penjualan
- Account payable + payable payment
- Account receivable + receivable payment
- Laporan stok, penjualan, pembelian, hutang/piutang
- Activity log UI

**Deliverable:** sistem lengkap, bisa replace pencatatan manual sepenuhnya.

## 6. Success Metric

- Stok fisik vs sistem: deviasi < 2% setelah opname rutin
- Waktu input transaksi penjualan: < 30 detik per faktur 5 item
- Faktur tertagih tepat waktu: > 80% dari total piutang
- Adopsi: semua transaksi harian masuk sistem dalam 1 bulan setelah go-live

## 7. Asumsi & Risiko

**Asumsi:**
- Single tenant, single perusahaan
- Internet stabil di lokasi (bukan offline-first)
- Hardware: PC/laptop di kasir + gudang, optional barcode scanner USB
- Owner punya VPS atau bersedia setup VPS untuk deployment

**Risiko:**
- Resistensi dari staff yang biasa pakai cara manual → mitigasi: UI sederhana, training, parallel run 1 bulan
- Data master awal banyak (ribuan SKU) → mitigasi: import CSV/Excel di awal
- Kompleksitas multi-satuan untuk produk baru → mitigasi: form wizard + validasi ketat, default unit pcs

## 8. Dokumen Terkait

- `SRS.md` — Software Requirements Specification (functional + non-functional detail)
- `SDD.md` — Software Design Document (arsitektur, data model, modul)
- `UI-UX-FLOW.md` — Page map, navigation, flow utama
- Task breakdown per milestone — dibikin via skill `writing-plans` setelah PRD/SRS/SDD/UI approved
