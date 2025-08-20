/**
 * Greek Name Normalization and Matching Utilities
 * 
 * Implements Greek-specific text processing for name matching:
 * - Normalize Greek accents/diacritics
 * - Casefold and remove punctuation
 * - Token-based comparison with Jaro-Winkler + trigram bonus
 * - Initials alignment (e.g., "MARIA K PAPADOPOULOU" vs "MARIA PAPADOPOULOU")
 */

/**
 * Greek character mappings for accent/diacritic normalization
 */
const GREEK_NORMALIZATION_MAP: Record<string, string> = {
  // Alpha variations
  'ά': 'α', 'ὰ': 'α', 'ἀ': 'α', 'ἁ': 'α', 'ἄ': 'α', 'ἅ': 'α', 'ἂ': 'α', 'ἃ': 'α',
  'ᾶ': 'α', 'ᾱ': 'α', 'ᾰ': 'α', 'ᾷ': 'α', 'ᾴ': 'α', 'ᾳ': 'α', 'ᾲ': 'α',
  'Ά': 'Α', 'Ὰ': 'Α', 'Ἀ': 'Α', 'Ἁ': 'Α', 'Ἄ': 'Α', 'Ἅ': 'Α', 'Ἂ': 'Α', 'Ἃ': 'Α',
  
  // Epsilon variations
  'έ': 'ε', 'ὲ': 'ε', 'ἐ': 'ε', 'ἑ': 'ε', 'ἔ': 'ε', 'ἕ': 'ε', 'ἒ': 'ε', 'ἓ': 'ε',
  'Έ': 'Ε', 'Ὲ': 'Ε', 'Ἐ': 'Ε', 'Ἑ': 'Ε', 'Ἔ': 'Ε', 'Ἕ': 'Ε', 'Ἒ': 'Ε', 'Ἓ': 'Ε',
  
  // Eta variations
  'ή': 'η', 'ὴ': 'η', 'ἠ': 'η', 'ἡ': 'η', 'ἤ': 'η', 'ἥ': 'η', 'ἢ': 'η', 'ἣ': 'η',
  'ῆ': 'η', 'ῃ': 'η', 'ῄ': 'η', 'ῂ': 'η', 'ῇ': 'η',
  'Ή': 'Η', 'Ὴ': 'Η', 'Ἠ': 'Η', 'Ἡ': 'Η', 'Ἤ': 'Η', 'Ἥ': 'Η', 'Ἢ': 'Η', 'Ἣ': 'Η',
  
  // Iota variations
  'ί': 'ι', 'ὶ': 'ι', 'ἰ': 'ι', 'ἱ': 'ι', 'ἴ': 'ι', 'ἵ': 'ι', 'ἲ': 'ι', 'ἳ': 'ι',
  'ῖ': 'ι', 'ῑ': 'ι', 'ῐ': 'ι', 'ΐ': 'ι', 'ῒ': 'ι', 'ῗ': 'ι',
  'Ί': 'Ι', 'Ὶ': 'Ι', 'Ἰ': 'Ι', 'Ἱ': 'Ι', 'Ἴ': 'Ι', 'Ἵ': 'Ι', 'Ἲ': 'Ι', 'Ἳ': 'Ι',
  
  // Omicron variations
  'ό': 'ο', 'ὸ': 'ο', 'ὀ': 'ο', 'ὁ': 'ο', 'ὄ': 'ο', 'ὅ': 'ο', 'ὂ': 'ο', 'ὃ': 'ο',
  'Ό': 'Ο', 'Ὸ': 'Ο', 'Ὀ': 'Ο', 'Ὁ': 'Ο', 'Ὄ': 'Ο', 'Ὅ': 'Ο', 'Ὂ': 'Ο', 'Ὃ': 'Ο',
  
  // Upsilon variations
  'ύ': 'υ', 'ὺ': 'υ', 'ὐ': 'υ', 'ὑ': 'υ', 'ὔ': 'υ', 'ὕ': 'υ', 'ὒ': 'υ', 'ὓ': 'υ',
  'ῦ': 'υ', 'ῡ': 'υ', 'ῠ': 'υ', 'ΰ': 'υ', 'ῢ': 'υ', 'ῧ': 'υ',
  'Ύ': 'Υ', 'Ὺ': 'Υ', 'Ὑ': 'Υ', 'Ὕ': 'Υ', 'Ὓ': 'Υ', 'Ὗ': 'Υ',
  
  // Omega variations
  'ώ': 'ω', 'ὼ': 'ω', 'ὠ': 'ω', 'ὡ': 'ω', 'ὤ': 'ω', 'ὥ': 'ω', 'ὢ': 'ω', 'ὣ': 'ω',
  'ῶ': 'ω', 'ῳ': 'ω', 'ῴ': 'ω', 'ῲ': 'ω', 'ῷ': 'ω',
  'Ώ': 'Ω', 'Ὼ': 'Ω', 'Ὠ': 'Ω', 'Ὡ': 'Ω', 'Ὤ': 'Ω', 'Ὥ': 'Ω', 'Ὢ': 'Ω', 'Ὣ': 'Ω'
};

