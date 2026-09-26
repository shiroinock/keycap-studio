# 配列プリセットの範囲と参照資料

2026-09-27。現行レンダラーで正確に表現できる回転なしの長方形配列とJIS/ISOのL字Enterを含む18プリセットを収録。

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

6行のANSI/JIS/ISO配列ではF列と数字列にrow 0、Q列にrow 1を割り当て、最下段まで0〜4で既存3Dプロファイルへ対応する。格子は先頭から0〜4に割り当てる。

## 保存互換性

従来のschemaVersion 1/2を読み込み、配列切り替え時にschemaVersion 3へ移行する。各配列は安定したpreset IDとLayoutとして案へ埋め込む。共通キーの編集はデザイン内で共有し、訪れた配列を保持する。後日のプリセット変更で保存済み形状が変わることはない。幾何情報を変更するときはpreset IDの版も更新する。

## 今後の追加

- Alice、Corne、ErgoDoxなど：回転・特殊形状・分割ケースの対応と一次資料での照合を行う。
- 65%のブロッカー付き、75%の隙間付き：独立した寸法バリエーションとして追加。


## HHKB 6u・JIS・ISO（2026-09-27追加）

HHKB US 6uは[VIAのHHKB ANSI定義](https://github.com/the-via/keyboards/blob/master/src/hhkb/ansi/ansi.json)で位置を照合。最下段はx=1.5/2.5/4/10/11.5u、幅=1/1.5/6/1.5/1u。7u版と別IDで保存する。Superは編集用刻印で、HHKB日本語配列69キーは今回の収録対象外。

JIS/ISOの座標参照：
- [60_jis](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/60_jis/info.json)
- [tkl_jis](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/tkl_jis/info.json)
- [fullsize_jis](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/fullsize_jis/info.json)
- [60_iso](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/60_iso/info.json)
- [tkl_iso](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/tkl_iso/info.json)
- [fullsize_iso](https://github.com/qmk/qmk_firmware/blob/master/layouts/default/fullsize_iso/info.json)

QMKが記録するEnterの1.25×2uの軸側領域に左上0.25uの張り出しを加え、全体1.5×2uのL字として保存する。占有領域は上段1.5×1uと下段1.25×1uに分け、下段の隣接キーを誤って重なりとして扱わない。2Dのクリック領域も同じ切り欠きを使用する。

JISは一般的な65/91/109キーの一例で、機種固有のスペース幅や追加キーは含まない。ISOの初期刻印はUK。かな・シフト文字は個別編集で追加できる。

3DのL字Enterは凹多角形を三角形分割した傾斜天面とベベルで生成する。天面は平面の近似で、他のキーのくぼみ形状や特定メーカーの実物形状を再現するものではない。KLEでは軸側矩形を主とする形式と上側矩形を主とする形式の両方を同一形状へ正規化する。
