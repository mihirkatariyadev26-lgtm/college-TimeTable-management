const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak, LevelFormat, Header, Footer,
  TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

// ── Color palette ──────────────────────────────────────────────────────────
const C = {
  navy:      '1B3A5C',
  blue:      '2563EB',
  lightBlue: 'DBEAFE',
  green:     '16A34A',
  lightGreen:'DCFCE7',
  orange:    'D97706',
  lightOrange:'FEF3C7',
  red:       'DC2626',
  lightRed:  'FEE2E2',
  purple:    '7C3AED',
  lightPurp: 'EDE9FE',
  teal:      '0F766E',
  lightTeal: 'CCFBF1',
  gray:      '6B7280',
  lightGray: 'F3F4F6',
  darkGray:  '374151',
  white:     'FFFFFF',
  codeBg:    'F8F9FA',
  headerBg:  '1E3A5F',
};

// ── Border helpers ─────────────────────────────────────────────────────────
const border = (color='CCCCCC', size=4) => ({ style: BorderStyle.SINGLE, size, color });
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: 'FFFFFF' });
const allBorders = (c='CCCCCC', s=4) => ({ top: border(c,s), bottom: border(c,s), left: border(c,s), right: border(c,s) });
const noBorders = () => ({ top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() });

// ── Text helpers ───────────────────────────────────────────────────────────
const txt = (text, opts={}) => new TextRun({ text: String(text), ...opts });
const bold = (text, opts={}) => txt(text, { bold: true, ...opts });
const code = (text) => txt(text, { font: 'Courier New', size: 18, color: C.navy });
const colorTxt = (text, color, opts={}) => txt(text, { color, ...opts });

// ── Paragraph helpers ──────────────────────────────────────────────────────
const para = (children, opts={}) => new Paragraph({ children: Array.isArray(children) ? children : [children], ...opts });
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt(text)] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [txt(text)] });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [txt(text)] });
const spacer = (lines=1) => Array.from({length: lines}, () => para(''));
const divider = () => new Paragraph({
  children: [],
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.blue } },
  spacing: { before: 200, after: 200 }
});

// ── Cell builders ──────────────────────────────────────────────────────────
const cell = (children, opts={}) => new TableCell({
  borders: allBorders('DDDDDD', 4),
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: Array.isArray(children) ? children : [para(children)],
  ...opts
});
const headerCell = (text, bgColor=C.headerBg, w) => new TableCell({
  borders: allBorders(bgColor, 4),
  shading: { fill: bgColor, type: ShadingType.CLEAR },
  margins: { top: 100, bottom: 100, left: 140, right: 140 },
  width: w ? { size: w, type: WidthType.DXA } : undefined,
  children: [para(bold(text, { color: C.white, size: 20 }))]
});
const dataCell = (children, bgColor=C.white, w) => new TableCell({
  borders: allBorders('DDDDDD', 4),
  shading: { fill: bgColor, type: ShadingType.CLEAR },
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  width: w ? { size: w, type: WidthType.DXA } : undefined,
  children: Array.isArray(children) ? children : [para(typeof children === 'string' ? txt(children) : children)]
});

// ── Method badge ───────────────────────────────────────────────────────────
const methodColors = { GET: C.green, POST: C.blue, PUT: C.orange, DELETE: C.red, PATCH: C.purple };
const methodBg     = { GET: C.lightGreen, POST: C.lightBlue, PUT: C.lightOrange, DELETE: C.lightRed, PATCH: C.lightPurp };

// ── Cover page ─────────────────────────────────────────────────────────────
function buildCoverPage() {
  return [
    ...spacer(4),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [txt('📋', { size: 72 })]
    }),
    ...spacer(1),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [bold('Dynamic College Timetable', { size: 52, color: C.navy })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [bold('Management System', { size: 52, color: C.navy })]
    }),
    ...spacer(1),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [txt('OpenAPI-Driven API Design Contract', { size: 30, color: C.blue, italics: true })]
    }),
    ...spacer(2),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue } },
      children: []
    }),
    ...spacer(1),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [txt('Version 1.0.0  •  MERN Stack  •  WebSocket Enabled', { size: 22, color: C.gray })]
    }),
    ...spacer(1),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [txt('Backend: Node.js / Express.js  |  Database: MongoDB (Mongoose)', { size: 20, color: C.gray })]
    }),
    ...spacer(6),
    new Paragraph({ children: [new PageBreak()] })
  ];
}

// ── Section title block ────────────────────────────────────────────────────
function sectionTitle(emoji, title, subtitle='') {
  const rows = [
    new Paragraph({
      children: [txt(emoji + '  ' + title, { size: 32, bold: true, color: C.white })],
      spacing: { before: 0, after: subtitle ? 80 : 0 }
    })
  ];
  if (subtitle) rows.push(new Paragraph({ children: [txt(subtitle, { size: 20, color: 'BFD5F5', italics: true })] }));
  return [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [new TableRow({ children: [new TableCell({
        borders: noBorders(),
        shading: { fill: C.navy, type: ShadingType.CLEAR },
        margins: { top: 200, bottom: 200, left: 300, right: 300 },
        children: rows
      })] })]
    }),
    ...spacer(1)
  ];
}

// ── Endpoint block ─────────────────────────────────────────────────────────
function endpointBlock(method, path, summary, description, tag, params=[], reqBody=null, responses=[], controller='') {
  const mColor = methodColors[method] || C.gray;
  const mBg    = methodBg[method] || C.lightGray;
  const items = [];

  // Method + path header row
  items.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 8160],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: allBorders(mColor, 8),
        shading: { fill: mColor, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bold(method, { color: C.white, size: 22 })] })]
      }),
      new TableCell({
        borders: allBorders(mColor, 8),
        shading: { fill: mBg, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 140 },
        children: [para(code(path))]
      })
    ]})]
  }));

  // Summary + tag row
  items.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [7000, 2360],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: allBorders('EEEEEE', 4),
        shading: { fill: C.lightGray, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [para([bold('Summary: ', { size: 20 }), txt(summary, { size: 20, italics: true })])]
      }),
      new TableCell({
        borders: allBorders('EEEEEE', 4),
        shading: { fill: mBg, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [txt('🏷️ ' + tag, { size: 19, color: mColor, bold: true })] })]
      })
    ]})]
  }));

  // Description
  items.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: allBorders('DDDDDD', 4),
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: [
        para([bold('Description: ', { size: 19, color: C.navy }), txt(description, { size: 19 })])
      ]
    })] })]
  }));

  // Controller
  if (controller) {
    items.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2200, 7160],
      rows: [new TableRow({ children: [
        new TableCell({
          borders: allBorders('DDDDDD', 4),
          shading: { fill: C.lightPurp, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          children: [para(bold('Controller Function', { size: 19, color: C.purple }))]
        }),
        new TableCell({
          borders: allBorders('DDDDDD', 4),
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          children: [para(code(controller))]
        })
      ]})]
    }));
  }

  // Parameters
  if (params.length > 0) {
    items.push(para([bold('⚙  Parameters', { size: 20, color: C.navy })], { spacing: { before: 120, after: 60 } }));
    items.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1800, 1400, 1200, 4960],
      rows: [
        new TableRow({ children: [
          headerCell('Name', C.darkGray, 1800),
          headerCell('In', C.darkGray, 1400),
          headerCell('Type', C.darkGray, 1200),
          headerCell('Description', C.darkGray, 4960)
        ]}),
        ...params.map((p, i) => new TableRow({ children: [
          dataCell(code(p.name), i%2===0 ? C.white : C.lightGray, 1800),
          dataCell(txt(p.in, { size: 18, color: C.teal }), i%2===0 ? C.white : C.lightGray, 1400),
          dataCell(code(p.type), i%2===0 ? C.white : C.lightGray, 1200),
          dataCell(txt(p.desc, { size: 18 }), i%2===0 ? C.white : C.lightGray, 4960)
        ]}))
      ]
    }));
  }

  // Request Body
  if (reqBody) {
    items.push(para([bold('📤  Request Body', { size: 20, color: C.navy })], { spacing: { before: 120, after: 60 } }));
    items.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2000, 1400, 1200, 900, 3860],
      rows: [
        new TableRow({ children: [
          headerCell('Field', C.teal, 2000),
          headerCell('Type', C.teal, 1400),
          headerCell('Required', C.teal, 1200),
          headerCell('Example', C.teal, 900),
          headerCell('Description', C.teal, 3860)
        ]}),
        ...reqBody.map((f, i) => new TableRow({ children: [
          dataCell(code(f.field), i%2===0 ? C.white : C.lightTeal, 2000),
          dataCell(txt(f.type, { size: 18, color: C.teal }), i%2===0 ? C.white : C.lightTeal, 1400),
          dataCell(txt(f.required ? '✅ Yes' : '⬜ No', { size: 18 }), i%2===0 ? C.white : C.lightTeal, 1200),
          dataCell(code(f.example || '—'), i%2===0 ? C.white : C.lightTeal, 900),
          dataCell(txt(f.desc, { size: 18 }), i%2===0 ? C.white : C.lightTeal, 3860)
        ]}))
      ]
    }));
  }

  // Responses
  if (responses.length > 0) {
    items.push(para([bold('📥  Responses', { size: 20, color: C.navy })], { spacing: { before: 120, after: 60 } }));
    items.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [900, 2500, 5960],
      rows: [
        new TableRow({ children: [
          headerCell('Code', C.orange, 900),
          headerCell('Status', C.orange, 2500),
          headerCell('Response Schema / Description', C.orange, 5960)
        ]}),
        ...responses.map((r, i) => {
          const codeColor = r.code < 300 ? C.green : r.code < 400 ? C.orange : C.red;
          return new TableRow({ children: [
            dataCell(txt(String(r.code), { bold: true, color: codeColor, size: 20 }), i%2===0 ? C.white : C.lightOrange, 900),
            dataCell(txt(r.status, { size: 18 }), i%2===0 ? C.white : C.lightOrange, 2500),
            dataCell(r.schema ? code(r.schema) : txt(r.desc || '', { size: 18 }), i%2===0 ? C.white : C.lightOrange, 5960)
          ]};
        })
      ]
    }));
  }

  items.push(...spacer(2));
  return items;
}

