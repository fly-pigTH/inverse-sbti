import { sbtiData } from './data.js';

const state = {
  shuffledQuestions: [],
  answers: {},
  result: null,
  activeQuestionId: null,
  previewQuestionId: null,
  previewValue: null
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
  vectorPanel: document.getElementById('vectorPanel'),
  vectorTypePreview: document.getElementById('vectorTypePreview'),
  vectorFocus: document.getElementById('vectorFocus'),
  vectorBranchHint: document.getElementById('vectorBranchHint'),
  vectorGrid: document.getElementById('vectorGrid'),
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
const desktopMedia = window.matchMedia('(min-width: 981px)');

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
  window.addEventListener('scroll', handleViewportChange, { passive: true });
  window.addEventListener('resize', handleViewportChange, { passive: true });
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
  state.activeQuestionId = null;
  state.previewQuestionId = null;
  state.previewValue = null;

  const shuffledRegular = shuffleArray(sbtiData.questions);
  const insertIndex = Math.floor(Math.random() * shuffledRegular.length) + 1;
  state.shuffledQuestions = [
    ...shuffledRegular.slice(0, insertIndex),
    sbtiData.specialQuestions[0],
    ...shuffledRegular.slice(insertIndex)
  ];

  showScreen('test');
  renderQuestions();
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
        <label class="option" data-question-id="${question.id}" data-value="${option.value}">
          <input type="radio" name="${question.id}" value="${option.value}" ${checked} />
          <span class="option-code">${optionCodes[optionIndex] ?? optionIndex + 1}</span>
          <span>${escapeHtml(option.label)}</span>
        </label>
      `;
    }).join('');

    return `
      <article class="question-card" data-question-id="${question.id}" data-dim="${question.dim ?? ''}">
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

  els.questionList.querySelectorAll('.option').forEach((option) => {
    option.addEventListener('pointerenter', () => {
      setPreview(option.dataset.questionId, Number(option.dataset.value));
    });
    option.addEventListener('pointerleave', () => {
      clearPreview(option.dataset.questionId);
    });
    option.addEventListener('focusin', () => {
      setPreview(option.dataset.questionId, Number(option.dataset.value));
    });
    option.addEventListener('focusout', () => {
      clearPreview(option.dataset.questionId);
    });
  });

  updateProgress();
  updateActiveQuestionFromViewport(true);
  renderVectorMonitor();
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
  renderVectorMonitor();
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

function handleViewportChange() {
  if (!els.testScreen.classList.contains('active')) {
    return;
  }
  updateActiveQuestionFromViewport();
}

function updateActiveQuestionFromViewport(force = false) {
  const cards = [...els.questionList.querySelectorAll('.question-card')];
  if (!cards.length) {
    return;
  }

  const anchor = desktopMedia.matches ? 144 : 110;
  let bestCard = cards[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    if (rect.bottom < anchor - 40) {
      return;
    }

    const scorePoint = rect.top + Math.min(rect.height * 0.28, 120);
    const distance = Math.abs(scorePoint - anchor);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCard = card;
    }
  });

  if (force || state.activeQuestionId !== bestCard.dataset.questionId) {
    state.activeQuestionId = bestCard.dataset.questionId;
    applyActiveQuestionClass();
    renderVectorMonitor();
  }
}

function applyActiveQuestionClass() {
  els.questionList.querySelectorAll('.question-card').forEach((card) => {
    card.classList.toggle('is-active-question', card.dataset.questionId === state.activeQuestionId);
  });
}

function setPreview(questionId, value) {
  state.previewQuestionId = questionId;
  state.previewValue = value;
  renderVectorMonitor();
}

function clearPreview(questionId) {
  if (state.previewQuestionId !== questionId) {
    return;
  }
  state.previewQuestionId = null;
  state.previewValue = null;
  renderVectorMonitor();
}

function submitTest() {
  state.result = computeResult();
  renderResult();
  showScreen('result');
}

function computeResult() {
  return computeSnapshot(state.answers);
}

