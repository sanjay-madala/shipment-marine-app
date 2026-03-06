// ========== NPM MODULE ==========

let eirCoCounter = 4;  // next: CO20264
let eirCiCounter = 2;  // next: CI20262

function getActiveEir(eirArray) {
    if (!eirArray || eirArray.length === 0) return null;
    return [...eirArray].reverse().find(e => e.status !== 'cancelled') || null;
}

const NPM = {
    currentView: 'npm-shipment-list',
    statusFilter: 'all',

    init() {
        this.renderShipmentList();
    },

    navigate(view) {
        this.currentView = view;
        document.querySelectorAll('#npm-module .nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
        if (view === 'npm-shipment-list') this.renderShipmentList();
        else if (view === 'npm-eir-list') this.renderEIRList();
        else if (view === 'npm-inspection') this.renderInspection();
    },

    // ========== SHIPMENT LIST ==========
    renderShipmentList() {
        const counts = { all: npmShipments.length };
        ['open', 'dispatch', 'completed'].forEach(s => counts[s] = npmShipments.filter(x => x.status === s).length);
        const filtered = this.statusFilter === 'all' ? npmShipments : npmShipments.filter(x => x.status === this.statusFilter);
        const statusLabels = { all: t('all'), open: t('open'), dispatch: t('dispatch'), completed: t('completed') };

        document.getElementById('npm-content').innerHTML = `
            <div class="page-header">
                <div class="page-title">${t('containerShipments')}</div>
                <div class="btn-group">
                    <button class="btn btn-outline" onclick="NPM.showUploadModal()">${t('uploadExcel')}</button>
                    <button class="btn btn-primary" onclick="NPM.showCreateForm()">${t('newShipment')}</button>
                </div>
            </div>
            <div class="stats-row">
                <div class="stat-card"><div class="stat-value">${counts.all}</div><div class="stat-label">${t('total')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts.open}</div><div class="stat-label">${t('open')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts.dispatch}</div><div class="stat-label">${t('dispatch')}</div></div>
                <div class="stat-card"><div class="stat-value">${npmShipments.reduce((a, s) => a + s.containers.length, 0)}</div><div class="stat-label">${t('containers')}</div></div>
            </div>
            <div class="filters">
                ${['all', 'open', 'dispatch', 'completed'].map(s => `
                    <span class="filter-chip ${this.statusFilter === s ? 'active' : ''}" onclick="NPM.statusFilter='${s}';NPM.renderShipmentList()">
                        ${statusLabels[s]}
                        <span class="filter-count">${counts[s] || 0}</span>
                    </span>
                `).join('')}
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            <th>${t('shipmentId')}</th><th>${t('status')}</th><th>${t('vessel')}</th><th>${t('voyageNo')}</th>
                            <th>${t('etd')}</th><th>${t('bookings')}</th><th>${t('containers')}</th><th>${t('actions')}</th>
                        </tr></thead>
                        <tbody>
                            ${filtered.map(s => `
                                <tr class="clickable" ondblclick="NPM.showDetail('${s.id}')">
                                    <td><strong>${s.id}</strong></td>
                                    <td>${statusBadge(s.status)}</td>
                                    <td>${s.vesselName}</td>
                                    <td>${s.voyNo}</td>
                                    <td>${formatDateTime(s.etd)}</td>
                                    <td>${s.bookings.length}</td>
                                    <td>${s.containers.length}</td>
                                    <td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();NPM.showDetail('${s.id}')">${t('view')}</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // ========== CREATE SHIPMENT ==========
    showCreateForm() {
        openModal(`
            <div class="modal-header">
                <h2>${t('createContainerShipment')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label>${t('vesselName')} <span class="req">*</span></label>
                        <input id="nf-vessel" type="text" placeholder="e.g. EVER GOLDEN">
                    </div>
                    <div class="form-group">
                        <label>${t('voyageNo')} <span class="req">*</span></label>
                        <input id="nf-voy" type="text" placeholder="e.g. 26004E">
                    </div>
                    <div class="form-group">
                        <label>${t('etd')} <span class="req">*</span></label>
                        <input id="nf-etd" type="datetime-local" value="${new Date(Date.now() + 3*86400000).toISOString().slice(0,16)}">
                    </div>
                </div>
                <div class="section-title">${t('bookings')}</div>
                <div id="nf-bookings">
                    ${NPM._bookingRowHTML()}
                </div>
                <button class="btn btn-outline btn-sm" onclick="NPM.addBookingRow()" style="margin-top:8px">${t('addBooking')}</button>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="NPM.createShipment()">${t('createShipment')}</button>
            </div>
        `);
    },

    _bookingRowHTML() {
        return `<div class="form-grid" style="margin-bottom:12px;padding:12px;background:var(--gray-50);border-radius:6px">
            <div class="form-group"><label>${t('shipper')}</label><input class="nf-shipper" type="text"></div>
            <div class="form-group"><label>${t('bookingNo')}</label><input class="nf-bookingno" type="text" placeholder="BKG-2026-XXXX"></div>
            <div class="form-group"><label>${t('fw')}</label><input class="nf-fw" type="text" placeholder="e.g. FW001"></div>
            <div class="form-group"><label>${t('cargo')}</label><select class="nf-cargo">${MASTERS.commodities.map(c => `<option>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>${t('line')}</label><select class="nf-line">${MASTERS.containerLines.map(l => `<option>${l.name}</option>`).join('')}</select></div>
            <div class="form-group"><label>${t('size')}</label><select class="nf-size">${MASTERS.containerSizes.map(s => `<option>${s}</option>`).join('')}</select></div>
            <div class="form-group"><label>${t('qty')}</label><input class="nf-qty" type="number" value="1" min="1"></div>
            <div class="form-group"><label>${t('docType')}</label><select class="nf-doctype"><option value="E">${t('exportShort')}</option><option value="F">${t('importShort')}</option></select></div>
            <div class="form-group"><label>${t('stuffing')}</label><input class="nf-stuffing" type="text" placeholder="CY / CFS"></div>
        </div>`;
    },

    addBookingRow() {
        const container = document.getElementById('nf-bookings');
        const row = document.createElement('div');
        row.innerHTML = NPM._bookingRowHTML();
        container.appendChild(row.firstElementChild);
    },

    createShipment() {
        const vessel = document.getElementById('nf-vessel').value.trim();
        const voy = document.getElementById('nf-voy').value.trim();
        if (!vessel || !voy) { showToast(t('vesselAndVoyRequired'), 'error'); return; }

        const shippers = document.querySelectorAll('.nf-shipper');
        const bookingNos = document.querySelectorAll('.nf-bookingno');
        const fws = document.querySelectorAll('.nf-fw');
        const cargos = document.querySelectorAll('.nf-cargo');
        const lines = document.querySelectorAll('.nf-line');
        const sizes = document.querySelectorAll('.nf-size');
        const qtys = document.querySelectorAll('.nf-qty');
        const docTypes = document.querySelectorAll('.nf-doctype');
        const stuffings = document.querySelectorAll('.nf-stuffing');

        const bookings = [];
        for (let i = 0; i < shippers.length; i++) {
            if (shippers[i].value.trim()) {
                bookings.push({
                    id: `BK${String(Date.now()).slice(-4)}${i}`,
                    shipper: shippers[i].value.trim(),
                    fw: fws[i].value.trim(),
                    fwRef: '',
                    bookingNo: bookingNos[i].value.trim() || `BKG-2026-${String(Math.random()).slice(2,6)}`,
                    cargo: cargos[i].value,
                    line: lines[i].value,
                    sts: docTypes[i].value === 'E' ? 'E' : 'F',
                    size: parseInt(sizes[i].value),
                    qty: parseInt(qtys[i].value) || 1,
                    stuffing: stuffings[i].value.trim() || 'CY',
                    marking: '', srNo: '',
                    docType: docTypes[i].value,
                });
            }
        }

        const num = npmShipments.length + 1;
        const yy = new Date().getFullYear().toString().slice(-2);
        const shipment = {
            id: `12${yy}${String(num).padStart(6, '0')}`,
            status: 'open',
            vesselName: vessel,
            voyNo: voy,
            etd: document.getElementById('nf-etd').value,
            wbs: `08S.26CF.NPSRT1.S${String(num).padStart(3, '0')}`,
            bookings: bookings,
            containers: [],
        };
        npmShipments.unshift(shipment);
        closeModal();
        showToast(t('shipmentCreated', { id: shipment.id }), 'success');
        this.renderShipmentList();
    },

    showUploadModal() {
        openModal(`
            <div class="modal-header">
                <h2>${t('uploadForecast')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="upload-zone" onclick="document.getElementById('npm-file-upload').click()">
                    <div class="upload-icon">&#128196;</div>
                    <div class="upload-text">${t('uploadForecastHint')}</div>
                    <div style="color:var(--gray-400);font-size:12px;margin-top:4px">${t('uploadForecastDesc')}</div>
                    <input type="file" id="npm-file-upload" accept=".xlsx,.xls" style="display:none" onchange="NPM.simulateUpload()">
                </div>
                <div id="npm-upload-preview" style="margin-top:20px"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary hidden" id="npm-upload-btn" onclick="NPM.confirmUpload()">${t('createShipment')}</button>
            </div>
        `);
    },

    simulateUpload() {
        document.getElementById('npm-upload-btn').classList.remove('hidden');
        document.getElementById('npm-upload-preview').innerHTML = `
            <div style="font-weight:600;margin-bottom:12px">${t('forecastExtracted')}</div>
            <div class="form-grid" style="margin-bottom:16px">
                <div class="info-item"><label>${t('vessel')}</label><div class="value">ONE HARMONY</div></div>
                <div class="info-item"><label>${t('voyageNo')}</label><div class="value">26005N</div></div>
                <div class="info-item"><label>${t('etd')}</label><div class="value">25 Feb 2026 10:00</div></div>
            </div>
            <table>
                <thead><tr><th>${t('shipper')}</th><th>${t('bookingNo')}</th><th>${t('cargo')}</th><th>${t('line')}</th><th>${t('size')}</th><th>${t('qty')}</th><th>${t('docType')}</th></tr></thead>
                <tbody>
                    <tr><td>Sunrise Trading</td><td>BKG-2026-0010</td><td>General Cargo</td><td>ONE</td><td>40</td><td>10</td><td>E</td></tr>
                    <tr><td>Delta Logistics</td><td>BKG-2026-0011</td><td>Machinery</td><td>ONE</td><td>20</td><td>8</td><td>F</td></tr>
                </tbody>
            </table>
        `;
    },

    confirmUpload() {
        const num = npmShipments.length + 1;
        const yy = new Date().getFullYear().toString().slice(-2);
        npmShipments.unshift({
            id: `12${yy}${String(num).padStart(6, '0')}`,
            status: 'open',
            vesselName: 'ONE HARMONY',
            voyNo: '26005N',
            etd: '2026-02-25T10:00',
            wbs: `08S.26CF.NPSRT1.S${String(num).padStart(3, '0')}`,
            site: 'BKK',
            bookings: [
                { id: 'BK010', shipper: 'Sunrise Trading', fw: '', bookingNo: 'BKG-2026-0010', cargo: 'General Cargo', line: 'ONE', sts: 'E', fwRef: '', size: 40, qty: 10, stuffing: 'CY', marking: '', srNo: '', docType: 'E' },
                { id: 'BK011', shipper: 'Delta Logistics', fw: '', bookingNo: 'BKG-2026-0011', cargo: 'Machinery', line: 'ONE', sts: 'F', fwRef: '', size: 20, qty: 8, stuffing: 'CFS', marking: '', srNo: '', docType: 'F' },
            ],
            containers: [],
        });
        closeModal();
        showToast(t('shipmentCreatedFromForecast'), 'success');
        this.renderShipmentList();
    },

    // ========== SHIPMENT DETAIL ==========
    showDetail(id) {
        const s = npmShipments.find(x => x.id === id);
        if (!s) return;

        const canDispatch = s.status === 'open' && s.containers.length > 0;
        const canEdit = s.status === 'open';
        // Check for mismatch containers
        const mismatchContainers = s.containers.filter(c => !s.bookings.find(b => b.bookingNo === c.bookingNo));

        document.getElementById('npm-content').innerHTML = `
            <div class="detail-header">
                <div>
                    <button class="btn btn-outline btn-sm" onclick="NPM.renderShipmentList()" style="margin-bottom:8px">&larr; ${t('back')}</button>
                    <div class="detail-title">${s.id}</div>
                    <div class="detail-subtitle">${s.vesselName} &bull; Voy. ${s.voyNo}</div>
                </div>
                <div class="btn-group">
                    ${statusBadge(s.status)}
                    ${canEdit ? `<button class="btn btn-outline" onclick="NPM.showEditShipment('${s.id}')">${t('edit')}</button>` : ''}
                    ${canEdit ? `<button class="btn btn-outline" onclick="NPM.showLoadingListUpload('${s.id}')">${t('uploadLoadingList')}</button>` : ''}
                    ${canDispatch ? `<button class="btn btn-warning" onclick="NPM.dispatchShipment('${s.id}')">${t('dispatchBtn')}</button>` : ''}
                </div>
            </div>

            ${mismatchContainers.length > 0 ? `
                <div style="background:var(--danger-light);padding:12px 16px;border-radius:8px;margin-bottom:16px;border:1px solid var(--danger)">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <strong style="color:var(--danger)">${t('containerMismatch')}</strong>
                            ${mismatchContainers.map(c => `<div style="margin-top:4px;color:var(--danger)">${t('mismatchWarning', { id: c.id })}</div>`).join('')}
                        </div>
                        <button class="btn btn-warning btn-sm" onclick="NPM.revalidateContainers('${s.id}')" style="flex-shrink:0">${t('revalidate')}</button>
                    </div>
                </div>
            ` : ''}

            <div class="card" style="margin-bottom:20px">
                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-item"><label>${t('shipmentId')}</label><div class="value">${s.id}</div></div>
                        <div class="info-item"><label>${t('vessel')}</label><div class="value">${s.vesselName}</div></div>
                        <div class="info-item"><label>${t('voyageNo')}</label><div class="value">${s.voyNo}</div></div>
                        <div class="info-item"><label>${t('etd')}</label><div class="value">${formatDateTime(s.etd)}</div></div>
                        <div class="info-item"><label>${t('wbs')}</label><div class="value" style="font-family:monospace">${s.wbs}</div></div>
                    </div>
                </div>
            </div>

            <div class="tabs">
                <div class="tab active" onclick="NPM.switchTab(this, 'tab-bookings')">${t('bookings')} (${s.bookings.length})</div>
                <div class="tab" onclick="NPM.switchTab(this, 'tab-containers')">${t('containers')} (${s.containers.length})</div>
                <div class="tab" onclick="NPM.switchTab(this, 'tab-eir')">${t('eir')}</div>
            </div>

            <div id="tab-bookings" class="tab-content active">
                <div class="card">
                    <div class="card-header">
                        <h3>${t('bookingLines')}</h3>
                        ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="NPM.showAddBooking('${s.id}')">${t('addBooking')}</button>` : ''}
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead><tr><th>${t('shipper')}</th><th>${t('bookingNo')}</th><th>${t('cargo')}</th><th>${t('line')}</th><th>${t('sts')}</th><th>${t('fw')}</th><th>${t('size')}</th><th>${t('qty')}</th><th>${t('stuffing')}</th><th>${t('marking')}</th><th>${t('srNo')}</th><th>${t('docType')}</th>${canEdit ? `<th>${t('actions')}</th>` : ''}</tr></thead>
                            <tbody>
                                ${s.bookings.map(b => `
                                    <tr>
                                        <td>${b.shipper}</td>
                                        <td><strong>${b.bookingNo}</strong></td>
                                        <td>${b.cargo}</td>
                                        <td>${b.line}</td>
                                        <td><span class="badge ${b.sts === 'E' ? 'badge-open' : 'badge-dispatch'}">${b.sts}</span></td>
                                        <td>${b.fw || '-'}</td>
                                        <td>${b.size}'</td>
                                        <td>${b.qty}</td>
                                        <td>${b.stuffing}</td>
                                        <td>${b.marking || '-'}</td>
                                        <td>${b.srNo || '-'}</td>
                                        <td>${b.docType}</td>
                                        ${canEdit ? `<td><button class="btn btn-outline btn-sm" onclick="NPM.showEditBooking('${s.id}','${b.id}')">${t('edit')}</button></td>` : ''}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="tab-containers" class="tab-content">
                <div class="card">
                    <div class="card-header">
                        <h3>${t('containers')}</h3>
                        ${mismatchContainers.length > 0 ? `<button class="btn btn-warning btn-sm" onclick="NPM.revalidateContainers('${s.id}')">${t('revalidate')}</button>` : ''}
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead><tr><th>${t('containerId')}</th><th>${t('bookingNo')}</th><th>${t('size')}</th><th>${t('containerType')}</th><th>${t('sealNo')}</th><th>${t('weight')}</th><th>${t('inspected')}</th><th>${t('eirOut')}</th><th>${t('eirIn')}</th><th>${t('actions')}</th></tr></thead>
                            <tbody>
                                ${s.containers.length > 0 ? s.containers.map(c => {
                                    const isMismatch = !s.bookings.find(b => b.bookingNo === c.bookingNo);
                                    return `
                                    <tr style="${isMismatch ? 'background:var(--danger-light)' : ''}">
                                        <td><strong style="font-family:monospace">${c.id}</strong></td>
                                        <td>${c.bookingNo} ${isMismatch ? `<span class="badge badge-cancelled">${t('containerMismatch')}</span>` : ''}</td>
                                        <td>${c.size}'</td>
                                        <td>${c.type}</td>
                                        <td>${c.sealNo}</td>
                                        <td>${c.weight.toLocaleString()}</td>
                                        <td>${c.inspected ? `<span style="color:var(--success)">&#10003; ${t('yes')}</span>` : `<span style="color:var(--danger)">&#10007; ${t('no')}</span>`}</td>
                                        <td>${getActiveEir(c.eirOuts) ? `<code>${getActiveEir(c.eirOuts).id}</code> ${formatDateTime(getActiveEir(c.eirOuts).time)}` : '-'}</td>
                                        <td>${getActiveEir(c.eirIns) ? `<code>${getActiveEir(c.eirIns).id}</code> ${formatDateTime(getActiveEir(c.eirIns).time)}` : '-'}</td>
                                        <td>
                                            <button class="btn btn-outline btn-sm" onclick="NPM.showEditContainer('${s.id}','${c.id}')">${t('edit')}</button>
                                            ${isMismatch ? `<span style="color:var(--danger);font-size:11px;margin-left:4px">${t('containerMismatch')}</span>` : ''}
                                        </td>
                                    </tr>`;
                                }).join('') : `<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--gray-400)">${t('noContainersLoaded')}</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="tab-eir" class="tab-content">
                ${s.containers.length > 0 ? `
                <div class="card">
                    <div class="card-header"><h3>${t('eir')}</h3></div>
                    <div class="table-wrap">
                        <table>
                            <thead><tr><th>${t('containerId')}</th><th>Direction</th><th>EIR ID</th><th>Date/Time</th><th>${t('status')}</th><th>Truck</th><th>${t('actions')}</th></tr></thead>
                            <tbody>
                                ${s.containers.map(c => {
                                    const activeOut = getActiveEir(c.eirOuts);
                                    const activeIn = getActiveEir(c.eirIns);
                                    const allEirs = [
                                        ...(c.eirOuts || []).map(e => ({ ...e, direction: 'out' })),
                                        ...(c.eirIns || []).map(e => ({ ...e, direction: 'in' }))
                                    ];
                                    if (allEirs.length === 0) {
                                        return `<tr>
                                            <td><strong style="font-family:monospace">${c.id}</strong></td>
                                            <td colspan="5" style="color:var(--gray-400)">-</td>
                                            <td><button class="btn btn-warning btn-sm" onclick="NPM.createEIR('${s.id}','${c.id}','out')">${t('eirOut')}</button></td>
                                        </tr>`;
                                    }
                                    const rows = allEirs.map((eir, idx) => {
                                        const isActive = eir.status !== 'cancelled';
                                        return `<tr class="${isActive ? '' : 'eir-voided'}">
                                            <td>${idx === 0 ? `<strong style="font-family:monospace">${c.id}</strong>` : ''}</td>
                                            <td><span class="badge ${eir.direction === 'out' ? 'badge-dispatch' : 'badge-completed'}">${eir.direction.toUpperCase()}</span></td>
                                            <td><code>${eir.id}</code></td>
                                            <td>${formatDateTime(eir.time)}</td>
                                            <td>${isActive ? '<span style="color:var(--success)">&#10003; Done</span>' : '<span class="badge badge-cancelled">&#8856; VOIDED</span>'}</td>
                                            <td>${isActive ? (eir.truckNo || '-') : '-'}</td>
                                            <td>
                                                ${isActive ? `<button class="btn btn-danger btn-sm" onclick="NPM.showVoidModal('${s.id}','${c.id}','${eir.direction}')">Void</button>` : ''}
                                                ${isActive ? `<button class="btn btn-outline btn-sm" onclick="NPM.printEIR('${c.id}')">${t('print')}</button>` : ''}
                                            </td>
                                        </tr>`;
                                    }).join('');
                                    let actionRow = '';
                                    if (!activeOut) {
                                        actionRow = `<tr><td></td><td colspan="5"></td><td><button class="btn btn-warning btn-sm" onclick="NPM.createEIR('${s.id}','${c.id}','out')">${t('eirOut')}</button></td></tr>`;
                                    } else if (!activeIn) {
                                        actionRow = `<tr><td></td><td colspan="5"></td><td><button class="btn btn-success btn-sm" onclick="NPM.createEIR('${s.id}','${c.id}','in')">${t('eirIn')}</button></td></tr>`;
                                    }
                                    return rows + actionRow;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : `<div style="text-align:center;padding:40px;color:var(--gray-400)">${t('loadContainersFirst')}</div>`}
            </div>
        `;
    },

    switchTab(el, tabId) {
        el.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        el.closest('.content').querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
    },

    showEditShipment(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        openModal(`
            <div class="modal-header">
                <h2>${t('edit')} ${s.id}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label>${t('vesselName')}</label>
                        <input id="es-vessel" type="text" value="${s.vesselName}">
                    </div>
                    <div class="form-group">
                        <label>${t('voyageNo')}</label>
                        <input id="es-voy" type="text" value="${s.voyNo}">
                    </div>
                    <div class="form-group">
                        <label>${t('etd')}</label>
                        <input id="es-etd" type="datetime-local" value="${s.etd}">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="NPM.saveEditShipment('${shipId}')">${t('saveChanges')}</button>
            </div>
        `);
    },

    saveEditShipment(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        s.vesselName = document.getElementById('es-vessel').value.trim();
        s.voyNo = document.getElementById('es-voy').value.trim();
        s.etd = document.getElementById('es-etd').value;
        closeModal();
        showToast(t('changesSaved'), 'success');
        this.showDetail(shipId);
    },

    showAddBooking(shipId) {
        openModal(`
            <div class="modal-header">
                <h2>${t('addBooking')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group"><label>${t('shipper')} <span class="req">*</span></label><input id="ab-shipper" type="text"></div>
                    <div class="form-group"><label>${t('bookingNo')} <span class="req">*</span></label><input id="ab-bookingno" type="text" placeholder="BKG-2026-XXXX"></div>
                    <div class="form-group"><label>${t('cargo')}</label><select id="ab-cargo">${MASTERS.commodities.map(c => `<option>${c}</option>`).join('')}</select></div>
                    <div class="form-group"><label>${t('line')}</label><select id="ab-line">${MASTERS.containerLines.map(l => `<option>${l.name}</option>`).join('')}</select></div>
                    <div class="form-group"><label>${t('size')}</label><select id="ab-size">${MASTERS.containerSizes.map(s => `<option>${s}</option>`).join('')}</select></div>
                    <div class="form-group"><label>${t('qty')}</label><input id="ab-qty" type="number" value="1" min="1"></div>
                    <div class="form-group"><label>${t('docType')}</label><select id="ab-doctype"><option value="E">${t('exportShort')}</option><option value="F">${t('importShort')}</option></select></div>
                    <div class="form-group"><label>${t('stuffing')}</label><input id="ab-stuffing" type="text" value="CY"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="NPM.addBooking('${shipId}')">${t('add')}</button>
            </div>
        `);
    },

    addBooking(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const shipper = document.getElementById('ab-shipper').value.trim();
        const bookingNo = document.getElementById('ab-bookingno').value.trim();
        if (!shipper || !bookingNo) { showToast(t('shipperAndBookingRequired'), 'error'); return; }
        s.bookings.push({
            id: `BK${String(Date.now()).slice(-5)}`,
            shipper, bookingNo,
            cargo: document.getElementById('ab-cargo').value,
            line: document.getElementById('ab-line').value,
            sts: document.getElementById('ab-doctype').value,
            fw: '', fwRef: '',
            size: parseInt(document.getElementById('ab-size').value),
            qty: parseInt(document.getElementById('ab-qty').value),
            stuffing: document.getElementById('ab-stuffing').value,
            marking: '', srNo: '',
            docType: document.getElementById('ab-doctype').value,
        });
        closeModal();
        showToast(t('bookingAdded'), 'success');
        this.showDetail(shipId);
    },

    // ========== EDIT BOOKING ==========
    showEditBooking(shipId, bookingId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const b = s.bookings.find(x => x.id === bookingId);
        if (!b) return;
        openModal(`
            <div class="modal-header">
                <h2>${t('editBooking')} &mdash; ${b.bookingNo}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group"><label>${t('shipper')} <span class="req">*</span></label><input id="eb-shipper" type="text" value="${b.shipper}"></div>
                    <div class="form-group"><label>${t('bookingNo')} <span class="req">*</span></label><input id="eb-bookingno" type="text" value="${b.bookingNo}"></div>
                    <div class="form-group"><label>${t('cargo')}</label><select id="eb-cargo">${MASTERS.commodities.map(c => `<option ${b.cargo === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
                    <div class="form-group"><label>${t('line')}</label><select id="eb-line">${MASTERS.containerLines.map(l => `<option ${b.line === l.name ? 'selected' : ''}>${l.name}</option>`).join('')}</select></div>
                    <div class="form-group"><label>${t('size')}</label><select id="eb-size">${MASTERS.containerSizes.map(sz => `<option ${b.size === sz ? 'selected' : ''}>${sz}</option>`).join('')}</select></div>
                    <div class="form-group"><label>${t('qty')}</label><input id="eb-qty" type="number" value="${b.qty}" min="1"></div>
                    <div class="form-group"><label>${t('docType')}</label><select id="eb-doctype"><option value="E" ${b.docType === 'E' ? 'selected' : ''}>${t('exportShort')}</option><option value="F" ${b.docType === 'F' ? 'selected' : ''}>${t('importShort')}</option></select></div>
                    <div class="form-group"><label>${t('stuffing')}</label><input id="eb-stuffing" type="text" value="${b.stuffing}"></div>
                    <div class="form-group"><label>${t('marking')}</label><input id="eb-marking" type="text" value="${b.marking || ''}"></div>
                    <div class="form-group"><label>${t('srNo')}</label><input id="eb-srno" type="text" value="${b.srNo || ''}"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="NPM.saveEditBooking('${shipId}','${bookingId}')">${t('saveChanges')}</button>
            </div>
        `);
    },

    saveEditBooking(shipId, bookingId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const b = s.bookings.find(x => x.id === bookingId);
        if (!b) return;
        const oldBookingNo = b.bookingNo;
        b.shipper = document.getElementById('eb-shipper').value.trim();
        b.bookingNo = document.getElementById('eb-bookingno').value.trim();
        b.cargo = document.getElementById('eb-cargo').value;
        b.line = document.getElementById('eb-line').value;
        b.size = parseInt(document.getElementById('eb-size').value);
        b.qty = parseInt(document.getElementById('eb-qty').value);
        b.docType = document.getElementById('eb-doctype').value;
        b.sts = b.docType;
        b.stuffing = document.getElementById('eb-stuffing').value.trim();
        b.marking = document.getElementById('eb-marking').value.trim();
        b.srNo = document.getElementById('eb-srno').value.trim();
        // Update containers that referenced old booking no
        if (oldBookingNo !== b.bookingNo) {
            s.containers.filter(c => c.bookingNo === oldBookingNo).forEach(c => c.bookingNo = b.bookingNo);
        }
        closeModal();
        showToast(t('bookingSaved'), 'success');
        this.showDetail(shipId);
    },

    // ========== EDIT CONTAINER ==========
    showEditContainer(shipId, containerId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const c = s.containers.find(x => x.id === containerId);
        if (!c) return;
        openModal(`
            <div class="modal-header">
                <h2>${t('editContainer')} &mdash; ${containerId}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group"><label>${t('containerId')}</label><input id="ec-id" type="text" value="${c.id}"></div>
                    <div class="form-group"><label>${t('bookingNo')} <span class="req">*</span></label>
                        <select id="ec-bookingno">
                            ${s.bookings.map(b => `<option value="${b.bookingNo}" ${c.bookingNo === b.bookingNo ? 'selected' : ''}>${b.bookingNo}</option>`).join('')}
                            ${!s.bookings.find(b => b.bookingNo === c.bookingNo) ? `<option value="${c.bookingNo}" selected>${c.bookingNo} (${t('containerMismatch')})</option>` : ''}
                        </select>
                    </div>
                    <div class="form-group"><label>${t('size')}</label><select id="ec-size">${MASTERS.containerSizes.map(sz => `<option ${c.size === sz ? 'selected' : ''}>${sz}</option>`).join('')}</select></div>
                    <div class="form-group"><label>${t('containerType')}</label><input id="ec-type" type="text" value="${c.type}"></div>
                    <div class="form-group"><label>${t('sealNo')}</label><input id="ec-seal" type="text" value="${c.sealNo}"></div>
                    <div class="form-group"><label>${t('weight')}</label><input id="ec-weight" type="number" value="${c.weight}"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="NPM.saveEditContainer('${shipId}','${containerId}')">${t('saveChanges')}</button>
            </div>
        `);
    },

    saveEditContainer(shipId, containerId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const c = s.containers.find(x => x.id === containerId);
        if (!c) return;
        const newId = document.getElementById('ec-id').value.trim();
        if (newId && newId !== c.id) c.id = newId;
        c.bookingNo = document.getElementById('ec-bookingno').value;
        c.size = parseInt(document.getElementById('ec-size').value);
        c.type = document.getElementById('ec-type').value.trim();
        c.sealNo = document.getElementById('ec-seal').value.trim();
        c.weight = parseInt(document.getElementById('ec-weight').value) || 0;
        closeModal();
        showToast(t('containerSaved'), 'success');
        this.showDetail(shipId);
    },

    // ========== RE-VALIDATE CONTAINERS ==========
    revalidateContainers(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const mismatched = s.containers.filter(c => !s.bookings.find(b => b.bookingNo === c.bookingNo));
        const matched = s.containers.length - mismatched.length;
        if (mismatched.length === 0) {
            showToast(t('allContainersMatched'), 'success');
        } else {
            showToast(t('revalidateSuccess', { matched, mismatched: mismatched.length }), 'error');
        }
        this.showDetail(shipId);
    },

    // ========== LOADING LIST ==========
    showLoadingListUpload(shipId) {
        openModal(`
            <div class="modal-header">
                <h2>${t('uploadContainerLoading')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="upload-zone" onclick="document.getElementById('ll-file').click()">
                    <div class="upload-icon">&#128230;</div>
                    <div class="upload-text">${t('uploadLoadingHint')}</div>
                    <div style="color:var(--gray-400);font-size:12px;margin-top:4px">${t('uploadLoadingDesc')}</div>
                    <input type="file" id="ll-file" accept=".xlsx,.xls" style="display:none" onchange="NPM.simulateLoadingList('${shipId}')">
                </div>
                <div id="ll-preview" style="margin-top:20px"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary hidden" id="ll-confirm-btn" onclick="NPM.confirmLoadingList('${shipId}')">${t('confirmLoadingList')}</button>
            </div>
        `);
    },

    simulateLoadingList(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        document.getElementById('ll-confirm-btn').classList.remove('hidden');
        const mockContainers = [];
        const prefixes = ['EIRU', 'CSQU', 'MSKU', 'OOLU', 'TCLU', 'BMOU'];
        s.bookings.forEach((b, bi) => {
            const count = Math.min(b.qty, 3);
            for (let i = 0; i < count; i++) {
                mockContainers.push({
                    id: `${prefixes[bi % prefixes.length]}${String(Math.random()).slice(2,9)}`,
                    bookingNo: b.bookingNo,
                    size: b.size,
                    type: 'GP',
                    sealNo: `SL-${String(Math.random()).slice(2,5)}`,
                    weight: Math.floor(15000 + Math.random() * 15000),
                });
            }
        });

        document.getElementById('ll-preview').innerHTML = `
            <div style="font-weight:600;margin-bottom:8px">${t('previewContainers', { count: mockContainers.length })}</div>
            <div style="max-height:300px;overflow-y:auto">
            <table>
                <thead><tr><th>${t('containerId')}</th><th>${t('bookingNo')}</th><th>${t('size')}</th><th>${t('containerType')}</th><th>${t('sealNo')}</th><th>${t('weight')}</th><th></th></tr></thead>
                <tbody>
                    ${mockContainers.map(c => `
                        <tr>
                            <td style="font-family:monospace">${c.id}</td>
                            <td>${c.bookingNo}</td>
                            <td>${c.size}'</td>
                            <td>${c.type}</td>
                            <td>${c.sealNo}</td>
                            <td>${c.weight.toLocaleString()} kg</td>
                            <td><span style="color:var(--success)">&#10003; ${t('matched')}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            </div>
        `;
        this._pendingContainers = mockContainers;
    },

    confirmLoadingList(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s || !this._pendingContainers) return;
        s.containers = this._pendingContainers.map(c => ({ ...c, inspected: false, eirOuts: [], eirIns: [] }));
        this._pendingContainers = null;
        closeModal();
        showToast(t('containersLoaded', { count: s.containers.length }), 'success');
        this.showDetail(shipId);
    },

    dispatchShipment(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const unmatched = s.containers.filter(c => !s.bookings.find(b => b.bookingNo === c.bookingNo));
        if (unmatched.length > 0) {
            showToast(t('containersNotMatched', { count: unmatched.length }), 'error');
            return;
        }
        s.status = 'dispatch';
        showToast(t('shipmentDispatched', { id: shipId }), 'success');
        this.showDetail(shipId);
    },

    // ========== EIR ==========
    // Flow: EIR Out first (container leaves port) → then EIR In (container returns)
    // Full SAP-style form with Container Detail + Truck Detail sections
    createEIR(shipId, containerId, direction) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const c = s.containers.find(x => x.id === containerId);
        if (!c) return;

        if (!c.inspected && !containerInspections[containerId]) {
            openModal(`
                <div class="modal-header">
                    <h2>${t('inspectionWarning')}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--warning-light);padding:16px;border-radius:8px;margin-bottom:16px">
                        <strong>${t('containerNotInspected', { id: containerId })}</strong>
                        <p style="margin-top:8px;color:var(--gray-600)">${t('completeInspectionFirst')}</p>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-primary" onclick="closeModal();NPM.navigate('npm-inspection')">${t('goToInspection')}</button>
                        <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                    </div>
                </div>
            `);
            return;
        }

        const booking = s.bookings.find(b => b.bookingNo === c.bookingNo);
        const dirLabel = direction === 'out' ? t('gateOut') : t('gateIn');
        const now = new Date();
        const previewId = direction === 'out'
            ? `CO${now.getFullYear()}${eirCoCounter}`
            : `CI${now.getFullYear()}${eirCiCounter}`;
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toISOString().slice(11, 16);

        openModal(`
            <div class="modal-header">
                <h2>${direction === 'out' ? t('eirOut') : t('eirIn')} &mdash; ${containerId}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <!-- EIR Header -->
                <div style="background:var(--gray-50);padding:12px 16px;border-radius:8px;margin-bottom:16px;border:1px solid var(--gray-200)">
                    <div class="form-grid-3">
                        <div class="form-group">
                            <label>${t('event')}</label>
                            <select id="eir-event">
                                <option value="check-in" ${direction === 'in' ? 'selected' : ''}>${t('checkInOnly')}</option>
                                <option value="check-out" ${direction === 'out' ? 'selected' : ''}>${t('checkOutOnly')}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>${dirLabel}</label>
                            <input type="text" disabled value="${dirLabel}" style="font-weight:700;color:var(--primary)">
                        </div>
                        <div class="form-group">
                            <label>${t('fiscalYear')}</label>
                            <input type="text" disabled value="${now.getFullYear()}">
                        </div>
                        <div class="form-group">
                            <label>${t('eirNo')}</label>
                            <input type="text" disabled value="${previewId}">
                        </div>
                        <div class="form-group">
                            <label>${t('salesOrder')}</label>
                            <input id="eir-salesorder" type="text" placeholder="e.g. 2108123573">
                        </div>
                        <div class="form-group">
                            <label>${t('vesselShipment')}</label>
                            <input type="text" disabled value="${s.id}">
                        </div>
                    </div>
                    <div style="display:flex;gap:16px;margin-top:8px">
                        <label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" id="eir-notreturning"> ${t('containerNotReturning')}</label>
                        <label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" id="eir-notclosed"> ${t('containerNotClosed')}</label>
                        <label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" id="eir-canceldoc"> ${t('cancelDocument')}</label>
                    </div>
                </div>

                <!-- Container Detail Section -->
                <div class="section-title">${t('containerDetail')}</div>
                <div style="background:#fff;padding:12px 16px;border-radius:8px;border:1px solid var(--gray-200);margin-bottom:16px">
                    <div class="form-grid-3">
                        <div class="form-group">
                            <label>${t('checkDate')}</label>
                            <input id="eir-checkdate" type="date" value="${dateStr}">
                        </div>
                        <div class="form-group">
                            <label>${t('checkTime')}</label>
                            <input id="eir-checktime" type="time" value="${timeStr}">
                        </div>
                        <div class="form-group">
                            <label>${t('reference')}</label>
                            <input id="eir-reference" type="text" placeholder="e.g. CO 2026 716">
                        </div>
                        <div class="form-group">
                            <label>${t('customerType')}</label>
                            <select id="eir-custtype">
                                <option value="EX" ${booking && booking.sts === 'E' ? 'selected' : ''}>EX - Export</option>
                                <option value="IM" ${booking && booking.sts === 'F' ? 'selected' : ''}>IM - Import</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>${t('containerId')}</label>
                            <input type="text" disabled value="${containerId}" style="font-family:monospace;font-weight:700">
                        </div>
                        <div class="form-group">
                            <label>${t('bookingNo')}</label>
                            <input type="text" disabled value="${c.bookingNo}" style="font-weight:600">
                        </div>
                        <div class="form-group">
                            <label>${t('size')} / ${t('containerType')}</label>
                            <div style="display:flex;gap:4px">
                                <input type="text" disabled value="${c.size}'" style="width:60px">
                                <input type="text" disabled value="${c.type}" style="width:60px">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>${t('lineAgent')}</label>
                            <input id="eir-lineagent" type="text" value="${booking ? booking.line : ''}">
                        </div>
                        <div class="form-group">
                            <label>${t('containerStatus')}</label>
                            <select id="eir-containerstatus">
                                <option>FCL</option>
                                <option>LCL</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>${t('forwarder')}</label>
                            <input id="eir-forwarder" type="text" value="${booking ? booking.fw : ''}" placeholder="e.g. 1100895">
                        </div>
                        <div class="form-group">
                            <label>${t('weight')} (TON)</label>
                            <input id="eir-weight" type="text" value="${(c.weight / 1000).toFixed(3)}">
                        </div>
                        <div class="form-group">
                            <label>${t('customerCode')}</label>
                            <input id="eir-customer" type="text" value="${booking ? booking.shipper : ''}">
                        </div>
                        <div class="form-group">
                            <label>${t('sealNo')}</label>
                            <input type="text" disabled value="${c.sealNo}">
                        </div>
                        <div class="form-group">
                            <label>${t('sVesselVoy')}</label>
                            <input type="text" disabled value="${s.wbs}">
                        </div>
                        <div class="form-group">
                            <label>${t('commodity')}</label>
                            <input id="eir-commodity" type="text" value="${booking ? booking.cargo : ''}">
                        </div>
                        <div class="form-group">
                            <label>${t('stuffingAt')}</label>
                            <input id="eir-stuffing" type="text" value="${booking ? booking.stuffing : ''}" placeholder="e.g. CY, CFS">
                        </div>
                        <div class="form-group">
                            <label>${t('marking')}</label>
                            <input id="eir-marking" type="text" value="${booking ? (booking.marking || '') : ''}">
                        </div>
                        <div class="form-group">
                            <label>${t('srNo')}</label>
                            <input id="eir-srno" type="text" value="${booking ? (booking.srNo || '') : ''}">
                        </div>
                    </div>
                </div>

                <!-- Truck Detail Section -->
                <div class="section-title">${t('truckDetail')}</div>
                <div style="background:var(--gray-50);padding:12px 16px;border-radius:8px;border:1px solid var(--gray-200)">
                    <div class="form-grid-3">
                        <div class="form-group">
                            <label>${t('shipmentNoItem')}</label>
                            <input id="eir-shipmentno" type="text" placeholder="e.g. 80001234">
                        </div>
                        <div class="form-group">
                            <label>${t('itemNo')}</label>
                            <input id="eir-itemno" type="text" value="0" placeholder="0">
                        </div>
                        <div class="form-group">
                            <label>&nbsp;</label>
                            <span style="font-size:11px;color:var(--gray-400)">Item No. max 2</span>
                        </div>
                        <div class="form-group">
                            <label>${t('truckHeadPlate')} <span class="req">*</span></label>
                            <input id="eir-truckhead" type="text" placeholder="e.g. 83-0569">
                        </div>
                        <div class="form-group">
                            <label>${t('officer')}</label>
                            <input id="eir-officer" type="text">
                        </div>
                        <div class="form-group">
                            <label>&nbsp;</label>
                        </div>
                        <div class="form-group">
                            <label>${t('truckTailPlate')}</label>
                            <input id="eir-trucktail" type="text" placeholder="e.g. 83-1051">
                        </div>
                        <div class="form-group">
                            <label>${t('billNo')}</label>
                            <input id="eir-billno" type="text" placeholder="e.g. 117089">
                        </div>
                        <div class="form-group">
                            <label>&nbsp;</label>
                        </div>
                        <div class="form-group">
                            <label>${t('carrier')} <span class="req">*</span></label>
                            <input id="eir-carrier" type="text">
                        </div>
                        <div class="form-group">
                            <label>${t('weighingSlipNo')}</label>
                            <input id="eir-weighslip" type="text" placeholder="e.g. 01">
                        </div>
                        <div class="form-group">
                            <label>&nbsp;</label>
                        </div>
                        <div class="form-group">
                            <label>${t('driver')} <span class="req">*</span></label>
                            <input id="eir-driver" type="text">
                        </div>
                        <div class="form-group">
                            <label>${t('driverLicenseNo')}</label>
                            <input id="eir-driverlicense" type="text" placeholder="e.g. DL-009012">
                        </div>
                        <div class="form-group full-width">
                            <label>${t('remarks')}</label>
                            <textarea id="eir-remarks" rows="2" placeholder="${t('remarks')}"></textarea>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-success" onclick="NPM.saveEIR('${shipId}','${containerId}','${direction}')">${t('createEir')}</button>
            </div>
        `);
    },

    saveEIR(shipId, containerId, direction) {
        const s = npmShipments.find(x => x.id === shipId);
        const c = s.containers.find(x => x.id === containerId);
        const truckHead = document.getElementById('eir-truckhead').value.trim();
        const driver = document.getElementById('eir-driver').value.trim();
        const carrier = document.getElementById('eir-carrier').value.trim();
        if (!truckHead || !driver || !carrier) { showToast(t('truckAndDriverRequired'), 'error'); return; }

        const checkDate = document.getElementById('eir-checkdate').value;
        const checkTime = document.getElementById('eir-checktime').value;
        const year = new Date().getFullYear();
        const eirId = direction === 'out'
            ? `CO${year}${eirCoCounter++}`
            : `CI${year}${eirCiCounter++}`;

        const eir = {
            id: eirId,
            time: `${checkDate}T${checkTime}`,
            // Header
            event: document.getElementById('eir-event').value,
            salesOrder: document.getElementById('eir-salesorder').value.trim(),
            containerNotReturning: document.getElementById('eir-notreturning').checked,
            containerNotClosed: document.getElementById('eir-notclosed').checked,
            // Container Detail
            checkDate, checkTime,
            reference: document.getElementById('eir-reference').value.trim(),
            customerType: document.getElementById('eir-custtype').value,
            lineAgent: document.getElementById('eir-lineagent').value.trim(),
            containerStatus: document.getElementById('eir-containerstatus').value,
            forwarder: document.getElementById('eir-forwarder').value.trim(),
            weight: document.getElementById('eir-weight').value.trim(),
            customer: document.getElementById('eir-customer').value.trim(),
            commodity: document.getElementById('eir-commodity').value.trim(),
            stuffingAt: document.getElementById('eir-stuffing').value.trim(),
            marking: document.getElementById('eir-marking').value.trim(),
            srNo: document.getElementById('eir-srno').value.trim(),
            // Truck Detail
            shipmentNo: document.getElementById('eir-shipmentno').value.trim(),
            itemNo: document.getElementById('eir-itemno').value.trim(),
            truckNo: truckHead,
            truckHeadPlate: truckHead,
            truckTailPlate: document.getElementById('eir-trucktail').value.trim(),
            officer: document.getElementById('eir-officer').value.trim(),
            billNo: document.getElementById('eir-billno').value.trim(),
            carrier: carrier,
            weighingSlipNo: document.getElementById('eir-weighslip').value.trim(),
            driverName: driver,
            driverLicense: document.getElementById('eir-driverlicense').value.trim(),
            remarks: document.getElementById('eir-remarks').value.trim(),
            status: 'completed',
        };

        if (direction === 'out') {
            if (!c.eirOuts) c.eirOuts = [];
            c.eirOuts.push(eir);
        } else {
            if (!c.eirIns) c.eirIns = [];
            c.eirIns.push(eir);
        }

        const dirLabel = direction === 'out' ? t('eirOut') : t('eirIn');
        closeModal();
        showToast(t('eirCreated', { dir: dirLabel, id: containerId }), 'success');
        this.showDetail(shipId);
    },

    showVoidModal(shipId, containerId, direction, returnView = 'detail') {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const c = s.containers.find(x => x.id === containerId);
        if (!c) return;
        const activeEir = direction === 'out' ? getActiveEir(c.eirOuts) : getActiveEir(c.eirIns);
        if (!activeEir) return;

        openModal(`
            <div class="modal-header">
                <div>
                    <h2 style="font-size:16px">Void EIR</h2>
                    <div style="font-size:12px;color:var(--gray-500);margin-top:2px">Container: ${containerId} &bull; ${activeEir.id}</div>
                </div>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;margin-bottom:18px;background:var(--gray-50);border-radius:8px;padding:14px">
                    <div><div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Container ID</div><div style="font-family:monospace;font-weight:500">${containerId}</div></div>
                    <div><div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">EIR ID</div><div style="font-family:monospace;font-weight:500">${activeEir.id}</div></div>
                    <div><div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Direction</div><div style="font-weight:500">${direction.toUpperCase()}</div></div>
                    <div><div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Date/Time</div><div style="font-weight:500">${formatDateTime(activeEir.time)}</div></div>
                </div>
                <div style="margin-bottom:14px">
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px">เหตุผลการยกเลิก <span style="color:var(--danger)">*</span></label>
                    <select id="void-reason" style="width:100%;border:1px solid var(--gray-300);border-radius:6px;padding:8px 12px;font-size:13px;outline:none" onchange="NPM._checkVoidForm()">
                        <option value="">-- เลือกเหตุผล --</option>
                        <option value="data_entry_error">กรอกข้อมูลผิดพลาด</option>
                        <option value="duplicate">ทำรายการซ้ำ</option>
                        <option value="wrong_container">ผิด Container</option>
                        <option value="customer_cancel">ลูกค้ายกเลิก</option>
                        <option value="other">อื่นๆ (ระบุเพิ่มเติม)</option>
                    </select>
                </div>
                <div style="margin-bottom:14px">
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px">หมายเหตุเพิ่มเติม</label>
                    <textarea id="void-note" style="width:100%;border:1px solid var(--gray-300);border-radius:6px;padding:8px 12px;font-size:13px;resize:vertical;min-height:80px;outline:none" placeholder="ระบุรายละเอียดเพิ่มเติม..." onkeyup="NPM._checkVoidForm()"></textarea>
                </div>
                <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
                    <input type="checkbox" id="void-confirm-check" style="width:16px;height:16px;accent-color:var(--danger)" onchange="NPM._checkVoidForm()">
                    ยืนยันว่าได้ตรวจสอบข้อมูลแล้ว และต้องการยกเลิก EIR นี้
                </label>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-danger" id="void-confirm-btn" disabled onclick="NPM.cancelEIR('${shipId}','${containerId}','${direction}','${returnView}')">ยืนยันยกเลิก EIR</button>
            </div>
        `);
    },

    _checkVoidForm() {
        const reason = document.getElementById('void-reason').value;
        const checked = document.getElementById('void-confirm-check').checked;
        document.getElementById('void-confirm-btn').disabled = !(reason && checked);
    },

    cancelEIR(shipId, containerId, direction, returnView = 'detail') {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const c = s.containers.find(x => x.id === containerId);
        if (!c) return;

        if (direction === 'out') {
            const activeEir = getActiveEir(c.eirOuts);
            if (activeEir) {
                activeEir.status = 'cancelled';
                const activeIn = getActiveEir(c.eirIns);
                if (activeIn) activeIn.status = 'cancelled';
                showToast(t('eirCancelled', { id: activeEir.id }), 'success');
            }
        } else if (direction === 'in') {
            const activeEir = getActiveEir(c.eirIns);
            if (activeEir) {
                activeEir.status = 'cancelled';
                showToast(t('eirCancelled', { id: activeEir.id }), 'success');
            }
        }
        closeModal();
        if (returnView === 'list') this.renderEIRList();
        else this.showDetail(shipId);
    },

    printEIR(containerId) {
        showToast(t('printingEir', { id: containerId }), 'success');
    },

    // ========== EIR LIST ==========
    renderEIRList() {
        const allContainers = [];
        npmShipments.forEach(s => {
            s.containers.forEach(c => {
                allContainers.push({ ...c, shipmentId: s.id, vesselName: s.vesselName });
            });
        });

        const activeEirOut = allContainers.filter(c => getActiveEir(c.eirOuts));
        const activeEirIn = allContainers.filter(c => getActiveEir(c.eirIns));
        const pendingOut = allContainers.filter(c => !getActiveEir(c.eirOuts));

        document.getElementById('npm-content').innerHTML = `
            <div class="page-header">
                <div class="page-title">${t('eirManagement')}</div>
            </div>
            <div class="stats-row">
                <div class="stat-card"><div class="stat-value">${allContainers.length}</div><div class="stat-label">${t('totalContainers')}</div></div>
                <div class="stat-card"><div class="stat-value">${activeEirOut.length}</div><div class="stat-label">${t('eirOutDone')}</div></div>
                <div class="stat-card"><div class="stat-value">${activeEirIn.length}</div><div class="stat-label">${t('eirInDone')}</div></div>
                <div class="stat-card"><div class="stat-value">${pendingOut.length}</div><div class="stat-label">${t('pendingEirOut')}</div></div>
            </div>

            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h3>${t('quickEirLookup')}</h3></div>
                <div class="card-body">
                    <div style="font-size:11px;color:var(--gray-500);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">${t('enterContainerOrShipment')}</div>
                    <div style="display:flex;gap:10px">
                        <input id="eir-lookup" type="text" placeholder="e.g. EIRU1234567" style="flex:1">
                        <button class="btn btn-primary" onclick="NPM.lookupEIR()">${t('search')}</button>
                    </div>
                    <div id="eir-lookup-result" style="margin-top:16px"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>${t('allContainerEir')}</h3></div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>${t('containerId')}</th><th>${t('shipmentId')}</th><th>${t('vessel')}</th><th>${t('size')}</th><th>${t('inspected')}</th><th>${t('eirOut')}</th><th>${t('eirIn')}</th><th>${t('actions')}</th></tr></thead>
                        <tbody>
                            ${allContainers.map(c => `
                                <tr>
                                    <td><span style="font-family:monospace;font-weight:600">${c.id}</span></td>
                                    <td>${c.shipmentId}</td>
                                    <td>${c.vesselName}</td>
                                    <td>${c.size}' ${c.type}</td>
                                    <td>${c.inspected ? '<span style="color:var(--success);font-size:16px">&#10003;</span>' : '<span style="color:var(--danger);font-size:16px">&#10007;</span>'}</td>
                                    <td>${getActiveEir(c.eirOuts) ? `<code>${getActiveEir(c.eirOuts).id}</code> ${formatDateTime(getActiveEir(c.eirOuts).time)}` : (c.eirOuts && c.eirOuts.some(e => e.status === 'cancelled') ? `<span style="color:var(--danger)">&#8856; VOIDED</span>` : '-')}</td>
                                    <td>${getActiveEir(c.eirIns) ? `<code>${getActiveEir(c.eirIns).id}</code> ${formatDateTime(getActiveEir(c.eirIns).time)}` : (c.eirIns && c.eirIns.some(e => e.status === 'cancelled') ? `<span style="color:var(--danger)">&#8856; VOIDED</span>` : '-')}</td>
                                    <td>
                                        <div style="display:flex;flex-direction:column;gap:4px">
                                            ${!getActiveEir(c.eirOuts) ? `<div><button class="btn btn-warning btn-sm" onclick="NPM.createEIR('${c.shipmentId}','${c.id}','out')">${t('eirOut')}</button></div>` : `<div class="btn-group"><button class="btn btn-outline btn-sm" onclick="NPM.printEIR('${c.id}')">Print Out</button><button class="btn btn-danger btn-sm" onclick="NPM.showVoidModal('${c.shipmentId}','${c.id}','out','list')">Void Out</button></div>`}
                                            ${getActiveEir(c.eirOuts) ? `<div class="btn-group">${!getActiveEir(c.eirIns) ? `<button class="btn btn-success btn-sm" onclick="NPM.createEIR('${c.shipmentId}','${c.id}','in')">${t('eirIn')}</button>` : `<button class="btn btn-outline btn-sm" onclick="NPM.printEIR('${c.id}')">Print In</button><button class="btn btn-danger btn-sm" onclick="NPM.showVoidModal('${c.shipmentId}','${c.id}','in','list')">Void In</button>`}</div>` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                            ${allContainers.length === 0 ? `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--gray-400)">${t('noContainersAvailable')}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    lookupEIR() {
        const query = document.getElementById('eir-lookup').value.trim().toUpperCase();
        const result = document.getElementById('eir-lookup-result');
        if (!query) { result.innerHTML = ''; return; }

        let found = null;
        let shipment = null;
        npmShipments.forEach(s => {
            const c = s.containers.find(x => x.id.toUpperCase() === query);
            if (c) { found = c; shipment = s; }
        });

        if (!found) {
            shipment = npmShipments.find(s => s.id.toUpperCase().includes(query));
            if (shipment) {
                result.innerHTML = `
                    <div style="padding:12px;background:var(--primary-light);border-radius:6px">
                        ${t('foundShipment')} <strong>${shipment.id}</strong> &mdash; ${shipment.vesselName} (${shipment.containers.length} ${t('containers').toLowerCase()})
                        <button class="btn btn-primary btn-sm" style="margin-left:12px" onclick="NPM.showDetail('${shipment.id}')">${t('viewShipment')}</button>
                    </div>
                `;
                return;
            }
        }

        if (found && shipment) {
            const hasActiveOut = getActiveEir(found.eirOuts);
            const hasActiveIn = getActiveEir(found.eirIns);
            result.innerHTML = `
                <div style="padding:16px;background:var(--success-light);border-radius:6px">
                    <div class="info-grid">
                        <div class="info-item"><label>${t('containerId')}</label><div class="value">${found.id}</div></div>
                        <div class="info-item"><label>${t('shipmentId')}</label><div class="value">${shipment.id}</div></div>
                        <div class="info-item"><label>${t('vessel')}</label><div class="value">${shipment.vesselName}</div></div>
                        <div class="info-item"><label>${t('size')} / ${t('containerType')}</label><div class="value">${found.size}' ${found.type}</div></div>
                        <div class="info-item"><label>${t('inspected')}</label><div class="value">${found.inspected ? t('yes') : t('no')}</div></div>
                        <div class="info-item"><label>${t('eirOut')}</label><div class="value">${hasActiveOut ? formatDateTime(hasActiveOut.time) : t('pending')}</div></div>
                        <div class="info-item"><label>${t('eirIn')}</label><div class="value">${hasActiveIn ? formatDateTime(hasActiveIn.time) : t('pending')}</div></div>
                    </div>
                    <div class="btn-group" style="margin-top:12px">
                        ${!hasActiveOut ? `<button class="btn btn-warning btn-sm" onclick="NPM.createEIR('${shipment.id}','${found.id}','out')">${t('createEirOut')}</button>` : ''}
                        ${hasActiveOut && !hasActiveIn ? `<button class="btn btn-success btn-sm" onclick="NPM.createEIR('${shipment.id}','${found.id}','in')">${t('createEirIn')}</button>` : ''}
                    </div>
                </div>
            `;
        } else {
            result.innerHTML = `<div style="padding:12px;background:var(--danger-light);border-radius:6px;color:var(--danger)">${t('noResults')} "${query}"</div>`;
        }
    },

    // ========== INSPECTION ==========
    renderInspection() {
        const allContainers = [];
        npmShipments.forEach(s => {
            s.containers.forEach(c => {
                allContainers.push({ ...c, shipmentId: s.id, vesselName: s.vesselName });
            });
        });

        document.getElementById('npm-content').innerHTML = `
            <div class="page-header">
                <div class="page-title">${t('containerInspection')}</div>
            </div>
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h3>${t('inspectContainer')}</h3></div>
                <div class="card-body">
                    <div style="display:flex;gap:12px;align-items:end">
                        <div class="form-group" style="flex:1">
                            <label>${t('enterContainerId')}</label>
                            <input id="insp-container" type="text" placeholder="e.g. EIRU1234567">
                        </div>
                        <button class="btn btn-primary" onclick="NPM.lookupInspection()">${t('search')}</button>
                    </div>
                    <div id="insp-result" style="margin-top:16px"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>${t('inspectionStatus')}</h3></div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>${t('containerId')}</th><th>${t('shipmentId')}</th><th>${t('vessel')}</th><th>${t('size')}</th><th>${t('status')}</th><th>${t('inspector')}</th><th>${t('date')}</th><th>${t('actions')}</th></tr></thead>
                        <tbody>
                            ${allContainers.map(c => {
                                const insp = containerInspections[c.id];
                                return `<tr>
                                    <td><strong style="font-family:monospace">${c.id}</strong></td>
                                    <td>${c.shipmentId}</td>
                                    <td>${c.vesselName}</td>
                                    <td>${c.size}' ${c.type}</td>
                                    <td>${insp ? `<span class="badge badge-completed">${t('inspected')}</span>` : `<span class="badge badge-draft">${t('pending')}</span>`}</td>
                                    <td>${insp ? insp.inspector : '-'}</td>
                                    <td>${insp ? formatDateTime(insp.completedAt) : '-'}</td>
                                    <td>
                                        ${insp ? `<button class="btn btn-outline btn-sm" onclick="NPM.viewInspection('${c.id}')">${t('view')}</button>` : `<button class="btn btn-primary btn-sm" onclick="NPM.startInspection('${c.id}','${c.shipmentId}')">${t('inspect')}</button>`}
                                    </td>
                                </tr>`;
                            }).join('')}
                            ${allContainers.length === 0 ? `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--gray-400)">${t('noContainersForInspection')}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    lookupInspection() {
        const query = document.getElementById('insp-container').value.trim().toUpperCase();
        const result = document.getElementById('insp-result');
        if (!query) { result.innerHTML = ''; return; }

        let found = null;
        let shipId = null;
        npmShipments.forEach(s => {
            const c = s.containers.find(x => x.id.toUpperCase() === query);
            if (c) { found = c; shipId = s.id; }
        });

        if (found) {
            const insp = containerInspections[found.id];
            if (insp) {
                result.innerHTML = `
                    <div style="padding:12px;background:var(--success-light);border-radius:6px">
                        ${t('containerInspected', { id: found.id, inspector: insp.inspector, date: formatDateTime(insp.completedAt) })}
                        <button class="btn btn-outline btn-sm" style="margin-left:12px" onclick="NPM.viewInspection('${found.id}')">${t('viewDetails')}</button>
                    </div>
                `;
            } else {
                result.innerHTML = `
                    <div style="padding:12px;background:var(--warning-light);border-radius:6px">
                        ${t('containerNotInspectedYet', { id: found.id })}
                        <button class="btn btn-primary btn-sm" style="margin-left:12px" onclick="NPM.startInspection('${found.id}','${shipId}')">${t('startInspection')}</button>
                    </div>
                `;
            }
        } else {
            result.innerHTML = `<div style="padding:12px;background:var(--danger-light);border-radius:6px;color:var(--danger)">${t('containerNotFound', { id: query })}</div>`;
        }
    },

    startInspection(containerId, shipId) {
        openModal(`
            <div class="modal-header">
                <h2>${t('containerInspection')} &mdash; ${containerId}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group" style="margin-bottom:16px">
                    <label>${t('inspectorName')} <span class="req">*</span></label>
                    <input id="insp-name" type="text">
                </div>
                <div class="section-title">${t('inspectionChecklist')}</div>
                ${['Exterior', 'Interior', 'Door', 'Markings'].map(cat => `
                    <div style="margin-bottom:16px">
                        <div style="font-weight:600;font-size:13px;color:var(--gray-600);margin-bottom:8px">${tCategory(cat)}</div>
                        ${INSPECTION_CHECKLIST.filter(c => c.category === cat).map(item => `
                            <div class="checklist-item">
                                <input type="checkbox" id="chk-${item.id}" checked>
                                <span class="checklist-label">${tChecklist(item.id)}</span>
                                <input class="checklist-note" type="text" placeholder="${t('noteIfDamaged')}" id="note-${item.id}" style="font-size:12px">
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-success" onclick="NPM.saveInspection('${containerId}','${shipId}')">${t('saveInspection')}</button>
            </div>
        `);
    },

    saveInspection(containerId, shipId) {
        const inspector = document.getElementById('insp-name').value.trim();
        if (!inspector) { showToast(t('inspectorNameRequired'), 'error'); return; }

        containerInspections[containerId] = {
            completedAt: new Date().toISOString(),
            inspector: inspector,
            items: INSPECTION_CHECKLIST.map(item => ({
                ...item,
                ok: document.getElementById(`chk-${item.id}`).checked,
                note: document.getElementById(`note-${item.id}`).value,
            })),
        };

        npmShipments.forEach(s => {
            const c = s.containers.find(x => x.id === containerId);
            if (c) c.inspected = true;
        });

        closeModal();
        showToast(t('inspectionCompleted', { id: containerId }), 'success');
        this.renderInspection();
    },

    viewInspection(containerId) {
        const insp = containerInspections[containerId];
        if (!insp) return;
        const failed = insp.items.filter(i => !i.ok);

        openModal(`
            <div class="modal-header">
                <h2>${t('inspectionReport')} &mdash; ${containerId}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="info-grid" style="margin-bottom:20px">
                    <div class="info-item"><label>${t('inspector')}</label><div class="value">${insp.inspector}</div></div>
                    <div class="info-item"><label>${t('date')}</label><div class="value">${formatDateTime(insp.completedAt)}</div></div>
                    <div class="info-item"><label>${t('result')}</label><div class="value">${failed.length === 0 ? `<span style="color:var(--success)">${t('allPassed')}</span>` : `<span style="color:var(--danger)">${t('issues', { count: failed.length })}</span>`}</div></div>
                </div>
                ${['Exterior', 'Interior', 'Door', 'Markings'].map(cat => `
                    <div style="margin-bottom:12px">
                        <div style="font-weight:600;font-size:13px;color:var(--gray-600);margin-bottom:4px">${tCategory(cat)}</div>
                        ${insp.items.filter(i => i.category === cat).map(item => `
                            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gray-100)">
                                <span style="color:${item.ok ? 'var(--success)' : 'var(--danger)'};font-size:16px">${item.ok ? '&#10003;' : '&#10007;'}</span>
                                <span style="flex:1">${tChecklist(item.id)}</span>
                                ${item.note ? `<span style="color:var(--warning);font-size:12px">${item.note}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('close')}</button>
            </div>
        `);
    },
};
