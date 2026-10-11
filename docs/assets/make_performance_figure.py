"""Render actual retained matched whole-process pairs; executes no inference."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
root = Path(__file__).resolve().parent
d = json.loads((root / 'performance_data.json').read_text())
rows = d['pairs']
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':12,'axes.spines.top':False,'axes.spines.right':False})
fig, ax = plt.subplots(figsize=(10.5,6.2),facecolor='white')
x = np.arange(3); width = .32
for offset, key, color, label in [(-width/2,'baseline_wall_seconds','#69798e','Baseline'),(width/2,'candidate_wall_seconds','#137d79','Crop-aware preprocessing')]:
 vals=[r[key] for r in rows]
 bars=ax.bar(x+offset, vals,width,color=color,label=label)
 ax.bar_label(bars, labels=[f'{v:.6f}' for v in vals],padding=5,fontsize=11)
ax.set_ylim(0,4.75)
ax.set_ylabel('Whole-process wall time (seconds)')
ax.set_xticks(x,[f'Pair {r["pair"]}\n{r["whole_process_reduction_percent"]:.2f}% reduction' for r in rows])
ax.grid(axis='y',alpha=.15);ax.set_axisbelow(True)
ax.legend(frameon=False,loc='upper center',bbox_to_anchor=(.5,1.12),ncol=2,fontsize=11)
fig.suptitle('Native ASL: matched recorded-input comparison',x=.09,ha='left',fontsize=19,fontweight='bold')
fig.text(.09,.885,'8.97% median paired reduction • exact output parity on all three 108-frame pairs',fontsize=12,color='#137d79')
fig.text(.09,.075,'One Linux x86_64 host · MobileNetV2 / ONNX Runtime 1.30.0 CPU · one thread\nStartup-inclusive measurement; cache/scheduling uncontrolled. No accuracy or uncertainty-interval claim.',fontsize=10,color='#465365')
fig.subplots_adjust(left=.09,right=.97,bottom=.22,top=.83)
fig.savefig(root/'native_asl_matched_wall_time.png',dpi=180)
fig.savefig(root/'native_asl_matched_wall_time.svg')
