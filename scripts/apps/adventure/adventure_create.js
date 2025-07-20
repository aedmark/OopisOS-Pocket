// scripts/apps/adventure/adventure_create.js
window.Adventure_create = (() => {
  "use strict";

  let state = {
    isActive: false,
    adventureData: {},
    targetFilename: "",
    isDirty: false,
    commandContext: null,
    editContext: null,
  };

  // --- DEPENDENCIES TO BE INJECTED ---
  let dependencies = {};

  function enter(filename, initialData, commandContext) {
    if (state.isActive) return;

    // Inject dependencies from the command context
    dependencies = commandContext.dependencies;

    state = {
      isActive: true,
      adventureData: initialData,
      targetFilename: filename,
      isDirty: false,
      commandContext: commandContext,
      editContext: null,
    };

    dependencies.OutputManager.appendToOutput(
        "Entering Adventure Creator. Type 'help' for commands, 'exit' to quit.",
        { typeClass: "text-success" }
    );

    _requestNextCommand();
  }

  function _requestNextCommand() {
    if (!state.isActive) return;

    let prompt = `(creator)> `;
    if (state.editContext) {
      prompt = `(editing ${state.editContext.type} '${state.editContext.name}')> `;
    }

    dependencies.ModalManager.request({
      context: "terminal",
      type: "input",
      messageLines: [prompt],
      onConfirm: async (input) => {
        await _processCreatorCommand(input);
        if (state.isActive) {
          _requestNextCommand();
        }
      },
      onCancel: () => {
        if (state.isActive) _requestNextCommand();
      },
      options: state.commandContext.options,
    });
  }

  // Command parser and dispatcher
  async function _processCreatorCommand(input) {
    const [command, ...args] = input.trim().split(/\s+/);
    const joinedArgs = args.join(" ");

    switch (command.toLowerCase()) {
      case "create":
        await _handleCreate(args);
        break;
      case "edit":
        await _handleEdit(joinedArgs);
        break;
      case "set":
        await _handleSet(joinedArgs);
        break;
      case "link":
        await _handleLink(args);
        break;
      case "status":
        await _handleStatus();
        break;
      case "save":
        await _handleSave();
        break;
      case "exit":
        await exit();
        break;
      case "help":
        await _handleHelp();
        break;
      case "":
        break;
      default:
        await dependencies.OutputManager.appendToOutput(
            `Unknown command: '${command}'. Type 'help'.`,
            { typeClass: "text-error" }
        );
    }
  }

  // --- Command Handler Implementations ---

  function _generateId(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
  }

  async function _handleCreate(args) {
    const { OutputManager } = dependencies;
    const type = args.shift()?.toLowerCase();
    const name = args.join(" ").replace(/["']/g, "");

    if (!["room", "item", "npc"].includes(type)) {
      await OutputManager.appendToOutput(
          "Error: Must specify type: 'room', 'item', or 'npc'.",
          { typeClass: "text-error" }
      );
      return;
    }
    if (!name) {
      await OutputManager.appendToOutput(
          "Error: You must provide a name in quotes.",
          { typeClass: "text-error" }
      );
      return;
    }

    let id = _generateId(name);
    let counter = 1;
    while (
        state.adventureData[type + "s"] &&
        state.adventureData[type + "s"][id]
        ) {
      id = `${_generateId(name)}_${counter++}`;
    }

    const newEntity = { id, name, description: `A brand new ${name}.` };

    if (type === "room") {
      state.adventureData.rooms[id] = { ...newEntity, exits: {} };
    } else if (type === "item") {
      state.adventureData.items[id] = {
        ...newEntity,
        noun: name.split(" ").pop().toLowerCase(),
        location: "void",
        canTake: true,
      };
    } else if (type === "npc") {
      state.adventureData.npcs[id] = {
        ...newEntity,
        noun: name.split(" ").pop().toLowerCase(),
        location: "void",
        dialogue: { default: "They have nothing to say." },
      };
    }

    state.isDirty = true;
    await OutputManager.appendToOutput(
        `Created ${type} '${name}' with ID '${id}'.`,
        { typeClass: "text-success" }
    );
    await _handleEdit(`${type} "${name}"`);
  }

  function _findEntity(type, name) {
    const collection = state.adventureData[type + "s"];
    if (!collection) return null;
    let entity = Object.values(collection).find(
        (e) => e.name.toLowerCase() === name.toLowerCase()
    );
    if (entity) return entity;
    entity = collection[name];
    if (entity) return entity;

    return null;
  }

  async function _handleEdit(argString) {
    const { OutputManager } = dependencies;
    const typeMatch = argString.match(/^(room|item|npc)\s+/i);
    if (!typeMatch) {
      state.editContext = null;
      return;
    }
    const type = typeMatch[1].toLowerCase();
    const name = argString.substring(type.length).trim().replace(/["']/g, "");

    const entity = _findEntity(type, name);

    if (entity) {
      state.editContext = { type, id: entity.id, name: entity.name };
      await OutputManager.appendToOutput(
          `Now editing ${type} '${entity.name}'. Use 'set <prop> "<value>"'. Type 'edit' to stop editing.`,
          { typeClass: "text-info" }
      );
    } else {
      await OutputManager.appendToOutput(
          `Error: Cannot find ${type} with name '${name}'.`,
          { typeClass: "text-error" }
      );
    }
  }

  async function _handleSet(argString) {
    const { OutputManager } = dependencies;
    if (!state.editContext) {
      await OutputManager.appendToOutput(
          "Error: You must 'edit' an entity before you can 'set' its properties.",
          { typeClass: "text-error" }
      );
      return;
    }

    const match = argString.match(/^(\w+)\s+(.*)/);
    if (!match) {
      await OutputManager.appendToOutput(
          'Error: Invalid format. Use: set <property> "<value>"',
          { typeClass: "text-error" }
      );
      return;
    }

    const prop = match[1].toLowerCase();
    const value = match[2].replace(/["']/g, "");

    const entity =
        state.adventureData[state.editContext.type + "s"][state.editContext.id];
    if (!entity) {
      await OutputManager.appendToOutput(
          "Error: Current entity context is invalid. Exiting edit mode.",
          { typeClass: "text-error" }
      );
      state.editContext = null;
      return;
    }

    if (Object.keys(entity).includes(prop)) {
      if (value.toLowerCase() === "true") {
        entity[prop] = true;
      } else if (value.toLowerCase() === "false") {
        entity[prop] = false;
      } else {
        entity[prop] = value;
      }
      state.isDirty = true;
      await OutputManager.appendToOutput(
          `Set ${prop} to "${entity[prop]}" for ${entity.name}.`,
          { typeClass: "text-success" }
      );
    } else {
      await OutputManager.appendToOutput(
          `Error: '${prop}' is not a valid property for type '${state.editContext.type}'.`,
          { typeClass: "text-error" }
      );
    }
  }

  async function _handleLink(args) {
    const { OutputManager } = dependencies;
    if (args.length < 3) {
      await OutputManager.appendToOutput(
          'Error: Invalid format. Use: link "<room1>" <direction> "<room2>"',
          { typeClass: "text-error" }
      );
      return;
    }

    const [room1Name, direction, room2Name] = args.map((arg) =>
        arg.replace(/["']/g, "")
    );

    const room1 = _findEntity("room", room1Name);
    const room2 = _findEntity("room", room2Name);

    if (!room1 || !room2) {
      await OutputManager.appendToOutput(
          "Error: One or both rooms not found.",
          { typeClass: "text-error" }
      );
      return;
    }

    const oppositeDirection = {
      north: "south",
      south: "north",
      east: "west",
      west: "east",
      up: "down",
      down: "up",
    }[direction];
    if (!oppositeDirection) {
      await OutputManager.appendToOutput(
          `Error: Invalid direction '${direction}'.`,
          { typeClass: "text-error" }
      );
      return;
    }

    room1.exits[direction] = room2.id;
    room2.exits[oppositeDirection] = room1.id;

    state.isDirty = true;
    await OutputManager.appendToOutput(
        `Linked ${room1.name} (${direction}) <-> ${room2.name} (${oppositeDirection}).`,
        { typeClass: "text-success" }
    );
  }

  async function _handleStatus() {
    const rooms = Object.keys(state.adventureData.rooms || {}).length;
    const items = Object.keys(state.adventureData.items || {}).length;
    const npcs = Object.keys(state.adventureData.npcs || {}).length;
    let status = `Adventure: ${state.adventureData.title || "Untitled"}
File: ${state.targetFilename} (${state.isDirty ? "UNSAVED CHANGES" : "saved"})
- Rooms: ${rooms}
- Items: ${items}
- NPCs: ${npcs}`;
    await dependencies.OutputManager.appendToOutput(status);
  }

  async function _handleSave() {
    const { OutputManager, UserManager, FileSystemManager } = dependencies;
    const jsonContent = JSON.stringify(state.adventureData, null, 2);
    const currentUser = UserManager.getCurrentUser().name;
    const primaryGroup = UserManager.getPrimaryGroupForUser(currentUser);

    if (!primaryGroup) {
      await OutputManager.appendToOutput(
          "Critical Error: Cannot determine primary group. Save failed.",
          { typeClass: "text-error" }
      );
      return;
    }

    const saveResult = await FileSystemManager.createOrUpdateFile(
        FileSystemManager.getAbsolutePath(state.targetFilename),
        jsonContent,
        { currentUser, primaryGroup }
    );

    if (!saveResult.success) {
      await OutputManager.appendToOutput(
          `Error saving file: ${saveResult.error}`,
          { typeClass: "text-error" }
      );
      return;
    }

    if (await FileSystemManager.save()) {
      state.isDirty = false;
      await OutputManager.appendToOutput(
          `Adventure saved successfully to '${state.targetFilename}'.`,
          { typeClass: "text-success" }
      );
    } else {
      await OutputManager.appendToOutput(
          "Critical Error: Failed to persist file system changes.",
          { typeClass: "text-error" }
      );
    }
  }

  async function _handleHelp() {
    const helpText = `Adventure Creator Commands:
  create <type> "<name>"   - Create a new room, item, or npc.
  edit <type> "<name>"     - Select an entity to modify its properties.
  edit                     - Stop editing the current entity.
  set <prop> "<value>"     - Set a property on the currently edited entity.
  link "rm1" <dir> "rm2"   - Create a two-way exit between rooms.
  status                   - Show a summary of the current adventure data.
  save                     - Save your work to the file.
  exit                     - Exit the creator (will prompt if unsaved).`;
    await dependencies.OutputManager.appendToOutput(helpText);
  }

  async function exit() {
    const { ModalManager, OutputManager } = dependencies;
    if (state.isDirty) {
      const confirmed = await new Promise((resolve) => {
        ModalManager.request({
          context: "terminal",
          messageLines: ["You have unsaved changes. Exit without saving?"],
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
          options: state.commandContext.options,
        });
      });
      if (!confirmed) {
        await OutputManager.appendToOutput("Exit cancelled.", {
          typeClass: "text-info",
        });
        return;
      }
    }

    state.isActive = false;
    ModalManager.request({
      context: "terminal",
      type: "input",
      messageLines: [""],
      onConfirm: () => {},
      onCancel: () => {},
      options: {
        scriptingContext: {
          isScripting: true,
          lines: [],
          currentLineIndex: -1,
        },
      },
    });
    await OutputManager.appendToOutput("Exiting Adventure Creator.", {
      typeClass: "text-success",
    });
  }

  return {
    enter,
    exit,
    isActive: () => state.isActive,
  };
})();