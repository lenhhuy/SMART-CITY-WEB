// ==========================================
// CONFIGURATION & DEMO DATA
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAr8swHvTGLhmXOcmpUnQmNdz1R1EXSb2s",
    authDomain: "smart-city-dashboard-72269.firebaseapp.com",
    databaseURL: "https://smart-city-dashboard-72269-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "smart-city-dashboard-72269",
    storageBucket: "smart-city-dashboard-72269.firebasestorage.app",
    messagingSenderId: "475195279309",
    appId: "1:475195279309:web:8a3c05df9c6b07e63c6684",
    measurementId: "G-H2ZG6ZR17C"
};

const demoData = {
    environment: { aqi: 45, pm25: 18, temperature: 28, humidity: 65 },
    parking: [
        { id: 1, name: "Bãi đỗ xe Vincom", address: "72 Lê Thánh Tôn, Q.1", available: 45, total: 200, lat: 10.7769, lng: 106.7009 },
        { id: 2, name: "Bãi đỗ xe Diamond", address: "34 Lê Duẩn, Q.1", available: 23, total: 150, lat: 10.7811, lng: 106.6992 },
        { id: 3, name: "Bãi đỗ xe Takashimaya", address: "65 Lê Lợi, Q.1", available: 67, total: 300, lat: 10.7731, lng: 106.7001 }
    ],
    cameras: [
        { id: 1, name: "Camera Ngã tư Phú Nhuận", vehicles: 234, violations: 3 },
        { id: 2, name: "Camera Cầu Sài Gòn", vehicles: 789, violations: 2 }
    ],
    traffic: { totalVehicles: 12453, avgSpeed: 32, incidents: 7 },
    trafficPoints: [
        { lat: 10.7769, lng: 106.7009, density: 'low' },
        { lat: 10.7879, lng: 106.6972, density: 'high' },
        { lat: 10.8045, lng: 106.7321, density: 'medium' }
    ]
};

let database, map;
let trafficChart, speedChart, incidentsChart;
let trafficMarkers = [];

// AI Algorithm: Tạo mảng 24h ngẫu nhiên quanh giá trị trung bình
function generateAIChartData(avg, volatility = 0.2) {
    return Array.from({length: 24}, () => Math.round(avg + (Math.random() - 0.5) * 2 * (avg * volatility)));
}

// ==========================================
// INITIALIZATION
// ==========================================
function initApp() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    database = firebase.database();

    initMap();
    setupFirebaseListeners();
    setupControlListeners();
    
    // Khởi tạo giao diện với dữ liệu Demo ngay lập tức
    updateParkingUI(demoData.parking);
    updateCameraUI(demoData.cameras);
    showTrafficLayer();

    setInterval(() => {
        const dtEl = document.getElementById('datetime');
        if(dtEl) dtEl.textContent = new Date().toLocaleString('vi-VN');
    }, 1000);
}

function initMap() {
    map = L.map('cityMap', { zoomControl: false }).setView([10.7879, 106.6972], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
}

// ==========================================
// UI RENDERING FUNCTIONS
// ==========================================
function updateParkingUI(parkingData) {
    const container = document.getElementById('parkingList');
    if (!container) return;
    container.innerHTML = '';
    let availableSum = 0;
    parkingData.forEach(p => {
        availableSum += p.available;
        container.innerHTML += `
            <div class="parking-item">
                <div class="parking-info"><h4>${p.name}</h4><p>${p.address}</p></div>
                <div class="parking-slots">
                    <div class="available" style="color:var(--cyan-primary);font-family:Orbitron;font-size:1.5rem">${p.available}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary)">/ ${p.total}</div>
                </div>
            </div>`;
    });
    const totalEl = document.getElementById('parkingAvailable');
    if(totalEl) totalEl.textContent = availableSum;
}

function updateCameraUI(cameraData) {
    const container = document.getElementById('cameraGrid');
    if (!container) return;
    container.innerHTML = '';
    cameraData.forEach(c => {
        container.innerHTML += `
            <div class="camera-card">
                <div class="camera-feed"><div class="live-badge">Live</div><div class="camera-placeholder">CAM FEED: ${c.name}</div></div>
                <div class="camera-info"><h4>${c.name}</h4><span>Lưu lượng: ${c.vehicles} xe/h</span></div>
            </div>`;
    });
}

function showTrafficLayer() {
    trafficMarkers.forEach(m => map.removeLayer(m));
    const colors = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
    demoData.trafficPoints.forEach(p => {
        const m = L.circleMarker([p.lat, p.lng], { radius: 20, color: colors[p.density], fillOpacity: 0.4 }).addTo(map);
        trafficMarkers.push(m);
    });
}

function showParkingLayer() {
    trafficMarkers.forEach(m => map.removeLayer(m));
    demoData.parking.forEach(p => {
        const m = L.marker([p.lat, p.lng]).addTo(map).bindPopup(p.name);
        trafficMarkers.push(m);
    });
}

// ==========================================
// NAVIGATION & TAB SWITCH
// ==========================================
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const targetSection = document.getElementById(tab + '-section');
    if(targetSection) targetSection.classList.add('active');
    
    // Đồng bộ nút bấm nav-dash hoặc nav-ctrl
    const btnId = tab === 'dashboard' ? 'nav-dash' : 'nav-ctrl';
    const btnEl = document.getElementById(btnId);
    if(btnEl) btnEl.classList.add('active');

    if(map) setTimeout(() => map.invalidateSize(), 200);
}

