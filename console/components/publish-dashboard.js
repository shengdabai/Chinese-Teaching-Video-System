(function () {
  const escapeHtml = (value) => window.ConsoleApp.escapeHtml(value);
  function renderChecklist(items) {
    return items
      .map((item, index) => {
        return `
          <div class="check-item">
            <label>
              <input type="checkbox" data-check-index="${index}" ${item.done ? "checked" : ""} />
              <span style="margin-left: 10px;">${escapeHtml(item.label)}</span>
            </label>
            <span class="project-pill">${item.done ? "Done" : "Pending"}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderCalendar(items) {
    if (!items.length) {
      return `<p class="muted">还没有发布时间安排。</p>`;
    }
    return items
      .map((item, index) => {
        return `
          <div class="calendar-item">
            <strong>${escapeHtml(item.date)}</strong>
            <p class="muted">状态：${escapeHtml(item.status)}</p>
            <button class="mini-button" data-toggle-calendar="${index}" type="button">切换已发布/待发布</button>
          </div>
        `;
      })
      .join("");
  }

  function render(container, ctx) {
    const project = ctx.currentProject;
    const seo = project?.seo || { title: "", description: "", tags: [] };

    container.innerHTML = `
      <div class="module-shell">
        <section class="warning-banner">
          <strong>AI 内容标注提醒</strong>
          <p style="margin-bottom: 0;">上传到 YouTube Studio 时，必须勾选 “Altered or synthetic content”。这是本项目的硬性合规要求。</p>
        </section>

        <section class="panel">
          <div class="module-header">
            <div>
              <h2>Publish Dashboard</h2>
              <p class="muted">集中查看标题、描述、标签，管理发布清单与发布时间。</p>
            </div>
          </div>
          ${
            project
              ? `
                <div class="grid-3">
                  <div class="prompt-card">
                    <div class="module-header">
                      <strong>Title</strong>
                      <button class="mini-button" data-copy-seo="title" type="button">Copy</button>
                    </div>
                    <div class="preview-box">${escapeHtml(seo.title || "未填写标题")}</div>
                  </div>
                  <div class="prompt-card">
                    <div class="module-header">
                      <strong>Description</strong>
                      <button class="mini-button" data-copy-seo="description" type="button">Copy</button>
                    </div>
                    <div class="preview-box">${escapeHtml(seo.description || "未填写描述")}</div>
                  </div>
                  <div class="prompt-card">
                    <div class="module-header">
                      <strong>Tags</strong>
                      <button class="mini-button" data-copy-seo="tags" type="button">Copy</button>
                    </div>
                    <div class="preview-box">${escapeHtml(seo.tags?.join(", ") || "未填写标签")}</div>
                  </div>
                </div>
              `
              : `<p class="muted">请先创建项目。</p>`
          }
        </section>

        <section class="panel">
          <div class="grid-2">
            <div>
              <h3>Pre-publish Checklist</h3>
              <div class="checklist">${project ? renderChecklist(project.checklist) : ""}</div>
            </div>
            <div>
              <div class="module-header">
                <h3>Publish Calendar</h3>
                <button id="add-calendar-item" class="secondary-button" type="button">Add Date</button>
              </div>
              <div class="calendar-grid">${project ? renderCalendar(project.publishCalendar) : ""}</div>
            </div>
          </div>
        </section>
      </div>
    `;

    if (!project) return;

    container.querySelectorAll("[data-copy-seo]").forEach((button) => {
      button.addEventListener("click", () => {
        const field = button.dataset.copySeo;
        const value = field === "tags" ? seo.tags.join(", ") : seo[field] || "";
        ctx.copyText(value);
      });
    });

    container.querySelectorAll("[data-check-index]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const index = Number(checkbox.dataset.checkIndex);
        ctx.state.projects[ctx.state.currentProjectId].checklist[index].done = checkbox.checked;
        ctx.saveState();
        ctx.renderAll();
      });
    });

    container.querySelectorAll("[data-toggle-calendar]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.toggleCalendar);
        const item = ctx.state.projects[ctx.state.currentProjectId].publishCalendar[index];
        item.status = item.status === "published" ? "planned" : "published";
        ctx.saveState();
        ctx.renderAll();
      });
    });

    const addButton = container.querySelector("#add-calendar-item");
    if (addButton) {
      addButton.addEventListener("click", () => {
        const date = window.prompt("输入发布日期（YYYY-MM-DD）");
        if (!date) return;
        ctx.state.projects[ctx.state.currentProjectId].publishCalendar.push({ date, status: "planned" });
        ctx.saveState();
        ctx.renderAll();
      });
    }
  }

  window.ConsoleModules = window.ConsoleModules || {};
  window.ConsoleModules["publish-dashboard"] = { render };
})();
