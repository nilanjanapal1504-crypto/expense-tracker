/* !! SPENDWISE v4 - LOADED CORRECTLY !! */
/*
  ============================================================
  EXPENSE TRACKER - script.js
  ============================================================
  JavaScript is the "brain" of the web app.
  It makes things INTERACTIVE and DYNAMIC.

  This file is organized into these sections:
  ─────────────────────────────────────────────
  1.  APP CONFIGURATION (categories, icons)
  2.  STATE MANAGEMENT (the data we work with)
  3.  INITIALIZATION (runs when page loads)
  4.  LOCAL STORAGE (saving & loading data)
  5.  TRANSACTION FORM (add transactions)
  6.  RENDER TRANSACTIONS (display on screen)
  7.  FILTER & SEARCH (narrow down the list)
  8.  BALANCE CALCULATIONS (totals)
  9.  PIE CHART (Chart.js)
  10. MONTHLY SUMMARY
  11. DARK MODE TOGGLE
  12. CSV EXPORT
  13. MODAL & TOAST (UI helpers)
  14. UTILITY FUNCTIONS (helpers)
  ─────────────────────────────────────────────
  KEY CONCEPT: The main data flow is:
  User Action → Update transactions[] → Save to LocalStorage → Re-render UI
  ============================================================
*/


/* ============================================================
   SECTION 1: APP CONFIGURATION
   These are the categories and their emoji icons.
   Stored as objects (key-value pairs).
============================================================ */

// Expense categories with emojis
// An object is like a dictionary: key → value
const EXPENSE_CATEGORIES = {
  Food:          '🍔',
  Travel:        '✈️',
  Shopping:      '🛍️',
  Education:     '📚',
  Entertainment: '🎮',
  Bills:         '💡',
  Healthcare:    '🏥',
  Other:         '📦'
};

// Income categories with emojis
const INCOME_CATEGORIES = {
  Salary:      '💼',
  Freelance:   '💻',
  Scholarship: '🎓',
  Gift:        '🎁',
  Business:    '🏢',
  Other:       '💰'
};

// Currency symbol (change this for your own currency if needed)
const CURRENCY = '₹';


/* ============================================================
   SECTION 2: STATE MANAGEMENT
   "State" = the current data our app is working with.
   We store the list of transactions in this array.
   An array is like a numbered list: [item0, item1, item2, ...]
   Each item is a transaction OBJECT with multiple properties.
============================================================ */

// This array holds ALL transactions.
// Example of one transaction object:
// {
//   id: "tx_1234567890",
//   type: "expense",
//   amount: 500,
//   category: "Food",
//   description: "Pizza dinner",
//   date: "2024-01-15"
// }
let transactions = [];

// The current type selected (income or expense)
let currentType = 'income';

// ID of the transaction we're about to delete (used by modal)
let deleteTargetId = null;

// Reference to the Chart.js instance (so we can update/destroy it)
let expenseChartInstance = null;


/* ============================================================
   SECTION 3: INITIALIZATION
   The init() function runs as soon as the page loads.
   It sets up all the default state of the application.
============================================================ */

/**
 * INIT — Called once when the page loads.
 * Think of this as the "startup" routine.
 */
function init() {
  // 1. Load any saved transactions from Local Storage
  loadFromLocalStorage();

  // 2. Set today's date in the date input field
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;

  // 3. Show today's date in the header
  updateCurrentDate();

  // 4. Fill the category dropdown (starts as income)
  updateCategoryDropdown();

  // 5. Fill the month dropdowns (for filter & monthly summary)
  populateMonthDropdowns();

  // 6. Fill the category filter dropdown
  populateFilterCategories();

  // 7. Draw the transaction list on screen
  renderTransactions();

  // 8. Update the balance/income/expense summary cards
  updateSummaryCards();

  // 9. Draw or update the pie chart
  updateChart();

  // 10. Update monthly summary section
  updateMonthlySummary();

  // 11. Apply dark mode if it was saved
  applyDarkModePreference();

  // 12. Attach dark mode toggle here so DOM is guaranteed to be ready
  document.getElementById('darkToggle').addEventListener('click', function() {
    document.body.classList.toggle('dark');
    const icon = document.getElementById('darkIcon');
    if (document.body.classList.contains('dark')) {
      icon.className = 'fas fa-sun';
      localStorage.setItem('spendwise_dark', 'true');
    } else {
      icon.className = 'fas fa-moon';
      localStorage.setItem('spendwise_dark', 'false');
    }
    if (expenseChartInstance) updateChart();
  });

  // 13. Close modal when clicking outside the box
  document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  console.log('✅ SpendWise v4 loaded correctly - category dropdown fixed!');
}

