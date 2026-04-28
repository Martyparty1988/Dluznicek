(() => {
  'use strict';

  const STORAGE_KEY = 'dluznicek.records.v1';
  const APP_VERSION = '2.0.0-pro-glass';
  const LOAN = 'loan';
  const PAYMENT = 'payment';

  const els = {
    totalBalance: document.getElementById('totalBalance'),
    balanceHint: document.getElementById('balanceHint'),
    totalLent: document.getElementById('totalLent'),
    totalPaid: document.getElementById('totalPaid'),
    activeDebtors: document.getElementById('activeDebtors'),
    debtorsPill: document.getElementById('debtorsPill'),
    debtorsList: document.getElementById('debtorsList'),
    recordsList: document.getElementById('recordsList'),
    form: document.getElementById('recordForm'),
    editId: document.getElementById('editId'),
    recordType: document.getElementById('recordType'),
    personInput: document.getElementById('personInput'),
    amountInput: document.getElementById('amountInput'),
    dateInput: document.getElementById('dateInput'),
    noteInput: document.getElementById('noteInput'),
    submitButton: document.getElementById('submitButton'),
    resetFormButton: document.getElementById('resetFormButton'),
    searchInput: document.getElementById('searchInput'),
    typeFilter: document.getElementById('typeFilter'),
    sortSelect: document.getElementById('sortSelect'),
    exportCsvButton: document.getElementById('exportCsvButton'),
    exportJsonButton: document.getElementById('exportJsonButton'),
    importJsonInput: document.getElementById('importJsonInput'),
    clearAllButton: document.getElementById('clearAllButton'),
    toast: document.getElementById('toast'),
    installButton: document.getElementById('installButton'),
    sheetOverlay: document.getElementById('sheetOverlay'),
    recordSheet: document.getElementById('recordSheet'),
    closeSheetButton: document.getElementById('closeSheetButton'),
    fabOpenButton: document.getElementById('fabOpenButton'),
    sheetTitle: document.getElementById('sheetTitle')
  };

  const state = {
    records: loadRecords(),
    deferredInstallPrompt: null
  };

  const moneyFormatter = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0
  });

  init();

  function init() {
    els.dateInput.value = todayISO();
    bindEvents();
    registerServiceWorker();
    render();
  }

  function bindEvents() {
    document.querySelectorAll('.segment').forEach((button) => {
      button.addEventListener('click', () => setType(button.dataset.type));
    });

    els.form.addEventListener('submit', handleSubmit);
    els.resetFormButton.addEventListener('click', resetForm);
    els.searchInput.addEventListener('input', renderRecords);
    els.typeFilter.addEventListener('change', renderRecords);
    els.sortSelect.addEventListener('change', renderRecords);
    els.exportCsvButton.addEventListener('click', exportCsv);
    els.exportJsonButton.addEventListener('click', exportJson);
    els.importJsonInput.addEventListener('change', importJson);
    els.clearAllButton.addEventListener('click', clearAllRecords);
    els.recordsList.addEventListener('click', handleRecordAction);
    els.debtorsList.addEventListener('click', handleDebtorAction);
    els.fabOpenButton.addEventListener('click', () => openSheet(LOAN));
    document.querySelectorAll('[data-open-sheet]').forEach((button) => {
      button.addEventListener('click', () => openSheet(button.dataset.openSheet || LOAN));
    });
    els.closeSheetButton.addEventListener('click', () => closeSheet());
    els.sheetOverlay.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-sheet]')) closeSheet();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !els.sheetOverlay.hidden) closeSheet();
    });

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      els.installButton.hidden = false;
    });

    els.installButton.addEventListener('click', async () => {
      if (!state.deferredInstallPrompt) return;
      state.deferredInstallPrompt.prompt();
      await state.deferredInstallPrompt.userChoice;
      state.deferredInstallPrompt = null;
      els.installButton.hidden = true;
    });
  }

  function loadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeRecord).filter(Boolean);
    } catch (error) {
      console.warn('Dlužníček neuměl přečíst uložená data:', error);
      return [];
    }
  }

  function saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== 'object') return null;
    const amount = Number(record.amount);
    const type = record.type === PAYMENT ? PAYMENT : LOAN;
    const person = cleanText(record.person || '').slice(0, 60);
    const note = cleanText(record.note || '').slice(0, 120);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(record.date || '') ? record.date : todayISO();
    if (!person || !Number.isFinite(amount) || amount <= 0) return null;
    const createdAt = record.createdAt || new Date().toISOString();
    return {
      id: String(record.id || cryptoRandomId()),
      type,
      person,
      amount: roundMoney(amount),
      note,
      date,
      createdAt,
      updatedAt: record.updatedAt || createdAt
    };
  }

  function handleSubmit(event) {
    event.preventDefault();

    const person = cleanText(els.personInput.value);
    const amount = parseAmount(els.amountInput.value);
    const date = els.dateInput.value;
    const note = cleanText(els.noteInput.value);
    const type = els.recordType.value === PAYMENT ? PAYMENT : LOAN;
    const editId = els.editId.value;

    if (!person) return showToast('Doplň jméno dlužníka, jinak účetní skřítek neví, koho strašit.', true);
    if (!amount) return showToast('Částka musí být větší než nula.', true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return showToast('Datum nevypadá správně.', true);

    if (editId) {
      const index = state.records.findIndex((record) => record.id === editId);
      if (index === -1) return showToast('Záznam už neexistuje.', true);
      state.records[index] = {
        ...state.records[index],
        type,
        person,
        amount,
        date,
        note,
        updatedAt: new Date().toISOString()
      };
      showToast('Záznam upraven. Dlužníček si přepočítal knír.');
    } else {
      state.records.unshift({
        id: cryptoRandomId(),
        type,
        person,
        amount,
        date,
        note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      showToast(type === LOAN ? 'Půjčka zapsaná. Peníze mají GPSku.' : 'Splátka zapsaná. Dlužník dostává plusové karmičky.');
    }

    saveRecords();
    render();
    closeSheet();
    window.setTimeout(() => resetForm(false), 380);
  }

  function setType(type) {
    const safeType = type === PAYMENT ? PAYMENT : LOAN;
    els.recordType.value = safeType;
    els.recordSheet.dataset.type = safeType;
    els.submitButton.dataset.type = safeType;
    if (!els.editId.value) {
      els.submitButton.textContent = safeType === PAYMENT ? 'Uložit splátku' : 'Uložit půjčku';
      els.sheetTitle.textContent = safeType === PAYMENT ? 'Nová splátka' : 'Nová půjčka';
    }
    document.querySelectorAll('.segment').forEach((button) => {
      const isActive = button.dataset.type === safeType;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-checked', String(isActive));
    });
  }

  function openSheet(type = LOAN, focusTarget = 'person') {
    setType(type);
    els.sheetOverlay.hidden = false;
    window.requestAnimationFrame(() => {
      els.sheetOverlay.classList.add('visible');
      document.body.classList.add('sheet-open');
    });
    window.setTimeout(() => {
      const target = focusTarget === 'amount' ? els.amountInput : els.personInput;
      target.focus({ preventScroll: true });
    }, 220);
  }

  function closeSheet() {
    els.sheetOverlay.classList.remove('visible');
    document.body.classList.remove('sheet-open');
    window.setTimeout(() => {
      if (!els.sheetOverlay.classList.contains('visible')) {
        els.sheetOverlay.hidden = true;
      }
    }, 360);
  }

  function resetForm(showMessage = true) {
    els.editId.value = '';
    els.form.reset();
    els.dateInput.value = todayISO();
    setType(LOAN);
    els.sheetTitle.textContent = 'Nový záznam';
    els.submitButton.textContent = 'Uložit půjčku';
    els.submitButton.dataset.type = LOAN;
    if (showMessage) showToast('Formulář je čistý jak účet po víkendu.');
  }

  function render() {
    const summary = calculateSummary(state.records);
    renderSummary(summary);
    renderDebtors(summary.people);
    renderRecords();
    els.clearAllButton.hidden = state.records.length === 0;
  }

  function renderSummary(summary) {
    els.totalBalance.textContent = formatMoney(summary.balance);
    els.totalBalance.classList.toggle('negative', summary.balance < 0);
    els.totalBalance.classList.toggle('zero', summary.balance === 0);
    els.totalLent.textContent = formatMoney(summary.totalLent);
    els.totalPaid.textContent = formatMoney(summary.totalPaid);
    els.activeDebtors.textContent = String(summary.activePeople);
    els.balanceHint.textContent = getBalanceHint(summary.balance, summary.activePeople);
  }

  function renderDebtors(people) {
    const list = Array.from(people.values())
      .filter((person) => Math.abs(person.balance) > 0.009)
      .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, 'cs'));

    els.debtorsPill.textContent = `${list.length} ${plural(list.length, 'člověk', 'lidé', 'lidí')}`;
    els.debtorsList.replaceChildren();

    if (!list.length) {
      els.debtorsList.append(emptyState('Nikdo nic nedluží', 'Tady je podezřelý klid. Buď jsi dobrák, nebo účetní ninja.'));
      return;
    }

    for (const person of list) {
      const card = document.createElement('article');
      card.className = 'debtor-card';

      const info = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'person-name';
      name.textContent = person.name;
      const meta = document.createElement('div');
      meta.className = 'person-meta';
      meta.textContent = `${person.count} ${plural(person.count, 'záznam', 'záznamy', 'záznamů')} • půjčeno ${formatMoney(person.lent)} • splaceno ${formatMoney(person.paid)}`;
      info.append(name, meta);

      const side = document.createElement('div');
      const balance = document.createElement('div');
      balance.className = `person-balance${person.balance < 0 ? ' negative' : ''}`;
      balance.textContent = formatMoney(person.balance);
      const actions = document.createElement('div');
      actions.className = 'debtor-actions';

      const payButton = document.createElement('button');
      payButton.type = 'button';
      payButton.className = 'ghost-button small';
      payButton.dataset.action = 'prefill-payment';
      payButton.dataset.person = person.name;
      payButton.textContent = 'Splácí';

      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.className = 'ghost-button small';
      copyButton.dataset.action = 'copy-reminder';
      copyButton.dataset.person = person.name;
      copyButton.dataset.balance = String(person.balance);
      copyButton.textContent = 'Připomenout';

      actions.append(payButton, copyButton);
      side.append(balance, actions);
      card.append(info, side);
      els.debtorsList.append(card);
    }
  }

  function renderRecords() {
    const filtered = getFilteredRecords();
    els.recordsList.replaceChildren();

    if (!state.records.length) {
      els.recordsList.append(emptyState('Zatím žádný záznam', 'Hoď sem první půjčku nebo splátku a Dlužníček začne počítat.'));
      return;
    }

    if (!filtered.length) {
      els.recordsList.append(emptyState('Nic nenalezeno', 'Filtr je přísnější než šéf v pondělí ráno.'));
      return;
    }

    for (const record of filtered) {
      els.recordsList.append(recordCard(record));
    }
  }

  function recordCard(record) {
    const card = document.createElement('article');
    card.className = 'record-card';
    card.dataset.id = record.id;

    const main = document.createElement('div');
    main.className = 'record-main';

    const left = document.createElement('div');
    const person = document.createElement('div');
    person.className = 'record-person';
    person.textContent = record.person;
    const note = document.createElement('p');
    note.className = 'record-note';
    note.textContent = record.note || 'Bez poznámky. Tajemství zůstává v trezoru.';
    left.append(person, note);

    const amount = document.createElement('div');
    amount.className = `record-amount ${record.type}`;
    amount.textContent = `${record.type === LOAN ? '+' : '−'} ${formatMoney(record.amount)}`;
    main.append(left, amount);

    const meta = document.createElement('div');
    meta.className = 'record-meta';
    const badge = document.createElement('span');
    badge.className = `type-badge ${record.type === PAYMENT ? 'payment' : ''}`;
    badge.textContent = record.type === LOAN ? 'Půjčka' : 'Splátka';
    const date = document.createElement('span');
    date.className = 'record-date';
    date.textContent = formatDate(record.date);
    meta.append(badge, date);

    const actions = document.createElement('div');
    actions.className = 'record-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'icon-button';
    edit.dataset.action = 'edit';
    edit.dataset.id = record.id;
    edit.textContent = 'Upravit';
    const duplicate = document.createElement('button');
    duplicate.type = 'button';
    duplicate.className = 'icon-button';
    duplicate.dataset.action = 'duplicate';
    duplicate.dataset.id = record.id;
    duplicate.textContent = 'Kopie';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'icon-button delete';
    del.dataset.action = 'delete';
    del.dataset.id = record.id;
    del.textContent = 'Smazat';
    actions.append(edit, duplicate, del);

    card.append(main, meta, actions);
    return card;
  }

  function handleRecordAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const record = state.records.find((item) => item.id === button.dataset.id);
    if (!record) return;

    if (button.dataset.action === 'edit') {
      els.editId.value = record.id;
      els.personInput.value = record.person;
      els.amountInput.value = String(record.amount).replace('.', ',');
      els.dateInput.value = record.date;
      els.noteInput.value = record.note;
      setType(record.type);
      els.sheetTitle.textContent = 'Upravit záznam';
      els.submitButton.textContent = 'Uložit úpravu';
      els.submitButton.dataset.type = record.type;
      openSheet(record.type, 'person');
    }

    if (button.dataset.action === 'duplicate') {
      const copy = {
        ...record,
        id: cryptoRandomId(),
        date: todayISO(),
        note: record.note ? `${record.note} – kopie` : 'Kopie záznamu',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.records.unshift(copy);
      saveRecords();
      render();
      showToast('Kopie hotová. Ctrl+C pro peníze bohužel pořád nefunguje.');
    }

    if (button.dataset.action === 'delete') {
      const ok = confirm(`Smazat záznam „${record.person} – ${formatMoney(record.amount)}“?`);
      if (!ok) return;
      state.records = state.records.filter((item) => item.id !== record.id);
      saveRecords();
      render();
      showToast('Záznam smazán. Skřítek zametl stopy.');
    }
  }

  function handleDebtorAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const person = button.dataset.person;

    if (button.dataset.action === 'prefill-payment') {
      resetForm(false);
      setType(PAYMENT);
      els.personInput.value = person;
      openSheet(PAYMENT, 'amount');
      showToast(`Splátka pro ${person} je připravená.`);
    }

    if (button.dataset.action === 'copy-reminder') {
      const balance = Number(button.dataset.balance || 0);
      const message = balance > 0
        ? `Čau ${person}, jen připomínám, že mi u Dlužníčka ještě svítí ${formatMoney(balance)}. Žádná panika, jen účetní skřítek už na mě kouká. 😄`
        : `Čau ${person}, koukám, že je u tebe v Dlužníčkovi přeplatek ${formatMoney(Math.abs(balance))}. To už je skoro finanční sci-fi. 😄`;
      copyToClipboard(message);
    }
  }

  function getFilteredRecords() {
    const search = cleanText(els.searchInput.value).toLowerCase();
    const typeFilter = els.typeFilter.value;
    const sort = els.sortSelect.value;

    const filtered = state.records.filter((record) => {
      const typeOk = typeFilter === 'all' || record.type === typeFilter;
      const haystack = `${record.person} ${record.note} ${record.amount} ${formatMoney(record.amount)} ${record.date}`.toLowerCase();
      return typeOk && (!search || haystack.includes(search));
    });

    filtered.sort((a, b) => {
      if (sort === 'oldest') return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      if (sort === 'amountDesc') return b.amount - a.amount || b.date.localeCompare(a.date);
      if (sort === 'amountAsc') return a.amount - b.amount || b.date.localeCompare(a.date);
      return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    });

    return filtered;
  }

  function calculateSummary(records) {
    const people = new Map();
    let totalLent = 0;
    let totalPaid = 0;

    for (const record of records) {
      const key = record.person.toLocaleLowerCase('cs-CZ');
      if (!people.has(key)) {
        people.set(key, { name: record.person, lent: 0, paid: 0, balance: 0, count: 0 });
      }
      const person = people.get(key);
      person.count += 1;
      if (record.type === LOAN) {
        totalLent += record.amount;
        person.lent += record.amount;
      } else {
        totalPaid += record.amount;
        person.paid += record.amount;
      }
      person.balance = roundMoney(person.lent - person.paid);
    }

    const balance = roundMoney(totalLent - totalPaid);
    const activePeople = Array.from(people.values()).filter((person) => person.balance > 0.009).length;

    return {
      totalLent: roundMoney(totalLent),
      totalPaid: roundMoney(totalPaid),
      balance,
      people,
      activePeople
    };
  }

  function exportCsv() {
    if (!state.records.length) return showToast('Není co exportovat.', true);
    const header = ['Datum', 'Typ', 'Jméno', 'Částka Kč', 'Poznámka'];
    const rows = state.records
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((record) => [
        record.date,
        record.type === LOAN ? 'Půjčka' : 'Splátka',
        record.person,
        String(record.amount).replace('.', ','),
        record.note
      ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\n');
    downloadFile(`dluznicek-export-${todayISO()}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
    showToast('CSV export připraven. Excel/Numbers už si brousí zuby.');
  }

  function exportJson() {
    if (!state.records.length) return showToast('Není co zálohovat.', true);
    const backup = {
      app: 'Dlužníček',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      records: state.records
    };
    downloadFile(`dluznicek-zaloha-${todayISO()}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
    showToast('Záloha hotová. Tohle je malý trezor v souboru.');
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(incoming)) throw new Error('Soubor neobsahuje pole records.');
      const normalized = incoming.map(normalizeRecord).filter(Boolean);
      if (!normalized.length) throw new Error('V souboru nejsou platné záznamy.');
      const replace = confirm(`Našel jsem ${normalized.length} záznamů. OK = nahradit současná data, Zrušit = jen přidat k současným.`);
      state.records = replace ? normalized : mergeRecords(state.records, normalized);
      saveRecords();
      render();
      showToast(`Import hotový: ${normalized.length} ${plural(normalized.length, 'záznam', 'záznamy', 'záznamů')}.`);
    } catch (error) {
      showToast(`Import se nepovedl: ${error.message}`, true);
    } finally {
      event.target.value = '';
    }
  }

  function clearAllRecords() {
    if (!state.records.length) return;
    const ok = confirm('Opravdu smazat všechny záznamy? Tohle už Dlužníček nerozdýchá bez zálohy.');
    if (!ok) return;
    state.records = [];
    saveRecords();
    render();
    closeSheet();
    window.setTimeout(() => resetForm(false), 380);
    showToast('Všechno smazáno. Finanční tabula rasa.');
  }

  function mergeRecords(current, incoming) {
    const map = new Map(current.map((record) => [record.id, record]));
    for (const record of incoming) {
      map.set(record.id, record);
    }
    return Array.from(map.values());
  }

  function parseAmount(value) {
    if (typeof value !== 'string') return null;
    const cleaned = value
      .trim()
      .replace(/\s+/g, '')
      .replace(/Kč/gi, '')
      .replace(/,/g, '.')
      .replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const parts = cleaned.split('.');
    const normalized = parts.length > 2 ? `${parts.slice(0, -1).join('')}.${parts.at(-1)}` : cleaned;
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return roundMoney(amount);
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function formatMoney(amount) {
    return moneyFormatter.format(Number(amount) || 0).replace(',00', '');
  }

  function formatDate(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    if (!year || !month || !day) return iso;
    return new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(year, month - 1, day));
  }

  function todayISO() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }

  function roundMoney(amount) {
    return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  }

  function cryptoRandomId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getBalanceHint(balance, activePeople) {
    if (balance === 0) return 'Účetní skřítek zatím spí. Nikdo nic, klid v peněžence.';
    if (balance > 0 && activePeople === 1) return 'Jeden dlužník na radaru. Peníze nejsou ztracené, jen na výletě.';
    if (balance > 0) return `${activePeople} ${plural(activePeople, 'dlužník', 'dlužníci', 'dlužníků')} na radaru. Dlužníček si brousí tužku.`;
    return 'Pozor, tady to vypadá na přeplatek. Někdo byl až moc poctivý.';
  }

  function plural(count, one, few, many) {
    const abs = Math.abs(Number(count));
    if (abs === 1) return one;
    if (abs >= 2 && abs <= 4) return few;
    return many;
  }

  function emptyState(title, text) {
    const wrap = document.createElement('div');
    wrap.className = 'empty-state';
    const inner = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    inner.append(strong, p);
    wrap.append(inner);
    return wrap;
  }

  function csvCell(value) {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.append(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      showToast('Připomínka zkopírovaná. Diplomatická atomovka připravena.');
    } catch (error) {
      showToast('Kopírování se nepovedlo. Prohlížeč dělá drahoty.', true);
    }
  }

  function showToast(message, isError = false) {
    els.toast.textContent = message;
    els.toast.classList.toggle('error', isError);
    els.toast.classList.add('visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.classList.remove('visible');
    }, 3_300);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch((error) => {
        console.warn('Service worker registrace nevyšla:', error);
      });
    });
  }

  window.DluznicekAudit = {
    parseAmount,
    calculateSummary,
    normalizeRecord,
    version: APP_VERSION
  };
})();
