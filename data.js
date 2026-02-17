// ========== MASTER DATA (from Marine_comments.xlsx) ==========

const MASTERS = {
    customers: [
        { id: 'C001', name: 'Thai Maritime Co., Ltd.' },
        { id: 'C002', name: 'Bangkok Shipping Group' },
        { id: 'C003', name: 'Siam Ocean Transport' },
        { id: 'C004', name: 'Gulf Navigation Ltd.' },
        { id: 'C005', name: 'Eastern Seaboard Logistics' },
    ],
    vessels: [
        { id: 'V001', name: 'MV SIAM STAR', grt: 12500, loa: 145.2 },
        { id: 'V002', name: 'MV BANGKOK GLORY', grt: 8700, loa: 118.6 },
        { id: 'V003', name: 'MV THAI SPIRIT', grt: 15200, loa: 162.8 },
        { id: 'V004', name: 'MV GULF PIONEER', grt: 6300, loa: 98.4 },
        { id: 'V005', name: 'MV EASTERN WAVE', grt: 21000, loa: 185.0 },
    ],
    // Port Master - real data from Excel
    ports: [
        { id: 'BKK001', name: 'BKK-TUG', desc: 'BANGKOK - BKK TUG', site: 'BKK' },
        { id: 'BKK005', name: 'BKK-TUG', desc: 'BANGKOK - BKK TUG', site: 'BKK' },
        { id: 'BKK007', name: 'BKK-TUG', desc: 'BANGKOK - BKK TUG', site: 'BKK' },
        { id: 'BKKBAR', name: 'BKK-BAR', desc: 'BANGKOK BAR (PILOT STATION)', site: 'BKK' },
        { id: 'BKKMID', name: 'BKK-MID', desc: 'BANGKOK - มิดปากน้ำ', site: 'BKK' },
        { id: 'BKKACM', name: 'BKK-ACME', desc: 'BANGKOK - อู่ ACME', site: 'BKK' },
        { id: 'ASIMAR', name: 'ASIMAR', desc: 'ASIAN MARINE SERVICES PUBLIC CO.,LTD.', site: 'MTP' },
        { id: 'BLCP', name: 'BLCPPORT', desc: 'BLCP POWER- MAPTAPHUT IEAT', site: 'MTP' },
        { id: 'LCB', name: 'LCBPORT', desc: 'LAEM CHABANG PORT- AUTHORITY', site: 'MTP' },
        { id: 'MIT', name: 'MITPORT', desc: 'MAPTAPHUT INDUSTRIAL TERMINAL- MTP IEAT', site: 'MTP' },
        { id: 'MTT', name: 'MTTPORT', desc: 'MAPTAPHUT TANK TERMINAL- MAPTAPHUT IEAT', site: 'MTP' },
        { id: 'IRPC', name: 'IRPCPORT', desc: 'IRPC PORT- RAYONG OUTSIDE CONCESSION', site: 'MTP' },
        { id: 'LMPT1', name: 'PTTLNG', desc: 'LNG MAPTAPHUT TERMINAL 1-MAPTAPHUT IEAT', site: 'MTP' },
        { id: 'LMPT2', name: 'LMPT2', desc: 'LNG MAPTAPHUT TERMINAL 2 - NONG FAB', site: 'MTP' },
        { id: 'RTC', name: 'RTCPORT', desc: 'RAYONG TERMINAL- MAPTAPHUT IEAT', site: 'MTP' },
        { id: 'SPRC', name: 'SPRCPORT', desc: 'STAR PETROLEAM REFINING- MAPTAPHUT IEAT', site: 'MTP' },
        { id: 'SATHIP', name: 'SATTAHIP', desc: 'SATTAHIP PORT- SATTAHIP JUK SAMET', site: 'MTP' },
        { id: 'SPM', name: 'SPMRY', desc: 'SINGLE POINT MOORING- RAYONG', site: 'MTP' },
        { id: 'OUTER', name: 'OUTER', desc: 'OUTER ANCHORAGE AREA', site: 'MTP' },
        { id: 'NFC', name: 'NFCPORT', desc: 'NFC FERTILIZER- MAPTAPHUT IEAT', site: 'MTP' },
        { id: 'TCT', name: 'TCTPORT', desc: 'THAI CONNECTIVITY TERMINAL-MAPTAPHUT IEAT', site: 'MTP' },
        { id: 'TTT', name: 'TTTPORT', desc: 'THAI TANK TERMINAL- MAPTAPHUT IEAT', site: 'MTP' },
        { id: 'PTTGC-W', name: 'PTTGC-WEST', desc: 'PTT GLOBAL CHEMICAL- MAPTAPHUT OUTSIDE', site: 'MTP' },
        { id: 'PTGC-E', name: 'PTTGCPORT', desc: 'PTT GLOBAL CHEMICAL- MAPTAPHUT IEAT (E)', site: 'MTP' },
        { id: 'PTTANK', name: 'PTTTANK', desc: 'PTT TANK TERMINAL- MAPTAPHUT IEAT', site: 'MTP' },
    ],
    // Sales BOM - simplified representative set from real data
    services: [
        { id: 'SVC001', name: 'Harbour Towage - Inbound', items: [
            { id: '7SHITUGBOAT00001', desc: 'Tug Boat Service #1', unit: 'Trip' },
            { id: '7SHITUGBOAT00002', desc: 'Tug Boat Service #2', unit: 'Trip' },
            { id: '7SHISTANDBY00001', desc: 'Standby Charge', unit: 'Hour' },
        ]},
        { id: 'SVC002', name: 'Harbour Towage - Outbound', items: [
            { id: '7SHITUGBOAT00003', desc: 'Tug Boat Service #3', unit: 'Trip' },
            { id: '7SHITUGBOAT00004', desc: 'Tug Boat Service #4', unit: 'Trip' },
            { id: '7SHISTANDBY00002', desc: 'Standby Charge', unit: 'Hour' },
        ]},
        { id: 'SVC003', name: 'Shifting', items: [
            { id: '7SHITUGBOAT00005', desc: 'Tug Boat Service #5', unit: 'Trip' },
            { id: '7SHISTANDBY00003', desc: 'Standby Charge', unit: 'Hour' },
        ]},
        { id: 'SVC004', name: 'Offshore / Towing', items: [
            { id: '7SHITUGBOAT00006', desc: 'Tug Boat Service #6', unit: 'Trip' },
            { id: '7SHITUGBOAT00007', desc: 'Tug Boat Service #7', unit: 'Trip' },
            { id: '7SHISTANDBY00004', desc: 'Standby Charge', unit: 'Hour' },
            { id: '7SHIROPE00000001', desc: 'Rope Service', unit: 'Trip' },
        ]},
        { id: 'SVC005', name: 'Pilot Service', items: [
            { id: '7SHIPILOT0000001', desc: 'Pilot Service #1', unit: 'Trip' },
            { id: '7SHIPILOT0000002', desc: 'Pilot Service #2', unit: 'Trip' },
        ]},
        { id: 'SVC006', name: 'Launch / Jetty Service', items: [
            { id: '7SHOLAUNCH000001', desc: 'Launch Service', unit: 'Trip' },
            { id: '7SHOJETTYG000001', desc: 'Jetty Guard Service', unit: 'Trip' },
        ]},
    ],
    // Activity Operation Master - real data
    activities: [
        { id: '1', name: 'Berth' },
        { id: '2', name: 'Shifting' },
        { id: '3', name: 'Unberth' },
        { id: '4', name: 'Anchoring' },
        { id: '5', name: 'Escorting' },
        { id: '6', name: 'Grounding' },
        { id: '7', name: 'Launching' },
        { id: '8', name: 'Special Job' },
        { id: '9', name: 'Stand By' },
        { id: '10', name: 'Towing' },
        { id: '11', name: 'Turning' },
        { id: '12', name: 'Reberthing' },
    ],
    // Job Type Master - real data
    jobTypes: [
        { id: 'HI', name: 'Harbor Serv. Inside' },
        { id: 'HO', name: 'Harbor Serv. Outside' },
        { id: 'OF', name: 'Offshore Serv.' },
        { id: 'OT', name: 'MO Other' },
    ],
    scopes: ['In-Bay', 'Out-Bay'],
    sites: ['BKK', 'MTP'],
    // Tug Master - real data
    tugBoats: [
        { id: 'RS1', name: 'RS1', site: 'BKK' },
        { id: 'RS2', name: 'RS2', site: 'BKK' },
        { id: 'RS7', name: 'RS7', site: 'BKK' },
        { id: 'RS9', name: 'RS9', site: 'BKK' },
        { id: 'RS10', name: 'RS10', site: 'BKK' },
        { id: 'RS19', name: 'RS19', site: 'BKK' },
        { id: 'RS20', name: 'RS20', site: 'BKK' },
        { id: 'RS21', name: 'RS21', site: 'BKK' },
        { id: 'RS25', name: 'RS25', site: 'BKK' },
        { id: 'RS28', name: 'RS28', site: 'BKK' },
        { id: 'RS39', name: 'RS39', site: 'BKK' },
        { id: 'SC14', name: 'SC14', site: 'BKK' },
        { id: 'SC15B', name: 'SC15', site: 'BKK' },
        { id: 'KNO101', name: 'KNO101', site: 'MTP' },
        { id: 'KNO102', name: 'KNO102', site: 'MTP' },
        { id: 'KNO103', name: 'KNO103', site: 'MTP' },
        { id: 'KNO201', name: 'KNO201', site: 'MTP' },
        { id: 'KNO301', name: 'KNO301', site: 'MTP' },
        { id: 'KNO401', name: 'KNO401', site: 'MTP' },
        { id: 'KNO402', name: 'KNO402', site: 'MTP' },
        { id: 'RS11', name: 'RS11', site: 'MTP' },
        { id: 'RS14', name: 'RS14', site: 'MTP' },
        { id: 'RS15', name: 'RS15', site: 'MTP' },
        { id: 'RS16', name: 'RS16', site: 'MTP' },
        { id: 'RS17', name: 'RS17', site: 'MTP' },
        { id: 'RS18', name: 'RS18', site: 'MTP' },
        { id: 'SC17', name: 'SC17', site: 'MTP' },
        { id: 'SC18', name: 'SC18', site: 'MTP' },
        { id: 'SC19', name: 'SC19', site: 'MTP' },
        { id: 'SC20', name: 'SC20', site: 'MTP' },
    ],
    containerLines: [
        { id: 'LN01', name: 'Evergreen' },
        { id: 'LN02', name: 'COSCO' },
        { id: 'LN03', name: 'Maersk' },
        { id: 'LN04', name: 'MSC' },
        { id: 'LN05', name: 'ONE' },
    ],
    commodities: ['General Cargo', 'Chemicals', 'Electronics', 'Automotive Parts', 'Textiles', 'Food & Beverage', 'Machinery'],
    containerSizes: [20, 40, 45],
    docTypes: ['E', 'F'],
};