// When the HTML document is fully loaded, run init()
// "DOMContentLoaded" fires when browser has read all HTML elements
document.addEventListener('DOMContentLoaded', function() {
  try {
    init();
  } catch(e) {
    console.error('INIT FAILED:', e);
    alert('SpendWise init error: ' + e.message);
  }
});


/* ============================================================
   SECTION 4: LOCAL STORAGE
   Local Storage is like a tiny database built into the browser.
   It stores data as TEXT (strings) using key-value pairs.
   The data PERSISTS even after you close the browser!

   How it works:
   - localStorage.setItem("key", "value")  → Save
   - localStorage.getItem("key")           → Load
   - localStorage.removeItem("key")        → Delete

   IMPORTANT: localStorage can only store STRINGS.
   That's why we use JSON.stringify() to convert our
   array/object to a string, and JSON.parse() to convert
   it back to an array/object.
============================================================ */

/**
 * SAVE to Local Storage
 * Converts our transactions array to a JSON string and saves it.
 * JSON = JavaScript Object Notation (a text format for data)
 */
function saveToLocalStorage() {
  // JSON.stringify converts: [{id:'tx1', amount:500, ...}]
  // into the text: '[{"id":"tx1","amount":500,...}]'
  localStorage.setItem('spendwise_transactions', JSON.stringify(transactions));
}

/**
 * LOAD from Local Storage
 * Reads the saved string and converts it back to our array.
 */
function loadFromLocalStorage() {
  // getItem returns null if nothing is saved yet
  const saved = localStorage.getItem('spendwise_transactions');

  if (saved) {
    // JSON.parse converts the text string back to an array of objects
    transactions = JSON.parse(saved);
  } else {
    // First time: start with empty array
    transactions = [];
  }
}


/* ============================================================
   SECTION 5: TRANSACTION FORM
   Handles the type tabs, category dropdown, and form submit.
============================================================ */

/**
 * SET TYPE — Switches between Income and Expense mode.
 * Called when user clicks the "Income" or "Expense" tab.
 * @param {string} type - Either "income" or "expense"
 */
function setType(type) {
  currentType = type; // Update the state variable

  // Get references to both tab buttons
  const incomeTab  = document.getElementById('incomeTab');
  const expenseTab = document.getElementById('expenseTab');

  // Remove 'active' class from both tabs first
  incomeTab.classList.remove('active');
  expenseTab.classList.remove('active');

  // Add 'active' class to whichever tab was clicked
  if (type === 'income') {
    incomeTab.classList.add('active');
  } else {
    expenseTab.classList.add('active');
  }

  // Update the category dropdown to match the selected type
  updateCategoryDropdown();

  // Update the submit button text
  const btn = document.getElementById('submitBtn');
  btn.innerHTML = type === 'income'
    ? '<i class="fas fa-plus"></i> Add Income'
    : '<i class="fas fa-minus"></i> Add Expense';
}

/**
 * UPDATE CATEGORY DROPDOWN
 * Fills the category <select> with options based on current type.
 */
