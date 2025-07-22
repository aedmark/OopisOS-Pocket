// scripts/commands/ocrypt.js
function _transpose(matrix) {
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

function _matrixMultiply(A, B) {
  const result = Array(A.length)
      .fill(0)
      .map(() => Array(B[0].length).fill(0));
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B[0].length; j++) {
      for (let k = 0; k < A[0].length; k++) {
        result[i][j] = (result[i][j] + A[i][k] * B[k][j]) % 256;
      }
    }
  }
  return result;
}

function _getBlock(data, index, blockSize) {
  const block = Array(blockSize).fill(0);
  for (let i = 0; i < blockSize; i++) {
    if (index + i < data.length) {
      block[i] = data[index + i];
    }
  }
  return block;
}

function _generateKeyMatrix(keyString, size) {
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    hash = (hash << 5) - hash + keyString.charCodeAt(i);
    hash |= 0;
  }
  const matrix = Array(size)
      .fill(0)
      .map(() => Array(size).fill(0));
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      hash = (hash * 16807 + (i * size + j)) % 2147483647;
      matrix[i][j] = Math.abs(hash % 256);
    }
  }
  return matrix;
}

window.OcryptCommand = class OcryptCommand extends Command {
  constructor() {
    super({
      commandName: "ocrypt",
      description: "Encrypts or decrypts files using a custom block cipher.",
      helpText: `Usage: ocrypt [-d] -k <key> -i <inputfile> -o <outputfile>
      Encrypt or decrypt a file using a key.
      DESCRIPTION
      ocrypt is a simple custom block cipher for demonstration purposes.
      IT IS NOT SECURE AND SHOULD NOT BE USED FOR REAL-WORLD
      CRYPTOGRAPHY.
      It uses a key-derived matrix to transform 8-byte blocks of data.
      OPTIONS
      -d, --decrypt
      Decrypt the input file instead of encrypting.
      -k, --key=<key>
      The secret key for the operation.
      -i, --input=<inputfile>
      The file to read data from.
      -o, --output=<outputfile>
      The file to write the resulting data to.
      All options are required.`,
      flagDefinitions: [
        { name: "decrypt", short: "-d", long: "--decrypt" },
        { name: "key", short: "-k", long: "--key", takesValue: true },
        { name: "input", short: "-i", long: "--input", takesValue: true },
        { name: "output", short: "-o", long: "--output", takesValue: true },
      ],
    });
  }

  async coreLogic(context) {
    const { flags, currentUser, dependencies } = context;
    const { FileSystemManager, UserManager, ErrorHandler } = dependencies;
    const blockSize = 8;

    if (!flags.key || !flags.input || !flags.output) {
      return ErrorHandler.createError("ocrypt: all options are required");
    }

    const inputValidation = FileSystemManager.validatePath(flags.input, {
      expectedType: "file",
      permissions: ["read"],
    });
    if (!inputValidation.success) {
      return ErrorHandler.createError(
          `ocrypt: input file: ${inputValidation.error}`
      );
    }
    const inputFileNode = inputValidation.data.node;

    const outputValidation = FileSystemManager.validatePath(flags.output, {
      allowMissing: true,
      expectedType: "file",
    });
    if (
        !outputValidation.success &&
        outputValidation.data?.node !== null
    ) {
      return ErrorHandler.createError(
          `ocrypt: output file: ${outputValidation.error}`
      );
    }
    const outputPath = outputValidation.data.resolvedPath;

    const keyMatrix = _generateKeyMatrix(flags.key, blockSize);
    const operationMatrix = flags.decrypt ? _transpose(keyMatrix) : keyMatrix;

    const textEncoder = new TextEncoder();
    const inputBytes = textEncoder.encode(inputFileNode.content || "");
    const outputBytes = new Uint8Array(inputBytes.length);

    for (let i = 0; i < inputBytes.length; i += blockSize) {
      const block = _getBlock(inputBytes, i, blockSize);
      const blockMatrix = [block];
      const resultMatrix = _matrixMultiply(blockMatrix, operationMatrix);
      for (let j = 0; j < blockSize; j++) {
        if (i + j < outputBytes.length) {
          outputBytes[i + j] = resultMatrix[0][j];
        }
      }
    }

    const textDecoder = new TextDecoder("utf-8", { fatal: true });
    let outputContent;
    try {
      outputContent = textDecoder.decode(outputBytes);
    } catch (e) {
      outputContent = Array.from(outputBytes)
          .map((byte) => String.fromCharCode(byte))
          .join("");
    }

    const primaryGroup = UserManager.getPrimaryGroupForUser(currentUser);
    const saveResult = await FileSystemManager.createOrUpdateFile(
        outputPath,
        outputContent,
        { currentUser, primaryGroup }
    );

    if (!saveResult.success) {
      return ErrorHandler.createError(`ocrypt: ${saveResult.error}`);
    }

    return ErrorHandler.createSuccess("", { stateModified: true });
  }
}