"""
AFT Converter v7 - Bpost mailing converter
Stap 1: Adresbestand -> AFT bestand (voor Bpost, .xls formaat) + ORIGIN-kopie
         - SEQ toegevoegd aan zowel AFT-bestand als ORIGIN-origineel
         - ORIGIN-bestand = origineel + SEQ kolom, hernoemd naar ORIGIN_<naam>
         - Aanvullen tot 500 rijen met Contrapunt-adres
         - AFT-bestand wordt geschreven als .xls (Excel 97-2003) i.p.v. .xlsx,
           omdat Bpost's e-MassPost upload .xlsx-bestanden van openpyxl soms
           weigert (ze missen wat metadata die Excel er zelf bij schrijft).
Stap 2: Bpost response samenvoegen met ORIGIN via SEQ -> TPD_merged_<naam>.xlsx
"""

import pandas as pd
import re
import threading
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
import xlwt

MAX_CHARS = 42
MIN_ROWS  = 500

AFT_TARGETS = [
    ("UNSTRUCTURED_NAME",                     "Naam *"),
    ("UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX","Straat + nummer *"),
    ("UNSTRUCTURED_POST_CODE_CITY",           "Postcode + Stad *"),
]

AFT_COLUMNS = [
    "SEQ", "GREETING", "FIRST_NAME", "MIDDLE_NAME", "LAST_NAME", "SUFFIX",
    "COMPANY_NAME", "DEPARTMENT", "BUILDING",
    "ADDRESS_LINE_1", "ADDRESS_LINE_2", "ADDRESS_LINE_3",
    "HOUSE_NUMBER", "BOX_NUMBER", "PO_BOX_NUMBER", "POSTAL_CODE", "CITY",
    "ISO_COUNTRY_CODE", "COUNTRY_NAME", "STATE",
    "UNSTRUCTURED_NAME", "UNSTRUCTURED_COMPANY_DEPARTMENT",
    "UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX", "UNSTRUCTURED_POST_CODE_CITY",
    "MIDNUMBER", "PRESORTING_CODE", "LANGUAGE", "PRIORITY",
    "FIELDTOPRINT1", "FIELDTOPRINT2", "FIELDTOPRINT3",
    "FEEDBACK", "ORGINFO", "ICTI", "IZON", "IMAC", "IWAV", "IOFF", "PRINTORDER",
]

RESPONSE_COLS = [
    "MIDNUMBER", "PRESORTING_CODE", "FEEDBACK",
    "FIELDTOPRINT1", "FIELDTOPRINT2", "FIELDTOPRINT3", "PRINTORDER",
]


# --- Helpers -----------------------------------------------------------------

def sanitize(val):
    if pd.isna(val):
        return ""
    s = str(val).replace("|", "")
    s = re.sub(r"[\r\n]+", " ", s).strip()
    return s[:MAX_CHARS]


def build_value(row, cols):
    parts = [str(row[c]).strip() for c in cols
             if c and not pd.isna(row[c]) and str(row[c]).strip()]
    return sanitize(" ".join(parts))


def read_excel_any(filepath, dtype=None):
    """
    Leest een Excel-bestand in, ongeacht of het .xlsx (nieuw) of .xls (oud
    Excel 97-2003 formaat) is. Kiest automatisch de juiste engine en geeft
    een duidelijke Nederlandstalige foutmelding als een vereist pakket
    ontbreekt, in plaats van de kale Engelse pandas/xlrd-melding.
    """
    path = Path(filepath)
    suffix = path.suffix.lower()

    if suffix == ".xls":
        try:
            return pd.read_excel(filepath, engine="xlrd", dtype=dtype)
        except ImportError:
            raise ImportError(
                "Dit is een oud .xls-bestand (Excel 97-2003 formaat). "
                "Daarvoor is het pakket 'xlrd' (versie 2.0.1 of hoger) nodig, "
                "dat nu niet geinstalleerd is.\n\n"
                "Oplossing 1 (aanbevolen): open het bestand in Excel en sla het "
                "opnieuw op als .xlsx (Bestand > Opslaan als > Excel-werkmap).\n\n"
                "Oplossing 2: installeer het ontbrekende pakket. Open een "
                "opdrachtprompt en typ:\n"
                '    pip install "xlrd>=2.0.1"\n'
                "Herstart daarna de AFT Converter."
            )
    elif suffix == ".xlsx":
        return pd.read_excel(filepath, engine="openpyxl", dtype=dtype)
    else:
        # Onbekende extensie: laat pandas zelf de engine kiezen
        return pd.read_excel(filepath, dtype=dtype)


