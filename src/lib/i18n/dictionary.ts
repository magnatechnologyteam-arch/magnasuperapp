/**
 * Tahap 33 — sistem terjemahan "by-source-string": alih-alih mengubah semua
 * label statis di navigation.ts/komponen jadi fungsi sadar-locale, kamus ini
 * memakai TEKS INDONESIA ASLI sebagai kunci (mis. DICT.en["Kelola Pengguna"]
 * = "Manage Users"). `t(locale, text)` mengembalikan `text` apa adanya kalau
 * locale-nya "id" atau kalau tidak ada entri terjemahan untuk teks itu — jadi
 * menambah bahasa baru atau menerjemahkan string tambahan tidak pernah
 * memaksa perubahan struktur data di tempat lain, cukup tambah baris di sini.
 *
 * CAKUPAN (jujur ke pengguna soal ini, lihat pesan yang menyertai rilis
 * fitur ini): "shell" aplikasi — Sidebar, MobileNav, Topbar, Dashboard Hub,
 * halaman Pengaturan, dan Pencarian Global. Halaman detail tiap modul
 * (Magnarent/Magnativ/Production/Admin) BELUM diterjemahkan — itu pekerjaan
 * lanjutan yang jauh lebih besar (ratusan string tersebar di puluhan
 * halaman) dan sengaja tidak dipaksakan sekaligus supaya kualitas
 * terjemahan yang sudah ada tetap terjaga.
 */

export type Locale = "id" | "en" | "ms" | "zh";

export const LOCALES: Locale[] = ["id", "en", "ms", "zh"];

type Dict = Record<string, string>;

const EN: Dict = {
  "Dashboard Hub": "Dashboard Hub",
  Modul: "Modules",
  Investor: "Investor",
  Admin: "Admin",
  "Akses Penuh": "Full Access",
  "Kelola Pengguna": "Manage Users",
  "Kirim Notifikasi": "Send Notification",
  Laporan: "Reports",
  Aktivitas: "Activity",
  "Klien Terpadu": "Unified Clients",
  "Piutang & Pendapatan": "Receivables & Revenue",
  "Katalog Produk": "Product Catalog",
  Faktur: "Invoices",
  "Arus Kas Proyek": "Project Cash Flow",
  "Pengajuan Modal": "Capital Request",
  "Status Sistem": "System Status",
  "Ringkasan Investor": "Investor Overview",
  "Buka menu": "Open menu",
  "Tutup menu": "Close menu",
  Menu: "Menu",
  "Selamat pagi": "Good morning",
  "Selamat siang": "Good afternoon",
  "Selamat sore": "Good evening",
  "Selamat malam": "Good night",
  Halo: "Hi",
  Pengguna: "User",
  Pengaturan: "Settings",
  Keluar: "Sign Out",
  "Selamat Datang": "Welcome",
  "Selamat Datang di MagnaSuperApp!": "Welcome to MagnaSuperApp!",
  "Semangat kerja hari ini — yuk pilih menu di bawah.":
    "Have a great workday — pick a menu below to get started.",
  "Ringkasan Cepat": "Quick Summary",
  "Mulai Cepat": "Quick Start",
  "Menu Kerja": "Work Menu",
  "Booking Aktif": "Active Bookings",
  "Menunggu & dikonfirmasi": "Pending & confirmed",
  "Booking Bulan Ini": "Bookings This Month",
  "Sejak tanggal 1 bulan ini": "Since the 1st of this month",
  "Proyek Berjalan": "Ongoing Projects",
  "Status: Berjalan": "Status: In progress",
  "Konten 7 Hari Ke Depan": "Content Due in 7 Days",
  "Terjadwal tayang minggu ini": "Scheduled to post this week",
  "Proyek Booth Aktif": "Active Booth Projects",
  "Desain sampai Instalasi": "Design through Installation",
  "Stok Menipis": "Low Stock",
  "Di titik minimum atau di bawahnya": "At or below minimum level",
  "Buat Booking Baru": "Create New Booking",
  "Tambah Klien": "Add Client",
  "Cek Stok Gudang": "Check Warehouse Stock",
  "Tracking Proyek Booth": "Track Booth Project",
  "Manajemen EO, creative agency & media sosial":
    "Event organizing, creative agency & social media management",
  "Rental booking, inventaris & kalender interaktif":
    "Rental bookings, inventory & interactive calendar",
  "Produksi booth, interior & material gudang":
    "Booth production, interiors & warehouse materials",
  Akun: "Account",
  "Foto profil, nama, tampilan, dan bahasa — cuma berlaku buat akunmu sendiri.":
    "Profile photo, name, appearance, and language — applies only to your own account.",
  Terang: "Light",
  Gelap: "Dark",
  "Ikuti Sistem": "Follow System",
  "Bahasa Indonesia": "Indonesian",
  "Tampilan & Bahasa": "Appearance & Language",
  Tema: "Theme",
  Bahasa: "Language",
  "Segera Hadir": "Coming Soon",
  Cari: "Search",
  "Cari booking, klien, invoice, dll…": "Search bookings, clients, invoices, etc…",
  "Ketik minimal {n} huruf untuk mulai cari.": "Type at least {n} characters to start searching.",
  "Tidak ada hasil untuk": "No results for",
};

