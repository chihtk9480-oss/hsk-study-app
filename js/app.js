import {
  LESSONS,
  VOCABULARY,
  WRITING_WORDS,
  getLessonWords,
  getWord,
} from "./data.js";

const STORAGE_KEY = "hanzigo-state-v1";
const DAY_MS = 86_400_000;
const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30];

const PAGE_META = {
  home: ["Trang chủ", "HSK 1 · Bộ khởi động"],
  learn: ["Bài học", "6 chủ đề · 72 từ nền tảng"],
  review: ["Ôn tập", "Nhớ lâu bằng lặp lại ngắt quãng"],
  words: ["Từ vựng", "Tra cứu nhanh bộ từ đang học"],
  write: ["Luyện viết", "Viết chữ Hán trên ô mễ tự"],
  flashcards: ["Thẻ ghi nhớ", "Lật thẻ · nghe · tự đánh giá"],
  quiz: ["Thử thách nhanh", "10 câu · nghĩa · chữ · nghe"],
};

const main = document.querySelector("#app-main");
const pageTitle = document.querySelector("#page-title");
const pageEyebrow = document.querySelector("#page-eyebrow");
const settingsDialog = document.querySelector("#settings-dialog");
const settingsForm = document.querySelector("#settings-form");
const toastRegion = document.querySelector("#toast-region");
const confettiLayer = document.querySelector("#confetti-layer");
const offlineBanner = document.querySelector("#offline-banner");

let currentPage = routeFromHash();
let flashcardSession = null;
let quizSession = null;
let wordSearch = "";
let wordLessonFilter = "all";
let favoritesOnly = false;
let selectedWritingId = WRITING_WORDS[0]?.id;
let writingStrokes = [];
let installPrompt = null;

const defaultState = () => ({
  profileName: "Chi",
  dailyGoal: 10,
  showPinyin: true,
  sound: true,
  darkMode: false,
  xp: 0,
  streak: 0,
  lastStudyDate: null,
  studiedDates: [],
  progress: {},
  favorites: [],
  stats: {
    flashcards: 0,
    quizAnswers: 0,
    writes: 0,
    correct: 0,
    wrong: 0,
  },
  daily: {
    date: todayKey(),
    reviewed: [],
    quizAnswers: 0,
    writes: 0,
  },
});