# --- Stap 1: Conversie naar AFT + ORIGIN --------------------------------------

def convert_and_save(df_src, mapping, source_path):
    """
    Maakt twee bestanden:
    1. AFT_<naam>_<ts>.xlsx    -- voor Bpost (39 kolommen, aangevuld tot 500)
    2. ORIGIN_<naam>.xlsx      -- origineel + SEQ kolom (alleen echte adressen)
    Koppelsleutel tussen beide: SEQ
    """
    src = Path(source_path)
    ts  = datetime.now().strftime("%Y%m%d_%H%M%S")

    # -- AFT-rijen bouwen --
    aft_rows = []
    for i, row in df_src.iterrows():
        seq = i + 1
        aft_row = {col: "" for col in AFT_COLUMNS}
        aft_row["SEQ"]      = seq
        aft_row["PRIORITY"] = "NP"
        for aft_field, src_cols in mapping.items():
            aft_row[aft_field] = build_value(row, src_cols)
        aft_rows.append(aft_row)

    actual_count = len(aft_rows)

    # -- Opvulrijen Contrapunt --
    if actual_count < MIN_ROWS:
        for i in range(actual_count, MIN_ROWS):
            filler = {col: "" for col in AFT_COLUMNS}
            filler["SEQ"]      = i + 1
            filler["PRIORITY"] = "NP"
            filler["UNSTRUCTURED_NAME"]                      = "Contrapunt"
            filler["UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX"] = "P. Nollekensstraat 95"
            filler["UNSTRUCTURED_POST_CODE_CITY"]            = "3010 Kessel-Lo"
            aft_rows.append(filler)

    # -- AFT-bestand schrijven (als .xls, zie docstring bovenaan) --
    aft_path = src.parent / f"AFT_{src.stem}_{ts}.xls"
    _write_aft_xls(aft_rows, aft_path)

    # -- ORIGIN-bestand: origineel + SEQ vooraan --
    df_origin = df_src.copy()
    df_origin.insert(0, "SEQ", range(1, actual_count + 1))
    origin_path = src.parent / f"ORIGIN_{src.stem}.xlsx"
    _write_origin_excel(df_origin, origin_path)

    return aft_path, origin_path, actual_count


