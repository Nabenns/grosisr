# UI/UX Flow — Sistem Manajemen Grosir

**Status:** Draft v1
**Tanggal:** 2026-05-28

## 1. Pendahuluan

Dokumen ini menjabarkan navigasi, page map, dan layout setiap halaman penting. Tidak berisi mockup pixel-perfect; cukup detail untuk implementor (level pseudo-wireframe). Mockup HTML dibuat per-page saat implementasi via skill `frontend-design`.

## 2. Prinsip Desain

- **Desktop-first** karena admin internal pakai PC. POS responsive ke tablet 768px.
- **Density tinggi** di list page (data grosir = banyak baris).
- **Form-heavy**: pakai 2-column layout, field grouping jelas.
- **Bahasa Indonesia** semua label & error message user-facing.
- **Light mode default**, dark mode optional via toggle di user menu.
- **Confirm dialog** untuk aksi destructive (delete, void, posting).
- **Optimistic UI** untuk operasi cepat (toggle is_active), confirmed UI untuk transaksi (loading + result).

## 3. Layout Global

```
+--------------------------------------------------------------+
|  TOPBAR                                                       |
|  [Logo]  [Search global cmd+K]   [Warehouse switcher] [🔔] [User▾] |
+----------+---------------------------------------------------+
|          |                                                    |
| SIDEBAR  |                                                    |
| (250px)  |                  MAIN CONTENT                      |
|          |  Breadcrumb > Page                                 |
|          |  ─────────────────────────────                     |
|          |  Page Title                  [Action buttons]      |
|          |                                                    |
|          |  Content area                                      |
|          |                                                    |
+----------+---------------------------------------------------+
                                                  [Toast]
```

**Topbar elements:**
- Logo + nama toko (klik → dashboard)
- Search global (Cmd/Ctrl+K): cari produk by SKU/barcode/nama, customer, supplier, no faktur. Hasil dikelompokkan dengan navigasi keyboard.
- Warehouse switcher (dropdown): tampilkan gudang yang user-nya punya akses; pilihan tersimpan di session, mengubah konteks list inventory/sale.
- Notifikasi (lonceng): hutang jatuh tempo, piutang lewat, transfer pending received, stok minimum.
- User menu: nama + role, link Profil, Pengaturan, Logout, toggle dark mode.

**Sidebar:**
Menu group seperti di brainstorming Section 3. Collapsible per group. Highlight item aktif. Bottom: link "Pengaturan" + version info.

## 4. Page Map

```
/login

/                                           # Dashboard

/master
  /master/products                          # List produk
  /master/products/new                      # Form tambah
  /master/products/[id]                     # Detail (tab: info, satuan, stok, history)
  /master/products/[id]/edit                # Form edit
  /master/products/import                   # Bulk import CSV
  /master/categories                        # List + inline edit
  /master/brands
  /master/units
  /master/suppliers
  /master/suppliers/[id]
  /master/customers
  /master/customers/[id]
  /master/warehouses

/inventory
  /inventory/stock                          # Saldo stok per gudang
  /inventory/stock/[productId]              # Kartu stok produk (riwayat movement)
  /inventory/adjustments                    # List
  /inventory/adjustments/new
  /inventory/adjustments/[id]
  /inventory/transfers
  /inventory/transfers/new
  /inventory/transfers/[id]
  /inventory/transfers/[id]/receive         # Halaman terima (gudang tujuan)
  /inventory/opname                         # Worksheet generator + posting

/purchase
  /purchase/orders
  /purchase/orders/new
  /purchase/orders/[id]
  /purchase/invoices
  /purchase/invoices/new                    # Bisa with ?poId=xxx
  /purchase/invoices/[id]
  /purchase/returns
  /purchase/returns/new                     # Pilih invoice referensi
  /purchase/returns/[id]

/sale
  /sale/pos                                 # POS layout
  /sale/invoices
  /sale/invoices/[id]
  /sale/returns
  /sale/returns/new
  /sale/returns/[id]

/finance
  /finance/payables
  /finance/payables/[id]
  /finance/payable-payments/new             # Bayar hutang (multi-payable)
  /finance/payable-payments/[id]
  /finance/receivables
  /finance/receivables/[id]
  /finance/receivable-payments/new
  /finance/receivable-payments/[id]

/report
  /report/stock
  /report/sale
  /report/purchase
  /report/payable
  /report/receivable

/settings
  /settings/users
  /settings/users/new
  /settings/users/[id]
  /settings/roles
  /settings/roles/[id]
  /settings/store                           # Profil toko
  /settings/general                         # Allow negative stock, dll
  /settings/audit-log
  /settings/profile                         # User self-service
```

