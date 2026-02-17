// ========== MASTER DATA ==========

const MASTERS = {
    customers: [
        { id: 'C001', name: 'Thai Maritime Co., Ltd.' },
        { id: 'C002', name: 'Bangkok Shipping Group' },
        { id: 'C003', name: 'Siam Ocean Transport' },
        { id: 'C004', name: 'Gulf Navigation Ltd.' },
        { id: 'C005', name: 'Eastern Seaboard Logistics' },
    ],
    // Master_T01 - Vessels
    vessels: [
        { id: 'V001', name: 'MV SIAM STAR', grt: 12500, loa: 145.2 },
        { id: 'V002', name: 'MV BANGKOK GLORY', grt: 8700, loa: 118.6 },
        { id: 'V003', name: 'MV THAI SPIRIT', grt: 15200, loa: 162.8 },
        { id: 'V004', name: 'MV GULF PIONEER', grt: 6300, loa: 98.4 },
        { id: 'V005', name: 'MV EASTERN WAVE', grt: 21000, loa: 185.0 },
    ],
    // Master_T02 - Ports
    ports: [
        { id: 'P001', name: 'Bangkok Port (Klong Toey)' },
        { id: 'P002', name: 'Laem Chabang Port' },
        { id: 'P003', name: 'Map Ta Phut Port' },
        { id: 'P004', name: 'Sriracha Harbour' },
        { id: 'P005', name: 'Ko Sichang Anchorage' },
    ],
    // Master_T03 - Services / Sales BOM
    services: [
        { id: 'SVC001', name: 'Harbour Towage - Inbound', items: [
            { id: 'BOM001', desc: 'Tug Assistance - Approach', unit: 'Trip' },
            { id: 'BOM002', desc: 'Tug Assistance - Berthing', unit: 'Trip' },
            { id: 'BOM003', desc: 'Standby Charge', unit: 'Hour' },
        ]},
        { id: 'SVC002', name: 'Harbour Towage - Outbound', items: [
            { id: 'BOM004', desc: 'Tug Assistance - Unberthing', unit: 'Trip' },
            { id: 'BOM005', desc: 'Tug Assistance - Departure', unit: 'Trip' },
            { id: 'BOM006', desc: 'Standby Charge', unit: 'Hour' },
        ]},
        { id: 'SVC003', name: 'Shifting', items: [
            { id: 'BOM007', desc: 'Tug Assistance - Shifting', unit: 'Trip' },
            { id: 'BOM008', desc: 'Standby Charge', unit: 'Hour' },
        ]},
        { id: 'SVC004', name: 'Lightering', items: [
            { id: 'BOM009', desc: 'Tug Assistance - Lightering', unit: 'Trip' },
            { id: 'BOM010', desc: 'Barge Towing', unit: 'Trip' },
            { id: 'BOM011', desc: 'Standby Charge', unit: 'Hour' },
        ]},
    ],
    // Master_T04 - Activity Operations
    activities: [
        { id: 'ACT01', name: 'Berthing' },
        { id: 'ACT02', name: 'Unberthing' },
        { id: 'ACT03', name: 'Shifting' },
        { id: 'ACT04', name: 'Lightering' },
        { id: 'ACT05', name: 'Anchorage' },
    ],
    // Master_T05 - Job Types
    jobTypes: [
        { id: 'JT01', name: 'Regular' },
        { id: 'JT02', name: 'Overtime' },
        { id: 'JT03', name: 'Emergency' },
    ],
    scopes: ['In-Bay', 'Out-Bay'],
    sites: ['BKK', 'MTP'],
    // Master_T06 - Tug Boats
    tugBoats: [
        { id: 'TUG01', name: 'SEATIGER 1', hp: 3200 },
        { id: 'TUG02', name: 'SEATIGER 2', hp: 3200 },
        { id: 'TUG03', name: 'OCEAN FORCE', hp: 4500 },
        { id: 'TUG04', name: 'HARBOUR KING', hp: 2800 },
        { id: 'TUG05', name: 'RIVER HAWK', hp: 2400 },
        { id: 'TUG06', name: 'STORM GUARD', hp: 5000 },
    ],
    // NPM - Container Lines
    containerLines: [
        { id: 'LN01', name: 'Evergreen' },
        { id: 'LN02', name: 'COSCO' },
        { id: 'LN03', name: 'Maersk' },
        { id: 'LN04', name: 'MSC' },
        { id: 'LN05', name: 'ONE' },
    ],
    commodities: ['General Cargo', 'Chemicals', 'Electronics', 'Automotive Parts', 'Textiles', 'Food & Beverage', 'Machinery'],
    containerSizes: [20, 40, 45],
    docTypes: ['E', 'F'],  // E=Export, F=Import
};

