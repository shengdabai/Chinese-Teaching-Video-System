// Render the real modules without a browser or access to real localStorage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function element() {
  const children = new Map();
  return {
    innerHTML: '', textContent: '', value: '', listeners: {},
    addEventListener(name, handler) { this.listeners[name] = handler; },
    querySelector(selector) {
      if (!children.has(selector)) children.set(selector, element());
      return children.get(selector);
    },
    querySelectorAll() { return []; }
  };
}

function consoleApp(rawState = null) {
  const mounts = new Map();
  const context = vm.createContext({
    localStorage: { getItem() { return rawState; }, setItem() {} },
    document: { querySelectorAll() { return []; }, getElementById(id) {
      if (!mounts.has(id)) mounts.set(id, element());
      return mounts.get(id);
    } },
    FormData: class { get() { return ''; } },
    navigator: {}, alert() {}, confirm() { return false; }
  });
  context.window = context;
  for (const file of fs.readdirSync(path.join(root, 'console/components'))) {
    vm.runInContext(fs.readFileSync(path.join(root, 'console/components', file), 'utf8'), context);
  }
  vm.runInContext(fs.readFileSync(path.join(root, 'console/app.js'), 'utf8'), context);
  return { context, mounts };
}

const payload = '\"><img src=x onerror=alert(1)></textarea><script>alert(1)</script>&\'';
const escaped = '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;&lt;/textarea&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;&#39;';
const fixture = {
  project_id: 'safe_demo', topic_cn: payload, topic_en: payload,
  template_type: payload, target_audience: payload, series_tag: payload,
  character_block: payload, total_duration_target: payload,
  shots: [{ shot_number: payload, shot_name: payload, duration_seconds: 2,
    generation_platform: payload, camera: payload, character_action: payload,
    environment: payload, voiceover_text_en: payload, voiceover_text_cn: payload }],
  seo: { title: payload, description: payload, tags: [payload] },
  edit_manifest: { note: payload }, checklist: [{ label: payload, done: false }],
  publishCalendar: [{ date: payload, status: payload }],
  assetLibrary: [{ name: payload, category: payload, present: true }]
};

test('restored projects are validated before commands and HTML are rendered', () => {
  const raw = JSON.stringify({ currentProjectId: 'unsafe', projects: {
    safe_demo: fixture,
    unsafe: { project_id: 'demo; touch marker', shots: [] },
    broken: { project_id: 'broken', checklist: [null] },
    mismatch: { project_id: 'different', shots: [] }
  } });
  const { context, mounts } = consoleApp(raw);
  assert.deepEqual(Object.keys(context.AppState.projects), ['safe_demo']);
  assert.equal(context.AppState.currentProjectId, '');
  context.ConsoleApp.setCurrentProject('safe_demo');
  assert.ok(!mounts.get('view-auto-editor').innerHTML.includes('touch marker'));
  assert.ok(!mounts.get('view-topic-intake').innerHTML.includes('<img src=x'));
});

test('invalid saved state cannot prevent console startup', () => {
  for (const raw of ['null', '[]', '{}', '{bad', '{"projects":null}',
    '{"projects":[]}', '{"projects":{"constructor":{"project_id":"constructor"}}}']) {
    const { context } = consoleApp(raw);
    assert.deepEqual(Object.keys(context.AppState.projects), []);
    assert.equal(context.AppState.currentProjectId, '');
  }
  const { context } = consoleApp(JSON.stringify({
    currentProjectId: 'safe_demo', projects: { safe_demo: { project_id: 'safe_demo' } }
  }));
  assert.equal(context.AppState.currentProjectId, 'safe_demo');
  assert.equal(context.AppState.projects.safe_demo.shots.length, 0);
});

