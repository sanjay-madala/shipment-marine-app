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
        ['draft', 'open', 'dispatch', 'completed'].forEach(s => counts[s] = scmTugSchedules.filter(t => t.status === s).length);
        const filtered = this.statusFilter === 'all' ? scmTugSchedules : scmTugSchedules.filter(t => t.status === this.statusFilter);

        const statusLabels = { all: t('all'), draft: t('draft'), open: t('open'), dispatch: t('dispatch'), completed: t('completed') };

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
                <div class="stat-card"><div class="stat-value">${counts.completed}</div><div class="stat-label">${t('completed')}</div></div>
            </div>
            <div class="filters">
                ${['all', 'draft', 'open', 'dispatch', 'completed'].map(s => `
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
                                        ${ts.status === 'draft' ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();SCM.confirmSchedule('${ts.id}')">${t('confirmSchedule')}</button>` : ''}
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
                        <select id="f-site">${MASTERS.sites.map(s => `<option>${s}</option>`).join('')}</select>
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
                        <select id="f-port">${MASTERS.ports.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
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
            this.renderTugList();
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

        const canAssignTugs = ts.status === 'open';
        const canDispatch = ts.status === 'open' && ts.bomItems.filter(b => b.desc !== 'Standby Charge').every(b => b.tug);

        document.getElementById('scm-content').innerHTML = `
            <div class="detail-header">
                <div>
                    <button class="btn btn-outline btn-sm" onclick="SCM.renderTugList()" style="margin-bottom:8px">&larr; ${t('back')}</button>
                    <div class="detail-title">${ts.id} &mdash; ${ts.vessel.name}</div>
                    <div class="detail-subtitle">${t('createdAt')} ${formatDateTime(ts.createdAt)}</div>
                </div>
                <div class="btn-group">
                    ${statusBadge(ts.status)}
                    ${canDispatch ? `<button class="btn btn-warning" onclick="SCM.dispatchSchedule('${ts.id}')">${t('dispatchBtn')}</button>` : ''}
                    ${ts.status === 'open' ? `<button class="btn btn-outline" onclick="SCM.showEditForm('${ts.id}')">${t('edit')}</button>` : ''}
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
                                            ${MASTERS.tugBoats.map(tb => `<option value="${tb.id}" ${item.tug && item.tug.id === tb.id ? 'selected' : ''}>${tb.name} (${tb.hp} HP)</option>`).join('')}
                                        </select>
                                    ` : item.tug ? `${item.tug.name}` : (needsTug ? `<span style="color:var(--gray-400)">${t('notAssigned')}</span>` : `<span style="color:var(--gray-400)">${t('na')}</span>`)}</td>
                                    <td style="font-family:monospace;font-size:12px">${item.wbs || '-'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            ${ts.status === 'dispatch' || ts.status === 'completed' ? `
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
        openModal(`
            <div class="modal-header">
                <h2>${t('editTugSchedule')} ${ts.id}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
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
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="SCM.saveEdit('${id}')">${t('saveChanges')}</button>
            </div>
        `);
    },

    saveEdit(id) {
        const ts = scmTugSchedules.find(t => t.id === id);
        if (!ts) return;
        ts.pilot = document.getElementById('e-pilot').value;
        ts.workDate = document.getElementById('e-workdate').value;
        ts.scope = document.getElementById('e-scope').value;
        ts.jobType = MASTERS.jobTypes.find(j => j.id === document.getElementById('e-jobtype').value);
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
                reportIn: null,
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
                <div class="stat-card"><div class="stat-value">${scmShipments.filter(s => s.status === 'completed').length}</div><div class="stat-label">${t('completed')}</div></div>
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
    showShipmentDetail(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;

        const stages = s.reportIn ? s.reportIn.stages : [
            { name: 'Start', time: '' }, { name: 'Stand by #1', time: '' },
            { name: 'Work Period #1', time: '' }, { name: 'Stand by #2', time: '' },
            { name: 'Work Period #2', time: '' }, { name: 'Stand by #3', time: '' },
            { name: 'Work Period #3', time: '' }, { name: 'Last', time: '' },
        ];

        const canReportIn = s.status === 'dispatch' || s.status === 'completed';

        document.getElementById('scm-content').innerHTML = `
            <div class="detail-header">
                <div>
                    <button class="btn btn-outline btn-sm" onclick="SCM.renderShipmentList()" style="margin-bottom:8px">&larr; ${t('back')}</button>
                    <div class="detail-title">${s.id}</div>
                    <div class="detail-subtitle">${t('fromOrder')} ${s.orderId} &bull; ${t('tug')}: ${s.tug.name} (${s.tug.hp} HP)</div>
                </div>
                <div class="btn-group">
                    ${statusBadge(s.status)}
                    ${s.status === 'dispatch' && !s.reportIn ? `<button class="btn btn-success" onclick="SCM.startReportIn('${s.id}')">${t('reportIn')}</button>` : ''}
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
                        ${s.reportIn ? `<span class="badge badge-${s.reportIn.type === 'Customer' ? 'open' : 'dispatch'}">${s.reportIn.type === 'Customer' ? t('customer') : t('internal')}</span>` : ''}
                    </div>
                </div>
                <div class="card-body">
                    <div class="timeline">
                        ${stages.map((stage, i) => {
                            const filled = !!stage.time;
                            const isNext = !filled && (i === 0 || stages[i-1].time);
                            return `
                                <div class="timeline-item">
                                    <div class="timeline-dot ${filled ? 'filled' : ''} ${isNext ? 'current' : ''}"></div>
                                    <div class="timeline-label">${tStage(stage.name)}</div>
                                    ${filled ? `<div class="timeline-time">${formatDateTime(stage.time)}</div>` : ''}
                                    ${isNext && s.status !== 'completed' ? `
                                        <div class="timeline-input">
                                            <button class="btn btn-primary btn-sm" onclick="SCM.recordStage('${s.id}', ${i})">${t('recordNow')}</button>
                                        </div>
                                    ` : (!filled ? `<div class="timeline-time" style="color:var(--gray-300)">${t('pending')}</div>` : '')}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
            ` : ''}
        `;
    },

    startReportIn(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;
        openModal(`
            <div class="modal-header">
                <h2>${t('startReportIn')} &mdash; ${id}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>${t('reportType')} <span class="req">*</span></label>
                    <select id="ri-type">
                        <option value="Customer">${t('customer')}</option>
                        <option value="Internal">${t('internal')}</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-success" onclick="SCM.confirmReportIn('${id}')">${t('startReportIn')}</button>
            </div>
        `);
    },

    confirmReportIn(id) {
        const s = scmShipments.find(x => x.id === id);
        if (!s) return;
        s.reportIn = {
            type: document.getElementById('ri-type').value,
            stages: [
                { name: 'Start', time: '' }, { name: 'Stand by #1', time: '' },
                { name: 'Work Period #1', time: '' }, { name: 'Stand by #2', time: '' },
                { name: 'Work Period #2', time: '' }, { name: 'Stand by #3', time: '' },
                { name: 'Work Period #3', time: '' }, { name: 'Last', time: '' },
            ],
        };
        closeModal();
        showToast(t('reportInStarted'), 'success');
        this.showShipmentDetail(id);
    },

    recordStage(id, stageIdx) {
        const s = scmShipments.find(x => x.id === id);
        if (!s || !s.reportIn) return;
        s.reportIn.stages[stageIdx].time = new Date().toISOString();
        if (s.reportIn.stages[stageIdx].name === 'Last') {
            s.status = 'completed';
            const parentShipments = scmShipments.filter(sh => sh.orderId === s.orderId);
            if (parentShipments.every(sh => sh.status === 'completed')) {
                const ts = scmTugSchedules.find(t => t.id === s.orderId);
                if (ts) ts.status = 'completed';
            }
        }
        showToast(t('stageRecorded', { stage: tStage(s.reportIn.stages[stageIdx].name), time: formatDateTime(s.reportIn.stages[stageIdx].time) }), 'success');
        this.showShipmentDetail(id);
    },
};
