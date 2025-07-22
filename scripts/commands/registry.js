// scripts/commands/registry.js
class RegistryCommand extends Command {
  constructor() {
    super({
      commandName: "registry",
      description: "Manages the OopisOS system registry.",
      helpText: `Usage: registry <get|set|delete> <key> [value]
      Provides an interface to the OopisOS system registry.
      DESCRIPTION
      The registry command allows for direct interaction with the system's
      key-value store, which holds persistent configuration settings.
      ACTIONS
      get <key>
      Retrieves the value associated with the specified key.
      set <key> <value>
      Sets the specified key to the given value. The value can be a
      string, number, or a JSON string for objects/arrays.
      delete <key>
      Removes the specified key and its value from the registry.
      EXAMPLES
      registry get Core.System.Version
      Retrieves the current OS version from the registry.
      registry set User.Preferences.Theme "dark"
      Sets the user's theme preference.
      PERMISSIONS
      Only the superuser (root) can use this command.`,
      validations: {
        args: {
          min: 2
        }
      },
    });
  }

  async coreLogic(context) {
    const { args, currentUser, dependencies } = context;
    const { StorageManager, ErrorHandler } = dependencies;
    const [action, key, ...valueParts] = args;
    const value = valueParts.join(" ");

    if (currentUser !== "root") {
      return ErrorHandler.createError(
          "registry: permission denied. Only root can access the registry."
      );
    }

    try {
      switch (action.toLowerCase()) {
        case "get":
          if (!key)
            return ErrorHandler.createError("registry get: key is required.");
          const storedValue = StorageManager.loadItem(key);
          if (storedValue === null || storedValue === undefined) {
            return ErrorHandler.createSuccess(`No value found for key: ${key}`);
          }
          const output =
              typeof storedValue === "object"
                  ? JSON.stringify(storedValue, null, 2)
                  : String(storedValue);
          return ErrorHandler.createSuccess(output);

        case "set":
          if (!key || !value)
            return ErrorHandler.createError(
                "registry set: key and value are required."
            );
          let valueToStore = value;
          try {
            valueToStore = JSON.parse(value);
          } catch (e) {
            // Not a JSON string, store as is.
          }
          StorageManager.saveItem(key, valueToStore, `Registry key: ${key}`);
          return ErrorHandler.createSuccess(`Set value for key: ${key}`);

        case "delete":
          if (!key)
            return ErrorHandler.createError(
                "registry delete: key is required."
            );
          if (StorageManager.loadItem(key) === null) {
            return ErrorHandler.createError(
                `registry delete: key not found: ${key}`
            );
          }
          StorageManager.removeItem(key);
          return ErrorHandler.createSuccess(`Deleted key: ${key}`);

        default:
          return ErrorHandler.createError(
              `registry: unknown action '${action}'. Must be one of get, set, or delete.`
          );
      }
    } catch (e) {
      return ErrorHandler.createError(
          `registry: An unexpected error occurred: ${e.message}`
      );
    }
  }
}