const MS: Dict = {
  "Dashboard Hub": "Dashboard Hub",
  Modul: "Modul",
  Investor: "Pelabur",
  Admin: "Admin",
  "Akses Penuh": "Akses Penuh",
  "Kelola Pengguna": "Urus Pengguna",
  "Kirim Notifikasi": "Hantar Notifikasi",
  Laporan: "Laporan",
  Aktivitas: "Aktiviti",
  "Klien Terpadu": "Klien Bersepadu",
  "Piutang & Pendapatan": "Belum Terima & Pendapatan",
  "Katalog Produk": "Katalog Produk",
  Faktur: "Invois",
  "Arus Kas Proyek": "Aliran Tunai Projek",
  "Pengajuan Modal": "Permohonan Modal",
  "Status Sistem": "Status Sistem",
  "Ringkasan Investor": "Ringkasan Pelabur",
  "Buka menu": "Buka menu",
  "Tutup menu": "Tutup menu",
  Menu: "Menu",
  "Selamat pagi": "Selamat pagi",
  "Selamat siang": "Selamat tengah hari",
  "Selamat sore": "Selamat petang",
  "Selamat malam": "Selamat malam",
  Halo: "Helo",
  Pengguna: "Pengguna",
  Pengaturan: "Tetapan",
  Keluar: "Log Keluar",
  "Selamat Datang": "Selamat Datang",
  "Selamat Datang di MagnaSuperApp!": "Selamat Datang ke MagnaSuperApp!",
  "Semangat kerja hari ini — yuk pilih menu di bawah.":
    "Semoga hari bekerja anda hebat — pilih menu di bawah untuk mula.",
  "Ringkasan Cepat": "Ringkasan Pantas",
  "Mulai Cepat": "Mula Pantas",
  "Menu Kerja": "Menu Kerja",
  "Booking Aktif": "Tempahan Aktif",
  "Menunggu & dikonfirmasi": "Menunggu & disahkan",
  "Booking Bulan Ini": "Tempahan Bulan Ini",
  "Sejak tanggal 1 bulan ini": "Sejak 1hb bulan ini",
  "Proyek Berjalan": "Projek Berjalan",
  "Status: Berjalan": "Status: Sedang berjalan",
  "Konten 7 Hari Ke Depan": "Kandungan 7 Hari Akan Datang",
  "Terjadwal tayang minggu ini": "Dijadualkan siar minggu ini",
  "Proyek Booth Aktif": "Projek Booth Aktif",
  "Desain sampai Instalasi": "Reka Bentuk hingga Pemasangan",
  "Stok Menipis": "Stok Rendah",
  "Di titik minimum atau di bawahnya": "Pada atau di bawah tahap minimum",
  "Buat Booking Baru": "Buat Tempahan Baharu",
  "Tambah Klien": "Tambah Klien",
  "Cek Stok Gudang": "Semak Stok Gudang",
  "Tracking Proyek Booth": "Jejak Projek Booth",
  "Manajemen EO, creative agency & media sosial":
    "Pengurusan EO, agensi kreatif & media sosial",
  "Rental booking, inventaris & kalender interaktif":
    "Tempahan sewaan, inventori & kalendar interaktif",
  "Produksi booth, interior & material gudang":
    "Pengeluaran booth, interior & bahan gudang",
  Akun: "Akaun",
  "Foto profil, nama, tampilan, dan bahasa — cuma berlaku buat akunmu sendiri.":
    "Foto profil, nama, paparan, dan bahasa — hanya terpakai untuk akaun anda sendiri.",
  Terang: "Terang",
  Gelap: "Gelap",
  "Ikuti Sistem": "Ikut Sistem",
  "Bahasa Indonesia": "Bahasa Indonesia",
  "Tampilan & Bahasa": "Paparan & Bahasa",
  Tema: "Tema",
  Bahasa: "Bahasa",
  "Segera Hadir": "Akan Datang",
  Cari: "Cari",
  "Cari booking, klien, invoice, dll…": "Cari tempahan, klien, invois, dll…",
  "Ketik minimal {n} huruf untuk mulai cari.": "Taip sekurang-kurangnya {n} huruf untuk mula mencari.",
  "Tidak ada hasil untuk": "Tiada hasil untuk",
};

