// scripts/commands/ps.js
window.PsCommand = class PsCommand extends Command {
    constructor() {
        super({
            commandName: "ps",
            description: "Reports a snapshot of the current background processes.",
            helpText: `Usage: ps
      Report a snapshot of current background processes.
      DESCRIPTION
      The ps command displays information about active background jobs
      started with the '&' operator.
      The output includes:
      PID     The unique process ID for the job.
      COMMAND The command that was executed.
      Use 'kill <PID>' to terminate a background job.`,
            validations: {
                args: {
                    exact: 0
                }
            },
        });
    }

    async coreLogic(context) {
        const { dependencies } = context;
        const { CommandExecutor, ErrorHandler } = dependencies;
        const jobs = CommandExecutor.listJobs();

        if (Object.keys(jobs).length === 0) {
            return ErrorHandler.createSuccess("");
        }

        let output = "  PID  COMMAND\n";
        for (const pid in jobs) {
            const command = jobs[pid];
            output += `  ${String(pid).padEnd(4)} ${command}\n`;
        }

        return ErrorHandler.createSuccess(output.trim());
    }
}