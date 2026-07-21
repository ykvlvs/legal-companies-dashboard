const state = { data: null };
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const clean = (value) => String(value ?? "").trim();
const statusText = { ready:"Есть скриншот", error:"Ошибка скриншота", no_site:"Нет сайта", not_attempted:"Сайт есть, скриншот не запускался" };
const validUrl = (value) => /^https?:\/\//i.test(clean(value)) ? clean(value) : "";
const renderDigitalPositions = (value) => {
  const items = clean(value).split(/\r?\n/).map(clean).filter(Boolean);
  return items.length ? `<ul class="digital-positions">${items.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>` : "";
};
const renderScreenshotStatus = (status) => status === "ready" ? "" : `<span class="status ${status}">${statusText[status]}</span>`;

function renderStats(data){
  const stats = [[data.stats.companies,"компаний в базе"],[data.stats.sites,"официальных сайтов"],[data.stats.digitalCompanies,"основной digital-фокус"],[data.stats.screenshots,"скриншотов сохранено"],[data.stats.screenshotErrors,"ошибок скриншотов"],[data.stats.companiesWithScreenshots,"компаний с изображением"]];
  $("#stats").innerHTML = stats.map(([value,label])=>`<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("#generatedAt").textContent = `Обновлено: ${new Date(data.generatedAt).toLocaleString("ru-RU")}`;
}

function companyMatches(company){
  const search = clean($("#search").value).toLowerCase();
  const focus = $("#focus").value;
  const status = $("#status").value;
  const range = $("#range").value;
  const rating = $("#rating").value;
  const text = `${company.name} ${company.site} ${company.siteText}`.toLowerCase();
  if(search && !text.includes(search)) return false;
  if(focus && company.focus !== focus) return false;
  if(status && company.screenshotStatus !== status) return false;
  if(range && !company.screenshots.some(item => item.range === range)) return false;
  if(rating === "pravo" && !Number(company.pravoNominations)) return false;
  if(rating === "kommersant" && !Number(company.kommersantNominations)) return false;
  if(rating === "rbc" && !company.rbc) return false;
  return true;
}

function companyColumnCount(){
  if(window.innerWidth <= 620) return 1;
  if(window.innerWidth <= 1000) return 2;
  return 3;
}

function renderCompanies(){
  const data = state.data;
  const companies = data.companies.filter(companyMatches);
  $("#companyCount").textContent = `Показано: ${companies.length} из ${data.companies.length}`;
  if(!companies.length){ $("#companyGrid").innerHTML = `<div class="empty">По заданным фильтрам компании не найдены.</div>`; return; }
  const cards = companies.map(company => {
    const screenshot = company.screenshots.find(item => item.image);
    const siteUrl = validUrl(company.siteText) || validUrl(company.site);
    const rating = [`Право-300: ${company.pravoNominations || "—"}`,`Коммерсантъ: ${company.kommersantNominations || "—"}`].join(" · ");
    return `<article class="company-card"><div class="company-top"><span class="rank">#${company.rank}</span>${renderScreenshotStatus(company.screenshotStatus)}</div><h3>${esc(company.name)}</h3><div class="tags">${company.focus ? `<span class="tag">${esc(company.focus)}</span>` : ""}${company.rbc ? `<span class="tag">РБК</span>` : ""}</div><p>${esc(rating)}</p>${siteUrl ? `<p><a href="${esc(siteUrl)}" target="_blank" rel="noreferrer">Открыть сайт ↗</a></p>` : "<p>Официальный сайт не найден в базе.</p>"}<div class="card-bottom">${renderDigitalPositions(company.digitalPositions)}</div>${screenshot ? `<a href="${esc(screenshot.image)}" target="_blank"><img class="screenshot-thumb" src="${esc(screenshot.image)}" alt="Скриншот сайта ${esc(company.name)}" loading="lazy"></a>` : ""}</article>`;
  });
  const columns = Array.from({length:companyColumnCount()},()=>[]);
  cards.forEach((card,index)=>columns[index % columns.length].push(card));
  $("#companyGrid").innerHTML = columns.map(column=>`<div class="company-column">${column.join("")}</div>`).join("");
}

function renderRatings(data){
  const cards = [{title:"Право-300",text:`${data.companies.filter(c=>Number(c.pravoNominations)).length} компаний с позициями и группами`,url:"https://300.pravo.ru/"},{title:"Коммерсантъ",text:`${data.companies.filter(c=>Number(c.kommersantNominations)).length} компаний с опубликованными номинациями`,url:"https://www.kommersant.ru/doc/8572366"},{title:"РБК / ARG",text:`${data.companies.filter(c=>c.rbc).length} профилей в открытой части`,url:"https://marketing.rbc.ru/research/45100/"},{title:"Digital / IT",text:`${data.stats.digitalCompanies} компаний с основным digital-фокусом`,url:"#companies"}];
  $("#ratingCards").innerHTML = cards.map(card=>`<div class="rating-card"><h3>${card.title}</h3><p>${card.text}</p><a href="${card.url}" target="_blank" rel="noreferrer">Открыть раздел →</a></div>`).join("");
}

function renderGallery(data){
  const items = data.screenshots.filter(item=>item.image);
  $("#gallery").innerHTML = items.length ? items.map(item=>`<article class="gallery-card"><h3>#${item.rank} · ${esc(item.company)}</h3><p class="muted">${item.range} · <a href="${esc(item.url)}" target="_blank" rel="noreferrer">сайт</a></p><a href="${esc(item.image)}" target="_blank"><img src="${esc(item.image)}" alt="${esc(item.company)}" loading="lazy"></a></article>`).join("") : `<div class="empty">Скриншоты пока не собраны.</div>`;
}

function renderErrors(data){
  $("#errorList").innerHTML = data.errors.length ? data.errors.map(item=>`<article class="error-card"><strong>#${item.rank} · ${esc(item.company)}</strong><p><a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.url)}</a></p><p>${esc(item.error || "Сайт недоступен")}</p></article>`).join("") : `<div class="empty">Ошибок нет.</div>`;
}

function renderReports(data){
  $("#reportList").innerHTML = data.reports.map(item=>`<article class="report-card"><a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.title)} →</a></article>`).join("");
}

async function init(){
  try{
    state.data = await loadManifest();
    renderStats(state.data); renderCompanies(); renderRatings(state.data); renderGallery(state.data); renderErrors(state.data); renderReports(state.data);
    ["search","focus","status","range","rating"].forEach(id=>$("#"+id).addEventListener("input",renderCompanies));
    window.addEventListener("resize",renderCompanies);
  }catch(error){ document.querySelector("main").innerHTML = `<div class="empty">Не удалось загрузить manifest.json. Запустите локальный сервер из папки outputs: <code>python3 -m http.server 8000</code>.</div>`; console.error(error); }
}

async function loadManifest(){
  if(window.location.protocol !== "file:"){
    const response = await fetch("data/manifest.json");
    if(!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
    return response.json();
  }

  return new Promise((resolve, reject)=>{
    const request = new XMLHttpRequest();
    request.open("GET", new URL("data/manifest.json", window.location.href));
    request.onload = ()=>{
      if(request.status === 0 || (request.status >= 200 && request.status < 300)){
        try{ resolve(JSON.parse(request.responseText)); }catch(error){ reject(error); }
      }else reject(new Error(`Manifest request failed: ${request.status}`));
    };
    request.onerror = ()=>reject(new Error("Manifest is unavailable when opening the file directly"));
    request.send();
  });
}

init();
