const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const dataDir = path.join(__dirname, '..', 'data');
const occupations = JSON.parse(fs.readFileSync(path.join(dataDir, 'occupations.json'), 'utf-8'));
const deaths = JSON.parse(fs.readFileSync(path.join(dataDir, 'deaths.json'), 'utf-8'));
const eras = JSON.parse(fs.readFileSync(path.join(dataDir, 'eras.json'), 'utf-8'));

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateYear(era) {
  const { yearStart, yearEnd } = era;
  return Math.floor(Math.random() * (yearEnd - yearStart + 1)) + yearStart;
}

function formatYear(year) {
  if (year < 0) return `기원전 ${Math.abs(year)}년`;
  return `${year}년`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '이름을 입력해주세요.' });
  }

  const era = pickRandom(eras);
  const year = generateYear(era);
  const occupation = pickRandom(occupations);
  const death = pickRandom(deaths);
  const formattedYear = formatYear(year);

  const prompt = `당신은 전생 리더기입니다. 유머러스하고 흥미진진한 스토리텔링을 해주세요.

다음 정보를 바탕으로 "${name}"님의 전생 이야기를 재미있게 들려주세요:

- 시대: ${era.name} (${formattedYear})
- 존재/직업: ${occupation.name} (${occupation.category})
- 사망 원인: ${death.cause}

규칙:
1. 200~300자 정도의 짧고 임팩트 있는 스토리로 작성
2. "${name}"이라는 이름을 자연스럽게 녹여서 전생의 이름처럼 활용
3. 시대 배경에 맞는 디테일 추가
4. 사망 원인을 드라마틱하거나 웃기게 묘사
5. 만약 동물, 무생물, 미생물, 외계인 등 비인간 존재라면 그에 맞게 창의적으로 서술
6. 마지막에 현생과 연결되는 한 줄 코멘트 추가 (예: "그래서 당신은 지금도 물을 무서워하는 것입니다...")
7. 반말로 친근하게 작성`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 1.0,
    });

    const story = completion.choices[0].message.content;

    res.json({
      name,
      era: era.name,
      year: formattedYear,
      occupation: occupation.name,
      occupationCategory: occupation.category,
      death: death.cause,
      story,
    });
  } catch (err) {
    console.error('OpenAI API error:', err.message, err.status, err.code);
    res.status(500).json({ error: 'AI 스토리 생성 중 오류가 발생했습니다.', detail: err.message });
  }
};
