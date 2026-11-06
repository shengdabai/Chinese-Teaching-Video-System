(function () {
  const escapeHtml = (value) => window.ConsoleApp.escapeHtml(value);
  const audienceOptions = ["absolute_beginner", "beginner", "intermediate", "business", "children"];
  const templateOptions = ["A_55s", "B_35s"];
  const styleOptions = ["cute", "professional", "casual"];

  function createDefaultShots(templateType) {
    if (templateType === "B_35s") {
      return [
        { shot_number: 1, shot_name: "Controversy Hook", duration_seconds: 3, character_action: "shocked expression", environment: "neutral background", camera: "close-up, front", generation_platform: "pixverse", reusable_asset: null, voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" },
        { shot_number: 2, shot_name: "Wrong Demo", duration_seconds: 7, character_action: "wrong pronunciation", environment: "classroom", camera: "medium shot", generation_platform: "pixverse", reusable_asset: null, voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" },
        { shot_number: 3, shot_name: "Correct Demo", duration_seconds: 10, character_action: "clear pronunciation", environment: "classroom", camera: "medium close-up", generation_platform: "pixverse", reusable_asset: null, voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" },
        { shot_number: 4, shot_name: "Quick Scene", duration_seconds: 10, character_action: "quick dialogue", environment: "street cafe", camera: "medium shot", generation_platform: "jimeng", reusable_asset: null, voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" },
        { shot_number: 5, shot_name: "CTA", duration_seconds: 5, character_action: "waving", environment: "brand background", camera: "medium shot, front", generation_platform: "reusable", reusable_asset: "waving_cta_001.mp4", voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" }
      ];
    }

    return [
      { shot_number: 1, shot_name: "Hook", duration_seconds: 4, character_action: "surprised expression", environment: "neutral background", camera: "medium shot, front, static", generation_platform: "pixverse", reusable_asset: null, voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" },
      { shot_number: 2, shot_name: "Vocab Display", duration_seconds: 6, character_action: "pointing at chalkboard", environment: "classroom", camera: "medium shot, front, static", generation_platform: "pixverse", reusable_asset: null, voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" },
      { shot_number: 3, shot_name: "Pronunciation", duration_seconds: 10, character_action: "talking gesture", environment: "classroom", camera: "close-up, front, slow push", generation_platform: "pixverse", reusable_asset: null, voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" },
      { shot_number: 4, shot_name: "Scene 1", duration_seconds: 10, character_action: "dialogue scene", environment: "coffee shop", camera: "medium shot, slight angle", generation_platform: "pixverse", reusable_asset: null, voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" },
      { shot_number: 5, shot_name: "Scene 2", duration_seconds: 10, character_action: "dialogue scene", environment: "restaurant", camera: "medium shot, front", generation_platform: "jimeng", reusable_asset: null, voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" },
      { shot_number: 6, shot_name: "Quiz", duration_seconds: 8, character_action: "thinking pose", environment: "neutral background", camera: "medium shot, front, static", generation_platform: "pixverse", reusable_asset: null, voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" },
      { shot_number: 7, shot_name: "CTA", duration_seconds: 7, character_action: "waving goodbye", environment: "brand background", camera: "medium shot, front, static", generation_platform: "reusable", reusable_asset: "waving_cta_001.mp4", voiceover_text_en: "", voiceover_text_cn: "", status: "Pending" }
    ];
  }

  function renderOptions(options, selected) {
    return options
      .map((option) => `<option value="${option}" ${selected === option ? "selected" : ""}>${option}</option>`)
      .join("");
  }

  function render(container, ctx) {
    const current = ctx.currentProject;
    container.innerHTML = `
      <div class="module-shell">
        <section class="panel">
          <div class="module-header">
            <div>
              <h2>Topic Intake</h2>
              <p class="muted">输入主题信息，预估项目 ID，并生成 CLI 命令与文件包预览。</p>
            </div>
          </div>

          <form id="topic-intake-form" class="grid-2">
            <div class="field-group">
              <label for="topic-cn">主题（中文）</label>
              <input id="topic-cn" name="topic_cn" placeholder="例如：谢谢" value="${escapeHtml(current?.topic_cn || "")}" />
            </div>
            <div class="field-group">
              <label for="topic-en">主题（英文）</label>
              <input id="topic-en" name="topic_en" placeholder="例如：Thank You" value="${escapeHtml(current?.topic_en || "")}" />
            </div>
            <div class="field-group">
              <label for="audience">目标人群</label>
              <select id="audience" name="audience">${renderOptions(audienceOptions, current?.target_audience || "beginner")}</select>
            </div>
            <div class="field-group">
              <label for="template">视频时长模板</label>
              <select id="template" name="template">${renderOptions(templateOptions, current?.template_type || "A_55s")}</select>
            </div>
            <div class="field-group">
              <label for="style">风格</label>
              <select id="style" name="style">${renderOptions(styleOptions, current?.style || "cute")}</select>
            </div>
            <div class="field-group">
              <label for="series-tag">系列标签</label>
              <input id="series-tag" name="series_tag" placeholder="例如：DailyMandarin" value="${escapeHtml(current?.series_tag || "DailyMandarin")}" />
            </div>
            <div class="field-group" style="grid-column: 1 / -1;">
              <label for="seo-keywords">SEO 关键词</label>
              <textarea id="seo-keywords" name="seo_keywords" placeholder="逗号分隔，例如：learn chinese thank you, xiexie">${escapeHtml(current?.seo?.tags?.join(", ") || "")}</textarea>
            </div>
            <div class="button-row" style="grid-column: 1 / -1;">
              <button class="primary-button" type="submit">Generate Project</button>
              <button class="secondary-button" id="copy-cli-command" type="button">Copy CLI Command</button>
            </div>
          </form>
        </section>

        <section class="panel">
          <div class="stat-grid">
            <div class="stat-card">
              <span class="muted">Projected Project ID</span>
              <strong id="project-id-preview">${escapeHtml(current?.project_id || "未生成")}</strong>
            </div>
            <div class="stat-card">
              <span class="muted">Shot Count</span>
              <strong id="shot-count-preview">${current?.shots?.length || 0}</strong>
            </div>
            <div class="stat-card">
              <span class="muted">Template</span>
              <strong id="template-preview">${escapeHtml(current?.template_type || "A_55s")}</strong>
            </div>
          </div>

          <div class="grid-2" style="margin-top: 18px;">
            <div class="output-box">
              <h3>File Preview</h3>
              <pre id="file-preview">01_brief.md
02_script.json
03_shotlist.csv
04_character_sheet.md
05_image_prompts.md
06_video_prompts.md
07_subtitles.srt
08_voiceover.txt
09_seo_package.md
10_edit_manifest.json</pre>
            </div>
            <div class="output-box">
              <h3>Suggested CLI</h3>
              <pre id="cli-preview">python3 scripts/generate_project.py</pre>
            </div>
          </div>
        </section>
      </div>
    `;

    const form = container.querySelector("#topic-intake-form");
    const copyButton = container.querySelector("#copy-cli-command");

    function buildProjectFromForm() {
      const formData = new FormData(form);
      const topicCn = String(formData.get("topic_cn") || "").trim();
      const topicEn = String(formData.get("topic_en") || "").trim();
      const templateType = String(formData.get("template") || "A_55s");
      const projectId = ctx.generateProjectId(topicEn);
      const tags = String(formData.get("seo_keywords") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      return {
        project_id: projectId,
        topic_cn: topicCn,
        topic_en: topicEn,
        target_audience: String(formData.get("audience") || "beginner"),
        template_type: templateType,
        style: String(formData.get("style") || "cute"),
        series_tag: String(formData.get("series_tag") || "DailyMandarin"),
        total_duration_target: templateType === "B_35s" ? 35 : 55,
        shots: createDefaultShots(templateType),
        seo: {
          title: topicEn ? `How to Say ${topicEn} in Chinese | Learn Mandarin` : "",
          description: topicCn ? `Learn ${topicCn} in one short Chinese lesson.` : "",
          tags
        },
        character_block: current?.character_block || "",
        checklist: current?.checklist || undefined,
        publishCalendar: current?.publishCalendar || [],
        assetLibrary: current?.assetLibrary || []
      };
    }

    function refreshPreview() {
      const project = buildProjectFromForm();
      container.querySelector("#project-id-preview").textContent = project.project_id;
      container.querySelector("#shot-count-preview").textContent = String(project.shots.length);
      container.querySelector("#template-preview").textContent = project.template_type;
      container.querySelector("#cli-preview").textContent = "python3 scripts/generate_project.py";
    }

    form.addEventListener("input", refreshPreview);
    form.addEventListener("change", refreshPreview);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const project = buildProjectFromForm();
      ctx.upsertProject(project);
    });

    copyButton.addEventListener("click", () => ctx.copyText("python3 scripts/generate_project.py"));

    refreshPreview();
  }

  window.ConsoleModules = window.ConsoleModules || {};
  window.ConsoleModules["topic-intake"] = { render };
})();