function updateCategoryDropdown() {
  const categorySelect = document.getElementById('category');

  // Pick the right categories object based on current type
  const categories = currentType === 'income'
    ? INCOME_CATEGORIES
    : EXPENSE_CATEGORIES;

  // Clear existing options
  categorySelect.innerHTML = '';

  // Loop through each category and create an <option> element
  // Object.entries() gives us [["Food", "🍔"], ["Travel", "✈️"], ...]
  Object.entries(categories).forEach(([name, emoji]) => {
    const option = document.createElement('option'); // Creates <option>
    option.value = name;                              // The value sent to JS
    option.textContent = `${emoji} ${name}`;          // What user sees
    categorySelect.appendChild(option);               // Add to dropdown
  });
}

/**
 * ADD TRANSACTION — Main form submit handler.
 * Reads form values, creates a transaction object, saves it.
 * @param {Event} event - The form submit event
 */
function addTransaction(event) {
  // Prevent the default form behavior (which would reload the page)
  event.preventDefault();

  // Read values from the form fields
  const amount      = parseFloat(document.getElementById('amount').value);
  const category    = document.getElementById('category').value;
  const description = document.getElementById('description').value.trim();
  const date        = document.getElementById('date').value;

  // Validate: make sure amount is a positive number
  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount!', 'error');
    return; // Stop here if validation fails
  }

  // Validate: description must not be empty
  if (!description) {
    showToast('Please enter a description!', 'error');
    return;
  }

  // Create a new transaction object
  // Date.now() generates a unique number like 1705123456789
  const newTransaction = {
    id:          `tx_${Date.now()}`,    // Unique ID
    type:        currentType,           // "income" or "expense"
    amount:      amount,                // e.g. 500
    category:    category,              // e.g. "Food"
    description: description,           // e.g. "Pizza dinner"
    date:        date                   // e.g. "2024-01-15"
  };

  // Add new transaction to the BEGINNING of our array
  // unshift() adds to the front (so newest appears first)
  transactions.unshift(newTransaction);

  // Save updated array to Local Storage
  saveToLocalStorage();

  // Update the UI (re-render everything)
  renderTransactions();
  updateSummaryCards();
  updateChart();
  updateMonthlySummary();
  populateFilterCategories(); // Update category filter dropdown

  // Reset the form fields
  document.getElementById('transactionForm').reset();

  // Reset the date to today again (reset() clears it)
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;

  // Re-populate categories (reset() clears the select too)
  updateCategoryDropdown();

  // Show success message
  const emoji = currentType === 'income' ? '💚' : '🔴';
  showToast(`${emoji} Transaction added successfully!`, 'success');
}


/* ============================================================
   SECTION 6: RENDER TRANSACTIONS
   This function reads the transactions array and creates
   HTML elements to display them on the page.
============================================================ */

/**
 * RENDER TRANSACTIONS — Main display function.
 * Reads filtered transactions and displays them as HTML cards.
 */
function renderTransactions() {
  // Get the list container element
  const listEl    = document.getElementById('transactionList');
  const emptyEl   = document.getElementById('emptyState');
  const countEl   = document.getElementById('txCount');

  // Get filtered transactions (based on current search/filter state)
  const filtered = getFilteredTransactions();

  // Update the count display
  countEl.textContent = filtered.length;

  // IMPORTANT: Remove emptyEl from the DOM BEFORE clearing innerHTML,
  // otherwise listEl.innerHTML = '' destroys emptyEl and getElementById
  // returns null on the next call, causing a crash.
  if (emptyEl && emptyEl.parentNode === listEl) {
    listEl.removeChild(emptyEl);
  }

  // If no transactions match, show the empty state message
  if (filtered.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) {
      emptyEl.style.display = 'flex';
      listEl.appendChild(emptyEl);
    }
    return;
  }

  // Hide the empty state (it's detached from the list at this point)
  if (emptyEl) emptyEl.style.display = 'none';

  // Build HTML for each transaction
  // map() transforms each item in the array to an HTML string
  const html = filtered.map(tx => createTransactionHTML(tx)).join('');

  // Set the inner HTML of the list
  listEl.innerHTML = html;
}

/**
 * CREATE TRANSACTION HTML — Makes the HTML for one transaction row.
 * @param {Object} tx - A transaction object
 * @returns {string} - HTML string for the transaction
 */
