const MESSAGES = [
  { text: "Make it strange, then make it yours.", credit: "A note to self" },
  { text: "Your ideas deserve room to bloom.", credit: "A note to self" },
  { text: "Softness can still take up space.", credit: "A note to self" },
  { text: "Tiny steps are still movement.", credit: "A note to self" },
  { text: "You are allowed to begin again.", credit: "A note to self" },
  { text: "I am no bird; and no net ensnares me.", credit: "Charlotte Brontë · Jane Eyre" },
  { text: "Forever is composed of nows.", credit: "Emily Dickinson" },
  { text: "I’m not afraid of storms, for I’m learning how to sail my ship.", credit: "Louisa May Alcott · Little Women" },
];

const SPECIMENS = {
  accents: { text: "ação · coração · manhã · café · você · avó · útil · bênção · São João", credit: "Portuguese accents and diacritics" },
  characters: { text: "Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz 0123456789", credit: "Uppercase, lowercase, and numerals" },
  stress: { text: "AVATAR ffi fl €42 — ‘Olá!’ & R$ 19,90 @ 100% / Nº 27…", credit: "Ligatures, pairs, punctuation, currencies, and symbols" },
};

const VIBES = {
  any: { label: "Anything goes", test: () => true },
  clean: { label: "Keeping it clean", test: f => /regular|book|medium|light/i.test(f.style) && !/script|goth|horror|distort|crazy|decor|shadow|outline/i.test(f.name) },
  loud: { label: "Big and loud", test: f => /bold|black|heavy|outline|shadow|display|poster|block|fat/i.test(`${f.style} ${f.name}`) },
  fancy: { label: "Feeling fancy", test: f => /italic|script|callig|elegant|chancery|wedding|swash|ornament/i.test(`${f.style} ${f.name}`) },
  weird: { label: "Beautifully weird", test: f => /alien|horror|crazy|weird|distort|grunge|blood|monster|zombie|freak|skull|punk/i.test(f.name) },
  retro: { label: "A little time travel", test: f => /retro|vintage|deco|disco|western|old|groovy|70|80|classic|antique/i.test(f.name) },
  techy: { label: "Future-ish", test: f => /tech|digital|computer|pixel|cyber|space|square|grid|robot|mono|sci|system/i.test(f.name) },
  handwritten: { label: "Made by hand", test: f => /hand|script|brush|pen|marker|signature|cursive|scrib|writing|sketch|chalk/i.test(f.name) },
};

const RATING_LABELS = ["Pass", "Maybe", "Nice", "Love", "Top tier"];
const RATING_SYMBOLS = ["×", "·", "+", "♥", "★"];
const STOP_WORDS = new Set(["font","type","regular","bold","italic","black","light","medium","heavy","condensed","expanded","outline","shadow","the","and","demo","brk","plain"]);