// Tương thích với HTML gọi switchPage
function switchPage(page) { switchTab(page); }

// ==========================================
// CHARTS UPDATE (AI DRIVEN)
// ==========================================
function updateCharts(avgVeh, avgSpd, inc) {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Rajdhani' } } },
            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Rajdhani' } } }
        }
    };

    // 1. Lưu lượng xe
    if (!trafficChart) {
        const ctx = document.getElementById('trafficLineChart').getContext('2d');
        trafficChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => i + 'h'),
                datasets: [{ data: generateAIChartData(avgVeh || 500), borderColor: '#00fff7', fill: true, backgroundColor: 'rgba(0,255,247,0.1)', tension: 0.4, pointRadius: 0 }]
            },
            options: { ...commonOptions, scales: { x: { display: false }, y: { display: false } } }
        });
    }

    // 2. Tốc độ trung bình
    if (!speedChart) {
        const ctx = document.getElementById('speedLineChart').getContext('2d');
        speedChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => i + 'h'),
                datasets: [{ data: generateAIChartData(avgSpd || 40), borderColor: '#00d4ff', tension: 0.4, pointRadius: 0 }]
            },
            options: { ...commonOptions, scales: { x: { display: false }, y: { display: false } } }
        });
    }

    // 3. Sự cố tích lũy (Đã sửa lỗi không hiện)
    const incCanvas = document.getElementById('incidentsBarChart');
    if (incCanvas) {
        const val = parseInt(inc) || 8;
        const incidentData = [Math.round(val * 0.2), Math.round(val * 0.3), Math.round(val * 0.1), Math.round(val * 0.4)];
        
        if (!incidentsChart) {
            incidentsChart = new Chart(incCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    datasets: [{ data: incidentData, backgroundColor: '#ef4444', borderRadius: 4, barPercentage: 0.6 }]
                },
                options: { ...commonOptions, indexAxis: 'y' }
            });
        } else {
            incidentsChart.data.datasets[0].data = incidentData;
            incidentsChart.update();
        }
    }
}

// ==========================================
// FIREBASE LISTENERS
// ==========================================
function setupFirebaseListeners() {
    database.ref('environment').on('value', snap => {
        const d = snap.val();
        if(d) {
            document.getElementById('aqiValue').textContent = d.aqi || '--';
            document.getElementById('tempValue').textContent = d.temperature || '--';
            document.getElementById('humidityValue').textContent = d.humidity || '--';
            document.getElementById('pm25Value').textContent = d.pm25 || '--';
        }
    });

    database.ref('traffic').on('value', snap => {
        const d = snap.val() || demoData.traffic;
        document.getElementById('totalVehicles').textContent = (d.totalVehicles || 0).toLocaleString();
        document.getElementById('avgSpeed').textContent = d.avgSpeed || 0;
        document.getElementById('incidents').textContent = d.incidents || 0;
        updateCharts(d.totalVehicles/24, d.avgSpeed, d.incidents);
        
        // Ẩn lớp loading khi nhận được dữ liệu quan trọng
        const loader = document.getElementById('loadingOverlay');
        if(loader) loader.classList.add('hidden');
    });

    database.ref('parking').on('value', snap => {
        if(snap.val()) updateParkingUI(Object.values(snap.val()));
    });
}

function setupControlListeners() {
    database.ref('controls').on('value', snap => {
        const d = snap.val();
        if(d) {
            ['light', 'camera', 'sensor'].forEach(dev => {
                const card = document.getElementById('card-' + dev);
                const txt = document.getElementById('status-' + dev);
                if(card) d[dev] === 1 ? card.classList.add('on') : card.classList.remove('on');
                if(txt) txt.textContent = d[dev] === 1 ? "ON" : "OFF";
            });
        }
    });
}

function toggleDevice(device) {
    database.ref('controls/' + device).once('value').then(s => {
        database.ref('controls/' + device).set(s.val() === 1 ? 0 : 1);
    });
}

// KHỞI CHẠY
document.addEventListener('DOMContentLoaded', initApp);