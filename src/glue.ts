declare function render(): any;

declare const staticRenderFns: Function[];

const vm = new Proxy(
  {
    _self: {
      _c: function (tag: string, otherArgs: string[] | object) {
        console.log("Function _c", arguments);
      },
    },
    _s: function () {
      console.log("Function _s", arguments);
    },
    _v: function () {
      console.log("Function _v", arguments);
    },
    _m: function (idx: number) {
      return Reflect.apply(staticRenderFns[idx], vm, []);
    },
  },
  {
    get: (target: object, p: string, receiver: any) => {
      if (Reflect.has(target, p)) {
        return Reflect.get(target, p);
      } else {
        return `_V_${p}_V_`;
      }
    },
  }
);
Reflect.apply(render, vm, []);