const ZH: Dict = {
  "Dashboard Hub": "仪表板中心",
  Modul: "模块",
  Investor: "投资者",
  Admin: "管理员",
  "Akses Penuh": "完全权限",
  "Kelola Pengguna": "管理用户",
  "Kirim Notifikasi": "发送通知",
  Laporan: "报表",
  Aktivitas: "活动记录",
  "Klien Terpadu": "统一客户",
  "Piutang & Pendapatan": "应收账款与收入",
  "Katalog Produk": "产品目录",
  Faktur: "发票",
  "Arus Kas Proyek": "项目现金流",
  "Pengajuan Modal": "资金申请",
  "Status Sistem": "系统状态",
  "Ringkasan Investor": "投资者概览",
  "Buka menu": "打开菜单",
  "Tutup menu": "关闭菜单",
  Menu: "菜单",
  "Selamat pagi": "早上好",
  "Selamat siang": "中午好",
  "Selamat sore": "下午好",
  "Selamat malam": "晚上好",
  Halo: "你好",
  Pengguna: "用户",
  Pengaturan: "设置",
  Keluar: "退出登录",
  "Selamat Datang": "欢迎",
  "Selamat Datang di MagnaSuperApp!": "欢迎使用 MagnaSuperApp！",
  "Semangat kerja hari ini — yuk pilih menu di bawah.":
    "祝你今天工作顺利——从下面的菜单开始吧。",
  "Ringkasan Cepat": "快速概览",
  "Mulai Cepat": "快速开始",
  "Menu Kerja": "工作菜单",
  "Booking Aktif": "进行中的预订",
  "Menunggu & dikonfirmasi": "待处理与已确认",
  "Booking Bulan Ini": "本月预订",
  "Sejak tanggal 1 bulan ini": "自本月1日起",
  "Proyek Berjalan": "进行中的项目",
  "Status: Berjalan": "状态：进行中",
  "Konten 7 Hari Ke Depan": "未来7天的内容",
  "Terjadwal tayang minggu ini": "本周计划发布",
  "Proyek Booth Aktif": "进行中的展位项目",
  "Desain sampai Instalasi": "从设计到安装",
  "Stok Menipis": "库存不足",
  "Di titik minimum atau di bawahnya": "处于或低于最低库存量",
  "Buat Booking Baru": "新建预订",
  "Tambah Klien": "添加客户",
  "Cek Stok Gudang": "查看仓库库存",
  "Tracking Proyek Booth": "跟踪展位项目",
  "Manajemen EO, creative agency & media sosial": "活动策划、创意代理与社交媒体管理",
  "Rental booking, inventaris & kalender interaktif": "租赁预订、库存与互动日历",
  "Produksi booth, interior & material gudang": "展位制作、室内装潢与仓库物料",
  Akun: "账户",
  "Foto profil, nama, tampilan, dan bahasa — cuma berlaku buat akunmu sendiri.":
    "头像、姓名、外观和语言设置——仅适用于你自己的账户。",
  Terang: "浅色",
  Gelap: "深色",
  "Ikuti Sistem": "跟随系统",
  "Bahasa Indonesia": "印尼语",
  "Tampilan & Bahasa": "外观与语言",
  Tema: "主题",
  Bahasa: "语言",
  "Segera Hadir": "即将推出",
  Cari: "搜索",
  "Cari booking, klien, invoice, dll…": "搜索预订、客户、发票等…",
  "Ketik minimal {n} huruf untuk mulai cari.": "请输入至少 {n} 个字符以开始搜索。",
  "Tidak ada hasil untuk": "没有找到相关结果",
};

const DICTIONARIES: Record<Exclude<Locale, "id">, Dict> = { en: EN, ms: MS, zh: ZH };

/**
 * Terjemahkan satu string sumber (Bahasa Indonesia) ke `locale` yang
 * diminta. Kalau localenya "id", atau tidak ada terjemahan terdaftar untuk
 * teks itu (belum masuk cakupan, lihat komentar di atas), kembalikan teks
 * aslinya apa adanya — jadi bagian aplikasi yang belum diterjemahkan tetap
 * tampil normal dalam Bahasa Indonesia, bukan kosong atau error.
 */
export function t(locale: Locale | null | undefined, text: string): string {
  if (!locale || locale === "id") return text;
  const dict = DICTIONARIES[locale];
  return dict?.[text] ?? text;
}

/** Varian `t()` untuk teks yang mengandung placeholder `{n}` (mis. jumlah huruf minimum pencarian). */
export function tn(locale: Locale | null | undefined, text: string, n: number): string {
  return t(locale, text).replace("{n}", String(n));
}
