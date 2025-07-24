# Welcome to OopisOS v5.0

---

## Town Hall Bulletin: What's New in Version 5.0!

This is a monumental update, folks! We've just completed a major infrastructure overhaul and introduced new cultural programs to enrich your digital lives.

-   **City Sound System (`sound_manager.js`):** We've installed a brand-new, state-of-the-art sound system! With the new `beep` command, you can get audible notifications, and with the `synth` application, you can make your own music! It's a new era of auditory excellence.
-   **Upgraded Hall of Records (`storage_hal.js`):** We've implemented a new Storage Hardware Abstraction Layer. It's a fancy term for a better, more organized, and more robust way of handling all your files. You won't see it, but you'll feel it in the stability and reliability of our services.
-   **New Public Works Tools:** We've added some powerful new tools for our citizens:
  -   `sed`: A stream editor for all your text-transformation needs.
  -   `nl`: A utility to number the lines in your files. Perfect for poets and programmers alike!

...

|Module|Responsibility|
|---|---|
|**`storage_hal.js`**|**The Storage Abstraction Layer.** Defines the contract for all storage backends, decoupling the `FileSystemManager` from the specific storage implementation (like IndexedDB).|

...

|Command|What It _Really_ Does|
|---|---|
| `beep` | **Makes a simple beep sound.** Great for getting your attention in scripts. |
| `synth`| **Launches a musical synthesizer.** Play tunes with your keyboard! |
| `sed`  | **A stream editor for find-and-replace on text.** Powerful for programmatic edits. |
| `nl`   | **Numbers the lines of a file.** Great for referencing specific lines. |

---

## **So, What Is This Thing?**

You've got OopisOS. At its core, it's a self-contained operating system that runs entirely on your local machine. That's the most important part. There's no cloud, no server, no telemetry. All your files, your users, and your data are stored locally and only locally.

The whole OS is designed to be truly portable. You can stick it on a USB drive and carry your entire environment with you, leaving nothing behind on the host machine.

### **What It Actually Does: The Features That Matter**

Forget the buzzwords. Here's what you can actually do with it.

- **Real Shell Scripting:** The `run` command executes `.sh` files. This isn't just a gimmick; it's a real scripting engine. Your scripts can accept arguments (`$1`, `$@`, `$#`), use comments, and will be gracefully terminated if they get stuck in a loop.

- **Local AI, Your Rules:** The `gemini` command is your gateway to AI. You can chat with local models you run yourself via Ollama or use the default cloud provider, which is smart enough to use other commands to answer questions about your files. It's a tool, not a toy.

- **A Real Filesystem (in a Box):** It's a persistent virtual filesystem running on IndexedDB, but you don't need to care about that. What you care about are the commands, and you've got the standard toolkit: `ls`, `cp`, `mv`, `rm`, `find`, `zip`—the works. You can even `export` files to your host machine.

- **A Shell That Doesn't Suck:** It's a proper command-line environment. You get command history, tab-completion, piping (`|`), redirection (`>`), background tasks (`&`), and environment variables (`set`, `unset`). You can even customize your prompt. All the basics you'd expect are here.

- **Actual Multi-User Security:** You can create users (`useradd`) and groups (`groupadd`), manage file permissions (`chmod`, `chown`), and escalate privileges correctly with `sudo`. This isn't just for show; permissions are enforced everywhere.

- **A Suite of Built-in Apps:** There's a set of useful, full-screen applications for when the command line isn't enough:

    - `edit`: A text editor with live Markdown preview.

    - `code`: A simple, lightweight editor for code files.

    - `paint`: A character-based art studio. Yes, really.

    - `chidi`: An AI tool for analyzing collections of documents with conversational memory.

    - `explore`: A graphical file explorer.

    - `adventure`: A surprisingly powerful engine for playing and building text adventure games.

    - `basic`: A complete IDE for the BASIC programming language.

    - `log`: A personal, timestamped journaling system.


## **Command-Line Crash Course**

You're going to live in the terminal. You might as well get good at it. Here are the absolute essentials. Type `man [command]` if you need more than this.

|Command|What It _Really_ Does|
|---|---|
|`help [cmd]`|Shows you a list of commands or the basic use of one. Start here.|
|`ls`|Lists what's in a directory. Use it constantly. Now with sorting by time (`-t`), size (`-S`), and extension (`-X`).|
|`cd [directory]`|Changes your current directory. Your primary way of moving around.|
|`run [script.sh]`|Executes a shell script. This is where the real power is.|
|`cat [file]`|Dumps a file's entire content to the screen. Good for a quick look.|
|`mkdir [dir_name]`|Makes a new, empty directory. Use `-p` to create parent directories as needed.|
|`touch [file]`|Creates an empty file or updates its timestamp.|
|`mv [source] [dest]`|Moves or renames a file. Same command, different result based on `dest`.|
|`cp [source] [dest]`|Copies a file. Use `-r` for directories.|
|`rm [item]`|Deletes a file or directory. **There is no trash can. This is permanent.** Use `-r` for directories and `-f` to skip prompts.|
|`grep [pattern]`|Finds lines containing a text pattern. Use `-R` to search recursively. Incredibly useful.|
|`find [path] -exec`|Finds files based on criteria and executes a command on them. Powerful, but be careful.|

