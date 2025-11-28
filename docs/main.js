// main.js - OBLIT Docs Engine v1.1 (Modular JSON Fix)

// =========================================================================
// 1. GLOBAL STATE
// =========================================================================
let VERSIONS_DATA = [];
let NEWS_DATA = [];
let MENU_DATA = { en: [], tr: [] };

let currentLang = localStorage.getItem('oblit_lang') || 'en';
let currentTheme = localStorage.getItem('oblit_theme') || 'dark';
let currentPageId = 'introduction';

// =========================================================================
// 2. INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Temayı ve Dili uygula (Sayfa render edilmeden)
        applyTheme(currentTheme);
        applyLang(currentLang);

        // 2. Kritik Verileri Yükle (Menu, Versions, News)
        await loadInitialData();

        // 3. URL'den gidilecek sayfayı bul
        let hash = window.location.hash.substring(1);
        const allPageIds = getAllPageIds();
        
        // Geçerli bir sayfa mı veya özel sayfa mı?
        if (allPageIds.includes(hash) || hash === 'news') {
            currentPageId = hash;
        } else {
            currentPageId = 'introduction';
        }

        // 4. Arayüzü Çiz
        renderSidebar();
        await loadPage(currentPageId);
        
        // 5. Event Dinleyicilerini Başlat
        setupEventListeners();

    } catch (err) {
        console.error("Init Error:", err);
        document.body.innerHTML = `<div style="color:#ef4444; padding:40px; text-align:center; font-family:sans-serif;">
            <h1>System Error</h1>
            <p>${err.message}</p>
            <p style="opacity:0.7; font-size:0.9em;">Make sure you are running this via a local server (e.g. python -m http.server)</p>
        </div>`;
    }
});

async function loadInitialData() {
    try {
        // JSON dosyalarını 'content' klasöründen çekiyoruz
        // Cache-busting: URL'ye timestamp ekle, böylece tarayıcı her zaman yeni dosyayı çeker
        const cacheBuster = `?v=${Date.now()}`;
        const [menuRes, verRes, newsRes] = await Promise.all([
            fetch(`./content/menu.json${cacheBuster}`),
            fetch(`./content/versions.json${cacheBuster}`),
            fetch(`./content/news.json${cacheBuster}`)
        ]);

        if (!menuRes.ok) throw new Error('Failed to load menu.json');
        if (!verRes.ok) throw new Error('Failed to load versions.json');
        if (!newsRes.ok) {
            console.warn('Failed to load news.json, initializing empty array');
            NEWS_DATA = [];
        } else {
            NEWS_DATA = await newsRes.json();
            // News dizisini sırala (eğer dizi ise)
            if (Array.isArray(NEWS_DATA)) {
                NEWS_DATA.sort((a, b) => new Date(b.date) - new Date(a.date));
            }
        }

        MENU_DATA = await menuRes.json();
        VERSIONS_DATA = await verRes.json();

        // Tarihe göre sırala (En yeni en üstte)
        if (Array.isArray(VERSIONS_DATA)) {
            VERSIONS_DATA.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    } catch (err) {
        console.error('Error loading initial data:', err);
        // Initialize with empty defaults to prevent crashes
        if (!MENU_DATA) MENU_DATA = { en: [], tr: [] };
        if (!VERSIONS_DATA) VERSIONS_DATA = [];
        if (!NEWS_DATA) NEWS_DATA = [];
        throw err; // Re-throw so initialization knows it failed
    }
}

function getAllPageIds() {
    const menu = currentLang === 'en' ? MENU_DATA.en : MENU_DATA.tr;
    if (!menu) return [];
    return menu.flatMap(g => g.items.map(i => i.id));
}

function setupEventListeners() {
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1);
        if (hash && hash !== currentPageId) loadPage(hash);
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        setSearchPlaceholder();
        searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    }
}

