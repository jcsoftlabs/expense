/**
 * Moteur NLP Local d'Analyse Sémantique (en Français)
 * Permet d'extraire des entités financières depuis une phrase en langage naturel.
 */

export interface ParsedAICommand {
  action: 'CREATE_INVOICE' | 'CREATE_INCOME' | 'CREATE_EXPENSE';
  clientName: string | null;
  projectName: string | null;
  amount: number | null;
  currency: 'USD' | 'HTG';
  isPaid: boolean;
  notes: string;
}

function cleanAndMapClientName(extractedGroup: string, originalText: string, normalizedText: string, groupIndex: number): string | null {
  const words = extractedGroup.split(/\s+/);
  const cleanWords: string[] = [];

  const IGNORED_CLIENT_WORDS = new Set([
    'aujourd\'hui', 'aujourdhui', 'hier', 'demain', 'ce', 'matin', 'soir', 'apres-midi', 'midi',
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'pour', 'client', 'compagnie', 'entreprise',
    'l\'application', 'l', 'd', 'm', 's', 't', 'j', 'qu', 'n', 'c', 'se', 'a', 'hui', 'les', 'des'
  ]);

  for (const word of words) {
    // Retirer la ponctuation de début/fin pour l'analyse, mais conserver les apostrophes internes
    let cleaned = word.replace(/^[^a-z0-9àâäéèêëîïôöûüç]+|[^a-z0-9àâäéèêëîïôöûüç]+$/gi, '').toLowerCase();
    
    // Exclure les nombres purs (qui correspondent généralement au montant) ou les devises
    const isNumberOrCurrency = /^\d+$/.test(cleaned) || ['htg', 'usd', 'gourde', 'gourdes', 'dollar', 'dollars', 'gde', 'gdes'].includes(cleaned);
    
    if (cleaned.length > 0 && !IGNORED_CLIENT_WORDS.has(cleaned) && !isNumberOrCurrency) {
      cleanWords.push(word);
    }
  }

  if (cleanWords.length === 0) return null;

  const finalNormalizedSub = cleanWords.join(' ').toLowerCase();
  
  // Rechercher l'index de cette sous-chaîne nettoyée dans la version normalisée pour la faire correspondre au texte d'origine
  const idx = normalizedText.indexOf(finalNormalizedSub, groupIndex);
  if (idx !== -1) {
    return originalText.substring(idx, idx + finalNormalizedSub.length).trim();
  }

  return cleanWords.join(' ').trim();
}

function cleanAndMapProjectName(extractedGroup: string, originalText: string, normalizedText: string, groupIndex: number): string | null {
  const clean = extractedGroup.trim();
  if (clean.length === 0) return null;

  const idx = normalizedText.indexOf(clean.toLowerCase(), groupIndex);
  if (idx !== -1) {
    return originalText.substring(idx, idx + clean.length).trim();
  }
  return clean;
}

