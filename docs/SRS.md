# SRS — Sistem Manajemen Grosir

**Status:** Draft v1
**Tanggal:** 2026-05-28

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini menjabarkan kebutuhan fungsional dan non-fungsional sistem manajemen grosir secara rinci, sebagai turunan dari PRD. Pembaca: developer, QA, owner.

### 1.2 Lingkup Sistem
Aplikasi web internal untuk operasional grosir sembako, rokok, dan cemilan. Mencakup pendataan master data, transaksi pembelian-penjualan, manajemen stok multi-gudang, retur, hutang/piutang, dan laporan.

### 1.3 Definisi
- **SKU**: Stock Keeping Unit, kode unik produk
- **Base unit**: satuan terkecil produk (mis. batang untuk rokok, pcs untuk cemilan)
- **HET**: Harga Eceran Tertinggi (regulasi cukai rokok)
- **PO**: Purchase Order
- **Stock movement**: catatan setiap perubahan stok
- **Stock balance**: saldo stok cache hasil agregasi movement
- **POS**: Point of Sale, halaman kasir penjualan

## 2. Functional Requirements

### 2.1 Authentication & Authorization

**FR-AUTH-01** Login dengan username/email + password.
**FR-AUTH-02** Session berbasis cookie, idle timeout 12 jam, max 30 hari.
**FR-AUTH-03** Logout invalidasi session immediate.
**FR-AUTH-04** Lupa password: reset oleh OWNER/ADMIN via UI user management (no email reset di MVP).
**FR-AUTH-05** Password minimal 8 karakter, hash bcrypt cost 12.
**FR-AUTH-06** Akun tidak aktif (`is_active=false`) tidak bisa login.

**FR-RBAC-01** Role bawaan: OWNER, ADMIN, KASIR, GUDANG, VIEWER.
**FR-RBAC-02** Permission granular per modul (mis. `product.create`, `sale.discount.approve`).
**FR-RBAC-03** User dapat memiliki multiple role; permission union.
**FR-RBAC-04** OWNER memiliki semua permission implisit (tidak dapat di-revoke).
**FR-RBAC-05** Permission check di 3 layer: middleware route, server action guard, prisma query filter.

### 2.2 Master Data — Produk

**FR-PROD-01** Tambah produk dengan field: SKU (unik), nama, kategori, brand, base unit, deskripsi, foto (optional), is_active.
**FR-PROD-02** Setiap produk memiliki minimal 1 ProductUnit (default = base unit dengan conversion=1).
**FR-PROD-03** Tambah ProductUnit alternatif: unit, conversion_to_base (numeric > 0), barcode (unik global, optional), purchase_price, sale_price.
**FR-PROD-04** Flag has_cukai dan has_het khusus rokok. Jika has_het=true, field het_price wajib.
**FR-PROD-05** Validasi: jika has_het=true, sale_price tiap ProductUnit (dikonversi ke base) harus ≤ HET. Override hanya untuk OWNER.
**FR-PROD-06** Edit produk: semua field bisa diubah kecuali SKU (immutable setelah ada movement).
**FR-PROD-07** Soft delete produk: set is_active=false. Produk tidak aktif tidak muncul di POS/PO.
**FR-PROD-08** Hard delete hanya jika belum pernah ada stock movement; OWNER only.
**FR-PROD-09** Search produk: by SKU, nama (trigram fuzzy), barcode (semua ProductUnit).
**FR-PROD-10** Bulk import produk via CSV dengan template fix (kolom: sku,name,category,brand,base_unit,...).

### 2.3 Master Data — Kategori, Brand, Satuan

**FR-CAT-01** CRUD Kategori dengan parent_id (self-ref untuk subkategori, max depth 3).
**FR-CAT-02** Kategori aktif/nonaktif. Nonaktif tidak muncul di form produk.
**FR-CAT-03** Kategori tidak boleh dihapus jika punya produk (soft delete only).

**FR-BRAND-01** CRUD Brand: nama (unik), deskripsi.
**FR-BRAND-02** Brand tidak boleh dihapus jika punya produk.