const state = {
  fonts: [], pool: [], results: [], current: null, vibe: "any", screen: "play",
  sample: MESSAGES[0].text, messageIndex: 0, previewMode: "message", search: "", page: 1,
  layout: "grid", sortMode: "smart", qualityFilter: "", tagFilter: "", tagTarget: null,
  faces: new Map(), featureCache: new Map(), familyMap: new Map(), profile: { weights: new Map(), signals: 0 },
  ratingActions: [],
  favorites: new Set(JSON.parse(localStorage.getItem("font-cabinet-favorites") || "[]")),
  tags: JSON.parse(localStorage.getItem("font-party-tags") || "{}"),
  ratings: JSON.parse(localStorage.getItem("font-party-ratings") || "{}"),
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const el = {
  stats: $("#stats"), sample: $("#sample"), messageCredit: $("#messageCredit"), vibeLabel: $("#vibeLabel"),
  playCount: $("#playCount"), spotlight: $("#spotlight"), heroPreview: $("#heroPreview"),
  currentName: $("#currentName"), currentStyle: $("#currentStyle"), currentDownload: $("#currentDownload"),
  recommendationReason: $("#recommendationReason"), coverageBadges: $("#coverageBadges"),
  familySummary: $("#familySummary"), familyVariants: $("#familyVariants"), currentTags: $("#currentTags"),
  inlineTagInput: $("#inlineTagInput"), learningStatus: $("#learningStatus"), learningMeter: $("#learningMeter"),
  undoRating: $("#undoRating"), favoriteCount: $("#favoriteCount"), picksGrid: $("#picksGrid"),
  picksEmpty: $("#picksEmpty"), libraryGrid: $("#libraryGrid"), libraryEmpty: $("#libraryEmpty"),
  resultCount: $("#resultCount"), search: $("#search"), clearSearch: $("#clearSearch"),
  pagination: $("#pagination"), tagFilters: $("#tagFilters"), sortMode: $("#sortMode"),
  qualityFilter: $("#qualityFilter"), knownTags: $("#knownTags"), infoDialog: $("#infoDialog"),
  tagDialog: $("#tagDialog"), tagDialogTitle: $("#tagDialogTitle"), dialogTags: $("#dialogTags"),
  dialogTagInput: $("#dialogTagInput"), knownTagButtons: $("#knownTagButtons"), toast: $("#toast"),
};

const escapeHtml = value => String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const tagsFor = id => state.tags[String(id)] || [];
const allTags = () => [...new Set(Object.values(state.tags).flat())].sort((a,b) => a.localeCompare(b));
const normalizeTag = value => value.trim().toLocaleLowerCase().replace(/\s+/g, " ").slice(0,24);
const explicitRating = id => Object.hasOwn(state.ratings, String(id)) ? Number(state.ratings[String(id)]) : null;
const effectiveRating = id => explicitRating(id) ?? (state.favorites.has(id) ? 3 : null);

async function start() {
  try {
    const response = await fetch("/api/fonts");
    if (!response.ok) throw new Error();
    const data = await response.json();
    state.fonts = data.fonts;
    state.results = data.fonts;
    for (const font of state.fonts) {
      const key = font.family.toLocaleLowerCase();
      if (!state.familyMap.has(key)) state.familyMap.set(key, []);
      state.familyMap.get(key).push(font);
    }
    rebuildProfile();
    el.stats.textContent = `${data.stats.total.toLocaleString()} fonts, read directly from your ${data.stats.sourceType}. Ratings train a private sorter in this browser.`;
    updateBestCount();
    updateLearningStatus();
    refreshTagUI();
    chooseVibe("any");
  } catch (_) {
    el.stats.textContent = "The font folder is closed. Start server.py, then refresh.";
    el.currentName.textContent = "Couldn’t open the collection";
  }
}

function featuresFor(font) {
  if (state.featureCache.has(font.id)) return state.featureCache.get(font.id);
  const features = new Set([`style:${font.style.toLocaleLowerCase()}`]);
  font.style.toLocaleLowerCase().split(/\W+/).filter(Boolean).forEach(word => features.add(`styleword:${word}`));
  const tokens = `${font.name} ${font.family}`.toLocaleLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(word => word.length > 2 && !STOP_WORDS.has(word));
  [...new Set(tokens)].slice(0,6).forEach(word => features.add(`name:${word}`));
  if (font.familySize > 1) features.add(`family:${font.family.toLocaleLowerCase()}`);
  Object.entries(VIBES).forEach(([key,value]) => { if (key !== "any" && value.test(font)) features.add(`vibe:${key}`); });
  if (font.coverage?.portuguese) features.add("coverage:portuguese");
  if (font.coverage?.extended) features.add("coverage:extended");
  if (font.coverage?.punctuation) features.add("coverage:punctuation");
  if (font.hasBold && font.hasItalic) features.add("family:bold-italic");
  if (font.hasBoldItalic && font.familySize >= 4) features.add("family:complete");
  tagsFor(font.id).forEach(tag => features.add(`tag:${tag}`));
  const list = [...features];
  state.featureCache.set(font.id,list);
  return list;
}

function rebuildProfile() {
  const weights = new Map();
  const signals = new Map(Object.entries(state.ratings).map(([id,rating]) => [Number(id),Number(rating)]));
  state.favorites.forEach(id => { if (!signals.has(id)) signals.set(id,3); });
  const coefficients = [-2,-.7,.35,1.45,2.6];
  for (const [id,rating] of signals) {
    const font = state.fonts[id];
    if (!font) continue;
    for (const feature of featuresFor(font)) weights.set(feature,(weights.get(feature)||0)+coefficients[rating]);
  }
  state.profile = { weights, signals: signals.size };
}

function tasteScore(font) {
  if (!state.profile.signals) return 0;
  const features = featuresFor(font);
  return features.reduce((sum,feature) => sum+(state.profile.weights.get(feature)||0),0) / Math.sqrt(features.length || 1);
}

function featureLabel(feature) {
  const [type,value] = feature.split(":");
  if (type === "style") return `${value} styles`;
  if (type === "styleword") return `${value} details`;
  if (type === "vibe") return `${value} fonts`;
  if (type === "name") return `“${value}” families`;
  if (feature === "coverage:portuguese") return "complete Portuguese accents";
  if (feature === "coverage:extended") return "broad accent coverage";
  if (feature === "coverage:punctuation") return "editorial punctuation";
  if (feature === "family:bold-italic") return "families with bold and italic";
  if (feature === "family:complete") return "complete families";
  if (type === "family") return "a family related to one you liked";
  if (type === "tag") return `your “${value}” subset`;
  return value;
}

function reasonFor(font) {
  if (state.profile.signals < 5) return "A broad wildcard while I collect a few taste signals.";
  const matches = featuresFor(font).map(feature => [feature,state.profile.weights.get(feature)||0]).filter(([,weight]) => weight > .5).sort((a,b) => b[1]-a[1]);
  if (!matches.length) return "A deliberate wildcard to keep your results from becoming too predictable.";
  const labels = [...new Set(matches.slice(0,2).map(([feature]) => featureLabel(feature)))];
  return `Prioritized because you respond well to ${labels.join(" and ")}.`;
}

function updateLearningStatus() {
  const count = state.profile.signals;
  const phase = count < 5 ? "Exploring broadly" : count < 15 ? "Noticing patterns" : count < 40 ? "Taste profile forming" : "Taste profile active";
  el.learningStatus.textContent = `${phase} · ${count.toLocaleString()} taste signal${count === 1 ? "" : "s"}`;
  el.learningMeter.style.width = `${Math.min(100,(count/40)*100)}%`;
  el.undoRating.disabled = state.ratingActions.length === 0;
}

function chooseVibe(vibe) {
  state.vibe = vibe;
  state.pool = state.fonts.filter(VIBES[vibe].test);
  if (!state.pool.length) state.pool = state.fonts;
  el.vibeLabel.textContent = VIBES[vibe].label;
  $$(".vibe").forEach(button => button.classList.toggle("active",button.dataset.vibe===vibe));
  showRecommended();
}

function showRecommended() {
  let candidates = state.pool.filter(font => effectiveRating(font.id) == null);
  if (!candidates.length) candidates = state.pool;
  let next;
  if (state.profile.signals < 5 || Math.random() < .14) {
    next = candidates[Math.floor(Math.random()*candidates.length)];
  } else {
    const ranked = candidates.map(font => ({font,score:tasteScore(font)+Math.random()*.35})).sort((a,b)=>b.score-a.score);
    const band = ranked.slice(0,Math.min(35,ranked.length));
    next = band[Math.floor(Math.pow(Math.random(),2)*band.length)].font;
  }
  state.current = next;
  renderSpotlight();
}

function showWildcard() {
  const candidates = state.fonts.filter(font => effectiveRating(font.id)==null);
  state.current = (candidates.length ? candidates : state.fonts)[Math.floor(Math.random()*(candidates.length || state.fonts.length))];
  el.vibeLabel.textContent = "True wildcard";
  renderSpotlight();
}

function setMessage(index) {
  state.messageIndex = (index+MESSAGES.length)%MESSAGES.length;
  const message = MESSAGES[state.messageIndex];
  state.sample = message.text; el.sample.value = message.text;
  if (state.previewMode === "message") renderSpecimen();
  if (state.screen === "picks") renderPicks();
  if (state.screen === "library") renderLibrary();
}

function renderSpecimen() {
  const specimen = state.previewMode === "message" ? {text:state.sample || state.current?.name || "",credit:MESSAGES[state.messageIndex]?.text===state.sample ? MESSAGES[state.messageIndex].credit : "Your own words"} : SPECIMENS[state.previewMode];
  el.heroPreview.textContent = specimen.text;
  el.messageCredit.textContent = specimen.credit;
  el.spotlight.classList.remove("mode-message","mode-accents","mode-characters","mode-stress");
  el.spotlight.classList.add(`mode-${state.previewMode}`);
}

async function loadFace(font) {
  const family = `PostFont${font.id}`;
  if (!state.faces.has(font.id)) {
    const face = new FontFace(family,`url(/api/font/${font.id})`,{display:"swap"});
    state.faces.set(font.id,face); await face.load(); document.fonts.add(face);
  } else await state.faces.get(font.id).loaded;
  return family;
}

async function renderSpotlight() {
  const font = state.current;
  if (!font) return;
  const id = font.id;
  el.spotlight.classList.remove("font-error"); el.heroPreview.style.fontFamily = "Arial, sans-serif";
  renderSpecimen();
  el.currentName.textContent = font.name;
  el.currentStyle.textContent = `${font.family} · ${font.style} · ${Math.round(font.size/1024)} KB`;
  el.currentDownload.href = `/api/font/${font.id}?download=1`;
  el.playCount.textContent = `${state.pool.length.toLocaleString()} fonts in this mood · ${state.profile.signals.toLocaleString()} rated`;
  el.recommendationReason.textContent = reasonFor(font);
  renderCoverage(font); renderFamily(font); renderCurrentTags(); renderRatingState(); updateLearningStatus();
  try { const family = await loadFace(font); if (state.current?.id===id) el.heroPreview.style.fontFamily=`"${family}"`; }
  catch (_) { el.spotlight.classList.add("font-error"); el.heroPreview.textContent="This file seems tired. Let’s try another."; }
}

function renderCoverage(font) {
  const items = [["portuguese","Portuguese accents"],["extended","International accents"],["punctuation","Smart punctuation"],["symbols","Currencies + symbols"]];
  el.coverageBadges.innerHTML = items.map(([key,label]) => `<span class="coverage-badge ${font.coverage?.[key] ? "yes" : "no"}">${font.coverage?.[key] ? "✓" : "×"} ${label}</span>`).join("");
}

function renderFamily(font) {
  const variants = state.familyMap.get(font.family.toLocaleLowerCase()) || [font];
  const qualities = [font.hasBold&&"bold",font.hasItalic&&"italic",font.hasBoldItalic&&"bold italic"].filter(Boolean);
  el.familySummary.textContent = variants.length===1 ? "No related styles found in this pack." : `${variants.length} styles found${qualities.length ? ` · includes ${qualities.join(", ")}` : ""}.`;
  el.familyVariants.innerHTML = variants.slice(0,18).map(variant => `<button class="family-variant ${variant.id===font.id?"current":""}" data-variant="${variant.id}">${escapeHtml(variant.style)}</button>`).join("");
}

function rateCurrent(rating) {
  if (!state.current) return;
  const id = state.current.id;
  const previous = explicitRating(id);
  const favoriteWas = state.favorites.has(id);
  state.ratingActions.push({id,previous,favoriteWas});
  state.ratings[String(id)] = rating;
  if (rating >= 3) state.favorites.add(id);
  saveTaste();
  showToast(`${RATING_LABELS[rating]} ${RATING_SYMBOLS[rating]} · sorter updated`);
  if (rating===4) popConfetti();
  showRecommended();
}

function undoRating() {
  const action = state.ratingActions.pop();
  if (!action) return;
  if (action.previous == null) delete state.ratings[String(action.id)]; else state.ratings[String(action.id)] = action.previous;
  action.favoriteWas ? state.favorites.add(action.id) : state.favorites.delete(action.id);
  state.current = state.fonts[action.id];
  saveTaste(); renderSpotlight(); showToast("Last rating undone");
}

function saveTaste() {
  localStorage.setItem("font-party-ratings",JSON.stringify(state.ratings));
  localStorage.setItem("font-cabinet-favorites",JSON.stringify([...state.favorites]));
  rebuildProfile(); updateBestCount(); updateLearningStatus();
  if (state.screen === "picks") renderPicks();
}

function renderRatingState() {
  const rating = explicitRating(state.current?.id);
  $$("[data-rating]").forEach(button=>button.classList.toggle("active",Number(button.dataset.rating)===rating));
}

function bestFonts() {
  const ids = new Set([...state.favorites,...Object.entries(state.ratings).filter(([,rating])=>Number(rating)>=2).map(([id])=>Number(id))]);
  return [...ids].map(id=>state.fonts[id]).filter(Boolean).sort((a,b)=>(effectiveRating(b.id)??-1)-(effectiveRating(a.id)??-1)||tasteScore(b)-tasteScore(a));
}

function updateBestCount() { el.favoriteCount.textContent = bestFonts().length; }

function saveTags() { localStorage.setItem("font-party-tags",JSON.stringify(state.tags)); state.featureCache.clear(); rebuildProfile(); updateLearningStatus(); refreshTagUI(); }
function addTag(id,value) { const tag=normalizeTag(value); if(!tag)return false; state.tags[String(id)]=[...new Set([...tagsFor(id),tag])]; saveTags(); return true; }
function removeTag(id,tag) { const next=tagsFor(id).filter(item=>item!==tag); if(next.length)state.tags[String(id)]=next;else delete state.tags[String(id)];saveTags(); }
function tagChips(id,removable=true) { const tags=tagsFor(id); if(!tags.length)return `<span class="muted">No tags yet</span>`; return tags.map(tag=>`<span class="tag-chip">${escapeHtml(tag)}${removable?`<button data-remove-tag="${escapeHtml(tag)}" data-font="${id}" aria-label="Remove ${escapeHtml(tag)}">×</button>`:""}</span>`).join(""); }
function renderCurrentTags(){if(state.current)el.currentTags.innerHTML=tagChips(state.current.id);}
function refreshTagUI(){const tags=allTags();el.knownTags.innerHTML=tags.map(tag=>`<option value="${escapeHtml(tag)}"></option>`).join("");if(state.tagFilter&&!tags.includes(state.tagFilter))state.tagFilter="";el.tagFilters.innerHTML=`<button class="tag-filter ${state.tagFilter?"":"active"}" data-tag="">All fonts</button>`+tags.map(tag=>`<button class="tag-filter ${state.tagFilter===tag?"active":""}" data-tag="${escapeHtml(tag)}"># ${escapeHtml(tag)}</button>`).join("");renderCurrentTags();if(state.screen==="library")filterLibrary(false);}
function openTagDialog(id){state.tagTarget=id;el.tagDialogTitle.textContent=state.fonts[id]?.name||"Add to a subset";renderTagDialog();el.tagDialog.showModal();el.dialogTagInput.focus();}
function renderTagDialog(){if(state.tagTarget==null)return;el.dialogTags.innerHTML=tagChips(state.tagTarget);const assigned=new Set(tagsFor(state.tagTarget));el.knownTagButtons.innerHTML=allTags().map(tag=>`<button type="button" class="${assigned.has(tag)?"assigned":""}" data-known-tag="${escapeHtml(tag)}"># ${escapeHtml(tag)}</button>`).join("");}

function toggleFavorite(id,celebrate=false){const adding=!state.favorites.has(id);adding?state.favorites.add(id):state.favorites.delete(id);saveTaste();if(adding&&celebrate){showToast("Added to Best so far ♥");popConfetti();}if(state.screen==="library")renderLibrary();return adding;}

function showScreen(name){state.screen=name;$$('[data-screen-panel]').forEach(panel=>panel.classList.toggle("active",panel.dataset.screenPanel===name));$$('[data-screen]').forEach(button=>button.classList.toggle("active",button.dataset.screen===name));if(name==="picks")renderPicks();if(name==="library"){filterLibrary(false);}window.scrollTo({top:$(".controls").offsetTop-65,behavior:"smooth"});}

function cardMarkup(font){const saved=state.favorites.has(font.id);const rating=effectiveRating(font.id);const miniTags=tagsFor(font.id).slice(0,3).map(tag=>`<span class="mini-tag">#${escapeHtml(tag)}</span>`).join("");return `<article class="font-card" data-font-id="${font.id}"><div class="card-head"><span class="font-name" title="${escapeHtml(font.name)}">${escapeHtml(font.name)}</span>${rating!=null?`<span class="rating-badge" title="${RATING_LABELS[rating]}">${RATING_SYMBOLS[rating]} ${rating+1}</span>`:""}<button class="favorite ${saved?"active":""}" data-favorite="${font.id}" aria-label="${saved?"Remove":"Save"} ${escapeHtml(font.name)}">${saved?"♥":"♡"}</button></div><div class="preview">${escapeHtml(state.sample||font.name)}</div><div class="card-tags">${miniTags}</div><div class="card-foot"><span class="card-meta">${escapeHtml(font.style)} · ${font.coverage?.portuguese?"PT ✓":"PT ×"} · ${font.familySize} style${font.familySize===1?"":"s"}</span><div class="card-actions"><button data-try-font="${font.id}">Try</button><button data-edit-tags="${font.id}">Tag +</button><a href="/api/font/${font.id}?download=1">Download ↓</a></div></div></article>`;}

async function hydrateGrid(grid,fonts){const token=String(Date.now()+Math.random());grid.dataset.renderToken=token;await Promise.all(fonts.map(async font=>{const card=grid.querySelector(`[data-font-id="${font.id}"]`);if(!card)return;try{const family=await loadFace(font);if(grid.dataset.renderToken===token&&card.isConnected)card.querySelector(".preview").style.fontFamily=`"${family}"`;}catch(_){card.classList.add("font-error");card.querySelector(".preview").textContent="Preview unavailable";}}));}

function renderPicks(){const fonts=bestFonts();el.picksEmpty.hidden=fonts.length>0;el.picksGrid.hidden=fonts.length===0;el.picksGrid.innerHTML=fonts.map(cardMarkup).join("");hydrateGrid(el.picksGrid,fonts);}

function filterLibrary(resetPage=true){const query=state.search.trim().toLocaleLowerCase();state.results=state.fonts.filter(font=>{const name=!query||font.name.toLocaleLowerCase().includes(query)||font.family.toLocaleLowerCase().includes(query);const tag=!state.tagFilter||tagsFor(font.id).includes(state.tagFilter);const quality=!state.qualityFilter||(state.qualityFilter==="accents"&&font.coverage?.portuguese)||(state.qualityFilter==="boldItalic"&&font.hasBold&&font.hasItalic)||(state.qualityFilter==="complete"&&font.hasBold&&font.hasItalic&&font.hasBoldItalic&&font.familySize>=4);return name&&tag&&quality;});if(state.sortMode==="name")state.results.sort((a,b)=>a.name.localeCompare(b.name));else if(state.sortMode==="rating")state.results.sort((a,b)=>(effectiveRating(b.id)??-1)-(effectiveRating(a.id)??-1)||a.name.localeCompare(b.name));else state.results.sort((a,b)=>{const ar=effectiveRating(a.id),br=effectiveRating(b.id);const ap=ar!=null?100+ar*10:tasteScore(a),bp=br!=null?100+br*10:tasteScore(b);return bp-ap||a.name.localeCompare(b.name);});if(resetPage)state.page=1;renderLibrary();}

function renderLibrary(){const pageSize=state.layout==="list"?80:30;const pages=Math.max(1,Math.ceil(state.results.length/pageSize));state.page=Math.min(state.page,pages);const start=(state.page-1)*pageSize;const fonts=state.results.slice(start,start+pageSize);el.resultCount.textContent=`${state.results.length.toLocaleString()} font${state.results.length===1?"":"s"}`;el.clearSearch.hidden=!state.search&&!state.tagFilter&&!state.qualityFilter;el.libraryEmpty.hidden=fonts.length>0;el.libraryGrid.hidden=fonts.length===0;el.libraryGrid.classList.toggle("list-layout",state.layout==="list");el.libraryGrid.innerHTML=fonts.map(cardMarkup).join("");el.pagination.innerHTML=fonts.length?`<button class="page-button" data-page="prev" ${state.page===1?"disabled":""}>← Back</button><span class="page-number">Page ${state.page} of ${pages.toLocaleString()}</span><button class="page-button" data-page="next" ${state.page===pages?"disabled":""}>More →</button>`:"";hydrateGrid(el.libraryGrid,fonts);}

function handleCardClick(event){const tryButton=event.target.closest("[data-try-font]");if(tryButton){state.current=state.fonts[Number(tryButton.dataset.tryFont)];showScreen("play");renderSpotlight();return;}const favorite=event.target.closest("[data-favorite]");if(favorite){toggleFavorite(Number(favorite.dataset.favorite),!state.favorites.has(Number(favorite.dataset.favorite)));return;}const tagButton=event.target.closest("[data-edit-tags]");if(tagButton)openTagDialog(Number(tagButton.dataset.editTags));}
let toastTimer;function showToast(message){el.toast.textContent=message;el.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.toast.classList.remove("show"),1700);}
function popConfetti(){for(let i=0;i<14;i++){const bit=document.createElement("span");bit.className="confetti";bit.textContent=["✦","●","♥","✿"][i%4];bit.style.left=`${47+Math.random()*6}%`;bit.style.top=`${56+Math.random()*5}%`;bit.style.setProperty("--x",`${(Math.random()-.5)*380}px`);bit.style.setProperty("--y",`${-70-Math.random()*240}px`);document.body.append(bit);setTimeout(()=>bit.remove(),850);}}