## **The Application Suite: Tools for Getting Things Done**

These aren't your typical bloated applications. They are focused, full-screen tools for specific jobs.

- **`explore [path]`**: This is your graphical file manager. Forget the read-only nonsense; you can create, rename, move, and delete files and directories directly from the UI. It's a two-pane view: directory tree on the left, file listing on the right. Use it to get your bearings, then get back to the terminal where the real work happens.

- **`edit [file]`**: Your workhorse for text. It's smarter than `cat` and more powerful than `echo`. It handles plain text, but its real value is the live preview for Markdown and HTML (`Ctrl+P`). Stop guessing what your markup looks like and just _see_ it.

- **`paint [file.oopic]`**: Look, sometimes you need to draw. This is a character-based art studio. It's got a canvas, colors, and tools for lines, shapes, and filling. You can make icons, title screens, or maps for the `adventure` engine. The `.oopic` format is just human-readable JSON, so it’s open, just like the rest of the system.

- **`chidi [path]`**: The "AI Librarian". Point it at a directory, or pipe a list of files to it (`find . -name "*.js" | chidi`), and it gives you a dedicated interface to analyze them. It now has conversational memory and can use different AI providers (`-p ollama`). It intelligently finds the most relevant files for your question before talking to the AI, which is faster and gives better answers. It's for deep-diving into a known set of files.

- **`adventure [file.json]`**: A data-driven text adventure engine. You can play the built-in game or, more importantly, create your own worlds by defining rooms, items, and logic in a JSON file. Use `adventure --create <file.json>` to launch the interactive editor.

- **`gemini "<prompt>"`**: This is your AI multitool. By default, it's smart enough to use other commands (`ls`, `cat`, `grep`) to answer questions about your files. It plans what it needs to do, runs the commands, and then gives you an answer. This is more secure because it can only use a whitelist of safe commands. Or, you can point it at a local model (`-p ollama`) for direct chat.

- **`basic [file.bas]`**: A full IDE for the BASIC programming language. It's a throwback, but it's a complete, sandboxed environment where you can `LIST`, `RUN`, `SAVE`, and `LOAD` old-school, line-numbered programs. It has a secure bridge (`SYS_CMD`, `SYS_READ`, `SYS_WRITE`) so your BASIC programs are still subject to the system's permission model.

- **`log`**: A simple, secure journaling system. It creates timestamped Markdown files in `~/.journal/`. The app gives you a timeline and an editor, but they're just text files. You can `grep` them, `cat` them, or back them up like anything else. You can also make a quick entry directly from the command line: `log "New entry."`.


## **Advanced Course: How to Actually Control the Thing**

Now we're talking. These are the tools for administrators and people who want to make the system their own.

#### **Shell Scripting with `run`**

The `run` command is what elevates this from a command line to an operating system. You can write scripts to automate tasks. It's simple and powerful.

1. **Write the Script:** Use `edit` or `code` to create a file with a `.sh` extension.

2. **Make it Executable:** A script won't run unless you give it permission. Use `chmod 755 your_script.sh`.

3. **Run It:** `run ./your_script.sh`


Your scripts can accept arguments passed from the command line:

- `$1`, `$2`, etc., for the first, second argument.

- `$@` for all arguments as a single string.

- `$#` for the number of arguments passed.


Lines starting with `#` are comments and are ignored. The system has a governor to prevent infinite loops, so don't worry about crashing it.

#### **Shell Customization: The `PS1` Variable**

Your command prompt doesn't have to be boring. The `PS1` environment variable controls its appearance. Use `set` to change it.

|Sequence|What It Does|
|---|---|
|`\u`|Your username.|
|`\h`|The hostname (`OopisOs`).|
|`\w`|The full path of the current working directory.|
|`\W`|Just the basename of the current directory.|
|`\$`|A `#` if you're `root`, otherwise a `$`.|

**Example:** `set PS1="[\u@\h \W]\$ "`

This changes the prompt to `[Guest@OopisOs ~]$`.

#### **Privilege Escalation: `sudo` and `visudo`**

Don't run as `root` all the time. It's stupid and dangerous. When you need administrative power, borrow it with `sudo`.

- **`sudo [command]`**: Executes a single command with `root` privileges. You'll be prompted for _your own_ password, not the root password. The system checks if you're allowed to run the command based on the `/etc/sudoers` file.

- **`visudo`**: The _only_ way you should edit `/etc/sudoers`. It locks the file and checks for syntax errors on save, which stops you from making a typo that locks everyone (including yourself) out of `sudo`. A very, very good idea.


#### **Command Chaining: `&&` and `||`**

