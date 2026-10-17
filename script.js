/**
 * Recipe Scaler Studio - Application Logic (JavaScript)
 * Modern Flat Architecture, Multi-Feature Culinary Suite, Chef AI Integration
 */
import { jsPDF } from 'jspdf';

// =========================================================================
// STORAGE KEYS & CONSTANTS
// =========================================================================
const STORAGE_KEY_INPUTS = 'recipe_scaler_inputs_v5';
const STORAGE_KEY_RESULTS = 'recipe_scaler_results_v5';
const STORAGE_KEY_THEME = 'recipe_scaler_theme_v5';
const STORAGE_KEY_COOKBOOK = 'recipe_scaler_cookbook_v5';
const STORAGE_KEY_SOUND = 'recipe_scaler_sound_v5';
const STORAGE_KEY_FRACTION = 'recipe_scaler_fraction_pref_v5';
const STORAGE_KEY_RECENT_CONV = 'recipe_scaler_recent_conversions_v5';
const STORAGE_KEY_WALLPAPER = 'recipe_scaler_wallpaper_v5';
const STORAGE_KEY_TIMER_TICK = 'recipe_scaler_timer_tick_v5';

// DOM ELEMENTS
const themeToggleBtn = document.getElementById('themeToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundOnIcon = document.getElementById('soundOnIcon');
const soundOffIcon = document.getElementById('soundOffIcon');

const dishNameInput = document.getElementById('dishName');
const servingsOriginalInput = document.getElementById('servingsOriginal');
const servingsWantedInput = document.getElementById('servingsWanted');
const recipeNotesInput = document.getElementById('recipeNotes');

const ing1Name = document.getElementById('ing1_name');
const ing1Amount = document.getElementById('ing1_amount');
const ing1Unit = document.getElementById('ing1_unit');

const ing2Name = document.getElementById('ing2_name');
const ing2Amount = document.getElementById('ing2_amount');
const ing2Unit = document.getElementById('ing2_unit');

const ing3Name = document.getElementById('ing3_name');
const ing3Amount = document.getElementById('ing3_amount');
const ing3Unit = document.getElementById('ing3_unit');

const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');

const resultsSection = document.getElementById('resultsSection');
const resultDishTitle = document.getElementById('resultDishTitle');
const resultServingsSummary = document.getElementById('resultServingsSummary');
const resultMultiplierVal = document.getElementById('resultMultiplierVal');
const resultsTableBody = document.getElementById('resultsTableBody');
const checklistItemsList = document.getElementById('checklistItemsList');
const copyToast = document.getElementById('copyToast');
const savedCount = document.getElementById('savedCount');

// Fraction display preference
let showFractions = localStorage.getItem(STORAGE_KEY_FRACTION) === 'true';

// =========================================================================
// 1. EMBERS PARTICLES CANVAS ANIMATION
// =========================================================================
const canvas = document.getElementById('embersCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class EmberParticle {
  constructor() {
    this.reset(true);
  }
  reset(initial = false) {
    this.x = Math.random() * (canvas ? canvas.width : 1000);
    this.y = initial ? Math.random() * (canvas ? canvas.height : 1000) : (canvas ? canvas.height + 20 : 1000);
    this.size = Math.random() * 2.5 + 1;
    this.speedY = -(Math.random() * 0.8 + 0.3);
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.opacity = Math.random() * 0.5 + 0.15;
    this.fadeSpeed = Math.random() * 0.003 + 0.002;
    this.hue = Math.random() > 0.3 ? (Math.random() * 25 + 20) : 45; // amber / warm gold
  }
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.opacity -= this.fadeSpeed;
    if (this.y < -20 || this.opacity <= 0) {
      this.reset();
    }
  }
  draw() {
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 95%, 55%, ${this.opacity})`;
    ctx.shadowBlur = 6;
    ctx.shadowColor = `hsla(${this.hue}, 95%, 55%, ${this.opacity * 0.8})`;
    ctx.fill();
  }
}

for (let i = 0; i < 40; i++) {
  particles.push(new EmberParticle());
}

function animateParticles() {
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
  }
  requestAnimationFrame(animateParticles);
}
requestAnimationFrame(animateParticles);

// =========================================================================
// 2. WEB AUDIO API SYNTHESIZER
// =========================================================================
let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, type, duration, gainVal = 0.08) {
  if (!soundEnabled) return;
  try {
    const actx = getAudioContext();
    if (!actx) return;
    const osc = actx.createOscillator();
    const gainNode = actx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, actx.currentTime);

    gainNode.gain.setValueAtTime(gainVal, actx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(actx.destination);

    osc.start();
    osc.stop(actx.currentTime + duration);
  } catch (e) {
    // Ignore audio error gracefully
  }
}

function playClickSfx() {
  playTone(580, 'sine', 0.08, 0.05);
}

function playSuccessChime() {
  if (!soundEnabled) return;
  setTimeout(() => playTone(523.25, 'triangle', 0.15, 0.08), 0);   // C5
  setTimeout(() => playTone(659.25, 'triangle', 0.18, 0.08), 80);  // E5
  setTimeout(() => playTone(783.99, 'triangle', 0.28, 0.1), 160);  // G5
}

function playErrorThud() {
  if (!soundEnabled) return;
  playTone(180, 'sawtooth', 0.2, 0.09);
}

function initSoundSetting() {
  const saved = localStorage.getItem(STORAGE_KEY_SOUND);
  soundEnabled = saved !== 'false';
  updateSoundUI();
}

function updateSoundUI() {
  if (soundEnabled) {
    if (soundOnIcon) soundOnIcon.style.display = 'block';
    if (soundOffIcon) soundOffIcon.style.display = 'none';
  } else {
    if (soundOnIcon) soundOnIcon.style.display = 'none';
    if (soundOffIcon) soundOffIcon.style.display = 'block';
  }
  localStorage.setItem(STORAGE_KEY_SOUND, soundEnabled ? 'true' : 'false');
}

if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    updateSoundUI();
    if (soundEnabled) playClickSfx();
  });
}

// =========================================================================
// 3. SUITE TABS
// =========================================================================
window.switchSuiteTab = function(tabId) {
  playClickSfx();
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activePanel = document.getElementById(tabId);
  if (activePanel) {
    activePanel.classList.add('active');
  }

  const activeBtn = Array.from(document.querySelectorAll('.nav-tab-btn')).find(b => 
    b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId)
  );
  if (activeBtn) activeBtn.classList.add('active');

  const presetsBar = document.getElementById('presetsBar');
  if (presetsBar) {
    presetsBar.style.display = tabId === 'scalerTab' ? 'flex' : 'none';
  }

  if (tabId === 'cookbookTab') {
    renderCookbook();
  }
};

// =========================================================================
// 4. THEME TOGGLE
// =========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY_THEME, theme);

  if (theme === 'dark') {
    if (sunIcon) sunIcon.style.display = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
  } else {
    if (sunIcon) sunIcon.style.display = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    playClickSfx();
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// =========================================================================
// 5. FRACTION HELPER
// =========================================================================
function toFractionString(val) {
  if (typeof val !== 'number' || isNaN(val) || val === 0) return '0';
  const whole = Math.floor(val);
  const remainder = val - whole;

  if (remainder < 0.03) return `${whole}`;

  const fractions = [
    { dec: 0.125, str: '⅛' },
    { dec: 0.25, str: '¼' },
    { dec: 0.333, str: '⅓' },
    { dec: 0.375, str: '⅜' },
    { dec: 0.5, str: '½' },
    { dec: 0.625, str: '⅝' },
    { dec: 0.666, str: '⅔' },
    { dec: 0.75, str: '¾' },
    { dec: 0.875, str: '⅞' }
  ];

  let closest = fractions[0];
  let minDiff = Math.abs(remainder - fractions[0].dec);

  for (let i = 1; i < fractions.length; i++) {
    const diff = Math.abs(remainder - fractions[i].dec);
    if (diff < minDiff) {
      minDiff = diff;
      closest = fractions[i];
    }
  }

  if (minDiff < 0.06) {
    return whole > 0 ? `${whole} ${closest.str}` : closest.str;
  }
  return formatDecimal(val);
}

function formatDecimal(val) {
  if (typeof val !== 'number' || isNaN(val)) return '-';
  if (Number.isInteger(val)) return val.toString();
  return (Math.round(val * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
}

window.toggleFractionDisplay = function() {
  playClickSfx();
  showFractions = !showFractions;
  localStorage.setItem(STORAGE_KEY_FRACTION, showFractions ? 'true' : 'false');
  const btn = document.getElementById('fractionToggleBtn');
  if (btn) {
    btn.textContent = showFractions ? '🔢 Toggle Decimals' : '½ Toggle Fractions';
  }
  // Re-render results table if visible
  const saved = localStorage.getItem(STORAGE_KEY_RESULTS);
  if (saved) {
    try {
      renderResultsUI(JSON.parse(saved));
    } catch (e) {}
  }
};

// =========================================================================
// 6. CORE SCALING LOGIC & FORMULA
// =========================================================================
function validateServings(sMakesStr, sWantedStr) {
  if (!sMakesStr || sMakesStr.trim() === '') {
    return { valid: false, message: 'Please enter "Servings Recipe Makes". It cannot be empty.' };
  }
  if (!sWantedStr || sWantedStr.trim() === '') {
    return { valid: false, message: 'Please enter "Servings Wanted". It cannot be empty.' };
  }

  const sMakes = parseFloat(sMakesStr);
  const sWanted = parseFloat(sWantedStr);

  if (isNaN(sMakes) || sMakes <= 0) {
    return {
      valid: false,
      message: 'Invalid "Servings Recipe Makes". It must be a positive number greater than 0.'
    };
  }

  if (isNaN(sWanted) || sWanted <= 0) {
    return {
      valid: false,
      message: 'Invalid "Servings Wanted". It must be a positive number greater than 0.'
    };
  }

  return { valid: true, sMakes, sWanted };
}

function showError(msg) {
  playErrorThud();
  if (errorMessage) errorMessage.textContent = msg;
  if (errorAlert) {
    errorAlert.style.display = 'flex';
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  if (resultsSection) resultsSection.style.display = 'none';
  localStorage.removeItem(STORAGE_KEY_RESULTS);
}

function hideError() {
  if (errorAlert) errorAlert.style.display = 'none';
  if (servingsOriginalInput) servingsOriginalInput.classList.remove('has-error');
  if (servingsWantedInput) servingsWantedInput.classList.remove('has-error');
}

window.handleScaleRecipe = function() {
  const makesVal = servingsOriginalInput.value;
  const wantedVal = servingsWantedInput.value;

  const validation = validateServings(makesVal, wantedVal);
  if (!validation.valid) {
    if (!makesVal || parseFloat(makesVal) <= 0) {
      servingsOriginalInput.classList.add('has-error');
    }
    if (!wantedVal || parseFloat(wantedVal) <= 0) {
      servingsWantedInput.classList.add('has-error');
    }
    showError(validation.message);
    return;
  }

  hideError();

  const { sMakes, sWanted } = validation;
  const multiplier = sWanted / sMakes;

  const ingredients = [
    {
      index: 1,
      name: ing1Name.value.trim() || 'Ingredient 1',
      originalAmount: parseFloat(ing1Amount.value),
      unit: ing1Unit.value.trim()
    },
    {
      index: 2,
      name: ing2Name.value.trim() || 'Ingredient 2',
      originalAmount: parseFloat(ing2Amount.value),
      unit: ing2Unit.value.trim()
    },
    {
      index: 3,
      name: ing3Name.value.trim() || 'Ingredient 3',
      originalAmount: parseFloat(ing3Amount.value),
      unit: ing3Unit.value.trim()
    }
  ];

  const processed = ingredients.map(ing => {
    let scaledAmount = null;
    if (!isNaN(ing.originalAmount) && ing.originalAmount >= 0) {
      // Formula: (Original Amount * Servings Wanted) / Servings Recipe Makes
      scaledAmount = (ing.originalAmount * sWanted) / sMakes;
    }
    return {
      ...ing,
      scaledAmount
    };
  });

  const dishTitle = dishNameInput.value.trim() || 'Untitled Recipe';
  const calculationData = {
    dishName: dishTitle,
    servingsOriginal: sMakes,
    servingsWanted: sWanted,
    multiplier: multiplier,
    notes: recipeNotesInput ? recipeNotesInput.value.trim() : '',
    calculatedAt: new Date().toISOString(),
    items: processed
  };

  saveInputState();
  localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(calculationData));

  renderResultsUI(calculationData);
  playSuccessChime();

  if (resultsSection) {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

function renderResultsUI(data) {
  if (!resultsSection) return;
  resultsSection.style.display = 'block';

  if (resultDishTitle) resultDishTitle.textContent = data.dishName || 'Recipe';
  if (resultServingsSummary) {
    resultServingsSummary.textContent = `Scaling from ${data.servingsOriginal} portion${data.servingsOriginal === 1 ? '' : 's'} to ${data.servingsWanted} portion${data.servingsWanted === 1 ? '' : 's'}`;
  }
  if (resultMultiplierVal) {
    resultMultiplierVal.textContent = `${formatDecimal(data.multiplier)}x`;
  }

  // Render Table Rows
  if (resultsTableBody) {
    resultsTableBody.innerHTML = '';
    data.items.forEach(item => {
      const tr = document.createElement('tr');

      const origText = isNaN(item.originalAmount) 
        ? '<span style="color: var(--text-muted);">&mdash;</span>' 
        : `${formatDecimal(item.originalAmount)} ${escapeHtml(item.unit)}`;

      let scaledText = '<span style="color: var(--text-muted);">&mdash;</span>';
      if (item.scaledAmount !== null && !isNaN(item.scaledAmount)) {
        if (showFractions) {
          scaledText = `<span class="scaled-cell-highlight">${toFractionString(item.scaledAmount)}</span> ${escapeHtml(item.unit)}`;
        } else {
          const fracHint = toFractionString(item.scaledAmount);
          const hasDifferentFrac = fracHint !== formatDecimal(item.scaledAmount);
          scaledText = `
            <span class="scaled-cell-highlight">${formatDecimal(item.scaledAmount)}</span> ${escapeHtml(item.unit)}
            ${hasDifferentFrac ? `<span class="fraction-hint">(&approx; ${fracHint})</span>` : ''}
          `;
        }
      }

      let percentBadge = '<span class="badge-percent same">1&times;</span>';
      if (data.multiplier > 1) {
        const pctIncrease = Math.round((data.multiplier - 1) * 100);
        percentBadge = `<span class="badge-percent up">+${pctIncrease}% &uarr;</span>`;
      } else if (data.multiplier < 1) {
        const pctDecrease = Math.round((1 - data.multiplier) * 100);
        percentBadge = `<span class="badge-percent down">-${pctDecrease}% &darr;</span>`;
      }

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--text-muted);">${item.index}</td>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${origText}</td>
        <td>${scaledText}</td>
        <td>${percentBadge}</td>
      `;
      resultsTableBody.appendChild(tr);
    });
  }

  // Render Interactive Checklist
  if (checklistItemsList) {
    checklistItemsList.innerHTML = '';
    data.items.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'check-item-row';
      const amtStr = item.scaledAmount !== null 
        ? `${showFractions ? toFractionString(item.scaledAmount) : formatDecimal(item.scaledAmount)} ${escapeHtml(item.unit)}`
        : '';

      div.innerHTML = `
        <input type="checkbox" id="chk_${idx}" onchange="this.parentElement.classList.toggle('checked', this.checked)">
        <label for="chk_${idx}" style="cursor: pointer; flex: 1;">
          <strong>${amtStr}</strong> ${escapeHtml(item.name)}
        </label>
      `;
      checklistItemsList.appendChild(div);
    });
  }

  // Populate dedicated physical kitchen print card
  populateKitchenPrintCard(data);
}