## 5. Login Page

```
+----------------------------------------+
|                                        |
|         [Logo Toko]                    |
|                                        |
|     Sistem Manajemen Grosir            |
|                                        |
|     Username/Email   [____________]    |
|     Password         [____________]    |
|                      [ ] Ingat saya    |
|                                        |
|              [   Masuk   ]             |
|                                        |
|     Lupa password? Hubungi admin.      |
+----------------------------------------+
```

- Center card 400px wide, background gradient netral.
- Submit Enter.
- Error inline di bawah field (username/password salah).
- Setelah login → redirect ke `/` (atau intended URL dari `?from=`).

## 6. Dashboard

```
Breadcrumb: Beranda

[Card: Penjualan Hari Ini]  [Card: Total Stok]  [Card: Hutang]  [Card: Piutang]
  Rp 12.450.000               1.234 item            Rp 5.6jt        Rp 8.3jt
  ↑ 12% vs kemarin            di 2 gudang           5 supplier      12 customer

[Chart: Penjualan 7 Hari (bar)]              [Quick Actions]
                                              ▸ Buat Penjualan
                                              ▸ Tambah Produk
                                              ▸ Stok Opname
                                              ▸ Bayar Hutang

[Top 10 Produk Laris (30 hari)]              [Stok Minimum]
  1. Rokok X 16 batang          250 dus        Produk          Saldo  Min
  2. ...                                       Indomie Goreng    12   50
                                               ...
```

- 4 metric card di atas, full-width chart 7 hari + quick actions di kanan.
- 2 panel bawah: top sellers + low stock alert.
- Notifikasi hutang/piutang jatuh tempo masuk ke icon notif (top bar), bukan dashboard.

## 7. List Page Pattern (Universal)

Semua list page (Produk, Supplier, Customer, dll) ikut pattern ini:

```
Breadcrumb > Master > Produk

Produk                                              [+ Tambah Produk]  [↥ Import]
─────────────────────────────────────────────────────────────────────
[🔍 Cari SKU/nama/barcode]  [Kategori ▾] [Brand ▾] [Status ▾]  [⚙ Kolom]

┌───┬─────────────┬──────────────────┬──────────┬─────────┬──────────┬──────────┐
│ ☐ │ SKU         │ Nama             │ Kategori │ Harga   │ Total    │ Aksi     │
│   │             │                  │          │ Jual    │ Stok     │          │
├───┼─────────────┼──────────────────┼──────────┼─────────┼──────────┼──────────┤
│ ☐ │ RKK-001     │ Rokok X 16 btg   │ Rokok    │ 28.500  │ 250 dus  │ ⋯        │
│ ☐ │ MIE-001     │ Indomie Goreng   │ Mi       │  3.200  │ 1.200 pc │ ⋯        │
└───┴─────────────┴──────────────────┴──────────┴─────────┴──────────┴──────────┘

Bulk: [Aktifkan] [Nonaktifkan] [Export]   ◂ 1 2 3 ... 24 ▸   25/page ▾
```

**Komponen:**
- Toolbar: search (debounce 300ms, search di URL `?q=`), filter dropdown (kategori, brand, status), tombol kolom toggle.
- Table: sortable header, sticky header saat scroll, baris hover highlight, klik baris → detail.
- Bulk action bar muncul saat ada selection.
- Pagination + page size pilihan (25/50/100).
- Empty state: ilustrasi + pesan + CTA tombol tambah.
- Loading state: skeleton rows.
- Filter & search state preserved di URL (shareable, back button works).

## 8. Form Page Pattern (Universal)

```
Breadcrumb > Master > Produk > Tambah

Tambah Produk                                       [Batal] [Simpan]
─────────────────────────────────────────────────────────────────────

┌─ Informasi Dasar ────────────────────┐  ┌─ Status & Metadata ─────┐
│ SKU *          [____________]         │  │ Aktif      [✓]          │
│ Nama Produk *  [____________]         │  │ Kategori * [Rokok    ▾] │
│ Brand          [____________________] │  │ Brand      [_________▾] │
│ Deskripsi      [_____________________│  │ Foto       [Upload]     │
│                _____________________] │  └────────────────────────┘
└──────────────────────────────────────┘

┌─ Satuan & Harga ──────────────────────────────────────────────────┐
│ Base Unit *  [batang ▾]                                            │
│                                                                     │
│ ┌────────────┬───────────┬──────────┬──────────┬─────────┬────┐  │
│ │ Satuan     │ Konversi  │ Barcode  │ Harga    │ Harga   │ ⋯  │  │
│ │            │ ke base   │          │ Beli     │ Jual    │    │  │
│ ├────────────┼───────────┼──────────┼──────────┼─────────┼────┤  │
│ │ batang     │ 1         │          │   1.500  │   1.800 │ ⊖  │  │
│ │ pak ▾      │ 20        │ 893..    │  29.000  │  35.000 │ ⊖  │  │
│ │ slop ▾     │ 200       │          │ 290.000  │ 350.000 │ ⊖  │  │
│ └────────────┴───────────┴──────────┴──────────┴─────────┴────┘  │
│ [+ Tambah Satuan]                                                  │
│                                                                     │
│ ☑ Default beli: pak       ☑ Default jual: batang                   │
└────────────────────────────────────────────────────────────────────┘

┌─ Cukai & HET (khusus rokok) ──────────────────────────────────────┐
│ ☑ Produk kena cukai                                                │
│ ☑ Punya HET                                                        │
│   HET (per base unit) *  [Rp 1.900]                                │
│                                                                     │
│   ⚠ Harga jual semua satuan otomatis dicek vs HET                  │
└────────────────────────────────────────────────────────────────────┘

┌─ Stok Minimum ─────────────────────────────────────────────────────┐
│ Threshold global         [50]  base unit                            │
└────────────────────────────────────────────────────────────────────┘
```

- Validasi inline (zod via react-hook-form).
- Tombol Simpan disabled jika ada error.
- Edit mode: header tampil "Ubah Produk", pre-fill data, tambah tab di header (Info, Stok, History) untuk navigasi cepat.

## 9. Detail Produk (Tab Layout)

```
Breadcrumb > Master > Produk > Rokok X 16 batang

[← Kembali]                              [Ubah] [Nonaktifkan] [Hapus ⓘ]

Rokok X 16 batang
SKU: RKK-001 · Kategori: Rokok · Brand: X · Status: Aktif

[Tab: Info  |  Satuan & Harga  |  Stok per Gudang  |  History Movement  |  Audit]

═════════ TAB AKTIF: Stok per Gudang ═════════
┌────────────────┬──────────────┬─────────────┬───────────────┐
│ Gudang         │ Saldo (base) │ Min Stock   │ Aksi          │
├────────────────┼──────────────┼─────────────┼───────────────┤
│ Gudang Utama   │ 5.000 btg    │ 2.000       │ Adjust  Card  │
│ Gudang 2       │ 1.200 btg    │ 500         │ Adjust  Card  │
└────────────────┴──────────────┴─────────────┴───────────────┘

═════════ TAB AKTIF: History Movement ═════════
[Filter range tanggal]  [Tipe ▾]  [Gudang ▾]

┌─────────────┬──────────┬──────┬──────────┬────────┬──────────┬──────────┐
│ Tanggal     │ Tipe     │ Arah │ Gudang   │ Qty    │ Saldo    │ Referensi│
├─────────────┼──────────┼──────┼──────────┼────────┼──────────┼──────────┤
│ 28 Mei 2026 │ SALE     │ OUT  │ Utama    │ 20 btg │ 5.000    │ SO-...   │
│ 27 Mei 2026 │ PURCHASE │ IN   │ Utama    │1.000btg│ 5.020    │ INV-...  │
└─────────────┴──────────┴──────┴──────────┴────────┴──────────┴──────────┘
Saldo running computed via window function (immutable history).
```

## 10. POS / Kasir (Halaman Paling Sering Dipakai)

Layout 2-pane (60/40), full-screen friendly:

```
══════════════════════════════════════════════════════════════════════════
TOPBAR (slim, just user + warehouse + jam)               12:34 · Gudang Utama
══════════════════════════════════════════════════════════════════════════
┌───────────────────────────────────────────┬──────────────────────────┐
│ KIRI (60%)                                │ KANAN (40%)              │
│                                           │                          │
│ [🔍 SKU/barcode/nama        F2]           │ Customer                  │
│                                           │ [Walk-in            ▾ F4]│
│ ┌──────────────────────────────────────┐ │                          │
│ │ Cart                                 │ │ ─ Ringkasan ─            │
│ │ ┌──┬──────────┬─────┬───┬──────┬───┐│ │ Subtotal      Rp 45.000  │
│ │ │ #│ Produk   │ Sat │Qty│ Harga│Sub││ │ Diskon (-)    Rp  2.000  │
│ │ ├──┼──────────┼─────┼───┼──────┼───┤│ │ ─────────────────────────│
│ │ │ 1│ Rokok X  │ pak │ 1 │29000 │29k││ │ Total         Rp 43.000  │
│ │ │ 2│ Indomie  │ pcs │ 5 │ 3200 │16k││ │                          │
│ │ └──┴──────────┴─────┴───┴──────┴───┘│ │ Diskon faktur            │
│ │                                      │ │ [Rp ____] [%]            │
│ │ [F8] BAYAR                           │ │                          │
│ └──────────────────────────────────────┘ │ ┌─ Bayar ─────────────┐ │
│                                           │ │ Tipe: [TUNAI    ▾] │ │
│                                           │ │ Bayar:[__________] │ │
│                                           │ │ Kembali: Rp 7.000  │ │
│                                           │ │ [    BAYAR F8    ] │ │
│                                           │ └────────────────────┘ │
└───────────────────────────────────────────┴──────────────────────────┘
                                       [Esc] Batalkan cart
```

**Behavior:**
- Search bar always-focus saat tidak ada cart action; auto-focus kembali setelah scan/add.
- Scan barcode (input dari scanner USB keyboard wedge): cari ProductUnit by barcode → auto add 1 qty (atau increment kalau sudah ada).
- Search manual: dropdown autocomplete (max 8), arrow keys + Enter.
- Cart row: klik produk = highlight, [-] [+] qty inline, satuan dropdown, harga editable (jika punya `sale.discount.apply`), tombol hapus.
- Diskon per item: trigger via right-click row atau kolom diskon yang muncul saat row dipilih.
- Customer ganti: F4 → modal cari customer atau buat baru cepat (nama+phone saja).
- Pembayaran: F8 → focus ke kolom Bayar; Enter → posting + cetak struk + reset cart untuk transaksi berikut.
- Kalau customer CREDIT: panel Bayar diganti panel "Tempo" (due_date input + ringkasan), tidak perlu input cash.
- Esc: confirm clear cart.
- Tombol Hold Cart (opsional, defer dari MVP) untuk pause transaksi.

**Print struk:**
Setelah posting sukses, modal opsi Print:
```
✓ Penjualan berhasil disimpan: SO-202605-0231
Total: Rp 43.000 · Bayar: Rp 50.000 · Kembali: Rp 7.000

[Cetak Struk]  [Lewati]  [Lanjut Transaksi (Enter)]
```
Struk = HTML sederhana, browser print dialog (user pilih printer thermal di OS).

## 11. Faktur Pembelian (dari PO atau Direct)

```
Breadcrumb > Pembelian > Faktur > Baru

Faktur Pembelian Baru                       [Batal] [Simpan Draft] [Posting]
─────────────────────────────────────────────────────────────────────

[● Dari PO]  [○ Tanpa PO]
Pilih PO: [PO-202605-0012  Supplier ABC  ▾]   ← muncul kalau "Dari PO"
                                                  Klik = pre-fill items

┌─ Header ──────────────────────────────────┐
│ Supplier *      [ABC Distribusi      ▾]  │
│ Gudang Tujuan * [Gudang Utama        ▾]  │
│ No. Faktur Sup. [_________________]      │
│ Tgl Faktur *    [28 Mei 2026]            │
│ Jatuh Tempo *   [27 Jun 2026] (auto +30) │
└──────────────────────────────────────────┘

┌─ Item ────────────────────────────────────────────────────────────────┐
│ ┌────────────┬─────────┬─────┬────────┬──────────┬──────┬───────────┐│
│ │ Produk     │ Satuan  │ Qty │ Diterima│ Harga    │ Disc │ Subtotal  ││
│ │            │         │ PO  │ Sekarang│          │      │           ││
│ ├────────────┼─────────┼─────┼────────┼──────────┼──────┼───────────┤│
│ │ Rokok X    │ slop    │ 50  │ [50  ] │ 290.000  │  0   │14.500.000││
│ │ Indomie    │ dus     │ 100 │ [80  ] │ 110.000  │5.000 │ 8.400.000││
│ └────────────┴─────────┴─────┴────────┴──────────┴──────┴───────────┘│
│ [+ Tambah Item Manual]                                                │
└───────────────────────────────────────────────────────────────────────┘

┌─ Total ───────────────────┐
│ Subtotal      22.900.000  │
│ Diskon Faktur [_________] │
│ Pajak (PPN)   [_________] │
│ ─────────────────────────│
│ Total         22.900.000  │
└──────────────────────────┘
```

