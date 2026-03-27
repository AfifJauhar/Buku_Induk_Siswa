// ==================================================
// KONFIGURASI SUPABASE
// GANTI DENGAN URL DAN ANON KEY DARI PROJECT SUPABASE ANDA!
// ==================================================
const SUPABASE_URL = 'https://HKReNzsygbZ4zCandzHjqw_77wXxbhM.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaWRmaHBucGR3bHNjZnpiZG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzI4NzYsImV4cCI6MjA5MDEwODg3Nn0.-dFlLDJzavuVI8EY8Y8Jgy1EVO--Wt2bbxa7lGPpXLo';

// Inisialisasi Supabase (gunakan window.supabase yang sudah ada)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nama tabel di Supabase
const TABLE_NAME = 'siswa';

// Variabel global
let students = [];
let editMode = false;
let currentEditId = null;

// ==================================================
// UTILITY FUNCTIONS
// ==================================================

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = show ? 'flex' : 'none';
    }
}

function updateStatus(message, isError = false) {
    const statusDiv = document.getElementById('syncStatus');
    if (!statusDiv) return;
    statusDiv.innerHTML = message;
    statusDiv.style.background = isError ? 'rgba(220,53,69,0.8)' : 'rgba(40,167,69,0.8)';
    setTimeout(() => {
        statusDiv.style.background = 'rgba(212, 175, 55, 0.2)';
        statusDiv.innerHTML = '☁️ Terhubung ke Database Cloud';
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================================================
// FOTO FUNCTIONS
// ==================================================

function previewPhoto(input) {
    const preview = document.getElementById('photoPreview');
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 2 * 1024 * 1024) {
            showToast('Ukuran foto maksimal 2MB!', 'error');
            input.value = '';
            if (preview) preview.innerHTML = '<span>📸 Klik untuk upload foto</span>';
            return;
        }
        if (!file.type.match('image.*')) {
            showToast('Hanya file gambar yang diperbolehkan!', 'error');
            input.value = '';
            if (preview) preview.innerHTML = '<span>📸 Klik untuk upload foto</span>';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        };
        reader.readAsDataURL(file);
    }
}

function hapusFoto() {
    const fotoInput = document.getElementById('foto');
    const preview = document.getElementById('photoPreview');
    if (fotoInput) fotoInput.value = '';
    if (preview) preview.innerHTML = '<span>📸 Klik untuk upload foto</span>';
    showToast('Foto dihapus', 'info');
}

// ==================================================
// SUPABASE OPERATIONS (CRUD)
// ==================================================

// Upload foto ke Supabase Storage
async function uploadPhotoToStorage(file, nis) {
    const fileName = `${nis}_${Date.now()}.jpg`;
    const filePath = `foto_siswa/${fileName}`;
    
    const { data, error } = await supabaseClient.storage
        .from('foto-siswa')
        .upload(filePath, file);
    
    if (error) {
        console.error('Upload error:', error);
        throw error;
    }
    
    // Dapatkan URL publik
    const { data: urlData } = supabaseClient.storage
        .from('foto-siswa')
        .getPublicUrl(filePath);
    
    return urlData.publicUrl;
}

// Ambil semua data dari Supabase
async function loadDataFromSupabase() {
    showLoading(true);
    try {
        const { data, error } = await supabaseClient
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        students = data || [];
        renderTable();
        updateTotal();
        updateStatus('✅ Data berhasil dimuat dari cloud');
        showToast(`Memuat ${students.length} data siswa dari cloud`, 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        updateStatus('❌ Gagal memuat data dari cloud', true);
        showToast('Gagal memuat data. Periksa koneksi internet.', 'error');
    }
    showLoading(false);
}

// Simpan data ke Supabase
async function saveToSupabase(studentData) {
    const { data, error } = await supabaseClient
        .from(TABLE_NAME)
        .insert([studentData])
        .select();
    
    if (error) throw error;
    return data[0];
}

// Update data di Supabase
async function updateInSupabase(id, studentData) {
    const { data, error } = await supabaseClient
        .from(TABLE_NAME)
        .update(studentData)
        .eq('id', id)
        .select();
    
    if (error) throw error;
    return data[0];
}

// Hapus data dari Supabase
async function deleteFromSupabase(id) {
    const { error } = await supabaseClient
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    
    if (error) throw error;
}

// Hapus semua data
async function deleteAllFromSupabase() {
    const { error } = await supabaseClient
        .from(TABLE_NAME)
        .delete()
        .neq('id', 0);
    
    if (error) throw error;
}

// ==================================================
// FORM HANDLERS
// ==================================================

function resetForm() {
    document.getElementById('nis').value = '';
    document.getElementById('nama').value = '';
    document.getElementById('tempat_lahir').value = '';
    document.getElementById('tanggal_lahir').value = '';
    document.getElementById('alamat').value = '';
    document.getElementById('no_hp').value = '';
    document.getElementById('foto').value = '';
    document.getElementById('photoPreview').innerHTML = '<span>📸 Klik untuk upload foto</span>';
    editMode = false;
    currentEditId = null;
}

async function simpanData() {
    const nis = document.getElementById('nis').value.trim();
    const nama = document.getElementById('nama').value.trim();
    const tempat_lahir = document.getElementById('tempat_lahir').value;
    const tanggal_lahir = document.getElementById('tanggal_lahir').value;
    const alamat = document.getElementById('alamat').value;
    const no_hp = document.getElementById('no_hp').value;
    const fotoFile = document.getElementById('foto').files[0];

    if (!nis || !nama) {
        showToast('NIS dan Nama Lengkap wajib diisi!', 'error');
        return;
    }

    showLoading(true);
    
    try {
        let fotoUrl = '';
        
        // Upload foto jika ada
        if (fotoFile) {
            updateStatus('📤 Mengupload foto ke cloud...');
            fotoUrl = await uploadPhotoToStorage(fotoFile, nis);
        }
        
        const studentData = {
            nis,
            nama,
            tempat_lahir: tempat_lahir || '',
            tanggal_lahir: tanggal_lahir || '',
            alamat: alamat || '',
            no_hp: no_hp || '',
            foto_url: fotoUrl,
            updated_at: new Date().toISOString()
        };
        
        if (editMode && currentEditId) {
            // Update data
            await updateInSupabase(currentEditId, studentData);
            showToast('Data berhasil diupdate!', 'success');
        } else {
            // Cek duplikat NIS
            const existing = students.find(s => s.nis === nis);
            if (existing) {
                showToast('NIS sudah terdaftar!', 'error');
                showLoading(false);
                return;
            }
            // Tambah data baru
            studentData.created_at = new Date().toISOString();
            await saveToSupabase(studentData);
            showToast('Data berhasil disimpan ke cloud!', 'success');
        }
        
        await loadDataFromSupabase();
        resetForm();
        updateStatus('✅ Data tersimpan di cloud');
        
    } catch (error) {
        console.error('Error saving data:', error);
        showToast('Gagal menyimpan data: ' + error.message, 'error');
        updateStatus('❌ Gagal menyimpan data', true);
    }
    
    showLoading(false);
}

async function hapusData(id, nis) {
    if (!confirm(`Yakin ingin menghapus data siswa dengan NIS ${nis}?`)) return;
    
    showLoading(true);
    try {
        await deleteFromSupabase(id);
        showToast('Data berhasil dihapus!', 'success');
        await loadDataFromSupabase();
        updateStatus('✅ Data berhasil dihapus');
    } catch (error) {
        console.error('Error deleting data:', error);
        showToast('Gagal menghapus data', 'error');
    }
    showLoading(false);
}

async function hapusSemua() {
    if (!confirm('⚠️ PERINGATAN: Ini akan menghapus SEMUA data siswa! Lanjutkan?')) return;
    if (!confirm('Apakah Anda benar-benar yakin? Data tidak dapat dikembalikan!')) return;
    
    showLoading(true);
    try {
        await deleteAllFromSupabase();
        showToast('Semua data berhasil dihapus', 'info');
        await loadDataFromSupabase();
        updateStatus('✅ Semua data telah dihapus');
    } catch (error) {
        console.error('Error deleting all:', error);
        showToast('Gagal menghapus semua data', 'error');
    }
    showLoading(false);
}

function editData(id, student) {
    editMode = true;
    currentEditId = id;
    
    document.getElementById('nis').value = student.nis;
    document.getElementById('nama').value = student.nama;
    document.getElementById('tempat_lahir').value = student.tempat_lahir || '';
    document.getElementById('tanggal_lahir').value = student.tanggal_lahir || '';
    document.getElementById('alamat').value = student.alamat || '';
    document.getElementById('no_hp').value = student.no_hp || '';
    
    if (student.foto_url) {
        document.getElementById('photoPreview').innerHTML = `<img src="${student.foto_url}" style="width:100%;height:100%;object-fit:cover;">`;
    }
    
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    showToast(`Mengedit data: ${student.nama}`, 'info');
}

// ==================================================
// RENDER TABLE
// ==================================================

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    if (!students.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">📭 Belum ada data siswa. Silakan tambahkan melalui formulir.</td></tr>';
        return;
    }

    tbody.innerHTML = students.map((student, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(student.nis)}</strong></td>
            <td>${escapeHtml(student.nama)}</td>
            <td>${escapeHtml(student.tempat_lahir || '-')}</td>
            <td>${student.tanggal_lahir || '-'}</td>
            <td style="max-width:200px;">${escapeHtml(student.alamat || '-')}</td>
            <td>${student.no_hp || '-'}</td>
            <td>${student.foto_url ? `<img src="${student.foto_url}" class="student-photo" onclick="window.open('${student.foto_url}', '_blank')" title="Klik untuk perbesar">` : '<span style="color:#999;">📷 No photo</span>'}</td>
            <td class="no-print">
                <div class="action-btns">
                    <button class="btn btn-secondary btn-icon" onclick="editData('${student.id}', ${JSON.stringify(student).replace(/"/g, '&quot;')})">✏️ Edit</button>
                    <button class="btn btn-danger btn-icon" onclick="hapusData('${student.id}', '${student.nis}')">🗑️ Hapus</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateTotal() {
    const totalSpan = document.getElementById('totalSiswa');
    if (totalSpan) {
        totalSpan.innerHTML = `Total Siswa: ${students.length}`;
    }
}

