"""สร้างรูปย่อ 256px ของตัวละคร/สัตว์เลี้ยง (ใช้บนการ์ดเล็ก เช่น หน้ากิลด์ — ลดหน่วยความจำ ~4 เท่า)

รัน:  python scripts/make-thumbs.py
เพิ่มรูปตัวละครใหม่ใน web/src/assets/units/ แล้วรันซ้ำ (ทำเฉพาะไฟล์ที่ยังไม่มี/รูปเต็มใหม่กว่า)
"""
from pathlib import Path
from PIL import Image

SIZE = 256
src = Path(__file__).resolve().parent.parent / 'web' / 'src' / 'assets' / 'units'
out = src / 'thumb'
out.mkdir(exist_ok=True)
made = 0
for f in sorted(src.iterdir()):
    if f.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp') or not f.is_file():
        continue
    t = out / (f.stem + '.webp')
    # ไฟล์ว่าง (0 ไบต์ — เคยเซฟพัง) = ทำใหม่เสมอ ไม่ว่าเวลาไฟล์จะใหม่กว่า
    if t.exists() and t.stat().st_size > 0 and t.stat().st_mtime >= f.stat().st_mtime:
        continue
    im = Image.open(f).convert('RGBA')
    im.thumbnail((SIZE, SIZE), Image.LANCZOS)
    im.save(t, 'WEBP', quality=86, method=4)
    made += 1
print(f'thumbs: {made} new/updated in {out}')
