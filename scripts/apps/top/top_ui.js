// scripts/apps/top/top_ui.js
window.TopUI = class TopUI {
    constructor(callbacks, dependencies) {
        this.elements = {};
        this.callbacks = callbacks;
        this.dependencies = dependencies;
        this._buildLayout();
    }

    getContainer() {
        return this.elements.container;
    }

    _buildLayout() {
        const { Utils } = this.dependencies;

        this.elements.processList = Utils.createElement("tbody");
        const table = Utils.createElement("table", { className: "top-table" }, [
            Utils.createElement("thead", {},
                Utils.createElement("tr", {}, [
                    Utils.createElement("th", { textContent: "PID" }),
                    Utils.createElement("th", { textContent: "USER" }),
                    Utils.createElement("th", { textContent: "STAT" }),
                    Utils.createElement("th", { textContent: "COMMAND" }),
                ])
            ),
            this.elements.processList
        ]);

        const header = Utils.createElement("header", { className: "top-header" }, [
            Utils.createElement("h2", { textContent: "OopisOS Process Viewer" }),
            Utils.createElement("button", {
                className: "top-exit-btn",
                textContent: "×",
                title: "Exit (q)",
                eventListeners: { click: () => this.callbacks.onExit() }
            })
        ]);

        this.elements.container = Utils.createElement("div", {
            id: "top-container",
            className: "top-container",
        }, [header, table]);
    }

    render(processes) {
        if (!this.elements.processList) return;

        this.elements.processList.innerHTML = ""; // Clear existing rows

        if (processes.length === 0) {
            const row = this.dependencies.Utils.createElement("tr", {},
                this.dependencies.Utils.createElement("td", {
                    colSpan: 4,
                    textContent: "No background processes running.",
                    style: { textAlign: "center", fontStyle: "italic" }
                })
            );
            this.elements.processList.appendChild(row);
            return;
        }

        processes.forEach(proc => {
            const row = this.dependencies.Utils.createElement("tr", {}, [
                this.dependencies.Utils.createElement("td", { textContent: proc.pid }),
                this.dependencies.Utils.createElement("td", { textContent: proc.user }),
                this.dependencies.Utils.createElement("td", { textContent: proc.status }),
                this.dependencies.Utils.createElement("td", { textContent: proc.command }),
            ]);
            this.elements.processList.appendChild(row);
        });
    }

    hideAndReset() {
        if (this.elements.container) {
            this.elements.container.remove();
        }
        this.elements = {};
    }
}