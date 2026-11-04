// SIMBA - Sistem Informasi Manajemen Barang | Inspektorat
"use strict";

// DAFTAR UNIT
const units = [
  "Irban I",
  "Irban II",
  "Irban III",
  "Irban IV",
  "Irbansus",
  "Kasubbag Evlap",
  "Kasubbag Umum",
  "Kasubbag Perencanaan dan Keuangan"
];

const $ = id => document.getElementById(id);

// MEMBACA DATA LOCAL STORAGE
const baca = (key, fallback = []) => {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : fallback;
  } catch (error) {
    return fallback;
  }
};

let barang = baca("simba_barang");
let pegawai = baca("simba_pegawai");
let pinjaman = baca("simba_pinjaman");

let user = null;
let fotoSementara = "";
let toastTimer;

// SIMPAN DATA
function simpanData() {
  try {
    localStorage.setItem("simba_barang", JSON.stringify(barang));
    localStorage.setItem("simba_pegawai", JSON.stringify(pegawai));
    localStorage.setItem("simba_pinjaman", JSON.stringify(pinjaman));
    return true;
  } catch (error) {
    alert("Penyimpanan penuh. Coba gunakan foto yang lebih kecil atau hapus beberapa data.");
    return false;
  }
}

// MENGAMANKAN TEKS INPUT
function aman(teks) {
  return String(teks ?? "").replace(/[&<>"']/g, karakter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[karakter]);
}

// GAMBAR PENGGANTI
function placeholder(nama) {
  const label = encodeURIComponent(String(nama || "Barang").slice(0, 25));
  return `https://placehold.co/500x400/FCE4EC/AD1457?text=${label}`;
}

// NOTIFIKASI
function pesan(teks) {
  const el = $("toast");

  if (!el) {
    alert(teks);
    return;
  }

  el.textContent = teks;
  el.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2600);
}

// TANGGAL HARI INI
function tanggalHariIni() {
  const d = new Date();
  const offset = d.getTimezoneOffset();

  return new Date(
    d.getTime() - offset * 60000
  ).toISOString().slice(0, 10);
}

// ==========================================
// LOADING SCREEN 5 DETIK
// ==========================================

function loading() {
  let nilai = 0;

  const interval = setInterval(() => {
    nilai = Math.min(nilai + 1, 100);

    $("progressBar").style.width = nilai + "%";
    $("progressText").textContent = nilai + "%";

    if (nilai >= 100) {
      clearInterval(interval);

      setTimeout(() => {
        $("loading").classList.add("hidden");
        $("loginPage").classList.remove("hidden");
      }, 120);
    }
  }, 50);
}

// ==========================================
// LOGIN ADMIN
// ==========================================

function login(e) {
  e.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;

  if (username === "admin" && password === "admin123") {

    user = {
      nama: "Administrator",
      role: "admin"
    };

    $("loginError").textContent = "";

    $("loginPage").classList.add("hidden");
    $("app").classList.remove("hidden");

    $("userName").textContent = user.nama;
    $("userRole").textContent = "Administrator";
    $("avatar").textContent = "A";

    document.querySelectorAll(".admin-only").forEach(el => {
      el.classList.remove("hidden");
    });

    $("tanggalPinjam").value = tanggalHariIni();

    tampilkanSemua();
    pindahHalaman("dashboard");

  } else {
    $("loginError").textContent = "Username atau password salah.";
  }
}

// ==========================================
// LOGOUT
// ==========================================

function logout() {
  if (!confirm("Yakin ingin keluar dari SIMBA?")) return;

  user = null;

  $("app").classList.add("hidden");
  $("loginPage").classList.remove("hidden");

  $("loginForm").reset();
  $("loginError").textContent = "";

  $("sidebar").classList.remove("open");
}

// ==========================================
// PINDAH HALAMAN
// ==========================================

function pindahHalaman(nama) {

  const halaman = $(nama);

  if (!halaman || !halaman.classList.contains("page")) return;

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  halaman.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === nama
    );
  });

  const nav = document.querySelector(`[data-page="${nama}"]`);

  $("pageTitle").textContent = nav
    ? nav.textContent.trim()
    : nama;

  $("sidebar").classList.remove("open");

  if (nama === "dashboard") renderDashboard();
  if (nama === "barang") renderBarang();
  if (nama === "katalog") renderKatalog();
  if (nama === "pegawai") renderPegawai();
  if (nama === "pengembalian") renderPengembalian();
}