The shell is smart enough to handle basic logic. This is essential for scripting.

- **`&&` (AND)**: The command on the right runs **only if** the command on the left succeeds.

    - **Use case:** `mkdir new_dir && cd new_dir` (Only change into the directory if the creation was successful).

- **`||` (OR)**: The command on the right runs **only if** the command on the left _fails_.

    - **Use case:** `grep "ERROR" log.txt || echo "No errors found."` (Print a success message only if grep finds nothing and returns an error code).


# For Developers: How Not to Make a Mess

If you want to contribute, you need to understand the architecture. It's not complicated, but it is deliberate. The entire system is designed around a few core ideas. Don't fight them.

1. **It's All On The Client.** There is no backend. There is no server to save you. The OS is 100% self-reliant, and all data lives and dies in the user's browser. This is a hard constraint.

2. **Modularity is Not Optional.** Features are built as discrete, isolated components. The command executor _orchestrates_ the filesystem manager; it doesn't get tangled up in its internals. This separation is what keeps the system from turning into a bowl of spaghetti.

3. **Security is the Foundation, Not a Feature.** The permission model is not a suggestion. All I/O, without exception, goes through a single gatekeeper (`FileSystemManager.hasPermission()`). Passwords are never stored in plaintext; they're hashed with the Web Crypto API. There are no shortcuts.

4. **Execution is Contained.** Every command follows a strict lifecycle: Lex, Parse, Validate, Execute. We validate everything—arguments, paths, permissions—_before_ a single line of the command's core logic is run. This prevents a badly written command from taking down the whole system.


#### **The Core Architectural Modules**

The system is best understood as a set of interacting, single-purpose managers and classes.

|Module|Responsibility|
|---|---|
|**`commexec.js`**|**The Command Executor.** The heart of the shell, this module orchestrates the entire command lifecycle, from parsing and preprocessing to execution, and manages complex features like piping, redirection, and background jobs.|
|**`command_base.js`**|**The Command Blueprint.** Defines the abstract `Command` class that all other commands extend. It handles all common logic for argument parsing, validation, and input stream handling, drastically simplifying the development of new commands.|
|**`command_registry.js`**|**The Command Encyclopedia.** A simple but vital module that acts as the central, authoritative list of all command objects that have been loaded into the system, enabling true decoupling.|
|**`app.js`**|**The Application Blueprint.** Defines the abstract `App` class that serves as the blueprint for all full-screen graphical applications, ensuring a consistent lifecycle (`enter`, `exit`) for predictable system management.|

#### **Adding a New Command: The Command Contract**

This is the most important part for contributors. Adding a command is a declarative process. You don't just write code; you write a _contract_ that tells the `CommandExecutor` what your command needs to run safely. The executor handles all the tedious and error-prone validation _for you_.

**Step 1: Create the Command File**

Make a new file in `/scripts/commands/`. The filename must match the command name (e.g., `mycommand.js`).

**Step 2: Define the Class and Contract**

Create a class that extends `Command` and define its contract in the `super()` call within the constructor.

```
// scripts/commands/mycommand.js
window.MycommandCommand = class MycommandCommand extends Command {
  constructor() {
    super({
      commandName: "mycommand",
      // What flags does it accept?
      flagDefinitions: [
        { name: "force", short: "-f" },
        { name: "output", short: "-o", takesValue: true }
      ],
      // How many arguments are required?
      argValidation: {
        min: 1,
        max: 2,
        error: "Usage: mycommand [-f] [-o file] <source> [destination]"
      },
      // Which arguments are file paths and what are their rules?
      validations: {
          paths: [
            { argIndex: 0, options: { expectedType: 'file', permissions: ['read'] } },
            { argIndex: 1, options: { allowMissing: true } }
          ]
      }
    });
  }

  async coreLogic(context) { /* ... */ }
};
```

**Step 3: Write the Core Logic**

Your `coreLogic` function receives a `context` object. By the time your code runs, you can _trust_ that everything in this object has already been validated according to your contract.

```
  async coreLogic(context) {
    const { args, flags, currentUser, validatedPaths, dependencies } = context;
    const { ErrorHandler, OutputManager } = dependencies;

    // No need to check permissions or if the path is valid.
    // The CommandExecutor already did it. Just do the work.
    const sourceNode = validatedPaths[0].node;
    const content = sourceNode.content;

    // ... your logic here ...
    OutputManager.appendToOutput("Execution complete.");

    return ErrorHandler.createSuccess();
  }
```

This design makes the system robust. It's hard to write an insecure command because the security is handled for you before your code even runs.

#### **The Testing Environment: Don't Ship Broken Code**

A new OS is an empty canvas. That's boring and hard to test. Use these scripts.

- **`run /extras/inflate.sh`**: This builds a whole world for you. It creates a complex directory structure with different file types, permissions, and even some secrets to find. Use it to test your commands in a realistic environment.

