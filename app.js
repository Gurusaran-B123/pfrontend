// ==========================================
// PROJECT HEALTH HUB - CORE JS CONTROLLER
// ==========================================

// --- Backend API Configuration ---
// Point this at wherever app.py is running.
const API_BASE = "https://pbackend-4fd4.onrender.com";

// --- State Engine ---
// employees / projects / discussions are now sourced live from PostgreSQL
// via the Flask API — no seed/mock data and no local caching of business data.
let employees = [];
let projects = [];
let discussions = [];
let session = JSON.parse(localStorage.getItem("ph_session")) || null;

let activeTab = "dashboard";
let currentOtpCode = "";
let currentConfirmCallback = null;

// --- API Helpers ---
async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
    return res.json();
}

async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`POST ${path} failed (${res.status})`);
    return res.json();
}

async function apiPut(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`PUT ${path} failed (${res.status})`);
    return res.json();
}

async function apiDelete(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE ${path} failed (${res.status})`);
    return res.json();
}

// Pull the latest employees/projects/discussions from the database
async function loadAllData() {
    try {
        const [empData, projData, discData] = await Promise.all([
            apiGet("/employees"),
            apiGet("/projects"),
            apiGet("/discussions")
        ]);
        employees = empData;
        projects = projData;
        discussions = discData;
    } catch (err) {
        console.error(err);
        showToast("Could not reach the server. Please check your connection.", true);
    }
}

// Only the auth session is kept client-side; all business data lives in PostgreSQL
function saveSession() {
    if (session) {
        localStorage.setItem("ph_session", JSON.stringify(session));
    } else {
        localStorage.removeItem("ph_session");
    }
}

// --- Toast alert helper ---
function showToast(message, isError = false) {
    const toast = document.getElementById("toast-overlay");
    const successIcon = document.getElementById("toast-icon-success");
    const errorIcon = document.getElementById("toast-icon-error");
    const label = document.getElementById("toast-message-lbl");

    label.textContent = message;
    if (isError) {
        successIcon.classList.add("hidden");
        errorIcon.classList.remove("hidden");
        toast.style.borderColor = "rgba(244, 63, 94, 0.3)";
    } else {
        successIcon.classList.remove("hidden");
        errorIcon.classList.add("hidden");
        toast.style.borderColor = "rgba(16, 185, 129, 0.3)";
    }

    toast.classList.remove("hidden");
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3500);
}

// --- Custom Confirmation Modal ---
function showConfirm(title, message, callback) {
    document.getElementById("confirm-title-lbl").textContent = title;
    document.getElementById("confirm-message-lbl").textContent = message;
    document.getElementById("modal-confirm").classList.remove("hidden");
    currentConfirmCallback = callback;
}

// ==========================================
// INIT AND MOUNT WIRING
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    initApp();
});

async function initApp() {
    // Auth selectors
    const tabSignInBtn = document.getElementById("tab-btn-signin");
    const tabSignUpBtn = document.getElementById("tab-btn-signup");
    const signinForm = document.getElementById("signin-form");
    const signupForm = document.getElementById("signup-form");
    const roleAdminOption = document.getElementById("role-option-admin");
    const rolePmOption = document.getElementById("role-option-pm");
    const roleAdminSignUp = document.getElementById("signup-role-admin");
    const rolePmSignUp = document.getElementById("signup-role-pm");

    // Toggle Role radio buttons in Sign In
    roleAdminOption.addEventListener("click", () => {
        roleAdminOption.classList.add("selected-admin");
        rolePmOption.classList.remove("selected-pm");
        document.querySelector('input[name="loginRole"][value="Admin"]').checked = true;
        renderQuickSelects();
    });

    rolePmOption.addEventListener("click", () => {
        rolePmOption.classList.add("selected-pm");
        roleAdminOption.classList.remove("selected-admin");
        document.querySelector('input[name="loginRole"][value="Project Manager"]').checked = true;
        renderQuickSelects();
    });

    // Toggle Role radio buttons in Sign Up
    roleAdminSignUp.addEventListener("click", () => {
        roleAdminSignUp.classList.add("selected-admin");
        rolePmSignUp.classList.remove("selected-pm");
        document.querySelector('input[name="signUpRole"][value="Admin"]').checked = true;
        document.getElementById("signup-dept-wrapper").classList.add("hidden");
    });

    rolePmSignUp.addEventListener("click", () => {
        rolePmSignUp.classList.add("selected-pm");
        roleAdminSignUp.classList.remove("selected-admin");
        document.querySelector('input[name="signUpRole"][value="Project Manager"]').checked = true;
        document.getElementById("signup-dept-wrapper").classList.remove("hidden");
    });

    // Switch between Sign In and Sign Up tabs
    tabSignInBtn.addEventListener("click", () => {
        tabSignInBtn.classList.add("active");
        tabSignUpBtn.classList.remove("active");
        signinForm.classList.remove("hidden");
        signupForm.classList.add("hidden");
    });

    tabSignUpBtn.addEventListener("click", () => {
        tabSignUpBtn.classList.add("active");
        tabSignInBtn.classList.remove("active");
        signupForm.classList.remove("hidden");
        signinForm.classList.add("hidden");
    });

    // Submit Sign Up Form
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const role = document.querySelector('input[name="signUpRole"]:checked').value;
        const name = document.getElementById("signup-name-input").value.trim();
        const email = document.getElementById("signup-email-input").value.trim().toLowerCase();
        const dept = document.getElementById("signup-dept-select").value;

        if (!name || !email) {
            showToast("Please fill in all registration fields.", true);
            return;
        }

        try {
            // Add to employee roster if Project Manager
            if (role === "Project Manager") {
                const created = await apiPost("/employees", { name, email, dept });
                employees.push(created);
            }

            showToast(`Account registered successfully as ${role}!`);
            // Switch to login
            signupForm.reset();
            tabSignInBtn.click();
            document.getElementById("login-email-input").value = email;
            if (role === "Admin") {
                roleAdminOption.click();
            } else {
                rolePmOption.click();
            }
        } catch (err) {
            console.error(err);
            showToast("Registration failed. Please try again.", true);
        }
    });

    // Submit Sign In (Send OTP)
    signinForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email-input").value.trim().toLowerCase();
        const role = document.querySelector('input[name="loginRole"]:checked').value;

        if (!email) return;

        // Generate a random 6 digit code
        currentOtpCode = String(Math.floor(100000 + Math.random() * 900000));

        // Display sandbox email interceptor
        document.getElementById("smtp-to-email").textContent = email;
        document.getElementById("smtp-to-name").textContent = role === "Admin" ? "(Admin Controller)" : "(Project Manager)";
        document.getElementById("smtp-subject-code").textContent = currentOtpCode;
        document.getElementById("smtp-body-name").textContent = email.split("@")[0].toUpperCase();
        document.getElementById("smtp-body-role").textContent = role;
        document.getElementById("smtp-code-display").textContent = currentOtpCode;

        document.getElementById("smtp-interceptor-card").classList.remove("hidden");
        document.getElementById("role-selection-wrapper").classList.add("hidden");
        document.getElementById("email-input-wrapper").classList.add("hidden");
        document.getElementById("otp-input-wrapper").classList.remove("hidden");
        document.getElementById("otp-target-email").textContent = email;

        showToast("Secure 6-Digit Passcode generated in Sandbox SMTP Panel!");
    });

    // Edit email back button
    document.getElementById("btn-edit-email").addEventListener("click", () => {
        document.getElementById("role-selection-wrapper").classList.remove("hidden");
        document.getElementById("email-input-wrapper").classList.remove("hidden");
        document.getElementById("otp-input-wrapper").classList.add("hidden");
        document.getElementById("smtp-interceptor-card").classList.add("hidden");
    });

    // Copy Passcode Button helper
    document.getElementById("copy-otp-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(currentOtpCode);
        showToast("Authorization passcode copied to clipboard!");
    });

    // Resend passcode
    document.getElementById("btn-resend-otp").addEventListener("click", () => {
        currentOtpCode = String(Math.floor(100000 + Math.random() * 900000));
        document.getElementById("smtp-subject-code").textContent = currentOtpCode;
        document.getElementById("smtp-code-display").textContent = currentOtpCode;
        showToast("Passcode refreshed in secure sandbox panel!");
    });

    // Verify OTP & Sign In
    document.getElementById("btn-verify-otp").addEventListener("click", async () => {
        const entered = document.getElementById("otp-code-input").value.trim();

        if (entered !== currentOtpCode) {
            showToast("Invalid passcode. Please check the SMTP secure interceptor panel.", true);
            return;
        }

        const email = document.getElementById("login-email-input").value.trim().toLowerCase();
        const role = document.querySelector('input[name="loginRole"]:checked').value;

        try {
            const result = await apiPost("/login", { email, role });
            session = result.user;
            saveSession();

            document.getElementById("otp-code-input").value = "";
            document.getElementById("smtp-interceptor-card").classList.add("hidden");
            document.getElementById("auth-container").classList.add("hidden");
            document.getElementById("workspace-container").classList.remove("hidden");

            showToast(`Sign in successful! Welcome to the workspace, ${session.name}.`);
            await setupWorkspace();
        } catch (err) {
            console.error(err);
            showToast("Sign in failed. Please try again.", true);
        }
    });

    // Logout triggers
    document.getElementById("btn-logout-header").addEventListener("click", () => {
        session = null;
        saveSession();
        employees = [];
        projects = [];
        discussions = [];
        document.getElementById("workspace-container").classList.add("hidden");
        document.getElementById("auth-container").classList.remove("hidden");
        document.getElementById("role-selection-wrapper").classList.remove("hidden");
        document.getElementById("email-input-wrapper").classList.remove("hidden");
        document.getElementById("otp-input-wrapper").classList.add("hidden");
        showToast("Logged out successfully.");
    });

    // Confirmation Modal Actions
    document.getElementById("btn-confirm-cancel").addEventListener("click", () => {
        document.getElementById("modal-confirm").classList.add("hidden");
        currentConfirmCallback = null;
    });

    document.getElementById("btn-confirm-proceed").addEventListener("click", () => {
        document.getElementById("modal-confirm").classList.add("hidden");
        if (currentConfirmCallback) {
            currentConfirmCallback();
            currentConfirmCallback = null;
        }
    });

    // Handle view switches
    const tabBtns = {
        "dashboard": document.getElementById("nav-btn-dashboard"),
        "projects": document.getElementById("nav-btn-projects"),
        "discussions": document.getElementById("nav-btn-discussions"),
        "employees": document.getElementById("nav-btn-employees")
    };

    Object.keys(tabBtns).forEach(tab => {
        tabBtns[tab].addEventListener("click", () => {
            switchTab(tab);
        });
    });

    // Link "View All Logs" to Discussions Tab
    document.getElementById("dash-view-all-logs").addEventListener("click", () => {
        switchTab("discussions");
    });

    // Logo triggers Home
    document.getElementById("logo-dashboard-trigger").addEventListener("click", () => {
        switchTab("dashboard");
    });

    // Load the roster (needed for the Quick Select buttons) before login
    await loadAllData();
    renderQuickSelects();

    // Check if session exists
    if (session) {
        document.getElementById("auth-container").classList.add("hidden");
        document.getElementById("workspace-container").classList.remove("hidden");
        await setupWorkspace();
    }
}

// Switch tabs helper
function switchTab(tab) {
    activeTab = tab;

    // Hide all sections
    document.getElementById("section-dashboard").classList.add("hidden");
    document.getElementById("section-projects").classList.add("hidden");
    document.getElementById("section-discussions").classList.add("hidden");
    document.getElementById("section-employees").classList.add("hidden");

    // Deactivate nav buttons
    document.getElementById("nav-btn-dashboard").classList.remove("active");
    document.getElementById("nav-btn-projects").classList.remove("active");
    document.getElementById("nav-btn-discussions").classList.remove("active");
    document.getElementById("nav-btn-employees").classList.remove("active");

    // Activate selected
    if (tab === "dashboard") {
        document.getElementById("section-dashboard").classList.remove("hidden");
        document.getElementById("nav-btn-dashboard").classList.add("active");
        renderDashboard();
    } else if (tab === "projects") {
        document.getElementById("section-projects").classList.remove("hidden");
        document.getElementById("nav-btn-projects").classList.add("active");
        renderProjects();
    } else if (tab === "discussions") {
        document.getElementById("section-discussions").classList.remove("hidden");
        document.getElementById("nav-btn-discussions").classList.add("active");
        renderDiscussions();
    } else if (tab === "employees") {
        document.getElementById("section-employees").classList.remove("hidden");
        document.getElementById("nav-btn-employees").classList.add("active");
        renderEmployees();
    }
    lucide.createIcons();
}

// Quick select buttons generator
function renderQuickSelects() {
    const role = document.querySelector('input[name="loginRole"]:checked').value;
    const container = document.getElementById("quick-select-container");
    container.innerHTML = "";

    if (role === "Admin") {
        document.getElementById("quick-select-title").textContent = "💡 QUICK SELECT REGISTERED ADMINS";
        const admins = ["admin@projecthealth.com", "director@projecthealth.com"];
        admins.forEach(email => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "quick-select-btn";
            btn.textContent = email;
            btn.addEventListener("click", () => {
                document.getElementById("login-email-input").value = email;
            });
            container.appendChild(btn);
        });
    } else {
        document.getElementById("quick-select-title").textContent = "💡 QUICK SELECT EMPLOYEE PMS";
        employees.forEach(emp => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "quick-select-btn";
            btn.textContent = emp.email;
            btn.addEventListener("click", () => {
                document.getElementById("login-email-input").value = emp.email;
            });
            container.appendChild(btn);
        });
    }
}

// ==========================================
// WORKSPACE GENERAL LOGIC
// ==========================================
async function setupWorkspace() {
    if (!session) return;

    // Refresh data from PostgreSQL now that we're signed in
    await loadAllData();

    // Set Name & Avatar
    document.getElementById("user-header-name").textContent = session.name;
    document.getElementById("user-header-role").textContent = session.role;
    document.getElementById("user-header-avatar").textContent = session.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

    // Greeting values
    document.getElementById("dash-greeting-name").textContent = session.name;
    document.getElementById("dash-greeting-role").textContent = session.role;

    // View constraint handles
    const adminElements = document.querySelectorAll(".admin-only");
    const pmElements = document.querySelectorAll(".pm-only");

    if (session.role === "Admin") {
        adminElements.forEach(el => el.classList.remove("hidden"));
        pmElements.forEach(el => el.classList.add("hidden"));
    } else {
        adminElements.forEach(el => el.classList.add("hidden"));
        pmElements.forEach(el => el.classList.remove("hidden"));
        // Allow PMs to log discussion points for their assigned projects
        document.getElementById("discussions-btn-log").classList.remove("hidden");
    }

    // Modal wires
    wireModals();

    // Default load tab
    switchTab("dashboard");
}

// ==========================================
// DASHBOARD VIEW
// ==========================================
function renderDashboard() {
    // Stats calculation
    const liveCount = projects.filter(p => p.status === "Live").length;
    const wipCount = projects.filter(p => p.status === "Workinprogress").length;
    const pendingCount = projects.filter(p => p.status === "Yet to start").length;
    const totalCount = projects.length;

    document.getElementById("dash-stat-live").textContent = liveCount;
    document.getElementById("dash-stat-wip").textContent = wipCount;
    document.getElementById("dash-stat-pending").textContent = pendingCount;

    // Progress percentage
    const livePercent = totalCount > 0 ? Math.round((liveCount / totalCount) * 100) : 0;
    const wipPercent = totalCount > 0 ? Math.round((wipCount / totalCount) * 100) : 0;
    const pendingPercent = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;

    document.getElementById("progress-lbl-live").textContent = `${livePercent}% (${liveCount}/${totalCount})`;
    document.getElementById("progress-fill-live").style.width = `${livePercent}%`;

    document.getElementById("progress-lbl-wip").textContent = `${wipPercent}% (${wipCount}/${totalCount})`;
    document.getElementById("progress-fill-wip").style.width = `${wipPercent}%`;

    document.getElementById("progress-lbl-pending").textContent = `${pendingPercent}% (${pendingCount}/${totalCount})`;
    document.getElementById("progress-fill-pending").style.width = `${pendingPercent}%`;

    // Timeline generator (Recent discussions)
    const timelineStack = document.getElementById("dash-timeline-stack");
    timelineStack.innerHTML = "";

    // Take top 4 sorted by date desc
    const sortedDiscussions = [...discussions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);

    if (sortedDiscussions.length === 0) {
        timelineStack.innerHTML = `<div class="text-center p-4 text-xs text-slate-500">No recent discussions logged yet.</div>`;
    } else {
        sortedDiscussions.forEach(disc => {
            const item = document.createElement("div");
            item.className = "timeline-mini-card";
            item.innerHTML = `
                <div class="timeline-mini-header">
                    <span class="timeline-mini-project">${disc.project_name}</span>
                    <span class="timeline-mini-date">${disc.date}</span>
                </div>
                <p class="timeline-mini-points">${disc.points}</p>
                <div style="margin-top: 0.25rem;">
                    <span class="badge-remark badge-remark-${getRemarkClass(disc.remarks)}">${disc.remarks}</span>
                </div>
            `;
            timelineStack.appendChild(item);
        });
    }
}

function getRemarkClass(remark) {
    switch (remark) {
        case "Approved": return "approved";
        case "Not Approved": return "not-approved";
        case "Information": return "info";
        case "For Action": return "action";
        case "Hold": return "hold";
        default: return "not-relevant";
    }
}

// ==========================================
// PROJECTS VIEW
// ==========================================
function renderProjects() {
    const tableBody = document.getElementById("projects-table-body");
    const countLbl = document.getElementById("projects-count-lbl");
    const searchVal = document.getElementById("projects-search-input").value.trim().toLowerCase();
    const pmOnlyChecked = document.getElementById("pm-only-projects-chk").checked;

    tableBody.innerHTML = "";

    // Filtering
    let filtered = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchVal) || p.manager.toLowerCase().includes(searchVal);
        const matchesPm = !pmOnlyChecked || p.manager.toLowerCase() === session.name.toLowerCase();
        return matchesSearch && matchesPm;
    });

    countLbl.textContent = filtered.length;

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No active project profiles found matching scope.</td></tr>`;
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement("tr");
        const statusClass = p.status === "Live" ? "live" : p.status === "Workinprogress" ? "wip" : "pending";
        const statusLabel = p.status === "Workinprogress" ? "Work In Progress" : p.status;

        tr.innerHTML = `
            <td>
                <div style="font-weight: 700; color: darkcyan; font-size: 0.9rem;">${p.name}</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary); font-family: var(--font-mono); margin-top: 0.15rem;">ID: ${p.id}</div>
            </td>
            <td>
                <span class="badge-status badge-${statusClass}">${statusLabel}</span>
            </td>
            <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-secondary);">${p.startdate}</td>
            <td>
                <div style="font-weight: 600; font-size: 0.85rem;">${p.manager}</div>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 0.35rem; justify-content: flex-end; align-items: center;">
                    <button class="action-btn-circle view-detail-btn" data-id="${p.id}" title="Inspect Detailed Brief">
                        <i data-lucide="eye" style="width: 0.8rem; height: 0.8rem;"></i>
                    </button>
                    ${session.role === 'Admin' ? `
                        <button class="action-btn-circle edit-proj-btn" data-id="${p.id}" title="Edit Profile Details">
                            <i data-lucide="edit-3" style="width: 0.8rem; height: 0.8rem;"></i>
                        </button>
                        <button class="action-btn-circle delete delete-proj-btn" data-id="${p.id}" title="Delete Project">
                            <i data-lucide="trash-2" style="width: 0.8rem; height: 0.8rem;"></i>
                        </button>
                    ` : (session.name && p.manager.toLowerCase() === session.name.toLowerCase() ? `
                        <button class="inline-action-link log-note-pm-btn" data-id="${p.id}" style="margin-left: 0.5rem; font-weight: 700; font-size: 0.75rem;">+ Log Note</button>
                    ` : `<span style="font-size: 0.65rem; color: var(--text-secondary); font-style: italic; align-self: center; margin-left: 0.5rem;">View Only</span>`)}
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Attach listeners
    document.querySelectorAll(".view-detail-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            openProjectDetailModal(id);
        });
    });

    document.querySelectorAll(".log-note-pm-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            openDiscussionModal(null, id);
        });
    });

    if (session.role === "Admin") {
        document.querySelectorAll(".edit-proj-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.currentTarget.getAttribute("data-id");
                openProjectModal(id);
            });
        });

        document.querySelectorAll(".delete-proj-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.currentTarget.getAttribute("data-id");
                showConfirm(
                    "Delete Project Register?",
                    "Warning: Deleting this project will also permanently erase all stakeholders discussions nested under it from the historical log.",
                    async () => {
                        try {
                            await apiDelete(`/projects/${id}`);
                            projects = projects.filter(p => p.id !== id);
                            discussions = discussions.filter(d => d.project_id !== id);
                            renderProjects();
                            showToast("Project profile and its discussion timeline deleted.");
                        } catch (err) {
                            console.error(err);
                            showToast("Could not delete project. Please try again.", true);
                        }
                    }
                );
            });
        });
    }

    lucide.createIcons();
}

// ==========================================
// DISCUSSIONS VIEW
// ==========================================
function renderDiscussions() {
    const feedStack = document.getElementById("discussions-feed-stack");
    const filteredCountLbl = document.getElementById("filtered-discussions-count");
    const totalCountLbl = document.getElementById("total-discussions-count");

    // Load filter options
    const filterProj = document.getElementById("filter-disc-project-select");
    const currentSelProj = filterProj.value || "all";
    filterProj.innerHTML = `<option value="all">All Project Masters</option>`;
    projects.forEach(p => {
        filterProj.innerHTML += `<option value="${p.id}" ${currentSelProj === p.id ? 'selected' : ''}>${p.name}</option>`;
    });

    const projectFilter = filterProj.value;
    const remarkFilter = document.getElementById("filter-disc-remark-select").value;
    const pmOnlyChecked = document.getElementById("pm-only-discussions-chk").checked;

    feedStack.innerHTML = "";
    totalCountLbl.textContent = discussions.length;

    let filtered = discussions.filter(d => {
        const matchesProj = projectFilter === "all" || d.project_id === projectFilter;
        const matchesRemark = remarkFilter === "all" || d.remarks === remarkFilter;

        let matchesPm = true;
        if (pmOnlyChecked) {
            const proj = projects.find(p => p.id === d.project_id);
            matchesPm = proj && proj.manager.toLowerCase() === session.name.toLowerCase();
        }

        return matchesProj && matchesRemark && matchesPm;
    });

    // Sort by date desc
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredCountLbl.textContent = filtered.length;

    if (filtered.length === 0) {
        feedStack.innerHTML = `<div class="table-panel" style="padding: 3rem; text-align: center; color: var(--text-secondary); font-size: 0.9rem;">No stakeholder discussions logged matching filter parameters.</div>`;
        return;
    }

    filtered.forEach(d => {
        const card = document.createElement("div");
        card.className = "discussion-feed-card animate-fadeInUp";
        card.innerHTML = `
            <div class="feed-card-header">
                <div>
                    <span class="feed-card-project-lbl">${d.project_name}</span>
                    <span style="font-size: 0.7rem; color: var(--text-secondary); font-family: var(--font-mono); margin-left: 0.5rem;">ID: ${d.id}</span>
                </div>
                <div class="feed-card-controls">
                    <span class="badge-remark badge-remark-${getRemarkClass(d.remarks)}">${d.remarks}</span>
                    ${session.role === 'Admin' || (projects.find(p => p.id === d.project_id)?.manager.toLowerCase() === session.name.toLowerCase()) ? `
                        <button class="action-btn-circle edit-disc-btn" data-id="${d.id}" title="Edit log" style="width: 24px; height: 24px;">
                            <i data-lucide="edit-2" style="width: 0.7rem; height: 0.7rem;"></i>
                        </button>
                        <button class="action-btn-circle delete delete-disc-btn" data-id="${d.id}" title="Delete log" style="width: 24px; height: 24px;">
                            <i data-lucide="trash-2" style="width: 0.7rem; height: 0.7rem;"></i>
                        </button>
                    ` : ""}
                </div>
            </div>
            <p class="feed-card-text">${d.points}</p>
            <div class="feed-card-footer">
                <span class="feed-card-date">Date logged: ${d.date}</span>
                <span style="color: darkcyan; font-weight: 600;">Managed under: ${projects.find(p => p.id === d.project_id)?.manager || 'Unassigned'}</span>
            </div>
        `;
        feedStack.appendChild(card);
    });

    // Bind log edit/delete
    document.querySelectorAll(".edit-disc-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            openDiscussionModal(id);
        });
    });

    document.querySelectorAll(".delete-disc-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            showConfirm(
                "Delete Discussion Pointer?",
                "Are you sure you want to remove this logged stakeholder discussion from the ledger permanently?",
                async () => {
                    try {
                        await apiDelete(`/discussions/${id}`);
                        discussions = discussions.filter(d => d.id !== id);
                        renderDiscussions();
                        showToast("Discussion log removed successfully.");
                    } catch (err) {
                        console.error(err);
                        showToast("Could not delete discussion. Please try again.", true);
                    }
                }
            );
        });
    });

    lucide.createIcons();
}

// ==========================================
// EMPLOYEES VIEW
// ==========================================
function renderEmployees() {
    const tableBody = document.getElementById("employees-table-body");
    const countLbl = document.getElementById("employees-count-lbl");
    const searchVal = document.getElementById("employees-search-input").value.trim().toLowerCase();

    tableBody.innerHTML = "";

    let filtered = employees.filter(emp => {
        return emp.name.toLowerCase().includes(searchVal) || emp.email.toLowerCase().includes(searchVal) || emp.dept.toLowerCase().includes(searchVal);
    });

    countLbl.textContent = filtered.length;

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No employee matches found in active roster.</td></tr>`;
        return;
    }

    filtered.forEach(emp => {
        // Calculate projects managed
        const managedCount = projects.filter(p => p.manager.toLowerCase() === emp.name.toLowerCase()).length;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-family: var(--font-mono); font-weight: 600; color: var(--clr-indigo);">${emp.id}</td>
            <td style="font-weight: 700;">${emp.name}</td>
            <td style="color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.8rem;">${emp.email}</td>
            <td><span style="font-weight: 600; font-size: 0.8rem; background: rgba(255,255,255,0.03); padding: 0.2rem 0.5rem; border-radius: 6px;">${emp.dept}</span></td>
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--clr-emerald);">${managedCount} active</td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
                    <button class="action-btn-circle edit-emp-btn" data-id="${emp.id}" title="Edit Profile">
                        <i data-lucide="user-cog" style="width: 0.8rem; height: 0.8rem;"></i>
                    </button>
                    <button class="action-btn-circle delete delete-emp-btn" data-id="${emp.id}" title="Remove Employee">
                        <i data-lucide="user-minus" style="width: 0.8rem; height: 0.8rem;"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Attach listeners
    document.querySelectorAll(".edit-emp-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            openEmployeeModal(id);
        });
    });

    document.querySelectorAll(".delete-emp-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            const empName = employees.find(emp => emp.id === id)?.name;
            showConfirm(
                "Remove Employee Profile?",
                `Are you sure you want to remove ${empName || 'this employee'} from the directory? Any active projects assigned to them will stay registered, but they won't appear in delegation listings.`,
                async () => {
                    try {
                        await apiDelete(`/employees/${id}`);
                        employees = employees.filter(emp => emp.id !== id);
                        renderEmployees();
                        showToast("Employee roster profile removed.");
                    } catch (err) {
                        console.error(err);
                        showToast("Could not remove employee. Please try again.", true);
                    }
                }
            );
        });
    });

    lucide.createIcons();
}