let state = loadState();
refreshDaily();
applyTheme();
render();
updateShell();
bindGlobalEvents();
setupPwa();
setupConnectivity();

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== "object") return defaultState();
    const defaults = defaultState();
    return {
      ...defaults,
      ...stored,
      stats: { ...defaults.stats, ...(stored.stats || {}) },
      daily: { ...defaults.daily, ...(stored.daily || {}) },
      progress: stored.progress || {},
      favorites: Array.isArray(stored.favorites) ? stored.favorites : [],
      studiedDates: Array.isArray(stored.studiedDates)
        ? stored.studiedDates
        : [],
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function refreshDaily() {
  const today = todayKey();
  if (state.daily?.date !== today) {
    state.daily = {
      date: today,
      reviewed: [],
      quizAnswers: 0,
      writes: 0,
    };
    saveState();
  }
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function yesterdayKey() {
  return todayKey(new Date(Date.now() - DAY_MS));
}

function recordStudy({ wordId, xp = 0, type = "flashcard" }) {
  refreshDaily();
  const today = todayKey();

  if (state.lastStudyDate !== today) {
    state.streak = state.lastStudyDate === yesterdayKey() ? state.streak + 1 : 1;
    state.lastStudyDate = today;
    if (!state.studiedDates.includes(today)) state.studiedDates.push(today);
    state.studiedDates = state.studiedDates.slice(-120);
  }

  if (wordId && !state.daily.reviewed.includes(wordId)) {
    state.daily.reviewed.push(wordId);
  }

  if (type === "quiz") state.daily.quizAnswers += 1;
  if (type === "write") state.daily.writes += 1;
  state.xp += xp;
  saveState();
  updateShell();
}

function getProgress(wordId) {
  return {
    seen: false,
    box: 0,
    due: 0,
    reviews: 0,
    correct: 0,
    wrong: 0,
    ...(state.progress[wordId] || {}),
  };
}

function setProgress(wordId, patch) {
  state.progress[wordId] = { ...getProgress(wordId), ...patch };
}

function lessonStats(lessonId) {
  const words = getLessonWords(lessonId);
  const seen = words.filter((word) => getProgress(word.id).seen).length;
  const mastered = words.filter((word) => getProgress(word.id).box >= 3).length;
  return {
    total: words.length,
    seen,
    mastered,
    percent: words.length ? Math.round((seen / words.length) * 100) : 0,
    masteryPercent: words.length
      ? Math.round((mastered / words.length) * 100)
      : 0,
  };
}

function getDueWords() {
  const now = Date.now();
  return VOCABULARY.filter((word) => {
    const progress = getProgress(word.id);
    return progress.seen && Number(progress.due || 0) <= now;
  });
}

function getSeenWords() {
  return VOCABULARY.filter((word) => getProgress(word.id).seen);
}

function getNextLesson() {
  return LESSONS.find((lesson) => lessonStats(lesson.id).seen < 12) || LESSONS[0];
}

function updateShell() {
  refreshDaily();
  document.querySelectorAll("[data-streak]").forEach((element) => {
    element.textContent = state.streak;
  });
  document.querySelectorAll("[data-xp]").forEach((element) => {
    element.textContent = state.xp;
  });

  const avatar = document.querySelector("#avatar-initial");
  avatar.textContent = (state.profileName.trim()[0] || "B").toUpperCase();

  const dueCount = getDueWords().length;
  const badge = document.querySelector("#review-badge");
  badge.textContent = dueCount;
  badge.hidden = dueCount === 0;
}

function applyTheme() {
  document.documentElement.dataset.theme = state.darkMode ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", state.darkMode ? "#262221" : "#c93645");
}

function routeFromHash() {
  const route = window.location.hash.replace("#", "");
  return ["home", "learn", "review", "words", "write"].includes(route)
    ? route
    : "home";
}

function navigate(page, { updateHash = true } = {}) {
  currentPage = PAGE_META[page] ? page : "home";
  if (updateHash && ["home", "learn", "review", "words", "write"].includes(page)) {
    history.pushState(null, "", `#${page}`);
  }
  render();
  updateShell();
  window.scrollTo({ top: 0, behavior: "smooth" });
  main.focus({ preventScroll: true });
}

function render() {
  refreshDaily();
  const [title, eyebrow] = PAGE_META[currentPage] || PAGE_META.home;
  pageTitle.textContent = title;
  pageEyebrow.textContent = eyebrow;

  document.querySelectorAll("[data-page]").forEach((button) => {
    const activePage = currentPage === "flashcards" ? "learn" : currentPage === "quiz" ? "review" : currentPage;
    button.classList.toggle("is-active", button.dataset.page === activePage);
    if (button.classList.contains("nav-item")) {
      button.setAttribute("aria-current", button.dataset.page === activePage ? "page" : "false");
    }
  });

  switch (currentPage) {
    case "learn":
      renderLearn();
      break;
    case "review":
      renderReview();
      break;
    case "words":
      renderWords();
      break;
    case "write":
      renderWrite();
      break;
    case "flashcards":
      renderFlashcards();
      break;
    case "quiz":
      renderQuiz();
      break;
    default:
      renderHome();
  }
}

function renderHome() {
  const name = escapeHtml(state.profileName.trim() || "bạn");
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const dailyCount = state.daily.reviewed.length;
  const goalPercent = Math.min(100, Math.round((dailyCount / state.dailyGoal) * 100));
  const nextLesson = getNextLesson();
  const nextStats = lessonStats(nextLesson.id);
  const learned = getSeenWords().length;
  const mastered = VOCABULARY.filter((word) => getProgress(word.id).box >= 3).length;
  const attempts = state.stats.correct + state.stats.wrong;
  const accuracy = attempts ? Math.round((state.stats.correct / attempts) * 100) : 0;
  const dueCount = getDueWords().length;

  main.innerHTML = `
    <section class="hero-card" aria-labelledby="welcome-heading">
      <div class="hero-content">
        <span class="hero-kicker"><span aria-hidden="true">✦</span> ${greeting}, ${name}</span>
        <h2 id="welcome-heading">Mỗi ngày một chút,<br><span>chữ Hán sẽ thành quen.</span></h2>
        <p>${
          goalPercent >= 100
            ? "Bạn đã hoàn thành mục tiêu hôm nay. Ôn thêm vài thẻ để giữ kiến thức thật chắc nhé!"
            : `Tiếp tục Bài ${nextLesson.id}: ${escapeHtml(nextLesson.title)}. Bạn còn ${Math.max(0, state.dailyGoal - dailyCount)} từ để hoàn thành mục tiêu hôm nay.`
        }</p>
        <div class="hero-actions">
          <button class="primary-button" type="button" data-action="start-lesson" data-lesson="${nextLesson.id}">
            ${icon("play")} ${nextStats.seen ? "Học tiếp" : "Bắt đầu học"}
          </button>
          <button class="ghost-button" type="button" data-action="start-review">
            ${icon("refresh")} ${dueCount ? `Ôn ${dueCount} từ đến hạn` : "Ôn nhanh 10 từ"}
          </button>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <span class="floating-word one">你</span>
        <img src="./assets/mascot.svg" alt="" />
        <span class="floating-word two">好</span>
      </div>
    </section>

    <div class="section-header">
      <div>
        <h2>Hôm nay của bạn</h2>
        <p>Một phiên học ngắn 5–10 phút là đủ để duy trì nhịp.</p>
      </div>
    </div>

    <section class="dashboard-grid" aria-label="Tiến độ hôm nay">
      <article class="card daily-card">
        <div class="progress-ring" style="--progress: ${goalPercent}" aria-label="Đã hoàn thành ${goalPercent}% mục tiêu">
          <div class="progress-ring-content"><strong>${dailyCount}/${state.dailyGoal}</strong><small>từ hôm nay</small></div>
        </div>
        <div class="daily-copy">
          <h3>${goalPercent >= 100 ? "Xong mục tiêu rồi! 🎉" : "Mục tiêu đang chờ bạn"}</h3>
          <p>${goalPercent >= 100 ? "Tuyệt lắm — sự đều đặn quan trọng hơn học dồn." : `Còn ${Math.max(0, state.dailyGoal - dailyCount)} từ nữa. Cứ chậm mà chắc nhé.`}</p>
          <div class="mini-progress" aria-hidden="true"><span style="--progress: ${goalPercent}%"></span></div>
          <div class="daily-meta"><span>${goalPercent}% hoàn thành</span><span>+${state.xp} XP tổng</span></div>
        </div>
      </article>
      <article class="card streak-card">
        <h3>🔥 ${state.streak} ngày liên tiếp</h3>
        <p>${streakMessage(state.streak)}</p>
        <div class="week-row">${renderWeek()}</div>
      </article>
    </section>

    <section class="stats-row" aria-label="Thống kê học tập">
      <article class="card stat-card"><span class="stat-icon coral" aria-hidden="true">字</span><span class="stat-copy"><strong>${learned}</strong><small>Từ đã mở khóa</small></span></article>
      <article class="card stat-card"><span class="stat-icon mint" aria-hidden="true">✓</span><span class="stat-copy"><strong>${mastered}</strong><small>Từ đang nhớ tốt</small></span></article>
      <article class="card stat-card"><span class="stat-icon gold" aria-hidden="true">◎</span><span class="stat-copy"><strong>${accuracy}%</strong><small>Độ chính xác quiz</small></span></article>
    </section>

    <div class="section-header">
      <div>
        <h2>Lộ trình HSK 1 khởi động</h2>
        <p>72 từ nền tảng được chia thành 6 chủ đề dễ học.</p>
      </div>
      <button class="inline-link" type="button" data-page="learn">Xem tất cả →</button>
    </div>
    <section class="lesson-grid" aria-label="Các bài học">
      ${LESSONS.slice(0, 4).map(renderLessonCard).join("")}
    </section>
  `;
}

function renderWeek() {
  const labels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    const key = todayKey(date);
    const done = state.studiedDates.includes(key);
    const today = key === todayKey();
    return `
      <span class="week-day ${done ? "is-done" : ""} ${today ? "is-today" : ""}">
        <span>${labels[date.getDay()]}</span>
        <span class="week-dot" aria-label="${done ? "Đã học" : "Chưa học"}">${done ? "✓" : "·"}</span>
      </span>
    `;
  }).join("");
}

