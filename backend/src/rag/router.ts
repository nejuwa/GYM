import type { RagRoute } from './types';

const SMALL_TALK_PATTERN =
  /^(hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you|how are you)[!.?\s]*$/i;

const DATABASE_PATTERN =
  /\b(users?|accounts?|members?|trainers?|coaches?|instructors?|memberships?|packages?|plans?|prices?|costs?|payments?|paid|receipts?|attendance|check[\s-]?ins?|visits?|sessions?|classes?|schedules?|appointments?|expenses?|revenues?|income|equipment|rooms?)\b/i;

const DOCUMENT_PATTERN =
  /\b(gymmis|software|requirements?|system|architecture|modules?|features?|roles?|permissions?|access|qr|open|opens|opening|closing|hours|address|location|directions|policy|policies|rule|rules|amenit(?:y|ies)|facility|facilities|holiday|parking|equipment|room|schedule|class|classes|yoga|weekends?|weekdays?|available|availability)\b/i;

export function classifyQuestion(question: string): RagRoute {
  const normalized = question.trim();
  if (SMALL_TALK_PATTERN.test(normalized)) return 'SMALL_TALK';

  const database = DATABASE_PATTERN.test(normalized);
  const document = DOCUMENT_PATTERN.test(normalized);

  if (database && document) return 'HYBRID';
  if (database) return 'DATABASE_ONLY';
  if (document) return 'DOCUMENT_ONLY';
  return 'OUT_OF_SCOPE';
}
