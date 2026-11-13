// GENKAKU admin console markup. Server-rendered shell + one embedded script:
// no build step, no external assets, so the seed VM stays a single process.

export const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GENKAKU admin</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;background:#0b0d10;color:#d7dde5}
a{color:#7fb2ff}
.wrap{max-width:1040px;margin:0 auto;padding:24px 20px 64px}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px}
h1{font-size:20px;margin:0;letter-spacing:.01em}
h1 span{color:#7d8794;font-weight:400;font-size:13px;margin-left:8px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.09em;color:#7d8794;margin:28px 0 10px;font-weight:600}
.card{border:1px solid #222832;border-radius:10px;padding:14px 16px;background:#11151b}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7d8794;margin-bottom:4px}
.v{font-size:22px;font-variant-numeric:tabular-nums}
.v small{font-size:12px;color:#7d8794;margin-left:4px}
.muted{color:#7d8794}
.row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
table{border-collapse:collapse;width:100%}
td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #1c222b;font-variant-numeric:tabular-nums}
th{color:#7d8794;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.07em}
tr:last-child td{border-bottom:0}
input{background:#0b0d10;color:#d7dde5;border:1px solid #2a323d;border-radius:6px;padding:7px 9px;width:100%;font:inherit}
label{display:block;font-size:12px;color:#7d8794;margin:10px 0 4px}
button{font:inherit;border-radius:6px;padding:7px 13px;cursor:pointer;border:1px solid #2a323d;background:#1a2029;color:#d7dde5}
button.primary{background:#2563eb;border-color:#2563eb;color:#fff}
button.danger{background:transparent;border-color:#5a2730;color:#ff8b9a}
button:disabled{opacity:.5;cursor:default}
.tabs{display:flex;gap:4px;margin:18px 0 6px;border-bottom:1px solid #1c222b}
.tabs button{border:0;background:none;border-radius:0;padding:9px 12px;color:#7d8794;border-bottom:2px solid transparent}
.tabs button.on{color:#d7dde5;border-bottom-color:#2563eb}
.hide{display:none!important}
.banner{border:1px solid #5a4a1e;background:#1d1809;color:#e8d48b;border-radius:8px;padding:10px 12px;margin:12px 0;font-size:13px}
.err{border:1px solid #5a2730;background:#1c0f12;color:#ff9aa7;border-radius:8px;padding:10px 12px;margin:12px 0;font-size:13px}
.ok{border:1px solid #1f4635;background:#0e1a15;color:#8fe0b5;border-radius:8px;padding:10px 12px;margin:12px 0;font-size:13px}
.login{max-width:360px;margin:14vh auto}
.foot{margin-top:28px;font-size:12px;color:#5f6875}
code{font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#a8b3c2}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>GenKaKu admin<span id="who"></span></h1>
    <button id="logout" class="hide" type="button">Log out</button>
  </header>

  <div id="msg"></div>

  <section id="login" class="login card hide">
    <div class="k">Administrator</div>
    <label for="pw">Password</label>
    <input id="pw" type="password" autocomplete="current-password" autofocus>
    <div style="margin-top:14px"><button id="signin" class="primary" type="button">Sign in</button></div>
    <div class="foot">This console manages the seed VM, relay pricing and the USDC ledger. It is not part of the public site.</div>
  </section>

  <section id="app" class="hide">
    <div class="tabs">
      <button data-tab="overview" class="on" type="button">Overview</button>
      <button data-tab="traffic" type="button">Seed &amp; traffic</button>
      <button data-tab="money" type="button">USDC flow</button>
      <button data-tab="settings" type="button">Settings</button>
    </div>

    <div id="tab-overview">
      <h2>Network</h2>
      <div class="grid">
        <div class="card"><div class="k">Workers (on-chain)</div><div class="v" id="ov-workers">—</div></div>
        <div class="card"><div class="k">Workers (announced)</div><div class="v" id="ov-announced">—</div></div>
        <div class="card"><div class="k">Users (paid sessions)</div><div class="v" id="ov-users">—</div></div>
        <div class="card"><div class="k">Clients (24 h)</div><div class="v" id="ov-clients">—</div></div>
      </div>
      <h2>Settlement</h2>
      <div class="grid">
        <div class="card"><div class="k">Settled USDC</div><div class="v" id="ov-settled">—</div></div>
        <div class="card"><div class="k">Protocol fee</div><div class="v" id="ov-fee">—</div></div>
        <div class="card"><div class="k">Refunded</div><div class="v" id="ov-refunded">—</div></div>
        <div class="card"><div class="k">Sessions</div><div class="v" id="ov-sessions">—</div></div>
      </div>
      <h2>Seed VM</h2>
      <div class="grid">
        <div class="card"><div class="k">Relay reservations</div><div class="v" id="ov-reservations">—</div></div>
        <div class="card"><div class="k">Relay sessions (boot)</div><div class="v" id="ov-relaysessions">—</div></div>
        <div class="card"><div class="k">Traffic this period</div><div class="v" id="ov-traffic">—</div></div>
        <div class="card"><div class="k">Estimated cost / month</div><div class="v" id="ov-cost">—</div></div>
      </div>
    </div>

    <div id="tab-traffic" class="hide">
      <h2>Seed VM usage</h2>
      <div class="card">
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Addresses advertised</td><td id="tr-addrs">—</td></tr>
          <tr><td>Relay hop</td><td id="tr-relay">—</td></tr>
          <tr><td>Relay reservations (live)</td><td id="tr-reservations">—</td></tr>
          <tr><td>Relay slots</td><td id="tr-slots">—</td></tr>
          <tr><td>Per-session data cap</td><td id="tr-cap">—</td></tr>
          <tr><td>Bytes read since reset</td><td id="tr-in">—</td></tr>
          <tr><td>Bytes written since reset</td><td id="tr-out">—</td></tr>
          <tr><td>Window started</td><td id="tr-since">—</td></tr>
          <tr><td>Uptime</td><td id="tr-uptime">—</td></tr>
        </table>
      </div>
      <div class="muted" style="margin-top:8px;font-size:12px">
        Byte counters come from the seed process (/proc/self/io) and include discovery, relay and admin traffic it serves.
      </div>

      <h2>Pricing</h2>
      <div class="card">
        <div class="grid">
          <div><label for="p-vm">VM cost per month (USDC)</label><input id="p-vm" inputmode="decimal"></div>
          <div><label for="p-in">USDC per GB in</label><input id="p-in" inputmode="decimal"></div>
          <div><label for="p-out">USDC per GB out</label><input id="p-out" inputmode="decimal"></div>
          <div><label for="p-free">Free GB per month</label><input id="p-free" inputmode="decimal"></div>
        </div>
        <div class="row" style="margin-top:14px">
          <span class="muted" id="p-preview">—</span>
          <button id="p-save" class="primary" type="button">Save pricing</button>
        </div>
      </div>
      <div class="card" style="margin-top:12px">
        <div class="row">
          <div>
            <div class="k">Usage window</div>
            <div class="muted">Start a new billing window at the current byte counters. The seed keeps running.</div>
          </div>
          <button id="reset" class="danger" type="button">Reset usage</button>
        </div>
      </div>
    </div>

    <div id="tab-money" class="hide">
      <h2>USDC flow (Base Sepolia)</h2>
      <div class="grid">
        <div class="card"><div class="k">Escrow opened</div><div class="v" id="m-volume">—</div></div>
        <div class="card"><div class="k">Settled to workers</div><div class="v" id="m-settled">—</div></div>
        <div class="card"><div class="k">Treasury fee</div><div class="v" id="m-fee">—</div></div>
        <div class="card"><div class="k">Refunded to users</div><div class="v" id="m-refunded">—</div></div>
      </div>
      <div class="card" style="margin-top:12px">
        <table>
          <tr><th>Address</th><th>Role</th><th>Value</th></tr>
          <tr><td><code id="m-escrow">—</code></td><td>JobEscrow</td><td class="muted">session funds</td></tr>
          <tr><td><code id="m-registry">—</code></td><td>WorkerRegistry</td><td class="muted">directory</td></tr>
          <tr><td><code id="m-usdc">—</code></td><td>USDC</td><td class="muted">token</td></tr>
        </table>
      </div>
      <div class="muted" style="margin-top:8px;font-size:12px" id="m-scan">—</div>
    </div>

    <div id="tab-settings" class="hide">
      <h2>Password</h2>
      <div class="card">
        <div id="pw-banner" class="banner hide">You are still using the initial password. Change it now.</div>
        <div class="grid">
          <div><label for="pw-current">Current password</label><input id="pw-current" type="password" autocomplete="current-password"></div>
          <div><label for="pw-next">New password</label><input id="pw-next" type="password" autocomplete="new-password"></div>
          <div><label for="pw-confirm">Confirm new password</label><input id="pw-confirm" type="password" autocomplete="new-password"></div>
        </div>
        <div class="row" style="margin-top:14px">
          <span class="muted">At least 8 characters. This console holds no wallet keys.</span>
          <button id="pw-save" class="primary" type="button">Change password</button>
        </div>
      </div>

      <h2>Links</h2>
      <div class="card">
        <div class="muted">Public seed discovery: <a id="l-seed" target="_blank" rel="noreferrer">/seed/peers</a></div>
        <div class="muted" style="margin-top:6px">Status page is the worker dashboard on each machine, not this console.</div>
      </div>
    </div>
  </section>
</div>

<script>
(function(){
  var ZH = /^zh/i.test(navigator.language || '');
  var t = function(en, zh){ return ZH ? zh : en };
  var state = null;
  var $ = function(id){ return document.getElementById(id) };
  var esc = function(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
    })
  };
  var num = function(v, digits){
    if (v == null || !isFinite(Number(v))) return '—';
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: digits == null ? 2 : digits });
  };
  var usdc = function(v){ return num(v, 4) + ' USDC' };
  var bytes = function(v){
    if (v == null) return '—';
    var n = Number(v);
    if (!isFinite(n)) return '—';
    var units = ['B','KB','MB','GB','TB'];
    var i = 0;
    while (n >= 1024 && i < units.length - 1) { n = n / 1024; i++ }
    return n.toFixed(i === 0 ? 0 : 2) + ' ' + units[i];
  };
  var when = function(ms){
    if (!ms) return '—';
    try { return new Date(ms).toLocaleString() } catch (e) { return '—' }
  };
  var uptime = function(ms){
    if (!ms || ms < 0) return '—';
    var m = Math.floor(ms / 60000);
    var d = Math.floor(m / 1440);
    var h = Math.floor((m % 1440) / 60);
    return (d > 0 ? d + 'd ' : '') + h + 'h ' + (m % 60) + 'm';
  };
  var msg = function(kind, text){
    var el = $('msg');
    if (!text) { el.innerHTML = ''; return }
    el.innerHTML = '<div class="' + kind + '">' + esc(text) + '</div>';
    if (kind === 'ok') setTimeout(function(){ if (el.textContent.indexOf(text) >= 0) el.innerHTML = '' }, 4000);
  };
  function api(path, body){
    var opts = { credentials: 'same-origin', headers: { 'x-genkaku-admin': '1' } };
    if (body !== undefined) {
      opts.method = 'POST';
      opts.headers['content-type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch('/admin/api/' + path, opts).then(function(res){
      return res.json().catch(function(){ return {} }).then(function(data){
        if (!res.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + res.status));
        return data;
      });
    });
  }

  function showLogin(){
    $('login').classList.remove('hide');
    $('app').classList.add('hide');
    $('logout').classList.add('hide');
    $('who').textContent = '';
    setTimeout(function(){ try { $('pw').focus() } catch (e) {} }, 30);
  }
  function showApp(){
    $('login').classList.add('hide');
    $('app').classList.remove('hide');
    $('logout').classList.remove('hide');
    $('who').textContent = t('seed VM console', 'seed VM 控制台');
    $('pw-banner').classList.toggle('hide', !(state && state.auth && state.auth.mustChangePassword));
  }

  function render(s){
    state = s;
    var seed = s.seed && s.seed.value ? s.seed.value : null;
    var chain = s.chain && s.chain.value ? s.chain.value : null;
    var traffic = s.traffic || {};

    $('ov-workers').innerHTML = chain ? num(chain.workers, 0) : '<small>—</small>';
    $('ov-announced').innerHTML = seed ? num(seed.announcedWorkers, 0) : '<small>—</small>';
    $('ov-users').innerHTML = chain ? num(chain.users, 0) : '<small>—</small>';
    $('ov-clients').innerHTML = seed ? num(seed.clientPeers24h, 0) : '<small>—</small>';

    $('ov-settled').innerHTML = chain ? usdc(chain.settledUsdc) : '<small>—</small>';
    $('ov-fee').innerHTML = chain ? usdc(chain.feeUsdc) : '<small>—</small>';
    $('ov-refunded').innerHTML = chain ? usdc(chain.refundedUsdc) : '<small>—</small>';
    $('ov-sessions').innerHTML = chain ? num(chain.sessions, 0) : '<small>—</small>';

    $('ov-reservations').innerHTML = seed ? num(seed.relayReservations, 0) : '<small>—</small>';
    $('ov-relaysessions').innerHTML = seed ? num(seed.relaySessions, 0) : '<small>—</small>';
    $('ov-traffic').innerHTML = traffic.available ? bytes((traffic.inBytes || 0) + (traffic.outBytes || 0)) : '<small>n/a</small>';
    $('ov-cost').innerHTML = traffic.available
      ? usdc(traffic.totalUsdc)
      : usdc(Number(p.vmMonthlyUsdc || 0)) + ' <small>+ traffic</small>';

    $('tr-addrs').innerHTML = seed ? (seed.addrs || []).map(function(a){ return '<code>' + esc(a) + '</code>' }).join('<br>') : '—';
    $('tr-relay').innerHTML = seed ? (seed.relay || []).map(function(a){ return '<code>' + esc(a) + '</code>' }).join('<br>') : '—';
    $('tr-reservations').textContent = seed ? num(seed.relayReservations, 0) : '—';
    $('tr-slots').textContent = seed ? num(seed.relayLimits.maxReservations, 0) : '—';
    $('tr-cap').textContent = seed ? num(seed.relayLimits.dataLimitMb, 0) + ' MB / session' : '—';
    $('tr-in').textContent = traffic.available ? bytes(traffic.inBytes) : '—';
    $('tr-out').textContent = traffic.available ? bytes(traffic.outBytes) : '—';
    $('tr-since').textContent = traffic.since ? when(traffic.since) : '—';
    $('tr-uptime').textContent = seed ? uptime(Date.now() - seed.startedAt) : '—';

    var p = s.pricing || {};
    if (document.activeElement !== $('p-vm')) $('p-vm').value = p.vmMonthlyUsdc || '';
    if (document.activeElement !== $('p-in')) $('p-in').value = p.usdcPerGbIn || '';
    if (document.activeElement !== $('p-out')) $('p-out').value = p.usdcPerGbOut || '';
    if (document.activeElement !== $('p-free')) $('p-free').value = p.freeGbPerMonth || '';
    $('p-preview').textContent = traffic.available
      ? t('Billable this month: ', '本期計費：') + num(traffic.billableGb, 3) + ' GB → '
        + usdc(traffic.trafficUsdc) + t(' traffic + ', ' 流量 + ') + usdc(Number(p.vmMonthlyUsdc || 0)) + t(' VM = ', ' VM = ') + usdc(traffic.totalUsdc)
      : t('Byte counters are not available on this host; the estimate shows the VM cost only.',
          '此主機無法取得位元組計數；估算僅含 VM 成本。');

    $('m-volume').textContent = chain ? usdc(chain.escrowVolumeUsdc) : '—';
    $('m-settled').textContent = chain ? usdc(chain.settledUsdc) : '—';
    $('m-fee').textContent = chain ? usdc(chain.feeUsdc) : '—';
    $('m-refunded').textContent = chain ? usdc(chain.refundedUsdc) : '—';
    $('m-escrow').textContent = s.contracts.escrow || '—';
    $('m-registry').textContent = s.contracts.registry || '—';
    $('m-usdc').textContent = s.contracts.usdc || '—';
    $('m-scan').textContent = chain
      ? t('Scanned from block ', '掃描起始區塊 ') + chain.fromBlock + t(' · last scan ', ' · 上次掃描 ') + when(chain.scannedAt)
      : (s.chain && s.chain.error ? s.chain.error : '—');

    $('l-seed').href = s.seedUrl || '/seed/peers';
    $('l-seed').textContent = s.seedUrl || '/seed/peers';

    if (s.seed && s.seed.error) msg('err', t('Seed stats: ', 'Seed 統計：') + s.seed.error);
    else if (s.chain && s.chain.error && !chain) msg('err', t('Chain stats: ', '鏈上統計：') + s.chain.error);
    else msg('', '');

    showApp();
  }

  function load(){
    return api('overview').then(render).catch(function(err){
      if (err && /not signed in/.test(err.message)) showLogin();
      else msg('err', err.message || String(err));
    });
  }

  $('signin').onclick = function(){
    var pw = $('pw').value;
    if (!pw) return;
    $('signin').disabled = true;
    api('login', { password: pw }).then(function(){
      $('pw').value = '';
      msg('', '');
      routeFromHash();
    }).catch(function(err){
      msg('err', t('Sign in failed: ', '登入失敗：') + (err.message || String(err)));
    }).finally(function(){ $('signin').disabled = false });
  };
  $('pw').addEventListener('keydown', function(e){ if (e.key === 'Enter') $('signin').click() });

  $('logout').onclick = function(){
    api('logout', {}).finally(function(){ state = null; showLogin() });
  };

  Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function(btn){
    btn.onclick = function(){
      Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function(b){ b.classList.remove('on') });
      btn.classList.add('on');
      var tab = btn.getAttribute('data-tab');
      Array.prototype.forEach.call(document.querySelectorAll('#app > div[id^="tab-"]'), function(div){
        div.classList.toggle('hide', div.id !== 'tab-' + tab);
      });
      if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
    };
  });
  function routeFromHash(){
    var tab = (location.hash || '#overview').slice(1);
    var btn = document.querySelector('.tabs button[data-tab="' + tab + '"]');
    (btn || document.querySelector('.tabs button')).click();
    load();
  }

  $('p-save').onclick = function(){
    $('p-save').disabled = true;
    api('pricing', {
      vmMonthlyUsdc: $('p-vm').value,
      usdcPerGbIn: $('p-in').value,
      usdcPerGbOut: $('p-out').value,
      freeGbPerMonth: $('p-free').value
    }).then(function(){ msg('ok', t('Pricing saved.', '價格已儲存。')); return load() })
      .catch(function(err){ msg('err', t('Save failed: ', '儲存失敗：') + (err.message || String(err))) })
      .finally(function(){ $('p-save').disabled = false });
  };

  $('reset').onclick = function(){
    if (!confirm(t('Start a new usage window?', '要開始新的用量週期嗎？'))) return;
    api('reset-usage', {}).then(function(){ msg('ok', t('Usage reset.', '用量已重置。')); return load() })
      .catch(function(err){ msg('err', err.message || String(err)) });
  };

  $('pw-save').onclick = function(){
    var current = $('pw-current').value;
    var next = $('pw-next').value;
    var confirmPw = $('pw-confirm').value;
    if (next !== confirmPw) return msg('err', t('New passwords do not match.', '兩次輸入的新密碼不一致。'));
    api('password', { current: current, next: next }).then(function(){
      $('pw-current').value = ''; $('pw-next').value = ''; $('pw-confirm').value = '';
      msg('ok', t('Password changed.', '密碼已更新。'));
      $('pw-banner').classList.add('hide');
    }).catch(function(err){ msg('err', t('Change failed: ', '修改失敗：') + (err.message || String(err))) });
  };

  window.addEventListener('hashchange', function(){
    var tab = (location.hash || '#overview').slice(1);
    var btn = document.querySelector('.tabs button[data-tab="' + tab + '"]');
    if (btn) btn.click();
  });

  api('session').then(function(s){ state = s; routeFromHash() })
    .catch(function(){ showLogin() });
})();
</script>
</body>
</html>`
