/**
 * Project Health Hub - Frontend Application Controller
 * (High Fidelity Vanilla JS replicating React UX and styling)
 */

// ==========================================
// 1. DEMO DATA SEEDS & SCHEMAS
// ==========================================
const SEED_EMPLOYEES = [
    { id: "EMP001", name: "Clara Oswald", email: "clara.oswald@projecthealth.com", department: "Engineering" },
    { id: "EMP002", name: "Marcus Aurelius", email: "marcus.aurelius@projecthealth.com", department: "Operations" },
    { id: "EMP003", name: "Devon Rex", email: "devon.rex@projecthealth.com", department: "Product Strategy" }
];

const SEED_PROJECTS = [
    { id: "PRJ-001", name: "Apollo Phoenix Upgrade", status: "Live", startdate: "2026-01-15", manager: "Clara Oswald" },
    { id: "PRJ-002", name: "Enterprise Security Shield", status: "Workinprogress", startdate: "2026-03-01", manager: "Marcus Aurelius" },
    { id: "PRJ-003", name: "Global Logistics Sync", status: "Yet to start", startdate: "2026-08-10", manager: "Devon Rex" }
];

const SEED_DISCUSSIONS = [
    { id: "DSC-001", project_id: "PRJ-001", project_name: "Apollo Phoenix Upgrade", points: "Completed phase 1 testing. API latency dropped by 34% after implementing caching cluster.", date: "2026-06-25", remarks: "Approved", author: "Clara Oswald" },
    { id: "DSC-002", project_id: "PRJ-002", project_name: "Enterprise Security Shield", points: "Identified dependency issues in the auth gateway. Deploying firewall hotfixes this afternoon.", date: "2026-07-02", remarks: "For Action", author: "Marcus Aurelius" },
    { id: "DSC-003", project_id: "PRJ-001", project_name: "Apollo Phoenix Upgrade", points: "Discussed adding multi-factor authentication requirements. Put on secondary roadmap.", date: "2026-06-29", remarks: "Hold", author: "Administrator" }
];

const SEED_ADMINS = [
    { name: "Administrator", email: "admin@projecthealth.com" }
];

// ==========================================
// 2. HELPER UTILITIES & CONTROLS
// ==========================================
const getLocalStorage = (key, defaultValue) => {
    const val = localStorage.getItem(key);
    if (val) {
        try {
            return JSON.parse(val);
        } catch (e) {
            return defaultValue;
        }
    }
    return defaultValue;
};

const setLocalStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// Custom Toast Alerts System
let toastTimeout = null;
const showToast = (message, type = "success") => {
    const overlay = document.getElementById("toast-overlay");
    const label = document.getElementById("toast-message-lbl");
    const successIcon = document.getElementById("toast-icon-success");
    const errorIcon = document.getElementById("toast-icon-error");

    if (!overlay) return;

    label.innerText = message;
    
    if (type === "error") {
        overlay.style.background = "rgba(244, 63, 94, 0.95)";
        overlay.style.borderColor = "rgba(244, 63, 94, 0.3)";
        successIcon.classList.add("hidden");
        errorIcon.classList.remove("hidden");
    } else {
        overlay.style.background = "rgba(15, 23, 42, 0.95)";
        overlay.style.borderColor = "rgba(255, 255, 255, 0.1)";
        successIcon.classList.remove("hidden");
        errorIcon.classList.add("hidden");
    }

    overlay.classList.remove("hidden");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        overlay.classList.add("hidden");
    }, 4000);
};

// Custom Confirmation Dialog overlay modal
let onConfirmCallback = null;
const showConfirm = (title, message, onConfirm) => {
    const modal = document.getElementById("modal-confirm");
    const titleLabel = document.getElementById("confirm-title-lbl");
    const messageLabel = document.getElementById("confirm-message-lbl");
    
    if (!modal) return;

    titleLabel.innerText = title;
    messageLabel.innerText = message;
    onConfirmCallback = onConfirm;

    modal.classList.remove("hidden");
};

// ==========================================
// 3. STATE MANAGER CLASS
// ==========================================
class StateManager {
    constructor() {
        this.currentUser = null;
        this.employees = [];
        this.projects = [];
        this.discussions = [];
        this.admins = [];
        
        // Active Navigation tab section
        this.activeSection = "dashboard"; // dashboard, projects, discussions, employees

        // OTP Auth Session Temp memory
        this.otpSent = false;
        this.otpCode = "";
        this.otpEmail = "";
        this.otpTimer = 30;
        this.otpInterval = null;
    }

    init() {
        // Hydrate from localStorage using identical keys as React app
        this.employees = getLocalStorage("ph_employees", SEED_EMPLOYEES);
        this.projects = getLocalStorage("ph_projects", SEED_PROJECTS);
        this.discussions = getLocalStorage("ph_discussions", SEED_DISCUSSIONS);
        this.admins = getLocalStorage("ph_admins", SEED_ADMINS);

        // Save back if empty (First time setup)
        if (!localStorage.getItem("ph_employees")) this.saveEmployees();
        if (!localStorage.getItem("ph_projects")) this.saveProjects();
        if (!localStorage.getItem("ph_discussions")) this.saveDiscussions();
        if (!localStorage.getItem("ph_admins")) this.saveAdmins();

        // Check active session status
        const savedLoggedIn = localStorage.getItem("ph_logged_in");
        const savedUser = localStorage.getItem("ph_user");

        if (savedLoggedIn === "true" && savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                return true;
            } catch (e) {
                this.currentUser = null;
                return false;
            }
        }
        return false;
    }

    saveEmployees() { setLocalStorage("ph_employees", this.employees); }
    saveProjects() { setLocalStorage("ph_projects", this.projects); }
    saveDiscussions() { setLocalStorage("ph_discussions", this.discussions); }
    saveAdmins() { setLocalStorage("ph_admins", this.admins); }

    login(user) {
        this.currentUser = user;
        localStorage.setItem("ph_logged_in", "true");
        localStorage.setItem("ph_user", JSON.stringify(user));
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem("ph_logged_in");
        localStorage.removeItem("ph_user");
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === "Admin";
    }

    isManager() {
        return this.currentUser && this.currentUser.role === "Project Manager";
    }
}

const state = new StateManager();