// ========== SCM MOCK DATA ==========

let scmTugSchedules = [
    {
        id: 'TS-001',
        status: 'completed',
        agent: MASTERS.customers[0],
        site: 'BKK',
        vessel: MASTERS.vessels[0],
        port: MASTERS.ports[0],
        jobType: MASTERS.jobTypes[0],
        scope: 'In-Bay',
        workDate: '2026-02-15T08:00',
        activity: MASTERS.activities[0],
        service: MASTERS.services[0],
        pilot: 'Capt. Somchai',
        bomItems: [
            { ...MASTERS.services[0].items[0], tug: MASTERS.tugBoats[0], wbs: '01S.26TG.SCBTH.S001' },
            { ...MASTERS.services[0].items[1], tug: MASTERS.tugBoats[1], wbs: '01S.26TG.SCBTH.S002' },
            { ...MASTERS.services[0].items[2], tug: null, wbs: '01S.26TG.SCBTH.S003' },
        ],
        createdAt: '2026-02-14T10:30',
    },
    {
        id: 'TS-002',
        status: 'dispatch',
        agent: MASTERS.customers[1],
        site: 'BKK',
        vessel: MASTERS.vessels[1],
        port: MASTERS.ports[1],
        jobType: MASTERS.jobTypes[0],
        scope: 'Out-Bay',
        workDate: '2026-02-16T14:00',
        activity: MASTERS.activities[1],
        service: MASTERS.services[1],
        pilot: 'Capt. Prasert',
        bomItems: [
            { ...MASTERS.services[1].items[0], tug: MASTERS.tugBoats[2], wbs: '01S.26TG.SCUBT.S001' },
            { ...MASTERS.services[1].items[1], tug: MASTERS.tugBoats[3], wbs: '01S.26TG.SCUBT.S002' },
            { ...MASTERS.services[1].items[2], tug: null, wbs: '01S.26TG.SCUBT.S003' },
        ],
        createdAt: '2026-02-15T09:00',
    },
    {
        id: 'TS-003',
        status: 'open',
        agent: MASTERS.customers[2],
        site: 'MTP',
        vessel: MASTERS.vessels[2],
        port: MASTERS.ports[2],
        jobType: MASTERS.jobTypes[1],
        scope: 'In-Bay',
        workDate: '2026-02-17T06:00',
        activity: MASTERS.activities[0],
        service: MASTERS.services[0],
        pilot: 'Capt. Wichai',
        bomItems: [
            { ...MASTERS.services[0].items[0], tug: null, wbs: '02S.26TG.SCBTH.S001' },
            { ...MASTERS.services[0].items[1], tug: null, wbs: '02S.26TG.SCBTH.S002' },
            { ...MASTERS.services[0].items[2], tug: null, wbs: '02S.26TG.SCBTH.S003' },
        ],
        createdAt: '2026-02-16T11:45',
    },
    {
        id: 'TS-004',
        status: 'draft',
        agent: MASTERS.customers[3],
        site: 'BKK',
        vessel: MASTERS.vessels[3],
        port: MASTERS.ports[3],
        jobType: MASTERS.jobTypes[0],
        scope: 'Out-Bay',
        workDate: '2026-02-18T10:00',
        activity: MASTERS.activities[2],
        service: MASTERS.services[2],
        pilot: '',
        bomItems: [
            { ...MASTERS.services[2].items[0], tug: null, wbs: '' },
            { ...MASTERS.services[2].items[1], tug: null, wbs: '' },
        ],
        createdAt: '2026-02-17T08:20',
    },
    {
        id: 'TS-005',
        status: 'draft',
        agent: MASTERS.customers[4],
        site: 'MTP',
        vessel: MASTERS.vessels[4],
        port: MASTERS.ports[4],
        jobType: MASTERS.jobTypes[2],
        scope: 'Out-Bay',
        workDate: '2026-02-19T16:00',
        activity: MASTERS.activities[3],
        service: MASTERS.services[3],
        pilot: '',
        bomItems: [
            { ...MASTERS.services[3].items[0], tug: null, wbs: '' },
            { ...MASTERS.services[3].items[1], tug: null, wbs: '' },
            { ...MASTERS.services[3].items[2], tug: null, wbs: '' },
        ],
        createdAt: '2026-02-17T08:25',
    },
];

