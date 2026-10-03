// End-to-End Pipeline Verification Script
const http = require('http');

async function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let respData = '';
        res.on('data', (chunk) => (respData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(respData) });
          } catch {
            resolve({ status: res.statusCode, raw: respData });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getJson(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + (parsed.search || ''),
        method: 'GET',
      },
      (res) => {
        let respData = '';
        res.on('data', (chunk) => (respData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(respData) });
          } catch {
            resolve({ status: res.statusCode, raw: respData });
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing Email Import for CSG Hackathon & Workshop ---');
  const res1 = await postJson('http://localhost:3000/oryn/events/import-from-email', {
    club: {
      name: 'Computer Science Guild (CSG)',
      email: 'csg@iiitdm.ac.in',
      category: 'Technical',
      description: 'The official Computer Science and Engineering club at IIITDM Kancheepuram.',
    },
    event: {
      title: 'DevHack 2026: Campus Agentic Hackathon',
      summary: '24-hour flagship hackathon on autonomous agents and AI tooling.',
      description: 'Build real-world autonomous applications with API keys and mentors provided.\nVenue: LHC-101\nPerks: OD attendance, certificates, food & refreshments, cash prizes worth Rs. 25,000.',
      location: 'LHC-101',
      building: 'Lecture Hall Complex',
      room_number: '101',
      event_time: '2026-09-26T04:30:00.000Z', // 10:00 AM IST
      event_end_time: '2026-09-27T04:30:00.000Z',
      priority: 'Important',
      tags: ['Technical', 'Workshops', 'OD Available', 'Certificates', 'Refreshments', 'Prizes'],
      requires_action: true,
      action_label: 'Apply on Unstop',
      action_url: 'https://unstop.com/devhack-2026',
    },
  });
  console.log('Result 1:', res1.status, res1.data?.success ? 'SUCCESS' : res1.data);

  console.log('\n--- 2. Testing Email Import for Cultural Affairs Music Jam ---');
  const res2 = await postJson('http://localhost:3000/oryn/events/import-from-email', {
    club: {
      name: 'Cultural Affairs Council',
      email: 'cultural@iiitdm.ac.in',
      category: 'Cultural',
      description: 'Official cultural body organizing fests, arts, and student talent showcases.',
    },
    event: {
      title: 'Monsoon Beats: Live Acoustic Jam Night',
      summary: 'Open mic musical jamming session under the stars.',
      description: 'Bring your instruments and voices for an evening of acoustic melodies.\nVenue: Open Air Theatre (OAT)\nRefreshments will be served.',
      location: 'Open Air Theatre (OAT)',
      building: 'Campus Center',
      event_time: '2026-09-28T12:30:00.000Z', // 6:00 PM IST
      event_end_time: '2026-09-28T15:30:00.000Z',
      priority: 'Community',
      tags: ['Cultural', 'Refreshments', 'Free Entry'],
      requires_action: false,
    },
  });
  console.log('Result 2:', res2.status, res2.data?.success ? 'SUCCESS' : res2.data);

  console.log('\n--- 3. Testing Email Import for Robotics Club Drone Workshop ---');
  const res3 = await postJson('http://localhost:3000/oryn/events/import-from-email', {
    club: {
      name: 'Robotics Club',
      email: 'robotics@iiitdm.ac.in',
      category: 'Technical',
      description: 'Official Robotics and Automation Society of IIITDM Kancheepuram.',
    },
    event: {
      title: 'Autonomous Drone Flight & Telemetry Workshop',
      summary: 'Hands-on hardware workshop building micro quadcopters with telemetry.',
      description: 'Assemble flight controllers and configure PID loops.\nVenue: Lab 509\nHardware kits provided, certificates & OD given.',
      location: 'Lab 509',
      building: 'Academic Block',
      room_number: '509',
      event_time: '2026-10-02T08:30:00.000Z', // 2:00 PM IST
      event_end_time: '2026-10-02T11:30:00.000Z',
      priority: 'Important',
      tags: ['Technical', 'Workshops', 'Hands-on Kit', 'Certificates', 'OD Available'],
      requires_action: true,
      action_label: 'Register Now',
      action_url: 'https://forms.gle/droneWorkshop2026',
    },
  });
  console.log('Result 3:', res3.status, res3.data?.success ? 'SUCCESS' : res3.data);

  console.log('\n--- 4. Querying /events/district feed ---');
  const districtRes = await getJson('http://localhost:3000/oryn/events/district');
  console.log(`Retrieved ${districtRes.data?.length || 0} events from district feed:`);
  for (const ev of districtRes.data || []) {
    console.log(`  - [${ev.priority}] ${ev.title}`);
    console.log(`    Club: ${ev.organization_name} (${ev.organization_category})`);
    console.log(`    Time: ${ev.event_time} -> ${ev.event_end_time}`);
    console.log(`    Venue: ${ev.location} (${ev.building || 'Campus'})`);
    console.log(`    Tags: ${JSON.stringify(ev.tags)}`);
    console.log(`    Action: ${ev.action_label} -> ${ev.action_url}`);
  }

  console.log('\n--- 5. Querying /clubs list ---');
  const clubsRes = await getJson('http://localhost:3000/oryn/clubs');
  console.log(`Retrieved ${clubsRes.data?.length || 0} registered clubs:`);
  for (const cl of clubsRes.data || []) {
    console.log(`  - ${cl.name} [${cl.category}]`);
    console.log(`    Official Email: ${cl.contact_email}`);
    console.log(`    Verified: ${cl.verified}, Events Count: ${cl.events_count}`);
  }
}

run().catch(console.error);