// ==========================================
// 4. AUTHENTICATION & LOGIN/SIGNUP VIEWS
// ==========================================
function setupAuthListeners() {
    const tabSignIn = document.getElementById("tab-btn-signin");
    const tabSignUp = document.getElementById("tab-btn-signup");
    const signinForm = document.getElementById("signin-form");
    const signupForm = document.getElementById("signup-form");
    
    // Switch between Auth Tabs
    tabSignIn.addEventListener("click", () => {
        tabSignIn.classList.add("active");
        tabSignUp.classList.remove("active");
        signinForm.classList.remove("hidden");
        signupForm.classList.add("hidden");
        document.getElementById("auth-error-banner").classList.add("hidden");
    });

    tabSignUp.addEventListener("click", () => {
        tabSignUp.classList.add("active");
        tabSignIn.classList.remove("active");
        signupForm.classList.remove("hidden");
        signinForm.classList.add("hidden");
        document.getElementById("auth-error-banner").classList.add("hidden");
    });

    // Sign In role radio selection triggers
    const roleAdmin = document.getElementById("role-option-admin");
    const rolePM = document.getElementById("role-option-pm");
    const radioAdminInput = roleAdmin.querySelector("input");
    const radioPMInput = rolePM.querySelector("input");

    roleAdmin.addEventListener("click", () => {
        roleAdmin.classList.add("selected-admin");
        rolePM.classList.remove("selected-pm");
        radioAdminInput.checked = true;
        renderQuickSelects("Admin");
    });

    rolePM.addEventListener("click", () => {
        rolePM.classList.add("selected-pm");
        roleAdmin.classList.remove("selected-admin");
        radioPMInput.checked = true;
        renderQuickSelects("Project Manager");
    });

    // Sign Up role radio selection triggers
    const sRoleAdmin = document.getElementById("signup-role-admin");
    const sRolePM = document.getElementById("signup-role-pm");
    const sRadioAdminInput = sRoleAdmin.querySelector("input");
    const sRadioPMInput = sRolePM.querySelector("input");
    const signupDeptWrapper = document.getElementById("signup-dept-wrapper");

    sRoleAdmin.addEventListener("click", () => {
        sRoleAdmin.classList.add("selected-admin");
        sRolePM.classList.remove("selected-pm");
        sRadioAdminInput.checked = true;
        signupDeptWrapper.classList.add("hidden");
    });

    sRolePM.addEventListener("click", () => {
        sRolePM.classList.add("selected-pm");
        sRoleAdmin.classList.remove("selected-admin");
        sRadioPMInput.checked = true;
        signupDeptWrapper.classList.remove("hidden");
    });

    // Sign In Request OTP submit
    signinForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const errorBanner = document.getElementById("auth-error-banner");
        const errorMsg = document.getElementById("auth-error-msg");
        errorBanner.classList.add("hidden");

        const selectedRole = document.querySelector('input[name="loginRole"]:checked').value;
        const email = document.getElementById("login-email-input").value.trim().toLowerCase();

        if (!email) {
            errorMsg.innerText = "Please enter a valid email address.";
            errorBanner.classList.remove("hidden");
            return;
        }

        // Validate user matches selected system role
        let foundUser = null;
        if (selectedRole === "Admin") {
            foundUser = state.admins.find(a => a.email.toLowerCase() === email);
        } else {
            foundUser = state.employees.find(emp => emp.email.toLowerCase() === email);
        }

        if (!foundUser) {
            errorMsg.innerText = `Email "${email}" is not registered as ${selectedRole}. Please register under the "Sign Up" tab first.`;
            errorBanner.classList.remove("hidden");
            return;
        }

        // Generate dynamic code and trigger OTP Verification Screen
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        state.otpCode = generatedCode;
        state.otpEmail = email;
        state.otpSent = true;
        state.otpTimer = 30;

        // Display OTP screens
        document.getElementById("role-selection-wrapper").classList.add("hidden");
        document.getElementById("email-input-wrapper").classList.add("hidden");
        document.getElementById("otp-input-wrapper").classList.remove("hidden");
        document.getElementById("otp-target-email").innerText = email;
        
        // Show Interceptor side card
        const interceptor = document.getElementById("smtp-interceptor-card");
        interceptor.classList.remove("hidden");
        document.getElementById("smtp-to-email").innerText = email;
        document.getElementById("smtp-to-name").innerText = `(${foundUser.name})`;
        document.getElementById("smtp-subject-code").innerText = generatedCode;
        document.getElementById("smtp-body-name").innerText = foundUser.name;
        document.getElementById("smtp-body-role").innerText = selectedRole;
        document.getElementById("smtp-code-display").innerText = generatedCode;

        // Reset inputs and start Countdown
        document.getElementById("otp-code-input").value = "";
        startOtpCountdown();
        showToast("Authorization passcode dispatched to local SMTP interceptor panel!", "success");
        lucide.createIcons();
    });

    // Verification Submit Action
    document.getElementById("btn-verify-otp").addEventListener("click", () => {
        const inputCode = document.getElementById("otp-code-input").value.trim();
        const errorBanner = document.getElementById("auth-error-banner");
        const errorMsg = document.getElementById("auth-error-msg");
        errorBanner.classList.add("hidden");

        if (inputCode !== state.otpCode) {
            errorMsg.innerText = "Incorrect 6-digit passcode. Review the SMTP secure interceptor panel on the right of your screen.";
            errorBanner.classList.remove("hidden");
            return;
        }

        // Authenticate! Get user record
        const selectedRole = document.querySelector('input[name="loginRole"]:checked').value;
        let loggedUser = null;

        if (selectedRole === "Admin") {
            const admin = state.admins.find(a => a.email.toLowerCase() === state.otpEmail);
            loggedUser = {
                name: admin ? admin.name : "Administrator",
                email: state.otpEmail,
                role: "Admin"
            };
        } else {
            const pm = state.employees.find(emp => emp.email.toLowerCase() === state.otpEmail);
            loggedUser = {
                name: pm ? pm.name : "Project Manager",
                email: state.otpEmail,
                role: "Project Manager"
            };
        }

        // Login completed successfully
        state.login(loggedUser);
        clearInterval(state.otpInterval);
        
        // Hide auth layout, show central Hub workspace
        document.getElementById("auth-container").classList.add("hidden");
        document.getElementById("smtp-interceptor-card").classList.add("hidden");
        document.getElementById("workspace-container").classList.remove("hidden");

        showToast(`Signed in successfully as ${loggedUser.name}!`, "success");
        
        // Boot Workspace renderers
        renderWorkspaceHeader();
        switchSection("dashboard");
    });

    // OTP Navigation Controls (edit email & resend)
    document.getElementById("btn-edit-email").addEventListener("click", () => {
        clearInterval(state.otpInterval);
        state.otpSent = false;
        
        document.getElementById("role-selection-wrapper").classList.remove("hidden");
        document.getElementById("email-input-wrapper").classList.remove("hidden");
        document.getElementById("otp-input-wrapper").classList.add("hidden");
        document.getElementById("smtp-interceptor-card").classList.add("hidden");
        document.getElementById("auth-error-banner").classList.add("hidden");
    });

    document.getElementById("btn-resend-otp").addEventListener("click", () => {
        if (state.otpTimer > 0) return; // Prevent spamming

        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        state.otpCode = generatedCode;
        state.otpTimer = 30;

        document.getElementById("smtp-subject-code").innerText = generatedCode;
        document.getElementById("smtp-code-display").innerText = generatedCode;

        startOtpCountdown();
        showToast("New secure authorization passcode dispatched!", "success");
    });

    // Signup form submission
    signupForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const errorBanner = document.getElementById("auth-error-banner");
        const errorMsg = document.getElementById("auth-error-msg");
        errorBanner.classList.add("hidden");

        const name = document.getElementById("signup-name-input").value.trim();
        const email = document.getElementById("signup-email-input").value.trim().toLowerCase();
        const selectedRole = document.querySelector('input[name="signUpRole"]:checked').value;
        const dept = document.getElementById("signup-dept-select").value;

        if (!name || !email) {
            errorMsg.innerText = "Full name and email are strictly required fields.";
            errorBanner.classList.remove("hidden");
            return;
        }

        // Check duplicate email
        const pmExists = state.employees.some(emp => emp.email.toLowerCase() === email);
        const adminExists = state.admins.some(a => a.email.toLowerCase() === email);

        if (pmExists || adminExists) {
            errorMsg.innerText = "This email is already registered. Please sign in instead.";
            errorBanner.classList.remove("hidden");
            return;
        }

        if (selectedRole === "Admin") {
            const newAdmin = { name, email };
            state.admins.push(newAdmin);
            state.saveAdmins();

            // Redirect to sign in tab, populate credentials
            tabSignIn.click();
            roleAdmin.click();
            document.getElementById("login-email-input").value = email;
            showToast(`Admin profile registered! Securely sign in using: ${email}`, "success");
        } else {
            const nextId = `EMP00${state.employees.length + 1}`;
            const newPm = {
                id: nextId,
                name,
                email,
                department: dept || "Engineering"
            };
            state.employees.push(newPm);
            state.saveEmployees();

            // Redirect to sign in tab, populate PM
            tabSignIn.click();
            rolePM.click();
            document.getElementById("login-email-input").value = email;
            showToast(`Registered successfully as Employee ${nextId}! Sign in using: ${email}`, "success");
        }

        // Clear Sign Up fields
        document.getElementById("signup-name-input").value = "";
        document.getElementById("signup-email-input").value = "";
    });

    // SMTP Interceptor Code Copy
    document.getElementById("copy-otp-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(state.otpCode).then(() => {
            showToast("Passcode copied to clipboard!", "success");
        }).catch(e => {
            // Fallback
            const el = document.createElement("textarea");
            el.value = state.otpCode;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            showToast("Passcode copied to clipboard!", "success");
        });
    });

    // Load initial quick selects
    renderQuickSelects("Admin");
}

