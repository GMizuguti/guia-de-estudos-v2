"""Extrai um PDF para ler antes de escrever os dados.

Uso:  python -X utf8 tools/extract-pdf.py "material.pdf" pasta-de-saida

Gera em pasta-de-saida:
  texto.txt        texto com layout (pdftotext -layout, se existir; senão PyMuPDF)
  tabelas.txt      TODAS as tabelas, célula por célula (PyMuPDF find_tables). O pdftotext embaralha
                   colunas e desloca linhas sem avisar; use este arquivo para montar os `rows`.
  enfase.txt       trechos em negrito, itálico ou cor (para reproduzir destaques e quadros)
  figuras.txt      imagens e desenhos de cada página, com o retângulo para recortar (tools/crop-figure.py)
  pNN.png          cada página renderizada, para conferir tabelas e quadros pela imagem

Requer: pip install pymupdf
"""
import os
import shutil
import subprocess
import sys

import pymupdf

pdf, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
doc = pymupdf.open(pdf)

txt = os.path.join(out, "texto.txt")
if shutil.which("pdftotext"):
    subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", pdf, txt], check=True)
else:
    with open(txt, "w", encoding="utf-8") as f:
        f.write("\n".join(p.get_text() for p in doc))

with open(os.path.join(out, "tabelas.txt"), "w", encoding="utf-8") as f:
    for i, page in enumerate(doc):
        for j, t in enumerate(page.find_tables().tables):
            f.write("=== página %d · tabela %d · %d linhas\n" % (i + 1, j, t.row_count))
            for row in t.extract():
                cells = [(c or "").replace("\n", " ").strip() for c in row]
                f.write(" | ".join(c for c in cells if c) + "\n")
            f.write("\n")

with open(os.path.join(out, "enfase.txt"), "w", encoding="utf-8") as f:
    for i, page in enumerate(doc):
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    t = span["text"].strip()
                    if not t:
                        continue
                    bold, ital, color = span["flags"] & 16, span["flags"] & 2, span["color"]
                    if bold or ital or color not in (0, 0x595959):
                        f.write("%d %s%s %s %s\n" % (i + 1, "B" if bold else "-", "I" if ital else "-", hex(color), t[:120]))

# Figuras: imagens embutidas e grupos de desenho vetorial que não são tabela
def overlap(a, b):
    x0, y0, x1, y1 = max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])
    return max(0, x1 - x0) * max(0, y1 - y0)

with open(os.path.join(out, "figuras.txt"), "w", encoding="utf-8") as f:
    f.write("# página · tipo · x0 y0 x1 y1 (pontos) · confira na pNN.png e recorte com tools/crop-figure.py\n")
    for i, page in enumerate(doc):
        tabs = [tuple(t.bbox) for t in page.find_tables().tables]
        for im in page.get_image_info():
            b = im["bbox"]
            if (b[2] - b[0]) * (b[3] - b[1]) >= 2500:
                f.write("%d imagem %.0f %.0f %.0f %.0f\n" % (i + 1, *b))
        clusters = page.cluster_drawings() if hasattr(page, "cluster_drawings") else []
        for r in clusters:
            b = tuple(r)
            area = (b[2] - b[0]) * (b[3] - b[1])
            if area < 6000 or any(overlap(b, t) > 0.5 * area for t in tabs):
                continue  # traço solto, fundo de quadro pequeno ou grade de tabela
            f.write("%d desenho %.0f %.0f %.0f %.0f\n" % (i + 1, *b))

for i, page in enumerate(doc):
    page.get_pixmap(dpi=110).save(os.path.join(out, "p%02d.png" % (i + 1)))

print("páginas:", doc.page_count, "· saída em", out)
