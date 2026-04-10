// GANTI DENGAN URL DEPLOYMENT ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbzmqW0ItKt7UGs4u3dgbCDPsL1iEgqd9xYO1UmcO-XfNExbykToNlc827mpTU-65fEK/exec"; 
let currentUser = null;

// --- UI HELPERS ---
const UI = {
    loader: (show) => { const el = document.getElementById('globalLoader'); if(show) el.classList.remove('hidden'); else el.classList.add('hidden'); },
    toast: (msg, type = 'success') => {
        const container = document.getElementById('toast-container');
        const div = document.createElement('div'); div.className = `toast ${type}`;
        div.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> <span>${msg}</span>`;
        container.appendChild(div); setTimeout(() => { div.style.opacity='0'; setTimeout(()=>div.remove(), 300); }, 3000);
    },
    closeModal: (id) => { const el = document.getElementById(id); el.classList.remove('show'); setTimeout(() => el.style.display = 'none', 300); },
    openModal: (id) => { const el = document.getElementById(id); el.style.display = 'flex'; void el.offsetWidth; el.classList.add('show'); }
};

// --- AUTH ---
const Auth = {
    init: function() {
        const savedUser = localStorage.getItem('sso_user');
        if (savedUser) { currentUser = JSON.parse(savedUser); Auth.showApp(); } 
        else { document.getElementById('login-view').style.display = 'flex'; }
    },
    login: async function() {
        const u = document.getElementById('u').value, p = document.getElementById('p').value;
        const btn = document.getElementById('btnLogin'), msg = document.getElementById('loginMsg');
        btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:16px; height:16px;"></div>';
        msg.style.display = 'none';
        try {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', username: u, password: p }) });
            const data = await res.json();
            if (data.success) {
                currentUser = { role: data.role, lokasi: data.lokasi, desa: data.desa };
                localStorage.setItem('sso_user', JSON.stringify(currentUser));
                document.getElementById('login-view').classList.add('fade-out');
                setTimeout(() => Auth.showApp(), 500);
            } else { throw new Error("Username/Password salah"); }
        } catch (err) {
            msg.innerText = err.message; msg.style.display = 'block';
            btn.disabled = false; btn.innerHTML = 'Masuk';
        }
    },
    logout: function() { localStorage.removeItem('sso_user'); location.reload(); },
    showApp: function() {
        document.getElementById('login-view').style.display = 'none'; document.getElementById('app-layout').classList.remove('hidden');
        document.getElementById('sidebarUserName').innerText = currentUser.username || "User";
        document.getElementById('sidebarUserRole').innerText = `${currentUser.role}`;
    }
};

// --- APP CONTROLLER ---
const App = {
    loadModule: async function(modName, htmlFile, navEl) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); if(navEl) navEl.classList.add('active');
        if(window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
        UI.loader(true);
        const container = document.getElementById('app-content-area');
        try {
            const response = await fetch(htmlFile);
            if (!response.ok) throw new Error("File tidak ditemukan");
            container.innerHTML = await response.text();
            
            if (modName === 'jadwal') Jadwal.init();
            else if (modName === 'raport') Raport.init();
            else if (modName === 'kurikulum') Kurikulum.init();
            else if (modName === 'jurnal') Jurnal.init();
            else if (modName === 'generus') Generus.init();
            else if (modName === 'guru') Guru.init();
        } catch (error) {
            console.error(error);
            container.innerHTML = `<div class="text-center p-4 text-danger">Gagal memuat modul.</div>`;
        } finally { UI.loader(false); }
    }
};
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// --- MODULE 1: GENERUS ---
const Generus = {
    allData: [], filteredData: [],
    init: async function() {
        UI.loader(true);
        try {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getData', role: currentUser.role, lokasi: currentUser.lokasi }) });
            const json = await res.json(); this.allData = json.data || []; this.applyFilters();
        } catch(e) { UI.toast('Gagal memuat data Generus', 'error'); } finally { UI.loader(false); }
    },
    applyFilters: function() {
        const search = document.getElementById('genSearch').value.toLowerCase();
        const fJk = document.getElementById('filterJK').value;
        const fJenjang = document.getElementById('filterJenjang').value;
        this.filteredData = this.allData.filter(d => {
            const matchSearch = d.nama.toLowerCase().includes(search) || (d.ayah && d.ayah.toLowerCase().includes(search));
            const matchJk = fJk ? d.jk === fJk : true;
            const matchJenjang = fJenjang ? (d.jenjang || '').toLowerCase().includes(fJenjang.toLowerCase()) : true;
            return matchSearch && matchJk && matchJenjang;
        }); this.renderTable();
    },
    renderTable: function() {
        const tbody = document.getElementById('genTableBody'); tbody.innerHTML = '';
        if (this.filteredData.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-4">Tidak ada data</td></tr>`; return; }
        this.filteredData.forEach((d) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${d.no}</td>
            <td><div class="font-bold text-main">${d.nama}</div><div class="text-xs text-muted">A: ${d.ayah||'-'} | I: ${d.ibu||'-'}</div></td>
            <td><span class="status-badge" style="background:${d.jk==='L'?'#e0f2fe':'#fce7f3'}; color:${d.jk==='L'?'#0284c7':'#db2777'}">${d.jk}</span></td>
            <td>${d.umur || '-'}</td><td>${d.kelas}</td>
            <td><span style="background:var(--primary-light); color:var(--primary-hover); padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">${d.jenjang||'-'}</span></td>
            <td><small class="text-muted">${d.kelompok || '-'} <br> ${d.desa || '-'}</small></td>
            <td class="action-col"><button class="btn btn-sm btn-secondary" onclick="Generus.edit(${d.rowIndex})"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger" onclick="Generus.del(${d.rowIndex})"><i class="fas fa-trash"></i></button></td>`;
            tbody.appendChild(tr);
        });
    },
    openModal: function() { document.querySelector('#modalGen form').reset(); document.getElementById('genRowIndex').value=''; UI.openModal('modalGen'); },
    saveForm: async function() {
        const valOrSpace = (val) => (val === undefined || val === null || val === "") ? " " : val;
        const kelas = document.getElementById('genKelas').value;
        const tglInput = document.getElementById('genTglLahir').value;
        let tgl = ""; if(tglInput){const p=tglInput.split('-'); if(p.length===3) tgl=`${p[2]}/${p[1]}/${p[0]}`;}
        const payload = { rowIndex: document.getElementById('genRowIndex').value, no: valOrSpace(document.getElementById('genNo').value), nama: valOrSpace(document.getElementById('genNama').value), jk: valOrSpace(document.getElementById('genJK').value), tempatLahir: valOrSpace(document.getElementById('genTmpLahir').value), tanggalLahir: valOrSpace(tgl), umur: " ", kelas: valOrSpace(kelas), jenjang: " ", ayah: valOrSpace(document.getElementById('genAyah').value), ibu: valOrSpace(document.getElementById('genIbu').value), kelompok: valOrSpace(currentUser.lokasi), desa: valOrSpace(currentUser.desa) };
        UI.loader(true); const action = payload.rowIndex ? 'editData' : 'addData';
        try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, payload }) }); if((await res.json()).status === 'success') { UI.toast('Data tersimpan'); UI.closeModal('modalGen'); this.init(); } } catch(e){ UI.toast('Gagal simpan','error'); } finally{UI.loader(false);}
    },
    edit: function(idx) {
        const item = this.allData.find(d => d.rowIndex == idx); if(!item) return;
        document.getElementById('genRowIndex').value = item.rowIndex; document.getElementById('genNo').value = item.no; document.getElementById('genNama').value = item.nama; document.getElementById('genJK').value = item.jk; document.getElementById('genKelas').value = item.kelas; document.getElementById('genTmpLahir').value = item.tempatLahir || '';
        if(item.tanggalLahir){const p=item.tanggalLahir.split('/'); if(p.length===3) document.getElementById('genTglLahir').value=`${p[2]}-${p[1]}-${p[0]}`;} else document.getElementById('genTglLahir').value='';
        document.getElementById('genAyah').value = item.ayah || ''; document.getElementById('genIbu').value = item.ibu || ''; UI.openModal('modalGen');
    },
    del: async function(idx) { if(!confirm('Hapus data ini?')) return; UI.loader(true); try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteData', rowIndex: idx }) }); this.init(); } finally{UI.loader(false);} }
};

