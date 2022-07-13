import { warn } from "vue/src/core/util/index";
import { ASTDirective, ASTElement } from "vue/src/types/compiler";

export default function on(el: ASTElement, dir: ASTDirective) {
  if (__DEV__ && dir.modifiers) {
    warn(`v-on without argument does not support modifiers.`);
  }
  el.wrapListeners = (code: string) => `_g(${code},${dir.value})`;
}