- **`run /extras/diag.sh`**: This is the gauntlet. It's a comprehensive stress test that runs a barrage of commands to check every corner of the OS. If your change breaks `diag.sh`, fix it. No excuses.

---
## **Application Deep Dive**
---

### **The Text Editors: `edit` and `code`**

#### **`edit`: The Main Workhorse**

This is your primary text editor, the public works department for all your major projects. You launch it by typing `edit [filepath]`. If the file exists, it opens it. If it doesn't, a new file is created when you save (`Ctrl+S`).

Its main purpose is to be adaptive. It's not just a text box; it changes based on what you're working on.

- **Markdown Mode (`.md`)**: This is where `edit` shines. It has a live preview, and you can cycle through views: editor only, a split view with your code and the rendered output side-by-side, or just the preview. Stop writing markup blind.

- **HTML Mode (`.html`)**: Same deal as Markdown. You get a live, _sandboxed_ preview. The sandboxing is important—it means the HTML is rendered in a clean `iframe` so it doesn't mess with the rest of the OS UI.

- **Text Mode (everything else)**: For any other file (`.txt`), it's a clean, standard text editor. It has a word-wrap toggle that saves its state across sessions.


**Key Shortcuts (Memorize these):**

- `Ctrl+S`: Save

- `Ctrl+O`: Exit

- `Ctrl+P`: Cycle through view modes (Edit/Split/Preview)

- `Ctrl+Z`: Undo

- `Ctrl+Y`: Redo


#### **`code`: The Scalpel**

The `code` command is for quick, surgical edits on script files (`.js`, `.sh`, `.css`, etc.). It's for when you know exactly what line you need to change and you want to get in and get out without any fuss.

Type `code [filepath]` and it pops a simple modal editor. It provides basic syntax highlighting for keywords, comments, and strings to improve clarity. It's not meant to be a full IDE; it's meant to be fast and efficient. Use `edit` for your documents and `code` for your scripts.

### **The AI Tools: `chidi` and `gemini`**

You have two primary AI commands. They serve different purposes. Use the right tool for the job.

#### **`chidi`: The AI Librarian for Focused Analysis**

Think of `chidi` as a specialist. Its job is to perform deep analysis on a set of documents you provide. You give it a directory (`chidi ./docs`) or pipe a list of files to it (`find . -name "*.js" | chidi`), and it launches a dedicated reading application.

Once inside the app, all the files you've loaded are concatenated into a single, comprehensive context. You can then:

- **Ask**: Pose questions to the AI, which will answer based on the _entire collective content_ of all loaded documents and your conversation history.

- **Summarize**: Get a concise summary of the specific document you're currently viewing.

- **Study**: Ask the AI to generate insightful questions about the current document to help you understand it better.


You can also use the `-p` flag to point it at a local AI provider like Ollama, avoiding the need for a cloud API key.

#### **`gemini`: The General-Purpose AI Assistant**

If `chidi` is a specialist, `gemini` is your generalist. It's a conversational assistant that can use other OS tools to figure things out. It's designed to answer questions when you _don't_ know where the information is.

It operates in three modes:

1. **Tool-Using Agent (Default)**: Ask a question like `"Summarize my README.md and list any scripts in this directory"`, and it will devise and execute a plan using a safe, whitelisted set of shell commands (`ls`, `grep`, `cat`, etc.) to find the answer. This is its main strength.

2. **Direct Chat (`-p` flag)**: If you just want to talk to an AI, you can use the `-p` flag to specify a provider, like a local Ollama instance (`gemini -p ollama "write a story"`). In this mode, it's a direct conversation without the tool-use logic.

3. **Interactive Chat (`-c` flag)**: This launches a full-screen, graphical chat client for a more traditional, back-and-forth conversation with the AI.


#### **The Bottom Line: Which One Do I Use?**

- **Use `chidi` when:** You have a collection of documents and you want to analyze their collective content. You know _where_ the knowledge is; you just need help processing it.

- **Use `gemini` when:** You have a question and you want the OS to figure out how to answer it by finding files and running commands.


### **`paint`: The Character-Based Art Studio**

It's a paint program for the terminal, and it's a wonderful, necessary tool. It exists to create visual assets _within_ the OS, embracing the system's aesthetic.

#### **How It Works**

You invoke it with `paint [filename.oopic]`. The interface is simple: a toolbar with tools (pencil, eraser, shapes), a color palette, brush size, and a grid toggle. The canvas is a fixed 80x24 grid, and it has multi-level undo/redo (`Ctrl+Z`/`Ctrl+Y`).

#### **The Technical Part**

The implementation is a clean example of the OS's design philosophy:

- **Separation of Concerns**: `PaintManager.js` is the brain; it handles the application state—the canvas data (a 2D array), selected tool, and undo stack. `PaintUI.js` is the hands; its only job is to touch the DOM.

- **The Canvas Isn't a `<canvas>`**: The canvas is a CSS grid of individual `<span>` elements. This is far more efficient for this use case. Updating one character means changing one `<span>`, not redrawing a whole bitmap.

