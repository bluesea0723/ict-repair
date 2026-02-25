const API_URL = ".";

const STATUS_ORDER = { "学内受付": 0, "修理手配待ち": 1, "外部修理中": 2, "返却準備中": 3, "返却可能": 4, "対応完了": 5 };
const TIME_FIELDS = { "学内受付": "time_received", "修理手配待ち": "time_waiting", "外部修理中": "time_repairing", "返却準備中": "time_preparing", "返却可能": "time_returnable", "対応完了": "time_completed" };

const CHECK_ITEMS = [
    { id: "chk_labels_attached", label: "1. ラベル3種作成・貼付", time: "time_chk_labels_attached" },
    { id: "chk_screen_film", label: "2. 画面フィルム再貼付・更新", time: "time_chk_screen_film" },
    { id: "chk_data_deleted", label: "3. データ削除 (Intune等)", time: "time_chk_data_deleted" },
    { id: "chk_restored", label: "4. リストア", time: "time_chk_restored" },
    { id: "chk_login_tested", label: "5. ログイン (PC名変更・Teams確認)", time: "time_chk_login_tested" },
    { id: "chk_kb_label", label: "6. キーボードラベル作成・貼付", time: "time_chk_kb_label" },
    { id: "chk_loaner_returned", label: "7. 貸出機有無確認・返却", time: "time_chk_loaner_returned" }
];

let globalTickets = [];

function switchTab(tabId, clickedButton) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    if (clickedButton) {
        clickedButton.classList.add('active');
    } else {
        const targetBtn = Array.from(document.querySelectorAll('.tab-button')).find(btn => btn.getAttribute('onclick').includes(tabId));
        if (targetBtn) targetBtn.classList.add('active');
    }
}

async function fetchTickets() {
    const response = await fetch(`${API_URL}/tickets/`);
    const tickets = await response.json();
    globalTickets = tickets; 
    
    document.querySelectorAll(".drop-zone").forEach(zone => zone.innerHTML = "");
    document.getElementById("completed-list").innerHTML = "";
    document.getElementById("abnormal-list").innerHTML = ""; 

    tickets.forEach(ticket => {
        const card = document.createElement("div");
        card.className = "card";
        card.id = `ticket-${ticket.ticket_id}`;
        card.dataset.status = ticket.status; 
        
        const nameStr = ticket.name ? ticket.name : "氏名未入力";
        let targets = [];
        if (ticket.repair_pc) targets.push("💻PC");
        if (ticket.repair_kb) targets.push("⌨️KB");
        if (ticket.repair_pen) targets.push("🖊️ペン");
        const targetStr = targets.length > 0 ? `<div style="color: #d63384; font-weight: bold; font-size: 0.9em;">対象: ${targets.join(" / ")}</div>` : "";

        const loanerStr = ticket.loaner_device ? `<div style="font-size: 0.8em; color: #17a2b8; margin-top: 3px;">🔁貸出機: ${ticket.loaner_device}</div>` : "";
        const filmStr = ticket.needs_film ? `<div style="font-size: 0.8em; color: #ff8c00; margin-top: 3px; font-weight: bold;">⚠️フィルム購入希望: 有</div>` : "";

        card.innerHTML = `<div class="ticket-header">${ticket.student_id} ${nameStr}</div>${targetStr}${loanerStr}${filmStr}`;

        if (ticket.status === "対応完了") {
            card.classList.add("completed");
            card.onclick = () => openModal(ticket);
            document.getElementById("completed-list").appendChild(card);
        } else if (ticket.is_abnormal) {
            card.classList.add("abnormal");
            card.onclick = () => openModal(ticket);
            document.getElementById("abnormal-list").appendChild(card);
        } else {
            card.draggable = true;
            card.ondragstart = (e) => { 
                e.dataTransfer.setData("text/plain", ticket.ticket_id); 
                card.classList.add("dragging"); 
                card.dataset.isDragging = "true";
            };
            card.ondragend = () => { 
                card.classList.remove("dragging"); 
                setTimeout(() => card.dataset.isDragging = "false", 50); 
            };
            card.onclick = () => {
                if(card.dataset.isDragging === "true") return;
                openModal(ticket);
            };

            let targetZone = document.querySelector(`.drop-zone[data-status="${ticket.status}"]`);
            if (!targetZone) targetZone = document.querySelector('.drop-zone[data-status="学内受付"]');
            targetZone.appendChild(card);
        }
    });
}