// ==========================================
// TAMPILKAN SEMUA DATA
// ==========================================

function tampilkanSemua() {
  isiDropdown();
  renderBarang();
  renderKatalog();
  renderDashboard();
  renderPegawai();
  renderPengembalian();
}

// ==========================================
// DASHBOARD
// ==========================================

function renderDashboard() {

  // Total jenis barang
  $("totalBarang").textContent = barang.length;

  // Total stok tersedia
  $("totalStok").textContent = barang.reduce(
    (total, b) => total + Number(b.stok || 0),
    0
  );

  // Total barang sedang dipinjam
  $("totalPinjam").textContent = pinjaman
    .filter(p => !p.kembali)
    .reduce(
      (total, p) => total + Number(p.jumlah || 0),
      0
    );

  // Total transaksi pengembalian selesai
  $("totalKembali").textContent = pinjaman.filter(
    p => p.kembali
  ).length;

  // Barang terbaru
  const terbaru = barang.slice(-4).reverse();

  $("barangTerbaru").innerHTML = terbaru.length
    ? terbaru.map(b => `
        <div class="mini-item">
          <img src="${aman(b.foto || placeholder(b.nama))}" alt="${aman(b.nama)}">
          <b>${aman(b.nama)}</b>
        </div>
      `).join("")
    : '<div class="empty-state">Belum ada barang yang ditambahkan.</div>';
}

// ==========================================
// DATA BARANG
// ==========================================

function renderBarang() {

  const kata = $("cariBarang").value.toLowerCase().trim();
  const kategori = $("filterBarang").value;

  const data = barang.filter(b =>
    String(b.nama).toLowerCase().includes(kata) &&
    (!kategori || b.kategori === kategori)
  );

  $("tabelBarang").innerHTML = data.length
    ? data.map(b => `
        <tr>
          <td>
            <div class="table-item">
              <img src="${aman(b.foto || placeholder(b.nama))}" alt="">
              <b>${aman(b.nama)}</b>
            </div>
          </td>

          <td>${aman(b.kategori)}</td>
          <td>${Number(b.stok)}</td>

          <td>
            <button class="action-btn"
              type="button"
              onclick="editBarang(${Number(b.id)})"
              title="Edit">
              <i class="bi bi-pencil"></i>
            </button>

            <button class="action-btn"
              type="button"
              onclick="hapusBarang(${Number(b.id)})"
              title="Hapus">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `).join("")
    : '<tr><td colspan="4">Belum ada data barang.</td></tr>';
}

// ==========================================
// TAMBAH BARANG
// ==========================================

function bukaModalBarang() {

  $("formBarang").reset();

  $("editId").value = "";
  $("judulModal").textContent = "Tambah Barang";

  $("previewFoto").src = "";
  $("previewFoto").classList.add("hidden");

  fotoSementara = "";

  $("modalBarang").classList.remove("hidden");
  $("namaBarang").focus();
}

// ==========================================
// EDIT BARANG
// ==========================================

function editBarang(id) {

  const b = barang.find(
    x => Number(x.id) === Number(id)
  );

  if (!b) return;

  $("formBarang").reset();

  $("editId").value = b.id;
  $("judulModal").textContent = "Edit Barang";

  $("namaBarang").value = b.nama;
  $("kategoriBarang").value = b.kategori;
  $("stokBarang").value = b.stok;

  fotoSementara = b.foto || "";

  if (fotoSementara) {
    $("previewFoto").src = fotoSementara;
    $("previewFoto").classList.remove("hidden");
  } else {
    $("previewFoto").classList.add("hidden");
  }

  $("modalBarang").classList.remove("hidden");
}

// ==========================================
// HAPUS BARANG
// ==========================================