// =========================================================================
// 3. PAGE RENDERER (Dinamik İçerik Yükleyici)
// =========================================================================
async function loadPage(id) {
    currentPageId = id;
    window.location.hash = id;

    // Menüdeki aktif sınıfı güncelle
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${id}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    const container = document.getElementById('main-area');
    container.style.opacity = 0;
    
    await new Promise(r => setTimeout(r, 150));

    try {
        // SABİT SAYFALAR
        if (id === 'news') {
            renderNewsLayout(container);
        } 
        else if (id === 'benchmark') {
            // Benchmark sayfası özel içeriğini göster
            const res = await fetch(`./content/${id}.json?v=${Date.now()}`);
            if (!res.ok) throw new Error(`Content file '${id}.json' not found.`);
            const pageData = await res.json();
            const rawContent = pageData[currentLang] || pageData['en'];
            container.innerHTML = parseSyntax(rawContent);
            initBenchmark();
        }
        // DİNAMİK SAYFALAR (JSON'dan çek)
        else {
            const res = await fetch(`./content/${id}.json?v=${Date.now()}`);
            if (!res.ok) {
                throw new Error(`Content file '${id}.json' not found.`);
            }
            const pageData = await res.json();
            const rawContent = pageData[currentLang] || pageData['en'];
            container.innerHTML = parseSyntax(rawContent);
        }
    } catch (err) {
        console.warn("Page Load Warning:", err);
        const isEn = currentLang === 'en';
        container.innerHTML = `<h1>404</h1><p>${isEn ? 'Page content not found.' : 'Sayfa içeriği bulunamadı.'}</p>`;
    }

    container.style.opacity = 1;
    window.scrollTo(0, 0);
    if (window.Prism) Prism.highlightAll();
}

