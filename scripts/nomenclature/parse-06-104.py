"""Transcribe annexes II and III of décret exécutif 06-104 (JO n° 13, 5 March 2006) into lib/nomenclature-06-104.ts.

Usage:  pdftotext -layout decret-06-104.pdf /tmp/n.txt && python3 -I scripts/nomenclature/parse-06-104.py /tmp/n.txt lib/nomenclature-06-104.ts
Line offsets (118/479/480) are those of the JO PDF layout; check the counts it prints (63 + 705 rubrics, no gaps).
"""
import re, json, sys
L=open(sys.argv[1]).read().split('\n')
def parse(lines, classes):
    out=[];cur=None
    skip=re.compile(r'JOURNAL|ANNEXE|CODE\s|DU DECHET|ALGERIENNE|Safar|Rabie|mars 2006|DANGEROSITE|^\s*\d+\s*$|LISTE DES')
    for l in lines:
        if not l.strip() or skip.search(l): continue
        m=re.match(r'^\s{0,10}(\d+(?:\.\d+){1,2})\s+(.*)$',l)
        if m:
            code,rest=m.groups()
            parts=re.split(r'\s{2,}',rest.strip())
            cls=None;desc=[parts[0]];crit=[]
            for p in parts[1:]:
                if cls is None and p in classes: cls=p
                elif cls: crit.append(p)
                else: desc.append(p)
            cur={'code':code,'desc':' '.join(desc),'cls':cls,'crit':' '.join(crit),'leaf':code.count('.')==2}
            out.append(cur)
        elif cur:
            parts=re.split(r'\s{2,}',l.strip())
            # continuation: left column text then maybe class / criteria column
            lead=len(l)-len(l.lstrip())
            if lead>60: cur['crit']+=' '+l.strip(); continue
            cur['desc']+=' '+parts[0]
            for p in parts[1:]:
                if cur['cls'] is None and p in classes: cur['cls']=p
                else: cur['crit']+=' '+p
    return out
a2=parse(L[118:479],{'MA','I'})
a3=parse(L[480:],{'S','SD'})
FIX = {"9.1.2": "SD", "14.1.3": "SD"}  # class printed on the continuation line in the JO layout (checked by hand)
rows = []
for annex in (a2, a3):
    for x in annex:
        if not x["leaf"] or x["code"].endswith(".99"):
            continue
        cls = x["cls"] or FIX[x["code"]]
        desc = " ".join(x["desc"].split()).replace("of fset", "offset")
        crit = " ".join(x["crit"].split()) if cls == "SD" else ""
        rows.append((x["code"], cls, desc, crit))
for name, a in (("II", a2), ("III", a3)):
    secs = {}
    for x in a:
        if x["leaf"] and not x["code"].endswith(".99"):
            k, sec, n = x["code"].split(".")
            secs.setdefault(k + "." + sec, []).append(int(n))
    gaps = [s for s, v in secs.items() if sorted(v) != list(range(1, max(v) + 1))]
    print(name, "rubrics", sum(len(v) for v in secs.values()), "gaps", gaps)
q = lambda v: json.dumps(v, ensure_ascii=False)
head = open(sys.argv[2]).read().split("export const NOMENCLATURE_06_104")[0]
tail = "]\n" + open(sys.argv[2]).read().split("\n]\n", 1)[1]
body = "export const NOMENCLATURE_06_104: readonly NomenclatureEntry[] = [\n" + "\n".join("  [" + ", ".join(q(v) for v in r) + "]," for r in rows) + "\n"
open(sys.argv[2], "w").write(head + body + tail)