// ── Schema table ───────────────────────────────────────────────────────────
function schemaTable(title, fields) {
  return [
    para([bold('📦  ' + title, { size: 22, color: C.navy })], { spacing: { before: 200, after: 80 } }),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2200, 1600, 1000, 4560],
      rows: [
        new TableRow({ children: [
          headerCell('Field', C.navy, 2200),
          headerCell('Type', C.navy, 1600),
          headerCell('Required', C.navy, 1000),
          headerCell('Description / Example', C.navy, 4560)
        ]}),
        ...fields.map((f, i) => new TableRow({ children: [
          dataCell(code(f.field), i%2===0 ? C.white : C.lightBlue, 2200),
          dataCell(txt(f.type, { size: 18, color: C.teal }), i%2===0 ? C.white : C.lightBlue, 1600),
          dataCell(txt(f.required ? '✅' : '⬜', { size: 20 }), i%2===0 ? C.white : C.lightBlue, 1000),
          dataCell(txt(f.desc, { size: 18 }), i%2===0 ? C.white : C.lightBlue, 4560)
        ]}))
      ]
    }),
    ...spacer(1)
  ];
}

// ── WebSocket event row ────────────────────────────────────────────────────
function wsEventTable(events) {
  return [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2600, 1600, 2000, 3160],
      rows: [
        new TableRow({ children: [
          headerCell('Event Name', C.teal, 2600),
          headerCell('Direction', C.teal, 1600),
          headerCell('Target Room', C.teal, 2000),
          headerCell('Payload / Description', C.teal, 3160)
        ]}),
        ...events.map((e, i) => new TableRow({ children: [
          dataCell(code(e.event), i%2===0 ? C.white : C.lightTeal, 2600),
          dataCell(txt(e.dir, { size: 18, color: e.dir.includes('Server') ? C.green : C.blue }), i%2===0 ? C.white : C.lightTeal, 1600),
          dataCell(code(e.room), i%2===0 ? C.white : C.lightTeal, 2000),
          dataCell(txt(e.desc, { size: 18 }), i%2===0 ? C.white : C.lightTeal, 3160)
        ]}))
      ]
    }),
    ...spacer(2)
  ];
}

// ── Error codes table ──────────────────────────────────────────────────────
function errorTable(errors) {
  return [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1000, 2600, 5760],
      rows: [
        new TableRow({ children: [
          headerCell('Code', C.red, 1000),
          headerCell('Error Key', C.red, 2600),
          headerCell('When It Occurs', C.red, 5760)
        ]}),
        ...errors.map((e, i) => new TableRow({ children: [
          dataCell(txt(String(e.code), { bold: true, color: C.red, size: 20 }), i%2===0 ? C.white : C.lightRed, 1000),
          dataCell(code(e.key), i%2===0 ? C.white : C.lightRed, 2600),
          dataCell(txt(e.desc, { size: 18 }), i%2===0 ? C.white : C.lightRed, 5760)
        ]}))
      ]
    }),
    ...spacer(1)
  ];
}