// ========== SCM MOCK DATA ==========
// Status flow: draft → open → dispatch → review → closed

let scmTugSchedules = [
    {
        id: 'TS-001',
        status: 'closed',
        agent: MASTERS.customers[0],
        site: 'BKK',
        vessel: MASTERS.vessels[0],
        port: MASTERS.ports[0],
        jobType: MASTERS.jobTypes[1],
        scope: 'In-Bay',
        workDate: '2026-02-15T08:00',
        activity: MASTERS.activities[0],
        service: MASTERS.services[0],
        pilot: 'Capt. Somchai',
        bomItems: [
            { ...MASTERS.services[0].items[0], tug: MASTERS.tugBoats[0], wbs: '02S18BK0RS1  0000' },
            { ...MASTERS.services[0].items[1], tug: MASTERS.tugBoats[1], wbs: '02S18BK0RS2  0000' },
            { ...MASTERS.services[0].items[2], tug: null, wbs: '' },
        ],
        createdAt: '2026-02-14T10:30',
    },
    {
        id: 'TS-002',
        status: 'dispatch',
        agent: MASTERS.customers[1],
        site: 'BKK',
        vessel: MASTERS.vessels[1],
        port: MASTERS.ports[3],
        jobType: MASTERS.jobTypes[1],
        scope: 'Out-Bay',
        workDate: '2026-02-16T14:00',
        activity: MASTERS.activities[2],
        service: MASTERS.services[1],
        pilot: 'Capt. Prasert',
        bomItems: [
            { ...MASTERS.services[1].items[0], tug: MASTERS.tugBoats[2], wbs: '02S18BK0RS7  0000' },
            { ...MASTERS.services[1].items[1], tug: MASTERS.tugBoats[3], wbs: '02S18BK0RS9  0000' },
            { ...MASTERS.services[1].items[2], tug: null, wbs: '' },
        ],
        createdAt: '2026-02-15T09:00',
    },
    {
        id: 'TS-003',
        status: 'open',
        agent: MASTERS.customers[2],
        site: 'MTP',
        vessel: MASTERS.vessels[2],
        port: MASTERS.ports[9],
        jobType: MASTERS.jobTypes[0],
        scope: 'In-Bay',
        workDate: '2026-02-17T06:00',
        activity: MASTERS.activities[0],
        service: MASTERS.services[0],
        pilot: 'Capt. Wichai',
        bomItems: [
            { ...MASTERS.services[0].items[0], tug: null, wbs: '' },
            { ...MASTERS.services[0].items[1], tug: null, wbs: '' },
            { ...MASTERS.services[0].items[2], tug: null, wbs: '' },
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
        jobType: MASTERS.jobTypes[1],
        scope: 'Out-Bay',
        workDate: '2026-02-18T10:00',
        activity: MASTERS.activities[1],
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
        port: MASTERS.ports[18],
        jobType: MASTERS.jobTypes[2],
        scope: 'Out-Bay',
        workDate: '2026-02-19T16:00',
        activity: MASTERS.activities[9],
        service: MASTERS.services[3],
        pilot: '',
        bomItems: [
            { ...MASTERS.services[3].items[0], tug: null, wbs: '' },
            { ...MASTERS.services[3].items[1], tug: null, wbs: '' },
            { ...MASTERS.services[3].items[2], tug: null, wbs: '' },
            { ...MASTERS.services[3].items[3], tug: null, wbs: '' },
        ],
        createdAt: '2026-02-17T08:25',
    },
];

// Report-In stages now have startTime + endTime
let scmShipments = [
    {
        id: 'SH-1101.26.0001',
        orderId: 'TS-001',
        status: 'closed',
        agent: MASTERS.customers[0],
        site: 'BKK',
        vessel: MASTERS.vessels[0],
        port: MASTERS.ports[0],
        jobType: MASTERS.jobTypes[1],
        scope: 'In-Bay',
        workDate: '2026-02-15T08:00',
        activity: MASTERS.activities[0],
        pilot: 'Capt. Somchai',
        tug: MASTERS.tugBoats[0],
        bomItem: { ...MASTERS.services[0].items[0], wbs: '02S18BK0RS1  0000' },
        reportIns: {
            customer: {
                stages: [
                    { name: 'Start', startTime: '2026-02-15T08:05', endTime: '2026-02-15T08:20', required: true },
                    { name: 'Stand by #1', startTime: '2026-02-15T08:20', endTime: '2026-02-15T08:35', required: false },
                    { name: 'Work Period #1', startTime: '2026-02-15T08:35', endTime: '2026-02-15T09:10', required: false },
                    { name: 'Stand by #2', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #2', startTime: 'skipped', endTime: 'skipped', required: false, skippable: true },
                    { name: 'Stand by #3', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #3', startTime: 'skipped', endTime: 'skipped', required: false, skippable: true },
                    { name: 'Last', startTime: '2026-02-15T10:00', endTime: '2026-02-15T10:00', required: true },
                ],
            },
            internal: {
                stages: [
                    { name: 'Start', startTime: '2026-02-15T08:10', endTime: '2026-02-15T08:25', required: true },
                    { name: 'Stand by #1', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #1', startTime: '2026-02-15T08:25', endTime: '2026-02-15T09:30', required: false },
                    { name: 'Stand by #2', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #2', startTime: 'skipped', endTime: 'skipped', required: false, skippable: true },
                    { name: 'Stand by #3', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #3', startTime: 'skipped', endTime: 'skipped', required: false, skippable: true },
                    { name: 'Last', startTime: '2026-02-15T09:45', endTime: '2026-02-15T09:45', required: true },
                ],
            },
        },
    },
    {
        id: 'SH-1101.26.0002',
        orderId: 'TS-001',
        status: 'closed',
        agent: MASTERS.customers[0],
        site: 'BKK',
        vessel: MASTERS.vessels[0],
        port: MASTERS.ports[0],
        jobType: MASTERS.jobTypes[1],
        scope: 'In-Bay',
        workDate: '2026-02-15T08:00',
        activity: MASTERS.activities[0],
        pilot: 'Capt. Somchai',
        tug: MASTERS.tugBoats[1],
        bomItem: { ...MASTERS.services[0].items[1], wbs: '02S18BK0RS2  0000' },
        reportIns: {
            customer: {
                stages: [
                    { name: 'Start', startTime: '2026-02-15T08:12', endTime: '2026-02-15T08:22', required: true },
                    { name: 'Stand by #1', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #1', startTime: '2026-02-15T08:22', endTime: '2026-02-15T09:25', required: false },
                    { name: 'Stand by #2', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #2', startTime: 'skipped', endTime: 'skipped', required: false, skippable: true },
                    { name: 'Stand by #3', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #3', startTime: 'skipped', endTime: 'skipped', required: false, skippable: true },
                    { name: 'Last', startTime: '2026-02-15T09:40', endTime: '2026-02-15T09:40', required: true },
                ],
            },
            internal: {
                stages: [
                    { name: 'Start', startTime: '2026-02-15T08:10', endTime: '2026-02-15T08:25', required: true },
                    { name: 'Stand by #1', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #1', startTime: '2026-02-15T08:25', endTime: '2026-02-15T09:30', required: false },
                    { name: 'Stand by #2', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #2', startTime: 'skipped', endTime: 'skipped', required: false, skippable: true },
                    { name: 'Stand by #3', startTime: 'skipped', endTime: 'skipped', required: false },
                    { name: 'Work Period #3', startTime: 'skipped', endTime: 'skipped', required: false, skippable: true },
                    { name: 'Last', startTime: '2026-02-15T09:45', endTime: '2026-02-15T09:45', required: true },
                ],
            },
        },
    },
    {
        id: 'SH-1101.26.0003',
        orderId: 'TS-002',
        status: 'dispatch',
        agent: MASTERS.customers[1],
        site: 'BKK',
        vessel: MASTERS.vessels[1],
        port: MASTERS.ports[3],
        jobType: MASTERS.jobTypes[1],
        scope: 'Out-Bay',
        workDate: '2026-02-16T14:00',
        activity: MASTERS.activities[2],
        pilot: 'Capt. Prasert',
        tug: MASTERS.tugBoats[2],
        bomItem: { ...MASTERS.services[1].items[0], wbs: '02S18BK0RS7  0000' },
        reportIns: null,
    },
    {
        id: 'SH-1101.26.0004',
        orderId: 'TS-002',
        status: 'dispatch',
        agent: MASTERS.customers[1],
        site: 'BKK',
        vessel: MASTERS.vessels[1],
        port: MASTERS.ports[3],
        jobType: MASTERS.jobTypes[1],
        scope: 'Out-Bay',
        workDate: '2026-02-16T14:00',
        activity: MASTERS.activities[2],
        pilot: 'Capt. Prasert',
        tug: MASTERS.tugBoats[3],
        bomItem: { ...MASTERS.services[1].items[1], wbs: '02S18BK0RS9  0000' },
        reportIns: null,
    },
];

// ========== NPM MOCK DATA ==========
// EIR direction: Out first (leaves port), then In (returns to port)

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
            { id: 'EIRU1234567', bookingNo: 'BKG-2026-0001', size: 40, type: 'GP', sealNo: 'SL-001', weight: 24500, inspected: true,
              eirOut: { id: 'EIR-OUT-001', time: '2026-02-16T08:00', event: 'check-out', salesOrder: '2108123570', containerNotReturning: false, containerNotClosed: false,
                checkDate: '2026-02-16', checkTime: '08:00', reference: 'CO 2026 701', customerType: 'IM', lineAgent: 'Evergreen', containerStatus: 'FCL', forwarder: 'FW001', weight: '24.500', customer: 'ABC Trading Co.', commodity: 'Electronics', stuffingAt: 'CY', marking: 'ABC-001', srNo: 'SR-001',
                shipmentNo: '80001001', itemNo: '0', truckNo: '83-0569', truckHeadPlate: '83-0569', truckTailPlate: '83-1051', officer: 'Waranee', billNo: '117089', carrier: 'ABC Transport', weighingSlipNo: '01', driverName: 'Somchai P.', driverLicense: 'DL-007890', remarks: '', status: 'completed' },
              eirIn: { id: 'EIR-IN-001', time: '2026-02-17T14:00', event: 'check-in', salesOrder: '2108123570', containerNotReturning: false, containerNotClosed: false,
                checkDate: '2026-02-17', checkTime: '14:00', reference: 'CO 2026 702', customerType: 'IM', lineAgent: 'Evergreen', containerStatus: 'FCL', forwarder: 'FW001', weight: '24.500', customer: 'ABC Trading Co.', commodity: 'Electronics', stuffingAt: 'CY', marking: 'ABC-001', srNo: 'SR-001',
                shipmentNo: '80001001', itemNo: '0', truckNo: '83-0569', truckHeadPlate: '83-0569', truckTailPlate: '83-1051', officer: 'Waranee', billNo: '117090', carrier: 'ABC Transport', weighingSlipNo: '02', driverName: 'Somchai P.', driverLicense: 'DL-007890', remarks: '', status: 'completed' }},
            { id: 'CSQU7654321', bookingNo: 'BKG-2026-0001', size: 40, type: 'GP', sealNo: 'SL-002', weight: 22100, inspected: true,
              eirOut: { id: 'EIR-OUT-002', time: '2026-02-16T10:30', event: 'check-out', salesOrder: '2108123571', containerNotReturning: false, containerNotClosed: false,
                checkDate: '2026-02-16', checkTime: '10:30', reference: 'CO 2026 703', customerType: 'IM', lineAgent: 'Evergreen', containerStatus: 'FCL', forwarder: 'FW001', weight: '22.100', customer: 'ABC Trading Co.', commodity: 'Electronics', stuffingAt: 'CY', marking: 'ABC-001', srNo: 'SR-001',
                shipmentNo: '80001002', itemNo: '0', truckNo: '72-4321', truckHeadPlate: '72-4321', truckTailPlate: '72-4322', officer: 'Pranee', billNo: '117091', carrier: 'Fast Logistics', weighingSlipNo: '01', driverName: 'Prasert K.', driverLicense: 'DL-004321', remarks: '', status: 'completed' },
              eirIn: null },
            { id: 'MSKU9876543', bookingNo: 'BKG-2026-0002', size: 20, type: 'GP', sealNo: 'SL-003', weight: 18200, inspected: false, eirOut: null, eirIn: null },
            { id: 'OOLU3456789', bookingNo: 'BKG-2026-0003', size: 40, type: 'RF', sealNo: 'SL-004', weight: 26800, inspected: true,
              eirOut: { id: 'EIR-OUT-004', time: '2026-02-16T14:00', event: 'check-out', salesOrder: '2108123572', containerNotReturning: false, containerNotClosed: false,
                checkDate: '2026-02-16', checkTime: '14:00', reference: 'CO 2026 704', customerType: 'IM', lineAgent: 'Maersk', containerStatus: 'FCL', forwarder: 'FW003', weight: '26.800', customer: 'Thai Foods International', commodity: 'Food & Beverage', stuffingAt: 'CY', marking: 'TFI-003', srNo: 'SR-003',
                shipmentNo: '80001003', itemNo: '0', truckNo: '91-5678', truckHeadPlate: '91-5678', truckTailPlate: '91-5679', officer: 'Somporn', billNo: '117092', carrier: 'MTP Hauling', weighingSlipNo: '01', driverName: 'Wichai S.', driverLicense: 'DL-009012', remarks: '', status: 'completed' },
              eirIn: null },
            { id: 'TCLU5551234', bookingNo: 'BKG-NOMATCH', size: 20, type: 'GP', sealNo: 'SL-005', weight: 15000, inspected: false, eirOut: null, eirIn: null },
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
    'EIRU1234567': { completedAt: '2026-02-16T07:30', inspector: 'Anon T.', items: INSPECTION_CHECKLIST.map(c => ({ ...c, ok: true, note: '' })) },
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
    if (dt === 'skipped') return t('skipped');
    const d = new Date(dt);
    if (isNaN(d.getTime())) return '-';
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
    const label = typeof t === 'function' ? t(status) : status;
    return `<span class="badge badge-${status}">${label}</span>`;
}

function getPortsForSite(site) {
    return MASTERS.ports.filter(p => !p.site || p.site === site);
}

function getTugsForSite(site) {
    return MASTERS.tugBoats.filter(tb => tb.site === site);
}

function makeEmptyStages() {
    return [
        { name: 'Start', startTime: '', endTime: '', required: true },
        { name: 'Stand by #1', startTime: '', endTime: '', required: false },
        { name: 'Work Period #1', startTime: '', endTime: '', required: false },
        { name: 'Stand by #2', startTime: '', endTime: '', required: false },
        { name: 'Work Period #2', startTime: '', endTime: '', required: false, skippable: true },
        { name: 'Stand by #3', startTime: '', endTime: '', required: false },
        { name: 'Work Period #3', startTime: '', endTime: '', required: false, skippable: true },
        { name: 'Last', startTime: '', endTime: '', required: true },
    ];
}
