const sections = [...document.querySelectorAll('.chapter')];
const revealItems = [...document.querySelectorAll('.reveal')];
const progressFill = document.getElementById('progressFill');
const menuButton = document.getElementById('menuButton');
const chapterNav = document.getElementById('chapterNav');
const navLinks = [...chapterNav.querySelectorAll('a')];
const previousRoom = document.getElementById('previousRoom');
const nextRoom = document.getElementById('nextRoom');
const currentRoom = document.getElementById('currentRoom');
const totalRooms = document.getElementById('totalRooms');

let currentIndex = Math.max(0, sections.findIndex((section) => `#${section.id}` === window.location.hash));
let wheelLocked = false;
let touchStartY = null;

totalRooms.textContent = String(sections.length).padStart(2, '0');

function setMenu(open) {
  chapterNav.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('nav-open', open);
}

function showRoom(index, options = {}) {
  const { updateHash = true } = options;
  const nextIndex = Math.max(0, Math.min(sections.length - 1, index));
  if (nextIndex === currentIndex && sections[nextIndex].classList.contains('active')) {
    setMenu(false);
    return;
  }

  currentIndex = nextIndex;

  sections.forEach((section, sectionIndex) => {
    section.classList.toggle('active', sectionIndex === currentIndex);
    section.classList.toggle('before', sectionIndex < currentIndex);
    section.classList.toggle('after', sectionIndex > currentIndex);
    section.setAttribute('aria-hidden', String(sectionIndex !== currentIndex));
  });

  revealItems.forEach((item) => {
    item.classList.toggle('visible', item.closest('.chapter') === sections[currentIndex]);
  });

  navLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.section === sections[currentIndex].id);
  });

  currentRoom.textContent = String(currentIndex + 1).padStart(2, '0');
  previousRoom.disabled = currentIndex === 0;
  nextRoom.disabled = currentIndex === sections.length - 1;
  progressFill.style.width = `${((currentIndex + 1) / sections.length) * 100}%`;
  document.title = `${sections[currentIndex].dataset.title} — Isaac Barrow`;

  if (updateHash) {
    history.replaceState(null, '', `#${sections[currentIndex].id}`);
  }

  setMenu(false);

  if (sections[currentIndex].id === 'laboratory') {
    window.requestAnimationFrame(() => {
      if (typeof drawGraph === 'function') drawGraph();
    });
  }
}

function moveRoom(direction) {
  showRoom(currentIndex + direction);
}

menuButton.addEventListener('click', () => setMenu(!chapterNav.classList.contains('open')));
previousRoom.addEventListener('click', () => moveRoom(-1));
nextRoom.addEventListener('click', () => moveRoom(1));

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const targetId = link.getAttribute('href').slice(1);
  const targetIndex = sections.findIndex((section) => section.id === targetId);
  if (targetIndex < 0) return;
  event.preventDefault();
  showRoom(targetIndex);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setMenu(false);
    return;
  }

  if (chapterNav.classList.contains('open')) return;
  const tag = document.activeElement?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault();
    moveRoom(1);
  }

  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    moveRoom(-1);
  }

  if (event.key === 'Home') {
    event.preventDefault();
    showRoom(0);
  }

  if (event.key === 'End') {
    event.preventDefault();
    showRoom(sections.length - 1);
  }
});

window.addEventListener('wheel', (event) => {
  if (window.innerWidth <= 760 || chapterNav.classList.contains('open')) return;
  if (event.target.closest('input, button, a, .chapter-nav')) return;
  event.preventDefault();
  if (wheelLocked || Math.abs(event.deltaY) < 18) return;
  moveRoom(event.deltaY > 0 ? 1 : -1);
  wheelLocked = true;
  window.setTimeout(() => { wheelLocked = false; }, 760);
}, { passive: false });