// ════════════════════════════════════════════════════════════════════════════
//  DOCUMENT ASSEMBLY
// ════════════════════════════════════════════════════════════════════════════
const docChildren = [

  // ── COVER ──────────────────────────────────────────────────────────────
  ...buildCoverPage(),

  // ── 1. OVERVIEW ────────────────────────────────────────────────────────
  ...sectionTitle('📖', 'Section 1 — API Overview', 'Base Information, Authentication Model & Global Conventions'),
  h2('1.1  OpenAPI Info Block'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 6560],
    rows: [
      new TableRow({ children: [headerCell('Property', C.navy, 2800), headerCell('Value', C.navy, 6560)] }),
      ...([
        ['openapi', '3.0.3'],
        ['title', 'Dynamic College Timetable Management System API'],
        ['version', '1.0.0'],
        ['description', 'REST + WebSocket API for managing timetables, lecture swaps, and free-lecture pools across faculties, students, and admins.'],
        ['Base URL (Development)', 'http://localhost:5000/api'],
        ['Base URL (Production)', 'https://your-domain.com/api'],
        ['WebSocket URL', 'ws://localhost:5000  (Socket.io)'],
        ['Content-Type', 'application/json'],
        ['Auth Scheme', 'Bearer JWT (Authorization header)'],
        ['License', 'ISC'],
      ].map(([k, v], i) => new TableRow({ children: [
        dataCell(bold(k, { size: 19 }), i%2===0 ? C.white : C.lightBlue, 2800),
        dataCell(code(v), i%2===0 ? C.white : C.lightBlue, 6560)
      ] })))
    ]
  }),
  ...spacer(1),
  h2('1.2  Global Request Headers'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 2000, 4560],
    rows: [
      new TableRow({ children: [headerCell('Header', C.navy, 2800), headerCell('Required?', C.navy, 2000), headerCell('Example / Notes', C.navy, 4560)] }),
      ...([
        ['Content-Type', 'All POST/PUT/PATCH', 'application/json'],
        ['Authorization', 'All protected routes', 'Bearer eyJhbGci...  (JWT token from /auth/login)'],
        ['Accept', 'Optional', 'application/json'],
      ].map(([h, r, e], i) => new TableRow({ children: [
        dataCell(code(h), i%2===0 ? C.white : C.lightGray, 2800),
        dataCell(txt(r, { size: 18 }), i%2===0 ? C.white : C.lightGray, 2000),
        dataCell(code(e), i%2===0 ? C.white : C.lightGray, 4560)
      ] })))
    ]
  }),
  ...spacer(1),
  h2('1.3  Standard Success Response Envelope'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1400, 5560],
    rows: [
      new TableRow({ children: [headerCell('Field', C.green, 2400), headerCell('Type', C.green, 1400), headerCell('Description', C.green, 5560)] }),
      ...([
        ['success', 'Boolean', 'Always true for 2xx responses'],
        ['message', 'String', 'Human-readable summary of the action'],
        ['data', 'Object | Array', 'Primary response payload; null when not applicable'],
        ['meta', 'Object', 'Pagination info: { page, limit, total }  — included only on list endpoints'],
      ].map(([f, t, d], i) => new TableRow({ children: [
        dataCell(code(f), i%2===0 ? C.white : C.lightGreen, 2400),
        dataCell(txt(t, { size: 18, color: C.teal }), i%2===0 ? C.white : C.lightGreen, 1400),
        dataCell(txt(d, { size: 18 }), i%2===0 ? C.white : C.lightGreen, 5560)
      ] })))
    ]
  }),
  ...spacer(1),
  h2('1.4  Standard Error Response Envelope'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1400, 5560],
    rows: [
      new TableRow({ children: [headerCell('Field', C.red, 2400), headerCell('Type', C.red, 1400), headerCell('Description', C.red, 5560)] }),
      ...([
        ['success', 'Boolean', 'Always false for error responses'],
        ['error.code', 'String', 'Machine-readable error key, e.g. UNAUTHORIZED'],
        ['error.message', 'String', 'Human-readable explanation of the error'],
        ['error.details', 'Array', 'Field-level validation errors (populated on 422)'],
      ].map(([f, t, d], i) => new TableRow({ children: [
        dataCell(code(f), i%2===0 ? C.white : C.lightRed, 2400),
        dataCell(txt(t, { size: 18, color: C.teal }), i%2===0 ? C.white : C.lightRed, 1400),
        dataCell(txt(d, { size: 18 }), i%2===0 ? C.white : C.lightRed, 5560)
      ] })))
    ]
  }),
  ...spacer(2),
  new Paragraph({ children: [new PageBreak()] }),

  // ── 2. AUTH ────────────────────────────────────────────────────────────
  ...sectionTitle('🔐', 'Section 2 — Authentication Endpoints', 'Base path: /api/auth'),
  h2('2.1  Role-Based Access Control (RBAC) Matrix'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3200, 2050, 2050, 2060],
    rows: [
      new TableRow({ children: [
        headerCell('Endpoint', C.navy, 3200),
        headerCell('Admin', C.navy, 2050),
        headerCell('Teacher', C.navy, 2050),
        headerCell('Student', C.navy, 2060)
      ]}),
      ...([
        ['POST /auth/login', '✅', '✅', '✅'],
        ['POST /auth/logout', '✅', '✅', '✅'],
        ['GET /auth/me', '✅', '✅', '✅'],
        ['POST /auth/refresh-token', '✅', '✅', '✅'],
        ['POST /auth/register (Admin only)', '✅', '❌', '❌'],
      ].map(([r, a, t, s], i) => new TableRow({ children: [
        dataCell(code(r), i%2===0 ? C.white : C.lightBlue, 3200),
        dataCell(txt(a, { size: 22 }), i%2===0 ? C.white : C.lightBlue, 2050),
        dataCell(txt(t, { size: 22 }), i%2===0 ? C.white : C.lightBlue, 2050),
        dataCell(txt(s, { size: 22 }), i%2===0 ? C.white : C.lightBlue, 2060)
      ] })))
    ]
  }),
  ...spacer(2),

  // POST /auth/login
  ...endpointBlock(
    'POST', '/api/auth/login',
    'Authenticate a user and receive a signed JWT token',
    'Validates the provided email and password against the database. On success, returns a signed JWT containing user metadata (id, role, semester, division). This token must be sent as a Bearer token in the Authorization header for all subsequent protected API calls.',
    'Auth',
    [],
    [
      { field: 'email', type: 'string (email)', required: true, example: 'teacher@clg.edu', desc: 'Registered email address of the user' },
      { field: 'password', type: 'string', required: true, example: 'P@ssword123', desc: 'Plain-text password; hashed server-side with bcrypt before comparison' },
    ],
    [
      { code: 200, status: 'OK — Login Successful', schema: '{ success, message, data: { token, user: { _id, name, email, role, semester?, division? } } }' },
      { code: 401, status: 'Unauthorized — Bad Credentials', schema: '{ success: false, error: { code: "INVALID_CREDENTIALS", message: "..." } }' },
      { code: 422, status: 'Unprocessable Entity — Validation Failed', schema: '{ success: false, error: { code: "VALIDATION_ERROR", details: [...] } }' },
    ],
    'authController.login'
  ),

  // POST /auth/logout
  ...endpointBlock(
    'POST', '/api/auth/logout',
    'Invalidate the current session JWT token',
    'Adds the provided JWT to a server-side token blacklist (stored in Redis or in-memory Set for MVP), making it unusable for future requests. The client must discard the token from local storage on receiving a 200 response.',
    'Auth',
    [],
    [],
    [
      { code: 200, status: 'OK — Logged Out', schema: '{ success: true, message: "Logged out successfully" }' },
      { code: 401, status: 'Unauthorized — Token Missing or Expired', schema: '{ success: false, error: { code: "UNAUTHORIZED" } }' },
    ],
    'authController.logout'
  ),

  // GET /auth/me
  ...endpointBlock(
    'GET', '/api/auth/me',
    'Retrieve the profile of the currently authenticated user',
    'Decodes the Bearer JWT from the Authorization header and returns the full user profile document from MongoDB. Useful for the frontend to hydrate user context on app load or after page refresh without storing sensitive data client-side.',
    'Auth',
    [],
    [],
    [
      { code: 200, status: 'OK', schema: '{ success: true, data: { _id, name, email, role, subjectsTaught?, semester?, division? } }' },
      { code: 401, status: 'Unauthorized', schema: '{ success: false, error: { code: "TOKEN_EXPIRED" | "UNAUTHORIZED" } }' },
    ],
    'authController.getMe'
  ),

  // POST /auth/refresh-token
  ...endpointBlock(
    'POST', '/api/auth/refresh-token',
    'Exchange a valid refresh token for a new access token',
    'On receiving a long-lived refresh token (issued at login alongside the short-lived access token), the server verifies it, generates a fresh access token (15 min TTL), and returns it. This avoids forcing users to re-login every 15 minutes while keeping the access token short-lived for security.',
    'Auth',
    [],
    [{ field: 'refreshToken', type: 'string', required: true, example: 'eyJhbGci...', desc: 'The long-lived refresh token stored securely by the client (e.g., in an HttpOnly cookie)' }],
    [
      { code: 200, status: 'OK', schema: '{ success: true, data: { accessToken } }' },
      { code: 401, status: 'Unauthorized — Refresh Token Invalid or Expired', schema: '{ success: false, error: { code: "REFRESH_TOKEN_INVALID" } }' },
    ],
    'authController.refreshToken'
  ),

  // POST /auth/register
  ...endpointBlock(
    'POST', '/api/auth/register',
    'Create a new user account (Admin access only)',
    'Allows the Admin to create accounts for Teachers and Students. Hashes the password before persisting to MongoDB. For Teachers, subjectsTaught array is required. For Students, semester and division are required. The role field determines which fields are validated. Emits no WebSocket event.',
    'Auth',
    [],
    [
      { field: 'name', type: 'string', required: true, example: 'Prof. Mehta', desc: 'Full name of the user' },
      { field: 'email', type: 'string (email)', required: true, example: 'mehta@clg.edu', desc: 'Unique email; used as login credential' },
      { field: 'password', type: 'string', required: true, example: 'InitPass@1', desc: 'Initial password; user should change on first login' },
      { field: 'role', type: 'enum', required: true, example: 'Teacher', desc: 'One of: Admin | Teacher | Student' },
      { field: 'subjectsTaught', type: 'string[]', required: false, example: '["DBMS","OS"]', desc: 'Required only when role = Teacher' },
      { field: 'semester', type: 'number', required: false, example: '4', desc: 'Required only when role = Student' },
      { field: 'division', type: 'string', required: false, example: 'A', desc: 'Required only when role = Student' },
    ],
    [
      { code: 201, status: 'Created', schema: '{ success: true, message: "User created", data: { _id, name, email, role } }' },
      { code: 400, status: 'Bad Request — Email already exists', schema: '{ success: false, error: { code: "EMAIL_CONFLICT" } }' },
      { code: 403, status: 'Forbidden — Non-admin attempt', schema: '{ success: false, error: { code: "FORBIDDEN" } }' },
    ],
    'authController.register'
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 3. TIMETABLE ───────────────────────────────────────────────────────
  ...sectionTitle('📅', 'Section 3 — Timetable Endpoints', 'Base path: /api/timetable'),
  para([
    txt('The timetable system is split into two MongoDB collections: ', { size: 20 }),
    bold('MasterTimetable', { size: 20, color: C.navy }),
    txt(' (the recurring weekly baseline) and ', { size: 20 }),
    bold('ScheduleException', { size: 20, color: C.navy }),
    txt(' (one-off date overrides). The GET /view endpoint merges both intelligently before responding.', { size: 20 })
  ], { spacing: { before: 0, after: 240 } }),

  h2('3.1  Access Control'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3200, 2050, 2050, 2060],
    rows: [
      new TableRow({ children: [headerCell('Endpoint', C.navy, 3200), headerCell('Admin', C.navy, 2050), headerCell('Teacher', C.navy, 2050), headerCell('Student', C.navy, 2060)] }),
      ...([
        ['POST /timetable/create', '✅', '❌', '❌'],
        ['PUT /timetable/update/:slotId', '✅', '❌', '❌'],
        ['DELETE /timetable/delete/:slotId', '✅', '❌', '❌'],
        ['GET /timetable/view', '✅', '✅', '✅'],
        ['GET /timetable/teacher/:teacherId', '✅', '✅ (own)', '❌'],
      ].map(([r, a, t, s], i) => new TableRow({ children: [
        dataCell(code(r), i%2===0 ? C.white : C.lightBlue, 3200),
        dataCell(txt(a, { size: 22 }), i%2===0 ? C.white : C.lightBlue, 2050),
        dataCell(txt(t, { size: 22 }), i%2===0 ? C.white : C.lightBlue, 2050),
        dataCell(txt(s, { size: 22 }), i%2===0 ? C.white : C.lightBlue, 2060)
      ]})))
    ]
  }),
  ...spacer(2),

  // POST /timetable/create
  ...endpointBlock(
    'POST', '/api/timetable/create',
    'Create a single slot in the Master Timetable (Admin only)',
    'Inserts one row into the MasterTimetable collection representing a recurring weekly lecture slot. Before inserting, the service layer validates that the teacherId does not already have a lecture in the same dayOfWeek + slotNumber across any semester/division. If a conflict is detected, the request is rejected with a 409 Conflict error.',
    'Timetable',
    [],
    [
      { field: 'dayOfWeek', type: 'enum', required: true, example: 'Monday', desc: 'Day the slot recurs on. One of: Monday–Saturday' },
      { field: 'slotNumber', type: 'number (1–8)', required: true, example: '3', desc: 'Sequential lecture number within the day' },
      { field: 'semester', type: 'number', required: true, example: '4', desc: 'Target semester' },
      { field: 'division', type: 'string', required: true, example: 'A', desc: 'Target division within the semester' },
      { field: 'teacherId', type: 'ObjectId (string)', required: true, example: '64abc...', desc: 'MongoDB _id of the assigned teacher' },
      { field: 'subject', type: 'string', required: true, example: 'DBMS', desc: 'Subject/course name for this slot' },
    ],
    [
      { code: 201, status: 'Created — Slot added to Master Timetable', schema: '{ success: true, data: { _id, dayOfWeek, slotNumber, semester, division, teacherId, subject } }' },
      { code: 409, status: 'Conflict — Teacher already assigned to this slot', schema: '{ success: false, error: { code: "SLOT_CONFLICT", message: "Teacher already has a lecture in Sem X at slot Y on Monday" } }' },
      { code: 403, status: 'Forbidden — Non-admin', schema: '{ success: false, error: { code: "FORBIDDEN" } }' },
    ],
    'timetableController.createMaster'
  ),

  // GET /timetable/view
  ...endpointBlock(
    'GET', '/api/timetable/view',
    'Fetch a composite timetable for a semester/division on a specific date',
    'The core read endpoint for all dashboards. It accepts a date, semester, and division as query parameters. Internally: (1) determines the day of the week from the date, (2) fetches all MasterTimetable records matching semester + division + dayOfWeek, (3) fetches all ScheduleException records matching semester + division + exact date, (4) overrides master slots with matching exceptions slot-by-slot, and (5) returns the merged array. This means students and teachers always see today\'s live schedule, not just the template.',
    'Timetable',
    [
      { name: 'date', in: 'query', type: 'string (ISO 8601)', desc: 'Target date e.g. 2025-09-01. Defaults to today if omitted.' },
      { name: 'semester', in: 'query', type: 'number', desc: 'Filter by semester number e.g. 4' },
      { name: 'division', in: 'query', type: 'string', desc: 'Filter by division e.g. A' },
    ],
    null,
    [
      { code: 200, status: 'OK', schema: '{ success: true, data: [ { slotNumber, subject, teacherName, isException, isFreeLecture, assignedTeacherId? } ] }' },
      { code: 400, status: 'Bad Request — Missing required query params', schema: '{ success: false, error: { code: "MISSING_PARAMS" } }' },
    ],
    'timetableController.getSchedule'
  ),

  // GET /timetable/teacher/:teacherId
  ...endpointBlock(
    'GET', '/api/timetable/teacher/:teacherId',
    "Fetch all of a teacher's lecture slots across all semesters for a given week",
    'Returns a cross-semester personal timetable for the specified teacher. Aggregates MasterTimetable records where teacherId matches, grouped by dayOfWeek. Overlays ScheduleExceptions for the requested week. Teachers call this with their own ID (enforced server-side); Admins may query any teacherId. Used to populate the Teacher Dashboard\'s weekly calendar view.',
    'Timetable',
    [
      { name: 'teacherId', in: 'path', type: 'ObjectId (string)', desc: 'MongoDB _id of the teacher' },
      { name: 'weekOf', in: 'query', type: 'string (ISO 8601 date)', desc: 'Any date within the target week. Defaults to current week if omitted.' },
    ],
    null,
    [
      { code: 200, status: 'OK', schema: '{ success: true, data: { Monday: [...], Tuesday: [...], ... } }' },
      { code: 403, status: 'Forbidden — Teacher querying another teacher', schema: '{ success: false, error: { code: "FORBIDDEN" } }' },
      { code: 404, status: 'Not Found — Teacher does not exist', schema: '{ success: false, error: { code: "USER_NOT_FOUND" } }' },
    ],
    'timetableController.getTeacherSchedule'
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 4. SWAPS ───────────────────────────────────────────────────────────
  ...sectionTitle('🔄', 'Section 4 — Swap Management Endpoints', 'Base path: /api/swaps'),
  para([
    txt('The swap workflow follows a strict state machine: ', { size: 20 }),
    bold('Pending → Approved | Rejected', { size: 20, color: C.navy }),
    txt('. If a swap is Approved and isPermanent = true, the MasterTimetable records are directly mutated. If temporary, two ScheduleException documents are created for the target date.', { size: 20 })
  ], { spacing: { before: 0, after: 140 } }),
  h2('4.1  Swap State Machine'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 2500, 5060],
    rows: [
      new TableRow({ children: [headerCell('State', C.navy, 1800), headerCell('Triggered By', C.navy, 2500), headerCell('Effect', C.navy, 5060)] }),
      ...([
        ['Pending', 'Teacher A posts /swaps/request', 'SwapRequest saved; conflict check runs; Teacher B notified via WebSocket'],
        ['Approved', 'Teacher B posts /swaps/respond (action=Approved)', 'Timetable mutated (master or exception). Students & Teachers notified via WebSocket.'],
        ['Rejected', 'Teacher B posts /swaps/respond (action=Rejected)', 'SwapRequest status updated; Teacher A notified. No timetable change.'],
      ].map(([s, t, e], i) => new TableRow({ children: [
        dataCell(bold(s, { size: 19, color: s==='Pending'?C.orange : s==='Approved'?C.green : C.red }), i%2===0 ? C.white : C.lightBlue, 1800),
        dataCell(code(t), i%2===0 ? C.white : C.lightBlue, 2500),
        dataCell(txt(e, { size: 18 }), i%2===0 ? C.white : C.lightBlue, 5060)
      ]})))
    ]
  }),
  ...spacer(2),

  // POST /swaps/request
  ...endpointBlock(
    'POST', '/api/swaps/request',
    'Teacher A initiates a swap request with Teacher B',
    'Saves a new SwapRequest document in Pending state. Before saving, the Conflict Validation Engine runs two checks: (1) Domino Check — is Teacher A already assigned somewhere during Teacher B\'s slot? (2) Receiver Clash Check — is Teacher B available during Teacher A\'s slot? If the domino check triggers, the endpoint still saves the request (it does NOT hard-block) but returns hasDominoConflict: true in the response so the frontend can prompt Teacher A to resolve secondary conflicts. Teacher B receives an immediate WebSocket push notification.',
    'Swaps',
    [],
    [
      { field: 'receiverId', type: 'ObjectId (string)', required: true, example: '64def...', desc: 'MongoDB _id of Teacher B (the swap partner)' },
      { field: 'senderOriginalSlot.dayOfWeek', type: 'string', required: true, example: 'Monday', desc: 'The day Teacher A\'s lecture to be swapped falls on' },
      { field: 'senderOriginalSlot.slotNumber', type: 'number', required: true, example: '3', desc: 'Teacher A\'s slot number' },
      { field: 'senderOriginalSlot.semester', type: 'number', required: true, example: '4', desc: 'Teacher A\'s lecture semester' },
      { field: 'senderOriginalSlot.division', type: 'string', required: true, example: 'A', desc: 'Teacher A\'s lecture division' },
      { field: 'senderOriginalSlot.subject', type: 'string', required: true, example: 'DBMS', desc: 'Teacher A\'s subject for this slot' },
      { field: 'receiverOriginalSlot.*', type: 'object', required: true, example: '{ dayOfWeek, slotNumber, ... }', desc: 'Same structure as senderOriginalSlot but for Teacher B\'s lecture' },
      { field: 'isPermanent', type: 'boolean', required: true, example: 'false', desc: 'true = modify MasterTimetable permanently. false = create temporary ScheduleException.' },
      { field: 'targetDate', type: 'string (ISO 8601)', required: false, example: '2025-09-15', desc: 'Required if isPermanent = false. The specific date for the one-day swap.' },
    ],
    [
      { code: 201, status: 'Created — Swap request submitted', schema: '{ success: true, data: { swapRequestId, status: "Pending", hasDominoConflict: false | true, conflictDetails?: { semester, slotNumber } } }' },
      { code: 400, status: 'Bad Request — targetDate missing for temporary swap', schema: '{ success: false, error: { code: "MISSING_TARGET_DATE" } }' },
      { code: 409, status: 'Conflict — Teacher B unavailable for Teacher A\'s slot', schema: '{ success: false, error: { code: "RECEIVER_SLOT_CONFLICT" } }' },
    ],
    'swapController.initiateSwap'
  ),

  // POST /swaps/respond/:requestId
  ...endpointBlock(
    'POST', '/api/swaps/respond/:requestId',
    'Teacher B approves or rejects a pending swap request',
    'Only the designated receiver (Teacher B) may call this endpoint. If action = "Approved": for permanent swaps, two MasterTimetable documents are updated (sender gets receiver\'s slot, receiver gets sender\'s slot). For temporary swaps, two ScheduleException documents are created for targetDate. A WebSocket event is broadcast to all affected rooms on approval. If action = "Rejected", only the SwapRequest status is updated.',
    'Swaps',
    [
      { name: 'requestId', in: 'path', type: 'ObjectId (string)', desc: 'MongoDB _id of the SwapRequest document' },
    ],
    [
      { field: 'action', type: 'enum', required: true, example: 'Approved', desc: 'One of: Approved | Rejected' },
    ],
    [
      { code: 200, status: 'OK', schema: '{ success: true, message: "Swap Approved and timetable updated" | "Swap Rejected", data: { swapRequestId, status } }' },
      { code: 403, status: 'Forbidden — Caller is not the designated receiver', schema: '{ success: false, error: { code: "FORBIDDEN" } }' },
      { code: 404, status: 'Not Found — SwapRequest does not exist', schema: '{ success: false, error: { code: "SWAP_NOT_FOUND" } }' },
      { code: 409, status: 'Conflict — SwapRequest already actioned', schema: '{ success: false, error: { code: "SWAP_ALREADY_ACTIONED" } }' },
    ],
    'swapController.handleResponse'
  ),

  // GET /swaps/pending
  ...endpointBlock(
    'GET', '/api/swaps/pending',
    'List all swap requests pending the logged-in teacher\'s action',
    'Returns all SwapRequest documents where receiverId = current user\'s _id AND status = "Pending". Teachers use this to see incoming swap requests on their dashboard. Populated with sender\'s name and slot details for display.',
    'Swaps',
    [],
    null,
    [
      { code: 200, status: 'OK', schema: '{ success: true, data: [ { _id, sender: {name}, senderOriginalSlot, receiverOriginalSlot, isPermanent, targetDate?, createdAt } ] }' },
    ],
    'swapController.getPendingSwaps'
  ),

  // GET /swaps/history
  ...endpointBlock(
    'GET', '/api/swaps/history',
    'Retrieve the swap request history for the current user',
    'Returns all SwapRequest documents where the user is either the sender or the receiver, regardless of status (Pending, Approved, Rejected). Supports pagination via page and limit query parameters. Sorted by createdAt descending (most recent first).',
    'Swaps',
    [
      { name: 'page', in: 'query', type: 'number', desc: 'Page number for pagination. Default: 1' },
      { name: 'limit', in: 'query', type: 'number', desc: 'Results per page. Default: 20, Max: 100' },
      { name: 'status', in: 'query', type: 'enum', desc: 'Filter by Pending | Approved | Rejected. Omit for all.' },
    ],
    null,
    [
      { code: 200, status: 'OK', schema: '{ success: true, data: [...], meta: { page, limit, total } }' },
    ],
    'swapController.getSwapHistory'
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 5. FREE SLOTS ──────────────────────────────────────────────────────
  ...sectionTitle('🆓', 'Section 5 — Free Lecture Endpoints', 'Base path: /api/free-slots'),
  para([
    txt('A "Free Lecture" is a ', { size: 20 }),
    bold('ScheduleException', { size: 20, color: C.navy }),
    txt(' document with isFreeLecture = true and assignedTeacherId = null. Once any other eligible teacher claims it, assignedTeacherId is populated and the slot is no longer free. The original teacher may revoke it only while unclaimed.', { size: 20 })
  ], { spacing: { before: 0, after: 240 } }),

  // POST /free-slots/declare
  ...endpointBlock(
    'POST', '/api/free-slots/declare',
    'Mark a lecture slot as a Free Lecture for a specific date',
    'Creates a ScheduleException record with isFreeLecture = true and assignedTeacherId = null. The calling teacher is stored as originalTeacherId. Immediately broadcasts a WebSocket push to the faculty room notifying all teachers in the same semester of the available slot. Used by a teacher when they know they will be absent or unavailable for a particular slot on a particular date.',
    'Free Slots',
    [],
    [
      { field: 'slotNumber', type: 'number', required: true, example: '3', desc: 'The lecture slot number to mark as free' },
      { field: 'semester', type: 'number', required: true, example: '4', desc: 'The semester this slot belongs to' },
      { field: 'division', type: 'string', required: true, example: 'B', desc: 'The division this slot belongs to' },
      { field: 'date', type: 'string (ISO 8601)', required: true, example: '2025-09-10', desc: 'The specific date this free lecture applies to' },
      { field: 'reason', type: 'string', required: false, example: 'Medical Leave', desc: 'Optional reason for marking as free; included in faculty notification' },
    ],
    [
      { code: 201, status: 'Created — Free lecture declared', schema: '{ success: true, data: { exceptionId, slotNumber, semester, division, date, isFreeLecture: true } }' },
      { code: 409, status: 'Conflict — Slot already has an exception on that date', schema: '{ success: false, error: { code: "EXCEPTION_EXISTS" } }' },
      { code: 404, status: 'Not Found — No master slot found for that teacher', schema: '{ success: false, error: { code: "SLOT_NOT_FOUND" } }' },
    ],
    'freeSlotController.declareFree'
  ),

  // POST /free-slots/claim/:exceptionId
  ...endpointBlock(
    'POST', '/api/free-slots/claim/:exceptionId',
    'Claim an available free lecture slot',
    'Finds the ScheduleException document by exceptionId, verifies it is still unclaimed (assignedTeacherId = null) and the claiming teacher is not already booked for that same slot number and date. Sets assignedTeacherId to the current teacher and updates the subject field. Broadcasts a WebSocket update to students and teachers in the affected semester/division. The original teacher can no longer revoke after a claim.',
    'Free Slots',
    [
      { name: 'exceptionId', in: 'path', type: 'ObjectId (string)', desc: 'MongoDB _id of the ScheduleException document representing the free slot' },
    ],
    [
      { field: 'subject', type: 'string', required: true, example: 'Operating Systems', desc: 'The subject the claiming teacher will cover during this slot' },
    ],
    [
      { code: 200, status: 'OK — Slot claimed', schema: '{ success: true, message: "You have claimed slot 3 on 2025-09-10", data: { exceptionId, assignedTeacherId, subject } }' },
      { code: 409, status: 'Conflict — Slot already claimed by another teacher', schema: '{ success: false, error: { code: "SLOT_ALREADY_CLAIMED" } }' },
      { code: 409, status: 'Conflict — Claiming teacher already has a lecture at this time', schema: '{ success: false, error: { code: "TEACHER_BUSY" } }' },
      { code: 404, status: 'Not Found — Exception document not found', schema: '{ success: false, error: { code: "EXCEPTION_NOT_FOUND" } }' },
    ],
    'freeSlotController.claimFree'
  ),

  // DELETE /free-slots/revoke/:exceptionId
  ...endpointBlock(
    'DELETE', '/api/free-slots/revoke/:exceptionId',
    'Revoke a previously declared free lecture (only before it is claimed)',
    'Deletes the ScheduleException document entirely, restoring the original MasterTimetable entry as the effective schedule for that day. Only the teacher who originally declared the free lecture (originalTeacherId) may call this endpoint. Revocation is blocked once assignedTeacherId is populated — the original teacher must coordinate directly with the claiming teacher in that case. Broadcasts a WebSocket event to notify the faculty room that the slot is no longer available.',
    'Free Slots',
    [
      { name: 'exceptionId', in: 'path', type: 'ObjectId (string)', desc: 'MongoDB _id of the ScheduleException document to revoke' },
    ],
    null,
    [
      { code: 200, status: 'OK — Revoked successfully', schema: '{ success: true, message: "Free lecture revoked. Original schedule restored." }' },
      { code: 403, status: 'Forbidden — Caller is not the original teacher', schema: '{ success: false, error: { code: "FORBIDDEN" } }' },
      { code: 409, status: 'Conflict — Slot already claimed; revocation not allowed', schema: '{ success: false, error: { code: "SLOT_CLAIMED_CANNOT_REVOKE" } }' },
      { code: 404, status: 'Not Found', schema: '{ success: false, error: { code: "EXCEPTION_NOT_FOUND" } }' },
    ],
    'freeSlotController.revokeFree'
  ),

  // GET /free-slots/available
  ...endpointBlock(
    'GET', '/api/free-slots/available',
    'List all unclaimed free lecture slots for a semester',
    'Returns all ScheduleException documents where isFreeLecture = true AND assignedTeacherId = null, filtered by semester (required). Used to populate the "Available Free Slots" pool panel on the Teacher Dashboard. Only shows future or same-day slots; past free slots are excluded.',
    'Free Slots',
    [
      { name: 'semester', in: 'query', type: 'number', desc: 'Required. Filter free slots to a specific semester' },
      { name: 'date', in: 'query', type: 'string (ISO)', desc: 'Optional. Show free slots from this date onwards. Defaults to today.' },
    ],
    null,
    [
      { code: 200, status: 'OK', schema: '{ success: true, data: [ { _id, date, slotNumber, semester, division, originalTeacher: {name}, reason? } ] }' },
    ],
    'freeSlotController.getAvailable'
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 6. NOTIFICATIONS ──────────────────────────────────────────────────
  ...sectionTitle('🔔', 'Section 6 — Notification Endpoints', 'Base path: /api/notifications'),

  // GET /notifications
  ...endpointBlock(
    'GET', '/api/notifications',
    'Fetch all notifications for the current user',
    'Returns Notification documents targeted at the current user\'s role, semester, and division. For Students, filters by their semester + division. For Teachers, returns faculty-wide notifications plus any targeted directly at them. Sorted newest first. Supports pagination and unread-only filtering.',
    'Notifications',
    [
      { name: 'unreadOnly', in: 'query', type: 'boolean', desc: 'If true, returns only notifications the user has not yet read. Default: false.' },
      { name: 'page', in: 'query', type: 'number', desc: 'Page number. Default: 1' },
      { name: 'limit', in: 'query', type: 'number', desc: 'Results per page. Default: 20' },
    ],
    null,
    [
      { code: 200, status: 'OK', schema: '{ success: true, data: [ { _id, message, createdAt, isRead } ], meta: { unreadCount, page, total } }' },
    ],
    'notificationController.getNotifications'
  ),

  // PUT /notifications/:notifId/read
  ...endpointBlock(
    'PUT', '/api/notifications/:notifId/read',
    'Mark a specific notification as read',
    'Updates the isRead flag on the Notification document to true for the requesting user. Idempotent — calling it multiple times produces the same result.',
    'Notifications',
    [{ name: 'notifId', in: 'path', type: 'ObjectId (string)', desc: 'MongoDB _id of the Notification to mark as read' }],
    null,
    [
      { code: 200, status: 'OK', schema: '{ success: true, message: "Notification marked as read" }' },
      { code: 404, status: 'Not Found', schema: '{ success: false, error: { code: "NOTIFICATION_NOT_FOUND" } }' },
    ],
    'notificationController.markRead'
  ),

  // PUT /notifications/read-all
  ...endpointBlock(
    'PUT', '/api/notifications/read-all',
    'Mark all notifications as read for the current user',
    'Bulk-updates all unread Notification documents targeted at the current user, setting isRead = true. Useful for the "Mark all as read" button on the notification panel.',
    'Notifications',
    [],
    null,
    [
      { code: 200, status: 'OK', schema: '{ success: true, message: "All notifications marked as read" }' },
    ],
    'notificationController.markAllRead'
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 7. WEBSOCKET ──────────────────────────────────────────────────────
  ...sectionTitle('⚡', 'Section 7 — WebSocket Event Contract', 'Real-time events via Socket.io'),
  para([txt('All real-time communication is handled via ', { size: 20 }), bold('Socket.io', { size: 20, color: C.navy }), txt('. Clients connect on app load and join rooms based on their profile. State-changing DB operations trigger server-to-client broadcasts to the relevant rooms.', { size: 20 })], { spacing: { before: 0, after: 240 } }),

  h2('7.1  Room Joining Convention'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 3000, 3960],
    rows: [
      new TableRow({ children: [headerCell('User Role', C.teal, 2400), headerCell('Room Name Pattern', C.teal, 3000), headerCell('Example', C.teal, 3960)] }),
      ...([
        ['Student', 'room:sem_{N}_div_{X}', 'room:sem_4_div_A'],
        ['Teacher', 'room:faculty', 'room:faculty  (global teacher room)'],
        ['Admin', 'room:admin', 'room:admin'],
      ].map(([r, p, e], i) => new TableRow({ children: [
        dataCell(txt(r, { size: 19, bold: true, color: C.navy }), i%2===0 ? C.white : C.lightTeal, 2400),
        dataCell(code(p), i%2===0 ? C.white : C.lightTeal, 3000),
        dataCell(code(e), i%2===0 ? C.white : C.lightTeal, 3960)
      ]})))
    ]
  }),
  ...spacer(2),
  h2('7.2  Server-to-Client Events'),
  ...wsEventTable([
    { event: 'timetable:updated', dir: 'Server → Client', room: 'room:sem_{N}_div_{X}', desc: 'Emitted when any approved swap or free-slot claim affects a specific semester/division. Payload: { semester, division, message, slot? }' },
    { event: 'swap:new_request', dir: 'Server → Client', room: 'room:faculty (targeted by userId)', desc: 'Sent to Teacher B when Teacher A initiates a swap request. Payload: { swapRequestId, senderName, senderSlot, receiverSlot, isPermanent }' },
    { event: 'swap:actioned', dir: 'Server → Client', room: 'room:faculty (targeted by userId)', desc: 'Sent to Teacher A when Teacher B approves or rejects the swap. Payload: { swapRequestId, action: "Approved"|"Rejected" }' },
    { event: 'freeslot:declared', dir: 'Server → Client', room: 'room:faculty', desc: 'Broadcast to all faculty when a new free slot is declared. Payload: { exceptionId, semester, division, slotNumber, date, teacherName, reason? }' },
    { event: 'freeslot:claimed', dir: 'Server → Client', room: 'room:faculty + room:sem_{N}_div_{X}', desc: 'Fired when a free slot is successfully claimed. Notifies faculty and affected students. Payload: { exceptionId, claimerName, subject, slotNumber, date }' },
    { event: 'freeslot:revoked', dir: 'Server → Client', room: 'room:faculty', desc: 'Broadcast when a declared free slot is revoked before claiming. Payload: { exceptionId, slotNumber, date }' },
    { event: 'notification:push', dir: 'Server → Client', room: 'Varies (targeted)', desc: 'Generic notification push. Payload: { _id, message, createdAt }. Clients increment their unread badge.' },
  ]),

  h2('7.3  Client-to-Server Events'),
  ...wsEventTable([
    { event: 'join_rooms', dir: 'Client → Server', room: '(triggers room join)', desc: 'Client emits on connect with payload { role, semester?, division?, userId } so the server adds the socket to correct rooms.' },
    { event: 'ping', dir: 'Client → Server', room: '—', desc: 'Heartbeat event to keep the connection alive. Server responds with pong.' },
  ]),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 8. DATA MODELS ────────────────────────────────────────────────────
  ...sectionTitle('🗄️', 'Section 8 — Data Models (MongoDB Schemas)', 'Mongoose schema reference for all collections'),

  ...schemaTable('User Collection', [
    { field: '_id', type: 'ObjectId', required: true, desc: 'Auto-generated MongoDB document ID' },
    { field: 'name', type: 'String', required: true, desc: 'Full name of the user' },
    { field: 'email', type: 'String (unique)', required: true, desc: 'Used as login credential; must be unique across all users' },
    { field: 'password', type: 'String (hashed)', required: true, desc: 'bcrypt hash; never returned in API responses' },
    { field: 'role', type: 'Enum', required: true, desc: 'One of: Admin | Teacher | Student' },
    { field: 'subjectsTaught', type: 'String[]', required: false, desc: 'Teacher only. Array of subjects the teacher is qualified to teach.' },
    { field: 'semester', type: 'Number', required: false, desc: 'Student only. The semester the student is enrolled in.' },
    { field: 'division', type: 'String', required: false, desc: 'Student only. Division label e.g. A, B, C.' },
    { field: 'createdAt', type: 'Date', required: true, desc: 'Auto-set by Mongoose timestamps: true option.' },
  ]),

  ...schemaTable('MasterTimetable Collection', [
    { field: '_id', type: 'ObjectId', required: true, desc: 'Document ID' },
    { field: 'dayOfWeek', type: 'Enum', required: true, desc: 'Monday | Tuesday | Wednesday | Thursday | Friday | Saturday' },
    { field: 'slotNumber', type: 'Number', required: true, desc: 'Lecture number within the day (1–8 typically)' },
    { field: 'semester', type: 'Number', required: true, desc: 'Semester this slot is scheduled for' },
    { field: 'division', type: 'String', required: true, desc: 'Division this slot is scheduled for' },
    { field: 'teacherId', type: 'ObjectId → User', required: true, desc: 'Reference to the assigned teacher' },
    { field: 'subject', type: 'String', required: true, desc: 'Subject or course name' },
  ]),

  ...schemaTable('ScheduleException Collection', [
    { field: '_id', type: 'ObjectId', required: true, desc: 'Document ID' },
    { field: 'date', type: 'Date', required: true, desc: 'The specific calendar date this exception applies to (not a day of week)' },
    { field: 'slotNumber', type: 'Number', required: true, desc: 'Slot number being overridden' },
    { field: 'semester', type: 'Number', required: true, desc: 'Affected semester' },
    { field: 'division', type: 'String', required: true, desc: 'Affected division' },
    { field: 'isFreeLecture', type: 'Boolean', required: true, desc: 'true = slot is open for any eligible teacher to claim' },
    { field: 'originalTeacherId', type: 'ObjectId → User', required: false, desc: 'The teacher who originally owned this slot in the master timetable' },
    { field: 'assignedTeacherId', type: 'ObjectId → User', required: false, desc: 'The teacher currently assigned to take this slot. null if free and unclaimed.' },
    { field: 'subject', type: 'String', required: false, desc: 'Subject for this exception slot (may differ from master if a different teacher claimed it)' },
  ]),

  ...schemaTable('SwapRequest Collection', [
    { field: '_id', type: 'ObjectId', required: true, desc: 'Document ID' },
    { field: 'senderId', type: 'ObjectId → User', required: true, desc: 'Teacher A — the initiator of the swap' },
    { field: 'receiverId', type: 'ObjectId → User', required: true, desc: 'Teacher B — the recipient of the swap request' },
    { field: 'senderOriginalSlot', type: 'Embedded Object', required: true, desc: 'Fields: { dayOfWeek, slotNumber, semester, division, subject }' },
    { field: 'receiverOriginalSlot', type: 'Embedded Object', required: true, desc: 'Fields: { dayOfWeek, slotNumber, semester, division, subject }' },
    { field: 'isPermanent', type: 'Boolean', required: true, desc: 'true = MasterTimetable will be mutated on approval. false = ScheduleException created for targetDate.' },
    { field: 'targetDate', type: 'Date', required: false, desc: 'Required when isPermanent = false. The date the one-time swap takes effect.' },
    { field: 'status', type: 'Enum', required: true, desc: 'Pending | Approved | Rejected. Default: Pending.' },
    { field: 'createdAt', type: 'Date', required: true, desc: 'Auto-set on document creation.' },
  ]),

  ...schemaTable('Notification Collection', [
    { field: '_id', type: 'ObjectId', required: true, desc: 'Document ID' },
    { field: 'recipientRoles', type: 'String[]', required: true, desc: 'Array of roles this notification targets: [\'Student\'] or [\'Teacher\'] or both' },
    { field: 'semester', type: 'Number', required: false, desc: 'Narrows delivery to a specific semester. null = applies to all.' },
    { field: 'division', type: 'String', required: false, desc: 'Narrows delivery to a specific division. null = applies to all divisions in the semester.' },
    { field: 'userId', type: 'ObjectId → User', required: false, desc: 'If set, notification targets only this specific user (e.g., swap requester).' },
    { field: 'message', type: 'String', required: true, desc: 'Human-readable notification text e.g. "Lecture 3 of Prof. Mehta is swapped with Slot 4 of Prof. Shah on Monday."' },
    { field: 'isRead', type: 'Boolean', required: true, desc: 'Tracks whether the recipient has seen this notification. Default: false.' },
    { field: 'createdAt', type: 'Date', required: true, desc: 'Auto-set on creation.' },
  ]),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 9. ERROR CODES ────────────────────────────────────────────────────
  ...sectionTitle('⚠️', 'Section 9 — Global Error Code Reference', 'All machine-readable error codes used across the API'),
  ...errorTable([
    { code: 400, key: 'MISSING_PARAMS',           desc: 'Required query parameters were not provided in the request.' },
    { code: 400, key: 'MISSING_TARGET_DATE',       desc: 'A temporary swap was requested but no targetDate was provided.' },
    { code: 400, key: 'VALIDATION_ERROR',          desc: 'One or more request body fields failed schema validation. See error.details array.' },
    { code: 401, key: 'UNAUTHORIZED',              desc: 'No Authorization header present or the JWT is malformed.' },
    { code: 401, key: 'TOKEN_EXPIRED',             desc: 'The JWT access token has passed its expiry time. Client should call /auth/refresh-token.' },
    { code: 401, key: 'REFRESH_TOKEN_INVALID',     desc: 'The provided refresh token is invalid, expired, or has been blacklisted.' },
    { code: 401, key: 'INVALID_CREDENTIALS',       desc: 'Email and password combination did not match any user record.' },
    { code: 403, key: 'FORBIDDEN',                 desc: 'The authenticated user does not have permission to perform this action based on their role.' },
    { code: 404, key: 'USER_NOT_FOUND',            desc: 'The requested userId does not correspond to any user in the database.' },
    { code: 404, key: 'SWAP_NOT_FOUND',            desc: 'The swapRequestId provided does not match any SwapRequest document.' },
    { code: 404, key: 'EXCEPTION_NOT_FOUND',       desc: 'The ScheduleException document (for free slot operations) was not found.' },
    { code: 404, key: 'SLOT_NOT_FOUND',            desc: 'No MasterTimetable record found matching the provided semester/division/day/slot.' },
    { code: 404, key: 'NOTIFICATION_NOT_FOUND',    desc: 'The notification ID provided does not exist or does not belong to this user.' },
    { code: 409, key: 'SLOT_CONFLICT',             desc: 'Creating a master timetable slot would double-book the teacher in the same time slot.' },
    { code: 409, key: 'RECEIVER_SLOT_CONFLICT',    desc: 'Teacher B is already scheduled for Teacher A\'s proposed slot; the swap is blocked.' },
    { code: 409, key: 'SWAP_ALREADY_ACTIONED',     desc: 'A respond action was attempted on a SwapRequest that is no longer in Pending state.' },
    { code: 409, key: 'EMAIL_CONFLICT',            desc: 'A user account with the provided email already exists.' },
    { code: 409, key: 'EXCEPTION_EXISTS',          desc: 'A ScheduleException already exists for this date/slot/semester/division combination.' },
    { code: 409, key: 'SLOT_ALREADY_CLAIMED',      desc: 'Another teacher has already claimed this free lecture slot before this request arrived.' },
    { code: 409, key: 'TEACHER_BUSY',              desc: 'The teacher attempting to claim a free slot already has a lecture at that time on that date.' },
    { code: 409, key: 'SLOT_CLAIMED_CANNOT_REVOKE',desc: 'The free slot has already been claimed; the original teacher can no longer revoke it.' },
    { code: 500, key: 'INTERNAL_SERVER_ERROR',     desc: 'An unexpected server-side error occurred. Check server logs for details.' },
  ]),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 10. CONFLICT ENGINE ───────────────────────────────────────────────
  ...sectionTitle('🧠', 'Section 10 — Conflict Validation Engine', 'Algorithmic flow for swap domino detection'),
  h2('10.1  Conflict Check Flow (swapController.initiateSwap)'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [600, 2600, 6160],
    rows: [
      new TableRow({ children: [headerCell('Step', C.navy, 600), headerCell('Check', C.navy, 2600), headerCell('Logic & Outcome', C.navy, 6160)] }),
      ...([
        ['1', 'Receiver Clash Check', 'Query MasterTimetable + ScheduleExceptions for Teacher B on Teacher A\'s senderOriginalSlot (same dayOfWeek + slotNumber + targetDate). If a record exists → return 409 RECEIVER_SLOT_CONFLICT. Hard block.'],
        ['2', 'Domino Check (Teacher A)', 'Query MasterTimetable + ScheduleExceptions for Teacher A on Teacher B\'s receiverOriginalSlot (same dayOfWeek + slotNumber, across ALL semesters/divisions). If a clash is found across any other semester → do NOT block. Save the SwapRequest as Pending, but return hasDominoConflict: true + conflictDetails in response body.'],
        ['3', 'Frontend Prompt', 'On hasDominoConflict: true, the frontend shows a warning modal: "You already have a lecture in Sem X, Div Y at this time. You must either swap or declare it as a Free Lecture before this swap can go through."'],
        ['4', 'Teacher B Notification', 'Regardless of domino outcome, Teacher B is notified via WebSocket event swap:new_request about the pending request.'],
      ].map(([s, c, l], i) => new TableRow({ children: [
        dataCell(bold(s, { size: 20, color: C.navy }), i%2===0 ? C.white : C.lightBlue, 600),
        dataCell(bold(c, { size: 18 }), i%2===0 ? C.white : C.lightBlue, 2600),
        dataCell(txt(l, { size: 18 }), i%2===0 ? C.white : C.lightBlue, 6160)
      ]})))
    ]
  }),
  ...spacer(1),
  h2('10.2  Response Shape When Domino Conflict Detected'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: allBorders('DDDDDD', 4),
      shading: { fill: C.codeBg, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: [
        para(code('{')),
        para(code('  "success": true,')),
        para(code('  "data": {')),
        para(code('    "swapRequestId": "64xyz...", "status": "Pending",')),
        para(code('    "hasDominoConflict": true,')),
        para(code('    "conflictDetails": { "semester": 2, "division": "B", "slotNumber": 4, "dayOfWeek": "Monday" }')),
        para(code('  }')),
        para(code('}')),
      ]
    })] })]
  }),
  ...spacer(2),

  // ── FOOTER NOTE ───────────────────────────────────────────────────────
  new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.blue } },
    spacing: { before: 400, after: 120 },
    children: [bold('Dynamic College Timetable Management System — API Contract v1.0.0', { size: 18, color: C.navy })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [txt('Built with MERN Stack (MongoDB · Express.js · React · Node.js) + Socket.io WebSockets', { size: 18, color: C.gray })]
  }),
];

