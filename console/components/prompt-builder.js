(function () {
  const escapeHtml = (value) => window.ConsoleApp.escapeHtml(value);
  function buildPrompt(shot, characterBlock, platform) {
    const action = shot.character_action || "performing the required teaching action";
    const environment = shot.environment || "a clean teaching environment";
    const camera = shot.camera || "medium shot, front";

    if (platform === "liblib") {
      return `${characterBlock}\nThe panda is ${action}. Environment: ${environment}. Camera: ${camera}. Cartoon style, 3D render, Pixar style, soft lighting, vibrant colors. Vertical composition 9:16.`;
    }
    if (platform === "jimeng") {
      return `${characterBlock}\n熊猫正在${action}。环境：${environment}。镜头：${camera}。画面中不出现任何文字。`;
    }
    return `${characterBlock}\nThe panda is ${action}. Environment: ${environment}. Camera: ${camera}. No text, no letters, no subtitles, no watermark.`;
  }

  function renderPromptCard(title, prompt, ctx) {
    return `
      <div class="prompt-card">
        <div class="module-header">
          <strong>${escapeHtml(title)}</strong>
          <button class="mini-button" data-copy-prompt="${encodeURIComponent(prompt)}" type="button">Copy</button>
        </div>
        <div class="code-box"><pre>${escapeHtml(prompt)}</pre></div>
      </div>
    `;
  }

  function render(container, ctx) {
    const project = ctx.currentProject;
    const characterBlock = project?.character_block || "";
    const shotCards = project?.shots || [];

    container.innerHTML = `
      <div class="module-shell">
        <section class="panel">
          <div class="module-header">
            <div>
              <h2>Prompt Pack Builder</h2>
              <p class="muted">把角色块、镜头动作、环境和机位组合成三套可复制的提示词。</p>
            </div>
          </div>

          <div class="field-group">
            <label for="character-block">Character Identity Block</label>
            <textarea id="character-block" placeholder="粘贴 config/character_sheet.md 中的角色块">${escapeHtml(characterBlock)}</textarea>
          </div>
          <div class="button-row">
            <button id="save-character-block" class="secondary-button" type="button">Save Character Block</button>
            <button id="copy-character-block" class="ghost-button" type="button">Copy Character Block</button>
          </div>
        </section>

        <section class="panel">
          <div class="module-header">
            <div>
              <h2>Prompt Columns</h2>
              <p class="muted">左中右分别对应 LiblibAI 图片提示词、PixVerse 视频提示词、即梦 AI 视频提示词。</p>
            </div>
          </div>
          ${
            project
              ? `
            <div class="prompt-columns">
              <div class="prompt-column">
                <h3>LiblibAI</h3>
                ${shotCards.map((shot) => renderPromptCard(`Shot ${shot.shot_number} — ${shot.shot_name}`, buildPrompt(shot, characterBlock, "liblib"), ctx)).join("")}
              </div>
              <div class="prompt-column">
                <h3>PixVerse</h3>
                ${shotCards.map((shot) => renderPromptCard(`Shot ${shot.shot_number} — ${shot.shot_name}`, buildPrompt(shot, characterBlock, "pixverse"), ctx)).join("")}
              </div>
              <div class="prompt-column">
                <h3>即梦 AI</h3>
                ${shotCards.map((shot) => renderPromptCard(`Shot ${shot.shot_number} — ${shot.shot_name}`, buildPrompt(shot, characterBlock || "请先粘贴中文角色块", "jimeng"), ctx)).join("")}
              </div>
            </div>`
              : `<p class="muted">先创建一个项目，才能根据 shot 自动生成提示词。</p>`
          }
        </section>
      </div>
    `;

    const saveButton = container.querySelector("#save-character-block");
    const copyBlockButton = container.querySelector("#copy-character-block");
    const characterBlockField = container.querySelector("#character-block");

    if (saveButton && project) {
      saveButton.addEventListener("click", () => {
        ctx.state.projects[ctx.state.currentProjectId].character_block = characterBlockField.value;
        ctx.saveState();
        ctx.renderAll();
      });
    }

    if (copyBlockButton) {
      copyBlockButton.addEventListener("click", () => ctx.copyText(characterBlockField.value));
    }

    container.querySelectorAll("[data-copy-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        ctx.copyText(decodeURIComponent(button.dataset.copyPrompt));
      });
    });
  }

  window.ConsoleModules = window.ConsoleModules || {};
  window.ConsoleModules["prompt-builder"] = { render };
})();
