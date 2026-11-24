export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "서버에 GEMINI_API_KEY 환경변수가 설정되지 않았습니다." });
  }

  const { base64Data, mimeType } = req.body || {};
  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: "이미지 데이터가 누락되었습니다." });
  }

  try {
    // 1. 현재 계정에서 사용 가능한 최신 활성 Gemini 모델 자동 조회
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );
    let models = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-pro-latest"];

    if (listRes.ok) {
      const listData = await listRes.json();
      const valid = (listData.models || [])
        .filter(
          (m) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes("generateContent") &&
            /gemini|gemma-3/i.test(m.name) &&
            !/embedding|imagen|veo|aqa|tts|audio|robotics|computer-use|deep-research|-image|omni|exp|customtools|gemini-1\.|gemini-2\./i.test(m.name)
        )
        .map((m) => m.name.replace(/^models\//, ""));

      const score = (id) => {
        if (/flash/i.test(id) && !/preview/i.test(id)) return 1;
        if (/flash/i.test(id)) return 2;
        if (/gemma-3-27b/i.test(id)) return 3;
        if (/pro/i.test(id) && !/preview/i.test(id)) return 4;
        return 5;
      };
      valid.sort((a, b) => score(a) - score(b) || b.localeCompare(a));
      if (valid.length) models = valid.slice(0, 6);
    }

    const promptText = [
      "당신은 식물학 백과사전 전문가입니다. 첨부된 사진 속 식물을 판별하고 아래 JSON 형식으로만 응답하세요.",
      '{"name_ko":"한국어 일반 식물 이름","scientific_name":"라틴어 학명","english_name":"영어 일반명 또는 검색용 영문명","description":"잎, 꽃, 줄기/서식지, 비슷한 식물과의 구별 포인트를 백과사전식으로 알기 쉽게 정리한 한국어 설명"}'
    ].join("\n");

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: mimeType, data: base64Data } }] }]
    });

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let lastError = "현재 서버 요청이 몰려 있습니다. 잠시 후 다시 시도해 주세요.";

    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payload,
              signal: controller.signal
            }
          );
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
            return res.status(200).json({
              nameKo: (parsed.name_ko || "이름 미확인 식물").trim(),
              scientificName: (parsed.scientific_name || "Species indeterminata").trim(),
              englishName: (parsed.english_name || parsed.scientific_name || "plant").trim(),
              description: (parsed.description || "상세 특징 정보가 제공되지 않았습니다.").trim()
            });
          }

          const errText = await response.text();
          lastError = `Gemini API 오류 (${response.status} · ${model}): ${errText.slice(0, 120)}`;
          if (response.status === 503 && attempt === 1) {
            await sleep(1500);
            continue;
          }
          break;
        } catch (err) {
          clearTimeout(timeoutId);
          lastError = err.name === "AbortError" ? `응답 지연 (${model})` : err.message;
          break;
        }
      }
    }

    return res.status(503).json({ error: lastError });
  } catch (e) {
    return res.status(500).json({ error: e.message || "서버 내부 오류" });
  }
}
