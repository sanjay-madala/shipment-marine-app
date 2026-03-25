// ========== NPM MODULE ==========

let eirCoCounter = 4;  // next: CO20264
let eirCiCounter = 2;  // next: CI20262

function getActiveEir(eirArray) {
    if (!eirArray || eirArray.length === 0) return null;
    return [...eirArray].reverse().find(e => e.status !== 'cancelled') || null;
}

const NPM = {
    currentView: 'npm-shipment-list',
    statusFilters: ['all'], // multi-select status filter
    searchQuery: '',
    sortColumn: 'etd',
    sortDirection: 'desc',
    dateFrom: '',
    dateTo: '',
    containerSearch: '',
    selectedContainers: new Set(),
    eirSearchContainer: '',
    eirSearchBooking: '',
    eirDateFrom: '',
    eirDateTo: '',

    init() {
        // Default date range: +/- 15 days
        const todayStr = todayBKK();
        const from = new Date(new Date(todayStr).getTime() - 15 * 86400000);
        this.dateFrom = from.toISOString().slice(0, 10);
        this.dateTo = todayStr;
        // EIR default: 30 days back
        const eirFrom = new Date(new Date(todayStr).getTime() - 30 * 86400000);
        this.eirDateFrom = eirFrom.toISOString().slice(0, 10);
        this.eirDateTo = todayStr;
        this.renderShipmentList();
    },

    navigate(view) {
        this.currentView = view;
        document.querySelectorAll('#npm-module .nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
        if (view === 'npm-shipment-list') this.renderShipmentList();
        else if (view === 'npm-eir-list') this.renderEIRList();
        else if (view === 'npm-inspection') this.renderInspection();
        else if (view === 'npm-master-data') this.renderMasterData();
        else if (view === 'npm-settings') this.renderSettings();
    },

    // ========== SHIPMENT LIST ==========
    renderShipmentList() {
        const counts = { all: npmShipments.length };
        ['open', 'dispatch', 'completed'].forEach(s => counts[s] = npmShipments.filter(x => x.status === s).length);

        // Filter by status (multi-select)
        let filtered = this.statusFilters.includes('all') ? [...npmShipments] : npmShipments.filter(x => this.statusFilters.includes(x.status));

        // Filter by date range
        if (this.dateFrom || this.dateTo) {
            filtered = filtered.filter(s => {
                const etd = s.etd ? s.etd.slice(0, 10) : '';
                if (this.dateFrom && etd < this.dateFrom) return false;
                if (this.dateTo && etd > this.dateTo) return false;
                return true;
            });
        }

        // Search across all columns
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                s.id.toLowerCase().includes(q) ||
                s.status.toLowerCase().includes(q) ||
                s.vesselName.toLowerCase().includes(q) ||
                s.voyNo.toLowerCase().includes(q) ||
                (s.etd || '').toLowerCase().includes(q) ||
                String(s.bookings.length).includes(q) ||
                String(s.containers.length).includes(q)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            let va = a[this.sortColumn], vb = b[this.sortColumn];
            if (this.sortColumn === 'bookings') { va = a.bookings.length; vb = b.bookings.length; }
            if (this.sortColumn === 'containers') { va = a.containers.length; vb = b.containers.length; }
            if (va < vb) return this.sortDirection === 'asc' ? -1 : 1;
            if (va > vb) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        const statusLabels = { all: t('all'), open: t('open'), dispatch: t('dispatch'), completed: t('completed') };
        const sortIcon = (col) => this.sortColumn === col ? (this.sortDirection === 'asc' ? ' &#9650;' : ' &#9660;') : ' <span style="color:var(--gray-300)">&#9650;</span>';

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
            <!-- Status filter chips -->
            <div class="filters">
                ${['all', 'open', 'dispatch', 'completed'].map(s => `
                    <span class="filter-chip ${this.statusFilters.includes(s) ? 'active' : ''}" onclick="NPM.toggleStatusFilter('${s}')">
                        ${statusLabels[s]}<span class="filter-count">${counts[s] || 0}</span>
                    </span>
                `).join('')}
            </div>

            <!-- Additional filters row -->
            <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
                <!-- Date range -->
                <div style="display:flex;gap:6px;align-items:center">
                    <span style="font-size:12px;color:var(--gray-500);font-weight:600">ETD:</span>
                    <input type="date" value="${this.dateFrom}" onchange="NPM.dateFrom=this.value;NPM.renderShipmentList()" style="font-size:12px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                    <span style="font-size:12px;color:var(--gray-400)">–</span>
                    <input type="date" value="${this.dateTo}" onchange="NPM.dateTo=this.value;NPM.renderShipmentList()" style="font-size:12px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                    <button class="btn btn-outline btn-sm" onclick="NPM._resetDateFilter()">Last 15d</button>
                </div>
                <!-- Search -->
                <div style="display:flex;gap:6px;align-items:center;margin-left:auto">
                    <input type="text" placeholder="${t('search')}..." value="${this.searchQuery.replace(/"/g, '&quot;')}"
                        oninput="NPM.searchQuery=this.value;NPM.renderShipmentList()"
                        style="font-size:12px;padding:4px 10px;border:1px solid var(--gray-300);border-radius:6px;width:220px">
                </div>
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            <th style="width:50px">${t('actions')}</th>
                            <th style="cursor:pointer" onclick="NPM.toggleSort('id')">${t('shipmentId')}${sortIcon('id')}</th>
                            <th style="cursor:pointer" onclick="NPM.toggleSort('status')">${t('status')}${sortIcon('status')}</th>
                            <th style="cursor:pointer" onclick="NPM.toggleSort('vesselName')">${t('vessel')}${sortIcon('vesselName')}</th>
                            <th style="cursor:pointer" onclick="NPM.toggleSort('voyNo')">${t('voyageNo')}${sortIcon('voyNo')}</th>
                            <th style="cursor:pointer" onclick="NPM.toggleSort('etd')">${t('etd')}${sortIcon('etd')}</th>
                            <th style="cursor:pointer" onclick="NPM.toggleSort('bookings')">${t('bookings')}${sortIcon('bookings')}</th>
                            <th style="cursor:pointer" onclick="NPM.toggleSort('containers')">${t('containers')}${sortIcon('containers')}</th>
                        </tr></thead>
                        <tbody>
                            ${filtered.map(s => `
                                <tr class="clickable" onclick="NPM.showDetail('${s.id}')">
                                    <td onclick="event.stopPropagation()">
                                        <div class="action-menu">
                                            <button class="action-dots" onclick="toggleActionMenu(this,event)"></button>
                                            <div class="action-dropdown">
                                                <div class="action-dropdown-item" onclick="NPM.showDetail('${s.id}')">${t('view')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><strong>${s.id}</strong></td>
                                    <td>${statusBadge(s.status)}</td>
                                    <td>${s.vesselName}</td>
                                    <td>${s.voyNo}</td>
                                    <td>${formatDateTime(s.etd)}</td>
                                    <td>${s.bookings.length}</td>
                                    <td>${s.containers.length}</td>
                                </tr>
                            `).join('')}
                            ${filtered.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--gray-400)">No shipments found</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    _resetEirDateFilter() {
        const todayStr = todayBKK();
        const d1 = new Date(todayStr); d1.setDate(d1.getDate() - 30);
        this.eirDateFrom = d1.toISOString().slice(0, 10);
        this.eirDateTo = todayStr;
        this.renderEIRList();
    },

    _resetDateFilter() {
        const todayStr = todayBKK();
        const d1 = new Date(todayStr); d1.setDate(d1.getDate() - 15);
        this.dateFrom = d1.toISOString().slice(0, 10);
        this.dateTo = todayStr;
        this.renderShipmentList();
    },

    toggleStatusFilter(status) {
        if (status === 'all') {
            this.statusFilters = ['all'];
        } else {
            this.statusFilters = this.statusFilters.filter(s => s !== 'all');
            if (this.statusFilters.includes(status)) {
                this.statusFilters = this.statusFilters.filter(s => s !== status);
            } else {
                this.statusFilters.push(status);
            }
            if (this.statusFilters.length === 0) this.statusFilters = ['all'];
        }
        this.renderShipmentList();
    },

    toggleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = column === 'etd' ? 'desc' : 'asc';
        }
        this.renderShipmentList();
    },

    // ========== VALIDATE VOY NO ==========
    validateVoyNo(voy) {
        // Format: yyrunningno(3)(N/S) e.g. "26004S" — validate yy prefix and N or S suffix
        if (!voy || voy.length < 4) return false;
        const yy = voy.slice(0, 2);
        const suffix = voy.slice(-1).toUpperCase();
        if (!/^\d{2}$/.test(yy)) return false;
        if (suffix !== 'N' && suffix !== 'S') return false;
        return true;
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
                        ${renderSS('nf-vessel', MASTERS.npmVessels.map(v => ({ value: v.name, label: v.name, active: true })), '', null)}
                    </div>
                    <div class="form-group">
                        <label>${t('voyageNo')} <span class="req">*</span></label>
                        <input id="nf-voy" type="text" placeholder="e.g. 26004S" oninput="NPM._updateWbsPreview()">
                        <div style="font-size:11px;color:var(--gray-400);margin-top:2px">Format: YYnnnN/S (e.g. 26004S)</div>
                    </div>
                    <div class="form-group">
                        <label>${t('etd')} <span class="req">*</span></label>
                        <input id="nf-etd" type="datetime-local" value="${new Date(new Date(nowBKK()).getTime() + 3*86400000).toISOString().slice(0,16)}">
                    </div>
                    <div class="form-group">
                        <label>WBS</label>
                        <input id="nf-wbs-preview" type="text" disabled style="font-family:monospace;background:var(--gray-100)" placeholder="Auto-generated">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="NPM.createShipment()">${t('createShipment')}</button>
            </div>
        `);
    },

    _updateWbsPreview() {
        const voy = document.getElementById('nf-voy') ? document.getElementById('nf-voy').value.trim() : '';
        const num = npmShipments.length + 1;
        const wbsEl = document.getElementById('nf-wbs-preview');
        if (wbsEl) {
            wbsEl.value = voy ? `08S.26CF.NPSRT1.S${String(num).padStart(3, '0')}.${voy}` : '';
        }
    },

    _bookingRowHTML(index) {
        const fwOptions = MASTERS.npmForwarders.map(f => `<option value="${f.code}">${f.code} - ${f.name}</option>`).join('');
        const stsOptions = `<option value="E-MTY">E-MTY</option><option value="F-FCL">F-FCL</option>`;
        const docTypeOptions = MASTERS.docTypes.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        return `<div class="booking-row" style="margin-bottom:12px;padding:12px;background:var(--gray-50);border-radius:6px;position:relative">
            <button onclick="this.parentElement.remove()" style="position:absolute;top:4px;right:8px;background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px">&times;</button>
            <div class="form-grid">
                <div class="form-group"><label>FW Code <span class="req">*</span></label><select class="nf-fwcode" onchange="NPM._syncFwName(this)"><option value="">-- Select --</option>${fwOptions}</select></div>
                <div class="form-group"><label>${t('bookingNo')} <span class="req">*</span></label><input class="nf-bookingno" type="text" placeholder="BKG-2026-XXXX"></div>
                <div class="form-group"><label>${t('cargo')} <span class="req">*</span></label><select class="nf-cargo">${MASTERS.commodities.map(c => `<option>${c}</option>`).join('')}</select></div>
                <div class="form-group"><label>${t('line')} <span class="req">*</span></label><select class="nf-line">${MASTERS.containerLines.map(l => `<option>${l.name}</option>`).join('')}</select></div>
                <div class="form-group"><label>Sts <span class="req">*</span></label><select class="nf-sts">${stsOptions}</select></div>
                <div class="form-group"><label>${t('size')} <span class="req">*</span></label><select class="nf-size">${MASTERS.containerSizes.map(s => `<option>${s}</option>`).join('')}</select></div>
                <div class="form-group"><label>${t('qty')} <span class="req">*</span></label><input class="nf-qty" type="text" value="1" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
                <div class="form-group"><label>Doc Type <span class="req">*</span></label><select class="nf-doctype">${docTypeOptions}</select></div>
                <div class="form-group"><label>${t('stuffing')}</label><input class="nf-stuffing" type="text" placeholder="CY / CFS"></div>
                <div class="form-group"><label>Marking</label><input class="nf-marking" type="text"></div>
                <div class="form-group"><label>Sr. No.</label><input class="nf-srno" type="text"></div>
            </div>
        </div>`;
    },

    _syncShipperName(selectEl) {
        const code = selectEl.value;
        const row = selectEl.closest('.booking-row');
        const nameInput = row.querySelector('.nf-shipper');
        const shipper = MASTERS.npmShippers.find(s => s.code === code);
        nameInput.value = shipper ? shipper.name : '';
    },

    _syncFwName(selectEl) {
        // Just store fwCode, name resolved from master
    },

    addBookingRow() {
        const container = document.getElementById('nf-bookings');
        const idx = container.querySelectorAll('.booking-row').length;
        const row = document.createElement('div');
        row.innerHTML = NPM._bookingRowHTML(idx);
        container.appendChild(row.firstElementChild);
    },

    createShipment() {
        const vessel = (document.getElementById('nf-vessel').value || document.getElementById('ss-search-nf-vessel')?.value || '').trim();
        const voy = document.getElementById('nf-voy').value.trim();
        if (!vessel || !voy) { showToast(t('vesselAndVoyRequired'), 'error'); return; }
        if (!this.validateVoyNo(voy)) { showToast('Invalid Voy No. format. Expected: YYnnnN/S (e.g. 26004S)', 'error'); return; }

        const num = npmShipments.length + 1;
        const yy = new Date().getFullYear().toString().slice(-2);
        const shipment = {
            id: `1201${yy}${String(num).padStart(6, '0')}`,
            status: 'open',
            vesselName: vessel,
            voyNo: voy,
            etd: document.getElementById('nf-etd').value,
            wbs: `08S.26CF.NPSRT1.S${String(num).padStart(3, '0')}.${voy}`,
            bookings: [],
            containers: [],
        };
        npmShipments.unshift(shipment);
        closeModal();
        showToast(t('shipmentCreated', { id: shipment.id }), 'success');
        this.renderShipmentList();
    },

    // ========== DELETE BOOKING ==========
    deleteBooking(shipId, bookingId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const idx = s.bookings.findIndex(b => b.id === bookingId);
        if (idx < 0) return;
        const b = s.bookings[idx];
        if (!confirm(`Delete booking ${b.bookingNo}? This will also unlink any containers referencing this booking.`)) return;
        s.bookings.splice(idx, 1);
        showToast(`Booking ${b.bookingNo} deleted`, 'success');
        this.showDetail(shipId);
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
                <thead><tr><th>Shipper Code</th><th>${t('shipper')}</th><th>FW Code</th><th>${t('bookingNo')}</th><th>${t('cargo')}</th><th>${t('line')}</th><th>${t('size')}</th><th>${t('qty')}</th><th>Doc Type</th></tr></thead>
                <tbody>
                    <tr><td>SH007</td><td>Sunrise Trading</td><td>FW001</td><td>BKG-2026-0010</td><td>General Cargo</td><td>ONE</td><td>40</td><td>10</td><td>EX</td></tr>
                    <tr><td>SH008</td><td>Delta Logistics</td><td>FW002</td><td>BKG-2026-0011</td><td>Machinery</td><td>ONE</td><td>20</td><td>8</td><td>IM</td></tr>
                </tbody>
            </table>
        `;
    },

    confirmUpload() {
        const num = npmShipments.length + 1;
        const yy = new Date().getFullYear().toString().slice(-2);
        npmShipments.unshift({
            id: `1201${yy}${String(num).padStart(6, '0')}`,
            status: 'open',
            vesselName: 'ONE HARMONY',
            voyNo: '26005N',
            etd: '2026-02-25T10:00',
            wbs: `08S.26CF.NPSRT1.S${String(num).padStart(3, '0')}.26005N`,
            site: 'BKK',
            bookings: [
                { id: 'BK010', shipperCode: 'SH007', shipper: 'Sunrise Trading', fwCode: 'FW001', fw: 'Forward Express Co.', bookingNo: 'BKG-2026-0010', cargo: 'General Cargo', line: 'ONE', sts: 'EX', fwRef: '', size: 40, qty: 10, stuffing: 'CY', marking: '', srNo: '', docType: 'EX' },
                { id: 'BK011', shipperCode: 'SH008', shipper: 'Delta Logistics', fwCode: 'FW002', fw: 'Siam Freight Services', bookingNo: 'BKG-2026-0011', cargo: 'Machinery', line: 'ONE', sts: 'IM', fwRef: '', size: 20, qty: 8, stuffing: 'CFS', marking: '', srNo: '', docType: 'IM' },
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
        const hasEir = s.containers.some(c => getActiveEir(c.eirOuts) || getActiveEir(c.eirIns));
        // Check for mismatch containers (unique key: booking + container)
        const mismatchContainers = s.containers.filter(c => !s.bookings.find(b => b.bookingNo === c.bookingNo));

        // Container summary
        const totalContainers = s.containers.length;
        const totalExport = s.containers.filter(c => c.docType === 'EX').length;
        const totalImport = s.containers.filter(c => c.docType === 'IM').length;
        const totalDomestic = s.containers.filter(c => c.docType === 'DO').length;
        const totalNotMatched = mismatchContainers.length;

        document.getElementById('npm-content').innerHTML = `
            <div class="detail-header">
                <div>
                    <button class="btn btn-outline btn-sm" onclick="NPM.renderShipmentList()" style="margin-bottom:8px">&larr; ${t('back')}</button>
                    <div class="detail-title">${s.id} ${statusBadge(s.status)}</div>
                    <div class="detail-subtitle">${s.vesselName} &bull; Voy. ${s.voyNo}</div>
                </div>
                <div class="btn-group">
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
                        <div class="info-item"><label>WBS</label><div class="value" style="font-family:monospace">${s.wbs}</div></div>
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
                            <thead><tr><th>Shipper Code</th><th>${t('shipper')}</th><th>FW Code</th><th>${t('bookingNo')}</th><th>${t('cargo')}</th><th>${t('line')}</th><th>Sts</th><th>${t('size')}</th><th>${t('qty')}</th><th>Doc Type</th><th>${t('stuffing')}</th><th>Marking</th><th>Sr. No.</th>${canEdit ? `<th>${t('actions')}</th>` : ''}</tr></thead>
                            <tbody>
                                ${s.bookings.map(b => `
                                    <tr>
                                        <td>${b.shipperCode || '-'}</td>
                                        <td>${b.shipper}</td>
                                        <td>${b.fwCode || '-'}</td>
                                        <td><strong>${b.bookingNo}</strong></td>
                                        <td>${b.cargo}</td>
                                        <td>${b.line}</td>
                                        <td><span class="badge ${b.sts === 'EX' ? 'badge-open' : b.sts === 'IM' ? 'badge-dispatch' : 'badge-completed'}">${b.sts}</span></td>
                                        <td>${b.size}'</td>
                                        <td>${b.qty}</td>
                                        <td>${b.docType}</td>
                                        <td>${b.stuffing || '-'}</td>
                                        <td>${b.marking || '-'}</td>
                                        <td>${b.srNo || '-'}</td>
                                        ${canEdit ? `<td>
                                            <div class="btn-group">
                                                <button class="btn btn-outline btn-sm" onclick="NPM.showEditBooking('${s.id}','${b.id}')">${t('edit')}</button>
                                                <button class="btn btn-danger btn-sm" onclick="NPM.deleteBooking('${s.id}','${b.id}')">Del</button>
                                            </div>
                                        </td>` : ''}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="tab-containers" class="tab-content">
                <div class="card">
                    <div class="card-header" style="flex-wrap:wrap;gap:8px">
                        <h3>${t('containers')}</h3>
                        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                            <input type="text" placeholder="Search containers..." value="${this.containerSearch}" oninput="NPM.containerSearch=this.value;NPM.showDetail('${s.id}')" style="padding:6px 10px;border:1px solid var(--gray-300);border-radius:4px;font-size:12px;width:200px">
                            ${canEdit && !hasEir ? `<button class="btn btn-primary btn-sm" onclick="NPM.showAddContainer('${s.id}')">Add Container</button>` : ''}
                            ${mismatchContainers.length > 0 ? `<button class="btn btn-warning btn-sm" onclick="NPM.revalidateContainers('${s.id}')">${t('revalidate')}</button>` : ''}
                            ${canEdit && !hasEir && s.containers.length > 0 ? `<button class="btn btn-danger btn-sm" onclick="NPM.deleteSelectedContainers('${s.id}')">Delete Selected</button>` : ''}
                            ${canEdit && !hasEir && s.containers.length > 0 ? `<button class="btn btn-danger btn-sm" onclick="NPM.deleteAllContainers('${s.id}')">Delete All</button>` : ''}
                        </div>
                    </div>
                    <!-- Container Summary -->
                    <div style="display:flex;gap:16px;padding:8px 16px;background:var(--gray-50);border-bottom:1px solid var(--gray-200);font-size:12px;flex-wrap:wrap">
                        <span><strong>Total:</strong> ${totalContainers}</span>
                        <span><strong>Export (EX):</strong> ${totalExport}</span>
                        <span><strong>Import (IM):</strong> ${totalImport}</span>
                        <span><strong>Domestic (DO):</strong> ${totalDomestic}</span>
                        <span style="${totalNotMatched > 0 ? 'color:var(--danger);font-weight:600' : ''}"><strong>Not Matched:</strong> ${totalNotMatched}</span>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead><tr>
                                ${canEdit && !hasEir ? `<th><input type="checkbox" onchange="NPM.toggleAllContainers(this,'${s.id}')" ${this.selectedContainers.size === s.containers.length && s.containers.length > 0 ? 'checked' : ''}></th>` : ''}
                                <th>Item No.</th><th>Doc Type</th><th>${t('containerId')}</th><th>${t('line')}</th><th>Size/Type</th><th>ISO Code</th><th>Status</th><th>POL</th><th>POD</th><th>G.W.T</th><th>V.G.M</th><th>${t('bookingNo')}</th><th>${t('sealNo')}</th><th>Remark</th><th>FW</th><th>Match</th>${canEdit && !hasEir ? `<th>${t('actions')}</th>` : ''}</tr></thead>
                            <tbody>
                                ${(() => {
                                    let containers = s.containers;
                                    if (this.containerSearch) {
                                        const q = this.containerSearch.toLowerCase();
                                        containers = containers.filter(c =>
                                            c.id.toLowerCase().includes(q) || c.bookingNo.toLowerCase().includes(q) ||
                                            (c.docType || '').toLowerCase().includes(q) || (c.line || '').toLowerCase().includes(q) ||
                                            (c.isoCode || '').toLowerCase().includes(q) || (c.sealNo || '').toLowerCase().includes(q) ||
                                            (c.pol || '').toLowerCase().includes(q) || (c.pod || '').toLowerCase().includes(q) ||
                                            (c.fw || '').toLowerCase().includes(q)
                                        );
                                    }
                                    return containers.length > 0 ? containers.map((c, idx) => {
                                        const isMismatch = !s.bookings.find(b => b.bookingNo === c.bookingNo);
                                        const matchLabel = isMismatch ? `<span class="badge badge-cancelled">Mismatch</span>` : `<span class="badge badge-completed">Matched</span>`;
                                        return `
                                        <tr style="${isMismatch ? 'background:var(--danger-light)' : ''}">
                                            ${canEdit && !hasEir ? `<td><input type="checkbox" ${this.selectedContainers.has(c.id) ? 'checked' : ''} onchange="NPM.toggleContainerSelect('${c.id}','${s.id}')"></td>` : ''}
                                            <td>${idx + 1}</td>
                                            <td>${c.docType || '-'}</td>
                                            <td><strong style="font-family:monospace">${c.id}</strong></td>
                                            <td>${c.line || '-'}</td>
                                            <td>${c.size}' ${c.type}</td>
                                            <td>${c.isoCode || '-'}</td>
                                            <td>${c.containerStatus || '-'}</td>
                                            <td>${c.pol || '-'}</td>
                                            <td>${c.pod || '-'}</td>
                                            <td>${(c.gwt || c.weight || 0).toLocaleString()}</td>
                                            <td>${(c.vgm || 0).toLocaleString()}</td>
                                            <td>${c.bookingNo}</td>
                                            <td>${c.sealNo}</td>
                                            <td>${c.remark || '-'}</td>
                                            <td>${c.fw || '-'}</td>
                                            <td>${matchLabel}</td>
                                            ${canEdit && !hasEir ? `<td>
                                                <div class="btn-group">
                                                    <button class="btn btn-outline btn-sm" onclick="NPM.showEditContainer('${s.id}','${c.id}')">${t('edit')}</button>
                                                    <button class="btn btn-danger btn-sm" onclick="NPM.deleteSingleContainer('${s.id}','${c.id}')">Del</button>
                                                </div>
                                            </td>` : ''}
                                        </tr>`;
                                    }).join('') : `<tr><td colspan="18" style="text-align:center;padding:32px;color:var(--gray-400)">${t('noContainersLoaded')}</td></tr>`;
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="tab-eir" class="tab-content">
                ${s.containers.length > 0 ? `
                <div class="card">
                    <div class="card-header"><h3>${t('eir')}</h3></div>
                    <div style="display:flex;gap:8px;padding:8px 16px;flex-wrap:wrap;align-items:center">
                        <input type="text" placeholder="Search Container ID..." id="eir-tab-search-container" style="padding:6px 10px;border:1px solid var(--gray-300);border-radius:4px;font-size:12px;width:180px">
                        <input type="text" placeholder="Search Booking ID..." id="eir-tab-search-booking" style="padding:6px 10px;border:1px solid var(--gray-300);border-radius:4px;font-size:12px;width:180px">
                        <button class="btn btn-outline btn-sm" onclick="NPM._filterEirTab('${s.id}')">Filter</button>
                    </div>
                    <div class="table-wrap" id="eir-tab-table">
                        <table>
                            <thead><tr><th>Customer No.</th><th>${t('containerId')}</th><th>${t('bookingNo')}</th><th>Size/Type</th><th>${t('shipper')}</th><th>FW</th><th>Direction</th><th>EIR ID</th><th>Date/Time</th><th>${t('status')}</th><th>Truck</th><th>${t('actions')}</th></tr></thead>
                            <tbody>
                                ${s.containers.map(c => {
                                    const booking = s.bookings.find(b => b.bookingNo === c.bookingNo);
                                    const allEirs = [
                                        ...(c.eirOuts || []).map(e => ({ ...e, direction: 'out' })),
                                        ...(c.eirIns || []).map(e => ({ ...e, direction: 'in' }))
                                    ];
                                    const activeOut = getActiveEir(c.eirOuts);
                                    const activeIn = getActiveEir(c.eirIns);
                                    if (allEirs.length === 0) {
                                        return `<tr>
                                            <td>${booking ? booking.shipperCode || '-' : '-'}</td>
                                            <td><strong style="font-family:monospace">${c.id}</strong></td>
                                            <td>${c.bookingNo}</td>
                                            <td>${c.size}' ${c.type}</td>
                                            <td>${booking ? booking.shipper : '-'}</td>
                                            <td>${c.fw || (booking ? booking.fwCode : '-')}</td>
                                            <td colspan="5" style="color:var(--gray-400)">-</td>
                                            <td><button class="btn btn-warning btn-sm" onclick="NPM.createEIR('${s.id}','${c.id}','out')">${t('eirOut')}</button></td>
                                        </tr>`;
                                    }
                                    const rows = allEirs.map((eir, idx) => {
                                        const isActive = eir.status !== 'cancelled';
                                        return `<tr class="${isActive ? '' : 'eir-voided'}">
                                            <td>${idx === 0 ? (booking ? booking.shipperCode || '-' : '-') : ''}</td>
                                            <td>${idx === 0 ? `<strong style="font-family:monospace">${c.id}</strong>` : ''}</td>
                                            <td>${idx === 0 ? c.bookingNo : ''}</td>
                                            <td>${idx === 0 ? `${c.size}' ${c.type}` : ''}</td>
                                            <td>${idx === 0 ? (booking ? booking.shipper : '-') : ''}</td>
                                            <td>${idx === 0 ? (c.fw || (booking ? booking.fwCode : '-')) : ''}</td>
                                            <td><span class="badge ${eir.direction === 'out' ? 'badge-dispatch' : 'badge-completed'}">${eir.direction.toUpperCase()}</span></td>
                                            <td><code>${eir.id}</code></td>
                                            <td>${formatDateTime(eir.time)}</td>
                                            <td>${isActive ? '<span style="color:var(--success)">&#10003; Done</span>' : '<span class="badge badge-cancelled">&#8856; VOIDED</span>'}</td>
                                            <td>${isActive ? (eir.truckNo || '-') : '-'}</td>
                                            <td>
                                                ${isActive && eir.direction === 'out' ? `<button class="btn btn-danger btn-sm" onclick="NPM.showVoidModal('${s.id}','${c.id}','out')">Void Out</button>` : ''}
                                                ${isActive ? `<button class="btn btn-outline btn-sm" onclick="NPM.printEIR('${c.id}')">${t('print')}</button>` : ''}
                                            </td>
                                        </tr>`;
                                    }).join('');
                                    let actionRow = '';
                                    if (!activeOut) {
                                        actionRow = `<tr><td></td><td></td><td></td><td></td><td></td><td></td><td colspan="5"></td><td><button class="btn btn-warning btn-sm" onclick="NPM.createEIR('${s.id}','${c.id}','out')">${t('eirOut')}</button></td></tr>`;
                                    } else if (!activeIn) {
                                        actionRow = `<tr><td></td><td></td><td></td><td></td><td></td><td></td><td colspan="5"></td><td><button class="btn btn-success btn-sm" onclick="NPM.createEIR('${s.id}','${c.id}','in')">${t('eirIn')}</button></td></tr>`;
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

    _filterEirTab(shipId) {
        // Simple client-side filter for EIR tab
        const cq = (document.getElementById('eir-tab-search-container')?.value || '').trim().toUpperCase();
        const bq = (document.getElementById('eir-tab-search-booking')?.value || '').trim().toUpperCase();
        const rows = document.querySelectorAll('#eir-tab-table tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toUpperCase();
            const show = (!cq || text.includes(cq)) && (!bq || text.includes(bq));
            row.style.display = show ? '' : 'none';
        });
    },

    switchTab(el, tabId) {
        el.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        el.closest('.content').querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
    },

    // ========== DELETE SHIPMENT ==========
    deleteShipment(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        if (s.containers.some(c => getActiveEir(c.eirOuts) || getActiveEir(c.eirIns))) {
            showToast('Cannot delete shipment with active EIRs', 'error');
            return;
        }
        if (!confirm(`Delete shipment ${shipId}? This action cannot be undone.`)) return;
        npmShipments = npmShipments.filter(x => x.id !== shipId);
        showToast(`Shipment ${shipId} deleted`, 'success');
        this.renderShipmentList();
    },

    showEditShipment(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        openModal(`
            <div class="modal-header">
                <h2>${t('edit')} ${s.id} ${statusBadge(s.status)}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label>${t('vesselName')}</label>
                        ${renderSS('es-vessel', MASTERS.npmVessels.map(v => ({ value: v.name, label: v.name, active: true })), s.vesselName, null)}
                    </div>
                    <div class="form-group">
                        <label>${t('voyageNo')}</label>
                        <input id="es-voy" type="text" value="${s.voyNo}">
                        <div style="font-size:11px;color:var(--gray-400);margin-top:2px">Format: YYnnnN/S (e.g. 26004S)</div>
                    </div>
                    <div class="form-group">
                        <label>${t('etd')}</label>
                        <input id="es-etd" type="datetime-local" value="${s.etd}">
                    </div>
                    <div class="form-group">
                        <label>WBS (auto)</label>
                        <input type="text" disabled value="${s.wbs}" style="font-family:monospace;background:var(--gray-100)">
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
        const voy = document.getElementById('es-voy').value.trim();
        if (voy && !this.validateVoyNo(voy)) { showToast('Invalid Voy No. format. Expected: YYnnnN/S (e.g. 26004S)', 'error'); return; }
        s.vesselName = (document.getElementById('es-vessel').value || document.getElementById('ss-search-es-vessel')?.value || '').trim();
        s.voyNo = voy;
        s.etd = document.getElementById('es-etd').value;
        // Update WBS with voy
        const num = npmShipments.indexOf(s) + 1;
        s.wbs = `08S.26CF.NPSRT1.S${String(num).padStart(3, '0')}.${voy}`;
        closeModal();
        showToast(t('changesSaved'), 'success');
        this.showDetail(shipId);
    },

    showAddBooking(shipId) {
        const fwOpts = MASTERS.npmForwarders.map(f => ({ value: f.code, label: `${f.code} — ${f.name}` }));
        const cargoOpts = MASTERS.commodities.map(c => ({ value: c, label: c }));
        const lineOpts = MASTERS.containerLines.map(l => ({ value: l.name, label: l.name }));
        const docTypeOptions = MASTERS.docTypes.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        const stsOptions = `<option value="E-MTY">E-MTY</option><option value="F-FCL">F-FCL</option>`;
        openModal(`
            <div class="modal-header">
                <h2>${t('addBooking')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group"><label>FW Code <span class="req">*</span></label>${renderSS('ab-fwcode', fwOpts, '', null)}</div>
                    <div class="form-group"><label>${t('bookingNo')} <span class="req">*</span></label><input id="ab-bookingno" type="text" placeholder="BKG-2026-XXXX"></div>
                    <div class="form-group"><label>${t('cargo')} <span class="req">*</span></label>${renderSS('ab-cargo', cargoOpts, '', null)}</div>
                    <div class="form-group"><label>${t('line')} <span class="req">*</span></label>${renderSS('ab-line', lineOpts, '', null)}</div>
                    <div class="form-group"><label>Sts <span class="req">*</span></label><select id="ab-sts">${stsOptions}</select></div>
                    <div class="form-group"><label>${t('size')} <span class="req">*</span></label><select id="ab-size">${MASTERS.containerSizes.map(s => `<option>${s}</option>`).join('')}</select></div>
                    <div class="form-group"><label>${t('qty')} <span class="req">*</span></label><input id="ab-qty" type="text" value="1" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
                    <div class="form-group"><label>Doc Type <span class="req">*</span></label><select id="ab-doctype">${docTypeOptions}</select></div>
                    <div class="form-group"><label>${t('stuffing')}</label><input id="ab-stuffing" type="text" value="CY"></div>
                    <div class="form-group"><label>Marking</label><input id="ab-marking" type="text"></div>
                    <div class="form-group"><label>Sr. No.</label><input id="ab-srno" type="text"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="NPM.addBooking('${shipId}')">${t('add')}</button>
            </div>
        `);
    },

    _onAbShipperChange(code) {
        const shipper = MASTERS.npmShippers.find(s => s.code === code);
        const el = document.getElementById('ab-shipper');
        if (el) el.value = shipper ? shipper.name : '';
    },

    _onEbShipperChange(code) {
        const shipper = MASTERS.npmShippers.find(s => s.code === code);
        const el = document.getElementById('eb-shipper');
        if (el) el.value = shipper ? shipper.name : '';
    },

    _syncAbShipper() {
        const code = document.getElementById('ab-shippercode')?.value;
        const shipper = MASTERS.npmShippers.find(s => s.code === code);
        const el = document.getElementById('ab-shipper');
        if (el) el.value = shipper ? shipper.name : '';
    },

    addBooking(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const shipperCode = document.getElementById('ab-shippercode').value;
        const fwCode = document.getElementById('ab-fwcode').value;
        const bookingNo = document.getElementById('ab-bookingno').value.trim();
        const cargo = document.getElementById('ab-cargo').value;
        const line = document.getElementById('ab-line').value;
        const qty = document.getElementById('ab-qty').value.trim();

        if (!shipperCode || !fwCode || !bookingNo || !cargo || !line || !qty) {
            showToast('Shipper Code, FW Code, Booking No., Cargo, Line, and Qty are required.', 'error'); return;
        }
        if (!/^\d+$/.test(qty)) { showToast('Qty must be numeric.', 'error'); return; }

        const shipper = MASTERS.npmShippers.find(sh => sh.code === shipperCode);
        const fw = MASTERS.npmForwarders.find(f => f.code === fwCode);
        s.bookings.push({
            id: `BK${String(Date.now()).slice(-5)}`,
            shipperCode,
            shipper: shipper ? shipper.name : shipperCode,
            fwCode,
            fw: fw ? fw.name : fwCode,
            bookingNo,
            cargo,
            line,
            sts: document.getElementById('ab-sts').value,
            fwRef: '',
            size: parseInt(document.getElementById('ab-size').value),
            qty: parseInt(qty),
            stuffing: document.getElementById('ab-stuffing').value,
            marking: document.getElementById('ab-marking').value.trim(),
            srNo: document.getElementById('ab-srno').value.trim(),
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
        const fwOpts = MASTERS.npmForwarders.map(f => ({ value: f.code, label: `${f.code} — ${f.name}` }));
        const cargoOpts = MASTERS.commodities.map(c => ({ value: c, label: c }));
        const lineOpts = MASTERS.containerLines.map(l => ({ value: l.name, label: l.name }));
        const docTypeOptions = MASTERS.docTypes.map(d => `<option value="${d.id}" ${b.docType === d.id ? 'selected' : ''}>${d.name}</option>`).join('');
        const stsOptions = `<option value="E-MTY" ${b.sts === 'E-MTY' ? 'selected' : ''}>E-MTY</option><option value="F-FCL" ${b.sts === 'F-FCL' ? 'selected' : ''}>F-FCL</option>`;
        openModal(`
            <div class="modal-header">
                <h2>${t('editBooking')} &mdash; ${b.bookingNo}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group"><label>FW Code <span class="req">*</span></label>${renderSS('eb-fwcode', fwOpts, b.fwCode, null)}</div>
                    <div class="form-group"><label>${t('bookingNo')} <span class="req">*</span></label><input id="eb-bookingno" type="text" value="${b.bookingNo}"></div>
                    <div class="form-group"><label>${t('cargo')} <span class="req">*</span></label>${renderSS('eb-cargo', cargoOpts, b.cargo, null)}</div>
                    <div class="form-group"><label>${t('line')} <span class="req">*</span></label>${renderSS('eb-line', lineOpts, b.line, null)}</div>
                    <div class="form-group"><label>Sts <span class="req">*</span></label><select id="eb-sts">${stsOptions}</select></div>
                    <div class="form-group"><label>${t('size')} <span class="req">*</span></label><select id="eb-size">${MASTERS.containerSizes.map(sz => `<option ${b.size === sz ? 'selected' : ''}>${sz}</option>`).join('')}</select></div>
                    <div class="form-group"><label>${t('qty')} <span class="req">*</span></label><input id="eb-qty" type="text" value="${b.qty}" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
                    <div class="form-group"><label>Doc Type <span class="req">*</span></label><select id="eb-doctype">${docTypeOptions}</select></div>
                    <div class="form-group"><label>${t('stuffing')}</label><input id="eb-stuffing" type="text" value="${b.stuffing}"></div>
                    <div class="form-group"><label>Marking</label><input id="eb-marking" type="text" value="${b.marking || ''}"></div>
                    <div class="form-group"><label>Sr. No.</label><input id="eb-srno" type="text" value="${b.srNo || ''}"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger" onclick="NPM.deleteBooking('${shipId}','${bookingId}');closeModal()" style="margin-right:auto">Delete Booking</button>
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="NPM.saveEditBooking('${shipId}','${bookingId}')">${t('saveChanges')}</button>
            </div>
        `);
    },

    _syncEbShipper() {
        const code = document.getElementById('eb-shippercode').value;
        const shipper = MASTERS.npmShippers.find(s => s.code === code);
        document.getElementById('eb-shipper').value = shipper ? shipper.name : '';
    },

    saveEditBooking(shipId, bookingId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const b = s.bookings.find(x => x.id === bookingId);
        if (!b) return;

        const shipperCode = document.getElementById('eb-shippercode').value;
        const fwCode = document.getElementById('eb-fwcode').value;
        const bookingNo = document.getElementById('eb-bookingno').value.trim();
        const cargo = document.getElementById('eb-cargo').value;
        const line = document.getElementById('eb-line').value;
        const qty = document.getElementById('eb-qty').value.trim();

        if (!shipperCode || !fwCode || !bookingNo || !cargo || !line || !qty) {
            showToast('Shipper Code, FW Code, Booking No., Cargo, Line, and Qty are required.', 'error'); return;
        }
        if (!/^\d+$/.test(qty)) { showToast('Qty must be numeric.', 'error'); return; }

        const oldBookingNo = b.bookingNo;
        const shipper = MASTERS.npmShippers.find(sh => sh.code === shipperCode);
        const fw = MASTERS.npmForwarders.find(f => f.code === fwCode);
        b.shipperCode = shipperCode;
        b.shipper = shipper ? shipper.name : shipperCode;
        b.fwCode = fwCode;
        b.fw = fw ? fw.name : fwCode;
        b.bookingNo = bookingNo;
        b.cargo = cargo;
        b.line = line;
        b.sts = document.getElementById('eb-sts').value;
        b.size = parseInt(document.getElementById('eb-size').value);
        b.qty = parseInt(qty);
        b.docType = document.getElementById('eb-doctype').value;
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

    // ========== ADD CONTAINER MANUALLY ==========
    showAddContainer(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const docTypeOpts = MASTERS.docTypes.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        const isoOpts = MASTERS.npmIsoCodes.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        const statusOpts = MASTERS.npmContainerStatuses.map(st => `<option value="${st.id}">${st.name}</option>`).join('');
        const lineSSopts = MASTERS.containerLines.map(l => ({ value: l.name, label: l.name }));
        const polSSopts = MASTERS.npmPOL.map(p => ({ value: p.id, label: `${p.id} — ${p.name}` }));
        const podSSopts = MASTERS.npmPOD.map(p => ({ value: p.id, label: `${p.id} — ${p.name}` }));
        const fwOpts = MASTERS.npmForwarders.map(f => `<option value="${f.code}">${f.code} - ${f.name}</option>`).join('');
        openModal(`
            <div class="modal-header">
                <h2>Add Container</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group"><label>Container No. <span class="req">*</span></label><input id="ac-id" type="text" placeholder="e.g. EIRU1234567" style="font-family:monospace"></div>
                    <div class="form-group"><label>Doc Type</label><select id="ac-doctype">${docTypeOpts}</select></div>
                    <div class="form-group"><label>${t('bookingNo')} <span class="req">*</span></label><input id="ac-bookingno" type="text" placeholder="Enter booking no."></div>
                    <div class="form-group"><label>Line</label>${renderSS('ac-line', lineSSopts, '', null)}</div>
                    <div class="form-group"><label>Size</label><select id="ac-size">${MASTERS.containerSizes.map(sz => `<option>${sz}</option>`).join('')}</select></div>
                    <div class="form-group"><label>Type</label><input id="ac-type" type="text" value="GP"></div>
                    <div class="form-group"><label>ISO Code</label><select id="ac-isocode">${isoOpts}</select></div>
                    <div class="form-group"><label>Status</label><select id="ac-status">${statusOpts}</select></div>
                    <div class="form-group"><label>POL</label>${renderSS('ac-pol', polSSopts, '', null)}</div>
                    <div class="form-group"><label>POD</label>${renderSS('ac-pod', podSSopts, '', null)}</div>
                    <div class="form-group"><label>G.W.T</label><input id="ac-gwt" type="number" value="0"></div>
                    <div class="form-group"><label>V.G.M</label><input id="ac-vgm" type="number" value="0"></div>
                    <div class="form-group"><label>Seal No.</label><input id="ac-seal" type="text"></div>
                    <div class="form-group"><label>FW</label><select id="ac-fw"><option value="">-- Select --</option>${fwOpts}</select></div>
                    <div class="form-group"><label>Remark</label><input id="ac-remark" type="text"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="NPM.saveAddContainer('${shipId}')">Add</button>
            </div>
        `);
    },

    saveAddContainer(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const id = document.getElementById('ac-id').value.trim();
        const bookingNo = document.getElementById('ac-bookingno').value;
        if (!id || !bookingNo) { showToast('Container No. and Booking No. are required.', 'error'); return; }
        // Unique key: Booking + Container
        const exists = s.containers.find(c => c.id === id && c.bookingNo === bookingNo);
        if (exists) { showToast('Container with this Booking + Container combination already exists.', 'error'); return; }

        s.containers.push({
            id: id,
            bookingNo: bookingNo,
            docType: document.getElementById('ac-doctype').value,
            line: document.getElementById('ac-line').value,
            size: parseInt(document.getElementById('ac-size').value),
            type: document.getElementById('ac-type').value.trim() || 'GP',
            isoCode: document.getElementById('ac-isocode').value,
            containerStatus: document.getElementById('ac-status').value,
            pol: document.getElementById('ac-pol').value,
            pod: document.getElementById('ac-pod').value,
            gwt: parseInt(document.getElementById('ac-gwt').value) || 0,
            vgm: parseInt(document.getElementById('ac-vgm').value) || 0,
            weight: parseInt(document.getElementById('ac-gwt').value) || 0,
            sealNo: document.getElementById('ac-seal').value.trim(),
            remark: document.getElementById('ac-remark').value.trim(),
            fw: document.getElementById('ac-fw').value,
            inspected: false,
            inspectionStatus: 'pending',
            uploadDate: nowBKK(),
            eirOuts: [],
            eirIns: [],
        });
        closeModal();
        showToast(`Container ${id} added`, 'success');
        this.showDetail(shipId);
    },

    // ========== EDIT CONTAINER ==========
    showEditContainer(shipId, containerId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const c = s.containers.find(x => x.id === containerId);
        if (!c) return;
        const bookingOpts = s.bookings.map(b => `<option value="${b.bookingNo}" ${c.bookingNo === b.bookingNo ? 'selected' : ''}>${b.bookingNo}</option>`).join('');
        const docTypeOpts = MASTERS.docTypes.map(d => `<option value="${d.id}" ${c.docType === d.id ? 'selected' : ''}>${d.name}</option>`).join('');
        const isoOpts = MASTERS.npmIsoCodes.map(i => `<option value="${i.id}" ${c.isoCode === i.id ? 'selected' : ''}>${i.name}</option>`).join('');
        const statusOpts = MASTERS.npmContainerStatuses.map(st => `<option value="${st.id}" ${c.containerStatus === st.id ? 'selected' : ''}>${st.name}</option>`).join('');
        const polOpts = MASTERS.npmPOL.map(p => `<option value="${p.id}" ${c.pol === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
        const podOpts = MASTERS.npmPOD.map(p => `<option value="${p.id}" ${c.pod === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
        const lineOpts = MASTERS.containerLines.map(l => `<option ${c.line === l.name ? 'selected' : ''}>${l.name}</option>`).join('');
        const fwOpts = MASTERS.npmForwarders.map(f => `<option value="${f.code}" ${c.fw === f.code ? 'selected' : ''}>${f.code} - ${f.name}</option>`).join('');
        openModal(`
            <div class="modal-header">
                <h2>${t('editContainer')} &mdash; ${containerId}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group"><label>Container No.</label><input id="ec-id" type="text" value="${c.id}" style="font-family:monospace"></div>
                    <div class="form-group"><label>Doc Type</label><select id="ec-doctype">${docTypeOpts}</select></div>
                    <div class="form-group"><label>${t('bookingNo')} <span class="req">*</span></label>
                        <select id="ec-bookingno">
                            ${bookingOpts}
                            ${!s.bookings.find(b => b.bookingNo === c.bookingNo) ? `<option value="${c.bookingNo}" selected>${c.bookingNo} (Mismatch)</option>` : ''}
                        </select>
                    </div>
                    <div class="form-group"><label>Line</label><select id="ec-line">${lineOpts}</select></div>
                    <div class="form-group"><label>Size</label><select id="ec-size">${MASTERS.containerSizes.map(sz => `<option ${c.size === sz ? 'selected' : ''}>${sz}</option>`).join('')}</select></div>
                    <div class="form-group"><label>Type</label><input id="ec-type" type="text" value="${c.type}"></div>
                    <div class="form-group"><label>ISO Code</label><select id="ec-isocode">${isoOpts}</select></div>
                    <div class="form-group"><label>Status</label><select id="ec-status">${statusOpts}</select></div>
                    <div class="form-group"><label>POL</label><select id="ec-pol">${polOpts}</select></div>
                    <div class="form-group"><label>POD</label><select id="ec-pod">${podOpts}</select></div>
                    <div class="form-group"><label>G.W.T</label><input id="ec-gwt" type="number" value="${c.gwt || c.weight || 0}"></div>
                    <div class="form-group"><label>V.G.M</label><input id="ec-vgm" type="number" value="${c.vgm || 0}"></div>
                    <div class="form-group"><label>Seal No.</label><input id="ec-seal" type="text" value="${c.sealNo}"></div>
                    <div class="form-group"><label>FW</label><select id="ec-fw"><option value="">-- Select --</option>${fwOpts}</select></div>
                    <div class="form-group"><label>Remark</label><input id="ec-remark" type="text" value="${c.remark || ''}"></div>
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
        c.docType = document.getElementById('ec-doctype').value;
        c.line = document.getElementById('ec-line').value;
        c.size = parseInt(document.getElementById('ec-size').value);
        c.type = document.getElementById('ec-type').value.trim();
        c.isoCode = document.getElementById('ec-isocode').value;
        c.containerStatus = document.getElementById('ec-status').value;
        c.pol = document.getElementById('ec-pol').value;
        c.pod = document.getElementById('ec-pod').value;
        c.gwt = parseInt(document.getElementById('ec-gwt').value) || 0;
        c.vgm = parseInt(document.getElementById('ec-vgm').value) || 0;
        c.weight = c.gwt;
        c.sealNo = document.getElementById('ec-seal').value.trim();
        c.fw = document.getElementById('ec-fw').value;
        c.remark = document.getElementById('ec-remark').value.trim();
        closeModal();
        showToast(t('containerSaved'), 'success');
        this.showDetail(shipId);
    },

    // ========== CONTAINER DELETE OPERATIONS ==========
    toggleContainerSelect(containerId, shipId) {
        if (this.selectedContainers.has(containerId)) {
            this.selectedContainers.delete(containerId);
        } else {
            this.selectedContainers.add(containerId);
        }
    },

    toggleAllContainers(checkbox, shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        if (checkbox.checked) {
            s.containers.forEach(c => this.selectedContainers.add(c.id));
        } else {
            this.selectedContainers.clear();
        }
        this.showDetail(shipId);
    },

    deleteSingleContainer(shipId, containerId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const c = s.containers.find(x => x.id === containerId);
        if (c && (getActiveEir(c.eirOuts) || getActiveEir(c.eirIns))) {
            showToast('Cannot delete container with active EIR', 'error'); return;
        }
        if (!confirm(`Delete container ${containerId}?`)) return;
        s.containers = s.containers.filter(x => x.id !== containerId);
        this.selectedContainers.delete(containerId);
        showToast(`Container ${containerId} deleted`, 'success');
        this.showDetail(shipId);
    },

    deleteSelectedContainers(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        if (this.selectedContainers.size === 0) { showToast('No containers selected', 'error'); return; }
        const hasEir = [...this.selectedContainers].some(id => {
            const c = s.containers.find(x => x.id === id);
            return c && (getActiveEir(c.eirOuts) || getActiveEir(c.eirIns));
        });
        if (hasEir) { showToast('Cannot delete containers with active EIR', 'error'); return; }
        if (!confirm(`Delete ${this.selectedContainers.size} selected container(s)?`)) return;
        s.containers = s.containers.filter(c => !this.selectedContainers.has(c.id));
        this.selectedContainers.clear();
        showToast('Selected containers deleted', 'success');
        this.showDetail(shipId);
    },

    deleteAllContainers(shipId) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const hasEir = s.containers.some(c => getActiveEir(c.eirOuts) || getActiveEir(c.eirIns));
        if (hasEir) { showToast('Cannot delete all - some containers have active EIR', 'error'); return; }
        if (!confirm(`Delete ALL ${s.containers.length} containers?`)) return;
        s.containers = [];
        this.selectedContainers.clear();
        showToast('All containers deleted', 'success');
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

    // ========== LOADING LIST (APPEND, not replace) ==========
    showLoadingListUpload(shipId) {
        openModal(`
            <div class="modal-header">
                <h2>${t('uploadContainerLoading')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="background:var(--primary-light);padding:10px 14px;border-radius:6px;margin-bottom:12px;font-size:12px">
                    <strong>Note:</strong> Uploaded containers will be <strong>appended</strong> to existing containers (not replaced). Duplicate Booking + Container combinations will be skipped.
                </div>
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
        const polOptions = MASTERS.npmPOL.map(p => p.id);
        const podOptions = MASTERS.npmPOD.map(p => p.id);
        s.bookings.forEach((b, bi) => {
            const count = Math.min(b.qty, 3);
            for (let i = 0; i < count; i++) {
                const cid = `${prefixes[bi % prefixes.length]}${String(Math.random()).slice(2,9)}`;
                // Skip if already exists (unique key: booking + container)
                if (s.containers.find(c => c.id === cid && c.bookingNo === b.bookingNo)) continue;
                mockContainers.push({
                    id: cid,
                    bookingNo: b.bookingNo,
                    docType: b.docType,
                    line: b.line,
                    size: b.size,
                    type: 'GP',
                    isoCode: b.size === 20 ? '22G1' : '42G1',
                    containerStatus: 'FULL',
                    pol: polOptions[bi % polOptions.length],
                    pod: podOptions[bi % podOptions.length],
                    gwt: Math.floor(15000 + Math.random() * 15000),
                    vgm: Math.floor(15500 + Math.random() * 15000),
                    sealNo: `SL-${String(Math.random()).slice(2,5)}`,
                    weight: Math.floor(15000 + Math.random() * 15000),
                    remark: '',
                    fw: b.fwCode || '',
                });
            }
        });

        document.getElementById('ll-preview').innerHTML = `
            <div style="font-weight:600;margin-bottom:8px">${t('previewContainers', { count: mockContainers.length })} (will be appended to ${s.containers.length} existing)</div>
            <div style="max-height:300px;overflow-y:auto">
            <table>
                <thead><tr><th>${t('containerId')}</th><th>${t('bookingNo')}</th><th>Doc Type</th><th>Line</th><th>Size/Type</th><th>ISO</th><th>Status</th><th>POL</th><th>POD</th><th>G.W.T</th><th>V.G.M</th><th>${t('sealNo')}</th><th>FW</th><th></th></tr></thead>
                <tbody>
                    ${mockContainers.map(c => `
                        <tr>
                            <td style="font-family:monospace">${c.id}</td>
                            <td>${c.bookingNo}</td>
                            <td>${c.docType}</td>
                            <td>${c.line}</td>
                            <td>${c.size}' ${c.type}</td>
                            <td>${c.isoCode}</td>
                            <td>${c.containerStatus}</td>
                            <td>${c.pol}</td>
                            <td>${c.pod}</td>
                            <td>${c.gwt.toLocaleString()}</td>
                            <td>${c.vgm.toLocaleString()}</td>
                            <td>${c.sealNo}</td>
                            <td>${c.fw}</td>
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
        const now = nowBKK();
        // APPEND instead of replace
        const newContainers = this._pendingContainers.map(c => ({
            ...c,
            inspected: false,
            inspectionStatus: 'pending',
            uploadDate: now,
            eirOuts: [],
            eirIns: [],
        })).filter(nc => !s.containers.find(ec => ec.id === nc.id && ec.bookingNo === nc.bookingNo));
        s.containers = [...s.containers, ...newContainers];
        const addedCount = newContainers.length;
        this._pendingContainers = null;
        closeModal();
        showToast(t('containersLoaded', { count: addedCount }) + ` (${s.containers.length} total)`, 'success');
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
    createEIR(shipId, containerId, direction) {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const c = s.containers.find(x => x.id === containerId);
        if (!c) return;

        // Check inspection (with bypass config)
        if (!npmSettings.bypassInspection && !c.inspected && !containerInspections[containerId]) {
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
        const bkkNow = nowBKK();
        const dateStr = bkkNow.slice(0, 10);
        const timeStr = bkkNow.slice(11, 16);

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
                            <label>${t('vesselShipment')}</label>
                            <input type="text" disabled value="${s.id}">
                        </div>
                    </div>
                    <div style="display:flex;gap:16px;margin-top:8px">
                        <label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" id="eir-notreturning"> ${t('containerNotReturning')}</label>
                        <label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" id="eir-notclosed"> ${t('containerNotClosed')}</label>
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
                                <option value="EX" ${booking && booking.sts === 'EX' ? 'selected' : ''}>EX - Export</option>
                                <option value="IM" ${booking && booking.sts === 'IM' ? 'selected' : ''}>IM - Import</option>
                                <option value="DO" ${booking && booking.sts === 'DO' ? 'selected' : ''}>DO - Domestic</option>
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
                            ${renderSS('eir-lineagent', MASTERS.containerLines.map(l => ({ value: l.name, label: l.name, active: true })), booking ? booking.line : '', null)}
                        </div>
                        <div class="form-group">
                            <label>${t('forwarder')}</label>
                            ${renderSS('eir-forwarder', MASTERS.npmForwarders.map(f => ({ value: f.code, label: f.code + ' — ' + f.name, active: true })), booking ? (booking.fwCode || booking.fw) : '', null)}
                        </div>
                        <div class="form-group">
                            <label>${t('containerStatus')}</label>
                            <select id="eir-containerstatus">
                                <option>FCL</option>
                                <option>MTY</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>${t('weight')} (TON)</label>
                            <input id="eir-weight" type="text" value="${((c.gwt || c.weight) / 1000).toFixed(3)}">
                        </div>
                        <div class="form-group">
                            <label>Customer (Shipper)</label>
                            ${renderSS('eir-customer', MASTERS.npmShippers.map(sh => ({ value: sh.name, label: sh.code + ' — ' + sh.name, active: true })), booking ? booking.shipper : '', null)}
                        </div>
                        <div class="form-group">
                            <label>${t('sealNo')}</label>
                            <input type="text" disabled value="${c.sealNo}">
                        </div>
                        <div class="form-group">
                            <label>${t('commodity')}</label>
                            ${renderSS('eir-commodity', MASTERS.commodities.map(c => ({ value: c, label: c, active: true })), booking ? booking.cargo : '', null)}
                        </div>
                        <div class="form-group">
                            <label>Vessel/Voy</label>
                            <input type="text" disabled value="${s.vesselName} / ${s.voyNo}">
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
                <div style="background:var(--gray-50);padding:16px 20px;border-radius:8px;border:1px solid var(--gray-200)">
                    <!-- Shipment No. for auto-fill -->
                    <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--gray-200)">
                        <div class="form-group" style="flex:1;max-width:300px">
                            <label>Shipment No.</label>
                            ${renderSS('eir-shipmentno', MASTERS.npmShipmentNos.map(sn => ({ value: sn.no, label: sn.no, active: true })), '', 'NPM._lookupShipmentNo')}
                        </div>
                        <span id="eir-shipmentno-status" style="font-size:12px;color:var(--gray-400);padding-bottom:10px"></span>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>${t('truckHeadPlate')} <span class="req">*</span></label>
                            ${renderSS('eir-truckhead', MASTERS.npmTruckHeads.map(t => ({ value: t.plate, label: t.plate, active: true })), '', null)}
                        </div>
                        <div class="form-group">
                            <label>${t('truckTailPlate')}</label>
                            ${renderSS('eir-trucktail', MASTERS.npmTruckTails.map(t => ({ value: t.plate, label: t.plate, active: true })), '', null)}
                        </div>
                        <div class="form-group">
                            <label>${t('carrier')} <span class="req">*</span></label>
                            ${renderSS('eir-carrier', MASTERS.npmCarriers.map(c => ({ value: c.name, label: c.name, active: true })), '', null)}
                        </div>
                        <div class="form-group">
                            <label>${t('driver')} <span class="req">*</span></label>
                            ${renderSS('eir-driver', MASTERS.npmDrivers.map(d => ({ value: d.name, label: d.name, active: true })), '', null)}
                        </div>
                        <div class="form-group">
                            <label>${t('officer')}</label>
                            <input id="eir-officer" type="text">
                        </div>
                        <div class="form-group">
                            <label>${t('billNo')}</label>
                            <input id="eir-billno" type="text" placeholder="e.g. 117089">
                        </div>
                        <div class="form-group">
                            <label>${t('weighingSlipNo')}</label>
                            <input id="eir-weighslip" type="text" placeholder="e.g. 01">
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
            event: document.getElementById('eir-event').value,
            containerNotReturning: document.getElementById('eir-notreturning').checked,
            containerNotClosed: document.getElementById('eir-notclosed').checked,
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
            truckNo: truckHead,
            truckHeadPlate: truckHead,
            truckTailPlate: document.getElementById('eir-trucktail').value.trim(),
            officer: document.getElementById('eir-officer').value.trim(),
            billNo: document.getElementById('eir-billno').value.trim(),
            carrier: carrier,
            weighingSlipNo: document.getElementById('eir-weighslip').value.trim(),
            driverName: driver,
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
        // Stay on modal — show success with print button
        openModal(`
            <div class="modal-header">
                <h2>${dirLabel} Created</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body" style="text-align:center;padding:32px">
                <div style="font-size:48px;margin-bottom:12px;color:var(--success)">&#10003;</div>
                <div style="font-size:18px;font-weight:700;margin-bottom:4px">${dirLabel} — ${containerId}</div>
                <div style="font-size:14px;color:var(--gray-500);margin-bottom:4px">EIR No.: <strong style="font-family:monospace">${eir.id}</strong></div>
                <div style="font-size:13px;color:var(--gray-400)">${eir.checkDate} ${eir.checkTime}</div>
            </div>
            <div class="modal-footer" style="justify-content:center;gap:12px">
                <button class="btn btn-primary" onclick="NPM.printEIR('${containerId}')">Print ${dirLabel}</button>
                <button class="btn btn-outline" onclick="closeModal()">Close</button>
            </div>
        `);
        showToast(t('eirCreated', { dir: dirLabel, id: containerId }), 'success');
    },

    showVoidModal(shipId, containerId, direction, returnView = 'detail') {
        const s = npmShipments.find(x => x.id === shipId);
        if (!s) return;
        const c = s.containers.find(x => x.id === containerId);
        if (!c) return;
        const activeEir = direction === 'out' ? getActiveEir(c.eirOuts) : getActiveEir(c.eirIns);
        if (!activeEir) return;

        const reasonOptions = MASTERS.npmVoidReasons.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

        openModal(`
            <div class="modal-header">
                <div>
                    <h2 style="font-size:16px">Void EIR ${direction === 'out' ? 'Out' : 'In'}</h2>
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
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px">Reason for Void <span style="color:var(--danger)">*</span></label>
                    <select id="void-reason" style="width:100%;border:1px solid var(--gray-300);border-radius:6px;padding:8px 12px;font-size:13px;outline:none" onchange="NPM._checkVoidForm()">
                        <option value="">-- Select Reason --</option>
                        ${reasonOptions}
                    </select>
                </div>
                <div style="margin-bottom:14px">
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px">Additional Notes</label>
                    <textarea id="void-note" style="width:100%;border:1px solid var(--gray-300);border-radius:6px;padding:8px 12px;font-size:13px;resize:vertical;min-height:80px;outline:none" placeholder="Specify additional details..." onkeyup="NPM._checkVoidForm()"></textarea>
                </div>
                <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
                    <input type="checkbox" id="void-confirm-check" style="width:16px;height:16px;accent-color:var(--danger)" onchange="NPM._checkVoidForm()">
                    I confirm that I have reviewed the data and want to void this EIR
                </label>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-danger" id="void-confirm-btn" disabled onclick="NPM.cancelEIR('${shipId}','${containerId}','${direction}','${returnView}')">Confirm Void EIR ${direction === 'out' ? 'Out' : 'In'}</button>
            </div>
        `);
    },

    _lookupShipmentNo(val) {
        const statusEl = document.getElementById('eir-shipmentno-status');
        if (!val || val.length < 3) { if (statusEl) statusEl.textContent = ''; return; }
        // Mock shipment-truck lookup data
        const mockTrucks = {
            '80001001': { truckHead: '83-0569', truckTail: '83-1051', carrier: 'ABC Transport', driver: 'Somchai P.' },
            '80001002': { truckHead: '72-4321', truckTail: '72-4322', carrier: 'Fast Logistics', driver: 'Prasert K.' },
            '80001003': { truckHead: '91-5678', truckTail: '91-5679', carrier: 'MTP Hauling', driver: 'Wichai S.' },
            '80001004': { truckHead: '85-1234', truckTail: '85-1235', carrier: 'Fast Logistics', driver: 'Anon T.' },
            '80001005': { truckHead: '77-9876', truckTail: '77-9877', carrier: 'MTP Hauling', driver: 'Wichai S.' },
        };
        const match = mockTrucks[val];
        const ssSet = (id, value) => {
            const hidden = document.getElementById(id);
            const search = document.getElementById('ss-search-' + id);
            if (hidden) hidden.value = value;
            if (search) search.value = value;
        };
        if (match) {
            ssSet('eir-truckhead', match.truckHead);
            ssSet('eir-trucktail', match.truckTail);
            ssSet('eir-carrier', match.carrier);
            ssSet('eir-driver', match.driver);
            if (statusEl) { statusEl.style.color = 'var(--success)'; statusEl.textContent = '✓ Found — auto-filled'; }
        } else {
            if (statusEl) { statusEl.style.color = 'var(--gray-400)'; statusEl.textContent = 'No match — enter manually'; }
        }
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

        const eirs = direction === 'out' ? c.eirOuts : c.eirIns;
        const activeEir = getActiveEir(eirs);
        if (activeEir) {
            activeEir.status = 'cancelled';
            activeEir.voidReason = document.getElementById('void-reason')?.value || '';
            activeEir.voidNote = document.getElementById('void-note')?.value || '';
            showToast(t('eirCancelled', { id: activeEir.id }), 'success');
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
                const booking = s.bookings.find(b => b.bookingNo === c.bookingNo);
                allContainers.push({ ...c, shipmentId: s.id, vesselName: s.vesselName, voyNo: s.voyNo, booking });
            });
        });

        // Filter by container/booking search and date range
        let filtered = allContainers;
        if (this.eirSearchContainer) {
            const q = this.eirSearchContainer.toUpperCase();
            filtered = filtered.filter(c => c.id.toUpperCase().includes(q));
        }
        if (this.eirSearchBooking) {
            const q = this.eirSearchBooking.toUpperCase();
            filtered = filtered.filter(c => c.bookingNo.toUpperCase().includes(q));
        }
        if (this.eirDateFrom || this.eirDateTo) {
            filtered = filtered.filter(c => {
                const uploadDate = (c.uploadDate || '').slice(0, 10);
                if (this.eirDateFrom && uploadDate < this.eirDateFrom) return false;
                if (this.eirDateTo && uploadDate > this.eirDateTo) return false;
                return true;
            });
        }

        const activeEirOut = filtered.filter(c => getActiveEir(c.eirOuts));
        const activeEirIn = filtered.filter(c => getActiveEir(c.eirIns));
        const pendingOut = filtered.filter(c => !getActiveEir(c.eirOuts));

        document.getElementById('npm-content').innerHTML = `
            <div class="page-header">
                <div class="page-title">${t('eirManagement')}</div>
            </div>
            <div class="stats-row">
                <div class="stat-card"><div class="stat-value">${filtered.length}</div><div class="stat-label">${t('totalContainers')}</div></div>
                <div class="stat-card"><div class="stat-value">${activeEirOut.length}</div><div class="stat-label">${t('eirOutDone')}</div></div>
                <div class="stat-card"><div class="stat-value">${activeEirIn.length}</div><div class="stat-label">${t('eirInDone')}</div></div>
                <div class="stat-card"><div class="stat-value">${pendingOut.length}</div><div class="stat-label">${t('pendingEirOut')}</div></div>
            </div>

            <!-- Filter row -->
            <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
                <!-- Container ID -->
                <div style="display:flex;gap:6px;align-items:center">
                    <span style="font-size:12px;color:var(--gray-500);font-weight:600">Container:</span>
                    <input type="text" value="${this.eirSearchContainer}" placeholder="e.g. EIRU1234567"
                        oninput="NPM.eirSearchContainer=this.value;NPM.renderEIRList()"
                        style="font-size:12px;padding:4px 10px;border:1px solid var(--gray-300);border-radius:6px;width:150px">
                </div>
                <!-- Booking ID -->
                <div style="display:flex;gap:6px;align-items:center">
                    <span style="font-size:12px;color:var(--gray-500);font-weight:600">Booking:</span>
                    <input type="text" value="${this.eirSearchBooking}" placeholder="e.g. BKG-2026-0001"
                        oninput="NPM.eirSearchBooking=this.value;NPM.renderEIRList()"
                        style="font-size:12px;padding:4px 10px;border:1px solid var(--gray-300);border-radius:6px;width:150px">
                </div>
                <!-- Date range -->
                <div style="display:flex;gap:6px;align-items:center">
                    <span style="font-size:12px;color:var(--gray-500);font-weight:600">Date:</span>
                    <input type="date" value="${this.eirDateFrom}" onchange="NPM.eirDateFrom=this.value;NPM.renderEIRList()" style="font-size:12px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                    <span style="font-size:12px;color:var(--gray-400)">–</span>
                    <input type="date" value="${this.eirDateTo}" onchange="NPM.eirDateTo=this.value;NPM.renderEIRList()" style="font-size:12px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                    <button class="btn btn-outline btn-sm" onclick="NPM._resetEirDateFilter()">Last 30d</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
                    <h3>${t('allContainerEir')}</h3>
                    <button class="btn btn-outline btn-sm" onclick="NPM.renderEIRList()">&#8635; Refresh</button>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            <th>Customer No.</th><th>${t('containerId')}</th><th>${t('bookingNo')}</th><th>Size/Type</th>
                            <th>${t('shipper')}</th><th>FW</th><th>${t('status')}</th>
                            <th>${t('eirOut')}</th><th>${t('eirIn')}</th><th>${t('actions')}</th>
                        </tr></thead>
                        <tbody>
                            ${filtered.map(c => {
                                const bk = c.booking;
                                const eirOut = getActiveEir(c.eirOuts);
                                const eirIn = getActiveEir(c.eirIns);
                                const voidedOut = !eirOut && c.eirOuts && c.eirOuts.some(e => e.status === 'cancelled');
                                const voidedIn = !eirIn && c.eirIns && c.eirIns.some(e => e.status === 'cancelled');
                                return `
                                <tr>
                                    <td style="font-size:12px">${bk ? bk.shipperCode || '-' : '-'}</td>
                                    <td><span style="font-family:monospace;font-weight:600;font-size:12px">${c.id}</span></td>
                                    <td style="font-size:12px">${c.bookingNo}</td>
                                    <td style="font-size:12px">${c.size}' ${c.type}</td>
                                    <td style="font-size:12px">${bk ? bk.shipper : '-'}</td>
                                    <td style="font-size:12px">${c.fw || (bk ? bk.fwCode : '-')}</td>
                                    <td>${c.inspected ? '<span style="color:var(--success)">&#10003;</span>' : '<span style="color:var(--danger)">&#10007;</span>'}</td>
                                    <td style="font-size:11px">${eirOut ? `<code>${eirOut.id}</code>` : (voidedOut ? '<span style="color:var(--danger)">VOIDED</span>' : '-')}</td>
                                    <td style="font-size:11px">${eirIn ? `<code>${eirIn.id}</code>` : (voidedIn ? '<span style="color:var(--danger)">VOIDED</span>' : '-')}</td>
                                    <td style="white-space:nowrap">
                                        ${!eirOut
                                            ? `<button class="btn btn-warning btn-sm" style="font-size:11px;padding:3px 8px" onclick="NPM.createEIR('${c.shipmentId}','${c.id}','out')">EIR Out</button>`
                                            : `<button class="btn btn-outline btn-sm" style="font-size:11px;padding:3px 8px" onclick="NPM.printEIR('${c.id}')">Print</button>
                                               <button class="btn btn-danger btn-sm" style="font-size:11px;padding:3px 8px" onclick="NPM.showVoidModal('${c.shipmentId}','${c.id}','out','list')">Void Out</button>`}
                                        ${eirOut && !eirIn ? `<button class="btn btn-success btn-sm" style="font-size:11px;padding:3px 8px" onclick="NPM.createEIR('${c.shipmentId}','${c.id}','in')">EIR In</button>` : ''}
                                        ${eirIn ? `<button class="btn btn-danger btn-sm" style="font-size:11px;padding:3px 8px" onclick="NPM.showVoidModal('${c.shipmentId}','${c.id}','in','list')">Void In</button>` : ''}
                                    </td>
                                </tr>`;
                            }).join('')}
                            ${filtered.length === 0 ? `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--gray-400)">${t('noContainersAvailable')}</td></tr>` : ''}
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
            ${npmSettings.bypassInspection ? `<div style="background:var(--warning-light);padding:10px 14px;border-radius:6px;margin-bottom:12px;font-size:12px;border:1px solid var(--warning)"><strong>Note:</strong> Inspection bypass is enabled in <a href="#" onclick="event.preventDefault();NPM.navigate('npm-settings')" style="color:var(--primary);font-weight:600">Settings</a>. EIR can be created without inspection.</div>` : ''}
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
                                const hasDamage = insp && insp.damages && insp.damages.length > 0;
                                const statusLabel = hasDamage ? `<span class="badge badge-cancelled">Damaged</span>` :
                                    (insp ? `<span class="badge badge-completed">${t('inspected')}</span>` : `<span class="badge badge-draft">${t('pending')}</span>`);
                                return `<tr>
                                    <td><strong style="font-family:monospace">${c.id}</strong></td>
                                    <td>${c.shipmentId}</td>
                                    <td>${c.vesselName}</td>
                                    <td>${c.size}' ${c.type}</td>
                                    <td>${statusLabel}</td>
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

    // ========== NEW POSITION-BASED INSPECTION ==========
    _inspectionState: {
        area: 'Exterior', // Exterior or Interior
        selectedPosition: null,
        damages: [], // { area, positionId, positionLabel, damageTypes: [] }
    },

    startInspection(containerId, shipId) {
        this._inspectionState = { area: 'Exterior', selectedPosition: null, damages: [] };
        this._renderInspectionModal(containerId, shipId);
    },

    _renderInspectionModal(containerId, shipId) {
        const state = this._inspectionState;
        const positions = INSPECTION_POSITIONS[state.area] || [];
        const damageTypes = MASTERS.npmDamageTypes || [];

        openModal(`
            <div class="modal-header">
                <h2>${t('containerInspection')} &mdash; ${containerId}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group" style="margin-bottom:16px">
                    <label>${t('inspectorName')} <span class="req">*</span></label>
                    <input id="insp-name" type="text" value="${state._inspector || ''}">
                </div>

                <!-- Area Selection -->
                <div style="margin-bottom:16px">
                    <div style="font-weight:600;font-size:14px;margin-bottom:8px">Select Area:</div>
                    <div style="display:flex;gap:8px">
                        ${['Exterior', 'Interior'].map(area => `
                            <button class="btn ${state.area === area ? 'btn-primary' : 'btn-outline'}" onclick="NPM._inspectionState.area='${area}';NPM._inspectionState.selectedPosition=null;NPM._inspectionState._inspector=document.getElementById('insp-name')?.value||'';NPM._renderInspectionModal('${containerId}','${shipId}')">
                                ${area} (${area === 'Exterior' ? 'E' : 'I'})
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Position Selection -->
                <div style="margin-bottom:16px">
                    <div style="font-weight:600;font-size:14px;margin-bottom:8px">Select Position:</div>
                    ${(() => {
                        const groups = [
                            { label: 'Front', prefix: 'F' },
                            { label: 'Back', prefix: 'B' },
                            { label: 'Top', prefix: 'T' },
                            { label: 'Under', prefix: 'U' },
                            { label: 'Left', prefix: 'L' },
                            { label: 'Right', prefix: 'R' },
                        ];
                        return groups.map(g => {
                            const groupPos = positions.filter(p => p.code.startsWith(g.prefix));
                            if (!groupPos.length) return '';
                            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                                <span style="font-size:12px;font-weight:600;color:var(--gray-500);width:50px">${g.label}</span>
                                <div style="display:flex;gap:4px">
                                    ${groupPos.map(pos => {
                                        const hasDamage = state.damages.some(d => d.positionId === pos.id);
                                        const isSelected = state.selectedPosition === pos.id;
                                        return `<button class="btn btn-sm ${isSelected ? 'btn-primary' : hasDamage ? 'btn-danger' : 'btn-outline'}"
                                            onclick="NPM._inspectionState.selectedPosition='${pos.id}';NPM._inspectionState._inspector=document.getElementById('insp-name')?.value||'';NPM._renderInspectionModal('${containerId}','${shipId}')"
                                            style="min-width:48px;font-size:12px">${pos.code}${hasDamage ? ' !' : ''}</button>`;
                                    }).join('')}
                                </div>
                            </div>`;
                        }).join('');
                    })()}
                </div>

                <!-- Damage Selection (for selected position) -->
                ${state.selectedPosition ? (() => {
                    const pos = positions.find(p => p.id === state.selectedPosition);
                    const existingDamage = state.damages.find(d => d.positionId === state.selectedPosition);
                    const selectedDamages = existingDamage ? existingDamage.damageTypes : [];
                    return `
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;margin-bottom:16px">
                        <div style="font-weight:600;font-size:13px;margin-bottom:8px">${state.area} - ${pos ? pos.label : ''} (${pos ? pos.code : ''}): Select Damage(s)</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px">
                            ${damageTypes.map(dt => `
                                <label style="display:flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid var(--gray-300);border-radius:4px;font-size:12px;cursor:pointer;background:${selectedDamages.includes(dt.id) ? 'var(--danger-light)' : '#fff'}">
                                    <input type="checkbox" class="insp-damage-check" value="${dt.id}" ${selectedDamages.includes(dt.id) ? 'checked' : ''} onchange="NPM._updatePositionDamages('${state.selectedPosition}','${state.area}','${pos ? pos.label : ''}')">
                                    ${dt.name}
                                </label>
                            `).join('')}
                        </div>
                    </div>`;
                })() : '<div style="padding:12px;color:var(--gray-400);font-size:13px">Click a position above to add damages</div>'}

                <!-- Current Damages Summary -->
                ${state.damages.length > 0 ? `
                    <div style="margin-top:16px">
                        <div style="font-weight:600;font-size:14px;margin-bottom:8px;color:var(--danger)">Recorded Damages:</div>
                        ${state.damages.map((d, i) => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--danger-light);border-radius:4px;margin-bottom:4px;font-size:12px">
                                <span><strong>${d.area} - ${d.positionLabel}</strong>: ${d.damageTypes.map(dt => {
                                    const dmg = damageTypes.find(x => x.id === dt);
                                    return dmg ? dmg.name : dt;
                                }).join(', ')}</span>
                                <button onclick="NPM._inspectionState.damages.splice(${i},1);NPM._inspectionState._inspector=document.getElementById('insp-name')?.value||'';NPM._renderInspectionModal('${containerId}','${shipId}')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px">&times;</button>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-success" onclick="NPM.saveInspection('${containerId}','${shipId}')">${t('saveInspection')}</button>
            </div>
        `);
    },

    _updatePositionDamages(positionId, area, positionLabel) {
        const checks = document.querySelectorAll('.insp-damage-check');
        const selected = [];
        checks.forEach(chk => { if (chk.checked) selected.push(chk.value); });

        const existing = this._inspectionState.damages.findIndex(d => d.positionId === positionId);
        if (selected.length === 0) {
            if (existing >= 0) this._inspectionState.damages.splice(existing, 1);
        } else {
            if (existing >= 0) {
                this._inspectionState.damages[existing].damageTypes = selected;
            } else {
                this._inspectionState.damages.push({ area, positionId, positionLabel, damageTypes: selected });
            }
        }
    },

    saveInspection(containerId, shipId) {
        const inspector = document.getElementById('insp-name').value.trim();
        if (!inspector) { showToast(t('inspectorNameRequired'), 'error'); return; }

        const hasDamages = this._inspectionState.damages.length > 0;
        const hasChecklistIssues = INSPECTION_CHECKLIST.some(item => {
            const el = document.getElementById(`chk-${item.id}`);
            return el && !el.checked;
        });

        containerInspections[containerId] = {
            completedAt: nowBKK(),
            inspector: inspector,
            damages: [...this._inspectionState.damages],
            items: INSPECTION_CHECKLIST.map(item => ({
                ...item,
                ok: document.getElementById(`chk-${item.id}`)?.checked ?? true,
                note: document.getElementById(`note-${item.id}`)?.value || '',
            })),
        };

        // Update container inspection status
        npmShipments.forEach(s => {
            const c = s.containers.find(x => x.id === containerId);
            if (c) {
                c.inspected = true;
                c.inspectionStatus = (hasDamages || hasChecklistIssues) ? 'damaged' : 'inspected';
            }
        });

        closeModal();
        const statusMsg = (hasDamages || hasChecklistIssues) ? ' (damaged)' : ' (passed)';
        showToast(t('inspectionCompleted', { id: containerId }) + statusMsg, 'success');
        this.renderInspection();
    },

    viewInspection(containerId) {
        const insp = containerInspections[containerId];
        if (!insp) return;
        const failed = insp.items ? insp.items.filter(i => !i.ok) : [];
        const damages = insp.damages || [];
        const damageTypes = MASTERS.npmDamageTypes || [];

        openModal(`
            <div class="modal-header">
                <h2>${t('inspectionReport')} &mdash; ${containerId}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="info-grid" style="margin-bottom:20px">
                    <div class="info-item"><label>${t('inspector')}</label><div class="value">${insp.inspector}</div></div>
                    <div class="info-item"><label>${t('date')}</label><div class="value">${formatDateTime(insp.completedAt)}</div></div>
                    <div class="info-item"><label>${t('result')}</label><div class="value">${
                        damages.length > 0 ? `<span style="color:var(--danger)">Damaged (${damages.length} position(s))</span>` :
                        failed.length === 0 ? `<span style="color:var(--success)">${t('allPassed')}</span>` :
                        `<span style="color:var(--danger)">${t('issues', { count: failed.length })}</span>`
                    }</div></div>
                </div>

                ${damages.length > 0 ? `
                    <div style="margin-bottom:16px">
                        <div style="font-weight:600;font-size:14px;margin-bottom:8px;color:var(--danger)">Position Damages:</div>
                        ${damages.map(d => `
                            <div style="padding:8px 12px;background:var(--danger-light);border-radius:4px;margin-bottom:4px;font-size:13px">
                                <strong>${d.area} - ${d.positionLabel}</strong>: ${d.damageTypes.map(dt => {
                                    const dmg = damageTypes.find(x => x.id === dt);
                                    return dmg ? dmg.name : dt;
                                }).join(', ')}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                ${insp.items ? ['Exterior', 'Interior', 'Door', 'Markings'].map(cat => `
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
                `).join('') : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('close')}</button>
            </div>
        `);
    },

    // ========== MASTER DATA ==========
    renderSettings() {
        document.getElementById('npm-content').innerHTML = `
            <div class="page-header">
                <div class="page-title">Settings</div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Inspection</h3></div>
                <div class="card-body">
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0">
                        <div>
                            <div style="font-size:14px;font-weight:600">Bypass Inspection</div>
                            <div style="font-size:12px;color:var(--gray-500);margin-top:2px">Allow creating EIR without completing container inspection</div>
                        </div>
                        <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer">
                            <input type="checkbox" ${npmSettings.bypassInspection ? 'checked' : ''}
                                onchange="npmSettings.bypassInspection=this.checked;NPM.renderSettings()"
                                style="opacity:0;width:0;height:0">
                            <span style="position:absolute;inset:0;background:${npmSettings.bypassInspection ? 'var(--warning)' : 'var(--gray-300)'};border-radius:12px;transition:.3s"></span>
                            <span style="position:absolute;top:2px;left:${npmSettings.bypassInspection ? '22px' : '2px'};width:20px;height:20px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
                        </label>
                    </div>
                    ${npmSettings.bypassInspection ? `<div style="background:var(--warning-light);padding:8px 12px;border-radius:6px;margin-top:8px;font-size:12px;border:1px solid var(--warning)"><strong>Warning:</strong> Bypass is active. EIR can be created without inspection.</div>` : ''}
                </div>
            </div>
        `;
    },

    renderMasterData() {
        const masterSections = [
            { key: 'docTypes', label: 'Doc Type', fields: ['id', 'name'], data: MASTERS.docTypes },
            { key: 'containerLines', label: 'Line', fields: ['id', 'name'], data: MASTERS.containerLines },
            { key: 'npmIsoCodes', label: 'ISO Code', fields: ['id', 'name'], data: MASTERS.npmIsoCodes },
            { key: 'npmContainerStatuses', label: 'Container Status', fields: ['id', 'name'], data: MASTERS.npmContainerStatuses },
            { key: 'npmPOL', label: 'POL (Port of Loading)', fields: ['id', 'name'], data: MASTERS.npmPOL },
            { key: 'npmPOD', label: 'POD (Port of Discharge)', fields: ['id', 'name'], data: MASTERS.npmPOD },
            { key: 'npmShippers', label: 'Shipper', fields: ['id', 'code', 'name'], data: MASTERS.npmShippers },
            { key: 'npmForwarders', label: 'Forwarder (FW)', fields: ['id', 'code', 'name'], data: MASTERS.npmForwarders },
        ];

        document.getElementById('npm-content').innerHTML = `
            <div class="page-header">
                <div class="page-title">NPM Master Data</div>
            </div>
            ${masterSections.map(section => `
                <div class="card" style="margin-bottom:16px">
                    <div class="card-header">
                        <h3>${section.label}</h3>
                        <span style="font-size:12px;color:var(--gray-500)">${section.data.length} records</span>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead><tr>${section.fields.map(f => `<th>${f.toUpperCase()}</th>`).join('')}</tr></thead>
                            <tbody>
                                ${section.data.map(row => `
                                    <tr>${section.fields.map(f => `<td>${row[f] || '-'}</td>`).join('')}</tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join('')}
        `;
    },
};