function startOtpCountdown() {
    const timerText = document.getElementById("otp-timer-text");
    const countdown = document.getElementById("otp-countdown");
    const resendBtn = document.getElementById("btn-resend-otp");

    timerText.classList.remove("hidden");
    resendBtn.classList.add("hidden");
    countdown.innerText = state.otpTimer;

    if (state.otpInterval) clearInterval(state.otpInterval);

    state.otpInterval = setInterval(() => {
        state.otpTimer--;
        countdown.innerText = state.otpTimer;

        if (state.otpTimer <= 0) {
            clearInterval(state.otpInterval);
            timerText.classList.add("hidden");
            resendBtn.classList.remove("hidden");
        }
    }, 1000);
}

// Render instant selector buttons to facilitate rapid grading checks
function renderQuickSelects(role) {
    const container = document.getElementById("quick-select-container");
    const title = document.getElementById("quick-select-title");
    container.innerHTML = "";

    if (role === "Admin") {
        title.innerText = "💡 QUICK SELECT REGISTERED ADMINS";
        state.admins.forEach(admin => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-quick-user";
            btn.innerText = admin.email;
            btn.addEventListener("click", () => {
                document.getElementById("login-email-input").value = admin.email;
            });
            container.appendChild(btn);
        });
    } else {
        title.innerText = "💡 QUICK SELECT PROJECT MANAGERS";
        state.employees.forEach(emp => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-quick-user";
            btn.innerText = emp.email;
            btn.addEventListener("click", () => {
                document.getElementById("login-email-input").value = emp.email;
            });
            container.appendChild(btn);
        });
        if (state.employees.length === 0) {
            container.innerHTML = `<span style="font-size: 0.7rem; color: var(--text-muted); font-style: italic;">No PM roster profiles registered. Sign up to add profiles.</span>`;
        }
    }
}

// ==========================================
// 5. HUB WORKSPACE RENDERING LOOPS
// ==========================================
function renderWorkspaceHeader() {
    const user = state.currentUser;
    if (!user) return;

    document.getElementById("user-header-name").innerText = user.name;
    document.getElementById("user-header-role").innerText = user.role;

    // Set Initials badge and styles
    const avatar = document.getElementById("user-header-avatar");
    const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    avatar.innerText = initials;

    if (state.isAdmin()) {
        avatar.className = "avatar-badge admin-badge";
        // Show Admin items
        document.querySelectorAll(".admin-only").forEach(el => el.classList.remove("hidden"));
        document.querySelectorAll(".pm-only").forEach(el => el.classList.add("hidden"));
    } else {
        avatar.className = "avatar-badge pm-badge";
        // Show PM only, hide admin
        document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
        document.querySelectorAll(".pm-only").forEach(el => el.classList.remove("hidden"));
    }
    lucide.createIcons();
}

