import { Download } from "lucide-react";
import { toast } from "sonner";

import api from "../api/client";

export default function BackupButton() {
  const handleClick = async () => {
    try {
      const response = await api.get("/api/reports/backup", {
        responseType: "blob",
      });

      // Figure out the filename from the Content-Disposition header
      const disposition = response.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename =
        match && match[1] ? match[1] : "rachna-shop-backup.db";

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Backup downloaded");
    } catch (e) {
      toast.error("Backup failed — try again");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
      title="Download a backup of the shop database"
    >
      <Download className="size-3.5" />
      <span>Download Backup</span>
    </button>
  );
}