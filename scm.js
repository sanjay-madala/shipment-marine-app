// ========== SCM MODULE ==========

const SCM = {
    currentView: 'scm-tug-list',
    statusFilter: 'all',

    init() {
        this.renderTugList();
    },

    navigate(view) {
        this.currentView = view;
        document.querySelectorAll('#scm-module .nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
        if (view === 'scm-tug-list') this.renderTugList();
        else if (view === 'scm-shipment-list') this.renderShipmentList();
    },

    // ========== TUG SCHEDULE LIST ==========
    renderTugList() {
        const counts = { all: scmTugSchedules.length };
        ['draft', 'open', 'dispatch', 'review', 'closed'].forEach(s => counts[s] = scmTugSchedules.filter(t => t.status === s).length);
        const filtered = this.statusFilter === 'all' ? scmTugSchedules : scmTugSchedules.filter(t => t.status === this.statusFilter);

        const statusLabels = { all: t('all'), draft: t('draft'), open: t('open'), dispatch: t('dispatch'), review: t('review'), closed: t('closed') };

        document.getElementById('scm-content').innerHTML = `
            <div class="page-header">
                <div class="page-title">${t('tugSchedules')}</div>
                <div class="btn-group">
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
            <div class="filters">
                ${['all', 'draft', 'open', 'dispatch', 'review', 'closed'].map(s => `
                    <span class="filter-chip ${this.statusFilter === s ? 'active' : ''}" onclick="SCM.statusFilter='${s}';SCM.renderTugList()">
                        ${statusLabels[s]}
                        <span class="filter-count">${counts[s] || 0}</span>
                    </span>
                `).join('')}
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            <th>ID</th><th>${t('status')}</th><th>${t('agentOwner')}</th><th>${t('vessel')}</th><th>${t('port')}</th>
                            <th>${t('activity')}</th><th>${t('workDate')}</th><th>${t('site')}</th><th>${t('actions')}</th>
                        </tr></thead>
                        <tbody>
                            ${filtered.map(ts => `
                                <tr class="clickable" ondblclick="SCM.showDetail('${ts.id}')">
                                    <td><strong>${ts.id}</strong></td>
                                    <td>${statusBadge(ts.status)}</td>
                                    <td>${ts.agent.name}</td>
                                    <td>${ts.vessel.name}</td>
                                    <td>${ts.port.name}</td>
                                    <td>${ts.activity.name}</td>
                                    <td>${formatDateTime(ts.workDate)}</td>
                                    <td><span class="site-badge">${ts.site}</span></td>
                                    <td>
                                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();SCM.showDetail('${ts.id}')">${t('view')}</button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${filtered.length === 0 ? `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--gray-400)">${t('noTugSchedules')}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // ========== CREATE TUG SCHEDULE ==========
    showCreateForm() {
        const defaultSite = 'BKK';
        openModal(`
            <div class="modal-header">
                <h2>${t('createTugSchedule')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label>${t('agentOwner')} <span class="req">*</span></label>
                        <select id="f-agent">${MASTERS.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('site')} <span class="req">*</span></label>
                        <select id="f-site" onchange="SCM.onSiteChange()">${MASTERS.sites.map(s => `<option>${s}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('vessel')} <span class="req">*</span></label>
                        <select id="f-vessel" onchange="SCM.onVesselChange()">
                            <option value="">${t('selectVessel')}</option>
                            ${MASTERS.vessels.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${t('port')} <span class="req">*</span></label>
                        <select id="f-port">${getPortsForSite(defaultSite).map(p => `<option value="${p.id}">${p.name} — ${p.desc}</option>`).join('')}</select>
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
                        <select id="f-jobtype">${MASTERS.jobTypes.map(j => `<option value="${j.id}">${j.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('scope')} <span class="req">*</span></label>
                        <select id="f-scope">${MASTERS.scopes.map(s => `<option>${s}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('workDateTime')} <span class="req">*</span></label>
                        <input id="f-workdate" type="datetime-local" value="${new Date().toISOString().slice(0,16)}">
                    </div>
                    <div class="form-group">
                        <label>${t('activity')} <span class="req">*</span></label>
                        <select id="f-activity">${MASTERS.activities.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('service')} <span class="req">*</span></label>
                        <select id="f-service">${MASTERS.services.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('pilotMaster')}</label>
                        <input id="f-pilot" type="text" placeholder="${t('freeText')}">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="SCM.createSchedule()">${t('createSchedule')}</button>
            </div>
        `);
    },

    onSiteChange() {
        const site = document.getElementById('f-site').value;
        const portSel = document.getElementById('f-port');
        portSel.innerHTML = getPortsForSite(site).map(p => `<option value="${p.id}">${p.name} — ${p.desc}</option>`).join('');
    },

    onVesselChange() {
        const vid = document.getElementById('f-vessel').value;
        const v = MASTERS.vessels.find(x => x.id === vid);
        document.getElementById('f-grt').value = v ? v.grt.toLocaleString() : '';
        document.getElementById('f-loa').value = v ? v.loa + ' m' : '';
    },

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
            status: 'draft',
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
                        <td>18 Feb 2026 10:00</td>
                        <td>${statusBadge('draft')}</td>
                    </tr>
                    <tr>
                        <td><input type="checkbox" checked></td>
                        <td>${MASTERS.customers[4].name}</td>
                        <td>${MASTERS.vessels[4].name}</td>
                        <td>${MASTERS.ports[4].name}</td>
                        <td>${MASTERS.activities[3].name}</td>
                        <td>19 Feb 2026 16:00</td>
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
        const canEdit = isDraft || isOpen;
        const canAssignTugs = isOpen;
        const canDispatch = isOpen && ts.bomItems.filter(b => b.desc !== 'Standby Charge').every(b => b.tug);
        const siteTugs = getTugsForSite(ts.site);

        document.getElementById('scm-content').innerHTML = `
            <div class="detail-header">
                <div>
                    <button class="btn btn-outline btn-sm" onclick="SCM.renderTugList()" style="margin-bottom:8px">&larr; ${t('back')}</button>
                    <div class="detail-title">${ts.id} &mdash; ${ts.vessel.name}</div>
                    <div class="detail-subtitle">${t('createdAt')} ${formatDateTime(ts.createdAt)}</div>
                </div>
                <div class="btn-group">
                    ${statusBadge(ts.status)}
                    ${isDraft ? `<button class="btn btn-primary" onclick="SCM.confirmSchedule('${ts.id}')">${t('confirmSchedule')}</button>` : ''}
                    ${canDispatch ? `<button class="btn btn-warning" onclick="SCM.dispatchSchedule('${ts.id}')">${t('dispatchBtn')}</button>` : ''}
                    ${canEdit ? `<button class="btn btn-outline" onclick="SCM.showEditForm('${ts.id}')">${t('edit')}</button>` : ''}
                </div>
            </div>

            <div class="card" style="margin-bottom:20px">
                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-item"><label>${t('agentOwner')}</label><div class="value">${ts.agent.name}</div></div>
                        <div class="info-item"><label>${t('site')}</label><div class="value"><span class="site-badge">${ts.site}</span></div></div>
                        <div class="info-item"><label>${t('vessel')}</label><div class="value">${ts.vessel.name}</div></div>
                        <div class="info-item"><label>${t('grt')}</label><div class="value">${ts.vessel.grt.toLocaleString()}</div></div>
                        <div class="info-item"><label>${t('loa')}</label><div class="value">${ts.vessel.loa} m</div></div>
                        <div class="info-item"><label>${t('port')}</label><div class="value">${ts.port.name}</div></div>
                        <div class="info-item"><label>${t('jobType')}</label><div class="value">${ts.jobType.name}</div></div>
                        <div class="info-item"><label>${t('scope')}</label><div class="value">${ts.scope}</div></div>
                        <div class="info-item"><label>${t('workDateTime')}</label><div class="value">${formatDateTime(ts.workDate)}</div></div>
                        <div class="info-item"><label>${t('activity')}</label><div class="value">${ts.activity.name}</div></div>
                        <div class="info-item"><label>${t('service')}</label><div class="value">${ts.service.name}</div></div>
                        <div class="info-item"><label>${t('pilotMaster')}</label><div class="value">${ts.pilot || '-'}</div></div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>${t('tugAssignment')}</h3>
                    ${canAssignTugs ? `<span style="font-size:12px;color:var(--gray-500)">${t('assignTugsHint')}</span>` : ''}
                </div>
                <div class="card-body">
                    <table>
                        <thead><tr><th>#</th><th>${t('item')}</th><th>${t('description')}</th><th>${t('unit')}</th><th>${t('tugBoat')}</th><th>${t('wbs')}</th></tr></thead>
                        <tbody>
                            ${ts.bomItems.map((item, idx) => {
                                const needsTug = item.desc !== 'Standby Charge';
                                return `<tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>${item.id}</strong></td>
                                    <td>${item.desc}</td>
                                    <td>${item.unit}</td>
                                    <td>${canAssignTugs && needsTug ? `
                                        <select onchange="SCM.assignTug('${ts.id}',${idx},this.value)" style="min-width:140px">
                                            <option value="">${t('selectTug')}</option>
                                            ${siteTugs.map(tb => `<option value="${tb.id}" ${item.tug && item.tug.id === tb.id ? 'selected' : ''}>${tb.name}</option>`).join('')}
                                        </select>
                                    ` : item.tug ? `${item.tug.name}` : (needsTug ? `<span style="color:var(--gray-400)">${t('notAssigned')}</span>` : `<span style="color:var(--gray-400)">${t('na')}</span>`)}</td>
                                    <td style="font-family:monospace;font-size:12px">${item.wbs || '-'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            ${ts.status === 'dispatch' || ts.status === 'review' || ts.status === 'closed' ? `
                <div class="section-title">${t('shipmentsCreated')}</div>
                <div class="card">
                    <div class="table-wrap">
                        <table>
                            <thead><tr><th>${t('shipmentId')}</th><th>${t('tugBoat')}</th><th>${t('bomItem')}</th><th>${t('wbs')}</th><th>${t('status')}</th><th>${t('actions')}</th></tr></thead>
                            <tbody>
                                ${scmShipments.filter(s => s.orderId === ts.id).map(s => `
                                    <tr>
                                        <td><strong>${s.id}</strong></td>
                                        <td>${s.tug.name}</td>
                                        <td>${s.bomItem.desc}</td>
                                        <td style="font-family:monospace;font-size:12px">${s.bomItem.wbs}</td>
                                        <td>${statusBadge(s.status)}</td>
                                        <td><button class="btn btn-outline btn-sm" onclick="SCM.showShipmentDetail('${s.id}')">${t('view')}</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        `;
    },

    assignTug(tsId, bomIdx, tugId) {
        const ts = scmTugSchedules.find(t => t.id === tsId);
        if (!ts) return;
        const tug = MASTERS.tugBoats.find(tb => tb.id === tugId);
        ts.bomItems[bomIdx].tug = tug || null;
        if (tug && !ts.bomItems[bomIdx].wbs) {
            const prefix = ts.site === 'BKK' ? '01S' : '02S';
            ts.bomItems[bomIdx].wbs = `${prefix}.26TG.SC${ts.activity.name.slice(0,3).toUpperCase()}.S${String(bomIdx+1).padStart(3,'0')}`;
        }
        this.showDetail(tsId);
    },

    showEditForm(id) {
        const ts = scmTugSchedules.find(t => t.id === id);
        if (!ts) return;
        const site = ts.site;
        openModal(`
            <div class="modal-header">
                <h2>${t('editTugSchedule')} ${ts.id}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label>${t('agentOwner')}</label>
                        <select id="e-agent">${MASTERS.customers.map(c => `<option value="${c.id}" ${ts.agent.id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('vessel')}</label>
                        <select id="e-vessel" onchange="SCM.onEditVesselChange()">
                            ${MASTERS.vessels.map(v => `<option value="${v.id}" ${ts.vessel.id === v.id ? 'selected' : ''}>${v.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${t('port')}</label>
                        <select id="e-port">${getPortsForSite(site).map(p => `<option value="${p.id}" ${ts.port.id === p.id ? 'selected' : ''}>${p.name} — ${p.desc}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('pilotMaster')}</label>
                        <input id="e-pilot" type="text" value="${ts.pilot}">
                    </div>
                    <div class="form-group">
                        <label>${t('workDateTime')}</label>
                        <input id="e-workdate" type="datetime-local" value="${ts.workDate}">
                    </div>
                    <div class="form-group">
                        <label>${t('scope')}</label>
                        <select id="e-scope">${MASTERS.scopes.map(s => `<option ${ts.scope === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('jobType')}</label>
                        <select id="e-jobtype">${MASTERS.jobTypes.map(j => `<option value="${j.id}" ${ts.jobType.id === j.id ? 'selected' : ''}>${j.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>${t('activity')}</label>
                        <select id="e-activity">${MASTERS.activities.map(a => `<option value="${a.id}" ${ts.activity.id === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}</select>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="SCM.saveEdit('${id}')">${t('saveChanges')}</button>
            </div>
        `);
    },

    onEditVesselChange() {
        // Could auto-fill GRT/LOA in edit too if needed
    },

    saveEdit(id) {
        const ts = scmTugSchedules.find(t => t.id === id);
        if (!ts) return;
        ts.agent = MASTERS.customers.find(c => c.id === document.getElementById('e-agent').value);
        ts.vessel = MASTERS.vessels.find(v => v.id === document.getElementById('e-vessel').value);
        ts.port = MASTERS.ports.find(p => p.id === document.getElementById('e-port').value);
        ts.pilot = document.getElementById('e-pilot').value;
        ts.workDate = document.getElementById('e-workdate').value;
        ts.scope = document.getElementById('e-scope').value;
        ts.jobType = MASTERS.jobTypes.find(j => j.id === document.getElementById('e-jobtype').value);
        ts.activity = MASTERS.activities.find(a => a.id === document.getElementById('e-activity').value);
        closeModal();
        showToast(t('changesSaved'), 'success');
        this.showDetail(id);
    },

    dispatchSchedule(id) {
        const ts = scmTugSchedules.find(t => t.id === id);
        if (!ts) return;
        ts.status = 'dispatch';

        ts.bomItems.forEach(item => {
            if (!item.tug) return;
            const shipNum = scmShipments.length + 1;
            const comPlant = ts.site === 'BKK' ? '1101' : '1102';
            scmShipments.push({
                id: `SH-${comPlant}.26.${String(shipNum).padStart(4, '0')}`,
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
                tug: item.tug,
                bomItem: { ...item },
                reportIns: null,
            });
        });
        const count = scmShipments.filter(s => s.orderId === id).length;
        showToast(t('dispatched', { id, count }), 'success');
        this.showDetail(id);
    },

    // ========== SHIPMENT LIST ==========
    renderShipmentList() {
        document.getElementById('scm-content').innerHTML = `
            <div class="page-header">
                <div class="page-title">${t('shipments')}</div>
            </div>
            <div class="stats-row">
                <div class="stat-card"><div class="stat-value">${scmShipments.length}</div><div class="stat-label">${t('total')}</div></div>
                <div class="stat-card"><div class="stat-value">${scmShipments.filter(s => s.status === 'dispatch').length}</div><div class="stat-label">${t('dispatch')}</div></div>
                <div class="stat-card"><div class="stat-value">${scmShipments.filter(s => s.status === 'review').length}</div><div class="stat-label">${t('review')}</div></div>
                <div class="stat-card"><div class="stat-value">${scmShipments.filter(s => s.status === 'closed').length}</div><div class="stat-label">${t('closed')}</div></div>
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            <th>${t('shipmentId')}</th><th>${t('order')}</th><th>${t('status')}</th><th>${t('agent')}</th><th>${t('vessel')}</th>
                            <th>${t('tugBoat')}</th><th>${t('bomItem')}</th><th>${t('workDate')}</th><th>${t('actions')}</th>
                        </tr></thead>
                        <tbody>
                            ${scmShipments.map(s => `
                                <tr class="clickable" ondblclick="SCM.showShipmentDetail('${s.id}')">
                                    <td><strong>${s.id}</strong></td>
                                    <td>${s.orderId}</td>
                                    <td>${statusBadge(s.status)}</td>
                                    <td>${s.agent.name}</td>
                                    <td>${s.vessel.name}</td>
                                    <td>${s.tug.name}</td>
                                    <td>${s.bomItem.desc}</td>
                                    <td>${formatDateTime(s.workDate)}</td>
                                    <td>
                                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();SCM.showShipmentDetail('${s.id}')">${t('view')}</button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${scmShipments.length === 0 ? `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--gray-400)">${t('noShipments')}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // ========== SHIPMENT DETAIL ==========
    _activeReportTab: 'customer',

    showShipmentDetail(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;

        const canReportIn = s.status === 'dispatch' || s.status === 'review' || s.status === 'closed';
        const isReview = s.status === 'review';
        const isClosed = s.status === 'closed';
        const ri = s.reportIns || {};
        const hasCust = !!ri.customer;
        const hasInt = !!ri.internal;
        const canStartReport = s.status === 'dispatch';

        const custComplete = hasCust && ri.customer.stages.find(st => st.name === 'Last')?.endTime;
        const intComplete = hasInt && ri.internal.stages.find(st => st.name === 'Last')?.endTime;

        document.getElementById('scm-content').innerHTML = `
            <div class="detail-header">
                <div>
                    <button class="btn btn-outline btn-sm" onclick="SCM.renderShipmentList()" style="margin-bottom:8px">&larr; ${t('back')}</button>
                    <div class="detail-title">${s.id}</div>
                    <div class="detail-subtitle">${t('fromOrder')} ${s.orderId} &bull; ${t('tug')}: ${s.tug.name}</div>
                </div>
                <div class="btn-group">
                    ${statusBadge(s.status)}
                    ${isReview ? `<button class="btn btn-primary" onclick="SCM.closeShipment('${s.id}')">${t('confirmClose')}</button>` : ''}
                </div>
            </div>

            <div class="card" style="margin-bottom:20px">
                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-item"><label>${t('agentOwner')}</label><div class="value">${s.agent.name}</div></div>
                        <div class="info-item"><label>${t('site')}</label><div class="value"><span class="site-badge">${s.site}</span></div></div>
                        <div class="info-item"><label>${t('vessel')}</label><div class="value">${s.vessel.name}</div></div>
                        <div class="info-item"><label>${t('port')}</label><div class="value">${s.port.name}</div></div>
                        <div class="info-item"><label>${t('jobType')}</label><div class="value">${s.jobType.name}</div></div>
                        <div class="info-item"><label>${t('scope')}</label><div class="value">${s.scope}</div></div>
                        <div class="info-item"><label>${t('workDate')}</label><div class="value">${formatDateTime(s.workDate)}</div></div>
                        <div class="info-item"><label>${t('activity')}</label><div class="value">${s.activity.name}</div></div>
                        <div class="info-item"><label>${t('pilotMaster')}</label><div class="value">${s.pilot || '-'}</div></div>
                        <div class="info-item"><label>${t('tugBoat')}</label><div class="value">${s.tug.name}</div></div>
                        <div class="info-item"><label>${t('bomItem')}</label><div class="value">${s.bomItem.desc}</div></div>
                        <div class="info-item"><label>${t('wbs')}</label><div class="value" style="font-family:monospace">${s.bomItem.wbs}</div></div>
                    </div>
                </div>
            </div>

            ${canReportIn ? `
            <div class="card">
                <div class="card-header">
                    <h3>${t('reportInTitle')}</h3>
                    <div class="btn-group">
                        ${hasCust ? `<span class="badge ${custComplete ? 'badge-completed' : 'badge-open'}">${t('customerReport')} ${custComplete ? '&#10003;' : ''}</span>` : ''}
                        ${hasInt ? `<span class="badge ${intComplete ? 'badge-completed' : 'badge-dispatch'}">${t('internalReport')} ${intComplete ? '&#10003;' : ''}</span>` : ''}
                        ${isReview ? `<span style="font-size:12px;color:var(--warning)">${t('reviewHint')}</span>` : ''}
                    </div>
                </div>
                <div class="card-body">
                    ${canStartReport ? `
                        <div style="display:flex;gap:8px;margin-bottom:16px">
                            ${!hasCust ? `<button class="btn btn-primary btn-sm" onclick="SCM.startReportIn('${s.id}','customer')">${t('startCustomerReport')}</button>` : ''}
                            ${!hasInt ? `<button class="btn btn-outline btn-sm" onclick="SCM.startReportIn('${s.id}','internal')">${t('startInternalReport')}</button>` : ''}
                        </div>
                    ` : ''}
                    ${hasCust || hasInt ? `
                        <div class="tabs" style="margin-bottom:16px">
                            ${hasCust ? `<div class="tab ${this._activeReportTab === 'customer' ? 'active' : ''}" onclick="SCM._activeReportTab='customer';SCM.showShipmentDetail('${s.id}')">${t('customerReport')}</div>` : ''}
                            ${hasInt ? `<div class="tab ${this._activeReportTab === 'internal' ? 'active' : ''}" onclick="SCM._activeReportTab='internal';SCM.showShipmentDetail('${s.id}')">${t('internalReport')}</div>` : ''}
                        </div>
                        ${this._renderTimeline(s, this._activeReportTab)}
                    ` : `<div style="color:var(--gray-400);text-align:center;padding:20px">${t('reportNotStarted')}</div>`}
                </div>
            </div>
            ` : ''}
        `;
    },

    _renderTimeline(s, reportType) {
        const ri = s.reportIns;
        if (!ri || !ri[reportType]) return '';
        const stages = ri[reportType].stages;
        const isReview = s.status === 'review';
        const canRecord = s.status === 'dispatch' || isReview;
        const canEditTime = isReview;

        return `<div class="timeline">
            ${stages.map((stage, i) => {
                const isSkipped = stage.startTime === 'skipped';
                const hasStart = !!stage.startTime && !isSkipped;
                const hasEnd = !!stage.endTime && stage.endTime !== 'skipped';
                const filled = (hasStart && hasEnd) || isSkipped;
                const isStandby = stage.name.includes('Stand by');
                const isSkippableStage = isStandby || stage.skippable;
                const prevDone = i === 0 || (stages[i-1].startTime && stages[i-1].endTime);
                const isNext = !stage.startTime && prevDone && ri[reportType];
                return `
                    <div class="timeline-item">
                        <div class="timeline-dot ${filled ? 'filled' : ''} ${(hasStart && !hasEnd) ? 'current' : ''} ${isNext ? 'current' : ''}"></div>
                        <div class="timeline-label">
                            ${tStage(stage.name)}
                            <span style="font-size:11px;color:var(--gray-400);margin-left:6px">${stage.required ? t('stageRequired') : t('stageOptional')}</span>
                        </div>
                        ${isSkipped ? `
                            <div class="timeline-time" style="color:var(--gray-400);font-style:italic">${t('skipped')}</div>
                        ` : filled ? `
                            <div class="timeline-time">${t('startTime')}: ${formatDateTime(stage.startTime)} &mdash; ${t('endTime')}: ${formatDateTime(stage.endTime)}</div>
                            ${canEditTime ? `
                                <div class="timeline-input" style="display:flex;gap:8px;margin-top:4px">
                                    <input type="datetime-local" value="${stage.startTime}" onchange="SCM.adjustStageTime('${s.id}','${reportType}',${i},'start',this.value)" style="font-size:12px">
                                    <input type="datetime-local" value="${stage.endTime}" onchange="SCM.adjustStageTime('${s.id}','${reportType}',${i},'end',this.value)" style="font-size:12px">
                                </div>
                            ` : ''}
                        ` : hasStart && !hasEnd ? `
                            <div class="timeline-time">${t('startTime')}: ${formatDateTime(stage.startTime)}</div>
                            ${canRecord ? `
                                <div class="timeline-input" style="display:flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap">
                                    <button class="btn btn-success btn-sm" onclick="SCM.recordStageEnd('${s.id}','${reportType}',${i})">${t('recordNow')} (${t('endTime')})</button>
                                    <span style="font-size:11px;color:var(--gray-400)">${t('manualTimeInput')}</span>
                                    <input type="datetime-local" id="manual-end-${reportType}-${i}" style="font-size:12px">
                                    <button class="btn btn-outline btn-sm" onclick="SCM.recordStageEnd('${s.id}','${reportType}',${i},true)">${t('save')}</button>
                                </div>
                            ` : ''}
                        ` : isNext && canRecord ? `
                            <div class="timeline-input" style="display:flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap">
                                <button class="btn btn-primary btn-sm" onclick="SCM.recordStageStart('${s.id}','${reportType}',${i})">${t('recordNow')} (${t('startTime')})</button>
                                ${isSkippableStage ? `<button class="btn btn-outline btn-sm" onclick="SCM.skipStage('${s.id}','${reportType}',${i})">${t('stageOptional')} — Skip</button>` : ''}
                                <span style="font-size:11px;color:var(--gray-400)">${t('manualTimeInput')}</span>
                                <input type="datetime-local" id="manual-start-${reportType}-${i}" style="font-size:12px">
                                <button class="btn btn-outline btn-sm" onclick="SCM.recordStageStart('${s.id}','${reportType}',${i},true)">${t('save')}</button>
                            </div>
                        ` : `<div class="timeline-time" style="color:var(--gray-300)">${isSkippableStage ? t('stageOptional') : t('pending')}</div>`}
                    </div>
                `;
            }).join('')}
        </div>`;
    },

    startReportIn(id, type) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;
        if (!s.reportIns) s.reportIns = {};
        s.reportIns[type] = { stages: makeEmptyStages() };
        this._activeReportTab = type;
        showToast(t('reportInStarted'), 'success');
        this.showShipmentDetail(id);
    },

    recordStageStart(id, reportType, stageIdx, manual) {
        const s = scmShipments.find(x => x.id === id);
        if (!s || !s.reportIns || !s.reportIns[reportType]) return;
        const stages = s.reportIns[reportType].stages;
        const stage = stages[stageIdx];
        if (manual) {
            const el = document.getElementById(`manual-start-${reportType}-${stageIdx}`);
            if (!el || !el.value) return;
            stage.startTime = el.value;
        } else {
            // Auto-fill from previous stage's end time
            const prevStage = stageIdx > 0 ? stages[stageIdx - 1] : null;
            if (prevStage && prevStage.endTime && prevStage.endTime !== 'skipped') {
                stage.startTime = prevStage.endTime;
                showToast(t('autoFilledFromPrevious'), 'success');
            } else {
                stage.startTime = new Date().toISOString().slice(0, 16);
                showToast(t('stageRecorded', { stage: tStage(stage.name), time: formatDateTime(stage.startTime) }), 'success');
            }
        }
        this.showShipmentDetail(id);
    },

    recordStageEnd(id, reportType, stageIdx, manual) {
        const s = scmShipments.find(x => x.id === id);
        if (!s || !s.reportIns || !s.reportIns[reportType]) return;
        const stage = s.reportIns[reportType].stages[stageIdx];
        if (manual) {
            const el = document.getElementById(`manual-end-${reportType}-${stageIdx}`);
            if (!el || !el.value) return;
            stage.endTime = el.value;
        } else {
            stage.endTime = new Date().toISOString().slice(0, 16);
        }

        // Check if Last stage end is recorded → check both reports for review
        if (stage.name === 'Last' && stage.endTime) {
            const ri = s.reportIns;
            const custDone = ri.customer && ri.customer.stages.find(st => st.name === 'Last')?.endTime;
            const intDone = ri.internal && ri.internal.stages.find(st => st.name === 'Last')?.endTime;
            if (custDone && intDone) {
                s.status = 'review';
                showToast(t('shipmentUnderReview', { id }), 'success');
            } else {
                const whichDone = reportType === 'customer' ? t('customerReportComplete') : t('internalReportComplete');
                showToast(`${whichDone}. ${t('bothReportsRequired')}`, 'success');
            }
        } else {
            showToast(t('stageRecorded', { stage: tStage(stage.name), time: formatDateTime(stage.endTime) }), 'success');
        }
        this.showShipmentDetail(id);
    },

    skipStage(id, reportType, stageIdx) {
        const s = scmShipments.find(x => x.id === id);
        if (!s || !s.reportIns || !s.reportIns[reportType]) return;
        s.reportIns[reportType].stages[stageIdx].startTime = 'skipped';
        s.reportIns[reportType].stages[stageIdx].endTime = 'skipped';
        this.showShipmentDetail(id);
    },

    adjustStageTime(id, reportType, stageIdx, which, value) {
        const s = scmShipments.find(x => x.id === id);
        if (!s || !s.reportIns || !s.reportIns[reportType]) return;
        if (which === 'start') s.reportIns[reportType].stages[stageIdx].startTime = value;
        else s.reportIns[reportType].stages[stageIdx].endTime = value;
        showToast(t('changesSaved'), 'success');
    },

    closeShipment(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;
        s.status = 'closed';
        // Check if all shipments from parent order are closed
        const parentShipments = scmShipments.filter(sh => sh.orderId === s.orderId);
        if (parentShipments.every(sh => sh.status === 'closed')) {
            const ts = scmTugSchedules.find(t => t.id === s.orderId);
            if (ts) ts.status = 'closed';
        }
        showToast(t('shipmentClosed', { id }), 'success');
        this.showShipmentDetail(id);
    },
};
