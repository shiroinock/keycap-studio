# 配列プリセットの範囲と参照資料

2026-09-27。現行レンダラーで正確に表現できる回転なしの長方形配列を収録。

## 形状の参照

QMKの公開する標準配列のキー位置・幅・高さを照合し、`preset-geometry.json` に数値として記録した。元のソースコード・キーマップは取り込んでいない。座標順はy→xに正規化して独自の初期刻印を付ける。実行時のネットワークアクセスは不要。

- [60_hhkb](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/60_hhkb/info.json)
- [65_ansi](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/65_ansi/info.json)
- [75_ansi](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/75_ansi/info.json)
- [96_ansi](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/96_ansi/info.json)
- [tkl_ansi](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/tkl_ansi/info.json)
- [fullsize_ansi](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/fullsize_ansi/info.json)
- [numpad_5x4](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/numpad_5x4/info.json)

ANSI 60%は既存データを再利用。格子は指定した行列数から全キー1uで生成する。4×12はQWERTYの初期刻印、5×12と10×10は通し番号。特定製品のCADや実装寸法を示すものではない。

HHKB型はQMKの60_hhkb（7uスペース）で、PFU HHKB製品の再現ではない。65/75/96%は隙間のない一例で、ノブ、ブロッカー、分割スペースなどの派生は別プリセットとして扱う。

6行のANSI配列ではF列と数字列にrow 0、Q列にrow 1を割り当て、最下段まで0〜4で既存3Dプロファイルへ対応する。格子は先頭から0〜4に割り当てる。

## 保存互換性

ANSI 60%を選ぶと既存のschemaVersion 1形式で作り、既存ANSI案との比較を維持する。それ以外は安定したpreset IDとLayoutをschemaVersion 2の案へ埋め込む。後日のプリセット変更で保存済み形状が変わることはない。幾何情報を変更するときはpreset IDの版も更新する。

## 今後の追加

- JIS 60%／TKL／フルサイズ、ISO各サイズ：非長方形Enterを2D/3Dで実装してから追加。
- Alice、Corne、ErgoDoxなど：回転・特殊形状・分割ケースの対応と一次資料での照合を行う。
- HHKB製品の6u配列、65%のブロッカー付き、75%の隙間付き：独立した寸法バリエーションとして追加。