/**
 * Common Greek transliterations (Latin <-> Greek)
 */
const GREEK_TRANSLITERATION_MAP: Record<string, string[]> = {
  'α': ['a', 'α'], 'β': ['b', 'v', 'β'], 'γ': ['g', 'y', 'γ'], 'δ': ['d', 'δ'],
  'ε': ['e', 'ε'], 'ζ': ['z', 'ζ'], 'η': ['i', 'e', 'η'], 'θ': ['th', 'θ'],
  'ι': ['i', 'ι'], 'κ': ['k', 'c', 'κ'], 'λ': ['l', 'λ'], 'μ': ['m', 'μ'],
  'ν': ['n', 'ν'], 'ξ': ['x', 'ks', 'ξ'], 'ο': ['o', 'ο'], 'π': ['p', 'π'],
  'ρ': ['r', 'ρ'], 'σ': ['s', 'σ'], 'ς': ['s', 'ς'], 'τ': ['t', 'τ'],
  'υ': ['y', 'u', 'i', 'υ'], 'φ': ['f', 'ph', 'φ'], 'χ': ['ch', 'x', 'χ'],
  'ψ': ['ps', 'ψ'], 'ω': ['o', 'w', 'ω']
};

export interface NameMatchResult {
  score: number;
  isAcceptable: boolean;
  reason: string;
  matchedTokens: string[];
  unmatchedTokens: string[];
  jaroWinklerScore: number;
  trigramScore: number;
  initialsMatch: boolean;
  edgeCaseDetected?: 'double_surname' | 'patronymic' | 'maiden_name' | 'transliteration';
}

/**
 * Normalize Greek text for comparison
 * - Remove accents/diacritics
 * - Casefold
 * - Remove punctuation
 */
