const API_URL = 'https://uts-be-git-main-gita-utamis-projects.vercel.app/locations';

// --- DOM ELEMENTS ---
const form = document.getElementById('locationForm');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const nameInput = document.getElementById('locName');
const descInput = document.getElementById('locDesc');
const lonInput = document.getElementById('locLon');
const latInput = document.getElementById('locLat');
const tableBody = document.getElementById('locationTableBody');

// --- STATE ---
let currentEditId = null;

// --- MAP INITIALIZATION ---
const map = L.map('map').setView([-6.9175, 107.6191], 13); 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let geoJsonLayer = L.geoJSON().addTo(map);

// --- FUNCTIONS ---

// 1. Fetch Data
const fetchLocations = async () => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const featureCollection = await response.json();
        
        // A. Reset Layer Peta
        geoJsonLayer.clearLayers();
        geoJsonLayer.addData(featureCollection, {
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                const id = feature.id;
                const coords = feature.geometry.coordinates;
                
                const popupContent = `
                    <div style="min-width: 200px;">
                        <h3 style="margin: 0 0 5px 0; color: #2563EB; font-size: 16px;">${props.name}</h3>
                        <p style="margin: 0 0 10px 0; color: #4B5563; font-size: 14px;">${props.description}</p>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn-sm edit-btn" onclick="startEditMode('${id}', '${props.name}', '${props.description}', ${coords[1]}, ${coords[0]})">Edit</button>
                            <button class="btn-sm delete-btn" onclick="deleteLocation('${id}')">Hapus</button>
                        </div>
                    </div>
                `;
                layer.bindPopup(popupContent);
            }
        });

        // B. Reset Tabel
        tableBody.innerHTML = ''; 
        if (featureCollection.features) {
            featureCollection.features.forEach(feature => {
                const props = feature.properties;
                const id = feature.id;
                const coords = feature.geometry.coordinates;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="font-weight: 500;">${props.name}</td>
                    <td style="color: #666;">${props.description}</td>
                    <td>${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}</td>
                    <td>
                        <button class="btn-sm edit-btn" onclick="startEditMode('${id}', '${props.name}', '${props.description}', ${coords[1]}, ${coords[0]})">Edit</button>
                        <button class="btn-sm delete-btn" onclick="deleteLocation('${id}')">Hapus</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

    } catch (error) {
        console.error('Error fetching locations:', error);
        // SweetAlert Error
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Gagal mengambil data dari server! Pastikan backend berjalan di http://localhost:8080',
        });
    }
};

// 2. Reset Form
const resetForm = () => {
    currentEditId = null;
    form.reset();
    formTitle.textContent = 'Tambah Lokasi';
    submitBtn.textContent = 'Simpan';
    cancelBtn.style.display = 'none';
};

// 3. Handle Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validasi Input Koordinat dengan SweetAlert
    if(!latInput.value || !lonInput.value) {
        Swal.fire({
            icon: 'info',
            title: 'Koordinat Kosong',
            text: 'Silakan klik lokasi pada peta untuk mengisi Latitude & Longitude secara otomatis.',
            confirmButtonColor: '#2563EB'
        });
        return;
    }

    const geoJsonFeature = {
        type: 'Feature',
        properties: { name: nameInput.value, description: descInput.value },
        geometry: { type: 'Point', coordinates: [parseFloat(lonInput.value), parseFloat(latInput.value)] }
    };

    const method = currentEditId ? 'PUT' : 'POST';
    const url = currentEditId ? `${API_URL}/${currentEditId}` : API_URL;

    try {
        const res = await fetch(url, { 
            method, 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(geoJsonFeature) 
        });

        if (res.ok) {
            // SweetAlert Sukses (Timer otomatis hilang)
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: currentEditId ? 'Data lokasi berhasil diupdate.' : 'Data lokasi berhasil ditambahkan.',
                timer: 1500,
                showConfirmButton: false
            });

            resetForm();
            fetchLocations();
        } else {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Gagal menyimpan');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: error.message || 'Terjadi kesalahan saat menyimpan data.',
        });
    }
});

// 4. Handle Klik Peta
map.on('click', (e) => {
    latInput.value = e.latlng.lat.toFixed(6);
    lonInput.value = e.latlng.lng.toFixed(6);
});

cancelBtn.addEventListener('click', resetForm);

// --- GLOBAL FUNCTIONS ---

window.startEditMode = (id, name, description, lat, lon) => {
    currentEditId = id;
    nameInput.value = name;
    descInput.value = description;
    latInput.value = lat;
    lonInput.value = lon;
    formTitle.textContent = 'Edit Lokasi';
    submitBtn.textContent = 'Update Perubahan';
    cancelBtn.style.display = 'inline-block';
    nameInput.focus();
};

window.deleteLocation = async (id) => {
    // SweetAlert Konfirmasi Hapus
    const result = await Swal.fire({
        title: 'Hapus Lokasi?',
        text: "Data yang dihapus tidak dapat dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444', // Merah (sesuai tema CSS)
        cancelButtonColor: '#6B7280', // Abu-abu
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus!',
                    text: 'Data lokasi telah dihapus.',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchLocations();
            } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Gagal hapus');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: error.message || 'Gagal menghapus data lokasi.',
            });
        }
    }
};

// Initial Load
fetchLocations();