function createTransactionHTML(tx) {
  // Pick the right emoji for this category
  const allCategories = { ...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES };
  const emoji = allCategories[tx.category] || '📦';

  // Format the amount with currency symbol and +/- sign
  const sign    = tx.type === 'income' ? '+' : '-';
  const amtText = `${sign}${CURRENCY}${formatNumber(tx.amount)}`;

  // Format the date nicely: "2024-01-15" → "Jan 15, 2024"
  const dateText = formatDate(tx.date);

  // CSS classes based on type
  const iconClass   = tx.type === 'income' ? 'income-icon'   : 'expense-icon';
  const amountClass = tx.type === 'income' ? 'income-amount' : 'expense-amount';

  // Return the HTML as a template literal (backtick string)
  // Template literals let us embed variables with ${...}
  return `
    <div class="tx-item" id="txItem_${tx.id}">

      <!-- Category emoji icon -->
      <div class="tx-icon ${iconClass}">${emoji}</div>

      <!-- Description, category badge, and date -->
      <div class="tx-info">
        <div class="tx-desc">${escapeHTML(tx.description)}</div>
        <div class="tx-meta">
          <span class="tx-category-badge">${tx.category}</span>
          ${dateText}
        </div>
      </div>

      <!-- Amount (color-coded) -->
      <div class="tx-amount ${amountClass}">${amtText}</div>

      <!-- Delete button — calls openDeleteModal with this transaction's ID -->
      <button class="tx-delete" onclick="openDeleteModal('${tx.id}')" title="Delete transaction">
        <i class="fas fa-trash"></i>
      </button>

    </div>
  `;
}


/* ============================================================
   SECTION 7: FILTER & SEARCH
   These functions narrow down which transactions are shown.
============================================================ */

/**
 * GET FILTERED TRANSACTIONS — Core filtering logic.
 * Reads the current filter values and returns matching transactions.
 * @returns {Array} - Filtered array of transactions
 */
function getFilteredTransactions() {
  // Read all current filter values
  const searchText     = document.getElementById('searchInput').value.toLowerCase().trim();
  const filterType     = document.getElementById('filterType').value;
  const filterCategory = document.getElementById('filterCategory').value;
  const filterMonth    = document.getElementById('filterMonth').value;

  // filter() keeps only items where the callback returns true
  return transactions.filter(tx => {

    // 1. Search: description must contain the search text
    if (searchText && !tx.description.toLowerCase().includes(searchText)) {
      return false; // Exclude this transaction
    }

    // 2. Type filter: must match income/expense or be "all"
    if (filterType !== 'all' && tx.type !== filterType) {
      return false;
    }

    // 3. Category filter: must match or be "all"
    if (filterCategory !== 'all' && tx.category !== filterCategory) {
      return false;
    }

    // 4. Month filter: date must start with "YYYY-MM" or be "all"
    if (filterMonth !== 'all' && !tx.date.startsWith(filterMonth)) {
      return false;
    }

    return true; // Include this transaction (passed all filters)
  });
}

/**
 * FILTER TRANSACTIONS — Called when any filter changes.
 * Re-renders the list with new filter criteria.
 */
function filterTransactions() {
  renderTransactions();
}

/**
 * CLEAR FILTERS — Resets all search/filter fields.
 */
function clearFilters() {
  document.getElementById('searchInput').value   = '';
  document.getElementById('filterType').value    = 'all';
  document.getElementById('filterCategory').value = 'all';
  document.getElementById('filterMonth').value   = 'all';
  renderTransactions();
}

/**
 * POPULATE FILTER CATEGORIES — Fills the category filter dropdown.
 * Only shows categories that actually exist in the transactions.
 */