function populateKitchenPrintCard(data) {
  const titleEl = document.getElementById('printDishTitle');
  const origEl = document.getElementById('printServingsOrig');
  const wantedEl = document.getElementById('printServingsWanted');
  const multEl = document.getElementById('printMultiplierVal');
  const dateEl = document.getElementById('printDate');
  const bodyEl = document.getElementById('printIngredientsBody');
  const notesEl = document.getElementById('printNotesContent');

  if (titleEl) titleEl.textContent = data.dishName || 'Custom Recipe';
  if (origEl) origEl.textContent = `${data.servingsOriginal || '-'} Servings`;
  if (wantedEl) wantedEl.textContent = `${data.servingsWanted || '-'} Servings`;
  if (multEl) multEl.textContent = `${formatDecimal(data.multiplier || 1)}x`;
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString();

  if (bodyEl && Array.isArray(data.items)) {
    bodyEl.innerHTML = '';
    data.items.forEach(item => {
      const tr = document.createElement('tr');
      const scaledStr = item.scaledAmount !== null && !isNaN(item.scaledAmount)
        ? `${showFractions ? toFractionString(item.scaledAmount) : formatDecimal(item.scaledAmount)} ${escapeHtml(item.unit)}`
        : '-';
      const origStr = !isNaN(item.originalAmount)
        ? `${formatDecimal(item.originalAmount)} ${escapeHtml(item.unit)}`
        : '-';

      tr.innerHTML = `
        <td style="text-align: center;"><span class="print-checkbox"></span></td>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td style="text-align: right;" class="print-scaled-amt">${scaledStr}</td>
        <td style="text-align: right;" class="print-orig-amt">${origStr}</td>
      `;
      bodyEl.appendChild(tr);
    });
  }

  if (notesEl) {
    notesEl.textContent = data.notes && data.notes.trim() 
      ? data.notes.trim() 
      : 'No additional notes provided. Cook at standard recipe temperature and adjust seasoning to taste.';
  }
}

