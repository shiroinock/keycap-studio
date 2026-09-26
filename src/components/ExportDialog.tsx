import { useEffect, useRef, useState } from "react";
export interface ExportArtifact {
  blob: Blob;
  name: string;
  kind: "svg" | "png" | "json";
}
export default function ExportDialog({
  artifact,
  onClose,
}: {
  artifact: ExportArtifact;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setUrl(String(reader.result));
    reader.readAsDataURL(artifact.blob);
    return () => {
      reader.onload = null;
      reader.abort();
    };
  }, [artifact]);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal export-dialog"
      aria-labelledby="export-title"
      onCancel={onClose}
    >
      <h2 id="export-title">書き出しの準備ができました</h2>
      <p>
        {artifact.name} · {Math.ceil(artifact.blob.size / 1024)} KB
      </p>
      {artifact.kind !== "json" && url && (
        <img
          className="export-preview"
          src={url}
          alt="書き出した画像のプレビュー"
        />
      )}
      {artifact.kind === "svg" && (
        <p>
          SVGの文字はフォント参照です。ほかの端末では字形が変わる場合があります。
        </p>
      )}
      {artifact.kind === "json" && (
        <p>
          このJSONからデザインライブラリを復元できます。安全な場所に保管してください。
        </p>
      )}
      <div className="modal-actions">
        <button autoFocus onClick={onClose}>
          閉じる
        </button>
        <a
          className="download-link primary"
          href={url}
          download={artifact.name}
        >
          ファイルを保存
        </a>
      </div>
    </dialog>
  );
}
