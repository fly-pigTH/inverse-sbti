import { sbtiData } from './data.js';

const state = {
  shuffledQuestions: [],
  answers: {},
  result: null
};

const els = {
  homeScreen: document.getElementById('homeScreen'),
  testScreen: document.getElementById('testScreen'),
  resultScreen: document.getElementById('resultScreen'),
  startBtn: document.getElementById('startBtn'),
  backHomeBtn: document.getElementById('backHomeBtn'),
  submitBtn: document.getElementById('submitBtn'),
  restartBtn: document.getElementById('restartBtn'),
  toTopBtn: document.getElementById('toTopBtn'),
  questionList: document.getElementById('questionList'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  progressHint: document.getElementById('progressHint'),
  testHint: document.getElementById('testHint'),
  resultModeKicker: document.getElementById('resultModeKicker'),
  posterCode: document.getElementById('posterCode'),
  resultTypeName: document.getElementById('resultTypeName'),
  resultIntro: document.getElementById('resultIntro'),
  matchBadge: document.getElementById('matchBadge'),
  resultAlias: document.getElementById('resultAlias'),
  resultDesc: document.getElementById('resultDesc'),
  topMatches: document.getElementById('topMatches'),
  dimList: document.getElementById('dimList'),
  funNote: document.getElementById('funNote'),
  posterCard: document.getElementById('posterCard')
};

const optionCodes = ['A', 'B', 'C', 'D'];

function init() {
  bindEvents();
  renderHome();
}

function bindEvents() {
  els.startBtn.addEventListener('click', startTest);
  els.backHomeBtn.addEventListener('click', () => showScreen('home'));
  els.submitBtn.addEventListener('click', submitTest);
  els.restartBtn.addEventListener('click', startTest);
  els.toTopBtn.addEventListener('click', () => showScreen('home'));
}

function showScreen(name) {
  els.homeScreen.classList.toggle('active', name === 'home');
  els.testScreen.classList.toggle('active', name === 'test');
  els.resultScreen.classList.toggle('active', name === 'result');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHome() {
  showScreen('home');
}

function startTest() {
  state.answers = {};
  state.result = null;

  const shuffledRegular = shuffleArray(sbtiData.questions);
  const insertIndex = Math.floor(Math.random() * shuffledRegular.length) + 1;
  state.shuffledQuestions = [
    ...shuffledRegular.slice(0, insertIndex),
    sbtiData.specialQuestions[0],
    ...shuffledRegular.slice(insertIndex)
  ];

  renderQuestions();
  showScreen('test');
}

function getVisibleQuestions() {
  const visible = [...state.shuffledQuestions];
  const gateIndex = visible.findIndex((question) => question.id === sbtiData.specialQuestions[0].id);
  if (gateIndex !== -1 && state.answers[sbtiData.specialQuestions[0].id] === 3) {
    visible.splice(gateIndex + 1, 0, sbtiData.specialQuestions[1]);
  }
  return visible;
}

function renderQuestions() {
  const visibleQuestions = getVisibleQuestions();
  els.questionList.innerHTML = visibleQuestions.map((question, index) => {
    const dimLabel = question.special ? '补充题' : '维度已隐藏';
    const optionsHtml = question.options.map((option, optionIndex) => {
      const checked = state.answers[question.id] === option.value ? 'checked' : '';
      return `
        <label class="option">
          <input type="radio" name="${question.id}" value="${option.value}" ${checked} />
          <span class="option-code">${optionCodes[optionIndex] ?? optionIndex + 1}</span>
          <span>${escapeHtml(option.label)}</span>
        </label>
      `;
    }).join('');

    return `
      <article class="question-card">
        <div class="question-head">
          <span class="question-index">第 ${index + 1} 题</span>
          <span class="question-dim">${dimLabel}</span>
        </div>
        <div class="question-title">${escapeHtml(question.text)}</div>
        <div class="options">${optionsHtml}</div>
      </article>
    `;
  }).join('');

  els.questionList.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener('change', handleAnswerChange);
  });

  updateProgress();
}

function handleAnswerChange(event) {
  const { name, value } = event.target;
  state.answers[name] = Number(value);

  if (name === sbtiData.specialQuestions[0].id) {
    if (Number(value) !== 3) {
      delete state.answers[sbtiData.specialQuestions[1].id];
    }
    renderQuestions();
    return;
  }

  updateProgress();
}

function updateProgress() {
  const visibleQuestions = getVisibleQuestions();
  const total = visibleQuestions.length;
  const done = visibleQuestions.filter((question) => state.answers[question.id] !== undefined).length;
  const progress = total ? (done / total) * 100 : 0;

  els.progressBar.style.width = `${progress}%`;
  els.progressText.textContent = `${done} / ${total}`;
  els.progressHint.textContent = total === 32 ? '饮酒隐藏分支已激活' : '题目顺序会随机打乱';
  els.submitBtn.disabled = done !== total || total === 0;
  els.testHint.textContent = done === total && total > 0
    ? '都做完了。现在可以把你的电子魂魄交给结果页审判。'
    : '全选完才会放行。世界已经够乱了，起码把题做完整。';
}

