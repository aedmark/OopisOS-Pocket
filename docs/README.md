# OopisOS v4.6: Your Digital City Hall!

```
   /$$$$$$                      /$$            /$$$$$$   /$$$$$$
 /$$__  $$                    |__/           /$$__  $$ /$$__  $$
| $$  \ $$  /$$$$$$   /$$$$$$  /$$  /$$$$$$$| $$  \ $$| $$  \__/
| $$  | $$ /$$__  $$ /$$__  $$| $$ /$$_____/| $$  | $$|  $$$$$$
| $$  | $$| $$  \ $$| $$  \ $$| $$|  $$$$$$ | $$  | $$ \____  $$
| $$  | $$| $$  | $$| $$  | $$| $$ \____  $$| $$  | $$ /$$  \ $$
|  $$$$$$/|  $$$$$$/| $$$$$$$/| $$ /$$$$$$$/|  $$$$$$/|  $$$$$$/
 \______/  \______/ | $$____/ |__/|_______/  \______/  \______/
                    | $$
                    | $$
                    |__/  A Browser-Based OS Simulation
```

Welcome, you wonderful, hardworking citizen, to OopisOS! Think of this not just as an operating system, but as your own personal, digital municipality. It’s a place for you to build, create, and explore, all from the privacy and comfort of your own computer. We run on a platform of pure, unadulterated public service, and our mission is to provide you with the best tools to make your digital life amazing.

And the best part? All your data stays with YOU. This is your town, your files, your world.

---

## Town Hall Bulletin: What's New in Version 4.6!

This is HUGE! We have just passed a major initiative to bring a powerful, friendly, and frankly amazing AI toolkit into the heart of OopisOS. It's our "Friendly Neighborhood LLM" program!

- **The Gemini Gateway Program (`gemini` command):** We've opened up our AI services to everyone! You can now connect to local AI models like Ollama right from the terminal, or use the default cloud provider for some seriously heavy-duty, tool-using AI assistance. It’s like having a whole team of City Hall interns ready to help, but they actually know what they’re doing.

- **Smarter Civil Servants (`chidi` command):** Our AI librarian, Chidi, just got a major upgrade! You can now send lists of files directly to it using pipes, creating custom research packets on the fly! It’s like asking your librarian to analyze every book on gardening before you plant a single petunia.

- **New Community Centers:** We've built two brand-new facilities!

  - **The BASIC IDE (`basic`):** A beautiful, retro-inspired programming environment for all you classic coders out there.

  - **The Journal (`log`):** A personal, secure place to write down all your thoughts, plans, and brilliant ideas.

- **True Portability Initiative:** OopisOS is now a completely self-contained application, ready to go wherever you do. It's perfect for a flash drive, making it the ultimate "government-on-the-go" solution!


---

## OopisOS City Services: A Feature Overview

We offer a full range of services to make your digital life better!

#### **The City Council Chambers (Core Shell Experience)**

- **Advanced Terminal:** An amazing interactive command-line with history, tab completion, and even background processes (`&`) for multitasking!

- **Public Works Department (Piping & Redirection):** Connect commands with pipes (`|`) and redirect their output to files (`>` and `>>`). It's teamwork at its finest!

- **City Ordinances (Sequencing & Aliasing):** Run multiple commands in a row with `;` and create easy-to-remember shortcuts for your favorite long commands with `alias`.

- **Parks Department Signs (Environment Variables):** Keep track of important information with session variables using `set`, `unset`, and `$VAR`.


#### **The Citizen Registry & Security Detail (Multi-User Security)**

- **A Real Community:** Create users (`useradd`), form community groups (`groupadd`), and manage who belongs where (`usermod -aG`). It's all about bringing people together!

- **The City Manager's Office (`sudo`):** Execute important commands as the superuser (`root`) and manage permissions safely with `visudo`.