**FR-UNIT-01** CRUD Satuan global: nama (pcs, pak, slop, dus, bal, karton, kg, dll).
**FR-UNIT-02** Satuan tidak boleh dihapus jika dipakai ProductUnit.

### 2.4 Master Data — Supplier & Customer

**FR-SUP-01** CRUD Supplier: code (auto-generate), nama, phone, address, npwp, term_of_payment_days (default 0 = cash).
**FR-SUP-02** Supplier nonaktif tidak muncul di form PO.
**FR-SUP-03** Supplier tidak bisa dihapus jika ada PO/invoice/payable terkait.

**FR-CUST-01** CRUD Customer: code (auto), nama, phone, address, customer_type (RESELLER/RETAIL), credit_limit, term_of_payment_days.
**FR-CUST-02** Customer RETAIL default = "Walk-in" (tidak perlu input data, untuk kasir cepat).
**FR-CUST-03** Customer dengan piutang outstanding tidak bisa dinonaktifkan.

### 2.5 Master Data — Gudang & User

**FR-WH-01** CRUD Gudang: code, name, address, is_active.
**FR-WH-02** Minimal 1 gudang default harus exist (tidak bisa dihapus).
**FR-WH-03** User memiliki default warehouse; warehouse switcher di top bar.
**FR-WH-04** Gudang dengan stok > 0 tidak bisa dihapus (harus opname ke 0 dulu atau transfer).

**FR-USER-01** CRUD User oleh OWNER/ADMIN: username, email, name, password (saat create), is_active.
**FR-USER-02** Assign multiple role per user.
**FR-USER-03** Assign warehouse access per user (untuk role KASIR/GUDANG).
**FR-USER-04** Reset password user oleh admin (generate password baru, ditampilkan sekali).

### 2.6 Inventaris

**FR-INV-01** Halaman Saldo Stok: list produk dengan saldo per gudang aktif (filter warehouse switcher).
**FR-INV-02** Saldo dihitung dari `StockBalance` cache; di-update via trigger/middleware setelah movement.
**FR-INV-03** Stock movement immutable; koreksi via adjustment baru, bukan edit movement lama.
**FR-INV-04** Threshold stok minimum per produk per gudang; alert di dashboard kalau di bawah threshold.

**FR-ADJ-01** Stock Adjustment: pilih gudang, alasan (RUSAK/HILANG/OPNAME/KOREKSI/LAINNYA), tambah item dengan qty diff (boleh negatif).
**FR-ADJ-02** Status DRAFT bisa diedit/cancel; POSTED tidak bisa diubah (harus adjustment baru untuk koreksi).
**FR-ADJ-03** Posting adjustment generate StockMovement (direction IN jika diff > 0, OUT jika < 0) dan update StockBalance.
**FR-ADJ-04** Permission `inventory.adjustment.post` (default GUDANG/ADMIN); approval >X% deviation oleh OWNER (config setting).

**FR-OPNAME-01** Stock Opname workflow: pilih gudang + (optional) kategori → generate worksheet snapshot saldo → input qty fisik per produk → preview selisih → posting jadi StockAdjustment.
**FR-OPNAME-02** Worksheet bisa di-export Excel/PDF untuk dicetak.
**FR-OPNAME-03** Saat opname posting, semua selisih jadi 1 StockAdjustment dengan reason=OPNAME.

**FR-XFR-01** Stock Transfer: from_warehouse, to_warehouse (≠ from), tambah item.
**FR-XFR-02** Status: DRAFT → IN_TRANSIT (kirim, kurangi stok asal) → COMPLETED (terima, tambah stok tujuan). CANCELLED hanya dari DRAFT.
**FR-XFR-03** User di gudang tujuan yang melakukan "Terima" (bisa beda dari pengirim).
**FR-XFR-04** Selama IN_TRANSIT, stok tercatat di virtual `IN_TRANSIT` (tidak masuk gudang manapun); muncul di laporan terpisah.
**FR-XFR-05** Transfer dengan qty > saldo asal: blocked.

### 2.7 Pembelian

**FR-PO-01** Buat Purchase Order: pilih supplier, gudang tujuan, expected_date, tambah item (product_unit, qty, price, discount).
**FR-PO-02** Status PO: DRAFT → SENT → PARTIAL → COMPLETED, atau CANCELLED.
**FR-PO-03** Kirim PO (DRAFT → SENT): generate PDF + (optional) print.
**FR-PO-04** Edit PO hanya saat DRAFT.
**FR-PO-05** PDF PO: header toko, supplier, tanggal, daftar item, total, signature line.

**FR-PINV-01** Faktur Pembelian: bisa dari PO existing (pre-fill item dengan qty_received default = sisa belum diterima) atau direct (tanpa PO).
**FR-PINV-02** Field invoice: supplier, gudang, invoice_date, due_date, no_faktur_supplier, item (product_unit, qty, price, discount), tax_amount.
**FR-PINV-03** Posting invoice: generate StockMovement IN per item, update PO progress (jika linked), buat AccountPayable (amount = total).
**FR-PINV-04** Status: UNPAID → PARTIAL → PAID. VOID hanya dengan permission khusus + alasan + auto-generate reverse movements.
**FR-PINV-05** Invoice posted tidak bisa diedit; koreksi via retur atau adjustment.

**FR-PRET-01** Retur Pembelian: pilih invoice referensi, tambah item (qty ≤ qty original - qty_already_returned).
**FR-PRET-02** Posting retur: generate StockMovement OUT (dari gudang invoice), kurangi AccountPayable.
**FR-PRET-03** Retur memerlukan no_referensi_supplier untuk audit.

### 2.8 Penjualan

**FR-SALE-01** Halaman POS: search produk (SKU/nama/barcode), tambah ke cart, edit qty/satuan/harga (jika permission), customer (default Walk-in), payment.
**FR-SALE-02** Scan barcode (input keyboard wedge): auto add 1 qty (atau increment jika sudah ada di cart).
**FR-SALE-03** Multi-satuan picker per cart row: dropdown ProductUnit, harga & subtotal recalculate.
**FR-SALE-04** Diskon per item (% atau nominal) dan diskon faktur. Permission `sale.discount.apply` (KASIR boleh < 5%, ADMIN tanpa batas).
**FR-SALE-05** Stock check: blocked jika qty > saldo, kecuali setting `allow_negative_stock=true` (default false).
**FR-SALE-06** Sale type CASH: payment langsung, status PAID. Sale type CREDIT: due_date wajib, status UNPAID, buat AccountReceivable.
**FR-SALE-07** Payment method: TUNAI, TRANSFER, QRIS, KARTU (catat ref_no).
**FR-SALE-08** Posting sale: generate StockMovement OUT, (jika CREDIT) buat AccountReceivable, generate document number.
**FR-SALE-09** Print struk: A4 atau thermal-friendly format (HTML print, MVP belum ESC/POS direct).
**FR-SALE-10** VOID sale: permission `sale.void`, alasan wajib, generate reverse movement + reverse receivable.
**FR-SALE-11** Shortcut keyboard: F2 search, F4 customer, F8 payment, Esc cancel cart.

**FR-SRET-01** Retur Penjualan: pilih invoice referensi, tambah item (qty ≤ qty original - qty_already_returned).
**FR-SRET-02** Posting retur: generate StockMovement IN, kurangi receivable atau buat refund cash.

### 2.9 Keuangan

**FR-AP-01** AccountPayable terbuat otomatis saat posting purchase invoice.
**FR-AP-02** List hutang: filter supplier, status (UNPAID/PARTIAL/PAID), aging (0-30, 31-60, 61-90, >90 hari).
**FR-AP-03** Pembayaran hutang: pilih payable, amount (≤ outstanding), payment_date, method, ref_no, note.
**FR-AP-04** Bayar multi-payable sekaligus per supplier (pilih beberapa invoice → 1 PayablePayment dengan distribusi otomatis).
**FR-AP-05** Status payable: UNPAID (paid_amount=0) → PARTIAL (0 < paid < total) → PAID (paid = total).