export function parseAICommand(text: string): ParsedAICommand {
  const normalized = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Retire les accents pour simplifier les Regex

  // 1. Détection de la Devise (Currency)
  let currency: 'USD' | 'HTG' = 'USD';
  if (normalized.includes('htg') || normalized.includes('gourde') || normalized.includes('gde')) {
    currency = 'HTG';
  } else if (normalized.includes('usd') || normalized.includes('dollar') || normalized.includes('$')) {
    currency = 'USD';
  }

  // 2. Détection du Montant (Amount)
  let amount: number | null = null;
  const amountRegex = /(?:montant de|somme de|facture de|de)?\s*(\b\d+[\s\d]*[.,]?\d*\b)\s*(?:htg|usd|\$|gourdes?|dollars?|gdes?)?/gi;
  let match;
  let candidateAmounts: number[] = [];

  while ((match = amountRegex.exec(normalized)) !== null) {
    if (match[1]) {
      const cleanNumStr = match[1].replace(/\s+/g, '').replace(',', '.');
      const val = parseFloat(cleanNumStr);
      if (!isNaN(val) && val > 0) {
        candidateAmounts.push(val);
      }
    }
  }

  if (candidateAmounts.length > 0) {
    const filtered = candidateAmounts.filter(x => x !== 2026 && x !== 2025 && x !== 2024);
    amount = filtered.length > 0 ? Math.max(...filtered) : candidateAmounts[0];
  }

  // 3. Détection du statut de paiement
  let isPaid = true; // Par défaut payé
  const unpaidKeywords = [
    'pas encore paye',
    'pas paye',
    'non paye',
    'attente',
    'a recevoir',
    'pas encore payer',
    'pas payer',
    'non payer',
    'credit'
  ];

  for (const keyword of unpaidKeywords) {
    if (normalized.includes(keyword)) {
      isPaid = false;
      break;
    }
  }

  // 4. Déduction de l'Action
  let action: 'CREATE_INVOICE' | 'CREATE_INCOME' | 'CREATE_EXPENSE' = 'CREATE_INCOME';
  const expenseKeywords = ['depense', 'achete', 'achat', 'cout', 'frais', 'facture recue'];
  
  const isExpense = expenseKeywords.some(kw => normalized.includes(kw));

  if (isExpense) {
    action = 'CREATE_EXPENSE';
  } else if (!isPaid) {
    action = 'CREATE_INVOICE';
  } else {
    action = 'CREATE_INCOME';
  }

  // 5. Extraction du Client
  let clientName: string | null = null;
  
  // Liste ordonnée de regexes pour capturer le client (exécutées sur la chaîne normalisée)
  const clientRegexes = [
    /pour le client\s+([a-z0-9\s\-\'\’]+?)(?=\s+pour|\s+pour le|\s+de|\s+le|\s+je|\s+,\s*|\.|\$|\bhtg\b|\busd\b|$)/gi,
    /client\s+([a-z0-9\s\-\'\’]+?)(?=\s+pour|\s+pour le|\s+de|\s+le|\s+je|\s+,\s*|\.|\$|\bhtg\b|\busd\b|$)/gi,
    /a destination de\s+([a-z0-9\s\-\'\’]+?)(?=\s+pour|\s+de|\s+le|\s+je|\s+,\s*|\.|\$|\bhtg\b|\busd\b|$)/gi,
    /([a-z0-9\s\-\'\’]+?)\s+(?:m'a\s+paye[ersx]*|m'a\s+donne[ersx]*|m'a\s+vers[ersx]*|m'a\s+remis[ex]*|m'a\s+regl[eersx]*|m'a\s+transfer[eersx]*|m'a\s+vir[eersx]*|a\s+paye[ersx]*|a\s+donne[ersx]*|a\s+vers[ersx]*|a\s+remis[ex]*|a\s+regl[eersx]*|a\s+transfer[eersx]*|a\s+vir[eersx])/gi,
    /(?:recu\s+de|recu\s+de\s+la\s+part\s+de|paiement\s+de)\s+([a-z0-9\s\-\'\’]+?)(?=\s+pour|\s+de|\s+le|\s+la|\s+je|\s+,\s*|\.|\bhtg\b|\busd\b|$)/gi,
    /pour\s+([a-z0-9\s\-\'\’]+?)(?=\s+pour le|\s+le|\s+de|\s+la|\s+montant|\s+je|\s+,\s*|\.|\bhtg\b|\busd\b|$)/gi
  ];

  for (const regex of clientRegexes) {
    const m = regex.exec(normalized);
    if (m && m[1]) {
      const startIdx = m.index + m[0].indexOf(m[1]);
      const cleanedClient = cleanAndMapClientName(m[1], text, normalized, startIdx);
      if (cleanedClient) {
        clientName = cleanedClient;
        break;
      }
    }
  }

  // 6. Extraction du Projet
  let projectName: string | null = null;
  const projectRegexes = [
    /pour le projet\s+([a-z0-9\s\-\.\_\'\’]+?)(?=\s+pour|\s+de|\s+le|\s+je|\s+,\s*|\.|\bhtg\b|\busd\b|$)/gi,
    /projet\s+([a-z0-9\s\-\.\_\'\’]+?)(?=\s+pour|\s+de|\s+le|\s+je|\s+,\s*|\.|\bhtg\b|\busd\b|$)/gi,
    /l'application\s+([a-z0-9\s\-\.\_\'\’]+?)(?=\s+pour|\s+de|\s+le|\s+je|\s+,\s*|\.|\bhtg\b|\busd\b|$)/gi,
    /le site\s+([a-z0-9\s\-\.\_\'\’]+?)(?=\s+pour|\s+de|\s+le|\s+je|\s+,\s*|\.|\bhtg\b|\busd\b|$)/gi,
    /site web\s+([a-z0-9\s\-\.\_\'\’]+?)(?=\s+pour|\s+de|\s+le|\s+je|\s+,\s*|\.|\bhtg\b|\busd\b|$)/gi
  ];

  for (const regex of projectRegexes) {
    const m = regex.exec(normalized);
    if (m && m[1]) {
      const startIdx = m.index + m[0].indexOf(m[1]);
      const cleanedProj = cleanAndMapProjectName(m[1], text, normalized, startIdx);
      if (cleanedProj) {
        projectName = cleanedProj;
        break;
      }
    }
  }

  // 7. Reconstruction de la note / description
  let notes = text.trim();
  const cleanNotesMatch = text.match(/^([^.,:;]+)/i);
  if (cleanNotesMatch && cleanNotesMatch[1]) {
    notes = cleanNotesMatch[1].trim();
  }
  notes = notes.charAt(0).toUpperCase() + notes.slice(1);

  return {
    action,
    clientName,
    projectName,
    amount,
    currency,
    isPaid,
    notes
  };
}
