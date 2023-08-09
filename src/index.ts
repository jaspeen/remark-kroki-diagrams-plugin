import { DiagramsGlobalOptions, Transformer } from "./transform";
import { must } from "./util";

export default (options: DiagramsGlobalOptions) => {
  const effectiveOptions: DiagramsGlobalOptions = {
    krokiServer: options.krokiServer || "https://kroki.io",
    defaultImageType: options.defaultImageType || "svg",
    diagramSourceDir: options.diagramSourceDir,
    cacheDir: options.cacheDir,
    fileDir: options.fileDir,
    fileRefPrefix: options.fileRefPrefix,
    lang: options.lang || "diagram",
    aliases: options.aliases,
    mode: options.mode || "file",
    includeSource: options.includeSource,
    lenient: options.lenient,
  };
  const transformer = new Transformer(effectiveOptions);
  return (t: any, f: any) => transformer.transform(t, f);
};
