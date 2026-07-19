const COMMON_PINYIN_CANDIDATES = {
  a: ["啊", "阿"],
  ai: ["爱", "矮"],
  ba: ["八", "爸", "吧", "把", "巴"],
  bai: ["白", "百"],
  ban: ["半", "班", "办", "般"],
  bei: ["北", "被", "杯"],
  bu: ["不", "步", "部"],
  chi: ["吃", "迟", "持"],
  da: ["大", "打", "答"],
  de: ["的", "得", "地"],
  dian: ["点", "店", "电"],
  ge: ["个", "哥", "歌"],
  hao: ["好", "号", "浩"],
  he: ["和", "喝", "河"],
  hen: ["很", "狠"],
  hui: ["会", "回", "灰"],
  jia: ["家", "加", "假"],
  jiao: ["叫", "教", "脚"],
  kan: ["看", "开", "刊"],
  lai: ["来", "赖"],
  le: ["了", "乐"],
  ma: ["吗", "妈", "马", "嘛"],
  mei: ["没", "美", "每", "妹"],
  men: ["们", "门"],
  ming: ["名", "明", "命"],
  na: ["哪", "那", "拿"],
  ni: ["你", "尼"],
  nin: ["您"],
  peng: ["朋", "碰"],
  qi: ["七", "起", "气", "期"],
  qian: ["钱", "前", "千"],
  qu: ["去", "取", "区"],
  ren: ["人", "认", "任"],
  san: ["三", "散"],
  shang: ["上", "商", "伤"],
  shei: ["谁"],
  shen: ["什", "身", "深"],
  shi: ["是", "十", "时", "事", "市", "师"],
  shui: ["水", "谁", "睡"],
  shuo: ["说", "硕"],
  ta: ["他", "她", "它"],
  tian: ["天", "田", "甜"],
  ting: ["听", "停", "厅"],
  wo: ["我", "握"],
  xi: ["西", "喜", "习", "洗"],
  xia: ["下", "夏", "吓"],
  xie: ["谢", "写", "些", "鞋"],
  xue: ["学", "雪", "血"],
  yi: ["一", "衣", "医", "意", "已"],
  you: ["有", "友", "又", "右"],
  zai: ["在", "再"],
  zhe: ["这", "着", "者"],
  zhong: ["中", "种", "重"],
  zi: ["子", "字", "自"],
  zou: ["走", "邹"],
};

export function normalizePinyinKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/u:/g, "v")
    .normalize("NFD")
    .replace(/u\u0308/g, "v")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^a-zv]/g, "");
}

export function createPinyinDictionary(vocabulary, common = COMMON_PINYIN_CANDIDATES) {
  const buckets = Object.create(null);

  const addCandidate = (key, word, frequency) => {
    const normalized = normalizePinyinKey(key);
    if (!normalized || !word) return;
    const bucket = buckets[normalized] || (buckets[normalized] = new Map());
    const previous = bucket.get(word) || 0;
    if (frequency > previous) bucket.set(word, frequency);
  };

  Object.entries(common).forEach(([key, words]) => {
    words.forEach((word, index) => addCandidate(key, word, 120_000 - index * 1_000));
  });

  vocabulary.forEach((entry, index) => {
    const key = normalizePinyinKey(entry.pinyin);
    const hanzi = String(entry.hanzi || "").trim();
    if (!key || !hanzi) return;

    // Gắn từ vào từng tiền tố để ứng viên xuất hiện ngay cả khi một âm ngắn
    // (ví dụ "ba") đồng thời cũng là một mục từ hoàn chỉnh trong từ điển.
    for (let length = 1; length <= key.length; length += 1) {
      addCandidate(key.slice(0, length), hanzi, 70_000 - index - (key.length - length) * 20);
    }

    const characters = Array.from(hanzi);
    if (characters.length > 1 && characters.every((character) => character === characters[0])) {
      const syllableLength = key.length / characters.length;
      if (Number.isInteger(syllableLength)) {
        const syllable = key.slice(0, syllableLength);
        if (syllable.repeat(characters.length) === key) addCandidate(syllable, characters[0], 105_000 - index);
      }
    }
  });

  return Object.fromEntries(
    Object.entries(buckets).map(([key, bucket]) => [
      key,
      [...bucket.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([word, frequency]) => ({ w: word, f: frequency })),
    ]),
  );
}