let scmShipments = [
    {
        id: 'SH-1101.26.0001',
        orderId: 'TS-001',
        status: 'completed',
        agent: MASTERS.customers[0],
        site: 'BKK',
        vessel: MASTERS.vessels[0],
        port: MASTERS.ports[0],
        jobType: MASTERS.jobTypes[0],
        scope: 'In-Bay',
        workDate: '2026-02-15T08:00',
        activity: MASTERS.activities[0],
        pilot: 'Capt. Somchai',
        tug: MASTERS.tugBoats[0],
        bomItem: { ...MASTERS.services[0].items[0], wbs: '01S.26TG.SCBTH.S001' },
        reportIn: {
            type: 'Customer',
            stages: [
                { name: 'Start', time: '2026-02-15T08:05' },
                { name: 'Stand by #1', time: '2026-02-15T08:20' },
                { name: 'Work Period #1', time: '2026-02-15T08:35' },
                { name: 'Stand by #2', time: '2026-02-15T09:10' },
                { name: 'Work Period #2', time: '2026-02-15T09:25' },
                { name: 'Stand by #3', time: '' },
                { name: 'Work Period #3', time: '' },
                { name: 'Last', time: '2026-02-15T10:00' },
            ],
        },
    },
    {
        id: 'SH-1101.26.0002',
        orderId: 'TS-001',
        status: 'completed',
        agent: MASTERS.customers[0],
        site: 'BKK',
        vessel: MASTERS.vessels[0],
        port: MASTERS.ports[0],
        jobType: MASTERS.jobTypes[0],
        scope: 'In-Bay',
        workDate: '2026-02-15T08:00',
        activity: MASTERS.activities[0],
        pilot: 'Capt. Somchai',
        tug: MASTERS.tugBoats[1],
        bomItem: { ...MASTERS.services[0].items[1], wbs: '01S.26TG.SCBTH.S002' },
        reportIn: {
            type: 'Internal',
            stages: [
                { name: 'Start', time: '2026-02-15T08:10' },
                { name: 'Stand by #1', time: '2026-02-15T08:25' },
                { name: 'Work Period #1', time: '2026-02-15T08:40' },
                { name: 'Stand by #2', time: '' },
                { name: 'Work Period #2', time: '' },
                { name: 'Stand by #3', time: '' },
                { name: 'Work Period #3', time: '' },
                { name: 'Last', time: '2026-02-15T09:45' },
            ],
        },
    },
    {
        id: 'SH-1101.26.0003',
        orderId: 'TS-002',
        status: 'dispatch',
        agent: MASTERS.customers[1],
        site: 'BKK',
        vessel: MASTERS.vessels[1],
        port: MASTERS.ports[1],
        jobType: MASTERS.jobTypes[0],
        scope: 'Out-Bay',
        workDate: '2026-02-16T14:00',
        activity: MASTERS.activities[1],
        pilot: 'Capt. Prasert',
        tug: MASTERS.tugBoats[2],
        bomItem: { ...MASTERS.services[1].items[0], wbs: '01S.26TG.SCUBT.S001' },
        reportIn: null,
    },
    {
        id: 'SH-1101.26.0004',
        orderId: 'TS-002',
        status: 'dispatch',
        agent: MASTERS.customers[1],
        site: 'BKK',
        vessel: MASTERS.vessels[1],
        port: MASTERS.ports[1],
        jobType: MASTERS.jobTypes[0],
        scope: 'Out-Bay',
        workDate: '2026-02-16T14:00',
        activity: MASTERS.activities[1],
        pilot: 'Capt. Prasert',
        tug: MASTERS.tugBoats[3],
        bomItem: { ...MASTERS.services[1].items[1], wbs: '01S.26TG.SCUBT.S002' },
        reportIn: null,
    },
];