// --- MODULE 2: GURU ---
const Guru = {
    allData: [], filteredData: [],
    init: async function() {
        UI.loader(true);
        try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getGuruData', role: currentUser.role, lokasi: currentUser.lokasi }) }); const json = await res.json(); this.allData = json.data || []; this.applyFilters(); } catch(e) { UI.toast('Gagal memuat data Guru', 'error'); } finally { UI.loader(false); }
    },
    applyFilters: function() {
        const search = document.getElementById('guruSearch').value.toLowerCase();
        const fStatus = document.getElementById('filterGuruStatus').value;
        const fJK = document.getElementById('filterGuruJK').value;
        this.filteredData = this.allData.filter(d => {
            const matchSearch = d.nama.toLowerCase().includes(search);
            const matchStatus = fStatus ? d.status === fStatus : true;
            const matchJK = fJK ? d.jk === fJK : true;
            return matchSearch && matchStatus && matchJK;
        }); this.renderTable();
    },
    renderTable: function() {
        const tbody = document.getElementById('guruTableBody'); tbody.innerHTML = '';
        if (this.filteredData.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-4">Tidak ada data</td></tr>`; return; }
        this.filteredData.forEach((d) => {
            const statusBadge = d.status === 'MT' ? 'badge-MT' : d.status === 'MS' ? 'badge-MS' : 'badge-GB';
            const mengajarBadge = d.mengajar === 'YA' ? 'badge-YA' : 'badge-TIDAK';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${d.no}</td><td><div class="font-bold text-main">${d.nama}</div></td><td><span class="status-badge" style="background:${d.jk==='L'?'#e0f2fe':'#fce7f3'}; color:${d.jk==='L'?'#0284c7':'#db2777'}">${d.jk}</span></td><td><span class="status-badge ${statusBadge}">${d.status}</span></td><td>${d.hp || '-'}</td><td><span class="status-badge ${mengajarBadge}">${d.mengajar}</span></td><td><small class="text-muted">${d.kelompok || '-'} <br> ${d.desa || '-'}</small></td><td class="action-col-guru"><button class="btn btn-sm btn-secondary" onclick="Guru.edit(${d.rowIndex})"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger" onclick="Guru.del(${d.rowIndex})"><i class="fas fa-trash"></i></button></td>`;
            tbody.appendChild(tr);
        });
    },
    openModal: function() { document.querySelector('#modalGuru form').reset(); document.getElementById('guruRowIndex').value=''; UI.openModal('modalGuru'); },
    saveForm: async function() {
        const valOrSpace = (val) => (val === undefined || val === null || val === "") ? " " : val;
        const payload = { rowIndex: document.getElementById('guruRowIndex').value, no: valOrSpace(document.getElementById('guruNo').value), nama: valOrSpace(document.getElementById('guruNama').value), jk: valOrSpace(document.getElementById('guruJK').value), status: valOrSpace(document.getElementById('guruStatus').value), hp: valOrSpace(document.getElementById('guruHP').value), mengajar: valOrSpace(document.getElementById('guruMengajar').value), kelompok: valOrSpace(currentUser.lokasi), desa: valOrSpace(currentUser.desa) };
        UI.loader(true); const action = payload.rowIndex ? 'editGuruData' : 'addGuruData';
        try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, payload }) }); if((await res.json()).status === 'success') { UI.toast('Data guru tersimpan'); UI.closeModal('modalGuru'); this.init(); } } catch(e){ UI.toast('Gagal simpan','error'); } finally{UI.loader(false);}
    },
    edit: function(idx) {
        const item = this.allData.find(d => d.rowIndex == idx); if(!item) return;
        document.getElementById('guruRowIndex').value = item.rowIndex; document.getElementById('guruNo').value = item.no; document.getElementById('guruNama').value = item.nama; document.getElementById('guruJK').value = item.jk; document.getElementById('guruStatus').value = item.status; document.getElementById('guruHP').value = item.hp || ''; document.getElementById('guruMengajar').value = item.mengajar; UI.openModal('modalGuru');
    },
    del: async function(idx) { if(!confirm('Hapus data guru ini?')) return; UI.loader(true); try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteGuruData', rowIndex: idx }) }); this.init(); } finally{UI.loader(false);} }
};

