(function () {
  const STORAGE_KEY = "ctvs_console_state_v1";
  const statusOrder = ["Pending", "Keyframe Done", "Video Generated", "Normalized", "Ready"];
  const defaultChecklist = [
    "项目文件齐全",
    "所有 TODO 已补完",
    "字幕已检查",
    "音频混音已确认",
    "视频时长 <= 60 秒",
    "分辨率 1080x1920",
    "SEO 内容已填写",
    "AI 内容标注已准备"
  ];

  const demoScript = {
    project_id: "20260418_thank_you",
    topic_cn: "谢谢",
    topic_en: "Thank You",
    template_type: "A_55s",
    target_audience: "beginner",
    style: "cute",
    series_tag: "DailyMandarin",
    total_duration_target: 55,
    shots: [
      { shot_number: 1, shot_name: "Hook", duration_seconds: 4, voiceover_text_en: "The most useful Chinese word is not always ni hao.", voiceover_text_cn: "", character_action: "surprised expression", environment: "neutral background", camera: "medium shot, front, static", generation_platform: "pixverse", reusable_asset: null, status: "Pending" },
      { shot_number: 2, shot_name: "Vocab Display", duration_seconds: 6, voiceover_text_en: "Today we learn xie xie.", voiceover_text_cn: "谢谢", character_action: "pointing at chalkboard", environment: "classroom", camera: "medium shot, front, static", generation_platform: "pixverse", reusable_asset: null, status: "Pending" },
      { shot_number: 3, shot_name: "Pronunciation", duration_seconds: 10, voiceover_text_en: "Listen carefully. Xie xie.", voiceover_text_cn: "谢谢", character_action: "talking gesture", environment: "classroom", camera: "close-up, front, slow push", generation_platform: "pixverse", reusable_asset: null, status: "Pending" },
      { shot_number: 4, shot_name: "Scene 1", duration_seconds: 10, voiceover_text_en: "When someone helps you, say xie xie.", voiceover_text_cn: "", character_action: "dialogue scene", environment: "coffee shop", camera: "medium shot, slight angle", generation_platform: "pixverse", reusable_asset: null, status: "Pending" },
      { shot_number: 5, shot_name: "Scene 2", duration_seconds: 10, voiceover_text_en: "In a restaurant, you can also say xie xie.", voiceover_text_cn: "", character_action: "dialogue scene", environment: "restaurant", camera: "medium shot, front", generation_platform: "jimeng", reusable_asset: null, status: "Pending" },
      { shot_number: 6, shot_name: "Quiz", duration_seconds: 8, voiceover_text_en: "How would you respond?", voiceover_text_cn: "", character_action: "thinking pose", environment: "neutral background", camera: "medium shot, front, static", generation_platform: "pixverse", reusable_asset: null, status: "Pending" },
      { shot_number: 7, shot_name: "CTA", duration_seconds: 7, voiceover_text_en: "Follow for daily Chinese lessons.", voiceover_text_cn: "", character_action: "waving goodbye", environment: "brand background", camera: "medium shot, front, static", generation_platform: "reusable", reusable_asset: "waving_cta_001.mp4", status: "Pending" }
    ],
    seo: {
      title: "How to Say Thank You in Chinese 🇨🇳 谢谢 | Learn Mandarin",
      description: "Learn how to say 谢谢 in Chinese with one easy lesson and two real-life scenes.",
      tags: ["learn chinese thank you", "how to say thank you in chinese", "xiexie"]
    },
    character_block: "A round-faced cartoon panda character with large round eyes, black eye patches, a small round nose, and a gentle smile. Wearing a red traditional Chinese vest with golden buttons and a yellow scarf.",
    checklist: defaultChecklist.map((label) => ({ label, done: false })),
    publishCalendar: [
      { date: "2026-04-19", status: "planned" },
      { date: "2026-04-21", status: "planned" }
    ],
    assetLibrary: [
      { name: "waving_cta_001.mp4", category: "waving", present: true },
      { name: "pointing_board_001.mp4", category: "pointing", present: false },
      { name: "classroom_pan_001.mp4", category: "classroom", present: false }
    ]
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { currentProjectId: "", projects: {} };
      }
      const stored = JSON.parse(raw);
      if (!stored || typeof stored !== "object" || Array.isArray(stored)
          || !stored.projects || typeof stored.projects !== "object" || Array.isArray(stored.projects)) {
        throw new Error("Invalid saved state.");
      }
      const projects = {};
      for (const [id, project] of Object.entries(stored.projects)) {
        try {
          validateProjectId(id);
          if (project?.project_id !== id) throw new Error("Project ID mismatch.");
          projects[id] = ensureProjectShape(project);
        } catch (error) {
          // Keep valid projects available without overwriting the saved data.
        }
      }
      const currentProjectId = typeof stored.currentProjectId === "string"
        && Object.hasOwn(projects, stored.currentProjectId) ? stored.currentProjectId : "";
      return { currentProjectId, projects };
    } catch (error) {
      return { currentProjectId: "", projects: {} };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.AppState));
    updateProjectBadge();
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function validateProjectId(value) {
    if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value)
        || ["constructor", "prototype", "__proto__"].includes(value)) {
      throw new Error("Invalid project_id: use letters, digits, underscores or hyphens.");
    }
    return value;
  }

  function validateImport(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Import must be a JSON object.");
    }
    for (const field of ["shots", "timeline", "checklist", "publishCalendar", "assetLibrary"]) {
      if (value[field] !== undefined && (!Array.isArray(value[field])
          || value[field].some((item) => !item || typeof item !== "object" || Array.isArray(item)))) {
        throw new Error(`${field} must contain objects.`);
      }
    }
    if (value.seo != null && (typeof value.seo !== "object" || Array.isArray(value.seo))) {
      throw new Error("seo must be an object.");
    }
    if (value.seo?.tags !== undefined && !Array.isArray(value.seo.tags)) {
      throw new Error("seo.tags must be an array.");
    }
  }

  function generateProjectId(topicEn) {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const slug = slugify(topicEn) || "new_topic";
    return `${y}${m}${d}_${slug}`;
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      window.alert("已复制到剪贴板");
    } catch (error) {
      window.alert("复制失败，请手动复制。");
    }
  }

  function getCurrentProject() {
    const { currentProjectId, projects } = window.AppState;
    return currentProjectId ? projects[currentProjectId] || null : null;
  }

  function setCurrentProject(projectId) {
    if (!projectId || !window.AppState.projects[projectId]) {
      return;
    }
    window.AppState.currentProjectId = projectId;
    saveState();
    renderAll();
  }

  function ensureProjectShape(project) {
    validateImport(project);
    validateProjectId(project.project_id);
    const safeProject = { ...project };
    safeProject.shots = Array.isArray(safeProject.shots) ? safeProject.shots : [];
    safeProject.seo = safeProject.seo || { title: "", description: "", tags: [] };
    safeProject.character_block = safeProject.character_block || "";
    safeProject.edit_manifest = safeProject.edit_manifest || null;
    safeProject.checklist = Array.isArray(safeProject.checklist) && safeProject.checklist.length
      ? safeProject.checklist
      : defaultChecklist.map((label) => ({ label, done: false }));
    safeProject.publishCalendar = Array.isArray(safeProject.publishCalendar) ? safeProject.publishCalendar : [];
    safeProject.assetLibrary = Array.isArray(safeProject.assetLibrary) ? safeProject.assetLibrary : [];
    safeProject.shots = safeProject.shots.map((shot, index) => ({
      status: "Pending",
      shot_number: index + 1,
      shot_name: `Shot ${index + 1}`,
      duration_seconds: 5,
      voiceover_text_en: "",
      voiceover_text_cn: "",
      character_action: "",
      environment: "",
      camera: "",
      generation_platform: "pixverse",
      reusable_asset: null,
      ...shot
    }));
    return safeProject;
  }

  function upsertProject(project) {
    window.AppState.projects[project.project_id] = ensureProjectShape(project);
    window.AppState.currentProjectId = project.project_id;
    saveState();
    renderAll();
  }

  function mergeProjectPatch(projectId, patch) {
    validateProjectId(projectId);
    const existing = window.AppState.projects[projectId] || { project_id: projectId };
    window.AppState.projects[projectId] = ensureProjectShape({
      ...existing,
      ...patch,
      seo: { ...(existing.seo || {}), ...(patch.seo || {}) }
    });
    window.AppState.currentProjectId = projectId;
    saveState();
    renderAll();
  }

  function importScriptObject(scriptData) {
    validateImport(scriptData);
    const projectId = scriptData.project_id || generateProjectId(scriptData.topic_en || scriptData.topic || "imported_topic");
    const project = {
      project_id: projectId,
      topic_cn: scriptData.topic_cn || "",
      topic_en: scriptData.topic_en || scriptData.topic || "",
      template_type: scriptData.template_type || "A_55s",
      target_audience: scriptData.target_audience || "beginner",
      style: scriptData.style || "cute",
      series_tag: scriptData.series_tag || "DailyMandarin",
      total_duration_target: scriptData.total_duration_target || 55,
      shots: Array.isArray(scriptData.shots) ? scriptData.shots : [],
      seo: scriptData.seo || { title: "", description: "", tags: [] }
    };
    mergeProjectPatch(projectId, project);
  }

  function importManifestObject(manifestData) {
    validateImport(manifestData);
    const projectId = manifestData.project_id || window.AppState.currentProjectId || generateProjectId("imported_manifest");
    validateProjectId(projectId);
    const existing = window.AppState.projects[projectId] || {
      project_id: projectId,
      shots: []
    };

    let shots = Array.isArray(existing.shots) ? [...existing.shots] : [];
    if (!shots.length && Array.isArray(manifestData.timeline)) {
      shots = manifestData.timeline
        .filter((item) => item.type === "shot")
        .map((item, index) => ({
          shot_number: item.shot_number || index + 1,
          shot_name: `Shot ${item.shot_number || index + 1}`,
          duration_seconds: item.end_trim !== undefined
            ? Number(item.end_trim) - Number(item.start_trim || 0)
            : Number(item.duration || 0),
          voiceover_text_en: "",
          voiceover_text_cn: "",
          character_action: "",
          environment: "",
          camera: "",
          generation_platform: "pixverse",
          reusable_asset: null,
          status: "Pending",
          source: item.source || ""
        }));
    }

    mergeProjectPatch(projectId, {
      ...existing,
      shots,
      edit_manifest: manifestData
    });
  }

  function updateProjectBadge() {
    const badge = document.getElementById("current-project-badge");
    badge.textContent = `Current Project: ${window.AppState.currentProjectId || "none"}`;
  }

  function switchTab(tabName) {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `view-${tabName}`);
    });
  }

  function renderAll() {
    Object.entries(window.ConsoleModules).forEach(([name, mod]) => {
      const mount = document.getElementById(`view-${name}`);
      if (!mount || !mod || typeof mod.render !== "function") {
        return;
      }
      mod.render(mount, {
        state: window.AppState,
        currentProject: getCurrentProject(),
        statusOrder,
        saveState,
        copyText,
        setCurrentProject,
        upsertProject,
        mergeProjectPatch,
        importScriptObject,
        importManifestObject,
        slugify,
        generateProjectId,
        renderAll
      });
    });
    updateProjectBadge();
  }

  function seedDemoData() {
    upsertProject(demoScript);
  }

  function exportAllState() {
    copyText(JSON.stringify(window.AppState, null, 2));
  }

  function clearAllState() {
    const confirmed = window.confirm("确定清空控制台所有本地数据吗？");
    if (!confirmed) return;
    window.AppState = { currentProjectId: "", projects: {} };
    saveState();
    renderAll();
  }

  function bindShellEvents() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    document.getElementById("seed-demo-data").addEventListener("click", seedDemoData);
    document.getElementById("export-all-state").addEventListener("click", exportAllState);
    document.getElementById("clear-console-data").addEventListener("click", clearAllState);
  }

  window.AppState = loadState();
  window.ConsoleModules = window.ConsoleModules || {};
  window.ConsoleApp = {
    escapeHtml,
    saveState,
    renderAll,
    getCurrentProject,
    setCurrentProject,
    upsertProject,
    mergeProjectPatch,
    importScriptObject,
    importManifestObject,
    copyText
  };

  bindShellEvents();
  renderAll();
})();
