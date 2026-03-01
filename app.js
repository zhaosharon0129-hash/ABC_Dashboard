// ABC Logistics Inventory Command Center
// Client-side inventory tracker with localStorage + Chart.js

const STORAGE_KEY = "abc_inventory_items_v1";
const LOW_STOCK_THRESHOLD = 10;

let items = []; // { name: "Pallets", qty: 25 }
let chart = null;

document.addEventListener("DOMContentLoaded", () => {
  setYearFooter();
  loadFromStorage();
  initChart();
  renderTable();
  renderChart();

  const form = document.getElementById("inventoryForm");
  const clearAllBtn = document.getElementById("clearAllBtn");

  if (form) {
    form.addEventListener("submit", onAddItem);
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", onClearAll);
  }
});

function setYearFooter() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function getMessageEl() {
  return document.getElementById("message");
}

function showMessage(text, type) {
  const el = getMessageEl();
  if (!el) return;

  el.textContent = text || "";
  el.classList.remove("error", "success");

  if (type === "error") el.classList.add("error");
  if (type === "success") el.classList.add("success");
}

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function validateInputs(rawName, rawQty) {
  const name = rawName.trim();

  // Item name cannot be empty
  if (!name) {
    return { ok: false, message: "Item name cannot be empty." };
  }

  // Quantity must be a positive number: no negatives, no zero, no NaN
  // Because input type=number can still deliver "" or "e" or similar depending on browser.
  const qty = Number(rawQty);

  if (!Number.isFinite(qty)) {
    return { ok: false, message: "Quantity must be a valid number." };
  }

  if (!Number.isInteger(qty)) {
    // Optional constraint: force integer inventory counts (common for logistics)
    return { ok: false, message: "Quantity must be a whole number." };
  }

  if (qty <= 0) {
    return { ok: false, message: "Quantity must be a positive number (greater than 0)." };
  }

  return { ok: true, name, qty };
}

function onAddItem(event) {
  event.preventDefault();

  const nameInput = document.getElementById("itemName");
  const qtyInput = document.getElementById("quantity");

  const rawName = nameInput ? nameInput.value : "";
  const rawQty = qtyInput ? qtyInput.value : "";

  const validated = validateInputs(rawName, rawQty);
  if (!validated.ok) {
    showMessage(validated.message, "error");
    return;
  }

  const { name, qty } = validated;
  const nameKey = normalizeName(name);

  const duplicate = items.some(i => normalizeName(i.name) === nameKey);
  if (duplicate) {
    showMessage("Duplicate item detected (case-insensitive). Please use a different name.", "error");
    return;
  }

  items.push({ name, qty });
  saveToStorage();
  renderTable();
  renderChart();

  showMessage(`Added "${name}" with quantity ${qty}.`, "success");

  // Reset inputs
  if (nameInput) nameInput.value = "";
  if (qtyInput) qtyInput.value = "";
  if (nameInput) nameInput.focus();
}

function onClearAll() {
  items = [];
  saveToStorage();
  renderTable();
  renderChart();
  showMessage("Cleared all inventory items.", "success");
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    // localStorage can fail (privacy settings, quota, etc.)
    showMessage("Warning: Unable to save to localStorage in this browser.", "error");
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      items = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Basic shape validation
      items = parsed
        .filter(x => x && typeof x.name === "string" && Number.isFinite(Number(x.qty)))
        .map(x => ({ name: x.name, qty: Number(x.qty) }));
    } else {
      items = [];
    }
  } catch {
    items = [];
  }
}

function renderTable() {
  const tbody = document.getElementById("inventoryTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (items.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 2;
    td.textContent = "No items yet. Add inventory above.";
    td.style.color = "rgba(232,237,246,.75)";
    td.style.padding = "14px 12px";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const item of items) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = item.name;

    const tdQty = document.createElement("td");
    tdQty.textContent = String(item.qty);
    tdQty.className = "num";

    tr.appendChild(tdName);
    tr.appendChild(tdQty);
    tbody.appendChild(tr);
  }
}

function initChart() {
  const canvas = document.getElementById("inventoryChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Quantity",
          data: [],
          backgroundColor: [],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.parsed.y}`
          }
        }
      }
    }
  });
}

function renderChart() {
  if (!chart) return;

  const labels = items.map(i => i.name);
  const data = items.map(i => i.qty);

  // Low stock (< 10) => red; otherwise blue theme.
  const colors = items.map(i => (i.qty < LOW_STOCK_THRESHOLD ? "#ff4d4d" : "#4f7cff"));

  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.data.datasets[0].backgroundColor = colors;

  chart.update();
}
