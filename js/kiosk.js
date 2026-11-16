// บูธ iPad: K1 → K3 → K4 → K5 → K6 → K7 → K1
(function () {
  const C = window.APP_CONFIG;
  const $ = id => document.getElementById(id);
  const screens = ['k1', 'k3', 'k4', 'k5', 'k6', 'k7'];

  let camStream = null, micStream = null;
  let recorder = null, chunks = [], recStart = 0, tickTimer = null, drawRaf = 0;
  let current = null;           // { blob, mime, duration }
  let retakesLeft = C.RETAKES;
  let idleTimer = null, k7Timer = null;

  function show(id) {
    screens.forEach(s => $(s).classList.toggle('hidden', s !== id));
    resetIdle(id);
  }

  // ---------- idle reset ----------
  function resetIdle(id) {
    clearTimeout(idleTimer);
    if (id === 'k3' || id === 'k5') idleTimer = setTimeout(goHome, C.IDLE_RESET_SEC * 1000);
  }
  document.addEventListener('pointerdown', () => {
    const vis = screens.find(s => !$(s).classList.contains('hidden'));
    resetIdle(vis);
  });

  function goHome() {
    clearInterval(k7Timer);
    stopRecording(true);
    current = null;
    retakesLeft = C.RETAKES;
    $('review').removeAttribute('src');
    show('k1');
  }

  // ---------- K1: สไลด์รูปพรีเวดดิ้ง ----------
  const thumbs = Array.from(document.querySelectorAll('#thumbs img'));
  let thumbIdx = 0;
  setInterval(() => {
    thumbs[thumbIdx].classList.remove('on');
    thumbIdx = (thumbIdx + 1) % thumbs.length;
    thumbs[thumbIdx].classList.add('on');
  }, 4000);

  UploadQueue.onChange((n, err) => {
    $('queueBadge').textContent = n ? ('คิวรอส่ง ' + n + ' คลิป' + (err ? ' · ' + err : '')) : '';
  });

  // ---------- กล้องและไมค์ ----------
  async function ensureStreams() {
    if (camStream && camStream.active && micStream && micStream.active) return;
    const camId = localStorage.getItem('camId');
    const micId = localStorage.getItem('micId');
    camStream = await navigator.mediaDevices.getUserMedia({
      video: camId ? { deviceId: { exact: camId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: micId ? { deviceId: { exact: micId } } : true, video: false
    });
    $('previewK3').srcObject = camStream;
    $('previewK4').srcObject = camStream;
  }

  function pickMime() {
    const list = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
    return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  }

  // วาดภาพกล้อง + #BMWedding + วันที่ ลง canvas แล้วอัดจาก canvas (ข้อ 38)
  function buildRecordStream(srcVideo) {
    const audio = micStream.getAudioTracks();
    if (!C.OVERLAY_IN_VIDEO) return new MediaStream([...camStream.getVideoTracks(), ...audio]);
    const v = srcVideo || $('previewK4');
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext('2d');
    function draw() {
      const vw = v.videoWidth || 1280, vh = v.videoHeight || 720;
      const s = Math.max(canvas.width / vw, canvas.height / vh);
      const dw = vw * s, dh = vh * s;
      ctx.drawImage(v, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
      // ป้ายมุมขวาล่าง
      const bx = canvas.width - 250, by = canvas.height - 110;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      roundRect(ctx, bx, by, 220, 80, 14); ctx.fill();
      ctx.fillStyle = '#7A5A38'; ctx.textAlign = 'right';
      ctx.font = '700 34px Mali, sans-serif'; ctx.fillText(C.HASHTAG, bx + 204, by + 40);
      ctx.font = '600 22px "Noto Sans Thai", sans-serif'; ctx.fillText(C.DATE_TEXT, bx + 204, by + 68);
      drawRaf = requestAnimationFrame(draw);
    }
    draw();
    return new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audio]);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------- K4 ----------
  async function startFlow() {
    show('k4');
    $('countBox').classList.remove('hidden');
    $('recLabel').classList.add('hidden');
    $('recBar').style.width = '0%';
    $('recTime').textContent = '0:00 / ' + App.fmtTime(C.MAX_SEC);
    for (let n = C.COUNTDOWN_SEC; n > 0; n--) {
      $('countNum').textContent = n;
      await new Promise(r => setTimeout(r, 1000));
      if ($('k4').classList.contains('hidden')) return; // ถูกยกเลิก
    }
    $('countBox').classList.add('hidden');
    $('recLabel').classList.remove('hidden');
    startRecording();
  }

  function startRecording() {
    const mime = pickMime();
    const stream = buildRecordStream();
    chunks = [];
    const opts = { videoBitsPerSecond: C.VIDEO_BITRATE, audioBitsPerSecond: 128000 };
    if (mime) opts.mimeType = mime;
    recorder = new MediaRecorder(stream, opts);
    recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      cancelAnimationFrame(drawRaf);
      clearInterval(tickTimer);
      if (recorder && recorder._discard) return;
      const type = (recorder && recorder.mimeType) || mime || 'video/mp4';
      const duration = Math.min(C.MAX_SEC, (Date.now() - recStart) / 1000);
      current = { blob: new Blob(chunks, { type }), mime: type, duration };
      openReview();
    };
    recStart = Date.now();
    recorder.start(1000);
    tickTimer = setInterval(() => {
      const t = (Date.now() - recStart) / 1000;
      $('recTime').textContent = App.fmtTime(t) + ' / ' + App.fmtTime(C.MAX_SEC);
      $('recBar').style.width = Math.min(100, t / C.MAX_SEC * 100) + '%';
      if (t >= C.MAX_SEC) stopRecording(false);
    }, 250);
  }

  function stopRecording(discard) {
    clearInterval(tickTimer);
    if (recorder && recorder.state !== 'inactive') {
      recorder._discard = !!discard;
      recorder.stop();
    } else {
      cancelAnimationFrame(drawRaf);
    }
  }

  // ---------- K5 ----------
  function openReview() {
    const v = $('review');
    v.src = URL.createObjectURL(current.blob);
    $('btnRetake').classList.toggle('hidden', retakesLeft <= 0);
    $('retakeUsed').classList.toggle('hidden', retakesLeft > 0);
    show('k5');
  }

  // ---------- K6 → K7 ----------
  async function send() {
    const token = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).replace(/[^A-Za-z0-9-]/g, '');
    const item = {
      token, blob: current.blob, mime: current.mime, duration: current.duration,
      retakeUsed: retakesLeft < C.RETAKES, createdAt: Date.now()
    };
    $('btnSend').disabled = true;
    try {
      await UploadQueue.enqueue(item); // เก็บลงเครื่องก่อนเสมอ
    } catch (e) {
      alert('บันทึกคลิปไม่สำเร็จ: ' + e.message); // ไม่ควรเกิด ถ้าเกิดให้ทีมงานดู
      $('btnSend').disabled = false;
      return;
    }
    $('btnSend').disabled = false;
    $('review').pause();
    show('k6');
    setTimeout(() => openThanks(token), C.SAVED_SCREEN_MS);
  }

  function openThanks(token) {
    const online = navigator.onLine;
    // ข้อ 32/45: เน็ตปกติ = QR คลิปตัวเอง, เน็ตล่ม = QR อัลบั้ม
    const url = online ? App.guestUrl(token) : App.albumUrl();
    $('qr').innerHTML = App.qrSvg(url, 8);
    $('qrLabel').textContent = online ? 'คลิปของคุณ + อัลบั้มรวม' : 'อัลบั้มคำอวยพร';
    $('k7Online').classList.toggle('hidden', !online);
    $('k7Offline').classList.toggle('hidden', online);
    let left = C.BACK_HOME_SEC;
    $('k7Sec').textContent = left;
    show('k7');
    clearInterval(k7Timer);
    k7Timer = setInterval(() => {
      left -= 1;
      $('k7Sec').textContent = left;
      if (left <= 0) goHome();
    }, 1000);
  }

  // ---------- ปุ่ม ----------
  $('btnStart').addEventListener('click', async () => {
    try { await ensureStreams(); show('k3'); }
    catch (e) { alert('เปิดกล้อง/ไมค์ไม่ได้: ' + e.message + '\nให้ทีมงานตรวจสิทธิ์กล้องและไมค์ใน Safari'); }
  });
  $('btnBack').addEventListener('click', goHome);
  $('btnRecord').addEventListener('click', startFlow);
  $('btnStop').addEventListener('click', () => {
    if ($('countBox').classList.contains('hidden')) stopRecording(false);
  });
  $('btnRetake').addEventListener('click', () => {
    if (retakesLeft <= 0) return;
    retakesLeft -= 1;
    $('review').pause();
    current = null;
    show('k3');
  });
  $('btnSend').addEventListener('click', send);
  $('btnDone').addEventListener('click', goHome);

  // กันจอดับ (ถ้าเบราว์เซอร์รองรับ) — ยังต้องตั้ง Auto-Lock = Never ใน iPad
  async function keepAwake() {
    try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (e) { /* ignore */ }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });
  keepAwake();

  // ---------- ตั้งค่าเครื่อง (index.html?setup) ----------
  async function openSetup() {
    $('setup').classList.remove('hidden');
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      tmp.getTracks().forEach(t => t.stop());
    } catch (e) { $('setupInfo').textContent = 'ขอสิทธิ์ไม่ได้: ' + e.message; return; }
    const devs = await navigator.mediaDevices.enumerateDevices();
    const fill = (sel, kind, key) => {
      sel.innerHTML = '';
      devs.filter(d => d.kind === kind).forEach(d => {
        const o = document.createElement('option');
        o.value = d.deviceId; o.textContent = d.label || kind;
        if (localStorage.getItem(key) === d.deviceId) o.selected = true;
        sel.appendChild(o);
      });
    };
    fill($('micSel'), 'audioinput', 'micId');
    fill($('camSel'), 'videoinput', 'camId');
    const n = await UploadQueue.count();
    $('setupInfo').textContent = 'รูปแบบไฟล์: ' + (pickMime() || 'ไม่รองรับ MediaRecorder') +
      ' · คิวรอส่ง: ' + n + ' · ออนไลน์: ' + (navigator.onLine ? 'ใช่' : 'ไม่');
  }
  function saveSetup() {
    localStorage.setItem('micId', $('micSel').value);
    localStorage.setItem('camId', $('camSel').value);
  }
  $('btnSaveSetup').addEventListener('click', () => {
    saveSetup();
    location.href = location.pathname; // ออกจากโหมดตั้งค่า
  });
  $('btnTestRec').addEventListener('click', async () => {
    saveSetup();
    camStream = micStream = null;
    await ensureStreams();
    const v = $('setupPreview');
    v.srcObject = camStream;
    v.classList.remove('hidden');
    await v.play().catch(() => {});
    const stream = buildRecordStream(v);
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: C.VIDEO_BITRATE } : {});
    const parts = [];
    rec.ondataavailable = e => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      cancelAnimationFrame(drawRaf);
      const blob = new Blob(parts, { type: rec.mimeType || mime });
      const p = $('testPlay');
      p.src = URL.createObjectURL(blob);
      p.classList.remove('hidden');
      $('setupInfo').textContent += ' · ไฟล์ทดสอบ 5 วิ = ' + (blob.size / 1048576).toFixed(2) +
        ' MB (60 วิ ≈ ' + (blob.size / 1048576 * 12).toFixed(1) + ' MB)';
    };
    rec.start(1000);
    setTimeout(() => rec.stop(), 5000);
  });

  if (new URLSearchParams(location.search).has('setup')) openSetup();
  show('k1');
})();
