const el = (sel) => document.querySelector(sel);
const app = el('#app');
const authEl = el('#auth-links');

const STORAGE = {
  userKey: 'sih_user_v1',
  issuesKey: 'sih_issues_v1'
};

const DEFAULT_ISSUES = [
  {id:'i1', title:'Pothole in Sector 5', description:'Large pothole causing traffic.', locationText:'Sector 5, Salt Lake', coords:{lat:22.579,lng:88.431}, status:'Pending', upvotes:3, comments:['Needs urgent fix'], createdAt: Date.now()-86400000},
  {id:'i2', title:'Broken streetlight in Gariahat', description:'Dark stretch, safety concern.', locationText:'Gariahat crossing', coords:{lat:22.52,lng:88.365}, status:'In Progress', upvotes:5, comments:[], createdAt: Date.now()-3600000}
];

function getUser(){ try{ return JSON.parse(localStorage.getItem(STORAGE.userKey)); }catch{return null} }
function setUser(u){ if(u) localStorage.setItem(STORAGE.userKey, JSON.stringify(u)); else localStorage.removeItem(STORAGE.userKey); renderNav(); }
function getIssues(){ try{ const r=JSON.parse(localStorage.getItem(STORAGE.issuesKey)); if(r&&r.length) return r; localStorage.setItem(STORAGE.issuesKey, JSON.stringify(DEFAULT_ISSUES)); return DEFAULT_ISSUES;}catch{return DEFAULT_ISSUES} }
function setIssues(arr){ localStorage.setItem(STORAGE.issuesKey, JSON.stringify(arr)); }

function renderNav(){
  const user=getUser();
  if(user){ authEl.innerHTML = `<span class="text-gray-600">Hi, ${user.name}${user.role? ' · '+user.role: ''}</span> <a class="hover:text-indigo-600" href="#/logout">Logout</a>`; }
  else { authEl.innerHTML = `<a class="hover:text-indigo-600" href="#/login">Login</a>`; }
}

function requireAuth(){ if(!getUser()){ location.hash = '#/login'; return false; } return true; }
function requireRole(role){ const u=getUser(); if(!u || u.role!==role){ location.hash = role==='official' ? '#/official-login' : '#/login'; return false; } return true; }

function pageHome(){
  app.innerHTML = `
    <section class="bg-gradient-to-br from-indigo-50 to-sky-50 border-b">
      <div class="max-w-6xl mx-auto px-4 py-12">
        <h1 class="text-3xl sm:text-4xl font-extrabold">Report Civic Issues Around You</h1>
        <p class="text-gray-600 mt-2">Crowdsourced reports help your city respond faster.</p>
        <div class="mt-4 flex gap-2">
          <a class="btn btn-primary" href="#/report">Report an Issue</a>
          <a class="btn" href="#/dashboard">Open Dashboard</a>
        </div>
      </div>
    </section>
    <section class="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 card">
        <h3 class="text-lg font-semibold mb-2">City Map</h3>
        <div id="map"></div>
      </div>
      <div class="card">
        <h3 class="text-lg font-semibold mb-2">How it works</h3>
        <ol class="list-decimal pl-5 text-sm text-gray-700 space-y-1">
          <li>Login</li>
          <li>Report with details and location</li>
          <li>Track on dashboard</li>
        </ol>
      </div>
    </section>`;
  renderMap(getIssues());
}

function renderMap(issues, selected){
  const container = el('#map'); if(!container) return;
  const map = L.map('map').setView(selected? [selected.lat,selected.lng]: [22.5726,88.3639], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
  issues.forEach(i=>{ if(!i.coords) return; const m=L.marker([i.coords.lat, i.coords.lng]).addTo(map); m.bindPopup(`<strong>${i.title}</strong><br/>${i.locationText||''}<br/><em>${i.status}</em>`); });
  return map;
}

function pageLogin(){
  app.innerHTML = `
    <div class="max-w-md mx-auto card">
      <h2 class="text-xl font-semibold">Login</h2>
      <p class="text-sm text-gray-600 mb-3">Citizen access. For officials use <a class="text-indigo-600" href="#/official-login">official login</a>.</p>
      <form id="login-form" class="grid gap-3">
        <input class="border rounded px-3 py-2" placeholder="Name" required />
        <input class="border rounded px-3 py-2" placeholder="Email" type="email" required />
        <button class="btn btn-primary" type="submit">Login</button>
      </form>
    </div>`;
  el('#login-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const [nameInput, emailInput] = e.target.elements;
    setUser({ name: nameInput.value, email: emailInput.value, role:'user' });
    location.hash = '#/report';
  });
}