function hapusBarang(id) {

  const sedangDipinjam = pinjaman.some(
    p => Number(p.barangId) === Number(id) && !p.kembali
  );

  if (sedangDipinjam) {
    alert("Barang tidak dapat dihapus karena masih dipinjam.");
    return;
  }

  if (!confirm("Yakin ingin menghapus barang ini?")) return;

  barang = barang.filter(
    b => Number(b.id) !== Number(id)
  );

  simpanData();
  tampilkanSemua();

  pesan("Data barang berhasil dihapus.");
}

// ==========================================
// SIMPAN BARANG
// ==========================================

function simpanBarang(e) {

  e.preventDefault();

  const id = Number($("editId").value);
  const lama = barang.find(b => Number(b.id) === id);

  const nama = $("namaBarang").value.trim();
  const kategori = $("kategoriBarang").value;
  const stok = Number($("stokBarang").value);

  if (
    !nama ||
    !["ATK", "Elektronik"].includes(kategori) ||
    !Number.isInteger(stok) ||
    stok < 0
  ) {
    alert("Periksa kembali nama, kategori, dan jumlah stok barang.");
    return;
  }

  // Stok tidak boleh kurang dari jumlah yang sedang dipinjam.
  const sedangDipinjam = pinjaman
    .filter(p => Number(p.barangId) === id && !p.kembali)
    .reduce((sum, p) => sum + Number(p.jumlah), 0);

  if (lama && stok < sedangDipinjam) {
    alert(
      `Stok tidak boleh kurang dari ${sedangDipinjam}, karena jumlah tersebut masih dipinjam.`
    );
    return;
  }

  const data = {
    id: id || Date.now(),
    nama,
    kategori,
    stok,
    foto: fotoSementara || (
      lama ? lama.foto : placeholder(nama)
    )
  };

  if (lama) {
    barang = barang.map(b =>
      Number(b.id) === id ? data : b
    );
  } else {
    barang.push(data);
  }

  if (!simpanData()) return;

  $("modalBarang").classList.add("hidden");

  tampilkanSemua();

  pesan("Data barang berhasil disimpan.");
}

// ==========================================
// UPLOAD FOTO BARANG
// ==========================================

function uploadFoto(e) {

  const file = e.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("File harus berupa gambar.");
    e.target.value = "";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    alert("Ukuran foto maksimal 2 MB.");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    fotoSementara = reader.result;

    $("previewFoto").src = fotoSementara;
    $("previewFoto").classList.remove("hidden");
  };

  reader.onerror = () => {
    alert("Foto gagal dibaca. Silakan pilih foto lain.");
  };

  reader.readAsDataURL(file);
}

// ==========================================
// KATALOG BARANG
// ==========================================

function renderKatalog() {

  const kata = $("cariKatalog").value.toLowerCase().trim();
  const kategori = $("kategoriKatalog").value;

  const data = barang.filter(b =>
    String(b.nama).toLowerCase().includes(kata) &&
    (!kategori || b.kategori === kategori)
  );

  $("katalogGrid").innerHTML = data.length
    ? data.map(b => `
        <article class="catalog-card">
          <img
            src="${aman(b.foto || placeholder(b.nama))}"
            alt="${aman(b.nama)}">

          <div class="catalog-info">
            <h3>${aman(b.nama)}</h3>
            <span>
              ${aman(b.kategori)} · Stok ${Number(b.stok)}
            </span>
          </div>
        </article>
      `).join("")
    : '<div class="empty-state">Belum ada barang di katalog.</div>';
}

// ==========================================
// DATA PEGAWAI
// ==========================================

function renderPegawai() {

  const unit = $("filterUnit").value;

  const data = pegawai.filter(p =>
    !unit || p.unit === unit
  );

  $("tabelPegawai").innerHTML = data.length
    ? data.map(p => `
        <tr>
          <td>${aman(p.nama)}</td>
          <td>${aman(p.unit)}</td>
          <td>
            <button class="action-btn"
              type="button"
              onclick="hapusPegawai(${Number(p.id)})"
              title="Hapus">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `).join("")
    : '<tr><td colspan="3">Belum ada data pegawai.</td></tr>';
}

// ==========================================
// TAMBAH PEGAWAI
// ==========================================

function tambahPegawai() {

  $("formPegawai").reset();

  $("modalPegawai").classList.remove("hidden");
  $("inputNamaPegawai").focus();
}