// =========================================================================
// 7. LOCAL STORAGE PERSISTENCE
// =========================================================================
function getCurrentInputState() {
  return {
    dishName: dishNameInput.value,
    servingsOriginal: servingsOriginalInput.value,
    servingsWanted: servingsWantedInput.value,
    notes: recipeNotesInput ? recipeNotesInput.value : '',
    ingredients: [
      { name: ing1Name.value, amount: ing1Amount.value, unit: ing1Unit.value },
      { name: ing2Name.value, amount: ing2Amount.value, unit: ing2Unit.value },
      { name: ing3Name.value, amount: ing3Amount.value, unit: ing3Unit.value }
    ]
  };
}

function saveInputState() {
  const state = getCurrentInputState();
  localStorage.setItem(STORAGE_KEY_INPUTS, JSON.stringify(state));
}

function loadInputState() {
  const saved = localStorage.getItem(STORAGE_KEY_INPUTS);
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    if (data.dishName !== undefined) dishNameInput.value = data.dishName;
    if (data.servingsOriginal !== undefined) servingsOriginalInput.value = data.servingsOriginal;
    if (data.servingsWanted !== undefined) servingsWantedInput.value = data.servingsWanted;
    if (recipeNotesInput && data.notes !== undefined) recipeNotesInput.value = data.notes;

    if (Array.isArray(data.ingredients)) {
      if (data.ingredients[0]) {
        ing1Name.value = data.ingredients[0].name || '';
        ing1Amount.value = data.ingredients[0].amount || '';
        ing1Unit.value = data.ingredients[0].unit || '';
      }
      if (data.ingredients[1]) {
        ing2Name.value = data.ingredients[1].name || '';
        ing2Amount.value = data.ingredients[1].amount || '';
        ing2Unit.value = data.ingredients[1].unit || '';
      }
      if (data.ingredients[2]) {
        ing3Name.value = data.ingredients[2].name || '';
        ing3Amount.value = data.ingredients[2].amount || '';
        ing3Unit.value = data.ingredients[2].unit || '';
      }
    }
  } catch (e) {
    console.error('Failed to load saved input state:', e);
  }
}

function loadResultState() {
  const saved = localStorage.getItem(STORAGE_KEY_RESULTS);
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    const validation = validateServings(String(data.servingsOriginal), String(data.servingsWanted));
    if (validation.valid) {
      renderResultsUI(data);
    } else {
      localStorage.removeItem(STORAGE_KEY_RESULTS);
    }
  } catch (e) {
    console.error('Failed to restore results:', e);
  }
}

// Auto-save on input
[dishNameInput, servingsOriginalInput, servingsWantedInput, ing1Name, ing1Amount, ing1Unit, ing2Name, ing2Amount, ing2Unit, ing3Name, ing3Amount, ing3Unit, recipeNotesInput].forEach(el => {
  if (el) {
    el.addEventListener('input', () => {
      hideError();
      saveInputState();
    });
  }
});

// Quick Multipliers
window.applyMultiplier = function(m) {
  playClickSfx();
  const makesVal = parseFloat(servingsOriginalInput.value);
  if (!isNaN(makesVal) && makesVal > 0) {
    const calculated = makesVal * m;
    servingsWantedInput.value = formatDecimal(calculated);
    hideError();
    saveInputState();
    window.handleScaleRecipe();
  } else {
    servingsOriginalInput.focus();
    showError('Please enter "Servings Recipe Makes" first to apply a quick multiplier.');
  }
};

// Presets
function loadPreset(name, makes, wanted, ings, notes = '') {
  playClickSfx();
  dishNameInput.value = name;
  servingsOriginalInput.value = makes;
  servingsWantedInput.value = wanted;
  if (recipeNotesInput) recipeNotesInput.value = notes;

  ing1Name.value = ings[0].name;
  ing1Amount.value = ings[0].amount;
  ing1Unit.value = ings[0].unit;

  ing2Name.value = ings[1].name;
  ing2Amount.value = ings[1].amount;
  ing2Unit.value = ings[1].unit;

  ing3Name.value = ings[2].name;
  ing3Amount.value = ings[2].amount;
  ing3Unit.value = ings[2].unit;

  hideError();
  saveInputState();
  window.handleScaleRecipe();
}

document.getElementById('presetPancakes')?.addEventListener('click', () => {
  loadPreset('Fluffy Buttermilk Pancakes', 4, 8, [
    { name: 'All-Purpose Flour', amount: 2, unit: 'cups' },
    { name: 'Granulated Sugar', amount: 2, unit: 'tbsp' },
    { name: 'Whole Milk / Buttermilk', amount: 1.5, unit: 'cups' }
  ], 'Cook on medium-low griddle (325°F) until bubbles form on top, about 2-3 minutes per side.');
});

document.getElementById('presetCookies')?.addEventListener('click', () => {
  loadPreset('Chocolate Chip Cookies', 12, 24, [
    { name: 'All-Purpose Flour', amount: 2.25, unit: 'cups' },
    { name: 'Unsalted Butter (softened)', amount: 1, unit: 'cup' },
    { name: 'Semisweet Chocolate Chips', amount: 2, unit: 'cups' }
  ], 'Bake at 375°F (190°C) for 9 to 11 minutes or until golden brown.');
});

document.getElementById('presetPasta')?.addEventListener('click', () => {
  loadPreset('Basil Pesto Pasta', 2, 6, [
    { name: 'Dry Penne Pasta', amount: 250, unit: 'grams' },
    { name: 'Fresh Basil Pesto', amount: 0.5, unit: 'cup' },
    { name: 'Grated Parmesan Cheese', amount: 50, unit: 'grams' }
  ], 'Boil pasta in salted water for 9-10 mins (al dente). Toss with warm pesto and reserved pasta water.');
});

window.clearForm = function() {
  playClickSfx();
  dishNameInput.value = '';
  servingsOriginalInput.value = '';
  servingsWantedInput.value = '';
  if (recipeNotesInput) recipeNotesInput.value = '';

  ing1Name.value = ''; ing1Amount.value = ''; ing1Unit.value = '';
  ing2Name.value = ''; ing2Amount.value = ''; ing2Unit.value = '';
  ing3Name.value = ''; ing3Amount.value = ''; ing3Unit.value = '';

  hideError();
  if (resultsSection) resultsSection.style.display = 'none';
  localStorage.removeItem(STORAGE_KEY_INPUTS);
  localStorage.removeItem(STORAGE_KEY_RESULTS);
};

document.getElementById('resetBtn')?.addEventListener('click', window.clearForm);

