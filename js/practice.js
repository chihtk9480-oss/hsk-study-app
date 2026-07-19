export function normalizeChinese(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

export function alignChinese(expectedValue, actualValue) {
  const expected = Array.from(normalizeChinese(expectedValue));
  const actual = Array.from(normalizeChinese(actualValue));
  const rows = expected.length + 1;
  const columns = actual.length + 1;
  const distance = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let row = 0; row < rows; row += 1) distance[row][0] = row;
  for (let column = 0; column < columns; column += 1) distance[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const replaceCost = expected[row - 1] === actual[column - 1] ? 0 : 1;
      distance[row][column] = Math.min(
        distance[row - 1][column] + 1,
        distance[row][column - 1] + 1,
        distance[row - 1][column - 1] + replaceCost,
      );
    }
  }

  const operations = [];
  let row = expected.length;
  let column = actual.length;
  while (row > 0 || column > 0) {
    if (
      row > 0
      && column > 0
      && expected[row - 1] === actual[column - 1]
      && distance[row][column] === distance[row - 1][column - 1]
    ) {
      operations.push({ type: "match", expected: expected[row - 1], actual: actual[column - 1], expectedIndex: row - 1, actualIndex: column - 1 });
      row -= 1;
      column -= 1;
      continue;
    }
    if (row > 0 && column > 0 && distance[row][column] === distance[row - 1][column - 1] + 1) {
      operations.push({ type: "replace", expected: expected[row - 1], actual: actual[column - 1], expectedIndex: row - 1, actualIndex: column - 1 });
      row -= 1;
      column -= 1;
      continue;
    }
    if (row > 0 && distance[row][column] === distance[row - 1][column] + 1) {
      operations.push({ type: "missing", expected: expected[row - 1], actual: "", expectedIndex: row - 1, actualIndex: column });
      row -= 1;
      continue;
    }
    operations.push({ type: "extra", expected: "", actual: actual[column - 1], expectedIndex: row, actualIndex: column - 1 });
    column -= 1;
  }

  return {
    expected: expected.join(""),
    actual: actual.join(""),
    distance: distance[expected.length][actual.length],
    operations: operations.reverse(),
  };
}

export function similarityScore(expectedValue, actualValue) {
  const result = alignChinese(expectedValue, actualValue);
  const longest = Math.max(Array.from(result.expected).length, Array.from(result.actual).length, 1);
  return Math.max(0, Math.round(((longest - result.distance) / longest) * 100));
}
