import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { answerGymQuestion, clearAnswerCache, NO_INFORMATION_ANSWER } from '../src/rag/chain';
import { chunkText } from '../src/rag/chunker';
import { clearEmbeddingCache, embedText, embedTexts } from '../src/rag/embedder';
import { rankLocalDocuments } from '../src/rag/retriever';
import { classifyQuestion } from '../src/rag/router';
import { queryGymDatabase } from '../src/rag/sqlTool';
import type { RagDependencies, RagIdentity } from '../src/rag/chain';

const manager: RagIdentity = { id: 'manager-id', role: 'MANAGER' };
const databaseFixture: RagDependencies['queryDatabase'] = async () => [
  { table: 'Package', records: [{ name: 'Annual', price: 100 }] },
];
const documentFixture: RagDependencies['retrieveDocuments'] = async () => [{
  id: 'chunk-1',
  source: 'gym_description.pdf',
  page: 3,
  content: 'The gym opens at 6:00 AM.',
  similarity: 0.9,
}];
const answerFixture: RagDependencies['generateAnswer'] = async () => 'The gym opens at 6:00 AM.';
const generalAnswerFixture: RagDependencies['generateGeneralAnswer'] =
  async () => 'Here is a helpful general answer.';

beforeEach(() => clearAnswerCache());

test('routes database, document, hybrid, small-talk, and unrelated questions', () => {
  assert.equal(classifyQuestion('How many active members are there?'), 'DATABASE_ONLY');
  assert.equal(classifyQuestion('How many users are here?'), 'DATABASE_ONLY');
  assert.equal(classifyQuestion('How many active users are there?'), 'DATABASE_ONLY');
  assert.equal(classifyQuestion('What are the opening hours?'), 'DOCUMENT_ONLY');
  assert.equal(classifyQuestion('What are the class schedules and opening hours?'), 'HYBRID');
  assert.equal(classifyQuestion('Which trainers are available on weekends?'), 'HYBRID');
  assert.equal(classifyQuestion('What is GYMMIS?'), 'DOCUMENT_ONLY');
  assert.equal(classifyQuestion('How does the GYMMIS permission system work?'), 'DOCUMENT_ONLY');
  assert.equal(classifyQuestion('Thanks!'), 'SMALL_TALK');
  assert.equal(classifyQuestion('What is the capital of France?'), 'OUT_OF_SCOPE');
});

test('answers database-only questions using database context and citations', async () => {
  const result = await answerGymQuestion('How much is the annual membership?', manager, {
    queryDatabase: databaseFixture,
    retrieveDocuments: async () => {
      assert.fail('database-only questions must not retrieve document chunks');
    },
    generateGeneralAnswer: generalAnswerFixture,
    generateAnswer: answerFixture,
  });

  assert.equal(result.route, 'DATABASE_ONLY');
  assert.equal(result.sources[0]?.type, 'database');
  assert.equal(result.sources[0]?.table, 'Package');
});

test('answers document-only questions using document context and page citations', async () => {
  const result = await answerGymQuestion('What are the opening hours?', manager, {
    queryDatabase: async () => {
      assert.fail('document-only questions must not query the database');
    },
    retrieveDocuments: documentFixture,
    generateGeneralAnswer: generalAnswerFixture,
    generateAnswer: answerFixture,
  });

  assert.equal(result.route, 'DOCUMENT_ONLY');
  assert.deepEqual(result.sources, [{
    type: 'document',
    file: 'gym_description.pdf',
    page: 3,
  }]);
});

test('combines both sources for hybrid questions', async () => {
  const result = await answerGymQuestion(
    'What are the class schedules and opening hours?',
    manager,
    {
      queryDatabase: databaseFixture,
      retrieveDocuments: documentFixture,
      generateGeneralAnswer: generalAnswerFixture,
      generateAnswer: answerFixture,
    },
  );

  assert.equal(result.route, 'HYBRID');
  assert.deepEqual(result.sources.map((source) => source.type), ['database', 'document']);
});

test('returns the exact missing-information answer when retrieval has no evidence', async () => {
  const result = await answerGymQuestion('Which equipment brands do we own?', manager, {
    queryDatabase: async () => [],
    retrieveDocuments: async () => [],
    generateGeneralAnswer: generalAnswerFixture,
    generateAnswer: async () => assert.fail('the model must not run without evidence'),
  });

  assert.equal(result.route, 'HYBRID');
  assert.equal(result.answer, NO_INFORMATION_ANSWER);
  assert.deepEqual(result.sources, []);
});

test('does not infer trainer availability or group classes from personal training records', async () => {
  assert.deepEqual(
    await queryGymDatabase('Which trainers are available on weekends?', manager),
    [],
  );
  assert.deepEqual(await queryGymDatabase('When is yoga on Saturday?', manager), []);
});

test('database user-count questions return aggregates only for management roles', async () => {
  const result = await queryGymDatabase('How many users are here?', manager);
  assert.equal(result[0]?.table, 'User');
  const counts = result[0]?.records[0];
  assert.ok(counts);
  assert.ok(Number.isInteger(counts.totalUsers));
  assert.ok(Number.isInteger(counts.activeUsers));
  assert.ok(Number(counts.activeUsers) <= Number(counts.totalUsers));

  const memberResult = await queryGymDatabase(
    'How many users are here?',
    { id: 'member-id', role: 'MEMBER' },
  );
  assert.deepEqual(memberResult, []);
});

