// ========== SCM MODULE ==========

const SCM = {
    currentView: 'scm-tug-list',
    statusFilter: new Set(),
    siteFilter: 'all',
    dateFrom: '',
    dateTo: '',
    searchText: '',
    activityFilter: 'all',
    sortField: '',
    sortDir: 'asc',
    _expandMTPHO: false,
    _activeReportTab: 'actual',
    // Shipment list filters
    shipSiteFilter: 'all',
    shipDateFrom: '',
    shipDateTo: '',
    shipSearchText: '',
    shipActivityFilter: 'all',
    shipStatusFilter: new Set(),

    init() {
        const today = new Date();
        const d1 = new Date(today); d1.setDate(today.getDate() - 5);
        this.dateFrom = d1.toISOString().slice(0, 10);
        this.dateTo = today.toISOString().slice(0, 10);
        this.shipDateFrom = this.dateFrom;
        this.shipDateTo = this.dateTo;
        this.renderTugList();
    },

    navigate(view) {
        this.currentView = view;
        document.querySelectorAll('#scm-module .nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
        if (view === 'scm-tug-list') this.renderTugList();
        else if (view === 'scm-shipment-list') this.renderShipmentList();
        else if (view === 'scm-settlement') this.renderSettlement();
    },

    // ========== TUG SCHEDULE LIST ==========
    renderTugList() {
        // Apply filters
        let filtered = [...scmTugSchedules];
        if (this.statusFilter.size > 0) filtered = filtered.filter(ts => this.statusFilter.has(ts.status));
        if (this.siteFilter !== 'all') filtered = filtered.filter(ts => ts.site === this.siteFilter);
        if (this.dateFrom) filtered = filtered.filter(ts => ts.workDate.slice(0, 10) >= this.dateFrom);
        if (this.dateTo) filtered = filtered.filter(ts => ts.workDate.slice(0, 10) <= this.dateTo);
        if (this.activityFilter !== 'all') filtered = filtered.filter(ts => ts.activity.id === this.activityFilter);
        if (this.searchText) {
            const q = this.searchText.toLowerCase();
            filtered = filtered.filter(ts =>
                ts.id.toLowerCase().includes(q) ||
                ts.agent.name.toLowerCase().includes(q) ||
                ts.vessel.name.toLowerCase().includes(q) ||
                ts.port.name.toLowerCase().includes(q) ||
                ts.activity.name.toLowerCase().includes(q) ||
                (ts.pilot || '').toLowerCase().includes(q) ||
                ts.site.toLowerCase().includes(q)
            );
        }

        // Sort
        if (this.sortField) {
            const fieldMap = {
                id: ts => ts.id,
                status: ts => ts.status,
                agent: ts => ts.agent.name,
                vessel: ts => ts.vessel.name,
                grt: ts => ts.vessel.grt,
                loa: ts => ts.vessel.loa,
                port: ts => ts.port.name,
                activity: ts => ts.activity.name,
                workDate: ts => ts.workDate,
                pilot: ts => ts.pilot || '',
                site: ts => ts.site,
            };
            const fn = fieldMap[this.sortField];
            if (fn) {
                filtered.sort((a, b) => {
                    const va = fn(a), vb = fn(b);
                    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
                    return this.sortDir === 'asc' ? cmp : -cmp;
                });
            }
        }

        const counts = { all: scmTugSchedules.length };
        ['draft', 'open', 'dispatch', 'review', 'closed'].forEach(s => counts[s] = scmTugSchedules.filter(ts => ts.status === s).length);
        const statusLabels = { all: t('all'), draft: t('draft'), open: t('open'), dispatch: t('dispatch'), review: t('review'), closed: t('closed') };

        const th = (field, label) =>
            `<th style="cursor:pointer;user-select:none;white-space:nowrap" onclick="SCM.sortBy('${field}')">` +
            `${label} <span style="color:var(--gray-400);font-size:10px">${this.sortField === field ? (this.sortDir === 'asc' ? '↑' : '↓') : '↕'}</span></th>`;

        document.getElementById('scm-content').innerHTML = `
            <div class="page-header">
                <div class="page-title">${t('tugSchedules')}</div>
                <div class="btn-group">
                    <button class="btn btn-outline" onclick="SCM.downloadTemplate()">${t('downloadTemplate')}</button>
                    <button class="btn btn-outline" onclick="SCM.showUploadModal()">${t('uploadFile')}</button>
                    <button class="btn btn-primary" onclick="SCM.showCreateForm()">${t('newTugSchedule')}</button>
                </div>
            </div>
            <div class="stats-row">
                <div class="stat-card"><div class="stat-value">${counts.all}</div><div class="stat-label">${t('total')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts.draft}</div><div class="stat-label">${t('draft')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts.open}</div><div class="stat-label">${t('open')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts.dispatch}</div><div class="stat-label">${t('dispatch')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts.review}</div><div class="stat-label">${t('review')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts.closed}</div><div class="stat-label">${t('closed')}</div></div>
            </div>

            <!-- Status filter chips -->
            <div class="filters">
                <span class="filter-chip ${this.statusFilter.size === 0 ? 'active' : ''}" onclick="SCM.statusFilter.clear();SCM.renderTugList()">
                    ${statusLabels['all']}<span class="filter-count">${counts['all'] || 0}</span>
                </span>
                ${['draft', 'open', 'dispatch', 'review', 'closed'].map(s => `
                    <span class="filter-chip ${this.statusFilter.has(s) ? 'active' : ''}" onclick="SCM._toggleStatusFilter('${s}')">
                        ${statusLabels[s]}<span class="filter-count">${counts[s] || 0}</span>
                    </span>
                `).join('')}
            </div>

            <!-- Additional filters row -->
            <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
                <!-- Site filter -->
                <div style="display:flex;gap:4px;align-items:center">
                    <span style="font-size:12px;color:var(--gray-500);font-weight:600">${t('site')}:</span>
                    ${['all', 'BKK', 'MTP'].map(s => `
                        <span class="filter-chip ${this.siteFilter === s ? 'active' : ''}" onclick="SCM.siteFilter='${s}';SCM.renderTugList()" style="padding:4px 10px">${s === 'all' ? t('all') : s}</span>
                    `).join('')}
                </div>
                <!-- Date range -->
                <div style="display:flex;gap:6px;align-items:center">
                    <span style="font-size:12px;color:var(--gray-500);font-weight:600">${t('workDate')}:</span>
                    <input type="date" value="${this.dateFrom}" onchange="SCM.dateFrom=this.value;SCM.renderTugList()" style="font-size:12px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                    <span style="font-size:12px;color:var(--gray-400)">–</span>
                    <input type="date" value="${this.dateTo}" onchange="SCM.dateTo=this.value;SCM.renderTugList()" style="font-size:12px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                    <button class="btn btn-outline btn-sm" onclick="SCM._resetDateFilter()">Last 5d</button>
                </div>
                <!-- Activity filter -->
                <div style="display:flex;gap:6px;align-items:center">
                    <span style="font-size:12px;color:var(--gray-500);font-weight:600">${t('activity')}:</span>
                    <select onchange="SCM.activityFilter=this.value;SCM.renderTugList()" style="font-size:12px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                        <option value="all">${t('all')}</option>
                        ${MASTERS.activities.map(a => `<option value="${a.id}" ${this.activityFilter === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
                    </select>
                </div>
                <!-- Search -->
                <div style="display:flex;gap:6px;align-items:center;margin-left:auto">
                    <input type="text" placeholder="${t('search')}..." value="${this.searchText.replace(/"/g, '&quot;')}"
                        oninput="SCM.searchText=this.value;SCM.renderTugList()"
                        style="font-size:12px;padding:4px 10px;border:1px solid var(--gray-300);border-radius:6px;width:180px">
                </div>
            </div>

            <div class="card">
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            <th style="width:70px">${t('actions')}</th>
                            ${th('status', t('status'))}
                            ${th('id', 'ID')}
                            ${th('agent', t('agentOwner'))}
                            ${th('vessel', t('vessel'))}
                            ${th('grt', t('grt'))}
                            ${th('loa', t('loa'))}
                            ${th('port', t('port'))}
                            ${th('activity', t('activity'))}
                            ${th('workDate', t('workDate'))}
                            ${th('pilot', t('pilotMaster'))}
                            ${th('site', t('site'))}
                        </tr></thead>
                        <tbody>
                            ${filtered.map(ts => `
                                <tr class="clickable" onclick="SCM.showDetail('${ts.id}')">
                                    <td>
                                        <div class="action-menu" onclick="event.stopPropagation()">
                                            <button class="action-dots" onclick="toggleActionMenu(this,event)"></button>
                                            <div class="action-dropdown">
                                                <div class="action-dropdown-item" onclick="SCM.showDetail('${ts.id}')">${t('view')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${statusBadge(ts.status)}</td>
                                    <td><strong>${ts.id}</strong></td>
                                    <td>${ts.agent.name}</td>
                                    <td>${ts.vessel.name}</td>
                                    <td style="text-align:right">${ts.vessel.grt.toLocaleString()}</td>
                                    <td style="text-align:right">${ts.vessel.loa} m</td>
                                    <td>${ts.port.name}</td>
                                    <td>${ts.activity.name}</td>
                                    <td>${formatDateTime(ts.workDate)}</td>
                                    <td>${ts.pilot || '-'}</td>
                                    <td><span class="site-badge">${ts.site}</span></td>
                                </tr>
                            `).join('')}
                            ${filtered.length === 0 ? `<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--gray-400)">${t('noTugSchedules')}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    sortBy(field) {
        if (this.sortField === field) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        else { this.sortField = field; this.sortDir = 'asc'; }
        this.renderTugList();
    },

    _resetDateFilter() {
        const today = new Date();
        const d1 = new Date(today); d1.setDate(today.getDate() - 5);
        this.dateFrom = d1.toISOString().slice(0, 10);
        this.dateTo = today.toISOString().slice(0, 10);
        this.renderTugList();
    },

    _toggleStatusFilter(s) {
        if (this.statusFilter.has(s)) this.statusFilter.delete(s);
        else this.statusFilter.add(s);
        this.renderTugList();
    },

    _toggleShipStatusFilter(s) {
        if (this.shipStatusFilter.has(s)) this.shipStatusFilter.delete(s);
        else this.shipStatusFilter.add(s);
        this.renderShipmentList();
    },

    // ========== CREATE TUG SCHEDULE ==========
    showCreateForm() {
        const defaultSite = 'BKK';
        const agentOpts = MASTERS.customers.map(c => ({ value: c.id, label: c.name, active: c.active !== false }));
        const vesselOpts = MASTERS.vessels.map(v => ({ value: v.id, label: v.name, active: v.active !== false }));
        const portOpts = getPortsForSite(defaultSite).map(p => ({ value: p.id, label: `${p.name} — ${p.desc}`, active: true }));
        const serviceOpts = MASTERS.services.map(s => ({ value: s.id, label: s.id, active: s.active !== false }));

        openModal(`
            <div class="modal-header">
                <h2>${t('createTugSchedule')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label>${t('site')} <span class="req">*</span></label>
                        <select id="f-site" onchange="scmOnSiteChange(this.value)">${MASTERS.sites.map(s => `<option>${s}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('agentOwner')} <span class="req">*</span></label>
                        ${renderSS('f-agent', agentOpts, '', null)}
                    </div>
                    <div class="form-group">
                        <label>${t('vessel')} <span class="req">*</span></label>
                        ${renderSS('f-vessel', vesselOpts, '', 'scmOnVesselChangeSS')}
                    </div>
                    <div class="form-group">
                        <label>${t('port')} <span class="req">*</span></label>
                        ${renderSS('f-port', portOpts, '', null)}
                    </div>
                    <div class="form-group">
                        <label>${t('grt')}</label>
                        <input id="f-grt" type="text" disabled placeholder="${t('autoFromVessel')}">
                    </div>
                    <div class="form-group">
                        <label>${t('loa')}</label>
                        <input id="f-loa" type="text" disabled placeholder="${t('autoFromVessel')}">
                    </div>
                    <div class="form-group">
                        <label>${t('jobType')} <span class="req">*</span></label>
                        <select id="f-jobtype">${MASTERS.jobTypes.map(j => `<option value="${j.id}">${j.id} — ${j.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('scope')} <span class="req">*</span></label>
                        <select id="f-scope">${MASTERS.scopes.map(s => `<option>${s}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('activity')} <span class="req">*</span></label>
                        <select id="f-activity">${MASTERS.activities.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('service')} <span class="req">*</span></label>
                        ${renderSS('f-service', serviceOpts, '', 'scmUpdateBOMPreview')}
                    </div>
                    <div class="form-group">
                        <label>${t('workDateTime')} <span class="req">*</span></label>
                        <input id="f-workdate" type="datetime-local" value="${new Date().toISOString().slice(0,16)}">
                    </div>
                    <div class="form-group">
                        <label>${t('pilotMaster')}</label>
                        <input id="f-pilot" type="text" placeholder="${t('freeText')}">
                    </div>
                    <div class="form-group full-width" id="bom-preview"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="SCM.createSchedule()">${t('createSchedule')}</button>
            </div>
        `);
    },

    onSiteChange() {},
    onVesselChange() {},

    createSchedule() {
        const agentId = document.getElementById('f-agent').value;
        const vesselId = document.getElementById('f-vessel').value;
        if (!vesselId) { showToast(t('pleaseSelectVessel'), 'error'); return; }
        const portId = document.getElementById('f-port').value;
        const jobTypeId = document.getElementById('f-jobtype').value;
        const activityId = document.getElementById('f-activity').value;
        const serviceId = document.getElementById('f-service').value;
        const service = MASTERS.services.find(s => s.id === serviceId);

        const ts = {
            id: generateId('TS', scmTugSchedules),
            status: 'open',
            agent: MASTERS.customers.find(c => c.id === agentId),
            site: document.getElementById('f-site').value,
            vessel: MASTERS.vessels.find(v => v.id === vesselId),
            port: MASTERS.ports.find(p => p.id === portId),
            jobType: MASTERS.jobTypes.find(j => j.id === jobTypeId),
            scope: document.getElementById('f-scope').value,
            workDate: document.getElementById('f-workdate').value,
            activity: MASTERS.activities.find(a => a.id === activityId),
            service: service,
            pilot: document.getElementById('f-pilot').value,
            bomItems: service.items.map(item => ({ ...item, tug: null, wbs: '' })),
            createdAt: new Date().toISOString(),
        };
        scmTugSchedules.unshift(ts);
        closeModal();
        showToast(t('tugScheduleCreated', { id: ts.id }), 'success');
        this.renderTugList();
    },

    confirmSchedule(id) {
        const ts = scmTugSchedules.find(t => t.id === id);
        if (ts && ts.status === 'draft') {
            ts.status = 'open';
            showToast(`${id} ${t('tugScheduleConfirmed')}`, 'success');
            this.showDetail(id);
        }
    },

    // ========== DOWNLOAD TEMPLATE ==========
    downloadTemplate() {
        const headers = ['Status', 'Agent / Owner', 'Vessel', 'GRT', 'LOA', 'Port', 'Activity Operation', 'Work Date', 'Work Time', 'Pilot / Master', 'Site'];
        const sampleRows = [
            ['Draft', 'Bangkok Shipping Group', 'MV BANGKOK GLORY', '8700', '118.6', 'BKK-TUG', 'Berth', '2026-03-15', '08:00', 'Capt. Suthep', 'BKK'],
            ['Open', 'Siam Ocean Transport', 'MV THAI SPIRIT', '15200', '162.8', 'MITPORT', 'Towing', '2026-03-16', '14:00', 'Capt. Wichai', 'MTP'],
            ['Dispatched', 'Gulf Navigation Ltd.', 'MV GULF PIONEER', '6300', '98.4', 'BLCPPORT', 'Shifting', '2026-03-17', '10:00', '', 'MTP'],
            ['Closed', 'Thai Maritime Co., Ltd.', 'MV SIAM STAR', '12500', '145.2', 'BKK-MID', 'Berth', '2026-03-18', '09:00', 'Capt. Somchai', 'BKK'],
        ];
        const statusNote = 'Valid Status values: Draft, Open, Dispatched, Closed';
        const csvLines = [statusNote, '', headers.join(',')];
        sampleRows.forEach(row => {
            csvLines.push(row.map(cell => {
                if (cell.includes(',') || cell.includes('"')) return '"' + cell.replace(/"/g, '""') + '"';
                return cell;
            }).join(','));
        });
        const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tug_schedule_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    },

    // ========== UPLOAD MODAL ==========
    showUploadModal() {
        openModal(`
            <div class="modal-header">
                <h2>${t('uploadTugSchedule')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="upload-zone" onclick="document.getElementById('file-upload').click()">
                    <div class="upload-icon">&#128196;</div>
                    <div class="upload-text">${t('uploadClickHint')}</div>
                    <div style="color:var(--gray-400);font-size:12px;margin-top:4px">${t('uploadMultiHint')}</div>
                    <input type="file" id="file-upload" accept=".xlsx,.xls,.pdf" style="display:none" onchange="SCM.simulateUpload()">
                </div>
                <div id="upload-preview" style="margin-top:20px"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary hidden" id="upload-confirm-btn" onclick="SCM.confirmUpload()">${t('confirmAllDrafts')}</button>
            </div>
        `);
    },

    simulateUpload() {
        const preview = document.getElementById('upload-preview');
        const btn = document.getElementById('upload-confirm-btn');
        btn.classList.remove('hidden');
        preview.innerHTML = `
            <div style="font-weight:600;margin-bottom:12px">${t('extractedPreview')}</div>
            <table>
                <thead><tr><th></th><th>${t('agent')}</th><th>${t('vessel')}</th><th>${t('port')}</th><th>${t('activity')}</th><th>${t('date')}</th><th>${t('status')}</th></tr></thead>
                <tbody>
                    <tr>
                        <td><input type="checkbox" checked></td>
                        <td>${MASTERS.customers[3].name}</td>
                        <td>${MASTERS.vessels[3].name}</td>
                        <td>${MASTERS.ports[3].name}</td>
                        <td>${MASTERS.activities[2].name}</td>
                        <td>07 Mar 2026 10:00</td>
                        <td>${statusBadge('draft')}</td>
                    </tr>
                    <tr>
                        <td><input type="checkbox" checked></td>
                        <td>${MASTERS.customers[4].name}</td>
                        <td>${MASTERS.vessels[4].name}</td>
                        <td>${MASTERS.ports[4].name}</td>
                        <td>${MASTERS.activities[3].name}</td>
                        <td>08 Mar 2026 16:00</td>
                        <td>${statusBadge('draft')}</td>
                    </tr>
                </tbody>
            </table>
            <div style="color:var(--gray-500);font-size:12px;margin-top:8px">2 ${t('extractedHint')}</div>
        `;
    },

    confirmUpload() {
        showToast(t('tugSchedulesUploaded', { count: 2 }), 'success');
        closeModal();
        this.renderTugList();
    },

    // ========== TUG SCHEDULE DETAIL ==========
    showDetail(id) {
        const ts = scmTugSchedules.find(t => t.id === id);
        if (!ts) return;

        const isDraft = ts.status === 'draft';
        const isOpen = ts.status === 'open';
        const isDispatched = ts.status === 'dispatch';
        const canEdit = isDraft || isOpen;
        const canAssignTugs = isOpen;
        const canDispatch = isOpen && ts.bomItems.filter(b => b.desc !== 'Standby Charge').every(b => b.tug);
        const unshippedItems = ts.bomItems.filter(b => !b.shipmentId && b.tug);
        const canRedispatch = isDispatched && unshippedItems.length > 0;
        const siteTugs = getTugsForSite(ts.site);

        document.getElementById('scm-content').innerHTML = `
            <div class="detail-header">
                <div>
                    <button class="btn btn-outline btn-sm" onclick="SCM.renderTugList()" style="margin-bottom:8px">&larr; ${t('back')}</button>
                    <div class="detail-title">${ts.id} &mdash; ${ts.vessel.name}</div>
                    <div class="detail-subtitle">${t('createdAt')} ${formatDateTime(ts.createdAt)}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
                    <span class="badge badge-${ts.status}" style="font-size:15px;padding:6px 20px;border-radius:16px">${typeof t === 'function' ? t(ts.status) : ts.status}</span>
                    <div class="btn-group">
                        ${isDraft ? `<button class="btn btn-primary" onclick="SCM.confirmSchedule('${ts.id}')">${t('confirmSchedule')}</button>` : ''}
                        ${canDispatch ? `<button class="btn btn-warning" onclick="SCM.dispatchSchedule('${ts.id}')">${t('dispatchBtn')}</button>` : ''}
                        ${canRedispatch ? `<button class="btn btn-warning" onclick="SCM.redispatch('${ts.id}')">Re-dispatch (${unshippedItems.length} items)</button>` : ''}
                        ${canEdit ? `<button class="btn btn-outline" onclick="SCM.showEditForm('${ts.id}')">${t('edit')}</button>` : ''}
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom:20px">
                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-item"><label>Schedule Status</label><div class="value"><span class="badge ${ts.active === false ? 'badge-cancelled' : 'badge-completed'}">${ts.active === false ? 'Inactive' : 'Active'}</span></div></div>
                        <div class="info-item"><label>${t('site')}</label><div class="value"><span class="site-badge">${ts.site}</span></div></div>
                        <div class="info-item"><label>${t('agentOwner')}</label><div class="value">${ts.agent.name}</div></div>
                        <div class="info-item"><label>${t('vessel')}</label><div class="value">${ts.vessel.name}</div></div>
                        <div class="info-item"><label>${t('grt')}</label><div class="value">${ts.vessel.grt.toLocaleString()}</div></div>
                        <div class="info-item"><label>${t('loa')}</label><div class="value">${ts.vessel.loa} m</div></div>
                        <div class="info-item"><label>${t('port')}</label><div class="value">${ts.port.name}</div></div>
                        <div class="info-item"><label>${t('jobType')}</label><div class="value">${ts.jobType.id} — ${ts.jobType.name}</div></div>
                        <div class="info-item"><label>${t('scope')}</label><div class="value">${ts.scope}</div></div>
                        <div class="info-item"><label>${t('workDateTime')}</label><div class="value">${formatDateTime(ts.workDate)}</div></div>
                        <div class="info-item"><label>${t('activity')}</label><div class="value">${ts.activity.name}</div></div>
                        <div class="info-item"><label>${t('service')}</label><div class="value">${ts.service.id}</div></div>
                        <div class="info-item"><label>${t('pilotMaster')}</label><div class="value">${ts.pilot || '-'}</div></div>
                    </div>
                </div>
            </div>

            ${(() => {
                const shippedItems = ts.bomItems.map((item, idx) => ({ ...item, _idx: idx })).filter(i => i.shipmentId);
                const freeItems = ts.bomItems.map((item, idx) => ({ ...item, _idx: idx })).filter(i => !i.shipmentId);
                const hasBoth = isDispatched && shippedItems.length > 0 && freeItems.length > 0;
                const showFreeTable = canEdit || freeItems.length > 0;

                // Shipped items table (read-only)
                const shippedTable = shippedItems.length > 0 ? `
                    <div class="card" style="margin-bottom:20px">
                        <div class="card-header"><h3>Sales BOM Items — Shipped</h3></div>
                        <div class="card-body">
                            <table>
                                <thead><tr>
                                    <th>#</th>
                                    <th>${t('item')}</th>
                                    <th>${t('description')}</th>
                                    <th>${t('unit')}</th>
                                    <th>Qty</th>
                                    <th>${t('tugBoat')}</th>
                                    <th>${t('wbs')}</th>
                                    <th>Shipment</th>
                                </tr></thead>
                                <tbody>
                                    ${shippedItems.map((item, i) => `<tr>
                                        <td>${i + 1}</td>
                                        <td><strong>${item.id}</strong></td>
                                        <td>${item.desc}</td>
                                        <td>${item.unit}</td>
                                        <td>${item.qty || 1}</td>
                                        <td>${item.tug ? item.tug.name : '-'}</td>
                                        <td style="font-family:monospace;font-size:12px">${item.wbs || '-'}</td>
                                        <td><a href="#" onclick="event.preventDefault();SCM.navigate('scm-shipment-list')" style="color:var(--primary);font-weight:600">${item.shipmentId}</a></td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>` : '';

                // Free items table (editable)
                const showEditCols = canEdit || canRedispatch;
                const freeTable = (showFreeTable || canEdit) ? `
                    <div class="card">
                        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
                            <h3>${shippedItems.length > 0 ? 'Sales BOM Items — Pending' : t('tugAssignment')}</h3>
                            <div style="display:flex;gap:8px;align-items:center">
                                ${showEditCols ? `<button class="btn btn-outline btn-sm" onclick="SCM.addBomItem('${ts.id}')">+ Add Item</button>` : ''}
                                ${canAssignTugs ? `<span style="font-size:12px;color:var(--gray-500)">${t('assignTugsHint')}</span>` : ''}
                            </div>
                        </div>
                        <div class="card-body">
                            ${freeItems.length > 0 ? `<table>
                                <thead><tr>
                                    <th>#</th>
                                    ${showEditCols ? '<th style="width:40px">Split</th>' : ''}
                                    <th>${t('item')}</th>
                                    <th>${t('description')}</th>
                                    <th>${t('unit')}</th>
                                    <th>Qty</th>
                                    <th>${t('tugBoat')}</th>
                                    <th>${t('wbs')}</th>
                                    ${showEditCols ? '<th></th>' : ''}
                                </tr></thead>
                                <tbody>
                                    ${freeItems.map((item, i) => {
                                        const idx = item._idx;
                                        const needsTug = item.desc !== 'Standby Charge';
                                        const itemEditable = canEdit || (isDispatched);
                                        const itemCanAssignTug = (canAssignTugs || isDispatched) && needsTug;
                                        return `<tr>
                                            <td>${i + 1}</td>
                                            ${showEditCols ? `<td style="text-align:center"><input type="checkbox" ${item.splitShipment ? 'checked' : ''} onchange="SCM.toggleSplit('${ts.id}',${idx},this.checked)"></td>` : ''}
                                            <td><strong>${item.id}</strong></td>
                                            <td>${item.desc}</td>
                                            <td>${itemEditable ? `
                                                <select onchange="SCM.updateUnit('${ts.id}',${idx},this.value)" style="min-width:80px">
                                                    ${['Trip','Hour','Day','Unit','Lump Sum'].map(u => `<option ${item.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
                                                </select>
                                            ` : item.unit}</td>
                                            <td>${itemEditable ? `
                                                <input type="number" min="0" step="1" value="${item.qty || 1}" onchange="SCM.updateQty('${ts.id}',${idx},this.value)" style="width:60px;text-align:center">
                                            ` : (item.qty || 1)}</td>
                                            <td>${itemCanAssignTug ? `
                                                <select onchange="SCM.assignTug('${ts.id}',${idx},this.value)" style="min-width:140px">
                                                    <option value="">${t('selectTug')}</option>
                                                    ${siteTugs.map(tb => `<option value="${tb.id}" ${item.tug && item.tug.id === tb.id ? 'selected' : ''}>${tb.name}</option>`).join('')}
                                                </select>
                                            ` : item.tug ? item.tug.name : (needsTug ? `<span style="color:var(--gray-400)">${t('notAssigned')}</span>` : `<span style="color:var(--gray-400)">${t('na')}</span>`)}</td>
                                            <td style="font-family:monospace;font-size:12px">${item.wbs || '-'}</td>
                                            ${showEditCols ? `<td><button class="btn btn-danger btn-sm" onclick="SCM.deleteBomItem('${ts.id}',${idx})" title="${t('delete')}">✕</button></td>` : ''}
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>` : `<div style="text-align:center;padding:20px;color:var(--gray-400)">No pending items</div>`}
                        </div>
                    </div>` : '';

                return shippedTable + freeTable;
            })()}

            ${ts.status === 'dispatch' || ts.status === 'review' || ts.status === 'closed' ? `
                <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
                    <span>${t('shipmentsCreated')}</span>
                    <div style="display:flex;gap:8px">
                        ${canRedispatch ? `<button class="btn btn-warning btn-sm" onclick="SCM.redispatch('${ts.id}')">Re-dispatch (${unshippedItems.length} items)</button>` : ''}
                        <button class="btn btn-danger btn-sm" onclick="SCM.cancelSelectedShipments('${ts.id}')" id="cancel-ship-btn" style="display:none">Cancel Selected</button>
                    </div>
                </div>
                <div class="card">
                    <div class="table-wrap">
                        <table>
                            <thead><tr>
                                <th style="width:40px"><input type="checkbox" onchange="SCM.toggleAllShipments(this.checked,'${ts.id}')"></th>
                                <th>${t('shipmentId')}</th>
                                <th>${t('tugBoat')}</th>
                                <th>Items</th>
                                <th>${t('wbs')}</th>
                                <th>${t('status')}</th>
                                <th>${t('actions')}</th>
                            </tr></thead>
                            <tbody>
                                ${scmShipments.filter(s => s.orderId === ts.id).map(s => {
                                    const items = s.bomItems || [s.bomItem];
                                    return `<tr>
                                        <td style="text-align:center">${s.status !== 'cancelled' ? `<input type="checkbox" class="ship-check" data-ship-id="${s.id}" onchange="SCM.updateCancelBtn()">` : ''}</td>
                                        <td><strong>${s.id}</strong></td>
                                        <td>${s.tug ? s.tug.name : '-'}</td>
                                        <td>${items.map(i => `<div style="font-size:12px">${i.id} — ${i.desc}</div>`).join('')}</td>
                                        <td style="font-family:monospace;font-size:12px">${items.map(i => `<div>${i.wbs || '-'}</div>`).join('')}</td>
                                        <td>${statusBadge(s.status)}</td>
                                        <td>
                                            <button class="btn btn-outline btn-sm" onclick="SCM.showShipmentDetail('${s.id}')">${t('view')}</button>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        `;
    },

    toggleAllShipments(checked, tsId) {
        document.querySelectorAll('.ship-check').forEach(cb => { cb.checked = checked; });
        this.updateCancelBtn();
    },

    updateCancelBtn() {
        const checked = document.querySelectorAll('.ship-check:checked').length;
        const btn = document.getElementById('cancel-ship-btn');
        if (btn) btn.style.display = checked > 0 ? '' : 'none';
    },

    cancelSelectedShipments(tsId) {
        const checkedIds = [];
        document.querySelectorAll('.ship-check:checked').forEach(cb => checkedIds.push(cb.dataset.shipId));
        if (!checkedIds.length) return;

        openModal(`
            <div class="modal-header">
                <h2>Cancel Shipments</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body" style="text-align:center;padding:32px">
                <div style="font-size:40px;margin-bottom:12px">⚠️</div>
                <div style="font-size:16px;font-weight:600;margin-bottom:8px">Cancel ${checkedIds.length} shipment(s)?</div>
                <div style="color:var(--gray-500);font-size:13px">${checkedIds.join(', ')}</div>
            </div>
            <div class="modal-footer" style="justify-content:center;gap:12px">
                <button class="btn btn-outline" onclick="closeModal()">No, keep them</button>
                <button class="btn btn-danger" onclick="SCM.confirmCancelSelected('${tsId}','${checkedIds.join(',')}')">Yes, cancel all</button>
            </div>
        `);
    },

    confirmCancelSelected(tsId, idsStr) {
        const ts = scmTugSchedules.find(t => t.id === tsId);
        if (!ts) return;
        const checkedIds = idsStr.split(',');

        checkedIds.forEach(shipId => {
            const ship = scmShipments.find(s => s.id === shipId);
            if (!ship) return;
            ship.status = 'cancelled';
            ts.bomItems.forEach(item => {
                if (item.shipmentId === shipId) item.shipmentId = '';
            });
        });

        const activeShipments = scmShipments.filter(s => s.orderId === tsId && s.status !== 'cancelled');
        if (activeShipments.length === 0) ts.status = 'open';

        closeModal();
        showToast(`${checkedIds.length} shipment(s) cancelled`, 'success');
        this.showDetail(tsId);
    },

    assignTug(tsId, bomIdx, tugId) {
        const ts = scmTugSchedules.find(t => t.id === tsId);
        if (!ts) return;
        const tug = MASTERS.tugBoats.find(tb => tb.id === tugId);
        ts.bomItems[bomIdx].tug = tug || null;
        ts.bomItems[bomIdx].wbs = tug ? lookupWBS(tugId, ts.jobType.id) : '';
        this.showDetail(tsId);
    },

    deleteBomItem(tsId, idx) {
        const ts = scmTugSchedules.find(t => t.id === tsId);
        if (!ts) return;
        const item = ts.bomItems[idx];
        const allowed = ts.status === 'draft' || ts.status === 'open' || (ts.status === 'dispatch' && !item.shipmentId);
        if (!allowed) return;
        ts.bomItems.splice(idx, 1);
        showToast(t('delete') + ' OK', 'success');
        this.showDetail(tsId);
    },

    addBomItem(tsId) {
        const ts = scmTugSchedules.find(t => t.id === tsId);
        if (!ts || (ts.status !== 'draft' && ts.status !== 'open')) return;
        // Add all LEIS items for the site as options
        const sitePrefix = ts.site === 'BKK' ? '7SHI' : '7SHO';
        const allItems = [];
        MASTERS.services.forEach(s => s.items.forEach(item => {
            if (item.id.startsWith(sitePrefix) && !allItems.find(a => a.id === item.id)) allItems.push(item);
        }));
        const optionsHtml = allItems.map(item => `<option value="${item.id}">${item.id} — ${item.desc}</option>`).join('');
        openModal(`
            <div class="modal-header">
                <h2>Add BOM Item</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="display:flex;gap:12px;align-items:flex-end">
                    <div class="form-group" style="flex:1">
                        <label>Material Item</label>
                        <select id="add-bom-item">${optionsHtml}</select>
                    </div>
                    <div class="form-group" style="width:80px">
                        <label>Qty</label>
                        <input id="add-bom-qty" type="number" min="1" value="1">
                    </div>
                    <div class="form-group" style="width:120px">
                        <label>Unit</label>
                        <select id="add-bom-unit">
                            <option>Trip</option><option>Hour</option><option>Day</option><option>Unit</option><option>Lump Sum</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="SCM.confirmAddBomItem('${tsId}')" style="height:38px">Add</button>
                </div>
            </div>
        `);
    },

    confirmAddBomItem(tsId) {
        const ts = scmTugSchedules.find(t => t.id === tsId);
        if (!ts) return;
        const itemId = document.getElementById('add-bom-item').value;
        const qty = parseInt(document.getElementById('add-bom-qty').value) || 1;
        const unit = document.getElementById('add-bom-unit').value;
        let ref = null;
        MASTERS.services.forEach(s => s.items.forEach(item => { if (item.id === itemId) ref = item; }));
        if (!ref) return;
        ts.bomItems.push({ id: ref.id, desc: ref.desc, unit: unit, qty: qty, tug: null, wbs: '', splitShipment: false, shipmentId: '' });
        closeModal();
        showToast('Item added', 'success');
        this.showDetail(tsId);
    },

    updateUnit(tsId, idx, unit) {
        const ts = scmTugSchedules.find(t => t.id === tsId);
        if (ts) ts.bomItems[idx].unit = unit;
    },

    updateQty(tsId, idx, val) {
        const ts = scmTugSchedules.find(t => t.id === tsId);
        if (ts) ts.bomItems[idx].qty = parseInt(val) || 1;
    },

    toggleSplit(tsId, idx, checked) {
        const ts = scmTugSchedules.find(t => t.id === tsId);
        if (ts) ts.bomItems[idx].splitShipment = checked;
    },

    showEditForm(id) {
        const ts = scmTugSchedules.find(t => t.id === id);
        if (!ts) return;
        const site = ts.site;
        const agentOpts = MASTERS.customers.map(c => ({ value: c.id, label: c.name, active: c.active !== false }));
        const vesselOpts = MASTERS.vessels.map(v => ({ value: v.id, label: v.name, active: v.active !== false }));
        const portOpts = getPortsForSite(site).map(p => ({ value: p.id, label: `${p.name} — ${p.desc}`, active: true }));
        const serviceOpts = MASTERS.services.map(s => ({ value: s.id, label: s.id, active: s.active !== false }));

        openModal(`
            <div class="modal-header">
                <h2>${t('editTugSchedule')} ${ts.id}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Schedule Status</label>
                        <select id="e-status">
                            <option value="active" ${ts.active !== false ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${ts.active === false ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${t('site')}</label>
                        <select id="e-site">${MASTERS.sites.map(s => `<option ${ts.site === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('agentOwner')}</label>
                        ${renderSS('e-agent', agentOpts, ts.agent.id, null)}
                    </div>
                    <div class="form-group">
                        <label>${t('vessel')}</label>
                        ${renderSS('e-vessel', vesselOpts, ts.vessel.id, null)}
                    </div>
                    <div class="form-group">
                        <label>${t('port')}</label>
                        ${renderSS('e-port', portOpts, ts.port.id, null)}
                    </div>
                    <div class="form-group">
                        <label>${t('jobType')}</label>
                        <select id="e-jobtype">${MASTERS.jobTypes.map(j => `<option value="${j.id}" ${ts.jobType.id === j.id ? 'selected' : ''}>${j.id} — ${j.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('scope')}</label>
                        <select id="e-scope">${MASTERS.scopes.map(s => `<option ${ts.scope === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('activity')}</label>
                        <select id="e-activity">${MASTERS.activities.map(a => `<option value="${a.id}" ${ts.activity.id === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('service')}</label>
                        ${renderSS('e-service', serviceOpts, ts.service.id, null)}
                    </div>
                    <div class="form-group">
                        <label>${t('workDateTime')}</label>
                        <input id="e-workdate" type="datetime-local" value="${ts.workDate}">
                    </div>
                    <div class="form-group">
                        <label>${t('pilotMaster')}</label>
                        <input id="e-pilot" type="text" value="${ts.pilot}">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="SCM.saveEdit('${id}')">${t('saveChanges')}</button>
            </div>
        `);
    },

    onEditVesselChange() {},

    saveEdit(id) {
        const ts = scmTugSchedules.find(t => t.id === id);
        if (!ts) return;
        ts.active = document.getElementById('e-status').value === 'active';
        ts.site = document.getElementById('e-site').value;
        ts.agent = MASTERS.customers.find(c => c.id === document.getElementById('e-agent').value) || ts.agent;
        ts.vessel = MASTERS.vessels.find(v => v.id === document.getElementById('e-vessel').value) || ts.vessel;
        ts.port = MASTERS.ports.find(p => p.id === document.getElementById('e-port').value) || ts.port;
        ts.pilot = document.getElementById('e-pilot').value;
        ts.workDate = document.getElementById('e-workdate').value;
        ts.scope = document.getElementById('e-scope').value;
        ts.jobType = MASTERS.jobTypes.find(j => j.id === document.getElementById('e-jobtype').value) || ts.jobType;
        ts.activity = MASTERS.activities.find(a => a.id === document.getElementById('e-activity').value) || ts.activity;
        const newSvcId = document.getElementById('e-service').value;
        const newSvc = newSvcId ? MASTERS.services.find(s => s.id === newSvcId) : null;
        if (newSvc && newSvc.id !== ts.service.id) {
            ts.service = newSvc;
            ts.bomItems = newSvc.items.map(item => ({ ...item, tug: null, wbs: '' }));
        }
        closeModal();
        showToast(t('changesSaved'), 'success');
        this.showDetail(id);
    },

    dispatchSchedule(id) {
        const ts = scmTugSchedules.find(t => t.id === id);
        if (!ts) return;
        ts.status = 'dispatch';
        const comPlant = ts.site === 'BKK' ? '1101' : '1102';

        // Group adjacent items by WBS; splitShipment items always get their own shipment
        const groups = [];
        ts.bomItems.forEach(item => {
            if (!item.tug && !item.wbs) return;
            const lastGroup = groups.length ? groups[groups.length - 1] : null;
            if (!item.splitShipment && lastGroup && !lastGroup.split && item.wbs && item.wbs === lastGroup.wbs) {
                lastGroup.items.push(item);
            } else {
                groups.push({ wbs: item.wbs, split: !!item.splitShipment, items: [item] });
            }
        });

        groups.forEach(group => {
            const shipNum = scmShipments.length + 1;
            const shipId = `SH-${comPlant}.26.${String(shipNum).padStart(4, '0')}`;
            // Tag each item with shipmentId
            group.items.forEach(item => { item.shipmentId = shipId; });
            scmShipments.push({
                id: shipId,
                orderId: ts.id,
                status: 'dispatch',
                agent: ts.agent,
                site: ts.site,
                vessel: ts.vessel,
                port: ts.port,
                jobType: ts.jobType,
                scope: ts.scope,
                workDate: ts.workDate,
                activity: ts.activity,
                pilot: ts.pilot,
                tug: group.items[0].tug,
                bomItems: group.items.map(i => ({ ...i })),
                bomItem: { ...group.items[0] },
                reportIns: null,
            });
        });
        const count = scmShipments.filter(s => s.orderId === id && s.status !== 'cancelled').length;
        showToast(t('dispatched', { id, count }), 'success');
        this.showDetail(id);
    },

    redispatch(id) {
        const ts = scmTugSchedules.find(t => t.id === id);
        if (!ts) return;
        const comPlant = ts.site === 'BKK' ? '1101' : '1102';

        // Only process items that have tug assigned but no active shipment
        const unshipped = ts.bomItems.filter(b => !b.shipmentId && b.tug);
        if (!unshipped.length) return;

        // Group adjacent unshipped items by WBS
        const groups = [];
        unshipped.forEach(item => {
            const lastGroup = groups.length ? groups[groups.length - 1] : null;
            if (!item.splitShipment && lastGroup && !lastGroup.split && item.wbs && item.wbs === lastGroup.wbs) {
                lastGroup.items.push(item);
            } else {
                groups.push({ wbs: item.wbs, split: !!item.splitShipment, items: [item] });
            }
        });

        let newCount = 0;
        groups.forEach(group => {
            const shipNum = scmShipments.length + 1;
            const shipId = `SH-${comPlant}.26.${String(shipNum).padStart(4, '0')}`;
            group.items.forEach(item => { item.shipmentId = shipId; });
            scmShipments.push({
                id: shipId,
                orderId: ts.id,
                status: 'dispatch',
                agent: ts.agent,
                site: ts.site,
                vessel: ts.vessel,
                port: ts.port,
                jobType: ts.jobType,
                scope: ts.scope,
                workDate: ts.workDate,
                activity: ts.activity,
                pilot: ts.pilot,
                tug: group.items[0].tug,
                bomItems: group.items.map(i => ({ ...i })),
                bomItem: { ...group.items[0] },
                reportIns: null,
            });
            newCount++;
        });
        showToast(`Re-dispatched: ${newCount} new shipment(s)`, 'success');
        this.showDetail(id);
    },

    _resetShipDateFilter() {
        const today = new Date();
        const d1 = new Date(today); d1.setDate(today.getDate() - 5);
        this.shipDateFrom = d1.toISOString().slice(0, 10);
        this.shipDateTo = today.toISOString().slice(0, 10);
        this.renderShipmentList();
    },

    // ========== SHIPMENT LIST ==========
    renderShipmentList() {
        let filtered = [...scmShipments];
        if (this.shipStatusFilter.size > 0) filtered = filtered.filter(s => this.shipStatusFilter.has(s.status));
        if (this.shipSiteFilter !== 'all') filtered = filtered.filter(s => s.site === this.shipSiteFilter);
        if (this.shipDateFrom) filtered = filtered.filter(s => s.workDate.slice(0, 10) >= this.shipDateFrom);
        if (this.shipDateTo) filtered = filtered.filter(s => s.workDate.slice(0, 10) <= this.shipDateTo);
        if (this.shipActivityFilter !== 'all') filtered = filtered.filter(s => s.activity.id === this.shipActivityFilter);
        if (this.shipSearchText) {
            const q = this.shipSearchText.toLowerCase();
            filtered = filtered.filter(s =>
                s.id.toLowerCase().includes(q) ||
                s.orderId.toLowerCase().includes(q) ||
                s.agent.name.toLowerCase().includes(q) ||
                s.vessel.name.toLowerCase().includes(q) ||
                s.port.name.toLowerCase().includes(q) ||
                s.activity.name.toLowerCase().includes(q) ||
                (s.tug ? s.tug.name.toLowerCase().includes(q) : false) ||
                s.site.toLowerCase().includes(q)
            );
        }

        const counts = { all: scmShipments.length };
        ['dispatch', 'report-in', 'closed', 'cancelled'].forEach(s => counts[s] = scmShipments.filter(x => x.status === s).length);
        const statusLabels = { all: t('all'), dispatch: t('dispatch'), 'report-in': t('reportIn'), closed: t('closed'), cancelled: t('cancel') };

        document.getElementById('scm-content').innerHTML = `
            <div class="page-header">
                <div class="page-title">${t('shipments')}</div>
            </div>
            <div class="stats-row">
                <div class="stat-card"><div class="stat-value">${counts.all}</div><div class="stat-label">${t('total')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts.dispatch}</div><div class="stat-label">${t('dispatch')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts['report-in']}</div><div class="stat-label">${t('reportIn')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts.closed}</div><div class="stat-label">${t('closed')}</div></div>
                <div class="stat-card"><div class="stat-value">${counts.cancelled}</div><div class="stat-label">Cancelled</div></div>
            </div>

            <!-- Status filter chips -->
            <div class="filters">
                <span class="filter-chip ${this.shipStatusFilter.size === 0 ? 'active' : ''}" onclick="SCM.shipStatusFilter.clear();SCM.renderShipmentList()">
                    ${statusLabels['all']}<span class="filter-count">${counts['all'] || 0}</span>
                </span>
                ${['dispatch', 'report-in', 'closed', 'cancelled'].map(s => `
                    <span class="filter-chip ${this.shipStatusFilter.has(s) ? 'active' : ''}" onclick="SCM._toggleShipStatusFilter('${s}')">
                        ${statusLabels[s]}<span class="filter-count">${counts[s] || 0}</span>
                    </span>
                `).join('')}
            </div>

            <!-- Filter row -->
            <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
                <!-- Site filter -->
                <div style="display:flex;gap:4px;align-items:center">
                    <span style="font-size:12px;color:var(--gray-500);font-weight:600">${t('site')}:</span>
                    ${['all', 'BKK', 'MTP'].map(s => `
                        <span class="filter-chip ${this.shipSiteFilter === s ? 'active' : ''}" onclick="SCM.shipSiteFilter='${s}';SCM.renderShipmentList()" style="padding:4px 10px">${s === 'all' ? t('all') : s}</span>
                    `).join('')}
                </div>
                <!-- Date range -->
                <div style="display:flex;gap:6px;align-items:center">
                    <span style="font-size:12px;color:var(--gray-500);font-weight:600">${t('workDate')}:</span>
                    <input type="date" value="${this.shipDateFrom}" onchange="SCM.shipDateFrom=this.value;SCM.renderShipmentList()" style="font-size:12px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                    <span style="font-size:12px;color:var(--gray-400)">–</span>
                    <input type="date" value="${this.shipDateTo}" onchange="SCM.shipDateTo=this.value;SCM.renderShipmentList()" style="font-size:12px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                    <button class="btn btn-outline btn-sm" onclick="SCM._resetShipDateFilter()">Last 5d</button>
                </div>
                <!-- Activity filter -->
                <div style="display:flex;gap:6px;align-items:center">
                    <span style="font-size:12px;color:var(--gray-500);font-weight:600">${t('activity')}:</span>
                    <select onchange="SCM.shipActivityFilter=this.value;SCM.renderShipmentList()" style="font-size:12px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                        <option value="all">${t('all')}</option>
                        ${MASTERS.activities.map(a => `<option value="${a.id}" ${this.shipActivityFilter === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
                    </select>
                </div>
                <!-- Search -->
                <div style="display:flex;gap:6px;align-items:center;margin-left:auto">
                    <input type="text" placeholder="${t('search')}..." value="${this.shipSearchText.replace(/"/g, '&quot;')}"
                        oninput="SCM.shipSearchText=this.value;SCM.renderShipmentList()"
                        style="font-size:12px;padding:4px 10px;border:1px solid var(--gray-300);border-radius:6px;width:180px">
                </div>
            </div>

            <div class="card">
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            <th>${t('actions')}</th>
                            <th>${t('status')}</th>
                            <th>${t('shipmentId')}</th>
                            <th>Tug Schedule</th>
                            <th>${t('agent')}</th>
                            <th>${t('vessel')}</th>
                            <th>${t('port')}</th>
                            <th>${t('activity')}</th>
                            <th>${t('tugBoat')}</th>
                            <th>${t('workDate')}</th>
                        </tr></thead>
                        <tbody>
                            ${filtered.map(s => `
                                <tr class="clickable" onclick="SCM.showShipmentDetail('${s.id}')">
                                    <td>
                                        <div class="action-menu" onclick="event.stopPropagation()">
                                            <button class="action-dots" onclick="toggleActionMenu(this,event)"></button>
                                            <div class="action-dropdown">
                                                <div class="action-dropdown-item" onclick="SCM.showShipmentDetail('${s.id}')">${t('view')}</div>
                                                ${['dispatch', 'open'].includes(s.status) ? `<div class="action-dropdown-item danger" onclick="SCM.cancelShipment('${s.id}')">${t('cancel')}</div>` : ''}
                                                ${s.status === 'closed' && !s.soNo ? `<div class="action-dropdown-item" onclick="SCM.reopenShipment('${s.id}')">${t('reopenShipment')}</div>` : ''}
                                            </div>
                                        </div>
                                    </td>
                                    <td>${statusBadge(s.status)}</td>
                                    <td><strong>${s.id}</strong></td>
                                    <td>${s.orderId}</td>
                                    <td>${s.agent.name}</td>
                                    <td>${s.vessel.name}</td>
                                    <td>${s.port.name}</td>
                                    <td>${s.activity.name}</td>
                                    <td>${s.tug ? s.tug.name : '-'}</td>
                                    <td>${formatDateTime(s.workDate)}</td>
                                </tr>
                            `).join('')}
                            ${filtered.length === 0 ? `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--gray-400)">${t('noShipments')}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    cancelShipment(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s || !['dispatch', 'open'].includes(s.status)) return;
        openModal(`
            <div class="modal-header">
                <h2>Cancel Shipment</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body" style="text-align:center;padding:32px">
                <div style="font-size:40px;margin-bottom:12px">⚠️</div>
                <div style="font-size:16px;font-weight:600;margin-bottom:8px">Cancel shipment <strong>${id}</strong>?</div>
                <div style="color:var(--gray-500);font-size:13px">This will revert the BOM items back to pending status.</div>
            </div>
            <div class="modal-footer" style="justify-content:center;gap:12px">
                <button class="btn btn-outline" onclick="closeModal()">No, keep it</button>
                <button class="btn btn-danger" onclick="SCM.confirmCancelShipment('${id}')">Yes, cancel shipment</button>
            </div>
        `);
    },

    updateShipmentField(id, field, value) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;
        s[field] = value;
        // Auto-sync: when confirmDate changes, update reportInDate if not manually set
        if (field === 'confirmDate' && !s._reportInManual) {
            s.reportInDate = value;
            this.showShipmentDetail(id);
        }
        if (field === 'reportInDate') s._reportInManual = true;
    },

    confirmCancelShipment(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;
        s.status = 'cancelled';
        const ts = scmTugSchedules.find(t => t.id === s.orderId);
        if (ts) {
            ts.bomItems.forEach(item => {
                if (item.shipmentId === id) item.shipmentId = '';
            });
            const active = scmShipments.filter(x => x.orderId === ts.id && x.status !== 'cancelled');
            if (active.length === 0) ts.status = 'open';
            else this._propagateTugScheduleStatus(s.orderId);
        }
        closeModal();
        showToast(`${id} cancelled`, 'success');
        // Re-render whichever view is active
        if (this.currentView === 'scm-shipment-list') this.renderShipmentList();
        else this.showDetail(s.orderId);
    },

    // ========== SHIPMENT DETAIL ==========
    showShipmentDetail(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;

        const canReportIn = s.status === 'dispatch' || s.status === 'report-in' || s.status === 'closed';
        const isReportIn = s.status === 'report-in';
        const canReopen = s.status === 'closed' && !s.soNo;

        // Auto-initialize report-in (no need to click "Start")
        if (canReportIn && !s.reportIns) {
            s.reportIns = {};
            s.reportIns.actual = { stages: makeEmptyStages(), confirmedAt: '' };
            s.reportIns.billing = {
                stages: makeEmptyStages().map(st => ({ ...st, overrideStart: false, overrideEnd: false })),
                confirmedAt: '',
            };
        }
        const ri = s.reportIns || {};
        const hasActual = !!ri.actual;
        const hasBilling = !!ri.billing;

        const actualComplete = hasActual && ri.actual.stages.find(st => st.name === 'Last')?.endTime;
        const billingComplete = hasBilling && ri.billing.stages.find(st => st.name === 'Last')?.endTime;

        document.getElementById('scm-content').innerHTML = `
            <div class="detail-header">
                <div>
                    <button class="btn btn-outline btn-sm" onclick="SCM.renderShipmentList()" style="margin-bottom:8px">&larr; ${t('back')}</button>
                    <div class="detail-title">${s.id}</div>
                    <div class="detail-subtitle">${t('fromOrder')} ${s.orderId} &bull; ${t('tug')}: ${s.tug.name}</div>
                </div>
                <div class="btn-group">
                    ${statusBadge(s.status)}
                    ${['dispatch', 'open'].includes(s.status) ? `<button class="btn btn-danger" onclick="SCM.cancelShipment('${s.id}')">Cancel Shipment</button>` : ''}
                    ${isReportIn ? `<button class="btn btn-primary" onclick="SCM.closeShipment('${s.id}')">${t('confirmClose')}</button>` : ''}
                    ${canReopen ? `<button class="btn btn-warning" onclick="SCM.reopenShipment('${s.id}')">${t('reopenShipment')}</button>` : ''}
                </div>
            </div>

            <div class="card" style="margin-bottom:20px">
                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-item"><label>${t('agentOwner')}</label><div class="value">${s.agent.name}</div></div>
                        <div class="info-item"><label>${t('site')}</label><div class="value"><span class="site-badge">${s.site}</span></div></div>
                        <div class="info-item"><label>${t('vessel')}</label><div class="value">${s.vessel.name}</div></div>
                        <div class="info-item"><label>${t('port')}</label><div class="value">${s.port.name}</div></div>
                        <div class="info-item"><label>${t('jobType')}</label><div class="value">${s.jobType.id} — ${s.jobType.name}</div></div>
                        <div class="info-item"><label>${t('scope')}</label><div class="value">${s.scope}</div></div>
                        <div class="info-item"><label>${t('workDate')}</label><div class="value">${formatDateTime(s.workDate)}</div></div>
                        <div class="info-item"><label>${t('activity')}</label><div class="value">${s.activity.name}</div></div>
                        <div class="info-item"><label>${t('pilotMaster')}</label><div class="value">${s.pilot || '-'}</div></div>
                        <div class="info-item"><label>${t('tugBoat')}</label><div class="value">${s.tug ? s.tug.name : '-'}</div></div>
                        <div class="info-item"><label>${t('wbs')}</label><div class="value" style="font-family:monospace">${s.bomItem ? s.bomItem.wbs : '-'}</div></div>
                        <div class="info-item">
                            <label>Confirm Date</label>
                            <div class="value">
                                <input type="date" value="${s.confirmDate || new Date().toISOString().slice(0,10)}"
                                    onchange="SCM.updateShipmentField('${s.id}','confirmDate',this.value)"
                                    style="font-size:14px;padding:4px 8px;border:1px solid var(--gray-300);border-radius:6px">
                            </div>
                        </div>
                        <div class="info-item" style="grid-column:1/-1">
                            <label>Remark</label>
                            <div class="value">
                                <textarea rows="2" placeholder="Enter remark..."
                                    onchange="SCM.updateShipmentField('${s.id}','remark',this.value)"
                                    style="font-size:13px;width:100%;padding:8px 10px;border:1px solid var(--gray-300);border-radius:6px;resize:vertical">${(s.remark || '').replace(/</g,'&lt;')}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            ${canReportIn ? `
            <div class="card" style="overflow:hidden">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--gray-200)">
                    <h3 style="font-size:14px;font-weight:600">${t('reportInTitle')}</h3>
                    <div class="btn-group" style="align-items:center;gap:10px">
                        ${hasActual ? `<span class="badge ${actualComplete ? 'badge-completed' : 'badge-open'}" style="font-size:11px">&#10003; ACTUAL${actualComplete ? ' &#10003;' : ''}</span>` : ''}
                        ${hasBilling ? `<span class="badge ${billingComplete ? 'badge-completed' : 'badge-dispatch'}" style="font-size:11px">BILLING${billingComplete ? ' &#10003;' : ''}</span>` : ''}
                        ${actualComplete ? `<span style="font-size:12px;color:var(--warning)">${t('reviewHint')}</span>` : ''}
                    </div>
                </div>
                <div class="tabs" style="padding:0 24px;margin-bottom:0">
                    ${hasActual ? `<div class="tab ${this._activeReportTab === 'actual' ? 'active' : ''}" onclick="SCM._activeReportTab='actual';SCM.showShipmentDetail('${s.id}')">Actual Time</div>` : ''}
                    ${hasBilling ? `<div class="tab ${this._activeReportTab === 'billing' ? 'active' : ''}" onclick="SCM._activeReportTab='billing';SCM.showShipmentDetail('${s.id}')">Billing Time</div>` : ''}
                </div>
                ${this._renderTimeline(s, (this._activeReportTab === 'billing' && hasBilling) ? 'billing' : 'actual')}
            </div>
            ` : ''}
        `;
    },

    // Returns stage indices to show, or null = show all
    _getVisibleStageIndices(site, jobTypeId) {
        if (site === 'BKK') {
            return [0, 1, 2, 7]; // Start, Stand by #1, Work Period #1, Last
        } else if (site === 'MTP' && jobTypeId === 'HI') {
            return [0, 7]; // Start, Last only
        }
        return null; // show all
    },

    // MTP HO: track how many extra pairs are shown (0 = none, 1 = #2, 2 = #2+#3)
    _mtpHOExtraPairs: 0,

    addMTPHOPair() {
        if (this._mtpHOExtraPairs < 2) this._mtpHOExtraPairs++;
        const activeEl = document.querySelector('.detail-title');
        if (activeEl) {
            const match = activeEl.textContent.match(/SH-[\w.]+/);
            if (match) this.showShipmentDetail(match[0]);
        }
    },

    removeMTPHOPair() {
        if (this._mtpHOExtraPairs > 0) this._mtpHOExtraPairs--;
        const activeEl = document.querySelector('.detail-title');
        if (activeEl) {
            const match = activeEl.textContent.match(/SH-[\w.]+/);
            if (match) this.showShipmentDetail(match[0]);
        }
    },

    _calcDuration(startTime, endTime) {
        if (!startTime || !endTime || startTime === 'skipped' || endTime === 'skipped') return '';
        const diff = Math.round((new Date(endTime) - new Date(startTime)) / 60000);
        if (isNaN(diff) || diff < 0) return '';
        const h = Math.floor(Math.abs(diff) / 60);
        const m = Math.abs(diff) % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },

    _renderTimeline(s, reportType) {
        const ri = s.reportIns;
        if (!ri || !ri[reportType]) return '';
        const stages = ri[reportType].stages;
        const isActual = reportType === 'actual';
        const canRecord = s.status === 'dispatch' || s.status === 'report-in';

        // Determine visible stage pairs
        const visIndices = this._getVisibleStageIndices(s.site, s.jobType.id);
        let visiblePairs;
        if (visIndices) {
            visiblePairs = visIndices.map(i => ({ stage: stages[i], origIdx: i }));
        } else if (s.site === 'MTP' && s.jobType.id === 'HO') {
            // Base: Start(0), Stand by #1(1), Work Period #1(2), Last(7)
            // Extra pair 1: Stand by #2(3), Work Period #2(4)
            // Extra pair 2: Stand by #3(5), Work Period #3(6)
            const baseIndices = [0, 1, 2];
            if (this._mtpHOExtraPairs >= 1) baseIndices.push(3, 4);
            if (this._mtpHOExtraPairs >= 2) baseIndices.push(5, 6);
            baseIndices.push(7);
            visiblePairs = baseIndices.map(i => ({ stage: stages[i], origIdx: i }));
        } else {
            visiblePairs = stages.map((stage, origIdx) => ({ stage, origIdx }));
        }

        const lastStage = stages[7];
        const lastStageComplete = lastStage && lastStage.endTime && lastStage.endTime !== 'skipped';
        const confirmedAt = ri[reportType].confirmedAt || '';

        // Calculate totals
        const allMins = visiblePairs.map(({ stage }) => {
            if (stage.startTime === 'skipped') return 0;
            const dur = this._calcDuration(stage.startTime, stage.endTime);
            if (!dur) return 0;
            const [h, m] = dur.split(':').map(Number);
            return h * 60 + m;
        });
        const totalMin = allMins.reduce((a, b) => a + b, 0);
        const nonZero = allMins.filter(d => d > 0).length;
        const th = Math.floor(totalMin / 60), tm = totalMin % 60;
        const totalStr = totalMin > 0 ? `${String(th).padStart(2,'0')}:${String(tm).padStart(2,'0')}` : '—';

        const MTPHOToggle = s.site === 'MTP' && s.jobType.id === 'HO' ? `
            <div style="padding:8px 24px 0;display:flex;gap:8px;align-items:center">
                ${this._mtpHOExtraPairs < 2 ? `<button class="btn btn-outline btn-sm" onclick="SCM.addMTPHOPair()">+ Add Stand by / Work Period #${this._mtpHOExtraPairs + 2}</button>` : ''}
                ${this._mtpHOExtraPairs > 0 ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="SCM.removeMTPHOPair()">− Remove #${this._mtpHOExtraPairs + 1}</button>` : ''}
            </div>
        ` : '';

        const rows = visiblePairs.map(({ stage, origIdx }, vi) => {
            const isSkipped = stage.startTime === 'skipped';
            const dur = !isSkipped ? this._calcDuration(stage.startTime, stage.endTime) : '';
            const durMin = dur ? (() => { const [h, m] = dur.split(':').map(Number); return h * 60 + m; })() : 0;
            const isSyncedStart = !isActual && !stage.overrideStart;
            const isSyncedEnd = !isActual && !stage.overrideEnd;
            const isOptional = !stage.required;
            const canSkip = isActual && canRecord && isOptional && !stage.startTime;

            const startVal = (!isSkipped && stage.startTime) ? stage.startTime : '';
            const endVal = (!isSkipped && stage.endTime) ? stage.endTime : '';

            const startInput = isSkipped
                ? `<input class="time-input" type="datetime-local" disabled style="opacity:0.4">`
                : `<div style="display:flex;gap:5px;align-items:center">
                    <input class="time-input${isSyncedStart ? ' synced' : ''}" type="datetime-local"
                        value="${startVal}"
                        ${canRecord ? `onchange="SCM.setStageTime('${s.id}','${reportType}',${origIdx},'start',this.value)"` : 'disabled'}
                        style="flex:1;min-width:0">
                    ${canRecord && isActual ? `<button class="btn btn-outline btn-sm" style="font-size:11px;padding:3px 8px;flex-shrink:0" onclick="SCM.recordNow('${s.id}','${reportType}',${origIdx},'start')">Now</button>` : ''}
                    ${canSkip ? `<button class="btn btn-outline btn-sm" style="font-size:11px;padding:3px 8px;flex-shrink:0;color:var(--gray-400)" onclick="SCM.skipStage('${s.id}','${reportType}',${origIdx})">Skip</button>` : ''}
                </div>`;

            const endInput = isSkipped
                ? `<input class="time-input" type="datetime-local" disabled style="opacity:0.4">`
                : `<div style="display:flex;gap:5px;align-items:center">
                    <input class="time-input${isSyncedEnd ? ' synced' : ''}" type="datetime-local"
                        value="${endVal}"
                        ${canRecord ? `onchange="SCM.setStageTime('${s.id}','${reportType}',${origIdx},'end',this.value)"` : 'disabled'}
                        style="flex:1;min-width:0">
                    ${canRecord && isActual ? `<button class="btn btn-outline btn-sm" style="font-size:11px;padding:3px 8px;flex-shrink:0" onclick="SCM.recordNow('${s.id}','${reportType}',${origIdx},'end')">Now</button>` : ''}
                </div>`;

            return `
                <div class="stage-row" style="animation-delay:${vi * 0.04}s">
                    <div class="stage-label-cell">
                        <span class="stage-dot"></span>
                        <span style="font-size:13.5px;font-weight:500">${tStage(stage.name)}</span>
                        ${isSkipped ? `<em style="font-size:11px;color:var(--gray-400)">${t('skipped')}</em>` : ''}
                    </div>
                    <div class="time-field">
                        <label>${t('startTime')}</label>
                        ${startInput}
                    </div>
                    <div class="time-field">
                        <label>${t('endTime')}</label>
                        ${endInput}
                    </div>
                    <div class="duration-box">
                        <span class="duration-label">Duration</span>
                        <span class="duration-value ${durMin > 0 ? 'dur-pos' : 'dur-zero'}">
                            <span>${durMin > 0 ? '⏱' : '—'}</span>${dur || '—'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            ${MTPHOToggle}
            <div class="stages-list-grid">${rows}</div>
            <div class="total-footer">
                <div>
                    <div class="total-label${!isActual ? ' green' : ''}">${isActual ? 'Total Actual Duration' : 'Total Billing Duration'}</div>
                    <div class="total-breakdown">${nonZero} of ${visiblePairs.length} stages have duration</div>
                </div>
                <div class="total-value${!isActual ? ' green' : ''}">
                    <span>${isActual ? '⏱' : '💰'}</span><span>${totalStr}</span>
                </div>
            </div>
            ${lastStageComplete ? `
                <div style="margin:0 24px 16px;padding:12px 16px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:6px">
                    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                        <label style="font-size:12px;font-weight:600;color:var(--gray-600);text-transform:uppercase;letter-spacing:.3px;white-space:nowrap">Confirm Date</label>
                        <input type="datetime-local" value="${confirmedAt}"
                            onchange="SCM.confirmReport('${s.id}','${reportType}',this.value)"
                            style="font-size:13px;padding:5px 10px;border:1px solid var(--gray-300);border-radius:6px">
                        ${confirmedAt ? `<span style="color:var(--success);font-size:13px;font-weight:600">&#10003; Confirmed ${formatDateTime(confirmedAt)}</span>` : ''}
                    </div>
                </div>
            ` : ''}
        `;
    },

    startReportIn(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;
        if (!s.reportIns) s.reportIns = {};
        s.reportIns.actual = { stages: makeEmptyStages(), confirmedAt: '' };
        s.reportIns.billing = {
            stages: makeEmptyStages().map(st => ({ ...st, overrideStart: false, overrideEnd: false })),
            confirmedAt: '',
        };
        this._activeReportTab = 'actual';
        showToast(t('reportInStarted'), 'success');
        this.showShipmentDetail(id);
    },

    setStageTime(shipId, type, idx, field, value) {
        const s = scmShipments.find(x => x.id === shipId);
        if (!s || !s.reportIns || !s.reportIns[type]) return;
        const stage = s.reportIns[type].stages[idx];
        if (field === 'start') stage.startTime = value;
        else stage.endTime = value;

        if (type === 'billing') {
            if (field === 'start') stage.overrideStart = true;
            else stage.overrideEnd = true;
        }

        // Sync actual → billing (unless billing has overridden that field)
        if (type === 'actual' && s.reportIns.billing) {
            const bStage = s.reportIns.billing.stages[idx];
            if (field === 'start' && !bStage.overrideStart) bStage.startTime = value;
            if (field === 'end' && !bStage.overrideEnd) bStage.endTime = value;
        }

        if (field === 'end' && value && stage.name === 'Last' && type === 'actual') {
            this._checkForReview(s);
        } else {
            this.showShipmentDetail(shipId);
        }
    },

    recordNow(shipId, type, idx, field) {
        const s = scmShipments.find(x => x.id === shipId);
        if (!s || !s.reportIns || !s.reportIns[type]) return;
        const stage = s.reportIns[type].stages[idx];
        const stages = s.reportIns[type].stages;
        const now = new Date().toISOString().slice(0, 16);

        if (field === 'start') {
            const prevStage = idx > 0 ? stages[idx - 1] : null;
            if (prevStage && prevStage.endTime && prevStage.endTime !== 'skipped') {
                stage.startTime = prevStage.endTime;
            } else {
                stage.startTime = now;
            }
        } else {
            stage.endTime = now;
        }

        // Sync to billing
        if (type === 'actual' && s.reportIns.billing) {
            const bStage = s.reportIns.billing.stages[idx];
            if (field === 'start' && !bStage.overrideStart) bStage.startTime = stage.startTime;
            if (field === 'end' && !bStage.overrideEnd) bStage.endTime = stage.endTime;
        }

        if (field === 'end' && stage.endTime && stage.name === 'Last' && type === 'actual') {
            this._checkForReview(s);
        } else {
            this.showShipmentDetail(shipId);
        }
    },

    _checkForReview(s) {
        const ri = s.reportIns;
        const actualDone = ri.actual && ri.actual.stages.find(st => st.name === 'Last')?.endTime;
        if (actualDone) {
            s.status = 'report-in';
            this._propagateTugScheduleStatus(s.orderId);
            showToast(t('shipmentReportIn', { id: s.id }), 'success');
        } else {
            showToast(t('stageRecorded', { stage: tStage('Last'), time: formatDateTime(s.reportIns.actual.stages[7].endTime) }), 'success');
        }
        this.showShipmentDetail(s.id);
    },

    skipStage(id, reportType, stageIdx) {
        const s = scmShipments.find(x => x.id === id);
        if (!s || !s.reportIns || !s.reportIns[reportType]) return;
        s.reportIns[reportType].stages[stageIdx].startTime = 'skipped';
        s.reportIns[reportType].stages[stageIdx].endTime = 'skipped';
        // Sync skip to billing if not overridden
        if (reportType === 'actual' && s.reportIns.billing) {
            const bStage = s.reportIns.billing.stages[stageIdx];
            if (!bStage.overrideStart) bStage.startTime = 'skipped';
            if (!bStage.overrideEnd) bStage.endTime = 'skipped';
        }
        this.showShipmentDetail(id);
    },

    updateStageRemark(id, reportType, stageIdx, value) {
        const s = scmShipments.find(x => x.id === id);
        if (!s || !s.reportIns || !s.reportIns[reportType]) return;
        s.reportIns[reportType].stages[stageIdx].remark = value;
    },

    confirmReport(id, reportType, value) {
        const s = scmShipments.find(x => x.id === id);
        if (!s || !s.reportIns || !s.reportIns[reportType]) return;
        s.reportIns[reportType].confirmedAt = value;
        showToast(t('changesSaved'), 'success');
        this.showShipmentDetail(id);
    },

    closeShipment(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;
        s.status = 'closed';
        this._propagateTugScheduleStatus(s.orderId);
        showToast(t('shipmentClosed', { id }), 'success');
        this.showShipmentDetail(id);
    },

    reopenShipment(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;
        if (s.soNo) {
            showToast(t('cannotReopenWithSO'), 'error');
            return;
        }
        openModal(`
            <div class="modal-header">
                <h2>${t('confirmReopen')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body" style="text-align:center;padding:32px">
                <div style="font-size:40px;margin-bottom:12px">&#9888;&#65039;</div>
                <div style="font-size:16px;font-weight:600;margin-bottom:8px">${t('reopenShipmentConfirm', { id })}</div>
            </div>
            <div class="modal-footer" style="justify-content:center;gap:12px">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-warning" onclick="SCM.confirmReopenShipment('${id}')">${t('confirmReopen')}</button>
            </div>
        `);
    },

    confirmReopenShipment(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;
        if (s.soNo) {
            showToast(t('cannotReopenWithSO'), 'error');
            closeModal();
            return;
        }
        s.status = 'dispatch';
        this._propagateTugScheduleStatus(s.orderId);
        closeModal();
        showToast(t('shipmentReopened', { id }), 'success');
        this.showShipmentDetail(id);
    },

    _propagateTugScheduleStatus(orderId) {
        const ts = scmTugSchedules.find(t => t.id === orderId);
        if (!ts) return;
        const shipments = scmShipments.filter(sh => sh.orderId === orderId && sh.status !== 'cancelled');
        if (shipments.length === 0) return;
        if (shipments.every(sh => sh.status === 'closed')) {
            ts.status = 'closed';
        } else if (shipments.every(sh => sh.status === 'report-in' || sh.status === 'closed')) {
            ts.status = 'review';
        } else {
            ts.status = 'dispatch';
        }
    },
};
