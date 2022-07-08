import fs from "fs";
import compiler from "vue-template-compiler";
export async function compile(vueFile: string) {
  const vueContent = await fs.promises.readFile(vueFile, "utf-8");
  const ret = compiler.compile(vueContent);
  await console.log(ret);
}