// ==========================================
// MODAL FORMS HANDLERS & BINDINGS
// ==========================================
function wireModals() {
    // Search bindings on keyups
    document.getElementById("projects-search-input").addEventListener("keyup", renderProjects);
    document.getElementById("pm-only-projects-chk").addEventListener("change", renderProjects);
    document.getElementById("employees-search-input").addEventListener("keyup", renderEmployees);

    // Discussion filter bindings
    document.getElementById("filter-disc-project-select").addEventListener("change", renderDiscussions);
    document.getElementById("filter-disc-remark-select").addEventListener("change", renderDiscussions);
    document.getElementById("pm-only-discussions-chk").addEventListener("change", renderDiscussions);

    // Dynamic header links
    document.getElementById("dash-btn-create-proj").addEventListener("click", () => openProjectModal());
    document.getElementById("dash-btn-log-disc").addEventListener("click", () => openDiscussionModal());
    document.getElementById("projects-btn-register").addEventListener("click", () => openProjectModal());
    document.getElementById("discussions-btn-log").addEventListener("click", () => openDiscussionModal());
    document.getElementById("employees-btn-register").addEventListener("click", () => openEmployeeModal());

    // Modal close hooks
    document.getElementById("modal-project-close").addEventListener("click", () => hideModal("modal-project"));
    document.getElementById("form-project-cancel").addEventListener("click", () => hideModal("modal-project"));
    document.getElementById("modal-discussion-close").addEventListener("click", () => hideModal("modal-discussion"));
    document.getElementById("form-discussion-cancel").addEventListener("click", () => hideModal("modal-discussion"));
    document.getElementById("modal-employee-close").addEventListener("click", () => hideModal("modal-employee"));
    document.getElementById("form-employee-cancel").addEventListener("click", () => hideModal("modal-employee"));
    document.getElementById("modal-project-detail-close").addEventListener("click", () => hideModal("modal-project-detail"));
    document.getElementById("modal-project-detail-cancel").addEventListener("click", () => hideModal("modal-project-detail"));

    // Form submit intercepts
    document.getElementById("project-form").addEventListener("submit", submitProjectForm);
    document.getElementById("discussion-form").addEventListener("submit", submitDiscussionForm);
    document.getElementById("employee-form").addEventListener("submit", submitEmployeeForm);
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.add("hidden");
}

