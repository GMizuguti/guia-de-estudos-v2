"""Recorta uma região de uma página do PDF como PNG, para o bloco { t: "img" }.

Uso:  python -X utf8 tools/crop-figure.py "material.pdf" PAGINA x0 y0 x1 y1 public/img/p05-nome.png [dpi]

As coordenadas (em pontos) vêm do figuras.txt do extract-pdf.py; alargue alguns pontos para
não cortar rótulos. dpi padrão 200 (nítido no zoom da imagem sem pesar no pacote).
Imprime o bloco pronto para colar no capítulo (preencha alt e caption).
Requer: pip install pymupdf
"""
import os
import sys

import pymupdf

pdf, page_no = sys.argv[1], int(sys.argv[2])
x0, y0, x1, y1 = (float(v) for v in sys.argv[3:7])
dest = sys.argv[7]
dpi = int(sys.argv[8]) if len(sys.argv) > 8 else 200

doc = pymupdf.open(pdf)
rect = pymupdf.Rect(x0, y0, x1, y1) & doc[page_no - 1].rect
os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
doc[page_no - 1].get_pixmap(clip=rect, dpi=dpi).save(dest)

# w/h em px CSS (96 por polegada; o PDF usa 72 pontos por polegada): só dão a proporção e evitam salto de layout
w, h = round(rect.width * 96 / 72), round(rect.height * 96 / 72)
src = dest.replace("\\", "/").split("public/", 1)[-1]
print('{ t: "img", src: "%s", alt: "", caption: "", page: %d, w: %d, h: %d, dark: "papel" },' % (src, page_no, w, h))
