/**
 * Se-75 mobile research shortcut.
 * Uses the exact existing RT calculator and reference dataset; no copied curves,
 * independent exposure formula, automatic approval, or fallback extrapolation.
 */
import {calculateGamma, parseDecimal, hms} from './rt-core.mjs';
import {curves} from './rt-curves.mjs';

export const SE75_FILMS = Object.freeze(['D4','D5','D7']);

/** Strings from the form are intentionally required; no assumed shooting parameters. */
export function calculateSe75Research(values) {
  const required = ['thicknessMm','film','density','activityCi','distanceMm'];
  if (!values || required.some(k => String(values[k] ?? '').trim() === '')) {
    return {ok:false,error:'missing'};
  }
  const film = String(values.film);
  if (!SE75_FILMS.includes(film)) return {ok:false,error:'film'};
  const thicknessMm = parseDecimal(values.thicknessMm);
  const density = parseDecimal(values.density);
  const activityCi = parseDecimal(values.activityCi);
  const distanceMm = parseDecimal(values.distanceMm);
  if (![thicknessMm,density,activityCi,distanceMm].every(Number.isFinite)) {
    return {ok:false,error:'invalid'};
  }
  return calculateGamma({
    isotope:'Se-75', film, density, thicknessMm, activityCi, distanceMm,
    material:'Fe',screens:'Pb'
  },curves);
}

export function se75ErrorMessage(result) {
  switch(result.error) {
    case 'missing': return 'Vul eerst alle vijf invoervelden in. Er worden geen waarden aangenomen.';
    case 'invalid': return 'Controleer de invoer: alleen geldige positieve getallen en ondersteunde afstanden zijn toegestaan.';
    case 'film': return 'Dit filmtype wordt niet ondersteund. Kies D4, D5 of D7.';
    case 'density': return 'Deze doelzwarting wordt niet door de bestaande film- en bronreferentie ondersteund. Geen extrapolatie.';
    case 'range': return 'Deze doorstraalde staaldikte valt buiten de referentiecurve voor het gekozen filmtype (' + result.lower + '–' + result.upper + ' mm). Geen extrapolatie.';
    case 'material': return 'Voor deze combinatie ontbreekt een ondersteunde materiaalreferentie.';
    default: return 'De bestaande onderzoeksrekenmotor blokkeert deze invoer (' + String(result.error || 'onbekend') + ').';
  }
}

function init() {
  const form = document.getElementById('se75Form');
  if (!form) return;
  const status = document.getElementById('resultStatus');
  const time = document.getElementById('resultTime');
  const message = document.getElementById('resultMessage');
  const source = document.getElementById('resultSource');
  const resultBox = document.getElementById('se75Result');
  function showIdle() {
    resultBox.dataset.state='idle';
    status.textContent='Nog geen actuele berekening';
    time.textContent='—';
    message.textContent='Druk na het controleren van de gegevens op Bereken.';
    source.textContent='';
    source.hidden=true;
  }
  form.addEventListener('input', showIdle);
  form.addEventListener('change', showIdle);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const controls = ['thickness','film','density','activity','distance'];
    for(const id of controls) document.getElementById(id).removeAttribute('aria-invalid');
    const values = {
      thicknessMm: document.getElementById('thickness').value,
      film: document.getElementById('film').value,
      density: document.getElementById('density').value,
      activityCi: document.getElementById('activity').value,
      distanceMm: document.getElementById('distance').value
    };
    const result = calculateSe75Research(values);
    resultBox.dataset.state=result.ok?'research':'blocked';
    status.textContent=result.ok?'ONDERZOEKSUITKOMST · GEEN VRIJGAVE':'BEREKENING GEBLOKKEERD';
    time.textContent=result.ok?hms(result.minutes):'—';
    message.textContent=result.ok ?
      'Indicatieve tijd uit bestaande onderzoekscurves. Controleer bron, film, geometrie, IQI en procedure onafhankelijk.' :
      se75ErrorMessage(result);
    source.textContent=result.ok ?
      'Bron: ' + (result.sourceTitle || 'onderzoeksreferentie') + ' · dataset: ' + (result.datasetId || 'onbekend') +
      ' · status: niet fysiek gekalibreerd / niet goedgekeurd.' : '';
    source.hidden=!result.ok;
    if(!result.ok){
      const field = result.error==='film'?'film':result.error==='density'?'density':
        result.error==='range'?'thickness':null;
      if(field)document.getElementById(field).setAttribute('aria-invalid','true');
    }
    resultBox.scrollIntoView({block:'nearest',behavior:'auto'});
  });
}
if (typeof document !== 'undefined') {
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
}
