import { useEffect, useRef } from "react";
import type { Study } from "../domain/model";
export default function ImportDialog({
  studies,
  onCancel,
  onImport,
}: {
  studies: Study[];
  onCancel: () => void;
  onImport: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="import-title"
      onCancel={onCancel}
    >
      <h2 id="import-title">{studies.length}件の案を追加</h2>
      <p>
        既存の案はそのまま残ります。同じIDの案は別のコピーとして追加します。
      </p>
      <ul>
        {studies.slice(0, 5).map((s) => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
      {studies.length > 5 && <p>ほか{studies.length - 5}件</p>}
      <div className="modal-actions">
        <button autoFocus onClick={onCancel}>
          キャンセル
        </button>
        <button className="primary" onClick={onImport}>
          ライブラリへ追加
        </button>
      </div>
    </dialog>
  );
}
