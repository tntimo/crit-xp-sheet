// ═══════════════════════════════════════════
// XP TABLES
// ═══════════════════════════════════════════
const MANEUVER_XP   = { 'Routine':0,'Easy':5,'Light':10,'Medium':50,'Hard':100,'Very Hard':150,'Extremely Hard':200,'Sheer Folly':300,'Absurd':500 };
const MANEUVER_RISK = { 'None':0.5,'Some':1.0,'Peril':2.0,'Grave':3.0,'Extreme':4.0 };

const KILL_TABLE = {
  0: [50,45,40,35,30,25,20,15,10,5],
  1: [200,130,130,110,100,90,80,70,60,50],
  2: [250,200,150,130,110,100,90,80,70,60],
  3: [300,250,200,150,130,110,100,90,80,70],
  4: [350,300,250,200,150,130,110,100,90,80],
  5: [400,350,300,250,200,150,130,110,100,90],
  6: [450,400,350,300,250,200,150,130,110,100],
  7: [500,450,400,350,300,250,200,150,130,110],
  8: [550,500,450,400,350,300,250,200,150,130],
  9: [600,550,500,450,400,350,300,250,200,150],
};
function getKillXP(oppLevel, charLevel) {
  const ol = oppLevel === '10+' ? 10 : parseInt(oppLevel);
  const cl = charLevel;
  if (cl >= 10 || ol >= 10) return Math.max(200, 200 + 50 * (ol - cl));
  return (KILL_TABLE[ol] || [])[cl - 1] ?? 0;
}

const CRIT_DONE_BASE = [
  {A:3,  B:5,   C:8,   D:10,  E:13,  F:16},
  {A:5,  B:10,  C:15,  D:20,  E:25,  F:30},
  {A:10, B:20,  C:30,  D:40,  E:50,  F:60},
  {A:15, B:30,  C:45,  D:60,  E:75,  F:90},
  {A:20, B:40,  C:60,  D:80,  E:100, F:120},
  {A:25, B:50,  C:75,  D:100, E:125, F:150},
  {A:30, B:60,  C:90,  D:120, E:150, F:180},
  {A:35, B:70,  C:105, D:140, E:175, F:210},
  {A:40, B:80,  C:120, D:160, E:200, F:240},
  {A:45, B:90,  C:135, D:180, E:225, F:270},
  {A:50, B:100, C:150, D:200, E:250, F:300},
];
const CRIT_DONE_STEP = {A:5,B:10,C:15,D:20,E:25,F:30};
function getCritDoneXP(oppLevel, grade) {
  const ol   = parseInt(oppLevel) || 0;
  const row  = CRIT_DONE_BASE[Math.min(ol, 10)];
  const base = row[grade] ?? 0;
  const extra = Math.max(0, ol - 10) * (CRIT_DONE_STEP[grade] || 0);
  return base + extra;
}

const CRIT_RECV_TABLE = {A:100,B:200,C:300,D:400,E:500,F:600};

const SPELL_TABLE = [
  [100,90,80,70,60,50,40,30,20,10],
  [110,100,90,80,70,60,50,40,30,20],
  [120,110,100,90,80,70,60,50,40,30],
  [130,120,110,100,90,80,70,60,50,40],
  [140,130,120,110,100,90,80,70,60,50],
  [150,140,130,120,110,100,90,80,70,60],
  [160,150,140,130,120,110,100,90,80,70],
  [170,160,150,140,130,120,110,100,90,80],
  [180,170,160,150,140,130,120,110,100,90],
  [190,180,170,160,150,140,130,120,110,100],
];
function getSpellXP(spellLevel, casterLevel) {
  const sl = parseInt(spellLevel), cl = parseInt(casterLevel);
  if (sl >= 11 || cl >= 11) return Math.min(200, Math.max(0, 100 - 10 * (cl - sl)));
  return SPELL_TABLE[sl - 1][Math.min(cl - 1, 9)] ?? 0;
}

