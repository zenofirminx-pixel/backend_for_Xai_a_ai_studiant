import { SYSTEM_PROMPT } from "./prompt.js";

export function buildPrompt(schoolData) {
  const context = schoolData
    ? JSON.stringify(schoolData, null, 2).slice(0, 4000)
    : "Aucune donnée école disponible.";

  return `
${SYSTEM_PROMPT}

------------------------
DONNÉES ÉCOLE (CONTEXT)
------------------------
${context}

------------------------
INSTRUCTION
------------------------
Utilise les données de l'école pour répondre précisément aux questions de l'élève.
Si une information est absente, dis-le clairement.
`;
}