function streakMessage(streak) {
  if (streak === 0) return "Học một từ hôm nay để bắt đầu chuỗi mới.";
  if (streak < 3) return "Khởi đầu tốt lắm, giữ nhịp thêm một ngày nhé.";
  if (streak < 7) return "Bạn đang tạo được một thói quen rất đẹp.";
  return "Quá ổn định! Chuỗi này đáng tự hào lắm.";
}

function renderLearn() {
  const learned = getSeenWords().length;
  const percent = Math.round((learned / VOCABULARY.length) * 100);

  main.innerHTML = `
    <section class="card level-overview">
      <div class="level-number" aria-hidden="true">一</div>
      <div class="level-copy">
        <p class="eyebrow">Đang học</p>
        <h2>HSK 1 · Bộ khởi động</h2>
        <p>6 bài · 72 từ/cụm từ giao tiếp nền tảng · Có phát âm và ví dụ.</p>
      </div>
      <div class="level-progress">
        <div><span>Tiến độ cấp độ</span><strong>${learned}/72 từ</strong></div>
        <div class="mini-progress"><span style="--progress: ${percent}%"></span></div>
      </div>
    </section>

    <div class="section-header">
      <div><h2>Chọn bài để học</h2><p>Mỗi bài có 12 thẻ, mất khoảng 5–8 phút.</p></div>
    </div>
    <section class="lesson-grid" aria-label="Danh sách bài học">
      ${LESSONS.map(renderLessonCard).join("")}
    </section>

    <div class="section-header">
      <div><h2>Cấp độ tiếp theo</h2><p>Mở rộng sau khi bản HSK 1 đã thật chắc.</p></div>
    </div>
    <section class="stats-row" aria-label="Các cấp độ sắp ra mắt">
      ${[2, 3, 4].map((level) => `<article class="card stat-card" aria-disabled="true"><span class="stat-icon ${level === 2 ? "mint" : level === 3 ? "gold" : "coral"}" aria-hidden="true">${level}</span><span class="stat-copy"><strong>HSK ${level}</strong><small>Sắp mở khóa</small></span></article>`).join("")}
    </section>
  `;
}

function renderLessonCard(lesson) {
  const stats = lessonStats(lesson.id);
  const buttonLabel = stats.seen === 0 ? "Bắt đầu" : stats.seen === stats.total ? "Ôn lại" : "Học tiếp";
  return `
    <button class="lesson-card" type="button" data-action="start-lesson" data-lesson="${lesson.id}" data-color="${lesson.color}" aria-label="${buttonLabel} bài ${lesson.id}: ${escapeHtml(lesson.title)}">
      <span class="lesson-icon" aria-hidden="true">${lesson.emoji}</span>
      <span class="lesson-content">
        <span class="lesson-number">Bài ${lesson.id} · 12 từ</span>
        <h3>${escapeHtml(lesson.title)}</h3>
        <p>${escapeHtml(lesson.subtitle)}</p>
      </span>
      <span class="lesson-card-footer">
        <span class="mini-progress"><span style="--progress: ${stats.percent}%"></span></span>
        <span class="lesson-progress-label">${stats.seen}/${stats.total} · ${buttonLabel}</span>
      </span>
    </button>
  `;
}

function renderReview() {
  const due = getDueWords();
  const seen = getSeenWords();
  const reviewCount = due.length || Math.min(10, seen.length || 10);

  main.innerHTML = `
    <section class="review-hero">
      <article class="card review-due-card">
        <div class="due-orb" aria-hidden="true">复</div>
        <div>
          <p class="eyebrow">Ôn đúng lúc</p>
          <h2>${due.length ? `${due.length} từ đang đến hạn` : "Bộ nhớ đang nhẹ nhàng"}</h2>
          <p>${due.length ? "Những từ này đã tới thời điểm tốt nhất để nhắc lại." : seen.length ? "Chưa có từ đến hạn. Bạn vẫn có thể ôn nhanh một bộ ngẫu nhiên." : "Bạn chưa học thẻ nào. Hãy bắt đầu Bài 1 hoặc thử bộ mẫu."}</p>
          <button class="primary-button" type="button" data-action="start-review">${icon("refresh")} Ôn ${reviewCount} từ</button>
        </div>
      </article>
      <article class="card quiz-promo-card">
        <p class="eyebrow">Thử thách 3 trong 1</p>
        <h2>Quiz nhanh 10 câu</h2>
        <p>Đan xen nhận mặt chữ, chọn nghĩa và nghe phát âm.</p>
        <button class="secondary-button" type="button" data-action="start-quiz">${icon("spark")} Bắt đầu quiz</button>
      </article>
    </section>

    <div class="section-header">
      <div><h2>Mức độ ghi nhớ theo bài</h2><p>Từ được xem là “nhớ tốt” khi đã vượt qua ít nhất 3 vòng ôn.</p></div>
    </div>
    <section class="mastery-list" aria-label="Tiến độ ghi nhớ">
      ${LESSONS.map((lesson) => {
        const stats = lessonStats(lesson.id);
        return `<article class="mastery-row"><strong>Bài ${lesson.id}</strong><div class="mini-progress" aria-label="${stats.masteryPercent}% nhớ tốt"><span style="--progress: ${stats.masteryPercent}%"></span></div><span>${stats.mastered}/12</span></article>`;
      }).join("")}
    </section>
  `;
}