window.addEventListener('touchstart', (event) => {
  touchStartY = event.changedTouches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (event) => {
  if (touchStartY === null || window.innerWidth <= 760) return;
  const distance = touchStartY - event.changedTouches[0].clientY;
  touchStartY = null;
  if (Math.abs(distance) > 55) moveRoom(distance > 0 ? 1 : -1);
}, { passive: true });

window.addEventListener('hashchange', () => {
  const hashIndex = sections.findIndex((section) => `#${section.id}` === window.location.hash);
  if (hashIndex >= 0) showRoom(hashIndex, { updateHash: false });
});

// Curator note.
const noteButton = document.getElementById('noteButton');
const curatorNote = document.getElementById('curatorNote');
noteButton.addEventListener('click', () => {
  const expanded = noteButton.getAttribute('aria-expanded') === 'true';
  noteButton.setAttribute('aria-expanded', String(!expanded));
  curatorNote.hidden = expanded;
  noteButton.querySelector('span').textContent = expanded ? '+' : '−';
});

// Interactive calculus canvas.
const canvas = document.getElementById('calculusCanvas');
const ctx = canvas.getContext('2d');
const xSlider = document.getElementById('xSlider');
const xValue = document.getElementById('xValue');
const slopeValue = document.getElementById('slopeValue');
const areaValue = document.getElementById('areaValue');
const toggles = [...document.querySelectorAll('.toggle')];
let graphMode = 'both';

function drawGraph() {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 900;
  const cssHeight = cssWidth * (470 / 900);
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = cssWidth;
  const height = cssHeight;
  const pad = { left: width * 0.11, right: width * 0.07, top: height * 0.08, bottom: height * 0.13 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxX = 4;
  const maxY = 16;
  const px = (x) => pad.left + (x / maxX) * plotW;
  const py = (y) => height - pad.bottom - (y / maxY) * plotH;
  const selectedX = Number(xSlider.value);
  const selectedY = selectedX ** 2;
  const slope = 2 * selectedX;

  ctx.clearRect(0, 0, width, height);

  // Axes.
  ctx.strokeStyle = 'rgba(24, 23, 19, 0.42)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(0), py(0));
  ctx.lineTo(px(maxX), py(0));
  ctx.moveTo(px(0), py(0));
  ctx.lineTo(px(0), py(maxY));
  ctx.stroke();

  ctx.fillStyle = 'rgba(24, 23, 19, 0.58)';
  ctx.font = `${Math.max(10, width * 0.013)}px system-ui`;
  for (let i = 0; i <= maxX; i += 1) {
    ctx.fillText(String(i), px(i) - 3, py(0) + 18);
  }
  for (let i = 4; i <= maxY; i += 4) {
    ctx.fillText(String(i), px(0) - 26, py(i) + 4);
  }

  // Area under curve.
  if (graphMode === 'both' || graphMode === 'area') {
    const areaGradient = ctx.createLinearGradient(0, py(selectedY), 0, py(0));
    areaGradient.addColorStop(0, 'rgba(180, 139, 78, 0.42)');
    areaGradient.addColorStop(1, 'rgba(180, 139, 78, 0.08)');
    ctx.fillStyle = areaGradient;
    ctx.beginPath();
    ctx.moveTo(px(0), py(0));
    for (let x = 0; x <= selectedX; x += 0.025) ctx.lineTo(px(x), py(x * x));
    ctx.lineTo(px(selectedX), py(0));
    ctx.closePath();
    ctx.fill();
  }

  // Curve.
  ctx.strokeStyle = '#8d3d2b';
  ctx.lineWidth = Math.max(2.5, width * 0.0045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = 0; x <= maxX; x += 0.025) {
    const method = x === 0 ? 'moveTo' : 'lineTo';
    ctx[method](px(x), py(x * x));
  }
  ctx.stroke();

  // Tangent line y = slope*x - x0^2.
  if (graphMode === 'both' || graphMode === 'tangent') {
    const xStart = Math.max(0, selectedX - 1.35);
    const xEnd = Math.min(maxX, selectedX + 1.35);
    const yAt = (x) => slope * x - selectedX ** 2;
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = '#181713';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px(xStart), py(yAt(xStart)));
    ctx.lineTo(px(xEnd), py(yAt(xEnd)));
    ctx.stroke();
    ctx.restore();
  }

  // Point.
  ctx.fillStyle = '#181713';
  ctx.beginPath();
  ctx.arc(px(selectedX), py(selectedY), Math.max(5, width * 0.008), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f4efe5';
  ctx.lineWidth = 3;
  ctx.stroke();

  xValue.textContent = selectedX.toFixed(1);
  slopeValue.textContent = slope.toFixed(1);
  areaValue.textContent = ((selectedX ** 3) / 3).toFixed(2);
}

xSlider.addEventListener('input', drawGraph);
toggles.forEach((toggle) => {
  toggle.addEventListener('click', () => {
    graphMode = toggle.dataset.mode;
    toggles.forEach((button) => button.classList.toggle('active', button === toggle));
    drawGraph();
  });
});
window.addEventListener('resize', drawGraph);
requestAnimationFrame(drawGraph);

// Quiz.
const quizData = [
  {
    question: 'What major idea did Barrow help reveal?',
    answers: [
      'That differentiation and integration are inverse processes',
      'That every equation has exactly two answers',
      'That geometry should replace all algebra'
    ],
    correct: 0,
    explanation: 'Correct — Barrow clearly connected tangent-finding and area-finding as inverse processes.'
  },
  {
    question: 'Which famous mathematician attended Barrow’s lectures?',
    answers: ['Euclid', 'Isaac Newton', 'Alan Turing'],
    correct: 1,
    explanation: 'Correct — Newton attended Barrow’s lectures and later succeeded him as Lucasian Professor.'
  },
  {
    question: 'What does a tangent line tell us in calculus?',
    answers: ['The instantaneous slope at a point', 'The total area of every curve', 'The exact age of a function'],
    correct: 0,
    explanation: 'Correct — a tangent line represents the instantaneous rate of change, or slope, at a point.'
  }
];

const questionText = document.getElementById('questionText');
const questionNumber = document.getElementById('questionNumber');
const answersContainer = document.getElementById('answers');
const feedback = document.getElementById('feedback');
const nextQuestion = document.getElementById('nextQuestion');
const quizProgress = document.getElementById('quizProgress');
const quizCard = document.getElementById('quizCard');
let currentQuestion = 0;
let score = 0;
let answered = false;

function renderQuestion() {
  answered = false;
  const item = quizData[currentQuestion];
  questionText.textContent = item.question;
  questionNumber.textContent = String(currentQuestion + 1).padStart(2, '0');
  quizProgress.textContent = `Question ${currentQuestion + 1} of ${quizData.length}`;
  feedback.textContent = '';
  nextQuestion.hidden = true;
  answersContainer.innerHTML = '';

  item.answers.forEach((answer, index) => {
    const button = document.createElement('button');
    button.className = 'answer-button';
    button.textContent = answer;
    button.addEventListener('click', () => checkAnswer(index, button));
    answersContainer.appendChild(button);
  });
}

function checkAnswer(index, selectedButton) {
  if (answered) return;
  answered = true;
  const item = quizData[currentQuestion];
  const buttons = [...answersContainer.querySelectorAll('button')];
  buttons.forEach((button) => { button.disabled = true; });
  buttons[item.correct].classList.add('correct');

  if (index === item.correct) {
    score += 1;
    feedback.textContent = item.explanation;
  } else {
    selectedButton.classList.add('incorrect');
    feedback.textContent = `Not quite. ${item.explanation}`;
  }

  nextQuestion.textContent = currentQuestion === quizData.length - 1 ? 'See result →' : 'Next question →';
  nextQuestion.hidden = false;
}

nextQuestion.addEventListener('click', () => {
  currentQuestion += 1;
  if (currentQuestion < quizData.length) {
    renderQuestion();
    return;
  }

  quizProgress.textContent = 'Exhibit complete';
  quizCard.innerHTML = `
    <p class="question-number">YOUR RESULT</p>
    <p class="quiz-score">${score} / ${quizData.length}</p>
    <h3>${score === 3 ? 'Curator-level knowledge.' : score === 2 ? 'A strong visit.' : 'One more walk through the galleries?'}</h3>
    <p>${score === 3 ? 'You connected Barrow, Newton, tangents, and areas.' : 'Return to any chapter using the exhibit menu and try again.'}</p>
    <a class="next-button" href="#sources">Continue to sources →</a>
  `;
});

renderQuestion();
showRoom(currentIndex, { updateHash: !window.location.hash });