// =========================================================================
// 8. CLIPBOARD & PRINT
// =========================================================================
window.copyRecipeToClipboard = function() {
  playClickSfx();
  const raw = localStorage.getItem(STORAGE_KEY_RESULTS);
  if (!raw) return;
  const data = JSON.parse(raw);

  let text = `🍳 ${data.dishName} (Scaled Recipe)\n`;
  text += `Portions: ${data.servingsOriginal} → ${data.servingsWanted} (${formatDecimal(data.multiplier)}x multiplier)\n\n`;
  text += `Scaled Ingredients:\n`;

  data.items.forEach(i => {
    const amt = i.scaledAmount !== null ? `${formatDecimal(i.scaledAmount)} ${i.unit}` : '-';
    text += `• ${amt} ${i.name}\n`;
  });

  if (data.notes) {
    text += `\nMethod & Chef Notes:\n${data.notes}\n`;
  }

  navigator.clipboard.writeText(text).then(() => {
    if (copyToast) {
      copyToast.style.display = 'block';
      setTimeout(() => {
        copyToast.style.display = 'none';
      }, 2500);
    }
  }).catch(e => {
    alert('Failed to copy to clipboard.');
  });
};

// =========================================================================
// 8B. FORMATTED PDF EXPORT FOR PHYSICAL KITCHEN PRINTING
// =========================================================================
window.exportRecipePDF = function(recipeData = null) {
  playClickSfx();
  let data = recipeData;
  if (!data) {
    const raw = localStorage.getItem(STORAGE_KEY_RESULTS);
    if (!raw) {
      alert('Please calculate a scaled recipe first before exporting to PDF.');
      return;
    }
    data = JSON.parse(raw);
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentWidth = pageWidth - (margin * 2);
    let y = 18;

    // 1. Chef Header Accent Stripe
    doc.setFillColor(234, 88, 12); // #ea580c warm culinary amber
    doc.rect(margin, y, 4, 18, 'F');

    // Recipe Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    const dishTitle = data.dishName || 'Custom Recipe';
    doc.text(dishTitle, margin + 7, y + 7);

    // Card Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('SCALED KITCHEN RECIPE CARD • RECIPE SCALER STUDIO', margin + 7, y + 14);

    y += 24;

    // 2. Metadata Metrics Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 18, 2.5, 2.5, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('ORIGINAL YIELD', margin + 6, y + 6);
    doc.text('SCALED YIELD', margin + 52, y + 6);
    doc.text('MULTIPLIER', margin + 100, y + 6);
    doc.text('EXPORT DATE', margin + 142, y + 6);

    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${data.servingsOriginal || '-'} Servings`, margin + 6, y + 13);
    doc.text(`${data.servingsWanted || '-'} Servings`, margin + 52, y + 13);
    doc.setTextColor(234, 88, 12);
    doc.text(`${formatDecimal(data.multiplier || 1)}x`, margin + 100, y + 13);
    doc.setTextColor(15, 23, 42);
    doc.text(new Date().toLocaleDateString(), margin + 142, y + 13);

    y += 25;

    // 3. Section: Scaled Ingredients & Prep Checklist
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Scaled Ingredients & Prep Checklist', margin, y);

    y += 3.5;
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + 42, y);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin + 42, y, margin + contentWidth, y);

    y += 5.5;

    // Table Header Row
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('PREP', margin + 3.5, y + 4.8);
    doc.text('INGREDIENT', margin + 22, y + 4.8);
    doc.text('SCALED AMOUNT', margin + 100, y + 4.8);
    doc.text('ORIGINAL (1x)', margin + 145, y + 4.8);

    y += 8.5;

    const items = data.items || (Array.isArray(data.ingredients) ? data.ingredients.map((ing, i) => ({
      index: i + 1,
      name: ing.name,
      originalAmount: parseFloat(ing.amount),
      scaledAmount: parseFloat(ing.amount) * (data.multiplier || 1),
      unit: ing.unit
    })) : []);

    items.forEach(item => {
      // Checkbox square for measuring in kitchen
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      doc.rect(margin + 5, y - 3.2, 3.8, 3.8);

      // Ingredient Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item.name || `Ingredient ${item.index}`, margin + 22, y);

      // Scaled Quantity
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(234, 88, 12);
      const scaledStr = item.scaledAmount !== null && !isNaN(item.scaledAmount)
        ? `${showFractions ? toFractionString(item.scaledAmount) : formatDecimal(item.scaledAmount)} ${item.unit || ''}`.trim()
        : '-';
      doc.text(scaledStr, margin + 100, y);

      // Original Quantity
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const origStr = !isNaN(item.originalAmount)
        ? `${formatDecimal(item.originalAmount)} ${item.unit || ''}`.trim()
        : '-';
      doc.text(origStr, margin + 145, y);

      y += 3.5;
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(margin, y, margin + contentWidth, y);
      y += 4.5;
    });

    y += 4;

    // 4. Chef Method & Cooking Notes Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Chef Method & Cooking Instructions', margin, y);

    y += 3.5;
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + 40, y);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin + 40, y, margin + contentWidth, y);

    y += 5.5;

    const notesText = data.notes && data.notes.trim()
      ? data.notes.trim()
      : 'No special method notes provided. Cook at standard recipe temperature, taste and adjust salt and aromatics gradually.';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const splitNotes = doc.splitTextToSize(notesText, contentWidth - 8);

    const notesHeight = Math.max(22, (splitNotes.length * 4.8) + 7);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, notesHeight, 2, 2, 'FD');
    doc.text(splitNotes, margin + 4, y + 5.5);

    y += notesHeight + 8;

    // 5. Kitchen Quick Reference Strip
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(254, 215, 170);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(194, 65, 12);
    doc.text('KITCHEN QUICK CHEAT-SHEET:', margin + 4, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(154, 52, 18);
    doc.text('• 1 Cup = 16 Tbsp = 240 ml   • 1 Tbsp = 3 Tsp   • 1 Fl Oz = ~30 ml   • 350°F = 175°C   • 375°F = 190°C', margin + 4, y + 9.5);

    // 6. Document Footer
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Printed from Recipe Scaler Studio — Professional Culinary Portion Calculator', margin, 287);
    doc.text('Page 1 of 1', pageWidth - margin - 15, 287);

    const cleanName = (data.dishName || 'recipe')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    doc.save(`${cleanName}_scaled_recipe.pdf`);
    playSuccessChime();

    if (copyToast) {
      copyToast.textContent = 'PDF downloaded successfully!';
      copyToast.style.display = 'block';
      setTimeout(() => {
        copyToast.style.display = 'none';
        copyToast.textContent = 'Copied to clipboard!';
      }, 2500);
    }
  } catch (err) {
    console.error('PDF export error:', err);
    alert('Could not generate PDF: ' + err.message);
  }
};

window.exportSavedCookbookRecipe = function(id) {
  playClickSfx();
  const book = getCookbook();
  const recipe = book.find(r => r.id === id);
  if (!recipe) return;
  const multiplier = (parseFloat(recipe.servingsWanted) && parseFloat(recipe.servingsOriginal))
    ? (parseFloat(recipe.servingsWanted) / parseFloat(recipe.servingsOriginal))
    : 1;

  const exportPayload = {
    dishName: recipe.dishName,
    servingsOriginal: recipe.servingsOriginal,
    servingsWanted: recipe.servingsWanted,
    multiplier: multiplier,
    notes: recipe.notes,
    items: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ing, i) => ({
      index: i + 1,
      name: ing.name,
      originalAmount: parseFloat(ing.amount),
      scaledAmount: parseFloat(ing.amount) * multiplier,
      unit: ing.unit
    })) : []
  };

  window.exportRecipePDF(exportPayload);
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =========================================================================
// 9. UNIT & TEMPERATURE CONVERTERS
// =========================================================================
const UNIT_TO_ML = {
  cup: 236.588,
  tbsp: 14.7868,
  tsp: 4.92892,
  floz: 29.5735,
  ml: 1,
  g: 1,      // 1:1 culinary water density heuristic
  oz: 28.3495,
  lb: 453.592
};

// --- RECENT CONVERSIONS TRACKER (LAST 5 ITEMS) ---
let recentConversions = [];
let convTrackTimer = null;

function loadRecentConversions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENT_CONV);
    recentConversions = raw ? JSON.parse(raw) : [];
  } catch (e) {
    recentConversions = [];
  }
  renderRecentConversions();
}

function saveRecentConversions() {
  localStorage.setItem(STORAGE_KEY_RECENT_CONV, JSON.stringify(recentConversions));
  renderRecentConversions();
}

function recordConversion(record) {
  clearTimeout(convTrackTimer);
  convTrackTimer = setTimeout(() => {
    if (recentConversions.length > 0) {
      const top = recentConversions[0];
      if (top.fromStr === record.fromStr && top.toStr === record.toStr) {
        return; // Avoid immediate duplicate
      }
    }
    recentConversions.unshift({
      id: Date.now(),
      ...record,
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (recentConversions.length > 5) {
      recentConversions = recentConversions.slice(0, 5);
    }
    saveRecentConversions();
  }, 450);
}

function renderRecentConversions() {
  const container = document.getElementById('recentConversionsList');
  if (!container) return;

  if (recentConversions.length === 0) {
    container.innerHTML = `
      <div class="recent-conv-empty">
        <div style="font-size: 1.6rem; margin-bottom: 0.35rem;">🥄</div>
        <p style="font-weight: 700;">No recent conversions yet.</p>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
          Convert any volume, weight, or oven heat to track the last 5 conversions here.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  recentConversions.forEach(item => {
    const div = document.createElement('div');
    div.className = 'recent-conv-item';
    div.title = 'Click to re-apply this conversion';
    div.onclick = () => window.reapplyConversion(item.id);

    const isVolume = item.type === 'volume';
    const badgeClass = isVolume ? 'volume' : 'temp';
    const badgeLabel = isVolume ? 'Volume / Weight' : 'Oven Temp';

    div.innerHTML = `
      <div class="recent-conv-info">
        <div class="recent-conv-text">
          <span>${escapeHtml(item.fromStr)}</span>
          <span class="recent-conv-arrow">&rarr;</span>
          <span style="color: var(--primary);">${escapeHtml(item.toStr)}</span>
        </div>
        <div class="recent-conv-meta">
          <span class="recent-type-badge ${badgeClass}">${badgeLabel}</span>
          <span>&bull; ${item.timeStr || ''}</span>
        </div>
      </div>
      <button type="button" class="btn-tool" style="padding: 0.2rem 0.55rem; font-size: 0.75rem;" onclick="event.stopPropagation(); window.reapplyConversion(${item.id})">
        Apply
      </button>
    `;
    container.appendChild(div);
  });
}

window.reapplyConversion = function(id) {
  playClickSfx();
  const item = recentConversions.find(c => c.id === id);
  if (!item) return;

  if (item.type === 'volume') {
    const fromInput = document.getElementById('convFromVal');
    const fromSelect = document.getElementById('convFromUnit');
    const toSelect = document.getElementById('convToUnit');
    if (fromInput) fromInput.value = item.fromVal;
    if (fromSelect) fromSelect.value = item.fromUnit;
    if (toSelect) toSelect.value = item.toUnit;
    window.runUnitConversion(false);
  } else if (item.type === 'temp_f') {
    const fInput = document.getElementById('tempF');
    if (fInput) {
      fInput.value = item.tempF;
      window.convertTempFromF(false);
    }
  } else if (item.type === 'temp_c') {
    const cInput = document.getElementById('tempC');
    if (cInput) {
      cInput.value = item.tempC;
      window.convertTempFromC(false);
    }
  }

  if (copyToast) {
    copyToast.textContent = `Applied: ${item.fromStr} → ${item.toStr}`;
    copyToast.style.display = 'block';
    setTimeout(() => {
      copyToast.style.display = 'none';
      copyToast.textContent = 'Copied to clipboard!';
    }, 2000);
  }
};

window.clearRecentConversions = function() {
  playClickSfx();
  if (confirm('Clear the last 5 recent conversions?')) {
    recentConversions = [];
    localStorage.removeItem(STORAGE_KEY_RECENT_CONV);
    renderRecentConversions();
  }
};

window.runUnitConversion = function(track = true) {
  const fromVal = parseFloat(document.getElementById('convFromVal')?.value);
  const fromUnit = document.getElementById('convFromUnit')?.value;
  const toUnit = document.getElementById('convToUnit')?.value;
  const toInput = document.getElementById('convToVal');

  if (!toInput || isNaN(fromVal)) return;

  const baseMl = fromVal * (UNIT_TO_ML[fromUnit] || 1);
  const targetVal = baseMl / (UNIT_TO_ML[toUnit] || 1);
  const formattedTarget = formatDecimal(targetVal);

  toInput.value = formattedTarget;

  if (track && fromVal > 0) {
    recordConversion({
      type: 'volume',
      fromVal: fromVal,
      fromUnit: fromUnit,
      toVal: targetVal,
      toUnit: toUnit,
      fromStr: `${fromVal} ${fromUnit}`,
      toStr: `${formattedTarget} ${toUnit}`
    });
  }
};

window.convertTempFromF = function(track = true) {
  const f = parseFloat(document.getElementById('tempF')?.value);
  const cInput = document.getElementById('tempC');
  if (isNaN(f) || !cInput) return;
  const c = Math.round((f - 32) * (5 / 9));
  cInput.value = c;

  if (track) {
    recordConversion({
      type: 'temp_f',
      tempF: f,
      tempC: c,
      fromStr: `${f}°F`,
      toStr: `${c}°C`
    });
  }
};

window.convertTempFromC = function(track = true) {
  const c = parseFloat(document.getElementById('tempC')?.value);
  const fInput = document.getElementById('tempF');
  if (isNaN(c) || !fInput) return;
  const f = Math.round(c * (9 / 5) + 32);
  fInput.value = f;

  if (track) {
    recordConversion({
      type: 'temp_c',
      tempF: f,
      tempC: c,
      fromStr: `${c}°C`,
      toStr: `${f}°F`
    });
  }
};

// =========================================================================
// 10. CAKE PAN SCALER
// =========================================================================
function getPanArea(shape, dimA, dimB) {
  if (shape === 'round') {
    const radius = dimA / 2;
    return Math.PI * radius * radius;
  } else if (shape === 'square') {
    return dimA * dimA;
  } else if (shape === 'rectangle') {
    return dimA * dimB;
  }
  return 1;
}

window.calculatePanScale = function() {
  const shape1 = document.getElementById('pan1Shape')?.value || 'round';
  const shape2 = document.getElementById('pan2Shape')?.value || 'square';

  const dim1Wrap = document.getElementById('pan1DimBWrap');
  const dim2Wrap = document.getElementById('pan2DimBWrap');

  if (dim1Wrap) dim1Wrap.style.display = shape1 === 'rectangle' ? 'block' : 'none';
  if (dim2Wrap) dim2Wrap.style.display = shape2 === 'rectangle' ? 'block' : 'none';

  const dim1A = parseFloat(document.getElementById('pan1DimA')?.value) || 8;
  const dim1B = parseFloat(document.getElementById('pan1DimB')?.value) || 8;

  const dim2A = parseFloat(document.getElementById('pan2DimA')?.value) || 8;
  const dim2B = parseFloat(document.getElementById('pan2DimB')?.value) || 8;

  const area1 = getPanArea(shape1, dim1A, dim1B);
  const area2 = getPanArea(shape2, dim2A, dim2B);

  const ratio = area1 > 0 ? area2 / area1 : 1;
  const ratioText = document.getElementById('panScaleRatioText');
  const explainer = document.getElementById('panScaleExplainer');

  if (ratioText) ratioText.textContent = `${formatDecimal(ratio)}x`;
  if (explainer) {
    explainer.textContent = `Multiply all cake batter ingredients by ${formatDecimal(ratio)}`;
  }
};

// =========================================================================
// 11. INGREDIENT SUBSTITUTIONS GUIDE
// =========================================================================
const SUBSTITUTIONS_DATA = [
  {
    ingredient: "Buttermilk (1 Cup)",
    replacement: "1 Cup Milk + 1 Tbsp Lemon Juice or White Vinegar",
    notes: "Stir and let sit for 5 minutes until curdled."
  },
  {
    ingredient: "Whole Egg (1 Egg in Baking)",
    replacement: "1/4 Cup Applesauce OR 1/2 Mashed Banana OR 1 Tbsp Chia Seeds + 3 Tbsp Water",
    notes: "Applesauce works best for quick breads; chia for hearty cookies."
  },
  {
    ingredient: "Heavy Cream (1 Cup)",
    replacement: "3/4 Cup Milk + 1/4 Cup Melted Butter",
    notes: "Whisk well. Best for cooking and baking (will not whip stiff)."
  },
  {
    ingredient: "Cornstarch (1 Tbsp for thickening)",
    replacement: "2 Tbsp All-Purpose Flour OR 1 Tbsp Tapioca Starch",
    notes: "Flour requires extra simmering to remove raw starch taste."
  },
  {
    ingredient: "Baking Powder (1 Tsp)",
    replacement: "1/4 Tsp Baking Soda + 1/2 Tsp Cream of Tartar",
    notes: "Creates immediate chemical aeration."
  },
  {
    ingredient: "Brown Sugar (1 Cup packed)",
    replacement: "1 Cup White Granulated Sugar + 1 Tbsp Molasses (or Maple Syrup)",
    notes: "Mix thoroughly until evenly moist and fragrant."
  },
  {
    ingredient: "Sour Cream (1 Cup)",
    replacement: "1 Cup Plain Greek Yogurt (Full-Fat)",
    notes: "Nearly identical moisture, acidity, and protein balance."
  },
  {
    ingredient: "Honey (1 Cup)",
    replacement: "1 1/4 Cups White Sugar + 1/4 Cup Water (or Maple Syrup 1:1)",
    notes: "Reduce other liquids in recipe by 2-3 tablespoons."
  },
  {
    ingredient: "Tomato Paste (1 Tbsp)",
    replacement: "3 Tbsp Tomato Puree or Sauce",
    notes: "Simmer down briefly to reduce excess moisture."
  }
];

function renderSubstitutions(items) {
  const container = document.getElementById('subsListContainer');
  if (!container) return;

  container.innerHTML = '';
  items.forEach(sub => {
    const card = document.createElement('div');
    card.className = 'sub-item-card';
    card.innerHTML = `
      <div class="sub-item-target">
        <span>${escapeHtml(sub.ingredient)}</span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">Swap</span>
      </div>
      <div class="sub-item-replacement">&rarr; ${escapeHtml(sub.replacement)}</div>
      <div class="sub-item-notes">${escapeHtml(sub.notes)}</div>
    `;
    container.appendChild(card);
  });
}

window.filterSubstitutions = function() {
  const query = (document.getElementById('subsSearchInput')?.value || '').toLowerCase().trim();
  const filtered = SUBSTITUTIONS_DATA.filter(item => 
    item.ingredient.toLowerCase().includes(query) ||
    item.replacement.toLowerCase().includes(query) ||
    item.notes.toLowerCase().includes(query)
  );
  renderSubstitutions(filtered);
};

// =========================================================================
// 12. COOKBOOK (LOCAL RECIPE STORAGE)
// =========================================================================
function getCookbook() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COOKBOOK);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