test('small talk and general questions use the LLM without accessing gym records', async () => {
  for (const [question, expectedRoute] of [
    ['Hello!', 'SMALL_TALK'],
    ['What is the capital of France?', 'OUT_OF_SCOPE'],
  ] as const) {
    const result = await answerGymQuestion(question, manager, {
      queryDatabase: async () => assert.fail('unexpected database query'),
      retrieveDocuments: async () => assert.fail('unexpected document query'),
      generateGeneralAnswer: async (receivedQuestion) => {
        assert.equal(receivedQuestion, question);
        return 'A general knowledge answer.';
      },
      generateAnswer: async () => assert.fail('unexpected model request'),
    });
    assert.equal(result.route, expectedRoute);
    assert.equal(result.answer, 'A general knowledge answer.');
    assert.deepEqual(result.sources, []);
  }
});

test('gym-specific questions continue to use records instead of general knowledge', async () => {
  const result = await answerGymQuestion('What time does this gym open?', manager, {
    queryDatabase: async () => [],
    retrieveDocuments: async () => [],
    generateGeneralAnswer: async () => assert.fail('gym questions must not use general knowledge'),
    generateAnswer: async () => assert.fail('the model must not run without gym evidence'),
  });

  assert.equal(result.answer, NO_INFORMATION_ANSWER);
});

test('chunks long text with overlap and source page metadata', () => {
  const text = 'Strength training improves fitness. '.repeat(400);
  const chunks = chunkText(text, 'gym_description.md', 2);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.page === 2 && chunk.source === 'gym_description.md'));
  assert.ok(chunks.every((chunk) => chunk.content.length <= 2800));
  assert.notEqual(chunks[0].id, chunks[1].id);
});

test('retrieves relevant local gym-document chunks when vector storage is unavailable', () => {
  const chunks = [
    {
      id: 'overview',
      source: 'gym_description.pdf',
      page: 1,
      content: 'GYMMIS Software Requirements Specification. The system manages gym operations.',
    },
    {
      id: 'roles',
      source: 'gym_description.pdf',
      page: 4,
      content: 'GYMMIS user roles include member, trainer, manager, and owner.',
    },
    {
      id: 'payments',
      source: 'gym_description.pdf',
      page: 8,
      content: 'Payment records support receipts and payment methods.',
    },
  ];

  const results = rankLocalDocuments('What is GYMMIS?', chunks);
  assert.equal(results[0]?.id, 'overview');
  assert.equal(results[0]?.source, 'gym_description.pdf');
  assert.equal(results[0]?.page, 1);
  assert.ok(results[0].similarity >= 0.34);
});

test('uses Gemini native batch embeddings with matching query and document dimensions', async () => {
  const keys = [
    'RAG_EMBEDDING_PROVIDER',
    'RAG_EMBEDDING_BASE_URL',
    'RAG_EMBEDDING_MODEL',
    'RAG_EMBEDDING_DIMENSIONS',
    'GEMINI_API_KEY',
    'RAG_EMBEDDING_API_KEY',
    'RAG_LLM_API_KEY',
    'OPENAI_API_KEY',
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const requests: { url: string; init?: RequestInit; body: Record<string, unknown> }[] = [];

  try {
    process.env.RAG_EMBEDDING_PROVIDER = 'gemini';
    process.env.RAG_EMBEDDING_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
    process.env.RAG_EMBEDDING_MODEL = 'gemini-embedding-001';
    process.env.RAG_EMBEDDING_DIMENSIONS = '1536';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    delete process.env.RAG_EMBEDDING_API_KEY;
    delete process.env.RAG_LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;
    clearEmbeddingCache();

    globalThis.fetch = (async (input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        requests: { taskType: string; outputDimensionality: number }[];
      };
      requests.push({ url: String(input), init, body });
      return Response.json({
        embeddings: body.requests.map(() => ({ values: new Array(1536).fill(0.25) })),
      });
    }) as typeof fetch;

    const documents = await embedTexts(['gym policy', 'membership packages']);
    const query = await embedText('what are the gym rules?');

    assert.equal(documents.length, 2);
    assert.equal(documents[0].length, 1536);
    assert.equal(query.length, 1536);
    assert.equal(requests.length, 2);
    assert.match(requests[0].url, /models\/gemini-embedding-001:batchEmbedContents$/);
    assert.equal(
      (requests[0].init?.headers as Record<string, string>)['x-goog-api-key'],
      'test-gemini-key',
    );
    assert.equal(requests[0].body.requests[0].taskType, 'RETRIEVAL_DOCUMENT');
    assert.equal(requests[0].body.requests[0].outputDimensionality, 1536);
    assert.equal(requests[1].body.requests[0].taskType, 'RETRIEVAL_QUERY');
  } finally {
    globalThis.fetch = originalFetch;
    clearEmbeddingCache();
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
