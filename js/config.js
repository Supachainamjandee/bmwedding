// ค่าที่ต้องแก้ก่อนใช้งานจริง (ดู README ขั้น 2–3)
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzccQHw2znxYuljfzL5fXyoy3DlPufuTrJvMLBqXuwK_0riWElpOn5gdcQiZY4pFr0c/exec', // URL ของ Apps Script web app
  SITE_URL: 'https://supachainamjandee.github.io/bmwedding',                       // URL เว็บนี้ ไม่มี / ท้าย
  MAP_URL: 'https://maps.app.goo.gl/2BXURZNuEPL3kS5f7?g_st=ic',               // ลิงก์แผนที่ (ข้อ 36) ว่างไว้ = ปุ่มแผนที่ขึ้นว่า "รอลิงก์แผนที่"
  MAX_SEC: 60,               // ข้อ 2
  COUNTDOWN_SEC: 3,          // ข้อ 6
  RETAKES: 1,                // ข้อ 3
  SAVED_SCREEN_MS: 1500,     // ข้อ 44
  BACK_HOME_SEC: 15,         // K7 กลับหน้าแรก (ปรับได้)
  IDLE_RESET_SEC: 90,        // ไม่มีคนแตะจอที่ K3/K5 นานเท่านี้ -> กลับ K1
  OVERLAY_IN_VIDEO: true,    // ข้อ 38: #BMWedding + 04.12.26 ติดในไฟล์ (false = อัดจากกล้องตรง ไม่มีตัวอักษร)
  VIDEO_BITRATE: 2000000,    // ~19 MB/นาที เผื่อไม่ให้ไฟล์เกินขีดจำกัด Apps Script
  HASHTAG: '#BMWedding',
  DATE_TEXT: '04.12.26'
};
