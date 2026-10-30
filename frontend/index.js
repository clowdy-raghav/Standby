/* =========================================
   STANDBY — JAVASCRIPT
   PART 1: LOGIN, NAVIGATION & INITIALIZATION
   ========================================= */

/* =========================================
   1. DEMO ACCOUNTS
   ========================================= */

const DEMO_ACCOUNTS = [
    {
        name: "Student One",
        email: "student1@lab.test",
        password: "Demo@1234",
        role: "student"
    },
    {
        name: "Lab Owner",
        email: "owner@lab.test",
        password: "Demo@1234",
        role: "owner"
    },
    {
        name: "Administrator",
        email: "admin@lab.test",
        password: "Demo@1234",
        role: "admin"
    }
];

/* =========================================
   2. APPLICATION STATE
   ========================================= */

let currentUser = null;
let currentPage = "dashboard";
let isDarkMode = false;

/* =========================================
   3. DOM HELPERS
   ========================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function getElement(id) {
    return document.getElementById(id);
}

/* =========================================
   4. APPLICATION INITIALIZATION
   ========================================= */

document.addEventListener("DOMContentLoaded", function () {
    initializeLogin();
    initializeNavigation();
    initializeTheme();
    initializeLogout();
    initializePasswordToggle();
    initializeDemoAccounts();

    initializeMachineExplorer();
    initializeMachineData();

    restoreSession();
});

/* =========================================
   5. LOGIN INITIALIZATION
   ========================================= */

function initializeLogin() {
    const loginForm = getElement("loginForm");

    if (!loginForm) {
        console.error("Login form not found. Check index.html.");
        return;
    }

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        handleLogin();
    });
}

/* =========================================
   6. HANDLE LOGIN
   ========================================= */

function handleLogin() {
    const emailInput = getElement("loginEmail");
    const passwordInput = getElement("loginPassword");

    if (!emailInput || !passwordInput) {
        showToast("Login form fields are missing.", "error");
        return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !password) {
        showToast("Please enter your email and password.", "warning");
        return;
    }

    const account = DEMO_ACCOUNTS.find(function (user) {
        return (
            user.email.toLowerCase() === email &&
            user.password === password
        );
    });

    if (!account) {
        showToast(
            "Invalid credentials. Please use a demo account.",
            "error"
        );
        return;
    }

    currentUser = {
        name: account.name,
        email: account.email,
        role: account.role
    };

    localStorage.setItem(
        "standby_session",
        JSON.stringify(currentUser)
    );

    openApplication();

    showToast(
        "Welcome to Standby, " + currentUser.name + "!",
        "success"
    );
}

/* =========================================
   7. OPEN APPLICATION
   ========================================= */

function openApplication() {
    const loginScreen = getElement("loginScreen");
    const appShell = getElement("appShell");

    if (loginScreen) {
        loginScreen.style.display = "none";
    }

    if (appShell) {
    appShell.classList.remove("hidden");
    appShell.classList.add("active");
}

    updateUserInformation();
    configureRoleNavigation();

    navigateTo("dashboard");
}

/* =========================================
   8. UPDATE USER INFORMATION
   ========================================= */


function updateUserInformation() {
    if (!currentUser) return;

    const name = currentUser.name;
    const role = capitalize(currentUser.role);
    const initials = getInitials(name);

    // Sidebar profile
    const sidebarName = getElement("sidebarName");
    const sidebarRole = getElement("sidebarRole");
    const sidebarAvatar = getElement("sidebarAvatar");

    if (sidebarName) sidebarName.textContent = name;
    if (sidebarRole) sidebarRole.textContent = role;
    if (sidebarAvatar) sidebarAvatar.textContent = initials;

    // Top profile
    const topName = getElement("topName");
    const topTier = getElement("topTier");
    const topAvatar = getElement("topAvatar");

    if (topName) topName.textContent = name;
    if (topTier) topTier.textContent = role;
    if (topAvatar) topAvatar.textContent = initials;

    // Welcome heading
    const welcomeTitle = getElement("welcomeTitle");

    if (welcomeTitle) {
        welcomeTitle.textContent = "Good to see you, " + name + " 👋";
    }

    // Other profile elements used throughout the app
    $$(".current-user-name").forEach(el => el.textContent = name);
    $$(".current-user-email").forEach(el => el.textContent = currentUser.email);
    $$(".current-user-role").forEach(el => el.textContent = role);
    $$(".user-avatar").forEach(el => el.textContent = initials);
}

/* =========================================
   9. ROLE-BASED NAVIGATION
   ========================================= */

function configureRoleNavigation() {
    if (!currentUser) {
        return;
    }

    const ownerOnlyItems = $$('[data-role="owner"]');
    const adminOnlyItems = $$('[data-role="admin"]');

    ownerOnlyItems.forEach(function (element) {
        element.style.display =
            currentUser.role === "owner" ? "" : "none";
    });

    adminOnlyItems.forEach(function (element) {
        element.style.display =
            currentUser.role === "admin" ? "" : "none";
    });
}

/* =========================================
   10. NAVIGATION INITIALIZATION
   ========================================= */

function initializeNavigation() {
    const navItems = $$("[data-nav]");

    navItems.forEach(function (item) {
        item.addEventListener("click", function () {
            const targetPage = item.dataset.nav;

            if (targetPage) {
                navigateTo(targetPage);
            }
        });
    });
}

/* =========================================
   11. NAVIGATE BETWEEN PAGES
   ========================================= */

function navigateTo(pageName) {
    if (!currentUser) {
        return;
    }

    const requestedPage = getElement(pageName + "Page");

    if (!requestedPage) {
        console.warn("Page not found:", pageName);
        showToast(
            "This page is not available in the current HTML.",
            "warning"
        );
        return;
    }

    /* Update active page */

    $$(".page").forEach(function (page) {
    page.classList.remove("active");
    page.classList.remove("hidden");
    });

    requestedPage.classList.add("active");

    /* Update active navigation item */

    $$("[data-nav]").forEach(function (item) {
        item.classList.toggle(
            "active",
            item.dataset.nav === pageName
        );
    });

    currentPage = pageName;

    /* Update page title */

    updatePageTitle(pageName);

    /* Scroll content to top */

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================================
   12. PAGE TITLES
   ========================================= */

function updatePageTitle(pageName) {
    const titles = {
        dashboard: "Dashboard",
        machines: "Explore Machines",
        bookings: "My Bookings",
        standby: "Standby Queue",
        score: "Reliability Score",
        history: "Booking History",
        review: "Owner Review",
        checkin: "Check-in & Return",
        admin: "Admin Overview"
    };

    const titleElement = getElement("pageTitle");

    if (titleElement) {
        titleElement.textContent =
            titles[pageName] || capitalize(pageName);
    }

    const breadcrumb = getElement("breadcrumb");

    if (breadcrumb) {
        breadcrumb.textContent =
            "Standby / " + (titles[pageName] || pageName);
    }
}

/* =========================================
   13. DEMO ACCOUNT BUTTONS
   ========================================= */

function initializeDemoAccounts() {
    const demoButtons = $$("[data-demo]");

    demoButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const role = button.dataset.demo;

            const account = DEMO_ACCOUNTS.find(function (user) {
                return user.role === role;
            });

            if (!account) {
                return;
            }

            const emailInput = getElement("loginEmail");
            const passwordInput = getElement("loginPassword");

            if (emailInput) {
                emailInput.value = account.email;
            }

            if (passwordInput) {
                passwordInput.value = account.password;
            }
        });
    });
}

/* =========================================
   14. PASSWORD VISIBILITY TOGGLE
   ========================================= */

function initializePasswordToggle() {
    const toggleButton = getElement("togglePassword");

    if (!toggleButton) {
        return;
    }

    toggleButton.addEventListener("click", function () {
        const passwordInput = getElement("loginPassword");

        if (!passwordInput) {
            return;
        }

        const isPassword =
            passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        toggleButton.textContent =
            isPassword ? "Hide" : "Show";
    });
}

/* =========================================
   15. LOGOUT
   ========================================= */

