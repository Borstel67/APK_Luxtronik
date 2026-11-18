/* ============================================================================
   Wärmepumpe – Oberfläche auf Basis von wp.jar (Luxtronik-Java-Schnittstelle)
   Logik 1:1 aus dem dekompilierten Applet übernommen (Klassenangaben im Kommentar).
   Lesen: 3003 Parameter, 3004 Ist-Werte, 3005 Sichtbarkeiten. Schreiben: 3002.
   ========================================================================== */
'use strict';
const _TXT = ['Text_Mischkreis1', 'Text_Mischkreis2', 'Text_Mischkreis3', 'Text_Zweit_Warmeerz'];
const T = k => (typeof LUX_LANG !== 'undefined' && LUX_LANG[k]) || k.replace(/^Text_/, '').replace(/_/g, ' ');

/* Codierung.WP_LW_WW_TYP (1 = Luft/Wasser) */
const WP_LW_WW_TYP = [0,2,2,2,2,1,1,1,1,2,1,2,1,1,2,1,1,1,1,1,1,1,1,2,2,1,2,1,1,1,2,0,0,0,0,0,0,0,0,0,0,1,1,2,2,2,0,0,1,1,1,1,1,1,1,1];

/* ---------- Brücke zur App (Android) bzw. HTTP-Mock (Browser-Test) ---------- */
const JB = {
  seq: 1, waits: {},
  available(){ return !!((window.Android && Android.javaRead) || window.__javaHttp); },
  call(kind, args){
    return new Promise(res => {
      const id = this.seq++;
      this.waits[id] = res;
      setTimeout(() => this.done(id, { error: 'Zeitüberschreitung' }), 15000);
      try {
        if (window.Android && Android.javaRead) {
          if (kind === 'read') Android.javaRead(cfg.host, id);
          else Android.javaWrite(cfg.host, args.port || 8888, JSON.stringify(args.pairs), id);
        } else if (window.__javaHttp) {
          const p = kind === 'read' ? fetch(window.__javaHttp + '/read').then(r => r.json())
            : fetch(window.__javaHttp + '/write', { method: 'POST', body: JSON.stringify(args.pairs) }).then(r => r.json());
          p.then(d => this.done(id, d)).catch(e => this.done(id, { error: e.message }));
        } else this.done(id, { error: 'Java-Schnittstelle nicht verfügbar' });
      } catch (e) { this.done(id, { error: e.message }); }
    });
  },
  done(id, d){ const r = this.waits[id]; if (r) { delete this.waits[id]; r(d); } }
};

