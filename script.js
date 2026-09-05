/* ============================================================
   Ham Blaster — script.js
   สคริปต์ใช้ร่วมกันทุกหน้า: product.html / order.html / admin.html
   ตรวจสอบว่าอยู่หน้าไหนจาก element ที่มีอยู่ในหน้านั้น แล้วรัน
   ฟังก์ชันที่เกี่ยวข้องให้อัตโนมัติ
   ============================================================ */

/* ------------------------------------------------------------
   ⚙️ CONFIG — แก้ 2 ค่านี้ตอนได้ URL จริงจาก Apps Script / Google Sheet
   ------------------------------------------------------------ */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYAJ_C5gD9oiSArCAIcBAKJYjWWqh7Y5gLywDV1IiwhxMwcVGamiHtApF5ZFNiPnTA7A/exec"; // URL ของ Google Apps Script Web App (POST รับออเดอร์)
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQU-nP6fyOoF6wI-2aBf4aH36PoMiEOcKKJnG7Yj0nUXwYnKnxDomYfI9j2qU_j-9CF2puUKVm8QhYM/pub?gid=0&single=true&output=csv"; // URL CSV ของ Google Sheet (สำหรับหน้า admin)

const PRODUCT_TYPES = [
  "Glock18",
  "Typhoon Ataman Black Magpul 12.5",
  "FN SCAR-L",
  "Smith & Wesson",
  "MP5",
  "Water bullet"
];

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("product-list")) {
    initProductPage();
  }
  if (document.getElementById("orderFrom")) {
    initOrderPage();
  }
  if (document.querySelector("#orderTable tbody")) {
    initAdminPage();
  }
});

/* ============================================================
   1) หน้า product.html
   ============================================================ */
function initProductPage() {
  const listEl = document.getElementById("product-list");
  const filterBarEl = document.getElementById("filter-bar");

  fetch("products.json")
    .then((res) => {
      if (!res.ok) throw new Error("โหลด products.json ไม่สำเร็จ");
      return res.json();
    })
    .then((products) => {
      renderFilterBar(filterBarEl, products);
      renderProductList(listEl, products);

      // ถ้ามี ?type=xxx ใน URL ให้กรองอัตโนมัติตอนโหลดหน้า
      const params = new URLSearchParams(window.location.search);
      const typeParam = params.get("type");
      if (typeParam) {
        applyFilter(listEl, products, typeParam);
        setActiveFilterButton(filterBarEl, typeParam);
      }
    })
    .catch((error) => {
      console.error(error);
      listEl.innerHTML = `<p>ไม่สามารถโหลดข้อมูลสินค้าได้ในขณะนี้</p>`;
    });
}

// สร้างปุ่มกรองตาม type ทั้งหมด + ปุ่ม "ทั้งหมด"
function renderFilterBar(filterBarEl, products) {
  if (!filterBarEl) return;

  const allBtn = createFilterButton("ทั้งหมด", "all");
  filterBarEl.appendChild(allBtn);

  PRODUCT_TYPES.forEach((type) => {
    const btn = createFilterButton(type, type);
    filterBarEl.appendChild(btn);
  });

  filterBarEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-type]");
    if (!btn) return;

    const type = btn.dataset.type;
    setActiveFilterButton(filterBarEl, type);
    applyFilter(document.getElementById("product-list"), products, type);

    // อัปเดต URL parameter โดยไม่รีโหลดหน้า เพื่อให้แชร์ลิงก์กรองได้
    const url = new URL(window.location.href);
    if (type === "all") {
      url.searchParams.delete("type");
    } else {
      url.searchParams.set("type", type);
    }
    window.history.replaceState({}, "", url);
  });
}

function createFilterButton(label, type) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn--sm btn--outline filter-btn";
  btn.textContent = label;
  btn.dataset.type = type;
  return btn;
}

function setActiveFilterButton(filterBarEl, type) {
  if (!filterBarEl) return;
  const buttons = filterBarEl.querySelectorAll("button[data-type]");
  buttons.forEach((btn) => {
    const isActive =
      btn.dataset.type === type ||
      (type === "all" && btn.dataset.type === "all");
    btn.classList.toggle("filter-btn--active", isActive);
  });
}

// กรองรายการสินค้าตาม type แล้วเรนเดอร์ใหม่
function applyFilter(listEl, products, type) {
  if (!type || type === "all") {
    renderProductList(listEl, products);
    return;
  }
  const filtered = products.filter((p) => p.type === type);
  renderProductList(listEl, filtered);
}

