import { Md5 } from "ts-md5/dist/md5";
import visit from "unist-util-visit";
import fetch from "node-fetch";
import fs from "fs";
import {
  debugLog,
  extractParams,
  must,
  OptionString,
  runInBatches,
  streamToBuffer,
} from "./util";

const DIAGRAM_OPT_PREFIX = "opt-";
export type ImageType = "svg" | "png";
export type TransformMode = "file" | "data-url";

export interface DiagramsGlobalOptions {
  krokiServer: string;
  mode?: TransformMode;
  defaultImageType: ImageType;
  diagramSourceDir: string; // where to find diagram source included from file
  cacheDir: string; // directory with image cache
  fileDir: string; // where generated diagram files will be stored
  fileRefPrefix: string; // prefix for image on page; relative paths will be resolved against markdown page location, absolute paths against this param
  lang: string; // main lang for this plugin
  aliases: string[]; // also process this aliases, lang in code block options is optional in this case
  includeSource: boolean; // put source as code element next to image
  includedSourceClass?: string;
  includedSourceStyle?: string;
  includedSourceParentClass?: string;
  includedSourceParentStyle?: string;
  lenient: boolean; // do not fail on unsuccessful response from diagram server
}

interface DiagramOptions {
  lang?: string; // required if main lang key was used
  src?: string; // file with diagram source
  type?: string; // image type
  title?: string; // title for image
  alt?: string; // img alt text
}

function resolveToCurFileDir(curFileDir: any, dir: string): string {
  const curDir = curFileDir ? curFileDir.dirname : process.cwd();
  return dir.startsWith("/") ? dir : `${curDir}/${dir}`;
}

function resolveToCurDir(dir: string): string {
  return dir.startsWith("/") ? dir : `${process.cwd()}/${dir}`;
}

class DiagramBlock {
  private md5: string | Int32Array;
  private imgFile?: string;
  private cacheFile?: string;
  private krokiUrl: string;

  constructor(
    readonly node: any,
    readonly curFile: any,
    readonly options: DiagramsGlobalOptions,
    readonly diagramType: string,
    readonly krokiDiagramOptions: { [Key: string]: string },
    readonly diagramCode: string,
    readonly imgType: ImageType,
    readonly imgAlt: OptionString,
    readonly imgTitle: OptionString
  ) {
    this.md5 = Md5.hashStr(
      this.diagramCode + JSON.stringify(this.krokiDiagramOptions)
    );
    this.cacheFile = this.options.cacheDir
      ? `${this.options.cacheDir}/${this.md5}.${this.imgType}`
      : undefined;
    this.imgFile = this.options.fileDir
      ? `${resolveToCurDir(this.options.fileDir)}/${this.md5}.${this.imgType}`
      : undefined;
    this.krokiUrl = this.options.krokiServer;
  }

