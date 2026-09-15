const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3456;
const WEB_DIR = path.join(__dirname);
const DATA_DIR = path.join(__dirname, 'data');
const MASTER_FILE = path.join(DATA_DIR, 'master_data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to extract initial data if not present on disk
function getInitialData() {
  if (fs.existsSync(MASTER_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));
    } catch (e) {
      console.error('[Server] Error reading master_data.json:', e);
    }
  }

  // Extract from admin.js if master_data.json doesn't exist yet
  try {
    const adminJsPath = path.join(WEB_DIR, 'admin', 'admin.js');
    const adminCode = fs.readFileSync(adminJsPath, 'utf8');
    const match = adminCode.match(/const INITIAL_DATA = (\{[\s\S]*?\n\};)/);
    if (match) {
      // Evaluate JSON safely
      const cleanJsonStr = match[1].replace(/;\s*$/, '');
      const parsed = JSON.parse(cleanJsonStr);
      fs.writeFileSync(MASTER_FILE, JSON.stringify(parsed, null, 2), 'utf8');
      return parsed;
    }
  } catch (e) {
    console.error('[Server] Could not extract INITIAL_DATA:', e);
  }

  return { members: [], courses: [], timetable: [], announcements: [], slotRequests: [], messMenu: [] };
}

let masterData = getInitialData();

function saveMasterData() {
  try {
    fs.writeFileSync(MASTER_FILE, JSON.stringify(masterData, null, 2), 'utf8');
  } catch (e) {
    console.error('[Server] Failed to save master data:', e);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

const server = http.createServer((req, res) => {
  sendCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // ─── API Routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // 1. GET /api/timetable
    if (pathname === '/api/timetable' && req.method === 'GET') {
      let result = masterData.timetable || [];
      const { day, program, semester } = parsedUrl.query;
      if (day) result = result.filter(t => (t.day || '').toLowerCase() === String(day).toLowerCase());
      if (program) result = result.filter(t => (t.program || '').toLowerCase() === String(program).toLowerCase());
      if (semester) result = result.filter(t => (t.semester || '').toLowerCase() === String(semester).toLowerCase());
      
      res.writeHead(200);
      res.end(JSON.stringify(result));
      return;
    }

    // 2. GET /api/courses
    if (pathname === '/api/courses' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(masterData.courses || []));
      return;
    }

    // 3. GET /api/announcements
    if (pathname === '/api/announcements' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(masterData.announcements || []));
      return;
    }

    // 4. GET /api/mess-menu
    if (pathname === '/api/mess-menu' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(masterData.messMenu || []));
      return;
    }

    // 5. GET /api/slot-requests
    if (pathname === '/api/slot-requests' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(masterData.slotRequests || []));
      return;
    }

    // 6. GET /api/master
    if (pathname === '/api/master' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(masterData));
      return;
    }

    // 7. POST /api/sync (Receives full state or delta from admin portal)
    if (pathname === '/api/sync' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          if (payload) {
            masterData = { ...masterData, ...payload };
            saveMasterData();
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: 'Master data synchronized successfully.' }));
            return;
          }
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: err.message }));
          return;
        }
      });
      return;
    }

    // 8. POST /api/slot-requests/approve (Direct endpoint for approving a slot change)
    if (pathname === '/api/slot-requests/approve' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { reqId } = JSON.parse(body);
          const reqItem = (masterData.slotRequests || []).find(r => r.id === reqId);
          if (!reqItem) {
            res.writeHead(404);
            res.end(JSON.stringify({ success: false, error: 'Slot request not found' }));
            return;
          }

          reqItem.status = 'APPROVED';
          reqItem.approvedAt = new Date().toLocaleString();

          // 1. Update Course
          const course = (masterData.courses || []).find(c => c.id === reqItem.courseId || c.code === reqItem.courseCode);
          if (course) {
            course.day = reqItem.targetDay;
            course.slot = reqItem.targetSlot.split(' ')[0];
            course.time = reqItem.targetSlot.includes('(') ? reqItem.targetSlot.match(/\((.*?)\)/)[1] : '10:00 - 10:50';
            course.room = reqItem.targetRoom || course.room;
          }

          // 2. Update Master Timetable
          const ttEntry = (masterData.timetable || []).find(t => t.course_code === reqItem.courseCode);
          if (ttEntry) {
            ttEntry.day = reqItem.targetDay;
            ttEntry.slot = reqItem.targetSlot.split(' ')[0];
            ttEntry.room = reqItem.targetRoom || ttEntry.room;
            if (reqItem.targetSlot.includes('(')) {
              const parts = reqItem.targetSlot.match(/\((.*?)\)/)[1].split('-');
              if (parts.length === 2) {
                ttEntry.start_time = parts[0].trim();
                ttEntry.end_time = parts[1].trim();
              }
            }
          } else {
            let sTime = '10:00', eTime = '10:50';
            if (reqItem.targetSlot.includes('(')) {
              const parts = reqItem.targetSlot.match(/\((.*?)\)/)[1].split('-');
              if (parts.length === 2) {
                sTime = parts[0].trim();
                eTime = parts[1].trim();
              }
            }
            masterData.timetable.push({
              id: 'tt-' + Date.now(),
              day: reqItem.targetDay,
              slot: reqItem.targetSlot.split(' ')[0],
              course_code: reqItem.courseCode,
              course_name: reqItem.courseName,
              faculty: reqItem.facultyName,
              room: reqItem.targetRoom || (course ? course.room : 'L-101'),
              start_time: sTime,
              end_time: eTime,
            });
          }

          // 3. Issue broadcast announcement
          const cTitle = reqItem.courseTitle || reqItem.courseName || (course ? course.title : reqItem.courseCode);
          if (!masterData.announcements) masterData.announcements = [];
          masterData.announcements.unshift({
            id: 'ann-' + Date.now(),
            title: `Slot Change Approved: ${reqItem.courseCode}`,
            category: 'ACADEMICS',
            priority: 'HIGH',
            body: `Official Notice: Slot change request for ${reqItem.courseCode} (${cTitle}) taught by ${reqItem.facultyName} has been APPROVED. New Slot: ${reqItem.targetSlot} on ${reqItem.targetDay}. Student timetables are updated accordingly.`,
            author: 'Dean Academics / Admin Office',
            createdAt: new Date().toLocaleString(),
          });

          saveMasterData();

          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            message: 'Slot request approved and master database synchronized.',
            course,
            timetableEntry: ttEntry,
          }));
          return;
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: err.message }));
          return;
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
    return;
  }

  // ─── Static File Server ──────────────────────────────────────────────────
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(WEB_DIR, safePath);

  // If path is a directory, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Handle route rewrites for clean URLs (e.g. /admin -> /admin/index.html)
  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Oryn Server] Live Web Portal & API listening on http://0.0.0.0:${PORT}`);
});