function startFlashcards(source, lessonId) {
  let deck;
  let title;

  if (source === "lesson") {
    const lesson = LESSONS.find((item) => item.id === Number(lessonId)) || LESSONS[0];
    const words = getLessonWords(lesson.id);
    deck = [
      ...words.filter((word) => !getProgress(word.id).seen),
      ...words.filter((word) => getProgress(word.id).seen && getProgress(word.id).due <= Date.now()),
      ...words.filter((word) => getProgress(word.id).seen && getProgress(word.id).due > Date.now()),
    ];
    title = `Bài ${lesson.id}: ${lesson.title}`;
  } else {
    const due = getDueWords();
    const seen = getSeenWords();
    deck = due.length ? shuffle(due).slice(0, 12) : shuffle(seen.length ? seen : getLessonWords(1)).slice(0, 10);
    title = due.length ? "Ôn tập đến hạn" : "Ôn nhanh ngẫu nhiên";
  }

  flashcardSession = {
    title,
    deck,
    index: 0,
    flipped: false,
    celebrated: false,
    ratings: { again: 0, hard: 0, good: 0 },
    xp: 0,
  };
  navigate("flashcards", { updateHash: false });
}

function renderFlashcards() {
  if (!flashcardSession || !flashcardSession.deck.length) {
    main.innerHTML = `<section class="card empty-state"><span>🌱</span><h2>Chưa có thẻ để ôn</h2><p>Hãy học Bài 1 trước nhé.</p><button class="primary-button" type="button" data-action="start-lesson" data-lesson="1">Bắt đầu Bài 1</button></section>`;
    return;
  }

  if (flashcardSession.index >= flashcardSession.deck.length) {
    renderFlashcardComplete();
    return;
  }

  const word = flashcardSession.deck[flashcardSession.index];
  const progress = Math.round((flashcardSession.index / flashcardSession.deck.length) * 100);
  const pinyin = state.showPinyin ? `<span class="pinyin">${escapeHtml(word.pinyin)}</span>` : "";

  main.innerHTML = `
    <section class="study-shell">
      <div class="study-topline">
        <button class="icon-button" type="button" data-page="learn" aria-label="Thoát phiên học">${icon("close")}</button>
        <div class="mini-progress" aria-label="Tiến độ ${progress}%"><span style="--progress: ${progress}%"></span></div>
        <span class="study-count">${flashcardSession.index + 1}/${flashcardSession.deck.length}</span>
      </div>
      <p class="eyebrow">${escapeHtml(flashcardSession.title)}</p>
      <div class="flashcard-wrap">
        <div class="flashcard ${flashcardSession.flipped ? "is-flipped" : ""}" data-action="flip-card" role="button" tabindex="0" aria-label="Lật thẻ ${word.hanzi}" aria-pressed="${flashcardSession.flipped}">
          <div class="flashcard-face flashcard-front">
            <span class="flashcard-hint">${icon("rotate")} Chạm để lật thẻ</span>
            <strong class="flashcard-hanzi">${word.hanzi}</strong>
            <span class="flashcard-prompt">Bạn còn nhớ từ này không?</span>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="word-heading">
              <div><h2>${word.hanzi}</h2>${pinyin}</div>
              <button class="audio-button" type="button" data-action="speak" data-word="${word.id}" aria-label="Nghe phát âm ${word.hanzi}">${icon("volume")}</button>
            </div>
            <div class="word-meaning"><small>Nghĩa tiếng Việt</small><strong>${escapeHtml(word.meaning)}</strong></div>
            <div class="example-box">
              <small>Ví dụ</small>
              <p class="example-hanzi">${word.example}</p>
              ${state.showPinyin ? `<p class="example-pinyin">${escapeHtml(word.examplePinyin)}</p>` : ""}
              <p class="example-meaning">${escapeHtml(word.exampleMeaning)}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="rating-area" ${flashcardSession.flipped ? "" : "hidden"}>
        <p class="rating-prompt">Bạn nhớ từ này ở mức nào?</p>
        <div class="rating-buttons">
          <button class="rating-button" type="button" data-action="rate-card" data-rating="again">Quên rồi<small>Ôn lại sớm</small></button>
          <button class="rating-button" type="button" data-action="rate-card" data-rating="hard">Hơi khó<small>Nhắc lại ngày mai</small></button>
          <button class="rating-button" type="button" data-action="rate-card" data-rating="good">Nhớ rồi<small>Tăng khoảng ôn</small></button>
        </div>
      </div>
    </section>
  `;
}

function flipCard() {
  if (!flashcardSession) return;
  flashcardSession.flipped = !flashcardSession.flipped;
  renderFlashcards();
}

function rateCard(rating) {
  if (!flashcardSession || !["again", "hard", "good"].includes(rating)) return;
  const word = flashcardSession.deck[flashcardSession.index];
  const old = getProgress(word.id);
  let box = old.box;
  let due;
  let xp;

  if (rating === "again") {
    box = 0;
    due = Date.now() + 10 * 60 * 1000;
    xp = 3;
  } else if (rating === "hard") {
    box = Math.max(1, old.box);
    due = Date.now() + DAY_MS;
    xp = 6;
  } else {
    box = Math.min(REVIEW_INTERVALS.length - 1, old.box + 1);
    due = Date.now() + REVIEW_INTERVALS[box] * DAY_MS;
    xp = 10;
  }

  setProgress(word.id, {
    seen: true,
    box,
    due,
    reviews: old.reviews + 1,
    lastReviewed: Date.now(),
  });
  state.stats.flashcards += 1;
  flashcardSession.ratings[rating] += 1;
  flashcardSession.xp += xp;
  recordStudy({ wordId: word.id, xp, type: "flashcard" });
  flashcardSession.index += 1;
  flashcardSession.flipped = false;
  renderFlashcards();
}