window.saveRecipeToCookbook = function() {
  playClickSfx();
  const currentState = getCurrentInputState();
  if (!currentState.dishName && !currentState.servingsOriginal) {
    alert('Please enter at least a dish name or portion servings before saving.');
    return;
  }

  const book = getCookbook();
  const newEntry = {
    id: Date.now(),
    dishName: currentState.dishName || 'Untitled Recipe',
    servingsOriginal: currentState.servingsOriginal,
    servingsWanted: currentState.servingsWanted,
    ingredients: currentState.ingredients,
    notes: currentState.notes,
    savedAt: new Date().toLocaleDateString()
  };

  book.unshift(newEntry);
  localStorage.setItem(STORAGE_KEY_COOKBOOK, JSON.stringify(book));
  updateSavedCount();
  playSuccessChime();
  alert(`Saved "${newEntry.dishName}" to your Recipe Book!`);
};

function updateSavedCount() {
  const count = getCookbook().length;
  if (savedCount) savedCount.textContent = count;
}

function renderCookbook() {
  const container = document.getElementById('savedRecipesGrid');
  if (!container) return;

  const book = getCookbook();
  if (book.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 2.5rem; color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📖</div>
        <p>Your recipe book is currently empty. Scale a recipe and click <strong>"Save to Book"</strong> to store it here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  book.forEach(item => {
    const card = document.createElement('div');
    card.className = 'saved-card';
    
    let ingPreview = '';
    if (Array.isArray(item.ingredients)) {
      ingPreview = item.ingredients
        .filter(i => i.name)
        .map(i => `${escapeHtml(i.name)} (${i.amount} ${escapeHtml(i.unit)})`)
        .join(', ');
    }

    card.innerHTML = `
      <div>
        <h4>${escapeHtml(item.dishName)}</h4>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
          <span>Servings: ${item.servingsOriginal || '-'} &rarr; ${item.servingsWanted || '-'}</span>
          <span> &bull; Saved: ${item.savedAt}</span>
        </div>
        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.5rem;">
          <strong>Items:</strong> ${ingPreview || 'No ingredients listed'}
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
        <button type="button" class="btn-tool" style="flex: 2;" onclick="loadCookbookRecipe(${item.id})">
          📂 Load
        </button>
        <button type="button" class="btn-tool" style="flex: 1; color: var(--primary);" title="Export saved recipe as PDF" onclick="exportSavedCookbookRecipe(${item.id})">
          📄 PDF
        </button>
        <button type="button" class="btn-tool" style="color: var(--error-text);" title="Delete saved recipe" onclick="deleteCookbookRecipe(${item.id})">
          ✕
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

window.loadCookbookRecipe = function(id) {
  playClickSfx();
  const book = getCookbook();
  const recipe = book.find(r => r.id === id);
  if (!recipe) return;

  dishNameInput.value = recipe.dishName || '';
  servingsOriginalInput.value = recipe.servingsOriginal || '';
  servingsWantedInput.value = recipe.servingsWanted || '';
  if (recipeNotesInput) recipeNotesInput.value = recipe.notes || '';

  if (Array.isArray(recipe.ingredients)) {
    if (recipe.ingredients[0]) {
      ing1Name.value = recipe.ingredients[0].name || '';
      ing1Amount.value = recipe.ingredients[0].amount || '';
      ing1Unit.value = recipe.ingredients[0].unit || '';
    }
    if (recipe.ingredients[1]) {
      ing2Name.value = recipe.ingredients[1].name || '';
      ing2Amount.value = recipe.ingredients[1].amount || '';
      ing2Unit.value = recipe.ingredients[1].unit || '';
    }
    if (recipe.ingredients[2]) {
      ing3Name.value = recipe.ingredients[2].name || '';
      ing3Amount.value = recipe.ingredients[2].amount || '';
      ing3Unit.value = recipe.ingredients[2].unit || '';
    }
  }

  saveInputState();
  window.switchSuiteTab('scalerTab');
  window.handleScaleRecipe();
};

window.deleteCookbookRecipe = function(id) {
  playClickSfx();
  let book = getCookbook();
  book = book.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY_COOKBOOK, JSON.stringify(book));
  updateSavedCount();
  renderCookbook();
};

window.clearAllCookbook = function() {
  playClickSfx();
  if (confirm('Clear all saved recipes from your recipe book?')) {
    localStorage.removeItem(STORAGE_KEY_COOKBOOK);
    updateSavedCount();
    renderCookbook();
  }
};

// =========================================================================
// 13. CHEF AI ASSISTANT (GEMINI BACKEND INTEGRATION)
// =========================================================================
const aiChatInput = document.getElementById('aiChatInput');
const aiChatMessages = document.getElementById('aiChatMessages');
const aiSendBtn = document.getElementById('aiSendBtn');

function formatMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^\s*[-•]\s+(.*)$/gm, '<li style="margin-left: 1.25rem;">$1</li>');
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

window.askChefQuick = function(topic) {
  playClickSfx();
  window.switchSuiteTab('aiTab');
  
  const currentDish = dishNameInput ? dishNameInput.value.trim() : '';
  const sOriginal = servingsOriginalInput ? servingsOriginalInput.value.trim() : '';
  const sWanted = servingsWantedInput ? servingsWantedInput.value.trim() : '';

  let prompt = '';
  if (topic === 'scaling') {
    prompt = `I am scaling ${currentDish || 'this recipe'} from ${sOriginal || '?'} to ${sWanted || '?'} servings. How should I adjust the baking or cooking time, pan size, and oven temperature?`;
  } else if (topic === 'subs') {
    prompt = `What are common culinary substitutions for the ingredients in my ${currentDish || 'recipe'}?`;
  } else if (topic === 'steps') {
    prompt = `Please provide concise, professional chef step-by-step cooking and prep instructions for ${currentDish || 'this dish'}.`;
  }

  if (prompt) {
    window.sendAiPrompt(prompt);
  }
};

window.sendAiPrompt = function(promptText) {
  if (aiChatInput) {
    aiChatInput.value = promptText;
    window.handleAiSubmit();
  }
};

window.handleAiSubmit = async function() {
  if (!aiChatInput) return;
  const message = aiChatInput.value.trim();
  if (!message) return;

  playClickSfx();

  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'ai-msg user';
  userMsgDiv.innerHTML = `
    <div class="ai-msg-avatar">👤</div>
    <div class="ai-msg-content">${escapeHtml(message)}</div>
  `;
  aiChatMessages.appendChild(userMsgDiv);
  aiChatInput.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ai-msg bot';
  loadingDiv.id = 'aiTypingMsg';
  loadingDiv.innerHTML = `
    <div class="ai-msg-avatar">👨‍🍳</div>
    <div class="ai-msg-content">
      <div class="ai-typing-indicator">
        <span></span><span></span><span></span>
      </div>
      <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">Chef Gemini is thinking...</span>
    </div>
  `;
  aiChatMessages.appendChild(loadingDiv);
  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

  if (aiSendBtn) aiSendBtn.disabled = true;

  try {
    const rawResults = localStorage.getItem(STORAGE_KEY_RESULTS);
    let recipeContext = null;
    if (rawResults) {
      recipeContext = JSON.parse(rawResults);
    } else {
      recipeContext = getCurrentInputState();
    }

    const res = await fetch('/api/chef-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, recipeContext })
    });

    const data = await res.json();
    loadingDiv.remove();

    const botMsgDiv = document.createElement('div');
    botMsgDiv.className = 'ai-msg bot';

    if (data.error && !data.reply) {
      playErrorThud();
      botMsgDiv.innerHTML = `
        <div class="ai-msg-avatar" style="background: var(--error-bg); color: var(--error-text);">⚠️</div>
        <div class="ai-msg-content" style="border-color: var(--error-border); color: var(--error-text);">
          <strong>Chef AI Note:</strong> ${escapeHtml(data.error)}
        </div>
      `;
    } else {
      playSuccessChime();
      const replyContent = data.reply || data.error;
      const formattedHtml = formatMarkdown(replyContent);
      botMsgDiv.innerHTML = `
        <div class="ai-msg-avatar">👨‍🍳</div>
        <div class="ai-msg-content">
          ${formattedHtml}
          <div style="margin-top: 0.85rem; padding-top: 0.65rem; border-top: 1px dashed var(--glass-border); display: flex; gap: 0.5rem;">
            <button type="button" class="btn-suggest-chip" id="applyNotesBtn">
              📌 Append to Recipe Notes
            </button>
          </div>
        </div>
      `;
      const applyBtn = botMsgDiv.querySelector('#applyNotesBtn');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          window.applyAiToNotes(replyContent);
        });
      }
    }

    aiChatMessages.appendChild(botMsgDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  } catch (err) {
    loadingDiv.remove();
    playErrorThud();
    const errDiv = document.createElement('div');
    errDiv.className = 'ai-msg bot';
    errDiv.innerHTML = `
      <div class="ai-msg-avatar" style="background: var(--error-bg); color: var(--error-text);">⚠️</div>
      <div class="ai-msg-content" style="border-color: var(--error-border); color: var(--error-text);">
        Could not connect to Chef AI.
      </div>
    `;
    aiChatMessages.appendChild(errDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  } finally {
    if (aiSendBtn) aiSendBtn.disabled = false;
  }
};

window.applyAiToNotes = function(text) {
  playClickSfx();
  if (recipeNotesInput) {
    const existing = recipeNotesInput.value.trim();
    recipeNotesInput.value = existing ? `${existing}\n\n[Chef AI Advice]:\n${text}` : `[Chef AI Advice]:\n${text}`;
    saveInputState();
    alert('Appended Chef AI advice to your Recipe Notes!');
  }
};

// =========================================================================
// 14. AI RECIPE PARSER MODAL
// =========================================================================
window.openAiImportModal = function() {
  playClickSfx();
  const modal = document.getElementById('aiImportModal');
  if (modal) modal.classList.add('open');
};

window.closeAiImportModal = function() {
  playClickSfx();
  const modal = document.getElementById('aiImportModal');
  if (modal) modal.classList.remove('open');
};

window.handleAiParseRecipe = async function() {
  const input = document.getElementById('rawRecipeInput');
  const rawText = input ? input.value.trim() : '';
  if (!rawText) {
    alert('Please paste some recipe text first.');
    return;
  }

  playClickSfx();
  const parseBtn = document.getElementById('parseRecipeBtn');
  if (parseBtn) {
    parseBtn.disabled = true;
    parseBtn.textContent = '⏳ Parsing Recipe...';
  }

  try {
    const res = await fetch('/api/parse-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText })
    });
    const data = await res.json();
    if (data.recipe) {
      const rec = data.recipe;
      if (rec.dishName) dishNameInput.value = rec.dishName;
      if (rec.servings) {
        servingsOriginalInput.value = rec.servings;
        servingsWantedInput.value = rec.servings * 2; // Default 2x scale for demonstration
      }
      if (recipeNotesInput && rec.notes) recipeNotesInput.value = rec.notes;

      if (Array.isArray(rec.ingredients)) {
        if (rec.ingredients[0]) {
          ing1Name.value = rec.ingredients[0].name || '';
          ing1Amount.value = rec.ingredients[0].amount || '';
          ing1Unit.value = rec.ingredients[0].unit || '';
        }
        if (rec.ingredients[1]) {
          ing2Name.value = rec.ingredients[1].name || '';
          ing2Amount.value = rec.ingredients[1].amount || '';
          ing2Unit.value = rec.ingredients[1].unit || '';
        }
        if (rec.ingredients[2]) {
          ing3Name.value = rec.ingredients[2].name || '';
          ing3Amount.value = rec.ingredients[2].amount || '';
          ing3Unit.value = rec.ingredients[2].unit || '';
        }
      }

      closeAiImportModal();
      saveInputState();
      window.handleScaleRecipe();
      playSuccessChime();
    } else {
      alert('Could not parse recipe: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Network error while parsing recipe.');
  } finally {
    if (parseBtn) {
      parseBtn.disabled = false;
      parseBtn.textContent = '✨ Extract & Fill Scaler';
    }
  }
};

// =========================================================================
// 15. AI NUTRITION FACTS MODAL
// =========================================================================
window.openNutritionModal = async function() {
  playClickSfx();
  const modal = document.getElementById('nutritionModal');
  if (modal) modal.classList.add('open');

  const nutriCalories = document.getElementById('nutriCalories');
  const nutriProtein = document.getElementById('nutriProtein');
  const nutriCarbs = document.getElementById('nutriCarbs');
  const nutriFat = document.getElementById('nutriFat');
  const nutriFiber = document.getElementById('nutriFiber');
  const nutriSummary = document.getElementById('nutriSummary');

  if (nutriCalories) nutriCalories.textContent = '...';
  if (nutriSummary) nutriSummary.textContent = 'Calculating nutritional facts with AI...';

  try {
    const rawResults = localStorage.getItem(STORAGE_KEY_RESULTS);
    const recipeContext = rawResults ? JSON.parse(rawResults) : getCurrentInputState();

    const res = await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeContext })
    });
    const data = await res.json();
    if (data.nutrition) {
      const n = data.nutrition;
      if (nutriCalories) nutriCalories.textContent = n.calories || '0';
      if (nutriProtein) nutriProtein.textContent = n.protein || '0';
      if (nutriCarbs) nutriCarbs.textContent = n.carbs || '0';
      if (nutriFat) nutriFat.textContent = n.fat || '0';
      if (nutriFiber) nutriFiber.textContent = n.fiber || '0';
      if (nutriSummary) nutriSummary.textContent = n.summary || 'Nutritional estimates completed.';
      playSuccessChime();
    }
  } catch (e) {
    if (nutriSummary) nutriSummary.textContent = 'Could not load nutrition estimates.';
  }
};

window.closeNutritionModal = function() {
  playClickSfx();
  const modal = document.getElementById('nutritionModal');
  if (modal) modal.classList.remove('open');
};

// =========================================================================
// 16. ADVANCED CUSTOM KITCHEN COOKING TIMERS & AUDIO
// =========================================================================
let timerSeconds = 15 * 60;
let timerTotalDuration = 15 * 60;
let timerInterval = null;
let timerRunning = false;
let tickSoundEnabled = localStorage.getItem(STORAGE_KEY_TIMER_TICK) === 'true';

function updateTimerDisplay() {
  const display = document.getElementById('timerDisplay');
  const fill = document.getElementById('timerProgressFill');
  if (display) {
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  if (fill) {
    const pct = timerTotalDuration > 0 ? (timerSeconds / timerTotalDuration) * 100 : 0;
    fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }
}

function playTickSound() {
  if (!soundEnabled || !tickSoundEnabled) return;
  playTone(1100, 'triangle', 0.012, 0.02);
}

function playTimerAlarm() {
  if (!soundEnabled) return;
  // Rich culinary bell chime chord sequence
  const chimes = [
    { freq: 523.25, delay: 0 },    // C5
    { freq: 659.25, delay: 140 },  // E5
    { freq: 783.99, delay: 280 },  // G5
    { freq: 1046.5, delay: 420 },  // C6
    { freq: 1318.5, delay: 600 },  // E6
    { freq: 1046.5, delay: 780 }   // C6
  ];
  chimes.forEach(c => {
    setTimeout(() => playTone(c.freq, 'sine', 0.45, 0.14), c.delay);
  });
}

window.testTimerAlarm = function() {
  playTimerAlarm();
  if (copyToast) {
    copyToast.textContent = '🔔 Playing kitchen timer chime alarm!';
    copyToast.style.display = 'block';
    setTimeout(() => {
      copyToast.style.display = 'none';
      copyToast.textContent = 'Copied to clipboard!';
    }, 2500);
  }
};

window.toggleTimerTick = function(checked) {
  tickSoundEnabled = checked;
  localStorage.setItem(STORAGE_KEY_TIMER_TICK, checked ? 'true' : 'false');
  if (checked) playClickSfx();
};

window.setCustomTimer = function(mins, secs, label) {
  playClickSfx();
  window.resetKitchenTimer();

  const minInput = document.getElementById('customTimerMin');
  const secInput = document.getElementById('customTimerSec');
  const taskInput = document.getElementById('timerTaskName');

  if (minInput) minInput.value = mins;
  if (secInput) secInput.value = secs;
  if (taskInput && label) taskInput.value = label;

  timerSeconds = (mins * 60) + secs;
  timerTotalDuration = timerSeconds;
  updateTimerDisplay();

  const status = document.getElementById('timerStatusLbl');
  if (status) status.textContent = `Set to ${mins}m ${secs ? secs + 's' : ''}`;
};

window.applyCustomTimerInputs = function() {
  playClickSfx();
  window.resetKitchenTimer();

  const minInput = document.getElementById('customTimerMin');
  const secInput = document.getElementById('customTimerSec');

  const mins = Math.max(0, parseInt(minInput?.value) || 0);
  const secs = Math.max(0, Math.min(59, parseInt(secInput?.value) || 0));

  timerSeconds = (mins * 60) + secs;
  if (timerSeconds <= 0) timerSeconds = 60; // minimum 1 min
  timerTotalDuration = timerSeconds;

  updateTimerDisplay();

  const status = document.getElementById('timerStatusLbl');
  if (status) status.textContent = `Set to ${Math.floor(timerSeconds / 60)}m ${timerSeconds % 60}s`;
};

window.addTimerSeconds = function(extraSec) {
  playClickSfx();
  timerSeconds += extraSec;
  timerTotalDuration += extraSec;
  updateTimerDisplay();
  const status = document.getElementById('timerStatusLbl');
  if (status) status.textContent = `+${extraSec}s added`;
};

window.toggleKitchenTimer = function() {
  playClickSfx();
  const btn = document.getElementById('timerToggleBtn');
  const status = document.getElementById('timerStatusLbl');
  const display = document.getElementById('timerDisplay');

  if (display) display.classList.remove('pulsing');

  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    if (btn) btn.textContent = '▶ Resume';
    if (status) status.textContent = 'Paused';
  } else {
    timerRunning = true;
    if (btn) btn.textContent = '⏸ Pause';
    if (status) status.textContent = 'Cooking...';

    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        updateTimerDisplay();
        playTickSound();
      } else {
        clearInterval(timerInterval);
        timerRunning = false;
        if (btn) btn.textContent = '▶ Start';
        if (status) status.textContent = '🔔 Time is up!';
        if (display) display.classList.add('pulsing');
        playTimerAlarm();

        const taskName = document.getElementById('timerTaskName')?.value.trim() || 'Kitchen Cooking Timer';
        alert(`⏰ Time's up for: ${taskName}!`);
      }
    }, 1000);
  }
};