function openProjectModal(id = null) {
    const modal = document.getElementById("modal-project");
    const title = document.getElementById("modal-project-title");
    const submitBtn = document.getElementById("form-project-submit");
    const form = document.getElementById("project-form");

    form.reset();

    // Populate dynamic employee managers selection
    const mgrSelect = document.getElementById("form-project-manager");
    mgrSelect.innerHTML = `<option value="">-- Choose Assigned Manager --</option>`;
    employees.forEach(emp => {
        mgrSelect.innerHTML += `<option value="${emp.name}">${emp.name} (${emp.dept})</option>`;
    });

    if (id) {
        // Edit Mode
        const p = projects.find(item => item.id === id);
        if (!p) return;
        title.innerHTML = `<i data-lucide="edit-3" style="width: 1.25rem; height: 1.25rem; color: var(--clr-indigo);"></i> <span>Edit Project Profile</span>`;
        submitBtn.textContent = "Save Changes";
        document.getElementById("form-project-id").value = p.id;
        document.getElementById("form-project-name").value = p.name;
        document.getElementById("form-project-status").value = p.status;
        document.getElementById("form-project-startdate").value = p.startdate;
        document.getElementById("form-project-manager").value = p.manager;
    } else {
        // Create Mode
        title.innerHTML = `<i data-lucide="folder-plus" style="width: 1.25rem; height: 1.25rem; color: var(--clr-indigo);"></i> <span>Register New Project</span>`;
        submitBtn.textContent = "Register Project";
        document.getElementById("form-project-id").value = "";
        document.getElementById("form-project-startdate").valueAsDate = new Date();
    }

    modal.classList.remove("hidden");
    lucide.createIcons();
}

