import type { Profile } from '../lib/profile'

/** 内置个人名片默认值；想固化自己的信息时替换本文件 */
export const SEED_PROFILE: Profile = {
  name: '李永轩',
  tagline: '醉后不知天在水，满船清梦压星河',
  avatarUrl: 'https://avatars.githubusercontent.com/u/29904931?v=4',
  links: [
    { id: "lnk_1790747980544", label: "GitHub", url: "https://github.com/lyx0717" },
    { id: "lnk_1790747994919", label: "邮箱", url: "lyx0717@yeah.net" }
  ],
}