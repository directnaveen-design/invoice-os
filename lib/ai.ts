// lib/ai.ts

export async function askAI(prompt: string): Promise<string> {
  const geminiKeys = (process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const deepseekKey = (process.env.DEEPSEEK_API_KEY || "").trim();

  // 1. Try Gemini first (all provided keys in loop)
  for (let i = 0; i < geminiKeys.length; i++) {
    const key = geminiKeys[i];
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (res.status === 429) {
        console.warn(`[Gemini] Key #${i + 1} exhausted (Rate Limit). Trying next...`);
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (e) {
      console.warn(`[Gemini] Key #${i + 1} error:`, e);
    }
  }

  // 2. Fallback to DeepSeek if Gemini fails or quota ends
  if (deepseekKey) {
    console.info("[AI Failover] Switching to DeepSeek...");
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? "";
      }
    } catch (e) {
      console.error("[DeepSeek] Call failed:", e);
    }
  }

  throw new Error("All AI models (Gemini & DeepSeek) failed or exhausted.");
}
