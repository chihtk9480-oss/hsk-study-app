import {
  LESSONS,
  VOCABULARY,
  WRITING_WORDS,
  getLessonWords,
  getWord,
  getCourseLesson,
} from "./data.js";
import { alignChinese, normalizeChinese, similarityScore } from "./practice.js";

const STORAGE_KEY = "hanzigo-state-v1";
const DAY_MS = 86_400_000;
const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30];

const STANDARD_HSK_BLUEPRINTS = {
  1: {
    total: 40, minutes: 40, testMinutes: 35, maxScore: 200, passScore: 120,
    sections: [
      { key: "listening", label: "Nghe", icon: "🎧", count: 20, parts: [
        ["listen-picture-judge", 5, "Phần 1", "Nghe cụm từ và phán đoán hình ảnh đúng hay sai"],
        ["listen-picture-choice", 5, "Phần 2", "Nghe câu và chọn hình ảnh phù hợp"],
        ["listen-dialogue-picture", 5, "Phần 3", "Nghe hội thoại và chọn hình ảnh phù hợp"],
        ["listen-response", 5, "Phần 4", "Nghe câu hỏi và chọn câu trả lời"],
      ] },
      { key: "reading", label: "Đọc", icon: "阅", count: 20, parts: [
        ["read-picture-judge", 5, "Phần 1", "Đối chiếu từ hoặc câu với hình ảnh"],
        ["read-picture-choice", 5, "Phần 2", "Đọc câu và chọn hình ảnh phù hợp"],
        ["read-match", 5, "Phần 3", "Ghép câu hỏi với câu trả lời"],
        ["read-fill", 5, "Phần 4", "Chọn từ thích hợp điền vào chỗ trống"],
      ] },
    ],
  },
  2: {
    total: 60, minutes: 55, testMinutes: 50, maxScore: 200, passScore: 120,
    sections: [
      { key: "listening", label: "Nghe", icon: "🎧", count: 35, parts: [
        ["listen-picture-judge", 10, "Phần 1", "Nghe câu và phán đoán hình ảnh đúng hay sai"],
        ["listen-picture-choice", 10, "Phần 2", "Nghe hội thoại và chọn hình ảnh phù hợp"],
        ["listen-dialogue-choice", 10, "Phần 3", "Nghe hội thoại ngắn và chọn đáp án"],
        ["listen-long-dialogue", 5, "Phần 4", "Nghe hội thoại dài hơn và chọn đáp án"],
      ] },
      { key: "reading", label: "Đọc", icon: "阅", count: 25, parts: [
        ["read-picture-choice", 5, "Phần 1", "Đọc câu và chọn hình ảnh phù hợp"],
        ["read-fill", 5, "Phần 2", "Chọn từ thích hợp điền vào chỗ trống"],
        ["read-judge", 5, "Phần 3", "Phán đoán hai câu có phù hợp hay không"],
        ["read-match", 10, "Phần 4", "Ghép câu hỏi hoặc câu nói với câu trả lời"],
      ] },
    ],
  },
  3: {
    total: 80, minutes: 90, testMinutes: 85, maxScore: 300, passScore: 180,
    sections: [
      { key: "listening", label: "Nghe", icon: "🎧", count: 40, parts: [
        ["listen-dialogue-picture", 10, "Phần 1", "Nghe hội thoại và chọn hình ảnh phù hợp"],
        ["listen-judge", 10, "Phần 2", "Nghe nội dung và phán đoán câu cho sẵn"],
        ["listen-dialogue-choice", 10, "Phần 3", "Nghe hội thoại ngắn và chọn đáp án"],
        ["listen-long-dialogue", 10, "Phần 4", "Nghe hội thoại dài hơn và chọn đáp án"],
      ] },
      { key: "reading", label: "Đọc", icon: "阅", count: 30, parts: [
        ["read-match", 10, "Phần 1", "Ghép câu nói với câu trả lời"],
        ["read-fill", 10, "Phần 2", "Chọn từ thích hợp điền vào chỗ trống"],
        ["read-passage", 10, "Phần 3", "Đọc đoạn ngắn và chọn đáp án"],
      ] },
      { key: "writing", label: "Viết", icon: "✍", count: 10, parts: [
        ["write-reorder", 5, "Phần 1", "Sắp xếp các thành phần thành câu hoàn chỉnh"],
        ["write-character", 5, "Phần 2", "Viết chữ Hán theo pinyin"],
      ] },
    ],
  },
};