/* ---------- Formatierung ---------- */
const pad2 = n => String(n).padStart(2, '0');
const fmtNum = (raw, div, unit) => {
  const dec = div >= 1000 ? 1 : div >= 100 ? 2 : div >= 10 ? 1 : 0;
  return (raw / div).toFixed(dec).replace('.', ',') + (unit ? ' ' + unit : '');
};
const fmtTs = s => { if (!(s > 0)) return '–'; const d = new Date(s * 1000);
  return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
const fmtHM = sec => pad2(Math.floor(sec / 3600)) + ':' + pad2(Math.floor(sec % 3600 / 60));

/* Einstellung.setFormatVars(format): Faktor + Einheit */
const FMT = { 0: [10, 'h'], 1: [1, 'min'], 2: [100, ''], 3: [10, '°C'], 4: [10, 'K'], 5: [1, 'm³/h'], 6: [100, 'V'], 7: [1, '%'], 8: [10, '%'] };

/* ---------- Einstellungs-Sets (hilfprogramm.Set / Einstellung) ----------
   n: Parameter, t: Textschlüssel, v: Sichtbarkeit, a: Zugriff (1 Benutzer, 2 Installateur, 4 KD, 8 Werk),
   o: Optionen, req: Zusatzplatine, ign: übersprungene Werte, num: [min, max, step, format] */
const YN = ['Text_Nein', 'Text_Ja'];
function optLists(code, zp){
  const lw = WP_LW_WW_TYP[code] === 1;
  const kk = [41,42,46,47,48,49,50,51,52,53].includes(code) ? 'Text_Kaeltekr' : 'Text_Nein';
  const L = {
    EVU: ['Text_ohneZWE', 'Text_mitZWE'], RFV: ['Text_Nein', 'Text_RFV', 'Text_RFVK', 'Text_RFVD'], HREINB: ['Text_Trennsp', 'Text_Rueckl'],
    MK1: lw && code !== 21 && code !== 22 ? ['Text_Nein', 'Text_Entlade', 'Text_Lade']
         : ['Text_Nein', 'Text_Entlade', 'Text_Lade', 'Text_Kuhl'].concat(zp & 1 ? ['Text_HzKuhl'] : []),
    ZWE1ART: ['Text_Nein', 'Text_Heizstab', 'Text_Therme', 'Text_Kessel'], ZWE1FKT: ['Text_Nein', 'Text_HzuBw', 'Text_Heizen'],
    ZWE2ART: ['Text_Nein', 'Text_Heizstab'], ZWE2FKT: ['Text_Nein', 'Text_Heizen', 'Text_Brauchw'], ERRM: ['Text_mitZWE', 'Text_ohneZWE'],
    BWT: ['Text_Fuehler', 'Text_Therm'], BWZIP: ['Text_ZIP', 'Text_BLP'], BWBER: ['Text_mitZUP', 'Text_ohneZUP'], BWS: ['Text_Sollwert', 'Text_Maxwert'],
    BWHUP: ['Text_ohneHUP', 'Text_mitHUP'], ABTZYK: ['Text_45min', 'Text_60min', 'Text_75min', 'Text_90min', 'Text_120min', 'Text_180min', 'Text_240min'],
    YN, ABT1: ['Text_Abt1', 'Text_Abt2'], ABT2: ['Text_mit1VD', 'Text_mit2VD'], ZUG: ['Text_Inst', 'Text_KD'],
    ASD: ['Text_Nein', 'Text_Durchfl', 'Text_Soledr', 'Text_Netzueberw', 'Text_NetzDfl'], UEVD: ['Text_Aus', 'Text_Ein'],
    RTYP: ['Text_ATAbh', 'Text_Festt', 'Text_AnalogIn'], RTYP2: ['Text_ATAbh', 'Text_Festt'], AHPM: ['Text_mMisch', 'Text_oMisch'],
    PAR: ['Text_Nein', 'Text_Slave', 'Text_Master'], MEDIUM: ['Text_Sole', 'Text_Wasser', 'Text_Nein', 'Text_Wasser_Sole'],
    WWNH: Array.from({ length: 19 }, (_, i) => '#' + ((10 + i * 5) / 10).toFixed(1).replace('.', ',') + ' h'),
    ZWE3ART: ['Text_Nein', 'Text_Kessel'], ZWE3FKT: ['Text_Nein', 'Text_HzuBw', 'Text_Brauchw'], HZSUP: ['Text_ohneSUP', 'Text_mitSUP'],
    MK2: lw && ![21, 22, 49, 50].includes(code) ? ['Text_Nein', 'Text_Entlade', 'Text_Lade'] : ['Text_Nein', 'Text_Entlade', 'Text_Lade', 'Text_Kuhl', 'Text_HzKuhl'],
    MK3: ['Text_Nein', 'Text_Entlade', 'Text_HzKuhl'], KUTYP: ['Text_Festt', 'Text_ATAbh'], SWBBER: ['Text_mitZUP', 'Text_ohneZUP'],
    SOLAR: ['Text_Temp_Diff', 'Text_Standard', 'Text_Solar_WP'], WMZ: [kk, 'Text_V5_100', 'Text_V10_200', 'Text_V20_400', 'Text_V2_40'],
    WZW: ['#3 kW', '#4,5 kW', '#6 kW', '#8 kW', '#10 kW']
  };
  return L;
}

/* einstellung.SystemEinstellung.DisplayBauen() */
function setSystem(code, zp){
  const L = optLists(code, zp);
  const s = [
    { n: 32, t: 'Text_EVUSperre', v: 119, a: 2, o: L.EVU }, { n: 33, t: 'Text_Raumstation', v: 120, a: 1, o: L.RFV },
    { n: 35, t: 'Text_Einbindung', v: 121, a: 2, o: L.HREINB }, { n: 42, t: 'Text_Mischkreis1', v: 122, a: 1, o: L.MK1 },
    { n: 36, t: 'Text_ZWE1Art', v: 124, a: 2, o: L.ZWE1ART }, { n: 37, t: 'Text_ZWE1Fkt', v: 125, a: 2, o: L.ZWE1FKT },
    { n: 38, t: 'Text_ZWE2Art', v: 126, a: 2, o: L.ZWE2ART }, { n: 39, t: 'Text_ZWE2Fkt', v: 127, a: 2, o: L.ZWE2FKT },
    { n: 86, t: 'Text_Stoerung', v: 130, a: 2, o: L.ERRM }, { n: 82, t: 'Text_Brauchwasser1', v: 131, a: 1, o: L.BWT },
    { n: 85, t: 'Text_Brauchwasser2', v: 132, a: 4, o: L.BWZIP }, { n: 40, t: 'Text_Brauchwasser3', v: 133, a: 2, o: L.BWBER },
    { n: 100, t: 'Text_Brauchwasser4', v: 134, a: 4, o: L.BWS }, { n: 148, t: 'Text_Brauchwasser5', v: 135, a: 2, o: L.BWHUP },
    { n: 48, t: code !== 40 ? 'Text_BWWPmax' : 'Text_Laufzeit_bis_ZWE', v: 136, a: 1, num: [0, 80, 5, 0] },
    { n: 34, t: 'Text_Abtzykmax', v: 137, a: 4, o: L.ABTZYK }, { n: 43, t: 'Text_Luftabt', v: 138, a: 4, o: YN },
    { n: 45, t: 'Text_LuftAbtmax', v: 139, a: 4, num: [5, 30, 1, 1] }, { n: 76, t: 'Text_Abtauen1', v: 140, a: 8, o: L.ABT1 },
    { n: 101, t: 'Text_Abtauen2', v: 141, a: 8, o: L.ABT2 }, { n: 49, t: 'Text_Pumpenoptim', v: 142, a: 1, o: YN },
    { n: 107, t: 'Text_Zugang', v: 144, a: 4, o: L.ZUG }, { n: 46, t: 'Text_SoledrDurchf', v: 145, a: [1, 2, 11, 14].includes(code) ? 2 : 4, o: L.ASD },
    { n: 102, t: 'Text_UberwachungVD', v: 146, a: 4, o: L.UEVD }, { n: 103, t: 'Text_RegelungHK', v: 147, a: 1, o: L.RTYP },
    { n: 120, t: 'Text_RegelungMK1', v: 148, a: 1, o: L.RTYP2 }, { n: 104, t: 'Text_Ausheizen', v: 151, a: 1, o: L.AHPM },
    { n: 114, t: 'Text_ElektrAnode', v: 152, a: 4, o: YN }, { n: 152, t: 'Text_PeriodeMk1', v: 156, a: 1, num: [25, 200, 25, 2] },
    { n: 150, t: 'Text_LaufzeitMk1', v: 157, a: 1, num: [25, 200, 25, 2] }, { n: 699, t: 'Text_Heizgrenze', v: 160, a: 1, o: YN },
    { n: 762, t: 'Text_Parallelbetrieb', v: 204, a: 2, o: L.PAR }, { n: 860, t: 'Text_Fernwartung', v: 231, a: 1, o: YN },
    { n: 864, t: 'Text_Pumpennachlauf', v: 235, a: 1, num: [5, 180, 5, 1] }, { n: 885, t: 'Text_Vorlauf_VBO', v: 253, a: 2, num: [1, 5, 1, 1] },
    { n: 891, t: 'Text_Abtzykmin', v: 257, a: 8, o: L.ABTZYK }, { n: 892, t: 'Text_Verkuerzung_2_VD', v: 258, a: 2, num: [5, 20, 1, 1] },
    { n: 970, t: 'Text_Meldung_TDI', v: -1, a: 2, o: YN }, { n: 975, t: 'Text_Medium_WQ', v: 293, a: 4, o: L.MEDIUM },
    { n: 977, t: 'Text_Multispeicher', v: 294, a: 1, o: YN }, { n: 992, t: 'Text_FreigZWE', v: 300, a: 2, num: [20, 120, 5, 1] },
    { n: 994, t: 'Text_WW_Nachheizung', v: 1, a: 1, o: YN }, { n: 1020, t: 'Text_WW_Nacheizung_max', v: 1, a: 2, o: L.WWNH, ofs: 0 },
    { n: 130, t: 'Text_Mischkreis2', v: 123, a: 1, o: L.MK2, req: 1 }, { n: 153, t: 'Text_PeriodeMk2', v: 158, a: 1, num: [25, 200, 25, 2], req: 1 },
    { n: 151, t: 'Text_LaufzeitMk2', v: 159, a: 1, num: [25, 200, 25, 2], req: 1 },
    { n: 780, t: 'Text_Mischkreis3', v: 208, a: 1, o: L.MK3, req: 1, ign: [2, 3] }, { n: 783, t: 'Text_PeriodeMk3', v: 215, a: 1, num: [25, 200, 25, 2], req: 1 },
    { n: 782, t: 'Text_LaufzeitMk3', v: 216, a: 1, num: [25, 200, 25, 2], req: 1 },
    { n: 121, t: 'Text_RegelungMK2', v: 149, a: 1, o: L.RTYP2, req: 1 }, { n: 781, t: 'Text_RegelungMK3', v: 214, a: 1, o: L.RTYP2, req: 1 },
    { n: 129, t: 'Text_Heizung', v: 155, a: 2, o: L.HZSUP, req: 1 }, { n: 127, t: 'Text_ZWE3Art', v: 128, a: 2, o: L.ZWE3ART, req: 1, ign: [1] },
    { n: 128, t: 'Text_ZWE3Fkt', v: 129, a: 2, o: L.ZWE3FKT, req: 1 }, { n: 131, t: 'Text_Kuhlung', v: 150, a: 1, o: L.KUTYP, req: 1 },
    { n: 137, t: 'Text_SWBBer', v: 153, a: 2, o: L.SWBBER, req: 1 }, { n: 139, t: 'Text_SWBMin', v: 154, a: 1, num: [0, 50, 5, 0], req: 1 },
    { n: 881, t: 'Text_Solarregelung', v: -1, a: 1, o: L.SOLAR, req: 1 }, { n: 884, t: 'Text_aktive_Kuehlung', v: 252, a: 2, o: YN, req: 1 },
    { n: 869, t: 'Text_Effizienzpumpe', v: 239, a: 1, o: YN, req: 3 }, { n: 870, t: 'Text_Waermemenge_WS', v: 240, a: 1, o: L.WMZ, req: 3 }
  ];
  if (code === 30) s.push({ n: 971, t: 'Text_WP_Typ', v: 280, a: 4, o: L.WZW, req: 2 });
  return s;
}

/* einstellung.Temperaturen2.DisplayBauen() + getTWQMin() */
function setTemperaturen(code, P, level){
  let wqMin = -210;
  if (level <= 4) {
    if ([1, 2, 11, 14].includes(code)) wqMin = -90;
    else if ([3, 4, 23, 24, 26, 30].includes(code)) wqMin = 35;
    else if ([43, 44, 45].includes(code) && P(975) === 0) wqMin = -90;
  }
  if (P(93) < wqMin) wqMin = P(93);
  const taEG = [43, 44, 45, 54].includes(code) ? 'Text_WQ_EG' : 'Text_Aussent_EG';
  return [
    { n: 87, t: 'Text_RucklBegr', v: 92, a: 2, num: [350, 700, 10, 3] }, { n: 88, t: 'Text_HystereseHR', v: 93, a: 2, num: [5, 30, 5, 4] },
    { n: 89, t: 'Text_TRErhmax', v: 94, a: 4, num: [10, 100, 10, 4] }, { n: 95, t: 'Text_Freig2VD', v: 95, a: 2, num: [-100, 200, 10, 3] },
    { n: 90, t: 'Text_FreigZWE', v: 96, a: 2, num: [-200, 200, 10, 3] }, { n: 44, t: 'Text_Tluftabt', v: 97, a: 4, num: [0, 200, 10, 3] },
    { n: 47, t: 'Text_TDISolltemp', v: 98, a: 1, num: [500, 700, 10, 3] }, { n: 74, t: 'Text_HystereseBW', v: 99, a: 2, num: [10, 300, 10, 4] },
    { n: 96, t: 'Text_Vorl2VDBW', v: 100, a: 2, num: [100, 700, 10, 3] }, { n: 91, t: 'Text_TAussenmax', v: 101, a: 4, num: [200, 450, 10, 3] },
    { n: 92, t: 'Text_TAussenmin', v: 102, a: 2, num: [-200, 100, 10, 3] },
    { n: 93, t: 'Text_TWQmin', v: 103, a: wqMin > -210 ? 2 : 8, num: [wqMin, 100, 5, 3] },
    { n: 94, t: 'Text_THGmax', v: 104, a: 8, num: [1000, 1500, 10, 3] }, { n: 98, t: 'Text_TLABTEnde', v: 105, a: 4, num: [20, 240, 10, 3] },
    { n: 111, t: 'Text_Absenkbis', v: 106, a: 1, num: [-200, 100, 5, 3] }, { n: 149, t: 'Text_Vorlaufmax', v: 107, a: 4, num: [350, 750, 10, 3] },
    { n: 691, t: 'Text_VLMaxMk1', v: 114, a: 1, num: [250, 750, 10, 3] }, { n: 862, t: taEG, v: 233, a: 4, num: [-200, 50, 10, 3] },
    { n: 863, t: 'Text_Vorlauf_max_EG', v: 234, a: 4, num: [350, 750, 10, 3] }, { n: 893, t: 'Text_Hysterese_2VD_verk', v: 259, a: 2, num: [5, 60, 5, 4] },
    { n: 973, t: 'Text_max_Brauchwasser', v: 1, a: 2, num: [300, 650, 5, 3] }, { n: 979, t: 'Text_Minimale_Ruecklaufsolltemperatur', v: 295, a: 1, num: [150, 300, 5, 3] },
    { n: 993, t: 'Text_min_VL_Kuehl', v: 301, a: 2, num: [50, 250, 10, 3] },
    { n: 122, t: 'Text_TDiffEin', v: 108, a: 1, num: [20, 150, 5, 4], req: 1 }, { n: 123, t: 'Text_TDiffAus', v: 109, a: 1, num: [5, 100, 5, 4], req: 1 },
    { n: 124, t: 'Text_TDiffmax', v: 110, a: 1, num: [200, 900, 10, 4], req: 1 }, { n: 125, t: 'Text_TEEHeizung', v: 111, a: 1, num: [10, 150, 5, 4], req: 1 },
    { n: 126, t: 'Text_TEEBrauchw', v: 112, a: 1, num: [10, 150, 5, 4], req: 1 }, { n: 138, t: 'Text_Vorl2VDSW', v: 113, a: 2, num: [100, 700, 10, 3], req: 1 },
    { n: 692, t: 'Text_VLMaxMk2', v: 115, a: 1, num: [250, 750, 10, 3], req: 1 }
  ];
}

/* einstellung.WMZ_Effizienzpumpe */
function setWMZ(code, zp){
  const L = optLists(code, 3);
  return [
    { n: 869, t: 'Text_Effizienzpumpe', v: 239, a: 1, o: YN }, { n: 870, t: 'Text_Waermemenge_WS', v: 240, a: 1, o: L.WMZ },
    { n: 867, t: 'Text_Effizienzpume_Nominal', v: 237, a: 2, num: [300, 1000, 25, 2] }, { n: 868, t: 'Text_Effizienzpume_Minimal', v: 238, a: 2, num: [300, 1000, 25, 2] },
    { n: 987, t: 'Text_Min_Drehzahl', v: 237, a: 2, num: [100, 1000, 10, 8] }
  ];
}

/* Schaltuhren (schaltuhren.Schaltuhren / SU): Kanäle, Basisparameter, Sichtbarkeit */
const CLOCKS = [
  { id: 'hk', t: 'Text_Heizkreis', ak: 3, off: 222, v: -1 }, { id: 'ww', t: 'Text_Warmwasser', ak: 5, off: 405, v: -1 },
  { id: 'zirk', t: 'Text_Zirkulation', ak: 5, off: 506, v: 8 }, { id: 'mk1', t: 'Text_Mischkreis1', ak: 3, off: 283, v: 5 },
  { id: 'mk2', t: 'Text_Mischkreis2', ak: 3, off: 344, v: 6 }, { id: 'mk3', t: 'Text_Mischkreis3', ak: 3, off: 788, v: 209 },
  { id: 'swb', t: 'Text_Schwimmbad', ak: 3, off: 607, v: 2 }   // haupthtml.addNode(Text_SWB, 119, top, 2): Sichtbarkeit 2
];
const DAYS = { 2: ['Text_Sonntag', 'Text_Montag', 'Text_Dienstag', 'Text_Mittwoch', 'Text_Donnerstag', 'Text_Freitag', 'Text_Samstag'] };
function clockBlocks(type){
  if (type === 0) return [T('Text_Montag') + ' – ' + T('Text_Sonntag')];
  if (type === 1) return [T('Text_Montag') + ' – ' + T('Text_Freitag'), T('Text_Samstag') + ' – ' + T('Text_Sonntag')];
  return DAYS[2].map(T);
}
/* SU.getOffset() */
function clockStart(c, type, night){
  let o = 1; const m = 2;
  if (type > 0) o += c.ak * m;
  if (type > 1) o += c.ak * m * 2;
  if (night) o += c.ak * m * 10;
  return c.off + o;
}

/* ============================================================================ */
const jui = {
  d: null, at: 0, err: null, hist: {}, histSince: null, sub: null, stack: [], pending: {}, clock: null,

  level(){ return (cfg.code || '').trim() === '9445' ? 2 : 1; }, // Datenzugang.setZugang(): lokal geprüft
  P(i){ return this.d && this.d.params[i] !== undefined ? this.d.params[i] : 0; },
  C(i){ return this.d && this.d.calc[i] !== undefined ? this.d.calc[i] : 0; },
  V(i){ if (i === -2) return false; if (i === -1) return true; return !!this.d && this.d.visi[i] === 1; }, // Connect.isVisible
  code(){ return this.C(78); },
  zp(){ return this.C(116) + 2 * this.C(172); },                                              // Zusatzplatinen

  async read(){
    const d = await JB.call('read');
    if (d && d.params && d.calc) {
      this.d = d; this.at = Date.now(); this.err = null;
      if (!this.histSince) { const t = new Date(); this.histSince = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ' Uhr'; }
      [10, 11, 12, 15, 17, 18, 19, 20, 189].forEach(id => { const h = this.hist[id] || (this.hist[id] = []); h.push(d.calc[id]); if (h.length > 120) h.shift(); });
      return d;
    }
    this.err = (d && d.error) || 'keine Daten';
    return null;
  },

  /* ---------- Schreiben: Liste wie storeParameter() – unveränderte Werte werden übersprungen ---------- */
  async commit(title, builder){
    const fresh = await this.read();
    if (!fresh) { toast('Lesen fehlgeschlagen: ' + this.err); return false; }
    const sim = fresh.params.slice();
    const P = i => sim[i] !== undefined ? sim[i] : 0;
    let list;
    try { list = builder(P, i => fresh.calc[i] || 0, sim); }
    catch (e) { toast(e.message); return false; }
    const writes = [];
    for (const w of list) {
      if (w.id < 0 || !Number.isInteger(w.val)) continue;
      if (P(w.id) !== w.val) { writes.push(Object.assign({ old: P(w.id) }, w)); sim[w.id] = w.val; }
    }
    if (!writes.length) { toast('Keine Änderung'); this.pending = {}; app.render(); return false; }
    const ok = await this.confirm(title, writes);
    if (!ok) return false;
    setDot('busy');
    const res = await JB.call('write', { port: fresh.port, pairs: writes.flatMap(w => [w.id, w.val]) });
    if (res.error) toast('Fehler: ' + res.error + (res.ok ? ' (' + res.ok + ' geschrieben)' : ''));
    else toast('Gespeichert (' + res.ok + ' Parameter)');
    this.pending = {};
    await this.read(); setDot(this.d ? 'ok' : 'err');
    app.render();
    return !res.error;
  },
  confirm(title, writes){
    return new Promise(resolve => {
      const sh = $('#sheet');
      sh.innerHTML = `<h3>${esc(title)}</h3><div class="muted" style="font-size:13px;margin-bottom:8px">Folgende Parameter werden an die Wärmepumpe gesendet:</div>
        <div class="card" style="box-shadow:none;border:1px solid var(--line)">${writes.map(w => `<div class="li"><span class="k">${esc(w.label || ('Parameter ' + w.id))}<br><span class="muted" style="font-size:12px">P${w.id}</span></span><span class="v">${esc(w.fmt ? w.fmt(w.old) : w.old)} → <b style="color:var(--text)">${esc(w.fmt ? w.fmt(w.val) : w.val)}</b></span></div>`).join('')}</div>
        <div class="actions"><button class="btn sec" id="bc">Abbrechen</button><button class="btn" id="bo">Senden</button></div>`;
      $('#scrim').classList.add('open');
      const close = v => { $('#scrim').classList.remove('open'); sh.innerHTML = ''; resolve(v); };
      $('#bc').onclick = () => close(false);
      $('#bo').onclick = () => close(true);
    });
  },

  /* ---------- Feld-Helfer ---------- */
  numField(key, label, raw, min, max, step, div, unit, opts = {}){
    return Object.assign({ key, label, kind: 'num', raw, min, max, step, div, unit }, opts);
  },
  optField(key, label, raw, options, opts = {}){ return Object.assign({ key, label, kind: 'opt', raw, options }, opts); },
  cur(f){ return f.key in this.pending ? this.pending[f.key] : f.raw; },
  show(f){
    const r = this.cur(f);
    if (f.kind === 'num') return fmtNum(r, f.div, f.unit);
    if (f.kind === 'time') return fmtHM(r);
    if (f.kind === 'bool') return r ? T('Text_Ja') : T('Text_Nein');
    const o = f.options.find(x => x.v === r);
    return o ? o.l : String(r);
  },

  /* ---------- Seiten ---------- */
  pageDash(){
    const C = i => this.C(i);
    const rows = [];
    const info = id => { for (const g of LUX_INFO) { const e = g.items.find(x => x.id === id && x.t === 'num'); if (e) return e; } return null; };
    const tile = (id, cls) => { const e = info(id); if (!e || !this.infoVisible(e)) return '';
      return `<div class="tile ${cls}"><div class="k">${esc(e.n)}</div><div class="v">${esc((C(id) / e.f).toFixed(1).replace('.', ','))}<small>${esc(e.u)}</small></div>${this.spark(id)}</div>`; };
    const state = this.betrZust();
    let h = `<div class="hero"><div><div class="lbl">${esc(T('Text_Aussent'))}</div><div class="big">${esc((C(15) / 10).toFixed(1).replace('.', ','))}<span style="font-size:22px">°C</span></div></div>
      <div class="state"><span class="lbl">${esc(T('Text_Betr_Zust'))}</span><b>${esc(state)}</b>${this.outChips()}</div></div>`;
    h += `<div class="hint" style="margin:0 2px 6px">${this.histSince ? 'Verlauf seit ' + this.histSince : 'Verlauf wird aufgezeichnet …'}</div><div class="grid">${tile(10, 'hot')}${tile(189, '')}${tile(11, 'cold')}${tile(12, '')}${tile(17, 'hot')}${tile(18, '')}${tile(19, 'cold')}${tile(20, 'cold')}</div>`;
    const quick = [this.fHzMode(), this.fTempPM(), this.fWWMode()];
    if (this.P(82) === 0) quick.push(this.fWWSoll());
    h += `<h2>${esc(T('Text_Betriebsart'))}</h2>` + this.cardFields(quick, [{ link: 'prio', label: T('Text_Prioritaten'), value: this.prioSummary() }]);
    h += this.eventCards(3);
    h += `<div class="upd">Stand ${new Date(this.at).toLocaleTimeString('de-DE')} · Java-Schnittstelle Port ${this.d.port} · Zugang: ${this.level() >= 2 ? 'Installateur' : 'Benutzer'}</div>`;
    return h;
  },
  /* Sparkline wie AquaControl-Dashboard: Verlauf der letzten Abfragen (min…max) */
  spark(id){
    const a = this.hist[id] || [];
    if (a.length < 2) return '<svg class="spark" viewBox="0 0 100 34" preserveAspectRatio="none"></svg>';
    let lo = Math.min(...a), hi = Math.max(...a); if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
    const path = a.map((v, i) => (i ? 'L' : 'M') + (i / 119 * 100).toFixed(1) + ' ' + (30 - (v - lo) / (hi - lo) * 26).toFixed(1)).join('');
    return `<svg class="spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-label="Verlauf ${(lo / 10).toFixed(1)} bis ${(hi / 10).toFixed(1)}"><path d="${path}"/></svg>`;
  },
  /* Ausgänge Verdichter 1 (calc 44) und ZWE 1 (calc 48) wie in service.Informationen (Ein/Aus) */
  outChips(){
    const outs = (LUX_INFO.find(g => g.items.some(e => e.id === 44 && e.t === 'onoff')) || { items: [] }).items
      .filter(e => e.t === 'onoff' && (e.id === 44 || e.id === 48));
    return `<div class="ochips">` + outs.map(e => { const on = this.C(e.id) !== 0;
      return `<span class="ochip${on ? ' on' : ''}"><span class="odot"></span>${esc(e.n)} ${on ? T('Text_Ein') : T('Text_Aus')}</span>`; }).join('') + `</div>`;
  },
  betrZust(){
    const isSEC = this.code() === 55;
    let v = isSEC ? this.C(191) : this.C(80);
    let list = ['Text_Heizen', 'Text_Warmwasser', this.P(976) > 0 ? 'Text_Photovoltaik' : 'Text_Schwimmbad', 'Text_EVU', 'Text_Abtauen', 'Text_KeineAnforderung', 'Text_Ext_Energ', 'Text_Kuhlbetrieb'];
    if (isSEC) { if (v !== 2) list = ['Text_Aus', 'Text_Kuhlung', 'Text_Heizung', 'Text_Stoerung', 'Text_Ubergang', 'Text_Abtauen', 'Text_Warte', 'Text_Warte', 'Text_Ubergang', 'Text_Stop', 'Text_Manuell', 'Text_Sim_START', 'Text_EVUSperre']; else v = this.C(80); }
    return list[v] ? T(list[v]) : String(v);
  },
  eventCards(n){
    const errs = [], offs = [];
    for (let i = 0; i < Math.min(5, this.C(105)); i++) { const code = this.C(100 + i); if (code > 0) errs.push({ ts: this.C(95 + i), code }); }
    for (let i = 0; i < 5; i++) { const code = this.C(106 + i), ts = this.C(111 + i); if (ts > 0) offs.push({ ts, code }); }
    errs.sort((a, b) => b.ts - a.ts); offs.sort((a, b) => b.ts - a.ts);
    const errTxt = c => c > 700 && c < 701 + LUX_FEHLER.length ? c + ' – ' + LUX_FEHLER[c - 701] : c + ' – No Error';
    const offTxt = c => c < LUX_ABSCH.length ? LUX_ABSCH[c] : c + ' – No Shutdown';
    const card = (t, l, f) => l.length ? `<h2>${esc(t)}</h2><div class="card">` + l.slice(0, n).map(e => `<div class="li"><span class="k">${esc(f(e.code))}</span><span class="v">${esc(fmtTs(e.ts))}</span></div>`).join('') + `</div>` : '';
    return card(T('Text_Fehlerspeicher'), errs, errTxt) + card(T('Text_Abschaltungen'), offs, offTxt);
  },

  /* Heizung.jcbHZBetriebsart: Anzeige-Index <- Parameter 3 */
  fHzMode(){
    const map = { 0: 0, 1: 3, 2: 1, 3: 2, 4: 4 };
    const opts = ['Text_Automatik', 'Text_Party', 'Text_Ferien', 'Text_Zweit_Warmeerz', 'Text_Aus'].map((k, i) => ({ v: i, l: T(k), disabled: i === 2 }));
    return this.optField('hzmode', T('Text_Heizung'), map[this.P(3)] ?? 0, opts, { immediate: sel => this.commit(T('Text_Heizung') + ': ' + opts[sel].l, P => this.wHzMode(sel, P)) });
  },
  /* Heizung.jcbHZBetriebsartActionPerformed() */
  wHzMode(sel, P){
    const out = [], lbl = 'Begleitparameter';
    const clr = id => { if (P(id) === 1) out.push({ id, val: 0, label: lbl }); };
    const mode = v => ({ id: 3, val: v, label: T('Text_Betriebsart') + ' ' + T('Text_Heizung'), fmt: x => this.modeName(x) });
    if (sel === 2) throw new Error('Ferien bitte am Bedienteil einstellen');
    [739, 742, 743, 784].forEach(clr);
    if (sel !== 4 && this.C(116) === 0) out.push({ id: 108, val: 0, label: lbl });
    if (sel === 0) out.push(mode(0), { id: 695, val: 0, label: lbl }, { id: 696, val: 0, label: 'Betriebsart MK2' }, { id: 779, val: 0, label: 'Betriebsart MK3' });
    if (sel === 1) out.push(mode(2), { id: 695, val: 2, label: lbl }, { id: 696, val: 2, label: 'Betriebsart MK2' }, { id: 779, val: 2, label: 'Betriebsart MK3' });
    if (sel === 3) out.push(mode(1));
    if (sel === 4) out.push(mode(4), { id: 695, val: 4, label: lbl }, { id: 696, val: 4, label: 'Betriebsart MK2' }, { id: 779, val: 4, label: 'Betriebsart MK3' });
    return out;
  },
  modeName(v){ return T(['Text_Automatik', 'Text_Zweit_Warmeerz', 'Text_Party', 'Text_Ferien', 'Text_Aus'][v] || '') || String(v); },
  /* Heizung.jcbMK2/MK3BetriebsartActionPerformed() */
  fMkMode(nr, param, flag){
    const map = { 0: 0, 2: 1, 3: 2, 4: 3 };
    const opts = ['Text_Automatik', 'Text_Party', 'Text_Ferien', 'Text_Aus'].map((k, i) => ({ v: i, l: T(k), disabled: i === 2 }));
    const vals = [0, 2, null, 4];
    return this.optField('mk' + nr, T('Text_Betriebsart'), map[this.P(param)] ?? 0, opts, {
      immediate: sel => this.commit(T('Text_Mischkreis' + nr) + ': ' + opts[sel].l, P => {
        if (sel === 2) throw new Error('Ferien bitte am Bedienteil einstellen');
        const o = []; if (P(flag) === 1) o.push({ id: flag, val: 0, label: 'Begleitparameter' });
        o.push({ id: param, val: vals[sel], label: T('Text_Betriebsart') + ' ' + T('Text_Mischkreis' + nr), fmt: x => this.modeName(x) }); return o;
      })
    });
  },
  /* Warmwasser.jcbWarmwasserBetriebsart */
  fWWMode(){
    const map = { 0: 0, 1: 3, 2: 1, 3: 2, 4: 4 };
    const opts = ['Text_Automatik', 'Text_Party', 'Text_Ferien', 'Text_Zweit_Warmeerz', 'Text_Aus'].map((k, i) => ({ v: i, l: T(k), disabled: i === 2 }));
    const vals = [0, 2, null, 1, 4];
    return this.optField('wwmode', T('Text_Warmwasser'), map[this.P(4)] ?? 0, opts, {
      immediate: sel => this.commit(T('Text_Warmwasser') + ': ' + opts[sel].l, P => {
        if (sel === 2) throw new Error('Ferien bitte am Bedienteil einstellen');
        const o = []; if (P(740) === 1) o.push({ id: 740, val: 0, label: 'Begleitparameter' });
        o.push({ id: 4, val: vals[sel], label: T('Text_Betriebsart') + ' ' + T('Text_Warmwasser'), fmt: x => this.modeName(x) }); return o;
      })
    });
  },
  /* Heizung.tempSlider: Parameter 1 = Schieber * 5 (−10…10) */
  fTempPM(){
    return this.numField('tpm', 'Temperatur +-', Math.max(-50, Math.min(50, this.P(1))), -50, 50, 5, 10, 'K', {
      immediate: raw => this.commit('Temperatur +-', () => [{ id: 1, val: raw, label: 'Temperatur +- Heizung', fmt: x => fmtNum(x, 10, 'K') }])
    });
  },
  /* Warmwasser.jSpinner1: Start = Ist-Soll (calc 18), 30 … Param 973, Schritt 0,5; schreibt 2 und 105 */
  fWWSoll(){
    const max = this.P(973) || 650;
    const raw = Math.max(300, Math.min(max, Math.round(this.C(18) / 5) * 5));
    return this.numField('wwsoll', T('Text_BW_Soll'), raw, 300, max, 5, 10, '°C', {
      immediate: v => this.commit(T('Text_BW_Soll'), () => [
        { id: 2, val: v, label: T('Text_BW_Soll'), fmt: x => fmtNum(x, 10, '°C') },
        { id: 105, val: v, label: 'Warmwasser-Soll aktiv (P105, setzt das Applet mit)', fmt: x => fmtNum(x, 10, '°C') }])
    });
  },

  pageHeizung(){
    const C = i => this.C(i), P = i => this.P(i);
    let h = '';
    const temps = [[this.P(35) === 0 && this.V(24) ? 13 : 11, T('Text_Rucklauf')], [12, T('Text_RL_Soll')]];
    h += `<div class="grid">` + temps.map(([id, n]) => `<div class="tile"><div class="k">${esc(n)}</div><div class="v">${(C(id) / 10).toFixed(1).replace('.', ',')}<small>°C</small></div></div>`).join('') + `</div>`;
    h += `<h2>${esc(T('Text_Heizkreis'))}</h2>` + this.cardFields([this.fHzMode(), this.fTempPM()], [
      { link: 'curve:0', label: T('Text_Heizkurven'), value: P(103) === 1 ? T('Text_Festt') : T('Text_ATAbh') },
      { link: 'clock:hk', label: T('Text_Schaltuhren') }].concat(this.V(181) ? [{ link: 'hgrenze', label: T('Text_Heizgrenze'), value: fmtNum(P(700), 10, '°C') }] : []));
    const mks = [[1, 5, 21, 22, 120, 'curve:1', 'clock:mk1'], [2, 6, 24, 25, 121, 'curve:2', 'clock:mk2'], [3, 209, 137, 136, 781, 'curve:3', 'clock:mk3']];
    mks.forEach(([nr, vis, ist, soll, rtyp, cl, ck]) => {
      if (!this.V(vis)) return;
      const fields = nr === 1 ? [] : [nr === 2 ? this.fMkMode(2, 696, 743) : this.fMkMode(3, 779, 784)];
      h += `<h2>${esc(T('Text_Mischkreis' + nr))}</h2><div class="grid"><div class="tile"><div class="k">${esc(T('Text_Vorlauf'))}</div><div class="v">${(C(ist) / 10).toFixed(1).replace('.', ',')}<small>°C</small></div></div><div class="tile"><div class="k">Soll</div><div class="v">${(C(soll) / 10).toFixed(1).replace('.', ',')}<small>°C</small></div></div></div>`
        + this.cardFields(fields, [{ link: cl, label: T('Text_Heizkurven'), value: P(rtyp) === 1 ? T('Text_Festt') : T('Text_ATAbh') }, { link: ck, label: T('Text_Schaltuhren') }]);
    });
    return h;
  },

  /* heizung.Heizkurven / HeizkurvenFest */
  pageCurve(k){
    const rt = [103, 120, 121, 781][k];
    const name = k === 0 ? T('Text_Heizkreis') : T('Text_Mischkreis' + k);
    if (this.P(rt) === 1) {
      const id = [17, 18, 145, 778][k];
      const f = this.numField('fest' + k, k === 0 ? T('Text_Rucklauf') : T('Text_Vorlauf'), this.P(id), 200, 650, 5, 10, '°C', { pid: id });
      return { title: T('Text_Heizkurven') + ' ' + name, html: `<h2>${esc(T('Text_FestwerteHK'))}</h2>` + this.cardFields([f]), fields: [f],
        send: () => [{ id, val: this.cur(f), label: f.label, fmt: x => fmtNum(x, 10, '°C') }] };
    }
    const ids = [[11, 12, 13], [14, 15, 16], [141, 142, 143], [774, 775, 776]][k];
    const fs = [
      this.numField('e' + k, T('Text_Endpunkt') + ' (bei −20 °C)', this.P(ids[0]), 200, 700, 5, 10, '°C', { pid: ids[0] }),
      this.numField('p' + k, T('Text_Parallelverschiebung'), this.P(ids[1]), 50, 350, 5, 10, '°C', { pid: ids[1] }),
      this.numField('n' + k, T('Text_Nachtabsenkung'), this.P(ids[2]), -150, 100, 5, 10, 'K', { pid: ids[2] })];
    /* Heizkurven.HeizkurveBerrechnung() */
    const wk = this.cur(fs[1]) / 10, hke = this.cur(fs[0]) / 10;
    const soll = at => wk + (hke - 20) * (wk - at) / (20 - (at - wk) / 2);
    const at = this.C(15) / 10;
    const pts = [-20, -10, 0, 10, 20].map(t => `<div class="li"><span class="k">Außen ${t} °C</span><span class="v">${soll(t).toFixed(1).replace('.', ',')} °C</span></div>`).join('');
    const html = this.cardFields(fs) + `<h2>Berechnete Rücklauf-Solltemperatur</h2><div class="card"><div class="li"><span class="k"><b>Jetzt (Außen ${at.toFixed(1).replace('.', ',')} °C)</b></span><span class="v"><b>${soll(at).toFixed(1).replace('.', ',')} °C</b></span></div>${pts}</div>`;
    return { title: T('Text_Heizkurven') + ' ' + name, html, fields: fs,
      send: () => fs.map((f, i) => ({ id: ids[i], val: this.cur(f), label: f.label, fmt: x => fmtNum(x, 10, f.unit) })) };
  },
  /* einstellung.Prioritaeten: Rang 1…N für Heizung (P116), Warmwasser (P117), Schwimmbad/PV (P118) */
  prioItems(){
    const it = [];
    if (this.V(1)) it.push({ k: 'bw', pid: 117, label: T('Text_Brauchwarmwasser') });
    if (this.V(0)) it.push({ k: 'hz', pid: 116, label: T('Text_Heizung') });
    if (this.V(2)) it.push({ k: 'sw', pid: 118, label: this.P(976) > 0 ? T('Text_Photovoltaik') : T('Text_Schwimmbad') });
    return it;
  },
  /* Prioritaeten.Load_Prioritaeten_Kopie() */
  prioLoad(){
    const P = i => this.P(i);
    switch (P(28)) {
      case 0: return { hz: 1, bw: 2, sw: 3 };
      case 1: return { hz: 2, bw: 1, sw: 3 };
      case 3: return { hz: 3, bw: 2, sw: 1 };
      case 2: return { hz: P(116), bw: P(117), sw: 3 };
      case 4: return { hz: P(116), bw: 3, sw: P(118) };
      case 5: return { hz: 3, bw: P(117), sw: P(118) };
      case 6: return { hz: P(116), bw: P(117), sw: P(118) };
    }
    return { hz: P(116), bw: P(117), sw: P(118) };
  },
  prioCur(){ const b = this.prioLoad(); return { hz: this.pending.prio_hz ?? b.hz, bw: this.pending.prio_bw ?? b.bw, sw: this.pending.prio_sw ?? b.sw }; },
  prioSummary(){
    const c = this.prioLoad();
    return this.prioItems().slice().sort((a, b) => c[a.k] - c[b.k]).map(i => i.label).join(' › ');
  },
  /* Prioritaeten.ClickrButtonHZ/BW/Swb(): gewählten Rang setzen, die anderen nach IncrDectParam weiterschieben */
  prioSet(k, v){
    const n = this.prioItems().length, c = this.prioCur();
    const inc = x => x >= n ? 1 : x + 1;
    c[k] = v;
    const fix = o => { let guard = 0; while ((c[o] === c[k] || c[o] === c[['hz', 'bw', 'sw'].find(x => x !== k && x !== o)]) && guard++ < 10) c[o] = inc(c[o]); };
    const order = { bw: ['hz', 'sw'], hz: ['bw', 'sw'], sw: ['bw', 'hz'] }[k];
    order.forEach(fix);
    const base = this.prioLoad();
    ['hz', 'bw', 'sw'].forEach(x => { if (c[x] === base[x]) delete this.pending['prio_' + x]; else this.pending['prio_' + x] = c[x]; });
  },
  pagePrio(){
    const items = this.prioItems(), n = items.length, c = this.prioCur(), ro = this.level() < 2;
    const fs = items.map(i => ({ key: 'prio_' + i.k, label: i.label, kind: 'opt', pid: i.pid, raw: this.prioLoad()[i.k], ro,
      options: Array.from({ length: n }, (_, j) => ({ v: j + 1, l: 'Priorität ' + (j + 1) })), onSet: v => this.prioSet(i.k, v) }));
    const html = this.cardFields(fs) + `<div class="upd" style="text-align:left;padding:0 6px">1 = höchste Priorität. Wählst du einen Rang, rücken die anderen automatisch nach – wie im Applet (Service › Einstellungen › Prioritäten).${ro ? ' Ändern nur mit Installateur-Zugang.' : ''}</div>`;
    return { title: T('Text_Prioritaten'), html, fields: fs,
      /* Prioritaeten.ParameterSchreiben(): 116, 117, 118 */
      send: () => { const v = this.prioCur(); return [
        { id: 116, val: v.hz, label: T('Text_Heizung'), fmt: x => 'Priorität ' + x },
        { id: 117, val: v.bw, label: T('Text_Brauchwarmwasser'), fmt: x => 'Priorität ' + x },
        { id: 118, val: v.sw, label: this.P(976) > 0 ? T('Text_Photovoltaik') : T('Text_Schwimmbad'), fmt: x => 'Priorität ' + x }]; } };
  },

  /* heizung.Heizgrenze: Parameter 700, 5…30 °C, Schritt 1 */
  pageHgrenze(){
    const f = this.numField('hg', T('Text_Heizgrenze'), this.P(700), 50, 300, 10, 10, '°C');
    return { title: T('Text_Heizgrenze'), html: this.cardFields([f]), fields: [f], send: () => [{ id: 700, val: this.cur(f), label: f.label, fmt: x => fmtNum(x, 10, '°C') }] };
  },

  pageWarmwasser(){
    const C = i => this.C(i), P = i => this.P(i);
    let h = '';
    if (P(82) === 0) h += `<div class="grid"><div class="tile hot"><div class="k">${esc(T('Text_BW_Ist'))}</div><div class="v">${(C(17) / 10).toFixed(1).replace('.', ',')}<small>°C</small></div></div><div class="tile"><div class="k">${esc(T('Text_BW_Soll'))}</div><div class="v">${(C(18) / 10).toFixed(1).replace('.', ',')}<small>°C</small></div></div></div>`;
    else h += `<div class="card"><div class="li"><span class="k">${esc(T('Text_Therm'))}</span><span class="v">${C(30) === 1 ? T('Text_EIN') : T('Text_AUS')}</span></div></div>`;
    const quick = [this.fWWMode()];
    if (P(82) === 0) quick.push(this.fWWSoll());
    const links = [{ link: 'clock:ww', label: T('Text_Schaltuhren') }];
    if (this.V(8)) links.push({ link: 'clock:zirk', label: T('Text_Zirkulation') + ' – ' + T('Text_Schaltuhren') });
    if (this.level() >= 2 && (this.V(7) || this.V(8))) links.push({ link: 'wwexpert', label: T('Text_Therm_Desinfekt') + ' / ' + T('Text_Zirkulation') });
    h += `<h2>${esc(T('Text_Warmwasser'))}</h2>` + this.cardFields(quick, links);
    return h;
  },
  /* Warmwasser.WerteSpeichern() – Experten-Teil (TDI-Tage 20–27, Zirkulation 697/698) */
  pageWWExpert(){
    const fs = [];
    let html = '';
    if (this.V(7)) {
      const days = [['Text_Montag', 20], ['Text_Dienstag', 21], ['Text_Mittwoch', 22], ['Text_Donnerstag', 23], ['Text_Freitag', 24], ['Text_Samstag', 25], ['Text_Sonntag', 26], ['Text_Dauerbetrieb', 27]];
      const df = days.map(([k, id]) => ({ key: 'tdi' + id, label: T(k), kind: 'bool', raw: this.P(id) === 1 ? 1 : 0, pid: id,
        options: [{ v: 0, l: T('Text_Nein') }, { v: 1, l: T('Text_Ja') }] }));
      fs.push(...df); html += `<h2>${esc(T('Text_Therm_Desinfekt'))}</h2>` + this.cardFields(df);
    }
    if (this.V(8)) {
      const zf = [['Text_Zeit_Ein', 697], ['Text_Zeit_Aus', 698]].map(([k, id], i) => this.numField('zt' + id, T('Text_Zirkulation') + ' ' + T(k), this.P(id), i, 120, 5, 1, 'min', { pid: id, smallStep: true }));
      fs.push(...zf); html += `<h2>${esc(T('Text_Zirkulation'))}</h2>` + this.cardFields(zf);
    }
    return { title: T('Text_Warmwasser'), html, fields: fs,
      send: () => fs.map(f => ({ id: f.pid, val: this.cur(f), label: f.label, fmt: f.kind === 'bool' ? (x => x ? T('Text_Ja') : T('Text_Nein')) : (x => x + ' min') })) };
  },

  /* ---------- Service ---------- */
  pageService(){
    const links = [{ link: 'info', label: T('Text_Informationen') }, { link: 'clocks', label: T('Text_Schaltuhren') },
      { link: 'set:temp', label: T('Text_Einstellung') + ' › ' + T('Text_Temperaturen') }, { link: 'set:system', label: T('Text_System_Einstellung') }];
    if (this.V(220) || this.V(241)) links.push({ link: 'set:wmz', label: T('Text_WMZ_Effizienzp') });
    links.push({ link: 'zugang', label: T('Text_Datenzugang'), value: this.level() >= 2 ? T('Text_Installateur') : T('Text_Benutzer') });
    return this.cardFields([], links) + `<div class="upd">Anlage ${esc(LUX_WPTYP[this.code()] || this.code())} · Software ${esc(this.sw())} · Port ${this.d.port}</div>`;
  },
  sw(){ let s = ''; for (let i = 0; i < 10; i++) { const c = this.C(81 + i); if (!c) break; s += String.fromCharCode(c); } return s; },

  infoVisible(e){ if (!this.V(e.v)) return false; if (e.t === 'avg' && !this.V(e.pv)) return false; return true; },
  infoValue(e){
    const v = this.C(e.id);
    switch (e.t) {
      case 'num': { const f = e.f || 1; const val = f > 1 ? v / f : v; return (e.d != null ? val.toFixed(e.d) : f > 1 ? val.toFixed(Math.round(Math.log10(f))) : String(val)).replace('.', ',') + ' ' + (e.u || '').trim(); }
      case 'onoff': return v === 0 ? T('Text_Aus') : T('Text_Ein');
      case 'time': { const x = Math.abs(v); return (v < 0 ? '-' : '') + pad2(Math.floor(x / 3600)) + ':' + pad2(Math.floor(x % 3600 / 60)) + ':' + pad2(x % 60); }
      case 'int': return String(v);
      case 'hex': return v.toString(16).toUpperCase();
      case 'ip': return [v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255].join('.');
      case 'sw': { let s = ''; for (let i = 0; i < 10; i++) { const c = this.C(e.id + i); if (!c) break; s += String.fromCharCode(c); } return s; }
      case 'avg': { const p = this.C(e.p); if (!(p > 0)) return '–'; const a = Math.floor(v / p); return Math.floor(a / 3600) + ':' + pad2(Math.floor(a % 3600 / 60)) + ' h'; }
      case 'typ': return LUX_WPTYP[v] || String(v);
      case 'state': return this.betrZust();
    }
    return String(v);
  },
  pageInfo(){
    let h = '';
    const isSEC = this.code() === 55;
    LUX_INFO.forEach(g => {
      const rows = g.items.filter(e => this.infoVisible(e) && !(e.t === 'state' && (e.id === 191) !== isSEC));
      if (!rows.length) return;
      h += `<h2>${esc(g.g)}</h2><div class="card">` + rows.map(e => `<div class="li"><span class="k">${esc(e.n)}</span><span class="v">${esc(this.infoValue(e))}</span></div>`).join('') + `</div>`;
    });
    return h + this.eventCards(5);
  },

  /* generische Einstellungsseite (Set.BuildPanels + Einstellung) */
  setDefs(kind){
    const code = this.code(), zp = this.zp();
    const defs = kind === 'temp' ? setTemperaturen(code, i => this.P(i), this.level()) : kind === 'system' ? setSystem(code, zp) : setWMZ(code, zp);
    return defs.filter(d => !d.req || (kind === 'wmz') || (zp & d.req) > 0);   // Set.isValid(req)
  },
  defField(d){
    const ro = !(this.V(d.v) && this.level() >= d.a);                                 // Set.ZugriffeBauen()
    if (d.num) {
      const [min, max, step, fmt] = d.num; const [div, unit] = FMT[fmt] || [10, ''];
      return this.numField('s' + d.n, T(d.t), this.P(d.n), min, max, step, div, unit, { pid: d.n, ro, access: d.a });
    }
    /* Einstellung.getValue()/setValue(): Index (+Versatz) mit übersprungenen Werten */
    const idxToVal = i => { let v = i; (d.ign || []).forEach(g => { if (v >= g) v++; }); return v; };
    const opts = d.o.map((k, i) => ({ v: idxToVal(i), l: k.startsWith('#') ? k.slice(1) : T(k) }));
    return this.optField('s' + d.n, T(d.t), this.P(d.n), opts, { pid: d.n, ro, access: d.a });
  },
  pageSet(kind){
    const title = { temp: T('Text_Temperaturen'), system: T('Text_System_Einstellung'), wmz: T('Text_WMZ_Effizienzp') }[kind];
    const defs = this.setDefs(kind).filter(d => this.V(d.v));
    const fs = defs.map(d => this.defField(d));
    const html = this.cardFields(fs) + `<div class="upd">Ändern erlaubt ab Zugangsstufe der jeweiligen Zeile (aktuell: ${this.level() >= 2 ? 'Installateur' : 'Benutzer'}). Grau = nur lesen.</div>`;
    return { title, html, fields: fs, send: () => this.sendSet(kind, fs) };
  },
  /* Set.StoreParameters() inkl. Konfliktprüfung und Nacharbeiten der jeweiligen Seite */
  sendSet(kind, fs){
    const val = n => { const f = fs.find(x => x.pid === n); return f ? this.cur(f) : this.P(n); };
    const visVal = n => { const f = fs.find(x => x.pid === n); return f ? this.cur(f) : -1; };          // Set.getValue (nur sichtbare)
    if (kind === 'system') {
      const both = (a, b) => { const A = visVal(a), B = visVal(b); return A >= 0 && B >= 0 && (A > 0) !== (B > 0); };
      if (both(36, 37) || both(38, 39) || both(127, 128)) throw new Error(T('Text_Eingabeungultig') + ' (ZWE Art/Funktion)');
      const has = n => fs.some(f => f.pid === n), zp = this.zp();
      const rules = [];                                                                                  // Konflikte
      if (has(884)) rules.push([884, 0, [[130, 3, 0], [148, 1, 0], [137, 0, 0], [129, 1, 0]]]);
      if ((zp & 3) !== 3 && has(870)) rules.push([870, 0, [[33, 2, 1], [33, 3, 1], [103, 2, 1]]]);
      if (has(869) && zp !== 3) rules.push([869, 0, [[33, 2, 1], [33, 3, 1]]]);
      if (has(34)) rules.push([34, 6, [[891, 0, 2]]]);
      for (const [main, ok, subs] of rules) {
        const mv = val(main); if (mv === ok) continue;
        for (const [n, e, mode] of subs) {
          if (!has(n)) continue; const sv = val(n);
          if ((mode === 0 && sv !== e) || (mode === 1 && sv === e) || (mode === 2 && sv > mv))
            throw new Error(T('Text_Eingabeungultig') + ': ' + (fs.find(f => f.pid === main) || {}).label + ' ↔ ' + (fs.find(f => f.pid === n) || {}).label);
        }
      }
    }
    return (P, C, sim) => {
      const out = [];
      if (kind === 'temp') { const v973 = val(973); if (P(2) > v973) out.push({ id: 2, val: v973, label: T('Text_BW_Soll') + ' (auf Maximum begrenzt)', fmt: x => fmtNum(x, 10, '°C') }); }
      fs.forEach(f => { if (!f.ro && f.key in this.pending) out.push({ id: f.pid, val: this.cur(f), label: f.label, fmt: x => this.fmtField(f, x) }); });
      if (kind === 'temp') {
        const cft = out.find(w => w.id === 993) ? out.find(w => w.id === 993).val : P(993);
        [132, 133, 966].forEach(id => { if (P(id) < cft) out.push({ id, val: cft, label: 'Kühlung Mindestwert (an ' + T('Text_min_VL_Kuehl') + ' angepasst)', fmt: x => fmtNum(x, 10, '°C') }); });
      }
      if (kind === 'system') {
        const m = { 0: -90, 1: 30, 3: 10 }[val(975)];
        if (m !== undefined) out.push({ id: 93, val: m, label: T('Text_TWQmin') + ' (folgt ' + T('Text_Medium_WQ') + ')', fmt: x => fmtNum(x, 10, '°C') });
      }
      return out;
    };
  },
  fmtField(f, raw){ const save = this.pending[f.key]; this.pending[f.key] = raw; const s = this.show(f); if (save === undefined) delete this.pending[f.key]; else this.pending[f.key] = save; return s; },

  /* ---------- Schaltuhren (SU) ---------- */
  pageClocks(){
    return this.cardFields([], CLOCKS.filter(c => this.V(c.v)).map(c => ({ link: 'clock:' + c.id, label: T(c.t), value: [T('Text_WocheMOSA'), T('Text_5p2MOSA'), T('Text_TageMoDi')][this.P(c.off) % 3] })));
  },
  pageClock(id){
    const c = CLOCKS.find(x => x.id === id);
    const st = this.clock && this.clock.id === id ? this.clock : (this.clock = { id, type: this.P(c.off) % 3, night: false });
    const twin = this.P(c.off) > 2;
    const blocks = clockBlocks(st.type);
    let ptr = clockStart(c, st.type, st.night);
    const fs = [];
    let html = `<div class="card"><div class="li"><span class="k">Programm</span><span class="v"><select id="ckType" class="f" style="width:auto;padding:6px 8px">${[T('Text_WocheMOSA'), T('Text_5p2MOSA'), T('Text_TageMoDi')].map((l, i) => `<option value="${i}" ${i === st.type ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></span></div>`
      + (twin ? `<div class="li"><span class="k">Zeitsatz</span><span class="v"><select id="ckNight" class="f" style="width:auto;padding:6px 8px"><option value="0" ${!st.night ? 'selected' : ''}>1</option><option value="1" ${st.night ? 'selected' : ''}>2</option></select></span></div>` : '') + `</div>`;
    blocks.forEach(b => {
      const rows = [];
      for (let k = 0; k < c.ak; k++) {
        const fOn = { key: `ck${ptr}`, label: `${b} ${k + 1}) ${T('Text_Zeit_Ein')}`, kind: 'time', raw: this.P(ptr), pid: ptr };
        const fOff = { key: `ck${ptr + 1}`, label: `${b} ${k + 1}) ${T('Text_Zeit_Aus')}`, kind: 'time', raw: this.P(ptr + 1), pid: ptr + 1 };
        fs.push(fOn, fOff); rows.push([k, fOn, fOff]); ptr += 2;
      }
      html += `<h2>${esc(b)}</h2><div class="card">` + rows.map(([k, a, z]) => `<div class="li"><span class="k">${k + 1})</span><span class="v"><a class="tlink${a.key in this.pending ? ' chg' : ''}" data-f="${a.key}">${fmtHM(this.cur(a))}</a> – <a class="tlink${z.key in this.pending ? ' chg' : ''}" data-f="${z.key}">${fmtHM(this.cur(z))}</a></span></div>`).join('') + `</div>`;
    });
    html += `<div class="upd">00:00 – 00:00 = Kanal aus. Wechsel des Programms wird erst mit „Senden“ übernommen.</div>`;
    return { title: T(c.t) + ' – ' + T('Text_Schaltuhren'), html, fields: fs, clock: c,
      dirty: st.type !== this.P(c.off) % 3,
      /* SU.writeValues(): erst Typ, dann alle Zeiten des Blocks */
      send: () => [{ id: c.off, val: twin ? st.type + 3 : st.type, label: 'Programmart', fmt: x => [T('Text_WocheMOSA'), T('Text_5p2MOSA'), T('Text_TageMoDi')][x % 3] }]
        .concat(fs.map(f => ({ id: f.pid, val: this.cur(f), label: f.label, fmt: fmtHM }))) };
  },

  pageZugang(){
    return { title: T('Text_Datenzugang'), html: `<div class="card"><div class="li"><span class="k">Aktuell</span><span class="v">${this.level() >= 2 ? T('Text_Installateur') : T('Text_Benutzer')}</span></div></div>
      <div class="upd" style="text-align:left;padding:0 6px">Wie im Original-Applet (Datenzugang.setZugang) wird der Code nur in der App geprüft und nicht an die Wärmepumpe gesendet. Den Code änderst du unter Einstellungen → „Zugangscode Installateur“.</div>`, fields: [] };
  },

  /* ---------- Rendering ---------- */
  cardFields(fields, links = []){
    if (!fields.length && !links.length) return '';
    return `<div class="card">` + fields.map(f => {
      const can = !f.ro && cfg.allowEdit;
      const chg = f.key in this.pending;
      return `<div class="li${can ? ' edit' : ''}"${can ? ` data-jf="${esc(f.key)}"` : ''}><span class="k">${esc(f.label)}</span><span class="v"${chg ? ' style="color:var(--mid);font-weight:700"' : ''}>${esc(this.show(f))}</span>${can ? chev : ''}</div>`;
    }).join('') + links.map(l => `<div class="li nav" data-jl="${esc(l.link)}"><span class="k">${esc(l.label)}</span>${l.value ? `<span class="v">${esc(l.value)}</span>` : ''}${chev}</div>`).join('') + `</div>`;
  },

  /* aktuelle Ansicht: Tab-Seite oder Unterseite (this.sub) */
  view(tab){
    if (!this.d) return this.err ? '' : '<div class="center"><div class="spinner"></div><span class="muted">Lade Daten (Java-Schnittstelle)…</span></div>';
    this.fields = {};
    let html, page = null;
    if (this.sub) {
      const [k, a] = this.sub.split(':');
      page = k === 'curve' ? this.pageCurve(+a) : k === 'hgrenze' ? this.pageHgrenze() : k === 'prio' ? this.pagePrio() : k === 'wwexpert' ? this.pageWWExpert()
        : k === 'set' ? this.pageSet(a) : k === 'clock' ? this.pageClock(a) : k === 'zugang' ? this.pageZugang()
        : k === 'info' ? { title: T('Text_Informationen'), html: this.pageInfo(), fields: [] }
        : k === 'clocks' ? { title: T('Text_Schaltuhren'), html: this.pageClocks(), fields: [] } : null;
      if (!page) { this.sub = null; return this.view(tab); }
      this.page = page;
      const crumbs = `<nav class="pagenav"><a class="btn sec" data-jback="1">‹ Zurück</a><a class="btn sec" data-jhome="1">🏠 Startseite</a></nav>`;
      html = crumbs + page.html;
      (page.fields || []).forEach(f => this.fields[f.key] = f);
      const n = (page.fields || []).filter(f => f.key in this.pending).length + (page.dirty ? 1 : 0);
      if (page.send && cfg.allowEdit) html += `<div class="sendbar${n ? ' on' : ''}"><span>${n ? n + ' Änderung' + (n > 1 ? 'en' : '') : 'Keine Änderungen'}</span><button class="btn sec" data-jreset="1" ${n ? '' : 'disabled'}>Verwerfen</button><button class="btn" data-jsend="1" ${n ? '' : 'disabled'}>${esc(T('Text_Send'))}</button></div>`;
      $('#title').textContent = page.title;
    } else {
      this.page = null;
      html = tab === 'dash' ? this.pageDash() : tab === 'heiz' ? this.pageHeizung() : tab === 'ww' ? this.pageWarmwasser() : this.pageService();
      $('#title').textContent = { dash: 'Wärmepumpe', heiz: T('Text_Heizung'), ww: T('Text_Warmwasser'), service: T('Text_Service') }[tab] || 'Wärmepumpe';
    }
    return html;
  },
  collectFields(){
    // Felder der Tabseiten (Schnellzugriff) registrieren
    [this.fHzMode(), this.fWWMode(), this.fTempPM(), this.fWWSoll(), this.fMkMode(2, 696, 743), this.fMkMode(3, 779, 784)].forEach(f => { if (!this.fields[f.key]) this.fields[f.key] = f; });
  },
  bind(root){
    if (this.d) this.collectFields();
    root.querySelectorAll('[data-jf]').forEach(el => el.onclick = () => this.editField(this.fields[el.dataset.jf]));
    root.querySelectorAll('.tlink').forEach(el => el.onclick = () => this.editField(this.fields[el.dataset.f]));
    root.querySelectorAll('[data-jl]').forEach(el => el.onclick = () => { this.stack.push(this.sub); this.sub = el.dataset.jl; this.clock = null; window.scrollTo(0, 0); app.render(); });
    root.querySelectorAll('[data-jback]').forEach(el => el.onclick = () => this.back());
    root.querySelectorAll('[data-jhome]').forEach(el => el.onclick = () => app.show('dash'));
    root.querySelectorAll('[data-jreset]').forEach(el => el.onclick = () => { this.pending = {}; this.clock = null; app.render(); });
    root.querySelectorAll('[data-jsend]').forEach(el => el.onclick = () => this.send());
    const ty = root.querySelector('#ckType'); if (ty) ty.onchange = () => { this.clock.type = +ty.value; this.pending = {}; app.render(); };
    const ni = root.querySelector('#ckNight'); if (ni) ni.onchange = () => { this.clock.night = ni.value === '1'; this.pending = {}; app.render(); };
  },
  async send(){
    if (!this.page || !this.page.send) return;
    let builder;
    try { const r = this.page.send(); builder = typeof r === 'function' ? r : () => r; }
    catch (e) { toast(e.message); return; }
    await this.commit(this.page.title, builder);
  },
  back(){
    if (this.sub) {
      if (Object.keys(this.pending).length && !window.confirm('Ungesendete Änderungen verwerfen?')) return true;
      this.pending = {}; this.clock = null; this.sub = this.stack.pop() || null; app.render(); return true;
    }
    return false;
  },

  /* Bearbeiten-Dialog: Auswahl, Zahl (+/−), Uhrzeit, Ja/Nein */
  editField(f){
    if (!f || f.ro) return;
    const sh = $('#sheet');
    let h = `<h3>${esc(f.label)}</h3><div class="muted" style="font-size:13px">Aktuell: ${esc(this.show(f))}${f.pid != null ? ' · P' + f.pid : ''}</div>`;
    let get;
    if (f.kind === 'opt' || f.kind === 'bool') {
      const opts = f.options || [{ v: 0, l: T('Text_Nein') }, { v: 1, l: T('Text_Ja') }];
      const cur = this.cur(f);
      h += `<div style="margin-top:12px">` + opts.map(o => `<label class="opt"${o.disabled ? ' style="opacity:.45"' : ''}><input type="radio" name="o" value="${o.v}" ${o.v === cur ? 'checked' : ''} ${o.disabled ? 'disabled' : ''}><span>${esc(o.l)}${o.disabled ? ' (nur am Bedienteil)' : ''}</span></label>`).join('') + `</div>`;
      get = () => { const c = sh.querySelector('input[name=o]:checked'); return c ? +c.value : null; };
    } else if (f.kind === 'time') {
      let s = this.cur(f);
      h += `<div class="stepper"><select id="th" class="f" style="width:90px;font-size:22px">${Array.from({ length: 24 }, (_, i) => `<option ${i === Math.floor(s / 3600) ? 'selected' : ''}>${pad2(i)}</option>`).join('')}</select><span style="font-size:26px">:</span><select id="tm" class="f" style="width:90px;font-size:22px">${Array.from({ length: 60 }, (_, i) => `<option ${i === Math.floor(s % 3600 / 60) ? 'selected' : ''}>${pad2(i)}</option>`).join('')}</select></div>`;
      get = () => (+$('#th').value) * 3600 + (+$('#tm').value) * 60;
    } else {
      let raw = Math.max(f.min, Math.min(f.max, this.cur(f)));
      h += `<div class="stepper"><button id="sm">−</button><div class="val" id="sv">${esc(fmtNum(raw, f.div, f.unit))}</div><button id="sp">+</button></div><div class="muted center" style="padding:0;font-size:12.5px">Bereich ${esc(fmtNum(f.min, f.div, f.unit))} … ${esc(fmtNum(f.max, f.div, f.unit))}</div>`;
      setTimeout(() => {
        const st = () => f.smallStep && raw <= 10 ? 1 : f.step;   // Warmwasser: Schritt 1 bis 10 min, sonst 5
        const upd = () => $('#sv').textContent = fmtNum(raw, f.div, f.unit);
        $('#sm').onclick = () => { raw = Math.max(f.min, raw - st()); upd(); };
        $('#sp').onclick = () => { raw = Math.min(f.max, raw + st()); upd(); };
      });
      get = () => raw;
    }
    h += `<div class="actions"><button class="btn sec" id="bc">Abbrechen</button><button class="btn" id="bo">${f.immediate ? 'Weiter' : 'Übernehmen'}</button></div>`;
    sh.innerHTML = h; $('#scrim').classList.add('open');
    $('#bc').onclick = () => app.closeSheet();
    $('#bo').onclick = () => {
      const v = get(); if (v == null) return;
      $('#scrim').classList.remove('open'); sh.innerHTML = '';
      if (f.immediate) { if (v !== f.raw) f.immediate(v); else app.render(); return; }
      if (f.onSet) { f.onSet(v); app.render(); return; }
      if (v === f.raw) delete this.pending[f.key]; else this.pending[f.key] = v;
      app.render();
    };
  }
};
