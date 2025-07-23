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

## Town Hall Bulletin: What's New in Version 4.6!

This is HUGE! We have just passed a major initiative to bring a powerful, friendly, and frankly amazing AI toolkit into the heart of OopisOS. It's our "Friendly Neighborhood LLM" program!

- **The Gemini Gateway Program (`gemini` command):** We've opened up our AI services to everyone! You can now connect to local AI models like Ollama right from the terminal, or use the default cloud provider for some seriously heavy-duty, tool-using AI assistance. It’s like having a whole team of City Hall interns ready to help, but they actually know what they’re doing.

- **Smarter Civil Servants (`chidi` command):** Our AI librarian, Chidi, just got a major upgrade! You can now send lists of files directly to it using pipes, creating custom research packets on the fly! It’s like asking your librarian to analyze every book on gardening before you plant a single petunia.

- **New Community Centers:** We've built two brand-new facilities!

  - **The BASIC IDE (`basic`):** A beautiful, retro-inspired programming environment for all you classic coders out there.

  - **The Journal (`log`):** A personal, secure place to write down all your thoughts, plans, and brilliant ideas.

- **True Portability Initiative:** OopisOS is now a completely self-contained application, ready to go wherever you do. It's perfect for a flash drive, making it the ultimate "government-on-the-go" solution!


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

  - **`gemini`**: Your AI copilot for everything from answering questions to helping you with your files.

  - **`chidi`**: The best AI librarian to help you analyze and understand your documents.

  - **`basic`**: An integrated development environment for the classic BASIC programming language.

  - **`log`**: Your own personal, secure, timestamped journal.

  - **`edit`**: A powerful text editor that knows what you're working on, with live Markdown preview!

  - **`paint`**: A wonderful art studio for creating character-based masterpieces.

  - **`adventure`**: A powerful engine to play and even create your own text adventure games.


## City Planning: How It All Works (For Nerds!)

The architecture of OopisOS is a masterclass in planning! It's all about being secure, organized, and persistent.

#### **The Persistence Layer: A Town That Remembers**

OopisOS saves everything right on your machine. No cloud, no servers, just your own personal, persistent world.

- **IndexedDB:** This is our Hall of Records, a powerful database that stores our entire file system.

- **LocalStorage:** This is our City Hall's main office, a super-fast storage for important things like user credentials, command history, and aliases.


#### **The Command Contract: A Promise of Good Governance**

Every command in OopisOS follows a strict set of rules, which I call the "Command Contract." This ensures that everything is safe, predictable, and stable. It’s like a city ordinance for code! Before any command runs, the `CommandExecutor` checks its contract for things like:

- `flagDefinitions`: Which flags the command can use.

- `argValidation`: The correct number of arguments.

- `pathValidation`: Which arguments are files and if they exist.

- `permissionChecks`: That the user has the right permissions to do what they're asking.


This is good government in action! It prevents problems before they even start.

## Get Involved: Join a Committee!

This is an open-source project, which means it's a community project! If you have ideas, find a problem, or want to help build the next great public park (or feature), please get involved!

Adding a new command to OopisOS is straightforward, thanks to our new class-based command structure. Here’s how you can contribute:

### The Command Contract 2.0: Class-Based Commands

Every command in OopisOS is now a class that extends a base `Command` class. This modern approach makes commands more organized and easier to manage.

To create a new command, you'll need to do the following:

1. **Create a New File**: Add a new JavaScript file for your command in the `/scripts/commands/` directory (e.g., `mycommand.js`).

2. **Define Your Command Class**: Inside your new file, create a class that extends `Command`.

3. **Set Up the Constructor**: In the constructor of your class, you'll call `super()` and pass an object that defines your command's "contract." This contract tells the system everything it needs to know about your command, including:

  - `commandName`: The name of your command (e.g., "mycommand").

  - `description`: A brief description of what your command does.

  - `helpText`: The full help text that will be displayed when a user runs `man mycommand`.

  - `flagDefinitions`: An array of objects that define the flags your command accepts (e.g., `-h`, `--help`).

  - `argValidation`: Rules for validating the number of arguments your command accepts.

4. **Implement the `coreLogic` Method**: This is where the magic happens! The `coreLogic` method is where you'll write the code that your command executes. This method receives a `context` object that contains everything you need to interact with the system, including:

  - `args`: The arguments passed to your command.

  - `flags`: The flags passed to your command.

  - `dependencies`: An object containing all the system's managers and utilities, thanks to our dependency injection system! This is how you'll access the `FileSystemManager`, `UserManager`, and more.


Here is a simple template to get you started:

JavaScript

```
// scripts/commands/mycommand.js
window.MycommandCommand = class MycommandCommand extends Command {
  constructor() {
    super({
      commandName: "mycommand",
      description: "A brief description of my new command.",
      helpText: `A more detailed explanation of how to use mycommand.`,
      // ... other contract properties
    });
  }

  async coreLogic(context) {
    const { args, flags, dependencies } = context;
    const { ErrorHandler, OutputManager } = dependencies;

    // Your command's logic goes here!
    OutputManager.appendToOutput(`Hello from mycommand! You passed the arguments: ${args.join(", ")}`);

    return ErrorHandler.createSuccess();
  }
}
```

Once you've created your command file, our dynamic loader will automatically detect and integrate it into the system. It's that easy!

Thank you for being a citizen of OopisOS. Now let's get to work!