function pageLogout(){ setUser(null); location.hash = '#/'; }

function pageReport(){ if(!requireAuth()) return; const user=getUser(); const issues=getIssues();
  app.innerHTML = `
    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 card">
        <h3 class="text-lg font-semibold mb-2">Pick Location</h3>
        <div id="map"></div>
      </div>
      <div class="card">
        <h3 class="text-lg font-semibold">Report an Issue</h3>
        <p class="text-sm text-gray-600 mb-3">Logged in as ${user.name}</p>
        <form id="report-form" class="grid gap-3">
          <input name="title" class="border rounded px-3 py-2" placeholder="Issue Title" required />
          <input name="locationText" class="border rounded px-3 py-2" placeholder="Location (text)" />
          <textarea name="description" class="border rounded px-3 py-2" rows="3" placeholder="Description"></textarea>
          <input name="photo" type="file" accept="image/*" class="border rounded px-3 py-2" />
          <div class="text-sm text-gray-600"><span id="coords-note">Tap on map to set coordinates</span></div>
          <img id="preview" class="img-preview hidden" />
          <button class="btn btn-primary" type="submit">Submit</button>
        </form>
      </div>
    </div>`;

  let selected = null;
  const map = renderMap(issues);
  map.on('click', e => { selected = e.latlng; el('#coords-note').textContent = `Coords: ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`; });
  const inputFile = el('input[name="photo"]');
  inputFile.addEventListener('change', (e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const p=el('#preview'); p.src=r.result; p.classList.remove('hidden'); }; r.readAsDataURL(f); });

  el('#report-form').addEventListener('submit',(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const title=fd.get('title'); const locationText=fd.get('locationText'); const description=fd.get('description');
    const photoInput = e.target.querySelector('input[name="photo"]');
    const done = (photoUrl)=>{
      const newIssue = { id: Math.random().toString(36).slice(2), title, locationText, description, coords:selected, status:'Pending', upvotes:0, comments:[], photo:photoUrl||null, createdAt: Date.now() };
      const updated=[newIssue, ...getIssues()]; setIssues(updated); alert('Issue submitted'); location.hash = '#/dashboard';
    };
    const file = photoInput.files?.[0];
    if(file){ const r=new FileReader(); r.onload=()=>done(r.result); r.readAsDataURL(file); } else done(null);
  });
}