window.resetKitchenTimer = function() {
  playClickSfx();
  if (timerInterval) clearInterval(timerInterval);
  timerRunning = false;

  const minInput = document.getElementById('customTimerMin');
  const secInput = document.getElementById('customTimerSec');
  const mins = Math.max(0, parseInt(minInput?.value) || 15);
  const secs = Math.max(0, Math.min(59, parseInt(secInput?.value) || 0));

  timerSeconds = (mins * 60) + secs;
  if (timerSeconds <= 0) timerSeconds = 15 * 60;
  timerTotalDuration = timerSeconds;

  updateTimerDisplay();

  const btn = document.getElementById('timerToggleBtn');
  const status = document.getElementById('timerStatusLbl');
  const display = document.getElementById('timerDisplay');

  if (display) display.classList.remove('pulsing');
  if (btn) btn.textContent = '▶ Start';
  if (status) status.textContent = 'Ready';
};

// =========================================================================
// 17. CULINARY WALLPAPER SWITCHER
// =========================================================================
const WALLPAPERS = [
  {
    name: 'Artisan Bakery Counter',
    url: '/src/assets/images/artisan_bakery_counter_1792221868772.jpg'
  },
  {
    name: 'Chef Luxury Kitchen',
    url: '/src/assets/images/culinary_kitchen_bg_1791612181398.jpg'
  }
];