async function submitProjectForm(e) {
    e.preventDefault();
    const id = document.getElementById("form-project-id").value;
    const name = document.getElementById("form-project-name").value.trim();
    const status = document.getElementById("form-project-status").value;
    const startdate = document.getElementById("form-project-startdate").value;
    const manager = document.getElementById("form-project-manager").value;

    if (!name || !manager) {
        showToast("Please provide project name and assign a manager.", true);
        return;
    }

    try {
        if (id) {
            // Edit update
            await apiPut(`/projects/${id}`, { name, status, startdate, manager });
            const pIndex = projects.findIndex(item => item.id === id);
            if (pIndex !== -1) {
                projects[pIndex] = { id, name, status, startdate, manager };
            }
            // Keep nested discussions references in sync
            discussions.forEach(d => {
                if (d.project_id === id) d.project_name = name;
            });
            showToast("Project Master Register updated successfully.");
        } else {
            // Insert new
            const created = await apiPost("/projects", { name, status, startdate, manager });
            projects.push(created);
            showToast("New Project Master Registered successfully!");
        }

        hideModal("modal-project");

        if (activeTab === "projects") renderProjects();
        else switchTab("projects");
    } catch (err) {
        console.error(err);
        showToast("Could not save the project. Please try again.", true);
    }
}

