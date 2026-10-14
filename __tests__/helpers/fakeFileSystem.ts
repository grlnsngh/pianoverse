/**
 * Stand-in for the `File` and `Paths` parts of `expo-file-system`. Every
 * `file.write(content)` goes to `writeFile(uri, content)`, a mock tests can
 * read back or make throw, like a full phone would.
 */
export const createFakeFileSystemModule = () => {
  const writeFile = jest.fn((_uri: string, _content: string) => {});

  class File {
    uri: string;

    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((part) => (typeof part === "string" ? part : part.uri)).join("");
    }

    /** What Android hands other apps instead of the file:// address. */
    get contentUri() {
      return `content://${this.uri}`;
    }

    create() {}

    write(content: string) {
      writeFile(this.uri, content);
    }
  }

  return { File, Paths: { document: { uri: "file:///docs/" } }, writeFile };
};

/** The `writeFile` mock of the faked `expo-file-system`. */
export const fakeWriteFile = (): jest.Mock<void, [string, string]> =>
  jest.requireMock("expo-file-system").writeFile;