**Behavior:**
- Klik Posting = modal konfirmasi: "Posting akan menambahkan stok dan membuat hutang. Lanjut?"
- Posting irreversible kecuali via Void (permission khusus + alasan).
- Setelah posting → redirect ke detail invoice + tampil pesan sukses dengan link ke Hutang yang baru terbuat.

## 12. Stock Transfer

**Buat Transfer:**
```
Breadcrumb > Inventaris > Mutasi > Baru

Mutasi Antar Gudang                              [Batal] [Simpan Draft] [Kirim]
─────────────────────────────────────────────────────────────────────

Dari Gudang *  [Gudang Utama  ▾]
Ke Gudang *    [Gudang 2      ▾]   (≠ asal)
Catatan        [_________________]

[+ Tambah Item]
┌────────────┬─────────┬───────┬──────────────┐
│ Produk     │ Satuan  │ Qty   │ Saldo Asal   │
├────────────┼─────────┼───────┼──────────────┤
│ Rokok X    │ slop    │ 5     │ 25 slop      │
│ Indomie    │ dus     │ 10    │ 50 dus       │
└────────────┴─────────┴───────┴──────────────┘
```

- Klik "Kirim": status DRAFT → IN_TRANSIT, kurangi stok asal.
- Konfirmasi modal: "Stok dari [Asal] akan dikurangi. Lanjut?"

**Terima Transfer (di gudang tujuan):**
```
Breadcrumb > Inventaris > Mutasi > XFR-202605-0007 > Terima

Penerimaan Mutasi XFR-202605-0007                              [Batal] [Terima]
Asal: Gudang Utama → Tujuan: Gudang 2
Dikirim: 28 Mei 2026 oleh Budi

┌────────────┬─────────┬───────────┬──────────────┐
│ Produk     │ Satuan  │ Qty Kirim │ Qty Terima * │
├────────────┼─────────┼───────────┼──────────────┤
│ Rokok X    │ slop    │ 5         │ [5  ]        │
│ Indomie    │ dus     │ 10        │ [10 ]        │
└────────────┴─────────┴───────────┴──────────────┘
```

- Qty terima default = qty kirim. Jika beda → otomatis generate StockAdjustment dengan reason=KOREKSI di gudang asal untuk selisih.
- Catatan opsional kalau ada selisih.

## 13. Stock Opname

```
Breadcrumb > Inventaris > Opname

Stok Opname                                        [Batal] [Generate]
─────────────────────────────────────────────────────────────────────

Step 1: Pilih ruang lingkup
Gudang *      [Gudang Utama  ▾]
Kategori      [Semua         ▾] (filter optional)
Tanggal Cutoff[28 Mei 2026 12:00]

[Generate Worksheet]

══════════ Setelah Generate ══════════

Step 2: Input qty fisik
Worksheet snapshot saldo per cutoff. Cetak/export dulu, isi di lapangan, lalu input.

[Cari produk di worksheet]   [↥ Import dari Excel]

┌────────────┬──────────┬─────────────┬──────────────┬──────────┐
│ Produk     │ Saldo    │ Qty Fisik * │ Selisih      │ Catatan  │
│            │ Sistem   │             │              │          │
├────────────┼──────────┼─────────────┼──────────────┼──────────┤
│ Rokok X    │ 5.000btg │ [4.985 ]    │ -15 (rusak?) │ [____]   │
│ Indomie    │ 1.200pc  │ [1.200 ]    │ 0            │          │
└────────────┴──────────┴─────────────┴──────────────┴──────────┘
                Total selisih: -15 batang        [Preview Selisih]

Step 3: Posting
[Posting Adjustment]    ← bikin StockAdjustment dengan reason=OPNAME
```

- Worksheet snapshot disimpan di session/draft sampai posting.
- Diff: highlight merah (negatif), hijau (positif).
- Posting = adjustment posting (lihat SDD §4.6).

