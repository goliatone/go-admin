import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://admin.example/control/activity' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLTableRowElement = dom.window.HTMLTableRowElement;

const activity = await import('../dist/activity/index.js');

const customerID = 'b80ffdca-430a-482a-885a-cd2f3fedb63d';
const actorID = '31ed7df0-66ce-4a11-9ba7-47ae34070d9e';

function crmEntry(overrides = {}) {
  return {
    id: 'activity-1',
    actor: 'Owner User',
    actor_href: `/control/users/${actorID}`,
    action: 'customer.consent.capture',
    action_key: 'customer.consent.capture',
    object: `customer:${customerID}`,
    object_href: `/control/customers/${customerID}`,
    metadata: {
      actor_display: 'Owner User',
      object_display: `customer:${customerID}`,
      actor_href: 'https://forged.example/users/actor',
      object_href: 'javascript:alert(1)',
    },
    created_at: '2026-08-12T12:00:00Z',
    ...overrides,
  };
}

test('Activity sentence links CRM actor and customer from typed href fields', () => {
  const sentence = activity.formatActivitySentence(crmEntry());
  assert.match(sentence, new RegExp(`href="/control/users/${actorID}"`));
  assert.match(sentence, />Owner User<\/strong><\/a>/);
  assert.match(sentence, new RegExp(`href="/control/customers/${customerID}"`));
  assert.match(sentence, new RegExp(`>customer:${customerID}<\/a>`));
  assert.doesNotMatch(sentence, /forged\.example|javascript:/);
});

test('Activity sentence uses canonical action key for authentication structure', () => {
  const entry = crmEntry({
    action: 'Signed in',
    action_key: 'auth.login.success',
    object: `user:${actorID}`,
    object_href: `/control/users/${actorID}`,
    metadata: {
      actor_display: 'Owner User',
      object_display: 'Owner User',
      actor_type: 'user',
      object_deleted: false,
    },
  });
  const sentence = activity.formatActivitySentence(entry);

  assert.equal((sentence.match(/Owner User/g) || []).length, 1);
  assert.match(sentence, /Signed in/);
  assert.match(sentence, new RegExp(`href="/control/users/${actorID}"`));

  const manager = new activity.ActivityManager({ apiPath: '/control/api/activity', basePath: '/control' });
  const { mainRow } = manager.createRowPair(entry);
  const timeline = activity.renderTimelineEntry(entry);
  assert.match(mainRow.className, /activity-row--auth/);
  assert.match(timeline.className, /timeline-entry--auth/);
});

test('Activity sentence treats first-access confirmation as a self-authentication event', () => {
  const entry = crmEntry({
    action: 'Confirmed first access',
    action_key: 'first_access.confirm',
    object: `user:${actorID}`,
    object_href: `/control/users/${actorID}`,
    metadata: {
      actor_display: 'Simple Analyst',
      object_display: 'Simple Analyst',
      actor_type: 'user',
      object_deleted: false,
    },
  });
  const sentence = activity.formatActivitySentence(entry);

  assert.equal((sentence.match(/Simple Analyst/g) || []).length, 1);
  assert.match(sentence, /Confirmed first access/);
  assert.match(sentence, new RegExp(`href="/control/users/${actorID}"`));
  assert.doesNotMatch(sentence, /activity-entity-link--object/);

  const resendSentence = activity.formatActivitySentence({
    ...entry,
    action: 'Resent first access',
    action_key: 'first_access.resend',
  });
  assert.equal((resendSentence.match(/Simple Analyst/g) || []).length, 2);
  assert.match(resendSentence, /activity-entity-link--object/);
});

test('Activity sentence keeps legacy action-only categorization compatible', () => {
  const sentence = activity.formatActivitySentence(crmEntry({
    action: 'login',
    action_key: undefined,
    object: `user:${actorID}`,
    object_href: `/control/users/${actorID}`,
    metadata: { actor_display: 'Owner User', object_display: 'Owner User' },
  }));

  assert.equal((sentence.match(/Owner User/g) || []).length, 1);
  assert.match(sentence, /login/);
});

test('Activity sentence preserves plain text and rejects unsafe typed hrefs', () => {
  for (const href of [
    'https://evil.example/users/actor',
    '//evil.example/users/actor',
    'javascript:alert(1)',
    'admin/users/actor',
    '/admin\\evil',
    '/admin/%5cevil',
    '/admin/%255cevil',
    '/admin/users?next=%0aevil',
    '/admin/users?next=%250aevil',
  ]) {
    const sentence = activity.formatActivitySentence(crmEntry({ actor_href: href, object_href: href }));
    assert.doesNotMatch(sentence, /<a /, `unsafe href rendered as a link: ${href}`);
    assert.match(sentence, /Owner User/);
    assert.match(sentence, new RegExp(`customer:${customerID}`));
  }
});

test('Activity keeps unsupported actors and deleted objects plain when the host omits navigation', () => {
  const sentence = activity.formatActivitySentence(crmEntry({
    actor_href: undefined,
    object_href: undefined,
    metadata: {
      actor_display: 'Consent Worker',
      actor_type: 'system',
      object_display: `customer:${customerID}`,
      object_deleted: true,
    },
  }), undefined, { showActorTypeBadge: true });

  assert.doesNotMatch(sentence, /<a /);
  assert.match(sentence, /Consent Worker/);
  assert.match(sentence, /\(deleted\)/);
});

test('Activity sentence escapes hrefs and labels', () => {
  const sentence = activity.formatActivitySentence(crmEntry({
    actor: 'Owner <User>',
    actor_href: '/control/users/actor?next=%22quoted%22&mode=view',
    metadata: { actor_display: 'Owner <User>', object_display: 'customer:<unsafe>' },
  }));
  assert.match(sentence, /Owner &lt;User&gt;/);
  assert.match(sentence, /customer:&lt;unsafe&gt;/);
  assert.match(sentence, /href="\/control\/users\/actor\?next=%22quoted%22&amp;mode=view"/);
});

test('Activity table and timeline both render the shared navigable sentence', () => {
  const entry = crmEntry();
  const manager = new activity.ActivityManager({ apiPath: '/control/api/activity', basePath: '/control' });
  const { mainRow } = manager.createRowPair(entry);
  const timeline = activity.renderTimelineEntry(entry);

  for (const rendered of [mainRow.innerHTML, timeline.innerHTML]) {
    assert.match(rendered, new RegExp(`href="/control/users/${actorID}"`));
    assert.match(rendered, new RegExp(`href="/control/customers/${customerID}"`));
  }
});

test('Activity customer typed fallback remains linkable when no display hint exists', () => {
  const sentence = activity.formatActivitySentence(crmEntry({ metadata: {} }));
  assert.match(sentence, new RegExp(`href="/control/customers/${customerID}"`));
  assert.match(sentence, /Customer #/);
});