export function normalizeGreekText(text: string): string {
  if (!text) return '';
  
  let normalized = text.toLowerCase();
  
  // Apply Greek character normalization
  for (const [accented, plain] of Object.entries(GREEK_NORMALIZATION_MAP)) {
    normalized = normalized.replace(new RegExp(accented, 'g'), plain);
  }
  
  // Remove punctuation and extra spaces
  normalized = normalized
    .replace(/[^\w\sα-ωΑ-Ω]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

/**
 * Calculate Jaro-Winkler similarity score
 */
function calculateJaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    
    while (!s2Matches[k]) k++;
    
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Calculate common prefix for Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Calculate trigram similarity score
 */
function calculateTrigramScore(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  
  const getTrigrams = (str: string): Set<string> => {
    const trigrams = new Set<string>();
    const padded = `  ${str}  `;
    
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }
    
    return trigrams;
  };
  
  const trigrams1 = getTrigrams(s1);
  const trigrams2 = getTrigrams(s2);
  
  const trigrams1Array = Array.from(trigrams1);
  const trigrams2Array = Array.from(trigrams2);
  
  const intersection = trigrams1Array.filter(x => trigrams2.has(x));
  const union = Array.from(new Set([...trigrams1Array, ...trigrams2Array]));
  
  return union.length === 0 ? 0 : intersection.length / union.length;
}

/**
 * Extract initials from name
 */
function extractInitials(name: string): string {
  return normalizeGreekText(name)
    .split(/\s+/)
    .map(part => part.charAt(0))
    .join('');
}

/**
 * Check if two sets of initials match
 */
function checkInitialsAlignment(name1: string, name2: string): boolean {
  const initials1 = extractInitials(name1);
  const initials2 = extractInitials(name2);
  
  // Direct match
  if (initials1 === initials2) return true;
  
  // Check if one is a subset of the other (e.g., "MK" vs "MKP")
  if (initials1.length !== initials2.length) {
    const shorter = initials1.length < initials2.length ? initials1 : initials2;
    const longer = initials1.length < initials2.length ? initials2 : initials1;
    
    return longer.startsWith(shorter);
  }
  
  return false;
}

/**
 * Detect edge cases in name matching
 */
function detectEdgeCase(name1: string, name2: string): string | undefined {
  const tokens1 = normalizeGreekText(name1).split(/\s+/);
  const tokens2 = normalizeGreekText(name2).split(/\s+/);
  
  // Double surname detection (3+ parts with similar core)
  if (tokens1.length >= 3 || tokens2.length >= 3) {
    return 'double_surname';
  }
  
  // Patronymic patterns (ending in -ou, -aki, -opoulos, etc.)
  const patronymicSuffixes = ['ου', 'άκης', 'όπουλος', 'άκος', 'έας'];
  const hasPatronymic = [...tokens1, ...tokens2].some(token => 
    patronymicSuffixes.some(suffix => token.endsWith(suffix))
  );
  
  if (hasPatronymic) {
    return 'patronymic';
  }
  
  // Transliteration detection (mixed scripts)
  const hasGreek = /[α-ωΑ-Ω]/.test(name1 + name2);
  const hasLatin = /[a-zA-Z]/.test(name1 + name2);
  
  if (hasGreek && hasLatin) {
    return 'transliteration';
  }
  
  return undefined;
}

/**
 * Enhanced Greek name matching with Jaro-Winkler + trigram bonus
 * Threshold default ≥ 0.80, accepts if all given/last tokens match
 * or initials alignment
 */
export function matchGreekNames(
  employeeName: string,
  accountHolderName: string,
  threshold: number = 0.80
): NameMatchResult {
  
  if (!employeeName || !accountHolderName) {
    return {
      score: 0,
      isAcceptable: false,
      reason: 'Missing name data',
      matchedTokens: [],
      unmatchedTokens: [],
      jaroWinklerScore: 0,
      trigramScore: 0,
      initialsMatch: false
    };
  }
  
  // Normalize both names
  const normEmp = normalizeGreekText(employeeName);
  const normAcc = normalizeGreekText(accountHolderName);
  
  // Exact match after normalization
  if (normEmp === normAcc) {
    return {
      score: 1.0,
      isAcceptable: true,
      reason: 'Exact match after normalization',
      matchedTokens: [normEmp],
      unmatchedTokens: [],
      jaroWinklerScore: 1.0,
      trigramScore: 1.0,
      initialsMatch: true
    };
  }
  
  // Calculate component scores
  const jaroWinklerScore = calculateJaroWinkler(normEmp, normAcc);
  const trigramScore = calculateTrigramScore(normEmp, normAcc);
  
  // Token-based analysis
  const empTokens = normEmp.split(/\s+/).filter(t => t.length > 0);
  const accTokens = normAcc.split(/\s+/).filter(t => t.length > 0);
  
  const matchedTokens: string[] = [];
  const unmatchedTokens: string[] = [];
  
  // Check token matches
  for (const empToken of empTokens) {
    const matchFound = accTokens.some(accToken => {
      const tokenSimilarity = calculateJaroWinkler(empToken, accToken);
      return tokenSimilarity >= threshold;
    });
    
    if (matchFound) {
      matchedTokens.push(empToken);
    } else {
      unmatchedTokens.push(empToken);
    }
  }
  
  // Check initials alignment
  const initialsMatch = checkInitialsAlignment(employeeName, accountHolderName);
  
  // Detect edge cases
  const edgeCase = detectEdgeCase(employeeName, accountHolderName);
  
  // Combined score with Jaro-Winkler base + trigram bonus
  const combinedScore = jaroWinklerScore * 0.7 + trigramScore * 0.3;
  
  // Decision logic
  let isAcceptable = false;
  let reason = '';
  
  // Accept if all given/last tokens match with similarity ≥ threshold
  const allTokensMatch = unmatchedTokens.length === 0 && matchedTokens.length > 0;
  
  // Accept if initials alignment (e.g., "MARIA K PAPADOPOULOU" vs "MARIA PAPADOPOULOU")
  const initialsAcceptable = initialsMatch && matchedTokens.length >= 1;
  
  if (combinedScore >= threshold) {
    isAcceptable = true;
    reason = `High similarity score (${(combinedScore * 100).toFixed(1)}%)`;
  } else if (allTokensMatch) {
    isAcceptable = true;
    reason = 'All name tokens match above threshold';
  } else if (initialsAcceptable) {
    isAcceptable = true;
    reason = 'Initials alignment with partial name match';
  } else if (edgeCase && combinedScore >= 0.65) {
    isAcceptable = false; // Allow override
    reason = `Potential ${edgeCase} case - similarity ${(combinedScore * 100).toFixed(1)}%`;
  } else {
    isAcceptable = false;
    reason = `Low similarity score (${(combinedScore * 100).toFixed(1)}%) - below threshold ${(threshold * 100)}%`;
  }
  
  return {
    score: combinedScore,
    isAcceptable,
    reason,
    matchedTokens,
    unmatchedTokens,
    jaroWinklerScore,
    trigramScore,
    initialsMatch,
    edgeCaseDetected: edgeCase as any
  };
}

/**
 * Quick name similarity check (for performance)
 */
export function quickNameSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeGreekText(name1);
  const norm2 = normalizeGreekText(name2);
  
  if (norm1 === norm2) return 1.0;
  
  // Use trigram for quick similarity
  return calculateTrigramScore(norm1, norm2);
}