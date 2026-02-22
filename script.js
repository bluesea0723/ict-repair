const API_URL = "http://127.0.0.1:8000";

const STATUS_ORDER = { "学内受付": 0, "修理手配待ち": 1, "外部修理中": 2, "返却準備中": 3, "返却可能": 4, "対応完了": 5 };
const TIME_FIELDS = { "学内受付": "time_received", "修理手配待ち": "time_waiting", "外部修理中": "time_repairing", "返却準備中": "time_preparing", "返却可能": "time_returnable", "対応完了": "time_completed" };

// ★追加：チェックリストの項目定義
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
    if (clickedButton) clickedButton.classList.add('active');
    else document.querySelector('.tab-button').classList.add('active');
}

async function fetchTickets() {
    const response = await fetch(`${API_URL}/tickets/`);
    const tickets = await response.json();
    
    document.querySelectorAll(".drop-zone").forEach(zone => zone.innerHTML = "");
    document.getElementById("completed-list").innerHTML = "";

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

        card.innerHTML = `<div class="ticket-header">${ticket.student_id} ${nameStr}</div>${targetStr}`;

        if (ticket.status === "対応完了") {
            card.classList.add("completed");
            card.onclick = () => openModal(ticket);
            document.getElementById("completed-list").appendChild(card);
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

    let html = `
        <div class="modal-title">伝票詳細 (ID: ${ticket.ticket_id})</div>
        <div class="modal-section">
            <span style="background:#007bff;color:white;padding:3px 10px;border-radius:12px;font-size:0.9em;">${ticket.status}</span>
        </div>
        <div class="modal-section" style="font-size: 1.1em;">
            <strong>${ticket.student_id} ${ticket.name || "氏名未入力"}</strong><br>
            <span style="font-size: 0.8em; color: #666;">${classStr}</span>
        </div>
        
        <div style="display: flex; gap: 15px;">
            <div class="modal-section" style="flex: 1;">
                <strong>修理対象:</strong> ${targets.join(" / ") || "なし"}<br>
                <span style="font-size: 0.9em; color: #555;">PCシリアル: ${ticket.pc_serial || "未登録"}</span><br>
                <span style="font-size: 0.9em; color: #555;">KBシリアル: ${ticket.kb_serial || "未登録"}</span>
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
    `;

    if (ticket.status !== "対応完了") {
        let checkHtml = "";
        let allChecked = true;

        // ★チェックリストのHTMLを自動生成（全部チェックされているかも判定）
        CHECK_ITEMS.forEach(item => {
            const isChecked = ticket[item.id];
            if (!isChecked) allChecked = false; // 1つでも未チェックがあればfalse
            const timeStr = isChecked && ticket[item.time] ? `<span style="font-size:0.8em; color:#888; margin-left:8px;">(${ticket[item.time]})</span>` : "";
            
            checkHtml += `
                <label style="cursor:pointer; font-size:15px; display:block; margin-bottom:5px;">
                    <input type="checkbox" style="width:16px;height:16px;vertical-align:-2px;" 
                           onchange="handleCheckChange(${ticket.ticket_id}, '${item.id}', '${item.time}', this.checked)" 
                           ${isChecked ? "checked" : ""}> 
                    ${item.label} ${timeStr}
                </label>
            `;
        });

        // 全チェック完了なら緑色で押せる、未完了ならグレーで押せない（disabled）
        const btnStyle = allChecked ? "background:#28a745; cursor:pointer;" : "background:#ccc; cursor:not-allowed;";
        const btnDisabled = allChecked ? "" : "disabled";
        const btnText = allChecked ? "🏁 この伝票を「対応完了」にする" : "⚠️ 全てのチェックリストを完了してください";

        html += `
            <div class="modal-section" style="background:#e9ecef; padding:15px; border-radius:8px; margin-top: 20px;">
                <strong style="display:block; margin-bottom:10px;">✅ 作業チェックリスト</strong>
                ${checkHtml}
            </div>
            <button class="btn-submit" style="${btnStyle} margin-top: 10px;" onclick="markAsCompletedModal(${ticket.ticket_id})" ${btnDisabled}>${btnText}</button>
        `;
    }

    modalBody.innerHTML = html;
    modal.classList.add("show");
}

function closeModal() { document.getElementById("ticket-modal").classList.remove("show"); }
window.onclick = function(event) { if (event.target === document.getElementById("ticket-modal")) closeModal(); }

// ★チェックボックスが押された時の新しい処理
async function handleCheckChange(ticketId, fieldName, timeFieldName, isChecked) {
    const now = new Date().toLocaleString("ja-JP");
    const timeValue = isChecked ? now : null; // チェックを外した時は時刻を消す

    // データベースを更新
    await fetch(`${API_URL}/tickets/${ticketId}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ [fieldName]: isChecked, [timeFieldName]: timeValue }) 
    });

    // 最新のデータを取得して、詳細画面（モーダル）を開き直す（画面の更新）
    const response = await fetch(`${API_URL}/tickets/`);
    const tickets = await response.json();
    const updatedTicket = tickets.find(t => t.ticket_id === ticketId);
    if (updatedTicket) {
        openModal(updatedTicket); 
    }
    fetchTickets(); // ボード自体も更新
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

function allowDrop(e) { e.preventDefault(); }

async function drop(e) {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("text/plain");
    const targetZone = e.target.closest('.drop-zone');
    if (!targetZone) return;
    
    const newStatus = targetZone.getAttribute("data-status");
    const card = document.getElementById(`ticket-${ticketId}`);
    const oldStatus = card.dataset.status;

    const oldIdx = STATUS_ORDER[oldStatus];
    const newIdx = STATUS_ORDER[newStatus];

    if (oldIdx === newIdx) return; 

    let payload = { status: newStatus };
    const now = new Date().toLocaleString("ja-JP");
    const statuses = Object.keys(STATUS_ORDER);

    if (newIdx > oldIdx) {
        for (let i = oldIdx + 1; i <= newIdx; i++) {
            payload[TIME_FIELDS[statuses[i]]] = now;
        }
    } else {
        if (!confirm("通常とは異なる操作です。伝票詳細の時刻を削除し、ステータスを変更しますか？")) {
            fetchTickets(); 
            return;
        }
        payload[TIME_FIELDS[newStatus]] = now;
        for (let i = newIdx + 1; i < statuses.length; i++) {
            payload[TIME_FIELDS[statuses[i]]] = null;
        }
    }

    targetZone.appendChild(card); 
    await fetch(`${API_URL}/tickets/${ticketId}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
    });
    fetchTickets(); 
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
        damage_category: document.getElementById("damage_category").value,
        damage_details: document.getElementById("damage_details").value.trim(),
        status: "学内受付",
        time_received: new Date().toLocaleString("ja-JP")
    };

    await fetch(`${API_URL}/tickets/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    ["grade", "class_num", "student_num", "student_id", "name", "pc_serial", "kb_serial", "damage_category", "damage_details"].forEach(id => document.getElementById(id).value = "");
    ["repair_pc", "repair_kb", "repair_pen"].forEach(id => document.getElementById(id).checked = false);
    
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