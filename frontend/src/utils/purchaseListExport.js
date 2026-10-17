// Helpers for exporting the Purchase List as text or CSV.

function groupByWholesaler(items) {
    const groups = new Map();
    for (const it of items) {
      const key = it.wholesaler_id ?? "__none__";
      const label = it.wholesaler_name || "Unassigned";
      if (!groups.has(key)) {
        groups.set(key, { key, label, items: [] });
      }
      groups.get(key).items.push(it);
    }
    // Sort groups alphabetically, but push "Unassigned" to the end
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === "__none__") return 1;
      if (b.key === "__none__") return -1;
      return a.label.localeCompare(b.label);
    });
  }
  
  // -------------------- Copy to clipboard (text) --------------------
  
  export function listToText(items) {
    const groups = groupByWholesaler(items);
    const blocks = groups.map((g) => {
      const lines = g.items.map(
        (it) => `${it.product_name} x ${Number(it.quantity)}`
      );
      return `${g.label} order:\n\n${lines.join("\n")}`;
    });
    return blocks.join("\n\n");
  }
  
  export async function copyListToClipboard(items) {
    const text = listToText(items);
    if (!text) return false;
  
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers / insecure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        return true;
      } catch (e) {
        return false;
      } finally {
        ta.remove();
      }
    }
  }
  
  // -------------------- CSV --------------------
  
  function csvEscape(value) {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }
  
  export function listToCsv(items) {
    const groups = groupByWholesaler(items);
    const sections = groups.map((g) => {
      const headerLines = [
        `Wholesaler: ${csvEscape(g.label)}`,
        "Product,Category,Quantity",
      ];
      const itemLines = g.items.map((it) =>
        [
          csvEscape(it.product_name),
          csvEscape(it.product_category || ""),
          csvEscape(Number(it.quantity)),
        ].join(",")
      );
      return [...headerLines, ...itemLines].join("\n");
    });
    return sections.join("\n\n");
  }
  
  export function slugify(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  
  export function downloadCsv(filename, csv) {
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    // \uFEFF is a UTF-8 BOM so Excel opens Indian rupee symbols and any accents correctly
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }