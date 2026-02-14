// ===== HELPERS =====
const API_BASE = "http://localhost:5000";
const $ = (id) => document.getElementById(id);

function getCategoryMeta(category) {
    const key = String(category || "").toLowerCase();
    if (key.includes("food") || key.includes("drink")) {
        return { iconClass: "icon-food" };
    }
    if (key.includes("transport") || key.includes("travel")) {
        return { iconClass: "icon-transportation" };
    }
    if (key.includes("house") || key.includes("home") || key.includes("rent")) {
        return { iconClass: "icon-others" };
    }
    if (key.includes("study") || key.includes("school") || key.includes("education")) {
        return { iconClass: "icon-study" };
    }
    if (key.includes("shop") || key.includes("market")) {
        return { iconClass: "icon-shopping" };
    }
    return { iconClass: "icon-others" };
}

function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("en-US");
}

function formatInputNumber(value) {
    const digits = String(value || "").replace(/[^0-9]/g, "");
    if (digits === "") return "";
    return Number(digits).toLocaleString("en-US");
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

function formatHistoryDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
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
                <div class="toast-expense-icon ${meta.iconClass}"></div>
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

    const existing = container.querySelectorAll(".toast");
    if (existing.length >= 3) {
        existing[0].remove();
    }

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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

    const amountInput = $("amount");
    if (amountInput) {
        amountInput.addEventListener("input", (event) => {
            const formatted = formatInputNumber(event.target.value);
            event.target.value = formatted;
        });
    }
});

// ===== ADD EXPENSE =====
async function addExpense() {
    const description = $("description").value.trim();
    const rawAmount = $("amount").value.replace(/,/g, "").trim();
    const amount = Number(rawAmount);

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
         const [limitsRes, summaryRes] = await Promise.all([
            fetch(`${API_BASE}/api/limits`),
            fetch(`${API_BASE}/api/summary`)
        ]);
        const data = await limitsRes.json();
        const summaryData = summaryRes.ok ? await summaryRes.json() : { categories: [] };
        const summaryMap = new Map(
            (summaryData.categories || []).map((item) => [item.category, item])
        );

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
            card.className = "card budget-card";
            const meta = getCategoryMeta(category);
            const summaryItem = summaryMap.get(category);
            const spent = summaryItem && typeof summaryItem.spent === "number"
                ? summaryItem.spent
                : 0;
            const limitValue = typeof limit === "number"
                ? limit
                : (summaryItem && typeof summaryItem.limit === "number" ? summaryItem.limit : null);

            let statusKey = "no_limit";
            let statusText = "No limit set yet";

            if (typeof limitValue === "number" && limitValue > 0) {
                if (spent > limitValue) {
                    statusKey = "over";
                    statusText = `Over budget: ${formatMoney(spent - limitValue)}`;
                } else if (spent < limitValue) {
                    statusKey = "under";
                    statusText = `Remaining: ${formatMoney(limitValue - spent)}`;
                } else {
                    statusKey = "equal";
                    statusText = "You have reached your budget limit";
                }
            }

            const displayValue = typeof limitValue === "number" && limitValue > 0
                ? formatMoney(limitValue)
                : "";

            card.innerHTML = `
                <div class="budget-head">
                    <span class="category-icon budget-icon ${meta.iconClass}"></span>
                    <div class="budget-title">${category}</div>
                </div>
                <div class="budget-limit-row">
                    <span class="budget-limit-label">Limit:</span>
                    <input type="text"
                           inputmode="numeric"
                           id="limit-${category}"
                           class="budget-limit-input"
                           value="${displayValue}"
                           data-original="${typeof limitValue === "number" ? limitValue : 0}"
                           placeholder="Enter limit...">
                </div>
                <div class="budget-status budget-${statusKey}">${statusText}</div>
            `;

            const limitInput = card.querySelector("input");
            limitInput.addEventListener("change", () => saveLimit(category));
            limitInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    saveLimit(category);
                }
            });
            limitInput.addEventListener("input", (event) => {
                const formatted = formatInputNumber(event.target.value);
                event.target.value = formatted;
            });

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    } catch (err) {
        console.error("Load limits error", err);
    }
}

// ===== SAVE LIMIT =====
async function saveLimit(category) {
    const inputEl = $("limit-" + category);
    const rawValue = inputEl.value.replace(/,/g, "").trim();
    const value = rawValue === "" ? 0 : Number(rawValue);
    const originalValue = Number(inputEl.dataset.original || 0);

    if (isNaN(value) || value < 0) {
        showToast({
            type: "warning",
            title: "Invalid limit",
            message: "Please enter a valid number.",
            icon: "error"
        });
        return;
    }

    if (!isNaN(originalValue) && value === originalValue) {
        showToast({
            type: "warning",
            title: "Please set a new limit",
            message: `${category}: Limit unchanged`,
            icon: "warning"
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

        inputEl.value = value > 0 ? formatMoney(value) : "";
        inputEl.dataset.original = String(value);
        await loadLimits();
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
        const totalContainer = $("summaryTotal");
        if (totalContainer) {
            totalContainer.innerHTML = "";
        }

        const fragment = document.createDocumentFragment();

        data.categories.forEach(cat => {
            const meta = getCategoryMeta(cat.category);
            const hasLimit = typeof cat.limit === "number" && cat.limit > 0;
            const isZeroLimit = typeof cat.limit === "number" && cat.limit === 0;
            const percent = hasLimit
                ? Math.min((cat.spent / cat.limit) * 100, 100)
                : 0;

            let color = "#4caf50";
            if (hasLimit && cat.spent > cat.limit) color = "#ef4444";
            else if (hasLimit && cat.spent === cat.limit) color = "#f59e0b";
            else if (percent >= 70) color = "#f59e0b";

            let statusKey = cat.status || "no_limit";
            if (!hasLimit || isZeroLimit) {
                statusKey = "no_limit";
            }
            const card = document.createElement("div");
            card.className = "summary-card";

            const amountText = hasLimit
                ? `${formatMoney(cat.spent)} / ${formatMoney(cat.limit)}`
                : `${formatMoney(cat.spent)}`;

            card.innerHTML = `
                <div class="summary-row">
                    <span class="summary-icon ${meta.iconClass}"></span>
                    <div class="summary-content">
                        <div class="summary-title">${cat.category}</div>
                        <div class="summary-amount">${amountText}</div>
                        ${hasLimit ? `
                            <div class="progress summary-progress">
                                <div class="progress-bar" 
                                     style="width:${percent}%; background:${color}">
                                </div>
                            </div>
                        ` : `
                            <div class="summary-note">
                                <span class="summary-note-icon"></span>
                                No limit set yet
                            </div>
                        `}
                    </div>
                </div>
            `;

            fragment.appendChild(card);
        });

        container.appendChild(fragment);

        if (totalContainer) {
            totalContainer.innerHTML = `
                <span>Total spending:</span>
                <span>${formatMoney(data.total_spending)}</span>
            `;
        }
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
        const dateEl = $("historyDate");
        if (dateEl) {
            dateEl.innerText = formatHistoryDate(data[0].date);
        }

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
                <div class="history-row">
                    <span class="history-icon ${meta.iconClass}"></span>
                    <div class="history-content">
                        <div class="history-title">${item.category}</div>
                        <div class="history-subtitle">${item.description}</div>
                    </div>
                    <div class="history-amount">${formatMoney(item.amount)}</div>
                </div>
            `;

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    } catch (err) {
        console.error("Load history error", err);
    }
}