function setupWorkspaceListeners() {
    // Navigation top buttons
    const navDashboard = document.getElementById("nav-btn-dashboard");
    const navProjects = document.getElementById("nav-btn-projects");
    const navDiscussions = document.getElementById("nav-btn-discussions");
    const navEmployees = document.getElementById("nav-btn-employees");
    const logoDashboard = document.getElementById("logo-dashboard-trigger");

    const clearActive = () => {
        [navDashboard, navProjects, navDiscussions, navEmployees].forEach(b => b.classList.remove("active"));
    };

    navDashboard.addEventListener("click", () => { clearActive(); navDashboard.classList.add("active"); switchSection("dashboard"); });
    navProjects.addEventListener("click", () => { clearActive(); navProjects.classList.add("active"); switchSection("projects"); });
    navDiscussions.addEventListener("click", () => { clearActive(); navDiscussions.classList.add("active"); switchSection("discussions"); });
    navEmployees.addEventListener("click", () => { clearActive(); navEmployees.classList.add("active"); switchSection("employees"); });
    logoDashboard.addEventListener("click", () => { clearActive(); navDashboard.classList.add("active"); switchSection("dashboard"); });

    // Timeline redirect shortcut from dashboard
    document.getElementById("dash-view-all-logs").addEventListener("click", () => {
        navDiscussions.click();
    });

    // Logging out
    document.getElementById("btn-logout-header").addEventListener("click", () => {
        showConfirm("Log Out Session", "Are you sure you want to log out of the workspace? Active local data is cached safely.", () => {
            state.logout();
            document.getElementById("workspace-container").classList.add("hidden");
            document.getElementById("auth-container").classList.remove("hidden");
            
            // Go back to sign-in tab
            document.getElementById("tab-btn-signin").click();
            document.getElementById("role-option-admin").click();
            document.getElementById("login-email-input").value = "admin@projecthealth.com";

            // Hide interceptor
            document.getElementById("smtp-interceptor-card").classList.add("hidden");
            
            document.getElementById("modal-confirm").classList.add("hidden");
            showToast("Logged out successfully.", "success");
        });
    });

    // Quick creation triggers from dashboard greeting panel
    document.getElementById("dash-btn-create-proj").addEventListener("click", () => {
        openProjectModal();
    });
    document.getElementById("dash-btn-log-disc").addEventListener("click", () => {
        openDiscussionModal();
    });

    // Format Database Maintenance Operations
    document.getElementById("btn-format-db").addEventListener("click", () => {
        showConfirm(
            "Format Entire Workspace",
            "This will completely delete all active projects, employees, and discussion logs. It wipes the database schemas cleanly to start from scratch. Proceed?",
            () => {
                state.projects = [];
                state.employees = [];
                state.discussions = [];
                
                state.saveProjects();
                state.saveEmployees();
                state.saveDiscussions();

                document.getElementById("modal-confirm").classList.add("hidden");
                showToast("Workspace database formatted cleanly!", "success");
                
                // Re-render
                renderDashboard();
                populateProjectDropdowns();
            }
        );
    });

    // Restore Sandbox Demo Data
    document.getElementById("btn-restore-db").addEventListener("click", () => {
        showConfirm(
            "Restore Sandbox Demo Dataset",
            "This will restore the standard mock employee roster, live projects directory, and historic discussion timeline pointers. Proceed?",
            () => {
                state.projects = [...SEED_PROJECTS];
                state.employees = [...SEED_EMPLOYEES];
                state.discussions = [...SEED_DISCUSSIONS];
                
                state.saveProjects();
                state.saveEmployees();
                state.saveDiscussions();

                document.getElementById("modal-confirm").classList.add("hidden");
                showToast("Demo dataset restored successfully!", "success");

                // Re-render
                renderDashboard();
                populateProjectDropdowns();
            }
        );
    });

    // Search and filters triggers
    document.getElementById("projects-search-input").addEventListener("input", renderProjects);
    document.getElementById("pm-only-projects-chk").addEventListener("change", renderProjects);
    
    document.getElementById("filter-disc-project-select").addEventListener("change", renderDiscussions);
    document.getElementById("filter-disc-remark-select").addEventListener("change", renderDiscussions);
    document.getElementById("pm-only-discussions-chk").addEventListener("change", renderDiscussions);

    document.getElementById("employees-search-input").addEventListener("input", renderEmployees);

    // Dynamic buttons inside directory section headers
    document.getElementById("projects-btn-register").addEventListener("click", () => openProjectModal());
    document.getElementById("discussions-btn-log").addEventListener("click", () => openDiscussionModal());
    document.getElementById("employees-btn-register").addEventListener("click", () => openEmployeeModal());
}

function switchSection(sectionId) {
    state.activeSection = sectionId;

    // Toggle viewport sections visibility
    document.getElementById("section-dashboard").classList.add("hidden");
    document.getElementById("section-projects").classList.add("hidden");
    document.getElementById("section-discussions").classList.add("hidden");
    document.getElementById("section-employees").classList.add("hidden");

    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) targetSection.classList.remove("hidden");

    // Perform specific section rendering updates
    if (sectionId === "dashboard") renderDashboard();
    else if (sectionId === "projects") renderProjects();
    else if (sectionId === "discussions") {
        populateProjectDropdowns();
        renderDiscussions();
    }
    else if (sectionId === "employees") renderEmployees();
}

