// ===== HELPERS =====
const API_BASE = "http://localhost:5000";
const $ = (id) => document.getElementById(id);

function getCategoryMeta(category) {
    const key = String(category || "").toLowerCase();
    if (key.includes("food") || key.includes("drink")) {
        return { icon: "restaurant", color: "#ff7a59" };
    }
    if (key.includes("transport") || key.includes("travel")) {
        return { icon: "directions_car", color: "#4f8df7" };
    }
    if (key.includes("house") || key.includes("home") || key.includes("rent")) {
        return { icon: "home", color: "#ef5da8" };
    }
    if (key.includes("study") || key.includes("school") || key.includes("education")) {
        return { icon: "school", color: "#22c55e" };
    }
    if (key.includes("shop") || key.includes("market")) {
        return { icon: "shopping_bag", color: "#a855f7" };
    }
    return { icon: "category", color: "#94a3b8" };
}

function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("vi-VN");
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const days = ["Sun", "Mon", "Tues", "Wed", "Thu", "Fri", "Sat"];
    const day = days[date.getDay()];
    const dayNum = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}, ${dayNum}/${month}/${year}`;
}

function showToast({ type, title, message, icon, expense }) {
    const container = $("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    
    if (type === "expense-detail" && expense) {
        // Detailed expense toast like the design
        const meta = getCategoryMeta(expense.category);
        const formattedDate = formatDate(expense.date);
        const formattedAmount = formatMoney(expense.amount);
        
        toast.className = "toast toast-expense-detail";
        toast.innerHTML = `
            <div class="toast-expense-header">
                <div class="toast-expense-title">${title}</div>
                <div class="toast-expense-date">${formattedDate}</div>
            </div>
            <div class="toast-expense-body">
                <div class="toast-expense-icon" style="background-color: ${meta.color}">
                    <span class="material-symbols-rounded">${meta.icon}</span>
                </div>
                <div class="toast-expense-details">
                    <div class="toast-expense-category">${expense.category}</div>
                    <div class="toast-expense-description">${expense.description}</div>
                </div>
                <div class="toast-expense-amount">${formattedAmount}</div>
            </div>
        `;
    } else {
        // Regular toast
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">
                <span class="material-symbols-rounded">${icon}</span>
            </span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
    }

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 10000);
}

function showOnly(pageId) {
    ["addPage", "budgetPage", "summaryPage"].forEach(id => {
        $(id).classList.add("hidden");
    });
    $(pageId).classList.remove("hidden");
}

// ===== NAVIGATION =====
function showPage(page) {
    localStorage.setItem("activePage", page);
    if (page === "add") {
        $("pageTitle").innerText = "Add Expense";
        showOnly("addPage");
    }

    if (page === "budget") {
        $("pageTitle").innerText = "Set Budget";
        showOnly("budgetPage");
        loadLimits();
    }

    if (page === "summary") {
        $("pageTitle").innerText = "Summary";
        showOnly("summaryPage");
        loadSummary();
        loadHistory();
    }

    updateNavActive(page);
}

function updateNavActive(page) {
    ["navAdd", "navBudget", "navSummary"].forEach(id => {
        const btn = $(id);
        if (btn) btn.classList.remove("active");
    });
    const activeBtn = $("nav" + page.charAt(0).toUpperCase() + page.slice(1));
    if (activeBtn) activeBtn.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
    const savedPage = localStorage.getItem("activePage") || "add";
    showPage(savedPage);
});

// ===== ADD EXPENSE =====
async function addExpense() {
    const description = $("description").value.trim();
    const amount = Number($("amount").value);

    if (!description) {
        showToast({
            type: "warning",
            title: "Invalid input",
            message: "Description cannot be empty.",
            icon: "error"
        });
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showToast({
            type: "warning",
            title: "Invalid input",
            message: "Amount must be a positive number.",
            icon: "error"
        });
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/expenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description, amount })
        });

        if (!res.ok) {
            const errorText = await res.text();
            showToast({
                type: "warning",
                title: "Error adding expense",
                message: errorText || "Please try again.",
                icon: "error"
            });
            return;
        }

        let created = null;
        try {
            created = await res.json();
        } catch {
            created = { description, category: null };
        }

        showToast({
            type: "expense-detail",
            title: "Expense recorded",
            expense: created
        });
        $("description").value = "";
        $("amount").value = "";

        try {
            const summaryRes = await fetch(`${API_BASE}/api/summary`);
            if (summaryRes.ok) {
                const summary = await summaryRes.json();
                const item = summary.categories.find(
                    (cat) => cat.category === created.category
                );
                if (item && item.status === "over" && item.limit > 0) {
                    showToast({
                        type: "warning",
                        title: `You exceeded ${created.category} budget!`,
                        message: "Review your limit in Budget tab.",
                        icon: "warning"
                    });
                }
            }
        } catch {
            // Ignore summary errors to avoid blocking success feedback.
        }
    } catch (err) {
        showToast({
            type: "warning",
            title: "Error adding expense",
            message: "Network or server issue.",
            icon: "error"
        });
    }
}

// ===== LOAD LIMITS =====
async function loadLimits() {
    try {
        const res = await fetch(`${API_BASE}/api/limits`);
        const data = await res.json();

        const container = $("limitContainer");
        container.innerHTML = "";

        const entries = Array.isArray(data)
            ? data
            : Object.keys(data).map((key) => ({ category: key, limit: data[key] }));

        const categories = entries.map((item) => item.category);

        if (!categories.length) {
            container.innerText = "No categories yet.";
            return;
        }

        const fragment = document.createDocumentFragment();

        entries.forEach(({ category, limit }) => {
            const card = document.createElement("div");
            card.className = "card";
            const meta = getCategoryMeta(category);

            card.innerHTML = `
                <div class="card-title-row">
                    <span class="category-icon" style="background:${meta.color}">
                        <span class="material-symbols-rounded">${meta.icon}</span>
                    </span>
                    <div class="card-title">${category}</div>
                </div>
                <input type="number" id="limit-${category}" 
                       value="${limit || ''}" 
                       placeholder="Set limit">
                  <button type="button">Save</button>
            `;

            card.querySelector("button")
                .addEventListener("click", () => saveLimit(category));

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    } catch (err) {
        console.error("Load limits error", err);
    }
}

// ===== SAVE LIMIT =====
async function saveLimit(category) {
    const value = Number($("limit-" + category).value);

    if (isNaN(value) || value < 0) {
        showToast({
            type: "warning",
            title: "Invalid limit",
            message: "Please enter a valid number.",
            icon: "error"
        });
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/limits`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category, limit: value })
        });

        if (!res.ok) {
            showToast({
                type: "warning",
                title: "Error saving limit",
                message: "Please try again.",
                icon: "error"
            });
            return;
        }

        if (value === 0) {
            showToast({
                type: "success",
                title: "No limit set",
                message: `${category}: No limit`,
                icon: "check_circle"
            });
        } else {
            showToast({
                type: "success",
                title: "Limit saved",
                message: `${category}: ${formatMoney(value)}`,
                icon: "check_circle"
            });
        }
    } catch (err) {
        showToast({
            type: "warning",
            title: "Error saving limit",
            message: "Network issue.",
            icon: "error"
        });
    }
}