const DIFF_KEYS = {'Routine':'diff_routine','Easy':'diff_easy','Light':'diff_light','Medium':'diff_medium','Hard':'diff_hard','Very Hard':'diff_vhard','Extremely Hard':'diff_ehard','Sheer Folly':'diff_folly','Absurd':'diff_absurd'};
const RISK_KEYS = {'None':'risk_none','Some':'risk_some','Peril':'risk_peril','Grave':'risk_grave','Extreme':'risk_extreme'};

// ═══════════════════════════════════════════
// I18N  (lang/en.js and lang/it.js loaded before this file)
// ═══════════════════════════════════════════
const STRINGS = { en: LANG_EN, it: LANG_IT };

// ═══════════════════════════════════════════
// ALPINE COMPONENT
// ═══════════════════════════════════════════
function app() {
  return {
    lang: localStorage.getItem('cb_lang') || 'en',
    view: 'setup',
    characters: [],
    activeCharId: null,
    char: { id: null, name:'', cls:'', level:1, startXp:0, log:[] },
    modal: {
      open:false, type:null,
      diff:'Medium', risk:'Some',
      saveScore:100,
      grade:'A', oppLevel:'1',
      gradeRecv:'A',
      killOpp:'1',
      spellLvl:1, casterLvl:1,
      note:'',
    },
    filter: 'all',
    toastShow: false,
    toastMsg: '',
    _toastTimer: null,
    consentGiven: false,
    privacyOpen: false,

    // Static select data
    maneuverDiffs: [
      {v:'Routine',       k:'diff_routine', xp:0},
      {v:'Easy',          k:'diff_easy',    xp:5},
      {v:'Light',         k:'diff_light',   xp:10},
      {v:'Medium',        k:'diff_medium',  xp:50},
      {v:'Hard',          k:'diff_hard',    xp:100},
      {v:'Very Hard',     k:'diff_vhard',   xp:150},
      {v:'Extremely Hard',k:'diff_ehard',   xp:200},
      {v:'Sheer Folly',   k:'diff_folly',   xp:300},
      {v:'Absurd',        k:'diff_absurd',  xp:500},
    ],
    maneuverRisks: [
      {v:'None',    k:'risk_none',    mult:0.5},
      {v:'Some',    k:'risk_some',    mult:1.0},
      {v:'Peril',   k:'risk_peril',   mult:2.0},
      {v:'Grave',   k:'risk_grave',   mult:3.0},
      {v:'Extreme', k:'risk_extreme', mult:4.0},
    ],
    killLevels: [0,1,2,3,4,5,6,7,8,9,'10+'],

    init() {
      let chars = null;
      let activeId = null;
      try {
        const s = localStorage.getItem('cb_chars');
        chars = s ? JSON.parse(s) : null;
        activeId = parseInt(localStorage.getItem('cb_active_char')) || null;
      } catch(e) {}

      // Migrate from old single-character format
      if (!chars) {
        try {
          const s = localStorage.getItem('cb_state');
          const old = s ? JSON.parse(s) : null;
          if (old) {
            if (old.startCp !== undefined && old.startXp === undefined) {
              old.startXp = old.startCp; delete old.startCp;
            }
            old.id = Date.now();
            chars = [old];
            activeId = old.id;
            localStorage.removeItem('cb_state');
          }
        } catch(e) {}
      }

      if (chars && chars.length > 0) {
        this.characters = chars;
        const active = chars.find(c => c.id === activeId) || chars[0];
        this.activeCharId = active.id;
        this.char = { id: null, name:'', cls:'', level:1, startXp:0, log:[], ...active };
      }
      if (this.char.name) this.view = 'dashboard';
      this.consentGiven = localStorage.getItem('cb_consent') === '1';
    },

    acceptConsent() {
      localStorage.setItem('cb_consent', '1');
      this.consentGiven = true;
    },

    T(k) { return (STRINGS[this.lang] || STRINGS.en)[k] || k; },

    get langFlag() { return { en:'🇬🇧', it:'🇮🇹' }[this.lang]; },

    toggleLang() {
      this.lang = this.lang === 'en' ? 'it' : 'en';
      localStorage.setItem('cb_lang', this.lang);
    },

    saveState() {
      if (this.activeCharId) {
        const idx = this.characters.findIndex(c => c.id === this.activeCharId);
        if (idx >= 0) this.characters.splice(idx, 1, { ...this.char });
      }
      try { localStorage.setItem('cb_chars', JSON.stringify(this.characters)); } catch(e) {}
      if (this.activeCharId) {
        try { localStorage.setItem('cb_active_char', String(this.activeCharId)); } catch(e) {}
      }
    },

    saveCharacter() {
      this.char.level   = parseInt(this.char.level)   || 1;
      this.char.startXp = parseInt(this.char.startXp) || 0;
      if (!this.char.id) {
        this.char.id = Date.now();
        this.activeCharId = this.char.id;
        this.characters.push({ ...this.char });
      }
      this.saveState();
      this.showToast(this.T('setup_saved'));
      if (this.char.name) this.view = 'dashboard';
    },

    createCharacter() {
      if (this.activeCharId) this.saveState();
      this.char = { id: null, name:'', cls:'', level:1, startXp:0, log:[] };
      this.activeCharId = null;
    },

    switchCharacter(id) {
      if (id === this.activeCharId) return;
      this.saveState();
      const c = this.characters.find(ch => ch.id === id);
      if (!c) return;
      this.char = { id: null, name:'', cls:'', level:1, startXp:0, log:[], ...c };
      this.activeCharId = id;
      try { localStorage.setItem('cb_active_char', String(id)); } catch(e) {}
      if (this.char.name) this.view = 'dashboard';
    },

    deleteCharacter(id) {
      const c = this.characters.find(ch => ch.id === id);
      const name = c ? (c.name || '\u2014') : '\u2014';
      if (!confirm(this.T('delete_char_confirm').replace('{name}', name))) return;
      this.characters = this.characters.filter(ch => ch.id !== id);
      try { localStorage.setItem('cb_chars', JSON.stringify(this.characters)); } catch(e) {}
      if (id === this.activeCharId) {
        if (this.characters.length > 0) {
          const next = this.characters[0];
          this.char = { id: null, name:'', cls:'', level:1, startXp:0, log:[], ...next };
          this.activeCharId = next.id;
          try { localStorage.setItem('cb_active_char', String(next.id)); } catch(e) {}
          if (this.char.name) this.view = 'dashboard';
        } else {
          this.char = { id: null, name:'', cls:'', level:1, startXp:0, log:[] };
          this.activeCharId = null;
          localStorage.removeItem('cb_active_char');
          this.view = 'setup';
        }
      }
    },

    get totalXP() {
      return (parseInt(this.char.startXp) || 0) +
        this.char.log.filter(e => e.cat !== 'levelup').reduce((s, e) => s + (parseInt(e.xp) || 0), 0);
    },

    xpByCategory(cat) {
      return this.char.log.filter(e => e.cat === cat).reduce((s, e) => s + (parseInt(e.xp) || 0), 0);
    },

    openModal(type) {
      this.modal.type = type;
      this.modal.note = '';
      if (type === 'spell') this.modal.casterLvl = this.char.level;
      this.modal.open = true;
      document.body.style.overflow = 'hidden';
    },

    closeModal() {
      this.modal.open = false;
      document.body.style.overflow = '';
    },

    calcXP() {
      const m = this.modal;
      if (m.type === 'maneuver') return Math.round(MANEUVER_XP[m.diff] * MANEUVER_RISK[m.risk]);
      if (m.type === 'save')     { const v = parseInt(m.saveScore); return isNaN(v) ? null : v; }
      if (m.type === 'crit-done') return getCritDoneXP(m.oppLevel, m.grade);
      if (m.type === 'crit-recv') return CRIT_RECV_TABLE[m.gradeRecv];
      if (m.type === 'kill')     return getKillXP(String(m.killOpp), this.char.level);
      if (m.type === 'spell')    return getSpellXP(m.spellLvl, m.casterLvl);
      return null;
    },

    get xpPreview() { return this.calcXP(); },

    get xpPreviewDisplay() {
      const xp = this.xpPreview;
      if (xp === null || isNaN(xp)) return '\u2014';
      if (xp > 0) return String(xp);
      return '0';
    },

    get xpPreviewIsZero() {
      const xp = this.xpPreview;
      return xp === null || isNaN(xp) || xp === 0;
    },

    get confirmDisabled() {
      const xp = this.xpPreview;
      return xp === null || isNaN(xp);
    },

    get modalTitle() {
      const map = {
        maneuver:   this.T('modal_maneuver'),
        save:       this.T('modal_save'),
        'crit-done':this.T('modal_crit_done'),
        'crit-recv':this.T('modal_crit_recv'),
        kill:       this.T('modal_kill'),
        spell:      this.T('modal_spell'),
      };
      return map[this.modal.type] || '';
    },

    buildDescData() {
      const m = this.modal, type = m.type;
      if (type === 'maneuver')  return { type, diff:m.diff, risk:m.risk };
      if (type === 'save')      return { type, score:m.saveScore };
      if (type === 'crit-done') return { type, grade:m.grade, opp:m.oppLevel };
      if (type === 'crit-recv') return { type, grade:m.gradeRecv };
      if (type === 'kill')      return { type, opp:m.killOpp, you:this.char.level };
      if (type === 'spell')     return { type, spell:m.spellLvl, caster:m.casterLvl };
      return { type };
    },

    renderDesc(d) {
      if (!d) return '';
      if (d.type === 'maneuver')  return `${this.T('desc_maneuver')}: ${this.T(DIFF_KEYS[d.diff]||d.diff)} / ${this.T(RISK_KEYS[d.risk]||d.risk)}`;
      if (d.type === 'save')      return `${this.T('desc_save')}: ${d.score}`;
      if (d.type === 'crit-done') return `${this.T('desc_critd_grade')} ${d.grade} ${this.T('desc_critd_opp')} Lv${d.opp}`;
      if (d.type === 'crit-recv') return `${this.T('desc_critr_grade')} ${d.grade}`;
      if (d.type === 'kill')      return `${this.T('desc_kill')} Lv${d.opp} (${this.T('desc_kill_you')} ${d.you})`;
      if (d.type === 'spell')     return `${this.T('desc_spell')} Lv${d.spell} / ${this.T('desc_spell_caster')} Lv${d.caster}`;
      if (d.type === 'levelup')   return d.fallback || '';
      return '';
    },

    confirmXP() {
      const xp = this.xpPreview;
      if (xp === null) return;
      this.char.log.push({
        id: Date.now(),
        cat: this.modal.type,
        xp,
        descData: this.buildDescData(),
        note: this.modal.note || '',
        ts: new Date().toISOString(),
      });
      this.saveState();
      this.closeModal();
      this.showToast(`${xp} XP`);
    },

    deleteEntry(id) {
      this.char.log = this.char.log.filter(e => e.id !== id);
      this.saveState();
    },

    get filteredLog() {
      return [...this.char.log].reverse().filter(e => this.filter === 'all' || e.cat === this.filter);
    },

    catLabel(cat) {
      return ({
        maneuver:   this.T('cat_maneuver'),
        save:       this.T('cat_save'),
        'crit-done':this.T('cat_crit_done'),
        'crit-recv':this.T('cat_crit_recv'),
        kill:       this.T('cat_kill'),
        spell:      this.T('cat_spell'),
        levelup:    this.T('entry_levelup'),
      })[cat] || cat;
    },

    entryXpStr(e) {
      if (e.cat === 'levelup') return '';
      return String(parseInt(e.xp) || 0);
    },

    entryTime(e) {
      return new Date(e.ts).toLocaleString(
        this.lang === 'it' ? 'it-IT' : 'en-GB',
        { dateStyle:'short', timeStyle:'short' }
      );
    },

    showToast(msg) {
      this.toastMsg  = msg;
      this.toastShow = true;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { this.toastShow = false; }, 2500);
    },
  };
}