- **The `.oopic` File Format**: Artwork is saved to a custom `.oopic` format, which is just a human-readable JSON file storing the dimensions and a 2D array of cells (character and color).

### **The Adventure Engine: A Study in Data-Driven Design**

The `adventure` command launches a powerful engine for interactive fiction. You can play the built-in game, but the real value is in building your own worlds.

#### **How to Build**

You can build an adventure by creating a `.json` file that describes your world. Start with the creation tool: `adventure --create my_game.json`. This drops you into an interactive editor to help build the JSON structure.

The entire game is defined by a handful of objects in your JSON file:

- **Rooms**: Locations with an ID, name, description, and `exits` that link to other room IDs.

- **Items**: Objects with a `location` property that places them in a room, in another item (a container), or in the player's inventory.

- **Stateful Items**: Items can have states (`"on"`/`"off"`) with different descriptions and can trigger `effects` that change the state of other items, forming the basis for puzzles.

- **NPCs and Daemons**: You can add Non-Player Characters (`npcs`) with branching `dialogue` and create `daemons` for timed events or hints.


The engine is a self-contained system that demonstrates how to build a complex, interactive application with a clean separation between code and data. Study it.

### **Oopis Basic: A Sandboxed Scripting Environment**

This is a full implementation of the BASIC programming language, here to demonstrate a core architectural principle: **secure, sandboxed code execution**.

When you type `basic [file.bas]`, you launch a full-screen IDE (`basic_manager.js`). The language engine (`basic_interp.js`) is a self-contained parser and executor with no direct access to the file system or main command executor.

A BASIC program can interact with the OS through a secure bridge of `SYS_` functions:

- **`SYS_CMD("command")`**: Executes a shell command and returns its output.

- **`SYS_READ("filepath")`**: Reads a file's content.

- **`SYS_WRITE("filepath", "content")`**: Writes content to a file.


Every `SYS_` call is routed through the main OS core, meaning all actions are still subject to the user's file permissions. It's a perfect architectural example of how to safely grant power to a subsystem.

### **`log`: The Captain's Journal**

The `log` command is your personal journal. Running `log` opens a two-pane application: a timeline of your entries on the left and an editor on the right.

Architecturally, each entry is just a separate Markdown file stored in `~/.journal/`. This is a deliberate design choice, allowing you to use the entire OopisOS toolchain on your journal— `grep`, `cat`, `zip`, etc. The app is a convenient front-end for managing a directory of text files. You can also make a quick entry directly from the command line: `log "This is a new entry."`.

### **`explore`: The Graphical File Manager**

When you're tired of typing `ls`, the `explore` command opens a two-pane file explorer: a directory tree on the left and the contents of the selected directory on the right.

It's a full-featured file manager. You can manipulate the filesystem using the right-click context menu to create, rename, delete, or move items. All actions are handled by the core `CommandExecutor` in the background, so all file permissions are still respected.


---
## **OopisOS: Security by Design**
---

OopisOS is architected on a principle of zero-trust, ensuring security by default, not by effort. The system's security is not a single feature but a series of interlocking components that govern every action from authentication to file access.

#### **The Bedrock**

The security model is built on three pillars: **client-side sandboxing**, **explicit user permissions**, and **architected containment**. The system has no servers, collects no user data, and has no access to your computer's files beyond what you explicitly provide through the `upload` or `export` commands.

#### **The Core Model: How It Works**

Every security-sensitive action is funneled through audited, single-purpose managers.

- **Authentication (`UserManager` & `passwd`):** User passwords are never stored in plaintext. They are salted and hashed using the browser's native Web Crypto API with PBKDF2 and SHA-256, as seen in the `_secureHashPassword` function. The `passwd` command provides the user-facing interface for changing passwords, invoking `UserManager` to orchestrate the secure update process.

- **Authorization (`FileSystemManager`):** This component is the sole gatekeeper for all file system operations. As implemented in `fs_manager.js`, every attempt to read, write, or execute a file is validated through the `FileSystemManager.hasPermission(node, username, permissionType)` function. This function rigorously checks the file's owner and group against its octal permissions (`rwx`). The only exception is the `root` user, who bypasses these checks.

- **Privilege Escalation (`SudoManager` & `visudo`):** The `sudo` command allows for temporary, controlled privilege escalation. Access is governed by the `/etc/sudoers` file, which is parsed by the `SudoManager`. The `visudo` command ensures this file is edited safely by opening it in the system editor. This prevents syntax errors from locking users out of the `sudo` command.

#### **Your Security Toolkit: Data Verification and Protection**

OopisOS provides a suite of command-line tools for data integrity and security.