  async requestImageFromKroki() {
    const body = {
      diagram_source: this.diagramCode,
      diagram_type: this.diagramType,
      output_format: this.imgType,
      diagram_options: this.krokiDiagramOptions,
    };

    debugLog(`Generating image on '${this.krokiUrl}' ${JSON.stringify(body)}`);

    const response = await fetch(this.krokiUrl, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    return response;
  }

  async getImage(): Promise<Buffer | null> {
    if (this.cacheFile && fs.existsSync(this.cacheFile)) {
      debugLog("Cached image file [" + this.cacheFile + "].");
      return fs.readFileSync(this.cacheFile);
    } else {
      const imgRes = await this.requestImageFromKroki();
      debugLog(imgRes);
      if (!imgRes.ok) {
        if (this.options.lenient) {
          // leave code block as is
          return null;
        } else {
          throw new Error(
            `Unable to get image text from server: ${await imgRes.text()}`
          );
        }
      } else {
        return await streamToBuffer(imgRes.body);
      }
    }
  }

  imgMediaType(imgType: ImageType): string {
    switch (imgType) {
      case "png":
        return "image/png";
      case "svg":
        return "image/svg+xml";
    }
  }

  generateDataUrl(imgType: ImageType, data: Buffer): string {
    return `data:${this.imgMediaType(imgType)};base64,${data.toString(
      "base64"
    )}`;
  }

  async createImageNode(): Promise<any> {
    switch (this.options.mode) {
      case "file": {
        if (!this.options.fileDir || !this.imgFile) {
          throw new Error(`mode 'file' requires fileDir config`);
        }

        const effectivePrefix = this.options.fileRefPrefix || "/";

        const imgRefFile = `${effectivePrefix}/${this.md5}.${this.imgType}`;

        if (!fs.existsSync(this.imgFile)) {
          const data = await this.getImage();
          if (!data) {
            return null;
          }
          fs.writeFileSync(this.imgFile, data);
        }
        return {
          type: "image",
          url: imgRefFile,
          title: this.imgTitle,
          alt: this.imgAlt,
        };
      }
      case "data-url": {
        const data = await this.getImage();
        if (data != null) {
          return {
            type: "image",
            url: this.generateDataUrl(this.imgType, data),
            title: this.imgTitle,
            alt: this.imgAlt,
          };
        } else {
          return null;
        }
      }
    }
  }

  async createNode() {
    const imgNode = await this.createImageNode();
    if (!imgNode) {
      return;
    }

    /*const imgNode: any = {
      type: "image",
      url: this.options.fileRefDir + "/" + this.md5 + ".svg",
      title: this.imgTitle,
      alt: this.imgAlt,
    };*/

    if (this.options.includeSource) {
      this.node.type = "element";
      this.node.tagName = "p";
      this.node.data = {
        hName: "p",
        hProperties: {
          "data-diagrams-code": this.diagramCode,
          class: "diagrams-code",
        },
      };
      this.node.children = [imgNode];
    } else {
      this.node.type = imgNode.type;
      this.node.url = imgNode.url;
      this.node.title = imgNode.title;
      this.node.alt = imgNode.alt;
    }
  }
}

export class Transformer {
  constructor(readonly options: DiagramsGlobalOptions) {}

  applyCodeBlock(node: any, file: any) {
    const { lang, meta, value } = node;

    let kb = undefined;

    let effectiveLang: string;
    if (lang === this.options.lang) {
      const params: DiagramOptions = extractParams(meta);
      debugLog(params);
      effectiveLang = must("lang", params.lang);
    } else if (this.options.aliases && this.options.aliases.includes(lang)) {
      effectiveLang = lang;
    } else {
      return;
    }

    const params = extractParams(meta);

    let effectiveValue: string = value;
    if (params.file) {
      const f = `${params.file}`;
      const effectivePrefix = this.options.diagramSourceDir
        ? this.options.diagramSourceDir
        : process.cwd();
      const effectiveFile = f.startsWith("/")
        ? `${effectivePrefix}/${f}`
        : `${file.dirname}/${f}`;
      effectiveValue = fs.readFileSync(effectiveFile).toString();
    }

    kb = new DiagramBlock(
      node,
      file,
      this.options,
      effectiveLang,
      Object.keys(params).reduce((obj, k) => {
        if (k && k.startsWith(DIAGRAM_OPT_PREFIX))
          obj[k.replace(DIAGRAM_OPT_PREFIX, "")] = params[k];
        return obj;
      }, {} as any),
      effectiveValue,
      (params.type as ImageType) || this.options.defaultImageType,
      params.alt || "diagram",
      params.title
    );

    return kb;
  }

  async transform(tree: any, file: { dirname: string }) {
    debugLog(
      `Transforming diagrams. Options: ${JSON.stringify(
        this.options
      )} fileDirname: ${file.dirname}`
    );
    const nodesToChange: DiagramBlock[] = [];

    // First, collect all the node that need to be changed, so that
    // we can iterate over them later on and fetch the file contents
    // asynchronously
    const visitor = (node: any) => {
      //debugLog(node);

      const kb = this.applyCodeBlock(node, file);

      if (kb !== undefined) {
        nodesToChange.push(kb);
      }
    };

    visit(tree, "code", visitor);

    // Now go over the collected nodes and change them
    await runInBatches(nodesToChange.map((n) => () => n.createNode()));
  }
}