// ========== NPM MOCK DATA ==========

let npmShipments = [
    {
        id: 'ML-1201.26.000001',
        status: 'dispatch',
        vesselName: 'EVER GOLDEN',
        voyNo: '26001S',
        etd: '2026-02-18T06:00',
        wbs: '08S.26CF.NPSRT1.S001',
        site: 'BKK',
        bookings: [
            { id: 'BK001', shipper: 'ABC Trading Co.', fw: 'FW001', bookingNo: 'BKG-2026-0001', cargo: 'Electronics', line: 'Evergreen', sts: 'F', fwRef: 'FW-REF-001', size: 40, qty: 15, stuffing: 'CY', marking: 'ABC-001', srNo: 'SR-001', docType: 'F' },
            { id: 'BK002', shipper: 'XYZ Export Ltd.', fw: 'FW002', bookingNo: 'BKG-2026-0002', cargo: 'Textiles', line: 'COSCO', sts: 'E', fwRef: 'FW-REF-002', size: 20, qty: 10, stuffing: 'CFS', marking: 'XYZ-002', srNo: 'SR-002', docType: 'E' },
            { id: 'BK003', shipper: 'Thai Foods International', fw: 'FW003', bookingNo: 'BKG-2026-0003', cargo: 'Food & Beverage', line: 'Maersk', sts: 'F', fwRef: 'FW-REF-003', size: 40, qty: 8, stuffing: 'CY', marking: 'TFI-003', srNo: 'SR-003', docType: 'F' },
        ],
        containers: [
            { id: 'EIRU1234567', bookingNo: 'BKG-2026-0001', size: 40, type: 'GP', sealNo: 'SL-001', weight: 24500, inspected: true, eirIn: { id: 'EIR-IN-001', time: '2026-02-16T09:00', truckNo: 'BKK-1234', driverName: 'Somchai P.', status: 'completed' }, eirOut: { id: 'EIR-OUT-001', time: '2026-02-17T14:00', truckNo: 'BKK-1234', driverName: 'Somchai P.', status: 'completed' }},
            { id: 'CSQU7654321', bookingNo: 'BKG-2026-0001', size: 40, type: 'GP', sealNo: 'SL-002', weight: 22100, inspected: true, eirIn: { id: 'EIR-IN-002', time: '2026-02-16T10:30', truckNo: 'BKK-5678', driverName: 'Prasert K.', status: 'completed' }, eirOut: null },
            { id: 'MSKU9876543', bookingNo: 'BKG-2026-0002', size: 20, type: 'GP', sealNo: 'SL-003', weight: 18200, inspected: false, eirIn: null, eirOut: null },
            { id: 'OOLU3456789', bookingNo: 'BKG-2026-0003', size: 40, type: 'RF', sealNo: 'SL-004', weight: 26800, inspected: true, eirIn: { id: 'EIR-IN-004', time: '2026-02-16T14:00', truckNo: 'MTP-9012', driverName: 'Wichai S.', status: 'completed' }, eirOut: null },
        ],
    },
    {
        id: 'ML-1201.26.000002',
        status: 'open',
        vesselName: 'COSCO SHIPPING ROSE',
        voyNo: '26002N',
        etd: '2026-02-20T18:00',
        wbs: '08S.26CF.NPSRT1.S002',
        site: 'BKK',
        bookings: [
            { id: 'BK004', shipper: 'Global Chem Corp.', fw: 'FW004', bookingNo: 'BKG-2026-0004', cargo: 'Chemicals', line: 'MSC', sts: 'E', fwRef: 'FW-REF-004', size: 20, qty: 20, stuffing: 'CY', marking: 'GCC-004', srNo: 'SR-004', docType: 'E' },
            { id: 'BK005', shipper: 'Auto Parts Thailand', fw: 'FW005', bookingNo: 'BKG-2026-0005', cargo: 'Automotive Parts', line: 'ONE', sts: 'F', fwRef: 'FW-REF-005', size: 40, qty: 12, stuffing: 'CFS', marking: 'APT-005', srNo: 'SR-005', docType: 'F' },
        ],
        containers: [],
    },
    {
        id: 'ML-1201.26.000003',
        status: 'open',
        vesselName: 'MAERSK SENTOSA',
        voyNo: '26003W',
        etd: '2026-02-22T08:00',
        wbs: '08S.26CF.NPSRT1.S003',
        site: 'MTP',
        bookings: [
            { id: 'BK006', shipper: 'Machinery World Ltd.', fw: 'FW006', bookingNo: 'BKG-2026-0006', cargo: 'Machinery', line: 'Evergreen', sts: 'F', fwRef: 'FW-REF-006', size: 40, qty: 5, stuffing: 'CY', marking: 'MWL-006', srNo: 'SR-006', docType: 'F' },
        ],
        containers: [],
    },
];

// Container inspection checklist template
const INSPECTION_CHECKLIST = [
    { id: 'CHK01', label: 'Exterior - Roof', category: 'Exterior' },
    { id: 'CHK02', label: 'Exterior - Side Panels (Left)', category: 'Exterior' },
    { id: 'CHK03', label: 'Exterior - Side Panels (Right)', category: 'Exterior' },
    { id: 'CHK04', label: 'Exterior - Front Wall', category: 'Exterior' },
    { id: 'CHK05', label: 'Exterior - Door End', category: 'Exterior' },
    { id: 'CHK06', label: 'Exterior - Understructure', category: 'Exterior' },
    { id: 'CHK07', label: 'Interior - Floor', category: 'Interior' },
    { id: 'CHK08', label: 'Interior - Walls', category: 'Interior' },
    { id: 'CHK09', label: 'Interior - Ceiling', category: 'Interior' },
    { id: 'CHK10', label: 'Interior - Cleanliness', category: 'Interior' },
    { id: 'CHK11', label: 'Door - Hinges & Gaskets', category: 'Door' },
    { id: 'CHK12', label: 'Door - Locking Mechanism', category: 'Door' },
    { id: 'CHK13', label: 'Markings - CSC Plate', category: 'Markings' },
    { id: 'CHK14', label: 'Markings - Container Number', category: 'Markings' },
];

let containerInspections = {
    'EIRU1234567': { completedAt: '2026-02-16T08:30', inspector: 'Anon T.', items: INSPECTION_CHECKLIST.map(c => ({ ...c, ok: true, note: '' })) },
    'CSQU7654321': { completedAt: '2026-02-16T10:00', inspector: 'Anon T.', items: INSPECTION_CHECKLIST.map(c => ({ ...c, ok: true, note: '' })) },
    'OOLU3456789': { completedAt: '2026-02-16T13:30', inspector: 'Boon S.', items: INSPECTION_CHECKLIST.map((c, i) => ({ ...c, ok: i !== 5, note: i === 5 ? 'Minor rust on underframe' : '' })) },
};

// ========== UTILITY FUNCTIONS ==========

function generateId(prefix, list) {
    const num = list.length + 1;
    return `${prefix}-${String(num).padStart(3, '0')}`;
}

function formatDateTime(dt) {
    if (!dt) return '-';
    const d = new Date(dt);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
           d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dt) {
    if (!dt) return '-';
    return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showToast(message, type = '') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function openModal(html) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = html;
    overlay.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

function statusBadge(status) {
    return `<span class="badge badge-${status}">${status}</span>`;
}