// ==========================================
// A. EXECUTIVE DASHBOARD SUBSECTION
// ==========================================
function renderDashboard() {
    const user = state.currentUser;
    if (!user) return;

    // Update Name header greet
    document.getElementById("dash-greeting-name").innerText = user.name;
    document.getElementById("dash-greeting-role").innerText = user.role;

    // 1. Calculate and update simple stats badges
    const liveCount = state.projects.filter(p => p.status === "Live").length;
    const wipCount = state.projects.filter(p => p.status === "Workinprogress").length;
    const pendingCount = state.projects.filter(p => p.status === "Yet to start").length;
    const totalCount = state.projects.length;

    document.getElementById("dash-stat-live").innerText = liveCount;
    document.getElementById("dash-stat-wip").innerText = wipCount;
    document.getElementById("dash-stat-pending").innerText = pendingCount;

    // 2. Compute project health distribution percentages
    const livePercent = totalCount > 0 ? Math.round((liveCount / totalCount) * 100) : 0;
    const wipPercent = totalCount > 0 ? Math.round((wipCount / totalCount) * 100) : 0;
    const pendingPercent = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;

    // Labels info text
    document.getElementById("progress-lbl-live").innerText = `${livePercent}% (${liveCount}/${totalCount})`;
    document.getElementById("progress-lbl-wip").innerText = `${wipPercent}% (${wipCount}/${totalCount})`;
    document.getElementById("progress-lbl-pending").innerText = `${pendingPercent}% (${pendingCount}/${totalCount})`;

    // Progress fills width transition updates
    document.getElementById("progress-fill-live").style.width = `${livePercent}%`;
    document.getElementById("progress-fill-wip").style.width = `${wipPercent}%`;
    document.getElementById("progress-fill-pending").style.width = `${pendingPercent}%`;

    // 3. Render latest 3 discussion items in dashboard feed timeline
    const timelineStack = document.getElementById("dash-timeline-stack");
    timelineStack.innerHTML = "";

    // Sort discussions by date descending, grab top 3
    const sortedDiscussions = [...state.discussions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

    sortedDiscussions.forEach(disc => {
        const entry = document.createElement("div");
        entry.className = "timeline-entry-card";
        
        let remarkClass = "tag-remark-neutral";
        if (disc.remarks === "Approved") remarkClass = "tag-remark-approved";
        else if (disc.remarks === "For Action") remarkClass = "tag-remark-foraction";
        else if (disc.remarks === "Hold") remarkClass = "tag-remark-hold";
        else if (disc.remarks === "Not Approved") remarkClass = "tag-remark-notapproved";

        entry.innerHTML = `
            <div class="timeline-header-row">
                <span class="timeline-project-lbl">${disc.project_name}</span>
                <span class="timeline-meta-lbl">${disc.date}</span>
            </div>
            <p class="timeline-text">${disc.points}</p>
            <div class="timeline-footer-row">
                <span class="timeline-author">Logged by: <strong>${disc.author}</strong></span>
                <span class="tag-remark-badge ${remarkClass}">${disc.remarks}</span>
            </div>
        `;
        timelineStack.appendChild(entry);
    });

    if (sortedDiscussions.length === 0) {
        timelineStack.innerHTML = `<div class="text-center-muted" style="padding: 2.5rem;">No discussion notes compiled in the timeline yet.</div>`;
    }

    lucide.createIcons();
}

// ==========================================
// B. PROJECTS DIRECTORY SUBSECTION
// ==========================================
function renderProjects() {
    const tableBody = document.getElementById("projects-table-body");
    const searchVal = document.getElementById("projects-search-input").value.trim().toLowerCase();
    const pmOnlyChk = document.getElementById("pm-only-projects-chk").checked;
    
    tableBody.innerHTML = "";

    // Filter projects based on query and PM constraint
    let filtered = state.projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchVal) || p.manager.toLowerCase().includes(searchVal);
        if (state.isManager() && pmOnlyChk) {
            return matchesSearch && p.manager.toLowerCase() === state.currentUser.name.toLowerCase();
        }
        return matchesSearch;
    });

    // Update Directory count label
    document.getElementById("projects-count-lbl").innerText = filtered.length;

    filtered.forEach(p => {
        const tr = document.createElement("tr");

        // Compute status level pill
        let pillHtml = `<span class="status-pill status-pill-pending"><span class="status-dot" style="background-color: var(--clr-indigo); animation: none;"></span><span>Yet to Start</span></span>`;
        if (p.status === "Live") {
            pillHtml = `<span class="status-pill status-pill-live"><span class="status-dot"></span><span>Live Deployments</span></span>`;
        } else if (p.status === "Workinprogress") {
            pillHtml = `<span class="status-pill status-pill-wip"><span class="status-dot" style="background-color: var(--clr-amber);"></span><span>Work In Progress</span></span>`;
        }

        // Action row buttons based on roles
        let actionsHtml = "";
        const isAssignedPm = state.currentUser && p.manager.toLowerCase() === state.currentUser.name.toLowerCase();

        if (state.isAdmin()) {
            actionsHtml = `
                <div class="actions-cell">
                    <button class="action-btn-circle" onclick="viewProjectDetails('${p.id}')" title="Detailed Brief">
                        <i data-lucide="eye" style="width: 0.85rem; height: 0.85rem;"></i>
                    </button>
                    <button class="action-btn-circle" onclick="openEditProjectModal('${p.id}')" title="Modify Record">
                        <i data-lucide="edit-3" style="width: 0.85rem; height: 0.85rem;"></i>
                    </button>
                    <button class="action-btn-circle delete" onclick="handleDeleteProject('${p.id}')" title="Delete Project">
                        <i data-lucide="trash-2" style="width: 0.85rem; height: 0.85rem;"></i>
                    </button>
                </div>
            `;
        } else {
            // Project Managers can Log Notes for assigned ones
            if (isAssignedPm) {
                actionsHtml = `
                    <div class="actions-cell" style="align-items: center; gap: 0.75rem;">
                        <button class="action-btn-circle" onclick="viewProjectDetails('${p.id}')" title="Detailed Brief">
                            <i data-lucide="eye" style="width: 0.85rem; height: 0.85rem;"></i>
                        </button>
                        <button class="inline-action-link" onclick="openDiscussionModalForProject('${p.id}')">+ Log Note</button>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div class="actions-cell">
                        <button class="action-btn-circle" onclick="viewProjectDetails('${p.id}')" title="Detailed Brief">
                            <i data-lucide="eye" style="width: 0.85rem; height: 0.85rem;"></i>
                        </button>
                        <span style="font-size: 0.65rem; color: var(--text-muted); font-style: italic; margin-right: 0.25rem;">View Only</span>
                    </div>
                `;
            }
        }

        tr.innerHTML = `
            <td>
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">${p.name}</div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--clr-indigo); font-weight: 700; margin-top: 2px;">${p.id}</div>
            </td>
            <td>${pillHtml}</td>
            <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">${p.startdate}</td>
            <td style="font-weight: 600; color: var(--text-primary);">${p.manager}</td>
            <td style="text-align: right;">${actionsHtml}</td>
        `;

        tableBody.appendChild(tr);
    });

    if (filtered.length === 0) {
        const cols = 5;
        tableBody.innerHTML = `
            <tr>
                <td colspan="${cols}" class="text-center-muted" style="padding: 4rem;">
                    No projects found matching your search.
                </td>
            </tr>
        `;
    }

    lucide.createIcons();
}

