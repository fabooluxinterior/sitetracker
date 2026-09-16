<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#111827">
  <title>SiteTrack</title>
  <style>
    :root { --primary: #0f172a; --accent: #f97316; --bg: #f8fafc; --surface: #ffffff; --text: #0f172a; --muted: #64748b; --border: #e2e8f0; --success: #10b981; --error: #ef4444; font-family: Inter, system-ui, sans-serif; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; padding: 1rem; }
    button, input, select { font: inherit; outline: none; border: none; }
    .app { max-width: 600px; margin: 0 auto; background: var(--surface); border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); overflow: hidden; min-height: 90vh; }
    header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: var(--surface); z-index: 10; }
    .logo { font-weight: 800; font-size: 1.25rem; letter-spacing: -0.5px; }
    .logo span { color: var(--accent); }
    .gps { font-size: 0.75rem; font-weight: 600; padding: 4px 10px; background: var(--bg); border-radius: 20px; display: flex; align-items: center; gap: 6px; }
    .dot { width: 6px; height: 6px; background: var(--error); border-radius: 50%; }
    .dot.ok { background: var(--success); }
    main { padding: 24px 20px; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.5px; }
    p.sub { color: var(--muted); font-size: 0.875rem; margin-bottom: 24px; line-height: 1.5; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text); }
    .field input, .field select { width: 100%; padding: 14px; background: var(--bg); border-radius: 10px; border: 1px solid transparent; transition: all 0.2s; }
    .field input:focus, .field select:focus { border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
    .btn { width: 100%; padding: 14px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px; }
    .btn:active { opacity: 0.8; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .primary { background: var(--primary); color: white; }
    .secondary { background: var(--bg); color: var(--text); border: 1px solid var(--border); }
    .card { padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .camera { width: 100%; aspect-ratio: 4/3; background: #000; border-radius: 10px; overflow: hidden; margin-bottom: 12px; position: relative; }
    .camera video, .camera img { width: 100%; height: 100%; object-fit: cover; }
    .camera p { color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; font-size: 0.875rem; }
    .nav { display: flex; gap: 8px; padding: 20px; border-top: 1px solid var(--border); background: var(--surface); }
    .nav button { flex: 1; padding: 10px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; background: transparent; color: var(--muted); }
    .nav button.on { background: var(--bg); color: var(--primary); }
    .site-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border); }
    .site-item:last-child { border-bottom: none; }
    .site-item strong { display: block; margin-bottom: 4px; }
    .site-item small { color: var(--muted); font-size: 0.75rem; }
    .tag { font-size: 0.7rem; font-weight: 700; background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 12px; }
    .notice { padding: 12px; border-radius: 8px; font-size: 0.875rem; margin-top: 12px; }
    .notice.bad { background: #fee2e2; color: #991b1b; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <div class="logo">Site<span>Track</span></div>
      <div id="gps" class="gps"><div class="dot"></div>Checking...</div>
    </header>
    <main id="screen"></main>
    <div id="nav" class="nav hidden"></div>
  </div>

  <script>
    // Note: Replace with your actual deployed Web App URL
    const API = 'https://script.google.com/macros/s/AKfycbwlSWEv7viovJNHd6xYs6On6IksAfJr5GK0xuQDS8EHXatQpgyNlOJWe7FWB_H6HBJ_kQ/exec';
    const S = { token: sessionStorage.getItem('st_token')||'', user: JSON.parse(sessionStorage.getItem('st_user')||'null'), gps: null, stream: null, selfie: null, selected: null, active: [], view: 'home' };
    const $ = id => document.getElementById(id);
    const esc = str => String(str ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

    async function req(action, payload = {}, method = 'POST') {
      const opts = method === 'POST' ? { method, headers: {'Content-Type':'text/plain'}, body: JSON.stringify({action, ...payload}) } : {};
      const url = method === 'GET' ? `${API}?${new URLSearchParams({action, token: S.token, ...payload})}` : API;
      const res = await fetch(url, opts);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Request failed');
      return data;
    }

    function render() {
      if (!S.user) { $('nav').classList.add('hidden'); return showLogin(); }
      updateNav(); updateGPS();
      if (S.view === 'home') showHome();
      else if (S.view === 'site') showSite();
      else if (S.view === 'logout') showLogout();
      else showAdmin();
    }

    function updateNav() {
      $('nav').classList.remove('hidden');
      $('nav').innerHTML = `
        <button class="${S.view === 'home' ? 'on' : ''}" onclick="navTo('home')">Home</button>
        ${S.user.role === 'admin' ? `<button class="${S.view === 'admin' ? 'on' : ''}" onclick="navTo('admin')">Admin</button>` : ''}
        <button style="color:var(--error)" onclick="logoutUser()">Sign Out</button>
      `;
    }
    
    function navTo(view) { S.view = view; render(); }
    function logoutUser() { sessionStorage.clear(); S.token = ''; S.user = null; render(); }
    function updateGPS() { $('gps').innerHTML = S.gps ? `<div class="dot ok"></div>${esc(S.gps.label.split(',')[0])}` : `<div class="dot"></div>No GPS`; }

    function showLogin() {
      $('screen').innerHTML = `
        <h1>Welcome Back</h1>
        <p class="sub">Sign in to manage your site sessions.</p>
        <div class="field"><label>Email</label><input id="em" type="email" placeholder="coordinator@company.com"></div>
        <div class="field"><label>Password</label><input id="pw" type="password" placeholder="••••••••"></div>
        <button id="btn-login" class="btn primary" onclick="handleLogin()">Sign In</button>
        <div id="err"></div>
      `;
    }

    async function handleLogin() {
      const btn = $('btn-login'); btn.disabled = true; btn.textContent = 'Signing in...';
      try {
        const d = await req('login', {email: $('em').value, password: $('pw').value});
        S.token = d.token; S.user = d.user; S.active = d.active || [];
        sessionStorage.setItem('st_token', S.token); sessionStorage.setItem('st_user', JSON.stringify(S.user));
        S.view = 'home'; render();
      } catch (e) { $('err').innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; btn.disabled = false; btn.textContent = 'Sign In'; }
    }

    function showHome() {
      $('screen').innerHTML = `
        <h1>Active Sites</h1>
        <p class="sub">Signed in as ${esc(S.user.name)}</p>
        <div class="card row">
          <div><small style="color:var(--muted)">Active Now</small><strong style="display:block;font-size:1.5rem">${S.active.length}</strong></div>
          <button class="btn primary" onclick="S.selfie=null; navTo('site')" style="padding:8px">Start Site</button>
        </div>
        <div id="list">
          ${S.active.length ? S.active.map(s => `
            <div class="site-item">
              <div><strong>${esc(s.clientName)}</strong><small>${esc(s.siteLocation)}</small></div>
              <button class="btn secondary" style="width:auto;padding:6px 12px;font-size:0.75rem" onclick="prepLogout('${s.sessionId}')">End Session</button>
            </div>
          `).join('') : '<p class="sub" style="text-align:center;margin-top:2rem">No active sites.</p>'}
        </div>
      `;
    }

    function prepLogout(id) { S.selected = S.active.find(x => x.sessionId === id); S.selfie = null; navTo('logout'); }

    function showSite() {
      $('screen').innerHTML = `
        <h1>Start Session</h1>
        <p class="sub">Enter details and capture your login photo.</p>
        <div class="field"><label>Project Name</label><input id="cn" placeholder="e.g. Skyline Build"></div>
        <div class="field"><label>Location</label><input id="cl" placeholder="e.g. Edappally"></div>
        <div class="field"><label>Workers</label><input id="wk" type="number" placeholder="0"></div>
        <div class="camera" id="cam"><p>Camera inactive</p></div>
        <div class="row" style="margin-bottom:16px">
          <button class="btn secondary" onclick="initCam()">Open Camera</button>
          <button id="cap" class="btn primary" disabled onclick="captureCam()">Capture</button>
        </div>
        <button id="sl" class="btn primary" onclick="submitSite()">Submit Session</button>
        <div id="err"></div>
      `;
    }

    function showLogout() {
      $('screen').innerHTML = `
        <h1>End Session</h1>
        <p class="sub">Confirming departure for <strong>${esc(S.selected?.clientName)}</strong>.</p>
        <div class="camera" id="cam"><p>Camera inactive</p></div>
        <div class="row" style="margin-bottom:16px">
          <button class="btn secondary" onclick="initCam()">Open Camera</button>
          <button id="cap" class="btn primary" disabled onclick="captureCam()">Capture</button>
        </div>
        <button id="sl" class="btn primary" disabled onclick="submitLogout()">End Session</button>
        <button class="btn secondary" style="margin-top:12px" onclick="navTo('home')">Cancel</button>
        <div id="err"></div>
      `;
    }

    async function initCam() {
      try {
        locate(); // Run GPS concurrently
        S.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
        const v = document.createElement('video'); v.autoplay = true; v.playsInline = true; v.srcObject = S.stream;
        $('cam').replaceChildren(v); $('cap').disabled = false;
      } catch (e) { $('err').innerHTML = `<div class="notice bad">Camera access denied.</div>`; }
    }

    function captureCam() {
      const v = $('cam').querySelector('video'), c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0);
      S.selfie = c.toDataURL('image/jpeg', 0.6); // Lowered quality for faster upload
      S.stream.getTracks().forEach(t => t.stop()); S.stream = null;
      $('cam').innerHTML = `<img src="${S.selfie}">`; 
      $('cap').disabled = true;
      if($('sl')) $('sl').disabled = false;
    }

    async function locate() {
      return new Promise((res, rej) => navigator.geolocation.getCurrentPosition(
        p => {
          S.gps = { lat: p.coords.latitude, lng: p.coords.longitude, label: `${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}` };
          updateGPS(); res(S.gps);
        },
        () => rej(), {enableHighAccuracy: true, timeout: 5000}
      ));
    }

    async function submitSite() {
      const btn = $('sl'); btn.disabled = true; btn.textContent = 'Uploading...';
      try {
        await locate();
        if(!S.selfie) throw new Error('Capture photo first.');
        const d = await req('site_login', { token: S.token, clientName: $('cn').value, siteLocation: $('cl').value, customerId: `${$('cn').value}|${$('cl').value}`, workers: $('wk').value, loginSelfieDataUrl: S.selfie, locationName: S.gps.label, latitude: S.gps.lat, longitude: S.gps.lng });
        S.active = d.active || []; navTo('home');
      } catch (e) { $('err').innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; btn.disabled = false; btn.textContent = 'Submit Session'; }
    }

    async function submitLogout() {
      const btn = $('sl'); btn.disabled = true; btn.textContent = 'Uploading...';
      try {
        await locate();
        const d = await req('site_logout', { token: S.token, sessionId: S.selected.sessionId, logoutSelfieDataUrl: S.selfie, locationName: S.gps.label, latitude: S.gps.lat, longitude: S.gps.lng });
        S.active = d.active || []; navTo('home');
      } catch (e) { $('err').innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; btn.disabled = false; btn.textContent = 'End Session'; }
    }

    function showAdmin() {
      $('screen').innerHTML = `<h1>Admin Panel</h1><p class="sub">Dashboard features accessible via Google Sheets.</p><button class="btn secondary" onclick="navTo('home')">Back to Home</button>`;
    }

    setTimeout(render, 100);
  </script>
</body>
</html>
