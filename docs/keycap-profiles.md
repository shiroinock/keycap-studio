# プロファイル資料と再現範囲

2026-09-27調査。市販29プロファイル／メーカー別バリエーションを収録。
OSAはAkkoとKeychronを分けた。市場の全製品・派生金型を網羅したデータベースではない。

## 収録一覧と一次資料

| 系統 | 収録名 | 参照資料 |
| --- | --- | --- |
| 定番 | Cherry、OEM | [Akko公式比較](https://en.akkogear.com/blog-ultimate-guide-to-keycap-profiles/)、[Keychron公式](https://keychronsupport.zendesk.com/hc/en-us/articles/12707932580375-What-is-the-height-of-the-keycap-profile-used-for-the-Keychron-keyboards) |
| Signature Plastics | DSA、SA、DCS、DSS、G20、F10 | [公式Family Specs・PDF](https://spkeyboards.com/blogs/product-guides/keycap-family-specs) |
| YMDK | XDA | [XDA V2](https://ymdkey.com/products/xda-1u-new-keycapsblank-pbt-1-55mm) |
| Keyreative | KAT、KAM、PBS | [KAT設計資料](https://keyreative.store/blogs/news/keyreative-new-keycaps-height-profile-kam-preview)、[KAM製品](https://keyreative.store/products/soda-squid-kam-profile-pbt-keycaps)、[PBS製品](https://keyreative.store/collections/pbs-keycaps) |
| Matt3o | MT3、MTNU | [MT3設計者の記事](https://matt3o.com/mt3-keycap-profile-a-brief-history/)、[MTNU設計者の記事](https://matt3o.com/mtnu-pre-order-phase-starts-now/) |
| Akko | ASA、ASA Low、MDA、MOA、SAL、JDA、OSA (Akko) | [公式比較](https://en.akkogear.com/blog-ultimate-guide-to-keycap-profiles/)、[ASA Low製品](https://en.akkogear.com/product/black-pink-keycap-set-154-key/) |
| Keychron | OSA (Keychron)、KSA、LSA | [公式案内](https://keychronsupport.zendesk.com/hc/en-us/articles/12707932580375-What-is-the-height-of-the-keycap-profile-used-for-the-Keychron-keyboards) |
| FKcaps | PFF、LPF、SLK、MBK (Choc)、URSA (Topre) | [メーカー比較表](https://fkcaps.com/pages/keycap-profiles) |

## 資料と近似の区別

資料は存在、段差の有無、天面の種類、代表的な高さの確認に使用した。画像やCADモデルは取り込んでいない。src/domain/profiles.tsの行別高さ・角度・天面幅・くぼみ量は外観比較用に選んだ独自の近似パラメータで、測定値一覧ではない。

- DSAは公式PDFの0.291インチ（約7.4mm）、共通R3、球面状天面を参考。
- XDAはYMDK V2の約9.6mmを代表値に使用。すべてのXDA金型が同寸法という意味ではない。
- 球面状の天面は二次曲面で近似。正確な球の曲面やメーカー固有の側壁は未再現。
- Cherry/OEM/DCS/PFF/LPF等は前後方向のくぼみ。G20/F10は平面。
- FKcapsは公開表の高さ（PFFはステム除外）を参考。MBK外形はMXより小さく表現するが、取付軸・裏面・スイッチ本体はモデル化しない。
- L字Enterの天面は平面近似。高さ・傾斜・天面幅を適用し、球面状のくぼみは未再現。
- 選択配列の全R・uへ外形を展開する。実際にそのサイズの金型・製品が存在することを示さない。MBKのフルサイズJIS等は外観検討用であり、販売キットの再現ではない。

## R表記と集計

DSAはR3、他の均一形状はアプリ内でR0。SAは数字列から1/2/3/4/3、KATは4/3/2/1/1。MT3のF列はR0、KATのF列はR5を別形状として扱う。他の段付きプロファイルは数字列から1/2/3/4/4を代表構成として使用。実セットには別の最下段や異なる命名がある。

「必要数」は確認済み配列ごとの最大使用数。刻印・色・左右キーを網羅する製造BOMではない。任意の収録キーを編集し、配列ごとの不足を判定する機能は次段階。

## 保存互換

独自Studio 3種は削除。既存JSONのstudio-sculpted-v2はCherry、studio-uniformはDSA、studio-lowはLSAに読み替える。未指定時はCherry。刻印と配色は保持するが、見た目は変更される。

## 未収録・追加調査対象

KLP Laméのtilted/saddle・MX/Choc別、MNT Pocket、DSA Way固有寸法、DCX、DCD、MT2、MAO、MOG、ACA、OPI、NuPhy nSA、Topre純正等。公開情報の不足した形状を名前だけで増やさない。
正規CADのライセンス確認、各R・uの実在金型表、ホーミング・段付きCapsも今後の対象。
