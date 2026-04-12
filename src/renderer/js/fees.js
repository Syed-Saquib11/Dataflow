window.feesObj = {};

window.initFees = function () {
  const AVS = ['#4f46e5', '#22c55e', '#ef4444', '#f97316', '#7c3aed', '#06b6d4', '#ec4899', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#14b8a6'];
  function sampleData() {
    return [
      { id: 'F001', name: 'Aarav Sharma', sid: 'STU-001', course: 'Advanced Mathematics', grade: 'Grade 9-A', phone: '9876543210', total: 15000, due: '2025-03-15', payments: [{ date: '2025-01-10', amt: 15000, method: 'UPI', note: 'Full payment' }], notes: '' },
      { id: 'F002', name: 'Priya Patel', sid: 'STU-002', course: 'Physics Fundamentals', grade: 'Grade 9-A', phone: '9876543211', total: 12000, due: '2025-04-15', payments: [{ date: '2025-01-12', amt: 5000, method: 'Cash', note: '' }, { date: '2025-02-08', amt: 4000, method: 'UPI', note: '2nd instalment' }], notes: '' },
      { id: 'F003', name: 'Rohan Kumar', sid: 'STU-003', course: 'English Literature', grade: 'Grade 9-B', phone: '9876543212', total: 10000, due: '2025-05-15', payments: [{ date: '2025-01-15', amt: 2500, method: 'Bank Transfer', note: 'Partial' }], notes: 'Parent contacted' },
      { id: 'F004', name: 'Ananya Singh', sid: 'STU-004', course: 'Computer Science', grade: 'Grade 10-A', phone: '9876543213', total: 20000, due: '2025-06-15', payments: [{ date: '2025-01-20', amt: 10000, method: 'Cheque', note: 'Cheque #123456' }], notes: '' },
      { id: 'F005', name: 'Karthik Nair', sid: 'STU-005', course: 'Chemistry', grade: 'Grade 10-A', phone: '9876543214', total: 13000, due: '2025-02-28', payments: [], notes: 'Awaiting payment' },
      { id: 'F006', name: 'Divya Menon', sid: 'STU-006', course: 'Biology', grade: 'Grade 10-B', phone: '9876543215', total: 11000, due: '2025-01-20', payments: [{ date: '2025-01-08', amt: 11000, method: 'UPI', note: 'Full payment' }], notes: '' },
      { id: 'F007', name: 'Arjun Gupta', sid: 'STU-007', course: 'History & Civics', grade: 'Grade 11-A', phone: '9876543216', total: 9000, due: '2025-03-01', payments: [{ date: '2025-01-18', amt: 3000, method: 'Cash', note: '' }], notes: '' },
      { id: 'F008', name: 'Meera Iyer', sid: 'STU-008', course: 'Economics', grade: 'Grade 11-A', phone: '9876543217', total: 14000, due: '2025-04-30', payments: [{ date: '2025-02-05', amt: 14000, method: 'UPI', note: 'Complete' }], notes: '' },
      { id: 'F009', name: 'Vikas Singh', sid: 'STU-009', course: 'Business Studies', grade: 'Grade 11-B', phone: '9876543218', total: 8500, due: '2025-02-10', payments: [{ date: '2025-01-22', amt: 2000, method: 'Cash', note: '' }], notes: 'Will pay rest next month' },
      { id: 'F010', name: 'Ananya Das', sid: 'STU-010', course: 'Computer Science', grade: 'Grade 12-A', phone: '9876543219', total: 20000, due: '2025-05-01', payments: [{ date: '2025-01-05', amt: 10000, method: 'Bank Transfer', note: '' }, { date: '2025-02-01', amt: 6000, method: 'UPI', note: '2nd part' }], notes: '' },
      { id: 'F011', name: 'Rohan Joshi', sid: 'STU-011', course: 'Advanced Mathematics', grade: 'Grade 12-B', phone: '9876543220', total: 15000, due: '2025-01-15', payments: [{ date: '2025-01-14', amt: 7500, method: 'UPI', note: '' }], notes: 'Reminder sent twice' },
      { id: 'F012', name: 'Nisha Kulkarni', sid: 'STU-012', course: 'Physics Fundamentals', grade: 'Grade 12-B', phone: '9876543221', total: 12000, due: '2025-03-20', payments: [{ date: '2025-02-10', amt: 12000, method: 'Card', note: 'Online payment' }], notes: '' },
      { id: 'F013', name: 'Siddharth Rao', sid: 'STU-013', course: 'Computer Science', grade: 'Grade 9-B', phone: '9876543222', total: 20000, due: '2025-07-10', payments: [{ date: '2025-02-14', amt: 8000, method: 'UPI', note: '1st instalment' }, { date: '2025-03-01', amt: 6000, method: 'Bank Transfer', note: '2nd instalment' }], notes: '' },
      { id: 'F014', name: 'Kavya Bhat', sid: 'STU-014', course: 'Chemistry', grade: 'Grade 11-B', phone: '9876543223', total: 13000, due: '2025-08-01', payments: [{ date: '2025-02-20', amt: 13000, method: 'Card', note: 'Full online payment' }], notes: 'Paid in full' },
      { id: 'F015', name: 'Aditya Kumar', sid: 'STU-015', course: 'Biology', grade: 'Grade 9-A', phone: '9876543224', total: 11000, due: '2025-03-25', payments: [], notes: 'Fee waiver requested' },
      { id: 'F016', name: 'Pooja Agarwal', sid: 'STU-016', course: 'Advanced Mathematics', grade: 'Grade 10-B', phone: '9876543225', total: 15000, due: '2025-04-05', payments: [{ date: '2025-01-28', amt: 5000, method: 'Cash', note: 'Partial payment' }, { date: '2025-02-25', amt: 5000, method: 'Cash', note: '2nd instalment' }], notes: 'One more instalment pending' },
      { id: 'F017', name: 'Nikhil Choudh.', sid: 'STU-017', course: 'Economics', grade: 'Grade 12-A', phone: '9876543226', total: 14000, due: '2025-02-15', payments: [{ date: '2025-01-30', amt: 4000, method: 'UPI', note: '' }], notes: 'Overdue — contacted parent' },
      { id: 'F018', name: 'Riya Malhotra', sid: 'STU-018', course: 'English Literature', grade: 'Grade 10-A', phone: '9876543227', total: 10000, due: '2025-06-20', payments: [{ date: '2025-02-12', amt: 10000, method: 'Cheque', note: 'Cheque #789012' }], notes: '' },
      { id: 'F019', name: 'Amit Tiwari', sid: 'STU-019', course: 'History & Civics', grade: 'Grade 11-B', phone: '9876543228', total: 9000, due: '2025-03-10', payments: [{ date: '2025-01-25', amt: 2000, method: 'Cash', note: '' }, { date: '2025-02-18', amt: 2000, method: 'UPI', note: '' }], notes: 'Partial — balance due' },
      { id: 'F020', name: 'Sarita Pillai', sid: 'STU-020', course: 'Business Studies', grade: 'Grade 9-B', phone: '9876543229', total: 8500, due: '2025-01-30', payments: [], notes: 'No payment — urgent follow up' },
      { id: 'F021', name: 'Lakshmi Nair', sid: 'STU-021', course: 'Computer Science', grade: 'Grade 12-B', phone: '9876543230', total: 20000, due: '2025-07-15', payments: [{ date: '2025-02-05', amt: 20000, method: 'Bank Transfer', note: 'Full payment — online' }], notes: '' },
      { id: 'F022', name: 'Deepak Verma', sid: 'STU-022', course: 'Physics Fundamentals', grade: 'Grade 9-A', phone: '9876543231', total: 12000, due: '2025-05-20', payments: [{ date: '2025-01-18', amt: 6000, method: 'UPI', note: '50% paid' }], notes: '' },
    ];
  }

  let fees = [], sflt = 'all', srtF = 'name', srtA = true, detId = null, editId = null, remId = null, cfCb = null, sel = new Set();
  let selectedMonth = '';
  let currentPage = 1;
  const PAGE_SIZE = 20;

  const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
  const pa = f => f.payments.reduce((s, p) => s + Number(p.amt), 0);
  const bal = f => f.total - pa(f);
  const pct = f => f.total > 0 ? Math.round(pa(f) / f.total * 100) : 0;
  const isOv = f => bal(f) > 0 && new Date(f.due) < new Date(new Date().toDateString());
  const gst = f => { const p = pa(f); if (p >= f.total) return 'paid'; return 'unpaid'; };
  const avc = n => AVS[n.charCodeAt(0) % AVS.length];
  const ini = n => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const addM = (ds, m) => {
    if (!ds) return null;
    const d = new Date(ds);
    if (isNaN(d.getTime())) return null;
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  };
  const td = () => new Date().toISOString().slice(0, 10);
  const getNextDue = (f) => addM(f.admissionDate || td(), 1) || td();
  const getDaysDiff = (d1, d2) => Math.round((new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24));
  const du = d => { const now = new Date(); const due = new Date(d); const months = (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth()); return months; };

  async function load() {
    try {
      const dbFees = await window.api.getFees();
      let courses = [];
      try { courses = await window.api.getCourses(); } catch (e) { }

      if (dbFees && dbFees.length > 0) {
        const cMap = new Map((courses || []).map(c => [String(c.id), c]));
        fees = dbFees.map(f => {
          const c = cMap.get(String(f.courseId));
          return {
            id: String(f.id),
            studentId: f.studentId,
            name: `${f.firstName || ''} ${f.lastName || ''}`.trim() || 'Unknown',
            sid: f.s_studentId || `STU-${f.studentId}`,
            course: c ? (c.name || c.code) : (f.courseId ? `Course ${f.courseId}` : 'Unassigned'),
            grade: f.class || '',
            phone: f.phone || '',
            total: f.totalAmount || 0,
            admissionDate: f.admissionDate || (f.createdAt ? f.createdAt.slice(0, 10) : td()),
            due: f.dueDate || '2025-06-30',
            payments: f.payments || [],
            notes: f.notes || '',
            status: f.status
          };
        });
      } else {
        fees = [];
      }
    } catch (e) {
      console.warn("DB load failed in fees:", e);
      fees = [];
    }
    render();
  }

  function save() { /* no-op for mock data */ }

  function render() { rStats(); rt(); updFilters(); }

  function rStats() {
    const tf = fees.reduce((s, f) => s + f.total, 0), tp = fees.reduce((s, f) => s + pa(f), 0);
    const fp = fees.filter(f => pa(f) >= f.total).length, pn = fees.filter(f => pa(f) < f.total).length;
    const p = tf > 0 ? Math.round(tp / tf * 100) : 0;
    document.getElementById('ca').textContent = fees.length;
    document.getElementById('cp2').textContent = fees.filter(f => gst(f) === 'paid').length;
    document.getElementById('cu').textContent = fees.filter(f => gst(f) === 'unpaid').length;
    document.getElementById('sg').innerHTML = `
      <div class="sc cb" onclick="window.feesObj.setSF('all')"><div><div class="sl">Total Fees</div><div class="sv">${fmt(tf)}</div><div class="ss">${fees.length} fee records</div></div><div class="si sib"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div></div>
      <div class="sc cg" onclick="window.feesObj.setSF('paid')"><div><div class="sl">Collected</div><div class="sv">${fmt(tp)}</div><div class="ss">${p}% of total fees</div></div><div class="si sig"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div></div>
      <div class="sc cp" onclick="window.feesObj.setSF('paid')"><div><div class="sl">Fully Paid</div><div class="sv">${fp}</div><div class="ss">students cleared</div></div><div class="si sip"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div></div>
      <div class="sc co" onclick="window.feesObj.setSF('unpaid')"><div><div class="sl">Unpaid</div><div class="sv">${pn}</div><div class="ss">${fmt(tf - tp)} outstanding</div></div><div class="si sio"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div></div>
    `;
    document.getElementById('cp').textContent = p + '%';
    document.getElementById('cm').textContent = fmt(tf);
    requestAnimationFrame(() => { document.getElementById('cf').style.width = p + '%'; });
  }

  function updFilters() {
    const sel2 = document.getElementById('cf2'), c2 = sel2.value, cs = [...new Set(fees.map(f => f.course))].sort();
    sel2.innerHTML = '<option value="">All Courses</option>' + cs.map(c => `<option value="${c}"${c === c2 ? ' selected' : ''}>${c}</option>`).join('');
    document.getElementById('clist').innerHTML = [...cs].map(c => `<option value="${c}">`).join('');
  }

  function setSF(f) { sflt = f; currentPage = 1; document.querySelectorAll('.ftab').forEach(t => t.classList.toggle('on', t.dataset.f === f)); rt(); }
  function sf(btn) { document.querySelectorAll('.ftab').forEach(x => x.classList.remove('on')); btn.classList.add('on'); sflt = btn.dataset.f; currentPage = 1; rt(); }
  function srt(f) { if (srtF === f) srtA = !srtA; else { srtF = f; srtA = true; } ['name', 'course', 'total', 'paid', 'balance', 'due', 'status'].forEach(x => { const e = document.getElementById('a' + x[0]); if (e) e.textContent = ''; }); const e = document.getElementById('a' + f[0]); if (e) e.textContent = srtA ? '↑' : '↓'; document.getElementById('sind')?.remove(); rt(); }

  function gfr() {
    const q = document.getElementById('qi').value.toLowerCase(), co = document.getElementById('cf2').value;
    return fees.filter(f => {
      const mq = !q || (f.name.toLowerCase().includes(q) || f.course.toLowerCase().includes(q) || f.sid.toLowerCase().includes(q) || f.grade.toLowerCase().includes(q));
      return mq && (!co || f.course === co) && (!selectedMonth || f.due.slice(5, 7) === selectedMonth) && (sflt === 'all' || gst(f) === sflt);
    }).sort((a, b) => {
      let va, vb;
      if (srtF === 'name') { va = a.name; vb = b.name; } else if (srtF === 'course') { va = a.course; vb = b.course; }
      else if (srtF === 'total') { va = a.total; vb = b.total; } else if (srtF === 'paid') { va = pa(a); vb = pa(b); }
      else if (srtF === 'balance') { va = bal(a); vb = bal(b); } else if (srtF === 'due') { va = a.due; vb = b.due; }
      else if (srtF === 'status') { va = gst(a); vb = gst(b); } else { va = a.name; vb = b.name; }
      if (va < vb) return srtA ? -1 : 1; if (va > vb) return srtA ? 1 : -1; return 0;
    });
  }

  function goPage(p) {
    currentPage = p;
    rt();
    // Scroll the table card into view
    const tcard = document.querySelector('#main-content[data-page="fees"] .tcard');
    if (tcard) tcard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildPagination(totalRows) {
    const pgn = document.getElementById('pgn');
    if (!pgn) return;
    const totalPages = Math.ceil(totalRows / PAGE_SIZE);
    if (totalPages <= 1) { pgn.innerHTML = `<span class="pgn-info">Showing ${totalRows} of ${totalRows} records</span>`; return; }
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, totalRows);
    let html = `<span class="pgn-info">Showing ${start}–${end} of ${totalRows} records</span><div class="pgn-btns">`;
    // Prev button
    html += `<button class="pgn-btn ${currentPage === 1 ? 'disabled' : ''}" ${currentPage === 1 ? 'disabled' : ''} onclick="window.feesObj.goPage(${currentPage - 1})">‹ Prev</button>`;
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
    if (startPage > 1) { html += `<button class="pgn-btn" onclick="window.feesObj.goPage(1)">1</button>`; if (startPage > 2) html += `<span class="pgn-dots">…</span>`; }
    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="pgn-btn ${i === currentPage ? 'active' : ''}" onclick="window.feesObj.goPage(${i})">${i}</button>`;
    }
    if (endPage < totalPages) { if (endPage < totalPages - 1) html += `<span class="pgn-dots">…</span>`; html += `<button class="pgn-btn" onclick="window.feesObj.goPage(${totalPages})">${totalPages}</button>`; }
    // Next button
    html += `<button class="pgn-btn ${currentPage === totalPages ? 'disabled' : ''}" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.feesObj.goPage(${currentPage + 1})">Next ›</button>`;
    html += '</div>';
    pgn.innerHTML = html;
  }

  function rt() {
    const allRows = gfr();
    const totalRows = allRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const rows = allRows.slice(start, start + PAGE_SIZE);

    document.getElementById('ts').textContent = `${totalRows} record${totalRows !== 1 ? 's' : ''} total`;
    const tbody = document.getElementById('tb');
    if (!totalRows) {
      tbody.innerHTML = `<tr class="er"><td colspan="9"><span style="font-size:36px;display:block;margin-bottom:10px;">📋</span>No records match your filters. <a href="#" onclick="window.feesObj.clrAll()" style="color:var(--blue)">Clear filters</a></td></tr>`;
      buildPagination(0);
      return;
    }
    tbody.innerHTML = rows.map(f => {
      const p = pa(f), b = bal(f), pc = pct(f), st = gst(f), months = du(f.due);
      const bc = pc >= 100 ? 'full' : pc < 30 ? 'low' : pc === 0 ? 'zero' : '';
      const blc = months < 0 && b > 0 ? 'b-ov' : b > 0 ? 'b-du' : 'b-cl';
      const av = avc(f.name), chk = sel.has(f.id);

      const nextDue = getNextDue(f);
      const daysDiff = getDaysDiff(nextDue, td());
      const isPast = daysDiff < 0;

      const dateDisplay = `<span class="dd ${isPast ? 'd-ov' : 'd-ok'}">${nextDue}<br><span style="font-size:10px;font-weight:700;${isPast ? 'color:var(--red)' : 'color:var(--blue)'}">${isPast ? `⚠️ Overdue by ${Math.abs(daysDiff)} days` : `⏳ Due in ${daysDiff} days`}</span></span>`;

      return `<tr class="${isPast ? 'rov' : ''}" id="r-${f.id}">
        <td><div class="stc"><div class="av" style="background:${av}">${ini(f.name)}</div><div><div class="stn">${f.name}</div><div class="stg">${f.grade || ''}</div></div></div></td>
        <td style="color:var(--t2)">${f.course}</td>
        <td><span class="famt">${fmt(f.total)}</span></td>
        <td><div class="pc"><div class="pt"><span class="pv">${fmt(p)}</span><span class="pp">${pc}%</span></div><div class="pb"><div class="pf ${bc}" style="width:${pc}%"></div></div></div></td>
        <td><span class="ba ${blc}">${b > 0 ? fmt(b) : '✓ Cleared'}</span></td>
        <td>${dateDisplay}</td>
        <td><span class="bdg b-${st}">${st.charAt(0).toUpperCase() + st.slice(1)}</span></td>
        <td><div class="ac">
          ${st === 'paid'
          ? `<span class="pl">✓ Paid</span>`
          : `<button class="ab pa" onclick="window.feesObj.openDetPay('${f.id}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Pay</button>
             <button class="ab rm" onclick="window.feesObj.qRem('${f.id}')">🔔 Remind</button>`
        }
          <button class="ab ed" onclick="window.feesObj.openEd('${f.id}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>
          <button class="ab dl" onclick="window.feesObj.delRec('${f.id}')">🗑</button>
        </div></td>
      </tr>`;
    }).join('');
    buildPagination(totalRows);
  }

  function onSrch(i) { document.getElementById('qclr').style.display = i.value ? 'block' : 'none'; currentPage = 1; rt(); }
  function clrSrch() { document.getElementById('qi').value = ''; document.getElementById('qclr').style.display = 'none'; currentPage = 1; rt(); }
  function clrAll() { clrSrch(); document.getElementById('cf2').value = ''; selectedMonth = ''; document.getElementById('month-btn-label').textContent = 'All Months'; document.getElementById('month-btn').classList.remove('has-selection'); currentPage = 1; setSF('all'); }
  function vld() { let ok = true;[['fn-fi', document.getElementById('fn').value.trim()], ['fc-fi', document.getElementById('fc').value.trim()], ['ft-fi', parseFloat(document.getElementById('ftot').value) > 0], ['fd-fi', document.getElementById('fdu').value]].forEach(([id, v]) => { const el = document.getElementById(id); if (!v) { el.classList.add('err'); ok = false; } else el.classList.remove('err'); }); return ok; }
  function cfe(id) { document.getElementById(id).classList.remove('err'); }

  function openEd(id) { editId = id; const f = fees.find(x => x.id === id); if (!f) return; document.getElementById('amt').textContent = 'Edit Fee Record'; document.getElementById('ams').textContent = `Editing: ${f.name}`; document.getElementById('fn').value = f.name; document.getElementById('fc').value = f.course; document.getElementById('fg').value = f.grade; document.getElementById('fph').value = f.phone; document.getElementById('ftot').value = f.total; document.getElementById('fdu').value = f.due; document.getElementById('fno').value = f.notes || '';['fn-fi', 'fc-fi', 'ft-fi', 'fd-fi'].forEach(id => document.getElementById(id).classList.remove('err')); document.getElementById('addMd').classList.add('on'); }
  function closeAdd() { document.getElementById('addMd').classList.remove('on'); editId = null; }
  async function saveRec() {
    if (!vld()) return;
    const name = document.getElementById('fn').value.trim(), course = document.getElementById('fc').value.trim(), grade = document.getElementById('fg').value.trim(), phone = document.getElementById('fph').value.trim(), total = parseFloat(document.getElementById('ftot').value), due = document.getElementById('fdu').value, notes = document.getElementById('fno').value.trim();
    if (editId) {
      try {
        const fObj = fees.find(x => x.id === editId);
        if(fObj) {
           await window.api.updateFee(fObj.studentId, { totalAmount: total, dueDate: due, notes: notes });
           const st = await window.api.getStudentById(fObj.studentId);
           if (st) {
             const nameParts = name.split(/\s+/);
             st.firstName = nameParts[0] || '';
             st.lastName = nameParts.slice(1).join(' ');
             st.phone = phone;
             st.class = grade;
             await window.api.updateStudent(st.id, st);
           }
           await load();
           toast(`Record updated for ${name}`, 'b');
        }
      } catch (e) { console.error('DB Update failed:', e); }
    } else {
      toast(`Fee records must be generated via the Students tab`, 'r');
    }
    closeAdd();
  }

  function openDetPay(id) { detId = id; bldDet(); document.getElementById('detMd').classList.add('on'); setTimeout(() => document.getElementById('na')?.focus(), 200); }
  function closeDet() { document.getElementById('detMd').classList.remove('on'); detId = null; }
  function bldDet() {
    const f = fees.find(x => x.id === detId); if (!f) return;
    const p = pa(f), b = bal(f), pc2 = pct(f), st = gst(f), months = du(f.due);
    document.getElementById('dmt').textContent = f.name;
    document.getElementById('dms').textContent = `${f.course} · ${f.grade}`;
    document.getElementById('dppct').textContent = pc2 + '%';
    document.getElementById('dpbar').style.width = pc2 + '%';
    document.getElementById('dplbl').textContent = `Payment Progress — ${fmt(p)} of ${fmt(f.total)} paid`;
    const nextDue = getNextDue(f);
    const daysDiff = getDaysDiff(nextDue, td());
    const isPast = daysDiff < 0;
    const di = `<span style="font-weight:700; ${isPast ? 'color:var(--red);' : 'color:var(--blue);'}">${nextDue} (${isPast ? `⚠️ Overdue by ${Math.abs(daysDiff)} days` : `⏳ Due in ${daysDiff} days`})</span>`;
    document.getElementById('dgrid').innerHTML = `
       <div class="di"><div class="dil">Total Fees</div><div class="div">${fmt(f.total)}</div></div>
      <div class="di"><div class="dil">Amount Paid</div><div class="div" style="color:var(--green)">${fmt(p)}</div></div>
      <div class="di"><div class="dil">Balance Due</div><div class="div" style="color:${b > 0 ? 'var(--orange)' : 'var(--green)'}">${b > 0 ? fmt(b) : '✓ Cleared'}</div></div>
      <div class="di" style="grid-column:1/-1"><div class="dil">Next Payment Date</div><div class="div">${di}</div></div>
      <div class="di"><div class="dil">Admission Date</div><div class="div">${f.admissionDate || '—'}</div></div>
      <div class="di"><div class="dil">Phone</div><div class="div">${f.phone || '—'}</div></div>
      <div class="di"><div class="dil">Status</div><div class="div"><span class="bdg b-${st}">${st.charAt(0).toUpperCase() + st.slice(1)}</span></div></div>
      ${f.notes ? `<div class="di" style="grid-column:1/-1"><div class="dil">Notes</div><div class="div" style="font-size:12px;color:var(--t2)">${f.notes}</div></div>` : ''}
    `;
    const pl = document.getElementById('dpl');
    pl.innerHTML = !f.payments.length ? `<div style="color:var(--t3);font-size:13px;padding:8px 0 12px;">No payments recorded yet. Use the form below to add the first payment.</div>` : f.payments.map((p2, i) => `<div class="pr"><div><div class="pd">${p2.date} · <strong>${p2.method}</strong>${p2.note ? ' · ' + p2.note : ''}</div></div><div style="display:flex;align-items:center;gap:10px;"><div class="pra">${fmt(p2.amt)}</div><button class="prd" onclick="window.feesObj.delPay(${i})">✕</button></div></div>`).join('');
    document.getElementById('na').value = b > 0 ? b : '';
    document.getElementById('nd').value = td();
    document.getElementById('nn').value = '';
    document.getElementById('dsum').innerHTML = `
      <div class="sumr"><span class="suml">Total Fees</span><span class="sumv">${fmt(f.total)}</span></div>
      <div class="sumr"><span class="suml">Payments Made</span><span class="sumv">${f.payments.length}</span></div>
      <div class="sumr"><span class="suml">Total Paid</span><span class="sumv" style="color:var(--green)">${fmt(p)}</span></div>
      <div class="sumr"><span class="suml">Progress</span><span class="sumv">${pc2}%</span></div>
      <div class="sumr"><span class="suml" style="font-weight:700;">Balance Due</span><span class="sumv" style="color:${b > 0 ? 'var(--orange)' : 'var(--green)'};font-size:15px;">${b > 0 ? fmt(b) : '✓ Fully Cleared'}</span></div>
    `;
  }
  async function addPay() {
    const f = fees.find(x => x.id === detId), amt = parseFloat(document.getElementById('na').value), dt = document.getElementById('nd').value, mt = document.getElementById('nm').value, nt = document.getElementById('nn').value.trim();
    if (!amt || amt <= 0) { toast('Enter a valid payment amount', 'r'); return; }
    if (!dt) { toast('Enter payment date', 'r'); return; }
    if (amt > bal(f)) { toast(`Amount exceeds balance of ${fmt(bal(f))}`, 'r'); return; }
    
    try {
       await window.api.addPayment(f.id, { amount: amt, method: mt, paymentDate: dt, note: nt });
       await load(); // Reload to get fresh sums and updated payments natively
       bldDet(); 
       toast(`Payment of ${fmt(amt)} recorded for ${f.name}`, 'g');
       if (bal(fees.find(x => x.id === detId)) === 0) setTimeout(() => toast(`🎉 ${f.name} has fully cleared fees!`, 'g'), 500);
    } catch(e) {
       toast('Failed to add payment', 'r');
    }
  }
  function delPay(i) { 
     const f = fees.find(x => x.id === detId);
     const payment = f.payments[i];
     showCf('Delete Payment?', 'This payment entry will be permanently removed.', async () => { 
        if(payment && payment.id) {
           await window.api.deletePayment(payment.id);
           await load();
           bldDet(); 
           toast('Payment deleted', 'b'); 
        }
     }); 
  }
  function delFromDet() { toast('Cannot delete fee records directly. To delete, remove the student from the Students section.', 'w'); }
  function delRec(id) { toast('Cannot delete fee records directly. To delete, remove the student from the Students section.', 'w'); }

  let remId2 = null;
  function qRem(id) { remId2 = id; bldRem(); document.getElementById('remMd').classList.add('on'); }
  function openRem() { remId2 = detId; bldRem(); document.getElementById('remMd').classList.add('on'); }
  function closeRem() { document.getElementById('remMd').classList.remove('on'); remId2 = null; }
  function bldRem() { const f = fees.find(x => x.id === remId2); document.getElementById('rsub2').textContent = `To: ${f.name} · ${f.phone || 'No phone'}`; document.getElementById('rex').value = ''; updRem(); }
  function updRem() {
    const f = fees.find(x => x.id === remId2); if (!f) return;
    const b = bal(f), ug = document.getElementById('rug').value, ex = document.getElementById('rex').value.trim();
    const msgs = { friendly: `Dear ${f.name},\n\nThis is a friendly reminder that your fee payment of ${fmt(b)} for ${f.course} is due on ${f.due}.\n\nKindly arrange payment at your earliest convenience.`, firm: `Dear ${f.name},\n\nYour outstanding fee balance of ${fmt(b)} for ${f.course} was due on ${f.due}. Please clear this immediately to avoid penalties.`, final: `Dear ${f.name},\n\nFINAL NOTICE: Your fee of ${fmt(b)} for ${f.course} (due: ${f.due}) is significantly overdue. Immediate payment is required.` };
    const msg = (msgs[ug] || msgs.friendly) + (ex ? '\n\n' + ex : '') + '\n\nRegards,\nDATAFLOW Teacher Portal';
    document.getElementById('rprev').innerHTML = msg.replace(/\n/g, '<br>');
  }
  function sendRem() { const f = fees.find(x => x.id === remId2), via = document.getElementById('rv').value; const n = `Reminder via ${via} on ${td()}`; f.notes = f.notes ? f.notes + ' | ' + n : n; save(); rt(); closeRem(); toast(`Reminder sent to ${f.name} via ${via}`, 'g'); }

  function showCf(title, msg, cb) { document.getElementById('cft').textContent = title; document.getElementById('cfm').innerHTML = msg; document.getElementById('cfMd').classList.add('on'); cfCb = cb; document.getElementById('cfok').onclick = () => { closeCf(); cfCb && cfCb(); }; }
  function closeCf() { document.getElementById('cfMd').classList.remove('on'); cfCb = null; }

  function toast(msg, type = 'g') { const c = document.getElementById('tw'), t = document.createElement('div'); if (!c) return; t.className = `toast ${type}`; t.innerHTML = `<span>${{ g: '✅', r: '❌', b: 'ℹ️', w: '⚠️' }[type] || '✅'}</span>${msg}`; c.appendChild(t); setTimeout(() => { t.style.transition = 'all .3s'; t.style.opacity = '0'; t.style.transform = 'translateX(18px)'; setTimeout(() => t.remove(), 300); }, 3000); }

  // Export methods to global scope so HTML onclick handlers work
  Object.assign(window.feesObj, {
    setSF, sf, srt, onSrch, clrSrch, clrAll, cfe, goPage,
    openEd, closeAdd, saveRec, openDetPay, closeDet,
    addPay, delPay, delFromDet, delRec, qRem, openRem,
    closeRem, updRem, sendRem, closeCf, rt,
    toggleMonthDropdown: function () {
      document.getElementById('month-dropdown')?.classList.toggle('open');
    },
    selectMonth: function (el) {
      const month = el.dataset.month;
      selectedMonth = month;
      currentPage = 1;
      const panel = document.getElementById('month-panel');
      if (panel) {
        panel.querySelectorAll('.month-dropdown-item').forEach(item => {
          item.classList.toggle('active', item.dataset.month === month);
        });
      }
      const btn = document.getElementById('month-btn');
      const label = document.getElementById('month-btn-label');
      if (label) label.textContent = el.textContent;
      if (btn) btn.classList.toggle('has-selection', month !== '');
      document.getElementById('month-dropdown')?.classList.remove('open');
      rt();
    }
  });

  // Setup modals outer click to close
  ['addMd', 'detMd', 'remMd', 'cfMd'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('on'); });
  });

  // Global events
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const o = [...document.querySelectorAll('.ov.on')];
      if (o.length) o[o.length - 1].classList.remove('on');
      document.getElementById('month-dropdown')?.classList.remove('open');
    }
  });

  document.addEventListener('click', (e) => {
    const dd = document.getElementById('month-dropdown');
    if (dd && !dd.contains(e.target)) {
      dd.classList.remove('open');
    }
  });


  load();
};
