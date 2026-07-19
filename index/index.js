let activeLang = 'en';
const PROGRESS_KEY = 'civaware_completed_modules';
const moduleKeys = Object.keys(moduleDataRegistry); // stable order, drives progress denominator

// ==========================================================================
// BOOTLOADER
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    updateUIStrings();
    renderModulesMatrix();
    renderEmergencyTable();
    updateProgressBar();

    window.addEventListener('click', (e) => {
        const subModal = document.getElementById('submoduleModal');
        if (e.target === subModal) closeSubmodule();
    });
});

// ==========================================================================
// COMPLETION TRACKING (localStorage — no backend, no database, zero setup)
// ==========================================================================
function getCompletedModules() {
    try {
        return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function setModuleCompleted(key, isCompleted) {
    const completed = getCompletedModules();
    if (isCompleted) {
        completed[key] = true;
    } else {
        delete completed[key];
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed));
}

function toggleModuleCompletion(key, checkboxEl) {
    setModuleCompleted(key, checkboxEl.checked);
    const card = document.getElementById(`module-${key}`);
    if (card) card.classList.toggle('is-completed', checkboxEl.checked);
    updateProgressBar();
}

function updateProgressBar() {
    const completed = getCompletedModules();
    const count = Object.keys(completed).filter(k => moduleKeys.includes(k)).length;
    const total = moduleKeys.length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;

    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressLabel');
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.innerText = `${count} / ${total} ${IDX_Strings[activeLang].progressLabel}`;
}

// ==========================================================================
// ROUTER
// ==========================================================================
function navigateTo(pageId) {
    document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active-view'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.add('active-view');

    const activeNav = document.getElementById(`nav-${pageId}`);
    if (activeNav) activeNav.classList.add('active');

    closeNavDrawer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// HAMBURGER DRAWER (mobile / narrow-width nav)
// ==========================================================================
function toggleNavDrawer() {
    document.getElementById('navLinks').classList.toggle('drawer-open');
    document.getElementById('hamburgerBtn').classList.toggle('open');
}

function closeNavDrawer() {
    document.getElementById('navLinks').classList.remove('drawer-open');
    document.getElementById('hamburgerBtn').classList.remove('open');
}

// ==========================================================================
// LANGUAGE SWITCHING
// ==========================================================================
function switchLanguage(langCode) {
    if (!IDX_Strings[langCode]) return;
    activeLang = langCode;

    document.querySelectorAll(".lang-btn").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.querySelector(`.lang-btn[onclick="switchLanguage('${langCode}')"]`);
    if (activeBtn) activeBtn.classList.add("active");

    updateUIStrings();
    renderModulesMatrix();
    renderEmergencyTable();
    updateProgressBar();
}

function updateUIStrings() {
    const s = IDX_Strings[activeLang];

    document.getElementById("brandSpan").innerText = s.brandSpan;
    document.getElementById("nav-home").innerText = s.navHome;
    document.getElementById("nav-modules").innerText = s.navModules;
    document.getElementById("nav-emergency").innerText = s.navEmergency;

    document.getElementById("heroTitle").innerHTML = `${s.heroTitlePre}<span>${s.heroTitleSpan}</span>${s.heroTitlePost}`;
    document.getElementById("heroPara").innerText = s.heroPara;
    document.getElementById("btnExplore").innerText = s.btnExplore;
    document.getElementById("btnEmergency").innerText = s.btnEmergency;

    document.getElementById("teachTag").innerText = s.teachTag;
    document.getElementById("teachTitle").innerText = s.teachTitle;
    document.getElementById("teachPara1").innerText = s.teachPara1;
    document.getElementById("teachPara2").innerText = s.teachPara2;
    document.getElementById("teachPara3").innerText = s.teachPara3;

    document.getElementById("modulesHeading").innerText = s.modulesHeading;
    document.getElementById("modulesSub").innerText = s.modulesSub;

    document.getElementById("emergencyHeading").innerText = s.emergencyHeading;
    document.getElementById("emergencySub").innerText = s.emergencySub;
    document.getElementById("thCategory").innerText = s.thCategory;
    document.getElementById("thNumber").innerText = s.thNumber;
    document.getElementById("thMode").innerText = s.thMode;

    document.getElementById("footerCopyright").innerHTML = s.footerCopyright;
    document.getElementById("footerCredit").innerText = s.footerCredit;
}

// ==========================================================================
// MODULE MATRIX RENDERING (translatable, with completion checkboxes)
// ==========================================================================
function renderModulesMatrix() {
    const grid = document.getElementById('matrixGrid');
    const s = IDX_Strings[activeLang];
    const completed = getCompletedModules();
    grid.innerHTML = "";

    moduleKeys.forEach(key => {
        const mod = moduleDataRegistry[key];
        const content = mod[activeLang];
        const isCompleted = !!completed[key];
        const openLabel = mod.link ? s.openCourse : s.openToolkit;

        const card = document.createElement("div");
        card.className = `card module-card${isCompleted ? ' is-completed' : ''}`;
        card.id = `module-${key}`;

        const bodyHTML = `
            <span class="completed-badge">${s.completedBadge}</span>
            <div class="card-icon">${mod.icon}</div>
            <h3>${content.title}</h3>
            <p>${content.desc}</p>
            <div class="action-link">${openLabel}</div>
        `;

        const checkboxHTML = `
            <label class="module-check" onclick="event.stopPropagation()" title="${s.checkboxLabel}">
                <input type="checkbox" ${isCompleted ? 'checked' : ''}
                    onchange="toggleModuleCompletion('${key}', this)">
            </label>
        `;

        if (mod.link) {
            card.innerHTML = `${checkboxHTML}<a href="${mod.link}" style="display:block; text-decoration:none; color:inherit;">${bodyHTML}</a>`;
        } else {
            card.innerHTML = `${checkboxHTML}${bodyHTML}`;
            card.querySelector('.card-icon').parentElement.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.module-check')) openSubmodule(key);
            });
        }

        grid.appendChild(card);
    });
}

