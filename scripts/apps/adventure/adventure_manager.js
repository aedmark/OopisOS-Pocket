// aedmark/oopisos-pocket/aedmark-OopisOS-Pocket-d91e0d80077fffc1759aaae04d7f4df85c8f7149/scripts/apps/adventure/adventure_manager.js
window.AdventureManager = class AdventureManager extends App {
  constructor() {
    super();
    this.state = {};
    this.dependencies = {};
    this.callbacks = {};
    this.engineLogic = null;
    this.ui = null;
  }

  async enter(appLayer, options = {}) {
    if (this.isActive) return;

    this.dependencies = options.dependencies;
    const { TextAdventureModal } = this.dependencies;
    // Pass 'this' (the manager instance) to the engine logic creator
    this.engineLogic = this._createEngineLogic(this);

    this.callbacks = {
      processCommand: this.engineLogic.processCommand.bind(this.engineLogic),
      onExitRequest: this.exit.bind(this),
    };


    this.isActive = true;
    this.engineLogic.initializeState(
        options.adventureData,
        options.scriptingContext
    );

    this.ui = new TextAdventureModal(
        this.callbacks,
        this.dependencies,
        this.state.scriptingContext
    );
    this.container = this.ui.getContainer();
    appLayer.appendChild(this.container);

    this.engineLogic.displayCurrentRoom();

    if (this.state.scriptingContext?.isScripting) {
      await this._runScript();
    } else {
      setTimeout(() => this.container.focus(), 0);
    }
  }

  async _runScript() {
    const context = this.state.scriptingContext;
    while (
        context.currentLineIndex < context.lines.length - 1 &&
        this.isActive
        ) {
      let nextCommand = await this.ui.requestInput("");
      if (nextCommand === null) break;
      await this._processCommand(nextCommand);
    }
    if (this.isActive) {
      this.exit();
    }
  }

  exit() {
    if (!this.isActive) return;
    const { AppLayerManager } = this.dependencies;
    if (this.ui) {
      this.ui.hideAndReset();
    }
    AppLayerManager.hide(this);
    this.isActive = false;
    this.state = {};
    this.ui = null;
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      this.exit();
    }
  }

  _processCommand(command) {
    return this.engineLogic.processCommand(command);
  }

  _createEngineLogic(manager) {
    const defaultVerbs = {
      look: { action: "look", aliases: ["l", "examine", "x", "look at", "look in", "look inside"] },
      go: { action: "go", aliases: ["north", "south", "east", "west", "up", "down", "n", "s", "e", "w", "u", "d", "enter", "exit"] },
      take: { action: "take", aliases: ["get", "grab", "pick up"] },
      drop: { action: "drop", aliases: [] },
      use: { action: "use", aliases: [] },
      inventory: { action: "inventory", aliases: ["i", "inv"] },
      help: { action: "help", aliases: ["?"] },
      quit: { action: "quit", aliases: [] },
      save: { action: "save", aliases: [] },
      load: { action: "load", aliases: [] },
      talk: { action: "talk", aliases: ["talk to", "speak to", "speak with"] },
      ask: { action: "ask", aliases: [] },
      give: { action: "give", aliases: [] },
      show: { action: "show", aliases: ["show to"] },
      score: { action: "score", aliases: [] },
      read: { action: "read", aliases: [] },
      eat: { action: "eat", aliases: [] },
      drink: { action: "drink", aliases: [] },
      push: { action: "push", aliases: [] },
      pull: { action: "pull", aliases: [] },
      turn: { action: "turn", aliases: [] },
      wear: { action: "wear", aliases: [] },
      remove: { action: "remove", aliases: ["take off"] },
      listen: { action: "listen", aliases: [] },
      smell: { action: "smell", aliases: [] },
      touch: { action: "touch", aliases: [] },
      again: { action: "again", aliases: ["g"] },
      wait: { action: "wait", aliases: ["z"] },
      dance: { action: "dance", aliases: [] },
      sing: { action: "sing", aliases: [] },
      jump: { action: "jump", aliases: [] },
      open: { action: "open", aliases: [] },
      close: { action: "close", aliases: [] },
      unlock: { action: "unlock", aliases: [] },
      lock: { action: "lock", aliases: [] },
      light: { action: "light", aliases: [] },
      put: { action: "put", aliases: [] },
    };

    const engine = {
      initializeState: (adventureData, scriptingContext) => {
        const adventure = JSON.parse(JSON.stringify(adventureData));
        const startingRoom = adventure.rooms[adventure.startingRoomId];
        const initialScore = startingRoom && startingRoom.points ? startingRoom.points : 0;
        manager.state = {
          adventure,
          player: {
            currentLocation: adventure.startingRoomId,
            inventory: adventure.player?.inventory || [],
            score: initialScore,
            moves: 0,
          },
          scriptingContext: scriptingContext || null,
          disambiguationContext: null,
          lastReferencedItemId: null,
          lastPlayerCommand: "",
        };
        manager.state.adventure.verbs = { ...defaultVerbs, ...adventure.verbs };
        manager.state.adventure.npcs = manager.state.adventure.npcs || {};
        manager.state.adventure.daemons = manager.state.adventure.daemons || {};

        if (manager.state.adventure.winCondition)
          manager.state.adventure.winCondition.triggered = false;
        for (const roomId in manager.state.adventure.rooms)
          manager.state.adventure.rooms[roomId].visited = false;
      },

      _getItemsInLocation: (locationId) => {
        const items = [];
        for (const id in manager.state.adventure.items) {
          if (manager.state.adventure.items[id].location === locationId) {
            items.push(manager.state.adventure.items[id]);
          }
        }
        return items;
      },

      _getNpcsInLocation: (locationId) => {
        const npcs = [];
        for (const id in manager.state.adventure.npcs) {
          if (manager.state.adventure.npcs[id].location === locationId) {
            npcs.push(manager.state.adventure.npcs[id]);
          }
        }
        return npcs;
      },

      _getDynamicDescription: (entity) => {
        if (
            entity.descriptions &&
            entity.state &&
            entity.descriptions[entity.state]
        ) {
          return entity.descriptions[entity.state];
        }
        return entity.description;
      },

      _hasLightSource: () => {
        return manager.state.player.inventory.some((itemId) => {
          const item = manager.state.adventure.items[itemId];
          return item && item.isLightSource && item.isLit;
        });
      },

      displayCurrentRoom: () => {
        const room =
            manager.state.adventure.rooms[manager.state.player.currentLocation];
        if (!room) {
          manager.ui.appendOutput(
              "Error: You have fallen into the void. The game cannot continue.",
              "error"
          );
          return;
        }

        if (room.isDark && !engine._hasLightSource()) {
          manager.ui.updateStatusLine(
              room.name,
              manager.state.player.score,
              manager.state.player.moves
          );
          manager.ui.appendOutput(
              "It is pitch black. You are likely to be eaten by a grue.",
              "room-desc"
          );
          return;
        }

        if (!room.visited) {
          room.visited = true;
          const roomPoints = room.points || 0;
          if (roomPoints > 0) {
            manager.state.player.score += roomPoints;
            manager.ui.appendOutput(
                `[You have gained ${roomPoints} points for entering a new area]`,
                "system"
            );
          }
        }

        manager.ui.updateStatusLine(
            room.name,
            manager.state.player.score,
            manager.state.player.moves
        );
        manager.ui.appendOutput(
            engine._getDynamicDescription(room),
            "room-desc"
        );

        const roomNpcs = engine._getNpcsInLocation(
            manager.state.player.currentLocation
        );
        if (roomNpcs.length > 0) {
          roomNpcs.forEach((npc) => {
            manager.ui.appendOutput(
                `You see ${npc.name} here.`,
                "items"
            );
          });
        }

        const roomItems = engine._getItemsInLocation(
            manager.state.player.currentLocation
        );
        if (roomItems.length > 0) {
          manager.ui.appendOutput(
              "You see here: " +
              roomItems.map((item) => item.name).join(", ") +
              ".",
              "items"
          );
        }

        const exitNames = Object.keys(room.exits || {});
        if (exitNames.length > 0) {
          manager.ui.appendOutput(
              "Exits: " + exitNames.join(", ") + ".",
              "exits"
          );
        } else {
          manager.ui.appendOutput(
              "There are no obvious exits.",
              "exits"
          );
        }
      },

      processCommand: async (command) => {
        if (!command) return;

        if (manager.state.disambiguationContext) {
          engine._handleDisambiguation(command.toLowerCase().trim());
          return;
        }

        let commandToProcess = command.toLowerCase().trim();

        if (commandToProcess === "again" || commandToProcess === "g") {
          if (!manager.state.lastPlayerCommand) {
            manager.ui.appendOutput("You haven't entered a command to repeat yet.","error");
            return;
          }
          manager.ui.appendOutput(`(repeating: ${manager.state.lastPlayerCommand})`,"system");
          commandToProcess = manager.state.lastPlayerCommand;
        } else {
          manager.state.lastPlayerCommand = commandToProcess;
        }
        const metaCommands = ["save", "load", "score", "help", "quit", "inventory", "again"];
        const parsedAction = engine._parseSingleCommand(commandToProcess);
        if (parsedAction.verb && !metaCommands.includes(parsedAction.verb.action)) {
          manager.state.player.moves++;
        } else if (!parsedAction.verb && commandToProcess) {
          // Increment for unknown commands
          manager.state.player.moves++;
        }

        // Always update the status line after a move is registered.
        manager.ui.updateStatusLine(
            manager.state.adventure.rooms[manager.state.player.currentLocation].name,
            manager.state.player.score,
            manager.state.player.moves
        );

        const parsedCommands = engine._parseMultiCommand(commandToProcess);
        let stopProcessing = false;

        for (const cmd of parsedCommands) {
          if (stopProcessing) break;

          if (cmd.error) {
            manager.ui.appendOutput(cmd.error, "error");
            break;
          }

          const { verb, directObject, indirectObject } = cmd;
          const onDisambiguation = () => {
            stopProcessing = true;
          };

          switch (verb.action) {
            case "look": engine._handleLook(directObject, onDisambiguation); break;
            case "go": engine._handleGo(directObject); break;
            case "take": engine._handleTake(directObject, onDisambiguation); break;
            case "drop": engine._handleDrop(directObject, onDisambiguation); break;
            case "use": engine._handleUse(directObject, indirectObject, onDisambiguation); break;
            case "open": engine._handleOpen(directObject, onDisambiguation); break;
            case "close": engine._handleClose(directObject, onDisambiguation); break;
            case "unlock": engine._handleUnlock(directObject, indirectObject, onDisambiguation); break;
            case "inventory": engine._handleInventory(); break;
            case "help": engine._handleHelp(); break;
            case "quit": manager.exit(); stopProcessing = true; break;
            case "save": await engine._handleSave(directObject); break;
            case "load": await engine._handleLoad(directObject); break;
            case "talk": engine._handleTalk(directObject, onDisambiguation); break;
            case "ask": engine._handleAsk(directObject, indirectObject, onDisambiguation); break;
            case "give": engine._handleGive(directObject, indirectObject, onDisambiguation); break;
            case "show": engine._handleShow(directObject, indirectObject, onDisambiguation); break;
            case "score": engine._handleScore(); break;
            case "read": engine._handleRead(directObject, onDisambiguation); break;
            case "eat": engine._handleEatDrink("eat", directObject, onDisambiguation); break;
            case "drink": engine._handleEatDrink("drink", directObject, onDisambiguation); break;
            case "push": engine._handlePushPullTurn("push", directObject, onDisambiguation); break;
            case "pull": engine._handlePushPullTurn("pull", directObject, onDisambiguation); break;
            case "turn": engine._handlePushPullTurn("turn", directObject, onDisambiguation); break;
            case "wear": engine._handleWearRemove("wear", directObject, onDisambiguation); break;
            case "remove": engine._handleWearRemove("remove", directObject, onDisambiguation); break;
            case "listen": engine._handleSensoryVerb("listen", directObject, onDisambiguation); break;
            case "smell": engine._handleSensoryVerb("smell", directObject, onDisambiguation); break;
            case "touch": engine._handleSensoryVerb("touch", directObject, onDisambiguation); break;
            case "wait": engine._handleWait(); break;
            case "dance": manager.ui.appendOutput("You do a little jig. You feel refreshed.", "system"); break;
            case "sing": manager.ui.appendOutput("You belt out a sea shanty. A nearby bird looks annoyed.", "system"); break;
            case "jump": manager.ui.appendOutput("You jump on the spot. Whee!", "system"); break;
            case "light": engine._handleLight(directObject, onDisambiguation); break;
            default: manager.ui.appendOutput(`I don't know how to "${verb.action}".`, "error"); stopProcessing = true;
          }

          if (!stopProcessing) {
            engine._processDaemons();
            engine._checkWinConditions();
            if (parsedCommands.length > 1) {
              await new Promise((resolve) => setTimeout(resolve, 350));
            }
          }
        }
      },

      _parseSingleCommand: (command, defaultVerb = null) => {
        const originalWords = command
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        const resolvedWords = originalWords.map((word) => {
          if (word === "it") {
            if (
                manager.state.lastReferencedItemId &&
                manager.state.adventure.items[manager.state.lastReferencedItemId]
            ) {
              return manager.state.adventure.items[manager.state.lastReferencedItemId]
                  .noun;
            }
            return "IT_ERROR_NO_REF";
          }
          return word;
        });

        if (resolvedWords.includes("IT_ERROR_NO_REF")) {
          return {
            error:
                "You haven't referred to anything yet. What do you mean by 'it'?",
          };
        }

        let verb = null;
        let verbWordCount = 0;

        for (let i = Math.min(resolvedWords.length, 3); i > 0; i--) {
          const potentialVerbPhrase = resolvedWords.slice(0, i).join(" ");
          const resolvedVerb = engine._resolveVerb(potentialVerbPhrase);
          if (resolvedVerb) {
            verb = resolvedVerb;
            verbWordCount = i;
            break;
          }
        }

        if (!verb) {
          if (defaultVerb) {
            verb = defaultVerb;
            verbWordCount = 0;
          } else if (resolvedWords.length === 1) {
            const potentialGoVerb = engine._resolveVerb(resolvedWords[0]);
            if (potentialGoVerb && potentialGoVerb.action === "go") {
              return {
                verb: potentialGoVerb,
                directObject: resolvedWords[0],
                indirectObject: null,
              };
            }
          } else {
            return {
              verb: null,
              error: `I don't understand the verb in "${command}".`,
            };
          }
        }

        const remainingWords = resolvedWords.slice(verbWordCount);
        const prepositions = ["on", "in", "at", "with", "using", "to", "under", "about"];
        let directObject;
        let indirectObject = null;
        let prepositionIndex = -1;

        for (const prep of prepositions) {
          const index = remainingWords.indexOf(prep);
          if (index !== -1) {
            prepositionIndex = index;
            break;
          }
        }

        const articles = new Set(["a", "an", "the"]);
        if (prepositionIndex !== -1) {
          directObject = remainingWords
              .slice(0, prepositionIndex)
              .filter((w) => !articles.has(w))
              .join(" ");
          indirectObject = remainingWords
              .slice(prepositionIndex + 1)
              .filter((w) => !articles.has(w))
              .join(" ");
        } else {
          directObject = remainingWords
              .filter((w) => !articles.has(w))
              .join(" ");
        }

        return { verb, directObject, indirectObject };
      },

      _parseMultiCommand: (command) => {
        const commands = [];
        const separator = ";;;";
        const commandString = command
            .toLowerCase()
            .trim()
            .replace(/\s*,\s*and\s*|\s*,\s*|\s+and\s+|\s+then\s+/g, separator);
        const commandQueue = commandString
            .split(separator)
            .filter((c) => c.trim());

        let lastVerb = null;
        for (const subCommandStr of commandQueue) {
          const parsed = engine._parseSingleCommand(subCommandStr, lastVerb);
          if (parsed.verb) {
            commands.push(parsed);
            const firstWord = subCommandStr.split(/\s+/)[0];
            if (engine._resolveVerb(firstWord)) {
              lastVerb = parsed.verb;
            }
          } else {
            commands.push({
              error: parsed.error || `I don't understand "${subCommandStr}".`,
            });
            break;
          }
        }
        return commands;
      },

      _resolveVerb: (verbWord) => {
        if (!verbWord) return null;
        for (const verbKey in manager.state.adventure.verbs) {
          const verbDef = manager.state.adventure.verbs[verbKey];
          if (verbKey === verbWord || verbDef.aliases?.includes(verbWord)) {
            return verbDef;
          }
        }
        return null;
      },

      _findItem: (targetString, scope) => {
        if (!targetString) return { found: [] };
        const targetWords = new Set(
            targetString.toLowerCase().split(/\s+/).filter(Boolean)
        );
        if (targetWords.size === 0) return { found: [] };

        const potentialItems = [];
        for (const item of scope) {
          const itemAdjectives = new Set(
              item.adjectives?.map((a) => a.toLowerCase())
          );
          const itemNoun = item.noun.toLowerCase();
          let score = 0;

          if (targetWords.has(itemNoun)) {
            score += 10;
            targetWords.forEach((word) => {
              if (itemAdjectives.has(word)) score += 1;
            });
          }

          if (score > 0) potentialItems.push({ item, score });
        }

        if (potentialItems.length === 0) return { found: [] };

        potentialItems.sort((a, b) => b.score - a.score);
        const topScore = potentialItems[0].score;
        const foundItems = potentialItems
            .filter((p) => p.score === topScore)
            .map((p) => p.item);
        const exactMatch =
            foundItems.length === 1 && targetString === foundItems[0].noun;

        return { found: foundItems, exactMatch };
      },

      _handleDisambiguation: (response) => {
        const { found, context } = manager.state.disambiguationContext;
        const result = engine._findItem(response, found);
        manager.state.disambiguationContext = null;

        if (result.found.length === 1) {
          context.callback(result.found[0]);
        } else {
          manager.ui.appendOutput(
              "That's still not specific enough. Please try again.",
              "info"
          );
        }
      },

      _handleGo: (direction) => {
        const room =
            manager.state.adventure.rooms[manager.state.player.currentLocation];
        const exitId = room.exits ? room.exits[direction] : null;

        if (!exitId) {
          manager.ui.appendOutput("You can't go that way.", "error");
          return;
        }

        const exitBlocker = Object.values(manager.state.adventure.items).find(
            (item) =>
                item.location === manager.state.player.currentLocation &&
                item.blocksExit &&
                item.blocksExit[direction]
        );
        if (exitBlocker && (!exitBlocker.isOpenable || !exitBlocker.isOpen)) {
          manager.ui.appendOutput(
              exitBlocker.lockedMessage ||
              `The way is blocked by the ${exitBlocker.name}.`
          );
          return;
        }

        if (manager.state.adventure.rooms[exitId]) {
          manager.state.player.currentLocation = exitId;
          engine.displayCurrentRoom();
        } else {
          manager.ui.appendOutput("You can't go that way.", "error");
        }
      },
      _checkWinConditions: () => {
        const wc = manager.state.adventure.winCondition;
        if (!wc || wc.triggered) return;

        let won = false;
        if (
            wc.type === "itemInRoom" &&
            manager.state.adventure.items[wc.itemId]?.location === wc.roomId
        ) {
          won = true;
        } else if (
            wc.type === "playerHasItem" &&
            manager.state.player.inventory.includes(wc.itemId)
        ) {
          won = true;
        } else if (wc.type === "itemUsedOn" && wc.triggeredByUse) {
          won = true;
        }

        if (won) {
          wc.triggered = true;
          manager.ui.appendOutput(
              `\n${manager.state.adventure.winMessage}`,
              "adv-success"
          );
          if (manager.container.querySelector("#adventure-input")) {
            manager.container.querySelector("#adventure-input").disabled = true;
          }
        }
      },

      _handleLook: (target, onDisambiguation) => {
        if (!target || target === "around") {
          engine.displayCurrentRoom();
          return;
        }

        const scope = [
          ...engine._getItemsInLocation(manager.state.player.currentLocation),
          ...manager.state.player.inventory.map(id => manager.state.adventure.items[id]),
          ...engine._getNpcsInLocation(manager.state.player.currentLocation)
        ];

        const result = engine._findItem(target, scope);

        if (result.found.length === 0) {
          manager.ui.appendOutput("You don't see that here.", "error");
        } else if (result.found.length > 1) {
          manager.ui.appendOutput(`Which ${target} do you mean?`, "info");
          manager.state.disambiguationContext = {
            found: result.found,
            context: {
              callback: (item) => engine._handleLook(item.noun, onDisambiguation)
            }
          };
          onDisambiguation();
        } else {
          const entity = result.found[0];
          manager.ui.appendOutput(engine._getDynamicDescription(entity));
          if (entity.isContainer && entity.isOpen && entity.contains) {
            if (entity.contains.length > 0) {
              const contents = entity.contains.map(id => manager.state.adventure.items[id].name).join(", ");
              manager.ui.appendOutput(`Inside, you see: ${contents}.`);
            } else {
              manager.ui.appendOutput("It is empty.");
            }
          }
        }
      },

      _handleTake: (target, onDisambiguation) => {
        const scope = engine._getItemsInLocation(manager.state.player.currentLocation);
        const result = engine._findItem(target, scope);

        if (result.found.length === 0) {
          manager.ui.appendOutput("You don't see that here.", "error");
        } else if (result.found.length > 1) {
          manager.ui.appendOutput(`Which ${target} do you mean?`, "info");
          manager.state.disambiguationContext = {
            found: result.found,
            context: {
              callback: (item) => engine._handleTake(item.noun, onDisambiguation)
            }
          };
          onDisambiguation();
        } else {
          const item = result.found[0];
          if (!item.canTake) {
            manager.ui.appendOutput("You can't take that.", "error");
            return;
          }
          item.location = "player";
          manager.state.player.inventory.push(item.id);
          manager.ui.appendOutput(`You take the ${item.name}.`);

          // Check for and award points
          if (item.points) {
            manager.state.player.score += item.points;
            manager.ui.appendOutput(`[Your score has gone up by ${item.points} points!]`, "system");
            delete item.points; // Prevent scoring again
            manager.ui.updateStatusLine(
                manager.state.adventure.rooms[manager.state.player.currentLocation].name,
                manager.state.player.score,
                manager.state.player.moves
            );
          }
        }
      },

      _handleDrop: (target, onDisambiguation) => {
        const scope = manager.state.player.inventory.map(id => manager.state.adventure.items[id]);
        const result = engine._findItem(target, scope);

        if (result.found.length === 0) {
          manager.ui.appendOutput("You don't have that.", "error");
        } else if (result.found.length > 1) {
          manager.ui.appendOutput(`Which ${target} do you mean?`, "info");
          manager.state.disambiguationContext = {
            found: result.found,
            context: {
              callback: (item) => engine._handleDrop(item.noun, onDisambiguation)
            }
          };
          onDisambiguation();
        } else {
          const item = result.found[0];
          item.location = manager.state.player.currentLocation;
          manager.state.player.inventory = manager.state.player.inventory.filter(id => id !== item.id);
          manager.ui.appendOutput(`You drop the ${item.name}.`);
        }
      },

      _handleInventory: () => {
        if (manager.state.player.inventory.length === 0) {
          manager.ui.appendOutput("You are carrying nothing.");
        } else {
          const inventoryList = manager.state.player.inventory.map(id => manager.state.adventure.items[id].name).join("\n");
          manager.ui.appendOutput("You are carrying:\n" + inventoryList);
        }
      },
      _handleUse: (_directObject, _indirectObject, _onDisambiguation) => manager.ui.appendOutput("You can't use that."),
      _handleOpen: (_directObject, _onDisambiguation) => manager.ui.appendOutput("You can't open that."),
      _handleClose: (_directObject, _onDisambiguation) => manager.ui.appendOutput("You can't close that."),
      _handleUnlock: (_directObject, _indirectObject, _onDisambiguation) => manager.ui.appendOutput("You can't unlock that."),
      _handleHelp: () => manager.ui.appendOutput("Try commands like 'look', 'go north', 'take key', etc."),
      _handleSave: async (_directObject) => manager.ui.appendOutput("Saving is not yet implemented."),
      _handleLoad: async (_directObject) => manager.ui.appendOutput("Loading is not yet implemented."),
      _handleTalk: (_directObject, _onDisambiguation) => manager.ui.appendOutput("There's no one to talk to."),
      _handleAsk: (_directObject, _indirectObject, _onDisambiguation) => manager.ui.appendOutput("There's no one to ask."),
      _handleGive: (_directObject, _indirectObject, _onDisambiguation) => manager.ui.appendOutput("There's no one to give that to."),
      _handleShow: (_directObject, _indirectObject, _onDisambiguation) => manager.ui.appendOutput("There's no one to show that to."),
      _handleScore: () => manager.ui.appendOutput(`Your score is ${manager.state.player.score}.`),
      _handleRead: (_directObject, _onDisambiguation) => manager.ui.appendOutput("There's nothing to read."),
      _handleEatDrink: (_verb, _directObject, _onDisambiguation) => manager.ui.appendOutput("You can't do that."),
      _handlePushPullTurn: (_verb, _directObject, _onDisambiguation) => manager.ui.appendOutput("Nothing happens."),
      _handleWearRemove: (_verb, _directObject, _onDisambiguation) => manager.ui.appendOutput("You can't do that."),
      _handleSensoryVerb: (_verb, _directObject, _onDisambiguation) => manager.ui.appendOutput("You don't notice anything special."),
      _handleWait: () => manager.ui.appendOutput("Time passes."),
      _handleLight: (_directObject, _onDisambiguation) => manager.ui.appendOutput("You can't light that."),
      _processDaemons: () => {},
    };

    return engine;
  }
}