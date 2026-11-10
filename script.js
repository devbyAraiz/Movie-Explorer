const API_KEY = "431551206af27af683edeb1333cb2f55";
const IMG_PATH = "https://image.tmdb.org/t/p/w500";
const SEARCH_URL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=`;

/* ================= DOM ================= */
const main = document.getElementById("main");
const form = document.getElementById("form");
const search = document.getElementById("search");
const pagination = document.getElementById("pagination");
const genreSelect = document.getElementById("genre");
const industrySelect = document.getElementById("industry");
const backBtn = document.getElementById("backBtn");

const modal = document.getElementById("trailerModal");
const frame = document.getElementById("trailerFrame");
const closeBtn = document.querySelector(".close");

const alertModal = document.getElementById("alertModal");
const alertText = document.getElementById("alertText");
const alertOk = document.getElementById("alertOk");

/* ================= STATE ================= */
let currentPage = 1;
let totalPages = 1;
let currentQuery = "";
let currentGenre = "";
let currentIndustry = "";

/* ================= INITIAL HISTORY ================= */
history.replaceState({ q: "", genre: "", industry: "", page: 1 }, "", location.pathname);

/* ================= HISTORY ================= */
function pushHistory() {
  const params = new URLSearchParams();
  if (currentQuery) params.set("q", currentQuery);
  if (currentGenre) params.set("genre", currentGenre);
  if (currentIndustry) params.set("industry", currentIndustry);
  params.set("page", currentPage);

  history.pushState(
    { q: currentQuery, genre: currentGenre, industry: currentIndustry, page: currentPage },
    "",
    "?" + params.toString()
  );

  toggleBackBtn();
}

function toggleBackBtn() {
  backBtn.style.visibility =
    (!currentQuery && !currentGenre && !currentIndustry && currentPage === 1)
      ? "hidden"
      : "visible";
}

/* ================= KEYBOARD ================= */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeTrailer();
});

/* ================= GENRES ================= */
async function loadGenres() {
  const res = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}`);
  const data = await res.json();

  data.genres.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    genreSelect.appendChild(opt);
  });
}
loadGenres();

/* ================= BUILD URL ================= */
function buildURL(page = 1) {
  let url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&page=${page}&sort_by=popularity.desc`;

  if (currentGenre) url += `&with_genres=${currentGenre}`;

  if (currentIndustry === "bollywood") url += "&with_original_language=hi&region=IN";
  else if (currentIndustry === "lollywood") url += "&with_original_language=ur&region=PK";
  else if (currentIndustry === "hollywood") url += "&with_original_language=en";

  return url;
}

/* ================= FETCH MOVIES ================= */
async function getMovies(url) {
  showSkeletons();
  const res = await fetch(url);
  const data = await res.json();

  currentPage = data.page;
  totalPages = Math.min(data.total_pages, 500);

  showMovies(data.results);
  renderPagination();
  toggleBackBtn();
}

/* ================= SEARCH ================= */
form.addEventListener("submit", e => {
  e.preventDefault();
  if (!search.value.trim()) return;

  currentQuery = search.value.trim();
  currentGenre = "";
  currentIndustry = "";
  currentPage = 1;

  getMovies(`${SEARCH_URL}${currentQuery}&page=1`);
  pushHistory();
  search.value = "";
});

/* ================= FILTERS ================= */
genreSelect.addEventListener("change", () => {
  currentGenre = genreSelect.value;
  currentQuery = "";
  currentPage = 1;
  getMovies(buildURL(1));
  pushHistory();
});

industrySelect.addEventListener("change", () => {
  currentIndustry = industrySelect.value;
  currentQuery = "";
  currentPage = 1;
  getMovies(buildURL(1));
  pushHistory();
});

/* ================= PAGINATION ================= */
function renderPagination() {
  pagination.innerHTML = "";

  const maxVisible = 7;
  let start = Math.max(1, currentPage - 3);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (currentPage > 1) {
    addPageBtn("⏮", 1);
    addPageBtn("‹", currentPage - 1);
  }

  for (let i = start; i <= end; i++) {
    addPageBtn(i, i, i === currentPage);
  }

  if (currentPage < totalPages) {
    addPageBtn("›", currentPage + 1);
    addPageBtn("⏭", totalPages);
  }
}

function addPageBtn(text, page, active = false) {
  const btn = document.createElement("button");
  btn.textContent = text;
  if (active) btn.classList.add("active");

  btn.onclick = () => {
    currentPage = page;
    currentQuery
      ? getMovies(`${SEARCH_URL}${currentQuery}&page=${page}`)
      : getMovies(buildURL(page));
    pushHistory();
  };

  pagination.appendChild(btn);
}

/* ================= UI ================= */
function showSkeletons() {
  main.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("div");
    s.className = "movie skeleton";
    main.appendChild(s);
  }
}

function showMovies(movies) {
  main.innerHTML = "";

  movies.forEach((movie, i) => {
    const el = document.createElement("div");
    el.className = "movie";
    el.style.animationDelay = `${i * 0.05}s`;

    el.innerHTML = `
      <img src="${movie.poster_path ? IMG_PATH + movie.poster_path : "https://via.placeholder.com/500x750"}">
      <div class="movie-info">
        <h3>${movie.title}</h3>
        <span class="${getClassByRate(movie.vote_average)}">
          ${movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}
        </span>
      </div>
      <div class="play-icon">▶</div>
    `;

    el.addEventListener("click", () => openTrailer(movie.id));
    main.appendChild(el);
  });
}

/* ================= RATING COLOR ================= */
function getClassByRate(v) {
  if (v >= 8) return "red";
  if (v >= 5) return "blue";
  return "black";
}

/* ================= TRAILER ================= */
async function openTrailer(id) {
  modal.classList.add("show");
  document.body.style.overflow = "hidden";

  const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?api_key=${API_KEY}`);
  const data = await res.json();

  const video =
    data.results.find(v => v.type === "Trailer" && v.site === "YouTube") ||
    data.results.find(v => v.site === "YouTube");

  if (!video) {
    showAlert("Trailer not available 😢");
    closeTrailer();
    return;
  }

  frame.src = `https://www.youtube.com/embed/${video.key}?autoplay=1&mute=1`;
}

function closeTrailer() {
  modal.classList.remove("show");
  document.body.style.overflow = "";
  frame.src = "";
}

closeBtn.onclick = closeTrailer;
modal.addEventListener("click", e => e.target === modal && closeTrailer());

/* ================= POPSTATE ================= */
window.addEventListener("popstate", e => {
  if (!e.state) return;

  currentQuery = e.state.q || "";
  currentGenre = e.state.genre || "";
  currentIndustry = e.state.industry || "";
  currentPage = e.state.page || 1;

  genreSelect.value = currentGenre;
  industrySelect.value = currentIndustry;

  currentQuery
    ? getMovies(`${SEARCH_URL}${currentQuery}&page=${currentPage}`)
    : getMovies(buildURL(currentPage));
});

/* ================= ALERT ================= */
function showAlert(msg) {
  alertText.textContent = msg;
  alertModal.classList.add("show");
}
function hideAlert() {
  alertModal.classList.remove("show");
}
alertOk.onclick = hideAlert;
alertModal.addEventListener("click", e => e.target === alertModal && hideAlert());

/* ================= INIT ================= */
getMovies(buildURL());
