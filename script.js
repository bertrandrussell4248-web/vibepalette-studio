// VibePalette Studio — core functionality
const DEFAULT_COUNT = 5;
const root = document.getElementById('app');
const swatchesEl = document.getElementById('swatches');
const previewEl = document.getElementById('preview');
const randomBtn = document.getElementById('randomBtn');
const copyCssBtn = document.getElementById('copyCssBtn');
const exportBtn = document.getElementById('exportBtn');

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
    el.title = 'Click to copy hex';
    el.addEventListener('click', async () => {
      await navigator.clipboard.writeText(c);
      el.textContent = 'Copied!';
      setTimeout(()=>el.textContent = c, 900);
    });
    // simple double-click to lock color (visual hint)
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
  // preserve locked colors
  const lockedEls = Array.from(document.querySelectorAll('.swatch.locked'));
  const locks = lockedEls.map(el => el.textContent);
  // generate new palette but reuse locks if present
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