function renderFlashcardComplete() {
  if (!flashcardSession.celebrated) {
    flashcardSession.celebrated = true;
    launchConfetti();
  }
  const total = flashcardSession.deck.length;
  main.innerHTML = `
    <section class="card session-complete">
      <div class="complete-icon" aria-hidden="true">🎉</div>
      <p class="eyebrow">Hoàn thành phiên học</p>
      <h2>Làm tốt lắm!</h2>
      <p>Bạn vừa đi thêm một bước nhỏ nhưng rất đáng giá.</p>
      <div class="complete-stats">
        <div class="complete-stat"><strong>${total}</strong><small>Thẻ đã học</small></div>
        <div class="complete-stat"><strong>${flashcardSession.ratings.good}</strong><small>Từ nhớ tốt</small></div>
        <div class="complete-stat"><strong>+${flashcardSession.xp}</strong><small>XP nhận được</small></div>
      </div>
      <div class="complete-actions">
        <button class="secondary-button" type="button" data-page="learn">Về bài học</button>
        <button class="primary-button" type="button" data-action="start-quiz">${icon("spark")} Làm quiz 10 câu</button>
      </div>
    </section>
  `;
}

function startQuiz() {
  const seen = getSeenWords();
  const pool = seen.length >= 8 ? seen : getLessonWords(1);
  const targets = shuffle(pool).slice(0, Math.min(10, pool.length));
  const types = ["meaning", "hanzi", "listening"];
  quizSession = {
    questions: targets.map((word, index) => buildQuestion(word, types[index % types.length], pool)),
    index: 0,
    score: 0,
    xp: 0,
    answered: null,
    celebrated: false,
  };
  navigate("quiz", { updateHash: false });
  if (quizSession.questions[0]?.type === "listening") {
    setTimeout(() => speakWord(quizSession.questions[0].target.id), 180);
  }
}

function buildQuestion(target, type, pool) {
  const otherPool = VOCABULARY.filter((word) => word.id !== target.id);
  const preferred = otherPool.filter((word) => word.lesson === target.lesson);
  const candidates = shuffle([...preferred, ...shuffle(otherPool)]);
  const distractors = [];
  const seenValues = new Set([
    type === "meaning" ? target.meaning : target.hanzi,
  ]);

  for (const candidate of candidates) {
    const value = type === "meaning" ? candidate.meaning : candidate.hanzi;
    if (!seenValues.has(value)) {
      distractors.push(candidate);
      seenValues.add(value);
    }
    if (distractors.length === 3) break;
  }

  const options = shuffle([target, ...distractors]).map((word) => ({
    id: word.id,
    label: type === "meaning" ? word.meaning : word.hanzi,
  }));

  return { target, type, options, poolSize: pool.length };
}

