# CI 打包拆分：Windows 优先 + 平台可选构建

## Goal

提高发版打包效率：现 `release.yml` 单文件矩阵每推一个 `v*` tag 就并行跑 2 个慢速 macOS + 1 个 Windows，而用户主用 Windows，两个 macOS 构建大多白跑。拆分为「tag 推送只自动出 Windows（快路径），macOS/Linux 手动按需补构建进同一 Release」。核心指标：tag 发版的等待时间从「三平台木桶」降到「仅 Windows」。

## 决策记录（grilling 2026-07-05 收敛）

1. **触发模型**：`windows` = `on: push tags v*`（自动）；`macos`/`linux` = `workflow_dispatch` 带必填 `tag` input（手动补跑）。
2. **文件架构**：`_build.yml`（`workflow_call` 共享配方，唯一真源）+ 三个薄壳 caller，避免 30 行构建配方复制三份。UI 仍是三个可选入口。
3. **Release 对齐**：dispatch 的 mac/linux 用显式 `tag` 字符串 → `checkout ref=tag` 拉准源码 → tauri-action `tagName=tag` **按 tag upsert 追加**进同一 Draft。顺序无关（mac 先跑也 OK）。
4. **Linux**：本次加 `release-linux.yml`（`_build.yml` 内含 `apt-get` 依赖分支），**标注实验性**、首跑不保证一次通过。opt-in 不影响 Windows 快路径。
5. **macOS 产物**：保持现状两架构（aarch64 + x86_64 矩阵，2 runner），不改产物形态（外科手术式改动）。

## Requirements

1. **新增 `_build.yml`**（reusable / `workflow_call`），inputs：`platform`、`args`、`rust-targets`、`tag`。步骤：checkout `ref: tag` → setup-node lts → rust stable(+`rust-targets`) → swatinem/rust-cache（`./src-tauri -> target`）→ **apt 依赖步骤（`if: startsWith(inputs.platform,'ubuntu')`）** → `npm ci` → tauri-action(`tagName: tag`, `releaseName`, `releaseDraft: true`, `args: inputs.args`)。`GITHUB_TOKEN` 经 caller `secrets: inherit` 传入。
2. **`release-windows.yml`**：`on: push tags ['v*']`；单 job `uses: ./.github/workflows/_build.yml`，`with: {platform: windows-latest, args: '', rust-targets: '', tag: ${{ github.ref_name }}}`，`permissions: contents: write`，`secrets: inherit`。
3. **`release-macos.yml`**：`on: workflow_dispatch` 带必填 `tag` input；`strategy.matrix.include` = 两架构（`args`/`rust-targets` 对应 aarch64、x86_64 apple-darwin），`uses: _build.yml`，`platform: macos-latest`，`tag: ${{ inputs.tag }}`。
4. **`release-linux.yml`**（实验性）：`on: workflow_dispatch` 带必填 `tag` input；`uses: _build.yml`，`platform: ubuntu-latest`，`args/rust-targets: ''`，`tag: ${{ inputs.tag }}`。文件头注释标「实验性·首跑可能需调依赖/AppImage」。
5. **删除旧 `release.yml`**：否则 tag 推送同时触发旧三平台矩阵，提效落空。
6. Linux apt 依赖（Tauri v2 / ubuntu-24.04）：`libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev patchelf libayatana-appindicator3-dev libssl-dev`。
7. **不加 `concurrency`**：跨工作流 cancel 会误杀 Windows tag-run；Windows 先建 Draft，碰撞概率极低。
8. 遵守 [[tauri-version-alignment]]：本任务不动依赖版本，无需 cargo/npm 同步操作。

## Acceptance Criteria

- [x] GitHub 解析无语法错（v0.1.6-rc1 实测：两 workflow 均被接受，reusable `workflow_call` 通过）
- [x] 推 `v*` tag → **仅** `release-windows` 触发，产出 `.exe/.msi` 并建 Draft（rc 实测：无 mac/linux 自动跑）
- [x] `dispatch` macOS 填 `tag` → 2 个 `.dmg` **追加进同一个** Draft（rc 实测：Draft 6 资产同一处，无重复 Release）
- [ ] `dispatch` Linux 填 `tag` → 出 deb/AppImage（**未测**：用户选择暂不验，实验性 opt-in 待后续）
- [x] 旧 `release.yml` 已删除，tag 推送不再触发两个 macOS 构建
- [x] mac 产物仍为两架构（rc 实测：aarch64 + x64 两 `.dmg`）

## Notes

- **验证已完成（2026-07-05，`v0.1.6-rc1` 预发 tag）**：Windows 快路径 + macOS 两架构补跑均绿，6 资产追加进同一 Draft 无重复；验毕已删 rc tag 与 Draft。Linux 未测。run: Windows 28713799240 / macOS 28714152620。
- 残留风险：Linux 首跑大概率因 apt 依赖或 AppImage FUSE 报错需调（已标实验性）；`workflow_call` 需 `secrets: inherit` 才能传 `GITHUB_TOKEN`，漏掉会 401。
- 与 `07-05-web-api-security` 互不干扰，可并行推进。
- 未来可选优化（本次不做）：macOS 合成 `universal-apple-darwin` 单胖包；单文件 dispatch 勾选式架构。