|Command|Role in Security|Implementation Details|
|---|---|---|
|`cksum`|**Verification**|Calculates a 32-bit CRC checksum and byte count for a file's content. This is used to verify that a file has not been altered or corrupted since its last check.|
|`base64`|**Transformation**|Encodes and decodes data using the Base64 standard, utilizing the browser's native `btoa()` and `atob()` functions. This is essential for safely transmitting data through text-only systems.|
|`ocrypt`|**Obscurity**|A custom block cipher that uses a key-derived matrix to transform data. **This is not secure encryption.** It is included as an educational tool to demonstrate cryptographic principles.|
|`xor`|**Obscurity**|A simple password-based XOR cipher. **This is not secure encryption.** It is included as an educational tool to demonstrate basic data transformation principles.|
|`sync`|**Persistence**|Manually forces all pending filesystem changes to be written from memory to the underlying IndexedDB database by calling `FileSystemManager.save()`.|

This suite embodies the OopisOS philosophy: providing the user with transparent and robust tools to manage their own data security.


---
## **Command Reference: The Toolbox**
---

This is not an exhaustive guide. It's a quick reference. For the full, excruciating detail on any command, use `man [command_name]`.

#### **1. Observation & Security: Look Before You Leap**

You can't manage what you can't see. These are the foundational tools for observing the state of the system and its rules.

|Command|What It _Actually_ Does|
|---|---|
|`ls`|**Lists directory contents.** Use it constantly. `ls -l` provides a detailed long format, while other flags sort by time (`-t`), size (`-S`), extension (`-X`), or reverse order (`-r`).|
|`tree`|**Lists contents in a tree-like format.** It's `ls` for people who like diagrams. Use `-L <level>` to limit depth or `-d` for directories only.|
|`pwd`|**Prints the working directory.** Tells you where you are. If you're lost, use this.|
|`diff`|**Compares two files line by line.** Shows you exactly what changed. Invaluable.|
|`df`|**Reports filesystem disk space usage.** Shows you how much space you've got left in the virtual disk. Use `-h` for human-readable sizes.|
|`du`|**Estimates file space usage.** Shows you how much space a specific file or directory is taking up. Supports `-h` for human-readable and `-s` for a summary.|
|`chmod`|**Changes the permission mode of a file.** The core of file security. Use 3-digit octal modes (e.g., `755`). If you don't know what that means, you shouldn't be using it.|
|`find`|**Searches for files.** A powerful tool to find files based on name, type, permissions (`-perm`), and modification time (`-mtime`). The all-seeing eye of the filesystem.|
|`cksum`|**Calculates a checksum for a file.** Verifies that a file hasn't been corrupted. If the numbers match, the file is the same.|

#### **2. User & Group Management: The Social Contract**

Now that you can see, you need to manage who's who. This is about defining the actors in your security model.

|Command|What It _Actually_ Does|
|---|---|
|`useradd`|**Creates a new user account.** Also creates their home directory. Prompts for a password via a modal input.|
|`removeuser`|**Deletes a user account.** Use `-r` to also delete their home directory and all their files. Be careful with this one.|
|`groupadd`|**Creates a new user group.** For managing permissions for multiple users at once. Requires `root` privileges.|
|`groupdel`|**Deletes a group.** You can't delete a group if it's the primary group for any user. Requires `root` privileges.|
|`usermod`|**Modifies a user's group memberships.** Its only supported use here is `usermod -aG <group> <user>` to add a user to a supplementary group.|
|`passwd`|**Changes a user's password.** If you're not `root`, you can only change your own, and you'll need to provide the old one.|
|`chown`|**Changes the user ownership of a file.** Only `root` can change the ownership of a file.|
|`chgrp`|**Changes the group ownership of a file.** Only the file's owner or `root` can do this.|
|`sudo`|**Executes a command as root.** The safe way to get administrative privileges for a single command, governed by `/etc/sudoers`.|
|`visudo`|**Safely edits the `/etc/sudoers` file.** The _only_ way you should touch this file. It prevents you from locking yourself out by checking for syntax errors before saving.|
|`login`|**Logs in as a different user.** This replaces your current session stack entirely.|
|`logout`|**Logs out of a stacked session.** This is the counterpart to `su`. Use it to return to your original user.|
|`su`|**Switches to another user.** Stacks a new session on top of your current one. Default is `root`.|
|`whoami`|**Prints your current username.** In case you forget.|
|`groups`|**Displays group memberships.** Shows you which groups a user belongs to.|
|`listusers`|**Lists all registered users.** A quick way to see who has an account on the system.|

#### **3. The Workshop: Fundamental File Operations**

These are the tools you'll use every day. They are simple, sharp, and do exactly what they say they do.