function openDiscussionModal(id = null, prefilledProjectId = null) {
    const modal = document.getElementById("modal-discussion");
    const title = document.getElementById("modal-discussion-title");
    const submitBtn = document.getElementById("form-discussion-submit");
    const form = document.getElementById("discussion-form");

    form.reset();

    // Load available projects
    const projSelect = document.getElementById("form-discussion-project");
    projSelect.innerHTML = `<option value="">-- Select Project Reference --</option>`;

    // PMs can only add discussions under their assigned projects
    let assignableProjects = projects;
    if (session.role === "Project Manager") {
        assignableProjects = projects.filter(p => p.manager.toLowerCase() === session.name.toLowerCase());
    }

    assignableProjects.forEach(p => {
        projSelect.innerHTML += `<option value="${p.id}">${p.name} (Assigned to: ${p.manager})</option>`;
    });

    if (id) {
        // Edit
        const d = discussions.find(item => item.id === id);
        if (!d) return;
        title.innerHTML = `<i data-lucide="edit-3" style="width: 1.25rem; height: 1.25rem; color: var(--clr-emerald);"></i> <span>Edit Discussion Record</span>`;
        submitBtn.textContent = "Save Notes";
        document.getElementById("form-discussion-id").value = d.id;
        document.getElementById("form-discussion-project").value = d.project_id;
        document.getElementById("form-discussion-points").value = d.points;
        document.getElementById("form-discussion-date").value = d.date;
        document.getElementById("form-discussion-remarks").value = d.remarks;
    } else {
        // Create
        title.innerHTML = `<i data-lucide="message-square-plus" style="width: 1.25rem; height: 1.25rem; color: var(--clr-emerald);"></i> <span>Log Stakeholder Discussion</span>`;
        submitBtn.textContent = "Log Note Entry";
        document.getElementById("form-discussion-id").value = "";
        document.getElementById("form-discussion-date").valueAsDate = new Date();
        if (prefilledProjectId) {
            document.getElementById("form-discussion-project").value = prefilledProjectId;
        }
    }

    modal.classList.remove("hidden");
    lucide.createIcons();
}

