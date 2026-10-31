# 日常生活事件的认知与判断研究（线上实验系统）

考察**选择概念激活**（A 组：看到"明确的选择"按空格）对**受害者归责判断**的影响，
B 组（物体首次被双手触摸按空格）为知觉控制条件。两组被试间设计。

技术栈：React (Vite) + Tailwind CSS + Netlify Functions + Netlify Blobs（无独立数据库）。

## 目录结构

```
src/
  store/testStore.jsx        # Reducer 集中管理阶段 0-5 生命周期，实时持久化（socpsych_exp_state）
  data/content.js            # 全部实验文案（与纸质流程逐字一致）
  utils/storage.js           # localStorage 持久化 + 行为日志
  utils/random.js            # 被试编号 / 完成码 / 伪随机分组
  utils/device.js            # PC 设备校验（UA + 屏幕尺寸）
  utils/payload.js           # 规范 JSON Payload 组装（含 blame_mean / poly_mean）
  utils/upload.js            # 静默上传 + 3 次递增退避重试 + 补传队列（socpsych_pending_uploads）
  pages/Step0..Step5         # 知情同意 → 视频任务 → 归责 → 政治倾向 → 人口学 → Debriefing
netlify/functions/
  collect.mjs                # POST /api/collect → Blobs store "socpsych-formal-data"
  export.mjs                 # GET  /api/export?format=csv|json|count&token=...
```

## 本地开发

```bash
npm install
cp .env.example .env.local   # 按需改 VITE_VIDEO_URL
# 把观察视频放 public/sample.mp4
npm run dev                  # http://localhost:3100
```

本地要验证数据落库需用 Netlify CLI（提供 Blobs 运行时上下文）：

```bash
npm i -g netlify-cli
netlify dev                  # 前端 + functions 一起跑，/api/collect 直接可用
```

## 部署（Netlify）

1. `netlify deploy --prod`（或连接 Git 仓库自动构建）。
2. 后台 **Site settings → Environment variables** 配置：
   - `EXPORT_TOKEN`：导出鉴权 token（**必须设置**，否则任何知道 URL 的人可下载被试数据）。
   - `VITE_VIDEO_URL`：如视频不在站内 `public/`，配置外链。
3. Netlify Blobs 随站点自动开通，无需其他配置。

## 数据导出

```
/api/export?format=count&token=XXX    # 已完成人数（分 A/B 组）
/api/export?format=csv&token=XXX      # 宽表 CSV（每被试一行，UTF-8 BOM，Excel/SPSS 直开）
/api/export?format=json&token=XXX     # 全量原始 JSON（含逐次按键/切屏日志）
```

CSV 列：`subject_id, condition, consent_name, created_at, total_duration_sec,
video_keypress_count, video_blur_count, blame_mean, blame_q1..q6, poly_mean, poly_q1..p6,
demo_name, demo_student_id, demo_phone, demo_age, demo_gender, demo_grade,
demo_ethnicity, demo_native_lang, demo_chinese_prof, demo_prior_exp`

## 主试须知

- **强制分组测试**：URL 加 `?group=A` 或 `?group=B` 可跳过随机分组（仅调试用；正式施测勿加）。
- **断电/刷新恢复**：LocalStorage 实时快照，被试重新打开页面即从当前阶段继续；
  视频阶段若中途刷新，会从指导语重新开始（按键日志清空重计）。
- **补传队列**：断网完成的数据存于浏览器 `socpsych_pending_uploads`，下次打开页面自动上传；
  同一台电脑同一浏览器内有效——机房电脑固定，风险可控。
- **新被试**：上一位完成后，主试点页面右下角"新被试开始（主试）"清空本机快照。
- 合规监控：空格键精确记录 `{timestamp, videoCurrentTime}`；切屏（blur/visibilitychange）
  800ms 去重后记录次数与时长；视频禁暂停/快进/回放/右键，暂停自动续播。
