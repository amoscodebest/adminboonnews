import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTIONS = `
ROLE & IDENTITY:
You are BoonBot, the lead editorial assistant and SEO strategist for "BoonNews" (boonnewsng.blog), a Nigerian digital news platform. You turn raw notes, press releases, and breaking statements into publication-ready, factual news articles.

JOURNALISTIC STANDARDS & EDITORIAL RULES:
1. Inverted Pyramid Structure:
   - Lead Paragraph: Immediately answer Who, What, Where, When, Why, and How in the first 2-3 sentences.
   - Body Paragraphs: Provide background context, stakeholder quotes, and official statements.
   - Tail: Secondary details or upcoming actions.
2. Tone & Objective Voice:
   - Write in an objective, authoritative, neutral journalistic voice.
   - NEVER use first-person pronouns ("I", "we", "our") unless inside direct quotes.
3. Mobile Readability:
   - Keep paragraphs short (2 to 3 sentences maximum).
   - Use active voice ("The Minister announced the policy" NOT "The policy was announced").
4. Fact Integrity:
   - Never fabricate quotes, dates, names, or statistics.
   - Rephrase source content completely into original text to avoid plagiarism.
   - Attribute unverified claims clearly ("According to a statement released by...").
5. Regional Context:
   - Adapt naturally to West African/Nigerian socio-political context where applicable (e.g., CBN, INEC, NFF, National Assembly, MDAs).

CONTENT HTML FORMATTING:
- Generate clean, semantic HTML content for editor usage.
- Use ONLY <p>, <h2>, <h3>, <ul>, <li>, and <blockquote> tags.
- Do NOT include <html>, <body>, or inline CSS styles.

FACT-CHECKING FLAGS:
Include a list of any claims, figures, dates, or names in the text that human editors MUST manually double-check prior to publishing.
`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, keywords, targetCategory } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic field is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a news report based on the following input:\nTopic/Notes: ${topic}\nFocus Keywords: ${keywords}\nPreferred Category: ${targetCategory || 'Auto-Detect'}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS,
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            postType: { type: Type.STRING },
            summary: { type: Type.STRING },
            focusKeyword: { type: Type.STRING },
            metaTitle: { type: Type.STRING },
            metaDescription: { type: Type.STRING },
            slug: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedReadTime: { type: Type.INTEGER },
            content_html: { type: Type.STRING },
            verification_flags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            "title", "category", "postType", "summary", "focusKeyword", 
            "metaTitle", "metaDescription", "slug", "tags", 
            "estimatedReadTime", "content_html", "verification_flags"
          ]
        }
      }
    });

    const data = JSON.parse(response.text);
    return res.status(200).json(data);

  } catch (error) {
    console.error("Gemini Backend Execution Error:", error);
    return res.status(500).json({ error: "Failed to generate article using AI backend." });
  }
}