function populateFilterCategories() {
  const select = document.getElementById('filterCategory');
  const current = select.value; // Remember the current selection

  // Collect unique categories from all transactions
  // Set automatically removes duplicates
  const categories = [...new Set(transactions.map(tx => tx.category))].sort();

  // Rebuild options: start with "All Categories"
  select.innerHTML = '<option value="all">All Categories</option>';

  categories.forEach(cat => {
    const allCat = { ...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES };
    const emoji  = allCat[cat] || '📦';
    const opt    = document.createElement('option');
    opt.value    = cat;
    opt.textContent = `${emoji} ${cat}`;
    select.appendChild(opt);
  });

  // Restore the previous selection if it still exists
  if (current && [...select.options].some(o => o.value === current)) {
    select.value = current;
  }
}


/* ============================================================
   SECTION 8: BALANCE CALCULATIONS
   These functions calculate totals and update the dashboard cards.
============================================================ */

/**
 * UPDATE SUMMARY CARDS — Calculates totals and updates the 3 top cards.
 * Called every time transactions are added or deleted.
 */
function updateSummaryCards() {
  // Calculate total income: sum all transaction amounts where type is "income"
  // reduce() accumulates a running total
  // acc = accumulator (running total), tx = current transaction
  const totalIncome = transactions
    .filter(tx => tx.type === 'income')     // Keep only income
    .reduce((acc, tx) => acc + tx.amount, 0); // Sum amounts (start from 0)

  // Calculate total expense
  const totalExpense = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => acc + tx.amount, 0);

  // Balance = Income - Expense
  const balance = totalIncome - totalExpense;

  // Update the display elements with formatted numbers
  const balanceEl = document.getElementById('balance');
  balanceEl.textContent = `${CURRENCY}${formatNumber(balance)}`;

  // Color the balance: green if positive, red if negative
  balanceEl.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';

  // Add pulse animation to show the number was updated
  balanceEl.classList.remove('amount-updated');
  // Force reflow so animation restarts (browser trick)
  void balanceEl.offsetWidth;
  balanceEl.classList.add('amount-updated');

  document.getElementById('totalIncome').textContent  = `${CURRENCY}${formatNumber(totalIncome)}`;
  document.getElementById('totalExpense').textContent = `${CURRENCY}${formatNumber(totalExpense)}`;
}


/* ============================================================
   SECTION 9: PIE CHART (using Chart.js library)
   Chart.js is an open-source library that draws charts on
   an HTML <canvas> element.

   HOW IT WORKS:
   1. We calculate how much was spent per category
   2. We pass that data to Chart.js
   3. Chart.js draws a pie/doughnut chart on the <canvas>
============================================================ */

// Color palette for the pie chart slices
const CHART_COLORS = [
  '#6c63ff', '#22c55e', '#ef4444', '#f59e0b',
  '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'
];

/**
 * UPDATE CHART — Builds expense data by category and draws/updates the pie chart.
 */
function updateChart() {
  const noDataEl   = document.getElementById('noChartData');
  const canvasEl   = document.getElementById('expenseChart');

  // Get only expense transactions
  const expenses = transactions.filter(tx => tx.type === 'expense');

  // If no expenses yet, hide chart and show placeholder
  if (expenses.length === 0) {
    noDataEl.style.display = 'flex';
    canvasEl.style.display = 'none';

    // Destroy old chart instance if it exists
    if (expenseChartInstance) {
      expenseChartInstance.destroy();
      expenseChartInstance = null;
    }
    return;
  }

  // Show canvas and hide placeholder
  noDataEl.style.display = 'none';
  canvasEl.style.display = 'block';

  // GROUP expenses by category and SUM their amounts
  // Result: { "Food": 1200, "Travel": 800, "Bills": 3000, ... }
  const categoryTotals = {};

  expenses.forEach(tx => {
    // If this category hasn't been seen before, start at 0
    if (!categoryTotals[tx.category]) {
      categoryTotals[tx.category] = 0;
    }
    // Add this transaction's amount to the category total
    categoryTotals[tx.category] += tx.amount;
  });

  // Convert to arrays that Chart.js needs:
  // labels: ["Food", "Travel", "Bills"]
  // data:   [1200, 800, 3000]
  const labels = Object.keys(categoryTotals);
  const data   = Object.values(categoryTotals);

  // If a chart already exists, destroy it before creating a new one
  // (Otherwise, Chart.js will stack them on top of each other)
  if (expenseChartInstance) {
    expenseChartInstance.destroy();
  }

  // Get the 2D drawing context from the canvas element
  const ctx = canvasEl.getContext('2d');

  // Create a new Chart.js doughnut chart
  expenseChartInstance = new Chart(ctx, {
    type: 'doughnut', // "pie" or "doughnut" or "bar", "line", etc.

    data: {
      labels: labels, // Category names (shown in legend/tooltip)

      datasets: [{
        data:             data,         // Numeric values for each slice
        backgroundColor:  CHART_COLORS, // Slice colors
        borderColor:      '#fff',       // White border between slices
        borderWidth:      3,
        hoverOffset:      8             // Slices expand on hover
      }]
    },

    options: {
      responsive:         true,
      maintainAspectRatio: true,
      cutout:             '60%', // Makes it a doughnut (hole in center)

      plugins: {
        legend: {
          position: 'bottom', // Legend (labels) at the bottom
          labels: {
            padding:   16,
            font:      { size: 12, family: 'DM Sans' },
            color:     getComputedStyle(document.body)
                         .getPropertyValue('--text') || '#1e293b',
            boxWidth:  12,
            boxHeight: 12,
            borderRadius: 3
          }
        },

        tooltip: {
          callbacks: {
            // Custom tooltip: shows "Food: ₹1,200 (45%)"
            label: function(context) {
              const total   = context.dataset.data.reduce((a, b) => a + b, 0);
              const value   = context.raw;
              const percent = ((value / total) * 100).toFixed(1);
              return ` ${context.label}: ${CURRENCY}${formatNumber(value)} (${percent}%)`;
            }
          }
        }
      }
    }
  });
}


/* ============================================================
   SECTION 10: MONTHLY SUMMARY
   Shows income, expenses, savings, and a progress bar
   for a selected month.
============================================================ */

/**
 * POPULATE MONTH DROPDOWNS — Fills both month selectors.
 * Scans all transactions to find which months have data.
 */
function populateMonthDropdowns() {
  // Get unique months from all transactions
  // A month is represented as "YYYY-MM" (e.g., "2024-01")
  const months = [...new Set(transactions.map(tx => tx.date.substring(0, 7)))].sort().reverse();

  // Also include the current month even if no transactions yet
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!months.includes(currentMonth)) {
    months.unshift(currentMonth);
  }

  // Helper function to format "2024-01" as "January 2024"
  const formatMonthOption = (m) => {
    const [year, month] = m.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  // Fill the monthly summary select
  const monthFilterEl = document.getElementById('monthFilter');
  monthFilterEl.innerHTML = '';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = formatMonthOption(m);
    monthFilterEl.appendChild(opt);
  });

  // Fill the transaction filter select
  const filterMonthEl = document.getElementById('filterMonth');
  const savedVal = filterMonthEl.value;
  filterMonthEl.innerHTML = '<option value="all">All Months</option>';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = formatMonthOption(m);
    filterMonthEl.appendChild(opt);
  });
  if (savedVal) filterMonthEl.value = savedVal;
}

/**
 * UPDATE MONTHLY SUMMARY — Calculates and displays stats for selected month.
 */