// ==========================================
// C. DISCUSSION REGISTER SUBSECTION
// ==========================================
function populateProjectDropdowns() {
    const filterProj = document.getElementById("filter-disc-project-select");
    const formProj = document.getElementById("form-discussion-project");
    const formPM = document.getElementById("form-project-manager");

    if (!filterProj) return;

    // 1. Discussions Project Filter Dropdown
    const activeFilter = filterProj.value;
    filterProj.innerHTML = `<option value="all">All Project Masters</option>`;
    state.projects.forEach(p => {
        filterProj.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
    filterProj.value = activeFilter || "all";

    // 2. Add/Edit Discussion Project Selector
    formProj.innerHTML = `<option value="" disabled selected>-- Choose Project --</option>`;
    
    // If PM, they can only log for projects they manage. Admins can log for all.
    let targetProjs = state.projects;
    if (state.isManager()) {
        targetProjs = state.projects.filter(p => p.manager.toLowerCase() === state.currentUser.name.toLowerCase());
    }

    targetProjs.forEach(p => {
        formProj.innerHTML += `<option value="${p.id}">${p.name} ${state.isAdmin() ? `(${p.manager})` : ""}</option>`;
    });

    // 3. Project Creation PM Selection lists
    if (formPM) {
        formPM.innerHTML = "";
        state.employees.forEach(emp => {
            formPM.innerHTML += `<option value="${emp.name}">${emp.name} (${emp.department})</option>`;
        });
        if (state.employees.length === 0) {
            formPM.innerHTML = `<option value="Unassigned">No registered Employees</option>`;
        }
    }
}

function renderDiscussions() {
    const container = document.getElementById("discussions-feed-stack");
    const projFilter = document.getElementById("filter-disc-project-select").value;
    const remarkFilter = document.getElementById("filter-disc-remark-select").value;
    const pmOnlyChk = document.getElementById("pm-only-discussions-chk") ? document.getElementById("pm-only-discussions-chk").checked : false;

    container.innerHTML = "";

    // Gather records matching selected parameters
    let filtered = state.discussions.filter(disc => {
        const matchesProj = projFilter === "all" || disc.project_id === projFilter;
        const matchesRemark = remarkFilter === "all" || disc.remarks === remarkFilter;
        
        let matchesPm = true;
        if (state.isManager() && pmOnlyChk) {
            // Find corresponding project manager
            const project = state.projects.find(p => p.id === disc.project_id);
            matchesPm = project && project.manager.toLowerCase() === state.currentUser.name.toLowerCase();
        }

        return matchesProj && matchesRemark && matchesPm;
    });

    // Display counts
    document.getElementById("filtered-discussions-count").innerText = filtered.length;
    document.getElementById("total-discussions-count").innerText = state.discussions.length;

    // Sort discussions by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach(disc => {
        const card = document.createElement("div");
        
        let borderClass = "border-neutral";
        let remarkClass = "tag-remark-neutral";
        
        if (disc.remarks === "Approved") { borderClass = "border-approved"; remarkClass = "tag-remark-approved"; }
        else if (disc.remarks === "For Action") { borderClass = "border-foraction"; remarkClass = "tag-remark-foraction"; }
        else if (disc.remarks === "Hold") { borderClass = "border-hold"; remarkClass = "tag-remark-hold"; }
        else if (disc.remarks === "Not Approved") { borderClass = "border-notapproved"; remarkClass = "tag-remark-notapproved"; }

        card.className = `discussion-log-card ${borderClass}`;

        // Edit/Delete actions (Admins only, or assigned PMs who authored it)
        let actionsHtml = "";
        const canEdit = state.isAdmin() || (state.currentUser && disc.author.toLowerCase() === state.currentUser.name.toLowerCase());

        if (canEdit) {
            actionsHtml = `
                <div class="actions-cell">
                    <button class="action-btn-circle" onclick="openEditDiscussionModal('${disc.id}')" title="Edit Note">
                        <i data-lucide="edit-3" style="width: 0.8rem; height: 0.8rem;"></i>
                    </button>
                    <button class="action-btn-circle delete" onclick="handleDeleteDiscussion('${disc.id}')" title="Delete Note">
                        <i data-lucide="trash-2" style="width: 0.8rem; height: 0.8rem;"></i>
                    </button>
                </div>
            `;
        }

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                <div>
                    <span class="tag-project-badge">${disc.project_name}</span>
                    <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted); margin-left: 0.5rem;">${disc.date}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="tag-remark-badge ${remarkClass}">${disc.remarks}</span>
                    ${actionsHtml}
                </div>
            </div>
            
            <p class="disc-card-body-text">${disc.points}</p>
            
            <div class="disc-meta-footer">
                <span>Logged by: <strong style="color: var(--text-primary);">${disc.author}</strong></span>
                <span style="font-family: var(--font-mono); font-size: 0.65rem;">ID: ${disc.id}</span>
            </div>
        `;

        container.appendChild(card);
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="table-panel text-center-muted" style="padding: 5rem;">
                No project discussion entries compiled for the selected filters.
            </div>
        `;
    }

    lucide.createIcons();
}

// ==========================================
// D. EMPLOYEE MASTER ROSTER SUBSECTION
// ==========================================
function renderEmployees() {
    const tableBody = document.getElementById("employees-table-body");
    const searchVal = document.getElementById("employees-search-input").value.trim().toLowerCase();
    
    tableBody.innerHTML = "";

    let filtered = state.employees.filter(emp => {
        return emp.name.toLowerCase().includes(searchVal) || emp.email.toLowerCase().includes(searchVal) || emp.department.toLowerCase().includes(searchVal);
    });

    document.getElementById("employees-count-lbl").innerText = filtered.length;

    filtered.forEach(emp => {
        const tr = document.createElement("tr");

        // Compute projects managed by this specific employee
        const managed = state.projects.filter(p => p.manager.toLowerCase() === emp.name.toLowerCase());
        let managedHtml = `<span style="font-size: 0.7rem; color: var(--text-muted); font-style: italic;">No active assignments</span>`;
        
        if (managed.length > 0) {
            managedHtml = `<div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">`;
            managed.forEach(p => {
                managedHtml += `<span class="tag-project-badge" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">${p.name}</span>`;
            });
            managedHtml += `</div>`;
        }

        tr.innerHTML = `
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--clr-indigo);">${emp.id}</td>
            <td style="font-weight: 600; color: var(--text-primary);">${emp.name}</td>
            <td style="color: var(--text-secondary);">${emp.email}</td>
            <td>
                <span style="background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.75rem;">
                    ${emp.department}
                </span>
            </td>
            <td>${managedHtml}</td>
            <td style="text-align: right;">
                <div class="actions-cell">
                    <button class="action-btn-circle" onclick="openEditEmployeeModal('${emp.id}')" title="Modify Record">
                        <i data-lucide="edit-3" style="width: 0.85rem; height: 0.85rem;"></i>
                    </button>
                    <button class="action-btn-circle delete" onclick="handleDeleteEmployee('${emp.id}')" title="Delete Profile">
                        <i data-lucide="trash-2" style="width: 0.85rem; height: 0.85rem;"></i>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(tr);
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center-muted" style="padding: 4rem;">
                    No employee profiles matching search query.
                </td>
            </tr>
        `;
    }

    lucide.createIcons();
}

// ==========================================
// 6. MODALS POPUPS TRIGGERS & FORM HANDLERS
// ==========================================

// Global Modals controls
function setupModalsListeners() {
    // Project Modal closers
    document.getElementById("modal-project-close").addEventListener("click", () => closeModal("project"));
    document.getElementById("form-project-cancel").addEventListener("click", () => closeModal("project"));
    
    // Discussion Modal closers
    document.getElementById("modal-discussion-close").addEventListener("click", () => closeModal("discussion"));
    document.getElementById("form-discussion-cancel").addEventListener("click", () => closeModal("discussion"));

    // Employee Modal closers
    document.getElementById("modal-employee-close").addEventListener("click", () => closeModal("employee"));
    document.getElementById("form-employee-cancel").addEventListener("click", () => closeModal("employee"));

    // Details Modal closers
    document.getElementById("modal-project-detail-close").addEventListener("click", () => closeModal("project-detail"));
    document.getElementById("modal-project-detail-cancel").addEventListener("click", () => closeModal("project-detail"));

    // Form submits
    document.getElementById("project-form").addEventListener("submit", handleProjectSubmit);
    document.getElementById("discussion-form").addEventListener("submit", handleDiscussionSubmit);
    document.getElementById("employee-form").addEventListener("submit", handleEmployeeSubmit);

    // Confirm Dialog triggers
    document.getElementById("btn-confirm-cancel").addEventListener("click", () => {
        document.getElementById("modal-confirm").classList.add("hidden");
    });
    document.getElementById("btn-confirm-proceed").addEventListener("click", () => {
        if (onConfirmCallback) onConfirmCallback();
    });
}

function openProjectModal(id = "") {
    const modal = document.getElementById("modal-project");
    const title = document.getElementById("modal-project-title").querySelector("span");
    const submitBtn = document.getElementById("form-project-submit");
    
    // Clear / Reset form
    document.getElementById("form-project-id").value = id;
    document.getElementById("form-project-name").value = "";
    document.getElementById("form-project-status").value = "Live";
    document.getElementById("form-project-startdate").value = new Date().toISOString().split("T")[0];
    
    populateProjectDropdowns();

    if (id) {
        const p = state.projects.find(proj => proj.id === id);
        if (p) {
            title.innerText = "Modify Project Record";
            submitBtn.innerText = "Update Project";
            
            document.getElementById("form-project-name").value = p.name;
            document.getElementById("form-project-status").value = p.status;
            document.getElementById("form-project-startdate").value = p.startdate;
            document.getElementById("form-project-manager").value = p.manager;
        }
    } else {
        title.innerText = "Register New Project";
        submitBtn.innerText = "Register Project";
    }

    modal.classList.remove("hidden");
}

function handleProjectSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("form-project-id").value;
    const name = document.getElementById("form-project-name").value.trim();
    const status = document.getElementById("form-project-status").value;
    const startdate = document.getElementById("form-project-startdate").value;
    const manager = document.getElementById("form-project-manager").value;

    if (!name) return;

    if (id) {
        // Edit flow
        const idx = state.projects.findIndex(p => p.id === id);
        if (idx !== -1) {
            // Check if name changed to update discussion titles
            const oldName = state.projects[idx].name;
            state.projects[idx] = { id, name, status, startdate, manager };
            
            if (oldName !== name) {
                state.discussions.forEach(d => {
                    if (d.project_id === id) d.project_name = name;
                });
                state.saveDiscussions();
            }
            state.saveProjects();
            showToast("Project Master updated successfully!", "success");
        }
    } else {
        // Registration flow
        const nextId = `PRJ-00${state.projects.length + 1}`;
        const newProj = { id: nextId, name, status, startdate, manager };
        state.projects.push(newProj);
        state.saveProjects();
        showToast(`Successfully registered new initiative: ${nextId}!`, "success");
    }

    closeModal("project");
    
    // Refresh directories
    if (state.activeSection === "dashboard") renderDashboard();
    else if (state.activeSection === "projects") renderProjects();
}

