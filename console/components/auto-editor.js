(function () {
  const escapeHtml = (value) => window.ConsoleApp.escapeHtml(value);
  function totalDuration(shots) {
    return shots.reduce((sum, shot) => sum + Number(shot.duration_seconds || 0), 0);
  }

  function renderTimeline(project) {
    const total = totalDuration(project.shots) || 1;
    return project.shots
      .map((shot, index) => {
        const width = Math.max((Number(shot.duration_seconds || 0) / total) * 100, 6);
        return `
          <div class="timeline-item" data-shot-index="${index}">
            <div class="module-header">
              <strong>Shot ${escapeHtml(shot.shot_number)} — ${escapeHtml(shot.shot_name)}</strong>
              <div class="drag-buttons">
                <button class="mini-button" data-move="up" data-shot-index="${index}" type="button">↑</button>
                <button class="mini-button" data-move="down" data-shot-index="${index}" type="button">↓</button>
              </div>
            </div>
            <div class="timeline-bar">
              <div class="timeline-fill" style="width: ${width}%"></div>
            </div>
            <p class="muted">${escapeHtml(shot.duration_seconds)}s · ${escapeHtml(shot.generation_platform)} · ${escapeHtml(shot.camera)}</p>
          </div>
        `;
      })
      .join("");
  }

  function buildFfmpegCommand(project) {
    return `bash scripts/full_pipeline.sh ${project.project_id}

# 或手动执行
bash scripts/normalize_clips.sh ${project.project_id}
bash scripts/auto_edit.sh ${project.project_id}
bash scripts/burn_subtitles.sh ${project.project_id}
bash scripts/mix_audio.sh ${project.project_id}
bash scripts/add_intro_outro.sh ${project.project_id}`;
  }

  function render(container, ctx) {
    const project = ctx.currentProject;
    const duration = project ? totalDuration(project.shots) : 0;
    const manifest = project?.edit_manifest || null;
    const manifestTimelineCount = Array.isArray(manifest?.timeline) ? manifest.timeline.length : 0;

    container.innerHTML = `
      <div class="module-shell">
        <section class="panel">
          <div class="module-header">
            <div>
              <h2>Auto Editor</h2>
              <p class="muted">查看镜头时间线、调整顺序，并生成 FFmpeg 执行命令。</p>
            </div>
            <div class="button-row">
              <button id="copy-ffmpeg-command" class="secondary-button" type="button">Generate FFmpeg Command</button>
              <button id="copy-pipeline-command" class="primary-button" type="button">Run Full Pipeline</button>
            </div>
          </div>
          <div class="field-group" style="margin-bottom: 18px;">
            <label for="manifest-import">导入本地 10_edit_manifest.json</label>
            <input id="manifest-import" type="file" accept=".json,application/json" />
            <p class="muted">导入后会绑定到当前项目；如果当前没有项目，则按 manifest 里的 project_id 新建。</p>
          </div>
          ${
            project
              ? `
                <div class="stat-grid">
                  <div class="stat-card">
                    <span class="muted">Timeline Items</span>
                    <strong>${project.shots.length}</strong>
                  </div>
                  <div class="stat-card">
                    <span class="muted">Total Duration</span>
                    <strong>${duration}s</strong>
                  </div>
                  <div class="stat-card">
                    <span class="muted">Target</span>
                    <strong>${escapeHtml(project.total_duration_target || 55)}s</strong>
                  </div>
                  <div class="stat-card">
                    <span class="muted">Manifest Items</span>
                    <strong>${manifestTimelineCount}</strong>
                  </div>
                </div>
                <div class="timeline-list" style="margin-top: 18px;">
                  ${renderTimeline(project)}
                </div>
              `
              : `<p class="muted">先创建项目，才能构建时间线。</p>`
          }
        </section>

        <section class="panel">
          <h3>Command Preview</h3>
          <div class="code-box"><pre>${escapeHtml(project ? buildFfmpegCommand(project) : "暂无可生成命令")}</pre></div>
        </section>

        <section class="panel">
          <h3>Manifest Preview</h3>
          <div class="code-box"><pre>${escapeHtml(manifest ? JSON.stringify(manifest, null, 2) : "当前项目还没有导入 edit_manifest.json")}</pre></div>
        </section>
      </div>
    `;
    const manifestImportInput = container.querySelector("#manifest-import");

    if (manifestImportInput) {
      manifestImportInput.addEventListener("change", async () => {
        const file = manifestImportInput.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          ctx.importManifestObject(parsed);
        } catch (error) {
          window.alert(`导入 edit_manifest.json 失败：${error.message}`);
        } finally {
          manifestImportInput.value = "";
        }
      });
    }

    if (!project) return;

    container.querySelectorAll("[data-move]").forEach((button) => {
      button.addEventListener("click", () => {
        const direction = button.dataset.move;
        const index = Number(button.dataset.shotIndex);
        const shots = ctx.state.projects[ctx.state.currentProjectId].shots;
        const nextIndex = direction === "up" ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= shots.length) return;
        [shots[index], shots[nextIndex]] = [shots[nextIndex], shots[index]];
        shots.forEach((shot, shotIndex) => {
          shot.shot_number = shotIndex + 1;
        });
        ctx.saveState();
        ctx.renderAll();
      });
    });

    container.querySelector("#copy-ffmpeg-command").addEventListener("click", () => {
      ctx.copyText(buildFfmpegCommand(project));
    });

    container.querySelector("#copy-pipeline-command").addEventListener("click", () => {
      ctx.copyText(`bash scripts/full_pipeline.sh ${project.project_id}`);
    });
  }

  window.ConsoleModules = window.ConsoleModules || {};
  window.ConsoleModules["auto-editor"] = { render };
})();
