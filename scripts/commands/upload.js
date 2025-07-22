// scripts/commands/upload.js
class UploadCommand extends Command {
    constructor() {
        super({
            commandName: "upload",
            description:
                "Uploads a file from your local machine to the current OopisOS directory.",
            helpText: `Usage: upload
      Initiate a file upload from your local machine.
      DESCRIPTION
      The upload command opens your computer's native file selection
      dialog, allowing you to choose a file to upload into the OopisOS
      virtual file system.
      The selected file will be placed in the current working directory.
      If a file with the same name already exists, it will be overwritten.
      NOTE: This command is only available in interactive sessions.`,
            validations: {
                args: {
                    exact: 0
                }
            },
        });
    }

    async coreLogic(context) {
        const { options, currentUser, dependencies } = context;
        const {
            FileSystemManager,
            UserManager,
            OutputManager,
            Config,
            ErrorHandler,
            Utils,
        } = dependencies;

        if (!options.isInteractive) {
            return ErrorHandler.createError(
                "upload: Can only be run in interactive mode."
            );
        }

        const input = Utils.createElement("input", { type: "file" });
        document.body.appendChild(input);

        return new Promise((resolve) => {
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve(
                        ErrorHandler.createSuccess(Config.MESSAGES.UPLOAD_CANCELLED)
                    );
                    document.body.removeChild(input);
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (event) => {
                    const content = event.target.result;
                    const currentPath = FileSystemManager.getCurrentPath();
                    const newFilePath = `${currentPath === "/" ? "" : currentPath}/${file.name}`;
                    const primaryGroup =
                        UserManager.getPrimaryGroupForUser(currentUser);

                    const saveResult = await FileSystemManager.createOrUpdateFile(
                        newFilePath,
                        content,
                        { currentUser, primaryGroup }
                    );

                    if (saveResult.success) {
                        await OutputManager.appendToOutput(
                            `${Config.MESSAGES.UPLOAD_SUCCESS_PREFIX}'${file.name}'.`
                        );
                        resolve(ErrorHandler.createSuccess("", { stateModified: true }));
                    } else {
                        resolve(ErrorHandler.createError(`upload: ${saveResult.error}`));
                    }
                    document.body.removeChild(input);
                };

                reader.onerror = () => {
                    resolve(
                        ErrorHandler.createError(
                            `upload: Error reading file '${file.name}'.`
                        )
                    );
                    document.body.removeChild(input);
                };

                reader.readAsText(file);
            };

            input.click();
        });
    }
}