function initializeLogout() {
    const logoutButtons = $$(".logout-button");

    logoutButtons.forEach(function (button) {
        button.addEventListener("click", logout);
    });
}

function logout() {
    localStorage.removeItem("standby_session");

    currentUser = null;
    currentPage = "dashboard";

    const appShell = getElement("appShell");
    const loginScreen = getElement("loginScreen");

    if (appShell) {
        appShell.classList.remove("active");
    }

    if (loginScreen) {
        loginScreen.style.display = "";
    }

    const loginForm = getElement("loginForm");

    if (loginForm) {
        loginForm.reset();
    }

    showToast("You have been logged out.", "info");
}

/* =========================================
   16. RESTORE SESSION
   ========================================= */

function restoreSession() {
    const savedSession =
        localStorage.getItem("standby_session");

    if (!savedSession) {
        return;
    }

    try {
        const user = JSON.parse(savedSession);

        const validAccount = DEMO_ACCOUNTS.find(function (account) {
            return (
                account.email === user.email &&
                account.role === user.role
            );
        });

        if (!validAccount) {
            localStorage.removeItem("standby_session");
            return;
        }

        currentUser = {
            name: validAccount.name,
            email: validAccount.email,
            role: validAccount.role
        };

        openApplication();
    } catch (error) {
        console.error("Could not restore session:", error);

        localStorage.removeItem("standby_session");
    }
}

/* =========================================
   17. DARK MODE INITIALIZATION
   ========================================= */

function initializeTheme() {
    const savedTheme = localStorage.getItem("standby_theme");

    isDarkMode = savedTheme === "dark";

    applyTheme();

    const themeToggle = getElement("themeToggle");

    if (themeToggle) {
        themeToggle.addEventListener("click", toggleTheme);
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;

    localStorage.setItem(
        "standby_theme",
        isDarkMode ? "dark" : "light"
    );

    applyTheme();
}

function applyTheme() {
    document.body.classList.toggle("dark-mode", isDarkMode);

    const themeToggle = getElement("themeToggle");

    if (themeToggle) {
        themeToggle.textContent = isDarkMode ? "☀️" : "🌙";
        themeToggle.setAttribute(
            "aria-label",
            isDarkMode ? "Switch to light mode" : "Switch to dark mode"
        );
    }
}

/* =========================================
   18. GENERAL HELPER FUNCTIONS
   ========================================= */

function capitalize(value) {
    if (!value) {
        return "";
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(name) {
    if (!name) {
        return "U";
    }

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(function (part) {
            return part.charAt(0).toUpperCase();
        })
        .join("");
}

/* =========================================
   19. BASIC TOAST NOTIFICATIONS
   ========================================= */

function showToast(message, type = "info") {
    let container = getElement("toastContainer");

    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";

        document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    toast.className = "toast " + type;

    const icons = {
        success: "✓",
        error: "✕",
        warning: "⚠",
        info: "ℹ"
    };

    const icon = icons[type] || icons.info;

    const content = document.createElement("div");
    content.className = "toast-content";

    const heading = document.createElement("h4");
    heading.textContent = capitalize(type);

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    content.appendChild(heading);
    content.appendChild(paragraph);

    const iconElement = document.createElement("span");
    iconElement.className = "toast-icon";
    iconElement.textContent = icon;

    const closeButton = document.createElement("button");
    closeButton.className = "toast-close";
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close notification");

    closeButton.addEventListener("click", function () {
        toast.remove();
    });

    toast.appendChild(iconElement);
    toast.appendChild(content);
    toast.appendChild(closeButton);

    container.appendChild(toast);

    window.setTimeout(function () {
        if (toast.isConnected) {
            toast.remove();
        }
    }, 4000);
}
/* =========================================
   STANDBY — JAVASCRIPT
   PART 2: MACHINES, DASHBOARD & FILTERS
   ========================================= */

/* =========================================
   1. MACHINE DATABASE
   ========================================= */

const machines = [
    {
        id: 1,
        name: "3D Printer",
        category: "Fabrication",
        icon: "🖨️",
        description:
            "Create detailed 3D models and prototypes for your projects.",
        location: "Makerspace — Zone A",
        status: "available",
        price: 50,
        priceUnit: "hour",
        rating: 4.8,
        totalBookings: 124,
        duration: 120,
        owner: "Lab Owner"
    },
    {
        id: 2,
        name: "Laser Cutter",
        category: "Fabrication",
        icon: "⚡",
        description:
            "Precision cutting and engraving for acrylic, wood and more.",
        location: "Makerspace — Zone B",
        status: "booked",
        price: 80,
        priceUnit: "hour",
        rating: 4.9,
        totalBookings: 98,
        duration: 60,
        owner: "Lab Owner"
    },
    {
        id: 3,
        name: "Soldering Station",
        category: "Electronics",
        icon: "🔌",
        description:
            "Build, repair and prototype electronic circuits safely.",
        location: "Electronics Lab",
        status: "available",
        price: 20,
        priceUnit: "hour",
        rating: 4.7,
        totalBookings: 86,
        duration: 60,
        owner: "Lab Owner"
    },
    {
        id: 4,
        name: "Testing Bench",
        category: "Electronics",
        icon: "🔬",
        description:
            "Test circuits and components with precision instruments.",
        location: "Electronics Lab",
        status: "available",
        price: 30,
        priceUnit: "hour",
        rating: 4.6,
        totalBookings: 73,
        duration: 60,
        owner: "Lab Owner"
    },
    {
        id: 5,
        name: "CNC Machine",
        category: "Fabrication",
        icon: "⚙️",
        description:
            "Perform accurate computer-controlled machining operations.",
        location: "Workshop — Zone C",
        status: "maintenance",
        price: 100,
        priceUnit: "hour",
        rating: 4.8,
        totalBookings: 61,
        duration: 120,
        owner: "Lab Owner"
    },
    {
        id: 6,
        name: "Oscilloscope",
        category: "Electronics",
        icon: "📈",
        description:
            "Observe and analyse electrical signals in real time.",
        location: "Electronics Lab",
        status: "available",
        price: 25,
        priceUnit: "hour",
        rating: 4.9,
        totalBookings: 112,
        duration: 60,
        owner: "Lab Owner"
    }
];

/* =========================================
   2. LOAD SAVED MACHINE DATA
   ========================================= */

function loadMachineData() {
    try {
        const savedMachines =
            localStorage.getItem("standby_machines");

        if (!savedMachines) {
            localStorage.setItem(
                "standby_machines",
                JSON.stringify(machines)
            );

            return machines;
        }

        const parsedMachines = JSON.parse(savedMachines);

        if (!Array.isArray(parsedMachines)) {
            return machines;
        }

        return parsedMachines;
    } catch (error) {
        console.error("Could not load machines:", error);
        return machines;
    }
}

/* =========================================
   3. GET ALL MACHINES
   ========================================= */

function getAllMachines() {
    return loadMachineData();
}

/* =========================================
   4. GET MACHINE BY ID
   ========================================= */

function getMachineById(machineId) {
    return getAllMachines().find(function (machine) {
        return machine.id === Number(machineId);
    });
}

/* =========================================
   5. SAVE MACHINE DATA
   ========================================= */

function saveMachineData(updatedMachines) {
    localStorage.setItem(
        "standby_machines",
        JSON.stringify(updatedMachines)
    );
}

/* =========================================
   6. MACHINE SEARCH AND FILTER STATE
   ========================================= */

let activeMachineFilter = "all";
let machineSearchQuery = "";

/* =========================================
   7. INITIALIZE MACHINE EXPLORER
   ========================================= */

function initializeMachineExplorer() {
    const searchInput = getElement("machineSearch");

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            machineSearchQuery =
                searchInput.value.trim().toLowerCase();

            renderMachines();
        });
    }

    const filterButtons = $$("[data-machine-filter]");

    filterButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            activeMachineFilter = button.dataset.machineFilter;

            filterButtons.forEach(function (item) {
                item.classList.toggle(
                    "active",
                    item === button
                );
            });

            renderMachines();
        });
    });

    renderMachines();
}

/* =========================================
   8. RENDER MACHINE CARDS
   ========================================= */