// ==================================================
// EXPORT & PRINT
// ==================================================

function printTable() {
    window.print();
}

function exportToExcel() {
    if (!students.length) {
        showToast('Tidak ada data untuk diexport!', 'error');
        return;
    }
    
    let html = `
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Buku Induk Siswa MA Bidayatul Hidayah - TA 2026/2027</title>
        <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1f4d2c; color: #d4af37; }
            img { max-width: 60px; max-height: 60px; object-fit: cover; }
        </style>
    </head>
    <body>
        <h2>📖 BUKU INDUK SISWA</h2>
        <h3>MA Bidayatul Hidayah</h3>
        <p>Tahun Ajaran 2026/2027</p>
        <p>Tanggal Export: ${new Date().toLocaleString('id-ID')}</p>
        <p>Total Siswa: ${students.length}</p>
        <br>
        <table>
            <thead>
                <tr>
                    <th>No</th>
                    <th>NIS</th>
                    <th>Nama Lengkap</th>
                    <th>Tempat Lahir</th>
                    <th>Tanggal Lahir</th>
                    <th>Alamat</th>
                    <th>No HP</th>
                    <th>Foto</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    students.forEach((s, i) => {
        html += `
            <tr>
                <td>${i+1}</td>
                <td>${escapeHtml(s.nis)}</td>
                <td>${escapeHtml(s.nama)}</td>
                <td>${escapeHtml(s.tempat_lahir || '-')}</td>
                <td>${s.tanggal_lahir || '-'}</td>
                <td>${escapeHtml(s.alamat || '-')}</td>
                <td>${s.no_hp || '-'}</td>
                <td>${s.foto_url ? `<img src="${s.foto_url}" />` : '-'}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        <br>
        <p><em>Dicetak dari Aplikasi Buku Induk Siswa MA Bidayatul Hidayah</em></p>
    </body>
    </html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `Buku_Induk_Siswa_TA_2026-2027_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export Excel berhasil! Foto akan tampil di Excel', 'success');
}

// ==================================================
// INITIALIZATION
// ==================================================

// Event Listeners (pastikan elemen sudah ada)
document.addEventListener('DOMContentLoaded', function() {
    const btnSimpan = document.getElementById('btnSimpan');
    const btnBatal = document.getElementById('btnBatal');
    const btnCetak = document.getElementById('btnCetak');
    const btnHapusSemua = document.getElementById('btnHapusSemua');
    const btnExportExcel = document.getElementById('btnExportExcel');
    
    if (btnSimpan) btnSimpan.addEventListener('click', simpanData);
    if (btnBatal) btnBatal.addEventListener('click', resetForm);
    if (btnCetak) btnCetak.addEventListener('click', printTable);
    if (btnHapusSemua) btnHapusSemua.addEventListener('click', hapusSemua);
    if (btnExportExcel) btnExportExcel.addEventListener('click', exportToExcel);
    
    // Load data awal
    loadDataFromSupabase();
});