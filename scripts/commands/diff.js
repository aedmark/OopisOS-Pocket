// scripts/commands/diff.js
window.DiffCommand = class DiffCommand extends Command {
  constructor() {
    super({
      commandName: "diff",
      description: "Compares two files line by line.",
      helpText: `Usage: diff <file1> <file2>
      Compare two files line by line.
      DESCRIPTION
      The diff command analyzes two files and prints the lines that are
      different.
      The output format uses the following prefixes:
      <      A line that is in <file1> but not in <file2>.
      >      A line that is in <file2> but not in <file1>.
      (a space) A line that is common to both files (context).
      EXAMPLES
      diff original.txt updated.txt
      Shows the differences between the two text text files.`,
      completionType: "paths",
      validations: {
        args: {
          exact: 2,
          error: "Usage: diff <file1> <file2>"
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
    const { validatedPaths, dependencies } = context;
    const { DiffUtils, ErrorHandler } = dependencies;
    const file1Node = validatedPaths[0].node;
    const file2Node = validatedPaths[1].node;

    const diffResult = DiffUtils.compare(
        file1Node.content || "",
        file2Node.content || ""
    );

    return ErrorHandler.createSuccess(diffResult);
  }
}