**FR-AR-01** AccountReceivable terbuat otomatis saat posting sale CREDIT.
**FR-AR-02** List piutang: filter customer, status, aging.
**FR-AR-03** Penagihan/pelunasan: input ReceivablePayment, alur sama seperti AP.
**FR-AR-04** Customer dengan piutang melebihi credit_limit: blocked saat sale CREDIT baru (override permission).
**FR-AR-05** Aging report: highlight piutang > term_of_payment customer.

### 2.10 Laporan

**FR-RPT-01** Laporan Stok: saldo per gudang, nilai stok (qty × HPP), produk stok minimum, kartu stok per produk (riwayat movement).
**FR-RPT-02** Laporan Penjualan: harian/bulanan, per kasir, per customer, per produk, per kategori. Group by + drill down.
**FR-RPT-03** Laporan Pembelian: harian/bulanan, per supplier, per produk, per kategori.
**FR-RPT-04** Laporan Hutang: outstanding per supplier, aging, jatuh tempo dalam X hari.
**FR-RPT-05** Laporan Piutang: outstanding per customer, aging, jatuh tempo dalam X hari.
**FR-RPT-06** Export laporan: CSV, Excel, PDF.
**FR-RPT-07** Filter range tanggal mandatory di semua laporan (default: bulan berjalan).

### 2.11 Audit Log

**FR-AUDIT-01** Otomatis catat CREATE/UPDATE/DELETE untuk: Product, ProductUnit, Customer, Supplier, Warehouse, User, Role, RolePermission.
**FR-AUDIT-02** Catat manual untuk transaksi penting: POST sale, VOID sale, POST purchase, VOID purchase, payment, transfer status change.
**FR-AUDIT-03** Diff before/after disimpan JSON, hanya field yang berubah.
**FR-AUDIT-04** UI Activity Log: filter actor, entity, entity_id, action, range tanggal.
**FR-AUDIT-05** Audit log tidak bisa diedit/dihapus (append-only).

### 2.12 Dashboard

**FR-DASH-01** Card metrik: total stok (qty), nilai stok (Rp), hutang outstanding, piutang outstanding, penjualan hari ini.
**FR-DASH-02** Chart penjualan 7 hari (bar).
**FR-DASH-03** Top 10 produk laris (30 hari terakhir).
**FR-DASH-04** Daftar produk stok minimum (table dengan link ke detail produk).
**FR-DASH-05** Quick actions: Buat Penjualan, Tambah Produk, Stok Opname.
**FR-DASH-06** Notifikasi: hutang jatuh tempo dalam 7 hari, piutang lewat jatuh tempo, transfer pending received.

## 3. Non-Functional Requirements

### 3.1 Performance
- **NFR-PERF-01** List page (1000-3000 SKU) dengan pagination 25/page: TTFB < 500ms p95.
- **NFR-PERF-02** POS scan barcode → cart update: < 200ms p95.
- **NFR-PERF-03** Posting transaksi (sale/purchase) 20 item: < 1s p95.
- **NFR-PERF-04** Search produk (trigram fuzzy): < 300ms p95.
- **NFR-PERF-05** Laporan dengan range 30 hari: < 3s p95.

### 3.2 Concurrency & Integrity
- **NFR-CONC-01** Semua transaksi pengubah stok wajib via Prisma `$transaction` interactive dengan SELECT FOR UPDATE row lock di StockBalance.
- **NFR-CONC-02** Idempotency key wajib di endpoint POST critical (sale/payment/posting), retain 24 jam.
- **NFR-CONC-03** Document numbering via `Counter` table dengan UPDATE...RETURNING (no race), format `{TYPE}-{YYYYMM}-{seq:4}`.
- **NFR-CONC-04** Soft delete via `deletedAt`; query default exclude soft-deleted.
- **NFR-CONC-05** Stock movement immutable; tidak ada UPDATE/DELETE setelah created.