let currentWallpaperIdx = 0;

function initWallpaper() {
  const saved = localStorage.getItem(STORAGE_KEY_WALLPAPER);
  if (saved !== null) {
    currentWallpaperIdx = parseInt(saved, 10) || 0;
  }
  applyWallpaper(currentWallpaperIdx, false);
}

function applyWallpaper(idx, showToast = true) {
  const backdrop = document.getElementById('bgBackdrop');
  if (!backdrop) return;
  const wp = WALLPAPERS[idx % WALLPAPERS.length];
  backdrop.style.backgroundImage = `
    radial-gradient(circle at 50% 15%, rgba(249, 115, 22, 0.18), transparent 60%),
    url('${wp.url}')
  `;
  localStorage.setItem(STORAGE_KEY_WALLPAPER, String(idx % WALLPAPERS.length));

  if (showToast && copyToast) {
    copyToast.textContent = `🖼️ Wallpaper: ${wp.name}`;
    copyToast.style.display = 'block';
    setTimeout(() => {
      copyToast.style.display = 'none';
      copyToast.textContent = 'Copied to clipboard!';
    }, 2200);
  }
}

window.toggleWallpaper = function() {
  playClickSfx();
  currentWallpaperIdx = (currentWallpaperIdx + 1) % WALLPAPERS.length;
  applyWallpaper(currentWallpaperIdx, true);
};

// =========================================================================
// 18. BOOTSTRAP INITIALIZATION
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initWallpaper();
  initSoundSetting();
  loadInputState();
  loadResultState();
  window.runUnitConversion(false);
  window.calculatePanScale();
  loadRecentConversions();
  renderSubstitutions(SUBSTITUTIONS_DATA);
  updateSavedCount();
  updateTimerDisplay();

  const tickCheckbox = document.getElementById('timerTickToggle');
  if (tickCheckbox) {
    tickCheckbox.checked = tickSoundEnabled;
  }

  const fracBtn = document.getElementById('fractionToggleBtn');
  if (fracBtn && showFractions) {
    fracBtn.textContent = '🔢 Toggle Decimals';
  }
});