def _write_aft_xls(rows, out_path):
    """
    Schrijft het AFT-bestand als echt .xls (Excel 97-2003 / BIFF8) via xlwt,
    in plaats van .xlsx via openpyxl. Bpost's e-MassPost upload weigerde de
    openpyxl-.xlsx-bestanden totdat ze handmatig in Excel werden geopend en
    opnieuw opgeslagen; .xls is een eenvoudiger, ouder formaat waarmee dat
    validatieprobleem vermeden wordt.

    Let op: xlwt heeft een limiet van 65.536 rijen en 256 kolommen per blad.
    Dat is ruim voldoende voor de 500+ rijen / 39 kolommen van een AFT-bestand.
    """
    wb = xlwt.Workbook(encoding="utf-8")
    ws = wb.add_sheet("Sheet1")

    hdr_style = xlwt.easyxf(
        "font: name Arial, bold on, height 200, colour white;"
        "pattern: pattern solid, fore_colour dark_red;"
        "align: horiz center, vert center;"
    )
    dat_style = xlwt.easyxf("font: name Arial, height 180;")
    seq_style = xlwt.easyxf(
        "font: name Arial, height 180;",
        num_format_str="0",
    )

    for col_idx, col_name in enumerate(AFT_COLUMNS):
        ws.write(0, col_idx, col_name, hdr_style)

    for row_idx, row_dict in enumerate(rows, 1):
        for col_idx, col_name in enumerate(AFT_COLUMNS):
            val = row_dict.get(col_name, "")
            if col_name == "SEQ" and val != "":
                ws.write(row_idx, col_idx, int(val), seq_style)
            else:
                ws.write(row_idx, col_idx, str(val) if val else "", dat_style)

    col_widths = {
        "SEQ": 6, "GREETING": 10, "FIRST_NAME": 16, "MIDDLE_NAME": 12,
        "LAST_NAME": 16, "SUFFIX": 8, "COMPANY_NAME": 22, "DEPARTMENT": 16,
        "BUILDING": 16, "ADDRESS_LINE_1": 22, "ADDRESS_LINE_2": 22,
        "ADDRESS_LINE_3": 22, "HOUSE_NUMBER": 10, "BOX_NUMBER": 10,
        "PO_BOX_NUMBER": 12, "POSTAL_CODE": 10, "CITY": 16,
        "ISO_COUNTRY_CODE": 6, "COUNTRY_NAME": 14, "STATE": 12,
        "UNSTRUCTURED_NAME": 30, "UNSTRUCTURED_COMPANY_DEPARTMENT": 28,
        "UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX": 32,
        "UNSTRUCTURED_POST_CODE_CITY": 22,
        "MIDNUMBER": 16, "PRESORTING_CODE": 14, "LANGUAGE": 8, "PRIORITY": 8,
        "FIELDTOPRINT1": 14, "FIELDTOPRINT2": 14, "FIELDTOPRINT3": 14,
        "FEEDBACK": 22, "ORGINFO": 10,
        "ICTI": 6, "IZON": 6, "IMAC": 6, "IWAV": 6, "IOFF": 6, "PRINTORDER": 10,
    }
    for col_idx, col_name in enumerate(AFT_COLUMNS):
        # xlwt kolombreedte is in 1/256e van een tekenbreedte
        ws.col(col_idx).width = col_widths.get(col_name, 10) * 256

    ws.set_panes_frozen(True)
    ws.set_horz_split_pos(1)
    ws.set_remove_splits(True)
    wb.save(str(out_path))