function renderMachines() {
    const container = getElement("machineGrid");

    if (!container) {
        return;
    }

    let filteredMachines = getAllMachines();

    /* Search by machine name, category or location */

    if (machineSearchQuery) {
        filteredMachines = filteredMachines.filter(
            function (machine) {
                const searchableText = [
                    machine.name,
                    machine.category,
                    machine.description,
                    machine.location
                ].join(" ").toLowerCase();

                return searchableText.includes(
                    machineSearchQuery
                );
            }
        );
    }

    /* Filter by category or availability */

    if (activeMachineFilter === "available") {
        filteredMachines = filteredMachines.filter(
            function (machine) {
                return machine.status === "available";
            }
        );
    } else if (
        activeMachineFilter !== "all"
    ) {
        filteredMachines = filteredMachines.filter(
            function (machine) {
                return (
                    machine.category.toLowerCase() ===
                    activeMachineFilter.toLowerCase()
                );
            }
        );
    }

    if (filteredMachines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3>No machines found</h3>
                <p>
                    Try another search term or change
                    your selected filter.
                </p>
                <button
                    class="btn btn-secondary"
                    type="button"
                    onclick="resetMachineFilters()"
                >
                    Clear filters
                </button>
            </div>
        `;

        return;
    }

    container.innerHTML = filteredMachines.map(
        function (machine) {
            return createMachineCard(machine);
        }
    ).join("");
}

/* =========================================
   9. CREATE A MACHINE CARD
   ========================================= */

function createMachineCard(machine) {
    const statusLabels = {
        available: "Available",
        booked: "Currently booked",
        maintenance: "Under maintenance"
    };

    const canBook = machine.status === "available";

    const buttonText = canBook
        ? "Book machine"
        : machine.status === "booked"
            ? "Join standby"
            : "Unavailable";

    const buttonClass = canBook
        ? "btn btn-primary"
        : "btn btn-secondary";

    const buttonAction = machine.status === "maintenance"
        ? ""
        : `onclick="handleMachineAction(${machine.id})"`;

    return `
        <article class="machine-card">

            <div class="machine-card-top">
                <div class="machine-illustration">
                    ${escapeHTML(machine.icon)}
                </div>

                <div class="machine-status">
                    <span class="badge ${machine.status}">
                        ${escapeHTML(
                            statusLabels[machine.status] ||
                            machine.status
                        )}
                    </span>
                </div>
            </div>

            <div class="machine-card-body">

                <div class="machine-card-header">
                    <h3>
                        ${escapeHTML(machine.name)}
                    </h3>
                </div>

                <p class="machine-category">
                    ${escapeHTML(machine.category)}
                </p>

                <p class="machine-description">
                    ${escapeHTML(machine.description)}
                </p>

                <div class="machine-details">
                    <div class="machine-detail">
                        <span>📍</span>
                        <strong>
                            ${escapeHTML(machine.location)}
                        </strong>
                    </div>

                    <div class="machine-detail">
                        <span>⭐</span>
                        <strong>${machine.rating}</strong>
                    </div>
                </div>

                <div class="machine-card-footer">

                    <div class="machine-price">
                        ₹${machine.price}
                        <span>/ ${escapeHTML(machine.priceUnit)}</span>
                    </div>

                    <button
                        type="button"
                        class="${buttonClass}"
                        ${buttonAction}
                        ${machine.status === "maintenance"
                            ? "disabled"
                            : ""}
                    >
                        ${buttonText}
                    </button>

                </div>
            </div>
        </article>
    `;
}

/* =========================================
   10. RESET MACHINE FILTERS
   ========================================= */

function resetMachineFilters() {
    activeMachineFilter = "all";
    machineSearchQuery = "";

    const searchInput = getElement("machineSearch");

    if (searchInput) {
        searchInput.value = "";
    }

    $$("[data-machine-filter]").forEach(function (button) {
        button.classList.toggle(
            "active",
            button.dataset.machineFilter === "all"
        );
    });

    renderMachines();
}

/* =========================================
   11. MACHINE ACTION HANDLER
   ========================================= */

function handleMachineAction(machineId) {
    const machine = getMachineById(machineId);

    if (!machine) {
        showToast("Machine not found.", "error");
        return;
    }

    if (machine.status === "maintenance") {
        showToast(
            "This machine is currently under maintenance.",
            "warning"
        );

        return;
    }

    if (machine.status === "booked") {
        if (typeof joinStandbyQueue === "function") {
            joinStandbyQueue(machine.id);
        } else {
            showToast(
                "Standby queue functionality will be added in the next part.",
                "info"
            );
        }

        return;
    }

    if (typeof openBookingModal === "function") {
        openBookingModal(machine.id);
    } else {
        showToast(
            "Booking functionality will be added in the next part.",
            "info"
        );
    }
}

/* =========================================
   12. DASHBOARD STATISTICS
   ========================================= */

function renderDashboardStats() {
    const allMachines = getAllMachines();

    const availableCount = allMachines.filter(
        function (machine) {
            return machine.status === "available";
        }
    ).length;

    const bookedCount = allMachines.filter(
        function (machine) {
            return machine.status === "booked";
        }
    ).length;

    const maintenanceCount = allMachines.filter(
        function (machine) {
            return machine.status === "maintenance";
        }
    ).length;

    const bookings = getBookings();

    const myBookings = currentUser
        ? bookings.filter(function (booking) {
            return booking.userEmail === currentUser.email;
        })
        : [];

    const activeBookings = myBookings.filter(
        function (booking) {
            return [
                "pending",
                "approved",
                "checked-in"
            ].includes(booking.status);
        }
    );

    setText("availableMachinesCount", availableCount);
    setText("bookedMachinesCount", bookedCount);
    setText("maintenanceMachinesCount", maintenanceCount);
    setText("activeBookingsCount", activeBookings.length);

    setText("totalMachinesCount", allMachines.length);

    setText(
        "dashboardGreeting",
        currentUser
            ? "Welcome back, " + currentUser.name
            : "Welcome to Standby"
    );
}

/* =========================================
   13. SAFE TEXT HELPER
   ========================================= */

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = String(value);
    }
}

/* =========================================
   14. ESCAPE HTML
   ========================================= */

function escapeHTML(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        function (character) {
            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return replacements[character];
        }
    );
}

/* =========================================
   15. INITIALIZE MACHINE DATA
   ========================================= */

function initializeMachineData() {
    renderMachines();
    renderDashboardStats();
}

/* =========================================
   16. CONNECT PART 2 TO APPLICATION
   ========================================= */

/*
   Add these calls to the existing DOMContentLoaded
   listener in Part 1.

   Inside that listener, add:

       initializeMachineExplorer();
       initializeMachineData();

   Do not create another DOMContentLoaded listener
   if you prefer to keep initialization in one place.
*/
// ============================================
// PART 3: BOOKING SYSTEM
// ============================================

// Load bookings from localStorage
function getBookings() {
    try {
        const savedBookings = localStorage.getItem("standby_bookings");
        return savedBookings ? JSON.parse(savedBookings) : [];
    } catch (error) {
        console.error("Error loading bookings:", error);
        return [];
    }
}

// Save bookings to localStorage
function saveBookings(bookings) {
    localStorage.setItem("standby_bookings", JSON.stringify(bookings));
}

// Generate a unique booking ID
function generateBookingId() {
    return "BK-" + Date.now().toString(36).toUpperCase();
}

// Get a form field value using possible IDs or names
function getBookingFieldValue(form, selectors) {
    for (const selector of selectors) {
        const field = form.querySelector(selector);

        if (field && field.value !== undefined) {
            return field.value.trim();
        }
    }

    return "";
}

// Open booking modal
function openBookingModal(machineId) {
    const machine = getMachineById(machineId);

    if (!machine) {
        showToast("Machine not found.", "error");
        return;
    }

    if (machine.status !== "available") {
        showToast("This machine is not currently available.", "warning");
        return;
    }

    const modal = document.getElementById("bookingModal");

    if (!modal) {
        showToast("Booking form not found. Check your HTML.", "error");
        return;
    }

    const form = document.getElementById("bookingForm");

    if (form) {
        form.reset();
        form.dataset.machineId = machine.id;
    }

    // Display the selected machine's name
    const machineNameElements = [
        "bookingMachineName",
        "selectedMachineName",
        "modalMachineName"
    ];

    machineNameElements.forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = machine.name;
        }
    });

    // Store the machine ID in a hidden field if one exists
    const machineIdField = document.getElementById("bookingMachineId");

    if (machineIdField) {
        machineIdField.value = machine.id;
    }

    modal.classList.remove("hidden");
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");
}

// Close booking modal
function closeBookingModal() {
    const modal = document.getElementById("bookingModal");

    if (modal) {
    modal.classList.remove("active");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    }

    document.body.classList.remove("modal-open");
}

// Check whether two bookings overlap
function bookingsOverlap(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
}

// Initialize the booking form
function initializeBookingSystem() {
    const form = document.getElementById("bookingForm");

    if (!form || form.dataset.initialized === "true") return;

    form.dataset.initialized = "true";

    const machineSelect = document.getElementById("bookingMachine");
    const dateInput = document.getElementById("bookingDate");
    const timeSelect = document.getElementById("bookingTime");
    const durationSelect = document.getElementById("bookingDuration");
    const errorElement = document.getElementById("bookingError");

    // Populate the machine dropdown from the existing machine data.
    if (machineSelect) {
        machineSelect.innerHTML = getAllMachines()
            .map(machine => `
                <option value="${machine.id}">
                    ${escapeHTML(machine.name)}
                </option>
            `)
            .join("");
    }

    // Do not allow selecting a date in the past.
    if (dateInput) {
        const today = new Date();
        const localToday = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");

        dateInput.min = localToday;
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        console.log("BOOKING FORM SUBMITTED");

        if (errorElement) {
            errorElement.hidden = true;
            errorElement.textContent = "";
        }

        if (!currentUser) {
            showToast("Please log in first.", "error");
            return;
        }

        if (currentUser.role !== "student") {
            showToast("Only students can create bookings.", "warning");
            return;
        }

        const machine = getMachineById(machineSelect.value);
        const date = dateInput.value;
        const startTime = timeSelect.value;
        const duration = Number(durationSelect.value);

        if (!machine || !date || !startTime || !duration) {
            showToast("Please complete all booking fields.", "warning");
            return;
        }

        if (machine.status !== "available") {
            showToast("This machine is not currently available.", "warning");
            return;
        }

        const [hours, minutes] = startTime.split(":").map(Number);
        const end = new Date(`${date}T00:00:00`);
        end.setHours(hours + duration, minutes, 0, 0);

        const endTime =
            String(end.getHours()).padStart(2, "0") + ":" +
            String(end.getMinutes()).padStart(2, "0");

        const bookingStart = new Date(`${date}T${startTime}`);
        if (Number.isNaN(bookingStart.getTime()) || bookingStart <= new Date()) {
            showToast("Please choose a future date and time.", "warning");
            return;
        }

        const bookings = getBookings();

        const conflict = bookings.some(booking => {
            if (Number(booking.machineId) !== Number(machine.id)) return false;
            if (booking.date !== date) return false;
            if (!["pending", "approved"].includes(booking.status)) return false;

            return bookingsOverlap(
                startTime,
                endTime,
                booking.startTime,
                booking.endTime
            );
        });

        if (conflict) {
            showToast("That time slot is already reserved.", "error");
            return;
        }

        const booking = {
            id: generateBookingId(),
            machineId: machine.id,
            machineName: machine.name,
            userEmail: currentUser.email,
            userName: currentUser.name,
            date,
            startTime,
            endTime,
            purpose: "General use",
            status: "pending",
            createdAt: new Date().toISOString()
        };

        bookings.push(booking);
        saveBookings(bookings);

        closeBookingModal();
        form.reset();

        renderBookings();
        renderDashboardStats();

        showToast(
            "Booking request saved in this browser. Backend connection is not active yet.",
            "success"
        );
    });

    document.querySelectorAll(
        "#closeBookingModal, #cancelBooking, .close-modal"
    ).forEach(button => {
        button.addEventListener("click", closeBookingModal);
    });

    const modal = document.getElementById("bookingModal");

    if (modal) {
        modal.addEventListener("click", function (event) {
            if (event.target === modal) closeBookingModal();
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeBookingModal();
    });
}

// Format a date for display
function formatBookingDate(dateString) {
    if (!dateString) {
        return "—";
    }

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Format a time for display
function formatBookingTime(timeString) {
    if (!timeString) {
        return "—";
    }

    const parts = timeString.split(":");
    const hours = Number(parts[0]);
    const minutes = Number(parts[1] || 0);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return timeString;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

// Convert booking status to a readable label
function getBookingStatusLabel(status) {
    const labels = {
        pending: "Pending approval",
        approved: "Approved",
        rejected: "Rejected",
        cancelled: "Cancelled",
        completed: "Completed"
    };

    return labels[status] || capitalize(status || "pending");
}

// Render the booking list
function renderBookings() {
    const bookings = getBookings();

    const container =
        document.getElementById("bookingsTableBody") ||
        document.getElementById("bookingsList") ||
        document.getElementById("bookingList");

    if (!container) {
        return;
    }

    let visibleBookings = bookings;

    // Students see only their own bookings.
    // Owners and admins can see all bookings in this demo.
    if (currentUser && currentUser.role === "student") {
        visibleBookings = bookings.filter(
            booking => booking.userEmail === currentUser.email
        );
    }

    // Sort newest booking dates first
    visibleBookings = [...visibleBookings].sort((a, b) => {
        const dateA = `${a.date}T${a.startTime}`;
        const dateB = `${b.date}T${b.startTime}`;

        return dateB.localeCompare(dateA);
    });

    if (visibleBookings.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div class="empty-state-icon">📅</div>
                        <h3>No bookings yet</h3>
                        <p>Your booking requests will appear here.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    // If the container is a table body, render table rows.
    const isTableBody = container.tagName === "TBODY";

    if (isTableBody) {
        container.innerHTML = visibleBookings.map(booking => `
            <tr>
                <td>${escapeHTML(booking.id)}</td>
                <td>${escapeHTML(booking.machineName || "Machine")}</td>
                <td>${escapeHTML(formatBookingDate(booking.date))}</td>
                <td>
                    ${escapeHTML(formatBookingTime(booking.startTime))}
                    –
                    ${escapeHTML(formatBookingTime(booking.endTime))}
                </td>
                <td>${escapeHTML(booking.userName || booking.userEmail || "Student")}</td>
                <td>
                    <span class="status-badge status-${escapeHTML(booking.status)}">
                        ${escapeHTML(getBookingStatusLabel(booking.status))}
                    </span>
                </td>
                <td>
                    ${
                        booking.status === "pending" &&
                        currentUser &&
                        currentUser.role === "student" &&
                        booking.userEmail === currentUser.email
                            ? `<button class="btn btn-secondary btn-sm"
                                onclick="cancelBooking('${escapeHTML(booking.id)}')">
                                Cancel
                               </button>`
                            : "—"
                    }
                </td>
            </tr>
        `).join("");
    } else {
        container.innerHTML = visibleBookings.map(booking => `
            <article class="booking-card panel">
                <div class="booking-card-header">
                    <div>
                        <h3>${escapeHTML(booking.machineName || "Machine")}</h3>
                        <p>${escapeHTML(booking.id)}</p>
                    </div>

                    <span class="status-badge status-${escapeHTML(booking.status)}">
                        ${escapeHTML(getBookingStatusLabel(booking.status))}
                    </span>
                </div>

                <p>
                    <strong>Date:</strong>
                    ${escapeHTML(formatBookingDate(booking.date))}
                </p>

                <p>
                    <strong>Time:</strong>
                    ${escapeHTML(formatBookingTime(booking.startTime))}
                    –
                    ${escapeHTML(formatBookingTime(booking.endTime))}
                </p>

                <p>
                    <strong>Purpose:</strong>
                    ${escapeHTML(booking.purpose || "General use")}
                </p>

                ${
                    booking.status === "pending" &&
                    currentUser &&
                    currentUser.role === "student" &&
                    booking.userEmail === currentUser.email
                        ? `<button class="btn btn-secondary btn-sm"
                            onclick="cancelBooking('${escapeHTML(booking.id)}')">
                            Cancel booking
                           </button>`
                        : ""
                }
            </article>
        `).join("");
    }
}

// Cancel a pending booking
function cancelBooking(bookingId) {
    if (!currentUser) {
        showToast("Please log in first.", "error");
        return;
    }

    const bookings = getBookings();

    const booking = bookings.find(item => item.id === bookingId);

    if (!booking) {
        showToast("Booking not found.", "error");
        return;
    }

    if (
        currentUser.role !== "admin" &&
        booking.userEmail !== currentUser.email
    ) {
        showToast("You cannot cancel someone else's booking.", "error");
        return;
    }

    if (booking.status !== "pending") {
        showToast("Only pending bookings can be cancelled.", "warning");
        return;
    }

    booking.status = "cancelled";

    updateReliabilityScore(booking.userEmail, "cancelled");
 renderBookingHistory();

    saveBookings(bookings);
    renderBookings();
    renderDashboardStats();

    showToast("Booking cancelled successfully.", "success");
}

// Initialize this section when the page loads
document.addEventListener("DOMContentLoaded", function () {
    initializeBookingSystem();
    renderBookings();
});
// ============================================
// PART 4: STANDBY QUEUE SYSTEM
// ============================================

// Load standby queues from localStorage
function getStandbyQueues() {
    try {
        return JSON.parse(
            localStorage.getItem("standby_queues") || "{}"
        );
    } catch (error) {
        console.error("Error loading standby queues:", error);
        return {};
    }
}

// Save standby queues
function saveStandbyQueues(queues) {
    localStorage.setItem(
        "standby_queues",
        JSON.stringify(queues)
    );
}

// Find the queue for a particular machine
function getMachineQueue(machineId) {
    const queues = getStandbyQueues();
    return queues[machineId] || [];
}

// Generate queue entry ID
function generateQueueId() {
    return "SQ-" + Date.now().toString(36).toUpperCase();
}

// Add the current student to a machine's standby queue
function joinStandbyQueue(machineId) {
    if (!currentUser) {
        showToast("Please log in first.", "error");
        return;
    }

    if (currentUser.role !== "student") {
        showToast("Only students can join the standby queue.", "warning");
        return;
    }

    const machine = getMachineById(machineId);

    if (!machine) {
        showToast("Machine not found.", "error");
        return;
    }

    const queues = getStandbyQueues();

    if (!queues[machineId]) {
        queues[machineId] = [];
    }

    const queue = queues[machineId];

    // Prevent duplicate entries for the same student
    const alreadyQueued = queue.some(entry =>
        entry.userEmail === currentUser.email
    );

    if (alreadyQueued) {
        showToast("You're already in this machine's standby queue.", "warning");
        return;
    }

    const queueEntry = {
        id: generateQueueId(),
        machineId: machineId,
        machineName: machine.name,
        userEmail: currentUser.email,
        userName: currentUser.name,
        joinedAt: new Date().toISOString(),
        status: "waiting"
    };

    queue.push(queueEntry);

    // Keep queue order based on when users joined
    queue.sort((a, b) =>
        new Date(a.joinedAt) - new Date(b.joinedAt)
    );

    queues[machineId] = queue;
    saveStandbyQueues(queues);

    renderStandbyQueue();

    showToast(
        `You've joined the standby queue for ${machine.name}.`,
        "success"
    );
}