window.openEditProjectModal = (id) => {
    openProjectModal(id);
};

window.handleDeleteProject = (id) => {
    showConfirm(
        "Delete Initiative Master",
        `Are you sure you want to delete Project ${id}? This action cannot be undone.`,
        () => {
            state.projects = state.projects.filter(p => p.id !== id);
            // Cascading delete discussions
            state.discussions = state.discussions.filter(d => d.project_id !== id);
            
            state.saveProjects();
            state.saveDiscussions();

            document.getElementById("modal-confirm").classList.add("hidden");
            showToast("Project deleted successfully.", "success");

            if (state.activeSection === "dashboard") renderDashboard();
            else if (state.activeSection === "projects") renderProjects();
        }
    );
};

// Add/Edit Discussion Note triggers
function openDiscussionModal(id = "", preloadedProjId = "") {
    const modal = document.getElementById("modal-discussion");
    const title = document.getElementById("modal-discussion-title").querySelector("span");
    const submitBtn = document.getElementById("form-discussion-submit");

    // Reset Form
    document.getElementById("form-discussion-id").value = id;
    document.getElementById("form-discussion-points").value = "";
    document.getElementById("form-discussion-date").value = new Date().toISOString().split("T")[0];
    document.getElementById("form-discussion-remarks").value = "Approved";

    populateProjectDropdowns();

    if (id) {
        const d = state.discussions.find(disc => disc.id === id);
        if (d) {
            title.innerText = "Edit Discussion Note";
            submitBtn.innerText = "Update Note";
            
            document.getElementById("form-discussion-project").value = d.project_id;
            document.getElementById("form-discussion-points").value = d.points;
            document.getElementById("form-discussion-date").value = d.date;
            document.getElementById("form-discussion-remarks").value = d.remarks;
        }
    } else {
        title.innerText = "Log Discussion Pointer";
        submitBtn.innerText = "Submit Note";

        if (preloadedProjId) {
            document.getElementById("form-discussion-project").value = preloadedProjId;
        }
    }

    modal.classList.remove("hidden");
}

function handleDiscussionSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("form-discussion-id").value;
    const project_id = document.getElementById("form-discussion-project").value;
    const points = document.getElementById("form-discussion-points").value.trim();
    const date = document.getElementById("form-discussion-date").value;
    const remarks = document.getElementById("form-discussion-remarks").value;

    if (!project_id || !points) return;

    const project = state.projects.find(p => p.id === project_id);
    const project_name = project ? project.name : "Unknown Initiative";

    if (id) {
        // Edit flow
        const idx = state.discussions.findIndex(d => d.id === id);
        if (idx !== -1) {
            state.discussions[idx] = {
                id,
                project_id,
                project_name,
                points,
                date,
                remarks,
                author: state.discussions[idx].author // Retain original author
            };
            state.saveDiscussions();
            showToast("Discussion note updated!", "success");
        }
    } else {
        // Log Note flow
        const nextId = `DSC-00${state.discussions.length + 1}`;
        const newDisc = {
            id: nextId,
            project_id,
            project_name,
            points,
            date,
            remarks,
            author: state.currentUser ? state.currentUser.name : "Unknown Author"
        };
        state.discussions.push(newDisc);
        state.saveDiscussions();
        showToast("Discussion note logged successfully!", "success");
    }

    closeModal("discussion");

    // Refresh directories
    if (state.activeSection === "dashboard") renderDashboard();
    else if (state.activeSection === "discussions") renderDiscussions();
}

window.openEditDiscussionModal = (id) => {
    openDiscussionModal(id);
};

window.openDiscussionModalForProject = (projId) => {
    openDiscussionModal("", projId);
};

window.handleDeleteDiscussion = (id) => {
    showConfirm(
        "Delete Discussion Note",
        "Are you sure you want to delete this discussion record? It cannot be retrieved.",
        () => {
            state.discussions = state.discussions.filter(d => d.id !== id);
            state.saveDiscussions();

            document.getElementById("modal-confirm").classList.add("hidden");
            showToast("Discussion note deleted successfully.", "success");

            if (state.activeSection === "dashboard") renderDashboard();
            else if (state.activeSection === "discussions") renderDiscussions();
        }
    );
};