|Command|What It _Actually_ Does|
|---|---|
|`mkdir`|**Makes a new directory.** Use the `-p` flag to create parent directories as needed, which saves you from creating them one by one.|
|`rmdir`|**Removes _empty_ directories.** If there's anything in it, this command will fail. This is a safety feature. Use it.|
|`touch`|**Creates an empty file** or updates the timestamp of an existing one using `-d` for date strings or `-t` for stamps.|
|`echo`|**Writes its arguments to the output.** Its main purpose is to write text into files using redirection (`>`). Supports `-e` to enable backslash escapes like `\n` and `\t`.|
|`cat`|**Concatenates and displays file content.** Dumps the entire contents of a file to the screen. Use `-n` to number the output lines.|
|`head`|**Outputs the first part of a file.** By default, the first 10 lines. Use `-n` for lines or `-c` for bytes.|
|`tail`|**Outputs the last part of a file.** The opposite of `head`. Essential for checking the end of log files. Also supports `-n` and `-c`.|
|`cp`|**Copies files or directories.** Use `-r` for directories, `-p` to preserve metadata, `-i` for interactive, and `-f` to force overwrites.|
|`mv`|**Moves or renames files and directories.** Same command, different result based on whether the destination exists. Supports `-i` for interactive and `-f` to force overwrites.|
|`rm`|**Removes (deletes) files or directories.** **There is no undelete.** Use `-r` for directories and `-f` to force deletion without prompting. Be extremely careful. You've been warned.|
|`zip`|**Creates a simulated `.zip` archive.** Bundles a file or directory into a single JSON file representing the file structure.|
|`unzip`|**Extracts a simulated `.zip` archive.** The counterpart to `zip`, recreating the archived directory structure.|
|`upload`|**Uploads a file from your real machine** into the OS. Opens a file dialog.|
|`export`|**Downloads a file from the OS** to your real machine.|

#### **4. The Assembly Line: Text Processing & Automation**

This is where the real power of a command-line OS comes from. These tools are designed to be chained together with pipes (`|`) to perform complex data manipulation.

|Command|What It _Actually_ Does|
|---|---|
|`grep`|**Finds lines that match a pattern.** The single most useful text processing tool you have. Supports `-i`, `-v`, `-n`, `-c`, and recursive (`-R`) search.|
|`sort`|**Sorts lines of text.** Alphabetically by default, or numerically with `-n`. Use `-r` to reverse and `-u` for unique lines.|
|`uniq`|**Filters out adjacent repeated lines.** Use `-c` to count, `-d` for only repeated lines, and `-u` for only unique lines. Useless without `sort` first.|
|`wc`|**Counts lines (`-l`), words (`-w`), and bytes (`-c`).** Good for sanity checks.|
|`awk`|**A powerful pattern-scanning and text-processing language.** Use `-F` to specify a field separator and `{print $N}` to extract columns.|
|`more` / `less`|**Pagers to display content one screen at a time.** `less` is better because it lets you scroll backward (`b` or ArrowUp) and forward (`f` or Space).|
|`bc`|**An arbitrary-precision calculator.** Pipe an expression to it or provide it as an argument. Handles basic arithmetic and parentheses.|
|`xargs`|**Builds and executes command lines from standard input.** The glue that lets you use the output of one command as the arguments for another. Use `-I <str>` to replace a placeholder.|
|`run`|**Executes a shell script (`.sh` file).** The foundation of all automation, with argument support (`$1`, `$@`, `$#`).|
|`delay`|**Pauses execution** for a number of milliseconds. Essential for scripting demonstrations.|
|`base64`|**Encodes or decodes data.** For making binary data safe for text-based systems. Use `-d` to decode.|

#### **5. The Bridge: Networking & System Integrity**

These commands are for interacting with the outside world and managing the state of the OS itself.

|Command|What It _Actually_ Does|
|---|---|
|`wget`|**Downloads a file from a URL.** A non-interactive downloader. Specify an output file with `-O`.|
|`curl`|**A more versatile data transfer tool.** Use it for API interaction, `-i` to see headers, `-o` for output file, and `-L` to follow redirects.|
|`ps`|**Lists current background processes** that you started with `&`. Shows the Process ID (PID) and the command.|
|`kill`|**Terminates a background process** by its Job ID from `ps`.|
|`backup`|**Creates a full, downloadable backup of the entire OS state.** This is your escape hatch. It includes a checksum for integrity.|
|`restore`|**Restores the OS from a backup file.** Wipes the current state completely. It will ask for confirmation.|
|`sync`|**Commits filesystem caches to persistent storage.** Forces a save of the in-memory `fsData` object to IndexedDB.|
|`reboot`|**Reboots the virtual machine** by reloading the page. All your data persists.|
|`reset`|**Wipes ALL OopisOS data and performs a factory reset.** This is the "burn it all down" command. It is permanent and destructive. Use it when you want to start over from nothing.|

#### **6. The Cockpit: High-Level Applications**

These are the full-screen modal apps. We've covered them in detail, so this is just a quick reference.

