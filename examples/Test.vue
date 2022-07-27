<template>
  <view>
    <view @tap="click" class="abc">
      <text style="color: green;font-size: 50px;">{{ !a ? '打开': '关闭'}}</text>
    </view>
    <view v-if="a">
      <text style="color: #ff4800;font-size: 50px;">11111</text>
    </view>
    <text v-for="(item, i) in list">{{i}}---{{item}}</text>
  </view>
</template>

<script>
export default {
  data() {
    return {
      a: true,
      list: [1, 2, 3, 4, 5]
    }
  },
  methods: {
    click() {
      this.a = !this.a
    }
  }
}
</script>

<style scoped>
.abc {
  background-color: #f0cc00;
}
</style>