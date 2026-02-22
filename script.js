const API_URL = "http://127.0.0.1:8000";

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
            abnormalBtnHtml = `<button class="btn-abnormal-toggle resolve" onclick="toggleAbnormal(${ticket.ticket_id}, false)">異常解除</button>`;
        } else {
            abnormalBtnHtml = `<button class="btn-abnormal-toggle" onclick="toggleAbnormal(${ticket.ticket_id}, true)">異常退避</button>`;
        }
    }

    const filmStatusStr = ticket.needs_film ? `<span style="color:#ff8c00; font-weight:bold;">有</span>` : "無";

    // ★修正：ステータス表示を1つのスッキリしたドロップダウンに統合
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
        // パソコン・スマホ共通のステータス変更用ドロップダウン
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
        ${abnormalBtnHtml}
        <div class="modal-title">伝票詳細 (ID: ${ticket.ticket_id})</div>
        
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
                <strong>進行履歴</strong>
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
        const btnText = allChecked ? "この伝票を「対応完了」にする" : "全てのチェックリストを完了してください";

        html += `
            <div class="modal-section" style="background:#e9ecef; padding:15px; border-radius:8px; margin-top: 20px;">
                <strong style="display:block; margin-bottom:10px;">作業チェックリスト</strong>
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

// ★追加：チェックを外す時の警告処理
async function handleCheckChange(ticketId, fieldName, timeFieldName, isChecked) {
    // もしチェックを外す操作（false）なら警告を出す
    if (!isChecked) {
        if (!confirm("チェックを外すと記録された時刻も消去されます。本当に外しますか？")) {
            // キャンセルされたら、画面を元の状態に描画し直す
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
            // キャンセル時はドロップダウンを元に戻すために再描画
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

    // changeStatusFromModalと同じ処理へ流す
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