import { describe, expect, test, beforeAll, afterAll } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { remark } from "remark";
import plugin from "../index";
import { VFile } from "vfile";

const fixtureDirName = "__fixtures__";
const inputFileName = "input.md";
const expectedFileName = "expected.md";
const optionsFileName = "options.js";

describe("Remark transformer", () => {
  const fixturesDir = path.resolve(
    path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
    fixtureDirName
  );

  const imagesDir = path.resolve("./images");

  beforeAll(async () => {
    await fs.promises.mkdir(imagesDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rmdir(imagesDir, { recursive: true });
  });

  console.log(fixturesDir);
  const names = fs.readdirSync(fixturesDir);

  // Only keep directories, not files:
  const directories = [];
  for (const name of names) {
    const fullPath = path.join(fixturesDir, name);
    if (fs.lstatSync(fullPath).isDirectory() === true) {
      directories.push(name);
    }
  }

  // Generate tests programatically:
  for (const directory of directories) {
    const caseName = directory.split("-").join(" ");
    test(caseName, async () => {
      const fixtureDir = path.join(fixturesDir, directory);

      const inputFilePath = path.join(fixtureDir, inputFileName);
      const input = fs.readFileSync(inputFilePath, "utf8");

      const expectedFilePath = path.join(fixtureDir, expectedFileName);
      const expected = fs.readFileSync(expectedFilePath, "utf8");

      const optionsFilePath = path.join(fixtureDir, optionsFileName);
      let options;
      try {
        options = (await import(optionsFilePath)).default;
        console.log(options);
      } catch (e) {
        console.log(e);
        options = {};
      }
      const inVFile = new VFile({ path: inputFilePath, value: input });

      const processor = remark().use(plugin, options);
      const actual = await processor.process(inVFile);
      console.log("AAAAAAAAAa[" + actual?.toString() + "]");

      expect(actual && actual.toString()).toEqual(expected);
    });
  }
});
