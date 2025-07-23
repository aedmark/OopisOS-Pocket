// scripts/commexec.js

class CommandExecutor {
  constructor() {
    this.backgroundProcessIdCounter = 0;
    this.activeJobs = {};
    this.commands = {};
    this.loadedScripts = new Set();
    this.dependencies = {};
  }

  setDependencies(dependencies) {
    this.dependencies = dependencies;
  }

  _loadScript(scriptPath) {
    if (this.loadedScripts.has(scriptPath)) {
      return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `./scripts/${scriptPath}`;
      script.onload = () => {
        this.loadedScripts.add(scriptPath);
        resolve(true);
      };
      script.onerror = () => {
        reject(new Error(`Failed to fetch script: ${scriptPath}`));
      };
      document.head.appendChild(script);
    });
  }

  async _ensureCommandLoaded(commandName) {
    const { Config, OutputManager, CommandRegistry } = this.dependencies;
    if (!commandName || typeof commandName !== "string") return null;

    // Check the local executor cache first
    if (this.commands[commandName]) return this.commands[commandName];

    // Check if the command is in the manifest
    if (!Config.COMMANDS_MANIFEST.includes(commandName)) {
      return null;
    }

    const commandScriptPath = `commands/${commandName}.js`;
    try {
      // Load the script file
      await this._loadScript(commandScriptPath);

      // Convert snake_case (like check_fail) to CamelCase (CheckFail)

      const className = commandName
          .split('_')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('') + 'Command';

      if (typeof window[className] === 'function' && !CommandRegistry.getCommands()[commandName]) {
        const commandInstance = new window[className]();
        CommandRegistry.register(commandInstance);
      }

      // Now, get the instance from the registry (it should be there now)
      const commandInstance = CommandRegistry.getCommands()[commandName];

      if (!commandInstance) {
        await OutputManager.appendToOutput(
            `Error: Script loaded but command '${commandName}' not found in registry.`,
            { typeClass: Config.CSS_CLASSES.ERROR_MSG }
        );
        return null;
      }

      const definition = commandInstance.definition;

      // Load dependencies for the command
      if (definition.dependencies && Array.isArray(definition.dependencies)) {
        for (const dep of definition.dependencies) {
          await this._loadScript(dep);
        }
      }

      // Cache the instance in the executor and return it
      this.commands[commandName] = commandInstance;
      return commandInstance;
    } catch (error) {
      await OutputManager.appendToOutput(
          `Error: Command '${commandName}' could not be loaded. ${error.message}`,
          { typeClass: Config.CSS_CLASSES.ERROR_MSG }
      );
      return null;
    }
  }

  _createCommandHandler(definition) {
    const handler = async (args, options) => {
      const { Utils, ErrorHandler, FileSystemManager, UserManager } = this.dependencies;
      const { flags, remainingArgs } = Utils.parseFlags(
          args,
          definition.flagDefinitions || []
      );
      const currentUser = UserManager.getCurrentUser().name;

      if (definition.validations) {
        if (definition.validations.args) {
          const argValidation = Utils.validateArguments(
              remainingArgs,
              definition.validations.args
          );
          if (!argValidation.isValid) {
            return ErrorHandler.createError(
                `${definition.commandName}: ${argValidation.errorDetail}`
            );
          }
        }

        if (definition.validations.paths) {
          const validatedPaths = [];
          for (const rule of definition.validations.paths) {
            const indices =
                rule.argIndex === "all"
                    ? remainingArgs.map((_, i) => i)
                    : [rule.argIndex];

            for (const index of indices) {
              if (index >= remainingArgs.length) {
                if (rule.options?.required !== false) {
                  return ErrorHandler.createError(
                      `${definition.commandName}: missing path argument.`
                  );
                }
                continue;
              }
              const pathArg = remainingArgs[index];
              const pathValidationResult = FileSystemManager.validatePath(
                  pathArg,
                  rule.options || {}
              );

              if (!pathValidationResult.success) {
                return ErrorHandler.createError(
                    `${definition.commandName}: ${pathValidationResult.error}`
                );
              }

              const { node, resolvedPath } = pathValidationResult.data;

              if (rule.permissionsOnParent) {
                const parentPath =
                    resolvedPath.substring(0, resolvedPath.lastIndexOf("/")) ||
                    "/";
                const parentValidation = FileSystemManager.validatePath(
                    parentPath,
                    { permissions: rule.permissionsOnParent }
                );
                if (!parentValidation.success) {
                  return ErrorHandler.createError(
                      `${definition.commandName}: ${parentValidation.error}`
                  );
                }
              }

              if (rule.options && rule.options.ownershipRequired && node) {
                if (!FileSystemManager.canUserModifyNode(node, currentUser)) {
                  return ErrorHandler.createError(
                      `${definition.commandName}: changing permissions of '${pathArg}': Operation not permitted`
                  );
                }
              }

              validatedPaths.push({
                arg: pathArg,
                node,
                resolvedPath,
              });
            }
          }
          options.validatedPaths = validatedPaths;
        }
      }

      // Create a new, temporary context for this specific command execution.
      const commandDependencies = { ...this.dependencies };

      // After dynamic loading, inject the application modules if they are declared in the command definition.
      if (definition.applicationModules && Array.isArray(definition.applicationModules)) {
        for (const moduleName of definition.applicationModules) {
          if (window[moduleName]) {
            // Add the dynamically loaded module (e.g., EditorManager) to the temporary dependency object.
            commandDependencies[moduleName] = window[moduleName];
          } else {
            // This is a crucial safety check.
            console.error(`Command '${definition.commandName}' declared a dependency on '${moduleName}', but it was not found on the window object after loading.`);
          }
        }
      }

      const command = new Command(definition);
      return command.execute(remainingArgs, options, commandDependencies);
    };
    handler.definition = definition;
    return handler;
  }

  getActiveJobs() {
    return this.activeJobs;
  }

  sendSignalToJob(jobId, signal) {
    const { ErrorHandler } = this.dependencies;
    const job = this.activeJobs[jobId];
    if (!job) {
      return ErrorHandler.createError(`Job ${jobId} not found.`);
    }

    switch (signal.toUpperCase()) {
      case 'KILL':
      case 'TERM':
        if (job.abortController) {
          job.abortController.abort("Killed by user command.");
          job.status = 'terminated';
        }
        break;
      case 'STOP':
        job.status = 'paused';
        break;
      case 'CONT':
        job.status = 'running';
        break;
      default:
        return ErrorHandler.createError(`Invalid signal '${signal}'.`);
    }

    return ErrorHandler.createSuccess(`Signal ${signal} sent to job ${jobId}.`);
  }


  async executeScript(lines, options = {}) {
    const { ErrorHandler, EnvironmentManager } = this.dependencies;

    // Create a new, sandboxed environment for the script
    EnvironmentManager.push();

    const scriptingContext = {
      isScripting: true,
      lines: lines,
      currentLineIndex: -1,
      args: options.args || [],
    };

    try {
      for (let i = 0; i < lines.length; i++) {
        scriptingContext.currentLineIndex = i;
        const line = lines[i].trim();
        if (line && !line.startsWith("#")) {
          const result = await this.processSingleCommand(line, {
            ...options,
            scriptingContext,
          });

          // Sync the loop counter with the script context, in case of jumps
          i = scriptingContext.currentLineIndex;

          if (!result.success) {
            // If a command fails in the script, we throw an error.
            // This will be caught by the try...catch in the 'run' command's coreLogic.
            throw new Error(`Error on line ${i + 1}: ${result.error}`);
          }
        }
      }
    } finally {
      // This 'finally' block ensures that the script's environment is ALWAYS
      // discarded, even if an error occurs during execution.
      EnvironmentManager.pop();
    }

    return ErrorHandler.createSuccess("Script finished successfully.");
  }

  async _executeCommandHandler(
      segment,
      execCtxOpts,
      stdinContent = null,
      signal
  ) {
    const { ErrorHandler } = this.dependencies;
    const commandName = segment.command?.toLowerCase();

    const cmdInstance = await this._ensureCommandLoaded(commandName);
    if (!cmdInstance) {
      return ErrorHandler.createError(`${commandName}: command not found`);
    }

    if (cmdInstance instanceof Command) {
      try {
        const definition = cmdInstance.definition;
        const commandDependencies = { ...this.dependencies };
        if (definition.applicationModules && Array.isArray(definition.applicationModules)) {
          for (const moduleName of definition.applicationModules) {
            if (window[moduleName]) {
              commandDependencies[moduleName] = window[moduleName];
            } else {
              console.error(`Command '${definition.commandName}' declared a dependency on '${moduleName}', but it was not found on the window object after loading.`);
            }
          }
        }
        return await cmdInstance.execute(segment.args, {
          ...execCtxOpts,
          stdinContent,
          signal,
        }, commandDependencies);
      } catch (e) {
        console.error(`Error in command handler for '${segment.command}':`, e);
        return ErrorHandler.createError(
            `${segment.command}: ${e.message || "Unknown error"}`
        );
      }
    } else if (segment.command) {
      return ErrorHandler.createError(`${segment.command}: command not found`);
    }

    return ErrorHandler.createSuccess("");
  }

  async _executePipeline(pipeline, options) {
    const { FileSystemManager, UserManager, OutputManager, Config, ErrorHandler, Utils } = this.dependencies;
    const { isInteractive, signal, scriptingContext, suppressOutput } = options;
    let currentStdin = null;
    let lastResult = ErrorHandler.createSuccess("");

    if (pipeline.inputRedirectFile) {
      const pathValidationResult = FileSystemManager.validatePath(
          pipeline.inputRedirectFile,
          { expectedType: "file" }
      );
      if (!pathValidationResult.success) {
        return pathValidationResult;
      }
      const { node } = pathValidationResult.data;
      if (
          !FileSystemManager.hasPermission(
              node,
              UserManager.getCurrentUser().name,
              "read"
          )
      ) {
        return ErrorHandler.createError(
            `cannot open '${pipeline.inputRedirectFile}' for reading: Permission denied`
        );
      }
      currentStdin = node.content || "";
    }

    if (
        typeof UserManager === "undefined" ||
        typeof UserManager.getCurrentUser !== "function"
    ) {
      const errorMsg =
          "FATAL: State corruption detected (UserManager is unavailable). Please refresh the page.";
      console.error(errorMsg);
      await OutputManager.appendToOutput(errorMsg, {
        typeClass: Config.CSS_CLASSES.ERROR_MSG,
      });
      return ErrorHandler.createError(errorMsg);
    }
    const user = UserManager.getCurrentUser().name;
    const nowISO = new Date().toISOString();
    for (let i = 0; i < pipeline.segments.length; i++) {
      const segment = pipeline.segments[i];
      const execOptions = { isInteractive, scriptingContext };
      if (pipeline.isBackground) {
        const job = this.activeJobs[pipeline.jobId];
        while (job && job.status === 'paused') {
          await new Promise(resolve => setTimeout(resolve, 500)); // check every 500ms
        }
        execOptions.jobId = pipeline.jobId;
      }
      lastResult = await this._executeCommandHandler(
          segment,
          execOptions,
          currentStdin,
          signal
      );
      if (!lastResult) {
        const err = `Critical: Command handler for '${segment.command}' returned an undefined result.`;
        console.error(err, "Pipeline:", pipeline, "Segment:", segment);
        lastResult = ErrorHandler.createError(err);
      }

      if (scriptingContext?.waitingForInput) {
        return ErrorHandler.createSuccess("");
      }

      if (lastResult.success) {
        if (lastResult.stateModified) {
          const saveResult = await FileSystemManager.save();
          if (!saveResult.success) {
            return ErrorHandler.createError(
                `CRITICAL: Failed to save file system state: ${saveResult.error}`
            );
          }
        }

        if (lastResult.effect === "clear_screen") {
          OutputManager.clearOutput();
        } else if (lastResult.effect === "backup") {
          const { content, fileName } = lastResult.effectData;
          const blob = new Blob([content], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = Utils.createElement("a", { href: url, download: fileName });
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        currentStdin = lastResult.data;
      } else {
        const err = `${Config.MESSAGES.PIPELINE_ERROR_PREFIX}'${segment.command}': ${lastResult.error || "Unknown"}`;
        if (!pipeline.isBackground) {
          await OutputManager.appendToOutput(err, {
            typeClass: Config.CSS_CLASSES.ERROR_MSG,
          });
        } else {
          console.log(`Background job pipeline error: ${err}`);
        }
        return lastResult;
      }
    }
    if (pipeline.redirection && lastResult.success) {
      const { type: redirType, file: redirFile } = pipeline.redirection;
      const outputToRedir = lastResult.data || "";

      const redirValResult = FileSystemManager.validatePath(redirFile, {
        allowMissing: true,
        disallowRoot: true,
        defaultToCurrentIfEmpty: false,
      });

      if (!redirValResult.success && !(redirValResult.data?.node === null)) {
        if (!pipeline.isBackground)
          await OutputManager.appendToOutput(redirValResult.error, {
            typeClass: Config.CSS_CLASSES.ERROR_MSG,
          });
        return redirValResult;
      }
      const { resolvedPath: absRedirPath } = redirValResult.data;
      const pDirRes =
          FileSystemManager.createParentDirectoriesIfNeeded(absRedirPath);
      if (!pDirRes.success) {
        if (!pipeline.isBackground)
          await OutputManager.appendToOutput(
              `Redir err: ${pDirRes.error}`,
              {
                typeClass: Config.CSS_CLASSES.ERROR_MSG,
              }
          );
        return pDirRes;
      }
      const finalParentDirPath =
          absRedirPath.substring(
              0,
              absRedirPath.lastIndexOf(Config.FILESYSTEM.PATH_SEPARATOR)
          ) || Config.FILESYSTEM.ROOT_PATH;
      const finalParentNodeForFile =
          FileSystemManager.getNodeByPath(finalParentDirPath);
      if (!finalParentNodeForFile) {
        const errorMsg = `Redir err: critical internal error, parent dir '${finalParentDirPath}' for file write not found.`;
        if (!pipeline.isBackground)
          await OutputManager.appendToOutput(errorMsg, {
            typeClass: Config.CSS_CLASSES.ERROR_MSG,
          });
        return ErrorHandler.createError(
            `parent dir '${finalParentDirPath}' for file write not found (internal)`
        );
      }

      const existingNode = FileSystemManager.getNodeByPath(absRedirPath);
      if (
          existingNode &&
          existingNode.type === Config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE
      ) {
        const errorMsg = `Redir err: '${redirFile}' is dir.`;
        if (!pipeline.isBackground)
          await OutputManager.appendToOutput(errorMsg, {
            typeClass: Config.CSS_CLASSES.ERROR_MSG,
          });
        return ErrorHandler.createError(`'${redirFile}' is dir.`);
      }
      if (
          existingNode &&
          !FileSystemManager.hasPermission(existingNode, user, "write")
      ) {
        const errorMsg = `Redir err: no write to '${redirFile}'${Config.MESSAGES.PERMISSION_DENIED_SUFFIX}`;
        if (!pipeline.isBackground)
          await OutputManager.appendToOutput(errorMsg, {
            typeClass: Config.CSS_CLASSES.ERROR_MSG,
          });
        return ErrorHandler.createError(`no write to '${redirFile}'`);
      }
      if (
          !existingNode &&
          !FileSystemManager.hasPermission(finalParentNodeForFile, user, "write")
      ) {
        const errorMsg = `Redir err: no create in '${finalParentDirPath}'${Config.MESSAGES.PERMISSION_DENIED_SUFFIX}`;
        if (!pipeline.isBackground)
          await OutputManager.appendToOutput(errorMsg, {
            typeClass: Config.CSS_CLASSES.ERROR_MSG,
          });
        return ErrorHandler.createError(`no create in '${finalParentDirPath}'`);
      }

      let contentToWrite = outputToRedir;
      if (redirType === "append" && existingNode) {
        const existingContent = existingNode.content || "";
        contentToWrite = existingContent + outputToRedir;
      }

      const saveResult = await FileSystemManager.createOrUpdateFile(
          absRedirPath,
          contentToWrite,
          {
            currentUser: user,
            primaryGroup: UserManager.getPrimaryGroupForUser(user),
          }
      );

      if (!saveResult.success) {
        if (!pipeline.isBackground) {
          await OutputManager.appendToOutput(
              `Redir err: ${saveResult.error}`,
              { typeClass: Config.CSS_CLASSES.ERROR_MSG }
          );
        }
        return saveResult;
      }

      FileSystemManager._updateNodeAndParentMtime(absRedirPath, nowISO);
      const fsSaveResult = await FileSystemManager.save();
      if (!fsSaveResult.success) {
        if (!pipeline.isBackground)
          await OutputManager.appendToOutput(
              `Failed to save redir to '${redirFile}': ${fsSaveResult.error}`,
              {
                typeClass: Config.CSS_CLASSES.ERROR_MSG,
              }
          );
        return ErrorHandler.createError(
            `save redir fail: ${fsSaveResult.error}`
        );
      }
      lastResult.data = "";
    }

    if (
        !pipeline.redirection &&
        lastResult.success &&
        lastResult.data !== null &&
        lastResult.data !== undefined &&
        !lastResult.suppressNewline
    ) {
      if (pipeline.isBackground) {
        if (lastResult.data) {
          await OutputManager.appendToOutput(
              `${Config.MESSAGES.BACKGROUND_PROCESS_OUTPUT_SUPPRESSED} (Job ${pipeline.jobId})`,
              {
                typeClass: Config.CSS_CLASSES.CONSOLE_LOG_MSG,
                isBackground: true,
              }
          );
        }
      } else {
        if (lastResult.data && !suppressOutput) {
          if (typeof lastResult.data === "string") {
            lastResult.data = lastResult.data.replace(/\\n/g, "\n");
          }
          await OutputManager.appendToOutput(lastResult.data, {
            typeClass: lastResult.messageType || null,
          });
        }
      }
    }
    return lastResult;
  }

  async _preprocessCommandString(rawCommandText, scriptingContext = null) {
    const { EnvironmentManager, AliasManager } = this.dependencies;
    let commandToProcess = rawCommandText.trim();

    // Handle `VAR=$(...)` style command substitution and assignment
    const assignmentSubstitutionRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)=\$\(([^)]+)\)$/;
    const assignmentMatch = commandToProcess.match(assignmentSubstitutionRegex);

    if (assignmentMatch) {
      const varName = assignmentMatch[1];
      const subCommand = assignmentMatch[2];
      const result = await this.processSingleCommand(subCommand, { isInteractive: false, suppressOutput: true });
      const output = result.success ? (result.output || '').trim().replace(/\n/g, ' ') : '';
      EnvironmentManager.set(varName, output);
      return ""; // Return an empty string to prevent further execution
    }

    // Handle general command substitution (inline)
    const commandSubstitutionRegex = /\$\(([^)]+)\)/g;
    let inlineMatch;
    while ((inlineMatch = commandSubstitutionRegex.exec(commandToProcess)) !== null) {
      const subCommand = inlineMatch[1];
      const result = await this.processSingleCommand(subCommand, { isInteractive: false, suppressOutput: true });
      const output = result.success ? (result.output || '').trim().replace(/\n/g, ' ') : '';
      commandToProcess = commandToProcess.replace(inlineMatch[0], output);
    }

    let inQuote = null;
    let commentIndex = -1;

    for (let i = 0; i < commandToProcess.length; i++) {
      const char = commandToProcess[i];

      if (inQuote) {
        if (char === inQuote) {
          inQuote = null; // Exit quote
        }
      } else {
        if (char === '"' || char === "'") {
          inQuote = char; // Enter quote
        } else if (char === '#' && (i === 0 || /\s/.test(commandToProcess[i-1]))) {
          commentIndex = i;
          break; // Found comment start, no need to look further
        }
      }
    }

    if (commentIndex > -1) {
      commandToProcess = commandToProcess.substring(0, commentIndex).trim();
    }

    if (!commandToProcess) {
      return "";
    }

    if (scriptingContext && scriptingContext.args) {
      const scriptArgs = scriptingContext.args;
      commandToProcess = commandToProcess.replace(/\$@/g, scriptArgs.join(" "));
      commandToProcess = commandToProcess.replace(/\$#/g, scriptArgs.length);
      scriptArgs.forEach((arg, i) => {
        const regex = new RegExp(`\\$${i + 1}`, "g");
        commandToProcess = commandToProcess.replace(regex, arg);
      });
    }

    commandToProcess = commandToProcess.replace(
        /\$([a-zA-Z_][a-zA-Z0-9_]*)|\$\{([a-zA-Z_][a-zA-Z0-9_]*)}/g,
        (match, var1, var2) => {
          const varName = var1 || var2;
          return EnvironmentManager.get(varName);
        }
    );

    const aliasResult = AliasManager.resolveAlias(commandToProcess);
    if (aliasResult.error) {
      throw new Error(aliasResult.error);
    }

    return aliasResult.newCommand;
  }

  async _finalizeInteractiveModeUI(originalCommandText) {
    const { TerminalUI, AppLayerManager, HistoryManager } = this.dependencies;
    TerminalUI.clearInput();
    TerminalUI.updatePrompt();
    if (!AppLayerManager.isActive()) {
      TerminalUI.showInputLine();
      TerminalUI.setInputState(true);
      TerminalUI.focusInput();
    }
    TerminalUI.scrollOutputToEnd();

    if (
        !TerminalUI.getIsNavigatingHistory() &&
        originalCommandText.trim()
    ) {
      HistoryManager.resetIndex();
    }
    TerminalUI.setIsNavigatingHistory(false);
  }

  async processSingleCommand(rawCommandText, options = {}) {
    const {
      isInteractive = true,
      scriptingContext = null,
      suppressOutput = false
    } = options;
    const {
      ModalManager,
      OutputManager,
      TerminalUI,
      AppLayerManager,
      HistoryManager,
      Config,
      ErrorHandler,
      Lexer,
      Parser,
      MessageBusManager
    } = this.dependencies;

    if (
        options.scriptingContext &&
        isInteractive &&
        !ModalManager.isAwaiting()
    ) {
      await OutputManager.appendToOutput(
          "Script execution in progress. Input suspended.",
          { typeClass: Config.CSS_CLASSES.WARNING_MSG }
      );
      return ErrorHandler.createError("Script execution in progress.");
    }
    if (ModalManager.isAwaiting()) {
      await ModalManager.handleTerminalInput(
          TerminalUI.getCurrentInputValue()
      );
      if (isInteractive) await this._finalizeInteractiveModeUI(rawCommandText);
      return ErrorHandler.createSuccess("");
    }

    if (AppLayerManager.isActive() && options.isInteractive) {
      return ErrorHandler.createSuccess("");
    }

    let commandToParse;
    try {
      commandToParse = await this._preprocessCommandString(
          rawCommandText,
          scriptingContext
      );
    } catch (e) {
      await OutputManager.appendToOutput(e.message, {
        typeClass: Config.CSS_CLASSES.ERROR_MSG,
      });
      if (isInteractive) await this._finalizeInteractiveModeUI(rawCommandText);
      return ErrorHandler.createError(e.message);
    }

    const cmdToEcho = rawCommandText.trim();
    if (isInteractive && !scriptingContext) {
      TerminalUI.hideInputLine();
      const prompt = TerminalUI.getPromptText();
      await OutputManager.appendToOutput(`${prompt}${cmdToEcho}`);
    }
    if (cmdToEcho === "") {
      if (isInteractive) await this._finalizeInteractiveModeUI(rawCommandText);
      return ErrorHandler.createSuccess("");
    }
    if (isInteractive) HistoryManager.add(cmdToEcho);
    if (isInteractive && !TerminalUI.getIsNavigatingHistory())
      HistoryManager.resetIndex();

    let commandSequence;
    try {
      commandSequence = new Parser(
          new Lexer(commandToParse, this.dependencies).tokenize(),
          this.dependencies
      ).parse();
    } catch (e) {
      await OutputManager.appendToOutput(
          e.message || "Command parse error.",
          { typeClass: Config.CSS_CLASSES.ERROR_MSG }
      );
      if (isInteractive) await this._finalizeInteractiveModeUI(rawCommandText);
      return ErrorHandler.createError(e.message || "Command parse error.");
    }

    let lastPipelineSuccess = true;
    let finalResult = ErrorHandler.createSuccess("");

    for (let i = 0; i < commandSequence.length; i++) {
      const { pipeline, operator } = commandSequence[i];

      if (i > 0) {
        const prevOperator = commandSequence[i - 1].operator;
        if (prevOperator === "&&" && !lastPipelineSuccess) continue;
        if (prevOperator === "||" && lastPipelineSuccess) continue;
      }

      let result;
      if (operator === "&") {
        pipeline.isBackground = true;
        const jobId = ++this.backgroundProcessIdCounter;
        pipeline.jobId = jobId;
        MessageBusManager.registerJob(jobId);
        const abortController = new AbortController();

        // Create the job object synchronously
        const job = {
          id: jobId,
          command: cmdToEcho,
          abortController,
          promise: null,
          status: 'running',
        };
        this.activeJobs[jobId] = job;

        const jobPromise = new Promise(resolve => {
          setTimeout(() => {
            this._executePipeline(pipeline, {
              isInteractive: false,
              signal: abortController.signal,
              scriptingContext,
              suppressOutput: true,
            }).then(resolve);
          }, 0);
        });

        job.promise = jobPromise;

        jobPromise.finally(() => {
          delete this.activeJobs[jobId];
          MessageBusManager.unregisterJob(jobId);
        }).then((bgResult) => {
          const statusMsg = `[Job ${jobId} ${bgResult.success ? "finished" : "finished with error"}${bgResult.success ? "" : `: ${bgResult.error || "Unknown error"}`}]`;
          OutputManager.appendToOutput(statusMsg, {
            typeClass: bgResult.success
                ? Config.CSS_CLASSES.CONSOLE_LOG_MSG
                : Config.CSS_CLASSES.WARNING_MSG,
            isBackground: true,
          });
        });

        await OutputManager.appendToOutput(
            `${Config.MESSAGES.BACKGROUND_PROCESS_STARTED_PREFIX}${jobId}${Config.MESSAGES.BACKGROUND_PROCESS_STARTED_SUFFIX}`,
            { typeClass: Config.CSS_CLASSES.CONSOLE_LOG_MSG }
        );

        result = ErrorHandler.createSuccess();
      } else {
        result = await this._executePipeline(pipeline, {
          isInteractive,
          signal: null,
          scriptingContext,
          suppressOutput,
        });
      }

      if (!result) {
        const err = `Critical: Pipeline execution returned an undefined result.`;
        console.error(err, "Pipeline:", pipeline);
        result = ErrorHandler.createError(err);
      }

      lastPipelineSuccess = result.success;
      finalResult = result;

      if (!lastPipelineSuccess && (!operator || operator === ";")) {
        break;
      }
    }

    if (isInteractive && !scriptingContext) {
      await this._finalizeInteractiveModeUI(rawCommandText);
    }

    return {
      success: finalResult.success,
      output: finalResult.success ? finalResult.data : null,
      error: !finalResult.success ? finalResult.error : null,
    };
  }

  getCommands() {
    return this.commands;
  }
}