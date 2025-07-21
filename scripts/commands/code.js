// scripts/commands/code.js
(() => {
  "use strict";

  const codeCommandDefinition = {
    commandName: "code",
    dependencies: ["apps/code/code_ui.js", "apps/code/code_manager.js"],
    applicationModules: ["CodeManager", "CodeUI", "App"],
    description: "A simple, lightweight code editor with syntax highlighting.",
    helpText: `Usage: code [filepath]

Launches the OopisOS code editor.

DESCRIPTION
        The 'code' command opens a simple modal editor designed for viewing
        and editing code files. It provides basic JavaScript syntax highlighting.

        - If a filepath is provided, it opens that file.
        - If the file does not exist, a new empty file will be created with that name upon saving.
        - If no filepath is given, it opens a new, untitled document.`,
    completionType: "paths",
    argValidation: {
      max: 1,
      error: "Usage: code [filepath]",
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
    coreLogic: async (context) => {
      const { args, options, validatedPaths, dependencies } = context;
      const { ErrorHandler, Utils, CommandExecutor, AppLayerManager, CodeManager, CodeUI, App } = dependencies;

      if (!options.isInteractive) {
        return ErrorHandler.createError(
            "code: Can only be run in interactive mode."
        );
      }

      const hasFileArgument = args.length > 0 && validatedPaths.length > 0;
      const filePath = hasFileArgument ? validatedPaths[0].resolvedPath : null;
      const node = hasFileArgument ? validatedPaths[0].node : null;

      const extension = Utils.getFileExtension(filePath);
      const documentExtensions = ["md", "html"];

      if (documentExtensions.includes(extension)) {
        await CommandExecutor._ensureCommandLoaded("edit");
        return CommandExecutor.processSingleCommand(`edit "${filePath}"`, {
          isInteractive: true,
        });
      }

      if (
          typeof CodeManager === "undefined" ||
          typeof CodeUI === "undefined" ||
          typeof App === "undefined"
      ) {
        return ErrorHandler.createError(
            "code: The code editor application modules are not loaded."
        );
      }

      const fileContent = node ? node.content || "" : "";
      AppLayerManager.show(new CodeManager(), {
        filePath: filePath,
        fileContent,
        dependencies
      });

      return ErrorHandler.createSuccess("");
    },
  };
  CommandRegistry.register(codeCommandDefinition);
})();