// ════════════════════════════════════════════════════════════════════════════
//  BUILD DOCUMENT
// ════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: C.navy },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: C.navy },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: C.darkGray },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Table({
          width: { size: 10080, type: WidthType.DXA },
          columnWidths: [7000, 3080],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: { ...noBorders(), bottom: border(C.blue, 6) },
              margins: { top: 0, bottom: 80, left: 0, right: 0 },
              children: [para(bold('Dynamic College Timetable Management System', { size: 18, color: C.navy }))]
            }),
            new TableCell({
              borders: { ...noBorders(), bottom: border(C.blue, 6) },
              margins: { top: 0, bottom: 80, left: 0, right: 0 },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [txt('API Contract v1.0.0', { size: 18, color: C.gray })] })]
            })
          ]})]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: border(C.lightGray, 4) },
          spacing: { before: 80 },
          children: [
            txt('Page ', { size: 18, color: C.gray }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: C.gray }),
            txt(' of ', { size: 18, color: C.gray }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: C.gray }),
            txt('  |  MERN + WebSocket  |  OpenAPI Design Contract', { size: 18, color: C.gray }),
          ]
        })]
      })
    },
    children: docChildren
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/CLG_API_Contract.docx', buffer);
  console.log('✅  Document written to /mnt/user-data/outputs/CLG_API_Contract.docx');
}).catch(err => {
  console.error('❌  Error:', err);
});
