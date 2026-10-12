"""Publication derivative of retained timings; no inference or benchmark execution.
Run: python3 docs/assets/render_publication_figure.py
Original accepted PNG/SVG, source generator and JSON remain untouched.
"""
from pathlib import Path
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
root=Path(__file__).resolve().parent
src=root
out=root/"publication"
out.mkdir(exist_ok=True)
plt.rcParams.update({"font.family":"DejaVu Sans","font.size":12,"axes.spines.top":False,"axes.spines.right":False,"svg.fonttype":"none"})
d=json.loads((src/'performance_data.json').read_text());rows=d['pairs']
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':12,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none'})
fig,ax=plt.subplots(figsize=(10.5,7.2),facecolor='white');x=np.arange(3);width=.32;series={}
for offset,key,color,label in [(-width/2,'baseline_wall_seconds','#69798e','Baseline'),(width/2,'candidate_wall_seconds','#137d79','Crop-aware preprocessing')]:
 vals=[r[key]for r in rows];bars=ax.bar(x+offset,vals,width,color=color,label=label);assert [b.get_height()for b in bars]==vals;series[key]=vals;ax.bar_label(bars,labels=[f'{v:.6f}'for v in vals],padding=7,fontsize=11)
ax.set_ylim(0,4.75);ax.set_ylabel('Whole-process wall time (seconds)');ax.set_xticks(x,[f'Pair {r["pair"]}\n{r["whole_process_reduction_percent"]:.2f}% reduction'for r in rows]);ax.grid(axis='y',alpha=.15);ax.set_axisbelow(True)
fig.text(.09,.945,'Native ASL: matched recorded-input comparison',fontsize=19,fontweight='bold');fig.text(.09,.899,'8.9749% median whole-process reduction',fontsize=16,color='#137d79',fontweight='bold');fig.text(.09,.862,'Exact output parity on all three 108-frame pairs',fontsize=12,color='#465365');fig.legend(*ax.get_legend_handles_labels(),loc='upper left',bbox_to_anchor=(.083,.831),ncol=2,frameon=False,fontsize=11)
fig.text(.09,.083,'One Linux x86_64 host · MobileNetV2 / ONNX Runtime 1.30.0 CPU · one thread\nStartup-inclusive measurement; cache/scheduling uncontrolled.\nNo accuracy or uncertainty-interval claim.',fontsize=10,color='#465365',linespacing=1.45);fig.subplots_adjust(left=.09,right=.97,bottom=.235,top=.73)
for ext in ['png','svg']:fig.savefig(out/('native-asl-wall-time-publication.'+ext),dpi=180)
plt.close(fig)
