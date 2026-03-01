const STORAGE_KEY = "abc_inventory_items_v1";
const LOW_STOCK_THRESHOLD = 10;

let items = [];
let chart = null;

document.addEventListener("DOMContentLoaded", () => {
  setYearFooter();
  loadFromStorage();
  initChart();
  renderTable();
  renderChart();

  const form = document.getElementById("inventoryForm");
  const clearAllBtn = document.getElementById("clearAllBtn");

  if (form) form.addEventListener("submit", onAddItem);
  if (clearAllBtn) clearAllBtn.addEventListener("click", onClearAll);
});

function setYearFooter() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function showMessage(text, type) {
  const el = document.getElementById("message");
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
  if (!name) return { ok: false, message: "Item name cannot be empty." };

  const qty = Number(rawQty);
  if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
    return { ok: false, message: "Quantity must be a positive whole number." };
  }

  return { ok: true, name, qty };
}

function onAddItem(e) {
  e.preventDefault();

  const nameInput = document.getElementById("itemName");
  const qtyInput = document.getElementById("quantity");

  const validated = validateInputs(nameInput.value, qtyInput.value);
  if (!validated.ok) {
    showMessage(validated.message, "error");
    return;
  }

  const { name, qty } = validated;
  const nameKey = normalizeName(name);

  const duplicate = items.some(i => normalizeName(i.name) === nameKey);
  if (duplicate) {
    showMessage("Duplicate item detected (case-insensitive).", "error");
    return;
  }

  items.push({ name, qty });
  saveToStorage();
  renderTable();
  renderChart();

  showMessage(`Added "${name}" with quantity ${qty}.`, "success");

  nameInput.value = "";
  qtyInput.value = "";
}

function onClearAll() {
  items = [];
  saveToStorage();
  renderTable();
  renderChart();
  showMessage("Cleared all inventory items.", "success");
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    items = parsed.map(x => ({ name: x.name, qty: Number(x.qty) }));
  }
}

function renderTable() {
  const tbody = document.getElementById("inventoryTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">No items yet.</td></tr>`;
    return;
  }

  for (const item of items) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td class="num">${item.qty}</td>
    `;
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
      datasets: [{
        label: "Quantity",
        data: [],
        backgroundColor: [],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#64748b", font: { weight: "600" } }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(15,23,42,0.10)" },
          ticks: { color: "#64748b", precision: 0 }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15,23,42,0.92)",
          titleColor: "#fff",
          bodyColor: "#fff",
          displayColors: false,
          callbacks: {
            label: (context) => `Quantity: ${context.parsed.y}`
          }
        }
      }
    }
  });
}

function renderChart() {
  if (!chart) return;

  chart.data.labels = items.map(i => i.name);
  chart.data.datasets[0].data = items.map(i => i.qty);
  chart.data.datasets[0].backgroundColor =
    items.map(i => i.qty < LOW_STOCK_THRESHOLD ? "#ef4444" : "#2563eb");

  chart.update();
}
