/**
 * NDT Radiography Pro: UI localization and shared countdown for research results.
 * Deliberately does not control radiation equipment or modify exposure mathematics.
 */
'use strict';
const $ = id => document.getElementById(id);
const availableLanguages = new Set(['nl','en','de']);
const locale = {};
let localeGeneration = 0;
const selectedLanguage = () => {
  const value = $('language')?.value || 'nl';
  return availableLanguages.has(value) ? value : 'nl';
};
const pick = (object, path) => path.split('.').reduce((v, key) => v?.[key], object);
const interpolate = (text, vars = {}) => String(text).replace(/\{\{(\w+)\}\}/g, (m, key) =>
  Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : m);
function tr(key, vars) {
  return interpolate(pick(locale[selectedLanguage()], key) ?? pick(locale.nl, key) ?? key, vars);
}
function fmt(number, digits = 1) {
  return new Intl.NumberFormat(selectedLanguage() === 'de' ? 'de-DE' :
    selectedLanguage() === 'en' ? 'en-GB' : 'nl-NL',
    {minimumFractionDigits: digits, maximumFractionDigits: digits}).format(number);
}
window.NDTI18n = Object.freeze({tr,fmt});
const staticTargets = {
  rtCompactTitle:'ui.title', rtCompactHelpTitle:'ui.help',
  rtCompactActivityLabel:'ui.activity', rtCompactFilmLabel:'ui.film',
  rtCompactDistanceLabel:'ui.distance', rtCompactDensityLabel:'ui.density',
  rtCompactOutsideLabel:'ui.outside', rtCompactWallLabel:'ui.wall',
  rtCompactThicknessLabel:'ui.thickness', rtCompactNominal:'ui.nominal',
  rtCompactAdvancedLabel:'ui.advanced',
  rtRepairCache:'static.repair',
  ndtCompanyLaunchTitle:'ui.companyMode',
  ndtCompanyLaunchDesc:'ui.companyModeDesc',
  ndtCompanyLaunchGo:'ui.companyModeOpen',
};
function applyStaticTranslations() {
  for (const [id, key] of Object.entries(staticTargets)) {
    const node = $(id);
    if (node) node.textContent = tr(key);
  }
  const textTargets = [
    ['#bootFailure > strong','static.boot'],
    ['#bootFailureDetail','static.bootDetail'],
    ['#bootFailure > a','static.openCheck'],
    ['#rtCompactKvField > span','ui.voltage'],
    ['#rtCompactPanel .rt-compact-help p','ui.researchHelp'],
    ['#rtCompactIqiQuick .rt-iqi-quick-title strong','ui.iqi'],
    ['#rtCompactIqiQuick .rt-iqi-quick-title span','ui.iqiSub'],
    ['#rtCompactIqiQuick .rt-iqi-observed label','ui.observed'],
    ['#rtIqiObserved option[value=""]','ui.notAssessed']
  ];
  for (const [selector,key] of textTargets) {
    const node = document.querySelector(selector);
    if (node) node.textContent = tr(key);
  }
  const group = $('rtMaterialChoices');
  const heading = group?.querySelector(':scope > strong');
  if (heading) {
    const textNode=[...heading.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
    if (textNode) textNode.textContent=tr('ui.material')+' ';
    const small=heading.querySelector('small');
    if (small) small.textContent=tr('ui.materialNote');
  }
  const custom = $('rtMaterialCustomWrap');
  if (custom) {
    const labelNode=[...custom.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
    if (labelNode) labelNode.textContent=tr('ui.customFactor')+' ';
  }
  for (const btn of document.querySelectorAll('[data-rt-material]')) {
    const id = btn.dataset.rtMaterial;
    const key = id === 'custom' ? 'ui.custom' : 'materials.' + id;
    const textNode = [...btn.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = tr(key) + ' ';
    const small = btn.querySelector('small');
    if (small && id === 'custom') small.textContent = tr('ui.customHint');
  }
  for (const option of $('material')?.options || []) option.textContent = tr('materials.' + option.value);
  document.documentElement.lang = selectedLanguage();
}
async function ensureLocales() {
  const generation = ++localeGeneration;
  await Promise.all(['nl','en','de'].map(async language => {
    if (locale[language]) return;
    try {
      const response = await fetch('./locales/' + language + '.json?v=1');
      if (!response.ok) throw new Error('locale ' + language + ' HTTP ' + response.status);
      locale[language] = await response.json();
    } catch (error) { console.warn('Locale unavailable:', language, error); }
  }));
  if (generation === localeGeneration) { refreshTranslations(); window.dispatchEvent(new Event('rt-locales-ready')); }
}
const timer = {
  initialSeconds:null, remainingSeconds:0, phase:'idle', deadline:0,
  intervalId:null, wakeLock:null, audio:null
};
const toSeconds = value => {
  const match = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(String(value || '').trim());
  return match ? Number(match[1])*3600 + Number(match[2])*60 + Number(match[3]) : null;
};
const showTime = seconds => {
  const s = Math.max(0, Math.ceil(Number(seconds)||0));
  return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60]
    .map(n => String(n).padStart(2,'0')).join(':');
};
function getControls() { return [...document.querySelectorAll('.rt-timer-controls')]; }
function createControls() {
  for (const [target, kind] of [['resultTime','result'],['stickyTime','sticky']]) {
    const anchor = $(target);
    if (!anchor || document.querySelector('.rt-timer-controls[data-placement="' + kind + '"]')) continue;
    const controls = document.createElement('div');
    controls.className = 'rt-timer-controls';
    controls.dataset.placement = kind;
    controls.innerHTML =
      '<button class="rt-timer-action" type="button" data-rt-timer="primary" disabled></button>' +
      '<button class="rt-timer-reset" type="button" data-rt-timer="reset" hidden></button>';
    anchor.insertAdjacentElement('afterend', controls);
  }
  const result = $('resultCard');
  if (result && !$('rtTimerComplete')) {
    const notice = document.createElement('p');
    notice.id = 'rtTimerComplete';
    notice.className = 'rt-timer-complete';
    notice.role = 'alert';
    notice.hidden = true;
    result.append(notice);
  }
  if (result && !$('rtCleanMaterialSummary')) {
    const material = document.createElement('p');
    material.id = 'rtCleanMaterialSummary';
    material.className = 'rt-clean-material';
    material.hidden = true;
    const reason = $('resultReason');
    if (reason) reason.insertAdjacentElement('beforebegin', material);
  }
  if (result && !$('rtTechnicalDetails')) {
    const details = document.createElement('details');
    details.id = 'rtTechnicalDetails';
    details.className = 'rt-technical-details';
    const heading = document.createElement('summary');
    heading.id = 'rtTechnicalDetailsHeading';
    details.append(heading);
    for (const id of ['resultProvenance','rtMaterialResult']) {
      const node = $(id);
      if (node) details.append(node);
    }
    result.append(details);
  }
}
function renderMaterial() {
  const card = $('resultCard'), output = $('rtCleanMaterialSummary');
  if (!card || !output) return;
  const physical = Number(card.dataset.physicalThickness);
  const equivalent = Number(card.dataset.feEquivalent);
  const material = card.dataset.materialCode;
  const valid = card.classList.contains('success') && material &&
    Number.isFinite(physical) && Number.isFinite(equivalent);
  output.hidden = !valid;
  if (valid) output.textContent = tr('ui.materialSummary', {
    thickness:fmt(physical,Number.isInteger(physical)?0:1), fe_eq:fmt(equivalent,1),
    material:tr('materials.'+material)
  });
}
function renderWarning() {
  const card = $('resultCard'), reason = $('resultReason');
  if (card?.classList.contains('success') && reason) reason.textContent=tr('ui.caution');
}
function render() {
  const hasTime = timer.initialSeconds !== null && timer.initialSeconds > 0;
  const active = timer.phase === 'running';
  const displayed = hasTime ? showTime(timer.remainingSeconds) : '—';
  if (hasTime) {
    if ($('resultTime') && $('resultTime').textContent !== displayed) $('resultTime').textContent = displayed;
    if ($('stickyTime') && $('stickyTime').textContent !== displayed) $('stickyTime').textContent = displayed;
  }
  for (const controls of getControls()) {
    controls.hidden = !hasTime;
    const primary = controls.querySelector('[data-rt-timer="primary"]');
    const reset = controls.querySelector('[data-rt-timer="reset"]');
    if (primary) {
      primary.disabled = !hasTime || timer.phase === 'done';
      primary.textContent = tr('timer.' + (active ? 'pause' : timer.phase === 'paused' ? 'resume' : 'start'));
      primary.setAttribute('aria-label',primary.textContent);
    }
    if (reset) {
      reset.hidden = timer.phase === 'idle';
      reset.textContent = tr('timer.reset');
    }
  }
  const notice = $('rtTimerComplete');
  if (notice) {
    notice.hidden = timer.phase !== 'done';
    notice.textContent = tr('timer.completed') + ' — ' + tr('timer.hint');
  }
  const heading = $('rtTechnicalDetailsHeading');
  if (heading) heading.textContent = tr('ui.technical');
  renderMaterial();
}
function clearIntervalOnly() {
  if (timer.intervalId != null) clearInterval(timer.intervalId);
  timer.intervalId = null;
}
async function releaseWakeLock() {
  const previous = timer.wakeLock;
  timer.wakeLock = null;
  if (previous) try { await previous.release(); } catch {}
}
async function requestWakeLock() {
  if (timer.phase !== 'running' || document.visibilityState !== 'visible' ||
      !('wakeLock' in navigator) || timer.wakeLock) return;
  try {
    const sentinel = await navigator.wakeLock.request('screen');
    if (timer.phase !== 'running') { await sentinel.release(); return; }
    timer.wakeLock = sentinel;
    sentinel.addEventListener('release', () => {
      if (timer.wakeLock === sentinel) timer.wakeLock = null;
    });
  } catch { /* Wake Lock is optional, e.g. denied in power saving mode. */ }
}
function prepareAudio() {
  try {
    if (!timer.audio && (window.AudioContext || window.webkitAudioContext))
      timer.audio = new (window.AudioContext || window.webkitAudioContext)();
    timer.audio?.resume().catch(() => {});
  } catch {}
}
function signalFinished() {
  try { navigator.vibrate?.([250, 100, 250]); } catch {}
  try {
    if (timer.audio) {
      const oscillator = timer.audio.createOscillator();
      const gain = timer.audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001,timer.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16,timer.audio.currentTime+0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001,timer.audio.currentTime+0.65);
      oscillator.connect(gain); gain.connect(timer.audio.destination);
      oscillator.start(); oscillator.stop(timer.audio.currentTime+0.7);
    }
  } catch {}
}
function finishTimer() {
  if (timer.phase !== 'running') return;
  timer.phase = 'done'; timer.remainingSeconds = 0;
  clearIntervalOnly(); void releaseWakeLock();
  render(); signalFinished();
}
function tick() {
  if (timer.phase !== 'running') return;
  timer.remainingSeconds = Math.max(0, Math.ceil((timer.deadline-Date.now())/1000));
  if (timer.remainingSeconds === 0) return finishTimer();
  render();
}
function beginTimer() {
  if (!(timer.initialSeconds > 0) || timer.phase === 'done') return;
  prepareAudio();
  if (timer.phase === 'idle') timer.remainingSeconds=timer.initialSeconds;
  timer.deadline = Date.now() + timer.remainingSeconds * 1000;
  timer.phase = 'running';
  clearIntervalOnly();
  timer.intervalId = setInterval(tick, 250);
  void requestWakeLock();
  render();
}
function pauseTimer() {
  if (timer.phase !== 'running') return;
  timer.remainingSeconds = Math.max(0,Math.ceil((timer.deadline-Date.now())/1000));
  timer.phase = 'paused';
  clearIntervalOnly(); void releaseWakeLock(); render();
}
function resetTimer() {
  clearIntervalOnly(); void releaseWakeLock();
  timer.remainingSeconds = timer.initialSeconds ?? 0;
  timer.phase = 'idle'; render();
}
function setCalculatedTime(seconds) {
  const valid = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
  if (valid === null) {
    timer.initialSeconds = null; timer.remainingSeconds=0;
    timer.phase='idle'; clearIntervalOnly(); void releaseWakeLock(); render();
    return;
  }
  if (valid !== timer.initialSeconds) {
    clearIntervalOnly(); void releaseWakeLock();
    timer.initialSeconds=valid; timer.remainingSeconds=valid; timer.phase='idle';
  }
  render();
}
function refreshTranslations() {
  applyStaticTranslations();
  render();
  renderWarning();
}
function init() {
  createControls();
  for (const id of ['resultTime','stickyTime']) {
    const el=$(id);
    if (el) { el.setAttribute('role','timer'); el.setAttribute('aria-live','off'); }
  }
  setCalculatedTime(toSeconds($('resultTime')?.textContent));
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-rt-timer]');
    if (!button) return;
    if (button.dataset.rtTimer === 'reset') resetTimer();
    else if (timer.phase === 'running') pauseTimer();
    else beginTimer();
  });
  window.addEventListener('ndt-result', event => {
    setCalculatedTime(event.detail?.seconds);
    renderWarning();
  });
  window.addEventListener('ndt-result-cleared', () => setCalculatedTime(null));
  window.addEventListener('rt-language-changed', () => {
    refreshTranslations(); void ensureLocales();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && timer.phase === 'running') {
      tick(); void requestWakeLock();
    }
  });
  $('language')?.addEventListener('change', () => { refreshTranslations(); void ensureLocales(); });
  void ensureLocales();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
export {tr,fmt,toSeconds,showTime};
