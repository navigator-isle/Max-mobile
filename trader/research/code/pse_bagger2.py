exec(open('pse_bagger.py').read().split("OUT = {}; RET = {}; Y = lambda d: yld.loc[d]")[0])
OUT = {}; RET = {}; Y = lambda d: yld.loc[d]
for nm, kw in [('NT+BT35@100 no trim + 35% stop once doubled', dict(notrim=True, big_trail=(1.0, 0.35))),
               ('NT+BT35@50 no trim + 35% stop once up 50%', dict(notrim=True, big_trail=(0.5, 0.35))),
               ('NT+BT40@100 no trim + 40% stop once doubled', dict(notrim=True, big_trail=(1.0, 0.40))),
               ('NT+BT30@100 no trim + 30% stop once doubled', dict(notrim=True, big_trail=(1.0, 0.30))),
               ('NT+KW30+BT30@100', dict(notrim=True, keep_win=0.30, big_trail=(1.0, 0.30))),
               ('NT+KW30+BT40@100', dict(notrim=True, keep_win=0.30, big_trail=(1.0, 0.40))),
               ('NT+KW100+BT35@100 keep only doubled stocks', dict(notrim=True, keep_win=1.0, big_trail=(1.0, 0.35)))]:
    r, info, _ = run2(Y, **kw); summary(nm, r, info)
json.dump(OUT, open('../2026-11-09-pse-bagger-results-2.json', 'w'), indent=1, default=str)