// --- MODULE 3: JURNAL ---
const Jurnal = {
    members: [], isEditing: false,
    init: function() { document.getElementById('jurnDate').valueAsDate = new Date(); this.switchTab('input', document.querySelector('.tab-btn.active')); },
    switchTab: function(tab, el) {
        document.querySelectorAll('#mod-jurnal .tab-btn').forEach(t => t.classList.remove('active')); if(el) el.classList.add('active');
        document.getElementById('jurnal-input-view').classList.toggle('hidden', tab !== 'input');
        document.getElementById('jurnal-history-view').classList.toggle('hidden', tab !== 'history');
        if(tab === 'history') this.loadHistory();
    },
    loadMembers: async function() {
        const jenjang = document.getElementById('jurnJenjang').value;
        const container = document.getElementById('jurnMemberList'), formArea = document.getElementById('jurnalFormArea');
        if(!jenjang) { formArea.classList.add('hidden'); return; } formArea.classList.remove('hidden');
        container.innerHTML = '<div class="text-center"><div class="spinner"></div></div>';
        try {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getMemberList', role: currentUser.role, lokasi: currentUser.lokasi, jenjang }) });
            const json = await res.json(); container.innerHTML = ''; this.members = json.members || [];
            this.members.forEach(m => {
                const div = document.createElement('div'); div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:8px; background:white; border:1px solid var(--border); border-radius:8px;";
                div.innerHTML = `<span class="font-medium">${m.nama}</span><select id="status_${m.no}" class="form-control" style="width:120px; padding:4px;"><option value="Hadir">Hadir</option><option value="Sakit">Sakit</option><option value="Izin">Izin</option><option value="Alpha">Alpha</option></select>`;
                container.appendChild(div);
            });
        } catch(e) { UI.toast('Gagal muat data', 'error'); }
    },
    save: async function() {
        const jenjang = document.getElementById('jurnJenjang').value, tgl = document.getElementById('jurnDate').value, materi = document.getElementById('jurnMateri').value;
        if(!jenjang || !tgl || !materi) return UI.toast('Lengkapi data', 'error');
        const hadirData = []; this.members.forEach(m => hadirData.push({ nama: m.nama, status: document.getElementById(`status_${m.no}`).value }));
        UI.loader(true);
        const timestamp = document.getElementById('jurnTimestamp').value;
        const action = timestamp ? 'editJurnal' : 'addJurnal';
        const payload = { timestamp, tanggal: tgl, kelompok: currentUser.lokasi, desa: currentUser.desa, jenjang, materi, hadir: hadirData };
        try {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, payload }) });
            if((await res.json()).status === 'success') { UI.toast('Jurnal tersimpan'); this.resetForm(); this.switchTab('history', document.querySelectorAll('.tab-btn')[1]); }
        } catch(e) { UI.toast('Gagal simpan', 'error'); } finally { UI.loader(false); }
    },
    loadHistory: async function() {
        UI.loader(true); const container = document.getElementById('jurnHistoryContainer');
        container.innerHTML = '<div class="text-center p-4"><div class="spinner"></div></div>';
        try {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJurnalHistory', role: currentUser.role, lokasi: currentUser.lokasi, desa: currentUser.desa }) });
            const json = await res.json(); const history = json.history || [];
            container.innerHTML = '';
            history.forEach(h => {
                let hCount=0, sCount=0, iCount=0, aCount=0;
                try { const list = JSON.parse(h.kehadiran); list.forEach(x => { if(x.status==='Hadir')hCount++; else if(x.status==='Sakit')sCount++; else if(x.status==='Izin')iCount++; else aCount++; }); }catch(e){}
                const div = document.createElement('div'); div.className = 'history-card';
                div.innerHTML = `<div class="flex justify-between items-center"><div><div class="font-bold text-primary">${h.tanggal}</div><div class="text-xs text-muted">${h.jenjang}</div></div><div class="flex gap-2 text-xs font-bold"><span class="badge-H status-badge">H:${hCount}</span><span class="badge-S status-badge">S:${sCount}</span><span class="badge-I status-badge">I:${iCount}</span><span class="badge-A status-badge">A:${aCount}</span></div></div><div class="text-sm text-muted mt-2 italic">"${h.materi}"</div><div class="mt-3 flex gap-2 justify-end"><button class="btn btn-sm btn-secondary" onclick="Jurnal.edit('${h.timestamp}')"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="Jurnal.delete('${h.timestamp}')"><i class="fas fa-trash"></i></button></div>`;
                container.appendChild(div);
            });
        } catch(e) { UI.toast('Gagal muat riwayat', 'error'); } finally { UI.loader(false); }
    },
    edit: async function(ts) {
        UI.loader(true);
        try {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJurnalHistory', role: currentUser.role, lokasi: currentUser.lokasi }) });
            const json = await res.json();
            const item = json.history.find(h => String(h.timestamp) === String(ts));
            if(item) {
                document.getElementById('jurnTimestamp').value = item.timestamp; document.getElementById('jurnJenjang').value = item.jenjang; document.getElementById('jurnDate').value = item.tanggal.split('/').reverse().join('-'); document.getElementById('jurnMateri').value = item.materi; await this.loadMembers(); const attendance = JSON.parse(item.kehadiran); attendance.forEach(att => { this.members.forEach(m => { if(m.nama === att.nama) document.getElementById(`status_${m.no}`).value = att.status; }); }); });
                this.switchTab('input', document.querySelectorAll('.tab-btn')[0]);
            }
        } catch(e) { UI.toast('Gagal memuat data edit', 'error'); } finally { UI.loader(false); }
    },
    delete: async function(ts) { if(!confirm('Hapus jurnal ini?')) return; UI.loader(true); try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteJurnal', timestamp: ts }) }); this.loadHistory(); } finally { UI.loader(false); } },
    resetForm: function() { document.getElementById('jurnTimestamp').value = ''; document.getElementById('jurnMateri').value = ''; document.getElementById('jurnJenjang').value = ''; document.getElementById('jurnalFormArea').classList.add('hidden'); }
};