function openModal(ticket) {
    const modal = document.getElementById("ticket-modal");
    const modalBody = document.getElementById("modal-body");

    const classStr = ticket.grade ? `${ticket.grade}年${ticket.class_num}組${ticket.student_num}番` : "未設定";
    let targets = [];
    if (ticket.repair_pc) targets.push("💻PC");
    if (ticket.repair_kb) targets.push("⌨️キーボード");
    if (ticket.repair_pen) targets.push("🖊️ペン");
    
    let abnormalBtnHtml = "";
    if (ticket.status !== "対応完了") {
        if (ticket.is_abnormal) {
            abnormalBtnHtml = `<button class="btn-abnormal-toggle resolve" style="position:static; margin:0;" onclick="toggleAbnormal(${ticket.ticket_id}, false)">✅ 異常解除</button>`;
        } else {
            abnormalBtnHtml = `<button class="btn-abnormal-toggle" style="position:static; margin:0;" onclick="toggleAbnormal(${ticket.ticket_id}, true)">🚨 異常退避</button>`;
        }
    }

    const filmStatusStr = ticket.needs_film ? `<span style="color:#ff8c00; font-weight:bold;">有</span>` : "無";

    let statusAreaHtml = "";
    if (ticket.is_abnormal) {
        statusAreaHtml = `
            <div class="modal-section">
                <span style="background:#dc3545; color:white; padding:5px 12px; border-radius:12px; font-size:0.95em; font-weight:bold;">
                    異常・保留中（元の状態: ${ticket.status}）
                </span>
            </div>
        `;
    } else if (ticket.status === "対応完了") {
        statusAreaHtml = `
            <div class="modal-section">
                <span style="background:#6c757d; color:white; padding:5px 12px; border-radius:12px; font-size:0.95em; font-weight:bold;">
                    対応完了
                </span>
            </div>
        `;
    } else {
        statusAreaHtml = `
            <div class="modal-section" style="display: flex; align-items: center; gap: 10px; background: #eef2f5; padding: 10px; border-radius: 6px; border: 1px solid #ced4da;">
                <label style="font-size: 0.9em; font-weight: bold; color: #495057;">ステータス:</label>
                <select onchange="changeStatusFromModal(${ticket.ticket_id}, this.value, '${ticket.status}')" style="flex: 1; padding: 6px 10px; border-radius: 4px; border: 2px solid #007bff; font-size: 15px; color: #007bff; font-weight: bold; outline: none; cursor: pointer;">
                    <option value="学内受付" ${ticket.status === '学内受付' ? 'selected' : ''}>学内受付</option>
                    <option value="修理手配待ち" ${ticket.status === '修理手配待ち' ? 'selected' : ''}>修理手配待ち</option>
                    <option value="外部修理中" ${ticket.status === '外部修理中' ? 'selected' : ''}>外部修理中</option>
                    <option value="返却準備中" ${ticket.status === '返却準備中' ? 'selected' : ''}>返却準備中</option>
                    <option value="返却可能" ${ticket.status === '返却可能' ? 'selected' : ''}>返却可能</option>
                </select>
            </div>
        `;
    }

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 15px; padding-right: 35px;">
            <div style="font-size: 1.3em; font-weight: bold; color: #007bff;">伝票詳細 (ID: ${ticket.ticket_id})</div>
            <div style="display: flex; gap: 10px; align-items: center;">
                ${abnormalBtnHtml}
                <button onclick="printTicket(${ticket.ticket_id})" style="background: #17a2b8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">🖨️ 伝票印刷</button>
            </div>
        </div>
        
        ${statusAreaHtml}

        <div class="modal-section" style="font-size: 1.1em; margin-top: 15px;">
            <strong>${ticket.student_id} ${ticket.name || "氏名未入力"}</strong><br>
            <span style="font-size: 0.8em; color: #666;">${classStr}</span>
        </div>
        
        <div class="modal-section-split" style="display: flex; gap: 15px;">
            <div class="modal-section" style="flex: 1;">
                <strong>修理対象:</strong> ${targets.join(" / ") || "なし"}<br>
                <span style="font-size: 0.9em; color: #555;">PCシリアル: ${ticket.pc_serial || "未登録"}</span><br>
                <span style="font-size: 0.9em; color: #555;">KBシリアル: ${ticket.kb_serial || "未登録"}</span><br>
                <span style="font-size: 0.9em; color: #17a2b8; font-weight: bold;">貸出機: ${ticket.loaner_device || "なし"}</span><br>
                <span style="font-size: 0.9em; color: #333;">保護フィルム購入希望: ${filmStatusStr}</span>
            </div>
            
            <div class="modal-section" style="flex: 1; background:#f8f9fa; padding:10px; border-radius:8px; font-size: 0.85em; border: 1px solid #eee;">
                <strong>🕒 進行履歴</strong>
                <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #555;">
                    <li>学内受付: ${ticket.time_received || "-"}</li>
                    <li>手配待ち: ${ticket.time_waiting || "-"}</li>
                    <li>外部修理: ${ticket.time_repairing || "-"}</li>
                    <li>返却準備: ${ticket.time_preparing || "-"}</li>
                    <li>返却可能: ${ticket.time_returnable || "-"}</li>
                    <li>対応完了: ${ticket.time_completed || "-"}</li>
                </ul>
            </div>
        </div>

        <div class="modal-section">
            <strong>破損状況 (${ticket.damage_category || "分類なし"}):</strong>
            <div style="background:#f8f9fa; padding:10px; border-radius:4px; margin-top:5px; white-space:pre-wrap; font-size:0.95em;">${ticket.damage_details || "記載なし"}</div>
        </div>
        
        <div class="modal-section">
            <strong>社内メモ:</strong>
            <textarea style="width:100%; box-sizing:border-box; padding:8px; border-radius:4px; margin-top:5px; font-family:sans-serif; min-height:60px;" 
                      placeholder="特記事項や引き継ぎメモを記入..." 
                      onchange="updateTextField(${ticket.ticket_id}, 'memo', this.value)">${ticket.memo || ""}</textarea>
        </div>
    `;

    if (ticket.status !== "対応完了") {
        let checkHtml = "";
        let allChecked = true;

        CHECK_ITEMS.forEach(item => {
            const isChecked = ticket[item.id];
            if (!isChecked) allChecked = false;
            const timeStr = isChecked && ticket[item.time] ? `<span style="font-size:0.8em; color:#888; margin-left:8px;">(${ticket[item.time]})</span>` : "";
            
            checkHtml += `
                <label style="cursor:pointer; font-size:15px; display:block; margin-bottom:5px;">
                    <input type="checkbox" style="width:20px;height:20px;vertical-align:-4px;" 
                           onchange="handleCheckChange(${ticket.ticket_id}, '${item.id}', '${item.time}', this.checked)" 
                           ${isChecked ? "checked" : ""}> 
                    ${item.label} ${timeStr}
                </label>
            `;
        });

        const btnStyle = allChecked ? "background:#28a745; cursor:pointer;" : "background:#ccc; cursor:not-allowed;";
        const btnDisabled = allChecked ? "" : "disabled";
        const btnText = allChecked ? "🏁 この伝票を「対応完了」にする" : "⚠️ 全てのチェックリストを完了してください";

        html += `
            <div class="modal-section" style="background:#e9ecef; padding:15px; border-radius:8px; margin-top: 20px;">
                <strong style="display:block; margin-bottom:10px;">✅ 作業チェックリスト</strong>
                ${checkHtml}
            </div>
            <button class="btn-submit" style="${btnStyle} margin-top: 15px;" onclick="markAsCompletedModal(${ticket.ticket_id})" ${btnDisabled}>${btnText}</button>
        `;
    }

    modalBody.innerHTML = html;
    modal.classList.add("show");
}

function closeModal() { document.getElementById("ticket-modal").classList.remove("show"); }
window.onclick = function(event) { if (event.target === document.getElementById("ticket-modal")) closeModal(); }

async function updateTextField(ticketId, fieldName, value) {
    await fetch(`${API_URL}/tickets/${ticketId}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ [fieldName]: value }) 
    });
    fetchTickets(); 
}