function submitTest() {
  state.result = computeResult();
  renderResult();
  showScreen('result');
}

function computeResult() {
  const rawScores = {};
  sbtiData.dimensionOrder.forEach((dim) => {
    rawScores[dim] = 0;
  });

  sbtiData.questions.forEach((question) => {
    rawScores[question.dim] += Number(state.answers[question.id] || 0);
  });

  const levels = {};
  Object.entries(rawScores).forEach(([dim, score]) => {
    levels[dim] = sumToLevel(score);
  });

  const userVector = sbtiData.dimensionOrder.map((dim) => levelNum(levels[dim]));
  const ranked = sbtiData.normalTypes.map((type) => {
    const vector = parsePattern(type.pattern).map(levelNum);
    let distance = 0;
    let exact = 0;

    for (let index = 0; index < vector.length; index += 1) {
      const diff = Math.abs(userVector[index] - vector[index]);
      distance += diff;
      if (diff === 0) exact += 1;
    }

    const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));
    return {
      ...type,
      ...sbtiData.typeLibrary[type.code],
      distance,
      exact,
      similarity
    };
  }).sort((left, right) => {
    if (left.distance !== right.distance) return left.distance - right.distance;
    if (right.exact !== left.exact) return right.exact - left.exact;
    return right.similarity - left.similarity;
  });

  const bestNormal = ranked[0];
  const drunkTriggered = state.answers[sbtiData.drunkTriggerQuestionId] === 2;

  let finalType;
  let modeKicker = '你的主类型';
  let badge = `匹配度 ${bestNormal.similarity}% · 精准命中 ${bestNormal.exact}/15 维`;
  let alias = '维度命中度较高，当前结果可视为你的第一人格画像。';
  let special = false;

  if (drunkTriggered) {
    finalType = sbtiData.typeLibrary.DRUNK;
    modeKicker = '隐藏人格已激活';
    badge = '匹配度 100% · 酒精异常因子已接管';
    alias = '乙醇亲和性过强，系统已直接跳过常规人格审判。';
    special = true;
  } else if (bestNormal.similarity < 60) {
    finalType = sbtiData.typeLibrary.HHHH;
    modeKicker = '系统强制兜底';
    badge = `标准人格库最高匹配仅 ${bestNormal.similarity}%`;
    alias = '标准人格库对你的脑回路集体罢工了，于是系统把你强制分配给了 HHHH。';
    special = true;
  } else {
    finalType = bestNormal;
  }

  return {
    rawScores,
    levels,
    ranked,
    bestNormal,
    finalType,
    modeKicker,
    badge,
    alias,
    special
  };
}

function renderResult() {
  const result = state.result;
  const type = result.finalType;
  const tone = toneForCode(type.code);

  els.resultModeKicker.textContent = result.modeKicker;
  els.posterCode.textContent = type.code;
  els.resultTypeName.textContent = `${type.code}（${type.cn}）`;
  els.resultIntro.textContent = type.intro;
  els.matchBadge.textContent = result.badge;
  els.resultAlias.textContent = result.alias;
  els.resultDesc.textContent = type.desc;
  els.funNote.textContent = result.special
    ? '本测试仅供娱乐。隐藏人格和傻乐兜底都属于作者故意埋的损招，请勿将其视为医学、心理学、命理学或现实判断依据。'
    : '本测试仅供娱乐。页面为开源重建实现，结果仅代表当前公开版本的题库与匹配模型。';
  els.posterCard.dataset.tone = tone;

  els.topMatches.innerHTML = result.ranked.slice(0, 3).map((match, index) => `
    <div class="top-match">
      <div>
        <strong>#${index + 1} ${match.code}（${match.cn}）</strong>
        <span>精准命中 ${match.exact}/15 维</span>
      </div>
      <em>${match.similarity}%</em>
    </div>
  `).join('');

  els.dimList.innerHTML = sbtiData.dimensionOrder.map((dim) => {
    const level = result.levels[dim];
    return `
      <div class="dim-item">
        <div class="dim-head">
          <span class="dim-name">${sbtiData.dimensionMeta[dim].name}</span>
          <span class="dim-score">${level} / ${result.rawScores[dim]}分</span>
        </div>
        <p>${sbtiData.dimExplanations[dim][level]}</p>
      </div>
    `;
  }).join('');
}

function parsePattern(pattern) {
  return pattern.replaceAll('-', '').split('');
}

function sumToLevel(score) {
  if (score <= 3) return 'L';
  if (score === 4) return 'M';
  return 'H';
}

function levelNum(level) {
  return { L: 1, M: 2, H: 3 }[level];
}

function toneForCode(code) {
  const tones = ['red', 'green', 'gold', 'ink'];
  const total = [...code].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[total % tones.length];
}

function shuffleArray(input) {
  const array = [...input];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

init();