function simpanPegawai(e) {

  e.preventDefault();

  const nama = $("inputNamaPegawai").value.trim();
  const unit = $("inputUnitPegawai").value;

  if (!nama || !units.includes(unit)) {
    alert("Lengkapi nama dan unit pegawai.");
    return;
  }

  const duplikat = pegawai.some(p =>
    p.nama.toLowerCase() === nama.toLowerCase() &&
    p.unit === unit
  );

  if (duplikat) {
    alert("Pegawai tersebut sudah terdaftar pada unit ini.");
    return;
  }

  pegawai.push({
    id: Date.now(),
    nama,
    unit
  });

  if (!simpanData()) return;

  $("modalPegawai").classList.add("hidden");

  tampilkanSemua();

  pesan("Data pegawai berhasil ditambahkan.");
}

// ==========================================
// HAPUS PEGAWAI
// ==========================================

function hapusPegawai(id) {

  const p = pegawai.find(
    x => Number(x.id) === Number(id)
  );

  if (!p) return;

  const masihAdaPinjaman = pinjaman.some(x =>
    x.nama === p.nama &&
    x.unit === p.unit &&
    !x.kembali
  );

  if (masihAdaPinjaman) {
    alert("Pegawai masih memiliki barang yang belum dikembalikan.");
    return;
  }

  if (!confirm("Yakin ingin menghapus pegawai ini?")) return;

  pegawai = pegawai.filter(
    x => Number(x.id) !== Number(id)
  );

  simpanData();
  tampilkanSemua();

  pesan("Data pegawai berhasil dihapus.");
}

// ==========================================
// DROPDOWN UNIT DAN BARANG
// ==========================================

function isiDropdown() {

  const options = units.map(u => `
    <option value="${aman(u)}">${aman(u)}</option>
  `).join("");

  $("unitPinjam").innerHTML =
    '<option value="">Pilih unit</option>' + options;

  $("filterUnit").innerHTML =
    '<option value="">Semua Unit</option>' + options;

  $("inputUnitPegawai").innerHTML =
    '<option value="">Pilih unit</option>' + options;

  isiDropdownBarang();
  isiNamaPegawai();
}

function isiDropdownBarang() {

  $("barangPinjam").innerHTML =
    '<option value="">Pilih barang</option>' +

    barang
      .filter(b => Number(b.stok) > 0)
      .map(b => `
        <option value="${Number(b.id)}">
          ${aman(b.nama)} (Stok ${Number(b.stok)})
        </option>
      `).join("");
}

// ==========================================
// PILIH NAMA PEGAWAI BERDASARKAN UNIT
// ==========================================

function isiNamaPegawai() {

  const unit = $("unitPinjam").value;

  const daftar = pegawai.filter(
    p => p.unit === unit
  );

  $("namaPinjam").innerHTML =
    '<option value="">Pilih nama pegawai</option>' +

    daftar.map(p => `
      <option value="${aman(p.nama)}">
        ${aman(p.nama)}
      </option>
    `).join("");

  $("namaPinjam").disabled = !unit || daftar.length === 0;
}

// ==========================================
// PEMINJAMAN BARANG
// ==========================================

function simpanPeminjaman(e) {

  e.preventDefault();

  const idBarang = Number($("barangPinjam").value);

  const b = barang.find(
    x => Number(x.id) === idBarang
  );

  const jumlah = Number($("jumlahPinjam").value);
  const nama = $("namaPinjam").value;
  const unit = $("unitPinjam").value;
  const tanggal = $("tanggalPinjam").value;

  if (!b || !nama || !unit || !tanggal) {
    alert("Lengkapi semua data peminjaman.");
    return;
  }

  if (
    !Number.isInteger(jumlah) ||
    jumlah < 1 ||
    jumlah > Number(b.stok)
  ) {
    alert("Jumlah barang tidak valid atau stok tidak mencukupi.");
    return;
  }

  pinjaman.push({
    id: Date.now(),
    barangId: b.id,
    barang: b.nama,
    nama,
    unit,
    jumlah,
    tanggal,
    kembali: false,
    tanggalKembali: ""
  });

  // Kurangi stok barang
  b.stok = Number(b.stok) - jumlah;

  if (!simpanData()) {
    pinjaman.pop();
    b.stok = Number(b.stok) + jumlah;
    return;
  }

  $("formPinjam").reset();

  $("tanggalPinjam").value = tanggalHariIni();

  isiDropdown();
  tampilkanSemua();

  pesan("Peminjaman berhasil disimpan.");
}

