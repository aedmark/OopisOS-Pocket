// scripts/commands/visudo.js
(() => {
  "use strict";

  const visudoCommandDefinition = {
    commandName: "visudo",
    description: "Safely edits the /etc/sudoers file.",
    helpText: `Usage: visudo

Edit the sudoers file with a lock to prevent simultaneous edits.

DESCRIPTION
       visudo edits the sudoers file in a safe fashion. It sets an edit lock
       on the sudoers file to prevent multiple simultaneous edits.

       The sudoers file controls which users can run commands as root.
       Incorrect syntax in this file can lock all users out of sudo.

SYNTAX
       The /etc/sudoers file uses a simple, space-separated format.
       Lines starting with '#' are comments.

       RULE FORMAT:
       <who>    <permission>

       <who>:
           A username (e.g., guest)
           A group name, prefixed with '%' (e.g., %developers)

       <permission>:
           ALL             - The user/group can run all commands.
           (command_name)  - The user/group can only run the specified command.

       EXAMPLES
           # Give the user 'admin' full root privileges
           admin    ALL

           # Allow anyone in the 'testers' group to run the 'reboot' command
           %testers reboot

           # Set the password timeout to 30 minutes (0 to always ask)
           Defaults timestamp_timeout=30

PERMISSIONS
       Only the superuser (root) can run visudo.`,
    argValidation: {
      exact: 0,
    },
    coreLogic: async (context) => {
      const { currentUser, options, dependencies } = context;
      const { ErrorHandler, Config, FileSystemManager, UserManager, SudoManager, AppLayerManager, Editor, OutputManager } = dependencies;

      try {
        if (currentUser !== "root") {
          return ErrorHandler.createError(
              "visudo: only root can run this command."
          );
        }

        if (!options.isInteractive) {
          return ErrorHandler.createError(
              "visudo: can only be run in interactive mode."
          );
        }

        const sudoersPath = Config.SUDO.SUDOERS_PATH;
        let sudoersNode = FileSystemManager.getNodeByPath(sudoersPath);

        if (!sudoersNode) {
          const primaryGroup = UserManager.getPrimaryGroupForUser("root");
          const content =
              "# /etc/sudoers\\n#\\n# This file controls who can run what as root.\\n\\nroot    ALL\\n%root   ALL\\nDefaults timestamp_timeout=15\\n";
          const saveResult = await FileSystemManager.createOrUpdateFile(
              sudoersPath,
              content,
              { currentUser: "root", primaryGroup }
          );
          if (!saveResult.success) {
            return ErrorHandler.createError(
                "visudo: failed to create /etc/sudoers file."
            );
          }
          const fsSaveResult = await FileSystemManager.save();
          if (!fsSaveResult.success) {
            return ErrorHandler.createError(
                "visudo: failed to save /etc/sudoers file."
            );
          }
          sudoersNode = FileSystemManager.getNodeByPath(sudoersPath);
        }

        const onSudoersSave = async (filePath) => {
          const node = FileSystemManager.getNodeByPath(filePath);
          if (node) {
            node.mode = 0o440;
            node.owner = "root";
            node.group = "root";
            await FileSystemManager.save();
            SudoManager.invalidateSudoersCache();
            await OutputManager.appendToOutput(
                "visudo: /etc/sudoers secured and cache invalidated.",
                { typeClass: Config.CSS_CLASSES.SUCCESS_MSG }
            );
          } else {
            await OutputManager.appendToOutput(
                "visudo: CRITICAL - Could not find sudoers file after save to apply security.",
                { typeClass: Config.CSS_CLASSES.ERROR_MSG }
            );
          }
        };

        AppLayerManager.show(Editor, {
          filePath: sudoersPath,
          fileContent: sudoersNode.content,
          onSaveCallback: onSudoersSave,
          dependencies: dependencies
        });

        return ErrorHandler.createSuccess(
            `Opening /etc/sudoers. Please be careful.`
        );
      } catch (e) {
        return ErrorHandler.createError(
            `visudo: An unexpected error occurred: ${e.message}`
        );
      }
    },
  };
  CommandRegistry.register(visudoCommandDefinition);
})();