// --- MODULE 4: JADWAL ---
const Jadwal = {
    formatTimeDisplay: function(dateVal) {
        if (!dateVal) return '-'; let d = new Date(dateVal);
        if (isNaN(d.getTime())) return dateVal; return d.toTimeString().substring(0, 5);
    },
    init: async function() {
        UI.loader(true);
        try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJadwal', role: currentUser.role, lokasi: currentUser.lokasi }) }); const json = await res.json(); this.renderList(json.data || []); } catch(e) { UI.toast('Gagal muat jadwal', 'error'); } finally { UI.loader(false); }
    },
    renderList: function(data) {
        const container = document.getElementById('jadwalListContainer'); container.innerHTML = '';
        if(data.length === 0) { container.innerHTML = '<div class="p-4 text-center text-muted">Tidak ada jadwal.</div>'; return; }
        const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']; data.sort((a,b) => days.indexOf(a.hari) - days.indexOf(b.hari));
        data.forEach(d => {
            const div = document.createElement('div'); div.className = 'jadwal-item';
            div.innerHTML = `<div class="jadwal-time"><div style="font-weight:bold; color:var(--primary);">${d.hari}</div><div style="font-size:0.85rem; color:var(--text-muted);">${this.formatTimeDisplay(d.jam)}</div></div><div class="jadwal-info"><div class="font-bold text-main">${d.jenjang}</div><div class="text-xs text-muted" style="margin-top:2px;">${d.pengajar} | ${d.sistemPembelajaran || '-'}</div><div class="text-xs text-muted" style="color:#94a3b8;">${d.kelompok} - ${d.desa}</div></div><div class="flex gap-1"><button class="btn btn-sm btn-secondary" onclick="Jadwal.edit(${d.rowIndex})"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="Jadwal.delete(${d.rowIndex})"><i class="fas fa-trash"></i></button></div>`;
            container.appendChild(div);
        });
    },
    openModal: function() { document.querySelector('#modalJadwal form').reset(); document.getElementById('jadwalRowIndex').value = ''; document.getElementById('jadwalKelompok').value = currentUser.lokasi; document.getElementById('jadwalDesa').value = currentUser.desa; UI.openModal('modalJadwal'); },
    save: async function() {
        const payload = { rowIndex: document.getElementById('jadwalRowIndex').value, hari: document.getElementById('jadwalHari').value, jam: document.getElementById('jadwalJam').value, jenjang: document.getElementById('jadwalJenjang').value, pengajar: document.getElementById('jadwalPengajar').value, sistemPembelajaran: document.getElementById('jadwalSistem').value, kelompok: document.getElementById('jadwalKelompok').value, desa: document.getElementById('jadwalDesa').value };
        UI.loader(true);
        try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveJadwal', payload }) }); if((await res.json()).status === 'success') { UI.toast('Jadwal disimpan'); UI.closeModal('modalJadwal'); this.init(); } } catch(e) { UI.toast('Gagal simpan', 'error'); } finally { UI.loader(false); }
    },
    edit: async function(idx) {
        UI.loader(true);
        try {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJadwal', role: currentUser.role, lokasi: currentUser.lokasi }) });
            const json = await res.json();
            const item = json.data.find(d => d.rowIndex == idx);
            if(item) {
                document.getElementById('jadwalRowIndex').value = item.rowIndex; document.getElementById('jadwalHari').value = item.hari; document.getElementById('jadwalJenjang').value = item.jenjang; document.getElementById('jadwalPengajar').value = item.pengajar; document.getElementById('jadwalSistem').value = item.sistemPembelajaran || 'Tatap Muka'; const timeStr = this.formatTimeDisplay(item.jam); document.getElementById('jadwalJam').value = timeStr; document.getElementById('jadwalKelompok').value = item.kelompok; document.getElementById('jadwalDesa').value = item.desa; UI.openModal('modalJadwal');
            }
        } catch(e) { UI.toast('Gagal memuat data edit', 'error'); } finally { UI.loader(false); }
    },
    delete: async function(idx) { if(!confirm('Hapus jadwal ini?')) return; UI.loader(true); try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteJadwal', rowIndex: idx }) }); this.init(); } finally { UI.loader(false); } }
};

// --- MODULE 5: KURIKULUM ---
const Kurikulum = {
    allStudents: [], allProgress: [], config: {}, currentStudent: null, currentView: 'dashboard',
    init: async function() {
        UI.loader(true);
        try {
            this.currentView = currentUser.role === 'kelompok' ? 'detail' : 'dashboard';
            const sRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getData', role: currentUser.role, lokasi: currentUser.lokasi }) });
            const sJson = await sRes.json(); this.allStudents = sJson.data || [];
            const cRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getConfig' }) });
            const cJson = await cRes.json(); if(cJson.status === 'success') this.config = cJson.data;
            const jenjangSet = new Set(this.allStudents.map(s => s.jenjang).filter(j => j));
            const filterSel = document.getElementById('kurDashboardFilterJenjang'); const detailFilterSel = document.getElementById('kurFilterJenjang');
            [filterSel, detailFilterSel].forEach(sel => { sel.innerHTML = '<option value="">Semua Jenjang</option>'; jenjangSet.forEach(j => sel.innerHTML += `<option value="${j}">${j}</option>`); });
            if (this.currentView === 'dashboard') this.loadDashboard(); else this.populateStudentList();
        } catch(e) { UI.toast('Gagal inisialisasi kurikulum', 'error'); } finally { UI.loader(false); }
    },
    switchView: function(view, btnElement) {
        this.currentView = view;
        document.querySelectorAll('#mod-kurikulum .tab-btn').forEach(t => t.classList.remove('active')); if(btnElement) btnElement.classList.add('active');
        document.getElementById('kur-dashboard-view').classList.toggle('hidden', view !== 'dashboard'); document.getElementById('kur-detail-view').classList.toggle('hidden', view !== 'detail');
        if(view === 'dashboard') this.loadDashboard(); else { document.getElementById('kurContent').classList.add('hidden'); document.getElementById('kurStudentSelect').value = ""; }
    },
    loadDashboard: async function() {
        const content = document.getElementById('kurDashboardContent'); content.innerHTML = '<div class="text-center p-4"><div class="spinner" style="margin:0 auto;"></div><p class="text-muted mt-2">Memuat rekapitulasi...</p></div>';
        try {
            const filterJenjang = document.getElementById('kurDashboardFilterJenjang').value;
            const pRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getAllProgressData' }) });
            const pJson = await pRes.json();
            if(pJson.status === 'success' && pJson.data) {
                let groupStats = {}; const progressMap = {}; pJson.data.forEach(p => { progressMap[p.student] = p.progressData; });
                this.allStudents.forEach(student => {
                    if (!progressMap[student.nama]) return; if (filterJenjang && student.jenjang !== filterJenjang) return;
                    let groupKey = ""; if(currentUser.role === 'daerah') groupKey = `${student.kelompok} - ${student.desa}`; else if (currentUser.role === 'desa') groupKey = student.kelompok;
                    if (!groupStats[groupKey]) groupStats[groupKey] = { name: groupKey, totalItems: 0, checkedItems: 0, memberCount: 0 };
                    const pData = progressMap[student.nama] || {}; const total = Object.keys(pData).length; const checked = Object.values(pData).filter(v => v).length;
                    groupStats[groupKey].totalItems += total; groupStats[groupKey].checkedItems += checked; groupStats[groupKey].memberCount++;
                });
                let dashboardHtml = ''; const sortedKeys = Object.keys(groupStats).sort();
                if (sortedKeys.length === 0) { dashboardHtml = '<div class="text-center p-4 bg-white border rounded text-muted">Tidak ada data kurikulum ditemukan.</div>'; } else {
                    sortedKeys.forEach(key => {
                        const stats = groupStats[key]; let pct = stats.totalItems > 0 ? Math.round((stats.checkedItems / stats.totalItems) * 100) : 0; let displayName = key; if (currentUser.role === 'desa') displayName = key.split(' - ')[0];
                        dashboardHtml += `<div class="stat-card"><div class="flex justify-between items-center mb-2"><h4 class="font-bold text-primary m-0" style="font-size:1.1rem;">${displayName}</h4><div class="text-right"><div class="text-xs text-muted font-bold uppercase">Pencapaian</div><div class="text-xl font-bold text-primary">${pct}%</div></div></div><div class="bg-gray-100 rounded-full h-2 overflow-hidden" style="background:#e2e8f0; height:8px; border-radius:4px;"><div style="width:${pct}%; background:var(--primary); height:100%; transition:width 0.6s;"></div></div><div class="mt-2 text-xs text-muted">${stats.checkedItems} dari ${stats.totalItems} Materi Tercapai <br> <span class="font-bold text-main">(${stats.memberCount} Siswa)</span></div></div>`;
                    });
                }
                content.innerHTML = dashboardHtml;
            } else { content.innerHTML = '<p class="text-center text-danger">Gagal memuat data.</p>'; }
        } catch(e) { UI.toast('Gagal memuat dashboard', 'error'); content.innerHTML = '<p class="text-center text-danger">Terjadi kesalahan.</p>'; }
    },
    populateStudentList: function() {
        const filterJenjang = document.getElementById('kurFilterJenjang').value;
        const filteredStudents = filterJenjang ? this.allStudents.filter(s => s.jenjang === filterJenjang) : this.allStudents;
        const sel = document.getElementById('kurStudentSelect'); const prevValue = sel.value;
        sel.innerHTML = '<option value="">-- Pilih Siswa --</option>';
        filteredStudents.forEach(s => {
            const jenjang = s.jenjang || "Umum"; const selected = s.nama === prevValue ? 'selected' : '';
            sel.innerHTML += `<option value="${s.nama}" data-jenjang="${jenjang}" ${selected}>${s.nama} (${s.kelompok || '-'})</option>`;
        });
        if (prevValue && !filteredStudents.some(s => s.nama === prevValue)) document.getElementById('kurContent').classList.add('hidden');
    },
    loadStudentDetail: async function() {
        const select = document.getElementById('kurStudentSelect'); const selectedName = select.value; const content = document.getElementById('kurContent'); if(!selectedName) { content.classList.add('hidden'); return; } content.classList.remove('hidden'); UI.loader(true);
        try {
            const selectedOption = select.options[select.selectedIndex]; const jenjang = selectedOption.getAttribute('data-jenjang');
            document.getElementById('kurStudentNameDisplay').innerText = selectedName; document.getElementById('kurJenjangDisplay').innerText = jenjang;
            const curriculumData = this.config[jenjang];
            if(!curriculumData) { const area = document.getElementById('kurChecklistArea'); area.innerHTML = `<div class="text-center p-4 rounded bg-yellow-50 text-yellow-700 border border-yellow-200"><i class="fas fa-exclamation-triangle"></i> Kurikulum tidak ditemukan untuk <b>${jenjang}</b>.</div>`; this.updateProgressBar(0); UI.loader(false); return; }
            const pRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProgress', student: selectedName, jenjang: jenjang }) });
            const pJson = await pRes.json(); let savedData = {};
            if(pJson.status === 'success' && pJson.data) { savedData = pJson.data.progressData || {}; }
            const area = document.getElementById('kurChecklistArea'); area.innerHTML = ''; let html = '';
            curriculumData.forEach((cat, cIdx) => {
                html += `<div class="category-section"><div class="category-header">${cat.category}. ${cat.title}</div><div class="item-list">`;
                cat.items.forEach((item, iIdx) => {
                    const key = `${cIdx}-${iIdx}`; const isChecked = savedData[key] ? 'checked' : '';
                    html += `<div class="checklist-item"><input type="checkbox" id="chk_${key}" ${isChecked} onchange="Kurikulum.updateLocalProgress()"><label for="chk_${key}" class="cursor-pointer">${item}</label></div>`;
                }); html += `</div></div>`;
            });
            area.innerHTML = html;
            const checkboxes = area.querySelectorAll('input[type="checkbox"]');
            const total = checkboxes.length; const checked = area.querySelectorAll('input[type="checkbox"]:checked').length;
            this.updateProgressUI(checked, total);
        } catch(e) { UI.toast('Gagal muat progress siswa', 'error'); } finally { UI.loader(false); }
    },
    updateLocalProgress: function() {
        const checkboxes = document.querySelectorAll('#kurChecklistArea input[type="checkbox"]');
        const total = checkboxes.length; const checked = document.querySelectorAll('#kurChecklistArea input[type="checkbox"]:checked').length;
        this.updateProgressUI(checked, total);
    },
    updateProgressUI: function(checked, total) {
        const pct = total > 0 ? Math.round((checked/total)*100) : 0;
        document.getElementById('kurPercent').innerText = pct + "%"; document.getElementById('kurBar').style.width = pct + "%";
    },
    save: async function() {
        const selectedName = document.getElementById('kurStudentSelect').value;
        const selectedOption = document.getElementById('kurStudentSelect').options[document.getElementById('kurStudentSelect').selectedIndex];
        const jenjang = selectedOption.getAttribute('data-jenjang');
        if(!selectedName) return UI.toast('Pilih siswa terlebih dahulu', 'error');
        const checkboxes = document.querySelectorAll('#kurChecklistArea input[type="checkbox"]');
        const progressData = {}; checkboxes.forEach(cb => { const key = cb.id.replace('chk_', ''); progressData[key] = cb.checked; });
        UI.loader(true);
        try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveProgress', student: selectedName, jenjang: jenjang, progressData: progressData }) }); UI.toast('Progress tersimpan'); } catch(e) { UI.toast('Gagal simpan', 'error'); } finally { UI.loader(false); }
    }
};

// --- MODULE 6: RAPORT ---
const Raport = {
    allStudents: [], studentData: null, curriculum: {}, subjects: [],
    gradeOptions: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'E'],
    gradePoints: { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'E': 0 },

    init: async function() {
        if (currentUser.role === 'kelompok') {
            document.getElementById('raport-input-view').classList.remove('hidden'); document.getElementById('raport-ledger-view').classList.add('hidden'); this.loadDropdownAndConfig();
        } else {
            document.getElementById('raport-input-view').classList.add('hidden'); document.getElementById('raport-ledger-view').classList.remove('hidden');
        }
    },
    loadDropdownAndConfig: async function() {
        try {
            const sRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getData', role: currentUser.role, lokasi: currentUser.lokasi }) });
            const sJson = await sRes.json(); this.allStudents = sJson.data || [];
            const sel = document.getElementById('raportStudentSelectFull'); sel.innerHTML = '<option value="">-- Pilih Siswa --</option>';
            this.allStudents.forEach(s => { sel.innerHTML += `<option value="${s.nama}" data-jenjang="${s.jenjang}">${s.nama} (${s.jenjang})</option>`; });
            const cRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getConfig' }) });
            const cJson = await cRes.json();
            if(cJson.status === 'success') { this.curriculum = cJson.data; this.subjects = cJson.subjects || []; }
        } catch(e) { console.error(e); }
    },
    loadStudentData: async function() {
        const sel = document.getElementById('raportStudentSelectFull'); const nama = sel.value; if(!nama) return;
        const jenjang = sel.options[sel.selectedIndex].getAttribute('data-jenjang');
        document.getElementById('raportNameDisplay').innerText = nama; document.getElementById('raportJenjangDisplay').innerText = jenjang; document.getElementById('raportGradingArea').classList.remove('hidden');
        UI.loader(true);
        try {
            const gRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getNilaiRapot', nama }) });
            const gJson = await gRes.json(); const savedGrades = gJson.status === 'success' ? gJson.grades : {};
            const aRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getRapotData', nama, jenjang }) });
            const aJson = await aRes.json(); this.studentData = aJson; const att = aJson.attendance;
            document.getElementById('raportAttDetail').innerText = `Hadir: ${att.hadir}/${att.total} | Sakit: ${att.sakit} | Izin: ${att.izin} | Alpha: ${att.alpha}`;
            const formContainer = document.getElementById('raportGradesForm'); formContainer.innerHTML = '';
            if(this.subjects.length === 0) { formContainer.innerHTML = '<p class="text-muted w-100">Tidak ada mata pelajaran/kurikulum yang ditemukan di Sheet.</p>'; } else {
                this.subjects.forEach(subj => {
                    const currentVal = savedGrades[subj] || '';
                    const div = document.createElement('div'); div.style.cssText = "flex:1; min-width: 200px;";
                    div.innerHTML = `<label class="text-sm font-bold text-muted mb-1" style="display:block; margin-bottom:4px;">${subj}</label><select name="grade_${subj}" class="form-control raport-grade-select"><option value="">- Pilih -</option>${this.gradeOptions.map(g => `<option value="${g}" ${g === currentVal ? 'selected' : ''}>${g}</option>`).join('')}</select>`;
                    formContainer.appendChild(div);
                });
            }
        } catch(e) { UI.toast('Gagal memuat data siswa', 'error'); } finally { UI.loader(false); }
    },
    saveAndPrint: async function() {
        const nama = document.getElementById('raportStudentSelectFull').value; const jenjang = document.getElementById('raportJenjangDisplay').innerText; const note = document.getElementById('raportNote').value;
        const gradeSelects = document.querySelectorAll('.raport-grade-select'); const grades = {}; let isComplete = true;
        gradeSelects.forEach(sel => { const mapel = sel.name.replace('grade_', ''); if(!sel.value) isComplete = false; grades[mapel] = sel.value; });
        if(!isComplete) return UI.toast('Mohon lengkapi nilai untuk semua mata pelajaran.', 'error');
        UI.loader(true);
        try {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveNilaiRapot', payload: { nama, jenjang, grades, kelompok: currentUser.lokasi, desa: currentUser.desa } })});
            this.generatePDF(nama, jenjang, grades, note, this.studentData.attendance, this.studentData.progress);
        } catch(e) { UI.toast('Gagal menyimpan/cetak', 'error'); } finally { UI.loader(false); }
    },
    printLedger: async function() {
        UI.loader(true);
        try {
            const jenjangFilter = document.getElementById('ledgerFilterJenjang').value;
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getLedger', role: currentUser.role, lokasi: currentUser.lokasi, desa: currentUser.desa, jenjang: jenjangFilter })});
            const json = await res.json(); if(json.status === 'success') this.generateLedgerPDF(json.data, jenjangFilter);
        } catch(e) { UI.toast('Gagal memuat data ledger', 'error'); } finally { UI.loader(false); }
    },
    calculateAverage: function(gradesObj) {
        let totalPoints = 0, count = 0;
        for(let g of Object.values(gradesObj)) { if(g && this.gradePoints[g] !== undefined) { totalPoints += this.gradePoints[g]; count++; } }
        if(count === 0) return '-';
        const avg = totalPoints / count;
        if(avg >= 3.8) return 'A'; if(avg >= 3.5) return 'A-'; if(avg >= 3.2) return 'B+'; if(avg >= 2.8) return 'B'; if(avg >= 2.5) return 'B-'; if(avg >= 2.2) return 'C+'; if(avg >= 1.8) return 'C'; if(avg >= 1.5) return 'C-'; if(avg >= 1.0) return 'D'; return 'E';
    },
    generatePDF: function(nama, jenjang, grades, note, attendance, progress) {
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); const pageWidth = doc.internal.pageSize.getWidth(); const margin = 15;
        doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("LAPORAN HASIL BELAJAR", pageWidth / 2, 20, { align: "center" });
        doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.text(`Nama: ${nama}`, margin, 35); doc.text(`Jenjang: ${jenjang}`, margin, 42); doc.text(`Kelompok: ${currentUser.lokasi}`, margin, 49);
        const gradeHeaders = [["No", "Mata Pelajaran", "Nilai"]]; const gradeBody = []; let idx = 1;
        for (const [mapel, nilai] of Object.entries(grades)) { gradeBody.push([idx++, mapel, nilai]); }
        const avgGrade = this.calculateAverage(grades); gradeBody.push(["", "RATA-RATA", avgGrade]);
        doc.autoTable({ startY: 65, head: gradeHeaders, body: gradeBody, theme: 'grid', headStyles: { fillColor: [16, 185, 129] }, columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 30 } } });
        const finalY = doc.lastAutoTable.finalY + 10; doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Catatan Guru:", margin, finalY);
        doc.setFontSize(11); doc.setFont("helvetica", "normal"); const splitNote = doc.splitTextToSize(note || "-", pageWidth - (margin * 2)); doc.text(splitNote, margin, finalY + 8);
        let attY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 40 : finalY + 30;
        if(attY > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); attY = 20; }
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Rekap Kehadiran:", margin, attY);
        const attHeaders = [["Kehadiran", "Jumlah"]]; const attBody = [["Hadir", attendance.hadir], ["Sakit", attendance.sakit], ["Izin", attendance.izin], ["Alpha", attendance.alpha], ["Total Sesi", attendance.total]];
        doc.autoTable({ startY: attY + 5, head: attHeaders, body: attBody, theme: 'striped', headStyles: { fillColor: [200, 200, 200] } });
        let sigY = doc.lastAutoTable.finalY + 30; if(sigY > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); sigY = 20; }
        doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.text("Mengetahui,", margin, sigY); doc.text("Orang Tua / Wali,", margin, sigY + 6); doc.line(margin, sigY + 25, margin + 50, sigY + 25);
        doc.text(`Pengajar, ${currentUser.lokasi}`, pageWidth - margin - 60, sigY); doc.line(pageWidth - margin - 60, sigY + 25, pageWidth - margin - 10, sigY + 25);
        // --- HALAMAN 2 ---
        doc.addPage(); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("Rincian Materi & Pencapaian", pageWidth / 2, 20, { align: "center" }); let currentY = 35;
        for (const [mapel, nilai] of Object.entries(grades)) {
            if(currentY > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); currentY = 20; }
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(16, 185, 129); doc.text(`${mapel} (Nilai: ${nilai})`, margin, currentY); doc.setTextColor(0,0,0); currentY += 8;
            const syllabus = this.curriculum[mapel]; if(syllabus && syllabus.length > 0) {
                doc.setFontSize(10); doc.setFont("helvetica", "normal"); syllabus.forEach(cat => {
                    if(cat.items && cat.items.length > 0) {
                        if(cat.title) { doc.text(`- ${cat.title}`, margin + 5, currentY); currentY += 5; }
                        cat.items.forEach(item => { doc.text(`  [ ] ${item}`, margin + 10, currentY); currentY += 5; });
                    }
                });
            } else { doc.text("  (Tidak ada detail materi)", margin + 5, currentY); currentY += 5; }
            currentY += 5;
        }
        if(currentY > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); currentY = 20; }
        doc.setDrawColor(200, 200, 200); doc.line(margin, currentY, pageWidth - margin, currentY); currentY += 10;
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Persentase Pencapaian Keseluruhan:", margin, currentY); currentY += 6;
        const keys = Object.keys(progress || {}); const total = keys.length; const completed = keys.filter(k => progress[k]).length; const pct = total > 0 ? Math.round((completed/total)*100) : 0;
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Siswa telah menyelesaikan ${completed} dari ${total} materi total.`, margin, currentY); doc.text(`Tingkat Pencapaian: ${pct}%`, margin, currentY + 5);
        doc.save(`Raport_${nama.replace(/\s/g,'_')}.pdf`);
    },
    generateLedgerPDF: function(data, jenjangFilter) {
        const { jsPDF } = window.jspdf; const doc = new jsPDF('l', 'mm', 'a4'); const pageWidth = doc.internal.pageSize.getWidth(); const margin = 10;
        doc.setFontSize(16); doc.setFont("helvetica", "bold"); const title = jenjangFilter ? `LEDGER NILAI - ${jenjangFilter}` : "LEDGER NILAI SEMUA JENJANG";
        doc.text(title, pageWidth / 2, 15, { align: "center" }); doc.text(`Wilayah: ${currentUser.role === 'desa' ? currentUser.desa : currentUser.lokasi}`, pageWidth / 2, 22, { align: "center" });
        const allSubjects = new Set(); Object.values(data).forEach(grades => { Object.keys(grades).forEach(sub => allSubjects.add(sub)); }); });
        const subjectsArr = Array.from(allSubjects).sort(); const headers = ["No", "Nama Siswa", ...subjectsArr, "Rata-rata"]; const body = [];
        Object.keys(data).sort().forEach((nama, index) => {
            const grades = data[nama]; const row = [index + 1, nama]; let totalPts = 0, count = 0;
            subjectsArr.forEach(sub => {
                const val = grades[sub] || "-"; row.push(val);
                if(this.gradePoints[val] !== undefined) { totalPts += this.gradePoints[val]; count++; }
            });
            const avg = this.calculateAverage(grades); row.push(avg); body.push(row);
        });
        doc.autoTable({ startY: 30, head: [headers], body: body, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [16, 185, 129], halign: 'center' }, columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 40 } } });
        doc.save(`Ledger_Nilai_${currentUser.lokasi}.pdf`);
    }
};

window.onload = function() { Auth.init(); };