async function toggleAbnormal(ticketId, isAbnormal) {
    const msg = isAbnormal ? "この伝票をカンバンボードから外し、「異常・保留」に移動させますか？" : "異常が解決しましたか？この伝票をカンバンボードに戻します。";
    if (!confirm(msg)) return;
    
    await fetch(`${API_URL}/tickets/${ticketId}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ is_abnormal: isAbnormal }) 
    });
    closeModal();
    fetchTickets();
    if (isAbnormal) switchTab('tab-abnormal'); 
}

async function handleCheckChange(ticketId, fieldName, timeFieldName, isChecked) {
    if (!isChecked) {
        if (!confirm("チェックを外すと記録された時刻も消去されます。本当に外しますか？")) {
            const response = await fetch(`${API_URL}/tickets/`);
            const tickets = await response.json();
            const updatedTicket = tickets.find(t => t.ticket_id === ticketId);
            if (updatedTicket) openModal(updatedTicket); 
            return;
        }
    }

    const now = new Date().toLocaleString("ja-JP");
    const timeValue = isChecked ? now : null; 

    await fetch(`${API_URL}/tickets/${ticketId}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ [fieldName]: isChecked, [timeFieldName]: timeValue }) 
    });

    const response = await fetch(`${API_URL}/tickets/`);
    const tickets = await response.json();
    const updatedTicket = tickets.find(t => t.ticket_id === ticketId);
    if (updatedTicket) openModal(updatedTicket); 
    fetchTickets();
}

async function markAsCompletedModal(ticketId) {
    if (!confirm("「対応完了」にしますか？")) return;
    const now = new Date().toLocaleString("ja-JP");
    await fetch(`${API_URL}/tickets/${ticketId}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ status: "対応完了", time_completed: now }) 
    });
    closeModal();
    fetchTickets();
}

async function changeStatusFromModal(ticketId, newStatus, oldStatus) {
    if (newStatus === oldStatus) return;

    const oldIdx = STATUS_ORDER[oldStatus];
    const newIdx = STATUS_ORDER[newStatus];

    let payload = { status: newStatus };
    const now = new Date().toLocaleString("ja-JP");
    const statuses = Object.keys(STATUS_ORDER);

    if (newIdx > oldIdx) {
        for (let i = oldIdx + 1; i <= newIdx; i++) {
            payload[TIME_FIELDS[statuses[i]]] = now;
        }
    } else {
        if (!confirm("通常とは異なる操作です。伝票詳細の時刻を削除し、ステータスを変更しますか？")) {
            const response = await fetch(`${API_URL}/tickets/`);
            const tickets = await response.json();
            const updatedTicket = tickets.find(t => t.ticket_id === ticketId);
            if (updatedTicket) openModal(updatedTicket); 
            return;
        }
        payload[TIME_FIELDS[newStatus]] = now;
        for (let i = newIdx + 1; i < statuses.length; i++) {
            payload[TIME_FIELDS[statuses[i]]] = null;
        }
    }

    await fetch(`${API_URL}/tickets/${ticketId}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
    });
    closeModal();
    fetchTickets();
}

function allowDrop(e) { e.preventDefault(); }

