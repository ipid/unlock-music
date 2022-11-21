# Unlock Music 音乐解锁

- 在浏览器中解锁加密的音乐文件。 Unlock encrypted music file in the browser.
- Unlock Music 项目是以学习和技术研究的初衷创建的，修改、再分发时请遵循[授权协议]。
- Unlock Music 的 CLI 版本可以在 [unlock-music/cli] 找到，大批量转换建议使用 CLI 版本。
- 我们新建了 Telegram 群组 [`@unlock_music_chat`] ，欢迎加入！

[授权协议]: https://git.unlock-music.dev/um/web/src/branch/master/LICENSE
[unlock-music/cli]: https://git.unlock-music.dev/um/cli
[`@unlock_music_chat`]: https://t.me/unlock_music_chat

## 特性

### 支持的格式

- [x] QQ 音乐 (.qmc0/.qmc2/.qmc3/.qmcflac/.qmcogg/.tkm)
- [x] Moo 音乐格式 (.bkcmp3/.bkcflac/...)
- [x] QQ 音乐 Tm 格式 (.tm0/.tm2/.tm3/.tm6)
- [x] QQ 音乐新格式 (.mflac/.mgg/.mflac0/.mgg1/.mggl)
- [x] <ruby>QQ 音乐海外版<rt>JOOX Music</rt></ruby> (.ofl_en)
- [x] 网易云音乐格式 (.ncm)
- [x] 虾米音乐格式 (.xm)
- [x] 酷我音乐格式 (.kwm)
- [x] 酷狗音乐格式 (.kgm/.vpr)

### 其他特性

- [x] 在浏览器中解锁
- [x] 拖放文件
- [x] 批量解锁
- [x] 渐进式 Web 应用 (PWA)
- [x] 多线程
- [x] 写入元信息与专辑封面

## 使用方法

### 使用预构建版本

- 从 [Release] 下载预构建的版本
  - :warning: 本地使用请下载`legacy版本`（`modern版本`只能通过 **http(s)协议** 访问）
- 解压缩后即可部署或本地使用（**请勿直接运行源代码**）

[release]: https://git.unlock-music.dev/um/web/releases/latest

### 自行构建

- 环境要求
  - nodejs (v16.x)
  - npm

1. 获取项目源代码后安装相关依赖：

   ```sh
   npm ci
   ```

2. 然后进行构建：

   ```sh
   npm run build
   ```

   - 构建后的产物可以在 `dist` 目录找到。
   - 如果是用于开发，可以执行 `npm run serve`。

3. 如需构建浏览器扩展，构建成功后还需要执行：

   ```sh
   npm run make-extension
   ```
