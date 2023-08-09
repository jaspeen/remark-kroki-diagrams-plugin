export function debugLog(obj: any) {
  //console.log(obj);
}

export function infoLog(obj: any) {
  console.log(obj);
}

export function must<V>(name: string, v: V | undefined): V {
  if (v === undefined) {
    throw new Error(`Mandatory option '${name}' is not defined`);
  } else {
    return v;
  }
}

export function extractParams(meta: string): { [Key: string]: string } {
  const regExp = /[ ]*([^="]+)=\"([^"]+)\"/g;

  let res: { [Key: string]: string } = {};
  let m;

  while ((m = regExp.exec(meta)) !== null) {
    if (m.index === regExp.lastIndex) {
      regExp.lastIndex++;
    }
    const name = m[1];
    const val = m[2];
    debugLog(`Found ${name}='${val}'`);
    res[name] = val;
  }

  return res;
}

export type OptionString = string | undefined;

export function extractParam(name: string, input: string): OptionString {
  const regExp = /([a-zA-Z]+)=\"([^\"]+)\"/g;

  var result = undefined;
  var m;

  while (result == undefined && (m = regExp.exec(input)) !== null) {
    if (m.index === regExp.lastIndex) {
      regExp.lastIndex++;
    }
    if (m[1] == name) {
      debugLog(`Found ${m[2]}`);
      return m[2];
    }
  }

  return result;
}

export async function runInBatches(
  tasks: (() => Promise<any>)[],
  concurrency: number = 6
) {
  let activeTasks: Promise<any>[] = [];
  debugLog(`Tasks: ${tasks.length}`);
  for (const task of tasks) {
    if (activeTasks.length >= concurrency) {
      debugLog("Waiting for task");
      await Promise.race(activeTasks);
    }

    const activeTask = task()
      .then(() => {
        activeTasks.splice(activeTasks.indexOf(activeTask), 1);
      })
      .catch((e) => {
        activeTasks.splice(activeTasks.indexOf(activeTask), 1);
        throw e;
      });
    activeTasks.push(activeTask);
  }
  await Promise.all(activeTasks);
}

export function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