async function submitDiscussionForm(e) {
    e.preventDefault();
    const id = document.getElementById("form-discussion-id").value;
    const project_id = document.getElementById("form-discussion-project").value;
    const points = document.getElementById("form-discussion-points").value.trim();
    const date = document.getElementById("form-discussion-date").value;
    const remarks = document.getElementById("form-discussion-remarks").value;

    if (!project_id || !points) {
        showToast("Please select project reference and supply summarized discussion notes.", true);
        return;
    }

    const matchedProject = projects.find(p => p.id === project_id);
    if (!matchedProject) return;

    try {
        if (id) {
            // Edit update
            await apiPut(`/discussions/${id}`, { project_id, project_name: matchedProject.name, points, date, remarks });
            const dIndex = discussions.findIndex(item => item.id === id);
            if (dIndex !== -1) {
                discussions[dIndex] = { id, project_id, project_name: matchedProject.name, points, date, remarks };
            }
            showToast("Stakeholder Ledger notes updated.");
        } else {
            // New insert
            const created = await apiPost("/discussions", { project_id, project_name: matchedProject.name, points, date, remarks });
            discussions.push(created);
            showToast("Stakeholder Discussion Point registered!");
        }

        hideModal("modal-discussion");

        // Close background detail card as well if open
        hideModal("modal-project-detail");

        if (activeTab === "discussions") renderDiscussions();
        else switchTab("discussions");
    } catch (err) {
        console.error(err);
        showToast("Could not save the discussion. Please try again.", true);
    }
}

