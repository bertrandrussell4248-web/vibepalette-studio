// VibePalette Studio — core + persistence
const DEFAULT_COUNT = 5;
const KEY = 'vibepalette.studio.v1';

const swatchesEl = document.getElementById('swatches');
const previewEl = document.getElementById('preview');
const randomBtn = document.getElementById('randomBtn');
const copyCssBtn = document.getElementById('copyCssBtn');
const exportBtn = document.getElementById('exportBtn');
const saveBtn = document.getElementById('saveBtn');
const paletteNameInput = document.getElementById('paletteName');
const savedListEl = document.getElementById('savedList');
const importBtn = document.getElementById('importBtn');

function randChannel(){ return Math.floor(Math.random() * 256); }
function randomColor(){
  const r = randChannel(), g = randChannel(), b = randChannel();
  return `#${((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1)}`.toUpperCase();
}

function generatePalette(count = DEFAULT_COUNT){
  return Array.from({length: count}, () => randomColor());
}

function applyGradient(colors){
  const css = `linear-gradient(135deg, ${colors.join(', ')})`;
  previewEl.style.background = css;
  previewEl.dataset.css = css;
}

function renderSwatches(colors){
  swatchesEl.innerHTML = '';
  colors.forEach((c, idx) => {
    const el = document.createElement('div');
    el.className = 'swatch';
    el.style.background = c;
    el.textContent = c;
    el.title = 'Click to copy hex. Double click to lock.';
    el.addEventListener('click', async () => {
      await navigator.clipboard.writeText(c);
      el.textContent = 'Copied!';
      setTimeout(()=>el.textContent = c, 900);
    });
    el.addEventListener('dblclick', () => {
      el.classList.toggle('locked');
      el.style.outline = el.classList.contains('locked') ? '3px solid rgba(255,255,255,0.12)' : 'none';
    });
    swatchesEl.appendChild(el);
  });
}

let currentPalette = generatePalette();
applyGradient(currentPalette);
renderSwatches(currentPalette);

randomBtn.addEventListener('click', ()=>{
  // preserve locked colors (by position)
  const lockedEls = Array.from(document.querySelectorAll('.swatch.locked'));
  const locks = lockedEls.map(el => el.textContent);
  const next = generatePalette().map((c, i) => locks[i] || c);
  currentPalette = next;
  applyGradient(currentPalette);
  renderSwatches(currentPalette);
});

copyCssBtn.addEventListener('click', async () => {
  const css = `background: ${previewEl.dataset.css};`;
  try {
    await navigator.clipboard.writeText(css);
    copyCssBtn.textContent = 'CSS copied';
    setTimeout(()=>copyCssBtn.textContent = 'Copy CSS', 900);
  } catch (e) {
    alert('Copy failed. You can manually copy:\n' + css);
  }
});

exportBtn.addEventListener('click', () => {
  const payload = { palette: currentPalette, createdAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vibepalette-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Persistence utilities
function loadSaved(){
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveAll(items){
  localStorage.setItem(KEY, JSON.stringify(items));
}
function addSaved(item){
  const arr = loadSaved();
  arr.unshift(item);
  saveAll(arr.slice(0, 50));
  renderSavedList();
}

function renderSavedList(){
  const items = loadSaved();
  savedListEl.innerHTML = '';
  if (!items.length){
    const note = document.createElement('small');
    note.className = 'muted';
    note.textContent = 'No saved palettes yet.';
    savedListEl.appendChild(note);
    return;
  }
  items.forEach((it, i) => {
    const container = document.createElement('div');
    container.className = 'saved-item';
    const title = document.createElement('div');
    title.style.fontWeight = 700;
    title.style.fontSize = '13px';
    title.textContent = it.name || `Palette ${i+1}`;
    const paletteMini = document.createElement('div');
    paletteMini.style.display = 'flex'; paletteMini.style.gap = '6px'; paletteMini.style.marginLeft = '12px';
    it.palette.forEach(hex => {
      const box = document.createElement('div');
      box.style.width = '28px'; box.style.height = '22px'; box.style.borderRadius = '4px';
      box.style.background = hex; box.title = hex;
      paletteMini.appendChild(box);
    });
    const actions = document.createElement('div');
    actions.style.marginLeft = 'auto'; actions.style.display = 'flex'; actions.style.gap = '8px';
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', ()=>{
      currentPalette = it.palette.slice();
      applyGradient(currentPalette);
      renderSwatches(currentPalette);
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', ()=>{
      const arr = loadSaved();
      arr.splice(i,1);
      saveAll(arr);
      renderSavedList();
    });
    actions.appendChild(loadBtn); actions.appendChild(delBtn);
    container.appendChild(title);
    container.appendChild(paletteMini);
    container.appendChild(actions);
    savedListEl.appendChild(container);
  });
}

// save button wiring
saveBtn.addEventListener('click', ()=>{
  const name = (paletteNameInput.value || '').trim();
  addSaved({ name, palette: currentPalette.slice(), createdAt: new Date().toISOString() });
  paletteNameInput.value = '';
  saveBtn.textContent = 'Saved';
  setTimeout(()=>saveBtn.textContent = 'Save Palette', 900);
});

// import JSON
importBtn.addEventListener('click', async ()=>{
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const txt = await f.text();
      const obj = JSON.parse(txt);
      if (obj.palette && Array.isArray(obj.palette)){
        addSaved({ name: obj.name || f.name, palette: obj.palette.slice(), createdAt: obj.createdAt || new Date().toISOString() });
        alert('Imported palette!');
      } else {
        alert('JSON does not contain a valid palette array.');
      }
    } catch (err) {
      alert('Failed to parse JSON: ' + err.message);
    }
  });
  fileInput.click();
});

// init saved list on load
renderSavedList();
