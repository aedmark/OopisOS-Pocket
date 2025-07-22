// scripts/commands/printscreen.js
window.PrintscreenCommand = class PrintscreenCommand extends Command {
    constructor() {
        super({
            commandName: "printscreen",
            description: "Captures a screenshot of the entire OopisOS screen.",
            helpText: `Usage: printscreen
      Capture a screenshot of the current OopisOS screen.
      DESCRIPTION
      The printscreen command generates an image of the current state of
      the OopisOS terminal and initiates a browser download for the image.
      The filename will be 'OopisOS_Screenshot' followed by the date and time.
      NOTE: This command may not work on all browsers due to varying
      support for the necessary rendering technologies.`,
            validations: {
                args: {
                    exact: 0
                }
            },
        });
    }

    async coreLogic(context) {
        const { options, dependencies } = context;
        const { Utils, OutputManager, ErrorHandler, Config } = dependencies;

        if (!options.isInteractive) {
            return ErrorHandler.createError(
                "printscreen: Can only be run in interactive mode."
            );
        }

        try {
            // Temporarily remove the blinking cursor for a clean screenshot
            const terminalElement = document.getElementById("terminal");
            if (terminalElement) {
                terminalElement.classList.add("no-cursor");
            }

            await OutputManager.appendToOutput("Generating screenshot...");

            // Allow the DOM to update
            await new Promise((resolve) => setTimeout(resolve, 50));

            const { html2canvas } = window;
            if (typeof html2canvas === "undefined") {
                if (terminalElement) {
                    terminalElement.classList.remove("no-cursor");
                }
                return ErrorHandler.createError(
                    "printscreen: html2canvas library not loaded. Screenshot failed."
                );
            }

            const canvas = await html2canvas(terminalElement, {
                backgroundColor: "#000",
                logging: false,
                useCORS: true,
                allowTaint: true,
                onclone: (doc) => {
                    // In the cloned document, ensure we don't have the "no-cursor" class
                    // so the caret is present if needed, but we can also hide it.
                    const clonedTerminal = doc.getElementById("terminal");
                    if (clonedTerminal) {
                        clonedTerminal.classList.add("no-cursor-force");
                    }
                },
            });

            const fileName = `OopisOS_Screenshot_${new Date().toISOString().replace(/:/g, "-")}.png`;
            const a = Utils.createElement("a", {
                href: canvas.toDataURL("image/png"),
                download: fileName,
            });

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            if (terminalElement) {
                terminalElement.classList.remove("no-cursor");
            }

            return ErrorHandler.createSuccess(
                `${Config.MESSAGES.SCREENSHOT_PREFIX}${fileName}`
            );
        } catch (e) {
            const terminalElement = document.getElementById("terminal");
            if (terminalElement) {
                terminalElement.classList.remove("no-cursor");
            }
            return ErrorHandler.createError(
                `printscreen: Failed to capture screen. ${e.message}`
            );
        }
    }
}