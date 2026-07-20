let activeLang = 'en';
let activeCategoryIndex = 0; // 0 represents "All Sub-sections"
let textToSpeechUtterance = null;
let isAudioSpeaking = false;
const PROGRESS_KEY = 'civaware_completed_modules'; // shared with the hub (index.js) so progress syncs both ways
const THIS_MODULE_KEY = 'eliteracy';

// Global DOM Content Bootloader Engine
document.addEventListener("DOMContentLoaded", () => {
    initializeDashboardFilters();
    renderContentMatrix();
    populateFormDropdown();
    updateUIStrings();
    initializeModuleCompleteState();
    // DIRECT RELATIVE TO RE-ROUTE BACK TO INDEX FILE
    document.getElementById("btnBackHub").addEventListener("click", () => {
        window.location.href = "../index.html";
    });
    
    document.getElementById("inputSearch").addEventListener("input", () => {
        renderContentMatrix();
    });
});

// Read/write the shared hub completion map so this page's checkbox
// and the hub's per-module checkbox always agree with each other.
function getCompletedModules() {
    try {
        return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function initializeModuleCompleteState() {
    const completed = getCompletedModules();
    const isDone = !!completed[THIS_MODULE_KEY];
    document.getElementById("moduleCompleteCheckbox").checked = isDone;
    document.getElementById("moduleCompleteBar").classList.toggle("is-completed", isDone);
}

function toggleModuleComplete(checkboxEl) {
    const completed = getCompletedModules();
    if (checkboxEl.checked) {
        completed[THIS_MODULE_KEY] = true;
    } else {
        delete completed[THIS_MODULE_KEY];
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed));
    document.getElementById("moduleCompleteBar").classList.toggle("is-completed", checkboxEl.checked);
    const strings = UI_Strings[activeLang];
    document.getElementById("moduleCompleteText").innerText = checkboxEl.checked ? strings.moduleCompletedLabel : strings.markComplete;
}

// Dynamic Initialization of Navigation Pillars
function initializeDashboardFilters() {
    const navContainer = document.getElementById("subsectionsNav");
    navContainer.innerHTML = "";
    
    // Create the master "All" pill component
    const allPill = document.createElement("button");
    allPill.className = `nav-pill ${activeCategoryIndex === 0 ? 'active' : ''}`;
    allPill.id = "pill-cat-0";
    allPill.innerText = UI_Strings[activeLang].allSections;
    allPill.onclick = () => filterCategory(0);
    navContainer.appendChild(allPill);
    
    // Generate individual sub-section links dynamically
    for (let i = 1; i <= 8; i++) {
        const pill = document.createElement("button");
        pill.className = `nav-pill ${activeCategoryIndex === i ? 'active' : ''}`;
        pill.id = `pill-cat-${i}`;
        pill.innerText = UI_Strings[activeLang][`sec${i}`];
        pill.onclick = () => filterCategory(i);
        navContainer.appendChild(pill);
    }
}

// Category Filtering Engine
function filterCategory(catIndex) {
    activeCategoryIndex = catIndex;
    
    // Update active structural states across navigation links
    document.querySelectorAll(".nav-pill").forEach(pill => pill.classList.remove("active"));
    const targetPill = document.getElementById(`pill-cat-${catIndex}`);
    if (targetPill) targetPill.classList.add("active");
    
    renderContentMatrix();
}

// Complete Multilingual Switching Mechanism
function switchLanguage(langCode) {
    if (!UI_Strings[langCode]) return;
    activeLang = langCode;
    
    // Toggle navigation layout buttons state
    document.querySelectorAll(".lang-btn").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.querySelector(`.lang-btn[onclick="switchLanguage('${langCode}')"]`);
    if (activeBtn) activeBtn.classList.add("active");
    
    // Kill any remaining background voice streams safely
    if (isAudioSpeaking) {
        window.speechSynthesis.cancel();
        isAudioSpeaking = false;
        const btnAudio = document.getElementById("btnAudioToggle");
        if (btnAudio) btnAudio.classList.remove("speaking");
    }
    
    updateUIStrings();
    initializeDashboardFilters();
    renderContentMatrix();
    populateFormDropdown();
}

// Synchronize System Typography with Active Object Matrix
function updateUIStrings() {
    const strings = UI_Strings[activeLang];
    
    document.getElementById("txtTitle").innerText = strings.title;
    document.getElementById("txtSubtitle").innerText = strings.subtitle;
    document.getElementById("inputSearch").placeholder = strings.searchPlaceholder;
    document.getElementById("btnBackHub").innerText = strings.backHub;
    
    document.getElementById("formHeading").innerText = strings.formHeading;
    document.getElementById("formSub").innerText = strings.formSub;
    document.getElementById("lblModule").innerText = strings.lblModule;
    document.getElementById("lblName").innerText = strings.lblName || "Full Name";
    document.getElementById("lblAge").innerText = strings.lblAge;
    document.getElementById("lblEmail").innerText = strings.lblEmail;
    document.getElementById("lblMsg").innerText = strings.lblMsg;
    document.getElementById("btnSubmit").innerText = strings.btnSubmit;
    
    document.getElementById("inputName").placeholder = strings.inputNamePlaceholder;
    document.getElementById("inputMsg").placeholder = strings.inputMsgPlaceholder;

    document.getElementById("introTag").innerText = strings.introTag;
    document.getElementById("introTitle").innerText = strings.introTitle;
    document.getElementById("introPara").innerText = strings.introPara;
    document.getElementById("introRealLabel").innerText = strings.introRealLabel;
    document.getElementById("introRealText").innerText = strings.introRealText;
    document.getElementById("introDigitalLabel").innerText = strings.introDigitalLabel;
    document.getElementById("introDigitalText").innerText = strings.introDigitalText;
    document.getElementById("introFooter").innerText = strings.introFooter;

    const isDone = document.getElementById("moduleCompleteCheckbox").checked;
    document.getElementById("moduleCompleteText").innerText = isDone ? strings.moduleCompletedLabel : strings.markComplete;
}

// Render Comparison Cards via Data Vectors
function renderContentMatrix() {
    const grid = document.getElementById("cardsGrid");
    const searchVal = document.getElementById("inputSearch").value.toLowerCase().trim();
    grid.innerHTML = "";
    
    // Filter dataset based on selected subsection filter and search criteria
    const filteredData = topicsDataset.filter(item => {
        const matchesCategory = (activeCategoryIndex === 0 || item.category === activeCategoryIndex);
        
        const textData = item[activeLang];
        const matchesSearch = !searchVal || 
            textData.p_title.toLowerCase().includes(searchVal) || 
            textData.p_desc.toLowerCase().includes(searchVal) || 
            textData.d_title.toLowerCase().includes(searchVal) || 
            textData.d_desc.toLowerCase().includes(searchVal);
            
        return matchesCategory && matchesSearch;
    });
    
    // Empty state layout warning
    if (filteredData.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No matching data modules found. Try adjusting parameters.</div>`;
        updateMetrics(0);
        return;
    }
    
    // Build and append elements onto dynamic grid space
    filteredData.forEach(item => {
        const content = item[activeLang];
        const card = document.createElement("div");
        card.className = "mirror-card";
        card.onclick = () => openAccessibleModal(item.id);
        
        card.innerHTML = `
            <div class="card-half real-world">
                <span class="pane-badge">${UI_Strings[activeLang].realWorldLabel}</span>
                <h4>${content.p_title}</h4>
                <p>${content.p_desc}</p>
            </div>
            <div class="card-half digital-mirror">
                <span class="pane-badge">${UI_Strings[activeLang].digitalLabel}</span>
                <h4>${content.d_title}</h4>
                <p>${content.d_desc}</p>
            </div>
        `;
        grid.appendChild(card);
    });
    
    updateMetrics(filteredData.length);
}

// Compute Metrics Instantly
function updateMetrics(visibleCount) {
    const totalCount = topicsDataset.length;
    document.getElementById("statTotal").innerText = String(totalCount).padStart(2, '0');
    document.getElementById("statActive").innerText = String(visibleCount).padStart(2, '0');
    
    const coveragePercentage = totalCount > 0 ? Math.round((visibleCount / totalCount) * 100) : 0;
    document.getElementById("statRead").innerText = `${coveragePercentage}%`;
}

// Populate Module Review Selector
function populateFormDropdown() {
    const dropdown = document.getElementById("selectModule");
    dropdown.innerHTML = "";
    
    for (let i = 1; i <= 8; i++) {
        const opt = document.createElement("option");
        opt.value = `Section-${i}`;
        opt.innerText = UI_Strings[activeLang][`sec${i}`];
        dropdown.appendChild(opt);
    }
}

// Interactive Accessible Modal Launcher
function openAccessibleModal(itemId) {
    const item = topicsDataset.find(x => x.id === itemId);
    if (!item) return;
    
    const content = item[activeLang];
    const modal = document.getElementById("accessibleModal");
    
    document.getElementById("modalTitle").innerText = UI_Strings[activeLang][`sec${item.category}`];
    
    const container = document.getElementById("modalContent");
    container.innerHTML = `
        <div class="modal-focused-layout" data-speech-payload="${content.p_title}. ${content.p_desc}. ${content.d_title}. ${content.d_desc}.">
            <div class="modal-block">
                <h5>${UI_Strings[activeLang].realWorldLabel}</h5>
                <h4>${content.p_title}</h4>
                <p>${content.p_desc}</p>
            </div>
            <div class="modal-block">
                <h5>${UI_Strings[activeLang].digitalLabel}</h5>
                <h4>${content.d_title}</h4>
                <p>${content.d_desc}</p>
            </div>
        </div>
    `;
    
    modal.classList.add("open");
}

function closeAccessibleModal() {
    if (isAudioSpeaking) {
        window.speechSynthesis.cancel();
        isAudioSpeaking = false;
        document.getElementById("btnAudioToggle").classList.remove("speaking");
    }
    document.getElementById("accessibleModal").classList.remove("open");
}

// Multilingual Speech Synthesis Playback Handler
function toggleSpeechSynthesis() {
    const btnAudio = document.getElementById("btnAudioToggle");
    
    if (isAudioSpeaking) {
        window.speechSynthesis.cancel();
        isAudioSpeaking = false;
        btnAudio.classList.remove("speaking");
        btnAudio.innerText = "🔊 Read Aloud";
        return;
    }
    
    const layout = document.querySelector("[data-speech-payload]");
    if (!layout) return;
    
    const textPayload = layout.getAttribute("data-speech-payload");
    textToSpeechUtterance = new SpeechSynthesisUtterance(textPayload);
    
    // Assign language locale directly to native audio drivers
    if (activeLang === 'hi') {
        textToSpeechUtterance.lang = 'hi-IN';
    } else if (activeLang === 'pa') {
        textToSpeechUtterance.lang = 'pa-IN';
    } else {
        textToSpeechUtterance.lang = 'en-US';
    }
    
    textToSpeechUtterance.rate = 0.92; // Slightly slower, highly intelligible pace for rural environments
    
    textToSpeechUtterance.onend = () => {
        isAudioSpeaking = false;
        btnAudio.classList.remove("speaking");
        btnAudio.innerText = "🔊 Read Aloud";
    };
    
    textToSpeechUtterance.onerror = () => {
        isAudioSpeaking = false;
        btnAudio.classList.remove("speaking");
        btnAudio.innerText = "🔊 Read Aloud";
    };
    
    isAudioSpeaking = true;
    btnAudio.classList.add("speaking");
    btnAudio.innerText = "🛑 Stop Reading";
    window.speechSynthesis.speak(textToSpeechUtterance);
}

// Client-Side Input Form Verification Module
function handleReviewSubmit(event) {
    event.preventDefault();
    
    // Reset structural validation alert markers
    document.querySelectorAll(".error-msg").forEach(el => el.innerText = "");
    let isValid = true;
    
    const name = document.getElementById("inputName");
    const age = document.getElementById("inputAge");
    const email = document.getElementById("inputEmail");
    const msg = document.getElementById("inputMsg");
    
    if (name.value.trim().length < 3) {
        document.getElementById("errName").innerText = "Name requires at least 3 letters.";
        isValid = false;
    }
    
    const ageNum = parseInt(age.value, 10);
    if (isNaN(ageNum) || ageNum < 8 || ageNum > 120) {
        document.getElementById("errAge").innerText = "Provide a valid age metric between 8 and 120.";
        isValid = false;
    }
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.value.trim())) {
        document.getElementById("errEmail").innerText = "Invalid email formatting infrastructure detected.";
        isValid = false;
    }
    
    if (msg.value.trim().length < 10) {
        document.getElementById("errMsg").innerText = "Review log description requires at least 10 characters.";
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Mock Transmission Logging Sequence
    console.log("=== CIVAWARE SECURE FORM SANITIZED DATA TRANSMISSION ===");
    console.log("Module Selected:", document.getElementById("selectModule").value);
    console.log("Submitter Name :", name.value.trim());
    console.log("Submitter Age  :", ageNum);
    console.log("Contact Route  :", email.value.trim());
    console.log("Feedback String:", msg.value.trim());
    
    // Display Success Toast Notice Instantly
    const toast = document.getElementById("successToast");
    toast.style.display = "block";
    
    // Clear Input Fields
    document.getElementById("reviewForm").reset();
    populateFormDropdown();
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 5000);
}