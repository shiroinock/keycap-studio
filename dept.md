# dept: 3

依存ライブラリが最新版からどれだけ遅れているか。最新版までに出たリリースを major / minor / patch に分けて数え、重みを掛けて足したもの([スコアの定義](https://github.com/shiroinock/dept#スコアの定義))。

- 合計 **3** = major 0 × 30 + minor 0 × 3 + patch 3 × 1
- 3 / 15 パッケージが遅れている、0.3 libyears
- ロックファイル:`./pnpm-lock.yaml`

| SCORE | PACKAGE | CURRENT | LATEST | MAJ | MIN | PAT | LIBYEAR | KIND |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | `@biomejs/biome` | 2.6.8 | 2.6.9 | 0 | 0 | 1 | 0.0 | dev |
| 1 | `@types/node` | 26.6.6 | 26.6.7 | 0 | 0 | 1 | 0.1 | dev |
| 1 | `@types/react` | 19.3.0 | 19.3.1 | 0 | 0 | 1 | 0.2 | dev |

<details>
<summary>最新の依存(12 件)</summary>

| PACKAGE | VERSION | KIND |
| --- | --- | --- |
| `@ijprest/kle-serial` | 0.15.1 | prod |
| `@react-three/fiber` | 9.8.2 | prod |
| `@types/react-dom` | 19.3.0 | dev |
| `@types/three` | 0.187.0 | dev |
| `@vitejs/plugin-react` | 6.3.0 | dev |
| `react` | 19.3.1 | prod |
| `react-dom` | 19.3.1 | prod |
| `three` | 0.187.0 | prod |
| `typescript` | 7.0.2 | dev |
| `vite` | 8.3.8 | dev |
| `vitest` | 5.1.1 | dev |
| `zod` | 4.6.7 | prod |

</details>

---

[dept](https://github.com/shiroinock/dept) で作成