### 3.3 Security
- **NFR-SEC-01** Password bcrypt cost 12; tidak pernah disimpan plaintext.
- **NFR-SEC-02** Session token httpOnly + secure + SameSite=Lax.
- **NFR-SEC-03** CSRF protection via NextAuth/Server Actions built-in.
- **NFR-SEC-04** SQL injection mitigated via Prisma parameterized queries.
- **NFR-SEC-05** Permission check di server-side (tidak hanya UI hide).
- **NFR-SEC-06** Rate limit login: 5 fail attempt / 15 menit per IP+username.
- **NFR-SEC-07** Audit log immutable; tidak ada cara delete dari UI.
- **NFR-SEC-08** Sensitive field di response (password_hash, dll) di-strip sebelum kirim ke client.

### 3.4 Availability & Backup
- **NFR-AVA-01** Target uptime 99% (jam operasional toko).
- **NFR-AVA-02** Backup Postgres harian otomatis (cron + pg_dump), retain 30 hari.
- **NFR-AVA-03** Snapshot StockBalance sebelum operasi besar (opname, mass adjustment).
- **NFR-AVA-04** Recovery point objective (RPO) 24 jam, recovery time objective (RTO) 4 jam.

### 3.5 Usability
- **NFR-UX-01** Bahasa UI Bahasa Indonesia.
- **NFR-UX-02** Form error inline + toast feedback untuk aksi.
- **NFR-UX-03** Loading state visible untuk operasi > 200ms.
- **NFR-UX-04** Confirm dialog untuk aksi destructive (delete, void, posting).
- **NFR-UX-05** Keyboard navigation lengkap di POS (mouse-free workflow).
- **NFR-UX-06** Format mata uang IDR dengan separator titik (Rp 1.234.567).
- **NFR-UX-07** Format tanggal Bahasa Indonesia (28 Mei 2026, 28/05/2026).
- **NFR-UX-08** Time zone Asia/Jakarta untuk display, UTC di database.

### 3.6 Compatibility
- **NFR-COMP-01** Browser support: Chrome/Edge 2 versi terakhir, Firefox terbaru.
- **NFR-COMP-02** Resolusi minimum: 1280x720 desktop, 768px tablet (POS only).
- **NFR-COMP-03** Tidak support IE atau browser legacy.

### 3.7 Maintainability
- **NFR-MAIN-01** TypeScript strict mode, no `any`.
- **NFR-MAIN-02** Module structure terisolasi (`src/modules/<domain>/`).
- **NFR-MAIN-03** Test coverage: domain service ~80%, integration critical flow 100%, E2E happy path 5 scenario.
- **NFR-MAIN-04** Lint + format pre-commit (ESLint + Prettier).
- **NFR-MAIN-05** Database migration via Prisma Migrate, semua perubahan via PR.

### 3.8 Logging
- **NFR-LOG-01** Structured log (pino) dengan level: info, warn, error.
- **NFR-LOG-02** Log mutation operations (create/update/delete/post) dengan actor + entity.
- **NFR-LOG-03** Error log dengan stack trace; tidak expose ke user (generic message saja).
- **NFR-LOG-04** Log file rotated harian, retain 30 hari.

## 4. External Interface

### 4.1 User Interface
Lihat `UI-UX-FLOW.md` untuk page map, navigation, dan layout spec.

### 4.2 Hardware Interface
- Optional barcode scanner USB (keyboard wedge mode, no driver khusus).
- Optional thermal printer 58mm/80mm (MVP: print via browser dialog ke thermal printer driver OS, no ESC/POS direct).

### 4.3 Software Interface
- Postgres 16 (driver: pg via Prisma).
- File storage: filesystem lokal (folder `/uploads`), accessed via Next.js static serve.

## 5. Constraints
- Single tenant, single perusahaan.
- Single database Postgres.
- Deployment di VPS Linux Ubuntu 22.04 (atau setara).
- Tidak ada offline mode di MVP.