function pageDashboard(){ if(!requireAuth()) return; const issues=getIssues();
  const totals = {
    all: issues.length,
    pending: issues.filter(i=>i.status==='Pending').length,
    progress: issues.filter(i=>i.status==='In Progress').length,
    resolved: issues.filter(i=>i.status==='Resolved').length,
  };
  app.innerHTML = `
    <div class="grid gap-6">
      <div class="grid sm:grid-cols-4 gap-3">
        <div class="card"><div class="text-sm text-gray-600">Total</div><div class="text-2xl font-bold">${totals.all}</div></div>
        <div class="card"><div class="text-sm text-gray-600">Pending</div><div class="text-2xl font-bold">${totals.pending}</div></div>
        <div class="card"><div class="text-sm text-gray-600">In Progress</div><div class="text-2xl font-bold">${totals.progress}</div></div>
        <div class="card"><div class="text-sm text-gray-600">Resolved</div><div class="text-2xl font-bold">${totals.resolved}</div></div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold">All Reports</h3>
          <div class="flex gap-2">
            <button class="btn" data-filter="All">All</button>
            <button class="btn" data-filter="Pending">Pending</button>
            <button class="btn" data-filter="In Progress">In Progress</button>
            <button class="btn" data-filter="Resolved">Resolved</button>
          </div>
        </div>
        <div id="list" class="grid gap-3"></div>
      </div>
    </div>`;

  const list = el('#list');
  function renderList(filter){
    list.innerHTML = '';
    issues.filter(i=> filter==='All'||!filter ? true : i.status===filter).forEach(i=>{
      const stClass = i.status==='Resolved'?'resolved': (i.status==='In Progress'?'progress':'pending');
      const item = document.createElement('div');
      item.className = 'card';
      item.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold">${i.title}</div>
            <div class="text-sm text-gray-600">📍 ${i.locationText || (i.coords? `${i.coords.lat.toFixed(4)}, ${i.coords.lng.toFixed(4)}`:'')}</div>
            <div class="mt-1"><span class="status ${stClass}">${i.status}</span></div>
          </div>
          ${i.photo ? `<img src="${i.photo}" class="w-24 h-24 object-cover rounded border"/>` : ''}
        </div>
        <p class="text-sm text-gray-700 mt-2">${i.description||''}</p>
        <div class="flex items-center gap-2 mt-2">
          <button class="btn" data-upvote="${i.id}">👍 Upvote ${i.upvotes}</button>
          <button class="btn" data-status="${i.id}">Change Status</button>
        </div>
        <div class="mt-2">
          <div class="text-sm text-gray-600 mb-1">Comments</div>
          <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">${i.comments.map(c=>`<li>${c}</li>`).join('')}</ul>
          <div class="flex gap-2 mt-2">
            <input class="border rounded px-3 py-1.5 text-sm flex-1" placeholder="Add a comment" />
            <button class="btn btn-primary" data-comment="${i.id}">Comment</button>
          </div>
        </div>`;
      list.appendChild(item);
    });
  }
  renderList('All');

  el('[data-filter="All"]').onclick = ()=>renderList('All');
  el('[data-filter="Pending"]').onclick = ()=>renderList('Pending');
  el('[data-filter="In Progress"]').onclick = ()=>renderList('In Progress');
  el('[data-filter="Resolved"]').onclick = ()=>renderList('Resolved');

  list.addEventListener('click', (e)=>{
    const u = e.target.getAttribute('data-upvote');
    const s = e.target.getAttribute('data-status');
    const c = e.target.getAttribute('data-comment');
    if(u){ const data=getIssues().map(i=> i.id===u? {...i, upvotes:i.upvotes+1}:i); setIssues(data); pageDashboard(); }
    if(s){ const order=['Pending','In Progress','Resolved']; const data=getIssues().map(i=> i.id===s? {...i, status:order[(order.indexOf(i.status)+1)%order.length]}:i); setIssues(data); pageDashboard(); }
    if(c){ const parent = e.target.closest('.card'); const input = parent.querySelector('input'); const text=input.value.trim(); if(!text) return; const data=getIssues().map(i=> i.id===c? {...i, comments:[...i.comments, text]}:i); setIssues(data); pageDashboard(); }
  });
}

// Official login
function pageOfficialLogin(){
  app.innerHTML = `
    <div class="max-w-md mx-auto card">
      <h2 class="text-xl font-semibold">Official Login</h2>
      <p class="text-sm text-gray-600 mb-3">Restricted access for municipal officials.</p>
      <form id="official-form" class="grid gap-3">
        <input class="border rounded px-3 py-2" placeholder="Name" required />
        <input class="border rounded px-3 py-2" placeholder="Email" type="email" required />
        <input class="border rounded px-3 py-2" placeholder="Department" required />
        <button class="btn btn-primary" type="submit">Login</button>
      </form>
    </div>`;
  el('#official-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const [nameInput, emailInput, deptInput] = e.target.elements;
    setUser({ name: nameInput.value, email: emailInput.value, department: deptInput.value, role:'official' });
    location.hash = '#/official-dashboard';
  });
}

function pageOfficialDashboard(){ if(!requireRole('official')) return; let issues=getIssues(); const user=getUser();
  app.innerHTML = `
    <div class="grid gap-6">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Official Dashboard</h3>
        <div class="text-sm text-gray-600">${user.department ? 'Department: '+user.department : ''}</div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div class="flex gap-2">
            <button class="btn" data-filter="All">All</button>
            <button class="btn" data-filter="Unassigned">Unassigned</button>
            <button class="btn" data-filter="Pending">Pending</button>
            <button class="btn" data-filter="In Progress">In Progress</button>
            <button class="btn" data-filter="Resolved">Resolved</button>
          </div>
          <a class="btn" href="#/dashboard">Citizen view</a>
        </div>
        <div id="olist" class="grid gap-3"></div>
      </div>
    </div>`;

  const list = el('#olist');
  function render(filter){
    list.innerHTML=''; issues=getIssues();
    issues.filter(i=>{
      if(filter==='All' || !filter) return true;
      if(filter==='Unassigned') return !i.assignedTo;
      return i.status===filter;
    }).forEach(i=>{
      const stClass = i.status==='Resolved'?'resolved': (i.status==='In Progress'?'progress':'pending');
      const d=document.createElement('div'); d.className='card';
      d.innerHTML=`
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold">${i.title}</div>
            <div class="text-sm text-gray-600">📍 ${i.locationText || (i.coords? `${i.coords.lat.toFixed(4)}, ${i.coords.lng.toFixed(4)}`:'')}</div>
            <div class="mt-1 flex items-center gap-2">
              <span class="status ${stClass}">${i.status}</span>
              <span class="text-xs text-gray-600">${i.assignedTo? 'Assigned: '+i.assignedTo : 'Unassigned'}</span>
            </div>
          </div>
          ${i.photo ? `<img src="${i.photo}" class="w-24 h-24 object-cover rounded border"/>` : ''}
        </div>
        <div class="flex flex-wrap gap-2 mt-2">
          <input class="border rounded px-3 py-1.5 text-sm" placeholder="Assign to (dept/officer)" value="${i.assignedTo||''}" data-assign-input="${i.id}" />
          <button class="btn" data-assign="${i.id}">Assign</button>
          <button class="btn" data-next="${i.id}">Next Status</button>
          <button class="btn" data-resolve="${i.id}">Resolve</button>
        </div>`;
      list.appendChild(d);
    });
  }
  render('All');

  document.querySelectorAll('[data-filter]').forEach(b=> b.onclick=()=>render(b.getAttribute('data-filter')));
  list.addEventListener('click', (e)=>{
    const assign = e.target.getAttribute('data-assign');
    const next = e.target.getAttribute('data-next');
    const resolve = e.target.getAttribute('data-resolve');
    if(assign){
      const input = list.querySelector(`[data-assign-input="${assign}"]`);
      const data = getIssues().map(it=> it.id===assign? {...it, assignedTo: input.value}: it);
      setIssues(data); render('All');
    }
    if(next){
      const order=['Pending','In Progress','Resolved'];
      const data = getIssues().map(it=> it.id===next? {...it, status: order[(order.indexOf(it.status)+1)%order.length]}: it);
      setIssues(data); render('All');
    }
    if(resolve){
      const data = getIssues().map(it=> it.id===resolve? {...it, status:'Resolved'}: it);
      setIssues(data); render('All');
    }
  });
}

function router(){
  const hash = location.hash || '#/';
  if(hash.startsWith('#/login')) return pageLogin();
  if(hash.startsWith('#/logout')) return pageLogout();
  if(hash.startsWith('#/report')) return pageReport();
  if(hash.startsWith('#/dashboard')) return pageDashboard();
  if(hash.startsWith('#/official-login')) return pageOfficialLogin();
  if(hash.startsWith('#/official-dashboard')) return pageOfficialDashboard();
  return pageHome();
}

window.addEventListener('hashchange', router);
renderNav();
router();