// Remove the current student from a standby queue
function leaveStandbyQueue(machineId) {
    if (!currentUser) {
        showToast("Please log in first.", "error");
        return;
    }

    const queues = getStandbyQueues();
    const queue = queues[machineId] || [];

    const updatedQueue = queue.filter(entry => {
        return !(
            entry.userEmail === currentUser.email &&
            entry.status === "waiting"
        );
    });

    if (updatedQueue.length === queue.length) {
        showToast("No active queue entry was found.", "warning");
        return;
    }

    queues[machineId] = updatedQueue;
    saveStandbyQueues(queues);

    renderStandbyQueue();

    showToast("You've left the standby queue.", "success");
}

// Get all standby entries across machines
function getAllStandbyEntries() {
    const queues = getStandbyQueues();

    return Object.values(queues)
        .flat()
        .sort((a, b) =>
            new Date(a.joinedAt) - new Date(b.joinedAt)
        );
}

// Get a student's current queue position
function getQueuePosition(machineId, userEmail) {
    const queue = getMachineQueue(machineId)
        .filter(entry => entry.status === "waiting");

    const index = queue.findIndex(
        entry => entry.userEmail === userEmail
    );

    return index === -1 ? null : index + 1;
}

// Render standby queue screen
function renderStandbyQueue() {
    const container =
        document.getElementById("standbyQueueList") ||
        document.getElementById("standbyList") ||
        document.getElementById("queueList");

    const countElement =
        document.getElementById("standbyQueueCount") ||
        document.getElementById("queueCount");

    if (!container) {
        return;
    }

    let entries = getAllStandbyEntries();

    // Students only see their own entries
    if (currentUser && currentUser.role === "student") {
        entries = entries.filter(
            entry => entry.userEmail === currentUser.email
        );
    }

    if (countElement) {
        countElement.textContent = entries.length;
    }

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <h3>No standby entries</h3>
                <p>When you join a machine's queue, it will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = entries.map(entry => {
        const queue = getMachineQueue(entry.machineId)
            .filter(item => item.status === "waiting");

        const position = queue.findIndex(
            item => item.id === entry.id
        ) + 1;

        const isCurrentStudent =
            currentUser &&
            entry.userEmail === currentUser.email;

        return `
            <article class="queue-card panel">
                <div class="queue-card-header">
                    <div>
                        <h3>${escapeHTML(entry.machineName)}</h3>
                        <p>
                            Joined
                            ${escapeHTML(
                                new Date(entry.joinedAt).toLocaleString("en-IN")
                            )}
                        </p>
                    </div>

                    <span class="status-badge status-${escapeHTML(entry.status)}">
                        ${escapeHTML(capitalize(entry.status))}
                    </span>
                </div>

                <div class="queue-position">
                    <span class="queue-position-number">
                        ${position > 0 ? position : "—"}
                    </span>
                    <span>Queue position</span>
                </div>

                ${
                    currentUser &&
                    currentUser.role !== "student"
                        ? `<p>
                            <strong>Student:</strong>
                            ${escapeHTML(entry.userName)}
                            (${escapeHTML(entry.userEmail)})
                           </p>`
                        : ""
                }

                ${
                    isCurrentStudent && entry.status === "waiting"
                        ? `<button
                            class="btn btn-secondary btn-sm"
                            onclick="leaveStandbyQueue('${escapeHTML(entry.machineId)}')">
                            Leave queue
                           </button>`
                        : ""
                }
            </article>
        `;
    }).join("");
}

// Get the number of people waiting for a machine
function getStandbyCount(machineId) {
    return getMachineQueue(machineId).filter(
        entry => entry.status === "waiting"
    ).length;
}

// Notify the first person in the queue that a machine is available
function notifyNextInQueue(machineId) {
    const queues = getStandbyQueues();
    const queue = queues[machineId] || [];

    const nextEntry = queue.find(
        entry => entry.status === "waiting"
    );

    if (!nextEntry) {
        return null;
    }

    nextEntry.status = "notified";
    nextEntry.notifiedAt = new Date().toISOString();

    queues[machineId] = queue;
    saveStandbyQueues(queues);

    // The notification is simulated locally for the demo
    if (
        currentUser &&
        currentUser.email === nextEntry.userEmail
    ) {
        showToast(
            `A spot may be available for ${nextEntry.machineName}!`,
            "success"
        );
    }

    renderStandbyQueue();

    return nextEntry;
}

// Add a queue count to a machine card if its element exists
function updateMachineQueueCounts() {
    document.querySelectorAll("[data-queue-count]").forEach(element => {
        const machineId = element.dataset.queueCount;

        element.textContent = getStandbyCount(machineId);
    });
}

// Initialize standby queue screen
document.addEventListener("DOMContentLoaded", function () {
    renderStandbyQueue();
    updateMachineQueueCounts();
});
// ============================================
// PART 5: OWNER APPROVAL + CHECK-IN / RETURN
// ============================================