// ==========================================
// DATA PENGEMBALIAN
// ==========================================

function renderPengembalian() {

  const data = pinjaman.filter(
    p => !p.kembali
  );

  $("tabelKembali").innerHTML = data.length
    ? data.map(p => `
        <tr>
          <td>${aman(p.nama)}</td>
          <td>${aman(p.unit)}</td>
          <td>${aman(p.barang)}</td>
          <td>${Number(p.jumlah)}</td>
          <td>
            <button class="action-btn"
              type="button"
              onclick="kembalikan(${Number(p.id)})">
              <i class="bi bi-check-circle"></i>
              Kembalikan
            </button>
          </td>
        </tr>
      `).join("")
    : '<tr><td colspan="5">Tidak ada barang yang sedang dipinjam.</td></tr>';
}

// ==========================================
// PROSES PENGEMBALIAN
// ==========================================

function kembalikan(id) {

  const p = pinjaman.find(
    x => Number(x.id) === Number(id)
  );

  if (!p || p.kembali) return;

  if (!confirm(
    `Konfirmasi ${p.jumlah} ${p.barang} dari ${p.nama} sudah dikembalikan?`
  )) return;

  const b = barang.find(
    x => Number(x.id) === Number(p.barangId)
  );

  p.kembali = true;
  p.tanggalKembali = tanggalHariIni();

  // Tambahkan stok kembali
  if (b) {
    b.stok = Number(b.stok) + Number(p.jumlah);
  }

  if (!simpanData()) {
    p.kembali = false;
    p.tanggalKembali = "";

    if (b) {
      b.stok = Number(b.stok) - Number(p.jumlah);
    }

    return;
  }

  tampilkanSemua();

  pesan("Pengembalian berhasil. Stok barang sudah ditambahkan.");
}

// ==========================================
// TUTUP MODAL
// ==========================================

function tutupModal(id) {
  $(id).classList.add("hidden");
}

// ==========================================
// ATUR TANGGAL OTOMATIS
// ==========================================

function aturTanggal() {
  $("tanggalPinjam").value = tanggalHariIni();
}

// ==========================================
// JALANKAN APLIKASI
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

  // Loading
  loading();

  // Tanggal otomatis
  aturTanggal();

  // Login dan logout
  $("loginForm").addEventListener("submit", login);
  $("logoutBtn").addEventListener("click", logout);

  // Navigasi sidebar
  document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => {
      pindahHalaman(button.dataset.page);
    });
  });

  // Tombol lihat katalog
  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
      pindahHalaman(button.dataset.go);
    });
  });

  // Data barang
  $("tambahBarang").addEventListener("click", bukaModalBarang);
  $("formBarang").addEventListener("submit", simpanBarang);
  $("fotoBarang").addEventListener("change", uploadFoto);

  // Data pegawai
  $("tambahPegawai").addEventListener("click", tambahPegawai);
  $("formPegawai").addEventListener("submit", simpanPegawai);

  // Peminjaman
  $("formPinjam").addEventListener("submit", simpanPeminjaman);
  $("unitPinjam").addEventListener("change", isiNamaPegawai);

  // Pencarian dan filter barang
  $("cariBarang").addEventListener("input", renderBarang);
  $("filterBarang").addEventListener("change", renderBarang);

  // Pencarian dan filter katalog
  $("cariKatalog").addEventListener("input", renderKatalog);
  $("kategoriKatalog").addEventListener("change", renderKatalog);

  // Filter pegawai
  $("filterUnit").addEventListener("change", renderPegawai);

  // Tombol tutup modal
  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
      tutupModal(button.dataset.close);
    });
  });

  // Tutup modal saat area luar diklik
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
  });

  // Menu sidebar untuk HP
  $("mobileMenu").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });

});