import { RepositoryMemoryItem, DeveloperFeedbackRecord } from '../src/types';

interface RepositoryMemoryStore {
  items: RepositoryMemoryItem[];
  feedback: DeveloperFeedbackRecord[];
}

const memoryStore: RepositoryMemoryStore = {
  items: [
    {
      id: 'mem-1',
      type: 'KNOWN_FALSE_POSITIVE',
      pattern: 'legacy/payment_mock.py',
      file_pattern: 'tests/**/mock_*.py',
      reason: 'Test-only mock files intentionally contain simulated payloads. Shielded from release-risk.',
      created_by: 'lead-architect',
      created_at: '2026-09-01T10:00:00Z',
    },
    {
      id: 'mem-2',
      type: 'CONVENTION',
      pattern: 'Strict Parameterized SQL',
      file_pattern: 'services/**/*.py',
      reason: 'All database queries must use cursor.execute(query, tuple) placeholders. String formatting strictly rejected.',
      created_by: 'security-team',
      created_at: '2026-08-15T09:30:00Z',
    },
    {
      id: 'mem-3',
      type: 'IGNORED_FILE',
      pattern: 'dist/**',
      reason: 'Compiled client bundles generated during build pipeline.',
      created_by: 'devops',
      created_at: '2026-07-20T14:00:00Z',
    },
  ],
  feedback: [
    {
      id: 'fb-1',
      finding_id: 'find-d1-01',
      finding_title: 'SQL Injection via unparameterized f-string query',
      file: 'services/payment.py',
      status: 'USEFUL',
      notes: 'Caught direct user string concatenation before merging to staging.',
      created_at: '2026-09-24T02:18:00Z',
    },
    {
      id: 'fb-2',
      finding_id: 'find-d1-fp-01',
      finding_title: 'Raw SQL string detected in test suite mock execution',
      file: 'tests/test_payment_mock.py',
      status: 'FALSE_POSITIVE',
      notes: 'Correctly shielded by the Contextual AI Shield.',
      created_at: '2026-09-24T02:19:00Z',
    },
  ],
};

export function getRepositoryMemory(): RepositoryMemoryItem[] {
  return memoryStore.items;
}

export function addRepositoryMemoryItem(item: Omit<RepositoryMemoryItem, 'id' | 'created_at'>): RepositoryMemoryItem {
  const newItem: RepositoryMemoryItem = {
    ...item,
    id: `mem-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  memoryStore.items.push(newItem);
  return newItem;
}

export function deleteRepositoryMemoryItem(id: string): boolean {
  const initialLen = memoryStore.items.length;
  memoryStore.items = memoryStore.items.filter((i) => i.id !== id);
  return memoryStore.items.length < initialLen;
}

export function getDeveloperFeedback(): DeveloperFeedbackRecord[] {
  return memoryStore.feedback;
}

export function recordDeveloperFeedback(
  findingId: string,
  findingTitle: string,
  file: string,
  status: DeveloperFeedbackRecord['status'],
  notes?: string
): DeveloperFeedbackRecord {
  const record: DeveloperFeedbackRecord = {
    id: `fb-${Date.now()}`,
    finding_id: findingId,
    finding_title: findingTitle,
    file,
    status,
    notes,
    created_at: new Date().toISOString(),
  };
  memoryStore.feedback.unshift(record);
  return record;
}