function computeSnapshot(answerState) {
  const rawScores = {};
  sbtiData.dimensionOrder.forEach((dim) => {
    rawScores[dim] = 0;
  });

  sbtiData.questions.forEach((question) => {
    rawScores[question.dim] += Number(answerState[question.id] || 0);
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
  const drunkTriggered = answerState[sbtiData.drunkTriggerQuestionId] === 2;

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
    userVector,
    ranked,
    bestNormal,
    finalType,
    modeKicker,
    badge,
    alias,
    special
  };
}

function renderVectorMonitor() {
  const visibleQuestions = getVisibleQuestions();
  const activeQuestion = visibleQuestions.find((question) => question.id === state.activeQuestionId) ?? visibleQuestions[0];
  const baseSnapshot = computeSnapshot(state.answers);
  const previewAnswers = buildPreviewAnswers(activeQuestion);
  const previewSnapshot = computeSnapshot(previewAnswers);
  const answered = visibleQuestions.filter((question) => state.answers[question.id] !== undefined).length;
  const total = visibleQuestions.length;
  const hasPreview = Boolean(activeQuestion && state.previewQuestionId === activeQuestion.id && state.previewValue !== null);
  const currentValue = activeQuestion ? Number(state.answers[activeQuestion.id] || 0) : 0;
  const effectivePreviewValue = hasPreview ? state.previewValue : currentValue;

  if (!activeQuestion) {
    return;
  }

  els.vectorTypePreview.textContent = answered > 0
    ? `已答 ${answered}/${total} · 临时靠近 ${previewSnapshot.finalType.code}`
    : '等待作答';

  if (activeQuestion.special) {
    els.vectorFocus.textContent = activeQuestion.id === sbtiData.specialQuestions[0].id
      ? '当前是分支门题。它不会直接改变 15 维向量，但会决定是否展开饮酒隐藏支线。'
      : '当前是隐藏分支题。它不会改变 15 维向量，但可能直接覆盖最终人格结果。';
    els.vectorBranchHint.textContent = buildSpecialBranchHint(activeQuestion, effectivePreviewValue);
  } else {
    const dim = activeQuestion.dim;
    const meta = sbtiData.dimensionMeta[dim];
    const option = activeQuestion.options.find((item) => item.value === effectivePreviewValue);
    const baseRaw = baseSnapshot.rawScores[dim];
    const baseLevel = baseSnapshot.levels[dim];
    const nextRaw = previewSnapshot.rawScores[dim];
    const nextLevel = previewSnapshot.levels[dim];

    els.vectorFocus.textContent = hasPreview
      ? `当前题影响 ${meta.name}。若选 ${optionCodes[Math.max(0, activeQuestion.options.findIndex((item) => item.value === effectivePreviewValue))]}，该维度会从 ${baseLevel}/${baseRaw} 分变化到 ${nextLevel}/${nextRaw} 分。`
      : `当前锁定 ${meta.name}。选择本题选项后，这个维度会立刻在右侧向量里更新。`;

    els.vectorBranchHint.textContent = previewSnapshot.finalType.code !== baseSnapshot.finalType.code
      ? `当前预览会让临时靠近人格从 ${baseSnapshot.finalType.code} 变为 ${previewSnapshot.finalType.code}。`
      : `当前预览下，临时靠近人格仍是 ${previewSnapshot.finalType.code}。`;
  }

  els.vectorGrid.innerHTML = sbtiData.dimensionOrder.map((dim) => {
    const baseLevel = baseSnapshot.levels[dim];
    const previewLevel = previewSnapshot.levels[dim];
    const baseRaw = baseSnapshot.rawScores[dim];
    const previewRaw = previewSnapshot.rawScores[dim];
    const isActiveDim = !activeQuestion.special && activeQuestion.dim === dim;
    const isChanged = baseLevel !== previewLevel || baseRaw !== previewRaw;
    const classes = [
      'vector-node',
      isActiveDim ? 'is-active-dim' : '',
      isChanged ? 'is-preview-change' : ''
    ].filter(Boolean).join(' ');

    return `
      <div class="${classes}">
        <div class="vector-node-top">
          <span class="vector-node-code">${dim}</span>
          <span class="vector-node-name">${sbtiData.dimensionMeta[dim].name}</span>
        </div>
        <div class="vector-node-main">
          <strong class="vector-node-level">${previewLevel}</strong>
          <span class="vector-node-score">${previewRaw} 分</span>
        </div>
        <div class="vector-node-sub">
          ${isChanged
            ? `<span>${baseLevel}/${baseRaw}</span><span class="vector-node-arrow">→</span><span>${previewLevel}/${previewRaw}</span>`
            : `<span>当前稳定</span>`}
        </div>
      </div>
    `;
  }).join('');
}

function buildPreviewAnswers(activeQuestion) {
  const previewAnswers = { ...state.answers };

  if (!activeQuestion) {
    return previewAnswers;
  }

  const hasPreview = state.previewQuestionId === activeQuestion.id && state.previewValue !== null;
  if (hasPreview) {
    previewAnswers[activeQuestion.id] = state.previewValue;
  }

  if (activeQuestion.id === sbtiData.specialQuestions[0].id && previewAnswers[activeQuestion.id] !== 3) {
    delete previewAnswers[sbtiData.specialQuestions[1].id];
  }

  return previewAnswers;
}

function buildSpecialBranchHint(question, value) {
  if (question.id === sbtiData.specialQuestions[0].id) {
    return value === 3
      ? '当前预览会展开第 32 题饮酒支线，但 15 维向量本身不变。'
      : '当前预览不会展开饮酒支线，后面的常规向量判断保持默认路径。';
  }

  return value === 2
    ? '当前预览会触发 DRUNK 隐藏人格，直接覆盖常规模板匹配。'
    : '当前预览不会触发 DRUNK 覆盖，最终结果仍按 15 维模板匹配。';
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