const PAGE_META = {
  home: ["Trang chủ", "HSK 1 · Bộ khởi động"],
  learn: ["Bài học", "45 bài · HSK 1 đến HSK 3"],
  lesson: ["Bài học 4 kỹ năng", "Nghe · nói · đọc · viết"],
  review: ["Ôn tập", "Nhớ lâu bằng lặp lại ngắt quãng"],
  exams: ["Trung tâm luyện thi", "Đề mô phỏng · bấm giờ · lưu kết quả"],
  words: ["Từ vựng", "Tra cứu nhanh bộ từ đang học"],
  write: ["Luyện viết", "Viết chữ Hán trên ô mễ tự"],
  practice: ["Luyện nghe & nói", "Chép chính tả · speaking sửa phát âm"],
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
let selectedWritingLesson = 1;
let activeWritingCharacter = 0;
let writingReturnPage = null;
let writingMode = "course";
let lookupImeValue = "";
let lookupDirectValue = "";
let lookupHanzi = "学";
let lookupCharacterIndex = 0;
let writingStrokes = [];
let installPrompt = null;
let selectedLevel = 1;
let selectedExamLevel = 1;
let selectedExamCategory = "standard";
let selectedCourseLessonId = 1;
let activeLessonSkill = "listen";
let practiceMode = "dictation";
let practiceLevel = 1;
let practiceContent = "words";
let dictationSession = null;
let speakingSession = null;
let activeRecognition = null;
let hanziWriter = null;
let examTimer = null;
let chineseVoices = [];

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
  mistakeWords: {},
  examHistory: [],
  stats: {
    flashcards: 0,
    quizAnswers: 0,
    writes: 0,
    correct: 0,
    wrong: 0,
    dictationAttempts: 0,
    dictationCorrect: 0,
    speakingAttempts: 0,
    speakingBest: 0,
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
setupSpeechVoices();

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
      examHistory: Array.isArray(stored.examHistory) ? stored.examHistory : [],
      mistakeWords: stored.mistakeWords && typeof stored.mistakeWords === "object"
        ? stored.mistakeWords
        : Object.fromEntries(Object.entries(stored.progress || {}).filter(([, item]) => item?.wrong > 0).map(([id, item]) => [id, { count: item.wrong, lastWrong: item.lastReviewed || Date.now() }])),
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

function recordMistake(wordId) {
  if (!getWord(wordId)) return;
  const current = state.mistakeWords[wordId] || { count: 0, lastWrong: 0 };
  state.mistakeWords[wordId] = { count: current.count + 1, lastWrong: Date.now() };
}

function getMistakeWords() {
  return Object.entries(state.mistakeWords)
    .sort(([, a], [, b]) => (b.lastWrong || 0) - (a.lastWrong || 0))
    .map(([id]) => getWord(id))
    .filter(Boolean);
}

function removeMistake(wordId) {
  delete state.mistakeWords[wordId];
  saveState();
  showToast("Đã đánh dấu từ này là đã nhớ.", "✓");
  if (currentPage === "review") renderReview();
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
  return LESSONS.find((lesson) => {
    const stats = lessonStats(lesson.id);
    return stats.seen < stats.total;
  }) || LESSONS[0];
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
  return ["home", "learn", "review", "exams", "words", "write", "practice"].includes(route)
    ? route
    : "home";
}

function navigate(page, { updateHash = true } = {}) {
  if (page !== "quiz" && examTimer) {
    clearInterval(examTimer);
    examTimer = null;
  }
  if (page !== "practice" && activeRecognition) {
    activeRecognition.abort?.();
    activeRecognition = null;
  }
  currentPage = PAGE_META[page] ? page : "home";
  if (updateHash && ["home", "learn", "review", "exams", "words", "write", "practice"].includes(page)) {
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
    const activePage = ["flashcards", "lesson"].includes(currentPage) ? "learn" : currentPage === "quiz" ? (["exam", "standard"].includes(quizSession?.mode) ? "exams" : "review") : currentPage;
    button.classList.toggle("is-active", button.dataset.page === activePage);
    if (button.classList.contains("nav-item")) {
      button.setAttribute("aria-current", button.dataset.page === activePage ? "page" : "false");
    }
  });

  switch (currentPage) {
    case "learn":
      renderLearn();
      break;
    case "lesson":
      renderCourseLesson();
      break;
    case "review":
      renderReview();
      break;
    case "exams":
      renderExams();
      break;
    case "words":
      renderWords();
      break;
    case "write":
      renderWrite();
      break;
    case "practice":
      renderPractice();
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

    <section class="home-practice-grid">
      <article class="card home-practice-card dictation"><span>🎧</span><div><small>Nghe chủ động</small><h3>Chép chính tả từng chữ</h3><p>Nghe từ hoặc câu HSK rồi gõ lại bằng Pinyin.</p></div><button class="secondary-button" type="button" data-action="open-practice" data-mode="dictation">Luyện nghe →</button></article>
      <article class="card home-practice-card speaking"><span>🎙</span><div><small>Speaking game</small><h3>Nói để máy chấm</h3><p>Xem Chrome nghe bạn thành chữ gì và sửa phần chưa rõ.</p></div><button class="secondary-button" type="button" data-action="open-practice" data-mode="speaking">Luyện nói →</button></article>
    </section>

    <section class="exam-promo card">
      <div><span class="exam-promo-kicker">模拟考试 · Đề mô phỏng</span><h2>Sẵn sàng kiểm tra trình độ?</h2><p>Làm đề HSK theo cấp độ, có đồng hồ và bảng kết quả lưu ngay trên thiết bị.</p></div>
      <button class="primary-button" type="button" data-page="exams">Vào trung tâm luyện thi →</button>
    </section>

    <div class="section-header">
      <div>
        <h2>Lộ trình HSK 1–3</h2>
        <p>45 bài theo trình tự, mỗi cấp độ gồm 15 bài nghe–nói–đọc–viết.</p>
      </div>
      <button class="inline-link" type="button" data-page="learn">Xem tất cả →</button>
    </div>
    <section class="lesson-grid" aria-label="Các bài học">
      ${LESSONS.slice(0, 4).map(renderLessonCard).join("")}
    </section>
  `;
}

function practiceTargets(level = practiceLevel, content = practiceContent) {
  if (content === "sentences") {
    return LESSONS
      .filter((lesson) => lesson.level === Number(level))
      .flatMap((lesson) => lesson.dialogue.map((line, lineIndex) => ({
        id: `lesson-${lesson.id}-line-${lineIndex}`,
        type: "sentence",
        text: line.hanzi,
        pinyin: line.pinyin,
        meaning: line.meaning,
        lessonId: lesson.id,
        role: lineIndex % 2 === 0 ? "female" : "male",
      })));
  }
  return VOCABULARY
    .filter((word) => getCourseLesson(word.lesson)?.level === Number(level))
    .map((word) => ({
      id: word.id,
      wordId: word.id,
      type: "word",
      text: word.hanzi,
      pinyin: word.pinyin,
      meaning: word.meaning,
      lessonId: word.lesson,
      role: "narrator",
    }));
}

function renderPractice() {
  const dictationAccuracy = state.stats.dictationAttempts
    ? Math.round((state.stats.dictationCorrect / state.stats.dictationAttempts) * 100)
    : 0;
  main.innerHTML = `
    <section class="practice-page-head">
      <div><span class="skill-kicker">听 · 说 · Nghe và nói chủ động</span><h2>Phòng luyện phản xạ tiếng Trung</h2><p>Chép lại điều nghe được hoặc nói theo mẫu để biết máy đang nghe bạn thành chữ gì.</p></div>
      <div class="practice-mini-stats"><span><strong>${dictationAccuracy}%</strong><small>Chính tả</small></span><span><strong>${state.stats.speakingBest || 0}</strong><small>Speaking tốt nhất</small></span></div>
    </section>
    <section class="practice-mode-tabs" aria-label="Chọn kỹ năng luyện">
      <button type="button" class="${practiceMode === "dictation" ? "is-active" : ""}" data-action="select-practice-mode" data-mode="dictation"><span>🎧</span><strong>Nghe chép chính tả</strong><small>Nghe → gõ lại → sửa từng chữ</small></button>
      <button type="button" class="${practiceMode === "speaking" ? "is-active" : ""}" data-action="select-practice-mode" data-mode="speaking"><span>🎙</span><strong>Speaking Challenge</strong><small>Nghe mẫu → nói → xem lỗi nhận diện</small></button>
    </section>
    ${practiceMode === "dictation" ? renderDictationPractice() : renderSpeakingPractice()}
  `;
  requestAnimationFrame(() => {
    const answerEditor = document.querySelector("#dictation-answer-ime");
    if (answerEditor && dictationSession && answerEditor.value !== dictationSession.answer) answerEditor.value = dictationSession.answer || "";
  });
}

function renderPracticeSetup(kind) {
  const isDictation = kind === "dictation";
  const title = isDictation ? "Bắt đầu một vòng nghe chép" : "Bắt đầu Speaking Challenge";
  const description = isDictation
    ? "Mỗi vòng 10 câu. Đáp án chỉ hiện sau khi bạn nộp."
    : "Mỗi vòng 8 câu. Chrome sẽ dùng micro để nhận diện tiếng Trung bạn nói.";
  return `
    <section class="practice-setup card ${isDictation ? "is-dictation" : "is-speaking"}">
      <div class="practice-setup-copy"><span class="practice-setup-icon">${isDictation ? "听" : "说"}</span><div><span class="skill-kicker">${isDictation ? "Dictation Lab" : "Pronunciation Game"}</span><h2>${title}</h2><p>${description}</p></div></div>
      <div class="practice-choice-block"><strong>1. Chọn cấp độ</strong><div class="practice-level-buttons">${[1, 2, 3].map((level) => `<button type="button" data-action="select-practice-level" data-level="${level}" class="${practiceLevel === level ? "is-active" : ""}">HSK ${level}<small>${practiceTargets(level, practiceContent).length} mục</small></button>`).join("")}</div></div>
      <div class="practice-choice-block"><strong>2. Chọn nội dung</strong><div class="practice-content-buttons"><button type="button" data-action="select-practice-content" data-content="words" class="${practiceContent === "words" ? "is-active" : ""}"><span>字</span><b>Từ vựng</b><small>Ngắn, tập trung mặt chữ</small></button><button type="button" data-action="select-practice-content" data-content="sentences" class="${practiceContent === "sentences" ? "is-active" : ""}"><span>句</span><b>Câu hội thoại</b><small>Nghe và nói theo ngữ cảnh</small></button></div></div>
      <button class="primary-button practice-start-button" type="button" data-action="${isDictation ? "start-dictation" : "start-speaking-game"}">${isDictation ? "🎧 Bắt đầu 10 câu" : "🎙 Bắt đầu 8 lượt"}</button>
      ${isDictation ? "" : `<p class="speech-privacy-note">🔒 Âm thanh được trình duyệt gửi tới dịch vụ nhận diện giọng nói của thiết bị/trình duyệt; HanziGo không tự lưu bản ghi âm.</p>`}
    </section>
  `;
}

function renderDictationPractice() {
  if (!dictationSession) return renderPracticeSetup("dictation");
  if (dictationSession.finished) return renderDictationComplete();
  const target = dictationSession.targets[dictationSession.index];
  const feedback = dictationSession.feedback;
  const progress = Math.round(((dictationSession.index + (feedback ? 1 : 0)) / dictationSession.targets.length) * 100);
  return `
    <section class="practice-session card">
      <div class="practice-session-top"><button class="text-button" type="button" data-action="exit-dictation">← Chọn lại</button><div class="practice-progress"><span style="--progress:${progress}%"></span></div><strong>${dictationSession.index + 1}/${dictationSession.targets.length}</strong></div>
      <div class="dictation-stage">
        <span class="practice-round-label">HSK ${dictationSession.level} · ${dictationSession.content === "words" ? "Từ vựng" : "Câu hội thoại"}</span>
        <div class="listening-orb" aria-hidden="true"><span>听</span><i></i><i></i><i></i></div>
        <h2>${feedback ? "Đối chiếu đáp án" : "Bạn nghe được gì?"}</h2>
        <p>${feedback ? "Màu đỏ là chữ bị thiếu hoặc chưa đúng." : "Nghe bao nhiêu lần tùy ý rồi gõ lại bằng bàn phím Pinyin."}</p>
        <div class="dictation-audio-actions"><button class="primary-button" type="button" data-action="play-dictation">${icon("volume")} Nghe bình thường</button><button class="secondary-button" type="button" data-action="play-dictation-slow">🐢 Nghe chậm</button>${feedback ? "" : `<button class="ghost-button" type="button" data-action="toggle-dictation-hint">💡 Gợi ý</button>`}</div>
        ${dictationSession.hint && !feedback ? `<div class="dictation-hint"><span>${target.type === "word" ? "Nghĩa" : "Ngữ cảnh"}</span><strong>${escapeHtml(target.meaning)}</strong><small>Đáp án có ${Array.from(normalizeChinese(target.text)).length} chữ Hán.</small></div>` : ""}
      </div>
      ${feedback ? renderDictationFeedback(target, feedback) : `
        <div class="dictation-input-card">
          <label for="dictation-answer-ime">Gõ chữ Hán bạn nghe được</label>
          <pinyin-ime-editor id="dictation-answer-ime" value="${escapeHtml(dictationSession.answer || "")}" editor-type="input" page-size="9" popup-position="bottom" placeholder="Gõ Pinyin rồi bấm Space để chọn chữ…" autocomplete="off"></pinyin-ime-editor>
          <small>Ví dụ: gõ <b>nihao</b> → chọn <b>你好</b>. Dấu câu không ảnh hưởng kết quả.</small>
          <button class="primary-button" type="button" data-action="submit-dictation">Kiểm tra đáp án</button>
        </div>
      `}
    </section>
  `;
}

function renderAlignmentRows(alignment) {
  const expectedTokens = alignment.operations
    .filter((operation) => operation.type !== "extra")
    .map((operation) => `<span class="alignment-token ${operation.type === "match" ? "is-match" : "is-error"}">${escapeHtml(operation.expected)}</span>`)
    .join("");
  const actualTokens = alignment.operations
    .map((operation) => {
      if (operation.type === "missing") return `<span class="alignment-token is-missing">＿</span>`;
      return `<span class="alignment-token ${operation.type === "match" ? "is-match" : operation.type === "extra" ? "is-extra" : "is-error"}">${escapeHtml(operation.actual)}</span>`;
    })
    .join("");
  return `<div class="alignment-row"><small>Đáp án</small><div>${expectedTokens}</div></div><div class="alignment-row"><small>Bạn nhập</small><div>${actualTokens || `<span class="alignment-token is-missing">＿</span>`}</div></div>`;
}

function renderDictationFeedback(target, feedback) {
  const wrongCharacters = [...new Set(feedback.alignment.operations.filter((item) => ["replace", "missing"].includes(item.type)).map((item) => item.expected))].join("、");
  return `
    <div class="dictation-feedback ${feedback.correct ? "is-correct" : "has-errors"}">
      <div class="feedback-score-orb"><strong>${feedback.similarity}%</strong><small>${feedback.correct ? "Chính xác" : "Độ khớp"}</small></div>
      <div class="dictation-feedback-main"><span class="skill-kicker">${feedback.correct ? "太好了 · Tuyệt lắm" : "Nghe lại phần màu đỏ"}</span><h2>${target.text}</h2>${state.showPinyin ? `<p class="practice-pinyin">${escapeHtml(target.pinyin)}</p>` : ""}<p>${escapeHtml(target.meaning)}</p><div class="alignment-board">${renderAlignmentRows(feedback.alignment)}</div>${wrongCharacters ? `<p class="correction-tip">🎯 Tập trung nghe lại: <strong>${wrongCharacters}</strong></p>` : ""}</div>
      <div class="dictation-feedback-actions">${target.wordId ? `<button class="secondary-button" type="button" data-action="open-writing-word" data-word="${target.wordId}">✍ Luyện viết từ này</button>` : ""}<button class="secondary-button" type="button" data-action="play-dictation">${icon("volume")} Nghe lại</button><button class="primary-button" type="button" data-action="next-dictation">${dictationSession.index + 1 === dictationSession.targets.length ? "Xem kết quả" : "Câu tiếp theo →"}</button></div>
    </div>
  `;
}

function renderDictationComplete() {
  const total = dictationSession.targets.length;
  const percent = Math.round((dictationSession.score / total) * 100);
  return `
    <section class="card practice-complete">
      <span class="complete-icon">${percent >= 80 ? "🏆" : percent >= 50 ? "🌟" : "🎧"}</span>
      <p class="eyebrow">Hoàn thành vòng chính tả</p><h2>${dictationSession.score}/${total} câu chính xác</h2><p>${percent >= 80 ? "Tai nghe và mặt chữ của bạn đang kết nối rất tốt." : "Những câu sai đã được giữ lại bên dưới để nghe lại."}</p>
      <div class="practice-result-number"><strong>${percent}%</strong><small>điểm chính tả</small></div>
      ${dictationSession.wrong.length ? `<div class="practice-mistake-list"><h3>${dictationSession.wrong.length} câu cần nghe lại</h3>${dictationSession.wrong.map((item) => `<article><div><strong>${item.target.text}</strong><small>${state.showPinyin ? `${escapeHtml(item.target.pinyin)} · ` : ""}${escapeHtml(item.target.meaning)}</small></div><button type="button" data-action="speak-practice-target" data-target="${escapeHtml(item.target.id)}">${icon("volume")}</button>${item.target.wordId ? `<button type="button" data-action="open-writing-word" data-word="${item.target.wordId}">✍</button>` : ""}</article>`).join("")}</div>` : ""}
      <div class="complete-actions"><button class="secondary-button" type="button" data-action="reset-dictation">Đổi cấp độ</button><button class="primary-button" type="button" data-action="restart-dictation">${icon("refresh")} Làm vòng mới</button><button class="secondary-button" type="button" data-action="select-practice-mode" data-mode="speaking">Chuyển sang Speaking →</button></div>
    </section>
  `;
}

function renderSpeakingPractice() {
  if (!speakingSession) return renderPracticeSetup("speaking");
  if (speakingSession.finished) return renderSpeakingComplete();
  const target = speakingSession.targets[speakingSession.index];
  const result = speakingSession.result;
  const progress = Math.round((speakingSession.index / speakingSession.targets.length) * 100);
  return `
    <section class="speaking-game card">
      <div class="practice-session-top"><button class="text-button" type="button" data-action="exit-speaking">← Chọn lại</button><div class="practice-progress"><span style="--progress:${progress}%"></span></div><strong>${speakingSession.index + 1}/${speakingSession.targets.length}</strong></div>
      <div class="speaking-scorebar"><span>⭐ <strong>${speakingSession.points}</strong> điểm</span><span>🔥 <strong>${speakingSession.streak}</strong> chuỗi tốt</span><span>HSK <strong>${speakingSession.level}</strong></span></div>
      <div class="speaking-prompt">
        <span class="practice-round-label">Hãy nói câu này</span>
        <h2 class="speaking-target-hanzi">${target.text}</h2>
        ${state.showPinyin ? `<p class="practice-pinyin speaking-target-pinyin">${escapeHtml(target.pinyin)}</p>` : ""}
        <p>${escapeHtml(target.meaning)}</p>
        <button class="secondary-button" type="button" data-action="listen-speaking-sample">${icon("volume")} Nghe mẫu</button>
      </div>
      <div class="speaking-mic-zone ${speakingSession.listening ? "is-listening" : ""}">
        <button class="speaking-mic-button" type="button" data-action="record-speaking" aria-label="${speakingSession.listening ? "Đang nghe" : "Bắt đầu nói"}" ${speakingSession.listening ? "disabled" : ""}><span>🎙</span><i></i><i></i></button>
        <strong id="speaking-status">${speakingSession.listening ? "Đang nghe… nói ngay nhé" : result ? "Muốn thử lại thì bấm micro lần nữa" : "Bấm micro rồi nói tự nhiên"}</strong>
        <small>Cho phép dùng micro khi Chrome hỏi. Nói trong một lần, không cần quá nhanh.</small>
      </div>
      ${speakingSession.error ? `<div class="speech-error"><strong>Chưa chấm được lần này</strong><p>${escapeHtml(speakingSession.error)}</p><button class="secondary-button" type="button" data-action="record-speaking">Thử mở micro lại</button><button class="text-button" type="button" data-action="skip-speaking">Bỏ qua câu này</button></div>` : ""}
      ${result ? renderSpeakingFeedback(target, result) : ""}
      <p class="speaking-disclaimer">Điểm phản ánh mức độ câu nói được Chrome nhận thành đúng chữ. App chưa thể kết luận chính xác bạn sai thanh điệu hay khẩu hình nào.</p>
    </section>
  `;
}

function speakingCorrection(target, result) {
  if (result.score === 100) return "Máy nhận đúng toàn bộ. Giờ thử nói lại liền mạch và tự nhiên hơn.";
  const syllables = String(target.pinyin || "").replace(/[.,!?;:，。！？；：]/g, "").split(/\s+/).filter(Boolean);
  const weak = result.alignment.operations
    .filter((operation) => ["replace", "missing"].includes(operation.type))
    .slice(0, 4)
    .map((operation) => `${operation.expected}${syllables[operation.expectedIndex] ? ` (${syllables[operation.expectedIndex]})` : ""}`);
  const focus = [...new Set(weak)].join(" · ");
  if (result.score >= 75) return `Khá gần rồi. Nghe mẫu chậm và nói rõ hơn phần: ${focus || "những chữ màu đỏ"}.`;
  return `Tách câu thành cụm ngắn, nói chậm và nhấn rõ từng âm: ${focus || "phần màu đỏ"}.`;
}

function renderSpeakingFeedback(target, result) {
  const stars = result.score >= 90 ? "★★★" : result.score >= 70 ? "★★☆" : result.score >= 45 ? "★☆☆" : "☆☆☆";
  return `
    <div class="speaking-feedback ${result.score >= 80 ? "is-good" : "needs-work"}">
      <div class="speaking-result-score"><strong>${result.score}</strong><small>/100</small><span>${stars}</span></div>
      <div class="speaking-result-copy"><span class="skill-kicker">Máy nghe được</span><h3>${escapeHtml(result.transcript || "—")}</h3><div class="alignment-board speaking-alignment">${renderAlignmentRows(result.alignment)}</div><p class="correction-tip">💬 ${escapeHtml(speakingCorrection(target, result))}</p></div>
      <div class="speaking-result-actions">${target.wordId ? `<button class="secondary-button" type="button" data-action="open-writing-word" data-word="${target.wordId}">✍ Luyện viết</button>` : ""}<button class="secondary-button" type="button" data-action="record-speaking">Nói lại</button><button class="primary-button" type="button" data-action="next-speaking">${speakingSession.index + 1 === speakingSession.targets.length ? "Xem kết quả" : "Nhận điểm & tiếp →"}</button></div>
    </div>
  `;
}

function renderSpeakingComplete() {
  const average = speakingSession.scores.length
    ? Math.round(speakingSession.scores.reduce((total, score) => total + score, 0) / speakingSession.scores.length)
    : 0;
  return `
    <section class="card practice-complete speaking-complete">
      <span class="complete-icon">${average >= 85 ? "🏆" : average >= 65 ? "🎙" : "🌱"}</span><p class="eyebrow">Speaking Challenge hoàn tất</p><h2>Trung bình ${average}/100</h2><p>${average >= 85 ? "Máy nhận câu nói của bạn rất rõ. Tiếp tục giữ nhịp tự nhiên nhé!" : "Nghe chậm, chia cụm và nói lại các chữ màu đỏ sẽ giúp điểm tăng nhanh nhất."}</p>
      <div class="speaking-final-grid"><div><strong>${speakingSession.points}</strong><small>Điểm game</small></div><div><strong>${Math.max(...speakingSession.scores, 0)}</strong><small>Lượt tốt nhất</small></div><div><strong>${speakingSession.bestStreak}</strong><small>Chuỗi tốt nhất</small></div></div>
      <div class="complete-actions"><button class="secondary-button" type="button" data-action="reset-speaking">Đổi cấp độ</button><button class="primary-button" type="button" data-action="restart-speaking">${icon("refresh")} Chơi vòng mới</button><button class="secondary-button" type="button" data-action="select-practice-mode" data-mode="dictation">Luyện chính tả →</button></div>
    </section>
  `;
}

function startDictationSession() {
  const pool = practiceTargets();
  dictationSession = {
    level: practiceLevel,
    content: practiceContent,
    targets: shuffle(pool).slice(0, Math.min(10, pool.length)),
    index: 0,
    score: 0,
    answer: "",
    feedback: null,
    hint: false,
    wrong: [],
    finished: false,
  };
  renderPractice();
  speakPracticeTarget(dictationSession.targets[0], 0.72);
}

function currentDictationTarget() {
  return dictationSession?.targets[dictationSession.index];
}

function speakPracticeTarget(target, rate = 0.72) {
  if (!target) return;
  speakChineseText(target.text, rate, null, { role: target.role || "narrator" });
}

function submitDictation() {
  if (!dictationSession || dictationSession.feedback) return;
  const editor = document.querySelector("#dictation-answer-ime");
  const answer = String(editor?.value ?? dictationSession.answer ?? "").trim();
  if (!normalizeChinese(answer)) {
    showToast("Bạn hãy gõ đáp án rồi mới kiểm tra nhé.", "听");
    editor?.focus?.();
    return;
  }
  const target = currentDictationTarget();
  const alignment = alignChinese(target.text, answer);
  const correct = alignment.expected === alignment.actual;
  const similarity = similarityScore(target.text, answer);
  dictationSession.answer = answer;
  dictationSession.feedback = { answer, alignment, correct, similarity };
  dictationSession.score += correct ? 1 : 0;
  state.stats.dictationAttempts += 1;
  if (correct) state.stats.dictationCorrect += 1;
  if (!correct) {
    dictationSession.wrong.push({ target, answer, similarity });
    if (target.wordId) recordMistake(target.wordId);
  }
  recordStudy({ wordId: target.wordId, xp: correct ? 10 : Math.max(2, Math.round(similarity / 20)), type: "dictation" });
  if (correct) launchConfetti(14);
  renderPractice();
}

function nextDictation() {
  if (!dictationSession?.feedback) return;
  if (dictationSession.index + 1 >= dictationSession.targets.length) {
    dictationSession.finished = true;
    renderPractice();
    return;
  }
  dictationSession.index += 1;
  dictationSession.answer = "";
  dictationSession.feedback = null;
  dictationSession.hint = false;
  renderPractice();
  speakPracticeTarget(currentDictationTarget(), 0.72);
}

function startSpeakingGame() {
  const pool = practiceTargets();
  speakingSession = {
    level: practiceLevel,
    content: practiceContent,
    targets: shuffle(pool).slice(0, Math.min(8, pool.length)),
    index: 0,
    result: null,
    error: null,
    listening: false,
    points: 0,
    streak: 0,
    bestStreak: 0,
    scores: [],
    finished: false,
  };
  renderPractice();
}

function startSpeakingRecognition() {
  const target = speakingSession?.targets[speakingSession.index];
  if (!target || speakingSession.listening) return;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    speakingSession.error = "Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Hãy mở app bằng Chrome trên máy tính hoặc Android để được chấm tự động.";
    renderPractice();
    return;
  }
  activeRecognition?.abort?.();
  const recognition = new Recognition();
  activeRecognition = recognition;
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;
  speakingSession.error = null;
  speakingSession.listening = true;
  renderPractice();

  recognition.onresult = (event) => {
    const alternatives = Array.from(event.results?.[0] || []).map((item) => ({ transcript: item.transcript || "", confidence: Number(item.confidence || 0) }));
    const best = alternatives
      .map((item) => ({ ...item, score: similarityScore(target.text, item.transcript) }))
      .sort((left, right) => right.score - left.score || right.confidence - left.confidence)[0] || { transcript: "", confidence: 0, score: 0 };
    speakingSession.result = {
      ...best,
      alignment: alignChinese(target.text, best.transcript),
    };
    speakingSession.listening = false;
    activeRecognition = null;
    if (best.score >= 85) launchConfetti(12);
    renderPractice();
  };
  recognition.onerror = (event) => {
    const messages = {
      "not-allowed": "Chrome đang chặn micro. Bấm biểu tượng ổ khóa cạnh thanh địa chỉ → Microphone → Cho phép, rồi thử lại.",
      "service-not-allowed": "Dịch vụ nhận diện giọng nói đang bị chặn trên thiết bị này.",
      "no-speech": "App chưa nghe thấy giọng nói. Đưa micro gần hơn và nói lại nhé.",
      network: "Dịch vụ nhận diện giọng nói cần mạng và đang chưa kết nối được.",
      audio_capture: "Không tìm thấy micro đang hoạt động trên thiết bị.",
    };
    speakingSession.error = messages[event.error] || "Chưa nhận diện được lần này. Hãy thử nói chậm và rõ hơn.";
    speakingSession.listening = false;
    activeRecognition = null;
    renderPractice();
  };
  recognition.onend = () => {
    if (!speakingSession) return;
    speakingSession.listening = false;
    if (activeRecognition === recognition) activeRecognition = null;
    if (currentPage === "practice" && practiceMode === "speaking") renderPractice();
  };
  try {
    recognition.start();
  } catch {
    speakingSession.listening = false;
    speakingSession.error = "Micro đang bận. Đợi một chút rồi bấm lại nhé.";
    activeRecognition = null;
    renderPractice();
  }
}

function acceptSpeakingResult({ skipped = false } = {}) {
  if (!speakingSession) return;
  const target = speakingSession.targets[speakingSession.index];
  const result = skipped
    ? { score: 0, transcript: "", alignment: alignChinese(target.text, "") }
    : speakingSession.result;
  if (!result) return;
  speakingSession.scores.push(result.score);
  const gained = Math.round(result.score / 10);
  speakingSession.points += gained;
  speakingSession.streak = result.score >= 75 ? speakingSession.streak + 1 : 0;
  speakingSession.bestStreak = Math.max(speakingSession.bestStreak, speakingSession.streak);
  state.stats.speakingAttempts += 1;
  state.stats.speakingBest = Math.max(state.stats.speakingBest || 0, result.score);
  recordStudy({ wordId: target.wordId, xp: gained, type: "speak" });
  if (speakingSession.index + 1 >= speakingSession.targets.length) {
    speakingSession.finished = true;
    renderPractice();
    return;
  }
  speakingSession.index += 1;
  speakingSession.result = null;
  speakingSession.error = null;
  renderPractice();
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
  const levelLessons = LESSONS.filter((lesson) => lesson.level === selectedLevel);
  const levelWords = VOCABULARY.filter((word) => getCourseLesson(word.lesson)?.level === selectedLevel);
  const learned = levelWords.filter((word) => getProgress(word.id).seen).length;
  const percent = Math.round((learned / Math.max(1, levelWords.length)) * 100);

  main.innerHTML = `
    <section class="course-level-tabs" aria-label="Chọn cấp độ HSK">
      ${[1, 2, 3].map((level) => `<button class="course-level-tab ${selectedLevel === level ? "is-active" : ""}" type="button" data-action="select-level" data-level="${level}"><span>HSK</span><strong>${level}</strong><small>15 bài</small></button>`).join("")}
    </section>
    <section class="card level-overview course-level-overview">
      <div class="level-number" aria-hidden="true">${["一", "二", "三"][selectedLevel - 1]}</div>
      <div class="level-copy">
        <p class="eyebrow">Đang học</p>
        <h2>HSK ${selectedLevel} · 15 bài theo trình tự</h2>
        <p>Hội thoại nguyên bản · ngữ pháp · audio TTS · luyện nói · đọc hiểu · thứ tự nét.</p>
      </div>
      <div class="level-progress">
        <div><span>Tiến độ cấp độ</span><strong>${learned}/${levelWords.length} từ</strong></div>
        <div class="mini-progress"><span style="--progress: ${percent}%"></span></div>
      </div>
    </section>

    <div class="section-header">
      <div><h2>Giáo trình HSK ${selectedLevel}</h2><p>Học lần lượt 15 bài; mỗi bài khoảng 15–20 phút.</p></div>
    </div>
    <section class="lesson-grid" aria-label="Danh sách bài học">
      ${levelLessons.map(renderLessonCard).join("")}
    </section>
  `;
}

function renderLessonCard(lesson) {
  const stats = lessonStats(lesson.id);
  const buttonLabel = stats.seen === 0 ? "Mở bài" : stats.seen === stats.total ? "Ôn lại" : "Học tiếp";
  return `
    <button class="lesson-card" type="button" data-action="start-lesson" data-lesson="${lesson.id}" data-color="${lesson.color}" aria-label="${buttonLabel} bài ${lesson.id}: ${escapeHtml(lesson.title)}">
      <span class="lesson-icon" aria-hidden="true">${lesson.emoji}</span>
      <span class="lesson-content">
        <span class="lesson-number">HSK ${lesson.level} · Bài ${lesson.unit} · ${stats.total} từ</span>
        <h3>${escapeHtml(lesson.title)}</h3>
        <p>${escapeHtml(lesson.subtitle)}</p>
        <span class="lesson-skill-pills"><i>听</i><i>说</i><i>读</i><i>写</i></span>
      </span>
      <span class="lesson-card-footer">
        <span class="mini-progress"><span style="--progress: ${stats.percent}%"></span></span>
        <span class="lesson-progress-label">${stats.seen}/${stats.total} · ${buttonLabel}</span>
      </span>
    </button>
  `;
}

function openCourseLesson(lessonId) {
  const lesson = getCourseLesson(lessonId) || LESSONS[0];
  selectedCourseLessonId = lesson.id;
  selectedLevel = lesson.level;
  activeLessonSkill = "listen";
  navigate("lesson", { updateHash: false });
}

function renderCourseLesson() {
  const lesson = getCourseLesson(selectedCourseLessonId) || LESSONS[0];
  const words = getLessonWords(lesson.id);
  const stats = lessonStats(lesson.id);
  const skillContent = {
    listen: `
      <div class="skill-panel-grid">
        <article class="dialogue-card">
          <div class="dialogue-heading"><div><span class="skill-kicker">🎧 Luyện nghe</span><h3>Hội thoại tình huống</h3></div><button class="audio-button is-large" type="button" data-action="play-dialogue">${icon("volume")}<span>Nghe cả bài</span></button></div>
          <p class="audio-note">Giọng Trung phổ thông từ thiết bị · có thể nghe từng câu.</p>
          ${lesson.dialogue.map((line, index) => `<button class="dialogue-line" type="button" data-action="play-line" data-line="${index}"><span class="speaker">${line.speaker}</span><span><strong>${line.hanzi}</strong>${state.showPinyin ? `<em>${escapeHtml(line.pinyin)}</em>` : ""}<small>${escapeHtml(line.meaning)}</small></span><i>${icon("volume")}</i></button>`).join("")}
        </article>
        <article class="listening-mission"><span class="mission-icon">🎯</span><h3>Nhiệm vụ nghe</h3><p>Nghe 2 lần không nhìn pinyin. Lần ba, chạm từng câu và nhại lại đúng nhịp.</p><div class="wave-bars" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--h:${22 + ((i * 17) % 64)}%"></i>`).join("")}</div></article>
      </div>`,
    speak: `
      <div class="speaking-lab">
        <div class="speaking-orb"><span>说</span><i></i><i></i><i></i></div>
        <div><span class="skill-kicker">🗣️ Shadowing</span><h3>Nói theo từng câu</h3><p>Nghe mẫu, giữ nhịp và nói lại. App sẽ dùng nhận dạng giọng nói nếu trình duyệt hỗ trợ.</p><blockquote>${lesson.dialogue[0].hanzi}<small>${state.showPinyin ? escapeHtml(lesson.dialogue[0].pinyin) : ""}</small></blockquote><div class="speaking-actions"><button class="secondary-button" type="button" data-action="play-line" data-line="0">${icon("volume")} Nghe mẫu</button><button class="primary-button pulse-button" type="button" data-action="practice-speaking">🎙 Bắt đầu nói</button></div><p class="speech-result" id="speech-result" aria-live="polite">Sẵn sàng khi bạn sẵn sàng.</p></div>
      </div>`,
    read: `
      <div class="reading-lab">
        <span class="skill-kicker">📖 Đọc hiểu</span><h3>Đọc theo vai A–B</h3>
        <div class="reading-paper">${lesson.dialogue.map((line) => `<p><b>${line.speaker}</b><span><strong>${line.hanzi}</strong>${state.showPinyin ? `<em>${escapeHtml(line.pinyin)}</em>` : ""}<small>${escapeHtml(line.meaning)}</small></span></p>`).join("")}</div>
        <div class="grammar-focus"><span>语法</span><div><small>Trọng tâm ngữ pháp</small><strong>${escapeHtml(lesson.grammar)}</strong></div></div>
      </div>`,
    write: `
      <div class="lesson-writing-preview">
        <div class="stroke-preview"><span>${Array.from(words[0]?.hanzi || "学")[0]}</span><i></i></div>
        <div><span class="skill-kicker">✍️ Luyện viết</span><h3>Xem thứ tự nét rồi viết theo</h3><p>Nét mẫu chạy lần lượt như video bạn gửi. Sau đó chuyển sang ô mễ tự để tự viết và chấm độ phủ nét.</p><button class="primary-button" type="button" data-action="lesson-write">Mở phòng luyện viết →</button></div>
      </div>`,
  }[activeLessonSkill];

  main.innerHTML = `
    <section class="course-lesson-hero" data-level="${lesson.level}">
      <button class="back-link" type="button" data-page="learn">← Giáo trình HSK ${lesson.level}</button>
      <div class="course-lesson-title"><span class="lesson-hero-emoji">${lesson.emoji}</span><div><p class="eyebrow">HSK ${lesson.level} · Bài ${lesson.unit}/15</p><h2>${escapeHtml(lesson.title)}</h2><p>${escapeHtml(lesson.subtitle)}</p></div><div class="lesson-ring" style="--progress:${stats.percent}%"><strong>${stats.percent}%</strong><small>từ vựng</small></div></div>
      <div class="course-skill-tabs" role="tablist" aria-label="Bốn kỹ năng">
        ${[["listen", "听", "Nghe"], ["speak", "说", "Nói"], ["read", "读", "Đọc"], ["write", "写", "Viết"]].map(([id, hanzi, label]) => `<button type="button" role="tab" aria-selected="${activeLessonSkill === id}" class="course-skill-tab ${activeLessonSkill === id ? "is-active" : ""}" data-action="lesson-skill" data-skill="${id}"><b>${hanzi}</b><span>${label}</span></button>`).join("")}
      </div>
    </section>
    <section class="card course-skill-panel">${skillContent}</section>
    <section class="lesson-vocab-strip"><div><span class="skill-kicker">🀄 Từ mới bài này</span><h3>${words.length} từ/cụm từ trọng tâm</h3></div><div class="vocab-chips">${words.slice(0, 8).map((word) => `<button type="button" data-action="speak" data-word="${word.id}"><strong>${word.hanzi}</strong><small>${escapeHtml(word.pinyin)}</small></button>`).join("")}</div></section>
    <section class="course-lesson-actions"><button class="secondary-button" type="button" data-action="start-course-quiz">${icon("spark")} Quiz bài ${lesson.unit}</button><button class="primary-button" type="button" data-action="start-course-flashcards">${icon("play")} Học ${words.length} flashcard</button></section>
  `;
}

function renderReview() {
  const due = getDueWords();
  const seen = getSeenWords();
  const mistakes = getMistakeWords();
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

    <section class="card mistake-notebook">
      <div class="mistake-notebook-head"><div><p class="eyebrow">Sổ từ làm sai</p><h2>${mistakes.length ? `${mistakes.length} từ cần củng cố` : "Chưa có từ nào bị sai"}</h2><p>${mistakes.length ? "App tự gom từ bạn chọn sai trong quiz và đề thi. Ôn hoặc luyện viết trực tiếp tại đây." : "Những từ chọn sai khi làm đề sẽ tự động xuất hiện ở đây."}</p></div>${mistakes.length ? `<button class="primary-button" type="button" data-action="start-mistake-review">${icon("refresh")} Ôn flashcard</button>` : ""}</div>
      ${mistakes.length ? `<div class="mistake-word-list">${mistakes.slice(0, 15).map((word) => `<article><div><strong>${word.hanzi}</strong><span>${state.showPinyin ? escapeHtml(word.pinyin) : "Pinyin đang ẩn"}</span><small>${escapeHtml(word.meaning)} · sai ${state.mistakeWords[word.id]?.count || 1} lần</small></div><div class="mistake-actions"><button type="button" data-action="speak" data-word="${word.id}" aria-label="Nghe ${word.hanzi}">${icon("volume")}</button><button type="button" data-action="open-writing-word" data-word="${word.id}">✍ Luyện viết</button><button type="button" data-action="remove-mistake" data-word="${word.id}">Đã nhớ</button></div></article>`).join("")}</div>` : `<div class="mistake-empty">🎯 Cứ làm đề bình thường; app sẽ lo phần ghi lại lỗi sai.</div>`}
    </section>

    <div class="section-header">
      <div><h2>Mức độ ghi nhớ theo bài</h2><p>Từ được xem là “nhớ tốt” khi đã vượt qua ít nhất 3 vòng ôn.</p></div>
    </div>
    <section class="mastery-list" aria-label="Tiến độ ghi nhớ">
      ${LESSONS.filter((lesson) => lesson.level === selectedLevel).map((lesson) => {
        const stats = lessonStats(lesson.id);
        return `<article class="mastery-row"><strong>HSK ${lesson.level} · Bài ${lesson.unit}</strong><div class="mini-progress" aria-label="${stats.masteryPercent}% nhớ tốt"><span style="--progress: ${stats.masteryPercent}%"></span></div><span>${stats.mastered}/${stats.total}</span></article>`;
      }).join("")}
    </section>
  `;
}

function startFlashcards(source, lessonId, wordIds = null) {
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
    title = `HSK ${lesson.level} · Bài ${lesson.unit}: ${lesson.title}`;
  } else if (source === "mistakes") {
    const requested = Array.isArray(wordIds) && wordIds.length ? wordIds.map(getWord).filter(Boolean) : getMistakeWords();
    deck = requested;
    title = "Ôn lại những từ vừa làm sai";
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
            <button class="flashcard-write-button" type="button" data-action="open-writing-word" data-word="${word.id}">✍ Luyện viết ngay từ này</button>
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

function renderExams() {
  const history = state.examHistory.filter((item) => (item.category || "vocabulary") === selectedExamCategory).slice(0, 6);
  const best = history.length ? Math.max(...history.map((item) => item.percent)) : 0;
  const average = history.length ? Math.round(history.reduce((sum, item) => sum + item.percent, 0) / history.length) : 0;
  const levelPool = VOCABULARY.filter((word) => getCourseLesson(word.lesson)?.level === selectedExamLevel);
  const examMinutes = Math.ceil(levelPool.length * 0.65);
  const standard = STANDARD_HSK_BLUEPRINTS[selectedExamLevel];
  main.innerHTML = `
    <section class="exam-hero card">
      <div><span class="exam-promo-kicker">HanziGo Test Center</span><h2>60 đề luyện HSK theo hai mục tiêu</h2><p>30 đề thi thử bám số phần, số câu và thời gian HSK thật; 30 đề tổng ôn giúp phủ toàn bộ từ vựng trong ứng dụng.</p></div>
      <div class="exam-hero-score"><strong>${best}%</strong><small>Điểm cao nhất</small></div>
    </section>
    <section class="exam-summary" aria-label="Tổng quan luyện thi">
      <article class="card"><span>📝</span><strong>${state.examHistory.length}</strong><small>Đề đã làm</small></article>
      <article class="card"><span>◎</span><strong>${average}%</strong><small>Điểm trung bình</small></article>
      <article class="card"><span>🏆</span><strong>${best}%</strong><small>Kỷ lục cá nhân</small></article>
    </section>
    <section class="exam-category-tabs" aria-label="Chọn loại đề">
      <button type="button" data-action="select-exam-category" data-category="standard" class="${selectedExamCategory === "standard" ? "is-active" : ""}"><span>🎓 Thi thử chuẩn HSK</span><small>Đúng số phần, số câu và thời gian</small></button>
      <button type="button" data-action="select-exam-category" data-category="vocabulary" class="${selectedExamCategory === "vocabulary" ? "is-active" : ""}"><span>📚 Tổng ôn từ vựng</span><small>Mỗi đề phủ 100% từ của cấp</small></button>
    </section>
    <div class="section-header"><div><h2>${selectedExamCategory === "standard" ? "30 đề thi thử chuẩn cấu trúc" : "30 đề tổng ôn từ vựng"}</h2><p>Chọn cấp độ rồi làm lần lượt 10 đề.</p></div></div>
    <section class="exam-level-tabs" aria-label="Chọn cấp độ đề thi">${[1, 2, 3].map((level) => { const blueprint = STANDARD_HSK_BLUEPRINTS[level]; return `<button type="button" data-action="select-exam-level" data-level="${level}" class="${selectedExamLevel === level ? "is-active" : ""}"><span>HSK ${level}</span><small>${selectedExamCategory === "standard" ? `${blueprint.total} câu · ${blueprint.minutes} phút` : `10 đề · ${VOCABULARY.filter((word) => getCourseLesson(word.lesson)?.level === level).length} từ/đề`}</small></button>`; }).join("")}</section>
    ${selectedExamCategory === "standard" ? `<section class="official-structure card"><div><b>Cấu trúc HSK ${selectedExamLevel}</b><span>${standard.sections.map((section) => `${section.label}: ${section.count} câu`).join(" · ")}</span></div><div><b>${standard.maxScore} điểm</b><span>Đạt từ ${standard.passScore} điểm</span></div></section>` : ""}
    <section class="exam-grid ten-exams">
      ${Array.from({ length: 10 }, (_, index) => {
        const examNumber = index + 1;
        const attempts = state.examHistory.filter((item) => item.level === selectedExamLevel && item.examNumber === examNumber && (item.category || "vocabulary") === selectedExamCategory);
        const examBest = attempts.length ? Math.max(...attempts.map((item) => item.percent)) : null;
        if (selectedExamCategory === "standard") return `<article class="card exam-card official-exam-card level-${selectedExamLevel}"><div class="exam-card-top"><span class="exam-level">HSK <b>${selectedExamLevel}</b></span><span class="exam-status">${examBest === null ? "Chưa làm" : `Cao nhất ${examBest}%`}</span></div><h3>Đề thi thử chuẩn số ${examNumber}</h3><p>${standard.total} câu · ${standard.minutes} phút · ${standard.maxScore} điểm</p><div class="standard-section-pills">${standard.sections.map((section) => `<span>${section.icon} ${section.label} ${section.count}</span>`).join("")}</div><small class="original-note">Nội dung tự biên soạn theo cấu trúc chính thức</small><button class="primary-button" type="button" data-action="start-standard-exam" data-level="${selectedExamLevel}" data-exam="${examNumber}">Vào phòng thi</button></article>`;
        return `<article class="card exam-card level-${selectedExamLevel}"><div class="exam-card-top"><span class="exam-level">HSK <b>${selectedExamLevel}</b></span><span class="exam-status">${examBest === null ? "Chưa làm" : `Cao nhất ${examBest}%`}</span></div><h3>Đề tổng ôn số ${examNumber}</h3><p>${levelPool.length} câu · Toàn bộ ${levelPool.length} từ · ${examMinutes} phút</p><div class="exam-coverage"><span style="--coverage:100%"></span><small>Phủ 100% từ vựng HSK ${selectedExamLevel}</small></div><div class="exam-tags"><span>🎧 Nghe</span><span>字 Mặt chữ</span><span>译 Nghĩa</span></div><button class="primary-button" type="button" data-action="start-mock-exam" data-level="${selectedExamLevel}" data-exam="${examNumber}">Bắt đầu đề ${examNumber}</button></article>`;
      }).join("")}
    </section>
    <div class="section-header"><div><h2>Lịch sử gần đây</h2><p>Kết quả được lưu riêng trên thiết bị này.</p></div></div>
    <section class="card exam-history">${history.length ? history.map((item) => `<div class="exam-history-row"><span class="history-level">HSK ${item.level}</span><span><strong>${(item.category || "vocabulary") === "standard" ? "Thi thử" : "Tổng ôn"} ${item.examNumber || 1} · ${item.points != null ? `${item.points}/${item.maxScore} điểm` : `${item.score}/${item.total}`}</strong><small>${new Date(item.date).toLocaleDateString("vi-VN")}</small></span><b class="history-score ${item.percent >= 60 ? "is-pass" : ""}">${item.percent}%</b></div>`).join("") : `<div class="empty-history"><span>📊</span><p>Chưa có kết quả cho loại đề này. Bắt đầu đề số 1 nhé.</p></div>`}</section>
  `;
}

function seededExamOrder(items, seed) {
  let value = seed * 9301 + 49297;
  return items.map((item) => {
    value = (value * 233 + 97) % 233280;
    return { item, order: value / 233280 };
  }).sort((a, b) => a.order - b.order).map(({ item }) => item);
}

function startMockExam(level, examNumber = 1) {
  const pool = VOCABULARY.filter((word) => getCourseLesson(word.lesson)?.level === level);
  const targets = seededExamOrder(pool, level * 100 + examNumber);
  const types = ["listening", "hanzi", "meaning"];
  quizSession = {
    mode: "exam", level, examNumber, startedAt: Date.now(), duration: Math.ceil(pool.length * 0.65) * 60 * 1000,
    questions: targets.map((word, index) => buildQuestion(word, types[(index + examNumber - 1) % types.length], pool)),
    index: 0, score: 0, xp: 0, answered: null, celebrated: false, saved: false, wrongIds: [],
  };
  navigate("quiz", { updateHash: false });
  startExamClock();
}

function visualForWord(word) {
  const text = normalizeText(`${word.meaning} ${word.hanzi}`);
  const visuals = [
    ["xin chao|chao|你好", "👋"], ["cam on|谢谢", "🙏"], ["nguoi|ban|他|她|我|你", "🧑"],
    ["gia dinh|me|ba|bo|妈妈|爸爸", "👨‍👩‍👧"], ["truong|hoc|学生|老师", "🏫"], ["sach|书", "📖"],
    ["an|com|饭|菜", "🍚"], ["uong|nuoc|tra|水|茶", "🥤"], ["qua|trai cay|苹果", "🍎"],
    ["nha|家", "🏠"], ["benh vien|医生|医院", "🏥"], ["xe|tau|车", "🚌"], ["may bay|飞机", "✈️"],
    ["mua|雨", "🌧️"], ["nong|热", "☀️"], ["lanh|冷", "❄️"], ["thoi gian|gio|点|时候", "🕒"],
    ["dien thoai|电话", "📱"], ["may tinh|电脑", "💻"], ["tien|钱", "💰"], ["mua hang|商店|买", "🛍️"],
    ["cho|狗", "🐶"], ["meo|猫", "🐱"], ["yeu|thich|爱|喜欢", "❤️"], ["cuoi|vui|高兴", "😊"],
  ];
  return visuals.find(([pattern]) => pattern.split("|").some((term) => text.includes(normalizeText(term))))?.[1]
    || getCourseLesson(word.lesson)?.emoji || "🀄";
}

function standardChoices(target, pool, seed, labelMode = "hanzi", count = 3) {
  const ordered = seededExamOrder(pool.filter((word) => word.id !== target.id), seed);
  const selected = [target, ...ordered.slice(0, count - 1)];
  return seededExamOrder(selected, seed + 29).map((word) => ({
    id: word.id,
    label: labelMode === "visual" ? "" : labelMode === "meaning" ? word.meaning : word.hanzi,
    visual: labelMode === "visual" ? visualForWord(word) : null,
  }));
}

function dialogueChoices(target, pool, seed) {
  const targetLesson = getCourseLesson(target.lesson);
  const ordered = seededExamOrder(LESSONS.filter((lesson) => lesson.id !== targetLesson.id), seed).slice(0, 2);
  const choices = [targetLesson, ...ordered].map((lesson) => ({
    id: `lesson-${lesson.id}`,
    label: lesson.dialogue[1]?.hanzi || lesson.title,
  }));
  return { choices: seededExamOrder(choices, seed + 7), correctId: `lesson-${targetLesson.id}` };
}

function cleanChineseSentence(text) {
  return String(text || "").replace(/[。！？?!，,；;：:]/g, "").trim();
}

function sentenceChunks(sentence) {
  const chars = Array.from(cleanChineseSentence(sentence));
  if (chars.length <= 3) return chars;
  const size = Math.ceil(chars.length / 3);
  return [chars.slice(0, size).join(""), chars.slice(size, size * 2).join(""), chars.slice(size * 2).join("")].filter(Boolean);
}

function buildStandardQuestion({ kind, target, pool, seed, section, sectionLabel, partLabel, instruction, level, index }) {
  const lesson = getCourseLesson(target.lesson);
  const ordered = seededExamOrder(pool.filter((word) => word.id !== target.id), seed + 3);
  const distractor = ordered[0] || target;
  const base = { target, type: "standard", standardKind: kind, section, sectionLabel, partLabel, instruction, correctId: target.id, pinyinHint: level === 1 ? target.pinyin : null };

  if (kind === "listen-picture-judge" || kind === "read-picture-judge") {
    const matches = index % 2 === 0;
    return { ...base, audioText: kind.startsWith("listen") ? target.example || target.hanzi : null, displayText: kind.startsWith("read") ? target.example : null, visual: visualForWord(matches ? target : distractor), correctId: matches ? "true" : "false", options: [{ id: "true", label: "Đúng ✓" }, { id: "false", label: "Sai ✕" }] };
  }
  if (["listen-picture-choice", "listen-dialogue-picture", "read-picture-choice"].includes(kind)) {
    return { ...base, audioText: kind.startsWith("listen") ? (kind === "listen-dialogue-picture" ? lesson.dialogue.map((line) => line.hanzi).join("。") : target.example || target.hanzi) : null, displayText: kind.startsWith("read") ? target.example : null, options: standardChoices(target, pool, seed, "visual", 3) };
  }
  if (kind === "listen-response" || kind === "read-match") {
    const matched = dialogueChoices(target, pool, seed);
    return { ...base, audioText: kind === "listen-response" ? lesson.dialogue[0]?.hanzi : null, displayText: kind === "read-match" ? lesson.dialogue[0]?.hanzi : null, options: matched.choices, correctId: matched.correctId };
  }
  if (kind === "listen-judge" || kind === "read-judge") {
    const matches = index % 2 === 0;
    return { ...base, audioText: kind === "listen-judge" ? target.example : null, displayText: kind === "listen-judge" ? (matches ? target.example : distractor.example) : `${target.example}<br>${matches ? target.example : distractor.example}`, correctId: matches ? "true" : "false", options: [{ id: "true", label: "Đúng ✓" }, { id: "false", label: "Sai ✕" }] };
  }
  if (kind === "listen-dialogue-choice" || kind === "listen-long-dialogue") {
    const audio = `${lesson.dialogue.map((line) => line.hanzi).join("。")}。${target.example}`;
    return { ...base, audioText: audio, displayText: "Nghe rồi chọn ý phù hợp nhất", options: standardChoices(target, pool, seed, "meaning", 3) };
  }
  if (kind === "read-fill") {
    const sentence = (target.example || target.hanzi).replace(target.hanzi, "______");
    return { ...base, displayText: sentence, options: standardChoices(target, pool, seed, "hanzi", 4) };
  }
  if (kind === "read-passage") {
    const lessonChoices = seededExamOrder([lesson, ...seededExamOrder(LESSONS.filter((item) => item.id !== lesson.id), seed).slice(0, 2)], seed + 12);
    return { ...base, passage: lesson.dialogue.map((line) => `${line.speaker}：${line.hanzi}`).join("\n"), displayText: "Đoạn hội thoại phù hợp nhất với chủ đề nào?", options: lessonChoices.map((item) => ({ id: `lesson-${item.id}`, label: item.title })), correctId: `lesson-${lesson.id}` };
  }
  if (kind === "write-reorder") {
    const answerText = cleanChineseSentence(lesson.dialogue[index % lesson.dialogue.length]?.hanzi || target.example);
    const tokens = seededExamOrder(sentenceChunks(answerText), seed + 41);
    return { ...base, answerText, tokens, correctId: answerText };
  }
  if (kind === "write-character") {
    const singlePool = VOCABULARY.filter((word) => getCourseLesson(word.lesson)?.level <= level && Array.from(word.hanzi).length === 1);
    const single = seededExamOrder(singlePool, seed + index)[0] || target;
    return { ...base, target: single, answerText: Array.from(single.hanzi)[0], displayText: single.pinyin, correctId: Array.from(single.hanzi)[0] };
  }
  return { ...base, options: standardChoices(target, pool, seed, "meaning", 3) };
}

function buildStandardExam(level, examNumber) {
  const blueprint = STANDARD_HSK_BLUEPRINTS[level];
  const pool = VOCABULARY.filter((word) => getCourseLesson(word.lesson)?.level <= level);
  const ordered = seededExamOrder(pool, level * 1000 + examNumber * 73);
  const questions = [];
  let cursor = 0;
  for (const section of blueprint.sections) {
    for (const [kind, count, partLabel, instruction] of section.parts) {
      for (let index = 0; index < count; index += 1) {
        const target = ordered[cursor % ordered.length];
        questions.push(buildStandardQuestion({ kind, target, pool, seed: level * 10000 + examNumber * 500 + cursor, section: section.key, sectionLabel: section.label, partLabel, instruction, level, index }));
        cursor += 1;
      }
    }
  }
  return questions;
}

function startStandardExam(level, examNumber = 1) {
  const blueprint = STANDARD_HSK_BLUEPRINTS[level];
  quizSession = {
    mode: "standard", category: "standard", level, examNumber,
    startedAt: Date.now(), duration: blueprint.testMinutes * 60 * 1000,
    questions: buildStandardExam(level, examNumber), index: 0, score: 0, xp: 0,
    answered: null, celebrated: false, saved: false, sectionScores: {}, draftIndices: [], wrongIds: [],
  };
  navigate("quiz", { updateHash: false });
  startExamClock();
  setTimeout(playStandardAudio, 220);
}

function startExamClock() {
  if (examTimer) clearInterval(examTimer);
  examTimer = setInterval(() => {
    if (!quizSession || !["exam", "standard"].includes(quizSession.mode)) return clearInterval(examTimer);
    const remaining = Math.max(0, quizSession.duration - (Date.now() - quizSession.startedAt));
    const clock = document.querySelector("#exam-clock");
    if (clock) clock.textContent = formatExamTime(remaining);
    if (!remaining) {
      quizSession.index = quizSession.questions.length;
      clearInterval(examTimer);
      examTimer = null;
      renderQuiz();
    }
  }, 1000);
}

function formatExamTime(ms) {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function startQuiz(poolOverride = null) {
  const seen = getSeenWords();
  const pool = poolOverride?.length ? poolOverride : seen.length >= 8 ? seen : getLessonWords(1);
  const targets = shuffle(pool).slice(0, Math.min(10, pool.length));
  const types = ["meaning", "hanzi", "listening"];
  quizSession = {
    mode: "practice",
    questions: targets.map((word, index) => buildQuestion(word, types[index % types.length], pool)),
    index: 0,
    score: 0,
    xp: 0,
    answered: null,
    celebrated: false,
    wrongIds: [],
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
  const isStandard = quizSession.mode === "standard";
  const prompt = isStandard ? standardQuestionPrompt(question) : quizPrompt(question);
  const typeLabel = isStandard ? `${question.sectionLabel} · ${question.partLabel}` : question.type === "meaning" ? "Chọn nghĩa" : question.type === "hanzi" ? "Nhận mặt chữ" : "Luyện nghe";
  const typeIcon = isStandard ? (question.section === "listening" ? "🎧" : question.section === "writing" ? "✍" : "阅") : question.type === "listening" ? "🎧" : question.type === "hanzi" ? "字" : "译";
  const isExam = ["exam", "standard"].includes(quizSession.mode);
  const remaining = isExam ? Math.max(0, quizSession.duration - (Date.now() - quizSession.startedAt)) : 0;

  main.innerHTML = `
    <section class="quiz-shell">
      <div class="study-topline">
        <button class="icon-button" type="button" data-page="${isExam ? "exams" : "review"}" aria-label="Thoát quiz">${icon("close")}</button>
        <div class="mini-progress" aria-label="Tiến độ ${progress}%"><span style="--progress: ${progress}%"></span></div>
        <span class="study-count">${quizSession.index + 1}/${quizSession.questions.length}</span>
        ${isExam ? `<span class="exam-clock" id="exam-clock">⏱ ${formatExamTime(remaining)}</span>` : ""}
      </div>
      <article class="card quiz-card">
        <span class="quiz-type"><span aria-hidden="true">${typeIcon}</span> ${typeLabel}</span>
        ${isStandard ? `<p class="standard-instruction">${escapeHtml(question.instruction)}</p>` : ""}
        <div class="quiz-question">${prompt}</div>
        ${isStandard && question.section === "writing" ? renderStandardWriting(question, answered) : `<div class="quiz-options ${isStandard ? "standard-options" : ""}">${question.options.map((option, index) => {
          const correctId = question.correctId || question.target.id;
          const optionCorrect = answered && option.id === correctId;
          const optionWrong = answered && option.id === answered.selectedId && !answered.correct;
          return `<button class="quiz-option ${optionCorrect ? "is-correct" : ""} ${optionWrong ? "is-wrong" : ""} ${option.visual ? "visual-option" : ""}" type="button" data-action="answer-quiz" data-word="${escapeHtml(option.id)}" ${answered ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span>${option.visual ? `<span class="option-visual" aria-hidden="true">${option.visual}</span>` : ""}<span class="${question.type === "meaning" ? "" : "option-hanzi"}">${escapeHtml(option.label || "")}</span></button>`;
        }).join("")}</div>`}
        ${answered ? renderQuizFeedback(question, answered) : ""}
      </article>
    </section>
  `;
}

function standardQuestionPrompt(question) {
  const audio = question.audioText ? `<button class="listen-button standard-audio-button" type="button" data-action="play-standard-audio" aria-label="Nghe nội dung câu hỏi">${icon("volume")}</button><small class="audio-hint">Bấm loa để nghe lại</small>` : "";
  const visual = question.visual ? `<div class="question-visual" aria-label="Hình minh họa">${question.visual}</div>` : "";
  const passage = question.passage ? `<div class="standard-passage">${escapeHtml(question.passage).replaceAll("\n", "<br>")}</div>` : "";
  const display = question.displayText ? `<div class="standard-display">${escapeHtml(question.displayText).replace("&lt;br&gt;", "<br>")}${question.pinyinHint ? `<small>${escapeHtml(question.pinyinHint)}</small>` : ""}</div>` : "";
  if (question.section === "writing" && question.standardKind === "write-reorder") return `<p>Sắp xếp các cụm dưới đây thành một câu đúng.</p>`;
  if (question.section === "writing" && question.standardKind === "write-character") return `<p>Viết một chữ Hán phù hợp với pinyin:</p><h2 class="pinyin-writing-prompt">${escapeHtml(question.displayText)}</h2>`;
  return `${audio}${visual}${passage}${display}`;
}

function renderStandardWriting(question, answered) {
  if (question.standardKind === "write-reorder") {
    const used = new Set(quizSession.draftIndices || []);
    const draft = (quizSession.draftIndices || []).map((index) => question.tokens[index]).join("");
    return `<div class="standard-writing-box"><div class="reorder-tokens">${question.tokens.map((token, index) => `<button type="button" data-action="append-standard-token" data-index="${index}" ${used.has(index) || answered ? "disabled" : ""}>${escapeHtml(token)}</button>`).join("")}</div><div class="reorder-answer ${draft ? "has-answer" : ""}">${draft ? escapeHtml(draft) : "Chạm các cụm theo đúng thứ tự"}</div><div class="writing-submit-row"><button class="secondary-button" type="button" data-action="clear-standard-draft" ${answered ? "disabled" : ""}>Xóa và làm lại</button><button class="primary-button" type="button" data-action="submit-standard-writing" ${!draft || answered ? "disabled" : ""}>Nộp câu trả lời</button></div></div>`;
  }
  return `<div class="standard-writing-box"><label class="character-answer-label"><span>Nhập chữ Hán</span><input id="standard-character-answer" maxlength="1" autocomplete="off" inputmode="text" ${answered ? "disabled" : ""} /></label><button class="primary-button" type="button" data-action="submit-standard-writing" ${answered ? "disabled" : ""}>Nộp câu trả lời</button></div>`;
}

function playStandardAudio() {
  const question = quizSession?.questions?.[quizSession.index];
  if (!question?.audioText) return;
  speakChineseText(question.audioText, quizSession.level === 1 ? 0.68 : 0.78);
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
  const answerLabel = question.section === "writing" ? question.answerText : question.options?.find((option) => option.id === (question.correctId || question.target.id))?.label || question.target.hanzi;
  return `
    <div class="quiz-feedback">
      <span class="feedback-icon" aria-hidden="true">${answered.correct ? "✓" : "↗"}</span>
      <div><strong>${answered.correct ? "Chính xác!" : `Đáp án: ${escapeHtml(answerLabel)}`}</strong><small>${escapeHtml(question.target.pinyin)} · ${escapeHtml(question.target.meaning)}</small></div>
      <div class="feedback-actions"><button class="secondary-button" type="button" data-action="open-writing-word" data-word="${question.target.id}">✍ Luyện viết</button><button class="primary-button" type="button" data-action="next-question">${quizSession.index + 1 === quizSession.questions.length ? "Xem kết quả" : "Tiếp theo"}</button></div>
    </div>
  `;
}

function answerQuiz(selectedId) {
  if (!quizSession || quizSession.answered) return;
  const question = quizSession.questions[quizSession.index];
  const correct = selectedId === (question.correctId || question.target.id);
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
  if (question.section && correct) quizSession.sectionScores[question.section] = (quizSession.sectionScores[question.section] || 0) + 1;
  quizSession.xp += xp;
  quizSession.answered = { selectedId, correct };
  if (!correct) {
    recordMistake(question.target.id);
    quizSession.wrongIds ||= [];
    if (!quizSession.wrongIds.includes(question.target.id)) quizSession.wrongIds.push(question.target.id);
  }
  recordStudy({ wordId: question.target.id, xp, type: "quiz" });
  if (correct) speakWord(question.target.id);
  renderQuiz();
}

function answerStandardWriting() {
  if (!quizSession || quizSession.answered) return;
  const question = quizSession.questions[quizSession.index];
  let response = "";
  if (question.standardKind === "write-reorder") {
    response = (quizSession.draftIndices || []).map((index) => question.tokens[index]).join("");
  } else {
    response = document.querySelector("#standard-character-answer")?.value.trim() || "";
  }
  if (!response) {
    showToast("Bạn hãy nhập câu trả lời trước nhé.", "✍");
    return;
  }
  answerQuiz(response);
}

function nextQuizQuestion() {
  if (!quizSession?.answered) return;
  quizSession.index += 1;
  quizSession.answered = null;
  quizSession.draftIndices = [];
  renderQuiz();
  const next = quizSession.questions[quizSession.index];
  if (next?.audioText) setTimeout(playStandardAudio, 180);
  else if (next?.type === "listening") setTimeout(() => speakWord(next.target.id), 120);
}

function renderQuizComplete() {
  const isStandard = quizSession.mode === "standard";
  const blueprint = isStandard ? STANDARD_HSK_BLUEPRINTS[quizSession.level] : null;
  const standardBreakdown = isStandard ? blueprint.sections.map((section) => {
    const correct = quizSession.sectionScores[section.key] || 0;
    return { ...section, correct, points: Math.round((correct / section.count) * 100) };
  }) : [];
  const points = isStandard ? standardBreakdown.reduce((sum, section) => sum + section.points, 0) : null;
  const passed = isStandard ? points >= blueprint.passScore : quizSession.score >= Math.ceil(quizSession.questions.length * 0.7);
  if (!quizSession.celebrated && passed) {
    quizSession.celebrated = true;
    launchConfetti();
  }
  const total = quizSession.questions.length;
  const percent = isStandard ? Math.round((points / blueprint.maxScore) * 100) : Math.round((quizSession.score / total) * 100);
  const message = isStandard ? (passed ? "Bạn đã đạt mốc điểm mô phỏng. Xem từng kỹ năng để biết phần mạnh nhất nhé." : "Chưa đạt mốc mô phỏng lần này. Hãy xem phần điểm thấp nhất rồi luyện lại.") : percent >= 90 ? "Xuất sắc, phản xạ rất tốt!" : percent >= 70 ? "Ổn lắm, bạn đang nhớ khá chắc." : "Không sao, ôn lại thẻ rồi thử tiếp nhé.";
  const isExam = ["exam", "standard"].includes(quizSession.mode);
  const sessionMistakes = quizSession.wrongIds || [];
  if (isExam && !quizSession.saved) {
    quizSession.saved = true;
    state.examHistory.unshift({ category: isStandard ? "standard" : "vocabulary", level: quizSession.level, examNumber: quizSession.examNumber || 1, score: quizSession.score, total, percent, points, maxScore: blueprint?.maxScore, sectionScores: isStandard ? quizSession.sectionScores : null, date: new Date().toISOString() });
    state.examHistory = state.examHistory.slice(0, 120);
    saveState();
  }

  main.innerHTML = `
    <section class="card session-complete">
      <div class="complete-icon" aria-hidden="true">${passed ? "🏆" : "🌱"}</div>
      <p class="eyebrow">${isExam ? `${isStandard ? "Thi thử chuẩn" : "Tổng ôn"} HSK ${quizSession.level} · Đề ${quizSession.examNumber || 1}` : "Kết quả quiz"}</p>
      <h2>${isStandard ? `${points}/${blueprint.maxScore} điểm` : `${quizSession.score}/${total} câu đúng`}</h2>
      <p>${message}</p>
      ${isStandard ? `<div class="official-result-status ${passed ? "is-pass" : ""}">${passed ? "ĐẠT" : "CHƯA ĐẠT"} · Mốc ${blueprint.passScore}/${blueprint.maxScore}</div><div class="section-score-grid">${standardBreakdown.map((section) => `<div><span>${section.icon}</span><strong>${section.points}/100</strong><small>${section.label} · ${section.correct}/${section.count} câu</small></div>`).join("")}</div>` : ""}
      <div class="complete-stats">
        <div class="complete-stat"><strong>${percent}%</strong><small>Độ chính xác</small></div>
        <div class="complete-stat"><strong>${total - quizSession.score}</strong><small>Câu cần ôn</small></div>
        <div class="complete-stat"><strong>+${quizSession.xp}</strong><small>XP nhận được</small></div>
      </div>
      <div class="complete-actions">
        ${sessionMistakes.length ? `<button class="secondary-button mistake-review-button" type="button" data-action="start-session-mistakes">📕 Ôn ${sessionMistakes.length} từ vừa sai</button>` : ""}
        <button class="secondary-button" type="button" data-page="${isExam ? "exams" : "review"}">${isExam ? "Xem lịch sử" : "Về ôn tập"}</button>
        <button class="primary-button" type="button" data-action="${isStandard ? "start-standard-exam" : isExam ? "start-mock-exam" : "start-quiz"}" ${isExam ? `data-level="${quizSession.level}" data-exam="${quizSession.examNumber || 1}"` : ""}>${icon("refresh")} Thử lại</button>
      </div>
    </section>
  `;
}

function renderWords() {
  main.innerHTML = `
    <div class="section-header">
      <div><h2>Kho từ HSK 1–3</h2><p>Tìm bằng chữ Hán, pinyin hoặc nghĩa tiếng Việt.</p></div>
    </div>
    <section class="word-toolbar" aria-label="Bộ lọc từ vựng">
      <label class="search-wrap" aria-label="Tìm từ">
        ${icon("search")}
        <input class="search-input" id="word-search" type="search" placeholder="Ví dụ: 你好, nǐ hǎo, xin chào…" value="${escapeHtml(wordSearch)}" autocomplete="off" />
      </label>
      <select class="select-input" id="word-lesson-filter" aria-label="Lọc theo bài">
        <option value="all">Tất cả 45 bài</option>
        ${LESSONS.map((lesson) => `<option value="${lesson.id}" ${String(lesson.id) === wordLessonFilter ? "selected" : ""}>HSK ${lesson.level} · Bài ${lesson.unit}: ${escapeHtml(lesson.title)}</option>`).join("")}
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
          <button class="small-icon-button write-word-button" type="button" data-action="open-writing-word" data-word="${word.id}" aria-label="Luyện viết ${word.hanzi}">✍</button>
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

function openWritingWord(wordId) {
  const word = getWord(wordId);
  if (!word) return;
  if (currentPage !== "write") writingReturnPage = currentPage;
  writingMode = "course";
  selectedWritingId = word.id;
  selectedWritingLesson = Number(word.lesson) || 1;
  activeWritingCharacter = 0;
  writingStrokes = [];
  navigate("write");
}

function writingModeTabs() {
  return `
    <section class="writing-mode-tabs" aria-label="Chọn kiểu luyện viết">
      <button type="button" data-action="select-writing-mode" data-mode="course" class="${writingMode === "course" ? "is-active" : ""}"><span>📚</span><strong>Theo giáo trình</strong><small>Chọn từ trong 45 bài HSK</small></button>
      <button type="button" data-action="select-writing-mode" data-mode="lookup" class="${writingMode === "lookup" ? "is-active" : ""}"><span>⌨</span><strong>Tra bằng Pinyin</strong><small>Gõ từ bất kỳ rồi luyện nét</small></button>
    </section>
  `;
}

function renderWrite() {
  if (writingMode === "lookup") {
    renderWritingLookup();
    return;
  }
  const selected = getWord(selectedWritingId) || WRITING_WORDS[0];
  selectedWritingId = selected.id;
  selectedWritingLesson = Number(selected.lesson) || selectedWritingLesson;
  const lessonWords = getLessonWords(selectedWritingLesson);
  const characters = Array.from(selected.hanzi);
  activeWritingCharacter = Math.min(activeWritingCharacter, characters.length - 1);
  const character = characters[activeWritingCharacter] || characters[0];
  main.innerHTML = `
    <div class="section-header">
      <div><h2>Luyện viết theo từng bài</h2><p>Chọn bài, chọn từ rồi luyện từng chữ theo đúng thứ tự nét.</p></div>
      ${writingReturnPage ? `<button class="secondary-button" type="button" data-action="return-from-writing">← Quay lại ${writingReturnPage === "flashcards" ? "flashcard" : writingReturnPage === "quiz" ? "câu hỏi" : writingReturnPage === "review" ? "sổ từ sai" : "trang trước"}</button>` : ""}
    </div>
    ${writingModeTabs()}
    <section class="writing-course-picker card">
      <label><span>Cấp độ và bài học</span><select class="select-input" id="writing-lesson-select">${LESSONS.map((lesson) => `<option value="${lesson.id}" ${lesson.id === selectedWritingLesson ? "selected" : ""}>HSK ${lesson.level} · Bài ${lesson.unit}: ${escapeHtml(lesson.title)}</option>`).join("")}</select></label>
      <label><span>Từ cần luyện</span><select class="select-input character-pick" id="writing-word-select">${lessonWords.map((word) => `<option value="${word.id}" ${word.id === selected.id ? "selected" : ""}>${word.hanzi} · ${escapeHtml(word.pinyin)}</option>`).join("")}</select></label>
      <div class="writing-character-tabs" aria-label="Chọn chữ trong từ">${characters.map((item, index) => `<button type="button" class="${index === activeWritingCharacter ? "is-active" : ""}" data-action="writing-character" data-index="${index}">${item}</button>`).join("")}</div>
    </section>
    <section class="stroke-order-stage card">
      <div class="stroke-order-copy"><span class="skill-kicker">✦ Thứ tự nét động · ${selected.hanzi}</span><h2>Xem từng nét của chữ <b>${character}</b></h2><p>Đang luyện chữ ${activeWritingCharacter + 1}/${characters.length} trong từ “${selected.hanzi}”. Nét đang viết đổi màu đỏ, các nét còn lại hiện mờ.</p><div class="stroke-controls"><button class="primary-button" type="button" data-action="animate-strokes">▶ Phát thứ tự nét</button><button class="secondary-button" type="button" data-action="stroke-quiz">✍ Viết theo nét</button></div></div>
      <div class="stroke-demo-shell"><div id="stroke-demo" aria-label="Minh họa thứ tự nét chữ ${character}"></div><span class="stroke-status" id="stroke-status">Bấm Phát để xem</span></div>
    </section>
    <section class="writing-layout">
      <article class="card writing-card">
        <div class="character-selector">
          <div class="character-info"><h2>${selected.hanzi} · ${state.showPinyin ? escapeHtml(selected.pinyin) : "Pinyin đang ẩn"}</h2><p>${escapeHtml(selected.meaning)}</p></div>
          <span class="writing-lesson-badge">HSK ${getCourseLesson(selected.lesson)?.level || 1} · Bài ${getCourseLesson(selected.lesson)?.unit || selected.lesson}</span>
        </div>
        <div class="writing-grid">
          <span class="guide-character" aria-hidden="true">${character}</span>
          <canvas id="writing-canvas" aria-label="Vùng luyện viết chữ ${character}"></canvas>
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
        <p>Khung động chấm đúng thứ tự nét; ô lớn bên cạnh giúp luyện vận động tay và độ cân của chữ.</p>
        <div class="tip-list">
          <div class="tip-item"><span class="tip-number">1</span><span><strong>Nhìn tổng thể</strong><small>Quan sát chữ mẫu và vị trí trong bốn ô.</small></span></div>
          <div class="tip-item"><span class="tip-number">2</span><span><strong>Viết theo nét mờ</strong><small>Giữ chữ cân giữa, đừng vội viết thật nhanh.</small></span></div>
          <div class="tip-item"><span class="tip-number">3</span><span><strong>Nhẩm nghĩa và âm</strong><small>Đọc “${escapeHtml(selected.pinyin)} — ${escapeHtml(selected.meaning)}” khi viết.</small></span></div>
        </div>
        <button class="secondary-button" type="button" data-action="speak" data-word="${selected.id}">${icon("volume")} Nghe lại phát âm</button>
        <div class="writing-stats">
          <div class="writing-stat"><strong>${state.stats.writes}</strong><small>Lượt đã luyện</small></div>
          <div class="writing-stat"><strong>${WRITING_WORDS.length}</strong><small>Từ theo 45 bài</small></div>
        </div>
      </aside>
    </section>
  `;
  requestAnimationFrame(() => {
    setupWritingCanvas();
    setupStrokeAnimator();
  });
}

function renderWritingLookup() {
  const characters = Array.from(lookupHanzi || "学");
  lookupCharacterIndex = Math.min(lookupCharacterIndex, Math.max(0, characters.length - 1));
  const character = characters[lookupCharacterIndex] || "学";
  const vocabularyMatch = VOCABULARY.find((word) => word.hanzi === lookupHanzi);
  main.innerHTML = `
    <div class="section-header">
      <div><h2>Tra nét chữ bằng Pinyin</h2><p>Gõ âm Pinyin, chọn chữ Hán rồi xem và luyện đúng thứ tự nét.</p></div>
      ${writingReturnPage ? `<button class="secondary-button" type="button" data-action="return-from-writing">← Quay lại ${writingReturnPage === "flashcards" ? "flashcard" : writingReturnPage === "quiz" ? "câu hỏi" : writingReturnPage === "review" ? "sổ từ sai" : "trang trước"}</button>` : ""}
    </div>
    ${writingModeTabs()}
    <section class="pinyin-lookup-card card">
      <div class="pinyin-lookup-main">
        <div class="pinyin-lookup-heading"><span class="pinyin-keyboard-icon">拼</span><div><span class="skill-kicker">Bàn phím Pinyin tích hợp</span><h3>Gõ Pinyin → chọn chữ Hán</h3><p>Ví dụ: gõ <b>xue</b>, bấm <b>Space</b> hoặc số <b>1–9</b> để chọn <b>学</b>.</p></div></div>
        <label class="pinyin-ime-label" for="pinyin-ime-editor">Từ muốn tra bằng Pinyin</label>
        <pinyin-ime-editor id="pinyin-ime-editor" value="${escapeHtml(lookupImeValue)}" editor-type="input" page-size="9" popup-position="bottom" placeholder="Gõ xue, pengyou, xihuan…" autocomplete="off"></pinyin-ime-editor>
        <div class="pinyin-ime-shortcuts"><span><kbd>Space</kbd> chọn từ đầu</span><span><kbd>1–9</kbd> chọn ứng viên</span><span><kbd>Shift</kbd> đổi Trung/Anh</span></div>
        <div class="lookup-divider"><span>hoặc</span></div>
        <label class="pinyin-ime-label" for="direct-hanzi-input">Dán chữ Hán từ Duolingo hay nguồn khác</label>
        <div class="lookup-direct-row">
          <input id="direct-hanzi-input" class="text-input" type="text" value="${escapeHtml(lookupDirectValue)}" maxlength="20" inputmode="text" autocomplete="off" placeholder="Ví dụ: 朋友" />
          <button class="primary-button" type="button" data-action="apply-pinyin-lookup">Xem thứ tự nét →</button>
          <button class="secondary-button lookup-clear-button" type="button" data-action="clear-pinyin-lookup" aria-label="Xóa nội dung tra">Xóa</button>
        </div>
        <p class="lookup-network-note">Lần đầu mở bàn phím và một chữ mới có thể cần vài giây để tải dữ liệu. Sau đó trình duyệt sẽ lưu đệm để dùng nhanh hơn.</p>
      </div>
      <aside class="lookup-use-case">
        <span>🦉</span>
        <h3>Gặp từ lạ khi học?</h3>
        <p>Không cần tìm xem từ thuộc Unit nào. Nhập ngay tại đây, chọn từng chữ và luyện viết lúc bạn muốn.</p>
        <ol><li>Gõ Pinyin hoặc dán chữ</li><li>Chọn chữ cần xem</li><li>Xem nét rồi tự viết</li></ol>
      </aside>
    </section>
    <section class="lookup-result-picker card">
      <div><span class="skill-kicker">Từ đang tra</span><strong>${lookupHanzi}</strong>${vocabularyMatch ? `<small>${state.showPinyin ? escapeHtml(vocabularyMatch.pinyin) : "Pinyin đang ẩn"} · ${escapeHtml(vocabularyMatch.meaning)}</small>` : `<small>Tra tự do · ${characters.length} chữ</small>`}</div>
      <div class="writing-character-tabs" aria-label="Chọn chữ cần luyện">${characters.map((item, index) => `<button type="button" class="${index === lookupCharacterIndex ? "is-active" : ""}" data-action="select-lookup-character" data-index="${index}" aria-label="Luyện chữ ${item}">${item}</button>`).join("")}</div>
      <button class="secondary-button" type="button" data-action="speak-lookup">${icon("volume")} Nghe cả từ</button>
    </section>
    <section class="stroke-order-stage card">
      <div class="stroke-order-copy"><span class="skill-kicker">✦ Thứ tự nét động · ${lookupHanzi}</span><h2>Xem từng nét của chữ <b>${character}</b></h2><p>Đang luyện chữ ${lookupCharacterIndex + 1}/${characters.length} trong “${lookupHanzi}”. Chạm từng chữ phía trên để đổi chữ cần luyện.</p><div class="stroke-controls"><button class="primary-button" type="button" data-action="animate-strokes">▶ Phát thứ tự nét</button><button class="secondary-button" type="button" data-action="stroke-quiz">✍ Viết theo nét</button></div></div>
      <div class="stroke-demo-shell"><div id="stroke-demo" aria-label="Minh họa thứ tự nét chữ ${character}"></div><span class="stroke-status" id="stroke-status">Bấm Phát để xem</span></div>
    </section>
    <section class="writing-layout">
      <article class="card writing-card">
        <div class="character-selector">
          <div class="character-info"><h2>${character} · chữ ${lookupCharacterIndex + 1}/${characters.length}</h2><p>${vocabularyMatch ? escapeHtml(vocabularyMatch.meaning) : `Tự luyện từ “${lookupHanzi}”`}</p></div>
          <span class="writing-lesson-badge">Tra tự do</span>
        </div>
        <div class="writing-grid">
          <span class="guide-character" aria-hidden="true">${character}</span>
          <canvas id="writing-canvas" aria-label="Vùng luyện viết chữ ${character}"></canvas>
        </div>
        <div class="writing-actions">
          <button class="secondary-button" type="button" data-action="undo-stroke">${icon("undo")} Hoàn tác</button>
          <button class="secondary-button" type="button" data-action="clear-writing">${icon("trash")} Viết lại</button>
          <button class="primary-button" type="button" data-action="complete-writing">${icon("check")} Đã viết xong</button>
        </div>
      </article>
      <aside class="card writing-tip-card lookup-writing-tip">
        <p class="eyebrow">Tra và nhớ ngay</p>
        <h2>Mỗi chữ là một lượt luyện riêng</h2>
        <p>Với từ nhiều chữ như “${lookupHanzi}”, chọn từng ô chữ phía trên. App sẽ đổi cả hoạt ảnh thứ tự nét và chữ mờ trong ô luyện.</p>
        <div class="tip-list">
          <div class="tip-item"><span class="tip-number">1</span><span><strong>Xem nét động</strong><small>Bấm Phát thứ tự nét và quan sát hướng bút.</small></span></div>
          <div class="tip-item"><span class="tip-number">2</span><span><strong>Viết theo nét</strong><small>Chế độ tương tác sẽ nhắc khi bạn đi sai thứ tự.</small></span></div>
          <div class="tip-item"><span class="tip-number">3</span><span><strong>Tự viết lại</strong><small>Dùng ô mễ tự lớn để ghi nhớ mặt chữ.</small></span></div>
        </div>
        <button class="secondary-button" type="button" data-action="speak-lookup">${icon("volume")} Nghe “${lookupHanzi}”</button>
        <div class="writing-stats">
          <div class="writing-stat"><strong>${state.stats.writes}</strong><small>Lượt đã luyện</small></div>
          <div class="writing-stat"><strong>∞</strong><small>Chữ có thể tra</small></div>
        </div>
      </aside>
    </section>
  `;
  requestAnimationFrame(() => {
    const ime = document.querySelector("#pinyin-ime-editor");
    if (ime && ime.value !== lookupImeValue) ime.value = lookupImeValue;
    setupWritingCanvas();
    setupStrokeAnimator();
  });
}

function currentWritingCharacter() {
  if (writingMode === "lookup") {
    const characters = Array.from(lookupHanzi || "学");
    return characters[lookupCharacterIndex] || characters[0] || "学";
  }
  const selected = getWord(selectedWritingId) || WRITING_WORDS[0];
  const characters = Array.from(selected?.hanzi || "学");
  return characters[activeWritingCharacter] || characters[0] || "学";
}

function extractHanzi(value) {
  return Array.from(String(value || ""))
    .filter((character) => /\p{Script=Han}/u.test(character))
    .slice(0, 12)
    .join("");
}

function applyPinyinLookup() {
  const ime = document.querySelector("#pinyin-ime-editor");
  const directInput = document.querySelector("#direct-hanzi-input");
  lookupImeValue = String(ime?.value || lookupImeValue || "");
  lookupDirectValue = String(directInput?.value || "").trim();
  const hanzi = extractHanzi(lookupDirectValue) || extractHanzi(lookupImeValue);
  if (!hanzi) {
    showToast("Hãy gõ Pinyin rồi bấm Space/chọn một chữ Hán, hoặc dán chữ trực tiếp nhé.", "拼");
    ime?.focus?.();
    return;
  }
  lookupHanzi = hanzi;
  lookupCharacterIndex = 0;
  writingStrokes = [];
  renderWrite();
}

function setupStrokeAnimator() {
  const target = document.querySelector("#stroke-demo");
  const character = currentWritingCharacter();
  hanziWriter = null;
  if (!target || !window.HanziWriter) {
    if (target) target.innerHTML = `<span class="stroke-fallback">${character}</span><small>Cần internet để tải dữ liệu thứ tự nét lần đầu.</small>`;
    return;
  }
  const size = Math.min(270, Math.max(210, target.clientWidth || 250));
  try {
    hanziWriter = window.HanziWriter.create("stroke-demo", character, {
      width: size,
      height: size,
      padding: 16,
      showOutline: true,
      showCharacter: false,
      strokeAnimationSpeed: 1.25,
      delayBetweenStrokes: 520,
      strokeColor: "#d52d42",
      radicalColor: "#17243f",
      outlineColor: "#d7d9df",
      drawingColor: "#d52d42",
      drawingWidth: 18,
      highlightColor: "#ffb3bd",
      onLoadCharDataError: () => {
        target.innerHTML = `<span class="stroke-fallback">${character}</span><small>Chưa tìm thấy dữ liệu nét cho chữ này.</small>`;
        hanziWriter = null;
      },
    });
  } catch {
    target.innerHTML = `<span class="stroke-fallback">${character}</span><small>Chưa tìm thấy dữ liệu nét cho chữ này.</small>`;
  }
}

function animateStrokeOrder() {
  const status = document.querySelector("#stroke-status");
  if (!hanziWriter) {
    showToast("Dữ liệu nét đang được tải, thử lại sau một chút nhé.", "✎");
    return;
  }
  status.textContent = "Đang viết từng nét…";
  hanziWriter.cancelQuiz?.();
  hanziWriter.animateCharacter({ onComplete: () => { status.textContent = "Xong! Bây giờ thử tự viết nhé."; } });
}

function startStrokeQuiz() {
  const status = document.querySelector("#stroke-status");
  if (!hanziWriter) return;
  hanziWriter.quiz({
    showHintAfterMisses: 2,
    highlightOnComplete: true,
    onMistake: (data) => { status.textContent = `Nét ${data.strokeNum + 1}: thử lại theo gợi ý màu đỏ.`; },
    onCorrectStroke: (data) => { status.textContent = `Đúng nét ${data.strokeNum + 1}/${data.strokesRemaining + data.strokeNum + 1} ✓`; },
    onComplete: () => {
      status.textContent = "Viết đúng toàn bộ thứ tự nét! +10 XP 🎉";
      recordStudy({ wordId: writingMode === "lookup" ? undefined : selectedWritingId, xp: 10, type: "write" });
      launchConfetti(18);
    },
  });
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
  const wordId = writingMode === "lookup" ? undefined : selected?.id;
  const label = writingMode === "lookup" ? lookupHanzi : selected?.hanzi || "Hán";
  recordStudy({ wordId, xp: 5, type: "write" });
  launchConfetti(18);
  showToast(`Đã lưu một lượt luyện chữ ${label}. +5 XP`, "✓");
  writingStrokes = [];
  renderWrite();
}

function refreshChineseVoices() {
  if (!("speechSynthesis" in window)) return [];
  chineseVoices = window.speechSynthesis.getVoices()
    .filter((voice) => /^zh(-|_)/i.test(voice.lang) || /chinese|mandarin|普通话|中文/i.test(voice.name))
    .sort((a, b) => scoreChineseVoice(b) - scoreChineseVoice(a));
  return chineseVoices;
}

function setupSpeechVoices() {
  if (!("speechSynthesis" in window)) return;
  refreshChineseVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshChineseVoices);
}

function scoreChineseVoice(voice) {
  const name = voice.name.toLowerCase();
  let score = /^zh-cn/i.test(voice.lang) ? 20 : 10;
  if (/natural|neural|premium|online/.test(name)) score += 100;
  if (/microsoft|google|apple/.test(name)) score += 25;
  if (/xiaoxiao|yunxi|yunjian|xiaoyi|huihui|yaoyao|tingting|mei-jia/.test(name)) score += 40;
  if (/espeak|compact/.test(name)) score -= 30;
  return score;
}

function preferredChineseVoice(role = "narrator") {
  const voices = chineseVoices.length ? chineseVoices : refreshChineseVoices();
  if (!voices.length) return null;
  const femalePattern = /xiaoxiao|xiaoyi|huihui|yaoyao|tingting|mei-jia|female|女/i;
  const malePattern = /yunxi|yunjian|kangkang|danny|male|男/i;
  if (role === "female") return voices.find((voice) => femalePattern.test(voice.name)) || voices[0];
  if (role === "male") return voices.find((voice) => malePattern.test(voice.name)) || voices.find((voice) => !femalePattern.test(voice.name)) || voices[0];
  return voices[0];
}

function speakChineseText(text, rate = 0.78, onend, { role = "narrator" } = {}) {
  if (!state.sound) {
    showToast("Âm thanh đang tắt trong cài đặt.", "🔇");
    return;
  }
  if (!text || !("speechSynthesis" in window)) {
    showToast("Thiết bị này chưa hỗ trợ đọc phát âm.", "!");
    return;
  }
  window.speechSynthesis.cancel();
  const expressiveText = String(text).replaceAll("。", "。 ").replaceAll("？", "？ ").replaceAll("！", "！ ");
  const utterance = new SpeechSynthesisUtterance(expressiveText);
  utterance.lang = "zh-CN";
  utterance.rate = rate;
  utterance.pitch = role === "male" ? 0.92 : role === "female" ? 1.04 : 1;
  utterance.volume = 1;
  if (onend) utterance.onend = onend;
  const chineseVoice = preferredChineseVoice(role);
  if (chineseVoice) utterance.voice = chineseVoice;
  window.speechSynthesis.speak(utterance);
}

function speakWord(wordId) {
  const word = getWord(wordId);
  speakChineseText(word?.hanzi);
}

function playDialogue(startIndex = 0) {
  const lesson = getCourseLesson(selectedCourseLessonId);
  if (!lesson) return;
  const line = lesson.dialogue[startIndex];
  if (!line) return;
  const role = startIndex % 2 === 0 ? "female" : "male";
  speakChineseText(line.hanzi, 0.74, () => {
    if (startIndex + 1 < lesson.dialogue.length) setTimeout(() => playDialogue(startIndex + 1), 520);
  }, { role });
}

function practiceSpeaking() {
  const result = document.querySelector("#speech-result");
  const lesson = getCourseLesson(selectedCourseLessonId);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    result.textContent = "Trình duyệt chưa hỗ trợ chấm giọng nói. Hãy nghe mẫu rồi tự nhại lại nhé.";
    speakChineseText(lesson?.dialogue[0]?.hanzi, 0.68);
    return;
  }
  const recognition = new Recognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  result.textContent = "Đang nghe… hãy nói câu mẫu 🎙";
  recognition.onresult = (event) => {
    const heard = event.results[0][0].transcript;
    result.innerHTML = `App nghe được: <strong>${escapeHtml(heard)}</strong> · +5 XP`;
    recordStudy({ xp: 5, type: "speak" });
    launchConfetti(12);
  };
  recognition.onerror = () => { result.textContent = "Chưa nghe rõ. Chạm và thử nói lại chậm hơn nhé."; };
  recognition.start();
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
      if (pageButton.dataset.page === "write") writingReturnPage = null;
      navigate(pageButton.dataset.page);
      return;
    }

    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) return;
    const action = actionElement.dataset.action;

    if (action === "open-practice") {
      practiceMode = actionElement.dataset.mode === "speaking" ? "speaking" : "dictation";
      navigate("practice");
    }
    if (action === "select-practice-mode") {
      activeRecognition?.abort?.();
      activeRecognition = null;
      practiceMode = actionElement.dataset.mode === "speaking" ? "speaking" : "dictation";
      renderPractice();
    }
    if (action === "select-practice-level") {
      practiceLevel = Math.min(3, Math.max(1, Number(actionElement.dataset.level) || 1));
      renderPractice();
    }
    if (action === "select-practice-content") {
      practiceContent = actionElement.dataset.content === "sentences" ? "sentences" : "words";
      renderPractice();
    }
    if (action === "start-dictation") startDictationSession();
    if (action === "play-dictation") speakPracticeTarget(currentDictationTarget(), 0.72);
    if (action === "play-dictation-slow") speakPracticeTarget(currentDictationTarget(), 0.52);
    if (action === "toggle-dictation-hint" && dictationSession) {
      dictationSession.hint = !dictationSession.hint;
      renderPractice();
    }
    if (action === "submit-dictation") submitDictation();
    if (action === "next-dictation") nextDictation();
    if (action === "exit-dictation" || action === "reset-dictation") {
      dictationSession = null;
      renderPractice();
    }
    if (action === "restart-dictation") startDictationSession();
    if (action === "speak-practice-target") {
      const target = dictationSession?.wrong.find((item) => item.target.id === actionElement.dataset.target)?.target;
      speakPracticeTarget(target, 0.68);
    }
    if (action === "start-speaking-game") startSpeakingGame();
    if (action === "listen-speaking-sample") speakPracticeTarget(speakingSession?.targets[speakingSession.index], 0.66);
    if (action === "record-speaking") startSpeakingRecognition();
    if (action === "next-speaking") acceptSpeakingResult();
    if (action === "skip-speaking") acceptSpeakingResult({ skipped: true });
    if (action === "exit-speaking" || action === "reset-speaking") {
      activeRecognition?.abort?.();
      activeRecognition = null;
      speakingSession = null;
      renderPractice();
    }
    if (action === "restart-speaking") startSpeakingGame();
    if (action === "start-lesson") openCourseLesson(actionElement.dataset.lesson);
    if (action === "select-level") {
      selectedLevel = Number(actionElement.dataset.level) || 1;
      renderLearn();
    }
    if (action === "lesson-skill") {
      activeLessonSkill = actionElement.dataset.skill;
      renderCourseLesson();
    }
    if (action === "play-dialogue") playDialogue();
    if (action === "play-line") {
      const lesson = getCourseLesson(selectedCourseLessonId);
      const lineIndex = Number(actionElement.dataset.line);
      speakChineseText(lesson?.dialogue[lineIndex]?.hanzi, 0.72, null, { role: lineIndex % 2 === 0 ? "female" : "male" });
    }
    if (action === "practice-speaking") practiceSpeaking();
    if (action === "start-course-flashcards") startFlashcards("lesson", selectedCourseLessonId);
    if (action === "start-course-quiz") startQuiz(getLessonWords(selectedCourseLessonId));
    if (action === "start-mock-exam") startMockExam(Number(actionElement.dataset.level) || 1, Number(actionElement.dataset.exam) || 1);
    if (action === "start-standard-exam") startStandardExam(Number(actionElement.dataset.level) || 1, Number(actionElement.dataset.exam) || 1);
    if (action === "select-exam-level") {
      selectedExamLevel = Number(actionElement.dataset.level) || 1;
      renderExams();
    }
    if (action === "select-exam-category") {
      selectedExamCategory = actionElement.dataset.category === "vocabulary" ? "vocabulary" : "standard";
      renderExams();
    }
    if (action === "play-standard-audio") playStandardAudio();
    if (action === "append-standard-token") {
      const index = Number(actionElement.dataset.index);
      if (!quizSession.draftIndices.includes(index)) quizSession.draftIndices.push(index);
      renderQuiz();
    }
    if (action === "clear-standard-draft") {
      quizSession.draftIndices = [];
      renderQuiz();
    }
    if (action === "submit-standard-writing") answerStandardWriting();
    if (action === "lesson-write") {
      const writingWord = getLessonWords(selectedCourseLessonId)[0];
      if (writingWord) selectedWritingId = writingWord.id;
      writingMode = "course";
      selectedWritingLesson = selectedCourseLessonId;
      activeWritingCharacter = 0;
      writingReturnPage = "lesson";
      navigate("write");
    }
    if (action === "start-review") startFlashcards("review");
    if (action === "start-mistake-review") startFlashcards("mistakes");
    if (action === "start-session-mistakes") startFlashcards("mistakes", null, quizSession?.wrongIds || []);
    if (action === "open-writing-word") openWritingWord(actionElement.dataset.word);
    if (action === "remove-mistake") removeMistake(actionElement.dataset.word);
    if (action === "return-from-writing") {
      const destination = writingReturnPage || "review";
      writingReturnPage = null;
      navigate(destination, { updateHash: false });
    }
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
    if (action === "animate-strokes") animateStrokeOrder();
    if (action === "stroke-quiz") startStrokeQuiz();
    if (action === "select-writing-mode") {
      writingMode = actionElement.dataset.mode === "lookup" ? "lookup" : "course";
      writingStrokes = [];
      renderWrite();
    }
    if (action === "apply-pinyin-lookup") applyPinyinLookup();
    if (action === "clear-pinyin-lookup") {
      lookupImeValue = "";
      lookupDirectValue = "";
      writingStrokes = [];
      renderWrite();
      requestAnimationFrame(() => document.querySelector("#pinyin-ime-editor")?.focus?.());
    }
    if (action === "select-lookup-character") {
      lookupCharacterIndex = Number(actionElement.dataset.index) || 0;
      writingStrokes = [];
      renderWrite();
    }
    if (action === "speak-lookup") speakChineseText(lookupHanzi, 0.76);
    if (action === "writing-character") {
      activeWritingCharacter = Number(actionElement.dataset.index) || 0;
      writingStrokes = [];
      renderWrite();
    }
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
    if (event.target.id === "direct-hanzi-input") lookupDirectValue = event.target.value;
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "pinyin-ime-editor") {
      lookupImeValue = String(event.detail?.value ?? event.target.value ?? "");
    }
    if (event.target.id === "dictation-answer-ime" && dictationSession) {
      dictationSession.answer = String(event.detail?.value ?? event.target.value ?? "");
    }
    if (event.target.id === "word-lesson-filter") {
      wordLessonFilter = event.target.value;
      updateWordResults();
    }
    if (event.target.id === "writing-word-select") {
      selectedWritingId = event.target.value;
      activeWritingCharacter = 0;
      writingStrokes = [];
      renderWrite();
    }
    if (event.target.id === "writing-lesson-select") {
      selectedWritingLesson = Number(event.target.value) || 1;
      selectedWritingId = getLessonWords(selectedWritingLesson)[0]?.id;
      activeWritingCharacter = 0;
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