// ==========================================================================
// INLINE SUBMODULE POPUP (translated)
// ==========================================================================
function openSubmodule(moduleId) {
    const data = moduleDataRegistry[moduleId];
    if (!data) return;
    const s = IDX_Strings[activeLang];
    const content = data[activeLang];

    const modalContent = document.getElementById('submoduleModalContent');
    const submodulesHTML = content.submodules.map(sub => `<div class="submodule-item">${sub}</div>`).join('');

    modalContent.innerHTML = `
        <div class="modal-content-head">
            <span style="font-size: 36px;">${data.icon}</span>
            <div>
                <h3 style="font-size: 20px; font-weight: 800; color:#ffffff;">${content.title}</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin-top:2px;">${content.desc}</p>
            </div>
        </div>
        <div style="border-bottom: 1px solid rgba(255,255,255,0.06); margin: 16px 0;"></div>
        <h4 style="font-size: 14px; font-weight: 700; color: var(--cyber-cyan); margin-bottom: 12px; letter-spacing:0.5px; text-transform:uppercase;">${s.subtopicsHeading}</h4>
        <div class="submodule-list">${submodulesHTML}</div>
    `;

    document.getElementById('submoduleModal').classList.add('open');
}

function closeSubmodule() {
    document.getElementById('submoduleModal').classList.remove('open');
}

// ==========================================================================
// EMERGENCY TABLE RENDERING (translatable)
// ==========================================================================
function renderEmergencyTable() {
    const tbody = document.getElementById('emergencyTableBody');
    const rows = IDX_Strings[activeLang].emergencyRows;
    tbody.innerHTML = rows.map(row => `
        <tr>
            <td><strong>${row.name}</strong></td>
            <td class="num-highlight">${row.num}</td>
            <td>${row.mode}</td>
        </tr>
    `).join('');
}