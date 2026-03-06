// ========== APP CONTROLLER ==========

let currentModule = 'scm';

document.addEventListener('DOMContentLoaded', () => {
    // Apply saved language
    const savedLang = localStorage.getItem('shipment-marine-lang') || 'en';
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === savedLang));
    currentLang = savedLang;

    // Set initial header text from translations
    document.querySelector('.logo').innerHTML = t('appName');
    document.querySelector('[data-module="scm"]').textContent = t('scmModule');
    document.querySelector('[data-module="npm"]').textContent = t('npmModule');
    document.querySelector('.user-info').innerHTML = t('admin');
    document.querySelector('#scm-module .nav-item[data-view="scm-tug-list"] .nav-label').textContent = t('tugSchedules');
    document.querySelector('#scm-module .nav-item[data-view="scm-shipment-list"] .nav-label').textContent = t('shipments');
    document.querySelector('#scm-module .nav-item[data-view="scm-settlement"] .nav-label').textContent = t('settlement');
    document.querySelector('#npm-module .nav-item[data-view="npm-shipment-list"] .nav-label').textContent = t('containerShipments');
    document.querySelector('#npm-module .nav-item[data-view="npm-eir-list"] .nav-label').textContent = t('eir');
    document.querySelector('#npm-module .nav-item[data-view="npm-inspection"] .nav-label').textContent = t('containerInspection');

    // Module switcher
    document.querySelectorAll('.module-btn').forEach(btn => {
        btn.addEventListener('click', () => switchModule(btn.dataset.module));
    });

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            if (view.startsWith('scm-')) SCM.navigate(view);
            else if (view.startsWith('npm-')) NPM.navigate(view);
        });
    });

    // Modal close on overlay click
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Escape to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Initialize modules
    SCM.init();
    NPM.init();
});

function toggleSidebar(mod) {
    const sidebar = document.getElementById(`${mod}-sidebar`);
    sidebar.classList.toggle('collapsed');
    const btn = document.getElementById(`${mod}-toggle-btn`);
    btn.innerHTML = sidebar.classList.contains('collapsed') ? '&gt;' : '&lt;';
}

function switchModule(mod) {
    currentModule = mod;
    document.querySelectorAll('.module-btn').forEach(b => b.classList.toggle('active', b.dataset.module === mod));
    document.getElementById('scm-module').classList.toggle('hidden', mod !== 'scm');
    document.getElementById('npm-module').classList.toggle('hidden', mod !== 'npm');
}

// ========== SEARCHABLE SELECT (SS) ==========

function renderSS(id, options, selectedValue, onChangeFn) {
    const sel = options.find(o => String(o.value) === String(selectedValue));
    const items = options.map(o => {
        const isInactive = o.active === false;
        const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        const cb = onChangeFn ? `,'${onChangeFn}'` : '';
        return `<div class="ss-item${isInactive ? ' inactive' : ''}${String(o.value) === String(selectedValue) ? ' selected' : ''}"
            data-value="${esc(o.value)}" data-label="${esc(o.label)}"
            onclick="ssPick('${id}',this.dataset.value,this.dataset.label${cb})"
            >${o.label}${isInactive ? ' <em style="font-size:11px">(Inactive)</em>' : ''}</div>`;
    }).join('');
    const dispVal = sel ? sel.label.replace(/"/g, '&quot;') : '';
    return `<div class="ss-wrap" onclick="event.stopPropagation()">
        <input type="text" id="ss-search-${id}" value="${dispVal}"
            placeholder="Type to search..." autocomplete="off"
            onfocus="ssOpen('${id}')" oninput="ssFilter('${id}')">
        <input type="hidden" id="${id}" value="${selectedValue || ''}">
        <div class="ss-list hidden" id="ss-list-${id}">${items}</div>
    </div>`;
}

function ssOpen(id) {
    document.querySelectorAll('.ss-list').forEach(el => {
        if (el.id !== `ss-list-${id}`) el.classList.add('hidden');
    });
    const list = document.getElementById(`ss-list-${id}`);
    if (list) list.classList.remove('hidden');
}

function ssFilter(id) {
    const input = document.getElementById(`ss-search-${id}`);
    const list = document.getElementById(`ss-list-${id}`);
    if (!input || !list) return;
    const q = input.value.toLowerCase();
    list.querySelectorAll('.ss-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
    list.classList.remove('hidden');
}

function ssPick(id, value, label, onChangeFn) {
    const hidden = document.getElementById(id);
    const search = document.getElementById(`ss-search-${id}`);
    const list = document.getElementById(`ss-list-${id}`);
    if (hidden) hidden.value = value;
    if (search) search.value = label;
    if (list) {
        list.classList.add('hidden');
        list.querySelectorAll('.ss-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.value === value);
            el.style.display = '';
        });
    }
    if (onChangeFn && window[onChangeFn]) window[onChangeFn](value);
}

// Close all dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.ss-list').forEach(el => el.classList.add('hidden'));
});

// SCM-specific SS callbacks
function scmOnVesselChangeSS(vesselId) {
    const v = MASTERS.vessels.find(x => x.id === vesselId);
    const grtEl = document.getElementById('f-grt');
    const loaEl = document.getElementById('f-loa');
    if (grtEl) grtEl.value = v ? v.grt.toLocaleString() : '';
    if (loaEl) loaEl.value = v ? v.loa + ' m' : '';
}

function scmOnSiteChange(site) {
    const ports = getPortsForSite(site);
    const listEl = document.getElementById('ss-list-f-port');
    const hiddenEl = document.getElementById('f-port');
    const searchEl = document.getElementById('ss-search-f-port');
    if (!listEl) return;
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    listEl.innerHTML = ports.map(p => {
        const label = `${p.name} — ${p.desc}`;
        return `<div class="ss-item" data-value="${p.id}" data-label="${esc(label)}"
            onclick="ssPick('f-port',this.dataset.value,this.dataset.label)">${label}</div>`;
    }).join('');
    if (hiddenEl) hiddenEl.value = '';
    if (searchEl) searchEl.value = '';
}

function scmGetBOMPreviewHTML(serviceId) {
    const service = MASTERS.services.find(s => s.id === serviceId);
    if (!service) return '';
    return `<div style="margin-top:8px;padding:12px;background:var(--primary-light);border:1px solid var(--primary);border-radius:6px">
        <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:8px">Sales BOM — ${service.name}</div>
        <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:rgba(255,255,255,.5)">
                <th style="text-align:left;font-size:11px;padding:3px 8px;font-weight:600;color:var(--gray-600)">Item Code</th>
                <th style="text-align:left;font-size:11px;padding:3px 8px;font-weight:600;color:var(--gray-600)">Description</th>
                <th style="text-align:left;font-size:11px;padding:3px 8px;font-weight:600;color:var(--gray-600)">Unit</th>
            </tr></thead>
            <tbody>${service.items.map((item, i) => `
                <tr style="${i % 2 === 1 ? 'background:rgba(255,255,255,.4)' : ''}">
                    <td style="font-size:12px;padding:3px 8px;font-family:monospace;color:var(--primary)">${item.id}</td>
                    <td style="font-size:12px;padding:3px 8px">${item.desc}</td>
                    <td style="font-size:12px;padding:3px 8px">${item.unit}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

function scmUpdateBOMPreview(serviceId) {
    const el = document.getElementById('bom-preview');
    if (el) el.innerHTML = scmGetBOMPreviewHTML(serviceId);
}

function scmUpdateBOMPreviewEdit(serviceId) {
    const el = document.getElementById('bom-preview-edit');
    if (el) el.innerHTML = scmGetBOMPreviewHTML(serviceId);
}
