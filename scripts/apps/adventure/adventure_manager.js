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
    this.callbacks = {
      processCommand: this._processCommand.bind(this),
      onExitRequest: this.exit.bind(this),
    };
    this.engineLogic = this._createEngineLogic();

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

  _createEngineLogic() {
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
        this.state = {
          adventure,
          player: {
            currentLocation: adventure.startingRoomId,
            inventory: adventure.player?.inventory || [],
            score: 0,
            moves: 0,
          },
          scriptingContext: scriptingContext || null,
          disambiguationContext: null,
          lastReferencedItemId: null,
          lastPlayerCommand: "",
        };
        this.state.adventure.verbs = { ...defaultVerbs, ...adventure.verbs };
        this.state.adventure.npcs = this.state.adventure.npcs || {};
        this.state.adventure.daemons = this.state.adventure.daemons || {};

        if (this.state.adventure.winCondition)
          this.state.adventure.winCondition.triggered = false;
        for (const roomId in this.state.adventure.rooms)
          this.state.adventure.rooms[roomId].visited = false;
      },

      _getItemsInLocation: (locationId) => {
        const items = [];
        for (const id in this.state.adventure.items) {
          if (this.state.adventure.items[id].location === locationId) {
            items.push(this.state.adventure.items[id]);
          }
        }
        return items;
      },

      _getNpcsInLocation: (locationId) => {
        const npcs = [];
        for (const id in this.state.adventure.npcs) {
          if (this.state.adventure.npcs[id].location === locationId) {
            npcs.push(this.state.adventure.npcs[id]);
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
        return this.state.player.inventory.some((itemId) => {
          const item = this.state.adventure.items[itemId];
          return item && item.isLightSource && item.isLit;
        });
      },

      displayCurrentRoom: () => {
        const room =
            this.state.adventure.rooms[this.state.player.currentLocation];
        if (!room) {
          this.ui.appendOutput(
              "Error: You have fallen into the void. The game cannot continue.",
              "error"
          );
          return;
        }

        if (room.isDark && !engine._hasLightSource()) {
          this.ui.updateStatusLine(
              room.name,
              this.state.player.score,
              this.state.player.moves
          );
          this.ui.appendOutput(
              "It is pitch black. You are likely to be eaten by a grue.",
              "room-desc"
          );
          return;
        }

        if (!room.visited) {
          room.visited = true;
          const roomPoints = room.points || 0;
          if (roomPoints > 0) {
            this.state.player.score += roomPoints;
            this.ui.appendOutput(
                `[You have gained ${roomPoints} points for entering a new area]`,
                "system"
            );
          }
        }

        this.ui.updateStatusLine(
            room.name,
            this.state.player.score,
            this.state.player.moves
        );
        this.ui.appendOutput(
            engine._getDynamicDescription(room),
            "room-desc"
        );

        const roomNpcs = engine._getNpcsInLocation(
            this.state.player.currentLocation
        );
        if (roomNpcs.length > 0) {
          roomNpcs.forEach((npc) => {
            this.ui.appendOutput(
                `You see ${npc.name} here.`,
                "items"
            );
          });
        }

        const roomItems = engine._getItemsInLocation(
            this.state.player.currentLocation
        );
        if (roomItems.length > 0) {
          this.ui.appendOutput(
              "You see here: " +
              roomItems.map((item) => item.name).join(", ") +
              ".",
              "items"
          );
        }

        const exitNames = Object.keys(room.exits || {});
        if (exitNames.length > 0) {
          this.ui.appendOutput(
              "Exits: " + exitNames.join(", ") + ".",
              "exits"
          );
        } else {
          this.ui.appendOutput(
              "There are no obvious exits.",
              "exits"
          );
        }
      },

      processCommand: async (command) => {
        if (!command) return;

        if (this.state.disambiguationContext) {
          this._handleDisambiguation(command.toLowerCase().trim());
          return;
        }

        let commandToProcess = command.toLowerCase().trim();

        if (commandToProcess === "again" || commandToProcess === "g") {
          if (!this.state.lastPlayerCommand) {
            this.ui.appendOutput("You haven't entered a command to repeat yet.","error");
            return;
          }
          this.ui.appendOutput(`(repeating: ${this.state.lastPlayerCommand})`,"system");
          commandToProcess = this.state.lastPlayerCommand;
        } else {
          this.state.lastPlayerCommand = commandToProcess;
        }
        this.state.player.moves++;
        const parsedCommands = this._parseMultiCommand(commandToProcess);
        let stopProcessing = false;

        for (const cmd of parsedCommands) {
          if (stopProcessing) break;

          if (cmd.error) {
            this.ui.appendOutput(cmd.error, "error");
            break;
          }

          const { verb, directObject, indirectObject } = cmd;
          const onDisambiguation = () => {
            stopProcessing = true;
          };

          switch (verb.action) {
            case "look": this._handleLook(directObject, onDisambiguation); break;
            case "go": this._handleGo(directObject); break;
            case "take": this._handleTake(directObject, onDisambiguation); break;
            case "drop": this._handleDrop(directObject, onDisambiguation); break;
            case "use": this._handleUse(directObject, indirectObject, onDisambiguation); break;
            case "open": this._handleOpen(directObject, onDisambiguation); break;
            case "close": this._handleClose(directObject, onDisambiguation); break;
            case "unlock": this._handleUnlock(directObject, indirectObject, onDisambiguation); break;
            case "inventory": this._handleInventory(); break;
            case "help": this._handleHelp(); break;
            case "quit": this.exit(); stopProcessing = true; break;
            case "save": await this._handleSave(directObject); break;
            case "load": await this._handleLoad(directObject); break;
            case "talk": this._handleTalk(directObject, onDisambiguation); break;
            case "ask": this._handleAsk(directObject, indirectObject, onDisambiguation); break;
            case "give": this._handleGive(directObject, indirectObject, onDisambiguation); break;
            case "show": this._handleShow(directObject, indirectObject, onDisambiguation); break;
            case "score": this._handleScore(); break;
            case "read": this._handleRead(directObject, onDisambiguation); break;
            case "eat": this._handleEatDrink("eat", directObject, onDisambiguation); break;
            case "drink": this._handleEatDrink("drink", directObject, onDisambiguation); break;
            case "push": this._handlePushPullTurn("push", directObject, onDisambiguation); break;
            case "pull": this._handlePushPullTurn("pull", directObject, onDisambiguation); break;
            case "turn": this._handlePushPullTurn("turn", directObject, onDisambiguation); break;
            case "wear": this._handleWearRemove("wear", directObject, onDisambiguation); break;
            case "remove": this._handleWearRemove("remove", directObject, onDisambiguation); break;
            case "listen": this._handleSensoryVerb("listen", directObject, onDisambiguation); break;
            case "smell": this._handleSensoryVerb("smell", directObject, onDisambiguation); break;
            case "touch": this._handleSensoryVerb("touch", directObject, onDisambiguation); break;
            case "wait": this._handleWait(); break;
            case "dance": this.ui.appendOutput("You do a little jig. You feel refreshed.", "system"); break;
            case "sing": this.ui.appendOutput("You belt out a sea shanty. A nearby bird looks annoyed.", "system"); break;
            case "jump": this.ui.appendOutput("You jump on the spot. Whee!", "system"); break;
            case "light": this._handleLight(directObject, onDisambiguation); break;
            default: this.ui.appendOutput(`I don't know how to "${verb.action}".`, "error"); stopProcessing = true;
          }

          if (!stopProcessing) {
            this._processDaemons();
            this._checkWinConditions();
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
                this.state.lastReferencedItemId &&
                this.state.adventure.items[this.state.lastReferencedItemId]
            ) {
              return this.state.adventure.items[this.state.lastReferencedItemId]
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
          const resolvedVerb = this._resolveVerb(potentialVerbPhrase);
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
            const potentialGoVerb = this._resolveVerb(resolvedWords[0]);
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
          const parsed = this._parseSingleCommand(subCommandStr, lastVerb);
          if (parsed.verb) {
            commands.push(parsed);
            const firstWord = subCommandStr.split(/\s+/)[0];
            if (this._resolveVerb(firstWord)) {
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
        for (const verbKey in this.state.adventure.verbs) {
          const verbDef = this.state.adventure.verbs[verbKey];
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
        const { found, context } = this.state.disambiguationContext;
        const result = this._findItem(response, found);
        this.state.disambiguationContext = null;

        if (result.found.length === 1) {
          context.callback(result.found[0]);
        } else {
          this.ui.appendOutput(
              "That's still not specific enough. Please try again.",
              "info"
          );
        }
      },

      _handleGo: (direction) => {
        const room =
            this.state.adventure.rooms[this.state.player.currentLocation];
        const exitId = room.exits ? room.exits[direction] : null;

        if (!exitId) {
          this.ui.appendOutput("You can't go that way.", "error");
          return;
        }

        const exitBlocker = Object.values(this.state.adventure.items).find(
            (item) =>
                item.location === this.state.player.currentLocation &&
                item.blocksExit &&
                item.blocksExit[direction]
        );
        if (exitBlocker && (!exitBlocker.isOpenable || !exitBlocker.isOpen)) {
          this.ui.appendOutput(
              exitBlocker.lockedMessage ||
              `The way is blocked by the ${exitBlocker.name}.`
          );
          return;
        }

        if (this.state.adventure.rooms[exitId]) {
          this.state.player.currentLocation = exitId;
          this.displayCurrentRoom();
        } else {
          this.ui.appendOutput("You can't go that way.", "error");
        }
      },
      _checkWinConditions: () => {
        const wc = this.state.adventure.winCondition;
        if (!wc || wc.triggered) return;

        let won = false;
        if (
            wc.type === "itemInRoom" &&
            this.state.adventure.items[wc.itemId]?.location === wc.roomId
        ) {
          won = true;
        } else if (
            wc.type === "playerHasItem" &&
            this.state.player.inventory.includes(wc.itemId)
        ) {
          won = true;
        } else if (wc.type === "itemUsedOn" && wc.triggeredByUse) {
          won = true;
        }

        if (won) {
          wc.triggered = true;
          this.ui.appendOutput(
              `\n${this.state.adventure.winMessage}`,
              "adv-success"
          );
          if (this.container.querySelector("#adventure-input")) {
            this.container.querySelector("#adventure-input").disabled = true;
          }
        }
      },

      _handleLook: (target, onDisambiguation) => {
        if (!target || target === "around") {
          this.displayCurrentRoom();
          return;
        }

        const scope = [
          ...this._getItemsInLocation(this.state.player.currentLocation),
          ...this.state.player.inventory.map(id => this.state.adventure.items[id]),
          ...this._getNpcsInLocation(this.state.player.currentLocation)
        ];

        const result = this._findItem(target, scope);

        if (result.found.length === 0) {
          this.ui.appendOutput("You don't see that here.", "error");
        } else if (result.found.length > 1) {
          this.ui.appendOutput(`Which ${target} do you mean?`, "info");
        } else {
          const entity = result.found[0];
          this.ui.appendOutput(this._getDynamicDescription(entity));
          if (entity.isContainer && entity.isOpen && entity.contains) {
            if (entity.contains.length > 0) {
              const contents = entity.contains.map(id => this.state.adventure.items[id].name).join(", ");
              this.ui.appendOutput(`Inside, you see: ${contents}.`);
            } else {
              this.ui.appendOutput("It is empty.");
            }
          }
        }
      },

      _handleTake: (target, onDisambiguation) => {
        const scope = this._getItemsInLocation(this.state.player.currentLocation);
        const result = this._findItem(target, scope);

        if (result.found.length === 0) {
          this.ui.appendOutput("You don't see that here.", "error");
        } else if (result.found.length > 1) {
          this.ui.appendOutput(`Which ${target} do you mean?`, "info");
        } else {
          const item = result.found[0];
          if (!item.canTake) {
            this.ui.appendOutput("You can't take that.", "error");
            return;
          }
          item.location = "player";
          this.state.player.inventory.push(item.id);
          this.ui.appendOutput(`You take the ${item.name}.`);
        }
      },

      _handleDrop: (target, onDisambiguation) => {
        const scope = this.state.player.inventory.map(id => this.state.adventure.items[id]);
        const result = this._findItem(target, scope);

        if (result.found.length === 0) {
          this.ui.appendOutput("You don't have that.", "error");
        } else if (result.found.length > 1) {
          this.ui.appendOutput(`Which ${target} do you mean?`, "info");
        } else {
          const item = result.found[0];
          item.location = this.state.player.currentLocation;
          this.state.player.inventory = this.state.player.inventory.filter(id => id !== item.id);
          this.ui.appendOutput(`You drop the ${item.name}.`);
        }
      },

      _handleInventory: () => {
        if (this.state.player.inventory.length === 0) {
          this.ui.appendOutput("You are carrying nothing.");
        } else {
          const inventoryList = this.state.player.inventory.map(id => this.state.adventure.items[id].name).join("\n");
          this.ui.appendOutput("You are carrying:\n" + inventoryList);
        }
      },
      _handleUse: (directObject, indirectObject, onDisambiguation) => this.ui.appendOutput("You can't use that."),
      _handleOpen: (directObject, onDisambiguation) => this.ui.appendOutput("You can't open that."),
      _handleClose: (directObject, onDisambiguation) => this.ui.appendOutput("You can't close that."),
      _handleUnlock: (directObject, indirectObject, onDisambiguation) => this.ui.appendOutput("You can't unlock that."),
      _handleHelp: () => this.ui.appendOutput("Try commands like 'look', 'go north', 'take key', etc."),
      _handleSave: async (directObject) => this.ui.appendOutput("Saving is not yet implemented."),
      _handleLoad: async (directObject) => this.ui.appendOutput("Loading is not yet implemented."),
      _handleTalk: (directObject, onDisambiguation) => this.ui.appendOutput("There's no one to talk to."),
      _handleAsk: (directObject, indirectObject, onDisambiguation) => this.ui.appendOutput("There's no one to ask."),
      _handleGive: (directObject, indirectObject, onDisambiguation) => this.ui.appendOutput("There's no one to give that to."),
      _handleShow: (directObject, indirectObject, onDisambiguation) => this.ui.appendOutput("There's no one to show that to."),
      _handleScore: () => this.ui.appendOutput(`Your score is ${this.state.player.score}.`),
      _handleRead: (directObject, onDisambiguation) => this.ui.appendOutput("There's nothing to read."),
      _handleEatDrink: (verb, directObject, onDisambiguation) => this.ui.appendOutput("You can't do that."),
      _handlePushPullTurn: (verb, directObject, onDisambiguation) => this.ui.appendOutput("Nothing happens."),
      _handleWearRemove: (verb, directObject, onDisambiguation) => this.ui.appendOutput("You can't do that."),
      _handleSensoryVerb: (verb, directObject, onDisambiguation) => this.ui.appendOutput("You don't notice anything special."),
      _handleWait: () => this.ui.appendOutput("Time passes."),
      _handleLight: (directObject, onDisambiguation) => this.ui.appendOutput("You can't light that."),
      _processDaemons: () => {},
    };

    return engine;
  }
}