function openEmployeeModal(id = null) {
    const modal = document.getElementById("modal-employee");
    const title = document.getElementById("modal-employee-title");
    const submitBtn = document.getElementById("form-employee-submit");
    const form = document.getElementById("employee-form");

    form.reset();

    if (id) {
        // Edit
        const emp = employees.find(item => item.id === id);
        if (!emp) return;
        title.innerHTML = `<i data-lucide="user-cog" style="width: 1.25rem; height: 1.25rem; color: var(--clr-indigo);"></i> <span>Edit Employee Roster Profile</span>`;
        submitBtn.textContent = "Save Profile";
        document.getElementById("form-employee-id").value = emp.id;
        document.getElementById("form-employee-name").value = emp.name;
        document.getElementById("form-employee-email").value = emp.email;
        document.getElementById("form-employee-dept").value = emp.dept;
    } else {
        // Create
        title.innerHTML = `<i data-lucide="user-check" style="width: 1.25rem; height: 1.25rem; color: var(--clr-indigo);"></i> <span>Register Employee Profile</span>`;
        submitBtn.textContent = "Register Employee";
        document.getElementById("form-employee-id").value = "";
    }

    modal.classList.remove("hidden");
    lucide.createIcons();
}

async function submitEmployeeForm(e) {
    e.preventDefault();
    const id = document.getElementById("form-employee-id").value;
    const name = document.getElementById("form-employee-name").value.trim();
    const email = document.getElementById("form-employee-email").value.trim().toLowerCase();
    const dept = document.getElementById("form-employee-dept").value;

    if (!name || !email) {
        showToast("Please provide employee name and official email address.", true);
        return;
    }

    try {
        if (id) {
            // Edit update
            const oldName = employees.find(item => item.id === id)?.name;
            await apiPut(`/employees/${id}`, { name, email, dept });
            const empIndex = employees.findIndex(item => item.id === id);
            if (empIndex !== -1) {
                employees[empIndex] = { id, name, email, dept };
            }
            // Update reference in active projects if name changed
            if (oldName && oldName !== name) {
                projects.forEach(p => {
                    if (p.manager.toLowerCase() === oldName.toLowerCase()) p.manager = name;
                });
            }
            showToast("Roster information updated successfully.");
        } else {
            // Insert new
            const created = await apiPost("/employees", { name, email, dept });
            employees.push(created);
            showToast("New Employee Roster Profile added.");
        }

        hideModal("modal-employee");

        if (activeTab === "employees") renderEmployees();
        else switchTab("employees");
    } catch (err) {
        console.error(err);
        showToast("Could not save the employee. Please try again.", true);
    }
}

