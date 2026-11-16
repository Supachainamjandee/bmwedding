// ใช้ร่วมกันทุกหน้า
(function () {
  const C = window.APP_CONFIG;

  async function apiGet(params) {
    const url = C.API_URL + '?' + new URLSearchParams(params).toString();
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    return res.json();
  }

  // ส่งเป็น text/plain เพื่อไม่ให้มี CORS preflight กับ Apps Script
  async function apiPost(body) {
    const res = await fetch(C.API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  function qrSvg(text, cell) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: cell || 6, margin: 2, scalable: true });
  }

  function guestUrl(token) { return C.SITE_URL + '/guest.html?t=' + encodeURIComponent(token); }
  function albumUrl() { return C.SITE_URL + '/album.html'; }

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    (children || []).forEach(c => n.appendChild(c));
    return n;
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  window.App = { apiGet, apiPost, qrSvg, guestUrl, albumUrl, el, fmtTime };
})();
