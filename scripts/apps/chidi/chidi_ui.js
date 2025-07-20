// scripts/apps/chidi/chidi_ui.js

window.ChidiUI = (() => {
  "use strict";

  let elements = {};
  let callbacks = {};

  function buildAndShow(initialState, cb) {
    callbacks = cb;

    const header = Utils.createElement(
        "header",
        { className: "chidi-console-header" },
        // --- MODIFICATION START: Replaced dropdown with Prev/Next buttons ---
        Utils.createElement(
            "div",
            { id: "chidi-nav-controls", className: "chidi-control-group" },
            Utils.createElement("button", {
              id: "chidi-prevBtn",
              className: "chidi-btn",
              textContent: "< Prev",
            }),
            Utils.createElement("button", {
              id: "chidi-nextBtn",
              className: "chidi-btn",
              textContent: "Next >",
            })
        ),
        // --- MODIFICATION END ---
        Utils.createElement("h1", {
          id: "chidi-mainTitle",
          textContent: "chidi.md",
        }),
        Utils.createElement(
            "div",
            { className: "chidi-control-group" },
            Utils.createElement("button", {
              id: "chidi-summarizeBtn",
              className: "chidi-btn",
              textContent: "Summarize",
            }),
            Utils.createElement("button", {
              id: "chidi-suggestQuestionsBtn",
              className: "chidi-btn",
              textContent: "Study",
            }),
            Utils.createElement("button", {
              id: "chidi-askAllFilesBtn",
              className: "chidi-btn",
              textContent: "Ask",
            })
        )
    );

    const mainContent = Utils.createElement("main", {
      id: "chidi-markdownDisplay",
      className: "chidi-markdown-content",
    });

    const footer = Utils.createElement(
        "footer",
        { className: "chidi-status-readout" },
        Utils.createElement("div", {
          id: "chidi-fileCountDisplay",
          className: "chidi-status-item",
        }),
        Utils.createElement("div", {
          id: "chidi-messageBox",
          className: "chidi-status-message",
        }),
        Utils.createElement(
            "div",
            { className: "chidi-control-group" },
            Utils.createElement("div", {
              id: "chidi-loader",
              className: "chidi-loader chidi-hidden",
            }),
            Utils.createElement("button", {
              id: "chidi-saveSessionBtn",
              className: "chidi-btn",
              textContent: "Save",
            }),
            Utils.createElement("button", {
              id: "chidi-exportBtn",
              className: "chidi-btn",
              textContent: "Export",
            }),
            Utils.createElement("button", {
              id: "chidi-closeBtn",
              className: "chidi-btn chidi-exit-btn",
              textContent: "Exit",
            })
        )
    );

    const appContainer = Utils.createElement(
        "div",
        { id: "chidi-console-panel" },
        header,
        mainContent,
        footer
    );

    _cacheDOMElements(appContainer);
    _setupEventListeners();
    update(initialState);

    return appContainer;
  }

  function hideAndReset() {
    if (elements.container) {
      elements.container.remove();
    }
    elements = {};
    callbacks = {};
  }

  function update(state) {
    if (!elements.container) return;

    const hasFiles = state.loadedFiles.length > 0;
    const currentFile = hasFiles ? state.loadedFiles[state.currentIndex] : null;

    elements.fileCountDisplay.textContent = `File ${state.currentIndex + 1} of ${state.loadedFiles.length}`;

    // --- MODIFICATION START: Update Prev/Next button states ---
    elements.prevBtn.disabled = !hasFiles || state.currentIndex === 0;
    elements.nextBtn.disabled =
        !hasFiles || state.currentIndex >= state.loadedFiles.length - 1;
    // --- MODIFICATION END ---

    elements.exportBtn.disabled = !hasFiles;
    elements.saveSessionBtn.disabled = !hasFiles;
    elements.summarizeBtn.disabled = !hasFiles;
    elements.studyBtn.disabled = !hasFiles;
    elements.askBtn.disabled = !hasFiles;

    if (currentFile) {
      elements.mainTitle.textContent = currentFile.name.replace(
          /\.(md|txt|js|sh)$/i,
          ""
      );
      elements.markdownDisplay.className = "chidi-markdown-content";
      if (
          currentFile.isCode ||
          Utils.getFileExtension(currentFile.name) === "txt"
      ) {
        elements.markdownDisplay.innerHTML = `<pre>${currentFile.content || ""}</pre>`;
      } else {
        elements.markdownDisplay.innerHTML = DOMPurify.sanitize(
            marked.parse(currentFile.content)
        );
      }
    } else {
      elements.mainTitle.textContent = "chidi.md";
      elements.markdownDisplay.innerHTML = `<p>No files loaded.</p>`;
    }
  }

  function _cacheDOMElements(container) {
    elements.container = container;
    const get = (id) => container.querySelector(`#${id}`);
    elements = {
      ...elements,
      // --- MODIFICATION START: Cache new buttons ---
      prevBtn: get("chidi-prevBtn"),
      nextBtn: get("chidi-nextBtn"),
      // --- MODIFICATION END ---
      mainTitle: get("chidi-mainTitle"),
      markdownDisplay: get("chidi-markdownDisplay"),
      fileCountDisplay: get("chidi-fileCountDisplay"),
      messageBox: get("chidi-messageBox"),
      loader: get("chidi-loader"),
      summarizeBtn: get("chidi-summarizeBtn"),
      studyBtn: get("chidi-suggestQuestionsBtn"),
      askBtn: get("chidi-askAllFilesBtn"),
      saveSessionBtn: get("chidi-saveSessionBtn"),
      exportBtn: get("chidi-exportBtn"),
      closeBtn: get("chidi-closeBtn"),
    };
  }

  function _setupEventListeners() {
    elements.closeBtn.addEventListener("click", callbacks.onClose);
    elements.exportBtn.addEventListener("click", callbacks.onExport);
    // --- MODIFICATION START: Add listeners for new buttons ---
    elements.prevBtn.addEventListener("click", callbacks.onPrevFile);
    elements.nextBtn.addEventListener("click", callbacks.onNextFile);
    // --- MODIFICATION END ---
    elements.askBtn.addEventListener("click", callbacks.onAsk);
    elements.summarizeBtn.addEventListener("click", callbacks.onSummarize);
    elements.studyBtn.addEventListener("click", callbacks.onStudy);
    elements.saveSessionBtn.addEventListener("click", callbacks.onSaveSession);

    document.addEventListener(
        "keydown",
        (e) => {
          if (!elements.container?.isConnected) return;
          if (e.key === "Escape") {
            callbacks.onClose();
          }
        },
        true
    );
  }

  // --- MODIFICATION: The dropdown functions are no longer needed ---

  function showMessage(msg) {
    if (elements.messageBox) elements.messageBox.textContent = `֎ ${msg}`;
  }

  function appendAiOutput(title, content) {
    const outputBlock = Utils.createElement("div", {
      className: "chidi-ai-output",
    });
    outputBlock.innerHTML = DOMPurify.sanitize(
        marked.parse(`### ${title}\n\n${content}`)
    );
    elements.markdownDisplay.appendChild(outputBlock);
    outputBlock.scrollIntoView({ behavior: "smooth", block: "start" });
    showMessage(`AI Response received for "${title}".`);
  }

  function toggleLoader(show) {
    if (elements.loader)
      elements.loader.classList.toggle("chidi-hidden", !show);
  }

  function packageSessionAsHTML(state) {
    const currentFile = state.loadedFiles[state.currentIndex];
    const content = elements.markdownDisplay.innerHTML;
    const title = `Chidi Session: ${currentFile?.name || "Untitled"}`;
    const styles =
        "body{background-color:#0d0d0d;color:#e4e4e7;font-family:'VT323',monospace;line-height:1.6;padding:2rem}h1,h2,h3{border-bottom:1px solid #444;padding-bottom:.3rem;color:#60a5fa}a{color:#34d399}pre{white-space:pre-wrap;background-color:#000;padding:1rem;border-radius:4px}.chidi-ai-output{border-top:2px dashed #60a5fa;margin-top:2rem;padding-top:1rem}";
    return `<!DOCTYPE html><html lang="en"><head><title>${title}</title><style>${styles}</style></head><body><h1>${title}</h1>${content}</body></html>`;
  }

  return {
    buildAndShow,
    hideAndReset,
    update,
    showMessage,
    appendAiOutput,
    toggleLoader,
    packageSessionAsHTML,
  };
})();