// Open detail preview card
function openProjectDetailModal(id) {
    const p = projects.find(item => item.id === id);
    if (!p) return;

    document.getElementById("detail-proj-name").textContent = p.name;
    document.getElementById("detail-proj-id").textContent = p.id;
    document.getElementById("detail-proj-manager").textContent = p.manager;
    document.getElementById("detail-proj-startdate").textContent = p.startdate;

    const statusClass = p.status === "Live" ? "live" : p.status === "Workinprogress" ? "wip" : "pending";
    const statusLabel = p.status === "Workinprogress" ? "Work In Progress" : p.status;
    document.getElementById("detail-proj-status-badge").innerHTML = `<span class="badge-status badge-${statusClass}">${statusLabel}</span>`;

    // Render scoped discussions listed nested under details
    const list = document.getElementById("detail-discussions-list");
    list.innerHTML = "";

    const filtered = discussions.filter(d => d.project_id === id);

    if (filtered.length === 0) {
        list.innerHTML = `<span style="font-size:0.75rem; color:var(--text-secondary); text-align:center; display:block; padding:0.5rem 0;">No scoped discussions logged.</span>`;
    } else {
        filtered.forEach(d => {
            const item = document.createElement("div");
            item.className = "scoped-disc-mini-item";
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.65rem;">
                    <span style="font-family:var(--font-mono); color:var(--text-secondary);">${d.date}</span>
                    <span class="badge-remark badge-remark-${getRemarkClass(d.remarks)}">${d.remarks}</span>
                </div>
                <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.4; margin-top:2px;">${d.points}</p>
            `;
            list.appendChild(item);
        });
    }

    // Bind +Add Point button click
    const addPointBtn = document.getElementById("detail-btn-add-point");
    const isAssignedPm = session && p.manager.toLowerCase() === session.name.toLowerCase();
    if (session.role === "Admin" || isAssignedPm) {
        addPointBtn.classList.remove("hidden");
    } else {
        addPointBtn.classList.add("hidden");
    }

    addPointBtn.onclick = () => {
        hideModal("modal-project-detail");
        openDiscussionModal(null, p.id);
    };

    document.getElementById("modal-project-detail").classList.remove("hidden");
    lucide.createIcons();
}
