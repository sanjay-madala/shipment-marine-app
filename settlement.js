// ========== SCM SETTLEMENT MODULE ==========
// Attached to SCM object (loaded after scm.js)
// Phase 2: Refactored from shipment-level to tug-schedule-level

SCM._settlementTab = 'awaiting';

// ── Helpers ──────────────────────────────────────────────────────────────────

SCM._calcTotalMin = function(stages) {
    if (!stages) return 0;
    return stages.reduce((sum, st) => {
        if (!st.startTime || st.startTime === 'skipped') return sum;
        const dur = SCM._calcDuration(st.startTime, st.endTime);
        if (!dur) return sum;
        const [h, m] = dur.split(':').map(Number);
        return sum + h * 60 + m;
    }, 0);
};

SCM._fmtMin = function(min) {
    if (!min) return '—';
    const h = Math.floor(min / 60), m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

SCM._shipmentBillingMin = function(s) {
    const ri = s.reportIns;
    if (!ri || !ri.billing) return 0;
    return SCM._calcTotalMin(ri.billing.stages);
};

SCM._shipmentActualMin = function(s) {
    const ri = s.reportIns;
    if (!ri || !ri.actual) return 0;
    return SCM._calcTotalMin(ri.actual.stages);
};

SCM._settlementStatusBadge = function(status) {
    const map = {
        pending_so:  `<span class="badge badge-dispatch"  style="font-size:11px">Pending SO</span>`,
        posted:      `<span class="badge badge-completed" style="font-size:11px">Posted</span>`,
        pending:     `<span class="badge badge-dispatch"  style="font-size:11px">Pending</span>`,
        cancelled:   `<span class="badge" style="font-size:11px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca">Cancelled</span>`,
    };
    return map[status] || `<span class="badge badge-open" style="font-size:11px">${status}</span>`;
};

// 2A: Changed from shipment-level to tug-schedule-level
SCM._getAwaitingTugSchedules = function() {
    return scmTugSchedules.filter(ts => ts.status === 'closed' && !ts.settlementStatus);
};

// Helper: get total billing minutes for a tug schedule (sum of all its shipments)
SCM._tugScheduleBillingMin = function(ts) {
    const shipments = scmShipments.filter(s => s.orderId === ts.id);
    return shipments.reduce((sum, s) => sum + SCM._shipmentBillingMin(s), 0);
};

// Helper: get total actual minutes for a tug schedule
SCM._tugScheduleActualMin = function(ts) {
    const shipments = scmShipments.filter(s => s.orderId === ts.id);
    return shipments.reduce((sum, s) => sum + SCM._shipmentActualMin(s), 0);
};

// Helper: calculate price for a BOM item
SCM._calcItemPrice = function(bomItemId, grt, jobTypeId) {
    // Tug service items: use GRT * rate
    if (bomItemId && /TUGBOAT/i.test(bomItemId)) {
        return lookupGRTRate(grt);
    }
    // Other services: use PRICE_MASTER
    return PRICE_MASTER[bomItemId] || 0;
};

// ── Main View ─────────────────────────────────────────────────────────────────

SCM.renderSettlement = function() {
    const awaiting = SCM._getAwaitingTugSchedules();
    const reports = scmSettlementReports;
    const sos = scmSalesOrders;

    document.getElementById('scm-content').innerHTML = `
        <div class="page-header">
            <div class="page-title">${t('settlementTitle')}</div>
        </div>

        <div class="stats-row">
            <div class="stat-card">
                <div class="stat-value">${awaiting.length}</div>
                <div class="stat-label">${t('awaitingSettlement')}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${reports.length}</div>
                <div class="stat-label">${t('settlementReports')}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${sos.length}</div>
                <div class="stat-label">${t('salesOrders')}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${sos.filter(x => x.status === 'posted').length}</div>
                <div class="stat-label">${t('soPosted')}</div>
            </div>
        </div>

        <div class="filters" style="margin-bottom:0">
            ${[
                ['awaiting',    t('awaitingSettlement'), awaiting.length],
                ['reports',     t('settlementReports'),  reports.length],
                ['salesorders', t('salesOrders'),        sos.length],
            ].map(([k, l, c]) => `
                <span class="filter-chip ${SCM._settlementTab === k ? 'active' : ''}"
                    onclick="SCM._settlementTab='${k}';SCM.renderSettlement()">
                    ${l}<span class="filter-count">${c}</span>
                </span>
            `).join('')}
        </div>

        <div style="margin-top:16px">
            ${SCM._settlementTab === 'awaiting'    ? SCM._renderSettlementAwaiting(awaiting) : ''}
            ${SCM._settlementTab === 'reports'     ? SCM._renderSettlementReports()           : ''}
            ${SCM._settlementTab === 'salesorders' ? SCM._renderSettlementSOs()               : ''}
        </div>
    `;
};

// ── Awaiting Tab (2A: now shows tug schedules, 2B: site/date/search filters) ─

SCM._awaitingFilters = { site: '', from: '', to: '', search: '' };

SCM._renderSettlementAwaiting = function(awaiting) {
    // 2B: Apply filters
    let filtered = awaiting;
    const f = SCM._awaitingFilters;
    if (f.site)   filtered = filtered.filter(ts => ts.site === f.site);
    if (f.from)   filtered = filtered.filter(ts => (ts.workDate || '').slice(0, 10) >= f.from);
    if (f.to)     filtered = filtered.filter(ts => (ts.workDate || '').slice(0, 10) <= f.to);
    if (f.search) {
        const q = f.search.toLowerCase();
        filtered = filtered.filter(ts =>
            ts.id.toLowerCase().includes(q) ||
            (ts.vessel?.name || '').toLowerCase().includes(q) ||
            (ts.agent?.name || '').toLowerCase().includes(q)
        );
    }

    return `
        <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:12px 20px;border-bottom:1px solid var(--gray-200);flex-wrap:wrap;gap:8px">
                <span style="font-size:13px;color:var(--gray-500)">
                    <strong>${filtered.length}</strong> closed tug schedule(s) pending settlement
                </span>
                <button class="btn btn-primary" id="settle-create-btn" style="display:none" onclick="SCM.createReportFromSelection()">Create Settlement Report</button>
            </div>
            <!-- 2B: Filters -->
            <div style="display:flex;gap:10px;padding:10px 20px;border-bottom:1px solid var(--gray-100);flex-wrap:wrap;align-items:flex-end">
                <div class="form-group" style="margin:0;min-width:90px">
                    <label style="font-size:11px">${t('site')}</label>
                    <select onchange="SCM._awaitingFilters.site=this.value;SCM.renderSettlement()" style="font-size:12px;padding:4px 6px">
                        <option value="" ${!f.site ? 'selected' : ''}>${t('all')}</option>
                        <option value="BKK" ${f.site === 'BKK' ? 'selected' : ''}>BKK</option>
                        <option value="MTP" ${f.site === 'MTP' ? 'selected' : ''}>MTP</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:11px">Work Date From</label>
                    <input type="date" value="${f.from}" style="font-size:12px;padding:4px 6px"
                        onchange="SCM._awaitingFilters.from=this.value;SCM.renderSettlement()">
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:11px">Work Date To</label>
                    <input type="date" value="${f.to}" style="font-size:12px;padding:4px 6px"
                        onchange="SCM._awaitingFilters.to=this.value;SCM.renderSettlement()">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:150px">
                    <label style="font-size:11px">Search</label>
                    <input type="text" placeholder="Tug Schedule ID, vessel, agent..."
                        value="${f.search}" style="font-size:12px;padding:4px 6px"
                        oninput="SCM._awaitingFilters.search=this.value;SCM.renderSettlement()">
                </div>
            </div>
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th style="width:40px"><input type="checkbox" onchange="SCM._toggleAllAwaiting(this.checked)"></th>
                        <th>Tug Schedule ID</th>
                        <th>Agent</th>
                        <th>Vessel</th>
                        <th style="text-align:right">GRT</th>
                        <th>Port</th>
                        <th>Site</th>
                        <th>Activity</th>
                        <th>BOM Description</th>
                    </tr></thead>
                    <tbody>
                        ${filtered.length === 0
                            ? `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--gray-400)">${t('noAwaitingSettlement')}</td></tr>`
                            : filtered.map(ts => `
                                <tr>
                                    <td style="text-align:center"><input type="checkbox" class="await-check" data-ts-id="${ts.id}" onchange="SCM._updateAwaitingBtn()"></td>
                                    <td><strong>${ts.id}</strong></td>
                                    <td>${ts.agent?.name || '—'}</td>
                                    <td>${ts.vessel?.name || '—'}</td>
                                    <td style="text-align:right">${ts.vessel?.grt?.toLocaleString() || '—'}</td>
                                    <td>${ts.port?.name || '—'}</td>
                                    <td><span class="site-badge">${ts.site}</span></td>
                                    <td>${ts.activity?.name || '—'}</td>
                                    <td>${ts.service?.id || '—'}</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

SCM._toggleAllAwaiting = function(checked) {
    document.querySelectorAll('.await-check').forEach(cb => { cb.checked = checked; });
    SCM._updateAwaitingBtn();
};

SCM._updateAwaitingBtn = function() {
    const count = document.querySelectorAll('.await-check:checked').length;
    const btn = document.getElementById('settle-create-btn');
    if (btn) {
        btn.style.display = count > 0 ? '' : 'none';
        btn.textContent = `Create Settlement Report (${count})`;
    }
};

SCM.createReportFromSelection = function() {
    const ids = [];
    document.querySelectorAll('.await-check:checked').forEach(cb => ids.push(cb.dataset.tsId));
    if (!ids.length) return;

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const idx = scmSettlementReports.length + 1;
    const reportNo = `MSST-${yy}${mm}${String(idx).padStart(3, '0')}`;
    const items = [];
    ids.forEach(tsId => {
        const ts = scmTugSchedules.find(x => x.id === tsId);
        if (!ts) return;
        ts.settlementStatus = 'in_report';
        const shipments = scmShipments.filter(s => s.orderId === tsId && s.status !== 'cancelled');
        shipments.forEach(s => {
            const bomItems = s.bomItems || [s.bomItem];
            bomItems.forEach(bi => {
                items.push({
                    tugScheduleId: ts.id,
                    shipmentId: s.id,
                    matNo: bi.id,
                    matDesc: ts.vessel?.name || bi.desc,
                    unit: bi.unit || 'Trip',
                    qty: bi.qty || 1,
                    billingMin: SCM._tugScheduleBillingMin ? SCM._tugScheduleBillingMin(ts) : 0,
                    price: SCM._calcItemPrice ? SCM._calcItemPrice(bi, ts) : (PRICE_MASTER[bi.id] || 0),
                    comCoPct: 0, comCoUnit: 0, comPersonPct: 0, comPersonUnit: 0,
                    discountPct: 0, discountUnit: 0,
                    vessel: ts.vessel?.name || '',
                    grt: ts.vessel?.grt || 0,
                    loa: ts.vessel?.loa || 0,
                    workDate: ts.workDate,
                    site: ts.site,
                    agent: ts.agent?.name || '',
                    port: ts.port?.name || '',
                    activity: ts.activity?.name || '',
                    jobType: ts.jobType?.id || '',
                    wbs: bi.wbs || '',
                });
            });
        });
    });

    scmSettlementReports.push({
        id: reportNo,
        reportNo: reportNo,
        createdAt: now.toISOString(),
        period: `${yy}/${mm}`,
        site: items[0]?.site || 'BKK',
        status: 'pending_so',
        tugScheduleIds: ids,
        items: items,
        soIds: [],
    });

    showToast(`Report ${reportNo} created with ${ids.length} tug schedule(s)`, 'success');
    SCM._settlementTab = 'reports';
    SCM.showSettlementReportDetail(reportNo);
};

// ── Create Report Modal (2A: tug schedules, 2B: filters) ─────────────────────

SCM.showCreateReportModal = function() {
    const today = new Date();
    const d1 = new Date(today); d1.setDate(today.getDate() - 30);

    openModal(`
        <div class="modal-header">
            <h2>${t('createSettlementReport')}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap">
                <div class="form-group" style="margin:0">
                    <label>${t('site')}</label>
                    <select id="sr-site" onchange="SCM._filterSettlementModal()">
                        <option value="">${t('all')} Sites</option>
                        ${['BKK', 'MTP'].map(s => `<option>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin:0">
                    <label>${t('workDate')} From</label>
                    <input type="date" id="sr-from" value="${d1.toISOString().slice(0,10)}"
                        onchange="SCM._filterSettlementModal()">
                </div>
                <div class="form-group" style="margin:0">
                    <label>${t('workDate')} To</label>
                    <input type="date" id="sr-to" value="${today.toISOString().slice(0,10)}"
                        onchange="SCM._filterSettlementModal()">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:140px">
                    <label>Search</label>
                    <input type="text" id="sr-search" placeholder="Tug Schedule ID..."
                        oninput="SCM._filterSettlementModal()">
                </div>
            </div>
            <div id="sr-table-wrap"></div>
        </div>
        <div class="modal-footer">
            <span id="sr-count-info" style="font-size:12px;color:var(--gray-500);margin-right:auto">
                0 selected
            </span>
            <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
            <button class="btn btn-primary" onclick="SCM.createSettlementReport()">
                ${t('createSettlementReport')}
            </button>
        </div>
    `);
    SCM._filterSettlementModal();
};

SCM._renderSettlementModalTable = function(rows) {
    if (rows.length === 0) {
        return `<div style="text-align:center;padding:30px;color:var(--gray-400)">No tug schedules match</div>`;
    }
    return `
        <table>
            <thead><tr>
                <th style="width:36px">
                    <input type="checkbox" id="sr-check-all"
                        onchange="SCM._srToggleAll(this.checked)">
                </th>
                <th>Tug Schedule ID</th>
                <th>Agent</th>
                <th>Vessel</th>
                <th style="text-align:right">GRT</th>
                <th>Port</th>
                <th>Site</th>
                <th>Activity</th>
                <th>BOM Description</th>
                <th>Work Date</th>
            </tr></thead>
            <tbody>
                ${rows.map(ts => `
                    <tr>
                        <td>
                            <input type="checkbox" class="sr-item" data-id="${ts.id}"
                                onchange="SCM._srUpdateCount()">
                        </td>
                        <td><strong>${ts.id}</strong></td>
                        <td>${ts.agent?.name || '—'}</td>
                        <td>${ts.vessel?.name || '—'}</td>
                        <td style="text-align:right">${ts.vessel?.grt?.toLocaleString() || '—'}</td>
                        <td>${ts.port?.name || '—'}</td>
                        <td><span class="site-badge">${ts.site}</span></td>
                        <td>${ts.activity?.name || '—'}</td>
                        <td>${ts.service?.id || '—'}</td>
                        <td>${formatDateTime(ts.workDate)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

SCM._filterSettlementModal = function() {
    const site   = document.getElementById('sr-site')?.value;
    const from   = document.getElementById('sr-from')?.value;
    const to     = document.getElementById('sr-to')?.value;
    const search = (document.getElementById('sr-search')?.value || '').toLowerCase();

    let rows = SCM._getAwaitingTugSchedules();
    if (site)   rows = rows.filter(ts => ts.site === site);
    if (from)   rows = rows.filter(ts => (ts.workDate || '').slice(0, 10) >= from);
    if (to)     rows = rows.filter(ts => (ts.workDate || '').slice(0, 10) <= to);
    if (search) rows = rows.filter(ts =>
        ts.id.toLowerCase().includes(search) ||
        (ts.vessel?.name || '').toLowerCase().includes(search) ||
        (ts.agent?.name || '').toLowerCase().includes(search)
    );

    const wrap = document.getElementById('sr-table-wrap');
    if (wrap) wrap.innerHTML = SCM._renderSettlementModalTable(rows);
    SCM._srUpdateCount();
};

SCM._srToggleAll = function(checked) {
    document.querySelectorAll('.sr-item').forEach(cb => cb.checked = checked);
    SCM._srUpdateCount();
};

SCM._srUpdateCount = function() {
    const n = document.querySelectorAll('.sr-item:checked').length;
    const el = document.getElementById('sr-count-info');
    if (el) el.textContent = `${n} tug schedule(s) selected`;
};

// 2G: createSettlementReport now works with tug schedule IDs
SCM.createSettlementReport = function() {
    const selected = Array.from(document.querySelectorAll('.sr-item:checked'))
        .map(cb => cb.dataset.id);
    if (selected.length === 0) {
        showToast('Select at least one tug schedule', 'error');
        return;
    }

    const first = scmTugSchedules.find(ts => ts.id === selected[0]);
    const site  = first?.site || 'BKK';
    const now   = new Date();
    const yy    = String(now.getFullYear()).slice(-2);
    const idx   = scmSettlementReports.length + 1;
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const reportNo = `MSST-${yy}${mm}${String(idx).padStart(3, '0')}`;

    // Build items from tug schedule's shipments
    const items = [];
    selected.forEach(tsId => {
        const ts = scmTugSchedules.find(x => x.id === tsId);
        if (!ts) return;
        const shipments = scmShipments.filter(s => s.orderId === tsId);
        shipments.forEach(s => {
            const billingMin = SCM._shipmentBillingMin(s);
            const actualMin  = SCM._shipmentActualMin(s);
            const isHI = ts.jobType?.id === 'HI';
            // 2D: QTY — for HI job type, copy from billing hours; otherwise 1
            const qty = isHI ? (billingMin > 0 ? +(billingMin / 60).toFixed(2) : 1) : 1;
            // 2D: Price/unit — Tug service uses GRT*rate, others use PRICE_MASTER
            const price = SCM._calcItemPrice(s.bomItem?.id, ts.vessel?.grt, ts.jobType?.id);
            items.push({
                tugScheduleId: tsId,
                shipmentId: s.id,
                billingMin,
                actualMin,
                qty,
                rate: price,
                amount: qty * price,
                comCoPct: 0,
                comCoUnit: 0,
                comPersonPct: 0,
                comPersonUnit: 0,
                discountPct: 0,
                discountUnit: 0,
            });
        });
    });

    const report = {
        id: `sr-${Date.now()}`,
        reportNo,
        site,
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        createdAt: now.toISOString().slice(0, 16),
        status: 'pending_so',
        tugScheduleIds: [...selected],
        items,
        soIds: [],
    };

    scmSettlementReports.push(report);
    selected.forEach(tsId => {
        const ts = scmTugSchedules.find(x => x.id === tsId);
        if (ts) ts.settlementStatus = 'in_report';
    });

    closeModal();
    showToast(t('settlementReportCreated', { id: reportNo }), 'success');
    SCM._settlementTab = 'reports';
    SCM.renderSettlement();
};

// ── Reports Tab (2C: filters) ────────────────────────────────────────────────

SCM._reportFilters = { site: '', from: '', to: '', soSearch: '' };

SCM._renderSettlementReports = function() {
    const reports = scmSettlementReports;

    // 2C: Default date range +/- 7 days
    if (!SCM._reportFilters._init) {
        const now = new Date();
        const d1 = new Date(now); d1.setDate(now.getDate() - 7);
        const d2 = new Date(now); d2.setDate(now.getDate() + 7);
        SCM._reportFilters.from = d1.toISOString().slice(0, 10);
        SCM._reportFilters.to   = d2.toISOString().slice(0, 10);
        SCM._reportFilters._init = true;
    }
    const f = SCM._reportFilters;

    let filtered = reports;
    if (f.site)     filtered = filtered.filter(r => r.site === f.site);
    if (f.from)     filtered = filtered.filter(r => (r.createdAt || '').slice(0, 10) >= f.from);
    if (f.to)       filtered = filtered.filter(r => (r.createdAt || '').slice(0, 10) <= f.to);
    if (f.soSearch) {
        const q = f.soSearch.toLowerCase();
        filtered = filtered.filter(r => {
            const soNums = r.soIds.map(sid => {
                const so = scmSalesOrders.find(x => x.id === sid);
                return so ? so.soNo : '';
            }).join(' ').toLowerCase();
            return soNums.includes(q) || r.reportNo.toLowerCase().includes(q);
        });
    }

    return `
        <div class="card">
            <!-- 2C: Report filters -->
            <div style="display:flex;gap:10px;padding:10px 20px;border-bottom:1px solid var(--gray-100);flex-wrap:wrap;align-items:flex-end">
                <div class="form-group" style="margin:0;min-width:90px">
                    <label style="font-size:11px">${t('site')}</label>
                    <select onchange="SCM._reportFilters.site=this.value;SCM.renderSettlement()" style="font-size:12px;padding:4px 6px">
                        <option value="" ${!f.site ? 'selected' : ''}>${t('all')}</option>
                        <option value="BKK" ${f.site === 'BKK' ? 'selected' : ''}>BKK</option>
                        <option value="MTP" ${f.site === 'MTP' ? 'selected' : ''}>MTP</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:11px">Created From</label>
                    <input type="date" value="${f.from}" style="font-size:12px;padding:4px 6px"
                        onchange="SCM._reportFilters.from=this.value;SCM.renderSettlement()">
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:11px">Created To</label>
                    <input type="date" value="${f.to}" style="font-size:12px;padding:4px 6px"
                        onchange="SCM._reportFilters.to=this.value;SCM.renderSettlement()">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:140px">
                    <label style="font-size:11px">SO Number</label>
                    <input type="text" placeholder="Search SO number..."
                        value="${f.soSearch}" style="font-size:12px;padding:4px 6px"
                        oninput="SCM._reportFilters.soSearch=this.value;SCM.renderSettlement()">
                </div>
            </div>
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>Report No.</th>
                        <th>Created</th>
                        <th>Site</th>
                        <th>Status</th>
                        <th>SO Number</th>
                    </tr></thead>
                    <tbody>
                        ${filtered.length === 0
                            ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray-400)">
                                    ${t('noSettlementReports')}
                                </td></tr>`
                            : filtered.map(r => {
                                const soNums = r.soIds.map(sid => {
                                    const so = scmSalesOrders.find(x => x.id === sid);
                                    return so ? so.soNo : sid;
                                }).join(', ');
                                return `
                                    <tr class="clickable" onclick="SCM.showSettlementReportDetail('${r.id}')">
                                        <td><strong>${r.reportNo}</strong></td>
                                        <td>${formatDateTime(r.createdAt)}</td>
                                        <td><span class="site-badge">${r.site}</span></td>
                                        <td>${SCM._settlementStatusBadge(r.status)}</td>
                                        <td style="font-family:monospace;font-size:11px">${soNums || '—'}</td>
                                    </tr>
                                `;
                            }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

// ── Report Detail (2D, 2E, 2F) ──────────────────────────────────────────────

SCM.showSettlementReportDetail = function(id) {
    const report = scmSettlementReports.find(r => r.id === id);
    if (!report) return;

    const hasSO    = report.soIds.length > 0;

    // Helper: minutes -> decimal hours string
    const fmtHr = min => min ? (min / 60).toFixed(2) : '—';

    // Helper: billing stage name -> ts-chip type class
    const stageType = name => {
        if (/start/i.test(name))          return 'ts-start';
        if (/stand/i.test(name))          return 'ts-standby';
        if (/work/i.test(name))           return 'ts-work';
        return 'ts-end';
    };

    // Helper: build time-chip HTML from billing stages
    const chipHtml = s => {
        const stages = s.reportIns?.billing?.stages;
        if (!stages) return '<span style="font-size:11px;color:var(--gray-400)">No stage data</span>';
        const parts = [];
        stages.forEach(st => {
            if (!st.startTime || st.startTime === 'skipped') return;
            const durMin = (st.endTime && st.endTime !== 'skipped')
                ? Math.round((new Date(st.endTime) - new Date(st.startTime)) / 60000)
                : 0;
            const durStr = durMin > 0
                ? (durMin >= 60 ? `${Math.floor(durMin / 60)}h ${durMin % 60}m` : `${durMin}m`)
                : '';
            if (parts.length) parts.push('<span class="ts-arrow">›</span>');
            parts.push(`<span class="ts-chip ${stageType(st.name)}">${st.name}${durStr ? ' · ' + durStr : ''}</span>`);
        });
        return parts.length ? parts.join('') : '<span style="font-size:11px;color:var(--gray-400)">No times recorded</span>';
    };

    // Group items by tugScheduleId (preserving insert order)
    const groups = {};
    const groupOrder = [];
    report.items.forEach(item => {
        const tsId = item.tugScheduleId;
        const s = scmShipments.find(x => x.id === item.shipmentId);
        if (!s) return;
        if (!groups[tsId]) { groups[tsId] = []; groupOrder.push(tsId); }
        groups[tsId].push({ item, s });
    });

    // -- Page header --
    let html = `
        <div class="detail-header" style="margin-bottom:14px">
            <div>
                <button class="btn btn-outline btn-sm"
                    onclick="SCM._settlementTab='reports';SCM.renderSettlement()"
                    style="margin-bottom:8px">&larr; ${t('back')}</button>
                <div class="detail-title">${report.reportNo}</div>
                <div class="detail-subtitle">
                    Settlement Report &mdash; ${report.period}
                    &bull; Site: ${report.site}
                    &bull; Created ${formatDateTime(report.createdAt)}
                    &bull; ${SCM._settlementStatusBadge(report.status)}
                </div>
            </div>
            <div class="btn-group">
                ${SCM._settlementStatusBadge(report.status)}
                ${(() => {
                    // Show Create SO button if any tug schedule doesn't have an active (non-cancelled) SO
                    const activeSOs = report.soIds.map(sid => scmSalesOrders.find(x => x.id === sid)).filter(x => x && x.status !== 'cancelled');
                    const allTSIds = [...new Set(report.items.map(i => i.tugScheduleId))];
                    const tsWithActiveSO = new Set(activeSOs.map(so => so.tugScheduleId));
                    const hasPending = allTSIds.some(tsId => !tsWithActiveSO.has(tsId));
                    return hasPending
                        ? `<button class="btn btn-primary"
                               onclick="SCM.createSalesOrder('${report.id}')">
                               ${t('createSalesOrder')}
                           </button>`
                        : '';
                })()}
            </div>
        </div>

        <!-- SO Grouping info bar -->
        <div style="display:flex;gap:16px;align-items:center;padding:7px 14px;
                    background:var(--primary-light);border-radius:var(--radius);
                    margin-bottom:14px;flex-wrap:wrap;font-size:12px">
            <span style="color:var(--primary);font-weight:600">SO Grouping:</span>
            <span style="color:var(--gray-700)">1 SO per Tug Schedule</span>
            ${hasSO ? `<span style="color:var(--success);font-weight:600">&#10003; ${report.soIds.length} SO(s) created</span>` : ''}
            ${!hasSO ? `<span style="color:var(--gray-500)">Review pricing, then create SO</span>` : ''}
        </div>

        <div class="srd-scroll-wrapper"><div class="srd-scroll-inner">
        <!-- Column labels -->
        <div style="background:#f1f4f8;border:1px solid #dde1e8;border-radius:6px 6px 0 0;
                    margin-bottom:-1px">
            <div style="display:flex;align-items:center;padding:0 12px;min-height:28px">
                <div style="width:26px;flex-shrink:0"></div>
                <div class="srd-order-cols" style="min-height:28px;font-size:9.5px;font-weight:700;
                            color:#8a94a6;text-transform:uppercase;letter-spacing:.05em">
                    <div>No.</div>
                    <div>Tug Schedule ID</div>
                    <div>Mat.no.</div>
                    <div>Vessel</div>
                    <div class="num">GRT</div>
                    <div class="num">LOA (m)</div>
                    <div class="num">Draf(M)</div>
                    <div>Date</div>
                    <div>Time</div>
                    <div>Activity</div>
                    <div>Port</div>
                    <div>Sales No.</div>
                </div>
            </div>
        </div>
    `;

    // -- Order blocks (grouped by tug schedule) --
    groupOrder.forEach((tsId, oi) => {
        const rows  = groups[tsId];
        const first = rows[0].s;
        const ts = scmTugSchedules.find(x => x.id === tsId);
        const groupTotal = rows.reduce((sum, { item }) => sum + (item.amount || 0), 0);
        const salesNo = first.soNo || '—';
        // 2D: Date uses work date
        const date = (ts?.workDate || first.workDate || '').slice(0, 10);
        const time = (ts?.workDate || first.workDate || '').slice(11, 16);
        const blockId = `srd-items-${oi}`;

        // 2F: "Remove tug schedule" button (only if no SO exists for it)
        const matchedSO = scmSalesOrders.find(x => report.soIds.includes(x.id) && x.tugScheduleId === tsId);
        const tsHasSO = !!matchedSO;
        const tsSOCancelled = matchedSO && matchedSO.status === 'cancelled';
        let actionBtn = '';
        if (!tsHasSO || tsSOCancelled) {
            actionBtn = `<button class="btn btn-outline btn-sm" style="margin-left:8px;color:var(--danger);border-color:var(--danger);font-size:10px"
                   onclick="SCM._removeTugScheduleFromReport('${report.id}','${tsId}')">Remove</button>`;
        } else if (tsHasSO && matchedSO.status !== 'cancelled') {
            actionBtn = `<button class="btn btn-outline btn-sm" style="margin-left:8px;color:var(--danger);border-color:var(--danger);font-size:10px"
                   onclick="SCM.showCancelSOModal('${matchedSO.id}')">Cancel SO</button>`;
        }

        html += `
        <div class="srd-order-block" style="animation-delay:${oi * 0.07}s;border-radius:${oi === 0 ? '0 0 6px 6px' : '6px'}">
            <div class="srd-order-header">
                <button class="srd-toggle-btn" onclick="srdToggleOrder(this,'${blockId}')">▼</button>
                <div class="srd-order-cols" style="font-size:12px;font-weight:500">
                    <div style="font-weight:700">${oi + 1}</div>
                    <div style="font-family:monospace;font-size:11px;font-weight:700">${tsId}</div>
                    <div style="font-family:monospace;font-size:11px">${first.bomItem?.id || '—'}</div>
                    <div style="font-weight:700">${ts?.vessel?.name || first.vessel?.name || '—'}</div>
                    <div class="num">${ts?.vessel?.grt?.toLocaleString() || first.vessel?.grt?.toLocaleString() || '—'}</div>
                    <div class="num">${ts?.vessel?.loa || first.vessel?.loa || '—'}</div>
                    <div class="num">—</div>
                    <div style="font-family:monospace;font-size:11px">${date}</div>
                    <div style="font-family:monospace">${time}</div>
                    <div style="color:var(--primary);font-weight:500">${ts?.activity?.name || first.activity?.name || '—'}</div>
                    <div>${ts?.port?.name || first.port?.name || '—'}</div>
                    <div style="font-family:monospace;font-size:11px;color:#8a94a6">${salesNo}${actionBtn}</div>
                </div>
            </div>
            <div class="srd-items-section" id="${blockId}">
                <div class="srd-item-scroll">
                    <table class="srd-item-table">
                        <thead><tr>
                            <th style="width:28px"></th>
                            <th style="width:130px">Mat.no.</th>
                            <th style="width:210px">Vessel</th>
                            <th class="num" style="width:60px">Qty</th>
                            <th style="width:52px">UOM</th>
                            <th style="width:150px">WBS no.</th>
                            <th class="num" style="width:82px">Actual Hr</th>
                            <th class="num" style="width:82px">Billing Hr</th>
                            <th style="width:72px">Status</th>
                            <th style="width:132px">Start</th>
                            <th style="width:132px">End</th>
                            <th class="num" style="width:118px">Amount</th>
                            <th class="num" style="width:110px">Price/Unit</th>
                            <th class="num" style="width:80px">Com.Co%</th>
                            <th class="num" style="width:110px">Com.Co/Unit</th>
                            <th class="num" style="width:108px">Com.Person%</th>
                            <th class="num" style="width:122px">Com.Person/Unit</th>
                            <th class="num" style="width:90px">Discount%</th>
                            <th class="num" style="width:110px">Discount/Unit</th>
                            <th style="width:180px">Item Text</th>
                        </tr></thead>
                        <tbody>
        `;

        rows.forEach(({ item, s }, ii) => {
            const stageId  = `srd-stage-${oi}-${ii}`;
            const itemNo   = String((ii + 1) * 10);
            const flatIdx  = report.items.indexOf(item);
            const bStages  = s.reportIns?.billing?.stages || [];
            const firstSt  = bStages.find(st => st.startTime && st.startTime !== 'skipped');
            const lastSt   = [...bStages].reverse().find(st => st.endTime && st.endTime !== 'skipped');
            const startStr = firstSt?.startTime?.slice(0, 16) || '—';
            const endStr   = lastSt?.endTime?.slice(0, 16)   || '—';
            const closed = !!s.soNo || s.settlementStatus === 'settled';
            const statusBadge = closed
                ? `<span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1">Closed</span>`
                : `<span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0">Open</span>`;

            const editable = !hasSO;

            // 2D: QTY editable
            const qtyCell = editable
                ? `<input type="number" min="0" step="0.01" value="${item.qty || 1}"
                       onchange="SCM._updateSettlementItem('${report.id}',${flatIdx},'qty',+this.value)"
                       style="width:52px;text-align:right;font-family:monospace;font-size:11px;
                              padding:2px 5px;border:1px solid var(--gray-200);border-radius:3px">`
                : `<span style="font-family:monospace">${item.qty || 1}</span>`;

            // 2D: Price/unit editable
            const rateCell = editable
                ? `<input type="number" min="0" step="1000" value="${item.rate || 0}"
                       onchange="SCM._updateSettlementItem('${report.id}',${flatIdx},'rate',+this.value)"
                       style="width:96px;text-align:right;font-family:monospace;font-size:11px;
                              padding:2px 5px;border:1px solid var(--gray-200);border-radius:3px">`
                : `<span style="font-family:monospace">${(item.rate || 0).toLocaleString()}</span>`;

            // 2E: Editable commission and discount fields
            const comCoCell = editable
                ? `<input type="number" min="0" max="100" step="0.1" value="${item.comCoPct || 0}"
                       onchange="SCM._updateSettlementItem('${report.id}',${flatIdx},'comCoPct',+this.value)"
                       style="width:60px;text-align:right;font-family:monospace;font-size:11px;
                              padding:2px 5px;border:1px solid var(--gray-200);border-radius:3px">`
                : `<span style="font-family:monospace">${item.comCoPct || 0}</span>`;
            const comCoUnitVal = item.amount ? (item.amount * (item.comCoPct || 0) / 100) : 0;
            const comCoUnitCell = editable
                ? `<input type="number" min="0" step="100" value="${item.comCoUnit || Math.round(comCoUnitVal)}"
                       onchange="SCM._updateSettlementItem('${report.id}',${flatIdx},'comCoUnit',+this.value)"
                       style="width:90px;text-align:right;font-family:monospace;font-size:11px;
                              padding:2px 5px;border:1px solid var(--gray-200);border-radius:3px">`
                : `<span style="font-family:monospace">${(item.comCoUnit || 0).toLocaleString()}</span>`;

            const comPersonCell = editable
                ? `<input type="number" min="0" max="100" step="0.1" value="${item.comPersonPct || 0}"
                       onchange="SCM._updateSettlementItem('${report.id}',${flatIdx},'comPersonPct',+this.value)"
                       style="width:70px;text-align:right;font-family:monospace;font-size:11px;
                              padding:2px 5px;border:1px solid var(--gray-200);border-radius:3px">`
                : `<span style="font-family:monospace">${item.comPersonPct || 0}</span>`;
            const comPersonUnitVal = item.amount ? (item.amount * (item.comPersonPct || 0) / 100) : 0;
            const comPersonUnitCell = editable
                ? `<input type="number" min="0" step="100" value="${item.comPersonUnit || Math.round(comPersonUnitVal)}"
                       onchange="SCM._updateSettlementItem('${report.id}',${flatIdx},'comPersonUnit',+this.value)"
                       style="width:100px;text-align:right;font-family:monospace;font-size:11px;
                              padding:2px 5px;border:1px solid var(--gray-200);border-radius:3px">`
                : `<span style="font-family:monospace">${(item.comPersonUnit || 0).toLocaleString()}</span>`;

            const discPctCell = editable
                ? `<input type="number" min="0" max="100" step="0.1" value="${item.discountPct || 0}"
                       onchange="SCM._updateSettlementItem('${report.id}',${flatIdx},'discountPct',+this.value)"
                       style="width:70px;text-align:right;font-family:monospace;font-size:11px;
                              padding:2px 5px;border:1px solid var(--gray-200);border-radius:3px">`
                : `<span style="font-family:monospace">${item.discountPct || 0}</span>`;
            // 2E: Discount/unit = amount * discountPct / 100 (per unit)
            const discUnitVal = item.rate ? (item.rate * (item.discountPct || 0) / 100) : 0;
            const discUnitCell = editable
                ? `<input type="number" min="0" step="100" value="${item.discountUnit || Math.round(discUnitVal)}"
                       onchange="SCM._updateSettlementItem('${report.id}',${flatIdx},'discountUnit',+this.value)"
                       style="width:90px;text-align:right;font-family:monospace;font-size:11px;
                              padding:2px 5px;border:1px solid var(--gray-200);border-radius:3px">`
                : `<span style="font-family:monospace">${(item.discountUnit || 0).toLocaleString()}</span>`;

            // 2D: Billing hr shows total billing duration
            const totalBillingMin = item.billingMin || 0;

            html += `
                <tr>
                    <td><button class="srd-toggle-btn" onclick="srdToggleStage(this,'${stageId}')">▼</button></td>
                    <td style="font-family:monospace;font-size:11px;font-weight:600">${s.bomItem?.id || '—'}</td>
                    <td style="font-weight:600">${s.vessel?.name || '—'}</td>
                    <td class="num">${qtyCell}</td>
                    <td>${s.bomItem?.unit || 'Trip'}</td>
                    <td style="font-family:monospace;font-size:11px;color:#8a94a6">${s.bomItem?.wbs || '—'}</td>
                    <td class="num">${fmtHr(item.actualMin)}</td>
                    <td class="num" style="font-weight:700;color:var(--primary)">${fmtHr(totalBillingMin)}</td>
                    <td>${statusBadge}</td>
                    <td style="font-family:monospace;font-size:11px">${startStr}</td>
                    <td style="font-family:monospace;font-size:11px">${endStr}</td>
                    <td class="num" style="font-weight:700;color:${item.amount > 0 ? '#065f46' : 'var(--gray-400)'}">
                        ${(item.amount || 0).toLocaleString()}
                    </td>
                    <td class="num">${rateCell}</td>
                    <td class="num">${comCoCell}</td>
                    <td class="num">${comCoUnitCell}</td>
                    <td class="num">${comPersonCell}</td>
                    <td class="num">${comPersonUnitCell}</td>
                    <td class="num">${discPctCell}</td>
                    <td class="num">${discUnitCell}</td>
                    <td style="font-size:11px;color:#8a94a6">${s.vessel?.name || ''} — ${s.tug?.name || ''}</td>
                </tr>
                <tr class="srd-stage-row" id="${stageId}">
                    <td colspan="21">
                        <div style="display:flex;align-items:center;gap:3px;flex-wrap:nowrap">
                            <span style="font-size:10px;color:#8a94a6;font-weight:600;margin-right:4px">Time Stages:</span>
                            ${chipHtml(s)}
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
                <div class="srd-order-total">
                    Order Total: ${groupTotal.toLocaleString()} (${rows.length} item${rows.length > 1 ? 's' : ''})
                </div>
            </div>
        </div>`;
    });

    html += `</div></div>`; // close srd-scroll-inner + srd-scroll-wrapper

    // 2E: Removed Grand Total row from footer
    html += `
        <div class="srd-footer">
            <span>${report.items.length} item(s) | ${groupOrder.length} tug schedule(s)</span>
        </div>
    `;

    // -- Sales Orders section (after SO created) --
    if (hasSO) {
        html += `
        <div class="card" style="margin-top:16px">
            <div style="padding:12px 20px;border-bottom:1px solid var(--gray-200)">
                <h3 style="font-size:14px;font-weight:600">Sales Orders</h3>
            </div>
            <div class="card-body">
                ${report.soIds.map(sid => {
                    const so = scmSalesOrders.find(x => x.id === sid);
                    if (!so) return '';
                    return `
                        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;
                                    border-bottom:1px solid var(--gray-100);flex-wrap:wrap">
                            <strong style="font-family:monospace;font-size:13px">${so.soNo}</strong>
                            <span style="font-size:12px;color:var(--gray-500)">TS: ${so.tugScheduleId}</span>
                            <span style="font-size:12px">${so.agentName}</span>
                            <span style="font-size:12px;color:var(--gray-400)">${so.items.length} item(s)</span>
                            <span style="font-family:monospace;font-size:13px;font-weight:600">
                                ${so.total.toLocaleString()} THB
                            </span>
                            ${SCM._settlementStatusBadge(so.status)}
                            <div class="btn-group" style="margin-left:auto;align-items:center">
                                ${so.status === 'posted'
                                    ? `<span style="font-size:12px;color:var(--success);font-weight:600">
                                           &#10003; Posted ${formatDateTime(so.postedAt)}
                                       </span>`
                                    : ''}
                                ${so.status === 'cancelled'
                                    ? `<span style="font-size:12px;color:var(--danger)">Cancelled</span>`
                                    : ''}
                                ${so.status !== 'cancelled'
                                    ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)"
                                           onclick="SCM.showCancelSOModal('${so.id}')">
                                           Cancel SO
                                       </button>`
                                    : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>`;
    }

    document.getElementById('scm-content').innerHTML = html;
};

// 2D/2E: Generic item field updater
SCM._updateSettlementItem = function(reportId, itemIdx, field, value) {
    const report = scmSettlementReports.find(r => r.id === reportId);
    if (!report || !report.items[itemIdx]) return;
    const item = report.items[itemIdx];
    item[field] = value;

    // Recalculate amount when qty or rate changes
    if (field === 'qty' || field === 'rate') {
        item.amount = (item.qty || 1) * (item.rate || 0);
    }
    // Recalculate commission/discount derived values
    if (field === 'comCoPct') {
        item.comCoUnit = Math.round((item.amount || 0) * value / 100);
    }
    if (field === 'comPersonPct') {
        item.comPersonUnit = Math.round((item.amount || 0) * value / 100);
    }
    if (field === 'discountPct') {
        item.discountUnit = Math.round((item.rate || 0) * value / 100);
    }
};

// Legacy compatibility
SCM.updateSettlementRate = function(reportId, itemIdx, rate) {
    SCM._updateSettlementItem(reportId, itemIdx, 'rate', rate);
};

// 2F: Remove tug schedule from report
SCM._removeTugScheduleFromReport = function(reportId, tsId) {
    const report = scmSettlementReports.find(r => r.id === reportId);
    if (!report) return;

    // Check if any SO already exists for this tug schedule in this report
    const tsHasSO = report.soIds.some(sid => {
        const so = scmSalesOrders.find(x => x.id === sid);
        return so && so.tugScheduleId === tsId;
    });
    if (tsHasSO) {
        showToast('Cannot remove: SO already exists for this tug schedule', 'error');
        return;
    }

    // Remove items belonging to this tug schedule
    report.items = report.items.filter(item => item.tugScheduleId !== tsId);
    // Remove from tugScheduleIds
    report.tugScheduleIds = (report.tugScheduleIds || []).filter(id => id !== tsId);

    // Reset tug schedule settlementStatus
    const ts = scmTugSchedules.find(x => x.id === tsId);
    if (ts) delete ts.settlementStatus;

    // If no items left, remove the report entirely
    if (report.items.length === 0) {
        const idx = scmSettlementReports.indexOf(report);
        if (idx >= 0) scmSettlementReports.splice(idx, 1);
        showToast('Report removed (no items left)', 'success');
        SCM._settlementTab = 'reports';
        SCM.renderSettlement();
        return;
    }

    showToast(`Tug schedule ${tsId} removed from report`, 'success');
    SCM.showSettlementReportDetail(reportId);
};

// ── Create Sales Order (2F: error handling, retry, per-tug-schedule) ─────────

SCM.createSalesOrder = function(reportId) {
    const report = scmSettlementReports.find(r => r.id === reportId);
    if (!report) return;

    // Group items by tugScheduleId -> 1 SO per tug schedule
    const groups = {};
    report.items.forEach(item => {
        const tsId = item.tugScheduleId;
        const ts = scmTugSchedules.find(x => x.id === tsId);
        const s = scmShipments.find(x => x.id === item.shipmentId);
        if (!ts || !s) return;
        if (!groups[tsId]) {
            groups[tsId] = { tugScheduleId: tsId, agent: ts.agent, items: [] };
        }
        groups[tsId].items.push({ item, shipment: s, tugSchedule: ts });
    });

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    let soIdx = scmSalesOrders.length;

    const newSOs = [];
    const errors = [];

    Object.values(groups).forEach((group, i) => {
        // 2F: Skip tug schedules that already have an SO in this report
        const existingSO = report.soIds.some(sid => {
            const so = scmSalesOrders.find(x => x.id === sid);
            return so && so.tugScheduleId === group.tugScheduleId;
        });
        if (existingSO) return;

        try {
            soIdx++;
            const soNo = `TUG-SO-${report.site}.${yy}.${String(soIdx).padStart(3, '0')}`;

            // 2F: Simulated error handling (random ~10% failure)
            if (Math.random() < 0.1) {
                throw new Error(`SAP connection timeout for tug schedule ${group.tugScheduleId}`);
            }

            const tsObj = scmTugSchedules.find(x => x.id === group.tugScheduleId);
            const so = {
                id: `so-${Date.now()}-${i}`,
                soNo,
                reportId:       report.id,
                reportNo:       report.reportNo,
                tugScheduleId:  group.tugScheduleId,
                agentId:        group.agent.id,
                agentName:      group.agent.name,
                orderId:        group.tugScheduleId,
                _vesselName:    tsObj?.vessel?.name || '',
                status:         'posted',
                createdAt:      now.toISOString().slice(0, 16),
                postedAt:       now.toISOString().slice(0, 16),
                items: group.items.map(({ item, shipment: s }) => ({
                    shipmentId: s.id,
                    tugScheduleId: group.tugScheduleId,
                    vesselName: s.vessel.name,
                    tugName:    s.tug.name,
                    bomDesc:    s.bomItem.desc,
                    wbs:        s.bomItem.wbs,
                    billingMin: item.billingMin,
                    qty:        item.qty,
                    rate:       item.rate,
                    amount:     item.amount,
                })),
                total: group.items.reduce((sum, { item }) => sum + (item.amount || 0), 0),
            };

            newSOs.push(so);
        } catch (err) {
            // 2F: Log error with tug schedule ID
            console.error(`[Settlement] SO creation failed for TS ${group.tugScheduleId}:`, err.message);
            errors.push({ tugScheduleId: group.tugScheduleId, error: err.message });
        }
    });

    if (newSOs.length > 0) {
        scmSalesOrders.push(...newSOs);
        report.soIds.push(...newSOs.map(so => so.id));

        // Update report status
        const allTSHaveSO = Object.keys(groups).every(tsId =>
            report.soIds.concat(newSOs.map(s => s.id)).some(sid => {
                const so = scmSalesOrders.find(x => x.id === sid) || newSOs.find(x => x.id === sid);
                return so && so.tugScheduleId === tsId && so.status === 'posted';
            })
        );
        report.status = allTSHaveSO ? 'posted' : 'pending_so';

        // Stamp SO number back onto each shipment
        newSOs.forEach(so => {
            so.items.forEach(item => {
                const s = scmShipments.find(x => x.id === item.shipmentId);
                if (s) s.soNo = so.soNo;
            });
        });
    }

    if (errors.length > 0) {
        showToast(`${newSOs.length} SO(s) created, ${errors.length} failed. Retry to process remaining.`, 'error');
    } else if (newSOs.length > 0) {
        showToast(t('salesOrderCreated', { count: newSOs.length }), 'success');
    } else {
        showToast('All tug schedules already have SOs', 'info');
    }

    SCM.showSettlementReportDetail(reportId);
};

// ── Sales Orders Tab (Phase 4: filters, updated columns, cancel SO) ──────────

SCM._soFilters = { from: '', to: '', search: '' };

SCM._renderSettlementSOs = function() {
    const sos = scmSalesOrders;

    // Phase 4A: Initialize default date range if not set
    if (!SCM._soFilters._init) {
        const now = new Date();
        const d1 = new Date(now); d1.setDate(now.getDate() - 30);
        SCM._soFilters.from = d1.toISOString().slice(0, 10);
        SCM._soFilters.to   = now.toISOString().slice(0, 10);
        SCM._soFilters._init = true;
    }
    const f = SCM._soFilters;

    // Phase 4A: Apply filters
    let filtered = sos;
    if (f.from) filtered = filtered.filter(so => (so.createdAt || '').slice(0, 10) >= f.from);
    if (f.to)   filtered = filtered.filter(so => (so.createdAt || '').slice(0, 10) <= f.to);
    if (f.search) {
        const q = f.search.toLowerCase();
        filtered = filtered.filter(so =>
            (so.soNo || '').toLowerCase().includes(q) ||
            (so.reportNo || '').toLowerCase().includes(q) ||
            (so.tugScheduleId || so.orderId || '').toLowerCase().includes(q) ||
            (so.agentName || '').toLowerCase().includes(q) ||
            (so._vesselName || '').toLowerCase().includes(q)
        );
    }

    // Phase 4B: Resolve tug schedule data for each SO for extra columns
    const soRows = filtered.map(so => {
        const tsId = so.tugScheduleId || so.orderId;
        const ts = scmTugSchedules.find(x => x.id === tsId);
        return {
            so,
            ts,
            vesselName: ts?.vessel?.name || so._vesselName || '—',
            portName:   ts?.port?.name || '—',
            activity:   ts?.activity?.name || '—',
            site:       ts?.site || '—',
            workDate:   ts?.workDate || '',
        };
    });

    return `
        <div class="card">
            <!-- Phase 4A: SO list filters -->
            <div style="display:flex;gap:10px;padding:10px 20px;border-bottom:1px solid var(--gray-100);flex-wrap:wrap;align-items:flex-end">
                <div class="form-group" style="margin:0">
                    <label style="font-size:11px">${t('createdFrom')}</label>
                    <input type="date" value="${f.from}" style="font-size:12px;padding:4px 6px"
                        onchange="SCM._soFilters.from=this.value;SCM.renderSettlement()">
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:11px">${t('createdTo')}</label>
                    <input type="date" value="${f.to}" style="font-size:12px;padding:4px 6px"
                        onchange="SCM._soFilters.to=this.value;SCM.renderSettlement()">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:180px">
                    <label style="font-size:11px">Search</label>
                    <input type="text" placeholder="SO number, report, agent, vessel..."
                        value="${f.search}" style="font-size:12px;padding:4px 6px"
                        oninput="SCM._soFilters.search=this.value;SCM.renderSettlement()">
                </div>
                <span style="font-size:12px;color:var(--gray-500);padding-bottom:6px">
                    <strong>${filtered.length}</strong> / ${sos.length} SO(s)
                </span>
            </div>
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th style="width:50px">${t('actions')}</th>
                        <th>SO Number</th>
                        <th>Report No.</th>
                        <th>Tug Schedule ID</th>
                        <th>Agent</th>
                        <th>${t('vessel')}</th>
                        <th>${t('port')}</th>
                        <th>${t('activityOperation')}</th>
                        <th>${t('site')}</th>
                        <th>${t('workDate')}</th>
                        <th>${t('createdDate')}</th>
                        <th>Status</th>
                    </tr></thead>
                    <tbody>
                        ${soRows.length === 0
                            ? `<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--gray-400)">
                                    ${t('noSalesOrders')}
                                </td></tr>`
                            : soRows.map(({ so, ts, vesselName, portName, activity, site, workDate }) => `
                                <tr class="clickable" style="${so.status === 'cancelled' ? 'opacity:0.6;' : ''}"
                                    onclick="SCM.viewSOInReport('${so.id}')">
                                    <td onclick="event.stopPropagation()">
                                        <div class="action-menu">
                                            <button class="action-dots" onclick="toggleActionMenu(this,event)"></button>
                                            <div class="action-dropdown">
                                                <div class="action-dropdown-item" onclick="SCM.viewSOInReport('${so.id}')">View in Report</div>
                                                ${so.status !== 'cancelled' ? `<div class="action-dropdown-item danger" onclick="SCM.showCancelSOModal('${so.id}')">${t('cancelSO')}</div>` : ''}
                                            </div>
                                        </div>
                                    </td>
                                    <td><strong style="font-family:monospace">${so.soNo}</strong></td>
                                    <td>${so.reportNo}</td>
                                    <td style="font-family:monospace;font-size:12px">${so.tugScheduleId || so.orderId}</td>
                                    <td>${so.agentName}</td>
                                    <td>${vesselName}</td>
                                    <td>${portName}</td>
                                    <td>${activity}</td>
                                    <td><span class="site-badge">${site}</span></td>
                                    <td style="font-family:monospace;font-size:11px">${workDate ? workDate.slice(0, 10) : '—'}</td>
                                    <td style="font-family:monospace;font-size:11px">${formatDateTime(so.createdAt)}</td>
                                    <td>${SCM._settlementStatusBadge(so.status)}</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

// Navigate to report detail filtered by specific SO
SCM.viewSOInReport = function(soId) {
    const so = scmSalesOrders.find(x => x.id === soId);
    if (!so) return;
    SCM._settlementTab = 'reports';
    SCM._soFilterInReport = so.soNo;
    SCM.showSettlementReportDetail(so.reportId);
};

// Phase 4C: Toggle kebab menu
SCM._toggleSOMenu = function(soId) {
    // Close all other menus first
    document.querySelectorAll('.so-kebab-menu').forEach(el => {
        if (el.id !== `so-menu-${soId}`) el.style.display = 'none';
    });
    const menu = document.getElementById(`so-menu-${soId}`);
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
};

// Phase 4C: Close kebab menus on outside click
document.addEventListener('click', function(e) {
    if (!e.target.closest('.so-kebab-menu') && !e.target.closest('[onclick*="_toggleSOMenu"]')) {
        document.querySelectorAll('.so-kebab-menu').forEach(el => el.style.display = 'none');
    }
});

// Phase 4C: Show cancel SO modal
SCM.showCancelSOModal = function(soId) {
    const so = scmSalesOrders.find(x => x.id === soId);
    if (!so) return;

    if (so.status === 'cancelled') {
        showToast(t('soAlreadyCancelled'), 'error');
        return;
    }

    openModal(`
        <div class="modal-header">
            <h2>${t('cancelSOTitle')}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div style="margin-bottom:16px;padding:12px;background:#fef2f2;border-radius:6px;border:1px solid #fecaca">
                <div style="font-size:13px;font-weight:600;color:#dc2626;margin-bottom:4px">
                    ${t('cancelSOConfirm')}
                </div>
                <div style="font-size:12px;color:var(--gray-600)">
                    SO: <strong style="font-family:monospace">${so.soNo}</strong>
                    &bull; Agent: ${so.agentName}
                    &bull; Tug Schedule: ${so.tugScheduleId || so.orderId}
                </div>
            </div>
            <div class="form-group">
                <label>${t('cancelReason')} <span style="color:var(--danger)">*</span></label>
                <textarea id="cancel-so-reason" rows="3"
                    placeholder="${t('cancelReasonPlaceholder')}"
                    style="width:100%;resize:vertical;font-size:13px"></textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
            <button class="btn" style="background:var(--danger);color:white;border:none"
                onclick="SCM.confirmCancelSO('${so.id}')">
                ${t('cancelSO')}
            </button>
        </div>
    `);
};

// Phase 4C: Confirm cancel SO
SCM.confirmCancelSO = function(soId) {
    const reason = (document.getElementById('cancel-so-reason')?.value || '').trim();
    if (!reason) {
        showToast(t('cancelReasonRequired'), 'error');
        return;
    }

    const so = scmSalesOrders.find(x => x.id === soId);
    if (!so) return;

    // 1. Set SO status to cancelled, store reason and timestamp
    so.status = 'cancelled';
    so.cancelReason = reason;
    so.cancelledAt = new Date().toISOString().slice(0, 16);

    // 2. Update the related settlement report - mark tug schedule items as available
    const report = scmSettlementReports.find(r => r.id === so.reportId);
    if (report) {
        // Remove this SO from the report's soIds
        report.soIds = report.soIds.filter(sid => sid !== soId);

        // If no SOs left, revert report status to draft
        if (report.soIds.length === 0) {
            report.status = 'pending_so';
        } else {
            // Check if remaining SOs are all posted
            const allPosted = report.soIds.every(sid => {
                const s = scmSalesOrders.find(x => x.id === sid);
                return s && s.status === 'posted';
            });
            report.status = allPosted ? 'posted' : 'pending_so';
        }
    }

    // 3. Reset tug schedule settlementStatus so it appears back in "awaiting" tab
    const tsId = so.tugScheduleId || so.orderId;
    const ts = scmTugSchedules.find(x => x.id === tsId);
    if (ts) {
        // Only reset if no other active (non-cancelled) SO references this tug schedule
        const hasOtherActiveSO = scmSalesOrders.some(s =>
            s.id !== soId &&
            (s.tugScheduleId === tsId || s.orderId === tsId) &&
            s.status !== 'cancelled'
        );
        if (!hasOtherActiveSO) {
            delete ts.settlementStatus;
        }
    }

    // 4. Clear soNo from shipments that were part of this SO
    if (so.items) {
        so.items.forEach(item => {
            const s = scmShipments.find(x => x.id === item.shipmentId);
            if (s && s.soNo === so.soNo) {
                delete s.soNo;
                delete s.settlementStatus;
            }
        });
    }

    closeModal();
    showToast(t('soCancelled', { id: so.soNo }), 'success');
    // Re-render: if on report detail, stay there; otherwise go to SO list
    if (report && document.querySelector('.detail-title')?.textContent?.includes('MSST')) {
        SCM.showSettlementReportDetail(report.id);
    } else {
        SCM._settlementTab = 'salesorders';
        SCM.renderSettlement();
    }
};

// ── SO Detail Modal ───────────────────────────────────────────────────────────

SCM.showSODetail = function(soId) {
    const so = scmSalesOrders.find(x => x.id === soId);
    if (!so) return;

    openModal(`
        <div class="modal-header">
            <h2 style="font-family:monospace">${so.soNo}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="info-grid" style="margin-bottom:20px">
                <div class="info-item"><label>Report</label><div class="value">${so.reportNo}</div></div>
                <div class="info-item"><label>Tug Schedule</label>
                    <div class="value" style="font-family:monospace">${so.tugScheduleId || so.orderId}</div></div>
                <div class="info-item"><label>Agent</label><div class="value">${so.agentName}</div></div>
                <div class="info-item"><label>Created</label><div class="value">${formatDateTime(so.createdAt)}</div></div>
                <div class="info-item"><label>Status</label>
                    <div class="value">${SCM._settlementStatusBadge(so.status)}</div></div>
                <div class="info-item"><label>Total Amount</label>
                    <div class="value" style="font-family:monospace;font-size:16px;font-weight:700;color:var(--primary)">
                        ${so.total.toLocaleString()} THB
                    </div>
                </div>
            </div>

            <table>
                <thead><tr>
                    <th>Shipment</th>
                    <th>Vessel</th>
                    <th>Tug</th>
                    <th>BOM Item</th>
                    <th>WBS</th>
                    <th class="num">Qty</th>
                    <th style="text-align:center">${t('billingHrs')}</th>
                    <th style="text-align:right">${t('rate')}</th>
                    <th style="text-align:right">${t('amount')}</th>
                </tr></thead>
                <tbody>
                    ${so.items.map(item => `
                        <tr>
                            <td><strong>${item.shipmentId}</strong></td>
                            <td>${item.vesselName}</td>
                            <td>${item.tugName}</td>
                            <td>${item.bomDesc}</td>
                            <td style="font-family:monospace;font-size:11px">${item.wbs || '—'}</td>
                            <td class="num">${item.qty || 1}</td>
                            <td style="text-align:center;font-family:monospace;font-weight:600;color:var(--primary)">
                                ${SCM._fmtMin(item.billingMin)}
                            </td>
                            <td style="text-align:right;font-family:monospace">
                                ${(item.rate || 0).toLocaleString()}
                            </td>
                            <td style="text-align:right;font-family:monospace;font-weight:600">
                                ${(item.amount || 0).toLocaleString()}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background:var(--gray-50);font-weight:700">
                        <td colspan="8" style="text-align:right;padding:8px 12px">Total</td>
                        <td style="text-align:right;font-family:monospace">
                            ${so.total.toLocaleString()} THB
                        </td>
                    </tr>
                </tfoot>
            </table>

            ${so.status === 'posted' ? `
                <div style="margin-top:12px;padding:8px 12px;background:var(--success-light);
                            border-radius:6px;font-size:12px;color:var(--success);font-weight:600">
                    &#10003; Posted to SAP on ${formatDateTime(so.postedAt)}
                </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            ${so.status === 'pending'
                ? `<button class="btn btn-primary"
                       onclick="SCM.postToSAP('${so.id}');closeModal()">
                       ${t('postToSAP')}
                   </button>`
                : ''}
            <button class="btn btn-outline" onclick="closeModal()">${t('close')}</button>
        </div>
    `);
};

// ── Settlement Report Detail: toggle helpers (global) ─────────────────────────

window.srdToggleOrder = function(btn, blockId) {
    const section = document.getElementById(blockId);
    if (!section) return;
    const isOpen = !section.classList.contains('collapsed');
    section.classList.toggle('collapsed', isOpen);
    btn.classList.toggle('collapsed', isOpen);
};

window.srdToggleStage = function(btn, stageId) {
    const row = document.getElementById(stageId);
    if (!row) return;
    const isOpen = row.classList.contains('open');
    row.classList.toggle('open', !isOpen);
    btn.classList.toggle('collapsed', !isOpen);
};

// ── Post to SAP ───────────────────────────────────────────────────────────────

SCM.postToSAP = function(soId) {
    const so = scmSalesOrders.find(x => x.id === soId);
    if (!so || so.status === 'posted' || so.status === 'cancelled') return;

    so.status   = 'posted';
    so.postedAt = new Date().toISOString().slice(0, 16);

    // Mark each shipment as settled
    so.items.forEach(item => {
        const s = scmShipments.find(x => x.id === item.shipmentId);
        if (s) s.settlementStatus = 'settled';
    });

    // If all SOs in this report are posted, mark report as so_posted
    const report = scmSettlementReports.find(r => r.id === so.reportId);
    if (report) {
        const allPosted = report.soIds.every(sid => {
            const s = scmSalesOrders.find(x => x.id === sid);
            return s && s.status === 'posted';
        });
        if (allPosted) report.status = 'posted';
    }

    showToast(t('postedToSAP', { id: so.soNo }), 'success');
    SCM._settlementTab = 'salesorders';
    SCM.renderSettlement();
};