// ===== LOAD SUMMARY =====
async function loadSummary() {
    try {
        const res = await fetch(`${API_BASE}/api/summary`);
        const data = await res.json();

        const container = $("summaryContainer");
        container.innerHTML = "";

        const fragment = document.createDocumentFragment();

        data.categories.forEach(cat => {
            const meta = getCategoryMeta(cat.category);
            const hasLimit = typeof cat.limit === "number" && cat.limit > 0;
            const isZeroLimit = typeof cat.limit === "number" && cat.limit === 0;
            const percent = hasLimit
                ? Math.min((cat.spent / cat.limit) * 100, 100)
                : 0;

            let color = "#4caf50";
            if (percent >= 100) color = "#ef4444";
            else if (percent >= 70) color = "#f59e0b";

            let statusKey = cat.status || "no_limit";
            if (!hasLimit || isZeroLimit) {
                statusKey = "no_limit";
            }
            const statusTextMap = {
                over: "Over limit",
                under: "Under limit",
                equal: "On limit",
                no_limit: "No limit set"
            };
            const statusText = statusTextMap[statusKey] || "Status unknown";

            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <div class="card-title-row">
                    <span class="category-icon" style="background:${meta.color}">
                        <span class="material-symbols-rounded">${meta.icon}</span>
                    </span>
                    <div class="card-title">${cat.category}</div>
                </div>
                <div class="card-amount">
                    ${formatMoney(cat.spent)} 
                    ${cat.limit ? "/ " + formatMoney(cat.limit) : ""}
                </div>
                <div class="status-line status-${statusKey}">${statusText}</div>
                ${hasLimit ? `
                    <div class="progress">
                        <div class="progress-bar" 
                             style="width:${percent}%; background:${color}">
                        </div>
                    </div>
                ` : ""}
            `;

            fragment.appendChild(card);
        });

        // total
        const totalBar = document.createElement("div");
        totalBar.className = "total-bar";
        totalBar.innerHTML = `
            <span>Total Spending</span>
            <span>${formatMoney(data.total_spending)}</span>
        `;
        fragment.appendChild(totalBar);

        container.appendChild(fragment);
    } catch (err) {
        console.error("Load summary error", err);
    }
}

// ===== LOAD HISTORY =====
async function loadHistory() {
    try {
        const res = await fetch(`${API_BASE}/api/expenses`);
        const data = await res.json();

        const container = $("historyContainer");
        container.innerHTML = "";

        if (!data.length) {
            container.innerText = "No expenses yet.";
            return;
        }

        const fragment = document.createDocumentFragment();

        data.forEach(item => {
            const card = document.createElement("div");
            card.className = "history-card";
            const meta = getCategoryMeta(item.category);

            card.innerHTML = `
                <div class="history-top">
                    <span class="history-icon" style="background:${meta.color}">
                        <span class="material-symbols-rounded">${meta.icon}</span>
                    </span>
                    <div class="history-title">${item.description}</div>
                    <div class="history-amount">${formatMoney(item.amount)}</div>
                </div>
                <div class="history-meta">
                    ${new Date(item.date).toLocaleString("vi-VN")} • ${item.category}
                </div>
            `;

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    } catch (err) {
        console.error("Load history error", err);
    }
}