$("#messageButton").addEventListener("click",()=>setMessage(state.messageIndex+1));
el.sample.addEventListener("input",event=>{state.sample=event.target.value;if(state.previewMode==="message")renderSpecimen();if(state.screen==="picks")renderPicks();if(state.screen==="library")renderLibrary();});
$("#vibes").addEventListener("click",event=>{const button=event.target.closest("[data-vibe]");if(button)chooseVibe(button.dataset.vibe);});
$(".specimen-tabs").addEventListener("click",event=>{const button=event.target.closest("[data-preview-mode]");if(!button)return;state.previewMode=button.dataset.previewMode;$$('[data-preview-mode]').forEach(item=>item.classList.toggle("active",item===button));renderSpecimen();});
el.familyVariants.addEventListener("click",event=>{const button=event.target.closest("[data-variant]");if(!button)return;state.current=state.fonts[Number(button.dataset.variant)];renderSpotlight();});
$(".rating-scale").addEventListener("click",event=>{const button=event.target.closest("[data-rating]");if(button)rateCurrent(Number(button.dataset.rating));});
el.undoRating.addEventListener("click",undoRating);$("#skipButton").addEventListener("click",showRecommended);$("#explainButton").addEventListener("click",()=>showToast(reasonFor(state.current)));$("#surpriseButton").addEventListener("click",showWildcard);
$$('[data-screen]').forEach(button=>button.addEventListener("click",()=>showScreen(button.dataset.screen)));$$('[data-go-play]').forEach(button=>button.addEventListener("click",()=>showScreen("play")));
$("#inlineTagForm").addEventListener("submit",event=>{event.preventDefault();if(state.current&&addTag(state.current.id,el.inlineTagInput.value)){el.inlineTagInput.value="";renderCurrentTags();showToast("Added to your subset");}});
el.currentTags.addEventListener("click",event=>{const button=event.target.closest("[data-remove-tag]");if(button)removeTag(Number(button.dataset.font),button.dataset.removeTag);});el.picksGrid.addEventListener("click",handleCardClick);el.libraryGrid.addEventListener("click",handleCardClick);
el.search.addEventListener("input",event=>{state.search=event.target.value;filterLibrary();});el.sortMode.addEventListener("change",event=>{state.sortMode=event.target.value;filterLibrary();});el.qualityFilter.addEventListener("change",event=>{state.qualityFilter=event.target.value;filterLibrary();});
el.clearSearch.addEventListener("click",()=>{state.search="";state.tagFilter="";state.qualityFilter="";el.search.value="";el.qualityFilter.value="";refreshTagUI();filterLibrary();});
el.tagFilters.addEventListener("click",event=>{const button=event.target.closest("[data-tag]");if(!button)return;state.tagFilter=button.dataset.tag;refreshTagUI();filterLibrary();});
$(".view-toggle").addEventListener("click",event=>{const button=event.target.closest("[data-layout]");if(!button)return;state.layout=button.dataset.layout;state.page=1;$$('[data-layout]').forEach(item=>item.classList.toggle("active",item===button));renderLibrary();});
el.pagination.addEventListener("click",event=>{const button=event.target.closest("[data-page]");if(!button||button.disabled)return;state.page+=button.dataset.page==="next"?1:-1;renderLibrary();$("#libraryScreen").scrollIntoView({behavior:"smooth"});});
$("#infoButton").addEventListener("click",()=>el.infoDialog.showModal());el.infoDialog.querySelector(".dialog-close").addEventListener("click",()=>el.infoDialog.close());el.tagDialog.querySelector(".dialog-close").addEventListener("click",()=>el.tagDialog.close());
const dialogTagForm=$("#dialogTagForm");dialogTagForm.addEventListener("submit",event=>{event.preventDefault();if(state.tagTarget!=null&&addTag(state.tagTarget,el.dialogTagInput.value)){el.dialogTagInput.value="";renderTagDialog();showToast("Tag added");if(state.screen==="library")renderLibrary();if(state.screen==="picks")renderPicks();}});
el.dialogTags.addEventListener("click",event=>{const button=event.target.closest("[data-remove-tag]");if(button){removeTag(Number(button.dataset.font),button.dataset.removeTag);renderTagDialog();}});el.knownTagButtons.addEventListener("click",event=>{const button=event.target.closest("[data-known-tag]");if(!button||state.tagTarget==null)return;const tag=button.dataset.knownTag;tagsFor(state.tagTarget).includes(tag)?removeTag(state.tagTarget,tag):addTag(state.tagTarget,tag);renderTagDialog();});
[el.infoDialog,el.tagDialog].forEach(dialog=>dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();}));
document.addEventListener("keydown",event=>{if(state.screen!=="play"||/input|select/i.test(event.target.tagName))return;const number=Number(event.key);if(number>=1&&number<=5)rateCurrent(number-1);});

start();