function renderQuiz() {
  if (!quizSession) {
    renderReview();
    return;
  }

  if (quizSession.index >= quizSession.questions.length) {
    renderQuizComplete();
    return;
  }

  const question = quizSession.questions[quizSession.index];
  const progress = Math.round((quizSession.index / quizSession.questions.length) * 100);
  const answered = quizSession.answered;
  const prompt = quizPrompt(question);
  const typeLabel = question.type === "meaning" ? "Chọn nghĩa" : question.type === "hanzi" ? "Nhận mặt chữ" : "Luyện nghe";
  const typeIcon = question.type === "listening" ? "🎧" : question.type === "hanzi" ? "字" : "译";

  main.innerHTML = `
    <section class="quiz-shell">
      <div class="study-topline">
        <button class="icon-button" type="button" data-page="review" aria-label="Thoát quiz">${icon("close")}</button>
        <div class="mini-progress" aria-label="Tiến độ ${progress}%"><span style="--progress: ${progress}%"></span></div>
        <span class="study-count">${quizSession.index + 1}/${quizSession.questions.length}</span>
      </div>
      <article class="card quiz-card">
        <span class="quiz-type"><span aria-hidden="true">${typeIcon}</span> ${typeLabel}</span>
        <div class="quiz-question">${prompt}</div>
        <div class="quiz-options">
          ${question.options.map((option, index) => {
            const isCorrect = answered && option.id === question.target.id;
            const isWrong = answered && option.id === answered.selectedId && !answered.correct;
            return `<button class="quiz-option ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""}" type="button" data-action="answer-quiz" data-word="${option.id}" ${answered ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span class="${question.type === "meaning" ? "" : "option-hanzi"}">${escapeHtml(option.label)}</span></button>`;
          }).join("")}
        </div>
        ${answered ? renderQuizFeedback(question, answered) : ""}
      </article>
    </section>
  `;
}

function quizPrompt(question) {
  if (question.type === "meaning") {
    return `<p>“${state.showPinyin ? escapeHtml(question.target.pinyin) : "Từ này"}”</p><h2 class="quiz-hanzi">${question.target.hanzi}</h2>`;
  }
  if (question.type === "hanzi") {
    return `<p>Chọn chữ Hán có nghĩa</p><h2>“${escapeHtml(question.target.meaning)}”</h2>`;
  }
  return `<p>Nhấn loa rồi chọn từ bạn nghe thấy</p><button class="listen-button" type="button" data-action="speak" data-word="${question.target.id}" aria-label="Nghe từ cần chọn">${icon("volume")}</button>`;
}

function renderQuizFeedback(question, answered) {
  return `
    <div class="quiz-feedback">
      <span class="feedback-icon" aria-hidden="true">${answered.correct ? "✓" : "↗"}</span>
      <div><strong>${answered.correct ? "Chính xác!" : `Đáp án: ${question.target.hanzi}`}</strong><small>${escapeHtml(question.target.pinyin)} · ${escapeHtml(question.target.meaning)}</small></div>
      <button class="primary-button" type="button" data-action="next-question">${quizSession.index + 1 === quizSession.questions.length ? "Xem kết quả" : "Tiếp theo"}</button>
    </div>
  `;
}

function answerQuiz(selectedId) {
  if (!quizSession || quizSession.answered) return;
  const question = quizSession.questions[quizSession.index];
  const correct = selectedId === question.target.id;
  const old = getProgress(question.target.id);
  const xp = correct ? 12 : 2;

  setProgress(question.target.id, {
    seen: true,
    box: correct ? Math.max(1, old.box) : Math.max(0, old.box - 1),
    due: correct ? Date.now() + DAY_MS : Date.now(),
    reviews: old.reviews + 1,
    correct: old.correct + (correct ? 1 : 0),
    wrong: old.wrong + (correct ? 0 : 1),
    lastReviewed: Date.now(),
  });

  state.stats.quizAnswers += 1;
  state.stats.correct += correct ? 1 : 0;
  state.stats.wrong += correct ? 0 : 1;
  quizSession.score += correct ? 1 : 0;
  quizSession.xp += xp;
  quizSession.answered = { selectedId, correct };
  recordStudy({ wordId: question.target.id, xp, type: "quiz" });
  if (correct) speakWord(question.target.id);
  renderQuiz();
}

function nextQuizQuestion() {
  if (!quizSession?.answered) return;
  quizSession.index += 1;
  quizSession.answered = null;
  renderQuiz();
  const next = quizSession.questions[quizSession.index];
  if (next?.type === "listening") setTimeout(() => speakWord(next.target.id), 120);
}

function renderQuizComplete() {
  if (!quizSession.celebrated && quizSession.score >= Math.ceil(quizSession.questions.length * 0.7)) {
    quizSession.celebrated = true;
    launchConfetti();
  }
  const total = quizSession.questions.length;
  const percent = Math.round((quizSession.score / total) * 100);
  const message = percent >= 90 ? "Xuất sắc, phản xạ rất tốt!" : percent >= 70 ? "Ổn lắm, bạn đang nhớ khá chắc." : "Không sao, ôn lại thẻ rồi thử tiếp nhé.";

  main.innerHTML = `
    <section class="card session-complete">
      <div class="complete-icon" aria-hidden="true">${percent >= 70 ? "🏆" : "🌱"}</div>
      <p class="eyebrow">Kết quả quiz</p>
      <h2>${quizSession.score}/${total} câu đúng</h2>
      <p>${message}</p>
      <div class="complete-stats">
        <div class="complete-stat"><strong>${percent}%</strong><small>Độ chính xác</small></div>
        <div class="complete-stat"><strong>${total - quizSession.score}</strong><small>Câu cần ôn</small></div>
        <div class="complete-stat"><strong>+${quizSession.xp}</strong><small>XP nhận được</small></div>
      </div>
      <div class="complete-actions">
        <button class="secondary-button" type="button" data-page="review">Về ôn tập</button>
        <button class="primary-button" type="button" data-action="start-quiz">${icon("refresh")} Thử lại</button>
      </div>
    </section>
  `;
}

function renderWords() {
  main.innerHTML = `
    <div class="section-header">
      <div><h2>Kho từ HSK 1 khởi động</h2><p>Tìm bằng chữ Hán, pinyin hoặc nghĩa tiếng Việt.</p></div>
    </div>
    <section class="word-toolbar" aria-label="Bộ lọc từ vựng">
      <label class="search-wrap" aria-label="Tìm từ">
        ${icon("search")}
        <input class="search-input" id="word-search" type="search" placeholder="Ví dụ: 你好, nǐ hǎo, xin chào…" value="${escapeHtml(wordSearch)}" autocomplete="off" />
      </label>
      <select class="select-input" id="word-lesson-filter" aria-label="Lọc theo bài">
        <option value="all">Tất cả 6 bài</option>
        ${LESSONS.map((lesson) => `<option value="${lesson.id}" ${String(lesson.id) === wordLessonFilter ? "selected" : ""}>Bài ${lesson.id}: ${escapeHtml(lesson.title)}</option>`).join("")}
      </select>
      <button class="secondary-button ${favoritesOnly ? "is-active" : ""}" type="button" data-action="toggle-favorites">${icon("heart")} ${favoritesOnly ? "Đang xem yêu thích" : "Từ yêu thích"}</button>
    </section>
    <p class="word-count" id="word-count"></p>
    <section class="word-list" id="word-list" aria-label="Danh sách từ vựng"></section>
  `;
  updateWordResults();
}

function filteredWords() {
  const query = normalizeText(wordSearch.trim());
  return VOCABULARY.filter((word) => {
    const matchesLesson = wordLessonFilter === "all" || String(word.lesson) === wordLessonFilter;
    const matchesFavorite = !favoritesOnly || state.favorites.includes(word.id);
    const haystack = normalizeText(`${word.hanzi} ${word.pinyin} ${word.meaning} ${word.example}`);
    return matchesLesson && matchesFavorite && (!query || haystack.includes(query));
  });
}

function updateWordResults() {
  const list = document.querySelector("#word-list");
  const count = document.querySelector("#word-count");
  if (!list || !count) return;
  const words = filteredWords();
  count.textContent = `Hiển thị ${words.length}/${VOCABULARY.length} từ`;

  if (!words.length) {
    list.innerHTML = `<div class="card empty-state"><span>🔎</span><h3>Không tìm thấy từ phù hợp</h3><p>Thử từ khóa khác hoặc bỏ bớt bộ lọc nhé.</p></div>`;
    return;
  }

  list.innerHTML = words.map((word) => {
    const favorite = state.favorites.includes(word.id);
    return `
      <article class="word-row">
        <strong class="word-row-hanzi">${word.hanzi}</strong>
        <span class="word-row-pinyin">${state.showPinyin ? escapeHtml(word.pinyin) : "Pinyin đang ẩn"}</span>
        <span class="word-row-meaning">${escapeHtml(word.meaning)}</span>
        <span class="word-row-actions">
          <button class="small-icon-button" type="button" data-action="speak" data-word="${word.id}" aria-label="Nghe ${word.hanzi}">${icon("volume")}</button>
          <button class="small-icon-button ${favorite ? "is-favorite" : ""}" type="button" data-action="favorite" data-word="${word.id}" aria-label="${favorite ? "Bỏ yêu thích" : "Thêm yêu thích"} ${word.hanzi}">${icon("heart", favorite)}</button>
        </span>
      </article>
    `;
  }).join("");
}

function toggleFavorite(wordId) {
  if (!getWord(wordId)) return;
  const index = state.favorites.indexOf(wordId);
  if (index >= 0) {
    state.favorites.splice(index, 1);
    showToast("Đã bỏ khỏi danh sách yêu thích.", "♡");
  } else {
    state.favorites.push(wordId);
    showToast("Đã thêm vào danh sách yêu thích.", "♥");
  }
  saveState();
  if (currentPage === "words") updateWordResults();
}

function renderWrite() {
  const selected = getWord(selectedWritingId) || WRITING_WORDS[0];
  selectedWritingId = selected.id;
  main.innerHTML = `
    <div class="section-header">
      <div><h2>Tập viết trên ô mễ tự</h2><p>Dùng chuột hoặc ngón tay viết đè theo chữ mẫu mờ.</p></div>
    </div>
    <section class="writing-layout">
      <article class="card writing-card">
        <div class="character-selector">
          <div class="character-info"><h2>${selected.hanzi} · ${state.showPinyin ? escapeHtml(selected.pinyin) : "Pinyin đang ẩn"}</h2><p>${escapeHtml(selected.meaning)}</p></div>
          <select class="select-input character-pick" id="writing-word-select" aria-label="Chọn chữ để luyện">
            ${WRITING_WORDS.map((word) => `<option value="${word.id}" ${word.id === selected.id ? "selected" : ""}>${word.hanzi} · ${escapeHtml(word.pinyin)}</option>`).join("")}
          </select>
        </div>
        <div class="writing-grid">
          <span class="guide-character" aria-hidden="true">${selected.hanzi}</span>
          <canvas id="writing-canvas" aria-label="Vùng luyện viết chữ ${selected.hanzi}"></canvas>
        </div>
        <div class="writing-actions">
          <button class="secondary-button" type="button" data-action="undo-stroke">${icon("undo")} Hoàn tác</button>
          <button class="secondary-button" type="button" data-action="clear-writing">${icon("trash")} Viết lại</button>
          <button class="primary-button" type="button" data-action="complete-writing">${icon("check")} Đã viết xong</button>
        </div>
      </article>
      <aside class="card writing-tip-card">
        <p class="eyebrow">Mẹo cho người mới</p>
        <h2>Viết chậm để nhớ hình chữ</h2>
        <p>Bản luyện này giúp làm quen mặt chữ và vận động tay; chưa chấm đúng sai thứ tự nét.</p>
        <div class="tip-list">
          <div class="tip-item"><span class="tip-number">1</span><span><strong>Nhìn tổng thể</strong><small>Quan sát chữ mẫu và vị trí trong bốn ô.</small></span></div>
          <div class="tip-item"><span class="tip-number">2</span><span><strong>Viết theo nét mờ</strong><small>Giữ chữ cân giữa, đừng vội viết thật nhanh.</small></span></div>
          <div class="tip-item"><span class="tip-number">3</span><span><strong>Nhẩm nghĩa và âm</strong><small>Đọc “${escapeHtml(selected.pinyin)} — ${escapeHtml(selected.meaning)}” khi viết.</small></span></div>
        </div>
        <button class="secondary-button" type="button" data-action="speak" data-word="${selected.id}">${icon("volume")} Nghe lại phát âm</button>
        <div class="writing-stats">
          <div class="writing-stat"><strong>${state.stats.writes}</strong><small>Lượt đã luyện</small></div>
          <div class="writing-stat"><strong>${WRITING_WORDS.length}</strong><small>Chữ đơn có sẵn</small></div>
        </div>
      </aside>
    </section>
  `;
  requestAnimationFrame(setupWritingCanvas);
}

function setupWritingCanvas() {
  const canvas = document.querySelector("#writing-canvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawWritingStrokes(context, rect.width);

  let drawing = false;
  let activeStroke = null;

  const pointFromEvent = (event) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    activeStroke = [pointFromEvent(event)];
    writingStrokes.push(activeStroke);
    drawWritingStrokes(context, rect.width);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drawing || !activeStroke) return;
    activeStroke.push(pointFromEvent(event));
    drawWritingStrokes(context, rect.width);
  });

  const finish = () => {
    drawing = false;
    activeStroke = null;
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
}

