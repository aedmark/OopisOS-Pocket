// scripts/commands/chgrp.js
class ChgrpCommand extends Command {
    constructor() {
        super({
            commandName: "chgrp",
            description: "Changes the group ownership of a file or directory.",
            helpText: `Usage: chgrp <group> <path>
      Change the group ownership of a file or directory.
      DESCRIPTION
      The chgrp command changes the group of the file or directory
      specified by <path> to <group>.
      Group ownership is a fundamental part of the OopisOS security model.
      File permissions can be set to allow or deny access based on whether
      a user is a member of a file's group. Use the 'ls -l' command to
      view file and directory ownership.
      EXAMPLES
      chgrp developers /home/Guest/project
      Changes the group of the 'project' directory to 'developers'.
      PERMISSIONS
      To change the group of a file, you must be the owner of the file
      or the superuser (root).`,
            completionType: "groups",
            validations: {
                args: { exact: 2, error: "Usage: chgrp <groupname> <path>" },
                paths: [
                    {
                        argIndex: 1,
                        options: {
                            ownershipRequired: true,
                        }
                    },
                ],
            },
        });
    }

    async coreLogic(context) {
        const { args, validatedPaths, dependencies } = context;
        const { GroupManager, ErrorHandler } = dependencies;
        const groupName = args[0];
        const { node } = validatedPaths[0];

        if (!GroupManager.groupExists(groupName)) {
            return ErrorHandler.createError(
                `chgrp: invalid group: '${groupName}'`
            );
        }

        node.group = groupName;
        node.mtime = new Date().toISOString();

        return ErrorHandler.createSuccess("", { stateModified: true });
    }
}