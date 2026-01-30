const http = require('http');

function getAppointments() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000/api/appointments', (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    }).on('error', reject);
  });
}

(async () => {
  try {
    const events = await getAppointments();
    const q = 'pruebaformula';
    const results = (events || []).filter(ev => {
      const name = (ev.title || '').toString().toLowerCase();
      const phone = (ev.clientPhone || '').toString().toLowerCase();
      if (q && !name.includes(q) && !phone.includes(q)) return false;
      return true;
    }).map(ev => ({ id: ev.id, title: ev.title, clientPhone: ev.clientPhone, start: ev.start || ev.fecha || ev.startStr || ev.date, end: ev.end || ev.endStr || ev._end || null, employeeId: ev.employeeId, category: ev.category, price: ev.price, isPaid: ev.isPaid, ptv: ev.ptv, formula: ev.formula }));

    console.log('Results sample:', results.slice(0,5));
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
