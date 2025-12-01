const API_URL = 'https://uts-be.vercel.app/locations';

const form = document.getElementById('locationForm');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const nameInput = document.getElementById('locName');
const descInput = document.getElementById('locDesc');
const lonInput = document.getElementById('locLon');
const latInput = document.getElementById('locLat');
const tableBody = document.getElementById('locationTableBody');

let currentEditId = null;

const map = L.map('map').setView([-6.9175, 107.6191], 13); 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let geoJsonLayer = L.geoJSON().addTo(map);

const fetchLocations = async () => {
    try {
        const response = await fetch(API_URL); // Request ke /locations
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const featureCollection = await response.json();
        
        geoJsonLayer.clearLayers();
        
        if (featureCollection.features && featureCollection.features.length > 0) {
            geoJsonLayer.addData(featureCollection, {
                onEachFeature: (feature, layer) => {
                    const props = feature.properties;
                    const id = feature.id; // ID ada di root object GeoJSON
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
        }

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
        Swal.fire({
            icon: 'error',
            title: 'Koneksi Gagal',
            text: 'Gagal mengambil data. Pastikan Backend sudah dideploy dan URL benar.',
        });
    }
};

const resetForm = () => {
    currentEditId = null;
    form.reset();
    formTitle.textContent = 'Tambah Lokasi';
    submitBtn.textContent = 'Simpan';
    cancelBtn.style.display = 'none';
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
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
    // Jika Edit, URL ditambah ID: .../locations/{id}
    const url = currentEditId ? `${API_URL}/${currentEditId}` : API_URL;

    try {
        const res = await fetch(url, { 
            method, 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(geoJsonFeature) 
        });

        if (res.ok) {
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
            throw new Error(errorData.error || 'Gagal menyimpan'); 
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

map.on('click', (e) => {
    latInput.value = e.latlng.lat.toFixed(6);
    lonInput.value = e.latlng.lng.toFixed(6);
});

cancelBtn.addEventListener('click', resetForm);

window.startEditMode = (id, name, description, lat, lon) => {
    currentEditId = id;
    nameInput.value = name;
    descInput.value = description;
    latInput.value = lat;
    lonInput.value = lon;
    
    formTitle.textContent = 'Edit Lokasi';
    submitBtn.textContent = 'Update Perubahan';
    cancelBtn.style.display = 'inline-block';
    
    form.scrollIntoView({ behavior: 'smooth' });
    nameInput.focus();
};

window.deleteLocation = async (id) => {
    const result = await Swal.fire({
        title: 'Hapus Lokasi?',
        text: "Data yang dihapus tidak dapat dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
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
                throw new Error('Gagal hapus');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Gagal menghapus data lokasi.',
            });
        }
    }
};

fetchLocations();