// วาดการ์ดสินค้าทั้งหมดลงใน #product-list
function renderProductList(listEl, products) {
  if (!listEl) return;

  if (!products.length) {
    listEl.innerHTML = `<p>ไม่พบสินค้าตามที่เลือก</p>`;
    return;
  }

  listEl.innerHTML = products
    .map((p) => {
      const orderUrl = `order.html?item=${encodeURIComponent(
        p.name
      )}&price=${encodeURIComponent(p.price)}`;

      return `
        <div class="card product-card">
          <img class="card__image" src="${p.image}" alt="${p.name}" />
          <span class="card__type">${p.type}</span>
          <h3 class="card__title">${p.name}</h3>
          <p class="card__price">${p.price} บาท</p>
          <a class="btn btn--primary btn--block" href="${orderUrl}">สั่งซื้อ</a>
        </div>
      `;
    })
    .join("");
}

/* ============================================================
   2) หน้า order.html
   ============================================================ */
function initOrderPage() {
  const form = document.getElementById("orderFrom");
  const itemsInput = document.getElementById("items");
  const totalInput = document.getElementById("total");

  // อ่านค่า item และ price จาก URL parameter แล้วเติมลงฟอร์มอัตโนมัติ
  const params = new URLSearchParams(window.location.search);
  const itemParam = params.get("item");
  const priceParam = params.get("price");

  if (itemsInput && itemParam) {
    itemsInput.value = itemParam;
  }
  if (totalInput && priceParam) {
    totalInput.value = priceParam;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitOrder(form);
  });
}

function submitOrder(form) {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : "";
  };

  const payload = {
    costomerName: getVal("customerName"),
    contact: getVal("contact"),
    items: getVal("items"),
    total: getVal("total"),
    note: getVal("note")
  };

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
    .then(() => {
      window.location.href = "thankyou.html";
    })
    .catch((error) => {
      console.error(error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    });
}

/* ============================================================
   3) หน้า admin.html
   ============================================================ */
function initAdminPage() {
  const tbody = document.querySelector("#orderTable tbody");

  fetch(CSV_URL)
    .then((res) => {
      if (!res.ok) throw new Error("โหลดข้อมูล CSV ไม่สำเร็จ");
      return res.text();
    })
    .then((csvText) => {
      const rows = parseCSV(csvText);
      renderAdminTable(tbody, rows);
    })
    .catch((error) => {
      console.error(error);
      tbody.innerHTML = `<tr><td colspan="6">ไม่สามารถโหลดข้อมูลออเดอร์ได้ในขณะนี้</td></tr>`;
    });
}

/**
 * Parser CSV แบบเขียนเอง (ไม่พึ่ง library ภายนอก)
 * รองรับ: ฟิลด์ที่ครอบด้วย " ", คอมมาและขึ้นบรรทัดใหม่ภายในเครื่องหมายคำพูด,
 * เครื่องหมาย " ที่ escape ด้วย "" ภายในฟิลด์
 * คืนค่าเป็น array ของ array แถว (แถวแรกคือ header)
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  // รวมท้ายไฟล์ให้แน่ใจว่ามีการปิดฟิลด์/แถวสุดท้าย
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++; // ข้าม " ตัวที่สอง
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  // เก็บฟิลด์/แถวสุดท้ายที่เหลือ (กรณีไฟล์ไม่ได้ลงท้ายด้วยขึ้นบรรทัดใหม่)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // ตัดแถวว่างล้วนทิ้ง
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// วาดข้อมูลออเดอร์ลงตาราง #orderTable tbody เรียงล่าสุดขึ้นก่อน
function renderAdminTable(tbody, rows) {
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6">ยังไม่มีคำสั่งซื้อ</td></tr>`;
    return;
  }

  // แถวแรกถือเป็น header ของ CSV: timestamp, customerName, contact, items, total, note
  const [, ...dataRows] = rows;

  // เรียงจากล่าสุดขึ้นก่อน โดยอิงคอลัมน์แรก (วัน เวลา)
  const sorted = dataRows.slice().sort((a, b) => {
    const dateA = new Date(a[0]);
    const dateB = new Date(b[0]);
    return dateB - dateA;
  });

  tbody.innerHTML = sorted
    .map((cols) => {
      const [timestamp, customerName, contact, items, total, note] = cols;
      return `
        <tr>
          <td>${escapeHtml(timestamp)}</td>
          <td>${escapeHtml(customerName)}</td>
          <td>${escapeHtml(contact)}</td>
          <td>${escapeHtml(items)}</td>
          <td>${escapeHtml(total)}</td>
          <td>${escapeHtml(note)}</td>
        </tr>
      `;
    })
    .join("");
}

// ป้องกัน HTML injection ง่าย ๆ ตอนแสดงข้อมูลจาก CSV
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