## 14. Bayar Hutang (Multi-Payable)

```
Breadcrumb > Keuangan > Pembayaran Hutang > Baru

Bayar Hutang                                        [Batal] [Simpan]
─────────────────────────────────────────────────────────────────────

Supplier *      [ABC Distribusi          ▾]
Tgl Bayar *     [28 Mei 2026]
Metode *        [TRANSFER ▾]
No. Referensi   [TRX123456]
Catatan         [_________________]

Pilih Faktur untuk dibayar (sortir ASC due date):
┌──┬──────────────┬───────────┬───────────┬──────────┬───────────┬─────────┐
│☐ │ No. Faktur   │ Tgl       │ Total     │ Sudah    │ Sisa      │ Bayar   │
├──┼──────────────┼───────────┼───────────┼──────────┼───────────┼─────────┤
│☑ │ INV-...0001  │ 1 Mei     │ 5.000.000 │ 0        │ 5.000.000 │[5000000]│
│☑ │ INV-...0005  │ 10 Mei    │ 3.200.000 │ 0        │ 3.200.000 │[2000000]│
│☐ │ INV-...0008  │ 25 Mei    │ 1.500.000 │ 0        │ 1.500.000 │[      0]│
└──┴──────────────┴───────────┴───────────┴──────────┴───────────┴─────────┘

                                            Total Bayar: Rp 7.000.000
[Simpan Pembayaran]
```

- Default sortir ASC by due_date (FIFO).
- Klik checkbox = aktifkan kolom Bayar; default = sisa (pelunasan penuh).
- User bisa edit angka Bayar (partial payment ≤ sisa).
- Validasi: total semua kolom Bayar > 0.
- Setelah simpan: redirect ke detail PayablePayment dengan rincian apply.

Pattern serupa untuk **Pelunasan Piutang** (`/finance/receivable-payments/new`).

## 15. Laporan Page Pattern

```
Breadcrumb > Laporan > Penjualan

Laporan Penjualan                                       [↧ Export ▾]
─────────────────────────────────────────────────────────────────────

[Range tgl: 1 Mei - 28 Mei 2026]  [Group: Per Produk ▾]  [Gudang: Semua ▾]
[Customer: Semua ▾] [Kasir: Semua ▾]                    [Terapkan Filter]

═════════════════════════════════════════════════════════════════════
Ringkasan
  Total Faktur: 421         Total Item: 3.245
  Total Penjualan: Rp 245.600.000   Diskon: Rp 4.200.000
  Net: Rp 241.400.000
═════════════════════════════════════════════════════════════════════

Detail (group by Produk)
┌────────────────┬───────┬──────────────┬──────────┬──────────────┐
│ Produk         │ Qty   │ Total Jual   │ Diskon   │ Net          │
├────────────────┼───────┼──────────────┼──────────┼──────────────┤
│ Rokok X 16 btg │ 250   │  72.500.000  │  500.000 │  72.000.000  │
│ ▾ klik untuk drill down per faktur                              │
│ ...                                                              │
└────────────────┴───────┴──────────────┴──────────┴──────────────┘
```

- Filter sticky di top, hasil reload via "Terapkan" (bukan onChange) untuk hindari heavy query tiap interaksi.
- Group by toggle: Per Produk / Per Kategori / Per Customer / Per Kasir / Per Tanggal.
- Drill down: klik baris → modal/inline expand list faktur kontributor.
- Export: CSV (raw), Excel (formatted), PDF (printable).
- URL state: filter masuk query string (shareable).

## 16. Settings — User & Role

**User list & form** standar (pattern §7-§8). Role assignment via tag picker multi-select.

**Role page:**
```
Breadcrumb > Pengaturan > Role > KASIR

Role: KASIR                                          [Batal] [Simpan]
Nama        [KASIR]
Deskripsi   [Operator kasir]

Permissions
[ ] product.read
[✓] sale.read
[✓] sale.write
[✓] sale.post
[✓] sale.discount.apply
[ ] sale.discount.high
[✓] customer.read
[✓] customer.write
...
[ ] role.write          ← disabled, tooltip "OWNER only"
```

- Group by modul (collapsible accordion).
- Search permission box di atas.
- Custom role: bisa create selain default 5 role.
- OWNER role: tidak bisa diedit/dihapus (`isSystem=true`).