function updateMonthlySummary() {
  const selectedMonth = document.getElementById('monthFilter').value;
  if (!selectedMonth) return;

  // Filter transactions for the selected month
  const monthTx = transactions.filter(tx => tx.date.startsWith(selectedMonth));

  // Calculate totals
  const income  = monthTx.filter(tx => tx.type === 'income')
                          .reduce((acc, tx) => acc + tx.amount, 0);
  const expense = monthTx.filter(tx => tx.type === 'expense')
                          .reduce((acc, tx) => acc + tx.amount, 0);
  const savings = income - expense;
  const count   = monthTx.length;

  // Update the display
  document.getElementById('monthIncome').textContent  = `${CURRENCY}${formatNumber(income)}`;
  document.getElementById('monthExpense').textContent = `${CURRENCY}${formatNumber(expense)}`;
  document.getElementById('monthCount').textContent   = count;

  // Net savings
  const savingsEl = document.getElementById('monthSavings');
  savingsEl.textContent  = `${CURRENCY}${formatNumber(Math.abs(savings))}`;
  savingsEl.style.color  = savings >= 0 ? 'var(--income)' : 'var(--expense)';

  // Progress bar: shows what % of income was spent
  let percent = 0;
  if (income > 0) {
    percent = Math.min((expense / income) * 100, 100); // Cap at 100%
  }

  document.getElementById('savingsBarFill').style.width = `${percent}%`;
  document.getElementById('savingsPercent').textContent  = `${percent.toFixed(1)}%`;
}


/* ============================================================
   SECTION 11: DARK MODE TOGGLE
   Adds or removes the "dark" class on <body>.
   CSS has rules for body.dark that override light mode colors.
============================================================ */

// Dark mode toggle is registered inside init() to guarantee the DOM is ready.

/**
 * APPLY DARK MODE PREFERENCE — Reads saved preference on page load.
 */
function applyDarkModePreference() {
  const isDark = localStorage.getItem('spendwise_dark') === 'true';
  if (isDark) {
    document.body.classList.add('dark');
    document.getElementById('darkIcon').className = 'fas fa-sun';
  }
}


/* ============================================================
   SECTION 12: CSV EXPORT
   Creates a downloadable CSV file from all transactions.
   CSV = Comma Separated Values (opens in Excel, Google Sheets)

   HOW IT WORKS:
   1. We build a string with comma-separated values
   2. We create a temporary <a> link element
   3. We attach the string as a downloadable file to the link
   4. We programmatically click the link to trigger download
   5. We remove the link element
============================================================ */

/**
 * EXPORT TO CSV — Downloads all transactions as a .csv file.
 */
function exportToCSV() {
  if (transactions.length === 0) {
    showToast('No transactions to export!', 'error');
    return;
  }

  // Helper: wrap any value in quotes for CSV safety
  const q = val => `"${String(val).replace(/"/g, '""')}"`;

  // CSV header row — all quoted for consistency
  const headers = [q('Date'), q('Type'), q('Category'), q('Description'), q('Amount')];

  // Convert each transaction to a CSV row
  const rows = transactions.map(tx => {
    // Safely convert YYYY-MM-DD → DD/MM/YYYY for Excel (India format)
    let dateStr = tx.date || '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        dateStr = parts[2] + '/' + parts[1] + '/' + parts[0]; // DD/MM/YYYY
      }
    }
    return [
      q(dateStr),
      q(tx.type.charAt(0).toUpperCase() + tx.type.slice(1)),
      q(tx.category),
      q(tx.description),
      tx.type === 'income' ? tx.amount : -tx.amount
    ];
  });

  // Join everything into one big string
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  // \uFEFF = BOM so Excel opens UTF-8 correctly (shows ₹ and special chars)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create a URL pointing to that file in memory
  const url = URL.createObjectURL(blob);

  // Create a hidden <a> link element
  const link = document.createElement('a');
  link.href  = url;

  // Set the filename with today's date
  const today = new Date().toISOString().split('T')[0]; // "2024-01-15"
  link.download = `spendwise_transactions_${today}.csv`;

  // Add link to page, click it, then remove it
  document.body.appendChild(link);
  link.click();              // Triggers the download
  document.body.removeChild(link);

  // Free up the memory
  URL.revokeObjectURL(url);

  showToast('📊 CSV exported successfully!', 'success');
}


/* ============================================================
   SECTION 13: DELETE MODAL & TOAST

   DELETE FLOW:
   1. User clicks 🗑️ button on a transaction
   2. openDeleteModal() is called with that transaction's ID
   3. Modal appears asking "Are you sure?"
   4. If user clicks "Delete", confirmDelete() runs
   5. If user clicks "Cancel", closeModal() runs

   TOAST:
   A temporary notification message that appears briefly.
============================================================ */

