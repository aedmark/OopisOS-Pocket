// scripts/commands/edit.js
class EditCommand extends Command {
    constructor() {
        super({
            commandName: "edit",
            dependencies: ["apps/editor/editor_ui.js", "apps/editor/editor_manager.js"],
            applicationModules: ["EditorManager", "EditorUI", "App"],
            description: "A powerful, context-aware text and code editor.",
            helpText: `Usage: edit [filepath]
      Launches the OopisOS text editor.
      DESCRIPTION
      The 'edit' command opens a powerful, full-screen modal application for creating
      and editing files. It intelligently adapts its interface based on the file type.
      - If a filepath is provided, it opens that file.
      - If the file does not exist, a new empty file will be created with that name upon saving.
      - If no filepath is given, it opens a new, untitled document.
      MODES
      - Markdown (.md): Activates a live preview and a formatting toolbar.
      - HTML (.html): Activates a live, sandboxed preview of the rendered HTML.
      - Other (e.g., .txt, .js, .sh): Provides a clean, standard text editing experience.
      KEYBOARD SHORTCUTS
      Ctrl+S: Save       Ctrl+O: Exit
      Ctrl+P: Toggle Preview`,
            completionType: "paths",
            argValidation: {
                max: 1,
                error: "Usage: edit [filepath]",
            },
            validations: {
                paths: [
                    {
                        argIndex: 0,
                        options: { allowMissing: true, expectedType: "file" },
                        permissions: ["read"],
                        required: false,
                    },
                ],
            },
        });
    }

    async coreLogic(context) {
        const { args, options, validatedPaths, dependencies } = context;
        const { ErrorHandler, Utils, CommandExecutor, AppLayerManager, EditorManager } = dependencies;

        if (!options.isInteractive) {
            return ErrorHandler.createError(
                "edit: Can only be run in interactive mode."
            );
        }

        const hasFileArgument = args.length > 0 && validatedPaths.length > 0;
        const filePath = hasFileArgument ? validatedPaths[0].resolvedPath : null;
        const node = hasFileArgument ? validatedPaths[0].node : null;

        const extension = Utils.getFileExtension(filePath);
        const codeExtensions = ["js", "sh", "css", "json"];

        if (codeExtensions.includes(extension)) {
            // It's a code file, delegate to the 'code' command/editor
            await CommandExecutor._ensureCommandLoaded("code");
            // Use an empty string for path if it's null to avoid issues
            return CommandExecutor.processSingleCommand(`code "${filePath || ''}"`, {
                isInteractive: true,
            });
        }

        // Ensure Editor modules are loaded before using them
        if (typeof EditorManager === 'undefined') {
            return ErrorHandler.createError(
                "edit: The editor application modules are not loaded."
            );
        }

        const fileContent = node ? node.content || "" : "";

        // Launch the Editor application
        AppLayerManager.show(new EditorManager(), {
            filePath: filePath,
            fileContent,
            dependencies: dependencies
        });

        return ErrorHandler.createSuccess("");
    }
}