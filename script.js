        const API_URL = "https://script.google.com/macros/s/AKfycbzvj7GPgRztgGN-dYQBeENF5-G8MhUQC6afCMxncuChQfCrj6BYFww-ZYFXNpRp6R5t3Q/exec"; 
        let currentUser = null;

        // ==========================================
        // UI HELPERS
        // ==========================================
        const UI = {
            loader: (show) => { 
                const el = document.getElementById('globalLoader'); 
                if(show) el.classList.remove('hidden'); else el.classList.add('hidden'); 
            },
            toast: (msg, type = 'success') => {
                const container = document.getElementById('toast-container');
                const div = document.createElement('div'); 
                div.className = `toast ${type}`;
                div.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> <span>${msg}</span>`;
                container.appendChild(div); 
                setTimeout(() => { div.style.opacity='0'; setTimeout(()=>div.remove(), 300); }, 3000);
            },
            closeModal: (id) => {
                const el = document.getElementById(id);
                el.classList.remove('show');
                setTimeout(() => { el.style.display = 'none'; }, 300);
            },
            openModal: (id) => {
                const el = document.getElementById(id);
                el.style.display = 'flex';
                void el.offsetWidth;
                el.classList.add('show');
            },
            renderPagination: function(containerId, totalItems, currentPage, itemsPerPage, onPageChange) {
                const container = document.getElementById(containerId);
                if (totalItems <= itemsPerPage) {
                    container.classList.add('hidden');
                    return;
                }
                container.classList.remove('hidden');
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                let html = `<button class="page-btn" onclick="${onPageChange}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
                html += `<span class="page-info">Halaman ${currentPage} dari ${totalPages}</span>`;
                html += `<button class="page-btn" onclick="${onPageChange}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
                container.innerHTML = html;
            }
        };

        // ==========================================
        // AUTH & APP LOGIC
        // ==========================================
        const Auth = {
            init: function() {
                const savedUser = localStorage.getItem('sso_user');
                if (savedUser) { currentUser = JSON.parse(savedUser); Auth.showApp(); } 
                else { document.getElementById('login-view').style.display = 'flex'; }
            },
            login: async function() {
                const u = document.getElementById('u').value, p = document.getElementById('p').value;
                const btn = document.getElementById('btnLogin'), msg = document.getElementById('loginMsg'), card = document.getElementById('loginCard');
                btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:16px; height:16px; border-width:2px;"></div> Memproses...';
                msg.style.display = 'none'; card.classList.remove('shake');
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', username: u, password: p }) });
                    const data = await res.json();
                    if (data.success) {
                        currentUser = { role: data.role, lokasi: data.lokasi, desa: data.desa, username: u };
                        localStorage.setItem('sso_user', JSON.stringify(currentUser));
                        document.getElementById('login-view').classList.add('fade-out');
                        setTimeout(() => Auth.showApp(), 500);
                    } else { throw new Error("Username/Password salah"); }
                } catch (err) {
                    msg.innerText = err.message || "Terjadi kesalahan koneksi"; msg.style.display = 'block';
                    card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 500);
                    btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Masuk Aplikasi</span>';
                }
            },
            logout: function() { localStorage.removeItem('sso_user'); location.reload(); },
            showApp: function() {
                document.getElementById('login-view').style.display = 'none'; document.getElementById('app-layout').classList.remove('hidden');
                document.getElementById('sidebarUserName').innerText = currentUser.username || "User";
                document.getElementById('sidebarUserRole').innerText = `${currentUser.role} - ${currentUser.lokasi}`;
                App.switchModule('generus', document.querySelector('.nav-item'));
            }
        };

        const App = {
            switchModule: function(modName, navEl) {
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); 
                if(navEl) navEl.classList.add('active');
                document.querySelectorAll('main > section').forEach(el => el.classList.add('hidden'));
                document.getElementById(`mod-${modName}`).classList.remove('hidden');
                if(window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
                
                if(modName === 'generus') Generus.init();
                else if(modName === 'guru') Guru.init();
                else if(modName === 'jurnal') Jurnal.init();
                else if(modName === 'kurikulum') Kurikulum.init();
                else if(modName === 'rapot') Rapot.init();
                else if(modName === 'jadwal') Jadwal.init();
            }
        };
        function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

        // ==========================================
        // MODULE GENERUS & GURU & JURNAL & KURIKULUM
        // ==========================================
        
        const Generus = {
            allData: [], filteredData: [], currentPage: 1, itemsPerPage: 15,
            init: async function() {
                UI.loader(true);
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getData', role: currentUser.role, lokasi: currentUser.lokasi }) });
                    const json = await res.json(); this.allData = json.data || [];
                    this.setupFilters(); this.applyFilters();
                } catch(e) { UI.toast('Gagal memuat data Generus', 'error'); } finally { UI.loader(false); }
            },
            setupFilters: function() {
                const fDesa = document.getElementById('filterDesa'), fKel = document.getElementById('filterKelompok');
                fDesa.classList.add('hidden'); fKel.classList.add('hidden');
                const desaSet = new Set(this.allData.map(d => d.desa).filter(d => d));
                const kelSet = new Set(this.allData.map(d => d.kelompok).filter(d => d));
                if (currentUser.role === 'daerah') {
                    fDesa.classList.remove('hidden'); fDesa.innerHTML = '<option value="">Semua Desa</option>';
                    desaSet.forEach(d => fDesa.innerHTML += `<option value="${d}">${d}</option>`);
                }
                if (currentUser.role === 'daerah' || currentUser.role === 'desa') {
                    fKel.classList.remove('hidden'); fKel.innerHTML = '<option value="">Semua Kelompok</option>';
                    kelSet.forEach(k => fKel.innerHTML += `<option value="${k}">${k}</option>`);
                }
            },
            applyFilters: function() {
                const search = document.getElementById('genSearch').value.toLowerCase();
                const fJk = document.getElementById('filterJK').value;
                const fJenjang = document.getElementById('filterJenjang').value;
                const fDesa = document.getElementById('filterDesa').value;
                const fKelompok = document.getElementById('filterKelompok').value;
                this.filteredData = this.allData.filter(d => {
                    const matchSearch = d.nama.toLowerCase().includes(search) || (d.ayah && d.ayah.toLowerCase().includes(search));
                    const matchJk = fJk ? d.jk === fJk : true;
                    const matchJenjang = fJenjang ? (d.jenjang || '').toLowerCase().includes(fJenjang.toLowerCase()) : true;
                    const matchDesa = fDesa ? d.desa === fDesa : true;
                    const matchKel = fKelompok ? d.kelompok === fKelompok : true;
                    return matchSearch && matchJk && matchJenjang && matchDesa && matchKel;
                });
                this.currentPage = 1; this.renderTable(); this.renderStats();
            },
            renderTable: function() {
                const tbody = document.getElementById('genTableBody'); tbody.innerHTML = '';
                const start = (this.currentPage - 1) * this.itemsPerPage;
                const end = start + this.itemsPerPage;
                const pageData = this.filteredData.slice(start, end);
                if (pageData.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-4">Tidak ada data</td></tr>`; document.getElementById('genPagination').classList.add('hidden'); return; }
                pageData.forEach((d) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${d.no}</td><td><div class="font-bold text-main">${d.nama}</div><div class="text-xs text-muted">A: ${d.ayah||'-'} | I: ${d.ibu||'-'}</div></td>
                    <td><span class="badge-${d.jk==='L'?'H':'S'} status-badge" style="background:${d.jk==='L'?'#e0f2fe':'#fce7f3'}; color:${d.jk==='L'?'#0284c7':'#db2777'}">${d.jk}</span></td>
                    <td>${d.umur || '-'}</td><td>${d.kelas}</td>
                    <td><span style="background:var(--primary-light); color:var(--primary-hover); padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">${d.jenjang||'-'}</span></td>
                    <td><small class="text-muted">${d.kelompok || '-'} <br> ${d.desa || '-'}</small></td>
                    <td class="action-col">
                        <button class="btn btn-sm btn-secondary" onclick="Generus.edit(${d.rowIndex})"><i class="fas fa-edit"></i></button> 
                        <button class="btn btn-sm btn-danger" onclick="Generus.del(${d.rowIndex})"><i class="fas fa-trash"></i></button>
                    </td>`;
                    tbody.appendChild(tr);
                });
                UI.renderPagination('genPagination', this.filteredData.length, this.currentPage, this.itemsPerPage, 'Generus.changePage');
                const actionEls = document.querySelectorAll('.action-col');
                if(currentUser.role !== 'kelompok') { document.getElementById('btnAddGen').style.display = 'none'; actionEls.forEach(el => el.style.display = 'none'); } 
                else { document.getElementById('btnAddGen').style.display = 'inline-flex'; actionEls.forEach(el => el.style.display = 'table-cell'); }
            },
            changePage: function(page) { const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage); if (page >= 1 && page <= totalPages) { this.currentPage = page; this.renderTable(); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
            renderStats: function() {
                const total = this.filteredData.length; document.getElementById('statTotal').innerText = total; document.getElementById('statL').innerText = this.filteredData.filter(d => d.jk === 'L').length; document.getElementById('statP').innerText = this.filteredData.filter(d => d.jk === 'P').length;
                const renderBar = (id, map) => { const el = document.getElementById(id); el.innerHTML = ''; const max = Math.max(...Object.values(map), 1); for (const [k, v] of Object.entries(map)) { const pct = (v/max)*100; el.innerHTML += `<div class="stat-bar-item"><div class="sb-label"><span>${k}</span><span>${v}</span></div><div class="sb-bg"><div class="sb-fill" style="width:${pct}%"></div></div></div>`; } };
                const kelasMap={}; this.filteredData.forEach(d=>kelasMap[d.kelas||'Lainnya']=(kelasMap[d.kelas||'Lainnya']||0)+1); renderBar('chartKelas', kelasMap);
                const jenjangMap={}; this.filteredData.forEach(d=>jenjangMap[d.jenjang||'Umum']=(jenjangMap[d.jenjang||'Umum']||0)+1); renderBar('chartJenjang', jenjangMap);
                
                // FIX: Restore Chart Visibility Logic
                const cardGroup = document.getElementById('cardGroupStats'); 
                if (currentUser.role === 'desa') { 
                    cardGroup.classList.remove('hidden'); document.getElementById('titleGroupStats').innerText="Statistik Kelompok"; 
                    const km={}; this.filteredData.forEach(d=>km[d.kelompok||'Umum']=(km[d.kelompok||'Umum']||0)+1); renderBar('chartGrouping', km); 
                } else if (currentUser.role === 'daerah') { 
                    cardGroup.classList.remove('hidden'); document.getElementById('titleGroupStats').innerText="Rekap per Desa"; 
                    const dm={}; this.filteredData.forEach(d=>dm[d.desa||'Umum']=(dm[d.desa||'Umum']||0)+1); renderBar('chartGrouping', dm); 
                } else {
                    cardGroup.classList.add('hidden'); // Hide for Kelompok
                }
            },
            openModal: function() { document.querySelector('#modalGen form').reset(); document.getElementById('genRowIndex').value=''; UI.openModal('modalGen'); },
            saveForm: async function() {
                const valOrSpace = (val) => (val === undefined || val === null || val === "") ? " " : val;
                const kelas = document.getElementById('genKelas').value;
                const tglInput = document.getElementById('genTglLahir').value;
                if (!currentUser || !currentUser.lokasi) { alert("Sesi login tidak valid. Refresh halaman."); return; }
                let tgl = ""; if(tglInput){const p=tglInput.split('-'); if(p.length===3) tgl=`${p[2]}/${p[1]}/${p[0]}`;}
                const payload = { rowIndex: document.getElementById('genRowIndex').value, no: valOrSpace(document.getElementById('genNo').value), nama: valOrSpace(document.getElementById('genNama').value), jk: valOrSpace(document.getElementById('genJK').value), tempatLahir: valOrSpace(document.getElementById('genTmpLahir').value), tanggalLahir: valOrSpace(tgl), umur: " ", kelas: valOrSpace(kelas), jenjang: " ", ayah: valOrSpace(document.getElementById('genAyah').value), ibu: valOrSpace(document.getElementById('genIbu').value), kelompok: valOrSpace(currentUser.lokasi), desa: valOrSpace(currentUser.desa) };
                UI.loader(true); const action = payload.rowIndex ? 'editData' : 'addData';
                try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, payload }) }); if((await res.json()).status === 'success') { UI.toast('Data tersimpan'); UI.closeModal('modalGen'); this.init(); } } catch(e){ console.error(e); UI.toast('Gagal simpan','error'); } finally{UI.loader(false);}
            },
            edit: function(idx) { const item = this.allData.find(d => d.rowIndex == idx); if(!item) return; document.getElementById('genRowIndex').value = item.rowIndex; document.getElementById('genNo').value = item.no; document.getElementById('genNama').value = item.nama; document.getElementById('genJK').value = item.jk; document.getElementById('genKelas').value = item.kelas; document.getElementById('genTmpLahir').value = item.tempatLahir || ''; if(item.tanggalLahir){const p=item.tanggalLahir.split('/'); if(p.length===3) document.getElementById('genTglLahir').value=`${p[2]}-${p[1]}-${p[0]}`;} else document.getElementById('genTglLahir').value=''; document.getElementById('genAyah').value = item.ayah || ''; document.getElementById('genIbu').value = item.ibu || ''; UI.openModal('modalGen'); },
            del: async function(idx) { if(!confirm('Hapus data ini?')) return; UI.loader(true); try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteData', rowIndex: idx }) }); this.init(); } finally{UI.loader(false);} },
            downloadExcel: function() { if(!this.filteredData.length) return UI.toast('Tidak ada data', 'error'); const ws=XLSX.utils.json_to_sheet(this.filteredData); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, `Data_Generus_${new Date().toISOString().slice(0,10)}.xlsx`); }
        };

        const Guru = {
            allData: [], filteredData: [], currentPage: 1, itemsPerPage: 15,
            init: async function() {
                UI.loader(true);
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getGuruData', role: currentUser.role, lokasi: currentUser.lokasi }) });
                    const json = await res.json(); this.allData = json.data || []; this.applyFilters();
                } catch(e) { UI.toast('Gagal memuat data Guru', 'error'); } finally { UI.loader(false); }
            },
            applyFilters: function() {
                const search = document.getElementById('guruSearch').value.toLowerCase();
                const fStatus = document.getElementById('filterGuruStatus').value;
                const fJK = document.getElementById('filterGuruJK').value;
                const fMengajar = document.getElementById('filterGuruMengajar').value;
                this.filteredData = this.allData.filter(d => {
                    const matchSearch = d.nama.toLowerCase().includes(search);
                    const matchStatus = fStatus ? d.status === fStatus : true;
                    const matchJK = fJK ? d.jk === fJK : true;
                    const matchMengajar = fMengajar ? d.mengajar === fMengajar : true;
                    return matchSearch && matchStatus && matchJK && matchMengajar;
                });
                this.currentPage = 1; this.renderTable(); this.renderStats();
            },
            renderTable: function() {
                const tbody = document.getElementById('guruTableBody'); tbody.innerHTML = '';
                const start = (this.currentPage - 1) * this.itemsPerPage; const end = start + this.itemsPerPage;
                const pageData = this.filteredData.slice(start, end);
                if (pageData.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-4">Tidak ada data</td></tr>`; document.getElementById('guruPagination').classList.add('hidden'); return; }
                pageData.forEach((d) => {
                    const statusBadge = d.status === 'MT' ? 'badge-MT' : d.status === 'MS' ? 'badge-MS' : 'badge-GB';
                    const mengajarBadge = d.mengajar === 'YA' ? 'badge-YA' : 'badge-TIDAK';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${d.no}</td><td><div class="font-bold text-main">${d.nama}</div></td><td><span class="badge-${d.jk==='L'?'H':'S'} status-badge" style="background:${d.jk==='L'?'#e0f2fe':'#fce7f3'}; color:${d.jk==='L'?'#0284c7':'#db2777'}">${d.jk}</span></td><td><span class="status-badge ${statusBadge}">${d.status}</span></td><td>${d.hp || '-'}</td><td><span class="status-badge ${mengajarBadge}">${d.mengajar}</span></td><td><small class="text-muted">${d.kelompok || '-'} <br> ${d.desa || '-'}</small></td><td class="action-col-guru"><button class="btn btn-sm btn-secondary" onclick="Guru.edit(${d.rowIndex})"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger" onclick="Guru.del(${d.rowIndex})"><i class="fas fa-trash"></i></button></td>`;
                    tbody.appendChild(tr);
                });
                UI.renderPagination('guruPagination', this.filteredData.length, this.currentPage, this.itemsPerPage, 'Guru.changePage');
                const actionEls = document.querySelectorAll('.action-col-guru');
                if(currentUser.role !== 'kelompok') { document.getElementById('btnAddGuru').style.display = 'none'; actionEls.forEach(el => el.style.display = 'none'); } 
                else { document.getElementById('btnAddGuru').style.display = 'inline-flex'; actionEls.forEach(el => el.style.display = 'table-cell'); }
            },
            changePage: function(page) { const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage); if (page >= 1 && page <= totalPages) { this.currentPage = page; this.renderTable(); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
            renderStats: function() {
                const total = this.filteredData.length; document.getElementById('statGuruTotal').innerText = total; document.getElementById('statGuruL').innerText = this.filteredData.filter(d => d.jk === 'L').length; document.getElementById('statGuruP').innerText = this.filteredData.filter(d => d.jk === 'P').length;
                const renderBar = (id, map) => { const el = document.getElementById(id); el.innerHTML = ''; const max = Math.max(...Object.values(map), 1); for (const [k, v] of Object.entries(map)) { const pct = (v/max)*100; el.innerHTML += `<div class="stat-bar-item"><div class="sb-label"><span>${k}</span><span>${v}</span></div><div class="sb-bg"><div class="sb-fill" style="width:${pct}%"></div></div></div>`; } };
                const statusMap = {}; this.filteredData.forEach(d => statusMap[d.status] = (statusMap[d.status] || 0) + 1); renderBar('chartGuruStatus', statusMap);
                const mengajarMap = {}; this.filteredData.forEach(d => mengajarMap[d.mengajar] = (mengajarMap[d.mengajar] || 0) + 1); renderBar('chartGuruMengajar', mengajarMap);
            },
            openModal: function() { document.querySelector('#modalGuru form').reset(); document.getElementById('guruRowIndex').value = ''; UI.openModal('modalGuru'); },
            saveForm: async function() {
                const valOrSpace = (val) => (val === undefined || val === null || val === "") ? " " : val;
                if (!currentUser || !currentUser.lokasi) { alert("Sesi login tidak valid. Refresh halaman."); return; }
                const payload = { rowIndex: document.getElementById('guruRowIndex').value, no: valOrSpace(document.getElementById('guruNo').value), nama: valOrSpace(document.getElementById('guruNama').value), jk: valOrSpace(document.getElementById('guruJK').value), status: valOrSpace(document.getElementById('guruStatus').value), hp: valOrSpace(document.getElementById('guruHP').value), mengajar: valOrSpace(document.getElementById('guruMengajar').value), kelompok: valOrSpace(currentUser.lokasi), desa: valOrSpace(currentUser.desa) };
                UI.loader(true); const action = payload.rowIndex ? 'editGuruData' : 'addGuruData';
                try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, payload }) }); if((await res.json()).status === 'success') { UI.toast('Data guru tersimpan'); UI.closeModal('modalGuru'); this.init(); } } catch(e){ UI.toast('Gagal simpan','error'); } finally{UI.loader(false);}
            },
            edit: function(idx) { const item = this.allData.find(d => d.rowIndex == idx); if(!item) return; document.getElementById('guruRowIndex').value = item.rowIndex; document.getElementById('guruNo').value = item.no; document.getElementById('guruNama').value = item.nama; document.getElementById('guruJK').value = item.jk; document.getElementById('guruStatus').value = item.status; document.getElementById('guruHP').value = item.hp || ''; document.getElementById('guruMengajar').value = item.mengajar; UI.openModal('modalGuru'); },
            del: async function(idx) { if(!confirm('Hapus data guru ini?')) return; UI.loader(true); try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteGuruData', rowIndex: idx }) }); this.init(); } finally{UI.loader(false);} },
            downloadExcel: function() { if(!this.filteredData.length) return UI.toast('Tidak ada data', 'error'); const ws=XLSX.utils.json_to_sheet(this.filteredData); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "DataGuru"); XLSX.writeFile(wb, `Data_Guru_${new Date().toISOString().slice(0,10)}.xlsx`); }
        };

        const Jurnal = {
            members: [], statsData: null, chartInstance: null, allHistoryData: [], currentPage: 1, itemsPerPage: 10,
            init: function() { document.getElementById('jurnDate').valueAsDate = new Date(); const isKelompok = currentUser.role === 'kelompok'; const histKelFilter = document.getElementById('histFilterKelompokWrapper'); const statsKelFilter = document.getElementById('statsKelompokFilterWrapper'); if(!isKelompok) { histKelFilter.classList.remove('hidden'); statsKelFilter.classList.remove('hidden'); this.populateOptions(); } else { histKelFilter.classList.add('hidden'); statsKelFilter.classList.add('hidden'); } if(isKelompok) this.switchTab('input', document.getElementById('tabBtnInput')); else this.switchTab('stats', document.getElementById('tabBtnStats')); },
            populateOptions: function() { fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getMemberList', role: currentUser.role, lokasi: currentUser.lokasi, jenjang: '' }) }).then(res => res.json()).then(json => { const kSet = new Set((json.members || []).map(m => m.kelompok).filter(k=>k)); const kSel = document.getElementById('histFilterKelompok'); const statsKSel = document.getElementById('statsFilterKelompok'); [kSel, statsKSel].forEach(sel => { sel.innerHTML = '<option value="">Semua Kelompok</option>'; kSet.forEach(k => sel.innerHTML += `<option value="${k}">${k}</option>`); }); }); },
            switchTab: function(tab, el) { document.querySelectorAll('#mod-jurnal .tab-btn').forEach(t => t.classList.remove('active')); if(el) el.classList.add('active'); document.getElementById('jurnal-input-view').classList.toggle('hidden', tab !== 'input'); document.getElementById('jurnal-history-view').classList.toggle('hidden', tab !== 'history'); document.getElementById('jurnal-stats-view').classList.toggle('hidden', tab !== 'stats'); if(tab === 'history') { const today = new Date().toISOString().split('T')[0]; document.getElementById('histStart').value = today; document.getElementById('histEnd').value = today; this.loadHistory(); } if(tab === 'stats') this.loadStats(); },
            loadMembers: async function() { const jenjang = document.getElementById('jurnJenjang').value; const container = document.getElementById('jurnMemberList'), formArea = document.getElementById('jurnalFormArea'); if(!jenjang) { formArea.classList.add('hidden'); return; } formArea.classList.remove('hidden'); container.innerHTML = '<div class="text-center p-4"><div class="spinner" style="margin:0 auto;"></div></div>'; try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getMemberList', role: currentUser.role, lokasi: currentUser.lokasi, jenjang }) }); const json = await res.json(); container.innerHTML = ''; this.members = json.members || []; if(this.members.length === 0) { container.innerHTML = '<p class="text-center text-muted">Tidak ada generus di jenjang ini.</p>'; return; } this.members.forEach(m => { const div = document.createElement('div'); div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:8px; background:white; border:1px solid #e2e8f0; border-radius:8px;"; div.innerHTML = `<span class="font-medium text-sm">${m.nama}</span><select id="status_${m.no}" style="padding:4px 8px; border-radius:6px; border:1px solid #cbd5e1; background:white; font-size:0.85rem;"><option value="Hadir">Hadir</option><option value="Sakit">Sakit</option><option value="Izin">Izin</option><option value="Alpha">Alpha</option></select>`; container.appendChild(div); }); } catch(e) { UI.toast('Gagal muat generus', 'error'); } },
            save: async function() { const jenjang = document.getElementById('jurnJenjang').value, tgl = document.getElementById('jurnDate').value, materi = document.getElementById('jurnMateri').value; if(!jenjang || !tgl || !materi) return UI.toast('Lengkapi data', 'error'); const hadirData = []; this.members.forEach(m => hadirData.push({ nama: m.nama, status: document.getElementById(`status_${m.no}`).value })); UI.loader(true); try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addJurnal', payload: { tanggal: tgl, kelompok: currentUser.lokasi, desa: currentUser.desa, jenjang, materi, hadir: hadirData } }) }); if((await res.json()).status === 'success') { UI.toast('Jurnal tersimpan'); document.getElementById('jurnMateri').value = ''; } } catch(e) { UI.toast('Gagal simpan', 'error'); } finally { UI.loader(false); } },
            loadHistory: async function() { UI.loader(true); this.currentPage = 1; const start = document.getElementById('histStart').value, end = document.getElementById('histEnd').value, kel = document.getElementById('histFilterKelompok').value, jenjang = document.getElementById('histFilterJenjang').value; const payload = { action: 'getJurnalHistory', role: currentUser.role, lokasi: currentUser.lokasi, desa: currentUser.desa, startDate: start || '', endDate: end || '', filterKelompok: kel || '', jenjang: jenjang || '' }; const container = document.getElementById('jurnHistoryContainer'); container.innerHTML = '<div class="text-center p-4"><div class="spinner" style="margin:0 auto;"></div></div>'; document.getElementById('historyPagination').classList.add('hidden'); try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }); const json = await res.json(); this.allHistoryData = json.history || []; this.renderHistoryPage(); } catch(e) { UI.toast('Gagal muat riwayat', 'error'); } finally { UI.loader(false); } },
            renderHistoryPage: function() { const container = document.getElementById('jurnHistoryContainer'); container.innerHTML = ''; if (this.allHistoryData.length === 0) { container.innerHTML = '<div class="text-center text-muted p-4 bg-white border rounded">Tidak ada data riwayat.</div>'; return; } const start = (this.currentPage - 1) * this.itemsPerPage; const end = start + this.itemsPerPage; const pageData = this.allHistoryData.slice(start, end); pageData.forEach(h => { let hCount=0, sCount=0, iCount=0, aCount=0; try { const list = JSON.parse(h.kehadiran); list.forEach(x => { if(x.status==='Hadir')hCount++; else if(x.status==='Sakit')sCount++; else if(x.status==='Izin')iCount++; else aCount++; }); }catch(e){} const div = document.createElement('div'); div.className = 'history-card'; div.innerHTML = `<div class="flex justify-between items-start mb-2"><div><div class="font-bold text-primary text-lg">${h.tanggal}</div><div class="text-xs text-muted font-medium uppercase tracking-wide">${h.jenjang} ${h.kelompok ? ' - ' + h.kelompok : ''}</div></div><div class="flex gap-2 text-xs font-bold"><span class="badge-H status-badge">H:${hCount}</span><span class="badge-S status-badge">S:${sCount}</span><span class="badge-I status-badge">I:${iCount}</span><span class="badge-A status-badge">A:${aCount}</span></div></div><div class="text-sm text-muted italic mb-3 border-l-2 border-gray-200 pl-3">"${h.materi}"</div><div class="pt-2 border-t border-dashed border-gray-200"><button class="btn btn-sm btn-secondary" onclick="Jurnal.showDetails('${btoa(JSON.stringify(h))}')">Lihat Detail</button></div>`; container.appendChild(div); }); UI.renderPagination('historyPagination', this.allHistoryData.length, this.currentPage, this.itemsPerPage, 'Jurnal.changePage'); },
            changePage: function(page) { const totalPages = Math.ceil(this.allHistoryData.length / this.itemsPerPage); if (page >= 1 && page <= totalPages) { this.currentPage = page; this.renderHistoryPage(); } },
            showDetails: function(encodedData) { const h = JSON.parse(atob(encodedData)); const listDiv = document.getElementById('modalDetailList'); document.getElementById('modalDetailTitle').innerText = `Kehadiran ${h.tanggal} (${h.jenjang})`; document.getElementById('modalDetailMateri').innerText = `"${h.materi}"`; let html = '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">'; try { const list = JSON.parse(h.kehadiran); list.forEach(x => { let badgeClass = 'badge-A'; if(x.status === 'Hadir') badgeClass = 'badge-H'; else if(x.status === 'Sakit') badgeClass = 'badge-S'; else if(x.status === 'Izin') badgeClass = 'badge-I'; html += `<div style="display:flex; justify-content:space-between; padding:8px; background:#f8fafc; border-radius:6px; font-size:0.85rem;"><span>${x.nama}</span><span class="status-badge ${badgeClass}">${x.status}</span></div>`; }); } catch(e){ html = '<p class="text-danger">Gagal memuat data.</p>'; } html += '</div>'; listDiv.innerHTML = html; UI.openModal('modalDetail'); },
            loadStats: async function() { UI.loader(true); const jenjangFilter = document.getElementById('statsFilterJenjang').value; const kelompokFilter = document.getElementById('statsFilterKelompok').value; const startDate = document.getElementById('statsStart').value; const endDate = document.getElementById('statsEnd').value; let payload = { action: 'getJurnalStats', role: currentUser.role, lokasi: currentUser.lokasi, desa: currentUser.desa, jenjang: jenjangFilter, startDate: startDate || '', endDate: endDate || '' }; if (kelompokFilter) payload.filterKelompok = kelompokFilter; try { const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }); const json = await res.json(); if(json.status === 'success') { this.statsData = json.history; this.renderChart(json.chartData); this.renderAnalysis(json.analysis); const chartData = json.chartData || []; if(chartData.length > 0) { const totalPct = chartData.reduce((sum, item) => sum + item.percentage, 0); const avg = Math.round(totalPct / chartData.length); document.getElementById('avgAttendanceValue').innerText = avg + "%"; } else { document.getElementById('avgAttendanceValue').innerText = "0%"; } } else { UI.toast(json.message, 'error'); } } catch(e) { UI.toast('Gagal muat statistik', 'error'); } finally { UI.loader(false); } },
            renderChart: function(data) { const ctx = document.getElementById('attendanceChart').getContext('2d'); if(this.chartInstance) this.chartInstance.destroy(); this.chartInstance = new Chart(ctx, { type: 'line', data: { labels: data.map(d => d.date), datasets: [{ label: 'Kehadiran (%)', data: data.map(d => d.percentage), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#ffffff', pointBorderColor: '#10b981', pointBorderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } } }); },
            renderAnalysis: function(analysis) { const renderList = (id, data) => { const el = document.getElementById(id); el.innerHTML = data.length ? '' : '<small class="text-muted">Tidak ada data</small>'; data.forEach(item => { let detail = `(${item.stat.H}/${item.stat.Total})`; if(currentUser.role !== 'kelompok' && item.kelompoks) detail += `<br><small class="text-muted" style="font-size:0.7rem;">${item.kelompoks}</small>`; el.innerHTML += `<div style="padding:6px 0; border-bottom:1px solid #f1f5f9; font-size:0.85rem;"><b>${item.nama}</b> <span class="text-muted text-xs block">${detail}</span></div>`; }); }; renderList('listRajin', analysis.rajin); renderList('listIzin', analysis.izin); renderList('listSakit', analysis.sakit); renderList('listAlpha', analysis.alpha); },
            downloadRekap: function() { if(!this.statsData || this.statsData.length === 0) return UI.toast('Tidak ada data untuk diunduh.', 'error'); const { jsPDF } = window.jspdf; const doc = new jsPDF(); const startDate = document.getElementById('statsStart').value; const endDate = document.getElementById('statsEnd').value; const startStr = startDate || 'Awal'; const endStr = endDate || 'Akhir'; const fileName = `Laporan_Jurnal_${currentUser.lokasi}_${startStr}_sd_${endStr}.pdf`; const subTitle = `Periode ${startStr} s.d. ${endStr}`; const filterKelompok = document.getElementById('statsFilterKelompok').value; const filterJenjang = document.getElementById('statsFilterJenjang').value; let title = "", tableHeaders = [], tableBody = [], grandTotalPct = 0, countAvg = 0, columnStyles = { 0: { cellWidth: 15 } };
                if (currentUser.role === 'kelompok') { title = `Laporan Jurnal Pengajian Kelompok ${currentUser.lokasi}`; tableHeaders = [['No', 'Tanggal', 'Materi', 'Jenjang', 'Hadir (%)']]; columnStyles[2] = { cellWidth: 65 }; this.statsData.forEach((h, i) => { let pct = 0; try { const list = JSON.parse(h.kehadiran); if (list.length > 0) pct = Math.round((list.filter(x => x.status === 'Hadir').length / list.length) * 100); } catch(e){} tableBody.push([i + 1, h.tanggal, h.materi, h.jenjang, pct + "%"]); grandTotalPct += pct; countAvg++; }); } else if (currentUser.role === 'desa') { title = filterKelompok ? `Laporan Jurnal Kelompok ${filterKelompok}` : `Laporan Jurnal Desa ${currentUser.desa}`; tableHeaders = [['No', 'Tanggal', 'Materi', 'Jenjang', 'Kelompok', 'Hadir (%)']]; columnStyles[2] = { cellWidth: 55 }; columnStyles[4] = { cellWidth: 35 }; this.statsData.forEach((h, i) => { let pct = 0; try { const list = JSON.parse(h.kehadiran); if (list.length > 0) pct = Math.round((list.filter(x => x.status === 'Hadir').length / list.length) * 100); } catch(e){} tableBody.push([i + 1, h.tanggal, h.materi, h.jenjang, h.kelompok, pct + "%"]); grandTotalPct += pct; countAvg++; }); } else if (currentUser.role === 'daerah') { title = `Rekap Laporan Jurnal ${currentUser.lokasi}`; tableHeaders = [['No', 'Jenjang', 'Rata-rata Hadir', 'Desa']]; columnStyles[1] = { cellWidth: 40 }; columnStyles[3] = { cellWidth: 50 }; const groupMap = {}; this.statsData.forEach(h => { let pct = 0; try { const list = JSON.parse(h.kehadiran); if (list.length > 0) pct = Math.round((list.filter(x => x.status === 'Hadir').length / list.length) * 100); } catch(e){} const key = `${h.jenjang}_${h.kelompok}_${h.desa}`; if (!groupMap[key]) groupMap[key] = { totalPct: 0, count: 0, jenjang: h.jenjang, kelompok: h.kelompok, desa: h.desa }; groupMap[key].totalPct += pct; groupMap[key].count++; }); let index = 1; for (const key in groupMap) { const group = groupMap[key]; const avgPct = Math.round(group.totalPct / group.count); tableBody.push([index++, group.jenjang, avgPct + "%", group.desa]); grandTotalPct += avgPct; countAvg++; } }
                doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text(title, 14, 20); doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.text(subTitle, 14, 30); doc.autoTable({ startY: 40, head: tableHeaders, body: tableBody, theme: 'striped', headStyles: { fillColor: [16, 185, 129] }, styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak' }, columnStyles: columnStyles }); const finalY = doc.lastAutoTable.finalY + 10; let overallAvg = countAvg > 0 ? Math.round(grandTotalPct / countAvg) : 0; doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(`Rata-rata kehadiran keseluruhan: ${overallAvg}%`, 14, finalY); doc.save(fileName);
            }
        };

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
                    if (this.currentView === 'dashboard') this.loadDashboard();
                    else this.populateStudentList();
                } catch(e) { UI.toast('Gagal inisialisasi kurikulum', 'error'); } finally { UI.loader(false); }
            },
            switchView: function(view, btnElement) { this.currentView = view; document.querySelectorAll('#mod-kurikulum .tab-btn').forEach(t => t.classList.remove('active')); if(btnElement) btnElement.classList.add('active'); document.getElementById('kur-dashboard-view').classList.toggle('hidden', view !== 'dashboard'); document.getElementById('kur-detail-view').classList.toggle('hidden', view !== 'detail'); if(view === 'dashboard') this.loadDashboard(); else { document.getElementById('kurContent').classList.add('hidden'); document.getElementById('kurStudentSelect').value = ""; } },
            loadDashboard: async function() { const content = document.getElementById('kurDashboardContent'); content.innerHTML = '<div class="text-center p-4"><div class="spinner" style="margin:0 auto;"></div><p class="text-muted mt-2">Memuat rekapitulasi...</p></div>'; try { const filterJenjang = document.getElementById('kurDashboardFilterJenjang').value; const pRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getAllProgressData' }) }); const pJson = await pRes.json(); if(pJson.status === 'success' && pJson.data) { let groupStats = {}; const progressMap = {}; pJson.data.forEach(p => { progressMap[p.student] = p.progressData; }); this.allStudents.forEach(student => { if (!progressMap[student.nama]) return; if (filterJenjang && student.jenjang !== filterJenjang) return; let groupKey = ""; if(currentUser.role === 'daerah') groupKey = `${student.kelompok} - ${student.desa}`; else if (currentUser.role === 'desa') groupKey = student.kelompok; if (!groupStats[groupKey]) groupStats[groupKey] = { name: groupKey, totalItems: 0, checkedItems: 0, memberCount: 0 }; const pData = progressMap[student.nama] || {}; const total = Object.keys(pData).length; const checked = Object.values(pData).filter(v => v).length; groupStats[groupKey].totalItems += total; groupStats[groupKey].checkedItems += checked; groupStats[groupKey].memberCount++; }); let dashboardHtml = ''; const sortedKeys = Object.keys(groupStats).sort(); if (sortedKeys.length === 0) { dashboardHtml = '<div class="text-center p-4 bg-white border rounded text-muted">Tidak ada data kurikulum ditemukan.</div>'; } else { sortedKeys.forEach(key => { const stats = groupStats[key]; let pct = stats.totalItems > 0 ? Math.round((stats.checkedItems / stats.totalItems) * 100) : 0; let displayName = key; if (currentUser.role === 'desa') displayName = key.split(' - ')[0]; dashboardHtml += `<div class="stat-card"><div class="flex justify-between items-center mb-2"><h4 class="font-bold text-primary m-0" style="font-size:1.1rem;">${displayName}</h4><div class="text-right"><div class="text-xs text-muted font-bold uppercase">Pencapaian</div><div class="text-xl font-bold text-primary">${pct}%</div></div></div><div class="bg-gray-100 rounded-full h-2 overflow-hidden" style="background:#e2e8f0; height:8px; border-radius:4px;"><div style="width:${pct}%; background:var(--primary); height:100%; transition:width 0.6s;"></div></div><div class="mt-2 text-xs text-muted">${stats.checkedItems} dari ${stats.totalItems} Materi Tercapai <br> <span class="font-bold text-main">(${stats.memberCount} Siswa)</span></div></div>`; }); } content.innerHTML = dashboardHtml; } else { content.innerHTML = '<p class="text-center text-danger">Gagal memuat data.</p>'; } } catch(e) { UI.toast('Gagal memuat dashboard', 'error'); content.innerHTML = '<p class="text-center text-danger">Terjadi kesalahan.</p>'; } },
            populateStudentList: function() { const filterJenjang = document.getElementById('kurFilterJenjang').value; const filteredStudents = filterJenjang ? this.allStudents.filter(s => s.jenjang === filterJenjang) : this.allStudents; const sel = document.getElementById('kurStudentSelect'); const prevValue = sel.value; sel.innerHTML = '<option value="">-- Pilih Siswa --</option>'; filteredStudents.forEach(s => { const jenjang = s.jenjang || "Umum"; const selected = s.nama === prevValue ? 'selected' : ''; sel.innerHTML += `<option value="${s.nama}" data-jenjang="${jenjang}" ${selected}>${s.nama} (${s.kelompok || '-'})</option>`; }); if (prevValue && !filteredStudents.some(s => s.nama === prevValue)) document.getElementById('kurContent').classList.add('hidden'); },
            loadStudentDetail: async function() { const select = document.getElementById('kurStudentSelect'); const selectedName = select.value; const content = document.getElementById('kurContent'); if(!selectedName) { content.classList.add('hidden'); return; } content.classList.remove('hidden'); UI.loader(true); try { const selectedOption = select.options[select.selectedIndex]; const jenjang = selectedOption.getAttribute('data-jenjang'); document.getElementById('kurStudentNameDisplay').innerText = selectedName; document.getElementById('kurJenjangDisplay').innerText = jenjang; const curriculumData = this.config[jenjang]; if(!curriculumData) { const area = document.getElementById('kurChecklistArea'); area.innerHTML = `<div class="text-center p-4 rounded bg-yellow-50 text-yellow-700 border border-yellow-200"><i class="fas fa-exclamation-triangle"></i> Kurikulum tidak ditemukan untuk <b>${jenjang}</b>.</div>`; this.updateProgressBar(0); UI.loader(false); return; } const pRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProgress', student: selectedName, jenjang: jenjang }) }); const pJson = await pRes.json(); let savedData = {}; if(pJson.status === 'success' && pJson.data) { savedData = pJson.data.progressData || {}; } const area = document.getElementById('kurChecklistArea'); area.innerHTML = ''; let html = ''; curriculumData.forEach((cat, cIdx) => { html += `<div class="category-section"><div class="category-header">${cat.category}. ${cat.title}</div><div class="item-list">`; cat.items.forEach((item, iIdx) => { const key = `${cIdx}-${iIdx}`; const isChecked = savedData[key] ? 'checked' : ''; html += `<div class="checklist-item"><input type="checkbox" id="chk_${key}" ${isChecked} onchange="Kurikulum.updateLocalProgress()"><label for="chk_${key}" class="cursor-pointer">${item}</label></div>`; }); html += `</div></div>`; }); area.innerHTML = html; const checkboxes = area.querySelectorAll('input[type="checkbox"]'); const total = checkboxes.length; const checked = area.querySelectorAll('input[type="checkbox"]:checked').length; this.updateProgressUI(checked, total); } catch(e) { UI.toast('Gagal muat progress siswa', 'error'); } finally { UI.loader(false); } },
            updateLocalProgress: function() { const checkboxes = document.querySelectorAll('#kurChecklistArea input[type="checkbox"]'); const total = checkboxes.length; const checked = document.querySelectorAll('#kurChecklistArea input[type="checkbox"]:checked').length; this.updateProgressUI(checked, total); },
            updateProgressUI: function(checked, total) { const pct = total > 0 ? Math.round((checked/total)*100) : 0; document.getElementById('kurPercent').innerText = pct + "%"; document.getElementById('kurBar').style.width = pct + "%"; },
            save: async function() { const selectedName = document.getElementById('kurStudentSelect').value; const selectedOption = document.getElementById('kurStudentSelect').options[document.getElementById('kurStudentSelect').selectedIndex]; const jenjang = selectedOption.getAttribute('data-jenjang'); if(!selectedName) return UI.toast('Pilih siswa terlebih dahulu', 'error'); const checkboxes = document.querySelectorAll('#kurChecklistArea input[type="checkbox"]'); const progressData = {}; checkboxes.forEach(cb => { const key = cb.id.replace('chk_', ''); progressData[key] = cb.checked; }); UI.loader(true); try { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveProgress', student: selectedName, jenjang: jenjang, progressData: progressData }) }); UI.toast('Progress tersimpan'); } catch(e) { UI.toast('Gagal simpan', 'error'); } finally { UI.loader(false); } }
        };

        // ==========================================
        // MODULE RAPOT (REVISI - FIX DATA LOADING)
        // ==========================================
        const Rapot = {
            grades: ["A", "A-", "B+", "B", "B-", "C", "D", "E"],
            currentStudent: null,
            currentCurriculum: null,

            init: async function() {
                const btnPrint = document.getElementById('btnPrintRapot');
                const tabLeger = document.getElementById('tabRapotLeger');
                const formArea = document.getElementById('rapot-form-area');
                const msgOnly = document.getElementById('rapot-kelompok-only-msg');

                // Reset View
                btnPrint.classList.add('hidden');
                document.getElementById('rapotFormContainer').classList.add('hidden');
                document.getElementById('rapot-leger-view').classList.add('hidden');
                document.getElementById('rapot-input-view').classList.remove('hidden');

                // Logic Tampilan berdasarkan Role
                if (currentUser.role === 'kelompok') {
                    tabLeger.classList.add('hidden');
                    formArea.classList.remove('hidden');
                    msgOnly.classList.add('hidden');
                    
                    // Load Siswa Dropdown
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getData', role: currentUser.role, lokasi: currentUser.lokasi }) });
                    const json = await res.json();
                    const sel = document.getElementById('rapotStudentSelect');
                    sel.innerHTML = '<option value="">-- Pilih Siswa --</option>';
                    (json.data || []).forEach(s => {
                        sel.innerHTML += `<option value="${s.nama}">${s.nama} - ${s.jenjang}</option>`;
                    });
                } else if (currentUser.role === 'daerah' || currentUser.role === 'desa') {
                    // Tampilkan Tab Leger, Sembunyikan Input Rapot
                    tabLeger.classList.remove('hidden');
                    formArea.classList.add('hidden');
                    msgOnly.classList.remove('hidden');
                    
                    // FIX: PASTIKAN DATA GENERUS TERLOAD UNTUK FILTER DESA
                    // Jika data belum ada (misal user langsung buka menu ini), fetch dulu.
                    if(Generus.allData.length === 0) {
                        try {
                            const gRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getData', role: currentUser.role, lokasi: currentUser.lokasi }) });
                            const gJson = await gRes.json();
                            Generus.allData = gJson.data || [];
                        } catch(e) { console.error("Gagal load data generus untuk filter", e); }
                    }
                    
                    // Setup Filter Leger (Load Desa List untuk Daerah)
                    if(currentUser.role === 'daerah') {
                        Leger.populateDesaFilter();
                    } else {
                        document.getElementById('wrapFilterDesa').classList.add('hidden'); // Sembunyikan filter desa jika akun desa
                    }
                }
            },

            switchTab: function(tab, btn) {
                document.querySelectorAll('#mod-rapot .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if(tab === 'input') {
                    document.getElementById('rapot-input-view').classList.remove('hidden');
                    document.getElementById('rapot-leger-view').classList.add('hidden');
                } else {
                    document.getElementById('rapot-input-view').classList.add('hidden');
                    document.getElementById('rapot-leger-view').classList.remove('hidden');
                    // Auto load data awal jika perlu, atau biarkan user filter dulu
                }
            },

            loadStudentData: async function() {
                const nama = document.getElementById('rapotStudentSelect').value;
                if(!nama) return;
                document.getElementById('rapotFormContainer').classList.add('hidden');
                document.getElementById('btnPrintRapot').classList.add('hidden');
                UI.loader(true);

                try {
                    const student = Generus.allData.find(s => s.nama === nama);
                    if(!student) throw new Error("Data siswa tidak ditemukan");

                    const cRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getConfig' }) });
                    const cJson = await cRes.json();
                    if(cJson.status === 'success') this.currentCurriculum = cJson.data[student.jenjang] || [];

                    const semester = document.getElementById('rapotSemester').value;
                    const rRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getRapot', nama, semester }) });
                    const rJson = await rRes.json();
                    let savedGrades = {}, savedNotes = "";
                    if(rJson.status === 'success' && rJson.data) {
                        savedGrades = rJson.data.nilai || {};
                        savedNotes = rJson.data.catatan || "";
                    }

                    const titles = [];
                    (this.currentCurriculum || []).forEach(c => { if(titles.indexOf(c.title) === -1) titles.push(c.title); });

                    const container = document.getElementById('rapotGradeRows');
                    container.innerHTML = '';
                    titles.forEach(tit => {
                        const val = savedGrades[tit] || "";
                        container.innerHTML += `
                        <div class="rapot-grade-row">
                            <input type="text" class="form-control" value="${tit}" readonly>
                            <select class="form-control" id="grade_${tit}">
                                ${this.grades.map(g => `<option value="${g}" ${g===val?'selected':''}>${g}</option>`).join('')}
                            </select>
                        </div>`;
                    });
                    document.getElementById('rapotNotes').value = savedNotes;
                    document.getElementById('rapotFormContainer').classList.remove('hidden');

                } catch(e) { UI.toast('Gagal memuat data', 'error'); }
                finally { UI.loader(false); }
            },

            save: async function() {
                const nama = document.getElementById('rapotStudentSelect').value;
                if(!nama) return UI.toast('Pilih siswa dulu', 'error');

                const titles = [];
                (this.currentCurriculum || []).forEach(c => { if(titles.indexOf(c.title) === -1) titles.push(c.title); });

                const nilai = {};
                titles.forEach(tit => { nilai[tit] = document.getElementById(`grade_${tit}`).value; });

                const payload = {
                    nama: nama,
                    semester: document.getElementById('rapotSemester').value,
                    nilai: nilai,
                    catatanGuru: document.getElementById('rapotNotes').value
                };

                UI.loader(true);
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveRapot', payload }) });
                    const result = await res.json();
                    if(result.status === 'success') {
                        UI.toast('Nilai Berhasil Disimpan');
                        document.getElementById('btnPrintRapot').classList.remove('hidden');
                    }
                } catch(e) { UI.toast('Gagal simpan', 'error'); }
                finally { UI.loader(false); }
            },

            printPDF: async function() {
                const nama = document.getElementById('rapotStudentSelect').value;
                const semester = document.getElementById('rapotSemester').value;
                
                if(!nama) return UI.toast('Pilih siswa dulu', 'error');
                
                UI.loader(true);
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                try {
                    // 1. Ambil Data Terbaru dari Server (agar akurat)
                    const rRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getRapot', nama, semester }) });
                    const rJson = await rRes.json();
                    
                    if(!rJson.data) throw new Error("Data rapot belum ditemukan.");

                    const grades = rJson.data.nilai || {};
                    const catatan = rJson.data.catatan || "-";
                    
                    // Ambil detail siswa
                    const student = Generus.allData.find(s => s.nama === nama);

                    // --- HALAMAN 1: COVER & DATA AKADEMIK ---
                    
                    // Header
                    doc.setFontSize(16);
                    doc.setFont("helvetica", "bold");
                    doc.text("LAPORAN HASIL BELAJAR", 105, 20, { align: "center" });
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "normal");
                    doc.text("Sistem Pembinaan Generus", 105, 28, { align: "center" });
                    
                    // Biodata Table
                    const bioData = [
                        ["Nama Siswa", `: ${student.nama}`],
                        ["Kelompok", `: ${student.kelompok}`],
                        ["Desa", `: ${student.desa}`],
                        ["Semester", `: ${semester}`],
                        ["Jenjang", `: ${student.jenjang}`]
                    ];
                    
                    doc.autoTable({
                        startY: 40,
                        head: [],
                        body: bioData,
                        theme: 'plain',
                        styles: { fontSize: 11, cellPadding: 2 },
                        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
                    });

                    // Tabel Nilai (No, Materi, Nilai)
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "bold");
                    doc.text("Penilaian Per Bab", 14, doc.lastAutoTable.finalY + 15);
                    doc.setFont("helvetica", "normal");

                    const tableBody = [];
                    const titles = Object.keys(grades);
                    let totalScore = 0;
                    const scoreMap = {'A':4, 'A-':3.7, 'B+':3.3, 'B':3.0, 'B-':2.7, 'C':2.0, 'D':1.0, 'E':0};

                    titles.forEach((tit, index) => {
                        const grade = grades[tit];
                        const score = scoreMap[grade] || 0;
                        totalScore += score;
                        tableBody.push([index + 1, tit, grade]); // Format: No, Materi, Nilai
                    });

                    const avgScore = titles.length > 0 ? (totalScore / titles.length) : 0;
                    const finalGrade = this.scoreToLetter(avgScore);

                    doc.autoTable({
                        startY: doc.lastAutoTable.finalY + 20,
                        head: [['No', 'Materi', 'Nilai']],
                        body: tableBody,
                        theme: 'grid',
                        headStyles: { fillColor: [16, 185, 129] },
                        columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 30, halign: 'center' } }
                    });

                    // Tulis "Nilai Akhir" di bawah tabel
                    const finalY = doc.lastAutoTable.finalY + 10;
                    doc.setFontSize(11);
                    doc.setFont("helvetica", "bold");
                    doc.text(`Nilai Akhir : ${finalGrade}`, 14, finalY);

                    // Tabel Kehadiran (Dibawah Nilai Akhir)
                    // Ambil data kehadiran dari Jurnal (logic simplifikasi)
                    const jRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJurnalHistory', role: currentUser.role, lokasi: currentUser.lokasi, startDate: '', endDate: '' }) });
                    const jJson = await jRes.json();
                    let h=0, s=0, i=0, a=0, totalMeetings=0;
                    (jJson.history || []).forEach(j => {
                        try {
                            const list = JSON.parse(j.kehadiran);
                            const found = list.find(x => x.nama === nama);
                            if(found) {
                                totalMeetings++;
                                if(found.status === 'Hadir') h++;
                                else if(found.status === 'Sakit') s++;
                                else if(found.status === 'Izin') i++;
                                else a++;
                            }
                        } catch(e){}
                    });

                    doc.text("Rekapitulasi Kehadiran", 14, finalY + 15);
                    
                    doc.autoTable({
                        startY: finalY + 20,
                        head: [['Sakit', 'Izin', 'Alpha', '% Hadir']],
                        body: [[
                            s, i, a, totalMeetings > 0 ? Math.round((h/totalMeetings)*100) + "%" : "0%"
                        ]],
                        theme: 'grid',
                        headStyles: { fillColor: [59, 130, 246] }, // Warna biru untuk beda
                        columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center', fontStyle: 'bold' } }
                    });

                    // Catatan Guru
                    doc.text("Catatan Guru", 14, doc.lastAutoTable.finalY + 15);
                    doc.setDrawColor(0);
                    doc.rect(14, doc.lastAutoTable.finalY + 20, 180, 30); // Kotak catatan
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.text(catatan, 16, doc.lastAutoTable.finalY + 25, { maxWidth: 176 });

                    // Tanda Tangan
                    doc.setFontSize(10);
                    const sigY = 250;
                    doc.text("Mengetahui,", 30, sigY);
                    doc.text("Orang Tua/Wali", 30, sigY + 5);
                    doc.line(30, sigY + 15, 80, sigY + 15); // Garis tanda tangan

                    const today = new Date();
                    const dateStr = `${currentUser.lokasi}, ${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}`;
                    doc.text(`${dateStr}`, 130, sigY);
                    doc.text("Guru", 130, sigY + 5);
                    doc.line(130, sigY + 15, 180, sigY + 15);

                    // --- HALAMAN 2: KURIKULUM (Jika ingin tetap ada) ---
                    doc.addPage();
                    doc.setFontSize(16);
                    doc.setFont("helvetica", "bold");
                    doc.text("Rincian Pencapaian Materi", 105, 20, { align: "center" });
                    doc.setFontSize(11);
                    doc.text(`Nama: ${student.nama}`, 14, 30);

                    const pRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProgress', student: nama, jenjang: student.jenjang }) });
                    const pJson = await pRes.json();
                    
                    if(pJson.status === 'success' && pJson.data && pJson.data.progressData) {
                        const pData = pJson.data.progressData;
                        const kurBody = [];
                        let no = 1;
                        
                        // Loop kurikulum yang ada di currentCurriculum
                        (this.currentCurriculum || []).forEach((cat, cIdx) => {
                            // Header Kategori
                            kurBody.push([{ content: cat.title, colSpan: 3, styles: { fillColor: [200, 200, 200], fontStyle: 'bold' } }]); 
                            
                            // Item Materi
                            cat.items.forEach((item, iIdx) => {
                                const key = `${cIdx}-${iIdx}`;
                                const isDone = pData[key] ? "Selesai" : "Belum Selesai";
                                kurBody.push([no++, item, { content: isDone, styles: { halign: 'center' } }]);
                            });
                        });
                        
                        doc.autoTable({
                            startY: 40,
                            head: [['No', 'Materi', {content: 'Status', styles: {halign: 'center'}}]],
                            body: kurBody,
                            theme: 'grid',
                            columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 40 } }
                        });
                    }

                    doc.save(`Rapot_${student.nama}_${semester}.pdf`);

                } catch(e) {
                    console.error(e);
                    UI.toast('Gagal membuat PDF', 'error');
                }
                finally { UI.loader(false); }
            },
            
            scoreToLetter: function(avg) {
                if(avg >= 3.8) return 'A'; if(avg >= 3.5) return 'A-'; if(avg >= 3.2) return 'B+'; if(avg >= 2.8) return 'B'; if(avg >= 2.5) return 'B-'; if(avg >= 2.0) return 'C'; if(avg >= 1.0) return 'D'; return 'E';
            }
        };

        // ==========================================
        // MODULE LEGER (FIXED)
        // ==========================================
        // ==========================================
        // MODULE LEGER (UPDATED DYNAMIC FILTERS)
        // ==========================================
        const Leger = {
            currentData: [],

            // 1. Populate Dropdown Desa (Khusus Daerah)
            populateDesaFilter: function() {
                if(Generus.allData && Generus.allData.length > 0) {
                    const desaSet = new Set(Generus.allData.map(d => d.desa).filter(d=>d));
                    const sel = document.getElementById('legerFilterDesa');
                    sel.innerHTML = '<option value="">Semua Desa</option>'; // Value kosong = Semua
                    desaSet.forEach(d => sel.innerHTML += `<option value="${d}">${d}</option>`);
                    
                    // Trigger update kelompok saat pertama load (Ambil semua kelompok karena desa = "Semua")
                    this.populateGroupFilter(""); 
                }
            },

            // 2. Populate Dropdown Semester (Dari Data Backend)
            populateSemesterFilter: function(semesterList) {
                const sel = document.getElementById('legerSemester');
                sel.innerHTML = '<option value="">Semua Semester</option>';
                if(semesterList && semesterList.length > 0) {
                    semesterList.forEach(s => {
                        sel.innerHTML += `<option value="${s}">${s}</option>`;
                    });
                }
            },

            // 3. Populate Dropdown Kelompok (Berdasarkan Desa yang dipilih)
            populateGroupFilter: function(desaValue) {
                const sel = document.getElementById('legerFilterKelompok');
                sel.innerHTML = '<option value="">Semua Kelompok</option>';
                
                // Filter data Generus
                let filteredData = Generus.allData;
                
                // Logika Jika Akun Daerah:
                if(currentUser.role === 'daerah') {
                    // Jika desaValue tidak kosong (artinya user memilih desa tertentu), filter data generus
                    if(desaValue && desaValue.trim() !== "") {
                        filteredData = Generus.allData.filter(d => d.desa === desaValue);
                    }
                    // Jika kosong ("Semua Desa"), biarkan filteredData tetap semua data (atau filter berdasarkan lokasi daerah saja)
                    else {
                        filteredData = Generus.allData.filter(d => d.desa); // Pastikan hanya yang punya desa
                    }
                } 
                // Logika Jika Akun Desa:
                else if (currentUser.role === 'desa') {
                    // User desa sudah terfilter otomatis, jadi ambil allData (yang sudah difilter role)
                }

                // Ambil Kelompok Unik
                const kelSet = new Set(filteredData.map(d => d.kelompok).filter(k=>k));
                kelSet.forEach(k => sel.innerHTML += `<option value="${k}">${k}</option>`);
            },

            loadData: async function() {
                UI.loader(true);
                const semester = document.getElementById('legerSemester').value;
                const desa = currentUser.role === 'desa' ? currentUser.desa : document.getElementById('legerFilterDesa').value;
                const kelompok = document.getElementById('legerFilterKelompok').value;

                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({
                        action: 'getLegerData',
                        role: currentUser.role,
                        lokasi: currentUser.lokasi,
                        desa: desa,
                        kelompok: kelompok,
                        semester: semester
                    })});
                    const json = await res.json();
                    
                    if(json.status === 'success') {
                        this.currentData = json.data;
                        
                        // Populate Dropdown Semester dari hasil fetch backend
                        this.populateSemesterFilter(json.semesters);
                        
                        this.renderStats(json.stats);
                        this.renderTable(json.data);
                    } else {
                        UI.toast('Gagal ambil data', 'error');
                        this.renderTable([]); 
                    }
                } catch(e) { 
                    UI.toast('Error koneksi', 'error'); 
                }
                finally { UI.loader(false); }
            },

            // Tambahkan event listener untuk change Desa -> Update Kelompok
            initDesaListener: function() {
                const desaSel = document.getElementById('legerFilterDesa');
                if(desaSel) {
                    desaSel.addEventListener('change', (e) => {
                        this.populateGroupFilter(e.target.value);
                    });
                }
            },

            renderStats: function(stats) {
                const container = document.getElementById('legerStatsGrid');
                const area = document.getElementById('legerStatsArea');
                
                if(!stats || stats.length === 0) {
                    area.classList.add('hidden');
                    return;
                }
                
                area.classList.remove('hidden');
                container.innerHTML = '';
                
                stats.forEach(s => {
                    let colorClass = 'text-muted';
                    if(s.predicate === 'A' || s.predicate === 'A-') colorClass = 'text-primary';
                    else if(s.predicate.startsWith('B')) colorClass = 'text-info';
                    else if(s.predicate === 'C') colorClass = 'text-warning';
                    else colorClass = 'text-danger';

                    container.innerHTML += `
                    <div class="stat-card">
                        <h4 style="font-size:0.9rem; color:var(--text-muted);">${s.name}</h4>
                        <div style="font-size:1.5rem; font-weight:bold;" class="${colorClass}">${s.predicate}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">Avg: ${s.avg}</div>
                    </div>`;
                });
            },

            renderTable: function(data) {
                const tbody = document.getElementById('legerTableBody');
                tbody.innerHTML = '';
                if(data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Tidak ada data rapot ditemukan untuk filter ini.</td></tr>`;
                    return;
                }

                data.forEach((d, i) => {
                    let badgeColor = 'badge-A'; 
                    if(d.predikat === 'B' || d.predikat === 'B+' || d.predikat === 'B-') badgeColor = 'badge-S';
                    if(d.predikat === 'C') badgeColor = 'badge-I';
                    if(d.predikat === 'D' || d.predikat === 'E') badgeColor = 'badge-A'; 

                    if(d.predikat.startsWith('A')) badgeColor = 'badge-H'; // Hijau
                    else if(d.predikat.startsWith('B')) badgeColor = 'badge-I'; // Biru
                    else if(d.predikat === 'C') badgeColor = 'badge-S'; // Kuning
                    else badgeColor = 'badge-A'; // Merah

                    tbody.innerHTML += `
                    <tr>
                        <td>${i+1}</td>
                        <td><b>${d.nama}</b></td>
                        <td>${d.kelompok}</td>
                        <td>${d.desa}</td>
                        <td>${d.semester}</td>
                        <td style="text-align:center; font-weight:bold;">${d.rataRata}</td>
                        <td style="text-align:center;"><span class="status-badge ${badgeColor}">${d.predikat}</span></td>
                    </tr>`;
                });
            },

            downloadExcel: function() {
                if(!this.currentData || this.currentData.length === 0) return UI.toast('Tidak ada data untuk diunduh', 'error');

                const allSubjects = new Set();
                this.currentData.forEach(d => {
                    Object.keys(d.nilaiRaw).forEach(k => allSubjects.add(k));
                });
                const subjectsArr = Array.from(allSubjects).sort();

                const sheetData = [];
                const headerRow = ["No", "Nama", "Kelompok", "Desa", "Semester", ...subjectsArr, "Rata-rata", "Predikat"];
                sheetData.push(headerRow);

                this.currentData.forEach((d, i) => {
                    const row = [i+1, d.nama, d.kelompok, d.desa, d.semester];
                    subjectsArr.forEach(sub => row.push(d.nilaiRaw[sub] || "-"));
                    row.push(d.rataRata, d.predikat);
                    sheetData.push(row);
                });

                const ws = XLSX.utils.aoa_to_sheet(sheetData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Leger Nilai");
                XLSX.writeFile(wb, `Leger_Nilai_${currentUser.lokasi}_${new Date().toISOString().slice(0,10)}.xlsx`);
            }
        };
        // ==========================================
        // MODULE JADWAL KBM (FIXED EDIT LOGIC & NEW STRUCTURE)
        // ==========================================
        const Jadwal = {
            rawData: [], 
            displayData: [],
            
            init: async function() {
                UI.loader(true);
                
                const btn = document.getElementById('btnAddJadwal');
                const filterBar = document.getElementById('jadwalFilterBar');
                
                if(currentUser.role !== 'kelompok') {
                    btn.style.display = 'none'; 
                    filterBar.classList.remove('hidden');
                } else {
                    btn.style.display = 'inline-flex';
                    filterBar.classList.add('hidden');
                }

                if(Generus.allData.length === 0) {
                    try {
                        const gRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getData', role: currentUser.role, lokasi: currentUser.lokasi }) });
                        const gJson = await gRes.json();
                        Generus.allData = gJson.data || [];
                    } catch(e) { console.error("Gagal load data generus", e); }
                }

                this.setupFilterListeners();
                await this.loadData();
            },

            setupFilterListeners: function() {
                if(currentUser.role === 'kelompok') return;

                const selDesa = document.getElementById('jadwalFilterDesa');
                if(selDesa) {
                    selDesa.onchange = (e) => {
                        this.populateFiltersBasedOnSelection(e.target.value, document.getElementById('jadwalFilterKelompok').value);
                        this.applyFilters();
                    };
                }

                const selKel = document.getElementById('jadwalFilterKelompok');
                if(selKel) selKel.onchange = () => this.applyFilters();

                const selTempat = document.getElementById('jadwalFilterTempat');
                if(selTempat) selTempat.onchange = () => this.applyFilters();

                const selPel = document.getElementById('jadwalFilterPelaksanaan');
                if(selPel) selPel.onchange = () => this.applyFilters();
            },

            loadData: async function() {
                UI.loader(true);
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ 
                        action: 'getJadwal', 
                        role: currentUser.role, 
                        lokasi: currentUser.lokasi,
                        desa: currentUser.desa 
                    })});
                    const json = await res.json();
                    
                    if(json.status === 'success') {
                        this.rawData = json.data || [];
                        // DEBUG: Cek data masuk atau tidak
                        console.log("Data Jadwal masuk:", this.rawData.length); 
                        this.populateAllFilters(); 
                        this.applyFilters();
                    }
                } catch(e) { UI.toast('Gagal muat jadwal', 'error'); }
                finally { UI.loader(false); }
            },

            populateAllFilters: function() {
                if(currentUser.role === 'kelompok') return;

                if(currentUser.role === 'daerah') {
                    const desaSet = new Set(Generus.allData.map(d => d.desa).filter(d=>d));
                    const selDesa = document.getElementById('jadwalFilterDesa');
                    selDesa.innerHTML = '<option value="">Semua Desa</option>';
                    desaSet.forEach(d => selDesa.innerHTML += `<option value="${d}">${d}</option>`);
                } else {
                    document.getElementById('jadwalFilterDesa').parentElement.classList.add('hidden');
                }
                this.populateFiltersBasedOnSelection(document.getElementById('jadwalFilterDesa').value, "");
            },

            populateFiltersBasedOnSelection: function(desaVal, kelompokVal) {
                const selKel = document.getElementById('jadwalFilterKelompok');
                const selTempat = document.getElementById('jadwalFilterTempat');

                let filteredGen = Generus.allData;
                if(desaVal) filteredGen = Generus.allData.filter(d => d.desa === desaVal);

                selKel.innerHTML = '<option value="">Semua Kelompok</option>';
                const kelSet = new Set(filteredGen.map(d => d.kelompok).filter(k=>k));
                kelSet.forEach(k => selKel.innerHTML += `<option value="${k}">${k}</option>`);

                if(kelompokVal) selKel.value = kelompokVal;

                let filteredJadwal = this.rawData;
                if(desaVal) filteredJadwal = this.rawData.filter(d => d.desa === desaVal);
                
                const tempatSet = new Set(filteredJadwal.map(d => d.tempat).filter(t=>t));
                selTempat.innerHTML = '<option value="">Semua Tempat</option>';
                tempatSet.forEach(t => selTempat.innerHTML += `<option value="${t}">${t}</option>`);
            },

            applyFilters: function() {
                const desaVal = document.getElementById('jadwalFilterDesa').value;
                const kelVal = document.getElementById('jadwalFilterKelompok').value;
                const tempatVal = document.getElementById('jadwalFilterTempat').value;
                const pelVal = document.getElementById('jadwalFilterPelaksanaan').value;
                
                let filtered = this.rawData;

                if(pelVal) filtered = filtered.filter(d => d.pelaksanaan === pelVal);
                if(currentUser.role === 'daerah' && desaVal) filtered = filtered.filter(d => d.desa === desaVal);
                if(kelVal) filtered = filtered.filter(d => d.kelompok === kelVal);
                if(tempatVal) filtered = filtered.filter(d => d.tempat === tempatVal);

                this.displayData = filtered;
                this.renderTable(this.displayData);
            },

            renderTable: function(data) {
                const tbody = document.getElementById('jadwalTableBody');
                tbody.innerHTML = '';
                
                const dayMap = { "Senin":1, "Selasa":2, "Rabu":3, "Kamis":4, "Jumat":5, "Sabtu":6, "Minggu":7 };
                data.sort((a,b) => (dayMap[a.hari] || 99) - (dayMap[b.hari] || 99) || a.waktu.localeCompare(b.waktu));

                if (data.length === 0) {
                     tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-4">Belum ada jadwal KBM.</td></tr>`;
                     return;
                }

                data.forEach(d => {
                    const locText = d.kelompok ? `<b>${d.kelompok}</b>` : '';
                    const desaText = d.desa ? `<br><small class="text-muted">${d.desa}</small>` : '';
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                    <td><b>${d.hari}</b></td>
                    <td>${d.waktu}</td>
                    <td>${d.pengajar}</td>
                    <td><span class="badge-H status-badge">${d.jenjang}</span></td>
                    <td>${d.tempat}</td>
                    <td>${d.pelaksanaan}</td>
                    <td>${locText} ${desaText}</td>
                    <td class="action-col-jadwal">
                        <button class="btn btn-sm btn-secondary" onclick="Jadwal.edit(${d.rowIndex})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="Jadwal.del(${d.rowIndex})"><i class="fas fa-trash"></i></button>
                    </td>`;
                    tbody.appendChild(tr);
                });

                const actionEls = document.querySelectorAll('.action-col-jadwal');
                if (currentUser.role === 'kelompok') {
                    actionEls.forEach(el => el.style.display = 'table-cell');
                } else {
                    actionEls.forEach(el => el.style.display = 'none');
                }
            },

            // --- FUNGSI PENTING YANG HILANG SEBELUMNYA ---
            edit: function(rowIdx) {
                console.log("Tombol edit diklik untuk ID:", rowIdx);
                this.openModal(rowIdx);
            },

            openModal: function(rowIdx = null) {
                // Reset Form
                document.querySelector('#modalJadwal form').reset();
                document.getElementById('modalJadwalTitle').innerText = "Tambah Jadwal KBM";
                const rowIndexInput = document.getElementById('jadwalRowIndex');
                
                if (rowIdx) {
                    // --- MODE EDIT ---
                    rowIndexInput.value = rowIdx;
                    document.getElementById('modalJadwalTitle').innerText = "Edit Jadwal KBM";

                    // Cari Data
                    const searchId = parseInt(rowIdx);
                    const item = this.rawData.find(d => parseInt(d.rowIndex) === searchId);

                    // Jika TIDAK DITEMUKAN
                    if (!item) {
                        console.warn("Data ID", searchId, "tidak ditemukan di rawData!");
                        alert("PERINGATAN: Data jadwal tidak ditemukan di memori.\n\nKemungkinan ada perubahan data (hapus/ubah) yang belum disinkronkan.\n\nSilakan refresh halaman (tekan F5) lalu coba lagi.");
                        return;
                    }

                    console.log("Data Edit Ditemukan:", item);

                    // Isi Form
                    const setVal = (id, val, defaultVal) => {
                        const el = document.getElementById(id);
                        if(el) el.value = val || defaultVal;
                        else console.warn("ID HTML tidak ditemukan:", id);
                    };

                    setVal('jadwalHari', item.hari, "Senin");
                    setVal('jadwalWaktu', item.waktu, "");
                    setVal('jadwalPengajar', item.pengajar, "MT");
                    setVal('jadwalJenjang', item.jenjang, "PAUD");
                    setVal('jadwalPelaksanaan', item.pelaksanaan, "Tatap Muka");
                    setVal('jadwalTempat', item.tempat, "Kelompok"); 

                } else {
                    // --- MODE TAMBAH ---
                    rowIndexInput.value = '';
                    document.getElementById('jadwalHari').value = "Senin";
                    document.getElementById('jadwalPengajar').value = "MT";
                    document.getElementById('jadwalJenjang').value = "PAUD";
                    document.getElementById('jadwalPelaksanaan').value = "Tatap Muka";
                    const elTempat = document.getElementById('jadwalTempat');
                    if(elTempat) elTempat.value = "Kelompok"; 
                }
                
                UI.openModal('modalJadwal');
            },

            saveForm: async function() {
                const payload = {
                    rowIndex: document.getElementById('jadwalRowIndex').value,
                    hari: document.getElementById('jadwalHari').value,
                    waktu: document.getElementById('jadwalWaktu').value,
                    pengajar: document.getElementById('jadwalPengajar').value,
                    jenjang: document.getElementById('jadwalJenjang').value,
                    pelaksanaan: document.getElementById('jadwalPelaksanaan').value,
                    kelompok: currentUser.lokasi,
                    desa: currentUser.desa
                };

                const elTempat = document.getElementById('jadwalTempat');
                if(elTempat) payload.tempat = elTempat.value;
                else payload.tempat = "Kelompok"; 

                UI.loader(true);
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveJadwal', payload }) });
                    
                    if((await res.json()).status === 'success') {
                        UI.toast('Jadwal berhasil disimpan');
                        UI.closeModal('modalJadwal');
                        this.init(); 
                    } else {
                        UI.toast('Gagal menyimpan jadwal', 'error');
                    }
                } catch(e) { UI.toast('Terjadi kesalahan sistem', 'error'); }
                finally { UI.loader(false); }
            },

            del: async function(idx) {
                if(!confirm('Hapus jadwal ini?')) return;
                UI.loader(true);
                try {
                    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteJadwal', rowIndex: idx }) });
                    this.init();
                } finally { UI.loader(false); }
            },

            downloadExcel: function() {
                if(!this.displayData || this.displayData.length === 0) {
                    return UI.toast('Tidak ada data jadwal untuk diunduh', 'error');
                }

                const cleanData = this.displayData.map(d => ({
                    Hari: d.hari,
                    Waktu: d.waktu,
                    Pengajar: d.pengajar,
                    Jenjang: d.jenjang,
                    Tempat: d.tempat,
                    Pelaksanaan: d.pelaksanaan,
                    Kelompok: d.kelompok,
                    Desa: d.desa
                }));

                const ws = XLSX.utils.json_to_sheet(cleanData);
                const wscols = [
                    {wch:15}, {wch:10}, {wch:20}, {wch:15}, {wch:20}, {wch:15}, {wch:20}, {wch:20}
                ];
                ws['!cols'] = wscols;

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Jadwal KBM");
                XLSX.writeFile(wb, `Jadwal_KBM_${currentUser.lokasi}_${new Date().toISOString().slice(0,10)}.xlsx`);
            }
        };
        // ==========================================
        // INIT APP
        // ==========================================
        window.onload = function() { Auth.init(); };