function drawWritingStrokes(context, size) {
  context.clearRect(0, 0, size, size);
  const color = getComputedStyle(document.documentElement).getPropertyValue("--primary-dark").trim() || "#9f2635";
  context.strokeStyle = color;
  context.lineWidth = Math.max(7, size * 0.021);
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const stroke of writingStrokes) {
    if (!stroke.length) continue;
    context.beginPath();
    context.moveTo(stroke[0].x, stroke[0].y);
    if (stroke.length === 1) {
      context.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
    } else {
      for (const point of stroke.slice(1)) context.lineTo(point.x, point.y);
    }
    context.stroke();
  }
}

function redrawWritingCanvas() {
  const canvas = document.querySelector("#writing-canvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const context = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawWritingStrokes(context, rect.width);
}

function completeWriting() {
  if (!writingStrokes.length) {
    showToast("Bạn hãy viết ít nhất một nét trước nhé.", "✎");
    return;
  }
  state.stats.writes += 1;
  const selected = getWord(selectedWritingId);
  recordStudy({ wordId: selected?.id, xp: 5, type: "write" });
  launchConfetti(18);
  showToast(`Đã lưu một lượt luyện chữ ${selected?.hanzi || "Hán"}. +5 XP`, "✓");
  writingStrokes = [];
  renderWrite();
}

function speakWord(wordId) {
  if (!state.sound) {
    showToast("Âm thanh đang tắt trong cài đặt.", "🔇");
    return;
  }
  const word = getWord(wordId);
  if (!word || !("speechSynthesis" in window)) {
    showToast("Thiết bị này chưa hỗ trợ đọc phát âm.", "!");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.hanzi);
  utterance.lang = "zh-CN";
  utterance.rate = 0.78;
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const chineseVoice = voices.find((voice) => /^zh(-|_)/i.test(voice.lang));
  if (chineseVoice) utterance.voice = chineseVoice;
  window.speechSynthesis.speak(utterance);
}

function bindGlobalEvents() {
  document.addEventListener("click", (event) => {
    const openSettings = event.target.closest("[data-open-settings]");
    if (openSettings) {
      openSettingsDialog();
      return;
    }

    const pageLink = event.target.closest("[data-page-link]");
    if (pageLink) {
      event.preventDefault();
      navigate(pageLink.dataset.pageLink);
      return;
    }

    const pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      navigate(pageButton.dataset.page);
      return;
    }

    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) return;
    const action = actionElement.dataset.action;

    if (action === "start-lesson") startFlashcards("lesson", actionElement.dataset.lesson);
    if (action === "start-review") startFlashcards("review");
    if (action === "flip-card") flipCard();
    if (action === "rate-card") rateCard(actionElement.dataset.rating);
    if (action === "start-quiz") startQuiz();
    if (action === "answer-quiz") answerQuiz(actionElement.dataset.word);
    if (action === "next-question") nextQuizQuestion();
    if (action === "speak") {
      event.stopPropagation();
      speakWord(actionElement.dataset.word);
    }
    if (action === "favorite") toggleFavorite(actionElement.dataset.word);
    if (action === "toggle-favorites") {
      favoritesOnly = !favoritesOnly;
      renderWords();
    }
    if (action === "undo-stroke") {
      writingStrokes.pop();
      redrawWritingCanvas();
    }
    if (action === "clear-writing") {
      writingStrokes = [];
      redrawWritingCanvas();
    }
    if (action === "complete-writing") completeWriting();
  });

  document.addEventListener("keydown", (event) => {
    const card = event.target.closest?.('[data-action="flip-card"]');
    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      flipCard();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "word-search") {
      wordSearch = event.target.value;
      updateWordResults();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "word-lesson-filter") {
      wordLessonFilter = event.target.value;
      updateWordResults();
    }
    if (event.target.id === "writing-word-select") {
      selectedWritingId = event.target.value;
      writingStrokes = [];
      renderWrite();
    }
  });

  window.addEventListener("popstate", () => {
    currentPage = routeFromHash();
    render();
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    if (currentPage !== "write") return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setupWritingCanvas, 140);
  });

  settingsForm.addEventListener("submit", (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const formData = new FormData(settingsForm);
    state.profileName = String(formData.get("profileName") || "Bạn").trim().slice(0, 24) || "Bạn";
    state.dailyGoal = Number(formData.get("dailyGoal")) || 10;
    state.showPinyin = settingsForm.elements.showPinyin.checked;
    state.sound = settingsForm.elements.sound.checked;
    state.darkMode = settingsForm.elements.darkMode.checked;
    saveState();
    applyTheme();
    settingsDialog.close();
    updateShell();
    render();
    showToast("Đã lưu cài đặt của bạn.", "✓");
  });

  document.querySelector("#reset-progress").addEventListener("click", () => {
    const confirmed = window.confirm("Xóa toàn bộ XP, chuỗi ngày, kết quả quiz và tiến độ từ vựng? Cài đặt cá nhân vẫn được giữ lại.");
    if (!confirmed) return;
    const preferences = {
      profileName: state.profileName,
      dailyGoal: state.dailyGoal,
      showPinyin: state.showPinyin,
      sound: state.sound,
      darkMode: state.darkMode,
    };
    state = { ...defaultState(), ...preferences };
    flashcardSession = null;
    quizSession = null;
    writingStrokes = [];
    saveState();
    settingsDialog.close();
    navigate("home");
    showToast("Đã xóa tiến độ học tập.", "↺");
  });
}

