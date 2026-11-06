(function () {
  const escapeHtml = (value) => window.ConsoleApp.escapeHtml(value);
  function renderKanbanColumns(project, statusOrder) {
    return statusOrder
      .map((status) => {
        const cards = (project?.shots || []).filter((shot) => (shot.status || "Pending") === status);
        return `
          <div class="kanban-column">
            <h3>${status}</h3>
            ${cards.length
              ? cards
                  .map((shot) => {
                    const missing = !shot.environment || !shot.character_action;
                    return `
                      <div class="kanban-card ${missing ? "missing" : ""}">
                        <strong>Shot ${escapeHtml(shot.shot_number)}</strong>
                        <div>${escapeHtml(shot.shot_name)}</div>
                        <div class="muted">${escapeHtml(shot.generation_platform)} · ${escapeHtml(shot.environment || "environment missing")}</div>
                        <button class="mini-button" data-next-shot="${escapeHtml(shot.shot_number)}" type="button">Move to Next</button>
                      </div>
                    `;
                  })
                  .join("")
              : `<p class="muted">暂无镜头</p>`}
          </div>
        `;
      })
      .join("");
  }

  function renderAssetGrid(assets) {
    if (!assets.length) {
      return `<p class="muted">还没有扫描到可复用素材。可以选择 <code>assets/reusable/</code> 目录进行导入。</p>`;
    }
    return assets
      .map((asset) => {
        return `
          <div class="asset-card ${asset.present ? "" : "missing"}">
            <strong>${escapeHtml(asset.name)}</strong>
            <p class="muted">${escapeHtml(asset.category)}</p>
            <p>${asset.present ? "已登记" : "缺失素材"}</p>
          </div>
        `;
      })
      .join("");
  }

  function render(container, ctx) {
    const project = ctx.currentProject;
    container.innerHTML = `
      <div class="module-shell">
        <section class="panel">
          <div class="module-header">
            <div>
              <h2>Clip Inbox & Asset Manager</h2>
              <p class="muted">按镜头状态追踪项目进度，并通过目录选择器登记可复用素材。</p>
            </div>
          </div>
          ${
            project
              ? `<div class="kanban">${renderKanbanColumns(project, ctx.statusOrder)}</div>`
              : `<p class="muted">先创建项目，才能看到镜头状态看板。</p>`
          }
        </section>

        <section class="panel">
          <div class="module-header">
            <div>
              <h2>Reusable Asset Library</h2>
              <p class="muted">浏览器不能直接读取本地目录列表，这里通过文件夹选择器扫描 <code>assets/reusable/</code> 内容并保存在 localStorage。</p>
            </div>
            <input id="asset-folder-picker" type="file" webkitdirectory directory multiple />
          </div>
          <div class="asset-grid">
            ${renderAssetGrid(project?.assetLibrary || [])}
          </div>
        </section>
      </div>
    `;

    if (project) {
      container.querySelectorAll("[data-next-shot]").forEach((button) => {
        button.addEventListener("click", () => {
          const shotNumber = Number(button.dataset.nextShot);
          const currentProject = ctx.state.projects[ctx.state.currentProjectId];
          const shot = currentProject.shots.find((item) => item.shot_number === shotNumber);
          const currentIndex = ctx.statusOrder.indexOf(shot.status || "Pending");
          shot.status = ctx.statusOrder[Math.min(currentIndex + 1, ctx.statusOrder.length - 1)];
          ctx.saveState();
          ctx.renderAll();
        });
      });
    }

    const picker = container.querySelector("#asset-folder-picker");
    if (picker && project) {
      picker.addEventListener("change", () => {
        const files = Array.from(picker.files || []);
        const scanned = files
          .filter((file) => file.name && !file.name.startsWith("."))
          .map((file) => {
            const pathParts = String(file.webkitRelativePath || "").split("/");
            return {
              name: file.name,
              category: pathParts.length > 1 ? pathParts[pathParts.length - 2] : "unclassified",
              present: true
            };
          });

        const expected = [
          "greetings",
          "thinking",
          "pointing",
          "waving",
          "classroom",
          "outdoor"
        ].map((category) => {
          const found = scanned.find((item) => item.category === category);
          return found || { name: `${category} (empty)`, category, present: false };
        });

        ctx.state.projects[ctx.state.currentProjectId].assetLibrary = expected;
        ctx.saveState();
        ctx.renderAll();
      });
    }
  }

  window.ConsoleModules = window.ConsoleModules || {};
  window.ConsoleModules["clip-inbox"] = { render };
})();
