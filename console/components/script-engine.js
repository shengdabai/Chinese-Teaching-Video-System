(function () {
  const escapeHtml = (value) => window.ConsoleApp.escapeHtml(value);
  function buildScriptExport(project) {
    return {
      project_id: project.project_id,
      topic_cn: project.topic_cn || "",
      topic_en: project.topic_en || "",
      template_type: project.template_type || "A_55s",
      target_audience: project.target_audience || "beginner",
      style: project.style || "cute",
      series_tag: project.series_tag || "DailyMandarin",
      total_duration_target: project.total_duration_target || 55,
      shots: project.shots || [],
      seo: project.seo || {
        title: "",
        description: "",
        tags: []
      }
    };
  }

  function renderProjectPicker(projects, currentId) {
    const ids = Object.keys(projects);
    if (!ids.length) {
      return `<p class="muted">还没有项目。先在 Topic Intake 中生成一个。</p>`;
    }

    return `
      <div class="field-group">
        <label for="project-picker">选择项目</label>
        <select id="project-picker">
          ${ids
            .map((id) => `<option value="${escapeHtml(id)}" ${id === currentId ? "selected" : ""}>${escapeHtml(id)}</option>`)
            .join("")}
        </select>
      </div>
    `;
  }

  function renderShotCard(shot) {
    return `
      <article class="shot-card" data-shot-number="${escapeHtml(shot.shot_number)}">
        <div class="shot-head">
          <div>
            <strong>Shot ${escapeHtml(shot.shot_number)} — ${escapeHtml(shot.shot_name)}</strong>
            <div class="shot-meta">${escapeHtml(shot.duration_seconds)}s · ${escapeHtml(shot.generation_platform)} · ${escapeHtml(shot.camera || "camera TBD")}</div>
          </div>
          <span class="project-pill">${escapeHtml(shot.status || "Pending")}</span>
        </div>
        <div class="grid-2">
          <div class="field-group">
            <label>旁白文本（英文）</label>
            <textarea data-field="voiceover_text_en">${escapeHtml(shot.voiceover_text_en || "")}</textarea>
          </div>
          <div class="field-group">
            <label>旁白文本（中文）</label>
            <textarea data-field="voiceover_text_cn">${escapeHtml(shot.voiceover_text_cn || "")}</textarea>
          </div>
          <div class="field-group">
            <label>角色动作</label>
            <input data-field="character_action" value="${escapeHtml(shot.character_action || "")}" />
          </div>
          <div class="field-group">
            <label>环境</label>
            <input data-field="environment" value="${escapeHtml(shot.environment || "")}" />
          </div>
        </div>
      </article>
    `;
  }

  function render(container, ctx) {
    const current = ctx.currentProject;
    container.innerHTML = `
      <div class="module-shell">
        <section class="panel">
          <div class="module-header">
            <div>
              <h2>Script Engine</h2>
              <p class="muted">选择本地项目并以卡片方式编辑 <code>script.json</code> 的关键字段。</p>
            </div>
            <button id="export-script-json" class="primary-button" type="button">Export JSON</button>
          </div>
          <div class="grid-2">
            <div class="panel compact">
              <h3>Project Selector</h3>
              ${renderProjectPicker(ctx.state.projects, ctx.state.currentProjectId)}
              <div class="field-group" style="margin-top: 14px;">
                <label for="manual-project-id">手动输入项目 ID</label>
                <input id="manual-project-id" placeholder="输入已存在的 project_id" value="${escapeHtml(ctx.state.currentProjectId || "")}" />
              </div>
              <button id="switch-project-manual" class="secondary-button" type="button" style="margin-top: 12px;">Switch Project</button>
              <div class="field-group" style="margin-top: 16px;">
                <label for="script-json-import">导入本地 02_script.json</label>
                <input id="script-json-import" type="file" accept=".json,application/json" />
              </div>
              <p class="muted">导入后会自动创建或更新对应 project_id，并切换为当前项目。</p>
            </div>
            <div class="panel compact">
              <h3>Metadata</h3>
              <div class="list-grid">
                <div class="project-pill">Template: ${escapeHtml(current?.template_type || "none")}</div>
                <div class="project-pill">Audience: ${escapeHtml(current?.target_audience || "none")}</div>
                <div class="project-pill">Series: ${escapeHtml(current?.series_tag || "none")}</div>
                <div class="project-pill">Import Ready: ${current ? "yes" : "waiting"}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="module-header">
            <div>
              <h2>Shot Editor</h2>
              <p class="muted">逐镜头编辑旁白、动作和环境，改动自动保存到 localStorage。</p>
            </div>
          </div>
          <div id="shot-editor-list" class="list-grid">
            ${current ? current.shots.map(renderShotCard).join("") : `<p class="muted">当前没有可编辑项目。</p>`}
          </div>
        </section>
      </div>
    `;

    const picker = container.querySelector("#project-picker");
    const manualProjectId = container.querySelector("#manual-project-id");
    const manualSwitch = container.querySelector("#switch-project-manual");
    const exportButton = container.querySelector("#export-script-json");
    const shotEditorList = container.querySelector("#shot-editor-list");
    const importInput = container.querySelector("#script-json-import");

    if (picker) {
      picker.addEventListener("change", () => ctx.setCurrentProject(picker.value));
    }

    if (manualSwitch) {
      manualSwitch.addEventListener("click", () => {
        const value = manualProjectId.value.trim();
        if (value && ctx.state.projects[value]) {
          ctx.setCurrentProject(value);
        } else {
          window.alert("该项目 ID 不存在于当前控制台数据中。");
        }
      });
    }

    if (current && shotEditorList) {
      shotEditorList.querySelectorAll(".shot-card").forEach((card) => {
        const shotNumber = Number(card.dataset.shotNumber);
        card.querySelectorAll("[data-field]").forEach((field) => {
          field.addEventListener("input", () => {
            const project = ctx.state.projects[ctx.state.currentProjectId];
            const shot = project.shots.find((item) => item.shot_number === shotNumber);
            shot[field.dataset.field] = field.value;
            ctx.saveState();
          });
        });
      });
    }

    if (exportButton) {
      exportButton.addEventListener("click", () => {
        const project = ctx.state.projects[ctx.state.currentProjectId];
        if (!project) {
          window.alert("请先创建或选择项目。");
          return;
        }
        ctx.copyText(JSON.stringify(buildScriptExport(project), null, 2));
      });
    }

    if (importInput) {
      importInput.addEventListener("change", async () => {
        const file = importInput.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          ctx.importScriptObject(parsed);
        } catch (error) {
          window.alert(`导入 script.json 失败：${error.message}`);
        } finally {
          importInput.value = "";
        }
      });
    }
  }

  window.ConsoleModules = window.ConsoleModules || {};
  window.ConsoleModules["script-engine"] = { render };
})();