test('malformed nested imports are rejected before changing state', () => {
  const { context } = consoleApp();
  context.ConsoleApp.upsertProject({ project_id: 'safe_demo' });
  for (const patch of [{ seo: 'invalid' }, { seo: [] }, { timeline: [null] },
    { timeline: {} }, { checklist: [null] }, { publishCalendar: [false] },
    { assetLibrary: ['invalid'] }]) {
    assert.throws(() => context.ConsoleApp.importManifestObject({ project_id: 'safe_demo', ...patch }));
    assert.equal(context.AppState.projects.safe_demo.edit_manifest, null);
    assert.equal(context.AppState.currentProjectId, 'safe_demo');
  }
});

test('manifest import displays retained duration instead of end timestamp', () => {
  const { context } = consoleApp();
  context.ConsoleApp.importManifestObject({ project_id: 'safe_demo', timeline: [
    { type: 'shot', start_trim: 3, end_trim: 5 },
    { type: 'shot', start_trim: 1, duration: 4 }
  ] });
  assert.equal(context.AppState.projects.safe_demo.shots[0].duration_seconds, 2);
  assert.equal(context.AppState.projects.safe_demo.shots[1].duration_seconds, 4);
});

for (const name of ['topic-intake', 'script-engine', 'prompt-builder', 'clip-inbox', 'auto-editor', 'publish-dashboard']) {
  test(`${name}: imported text stays text in HTML, attributes and textareas`, () => {
    const { context, mounts } = consoleApp();
    context.ConsoleApp.upsertProject(JSON.parse(JSON.stringify(fixture)));
    const html = mounts.get(`view-${name}`).innerHTML;
    assert.ok(html.includes(escaped), 'text must be escaped exactly once');
    assert.ok(!html.includes('<img src=x'), 'injected element');
    assert.ok(!html.includes('<script>alert(1)'), 'injected script');
    assert.ok(!html.includes(payload), 'raw imported text reached an HTML sink');
  });
}

test('project IDs cannot become shell syntax or object prototype keys', () => {
  const { context } = consoleApp();
  for (const project_id of ['__proto__', 'constructor', '../escape', 'demo; touch marker', '$(touch marker)']) {
    assert.throws(() => context.ConsoleApp.importScriptObject({ project_id }), /project_id/);
    assert.throws(() => context.ConsoleApp.importManifestObject({ project_id }), /project_id/);
  }
  assert.equal(Object.keys(context.AppState.projects).length, 0);
});

test('malformed import does not replace the existing project', () => {
  const { context } = consoleApp();
  context.ConsoleApp.upsertProject({ project_id: 'safe_demo', shots: [] });
  for (const data of [null, [], { project_id: 'safe_demo', shots: [null] },
    { project_id: 'safe_demo', seo: { tags: 'invalid' } }]) {
    assert.throws(() => context.ConsoleApp.importScriptObject(data));
  }
  assert.equal(context.AppState.currentProjectId, 'safe_demo');
  assert.equal(context.AppState.projects.safe_demo.shots.length, 0);
});

for (const [module, selector, importer, filename] of [
  ['script-engine', '#script-json-import', 'importScriptObject', 'script.json'],
  ['auto-editor', '#manifest-import', 'importManifestObject', 'edit_manifest.json']
]) {
  test(`${module}: import alert reports the actual failure and clears the file input`, async () => {
    const { context, mounts } = consoleApp();
    context.ConsoleApp.upsertProject({ project_id: 'safe_demo', shots: [] });
    const input = mounts.get(`view-${module}`).querySelector(selector);
    const alerts = [];
    context.alert = (message) => alerts.push(message);
    for (const text of [JSON.stringify({ project_id: '../escape' }), '[]', '{bad json']) {
      let reason;
      try {
        context.ConsoleApp[importer](JSON.parse(text));
        assert.fail('fixture must be rejected');
      } catch (error) {
        reason = error.message;
      }
      input.files = [{ async text() { return text; } }];
      input.value = filename;
      await input.listeners.change();
      assert.equal(alerts.at(-1), `导入 ${filename} 失败：${reason}`);
      assert.equal(input.value, '');
      assert.equal(context.AppState.currentProjectId, 'safe_demo');
      assert.deepEqual(Object.keys(context.AppState.projects), ['safe_demo']);
    }
  });
}