// ---------- OWNER BOOKING REVIEW ----------

// Render pending booking requests for the lab owner
function renderOwnerReviews() {
    const container =
        document.getElementById("ownerReviewList") ||
        document.getElementById("reviewBookingsList") ||
        document.getElementById("reviewList");

    if (!container) {
        return;
    }

    if (!currentUser || !["owner", "admin"].includes(currentUser.role)) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Access restricted</h3>
                <p>Only lab owners and administrators can review bookings.</p>
            </div>
        `;
        return;
    }

    const pendingBookings = getBookings().filter(
        booking => booking.status === "pending"
    );

    if (pendingBookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No pending requests</h3>
                <p>New booking requests will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pendingBookings.map(booking => `
        <article class="review-card panel">
            <div class="review-card-header">
                <div>
                    <h3>${escapeHTML(booking.machineName)}</h3>
                    <p>Booking ID: ${escapeHTML(booking.id)}</p>
                </div>

                <span class="status-badge status-pending">
                    Pending
                </span>
            </div>

            <div class="review-details">
                <p>
                    <strong>Student:</strong>
                    ${escapeHTML(booking.userName || "Student")}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${escapeHTML(booking.userEmail)}
                </p>

                <p>
                    <strong>Date:</strong>
                    ${escapeHTML(formatBookingDate(booking.date))}
                </p>

                <p>
                    <strong>Time:</strong>
                    ${escapeHTML(formatBookingTime(booking.startTime))}
                    –
                    ${escapeHTML(formatBookingTime(booking.endTime))}
                </p>

                <p>
                    <strong>Purpose:</strong>
                    ${escapeHTML(booking.purpose || "General use")}
                </p>
            </div>

            <div class="review-actions">
                <button
                    class="btn btn-primary"
                    onclick="reviewBooking('${escapeHTML(booking.id)}', 'approved')">
                    Approve
                </button>

                <button
                    class="btn btn-secondary"
                    onclick="reviewBooking('${escapeHTML(booking.id)}', 'rejected')">
                    Reject
                </button>
            </div>
        </article>
    `).join("");
}


// Approve or reject a booking
function reviewBooking(bookingId, decision) {
    if (
        !currentUser ||
        !["owner", "admin"].includes(currentUser.role)
    ) {
        showToast("You do not have permission to review bookings.", "error");
        return;
    }

    if (!["approved", "rejected"].includes(decision)) {
        showToast("Invalid booking decision.", "error");
        return;
    }

    const bookings = getBookings();

    const booking = bookings.find(
        item => item.id === bookingId
    );

    if (!booking) {
        showToast("Booking not found.", "error");
        return;
    }

    if (booking.status !== "pending") {
        showToast("This booking has already been reviewed.", "warning");
        return;
    }

    // Recheck availability before approval
    if (decision === "approved") {
        const conflict = bookings.some(other => {
            if (other.id === booking.id) {
                return false;
            }

            if (other.machineId !== booking.machineId) {
                return false;
            }

            if (other.date !== booking.date) {
                return false;
            }

            if (other.status !== "approved") {
                return false;
            }

            return bookingsOverlap(
                booking.startTime,
                booking.endTime,
                other.startTime,
                other.endTime
            );
        });

        if (conflict) {
            showToast(
                "This time slot conflicts with another approved booking.",
                "error"
            );
            return;
        }
    }

    booking.status = decision;
    booking.reviewedAt = new Date().toISOString();
    booking.reviewedBy = currentUser.email;

    saveBookings(bookings);

    renderOwnerReviews();
    renderBookings();
    renderDashboardStats();
    renderCheckInPage();

    showToast(
        decision === "approved"
            ? "Booking approved successfully."
            : "Booking request rejected.",
        "success"
    );
}


// ---------- CHECK-IN ----------

// Get approved bookings that have not been completed or cancelled
function getActiveBookings() {
    return getBookings().filter(booking =>
        ["approved", "checked_in"].includes(booking.status)
    );
}


// Render check-in and return screen
function renderCheckInPage() {
    const container =
        document.getElementById("checkinList") ||
        document.getElementById("checkInList") ||
        document.getElementById("checkinBookingsList");

    if (!container) {
        return;
    }

    if (!currentUser) {
        container.innerHTML = "";
        return;
    }

    let activeBookings = getActiveBookings();

    // Students only see their own bookings
    if (currentUser.role === "student") {
        activeBookings = activeBookings.filter(
            booking => booking.userEmail === currentUser.email
        );
    }

    if (activeBookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔑</div>
                <h3>No active bookings</h3>
                <p>Approved bookings will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = activeBookings.map(booking => {
        const checkedIn = booking.status === "checked_in";

        const actionButton = checkedIn
            ? `
                <button
                    class="btn btn-primary"
                    onclick="returnMachine('${escapeHTML(booking.id)}')">
                    Return machine
                </button>
              `
            : `
                <button
                    class="btn btn-primary"
                    onclick="checkInBooking('${escapeHTML(booking.id)}')">
                    Check in
                </button>
              `;

        return `
            <article class="checkin-card panel">
                <div class="checkin-card-header">
                    <div>
                        <h3>${escapeHTML(booking.machineName)}</h3>
                        <p>${escapeHTML(booking.id)}</p>
                    </div>

                    <span class="status-badge status-${checkedIn ? "checked_in" : "approved"}">
                        ${checkedIn ? "In use" : "Approved"}
                    </span>
                </div>

                <div class="checkin-details">
                    <p>
                        <strong>Student:</strong>
                        ${escapeHTML(booking.userName || booking.userEmail)}
                    </p>

                    <p>
                        <strong>Date:</strong>
                        ${escapeHTML(formatBookingDate(booking.date))}
                    </p>

                    <p>
                        <strong>Time:</strong>
                        ${escapeHTML(formatBookingTime(booking.startTime))}
                        –
                        ${escapeHTML(formatBookingTime(booking.endTime))}
                    </p>

                    ${
                        checkedIn && booking.checkedInAt
                            ? `<p>
                                <strong>Checked in:</strong>
                                ${escapeHTML(new Date(booking.checkedInAt).toLocaleString("en-IN"))}
                               </p>`
                            : ""
                    }
                </div>

                ${actionButton}
            </article>
        `;
    }).join("");
}


// Check in to an approved booking
function checkInBooking(bookingId) {
    if (!currentUser) {
        showToast("Please log in first.", "error");
        return;
    }

    const bookings = getBookings();

    const booking = bookings.find(
        item => item.id === bookingId
    );

    if (!booking) {
        showToast("Booking not found.", "error");
        return;
    }

    // Students can only check in to their own booking.
    // Owners/admins may assist with check-in.
    const isOwnerOrAdmin = ["owner", "admin"].includes(currentUser.role);

    if (
        !isOwnerOrAdmin &&
        booking.userEmail !== currentUser.email
    ) {
        showToast("You cannot check in to another student's booking.", "error");
        return;
    }

    if (booking.status !== "approved") {
        showToast("Only approved bookings can be checked in.", "warning");
        return;
    }

    // Check the booking date and time
    const now = new Date();
    const start = new Date(`${booking.date}T${booking.startTime}`);
    const end = new Date(`${booking.date}T${booking.endTime}`);

    if (now < start) {
        showToast("Your booking time has not started yet.", "warning");
        return;
    }

    if (now > end) {
        showToast("Your booking time has already ended.", "warning");
        return;
    }

    booking.status = "checked_in";
    booking.checkedInAt = now.toISOString();

    saveBookings(bookings);

    renderCheckInPage();
    renderBookings();
    renderDashboardStats();

    showToast("Check-in successful. Have a productive session!", "success");
}


// ---------- MACHINE RETURN ----------

function returnMachine(bookingId) {
    if (!currentUser) {
        showToast("Please log in first.", "error");
        return;
    }

    const bookings = getBookings();

    const booking = bookings.find(
        item => item.id === bookingId
    );

    if (!booking) {
        showToast("Booking not found.", "error");
        return;
    }

    const isOwnerOrAdmin = ["owner", "admin"].includes(currentUser.role);

    if (
        !isOwnerOrAdmin &&
        booking.userEmail !== currentUser.email
    ) {
        showToast("You cannot return another student's booking.", "error");
        return;
    }

    if (booking.status !== "checked_in") {
        showToast("This machine has not been checked in.", "warning");
        return;
    }

    booking.status = "completed";
    booking.returnedAt = new Date().toISOString();

    updateReliabilityScore(booking.userEmail, "completed");
 renderBookingHistory();

    saveBookings(bookings);

    // Notify the next person waiting in the local demo queue
    const nextStudent = notifyNextInQueue(booking.machineId);

    renderCheckInPage();
    renderBookings();
    renderDashboardStats();

    if (nextStudent) {
        showToast(
            `Machine returned! Next in queue: ${nextStudent.userName}.`,
            "success"
        );
    } else {
        showToast("Machine returned successfully.", "success");
    }
}


// Initialize owner review and check-in screens
document.addEventListener("DOMContentLoaded", function () {
    renderOwnerReviews();
    renderCheckInPage();
});
// ============================================
// PART 6: RELIABILITY SCORE
// BOOKING HISTORY + CSV EXPORT
// ============================================


// ---------- RELIABILITY SCORE ----------

// Read the saved reliability scores
function getReliabilityData() {
    try {
        return JSON.parse(
            localStorage.getItem("standby_reliability") || "{}"
        );
    } catch (error) {
        console.error("Error loading reliability data:", error);
        return {};
    }
}


// Save reliability scores
function saveReliabilityData(data) {
    localStorage.setItem(
        "standby_reliability",
        JSON.stringify(data)
    );
}


// Get a student's reliability score
function getReliabilityScore(email) {
    const data = getReliabilityData();

    // New students start with a score of 100
    if (!data[email]) {
        return {
            score: 100,
            completed: 0,
            cancelled: 0,
            noShows: 0
        };
    }

    return data[email];
}


// Determine the reliability tier
function getReliabilityTier(score) {
    if (score >= 90) {
        return {
            name: "Excellent",
            description: "Highly reliable",
            className: "tier-excellent",
            icon: "🏆"
        };
    }

    if (score >= 75) {
        return {
            name: "Good",
            description: "Usually reliable",
            className: "tier-good",
            icon: "⭐"
        };
    }

    if (score >= 50) {
        return {
            name: "Fair",
            description: "Room for improvement",
            className: "tier-fair",
            icon: "👍"
        };
    }

    return {
        name: "Needs Improvement",
        description: "Build a more reliable record",
        className: "tier-low",
        icon: "📈"
    };
}


// Update a student's reliability score
function updateReliabilityScore(email, action) {
    if (!email) {
        return;
    }

    const data = getReliabilityData();

    if (!data[email]) {
        data[email] = {
            score: 100,
            completed: 0,
            cancelled: 0,
            noShows: 0
        };
    }

    const student = data[email];

    if (action === "completed") {
        student.completed += 1;

        // Completing a booking rewards reliability
        student.score = Math.min(100, student.score + 2);
    }

    if (action === "cancelled") {
        student.cancelled += 1;

        // A cancellation slightly reduces reliability
        student.score = Math.max(0, student.score - 3);
    }

    if (action === "noShow") {
        student.noShows += 1;

        // Missing a booking has a bigger penalty
        student.score = Math.max(0, student.score - 10);
    }

    student.score = Math.round(student.score);

    saveReliabilityData(data);

    renderReliabilityScore();
}


// Render the current student's reliability score
function renderReliabilityScore() {
    if (!currentUser) {
        return;
    }

    const scoreData = getReliabilityScore(currentUser.email);
    const tier = getReliabilityTier(scoreData.score);

    const scoreElement =
        document.getElementById("reliabilityScore") ||
        document.getElementById("scoreValue");

    const tierElement =
        document.getElementById("reliabilityTier") ||
        document.getElementById("scoreTier");

    const completedElement =
        document.getElementById("completedBookingsCount") ||
        document.getElementById("completedCount");

    const cancelledElement =
        document.getElementById("cancelledBookingsCount") ||
        document.getElementById("cancelledCount");

    const noShowElement =
        document.getElementById("noShowCount");

    if (scoreElement) {
        scoreElement.textContent = scoreData.score;
    }

    if (tierElement) {
        tierElement.textContent = `${tier.icon} ${tier.name}`;

        tierElement.className =
            `reliability-tier ${tier.className}`;
    }

    if (completedElement) {
        completedElement.textContent = scoreData.completed;
    }

    if (cancelledElement) {
        cancelledElement.textContent = scoreData.cancelled;
    }

    if (noShowElement) {
        noShowElement.textContent = scoreData.noShows;
    }

    // Update score progress bar if present
    const progressBar =
        document.getElementById("reliabilityProgress") ||
        document.getElementById("scoreProgress");

    if (progressBar) {
        progressBar.style.width = `${scoreData.score}%`;
        progressBar.setAttribute(
            "aria-valuenow",
            scoreData.score
        );
    }
}


// ---------- BOOKING HISTORY ----------

// Get the current user's booking history
function getBookingHistory() {
    if (!currentUser) {
        return [];
    }

    return getBookings()
        .filter(booking => {
            if (currentUser.role === "student") {
                return booking.userEmail === currentUser.email;
            }

            return true;
        })
        .sort((a, b) => {
            return new Date(b.createdAt || 0) -
                   new Date(a.createdAt || 0);
        });
}


// Render booking history
function renderBookingHistory() {
    const container =
        document.getElementById("bookingHistoryList") ||
        document.getElementById("historyList") ||
        document.getElementById("historyTableBody");

    if (!container) {
        return;
    }

    const history = getBookingHistory();

    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <h3>No booking history</h3>
                <p>Your past and current bookings will appear here.</p>
            </div>
        `;

        return;
    }

    const isTableBody = container.tagName === "TBODY";

    if (isTableBody) {
        container.innerHTML = history.map(booking => `
            <tr>
                <td>${escapeHTML(booking.id)}</td>

                <td>
                    ${escapeHTML(booking.machineName || "Machine")}
                </td>

                <td>
                    ${escapeHTML(formatBookingDate(booking.date))}
                </td>

                <td>
                    ${escapeHTML(
                        formatBookingTime(booking.startTime)
                    )}
                    –
                    ${escapeHTML(
                        formatBookingTime(booking.endTime)
                    )}
                </td>

                <td>
                    <span class="status-badge status-${escapeHTML(booking.status)}">
                        ${escapeHTML(
                            getBookingStatusLabel(booking.status)
                        )}
                    </span>
                </td>
            </tr>
        `).join("");

        return;
    }

    container.innerHTML = history.map(booking => `
        <article class="history-card panel">
            <div class="history-card-header">
                <div>
                    <h3>
                        ${escapeHTML(booking.machineName || "Machine")}
                    </h3>

                    <p>${escapeHTML(booking.id)}</p>
                </div>

                <span class="status-badge status-${escapeHTML(booking.status)}">
                    ${escapeHTML(
                        getBookingStatusLabel(booking.status)
                    )}
                </span>
            </div>

            <p>
                <strong>Date:</strong>
                ${escapeHTML(formatBookingDate(booking.date))}
            </p>

            <p>
                <strong>Time:</strong>
                ${escapeHTML(
                    formatBookingTime(booking.startTime)
                )}
                –
                ${escapeHTML(
                    formatBookingTime(booking.endTime)
                )}
            </p>

            <p>
                <strong>Purpose:</strong>
                ${escapeHTML(booking.purpose || "General use")}
            </p>

            ${
                booking.returnedAt
                    ? `<p>
                        <strong>Returned:</strong>
                        ${escapeHTML(
                            new Date(booking.returnedAt)
                                .toLocaleString("en-IN")
                        )}
                       </p>`
                    : ""
            }
        </article>
    `).join("");
}


