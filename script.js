const API_URL = "http://127.0.0.1:8000";

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
        
        const nameStr = ticket.name ? ticket.name : "氏名未入力";
        const classStr = ticket.grade ? `${ticket.grade}-${ticket.class_num}-${ticket.student_num}` : "";
        const pcSerialStr = ticket.pc_serial ? `PC: ${ticket.pc_serial}` : "PCシリアル未登録";
        const categoryStr = ticket.damage_category ? `【${ticket.damage_category}】` : "";

        if (ticket.status === "対応完了") {
            card.classList.add("completed");
            card.innerHTML = `
                <div class="ticket-header">ID:${ticket.ticket_id} | ${nameStr}</div>
                <div class="ticket-meta">${classStr} (学籍: ${ticket.student_id})<br>${pcSerialStr}</div>
                <p style="margin: 5px 0; font-size: 0.9em;">${categoryStr} ${ticket.damage_details || ""}</p>
                <p style="margin: 5px 0; font-size: 0.8em; color: green;">✔ 対応完了</p>
            `;
            document.getElementById("completed-list").appendChild(card);
        } else {
            card.draggable = true;
            card.ondragstart = (e) => { e.dataTransfer.setData("text/plain", ticket.ticket_id); card.classList.add("dragging"); };
            card.ondragend = () => card.classList.remove("dragging");

            card.innerHTML = `
                <div class="ticket-header">ID:${ticket.ticket_id} | ${nameStr}</div>
                <div class="ticket-meta">${classStr} (学籍: ${ticket.student_id})<br>${pcSerialStr}</div>
                <p style="margin: 5px 0; font-size: 0.9em; white-space: pre-wrap;">${categoryStr}\n${ticket.damage_details || "記載なし"}</p>
                <div style="font-size: 0.8em; margin-top: 10px;">
                    <label><input type="checkbox" onchange="updateCheck(${ticket.ticket_id}, 'chk_restored', this.checked)" ${ticket.chk_restored ? "checked" : ""}> リストア完了</label>
                </div>
                <button class="btn-complete" onclick="markAsCompleted(${ticket.ticket_id})">🏁 対応完了</button>
            `;

            let targetZone = document.querySelector(`.drop-zone[data-status="${ticket.status}"]`);
            if (!targetZone) targetZone = document.querySelector('.drop-zone[data-status="学内受付"]');
            targetZone.appendChild(card);
        }
    });
}

async function markAsCompleted(ticketId) {
    if (!confirm("「対応完了」にしますか？")) return;
    await fetch(`${API_URL}/tickets/${ticketId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "対応完了" }) });
    fetchTickets();
}

function allowDrop(e) { e.preventDefault(); }
async function drop(e) {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("text/plain");
    const targetZone = e.target.closest('.drop-zone');
    if (!targetZone) return;
    
    const card = document.getElementById(`ticket-${ticketId}`);
    targetZone.appendChild(card);
    await fetch(`${API_URL}/tickets/${ticketId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: targetZone.getAttribute("data-status") }) });
}

async function createTicket() {
    const payload = {
        grade: document.getElementById("grade").value,
        class_num: document.getElementById("class_num").value,
        student_num: document.getElementById("student_num").value,
        student_id: document.getElementById("student_id").value,
        name: document.getElementById("name").value,
        pc_serial: document.getElementById("pc_serial").value,
        kb_serial: document.getElementById("kb_serial").value,
        damage_category: document.getElementById("damage_category").value,
        damage_details: document.getElementById("damage_details").value,
        status: "学内受付"
    };

    if (!payload.student_id) return alert("学籍番号は必須です！");
    if (payload.student_id.length > 5) return alert("学籍番号は5桁以内で入力してください！");

    await fetch(`${API_URL}/tickets/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    ["grade", "class_num", "student_num", "student_id", "name", "pc_serial", "kb_serial", "damage_category", "damage_details"].forEach(id => document.getElementById(id).value = "");
    
    fetchTickets();
    switchTab('tab-board');
}

async function updateCheck(ticketId, fieldName, isChecked) {
    await fetch(`${API_URL}/tickets/${ticketId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [fieldName]: isChecked }) });
}

// ページ読み込み時に実行
fetchTickets();