async function drop(e) {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("text/plain");
    const targetZone = e.target.closest('.drop-zone');
    if (!targetZone) return;
    
    const newStatus = targetZone.getAttribute("data-status");
    const card = document.getElementById(`ticket-${ticketId}`);
    const oldStatus = card.dataset.status;

    if (newStatus === oldStatus) return; 

    await changeStatusFromModal(ticketId, newStatus, oldStatus);
}

async function createTicket() {
    let hasError = false;
    const reqFields = ["grade", "class_num", "student_num", "student_id", "name", "damage_category", "damage_details"];
    reqFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el.value.trim()) { el.classList.add("error"); hasError = true; }
    });

    const repair_pc = document.getElementById("repair_pc").checked;
    const repair_kb = document.getElementById("repair_kb").checked;
    const repair_pen = document.getElementById("repair_pen").checked;
    if (!repair_pc && !repair_kb && !repair_pen) {
        document.getElementById("repair_targets").classList.add("error");
        hasError = true;
    }
    if (document.getElementById("student_id").value.trim().length > 5) {
        document.getElementById("student_id").classList.add("error");
        hasError = true;
    }
    if (hasError) return; 

    const needs_film = document.querySelector('input[name="needs_film"]:checked').value === "true";

    const payload = {
        grade: document.getElementById("grade").value.trim(),
        class_num: document.getElementById("class_num").value.trim(),
        student_num: document.getElementById("student_num").value.trim(),
        student_id: document.getElementById("student_id").value.trim(),
        name: document.getElementById("name").value.trim(),
        repair_pc: repair_pc,
        repair_kb: repair_kb,
        repair_pen: repair_pen,
        pc_serial: document.getElementById("pc_serial").value.trim(),
        kb_serial: document.getElementById("kb_serial").value.trim(),
        loaner_device: document.getElementById("loaner_device").value.trim(),
        needs_film: needs_film,
        damage_category: document.getElementById("damage_category").value,
        damage_details: document.getElementById("damage_details").value.trim(),
        memo: document.getElementById("memo").value.trim(),
        status: "学内受付",
        time_received: new Date().toLocaleString("ja-JP")
    };

    await fetch(`${API_URL}/tickets/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    ["grade", "class_num", "student_num", "student_id", "name", "pc_serial", "kb_serial", "loaner_device", "damage_category", "damage_details", "memo"].forEach(id => document.getElementById(id).value = "");
    ["repair_pc", "repair_kb", "repair_pen"].forEach(id => document.getElementById(id).checked = false);
    document.querySelector('input[name="needs_film"][value="false"]').checked = true;
    
    fetchTickets();
    switchTab('tab-board');
}

function printTicket(ticketId) {
    const ticket = globalTickets.find(t => t.ticket_id === ticketId);
    if (!ticket) return;

    const checkMark = (bool) => bool ? "☑" : "☐";

    const categories = ["液晶破損", "データ異常", "接続不良", "浸水", "接続部変形", "その他"];
    const categoryHtml = categories.map(cat => {
        if (cat === ticket.damage_category) {
            return `<span style="border: 1.5px solid #000; border-radius: 12px; padding: 2px 5px; display: inline-block; margin: 0 1px; font-weight: bold; font-size: 13px;">${cat}</span>`;
        } else {
            return `<span style="padding: 2px 5px; display: inline-block; margin: 0 1px; color: #444; font-size: 13px;">${cat}</span>`;
        }
    }).join("");

    const printHtml = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <title>修理伝票 - ${ticket.student_id} ${ticket.name}</title>
        <style>
            body { font-family: "MS Mincho", "Noto Serif JP", serif; color: #000; line-height: 1.3; font-size: 13px; margin: 0; padding: 8px; }
            @page { size: A4; margin: 10mm 15mm; }
            .print-container { max-width: 100%; margin: 0 auto; position: relative; }
            /* ★追加：IDを右上に絶対配置。縦のスペースを一切消費しません */
            .id-badge { position: absolute; top: 0; right: 0; font-size: 16px; font-weight: bold; border: 1px solid #000; padding: 2px 10px; border-radius: 4px; }
            h1 { text-align: center; font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 12px; letter-spacing: 2px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
            th { background-color: #f4f4f4; text-align: center; font-weight: bold; }
            .section-title { font-size: 15px; font-weight: bold; margin-bottom: 5px; border-left: 5px solid #000; padding-left: 8px; }
            
            .checklist-item { font-size: 14px; margin-bottom: 8px; display: flex; align-items: flex-start; }
            .checklist-box { font-size: 20px; line-height: 1; margin-right: 6px; }
            .checklist-text strong { font-size: 15px; display: block; }
            .checklist-text span { font-size: 10px; color: #333; }

            .date-cell { text-align: center; height: 45px; position: relative; white-space: nowrap; }
            .date-text { display: block; margin-top: 3px; font-size: 12px; }
            .staff-sign { position: absolute; bottom: 2px; right: 2px; font-size: 11px; }
        </style>
    </head>
    <body>
        <div class="print-container">
            <div class="id-badge">ID: ${ticket.ticket_id}</div>
            
            <h1>生徒用PC 修理・返却伝票</h1>
            
            <div class="section-title">■ 生徒情報</div>
            <table>
                <tr>
                    <th style="width: 12%;">学年</th>
                    <th style="width: 12%;">組</th>
                    <th style="width: 12%;">番</th>
                    <th style="width: 25%;">学籍番号</th>
                    <th style="width: 39%;">氏名</th>
                </tr>
                <tr style="text-align: center; font-size: 16px;">
                    <td>${ticket.grade || " "}</td>
                    <td>${ticket.class_num || " "}</td>
                    <td>${ticket.student_num || " "}</td>
                    <td>${ticket.student_id}</td>
                    <td style="font-weight: bold;">${ticket.name || " "}</td>
                </tr>
            </table>

            <div class="section-title">■ 端末・破損情報</div>
            <table>
                <tr>
                    <th style="width: 22%;">修理対象</th>
                    <td colspan="3" style="font-size: 15px;">
                        ${checkMark(ticket.repair_pc)} PC本体　　
                        ${checkMark(ticket.repair_kb)} キーボード　　
                        ${checkMark(ticket.repair_pen)} タッチペン
                    </td>
                </tr>
                <tr>
                    <th>貸出端末名</th>
                    <td style="font-size: 15px; text-align: center;">${ticket.loaner_device || "なし"}</td>
                    <th>保護フィルム購入</th>
                    <td style="font-size: 15px; text-align: center;">${ticket.needs_film ? "【 有 】" : "無"}</td>
                </tr>
                <tr>
                    <th style="width: 22%;">PCシリアル</th>
                    <td style="width: 32%;">${ticket.pc_serial || " "}</td>
                    <th style="width: 20%;">KBシリアル</th>
                    <td style="width: 26%;">${ticket.kb_serial || " "}</td>
                </tr>
                <tr>
                    <th>破損分類</th>
                    <td colspan="3" style="padding: 4px 2px;">
                        ${categoryHtml}
                    </td>
                </tr>
                <tr>
                    <th>具体的な症状</th>
                    <td colspan="3" style="height: 45px; vertical-align: top; white-space: pre-wrap;">${ticket.damage_details || " "}</td>
                </tr>
                <tr>
                    <th>社内メモ</th>
                    <td colspan="3" style="height: 30px; vertical-align: top; white-space: pre-wrap; font-size: 12px;">${ticket.memo || " "}</td>
                </tr>
            </table>

            <div class="section-title">■ 進行管理・担当者</div>
            <table>
                <tr>
                    <th style="width: 16.6%;">学内受付</th>
                    <th style="width: 16.6%;">修理手配</th>
                    <th style="width: 16.6%;">外部修理</th>
                    <th style="width: 16.6%;">返却準備</th>
                    <th style="width: 16.6%;">返却可能</th>
                    <th style="width: 17%;">対応完了</th>
                </tr>
                <tr>
                    <td class="date-cell">
                        <span class="date-text">${ticket.time_received ? ticket.time_received.split(' ')[0] : " "}</span>
                        <div class="staff-sign">担当:＿＿＿＿</div>
                    </td>
                    <td class="date-cell">
                        <span class="date-text">${ticket.time_waiting ? ticket.time_waiting.split(' ')[0] : " "}</span>
                        <div class="staff-sign">担当:＿＿＿＿</div>
                    </td>
                    <td class="date-cell">
                        <span class="date-text">${ticket.time_repairing ? ticket.time_repairing.split(' ')[0] : " "}</span>
                        <div class="staff-sign">担当:＿＿＿＿</div>
                    </td>
                    <td class="date-cell">
                        <span class="date-text">${ticket.time_preparing ? ticket.time_preparing.split(' ')[0] : " "}</span>
                        <div class="staff-sign">担当:＿＿＿＿</div>
                    </td>
                    <td class="date-cell">
                        <span class="date-text">${ticket.time_returnable ? ticket.time_returnable.split(' ')[0] : " "}</span>
                        <div class="staff-sign">担当:＿＿＿＿</div>
                    </td>
                    <td class="date-cell">
                        <span class="date-text">${ticket.time_completed ? ticket.time_completed.split(' ')[0] : " "}</span>
                        <div class="staff-sign">担当:＿＿＿＿</div>
                    </td>
                </tr>
            </table>

            <div class="section-title" style="margin-top: 10px;">■ 返却チェックリスト</div>
            <div style="border: 1px solid #000; padding: 10px 15px;">
                <div class="checklist-item">
                    <div class="checklist-box">${checkMark(ticket.chk_labels_attached)}</div>
                    <div class="checklist-text"><strong>ラベル3種作成・貼付</strong><span>・裏面左上大　・画面右上小　・シリアルナンバー保護シール小</span></div>
                </div>
                <div class="checklist-item">
                    <div class="checklist-box">${checkMark(ticket.chk_screen_film)}</div>
                    <div class="checklist-text"><strong>画面フィルム再貼付・更新</strong></div>
                </div>
                <div class="checklist-item">
                    <div class="checklist-box">${checkMark(ticket.chk_data_deleted)}</div>
                    <div class="checklist-text"><strong>データ削除</strong><span>Microsoft Intuneからの登録削除</span></div>
                </div>
                <div class="checklist-item">
                    <div class="checklist-box">${checkMark(ticket.chk_restored)}</div>
                    <div class="checklist-text"><strong>リストア</strong><span>保護者アカウント作成者リストで該当者を確認</span></div>
                </div>
                <div class="checklist-item">
                    <div class="checklist-box">${checkMark(ticket.chk_login_tested)}</div>
                    <div class="checklist-text"><strong>ログイン</strong><span>PC名変更・不都合が生じたらTeamsへ投稿</span></div>
                </div>
                <div class="checklist-item">
                    <div class="checklist-box">${checkMark(ticket.chk_kb_label)}</div>
                    <div class="checklist-text"><strong>キーボード ラベル作成・貼付</strong><span>個体番号確認・組番氏名を箱に記載</span></div>
                </div>
                <div class="checklist-item" style="margin-bottom: 0;">
                    <div class="checklist-box">${checkMark(ticket.chk_loaner_returned)}</div>
                    <div class="checklist-text"><strong>貸出機有無確認・返却</strong><span>※貸出機未返却の場合は、生徒の修理完了機を決して返却しない!!</span></div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    let oldIframe = document.getElementById("print-iframe");
    if (oldIframe) oldIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = "print-iframe";
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printHtml);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }, 250);
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".req-field").forEach(el => {
        el.addEventListener("input", () => el.classList.remove("error"));
        el.addEventListener("change", () => el.classList.remove("error"));
    });
    document.querySelectorAll("#repair_targets input").forEach(el => {
        el.addEventListener("change", () => document.getElementById("repair_targets").classList.remove("error"));
    });
});

fetchTickets();