// Employee Modal registration/editing triggers
function openEmployeeModal(id = "") {
    const modal = document.getElementById("modal-employee");
    const title = document.getElementById("modal-employee-title").querySelector("span");
    const submitBtn = document.getElementById("form-employee-submit");

    // Reset Form
    document.getElementById("form-employee-id").value = id;
    document.getElementById("form-employee-name").value = "";
    document.getElementById("form-employee-email").value = "";
    document.getElementById("form-employee-dept").value = "Engineering";

    if (id) {
        const emp = state.employees.find(e => e.id === id);
        if (emp) {
            title.innerText = "Edit Roster Details";
            submitBtn.innerText = "Update Profile";

            document.getElementById("form-employee-name").value = emp.name;
            document.getElementById("form-employee-email").value = emp.email;
            document.getElementById("form-employee-dept").value = emp.department;
        }
    } else {
        title.innerText = "Register Employee Profile";
        submitBtn.innerText = "Register Profile";
    }

    modal.classList.remove("hidden");
}

function handleEmployeeSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("form-employee-id").value;
    const name = document.getElementById("form-employee-name").value.trim();
    const email = document.getElementById("form-employee-email").value.trim().toLowerCase();
    const department = document.getElementById("form-employee-dept").value;

    if (!name || !email) return;

    if (id) {
        const idx = state.employees.findIndex(emp => emp.id === id);
        if (idx !== -1) {
            const oldName = state.employees[idx].name;
            state.employees[idx] = { id, name, email, department };
            
            // Cascading updates manager name if renamed
            if (oldName !== name) {
                state.projects.forEach(p => {
                    if (p.manager === oldName) p.manager = name;
                });
                state.saveProjects();
            }
            state.saveEmployees();
            showToast("Employee profile updated!", "success");
        }
    } else {
        const nextId = `EMP00${state.employees.length + 1}`;
        const newEmp = { id: nextId, name, email, department };
        state.employees.push(newEmp);
        state.saveEmployees();
        showToast(`Employee profile ${nextId} created!`, "success");
    }

    closeModal("employee");
    renderEmployees();
}

window.openEditEmployeeModal = (id) => {
    openEmployeeModal(id);
};

window.handleDeleteEmployee = (id) => {
    const emp = state.employees.find(e => e.id === id);
    const empName = emp ? emp.name : "Selected Employee";

    showConfirm(
        "Delete Employee Profile",
        `Are you sure you want to delete ${empName}? They will be removed from the assignable rosters.`,
        () => {
            state.employees = state.employees.filter(e => e.id !== id);
            state.saveEmployees();

            document.getElementById("modal-confirm").classList.add("hidden");
            showToast("Employee profile deleted successfully.", "success");

            renderEmployees();
        }
    );
};

// Detailed Project Preview Brief Modal with nested discussions list
let viewProjDetailId = "";
window.viewProjectDetails = (id) => {
    const modal = document.getElementById("modal-project-detail");
    const p = state.projects.find(proj => proj.id === id);

    if (!p) return;
    viewProjDetailId = id;

    document.getElementById("detail-proj-name").innerText = p.name;
    document.getElementById("detail-proj-id").innerText = p.id;
    document.getElementById("detail-proj-manager").innerText = p.manager;
    document.getElementById("detail-proj-startdate").innerText = p.startdate;

    // Status level indicator
    const badgeContainer = document.getElementById("detail-proj-status-badge");
    if (p.status === "Live") {
        badgeContainer.innerHTML = `<span class="status-pill status-pill-live"><span class="status-dot"></span><span>Live Deployments</span></span>`;
    } else if (p.status === "Workinprogress") {
        badgeContainer.innerHTML = `<span class="status-pill status-pill-wip"><span class="status-dot" style="background-color: var(--clr-amber);"></span><span>Work In Progress</span></span>`;
    } else {
        badgeContainer.innerHTML = `<span class="status-pill status-pill-pending"><span class="status-dot" style="background-color: var(--clr-indigo); animation: none;"></span><span>Yet to Start</span></span>`;
    }

    // Load nested discussion points
    const discContainer = document.getElementById("detail-discussions-list");
    discContainer.innerHTML = "";

    const filtered = state.discussions.filter(d => d.project_id === id);
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach(d => {
        const item = document.createElement("div");
        item.className = "scoped-discussion-item";

        let remarkClass = "tag-remark-neutral";
        if (d.remarks === "Approved") remarkClass = "tag-remark-approved";
        else if (d.remarks === "For Action") remarkClass = "tag-remark-foraction";
        else if (d.remarks === "Hold") remarkClass = "tag-remark-hold";
        else if (d.remarks === "Not Approved") remarkClass = "tag-remark-notapproved";

        item.innerHTML = `
            <div class="scoped-item-top">
                <span class="tag-remark-badge ${remarkClass}" style="font-size: 0.55rem; padding: 0.05rem 0.3rem;">${d.remarks}</span>
                <span style="font-size: 0.65rem; color: var(--text-muted); font-family: var(--font-mono);">${d.date}</span>
            </div>
            <p class="scoped-item-text">${d.points}</p>
            <div class="scoped-item-meta">Logged by: <strong>${d.author}</strong></div>
        `;
        discContainer.appendChild(item);
    });

    if (filtered.length === 0) {
        discContainer.innerHTML = `<div class="text-center-muted" style="padding: 1.5rem; font-size: 0.7rem;">No discussion log records compiled for this project profile.</div>`;
    }

    // PM Only Add Point button constraints
    const addPointBtn = document.getElementById("detail-btn-add-point");
    const isAssignedPm = state.currentUser && p.manager.toLowerCase() === state.currentUser.name.toLowerCase();
    
    if (state.isAdmin() || isAssignedPm) {
        addPointBtn.classList.remove("hidden");
    } else {
        addPointBtn.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    lucide.createIcons();
};

document.getElementById("detail-btn-add-point").addEventListener("click", () => {
    closeModal("project-detail");
    openDiscussionModal("", viewProjDetailId);
});

function closeModal(modalType) {
    const modal = document.getElementById(`modal-${modalType}`);
    if (modal) modal.classList.add("hidden");
}

// ==========================================
// 7. INITIALIZATION ON PAGE LOAD
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Fire Lucide vector renderer
    lucide.createIcons();

    // 2. Setup auth/signup tab switch controls
    setupAuthListeners();

    // 3. Setup workspace headers and operations buttons
    setupWorkspaceListeners();

    // 4. Setup modal forms canceling and submit events
    setupModalsListeners();

    // 5. Initialize Database state
    const isSessionActive = state.init();

    if (isSessionActive) {
        // Logged in! Auto-route into Workspace dashboard
        document.getElementById("auth-container").classList.add("hidden");
        document.getElementById("workspace-container").classList.remove("hidden");
        
        renderWorkspaceHeader();
        switchSection("dashboard");
    } else {
        // Unauthenticated. Direct into Login panel
        document.getElementById("auth-container").classList.remove("hidden");
        document.getElementById("workspace-container").classList.add("hidden");
        
        // Setup initial default email
        document.getElementById("login-email-input").value = "admin@projecthealth.com";
    }
});