/**
 * OPEN DELETE MODAL — Shows the confirmation dialog.
 * @param {string} id - The ID of the transaction to delete
 */
function openDeleteModal(id) {
  deleteTargetId = id; // Remember which transaction to delete
  document.getElementById('modalOverlay').classList.add('active');
}

/**
 * CLOSE MODAL — Hides the confirmation dialog without deleting.
 */
function closeModal() {
  deleteTargetId = null; // Clear the target
  document.getElementById('modalOverlay').classList.remove('active');
}

// Close modal when clicking outside — registered inside init()


/**
 * CONFIRM DELETE — Actually deletes the transaction.
 */
function confirmDelete() {
  if (!deleteTargetId) return;

  // filter() returns a NEW array without the deleted transaction
  // We're keeping every transaction EXCEPT the one being deleted
  transactions = transactions.filter(tx => tx.id !== deleteTargetId);

  // Save the updated array
  saveToLocalStorage();

  // Update all UI sections
  renderTransactions();
  updateSummaryCards();
  updateChart();
  updateMonthlySummary();
  populateMonthDropdowns();
  populateFilterCategories();

  closeModal();
  showToast('🗑️ Transaction deleted.', 'info');
}

/**
 * SHOW TOAST — Displays a brief notification message.
 * @param {string} message - The text to display
 * @param {string} type    - "success", "error", or "info"
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;

  // Remove any existing type classes
  toast.classList.remove('success', 'error', 'info', 'show');

  // Add the type class (controls background color)
  toast.classList.add(type);

  // Small delay to let the browser process the class removal first
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove the toast after 3 seconds
  setTimeout(() => toast.classList.remove('show'), 3000);
}


/* ============================================================
   SECTION 14: UTILITY / HELPER FUNCTIONS
   Small reusable functions that are used throughout the code.
============================================================ */

/**
 * FORMAT NUMBER — Converts 1500.5 to "1,500.50"
 * Adds commas and 2 decimal places.
 * @param {number} num - The number to format
 * @returns {string} - Formatted string
 */
function formatNumber(num) {
  return Math.abs(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * FORMAT DATE — Converts "2024-01-15" to "Jan 15, 2024"
 * @param {string} dateStr - Date in "YYYY-MM-DD" format
 * @returns {string} - Human-readable date string
 */
function formatDate(dateStr) {
  // Split the date string and create a Date object
  // We add T00:00:00 to avoid timezone issues
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    year:  'numeric',
    month: 'short',
    day:   'numeric'
  });
}

/**
 * UPDATE CURRENT DATE — Shows today's date in the header.
 */
function updateCurrentDate() {
  const el = document.getElementById('currentDate');
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric'
  });
}

/**
 * ESCAPE HTML — Prevents XSS (Cross-Site Scripting) attacks.
 * If a user types <script>alert('hack')</script> as description,
 * this function converts the < and > to harmless text.
 * @param {string} str - User input text
 * @returns {string} - Safe text
 */
function escapeHTML(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, m => map[m]);
}


/* ============================================================
   BONUS: Keyboard shortcut to close modal with Escape key
============================================================ */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});


/*
  ============================================================
  END OF script.js
  ============================================================
  SUMMARY OF HOW EVERYTHING CONNECTS:

  When the page loads:
    init() → loadFromLocalStorage() + renderTransactions() + updateSummaryCards()

  When user adds a transaction:
    addTransaction() → transactions.unshift() → saveToLocalStorage()
    → renderTransactions() → updateSummaryCards() → updateChart()

  When user deletes a transaction:
    openDeleteModal() → confirmDelete() → transactions.filter()
    → saveToLocalStorage() → all UI update functions

  When user filters/searches:
    filterTransactions() → getFilteredTransactions() → renderTransactions()

  The transactions array is the SINGLE SOURCE OF TRUTH.
  Everything on screen is derived from it.
  ============================================================
*/