|Command|What It _Actually_ Does|
|---|---|
|`edit`|**Opens the main text editor** with live previews for Markdown/HTML.|
|`paint`|**Launches the character-based art studio.** For creating assets with the `.oopic` extension.|
|`explore`|**Opens the graphical file explorer.** For a quick visual overview of your files.|
|`chidi`|**The "AI Librarian."** Launches a dedicated app for analyzing a collection of documents using a configured LLM provider.|
|`gemini`|**The general-purpose AI assistant.** Uses system tools to answer questions about your files or can interact directly with local LLMs.|
|`adventure`|**Starts the text adventure engine.** Lets you play or create interactive fiction using `.json` files. Use `--create` to enter the editor.|
|`basic`|**Launches the Oopis Basic IDE.** A sandboxed environment for writing and running `.bas` programs.|
|`log`|**Opens the personal journaling application.** A simple front-end for managing timestamped text files. Can also create quick entries from the command line.|

#### **7. The Environment: Shell & Session Control**

These commands control the shell itself. Use them to customize your environment and manage your workflow.

| Command   | What It _Actually_ Does                                                              |
| --------- | ------------------------------------------------------------------------------------ |
| `help`    | **Displays a list of commands** or a command's basic syntax. A quick reminder.       |
| `man`     | **Displays the detailed manual page** for a command. This is `help` with more words. |
| `history` | **Displays or clears the command history.** Use `-c` to clear it.                    |
| `clear`   | **Clears the terminal screen.** Doesn't clear your history, just the clutter.        |
| `alias`   | **Creates command shortcuts.** `alias ll='ls -l'` is a classic for a reason.         |
| `unalias` | **Removes an alias**.                                                                |
| `set`     | **Sets or displays environment variables.** Use it to customize your `PS1` prompt.   |
| `unset`   | **Removes an environment variable**.                                                 |
| \|`date`  | **Displays the current system date and time**                                        |

---
## **FAQ: The Real Questions**
---

## **What _is_ this thing, really?**

It's a simulated operating system that runs entirely in your browser. It's a persistent, private sandbox for you to work, play, and experiment in. There is no cloud. There is no server. All your data is stored on your machine, and only on your machine. We don't have it, we don't want it.

## **So my data is actually private?**

Yes. See the point above. All files, user accounts, and session information are stored exclusively in your browser's `localStorage` and `IndexedDB`. It never leaves your computer unless you explicitly `export` or `backup` a file.

## **What's the `root` password?**

It's `mcgoopis`. This is set during the initial user setup in `UserManager.initializeDefaultUsers`. Don't lose it. And don't do everything as `root`. That's just asking for trouble.

## **Why are some commands so slow?**

Because your disk might be slow, or you're doing a lot at once. OopisOS's performance is directly tied to the read/write speed of the browser's `IndexedDB` storage. Operations that hit the virtual disk hard—like `find`, `unzip`, or `grep -R`—will be limited by the speed of this storage. That's not a bug; it's physics.

## **My Gemini API key disappeared when I switched computers. What gives?**

That's a security feature, not a bug. Your API key is stored in your browser's `localStorage` using the key `oopisGeminiApiKey`, which is specific to that machine. It is _intentionally_ not included in system backups created by the `backup` command to prevent you from accidentally sharing your private key. You'll need to re-enter your key the first time you use an AI command on a new machine.

## **Why can't `wget` or `curl` download from every website?**

CORS (Cross-Origin Resource Sharing). Because OopisOS runs in a browser, it's subject to the browser's security rules, which are enforced via the `fetch` API. If a website's server doesn't explicitly send a header that allows your browser to request its data, the browser will block the request. This isn't a limitation of OopisOS; it's a fundamental security policy of the web.

## **Is this just Linux?**

No. It's a _simulation_ of a Unix-like operating system, implemented in JavaScript. Many of the commands are designed to behave like their real-world counterparts (`ls`, `grep`, `chmod`, etc.), but it is not a Linux kernel. It's a self-contained environment that provides a similar _experience_ and enforces similar security principles, such as user and group permissions managed by `chown` and `chgrp`.

## **Who is this for?**

It's for people who are curious. It's for developers who want to see how an OS can be architected in a non-traditional environment. It's for students who want a safe environment to learn command-line fundamentals without the risk of damaging a real system. It's for anyone who wants a private, portable sandbox to play in. If you're looking for a production-grade server to run your company's database, you're in the wrong place.

## **About & Credits**

### **The Creators**

This project was a collaboration between two entities:

- **Andrew Edmark**: The Human. The Curator. The one who provided the direction, did the testing, and assembled the final work.

- **Gemini**: The AI Assistant. The one that generated code, drafted documentation, and was generally responsible for the bugs that later became features.


### **The Social Contract (aka The Boring Legal Bit)**

This is the MIT License, more or less. It lays out what you can and can't do. The important part is that this software is provided "AS IS", without warranty. If it breaks, you get to keep both pieces.

This Software, OopisOS, represents a collaborative endeavor between human direction and artificial intelligence. **Copyright (c) 2025 Andrew Edmark (hereinafter referred to as the "Curator")**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice, the Authorship and Contribution Acknowledgment, and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS (INCLUDING THE CURATOR) OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Now, what are you still here for?

Go.

Explore.

Create.