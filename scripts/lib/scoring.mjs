export const LEVEL_NUM = { L: 1, M: 2, H: 3 };
export const NUM_LEVEL = { 1: 'L', 2: 'M', 3: 'H' };
export const LEVEL_TO_PAIR_VALUES = {
  L: [1, 1],
  M: [2, 2],
  H: [3, 3]
};

export function parsePattern(pattern) {
  return pattern.replaceAll('-', '').split('');
}

export function sumToLevel(score) {
  if (score <= 3) return 'L';
  if (score === 4) return 'M';
  return 'H';
}

export function buildTypeVectors(normalTypes) {
  return normalTypes.map((type) => ({
    ...type,
    vector: parsePattern(type.pattern).map((level) => LEVEL_NUM[level])
  }));
}

export function computeLevelsFromAnswers(questions, dimensionOrder, answers) {
  const rawScores = {};
  for (const dim of dimensionOrder) {
    rawScores[dim] = 0;
  }

  for (const question of questions) {
    rawScores[question.dim] += Number(answers[question.id] || 0);
  }

  const levels = {};
  for (const [dim, score] of Object.entries(rawScores)) {
    levels[dim] = sumToLevel(score);
  }

  const userVector = dimensionOrder.map((dim) => LEVEL_NUM[levels[dim]]);
  return { rawScores, levels, userVector };
}

export function scoreLevels(levelVector, typeVectors) {
  return typeVectors.map((type) => {
    let distance = 0;
    let exact = 0;

    for (let index = 0; index < type.vector.length; index += 1) {
      const diff = Math.abs(levelVector[index] - type.vector[index]);
      distance += diff;
      if (diff === 0) exact += 1;
    }

    const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));
    return {
      code: type.code,
      distance,
      exact,
      similarity
    };
  }).sort((left, right) => {
    if (left.distance !== right.distance) return left.distance - right.distance;
    if (right.exact !== left.exact) return right.exact - left.exact;
    return right.similarity - left.similarity;
  });
}

export function computeFromLevelVector(data, levelVector, drunkTriggered = false) {
  const ranked = scoreLevels(levelVector, data.typeVectors);
  const bestNormal = ranked[0];
  let finalCode = bestNormal.code;

  if (drunkTriggered) {
    finalCode = 'DRUNK';
  } else if (bestNormal.distance >= 13) {
    finalCode = 'HHHH';
  }

  return {
    finalCode,
    bestNormal,
    ranked
  };
}

export function computeFromAnswers(data, answers) {
  const drunkTriggered = answers[data.drunkTriggerQuestionId] === 2;
  const { rawScores, levels, userVector } = computeLevelsFromAnswers(
    data.questions,
    data.dimensionOrder,
    answers
  );
  const scored = computeFromLevelVector(data, userVector, drunkTriggered);

  return {
    rawScores,
    levels,
    userVector,
    drunkTriggered,
    ...scored
  };
}
