// ========== SCM SETTLEMENT MODULE ==========
// Attached to SCM object (loaded after scm.js)

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
        pending_so:  `<span class="badge badge-open"      style="font-size:11px">Pending SO</span>`,
        pending_sap: `<span class="badge badge-dispatch"  style="font-size:11px">Pending SAP</span>`,
        so_posted:   `<span class="badge badge-completed" style="font-size:11px">SO Posted</span>`,
        pending:     `<span class="badge badge-dispatch"  style="font-size:11px">Pending</span>`,
        posted:      `<span class="badge badge-completed" style="font-size:11px">Posted to SAP</span>`,
    };
    return map[status] || `<span class="badge badge-open" style="font-size:11px">${status}</span>`;
};

SCM._getAwaitingShipments = function() {
    return scmShipments.filter(s => s.status === 'closed' && !s.settlementStatus);
};

// ── Main View ─────────────────────────────────────────────────────────────────

SCM.renderSettlement = function() {
    const awaiting = SCM._getAwaitingShipments();
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

// ── Awaiting Tab ──────────────────────────────────────────────────────────────

SCM._renderSettlementAwaiting = function(awaiting) {
    return `
        <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:12px 20px;border-bottom:1px solid var(--gray-200)">
                <span style="font-size:13px;color:var(--gray-500)">
                    <strong>${awaiting.length}</strong> closed shipment(s) pending settlement
                </span>
                ${awaiting.length > 0
                    ? `<button class="btn btn-primary" onclick="SCM.showCreateReportModal()">
                           + ${t('createSettlementReport')}
                       </button>`
                    : ''}
            </div>
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>Shipment ID</th>
                        <th>Order</th>
                        <th>Agent</th>
                        <th>Vessel</th>
                        <th style="text-align:right">GRT</th>
                        <th>Port</th>
                        <th>Site</th>
                        <th>Activity</th>
                        <th>Tug</th>
                        <th>BOM Item</th>
                        <th>WBS</th>
                        <th style="text-align:center">${t('actualHrs')}</th>
                        <th style="text-align:center">${t('billingHrs')}</th>
                    </tr></thead>
                    <tbody>
                        ${awaiting.length === 0
                            ? `<tr><td colspan="13" style="text-align:center;padding:40px;color:var(--gray-400)">${t('noAwaitingSettlement')}</td></tr>`
                            : awaiting.map(s => `
                                <tr>
                                    <td><strong>${s.id}</strong></td>
                                    <td>${s.orderId}</td>
                                    <td>${s.agent.name}</td>
                                    <td>${s.vessel.name}</td>
                                    <td style="text-align:right">${s.vessel.grt.toLocaleString()}</td>
                                    <td>${s.port.name}</td>
                                    <td><span class="site-badge">${s.site}</span></td>
                                    <td>${s.activity.name}</td>
                                    <td>${s.tug.name}</td>
                                    <td>${s.bomItem.desc}</td>
                                    <td style="font-family:monospace;font-size:11px">${s.bomItem.wbs || '—'}</td>
                                    <td style="text-align:center;font-family:monospace;color:var(--gray-500)">
                                        ${SCM._fmtMin(SCM._shipmentActualMin(s))}
                                    </td>
                                    <td style="text-align:center;font-family:monospace;font-weight:700;color:var(--primary)">
                                        ${SCM._fmtMin(SCM._shipmentBillingMin(s))}
                                    </td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

// ── Create Report Modal ───────────────────────────────────────────────────────

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
        return `<div style="text-align:center;padding:30px;color:var(--gray-400)">No shipments match</div>`;
    }
    return `
        <table>
            <thead><tr>
                <th style="width:36px">
                    <input type="checkbox" id="sr-check-all"
                        onchange="SCM._srToggleAll(this.checked)">
                </th>
                <th>Shipment ID</th>
                <th>Order</th>
                <th>Agent</th>
                <th>Vessel</th>
                <th>Port</th>
                <th>Site</th>
                <th>Work Date</th>
                <th style="text-align:center">${t('billingHrs')}</th>
            </tr></thead>
            <tbody>
                ${rows.map(s => `
                    <tr>
                        <td>
                            <input type="checkbox" class="sr-item" data-id="${s.id}"
                                onchange="SCM._srUpdateCount()">
                        </td>
                        <td><strong>${s.id}</strong></td>
                        <td>${s.orderId}</td>
                        <td>${s.agent.name}</td>
                        <td>${s.vessel.name}</td>
                        <td>${s.port.name}</td>
                        <td><span class="site-badge">${s.site}</span></td>
                        <td>${formatDateTime(s.workDate)}</td>
                        <td style="text-align:center;font-family:monospace;font-weight:700;color:var(--primary)">
                            ${SCM._fmtMin(SCM._shipmentBillingMin(s))}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

SCM._filterSettlementModal = function() {
    const site = document.getElementById('sr-site')?.value;
    const from = document.getElementById('sr-from')?.value;
    const to   = document.getElementById('sr-to')?.value;

    let rows = SCM._getAwaitingShipments();
    if (site) rows = rows.filter(s => s.site === site);
    if (from) rows = rows.filter(s => s.workDate.slice(0, 10) >= from);
    if (to)   rows = rows.filter(s => s.workDate.slice(0, 10) <= to);

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
    if (el) el.textContent = `${n} shipment(s) selected`;
};

SCM.createSettlementReport = function() {
    const selected = Array.from(document.querySelectorAll('.sr-item:checked'))
        .map(cb => cb.dataset.id);
    if (selected.length === 0) {
        showToast('Select at least one shipment', 'error');
        return;
    }

    const first = scmShipments.find(s => s.id === selected[0]);
    const site  = first?.site || 'BKK';
    const now   = new Date();
    const yy    = String(now.getFullYear()).slice(-2);
    const idx   = scmSettlementReports.length + 1;
    const reportNo = `SR.${site}.${yy}.${String(idx).padStart(3, '0')}`;

    const report = {
        id: `sr-${Date.now()}`,
        reportNo,
        site,
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        createdAt: now.toISOString().slice(0, 16),
        status: 'pending_so',
        items: selected.map(sid => {
            const s = scmShipments.find(x => x.id === sid);
            return {
                shipmentId: sid,
                billingMin: SCM._shipmentBillingMin(s),
                actualMin:  SCM._shipmentActualMin(s),
                rate:   0,
                amount: 0,
            };
        }),
        soIds: [],
    };

    scmSettlementReports.push(report);
    selected.forEach(sid => {
        const s = scmShipments.find(x => x.id === sid);
        if (s) s.settlementStatus = 'in_report';
    });

    closeModal();
    showToast(t('settlementReportCreated', { id: reportNo }), 'success');
    SCM._settlementTab = 'reports';
    SCM.renderSettlement();
};

// ── Reports Tab ───────────────────────────────────────────────────────────────

SCM._renderSettlementReports = function() {
    const reports = scmSettlementReports;
    return `
        <div class="card">
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>Report No.</th>
                        <th>Site</th>
                        <th>Period</th>
                        <th>Created</th>
                        <th style="text-align:center"># Shipments</th>
                        <th style="text-align:center">Total ${t('billingHrs')}</th>
                        <th>Status</th>
                        <th>SO Numbers</th>
                        <th>${t('actions')}</th>
                    </tr></thead>
                    <tbody>
                        ${reports.length === 0
                            ? `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--gray-400)">
                                    ${t('noSettlementReports')}
                                </td></tr>`
                            : reports.map(r => {
                                const totalMin = r.items.reduce((s, it) => s + (it.billingMin || 0), 0);
                                const soNums = r.soIds.map(sid => {
                                    const so = scmSalesOrders.find(x => x.id === sid);
                                    return so ? so.soNo : sid;
                                }).join(', ');
                                return `
                                    <tr>
                                        <td><strong>${r.reportNo}</strong></td>
                                        <td><span class="site-badge">${r.site}</span></td>
                                        <td>${r.period}</td>
                                        <td>${formatDateTime(r.createdAt)}</td>
                                        <td style="text-align:center">${r.items.length}</td>
                                        <td style="text-align:center;font-family:monospace;font-weight:700;color:var(--primary)">
                                            ${SCM._fmtMin(totalMin)}
                                        </td>
                                        <td>${SCM._settlementStatusBadge(r.status)}</td>
                                        <td style="font-family:monospace;font-size:11px">${soNums || '—'}</td>
                                        <td>
                                            <button class="btn btn-outline btn-sm"
                                                onclick="SCM.showSettlementReportDetail('${r.id}')">
                                                ${t('view')}
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

// ── Report Detail ─────────────────────────────────────────────────────────────

SCM.showSettlementReportDetail = function(id) {
    const report = scmSettlementReports.find(r => r.id === id);
    if (!report) return;

    const hasSO    = report.soIds.length > 0;
    const grandTotal = report.items.reduce((s, it) => s + (it.amount || 0), 0);

    // Helper: minutes → decimal hours string
    const fmtHr = min => min ? (min / 60).toFixed(2) : '—';

    // Helper: billing stage name → ts-chip type class
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

    // Group items by orderId (preserving insert order)
    const groups = {};
    const groupOrder = [];
    report.items.forEach(item => {
        const s = scmShipments.find(x => x.id === item.shipmentId);
        if (!s) return;
        if (!groups[s.orderId]) { groups[s.orderId] = []; groupOrder.push(s.orderId); }
        groups[s.orderId].push({ item, s });
    });

    // ── Page header ──
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
                </div>
            </div>
            <div class="btn-group">
                ${SCM._settlementStatusBadge(report.status)}
                ${!hasSO
                    ? `<button class="btn btn-primary"
                           onclick="SCM.createSalesOrder('${report.id}')">
                           ${t('createSalesOrder')}
                       </button>`
                    : ''}
            </div>
        </div>

        <!-- SO Grouping info bar -->
        <div style="display:flex;gap:16px;align-items:center;padding:7px 14px;
                    background:var(--primary-light);border-radius:var(--radius);
                    margin-bottom:14px;flex-wrap:wrap;font-size:12px">
            <span style="color:var(--primary);font-weight:600">SO Grouping:</span>
            <span style="color:var(--gray-700)">1 SO per Tug Schedule (Order ID)</span>
            ${hasSO ? `<span style="color:var(--success);font-weight:600">&#10003; ${report.soIds.length} SO(s) created</span>` : ''}
            ${!hasSO ? `<span style="color:var(--gray-500)">Enter rate per item, then create SO</span>` : ''}
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
                    <div>Order ID</div>
                    <div>Item</div>
                    <div>Mat.no.</div>
                    <div>Mat.Description</div>
                    <div class="num">GRT</div>
                    <div class="num">LOA (m)</div>
                    <div class="num">Draft</div>
                    <div>Date</div>
                    <div>Time</div>
                    <div>Activity</div>
                    <div>Port</div>
                    <div>Sales No.</div>
                </div>
            </div>
        </div>
    `;

    // ── Order blocks ──
    groupOrder.forEach((orderId, oi) => {
        const rows  = groups[orderId];
        const first = rows[0].s;
        const groupTotal = rows.reduce((sum, { item }) => sum + (item.amount || 0), 0);
        const salesNo = first.soNo || '—';
        const date = (first.workDate || '').slice(0, 10);
        const time = (first.workDate || '').slice(11, 16);
        const blockId = `srd-items-${oi}`;

        html += `
        <div class="srd-order-block" style="animation-delay:${oi * 0.07}s;border-radius:${oi === 0 ? '0 0 6px 6px' : '6px'}">
            <div class="srd-order-header">
                <button class="srd-toggle-btn" onclick="srdToggleOrder(this,'${blockId}')">▼</button>
                <div class="srd-order-cols" style="font-size:12px;font-weight:500">
                    <div style="font-weight:700">${oi + 1}</div>
                    <div style="font-family:monospace;font-size:11px;font-weight:700">${orderId}</div>
                    <div style="font-family:monospace;color:#8a94a6">10</div>
                    <div style="font-family:monospace;font-size:11px">${first.bomItem?.id || '—'}</div>
                    <div style="font-weight:700">${first.bomItem?.desc || '—'}</div>
                    <div class="num">${first.vessel?.grt?.toLocaleString() || '—'}</div>
                    <div class="num">${first.vessel?.loa || '—'}</div>
                    <div class="num">—</div>
                    <div style="font-family:monospace;font-size:11px">${date}</div>
                    <div style="font-family:monospace">${time}</div>
                    <div style="color:var(--primary);font-weight:500">${first.activity?.name || '—'}</div>
                    <div>${first.port?.name || '—'}</div>
                    <div style="font-family:monospace;font-size:11px;color:#8a94a6">${salesNo}</div>
                </div>
            </div>
            <div class="srd-items-section" id="${blockId}">
                <div class="srd-item-scroll">
                    <table class="srd-item-table">
                        <thead><tr>
                            <th style="width:28px"></th>
                            <th style="width:50px">Item</th>
                            <th style="width:130px">Mat.no.</th>
                            <th style="width:210px">Mat.Description</th>
                            <th class="num" style="width:50px">Qty</th>
                            <th style="width:52px">UOM</th>
                            <th style="width:150px">WBS no.</th>
                            <th class="num" style="width:82px">Actual Hr</th>
                            <th class="num" style="width:82px">Billing Hr</th>
                            <th style="width:72px">Status</th>
                            <th style="width:132px">Start</th>
                            <th style="width:132px">End</th>
                            <th class="num" style="width:118px">Amount (฿)</th>
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
            const masterPrice = PRICE_MASTER[s.bomItem?.id] || 0;
            const effectiveRate = item.rate || masterPrice;
            const rateCell = !hasSO
                ? `<input type="number" min="0" step="1000" value="${effectiveRate}"
                       onchange="SCM.updateSettlementRate('${report.id}',${flatIdx},+this.value)"
                       style="width:96px;text-align:right;font-family:monospace;font-size:11px;
                              padding:2px 5px;border:1px solid var(--gray-200);border-radius:3px">`
                : `<span style="font-family:monospace">${effectiveRate.toLocaleString()}</span>`;

            html += `
                <tr>
                    <td><button class="srd-toggle-btn" onclick="srdToggleStage(this,'${stageId}')">▼</button></td>
                    <td style="font-family:monospace;color:#8a94a6">${itemNo}</td>
                    <td style="font-family:monospace;font-size:11px;font-weight:600">${s.bomItem?.id || '—'}</td>
                    <td style="font-weight:600">${s.bomItem?.desc || '—'}</td>
                    <td class="num">1</td>
                    <td>${s.bomItem?.unit || 'Trip'}</td>
                    <td style="font-family:monospace;font-size:11px;color:#8a94a6">${s.bomItem?.wbs || '—'}</td>
                    <td class="num">${fmtHr(item.actualMin)}</td>
                    <td class="num" style="font-weight:700;color:var(--primary)">${fmtHr(item.billingMin)}</td>
                    <td>${statusBadge}</td>
                    <td style="font-family:monospace;font-size:11px">${startStr}</td>
                    <td style="font-family:monospace;font-size:11px">${endStr}</td>
                    <td class="num" style="font-weight:700;color:${item.amount > 0 ? '#065f46' : 'var(--gray-400)'}">
                        ฿${(item.amount || 0).toLocaleString()}
                    </td>
                    <td class="num">${rateCell}</td>
                    <td class="num">—</td>
                    <td class="num">—</td>
                    <td class="num">—</td>
                    <td class="num">—</td>
                    <td class="num">—</td>
                    <td class="num">—</td>
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
                    Order Total: ฿${groupTotal.toLocaleString()} (${rows.length} item${rows.length > 1 ? 's' : ''})
                </div>
            </div>
        </div>`;
    });

    html += `</div></div>`; // close srd-scroll-inner + srd-scroll-wrapper

    // ── Footer ──
    html += `
        <div class="srd-footer">
            <span>${report.items.length} shipment(s) | ${groupOrder.length} order(s)</span>
            <span>Grand Total: <span class="srd-footer-total">฿${grandTotal.toLocaleString()}</span></span>
        </div>
    `;

    // ── Sales Orders section (after SO created) ──
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
                            <span style="font-size:12px;color:var(--gray-500)">Order: ${so.orderId}</span>
                            <span style="font-size:12px">${so.agentName}</span>
                            <span style="font-size:12px;color:var(--gray-400)">${so.items.length} item(s)</span>
                            <span style="font-family:monospace;font-size:13px;font-weight:600">
                                ${so.total.toLocaleString()} THB
                            </span>
                            ${SCM._settlementStatusBadge(so.status)}
                            <div class="btn-group" style="margin-left:auto">
                                <button class="btn btn-outline btn-sm"
                                    onclick="SCM.showSODetail('${so.id}')">
                                    ${t('view')}
                                </button>
                                ${so.status === 'pending'
                                    ? `<button class="btn btn-primary btn-sm"
                                           onclick="SCM.postToSAP('${so.id}')">
                                           ${t('postToSAP')}
                                       </button>`
                                    : `<span style="font-size:12px;color:var(--success);font-weight:600">
                                           &#10003; Posted ${formatDateTime(so.postedAt)}
                                       </span>`}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>`;
    }

    document.getElementById('scm-content').innerHTML = html;
};

SCM.updateSettlementRate = function(reportId, itemIdx, rate) {
    const report = scmSettlementReports.find(r => r.id === reportId);
    if (!report || !report.items[itemIdx]) return;
    report.items[itemIdx].rate = rate;
    report.items[itemIdx].amount = rate; // unit = Trip × 1 trip
};

// ── Create Sales Order ────────────────────────────────────────────────────────

SCM.createSalesOrder = function(reportId) {
    const report = scmSettlementReports.find(r => r.id === reportId);
    if (!report || report.soIds.length > 0) return;

    // Group items by orderId (parent tug schedule) → 1 SO per order
    const groups = {};
    report.items.forEach(item => {
        const s = scmShipments.find(x => x.id === item.shipmentId);
        if (!s) return;
        if (!groups[s.orderId]) {
            groups[s.orderId] = { orderId: s.orderId, agent: s.agent, items: [] };
        }
        groups[s.orderId].items.push({ item, shipment: s });
    });

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    let soIdx = scmSalesOrders.length;

    const newSOs = Object.values(groups).map((group, i) => {
        soIdx++;
        const soNo = `TUG-SO-${report.site}.${yy}.${String(soIdx).padStart(3, '0')}`;
        return {
            id: `so-${Date.now()}-${i}`,
            soNo,
            reportId:   report.id,
            reportNo:   report.reportNo,
            agentId:    group.agent.id,
            agentName:  group.agent.name,
            orderId:    group.orderId,
            status:     'pending',
            createdAt:  now.toISOString().slice(0, 16),
            postedAt:   '',
            items: group.items.map(({ item, shipment: s }) => ({
                shipmentId: s.id,
                vesselName: s.vessel.name,
                tugName:    s.tug.name,
                bomDesc:    s.bomItem.desc,
                wbs:        s.bomItem.wbs,
                billingMin: item.billingMin,
                rate:       item.rate,
                amount:     item.amount,
            })),
            total: group.items.reduce((sum, { item }) => sum + (item.amount || 0), 0),
        };
    });

    scmSalesOrders.push(...newSOs);
    report.soIds.push(...newSOs.map(so => so.id));
    report.status = 'pending_sap';

    // Stamp SO number back onto each shipment
    newSOs.forEach(so => {
        so.items.forEach(item => {
            const s = scmShipments.find(x => x.id === item.shipmentId);
            if (s) s.soNo = so.soNo;
        });
    });

    showToast(t('salesOrderCreated', { count: newSOs.length }), 'success');
    SCM.showSettlementReportDetail(reportId);
};

// ── Sales Orders Tab ──────────────────────────────────────────────────────────

SCM._renderSettlementSOs = function() {
    const sos = scmSalesOrders;
    return `
        <div class="card">
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>SO Number</th>
                        <th>Report</th>
                        <th>Tug Schedule</th>
                        <th>Agent</th>
                        <th style="text-align:center">Items</th>
                        <th style="text-align:right">Total Amount</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th>${t('actions')}</th>
                    </tr></thead>
                    <tbody>
                        ${sos.length === 0
                            ? `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--gray-400)">
                                    ${t('noSalesOrders')}
                                </td></tr>`
                            : sos.map(so => `
                                <tr>
                                    <td><strong style="font-family:monospace">${so.soNo}</strong></td>
                                    <td>${so.reportNo}</td>
                                    <td style="font-family:monospace;font-size:12px">${so.orderId}</td>
                                    <td>${so.agentName}</td>
                                    <td style="text-align:center">${so.items.length}</td>
                                    <td style="text-align:right;font-family:monospace;font-weight:600">
                                        ${so.total.toLocaleString()} THB
                                    </td>
                                    <td>${formatDateTime(so.createdAt)}</td>
                                    <td>${SCM._settlementStatusBadge(so.status)}</td>
                                    <td style="white-space:nowrap">
                                        <button class="btn btn-outline btn-sm"
                                            onclick="SCM.showSODetail('${so.id}')">
                                            ${t('view')}
                                        </button>
                                        ${so.status === 'pending'
                                            ? `<button class="btn btn-primary btn-sm"
                                                   onclick="SCM.postToSAP('${so.id}')"
                                                   style="margin-left:4px">
                                                   ${t('postToSAP')}
                                               </button>`
                                            : ''}
                                    </td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
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
                    <div class="value" style="font-family:monospace">${so.orderId}</div></div>
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
                        <td colspan="7" style="text-align:right;padding:8px 12px">Total</td>
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

// ── Post to SAP ───────────────────────────────────────────────────────────────

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
    if (!so || so.status === 'posted') return;

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
        if (allPosted) report.status = 'so_posted';
    }

    showToast(t('postedToSAP', { id: so.soNo }), 'success');
    SCM._settlementTab = 'salesorders';
    SCM.renderSettlement();
};