- **Zoning Laws (Unix-like Permissions):** Use `chmod` with simple 3-digit codes (like `755`) to control who can read, write, and execute files. It’s planning and organization at its best!

- **Property Deeds (`chown` & `chgrp`):** Easily change file ownership with `chown` and group ownership with `chgrp`.


#### **Public Facilities & Community Centers (File System & Apps)**

- **The Hall of Records (Persistent VFS):** A powerful and reliable virtual file system that saves everything, so your work is always there when you come back.

- **City Services:** A full suite of commands to manage your files, including `ls`, `find`, `tree`, `diff`, `mkdir`, `cp`, `mv`, `rm`, `zip`, and `unzip`.

- **Our Amazing Application Suite:**

  - `gemini`: Your AI copilot for everything from answering questions to helping you with your files.

  - `chidi`: The best AI librarian to help you analyze and understand your documents.

  - `basic`: An integrated development environment for the classic BASIC programming language.

  - `log`: Your own personal, secure, timestamped journal.

  - `edit`: A powerful text editor that knows what you're working on, with live Markdown preview!

  - `paint`: A wonderful art studio for creating character-based masterpieces.

  - `adventure`: A powerful engine to play and even create your own text adventure games.


---

## Get Involved: Join a Committee!

This is an open-source project, which means it's a community project! If you have ideas, find a problem, or want to help build the next great public park (or feature), please get involved!

To add a new command, just create a new file in `/scripts/commands/`, define its class and contract, and our amazing dynamic loader will do the rest.

### **The OopisOS Architectural Model**

The architecture of OopisOS is a masterclass in planning! It's all about being secure, organized, and persistent through a set of core, decoupled modules.

|Module|Responsibility|
|---|---|
|**`commexec.js`**|**The Command Executor.** The heart of the shell, this module orchestrates the entire command lifecycle, from parsing and preprocessing to execution, and manages complex features like piping, redirection, and background jobs.|
|**`command_base.js`**|**The Command Blueprint.** Defines the abstract `Command` class that all other commands extend. It handles all common logic for argument parsing, validation, and input stream handling, drastically simplifying the development of new commands.|
|**`command_registry.js`**|**The Command Encyclopedia.** A simple but vital module that acts as the central, authoritative list of all command objects that have been loaded into the system, enabling true decoupling.|
|**`app.js`**|**The Application Blueprint.** Defines the abstract `App` class that serves as the blueprint for all full-screen graphical applications, ensuring a consistent lifecycle (`enter`, `exit`) for predictable system management.|

Export to Sheets

### **Adding a New Command: The Class-Based Contract**

Every command in OopisOS is a class that extends the base `Command` class. This makes adding new commands a straightforward, declarative process.

**Step 1: Create the Command File**

Make a new file in `/scripts/commands/`. The filename must match the command name (e.g., `mycommand.js`).

**Step 2: Define the Command Class and Contract**

Create a class that extends `Command`. In the constructor, call `super()` with an object that defines your command's contract.

JavaScript

```
// scripts/commands/mycommand.js
window.MycommandCommand = class MycommandCommand extends Command {
  constructor() {
    super({
      commandName: "mycommand",
      flagDefinitions: [{ name: "force", short: "-f" }],
      argValidation: { min: 1 },
      // ... etc.
    });
  }

  async coreLogic(context) { /* ... */ }
};
```

**Step 3: Write the Core Logic**

Your `coreLogic` function receives a `context` object containing everything your command needs, including parsed arguments and system dependencies. By the time this code runs, all validations defined in your contract have already passed.

JavaScript

```
  async coreLogic(context) {
    const { args, flags, dependencies } = context;
    const { ErrorHandler, OutputManager } = dependencies;

    // Your command's logic goes here!
    OutputManager.appendToOutput("Execution complete.");

    return ErrorHandler.createSuccess();
  }
```

This design makes the system robust and easy to extend. It's hard to write an insecure command because the security is handled for you before your code even runs.