// ---------- CSV EXPORT ----------

// Export booking history to a CSV file
function exportBookingHistoryCSV() {
    if (!currentUser) {
        showToast("Please log in first.", "error");
        return;
    }

    const history = getBookingHistory();

    if (history.length === 0) {
        showToast("There is no booking history to export.", "warning");
        return;
    }

    const headers = [
        "Booking ID",
        "Machine",
        "Student Name",
        "Student Email",
        "Date",
        "Start Time",
        "End Time",
        "Purpose",
        "Status",
        "Created At"
    ];

    const rows = history.map(booking => [
        booking.id,
        booking.machineName,
        booking.userName,
        booking.userEmail,
        booking.date,
        booking.startTime,
        booking.endTime,
        booking.purpose,
        booking.status,
        booking.createdAt
    ]);

    // Escape commas, quotes, and newlines in CSV fields
    function csvEscape(value) {
        const textValue = String(value ?? "");

        return `"${textValue.replace(/"/g, '""')}"`;
    }

    const csvContent = [
        headers.map(csvEscape).join(","),
        ...rows.map(row => row.map(csvEscape).join(","))
    ].join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csvContent],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "standby-booking-history.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("Booking history exported successfully.", "success");
}


// ---------- CONNECT BUTTONS ----------

document.addEventListener("DOMContentLoaded", function () {
    renderReliabilityScore();
    renderBookingHistory();

    // Attach CSV export handlers
    document.querySelectorAll(
        "#exportHistoryBtn, #exportCSVBtn, .export-history-button"
    ).forEach(button => {
        button.addEventListener(
            "click",
            exportBookingHistoryCSV
        );
    });
});
// ============================================
// PART 7A: ADMIN DASHBOARD
// ============================================

