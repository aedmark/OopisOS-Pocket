// scripts/commands/remix.js
window.RemixCommand = class RemixCommand extends Command {
    constructor() {
        super({
            commandName: "remix",
            description: "Synthesizes a new article from two source documents using AI.",
            helpText: `Usage: remix <file1> <file2>
      Combines and summarizes two documents into a unique article.
      DESCRIPTION
      The remix command uses the AI Manager to read two source files,
      understand the core ideas of each, and then generate a new,
      summarized article that synthesizes the information from both.
      It's a powerful tool for combining related topics or creating
      summaries of comparative works.
      EXAMPLES
      remix /docs/api/permissions.md /docs/api/best_practices.md
      Creates a new article about the best practices for using the
      OopisOS permission model.`,
            completionType: "paths",
            validations: {
                args: {
                    exact: 2,
                    error: "Usage: remix <file1> <file2>"
                },
                paths: [{
                    argIndex: 0,
                    options: {
                        expectedType: 'file',
                        permissions: ['read']
                    }
                }, {
                    argIndex: 1,
                    options: {
                        expectedType: 'file',
                        permissions: ['read']
                    }
                }]
            },
        });
    }

    async coreLogic(context) {
        const { args, options, validatedPaths, dependencies } = context;
        const { ErrorHandler, AIManager, OutputManager, Config, StorageManager } = dependencies;

        const file1Node = validatedPaths[0].node;
        const file1Path = validatedPaths[0].arg;
        const file2Node = validatedPaths[1].node;
        const file2Path = validatedPaths[1].arg;

        const file1Content = file1Node.content || "";
        const file2Content = file2Node.content || "";

        if (!file1Content.trim() || !file2Content.trim()) {
            return ErrorHandler.createError("remix: One or both input files are empty.");
        }

        const userPrompt = `Please synthesize the following two documents into a single, cohesive article. The article should blend the key ideas from both sources into a unique summary formatted in Markdown with paragraphs separated by double newlines.

--- DOCUMENT 1: ${file1Path} ---
${file1Content}
--- END DOCUMENT 1 ---

--- DOCUMENT 2: ${file2Path} ---
${file2Content}
--- END DOCUMENT 2 ---`;

        await OutputManager.appendToOutput("Remixing documents... The AI is pondering.", {
            typeClass: Config.CSS_CLASSES.CONSOLE_LOG_MSG,
        });

        const apiKeyResult = await AIManager.getApiKey("gemini", { isInteractive: true, dependencies });
        if (!apiKeyResult.success) {
            return ErrorHandler.createError(`remix: ${apiKeyResult.error}`);
        }
        const apiKey = apiKeyResult.data.key;

        const llmResult = await AIManager.callLlmApi(
            "gemini",
            null,
            [{ role: "user", parts: [{ text: userPrompt }] }],
            apiKey
        );

        if (llmResult.success) {
            const finalArticle = llmResult.answer;

            // Convert Markdown to sanitized HTML
            const articleHtml = DOMPurify.sanitize(marked.parse(finalArticle));
            const headerHtml = `<h3>Remix of ${file1Path} & ${file2Path}</h3>`;

            return ErrorHandler.createSuccess(
                headerHtml + articleHtml,
                { asBlock: true, messageType: 'prose-output' } // Use our new options
            );
        } else {
            if (llmResult.error === "INVALID_API_KEY") {
                StorageManager.removeItem(Config.STORAGE_KEYS.GEMINI_API_KEY);
                return ErrorHandler.createError("remix: Invalid API Key. The key has been removed. Please try again.");
            }
            return ErrorHandler.createError(`remix: The AI failed to process the documents. Reason: ${llmResult.error}`);
        }
    }
}