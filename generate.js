// api/generate.js
import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const { prompt, stack } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: "prompt obrigatório" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY não configurada" });
  }

  try {
    const groq = new Groq({ apiKey });

    const systemPrompt = `
Você é um gerador de código para um construtor de sites estilo Lovable.dev.
Saída SEMPRE deve ser um ÚNICO arquivo HTML COMPLETO com CSS e JS embutidos (tag <style> e <script>).

Regras:
- Não use CDN pesada.
- Não use imports externos.
- O HTML deve abrir direto no navegador e mostrar o site completo pedido.
- Textos em português.
    `.trim();

    const stackHint = stack === "react"
      ? "Use React simples via <script type='module'>, createRoot, tudo em um arquivo HTML."
      : "Use apenas HTML + CSS + JS puro, tudo em um arquivo HTML.";

    const userPrompt = `
Descrição do usuário:
${prompt}

Stack desejada:
${stackHint}
`.trim();

    const completion = await groq.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 4096
    });

    let html = completion.choices?.[0]?.message?.content || "";

    if (!html.toLowerCase().includes("<html")) {
      html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Site gerado</title></head><body>${html}</body></html>`;
    }

    res.status(200).json({ html });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro na IA: " + err.message });
  }
}