// Render admin statistics
function renderAdminDashboard() {
    const adminPage = document.getElementById("adminPage");

    if (!adminPage) {
        return;
    }

    if (!currentUser || currentUser.role !== "admin") {
        const adminContent =
            document.getElementById("adminDashboardContent");

        if (adminContent) {
            adminContent.innerHTML = `
                <div class="empty-state">
                    <h3>Access restricted</h3>
                    <p>Only administrators can view this dashboard.</p>
                </div>
            `;
        }

        return;
    }

    const bookings = getBookings();
    const allMachines = getAllMachines();
    const queueEntries = getAllStandbyEntries();

    const students = new Set(
        bookings.map(booking => booking.userEmail)
    );

    const stats = {
        totalMachines: allMachines.length,

        availableMachines: allMachines.filter(
            machine => machine.status === "available"
        ).length,

        maintenanceMachines: allMachines.filter(
            machine => machine.status === "maintenance"
        ).length,

        totalBookings: bookings.length,

        pendingBookings: bookings.filter(
            booking => booking.status === "pending"
        ).length,

        approvedBookings: bookings.filter(
            booking => booking.status === "approved"
        ).length,

        completedBookings: bookings.filter(
            booking => booking.status === "completed"
        ).length,

        activeUsers: students.size,

        standbyUsers: queueEntries.filter(
            entry => entry.status === "waiting"
        ).length
    };

    // Update statistic cards if their elements exist
    const statisticElements = {
        adminTotalMachines: stats.totalMachines,
        adminAvailableMachines: stats.availableMachines,
        adminMaintenanceMachines: stats.maintenanceMachines,
        adminTotalBookings: stats.totalBookings,
        adminPendingBookings: stats.pendingBookings,
        adminApprovedBookings: stats.approvedBookings,
        adminCompletedBookings: stats.completedBookings,
        adminActiveUsers: stats.activeUsers,
        adminStandbyUsers: stats.standbyUsers
    };

    Object.entries(statisticElements).forEach(([id, value]) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    });

    renderAdminBookingTable(bookings);
    renderAdminMachineTable(allMachines);
}


// Render all bookings in the admin panel
function renderAdminBookingTable(bookings) {
    const container =
        document.getElementById("adminBookingsTableBody") ||
        document.getElementById("adminBookingsList");

    if (!container) {
        return;
    }

    if (bookings.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6">No bookings available.</td>
            </tr>
        `;

        return;
    }

    const sortedBookings = [...bookings].sort(
        (a, b) => new Date(b.createdAt || 0) -
                  new Date(a.createdAt || 0)
    );

    container.innerHTML = sortedBookings.map(booking => `
        <tr>
            <td>${escapeHTML(booking.id)}</td>

            <td>${escapeHTML(booking.machineName || "Machine")}</td>

            <td>${escapeHTML(booking.userName || "Student")}</td>

            <td>${escapeHTML(formatBookingDate(booking.date))}</td>

            <td>
                <span class="status-badge status-${escapeHTML(booking.status)}">
                    ${escapeHTML(getBookingStatusLabel(booking.status))}
                </span>
            </td>

            <td>
                ${
                    booking.status === "pending"
                        ? `
                            <button
                                class="btn btn-primary btn-sm"
                                onclick="reviewBooking('${escapeHTML(booking.id)}', 'approved')">
                                Approve
                            </button>

                            <button
                                class="btn btn-secondary btn-sm"
                                onclick="reviewBooking('${escapeHTML(booking.id)}', 'rejected')">
                                Reject
                            </button>
                          `
                        : "—"
                }
            </td>
        </tr>
    `).join("");
}


// Render machine management table
function renderAdminMachineTable(allMachines) {
    const container =
        document.getElementById("adminMachinesTableBody") ||
        document.getElementById("adminMachinesList");

    if (!container) {
        return;
    }

    if (allMachines.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="4">No machines available.</td>
            </tr>
        `;

        return;
    }

    container.innerHTML = allMachines.map(machine => `
        <tr>
            <td>${escapeHTML(machine.name)}</td>

            <td>${escapeHTML(machine.category)}</td>

            <td>
                <span class="status-badge status-${escapeHTML(machine.status)}">
                    ${escapeHTML(capitalize(machine.status))}
                </span>
            </td>

            <td>
                <button
                    class="btn btn-secondary btn-sm"
                    onclick="toggleMachineMaintenance('${escapeHTML(machine.id)}')">
                    ${
                        machine.status === "maintenance"
                            ? "Mark available"
                            : "Mark maintenance"
                    }
                </button>
            </td>
        </tr>
    `).join("");
}


// Toggle a machine's maintenance status
function toggleMachineMaintenance(machineId) {
    if (!currentUser || currentUser.role !== "admin") {
        showToast("Only administrators can manage machine status.", "error");
        return;
    }

    const allMachines = getAllMachines();

    const machine = allMachines.find(
        item => String(item.id) === String(machineId)
    );

    if (!machine) {
        showToast("Machine not found.", "error");
        return;
    }

    if (machine.status === "maintenance") {
        machine.status = "available";
    } else {
        machine.status = "maintenance";
    }

    saveMachineData(allMachines);

    renderAdminDashboard();
    renderMachines();
    renderDashboardStats();

    showToast(
        `${machine.name} is now marked ${machine.status}.`,
        "success"
    );
}


// ============================================
// PART 7B: REFRESH APP DATA
// ============================================

function refreshApplicationData() {
    renderMachines();
    renderDashboardStats();
    renderBookings();
    renderStandbyQueue();
    renderOwnerReviews();
    renderCheckInPage();
    renderReliabilityScore();
    renderBookingHistory();
    renderAdminDashboard();
}


// ============================================
// PART 7C: NAVIGATION REFRESH
// ============================================

// Refresh the relevant content when changing pages.
// This listener works alongside the navigation code from Part 1.
document.querySelectorAll("[data-nav]").forEach(navItem => {
    navItem.addEventListener("click", function () {
        setTimeout(() => {
            refreshApplicationData();
        }, 0);
    });
});


// ============================================
// PART 7D: INITIALIZE EXTRA FEATURES
// ============================================

document.addEventListener("DOMContentLoaded", function () {
    renderStandbyQueue();
    renderOwnerReviews();
    renderCheckInPage();

    renderReliabilityScore();
    renderBookingHistory();
    renderAdminDashboard();
});