function openSettingsDialog() {
  settingsForm.elements.profileName.value = state.profileName;
  const goalInput = settingsForm.querySelector(`input[name="dailyGoal"][value="${state.dailyGoal}"]`);
  if (goalInput) goalInput.checked = true;
  settingsForm.elements.showPinyin.checked = state.showPinyin;
  settingsForm.elements.sound.checked = state.sound;
  settingsForm.elements.darkMode.checked = state.darkMode;
  settingsDialog.showModal();
}

function setupPwa() {
  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Ứng dụng vẫn hoạt động online nếu trình duyệt chặn service worker.
      });
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    document.querySelector("#install-button").hidden = false;
  });

  document.querySelector("#install-button").addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    document.querySelector("#install-button").hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    showToast("HanziGo đã được cài trên thiết bị.", "✓");
  });
}

function setupConnectivity() {
  const update = () => {
    offlineBanner.hidden = navigator.onLine;
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

function showToast(message, symbol = "✦") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span aria-hidden="true">${escapeHtml(symbol)}</span><span>${escapeHtml(message)}</span>`;
  toastRegion.append(toast);
  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 240);
  }, 2400);
}

function launchConfetti(count = 42) {
  const colors = ["#c93645", "#f1b747", "#5fae94", "#5c8ecb", "#f08b72"];
  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--fall-time", `${1.8 + Math.random() * 1.6}s`);
    piece.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    confettiLayer.append(piece);
    setTimeout(() => piece.remove(), 3800);
  }
}

function shuffle(items) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name, filled = false) {
  const icons = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6Z" /></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1-8.2 5.3M3 3v6h6" /></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" /></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>',
    rotate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h12a4 4 0 0 1 0 8H8m0 0 3-3m-3 3 3 3" /></svg>',
    volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 4V6L8 10Zm10-1a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10" /></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>',
    heart: `<svg viewBox="0 0 24 24" aria-hidden="true" ${filled ? 'style="fill:currentColor"' : ""}><path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/></svg>`,
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8 4 12l5 4v-3h5a5 5 0 0 1 5 5v1m-10-6" /></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m2 0-1 14H8L7 7m3 4v6m4-6v6" /></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>',
  };
  return icons[name] || "";
}
