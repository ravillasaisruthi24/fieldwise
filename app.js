
/* ==========================================
   FIELDWISE - CROP DISEASE DETECTION
   MAIN JAVASCRIPT
========================================== */

"use strict";


// ==========================================
// GLOBAL VARIABLES
// ==========================================

let cropChart = null;
let healthChart = null;
let imageChart = null;

let allDiseases = [];
let allCrops = [];


// ==========================================
// DOM ELEMENT HELPER
// ==========================================

const $ = (id) => document.getElementById(id);


// ==========================================
// SAFE HTML HELPER
// ==========================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);

}


// ==========================================
// API REQUEST HELPER
// ==========================================

async function fetchAPI(url) {

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();

}


// ==========================================
// FORMAT NUMBERS
// ==========================================

function formatNumber(number) {

    return Number(number || 0).toLocaleString("en-IN");

}


// ==========================================
// CURRENT DATE
// ==========================================

function updateDate() {

    const dateElement = $("currentDate");

    if (!dateElement) return;

    dateElement.textContent = new Date().toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// ==========================================
// DASHBOARD SUMMARY
// ==========================================

async function loadDashboardSummary() {

    try {

        const data = await fetchAPI("/api/summary");

        $("totalCrops").textContent =
            formatNumber(data.total_crops);

        $("totalClasses").textContent =
            formatNumber(data.total_classes);

        $("totalImages").textContent =
            formatNumber(data.total_images);

        $("healthyClasses").textContent =
            formatNumber(data.healthy_classes);

    } catch (error) {

        console.error("Summary loading error:", error);

        showMessage("Unable to load dashboard statistics.");

    }

}


// ==========================================
// LOAD CROPS
// ==========================================

async function loadCrops() {

    try {

        allCrops = await fetchAPI("/api/crops");

        populateCropDropdowns();

        displayCropCards();

    } catch (error) {

        console.error("Crop loading error:", error);

        $("cropCards").innerHTML = `
            <div class="loading-message">
                Unable to load crop categories.
            </div>
        `;

    }

}


// ==========================================
// CROP ICONS
// ==========================================

function getCropIcon(crop) {

    const icons = {

        Rice: "fa-wheat-awn",
        Wheat: "fa-wheat-awn",
        Maize: "fa-seedling",
        Cotton: "fa-cloud",
        Soybean: "fa-leaf",
        Groundnut: "fa-seedling",
        Tomato: "fa-apple-whole",
        Potato: "fa-seedling",
        Chilli: "fa-pepper-hot",
        Mango: "fa-apple-whole"

    };

    return icons[crop] || "fa-leaf";

}


// ==========================================
// POPULATE CROP DROPDOWNS
// ==========================================

function populateCropDropdowns() {

    const cropSelect = $("cropSelect");
    const diseaseFilter = $("diseaseCropFilter");

    const cropOptions = allCrops.map(item => {

        const crop = escapeHTML(item.crop);

        return `
            <option value="${crop}">
                ${crop}
            </option>
        `;

    }).join("");

    cropSelect.innerHTML = `
        <option value="">All Crops</option>
        ${cropOptions}
    `;

    diseaseFilter.innerHTML = `
        <option value="">All Crops</option>
        ${cropOptions}
    `;

}


// ==========================================
// DISPLAY CROP CARDS
// ==========================================

function displayCropCards() {

    const container = $("cropCards");

    if (!allCrops.length) {

        container.innerHTML = `
            <div class="loading-message">
                No crop categories available.
            </div>
        `;

        return;

    }

    container.innerHTML = allCrops.map(crop => {

        const name = escapeHTML(crop.crop);
        const classes = Number(crop.number_of_classes || 0);

        return `

            <div class="crop-card"
                 data-crop="${name}">

                <div class="crop-icon">
                    <i class="fa-solid ${getCropIcon(crop.crop)}"></i>
                </div>

                <h3>${name}</h3>

                <p>${classes} Disease Classes</p>

            </div>

        `;

    }).join("");

    document.querySelectorAll(".crop-card").forEach(card => {

        card.addEventListener("click", () => {

            const crop = card.dataset.crop;

            showSection("crop-analysis");

            $("cropSelect").value = crop;

            loadCropDetails(crop);

        });

    });

}


// ==========================================
// LOAD ALL DISEASE RECORDS
// ==========================================

async function loadDiseases() {

    try {

        allDiseases = await fetchAPI("/api/diseases");

        displayDiseaseTable(allDiseases);

    } catch (error) {

        console.error("Disease loading error:", error);

        $("diseaseTableBody").innerHTML = `
            <tr>
                <td colspan="5">
                    Unable to load disease information.
                </td>
            </tr>
        `;

    }

}


// ==========================================
// DISPLAY DISEASE TABLE
// ==========================================

function displayDiseaseTable(records) {

    const tableBody = $("diseaseTableBody");

    $("tableCount").textContent =
        `${records.length} classification records`;

    $("recordCount").textContent =
        `${records.length} records`;

    if (!records.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-message">
                    No matching disease records found.
                </td>
            </tr>
        `;

        return;

    }

    tableBody.innerHTML = records.map(item => {

        const status = String(item.status || "").trim();

        const isHealthy =
            status.toLowerCase() === "healthy";

        const badgeClass = isHealthy ? "healthy" : "diseased";

        return `

            <tr>

                <td class="class-label">
                    ${escapeHTML(item.class_label)}
                </td>

                <td>
                    ${escapeHTML(item.crop)}
                </td>

                <td>
                    ${escapeHTML(item.disease)}
                </td>

                <td>
                    <span class="status-badge ${badgeClass}">
                        ${escapeHTML(status)}
                    </span>
                </td>

                <td>
                    ${formatNumber(item.target_images)}
                </td>

            </tr>

        `;

    }).join("");

}


// ==========================================
// DISEASE SEARCH AND FILTER
// ==========================================

function filterDiseases() {

    const search = $("diseaseSearch").value
        .trim()
        .toLowerCase();

    const selectedCrop = $("diseaseCropFilter").value;

    const selectedStatus = $("statusFilter").value;

    const filteredRecords = allDiseases.filter(item => {

        const matchesSearch = [

            item.crop,
            item.disease,
            item.class_label

        ].some(value =>

            String(value || "")
                .toLowerCase()
                .includes(search)

        );

        const matchesCrop =
            !selectedCrop || item.crop === selectedCrop;

        const matchesStatus =
            !selectedStatus ||
            String(item.status).toLowerCase() ===
            selectedStatus.toLowerCase();

        return matchesSearch && matchesCrop && matchesStatus;

    });

    displayDiseaseTable(filteredRecords);

}


// ==========================================
// LOAD CROP DETAILS
// ==========================================

async function loadCropDetails(cropName) {

    const container = $("cropDetails");

    if (!cropName) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-seedling"></i>

                <h3>Select a crop</h3>

                <p>
                    Choose a crop to explore its disease classes.
                </p>

            </div>

        `;

        return;

    }

    container.innerHTML = `
        <div class="loading-message">
            Loading crop information...
        </div>
    `;

    try {

        const data = await fetchAPI(
            `/api/crop/${encodeURIComponent(cropName)}`
        );

        displayCropDetails(data);

    } catch (error) {

        console.error("Crop details error:", error);

        container.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load crop information</h3>
                <p>Please try again.</p>
            </div>
        `;

    }

}


// ==========================================
// DISPLAY CROP DETAILS
// ==========================================

function displayCropDetails(data) {

    const crop = data.crop;

    const diseases = data.diseases || [];

    const healthyCount = diseases.filter(item =>
        String(item.status).toLowerCase() === "healthy"
    ).length;

    const diseasedCount = diseases.filter(item =>
        String(item.status).toLowerCase() === "diseased"
    ).length;

    const totalImages = diseases.reduce(
        (sum, item) => sum + Number(item.target_images || 0),
        0
    );

    const diseaseChips = diseases.map(item => {

        const isHealthy =
            String(item.status).toLowerCase() === "healthy";

        return `

            <span class="disease-chip ${isHealthy ? "healthy" : ""}">
                ${escapeHTML(item.disease)}
            </span>

        `;

    }).join("");

    $("cropDetails").innerHTML = `

        <div class="crop-detail-header">

            <div>

                <h3>
                    <i class="fa-solid ${getCropIcon(crop.crop)}"
                       style="color:#23834c;margin-right:8px;">
                    </i>

                    ${escapeHTML(crop.crop)}
                </h3>

                <p>Crop disease classification overview</p>

            </div>

            <span class="status-badge healthy">
                Dataset Available
            </span>

        </div>


        <div class="crop-detail-stats">

            <div class="detail-stat">

                <span>Total Classes</span>

                <h3>${formatNumber(crop.number_of_classes)}</h3>

            </div>


            <div class="detail-stat">

                <span>Healthy Classes</span>

                <h3>${formatNumber(healthyCount)}</h3>

            </div>


            <div class="detail-stat">

                <span>Diseased Classes</span>

                <h3>${formatNumber(diseasedCount)}</h3>

            </div>

        </div>


        <div class="detail-stat" style="margin-bottom:20px;">

            <span>Total Target Images</span>

            <h3>${formatNumber(totalImages)}</h3>

        </div>


        <h4 style="font-size:13px;margin-bottom:13px;">
            Available Disease Classes
        </h4>

        <div class="disease-chip-list">
            ${diseaseChips}
        </div>

    `;

}


// ==========================================
// LOAD CHART DATA
// ==========================================

async function loadCharts() {

    try {

        const data = await fetchAPI("/api/chart-data");

        createCropChart(data);

        createHealthChart();

        createImageChart(data);

    } catch (error) {

        console.error("Chart loading error:", error);

    }

}


// ==========================================
// CROP-WISE BAR CHART
// ==========================================

function createCropChart(data) {

    const canvas = $("cropChart");

    if (!canvas) return;

    if (cropChart) {
        cropChart.destroy();
    }

    cropChart = new Chart(canvas, {

        type: "bar",

        data: {

            labels: data.labels,

            datasets: [{

                label: "Number of Classes",

                data: data.class_counts,

                backgroundColor: "#31985a",

                borderRadius: 6,

                borderSkipped: false,

                barThickness: 22

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {
                    backgroundColor: "#183d29",
                    padding: 12
                }

            },

            scales: {

                y: {

                    beginAtZero: true,

                    ticks: {
                        precision: 0
                    },

                    grid: {
                        color: "#edf1ee"
                    }

                },

                x: {

                    grid: {
                        display: false
                    }

                }

            }

        }

    });

}


// ==========================================
// HEALTHY VS DISEASED DOUGHNUT CHART
// ==========================================

function createHealthChart() {

    const canvas = $("healthChart");

    if (!canvas) return;

    if (healthChart) {
        healthChart.destroy();
    }

    const healthy = allDiseases.filter(item =>

        String(item.status).toLowerCase() === "healthy"

    ).length;

    const diseased = allDiseases.filter(item =>

        String(item.status).toLowerCase() === "diseased"

    ).length;

    healthChart = new Chart(canvas, {

        type: "doughnut",

        data: {

            labels: ["Healthy", "Diseased"],

            datasets: [{

                data: [healthy, diseased],

                backgroundColor: [
                    "#31985a",
                    "#ed9b42"
                ],

                borderWidth: 0,

                hoverOffset: 8

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            cutout: "72%",

            plugins: {

                legend: {

                    position: "bottom",

                    labels: {

                        usePointStyle: true,

                        padding: 20,

                        font: {
                            size: 11
                        }

                    }

                }

            }

        }

    });

}


// ==========================================
// CROP IMAGE DISTRIBUTION CHART
// ==========================================

function createImageChart(data) {

    const canvas = $("imageChart");

    if (!canvas) return;

    if (imageChart) {
        imageChart.destroy();
    }

    imageChart = new Chart(canvas, {

        type: "bar",

        data: {

            labels: data.labels,

            datasets: [{

                label: "Target Images",

                data: data.image_counts,

                backgroundColor: "#4387d9",

                borderRadius: 6,

                borderSkipped: false,

                barThickness: 25

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                }

            },

            scales: {

                y: {

                    beginAtZero: true,

                    ticks: {

                        callback: value =>
                            Number(value).toLocaleString("en-IN")

                    },

                    grid: {
                        color: "#edf1ee"
                    }

                },

                x: {

                    grid: {
                        display: false
                    }

                }

            }

        }

    });

}


// ==========================================
// DATASET INFORMATION
// ==========================================

async function loadDatasetInfo() {

    try {

        const data = await fetchAPI("/api/dataset-info");

        $("datasetCrops").textContent =
            formatNumber(data.total_crops);

        $("datasetClasses").textContent =
            formatNumber(data.total_classes);

        $("datasetDescription").textContent =
            data.description;

    } catch (error) {

        console.error("Dataset information error:", error);

        $("datasetDescription").textContent =
            "Unable to load dataset information.";

    }

}


// ==========================================
// SECTION NAVIGATION
// ==========================================

function showSection(sectionId) {

    const sections = document.querySelectorAll(".content-section");

    sections.forEach(section => {

        section.classList.add("hidden");

    });

    const selectedSection = $(sectionId);

    if (!selectedSection) return;

    selectedSection.classList.remove("hidden");

    document.querySelectorAll(".menu-item").forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.section === sectionId
        );

    });

    const titleMap = {

        dashboard: "Crop Disease Dashboard",
        "crop-analysis": "Crop Analysis",
        "disease-detection": "Disease Classification",
        "image-upload": "Plant Image Upload",
        dataset: "Dataset Information"

    };

    const heading = document.querySelector(".header-left h1");

    if (heading) {
        heading.textContent = titleMap[sectionId] || "Fieldwise";
    }

    const breadcrumb = document.querySelector(".breadcrumb");

    if (breadcrumb) {
        breadcrumb.textContent = `Pages / ${titleMap[sectionId]}`;
    }

    history.replaceState(null, "", `#${sectionId}`);

    const sidebar = $("sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }

}


// ==========================================
// NAVIGATION EVENTS
// ==========================================

function setupNavigation() {

    document.querySelectorAll(".menu-item").forEach(item => {

        item.addEventListener("click", event => {

            event.preventDefault();

            showSection(item.dataset.section);

        });

    });


    document.querySelectorAll(
        'a[href="#crop-analysis"]'
    ).forEach(link => {

        link.addEventListener("click", event => {

            event.preventDefault();

            showSection("crop-analysis");

        });

    });


    $("menuToggle").addEventListener("click", () => {

        $("sidebar").classList.toggle("open");

    });


    // Load section from URL hash

    const initialSection = location.hash.replace("#", "");

    const validSections = [
        "dashboard",
        "crop-analysis",
        "disease-detection",
        "image-upload",
        "dataset"
    ];

    if (validSections.includes(initialSection)) {

        showSection(initialSection);

    }

}


// ==========================================
// CROP SELECTION EVENT
// ==========================================

function setupCropFilters() {

    $("cropSelect").addEventListener("change", event => {

        loadCropDetails(event.target.value);

    });

    $("diseaseSearch").addEventListener(
        "input",
        filterDiseases
    );

    $("diseaseCropFilter").addEventListener(
        "change",
        filterDiseases
    );

    $("statusFilter").addEventListener(
        "change",
        filterDiseases
    );

}


// ==========================================
// IMAGE UPLOAD
// ==========================================

let selectedImageURL = null;


function handleImage(file) {

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png"
    ];

    if (!allowedTypes.includes(file.type)) {

        alert("Please select a JPG, JPEG or PNG image.");

        return;

    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {

        alert("Image size must be less than 10 MB.");

        return;

    }

    if (selectedImageURL) {

        URL.revokeObjectURL(selectedImageURL);

    }

    selectedImageURL = URL.createObjectURL(file);

    $("previewImage").src = selectedImageURL;

    $("imageName").textContent = file.name;

    $("imageSize").textContent =
        (file.size / (1024 * 1024)).toFixed(2) + " MB";

    $("imagePreview").classList.remove("hidden");

    $("uploadArea").classList.add("hidden");

}


// ==========================================
// IMAGE UPLOAD EVENTS
// ==========================================

function setupImageUpload() {

    const fileInput = $("plantImage");

    const uploadArea = $("uploadArea");

    $("browseButton").addEventListener("click", () => {

        fileInput.click();

    });


    fileInput.addEventListener("change", event => {

        const file = event.target.files[0];

        handleImage(file);

    });


    uploadArea.addEventListener("dragover", event => {

        event.preventDefault();

        uploadArea.classList.add("drag-over");

    });


    uploadArea.addEventListener("dragleave", () => {

        uploadArea.classList.remove("drag-over");

    });


    uploadArea.addEventListener("drop", event => {

        event.preventDefault();

        uploadArea.classList.remove("drag-over");

        const file = event.dataTransfer.files[0];

        handleImage(file);

    });


    $("removeImage").addEventListener("click", () => {

        if (selectedImageURL) {

            URL.revokeObjectURL(selectedImageURL);

            selectedImageURL = null;

        }

        $("previewImage").src = "";

        fileInput.value = "";

        $("imagePreview").classList.add("hidden");

        $("uploadArea").classList.remove("hidden");

    });

}


// ==========================================
// REFRESH DASHBOARD
// ==========================================

async function refreshDashboard() {

    const button = $("refreshButton");

    button.classList.add("refreshing");

    await Promise.all([

        loadDashboardSummary(),

        loadCrops(),

        loadDiseases(),

        loadDatasetInfo()

    ]);

    await loadCharts();

    button.classList.remove("refreshing");

}


// ==========================================
// ERROR MESSAGE
// ==========================================

function showMessage(message) {

    console.error(message);

}


// ==========================================
// INITIALIZE APPLICATION
// ==========================================

async function initializeApp() {

    console.log("==================================");

    console.log("FIELDWISE CROP DISEASE DETECTION");

    console.log("Initializing application...");

    console.log("==================================");


    updateDate();

    setupNavigation();

    setupCropFilters();

    setupImageUpload();


    await Promise.all([

        loadDashboardSummary(),

        loadCrops(),

        loadDiseases(),

        loadDatasetInfo()

    ]);


    await loadCharts();


    $("refreshButton").addEventListener(
        "click",
        refreshDashboard
    );


    console.log("Fieldwise dashboard initialized successfully!");

}


// ==========================================
// START APPLICATION
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);