// =========================================================================
// 4. NEWS & CHANGELOG LAYOUT
// =========================================================================
function renderNewsLayout(container) {
    const isEn = currentLang === 'en';
    
    // Haber verisini hazırla
    let listToRender = [];
    if (!NEWS_DATA) {
        console.error('NEWS_DATA is not loaded yet');
        container.innerHTML = `<h1>${isEn ? 'News & Changelog' : 'Haberler & Sürümler'}</h1><p>${isEn ? 'Loading news...' : 'Haberler yükleniyor...'}</p>`;
        return;
    }
    
    if (Array.isArray(NEWS_DATA)) {
        listToRender = NEWS_DATA;
    } else {
        // Eğer dil bazlı obje ise
        listToRender = NEWS_DATA[currentLang] || NEWS_DATA['en'] || [];
        if (Array.isArray(listToRender)) {
            listToRender.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    }

    // Haberleri HTML'e çevir
    let newsHtml = "";
    if (!Array.isArray(listToRender) || listToRender.length === 0) {
        newsHtml = `<p style="opacity:0.6">${isEn ? 'No news available.' : 'Haber bulunamadı.'}</p>`;
    } else {
        try {
            newsHtml = listToRender.map(post => {
                if (!post) return '';
                const avatarUrl = post.author_github ? `https://github.com/${post.author_github}.png` : 'https://github.com/github.png';
                let descriptionText = '';
                if (typeof post.description === 'object' && post.description !== null) {
                    const desc = post.description[currentLang] || post.description['en'] || '';
                    descriptionText = typeof desc === 'string' ? desc : String(desc || '');
                } else if (typeof post.description === 'string') {
                    descriptionText = post.description;
                } else {
                    descriptionText = '';
                }
                
                // Ensure descriptionText is always a string (final safety check)
                if (typeof descriptionText !== 'string') {
                    descriptionText = String(descriptionText || '');
                }
                
                return `
                <div class="news-feed-card">
                    <div class="news-avatar">
                        <a href="https://github.com/${post.author_github || 'github'}" target="_blank">
                            <img src="${avatarUrl}" alt="${post.author || 'Author'}">
                        </a>
                    </div>
                    <div class="news-content">
                        <div class="news-content-header" style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong class="news-author" style="color:var(--primary)">${post.author || 'Unknown'}</strong>
                            <span class="news-post-date" style="opacity:0.6; font-size:0.8rem;">${post.date || ''}</span>
                        </div>
                        <div class="news-body">${parseSyntax(descriptionText)}</div>
                    </div>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Error rendering news:', err);
            newsHtml = `<p style="opacity:0.6; color:var(--text);">${isEn ? 'Error loading news.' : 'Haberler yüklenirken hata oluştu.'}</p>`;
        }
    }

    // Sağ taraftaki sürüm listesi
    let versionsHtml = "";
    if (Array.isArray(VERSIONS_DATA)) {
            versionsHtml = VERSIONS_DATA.map(v => 
                `<a href="#version-${v.version}" style="display:block; padding:5px 0; border-bottom:1px dashed var(--border); font-size:0.9rem;">
                    <span style="font-weight:bold;">${formatVersion(v.version)}</span> - ${v.tag || v.type}
                </a>`
            ).join('');
    }

    // Detaylı Changelog Kartları
    let changelogHtml = "";
    if (Array.isArray(VERSIONS_DATA)) {
        changelogHtml = renderVersionCards(VERSIONS_DATA, true);
    }

    container.innerHTML = `
        <h1>${isEn ? 'News & Changelog' : 'Haberler & Sürümler'}</h1>
        <div class="news-layout">
            <div class="news-main-column">
                <h2>${isEn ? 'Announcements' : 'Duyurular'}</h2>
                ${newsHtml}
                <hr style="margin: 2.5rem 0;">
                <h2>${isEn ? 'Detailed Changelog' : 'Detaylı Sürüm Notları'}</h2>
                ${changelogHtml}
            </div>
        </div>
    `;
}

// Helper function to format version numbers (v1.0.0 -> v1, v0.1.0 -> v0.1)
function formatVersion(version) {
    if (!version || typeof version !== 'string') return version || '';
    // Remove 'v' prefix if exists
    const withoutV = version.replace(/^v/i, '');
    const parts = withoutV.split('.');
    // If patch is 0, show only major.minor, if both minor and patch are 0, show only major
    if (parts.length >= 3) {
        const major = parts[0] || '0';
        const minor = parts[1] || '0';
        const patch = parts[2] || '0';
        if (patch === '0' && minor === '0') {
            return `v${major}`;
        } else if (patch === '0') {
            return `v${major}.${minor}`;
        }
    }
    return version;
}

function renderVersionCards(versionList, isEmbedded = false) {
    const isEn = currentLang === 'en';
    const tagClasses = { LATEST: "tag-latest", STABLE: "tag-stable", DEPRECATED: "tag-deprecated" };
    
    if (!versionList || versionList.length === 0) return '';

    return versionList.map(v => {
        // Benchmark bilgisi
        let benchmarkHtml = '';
        if (v.benchmark) {
            const savings = v.benchmark.std && v.benchmark.oblit 
                ? Math.round((1 - v.benchmark.oblit / v.benchmark.std) * 100) 
                : 0;
            benchmarkHtml = `
                <div style="background:var(--box-tip-bg); padding:15px; border-radius:8px; margin:20px 0; border-left:4px solid #22c55e;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <strong style="color:#22c55e; font-size:0.9rem; text-transform:uppercase; letter-spacing:1px;">${isEn ? 'Performance' : 'Performans'}</strong>
                            <div style="margin-top:5px; font-size:1.1rem; font-weight:bold; color:var(--text-head);">
                                ${savings}% ${isEn ? 'Bandwidth Savings' : 'Bant Genişliği Tasarrufu'}
                            </div>
                        </div>
                        <div style="text-align:right; font-size:0.85rem; opacity:0.8;">
                            <div>${isEn ? 'Standard' : 'Standart'}: ${v.benchmark.std}KB</div>
                            <div><strong>OBLIT:</strong> ${v.benchmark.oblit}KB</div>
                            <div style="margin-top:3px; font-size:0.75rem;">${v.benchmark.mode || ''}</div>
                        </div>
                    </div>
                </div>`;
        }
        
        // Changes HTML - daha güzel formatlanmış
        let changesHtml = '';
        if (v.changes) {
            const sectionLabels = {
                added: { en: '✨ Added', tr: '✨ Eklendi', icon: '✨', color: '#22c55e' },
                fixed: { en: '🔧 Fixed', tr: '🔧 Düzeltildi', icon: '🔧', color: '#3b82f6' },
                changed: { en: '🔄 Changed', tr: '🔄 Değiştirildi', icon: '🔄', color: '#f97316' },
                removed: { en: '🗑️ Removed', tr: '🗑️ Kaldırıldı', icon: '🗑️', color: '#ef4444' },
                milestone: { en: '🏆 Milestone', tr: '🏆 Dönüm Noktası', icon: '🏆', color: '#8b5cf6' }
            };
            
            changesHtml = '<div style="margin-top:25px;">';
            for (const [tag, config] of Object.entries(sectionLabels)) {
                if (v.changes[tag] && Array.isArray(v.changes[tag]) && v.changes[tag].length > 0) {
                    const label = isEn ? config.en : config.tr;
                    changesHtml += `
                        <div style="margin-bottom:20px;">
                            <h4 style="color:${config.color}; font-size:0.9rem; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                                <span>${config.icon}</span>
                                <span>${label}</span>
                            </h4>
                            <div style="display:grid; gap:10px;">
                                ${v.changes[tag].map(change => {
                                    // Markdown bold (**text**) ve emojileri parse et
                                    const formattedChange = formatText(change || '');
                                    return `
                                        <div style="background:var(--sidebar); padding:12px 15px; border-radius:6px; border-left:3px solid ${config.color}; display:flex; align-items:flex-start; gap:10px;">
                                            <span style="color:${config.color}; font-size:1.2em; flex-shrink:0;">•</span>
                                            <div style="flex:1; line-height:1.6; color:var(--text);">${formattedChange}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }
            }
            changesHtml += '</div>';
        }
        
        const authorHtml = v.author ? `
            <div style="margin-top:20px; padding-top:15px; border-top:1px solid var(--border); display:flex; align-items:center; gap:8px; font-size:0.85rem; opacity:0.8;">
                <strong>${isEn ? 'Released by' : 'Yayınlayan'}:</strong>
                <a href="https://github.com/${v.author_github || 'github'}" target="_blank" style="color:var(--primary); text-decoration:none;">
                    ${v.author}
                </a>
            </div>
        ` : '';
        
        const tagHtml = v.tag ? `<span class="ver-tag ${tagClasses[v.tag] || ''}" style="margin-left:10px;">${v.tag}</span>` : '';
        const cardId = isEmbedded ? `id="version-${v.version}"` : "";
        const typeLabel = v.type ? `<span style="background:var(--sidebar); padding:4px 10px; border-radius:4px; font-size:0.75rem; text-transform:uppercase; color:var(--text);">${v.type}</span>` : '';

        return `
        <div ${cardId} class="news-card" style="scroll-margin-top: 20px; margin-bottom:30px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <span class="news-version" style="font-size:1.3rem; font-weight:800;">${formatVersion(v.version)}</span>
                    ${tagHtml}
                    ${typeLabel}
                </div>
                <span class="news-date" style="font-family:monospace; opacity:0.7;">${v.date}</span>
            </div>
            
            <h3 class="news-title" style="margin-bottom:15px; font-size:1.5rem; line-height:1.3;">${v.title || ''}</h3>
            
            <div style="margin-bottom:20px; opacity:0.85; line-height:1.7; color:var(--text);">
                ${parseSyntax(v.description || '')}
            </div>
            
            ${benchmarkHtml}
            ${changesHtml}
            ${authorHtml}
        </div>`;
    }).join('');
}

// =========================================================================
// 5. INTERACTIVE BENCHMARK
// =========================================================================
// --- BENCHMARK INTERACTIVE SUITE (FIXED) ---

function initBenchmark() {
    const container = document.getElementById('benchmark-interactive');
    if (!container) return;

    // Veri yoksa hata göster
    if (!VERSIONS_DATA || VERSIONS_DATA.length === 0) {
        container.innerHTML = `<div style="padding:20px; color:red;">Benchmark verisi yüklenemedi.</div>`;
        return;
    }

    // Benchmark verisi olan en yeni sürümü bul
    // (Her sürümde benchmark olmayabilir, filtreliyoruz)
    const latestBenchVer = VERSIONS_DATA.find(v => v.benchmark);
    
    // Varsayılan Başlık (Eğer veri varsa sürüm adı, yoksa N/A)
    const defaultTitle = latestBenchVer ? `${formatVersion(latestBenchVer.version)} (${latestBenchVer.tag || latestBenchVer.type})` : "Veri Yok";
    const defaultDate = latestBenchVer ? `(${latestBenchVer.date})` : "";

    // HTML İskeleti (Varsayılan değerleri direkt içine gömdük, titreme yapmaz)
    container.innerHTML = `
        <div class="bench-tool">
            <div class="bench-controls">
                <button id="versionSelectBtn" title="Sürüm Değiştir">
                    <span id="selectedVersionText">${defaultTitle}</span>
                    <i class='bx bx-chevron-down'></i>
                </button>
                <span id="benchDate" style="font-family:'monospace'; opacity:0.7; margin-left:auto;">${defaultDate}</span>
            </div>
            <div class="bench-content">
                <div class="bench-table-container" id="benchTableContainer"></div>
                <div class="bench-result-container" id="benchResultContainer"></div>
            </div>
        </div>
        
        <!-- MODAL (GİZLİ) -->
        <div class="modal-overlay" id="versionModal">
            <div class="modal-content">
                <input type="text" id="modalVersionSearch" class="modal-search" placeholder="Sürüm ara...">
                <div class="modal-list" id="modalVersionList"></div>
            </div>
        </div>
    `;

    // Event Listener'lar
    const btn = document.getElementById('versionSelectBtn');
    const modal = document.getElementById('versionModal');
    const search = document.getElementById('modalVersionSearch');

    btn.onclick = (e) => { e.stopPropagation(); openVersionModal(); };
    
    // Modalı kapatma mantığı
    window.addEventListener('click', (e) => {
        if (modal.classList.contains('show') && !modal.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            modal.classList.remove('show');
        }
    });

    search.oninput = (e) => renderModalVersionList(e.target.value);

    // Eğer veri varsa, tabloyu ve sonucu hemen çiz!
    if (latestBenchVer) {
        updateBenchmark(latestBenchVer.version);
    }
}

function openVersionModal() {
    const modal = document.getElementById('versionModal');
    if(!modal) return;
    modal.classList.add('show');
    renderModalVersionList(); // Listeyi tazele
    setTimeout(() => document.getElementById('modalVersionSearch').focus(), 100);
}

function renderModalVersionList(filter = '') {
    const list = document.getElementById('modalVersionList');
    if (!list) return;
    
    // SADECE Benchmark verisi olanları listele (Boşları gösterme)
    const data = VERSIONS_DATA.filter(v => 
        v.benchmark && 
        (v.version.toLowerCase().includes(filter.toLowerCase()) || 
         (v.tag && v.tag.toLowerCase().includes(filter.toLowerCase())))
    );

    list.innerHTML = '';
    if (data.length === 0) {
        list.innerHTML = `<div style="padding:15px; text-align:center; opacity:0.6;">Sonuç yok</div>`;
        return;
    }

    data.forEach(v => {
        const item = document.createElement('div');
        item.className = 'modal-item';
        item.innerHTML = `
            <span style="font-weight:bold; font-size:1rem;">${formatVersion(v.version)}</span> 
            <span class="type" style="background:rgba(120,120,120,0.2); padding:2px 6px; border-radius:4px;">${v.tag || v.type}</span>
        `;
        item.onclick = () => {
            updateBenchmark(v.version); // Seçilen sürümü yükle
            document.getElementById('versionModal').classList.remove('show'); // Modalı kapat
        };
        list.appendChild(item);
    });
}

// EN ÖNEMLİ KISIM: HESAPLAMA VE ÇİZME
window.updateBenchmark = function(ver) {
    const versionData = VERSIONS_DATA.find(d => d.version === ver);
    
    if (!versionData || !versionData.benchmark) return;

    const d = versionData.benchmark;
    const isEn = currentLang === 'en';
    
    // HESAPLAMA: (1 - (Oblit / Std)) * 100
    const saving = ((1 - (d.oblit / d.std)) * 100).toFixed(1);

    // Buton metnini güncelle
    const btnText = document.getElementById('selectedVersionText');
    if(btnText) btnText.innerText = `${formatVersion(ver)} (${versionData.tag || versionData.type})`;
    
    const dateText = document.getElementById('benchDate');
    if(dateText) dateText.innerText = `(${versionData.date})`;

    // Tabloyu Çiz
    const table = document.getElementById('benchTableContainer');
    if (table) {
        table.innerHTML = `
        <div class="table-wrapper" style="margin:0;">
            <table style="margin:0; width:100%;">
                <thead>
                    <tr>
                        <th>${isEn?'Metric':'Metrik'}</th>
                        <th>Standard JSON</th>
                        <th style="color:var(--primary);">🛡️ OBLIT (${versionData.mode})</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>${isEn?'Data Transfer':'Veri Transferi'}</strong></td>
                        <td>${d.std} KB</td>
                        <td style="font-weight:bold;">${d.oblit} KB</td>
                    </tr>
                    <tr>
                        <td><strong>${isEn?'Packet Mode':'Paket Modu'}</strong></td>
                        <td>Text String</td>
                        <td>${versionData.mode || 'Binary'}</td>
                    </tr>
                </tbody>
            </table>
        </div>`;
    }

    // Sonuç Kutusunu Çiz (% Tasarruf)
    const resBox = document.getElementById('benchResultContainer');
    if (resBox) {
        // %50'den büyükse yeşil, küçükse turuncu
        const bg = saving > 50 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)';
        
        resBox.innerHTML = `
            <div class="bench-result-box" style="background:${bg}; padding:25px; border-radius:12px; color:white; text-align:center; box-shadow:0 10px 20px rgba(0,0,0,0.15);">
                <div style="opacity:0.9; text-transform:uppercase; font-size:0.85rem; font-weight:600; letter-spacing:1px;">
                    ${isEn?'Bandwidth Savings':'Bant Genişliği Tasarrufu'}
                </div>
                <div style="font-size:3.5rem; font-weight:900; line-height:1.2; margin:10px 0;">
                    %${saving}
                </div>
                <div style="font-size:1rem; opacity:0.9;">
                    ${isEn ? 'Less Data Used' : 'Daha Az Veri Kullanımı'}
                </div>
            </div>`;
    }
};

// =========================================================================
// 6. SIDEBAR & UI
// =========================================================================
function renderSidebar(menuData = null) {
    const menuContainer = document.getElementById('sidebar-nav');
    if (!menuContainer) return;
    menuContainer.innerHTML = "";
    
    let dataToRender = menuData;
    if (!dataToRender) {
        dataToRender = currentLang === 'en' ? MENU_DATA.en : MENU_DATA.tr;
    }
    
    if (!dataToRender || dataToRender.length === 0) {
        menuContainer.innerHTML = `<div style="padding:20px;text-align:center;">Loading...</div>`;
        return;
    }

    dataToRender.forEach(group => {
        const header = document.createElement('div');
        header.className = 'cat-header';
        header.innerText = group.category;
        menuContainer.appendChild(header);

        group.items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'nav-item';
            btn.id = `nav-${item.id}`;
            const badge = item.isContentMatch ? `<span class="match-badge">${currentLang==='en'?'Found':'Bulundu'}</span>` : '';
            btn.innerHTML = `<span>${item.title}</span>${badge}`;
            btn.onclick = () => loadPage(item.id);
            if (item.id === currentPageId) btn.classList.add('active');
            menuContainer.appendChild(btn);
        });
    });
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    localStorage.setItem('oblit_theme', currentTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    if (theme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        if(icon) icon.className = 'bx bx-sun';
    } else {
        body.removeAttribute('data-theme');
        if(icon) icon.className = 'bx bx-moon';
    }
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'tr' : 'en';
    applyLang(currentLang);
    localStorage.setItem('oblit_lang', currentLang);
    // Veri değiştiği için Sidebar ve İçeriği yenile
    renderSidebar();
    loadPage(currentPageId);
    setSearchPlaceholder();
}

function applyLang(lang) {
    const display = document.getElementById('lang-display');
    if(display) display.innerText = lang.toUpperCase();
}

function setSearchPlaceholder() {
    const input = document.getElementById('searchInput');
    if(input) input.placeholder = currentLang === 'en' ? "Search docs..." : "Ara...";
}

// =========================================================================
// 7. SEARCH & PARSER
// =========================================================================
async function handleSearch(query) {
    const term = query.toLowerCase().trim();
    if (!term) { renderSidebar(); return; }
    
    const menu = currentLang === 'en' ? MENU_DATA.en : MENU_DATA.tr;
    if (!menu) return;

    // İçeriklerin hepsini tara
    const searchPromises = menu.flatMap(g => g.items.map(async i => {
        try { 
            const r = await fetch(`./content/${i.id}.json?v=${Date.now()}`); 
            const d = await r.json(); 
            const content = (d[currentLang] || d.en || '').toLowerCase();
            return { 
                item: i, 
                // Başlıkta VEYA içerikte eşleşme var mı?
                match: i.title.toLowerCase().includes(term) || content.includes(term) 
            };
        } catch { return null; }
    }));
    
    const resultsRaw = (await Promise.all(searchPromises)).filter(x => x && x.match);
    
    // Menü yapısına geri çevir
    const results = [];
    menu.forEach(group => {
        const matchingItems = [];
        group.items.forEach(item => {
            const hit = resultsRaw.find(x => x.item.id === item.id);
            if (hit) {
                // Eğer başlıkta yoksa ama içerikte varsa "Found" etiketi koy
                const isContentOnly = !item.title.toLowerCase().includes(term);
                matchingItems.push({ ...item, isContentMatch: isContentOnly });
            }
        });
        if (matchingItems.length > 0) results.push({ category: group.category, items: matchingItems });
    });
    
    renderSidebar(results);
}

function parseSyntax(text) {
    // Ensure text is always a string
    if (!text && text !== '') return "";
    if (typeof text !== 'string') {
        text = String(text || '');
    }
    let html = text;
    // Kod Blokları
    html = html.replace(/!\[code\]\(([\s\S]*?)\)\s*!\+\+\/\//g, (m, c) => createCodeBlock(c, true));
    html = html.replace(/!\[code\]\(([\s\S]*?)\)\s*!\+\+/g, (m, c) => createCodeBlock(c, false));
    
    // Uyarı Kutuları
    html = html.replace(/!\[(info|warn|dang|tip|update)\]\(([\s\S]*?)\)\s*!\+\+/g, (m, type, c) => {
        const titles = currentLang === 'en' ? { info: 'INFO', warn: 'WARNING', dang: 'DANGER', tip: 'PRO TIP', update: 'UPDATE' } : { info: 'BİLGİ', warn: 'UYARI', dang: 'TEHLİKE', tip: 'İPUCU', update: 'GÜNCELLEME' };
        return `<div class="box box-${type}"><strong>${titles[type] || type.toUpperCase()}</strong><p>${formatText(c.trim())}</p></div>`;
    });
    
    // Başlıklar
    html = html.replace(/h1\((.+)\)/g, '<h1>$1</h1>');
    html = html.replace(/h2\((.+)\)/g, '<h2>$1</h2>');
    html = html.replace(/h3\((.+)\)/g, '<h3>$1</h3>');
    html = html.replace(/!\(line\)/g, '<hr>');

    return formatText(html);
}

function formatText(text) {
    if (!text) return "";
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
}

function createCodeBlock(code, hasCopy) {
    const clean = code.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const copyButton = hasCopy ? `<button class="copy-btn" onclick="copyCode(this)">Copy</button>` : '';
    return `<div class="code-wrapper">${copyButton}<pre><code class="language-javascript">${clean}</code></pre></div>`;
}

window.copyCode = function(btn) {
    const code = btn.nextElementSibling.innerText;
    navigator.clipboard.writeText(code);
    const old = btn.innerText;
    btn.innerText = "Copied!";
    setTimeout(() => { if(btn) btn.innerText = old; }, 2000);
};

window.toggleTheme = toggleTheme;
window.toggleLanguage = toggleLanguage;