def _write_origin_excel(df, out_path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Sheet1"

    seq_fill  = PatternFill("solid", start_color="C0392B", end_color="C0392B")
    norm_fill = PatternFill("solid", start_color="2C3E50", end_color="2C3E50")
    hdr_font  = Font(name="Arial", bold=True, size=10, color="FFFFFF")
    hdr_align = Alignment(horizontal="center", vertical="center")
    dat_font  = Font(name="Arial", size=9)
    dat_align = Alignment(horizontal="left", vertical="center")

    for col_idx, col_name in enumerate(df.columns, 1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font      = hdr_font
        cell.fill      = seq_fill if col_name == "SEQ" else norm_fill
        cell.alignment = hdr_align

    for row_idx, row in enumerate(df.itertuples(index=False), 2):
        for col_idx, value in enumerate(row, 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.value     = "" if pd.isna(value) else value
            cell.font      = dat_font
            cell.alignment = dat_align

    for col_idx, col_name in enumerate(df.columns, 1):
        ws.column_dimensions[get_column_letter(col_idx)].width = \
            6 if col_name == "SEQ" else 18

    ws.row_dimensions[1].height = 18
    ws.freeze_panes = "B2"   # Freeze na SEQ zodat SEQ altijd zichtbaar
    wb.save(str(out_path))


# --- Stap 2: Response samenvoegen ---------------------------------------------

def merge_response(origin_path, resp_path):
    """
    Koppelt Bpost responsefile aan ORIGIN-bestand via SEQ.
    Voegt MIDNUMBER, PRESORTING_CODE en FEEDBACK toe.
    Opvulrijen (SEQ > aantal echte adressen) worden weggelaten.
    """
    df_origin = read_excel_any(origin_path)
    df_resp   = read_excel_any(resp_path, dtype={"MIDNUMBER": str})

    if "SEQ" not in df_origin.columns:
        raise ValueError("ORIGIN-bestand heeft geen SEQ kolom. "
                         "Gebruik het ORIGIN-bestand dat door deze tool is aangemaakt.")

    n_real = len(df_origin)  # Alleen echte adressen, geen opvulrijen

    # Bpost response: hou enkel rijen met SEQ <= n_real (geen Contrapunt-opvulling)
    df_resp_real = df_resp[df_resp["SEQ"] <= n_real].copy()
    n_filler = len(df_resp) - len(df_resp_real)

    # Niet elk responsebestand bevat noodzakelijk alle kolommen (bv. oudere
    # Bpost-responses zonder FIELDTOPRINT/PRINTORDER). Ontbrekende kolommen
    # worden overgeslagen i.p.v. de hele merge te laten crashen.
    available_cols = [c for c in RESPONSE_COLS if c in df_resp_real.columns]
    missing_cols   = [c for c in RESPONSE_COLS if c not in df_resp_real.columns]

    # Koppel via SEQ
    resp_indexed = df_resp_real.set_index("SEQ")[available_cols]

    matched   = 0
    no_match  = 0

    for col in RESPONSE_COLS:
        df_origin[col] = None

    for idx, row in df_origin.iterrows():
        seq = row["SEQ"]
        if seq in resp_indexed.index:
            for col in available_cols:
                df_origin.at[idx, col] = resp_indexed.loc[seq, col]
            matched += 1
        else:
            no_match += 1

    stats = {
        "matched":        matched,
        "no_match":       no_match,
        "filler_removed": n_filler,
        "missing_cols":   missing_cols,
    }
    return df_origin, stats


def save_merged(df, origin_path):
    src = Path(origin_path)
    ts  = datetime.now().strftime("%Y%m%d_%H%M%S")
    # ORIGIN_-prefix van de tussenkopie weghalen, zodat het eindresultaat
    # duidelijk als TPD_merged_... herkenbaar is (het laatste-stadium bestand)
    stem = src.stem
    if stem.startswith("ORIGIN_"):
        stem = stem[len("ORIGIN_"):]
    out_path = src.parent / f"TPD_merged_{stem}_{ts}.xlsx"

    wb = Workbook()
    ws = wb.active
    ws.title = "Sheet1"

    seq_fill  = PatternFill("solid", start_color="C0392B", end_color="C0392B")
    resp_fill = PatternFill("solid", start_color="27AE60", end_color="27AE60")
    norm_fill = PatternFill("solid", start_color="2C3E50", end_color="2C3E50")
    hdr_font  = Font(name="Arial", bold=True, size=10, color="FFFFFF")
    hdr_align = Alignment(horizontal="center", vertical="center")
    dat_font  = Font(name="Arial", size=9)
    dat_align = Alignment(horizontal="left", vertical="center")

    for col_idx, col_name in enumerate(df.columns, 1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font      = hdr_font
        cell.fill      = seq_fill if col_name == "SEQ" \
                         else resp_fill if col_name in RESPONSE_COLS \
                         else norm_fill
        cell.alignment = hdr_align

    col_names = list(df.columns)
    for row_idx, row in enumerate(df.itertuples(index=False), 2):
        for col_idx, value in enumerate(row, 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            col_name = col_names[col_idx - 1]
            if col_name == "MIDNUMBER":
                cell.value          = "" if pd.isna(value) else str(value)
                cell.number_format  = "@"   # Tekstopmaak: geen wetenschappelijke notatie
            else:
                cell.value = "" if pd.isna(value) else value
            cell.font      = dat_font
            cell.alignment = dat_align

    for col_idx, col_name in enumerate(df.columns, 1):
        ws.column_dimensions[get_column_letter(col_idx)].width = \
            6  if col_name == "SEQ" \
            else 22 if col_name in RESPONSE_COLS \
            else 18
    ws.row_dimensions[1].height = 18
    ws.freeze_panes = "B2"
    wb.save(str(out_path))
    return out_path


# --- Multi-select widget -------------------------------------------------------

class MultiSelect(tk.Frame):
    def __init__(self, parent, columns, **kwargs):
        super().__init__(parent, **kwargs)
        self.vars = {}

        canvas = tk.Canvas(self, height=110, width=220, highlightthickness=0, bg="white")
        sb = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=sb.set)
        canvas.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        inner = tk.Frame(canvas, bg="white")
        canvas.create_window((0, 0), window=inner, anchor="nw")
        inner.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))

        for col in columns:
            var = tk.BooleanVar(value=False)
            tk.Checkbutton(inner, text=col, variable=var, bg="white",
                           font=("Segoe UI", 8), anchor="w").pack(fill="x", padx=4)
            self.vars[col] = var

    def get_selected(self):
        return [col for col, var in self.vars.items() if var.get()]

    def set_callback(self, fn):
        for var in self.vars.values():
            var.trace_add("write", lambda *_: fn())


# --- Mapping Dialog --------------------------------------------------------------

class MappingDialog(tk.Toplevel):
    def __init__(self, parent, filepath, df):
        super().__init__(parent)
        self.title(f"Kolommen instellen - {Path(filepath).name}")
        self.resizable(True, True)
        self.result = None
        self.df = df
        self.filepath = filepath
        self.multiselects = {}
        self.configure(bg="#f7f7f7")

        cols = list(df.columns)

        tk.Label(self, text="Wijs bronkolommen toe aan AFT-velden",
                 font=("Segoe UI", 10, "bold"), bg="#f7f7f7").pack(
                 anchor="w", padx=16, pady=(14, 2))
        tk.Label(self, text="Meerdere kolommen aanvinken = samenvoegen met spatie.",
                 font=("Segoe UI", 8), fg="#666", bg="#f7f7f7").pack(
                 anchor="w", padx=16, pady=(0, 8))

        map_frame = tk.Frame(self, bg="#f7f7f7")
        map_frame.pack(fill="x", padx=16)

        for col_idx, (aft_field, label) in enumerate(AFT_TARGETS):
            cell = tk.Frame(map_frame, bg="#f7f7f7")
            cell.grid(row=0, column=col_idx, padx=8, sticky="n")
            tk.Label(cell, text=label, font=("Segoe UI", 9, "bold"),
                     bg="#f7f7f7", fg="#c0392b").pack(anchor="w", pady=(0, 4))
            ms = MultiSelect(cell, cols, bg="white", relief="solid", bd=1)
            ms.pack()
            ms.set_callback(self.update_preview)
            self.multiselects[aft_field] = ms

        ttk.Separator(self).pack(fill="x", padx=16, pady=10)
        tk.Label(self, text="Preview (eerste 4 rijen):",
                 font=("Segoe UI", 9, "bold"), bg="#f7f7f7").pack(anchor="w", padx=16)

        prev_frame = tk.Frame(self, bg="#1e1e1e")
        prev_frame.pack(fill="both", expand=True, padx=16, pady=(4, 0))
        self.preview = tk.Text(prev_frame, height=9, font=("Courier New", 8),
                               bg="#1e1e1e", fg="#d4d4d4", relief="flat",
                               state="disabled", wrap="none")
        self.preview.pack(fill="both", expand=True, padx=4, pady=4)

        btn_frame = tk.Frame(self, bg="#f7f7f7")
        btn_frame.pack(pady=12)
        tk.Button(btn_frame, text="Converteren", command=self.on_convert,
                  bg="#27ae60", fg="white", font=("Segoe UI", 9, "bold"),
                  padx=16, pady=7, relief="flat", cursor="hand2").pack(side="left", padx=6)
        tk.Button(btn_frame, text="Annuleren", command=self.destroy,
                  font=("Segoe UI", 9), padx=12, pady=7, relief="flat",
                  cursor="hand2", bg="#e0e0e0").pack(side="left", padx=6)

        self.update_preview()
        self.grab_set()
        self.focus()

    def update_preview(self):
        mapping = {f: ms.get_selected() for f, ms in self.multiselects.items()}
        labels  = {f: lbl for f, lbl in AFT_TARGETS}
        lines   = []
        for i, (_, row) in enumerate(self.df.head(4).iterrows()):
            lines.append(f"  SEQ {i+1}")
            for aft_field, src_cols in mapping.items():
                val = build_value(row, src_cols) if src_cols else "-"
                lines.append(f"    {labels[aft_field]:<22}: {val}")
            lines.append("  " + "-" * 50)
        self.preview.config(state="normal")
        self.preview.delete("1.0", tk.END)
        self.preview.insert(tk.END, "\n".join(lines))
        self.preview.config(state="disabled")

    def on_convert(self):
        mapping = {f: ms.get_selected() for f, ms in self.multiselects.items()}
        required = ["UNSTRUCTURED_NAME", "UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX",
                    "UNSTRUCTURED_POST_CODE_CITY"]
        missing = [f for f in required if not mapping.get(f)]
        if missing:
            labels = {f: lbl for f, lbl in AFT_TARGETS}
            names  = ", ".join(labels[f].replace(" *", "") for f in missing)
            messagebox.showerror("Ontbrekende velden",
                                 f"Duid minstens een kolom aan voor:\n{names}")
            return
        self.result = mapping
        self.destroy()


# --- Merge Dialog ------------------------------------------------------------------

class MergeDialog(tk.Toplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Bpost response samenvoegen")
        self.resizable(False, False)
        self.configure(bg="#f7f7f7")
        self.geometry("560x260")
        self.origin_path = None
        self.resp_path   = None
        self.result      = None

        tk.Label(self, text="Bpost response samenvoegen met ORIGIN-bestand",
                 font=("Segoe UI", 10, "bold"), bg="#f7f7f7").pack(
                 anchor="w", padx=16, pady=(14, 2))
        tk.Label(self,
                 text="Koppeling via SEQ  -  Voegt MIDNUMBER, PRESORTING_CODE en FEEDBACK toe",
                 font=("Segoe UI", 8), fg="#666", bg="#f7f7f7").pack(
                 anchor="w", padx=16, pady=(0, 12))

        row1 = tk.Frame(self, bg="#f7f7f7")
        row1.pack(fill="x", padx=16, pady=4)
        tk.Button(row1, text="ORIGIN-bestand", command=self._pick_origin,
                  bg="#c0392b", fg="white", font=("Segoe UI", 9, "bold"),
                  padx=12, pady=7, relief="flat", cursor="hand2", width=16).pack(side="left")
        self.origin_label = tk.Label(row1, text="-", font=("Segoe UI", 8),
                                  fg="#888", bg="#f7f7f7")
        self.origin_label.pack(side="left", padx=10)

        row2 = tk.Frame(self, bg="#f7f7f7")
        row2.pack(fill="x", padx=16, pady=4)
        tk.Button(row2, text="Bpost responsefile", command=self._pick_resp,
                  bg="#27ae60", fg="white", font=("Segoe UI", 9, "bold"),
                  padx=12, pady=7, relief="flat", cursor="hand2", width=16).pack(side="left")
        self.resp_label = tk.Label(row2, text="-", font=("Segoe UI", 8),
                                   fg="#888", bg="#f7f7f7")
        self.resp_label.pack(side="left", padx=10)

        ttk.Separator(self).pack(fill="x", padx=16, pady=12)

        btn_frame = tk.Frame(self, bg="#f7f7f7")
        btn_frame.pack()
        self.merge_btn = tk.Button(btn_frame, text="Samenvoegen",
                  command=self._do_merge,
                  bg="#2980b9", fg="white", font=("Segoe UI", 9, "bold"),
                  padx=16, pady=7, relief="flat", cursor="hand2", state="disabled")
        self.merge_btn.pack(side="left", padx=6)
        tk.Button(btn_frame, text="Annuleren", command=self.destroy,
                  font=("Segoe UI", 9), padx=12, pady=7, relief="flat",
                  cursor="hand2", bg="#e0e0e0").pack(side="left", padx=6)

        self.grab_set()
        self.focus()

    def _pick_origin(self):
        fp = filedialog.askopenfilename(title="ORIGIN-bestand selecteren",
                   filetypes=[("Excel", "*.xlsx *.xls"), ("Alle", "*.*")])
        if fp:
            self.origin_path = fp
            self.origin_label.config(text=Path(fp).name, fg="#2c3e50")
            self._check_ready()

    def _pick_resp(self):
        fp = filedialog.askopenfilename(title="Bpost responsefile selecteren",
                   filetypes=[("Excel", "*.xlsx *.xls"), ("Alle", "*.*")])
        if fp:
            self.resp_path = fp
            self.resp_label.config(text=Path(fp).name, fg="#2c3e50")
            self._check_ready()

    def _check_ready(self):
        if self.origin_path and self.resp_path:
            self.merge_btn.config(state="normal")

    def _do_merge(self):
        self.result = (self.origin_path, self.resp_path)
        self.destroy()


# --- Main App ------------------------------------------------------------------

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("AFT Converter v6 - Bpost")
        self.resizable(False, False)
        self.geometry("560x420")
        self.configure(bg="#f7f7f7")

        # Header
        header = tk.Frame(self, bg="#c0392b")
        header.pack(fill="x")
        tk.Label(header, text="AFT Converter", font=("Segoe UI", 13, "bold"),
                 bg="#c0392b", fg="white").pack(side="left", padx=16, pady=12)
        tk.Label(header, text="Bpost mailing tool  -  v6",
                 font=("Segoe UI", 9), bg="#c0392b", fg="#f5b7b1").pack(side="left")

        ttk.Separator(self).pack(fill="x", padx=16, pady=8)

        # Stap 1
        tk.Label(self, text="Stap 1 - Adresbestand omzetten naar AFT",
                 font=("Segoe UI", 9, "bold"), fg="#2c3e50", bg="#f7f7f7").pack(
                 anchor="w", padx=16)
        tk.Label(self,
                 text="Maakt AFT_<naam>.xls (voor Bpost) en ORIGIN_<naam>.xlsx (origineel + SEQ)",
                 font=("Segoe UI", 8), fg="#666", bg="#f7f7f7").pack(
                 anchor="w", padx=16, pady=(1, 4))
        btn_row1 = tk.Frame(self, bg="#f7f7f7")
        btn_row1.pack(fill="x", padx=16, pady=(0, 4))
        tk.Button(btn_row1, text="Bestand selecteren...", command=self.select_file,
                  bg="#2980b9", fg="white", font=("Segoe UI", 9, "bold"),
                  padx=14, pady=8, relief="flat", cursor="hand2").pack(side="left")
        self.file_label = tk.Label(btn_row1, text="-",
                                   font=("Segoe UI", 8), fg="#888", bg="#f7f7f7")
        self.file_label.pack(side="left", padx=10)

        ttk.Separator(self).pack(fill="x", padx=16, pady=8)

        # Stap 2
        tk.Label(self, text="Stap 2 - Bpost response samenvoegen met ORIGIN",
                 font=("Segoe UI", 9, "bold"), fg="#2c3e50", bg="#f7f7f7").pack(
                 anchor="w", padx=16)
        tk.Label(self,
                 text="Koppelt via SEQ  -  voegt MIDNUMBER, PRESORTING_CODE en FEEDBACK toe",
                 font=("Segoe UI", 8), fg="#666", bg="#f7f7f7").pack(
                 anchor="w", padx=16, pady=(1, 4))
        btn_row2 = tk.Frame(self, bg="#f7f7f7")
        btn_row2.pack(fill="x", padx=16, pady=(0, 4))
        tk.Button(btn_row2, text="Response samenvoegen...", command=self.open_merge,
                  bg="#27ae60", fg="white", font=("Segoe UI", 9, "bold"),
                  padx=14, pady=8, relief="flat", cursor="hand2").pack(side="left")

        ttk.Separator(self).pack(fill="x", padx=16, pady=8)

        tk.Label(self, text="Activiteit:", font=("Segoe UI", 9, "bold"),
                 bg="#f7f7f7").pack(anchor="w", padx=16)

        log_outer = tk.Frame(self, bg="#1e1e1e")
        log_outer.pack(fill="both", expand=True, padx=16, pady=(4, 16))
        self.log = tk.Text(log_outer, height=7, font=("Courier New", 8),
                           bg="#1e1e1e", fg="#d4d4d4", relief="flat",
                           state="disabled", wrap="none")
        self.log.pack(fill="both", expand=True, padx=4, pady=4)

        self.log_msg("Klaar.")
        self.log_msg("Stap 1: adresbestand -> AFT voor Bpost + ORIGIN met SEQ.")
        self.log_msg("Stap 2: Bpost response -> samenvoegen met ORIGIN via SEQ.")

    def log_msg(self, msg):
        def _do():
            self.log.config(state="normal")
            self.log.insert(tk.END, f"[{datetime.now().strftime('%H:%M:%S')}] {msg}\n")
            self.log.see(tk.END)
            self.log.config(state="disabled")
        self.after(0, _do)

    # -- Stap 1 --

    def select_file(self):
        fp = filedialog.askopenfilename(
            title="Selecteer adresbestand",
            filetypes=[("Excel bestanden", "*.xlsx *.xls"), ("Alle bestanden", "*.*")])
        if not fp:
            return
        path = Path(fp)
        self.file_label.config(text=path.name, fg="#2c3e50")
        self.log_msg(f"Geselecteerd: {path.name}")
        self.handle_file(path)

    def handle_file(self, filepath):
        try:
            df = read_excel_any(filepath)
        except ImportError as e:
            self.log_msg("FOUT bij lezen: ontbrekend pakket voor .xls-bestanden.")
            messagebox.showerror("Ontbrekend pakket", str(e))
            return
        except Exception as e:
            self.log_msg(f"FOUT bij lezen: {e}")
            return

        n = len(df)
        self.log_msg(f"{n} adressen geladen.")
        if n < MIN_ROWS:
            self.log_msg(f"Wordt aangevuld tot {MIN_ROWS} rijen in AFT-bestand.")

        dlg = MappingDialog(self, filepath, df)
        self.wait_window(dlg)

        if dlg.result is None:
            self.log_msg("Geannuleerd.")
            return

        try:
            aft_path, origin_path, count = convert_and_save(df, dlg.result, filepath)
            filler = max(0, MIN_ROWS - count)
            self.log_msg(f"OK: {count} echte adressen verwerkt.")
            if filler > 0:
                self.log_msg(f"-> {filler} opvulrijen toegevoegd (Contrapunt) -> AFT totaal {MIN_ROWS}")
            self.log_msg(f"Bestand: {aft_path.name}")
            self.log_msg(f"Bestand: {origin_path.name}")
            filler_line = f"- {filler} opvulrijen (Contrapunt) in AFT\n" if filler > 0 else ""
            messagebox.showinfo("Stap 1 klaar!",
                f"Twee bestanden aangemaakt in dezelfde map:\n\n"
                f"{aft_path.name}\n"
                f"   -> opsturen naar Bpost\n"
                f"   -> {count} echte adressen + {filler} opvulrijen\n\n"
                f"{origin_path.name}\n"
                f"   -> jouw werkkopie met SEQ-kolom\n"
                f"   -> {count} rijen\n\n"
                f"Koppelsleutel tussen beide: SEQ")
        except Exception as e:
            self.log_msg(f"FOUT: {e}")
            messagebox.showerror("Fout", str(e))

    # -- Stap 2 --

    def open_merge(self):
        dlg = MergeDialog(self)
        self.wait_window(dlg)

        if dlg.result is None:
            self.log_msg("Samenvoegen geannuleerd.")
            return

        origin_path, resp_path = dlg.result
        self.log_msg(f"ORIGIN:   {Path(origin_path).name}")
        self.log_msg(f"Response: {Path(resp_path).name}")

        try:
            df_merged, stats = merge_response(origin_path, resp_path)
            out_path = save_merged(df_merged, origin_path)

            self.log_msg(f"OK: {stats['matched']} rijen gekoppeld via SEQ.")
            if stats['no_match'] > 0:
                self.log_msg(f"LET OP: {stats['no_match']} rijen zonder match (controleer SEQ).")
            if stats['filler_removed'] > 0:
                self.log_msg(f"-> {stats['filler_removed']} Contrapunt-opvulrijen weggelaten.")
            if stats.get('missing_cols'):
                self.log_msg(f"LET OP: kolommen niet gevonden in responsebestand: {', '.join(stats['missing_cols'])}")
            self.log_msg(f"Resultaat: {out_path.name}")

            messagebox.showinfo("Stap 2 klaar!",
                f"Response succesvol samengevoegd!\n\n"
                f"- {stats['matched']} rijen gekoppeld via SEQ\n"
                f"- Toegevoegd: MIDNUMBER, PRESORTING_CODE, FEEDBACK,\n"
                f"  FIELDTOPRINT1/2/3, PRINTORDER\n"
                + (f"- LET OP: {stats['no_match']} rijen zonder match\n" if stats['no_match'] else "")
                + (f"- LET OP: ontbrekend in response: {', '.join(stats['missing_cols'])}\n" if stats.get('missing_cols') else "")
                + f"\n{out_path.name}")
        except ImportError as e:
            self.log_msg("FOUT: ontbrekend pakket voor .xls-bestanden.")
            messagebox.showerror("Ontbrekend pakket", str(e))
        except Exception as e:
            self.log_msg(f"FOUT: {e}")
            messagebox.showerror("Fout", str(e))


if __name__ == "__main__":
    app = App()
    app.mainloop()
