# 项目清晰指南

本仓库包含大量说明文档、测试产出以及部署脚本，其中真正需要每日关注的代码与配置主要集中在 `osint/jackma` 目录下，其他文件多数是需求说明、测试日志或历史手动脚本，可以视作参考资料或存档。

---

## 1. 核心代码空间（优先级高）

- `osint/jackma/backend/`
  - FastAPI 服务(`server.py`、`models.py`, `db_operations.py`) + 配套授权、缓存、任务、日志模块
  - `apis/` 包含 15+ 个具体的外部数据源适配器（如 `external_lookup.py`、`truecaller.py`、`social_media_scanner.py` 等）
  - 基础设施说明（`.env`、`requirements.txt`、`API_KEYS_CONFIGURATION.md`、`ENV_*`）都在此目录
  - 启动脚本：`server.py`（主服务）、`setup_env.py`（环境初始化）、`celery_tasks.py`（后台任务）等

- `osint/jackma/frontend/`
  - React 应用，入口 `src/index.js` -> `App.js`
  - 主要页面组件：`LoginPage.jsx`、`SearchPage.jsx`、`ResultsPage.jsx`、`TransactionsPage.jsx`、`AdminPage.jsx`
  - 共享逻辑/样式：`contexts/`、`hooks/`、`utils/`、`lib/`、`ui/`
  - 构建配置：`package.json`、`craco.config.js`、`tailwind.config.js`、`postcss.config.js` 等

> 建议：日常开发/调试只在 `osint/jackma` 目录里动手，其他“杂项”目录可以临时忽略。

## 2. 文档与说明的类别（建议按需查阅）

| 类别 | 代表文件 | 用途 |
| --- | --- | --- |
| 总体说明 | `README.md`、`PROJECT_OVERVIEW.md`、`PROJECT_STRUCTURE.md`、`DOCUMENTATION_INDEX.md` | 介绍项目目标、结构、可用文档的索引，建议首次浏览时研读 |
| 启动/部署 | `STARTUP_COMPLETE.md`、`STARTUP_GUIDE.md`、`DEPLOYMENT_SUCCESS.md`、`docker-compose.yml` | 说明如何启动、构建、部署服务 |
| API/实现细节 | `API_TEST_REPORT.md`、`API_MODULES_GUIDE.md`、`API_TESTING_SUMMARY.md`、`EXTERNAL_API_TEST_COMPLETE.md` | 记录 API 接口、测试结果、执行流程，调试相关问题可参考 |
| 功能亮点 | `POINTS_SYSTEM.md`、`SOCIAL_INFO_DISPLAY.md`、`SATELLITE_MAP_FEATURE.md` 等 | 以单文件描述具体功能设计，方便复查需求 |
| 运维/脚本 | 各类 `test_*.ps1`、`check_*.py`、`deploy-*.ps1`、`verify_*.ps1` | 这些脚本用于验证、数据清理、部署时使用，属于工具级别 |
| 历史/总结 | `CLEANUP_REPORT.md`、`IMPLEMENTATION_COMPLETE.md`、`README.md`（根目录大量版本） | 记录团队执行历史，可在必要时查阅 |

如果某些 `.md` 或 `.json` 是一次性测试或导出产物（比如 `api_response_*.json`、`test_response.json`、`osint_tracker.db`、`osint-backend-latest.tar`），可以把它们当作参考样本，日常开发无需修改。

## 3. 快速启动要点

```powershell
cd osint/jackma/backend
pip install -r requirements.txt
python server.py
```

前端开发：

```powershell
cd osint/jackma/frontend
npm install
npm run start    # 或 yarn start（现有依赖包含 yarn.lock）
```

最终的访问地址仍是 `http://localhost:8000`，后端会同时提供 API + 静态文件。

## 4. 让杂项不干扰

- 许多 `.md`、`.json` 和 `.ps1` 文件记录了过去的测试、配置或运营指南，建议将它们视为“附录”。
- 若需要降低干扰，可将 `ADMIN_*`、`API_*`、`POINTS_*` 等文档移到 `docs/` 目录，或用 Git 只关注 `osint/jackma` 子树。
- 将 `osint-clean/` 目录视作经过整理的备份，若它包含与当前开发无关的副本，可在 `.git/info/sparse-checkout` 或 `git sparse-checkout` 中排除，以减轻 IDE 视图混乱。

## 5. 下一步建议

- 建议按上述分类写一个索引（如本文件），并在常用编辑器中折叠/收藏“核心目录 + 快速启动”部分。
- 若确实希望减少根目录文件，考虑将说明性文档集中到 `docs/`、`notes/`、`archive/` 等文件夹，并在 `README.md` 中留下跳转链接，使 `ls` 视图更简洁。
