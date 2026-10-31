# public 目录

把观察视频命名为 `sample.mp4` 放到本目录，即可通过默认 `VITE_VIDEO_URL=/sample.mp4` 播放。
若视频放在对象存储/CDN，构建时设置 `VITE_VIDEO_URL=<完整URL>` 即可。

## 视频格式硬性要求（浏览器兼容性）

- **编码必须为 H.264（AVC）+ AAC，MP4 容器，8-bit yuv420p**
- ❌ 不要用 HEVC/H.265、AV1、10-bit 片源直接上线：多数 Windows Chrome/Edge 无法解码 HEVC Main10，
  会触发"视频加载失败"（本项目曾用 4K HEVC 10-bit 原片踩过此坑）
- 分辨率建议 1280×720（观察日常动作足够），30fps，体积控制在 350MB 以内
  （Netlify 单文件硬上限 350MB；实际建议 ≤150MB，加快机房加载）
- 加 `-movflags +faststart` 让视频边下边播
- 4K 原片放项目根 `素材原始备份/` 存档即可，不要放进 public（会整体进部署包）

## 修改视频后必须重新构建

`npm run build`（public/ 内容会拷贝进 dist/）。
注意 `vite preview` 只服务 dist/ 旧产物，验证新视频请用 `npm run dev` 或重新 build。

> 注意：视频文件中不得包含时间戳、进度提示等可被用于定位"选择/触碰"事件的额外信息，
> 两组条件使用完全相同的视频文件。