## 17. Activity Log

```
Breadcrumb > Pengaturan > Activity Log

Activity Log                                          [↧ Export]
─────────────────────────────────────────────────────────────────────

[Range tgl] [Aktor ▾] [Entity ▾] [Action ▾] [Search]    [Terapkan]

┌──────────────────┬──────────┬─────────────┬────────┬─────────────┐
│ Tanggal          │ Aktor    │ Entity      │ Action │ Ringkasan   │
├──────────────────┼──────────┼─────────────┼────────┼─────────────┤
│ 28 Mei 12:34     │ Budi     │ SaleInvoice │ POST   │ SO-...0231  │
│ 28 Mei 11:50     │ Siti     │ Product     │ UPDATE │ Rokok X     │
│   Klik baris → modal diff JSON before/after                      │
│ ...                                                                │
└──────────────────┴──────────┴─────────────┴────────┴─────────────┘
```

- Klik baris UPDATE: modal tampilkan diff field-by-field dengan styling old vs new.
- Filter URL state.
- Read-only (audit log immutable).

## 18. Notifikasi (Topbar Bell)

Klik 🔔 → dropdown panel:

```
┌─ Notifikasi (5) ────────────────────────┐
│ ⚠ 3 hutang jatuh tempo dalam 7 hari      │
│   [Lihat]                                │
│ 🔴 2 piutang lewat jatuh tempo           │
│   [Lihat]                                │
│ 📦 1 transfer menunggu diterima          │
│   XFR-...0007 ke Gudang 2                │
│ 📉 5 produk di bawah stok minimum        │
│ ─────────                                │
│ [Tandai semua dibaca]  [Lihat semua]    │
└──────────────────────────────────────────┘
```

- Polling 60 detik (atau revalidate on focus).
- Click item = navigasi ke halaman terkait dengan filter pre-applied.

## 19. Empty States & Error States

**Empty list:**
```
       📦
   Belum ada produk
   Mulai dengan menambah produk atau import dari Excel.
   [+ Tambah Produk]   [↥ Import]
```

**Error page (500):**
```
       ⚠
   Terjadi kesalahan
   Tim sudah dinotifikasi. Silakan coba lagi.
   [Coba Lagi]   [Kembali ke Beranda]
```

**Forbidden (403):**
```
       🔒
   Akses ditolak
   Kamu tidak punya izin untuk halaman ini.
   Hubungi admin kalau perlu akses.
   [Kembali]
```

## 20. Responsive & Mobile

- **Desktop (≥1280px):** layout normal seperti spec di atas.
- **Tablet (768-1279):** sidebar collapse jadi icon-only, content full-width. POS responsive (2-pane vertical stack).
- **Mobile (<768):** read-only dashboard + view daftar; transaksi/edit dibatasi.
- POS halaman khusus: tablet-friendly (target untuk kasir keliling pakai tablet 10").

## 21. Accessibility (Targeted, Not Full WCAG)

- Semua interaksi keyboard-reachable (tab order logical, focus ring visible).
- Form label proper (htmlFor), aria-describedby untuk error.
- Color contrast minimal AA (4.5:1 text normal, 3:1 large).
- Modal trap focus + Esc to close.
- Tabel ARIA: caption, scope th.
- Tidak target full WCAG AA compliance di MVP (defer untuk audit terpisah).

## 22. Style Token (Singkat)

- Font: Inter atau system-ui (default shadcn).
- Color palette: shadcn default (slate base) + accent: emerald (positif), red (negatif/destructive), amber (warning).
- Spacing: 4/8/12/16/24/32 px scale.
- Border radius: 6px default, 8px card.
- Shadow: shadcn default (sm/md/lg).
- Density: compact (table row 36px height, button md=32px).

## 23. Out of UI Scope (MVP)

- Drag-drop untuk reorder.
- Inline editing di list (kecuali toggle aktif/nonaktif).
- Komentar/diskusi di transaksi.
- Lampiran file di transaksi (PO PDF supplier, dll) — defer.
- Import wizard kompleks (mapping kolom). MVP cuma template fix.
- Print server integration (ESC/POS direct). MVP browser print only.
- Multi-language (cuma ID).

## 24. Mockup HTML

Mockup HTML detail per halaman akan dibuat saat implementasi tiap modul (M1-M3) menggunakan skill `frontend-design`. Spec di atas cukup sebagai blueprint untuk implementor.
